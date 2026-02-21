import { useState, useEffect, useRef, useCallback } from 'react';
import { isGeolocationAvailable, getCurrentPosition, watchPosition, GracefulPosition, stopWatching, KINSHASA_CENTER } from '../lib/graceful-geolocation';

interface Location {
  lat: number;
  lng: number;
}

interface StableLocationOptions {
  /** Seuil de distance en mètres pour considérer un mouvement significatif (défaut: 10m) */
  movementThreshold?: number;
  /** Nombre de positions à moyenner (défaut: 3) */
  smoothingFactor?: number;
  /** Précision minimale requise en mètres (défaut: 50m) */
  minAccuracy?: number;
}

/**
 * 🎯 Hook personnalisé pour obtenir une position GPS stable et lissée
 * 
 * Algorithme de stabilisation :
 * 1. **Filtre de précision** : Ignore les positions avec une faible précision
 * 2. **Filtre de mouvement** : Ignore les micro-mouvements inférieurs au seuil
 * 3. **Moyenne mobile** : Lisse la position en moyennant les N dernières positions
 * 4. **Verrouillage** : Une fois stable, ne met à jour que si mouvement significatif
 */
export function useStableLocation(
  enabled: boolean = true,
  options: StableLocationOptions = {}
) {
  const {
    movementThreshold = 10, // 10 mètres
    smoothingFactor = 3,    // Moyenne sur 3 positions
    minAccuracy = 50        // Précision minimale 50m
  } = options;

  const [location, setLocation] = useState<Location | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStable, setIsStable] = useState(false);

  // Historique des positions pour le lissage
  const positionsHistory = useRef<Location[]>([]);
  
  // Dernière position stable
  const lastStablePosition = useRef<Location | null>(null);
  
  // Watchdog pour détecter si on ne bouge plus
  const stableCounter = useRef(0);

  /**
   * Calcule la distance entre deux points GPS en mètres (formule de Haversine)
   */
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371e3; // Rayon de la Terre en mètres
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance en mètres
  };

  /**
   * Calcule la moyenne des positions dans l'historique
   */
  const getSmoothedPosition = (positions: Location[]): Location => {
    if (positions.length === 0) {
      return { lat: 0, lng: 0 };
    }

    const sum = positions.reduce(
      (acc, pos) => ({
        lat: acc.lat + pos.lat,
        lng: acc.lng + pos.lng
      }),
      { lat: 0, lng: 0 }
    );

    return {
      lat: sum.lat / positions.length,
      lng: sum.lng / positions.length
    };
  };

  useEffect(() => {
    if (!enabled) {
      return;
    }

    console.log('🌍 v517.91 - Démarrage géolocalisation stable');

    let watchId: number | null = null;

    // Options de géolocalisation pour maximiser la précision
    const geoOptions: PositionOptions = {
      enableHighAccuracy: true,  // Utiliser GPS si disponible
      timeout: 10000,           // 10 secondes max pour obtenir une position
      maximumAge: 0             // Ne pas utiliser de cache
    };

    const successCallback = (position: GeolocationPosition) => {
      const { latitude, longitude, accuracy } = position.coords;

      console.log('📍 Position GPS reçue:', {
        lat: latitude.toFixed(6),
        lng: longitude.toFixed(6),
        précision: `${accuracy.toFixed(0)}m`
      });

      // ✅ FILTRE 1 : Ignorer les positions peu précises
      if (accuracy > minAccuracy) {
        console.log(`⚠️ Position ignorée (précision ${accuracy.toFixed(0)}m > ${minAccuracy}m)`);
        return;
      }

      const newPosition: Location = {
        lat: latitude,
        lng: longitude
      };

      // ✅ FILTRE 2 : Vérifier si c'est un mouvement significatif
      if (lastStablePosition.current) {
        const distance = calculateDistance(
          lastStablePosition.current.lat,
          lastStablePosition.current.lng,
          newPosition.lat,
          newPosition.lng
        );

        console.log(`📏 Distance depuis dernière position stable: ${distance.toFixed(1)}m`);

        // Si le mouvement est trop petit, ignorer
        if (distance < movementThreshold) {
          stableCounter.current += 1;
          
          // Après 3 positions consécutives dans le seuil, considérer comme stable
          if (stableCounter.current >= 3 && !isStable) {
            console.log('✅ Position verrouillée (stable)');
            setIsStable(true);
          }
          
          return; // Ne pas mettre à jour
        } else {
          // Mouvement significatif détecté
          console.log(`🚶 Mouvement détecté: ${distance.toFixed(1)}m`);
          stableCounter.current = 0;
          setIsStable(false);
        }
      }

      // ✅ FILTRE 3 : Ajouter à l'historique et calculer la moyenne mobile
      positionsHistory.current.push(newPosition);

      // Garder seulement les N dernières positions
      if (positionsHistory.current.length > smoothingFactor) {
        positionsHistory.current.shift();
      }

      // Calculer la position lissée
      const smoothedPosition = getSmoothedPosition(positionsHistory.current);

      console.log('🎯 Position lissée:', {
        lat: smoothedPosition.lat.toFixed(6),
        lng: smoothedPosition.lng.toFixed(6),
        nbPositions: positionsHistory.current.length
      });

      // Mettre à jour la position affichée
      setLocation(smoothedPosition);
      lastStablePosition.current = smoothedPosition;
      setError(null);
    };

    const errorCallback = (err: GeolocationPositionError) => {
      // Ne pas afficher d'erreurs alarmantes si géolocalisation bloquée
      if (err.message && (err.message.includes('permissions policy') || err.message.includes('disabled in this document'))) {
        console.log('📍 Géolocalisation non disponible (environnement iframe), position par défaut utilisée');
        setError(null); // Pas d'erreur visible pour l'utilisateur
      } else {
        console.log('⚠️ Erreur géolocalisation:', err.message);
        
        let errorMessage = 'Erreur de géolocalisation';
        
        switch (err.code) {
          case err.PERMISSION_DENIED:
            errorMessage = 'Permission de géolocalisation refusée';
            break;
          case err.POSITION_UNAVAILABLE:
            errorMessage = 'Position non disponible';
            break;
          case err.TIMEOUT:
            errorMessage = 'Délai de géolocalisation dépassé';
            break;
        }
        
        setError(errorMessage);
      }
      
      // Position par défaut : Kinshasa Centre
      const defaultPosition: Location = KINSHASA_CENTER;
      
      console.log('📍 Utilisation position par défaut (Kinshasa)');
      setLocation(defaultPosition);
      lastStablePosition.current = defaultPosition;
      positionsHistory.current = [defaultPosition];
    };

    // Démarrer le suivi de position avec le service graceful (async)
    (async () => {
      const available = await isGeolocationAvailable();
      
      if (!available) {
        console.log('📍 Géolocalisation non disponible, position par défaut utilisée');
        const defaultPosition: Location = KINSHASA_CENTER;
        setLocation(defaultPosition);
        lastStablePosition.current = defaultPosition;
        positionsHistory.current = [defaultPosition];
        return;
      }

      // Utiliser le service graceful au lieu d'appeler directement navigator.geolocation
      try {
        // Obtenir la position initiale
        const initialPos = await getCurrentPosition({ 
          enableHighAccuracy: true, 
          timeout: 10000, 
          maximumAge: 0 
        });
        
        if (initialPos) {
          successCallback({
            coords: {
              latitude: initialPos.lat,
              longitude: initialPos.lng,
              accuracy: initialPos.accuracy,
              altitude: null,
              altitudeAccuracy: null,
              heading: null,
              speed: null
            },
            timestamp: initialPos.timestamp
          } as GeolocationPosition);
        }
        
        // Puis surveiller les changements avec watchPosition graceful
        watchId = watchPosition(
          (position) => {
            successCallback({
              coords: {
                latitude: position.lat,
                longitude: position.lng,
                accuracy: position.accuracy,
                altitude: null,
                altitudeAccuracy: null,
                heading: null,
                speed: null
              },
              timestamp: position.timestamp
            } as GeolocationPosition);
          },
          (error) => {
            errorCallback({
              code: 2,
              message: error,
              PERMISSION_DENIED: 1,
              POSITION_UNAVAILABLE: 2,
              TIMEOUT: 3
            });
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      } catch (error: any) {
        console.log('📍 Impossible d\'obtenir la position GPS, position par défaut utilisée');
        const defaultPosition: Location = KINSHASA_CENTER;
        setLocation(defaultPosition);
        lastStablePosition.current = defaultPosition;
        positionsHistory.current = [defaultPosition];
      }
    })();

    // Cleanup
    return () => {
      if (watchId !== null) {
        stopWatching();
        console.log('🛑 Arrêt géolocalisation stable');
      }
    };
  }, [enabled, movementThreshold, smoothingFactor, minAccuracy]);

  return { location, error, isStable };
}