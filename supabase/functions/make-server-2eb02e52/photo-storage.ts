/**
 * 🖼️ Migration des photos de profil (base64 dans le KV) → Supabase Storage
 *
 * Pourquoi ?
 *   Les fiches `driver:` embarquent la photo en **base64** (`profile_photo`),
 *   jusqu'à 1,3 Mo chacune (~5 Mo au total). PostgreSQL stocke ces JSONB hors
 *   ligne (TOAST) : **chaque lecture**, même d'un seul champ, relit et
 *   décompresse toute la photo. Résultat : ~5 Mo d'E/S disque par recherche de
 *   chauffeur (budget Supabase saturé, lectures lentes ou en timeout) et
 *   `GET /drivers/:id` qui renvoyait ~3,5 Mo sur le téléphone du conducteur.
 *
 *   La migration téléverse l'image dans le bucket public `avatars`, puis
 *   remplace la donnée base64 par une simple URL (`photo_url`). Les fiches
 *   passent de plusieurs centaines de Ko à quelques Ko.
 *
 * Sécurité :
 *   - l'image est téléversée ET vérifiée AVANT de modifier la fiche ; en cas
 *     d'échec, la fiche reste intacte (aucune perte de photo) ;
 *   - opération **idempotente** : une fiche déjà migrée est ignorée ;
 *   - déclenchée uniquement par `POST /drivers/migrate-photos` avec l'en-tête
 *     `x-migration-token` (secret `PHOTO_MIGRATION_TOKEN`, retiré après usage).
 */

import { createClient } from "npm:@supabase/supabase-js@2";

const KV_TABLE = "kv_store_2eb02e52";
const BUCKET = "avatars";

/** Champs pouvant contenir une photo (data URL base64 ou URL http). */
const PHOTO_FIELDS = [
  "profile_photo",
  "photo",
  "photo_url",
  "avatar",
  "avatar_url",
  "photoBase64",
];

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

function kvClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
}

async function ensureBucket(): Promise<{ ok: boolean; error?: string }> {
  const { error } = await kvClient().storage.createBucket(BUCKET, { public: true });
  if (error && !/already exists|duplicate/i.test(error.message)) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

interface DecodedPhoto {
  bytes: Uint8Array;
  contentType: string;
  ext: string;
}

/** `data:image/jpeg;base64,....` → octets. `null` si ce n'est pas une image. */
function decodeDataUrl(value: unknown): DecodedPhoto | null {
  if (typeof value !== "string") return null;
  const match = /^data:(image\/[a-z0-9.+-]+);base64,(.+)$/is.exec(value.trim());
  if (!match) return null;

  const contentType = match[1].toLowerCase();
  const base64 = match[2].replace(/\s+/g, "");
  try {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return { bytes, contentType, ext: EXT_BY_MIME[contentType] || "jpg" };
  } catch {
    return null;
  }
}

const isHttpUrl = (value: unknown): boolean =>
  typeof value === "string" && /^https?:\/\//i.test(value.trim());

/**
 * Téléverse une photo « data:image/…;base64 » et renvoie son URL publique.
 * `null` si la valeur n'est pas une image base64 ou si le téléversement échoue
 * (l'appelant conserve alors la valeur d'origine : aucune perte de photo).
 *
 * Utilisé à l'écriture (inscription, mise à jour du profil) pour ne JAMAIS
 * remettre de base64 dans le KV : les fiches restent petites et les lectures
 * ne consomment plus le budget d'E/S disque.
 */
export async function storePhotoDataUrl(
  recordId: string,
  value: unknown,
  folder: "drivers" | "vehicles" | "passengers" | "profiles",
): Promise<string | null> {
  const decoded = decodeDataUrl(value);
  if (!decoded) return null;

  const bucket = await ensureBucket();
  if (!bucket.ok) {
    console.error(`❌ [PHOTOS] Bucket indisponible: ${bucket.error}`);
    return null;
  }

  const path = `${folder}/${recordId}.${decoded.ext}`;
  const supabase = kvClient();
  const { error } = await supabase.storage.from(BUCKET).upload(path, decoded.bytes, {
    contentType: decoded.contentType,
    upsert: true,
    cacheControl: "31536000",
  });
  if (error) {
    console.error(`❌ [PHOTOS] Téléversement ${path}: ${error.message}`);
    return null;
  }

  // Bucket privé : on renvoie une URL signée (lisible par <img> sans en-tête).
  const signed = await signPhotoPath(path);
  if (signed) return signed;
  // Repli (bucket public) : URL publique simple.
  const publicUrl = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  return publicUrl ? `${publicUrl}?v=${Date.now()}` : null;
}

/** Un an : les URLs sont de toute façon re-signées à chaque lecture d'une fiche. */
const SIGNED_URL_TTL_SEC = 365 * 24 * 60 * 60;

/**
 * URL **signée** (bucket privé) pour un objet déjà téléversé.
 * `<img src>` ne peut pas envoyer l'en-tête `Authorization` : la signature est
 * donc le seul moyen de servir une image privée à l'application.
 */
export async function signPhotoPath(
  path: string,
  expiresIn: number = SIGNED_URL_TTL_SEC,
): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await kvClient().storage.from(BUCKET).createSignedUrl(path, expiresIn);
  if (error || !data?.signedUrl) {
    if (error) console.warn(`⚠️ [PHOTOS] Signature ${path}: ${error.message}`);
    return null;
  }
  return data.signedUrl;
}

/** Bascule le bucket en privé (les objets restent, seules les URLs publiques cessent de marcher). */
export async function setBucketPrivate(): Promise<{ ok: boolean; error?: string }> {
  const { error } = await kvClient().storage.updateBucket(BUCKET, { public: false });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Re-signe les `photo_url` de toutes les fiches ayant un `photo_storage_path`.
 * À lancer après le passage du bucket en privé (et périodiquement si besoin :
 * les lectures d'API re-signent de toute façon à la volée).
 */
export async function refreshPhotoUrls(): Promise<{ updated: number; failed: string[] }> {
  const supabase = kvClient();
  const result = { updated: 0, failed: [] as string[] };

  for (const prefix of ["driver:", "profile:", "passenger:"]) {
    const { data, error } = await supabase
      .from(KV_TABLE).select("key, value").like("key", prefix + "%");
    if (error) {
      result.failed.push(`${prefix}: ${error.message}`);
      continue;
    }
    for (const row of data || []) {
      const record: any = row.value;
      const path = record?.photo_storage_path;
      if (!record || !path) continue;
      const signed = await signPhotoPath(path);
      if (!signed) {
        result.failed.push(`${record.id || row.key}: signature impossible`);
        continue;
      }
      const { error: writeError } = await supabase
        .from(KV_TABLE).upsert({ key: row.key, value: { ...record, photo_url: signed } });
      if (writeError) {
        result.failed.push(`${record.id || row.key}: écriture — ${writeError.message}`);
        continue;
      }
      result.updated += 1;
    }
  }

  console.log(`🖼️ [PHOTOS] ${result.updated} URL(s) signée(s), ${result.failed.length} échec(s)`);
  return result;
}

export interface PhotoMigrationReport {
  scanned: number;
  migrated: number;
  alreadyUrl: number;
  noPhoto: number;
  failed: string[];
  bytesFreed: number;
}

const emptyReport = (): PhotoMigrationReport => ({
  scanned: 0,
  migrated: 0,
  alreadyUrl: 0,
  noPhoto: 0,
  failed: [],
  bytesFreed: 0,
});

/**
 * Migre une famille d'enregistrements (`driver:`, `profile:`, `passenger:`).
 * `limit` = nombre maximum de fiches traitées (0 = toutes) pour borner la durée.
 */
async function migrateCollection(
  prefix: string,
  folder: string,
  options: { dryRun: boolean; limit: number },
  report: PhotoMigrationReport,
): Promise<void> {
  const supabase = kvClient();
  const { data, error } = await supabase
    .from(KV_TABLE).select("key, value").like("key", prefix + "%");
  if (error) throw new Error(`Lecture ${prefix}: ${error.message}`);

  let processed = 0;

  for (const row of data || []) {
    if (options.limit > 0 && processed >= options.limit) break;
    const record: any = row.value;
    if (!record || typeof record !== "object") continue;
    report.scanned += 1;

    const id = String(record.id || row.key.slice(prefix.length));
    let field: string | null = null;
    let decoded: DecodedPhoto | null = null;
    for (const candidate of PHOTO_FIELDS) {
      const parsed = decodeDataUrl(record[candidate]);
      if (parsed) {
        field = candidate;
        decoded = parsed;
        break;
      }
    }

    if (!field || !decoded) {
      if (PHOTO_FIELDS.some((f) => isHttpUrl(record[f]))) report.alreadyUrl += 1;
      else report.noPhoto += 1;
      continue;
    }

    if (options.dryRun) {
      report.migrated += 1;
      report.bytesFreed += decoded.bytes.byteLength;
      processed += 1;
      continue;
    }

    const path = `${folder}/${id}.${decoded.ext}`;
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, decoded.bytes, {
        contentType: decoded.contentType,
        upsert: true,
        cacheControl: "31536000",
      });
    if (uploadError) {
      report.failed.push(`${id}: téléversement — ${uploadError.message}`);
      continue;
    }

    const publicUrl = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
    if (!publicUrl) {
      report.failed.push(`${id}: URL publique introuvable`);
      continue;
    }

    const now = new Date().toISOString();
    const updated: any = {
      ...record,
      photo_url: `${publicUrl}?v=${Date.now()}`,
      photo_storage_path: path,
      photo_migrated_at: now,
      photo_migrated_bytes: decoded.bytes.byteLength,
    };
    // On retire la donnée base64 (et ses alias) une fois l'URL en place.
    for (const candidate of PHOTO_FIELDS) {
      if (candidate !== "photo_url" && candidate !== "avatar_url") updated[candidate] = null;
    }

    const { error: writeError } = await supabase
      .from(KV_TABLE).upsert({ key: row.key, value: updated });
    if (writeError) {
      report.failed.push(`${id}: écriture — ${writeError.message}`);
      continue;
    }

    report.migrated += 1;
    report.bytesFreed += decoded.bytes.byteLength;
    processed += 1;
  }
}

/**
 * Migre les photos des conducteurs, profils et passagers.
 * `dryRun` : ne compte que ce qui serait migré (aucune écriture).
 */
export async function migrateProfilePhotos(
  options: { dryRun?: boolean; limit?: number } = {},
): Promise<PhotoMigrationReport> {
  const dryRun = options.dryRun === true;
  const limit = Number.isFinite(options.limit) ? Number(options.limit) : 0;
  const report = emptyReport();

  if (!dryRun) {
    const bucket = await ensureBucket();
    if (!bucket.ok) {
      report.failed.push(`bucket ${BUCKET}: ${bucket.error}`);
      return report;
    }
  }

  await migrateCollection("driver:", "drivers", { dryRun, limit }, report);
  await migrateCollection("profile:", "profiles", { dryRun, limit }, report);
  await migrateCollection("passenger:", "passengers", { dryRun, limit }, report);

  console.log(
    `🖼️ [PHOTOS] ${dryRun ? "(simulation) " : ""}${report.migrated} migrée(s), ` +
    `${report.alreadyUrl} déjà en URL, ${report.noPhoto} sans photo, ` +
    `${report.failed.length} échec(s), ${Math.round(report.bytesFreed / 1024)} Ko libérés`,
  );
  return report;
}
