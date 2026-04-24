/**
 * ⚙️ ROUTES CONFIGURATION GLOBALE - SMARTCABB
 * GET  /config/get    — Lire la config globale
 * POST /config/update — Sauvegarder la config (admin)
 * @version 1.0.0
 */

import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js@2";

const app = new Hono();

const KV_TABLE   = "kv_store_2eb02e52";
const CONFIG_KEY = "smartcabb_global_config";

// ─── KV helpers inlinés ───────────────────────────────────────────────────────

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
  } catch (e) { console.error("KV get exception:", e); return null; }
}

async function kvSet(key: string, value: any): Promise<void> {
  try {
    const { error } = await kvClient().from(KV_TABLE).upsert({ key, value });
    if (error) throw new Error(error.message);
  } catch (e) { console.error("KV set error:", key, e); throw e; }
}

// ─── Config par défaut ────────────────────────────────────────────────────────

const DEFAULT_CONFIG = {
  exchangeRate:           2800,
  commissionRate:         10,
  nightTimeStart:         "21:00",
  nightTimeEnd:           "06:00",
  freeWaitingMinutes:     10,
  distantZoneMultiplier:  2,
  postpaidEnabled:        true,
  postpaidFee:            5000,
  flutterwaveEnabled:     true,
  smsEnabled:             true,
  smsProvider:            "africas_talking",
  notificationsEnabled:   true,
  appVersion:             "1.0.0",
  maintenanceMode:        false,
  lastUpdated:            new Date().toISOString(),
};

// ─── GET /get — Lire la configuration globale ─────────────────────────────────
app.get("/get", async (c) => {
  try {
    console.log("⚙️ [CONFIG/GET] Lecture de la configuration...");
    const stored = await kvGet(CONFIG_KEY);

    if (stored) {
      console.log("✅ [CONFIG/GET] Config chargée depuis le KV");
      return c.json({ success: true, config: stored });
    }

    // Première utilisation : sauvegarder les valeurs par défaut
    console.log("ℹ️ [CONFIG/GET] Aucune config trouvée, utilisation des valeurs par défaut");
    await kvSet(CONFIG_KEY, DEFAULT_CONFIG);
    return c.json({ success: true, config: DEFAULT_CONFIG });
  } catch (error) {
    console.error("❌ [CONFIG/GET] Erreur:", error);
    // En cas d'erreur, renvoyer quand même les valeurs par défaut pour ne pas bloquer l'app
    return c.json({ success: true, config: DEFAULT_CONFIG });
  }
});

// ─── POST /update — Sauvegarder la configuration (admin) ─────────────────────
app.post("/update", async (c) => {
  try {
    const { config } = await c.req.json();
    if (!config || typeof config !== "object") {
      return c.json({ success: false, error: "Payload config invalide" }, 400);
    }

    console.log("⚙️ [CONFIG/UPDATE] Mise à jour de la configuration...");

    const existing = await kvGet(CONFIG_KEY) ?? DEFAULT_CONFIG;
    const merged = {
      ...existing,
      ...config,
      lastUpdated: new Date().toISOString(),
    };

    await kvSet(CONFIG_KEY, merged);

    console.log("✅ [CONFIG/UPDATE] Configuration sauvegardée");
    return c.json({ success: true, config: merged });
  } catch (error) {
    console.error("❌ [CONFIG/UPDATE] Erreur:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

export default app;
