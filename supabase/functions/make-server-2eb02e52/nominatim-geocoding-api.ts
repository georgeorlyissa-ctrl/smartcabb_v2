/**
 * 🌍 NOMINATIM (OPENSTREETMAP) GEOCODING - FALLBACK UNIVERSEL
 */

import { Context } from 'npm:hono@4.6.14';

export async function searchWithNominatim(c: Context) {
  try {
    const query = c.req.query('query');
    if (!query) {
      return c.json({ error: 'Query required', results: [] }, 400);
    }

    console.log('🌍 Nominatim search:', query);

    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('q', query);
    url.searchParams.set('format', 'json');
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('limit', '20');
    url.searchParams.set('countrycodes', 'cd');
    url.searchParams.set('accept-language', 'fr');

    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'SmartCabb/1.0'
      }
    });

    const data = await response.json();
    console.log(`✅ Nominatim: ${data.length} résultats`);

    return c.json({ results: data });
  } catch (error) {
    console.error('❌ Nominatim error:', error);
    return c.json({ error: 'Geocoding failed', results: [] }, 500);
  }
}

export async function reverseGeocodeNominatim(c: Context) {
  try {
    const lat = c.req.query('lat');
    const lng = c.req.query('lng');
    
    if (!lat || !lng) {
      return c.json({ error: 'Lat/lng required' }, 400);
    }

    const url = new URL('https://nominatim.openstreetmap.org/reverse');
    url.searchParams.set('lat', lat);
    url.searchParams.set('lon', lng);
    url.searchParams.set('format', 'json');
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('accept-language', 'fr');

    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'SmartCabb/1.0'
      }
    });

    const data = await response.json();
    console.log('✅ Reverse geocoding Nominatim:', data.display_name);

    return c.json({ result: data });
  } catch (error) {
    console.error('❌ Reverse geocoding error:', error);
    return c.json({ error: 'Reverse geocoding failed' }, 500);
  }
}
