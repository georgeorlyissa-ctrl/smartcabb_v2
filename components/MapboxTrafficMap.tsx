import { useEffect, useRef, useState } from 'react';
import { Navigation2, MapPin, Navigation } from '../lib/icons';

// Déclaration TypeScript pour Mapbox
declare global {
  interface Window {
    mapboxgl: any;
  }
}

interface MapboxTrafficMapProps {
  pickup: {
    latitude?: number;
    longitude?: number;
    lat?: number;
    lng?: number;
    address?: string;
  };
  destination: {
    latitude?: number;
    longitude?: number;
    lat?: number;
    lng?: number;
    address?: string;
  };
  height?: string;
  showTraffic?: boolean;
  apiKey?: string;
  className?: string;
  enableGPSTracking?: boolean; // 🆕 Activer le suivi GPS en temps réel
}

export function MapboxTrafficMap({ 
  pickup, 
  destination, 
  height = 'h-64',
  showTraffic = true,
  apiKey,
  className = '',
  enableGPSTracking = true // 🆕 Activé par défaut
}: MapboxTrafficMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const driverMarkerRef = useRef<any>(null); // 🆕 Marqueur bleu du conducteur
  const gpsWatchIdRef = useRef<number | null>(null); // 🆕 ID du watch GPS
  const lastRouteCalcRef = useRef<number>(0); // 🆕 Timestamp du dernier recalcul
  const routeLayerAddedRef = useRef(false); // 🆕 Flag pour éviter duplication
  
  const [mapLoaded, setMapLoaded] = useState(false);
  const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [driverPosition, setDriverPosition] = useState<{ lat: number; lng: number } | null>(null); // 🆕
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null); // 🆕 Précision GPS

  // ✅ NORMALISER LES COORDONNÉES (supporter lat/lng ET latitude/longitude)
  const pickupLat = pickup?.latitude || pickup?.lat;
  const pickupLng = pickup?.longitude || pickup?.lng;
  const destLat = destination?.latitude || destination?.lat;
  const destLng = destination?.longitude || destination?.lng;

  console.log('🗺️ MapboxTrafficMap - Rendu avec:', {
    pickupLat,
    pickupLng,
    destLat,
    destLng,
    apiKey: apiKey ? '✅ Présente' : '❌ Manquante',
    enableGPSTracking
  });

  // Validation des coordonnées
  if (!pickupLat || !pickupLng || !destLat || !destLng) {
    console.error('❌ Coordonnées manquantes');
    return (
      <div className={`relative ${height} ${className} bg-gray-200 flex items-center justify-center`}>
        <div className="text-center p-4">
          <p className="text-sm text-red-600 font-medium">Coordonnées du trajet manquantes</p>
          <p className="text-xs text-gray-500 mt-1">
            Pickup: {pickupLat ? '✅' : '❌'} {pickupLng ? '✅' : '❌'} | 
            Dest: {destLat ? '✅' : '❌'} {destLng ? '✅' : '❌'}
          </p>
        </div>
      </div>
    );
  }

  // Charger Mapbox GL JS depuis CDN
  useEffect(() => {
    if (window.mapboxgl) {
      console.log('✅ Mapbox GL JS déjà chargé');
      setMapLoaded(true);
      return;
    }

    console.log('📦 Chargement de Mapbox GL JS...');

    // Charger le CSS
    const link = document.createElement('link');
    link.href = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css';
    link.rel = 'stylesheet';
    document.head.appendChild(link);

    // Charger le JS
    const script = document.createElement('script');
    script.src = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js';
    script.async = true;
    script.onload = () => {
      console.log('✅ Mapbox GL JS chargé avec succès');
      setMapLoaded(true);
    };
    script.onerror = () => {
      console.error('❌ Erreur de chargement Mapbox GL JS');
      setError('Impossible de charger Mapbox');
    };
    document.head.appendChild(script);
  }, []);

  // Initialiser la carte Mapbox avec trafic
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || !pickupLat || !destLat || mapInstanceRef.current) {
      return;
    }

    if (!apiKey) {
      console.error('❌ MAPBOX_API_KEY manquante');
      setError('Clé API Mapbox manquante');
      return;
    }

    console.log('🗺️ Initialisation de Mapbox avec GPS + TRAFIC...');

    try {
      const mapboxgl = window.mapboxgl;
      mapboxgl.accessToken = apiKey;

      // Créer la carte
      const map = new mapboxgl.Map({
        container: mapRef.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [pickupLng, pickupLat],
        zoom: 12,
        // 🆕 ACTIVER LES INTERACTIONS (zoom, rotation, etc.)
        interactive: true,
        scrollZoom: true, // Zoom avec molette
        touchZoomRotate: true, // Zoom tactile
        doubleClickZoom: true, // Double-clic pour zoomer
        dragRotate: true, // Rotation avec clic droit
        dragPan: true, // Déplacement de la carte
        keyboard: true // Contrôles clavier
      });

      mapInstanceRef.current = map;
      
      // 🆕 AJOUTER LES CONTRÔLES DE NAVIGATION (Zoom +/- et Rotation)
      const navControl = new mapboxgl.NavigationControl({
        showCompass: true, // Afficher la boussole
        showZoom: true, // Afficher les boutons +/-
        visualizePitch: true // Visualiser l'inclinaison
      });
      map.addControl(navControl, 'top-right');
      
      console.log('✅ Contrôles de navigation ajoutés (zoom/dézoom/rotation)');

      map.on('load', async () => {
        console.log('✅ Carte Mapbox chargée');

        // ✅ ACTIVER LA COUCHE DE TRAFIC
        if (showTraffic) {
          console.log('🚦 Activation de la couche TRAFIC...');
          map.addSource('mapbox-traffic', {
            type: 'vector',
            url: 'mapbox://mapbox.mapbox-traffic-v1'
          });

          map.addLayer({
            id: 'traffic',
            type: 'line',
            source: 'mapbox-traffic',
            'source-layer': 'traffic',
            paint: {
              'line-width': 4,
              'line-color': [
                'case',
                ['==', ['get', 'congestion'], 'low'], '#00FF00',
                ['==', ['get', 'congestion'], 'moderate'], '#FFAA00',
                ['==', ['get', 'congestion'], 'heavy'], '#FF0000',
                ['==', ['get', 'congestion'], 'severe'], '#990000',
                '#0000FF'
              ]
            }
          });
          console.log('✅ Couche TRAFIC activée !');
        }

        // 🚗 Marqueur de départ (ICÔNE VÉHICULE SVG)
        const vehicleEl = document.createElement('div');
        vehicleEl.className = 'vehicle-marker';
        vehicleEl.innerHTML = `
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="11" fill="#10b981" opacity="0.2"/>
            <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z" fill="#10b981"/>
          </svg>
        `;
        vehicleEl.style.width = '40px';
        vehicleEl.style.height = '40px';
        vehicleEl.style.cursor = 'pointer';
        vehicleEl.style.display = 'flex';
        vehicleEl.style.alignItems = 'center';
        vehicleEl.style.justifyContent = 'center';
        
        new mapboxgl.Marker({ element: vehicleEl, anchor: 'center' })
          .setLngLat([pickupLng, pickupLat])
          .setPopup(new mapboxgl.Popup().setHTML(`<strong>🚗 Départ</strong><br>${pickup.address || 'Point de départ'}`))
          .addTo(map);
        
        console.log('✅ Marqueur véhicule ajouté au départ');

        // 📍 Marqueur de destination (ROUGE)
        new mapboxgl.Marker({ color: '#ef4444' })
          .setLngLat([destLng, destLat])
          .setPopup(new mapboxgl.Popup().setHTML(`<strong>Destination</strong><br>${destination.address || 'Destination'}`))
          .addTo(map);

        // Calculer et afficher l'itinéraire initial (départ -> destination)
        await calculateAndDisplayRoute(pickupLng, pickupLat, destLng, destLat, map, mapboxgl, apiKey);
      });

      map.on('error', (e: any) => {
        console.error('❌ Erreur Mapbox:', e);
        setError('Erreur lors du chargement de la carte');
      });

    } catch (err) {
      console.error('❌ Erreur lors de l\'initialisation Mapbox:', err);
      setError('Erreur d\'initialisation de la carte');
    }

    // Fonction pour calculer et afficher un itinéraire
    async function calculateAndDisplayRoute(
      fromLng: number,
      fromLat: number,
      toLng: number,
      toLat: number,
      map: any,
      mapboxgl: any,
      apiKey: string
    ) {
      try {
        console.log(`📍 Calcul itinéraire: (${fromLat}, ${fromLng}) -> (${toLat}, ${toLng})`);
        const directionsUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${fromLng},${fromLat};${toLng},${toLat}?geometries=geojson&access_token=${apiKey}`;
        
        const response = await fetch(directionsUrl);
        const data = await response.json();

        if (data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          const coordinates = route.geometry.coordinates;
          const distanceKm = (route.distance / 1000).toFixed(1);
          const durationMin = Math.round(route.duration / 60);

          console.log(`✅ Itinéraire calculé: ${distanceKm} km en ${durationMin} min`);
          setRouteInfo({ distance: `${distanceKm} km`, duration: `${durationMin} min` });

          // Supprimer l'ancienne couche/source si elle existe
          if (map.getLayer('route')) {
            map.removeLayer('route');
          }
          if (map.getSource('route')) {
            map.removeSource('route');
          }

          // Ajouter la nouvelle ligne d'itinéraire (BLEU)
          map.addSource('route', {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: coordinates
              }
            }
          });

          map.addLayer({
            id: 'route',
            type: 'line',
            source: 'route',
            layout: {
              'line-join': 'round',
              'line-cap': 'round'
            },
            paint: {
              'line-color': '#3b82f6',
              'line-width': 6,
              'line-opacity': 0.8
            }
          });

          // Ajuster la vue
          const bounds = coordinates.reduce(
            (bounds: any, coord: number[]) => bounds.extend(coord),
            new mapboxgl.LngLatBounds(coordinates[0], coordinates[0])
          );
          map.fitBounds(bounds, { padding: 50 });

          routeLayerAddedRef.current = true;
          console.log('✅ Itinéraire tracé !');
        }
      } catch (err) {
        console.error('❌ Erreur calcul itinéraire:', err);
      }
    }

    return () => {
      // Cleanup GPS
      if (gpsWatchIdRef.current !== null) {
        navigator.geolocation.clearWatch(gpsWatchIdRef.current);
        gpsWatchIdRef.current = null;
      }
      
      // Cleanup map
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      routeLayerAddedRef.current = false;
    };
  }, [mapLoaded, pickupLat, pickupLng, destLat, destLng, showTraffic, apiKey]);

  // 🆕 SUIVI GPS EN TEMPS RÉEL
  useEffect(() => {
    if (!enableGPSTracking || !mapInstanceRef.current || !navigator.geolocation || !destLat || !destLng || !apiKey) {
      console.log('⚠️ GPS désactivé ou conditions non remplies');
      return;
    }

    console.log('🛰️ Démarrage du suivi GPS en temps réel...');

    const handleGPSSuccess = async (position: GeolocationPosition) => {
      const { latitude, longitude, accuracy } = position.coords;
      
      console.log(`📍 GPS MAJ: (${latitude}, ${longitude}) - Précision: ${accuracy.toFixed(0)}m`);
      
      setDriverPosition({ lat: latitude, lng: longitude });
      setGpsAccuracy(accuracy);

      const mapboxgl = window.mapboxgl;

      // Créer ou mettre à jour le marqueur du conducteur (BLEU)
      if (driverMarkerRef.current) {
        driverMarkerRef.current.setLngLat([longitude, latitude]);
      } else if (mapboxgl) {
        driverMarkerRef.current = new mapboxgl.Marker({ 
          color: '#3b82f6',
          scale: 1.2 
        })
          .setLngLat([longitude, latitude])
          .setPopup(new mapboxgl.Popup().setHTML(`<strong>🚗 Vous êtes ici</strong><br>Précision: ${accuracy.toFixed(0)} m`))
          .addTo(mapInstanceRef.current);
        
        console.log('✅ Marqueur conducteur créé');
      }

      // Centrer la carte sur le conducteur (doucement)
      if (mapInstanceRef.current) {
        mapInstanceRef.current.easeTo({
          center: [longitude, latitude],
          duration: 1000
        });
      }

      // Recalculer l'itinéraire toutes les 30 secondes
      const now = Date.now();
      if (now - lastRouteCalcRef.current > 30000) {
        lastRouteCalcRef.current = now;
        console.log('🔄 Recalcul de l\'itinéraire...');
        
        try {
          const directionsUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${longitude},${latitude};${destLng},${destLat}?geometries=geojson&access_token=${apiKey}`;
          
          const response = await fetch(directionsUrl);
          const data = await response.json();

          if (data.routes && data.routes.length > 0) {
            const route = data.routes[0];
            const coordinates = route.geometry.coordinates;
            const distanceKm = (route.distance / 1000).toFixed(1);
            const durationMin = Math.round(route.duration / 60);

            console.log(`✅ Itinéraire recalculé: ${distanceKm} km restants en ${durationMin} min`);
            setRouteInfo({ distance: `${distanceKm} km`, duration: `${durationMin} min` });

            // Mettre à jour la source d'itinéraire
            const routeSource = mapInstanceRef.current.getSource('route');
            if (routeSource) {
              routeSource.setData({
                type: 'Feature',
                properties: {},
                geometry: {
                  type: 'LineString',
                  coordinates: coordinates
                }
              });
              console.log('✅ Itinéraire mis à jour !');
            }
          }
        } catch (err) {
          console.error('❌ Erreur recalcul:', err);
        }
      }
    };

    const handleGPSError = (error: GeolocationPositionError) => {
      console.error('❌ Erreur GPS:', error.message);
      if (error.code === error.PERMISSION_DENIED) {
        setError('Autorisation GPS refusée');
      }
    };

    // Démarrer le watch GPS
    const watchId = navigator.geolocation.watchPosition(
      handleGPSSuccess,
      handleGPSError,
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );

    gpsWatchIdRef.current = watchId;
    console.log('✅ Suivi GPS activé (ID:', watchId, ')');

    return () => {
      if (gpsWatchIdRef.current !== null) {
        navigator.geolocation.clearWatch(gpsWatchIdRef.current);
        console.log('🛑 Suivi GPS arrêté');
        gpsWatchIdRef.current = null;
      }
    };
  }, [enableGPSTracking, destLat, destLng, apiKey]);

  if (error) {
    return (
      <div className={`relative ${height} ${className} bg-gray-200 flex items-center justify-center`}>
        <div className="text-center p-4">
          <p className="text-sm text-red-600 font-medium">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${height} ${className} bg-gray-200`}>
      <div ref={mapRef} className="w-full h-full rounded-lg" />
      
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-600 font-medium">Chargement de la carte...</p>
            <p className="text-xs text-gray-500 mt-1">🚦 Trafic en temps réel • 🛰️ GPS activé</p>
          </div>
        </div>
      )}

      {/* Badge Mapbox + GPS */}
      {mapLoaded && (
        <div className="absolute bottom-3 left-3 bg-white px-3 py-1.5 rounded-lg shadow-md text-xs flex items-center space-x-1.5 border border-gray-200">
          <Navigation2 className="w-4 h-4 text-blue-600" />
          <span className="font-semibold text-gray-700">Mapbox</span>
          {showTraffic && <span className="text-green-600">🚦</span>}
          {enableGPSTracking && <span className="text-blue-600">🛰️</span>}
        </div>
      )}

      {/* Info itinéraire + Position conducteur */}
      {(routeInfo || driverPosition) && (
        <div className="absolute top-3 right-3 bg-white px-3 py-2 rounded-lg shadow-md text-xs border border-gray-200 max-w-[200px]">
          {routeInfo && (
            <>
              <div className="font-semibold text-gray-700 mb-0.5 flex items-center">
                <Navigation className="w-3 h-3 mr-1" />
                Itinéraire
              </div>
              <div className="text-gray-600 mb-2">{routeInfo.distance} • {routeInfo.duration}</div>
            </>
          )}
          {driverPosition && gpsAccuracy !== null && (
            <div className="text-gray-500 text-[10px] border-t border-gray-200 pt-1">
              📍 GPS: {gpsAccuracy.toFixed(0)}m
            </div>
          )}
        </div>
      )}

      {/* Légende du trafic */}
      {showTraffic && mapLoaded && (
        <div className="absolute top-3 left-3 bg-white px-3 py-2 rounded-lg shadow-md text-xs border border-gray-200">
          <div className="font-semibold text-gray-700 mb-1.5">🚦 Trafic</div>
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-gray-600">Fluide</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-orange-500" />
              <span className="text-gray-600">Modéré</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-gray-600">Dense</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}