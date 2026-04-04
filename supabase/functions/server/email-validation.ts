/**
 * Validation d'email RFC 5322 simplifiée
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.toLowerCase());
}

export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}
