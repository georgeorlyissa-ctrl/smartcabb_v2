/**
 * 🗺️ GOOGLE MAPS API - ROUTES BACKEND
 * 
 * Toutes les requêtes Google Maps passent par ce proxy sécurisé
 * pour protéger la clé API
 */

import { Hono } from 'npm:hono@4';

const app = new Hono();

// Récupérer la clé API depuis les variables d'environnement
// ⚠️ IMPORTANT : Utiliser une clé BACKEND sans restrictions de référents HTTP
// Les restrictions de référents ne marchent QUE pour les appels depuis le navigateur
const GOOGLE_MAPS_API_KEY = Deno.env.get('GOOGLE_MAPS_SERVER_API_KEY') || Deno.env.get('GOOGLE_MAPS_API_KEY');

if (!GOOGLE_MAPS_API_KEY) {
  console.error('❌ GOOGLE_MAPS_SERVER_API_KEY ou GOOGLE_MAPS_API_KEY manquante !');
  console.error('⚠️ IMPORTANT : Pour le backend, créez une clé API sans restrictions de référents HTTP');
  console.error('   → Google Cloud Console → Create Credentials → API Key');
  console.error('   → Restrictions : API restrictions uniquement (Places, Geocoding, Directions)');
  console.error('   → PAS de restrictions HTTP referrers (ne marche que côté navigateur)');
} else {
  console.log('✅ Clé API Google Maps chargée');
  console.log('🔑 Variable utilisée:', Deno.env.get('GOOGLE_MAPS_SERVER_API_KEY') ? 'GOOGLE_MAPS_SERVER_API_KEY' : 'GOOGLE_MAPS_API_KEY');
}

/**
 * 🔍 RECHERCHE DE LIEUX (Text Search)
 * 
 * GET /google-maps/search?query=...&lat=...&lng=...
 */
app.get('/search', async (c) => {
  try {
    const query = c.req.query('query');
    const lat = c.req.query('lat');
    const lng = c.req.query('lng');

    if (!query) {
      return c.json({ success: false, error: 'Query manquant' }, 400);
    }

    if (!GOOGLE_MAPS_API_KEY) {
      return c.json({ success: false, error: 'API key non configurée' }, 500);
    }

    console.log(`🔍 Google Places - Text Search: "${query}"`);

    // 🌍 STRATÉGIE HYBRIDE : Autocomplete + Text Search
    // Autocomplete donne plus de suggestions variées
    // Text Search donne les détails complets
    
    let allResults: any[] = [];
    
    // 1️⃣ D'ABORD : AUTOCOMPLETE pour avoir beaucoup de suggestions
    console.log('📋 Étape 1/2 : Autocomplete pour suggestions...');
    const autocompleteUrl = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json');
    autocompleteUrl.searchParams.set('input', query);
    autocompleteUrl.searchParams.set('key', GOOGLE_MAPS_API_KEY);
    autocompleteUrl.searchParams.set('language', 'fr');
    autocompleteUrl.searchParams.set('components', 'country:cd'); // RDC uniquement
    
    if (lat && lng) {
      autocompleteUrl.searchParams.set('location', `${lat},${lng}`);
      autocompleteUrl.searchParams.set('radius', '50000'); // 50 km
      autocompleteUrl.searchParams.set('strictbounds', 'false'); // Ne pas limiter strictement au rayon
    }

    const autocompleteResponse = await fetch(autocompleteUrl.toString());
    
    if (autocompleteResponse.ok) {
      const autocompleteData = await autocompleteResponse.json();
      
      if (autocompleteData.status === 'OK' && autocompleteData.predictions) {
        console.log(`✅ Autocomplete: ${autocompleteData.predictions.length} suggestions`);
        
        // Pour chaque suggestion, récupérer les détails complets
        for (const prediction of autocompleteData.predictions.slice(0, 10)) {
          try {
            const detailsUrl = new URL('https://maps.googleapis.com/maps/api/place/details/json');
            detailsUrl.searchParams.set('place_id', prediction.place_id);
            detailsUrl.searchParams.set('key', GOOGLE_MAPS_API_KEY);
            detailsUrl.searchParams.set('language', 'fr');
            detailsUrl.searchParams.set('fields', 'name,formatted_address,geometry,rating,user_ratings_total,types,place_id');
            
            const detailsResponse = await fetch(detailsUrl.toString());
            
            if (detailsResponse.ok) {
              const detailsData = await detailsResponse.json();
              
              if (detailsData.status === 'OK' && detailsData.result) {
                const place = detailsData.result;
                
                // Calculer la distance si position fournie
                let distance;
                if (lat && lng) {
                  const R = 6371; // Rayon Terre en km
                  const dLat = (place.geometry.location.lat - parseFloat(lat)) * Math.PI / 180;
                  const dLng = (place.geometry.location.lng - parseFloat(lng)) * Math.PI / 180;
                  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                           Math.cos(parseFloat(lat) * Math.PI / 180) * 
                           Math.cos(place.geometry.location.lat * Math.PI / 180) *
                           Math.sin(dLng / 2) * Math.sin(dLng / 2);
                  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                  distance = R * c;
                }
                
                allResults.push({
                  id: place.place_id,
                  placeId: place.place_id,
                  name: place.name,
                  description: place.formatted_address,
                  fullAddress: place.formatted_address,
                  coordinates: {
                    lat: place.geometry.location.lat,
                    lng: place.geometry.location.lng
                  },
                  rating: place.rating,
                  userRatingsTotal: place.user_ratings_total,
                  types: place.types,
                  distance: distance ? Math.round(distance * 10) / 10 : undefined,
                  source: 'google_maps'
                });
              }
            }
          } catch (error) {
            console.error('❌ Erreur détails pour', prediction.description, error);
          }
        }
      } else {
        console.warn(`⚠️ Autocomplete status: ${autocompleteData.status}`);
      }
    }
    
    // 2️⃣ ENSUITE : Text Search comme fallback
    console.log('📋 Étape 2/2 : Text Search comme complément...');
    const url = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json');
    // ⭐ NE PAS ajouter ", Kinshasa, RDC" - laisser Google décider
    url.searchParams.set('query', query);
    url.searchParams.set('key', GOOGLE_MAPS_API_KEY);
    url.searchParams.set('language', 'fr');
    
    if (lat && lng) {
      url.searchParams.set('location', `${lat},${lng}`);
      url.searchParams.set('radius', '50000'); // 50 km
    }

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      console.error('❌ Erreur Google Places:', response.status);
      return c.json({ success: false, error: 'Google API error' }, response.status);
    }

    const data = await response.json();

    // ⭐ LOG DU STATUS GOOGLE
    console.log(`📊 Google Places status: ${data.status}`);
    
    if (data.error_message) {
      console.error(`❌ Google error message: ${data.error_message}`);
    }

    // ⚠️ ZERO_RESULTS est NORMAL, pas une erreur !
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('❌ Google Places status:', data.status, data.error_message);
      
      // Retourner l'erreur avec le status pour diagnostic frontend
      return c.json({ 
        success: false, 
        error: data.error_message || data.status,
        status: data.status,
        googleResponse: data
      }, 400);
    }

    // Transformer les résultats
    const results = (data.results || []).map((place: any) => {
      // Calculer la distance si position fournie
      let distance;
      if (lat && lng) {
        const R = 6371; // Rayon Terre en km
        const dLat = (place.geometry.location.lat - parseFloat(lat)) * Math.PI / 180;
        const dLng = (place.geometry.location.lng - parseFloat(lng)) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                 Math.cos(parseFloat(lat) * Math.PI / 180) * 
                 Math.cos(place.geometry.location.lat * Math.PI / 180) *
                 Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        distance = R * c;
      }
      
      return {
        id: place.place_id,
        placeId: place.place_id,
        name: place.name,
        description: place.formatted_address,
        fullAddress: place.formatted_address,
        coordinates: {
          lat: place.geometry.location.lat,
          lng: place.geometry.location.lng
        },
        rating: place.rating,
        userRatingsTotal: place.user_ratings_total,
        types: place.types,
        distance: distance ? Math.round(distance * 10) / 10 : undefined,
        source: 'google_maps'
      };
    });

    console.log(`✅ Google Places: ${results.length} résultats`);
    
    if (results.length === 0) {
      console.warn(`⚠️ Aucun résultat pour: "${query}"`);
    }

    // Fusionner les résultats d'Autocomplete et Text Search
    const finalResults = [...allResults, ...results].filter((result, index, self) =>
      index === self.findIndex((t) => t.placeId === result.placeId)
    );

    return c.json({
      success: true,
      results: finalResults,
      status: data.status
    });

  } catch (error) {
    console.error('❌ Erreur /search:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

/**
 * ⌨️  AUTOCOMPLETE
 * 
 * GET /google-maps/autocomplete?input=...&lat=...&lng=...
 */
app.get('/autocomplete', async (c) => {
  try {
    const input = c.req.query('input');
    const lat = c.req.query('lat');
    const lng = c.req.query('lng');

    if (!input) {
      return c.json({ success: false, error: 'Input manquant' }, 400);
    }

    if (!GOOGLE_MAPS_API_KEY) {
      return c.json({ success: false, error: 'API key non configurée' }, 500);
    }

    console.log(`⌨️  Google Autocomplete: "${input}"`);

    // 🌍 GOOGLE PLACES API - AUTOCOMPLETE
    const url = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json');
    url.searchParams.set('input', input);
    url.searchParams.set('key', GOOGLE_MAPS_API_KEY);
    url.searchParams.set('language', 'fr');
    url.searchParams.set('components', 'country:cd'); // RDC uniquement
    
    if (lat && lng) {
      url.searchParams.set('location', `${lat},${lng}`);
      url.searchParams.set('radius', '50000');
    }

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      console.error('❌ Erreur Google Autocomplete:', response.status);
      return c.json({ success: false, error: 'Google API error' }, response.status);
    }

    const data = await response.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('❌ Google Autocomplete status:', data.status);
      return c.json({ success: false, error: data.status }, 400);
    }

    // Transformer les prédictions
    const predictions = (data.predictions || []).map((pred: any) => ({
      id: pred.place_id,
      placeId: pred.place_id,
      name: pred.structured_formatting?.main_text || pred.description,
      description: pred.description,
      fullAddress: pred.description,
      types: pred.types,
      source: 'google_maps'
    }));

    console.log(`✅ Google Autocomplete: ${predictions.length} suggestions`);

    return c.json({
      success: true,
      predictions,
      status: data.status
    });

  } catch (error) {
    console.error('❌ Erreur /autocomplete:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

/**
 * 📍 REVERSE GEOCODING
 * 
 * GET /google-maps/reverse-geocode?lat=...&lng=...
 */
app.get('/reverse-geocode', async (c) => {
  try {
    const lat = c.req.query('lat');
    const lng = c.req.query('lng');

    if (!lat || !lng) {
      return c.json({ success: false, error: 'Coordonnées manquantes' }, 400);
    }

    if (!GOOGLE_MAPS_API_KEY) {
      return c.json({ success: false, error: 'API key non configurée' }, 500);
    }

    console.log(`📍 Google Reverse Geocoding: (${lat}, ${lng})`);

    // 🌍 GOOGLE GEOCODING API - REVERSE
    const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
    url.searchParams.set('latlng', `${lat},${lng}`);
    url.searchParams.set('key', GOOGLE_MAPS_API_KEY);
    url.searchParams.set('language', 'fr');

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      console.error('❌ Erreur Google Geocoding:', response.status);
      return c.json({ success: false, error: 'Google API error' }, response.status);
    }

    const data = await response.json();

    if (data.status !== 'OK') {
      console.error('❌ Google Geocoding status:', data.status);
      return c.json({ success: false, error: data.status }, 400);
    }

    if (!data.results || data.results.length === 0) {
      return c.json({ success: false, error: 'Aucune adresse trouvée' }, 404);
    }

    // Prendre le premier résultat (le plus précis)
    const firstResult = data.results[0];

    const result = {
      id: firstResult.place_id,
      placeId: firstResult.place_id,
      name: firstResult.address_components?.[0]?.long_name || 'Lieu inconnu',
      description: firstResult.formatted_address,
      fullAddress: firstResult.formatted_address,
      coordinates: {
        lat: firstResult.geometry.location.lat,
        lng: firstResult.geometry.location.lng
      },
      types: firstResult.types,
      source: 'google_maps'
    };

    console.log('✅ Google Reverse Geocoding réussi');

    return c.json({
      success: true,
      result
    });

  } catch (error) {
    console.error('❌ Erreur /reverse-geocode:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

/**
 * 🗺️ PLACE DETAILS
 * 
 * GET /google-maps/place-details?place_id=...
 */
app.get('/place-details', async (c) => {
  try {
    const placeId = c.req.query('place_id');

    if (!placeId) {
      return c.json({ success: false, error: 'place_id manquant' }, 400);
    }

    if (!GOOGLE_MAPS_API_KEY) {
      return c.json({ success: false, error: 'API key non configurée' }, 500);
    }

    console.log(`🗺️ Google Place Details: ${placeId}`);

    // 🌍 GOOGLE PLACES API - PLACE DETAILS
    const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
    url.searchParams.set('place_id', placeId);
    url.searchParams.set('key', GOOGLE_MAPS_API_KEY);
    url.searchParams.set('language', 'fr');
    url.searchParams.set('fields', 'name,formatted_address,geometry,rating,user_ratings_total,types');

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      console.error('❌ Erreur Google Place Details:', response.status);
      return c.json({ success: false, error: 'Google API error' }, response.status);
    }

    const data = await response.json();

    if (data.status !== 'OK') {
      console.error('❌ Google Place Details status:', data.status);
      return c.json({ success: false, error: data.status }, 400);
    }

    const place = data.result;

    const result = {
      id: placeId,
      placeId: placeId,
      name: place.name,
      description: place.formatted_address,
      fullAddress: place.formatted_address,
      coordinates: {
        lat: place.geometry.location.lat,
        lng: place.geometry.location.lng
      },
      rating: place.rating,
      userRatingsTotal: place.user_ratings_total,
      types: place.types,
      source: 'google_maps'
    };

    console.log('✅ Google Place Details récupéré');

    return c.json({
      success: true,
      result
    });

  } catch (error) {
    console.error('❌ Erreur /place-details:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

/**
 * 🚗 DIRECTIONS (Itinéraire)
 * 
 * GET /google-maps/directions?origin=...&destination=...&waypoints=...
 */
app.get('/directions', async (c) => {
  try {
    const origin = c.req.query('origin');
    const destination = c.req.query('destination');
    const waypoints = c.req.query('waypoints');

    if (!origin || !destination) {
      return c.json({ success: false, error: 'Origin et destination requis' }, 400);
    }

    if (!GOOGLE_MAPS_API_KEY) {
      return c.json({ success: false, error: 'API key non configurée' }, 500);
    }

    console.log(`🚗 Google Directions: ${origin} → ${destination}`);

    // 🌍 GOOGLE DIRECTIONS API
    const url = new URL('https://maps.googleapis.com/maps/api/directions/json');
    url.searchParams.set('origin', origin);
    url.searchParams.set('destination', destination);
    url.searchParams.set('key', GOOGLE_MAPS_API_KEY);
    url.searchParams.set('language', 'fr');
    url.searchParams.set('mode', 'driving');
    
    if (waypoints) {
      url.searchParams.set('waypoints', waypoints);
    }

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      console.error('❌ Erreur Google Directions:', response.status);
      return c.json({ success: false, error: 'Google API error' }, response.status);
    }

    const data = await response.json();

    if (data.status !== 'OK') {
      console.error('❌ Google Directions status:', data.status);
      return c.json({ success: false, error: data.status }, 400);
    }

    if (!data.routes || data.routes.length === 0) {
      return c.json({ success: false, error: 'Aucun itinéraire trouvé' }, 404);
    }

    const route = data.routes[0];
    const leg = route.legs[0];


    // Décoder la polyline
    const coordinates = decodePolyline(route.overview_polyline.points);

    // Extraire les étapes
    const steps = leg.steps.map((step: any) => ({
      instruction: step.html_instructions?.replace(/<[^>]*>/g, '') || '',
      distance: step.distance.value / 1000, // mètres → km
      duration: step.duration.value / 60, // secondes → minutes
      startLocation: {
        lat: step.start_location.lat,
        lng: step.start_location.lng
      },
      endLocation: {
        lat: step.end_location.lat,
        lng: step.end_location.lng
      }
    }));

    const result = {
      distance: leg.distance.value / 1000, // mètres → km
      duration: leg.duration.value / 60, // secondes → minutes
      coordinates,
      polyline: route.overview_polyline.points,
      steps
    };

    console.log(`✅ Itinéraire: ${result.distance.toFixed(1)} km, ${Math.round(result.duration)} min`);

    return c.json({
      success: true,
      route: result

    console.log(`✅ Itinéraire: ${(leg.distance.value / 1000).toFixed(1)} km, ${Math.round(leg.duration.value / 60)} min`);

    // ✅ RETOURNER LES DONNÉES BRUTES DE GOOGLE MAPS (format DirectionsResult)
    // Le frontend s'attend au format DirectionsResult standard de Google Maps
    return c.json({
      success: true,
      status: data.status,
      routes: data.routes,
      geocoded_waypoints: data.geocoded_waypoints || []

    });

  } catch (error) {
    console.error('❌ Erreur /directions:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

/**
 * 🔄 RECHERCHE 100% GOOGLE MAPS (anciennement "hybride")
 * 
 * ✅ Utilise UNIQUEMENT Google Maps API
 * ❌ Pas de base locale, pas d'OpenStreetMap
 * 
 * GET /google-maps/hybrid-search?query=...&lat=...&lng=...
 */
app.get('/hybrid-search', async (c) => {
  try {
    const query = c.req.query('query');
    const lat = c.req.query('lat');
    const lng = c.req.query('lng');

    if (!query) {
      return c.json({ success: false, error: 'Query manquant' }, 400);
    }

    console.log(`🗺️ Recherche 100% Google Maps: "${query}"`);

    // ✅ RECHERCHE GOOGLE MAPS UNIQUEMENT
    let googleResults: any[] = [];
    
    if (!GOOGLE_MAPS_API_KEY) {
      console.error('❌ GOOGLE_MAPS_API_KEY manquante');
      return c.json({ 
        success: false, 
        error: 'API key non configurée' 
      }, 500);
    }

    const googleUrl = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json');
    googleUrl.searchParams.set('query', `${query}, Kinshasa, RDC`);
    googleUrl.searchParams.set('key', GOOGLE_MAPS_API_KEY);
    googleUrl.searchParams.set('language', 'fr');
    
    if (lat && lng) {
      googleUrl.searchParams.set('location', `${lat},${lng}`);
      googleUrl.searchParams.set('radius', '50000'); // 50 km
    }

    try {
      const googleResponse = await fetch(googleUrl.toString());
      const googleData = await googleResponse.json();
      
      if (googleData.status === 'OK') {
        googleResults = (googleData.results || []).map((place: any) => {
          // Calculer la distance si position fournie
          let distance;
          if (lat && lng) {
            const R = 6371; // Rayon Terre en km
            const dLat = (place.geometry.location.lat - parseFloat(lat)) * Math.PI / 180;
            const dLng = (place.geometry.location.lng - parseFloat(lng)) * Math.PI / 180;
            const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                     Math.cos(parseFloat(lat) * Math.PI / 180) * 
                     Math.cos(place.geometry.location.lat * Math.PI / 180) *
                     Math.sin(dLng / 2) * Math.sin(dLng / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            distance = R * c;
          }
          
          return {
            id: place.place_id,
            placeId: place.place_id,
            name: place.name,
            description: place.formatted_address,
            fullAddress: place.formatted_address,
            coordinates: {
              lat: place.geometry.location.lat,
              lng: place.geometry.location.lng
            },
            rating: place.rating,
            userRatingsTotal: place.user_ratings_total,
            types: place.types,
            distance: distance ? Math.round(distance * 10) / 10 : undefined,
            source: 'google_maps'
          };
        });
        
        console.log(`✅ Google Maps: ${googleResults.length} résultats`);
      } else {
        console.warn(`⚠️ Google Maps status: ${googleData.status}`);
        if (googleData.error_message) {
          console.error(`❌ ${googleData.error_message}`);
        }
      }
    } catch (error) {
      console.error('❌ Erreur Google Maps:', error);
      return c.json({ 
        success: false, 
        error: 'Erreur API Google Maps' 
      }, 500);
    }

    // Limiter à 20 résultats
    const results = googleResults.slice(0, 20);

    console.log(`✅ ${results.length} résultats Google Maps retournés`);

    return c.json({
      success: true,
      results,
      sources: {
        google: googleResults.length,
        local: 0 // Plus de base locale
      }
    });

  } catch (error) {
    console.error('❌ Erreur /hybrid-search:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

/**
 * 🧪 TEST DE DISPONIBILITÉ
 * 
 * GET /google-maps/test
 */
app.get('/test', async (c) => {
  try {
    if (!GOOGLE_MAPS_API_KEY) {
      return c.json({
        success: false,
        error: 'GOOGLE_MAPS_API_KEY non configurée'
      });
    }

    // Test simple : Geocoding de Kinshasa
    const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
    url.searchParams.set('address', 'Kinshasa, RDC');
    url.searchParams.set('key', GOOGLE_MAPS_API_KEY);

    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.status === 'OK') {
      return c.json({
        success: true,
        message: 'Google Maps API opérationnelle',
        quota: data.status
      });
    } else {
      return c.json({
        success: false,
        error: `Google API status: ${data.status}`,
        message: data.error_message
      });
    }

  } catch (error) {
    console.error('❌ Erreur /test:', error);
    return c.json({
      success: false,
      error: String(error)
    });
  }
});

/**
 * 🔧 DÉCODAGE POLYLINE
 * 
 * Décode une polyline encodée de Google Maps
 */
function decodePolyline(encoded: string): Array<{ lat: number; lng: number }> {
  const coordinates: Array<{ lat: number; lng: number }> = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let b;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    coordinates.push({
      lat: lat / 1e5,
      lng: lng / 1e5
    });
  }

  return coordinates;
}

// ✅ EXPORT PAR DÉFAUT
export default app;
