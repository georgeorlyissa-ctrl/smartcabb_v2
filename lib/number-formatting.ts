/**
 * 🔢 FORMATAGE DES NOMBRES - SMARTCABB
 * 
 * Utilitaires pour formater les nombres de manière cohérente dans toute l'application.
 * Toutes les valeurs décimales affichent UN SEUL chiffre après la virgule.
 * 
 * @version 1.0.0
 * @date 2026-02-16
 */

/**
 * Formate une distance en km avec 1 chiffre après la virgule
 * @param distanceKm - Distance en kilomètres
 * @returns Distance formatée avec l'unité (ex: "5.6 km")
 */
export function formatDistance(distanceKm: number | string | undefined): string {
  if (distanceKm === null || distanceKm === undefined) return '0.0 km';
  
  const num = typeof distanceKm === 'string' ? parseFloat(distanceKm) : distanceKm;
  
  if (isNaN(num)) return '0.0 km';
  
  return `${num.toFixed(1)} km`;
}

/**
 * Formate une note/rating avec 1 chiffre après la virgule
 * @param rating - Note (généralement sur 5)
 * @returns Note formatée (ex: "4.5")
 */
export function formatRating(rating: number | undefined): string {
  if (rating === null || rating === undefined || isNaN(rating)) return '0.0';
  return rating.toFixed(1);
}

/**
 * Formate un montant en CDF (Franc Congolais)
 * Les montants en CDF sont toujours arrondis à l'entier (pas de décimales)
 * @param amount - Montant en CDF
 * @returns Montant formaté avec l'unité (ex: "17,500 CDF")
 */
export function formatCDF(amount: number | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) return '0 CDF';
  
  const rounded = Math.round(amount);
  return `${rounded.toLocaleString('fr-FR')} CDF`;
}

/**
 * Formate un pourcentage avec 1 chiffre après la virgule
 * @param percentage - Pourcentage (ex: 15 pour 15%)
 * @returns Pourcentage formaté (ex: "15.0%")
 */
export function formatPercentage(percentage: number | undefined): string {
  if (percentage === null || percentage === undefined || isNaN(percentage)) return '0.0%';
  return `${percentage.toFixed(1)}%`;
}

/**
 * Formate une durée en minutes avec 1 chiffre après la virgule
 * @param minutes - Durée en minutes
 * @returns Durée formatée avec l'unité (ex: "12.5 min")
 */
export function formatDuration(minutes: number | undefined): string {
  if (minutes === null || minutes === undefined || isNaN(minutes)) return '0.0 min';
  return `${minutes.toFixed(1)} min`;
}

/**
 * Formate une durée en secondes vers un format HH:MM:SS ou MM:SS
 * @param seconds - Durée en secondes
 * @returns Durée formatée (ex: "01:23:45" ou "23:45")
 */
export function formatTimeFromSeconds(seconds: number | undefined): string {
  if (seconds === null || seconds === undefined || isNaN(seconds) || seconds < 0) return '00:00';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Formate un nombre générique avec 1 chiffre après la virgule
 * @param value - Valeur numérique
 * @returns Valeur formatée avec 1 décimale
 */
export function formatDecimal(value: number | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return '0.0';
  return value.toFixed(1);
}

/**
 * Formate une vitesse en km/h avec 1 chiffre après la virgule
 * @param speedKmh - Vitesse en km/h
 * @returns Vitesse formatée avec l'unité (ex: "45.5 km/h")
 */
export function formatSpeed(speedKmh: number | undefined): string {
  if (speedKmh === null || speedKmh === undefined || isNaN(speedKmh)) return '0.0 km/h';
  return `${speedKmh.toFixed(1)} km/h`;
}
