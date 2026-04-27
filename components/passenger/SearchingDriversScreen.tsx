import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from '../../lib/motion';
import { useAppState } from '../../hooks/useAppState';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { toast } from '../../lib/toast';
import { formatCDF } from '../../lib/pricing';

// ─── Icônes inline ───────────────────────────────────────────
const CarIcon = ({ className = 'w-6 h-6' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
  </svg>
);
const MapPinIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);
const XIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);
const StarIcon = ({ className = 'w-3 h-3' }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
  </svg>
);
const UserIcon = ({ className = 'w-8 h-8' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

interface OnlineDriver {
  id: string;
  full_name?: string;
  name?: string;
  rating?: number;
  total_rides?: number;
  vehicleCategory?: string;
  vehicle?: { make?: string; model?: string; color?: string; license_plate?: string };
}

interface PendingRideData {
  passengerId: string;
  passengerName: string;
  passengerPhone: string;
  pickup: { lat: number; lng: number; address: string };
  destination: { lat: number; lng: number; address: string };
  pickupInstructions?: string;
  vehicleType: string;
  vehicleLabel: string;
  estimatedPrice: number;
  estimatedDuration: number;
  distance: number;
  passengerCount: number;
  promoCode?: string;
  promoDiscount?: number;
  beneficiary?: { name: string; phone: string } | null;
}

const VEHICLE_LABELS: Record<string, string> = {
  smart_standard: 'Smart Standard',
  smart_confort: 'Smart Confort',
  smart_plus: 'Smart Plus / Familiale',
  smart_business: 'Smart Business',
};

export function SearchingDriversScreen() {
  const { setCurrentScreen, createRide, state } = useAppState();

  // ─── Pending ride data (from sessionStorage) ────────────────
  const [pendingRide, setPendingRide] = useState<PendingRideData | null>(null);

  // ─── UI states ───────────────────────────────────────────────
  const [phase, setPhase] = useState<'init' | 'searching' | 'notifying' | 'error'>('init');
  const [onlineDrivers, setOnlineDrivers] = useState<OnlineDriver[]>([]);
  const [driversCount, setDriversCount] = useState(0);
  const [isCancelling, setIsCancelling] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [dots, setDots] = useState('');

  // Prevent double-call
  const apiCalled = useRef(false);

  // ─── Animated dots ───────────────────────────────────────────
  useEffect(() => {
    const timer = setInterval(() => {
      setDots(d => (d.length >= 3 ? '' : d + '.'));
    }, 500);
    return () => clearInterval(timer);
  }, []);

  // ─── Load pending ride from sessionStorage ───────────────────
  useEffect(() => {
    const raw = sessionStorage.getItem('smartcab_pending_ride');
    if (!raw) {
      toast.error('Données de course manquantes');
      setCurrentScreen('estimate');
      return;
    }
    try {
      const data: PendingRideData = JSON.parse(raw);
      setPendingRide(data);
      setPhase('searching');
    } catch {
      toast.error('Erreur de lecture des données');
      setCurrentScreen('estimate');
    }
  }, []);

  // ─── Fetch available online drivers ──────────────────────────
  useEffect(() => {
    if (!pendingRide) return;

    const fetchDrivers = async () => {
      try {
        const res = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/rides/check-drivers-availability`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${publicAnonKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ vehicleCategory: pendingRide.vehicleType }),
          }
        );
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setDriversCount(data.driversCount || 0);
            // Utilise les données des drivers si disponibles
            if (data.drivers && Array.isArray(data.drivers)) {
              setOnlineDrivers(data.drivers.slice(0, 4));
            }
          }
        }
      } catch (err) {
        console.warn('⚠️ Impossible de récupérer les chauffeurs en ligne:', err);
      }
    };

    fetchDrivers();
  }, [pendingRide]);

  // ─── After 2.5s of "searching" → call create-ride API ────────
  useEffect(() => {
    if (phase !== 'searching' || !pendingRide || apiCalled.current) return;

    const timer = setTimeout(async () => {
      if (apiCalled.current) return;
      apiCalled.current = true;

      setPhase('notifying');

      try {
        console.log('🚖 SearchingDriversScreen: Création de la course...');
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/rides/create`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${publicAnonKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              passengerId: pendingRide.passengerId,
              passengerName: pendingRide.passengerName,
              passengerPhone: pendingRide.passengerPhone,
              pickup: pendingRide.pickup,
              destination: pendingRide.destination,
              pickupInstructions: pendingRide.pickupInstructions,
              vehicleType: pendingRide.vehicleType,
              estimatedPrice: pendingRide.estimatedPrice,
              estimatedDuration: pendingRide.estimatedDuration,
              distance: pendingRide.distance,
              passengerCount: pendingRide.passengerCount,
              beneficiary: pendingRide.beneficiary ?? null,
            }),
          }
        );

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Erreur ${response.status}: ${errText}`);
        }

        const result = await response.json();
        if (!result.success || !result.rideId) {
          throw new Error(result.error || 'Pas de rideId retourné');
        }

        console.log('✅ Course créée, rideId:', result.rideId);

        // Créer la course localement
        createRide({
          id: result.rideId,
          passengerId: pendingRide.passengerId,
          pickup: pendingRide.pickup,
          destination: pendingRide.destination,
          pickupInstructions: pendingRide.pickupInstructions,
          status: 'pending',
          estimatedPrice: pendingRide.estimatedPrice,
          estimatedDuration: pendingRide.estimatedDuration,
          vehicleType: pendingRide.vehicleType as any,
          passengerCount: pendingRide.passengerCount,
          distanceKm: pendingRide.distance,
          promoCode: pendingRide.promoCode,
          promoDiscount: pendingRide.promoDiscount,
        } as any);

        // Nettoyer sessionStorage
        sessionStorage.removeItem('smartcab_pending_ride');

        // Courte pause pour que l'utilisateur voit "Chauffeurs notifiés"
        setTimeout(() => {
          setCurrentScreen('ride');
        }, 1200);
      } catch (err: any) {
        console.error('❌ Erreur création course:', err);
        apiCalled.current = false;
        setPhase('error');
        setErrorMsg(err.message || 'Impossible de créer la course');
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, [phase, pendingRide]);

  // ─── Cancel ──────────────────────────────────────────────────
  const handleCancel = async () => {
    setIsCancelling(true);

    // Si une course a déjà été créée (phase 'notifying'), l'annuler côté serveur
    if (phase === 'notifying' && state.currentRide?.id) {
      try {
        await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/rides/cancel`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${publicAnonKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              rideId: state.currentRide.id,
              cancelledBy: 'passenger',
              reason: 'Annulée par le passager',
            }),
          }
        );
      } catch (err) {
        console.error('❌ Erreur annulation course:', err);
      }
    }

    sessionStorage.removeItem('smartcab_pending_ride');
    // Retour à estimate : le bouton se réactive automatiquement (remount d'EstimateScreen)
    setCurrentScreen('estimate');
  };

  // ─── Retry ───────────────────────────────────────────────────
  const handleRetry = () => {
    apiCalled.current = false;
    setPhase('searching');
    setErrorMsg('');
  };

  if (!pendingRide) return null;

  return (
    <div className="h-full bg-gradient-to-br from-blue-950 via-blue-900 to-cyan-900 flex flex-col overflow-hidden relative">

      {/* ─── Arrière-plan animé ───────────────────────────────── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full border border-cyan-400/20"
            style={{
              width: 80 + i * 60,
              height: 80 + i * 60,
              top: '50%',
              left: '50%',
              x: '-50%',
              y: '-50%',
            }}
            animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0.05, 0.3] }}
            transition={{ duration: 3, delay: i * 0.4, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}
      </div>

      {/* ─── Header ──────────────────────────────────────────── */}
      <div className="relative z-10 flex items-center justify-between p-4 pt-8">
        <div className="w-10" />
        <div className="text-center">
          <div className="w-2 h-2 bg-green-400 rounded-full mx-auto mb-1 animate-pulse" />
          <p className="text-white/60 text-xs">SmartCabb</p>
        </div>
        <button
          onClick={handleCancel}
          disabled={isCancelling}
          className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors disabled:opacity-40"
        >
          <XIcon className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* ─── Corps principal ─────────────────────────────────── */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 gap-6">

        {/* Icône voiture animée */}
        <motion.div
          className="relative"
          animate={phase === 'error' ? {} : { y: [-6, 6, -6] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div className={`w-24 h-24 rounded-full flex items-center justify-center shadow-2xl ${
            phase === 'error'
              ? 'bg-red-500/20 border-2 border-red-400'
              : phase === 'notifying'
              ? 'bg-green-500/20 border-2 border-green-400'
              : 'bg-cyan-500/20 border-2 border-cyan-400'
          }`}>
            <CarIcon className={`w-12 h-12 ${
              phase === 'error' ? 'text-red-400'
              : phase === 'notifying' ? 'text-green-400'
              : 'text-cyan-400'
            }`} />
          </div>

          {/* Ping externe */}
          {phase !== 'error' && (
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-cyan-400/40"
              animate={{ scale: [1, 1.6], opacity: [0.6, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          )}
        </motion.div>

        {/* Texte principal */}
        <AnimatePresence mode="wait">
          {phase === 'error' ? (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-center space-y-2"
            >
              <h2 className="text-xl font-bold text-white">Erreur de connexion</h2>
              <p className="text-white/60 text-sm max-w-xs">{errorMsg}</p>
            </motion.div>
          ) : phase === 'notifying' ? (
            <motion.div
              key="notifying"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-center space-y-2"
            >
              <h2 className="text-xl font-bold text-white">Chauffeurs notifiés ✓</h2>
              <p className="text-white/60 text-sm">En attente d'acceptation…</p>
            </motion.div>
          ) : (
            <motion.div
              key="searching"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-center space-y-2"
            >
              <h2 className="text-xl font-bold text-white">
                Recherche des chauffeurs en cours{dots}
              </h2>
              <p className="text-white/60 text-sm">
                Nous cherchons un{' '}
                <span className="text-cyan-300 font-semibold">
                  {VEHICLE_LABELS[pendingRide.vehicleType] || pendingRide.vehicleType}
                </span>{' '}
                près de vous
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Résumé trajet */}
        <div className="w-full bg-white/10 backdrop-blur-sm rounded-2xl p-4 space-y-2 border border-white/10">
          <div className="flex items-start gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 mt-1.5 flex-shrink-0" />
            <p className="text-white/80 text-sm leading-tight">{pendingRide.pickup.address}</p>
          </div>
          <div className="ml-[3px] w-px h-4 bg-white/20" />
          <div className="flex items-start gap-2">
            <MapPinIcon className="w-3 h-3 text-red-400 mt-0.5 flex-shrink-0" />
            <p className="text-white/80 text-sm leading-tight">{pendingRide.destination.address}</p>
          </div>
          <div className="border-t border-white/10 pt-2 flex items-center justify-between">
            <span className="text-white/50 text-xs">{(pendingRide.distance || 0).toFixed(1)} km</span>
            <span className="text-cyan-300 text-sm font-bold">
              {formatCDF(pendingRide.estimatedPrice)}
            </span>
          </div>
        </div>

        {/* Chauffeurs en ligne */}
        <AnimatePresence>
          {driversCount > 0 && phase !== 'error' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="w-full"
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <p className="text-white/70 text-xs font-medium">
                  {driversCount} chauffeur{driversCount > 1 ? 's' : ''} disponible{driversCount > 1 ? 's' : ''} en ligne
                </p>
              </div>

              {onlineDrivers.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {onlineDrivers.map((driver, idx) => (
                    <motion.div
                      key={driver.id || idx}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.1 }}
                      className="bg-white/10 rounded-xl p-3 border border-white/10 flex items-center gap-2"
                    >
                      <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center flex-shrink-0">
                        <UserIcon className="w-4 h-4 text-cyan-300" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-white text-xs font-medium truncate">
                          {driver.full_name || driver.name || 'Chauffeur'}
                        </p>
                        <div className="flex items-center gap-1">
                          <StarIcon className="w-2.5 h-2.5 text-yellow-400" />
                          <span className="text-white/50 text-[10px]">
                            {(driver.rating || 4.8).toFixed(1)}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                // Placeholder animé si pas de profils détaillés
                <div className="grid grid-cols-4 gap-2">
                  {[...Array(Math.min(driversCount, 4))].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.12 }}
                      className="flex flex-col items-center gap-1"
                    >
                      <div className="w-10 h-10 rounded-full bg-cyan-500/20 border-2 border-cyan-400/40 flex items-center justify-center">
                        <UserIcon className="w-5 h-5 text-cyan-300" />
                      </div>
                      <div className="flex gap-0.5">
                        {[0, 1, 2].map(s => (
                          <motion.div
                            key={s}
                            className="w-1 h-1 rounded-full bg-cyan-400"
                            animate={{ opacity: [0.3, 1, 0.3] }}
                            transition={{ duration: 1, delay: s * 0.2, repeat: Infinity }}
                          />
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {driversCount === 0 && phase === 'searching' && (
            <motion.p
              key="no-drivers"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-white/40 text-xs text-center"
            >
              Vérification des chauffeurs disponibles…
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* ─── Boutons bas ─────────────────────────────────────── */}
      <div className="relative z-10 p-6 space-y-3">
        {phase === 'error' ? (
          <>
            <button
              onClick={handleRetry}
              className="w-full h-12 bg-cyan-500 hover:bg-cyan-400 text-white rounded-xl font-semibold text-sm transition-colors"
            >
              Réessayer
            </button>
            <button
              onClick={handleCancel}
              className="w-full h-12 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium text-sm transition-colors"
            >
              Annuler
            </button>
          </>
        ) : (
          <button
            onClick={handleCancel}
            disabled={isCancelling}
            className="w-full h-12 bg-white/10 hover:bg-white/20 disabled:opacity-40 text-white rounded-xl font-medium text-sm transition-colors border border-white/10"
          >
            {isCancelling ? 'Annulation…' : 'Annuler la recherche'}
          </button>
        )}
      </div>
    </div>
  );
}
