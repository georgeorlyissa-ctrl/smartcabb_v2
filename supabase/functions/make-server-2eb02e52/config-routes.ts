/**
 * ⚙️ ROUTES CONFIGURATION GLOBALE - SMARTCABB
 * GET  /config/get    — Lire la config globale
 * POST /config/update — Sauvegarder la config (admin)
 * @version 1.0.0
 */

import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js@2";
import { requireAdmin } from "./auth-guard.ts";

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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Lecture STRICTE de la configuration.
 *
 * ⚠️ Indispensable : `kvGet` renvoie `null` aussi bien quand la clé est absente
 * que quand la base est momentanément indisponible. Le code confondait les deux
 * et **réécrivait la configuration avec les valeurs par défaut** (taux de
 * change 2500 au lieu du taux réel, `configVersion` remis à 1). C'est la cause
 * du taux qui « change tout seul » dans le panneau admin.
 *
 * Lève une erreur si la lecture échoue après plusieurs tentatives : l'appelant
 * répond alors 503 et **n'écrit rien**.
 */
async function kvGetStrict(key: string): Promise<any | null> {
  let lastError = "";
  for (const delay of [0, 250, 800]) {
    if (delay) await sleep(delay);
    try {
      const { data, error } = await kvClient()
        .from(KV_TABLE).select("value").eq("key", key).maybeSingle();
      if (!error) return data?.value ?? null;
      lastError = error.message;
    } catch (e: any) {
      lastError = String(e?.message || e);
    }
  }
  throw new Error(`KV get ${key}: ${lastError}`);
}

async function kvSet(key: string, value: any): Promise<void> {
  try {
    const { error } = await kvClient().from(KV_TABLE).upsert({ key, value });
    if (error) throw new Error(error.message);
  } catch (e) { console.error("KV set error:", key, e); throw e; }
}

// ─── Config par défaut ────────────────────────────────────────────────────────

const DEFAULT_CONFIG = {
  exchangeRate:           2500,
  // Commission : 15 % sur une course instantanée, 20 % sur une réservation.
  commissionRate:         15,
  reservationCommissionRate: 20,
  nightTimeStart:         "21:00",
  nightTimeEnd:           "06:00",
  freeWaitingMinutes:     3,
  distantZoneMultiplier:  2,
  postpaidEnabled:        true,
  postpaidFee:            5000,
  smsEnabled:             true,
  smsProvider:            "ejsms",
  // 🚨 SOS : numéros d'urgence affichés dans l'app et notification SMS du support
  emergencyNumbers:       { police: "112", ambulance: "115", support: "", supportTech: "" },
  emergencySmsEnabled:    false,
  otpRequired:            false,
  admin2faRequired:       true,
  notificationsEnabled:   true,
  appVersion:             "1.0.0",
  maintenanceMode:        false,
  lastUpdated:            new Date().toISOString(),
};

// ─── GET /get — Lire la configuration globale ─────────────────────────────────
app.get("/get", async (c) => {
  try {
    console.log("⚙️ [CONFIG/GET] Lecture de la configuration...");

    let stored: any;
    try {
      stored = await kvGetStrict(CONFIG_KEY);
    } catch (e) {
      // ⛔ Ne JAMAIS écrire les valeurs par défaut ici : cela écraserait le vrai
      // taux de change. Le client garde son cache et réessaiera.
      console.error("❌ [CONFIG/GET] Lecture impossible (aucune écriture):", e);
      return c.json({ success: false, error: "CONFIG_UNAVAILABLE", retry: true }, 503);
    }

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

      // Compléter les clés manquantes avec les valeurs par défaut (rétrocompatibilité)
      const completed: Record<string, any> = { ...DEFAULT_CONFIG, ...stored };
      // EJ SMS est l'unique fournisseur : on normalise les anciennes valeurs.
      if (completed.smsProvider !== "disabled") completed.smsProvider = "ejsms";
      if (Object.keys(completed).length !== Object.keys(stored).length) {
        await kvSet(CONFIG_KEY, completed);
        console.log("🧹 [CONFIG/GET] Config complétée avec les valeurs par défaut");
      }
      return c.json({ success: true, config: completed });
    }

    // Première utilisation : sauvegarder les valeurs par défaut
    console.log("ℹ️ [CONFIG/GET] Aucune config trouvée, utilisation des valeurs par défaut");
    await kvSet(CONFIG_KEY, DEFAULT_CONFIG);
    return c.json({ success: true, config: DEFAULT_CONFIG });
  } catch (error) {
    console.error("❌ [CONFIG/GET] Erreur:", error);
    // Ne jamais renvoyer des valeurs par défaut comme si c'était la config
    // réelle : les clients les mettraient en cache puis les sauvegarderaient.
    return c.json({ success: false, error: "CONFIG_UNAVAILABLE", retry: true }, 503);
  }
});

// ─── POST /update — Sauvegarder la configuration (admin) ─────────────────────
app.post("/update", async (c) => {
  try {
    // 🔒 Réservé aux administrateurs (session + rôle admin + 2FA serveur).
    const auth = await requireAdmin(c);
    if (!auth.ok) return auth.response;

    const { config } = await c.req.json();
    if (!config || typeof config !== "object") {
      return c.json({ success: false, error: "Payload config invalide" }, 400);
    }

    console.log("⚙️ [CONFIG/UPDATE] Mise à jour de la configuration...");

    // Lecture STRICTE : si la base est indisponible, on refuse la sauvegarde
    // au lieu de repartir des valeurs par défaut (ce qui écrasait le taux).
    let existing: any;
    try {
      existing = await kvGetStrict(CONFIG_KEY);
    } catch (e) {
      console.error("❌ [CONFIG/UPDATE] Lecture impossible (aucune écriture):", e);
      return c.json({ success: false, error: "CONFIG_UNAVAILABLE", retry: true }, 503);
    }
    const base = (existing && typeof existing === "object") ? existing : DEFAULT_CONFIG;

    // Les valeurs numériques critiques ne doivent jamais être écrasées par un
    // `undefined`/`NaN`/0 envoyé par un écran mal initialisé.
    const safeNumber = (value: any, fallback: number): number => {
      const n = typeof value === "number" ? value : Number(value);
      return Number.isFinite(n) && n > 0 ? n : fallback;
    };

    const merged = {
      ...base,
      ...config,
      exchangeRate: safeNumber(config.exchangeRate, safeNumber(base.exchangeRate, DEFAULT_CONFIG.exchangeRate)),
      commissionRate: safeNumber(config.commissionRate, safeNumber(base.commissionRate, DEFAULT_CONFIG.commissionRate)),
      reservationCommissionRate: safeNumber(
        config.reservationCommissionRate,
        safeNumber(base.reservationCommissionRate, DEFAULT_CONFIG.reservationCommissionRate),
      ),
      // Version TOUJOURS croissante (elle repartait à 1 quand la config avait
      // été réécrite par les valeurs par défaut).
      configVersion: Math.max(
        Number(base.configVersion) || 0,
        Number(config.configVersion) || 0,
      ) + 1,
      lastUpdated: new Date().toISOString(),
    };

    // 🛡️ Sécurité SOS : un client qui pousse une configuration partielle ou
    // obsolète (taux de change, réglages par défaut) ne doit jamais effacer
    // les numéros de support ni couper les SMS d'urgence.
    const prevEmergency = (base.emergencyNumbers && typeof base.emergencyNumbers === "object")
      ? base.emergencyNumbers as Record<string, unknown>
      : {};
    const nextEmergency = (config.emergencyNumbers && typeof config.emergencyNumbers === "object")
      ? config.emergencyNumbers as Record<string, unknown>
      : {};
    const keepNumber = (key: string, fallback = "") => {
      const incoming = nextEmergency[key];
      if (typeof incoming === "string" && incoming.trim() !== "") return incoming.trim();
      const previous = prevEmergency[key];
      if (typeof previous === "string" && previous.trim() !== "") return previous.trim();
      return fallback;
    };
    merged.emergencyNumbers = {
      ...prevEmergency,
      ...nextEmergency,
      police: keepNumber("police", DEFAULT_CONFIG.emergencyNumbers.police),
      ambulance: keepNumber("ambulance", DEFAULT_CONFIG.emergencyNumbers.ambulance),
      support: keepNumber("support"),
      supportTech: keepNumber("supportTech"),
    };

    const hasNumbers = ["support", "supportTech", "supportBackup"]
      .some((k) => typeof nextEmergency[k] === "string" && String(nextEmergency[k]).trim() !== "");
    if (typeof config.emergencySmsEnabled === "boolean") {
      merged.emergencySmsEnabled = hasNumbers
        ? config.emergencySmsEnabled
        // Payload sans numéro = copie obsolète : on conserve l'état existant.
        : base.emergencySmsEnabled === true;
    } else if (base.emergencySmsEnabled === true) {
      merged.emergencySmsEnabled = true;
    }

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
