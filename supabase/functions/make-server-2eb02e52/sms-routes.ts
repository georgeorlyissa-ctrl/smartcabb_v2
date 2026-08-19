/**
 * 📱 ROUTES SMS - SMARTCABB
 * POST /sms/send   — Envoyer un SMS via Africa's Talking (appelé par le client)
 * GET  /sms/config — Config SMS (provider, enabled)
 * GET  /sms/balance — Solde du compte Africa's Talking
 * @version 1.0.0
 */

import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js@2";
import { normalizePhoneNumber, isValidPhoneNumber } from "./phone-utils.ts";

const app = new Hono();

const KV_TABLE = "kv_store_2eb02e52";
const CONFIG_KEY = "smartcabb_global_config";

function kvClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );
}

async function kvGet(key: string): Promise<any> {
  try {
    const { data, error } = await kvClient()
      .from(KV_TABLE).select("value").eq("key", key).maybeSingle();
    if (error) { console.error("KV get error:", key, error.message); return null; }
    return data?.value ?? null;
  } catch (e) { console.error("KV get exception:", key, e); return null; }
}

// ─── GET /config — Configuration SMS ──────────────────────────────────────────

app.get("/config", async (c) => {
  try {
    const stored = await kvGet(CONFIG_KEY);
    return c.json({
      provider: stored?.smsProvider || "africas-talking",
      enabled: stored?.smsEnabled !== false,
    });
  } catch (error) {
    console.error("❌ [SMS/CONFIG] Erreur:", error);
    return c.json({ provider: "africas-talking", enabled: false });
  }
});

// ─── POST /send — Envoyer un SMS ──────────────────────────────────────────────

app.post("/send", async (c) => {
  try {
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

    const stored = await kvGet(CONFIG_KEY);
    if (stored?.smsEnabled === false) {
      console.warn("⚠️ [SMS/SEND] SMS désactivés dans la config, envoi ignoré");
      return c.json({ success: true, skipped: true, reason: "sms_disabled" });
    }

    const username = Deno.env.get("AFRICAS_TALKING_USERNAME") || "";
    const apiKey = Deno.env.get("AFRICAS_TALKING_API_KEY") || "";
    if (!username || !apiKey) {
      console.error("❌ [SMS/SEND] Env Africa's Talking manquantes");
      return c.json({ success: false, error: "SMS non configuré côté serveur" }, 500);
    }

    const form = new URLSearchParams({ username, to: normalized, message });
    const response = await fetch("https://api.africastalking.com/version1/messaging", {
      method: "POST",
      headers: {
        apiKey,
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    });

    const data = await response.json().catch(() => null);
    const recipient = data?.SMSMessageData?.Recipients?.[0];

    if (!response.ok || recipient?.status !== "Success") {
      console.error("❌ [SMS/SEND] Erreur Africa's Talking:", response.status, data);
      return c.json({
        success: false,
        error: recipient?.status || data?.message || `Erreur SMS ${response.status}`,
      }, 502);
    }

    console.log("✅ [SMS/SEND] SMS envoyé à", normalized, "type:", type || "generic");
    return c.json({ success: true, messageId: recipient?.messageId || null });
  } catch (error) {
    console.error("❌ [SMS/SEND] Erreur inattendue:", error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : "Erreur lors de l'envoi du SMS",
    }, 500);
  }
});

// ─── GET /balance — Solde Africa's Talking ────────────────────────────────────

app.get("/balance", async (c) => {
  try {
    const username = Deno.env.get("AFRICAS_TALKING_USERNAME") || "";
    const apiKey = Deno.env.get("AFRICAS_TALKING_API_KEY") || "";

    if (!username || !apiKey) {
      return c.json({ success: false, error: "Africa's Talking non configuré" }, 404);
    }

    const response = await fetch(
      `https://api.africastalking.com/version1/user?username=${encodeURIComponent(username)}`,
      { headers: { apiKey, Accept: "application/json" } }
    );
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return c.json({ success: false, error: `Erreur API: ${response.status}` }, 502);
    }

    return c.json({ success: true, balance: data?.UserData?.balance || "0" });
  } catch (error) {
    console.error("❌ [SMS/BALANCE] Erreur:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

export default app;