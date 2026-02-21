/**
 * ⏱️ CALCUL DE DURÉE POUR KINSHASA
 * 
 * Calibré sur Google Maps : 5.7 km en 27 min = 12.7 km/h
 * Vitesses réelles observées à Kinshasa selon l'heure de la journée
 */

/**
 * Formate la durée pour l'affichage
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (mins === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h${mins.toString().padStart(2, '0')}`;
}

/**
 * 🚦 Détermine les conditions de trafic actuelles
 * 🔥 FACTEURS CALIBRÉS POUR KINSHASA (trafic TRÈS DENSE en permanence)
 * 🚨 OSRM calcule en conditions idéales, il faut multiplier par 2.5-4x minimum !
 */
export function getCurrentTrafficConditions(): {
  period: string;
  congestionMultiplier: number;
  averageSpeedKmh: number;
  description: string;
} {
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay(); // 0 = dimanche, 6 = samedi
  
  // Weekend - Trafic plus léger mais toujours dense
  if (day === 0 || day === 6) {
    if (hour >= 6 && hour < 9) {
      return {
        period: 'weekend_morning',
        congestionMultiplier: 1.5,
        averageSpeedKmh: 20,
        description: 'Weekend matin - Circulation fluide'
      };
    } else if (hour >= 9 && hour < 17) {
      return {
        period: 'weekend_day',
        congestionMultiplier: 2.0,
        averageSpeedKmh: 15,
        description: 'Weekend journée - Circulation modérée'
      };
    } else {
      return {
        period: 'weekend_evening',
        congestionMultiplier: 1.8,
        averageSpeedKmh: 18,
        description: 'Weekend soirée - Circulation fluide'
      };
    }
  }
  
  // Jours de semaine
  if (hour >= 5 && hour < 7) {
    // Tôt le matin - Circulation fluide
    return {
      period: 'early_morning',
      congestionMultiplier: 1.3,
      averageSpeedKmh: 25,
      description: 'Tôt le matin - Circulation fluide'
    };
  } else if (hour >= 7 && hour < 9) {
    // Heure de pointe matin - Circulation dense
    return {
      period: 'morning_rush',
      congestionMultiplier: 3.5,
      averageSpeedKmh: 12,
      description: 'Heure de pointe - Circulation très dense'
    };
  } else if (hour >= 9 && hour < 12) {
    // Milieu de matinée - Circulation dense
    return {
      period: 'mid_morning',
      congestionMultiplier: 2.8,
      averageSpeedKmh: 14,
      description: 'Milieu de matinée - Circulation dense'
    };
  } else if (hour >= 12 && hour < 14) {
    // Midi - Circulation très dense
    return {
      period: 'lunch_time',
      congestionMultiplier: 3.2,
      averageSpeedKmh: 13,
      description: 'Heure du déjeuner - Circulation très dense'
    };
  } else if (hour >= 14 && hour < 17) {
    // Après-midi - Circulation dense
    return {
      period: 'afternoon',
      congestionMultiplier: 2.5,
      averageSpeedKmh: 15,
      description: 'Après-midi - Circulation dense'
    };
  } else if (hour >= 17 && hour < 19) {
    // Heure de pointe soir - Circulation SATURÉE
    return {
      period: 'evening_rush',
      congestionMultiplier: 4.0,
      averageSpeedKmh: 10,
      description: 'Heure de pointe - Circulation saturée'
    };
  } else if (hour >= 19 && hour < 22) {
    // Début de soirée - Circulation encore dense
    return {
      period: 'early_evening',
      congestionMultiplier: 2.2,
      averageSpeedKmh: 16,
      description: 'Début de soirée - Circulation modérée'
    };
  } else {
    // Nuit - Circulation fluide
    return {
      period: 'night',
      congestionMultiplier: 1.2,
      averageSpeedKmh: 30,
      description: 'Nuit - Circulation fluide'
    };
  }
}

/**
 * ⏱️ CALCUL DE DURÉE BASÉ SUR LES CONDITIONS RÉELLES DE KINSHASA
 * 
 * 🎯 CALIBRÉ SUR GOOGLE MAPS : 5.7 km en 27 min = 12.7 km/h
 * ✅ Utilise les vitesses moyennes RÉELLES de Kinshasa
 * 
 * Vitesses moyennes à Kinshasa (observées Google Maps) :
 * - Trafic fluide (5h-7h, 22h-5h) : 25-30 km/h
 * - Trafic modéré (7h-9h, 19h-22h) : 15-18 km/h
 * - Trafic dense (9h-17h) : 12-14 km/h (🎯 comme Google Maps)
 * - Embouteillages extrêmes : 8-10 km/h
 */
export function calculateDuration(distanceKm: number): number {
  const now = new Date();
  const hour = now.getHours();
  
  let averageSpeed: number;
  
  // 🎯 VITESSES CALIBRÉES SUR GOOGLE MAPS (Kinshasa 2025)
  if ((hour >= 5 && hour < 7) || (hour >= 22 || hour < 5)) {
    // Trafic fluide (nuit/tôt le matin)
    averageSpeed = 27.5; // km/h
  } else if ((hour >= 7 && hour < 9) || (hour >= 19 && hour < 22)) {
    // Trafic modéré (début/fin de journée)
    averageSpeed = 16.5; // km/h
  } else if (hour >= 9 && hour < 17) {
    // 🎯 Trafic dense journée (9h-17h) - CALIBRÉ SUR GOOGLE MAPS
    // Google Maps : 5.7 km en 27 min = 12.7 km/h
    averageSpeed = 13.0; // km/h (légèrement au-dessus pour être conservateur)
  } else {
    // Par défaut
    averageSpeed = 15; // km/h
  }
  
  // Ajustements selon la distance (courtes distances = plus lent)
  if (distanceKm < 2) {
    // Courtes distances : beaucoup d'arrêts/démarrages
    averageSpeed *= 0.75;
  } else if (distanceKm > 10) {
    // Longues distances : possibilité d'utiliser des axes rapides
    averageSpeed *= 1.1;
  }
  
  // Calcul de la durée en minutes
  const durationMinutes = (distanceKm / averageSpeed) * 60;
  
  // Ajouter un buffer de sécurité (3-5%)
  const buffer = durationMinutes * 0.04;
  
  return Math.round(durationMinutes + buffer);
}

/**
 * Calcule une fourchette de durée (min-max)
 */
export function calculateDurationRange(distanceKm: number): {
  min: number;
  estimated: number;
  max: number;
} {
  const estimated = calculateDuration(distanceKm);
  
  // Fourchette de ±20% (trafic imprévisible à Kinshasa)
  const variance = 0.2;
  const min = Math.ceil(estimated * (1 - variance));
  const max = Math.ceil(estimated * (1 + variance));
  
  return { min, estimated, max };
}

/**
 * 📊 CALCUL ESTIMÉ DE DURÉE (wrapper simple)
 * Pour compatibilité avec l'ancien code
 */
export function calculateEstimatedDuration(
  pickup: { lat: number; lng: number },
  destination: { lat: number; lng: number }
): number {
  // Calcul simple de distance Haversine
  const R = 6371; // Rayon de la Terre en km
  const dLat = ((destination.lat - pickup.lat) * Math.PI) / 180;
  const dLng = ((destination.lng - pickup.lng) * Math.PI) / 180;
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((pickup.lat * Math.PI) / 180) *
      Math.cos((destination.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceKm = R * c;
  
  // Appliquer le facteur de détour urbain
  const realDistanceKm = distanceKm * 1.9;
  
  return calculateDuration(realDistanceKm);
}

/**
 * 🔍 CALCUL DÉTAILLÉ DE DURÉE (avec breakdown)
 * Pour compatibilité avec l'ancien code
 */
export function calculateDetailedDuration(
  pickup: { lat: number; lng: number },
  destination: { lat: number; lng: number }
): {
  baseTime: number;
  trafficTime: number;
  stopsTime: number;
  totalDuration: number;
  confidence: number;
} {
  const totalDuration = calculateEstimatedDuration(pickup, destination);
  const traffic = getCurrentTrafficConditions();
  
  // Estimation du breakdown
  const baseTime = Math.round(totalDuration * 0.6);
  const trafficTime = Math.round(totalDuration * 0.3);
  const stopsTime = Math.round(totalDuration * 0.1);
  
  return {
    baseTime,
    trafficTime,
    stopsTime,
    totalDuration,
    confidence: traffic.congestionMultiplier > 3 ? 0.7 : 0.85
  };
}

/**
 * Exemples d'utilisation :
 * 
 * // Calcul simple
 * const duration = calculateDuration(distanceKm);
 * console.log(`Durée estimée : ${duration} minutes`);
 * 
 * // Fourchette
 * const range = calculateDurationRange(distanceKm);
 * console.log(`Entre ${range.min} et ${range.max} minutes`);
 * 
 * // Calcul avec coordonnées
 * const duration2 = calculateEstimatedDuration(pickup, destination);
 * console.log(`Durée : ${formatDuration(duration2)}`);
 */
