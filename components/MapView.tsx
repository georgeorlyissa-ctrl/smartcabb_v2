/**
 * 🗺️ MAP VIEW - WRAPPER INTELLIGENT
 *
 * Essaie Google Maps en premier, puis bascule vers OpenStreetMap si erreur
 * (clé API manquante, RefererNotAllowedMapError, ApiNotActivatedMapError, etc.)
 *
 * @version 2.0.0
 */
import { useEffect, useState } from 'react';
import { GoogleMapView } from './GoogleMapView';
import { OpenStreetMapView } from './OpenStreetMapView';

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
  // ✅ Par défaut on tente Google Maps
  const [useOpenStreetMap, setUseOpenStreetMap] = useState(false);

  useEffect(() => {
    // Écouter les erreurs Google Maps globales (RefererNotAllowedMapError, BillingNotEnabled, etc.)
    const errorListener = (event: ErrorEvent | any) => {
      const errorMsg = event?.message || event?.error?.message || String(event);
      if (
        errorMsg.includes('RefererNotAllowedMapError') ||
        errorMsg.includes('ApiNotActivatedMapError') ||
        errorMsg.includes('InvalidKeyMapError') ||
        errorMsg.includes('MissingKeyMapError') ||
        errorMsg.includes('BillingNotEnabledMapError') ||
        errorMsg.includes('BillingNotEnabled') ||
        errorMsg.includes('This page can\'t load Google Maps correctly') ||
        errorMsg.includes('You must enable Billing')
      ) {
        console.warn('⚠️ Erreur Google Maps globale détectée:', errorMsg);
        console.log('🔄 Basculement vers OpenStreetMap...');
        setUseOpenStreetMap(true);
      }
    };

    // Google Maps appelle window.gm_authFailure en cas de problème de clé/billing
    const prevAuthFailure = (window as any).gm_authFailure;
    (window as any).gm_authFailure = () => {
      console.warn('⚠️ gm_authFailure détecté (clé/billing)');
      setUseOpenStreetMap(true);
      if (typeof prevAuthFailure === 'function') prevAuthFailure();
    };

    window.addEventListener('error', errorListener);
    return () => {
      window.removeEventListener('error', errorListener);
      if ((window as any).gm_authFailure && (window as any).gm_authFailure.toString().includes('setUseOpenStreetMap')) {
        (window as any).gm_authFailure = prevAuthFailure;
      }
    };
  }, []);

  // ✅ Callback appelé par GoogleMapView quand il échoue
  const handleGoogleMapsError = (reason: string) => {
    console.warn('⚠️ GoogleMapView a signalé une erreur:', reason);
    console.log('🔄 Basculement automatique vers OpenStreetMap...');
    setUseOpenStreetMap(true);
  };

  // ─── Fallback OpenStreetMap ───────────────────────────────
  if (useOpenStreetMap) {
    // Construire la liste de marqueurs pour OSM
    const osmMarkers: Location[] = [];
    if (props.center) osmMarkers.push(props.center);
    if (props.pickup) osmMarkers.push(props.pickup);
    if (props.destination) osmMarkers.push(props.destination);
    if (props.routeStart) osmMarkers.push(props.routeStart);
    if (props.routeEnd) osmMarkers.push(props.routeEnd);
    if (props.markers) osmMarkers.push(...props.markers);
    if (props.drivers) props.drivers.forEach(d => osmMarkers.push(d.location));
    // ✅ SUIVI TEMPS RÉEL — afficher aussi le véhicule en mode OSM
    if (props.vehicleLocation) osmMarkers.push(props.vehicleLocation);

    return (
      <div className="relative w-full h-full">
        {/* Bandeau informatif */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-orange-500 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium z-50 whitespace-nowrap">
          🗺️ Mode carte simplifié (OpenStreetMap)
        </div>

        <OpenStreetMapView
          center={props.center || props.pickup}
          markers={osmMarkers.length > 0 ? osmMarkers : undefined}
          zoom={props.zoom}
          className={props.className}
        />
      </div>
    );
  }

  // ─── Google Maps (défaut) ─────────────────────────────────
  return (
    <GoogleMapView
      {...props}
      // ✅ onError : quand GoogleMapView échoue, MapView bascule sur OSM
      onError={handleGoogleMapsError}
    />
  );
}
