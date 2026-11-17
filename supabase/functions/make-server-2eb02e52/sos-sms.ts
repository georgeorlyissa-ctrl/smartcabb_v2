/**
 * 🚨 SOS — Envoi SMS au support (module partagé)
 * ---------------------------------------------------------------------------
 * Utilisé par deux chemins distincts :
 *  - `POST /emergency/sos` (bouton SOS de l'application) ;
 *  - `POST /rides/:id/incident` quand un incident « urgence » est déclaré en
 *    course (l'alerte est créée dans `emergency_alerts`).
 *
 * Les numéros sont lus à chaud dans le KV `smartcabb_global_config`
 * (`emergencyNumbers.support`, `.supportTech`, `.supportBackup`) et l'envoi
 * n'a lieu que si `emergencySmsEnabled === true`.
 */

import { get as kvGet } from "./kv-wrapper.ts";
import { sendEjSms } from "./ej-sms-core.ts";

export const SOS_CONFIG_KEY = "smartcabb_global_config";

export const DEFAULT_SOS_NUMBERS = {
  police: "112",
  ambulance: "115",
  support: "",
  supportTech: "",
};

export interface SosSmsNumbers {
  police?: string;
  ambulance?: string;
  support?: string;
  supportTech?: string;
  supportBackup?: string;
}

/**
 * Numéros à prévenir par SMS lors d'un SOS.
 * Accepte plusieurs numéros par champ (séparés par `,` `;` `/` ou `|`),
 * et déduplique. Maximum 4 destinataires.
 */
export function supportNumbersFrom(numbers: SosSmsNumbers): string[] {
  const out: string[] = [];
  for (const value of [numbers.support, numbers.supportTech, numbers.supportBackup]) {
    if (!value) continue;
    for (const part of String(value).split(/[,;/|]+/)) {
      const trimmed = part.trim();
      if (trimmed && !out.includes(trimmed)) out.push(trimmed);
    }
  }
  return out.slice(0, 4);
}

export async function readSosSmsConfig(): Promise<{
  numbers: typeof DEFAULT_SOS_NUMBERS & SosSmsNumbers;
  smsEnabled: boolean;
  supportNumbers: string[];
}> {
  const stored = (await kvGet<any>(SOS_CONFIG_KEY)) || {};
  const numbers = {
    ...DEFAULT_SOS_NUMBERS,
    ...(stored.emergencyNumbers && typeof stored.emergencyNumbers === "object"
      ? stored.emergencyNumbers
      : {}),
  } as typeof DEFAULT_SOS_NUMBERS & SosSmsNumbers;

  return {
    numbers,
    smsEnabled: stored.emergencySmsEnabled === true,
    supportNumbers: supportNumbersFrom(numbers),
  };
}

export interface SosSmsResult {
  /** Vrai dès qu'au moins un destinataire a été joint. */
  notified: boolean;
  /** Renseigné uniquement si aucun destinataire n'a été joint. */
  error: string | null;
  results: Array<{ to: string; ok: boolean; error?: string }>;
  /** `disabled` = SMS désactivés en config, `no_number` = aucun numéro. */
  skipped?: "disabled" | "no_number";
}

/**
 * Envoie le SMS SOS à tous les numéros de support configurés.
 * Séquentiel : l'API EJSMS gère mal les rafales simultanées.
 * Ne lève jamais : un échec SMS ne doit pas bloquer l'alerte.
 */
export async function sendSosAlertSms(message: string): Promise<SosSmsResult> {
  const { smsEnabled, supportNumbers } = await readSosSmsConfig();
  const results: SosSmsResult["results"] = [];

  if (!smsEnabled) {
    console.warn("⚠️ [SOS/SMS] Envoi de SMS SOS désactivé dans la configuration");
    return { notified: false, error: null, results, skipped: "disabled" };
  }
  if (supportNumbers.length === 0) {
    console.warn("⚠️ [SOS/SMS] Aucun numéro de support configuré — pas de SMS");
    return { notified: false, error: null, results, skipped: "no_number" };
  }

  const body = String(message ?? "").slice(0, 320);
  let notified = false;

  for (const to of supportNumbers) {
    try {
      const result = await sendEjSms({ to, message: body });
      results.push({
        to,
        ok: result.ok,
        error: result.ok ? undefined : (result.error || "Envoi SMS impossible"),
      });
      if (result.ok) {
        notified = true;
      } else {
        console.warn(`⚠️ [SOS/SMS] SMS non envoyé à ${to}:`, result.error);
      }
    } catch (e: any) {
      const err = e?.message || "Envoi SMS impossible";
      results.push({ to, ok: false, error: err });
      console.warn(`⚠️ [SOS/SMS] SMS non envoyé à ${to}:`, err);
    }
  }

  return {
    notified,
    error: notified ? null : (results.find((r) => r.error)?.error || "Envoi SMS impossible"),
    results,
  };
}
