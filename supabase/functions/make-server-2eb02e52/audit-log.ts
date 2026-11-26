/**
 * 🧾 JOURNAL D'AUDIT — SMARTCABB
 * ---------------------------------------------------------------------------
 * Écrit les actions sensibles dans la table `audit_logs` (visible dans
 * Admin → Journal d'audit). Répond au contrôle CIS 8 (gestion des journaux) :
 * collecte côté serveur, conservation 90 jours, revue possible.
 *
 * Règles :
 *   • l'écriture ne casse jamais l'action métier (erreurs avalées) ;
 *   • jamais de secret ni de donnée sensible dans `details` ;
 *   • l'IP est validée avant insertion (colonne `inet`).
 */

import { createClient } from "npm:@supabase/supabase-js@2";

const AUDIT_TABLE = "audit_logs";
const DEFAULT_RETENTION_DAYS = 90;

function sb() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
}

function safeIp(value?: string | null): string | null {
  if (!value) return null;
  const v = String(value).trim();
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(v)) return v;
  if (/^[0-9a-f:]{2,45}$/i.test(v) && v.includes(":")) return v;
  return null;
}

export interface AuditEntry {
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  userId?: string | null;
  userAgent?: string | null;
  ip?: string | null;
  details?: Record<string, unknown>;
}

/** Écrit une entrée d'audit. Renvoie `{ ok }` (et l'erreur le cas échéant). */
export async function writeAuditLog(entry: AuditEntry): Promise<{ ok: boolean; error?: string }> {
  const payload = {
    user_id: entry.userId ?? null,
    action: String(entry.action).slice(0, 80),
    entity_type: entry.entityType ? String(entry.entityType).slice(0, 60) : null,
    entity_id: entry.entityId ? String(entry.entityId).slice(0, 120) : null,
    details: entry.details ?? {},
    ip_address: safeIp(entry.ip),
    user_agent: entry.userAgent ? String(entry.userAgent).slice(0, 300) : null,
  };

  try {
    let { error } = await sb().from(AUDIT_TABLE).insert(payload);

    // La colonne user_id référence `profiles` : un admin sans fiche profil
    // ferait échouer l'insertion. On rejoue alors en anonyme (action système)
    // plutôt que de perdre la trace de l'action.
    if (error && payload.user_id && /foreign key|user_id_fkey/i.test(error.message)) {
      const retry = await sb().from(AUDIT_TABLE).insert({ ...payload, user_id: null });
      error = retry.error;
    }

    if (error) {
      console.warn("⚠️ [AUDIT] Insertion impossible:", error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (e) {
    console.warn("⚠️ [AUDIT] Exception:", e instanceof Error ? e.message : e);
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Supprime les entrées plus anciennes que la rétention (90 j par défaut). */
export async function purgeAuditLogs(retentionDays?: number): Promise<number> {
  const days = Math.max(
    7,
    Number(retentionDays ?? Deno.env.get("AUDIT_LOG_RETENTION_DAYS") ?? DEFAULT_RETENTION_DAYS) ||
      DEFAULT_RETENTION_DAYS,
  );
  const cutoff = new Date(Date.now() - days * 86_400_000).toISOString();
  try {
    const { data, error } = await sb()
      .from(AUDIT_TABLE)
      .delete()
      .lt("created_at", cutoff)
      .select("id");
    if (error) {
      console.warn("⚠️ [AUDIT] Purge impossible:", error.message);
      return 0;
    }
    return Array.isArray(data) ? data.length : 0;
  } catch (e) {
    console.warn("⚠️ [AUDIT] Purge exception:", e instanceof Error ? e.message : e);
    return 0;
  }
}
