import { useEffect, useState } from 'react';

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
 * Composant de carte OpenStreetMap réutilisable
 * Affiche une carte interactive OpenStreetMap avec des marqueurs
 */
export function OpenStreetMapView({ 
  center, 
  markers = [], 
  zoom = 14,
  className = "w-full h-full",
  showAttribution = true
}: OpenStreetMapViewProps) {
  const [mapUrl, setMapUrl] = useState<string>('');

  useEffect(() => {
    // Calculer la bounding box pour inclure tous les marqueurs
    const allPoints = markers.length > 0 ? markers : (center ? [center] : []);
    
    if (allPoints.length === 0) {
      // Carte par défaut de Kinshasa
      setMapUrl('https://www.openstreetmap.org/export/embed.html?bbox=15.2136,-4.4276,15.4136,-4.2276&layer=mapnik');
      return;
    }

    const lats = allPoints.map(p => p.lat);
    const lngs = allPoints.map(p => p.lng);
    
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    // Ajouter une marge de 0.02 degrés autour de la bounding box
    const margin = 0.02;
    const bbox = `${minLng - margin},${minLat - margin},${maxLng + margin},${maxLat + margin}`;

    // Ajouter les marqueurs à l'URL
    const markerParams = allPoints.map(m => `&marker=${m.lat},${m.lng}`).join('');
    
    const url = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik${markerParams}`;
    setMapUrl(url);
  }, [center, markers, zoom]);

  return (
    <div className={`relative ${className}`}>
      {mapUrl ? (
        <>
          <iframe
            width="100%"
            height="100%"
            frameBorder="0"
            scrolling="no"
            marginHeight={0}
            marginWidth={0}
            src={mapUrl}
            style={{ border: 0 }}
            className="w-full h-full"
            title="Carte OpenStreetMap"
          />
          
          {showAttribution && (
            <div className="absolute bottom-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded text-xs pointer-events-auto z-10 shadow-sm">
              © <a 
                href="https://www.openstreetmap.org/copyright" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                OpenStreetMap
              </a>
            </div>
          )}
        </>
      ) : (
        <div className="w-full h-full bg-gray-100 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-2 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            <p className="text-sm">Chargement de la carte...</p>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Variante simplifiée pour une carte statique de Kinshasa
 */
export function KinshasaMapView({ className = "w-full h-full" }: { className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <iframe
        width="100%"
        height="100%"
        frameBorder="0"
        scrolling="no"
        marginHeight={0}
        marginWidth={0}
        src="https://www.openstreetmap.org/export/embed.html?bbox=15.2136,-4.4276,15.4136,-4.2276&layer=mapnik"
        style={{ border: 0 }}
        className="w-full h-full"
        title="Carte de Kinshasa"
      />
      
      <div className="absolute bottom-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded text-xs pointer-events-auto z-10 shadow-sm">
        © <a 
          href="https://www.openstreetmap.org/copyright" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          OpenStreetMap
        </a>
      </div>
    </div>
  );
}
