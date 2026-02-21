/**
 * Utilitaires de validation d'email pour SmartCabb
 * 
 * OBJECTIF : Prévenir les emails bounced en validant strictement les emails réels
 * et en empêchant l'envoi d'emails aux adresses @smartcabb.app (internes)
 */

/**
 * Valide qu'un email est réel et valide
 * 
 * @param email - L'email à valider
 * @returns true si l'email est valide et réel, false sinon
 */
export function isValidRealEmail(email: string): boolean {
  if (!email || !email.includes('@')) return false;
  
  // Regex stricte pour validation email (RFC 5322)
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  
  if (!emailRegex.test(email)) return false;
  
  // Vérifier que ce n'est pas un email @smartcabb.app généré automatiquement
  // MAIS permettre @smartcabb.com qui est notre domaine réel
  if (email.endsWith('@smartcabb.app')) return false;
  
  // Vérifier que le domaine a au moins 2 caractères après le point
  const domain = email.split('@')[1];
  const domainParts = domain.split('.');
  if (domainParts.length < 2 || domainParts[domainParts.length - 1].length < 2) {
    return false;
  }
  
  return true;
}

/**
 * Vérifie si un utilisateur utilise l'authentification par téléphone uniquement
 * (et ne doit donc JAMAIS recevoir d'emails)
 * 
 * @param email - L'email de l'utilisateur
 * @returns true si l'utilisateur utilise uniquement le téléphone
 */
export function usesPhoneAuthOnly(email: string): boolean {
  return email && email.includes('@smartcabb.app');
}

/**
 * Détermine si un email peut recevoir des communications par email
 * 
 * @param email - L'email à vérifier
 * @returns true si l'email peut recevoir des communications, false sinon
 */
export function canReceiveEmails(email: string): boolean {
  return isValidRealEmail(email) && !usesPhoneAuthOnly(email);
}

/**
 * Génère un email interne pour un utilisateur qui s'inscrit par téléphone uniquement
 * 
 * @param phone - Le numéro de téléphone normalisé (format: 243XXXXXXXXX)
 * @returns Un email unique @smartcabb.app qui ne recevra jamais d'emails
 */
export function generateInternalEmail(phone: string): string {
  // Nettoyer le téléphone
  const cleanPhone = phone.replace(/[\s\-+()]/g, '');
  
  // Ajouter un timestamp pour garantir l'unicité
  const timestamp = Date.now();
  
  // ⚠️ IMPORTANT: Ces emails NE DOIVENT JAMAIS recevoir d'emails
  // Utiliser SMS à la place pour communiquer avec ces utilisateurs
  return `${cleanPhone}_${timestamp}@smartcabb.app`;
}

/**
 * Valide un email avant création de compte
 * Retourne un objet avec le résultat de la validation
 * 
 * @param email - L'email à valider (peut être vide/null)
 * @param phone - Le numéro de téléphone (requis si pas d'email)
 * @returns Objet { isValid: boolean, finalEmail: string, usesPhoneAuth: boolean, error?: string }
 */
export function validateEmailForSignup(
  email: string | null | undefined, 
  phone: string
): {
  isValid: boolean;
  finalEmail: string;
  usesPhoneAuth: boolean;
  error?: string;
} {
  // Cas 1: Email fourni et valide
  if (email && email.trim() && isValidRealEmail(email.trim())) {
    console.log('✅ Email réel valide fourni:', email.trim());
    return {
      isValid: true,
      finalEmail: email.trim().toLowerCase(),
      usesPhoneAuth: false
    };
  }
  
  // Cas 2: Email fourni mais invalide
  if (email && email.trim() && !isValidRealEmail(email.trim())) {
    console.error('❌ Email fourni mais invalide:', email.trim());
    return {
      isValid: false,
      finalEmail: '',
      usesPhoneAuth: false,
      error: 'Email invalide. Veuillez entrer un email valide (ex: nom@gmail.com) ou laissez vide pour utiliser uniquement le téléphone.'
    };
  }
  
  // Cas 3: Pas d'email, générer email interne
  console.log('⚠️ Aucun email réel fourni, génération email interne @smartcabb.app');
  
  // Normaliser le téléphone au format 243XXXXXXXXX
  const cleanPhone = phone.replace(/[\s\-+]/g, '');
  let normalizedPhone: string;
  
  if (cleanPhone.length === 9) {
    normalizedPhone = `243${cleanPhone}`;
  } else if (cleanPhone.length === 10 && cleanPhone.startsWith('0')) {
    normalizedPhone = `243${cleanPhone.substring(1)}`;
  } else if (cleanPhone.length === 12 && cleanPhone.startsWith('243')) {
    normalizedPhone = cleanPhone;
  } else if (cleanPhone.length === 13 && cleanPhone.startsWith('2430')) {
    normalizedPhone = `243${cleanPhone.substring(4)}`;
  } else {
    normalizedPhone = cleanPhone.replace(/^0+/, '243');
  }
  
  const finalEmail = generateInternalEmail(normalizedPhone);
  console.log('📧 Email interne généré (NE RECEVRA PAS D\'EMAILS):', finalEmail);
  
  return {
    isValid: true,
    finalEmail: finalEmail,
    usesPhoneAuth: true
  };
}

/**
 * Domaines d'email courants à éviter (jetables, temporaires)
 */
export const DISPOSABLE_EMAIL_DOMAINS = [
  'tempmail.com',
  'guerrillamail.com',
  '10minutemail.com',
  'mailinator.com',
  'throwaway.email',
  'getnada.com',
  'temp-mail.org'
];

/**
 * Vérifie si un email utilise un domaine jetable/temporaire
 * 
 * @param email - L'email à vérifier
 * @returns true si c'est un email jetable
 */
export function isDisposableEmail(email: string): boolean {
  if (!email) return false;
  
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return false;
  
  return DISPOSABLE_EMAIL_DOMAINS.some(disposable => domain.includes(disposable));
}
