import { useState, useEffect } from 'react';
import { motion } from '../../lib/motion';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { useAppState } from '../../hooks/useAppState';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { stopAllNotifications } from '../../lib/notification-sound';
import { RideTimer } from '../RideTimer';
import { EmergencyAlert } from '../EmergencyAlert';
import { CommissionSettings } from '../CommissionSettings';
import { DriverWalletManager } from './DriverWalletManager';
import { supabase } from '../../lib/supabase';
import { VEHICLE_PRICING, isDayTime, VehicleCategory } from '../../lib/pricing';
import { getMinimumCreditForCategory } from '../../lib/pricing-config';
import { useDriverLocation, isNearPickupLocation, calculateDistance } from '../../lib/gps-utils';
import { reverseGeocodeWithCache } from '../../lib/geocoding';
import { getVehicleDisplayName } from '../../lib/vehicle-helpers';
import { toast } from '../../lib/toast';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { registerDriverFCMToken, listenToFCMMessages } from '../../lib/driver-fcm';
import { 
  notifyRideConfirmed, notifyDriverEnroute, notifyDriverArrived,
  notifyRideStarted, notifyRideCompleted, notifyPaymentReceived, notifyRideCancelled
} from '../../lib/sms-service';
import { RideNotificationSound } from './RideNotificationSound';
import { RideNotification } from './RideNotification';
import { FCMDiagnostic } from './FCMDiagnostic';
import { DriverRidesHistory } from './DriverRidesHistory';
import { DriverEarningsScreen } from './DriverEarningsScreen';
import { DriverProfileSettings } from './DriverProfileSettings';

function isDriverFCMTokenRegistered(driverId: string): boolean {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return false;
  const registered = localStorage.getItem(`fcm_registered_${driverId}`);
  const token = localStorage.getItem(`fcm_token_${driverId}`);
  return registered === 'true' && !!token;
}

const Power = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
);
const MapPin = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
);
const Navigation = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
);
const Clock = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
);
const DollarSign = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
);
const Star = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
);
const User = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
);
const Settings = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
);
const XCircle = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
);
const AlertCircle = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
);
const Wallet = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
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
    make?: string; model?: string; year?: string;
    color?: string; plate?: string; category?: VehicleCategory; seats?: number;
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

export function DriverDashboard() {
  const { state, setCurrentDriver, setCurrentScreen } = useAppState();
  const [isOnline, setIsOnline] = useState(false);
  const [driver, setDriver] = useState<Driver | null>(null);
  const [pendingRideRequest, setPendingRideRequest] = useState<RideRequest | null>(null);
  const [showWalletManager, setShowWalletManager] = useState(false);
  const [showFCMDiagnostic, setShowFCMDiagnostic] = useState(false);
  // 🆕 Animation de mise à jour de la note
  const [ratingUpdated, setRatingUpdated] = useState(false);

  // ─── Helper : récupérer le profil conducteur ─────────────────────────
  const loadDriver = async (driverId: string, silent = false) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/drivers/${driverId}`,
        { headers: { 'Authorization': `Bearer ${publicAnonKey}` } }
      );
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.driver) {
          setDriver(prev => {
            // Détecter si la note a changé → déclencher animation + toast
            if (prev && data.driver.rating && prev.rating !== data.driver.rating) {
              console.log(`⭐ Note mise à jour: ${prev.rating} → ${data.driver.rating}`);
              setRatingUpdated(true);
              setTimeout(() => setRatingUpdated(false), 3000);
              toast.success(
                `⭐ Nouvelle note : ${Number(data.driver.rating).toFixed(1)} / 5`,
                { description: 'Un passager vient de vous noter', duration: 5000 }
              );
              window.dispatchEvent(new CustomEvent('smartcab-driver-rating-updated', {
                detail: { newRating: data.driver.rating, driverId }
              }));
            }
            return data.driver;
          });
          if (!silent) setIsOnline(data.driver.status === 'online');
        }
      }
    } catch (error) {
      console.error('Erreur chargement conducteur:', error);
    }
  };

  // 1. Charger profil conducteur au montage
  useEffect(() => {
    if (!state.currentDriver?.id) return;
    loadDriver(state.currentDriver.id);
  }, [state.currentDriver?.id]);

  // 🆕 Polling toutes les 30s pour détecter les mises à jour de la note (après notation passager)
  useEffect(() => {
    if (!state.currentDriver?.id) return;
    const driverId = state.currentDriver.id;

    const pollRating = setInterval(() => {
      loadDriver(driverId, true); // silent=true → pas de maj du statut online
    }, 30_000);

    // Écoute aussi l'event custom émis par la page de notation passager (même device)
    const handleRatingEvent = () => {
      console.log('⭐ Event rating reçu → rafraîchissement immédiat');
      loadDriver(driverId, true);
    };
    window.addEventListener('smartcab-rating-submitted', handleRatingEvent);

    return () => {
      clearInterval(pollRating);
      window.removeEventListener('smartcab-rating-submitted', handleRatingEvent);
    };
  }, [state.currentDriver?.id]);

  // 2. Vérifier URL params (app ouverte depuis notification)
  useEffect(() => {
    if (!driver?.id) return;
    const params = new URLSearchParams(window.location.search);
    const rideId = params.get('rideId');
    const action = params.get('action');
    if (rideId && action === 'new_ride') {
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

  // 3. FCM + SW + polling unifié
  useEffect(() => {
    if (!driver?.id) return;

    // Messages Service Worker (app en arrière-plan)
    const handleSWMessage = (event: MessageEvent) => {
      const { type, detail } = event.data || {};
      console.log('📬 Message SW reçu:', type);
      if (type === 'NEW_RIDE_REQUEST' && detail?.rideId) {
        setPendingRideRequest(buildRideRequest(detail));
      }
      if (type === 'DECLINE_RIDE') {
        setPendingRideRequest(null);
        stopAllNotifications();
      }
    };
    navigator.serviceWorker?.addEventListener('message', handleSWMessage);

    // FCM foreground
    const handleFCMRide = (event: any) => {
      console.log('🔔 FCM nouvelle course:', event.detail);
      setPendingRideRequest(buildRideRequest(event.detail));
    };
    window.addEventListener('fcm-new-ride-request', handleFCMRide);

    // Course dismissée (prise ou annulée)
    const handleRideDismissed = () => {
      setPendingRideRequest(null);
      stopAllNotifications();
    };
    window.addEventListener('fcm-ride-dismissed', handleRideDismissed);

    // Init FCM
    registerDriverFCMToken(driver.id).then(success => {
      if (success) console.log('✅ FCM configuré pour driver', driver.id);
      else console.warn('⚠️ Échec enregistrement FCM');
    }).catch(e => console.error('❌ Erreur FCM:', e));

    // Polling de secours
    const poll = setInterval(async () => {
      if (!driver?.id || pendingRideRequest) return;
      try {
        const res = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/rides/pending/${driver.id}`,
          { headers: { 'Authorization': `Bearer ${publicAnonKey}` } }
        );
        const data = await res.json();
        if (data.success && data.ride) {
          console.log('🔔 [POLLING] Nouvelle course détectée:', data.ride.rideId || data.ride.id);
          setPendingRideRequest(buildRideRequest(data.ride));
        }
      } catch (e) {}
    }, 5000); // ✅ 5s pour être réactif quand FCM est absent

    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleSWMessage);
      window.removeEventListener('fcm-new-ride-request', handleFCMRide);
      window.removeEventListener('fcm-ride-dismissed', handleRideDismissed);
      clearInterval(poll);
    };
  }, [driver?.id]);

  // ✅ 4. Watcher: quand une notif est visible, vérifier toutes les 3s si la course est encore disponible
  useEffect(() => {
    if (!pendingRideRequest?.id) return;

    const rideId = pendingRideRequest.id;
    console.log(`👁️ Watcher actif pour course ${rideId}`);

    const checkRideTaken = setInterval(async () => {
      try {
        const res = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/rides/${rideId}`,
          { headers: { 'Authorization': `Bearer ${publicAnonKey}` } }
        );
        const data = await res.json();
        if (data.success && data.ride) {
          const status = data.ride.status;
          // Si la course n'est plus en recherche → la dismisser
          if (status && status !== 'searching' && status !== 'pending') {
            console.log(`🚫 [WATCHER] Course ${rideId} prise/annulée (status: ${status}) → dismissing`);
            setPendingRideRequest(null);
            stopAllNotifications();
            if (status === 'accepted') {
              toast.info('Cette course a été acceptée par un autre chauffeur.');
            }
          }
        }
      } catch (e) {}
    }, 3000);

    return () => clearInterval(checkRideTaken);
  }, [pendingRideRequest?.id]);

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
      let currentLocation = null;
      if (newStatus === 'online') {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true, timeout: 10000, maximumAge: 0
            });
          });
          currentLocation = { lat: position.coords.latitude, lng: position.coords.longitude };
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
          body: JSON.stringify({ status: newStatus, location: currentLocation })
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
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              isOnline ? 'bg-green-500 text-white' : 'bg-white/20 text-white hover:bg-white/30'
            }`}
          >
            <Power className="w-4 h-4 inline mr-1" />
            {isOnline ? 'EN LIGNE' : 'HORS LIGNE'}
          </button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {/* ⭐ Note — animation si mise à jour */}
          <motion.div
            animate={ratingUpdated ? { scale: [1, 1.15, 1], backgroundColor: ['rgba(255,255,255,0.1)', 'rgba(251,191,36,0.3)', 'rgba(255,255,255,0.1)'] } : {}}
            transition={{ duration: 0.6, ease: 'easeInOut' }}
            className="bg-white/10 backdrop-blur rounded-lg p-3"
          >
            <div className="flex items-center gap-2 mb-1">
              <Star className={`w-4 h-4 ${ratingUpdated ? 'text-yellow-400' : 'text-yellow-300'}`} />
              <span className="text-xs opacity-80">Note</span>
              {ratingUpdated && (
                <motion.span
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-[9px] bg-yellow-400 text-yellow-900 rounded-full px-1 font-bold"
                >
                  MÀJ
                </motion.span>
              )}
            </div>
            <p className={`text-xl font-bold ${ratingUpdated ? 'text-yellow-300' : ''}`}>
              {driver.rating?.toFixed(1) || '5.0'}
            </p>
          </motion.div>
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

      <div className="p-4 space-y-4">
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

        <Button onClick={() => setShowWalletManager(true)} variant="outline" className="w-full" size="lg">
          <Wallet className="w-5 h-5 mr-2" />
          Gérer mon portefeuille
        </Button>

        <Card className="p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Mon véhicule</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Marque / Modèle</span>
              <span className="font-medium">{driver.vehicle?.make || 'N/A'} {driver.vehicle?.model || ''}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Plaque</span>
              <span className="font-medium font-mono">{driver.vehicle?.plate || 'N/A'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Catégorie</span>
              <Badge className="bg-purple-100 text-purple-700">
                {getVehicleDisplayName(driver.vehicle?.category || 'smart_standard')}
              </Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Couleur</span>
              <span className="font-medium">{driver.vehicle?.color || 'N/A'}</span>
            </div>
          </div>
        </Card>

        <div className="space-y-2">
          <Button onClick={() => setShowFCMDiagnostic(true)} variant="outline" className="w-full">
            <Settings className="w-5 h-5 mr-2" />
            Diagnostic FCM
          </Button>
        </div>
      </div>

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
          timeoutSeconds={15}
        />
      )}

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

export default DriverDashboard;
