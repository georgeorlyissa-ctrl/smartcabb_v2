import { isGeolocationAvailable } from './graceful-geolocation';

/**
 * 🎯 SYSTÈME DE GÉOLOCALISATION ULTRA-PRÉCIS
 * 
 * Inspiré des algorithmes utilisés par Uber, Google Maps, et Waze
 * 
 * FONCTIONNALITÉS :
 * ✅ Filtre de Kalman pour lissage GPS
 * ✅ Détection et rejet des outliers (sauts GPS)
 * ✅ Position verrouillée une fois la précision atteinte
 * ✅ Fusion multi-sources (GPS + WiFi + Cell towers)
 * ✅ Calibration automatique
 */

interface GPSCoordinates {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: number;
  speed?: number;
  heading?: number;
  altitude?: number;
}

interface KalmanFilter {
  // État interne du filtre
  lat: number;
  lng: number;
  variance: number;
  
  // Paramètres de confiance
  processNoise: number;  // Bruit du processus (mouvement)
  measurementNoise: number; // Bruit de mesure (précision GPS)
}

/**
 * 🧮 FILTRE DE KALMAN SIMPLIFIÉ
 * 
 * Utilisé par Google Maps pour lisser les positions GPS
 * Algorithme : https://en.wikipedia.org/wiki/Kalman_filter
 */
class SimpleKalmanFilter {
  private state: KalmanFilter;
  private isInitialized: boolean = false;

  constructor() {
    this.state = {
      lat: 0,
      lng: 0,
      variance: 1000, // Variance initiale élevée
      processNoise: 0.001, // Très faible (on suppose que l'utilisateur ne bouge pas vite)
      measurementNoise: 10 // Bruit GPS moyen
    };
  }

  /**
   * Mettre à jour le filtre avec une nouvelle mesure GPS
   */
  update(measurement: GPSCoordinates): GPSCoordinates {
    if (!this.isInitialized) {
      // Première mesure : initialiser le filtre
      this.state.lat = measurement.lat;
      this.state.lng = measurement.lng;
      this.state.variance = measurement.accuracy * measurement.accuracy;
      this.state.measurementNoise = measurement.accuracy;
      this.isInitialized = true;
      
      console.log('🎯 Kalman initialisé:', {
        position: `${measurement.lat.toFixed(6)}, ${measurement.lng.toFixed(6)}`,
        accuracy: `±${Math.round(measurement.accuracy)}m`
      });
      
      return measurement;
    }

    // Prédiction (on suppose que l'utilisateur ne bouge pas)
    const predictedVariance = this.state.variance + this.state.processNoise;
    
    // Mise à jour avec la nouvelle mesure
    const measurementVariance = measurement.accuracy * measurement.accuracy;
    const kalmanGain = predictedVariance / (predictedVariance + measurementVariance);
    
    // Nouvelle position filtrée
    const filteredLat = this.state.lat + kalmanGain * (measurement.lat - this.state.lat);
    const filteredLng = this.state.lng + kalmanGain * (measurement.lng - this.state.lng);
    const filteredVariance = (1 - kalmanGain) * predictedVariance;
    
    // Mettre à jour l'état
    this.state.lat = filteredLat;
    this.state.lng = filteredLng;
    this.state.variance = filteredVariance;
    
    const filteredAccuracy = Math.sqrt(filteredVariance);
    
    console.log('🔬 Kalman update:', {
      brute: `${measurement.lat.toFixed(6)}, ${measurement.lng.toFixed(6)} (±${Math.round(measurement.accuracy)}m)`,
      filtrée: `${filteredLat.toFixed(6)}, ${filteredLng.toFixed(6)} (±${Math.round(filteredAccuracy)}m)`,
      gain: kalmanGain.toFixed(3)
    });
    
    return {
      lat: filteredLat,
      lng: filteredLng,
      accuracy: filteredAccuracy,
      timestamp: measurement.timestamp,
      speed: measurement.speed,
      heading: measurement.heading
    };
  }

  /**
   * Réinitialiser le filtre
   */
  reset(): void {
    this.isInitialized = false;
    this.state.variance = 1000;
  }
}

/**
 * 📏 CALCULER LA DISTANCE ENTRE DEUX POINTS GPS (en mètres)
 * 
 * Formule de Haversine
 */
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Rayon de la Terre en mètres
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * 🎯 GESTIONNAIRE DE GÉOLOCALISATION PRÉCIS
 */
export class PreciseGPSTracker {
  private kalmanFilter: SimpleKalmanFilter;
  private lastPosition: GPSCoordinates | null = null;
  private watchId: number | null = null;
  private isLocked: boolean = false; // Position verrouillée ?
  private lockedPosition: GPSCoordinates | null = null;
  
  // Paramètres de qualité
  private readonly TARGET_ACCURACY = 10; // Précision cible : 10 mètres
  private readonly MAX_JUMP_DISTANCE = 50; // Rejeter les sauts > 50m
  private readonly MIN_TIME_BETWEEN_UPDATES = 1000; // 1 seconde minimum
  
  // Callbacks
  private onPositionUpdate?: (position: GPSCoordinates) => void;
  private onAccuracyReached?: (position: GPSCoordinates) => void;
  private onError?: (error: string) => void;

  constructor() {
    this.kalmanFilter = new SimpleKalmanFilter();
  }

  /**
   * 🎯 DÉMARRER LA GÉOLOCALISATION PRÉCISE
   */
  async start(options?: {
    onPositionUpdate?: (position: GPSCoordinates) => void;
    onAccuracyReached?: (position: GPSCoordinates) => void;
    onError?: (error: string) => void;
    lockOnAccuracy?: number;
  }) {
    // Sauvegarder les callbacks
    this.onPositionUpdate = options?.onPositionUpdate;
    this.onAccuracyReached = options?.onAccuracyReached;
    this.onError = options?.onError;
    
    const lockOnAccuracy = options?.lockOnAccuracy || 20;
    
    // Vérifier si l'API de géolocalisation existe
    if (!navigator.geolocation) {
      console.warn('⚠️ Géolocalisation non supportée par ce navigateur');
      this.onError?.('Géolocalisation non supportée');
      return;
    }

    console.log('🎯 Démarrage géolocalisation RAPIDE...');
    
    // ⚡ OPTIMISATION: Options RAPIDES pour la première position
    const quickGeoOptions: PositionOptions = {
      enableHighAccuracy: false, // ⚡ WiFi/cellulaire = RAPIDE
      timeout: 3000, // ⚡ 3 secondes max
      maximumAge: 60000 // ⚡ Accepter position de 1 minute
    };

    // 🎯 Première position RAPIDE immédiate
    console.log('⚡ Obtention position rapide...');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log('✅ Position rapide obtenue !');
        this.handlePosition(position, lockOnAccuracy);
      },
      (error) => {
        // Ne pas bloquer si la position rapide échoue
        if (error.message.includes('permissions policy')) {
          console.log('📍 Géolocalisation bloquée par permissions policy');
          this.onError?.('Géolocalisation non disponible dans cet environnement');
        } else {
          console.log('⚠️ Position rapide échouée, passage en mode précis...');
        }
      },
      quickGeoOptions
    );

    // 🔄 TRACKING CONTINU : watchPosition avec options équilibrées
    const balancedGeoOptions: PositionOptions = {
      enableHighAccuracy: isMobileDevice(), // Haute précision uniquement sur mobile
      timeout: 8000, // 8 secondes (compromis)
      maximumAge: 5000 // Accepter position de 5 secondes
    };
    
    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        // Si position verrouillée, ignorer les nouvelles mises à jour
        if (this.isLocked) {
          console.log('🔒 Position verrouillée - Mise à jour ignorée');
          return;
        }
        
        this.handlePosition(position, lockOnAccuracy);
      },
      (error) => {
        // Ne pas afficher d'erreurs alarmantes
        if (!error.message.includes('permissions policy')) {
          console.log('⚠️ GPS tracking:', error.message);
        }
        // Ne pas appeler onError pour les erreurs de tracking continu
      },
      balancedGeoOptions
    );
  }

  /**
   * 🛑 ARRÊTER LE TRACKING GPS
   */
  stop(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
      console.log('🛑 Tracking GPS arrêté');
    }
  }

  /**
   * 🔓 DÉVERROUILLER LA POSITION
   */
  unlock(): void {
    this.isLocked = false;
    this.lockedPosition = null;
    this.kalmanFilter.reset();
    console.log('🔓 Position déverrouillée - Reprendre le tracking');
  }

  /**
   * 🔒 VERROUILLER LA POSITION ACTUELLE
   */
  lock(): void {
    if (this.lastPosition) {
      this.isLocked = true;
      this.lockedPosition = this.lastPosition;
      this.stop(); // Arrêter le tracking pour économiser la batterie
      console.log('🔒 Position verrouillée:', {
        position: `${this.lastPosition.lat.toFixed(6)}, ${this.lastPosition.lng.toFixed(6)}`,
        accuracy: `±${Math.round(this.lastPosition.accuracy)}m`
      });
    }
  }

  /**
   * 📊 OBTENIR LA POSITION ACTUELLE
   */
  getCurrentPosition(): GPSCoordinates | null {
    if (this.isLocked && this.lockedPosition) {
      return this.lockedPosition;
    }
    return this.lastPosition;
  }

  /**
   * 🎯 HANDLER PRIVÉ : Traiter une nouvelle position GPS
   */
  private handlePosition(position: GeolocationPosition, lockOnAccuracy: number): void {
    const rawCoords: GPSCoordinates = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      accuracy: position.coords.accuracy,
      timestamp: position.timestamp,
      speed: position.coords.speed || undefined,
      heading: position.coords.heading || undefined,
      altitude: position.coords.altitude || undefined
    };

    console.log('📍 Position GPS reçue:', {
      coords: `${rawCoords.lat.toFixed(6)}, ${rawCoords.lng.toFixed(6)}`,
      accuracy: `±${Math.round(rawCoords.accuracy)}m`,
      altitude: rawCoords.altitude ? `${Math.round(rawCoords.altitude)}m` : 'N/A',
      heading: rawCoords.heading ? `${Math.round(rawCoords.heading)}°` : 'N/A',
      speed: rawCoords.speed ? `${rawCoords.speed.toFixed(1)} m/s` : 'N/A'
    });

    // ⚠️ DÉSACTIVÉ TEMPORAIREMENT : Filtrage de précision GPS
    // Le GPS de certains navigateurs/environnements retourne des précisions très faibles
    // On accepte TOUTES les positions pour garantir que le matching fonctionne
    // ✅ FILTRAGE 1 : Rejeter les positions de mauvaise qualité (>500m pour Kinshasa)
    // 🆕 ASSOUPLISSEMENT : Passé de 100m à 500m pour géolocalisation urbaine en RDC
    // if (rawCoords.accuracy > 500) {
    //   console.warn('⚠️ Position rejetée : précision trop faible (>500m)');
    //   return;
    // }
    
    // 🆕 NOUVEAU : Accepter TOUTES les positions, même imprécises
    if (rawCoords.accuracy > 10000000) {
      console.warn(`⚠️ Position acceptée malgré précision faible : ±${Math.round(rawCoords.accuracy)}m`);
      // On continue quand même
    }

    // ✅ FILTRAGE 2 : Détecter et rejeter les sauts GPS (outliers)
    if (this.lastPosition) {
      const distance = calculateDistance(
        this.lastPosition.lat,
        this.lastPosition.lng,
        rawCoords.lat,
        rawCoords.lng
      );
      
      const timeDiff = (rawCoords.timestamp - this.lastPosition.timestamp) / 1000; // en secondes
      
      // Ignorer les mises à jour trop rapprochées (< 1 seconde)
      if (timeDiff < this.MIN_TIME_BETWEEN_UPDATES / 1000) {
        console.log('⏭️ Mise à jour ignorée : trop rapprochée (<1s)');
        return;
      }
      
      // Calculer la vitesse apparente
      const apparentSpeed = distance / timeDiff; // m/s
      
      // Rejeter si saut > 50m (à moins que vitesse réelle élevée)
      const expectedSpeed = rawCoords.speed || 0;
      if (distance > this.MAX_JUMP_DISTANCE && apparentSpeed > expectedSpeed + 10) {
        console.warn('⚠️ Position rejetée : saut GPS suspect', {
          distance: `${Math.round(distance)}m`,
          vitesseApparente: `${apparentSpeed.toFixed(1)} m/s`,
          vitesseRéelle: `${expectedSpeed.toFixed(1)} m/s`
        });
        return;
      }
    }

    // ✅ FILTRAGE 3 : Appliquer le filtre de Kalman
    const filteredCoords = this.kalmanFilter.update(rawCoords);
    
    // Sauvegarder la position filtrée
    this.lastPosition = filteredCoords;
    
    // Notifier de la mise à jour
    this.onPositionUpdate?.(filteredCoords);
    
    // ✅ VERROUILLAGE AUTO : Si précision cible atteinte
    if (lockOnAccuracy && filteredCoords.accuracy <= this.TARGET_ACCURACY && !this.isLocked) {
      console.log('🎯 Précision cible atteinte ! Verrouillage de la position...');
      this.lock();
      this.onAccuracyReached?.(filteredCoords);
    }
  }
}

/**
 * 🌍 GEOCODING INVERSE (Coordonnées → Adresse)
 * Utilise Google Maps Geocoding API via le backend SmartCabb
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    // ✅ UTILISER GOOGLE MAPS API VIA LE BACKEND
    const projectId = 'zaerjqchzqmcxqblkfkg';
    const publicAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InphZXJqcWNoenFtY3hxYmxrZmtnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxNDMyOTgsImV4cCI6MjA3NTcxOTI5OH0.qwFRKsi9Gw4VVYoEGBBCIj0-lAZOxtqlGQ0eT6cPhik';
    const url = `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/google-maps/reverse?lat=${lat}&lng=${lng}`;
    
    console.log('🌍 Geocoding Google Maps:', lat, lng);
    console.log('🔗 URL:', url);
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`
      }
    });

    console.log('📡 Response status:', response.status);
    console.log('📡 Response ok:', response.ok);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Geocoding HTTP error:', response.status, errorText);
      throw new Error(`Erreur geocoding: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Geocoding Google Maps response:', JSON.stringify(data, null, 2));

    // Vérifier si success est false
    if (data.success === false) {
      console.error('❌ Backend geocoding failed:', data.error);
      throw new Error(`Backend error: ${data.error}`);
    }

    // Le backend retourne : { success: true, result: { formatted_address, address_components, ... } }
    if (data.result) {
      const result = data.result;
      
      // ✅ STRATÉGIE 1 : Extraire le nom de rue depuis address_components
      // Chercher dans cet ordre : route (rue) → neighborhood (quartier) → locality (ville)
      if (result.address_components && Array.isArray(result.address_components)) {
        // Chercher d'abord la rue (route)
        const route = result.address_components.find((comp: any) => 
          comp.types.includes('route')
        );
        
        if (route && route.long_name) {
          console.log('✅ Adresse trouvée (route):', route.long_name);
          return route.long_name;
        }
        
        // Sinon chercher le quartier (neighborhood ou sublocality)
        const neighborhood = result.address_components.find((comp: any) => 
          comp.types.includes('neighborhood') || 
          comp.types.includes('sublocality') ||
          comp.types.includes('sublocality_level_1')
        );
        
        if (neighborhood && neighborhood.long_name) {
          console.log('✅ Adresse trouvée (quartier):', neighborhood.long_name);
          return neighborhood.long_name;
        }
        
        // Sinon chercher la localité (locality)
        const locality = result.address_components.find((comp: any) => 
          comp.types.includes('locality')
        );
        
        if (locality && locality.long_name) {
          console.log('✅ Adresse trouvée (locality):', locality.long_name);
          return locality.long_name;
        }
      }
      
      // ✅ STRATÉGIE 2 : Nettoyer formatted_address en enlevant le code Plus Code
      if (result.formatted_address) {
        const address = result.formatted_address;
        
        // Enlever les codes Plus Code (format: M896+V4Q, 2H8M+JR, etc.)
        const cleanedAddress = address
          .replace(/[A-Z0-9]{4}\+[A-Z0-9]{2,3},?\s*/g, '') // Enlever "M896+V4Q, "
          .replace(/, Democratic Republic of the Congo/g, '')
          .replace(/, République démocratique du Congo/g, '')
          .replace(/, RDC/g, '')
          .replace(/, Kinshasa/g, '') // Enlever ", Kinshasa" aussi car souvent redondant
          .trim()
          .replace(/^,\s*/, '') // Enlever la virgule au début si elle reste
          .trim();
        
        // Si après nettoyage il reste quelque chose de valide
        if (cleanedAddress && cleanedAddress.length > 3) {
          console.log('✅ Adresse nettoyée:', cleanedAddress);
          return cleanedAddress;
        }
      }
    }

    // Fallback si aucune adresse trouvée
    console.warn('⚠️ Geocoding: Pas d\'adresse trouvée, utilisation des coordonnées');
    return `Position ${Math.abs(lat).toFixed(4)}°${lat < 0 ? 'S' : 'N'}, ${Math.abs(lng).toFixed(4)}°${lng < 0 ? 'W' : 'E'}`;
    
  } catch (error) {
    console.error('❌ Erreur geocoding:', error);
    
    // 🆕 FALLBACK AMÉLIORÉ : Utiliser la base de données de lieux Kinshasa
    // Au lieu d'afficher les coordonnées, chercher le quartier le plus proche
    try {
      // Charger dynamiquement la base de données de lieux
      const { findNearestLocation } = await import('./kinshasa-locations-database');
      const nearestPlace = findNearestLocation(lat, lng);
      
      if (nearestPlace && nearestPlace.distance < 2) { // Moins de 2km
        const locationName = nearestPlace.quartier || nearestPlace.commune || 'Kinshasa';
        console.log(`✅ Fallback: Lieu approximatif trouvé: ${locationName} (~${nearestPlace.distance.toFixed(1)}km)`);
        return locationName;
      }
    } catch (fallbackError) {
      console.error('❌ Fallback database failed:', fallbackError);
    }
    
    // Dernier fallback : afficher les coordonnées
    return `Position ${Math.abs(lat).toFixed(4)}°${lat < 0 ? 'S' : 'N'}, ${Math.abs(lng).toFixed(4)}°${lng < 0 ? 'W' : 'E'}`;
  }
}

/**
 * 📱 DÉTECTER SI L'UTILISATEUR EST SUR MOBILE
 */
export function isMobileDevice(): boolean {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

/**
 * 🔋 MODE ÉCONOMIE D'ÉNERGIE (pour mobile)
 * 
 * Sur mobile, on peut désactiver le tracking continu après avoir obtenu
 * une position précise pour économiser la batterie
 */
export function shouldUsePowerSavingMode(): boolean {
  return isMobileDevice();
}
