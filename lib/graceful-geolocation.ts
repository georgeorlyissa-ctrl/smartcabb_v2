/**
 * 🌍 SERVICE DE GÉOLOCALISATION GRACEFUL
 * 
 * Gère automatiquement les environnements où la géolocalisation est bloquée
 * (comme Figma Make iframe) sans afficher d'erreurs alarmantes.
 * 
 * Utilise une position par défaut (Kinshasa) quand la géolocalisation n'est pas disponible.
 */

export interface GracefulPosition {
  lat: number;
  lng: number;
  accuracy?: number;
  isDefault: boolean; // true si position par défaut utilisée
  source: 'gps' | 'default' | 'cached';
}

// Position par défaut : Centre de Kinshasa
const DEFAULT_POSITION: GracefulPosition = {
  lat: -4.3276,
  lng: 15.3136,
  accuracy: 1000, // 1 km d'approximation
  isDefault: true,
  source: 'default'
};

// Export de la position centrale pour usage externe
export const KINSHASA_CENTER = {
  lat: -4.3276,
  lng: 15.3136
};

// Cache de la dernière position connue
let cachedPosition: GracefulPosition | null = null;

// Flag pour savoir si la géolocalisation a déjà été testée
let geolocationTested = false;
let geolocationAvailable = false;

/**
 * 🧪 Teste si la géolocalisation est disponible (sans afficher d'erreurs)
 */
export async function isGeolocationAvailable(): Promise<boolean> {
  if (geolocationTested) {
    return geolocationAvailable;
  }

  // Vérifier si l'API existe
  if (!navigator.geolocation) {
    geolocationTested = true;
    geolocationAvailable = false;
    return false;
  }

  // ⚡ OPTIMISATION: Tester avec un timeout plus réaliste
  try {
    const result = await new Promise<boolean>((resolve) => {
      const timeout = setTimeout(() => {
        resolve(false);
      }, 2000); // ⚡ 2 secondes au lieu de 100ms (trop court)

      navigator.geolocation.getCurrentPosition(
        () => {
          clearTimeout(timeout);
          resolve(true);
        },
        (error) => {
          clearTimeout(timeout);
          // Si c'est une erreur de permissions policy, la géolocalisation n'est pas disponible
          if (error.message.includes('permissions policy')) {
            resolve(false);
          } else {
            // Autres erreurs (permission refusée, etc.) = géolocalisation existe mais pas autorisée
            resolve(true);
          }
        },
        { 
          timeout: 2000,
          enableHighAccuracy: false, // ⚡ Rapide pour le test
          maximumAge: 60000 // Accepter position en cache
        }
      );
    });

    geolocationTested = true;
    geolocationAvailable = result;
    return result;
  } catch {
    geolocationTested = true;
    geolocationAvailable = false;
    return false;
  }
}

/**
 * 📍 Obtient la position actuelle (avec fallback gracieux)
 */
export async function getCurrentPosition(options?: {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}): Promise<GracefulPosition> {
  // Vérifier si la géolocalisation est disponible
  const available = await isGeolocationAvailable();

  if (!available) {
    console.log('📍 Géolocalisation non disponible, utilisation position par défaut (Kinshasa)');
    
    // Utiliser la position cachée si disponible, sinon la position par défaut
    if (cachedPosition && !cachedPosition.isDefault) {
      console.log('📍 Utilisation dernière position connue');
      return { ...cachedPosition, source: 'cached' };
    }
    
    return DEFAULT_POSITION;
  }

  // Essayer d'obtenir la position GPS
  try {
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        resolve,
        reject,
        {
          // ⚡ OPTIMISATION: Valeurs par défaut RAPIDES
          enableHighAccuracy: options?.enableHighAccuracy ?? false, // false = rapide (WiFi/cellulaire)
          timeout: options?.timeout ?? 5000, // 5 secondes au lieu de 10
          maximumAge: options?.maximumAge ?? 60000 // Accepter position vieille de 1 minute
        }
      );
    });

    const gracefulPosition: GracefulPosition = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      accuracy: position.coords.accuracy,
      isDefault: false,
      source: 'gps'
    };

    // Mettre en cache
    cachedPosition = gracefulPosition;
    console.log('✅ Position GPS obtenue:', gracefulPosition);

    return gracefulPosition;
  } catch (error) {
    // Erreur GPS, utiliser la position par défaut
    console.log('📍 GPS non accessible, utilisation position par défaut (Kinshasa)');
    
    if (cachedPosition && !cachedPosition.isDefault) {
      console.log('📍 Utilisation dernière position connue');
      return { ...cachedPosition, source: 'cached' };
    }
    
    return DEFAULT_POSITION;
  }
}

/**
 * 👀 Surveille la position (avec fallback gracieux)
 */
export function watchPosition(
  callback: (position: GracefulPosition) => void,
  options?: {
    enableHighAccuracy?: boolean;
    timeout?: number;
    maximumAge?: number;
  }
): () => void {
  let watchId: number | null = null;
  let intervalId: NodeJS.Timeout | null = null;
  let stopped = false;

  const startWatching = async () => {
    const available = await isGeolocationAvailable();

    if (!available) {
      console.log('📍 Géolocalisation non disponible, position par défaut utilisée');
      
      // Envoyer la position par défaut une fois
      callback(cachedPosition || DEFAULT_POSITION);
      
      // Pas de surveillance continue si pas de GPS
      return;
    }

    // Surveiller avec watchPosition
    try {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const gracefulPosition: GracefulPosition = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            isDefault: false,
            source: 'gps'
          };

          cachedPosition = gracefulPosition;
          
          if (!stopped) {
            callback(gracefulPosition);
          }
        },
        (error) => {
          // En cas d'erreur, utiliser la dernière position connue ou la position par défaut
          if (!stopped) {
            callback(cachedPosition || DEFAULT_POSITION);
          }
        },
        {
          enableHighAccuracy: options?.enableHighAccuracy ?? true,
          timeout: options?.timeout ?? 10000,
          maximumAge: options?.maximumAge ?? 30000
        }
      );
    } catch {
      // Fallback : polling manuel toutes les 5 secondes
      intervalId = setInterval(async () => {
        if (stopped) return;
        
        const position = await getCurrentPosition(options);
        callback(position);
      }, 5000);
    }
  };

  startWatching();

  // Fonction pour arrêter la surveillance
  return () => {
    stopped = true;
    
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
    }
    
    if (intervalId !== null) {
      clearInterval(intervalId);
    }
  };
}

/**
 * 🎯 Obtient une position "rapide" (priorité à la rapidité plutôt qu'à la précision)
 */
export async function getQuickPosition(): Promise<GracefulPosition> {
  // Si on a une position en cache récente, l'utiliser
  if (cachedPosition && !cachedPosition.isDefault) {
    console.log('⚡ Position en cache utilisée (rapide)');
    return cachedPosition;
  }

  // Sinon, essayer avec un timeout court
  return getCurrentPosition({
    enableHighAccuracy: false, // Pas de haute précision = plus rapide
    timeout: 2000, // 2 secondes maximum
    maximumAge: 120000 // Accepter une position vieille de 2 minutes
  });
}

/**
 * ⚡ Obtient une position INSTANTANÉE (retourne immédiatement le cache ou position par défaut)
 * Puis lance une mise à jour en arrière-plan
 */
export function getInstantPosition(onUpdate?: (position: GracefulPosition) => void): GracefulPosition {
  // Retourner immédiatement la position en cache ou par défaut
  const instant = cachedPosition || DEFAULT_POSITION;
  console.log('⚡ Position instantanée:', instant.source);
  
  // En arrière-plan, essayer d'obtenir une position fraîche
  if (onUpdate) {
    getQuickPosition().then((freshPosition) => {
      // Si la position a changé, notifier
      if (freshPosition.lat !== instant.lat || freshPosition.lng !== instant.lng) {
        console.log('🔄 Position mise à jour en arrière-plan');
        onUpdate(freshPosition);
      }
    }).catch(() => {
      // Ignorer les erreurs en arrière-plan
    });
  }
  
  return instant;
}

/**
 * 🗺️ Obtient la position pour la carte (peut être par défaut si GPS non disponible)
 */
export async function getMapPosition(): Promise<GracefulPosition> {
  const position = await getCurrentPosition();
  
  if (position.isDefault) {
    console.log('🗺️ Position par défaut utilisée pour la carte (Kinshasa)');
  } else {
    console.log('🗺️ Position GPS utilisée pour la carte');
  }
  
  return position;
}

/**
 * 💾 Met en cache une position manuellement (utile après une recherche d'adresse)
 */
export function cachePosition(lat: number, lng: number, accuracy?: number) {
  cachedPosition = {
    lat,
    lng,
    accuracy: accuracy || 100,
    isDefault: false,
    source: 'cached'
  };
  
  console.log('💾 Position mise en cache:', cachedPosition);
}

/**
 * 🧹 Efface le cache de position
 */
export function clearPositionCache() {
  cachedPosition = null;
  console.log('🧹 Cache de position effacé');
}

/**
 * ℹ️ Obtient des informations sur l'état de la géolocalisation
 */
export async function getGeolocationInfo(): Promise<{
  available: boolean;
  hasCache: boolean;
  currentPosition: GracefulPosition;
}> {
  const available = await isGeolocationAvailable();
  const currentPosition = await getCurrentPosition();

  return {
    available,
    hasCache: cachedPosition !== null && !cachedPosition.isDefault,
    currentPosition
  };
}