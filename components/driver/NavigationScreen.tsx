import { useState, useEffect, useCallback } from 'react';
import { useAppState } from '../../hooks/useAppState';
import { Button } from '../ui/button';
import { GoogleMapView } from '../GoogleMapView';
import { RideCompletionSummaryDialog } from '../RideCompletionSummaryDialog';
import { VEHICLE_PRICING, type VehicleCategory } from '../../lib/pricing';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { toast } from '../../lib/toast';
import { motion } from '../../lib/motion';

// ──── Icônes inline ────────────────────────────────────────────────────────────
const Phone    = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>;
const CheckCircle = ({ className = "w-5 h-5" }: { className?: string }) => <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const Clock    = ({ className = "w-5 h-5" }: { className?: string }) => <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const DollarSign = ({ className = "w-5 h-5" }: { className?: string }) => <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const MapPin   = ({ className = "w-4 h-4" }: { className?: string }) => <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const AlertTriangle = ({ className = "w-4 h-4" }: { className?: string }) => <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>;
const PlayCircle = ({ className = "w-5 h-5" }: { className?: string }) => <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const Flag     = ({ className = "w-5 h-5" }: { className?: string }) => <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" /></svg>;
const User     = ({ className = "w-6 h-6" }: { className?: string }) => <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;

type Phase = 'pickup' | 'waiting' | 'in_progress';

const FREE_WAIT_SECONDS = 10 * 60; // 10 minutes

interface NavigationScreenProps {
  onBack?: () => void;
}

function fmt(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export function NavigationScreen({ onBack }: NavigationScreenProps) {
  const { state, setCurrentScreen, updateRide, updateDriver } = useAppState();

  const [phase, setPhase]                     = useState<Phase>('pickup');
  const [waitingTime, setWaitingTime]         = useState(0);
  const [freeWaitDisabled, setFreeWaitDisabled] = useState(false);
  const [rideStartedAt, setRideStartedAt]     = useState<number | null>(null);
  const [elapsedTime, setElapsedTime]         = useState(0);
  const [currentCost, setCurrentCost]         = useState(0);
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const [isStarting, setIsStarting]           = useState(false);
  const [isCompleting, setIsCompleting]       = useState(false);

  const ride   = state.currentRide;
  const driver = state.currentDriver;

  const isBillingActive = freeWaitDisabled || waitingTime >= FREE_WAIT_SECONDS;

  // ── Waiting timer (phase waiting) ─────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'waiting' || freeWaitDisabled) return;
    const iv = setInterval(() => setWaitingTime(p => p + 1), 1000);
    return () => clearInterval(iv);
  }, [phase, freeWaitDisabled]);

  // Auto-activate billing after 10 min
  useEffect(() => {
    if (phase === 'waiting' && waitingTime >= FREE_WAIT_SECONDS && !freeWaitDisabled) {
      setFreeWaitDisabled(true);
      toast.warning('⏱️ 10 min écoulées — Facturation activée', {
        description: 'Vous pouvez maintenant démarrer la course'
      });
    }
  }, [waitingTime]);

  // ── Ride timer (phase in_progress) ────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'in_progress' || !rideStartedAt) return;

    const iv = setInterval(() => {
      const elapsed = Math.floor((Date.now() - rideStartedAt) / 1000);
      setElapsedTime(elapsed);

      // Calculate cost in real time
      const vehicleCategory = (
        ride?.vehicleType?.toLowerCase().replace(/\s+/g, '_') || 'smart_standard'
      ) as VehicleCategory;

      try {
        const pricing    = VEHICLE_PRICING[vehicleCategory];
        const isDay      = new Date().getHours() >= 6 && new Date().getHours() <= 20;
        const rateUSD    = isDay
          ? pricing.pricing.course_heure.jour.usd
          : pricing.pricing.course_heure.nuit.usd;
        const billedHrs  = Math.max(1, Math.ceil(elapsed / 3600));
        const xRate      = state.systemSettings?.exchangeRate || 2850;
        setCurrentCost(Math.round(rateUSD * billedHrs * xRate));
      } catch { /* fallback: keep old cost */ }

      // Sync elapsed time with backend (non-blocking)
      if (ride?.id) {
        fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/rides/${ride.id}/update`,
          {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${publicAnonKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ billingElapsedTime: elapsed })
          }
        ).catch(() => {});
      }
    }, 1000);

    return () => clearInterval(iv);
  }, [phase, rideStartedAt]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleArriveAtPickup = () => {
    setPhase('waiting');
    toast.success('✅ Arrivé chez le client !', {
      description: '10 minutes d\'attente gratuites. Démarrez quand le passager est à bord.'
    });
  };

  const handleDisableWaiting = useCallback(async () => {
    setFreeWaitDisabled(true);
    toast.warning('⏱️ Chrono d\'attente désactivé — Facturation active');

    if (ride?.id) {
      try {
        await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/rides/${ride.id}/start-billing`,
          {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${publicAnonKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ waitingTimeFrozen: waitingTime })
          }
        );
      } catch { /* non-blocking */ }
    }
  }, [ride?.id, waitingTime]);

  const handleStartRide = useCallback(async () => {
    if (!ride?.id || !driver?.id) {
      toast.error('Données de course manquantes');
      return;
    }
    setIsStarting(true);
    try {
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/rides/start`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${publicAnonKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ rideId: ride.id, driverId: driver.id })
        }
      );
      const data = await res.json();
      if (!data.success) {
        toast.error(data.error || 'Erreur lors du démarrage');
        return;
      }

      const now = Date.now();
      setRideStartedAt(now);
      setPhase('in_progress');

      if (updateRide && ride.id) {
        updateRide(ride.id, {
          status: 'in_progress',
          startedAt: new Date(now).toISOString(),
          billingStartTime: now
        });
      }

      toast.success('🚗 Course démarrée !', {
        description: 'Compteur de facturation actif — Bonne route !'
      });
    } catch {
      toast.error('Erreur réseau lors du démarrage');
    } finally {
      setIsStarting(false);
    }
  }, [ride?.id, driver?.id, updateRide]);

  const handleCompleteRide = useCallback(async () => {
    if (!ride?.id || !driver?.id) {
      toast.error('Données de course manquantes');
      return;
    }
    setIsCompleting(true);

    const finalCost = currentCost > 0 ? currentCost : ride.estimatedPrice || 0;
    const pickupAddress = ride.pickup?.address || 'Point de départ';
    const destAddress   = ride.destination?.address || 'Destination';

    try {
      // 1. Compléter la course côté backend
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/rides/complete`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${publicAnonKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rideId: ride.id,
            driverId: driver.id,
            actualCost: finalCost,
            duration: elapsedTime,
            pickup: { address: pickupAddress },
            destination: { address: destAddress },
            distance: ride.distance || 0,
            vehicleType: ride.vehicleType,
            completedAt: new Date().toISOString()
          })
        }
      );

      const result = await res.json();
      if (!result.success) {
        toast.error(result.error || 'Erreur lors de la clôture');
        return;
      }

      // 2. Recharger le solde du conducteur (backend a déjà calculé -15% / +85%)
      try {
        const driverRes = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/drivers/${driver.id}`,
          { headers: { 'Authorization': `Bearer ${publicAnonKey}` } }
        );
        if (driverRes.ok) {
          const driverData = await driverRes.json();
          if (driverData.driver && updateDriver) {
            updateDriver(driver.id, {
              balance: driverData.driver.balance,
              earningsBalance: driverData.driver.earningsBalance,
              totalRides: (driverData.driver.totalRides || 0) + 1
            });
          }
        }
      } catch { /* non-blocking */ }

      // 3. Mettre à jour le ride local
      if (updateRide) {
        updateRide(ride.id, {
          status: 'completed',
          actualPrice: finalCost,
          completedAt: new Date().toISOString()
        });
      }

      const commission  = Math.round(finalCost * 0.15);
      const netEarning  = finalCost - commission;
      toast.success('🎉 Course clôturée !', {
        description: `Gain net : ${netEarning.toLocaleString()} CDF (+85%) | Commission : ${commission.toLocaleString()} CDF (15%)`
      });

      setShowCompletionDialog(true);
    } catch {
      toast.error('Erreur réseau lors de la clôture');
    } finally {
      setIsCompleting(false);
    }
  }, [ride, driver?.id, currentCost, elapsedTime, updateRide, updateDriver]);

  // ── Step indicators ────────────────────────────────────────────────────────
  const steps = [
    { label: 'Acceptée',  done: true },
    { label: 'En route',  done: phase !== 'pickup' },
    { label: 'Démarrage', done: phase === 'in_progress' },
    { label: 'Clôturée',  done: false }
  ];

  const waitPct = Math.min(100, Math.round((waitingTime / FREE_WAIT_SECONDS) * 100));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="min-h-screen bg-gray-50"
    >
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="bg-white shadow-sm px-4 py-3 flex items-center justify-between">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 text-sm"
        >
          ← Retour
        </button>
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${
            phase === 'pickup'      ? 'bg-yellow-400' :
            phase === 'waiting'     ? 'bg-orange-400' :
            'bg-green-500 animate-pulse'
          }`} />
          <span className="font-semibold text-sm">
            {phase === 'pickup'     ? 'En route vers le client' :
             phase === 'waiting'    ? 'Attente du passager' :
             '🚗 Course en cours'}
          </span>
        </div>
        <div className="w-16" />
      </div>

      {/* ── Steps progress ────────────────────────────────────────────── */}
      <div className="bg-white border-b px-4 py-3">
        <div className="flex items-center justify-between max-w-xs mx-auto">
          {steps.map((step, i) => (
            <div key={step.label} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  step.done ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  {step.done ? '✓' : i + 1}
                </div>
                <span className="text-[10px] text-gray-500 mt-1 whitespace-nowrap">{step.label}</span>
              </div>
              {i < steps.length - 1 && (
                <div className={`h-0.5 w-8 mx-1 mb-4 ${step.done ? 'bg-green-400' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* ── Infos passager ────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold">{ride?.passengerName || 'Passager'}</p>
              <p className="text-xs text-gray-500">{ride?.passengerPhone || ''}</p>
            </div>
            <a
              href={`tel:${ride?.passengerPhone || ''}`}
              className="ml-auto flex items-center gap-1 bg-green-50 text-green-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-green-100"
            >
              <Phone /> Appeler
            </a>
          </div>

          {/* Trajets */}
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Départ</p>
                <p className="text-sm font-medium">{ride?.pickup?.address || 'Point de départ'}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Destination</p>
                <p className="text-sm font-medium">{ride?.destination?.address || 'Destination'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Carte ─────────────────────────────────────────────────────── */}
        {ride?.pickup?.lat && ride?.destination?.lat ? (
          <div className="rounded-xl overflow-hidden shadow-sm h-48">
            <GoogleMapView
              center={phase === 'in_progress' ? ride.destination : ride.pickup}
              zoom={13}
              showRoute
              routeStart={ride.pickup}
              routeEnd={ride.destination}
              enableGeolocation
              enableZoomControls
              className="w-full h-full"
            />
          </div>
        ) : (
          <div className="h-48 bg-gray-100 rounded-xl flex items-center justify-center">
            <MapPin className="w-6 h-6 text-gray-400 mr-2" />
            <span className="text-gray-400 text-sm">Carte indisponible</span>
          </div>
        )}

        {/* ── PHASE : PICKUP (en route vers client) ─────────────────────── */}
        {phase === 'pickup' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-yellow-50 border border-yellow-200 rounded-xl p-4"
          >
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="w-4 h-4 text-yellow-600" />
              <p className="font-semibold text-yellow-800">Étape 1 — En route</p>
            </div>
            <p className="text-sm text-yellow-700 mb-3">
              Rendez-vous au point de départ du passager.
            </p>
            <Button
              onClick={handleArriveAtPickup}
              className="w-full h-12 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold rounded-xl"
            >
              <CheckCircle className="w-5 h-5 mr-2" />
              Arrivé chez le client
            </Button>
          </motion.div>
        )}

        {/* ── PHASE : WAITING (attente du passager) ─────────────────────── */}
        {phase === 'waiting' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-3"
          >
            {/* Chrono d'attente */}
            <div className={`rounded-xl p-4 border ${
              isBillingActive
                ? 'bg-orange-50 border-orange-200'
                : 'bg-blue-50 border-blue-200'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Clock className={`w-5 h-5 ${isBillingActive ? 'text-orange-600' : 'text-blue-600'}`} />
                  <p className={`font-semibold ${isBillingActive ? 'text-orange-800' : 'text-blue-800'}`}>
                    Étape 2 — Attente passager
                  </p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  isBillingActive ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
                }`}>
                  {isBillingActive ? '💰 Facturation active' : '✓ Gratuit'}
                </span>
              </div>

              <div className="text-center my-3">
                <p className={`text-4xl font-mono font-bold ${isBillingActive ? 'text-orange-600' : 'text-blue-600'}`}>
                  {fmt(waitingTime)}
                </p>
                {!freeWaitDisabled && (
                  <p className="text-xs text-gray-500 mt-1">
                    {waitingTime < FREE_WAIT_SECONDS
                      ? `${fmt(FREE_WAIT_SECONDS - waitingTime)} restantes gratuites`
                      : 'Facturation automatique activée'}
                  </p>
                )}
              </div>

              {/* Barre de progression */}
              {!freeWaitDisabled && (
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-3">
                  <div
                    className="h-full bg-blue-400 rounded-full transition-all duration-1000"
                    style={{ width: `${waitPct}%` }}
                  />
                </div>
              )}

              {/* Bouton désactiver chrono */}
              {!freeWaitDisabled && !isBillingActive && (
                <Button
                  onClick={handleDisableWaiting}
                  variant="outline"
                  className="w-full border-orange-300 text-orange-700 hover:bg-orange-50"
                >
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Désactiver le chrono d'attente
                </Button>
              )}
            </div>

            {/* Bouton Démarrer la course */}
            <Button
              onClick={handleStartRide}
              disabled={isStarting}
              className="w-full h-14 bg-green-500 hover:bg-green-600 text-white font-semibold text-base rounded-xl disabled:opacity-50"
            >
              {isStarting ? (
                <span className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Démarrage...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <PlayCircle className="w-5 h-5" />
                  Étape 3 — Démarrer la course
                </span>
              )}
            </Button>
          </motion.div>
        )}

        {/* ── PHASE : IN_PROGRESS (course en cours) ─────────────────────── */}
        {phase === 'in_progress' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-3"
          >
            {/* Timer & coût */}
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <p className="font-semibold text-green-800">🚗 Course en cours</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-lg p-3 text-center shadow-sm">
                  <Clock className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                  <p className="text-xs text-gray-500">Temps écoulé</p>
                  <p className="text-xl font-mono font-bold text-blue-700">{fmt(elapsedTime)}</p>
                </div>
                <div className="bg-white rounded-lg p-3 text-center shadow-sm">
                  <DollarSign className="w-5 h-5 text-green-600 mx-auto mb-1" />
                  <p className="text-xs text-gray-500">Coût actuel</p>
                  <p className="text-xl font-bold text-green-700">{currentCost.toLocaleString()} <span className="text-sm">CDF</span></p>
                </div>
              </div>

              {/* Gains estimés */}
              <div className="mt-3 flex justify-between text-xs text-gray-500 bg-white rounded-lg p-2">
                <span>Gain net (85 %) : <span className="font-semibold text-green-700">{Math.round(currentCost * 0.85).toLocaleString()} CDF</span></span>
                <span>Commission (15 %) : <span className="font-semibold text-orange-600">{Math.round(currentCost * 0.15).toLocaleString()} CDF</span></span>
              </div>
            </div>

            {/* Bouton Clôturer */}
            <Button
              onClick={handleCompleteRide}
              disabled={isCompleting}
              className="w-full h-14 bg-red-500 hover:bg-red-600 text-white font-semibold text-base rounded-xl disabled:opacity-50"
            >
              {isCompleting ? (
                <span className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Clôture en cours...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Flag className="w-5 h-5" />
                  Étape 4 — Clôturer la course
                </span>
              )}
            </Button>
          </motion.div>
        )}
      </div>

      {/* ── Dialog de clôture ─────────────────────────────────────────── */}
      <RideCompletionSummaryDialog
        isOpen={showCompletionDialog}
        onClose={() => {
          setShowCompletionDialog(false);
          // ✅ FIX : effacer la course courante avant de retourner au dashboard
          //         pour forcer le rechargement des stats et éviter un double-incrément
          if (updateRide && ride?.id) {
            updateRide(ride.id, { status: 'completed' });
          }
          setCurrentScreen('driver-dashboard');
        }}
        userType="driver"
        rideData={{
          duration:             elapsedTime || 0,
          distance:             ride?.distance || 0,
          baseCost:             0,
          waitingTime:          waitingTime || 0,
          waitingCost:          0,
          totalCost:            currentCost || ride?.estimatedPrice || 0,
          freeWaitingDisabled:  freeWaitDisabled,
          billingElapsedTime:   elapsedTime || 0,
          passengerName:        ride?.passengerName || 'Passager',
          vehicleType:          (ride?.vehicleType || 'Smart Confort') as 'Smart Standard' | 'Smart Confort' | 'Smart Plus',
          startLocation:        ride?.pickup?.address  || 'Départ',
          endLocation:          ride?.destination?.address || 'Destination'
        }}
      />
    </motion.div>
  );
}
