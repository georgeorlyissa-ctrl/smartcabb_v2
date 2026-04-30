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
    // ✅ FIX : Lire depuis les deux clés localStorage (config-sync écrit dans les deux)
    for (const key of ['smartcabb_config_cache', 'smartcab_system_settings']) {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.exchangeRate && typeof parsed.exchangeRate === 'number' && parsed.exchangeRate > 0) {
          return parsed.exchangeRate;
        }
      }
    }
  } catch (error) {
    console.warn('⚠️ Erreur lecture taux de conversion, utilisation valeur par défaut:', error);
  }
  return 2800; // Valeur par défaut alignée avec le backend
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
 * = 15% du tarif de base de la catégorie, calculé avec le TAUX FIXE 2 800 CDF/USD.
 * ⚠️ On utilise volontairement le taux fixe (pas dynamique) pour éviter que
 * les ajustements de taux de change de l'admin ne bloquent des drivers éligibles.
 * Ex: standard = 15% × 7 USD × 2 800 = 2 940 CDF → un driver avec 4 000 CDF est éligible.
 */
export function getMinimumCreditForCategory(category: VehicleCategory): number {
  const FIXED_RATE = 2800; // Taux de référence fixe pour le calcul du seuil
  const BASE_USD: Record<VehicleCategory, number> = {
    smart_standard: 7,    // → 2 940 CDF
    smart_confort:  9,    // → 3 780 CDF
    smart_plus:     10,   // → 4 200 CDF
    smart_business: 160,  // → 67 200 CDF
  };
  const baseUSD = BASE_USD[category] ?? 7;
  return Math.round(0.15 * baseUSD * FIXED_RATE);
}

/**
 * 💳 Vérifier si le solde d'un conducteur est suffisant pour se mettre en ligne
 */
export function hasMinimumCredit(balance: number, category: VehicleCategory): boolean {
  const minimumCredit = getMinimumCreditForCategory(category);
  return balance >= minimumCredit;
}
