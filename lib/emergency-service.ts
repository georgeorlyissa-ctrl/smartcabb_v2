/**
 * 🚨 SERVICE SOS / URGENCES — SMARTCABB
 *
 * Centralise les appels au backend `/emergency/*` :
 *   - envoi d'une alerte avec position réelle,
 *   - annulation de sa propre alerte,
 *   - lecture des numéros d'urgence configurés.
 *
 * Aucune erreur n'est masquée : l'interface doit pouvoir afficher un échec
 * honnête plutôt qu'un faux « secours prévenus ».
 *
 * @version 1.0.0
 */

import { projectId, publicAnonKey } from '../utils/supabase/info';
import { supabase } from './supabase';

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52`;

export type EmergencyType = 'medical' | 'security' | 'accident' | 'harassment';
export type EmergencyRole = 'passenger' | 'driver';
export type EmergencyStatus = 'active' | 'acknowledged' | 'resolved' | 'cancelled' | 'false_alarm';

export interface EmergencyNumbers {
  police: string;
  ambulance: string;
  support: string;
}

export interface SosAlert {
  id: string;
  user_id: string;
  role: EmergencyRole;
  type: EmergencyType;
  status: EmergencyStatus;
  lat?: number | null;
  lng?: number | null;
  accuracy?: number | null;
  address?: string | null;
  ride_id?: string | null;
  created_at: string;
  ack_at?: string | null;
  resolved_at?: string | null;
}

export interface SosRequest {
  role: EmergencyRole;
  type: EmergencyType;
  userId?: string;
  userName?: string;
  userPhone?: string;
  rideId?: string;
  lat?: number | null;
  lng?: number | null;
  accuracy?: number | null;
  address?: string;
  note?: string;
  vehicleInfo?: string;
  counterpartName?: string;
  counterpartPhone?: string;
  locationSource?: 'gps' | 'cached' | 'default' | 'unavailable';
  source?: string;
}

export interface SosResult {
  ok: boolean;
  alert?: SosAlert;
  deduplicated?: boolean;
  smsNotified?: boolean;
  error?: string;
}

type SosApiResponse = {
  success: boolean;
  alert?: SosAlert;
  deduplicated?: boolean;
  notified?: { sms?: boolean };
  error?: string;
};

const DEFAULT_NUMBERS: EmergencyNumbers = {
  police: '112',
  ambulance: '115',
  support: '',
};

let configCache: { numbers: EmergencyNumbers; fetchedAt: number } | null = null;
const CONFIG_TTL_MS = 5 * 60 * 1000;

async function bearer(): Promise<string> {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token) return token;
  } catch {
    // Session indisponible : on retombe sur la clé publique de l'app.
  }
  return publicAnonKey;
}

async function postJson<T>(
  path: string,
  body: Record<string, unknown>,
  timeoutMs = 12_000,
  forceAnon = false,
): Promise<{ ok: boolean; status: number; data: T | null; error?: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${forceAnon ? publicAnonKey : await bearer()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const data = (await response.json().catch(() => null)) as T | null;
    if (!response.ok) {
      const message =
        (data as any)?.error || `Erreur ${response.status}`;
      return { ok: false, status: response.status, data, error: message };
    }
    return { ok: true, status: response.status, data };
  } catch (error) {
    const aborted = (error as Error)?.name === 'AbortError';
    return {
      ok: false,
      status: 0,
      data: null,
      error: aborted
        ? 'Délai dépassé — vérifiez votre connexion'
        : 'Réseau indisponible',
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Déclenche une alerte SOS.
 */
export async function sendSos(request: SosRequest): Promise<SosResult> {
  const payload = request as unknown as Record<string, unknown>;

  let result = await postJson<SosApiResponse>('/emergency/sos', payload);

  // Session expirée : on retente immédiatement avec la clé publique de l'app.
  // Une alerte SOS ne doit jamais échouer à cause d'un jeton périmé.
  if (!result.ok && result.status === 401) {
    console.warn('⚠️ [SOS] Session refusée, nouvelle tentative avec la clé de l’application');
    result = await postJson<SosApiResponse>('/emergency/sos', payload, 12_000, true);
  }

  if (!result.ok || !result.data?.success) {
    return { ok: false, error: result.error || result.data?.error || 'Alerte non transmise' };
  }

  return {
    ok: true,
    alert: result.data.alert,
    deduplicated: result.data.deduplicated,
    smsNotified: Boolean(result.data.notified?.sms),
  };
}

/**
 * Annule une alerte que l'on vient de déclencher.
 */
export async function cancelSos(alertId: string, userId?: string): Promise<boolean> {
  const payload = {
    ...(userId ? { userId } : {}),
    reason: 'Annulée par l’utilisateur',
  };
  let result = await postJson<{ success: boolean }>(`/emergency/${alertId}/cancel`, payload);
  if (!result.ok && result.status === 401) {
    result = await postJson<{ success: boolean }>(`/emergency/${alertId}/cancel`, payload, 12_000, true);
  }
  return result.ok && Boolean(result.data?.success);
}

/**
 * Numéros d'urgence configurés par l'administrateur (avec cache 5 min).
 */
export async function fetchEmergencyNumbers(force = false): Promise<EmergencyNumbers> {
  if (!force && configCache && Date.now() - configCache.fetchedAt < CONFIG_TTL_MS) {
    return configCache.numbers;
  }

  try {
    const response = await fetch(`${API_BASE}/emergency/config`, {
      headers: { 'Authorization': `Bearer ${await bearer()}` },
    });
    if (!response.ok) return configCache?.numbers || DEFAULT_NUMBERS;

    const data = await response.json();
    const numbers: EmergencyNumbers = {
      police: String(data?.numbers?.police || DEFAULT_NUMBERS.police),
      ambulance: String(data?.numbers?.ambulance || DEFAULT_NUMBERS.ambulance),
      support: String(data?.numbers?.support || ''),
    };
    configCache = { numbers, fetchedAt: Date.now() };
    return numbers;
  } catch {
    return configCache?.numbers || DEFAULT_NUMBERS;
  }
}

/** Réinitialise le cache (tests / changement de config). */
export function clearEmergencyConfigCache() {
  configCache = null;
}
