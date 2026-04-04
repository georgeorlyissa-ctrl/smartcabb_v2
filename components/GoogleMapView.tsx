/**
 * 🗺️ GOOGLE MAPS VIEW - CARTE INTERACTIVE
 * 
 * Utilise Google Maps JavaScript API pour afficher :
 * - Position actuelle de l'utilisateur
 * - Marqueurs personnalisés
 * - Itinéraires
 * - Conducteurs en temps réel
 * 
 * @version 1.0.0
 * @date 2026-01-21
 */

import { useEffect, useRef, useState } from 'react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { toast } from '../lib/toast';

// Déclaration TypeScript pour Google Maps API
declare global {
  interface Window {
    google: any;
  }
}

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
  pickup?: Location; // 🆕 Raccourci pour routeStart
  destination?: Location; // 🆕 Raccourci pour routeEnd
  vehicleLocation?: Location; // 🆕 Position du véhicule en temps réel
  onMapClick?: (lat: number, lng: number) => void;
  isSelectingOnMap?: boolean;
  enableZoomControls?: boolean; // 🆕 Contrôles de zoom
  disableAutoCenter?: boolean; // 🆕 Désactiver le re-centrage automatique lors d'interaction utilisateur
  showTraffic?: boolean; // 🆕 Afficher la couche de trafic (défaut: true)
  height?: string; // 🆕 Hauteur personnalisée (ex: "h-64", "h-full")
}

// Charger Google Maps API
const loadGoogleMapsScript = async (): Promise<void> => {
  return new Promise(async (resolve, reject) => {
    try {
      // Vérifier si déjà chargé et complètement initialisé
      if (window.google?.maps?.Map) {
        console.log('✅ Google Maps déjà chargé et initialisé');
        resolve();
        return;
      }

      // Vérifier si le script est déjà en cours de chargement
      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
      if (existingScript) {
        console.log('⏳ Script Google Maps en cours de chargement...');
        // Attendre que l'API soit complètement chargée
        const waitForGoogleMaps = () => {
          if (window.google?.maps?.Map) {
            console.log('✅ Google Maps maintenant initialisé');
            resolve();
          } else {
            setTimeout(waitForGoogleMaps, 100);
          }
        };
        waitForGoogleMaps();
        return;
      }

      // Récupérer la clé API depuis le backend
      console.log('🔑 Récupération de la clé Google Maps API...');
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/config/google-maps-key`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Impossible de récupérer la clé API Google Maps');
      }

      const data = await response.json();
      if (!data.success || !data.apiKey) {
        throw new Error('Clé API Google Maps non configurée');
      }

      const GOOGLE_MAPS_API_KEY = data.apiKey;
      console.log('✅ Clé API Google Maps récupérée');

      // 🆕 Écouter les erreurs Google Maps globales (RefererNotAllowedMapError)
      const originalConsoleError = console.error;
      const errorListener = (event: ErrorEvent | any) => {
        const errorMsg = event?.message || event?.error?.message || '';
        if (errorMsg.includes('RefererNotAllowedMapError') || 
            errorMsg.includes('ApiNotActivatedMapError') ||
            errorMsg.includes('InvalidKeyMapError')) {
          console.warn('⚠️ Erreur Google Maps API détectée:', errorMsg);
          console.warn('🔄 L\'application basculera vers OpenStreetMap');
          // L'erreur sera gérée dans le composant
        }
      };
      window.addEventListener('error', errorListener);

      // Créer une fonction callback globale pour l'initialisation
      const callbackName = 'initGoogleMaps_' + Date.now();
      (window as any)[callbackName] = () => {
        console.log('✅ Google Maps callback appelé');
        // Attendre que Map soit disponible
        const waitForMap = () => {
          if (window.google?.maps?.Map) {
            console.log('✅ Google Maps complètement initialisé');
            delete (window as any)[callbackName];
            resolve();
          } else {
            console.log('⏳ Attente de l\'initialisation de google.maps.Map...');
            setTimeout(waitForMap, 50);
          }
        };
        waitForMap();
      };

      // Charger le script Google Maps avec callback
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places,geometry&loading=async&callback=${callbackName}`;
      script.async = true;
      script.defer = true;
      script.onerror = (err) => {
        console.error('❌ Erreur chargement script Google Maps:', err);
        delete (window as any)[callbackName];
        reject(err);
      };
      document.head.appendChild(script);
    } catch (error) {
      console.error('❌ Erreur:', error);
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
  pickup, // 🆕
  destination, // 🆕
  vehicleLocation, // 🆕
  onMapClick,
  isSelectingOnMap = false,
  enableZoomControls = false, // 🆕
  disableAutoCenter = false, // 🆕
  showTraffic = true, // 🆕
  height = 'h-full' // 🆕
}: GoogleMapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const vehicleMarkerRef = useRef<any>(null); // 🆕 Marqueur véhicule
  const directionsRendererRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const driverMarkersRef = useRef<any[]>([]);
  const routeMarkersRef = useRef<{ start: any; end: any }>({ start: null, end: null }); // 🆕 Marqueurs départ/destination
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentZoom, setCurrentZoom] = useState(zoom);
  const [userLocation, setUserLocation] = useState<Location | null>(null);
  const [userInteracted, setUserInteracted] = useState(false); // 🆕 Détection d'interaction utilisateur

  // 🆕 Déduire routeStart/routeEnd depuis pickup/destination si non fournis
  const effectiveRouteStart = routeStart || pickup;
  const effectiveRouteEnd = routeEnd || destination;
  const effectiveShowRoute = showRoute || (pickup && destination);

  // 🗺️ Initialiser la carte
  useEffect(() => {
    let mounted = true;

    const initMap = async () => {
      try {
        console.log('🗺️ Chargement de Google Maps...');
        await loadGoogleMapsScript();

        if (!mounted || !mapRef.current) return;

        console.log('✅ Google Maps chargé, création de la carte...');

        // Créer la carte
        const map = new window.google.maps.Map(mapRef.current, {
          center: center,
          zoom: zoom,
          zoomControl: false, // On utilise nos propres boutons
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          styles: [
            // Style personnalisé pour un look moderne
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }]
            }
          ]
        });

        mapInstanceRef.current = map;

        // 🚦 ACTIVER LA COUCHE DE TRAFIC EN TEMPS RÉEL
        if (showTraffic) {
          const trafficLayer = new window.google.maps.TrafficLayer();
          trafficLayer.setMap(map);
          console.log('🚦 Couche de trafic Google Maps activée');
        }

        // Event click sur la carte
        if (onMapClick) {
          map.addListener('click', (e: any) => {
            if (e.latLng) {
              onMapClick(e.latLng.lat(), e.latLng.lng());
            }
          });
        }

        // Event zoom change
        map.addListener('zoom_changed', () => {
          const newZoom = map.getZoom();
          if (newZoom) setCurrentZoom(newZoom);
          // Marquer comme utilisateur ayant interagi si disableAutoCenter est activé
          if (disableAutoCenter) {
            setUserInteracted(true);
            console.log('🎯 Utilisateur a zoomé - re-centrage désactivé');
          }
        });

        // 🆕 Event drag (déplacement) - Détecter quand l'utilisateur déplace la carte
        map.addListener('dragstart', () => {
          if (disableAutoCenter) {
            setUserInteracted(true);
            console.log('🎯 Utilisateur a déplacé la carte - re-centrage désactivé');
          }
        });

        console.log('✅ Carte créée avec succès');
        setIsLoading(false);

      } catch (err) {
        console.error('❌ Erreur initialisation Google Maps:', err);
        setError('Impossible de charger Google Maps');
        setIsLoading(false);
      }
    };

    initMap();

    return () => {
      mounted = false;
    };
  }, []);

  // 📍 Géolocalisation de l'utilisateur
  useEffect(() => {
    if (!enableGeolocation || !showUserLocation) return;

    // Vérifier si la géolocalisation est disponible
    if (!navigator.geolocation) {
      console.error('❌ Géolocalisation non disponible sur cet appareil');
      toast.error('Géolocalisation non disponible', {
        description: 'Votre navigateur ne supporte pas la géolocalisation',
        duration: 5000
      });
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const newLocation: Location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };

        setUserLocation(newLocation);

        // Notifier le parent
        if (onLocationUpdate) {
          onLocationUpdate(newLocation);
        }

        // Centrer la carte sur la position (uniquement au premier chargement)
        if (mapInstanceRef.current && !userMarkerRef.current) {
          mapInstanceRef.current.panTo(newLocation);
        }

        // Créer ou mettre à jour le marqueur utilisateur
        if (mapInstanceRef.current) {
          if (userMarkerRef.current) {
            userMarkerRef.current.setPosition(newLocation);
          } else {
            // Créer un marqueur personnalisé pour l'utilisateur
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

            // Ajouter un cercle de précision
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

        console.log('📍 Position mise à jour:', newLocation);
      },
      (error) => {
        // Gestion détaillée des erreurs de géolocalisation
        let errorMessage = '';
        let errorDescription = '';
        let isPermissionsPolicyError = false;

        // Détecter l'erreur de Permissions Policy spécifique aux iframes
        if (error.code === error.PERMISSION_DENIED && 
            error.message && 
            error.message.toLowerCase().includes('permissions policy')) {
          isPermissionsPolicyError = true;
          
          // 🆕 FALLBACK SILENCIEUX: Utiliser la position par défaut de Kinshasa, RDC
          const defaultLocation: Location = {
            lat: -4.3276,
            lng: 15.3136,
            address: 'Kinshasa, RDC'
          };
          
          setUserLocation(defaultLocation);
          
          // Notifier le parent avec la position par défaut
          if (onLocationUpdate) {
            onLocationUpdate(defaultLocation);
          }
          
          // Centrer la carte sur Kinshasa (uniquement au premier chargement)
          if (mapInstanceRef.current && !userMarkerRef.current) {
            mapInstanceRef.current.panTo(defaultLocation);
          }
          
          // Log discret pour debugging uniquement
          console.log('📍 Position par défaut utilisée (géolocalisation non disponible):', defaultLocation);
          
          return; // Sortir de la fonction sans afficher de message d'erreur
        }

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Permission de géolocalisation refusée';
            errorDescription = 'Veuillez autoriser l\'accès à votre position dans les paramètres du navigateur';
            console.error('❌ Géolocalisation refusée par l\'utilisateur');
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Position indisponible';
            errorDescription = 'Impossible de déterminer votre position actuelle';
            console.error('❌ Position géographique indisponible');
            break;
          case error.TIMEOUT:
            errorMessage = 'Délai de géolocalisation dépassé';
            errorDescription = 'La demande de position a pris trop de temps';
            console.error('❌ Timeout de géolocalisation');
            break;
          default:
            errorMessage = 'Erreur de géolocalisation';
            errorDescription = error.message || 'Une erreur inconnue s\'est produite';
            console.error('❌ Erreur géolocalisation inconnue:', error);
        }

        console.error('📍 Détails de l\'erreur:', {
          code: error.code,
          message: error.message,
          PERMISSION_DENIED: error.PERMISSION_DENIED,
          POSITION_UNAVAILABLE: error.POSITION_UNAVAILABLE,
          TIMEOUT: error.TIMEOUT
        });

        // Afficher un toast informatif (seulement pour PERMISSION_DENIED non-Permissions Policy)
        if (error.code === error.PERMISSION_DENIED && !isPermissionsPolicyError) {
          toast.error(errorMessage, {
            description: errorDescription,
            duration: 7000
          });
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [enableGeolocation, showUserLocation, onLocationUpdate]);

  // 📍 Afficher les marqueurs
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Supprimer les anciens marqueurs
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // Ajouter les nouveaux marqueurs
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

  // 🚗 Afficher les conducteurs
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Supprimer les anciens marqueurs de conducteurs
    driverMarkersRef.current.forEach(marker => marker.setMap(null));
    driverMarkersRef.current = [];

    // Ajouter les nouveaux marqueurs de conducteurs
    drivers.forEach((driver) => {
      // Icône voiture SVG
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

      // InfoWindow avec détails du conducteur
      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="padding: 8px;">
            <strong>${driver.name || 'Conducteur'}</strong><br/>
            ${driver.vehicleType ? `<small>${driver.vehicleType}</small><br/>` : ''}
            ${driver.rating ? `<small>⭐ ${driver.rating.toFixed(1)}</small>` : ''}
          </div>
        `
      });

      marker.addListener('click', () => {
        infoWindow.open(mapInstanceRef.current!, marker);
      });

      driverMarkersRef.current.push(marker);
    });
  }, [drivers]);

  // ️ Afficher l'itinéraire
  useEffect(() => {
    if (!mapInstanceRef.current || !effectiveShowRoute || !effectiveRouteStart || !effectiveRouteEnd) {
      // Supprimer l'itinéraire s'il existe
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setMap(null);
        directionsRendererRef.current = null;
      }
      // Supprimer les marqueurs de route s'ils existent
      if (routeMarkersRef.current.start) {
        routeMarkersRef.current.start.setMap(null);
        routeMarkersRef.current.start = null;
      }
      if (routeMarkersRef.current.end) {
        routeMarkersRef.current.end.setMap(null);
        routeMarkersRef.current.end = null;
      }
      return;
    }

    // 🆕 UTILISER LE PROXY BACKEND au lieu de DirectionsService direct
    // Cela évite les erreurs UNKNOWN_ERROR si la clé API frontend est invalide
    
    // Fonction helper pour créer les marqueurs départ/destination
    const createRouteMarkers = (start: Location, end: Location) => {
      if (!mapInstanceRef.current) return;
      
      // Supprimer les anciens marqueurs
      if (routeMarkersRef.current.start) {
        routeMarkersRef.current.start.setMap(null);
      }
      if (routeMarkersRef.current.end) {
        routeMarkersRef.current.end.setMap(null);
      }
      
      // 🚗 Marqueur DÉPART (vert avec voiture)
      const startIcon = {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
          <svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <filter id="shadow-start" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="3" stdDeviation="4" flood-opacity="0.5"/>
              </filter>
            </defs>
            <circle cx="24" cy="24" r="20" fill="#10B981" stroke="white" stroke-width="4" filter="url(#shadow-start)"/>
            <text x="24" y="30" font-size="20" text-anchor="middle" fill="white">🚗</text>
          </svg>
        `),
        scaledSize: new window.google.maps.Size(48, 48),
        anchor: new window.google.maps.Point(24, 24)
      };
      
      routeMarkersRef.current.start = new window.google.maps.Marker({
        position: start,
        map: mapInstanceRef.current,
        icon: startIcon,
        title: `Départ: ${start.address || 'Point de départ'}`,
        zIndex: 3000,
        optimized: false
      });
      
      // 🔴 Marqueur DESTINATION (rouge avec point)
      const endIcon = {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
          <svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <filter id="shadow-end" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="3" stdDeviation="4" flood-opacity="0.5"/>
              </filter>
            </defs>
            <circle cx="24" cy="24" r="20" fill="#EF4444" stroke="white" stroke-width="4" filter="url(#shadow-end)"/>
            <circle cx="24" cy="24" r="8" fill="white"/>
          </svg>
        `),
        scaledSize: new window.google.maps.Size(48, 48),
        anchor: new window.google.maps.Point(24, 24)
      };
      
      routeMarkersRef.current.end = new window.google.maps.Marker({
        position: end,
        map: mapInstanceRef.current,
        icon: endIcon,
        title: `Destination: ${end.address || "Point d'arrivée"}`,
        zIndex: 3000,
        optimized: false
      });
      
      // Ajuster la vue
      if (!disableAutoCenter || !userInteracted) {
        const bounds = new window.google.maps.LatLngBounds();
        bounds.extend(start);
        bounds.extend(end);
        mapInstanceRef.current.fitBounds(bounds);
      }
      
      console.log('✅ Marqueurs créés');
    };
    
    const fetchDirections = async () => {
      try {
        const origin = `${effectiveRouteStart.lat},${effectiveRouteStart.lng}`;
        const destination = `${effectiveRouteEnd.lat},${effectiveRouteEnd.lng}`;
        
        console.log('🗺️ Appel backend Directions API...');
        
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/google-maps/directions?origin=${origin}&destination=${destination}`,
          {
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`
            }
          }
        );
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.status === 'OK' && data.routes && data.routes.length > 0) {
          console.log('✅ Itinéraire reçu du backend');
          
          // Créer le DirectionsRenderer si nécessaire
          if (!directionsRendererRef.current) {
            directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
              map: mapInstanceRef.current,
              suppressMarkers: true,
              polylineOptions: {
                strokeColor: '#3B82F6',
                strokeWeight: 8,
                strokeOpacity: 1.0,
                zIndex: 1000
              },
              preserveViewport: false
            });
          }
          
          // Convertir la réponse backend en format DirectionsResult
          const directionsResult = {
            routes: data.routes.map((route: any) => ({
              ...route,
              overview_path: window.google.maps.geometry.encoding.decodePath(route.overview_polyline.points)
            })),
            geocoded_waypoints: data.geocoded_waypoints || []
          };
          
          directionsRendererRef.current.setDirections(directionsResult);
          console.log('✅ Itinéraire backend affiché sur la carte');
          console.log('📊 Distance:', data.routes[0]?.legs[0]?.distance?.text);
          console.log('📊 Durée:', data.routes[0]?.legs[0]?.duration?.text);
          
          // Créer les marqueurs (code existant ci-dessous)
          createRouteMarkers(effectiveRouteStart, effectiveRouteEnd);
          
        } else {
          throw new Error(data.error || 'Aucun itinéraire trouvé');
        }
      } catch (error) {
        console.warn('⚠️ Erreur backend Directions, fallback Directions API frontend:', error);
        // Fallback : utiliser Directions API frontend
        fallbackToFrontendDirections();
      }
    };
    
    // Fonction fallback : Utiliser Directions API frontend
    const fallbackToFrontendDirections = () => {
      const directionsService = new window.google.maps.DirectionsService();
      
      if (!directionsRendererRef.current) {
        directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
          map: mapInstanceRef.current,
          suppressMarkers: true,
          polylineOptions: {
            strokeColor: '#3B82F6',
            strokeWeight: 8,
            strokeOpacity: 1.0,
            zIndex: 1000
          },
          preserveViewport: false
        });
      }
      
      directionsService.route(
        {
          origin: effectiveRouteStart,
          destination: effectiveRouteEnd,
          travelMode: window.google.maps.TravelMode.DRIVING
        },
        (result, status) => {
          if (status === window.google.maps.DirectionsStatus.OK && result) {
            directionsRendererRef.current?.setDirections(result);
            console.log('✅ Itinéraire Google Maps affiché avec succès');
            console.log('📊 Distance:', result.routes[0]?.legs[0]?.distance?.text);
            console.log('📊 Durée:', result.routes[0]?.legs[0]?.duration?.text);

            // Créer les marqueurs personnalisés de départ et destination
            if (mapInstanceRef.current) {
              // Supprimer les anciens marqueurs s'ils existent
              if (routeMarkersRef.current.start) {
                routeMarkersRef.current.start.setMap(null);
              }
              if (routeMarkersRef.current.end) {
                routeMarkersRef.current.end.setMap(null);
              }

              // 🚗 MARQUEUR DE DÉPART - Voiture verte
              const startIcon = {
                url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                  <svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <filter id="shadow-start" x="-50%" y="-50%" width="200%" height="200%">
                        <feDropShadow dx="0" dy="3" stdDeviation="4" flood-opacity="0.5"/>
                      </filter>
                    </defs>
                    <!-- Cercle de fond vert avec ombre forte -->
                    <circle cx="24" cy="24" r="20" fill="#10B981" stroke="white" stroke-width="4" filter="url(#shadow-start)"/>
                    <!-- Icône voiture -->
                    <text x="24" y="30" font-size="20" text-anchor="middle" fill="white">🚗</text>
                  </svg>
                `),
                scaledSize: new window.google.maps.Size(48, 48),
                anchor: new window.google.maps.Point(24, 24)
              };

              routeMarkersRef.current.start = new window.google.maps.Marker({
                position: effectiveRouteStart,
                map: mapInstanceRef.current,
                icon: startIcon,
                title: `Départ: ${effectiveRouteStart.address || 'Point de départ'}`,
                zIndex: 3000, // ✅ Encore plus haut
                optimized: false // ✅ Force le rendu du marqueur
              });

              console.log('✅ Marqueur DÉPART créé à:', effectiveRouteStart);

              // InfoWindow pour le départ
              const startInfoWindow = new window.google.maps.InfoWindow({
                content: `
                  <div style="padding: 8px; text-align: center;">
                    <strong style="color: #000000;">🟢 Départ</strong><br/>
                    <small style="color: #374151;">${effectiveRouteStart.address || 'Point de départ'}</small>
                  </div>
                `
              });

              routeMarkersRef.current.start.addListener('click', () => {
                startInfoWindow.open(mapInstanceRef.current!, routeMarkersRef.current.start!);
              });

              // 🔴 MARQUEUR DE DESTINATION - Cercle rouge simple avec point blanc (PLUS GRAND)
              const endIcon = {
                url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                  <svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <filter id="shadow-end" x="-50%" y="-50%" width="200%" height="200%">
                        <feDropShadow dx="0" dy="3" stdDeviation="4" flood-opacity="0.5"/>
                      </filter>
                    </defs>
                    <!-- Cercle extérieur rouge avec ombre forte -->
                    <circle cx="24" cy="24" r="20" fill="#EF4444" stroke="white" stroke-width="4" filter="url(#shadow-end)"/>
                    <!-- Point central blanc plus grand -->
                    <circle cx="24" cy="24" r="8" fill="white"/>
                  </svg>
                `),
                scaledSize: new window.google.maps.Size(48, 48),
                anchor: new window.google.maps.Point(24, 24)
              };

              routeMarkersRef.current.end = new window.google.maps.Marker({
                position: effectiveRouteEnd,
                map: mapInstanceRef.current,
                icon: endIcon,
                title: `Destination: ${effectiveRouteEnd.address || "Point d'arrivée"}`,
                zIndex: 3000, // ✅ Encore plus haut
                optimized: false // ✅ Force le rendu du marqueur
              });

              console.log('✅ Marqueur DESTINATION créé à:', effectiveRouteEnd);

              // InfoWindow pour la destination
              const endInfoWindow = new window.google.maps.InfoWindow({
                content: `
                  <div style="padding: 8px; text-align: center;">
                    <strong style="color: #EF4444;">🔴 Destination</strong><br/>
                    <small style="color: #374151;">${effectiveRouteEnd.address || "Point d'arrivée"}</small>
                  </div>
                `
              });

              routeMarkersRef.current.end.addListener('click', () => {
                endInfoWindow.open(mapInstanceRef.current!, routeMarkersRef.current.end!);
              });

              // ✅ AJUSTER LA VUE POUR VOIR LES DEUX MARQUEURS ET LE TRAJET
              // ⚠️ SEULEMENT SI L'UTILISATEUR N'A PAS INTERAGI
              if (!disableAutoCenter || !userInteracted) {
                const bounds = new window.google.maps.LatLngBounds();
                bounds.extend(effectiveRouteStart);
                bounds.extend(effectiveRouteEnd);
                mapInstanceRef.current.fitBounds(bounds);
                
                // Ajouter un padding pour que les marqueurs ne soient pas collés aux bords
                setTimeout(() => {
                  if (mapInstanceRef.current) {
                    mapInstanceRef.current.panBy(0, 0); // Force un refresh
                  }
                }, 100);

                console.log('✅ Marqueurs départ/destination créés et carte ajustée');
              } else {
                console.log('✅ Marqueurs créés SANS ajuster la vue (utilisateur a interagi)');
              }
            }
          } else {
            // 🆕 GESTION ÉLÉGANTE DES ERREURS - Pas de toast polluant, fallback intelligent
            console.warn(`⚠️ Directions API erreur (${status}), affichage ligne approximative`);
            
            // Logger les détails en debug (pas en erreur)
            console.debug('📍 Départ:', effectiveRouteStart);
            console.debug('📍 Destination:', effectiveRouteEnd);
            
            // 🆕 FALLBACK : Dessiner une polyligne approximative entre départ et destination
            if (mapInstanceRef.current) {
              const approximatePath = new window.google.maps.Polyline({
                path: [effectiveRouteStart, effectiveRouteEnd],
                geodesic: true,
                strokeColor: '#3B82F6',
                strokeOpacity: 0.6,
                strokeWeight: 6,
                map: mapInstanceRef.current,
                zIndex: 1000
              });
              
              // Créer les marqueurs manuellement
              if (routeMarkersRef.current.start) {
                routeMarkersRef.current.start.setMap(null);
              }
              if (routeMarkersRef.current.end) {
                routeMarkersRef.current.end.setMap(null);
              }
              
              // Marqueur de départ
              const startIcon = {
                url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                  <svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="24" cy="24" r="20" fill="#10B981" stroke="white" stroke-width="4"/>
                    <text x="24" y="30" font-size="20" text-anchor="middle" fill="white">🚗</text>
                  </svg>
                `),
                scaledSize: new window.google.maps.Size(48, 48),
                anchor: new window.google.maps.Point(24, 24)
              };
              
              routeMarkersRef.current.start = new window.google.maps.Marker({
                position: effectiveRouteStart,
                map: mapInstanceRef.current,
                icon: startIcon,
                title: `Départ: ${effectiveRouteStart.address || 'Point de départ'}`,
                zIndex: 3000,
                optimized: false
              });
              
              // Marqueur de destination
              const endIcon = {
                url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                  <svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="24" cy="24" r="20" fill="#EF4444" stroke="white" stroke-width="4"/>
                    <text x="24" y="30" font-size="20" text-anchor="middle" fill="white">📍</text>
                  </svg>
                `),
                scaledSize: new window.google.maps.Size(48, 48),
                anchor: new window.google.maps.Point(24, 24)
              };
              
              routeMarkersRef.current.end = new window.google.maps.Marker({
                position: effectiveRouteEnd,
                map: mapInstanceRef.current,
                icon: endIcon,
                title: `Destination: ${effectiveRouteEnd.address || "Point d'arrivée"}`,
                zIndex: 3000,
                optimized: false
              });
              
              // Ajuster la vue pour inclure les 2 points
              if (!disableAutoCenter || !userInteracted) {
                const bounds = new window.google.maps.LatLngBounds();
                bounds.extend(effectiveRouteStart);
                bounds.extend(effectiveRouteEnd);
                mapInstanceRef.current.fitBounds(bounds);
              }
              
              console.log('✅ Ligne approximative + marqueurs affichés (fallback)');
            }
          }
        }
      );
    };
    
    fetchDirections();
  }, [effectiveShowRoute, effectiveRouteStart, effectiveRouteEnd]);

  // 🚗 Marqueur véhicule en temps réel (se déplace)
  useEffect(() => {
    if (!mapInstanceRef.current || !vehicleLocation) {
      // Supprimer le marqueur véhicule s'il existe
      if (vehicleMarkerRef.current) {
        vehicleMarkerRef.current.setMap(null);
        vehicleMarkerRef.current = null;
      }
      return;
    }

    // Créer ou mettre à jour le marqueur véhicule
    if (vehicleMarkerRef.current) {
      // Animation smooth du déplacement
      vehicleMarkerRef.current.setPosition(vehicleLocation);
      
      // Centrer la carte sur le véhicule (optionnel)
      mapInstanceRef.current.panTo(vehicleLocation);
      
      console.log('🚗 Position véhicule mise à jour:', vehicleLocation);
    } else {
      // Créer l'icône du véhicule (une voiture animée)
      const carIcon = {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
          <svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.3"/>
              </filter>
            </defs>
            <!-- Cercle de fond -->
            <circle cx="24" cy="24" r="20" fill="#10B981" filter="url(#shadow)" stroke="white" stroke-width="3"/>
            <!-- Icône voiture -->
            <text x="24" y="30" font-size="20" text-anchor="middle" fill="white">🚗</text>
            <!-- Pulse animation circle -->
            <circle cx="24" cy="24" r="20" fill="none" stroke="#10B981" stroke-width="2" opacity="0.5">
              <animate attributeName="r" from="20" to="24" dur="1.5s" repeatCount="indefinite"/>
              <animate attributeName="opacity" from="0.5" to="0" dur="1.5s" repeatCount="indefinite"/>
            </circle>
          </svg>
        `),
        scaledSize: new window.google.maps.Size(48, 48),
        anchor: new window.google.maps.Point(24, 24)
      };

      // Créer le marqueur
      vehicleMarkerRef.current = new window.google.maps.Marker({
        position: vehicleLocation,
        map: mapInstanceRef.current,
        icon: carIcon,
        title: 'Véhicule en cours',
        zIndex: 2000, // Au-dessus des autres marqueurs
        animation: window.google.maps.Animation.DROP // Animation d'apparition
      });

      // InfoWindow pour le véhicule
      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="padding: 8px; text-align: center;">
            <strong style="color: #10B981;">🚗 Votre véhicule</strong><br/>
            <small style="color: #6B7280;">En route vers vous</small>
          </div>
        `
      });

      vehicleMarkerRef.current.addListener('click', () => {
        infoWindow.open(mapInstanceRef.current!, vehicleMarkerRef.current!);
      });

      // Centrer la carte sur le véhicule
      mapInstanceRef.current.panTo(vehicleLocation);
      
      console.log('🚗 Marqueur véhicule créé:', vehicleLocation);
    }
  }, [vehicleLocation]);

  // 🎮 Contrôles de zoom
  const handleZoomIn = () => {
    if (mapInstanceRef.current) {
      const newZoom = (mapInstanceRef.current.getZoom() || zoom) + 1;
      mapInstanceRef.current.setZoom(newZoom);
    }
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current) {
      const newZoom = (mapInstanceRef.current.getZoom() || zoom) - 1;
      mapInstanceRef.current.setZoom(newZoom);
    }
  };

  const handleRecenter = () => {
    if (mapInstanceRef.current && userLocation) {
      mapInstanceRef.current.panTo(userLocation);
      mapInstanceRef.current.setZoom(15);
    }
  };

  if (error) {
    return (
      <div className={`relative ${className}`}>
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-center p-4">
            <p className="text-red-600 font-medium">⚠️ {error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg"
            >
              Réessayer
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Carte Google Maps */}
      <div ref={mapRef} className={`absolute inset-0 ${height}`} />

      {/* Loader */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
          <div className="text-center">
            {/* Loader2 spinner inline */}
            <svg className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
            <p className="text-sm text-gray-600">Chargement de la carte...</p>
          </div>
        </div>
      )}

      {/* Contrôles de zoom */}
      {enableZoomControls && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-10">
          <button
            onClick={handleZoomIn}
            className="w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
            aria-label="Zoom avant"
          >
            {/* Plus icon inline */}
            <svg className="w-5 h-5 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
          <button
            onClick={handleZoomOut}
            className="w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
            aria-label="Zoom arrière"
          >
            {/* Minus icon inline */}
            <svg className="w-5 h-5 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
        </div>
      )}

      {/* Bouton recentrer */}
      {showUserLocation && userLocation && !disableAutoCenter && (
        <button
          onClick={handleRecenter}
          className="absolute right-4 bottom-20 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors z-10"
          aria-label="Recentrer sur ma position"
        >
          {/* Navigation icon inline */}
          <svg className="w-5 h-5 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="3 11 22 2 13 21 11 13 3 11"/>
          </svg>
        </button>
      )}

      {/* Indicateur mode sélection */}
      {isSelectingOnMap && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg text-sm font-medium z-10">
          📍 Touchez la carte pour sélectionner un lieu
        </div>
      )}
    </div>
  );
}
