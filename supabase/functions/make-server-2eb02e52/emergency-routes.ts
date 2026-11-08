/**
 * 🚨 ROUTES SOS / URGENCES - SMARTCABB
 *
 * GET  /emergency/config        — Numéros d'urgence configurés
 * POST /emergency/sos           — Déclencher une alerte (passager ou conducteur)
 * POST /emergency/:id/cancel    — Annuler sa propre alerte
 * POST /emergency/:id/ack       — Acquitter une alerte (admin)
 * POST /emergency/:id/resolve   — Clore une alerte (admin)
 * GET  /emergency/alerts        — Lister les alertes (admin)
 * GET  /emergency/active        — Alertes en cours (admin)
 *
 * L'Edge Function est déployée en `verify_jwt = false` : chaque route vérifie
 * elle-même le porteur du jeton et applique ses propres limites.
 *
 * @version 1.0.0
 */

import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js@2";
import { get as kvGet, set as kvSet } from "./kv-wrapper.ts";
import { sendEjSms } from "./ej-sms-core.ts";

const app = new Hono();

const CONFIG_KEY = "smartcabb_global_config";
const TABLE = "emergency_alerts";
const ALERT_TYPES = ["medical", "security", "accident", "harassment"];

const DEFAULT_EMERGENCY_NUMBERS = {
  police: "112",
  ambulance: "115",
  support: "",
};

// ─── Helpers Supabase ─────────────────────────────────────────────────────────

function serviceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
}

// ─── Authentification ─────────────────────────────────────────────────────────

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

function isAnonKey(token: string): boolean {
  const anon = Deno.env.get("SUPABASE_ANON_KEY") || "";
  return Boolean(anon) && safeEqual(token, anon);
}

async function getSessionUser(token: string): Promise<any | null> {
  if (!token) return null;
  try {
    const { data, error } = await serviceClient().auth.getUser(token);
    if (error || !data?.user) return null;
    return data.user;
  } catch (e) {
    console.error("❌ [EMERGENCY/AUTH] Erreur vérification jeton:", e instanceof Error ? e.message : e);
    return null;
  }
}

/**
 * Accepte l'application (anon key) ou une session utilisateur.
 * Retourne l'utilisateur vérifié s'il y en a un.
 */
async function resolveCaller(
  c: any,
): Promise<{ ok: true; user: any | null } | { ok: false; response: Response }> {
  const token = bearerToken(c);
  if (!token) {
    return { ok: false, response: c.json({ success: false, error: "Authentification requise" }, 401) };
  }
  if (isAnonKey(token)) return { ok: true, user: null };

  const user = await getSessionUser(token);
  if (!user) {
    return { ok: false, response: c.json({ success: false, error: "Session invalide ou expirée" }, 401) };
  }
  return { ok: true, user };
}

async function requireAdmin(
  c: any,
): Promise<{ ok: true; user: any } | { ok: false; response: Response }> {
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
  return { ok: true, user };
}

// ─── Limitation de débit ──────────────────────────────────────────────────────

const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_PER_USER = 3;
const RATE_PER_IP = 10;
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

// ─── Configuration ────────────────────────────────────────────────────────────

async function readEmergencyConfig(): Promise<{
  numbers: { police: string; ambulance: string; support: string };
  smsEnabled: boolean;
}> {
  const stored = (await kvGet<any>(CONFIG_KEY)) || {};
  const numbers = {
    ...DEFAULT_EMERGENCY_NUMBERS,
    ...(stored.emergencyNumbers && typeof stored.emergencyNumbers === "object"
      ? stored.emergencyNumbers
      : {}),
  };
  return {
    numbers,
    smsEnabled: stored.emergencySmsEnabled === true,
  };
}

// ─── GET /config — Numéros d'urgence ─────────────────────────────────────────

app.get("/config", async (c) => {
  try {
    const auth = await resolveCaller(c);
    if (!auth.ok) return auth.response;

    const { numbers } = await readEmergencyConfig();
    return c.json({
      success: true,
      numbers,
      // Le support est le seul numéro interne utile côté app.
      hasSupport: Boolean(numbers.support),
    });
  } catch (error) {
    console.error("❌ [EMERGENCY/CONFIG] Erreur:", error);
    return c.json({ success: true, numbers: DEFAULT_EMERGENCY_NUMBERS, hasSupport: false });
  }
});

// ─── POST /sos — Déclencher une alerte ────────────────────────────────────────

app.post("/sos", async (c) => {
  try {
    const auth = await resolveCaller(c);
    if (!auth.ok) return auth.response;

    const body = await c.req.json().catch(() => ({}));

    // Identité : la session vérifiée prime toujours sur le corps de la requête.
    const userId = String(auth.user?.id || body.userId || "").trim();
    if (!userId) {
      return c.json({ success: false, error: "Utilisateur non identifié" }, 400);
    }

    const role = body.role === "driver" ? "driver" : "passenger";
    const type = ALERT_TYPES.includes(String(body.type)) ? String(body.type) : "security";

    const ip = clientIp(c);
    if (!checkRateLimit(`ip:${ip}`, RATE_PER_IP)) {
      console.warn("⚠️ [EMERGENCY/SOS] Limite par IP atteinte:", ip);
      return c.json({ success: false, error: "Trop d'alertes envoyées. Appelez directement les secours." }, 429);
    }
    if (!checkRateLimit(`user:${userId}`, RATE_PER_USER)) {
      console.warn("⚠️ [EMERGENCY/SOS] Limite par utilisateur atteinte:", userId);
      return c.json({ success: false, error: "Trop d'alertes envoyées. Appelez directement les secours." }, 429);
    }

    const supabase = serviceClient();

    // Anti-doublon : une alerte active de moins de 90 s est renvoyée telle quelle.
    const since = new Date(Date.now() - 90_000).toISOString();
    const { data: existing } = await supabase
      .from(TABLE)
      .select("*")
      .eq("user_id", userId)
      .eq("status", "active")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      console.log("ℹ️ [EMERGENCY/SOS] Alerte récente réutilisée:", existing.id);
      return c.json({ success: true, alert: existing, deduplicated: true });
    }

    const lat = Number.isFinite(Number(body.lat)) ? Number(body.lat) : null;
    const lng = Number.isFinite(Number(body.lng)) ? Number(body.lng) : null;
    const accuracy = Number.isFinite(Number(body.accuracy)) ? Number(body.accuracy) : null;

    const payload = {
      user_id: userId,
      role,
      user_name: body.userName ? String(body.userName).slice(0, 120) : null,
      user_phone: body.userPhone ? String(body.userPhone).slice(0, 32) : null,
      ride_id: body.rideId ? String(body.rideId).slice(0, 80) : null,
      type,
      status: "active",
      lat,
      lng,
      accuracy,
      address: body.address ? String(body.address).slice(0, 250) : null,
      note: body.note ? String(body.note).slice(0, 500) : null,
      vehicle_info: body.vehicleInfo ? String(body.vehicleInfo).slice(0, 160) : null,
      counterpart_name: body.counterpartName ? String(body.counterpartName).slice(0, 120) : null,
      counterpart_phone: body.counterpartPhone ? String(body.counterpartPhone).slice(0, 32) : null,
      metadata: {
        source: body.source || "mobile",
        locationSource: body.locationSource || (lat !== null ? "gps" : "unavailable"),
        sessionVerified: Boolean(auth.user),
        userAgent: (c.req.header("user-agent") || "").slice(0, 200),
        ip,
      },
    };

    const { data: alert, error: insertError } = await supabase
      .from(TABLE)
      .insert(payload)
      .select()
      .single();

    if (insertError || !alert) {
      console.error("❌ [EMERGENCY/SOS] Insertion impossible:", insertError);
      return c.json({ success: false, error: "Alerte non enregistrée" }, 500);
    }

    console.log("🚨 [EMERGENCY/SOS] Alerte créée:", alert.id, "—", role, type);

    // Trace KV (historique / audit même si la base est purgée).
    await kvSet(`emergency:${alert.id}`, {
      id: alert.id,
      user_id: userId,
      role,
      type,
      status: "active",
      ride_id: payload.ride_id,
      created_at: alert.created_at,
    }).catch(() => undefined);

    // Notification de l'équipe sécurité : SMS uniquement si activé et si un
    // numéro de support est configuré (évite de consommer des crédits à vide).
    const { numbers, smsEnabled } = await readEmergencyConfig();
    let smsNotified = false;
    let smsError: string | null = null;

    if (smsEnabled && numbers.support) {
      const place = lat !== null && lng !== null ? `${lat.toFixed(5)},${lng.toFixed(5)}` : "position inconnue";
      const who = payload.user_name || (role === "driver" ? "Conducteur" : "Passager");
      const message =
        `SOS SMARTCABB ${who} (${role}) - ${type}. ${place}` +
        (payload.ride_id ? ` Course ${String(payload.ride_id).slice(0, 12)}` : "") +
        (payload.user_phone ? ` Tel ${payload.user_phone}` : "");

      const result = await sendEjSms({ to: numbers.support, message: message.slice(0, 320) });
      smsNotified = result.ok;
      if (!result.ok) {
        smsError = result.error || "Envoi SMS impossible";
        console.warn("⚠️ [EMERGENCY/SOS] SMS support non envoyé:", smsError);
      }
    } else if (!numbers.support) {
      console.warn("⚠️ [EMERGENCY/SOS] Aucun numéro de support configuré — pas de SMS");
    }

    return c.json({
      success: true,
      alert,
      notified: { sms: smsNotified, smsError },
    }, 201);
  } catch (error) {
    console.error("❌ [EMERGENCY/SOS] Erreur:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

// ─── POST /:id/cancel — Annuler sa propre alerte ──────────────────────────────

app.post("/:id/cancel", async (c) => {
  try {
    const auth = await resolveCaller(c);
    if (!auth.ok) return auth.response;

    const id = c.req.param("id");
    const body = await c.req.json().catch(() => ({}));
    const userId = String(auth.user?.id || body.userId || "").trim();

    const supabase = serviceClient();
    const { data: alert, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error || !alert) {
      return c.json({ success: false, error: "Alerte introuvable" }, 404);
    }
    if (!userId || alert.user_id !== userId) {
      return c.json({ success: false, error: "Action non autorisée" }, 403);
    }
    if (["cancelled", "resolved", "false_alarm"].includes(alert.status)) {
      return c.json({ success: true, alert, alreadyClosed: true });
    }

    const { data: updated, error: updateError } = await supabase
      .from(TABLE)
      .update({
        status: "cancelled",
        resolved_at: new Date().toISOString(),
        resolution_note: body.reason ? String(body.reason).slice(0, 300) : "Annulée par l'utilisateur",
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("❌ [EMERGENCY/CANCEL] Mise à jour impossible:", updateError);
      return c.json({ success: false, error: "Annulation impossible" }, 500);
    }

    console.log("✅ [EMERGENCY/CANCEL] Alerte annulée:", id);
    return c.json({ success: true, alert: updated });
  } catch (error) {
    console.error("❌ [EMERGENCY/CANCEL] Erreur:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

// ─── POST /:id/ack — Acquitter une alerte (admin) ─────────────────────────────

app.post("/:id/ack", async (c) => {
  try {
    const auth = await requireAdmin(c);
    if (!auth.ok) return auth.response;

    const id = c.req.param("id");
    const supabase = serviceClient();

    const { data: updated, error } = await supabase
      .from(TABLE)
      .update({
        status: "acknowledged",
        ack_by: auth.user.id,
        ack_at: new Date().toISOString(),
      })
      .eq("id", id)
      .in("status", ["active", "acknowledged"])
      .select()
      .maybeSingle();

    if (error) {
      console.error("❌ [EMERGENCY/ACK] Erreur:", error);
      return c.json({ success: false, error: "Acquittement impossible" }, 500);
    }
    if (!updated) {
      return c.json({ success: false, error: "Alerte introuvable ou déjà clôturée" }, 404);
    }

    console.log("👀 [EMERGENCY/ACK] Alerte acquittée:", id, "par", auth.user.id);
    return c.json({ success: true, alert: updated });
  } catch (error) {
    console.error("❌ [EMERGENCY/ACK] Erreur:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

// ─── POST /:id/resolve — Clore une alerte (admin) ─────────────────────────────

app.post("/:id/resolve", async (c) => {
  try {
    const auth = await requireAdmin(c);
    if (!auth.ok) return auth.response;

    const id = c.req.param("id");
    const body = await c.req.json().catch(() => ({}));
    const status = body.status === "false_alarm" ? "false_alarm" : "resolved";

    const supabase = serviceClient();
    const { data: updated, error } = await supabase
      .from(TABLE)
      .update({
        status,
        resolved_by: auth.user.id,
        resolved_at: new Date().toISOString(),
        resolution_note: body.note ? String(body.note).slice(0, 500) : null,
      })
      .eq("id", id)
      .select()
      .maybeSingle();

    if (error) {
      console.error("❌ [EMERGENCY/RESOLVE] Erreur:", error);
      return c.json({ success: false, error: "Clôture impossible" }, 500);
    }
    if (!updated) {
      return c.json({ success: false, error: "Alerte introuvable" }, 404);
    }

    console.log("✅ [EMERGENCY/RESOLVE] Alerte clôturée:", id, "→", status);
    return c.json({ success: true, alert: updated });
  } catch (error) {
    console.error("❌ [EMERGENCY/RESOLVE] Erreur:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

// ─── GET /alerts — Lister les alertes (admin) ────────────────────────────────

app.get("/alerts", async (c) => {
  try {
    const auth = await requireAdmin(c);
    if (!auth.ok) return auth.response;

    const status = c.req.query("status");
    const limitRaw = Number(c.req.query("limit") || 50);
    const limit = Math.min(Math.max(Number.isFinite(limitRaw) ? limitRaw : 50, 1), 200);

    let query = serviceClient()
      .from(TABLE)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) {
      console.error("❌ [EMERGENCY/ALERTS] Erreur:", error);
      return c.json({ success: false, error: "Lecture impossible", alerts: [] }, 500);
    }

    return c.json({ success: true, alerts: data || [] });
  } catch (error) {
    console.error("❌ [EMERGENCY/ALERTS] Erreur:", error);
    return c.json({ success: false, error: "Erreur serveur", alerts: [] }, 500);
  }
});

// ─── GET /active — Alertes en cours (admin) ──────────────────────────────────

app.get("/active", async (c) => {
  try {
    const auth = await requireAdmin(c);
    if (!auth.ok) return auth.response;

    const { data, error } = await serviceClient()
      .from(TABLE)
      .select("*")
      .in("status", ["active", "acknowledged"])
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("❌ [EMERGENCY/ACTIVE] Erreur:", error);
      return c.json({ success: false, error: "Lecture impossible", alerts: [] }, 500);
    }

    return c.json({
      success: true,
      count: (data || []).length,
      alerts: data || [],
    });
  } catch (error) {
    console.error("❌ [EMERGENCY/ACTIVE] Erreur:", error);
    return c.json({ success: false, error: "Erreur serveur", alerts: [] }, 500);
  }
});

export default app;
