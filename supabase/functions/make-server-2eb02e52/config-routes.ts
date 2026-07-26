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
  freeWaitingMinutes:     3,
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
      // Nettoyer les clés numériques qui auraient pu s'accumuler (bug data)
      if (typeof stored === "object" && !Array.isArray(stored)) {
        const cleaned: Record<string, any> = {};
        for (const k of Object.keys(stored)) {
          if (!/^\d+$/.test(k)) cleaned[k] = stored[k];
        }
        if (Object.keys(cleaned).length !== Object.keys(stored).length) {
          await kvSet(CONFIG_KEY, cleaned);
          console.log("🧹 [CONFIG/GET] Nettoyage des clés numériques dans la config stockée");
        }
      }
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
      configVersion: ((existing.configVersion || 0) as number) + 1,
    };

    await kvSet(CONFIG_KEY, merged);

    // ─── Log the config change as an event so all apps can detect it ─────────
    const eventId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const today   = new Date().toISOString().slice(0, 10);
    // Nettoyer changedKeys : garder uniquement les clés nommées (ignorer les indices numériques)
    const changedKeys = Object.keys(config).filter(k => !/^\d+$/.test(k));
    await kvSet(`event:${today}:${eventId}`, {
      id:        eventId,
      type:      "config_updated",
      data:      { changedKeys, configVersion: merged.configVersion },
      actor:     "admin",
      timestamp: merged.lastUpdated,
    });

    console.log(`✅ [CONFIG/UPDATE] Configuration v${merged.configVersion} sauvegardée`);
    return c.json({ success: true, config: merged });
  } catch (error) {
    console.error("❌ [CONFIG/UPDATE] Erreur:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

// ─── GET /version — Version légère pour polling cross-app ────────────────────
app.get("/version", async (c) => {
  try {
    const stored = await kvGet(CONFIG_KEY);
    return c.json({
      success:       true,
      lastUpdated:   stored?.lastUpdated   ?? null,
      configVersion: stored?.configVersion ?? 0,
    });
  } catch (error) {
    console.error("❌ [CONFIG/VERSION] Erreur:", error);
    return c.json({ success: false, lastUpdated: null, configVersion: 0 }, 500);
  }
});

// ─── GET /google-maps-key — Clé API Maps JavaScript (frontend) ───────────────
app.get("/google-maps-key", async (c) => {
  try {
    // On expose uniquement la clé Maps JavaScript (clé navigateur, restriction par HTTP referrer)
    const apiKey =
      Deno.env.get("GOOGLE_MAPS_API_KEY") ||
      Deno.env.get("GOOGLE_MAPS_SERVER_API_KEY") ||
      "";

    if (!apiKey) {
      console.warn("⚠️ [CONFIG/MAPS-KEY] Aucune clé Google Maps configurée");
      return c.json({ success: false, error: "Clé API non configurée" }, 404);
    }

    console.log("✅ [CONFIG/MAPS-KEY] Clé Maps renvoyée au frontend");
    return c.json({ success: true, apiKey });
  } catch (error) {
    console.error("❌ [CONFIG/MAPS-KEY] Erreur:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

export default app;
