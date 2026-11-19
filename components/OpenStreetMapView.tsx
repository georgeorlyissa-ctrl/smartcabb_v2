import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  destinationIcon,
  driverIcon,
  genericIcon,
  passengerIcon,
  vehicleIcon,
} from './map/mapMarkers';

interface Location {
  lat: number;
  lng: number;
}

export interface MapDriverMarker {
  id: string;
  name?: string;
  lat: number;
  lng: number;
  /** false = déjà en course (marqueur grisé). */
  available?: boolean;
}

interface OpenStreetMapViewProps {
  center?: Location;
  /** Marqueurs génériques (pastille neutre). */
  markers?: Location[];
  /** Passager / point de départ → icône BONHOMME. */
  pickup?: Location;
  /** Destination → épingle rouge. */
  destination?: Location;
  /** Véhicule suivi pendant la course → voiture verte. */
  vehicle?: Location;
  /** Conducteurs connectés → voiture + prénom. */
  drivers?: MapDriverMarker[];
  /**
   * Itinéraires à tracer (`path` = suite de [lat, lng]).
   * L'itinéraire `active: true` est en bleu épais, les autres en gris.
   */
  routes?: Array<{ id: string; path: [number, number][]; active?: boolean }>;
  /** Position de l'utilisateur de l'appareil (carte d'accueil). */
  userMarker?: Location;
  /** Rôle de l'utilisateur : bonhomme (passager) ou voiture (conducteur). */
  userRole?: 'passenger' | 'driver';
  zoom?: number;
  className?: string;
  showAttribution?: boolean;
  onMapClick?: (lat: number, lng: number) => void;
}

/** Les conducteurs plus loin que cela ne forcent pas le cadrage (carte lisible). */
const FIT_DRIVER_RADIUS_M = 6000;

interface DesiredMarker {
  key: string;
  lat: number;
  lng: number;
  /** Change quand l'icône doit être recréée (nom, disponibilité…). */
  iconKey: string;
  build: () => any;
  z: number;
  title?: string;
}

const valid = (p?: Location | null): p is Location =>
  !!p && Number.isFinite(p.lat) && Number.isFinite(p.lng);

const sig = (p?: Location | null): string =>
  valid(p) ? `${p.lat.toFixed(4)},${p.lng.toFixed(4)}` : '-';

/**
 * Carte OpenStreetMap via Leaflet (sans iframe, compatible CSP)
 */
export function OpenStreetMapView({
  center,
  markers = [],
  pickup,
  destination,
  vehicle,
  drivers = [],
  routes = [],
  userMarker,
  userRole = 'passenger',
  zoom = 14,
  className = "w-full h-full",
  showAttribution = true,
  onMapClick
}: OpenStreetMapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<Map<string, { marker: any; iconKey: string }>>(new Map());
  const fitSignatureRef = useRef<string>('');
  const routesLayerRef = useRef<any>(null);
  const routeFitRef = useRef<string>('');
  const [loadError, setLoadError] = useState(false);

  // Init carte UNE SEULE FOIS — jamais recréée sur changement de centre/zoom.
  // (Recréer la carte à chaque position GPS détruisait Leaflet en pleine
  // animation de zoom → "can't access property _leaflet_pos, t is undefined".)
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const init = async () => {
      try {
        if (cancelled || !containerRef.current || mapRef.current) return;
        const Leaflet: any = L as any;
        if (!Leaflet) return;
        const initialCenter = center || pickup || markers[0] || { lat: -4.3276, lng: 15.3136 };
        const map = Leaflet.map(containerRef.current, {
          zoomControl: false,
          attributionControl: false,
        }).setView([initialCenter.lat, initialCenter.lng], zoom);
        Leaflet.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '© OpenStreetMap',
        }).addTo(map);
        if (onMapClick) {
          map.on('click', (e: any) => { if (e.latlng) onMapClick(e.latlng.lat, e.latlng.lng); });
        }
        mapRef.current = map;
        timer = setTimeout(() => {
          try {
            if (!cancelled && mapRef.current === map && document.contains(map.getContainer())) {
              map.invalidateSize();
            }
          } catch {}
        }, 200);
      } catch (e) {
        console.warn('⚠️ Erreur init Leaflet', e);
        if (!cancelled) setLoadError(true);
      }
    };
    init().catch((e) => {
      console.warn('⚠️ Leaflet init failed', e);
      if (!cancelled) setLoadError(true);
    });
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      const map = mapRef.current;
      mapRef.current = null;
      markersRef.current.clear();
      fitSignatureRef.current = '';
      routesLayerRef.current = null;
      routeFitRef.current = '';
      if (map) {
        // Stopper toute animation (zoom/pan) AVANT de démonter :
        // un _onZoomTransitionEnd en vol après remove() = crash _leaflet_pos.
        try { map.stop(); } catch {}
        try { map.off(); } catch {}
        try { map.remove(); } catch {}
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Suivi du centre SANS recréer la carte (mises à jour GPS fréquentes)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || loadError || !center) return;
    try {
      if (!document.contains(map.getContainer())) return;
      map.setView([center.lat, center.lng], map.getZoom(), { animate: false });
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center?.lat, center?.lng]);

  // Suivi du zoom SANS recréer la carte
  useEffect(() => {
    const map = mapRef.current;
    if (!map || loadError || zoom === undefined) return;
    try {
      if (!document.contains(map.getContainer())) return;
      if (map.getZoom() !== zoom) map.setZoom(zoom, { animate: false });
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom]);

  // Marqueurs : synchronisés par clé (pas de recréation de carte, pas de
  // clignotement quand les positions des conducteurs se rafraîchissent).
  useEffect(() => {
    const map = mapRef.current;
    const Leaflet: any = (L as any);
    if (!map || !Leaflet || loadError) return;
    try {
      if (!document.contains(map.getContainer())) return;
    } catch { return; }

    const desired: DesiredMarker[] = [];

    if (valid(pickup)) {
      desired.push({ key: 'pickup', lat: pickup.lat, lng: pickup.lng, iconKey: 'pax', build: passengerIcon, z: 1000, title: 'Passager' });
    }
    if (valid(userMarker)) {
      const isDriver = userRole === 'driver';
      desired.push({
        key: 'user', lat: userMarker.lat, lng: userMarker.lng,
        iconKey: isDriver ? 'veh' : 'pax',
        build: isDriver ? vehicleIcon : passengerIcon,
        z: 950, title: 'Votre position',
      });
    }
    if (valid(vehicle)) {
      desired.push({ key: 'vehicle', lat: vehicle.lat, lng: vehicle.lng, iconKey: 'veh', build: vehicleIcon, z: 900, title: 'Véhicule' });
    }
    if (valid(destination)) {
      desired.push({ key: 'destination', lat: destination.lat, lng: destination.lng, iconKey: 'dest', build: destinationIcon, z: 800, title: 'Destination' });
    }
    markers.forEach((m, i) => {
      if (!valid(m)) return;
      desired.push({ key: `gen:${i}`, lat: m.lat, lng: m.lng, iconKey: 'gen', build: genericIcon, z: 100 });
    });
    drivers.forEach((d) => {
      if (!d || !Number.isFinite(d.lat) || !Number.isFinite(d.lng)) return;
      const busy = d.available === false;
      desired.push({
        key: `drv:${d.id}`, lat: d.lat, lng: d.lng,
        iconKey: `drv|${d.name || ''}|${busy ? 'busy' : 'free'}`,
        build: () => driverIcon(d.name, !busy),
        z: 0,
        title: `${d.name || 'Chauffeur'}${busy ? ' (en course)' : ''}`,
      });
    });

    try {
      const present = markersRef.current;
      const wanted = new Set(desired.map((d) => d.key));

      for (const [key, entry] of present.entries()) {
        if (!wanted.has(key)) {
          try { entry.marker.remove(); } catch {}
          present.delete(key);
        }
      }

      for (const d of desired) {
        const existing = present.get(d.key);
        if (existing && existing.iconKey === d.iconKey) {
          existing.marker.setLatLng([d.lat, d.lng]);
          continue;
        }
        if (existing) {
          try { existing.marker.remove(); } catch {}
        }
        const marker = Leaflet.marker([d.lat, d.lng], {
          icon: d.build(),
          zIndexOffset: d.z,
          keyboard: false,
          title: d.title,
        }).addTo(map);
        present.set(d.key, { marker, iconKey: d.iconKey });
      }
    } catch (e) {
      console.warn('⚠️ Erreur marqueurs Leaflet', e);
      return;
    }

    // Cadrage : seulement quand l'ensemble affiché change (itinéraire, véhicule
    // qui avance, conducteur qui apparaît/disparaît) — pas à chaque rafraîchis-
    // sement de position, pour ne pas « sauter » pendant que l'utilisateur
    // regarde la carte.
    const anchor: Location | undefined = valid(pickup) ? pickup : valid(userMarker) ? userMarker : center;
    const nearbyDrivers = drivers.filter((d) => {
      if (!d || !Number.isFinite(d.lat) || !Number.isFinite(d.lng)) return false;
      if (!valid(anchor)) return true;
      try {
        return Leaflet.latLng(anchor.lat, anchor.lng).distanceTo([d.lat, d.lng]) <= FIT_DRIVER_RADIUS_M;
      } catch { return true; }
    });

    const points: [number, number][] = [];
    if (valid(pickup)) points.push([pickup.lat, pickup.lng]);
    if (valid(userMarker)) points.push([userMarker.lat, userMarker.lng]);
    if (valid(vehicle)) points.push([vehicle.lat, vehicle.lng]);
    if (valid(destination)) points.push([destination.lat, destination.lng]);
    markers.forEach((m) => { if (valid(m)) points.push([m.lat, m.lng]); });
    nearbyDrivers.forEach((d) => points.push([d.lat, d.lng]));
    if (points.length === 0 && valid(center)) points.push([center.lat, center.lng]);

    const signature = [
      sig(pickup), sig(userMarker), sig(vehicle), sig(destination),
      markers.map(sig).join(';'),
      nearbyDrivers.map((d) => d.id).sort().join(','),
    ].join('|');

    if (points.length > 1 && signature !== fitSignatureRef.current) {
      fitSignatureRef.current = signature;
      try {
        const bounds = Leaflet.latLngBounds(points);
        // animate:false — évite une animation de zoom en vol si la carte se démonte
        map.fitBounds(bounds.pad(0.35), { animate: false, maxZoom: 17 });
      } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    JSON.stringify(markers), JSON.stringify(drivers),
    pickup?.lat, pickup?.lng, destination?.lat, destination?.lng,
    vehicle?.lat, vehicle?.lng, userMarker?.lat, userMarker?.lng, userRole,
    center?.lat, center?.lng, loadError,
  ]);

  // ─── Itinéraires : tracé + alternatives (style Uber/Yango) ──────────
  useEffect(() => {
    const map = mapRef.current;
    const Leaflet: any = (L as any);
    if (!map || !Leaflet || loadError) return;
    try {
      if (!document.contains(map.getContainer())) return;
    } catch { return; }

    if (!routesLayerRef.current) {
      routesLayerRef.current = Leaflet.layerGroup().addTo(map);
    }
    const layer = routesLayerRef.current;
    try { layer.clearLayers(); } catch { /* ignore */ }

    const validRoutes = (routes || []).filter(
      (r) => Array.isArray(r?.path) && r.path.length > 1,
    );
    // Alternatives d'abord, itinéraire actif dessiné par-dessus.
    const ordered = [...validRoutes].sort(
      (a, b) => Number(!!a.active) - Number(!!b.active),
    );

    for (const route of ordered) {
      try {
        // Liseré blanc : lisibilité sur un fond de carte chargé.
        Leaflet.polyline(route.path, {
          color: '#FFFFFF',
          weight: route.active ? 10 : 8,
          opacity: 0.9,
          interactive: false,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(layer);

        Leaflet.polyline(route.path, {
          color: route.active ? '#0098FF' : '#94A3B8',
          weight: route.active ? 6 : 4,
          opacity: route.active ? 1 : 0.85,
          interactive: false,
          lineCap: 'round',
          lineJoin: 'round',
          ...(route.active ? {} : { dashArray: '1 8' }),
        }).addTo(layer);
      } catch (e) {
        console.warn('⚠️ [OSM] Tracé d’itinéraire impossible', e);
      }
    }

    const active = validRoutes.find((r) => r.active) || validRoutes[0];
    if (active) {
      const signature = `${active.id}:${active.path.length}:${active.path[0]?.join(',')}`;
      if (signature !== routeFitRef.current) {
        routeFitRef.current = signature;
        try {
          map.fitBounds(Leaflet.latLngBounds(active.path).pad(0.12), {
            animate: false,
            maxZoom: 17,
          });
        } catch { /* ignore */ }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(routes), loadError]);

  if (loadError) {
    return (
      <div className={`relative ${className} bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center`}>
        <div className="text-center p-6">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">🗺️</div>
          <p className="text-sm font-medium text-gray-700">Carte temporairement indisponible</p>
          <p className="text-xs text-gray-500 mt-1">Vérifiez votre connexion et réessayez</p>
          {center && <p className="text-xs text-gray-400 mt-2">Départ : {center.lat.toFixed(4)}, {center.lng.toFixed(4)}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className} bg-[#f3f4f6]`}>
      <div ref={containerRef} className="absolute inset-0 bg-[#f3f4f6]" />
      {showAttribution && (
        <div className="absolute bottom-1 right-1 bg-white/90 px-1.5 py-0.5 rounded text-[10px] z-[400] pointer-events-auto">
          © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">OpenStreetMap</a>
        </div>
      )}
    </div>
  );
}

/**
 * Variante simplifiée pour une carte statique de Kinshasa
 */
export function KinshasaMapView({ className = "w-full h-full" }: { className?: string }) {
  return <OpenStreetMapView center={{ lat: -4.3276, lng: 15.3136 }} zoom={12} className={className} />;
}
