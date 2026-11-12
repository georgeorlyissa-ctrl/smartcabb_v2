/**
 * 📇 SÉLECTION D'UN CONTACT DU RÉPERTOIRE DU TÉLÉPHONE
 *
 * Sert au formulaire « Réserver pour quelqu'un d'autre » : au lieu de saisir
 * le numéro à la main, l'utilisateur choisit le contact dans son répertoire.
 *
 * Trois niveaux, dans cet ordre :
 *  1. Plugin natif `@capacitor/contacts` (APK Android/iOS) — le plus fiable,
 *     ouvre le vrai sélecteur système du répertoire.
 *  2. Contact Picker API du navigateur (`navigator.contacts.select`) —
 *     disponible dans Chrome Android (et donc, quand il est implémenté,
 *     dans la WebView). Aucune permission persistante : le système demande
 *     à l'utilisateur de choisir le contact à chaque appel.
 *  3. Aucun des deux → `unsupported`, l'appelant laisse la saisie manuelle.
 *
 * Le numéro renvoyé est normalisé au format RDC `+243XXXXXXXXX`.
 */

export interface PickedContact {
  /** Nom affiché du contact (facultatif). */
  name?: string;
  /** Numéro normalisé au format `+243XXXXXXXXX`. */
  phone: string;
}

export type PickContactResult =
  | { status: 'ok'; contact: PickedContact }
  | { status: 'cancelled' }
  | { status: 'unsupported' }
  | { status: 'denied' }
  | { status: 'error'; message?: string };

/** Champs demandés au sélecteur (API navigateur). */
const CONTACT_PROPERTIES = ['name', 'tel'];

/** Numéro RDC valide au format international. */
const RDC_INTERNATIONAL = /^\+243[0-9]{9}$/;

/**
 * Normalise un numéro issu du répertoire vers `+243XXXXXXXXX`.
 * Accepte : `+243 99 99 99 999`, `00243999999999`, `0999999999`,
 * `999999999`, `243999999999`, avec espaces, tirets ou parenthèses.
 */
export function normalizeRdcPhone(raw: string): string {
  if (!raw) return '';

  // On ne garde que les chiffres (le `+` initial est traité plus bas).
  let digits = String(raw).replace(/[^\d]/g, '');
  if (!digits) return '';

  // Préfixe international composé : 00 243 …
  if (digits.startsWith('00')) digits = digits.slice(2);

  // 243XXXXXXXXX → +243XXXXXXXXX
  if (digits.startsWith('243') && digits.length >= 12) {
    return '+' + digits.slice(0, 12);
  }

  // Format national 0XXXXXXXXX → +243XXXXXXXXX
  if (digits.startsWith('0') && digits.length === 10) {
    return '+243' + digits.slice(1);
  }

  // Numéro local à 9 chiffres (8 ou 9 en tête en RDC)
  if (digits.length === 9) {
    return '+243' + digits;
  }

  // Numéro trop long (indicatif pays collé, ex. 00243…) : on garde les 9 derniers
  if (digits.length > 9) {
    const last9 = digits.slice(-9);
    if (/^[89]/.test(last9)) return '+243' + last9;
  }

  // Format inconnu : on renvoie tel quel (la validation du formulaire tranchera)
  return digits;
}

/**
 * Parmi les numéros d'un contact, choisit le premier numéro RDC valide.
 * À défaut, renvoie le premier numéro normalisé.
 */
function pickBestPhone(rawNumbers: string[]): string | undefined {
  const cleaned = rawNumbers.map((n) => String(n || '').trim()).filter(Boolean);
  if (cleaned.length === 0) return undefined;

  const normalized = cleaned.map(normalizeRdcPhone);
  const valid = normalized.find((n) => RDC_INTERNATIONAL.test(n));
  return valid || normalized[0];
}

/** Le plugin natif est-il présent dans l'APK installé ? */
export function isNativeContactPickerAvailable(): boolean {
  try {
    const cap = (window as any)?.Capacitor;
    if (!cap) return false;
    const native = typeof cap.isNativePlatform === 'function' ? cap.isNativePlatform() : false;
    if (!native) return false;
    if (typeof cap.isPluginAvailable === 'function' && !cap.isPluginAvailable('Contacts')) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/** L'API Contact Picker du navigateur est-elle disponible ? */
export function isWebContactPickerAvailable(): boolean {
  try {
    return (
      typeof navigator !== 'undefined' &&
      'contacts' in navigator &&
      typeof (navigator as any).contacts?.select === 'function' &&
      typeof (window as any)?.ContactsManager === 'function'
    );
  } catch {
    return false;
  }
}

/** Un des deux moyens de sélection est-il utilisable ? */
export function isContactPickerAvailable(): boolean {
  return isNativeContactPickerAvailable() || isWebContactPickerAvailable();
}

/** Traduit les erreurs natives en statut lisible par l'UI. */
function describeNativeError(err: any): PickContactResult {
  const code = String(err?.code || '');
  const message = String(err?.message || err || '');

  // OS-PLUG-CONT-0006 : l'utilisateur a annulé le sélecteur
  if (code.includes('0006') || /cancel/i.test(message)) {
    return { status: 'cancelled' };
  }
  // OS-PLUG-CONT-0020 : permission refusée
  if (code.includes('0020') || /denied|permission/i.test(message)) {
    return { status: 'denied' };
  }
  return { status: 'error', message };
}

/**
 * Ouvre le sélecteur de contacts et renvoie le contact choisi.
 * Ne lève jamais d'exception : tout est traduit dans `PickContactResult`.
 */
export async function pickPhoneContact(): Promise<PickContactResult> {
  // 1) Plugin natif (APK)
  if (isNativeContactPickerAvailable()) {
    try {
      const { Contacts } = await import('@capacitor/contacts');
      const contact = await Contacts.pickContact();
      const numbers = (contact.phoneNumbers || [])
        .map((field) => field?.value || '')
        .filter(Boolean);
      const phone = pickBestPhone(numbers);

      if (!phone) {
        return { status: 'error', message: "Ce contact n'a pas de numéro de téléphone." };
      }

      return {
        status: 'ok',
        contact: {
          name: contact.displayName?.trim() || undefined,
          phone,
        },
      };
    } catch (err) {
      return describeNativeError(err);
    }
  }

  // 2) Contact Picker API du navigateur / WebView
  if (isWebContactPickerAvailable()) {
    try {
      const selected = await (navigator as any).contacts.select(CONTACT_PROPERTIES, {
        multiple: false,
      });

      const first = Array.isArray(selected) ? selected[0] : null;
      if (!first) return { status: 'cancelled' };

      const numbers = Array.isArray(first.tel) ? first.tel.map(String) : [];
      const phone = pickBestPhone(numbers);

      if (!phone) {
        return { status: 'error', message: "Ce contact n'a pas de numéro de téléphone." };
      }

      const name = Array.isArray(first.name) ? first.name[0] : undefined;

      return {
        status: 'ok',
        contact: { name: name?.trim() || undefined, phone },
      };
    } catch (err: any) {
      const name = String(err?.name || '');
      const message = String(err?.message || err || '');

      if (name === 'AbortError' && /cancel/i.test(message)) return { status: 'cancelled' };
      if (name === 'SecurityError') return { status: 'denied' };
      // WebView sans sélecteur de contacts : « Unable to open a contact selector »
      if (/contact selector|not supported|not implemented/i.test(message)) {
        return { status: 'unsupported' };
      }
      return { status: 'error', message };
    }
  }

  // 3) Rien de disponible
  return { status: 'unsupported' };
}
