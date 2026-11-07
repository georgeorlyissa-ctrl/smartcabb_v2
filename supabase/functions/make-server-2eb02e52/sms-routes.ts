/**
 * 📱 ROUTES SMS - SMARTCABB
 * POST /sms/send    — Envoyer un SMS via EJ SMS (EJSARL)
 * GET  /sms/config  — Configuration SMS (provider, enabled)
 * GET  /sms/balance — Solde de crédits EJ SMS
 * GET  /sms/logs    — Historique des envois (admin)
 * POST /sms/test    — SMS de test (admin)
 * POST /sms/dlr     — Webhook des accusés de réception signés (EJ SMS)
 * @version 2.0.0
 */

import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js@2";
import { normalizePhoneNumber, isValidPhoneNumber } from "./phone-utils.ts";
import { get as kvGet, set as kvSet, getByPrefix as kvGetByPrefix } from "./kv-wrapper.ts";
import {
  ejSmsConfigured,
  ejSmsDiagnostics,
  getEjSmsBalance,
  sendEjSms,
  verifyEjSmsSignature,
} from "./ej-sms-core.ts";

const app = new Hono();

const CONFIG_KEY = "smartcabb_global_config";
const SMS_LOG_PREFIX = "sms_log:";

// ─── Garde d'authentification ─────────────────────────────────────────────────
// L'Edge Function est déployée avec `verify_jwt = false` : chaque route doit
// donc vérifier elle-même le porteur du jeton.

function serviceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
}

function bearerToken(c: any): string {
  const header = c.req.header("Authorization") || c.req.header("authorization") || "";
  const match = /^Bearer\s+(.+)$/i.exec(String(header).trim());
  return match ? match[1].trim() : "";
}

function safeEqual(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Le jeton est-il la clé publique de l'application (anon key) ? */
function isAnonKey(token: string): boolean {
  const anon = Deno.env.get("SUPABASE_ANON_KEY") || "";
  return Boolean(anon) && safeEqual(token, anon);
}

/** Utilisateur Supabase valide (session réelle) ? */
async function getSessionUser(token: string): Promise<any | null> {
  if (!token) return null;
  try {
    const { data, error } = await serviceClient().auth.getUser(token);
    if (error || !data?.user) return null;
    return data.user;
  } catch (e) {
    console.error("❌ [SMS/AUTH] Erreur vérification jeton:", e instanceof Error ? e.message : e);
    return null;
  }
}

async function requireAdmin(c: any): Promise<{ ok: true } | { ok: false; response: Response }> {
  const token = bearerToken(c);
  if (!token) {
    return { ok: false, response: c.json({ success: false, error: "Authentification requise" }, 401) };
  }
  const user = await getSessionUser(token);
  if (!user) {
    return { ok: false, response: c.json({ success: false, error: "Session invalide ou expirée" }, 401) };
  }
  const role = user.user_metadata?.role || user.app_metadata?.role || "passenger";
  if (role !== "admin") {
    return { ok: false, response: c.json({ success: false, error: "Compte non autorisé" }, 403) };
  }
  return { ok: true };
}

/** L'appelant est-il l'application (anon key) ou un utilisateur connecté ? */
async function requireAppOrUser(c: any): Promise<{ ok: true; isAdmin: boolean } | { ok: false; response: Response }> {
  const token = bearerToken(c);
  if (!token) {
    return { ok: false, response: c.json({ success: false, error: "Authentification requise" }, 401) };
  }
  if (isAnonKey(token)) return { ok: true, isAdmin: false };
  const user = await getSessionUser(token);
  if (!user) {
    return { ok: false, response: c.json({ success: false, error: "Session invalide ou expirée" }, 401) };
  }
  return { ok: true, isAdmin: (user.user_metadata?.role || user.app_metadata?.role || "passenger") === "admin" };
}

// ─── Limitation de débit (anti-abus des crédits SMS) ─────────────────────────
// Mémoire d'isolate : ce n'est pas un quota distribué, mais cela bloque les
// rafales et les scripts qui videraient les crédits en quelques secondes.

const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_PER_DESTINATION = 3;
const RATE_PER_IP = 30;
const rateBuckets = new Map<string, number[]>();

function checkRateLimit(key: string, max: number): boolean {
  const now = Date.now();
  const hits = (rateBuckets.get(key) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (hits.length >= max) {
    rateBuckets.set(key, hits);
    return false;
  }
  hits.push(now);
  rateBuckets.set(key, hits);
  if (rateBuckets.size > 5000) {
    for (const [k, v] of rateBuckets) {
      if (!v.length || now - v[v.length - 1] > RATE_WINDOW_MS) rateBuckets.delete(k);
    }
  }
  return true;
}

function clientIp(c: any): string {
  const forwarded = c.req.header("x-forwarded-for") || "";
  return String(forwarded).split(",")[0].trim() || "unknown";
}

function nowIso(): string {
  return new Date().toISOString();
}

/** Normalise un statut EJ SMS / type d'événement DLR vers DELIVERED | FAILED | SENT | PENDING | CANCELLED. */
function normalizeStatus(rawStatus?: string | null, eventType?: string | null): string {
  const value = String(rawStatus || eventType || "").trim().toUpperCase();

  if (!value) return "UNKNOWN";
  if (value.includes("DELIVER")) return "DELIVERED";
  if (value.includes("FAIL") || value.includes("REJECT") || value.includes("ECHEC")) return "FAILED";
  if (value.includes("CANCEL")) return "CANCELLED";
  if (value.includes("SCHEDUL")) return "SCHEDULED";
  if (value.includes("SENT") || value.includes("ENVOY")) return "SENT";
  if (value.includes("PENDING") || value.includes("ATTENTE")) return "PENDING";

  return value;
}

async function writeSmsLog(entry: Record<string, any>): Promise<string> {
  const id =
    entry.id ||
    entry.reference ||
    `sms_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  await kvSet(`${SMS_LOG_PREFIX}${id}`, {
    ...entry,
    id,
    provider: "ejsms",
    created_at: entry.created_at || nowIso(),
  }).catch((e) => console.error("❌ [SMS/LOG] Erreur écriture:", e));

  return id;
}

// ─── GET /config — Configuration SMS ──────────────────────────────────────────

app.get("/config", async (c) => {
  try {
    const auth = await requireAppOrUser(c);
    if (!auth.ok) return auth.response;

    const stored = await kvGet<any>(CONFIG_KEY);
    return c.json({
      provider: "ejsms",
      enabled: stored?.smsEnabled !== false,
      configured: ejSmsConfigured(),
      // Le détail de configuration est réservé aux administrateurs.
      ...(auth.isAdmin ? { diagnostics: ejSmsDiagnostics() } : {}),
    });
  } catch (error) {
    console.error("❌ [SMS/CONFIG] Erreur:", error);
    return c.json({ provider: "ejsms", enabled: false, configured: ejSmsConfigured() });
  }
});

// ─── POST /send — Envoyer un SMS ──────────────────────────────────────────────

app.post("/send", async (c) => {
  try {
    const auth = await requireAppOrUser(c);
    if (!auth.ok) return auth.response;

    const body = await c.req.json().catch(() => ({}));
    const { to, phoneNumber, message, type } = body;

    const destination = to || phoneNumber;
    if (!destination || !message) {
      return c.json({ success: false, error: "Champs requis: to (ou phoneNumber) et message" }, 400);
    }

    const normalized = normalizePhoneNumber(destination);
    if (!normalized || !isValidPhoneNumber(normalized)) {
      return c.json({ success: false, error: "Numéro de téléphone invalide. Format attendu : +243XXXXXXXXX" }, 400);
    }

    // Anti-abus : borne la taille du message et le nombre d'envois.
    const text = String(message).trim();
    if (!text) {
      return c.json({ success: false, error: "Message vide" }, 400);
    }
    if (text.length > 480) {
      return c.json({ success: false, error: "Message trop long (480 caractères maximum)" }, 400);
    }

    const typeLabel = String(type || "generic").slice(0, 40);
    const ip = clientIp(c);

    if (!checkRateLimit(`ip:${ip}`, RATE_PER_IP)) {
      console.warn("⚠️ [SMS/SEND] Limite par IP atteinte:", ip);
      return c.json({ success: false, error: "Trop de demandes, réessayez dans quelques minutes" }, 429);
    }
    if (!checkRateLimit(`dest:${normalized}`, RATE_PER_DESTINATION)) {
      console.warn("⚠️ [SMS/SEND] Limite par destinataire atteinte:", normalized);
      return c.json({ success: false, error: "Trop de SMS envoyés à ce numéro, réessayez plus tard" }, 429);
    }

    const stored = await kvGet<any>(CONFIG_KEY);
    if (stored?.smsEnabled === false) {
      console.warn("⚠️ [SMS/SEND] SMS désactivés dans la config, envoi ignoré");
      return c.json({ success: true, skipped: true, reason: "sms_disabled" });
    }

    if (!ejSmsConfigured()) {
      console.error("❌ [SMS/SEND] Secrets EJ SMS manquants");
      return c.json({ success: false, error: "SMS non configuré côté serveur (EJ SMS)" }, 500);
    }

    const result = await sendEjSms({ to: normalized, message });

    if (!result.ok) {
      console.error("❌ [SMS/SEND] Échec EJ SMS:", result.status, result.error, result.raw);
      await writeSmsLog({
        phone_number: normalized,
        to: normalized,
        message: String(message).slice(0, 500),
        type: typeLabel,
        status: "FAILED",
        success: false,
        error: result.error || "Échec de l'envoi",
        reference: result.reference || null,
        sent_at: nowIso(),
      });
      return c.json({ success: false, error: result.error || `Erreur SMS ${result.status || ""}`.trim() }, 502);
    }

    const logId = await writeSmsLog({
      phone_number: normalized,
      to: normalized,
      message: String(message).slice(0, 500),
      type: typeLabel,
      status: normalizeStatus(result.statut, "pending"),
      success: true,
      reference: result.reference || null,
      sent_at: nowIso(),
    });

    console.log("✅ [SMS/SEND] SMS accepté par EJ SMS pour", normalized, "type:", typeLabel);
    return c.json({
      success: true,
      provider: "ejsms",
      messageId: logId,
      reference: result.reference || null,
      status: result.statut || "PENDING",
    });
  } catch (error) {
    console.error("❌ [SMS/SEND] Erreur inattendue:", error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : "Erreur lors de l'envoi du SMS",
    }, 500);
  }
});

// ─── GET /balance — Solde de crédits EJ SMS ──────────────────────────────────

app.get("/balance", async (c) => {
  try {
    const auth = await requireAdmin(c);
    if (!auth.ok) return auth.response;

    const result = await getEjSmsBalance();

    if (!result.ok) {
      return c.json({
        success: false,
        provider: "ejsms",
        error: result.error || "Solde EJ SMS indisponible",
      }, result.status && result.status >= 400 ? 502 : 503);
    }

    return c.json({
      success: true,
      provider: "ejsms",
      balance: result.credits ?? 0,
      credits: result.credits ?? 0,
      currency: "credits",
      status: result.statut || null,
      dateUpdate: result.dateUpdate || null,
    });
  } catch (error) {
    console.error("❌ [SMS/BALANCE] Erreur:", error);
    return c.json({ success: false, provider: "ejsms", error: "Erreur serveur" }, 500);
  }
});

// ─── GET /logs — Historique des envois (admin) ───────────────────────────────

app.get("/logs", async (c) => {
  try {
    const auth = await requireAdmin(c);
    if (!auth.ok) return auth.response;

    const logs = await kvGetByPrefix<any>(SMS_LOG_PREFIX);

    const sorted = (logs || [])
      .filter(Boolean)
      .sort((a: any, b: any) => {
        const da = new Date(a.sent_at || a.created_at || 0).getTime();
        const db = new Date(b.sent_at || b.created_at || 0).getTime();
        return db - da;
      })
      .slice(0, 100);

    return c.json({ success: true, logs: sorted });
  } catch (error) {
    console.error("❌ [SMS/LOGS] Erreur:", error);
    return c.json({ success: false, error: "Erreur serveur", logs: [] }, 500);
  }
});

// ─── POST /test — SMS de test (admin) ────────────────────────────────────────

app.post("/test", async (c) => {
  try {
    const auth = await requireAdmin(c);
    if (!auth.ok) return auth.response;

    const body = await c.req.json().catch(() => ({}));    const destination = body.phoneNumber || body.to;
    const message = body.message || "SmartCabb : SMS de test EJ SMS. Si vous recevez ce message, la configuration est correcte.";

    if (!destination) {
      return c.json({ success: false, error: "Numéro requis (phoneNumber)" }, 400);
    }

    const normalized = normalizePhoneNumber(destination);
    if (!normalized || !isValidPhoneNumber(normalized)) {
      return c.json({ success: false, error: "Numéro invalide. Format attendu : +243XXXXXXXXX" }, 400);
    }

    const result = await sendEjSms({ to: normalized, message });

    if (!result.ok) {
      return c.json({
        success: false,
        provider: "ejsms",
        error: result.error || "Échec de l'envoi du SMS de test",
      }, 502);
    }

    const logId = await writeSmsLog({
      phone_number: normalized,
      to: normalized,
      message: String(message).slice(0, 500),
      type: "test",
      status: normalizeStatus(result.statut, "pending"),
      success: true,
      reference: result.reference || null,
      sent_at: nowIso(),
    });

    return c.json({
      success: true,
      provider: "ejsms",
      messageId: logId,
      reference: result.reference || null,
      status: result.statut || "PENDING",
    });
  } catch (error) {
    console.error("❌ [SMS/TEST] Erreur:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

// ─── POST /dlr — Accusés de réception signés (EJ SMS) ────────────────────────

app.post("/dlr", async (c) => {
  let rawBody = "";

  try {
    // ⚠️ Le HMAC se calcule sur le corps BRUT, avant toute re-sérialisation JSON.
    rawBody = await c.req.text();

    const signature =
      c.req.header("X-EJSms-Signature") ||
      c.req.header("x-ejsms-signature") ||
      null;
    const eventType = c.req.header("X-EJSms-Event") || c.req.header("x-ejsms-event") || "";

    const valid = await verifyEjSmsSignature(rawBody, signature);
    if (!valid) {
      console.warn("⚠️ [SMS/DLR] Signature invalide ou secret webhook absent");
      return c.json({ success: false, error: "Signature invalide" }, 401);
    }

    let payload: any = null;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      payload = null;
    }

    const reference =
      payload?.reference ||
      payload?.smsReference ||
      payload?.id ||
      null;
    const status = normalizeStatus(
      payload?.statut || payload?.status || null,
      eventType,
    );

    if (reference) {
      const key = `${SMS_LOG_PREFIX}${reference}`;
      const existing = await kvGet<any>(key).catch(() => null);

      if (existing) {
        await kvSet(key, {
          ...existing,
          status,
          success: status !== "FAILED",
          delivered_at:
            status === "DELIVERED"
              ? nowIso()
              : existing.delivered_at || null,
          updated_at: nowIso(),
          dlr: payload,
        }).catch((e) => console.error("❌ [SMS/DLR] Mise à jour log:", e));
      } else {
        // Callback reçu sans log local : on conserve la trace pour audit.
        await kvSet(`sms_dlr:${reference}`, {
          ...payload,
          reference,
          status,
          event: eventType,
          received_at: nowIso(),
        }).catch((e) => console.error("❌ [SMS/DLR] Écriture audit:", e));
      }
    }

    console.log(`✅ [SMS/DLR] ${eventType || "dlr"} → ${reference || "(sans référence)"} : ${status}`);

    // Réponse 200 rapide (< 10 s), sinon EJ SMS réessaie.
    return c.json({ success: true });
  } catch (error) {
    console.error("❌ [SMS/DLR] Erreur:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

export default app;
