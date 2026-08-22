import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from '../../lib/motion';
import { useAppState } from '../../hooks/useAppState';
import { useTranslation } from '../../hooks/useTranslation';
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

const ChevronUpIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
  </svg>
);

// ─── Types ───────────────────────────────────────────────────
interface OnlineDriver {
  id: string;
  name?: string;
  full_name?: string;
  rating?: number;
  totalRides?: number;
  vehicleType?: string;
  lat?: number;
  lng?: number;
  distanceKm?: number;
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
  smart_standard_clim: 'Smart Standard avec Clim',
  smart_standard_no_clim: 'Smart Standard sans Clim',
  smart_confort: 'Smart Confort',
  smart_plus: 'Smart Plus / Familiale',
  smart_business: 'Smart Business',
};

export function SearchingDriversScreen() {
  const { setCurrentScreen, createRide, state } = useAppState();
  const { t } = useTranslation();

  // ─── États ───────────────────────────────────────────────────
  const [pendingRide, setPendingRide] = useState<PendingRideData | null>(null);
  const [phase, setPhase] = useState<'init' | 'searching' | 'notifying' | 'error'>('init');
  const [onlineDrivers, setOnlineDrivers] = useState<OnlineDriver[]>([]);
  const [driversCount, setDriversCount] = useState(0);
  const [isCancelling, setIsCancelling] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [dots, setDots] = useState('');
  const [sheetExpanded, setSheetExpanded] = useState(false);

  // Empêcher le double appel API
  const apiCalled = useRef(false);

  // ─── Points animés ───────────────────────────────────────────
  useEffect(() => {
    const timer = setInterval(() => {
      setDots(d => (d.length >= 3 ? '' : d + '.'));
    }, 500);
    return () => clearInterval(timer);
  }, []);

  // ─── Charger pendingRide depuis sessionStorage ────────────────
  useEffect(() => {
    const raw = sessionStorage.getItem('smartcab_pending_ride');
    if (!raw) {
      toast.error(t('error'));
      setCurrentScreen('estimate');
      return;
    }
    try {
      const data: PendingRideData = JSON.parse(raw);
      setPendingRide(data);
      setPhase('searching');
    } catch {
      toast.error(t('error'));
      setCurrentScreen('estimate');
    }
  }, []);

  // ─── Récupérer les chauffeurs disponibles + leur position (polling) ──
  useEffect(() => {
    if (!pendingRide) return;
    if (phase === 'error') return;

    let cancelled = false;

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
            body: JSON.stringify({
              vehicleCategory: pendingRide.vehicleType,
              pickupLat: pendingRide.pickup.lat,
              pickupLng: pendingRide.pickup.lng,
            }),
          }
        );
        if (res.ok && !cancelled) {
          const data = await res.json();
          if (data.success) {
            setDriversCount(data.driversCount || 0);
            if (Array.isArray(data.drivers)) {
              setOnlineDrivers(data.drivers);
            }
          }
        }
      } catch (err) {
        console.warn('⚠️ Impossible de récupérer les chauffeurs en ligne:', err);
      }
    };

    fetchDrivers();
    // ✅ Rafraîchit les positions toutes les 4s pendant la recherche/notification
    const interval = setInterval(fetchDrivers, 4000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [pendingRide, phase]);

  // ─── Après 2.5s → appeler l'API create-ride ─────────────────
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
          let blockedMessage: string | null = null;
          try {
            const errJson = JSON.parse(errText);
            if (errJson.error === 'COMPTE_BLOQUE') {
              blockedMessage = errJson.message || 'Votre compte a été temporairement suspendu suite à plusieurs annulations successives.';
            }
          } catch {}
          if (blockedMessage) throw new Error(blockedMessage);
          throw new Error(`Erreur ${response.status}: ${errText}`);
        }

        const result = await response.json();
        if (!result.success || !result.rideId) {
          if ((result as any).error === 'COMPTE_BLOQUE') {
            throw new Error((result as any).message || 'Compte temporairement bloqué.');
          }
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

        // Courte pause → navigation
        setTimeout(() => {
          setCurrentScreen('ride');
        }, 1200);

      } catch (err: any) {
        console.error('❌ Erreur création course:', err);
        apiCalled.current = false;
        setPhase('error');
        setErrorMsg(err.message || t('error'));
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, [phase, pendingRide]);

  // ─── Annulation ──────────────────────────────────────────────
  const handleCancel = async () => {
    setIsCancelling(true);

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
    setCurrentScreen('estimate');
  };

  // ─── Réessayer ───────────────────────────────────────────────
  const handleRetry = () => {
    apiCalled.current = false;
    setPhase('searching');
    setErrorMsg('');
  };

  if (!pendingRide) return null;

  // ─── Préparation des données pour la carte ────────────────────
  const mapDrivers = onlineDrivers
    .filter(d => typeof d.lat === 'number' && typeof d.lng === 'number')
    .map(d => ({
      id: d.id,
      name: d.full_name || d.name || 'Chauffeur',
      location: { lat: d.lat as number, lng: d.lng as number },
      vehicleType: d.vehicleType,
      rating: d.rating,
    }));

  const closestDriver = onlineDrivers
    .filter(d => typeof d.distanceKm === 'number')
    .sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0))[0];

  const statusColor =
    phase === 'error' ? 'red' : phase === 'notifying' ? 'green' : 'cyan';

  const staticMapUrl = `https://staticmap.openstreetmap.de/staticmap.php?center=${pendingRide.pickup.lat},${pendingRide.pickup.lng}&zoom=14&size=800x600&markers=${pendingRide.pickup.lat},${pendingRide.pickup.lng},red-pushpin${mapDrivers.map(d => `%7C${d.location.lat},${d.location.lng},blue-pushpin`).join('')}`;

  return (
    <div className="h-screen w-full relative overflow-hidden bg-gray-100 flex flex-col">

      {/* ══════════════════════════════════════════════════════════
          🗺️ CARTE PLEIN ÉCRAN — image statique OSM (toujours visible, même sans facturation Google)
          ══════════════════════════════════════════════════════════ */}
      <div className="absolute inset-0 z-0 bg-[#e5e7eb]">
        <img
          src={staticMapUrl}
          alt="Carte des chauffeurs"
          className="w-full h-full object-cover"
          loading="eager"
          onError={(e) => {
            const target = e.currentTarget as HTMLImageElement;
            target.style.display = 'none';
            const fallback = target.nextElementSibling as HTMLElement;
            if (fallback) fallback.style.display = 'flex';
          }}
        />
        <div className="hidden w-full h-full items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 p-6 text-center" style={{ display: 'none' }}>
          <div>
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow">🗺️</div>
            <p className="text-sm font-medium text-gray-700">Carte temporairement indisponible</p>
            <p className="text-xs text-gray-500 mt-1">{pendingRide.pickup.address}</p>
          </div>
        </div>
      </div>

      {/* Léger voile sombre en haut/bas pour lisibilité du texte */}
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/50 to-transparent z-[5] pointer-events-none" />

      {/* ── Header ── */}
      <div className="relative z-20 flex items-center justify-between p-4 pt-8">
        <div className="w-10" />
        <div className="text-center">
          <div className={`w-2 h-2 rounded-full mx-auto mb-1 animate-pulse ${
            statusColor === 'red' ? 'bg-red-400' : statusColor === 'green' ? 'bg-green-400' : 'bg-cyan-400'
          }`} />
          <p className="text-white/80 text-xs drop-shadow">SmartCabb</p>
        </div>
        <button
          onClick={handleCancel}
          disabled={isCancelling}
          className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center hover:bg-black/60 transition-colors disabled:opacity-40"
        >
          <XIcon className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* ── Bandeau de statut flottant (compact, sous le header) ── */}
      <div className="relative z-20 px-6 flex justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={phase}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={`flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-md shadow-lg ${
              statusColor === 'red'
                ? 'bg-red-500/90'
                : statusColor === 'green'
                ? 'bg-green-500/90'
                : 'bg-cyan-500/90'
            }`}
          >
            <motion.div
              animate={phase === 'error' ? {} : { rotate: [0, -8, 8, 0] }}
              transition={{ duration: 1.4, repeat: Infinity }}
            >
              <CarIcon className="w-4 h-4 text-white" />
            </motion.div>
            <span className="text-white text-xs font-semibold whitespace-nowrap">
              {phase === 'error'
                ? t('error')
                : phase === 'notifying'
                ? `${t('driver_found')} ✓`
                : `${t('searching_driver')}${dots}`}
            </span>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Espace flexible pour laisser voir la carte */}
      <div className="flex-1" />

      {/* ══════════════════════════════════════════════════════════
          🧾 BOTTOM SHEET — résumé trajet + chauffeurs + actions
          ══════════════════════════════════════════════════════════ */}
      <div className="absolute bottom-0 left-0 right-0 z-20">
        <div className="bg-white/97 backdrop-blur-xl rounded-t-3xl shadow-2xl">

          {/* Poignée */}
          <button
            onClick={() => setSheetExpanded(v => !v)}
            className="w-full flex flex-col items-center pt-2 pb-1"
          >
            <div className="w-10 h-1 bg-gray-300 rounded-full mb-1" />
            <ChevronUpIcon className={`w-4 h-4 text-gray-400 transition-transform ${sheetExpanded ? 'rotate-180' : ''}`} />
          </button>

          <div className="px-5 pb-6 space-y-4">

            {/* Message d'erreur */}
            {phase === 'error' && (
              <div className="text-center space-y-1 py-1">
                <h2 className="text-base font-bold text-gray-900">{t('error')}</h2>
                <p className="text-gray-500 text-sm">{errorMsg}</p>
              </div>
            )}

            {/* Nombre de chauffeurs + le plus proche */}
            {phase !== 'error' && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <p className="text-gray-700 text-sm font-medium">
                    {driversCount > 0
                      ? `${driversCount} ${t('drivers')} ${t('go_online').toLowerCase()}`
                      : t('loading') + '…'}
                  </p>
                </div>
                {closestDriver?.distanceKm !== undefined && (
                  <span className="text-cyan-600 text-xs font-semibold bg-cyan-50 px-2 py-1 rounded-full">
                    {closestDriver.distanceKm.toFixed(1)} {t('km')}
                  </span>
                )}
              </div>
            )}

            {/* Résumé trajet */}
            <div className="bg-gray-50 rounded-2xl p-4 space-y-2 border border-gray-100">
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
                <p className="text-gray-800 text-sm leading-tight">{pendingRide.pickup.address}</p>
              </div>
              <div className="ml-[3px] w-px h-4 bg-gray-200" />
              <div className="flex items-start gap-2">
                <MapPinIcon className="w-3 h-3 text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-gray-800 text-sm leading-tight">{pendingRide.destination.address}</p>
              </div>
              <div className="border-t border-gray-200 pt-2 flex items-center justify-between">
                <span className="text-gray-500 text-xs">
                  {(pendingRide.distance || 0).toFixed(1)} {t('km')} · {VEHICLE_LABELS[pendingRide.vehicleType] || pendingRide.vehicleType}
                </span>
                <span className="text-gray-900 text-sm font-bold">
                  {formatCDF(pendingRide.estimatedPrice)}
                </span>
              </div>
            </div>

            {/* Boutons */}
            {phase === 'error' ? (
              <div className="space-y-2">
                <button
                  onClick={handleRetry}
                  className="w-full h-12 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl font-semibold text-sm transition-colors"
                >
                  {t('continue')}
                </button>
                <button
                  onClick={handleCancel}
                  className="w-full h-12 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium text-sm transition-colors"
                >
                  {t('cancel')}
                </button>
              </div>
            ) : (
              <button
                onClick={handleCancel}
                disabled={isCancelling}
                className="w-full h-12 bg-gray-100 hover:bg-gray-200 disabled:opacity-40 text-gray-700 rounded-xl font-medium text-sm transition-colors"
              >
                {isCancelling ? `${t('cancel')}…` : t('cancel_search')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
