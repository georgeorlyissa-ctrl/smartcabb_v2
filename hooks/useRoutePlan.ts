import { useEffect, useRef, useState } from 'react';

export interface RouteOption {
  id: string;
  /** Points [lat, lng] prêts pour Leaflet. */
  path: [number, number][];
  distanceKm: number;
  durationMin: number;
}

interface Options {
  enabled?: boolean;
  /** Recalcul seulement si le point de départ a bougé d'au moins X mètres. */
  recomputeMeters?: number;
}

const OSRM_URL = 'https://router.project-osrm.org/route/v1/driving';
const MAX_ROUTES = 3;

/** Distance approximative en mètres (suffisant pour décider d'un recalcul). */
function distanceMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6_371_000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Itinéraires routiers **avec alternatives** (OSRM public, sans clé).
 *
 * - `alternatives=true` → jusqu'à 3 propositions (comme Uber/Yango) ;
 * - recalcul **débouncé** (600 ms) et seulement si la destination change ou si
 *   le départ a bougé de `recomputeMeters` (150 m par défaut) : interroger OSRM
 *   toutes les 3 s à chaque tick GPS serait inutile et impoli ;
 * - en cas d'échec réseau, les itinéraires déjà affichés sont conservés.
 */
export function useRoutePlan(
  from?: { lat: number; lng: number } | null,
  to?: { lat: number; lng: number } | null,
  options: Options = {},
) {
  const { enabled = true, recomputeMeters = 150 } = options;

  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const lastKeyRef = useRef('');
  const lastOriginRef = useRef<{ lat: number; lng: number } | null>(null);

  const fromLat = from?.lat;
  const fromLng = from?.lng;
  const toLat = to?.lat;
  const toLng = to?.lng;

  useEffect(() => {
    if (!enabled) return;
    if (![fromLat, fromLng, toLat, toLng].every((v) => Number.isFinite(v))) return;

    const origin = { lat: fromLat as number, lng: fromLng as number };
    const target = { lat: toLat as number, lng: toLng as number };

    // Une destination identique au départ (moins de 40 m) n'a pas d'itinéraire.
    if (distanceMeters(origin, target) < 40) return;

    const moved =
      !lastOriginRef.current ||
      distanceMeters(lastOriginRef.current, origin) >= recomputeMeters;
    const key = `${origin.lat.toFixed(3)},${origin.lng.toFixed(3)}->${target.lat.toFixed(4)},${target.lng.toFixed(4)}`;
    if (!moved && key === lastKeyRef.current) return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      if (cancelled) return;
      setLoading(true);
      try {
        const url =
          `${OSRM_URL}/${origin.lng},${origin.lat};${target.lng},${target.lat}` +
          `?alternatives=true&geometries=geojson&overview=full&steps=false`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`OSRM HTTP ${response.status}`);
        const data = await response.json();

        const list: RouteOption[] = (data?.routes || [])
          .slice(0, MAX_ROUTES)
          .map((route: any, index: number) => ({
            id: `r${index}`,
            distanceKm: Number(route.distance) / 1000,
            durationMin: Math.max(1, Math.round(Number(route.duration) / 60)),
            path: (route.geometry?.coordinates || []).map(
              (c: [number, number]) => [c[1], c[0]] as [number, number],
            ),
          }))
          .filter((route: RouteOption) => route.path.length > 1);

        if (cancelled || list.length === 0) return;

        lastKeyRef.current = key;
        lastOriginRef.current = origin;
        setRoutes(list);
        setSelectedId((prev) => (prev && list.some((r) => r.id === prev) ? prev : list[0].id));
      } catch (error) {
        console.warn('⚠️ [ROUTE] Calcul OSRM indisponible:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 600);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [enabled, fromLat, fromLng, toLat, toLng, recomputeMeters]);

  return { routes, selectedId, setSelectedId, loading };
}
