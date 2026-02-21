/**
 * Utilitaires pour la gestion des numéros de téléphone RDC
 */

/**
 * Valide si une chaîne est un numéro de téléphone RDC valide (9 ou 10 chiffres max)
 * Formats acceptés :
 * - 812345678 (9 chiffres)
 * - 81 234 5678 (avec espaces)
 * - 81-234-5678 (avec tirets)
 * - 0812345678 (10 chiffres avec 0 au début)
 * - +243812345678 (avec indicatif)
 * - 243812345678 (avec indicatif sans +)
 */
export function isValidPhoneNumber(input: string): boolean {
  // Nettoyer la chaîne (enlever espaces, tirets, +)
  const cleaned = input.replace(/[\s\-+]/g, '');
  
  // Vérifier si c'est uniquement des chiffres
  if (!/^\d+$/.test(cleaned)) {
    return false;
  }
  
  // Cas 1: 9 chiffres (812345678)
  if (cleaned.length === 9) {
    return true;
  }
  
  // Cas 2: 10 chiffres commençant par 0 (0812345678)
  if (cleaned.length === 10 && cleaned.startsWith('0')) {
    return true;
  }
  
  // Cas 3: 12 chiffres commençant par 243 (243812345678)
  if (cleaned.length === 12 && cleaned.startsWith('243')) {
    return true;
  }
  
  // Cas 4: 13 chiffres commençant par 243 avec 0 (2430812345678)
  if (cleaned.length === 13 && cleaned.startsWith('2430')) {
    return true;
  }
  
  return false;
}

/**
 * Normalise un numéro de téléphone RDC au format international 243XXXXXXXXX (sans +)
 * @param input Numéro de téléphone dans n'importe quel format
 * @returns Numéro au format 243XXXXXXXXX ou null si invalide
 */
export function normalizePhoneNumber(input: string): string | null {
  if (!isValidPhoneNumber(input)) {
    return null;
  }
  
  // Nettoyer la chaîne
  const cleaned = input.replace(/[\s\-+]/g, '');
  
  // Cas 1: 9 chiffres → 243XXXXXXXXX
  if (cleaned.length === 9) {
    return `243${cleaned}`;
  }
  
  // Cas 2: 10 chiffres avec 0 → 243XXXXXXXXX (enlever le 0)
  if (cleaned.length === 10 && cleaned.startsWith('0')) {
    return `243${cleaned.substring(1)}`;
  }
  
  // Cas 3: 12 chiffres avec 243 → 243XXXXXXXXX
  if (cleaned.length === 12 && cleaned.startsWith('243')) {
    return cleaned;
  }
  
  // Cas 4: 13 chiffres avec 2430 → 243XXXXXXXXX (enlever le 0 après 243)
  if (cleaned.length === 13 && cleaned.startsWith('2430')) {
    return `243${cleaned.substring(4)}`;
  }
  
  return null;
}

/**
 * Formate un numéro de téléphone pour l'affichage
 * @param phone Numéro au format 243XXXXXXXXX ou +243XXXXXXXXX
 * @returns Numéro formaté comme "+243 81 234 5678"
 */
export function formatPhoneForDisplay(phone: string): string {
  // Si déjà formaté, retourner tel quel
  if (phone.includes(' ')) {
    return phone;
  }
  
  // Enlever le + si présent
  const cleaned = phone.replace('+', '');
  
  // Format: +243 81 234 5678
  if (cleaned.length === 12 && cleaned.startsWith('243')) {
    const countryCode = cleaned.substring(0, 3);  // 243
    const part1 = cleaned.substring(3, 5);         // 81
    const part2 = cleaned.substring(5, 8);         // 234
    const part3 = cleaned.substring(8, 12);        // 5678
    return `+${countryCode} ${part1} ${part2} ${part3}`;
  }
  
  // Si 9 chiffres, ajouter le code pays
  if (cleaned.length === 9) {
    const part1 = cleaned.substring(0, 2);         // 81
    const part2 = cleaned.substring(2, 5);         // 234
    const part3 = cleaned.substring(5, 9);         // 5678
    return `+243 ${part1} ${part2} ${part3}`;
  }
  
  return phone;
}

/**
 * Détecte si une chaîne est un email ou un numéro de téléphone
 */
export function detectInputType(input: string): 'email' | 'phone' | 'unknown' {
  // Nettoyer l'entrée
  const trimmed = input.trim();
  
  if (!trimmed) {
    return 'unknown';
  }
  
  // Vérifier si c'est un email (contient @ et un point après @)
  if (trimmed.includes('@')) {
    return isValidEmail(trimmed) ? 'email' : 'unknown';
  }
  
  // Vérifier si c'est un numéro de téléphone valide
  if (isValidPhoneNumber(trimmed)) {
    return 'phone';
  }
  
  // Si ce n'est ni email ni téléphone valide, retourner phone par défaut si ça contient principalement des chiffres
  const cleaned = trimmed.replace(/[\s\-+]/g, '');
  if (/^\d{7,}$/.test(cleaned)) {
    // Au moins 7 chiffres -> probablement un téléphone
    return 'phone';
  }
  
  return 'unknown';
}

/**
 * Valide un email
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Génère un email factice basé sur le numéro de téléphone
 * Format: phone243999999999@internal.smartcabb (format interne accepté par Supabase)
 * @param normalizedPhone Numéro normalisé au format 243XXXXXXXXX
 * @returns Email généré
 */
export function generateEmailFromPhone(normalizedPhone: string): string {
  // NOUVEAU FORMAT VALIDE: {phone}@smartcabb.app (sans préfixe "phone")
  // Ce format est accepté par Supabase car c'est un vrai format d'email
  return `${normalizedPhone}@smartcabb.app`;
}

/**
 * Exemples de numéros de téléphone RDC valides
 */
export const PHONE_EXAMPLES = [
  '812345678',
  '0812345678',
  '+243 81 234 5678',
  '81 234 5678',
  '81-234-5678'
];

/**
 * Messages d'erreur pour la validation
 */
export const PHONE_ERROR_MESSAGES = {
  fr: {
    invalid: 'Numéro de téléphone invalide. Format attendu : 9-10 chiffres (ex: 0812345678)',
    tooShort: 'Numéro trop court. Il doit contenir 9 ou 10 chiffres.',
    tooLong: 'Numéro trop long. Maximum 10 chiffres.',
    notNumeric: 'Le numéro doit contenir uniquement des chiffres.'
  },
  en: {
    invalid: 'Invalid phone number. Expected format: 9-10 digits (e.g. 0812345678)',
    tooShort: 'Number too short. Must contain 9 or 10 digits.',
    tooLong: 'Number too long. Maximum 10 digits.',
    notNumeric: 'Number must contain only digits.'
  }
};
