/**
 * 🌍 NOMINATIM (OPENSTREETMAP) GEOCODING - FALLBACK UNIVERSEL
 * 
 * Service de géocodage basé sur OpenStreetMap
 * - 100% GRATUIT
 * - Base de données mondiale COMPLÈTE
 * - Aucune limite (usage raisonnable)
 * - Toutes les adresses, même les plus petites rues
 * 
 * Utilisé comme fallback quand Mapbox ne trouve rien
 */

import { Context } from 'npm:hono@4.6.14';

/**
 * 🔍 RECHERCHE AVEC NOMINATIM (OpenStreetMap)
 * 
 * API publique, gratuite, complète
 */
export async function searchWithNominatim(c: Context) {
  try {
    const query = c.req.query('query');
    const lat = c.req.query('lat');
    const lng = c.req.query('lng');

    if (!query || query.trim().length < 2) {
      return c.json({ 
        error: 'Query must be at least 2 characters',
        results: [] 
      }, 400);
    }

    console.log('🌍 Nominatim search:', query);

    // Construire l'URL Nominatim
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('q', query);
    url.searchParams.set('format', 'json');
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('limit', '20');
    url.searchParams.set('countrycodes', 'cd'); // RDC
    url.searchParams.set('accept-language', 'fr');
    
    // Si position actuelle fournie, prioriser résultats proches
    if (lat && lng) {
      url.searchParams.set('viewbox', getBoundingBox(parseFloat(lat), parseFloat(lng)));
      url.searchParams.set('bounded', '0'); // Pas strictement limité au viewbox
    }

    console.log('🔗 Nominatim URL:', url.toString());

    // Faire la requête
    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'SmartCabb/1.0 (contact@smartcabb.com)' // Requis par Nominatim
      }
    });

    if (!response.ok) {
      console.error('❌ Nominatim API error:', response.status);
      return c.json({ 
        error: 'Nominatim API error',
        results: [] 
      }, response.status);
    }

    const data = await response.json();
    
    console.log(`✅ Nominatim returned ${data.length || 0} results`);

    // Position utilisateur
    const userLat = lat ? parseFloat(lat) : null;
    const userLng = lng ? parseFloat(lng) : null;

    // Transformer les résultats au format SmartCabb
    const results = data.map((place: any) => {
      const placeLat = parseFloat(place.lat);
      const placeLng = parseFloat(place.lon);

      // Calculer la distance
      let distance: number | undefined;
      if (userLat !== null && userLng !== null) {
        distance = calculateDistance(userLat, userLng, placeLat, placeLng);
      }

      // Construire le nom et la description
      const name = buildPlaceName(place);
      const description = buildPlaceDescription(place);
      const placeType = getPlaceTypeFromOSM(place);

      return {
        id: `nominatim-${place.place_id}`,
        name,
        description,
        coordinates: { lat: placeLat, lng: placeLng },
        placeId: place.place_id.toString(),
        type: 'place',
        placeType,
        distance,
        source: 'nominatim'
      };
    });

    // 🎯 FILTRER : GARDER SEULEMENT LES RÉSULTATS À MOINS DE 5KM !
    const MAX_DISTANCE_KM = 5;
    let filteredResults = results;
    
    if (userLat !== null && userLng !== null) {
      filteredResults = results.filter((result: any) => {
        if (result.distance === undefined) return true; // Garder si pas de distance
        return result.distance <= MAX_DISTANCE_KM;
      });
      
      console.log(`🎯 Filtre 5km: ${results.length} → ${filteredResults.length} résultats`);
    }

    // Trier par distance si disponible
    if (userLat !== null && userLng !== null) {
      filteredResults.sort((a: any, b: any) => {
        return (a.distance || 999) - (b.distance || 999);
      });
    }

    console.log(`✅ Returning ${filteredResults.length} Nominatim results (≤5km)`);

    return c.json({ 
      results: filteredResults,
      source: 'nominatim',
      count: filteredResults.length 
    });

  } catch (error) {
    console.error('❌ Nominatim search error:', error);
    return c.json({ 
      error: 'Search failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      results: [] 
    }, 500);
  }
}

/**
 * 📍 REVERSE GEOCODING AVEC NOMINATIM
 */
export async function reverseGeocodeNominatim(c: Context) {
  try {
    const lat = c.req.query('lat');
    const lng = c.req.query('lng');

    if (!lat || !lng) {
      return c.json({ error: 'Latitude and longitude required' }, 400);
    }

    console.log(`🔍 Nominatim reverse geocoding: ${lat}, ${lng}`);

    // Construire l'URL
    const url = new URL('https://nominatim.openstreetmap.org/reverse');
    url.searchParams.set('lat', lat);
    url.searchParams.set('lon', lng);
    url.searchParams.set('format', 'json');
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('accept-language', 'fr');

    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'SmartCabb/1.0 (contact@smartcabb.com)'
      }
    });

    if (!response.ok) {
      console.error('❌ Nominatim reverse error:', response.status);
      return c.json({ error: 'Nominatim API error' }, response.status);
    }

    const place = await response.json();

    if (!place || place.error) {
      return c.json({ error: 'No place found at these coordinates' }, 404);
    }

    const result = {
      id: `nominatim-${place.place_id}`,
      name: buildPlaceName(place),
      description: buildPlaceDescription(place),
      coordinates: { 
        lat: parseFloat(place.lat), 
        lng: parseFloat(place.lon) 
      },
      placeId: place.place_id.toString(),
      placeType: getPlaceTypeFromOSM(place),
      address: place.display_name,
      source: 'nominatim'
    };

    console.log('✅ Nominatim reverse geocoding success');

    return c.json(result);

  } catch (error) {
    console.error('❌ Nominatim reverse error:', error);
    return c.json({ 
      error: 'Failed to reverse geocode',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
}

// ==================== HELPERS ====================

/**
 * 🏷️ CONSTRUIRE LE NOM DU LIEU
 */
function buildPlaceName(place: any): string {
  // Priorité : name > road > suburb > city
  if (place.namedetails?.name) return place.namedetails.name;
  if (place.address?.road) return place.address.road;
  if (place.address?.suburb) return place.address.suburb;
  if (place.address?.neighbourhood) return place.address.neighbourhood;
  if (place.address?.city) return place.address.city;
  if (place.address?.town) return place.address.town;
  
  // Fallback sur display_name (premier élément)
  return place.display_name?.split(',')[0] || 'Lieu sans nom';
}

/**
 * 📝 CONSTRUIRE LA DESCRIPTION DU LIEU
 */
function buildPlaceDescription(place: any): string {
  const parts: string[] = [];
  
  // Type de lieu
  if (place.type) {
    const typeLabel = getPlaceTypeLabel(place.type);
    if (typeLabel) parts.push(typeLabel);
  }
  
  // Quartier
  if (place.address?.suburb && place.address.suburb !== buildPlaceName(place)) {
    parts.push(place.address.suburb);
  }
  
  if (place.address?.neighbourhood && place.address.neighbourhood !== buildPlaceName(place)) {
    parts.push(place.address.neighbourhood);
  }
  
  // Commune/Ville
  if (place.address?.city) {
    parts.push(place.address.city);
  } else if (place.address?.town) {
    parts.push(place.address.town);
  } else if (place.address?.municipality) {
    parts.push(place.address.municipality);
  }
  
  // Pays
  if (place.address?.country) {
    parts.push(place.address.country);
  }
  
  return parts.join(' • ') || 'Kinshasa, RDC';
}

/**
 * 🏷️ DÉTERMINER LE TYPE DE LIEU DEPUIS OSM
 */
function getPlaceTypeFromOSM(place: any): string {
  const type = place.type?.toLowerCase() || '';
  const category = place.class?.toLowerCase() || '';
  
  // Correspondances OSM → SmartCabb
  if (category === 'amenity') {
    if (type.includes('restaurant')) return 'restaurant';
    if (type.includes('cafe')) return 'restaurant';
    if (type.includes('hospital')) return 'hospital';
    if (type.includes('clinic')) return 'hospital';
    if (type.includes('pharmacy')) return 'hospital';
    if (type.includes('school')) return 'school';
    if (type.includes('university')) return 'school';
    if (type.includes('bank')) return 'bank';
    if (type.includes('fuel')) return 'station';
  }
  
  if (category === 'shop') {
    if (type.includes('mall')) return 'mall';
    if (type.includes('supermarket')) return 'market';
    if (type.includes('market')) return 'market';
    return 'mall';
  }
  
  if (category === 'tourism') {
    if (type.includes('hotel')) return 'hotel';
  }
  
  if (category === 'place') {
    if (type === 'suburb') return 'neighborhood';
    if (type === 'neighbourhood') return 'neighborhood';
    if (type === 'city') return 'city';
    if (type === 'town') return 'city';
  }
  
  if (category === 'highway' || type === 'road') {
    return 'address';
  }
  
  return 'place';
}

/**
 * 🏷️ LABEL DU TYPE DE LIEU
 */
function getPlaceTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    'road': 'Rue',
    'suburb': 'Quartier',
    'neighbourhood': 'Quartier',
    'city': 'Ville',
    'town': 'Ville',
    'village': 'Village',
    'building': 'Bâtiment',
    'house': 'Maison',
    'residential': 'Zone résidentielle',
    'commercial': 'Zone commerciale',
    'industrial': 'Zone industrielle'
  };
  
  return labels[type] || '';
}

/**
 * 📦 CRÉER UNE BOUNDING BOX AUTOUR D'UN POINT
 * 
 * Crée un carré de ~50km autour du point
 */
function getBoundingBox(lat: number, lng: number, radiusKm: number = 25): string {
  // 1 degré ≈ 111km
  const delta = radiusKm / 111;
  
  const minLng = lng - delta;
  const minLat = lat - delta;
  const maxLng = lng + delta;
  const maxLat = lat + delta;
  
  // Format: minLng,minLat,maxLng,maxLat
  return `${minLng},${minLat},${maxLng},${maxLat}`;
}

/**
 * 📍 CALCULER LA DISTANCE (Haversine)
 */
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Rayon de la Terre en km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}
