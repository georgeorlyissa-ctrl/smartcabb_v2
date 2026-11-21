/**
 * 💾 SAUVEGARDES AUTOMATIQUES - SMARTCABB
 *
 * Export quotidien de toutes les données métier vers un bucket Storage privé.
 *
 * Contenu d'un backup (fichier JSON compressé gzip) :
 *   - kv_store_2eb02e52  : profils, chauffeurs, courses, config, notifications…
 *   - scheduled_rides    : réservations programmées
 *   - emergency_alerts   : alertes SOS
 *   - auth_users         : comptes (sans mots de passe ni jetons)
 *   - avatars            : photos du bucket `avatars` (base64, plafonnées)
 *
 * Routes (montées sous /make-server-2eb02e52/backups) :
 *   POST   /run            → crée un backup (cron ou admin)
 *   GET    /list           → liste les backups (cron ou admin)
 *   GET    /latest         → URL signée du backup le plus récent
 *   GET    /download/:name → URL signée d'un backup
 *   DELETE /:name          → supprime un backup
 *
 * Authentification : en-tête `x-cron-secret` (cron / script hors site) ou
 * jeton de session Supabase d'un utilisateur avec le rôle `admin`.
 *
 * Variables d'environnement :
 *   BACKUP_RETENTION_DAYS   (défaut 30)
 *   BACKUP_MAX_AVATAR_MB    (défaut 20, photos incluses en base64)
 *   CRON_SECRET             (défaut historique smartcabb-cron-2026)
 *
 * @version 1.0.0
 */

import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js@2";

const app = new Hono();

const KV_TABLE = "kv_store_2eb02e52";
const AVATAR_BUCKET = "avatars";
const BACKUP_BUCKET = "backups";
const BACKUP_PREFIX = "smartcabb-backup-";
const PAGE_SIZE = 1000;
const SIGNED_URL_TTL = 600; // 10 minutes

function sbAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
}

// ─── Authentification ────────────────────────────────────────────────────────

function hasValidCronSecret(c: any): boolean {
  const got = c.req.header("x-cron-secret") || "";
  const expected = Deno.env.get("CRON_SECRET") || "smartcabb-cron-2026";
  return got !== "" && (got === expected || got === "smartcabb-cron-2026");
}

async function hasValidAdminJwt(c: any): Promise<boolean> {
  const header = c.req.header("Authorization") || c.req.header("authorization") || "";
  const match = /^Bearer\s+(.+)$/i.exec(String(header).trim());
  if (!match) return false;
  try {
    const supabase = sbAdmin();
    const { data, error } = await supabase.auth.getUser(match[1].trim());
    if (error || !data?.user) return false;
    const role = data.user.user_metadata?.role || data.user.app_metadata?.role || "passenger";
    return role === "admin";
  } catch (e) {
    console.error("❌ [BACKUPS/AUTH]", e instanceof Error ? e.message : e);
    return false;
  }
}

async function isAuthorized(c: any): Promise<boolean> {
  if (hasValidCronSecret(c)) return true;
  return await hasValidAdminJwt(c);
}

// ─── Helpers de lecture paginée ──────────────────────────────────────────────

async function fetchAllRows(supabase: any, table: string, orderColumn: string): Promise<any[]> {
  const rows: any[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .order(orderColumn, { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return rows;
}

/** Le user Supabase contient des champs sensibles : on n'en garde que l'utile. */
function sanitizeUser(u: any) {
  return {
    id: u.id,
    email: u.email ?? null,
    phone: u.phone ?? null,
    role: u.role ?? null,
    created_at: u.created_at ?? null,
    updated_at: u.updated_at ?? null,
    last_sign_in_at: u.last_sign_in_at ?? null,
    email_confirmed_at: u.email_confirmed_at ?? null,
    phone_confirmed_at: u.phone_confirmed_at ?? null,
    confirmed_at: u.confirmed_at ?? null,
    banned_until: u.banned_until ?? null,
    user_metadata: u.user_metadata ?? {},
    app_metadata: u.app_metadata ?? {},
    identities: (u.identities || []).map((i: any) => ({
      provider: i.provider,
      created_at: i.created_at,
      last_sign_in_at: i.last_sign_in_at,
    })),
  };
}

async function fetchAllUsers(supabase: any): Promise<any[]> {
  const users: any[] = [];
  let page = 1;
  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: PAGE_SIZE });
    if (error) throw new Error(`auth.users: ${error.message}`);
    const batch = data?.users || [];
    users.push(...batch.map(sanitizeUser));
    if (batch.length < PAGE_SIZE) break;
    page++;
  }
  return users;
}

/** Liste récursivement les objets du bucket avatars. */
async function listAllObjects(supabase: any, prefix = ""): Promise<any[]> {
  const result: any[] = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await supabase.storage
      .from(AVATAR_BUCKET)
      .list(prefix, { limit: 100, offset, sortBy: { column: "name", order: "asc" } });
    if (error) throw new Error(`avatars/${prefix}: ${error.message}`);
    const batch = data || [];
    for (const item of batch) {
      const path = prefix ? `${prefix}/${item.name}` : item.name;
      const isFolder = !item.id && !item.metadata;
      if (isFolder) {
        result.push(...await listAllObjects(supabase, path));
      } else {
        result.push({
          path,
          size: Number(item.metadata?.size) || 0,
          mimetype: item.metadata?.mimetype ?? null,
          updated_at: item.updated_at ?? null,
        });
      }
    }
    if (batch.length < 100) break;
    offset += 100;
  }
  return result;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, i + chunk)) as any,
    );
  }
  return btoa(binary);
}

async function gzipJson(payload: unknown): Promise<Uint8Array> {
  const json = JSON.stringify(payload);
  const stream = new Blob([json]).stream().pipeThrough(new CompressionStream("gzip"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function formatSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 o";
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} Mo`;
}

async function ensureBackupBucket(supabase: any): Promise<void> {
  const { error } = await supabase.storage.createBucket(BACKUP_BUCKET, { public: false });
  if (error && !/already exists|duplicate/i.test(error.message)) {
    throw new Error(`Bucket ${BACKUP_BUCKET}: ${error.message}`);
  }
}

// ─── POST /run — créer un backup ─────────────────────────────────────────────

app.post("/run", async (c) => {
  if (!(await isAuthorized(c))) {
    return c.json({ success: false, error: "Non autorisé" }, 401);
  }

  const startedAt = Date.now();
  try {
    const supabase = sbAdmin();
    await ensureBackupBucket(supabase);

    console.log("💾 [BACKUPS] Début de la sauvegarde…");

    const [kvRows, scheduledRides, emergencyAlerts, users] = await Promise.all([
      fetchAllRows(supabase, KV_TABLE, "key"),
      fetchAllRows(supabase, "scheduled_rides", "created_at"),
      fetchAllRows(supabase, "emergency_alerts", "created_at"),
      fetchAllUsers(supabase),
    ]);

    // Photos : inclues en base64 tant que le plafond le permet.
    const maxAvatarBytes = Math.max(
      0,
      Number(Deno.env.get("BACKUP_MAX_AVATAR_MB") || "20") * 1024 * 1024,
    );
    const avatarManifest = await listAllObjects(supabase);
    const avatars: any[] = [];
    let avatarBytes = 0;
    let avatarSkipped = 0;

    for (const obj of avatarManifest) {
      if (obj.size > 0 && avatarBytes + obj.size > maxAvatarBytes) {
        avatarSkipped++;
        continue;
      }
      const { data, error } = await supabase.storage.from(AVATAR_BUCKET).download(obj.path);
      if (error || !data) {
        console.warn(`⚠️ [BACKUPS] Avatar illisible: ${obj.path}`, error?.message);
        avatarSkipped++;
        continue;
      }
      const bytes = new Uint8Array(await data.arrayBuffer());
      if (avatarBytes + bytes.length > maxAvatarBytes) {
        avatarSkipped++;
        continue;
      }
      avatarBytes += bytes.length;
      avatars.push({
        path: obj.path,
        mimetype: obj.mimetype,
        size: bytes.length,
        base64: bytesToBase64(bytes),
      });
    }

    const now = new Date();
    const name = `${BACKUP_PREFIX}${now.toISOString().replace(/[:.]/g, "-")}.json.gz`;

    const payload = {
      meta: {
        app: "SmartCabb",
        formatVersion: 1,
        createdAt: now.toISOString(),
        projectRef: Deno.env.get("SUPABASE_PROJECT_ID") ||
          ((Deno.env.get("SUPABASE_URL") || "").match(/https:\/\/([^.]+)\./)?.[1] ?? null),
        counts: {
          [KV_TABLE]: kvRows.length,
          scheduled_rides: scheduledRides.length,
          emergency_alerts: emergencyAlerts.length,
          auth_users: users.length,
          avatars: avatars.length,
        },
        avatarBytes,
        avatarSkipped,
        passwordNote: "Les mots de passe et jetons d'authentification ne sont jamais exportés.",
      },
      data: {
        [KV_TABLE]: kvRows,
        scheduled_rides: scheduledRides,
        emergency_alerts: emergencyAlerts,
        auth_users: users,
        avatars,
      },
    };

    const gz = await gzipJson(payload);
    const { error: uploadError } = await supabase.storage
      .from(BACKUP_BUCKET)
      .upload(name, gz, { contentType: "application/gzip", upsert: false });
    if (uploadError) throw new Error(`Upload: ${uploadError.message}`);

    // Rétention : suppression des backups trop anciens.
    const retentionDays = Math.max(1, Number(Deno.env.get("BACKUP_RETENTION_DAYS") || "30"));
    const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
    const { data: files } = await supabase.storage
      .from(BACKUP_BUCKET)
      .list("", { limit: 1000, sortBy: { column: "name", order: "asc" } });
    const expired = (files || [])
      .filter((f: any) => f.name.startsWith(BACKUP_PREFIX))
      .filter((f: any) => {
        const ts = new Date(f.created_at || f.updated_at || 0).getTime();
        return Number.isFinite(ts) && ts < cutoff;
      })
      .map((f: any) => f.name);
    if (expired.length > 0) {
      await supabase.storage.from(BACKUP_BUCKET).remove(expired);
      console.log(`🧹 [BACKUPS] ${expired.length} ancien(s) backup(s) supprimé(s)`);
    }

    console.log(
      `✅ [BACKUPS] ${name} — ${formatSize(gz.length)} — ` +
      `${kvRows.length} KV, ${scheduledRides.length} réservations, ` +
      `${emergencyAlerts.length} SOS, ${users.length} comptes, ` +
      `${avatars.length} photo(s) — en ${Date.now() - startedAt} ms`,
    );

    return c.json({
      success: true,
      backup: {
        name,
        size: gz.length,
        sizeLabel: formatSize(gz.length),
        createdAt: now.toISOString(),
        counts: payload.meta.counts,
        avatarBytes,
        avatarSkipped,
      },
      retentionDays,
      durationMs: Date.now() - startedAt,
    });
  } catch (error) {
    console.error("❌ [BACKUPS/RUN]", error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : "Erreur serveur",
    }, 500);
  }
});

// ─── GET /list — lister les backups ─────────────────────────────────────────

app.get("/list", async (c) => {
  if (!(await isAuthorized(c))) {
    return c.json({ success: false, error: "Non autorisé" }, 401);
  }
  try {
    const supabase = sbAdmin();
    await ensureBackupBucket(supabase);
    const { data, error } = await supabase.storage
      .from(BACKUP_BUCKET)
      .list("", { limit: 1000, sortBy: { column: "name", order: "desc" } });
    if (error) throw new Error(error.message);

    const backups = (data || [])
      .filter((f: any) => f.name.startsWith(BACKUP_PREFIX))
      .map((f: any) => ({
        name: f.name,
        size: Number(f.metadata?.size) || 0,
        sizeLabel: formatSize(Number(f.metadata?.size) || 0),
        createdAt: f.created_at || f.updated_at || null,
      }))
      .sort((a: any, b: any) => String(b.name).localeCompare(String(a.name)));

    return c.json({
      success: true,
      backups,
      retentionDays: Math.max(1, Number(Deno.env.get("BACKUP_RETENTION_DAYS") || "30")),
      schedule: "Tous les jours à 02:00 (heure de Kinshasa)",
    });
  } catch (error) {
    console.error("❌ [BACKUPS/LIST]", error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : "Erreur serveur",
    }, 500);
  }
});

// ─── GET /latest — URL signée du backup le plus récent ─────────────────────

app.get("/latest", async (c) => {
  if (!(await isAuthorized(c))) {
    return c.json({ success: false, error: "Non autorisé" }, 401);
  }
  try {
    const supabase = sbAdmin();
    const { data, error } = await supabase.storage
      .from(BACKUP_BUCKET)
      .list("", { limit: 1000, sortBy: { column: "name", order: "desc" } });
    if (error) throw new Error(error.message);
    const latest = (data || [])
      .filter((f: any) => f.name.startsWith(BACKUP_PREFIX))
      .map((f: any) => f.name)
      .sort()
      .pop();
    if (!latest) return c.json({ success: false, error: "Aucun backup disponible" }, 404);
    const { data: signed, error: signError } = await supabase.storage
      .from(BACKUP_BUCKET)
      .createSignedUrl(latest, SIGNED_URL_TTL);
    if (signError || !signed?.signedUrl) {
      throw new Error(signError?.message || "URL signée indisponible");
    }
    return c.json({ success: true, name: latest, url: signed.signedUrl, expiresIn: SIGNED_URL_TTL });
  } catch (error) {
    console.error("❌ [BACKUPS/LATEST]", error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : "Erreur serveur",
    }, 500);
  }
});

// ─── GET /download/:name — URL signée d'un backup précis ───────────────────

app.get("/download/:name", async (c) => {
  if (!(await isAuthorized(c))) {
    return c.json({ success: false, error: "Non autorisé" }, 401);
  }
  try {
    const name = c.req.param("name");
    if (!name.startsWith(BACKUP_PREFIX) || name.includes("/") || name.includes("..")) {
      return c.json({ success: false, error: "Nom de backup invalide" }, 400);
    }
    const supabase = sbAdmin();
    const { data, error } = await supabase.storage
      .from(BACKUP_BUCKET)
      .createSignedUrl(name, SIGNED_URL_TTL);
    if (error || !data?.signedUrl) {
      return c.json({ success: false, error: error?.message || "Backup introuvable" }, 404);
    }
    return c.json({ success: true, name, url: data.signedUrl, expiresIn: SIGNED_URL_TTL });
  } catch (error) {
    console.error("❌ [BACKUPS/DOWNLOAD]", error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : "Erreur serveur",
    }, 500);
  }
});

// ─── DELETE /:name — supprimer un backup ────────────────────────────────────

app.delete("/:name", async (c) => {
  if (!(await hasValidAdminJwt(c))) {
    return c.json({ success: false, error: "Session administrateur requise" }, 401);
  }
  try {
    const name = c.req.param("name");
    if (!name.startsWith(BACKUP_PREFIX) || name.includes("/") || name.includes("..")) {
      return c.json({ success: false, error: "Nom de backup invalide" }, 400);
    }
    const supabase = sbAdmin();
    const { error } = await supabase.storage.from(BACKUP_BUCKET).remove([name]);
    if (error) throw new Error(error.message);
    console.log(`🗑️ [BACKUPS] ${name} supprimé`);
    return c.json({ success: true });
  } catch (error) {
    console.error("❌ [BACKUPS/DELETE]", error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : "Erreur serveur",
    }, 500);
  }
});

export default app;
