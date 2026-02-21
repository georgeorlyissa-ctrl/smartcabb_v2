/**
 * 🔢 UTILITAIRES DE FORMATAGE
 * Fonctions pour formater les nombres, prix, etc. avec protection contre undefined/null
 */

/**
 * Formate un nombre en string avec séparateurs de milliers
 * Protection contre undefined/null/NaN
 */
export function formatNumber(value: number | undefined | null): string {
  const num = Number(value);
  
  // Si la valeur est invalide, retourner 0
  if (isNaN(num) || value === null || value === undefined) {
    return '0';
  }
  
  return Math.round(num).toLocaleString('fr-FR');
}

/**
 * Formate un prix en CDF avec protection
 */
export function formatCDF(value: number | undefined | null): string {
  return `${formatNumber(value)} CDF`;
}

/**
 * Formate un prix en USD avec protection
 */
export function formatUSD(value: number | undefined | null): string {
  const num = Number(value);
  
  if (isNaN(num) || value === null || value === undefined) {
    return '$0.00';
  }
  
  return `$${num.toFixed(2)}`;
}

/**
 * Sécurise une valeur numérique (retourne 0 si invalide)
 */
export function safeNumber(value: any): number {
  const num = Number(value);
  return isNaN(num) ? 0 : num;
}

/**
 * Vérifie si une valeur est un nombre valide
 */
export function isValidNumber(value: any): boolean {
  const num = Number(value);
  return !isNaN(num) && value !== null && value !== undefined;
}
