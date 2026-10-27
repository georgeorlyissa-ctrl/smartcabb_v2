/**
 * 📲 ROUTES VERSION APP - SMARTCABB
 * Auto-update APK : le client interroge GET /app/version au démarrage
 * et affiche une invitation à télécharger le nouvel APK si une version
 * plus récente est disponible.
 *
 * @version 1.0.0
 */

import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js@2";

const app = new Hono();

// ─── Table KV ────────────────────────────────────────────────────────────────
const KV_TABLE = "kv_store_2eb02e52";
const VERSION_KEY = "app:version";

// Secret pour la mise à jour de la version (header `x-update-key`)
// ⚠️ Configuré dans Supabase → Settings → Edge Functions → Secrets (APK_UPDATE_SECRET).
// Ne JAMAIS remettre de valeur en dur ici : le repo GitHub est public.
const UPDATE_SECRET = (Deno.env.get("APK_UPDATE_SECRET") ?? "").trim();

// Préfixes autorisés pour le fichier APK. Empêche de pointer les utilisateurs
// vers un binaire hébergé sur un autre serveur, même si le secret fuit.
const APK_URL_PREFIXES = [
  "https://zaerjqchzqmcxqblkfkg.supabase.co/storage/v1/object/public/apk/",
  "https://www.smartcabb.com/",
  "https://smartcabb.com/",
];

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

async function kvSet(key: string, value: any): Promise<void> {
  try {
    const { error } = await kvClient().from(KV_TABLE).upsert({ key, value });
    if (error) throw new Error(error.message);
  } catch (e) { console.error("KV set error:", key, e); throw e; }
}

// ─── Valeurs par défaut (utilisées si KV vide) ───────────────────────────────
const DEFAULT_VERSION = {
  version: "1.0.0",
  versionCode: 3,
  apkUrl: "",
  message: "Nouvelle version SmartCabb disponible",
  force: false,
};

// ═════════════════════════════════════════════════════════════════════════════
// GET /version — informations de mise à jour (PUBLIC — appelé par l'app)
// ═════════════════════════════════════════════════════════════════════════════
app.get("/version", async (c) => {
  try {
    const stored = await kvGet(VERSION_KEY);
    const config = { ...DEFAULT_VERSION, ...(stored || {}) };
    return c.json({ success: true, ...config });
  } catch (error: any) {
    console.error("❌ Erreur GET /app/version:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// POST /version — mise à jour des informations (protégé par x-update-key)
// Body : { version, versionCode?, apkUrl, message?, force? }
// ═════════════════════════════════════════════════════════════════════════════
app.post("/version", async (c) => {
  try {
    // Refus sécurisé : route fermée tant que le secret n'est pas configuré côté Supabase
    if (!UPDATE_SECRET) {
      console.error("❌ APK_UPDATE_SECRET non configuré - mise à jour de version refusée");
      return c.json({ success: false, error: "Mise à jour désactivée" }, 503);
    }

    const key = (c.req.header("x-update-key") ?? "").trim();
    if (key !== UPDATE_SECRET) {
      return c.json({ success: false, error: "Accès refusé" }, 401);
    }

    const body = await c.req.json();
    if (!body?.version || typeof body.version !== "string") {
      return c.json({ success: false, error: "Champ version requis" }, 400);
    }
    if (body.version.length > 20) {
      return c.json({ success: false, error: "Version invalide" }, 400);
    }
    if (body.versionCode !== undefined && (!Number.isInteger(body.versionCode) || body.versionCode < 0)) {
      return c.json({ success: false, error: "versionCode invalide" }, 400);
    }
    if (body.message !== undefined && (typeof body.message !== "string" || body.message.length > 300)) {
      return c.json({ success: false, error: "Message invalide" }, 400);
    }
    if (body.apkUrl !== undefined) {
      const url = typeof body.apkUrl === "string" ? body.apkUrl.trim() : "";
      if (!url || !APK_URL_PREFIXES.some((prefix) => url.startsWith(prefix))) {
        return c.json({ success: false, error: "apkUrl non autorisé" }, 400);
      }
    }

    const current = (await kvGet(VERSION_KEY)) || DEFAULT_VERSION;
    const next = {
      ...current,
      ...body,
      updatedAt: new Date().toISOString(),
    };

    await kvSet(VERSION_KEY, next);
    console.log("✅ Version app mise à jour:", next.version);
    return c.json({ success: true, config: next });
  } catch (error: any) {
    console.error("❌ Erreur POST /app/version:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

export default app;