/**
 * 🗺️ MAP VIEW - WRAPPER INTELLIGENT
 *
 * Essaie Google Maps en premier, puis bascule vers OpenStreetMap si erreur
 * (clé API manquante, RefererNotAllowedMapError, ApiNotActivatedMapError, etc.)
 *
 * @version 2.1.0
 */
import { useEffect, useRef, useState } from 'react';
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
  /** false = déjà en course (marqueur grisé). */
  available?: boolean;
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
  /**
   * Qui regarde la carte ? Sert au repli OpenStreetMap pour dessiner la position
   * de l'utilisateur : bonhomme (passager, par défaut) ou voiture (conducteur).
   */
  userRole?: 'passenger' | 'driver';
  /**
   * Fournisseur de carte.
   * - `auto` (défaut) : Google Maps, puis repli OpenStreetMap en cas d'échec ;
   * - `osm` : OpenStreetMap directement (carte « intérimaire », sans clé/billing) ;
   * - `google` : Google Maps uniquement.
   */
  provider?: 'auto' | 'osm' | 'google';
  /** Itinéraires tracés sur la carte OSM (alternatives incluses). */
  routes?: Array<{ id: string; path: [number, number][]; active?: boolean }>;
}

/**
 * Détecte les échecs venant de Google Maps lui-même : clé restreinte, billing
 * désactivé, ou bug interne de la librairie (ex. sur iOS/Safari :
 * « Argument 1 ('target') to IntersectionObserver.observe must be an instance
 * of Element »). Dans tous ces cas on préfère la carte OpenStreetMap.
 */
function looksLikeGoogleMapsFailure(filename?: string, message?: string): boolean {
  const file = filename || '';
  const msg = message || '';
  return (
    file.includes('maps.googleapis.com') ||
    file.includes('maps.gstatic.com') ||
    msg.includes('RefererNotAllowedMapError') ||
    msg.includes('ApiNotActivatedMapError') ||
    msg.includes('InvalidKeyMapError') ||
    msg.includes('MissingKeyMapError') ||
    msg.includes('BillingNotEnabledMapError') ||
    msg.includes('BillingNotEnabled') ||
    msg.includes("This page can't load Google Maps correctly") ||
    msg.includes('You must enable Billing') ||
    msg.includes('IntersectionObserver.observe must be an instance of Element') ||
    msg.includes('gm_authFailure')
  );
}

export function MapView(props: MapViewProps) {
  // ✅ Par défaut on tente Google Maps ; `provider="osm"` force la carte
  // intérimaire (OpenStreetMap) tant que la facturation Google n'est pas active.
  const [useOpenStreetMap, setUseOpenStreetMap] = useState(props.provider === 'osm');
  const providerRef = useRef(props.provider);

  useEffect(() => {
    if (providerRef.current === props.provider) return;
    providerRef.current = props.provider;
    if (props.provider === 'osm') setUseOpenStreetMap(true);
    if (props.provider === 'google') setUseOpenStreetMap(false);
  }, [props.provider]);

  // 🛟 Filet de sécurité : Google Maps peut échouer SANS lever d'erreur (clé
  // refusée, billing inactif) et laisser un rectangle noir. Si la carte n'est
  // pas prête au bout de 7 s, on bascule sur OpenStreetMap.
  useEffect(() => {
    if (useOpenStreetMap || props.provider === 'google') return;
    const timer = setTimeout(() => {
      try {
        if (!document.querySelector('.gm-style')) {
          console.warn('⚠️ Google Maps inactif après 7 s → bascule OpenStreetMap');
          setUseOpenStreetMap(true);
        }
      } catch { /* ignore */ }
    }, 7000);
    return () => clearTimeout(timer);
  }, [useOpenStreetMap, props.provider]);

  useEffect(() => {
    const switchToOpenStreetMap = (reason: string) => {
      console.warn('⚠️ Échec Google Maps détecté:', reason);
      console.log('🔄 Basculement automatique vers OpenStreetMap...');
      setUseOpenStreetMap(true);
    };

    // ─── Erreurs JS classiques ───────────────────────────────────────────────
    const errorListener = (event: ErrorEvent) => {
      const message = event?.message || (event as any)?.error?.message || '';
      if (looksLikeGoogleMapsFailure(event?.filename, message)) {
        switchToOpenStreetMap(message);
      }
    };

    // ─── Promesses rejetées (bug interne Google Maps sur iOS) ───────────────
    // La carte reste souvent utilisable, mais on bascule proprement sur OSM
    // pour éviter que l'erreur ne remonte à l'utilisateur.
    const rejectionListener = (event: PromiseRejectionEvent) => {
      const reason: any = (event as any)?.reason;
      const message = String(reason?.message || reason || '');
      const stack = String(reason?.stack || '');
      if (
        looksLikeGoogleMapsFailure(reason?.fileName, message) ||
        stack.includes('maps.googleapis.com') ||
        message.includes('IntersectionObserver')
      ) {
        switchToOpenStreetMap(message);
      }
    };

    // Google Maps appelle window.gm_authFailure en cas de problème de clé/billing
    const prevAuthFailure = (window as any).gm_authFailure;
    (window as any).gm_authFailure = () => {
      switchToOpenStreetMap('gm_authFailure (clé/billing)');
      if (typeof prevAuthFailure === 'function') prevAuthFailure();
    };

    window.addEventListener('error', errorListener);
    window.addEventListener('unhandledrejection', rejectionListener);
    return () => {
      window.removeEventListener('error', errorListener);
      window.removeEventListener('unhandledrejection', rejectionListener);
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
    // Chaque marqueur garde son RÔLE (avant : liste plate où tout, sauf le
    // premier point, devenait une voiture — et le départ, présent 3 fois,
    // apparaissait comme une voiture au lieu d'un passager).
    const pickupPoint = props.pickup || props.routeStart;
    const destinationPoint = props.destination || props.routeEnd;
    // Carte « ma position » (sans trajet) : on dessine l'utilisateur au centre.
    const userPoint = props.showUserLocation && !pickupPoint ? props.center : undefined;
    // Si l'écran gère lui-même le cadrage (suivi de course), le centre ne doit
    // pas bouger à chaque position GPS : on garde le point de départ comme ancre.
    const osmCenter = props.disableAutoCenter
      ? (pickupPoint || props.center)
      : (props.center || pickupPoint);
    const osmDrivers = (props.drivers || [])
      .filter(d => d?.location && Number.isFinite(d.location.lat) && Number.isFinite(d.location.lng))
      .map(d => ({
        id: d.id,
        name: d.name,
        lat: d.location.lat,
        lng: d.location.lng,
        available: d.available,
      }));

    return (
      <div className="relative w-full h-full">
        {/* Bandeau informatif — discret et dans le coin : il masquait auparavant
            le marqueur de destination sur les petites cartes. */}
        <div className="absolute top-2 left-2 bg-orange-500/90 text-white px-2 py-0.5 rounded-md shadow text-[10px] font-medium z-50 whitespace-nowrap pointer-events-none">
          🗺️ Carte simplifiée
        </div>

        <OpenStreetMapView
          center={osmCenter}
          pickup={pickupPoint}
          destination={destinationPoint}
          vehicle={props.vehicleLocation}
          drivers={osmDrivers}
          routes={props.routes}
          markers={props.markers}
          userMarker={userPoint}
          userRole={props.userRole}
          zoom={props.zoom}
          className={props.className}
          onMapClick={props.onMapClick}
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
