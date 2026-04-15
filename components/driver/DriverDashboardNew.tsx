import { useState, useEffect } from 'react';
import { motion } from '../../lib/motion';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { useAppState } from '../../hooks/useAppState';
import { DriverWalletManager } from './DriverWalletManager';
import { VEHICLE_PRICING, VehicleCategory } from '../../lib/pricing';
import { getMinimumCreditForCategory } from '../../lib/pricing-config';
import { getVehicleDisplayName } from '../../lib/vehicle-helpers';
import { toast } from '../../lib/toast';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { RideNotificationSound } from './RideNotificationSound';
import { RideNotification } from './RideNotification';
import { FCMDiagnostic } from './FCMDiagnostic';
import { PreciseGPSTracker, reverseGeocode } from '../../lib/precise-gps'; // 🆕 Import GPS tracker
import { registerDriverFCMToken } from '../../lib/driver-fcm'; // 🔔 Import FCM
import { registerDriverFCMToken, listenToFCMMessages } from '../../lib/driver-fcm';

// ✅ Helper inliné pour éviter les problèmes de build Rollup
function isDriverFCMTokenRegistered(driverId: string): boolean {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return false;
  }
  const registered = localStorage.getItem(`fcm_registered_${driverId}`);
  const token = localStorage.getItem(`fcm_token_${driverId}`);
  return registered === 'true' && !!token;
}

// Icônes SVG
const Home = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
);

const Car = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
);

const DollarSign = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
);

const User = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
);

const Power = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
);

const Star = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
);

const Navigation = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
);

const Wallet = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
);

const AlertCircle = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
);

const XCircle = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
);

const Clock = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
);

const TrendingUp = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
);

// Types
interface Driver {
  id: string;
  full_name: string;
  name?: string;
  phone: string;
  email?: string;
  balance: number;
  earningsBalance?: number;
  bonusBalance?: number;
  status: 'online' | 'offline' | 'busy';
  isApproved: boolean;
  rating: number;
  totalRides: number;
  vehicle?: {
    make?: string;
    model?: string;
    year?: string;
    color?: string;
    plate?: string;
    category?: VehicleCategory;
    seats?: number;
  };
  currentLocation?: {
    latitude: number;
    longitude: number;
  };
  accountType?: 'prepaid' | 'postpaid';
}

interface RideRequest {
  id: string;
  passengerId: string;
  passengerName: string;
  passengerPhone: string;
  pickup: {
    latitude: number;
    longitude: number;
    address: string;
  };
  dropoff: {
    latitude: number;
    longitude: number;
    address: string;
  };
  distance: number;
  estimatedPrice: number;
  vehicleCategory: VehicleCategory;
  timestamp: number;
}

type TabType = 'home' | 'rides' | 'earnings' | 'profile';

export function DriverDashboardNew() {
  const { state, setCurrentDriver, setCurrentScreen } = useAppState();
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [isOnline, setIsOnline] = useState(false);
  const [driver, setDriver] = useState<Driver | null>(null);
  const [pendingRideRequest, setPendingRideRequest] = useState<RideRequest | null>(null);
  const [showWalletManager, setShowWalletManager] = useState(false);
  const [showFCMDiagnostic, setShowFCMDiagnostic] = useState(false);
  const [activeRide, setActiveRide] = useState<any>(null);
  const [ridesHistory, setRidesHistory] = useState<any[]>([]);

  // 🆕 États pour la géolocalisation
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>({
    lat: -4.3276, // Kinshasa par défaut
    lng: 15.3136
  });
  const [currentAddress, setCurrentAddress] = useState<string>('Kinshasa, RDC'); // Position par défaut immédiate
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [gpsTracker] = useState(() => new PreciseGPSTracker());

  // Charger les données du conducteur
  useEffect(() => {
    const loadDriver = async () => {
      if (!state.currentDriver?.id) return;
      
      // ✅ FIX: Réessayer jusqu'à 3 fois avec délais progressifs
      let attempts = 0;
      const maxAttempts = 3;
      const delays = [0, 2000, 5000]; // 0s, 2s, 5s
      
      while (attempts < maxAttempts) {
        try {
          // Attendre avant de réessayer (sauf pour la première tentative)
          if (attempts > 0) {
            console.log(`⏳ Tentative ${attempts + 1}/${maxAttempts} de chargement du profil conducteur après ${delays[attempts]}ms...`);
            await new Promise(resolve => setTimeout(resolve, delays[attempts]));
          }
          
          const response = await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/drivers/${state.currentDriver.id}`,
            {
              headers: {
                'Authorization': `Bearer ${publicAnonKey}`,
              },
            }
          );

          if (response.ok) {
            const data = await response.json();
            if (data.success && data.driver) {
              console.log('✅ Profil conducteur chargé avec succès');
              setDriver(data.driver);
              setIsOnline(data.driver.status === 'online');
              return; // Succès, sortir de la boucle
            }
          } else if (response.status === 404) {
            console.log(`⚠️ Profil conducteur non trouvé (tentative ${attempts + 1}/${maxAttempts})`);
            
            // Si c'est la dernière tentative et qu'on a quand même les données du conducteur dans le state
            // On crée un profil temporaire pour permettre au conducteur de continuer
            if (attempts === maxAttempts - 1 && state.currentDriver) {
              console.log('🔧 Création d\'un profil temporaire depuis le state local');
              const tempDriver: Driver = {
                id: state.currentDriver.id,
                full_name: state.currentDriver.name || 'Conducteur',
                name: state.currentDriver.name,
                phone: state.currentDriver.phone || '',
                email: state.currentDriver.email,
                balance: 0,
                earningsBalance: 0,
                bonusBalance: 0,
                status: 'offline',
                isApproved: state.currentDriver.isApproved !== undefined ? state.currentDriver.isApproved : false,
                rating: state.currentDriver.rating || 5.0,
                totalRides: state.currentDriver.totalRides || 0,
                vehicle: {
                  make: state.currentDriver.vehicleInfo?.make,
                  model: state.currentDriver.vehicleInfo?.model,
                  color: state.currentDriver.vehicleInfo?.color,
                  plate: state.currentDriver.vehicleInfo?.plate,
                  category: state.currentDriver.vehicleInfo?.type,
                },
                accountType: 'prepaid'
              };
              
              setDriver(tempDriver);
              setIsOnline(false);
              
              // Afficher un avertissement au lieu d'une erreur
              toast.error('Profil partiellement chargé. Certaines fonctionnalités peuvent être limitées.', {
                duration: 5000
              });
              
              return;
            }
          }
        } catch (error) {
          console.error(`❌ Erreur chargement conducteur (tentative ${attempts + 1}/${maxAttempts}):`, error);
        }
        
        attempts++;
      }
      
      // Si on arrive ici, toutes les tentatives ont échoué et on n'a pas pu créer de profil temporaire
      console.error('❌ Impossible de charger le profil conducteur après', maxAttempts, 'tentatives');
      toast.error('Erreur de chargement du profil. Veuillez actualiser la page.');
    };

    loadDriver();
  }, [state.currentDriver?.id]);


    // Vérifier si déjà enregistré pour éviter les doublons
    // 🔔 Initialiser FCM - toujours re-enregistrer sur le serveur
// 🔔 Initialiser FCM - toujours re-enregistrer sur le serveur
useEffect(() => {
  if (!driver?.id) return;

  registerDriverFCMToken(driver.id).then(success => {
    if (success) {
      console.log('✅ Token FCM enregistré avec succès');
      // ✅ Démarrer l'écoute des messages FCM en foreground
      listenToFCMMessages((payload) => {
        console.log('📬 Message FCM reçu dans dashboard:', payload);
      });
    }
  }).catch(error => {
    console.warn('⚠️ Erreur FCM:', error);
  });
}, [driver?.id]);

  // 🆕 Géolocalisation automatique quand le conducteur est EN LIGNE
  useEffect(() => {
    if (isOnline && driver?.id) {
      console.log('📍 Conducteur EN LIGNE - Démarrage GPS tracking...');
      
      // Démarrer le tracking GPS
      gpsTracker.start({
        onPositionUpdate: (position) => {
          const location = { lat: position.lat, lng: position.lng };
          setCurrentLocation(location);
          setGpsAccuracy(position.accuracy);
          
          console.log(`📍 Position conducteur: ${position.lat.toFixed(6)}, ${position.lng.toFixed(6)} (±${Math.round(position.accuracy)}m)`);
          
          // Géocodage inverse pour obtenir l'adresse
          reverseGeocode(position.lat, position.lng).then(address => {
            setCurrentAddress(address);
            console.log(`📍 Adresse conducteur: ${address}`);
          });
          
          // Envoyer la position au backend toutes les 30 secondes
          const now = Date.now();
          const lastUpdate = parseInt(sessionStorage.getItem('lastLocationUpdate') || '0');
          if (now - lastUpdate > 30000) { // 30 secondes
            updateDriverLocation(driver.id, location);
            sessionStorage.setItem('lastLocationUpdate', now.toString());
          }
        },
        onError: (error) => {
          console.error('❌ Erreur GPS:', error);
          toast.error('Géolocalisation indisponible');
        }
      });
      
      return () => {
        console.log('🛑 Conducteur HORS LIGNE - Arrêt GPS tracking');
        gpsTracker.stop();
      };
    }
  }, [isOnline, driver?.id, gpsTracker]);

  // 🔔 Écouter les notifications FCM de nouvelle course
  useEffect(() => {
  // Écouter les messages du Service Worker (clic sur notification)
  const handleSWMessage = (event: MessageEvent) => {
    if (event.data?.type === 'ACCEPT_RIDE' || event.data?.type === 'DECLINE_RIDE') {
      console.log('📬 Message SW reçu:', event.data);
    }
  };
  navigator.serviceWorker?.addEventListener('message', handleSWMessage);

  // Écouter les notifications FCM en foreground
  const handleFCMRide = (event: any) => {
    console.log('🔔 FCM nouvelle course:', event.detail);
    const d = event.detail;
    setPendingRideRequest({
      id: d.rideId,
      passengerId: '',
      passengerName: d.passengerName || 'Passager',
      passengerPhone: d.passengerPhone || '',
      pickup: {
        latitude: parseFloat(d.pickupLat) || -4.3276,
        longitude: parseFloat(d.pickupLng) || 15.3136,
        address: d.pickupName || 'Point de départ'
      },
      dropoff: {
        latitude: parseFloat(d.destinationLat) || -4.3276,
        longitude: parseFloat(d.destinationLng) || 15.3136,
        address: d.destinationName || 'Destination'
      },
      distance: parseFloat(d.distance) || 0,
      estimatedPrice: parseFloat(d.estimatedPrice) || 0,
      vehicleCategory: d.vehicleCategory,
      timestamp: Date.now()
    });
  };
  window.addEventListener('fcm-new-ride-request', handleFCMRide);

  // Polling de secours toutes les 10 secondes (si FCM silencieux)
  const poll = setInterval(async () => {
    if (!driver?.id || pendingRideRequest) return;
    try {
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/rides/pending/${driver.id}`,
        { headers: { 'Authorization': `Bearer ${publicAnonKey}` } }
      );
      const data = await res.json();
      if (data.success && data.ride) {
        const ride = data.ride;
        setPendingRideRequest({
          id: ride.id,
          passengerId: ride.passengerId || '',
          passengerName: ride.passengerName || 'Passager',
          passengerPhone: ride.passengerPhone || '',
          pickup: {
            latitude: ride.pickup?.coordinates?.lat || -4.3276,
            longitude: ride.pickup?.coordinates?.lng || 15.3136,
            address: ride.pickup?.name || 'Point de départ'
          },
          dropoff: {
            latitude: ride.destination?.coordinates?.lat || -4.3276,
            longitude: ride.destination?.coordinates?.lng || 15.3136,
            address: ride.destination?.name || 'Destination'
          },
          distance: ride.distance || 0,
          estimatedPrice: ride.estimatedPrice || 0,
          vehicleCategory: ride.vehicleCategory,
          timestamp: Date.now()
        });
      }
    } catch (e) {}
  }, 10000);

  return () => {
    navigator.serviceWorker?.removeEventListener('message', handleSWMessage);
    window.removeEventListener('fcm-new-ride-request', handleFCMRide);
    clearInterval(poll);
  };
}, [driver?.id, pendingRideRequest]);

  // Fonction pour envoyer la position au backend
  const updateDriverLocation = async (driverId: string, location: { lat: number; lng: number }) => {
    try {
      await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/drivers/${driverId}/location`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            latitude: location.lat,
            longitude: location.lng,
          }),
        }
      );
      console.log('✅ Position envoyée au serveur');
    } catch (error) {
      console.error('❌ Erreur envoi position:', error);
    }
  };

  // Toggle en ligne/hors ligne
  const handleToggleOnline = async () => {
    if (!driver) return;

    // Vérifier le solde de crédit minimum
    const minimumCredit = getMinimumCreditForCategory(driver.vehicle?.category || 'smart_standard');
    
    if (!isOnline && (driver.balance || 0) < minimumCredit) {
      toast.error(`❌ Solde insuffisant ! Vous devez avoir au moins ${minimumCredit.toLocaleString('fr-FR')} CDF pour vous mettre en ligne.`);
      setShowWalletManager(true);
      return;
    }

    try {
      const newStatus = isOnline ? 'offline' : 'online';
      
      // 🔥 FIX: Si le conducteur se met EN LIGNE, d'abord obtenir sa position GPS
      let currentLocationToSend = null;
      if (newStatus === 'online') {
        console.log('📍 Obtention de la position GPS avant mise en ligne...');
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 0
            });
          });
          
          currentLocationToSend = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          
          console.log('✅ Position GPS obtenue:', currentLocationToSend);
        } catch (gpsError) {
          console.error('❌ Erreur GPS:', gpsError);
          toast.error('❌ Impossible d\'obtenir votre position GPS. Vérifiez vos autorisations.');
          return; // ❌ Bloquer la mise en ligne si pas de GPS
        }
      }
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/drivers/${driver.id}/status`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            status: newStatus,
            location: currentLocationToSend // 🔥 Envoyer la position GPS si EN LIGNE
          }),
        }
      );

      if (response.ok) {
        setIsOnline(!isOnline);
        toast.success(newStatus === 'online' ? '✅ Vous êtes maintenant en ligne' : '✅ Vous êtes maintenant hors ligne');
      } else {
        const errorData = await response.json();
        toast.error(`❌ ${errorData.error || 'Erreur lors du changement de statut'}`);
      }
    } catch (error) {
      console.error('Erreur changement statut:', error);
      toast.error('❌ Erreur lors du changement de statut');
    }
  };

  if (!driver) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-primary-dark text-white px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold">{driver.full_name || driver.name}</h1>
              <p className="text-sm opacity-90">{driver.phone}</p>
            </div>
          </div>
          <button
            onClick={handleToggleOnline}
            className={`px-4 py-2 rounded-lg font-medium transition-all shadow-lg ${
              isOnline
                ? 'bg-green-500 text-white hover:bg-green-600'
                : 'bg-white text-primary hover:bg-gray-50 border-2 border-white'
            }`}
          >
            <Power className="w-4 h-4 inline mr-1" />
            {isOnline ? 'EN LIGNE' : 'HORS LIGNE'}
          </button>
        </div>

        {/* Stats rapides */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/10 backdrop-blur rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Star className="w-4 h-4 text-yellow-300" />
              <span className="text-xs opacity-80">Note</span>
            </div>
            <p className="text-xl font-bold">{driver.rating?.toFixed(1) || '5.0'}</p>
          </div>
          
          <div className="bg-white/10 backdrop-blur rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Navigation className="w-4 h-4" />
              <span className="text-xs opacity-80">Courses</span>
            </div>
            <p className="text-xl font-bold">{driver.totalRides || 0}</p>
          </div>
          
          <div className="bg-white/10 backdrop-blur rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4" />
              <span className="text-xs opacity-80">Gains</span>
            </div>
            <p className="text-lg font-bold">{(driver.earningsBalance || 0).toLocaleString('fr-FR')}</p>
          </div>
        </div>
      </div>

      {/* Contenu basé sur l'onglet actif */}
      <div className="p-4 space-y-4">
        {activeTab === 'home' && (
          <>
            {/* Alerte si solde faible */}
            {(driver.balance || 0) < getMinimumCreditForCategory(driver.vehicle?.category || 'smart_standard') && (
              <Card className="p-4 bg-orange-50 border-orange-200">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-orange-900">
                      Solde de crédit insuffisant
                    </p>
                    <p className="text-xs text-orange-700 mt-1">
                      Rechargez votre compte pour pouvoir vous mettre en ligne.
                    </p>
                    <Button
                      onClick={() => setShowWalletManager(true)}
                      size="sm"
                      className="mt-2 bg-orange-600 hover:bg-orange-700"
                    >
                      <Wallet className="w-4 h-4 mr-2" />
                      Recharger maintenant
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {/* Triple Solde - Crédit / Gains / Bonus */}
            <Card className="p-4">
              <h3 className="font-semibold text-gray-900 mb-4">💰 Mes Soldes</h3>
              <div className="grid grid-cols-1 gap-3">
                {/* Crédit (Ligne) - Informatif */}
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-4 rounded-lg border border-blue-200">
                  <p className="text-xs text-blue-600 mb-1">💳 Crédit (Ligne)</p>
                  <p className="text-2xl font-bold text-blue-900">{(driver.balance || 0).toLocaleString('fr-FR')} CDF</p>
                  <p className="text-xs text-blue-600 mt-2">-15% par course • Informatif uniquement</p>
                </div>
                
                {/* Gains (Informatif) */}
                <div className="bg-gradient-to-br from-purple-50 to-violet-50 p-4 rounded-lg border border-purple-200">
                  <p className="text-xs text-purple-600 mb-1">📊 Gains (Informatif)</p>
                  <p className="text-2xl font-bold text-purple-900">{(driver.earningsBalance || 0).toLocaleString('fr-FR')} CDF</p>
                  <p className="text-xs text-purple-600 mt-2">+85% par course • Non retirable</p>
                </div>
                
                {/* Bonus (Retirable) */}
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
                  <p className="text-xs text-green-600 mb-1">🎁 Bonus (Retirable)</p>
                  <p className="text-2xl font-bold text-green-900">{(driver.bonusBalance || 0).toLocaleString('fr-FR')} CDF</p>
                  <p className="text-xs text-green-600 mt-2">Défini par l'admin • Retirable uniquement</p>
                </div>
              </div>
            </Card>

            {/* 🆕 Position actuelle si EN LIGNE */}
            {isOnline && (
              <Card className="p-4 bg-blue-50 border-blue-200">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <Navigation className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-blue-900 mb-1">📍 Ma position actuelle</h3>
                    <p className="text-sm text-blue-700 font-medium">{currentAddress}</p>
                  </div>
                  <div className="flex-shrink-0">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  </div>
                </div>
              </Card>
            )}

            {/* Bouton Gérer mon portefeuille */}
            <Button
              onClick={() => setShowWalletManager(true)}
              variant="outline"
              className="w-full"
              size="lg"
            >
              <Wallet className="w-5 h-5 mr-2" />
              Gérer mon portefeuille
            </Button>

            {/* Informations véhicule */}
            <Card className="p-4">
              <h3 className="font-semibold text-gray-900 mb-3">🚗 Mon véhicule</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Marque / Modèle</span>
                  <span className="font-medium">{driver.vehicle?.make} {driver.vehicle?.model}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Plaque</span>
                  <span className="font-medium font-mono">{driver.vehicle?.plate}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Catégorie</span>
                  <Badge className="bg-purple-100 text-purple-700">
                    {getVehicleDisplayName(driver.vehicle?.category || 'smart_standard')}
                  </Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Couleur</span>
                  <span className="font-medium">{driver.vehicle?.color}</span>
                </div>
              </div>
            </Card>

            {/* Stats rapides aujourd'hui */}
            <Card className="p-4">
              <h3 className="font-semibold text-gray-900 mb-3">📊 Aujourd'hui</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">0</p>
                  <p className="text-xs text-gray-500">Courses</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">0</p>
                  <p className="text-xs text-gray-500">CDF</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-orange-600">0h</p>
                  <p className="text-xs text-gray-500">En ligne</p>
                </div>
              </div>
            </Card>
          </>
        )}

        {activeTab === 'rides' && (
          <Card className="p-4">
            <h3 className="font-semibold text-gray-900 mb-4">📋 Historique des courses</h3>
            <div className="text-center py-12">
              <Navigation className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">Aucune course pour le moment</p>
              <p className="text-sm text-gray-400 mt-2">Vos courses apparaîtront ici</p>
            </div>
          </Card>
        )}

        {activeTab === 'earnings' && (
          <>
            <Card className="p-4 bg-gradient-to-br from-green-500 to-emerald-600 text-white">
              <h3 className="font-semibold mb-2">💰 Gains Totaux</h3>
              <p className="text-4xl font-bold mb-1">{(driver.earningsBalance || 0).toLocaleString('fr-FR')} CDF</p>
              <p className="text-sm opacity-90">Argent retirable</p>
            </Card>

            <Card className="p-4">
              <h3 className="font-semibold text-gray-900 mb-4">📈 Statistiques</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Clock className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Cette semaine</p>
                      <p className="text-xs text-gray-500">0 courses</p>
                    </div>
                  </div>
                  <p className="font-bold text-lg">0 CDF</p>
                </div>

                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Ce mois</p>
                      <p className="text-xs text-gray-500">0 courses</p>
                    </div>
                  </div>
                  <p className="font-bold text-lg">0 CDF</p>
                </div>

                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <Star className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Total</p>
                      <p className="text-xs text-gray-500">{driver.totalRides || 0} courses</p>
                    </div>
                  </div>
                  <p className="font-bold text-lg">{(driver.earningsBalance || 0).toLocaleString('fr-FR')} CDF</p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="font-semibold text-gray-900 mb-3">ℹ️ Comment ça marche ?</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <span className="text-blue-600">•</span>
                  <p className="text-gray-700"><strong>Crédit (-15%) :</strong> Déduction pour chaque course</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-600">•</span>
                  <p className="text-gray-700"><strong>Gains (+85%) :</strong> Votre argent après commission</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-orange-600">•</span>
                  <p className="text-gray-700"><strong>Retrait :</strong> Disponible depuis le portefeuille</p>
                </div>
              </div>
            </Card>
          </>
        )}

        {activeTab === 'profile' && (
          <>
            <Card className="p-4">
              <h3 className="font-semibold text-gray-900 mb-4">👤 Informations personnelles</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500">Nom complet</p>
                  <p className="font-medium">{driver.full_name || driver.name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Téléphone</p>
                  <p className="font-medium">{driver.phone}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Type de compte</p>
                  <Badge variant="secondary">{driver.accountType || 'prepaid'}</Badge>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Statut</p>
                  <Badge className={driver.isApproved ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}>
                    {driver.isApproved ? 'Approuvé' : 'En attente'}
                  </Badge>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="font-semibold text-gray-900 mb-4">⚙️ Paramètres</h3>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setShowFCMDiagnostic(true)}
                >
                  <Navigation className="w-4 h-4 mr-2" />
                  Diagnostic FCM
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => {
                    if (confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
                      localStorage.removeItem('smartcabb_token');
                      sessionStorage.clear();
                      setCurrentDriver(null);
                      setCurrentScreen('driver-welcome');
                      toast.success('Déconnexion réussie');
                    }
                  }}
                >
                  <Power className="w-4 h-4 mr-2" />
                  Se déconnecter
                </Button>
              </div>
            </Card>
          </>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 safe-area-pb">
        <div className="grid grid-cols-4 gap-1">
          <button
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center py-2 px-3 rounded-lg transition-colors ${
              activeTab === 'home'
                ? 'bg-primary/10 text-primary'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            <Home className={`w-6 h-6 mb-1 ${activeTab === 'home' ? 'stroke-[2.5]' : ''}`} />
            <span className="text-xs font-medium">Accueil</span>
          </button>

          <button
            onClick={() => setActiveTab('rides')}
            className={`flex flex-col items-center py-2 px-3 rounded-lg transition-colors ${
              activeTab === 'rides'
                ? 'bg-primary/10 text-primary'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            <Navigation className={`w-6 h-6 mb-1 ${activeTab === 'rides' ? 'stroke-[2.5]' : ''}`} />
            <span className="text-xs font-medium">Courses</span>
          </button>

          <button
            onClick={() => setActiveTab('earnings')}
            className={`flex flex-col items-center py-2 px-3 rounded-lg transition-colors ${
              activeTab === 'earnings'
                ? 'bg-primary/10 text-primary'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            <DollarSign className={`w-6 h-6 mb-1 ${activeTab === 'earnings' ? 'stroke-[2.5]' : ''}`} />
            <span className="text-xs font-medium">Gains</span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center py-2 px-3 rounded-lg transition-colors ${
              activeTab === 'profile'
                ? 'bg-primary/10 text-primary'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            <User className={`w-6 h-6 mb-1 ${activeTab === 'profile' ? 'stroke-[2.5]' : ''}`} />
            <span className="text-xs font-medium">Profil</span>
          </button>
        </div>
      </div>

      {/* Modal Gestionnaire de portefeuille */}
      {showWalletManager && driver && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[90vh] overflow-auto"
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
              <h3 className="font-bold text-lg">Portefeuille</h3>
              <button
                onClick={() => setShowWalletManager(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <DriverWalletManager
                driverId={driver.id}
                creditBalance={driver.balance || 0}
                earningsBalance={driver.earningsBalance || 0}
                bonusBalance={driver.bonusBalance || 0}
                onBalanceUpdate={(newCreditBalance, newEarningsBalance, newBonusBalance) => {
                  setDriver({
                    ...driver,
                    balance: newCreditBalance,
                    earningsBalance: newEarningsBalance,
                    bonusBalance: newBonusBalance,
                  });
                }}
              />
            </div>
          </motion.div>
        </div>
      )}

      {/* Modal Diagnostic FCM */}
      {showFCMDiagnostic && driver && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
              <h3 className="font-bold text-lg">Diagnostic FCM</h3>
              <button
                onClick={() => setShowFCMDiagnostic(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <FCMDiagnostic 
                driverId={driver.id} 
                driverName={driver.full_name || driver.name}
              />
            </div>
          </div>
        </div>
      )}

      {/* Notification de course */}
      {pendingRideRequest && (
        <RideNotification
          rideRequest={pendingRideRequest}
          onAccept={async (request) => {
            console.log('Course acceptée:', request);
            setPendingRideRequest(null);
          }}
          onDecline={() => {
            setPendingRideRequest(null);
          }}
          timeoutSeconds={30}
        />
      )}

      {/* Son de notification */}
      <RideNotificationSound 
  shouldPlay={!!pendingRideRequest}
  rideDetails={pendingRideRequest ? {
    passengerName: pendingRideRequest.passengerName,
    pickup: { 
      address: pendingRideRequest.pickup?.address,
      lat: pendingRideRequest.pickup?.latitude,
      lng: pendingRideRequest.pickup?.longitude
    },
    distance: pendingRideRequest.distance,
    estimatedEarnings: pendingRideRequest.estimatedPrice
  } : undefined}
/>
    </div>
  );
}

export default DriverDashboardNew;
