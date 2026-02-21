/**
 * 💰 CONFIGURATION DES TARIFS SMARTCABB
 * Grille tarifaire officielle pour toutes les catégories de véhicules
 * 
 * Mise à jour : Décembre 2024
 * Source : Grille tarifaire SmartCabb RDC
 */

import { 
  PRICING_CONFIG,
  USD_TO_CDF,
  MINIMUM_CREDITS_BY_CATEGORY,
  type VehicleCategory,
  type ServiceType,
  type TimeOfDay
} from './pricing-data';

// ✅ Ré-exports des types UNIQUEMENT (pas les constantes)
export type { VehicleCategory, ServiceType, TimeOfDay };

// ❌ NE PAS réexporter PRICING_CONFIG ni USD_TO_CDF pour éviter la circularité
// Ces exports sont gérés par pricing.ts et pricing-data.ts

/**
 * 🔥 Fonction pour obtenir le taux de change dynamiquement
 * Utilise le taux configuré dans le panel admin
 */
function getExchangeRate(): number {
  try {
    const settingsStr = localStorage.getItem('smartcab_system_settings');
    if (settingsStr) {
      const settings = JSON.parse(settingsStr);
      if (settings.exchangeRate && typeof settings.exchangeRate === 'number') {
        return settings.exchangeRate;
      }
    }
  } catch (error) {
    console.warn('⚠️ Erreur lecture taux de conversion, utilisation valeur par défaut:', error);
  }
  // ⚠️ FALLBACK : Utiliser 2000 CDF comme valeur par défaut (à synchroniser avec le backend)
  return 2000;
}

/**
 * Calculer le prix d'une course selon la catégorie et le type de service
 */
export function calculatePrice(
  category: VehicleCategory,
  serviceType: ServiceType = 'course_heure',
  options?: {
    timeOfDay?: TimeOfDay;
    isAirportReturn?: boolean;
    zoneLointaine?: boolean;
  }
): number {
  const config = PRICING_CONFIG[category];
  
  if (!config) {
    console.error('Catégorie inconnue:', category);
    return 0;
  }

  let priceUSD = 0;

  switch (serviceType) {
    case 'course_heure':
      const timeOfDay = options?.timeOfDay || getTimeOfDay();
      priceUSD = config.pricing.course_heure[timeOfDay].usd;
      
      // Doublement si zone lointaine
      if (options?.zoneLointaine && config.rules.zone_lointaine) {
        priceUSD *= 2;
      }
      break;

    case 'location_jour':
      priceUSD = config.pricing.location_jour.usd;
      break;

    case 'trajet_aeroport':
      priceUSD = options?.isAirportReturn 
        ? config.pricing.trajet_aeroport.aller_retour.usd
        : config.pricing.trajet_aeroport.aller.usd;
      break;
  }

  // Conversion en CDF
  return Math.round(priceUSD * getExchangeRate());
}

/**
 * Obtenir le moment de la journée (jour/nuit)
 */
export function getTimeOfDay(): TimeOfDay {
  const hour = new Date().getHours();
  
  // Nuit: 21h00 à 05h59
  if (hour >= 21 || hour < 6) {
    return 'nuit';
  }
  
  // Jour: 06h00 à 20h59
  return 'jour';
}

/**
 * Obtenir les informations tarifaires pour une catégorie
 */
export function getCategoryInfo(category: VehicleCategory) {
  return PRICING_CONFIG[category];
}

/**
 * Obtenir toutes les catégories disponibles
 */
export function getAllCategories(): VehicleCategory[] {
  return Object.keys(PRICING_CONFIG) as VehicleCategory[];
}

/**
 * Formater le prix en CDF (Franc Congolais)
 */
export function formatPriceCDF(priceUSD: number): string {
  // ✅ Protection contre null/undefined/NaN
  if (priceUSD == null || isNaN(priceUSD)) {
    return '0 CDF';
  }
  
  const priceCDF = priceUSD * getExchangeRate();
  return `${Math.round(priceCDF).toLocaleString('fr-FR')} CDF`;
}

/**
 * Obtenir le tarif affiché pour l'utilisateur
 */
export function getDisplayPrice(
  category: VehicleCategory,
  serviceType: ServiceType = 'course_heure'
): string {
  const timeOfDay = getTimeOfDay();
  const priceCDF = calculatePrice(category, serviceType, { timeOfDay });
  
  // ✅ Protection contre null/undefined/NaN
  if (priceCDF == null || isNaN(priceCDF)) {
    return '0 CDF';
  }
  
  return `${priceCDF.toLocaleString('fr-FR')} CDF`;
}

/**
 * 💳 Obtenir le crédit minimum requis pour une catégorie de véhicule
 * Le conducteur doit avoir au moins ce montant pour pouvoir se mettre en ligne
 */
export function getMinimumCreditForCategory(category: VehicleCategory): number {
  return MINIMUM_CREDITS_BY_CATEGORY[category] || 20000; // Default: 20 000 CDF
}

/**
 * 💳 Vérifier si le solde d'un conducteur est suffisant pour se mettre en ligne
 */
export function hasMinimumCredit(balance: number, category: VehicleCategory): boolean {
  const minimumCredit = getMinimumCreditForCategory(category);
  return balance >= minimumCredit;
}