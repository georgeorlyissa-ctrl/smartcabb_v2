/**
 * 🗺️ MAP VIEW - WRAPPER INTELLIGENT
 * 
 * Essaie Google Maps en premier, puis bascule vers OpenStreetMap si erreur
 * (RefererNotAllowedMapError, ApiNotActivatedMapError, etc.)
 * 
 * @version 1.0.0
 * @date 2026-01-30
 */

import { useEffect, useState } from 'react';
import { GoogleMapView } from './GoogleMapView';
import { OpenStreetMapView } from './OpenStreetMapView';

// Types
interface Location {
  lat: number;
  lng: number;
  address?: string;
}

interface Driver {
  id: string;
  name?: string;
  location: Location;
  vehicleType?: string;
  rating?: number;
}

interface MapViewProps {
  center?: Location;
  markers?: Location[];
  drivers?: Driver[];
  zoom?: number;
  className?: string;
  showUserLocation?: boolean;
  onLocationUpdate?: (location: Location) => void;
  enableGeolocation?: boolean;
  showRoute?: boolean;
  routeStart?: Location;
  routeEnd?: Location;
  pickup?: Location;
  destination?: Location;
  vehicleLocation?: Location;
  onMapClick?: (lat: number, lng: number) => void;
  isSelectingOnMap?: boolean;
  enableZoomControls?: boolean;
  disableAutoCenter?: boolean;
  showTraffic?: boolean;
  height?: string;
}

export function MapView(props: MapViewProps) {
  const [useOpenStreetMap, setUseOpenStreetMap] = useState(false);
  const [googleMapsError, setGoogleMapsError] = useState<string | null>(null);

  useEffect(() => {
    // Écouter les erreurs Google Maps globales
    const errorListener = (event: ErrorEvent | any) => {

      const errorMsg = event?.message || event?.error?.message || String(event);
      

      // Protection contre les erreurs undefined
      if (!event) return;
      
      const errorMsg = event?.message || event?.error?.message || String(event);
      
      // ✅ BLOQUER SILENCIEUSEMENT les "Script error" (erreurs cross-origin)
      if (errorMsg === 'Script error.' || errorMsg === 'Script error') {
        event.preventDefault && event.preventDefault();
        event.stopPropagation && event.stopPropagation();
        event.stopImmediatePropagation && event.stopImmediatePropagation();
        return;
      }
      

      if (errorMsg.includes('RefererNotAllowedMapError') || 
          errorMsg.includes('ApiNotActivatedMapError') ||
          errorMsg.includes('InvalidKeyMapError') ||
          errorMsg.includes('MissingKeyMapError')) {
        
        console.warn('⚠️ Erreur Google Maps API détectée:', errorMsg);
        console.log('🔄 Basculement vers OpenStreetMap...');
        
        setGoogleMapsError(errorMsg);
        setUseOpenStreetMap(true);

      }
    };

    // Écouter les erreurs globales
    window.addEventListener('error', errorListener);

        
        // Empêcher la propagation de l'erreur
        event.preventDefault && event.preventDefault();
        event.stopPropagation && event.stopPropagation();
        event.stopImmediatePropagation && event.stopImmediatePropagation();
      }
    };

    // Écouter les erreurs globales - AVEC CAPTURE POUR BLOQUER AVANT LES AUTRES
    window.addEventListener('error', errorListener, true); // true = capture phase


    // Intercepter console.error pour détecter les erreurs Google Maps
    const originalConsoleError = console.error;
    console.error = (...args: any[]) => {

      const errorStr = args.join(' ');
      if (errorStr.includes('Google Maps') && 
          (errorStr.includes('RefererNotAllowedMapError') || 
           errorStr.includes('ApiNotActivatedMapError') ||
           errorStr.includes('InvalidKeyMapError'))) {
        console.warn('⚠️ Erreur Google Maps détectée via console.error');
        setUseOpenStreetMap(true);
      }
      originalConsoleError.apply(console, args);
    };

    return () => {
      window.removeEventListener('error', errorListener);

      try {
        const errorStr = args.join(' ');
        if (errorStr.includes('Google Maps') && 
            (errorStr.includes('RefererNotAllowedMapError') || 
             errorStr.includes('ApiNotActivatedMapError') ||
             errorStr.includes('InvalidKeyMapError'))) {
          console.warn('⚠️ Erreur Google Maps détectée via console.error');
          setUseOpenStreetMap(true);
        }
        originalConsoleError.apply(console, args);
      } catch (err) {
        // Protection en cas d'erreur dans le gestionnaire
        originalConsoleError.apply(console, args);
      }
    };

    return () => {
      window.removeEventListener('error', errorListener, true); // true = capture phase

      console.error = originalConsoleError;
    };
  }, []);

  // Si on doit utiliser OpenStreetMap
  if (useOpenStreetMap) {
    console.log('🗺️ Affichage de OpenStreetMap (fallback)');
    
    return (
      <div className="relative w-full h-full">
        {/* Message d'information */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium z-50">
          🗺️ Mode carte simplifié (OpenStreetMap)
        </div>
        
        <OpenStreetMapView
          center={props.center}
          markers={props.markers}
          zoom={props.zoom}
          className={props.className}
          height={props.height}
        />
      </div>
    );
  }

  // Par défaut, utiliser Google Maps
  console.log('🗺️ Tentative d\'affichage avec Google Maps');
  
  return (
    <GoogleMapView {...props} />
  );
}
