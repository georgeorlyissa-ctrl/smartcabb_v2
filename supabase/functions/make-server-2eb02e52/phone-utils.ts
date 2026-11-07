/**
 * 📱 PHONE UTILITIES
 * Normalise les numéros de téléphone RDC pour l'application.
 *
 * Format interne canonique : +243XXXXXXXXX
 * - DOIT commencer par +
 * - Code pays: 243 (RDC)
 * - 9 chiffres après le code pays
 *
 * ⚠️ EJ SMS attend `243XXXXXXXXX` **sans +** : la conversion finale est faite
 * par `toMsisdn()` dans `ej-sms-core.ts`.
 */

/**
 * Normalise un numéro de téléphone pour la RDC
 * @param phone - Numéro de téléphone brut
 * @returns Numéro normalisé au format +243XXXXXXXXX ou null si invalide
 */
export function normalizePhoneNumber(phone: string | null | undefined): string | null {
  if (!phone) {
    return null;
  }

  // Nettoyer: enlever espaces, tirets, parenthèses, points
  let cleaned = phone.replace(/[\s\-().]/g, '');

  console.log('🔧 Normalisation du numéro:', phone, '→', cleaned);

  // Cas 1: +243XXXXXXXXX (déjà au bon format)
  if (/^\+243\d{9}$/.test(cleaned)) {
    console.log('✅ Format déjà correct:', cleaned);
    return cleaned;
  }

  // Cas 2: 243XXXXXXXXX (manque le +)
  if (/^243\d{9}$/.test(cleaned)) {
    const normalized = '+' + cleaned;
    console.log('✅ Ajout du +:', normalized);
    return normalized;
  }

  // Cas 3: 00243XXXXXXXXX (format international avec 00)
  if (/^00243\d{9}$/.test(cleaned)) {
    const normalized = '+' + cleaned.substring(2);
    console.log('✅ Conversion 00 → +:', normalized);
    return normalized;
  }

  // Cas 4: 0XXXXXXXXX (format local RDC, 10 chiffres commençant par 0)
  if (/^0\d{9}$/.test(cleaned)) {
    // Retirer le 0 et ajouter +243
    const normalized = '+243' + cleaned.substring(1);
    console.log('✅ Conversion format local:', normalized);
    return normalized;
  }

  // Cas 5: XXXXXXXXX (9 chiffres sans préfixe - format local sans le 0)
  if (/^\d{9}$/.test(cleaned)) {
    const normalized = '+243' + cleaned;
    console.log('✅ Ajout du code pays:', normalized);
    return normalized;
  }

  // Cas invalide
  console.error('❌ Format de numéro invalide:', phone, '(nettoyé:', cleaned, ')');
  return null;
}

/**
 * Valide qu'un numéro est au format canonique +243XXXXXXXXX
 * @param phone - Numéro normalisé
 * @returns true si valide, false sinon
 */
export function isValidPhoneNumber(phone: string | null | undefined): boolean {
  if (!phone) {
    return false;
  }

  // Doit être au format +243XXXXXXXXX
  return /^\+243\d{9}$/.test(phone);
}
