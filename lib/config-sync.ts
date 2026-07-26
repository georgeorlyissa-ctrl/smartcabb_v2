/**
 * 🔄 SYSTÈME DE SYNCHRONISATION DES CONFIGURATIONS
 * 
 * Synchronise les paramètres entre le panel admin et les applications driver/passager
 * en temps réel via le KV store de Supabase.
 * 
 * @version 1.0.0
 * @date 2026-01-28
 */

import { projectId, publicAnonKey } from '../utils/supabase/info';

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52`;

/**
 * Configuration globale de l'application
 */
export interface GlobalConfig {
  // Tarification
  exchangeRate: number;
  commissionRate: number;
  
  // Horaires
  nightTimeStart: string;
  nightTimeEnd: string;
  freeWaitingMinutes: number;
  
  // Zones
  distantZoneMultiplier: number;
  
  // Paiement
  postpaidEnabled: boolean;
  postpaidFee: number;
  flutterwaveEnabled: boolean;
  
  // Notifications
  smsEnabled: boolean;
  smsProvider: string;
  notificationsEnabled: boolean;
  
  // Système
  appVersion: string;
  maintenanceMode: boolean;
  
  // Dernière mise à jour
  lastUpdated: string;
}

/**
 * Configuration par défaut
 */
export const DEFAULT_CONFIG: GlobalConfig = {
  exchangeRate: 2800,
  commissionRate: 10,
  nightTimeStart: '21:00',
  nightTimeEnd: '06:00',
  freeWaitingMinutes: 3,
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

/**
 * Clé pour stocker la configuration dans le KV store
 */
const CONFIG_KEY = 'smartcabb_global_config';

/**
 * Clé pour le cache local
 */
const LOCAL_CACHE_KEY = 'smartcabb_config_cache';

/**
 * Récupérer la configuration depuis le serveur
 */
export async function fetchGlobalConfig(): Promise<GlobalConfig> {
  try {
    const response = await fetch(`${API_BASE}/config/get`, {
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`
      }
    });

    if (!response.ok) {
      console.log('ℹ️ Config serveur non disponible, utilisation du cache local');
      return getCachedConfig();
    }

    const data = await response.json();
    
    if (data.success && data.config) {
      // Mettre en cache
      cacheConfig(data.config);
      console.log('✅ Configuration chargée depuis le serveur');
      return data.config;
    }

    return getCachedConfig();
  } catch (error) {
    // ✅ Comportement normal : utilisation du cache si le serveur n'est pas accessible
    console.log('ℹ️ Utilisation de la configuration en cache (serveur non accessible)');
    return getCachedConfig();
  }
}

/**
 * Sauvegarder la configuration sur le serveur (admin uniquement)
 */
export async function saveGlobalConfig(config: Partial<GlobalConfig>): Promise<boolean> {
  try {
    const fullConfig: GlobalConfig = {
      ...DEFAULT_CONFIG,
      ...config,
      lastUpdated: new Date().toISOString()
    };

    const response = await fetch(`${API_BASE}/config/update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`
      },
      body: JSON.stringify({ config: fullConfig })
    });

    if (!response.ok) {
      throw new Error('Erreur serveur');
    }

    const data = await response.json();
    
    if (data.success) {
      // Mettre à jour le cache local (toutes les clés pour compatibilité)
      cacheConfig(fullConfig);
      try {
        localStorage.setItem('smartcab_system_settings', JSON.stringify(fullConfig));
        localStorage.setItem('smartcabb_exchange_rate', String(fullConfig.exchangeRate));
      } catch (_) {}
      console.log('✅ Configuration sauvegardée');
      
      // Notifier tous les onglets ouverts
      broadcastConfigUpdate(fullConfig);
      
      return true;
    }

    return false;
  } catch (error) {
    console.error('❌ Erreur sauvegarde config:', error);
    return false;
  }
}

/**
 * Mettre en cache la configuration
 */
function cacheConfig(config: GlobalConfig): void {
  try {
    const payload = JSON.stringify(config);
    localStorage.setItem(LOCAL_CACHE_KEY, payload);
    localStorage.setItem('smartcab_system_settings', payload);
    localStorage.setItem('smartcabb_exchange_rate', String(config.exchangeRate));
  } catch (error) {
    console.warn('⚠️ Erreur mise en cache:', error);
  }
}

/**
 * Récupérer la configuration depuis le cache
 */
function getCachedConfig(): GlobalConfig {
  try {
    const cached = localStorage.getItem(LOCAL_CACHE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (error) {
    console.warn('⚠️ Erreur lecture cache:', error);
  }
  return DEFAULT_CONFIG;
}

/**
 * Diffuser la mise à jour de config à tous les onglets
 */
function broadcastConfigUpdate(config: GlobalConfig): void {
  try {
    const bc = new BroadcastChannel('smartcabb_config');
    bc.postMessage({
      type: 'config_updated',
      config,
      timestamp: Date.now()
    });
    bc.close();
  } catch (error) {
    console.warn('⚠️ BroadcastChannel non supporté:', error);
  }
}

/**
 * Écouter les mises à jour de configuration
 */
export function listenConfigUpdates(callback: (config: GlobalConfig) => void): () => void {
  try {
    const bc = new BroadcastChannel('smartcabb_config');
    
    bc.onmessage = (event) => {
      if (event.data.type === 'config_updated') {
        console.log('🔄 Configuration mise à jour reçue');
        cacheConfig(event.data.config);
        callback(event.data.config);
      }
    };

    return () => bc.close();
  } catch (error) {
    console.warn('⚠️ BroadcastChannel non supporté:', error);
    return () => {};
  }
}

/**
 * Hook pour récupérer une valeur de config spécifique
 */
export function getConfigValue<K extends keyof GlobalConfig>(
  key: K,
  defaultValue?: GlobalConfig[K]
): GlobalConfig[K] {
  const config = getCachedConfig();
  return config[key] ?? defaultValue ?? DEFAULT_CONFIG[key];
}

/**
 * Convertir USD en CDF avec le taux actuel
 */
export function convertUSDtoCDF(usd: number): number {
  const rate = getConfigValue('exchangeRate', DEFAULT_CONFIG.exchangeRate);
  return Math.round(usd * rate);
}

/**
 * Vérifier si on est en période nocturne
 */
export function isNightTime(): boolean {
  const config = getCachedConfig();
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  
  const [nightStartHour, nightStartMin] = config.nightTimeStart.split(':').map(Number);
  const [nightEndHour, nightEndMin] = config.nightTimeEnd.split(':').map(Number);
  
  const currentMinutes = hour * 60 + minute;
  const startMinutes = nightStartHour * 60 + nightStartMin;
  const endMinutes = nightEndHour * 60 + nightEndMin;
  
  // Si la période nocturne traverse minuit
  if (startMinutes > endMinutes) {
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }
  
  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

/**
 * Initialiser la synchronisation de config (à appeler au démarrage de l'app)
 */
export async function initConfigSync(): Promise<GlobalConfig> {
  // Charger la config depuis le serveur
  const config = await fetchGlobalConfig();
  
  // ⚡ OPTIMISATION v2.0: Réduire le polling de 5min → 15min
  // ✅ Utiliser BroadcastChannel pour sync instantanée
  // ✅ Ne recharger que si vraiment nécessaire
  setInterval(async () => {
    const updatedConfig = await fetchGlobalConfig();
    
    // Vérifier si la config a changé
    const cached = getCachedConfig();
    if (updatedConfig.lastUpdated !== cached.lastUpdated) {
      console.log('🔄 Configuration mise à jour détectée');
      window.dispatchEvent(new CustomEvent('smartcabb:config-updated', {
        detail: updatedConfig
      }));
    }
  }, 15 * 60 * 1000); // ⚡ 15 minutes au lieu de 5
  
  return config;
}
