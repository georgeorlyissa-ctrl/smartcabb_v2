#!/usr/bin/env node
/**
 * SMARTCABB — Restauration d'un backup JSON (.json.gz)
 *
 * Usage :
 *   Supabase → Settings → API → service_role key (ne jamais committer cette clé)
 *
 *   PowerShell :
 *     $env:SUPABASE_URL="https://zaerjqchzqmcxqblkfkg.supabase.co"
 *     $env:SUPABASE_SERVICE_ROLE_KEY="<service_role>"
 *     node scripts/restore-backup.mjs "C:\...\smartcabb-backup-....json.gz"
 *     node scripts/restore-backup.mjs "C:\...\smartcabb-backup-....json.gz" --apply
 *
 * Sans --apply : simulation (aucune écriture).
 *
 * Ce script restaure :
 *   - kv_store_2eb02e52 (upsert sur `key`)
 *   - scheduled_rides (upsert sur `id`)
 *   - emergency_alerts (upsert sur `id`)
 *   - avatars (ré-upload dans le bucket `avatars`)
 *
 * Les comptes auth.users ne sont PAS recréés automatiquement (les mots de passe
 * ne sont pas sauvegardés). La liste est affichée pour recréation manuelle.
 */

import fs from "node:fs";
import zlib from "node:zlib";
import { createClient } from "@supabase/supabase-js";

const file = process.argv[2];
const apply = process.argv.includes("--apply");

if (!file) {
  console.error("Usage: node scripts/restore-backup.mjs <fichier.json.gz> [--apply]");
  process.exit(1);
}
if (!fs.existsSync(file)) {
  console.error(`Fichier introuvable : ${file}`);
  process.exit(1);
}

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  console.error("Définir SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY avant de lancer le script.");
  process.exit(1);
}

const raw = file.endsWith(".gz")
  ? zlib.gunzipSync(fs.readFileSync(file)).toString("utf8")
  : fs.readFileSync(file, "utf8");

const payload = JSON.parse(raw);
const data = payload.data || {};
const meta = payload.meta || {};

console.log("=".repeat(60));
console.log("SMARTCABB — Restauration de backup");
console.log("=".repeat(60));
console.log(`Fichier      : ${file}`);
console.log(`Créé le      : ${meta.createdAt || "inconnu"}`);
console.log(`Mode         : ${apply ? "APPLICATION RÉELLE" : "SIMULATION (dry-run)"}`);
console.log("Contenu      :", {
  kv: data.kv_store_2eb02e52?.length || 0,
  reservations: data.scheduled_rides?.length || 0,
  sos: data.emergency_alerts?.length || 0,
  comptes: data.auth_users?.length || 0,
  photos: data.avatars?.length || 0,
});
console.log("=".repeat(60));

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function upsertRows(table, rows, onConflict) {
  if (!Array.isArray(rows) || rows.length === 0) {
    console.log(`${table}: rien à restaurer`);
    return;
  }
  const batchSize = 500;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    if (!apply) {
      console.log(`[dry-run] ${table}: ${batch.length} ligne(s) (total ${rows.length})`);
      continue;
    }
    const { error } = await supabase.from(table).upsert(batch, { onConflict });
    if (error) throw new Error(`${table}: ${error.message}`);
    console.log(`${table}: ${Math.min(i + batchSize, rows.length)}/${rows.length}`);
  }
}

async function restoreAvatars(avatars) {
  if (!Array.isArray(avatars) || avatars.length === 0) {
    console.log("avatars: rien à restaurer");
    return;
  }
  for (const avatar of avatars) {
    if (!avatar?.path || !avatar?.base64) continue;
    if (!apply) {
      console.log(`[dry-run] avatar ${avatar.path} (${avatar.size || 0} o)`);
      continue;
    }
    const bytes = Buffer.from(avatar.base64, "base64");
    const { error } = await supabase.storage
      .from("avatars")
      .upload(avatar.path, bytes, {
        upsert: true,
        contentType: avatar.mimetype || "application/octet-stream",
      });
    if (error) {
      console.warn(`⚠️ avatar ${avatar.path}: ${error.message}`);
    } else {
      console.log(`avatar restauré: ${avatar.path}`);
    }
  }
}

try {
  await upsertRows("kv_store_2eb02e52", data.kv_store_2eb02e52, "key");
  await upsertRows("scheduled_rides", data.scheduled_rides, "id");
  await upsertRows("emergency_alerts", data.emergency_alerts, "id");
  await restoreAvatars(data.avatars);

  if (Array.isArray(data.auth_users) && data.auth_users.length > 0) {
    console.log("");
    console.log(`Comptes présents dans le backup : ${data.auth_users.length}`);
    console.log("Ils ne sont pas recréés automatiquement (mots de passe non sauvegardés).");
    console.log("Recréer les comptes manquants dans Supabase → Authentication → Users,");
    console.log("puis envoyer un lien de réinitialisation aux utilisateurs.");
  }

  console.log("");
  console.log(apply ? "✅ Restauration terminée." : "ℹ️ Simulation terminée. Relancer avec --apply pour écrire.");
} catch (error) {
  console.error("❌ Restauration interrompue :", error instanceof Error ? error.message : error);
  process.exit(1);
}
