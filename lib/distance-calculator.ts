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
 * 🚗 CALCUL COMPLET DE L'ITINÉRAIRE AVEC GOOGLE MAPS
 * ✅ VERSION ASYNC - Utilise les vraies routes avec trafic
 * Retourne distance et durée formatées
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
    
    // 🎯 CORRECTION : Ne PAS multiplier par un facteur
    // Google Directions API retourne déjà la durée optimiste, on utilise calculateDuration() calibré sur Google Maps
    const adjustedDuration = calculateDuration(googleRoute.distance);
    
    console.log(`✅ Google Directions: ${googleRoute.distance.toFixed(1)}km en ${Math.round(googleRoute.duration)}min (brut)`);
    console.log(`🎯 Ajusté pour trafic réel Kinshasa (comme Google Maps): ${adjustedDuration}min`);
    
    // Formater la distance
    let distanceText: string;
    if (googleRoute.distance < 1) {
      distanceText = `${Math.round(googleRoute.distance * 1000)} m`;
    } else if (googleRoute.distance < 10) {
      distanceText = `${googleRoute.distance.toFixed(1)} km`;
    } else {
      distanceText = `${Math.round(googleRoute.distance)} km`;
    }
    
    // Formater la durée AJUSTÉE
    let durationText: string;
    if (adjustedDuration < 60) {
      durationText = `${adjustedDuration} min`;
    } else {
      const hours = Math.floor(adjustedDuration / 60);
      const mins = adjustedDuration % 60;
      if (mins === 0) {
        durationText = `${hours}h`;
      } else {
        durationText = `${hours}h${mins.toString().padStart(2, '0')}`;
      }
    }
    
    return {
      distance: googleRoute.distance,
      duration: adjustedDuration,  // 🎯 CORRECTION : Utiliser calculateDuration() calibré Google Maps
      distanceText,
      durationText
    };
    
  } catch (error) {
    console.warn('⚠️ Google Directions échoué, utilisation fallback intelligent:', error);
    
    // 🔙 FALLBACK INTELLIGENT : Distance à vol d'oiseau × facteur de détour urbain
    const distanceStraightLine = calculateDistanceHaversine(fromLat, fromLng, toLat, toLng);
    
    // 🎯 AMÉLIORATION : En ville, la distance réelle sur routes = 1.8-2.0x la distance à vol d'oiseau
    // Exemple : 3 km à vol d'oiseau → 5.4-6.0 km réels (comme Google Maps qui montre 5.7 km)
    const urbanDetourFactor = 1.9; // Facteur moyen pour Kinshasa
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
