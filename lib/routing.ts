/**
 * 🗺️ SERVICE DE ROUTING GOOGLE MAPS POUR SMARTCABB
 * 
 * ✅ Utilise Google Directions API exclusivement
 * ✅ Optimisé pour Kinshasa, RDC
 * ✅ Compatible avec Yango/Uber pour itinéraires réalistes
 * ✅ Système de fallback intelligent
 */

import * as GoogleMapsService from './google-maps-service';

interface RoutePoint {
  lat: number;
  lng: number;
}

interface RouteResult {
  coordinates: RoutePoint[];
  distance: number; // en kilomètres
  duration: number; // en minutes
  geometry: string; // Polyline encodée
}

/**
 * Calculer un itinéraire réel entre deux points avec Google Directions API
 * 
 * ✅ Google utilise les vraies routes avec trafic en temps réel
 * ✅ Même technologie que Yango/Uber
 * ✅ Optimisé pour Kinshasa
 */
export async function calculateRoute(
  start: RoutePoint,
  end: RoutePoint
): Promise<RouteResult> {
  console.log(`🛣️ Calcul d'itinéraire Google Maps: (${start.lat.toFixed(4)}, ${start.lng.toFixed(4)}) → (${end.lat.toFixed(4)}, ${end.lng.toFixed(4)})`);
  
  // 🎯 VALIDATION DES COORDONNÉES (zone Kinshasa/RDC)
  if (!isValidCoordinate(start) || !isValidCoordinate(end)) {
    console.error('❌ Coordonnées invalides pour Kinshasa !');
    return createFallbackRoute(start, end);
  }
  
  try {
    // ✅ GOOGLE DIRECTIONS API
    const route = await GoogleMapsService.getDirections(start, end);
    
    if (!route) {
      console.warn('⚠️ Aucun itinéraire trouvé via Google Maps, utilisation du fallback');
      return createFallbackRoute(start, end);
    }

    console.log(`✅ ITINÉRAIRE GOOGLE MAPS CALCULÉ AVEC SUCCÈS !`);
    console.log(`   📏 Distance: ${route.distance.toFixed(1)} km`);
    console.log(`   ⏱️  Durée: ${Math.round(route.duration)} min`);
    console.log(`   📍 Points: ${route.coordinates.length} coordonnées`);
    
    return {
      coordinates: route.coordinates,
      distance: route.distance,
      duration: route.duration,
      geometry: route.polyline
    };
    
  } catch (error) {
    console.error('❌ Erreur Google Directions API:', error);
    return createFallbackRoute(start, end);
  }
}

/**
 * 🛡️ CRÉER UN ITINÉRAIRE DE SECOURS (fallback)
 * Utilisé uniquement si Google Directions API échoue complètement
 */
function createFallbackRoute(start: RoutePoint, end: RoutePoint): RouteResult {
  console.warn('📍 Utilisation d\'un itinéraire de SECOURS (ligne droite avec interpolation)');
  
  const distanceKm = calculateDistanceAsTheCrowFlies(start, end);
  const durationMin = estimateDuration(distanceKm);
  
  // ✅ Au lieu d'une ligne droite, on crée des points intermédiaires
  const intermediatePoints = createIntermediatePoints(start, end, 20);
  
  return {
    coordinates: intermediatePoints,
    distance: distanceKm * 1.3, // +30% car routes ne sont jamais droites
    duration: durationMin,
    geometry: ''
  };
}

/**
 * 📍 CRÉER DES POINTS INTERMÉDIAIRES (pour un itinéraire plus naturel)
 */
function createIntermediatePoints(
  start: RoutePoint,
  end: RoutePoint,
  numPoints: number = 20
): RoutePoint[] {
  const points: RoutePoint[] = [start];
  
  for (let i = 1; i < numPoints; i++) {
    const ratio = i / numPoints;
    
    // Interpolation linéaire avec légère courbe
    const lat = start.lat + (end.lat - start.lat) * ratio;
    const lng = start.lng + (end.lng - start.lng) * ratio;
    
    // Ajouter une légère variation pour simuler les routes
    const variation = Math.sin(ratio * Math.PI) * 0.002;
    
    points.push({
      lat: lat + variation,
      lng: lng + variation
    });
  }
  
  points.push(end);
  return points;
}

/**
 * ✅ VALIDER QUE LES COORDONNÉES SONT DANS LA ZONE DE KINSHASA
 */
function isValidCoordinate(point: RoutePoint): boolean {
  // Zone approximative de Kinshasa et environs
  // Lat: -4.15 à -4.65 (Nord-Sud)
  // Lng: 15.15 à 15.65 (Ouest-Est)
  
  const isLatValid = point.lat >= -4.65 && point.lat <= -4.15;
  const isLngValid = point.lng >= 15.15 && point.lng <= 15.65;
  
  return isLatValid && isLngValid;
}

/**
 * Calculer la distance à vol d'oiseau (Haversine)
 */
function calculateDistanceAsTheCrowFlies(
  start: RoutePoint,
  end: RoutePoint
): number {
  const R = 6371; // Rayon de la Terre en km
  const dLat = toRadians(end.lat - start.lat);
  const dLng = toRadians(end.lng - start.lng);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(start.lat)) * Math.cos(toRadians(end.lat)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance;
}

/**
 * Estimer la durée de trajet (formule optimisée pour Kinshasa)
 */
function estimateDuration(distanceKm: number): number {
  // 🚗 VITESSES MOYENNES À KINSHASA (données réalistes)
  let avgSpeedKmh: number;
  
  if (distanceKm < 3) {
    avgSpeedKmh = 18; // Centre-ville dense
  } else if (distanceKm < 7) {
    avgSpeedKmh = 25; // Zones intermédiaires
  } else {
    avgSpeedKmh = 35; // Périphérie / grands axes
  }
  
  const durationHours = distanceKm / avgSpeedKmh;
  const durationMin = durationHours * 60;
  
  // ⏱️ Ajouter 25% pour les arrêts, feux rouges, trafic
  return durationMin * 1.25;
}

/**
 * Convertir degrés → radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Simplifier un itinéraire (réduire le nombre de points)
 * Utile pour améliorer les performances d'affichage
 */
export function simplifyRoute(
  coordinates: RoutePoint[],
  maxPoints: number = 100
): RoutePoint[] {
  if (coordinates.length <= maxPoints) {
    return coordinates;
  }
  
  // Algorithme de Douglas-Peucker simplifié
  const step = Math.ceil(coordinates.length / maxPoints);
  const simplified: RoutePoint[] = [];
  
  for (let i = 0; i < coordinates.length; i += step) {
    simplified.push(coordinates[i]);
  }
  
  // Toujours inclure le dernier point
  if (simplified[simplified.length - 1] !== coordinates[coordinates.length - 1]) {
    simplified.push(coordinates[coordinates.length - 1]);
  }
  
  return simplified;
}

/**
 * Calculer plusieurs routes alternatives (si disponible avec Google)
 */
export async function calculateAlternativeRoutes(
  start: RoutePoint,
  end: RoutePoint,
  alternatives: number = 3
): Promise<RouteResult[]> {
  try {
    // Google Directions API peut retourner plusieurs routes
    const mainRoute = await calculateRoute(start, end);
    
    // Pour l'instant, on retourne seulement la route principale
    // TODO: Implémenter alternatives avec Google Directions API
    return [mainRoute];
    
  } catch (error) {
    console.warn('⚠️ Erreur calcul routes alternatives:', error);
    
    // Fallback: une seule route
    const mainRoute = await calculateRoute(start, end);
    return [mainRoute];
  }
}