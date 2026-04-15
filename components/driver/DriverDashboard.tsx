import { useState, useEffect, useMemo, useRef } from 'react';
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
import { 
  notifyRideConfirmed,
  notifyDriverEnroute,
  notifyDriverArrived,
  notifyRideStarted,
  notifyRideCompleted,
  notifyPaymentReceived,
  notifyRideCancelled
} from '../../lib/sms-service';
import { RideNotificationSound } from './RideNotificationSound';
import { RideNotification } from './RideNotification';
import { registerDriverFCMToken } from '../../lib/driver-fcm';
import { FCMDiagnostic } from './FCMDiagnostic';

// Nouveaux imports pour les écrans
import { DriverRidesHistory } from './DriverRidesHistory';
import { DriverEarningsScreen } from './DriverEarningsScreen';
import { DriverProfileSettings } from './DriverProfileSettings';

// ✅ Helper inliné pour éviter les problèmes de build Rollup
function isDriverFCMTokenRegistered(driverId: string): boolean {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return false;
  }
  const registered = localStorage.getItem(`fcm_registered_${driverId}`);
  const token = localStorage.getItem(`fcm_token_${driverId}`);
  return registered === 'true' && !!token;
}

// Icônes SVG inline
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

const Check = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
);

const X = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
);

const AlertCircle = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
);

const Wallet = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
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

export function DriverDashboard() {
  const { state, setCurrentDriver, setCurrentScreen } = useAppState();
  const [isOnline, setIsOnline] = useState(false);
  const [driver, setDriver] = useState<Driver | null>(null);
  const [pendingRideRequest, setPendingRideRequest] = useState<RideRequest | null>(null);
  const [showWalletManager, setShowWalletManager] = useState(false);
  const [showFCMDiagnostic, setShowFCMDiagnostic] = useState(false);

  // Charger les données du conducteur
  useEffect(() => {
    const loadDriver = async () => {
      if (!state.currentDriver?.id) return;
      
      try {
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
            setDriver(data.driver);
            setIsOnline(data.driver.status === 'online');
          }
        }
      } catch (error) {
        console.error('Erreur chargement conducteur:', error);
      }
    };

    loadDriver();
  }, [state.currentDriver?.id]);

  // 🔔 Initialiser FCM pour recevoir les notifications push
  useEffect(() => {
    if (!driver?.id) return;

    // Vérifier si déjà enregistré pour éviter les doublons
    // 🔔 Initialiser FCM - toujours re-enregistrer sur le serveur
useEffect(() => {
  if (!driver?.id) return;

  console.log('🔔 Enregistrement FCM au démarrage pour:', driver.id);
  registerDriverFCMToken(driver.id).then(success => {
    if (success) {
      console.log('✅ Token FCM enregistré avec succès');
    } else {
      console.warn('⚠️ Échec enregistrement FCM (non bloquant)');
    }
  }).catch(error => {
    console.warn('⚠️ Erreur FCM (non bloquant):', error);
  });
}, [driver?.id]);

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
      let currentLocation = null;
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
          
          currentLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          
          console.log('✅ Position GPS obtenue:', currentLocation);
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
            location: currentLocation // 🔥 Envoyer la position GPS si EN LIGNE
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
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              isOnline
                ? 'bg-green-500 text-white'
                : 'bg-white/20 text-white hover:bg-white/30'
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

      {/* Contenu principal */}
      <div className="p-4 space-y-4">
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

        {/* Boutons d'actions */}
        <div className="space-y-2">
          <Button
            onClick={() => setShowFCMDiagnostic(true)}
            variant="outline"
            className="w-full"
          >
            <Settings className="w-5 h-5 mr-2" />
            Diagnostic FCM
          </Button>
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
      <RideNotificationSound />
    </div>
  );
}

export default DriverDashboard;
