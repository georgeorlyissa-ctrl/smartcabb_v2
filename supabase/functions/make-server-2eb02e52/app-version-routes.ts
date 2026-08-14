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
const UPDATE_SECRET = "SmartCabbApk2026!";

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
    const key = c.req.header("x-update-key");
    if (key !== UPDATE_SECRET) {
      return c.json({ success: false, error: "Accès refusé" }, 401);
    }

    const body = await c.req.json();
    if (!body?.version || typeof body.version !== "string") {
      return c.json({ success: false, error: "Champ version requis" }, 400);
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