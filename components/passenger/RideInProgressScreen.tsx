import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from '../../lib/motion';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { useAppState } from '../../hooks/useAppState';
import { useTranslation } from '../../hooks/useTranslation';
import { convertUSDtoCDF, convertCDFtoUSD, getExchangeRate } from '../../lib/pricing';

// ─── Icônes SVG inline ────────────────────────────────────────
const MapPin = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);
const Clock = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const DollarSign = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const User = ({ className = "w-10 h-10" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);
const Phone = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
  </svg>
);
const Share2 = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
  </svg>
);
const X = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);
const Zap = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);
const Timer = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

import { PRICING_CONFIG } from '../../lib/pricing-data';
import { RatingDialog } from './RatingDialog';
import { MapView } from '../MapView';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { toast } from '../../lib/toast';

declare global {
  interface Window { L: any; }
}

const FREE_WAITING_TIME = 10 * 60; // 10 minutes en secondes

function getTimeOfDay(): 'jour' | 'nuit' {
  const hour = new Date().getHours();
  return (hour >= 6 && hour <= 20) ? 'jour' : 'nuit';
}

export function RideInProgressScreen() {
  const { state, setCurrentScreen, updateRide } = useAppState();
  const { t } = useTranslation();
  const currentRide = state.currentRide;

  const [elapsedTime, setElapsedTime] = useState(0);
  const [currentCost, setCurrentCost] = useState(0);
  const [currentCostUSD, setCurrentCostUSD] = useState(0);
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [rideCompleted, setRideCompleted] = useState(false);
  const [timeOfDay, setTimeOfDay] = useState<'jour' | 'nuit'>(getTimeOfDay());

  // États pour le compteur de facturation synchronisé
  const [billingActive, setBillingActive] = useState(false);
  const [billingElapsedTime, setBillingElapsedTime] = useState(0);
  const [showBillingNotification, setShowBillingNotification] = useState(false);

  // État pour tracker les notifications envoyées
  const [notificationsSent, setNotificationsSent] = useState({
    rideStarted: false,
    billingStarted: false,
    rideCompleted: false
  });

  // Position simulée du conducteur
  const [driverLocation, setDriverLocation] = useState({
    lat: currentRide?.pickup?.lat || -4.3276,
    lng: currentRide?.pickup?.lng || 15.3136,
  });

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  // ─── POLLING EN TEMPS RÉEL ────────────────────────────────────
  useEffect(() => {
    if (!currentRide?.id) return;

    console.log('🔄 Démarrage du polling pour la course:', currentRide.id);

    const pollRideStatus = async () => {
      try {
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/rides/${currentRide.id}`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (!response.ok) {
          console.error('❌ Erreur polling:', response.status);
          return;
        }

        const json = await response.json();
        const updatedRide = json.ride || json;

        console.log('📥 Mise à jour reçue:', {
          status: updatedRide?.status,
          billingStartTime: updatedRide?.billingStartTime,
          billingElapsedTime: updatedRide?.billingElapsedTime
        });

        if (updatedRide && updatedRide.id) {
          updateRide(updatedRide.id, updatedRide);
        }

        if (updatedRide?.billingElapsedTime !== undefined && updatedRide.billingElapsedTime > 0) {
          setBillingElapsedTime(updatedRide.billingElapsedTime);
          if (!billingActive) setBillingActive(true);
        }

        if (updatedRide?.status === 'completed' && !rideCompleted) {
          console.log('🏁 Course terminée détectée via polling direct');
          setRideCompleted(true);
          if (updatedRide.billingElapsedTime !== undefined) {
            setBillingElapsedTime(updatedRide.billingElapsedTime);
          }
          const finalAmount = updatedRide.finalPrice || updatedRide.actualPrice || updatedRide.estimatedPrice || 0;
          // ✅ TRADUIT
          toast.success(`🏁 ${t('ride_in_progress')} !`, {
            description: `${t('price')}: ${finalAmount.toLocaleString()} ${t('cdf')}`,
            duration: 5000
          });
          setTimeout(() => { setCurrentScreen('payment'); }, 2000);
        }

      } catch (error) {
        console.error('❌ Erreur lors du polling:', error);
      }
    };

    const interval = setInterval(pollRideStatus, 3000);
    pollRideStatus();
    return () => {
      console.log('🛑 Arrêt du polling');
      clearInterval(interval);
    };
  }, [currentRide?.id]);

  // ─── Mise à jour heure du jour ────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeOfDay(getTimeOfDay());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // ─── SYNCHRONISATION COMPTEUR DE FACTURATION ─────────────────
  useEffect(() => {
    if (!currentRide || currentRide.status !== 'in_progress' || rideCompleted) return;

    if (currentRide.billingStartTime && !billingActive) {
      console.log('💰 Facturation activée par le conducteur !');
      setBillingActive(true);
      setShowBillingNotification(true);
      // ✅ TRADUIT
      toast.warning(`⚡ ${t('billing_started')} !`, {
        description: t('waiting_time'),
        duration: 7000
      });
      setTimeout(() => { setShowBillingNotification(false); }, 5000);
    }

    if (currentRide.billingStartTime && billingActive) {
      const startTime = currentRide.billingStartTime;
      const interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setBillingElapsedTime(elapsed);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [currentRide?.billingStartTime, currentRide?.billingElapsedTime, currentRide?.status, billingActive, rideCompleted]);

  // ─── DÉTECTION CLÔTURE DE COURSE ─────────────────────────────
  useEffect(() => {
    if (!currentRide) return;

    if (currentRide.status === 'completed' && !rideCompleted) {
      console.log('🏁 Course clôturée par le conducteur !');
      setRideCompleted(true);

      if (currentRide.billingElapsedTime !== undefined) {
        setBillingElapsedTime(currentRide.billingElapsedTime);
      }

      const finalBillingTime = currentRide.billingElapsedTime !== undefined
        ? currentRide.billingElapsedTime
        : billingElapsedTime;

      const minutes = Math.floor(finalBillingTime / 60);
      const seconds = finalBillingTime % 60;
      const timeStr = minutes > 0 ? `${minutes}min ${seconds}s` : `${seconds}s`;
      const finalAmount = currentRide.finalPrice || currentRide.estimatedPrice || 0;

      // ✅ TRADUIT
      toast.success(`🏁 ${t('ride_in_progress')} !`, {
        description: `${t('waiting_time')}: ${timeStr}. ${t('price')}: ${finalAmount.toLocaleString()} ${t('cdf')}`,
        duration: 8000
      });

      setTimeout(() => {
        console.log('🔄 Redirection vers écran de paiement...');
        setCurrentScreen('payment');
      }, 2000);
    }
  }, [currentRide?.status, currentRide?.billingElapsedTime, rideCompleted, setCurrentScreen]);

  // ─── CHRONOMÈTRE GÉNÉRAL ─────────────────────────────────────
  useEffect(() => {
    if (!currentRide || currentRide.status !== 'in_progress' || rideCompleted) return;

    if (!notificationsSent.rideStarted) {
      // ✅ TRADUIT
      toast.success(`${t('ride_in_progress')} !`, {
        description: t('billing_started'),
        duration: 5000
      });
      setNotificationsSent(prev => ({ ...prev, rideStarted: true }));
    }

    const startTime = currentRide.startedAt
      ? new Date(currentRide.startedAt).getTime()
      : Date.now();

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.floor((now - startTime) / 1000);
      setElapsedTime(elapsed);

      const { costCDF, costUSD } = calculateRealTimeCost(elapsed);
      setCurrentCost(costCDF);
      setCurrentCostUSD(costUSD);

      if (elapsed >= FREE_WAITING_TIME && !notificationsSent.billingStarted && !billingActive) {
        // ✅ TRADUIT
        toast.warning(t('billing_started'), {
          description: t('waiting_time'),
          duration: 6000
        });
        setNotificationsSent(prev => ({ ...prev, billingStarted: true }));
        setBillingActive(true);

        fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/rides/activate-billing`,
          {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${publicAnonKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ rideId: currentRide.id, waitingTimeFrozen: elapsed })
          }
        ).then(res => {
          if (res.ok) console.log('✅ Compteur de facturation activé automatiquement');
        }).catch(err => console.error('❌ Erreur activation chrono auto:', err));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [currentRide, timeOfDay, billingActive, rideCompleted]);

  // ─── SIMULATION DÉPLACEMENT CONDUCTEUR ───────────────────────
  useEffect(() => {
    if (!currentRide || !currentRide.destination?.lat || !currentRide.destination?.lng) return;
    const interval = setInterval(() => {
      setDriverLocation(prev => {
        const latDiff = currentRide.destination.lat - prev.lat;
        const lngDiff = currentRide.destination.lng - prev.lng;
        const speed = 0.0001;
        return {
          lat: prev.lat + latDiff * speed,
          lng: prev.lng + lngDiff * speed,
        };
      });
    }, 2000);
    return () => clearInterval(interval);
  }, [currentRide?.destination?.lat, currentRide?.destination?.lng]);

  // ─── CALCUL FACTURATION PAR PALIER D'HEURE ───────────────────
  const calculateBillingCostByHourlySlot = (billingSeconds: number): { costCDF: number; costUSD: number } => {
    if (billingSeconds <= 0) return { costCDF: 0, costUSD: 0 };

    const category = currentRide?.vehicleCategory || 'smart_standard';
    const categoryConfig = PRICING_CONFIG[category as keyof typeof PRICING_CONFIG];
    const baseHourlyRateUSD = categoryConfig?.pricing?.course_heure?.[timeOfDay]?.usd || 7;
    const baseHourlyRateCDF = categoryConfig?.pricing?.course_heure?.[timeOfDay]?.cdf || 20000;

    const totalMinutes = Math.floor(billingSeconds / 60);
    const currentHourSlot = Math.floor(totalMinutes / 60);
    const additionalHours = Math.max(0, currentHourSlot);
    const costUSD = (baseHourlyRateUSD || 7) * additionalHours;
    const costCDF = (baseHourlyRateCDF || 20000) * additionalHours;

    return {
      costCDF: Math.round(costCDF) || 0,
      costUSD: parseFloat((costUSD || 0).toFixed(2))
    };
  };

  const calculateRealTimeCost = (totalSeconds: number): { costCDF: number; costUSD: number } => {
    if (!currentRide) return { costCDF: 0, costUSD: 0 };
    if (currentRide.billingStartTime && billingActive) {
      return calculateBillingCostByHourlySlot(billingElapsedTime);
    }
    return { costCDF: 0, costUSD: 0 };
  };

  // ─── ÉCRANS D'ERREUR ─────────────────────────────────────────
  if (!currentRide) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-6">
          {/* ✅ TRADUIT */}
          <p>{t('error')}</p>
        </Card>
      </div>
    );
  }

  if (!currentRide.pickup || !currentRide.destination) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-6">
          {/* ✅ TRADUIT */}
          <p>{t('error')}</p>
        </Card>
      </div>
    );
  }

  // ─── FORMATAGE TEMPS ─────────────────────────────────────────
  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) return `${hrs}h ${mins}min ${secs}s`;
    return `${mins}min ${secs}s`;
  };

  const category = currentRide.vehicleCategory || 'smart_standard';
  const categoryConfig = PRICING_CONFIG[category as keyof typeof PRICING_CONFIG];
  const hourlyRateUSD = categoryConfig?.pricing?.course_heure?.[timeOfDay]?.usd || 7;

  // ─── PARTAGE COURSE ──────────────────────────────────────────
  const handleShareRide = async () => {
    // ✅ TRADUIT
    const shareText = `🚗 ${t('ride_in_progress')} SmartCabb\n📍 ${t('pickup_location')}: ${currentRide.pickup.address}\n🎯 ${t('destination')}: ${currentRide.destination.address}\n💰 ${t('price')}: ${currentRide.estimatedPrice?.toLocaleString()} ${t('cdf')}\n⏱️ ${t('waiting_time')}: ${formatTime(elapsedTime)}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(whatsappUrl, '_blank');
    toast.success('🚀 WhatsApp ouvert !');
  };

  // ─── ANNULATION COURSE ───────────────────────────────────────
  const handleCancelRide = async () => {
    if (!currentRide?.id) return;

    // ✅ TRADUIT
    const confirmed = window.confirm(
      `⚠️ ${t('cancel')} ?\n\n${t('billing_started')}`
    );
    if (!confirmed) return;

    try {
      console.log('🚫 Annulation de la course:', currentRide.id);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/rides/cancel`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${publicAnonKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rideId: currentRide.id,
            passengerId: state.currentUser?.id,
            cancelledBy: 'passenger',
            reason: 'Annulation par le passager pendant la course'
          })
        }
      );

      const data = await response.json();
      if (!data.success) {
        // ✅ TRADUIT
        toast.error(data.error || t('error'));
        return;
      }

      if (updateRide) {
        updateRide(currentRide.id, {
          status: 'cancelled',
          cancelledBy: 'passenger',
          cancelledAt: new Date().toISOString()
        });
      }

      // ✅ TRADUIT
      toast.success(t('cancel'));
      setTimeout(() => { setCurrentScreen('map'); }, 1500);

    } catch (error) {
      console.error('❌ Erreur annulation:', error);
      // ✅ TRADUIT
      toast.error(t('error'));
    }
  };

  // Driver simulé pour la carte
  const simulatedDriver = currentRide ? {
    id: currentRide.driverId || 'driver-1',
    name: currentRide.driverName || 'Chauffeur',
    location: driverLocation,
    isOnline: true,
    isAvailable: false,
    documentsVerified: true,
    vehicleType: currentRide.vehicleCategory || 'standard',
    vehiclePlate: currentRide.vehiclePlate || 'CD-XXX-XXX',
    rating: 4.8,
    totalRides: 0,
    phoneNumber: '',
    currentRideId: currentRide.id
  } : null;

  return (
    <div className="h-screen w-full flex flex-col bg-gray-900 relative overflow-hidden">

      {/* 🗺️ CARTE EN PLEIN ÉCRAN */}
      <div className="absolute inset-0 z-0">
        <MapView
          center={driverLocation}
          drivers={simulatedDriver ? [simulatedDriver] : []}
          zoom={14}
          className="w-full h-full"
          showUserLocation={false}
          enableGeolocation={false}
          showRoute={!!(currentRide.destination?.lat && currentRide.destination?.lng)}
          routeStart={driverLocation}
          routeEnd={currentRide.destination?.lat && currentRide.destination?.lng ? {
            lat: currentRide.destination.lat,
            lng: currentRide.destination.lng,
            address: currentRide.destination.address
          } : undefined}
          enableZoomControls={true}
          disableAutoCenter={true}
        />
      </div>

      {/* 📱 HEADER TRANSPARENT — ✅ TRADUIT */}
      <div className="absolute top-0 left-0 right-0 z-30">
        <div className="bg-gradient-to-b from-black/60 to-transparent backdrop-blur-sm">
          <div className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                {/* ✅ TRADUIT : "Course en cours" */}
                <h1 className="text-lg font-bold text-white drop-shadow-lg">{t('ride_in_progress')}</h1>
                {/* ✅ TRADUIT : "Trajet vers votre destination" */}
                <p className="text-xs text-white/90 drop-shadow-md">{t('driver_on_way')}</p>
              </div>
              <div className="flex items-center space-x-2">
                {/* Bouton annulation */}
                <button
                  onClick={handleCancelRide}
                  className="p-2.5 bg-red-500/90 backdrop-blur-md rounded-full shadow-xl hover:bg-red-600 transition-all active:scale-95"
                  title={t('cancel')}
                >
                  <X className="w-4 h-4 text-white" />
                </button>

                {/* Bouton partage */}
                <button
                  onClick={handleShareRide}
                  className="p-2.5 bg-white/90 backdrop-blur-md rounded-full shadow-xl hover:bg-white transition-all active:scale-95"
                >
                  <Share2 className="w-4 h-4 text-primary" />
                </button>

                {/* Bouton appel WhatsApp */}
                <button
                  onClick={() => {
                    if (currentRide.driverPhone) {
                      const phoneNumber = currentRide.driverPhone.replace(/[^0-9]/g, '');
                      const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent('Bonjour, je suis votre passager SmartCabb 🚗')}`;
                      window.open(whatsappUrl, '_blank');
                    } else {
                      // ✅ TRADUIT
                      toast.info(t('error'));
                    }
                  }}
                  className="p-2.5 bg-green-500/90 backdrop-blur-md rounded-full shadow-xl hover:bg-green-600 transition-all active:scale-95"
                  title={t('contact_driver')}
                >
                  <Phone className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 🔔 NOTIFICATION FACTURATION ACTIVÉE — ✅ TRADUIT */}
      <AnimatePresence>
        {showBillingNotification && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="absolute top-24 left-4 right-4 z-50"
          >
            <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-4 rounded-2xl shadow-2xl backdrop-blur-xl">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center animate-pulse">
                  <Zap className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  {/* ✅ TRADUIT : "Facturation activée !" */}
                  <h3 className="font-bold text-lg">⚡ {t('billing_started')} !</h3>
                  {/* ✅ TRADUIT */}
                  <p className="text-sm text-white/90">{t('waiting_time')}</p>
                </div>
                <button
                  onClick={() => setShowBillingNotification(false)}
                  className="p-1 hover:bg-white/20 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 💰 COMPTEUR DE COURSE EN BAS — ✅ TRADUIT */}
      <div className="absolute bottom-0 left-0 right-0 z-40">
        <div className="bg-gradient-to-t from-black/80 to-transparent backdrop-blur-xl">
          <div className="p-4 space-y-3">

            {/* Zone facturation active */}
            {billingActive && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-3"
              >
                {/* Temps d'attente gelé (gratuit) */}
                {currentRide.waitingTimeFrozen !== undefined && currentRide.waitingTimeFrozen > 0 && (
                  <div className="bg-gradient-to-r from-gray-600 to-gray-700 rounded-2xl p-4 shadow-2xl">
                    <div className="flex items-center justify-between text-white">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                          <Clock className="w-5 h-5" />
                        </div>
                        <div>
                          {/* ✅ TRADUIT : "Temps d'attente (gratuit)" */}
                          <p className="text-xs text-white/80">{t('waiting_time')}</p>
                          <p className="text-2xl font-bold font-mono">{formatTime(currentRide.waitingTimeFrozen)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        {/* ✅ TRADUIT */}
                        <p className="text-xs text-white/80">{t('price')}</p>
                        <p className="text-xl font-bold">+0 {t('cdf')}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Facturation réelle */}
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-4 shadow-2xl">
                  <div className="flex items-center justify-between text-white">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center animate-pulse">
                        <Timer className="w-5 h-5" />
                      </div>
                      <div>
                        {/* ✅ TRADUIT : "Facturation active" */}
                        <p className="text-xs text-white/80">{t('billing_started')}</p>
                        <p className="text-2xl font-bold font-mono">{formatTime(billingElapsedTime)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      {/* ✅ TRADUIT */}
                      <p className="text-xs text-white/80">{t('price')}</p>
                      <p className="text-xl font-bold">
                        {((currentRide.estimatedPrice || 0) + calculateBillingCostByHourlySlot(billingElapsedTime).costCDF).toLocaleString()} {t('cdf')}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Panneau principal (avant facturation) */}
            {!billingActive && (
              <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden">
                {/* Temps et coût */}
                <div className="p-4 bg-gradient-to-br from-primary to-blue-600 text-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                        <Clock className="w-6 h-6" />
                      </div>
                      <div>
                        {/* ✅ TRADUIT : "Temps écoulé" */}
                        <p className="text-xs text-white/80">{t('waiting_time')}</p>
                        <p className="text-2xl font-bold font-mono">{formatTime(elapsedTime)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      {/* ✅ TRADUIT */}
                      <p className="text-xs text-white/80">{t('price')}</p>
                      <p className="text-3xl font-bold">
                        {(currentRide.estimatedPrice + currentCost).toLocaleString()} {t('cdf')}
                      </p>
                      <p className="text-xs text-white/70">
                        ≈ {(((currentRide.estimatedPrice || 0) + (currentCost || 0)) / (getExchangeRate() || 2850)).toFixed(2)} USD
                      </p>
                    </div>
                  </div>

                  {/* Barre de progression 10 min gratuites */}
                  {elapsedTime < FREE_WAITING_TIME && (
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-white/80 mb-1">
                        {/* ✅ TRADUIT */}
                        <span>{t('waiting_time')}</span>
                        <span>{Math.floor((FREE_WAITING_TIME - elapsedTime) / 60)} {t('min')} restantes</span>
                      </div>
                      <div className="w-full bg-white/20 rounded-full h-2">
                        <div
                          className="h-2 bg-green-400 rounded-full transition-all duration-1000"
                          style={{ width: `${Math.min((elapsedTime / FREE_WAITING_TIME) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Détails trajet */}
                <div className="p-4 space-y-3">
                  {/* Départ */}
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <MapPin className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      {/* ✅ TRADUIT : "Départ" */}
                      <p className="text-xs text-gray-500">{t('pickup_location')}</p>
                      <p className="font-medium text-gray-900 truncate">{currentRide.pickup.address}</p>
                    </div>
                  </div>

                  {/* Séparateur */}
                  <div className="flex items-center space-x-3">
                    <div className="w-8 flex justify-center">
                      <div className="w-0.5 h-6 bg-gradient-to-b from-green-300 to-red-300" />
                    </div>
                  </div>

                  {/* Destination */}
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <MapPin className="w-4 h-4 text-red-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      {/* ✅ TRADUIT : "Destination" */}
                      <p className="text-xs text-gray-500">{t('destination')}</p>
                      <p className="font-medium text-gray-900 truncate">{currentRide.destination.address}</p>
                    </div>
                  </div>

                  {/* Conducteur */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        {/* ✅ TRADUIT : "Conducteur" */}
                        <p className="text-xs text-gray-500">{t('drivers')}</p>
                        <p className="font-semibold text-gray-900">{currentRide.driverName || 'Chauffeur'}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="px-3 py-1 bg-blue-100 rounded-full">
                        <p className="text-xs font-medium text-blue-700 capitalize">
                          {currentRide.vehicleCategory || 'Standard'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dialog d'évaluation */}
      {showRatingDialog && (
        <RatingDialog
          onClose={() => {
            setShowRatingDialog(false);
            setCurrentScreen('home');
          }}
        />
      )}
    </div>
  );
}
