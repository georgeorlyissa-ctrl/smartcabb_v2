/**
 * 🗺️ INTERACTIVE MAP VIEW - ALIAS VERS MAP VIEW
 * 
 * ⚠️ DEPRECATED : Ce composant redirige maintenant vers MapView
 * qui gère automatiquement Google Maps + fallback OpenStreetMap
 * 
 * @deprecated Utilisez MapView directement
 */

import { MapView } from './MapView';

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

interface InteractiveMapViewProps {
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
  vehicleLocation?: Location;
  onMapClick?: (lat: number, lng: number) => void;
  isSelectingOnMap?: boolean;
  enableZoomControls?: boolean;
}

/**
 * Wrapper pour compatibilité avec l'ancien InteractiveMapView
 * Redirige vers MapView
 */
export function InteractiveMapView(props: InteractiveMapViewProps) {
  console.log('⚠️ InteractiveMapView est deprecated, utilisez MapView directement');
  
  // Rediriger tous les props vers MapView
  return <MapView {...props} />;
}