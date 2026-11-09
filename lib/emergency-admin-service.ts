/**
 * 🚨 SERVICE ADMIN SOS — SMARTCABB
 *
 * Accès administrateur aux alertes d'urgence :
 *   - lecture des alertes en cours / de l'historique,
 *   - acquittement (l'alerte est prise en charge),
 *   - clôture (résolue ou faux positif).
 *
 * Toutes les routes utilisées ici exigent un jeton de session admin :
 * la clé publique de l'application renverrait 403.
 *
 * @version 1.0.0
 */

import { projectId } from '../utils/supabase/info';
import { supabase } from './supabase';
import type {
  EmergencyRole,
  EmergencyStatus,
  EmergencyType,
  SosAlert,
} from './emergency-service';

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52`;

/** Statuts considérés comme « en cours » (l'alerte demande encore une action). */
export const ACTIVE_EMERGENCY_STATUSES: EmergencyStatus[] = ['active', 'acknowledged'];

/** Statuts d'une alerte terminée. */
export const CLOSED_EMERGENCY_STATUSES: EmergencyStatus[] = ['resolved', 'cancelled', 'false_alarm'];

export interface AdminSosAlert extends SosAlert {
  user_name?: string | null;
  user_phone?: string | null;
  note?: string | null;
  vehicle_info?: string | null;
  counterpart_name?: string | null;
  counterpart_phone?: string | null;
  metadata?: Record<string, unknown> | null;
  ack_by?: string | null;
  resolved_by?: string | null;
  resolution_note?: string | null;
}

export interface AdminActionResult {
  ok: boolean;
  alert?: AdminSosAlert;
  error?: string;
  status: number;
}

export interface ActiveEmergenciesResult {
  ok: boolean;
  alerts: AdminSosAlert[];
  count: number;
  error?: string;
  status: number;
}

interface RawAlert extends Omit<AdminSosAlert, 'type' | 'role' | 'status'> {
  type: string;
  role: string;
  status: string;
}

/** Convertit une ligne brute du backend en alerte typée (tolérant aux champs manquants). */
export function normalizeAlert(raw: RawAlert | null | undefined): AdminSosAlert | null {
  if (!raw || typeof raw !== 'object' || !raw.id) return null;
  const role: EmergencyRole = raw.role === 'driver' ? 'driver' : 'passenger';
  const type: EmergencyType =
    raw.type === 'medical' || raw.type === 'accident' || raw.type === 'harassment'
      ? raw.type
      : 'security';
  const status: EmergencyStatus =
    raw.status === 'acknowledged' || raw.status === 'resolved' || raw.status === 'cancelled' || raw.status === 'false_alarm'
      ? raw.status
      : 'active';
  return { ...(raw as unknown as AdminSosAlert), role, type, status };
}

export function isActiveEmergency(alert: Pick<AdminSosAlert, 'status'>): boolean {
  return alert.status === 'active' || alert.status === 'acknowledged';
}

/** Jeton de session admin (jamais la clé anon : ces routes sont réservées aux admins). */
async function adminToken(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || null;
  } catch {
    return null;
  }
}

async function request<T>(
  path: string,
  init: { method?: 'GET' | 'POST'; body?: Record<string, unknown>; timeoutMs?: number } = {},
): Promise<{ ok: boolean; status: number; data: T | null; error?: string }> {
  const token = await adminToken();
  if (!token) {
    return {
      ok: false,
      status: 401,
      data: null,
      error: 'Session administrateur expirée — reconnectez-vous.',
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), init.timeoutMs ?? 15_000);

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      method: init.method ?? 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(init.body ? { body: JSON.stringify(init.body) } : {}),
      signal: controller.signal,
    });

    const data = (await response.json().catch(() => null)) as T | null;

    if (!response.ok) {
      const backendError = (data as any)?.error;
      const fallback =
        response.status === 401
          ? 'Session administrateur expirée — reconnectez-vous.'
          : response.status === 403
            ? 'Ce compte n’a pas les droits administrateur.'
            : `Erreur ${response.status}`;
      return { ok: false, status: response.status, data, error: backendError || fallback };
    }

    return { ok: true, status: response.status, data };
  } catch (error) {
    const aborted = (error as Error)?.name === 'AbortError';
    return {
      ok: false,
      status: 0,
      data: null,
      error: aborted ? 'Délai dépassé — vérifiez votre connexion' : 'Réseau indisponible',
    };
  } finally {
    clearTimeout(timer);
  }
}

/** Alertes en cours (statuts `active` et `acknowledged`). */
export async function getActiveEmergencies(): Promise<ActiveEmergenciesResult> {
  const result = await request<{ success: boolean; alerts?: RawAlert[]; count?: number; error?: string }>(
    '/emergency/active',
  );

  const alerts = (result.data?.alerts || [])
    .map(normalizeAlert)
    .filter((alert): alert is AdminSosAlert => Boolean(alert));

  if (!result.ok) {
    return { ok: false, alerts, count: alerts.length, error: result.error, status: result.status };
  }
  return { ok: true, alerts, count: alerts.length, status: result.status };
}

/**
 * Liste les alertes.
 * - `active` : uniquement les alertes en cours (`/emergency/active`).
 * - un statut précis : filtré côté backend.
 * - `all` : les plus récentes, tous statuts confondus.
 */
export async function listEmergencyAlerts(options: {
  status?: EmergencyStatus | 'active' | 'all';
  limit?: number;
} = {}): Promise<{ ok: boolean; alerts: AdminSosAlert[]; error?: string; status: number }> {
  const status = options.status ?? 'all';

  if (status === 'active') {
    const result = await getActiveEmergencies();
    return { ok: result.ok, alerts: result.alerts, error: result.error, status: result.status };
  }

  const params = new URLSearchParams();
  params.set('limit', String(Math.min(Math.max(options.limit ?? 100, 1), 200)));
  if (status !== 'all') params.set('status', status);

  const result = await request<{ success: boolean; alerts?: RawAlert[]; error?: string }>(
    `/emergency/alerts?${params.toString()}`,
  );

  const alerts = (result.data?.alerts || [])
    .map(normalizeAlert)
    .filter((alert): alert is AdminSosAlert => Boolean(alert));

  return {
    ok: result.ok,
    alerts,
    error: result.error,
    status: result.status,
  };
}

/** Marque une alerte comme prise en charge. */
export async function acknowledgeEmergency(id: string): Promise<AdminActionResult> {
  const result = await request<{ success: boolean; alert?: RawAlert; error?: string }>(
    `/emergency/${encodeURIComponent(id)}/ack`,
    { method: 'POST' },
  );
  return {
    ok: result.ok && Boolean(result.data?.success),
    alert: normalizeAlert(result.data?.alert) ?? undefined,
    error: result.error || result.data?.error,
    status: result.status,
  };
}

/** Clôt une alerte (résolue, ou faux positif). */
export async function resolveEmergency(
  id: string,
  options: { falseAlarm?: boolean; note?: string } = {},
): Promise<AdminActionResult> {
  const result = await request<{ success: boolean; alert?: RawAlert; error?: string }>(
    `/emergency/${encodeURIComponent(id)}/resolve`,
    {
      method: 'POST',
      body: {
        status: options.falseAlarm ? 'false_alarm' : 'resolved',
        note: options.note || undefined,
      },
    },
  );
  return {
    ok: result.ok && Boolean(result.data?.success),
    alert: normalizeAlert(result.data?.alert) ?? undefined,
    error: result.error || result.data?.error,
    status: result.status,
  };
}

/** Durée écoulée en secondes entre deux dates (0 si invalide). */
export function secondsBetween(fromIso?: string | null, to: number = Date.now()): number {
  if (!fromIso) return 0;
  const from = new Date(fromIso).getTime();
  if (!Number.isFinite(from)) return 0;
  return Math.max(0, Math.round((to - from) / 1000));
}

/** Formate une durée en `mm:ss` (ou `h:mm:ss` au-delà d'une heure). */
export function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
