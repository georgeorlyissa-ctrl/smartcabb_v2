import { useState, useEffect } from 'react';
import { X, Star, MapPin, Phone, Mail, Calendar, Car, CreditCard, TrendingUp, CheckCircle, XCircle, Clock, Activity, User, Save, Shield, Ban, Trash2, AlertCircle, DollarSign } from '../../lib/admin-icons';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { toast } from '../../lib/toast';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { safeFormatDate, safeFormatDateShort } from '../../utils/dateHelpers'; // 🔥 IMPORT

import type { EnrichedDriver, EnrichedRide } from '../../hooks/useSupabaseData';
import type { Vehicle } from '../../lib/supabase';
import { profileService, driverService, vehicleService } from '../../lib/supabase-services';
import { 
  sendSMS, 
  SMS_TEMPLATES,
  notifyAccountValidated,
  notifyAccountRejected,
  notifyAccountSuspended,
  notifyAccountReactivated,
  notifyAvailabilityChanged,
  notifyProfileUpdated,
  notifyVehicleUpdated
} from '../../lib/sms-service';

// ✅ Fonction pour formater les noms correctement (RUTH SHOLE -> Ruth Shole)
function formatName(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

interface DriverDetailModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void; // ✅ Support ancienne syntaxe
  driver: EnrichedDriver | null;
  vehicle: Vehicle | null;
  rides?: EnrichedRide[]; // ✅ Rendre optionnel
  onUpdate?: () => void;
  onRefresh?: () => void; // ✅ Support ancienne syntaxe
}

export function DriverDetailModal({ 
  open = true, // ✅ Par défaut true si non fourni
  onOpenChange, 
  onClose, // ✅ Support ancienne syntaxe
  driver,
  vehicle,
  rides = [], // ✅ Par défaut tableau vide
  onUpdate,
  onRefresh // ✅ Support ancienne syntaxe
}: DriverDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingVehicle, setIsEditingVehicle] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // ✅ Fonction helper pour appeler le bon callback de rafraîchissement
  const handleRefresh = () => {
    if (onUpdate) {
      onUpdate();
    } else if (onRefresh) {
      onRefresh();
    }
  };
  
  const [formData, setFormData] = useState({
    full_name: driver?.full_name || '',
    email: driver?.email || '',
    phone: driver?.phone || '',
    status: driver?.status || 'pending',
  });
  
  // ✅ CORRECTION : Utiliser driver.vehicle au lieu de la prop vehicle séparée
  // Les drivers du KV store ont le véhicule intégré dans driver.vehicle
  const driverVehicle = driver?.vehicle || vehicle;
  
  const [vehicleData, setVehicleData] = useState({
    make: driverVehicle?.make || '',
    model: driverVehicle?.model || '',
    license_plate: driverVehicle?.license_plate || '',
    color: driverVehicle?.color || '',
    category: driverVehicle?.category || 'smart_standard',
  });

  if (!driver) return null;

  // Calculer les statistiques du conducteur
  const driverRides = rides.filter(r => r.driver_id === driver.id);
  const completedRides = driverRides.filter(r => r.status === 'completed');
  const totalEarnings = completedRides.reduce((sum, r) => sum + (r.total_amount || 0), 0);
  const avgRating = driver.rating || 0;
  const cancelledRides = driverRides.filter(r => r.status === 'cancelled' && r.cancelled_by === 'driver').length;

  const handleSave = async () => {
    setLoading(true);
    try {
      // Vérifier si le statut a changé
      const statusChanged = formData.status !== driver.status;
      const oldStatus = driver.status;
      
      // Mettre à jour le profil
      const profileUpdated = await profileService.updateProfile(driver.user_id, {
        full_name: formData.full_name,
        email: formData.email,
        phone: formData.phone,
      });

      // Mettre à jour le statut du conducteur
      const driverUpdated = await driverService.updateDriver(driver.id, {
        status: formData.status as 'pending' | 'approved' | 'rejected',
      });

      if (profileUpdated && driverUpdated) {
        toast.success('Profil mis à jour avec succès');
        
        // ✅ CORRECTION CRITIQUE : Toujours synchroniser le statut dans Auth user_metadata
        // MÊME si le statut n'a pas changé dans le KV store, car il peut être désynchronisé dans Auth
        try {
          console.log('🔄 Synchronisation du statut dans Supabase Auth user_metadata...');
          console.log('📊 Statut à synchroniser:', formData.status);
          console.log('🆔 Driver ID:', driver.id);
          
          const url = `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/admin/update-driver-auth-metadata`;
          console.log('🌐 URL appelée:', url);
          
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${publicAnonKey}`
            },
            body: JSON.stringify({
              driverId: driver.id,
              status: formData.status
            })
          });
          
          console.log('📡 Réponse HTTP:', response.status, response.statusText);
          
          const result = await response.json();
          console.log('📋 Résultat:', result);
          
          if (result.success) {
            console.log('✅ Statut synchronisé dans Auth user_metadata');
            toast.success('✅ Statut synchronisé dans Auth');
          } else {
            console.warn('⚠️ Erreur synchronisation Auth:', result.error);
            toast.warning(`⚠️ Erreur synchro Auth: ${result.error}`);
          }
        } catch (authSyncError) {
          console.error('❌ Erreur synchronisation Auth:', authSyncError);
          toast.error(`❌ Erreur synchro Auth: ${authSyncError}`);
          // Continue même si la synchro échoue
        }
        
        // 📱 Envoyer SMS de notification au conducteur
        if (driver.phone) {
          try {
            // Si le statut a changé, envoyer notification spécifique
            if (statusChanged) {
              if (formData.status === 'approved' && oldStatus !== 'approved') {
                await notifyAccountValidated(driver.phone, formData.full_name || driver.full_name || 'Conducteur');
                toast.success('SMS de validation envoyé');
              } else if (formData.status === 'rejected') {
                await notifyAccountRejected(driver.phone, formData.full_name || driver.full_name || 'Conducteur');
                toast.success('SMS de rejet envoyé');
              }
            } else {
              // Profil mis à jour sans changement de statut
              await notifyProfileUpdated(driver.phone, formData.full_name || driver.full_name || 'Conducteur');
              toast.success('SMS de mise à jour envoyé');
            }
          } catch (smsError) {
            console.error('❌ Erreur envoi SMS:', smsError);
            toast.warning('Profil mis à jour, mais SMS non envoyé');
          }
        }
        
        setIsEditing(false);
        handleRefresh();
      } else {
        toast.error('Erreur lors de la mise à jour');
      }
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveVehicle = async () => {
    if (!driverVehicle) {
      toast.error('Aucun véhicule trouvé');
      return;
    }

    setLoading(true);
    try {
      const updated = await vehicleService.updateVehicle(driverVehicle.id, {
        make: vehicleData.make,
        model: vehicleData.model,
        license_plate: vehicleData.license_plate,
        color: vehicleData.color,
        category: vehicleData.category as 'smart_standard' | 'smart_confort' | 'smart_plus',
      });

      if (updated) {
        toast.success('Véhicule mis à jour avec succès');
        
        // 📱 Envoyer SMS de notification au conducteur
        if (driver.phone) {
          try {
            const vehicleInfo = `${vehicleData.color} ${vehicleData.make} ${vehicleData.model} (${vehicleData.license_plate})`;
            await notifyVehicleUpdated(driver.phone, driver.full_name || 'Conducteur', vehicleInfo);
            toast.success('SMS de mise à jour envoyé');
          } catch (smsError) {
            console.error('❌ Erreur envoi SMS:', smsError);
            toast.warning('Véhicule mis à jour, mais SMS non envoyé');
          }
        }
        
        setIsEditingVehicle(false);
        handleRefresh();
      } else {
        toast.error('Erreur lors de la mise à jour du véhicule');
      }
    } catch (error) {
      toast.error('Erreur lors de la mise à jour du véhicule');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAvailability = async () => {
    setLoading(true);
    try {
      const newAvailability = !driver.is_available;
      
      const updated = await driverService.updateDriver(driver.id, {
        is_available: newAvailability,
      });

      if (updated) {
        toast.success(driver.is_available ? 'Conducteur mis hors ligne' : 'Conducteur mis en ligne');
        
        // 📱 Envoyer SMS de notification au conducteur
        if (driver.phone) {
          try {
            await notifyAvailabilityChanged(driver.phone, driver.full_name || 'Conducteur', newAvailability);
            toast.success('SMS de notification envoyé');
          } catch (smsError) {
            console.error('❌ Erreur envoi SMS:', smsError);
            toast.warning('Statut modifié, mais SMS non envoyé');
          }
        }
        
        handleRefresh();
      } else {
        toast.error('Erreur lors de la modification du statut');
      }
    } catch (error) {
      toast.error('Erreur lors de la modification du statut');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    setLoading(true);
    try {
      const updated = await driverService.updateDriver(driver.id, {
        status: 'approved',
      });

      if (updated) {
        toast.success('Conducteur approuvé');
        
        // ⏳ ATTENDRE 2 SECONDES pour que le backend synchronise les 3 sources
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 🐛 DEBUG : Appeler la route de debug pour vérifier la synchronisation
        try {
          console.log('🐛 Appel de la route de debug pour vérifier la synchronisation...');
          const debugResponse = await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/drivers/${driver.id}/debug`,
            {
              headers: {
                'Authorization': `Bearer ${publicAnonKey}`
              }
            }
          );
          
          if (debugResponse.ok) {
            const debugData = await debugResponse.json();
            console.log('🐛 ========== RÉSULTAT DEBUG ==========');
            console.log('📊 KV Store status:', debugData.debug?.sources?.kv_store?.status);
            console.log('📊 Auth user_metadata status:', debugData.debug?.sources?.auth?.status_in_metadata);
            console.log('📊 Postgres drivers status:', debugData.debug?.sources?.postgres_drivers?.status);
            console.log('🐛 =====================================');
            
            // Vérifier les incohérences
            const kvStatus = debugData.debug?.sources?.kv_store?.status;
            const authStatus = debugData.debug?.sources?.auth?.status_in_metadata;
            const pgStatus = debugData.debug?.sources?.postgres_drivers?.status;
            
            if (kvStatus !== 'approved' || authStatus !== 'approved' || pgStatus !== 'approved') {
              console.error('❌ INCOHÉRENCE DÉTECTÉE !');
              toast.warning(`Incohérence détectée - KV: ${kvStatus}, Auth: ${authStatus}, PG: ${pgStatus}`);
            } else {
              console.log('✅ Toutes les sources sont synchronisées !');
            }
          }
        } catch (debugError) {
          console.error('❌ Erreur debug:', debugError);
        }
        
        // 📱 Envoyer SMS de validation au conducteur
        if (driver.phone) {
          console.log('📱 Envoi SMS de validation au conducteur:', driver.phone);
          
          try {
            await notifyAccountValidated(driver.phone, driver.full_name || 'Conducteur');
            console.log('✅ SMS de validation envoyé au conducteur');
            toast.success('SMS de validation envoyé au conducteur');
          } catch (smsError) {
            console.error('❌ Erreur envoi SMS:', smsError);
            toast.warning('Conducteur approuvé, mais SMS non envoyé');
          }
        } else {
          console.warn('⚠️ Pas de numéro de téléphone pour le conducteur');
          toast.warning('Conducteur approuvé, mais pas de numéro de téléphone pour envoyer le SMS');
        }
        
        handleRefresh();
      } else {
        toast.error('Erreur lors de l\'approbation');
      }
    } catch (error) {
      toast.error('Erreur lors de l\'approbation');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!confirm('Êtes-vous sûr de vouloir rejeter ce conducteur ?')) {
      return;
    }

    setLoading(true);
    try {
      const updated = await driverService.updateDriver(driver.id, {
        status: 'rejected',
      });

      if (updated) {
        toast.error('Conducteur rejeté');
        
        // 📱 Envoyer SMS de rejet au conducteur
        if (driver.phone) {
          console.log('📱 Envoi SMS de rejet au conducteur:', driver.phone);
          
          try {
            await notifyAccountRejected(driver.phone, driver.full_name || 'Conducteur');
            console.log('✅ SMS de rejet envoyé au conducteur');
            toast.success('SMS de notification envoyé au conducteur');
          } catch (smsError) {
            console.error('❌ Erreur envoi SMS:', smsError);
            toast.warning('Conducteur rejeté, mais SMS non envoyé');
          }
        } else {
          console.warn('⚠️ Pas de numéro de téléphone pour le conducteur');
        }
        
        handleRefresh();
      } else {
        toast.error('Erreur lors du rejet');
      }
    } catch (error) {
      toast.error('Erreur lors du rejet');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSuspend = async () => {
    const reason = prompt('Raison de la suspension (optionnel):');
    if (reason === null) return; // Annulé par l'utilisateur
    
    if (!confirm('Êtes-vous sûr de vouloir suspendre ce conducteur ?')) {
      return;
    }

    setLoading(true);
    try {
      // On utilise le champ is_active pour gérer la suspension
      const updated = await driverService.updateDriver(driver.id, {
        is_available: false, // Mettre hors ligne
        // Note: is_active pourrait être ajouté dans la base de données pour gérer les suspensions
      });

      if (updated) {
        toast.warning('Conducteur suspendu');
        
        // 📱 Envoyer SMS de suspension au conducteur
        if (driver.phone) {
          console.log('📱 Envoi SMS de suspension au conducteur:', driver.phone);
          
          try {
            await notifyAccountSuspended(driver.phone, driver.full_name || 'Conducteur', reason || undefined);
            console.log('✅ SMS de suspension envoyé au conducteur');
            toast.success('SMS de notification envoyé au conducteur');
          } catch (smsError) {
            console.error('❌ Erreur envoi SMS:', smsError);
            toast.warning('Conducteur suspendu, mais SMS non envoyé');
          }
        }
        
        handleRefresh();
      } else {
        toast.error('Erreur lors de la suspension');
      }
    } catch (error) {
      toast.error('Erreur lors de la suspension');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleReactivate = async () => {
    if (!confirm('Êtes-vous sûr de vouloir réactiver ce conducteur ?')) {
      return;
    }

    setLoading(true);
    try {
      const updated = await driverService.updateDriver(driver.id, {
        status: 'approved',
        is_available: true,
      });

      if (updated) {
        toast.success('Conducteur réactivé');
        
        // 📱 Envoyer SMS de réactivation au conducteur
        if (driver.phone) {
          console.log('📱 Envoi SMS de réactivation au conducteur:', driver.phone);
          
          try {
            await notifyAccountReactivated(driver.phone, driver.full_name || 'Conducteur');
            console.log('✅ SMS de réactivation envoyé au conducteur');
            toast.success('SMS de notification envoyé au conducteur');
          } catch (smsError) {
            console.error('❌ Erreur envoi SMS:', smsError);
            toast.warning('Conducteur réactivé, mais SMS non envoyé');
          }
        }
        
        handleRefresh();
      } else {
        toast.error('Erreur lors de la réactivation');
      }
    } catch (error) {
      toast.error('Erreur lors de la réactivation');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendWarning = async () => {
    const warning = prompt('Message d\'avertissement à envoyer au conducteur:');
    if (!warning || warning.trim() === '') {
      toast.error('Veuillez saisir un message d\'avertissement');
      return;
    }

    setLoading(true);
    try {
      // 📱 Envoyer SMS d'avertissement au conducteur
      if (driver.phone) {
        console.log('📱 Envoi SMS d\'avertissement au conducteur:', driver.phone);
        
        try {
          const { notifyWarning } = await import('../../lib/sms-service');
          await notifyWarning(driver.phone, driver.full_name || 'Conducteur', warning);
          console.log('✅ SMS d\'avertissement envoyé au conducteur');
          toast.success('Avertissement envoyé par SMS au conducteur');
        } catch (smsError) {
          console.error('❌ Erreur envoi SMS:', smsError);
          toast.error('Erreur lors de l\'envoi de l\'avertissement');
        }
      } else {
        toast.error('Pas de numéro de téléphone pour ce conducteur');
      }
    } catch (error) {
      toast.error('Erreur lors de l\'envoi de l\'avertissement');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`⚠️ ATTENTION : Êtes-vous sûr de vouloir supprimer complètement ce conducteur ?\n\n👤 ${driver.full_name}\n📱 ${driver.phone || 'N/A'}\n🚗 ${driverVehicle?.make} ${driverVehicle?.model} (${driverVehicle?.license_plate})\n\nCette action est IRRÉVERSIBLE et supprimera :\n✓ Le compte auth\n✓ Le profil dans la base de données\n✓ Le profil conducteur\n✓ Toutes les données associées\n\nLe conducteur pourra se réinscrire avec les mêmes identifiants.`)) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/delete-user-by-id`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ userId: driver.user_id }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Erreur lors de la suppression');
      }

      toast.success('✅ Conducteur supprimé complètement (Auth + DB + KV)');
      console.log('🗑️ Détails suppression:', data);
      
      // Fermer le modal et rafraîchir
      onOpenChange?.(false);
      handleRefresh();
    } catch (error) {
      toast.error(`❌ Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      console.error('Erreur suppression:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge variant="default" className="bg-green-600">Approuvé</Badge>;
      case 'pending':
        return <Badge variant="secondary">En attente</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejeté</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      // ✅ Support des deux syntaxes : onOpenChange ET onClose
      if (onOpenChange) {
        onOpenChange(isOpen);
      }
      if (onClose && !isOpen) {
        onClose();
      }
    }}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h2 className="text-xl">{driver.full_name}</h2>
                <p className="text-sm text-gray-500">ID: {driver.id?.slice(-8) || 'N/A'}</p>
              </div>
            </DialogTitle>
            <DialogDescription className="sr-only">
              Détails du conducteur {driver.full_name}
            </DialogDescription>
            <div className="flex space-x-2">
              {getStatusBadge(driver.status)}
              {driver.is_available ? (
                <Badge className="bg-green-600 h-6">En ligne</Badge>
              ) : (
                <Badge variant="secondary" className="h-6">Hors ligne</Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="info" className="w-full mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="info">Informations</TabsTrigger>
            <TabsTrigger value="vehicle">Véhicule</TabsTrigger>
            <TabsTrigger value="rides">Courses ({driverRides.length})</TabsTrigger>
            <TabsTrigger value="stats">Statistiques</TabsTrigger>
          </TabsList>

          {/* Onglet Informations */}
          <TabsContent value="info" className="space-y-4">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Informations personnelles</h3>
                {!isEditing ? (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setIsEditing(true);
                      setFormData({
                        full_name: driver.full_name || '',
                        email: driver.email || '',
                        phone: driver.phone || '',
                        status: driver.status,
                      });
                    }}
                  >
                    Modifier
                  </Button>
                ) : (
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setIsEditing(false)}
                      disabled={loading}
                    >
                      <X className="w-4 h-4 mr-1" />
                      Annuler
                    </Button>
                    <Button 
                      size="sm"
                      onClick={handleSave}
                      disabled={loading}
                    >
                      <Save className="w-4 h-4 mr-1" />
                      Sauvegarder
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="driver-name">Nom complet</Label>
                  {isEditing ? (
                    <Input
                      id="driver-name"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      className="mt-2"
                    />
                  ) : (
                    <div className="flex items-center space-x-2 mt-2">
                      <User className="w-4 h-4 text-gray-500" />
                      <span>{driver.full_name}</span>
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="driver-email">Email</Label>
                  {isEditing ? (
                    <Input
                      id="driver-email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="mt-2"
                    />
                  ) : (
                    <div className="flex items-center space-x-2 mt-2">
                      <Mail className="w-4 h-4 text-gray-500" />
                      <span>
                        {driver.email?.includes('@smartcabb.app') 
                          ? '(Email interne masqué)' 
                          : driver.email}
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="driver-phone">Téléphone</Label>
                  {isEditing ? (
                    <Input
                      id="driver-phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="mt-2"
                    />
                  ) : (
                    <div className="flex items-center space-x-2 mt-2">
                      <Phone className="w-4 h-4 text-gray-500" />
                      <span>{driver.phone || 'Non renseigné'}</span>
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="driver-status">Statut</Label>
                  {isEditing ? (
                    <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">En attente</SelectItem>
                        <SelectItem value="approved">Approuvé</SelectItem>
                        <SelectItem value="rejected">Rejeté</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="flex items-center space-x-2 mt-2">
                      <Shield className="w-4 h-4 text-gray-500" />
                      {getStatusBadge(driver.status)}
                    </div>
                  )}
                </div>

                <div>
                  <Label>Date d'inscription</Label>
                  <div className="flex items-center space-x-2 mt-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span>
                      {safeFormatDate(driver.created_at)}
                    </span>
                  </div>
                </div>

                <div>
                  <Label>Note moyenne</Label>
                  <div className="flex items-center space-x-2 mt-2">
                    <Star className="w-4 h-4 text-yellow-500 fill-current" />
                    <span className="font-semibold">{(driver.rating || 0).toFixed(1)}/5</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Actions */}
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Actions administrateur</h3>
              <div className="flex flex-col space-y-3">
                {driver.status === 'pending' && (
                  <>
                    <Button
                      variant="default"
                      className="w-full justify-start bg-green-600 hover:bg-green-700"
                      onClick={handleApprove}
                      disabled={loading}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approuver le conducteur
                    </Button>
                    <Button
                      variant="destructive"
                      className="w-full justify-start"
                      onClick={handleReject}
                      disabled={loading}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Rejeter la candidature
                    </Button>
                  </>
                )}

                <Button
                  variant={driver.is_available ? "outline" : "default"}
                  className="w-full justify-start"
                  onClick={handleToggleAvailability}
                  disabled={loading}
                >
                  {driver.is_available ? (
                    <>
                      <Ban className="w-4 h-4 mr-2" />
                      Mettre hors ligne
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Mettre en ligne
                    </>
                  )}
                </Button>

                {/* Actions supplémentaires */}
                <div className="pt-4 border-t space-y-2">
                  <p className="text-xs uppercase text-gray-500 mb-2">Actions supplémentaires</p>
                  
                  {driver.status === 'approved' && (
                    <Button
                      variant="outline"
                      className="w-full justify-start text-orange-600 border-orange-200 hover:bg-orange-50"
                      onClick={handleSuspend}
                      disabled={loading}
                    >
                      <Ban className="w-4 h-4 mr-2" />
                      Suspendre le compte
                    </Button>
                  )}
                  
                  {driver.status === 'rejected' && (
                    <Button
                      variant="outline"
                      className="w-full justify-start text-green-600 border-green-200 hover:bg-green-50"
                      onClick={handleReactivate}
                      disabled={loading}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Réactiver le compte
                    </Button>
                  )}
                  
                  <Button
                    variant="outline"
                    className="w-full justify-start text-amber-600 border-amber-200 hover:bg-amber-50"
                    onClick={handleSendWarning}
                    disabled={loading}
                  >
                    <AlertCircle className="w-4 h-4 mr-2" />
                    Envoyer un avertissement
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="w-full justify-start text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={handleDelete}
                    disabled={loading}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Supprimer le compte
                  </Button>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Onglet Véhicule */}
          <TabsContent value="vehicle" className="space-y-4">
            {driverVehicle ? (
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Informations du véhicule</h3>
                  {!isEditingVehicle ? (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setIsEditingVehicle(true);
                        setVehicleData({
                          make: driverVehicle.make || '',
                          model: driverVehicle.model || '',
                          license_plate: driverVehicle.license_plate || '',
                          color: driverVehicle.color || '',
                          category: driverVehicle.category || 'smart_standard',
                        });
                      }}
                    >
                      Modifier
                    </Button>
                  ) : (
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setIsEditingVehicle(false)}
                        disabled={loading}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Annuler
                      </Button>
                      <Button 
                        size="sm"
                        onClick={handleSaveVehicle}
                        disabled={loading}
                      >
                        <Save className="w-4 h-4 mr-1" />
                        Sauvegarder
                      </Button>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="vehicle-make">Marque</Label>
                      {isEditingVehicle ? (
                        <Input
                          id="vehicle-make"
                          value={vehicleData.make}
                          onChange={(e) => setVehicleData({ ...vehicleData, make: e.target.value })}
                          className="mt-2"
                        />
                      ) : (
                        <p className="mt-2 font-medium">{driverVehicle.make}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="vehicle-model">Modèle</Label>
                      {isEditingVehicle ? (
                        <Input
                          id="vehicle-model"
                          value={vehicleData.model}
                          onChange={(e) => setVehicleData({ ...vehicleData, model: e.target.value })}
                          className="mt-2"
                        />
                      ) : (
                        <p className="mt-2 font-medium">{driverVehicle.model}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="vehicle-plate">Plaque d'immatriculation</Label>
                      {isEditingVehicle ? (
                        <Input
                          id="vehicle-plate"
                          value={vehicleData.license_plate}
                          onChange={(e) => setVehicleData({ ...vehicleData, license_plate: e.target.value })}
                          className="mt-2"
                        />
                      ) : (
                        <p className="mt-2 font-medium font-mono">{driverVehicle.license_plate}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="vehicle-color">Couleur</Label>
                      {isEditingVehicle ? (
                        <Input
                          id="vehicle-color"
                          value={vehicleData.color}
                          onChange={(e) => setVehicleData({ ...vehicleData, color: e.target.value })}
                          className="mt-2"
                        />
                      ) : (
                        <p className="mt-2 font-medium">{driverVehicle.color}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="vehicle-category">Catégorie</Label>
                    {isEditingVehicle ? (
                      <Select value={vehicleData.category} onValueChange={(value) => setVehicleData({ ...vehicleData, category: value })}>
                        <SelectTrigger className="mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="smart_standard">SmartCabb Standard (7$/h jour - 10$/h nuit)</SelectItem>
                          <SelectItem value="smart_confort">SmartCabb Confort (15$/h jour - 17$/h nuit)</SelectItem>
                          <SelectItem value="smart_plus">SmartCabb Plus (15$/h jour - 20$/h nuit)</SelectItem>
                          <SelectItem value="smart_business">SmartCabb Business (160$/jour location)</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="mt-2 font-medium capitalize">{driverVehicle.category.replace('_', ' ')}</p>
                    )}
                  </div>
                </div>
              </Card>
            ) : (
              <div className="text-center py-12">
                <Car className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Aucun véhicule enregistré</p>
              </div>
            )}
          </TabsContent>

          {/* Onglet Courses */}
          <TabsContent value="rides" className="space-y-4">
            {driverRides.length === 0 ? (
              <div className="text-center py-12">
                <Car className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Aucune course enregistrée</p>
              </div>
            ) : (
              <div className="space-y-3">
                {driverRides.map((ride) => (
                  <Card key={ride.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <Badge variant={
                            ride.status === 'completed' ? 'default' : 
                            ride.status === 'cancelled' ? 'destructive' : 
                            'secondary'
                          }>
                            {ride.status}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {safeFormatDateShort(ride.created_at)}
                          </span>
                        </div>
                        <div className="text-sm space-y-1">
                          <div className="flex items-start space-x-2">
                            <span className="text-gray-500 min-w-[80px]">Départ:</span>
                            <span className="font-medium">{ride.pickup.address}</span>
                          </div>
                          <div className="flex items-start space-x-2">
                            <span className="text-gray-500 min-w-[80px]">Arrivée:</span>
                            <span className="font-medium">{ride.destination.address}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-lg">{ride.total_amount.toLocaleString()} CDF</p>
                        {ride.rating && (
                          <div className="flex items-center space-x-1 mt-1">
                            <Star className="w-3 h-3 text-yellow-500 fill-current" />
                            <span className="text-sm">{ride.rating}/5</span>
                          </div>
                        )}
                        {ride.duration_minutes && (
                          <p className="text-xs text-gray-500 mt-1">{ride.duration_minutes} min</p>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Onglet Statistiques */}
          <TabsContent value="stats" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <Car className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Courses totales</p>
                    <p className="text-2xl font-bold">{driverRides.length}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Courses complétées</p>
                    <p className="text-2xl font-bold">{completedRides.length}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Gains totaux</p>
                    <p className="text-2xl font-bold">{totalEarnings.toLocaleString()} CDF</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                    <Star className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Note moyenne</p>
                    <p className="text-2xl font-bold">{(avgRating || 0).toFixed(1)}/5</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                    <Ban className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Courses annulées</p>
                    <p className="text-2xl font-bold">{cancelledRides}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Revenu moyen / course</p>
                    <p className="text-2xl font-bold">
                      {completedRides.length > 0 
                        ? (totalEarnings / completedRides.length).toFixed(0)
                        : '0'
                      } CDF
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
