/**
 * 🌍 NOMINATIM ENRICHED API - Version améliorée avec ranking
 */

import { Hono } from 'npm:hono@4.6.14';
import { searchWithNominatim, reverseGeocodeNominatim } from './nominatim-geocoding-api.ts';

const app = new Hono();

app.get('/search', searchWithNominatim);
app.get('/reverse', reverseGeocodeNominatim);

export default app;
