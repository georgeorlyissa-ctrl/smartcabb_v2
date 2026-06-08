/**
 * 🗺️ GOOGLE MAPS API - SmartCabb
 * Stratégie hybride : Autocomplete (frappe) + Text Search (fallback)
 */

import { Hono } from 'npm:hono@4.6.14';

const app = new Hono();

// ─── Helper : clé API ────────────────────────────────────────────────────────
function getApiKey(): string | null {
  return Deno.env.get('GOOGLE_MAPS_SERVER_API_KEY') ||
         Deno.env.get('GOOGLE_MAPS_API_KEY') ||
         null;
}

// ─── Helper : calcul distance Haversine ──────────────────────────────────────
function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── GET /autocomplete — Suggestions temps réel (comme Yango) ────────────────
app.get('/autocomplete', async (c) => {
  try {
    const input = c.req.query('input') || c.req.query('query');
    if (!input || input.trim().length < 1) {
      return c.json({ predictions: [], results: [] });
    }

    const apiKey = getApiKey();
    if (!apiKey) {
      console.error('❌ [AUTOCOMPLETE] Clé API manquante');
      return c.json({ error: 'API key not configured', predictions: [], results: [] }, 500);
    }

    const userLat = c.req.query('lat') || '-4.3276';
    const userLng = c.req.query('lng') || '15.3136';

    console.log(`🔍 [AUTOCOMPLETE] "${input}" depuis (${userLat}, ${userLng})`);

    // ✅ Google Places Autocomplete API
    const params = new URLSearchParams({
      input: input.trim(),
      location:  `${userLat},${userLng}`,
      radius:    '50000',          // 50 km autour de la position
      components: 'country:cd',    // Restreindre à la RDC (Congo-Kinshasa)
      language:  'fr',
      types:     'geocode|establishment',
      key:       apiKey,
    });

    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params}`;
    const response = await fetch(url);
    const data = await response.json();

    console.log(`📡 [AUTOCOMPLETE] Status Google: ${data.status}, ${data.predictions?.length || 0} prédictions`);

    if (data.status === 'REQUEST_DENIED') {
      console.error('🔴 [AUTOCOMPLETE] REQUEST_DENIED:', data.error_message);
    }

    if (!data.predictions || data.predictions.length === 0) {
      // Aucun résultat autocomplete → essayer Text Search comme fallback
      return c.json({ predictions: [], results: [] });
    }

    // Transformer les prédictions au format frontend
    const results = data.predictions.slice(0, 10).map((p: any) => ({
      id: p.place_id,
      placeId: p.place_id,
      name: p.structured_formatting?.main_text || p.description,
      description: p.description,
      // Coordonnées non disponibles ici → récupérées à la sélection via /place-details
      coordinates: { lat: 0, lng: 0 },
      source: 'google_autocomplete',
    }));

    console.log(`✅ [AUTOCOMPLETE] ${results.length} suggestions retournées`);
    return c.json({ predictions: results, results });

  } catch (error) {
    console.error('❌ [AUTOCOMPLETE] Erreur:', error);
    return c.json({ predictions: [], results: [], error: 'Erreur serveur' }, 500);
  }
});

// ─── GET /search — Recherche principale (Autocomplete + Text Search) ──────────
app.get('/search', async (c) => {
  try {
    const query = c.req.query('query');
    if (!query || query.trim().length < 1) {
      return c.json({ results: [] });
    }

    const apiKey = getApiKey();
    if (!apiKey) {
      console.error('❌ [SEARCH] Clé API manquante');
      return c.json({ error: 'API key not configured', results: [] }, 500);
    }

    const userLat = c.req.query('lat') || '-4.3276';
    const userLng = c.req.query('lng') || '15.3136';
    const userLatNum = parseFloat(userLat);
    const userLngNum = parseFloat(userLng);

    console.log(`🔍 [SEARCH] "${query}" depuis (${userLat}, ${userLng})`);

    // ═══════════════════════════════════════════════════
    // ÉTAPE 1 : Places Autocomplete (prioritaire — rapide)
    // ═══════════════════════════════════════════════════
    let autocompleteResults: any[] = [];

    try {
      const acParams = new URLSearchParams({
        input:      query.trim(),
        location:   `${userLat},${userLng}`,
        radius:     '50000',
        components: 'country:cd',
        language:   'fr',
        types:      'geocode|establishment',
        key:        apiKey,
      });

      const acResponse = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?${acParams}`
      );
      const acData = await acResponse.json();

      console.log(`📡 [AUTOCOMPLETE] Status: ${acData.status}, ${acData.predictions?.length || 0} prédictions`);

      if (acData.status === 'OK' && acData.predictions?.length > 0) {
        // Pour les prédictions autocomplete, on enrichit avec les détails du lieu
        // On batch les appels Place Details pour les 5 premiers résultats
        const topPredictions = acData.predictions.slice(0, 8);

        const detailsPromises = topPredictions.map(async (p: any) => {
          try {
            const detailsParams = new URLSearchParams({
              place_id: p.place_id,
              fields: 'geometry,name,formatted_address,rating,user_ratings_total',
              language: 'fr',
              key: apiKey,
            });
            const detailsResp = await fetch(
              `https://maps.googleapis.com/maps/api/place/details/json?${detailsParams}`
            );
            const detailsData = await detailsResp.json();

            if (detailsData.status === 'OK' && detailsData.result) {
              const r = detailsData.result;
              const dist = haversine(
                userLatNum, userLngNum,
                r.geometry.location.lat, r.geometry.location.lng
              );
              return {
                id: p.place_id,
                placeId: p.place_id,
                name: p.structured_formatting?.main_text || r.name || p.description,
                description: p.description || r.formatted_address,
                coordinates: {
                  lat: r.geometry.location.lat,
                  lng: r.geometry.location.lng,
                },
                rating: r.rating,
                userRatingsTotal: r.user_ratings_total,
                distance: dist,
                source: 'google_autocomplete',
              };
            }
          } catch (_) {}
          // Fallback sans coordonnées
          return {
            id: p.place_id,
            placeId: p.place_id,
            name: p.structured_formatting?.main_text || p.description,
            description: p.description,
            coordinates: { lat: 0, lng: 0 },
            distance: undefined,
            source: 'google_autocomplete',
          };
        });

        autocompleteResults = (await Promise.all(detailsPromises)).filter(Boolean);
        console.log(`✅ [AUTOCOMPLETE+DETAILS] ${autocompleteResults.length} résultats enrichis`);
      }
    } catch (e) {
      console.warn('⚠️ [AUTOCOMPLETE] Erreur:', e);
    }

    // ═══════════════════════════════════════════════════
    // ÉTAPE 2 : Text Search (fallback ou complément)
    // ═══════════════════════════════════════════════════
    let textSearchResults: any[] = [];
    const seenIds = new Set(autocompleteResults.map((r: any) => r.placeId));

    if (autocompleteResults.length < 5) {
      try {
        const searchVariants = [
          query,
          `${query} Kinshasa`,
        ];

        for (const searchQuery of searchVariants) {
          const tsParams = new URLSearchParams({
            query:    searchQuery,
            location: `${userLat},${userLng}`,
            radius:   '50000',
            language: 'fr',
            region:   'cd',
            key:      apiKey,
          });

          const tsResponse = await fetch(
            `https://maps.googleapis.com/maps/api/place/textsearch/json?${tsParams}`
          );
          const tsData = await tsResponse.json();

          console.log(`📡 [TEXTSEARCH] "${searchQuery}": ${tsData.status}, ${tsData.results?.length || 0} résultats`);

          if (tsData.status === 'OK' && tsData.results?.length > 0) {
            for (const place of tsData.results) {
              if (!seenIds.has(place.place_id)) {
                seenIds.add(place.place_id);
                textSearchResults.push(place);
              }
            }
          }

          if (autocompleteResults.length + textSearchResults.length >= 10) break;
        }
      } catch (e) {
        console.warn('⚠️ [TEXTSEARCH] Erreur:', e);
      }
    }

    // ═══════════════════════════════════════════════════
    // ÉTAPE 3 : Transformer Text Search en format unifié
    // ═══════════════════════════════════════════════════
    const transformedTextSearch = textSearchResults.slice(0, 10).map((place: any) => {
      const dist = haversine(
        userLatNum, userLngNum,
        place.geometry.location.lat, place.geometry.location.lng
      );
      return {
        id: place.place_id,
        placeId: place.place_id,
        name: place.name,
        description: place.formatted_address,
        coordinates: {
          lat: place.geometry.location.lat,
          lng: place.geometry.location.lng,
        },
        rating: place.rating,
        userRatingsTotal: place.user_ratings_total,
        distance: dist,
        source: 'google_textsearch',
      };
    });

    // ═══════════════════════════════════════════════════
    // ÉTAPE 4 : Fusionner et trier par distance
    // ═══════════════════════════════════════════════════
    const allResults = [
      ...autocompleteResults,
      ...transformedTextSearch,
    ].sort((a: any, b: any) => (a.distance ?? 999) - (b.distance ?? 999));

    const finalResults = allResults.slice(0, 15);

    console.log(`🎯 [SEARCH] ${finalResults.length} résultats finaux pour "${query}"`);
    if (finalResults.length > 0) {
      console.log('📋 Top 5:', finalResults.slice(0, 5).map((r: any) =>
        `${r.name} | ${r.distance !== undefined ? r.distance.toFixed(1) + ' km' : '?'}`
      ));
    }

    return c.json({ results: finalResults, status: 'OK' });

  } catch (error) {
    console.error('❌ [SEARCH] Erreur:', error);
    return c.json({ error: 'Search failed', results: [] }, 500);
  }
});

// ─── GET /place-details — Détails d'un lieu (coordonnées après sélection) ────
app.get('/place-details', async (c) => {
  try {
    const placeId = c.req.query('place_id') || c.req.query('placeId');
    if (!placeId) {
      return c.json({ error: 'place_id required' }, 400);
    }

    const apiKey = getApiKey();
    if (!apiKey) return c.json({ error: 'API key not configured' }, 500);

    const params = new URLSearchParams({
      place_id: placeId,
      fields:   'geometry,name,formatted_address,rating,user_ratings_total',
      language: 'fr',
      key:      apiKey,
    });

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?${params}`
    );
    const data = await response.json();

    if (data.status !== 'OK' || !data.result) {
      console.error(`❌ [PLACE-DETAILS] ${data.status}`);
      return c.json({ error: `Place Details: ${data.status}` }, 404);
    }

    const r = data.result;
    const result = {
      id: placeId,
      placeId,
      name: r.name,
      description: r.formatted_address,
      fullAddress: r.formatted_address,
      coordinates: {
        lat: r.geometry.location.lat,
        lng: r.geometry.location.lng,
      },
      rating: r.rating,
      userRatingsTotal: r.user_ratings_total,
      source: 'google_maps',
    };

    console.log(`✅ [PLACE-DETAILS] ${r.name} → (${result.coordinates.lat}, ${result.coordinates.lng})`);
    return c.json({ result });

  } catch (error) {
    console.error('❌ [PLACE-DETAILS] Erreur:', error);
    return c.json({ error: 'Place details failed' }, 500);
  }
});

// ─── GET /reverse-geocode — Reverse geocoding (coordonnées → adresse) ─────────
app.get('/reverse-geocode', async (c) => {
  try {
    const lat = c.req.query('lat');
    const lng = c.req.query('lng');
    if (!lat || !lng) return c.json({ error: 'lat/lng required' }, 400);

    const apiKey = getApiKey();
    if (!apiKey) return c.json({ error: 'API key not configured' }, 500);

    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&language=fr&key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK' || !data.results?.length) {
      return c.json({ result: null });
    }

    const r = data.results[0];
    const result = {
      id: r.place_id,
      placeId: r.place_id,
      name: r.address_components?.[0]?.long_name || r.formatted_address,
      description: r.formatted_address,
      fullAddress: r.formatted_address,
      coordinates: { lat: parseFloat(lat), lng: parseFloat(lng) },
      source: 'google_maps',
    };

    console.log(`✅ [REVERSE] (${lat}, ${lng}) → ${r.formatted_address}`);
    return c.json({ result });

  } catch (error) {
    console.error('❌ [REVERSE] Erreur:', error);
    return c.json({ error: 'Reverse geocoding failed' }, 500);
  }
});

// ─── GET /reverse — Alias pour compatibilité ─────────────────────────────────
app.get('/reverse', async (c) => {
  try {
    const lat = c.req.query('lat');
    const lng = c.req.query('lng');
    if (!lat || !lng) return c.json({ error: 'Lat/lng required' }, 400);

    const apiKey = getApiKey();
    if (!apiKey) return c.json({ error: 'API key not configured' }, 500);

    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&language=fr&key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();

    console.log('✅ [REVERSE-ALIAS] Reverse geocoding OK');
    return c.json({ result: data.results?.[0] || null });

  } catch (error) {
    console.error('❌ [REVERSE-ALIAS] Erreur:', error);
    return c.json({ error: 'Reverse geocoding failed' }, 500);
  }
});

// ─── GET /directions — Itinéraire ─────────────────────────────────────────────
app.get('/directions', async (c) => {
  try {
    const origin      = c.req.query('origin');
    const destination = c.req.query('destination');
    const waypoints   = c.req.query('waypoints');

    if (!origin || !destination) {
      return c.json({ error: 'Origin and destination required' }, 400);
    }

    const apiKey = getApiKey();
    if (!apiKey) return c.json({ error: 'API key not configured' }, 500);

    console.log(`🚗 [DIRECTIONS] ${origin} → ${destination}`);

    const params = new URLSearchParams({
      origin,
      destination,
      key:            apiKey,
      mode:           'driving',
      departure_time: 'now',
      language:       'fr',
    });
    if (waypoints) params.append('waypoints', waypoints);

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/directions/json?${params}`
    );
    const data = await response.json();

    if (data.status !== 'OK' || !data.routes?.length) {
      console.error('❌ [DIRECTIONS] Error:', data.status, data.error_message);
      return c.json({ error: `Directions: ${data.status}` }, 500);
    }

    const route = data.routes[0];
    const leg   = route.legs[0];

    const coordinates: Array<{ lat: number; lng: number }> = [];
    leg.steps.forEach((step: any) => {
      coordinates.push({ lat: step.start_location.lat, lng: step.start_location.lng });
    });
    coordinates.push({ lat: leg.end_location.lat, lng: leg.end_location.lng });

    const routeResult = {
      distance:  leg.distance.value / 1000,
      duration:  leg.duration.value / 60,
      coordinates,
      polyline:  route.overview_polyline.points,
      steps:     leg.steps.map((step: any) => ({
        instruction:   step.html_instructions.replace(/<[^>]*>/g, ''),
        distance:      step.distance.value / 1000,
        duration:      step.duration.value / 60,
        startLocation: step.start_location,
        endLocation:   step.end_location,
      })),
    };

    console.log(`✅ [DIRECTIONS] ${routeResult.distance.toFixed(1)} km, ${Math.round(routeResult.duration)} min`);
    return c.json({ route: routeResult });

  } catch (error) {
    console.error('❌ [DIRECTIONS] Erreur:', error);
    return c.json({ error: 'Directions calculation failed' }, 500);
  }
});

export default app;
