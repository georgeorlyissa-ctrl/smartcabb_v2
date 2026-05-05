import { useEffect, useState, useRef } from 'react';
import { useAppState } from '../../hooks/useAppState';
import { useTranslation } from '../../hooks/useTranslation';
import { motion } from '../../lib/motion';
import { toast } from '../../lib/toast';
import { ArrowLeft, Star, Car, MapPin, Clock, MessageCircle, Phone } from '../../lib/icons';
import { Button } from '../ui/button';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

interface DriverData {
  full_name: string;
  rating: number;
  total_rides: number;
  phone: string;
  photo_url?: string;
  vehicle?: {
    make?: string;
    model?: string;
    color?: string;
    license_plate?: string;
  };
}

export function DriverFoundScreen() {
  const { state, setCurrentScreen, updateRide } = useAppState();
  const { t } = useTranslation();

  const [driverData, setDriverData] = useState<DriverData>({
    full_name: '',
    rating: 4.8,
    total_rides: 0,
    phone: ''
  });
  const [isLoadingDriverData, setIsLoadingDriverData] = useState(true);
  const [arrivalTime, setArrivalTime] = useState(5);
  const [rideStatus, setRideStatus] = useState<string>('accepted');
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasNavigatedRef = useRef(false);

  // ─── Charger les données du chauffeur ───────────────────────
  useEffect(() => {
    if (!state.currentRide) {
      setCurrentScreen('map');
      return;
    }

    const loadDriverData = async () => {
      try {
        if (!state.currentRide.driverId) return;

        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/drivers/${state.currentRide.driverId}`,
          { headers: { Authorization: `Bearer ${publicAnonKey}` } }
        );

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.driver) {
            setDriverData({
              full_name: data.driver.name || data.driver.full_name || '',
              phone: data.driver.phone || '',
              rating: data.driver.rating || 4.8,
              total_rides: data.driver.total_rides || 0,
              photo_url: data.driver.photo || data.driver.photo_url,
              vehicle: data.driver.vehicleInfo || data.driver.vehicle_info
            });
          } else if (data.rating !== undefined) {
            setDriverData(prev => ({
              ...prev,
              full_name: data.name || data.full_name || prev.full_name,
              phone: data.phone || prev.phone,
              rating: data.rating ?? prev.rating,
              total_rides: data.total_rides ?? prev.total_rides,
              photo_url: data.photo || data.photo_url || prev.photo_url,
              vehicle: data.vehicleInfo || data.vehicle_info || data.vehicle || prev.vehicle
            }));
          }
        }
      } catch (error) {
        console.error('Erreur chargement données chauffeur:', error);
      } finally {
        setIsLoadingDriverData(false);
      }
    };

    loadDriverData();
  }, [state.currentRide?.driverId]);

  // ─── Polling du statut de la course ─────────────────────────
  useEffect(() => {
    if (!state.currentRide?.id || hasNavigatedRef.current) return;

    const checkStatus = async () => {
      if (hasNavigatedRef.current) return;
      try {
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/rides/status/${state.currentRide!.id}`,
          { headers: { Authorization: `Bearer ${publicAnonKey}` } }
        );
        if (!response.ok) return;

        const data = await response.json();
        const ride = data.ride || data;
        const status = ride?.status;

        console.log('🔍 [DriverFoundScreen] Statut course:', status);
        setRideStatus(status || 'accepted');

        if (hasNavigatedRef.current) return;

        if (status === 'in_progress') {
          hasNavigatedRef.current = true;
          if (pollingRef.current) clearInterval(pollingRef.current);
          if (updateRide && state.currentRide?.id) {
            updateRide(state.currentRide.id, {
              status: 'in_progress',
              startedAt: ride.startedAt || new Date().toISOString()
            });
          }
          // ✅ TRADUIT
          toast.success(`🚗 ${t('ride_in_progress')} !`, {
            description: t('driver_on_way'),
            duration: 3000
          });
          setCurrentScreen('ride-in-progress');
          return;
        }

        if (status === 'completed' || status === 'rated') {
          hasNavigatedRef.current = true;
          if (pollingRef.current) clearInterval(pollingRef.current);
          setCurrentScreen('payment');
          return;
        }

        if (status === 'cancelled') {
          hasNavigatedRef.current = true;
          if (pollingRef.current) clearInterval(pollingRef.current);
          // ✅ TRADUIT
          toast.error(t('cancel'), {
            description: t('error'),
            duration: 4000
          });
          setCurrentScreen('map');
          return;
        }
      } catch (err) {
        console.debug('Polling driver-found:', err);
      }
    };

    // Vérification immédiate, puis toutes les 3 secondes
    checkStatus();
    pollingRef.current = setInterval(checkStatus, 3000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [state.currentRide?.id]);

  // ─── Compte à rebours de l'arrivée ──────────────────────────
  useEffect(() => {
    const timer = setInterval(() => {
      setArrivalTime(prev => (prev > 1 ? prev - 1 : 1));
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const getVehicleDisplayName = (vehicle: DriverData['vehicle']) => {
    if (!vehicle) return null;
    return `${vehicle.make || ''} ${vehicle.model || ''}`.trim() || null;
  };

  const handlePhoneCall = () => {
    if (driverData.phone) {
      window.location.href = `tel:${driverData.phone}`;
    } else {
      // ✅ TRADUIT
      toast.error(t('error'));
    }
  };

  const handleWhatsAppCall = () => {
    if (driverData.phone) {
      const phoneNumber = driverData.phone.replace(/[^0-9]/g, '');
      window.open(`https://wa.me/${phoneNumber}`, '_blank');
    } else {
      // ✅ TRADUIT
      toast.error(t('error'));
    }
  };

  const handleCancelRide = async () => {
    if (!state.currentRide?.id) return;

    // ✅ TRADUIT
    const confirmed = window.confirm(
      t('cancel') + ' ?'
    );
    if (!confirmed) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/rides/cancel`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            rideId: state.currentRide.id,
            passengerId: state.currentUser?.id,
            cancelledBy: 'passenger',
            reason: 'Annulation depuis écran chauffeur trouvé'
          })
        }
      );

      if (pollingRef.current) clearInterval(pollingRef.current);
      hasNavigatedRef.current = true;

      if (response.ok) {
        // ✅ TRADUIT
        toast.success(t('cancel'), {
          description: t('driver_found'),
          duration: 5000
        });
        if (updateRide) {
          updateRide(state.currentRide.id, {
            status: 'cancelled',
            cancelledBy: 'passenger',
            cancelledAt: new Date().toISOString()
          });
        }
      } else {
        // ✅ TRADUIT
        toast.error(t('error'));
      }
    } catch (error) {
      console.error('Erreur annulation course:', error);
      // ✅ TRADUIT
      toast.error(t('error'));
    } finally {
      setCurrentScreen('map');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 flex flex-col">

      {/* ── HEADER — ✅ TRADUIT ── */}
      <div className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-border">
        <div className="flex items-center justify-between p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCancelRide}
            className="w-10 h-10 hover:bg-muted"
          >
            <ArrowLeft className="w-5 h-5 text-primary" />
          </Button>
          {/* ✅ TRADUIT : "Chauffeur trouvé !" */}
          <h1 className="text-primary font-semibold">{t('driver_found')}</h1>
          <div className="w-10" />
        </div>
      </div>

      {/* ── CONTENU PRINCIPAL ── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* 🔒 SÉCURITÉ — Photo du conducteur */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="bg-white rounded-2xl shadow-lg border-2 border-green-200 overflow-hidden"
        >
          {/* Bandeau sécurité */}
          <div className="bg-gradient-to-r from-green-600 to-emerald-500 px-4 py-3 flex items-center gap-2">
            <span className="text-xl">🔒</span>
            <div>
              {/* ✅ TRADUIT */}
              <p className="text-white font-bold text-sm">{t('success')}</p>
              <p className="text-green-100 text-xs">{t('driver_found')}</p>
            </div>
          </div>

          <div className="p-5 flex flex-col items-center">
            {/* Photo conducteur */}
            <div className="relative w-28 h-28 mb-3">
              <div className="w-full h-full rounded-full border-4 border-green-400 overflow-hidden bg-gray-100 shadow-lg">
                {isLoadingDriverData ? (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : driverData.photo_url ? (
                  <img
                    src={driverData.photo_url}
                    alt={driverData.full_name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                      if (fallback) fallback.classList.remove('hidden');
                    }}
                  />
                ) : null}
                {/* Fallback initiales */}
                <div className={`absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-600 text-white font-bold text-3xl ${driverData.photo_url ? 'hidden' : ''}`}>
                  {driverData.full_name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || '?'}
                </div>
              </div>
              {/* Badge vérifié */}
              <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center border-2 border-white shadow">
                <span className="text-white text-xs font-bold">✓</span>
              </div>
            </div>

            <h2 className="text-xl font-bold text-gray-900">{driverData.full_name || '...'}</h2>
            <div className="flex items-center gap-1 mt-1 mb-3">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span className="font-semibold text-sm">{(driverData.rating ?? 4.8).toFixed(1)}</span>
              {/* ✅ TRADUIT : "courses" */}
              <span className="text-gray-400 text-xs">
                ({isLoadingDriverData ? '...' : driverData.total_rides} {t('total_rides')})
              </span>
            </div>

            <div className="w-full bg-green-50 border border-green-200 rounded-xl p-3 text-center">
              {/* ✅ TRADUIT */}
              <p className="text-green-800 font-semibold text-sm">✅ {t('success')}</p>
              <p className="text-green-600 text-xs mt-0.5">Permis ✓ · Assurance ✓ · Dossier vérifié ✓</p>
            </div>
          </div>
        </motion.div>

        {/* ── Statut en route — ✅ TRADUIT ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-center"
        >
          {/* ✅ TRADUIT : "Chauffeur en route !" */}
          <h2 className="text-lg font-bold text-green-600">{t('driver_on_way')} !</h2>
          <p className="text-muted-foreground text-sm">
            {/* ✅ TRADUIT : "Arrivée dans X min" */}
            {t('arrive_in')} <span className="font-semibold text-primary">{arrivalTime} {t('min')}</span>
          </p>
          <div className="flex items-center justify-center gap-2 mt-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-xs text-gray-400">
              {/* ✅ TRADUIT */}
              {rideStatus === 'in_progress'
                ? t('ride_in_progress')
                : `${t('driver_on_way')}…`}
            </span>
          </div>
        </motion.div>

        {/* ── Véhicule — ✅ TRADUIT ── */}
        {driverData.vehicle && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-2xl shadow-lg border border-border overflow-hidden"
          >
            <div className="p-5 border-b border-border">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Car className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  {/* ✅ TRADUIT */}
                  <p className="text-xs text-muted-foreground">{t('choose_vehicle')}</p>
                  <p className="font-semibold">
                    {getVehicleDisplayName(driverData.vehicle) || t('choose_vehicle')}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-lg p-2.5">
                  <p className="text-xs text-muted-foreground mb-0.5">Couleur</p>
                  <p className="font-medium text-sm">{driverData.vehicle.color || '—'}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2.5">
                  <p className="text-xs text-muted-foreground mb-0.5">Plaque</p>
                  <p className="font-mono font-bold text-primary text-sm">
                    {driverData.vehicle.license_plate || 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Détails du trajet — ✅ TRADUIT ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-2xl shadow-lg border border-border p-5 space-y-4"
        >
          {/* ✅ TRADUIT : "Détails du trajet" */}
          <h3 className="font-semibold text-lg">{t('trip_summary')}</h3>

          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-secondary mt-1 flex-shrink-0" />
            <div>
              {/* ✅ TRADUIT : "Point de départ" */}
              <p className="text-sm text-muted-foreground">{t('pickup_location')}</p>
              <p className="font-medium">{state.pickup?.address || `${t('loading')}...`}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-accent mt-1 flex-shrink-0" />
            <div>
              {/* ✅ TRADUIT : "Destination" */}
              <p className="text-sm text-muted-foreground">{t('destination')}</p>
              <p className="font-medium">{state.destination?.address || `${t('loading')}...`}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" />
            <div>
              {/* ✅ TRADUIT : "Durée estimée" */}
              <p className="text-sm text-muted-foreground">{t('ride_duration')}</p>
              <p className="font-medium">
                {state.currentRide?.estimatedDuration || 15} {t('minutes')}
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── BOUTONS D'ACTION — ✅ TRADUIT ── */}
      <div className="bg-white border-t border-border p-4 space-y-3">

        {/* WhatsApp */}
        <Button
          onClick={handleWhatsAppCall}
          className="w-full bg-green-600 hover:bg-green-700 text-white py-6 text-base"
        >
          <MessageCircle className="w-5 h-5 mr-2" />
          {/* ✅ TRADUIT : "Contacter sur WhatsApp" */}
          {t('contact_driver')} (WhatsApp)
        </Button>

        {/* Appel téléphonique */}
        <Button
          onClick={handlePhoneCall}
          variant="outline"
          className="w-full border-2 border-primary text-primary py-6 text-base hover:bg-primary hover:text-white"
        >
          <Phone className="w-5 h-5 mr-2" />
          {/* ✅ TRADUIT : "Appeler le chauffeur" */}
          {t('contact_driver')}
        </Button>

        {/* Note bas de page */}
        <p className="text-xs text-center text-muted-foreground">
          {/* ✅ TRADUIT */}
          {t('billing_started')}
        </p>
      </div>
    </div>
  );
}
