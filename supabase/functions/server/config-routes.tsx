/**
 * 🔧 ROUTES DE CONFIGURATION GLOBALE
 * 
 * API pour gérer la configuration globale de SmartCabb
 * Synchronise les paramètres entre admin et applications
 * 
 * @version 1.0.0
 * @date 2026-01-28
 */

import { Hono } from "npm:hono";
import * as kv from "./kv_store.ts";

const app = new Hono();

/**
 * Configuration par défaut
 */
const DEFAULT_CONFIG = {
  exchangeRate: 2800,
  commissionRate: 10,
  nightTimeStart: '21:00',
  nightTimeEnd: '06:00',
  freeWaitingMinutes: 10,
  distantZoneMultiplier: 2,
  postpaidEnabled: true,
  postpaidFee: 5000,
  flutterwaveEnabled: true,
  smsEnabled: true,
  smsProvider: 'africas_talking',
  notificationsEnabled: true,
  appVersion: '1.0.0',
  maintenanceMode: false,
  lastUpdated: new Date().toISOString()
};

const CONFIG_KEY = 'smartcabb_global_config';

/**
 * GET /config/get
 * Récupérer la configuration globale
 */
app.get('/get', async (c) => {
  try {
    console.log('📖 Récupération de la configuration globale');
    
    const config = await kv.get(CONFIG_KEY);
    
    if (config) {
      console.log('✅ Configuration trouvée');
      return c.json({
        success: true,
        config: typeof config === 'string' ? JSON.parse(config) : config
      });
    }
    
    // Si aucune config, retourner la config par défaut
    console.log('ℹ️ Aucune config trouvée, utilisation des valeurs par défaut');
    await kv.set(CONFIG_KEY, JSON.stringify(DEFAULT_CONFIG));
    
    return c.json({
      success: true,
      config: DEFAULT_CONFIG
    });
  } catch (error) {
    console.error('❌ Erreur récupération config:', error);
    return c.json({
      success: false,
      error: 'Erreur serveur',
      config: DEFAULT_CONFIG // Toujours retourner une config valide
    }, 500);
  }
});

/**
 * POST /config/update
 * Mettre à jour la configuration globale (admin uniquement)
 */
app.post('/update', async (c) => {
  try {
    const body = await c.req.json();
    const { config } = body;
    
    if (!config) {
      return c.json({
        success: false,
        error: 'Configuration manquante'
      }, 400);
    }
    
    console.log('💾 Mise à jour de la configuration globale');
    
    // Ajouter le timestamp de mise à jour
    const updatedConfig = {
      ...config,
      lastUpdated: new Date().toISOString()
    };
    
    // Sauvegarder dans le KV store
    await kv.set(CONFIG_KEY, JSON.stringify(updatedConfig));
    
    console.log('✅ Configuration mise à jour avec succès');
    
    return c.json({
      success: true,
      config: updatedConfig
    });
  } catch (error) {
    console.error('❌ Erreur mise à jour config:', error);
    return c.json({
      success: false,
      error: 'Erreur lors de la mise à jour'
    }, 500);
  }
});

/**
 * GET /config/value/:key
 * Récupérer une valeur spécifique de la configuration
 */
app.get('/value/:key', async (c) => {
  try {
    const key = c.req.param('key');
    
    console.log(`📖 Récupération de la valeur: ${key}`);
    
    const config = await kv.get(CONFIG_KEY);
    const parsedConfig = config ? (typeof config === 'string' ? JSON.parse(config) : config) : DEFAULT_CONFIG;
    
    if (key in parsedConfig) {
      return c.json({
        success: true,
        key,
        value: parsedConfig[key]
      });
    }
    
    return c.json({
      success: false,
      error: 'Clé non trouvée'
    }, 404);
  } catch (error) {
    console.error(`❌ Erreur récupération valeur ${c.req.param('key')}:`, error);
    return c.json({
      success: false,
      error: 'Erreur serveur'
    }, 500);
  }
});

/**
 * POST /config/reset
 * Réinitialiser la configuration aux valeurs par défaut
 */
app.post('/reset', async (c) => {
  try {
    console.log('🔄 Réinitialisation de la configuration');
    
    await kv.set(CONFIG_KEY, JSON.stringify(DEFAULT_CONFIG));
    
    console.log('✅ Configuration réinitialisée');
    
    return c.json({
      success: true,
      config: DEFAULT_CONFIG
    });
  } catch (error) {
    console.error('❌ Erreur réinitialisation config:', error);
    return c.json({
      success: false,
      error: 'Erreur lors de la réinitialisation'
    }, 500);
  }
});

export default app;
