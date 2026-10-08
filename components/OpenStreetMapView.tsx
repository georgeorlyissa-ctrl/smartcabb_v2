import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface Location {
  lat: number;
  lng: number;
}

interface OpenStreetMapViewProps {
  center?: Location;
  markers?: Location[];
  zoom?: number;
  className?: string;
  showAttribution?: boolean;
  onMapClick?: (lat: number, lng: number) => void;
}

/**
 * Carte OpenStreetMap via Leaflet (sans iframe, compatible CSP)
 */
export function OpenStreetMapView({
  center,
  markers = [],
  zoom = 14,
  className = "w-full h-full",
  showAttribution = true,
  onMapClick
}: OpenStreetMapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
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
        const initialCenter = center || markers[0] || { lat: -4.3276, lng: 15.3136 };
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

  // Marqueurs séparés — pas de recréation de carte
  useEffect(() => {
    const map = mapRef.current;
    const Leaflet: any = (L as any);
    if (!map || !Leaflet || loadError) return;
    try {
      if (!document.contains(map.getContainer())) return;
    } catch { return; }
    // Nettoyer anciens
    markersRef.current.forEach((m: any) => { try { m.remove(); } catch {} });
    markersRef.current = [];
    const allPoints: Location[] = [];
    if (center) allPoints.push(center);
    markers.forEach(m => allPoints.push(m));
    allPoints.forEach((p, idx) => {
      const isPickup = idx === 0 && center && p.lat === center.lat && p.lng === center.lng;
      const html = isPickup
        ? '<div style="width:18px;height:18px;background:#10b981;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.35)"></div>'
        : '<div style="width:28px;height:28px;background:#0ea5e9;border:2px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.3);font-size:14px">🚗</div>';
      const icon = Leaflet.divIcon({ html, className: '', iconSize: isPickup ? [18, 18] : [28, 28], iconAnchor: isPickup ? [9, 9] : [14, 14] });
      const m = Leaflet.marker([p.lat, p.lng], { icon }).addTo(map);
      markersRef.current.push(m);
    });
    if (allPoints.length > 1) {
      try {
        const bounds = Leaflet.latLngBounds(allPoints.map(p => [p.lat, p.lng] as [number, number]));
        // animate:false — évite une animation de zoom en vol si la carte se démonte
        map.fitBounds(bounds.pad(0.35), { animate: false });
      } catch {}
    }
  }, [JSON.stringify(markers), center?.lat, center?.lng, loadError]);

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
