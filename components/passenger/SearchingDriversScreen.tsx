import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from '../../lib/motion';
import { useAppState } from '../../hooks/useAppState';
import { useTranslation } from '../../hooks/useTranslation';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { toast } from '../../lib/toast';
import { formatCDF } from '../../lib/pricing';
import { Car as CarIcon, MapPin as MapPinIcon, X as XIcon, ChevronUp as ChevronUpIcon } from '../../lib/icons';
import { SearchingDriversMap } from './SearchingDriversMap';

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
  available?: boolean;
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
  smart_standard_clim: 'Smart Standard',
  smart_standard_no_clim: 'Smart Standard', // 🚦 variante en pause → affichée comme Standard
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
  const [driversLoaded, setDriversLoaded] = useState(false);
  const [driversFailing, setDriversFailing] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [dots, setDots] = useState('');
  const [sheetExpanded, setSheetExpanded] = useState(false);
  // Incrémenté par « Continuer » pour relancer la création sans dépendre de `phase`
  const [retryToken, setRetryToken] = useState(0);

  // Empêcher le double appel API
  const apiCalled = useRef(false);

  // 🆔 Identifiant de CETTE tentative, réutilisé en cas de réessai : le serveur
  // renvoie la même course au lieu d'en créer une deuxième (idempotence).
  const requestIdRef = useRef<string>('');
  if (!requestIdRef.current) {
    requestIdRef.current = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
      ? crypto.randomUUID()
      : `req-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

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
    let timer: ReturnType<typeof setTimeout> | null = null;
    let controller: AbortController | null = null;
    let failures = 0;

    // Sondage SÉQUENTIEL : la requête suivante n'est planifiée qu'une fois la
    // précédente terminée. Avec un setInterval, des réponses lentes
    // s'empilaient et saturaient le serveur (ce qui ralentissait encore plus).
    const fetchDrivers = async () => {
      controller = new AbortController();
      const abortTimer = setTimeout(() => controller?.abort(), 15000);
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
            signal: controller.signal,
          }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!data?.success) throw new Error(data?.error || 'réponse invalide');
        if (cancelled) return;

        setDriversCount(data.driversCount || 0);
        setOnlineDrivers(Array.isArray(data.drivers) ? data.drivers : []);
        // « Chargé » = une réponse VALIDE est arrivée. En cas d'échec on ne
        // prétend pas « aucun chauffeur » : on le dit (connexion lente).
        setDriversLoaded(true);
        setDriversFailing(false);
        failures = 0;
      } catch (err) {
        if (cancelled) return;
        failures += 1;
        if (failures >= 2) setDriversFailing(true);
        console.warn('⚠️ Impossible de récupérer les chauffeurs en ligne:', err);
      } finally {
        clearTimeout(abortTimer);
        if (!cancelled) {
          // Positions rafraîchies toutes les 4 s ; plus espacé en cas d'échecs.
          timer = setTimeout(fetchDrivers, failures === 0 ? 4000 : Math.min(4000 * 2 ** failures, 20000));
        }
      }
    };

    fetchDrivers();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      controller?.abort();
    };
  }, [pendingRide, phase]);

  // ─── Après 2.5s → appeler l'API create-ride ─────────────────
  // Réessai automatique sur les erreurs TRANSITOIRES (réseau, délai, 5xx, 503
  // de redéploiement) : le MÊME clientRequestId est renvoyé, donc jamais de
  // doublon. Un refus définitif (4xx) arrête immédiatement.
  // ⚠️ Dépendances VOLONTAIREMENT limitées à `pendingRide` + `retryToken` :
  // inclure `phase` ici déclenchait le nettoyage de l'effet au passage
  // `searching → notifying`, ce qui **annulait la requête de création en vol**
  // (AbortController) → aucune course créée, donc aucune notification.
  useEffect(() => {
    if (!pendingRide || apiCalled.current) return;

    let cancelled = false;
    let controller: AbortController | null = null;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const sleep = (ms: number) => new Promise<void>((resolve) => {
      timers.push(setTimeout(resolve, ms));
    });

    const postCreate = async () => {
      controller = new AbortController();
      const abortTimer = setTimeout(() => controller?.abort(), 25000);
      try {
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/rides/create`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${publicAnonKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              clientRequestId: requestIdRef.current,
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
            signal: controller.signal,
          }
        );
        const text = await response.text();
        let json: any = null;
        try { json = JSON.parse(text); } catch { /* réponse non JSON */ }
        return { ok: response.ok, status: response.status, json, text };
      } finally {
        clearTimeout(abortTimer);
      }
    };

    const run = async () => {
      if (apiCalled.current) return;
      apiCalled.current = true;
      setPhase('notifying');

      let lastMessage = '';

      for (let attempt = 1; attempt <= 3 && !cancelled; attempt++) {
        try {
          console.log(`🚖 Création de la course (tentative ${attempt}/3)…`);
          const { ok, status, json, text } = await postCreate();
          if (cancelled) return;

          if (ok && json?.success && json?.rideId) {
            console.log('✅ Course créée, rideId:', json.rideId);

            createRide({
              id: json.rideId,
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

            sessionStorage.removeItem('smartcab_pending_ride');

            timers.push(setTimeout(() => setCurrentScreen('ride'), 1200));
            return;
          }

          const blocked = json?.error === 'COMPTE_BLOQUE';
          const retryable = !blocked && (status >= 500 || status === 408 || status === 429 || !!json?.retry);
          lastMessage = blocked
            ? (json?.message || 'Votre compte a été temporairement suspendu suite à plusieurs annulations successives.')
            : (json?.message || json?.error || text || `Erreur ${status}`);

          if (!retryable) break;
          console.warn(`⚠️ Création indisponible (${status}) — nouvelle tentative…`);
        } catch (e: any) {
          if (cancelled) return;
          lastMessage = e?.name === 'AbortError'
            ? 'Délai dépassé'
            : (e?.message || 'Erreur réseau');
          console.warn('⚠️ Création interrompue:', lastMessage);
        }

        if (attempt < 3) await sleep(1500 * attempt);
      }

      if (cancelled) return;
      apiCalled.current = false;
      setPhase('error');
      setErrorMsg(
        /indisponible|erreur réseau|délai|abort|erreur 5|503|504/i.test(lastMessage) || !lastMessage
          ? 'Service momentanément indisponible. Touchez Continuer pour réessayer.'
          : lastMessage
      );
    };

    timers.push(setTimeout(run, 2500));

    return () => {
      cancelled = true;
      timers.forEach((t) => clearTimeout(t));
      controller?.abort();
    };
  }, [pendingRide, retryToken]);

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
    setRetryToken((n) => n + 1);
  };

  if (!pendingRide) return null;

  // ─── Préparation des données pour la carte ────────────────────
  const mapDrivers = onlineDrivers
    .filter(d => typeof d.lat === 'number' && typeof d.lng === 'number')
    .map(d => ({
      id: d.id,
      name: d.full_name || d.name || 'Chauffeur',
      lat: d.lat as number,
      lng: d.lng as number,
      available: d.available,
    }));

  // Le plus proche parmi ceux qui peuvent réellement prendre la course.
  const closestDriver = onlineDrivers
    .filter(d => d.available !== false && typeof d.distanceKm === 'number')
    .sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0))[0];

  const driversLabel =
    driversCount > 0
      ? (driversCount === 1
          ? t('drivers_available_one')
          : t('drivers_available_many').replace('{n}', String(driversCount)))
      : driversLoaded
      ? (onlineDrivers.length > 0 ? t('no_driver_available') : t('no_driver_nearby'))
      : driversFailing
      ? t('slow_connection_retry')
      : t('looking_for_drivers');

  const statusColor =
    phase === 'error' ? 'red' : phase === 'notifying' ? 'green' : 'cyan';

  return (
    <div className="h-[100dvh] w-full relative overflow-hidden bg-gray-100 flex flex-col">

      {/* ══════════════════════════════════════════════════════════
          🗺️ CARTE PLEIN ÉCRAN — Leaflet/OSM (aucune clé Google requise)
          • marqueur passager = icône bonhomme
          • un marqueur par conducteur connecté, mis à jour toutes les 4 s
          ══════════════════════════════════════════════════════════ */}
      <div className="absolute inset-0 z-0">
        <SearchingDriversMap
          center={{ lat: pendingRide.pickup.lat, lng: pendingRide.pickup.lng }}
          drivers={mapDrivers}
        />
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
                ? `${t('sending_request_drivers')}${dots}`
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
      <div className="absolute bottom-0 left-0 right-0 z-20 pb-safe">
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
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 animate-pulse ${
                    driversCount > 0 ? 'bg-green-500' : 'bg-amber-400'
                  }`} />
                  <p className="text-gray-700 text-sm font-medium truncate">
                    {driversLabel}
                  </p>
                </div>
                {closestDriver?.distanceKm !== undefined && (
                  <span className="text-cyan-600 text-xs font-semibold bg-cyan-50 px-2 py-1 rounded-full flex-shrink-0">
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
