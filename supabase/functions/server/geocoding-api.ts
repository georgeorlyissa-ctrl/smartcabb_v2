/**
 * 🌍 GEOCODING API PROXY - EXACTEMENT COMME UBER/YANGO
 * 
 * Ce module sécurise les appels aux API professionnelles de géocodage :
 * 
 * 1. **Mapbox Geocoding API** (comme Uber)
 *    - Recherche d'adresses professionnelle
 *    - Autocomplete en temps réel
 *    - Données précises pour Kinshasa
 * 
 * 2. **Google Places API** (comme Yango)
 *    - Recherche de lieux avec détails (téléphone, horaires, etc.)
 *    - Photos des lieux
 *    - Notes et avis
 * 
 * 3. **Nominatim/OpenStreetMap** (fallback gratuit)
 *    - Base de données mondiale complète
 *    - 100% gratuit
 *    - Aucune clé API requise
 * 
 * SÉCURITÉ : Les clés API sont stockées côté serveur, jamais exposées au frontend
 */

import { Hono } from 'npm:hono@4.6.14';
import { searchWithNominatim, reverseGeocodeNominatim } from './nominatim-geocoding-api.tsx';

const geocodingApp = new Hono();

// ==================== INTERFACES ====================

interface MapboxFeature {
  id: string;
  type: string;
  place_name: string;
  center: [number, number]; // [lng, lat]
  properties: {
    category?: string;
    maki?: string;
  };
  context?: Array<{
    id: string;
    text: string;
  }>;
}

interface MapboxGeocodingResponse {
  type: string;
  query: string[];
  features: MapboxFeature[];
}

// ==================== ROUTES ====================

/**
 * 🔍 ROUTE : RECHERCHE INTELLIGENTE MULTI-SOURCES
 * Combine Google Places + Mapbox + Nominatim pour résultats optimaux
 */
geocodingApp.get('/smart-search', async (c) => {
  try {
    const query = c.req.query('query');
    const lat = c.req.query('lat');
    const lng = c.req.query('lng');

    if (!query) {
      return c.json({ error: 'Query parameter required' }, 400);
    }

    console.log(`🔍 Smart search: "${query}"`);

    const allResults: any[] = [];
    const sources: string[] = [];

    // 1️⃣ GOOGLE PLACES (si clé API disponible)
    const GOOGLE_PLACES_API_KEY = Deno.env.get('GOOGLE_PLACES_API_KEY');
    
    if (GOOGLE_PLACES_API_KEY) {
      console.log('🔄 Étape 1/3 : Recherche Google Places...');
      try {
        const googleUrl = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json');
        googleUrl.searchParams.set('input', query);
        googleUrl.searchParams.set('key', GOOGLE_PLACES_API_KEY);
        googleUrl.searchParams.set('components', 'country:cd');
        googleUrl.searchParams.set('language', 'fr');

        if (lat && lng && !isNaN(Number(lat)) && !isNaN(Number(lng))) {
          googleUrl.searchParams.set('location', `${lat},${lng}`);
          googleUrl.searchParams.set('radius', '50000');
        }

        const googleResponse = await fetch(googleUrl.toString());
        
        if (googleResponse.ok) {
          const googleData: any = await googleResponse.json();
          
          if (googleData.status === 'OK' && googleData.predictions?.length > 0) {
            console.log(`✅ Google Places: ${googleData.predictions.length} résultats`);
            
            const googleResults = googleData.predictions.map((prediction: any, index: number) => {
              let icon = '📍';
              let typeLabel = 'Lieu';
              
              if (prediction.types.includes('restaurant')) {
                icon = '🍽️';
                typeLabel = 'Restaurant';
              } else if (prediction.types.includes('hospital')) {
                icon = '🏥';
                typeLabel = 'Hôpital';
              } else if (prediction.types.includes('school')) {
                icon = '🎓';
                typeLabel = 'École';
              } else if (prediction.types.includes('church')) {
                icon = '⛪';
                typeLabel = 'Église';
              } else if (prediction.types.includes('shopping_mall')) {
                icon = '🏬';
                typeLabel = 'Centre commercial';
              } else if (prediction.types.includes('lodging')) {
                icon = '🏨';
                typeLabel = 'Hôtel';
              } else if (prediction.types.includes('bank')) {
                icon = '🏦';
                typeLabel = 'Banque';
              } else if (prediction.types.includes('airport')) {
                icon = '✈️';
                typeLabel = 'Aéroport';
              } else if (prediction.types.includes('transit_station')) {
                icon = '🚌';
                typeLabel = 'Terminus';
              }
              
              return {
                id: `google_${prediction.place_id}`,
                name: prediction.structured_formatting.main_text,
                description: `${icon} ${typeLabel} • ${prediction.structured_formatting.secondary_text || 'Kinshasa, RDC'}`,
                placeId: prediction.place_id,
                source: 'google_places',
                types: prediction.types,
                priority: 100 + (googleData.predictions.length - index)
              };
            });
            
            allResults.push(...googleResults);
            sources.push('google_places');
          }
        }
      } catch (error) {
        console.error('❌ Erreur Google Places:', error);
      }
    }

    // 2️⃣ MAPBOX (si clé API disponible)
    const MAPBOX_API_KEY = Deno.env.get('MAPBOX_API_KEY');
    
    if (MAPBOX_API_KEY) {
      console.log('🔄 Étape 2/3 : Recherche Mapbox...');
      try {
        const bbox = '15.1,-4.5,15.6,-4.1';
        const mapboxUrl = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`);
        mapboxUrl.searchParams.set('access_token', MAPBOX_API_KEY);
        mapboxUrl.searchParams.set('bbox', bbox);
        mapboxUrl.searchParams.set('country', 'CD');
        mapboxUrl.searchParams.set('limit', '10');
        mapboxUrl.searchParams.set('language', 'fr');
        
        if (lat && lng && !isNaN(Number(lat)) && !isNaN(Number(lng))) {
          mapboxUrl.searchParams.set('proximity', `${lng},${lat}`);
        }

        const mapboxResponse = await fetch(mapboxUrl.toString());
        
        if (mapboxResponse.ok) {
          const mapboxData: MapboxGeocodingResponse = await mapboxResponse.json();
          
          if (mapboxData.features.length > 0) {
            console.log(`✅ Mapbox: ${mapboxData.features.length} résultats`);
            
            const mapboxResults = mapboxData.features.map((feature, index) => {
              const commune = feature.context?.find(ctx => ctx.id.startsWith('place.'))?.text || 'Kinshasa';
              const neighborhood = feature.context?.find(ctx => ctx.id.startsWith('neighborhood.'))?.text;
              const category = feature.properties?.category || feature.properties?.maki || 'autre';
              const icon = getPlaceIcon(category);
              const typeLabel = getPlaceTypeLabel(category);
              
              // Calculer distance
              let distance: number | undefined;
              if (lat && lng) {
                const userLat = Number(lat);
                const userLng = Number(lng);
                const placeLat = feature.center[1];
                const placeLng = feature.center[0];
                distance = calculateDistance(userLat, userLng, placeLat, placeLng);
              }
              
              return {
                id: `mapbox_${feature.id}`,
                name: feature.place_name.split(',')[0],
                description: `${icon} ${typeLabel} • ${neighborhood || commune}`,
                coordinates: {
                  lat: feature.center[1],
                  lng: feature.center[0]
                },
                distance,
                source: 'mapbox',
                priority: 50 + (mapboxData.features.length - index)
              };
            });
            
            allResults.push(...mapboxResults);
            sources.push('mapbox');
          }
        }
      } catch (error) {
        console.error('❌ Erreur Mapbox:', error);
      }
    }

    // 3️⃣ NOMINATIM (toujours disponible - fallback gratuit)
    console.log('🔄 Étape 3/3 : Recherche Nominatim (fallback)...');
    try {
      // Appeler la fonction Nominatim du module importé
      const nominatimResponse = await searchWithNominatim(c);
      const nominatimData = await nominatimResponse.json();
      
      if (nominatimData.results && nominatimData.results.length > 0) {
        console.log(`✅ Nominatim: ${nominatimData.results.length} résultats`);
        allResults.push(...nominatimData.results);
        sources.push('nominatim');
      }
    } catch (error) {
      console.error('❌ Erreur Nominatim:', error);
    }

    // Trier par priorité puis distance
    const sortedResults = allResults.sort((a, b) => {
      // D'abord par source (Google > Mapbox > Nominatim)
      const priorityA = a.priority || 0;
      const priorityB = b.priority || 0;
      
      if (priorityA !== priorityB) {
        return priorityB - priorityA;
      }
      
      // Ensuite par distance
      if (a.distance !== undefined && b.distance !== undefined) {
        return a.distance - b.distance;
      }
      
      return 0;
    });

    // Limiter à 20 résultats
    const finalResults = sortedResults.slice(0, 20);

    console.log(`✅ Total: ${finalResults.length} résultats de ${sources.join(', ')}`);

    return c.json({
      success: true,
      count: finalResults.length,
      results: finalResults,
      sources
    });

  } catch (error) {
    console.error('❌ Erreur smart-search:', error);
    return c.json({
      error: 'Search failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * 🔄 ROUTE : REVERSE GEOCODING
 */
geocodingApp.get('/reverse', async (c) => {
  return reverseGeocodeNominatim(c);
});

// ==================== FONCTIONS UTILITAIRES ====================

function getPlaceIcon(category: string): string {
  const icons: Record<string, string> = {
    restaurant: '🍽️',
    cafe: '☕',
    hotel: '🏨',
    hospital: '🏥',
    school: '🎓',
    bank: '🏦',
    shop: '🛒',
    fuel: '⛽',
    airport: '✈️',
    park: '🌳',
    church: '⛪'
  };
  return icons[category] || '📍';
}

function getPlaceTypeLabel(category: string): string {
  const labels: Record<string, string> = {
    restaurant: 'Restaurant',
    cafe: 'Café',
    hotel: 'Hôtel',
    hospital: 'Hôpital',
    school: 'École',
    bank: 'Banque',
    shop: 'Commerce',
    fuel: 'Station',
    airport: 'Aéroport',
    park: 'Parc',
    church: 'Église'
  };
  return labels[category] || 'Lieu';
}

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

export default geocodingApp;
