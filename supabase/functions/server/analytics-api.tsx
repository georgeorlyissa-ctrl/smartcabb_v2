/**
 * 📊 ANALYTICS API - TRACKING D'USAGE POUR RANKING INTELLIGENT
 * 
 * Enregistre les recherches, sélections et trajets
 * pour améliorer les suggestions au fil du temps
 */

import { Hono } from 'npm:hono@4.6.14';
import * as kv from './kv-wrapper.ts';

const analyticsApp = new Hono();

// ==================== TRACKING ====================

/**
 * 🔍 ENREGISTRER UNE RECHERCHE
 */
analyticsApp.post('/search', async (c) => {
  try {
    const { placeId, placeName, hour, timestamp } = await c.req.json();
    
    if (!placeId || !placeName) {
      return c.json({ error: 'placeId and placeName required' }, 400);
    }
    
    // Récupérer les stats existantes
    const key = `analytics:place:${placeId}`;
    const existing = await kv.get(key);
    
    const stats = existing || {
      placeId,
      placeName,
      searchCount: 0,
      selectionCount: 0,
      lastSearched: null,
      lastSelected: null,
      popularHours: Array(24).fill(0)
    };
    
    // Mettre à jour
    stats.searchCount += 1;
    stats.lastSearched = timestamp;
    if (hour !== undefined && hour >= 0 && hour < 24) {
      stats.popularHours[hour] += 1;
    }
    
    // Sauvegarder
    await kv.set(key, stats);
    
    console.log(`📊 Search tracked: ${placeName} (${stats.searchCount} total)`);
    
    return c.json({ success: true, stats });
    
  } catch (error) {
    console.error('❌ Track search error:', error);
    return c.json({ 
      error: 'Failed to track search',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * ✅ ENREGISTRER UNE SÉLECTION
 */
analyticsApp.post('/selection', async (c) => {
  try {
    const { placeId, placeName, distance, hour, timestamp } = await c.req.json();
    
    if (!placeId || !placeName) {
      return c.json({ error: 'placeId and placeName required' }, 400);
    }
    
    // Récupérer les stats existantes
    const key = `analytics:place:${placeId}`;
    const existing = await kv.get(key);
    
    const stats = existing || {
      placeId,
      placeName,
      searchCount: 0,
      selectionCount: 0,
      lastSearched: null,
      lastSelected: null,
      popularHours: Array(24).fill(0)
    };
    
    // Mettre à jour
    stats.selectionCount += 1;
    stats.lastSelected = timestamp;
    if (hour !== undefined && hour >= 0 && hour < 24) {
      stats.popularHours[hour] += 1;
    }
    
    // Sauvegarder
    await kv.set(key, stats);
    
    // Incrémenter le compteur global d'usage
    const globalKey = `analytics:global:${placeId}`;
    const globalCount = (await kv.get(globalKey)) || 0;
    await kv.set(globalKey, globalCount + 1);
    
    console.log(`📊 Selection tracked: ${placeName} (${stats.selectionCount} total)`);
    
    return c.json({ success: true, stats });
    
  } catch (error) {
    console.error('❌ Track selection error:', error);
    return c.json({ 
      error: 'Failed to track selection',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * 🚗 ENREGISTRER UN TRAJET
 */
analyticsApp.post('/route', async (c) => {
  try {
    const { pickupPlaceId, destinationPlaceId, timestamp } = await c.req.json();
    
    if (!pickupPlaceId || !destinationPlaceId) {
      return c.json({ error: 'pickupPlaceId and destinationPlaceId required' }, 400);
    }
    
    // Créer une clé unique pour le trajet
    const routeKey = `analytics:route:${pickupPlaceId}:${destinationPlaceId}`;
    const existing = await kv.get(routeKey);
    
    const route = existing || {
      pickupPlaceId,
      destinationPlaceId,
      count: 0,
      lastUsed: null
    };
    
    route.count += 1;
    route.lastUsed = timestamp;
    
    await kv.set(routeKey, route);
    
    console.log(`📊 Route tracked: ${pickupPlaceId} → ${destinationPlaceId} (${route.count} times)`);
    
    return c.json({ success: true, route });
    
  } catch (error) {
    console.error('❌ Track route error:', error);
    return c.json({ 
      error: 'Failed to track route',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// ==================== RÉCUPÉRATION ====================

/**
 * 📈 USAGE GLOBAL (pour ranking)
 */
analyticsApp.get('/global-usage', async (c) => {
  try {
    // Récupérer tous les compteurs globaux
    const keys = await kv.getByPrefix('analytics:global:');
    
    const usage: Record<string, number> = {};
    
    for (const item of keys) {
      const placeId = item.key.replace('analytics:global:', '');
      usage[placeId] = item.value as number;
    }
    
    console.log(`📊 Global usage: ${Object.keys(usage).length} places tracked`);
    
    return c.json({ usage });
    
  } catch (error) {
    console.error('❌ Get global usage error:', error);
    return c.json({ 
      error: 'Failed to get global usage',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * 🔥 LIEUX POPULAIRES
 */
analyticsApp.get('/popular-places', async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '10');
    
    // Récupérer toutes les stats de lieux
    const keys = await kv.getByPrefix('analytics:place:');
    
    // Trier par nombre de sélections
    const sorted = keys
      .map(item => item.value)
      .filter(stats => stats && typeof stats === 'object')
      .sort((a: any, b: any) => (b.selectionCount || 0) - (a.selectionCount || 0))
      .slice(0, limit);
    
    console.log(`📊 Popular places: returning top ${sorted.length}`);
    
    return c.json({ places: sorted });
    
  } catch (error) {
    console.error('❌ Get popular places error:', error);
    return c.json({ 
      error: 'Failed to get popular places',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * 🚗 TRAJETS POPULAIRES
 */
analyticsApp.get('/popular-routes', async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '10');
    
    // Récupérer tous les trajets
    const keys = await kv.getByPrefix('analytics:route:');
    
    // Trier par fréquence
    const sorted = keys
      .map(item => item.value)
      .filter(route => route && typeof route === 'object')
      .sort((a: any, b: any) => (b.count || 0) - (a.count || 0))
      .slice(0, limit);
    
    console.log(`📊 Popular routes: returning top ${sorted.length}`);
    
    return c.json({ routes: sorted });
    
  } catch (error) {
    console.error('❌ Get popular routes error:', error);
    return c.json({ 
      error: 'Failed to get popular routes',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * 📊 STATS D'UN LIEU SPÉCIFIQUE
 */
analyticsApp.get('/place/:placeId', async (c) => {
  try {
    const placeId = c.req.param('placeId');
    
    const key = `analytics:place:${placeId}`;
    const stats = await kv.get(key);
    
    if (!stats) {
      return c.json({ error: 'Place not found' }, 404);
    }
    
    return c.json({ stats });
    
  } catch (error) {
    console.error('❌ Get place stats error:', error);
    return c.json({ 
      error: 'Failed to get place stats',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

export default analyticsApp;
