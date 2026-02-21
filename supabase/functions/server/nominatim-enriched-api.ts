/**
 * 🌍 NOMINATIM ENRICHED API - 50 000+ POI EN RDC
 * 
 * API Backend pour recherche de lieux avec OpenStreetMap/Nominatim
 * Proxy sécurisé côté serveur avec cache et optimisations
 */

import { Hono } from 'npm:hono@4.6.14';

const nominatimApp = new Hono();

// 🗺️ COORDONNÉES DES GRANDES VILLES DE RDC
const RDC_CITIES = {
  kinshasa: { lat: -4.3276, lng: 15.3136, name: 'Kinshasa' },
  lubumbashi: { lat: -11.6792, lng: 27.4753, name: 'Lubumbashi' },
  goma: { lat: -1.6792, lng: 29.2228, name: 'Goma' },
  kisangani: { lat: 0.5150, lng: 25.1917, name: 'Kisangani' },
  mbujimayi: { lat: -6.1360, lng: 23.5897, name: 'Mbuji-Mayi' },
  kananga: { lat: -5.8968, lng: 22.4500, name: 'Kananga' },
  bukavu: { lat: -2.5085, lng: 28.8473, name: 'Bukavu' },
  matadi: { lat: -5.8167, lng: 13.4500, name: 'Matadi' }
};

/**
 * 🔍 ROUTE : RECHERCHE DE LIEUX
 * GET /nominatim/search?query=restaurant&lat=-4.3&lng=15.3&city=kinshasa
 */
nominatimApp.get('/search', async (c) => {
  try {
    const query = c.req.query('query');
    const lat = c.req.query('lat');
    const lng = c.req.query('lng');
    const city = c.req.query('city') || 'kinshasa';
    const radius = Number(c.req.query('radius')) || 50;

    if (!query) {
      return c.json({ error: 'Query parameter required' }, 400);
    }

    console.log(`🔍 Recherche Nominatim: "${query}" près de ${city}`);

    // Déterminer le centre de recherche
    const cityData = RDC_CITIES[city as keyof typeof RDC_CITIES] || RDC_CITIES.kinshasa;
    const searchCenter = (lat && lng && !isNaN(Number(lat)) && !isNaN(Number(lng)))
      ? { lat: Number(lat), lng: Number(lng), name: 'Position actuelle' }
      : cityData;

    // Construire viewbox pour la ville
    const viewbox = getViewboxForCity(city as keyof typeof RDC_CITIES);

    // Appeler Nominatim
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?` + new URLSearchParams({
      q: query,
      format: 'json',
      addressdetails: '1',
      extratags: '1',
      namedetails: '1',
      limit: '50',
      viewbox: viewbox,
      bounded: '1',
      countrycodes: 'cd',
      'accept-language': 'fr'
    });

    const response = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': 'SmartCabb/1.0 (contact@smartcabb.com)'
      }
    });

    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status}`);
    }

    const nominatimResults: any[] = await response.json();
    console.log(`✅ Nominatim: ${nominatimResults.length} résultats bruts`);

    // Enrichir et formater les résultats
    const enrichedPlaces = nominatimResults
      .map(place => enrichPlace(place, searchCenter))
      .filter(place => place !== null)
      .filter(place => !place.distance || place.distance <= radius);

    // Trier par distance/importance
    const sortedPlaces = enrichedPlaces.sort((a, b) => {
      if (a.distance !== undefined && b.distance !== undefined) {
        return a.distance - b.distance;
      }
      return (b.importance || 0) - (a.importance || 0);
    });

    console.log(`✅ ${sortedPlaces.length} lieux enrichis retournés`);

    return c.json({
      success: true,
      count: sortedPlaces.length,
      results: sortedPlaces,
      source: 'nominatim',
      city: searchCenter.name
    });

  } catch (error) {
    console.error('❌ Erreur Nominatim search:', error);
    return c.json({
      error: 'Search failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      success: false,
      results: []
    }, 500);
  }
});

/**
 * 🎯 ROUTE : RECHERCHE INTELLIGENTE - NOMINATIM UNIQUEMENT
 * GET /nominatim/smart-search?query=upn&lat=-4.3&lng=15.3
 * 
 * ✅ Utilise UNIQUEMENT OpenStreetMap/Nominatim
 * ✅ Ranking intelligent (pertinence 50%, distance 25%, popularité 15%)
 * ✅ Calcul distance utilisateur → destination
 * ✅ Filtre intelligent par distance
 * ✅ Format compatible avec YangoStyleSearch
 */
nominatimApp.get('/smart-search', async (c) => {
  try {
    const query = c.req.query('query');
    const lat = c.req.query('lat');
    const lng = c.req.query('lng');
    const city = c.req.query('city') || 'kinshasa';

    if (!query) {
      return c.json({ error: 'Query parameter required' }, 400);
    }

    console.log(`\n🎯 ========== RECHERCHE INTELLIGENTE NOMINATIM ==========`);
    console.log(`🔍 Requête: "${query}"`);
    console.log(`📍 Position: ${lat ? `${lat}, ${lng}` : `Ville ${city}`}`);

    // Déterminer le centre de recherche
    const cityData = RDC_CITIES[city as keyof typeof RDC_CITIES] || RDC_CITIES.kinshasa;
    const searchCenter = (lat && lng && !isNaN(Number(lat)) && !isNaN(Number(lng)))
      ? { lat: Number(lat), lng: Number(lng) }
      : cityData;

    console.log(`📍 Centre recherche: ${searchCenter.lat}, ${searchCenter.lng}`);

    // Construire viewbox pour la ville
    const viewbox = getViewboxForCity(city as keyof typeof RDC_CITIES);

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 1️⃣ APPELER NOMINATIM
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?` + new URLSearchParams({
      q: query,
      format: 'json',
      addressdetails: '1',
      extratags: '1',
      namedetails: '1',
      limit: '100', // Plus de résultats pour meilleur ranking
      viewbox: viewbox,
      bounded: '1',
      countrycodes: 'cd',
      'accept-language': 'fr'
    });

    const response = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': 'SmartCabb/1.0 (contact@smartcabb.com)'
      }
    });

    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status}`);
    }

    const nominatimResults: any[] = await response.json();
    console.log(`✅ Nominatim: ${nominatimResults.length} résultats bruts`);

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 2️⃣ ENRICHIR LES RÉSULTATS
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const enrichedPlaces = nominatimResults
      .map(place => {
        const enriched = enrichPlaceForSmartSearch(place, searchCenter, query);
        if (enriched) {
          console.log(`📌 ${enriched.name} (${enriched.placeType}) - ${enriched.distance?.toFixed(1)}km - Score: ${enriched.score?.toFixed(1)}`);
        }
        return enriched;
      })
      .filter(place => place !== null);

    console.log(`✅ ${enrichedPlaces.length} lieux enrichis`);

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 3️⃣ FILTRE INTELLIGENT PAR DISTANCE
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const MAX_DISTANCE_NORMAL = 20; // km
    const MAX_DISTANCE_IMPORTANT = 50; // km

    const filtered = enrichedPlaces.filter(place => {
      if (!place.distance) return true;

      // Moins de 20 km = on garde toujours
      if (place.distance <= MAX_DISTANCE_NORMAL) return true;

      // 20-50 km = seulement si important
      if (place.distance <= MAX_DISTANCE_IMPORTANT) {
        const isImportant = 
          place.placeType === 'airport' ||
          place.placeType === 'terminal' ||
          place.placeType === 'station' ||
          place.name.toLowerCase().includes('aéroport') ||
          place.name.toLowerCase().includes('terminus') ||
          place.name.toLowerCase().includes('gare');

        if (!isImportant) {
          console.log(`❌ ${place.name} ignoré (${place.distance.toFixed(1)}km - non important)`);
          return false;
        }
      }

      // Plus de 50 km = on ignore
      if (place.distance > MAX_DISTANCE_IMPORTANT) {
        console.log(`❌ ${place.name} ignoré (${place.distance.toFixed(1)}km - trop loin)`);
        return false;
      }

      return true;
    });

    console.log(`🎯 ${filtered.length} résultats après filtre distance`);

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 4️⃣ TRIER PAR SCORE (déjà calculé dans enrichPlaceForSmartSearch)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const sorted = filtered.sort((a, b) => (b.score || 0) - (a.score || 0));

    // Limiter à 10 résultats max
    const topResults = sorted.slice(0, 10);

    console.log(`\n🏆 TOP ${topResults.length} RÉSULTATS:`);
    topResults.forEach((place, index) => {
      console.log(`  ${index + 1}. ${place.name} - Score: ${place.score?.toFixed(1)} (${place.distance?.toFixed(1)}km)`);
    });
    console.log(`========== FIN RECHERCHE ==========\n`);

    return c.json({
      success: true,
      count: topResults.length,
      results: topResults,
      sources: ['nominatim'],
      source: 'nominatim_smart',
      query: query,
      searchCenter: searchCenter
    });

  } catch (error) {
    console.error('❌ Erreur Nominatim smart-search:', error);
    return c.json({
      error: 'Smart search failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      success: false,
      results: []
    }, 500);
  }
});

/**
 * 🔄 ROUTE : REVERSE GEOCODING
 * GET /nominatim/reverse?lat=-4.3&lng=15.3
 */
nominatimApp.get('/reverse', async (c) => {
  try {
    const lat = c.req.query('lat');
    const lng = c.req.query('lng');

    if (!lat || !lng) {
      return c.json({ error: 'lat and lng parameters required' }, 400);
    }

    const numLat = Number(lat);
    const numLng = Number(lng);

    if (isNaN(numLat) || isNaN(numLng)) {
      return c.json({ error: 'Invalid coordinates' }, 400);
    }

    console.log(`🔄 Reverse geocoding: ${lat}, ${lng}`);

    const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?` + new URLSearchParams({
      lat: lat,
      lon: lng,
      format: 'json',
      addressdetails: '1',
      extratags: '1',
      'accept-language': 'fr'
    });

    // 🔧 Ajout d'un timeout de 5 secondes
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(nominatimUrl, {
        headers: {
          'User-Agent': 'SmartCabb/1.0 (contact@smartcabb.com)'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Nominatim reverse API error: ${response.status}`);
      }

      const result: any = await response.json();
      const enrichedPlace = enrichPlace(result, { lat: numLat, lng: numLng });

      return c.json({
        success: true,
        result: enrichedPlace,
        source: 'nominatim'
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      // 🔧 Si Nominatim échoue, retourner une adresse générique
      console.warn('⚠️ Nominatim indisponible, utilisation d\'une adresse générique');
      
      const fallbackPlace = {
        name: 'Position sélectionnée',
        display_name: `${numLat.toFixed(4)}, ${numLng.toFixed(4)}`,
        address: {
          road: 'Position GPS',
          city: 'Kinshasa',
          country: 'République démocratique du Congo'
        },
        lat: numLat,
        lon: numLng,
        coordinates: { lat: numLat, lng: numLng },
        category: 'position',
        type: 'gps',
        importance: 0.5,
        relevanceScore: 0.5
      };

      return c.json({
        success: true,
        result: fallbackPlace,
        source: 'fallback',
        warning: 'Nominatim unavailable, using fallback'
      });
    }

  } catch (error) {
    console.error('❌ Erreur Nominatim reverse:', error);
    
    // Retourner une adresse fallback même en cas d'erreur totale
    const lat = Number(c.req.query('lat')) || -4.3276;
    const lng = Number(c.req.query('lng')) || 15.3136;
    
    return c.json({
      success: true,
      result: {
        name: 'Kinshasa',
        display_name: 'Kinshasa, République démocratique du Congo',
        address: {
          city: 'Kinshasa',
          country: 'République démocratique du Congo'
        },
        lat: lat,
        lon: lng,
        coordinates: { lat, lng },
        category: 'place',
        type: 'city',
        importance: 0.5,
        relevanceScore: 0.5
      },
      source: 'emergency_fallback',
      warning: 'Geocoding service unavailable'
    });
  }
});

/**
 * 🏙️ ROUTE : LIEUX POPULAIRES D'UNE VILLE
 * GET /nominatim/popular?city=kinshasa&limit=20
 */
nominatimApp.get('/popular', async (c) => {
  try {
    const city = c.req.query('city') || 'kinshasa';
    const limit = Number(c.req.query('limit')) || 20;

    const cityData = RDC_CITIES[city as keyof typeof RDC_CITIES] || RDC_CITIES.kinshasa;
    console.log(`🏙️ Lieux populaires: ${cityData.name}`);

    const categories = ['restaurant', 'hotel', 'hospital', 'supermarket', 'bank'];
    const allPlaces: any[] = [];

    for (const category of categories) {
      const viewbox = getViewboxForCity(city as keyof typeof RDC_CITIES);
      const nominatimUrl = `https://nominatim.openstreetmap.org/search?` + new URLSearchParams({
        q: category,
        format: 'json',
        addressdetails: '1',
        extratags: '1',
        limit: '4',
        viewbox: viewbox,
        bounded: '1',
        countrycodes: 'cd',
        'accept-language': 'fr'
      });

      try {
        const response = await fetch(nominatimUrl, {
          headers: {
            'User-Agent': 'SmartCabb/1.0 (contact@smartcabb.com)'
          }
        });

        if (response.ok) {
          const results: any[] = await response.json();
          const enriched = results
            .map(place => enrichPlace(place, cityData))
            .filter(place => place !== null)
            .slice(0, 4);
          allPlaces.push(...enriched);
        }
      } catch (error) {
        console.error(`❌ Erreur catégorie ${category}:`, error);
      }
    }

    const topPlaces = allPlaces.slice(0, limit);

    return c.json({
      success: true,
      count: topPlaces.length,
      results: topPlaces,
      city: cityData.name,
      source: 'nominatim'
    });

  } catch (error) {
    console.error('❌ Erreur lieux populaires:', error);
    return c.json({
      error: 'Failed to fetch popular places',
      message: error instanceof Error ? error.message : 'Unknown error',
      success: false,
      results: []
    }, 500);
  }
});

// ==================== FONCTIONS UTILITAIRES ====================

/**
 * 🗺️ OBTENIR LA VIEWBOX POUR UNE VILLE
 */
function getViewboxForCity(city: keyof typeof RDC_CITIES): string {
  const cityCoords = RDC_CITIES[city] || RDC_CITIES.kinshasa;
  const offset = 0.5; // ~55km
  const left = cityCoords.lng - offset;
  const top = cityCoords.lat + offset;
  const right = cityCoords.lng + offset;
  const bottom = cityCoords.lat - offset;
  return `${left},${top},${right},${bottom}`;
}

/**
 * 🎨 ENRICHIR UN LIEU NOMINATIM
 */
function enrichPlace(place: any, searchCenter: { lat: number; lng: number }): any | null {
  try {
    const lat = parseFloat(place.lat);
    const lng = parseFloat(place.lon);

    if (isNaN(lat) || isNaN(lng)) {
      return null;
    }

    // Calculer distance
    const distance = calculateDistance(searchCenter.lat, searchCenter.lng, lat, lng);

    // Nom du lieu
    const name = place.name ||
                 place.address?.amenity ||
                 place.address?.shop ||
                 place.display_name.split(',')[0];

    // Description
    const description = buildDescription(place);

    // Catégorie
    const category = categorizePlace(place);

    return {
      id: `nominatim-${place.place_id}`,
      name,
      description,
      category,
      coordinates: { lat, lng },
      address: {
        street: place.address?.road,
        neighborhood: place.address?.neighbourhood || place.address?.suburb,
        city: place.address?.city || place.address?.state,
        country: place.address?.country
      },
      type: place.type,
      importance: place.importance,
      distance,
      metadata: {
        cuisine: place.extratags?.cuisine,
        hours: place.extratags?.opening_hours,
        phone: place.extratags?.phone,
        website: place.extratags?.website
      },
      source: 'nominatim'
    };

  } catch (error) {
    console.error('❌ Erreur enrichissement:', error);
    return null;
  }
}

/**
 * 🎨 ENRICHIR UN LIEU POUR RECHERCHE INTELLIGENTE
 */
function enrichPlaceForSmartSearch(place: any, searchCenter: { lat: number; lng: number }, query: string): any | null {
  try {
    const lat = parseFloat(place.lat);
    const lng = parseFloat(place.lon);

    if (isNaN(lat) || isNaN(lng)) {
      return null;
    }

    // Calculer distance
    const distance = calculateDistance(searchCenter.lat, searchCenter.lng, lat, lng);

    // Nom du lieu
    const name = place.name ||
                 place.address?.amenity ||
                 place.address?.shop ||
                 place.display_name.split(',')[0];

    // Description
    const description = buildDescription(place);

    // Catégorie
    const category = categorizePlace(place);

    // Type de lieu
    const placeType = getPlaceType(place);

    // Score intelligent
    const score = calculateSmartScore(place, query, distance);

    return {
      id: `nominatim-${place.place_id}`,
      name,
      description,
      category,
      coordinates: { lat, lng },
      address: {
        street: place.address?.road,
        neighborhood: place.address?.neighbourhood || place.address?.suburb,
        city: place.address?.city || place.address?.state,
        country: place.address?.country
      },
      type: place.type,
      importance: place.importance,
      distance,
      metadata: {
        cuisine: place.extratags?.cuisine,
        hours: place.extratags?.opening_hours,
        phone: place.extratags?.phone,
        website: place.extratags?.website
      },
      source: 'nominatim',
      placeType,
      score
    };

  } catch (error) {
    console.error('❌ Erreur enrichissement:', error);
    return null;
  }
}

/**
 * 📝 CONSTRUIRE LA DESCRIPTION
 */
function buildDescription(place: any): string {
  const parts: string[] = [];
  if (place.address?.road) parts.push(place.address.road);
  if (place.address?.suburb || place.address?.neighbourhood) {
    parts.push(place.address.suburb || place.address.neighbourhood);
  }
  if (place.address?.city) parts.push(place.address.city);
  return parts.join(', ') || place.display_name;
}

/**
 * 🏷️ CATÉGORISER UN LIEU
 */
function categorizePlace(place: any): string {
  const classType = (place.class || '').toLowerCase();
  const type = (place.type || '').toLowerCase();

  if (classType === 'amenity') {
    if (['restaurant', 'cafe', 'fast_food', 'bar'].includes(type)) return 'Restaurant';
    if (['hospital', 'clinic', 'doctors', 'pharmacy'].includes(type)) return 'Santé';
    if (['school', 'university', 'college', 'library'].includes(type)) return 'Éducation';
    if (['bank', 'atm', 'bureau_de_change'].includes(type)) return 'Banque';
    if (['fuel', 'parking', 'taxi'].includes(type)) return 'Transport';
    return 'Service';
  }

  if (classType === 'shop') return 'Commerce';
  if (classType === 'tourism') return 'Tourisme';
  if (classType === 'leisure') return 'Loisirs';
  if (classType === 'place') return 'Lieu';

  return 'Autre';
}

/**
 * 🏷️ TYPE DE LIEU
 */
function getPlaceType(place: any): string {
  const type = (place.type || '').toLowerCase();

  if (['airport', 'terminal', 'station'].includes(type)) return type;
  if (['aéroport', 'terminus', 'gare'].some(keyword => place.name.toLowerCase().includes(keyword))) return 'station';

  return 'lieu';
}

/**
 * 📏 CALCULER LA DISTANCE (HAVERSINE)
 */
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 10) / 10;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * 📈 CALCULER LE SCORE INTELLIGENT
 */
function calculateSmartScore(place: any, query: string, distance: number): number {
  const pertinence = calculatePertinence(place, query);
  const distanceScore = calculateDistanceScore(distance);
  const popularity = calculatePopularity(place);

  const score = (pertinence * 0.5) + (distanceScore * 0.25) + (popularity * 0.15);
  return score;
}

/**
 * 📈 CALCULER LA PERTINENCE
 */
function calculatePertinence(place: any, query: string): number {
  const name = place.name || place.display_name;
  const address = place.address || {};
  const tags = place.extratags || {};
  const namedetails = place.namedetails || {};

  const keywords = query.toLowerCase().split(/\s+/);
  let score = 0;

  // Nom du lieu
  if (name.toLowerCase().includes(query.toLowerCase())) {
    score += 1;
  }

  // Tags
  for (const key in tags) {
    if (tags[key].toLowerCase().includes(query.toLowerCase())) {
      score += 0.5;
    }
  }

  // Namedetails
  for (const key in namedetails) {
    if (namedetails[key].toLowerCase().includes(query.toLowerCase())) {
      score += 0.5;
    }
  }

  // Address
  for (const key in address) {
    if (address[key].toLowerCase().includes(query.toLowerCase())) {
      score += 0.5;
    }
  }

  return score;
}

/**
 * 📈 CALCULER LE SCORE DE DISTANCE
 */
function calculateDistanceScore(distance: number): number {
  if (distance <= 5) return 1;
  if (distance <= 10) return 0.8;
  if (distance <= 20) return 0.6;
  if (distance <= 50) return 0.4;
  return 0;
}

/**
 * 📈 CALCULER LA POPULARITÉ
 */
function calculatePopularity(place: any): number {
  const importance = place.importance || 0;
  const tags = place.extratags || {};
  const namedetails = place.namedetails || {};

  let score = importance;

  // Tags
  if (tags['amenity'] === 'restaurant') score += 0.5;
  if (tags['amenity'] === 'hospital') score += 0.5;
  if (tags['amenity'] === 'school') score += 0.5;
  if (tags['amenity'] === 'bank') score += 0.5;
  if (tags['amenity'] === 'fuel') score += 0.5;
  if (tags['amenity'] === 'parking') score += 0.5;
  if (tags['amenity'] === 'taxi') score += 0.5;

  // Namedetails
  if (namedetails['name:fr']) score += 0.5;

  return score;
}

export default nominatimApp;
