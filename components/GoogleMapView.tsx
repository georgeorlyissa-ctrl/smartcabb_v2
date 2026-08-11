/**
 * 🗺️ GOOGLE MAPS VIEW - CARTE INTERACTIVE
 *
 * @version 2.0.0
 */

import { useEffect, useRef, useState } from 'react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { toast } from '../lib/toast';

declare global {
  interface Window { google: any; }
}

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

interface GoogleMapViewProps {
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
  // ✅ NOUVEAU : callback pour notifier MapView d'une erreur fatale
  onError?: (reason: string) => void;
}

// ─── Chargement du script Google Maps ────────────────────────
const loadGoogleMapsScript = async (): Promise<void> => {
  return new Promise(async (resolve, reject) => {
    try {
      if (window.google?.maps?.Map) {
        resolve();
        return;
      }

      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
      if (existingScript) {
        const waitForGoogleMaps = () => {
          if (window.google?.maps?.Map) { resolve(); }
          else { setTimeout(waitForGoogleMaps, 100); }
        };
        waitForGoogleMaps();
        return;
      }

      // ✅ Récupérer la clé depuis le backend
      console.log('🔑 Récupération de la clé Google Maps API...');
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/config/google-maps-key`,
        { headers: { 'Authorization': `Bearer ${publicAnonKey}` } }
      );

      if (!response.ok) {
        throw new Error(`Clé API non disponible (HTTP ${response.status})`);
      }

      const data = await response.json();
      if (!data.success || !data.apiKey) {
        throw new Error('Clé API Google Maps non configurée dans Supabase');
      }

      const GOOGLE_MAPS_API_KEY = data.apiKey;
      console.log('✅ Clé API Google Maps récupérée');

      const callbackName = 'initGoogleMaps_' + Date.now();
      (window as any)[callbackName] = () => {
        const waitForMap = () => {
          if (window.google?.maps?.Map) {
            delete (window as any)[callbackName];
            resolve();
          } else {
            setTimeout(waitForMap, 50);
          }
        };
        waitForMap();
      };

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places,geometry&loading=async&callback=${callbackName}`;
      script.async = true;
      script.defer = true;
      script.onerror = (err) => {
        delete (window as any)[callbackName];
        reject(new Error('Échec chargement script Google Maps'));
      };
      document.head.appendChild(script);

    } catch (error) {
      reject(error);
    }
  });
};

export function GoogleMapView({
  center = { lat: -4.3276, lng: 15.3136 },
  markers = [],
  drivers = [],
  zoom = 13,
  className = '',
  showUserLocation = true,
  onLocationUpdate,
  enableGeolocation = true,
  showRoute = false,
  routeStart,
  routeEnd,
  pickup,
  destination,
  vehicleLocation,
  onMapClick,
  isSelectingOnMap = false,
  enableZoomControls = false,
  disableAutoCenter = false,
  showTraffic = true,
  height = 'h-full',
  onError, // ✅ NOUVEAU
}: GoogleMapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const vehicleMarkerRef = useRef<any>(null);
  const directionsRendererRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const driverMarkersRef = useRef<any[]>([]);
  const routeMarkersRef = useRef<{ start: any; end: any }>({ start: null, end: null });

  // ✅ FIX COÛT — cache de la dernière route affichée
  const lastRouteKeyRef = useRef<string>("");

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentZoom, setCurrentZoom] = useState(zoom);
  const [userLocation, setUserLocation] = useState<Location | null>(null);
  const [userInteracted, setUserInteracted] = useState(false);

  const effectiveRouteStart = routeStart || pickup;
  const effectiveRouteEnd = routeEnd || destination;
  const effectiveShowRoute = showRoute || (pickup && destination);

  // ─── Initialisation de la carte ──────────────────────────────
  useEffect(() => {
    let mounted = true;

    const initMap = async () => {
      try {
        console.log('🗺️ Chargement de Google Maps...');
        await loadGoogleMapsScript();

        if (!mounted || !mapRef.current) return;

        const map = new window.google.maps.Map(mapRef.current, {
          center,
          zoom,
          zoomControl: false,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          styles: [
            { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] }
          ]
        });

        mapInstanceRef.current = map;

        if (showTraffic) {
          const trafficLayer = new window.google.maps.TrafficLayer();
          trafficLayer.setMap(map);
        }

        if (onMapClick) {
          map.addListener('click', (e: any) => {
            if (e.latLng) onMapClick(e.latLng.lat(), e.latLng.lng());
          });
        }

        map.addListener('zoom_changed', () => {
          const newZoom = map.getZoom();
          if (newZoom) setCurrentZoom(newZoom);
          if (disableAutoCenter) setUserInteracted(true);
        });

        map.addListener('dragstart', () => {
          if (disableAutoCenter) setUserInteracted(true);
        });

        setIsLoading(false);
        console.log('✅ Carte Google Maps créée avec succès');

      } catch (err: any) {
        console.error('❌ Erreur initialisation Google Maps:', err);
        const reason = err?.message || 'Erreur inconnue';

        // ✅ Notifier MapView pour basculer sur OpenStreetMap
        if (onError) {
          onError(reason);
        } else {
          // Fallback si onError non fourni : afficher message local
          setError('Impossible de charger Google Maps');
        }
        setIsLoading(false);
      }
    };

    initMap();
    return () => { mounted = false; };
  }, []);

  // ─── Géolocalisation ─────────────────────────────────────────
  useEffect(() => {
    if (!enableGeolocation || !showUserLocation) return;
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const newLocation: Location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setUserLocation(newLocation);
        if (onLocationUpdate) onLocationUpdate(newLocation);

        if (mapInstanceRef.current && !userMarkerRef.current) {
          mapInstanceRef.current.panTo(newLocation);
        }

        if (mapInstanceRef.current) {
          if (userMarkerRef.current) {
            userMarkerRef.current.setPosition(newLocation);
          } else {
            userMarkerRef.current = new window.google.maps.Marker({
              position: newLocation,
              map: mapInstanceRef.current,
              icon: {
                path: window.google.maps.SymbolPath.CIRCLE,
                scale: 8,
                fillColor: '#3B82F6',
                fillOpacity: 1,
                strokeColor: '#FFFFFF',
                strokeWeight: 3
              },
              title: 'Votre position',
              zIndex: 1000
            });

            new window.google.maps.Circle({
              map: mapInstanceRef.current,
              center: newLocation,
              radius: position.coords.accuracy,
              fillColor: '#3B82F6',
              fillOpacity: 0.1,
              strokeColor: '#3B82F6',
              strokeOpacity: 0.3,
              strokeWeight: 1
            });
          }
        }
      },
      (error) => {
        // Fallback silencieux vers Kinshasa
        if (error.code === error.PERMISSION_DENIED) {
          const defaultLocation: Location = { lat: -4.3276, lng: 15.3136, address: 'Kinshasa, RDC' };
          setUserLocation(defaultLocation);
          if (onLocationUpdate) onLocationUpdate(defaultLocation);
          if (mapInstanceRef.current && !userMarkerRef.current) {
            mapInstanceRef.current.panTo(defaultLocation);
          }
        }
        console.error('❌ Timeout de géolocalisation', { code: error.code, message: error.message });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [enableGeolocation, showUserLocation, onLocationUpdate]);

  // ─── Marqueurs simples ────────────────────────────────────────
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];

    markers.forEach((location, index) => {
      const marker = new window.google.maps.Marker({
        position: location,
        map: mapInstanceRef.current!,
        title: location.address || `Marqueur ${index + 1}`,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 6,
          fillColor: '#EF4444',
          fillOpacity: 1,
          strokeColor: '#FFFFFF',
          strokeWeight: 2
        }
      });
      markersRef.current.push(marker);
    });
  }, [markers]);

  // ─── Marqueurs conducteurs ────────────────────────────────────
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    driverMarkersRef.current.forEach(m => m.setMap(null));
    driverMarkersRef.current = [];

    drivers.forEach((driver) => {
      const carIcon = {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
          <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
            <circle cx="16" cy="16" r="14" fill="#10B981" stroke="white" stroke-width="2"/>
            <text x="16" y="21" font-size="16" text-anchor="middle" fill="white">🚗</text>
          </svg>
        `),
        scaledSize: new window.google.maps.Size(32, 32),
        anchor: new window.google.maps.Point(16, 16)
      };

      const marker = new window.google.maps.Marker({
        position: driver.location,
        map: mapInstanceRef.current!,
        icon: carIcon,
        title: driver.name || 'Conducteur disponible'
      });

      const infoWindow = new window.google.maps.InfoWindow({
        content: `<div style="padding:8px;"><strong>${driver.name || 'Conducteur'}</strong><br/>${driver.rating ? `⭐ ${driver.rating.toFixed(1)}` : ''}</div>`
      });
      marker.addListener('click', () => infoWindow.open(mapInstanceRef.current!, marker));
      driverMarkersRef.current.push(marker);
    });
  }, [drivers]);

  // ─── Itinéraire ──────────────────────────────────────────────
  useEffect(() => {
    if (!mapInstanceRef.current || !effectiveShowRoute || !effectiveRouteStart || !effectiveRouteEnd) {
      if (directionsRendererRef.current) { directionsRendererRef.current.setMap(null); directionsRendererRef.current = null; }
      if (routeMarkersRef.current.start) { routeMarkersRef.current.start.setMap(null); routeMarkersRef.current.start = null; }
      if (routeMarkersRef.current.end) { routeMarkersRef.current.end.setMap(null); routeMarkersRef.current.end = null; }
      return;
    }

    // ✅ FIX COÛT — cache de route : si les coordonnées n'ont pas changé (arrondi ~11m), on ne rappelle PAS l'API
    const routeKey = [
      effectiveRouteStart.lat.toFixed(4),
      effectiveRouteStart.lng.toFixed(4),
      effectiveRouteEnd.lat.toFixed(4),
      effectiveRouteEnd.lng.toFixed(4),
    ].join('|');

    if (routeKey === lastRouteKeyRef.current) {
      return;
    }

    lastRouteKeyRef.current = routeKey;
    console.log('🗺️ Nouveau tracé de route détecté, appel API Directions:', routeKey);

    const createRouteMarkers = (start: Location, end: Location) => {
      if (!mapInstanceRef.current) return;
      if (routeMarkersRef.current.start) routeMarkersRef.current.start.setMap(null);
      if (routeMarkersRef.current.end) routeMarkersRef.current.end.setMap(null);

      routeMarkersRef.current.start = new window.google.maps.Marker({
        position: start, map: mapInstanceRef.current,
        icon: { url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`<svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><circle cx="24" cy="24" r="20" fill="#10B981" stroke="white" stroke-width="4"/><text x="24" y="30" font-size="20" text-anchor="middle" fill="white">🚗</text></svg>`), scaledSize: new window.google.maps.Size(48, 48), anchor: new window.google.maps.Point(24, 24) },
        title: `Départ: ${start.address || 'Point de départ'}`, zIndex: 3000, optimized: false
      });

      routeMarkersRef.current.end = new window.google.maps.Marker({
        position: end, map: mapInstanceRef.current,
        icon: { url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`<svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><circle cx="24" cy="24" r="20" fill="#EF4444" stroke="white" stroke-width="4"/><circle cx="24" cy="24" r="8" fill="white"/></svg>`), scaledSize: new window.google.maps.Size(48, 48), anchor: new window.google.maps.Point(24, 24) },
        title: `Destination: ${end.address || "Point d'arrivée"}`, zIndex: 3000, optimized: false
      });

      if (!disableAutoCenter || !userInteracted) {
        const bounds = new window.google.maps.LatLngBounds();
        bounds.extend(start);
        bounds.extend(end);
        mapInstanceRef.current.fitBounds(bounds);
      }
    };

    const fetchDirections = async () => {
      try {
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/google-maps/directions?origin=${effectiveRouteStart.lat},${effectiveRouteStart.lng}&destination=${effectiveRouteEnd.lat},${effectiveRouteEnd.lng}`,
          { headers: { 'Authorization': `Bearer ${publicAnonKey}` } }
        );

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();

        if (data.success && data.status === 'OK' && data.routes?.length > 0) {
          if (!directionsRendererRef.current) {
            directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
              map: mapInstanceRef.current, suppressMarkers: true,
              polylineOptions: { strokeColor: '#3B82F6', strokeWeight: 8, strokeOpacity: 1.0, zIndex: 1000 }
            });
          }
          const directionsResult = {
            routes: data.routes.map((route: any) => ({
              ...route,
              overview_path: window.google.maps.geometry.encoding.decodePath(route.overview_polyline.points)
            })),
            geocoded_waypoints: data.geocoded_waypoints || []
          };
          directionsRendererRef.current.setDirections(directionsResult);
          createRouteMarkers(effectiveRouteStart, effectiveRouteEnd);
        } else {
          throw new Error(data.error || 'Aucun itinéraire');
        }
      } catch (error) {
        console.warn('⚠️ Backend Directions échoué, fallback frontend:', error);
        fallbackDirections();
      }
    };

    const fallbackDirections = () => {
      if (!mapInstanceRef.current) return;

      const directionsService = new window.google.maps.DirectionsService();
      if (!directionsRendererRef.current) {
        directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
          map: mapInstanceRef.current, suppressMarkers: true,
          polylineOptions: { strokeColor: '#3B82F6', strokeWeight: 8, strokeOpacity: 1.0, zIndex: 1000 }
        });
      }

      directionsService.route(
        { origin: effectiveRouteStart, destination: effectiveRouteEnd, travelMode: window.google.maps.TravelMode.DRIVING },
        (result: any, status: any) => {
          if (status === window.google.maps.DirectionsStatus.OK && result) {
            directionsRendererRef.current?.setDirections(result);
            createRouteMarkers(effectiveRouteStart!, effectiveRouteEnd!);
          } else {
            // Fallback ultime : ligne droite
            new window.google.maps.Polyline({
              path: [effectiveRouteStart, effectiveRouteEnd], geodesic: true,
              strokeColor: '#3B82F6', strokeOpacity: 0.6, strokeWeight: 6,
              map: mapInstanceRef.current, zIndex: 1000
            });
            createRouteMarkers(effectiveRouteStart!, effectiveRouteEnd!);
          }
        }
      );
    };

    fetchDirections();
  }, [effectiveShowRoute, effectiveRouteStart, effectiveRouteEnd]);

  // ─── Marqueur véhicule ────────────────────────────────────────
  const vehicleAnimRef = useRef<number | null>(null);

  // Déplacement fluide du marqueur véhicule (lerp animé ~1.5s)
  const animateVehicleTo = (marker: any, target: Location) => {
    const start = marker.getPosition();
    const startLat = start.lat();
    const startLng = start.lng();
    const duration = 1500;
    const startTime = performance.now();

    if (vehicleAnimRef.current) cancelAnimationFrame(vehicleAnimRef.current);

    const step = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      // Easing easeInOutQuad
      const eased = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      marker.setPosition({
        lat: startLat + (target.lat - startLat) * eased,
        lng: startLng + (target.lng - startLng) * eased,
      });
      if (progress < 1) {
        vehicleAnimRef.current = requestAnimationFrame(step);
      } else {
        vehicleAnimRef.current = null;
      }
    };
    vehicleAnimRef.current = requestAnimationFrame(step);
  };

  useEffect(() => {
    if (!mapInstanceRef.current || !vehicleLocation) {
      if (vehicleMarkerRef.current) { vehicleMarkerRef.current.setMap(null); vehicleMarkerRef.current = null; }
      return;
    }
    if (vehicleMarkerRef.current) {
      // ✅ SUIVI TEMPS RÉEL — déplacement fluide (lerp animé) au lieu d'un saut brusque
      animateVehicleTo(vehicleMarkerRef.current, vehicleLocation);
      // Suivre le véhicule tant que l'utilisateur n'a pas déplacé la carte
      if (!userInteracted) {
        mapInstanceRef.current.panTo(vehicleLocation);
      }
    } else {
      const carIcon = {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`<svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><circle cx="24" cy="24" r="20" fill="#10B981" stroke="white" stroke-width="3"/><text x="24" y="30" font-size="20" text-anchor="middle" fill="white">🚗</text></svg>`),
        scaledSize: new window.google.maps.Size(48, 48),
        anchor: new window.google.maps.Point(24, 24)
      };
      vehicleMarkerRef.current = new window.google.maps.Marker({
        position: vehicleLocation, map: mapInstanceRef.current,
        icon: carIcon, title: 'Véhicule en cours', zIndex: 2000
      });
      mapInstanceRef.current.panTo(vehicleLocation);
    }
  }, [vehicleLocation, userInteracted]);

  // ─── Contrôles zoom ───────────────────────────────────────────
  const handleZoomIn = () => { if (mapInstanceRef.current) mapInstanceRef.current.setZoom((mapInstanceRef.current.getZoom() || zoom) + 1); };
  const handleZoomOut = () => { if (mapInstanceRef.current) mapInstanceRef.current.setZoom((mapInstanceRef.current.getZoom() || zoom) - 1); };
  const handleRecenter = () => { if (mapInstanceRef.current && userLocation) { mapInstanceRef.current.panTo(userLocation); mapInstanceRef.current.setZoom(15); } };

  // ✅ Si erreur ET pas de onError fourni → afficher message local
  if (error && !onError) {
    return (
      <div className={`relative ${className}`}>
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-center p-4">
            <p className="text-red-600 font-medium">⚠️ {error}</p>
            <button onClick={() => window.location.reload()} className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg">
              Réessayer
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div ref={mapRef} className={`absolute inset-0 ${height}`} />

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
          <div className="text-center">
            <svg className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
            <p className="text-sm text-gray-600">Chargement de la carte...</p>
          </div>
        </div>
      )}

      {enableZoomControls && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-10">
          <button onClick={handleZoomIn} className="w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors">
            <svg className="w-5 h-5 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
          <button onClick={handleZoomOut} className="w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors">
            <svg className="w-5 h-5 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
        </div>
      )}

      {showUserLocation && userLocation && !disableAutoCenter && (
        <button onClick={handleRecenter} className="absolute right-4 bottom-20 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors z-10">
          <svg className="w-5 h-5 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
        </button>
      )}

      {isSelectingOnMap && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg text-sm font-medium z-10">
          📍 Touchez la carte pour sélectionner un lieu
        </div>
      )}
    </div>
  );
}
