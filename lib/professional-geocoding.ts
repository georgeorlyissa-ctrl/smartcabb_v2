/**
 * 🌍 SERVICE DE GÉOCODAGE PROFESSIONNEL
 * 
 * ✅ MIGRATION COMPLÈTE VERS GOOGLE MAPS API
 * 
 * Utilise exclusivement Google Maps API :
 * 1. Google Places API (recherche d'adresses)
 * 2. Google Geocoding API (reverse geocoding)
 * 3. Google Directions API (itinéraires)
 * 4. Fallback : Base de données locale Kinshasa
 * 
 * SÉCURITÉ : Toutes les requêtes passent par le backend proxy
 */

import * as GoogleMapsService from './google-maps-service';

export interface ProfessionalPlace {
  id: string;
  name: string;
  description: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  fullAddress?: string;
  distance?: number;
  rating?: number;
  userRatingsTotal?: number;
  source: 'google_maps' | 'local';
  placeId?: string;
}

export interface RouteInfo {
  distance: number; // en kilomètres
  duration: number; // en minutes
  coordinates: Array<{ lat: number; lng: number }>;
  polyline: string;
  steps: any[];
}

/**
 * 🔍 RECHERCHE D'ADRESSES PROFESSIONNELLE
 * 
 * Utilise Google Maps avec fallback vers base locale
 */
export async function searchProfessionalPlaces(
  query: string,
  currentLocation?: { lat: number; lng: number }
): Promise<ProfessionalPlace[]> {
  if (!query || query.trim().length < 2) {
    return [];
  }

  console.log('🔍 ===== RECHERCHE GOOGLE MAPS =====');
  console.log(`📝 Query: "${query}"`);
  console.log(`📍 Position:`, currentLocation);

  try {
    // ✅ RECHERCHE HYBRIDE : Google Maps + Base locale
    const results = await GoogleMapsService.hybridSearch(query, currentLocation);
    
    console.log(`✅ ${results.length} résultats trouvés`);
    console.log('🔍 ===== RECHERCHE TERMINÉE =====');
    
    return results;

  } catch (error) {
    console.error('❌ Erreur recherche Google Maps:', error);
    console.log('🔍 ===== RECHERCHE TERMINÉE (ERREUR) =====');
    return [];
  }
}

/**
 * 🚗 CALCUL D'ITINÉRAIRE PROFESSIONNEL
 * 
 * Utilise Google Directions API
 */
export async function calculateRoute(
  start: { lat: number; lng: number },
  end: { lat: number; lng: number }
): Promise<RouteInfo | null> {
  try {
    console.log('🚗 Calcul d\'itinéraire Google Maps:', start, '→', end);

    const route = await GoogleMapsService.calculateRoute(start, end);
    
    if (!route) {
      console.error('❌ Aucun itinéraire trouvé');
      return null;
    }

    console.log(`✅ Itinéraire calculé: ${route.distance.toFixed(1)} km, ${Math.round(route.duration)} min`);
    
    return {
      distance: route.distance,
      duration: route.duration,
      coordinates: route.coordinates,
      polyline: route.polyline,
      steps: route.steps
    };

  } catch (error) {
    console.error('❌ Erreur calcul d\'itinéraire:', error);
    return null;
  }
}

/**
 * 📍 REVERSE GEOCODING (Coordonnées → Adresse)
 */
export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<ProfessionalPlace | null> {
  try {
    console.log(`📍 Google Maps - Reverse Geocoding: (${lat}, ${lng})`);

    const result = await GoogleMapsService.reverseGeocode(lat, lng);
    
    if (!result) {
      console.error('❌ Aucune adresse trouvée');
      return null;
    }

    console.log('✅ Reverse Geocoding réussi');
    
    return result;

  } catch (error) {
    console.error('❌ Erreur reverseGeocode:', error);
    return null;
  }
}

/**
 * 📍 OBTENIR LES COORDONNÉES D'UN LIEU GOOGLE PLACES
 * 
 * Appelé quand l'utilisateur sélectionne un lieu depuis Autocomplete
 */
export async function getPlaceCoordinates(placeId: string): Promise<{
  coordinates: { lat: number; lng: number };
  name: string;
  fullAddress: string;
} | null> {
  try {
    console.log('📍 Récupération coordonnées pour place_id:', placeId);

    const place = await GoogleMapsService.getPlaceDetails(placeId);
    
    if (!place) {
      console.error('❌ Lieu non trouvé');
      return null;
    }
    
    console.log(`✅ Coordonnées récupérées: ${place.coordinates.lat}, ${place.coordinates.lng}`);
    
    return {
      coordinates: place.coordinates,
      name: place.name,
      fullAddress: place.fullAddress || place.description
    };

  } catch (error) {
    console.error('❌ Erreur getPlaceCoordinates:', error);
    return null;
  }
}

/**
 * 📏 CALCULER LA DISTANCE ENTRE DEUX POINTS (Haversine)
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  return GoogleMapsService.calculateDistance(lat1, lng1, lat2, lng2);
}

/**
 * 🎨 OBTENIR UNE DESCRIPTION ENRICHIE
 */
export function getEnrichedDescription(place: ProfessionalPlace): string {
  let description = place.description;
  
  if (place.rating && place.userRatingsTotal) {
    description += ` • ⭐ ${place.rating.toFixed(1)} (${place.userRatingsTotal})`;
  }
  
  if (place.distance !== undefined) {
    description += ` • ${place.distance.toFixed(1)} km`;
  }
  
  return description;
}

/**
 * 🧪 TESTER LA DISPONIBILITÉ DE GOOGLE MAPS API
 */
export async function testAPIsAvailability(): Promise<{
  googleMaps: boolean;
  local: boolean;
}> {
  const googleMaps = await GoogleMapsService.testGoogleMapsAvailability();
  
  return {
    googleMaps,
    local: true // Base locale toujours disponible
  };
}
