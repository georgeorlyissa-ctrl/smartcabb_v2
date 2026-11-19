import { useEffect, useRef, useState } from 'react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

/** Conducteur connecté, au format attendu par `MapView` (`drivers`). */
export interface NearbyDriver {
  id: string;
  name: string;
  location: { lat: number; lng: number };
  vehicleType?: string;
  rating?: number;
  /** false = déjà en course. */
  available?: boolean;
  distanceKm?: number;
}

interface Options {
  /** Point autour duquel chercher (position du passager ou point de départ). */
  lat?: number | null;
  lng?: number | null;
  enabled?: boolean;
  intervalMs?: number;
}

const DEFAULT_INTERVAL_MS = 8000;
const MAX_BACKOFF_MS = 30000;
const REQUEST_TIMEOUT_MS = 20000;

/**
 * Conducteurs actuellement connectés (avec leur position) pour les cartes
 * passager.
 *
 * - Sondage SÉQUENTIEL : la requête suivante n'est planifiée qu'une fois la
 *   précédente terminée (jamais d'empilement quand le réseau est lent).
 * - En pause quand l'application est en arrière-plan.
 * - En cas d'échec, les marqueurs déjà affichés sont conservés et le délai
 *   augmente progressivement.
 */
export function useNearbyDrivers({
  lat,
  lng,
  enabled = true,
  intervalMs = DEFAULT_INTERVAL_MS,
}: Options = {}): { drivers: NearbyDriver[]; loaded: boolean } {
  const [drivers, setDrivers] = useState<NearbyDriver[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Dernier point connu, lu au moment de chaque requête (pas de réabonnement
  // à chaque mise à jour GPS).
  const pointRef = useRef<{ lat?: number | null; lng?: number | null }>({ lat, lng });
  pointRef.current = { lat, lng };

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let controller: AbortController | null = null;
    let failures = 0;

    const schedule = (delay: number) => {
      if (!cancelled) timer = setTimeout(tick, delay);
    };

    const tick = async () => {
      if (cancelled) return;
      if (typeof document !== 'undefined' && document.hidden) {
        schedule(intervalMs);
        return;
      }

      controller = new AbortController();
      const abortTimer = setTimeout(() => controller?.abort(), REQUEST_TIMEOUT_MS);
      try {
        const { lat: pLat, lng: pLng } = pointRef.current;
        const query =
          typeof pLat === 'number' && typeof pLng === 'number' && Number.isFinite(pLat) && Number.isFinite(pLng)
            ? `?lat=${pLat.toFixed(5)}&lng=${pLng.toFixed(5)}`
            : '';
        const res = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/rides/online-drivers${query}`,
          { headers: { Authorization: `Bearer ${publicAnonKey}` }, signal: controller.signal },
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!json?.success || !Array.isArray(json.drivers)) throw new Error(json?.error || 'réponse invalide');

        if (!cancelled) {
          setDrivers(
            json.drivers
              .filter((d: any) => Number.isFinite(d?.lat) && Number.isFinite(d?.lng))
              .map((d: any): NearbyDriver => ({
                id: String(d.id),
                name: d.name || 'Chauffeur',
                location: { lat: d.lat, lng: d.lng },
                vehicleType: d.vehicleType,
                rating: d.rating,
                available: d.available,
                distanceKm: d.distanceKm,
              })),
          );
          setLoaded(true);
        }
        failures = 0;
      } catch (err) {
        failures += 1;
        if (failures === 1) console.warn('⚠️ [useNearbyDrivers] lecture impossible, nouvelle tentative…', err);
      } finally {
        clearTimeout(abortTimer);
        schedule(failures === 0 ? intervalMs : Math.min(intervalMs * 2 ** failures, MAX_BACKOFF_MS));
      }
    };

    tick();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      controller?.abort();
    };
  }, [enabled, intervalMs]);

  return { drivers, loaded };
}
