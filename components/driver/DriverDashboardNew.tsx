import { useState, useEffect } from 'react';
import { motion } from '../../lib/motion';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { useAppState } from '../../hooks/useAppState';
import { DriverWalletManager } from './DriverWalletManager';
import { VehicleCategory } from '../../lib/pricing';
import { getMinimumCreditForCategory } from '../../lib/pricing-config';
import { getVehicleDisplayName } from '../../lib/vehicle-helpers';
import { toast } from '../../lib/toast';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { RideNotificationSound } from './RideNotificationSound';
import { RideNotification } from './RideNotification';
import { FCMDiagnostic } from './FCMDiagnostic';
import { PreciseGPSTracker, reverseGeocode } from '../../lib/precise-gps';
import { registerDriverFCMToken, listenToFCMMessages } from '../../lib/driver-fcm';
import { stopAllNotifications } from '../../lib/notification-sound';

function isDriverFCMTokenRegistered(driverId: string): boolean {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return false;
  const registered = localStorage.getItem(`fcm_registered_${driverId}`);
  const token = localStorage.getItem(`fcm_token_${driverId}`);
  return registered === 'true' && !!token;
}

const Home = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
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
  currentLocation?: { latitude: number; longitude: number };
  accountType?: 'prepaid' | 'postpaid';
}

interface RideRequest {
  id: string;
  passengerId: string;
  passengerName: string;
  passengerPhone: string;
  pickup: { latitude: number; longitude: number; address: string };
  dropoff: { latitude: number; longitude: number; address: string };
  distance: number;
  estimatedPrice: number;
  vehicleCategory: VehicleCategory;
  timestamp: number;
}

type TabType = 'home' | 'rides' | 'earnings' | 'profile';

// Helper pour construire RideRequest depuis les données FCM/backend
function buildRideRequest(d: any): RideRequest {
  return {
    id: d.rideId || d.id,
    passengerId: d.passengerId || '',
    passengerName: d.passengerName || 'Passager',
    passengerPhone: d.passengerPhone || '',
    pickup: {
      latitude: parseFloat(d.pickupLat || d.pickup?.coordinates?.lat) || -4.3276,
      longitude: parseFloat(d.pickupLng || d.pickup?.coordinates?.lng) || 15.3136,
      address: d.pickupName || d.pickup?.name || 'Point de départ'
    },
    dropoff: {
      latitude: parseFloat(d.destinationLat || d.destination?.coordinates?.lat) || -4.3276,
      longitude: parseFloat(d.destinationLng || d.destination?.coordinates?.lng) || 15.3136,
      address: d.destinationName || d.destination?.name || 'Destination'
    },
    distance: parseFloat(d.distance) || 0,
    estimatedPrice: parseFloat(d.estimatedPrice) || 0,
    vehicleCategory: d.vehicleCategory,
    timestamp: Date.now()
  };
}

export function DriverDashboardNew() {
  const { state, setCurrentDriver, setCurrentScreen } = useAppState();
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [isOnline, setIsOnline] = useState(false);
  const [driver, setDriver] = useState<Driver | null>(null);
  const [pendingRideRequest, setPendingRideRequest] = useState<RideRequest | null>(null);
  const [showWalletManager, setShowWalletManager] = useState(false);
  const [showFCMDiagnostic, setShowFCMDiagnostic] = useState(false);

  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>({
    lat: -4.3276,
    lng: 15.3136
  });
  const [currentAddress, setCurrentAddress] = useState<string>('Kinshasa, RDC');
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [gpsTracker] = useState(() => new PreciseGPSTracker());

  // ============================================================
  // 1. Charger le profil conducteur
  // ============================================================
  useEffect(() => {
    const loadDriver = async () => {
      if (!state.currentDriver?.id) return;

      let attempts = 0;
      const maxAttempts = 3;
      const delays = [0, 2000, 5000];

      while (attempts < maxAttempts) {
        try {
          if (attempts > 0) {
            await new Promise(resolve => setTimeout(resolve, delays[attempts]));
          }

          const response = await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/drivers/${state.currentDriver.id}`,
            { headers: { 'Authorization': `Bearer ${publicAnonKey}` } }
          );

          if (response.ok) {
            const data = await response.json();
            if (data.success && data.driver) {
              setDriver(data.driver);
              setIsOnline(data.driver.status === 'online');
              return;
            }
          } else if (response.status === 404 && attempts === maxAttempts - 1 && state.currentDriver) {
            const tempDriver: Driver = {
              id: state.currentDriver.id,
              full_name: state.currentDriver.name || 'Conducteur',
              name: state.currentDriver.name,
              phone: state.currentDriver.phone || '',
              balance: 0,
              earningsBalance: 0,
              bonusBalance: 0,
              status: 'offline',
              isApproved: state.currentDriver.isApproved ?? false,
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
            toast.error('Profil partiellement chargé.', { duration: 5000 });
            return;
          }
        } catch (error) {
          console.error(`Erreur chargement conducteur (tentative ${attempts + 1}):`, error);
        }
        attempts++;
      }
      toast.error('Erreur de chargement du profil. Veuillez actualiser la page.');
    };

    loadDriver();
  }, [state.currentDriver?.id]);

  // ============================================================
  // 2. Vérifier URL params au démarrage (app ouverte depuis notification)
  // ============================================================
  useEffect(() => {
    if (!driver?.id) return;

    const params = new URLSearchParams(window.location.search);
    const rideId = params.get('rideId');
    const action = params.get('action');

    if (rideId && action === 'new_ride') {
      console.log('🔗 App ouverte depuis notification, rideId:', rideId);
      fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/rides/${rideId}`,
        { headers: { 'Authorization': `Bearer ${publicAnonKey}` } }
      ).then(r => r.json()).then(data => {
        if (data.success && data.ride) {
          setPendingRideRequest(buildRideRequest(data.ride));
          window.history.replaceState({}, '', '/app/driver');
        }
      }).catch(e => console.error('Erreur récupération course depuis URL:', e));
    }
  }, [driver?.id]);

  // ============================================================
  // 3. Initialiser FCM + écouter messages foreground + SW
  // ============================================================
  useEffect(() => {
    if (!driver?.id) return;

    // Écouter les messages du Service Worker (app en arrière-plan)
    const handleSWMessage = (event: MessageEvent) => {
      const { type, detail } = event.data || {};
      console.log('📬 Message SW reçu:', type);

      if (type === 'NEW_RIDE_REQUEST' && detail?.rideId) {
        console.log('🚕 Nouvelle course via SW:', detail.rideId);
        setPendingRideRequest(buildRideRequest(detail));
      }

      if (type === 'DECLINE_RIDE') {
        setPendingRideRequest(null);
        stopAllNotifications();
      }
    };
    navigator.serviceWorker?.addEventListener('message', handleSWMessage);

    // Écouter l'événement custom FCM foreground
    const handleFCMRide = (event: any) => {
      console.log('🔔 FCM nouvelle course (foreground):', event.detail);
      setPendingRideRequest(buildRideRequest(event.detail));
    };
    window.addEventListener('fcm-new-ride-request', handleFCMRide);

    // Écouter fermeture notification (course prise/annulée)
    const handleRideDismissed = () => {
      console.log('⏹️ Course dismissée');
      setPendingRideRequest(null);
      stopAllNotifications();
    };
    window.addEventListener('fcm-ride-dismissed', handleRideDismissed);

    // Initialiser FCM et démarrer le listener foreground
    const initFCM = async () => {
      try {
        const success = await registerDriverFCMToken(driver.id);
        if (!success) {
          console.warn('⚠️ Échec enregistrement FCM');
          return;
        }
        console.log('✅ FCM configuré avec succès pour driver', driver.id);
        // listenToFCMMessages est déjà appelé dans registerDriverFCMToken (driver-fcm.ts)
      } catch (error) {
        console.error('❌ Erreur initialisation FCM:', error);
      }
    };
    initFCM();

    // Polling de secours toutes les 10 secondes
    const poll = setInterval(async () => {
      if (!driver?.id || pendingRideRequest) return;
      try {
        const res = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/rides/pending/${driver.id}`,
          { headers: { 'Authorization': `Bearer ${publicAnonKey}` } }
        );
        const data = await res.json();
        if (data.success && data.ride) {
          console.log('📋 Course en attente trouvée via polling:', data.ride.id);
          setPendingRideRequest(buildRideRequest(data.ride));
        }
      } catch (e) {}
    }, 10000);

    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleSWMessage);
      window.removeEventListener('fcm-new-ride-request', handleFCMRide);
      window.removeEventListener('fcm-ride-dismissed', handleRideDismissed);
      clearInterval(poll);
    };
  }, [driver?.id]);

  // ============================================================
  // 4. GPS tracking quand EN LIGNE
  // ============================================================
  useEffect(() => {
    if (!isOnline || !driver?.id) return;

    console.log('📍 Conducteur EN LIGNE - Démarrage GPS tracking...');

    gpsTracker.start({
      onPositionUpdate: (position) => {
        const location = { lat: position.lat, lng: position.lng };
        setCurrentLocation(location);
        setGpsAccuracy(position.accuracy);

        reverseGeocode(position.lat, position.lng).then(address => {
          setCurrentAddress(address);
        });

        const now = Date.now();
        const lastUpdate = parseInt(sessionStorage.getItem('lastLocationUpdate') || '0');
        if (now - lastUpdate > 30000) {
          updateDriverLocation(driver.id, location);
          sessionStorage.setItem('lastLocationUpdate', now.toString());
        }
      },
      onError: (error) => {
        console.error('❌ Erreur GPS:', error);
      }
    });

    return () => {
      console.log('🛑 Arrêt GPS tracking');
      gpsTracker.stop();
    };
  }, [isOnline, driver?.id]);

  const updateDriverLocation = async (driverId: string, location: { lat: number; lng: number }) => {
    try {
      await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/drivers/${driverId}/location`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${publicAnonKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ latitude: location.lat, longitude: location.lng })
        }
      );
    } catch (error) {
      console.error('❌ Erreur envoi position:', error);
    }
  };

  const handleToggleOnline = async () => {
    if (!driver) return;

    const minimumCredit = getMinimumCreditForCategory(driver.vehicle?.category || 'smart_standard');
    if (!isOnline && (driver.balance || 0) < minimumCredit) {
      toast.error(`Solde insuffisant ! Minimum ${minimumCredit.toLocaleString('fr-FR')} CDF requis.`);
      setShowWalletManager(true);
      return;
    }

    try {
      const newStatus = isOnline ? 'offline' : 'online';
      let currentLocationToSend = null;

      if (newStatus === 'online') {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true, timeout: 10000, maximumAge: 0
            });
          });
          currentLocationToSend = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
        } catch (gpsError) {
          toast.error('Impossible d\'obtenir votre position GPS.');
          return;
        }
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/drivers/${driver.id}/status`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${publicAnonKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus, location: currentLocationToSend })
        }
      );

      if (response.ok) {
        setIsOnline(!isOnline);
        toast.success(newStatus === 'online' ? 'Vous êtes maintenant en ligne' : 'Vous êtes maintenant hors ligne');
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Erreur lors du changement de statut');
      }
    } catch (error) {
      toast.error('Erreur lors du changement de statut');
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
              isOnline ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-white text-primary hover:bg-gray-50 border-2 border-white'
            }`}
          >
            <Power className="w-4 h-4 inline mr-1" />
            {isOnline ? 'EN LIGNE' : 'HORS LIGNE'}
          </button>
        </div>

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

      {/* Contenu */}
      <div className="p-4 space-y-4">
        {activeTab === 'home' && (
          <>
            {(driver.balance || 0) < getMinimumCreditForCategory(driver.vehicle?.category || 'smart_standard') && (
              <Card className="p-4 bg-orange-50 border-orange-200">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-orange-900">Solde de crédit insuffisant</p>
                    <p className="text-xs text-orange-700 mt-1">Rechargez votre compte pour vous mettre en ligne.</p>
                    <Button onClick={() => setShowWalletManager(true)} size="sm" className="mt-2 bg-orange-600 hover:bg-orange-700">
                      <Wallet className="w-4 h-4 mr-2" />
                      Recharger maintenant
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            <Card className="p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Mes Soldes</h3>
              <div className="grid grid-cols-1 gap-3">
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-4 rounded-lg border border-blue-200">
                  <p className="text-xs text-blue-600 mb-1">Credit (Ligne)</p>
                  <p className="text-2xl font-bold text-blue-900">{(driver.balance || 0).toLocaleString('fr-FR')} CDF</p>
                  <p className="text-xs text-blue-600 mt-2">-15% par course</p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-violet-50 p-4 rounded-lg border border-purple-200">
                  <p className="text-xs text-purple-600 mb-1">Gains (Informatif)</p>
                  <p className="text-2xl font-bold text-purple-900">{(driver.earningsBalance || 0).toLocaleString('fr-FR')} CDF</p>
                  <p className="text-xs text-purple-600 mt-2">+85% par course</p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
                  <p className="text-xs text-green-600 mb-1">Bonus (Retirable)</p>
                  <p className="text-2xl font-bold text-green-900">{(driver.bonusBalance || 0).toLocaleString('fr-FR')} CDF</p>
                  <p className="text-xs text-green-600 mt-2">Retirable uniquement</p>
                </div>
              </div>
            </Card>

            {isOnline && (
              <Card className="p-4 bg-blue-50 border-blue-200">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <Navigation className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-blue-900 mb-1">Ma position actuelle</h3>
                    <p className="text-sm text-blue-700 font-medium">{currentAddress}</p>
                  </div>
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse flex-shrink-0 mt-1"></div>
                </div>
              </Card>
            )}

            <Button onClick={() => setShowWalletManager(true)} variant="outline" className="w-full" size="lg">
              <Wallet className="w-5 h-5 mr-2" />
              Gérer mon portefeuille
            </Button>

            <Card className="p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Mon véhicule</h3>
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

            <Card className="p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Aujourd'hui</h3>
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
            <h3 className="font-semibold text-gray-900 mb-4">Historique des courses</h3>
            <div className="text-center py-12">
              <Navigation className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">Aucune course pour le moment</p>
            </div>
          </Card>
        )}

        {activeTab === 'earnings' && (
          <>
            <Card className="p-4 bg-gradient-to-br from-green-500 to-emerald-600 text-white">
              <h3 className="font-semibold mb-2">Gains Totaux</h3>
              <p className="text-4xl font-bold mb-1">{(driver.earningsBalance || 0).toLocaleString('fr-FR')} CDF</p>
              <p className="text-sm opacity-90">Argent retirable</p>
            </Card>
            <Card className="p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Statistiques</h3>
              <div className="space-y-4">
                {[
                  { label: 'Cette semaine', icon: <Clock className="w-5 h-5 text-blue-600" />, bg: 'bg-blue-100' },
                  { label: 'Ce mois', icon: <TrendingUp className="w-5 h-5 text-green-600" />, bg: 'bg-green-100' },
                  { label: 'Total', icon: <Star className="w-5 h-5 text-purple-600" />, bg: 'bg-purple-100' }
                ].map((item, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 ${item.bg} rounded-full flex items-center justify-center`}>
                        {item.icon}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{item.label}</p>
                        <p className="text-xs text-gray-500">0 courses</p>
                      </div>
                    </div>
                    <p className="font-bold text-lg">0 CDF</p>
                  </div>
                ))}
              </div>
            </Card>
          </>
        )}

        {activeTab === 'profile' && (
          <>
            <Card className="p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Informations personnelles</h3>
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
              <h3 className="font-semibold text-gray-900 mb-4">Paramètres</h3>
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start" onClick={() => setShowFCMDiagnostic(true)}>
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
          {([
            { tab: 'home', icon: <Home className="w-6 h-6 mb-1" />, label: 'Accueil' },
            { tab: 'rides', icon: <Navigation className="w-6 h-6 mb-1" />, label: 'Courses' },
            { tab: 'earnings', icon: <DollarSign className="w-6 h-6 mb-1" />, label: 'Gains' },
            { tab: 'profile', icon: <User className="w-6 h-6 mb-1" />, label: 'Profil' }
          ] as { tab: TabType; icon: React.ReactNode; label: string }[]).map(item => (
            <button
              key={item.tab}
              onClick={() => setActiveTab(item.tab)}
              className={`flex flex-col items-center py-2 px-3 rounded-lg transition-colors ${
                activeTab === item.tab ? 'bg-primary/10 text-primary' : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {item.icon}
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Modal Portefeuille */}
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
              <button onClick={() => setShowWalletManager(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <DriverWalletManager
                driverId={driver.id}
                creditBalance={driver.balance || 0}
                earningsBalance={driver.earningsBalance || 0}
                bonusBalance={driver.bonusBalance || 0}
                onBalanceUpdate={(c, e, b) => setDriver({ ...driver, balance: c, earningsBalance: e, bonusBalance: b })}
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
              <button onClick={() => setShowFCMDiagnostic(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <FCMDiagnostic driverId={driver.id} driverName={driver.full_name || driver.name} />
            </div>
          </div>
        </div>
      )}

      {/* Notification de course */}
      {pendingRideRequest && (
        <RideNotification
          rideRequest={{
            id: pendingRideRequest.id,
            passengerId: pendingRideRequest.passengerId,
            passengerName: pendingRideRequest.passengerName,
            passengerPhone: pendingRideRequest.passengerPhone,
            pickup: {
              lat: pendingRideRequest.pickup.latitude,
              lng: pendingRideRequest.pickup.longitude,
              address: pendingRideRequest.pickup.address
            },
            destination: {
              lat: pendingRideRequest.dropoff.latitude,
              lng: pendingRideRequest.dropoff.longitude,
              address: pendingRideRequest.dropoff.address
            },
            distance: pendingRideRequest.distance,
            estimatedEarnings: pendingRideRequest.estimatedPrice,
            estimatedDuration: 0,
            vehicleType: pendingRideRequest.vehicleCategory,
            createdAt: new Date().toISOString()
          }}
          onAccept={async (rideId) => {
            console.log('Course acceptée:', rideId);
            setPendingRideRequest(null);
            stopAllNotifications();
          }}
          onDecline={(rideId) => {
            console.log('Course refusée:', rideId);
            setPendingRideRequest(null);
            stopAllNotifications();
          }}
          timeoutSeconds={30}
        />
      )}

      {/* Son de notification */}
      <RideNotificationSound
        shouldPlay={!!pendingRideRequest}
        rideDetails={pendingRideRequest ? {
          passengerName: pendingRideRequest.passengerName,
          pickup: pendingRideRequest.pickup?.address,
          destination: pendingRideRequest.dropoff?.address,
          distance: pendingRideRequest.distance,
          estimatedEarnings: pendingRideRequest.estimatedPrice
        } : undefined}
      />
    </div>
  );
}

export default DriverDashboardNew;