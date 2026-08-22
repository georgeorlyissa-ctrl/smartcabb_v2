import { useEffect, useRef } from 'react';

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
}

/**
 * Carte OpenStreetMap via Leaflet (sans iframe, compatible CSP)
 */
export function OpenStreetMapView({
  center,
  markers = [],
  zoom = 14,
  className = "w-full h-full",
  showAttribution = true
}: OpenStreetMapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      const L: any = (window as any).L;
      if (!L) {
        await new Promise<void>((resolve, reject) => {
          if (document.querySelector('script[data-leaflet-osm]')) { resolve(); return; }
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
          document.head.appendChild(link);
          const script = document.createElement('script');
          script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
          script.setAttribute('data-leaflet-osm', '1');
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('leaflet load failed'));
          document.head.appendChild(script);
        });
      }
      if (cancelled || !containerRef.current || mapRef.current) return;
      const Leaflet: any = (window as any).L;
      if (!Leaflet) return;

      const initialCenter = center || markers[0] || { lat: -4.3276, lng: 15.3136 };
      const map = Leaflet.map(containerRef.current, {
        zoomControl: false,
        attributionControl: false,
      }).setView([initialCenter.lat, initialCenter.lng], zoom);

      Leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap',
      }).addTo(map);

      const allPoints: Location[] = [];
      if (center) allPoints.push(center);
      markers.forEach(m => allPoints.push(m));

      // Marqueurs : premier = vert (pickup), autres = bleus
      allPoints.forEach((p, idx) => {
        const isPickup = idx === 0 && center && p.lat === center.lat && p.lng === center.lng;
        const html = isPickup
          ? '<div style="width:18px;height:18px;background:#10b981;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.35)"></div>'
          : '<div style="width:28px;height:28px;background:#0ea5e9;border:2px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.3);font-size:14px">🚗</div>';
        const icon = Leaflet.divIcon({
          html,
          className: '',
          iconSize: isPickup ? [18, 18] : [28, 28],
          iconAnchor: isPickup ? [9, 9] : [14, 14],
        });
        Leaflet.marker([p.lat, p.lng], { icon }).addTo(map);
      });

      if (allPoints.length > 1) {
        try {
          const bounds = Leaflet.latLngBounds(allPoints.map(p => [p.lat, p.lng] as [number, number]));
          map.fitBounds(bounds.pad(0.35));
        } catch {}
      }

      mapRef.current = map;
      setTimeout(() => { try { map.invalidateSize(); } catch {} }, 200);
    };

    init();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        try { mapRef.current.remove(); } catch {}
        mapRef.current = null;
      }
    };
  }, [center?.lat, center?.lng, JSON.stringify(markers), zoom]);

  return (
    <div className={`relative ${className}`}>
      <div ref={containerRef} className="absolute inset-0" />
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
