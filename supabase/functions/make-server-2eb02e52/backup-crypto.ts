/**
 * 🔐 CHIFFREMENT DES SAUVEGARDES — SMARTCABB (optionnel)
 * ---------------------------------------------------------------------------
 * Les backups contiennent toutes les données personnelles de l'application
 * (noms, téléphones, positions, soldes). Ce module permet de les chiffrer
 * avant dépôt dans le bucket Storage : un fichier exfiltré devient inutilisable
 * sans la clé.
 *
 * Activation : définir le secret `BACKUP_ENCRYPTION_KEY` (32 octets encodés
 * en base64, soit 44 caractères). **Sans cette variable, rien ne change.**
 *
 * ⚠️ La clé ne doit JAMAIS être perdue : sans elle, les backups chiffrés sont
 * définitivement illisibles. Elle doit être conservée HORS de Supabase
 * (gestionnaire de mots de passe + copie hors site).
 *
 * Format du fichier chiffré :
 *   magic "SCBAK1" (6 octets) | IV (12 octets) | ciphertext AES-GCM
 */

const MAGIC = new Uint8Array([0x53, 0x43, 0x42, 0x41, 0x4b, 0x31]); // "SCBAK1"

export function encryptionKey(): Uint8Array | null {
  const raw = Deno.env.get("BACKUP_ENCRYPTION_KEY");
  if (!raw) return null;
  try {
    const bytes = Uint8Array.from(atob(raw.trim()), (ch) => ch.charCodeAt(0));
    return bytes.length === 32 ? bytes : null;
  } catch {
    console.error("⚠️ [BACKUP-CRYPTO] BACKUP_ENCRYPTION_KEY invalide (base64 32 octets attendu)");
    return null;
  }
}

export function isEncryptionEnabled(): boolean {
  return encryptionKey() !== null;
}

function concat(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

/** Chiffre le contenu d'un backup. Renvoie l'entrée telle quelle si aucune clé. */
export async function encryptBackup(payload: Uint8Array): Promise<Uint8Array> {
  const key = encryptionKey();
  if (!key) return payload;

  const cryptoKey = await crypto.subtle.importKey("raw", key, { name: "AES-GCM" }, false, [
    "encrypt",
  ]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, cryptoKey, payload),
  );
  return concat([MAGIC, iv, cipher]);
}

/** Vrai si le fichier commence par la signature "SCBAK1". */
export function isEncryptedBackup(bytes: Uint8Array): boolean {
  if (bytes.length < MAGIC.length) return false;
  return MAGIC.every((value, index) => bytes[index] === value);
}

/**
 * Déchiffre un backup. Renvoie `null` si le fichier est chiffré mais que la clé
 * est absente ou invalide (l'appelant doit alors signaler l'erreur).
 */
export async function decryptBackup(bytes: Uint8Array): Promise<Uint8Array | null> {
  if (!isEncryptedBackup(bytes)) return bytes;

  const key = encryptionKey();
  if (!key) {
    console.error("⚠️ [BACKUP-CRYPTO] Backup chiffré mais BACKUP_ENCRYPTION_KEY absente");
    return null;
  }

  try {
    const cryptoKey = await crypto.subtle.importKey("raw", key, { name: "AES-GCM" }, false, [
      "decrypt",
    ]);
    const iv = bytes.slice(MAGIC.length, MAGIC.length + 12);
    const cipher = bytes.slice(MAGIC.length + 12);
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, cryptoKey, cipher);
    return new Uint8Array(plain);
  } catch (error) {
    console.error(
      "❌ [BACKUP-CRYPTO] Déchiffrement impossible:",
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}
