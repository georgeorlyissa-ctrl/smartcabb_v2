import { useAppState } from '../../hooks/useAppState';
import { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/button';
import { toast } from '../../lib/toast';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { supabase } from '../../lib/supabase';
import { VEHICLE_PRICING, type VehicleCategory } from '../../lib/pricing';
import { notifyVehicleUpdated, notifyProfileUpdated } from '../../lib/sms-service';
import { motion } from '../../lib/motion'; // ✅ FIX: Utiliser l'implémentation locale
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { 
  ArrowLeft, 
  X, 
  Edit3, 
  User, 
  Camera, 
  Star, 
  MapPin, 
  Mail, 
  Phone, 
  Car,
  Save,
  DollarSign,
  TrendingUp
} from '../../lib/icons';

// Helper functions
const convertUSDtoCDF = (usdAmount: number) => {
  const exchangeRate = 2800; // 1 USD = 2800 CDF (taux indicatif)
  return Math.round(usdAmount * exchangeRate);
};

// ✅ v517.77 - Protection contre null/undefined
const formatCDF = (amount: number | null | undefined) => {
  const safeAmount = Number(amount) || 0;
  return `${safeAmount.toLocaleString('fr-FR')} CDF`;
};

export function DriverProfileScreen() {
  const { state, setCurrentScreen, updateDriver } = useAppState();
  const [isEditing, setIsEditing] = useState(false);
  const [postpaidPending, setPostpaidPending] = useState(0);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 🔥 NOUVELLES DONNÉES DEPUIS LE BACKEND
  const [driverStats, setDriverStats] = useState({
    rating: 0,
    totalRides: 0,
    accountBalance: 0,
    loading: true
  });
  
  const [formData, setFormData] = useState({
    name: state.currentDriver?.name || '',
    email: state.currentDriver?.email || '',
    phone: state.currentDriver?.phone || '',
    vehicleMake: state.currentDriver?.vehicleInfo?.make || '',
    vehicleModel: state.currentDriver?.vehicleInfo?.model || '',
    vehiclePlate: state.currentDriver?.vehicleInfo?.plate || '',
    vehicleColor: state.currentDriver?.vehicleInfo?.color || '',
    vehicleType: state.currentDriver?.vehicleInfo?.type || 'smart_standard' // ✅ Par défaut SmartCabb Standard
  });

  useEffect(() => {
    loadPostpaidPending();
    loadDriverStatsFromBackend(); // 🔥 Charger les stats depuis le backend
  }, [state.currentDriver?.id]);

  // 🔥 CHARGER LES STATISTIQUES DEPUIS LE BACKEND
  const loadDriverStatsFromBackend = async () => {
    if (!state.currentDriver?.id) return;
    
    try {
      console.log('📊 Chargement statistiques conducteur depuis backend...');
      
      // Charger le solde
      const balanceResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/drivers/${state.currentDriver.id}/balance`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );
      
      // Charger les stats (rating + courses)
      const statsResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/drivers/${state.currentDriver.id}/stats`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );
      
      let balance = 0;
      let rating = 0;
      let totalRides = 0;
      
      if (balanceResponse.ok) {
        const balanceData = await balanceResponse.json();
        if (balanceData.success) {
          balance = balanceData.balance || 0;
          console.log('✅ Solde chargé:', balance, 'CDF');
        }
      }
      
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        if (statsData.success && statsData.stats) {
          rating = statsData.stats.averageRating || 0;
          totalRides = statsData.stats.totalRides || 0;
          console.log('✅ Stats chargées:', { rating, totalRides });
        }
      }
      
      setDriverStats({
        rating,
        totalRides,
        accountBalance: balance,
        loading: false
      });
      
      // Mettre à jour le state global aussi
      if (state.currentDriver) {
        updateDriver(state.currentDriver.id, {
          rating,
          totalRides,
          earnings: balance
        });
      }
      
    } catch (error) {
      console.error('❌ Erreur chargement stats conducteur:', error);
      setDriverStats({
        rating: 0,
        totalRides: 0,
        accountBalance: 0,
        loading: false
      });
    }
  };

  const loadPostpaidPending = async () => {
    if (!state.currentDriver?.id) return;

    try {
      const { data, error } = await supabase
        .from('postpaid_requests')
        .select('total_amount, remaining_balance, status')
        .eq('driver_id', state.currentDriver.id)
        .in('status', ['pending', 'approved']);

      if (error) throw error;

      const totalPending = data?.reduce((sum, req) => {
        if (req.status === 'pending') {
          return sum + req.total_amount;
        } else if (req.status === 'approved') {
          return sum + req.remaining_balance;
        }
        return sum;
      }, 0) || 0;

      setPostpaidPending(totalPending);
    } catch (error) {
      console.error('❌ Erreur chargement montants post-payés:', error);
    }
  };

  // ✅ GRILLE TARIFAIRE OFFICIELLE SMARTCABB 2025 (4 CATÉGORIES)
  const vehicleTypes = [
    { 
      value: 'smart_standard' as VehicleCategory, 
      label: `${VEHICLE_PRICING.smart_standard.displayName} - ${VEHICLE_PRICING.smart_standard.capacity} places`,
      description: `${VEHICLE_PRICING.smart_standard.hourlyRateDay}$/h (jour) · ${VEHICLE_PRICING.smart_standard.hourlyRateNight}$/h (nuit)`,
      features: VEHICLE_PRICING.smart_standard.features
    },
    { 
      value: 'smart_confort' as VehicleCategory, 
      label: `${VEHICLE_PRICING.smart_confort.displayName} - ${VEHICLE_PRICING.smart_confort.capacity} places`,
      description: `${VEHICLE_PRICING.smart_confort.hourlyRateDay}$/h (jour) · ${VEHICLE_PRICING.smart_confort.hourlyRateNight}$/h (nuit)`,
      features: VEHICLE_PRICING.smart_confort.features
    },
    { 
      value: 'smart_plus' as VehicleCategory, 
      label: `${VEHICLE_PRICING.smart_plus.displayName} - ${VEHICLE_PRICING.smart_plus.capacity} places`,
      description: `${VEHICLE_PRICING.smart_plus.hourlyRateDay}$/h (jour) · ${VEHICLE_PRICING.smart_plus.hourlyRateNight}$/h (nuit)`,
      features: VEHICLE_PRICING.smart_plus.features
    },
    { 
      value: 'smart_business' as VehicleCategory, 
      label: `${VEHICLE_PRICING.smart_business.displayName} - ${VEHICLE_PRICING.smart_business.capacity} places`,
      description: `${VEHICLE_PRICING.smart_business.dailyRate}$/jour (Location uniquement)`,
      features: VEHICLE_PRICING.smart_business.features
    }
  ];

  const handleSave = async () => {
    if (!state.currentDriver) return;

    const vehicleInfoChanged = (
      formData.vehicleMake !== state.currentDriver.vehicleInfo?.make ||
      formData.vehicleModel !== state.currentDriver.vehicleInfo?.model ||
      formData.vehiclePlate !== state.currentDriver.vehicleInfo?.plate ||
      formData.vehicleColor !== state.currentDriver.vehicleInfo?.color ||
      formData.vehicleType !== state.currentDriver.vehicleInfo?.type
    );

    const updatedData = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      vehicleInfo: {
        ...state.currentDriver.vehicleInfo,
        make: formData.vehicleMake,
        model: formData.vehicleModel,
        plate: formData.vehiclePlate,
        color: formData.vehicleColor,
        type: formData.vehicleType as VehicleCategory
      }
    };

    try {
      // ✅ SAUVEGARDER DANS LE BACKEND (KV STORE)
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/drivers/${state.currentDriver.id}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updatedData)
        }
      );

      if (!response.ok) {
        throw new Error('Erreur sauvegarde profil');
      }

      const data = await response.json();
      
      if (data.success) {
        // Mettre à jour le state local
        updateDriver(state.currentDriver.id, updatedData);
        
        setIsEditing(false);
        toast.success('✅ Profil enregistré dans la base de données !');
        console.log('✅ Profil sauvegardé dans le backend');
        
        // 📱 Envoyer SMS de confirmation de mise à jour
        if (state.currentDriver.phone) {
          try {
            if (vehicleInfoChanged) {
              const vehicleInfo = `${formData.vehicleColor} ${formData.vehicleMake} ${formData.vehicleModel} (${formData.vehiclePlate})`;
              await notifyVehicleUpdated(
                state.currentDriver.phone,
                formData.name,
                vehicleInfo
              );
              console.log('✅ SMS de mise à jour véhicule envoyé');
            } else {
              await notifyProfileUpdated(
                state.currentDriver.phone,
                formData.name
              );
              console.log('✅ SMS de mise à jour profil envoyé');
            }
          } catch (error) {
            console.error('❌ Erreur envoi SMS de mise à jour:', error);
          }
        }
      } else {
        throw new Error(data.error || 'Erreur inconnue');
      }
    } catch (error) {
      console.error('❌ Erreur sauvegarde profil:', error);
      toast.error('Erreur lors de la sauvegarde du profil');
    }
  };

  const handleCancel = () => {
    setFormData({
      name: state.currentDriver?.name || '',
      email: state.currentDriver?.email || '',
      phone: state.currentDriver?.phone || '',
      vehicleMake: state.currentDriver?.vehicleInfo?.make || '',
      vehicleModel: state.currentDriver?.vehicleInfo?.model || '',
      vehiclePlate: state.currentDriver?.vehicleInfo?.plate || '',
      vehicleColor: state.currentDriver?.vehicleInfo?.color || '',
      vehicleType: state.currentDriver?.vehicleInfo?.type || 'smart_standard' // ✅ Par défaut SmartCabb Standard
    });
    setIsEditing(false);
  };

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!state.currentDriver) return;

    const file = event.target.files?.[0];
    if (!file) return;

    // Validation taille (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('La photo ne doit pas dépasser 5 MB');
      return;
    }

    // Validation type
    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image');
      return;
    }

    setUploadingPhoto(true);

    try {
      // Convertir l'image en base64 pour l'envoyer au backend
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      reader.onload = async () => {
        try {
          const base64Image = reader.result as string;
          
          console.log('📤 Upload de photo pour le conducteur:', state.currentDriver!.id);

          // ✅ SAUVEGARDER L'IMAGE EN BASE64 DANS LE BACKEND
          const response = await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/drivers/${state.currentDriver!.id}`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${publicAnonKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                photo: base64Image // ✅ Photo en base64
              })
            }
          );

          console.log('📥 Statut réponse:', response.status, response.statusText);

          // Lire le texte brut de la réponse
          const responseText = await response.text();
          console.log('📄 Réponse brute:', responseText.substring(0, 200));

          if (!response.ok) {
            throw new Error(`Erreur HTTP ${response.status}: ${responseText}`);
          }

          // Parser le JSON
          const data = JSON.parse(responseText);
          console.log('✅ Réponse JSON:', data);
          
          if (data.success) {
            // Mettre à jour le state local
            updateDriver(state.currentDriver!.id, { photo: base64Image });
            
            toast.success('✅ Photo de profil mise à jour !');
            console.log('✅ Photo de profil sauvegardée dans le backend');
          } else {
            throw new Error(data.error || 'Erreur inconnue');
          }
        } catch (error) {
          console.error('❌ Erreur upload photo:', error);
          toast.error('Erreur lors de l\'upload de la photo');
        } finally {
          setUploadingPhoto(false);
        }
      };

      reader.onerror = () => {
        console.error('❌ Erreur lecture fichier');
        toast.error('Erreur lors de la lecture du fichier');
        setUploadingPhoto(false);
      };
    } catch (error) {
      console.error('❌ Erreur upload photo:', error);
      toast.error('Erreur lors de l\'upload de la photo');
      setUploadingPhoto(false);
    }
  };

  if (!state.currentDriver) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-600">Conducteur non trouvé</p>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -300, opacity: 0 }}
      transition={{ type: 'spring', damping: 25 }}
      className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-6 bg-white shadow-sm">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCurrentScreen('driver-dashboard')}
          className="w-10 h-10"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-semibold">Mon Profil</h1>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => isEditing ? handleCancel() : setIsEditing(true)}
          className="w-10 h-10"
        >
          {isEditing ? <X className="w-5 h-5" /> : <Edit3 className="w-5 h-5" />}
        </Button>
      </div>

      <div className="flex-1 px-6 py-6 overflow-y-auto">
        {/* Photo et stats */}
        <Card className="p-6 mb-6">
          <div className="flex items-center space-x-4 mb-4 min-w-0">
            <div className="relative w-20 h-20 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
              {state.currentDriver.photo ? (
                <img 
                  src={state.currentDriver.photo} 
                  alt="Photo de profil"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User className="w-8 h-8 text-gray-400" />
                </div>
              )}
              
              {/* ✅ Bouton pour changer la photo */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center"
              >
                {uploadingPhoto ? (
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Camera className="w-6 h-6 text-white" />
                )}
              </button>
              
              {/* Input file caché */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-semibold truncate">{state.currentDriver.name}</h2>
              <div className="flex items-center space-x-4 mt-2 overflow-x-auto">
                <div className="flex items-center space-x-1 flex-shrink-0">
                  <Star className="w-4 h-4 text-yellow-400 fill-current" />
                  <span className="text-sm font-medium">
                    {driverStats.loading ? '...' : (driverStats.rating || 0).toFixed(1)}
                  </span>
                </div>
                <div className="text-sm text-gray-600 flex-shrink-0">
                  {driverStats.loading ? '...' : `${driverStats.totalRides} courses`}
                </div>
                <div className="text-sm text-gray-600 flex-shrink-0">
                  {driverStats.loading ? '...' : formatCDF(driverStats.accountBalance)}
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 text-sm text-gray-600 min-w-0">
            <MapPin className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">
              {state.currentDriver.currentLocation?.address || 'Position non disponible'}
            </span>
          </div>
        </Card>

        {/* Informations personnelles */}
        <Card className="p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Informations personnelles</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nom complet</Label>
              <div className="relative mt-1">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => updateFormData('name', e.target.value)}
                  disabled={!isEditing}
                  className="pl-10 bg-gray-50 border-gray-200"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateFormData('email', e.target.value)}
                  disabled={!isEditing}
                  className="pl-10 bg-gray-50 border-gray-200"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="phone">Téléphone</Label>
              <div className="relative mt-1">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => updateFormData('phone', e.target.value)}
                  disabled={!isEditing}
                  className="pl-10 bg-gray-50 border-gray-200"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Informations du véhicule */}
        <Card className="p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Informations du véhicule</h3>
            <Car className="w-5 h-5 text-gray-400" />
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="vehicleMake">Marque</Label>
                <Input
                  id="vehicleMake"
                  value={formData.vehicleMake}
                  onChange={(e) => updateFormData('vehicleMake', e.target.value)}
                  disabled={!isEditing}
                  className="mt-1 bg-gray-50 border-gray-200"
                />
              </div>
              <div>
                <Label htmlFor="vehicleModel">Modèle</Label>
                <Input
                  id="vehicleModel"
                  value={formData.vehicleModel}
                  onChange={(e) => updateFormData('vehicleModel', e.target.value)}
                  disabled={!isEditing}
                  className="mt-1 bg-gray-50 border-gray-200"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="vehiclePlate">Plaque</Label>
                <Input
                  id="vehiclePlate"
                  value={formData.vehiclePlate}
                  onChange={(e) => updateFormData('vehiclePlate', e.target.value)}
                  disabled={!isEditing}
                  className="mt-1 bg-gray-50 border-gray-200"
                />
              </div>
              <div>
                <Label htmlFor="vehicleColor">Couleur</Label>
                <Input
                  id="vehicleColor"
                  value={formData.vehicleColor}
                  onChange={(e) => updateFormData('vehicleColor', e.target.value)}
                  disabled={!isEditing}
                  className="mt-1 bg-gray-50 border-gray-200"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="vehicleType">Type de véhicule</Label>
              <Select 
                value={formData.vehicleType} 
                onValueChange={(value) => updateFormData('vehicleType', value)}
                disabled={!isEditing}
              >
                <SelectTrigger className="mt-1 bg-gray-50 border-gray-200">
                  <SelectValue placeholder="Sélectionnez un type de véhicule" />
                </SelectTrigger>
                <SelectContent>
                  {vehicleTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* Affichage du tarif sélectionné */}
              {formData.vehicleType && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="text-sm">
                    <p className="font-medium text-blue-900 mb-1">
                      📊 Tarifs {vehicleTypes.find(v => v.value === formData.vehicleType)?.label}
                    </p>
                    <div className="text-xs text-blue-700 space-y-0.5">
                      {formData.vehicleType === 'smart_business' ? (
                        <>
                          <p>• Location journalière : <span className="font-semibold">{VEHICLE_PRICING.smart_business.dailyRate}$ USD/jour</span></p>
                          <p>• Équivalent : <span className="font-semibold">{formatCDF(convertUSDtoCDF(VEHICLE_PRICING.smart_business.dailyRate))}</span></p>
                        </>
                      ) : (
                        <>
                          <p>☀️ Jour (6h-20h) : <span className="font-semibold">{VEHICLE_PRICING[formData.vehicleType as VehicleCategory]?.hourlyRateDay}$ USD/h</span> ≈ {formatCDF(convertUSDtoCDF(VEHICLE_PRICING[formData.vehicleType as VehicleCategory]?.hourlyRateDay || 0))}</p>
                          <p>🌙 Nuit (21h-05h) : <span className="font-semibold">{VEHICLE_PRICING[formData.vehicleType as VehicleCategory]?.hourlyRateNight}$ USD/h</span> ≈ {formatCDF(convertUSDtoCDF(VEHICLE_PRICING[formData.vehicleType as VehicleCategory]?.hourlyRateNight || 0))}</p>
                          <p className="pt-1 border-t border-blue-200 mt-1">• Capacité : <span className="font-semibold">{VEHICLE_PRICING[formData.vehicleType as VehicleCategory]?.capacity} passagers</span></p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Montants post-payés */}
        {postpaidPending > 0 && (
          <Card className="p-6 mb-6 border-2 border-orange-200 bg-gradient-to-r from-orange-50 to-orange-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg">Revenus en attente</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentScreen('driver-wallet')}
                className="text-orange-600 hover:text-orange-700 hover:bg-orange-200"
              >
                Voir détails
              </Button>
            </div>
            
            <div className="bg-white rounded-lg p-4 border border-orange-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Montants post-payés à recevoir</p>
                  <h2 className="text-3xl text-orange-600 mt-1">
                    {formatCDF(postpaidPending)}
                  </h2>
                </div>
                <TrendingUp className="w-12 h-12 text-orange-300" />
              </div>
              
              <div className="mt-3 pt-3 border-t border-orange-100">
                <p className="text-xs text-gray-500">
                  💡 Ces montants seront disponibles une fois que les passagers auront payé leurs courses en post-payé
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Actions */}
      {isEditing && (
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="px-6 pb-6 space-y-3"
        >
          <Button
            onClick={handleSave}
            className="w-full h-12 bg-green-500 hover:bg-green-600 text-white rounded-xl"
          >
            <Save className="w-4 h-4 mr-2" />
            Sauvegarder les modifications
          </Button>
          <Button
            onClick={handleCancel}
            variant="outline"
            className="w-full h-12 border-gray-300 text-gray-700 rounded-xl"
          >
            Annuler
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
}