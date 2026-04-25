/**
 * 🔧 useAdminConfig — Réactive aux changements de config admin en temps réel
 *
 * Utilisé par les apps driver et passager pour :
 * - Obtenir le taux de change à jour
 * - Détecter le mode maintenance
 * - Réagir à tout paramètre modifié dans le panel admin
 *
 * Stratégie :
 * 1. Lecture immédiate depuis le cache localStorage (instantané)
 * 2. Polling légère toutes les 60s via le endpoint /config/version
 * 3. Si version > connue → re-fetch complet
 * 4. Écoute BroadcastChannel pour les mises à jour du même navigateur
 */

import { useState, useEffect, useRef } from 'react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

const API = `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52`;
const CACHE_KEY    = 'smartcabb_config_cache';
const LEGACY_KEY   = 'smartcab_system_settings';

export interface AdminConfig {
  exchangeRate:          number;
  commissionRate:        number;
  nightTimeStart:        string;
  nightTimeEnd:          string;
  freeWaitingMinutes:    number;
  distantZoneMultiplier: number;
  postpaidEnabled:       boolean;
  postpaidFee:           number;
  flutterwaveEnabled:    boolean;
  smsEnabled:            boolean;
  notificationsEnabled:  boolean;
  maintenanceMode:       boolean;
  appVersion:            string;
  lastUpdated:           string;
  configVersion?:        number;
}

const DEFAULTS: AdminConfig = {
  exchangeRate:          2800,
  commissionRate:        10,
  nightTimeStart:        '21:00',
  nightTimeEnd:          '06:00',
  freeWaitingMinutes:    10,
  distantZoneMultiplier: 2,
  postpaidEnabled:       true,
  postpaidFee:           5000,
  flutterwaveEnabled:    true,
  smsEnabled:            true,
  notificationsEnabled:  true,
  maintenanceMode:       false,
  appVersion:            '1.0.0',
  lastUpdated:           '',
};

function readCache(): AdminConfig {
  try {
    for (const key of [CACHE_KEY, LEGACY_KEY]) {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.exchangeRate) return { ...DEFAULTS, ...parsed };
      }
    }
  } catch (_) {}
  return DEFAULTS;
}

async function fetchConfig(): Promise<AdminConfig> {
  const resp = await fetch(`${API}/config/get`, {
    headers: { 'Authorization': `Bearer ${publicAnonKey}` }
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const data = await resp.json();
  if (data.success && data.config) return { ...DEFAULTS, ...data.config };
  throw new Error('Invalid response');
}

async function fetchVersion(): Promise<{ configVersion: number; lastUpdated: string }> {
  const resp = await fetch(`${API}/config/version`, {
    headers: { 'Authorization': `Bearer ${publicAnonKey}` }
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.json();
}

export function useAdminConfig() {
  const [config, setConfig] = useState<AdminConfig>(readCache);
  const versionRef = useRef<number>((readCache() as any).configVersion ?? 0);

  const applyConfig = (newConfig: AdminConfig) => {
    setConfig(newConfig);
    versionRef.current = (newConfig as any).configVersion ?? versionRef.current;
    // Écrire dans les deux clés pour compat
    try {
      const payload = JSON.stringify(newConfig);
      localStorage.setItem(CACHE_KEY,  payload);
      localStorage.setItem(LEGACY_KEY, payload);
      localStorage.setItem('smartcabb_exchange_rate', String(newConfig.exchangeRate));
    } catch (_) {}
    window.dispatchEvent(new CustomEvent('smartcabb:config-updated', { detail: newConfig }));
    window.dispatchEvent(new CustomEvent('exchange-rate-updated', { detail: { rate: newConfig.exchangeRate } }));
  };

  // ─ Chargement initial depuis le serveur ───────────────────────────────────
  useEffect(() => {
    fetchConfig()
      .then(applyConfig)
      .catch(() => { /* Silencieux — cache local suffisant */ });
  }, []);

  // ─ Polling toutes les 60s ─────────────────────────────────────────────────
  useEffect(() => {
    const poll = setInterval(async () => {
      try {
        const { configVersion } = await fetchVersion();
        if (configVersion > versionRef.current) {
          console.log(`🔄 [useAdminConfig] Nouvelle config v${configVersion} détectée`);
          const fresh = await fetchConfig();
          applyConfig(fresh);
        }
      } catch (_) {}
    }, 60_000);
    return () => clearInterval(poll);
  }, []);

  // ─ BroadcastChannel (même navigateur, autres onglets) ────────────────────
  useEffect(() => {
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('smartcabb_config');
      bc.onmessage = (e) => {
        if (e.data?.type === 'config_updated' && e.data.config) {
          applyConfig({ ...DEFAULTS, ...e.data.config });
        }
      };
    } catch (_) {}

    const handleCustom = (e: CustomEvent) => {
      if (e.detail) applyConfig({ ...DEFAULTS, ...e.detail });
    };
    window.addEventListener('smartcabb:config-updated', handleCustom as EventListener);

    return () => {
      bc?.close();
      window.removeEventListener('smartcabb:config-updated', handleCustom as EventListener);
    };
  }, []);

  return config;
}

/** Hook simple pour le taux de change (réactif) */
export function useExchangeRateFromAdmin(): number {
  const { exchangeRate } = useAdminConfig();
  return exchangeRate;
}

/** Vérifier si l'app est en mode maintenance */
export function useMaintenanceMode(): boolean {
  const { maintenanceMode } = useAdminConfig();
  return maintenanceMode;
}
