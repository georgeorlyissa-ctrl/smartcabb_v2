import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar,
  Car,
  Star,
  CreditCard,
  Ban,
  Check,
  Trash2,
  Save,
  X,
  Wallet,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle
} from '../../lib/admin-icons';
import { toast } from '../../lib/toast';
import type { Profile } from '../../lib/supabase';
import type { EnrichedRide } from '../../hooks/useSupabaseData';
import { profileService } from '../../lib/supabase-services';
import { formatCDF } from '../../lib/pricing';
import { User as UserType } from '../../types';

// ✅ Fonction pour formater les noms correctement (RUTH SHOLE -> Ruth Shole)
function formatName(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

interface PassengerDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  passenger: Profile | null;
  rides: EnrichedRide[];
  onUpdate: () => void;
}

export function PassengerDetailModal({ 
  open, 
  onOpenChange, 
  passenger,
  rides,
  onUpdate 
}: PassengerDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: passenger?.full_name || '',
    email: passenger?.email || '',
    phone: passenger?.phone || '',
    address: passenger?.address || '',
  });

  if (!passenger) return null;

  // Récupérer les données du portefeuille depuis localStorage
  const allUsersStr = localStorage.getItem('smartcab_all_users') || '[]';
  const allUsers: UserType[] = JSON.parse(allUsersStr);
  const userWithWallet = allUsers.find((u: UserType) => u.id === passenger.id);
  
  const walletBalance = userWithWallet?.walletBalance || 0;
  const walletTransactions = userWithWallet?.walletTransactions || [];
  
  // Trier les transactions par date (plus récent d'abord)
  const sortedTransactions = [...walletTransactions].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // Calculer les statistiques du passager
  const passengerRides = rides.filter(r => r.passenger_id === passenger.id);
  const completedRides = passengerRides.filter(r => r.status === 'completed');
  const totalSpent = completedRides.reduce((sum, r) => sum + (r.total_amount || 0), 0);
  const avgRating = completedRides.filter(r => r.rating).length > 0
    ? completedRides.reduce((sum, r) => sum + (r.rating || 0), 0) / completedRides.filter(r => r.rating).length
    : 0;
  const cancelledRides = passengerRides.filter(r => r.status === 'cancelled' && r.cancelled_by === 'passenger').length;

  const handleSave = async () => {
    setLoading(true);
    try {
      const updated = await profileService.updateProfile(passenger.id, {
        full_name: formData.full_name,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
      });

      if (updated) {
        toast.success('Profil mis à jour avec succès');
        setIsEditing(false);
        onUpdate();
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

  const handleToggleStatus = async () => {
    setLoading(true);
    try {
      const newStatus = passenger.is_blocked ? false : true;
      const updated = await profileService.updateProfile(passenger.id, {
        is_blocked: newStatus,
      });

      if (updated) {
        toast.success(newStatus ? 'Passager bloqué' : 'Passager débloqué');
        onUpdate();
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

  const handleDelete = async () => {
    if (!passenger) return;
    
    if (!confirm(`⚠️ ATTENTION : Êtes-vous sûr de vouloir supprimer complètement ce passager ?\n\n👤 ${passenger.full_name}\n📧 ${passenger.email}\n📱 ${passenger.phone || 'N/A'}\n\nCette action est IRRÉVERSIBLE et supprimera :\n✓ Le compte auth\n✓ Le profil dans la base de données\n✓ Toutes les données associées\n\nLe passager pourra se réinscrire avec les mêmes identifiants.`)) {
      return;
    }

    setLoading(true);
    try {
      const projectId = 'olwfayuzvgfjjvqzkjzi';
      const publicAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9sd2ZheXV6dmdmamp2cXpranppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY1MzY1NTYsImV4cCI6MjA1MjExMjU1Nn0.bRRXC1VwHsODDl5jvBZ2k_SuE9-bA-j_xLfM2VgfKck';
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/delete-user-by-id`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ userId: passenger.id }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Erreur lors de la suppression');
      }

      toast.success('✅ Passager supprimé complètement (Auth + DB + KV)');
      console.log('🗑️ Détails suppression:', data);
      
      // Fermer le modal et rafraîchir
      onOpenChange(false);
      onUpdate();
    } catch (error) {
      toast.error(`❌ Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      console.error('Erreur suppression:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTransactionDate = (date: Date) => {
    const d = new Date(date);
    return d.toLocaleString('fr-FR', { 
      day: '2-digit', 
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTransactionStatusIcon = (status?: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-orange-600" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  const getTransactionStatusBadge = (status?: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-700">Approuvé</Badge>;
      case 'pending':
        return <Badge className="bg-orange-100 text-orange-700">En attente</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-700">Rejeté</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-700">Inconnu</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl">{passenger.full_name}</h2>
                <p className="text-sm text-gray-500">ID: {passenger.id.slice(-8)}</p>
              </div>
            </DialogTitle>
            <DialogDescription className="sr-only">
              Détails du passager {passenger.full_name}
            </DialogDescription>
            <div className="flex space-x-2">
              {passenger.is_blocked ? (
                <Badge variant="destructive" className="h-6">Bloqué</Badge>
              ) : (
                <Badge variant="default" className="bg-green-600 h-6">Actif</Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="info" className="w-full mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="info">Informations</TabsTrigger>
            <TabsTrigger value="wallet">Portefeuille</TabsTrigger>
            <TabsTrigger value="rides">Courses ({passengerRides.length})</TabsTrigger>
            <TabsTrigger value="stats">Statistiques</TabsTrigger>
          </TabsList>

          {/* Onglet Informations */}
          <TabsContent value="info" className="space-y-4">
            {/* Cartes rapides avec statistiques */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="p-4">
                <div className="text-center">
                  <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-full mx-auto mb-2">
                    <Wallet className="w-5 h-5 text-green-600" />
                  </div>
                  <p className="text-xs text-gray-500 mb-1">Solde</p>
                  <p className="font-bold text-sm">{formatCDF(walletBalance)}</p>
                </div>
              </Card>

              <Card className="p-4">
                <div className="text-center">
                  <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full mx-auto mb-2">
                    <Car className="w-5 h-5 text-blue-600" />
                  </div>
                  <p className="text-xs text-gray-500 mb-1">Courses</p>
                  <p className="font-bold text-sm">{passengerRides.length}</p>
                </div>
              </Card>

              <Card className="p-4">
                <div className="text-center">
                  <div className="flex items-center justify-center w-10 h-10 bg-purple-100 rounded-full mx-auto mb-2">
                    <CreditCard className="w-5 h-5 text-purple-600" />
                  </div>
                  <p className="text-xs text-gray-500 mb-1">Dépensé</p>
                  <p className="font-bold text-sm">{formatCDF(totalSpent)}</p>
                </div>
              </Card>

              <Card className="p-4">
                <div className="text-center">
                  <div className="flex items-center justify-center w-10 h-10 bg-yellow-100 rounded-full mx-auto mb-2">
                    <Star className="w-5 h-5 text-yellow-600" />
                  </div>
                  <p className="text-xs text-gray-500 mb-1">Note</p>
                  <p className="font-bold text-sm">{avgRating > 0 ? avgRating.toFixed(1) : 'N/A'}</p>
                </div>
              </Card>
            </div>

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
                        full_name: passenger.full_name || '',
                        email: passenger.email || '',
                        phone: passenger.phone || '',
                        address: passenger.address || '',
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
                  <Label htmlFor="name">Nom complet</Label>
                  {isEditing ? (
                    <Input
                      id="name"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      className="mt-2"
                    />
                  ) : (
                    <div className="flex items-center space-x-2 mt-2">
                      <User className="w-4 h-4 text-gray-500" />
                      <span>{passenger.full_name}</span>
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  {isEditing ? (
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="mt-2"
                    />
                  ) : (
                    <div className="flex items-center space-x-2 mt-2">
                      <Mail className="w-4 h-4 text-gray-500" />
                      <span>{passenger.email}</span>
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="phone">Téléphone</Label>
                  {isEditing ? (
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="mt-2"
                    />
                  ) : (
                    <div className="flex items-center space-x-2 mt-2">
                      <Phone className="w-4 h-4 text-gray-500" />
                      <span>{passenger.phone || 'Non renseigné'}</span>
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="address">Adresse</Label>
                  {isEditing ? (
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="mt-2"
                    />
                  ) : (
                    <div className="flex items-center space-x-2 mt-2">
                      <MapPin className="w-4 h-4 text-gray-500" />
                      <span>{passenger.address || 'Non renseignée'}</span>
                    </div>
                  )}
                </div>

                <div>
                  <Label>Date d'inscription</Label>
                  <div className="flex items-center space-x-2 mt-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span>{passenger.created_at ? new Date(passenger.created_at).toLocaleDateString('fr-FR') : 'N/A'}</span>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold mb-4">Actions</h3>
              <div className="flex flex-col space-y-3">
                <Button
                  variant={passenger.is_blocked ? "default" : "destructive"}
                  onClick={handleToggleStatus}
                  disabled={loading}
                  className="w-full"
                >
                  {passenger.is_blocked ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Débloquer le passager
                    </>
                  ) : (
                    <>
                      <Ban className="w-4 h-4 mr-2" />
                      Bloquer le passager
                    </>
                  )}
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={loading}
                  className="w-full"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Supprimer le passager
                </Button>
              </div>
            </Card>
          </TabsContent>

          {/* Onglet Portefeuille */}
          <TabsContent value="wallet" className="space-y-4">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold">Solde du portefeuille</h3>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-green-600" />
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 mb-6">
                <p className="text-sm text-gray-600 mb-2">Solde actuel</p>
                <p className="text-3xl font-bold text-green-600">{formatCDF(walletBalance)}</p>
                <p className="text-xs text-gray-500 mt-1">
                  ≈ {((walletBalance || 0) / 2850).toFixed(2)} USD
                </p>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold text-sm text-gray-700">Historique des transactions</h4>
                
                {sortedTransactions.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Wallet className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>Aucune transaction</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {sortedTransactions.map((transaction) => (
                      <div 
                        key={transaction.id} 
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                      >
                        <div className="flex items-start gap-3 flex-1">
                          <div className="mt-1">
                            {getTransactionStatusIcon(transaction.status)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-medium text-sm">{transaction.description}</p>
                              {getTransactionStatusBadge(transaction.status)}
                            </div>
                            <p className="text-xs text-gray-500">
                              {formatTransactionDate(transaction.timestamp)}
                            </p>
                            {transaction.method && (
                              <p className="text-xs text-gray-600 mt-1">
                                Méthode: {transaction.method === 'mobile_money' ? 'Mobile Money' : 'Espèces'}
                              </p>
                            )}
                            {transaction.rejectionReason && (
                              <p className="text-xs text-red-600 mt-1">
                                Raison: {transaction.rejectionReason}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold ${
                            transaction.type === 'recharge' 
                              ? 'text-green-600' 
                              : 'text-red-600'
                          }`}>
                            {transaction.type === 'recharge' ? '+' : '-'}{formatCDF(transaction.amount)}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Solde: {formatCDF(transaction.balanceAfter || 0)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>

          {/* Onglet Courses */}
          <TabsContent value="rides" className="space-y-4">
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Historique des courses</h3>
              {passengerRides.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Aucune course</p>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {passengerRides.map((ride) => (
                    <div key={ride.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Car className="w-5 h-5 text-blue-600" />
                        <div>
                          <p className="font-medium text-sm">{ride.pickup.address}</p>
                          <p className="text-xs text-gray-500">→ {ride.destination.address}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {ride.created_at ? new Date(ride.created_at).toLocaleDateString('fr-FR') : 'N/A'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge 
                          variant={
                            ride.status === 'completed' ? 'default' : 
                            ride.status === 'cancelled' ? 'destructive' : 
                            'secondary'
                          }
                        >
                          {ride.status}
                        </Badge>
                        <p className="text-sm font-semibold mt-1">
                          {formatCDF(ride.total_amount || ride.estimatedPrice || 0)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Onglet Statistiques */}
          <TabsContent value="stats" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Courses totales</p>
                    <p className="text-2xl font-bold">{passengerRides.length}</p>
                  </div>
                  <Car className="w-8 h-8 text-blue-600" />
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Courses terminées</p>
                    <p className="text-2xl font-bold">{completedRides.length}</p>
                  </div>
                  <Check className="w-8 h-8 text-green-600" />
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Total dépensé</p>
                    <p className="text-2xl font-bold">{formatCDF(totalSpent)}</p>
                  </div>
                  <CreditCard className="w-8 h-8 text-purple-600" />
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Note moyenne</p>
                    <p className="text-2xl font-bold">{(avgRating || 0).toFixed(1)}</p>
                  </div>
                  <Star className="w-8 h-8 text-yellow-600" />
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Annulations</p>
                    <p className="text-2xl font-bold">{cancelledRides}</p>
                  </div>
                  <X className="w-8 h-8 text-red-600" />
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Taux de complétion</p>
                    <p className="text-2xl font-bold">
                      {passengerRides.length > 0 
                        ? Math.round((completedRides.length / passengerRides.length) * 100)
                        : 0}%
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-green-600" />
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}