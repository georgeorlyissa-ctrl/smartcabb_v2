import { calculateDuration } from './duration-calculator';
import * as GoogleMapsService from './google-maps-service';

/**
 * 📏 CALCUL DE DISTANCE ET ITINÉRAIRE AVEC GOOGLE MAPS API
 * 
 * Ce module gère :
 * - Calcul d'itinéraire avec Google Directions API (vraies routes + trafic)
 * - Fallback intelligent avec distance à vol d'oiseau × facteur urbain
 * - Calibration précise pour Kinshasa
 */

// Types
interface Location {
  lat: number;
  lng: number;
}

interface RouteCalculation {
  distance: number;
  duration: number;
  distanceText: string;
  durationText: string;
}

/**
 * 📐 FORMULE DE HAVERSINE : Distance à vol d'oiseau
 * Utilisée comme fallback quand Google Maps échoue
 */
export function calculateDistanceHaversine(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Rayon de la Terre en km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance;
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * 🗺️ CALCUL D'ITINÉRAIRE AVEC GOOGLE DIRECTIONS API
 * Retourne la distance et durée RÉELLES avec le trafic actuel
 * ✅ Même technologie que Yango/Uber/Google Maps
 */
async function calculateGoogleRoute(
  from: Location,
  to: Location
): Promise<{ distance: number; duration: number }> {
  console.log('🗺️ Calcul itinéraire Google Directions API...');
  
  const route = await GoogleMapsService.getDirections(from, to);
  
  if (!route) {
    throw new Error('Google Directions API returned no routes');
  }
  
  console.log(`✅ Google Directions: ${route.distance.toFixed(1)} km, ${Math.round(route.duration)} min`);
  
  return {
    distance: route.distance,  // déjà en km
    duration: route.duration   // déjà en minutes
  };
}

/**
 * 🛣️ CALCUL D'ITINÉRAIRE AVEC OSRM (OpenStreetMap, gratuit sans clé)
 * Même principe que Yango/Uber : distance sur le vrai réseau routier.
 * Utilisé quand Google Directions est indisponible (ex: facturation).
 */
async function calculateOSRMRoute(
  from: Location,
  to: Location
): Promise<{ distance: number; duration: number }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const url =
      `https://router.project-osrm.org/route/v1/driving/` +
      `${from.lng},${from.lat};${to.lng},${to.lat}?overview=false`;
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`OSRM HTTP ${response.status}`);
    const data = await response.json();
    const route = data?.routes?.[0];
    if (!route || typeof route.distance !== 'number' || route.distance <= 0) {
      throw new Error('OSRM: aucun itinéraire');
    }
    const distanceKm = route.distance / 1000;
    const durationMin = (route.duration || 0) / 60;

    // Garde-fou : la distance routière doit être cohérente avec le vol d'oiseau
    const straight = calculateDistanceHaversine(from.lat, from.lng, to.lat, to.lng);
    if (distanceKm < straight * 0.9 || distanceKm > Math.max(straight * 4, straight + 30)) {
      throw new Error('OSRM: distance incohérente');
    }

    console.log(`✅ OSRM: ${distanceKm.toFixed(1)} km, ${Math.round(durationMin)} min`);
    return { distance: distanceKm, duration: durationMin };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * 📐 FACTEUR DE DÉTOUR URBAIN CALIBRÉ (style Yango/Uber)
 * Le rapport route / vol d'oiseau dépend de la distance : les trajets
 * courts suivent presque la ligne droite, les longs contournent.
 * (L'ancien facteur fixe ×1,9 surestimait les courtes distances.)
 */
function urbanDetourFactor(straightKm: number): number {
  if (straightKm < 2) return 1.35;
  if (straightKm < 5) return 1.5;
  if (straightKm < 15) return 1.65;
  return 1.8;
}

/** Formate distance + durée comme le reste du module */
function formatRoute(distanceKm: number, durationMin: number): { distanceText: string; durationText: string } {
  let distanceText: string;
  if (distanceKm < 1) {
    distanceText = `${Math.round(distanceKm * 1000)} m`;
  } else if (distanceKm < 10) {
    distanceText = `${distanceKm.toFixed(1)} km`;
  } else {
    distanceText = `${Math.round(distanceKm)} km`;
  }
  let durationText: string;
  if (durationMin < 60) {
    durationText = `${durationMin} min`;
  } else {
    const hours = Math.floor(durationMin / 60);
    const mins = Math.round(durationMin % 60);
    durationText = mins === 0 ? `${hours}h` : `${hours}h${mins.toString().padStart(2, '0')}`;
  }
  return { distanceText, durationText };
}
/**
 * 🚗 CALCUL COMPLET DE L'ITINÉRAIRE (style Yango/Uber)
 * 1. Google Directions (vraies routes + trafic)
 * 2. OSRM routier gratuit (vrai réseau OSM, sans clé)
 * 3. Fallback vol d'oiseau × facteur calibré par distance
 * ✅ VERSION ASYNC - Retourne distance et durée formatées
 */
export async function calculateRoute(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
): Promise<RouteCalculation> {
  try {
    console.log(`🧮 Calcul itinéraire: (${fromLat}, ${fromLng}) → (${toLat}, ${toLng})`);
    
    // ✅ ESSAYER D'ABORD AVEC GOOGLE DIRECTIONS API (vrais itinéraires + trafic)
    const googleRoute = await calculateGoogleRoute(
      { lat: fromLat, lng: fromLng },
      { lat: toLat, lng: toLng }
    );
    
    console.log(`✅ Google Directions: ${googleRoute.distance.toFixed(1)}km en ${Math.round(googleRoute.duration)}min (avec trafic réel)`);
    
    // Formater la distance
    let distanceText: string;
    if (googleRoute.distance < 1) {
      distanceText = `${Math.round(googleRoute.distance * 1000)} m`;
    } else if (googleRoute.distance < 10) {
      distanceText = `${googleRoute.distance.toFixed(1)} km`;
    } else {
      distanceText = `${Math.round(googleRoute.distance)} km`;
    }
    
    // Formater la durée GOOGLE (trafic réel)
    let durationText: string;
    if (googleRoute.duration < 60) {
      durationText = `${Math.round(googleRoute.duration)} min`;
    } else {
      const hours = Math.floor(googleRoute.duration / 60);
      const mins = Math.round(googleRoute.duration % 60);
      if (mins === 0) {
        durationText = `${hours}h`;
      } else {
        durationText = `${hours}h${mins.toString().padStart(2, '0')}`;
      }
    }
    
    return {
      distance: googleRoute.distance,
      duration: Math.round(googleRoute.duration),
      distanceText,
      durationText
    };
    
  } catch (error) {
    console.warn('⚠️ Google Directions échoué, essai OSRM routier:', error);

    try {
      const osrmRoute = await calculateOSRMRoute(
        { lat: fromLat, lng: fromLng },
        { lat: toLat, lng: toLng }
      );

      // Durée : OSRM si cohérente, sinon vitesse réelle Kinshasa
      let duration = osrmRoute.duration;
      if (!duration || duration <= 0) {
        duration = calculateDuration(osrmRoute.distance);
      }

      console.log(`✅ OSRM: ${osrmRoute.distance.toFixed(1)}km en ${Math.round(duration)}min (réseau routier)`);

      return {
        distance: osrmRoute.distance,
        duration: Math.round(duration),
        ...formatRoute(osrmRoute.distance, Math.round(duration)),
      };
    } catch (osrmError) {
      console.warn('⚠️ OSRM échoué, utilisation fallback calibré:', osrmError);
    }

    // 🔙 FALLBACK : Distance à vol d'oiseau × facteur calibré par distance
    const distanceStraightLine = calculateDistanceHaversine(fromLat, fromLng, toLat, toLng);

    // 🎯 Facteur variable selon la distance (au lieu de l'ancien ×1,9 fixe
    // qui surestimait les trajets courts)
    const urbanDetourFactor = urbanDetourFactor(distanceStraightLine);
    const estimatedRealDistance = distanceStraightLine * urbanDetourFactor;
    
    // 🎯 Calculer la durée avec la vitesse réelle de Kinshasa (comme Google Maps)
    const duration = calculateDuration(estimatedRealDistance);
    
    console.log('🔄 Fallback intelligent appliqué:');
    console.log(`  - Distance à vol d'oiseau: ${distanceStraightLine.toFixed(1)} km`);
    console.log(`  - Distance réelle estimée (×${urbanDetourFactor}): ${estimatedRealDistance.toFixed(1)} km`);
    console.log(`  - Durée calculée (vitesse réelle Kinshasa): ${duration} min`);
    
    // Formater la distance
    let distanceText: string;
    if (estimatedRealDistance < 1) {
      distanceText = `${Math.round(estimatedRealDistance * 1000)} m`;
    } else if (estimatedRealDistance < 10) {
      distanceText = `${estimatedRealDistance.toFixed(1)} km`;
    } else {
      distanceText = `${Math.round(estimatedRealDistance)} km`;
    }
    
    // Formater la durée
    let durationText: string;
    if (duration < 60) {
      durationText = `${duration} min`;
    } else {
      const hours = Math.floor(duration / 60);
      const mins = duration % 60;
      if (mins === 0) {
        durationText = `${hours}h`;
      } else {
        durationText = `${hours}h${mins.toString().padStart(2, '0')}`;
      }
    }
    
    return {
      distance: estimatedRealDistance,
      duration,
      distanceText,
      durationText
    };
  }
}

/**
 * 🚦 OBTENIR LES CONDITIONS DE TRAFIC ACTUELLES
 * Retourne un objet avec emoji, couleur et description pour l'affichage UI
 */
export function getCurrentTrafficCondition(): {
  emoji: string;
  color: string;
  description: string;
  level: 'fluide' | 'modéré' | 'dense' | 'embouteillage';
} {
  const now = new Date();
  const hour = now.getHours();
  
  // 🎯 CALIBRÉ SUR LES CONDITIONS RÉELLES DE KINSHASA
  if ((hour >= 5 && hour < 7) || (hour >= 22 || hour < 5)) {
    // Trafic fluide (nuit/tôt le matin)
    return {
      emoji: '🟢',
      color: 'text-green-600',
      description: 'Trafic fluide',
      level: 'fluide'
    };
  } else if ((hour >= 7 && hour < 9) || (hour >= 19 && hour < 22)) {
    // Trafic modéré (début/fin de journée)
    return {
      emoji: '🟡',
      color: 'text-yellow-600',
      description: 'Trafic modéré',
      level: 'modéré'
    };
  } else if (hour >= 9 && hour < 17) {
    // Trafic dense (journée)
    return {
      emoji: '🟠',
      color: 'text-orange-600',
      description: 'Trafic dense',
      level: 'dense'
    };
  } else {
    // Trafic modéré par défaut
    return {
      emoji: '🟡',
      color: 'text-yellow-600',
      description: 'Trafic modéré',
      level: 'modéré'
    };
  }
}
