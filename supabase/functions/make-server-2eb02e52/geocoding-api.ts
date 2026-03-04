/**
 * 🗺️ GEOCODING API - Wrapper unifié
 */

import { Hono } from 'npm:hono@4.6.14';
import { searchWithNominatim, reverseGeocodeNominatim } from './nominatim-geocoding-api.ts';

const geocodingApp = new Hono();

// Routes principales
geocodingApp.get('/search', searchWithNominatim);
geocodingApp.get('/reverse', reverseGeocodeNominatim);

export default geocodingApp;
