/**
 * 🗺️ SERVICE GOOGLE MAPS COMPLET - SMARTCABB
 * 
 * Remplace complètement OpenStreetMap, Mapbox et Nominatim
 * Utilise 100% Google Maps API :
 * - Google Places API (recherche d'adresses)
 * - Google Geocoding API (reverse geocoding)
 * - Google Directions API (itinéraires)
 * 
 * Architecture : Frontend → Backend (proxy sécurisé) → Google API
 */

import { projectId, publicAnonKey } from '../utils/supabase/info';

// URL du backend
const BACKEND_URL = `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52`;

export interface GooglePlace {
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
  source: 'google_maps';
  placeId?: string;
  types?: string[];
}

export interface GoogleRoute {
  distance: number; // en kilomètres
  duration: number; // en minutes
  coordinates: Array<{ lat: number; lng: number }>;
  polyline: string;
  steps: GoogleRouteStep[];
}

export interface GoogleRouteStep {
  instruction: string;
  distance: number;
  duration: number;
  startLocation: { lat: number; lng: number };
  endLocation: { lat: number; lng: number };
}

/**
 * 🔍 RECHERCHE D'ADRESSES AVEC GOOGLE PLACES API
 * 
 * Utilise Text Search ou Autocomplete selon le type de requête
 */
export async function searchPlaces(
  query: string,
  currentLocation?: { lat: number; lng: number }
): Promise<GooglePlace[]> {
  if (!query || query.trim().length < 2) {
    console.log('⚠️ Query trop courte:', query);
    return [];
  }

  console.log('🔍 ===== RECHERCHE GOOGLE PLACES API =====');
  console.log('📝 Query:', query);
  console.log('📍 Position:', currentLocation);

  try {
    const url = new URL(`${BACKEND_URL}/google-maps/search`);
    url.searchParams.set('query', query);
    
    if (currentLocation) {
      url.searchParams.set('lat', currentLocation.lat.toString());
      url.searchParams.set('lng', currentLocation.lng.toString());
    }

    console.log('🌐 URL requête:', url.toString());

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`
      }
    });

    console.log('📡 Statut réponse:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erreur HTTP:', response.status);
      console.error('❌ Réponse brute:', errorText);
      
      try {
        const error = JSON.parse(errorText);
        console.error('❌ Erreur JSON:', error);
        console.error('❌ Message:', error.error || error.message || 'Erreur inconnue');
        
        // ⭐ AFFICHER L'ERREUR GOOGLE S'IL Y EN A UNE
        if (error.error) {
          console.error('🔴 ERREUR GOOGLE MAPS:', error.error);
          console.error('🔴 STATUS GOOGLE:', error.status || 'inconnu');
        }
      } catch (e) {
        console.error('❌ Erreur brute (non-JSON):', errorText);
      }
      
      return [];
    }

    const data = await response.json();
    
    console.log('📦 Réponse complète:', data);
    console.log('📊 Structure:', {
      success: data.success,
      status: data.status,
      results: data.results?.length || 0,
      error: data.error || 'aucune'
    });
    console.log(`✅ ${data.results?.length || 0} résultats trouvés`);
    
    if (data.results && data.results.length > 0) {
      console.log('📋 Premiers résultats:', data.results.slice(0, 3).map((r: any) => ({
        name: r.name,
        description: r.description,
        distance: r.distance ? `${r.distance.toFixed(1)}km` : 'N/A',
        rating: r.rating ? `⭐${r.rating}` : 'N/A'
      })));
    } else {
      console.warn('⚠️ ===== AUCUN RÉSULTAT =====');
      console.warn('🔍 Query:', query);
      console.warn('🔍 Status Google:', data.status || 'inconnu');
      console.warn('🔍 Erreur:', data.error || 'Pas d\'erreur');
      console.warn('🔍 Success:', data.success);
      
      // ⭐ AFFICHER DES SUGGESTIONS DE DÉBOGAGE
      if (data.status === 'ZERO_RESULTS') {
        console.warn('💡 Suggestion: La requête est valide mais aucun lieu trouvé à Kinshasa pour:', query);
      } else if (data.status === 'REQUEST_DENIED') {
        console.error('🔴 REQUEST_DENIED: Clé API mal configurée !');
        console.error('🔑 Vérifiez que GOOGLE_MAPS_SERVER_API_KEY est bien définie dans Supabase');
        console.error('🔑 Vérifiez que la clé backend N\'A PAS de restrictions HTTP referrers');
      } else if (data.status === 'INVALID_REQUEST') {
        console.error('🔴 INVALID_REQUEST: Paramètres de recherche invalides');
      }
    }
    
    console.log('🔍 ===== FIN RECHERCHE =====');
    
    return data.results || [];

  } catch (error) {
    console.error('❌ ===== ERREUR FATALE =====');
    console.error('❌ Erreur searchPlaces:', error);
    console.error('❌ Type:', error instanceof Error ? error.message : String(error));
    console.error('❌ Stack:', error instanceof Error ? error.stack : '');
    console.error('❌ ===== FIN ERREUR =====');
    return [];
  }
}

/**
 * 🔍 AUTOCOMPLETE INTELLIGENT (comme Yango)
 * 
 * Suggestions instantanées pendant la saisie
 */
export async function autocomplete(
  input: string,
  currentLocation?: { lat: number; lng: number }
): Promise<GooglePlace[]> {
  if (!input || input.trim().length < 2) {
    return [];
  }

  try {
    const url = new URL(`${BACKEND_URL}/google-maps/autocomplete`);
    url.searchParams.set('input', input);
    
    if (currentLocation) {
      url.searchParams.set('lat', currentLocation.lat.toString());
      url.searchParams.set('lng', currentLocation.lng.toString());
    }

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`
      }
    });

    if (!response.ok) {
      console.error('❌ Erreur autocomplete:', response.status);
      return [];
    }

    const data = await response.json();
    
    return data.predictions || [];

  } catch (error) {
    console.error('❌ Erreur autocomplete:', error);
    return [];
  }
}

/**
 * 📍 REVERSE GEOCODING (coordonnées → adresse)
 */
export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<GooglePlace | null> {
  try {
    const url = new URL(`${BACKEND_URL}/google-maps/reverse-geocode`);
    url.searchParams.set('lat', lat.toString());
    url.searchParams.set('lng', lng.toString());

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`
      }
    });

    if (!response.ok) {
      console.error('❌ Erreur reverse geocoding:', response.status);
      return null;
    }

    const data = await response.json();
    
    return data.result || null;

  } catch (error) {
    console.error('❌ Erreur reverseGeocode:', error);
    return null;
  }
}

/**
 * 🗺️ DÉTAILS D'UN LIEU
 */
export async function getPlaceDetails(placeId: string): Promise<GooglePlace | null> {
  try {
    const url = new URL(`${BACKEND_URL}/google-maps/place-details`);
    url.searchParams.set('place_id', placeId);

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`
      }
    });

    if (!response.ok) {
      console.error('❌ Erreur place details:', response.status);
      return null;
    }

    const data = await response.json();
    
    return data.result || null;

  } catch (error) {
    console.error('❌ Erreur getPlaceDetails:', error);
    return null;
  }
}

/**
 * 🚗 CALCUL D'ITINÉRAIRE
 */
export async function getDirections(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  waypoints?: Array<{ lat: number; lng: number }>
): Promise<GoogleRoute | null> {
  try {
    const url = new URL(`${BACKEND_URL}/google-maps/directions`);
    url.searchParams.set('origin', `${origin.lat},${origin.lng}`);
    url.searchParams.set('destination', `${destination.lat},${destination.lng}`);
    
    if (waypoints && waypoints.length > 0) {
      const waypointsStr = waypoints.map(w => `${w.lat},${w.lng}`).join('|');
      url.searchParams.set('waypoints', waypointsStr);
    }

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`
      }
    });

    if (!response.ok) {
      console.error('❌ Erreur directions:', response.status);
      return null;
    }

    const data = await response.json();
    
    return data.route || null;

  } catch (error) {
    console.error('❌ Erreur getDirections:', error);
    return null;
  }
}

/**
 * 🔄 RECHERCHE HYBRIDE (anciennement locale + Google, maintenant 100% Google)
 * 
 * Conservé pour compatibilité, redirige vers searchPlaces
 */
export async function hybridSearch(
  query: string,
  currentLocation?: { lat: number; lng: number }
): Promise<GooglePlace[]> {
  // Rediriger vers searchPlaces (100% Google maintenant)
  return searchPlaces(query, currentLocation);
}
