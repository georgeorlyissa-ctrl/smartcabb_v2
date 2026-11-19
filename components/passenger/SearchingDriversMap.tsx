/**
 * 🗺️ Carte de l'écran « recherche de chauffeur ».
 *
 * Affiche en direct :
 *  - le point de prise en charge = icône BONHOMME (le passager) ;
 *  - un marqueur par conducteur connecté (position GPS + prénom).
 *
 * Aucune clé Google requise : même carte OpenStreetMap/Leaflet et mêmes icônes
 * que le repli de `MapView` (voir `components/map/mapMarkers.ts`).
 */

import { OpenStreetMapView, type MapDriverMarker } from '../OpenStreetMapView';

export type MapDriver = MapDriverMarker;

interface Props {
  /** Position du passager (point de prise en charge). */
  center: { lat: number; lng: number };
  /** Conducteurs actuellement connectés. */
  drivers?: MapDriver[];
  className?: string;
}

export function SearchingDriversMap({ center, drivers = [], className = '' }: Props) {
  return (
    <OpenStreetMapView
      center={center}
      pickup={center}
      drivers={drivers}
      zoom={15}
      className={`w-full h-full ${className}`}
    />
  );
}

export default SearchingDriversMap;
