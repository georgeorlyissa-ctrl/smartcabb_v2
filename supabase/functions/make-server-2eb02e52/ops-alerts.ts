/**
 * 🚨 ALERTES OPÉRATIONNELLES — SMARTCABB
 * ---------------------------------------------------------------------------
 * Prévient l'administrateur par email quand quelque chose casse côté serveur :
 *   • échec de sauvegarde (`backup_failed`)
 *   • erreur serveur 5xx (`server_error`)
 *   • échec du test de restauration (`restore_failed`)
 *   • test manuel depuis le panneau admin (`test`)
 *
 * Principes :
 *   • **jamais bloquant** : toutes les erreurs sont avalées, on ne casse pas la
 *     route appelante ;
 *   • **anti-spam** : un même type d'alerte est limité à 1 envoi / 15 min
 *     (compteur KV distribué) ;
 *   • **traçable** : le dernier envoi (date, type, erreur) est conservé dans
 *     `system_health:alerts` et affiché dans le panneau admin.
 *
 * Secrets utilisés : SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD,
 * ADMIN_ALERT_EMAIL (sinon ADMIN_2FA_EMAIL).
 */

import { createClient } from "npm:@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6.9.13";

const KV_TABLE = "kv_store_2eb02e52";
const STATE_KEY = "system_health:alerts";
const THROTTLE_PREFIX = "ops_alert:";
const SEND_TIMEOUT_MS = 8000;

function sb() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
}

async function kvGet<T>(key: string): Promise<T | null> {
  try {
    const { data, error } = await sb().from(KV_TABLE).select("value").eq("key", key).maybeSingle();
    if (error) return null;
    return (data?.value ?? null) as T | null;
  } catch {
    return null;
  }
}

async function kvSet(key: string, value: unknown): Promise<void> {
  try {
    await sb().from(KV_TABLE).upsert({ key, value });
  } catch (e) {
    console.error("⚠️ [ALERTS] Écriture KV impossible:", e instanceof Error ? e.message : e);
  }
}

export function getAlertRecipient(): string | null {
  return Deno.env.get("ADMIN_ALERT_EMAIL") || Deno.env.get("ADMIN_2FA_EMAIL") || null;
}

/**
 * Destinataire effectif : variable d'environnement, sinon premier compte
 * Supabase dont le rôle est `admin` (utile quand aucun secret n'est défini).
 */
export async function resolveAlertRecipient(): Promise<string | null> {
  const fromEnv = getAlertRecipient();
  if (fromEnv) return fromEnv;
  try {
    const { data } = await sb().auth.admin.listUsers({ page: 1, perPage: 100 });
    const admin = (data?.users || []).find(
      (u: any) => (u.user_metadata?.role || u.app_metadata?.role) === "admin" && !!u.email,
    );
    return admin?.email ?? null;
  } catch (e) {
    console.warn("⚠️ [ALERTS] Résolution du destinataire impossible:", e instanceof Error ? e.message : e);
    return null;
  }
}

export function isSmtpConfigured(): boolean {
  return Boolean(Deno.env.get("SMTP_USER") && Deno.env.get("SMTP_PASSWORD"));
}

export function maskEmail(email: string | null): string | null {
  if (!email) return null;
  const [local, domain] = email.split("@");
  if (!domain) return email;
  const head = local.slice(0, 1);
  return `${head}${"*".repeat(Math.max(1, Math.min(4, local.length - 1)))}@${domain}`;
}

async function record(patch: Record<string, unknown>): Promise<void> {
  const previous = (await kvGet<Record<string, unknown>>(STATE_KEY)) || {};
  await kvSet(STATE_KEY, { ...previous, ...patch, updatedAt: new Date().toISOString() });
}

export async function getAlertsState(): Promise<Record<string, any> | null> {
  return await kvGet<Record<string, any>>(STATE_KEY);
}

export interface OpsAlertOptions {
  /** Fenêtre anti-spam en ms (0 = pas de limite). */
  throttleMs?: number;
  /** Ignore l'anti-spam (test manuel). */
  force?: boolean;
}

export interface OpsAlertResult {
  sent: boolean;
  skipped?: boolean;
  reason?: string;
  recipient?: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Envoie une alerte à l'administrateur. Ne lève jamais d'exception.
 */
export async function sendOpsAlert(
  kind: string,
  subject: string,
  lines: string[],
  options: OpsAlertOptions = {},
): Promise<OpsAlertResult> {
  const throttleMs = options.throttleMs ?? 15 * 60 * 1000;
  const recipient = await resolveAlertRecipient();

  await record({ lastAttemptAt: new Date().toISOString(), lastKind: kind });

  try {
    if (!options.force && throttleMs > 0) {
      const last = await kvGet<number>(THROTTLE_PREFIX + kind);
      if (last && Date.now() - last < throttleMs) {
        return { sent: false, skipped: true, reason: "throttled" };
      }
    }

    if (!isSmtpConfigured()) {
      await record({ lastError: "SMTP non configuré", lastErrorAt: new Date().toISOString(), lastKind: kind });
      return { sent: false, skipped: true, reason: "smtp_not_configured" };
    }

    if (!recipient) {
      await record({ lastError: "Aucun destinataire (ADMIN_ALERT_EMAIL/ADMIN_2FA_EMAIL)", lastErrorAt: new Date().toISOString(), lastKind: kind });
      return { sent: false, skipped: true, reason: "no_recipient" };
    }

    const host = Deno.env.get("SMTP_HOST") || "smtp.gmail.com";
    const port = Number(Deno.env.get("SMTP_PORT") || 465);
    const user = Deno.env.get("SMTP_USER") as string;
    const pass = Deno.env.get("SMTP_PASSWORD") as string;

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      connectionTimeout: SEND_TIMEOUT_MS,
      greetingTimeout: SEND_TIMEOUT_MS,
      socketTimeout: SEND_TIMEOUT_MS,
    });

    const now = new Date();
    const html = `
      <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:560px;margin:0 auto">
        <div style="background:#001B3D;color:#fff;padding:16px 20px;border-radius:12px 12px 0 0">
          <div style="font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:#FFCC00;font-weight:700">SmartCabb · Alerte</div>
          <div style="font-size:18px;font-weight:800;margin-top:6px">${escapeHtml(subject)}</div>
        </div>
        <div style="border:1px solid #E4E9F0;border-top:0;border-radius:0 0 12px 12px;padding:18px 20px">
          <ul style="margin:0;padding-left:18px;color:#0B1B2B;font-size:14px;line-height:1.6">
            ${lines.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}
          </ul>
          <p style="margin:16px 0 0;font-size:12px;color:#64748B">
            ${now.toISOString()} · type <code>${escapeHtml(kind)}</code>
          </p>
          <p style="margin:8px 0 0;font-size:12px;color:#64748B">
            Panneau admin → Sauvegardes → Santé du système.
          </p>
        </div>
      </div>`;

    await transporter.sendMail({
      from: `"SmartCabb Ops" <${user}>`,
      to: recipient,
      subject: `[SmartCabb] ${subject}`,
      html,
    });

    const sentAt = new Date().toISOString();
    await kvSet(THROTTLE_PREFIX + kind, Date.now());
    const previous = (await kvGet<Record<string, any>>(STATE_KEY)) || {};
    await record({
      lastSentAt: sentAt,
      lastKind: kind,
      lastError: null,
      sentCount: Number(previous.sentCount || 0) + 1,
    });

    console.log(`🚨 [ALERTS] ${kind} envoyée à ${maskEmail(recipient)}`);
    return { sent: true, recipient };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("❌ [ALERTS] Envoi impossible:", message);
    await record({ lastError: message, lastErrorAt: new Date().toISOString(), lastKind: kind });
    return { sent: false, reason: message };
  }
}
