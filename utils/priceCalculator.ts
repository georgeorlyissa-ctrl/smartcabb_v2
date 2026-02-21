/**
 * 💰 CALCULATEUR DE PRIX SMARTCABB
 * Utilise la grille tarifaire officielle
 */

import { 
  calculatePrice, 
  getTimeOfDay, 
  getCategoryInfo
} from '../lib/pricing-config';

import {
  USD_TO_CDF,
  type VehicleCategory,
  type ServiceType 
} from '../lib/pricing-data';

/**
 * Interface pour les paramètres de calcul de prix
 */
export interface PriceCalculationParams {
  category: VehicleCategory;
  serviceType?: ServiceType;
  distanceKm?: number;
  durationMinutes?: number;
  zoneLointaine?: boolean;
  isAirportReturn?: boolean;
}

/**
 * Calculer le prix d'une course selon les paramètres
 * 
 * @param params - Paramètres de la course
 * @returns Prix en CDF
 */
export function calculateRidePrice(params: PriceCalculationParams): number {
  const {
    category,
    serviceType = 'course_heure',
    distanceKm = 0,
    durationMinutes = 0,
    zoneLointaine = false,
    isAirportReturn = false
  } = params;

  const timeOfDay = getTimeOfDay();
  
  // Calculer le prix de base
  let basePrice = calculatePrice(category, serviceType, {
    timeOfDay,
    zoneLointaine,
    isAirportReturn
  });

  // Pour les courses à l'heure, arrondir au nombre d'heures
  if (serviceType === 'course_heure' && durationMinutes > 0) {
    const hours = Math.ceil(durationMinutes / 60);
    basePrice = basePrice * hours;
  }

  return Math.round(basePrice);
}

/**
 * Estimer le prix d'une course à partir des coordonnées
 * Cette fonction est utilisée lors de la sélection sur la carte
 */
export function estimateRidePrice(
  category: VehicleCategory,
  distanceKm: number,
  estimatedDurationMinutes: number
): {
  price: number;
  breakdown: {
    basePrice: number;
    hours: number;
    timeOfDay: 'jour' | 'nuit';
    hourlyRate: number;
  };
} {
  const timeOfDay = getTimeOfDay();
  const categoryInfo = getCategoryInfo(category);
  
  if (!categoryInfo) {
    console.error('Catégorie invalide:', category);
    return {
      price: 0,
      breakdown: {
        basePrice: 0,
        hours: 0,
        timeOfDay,
        hourlyRate: 0
      }
    };
  }

  // Tarif horaire selon le moment de la journée
  const hourlyRateUSD = categoryInfo.pricing.course_heure[timeOfDay].usd;
  const hourlyRateCDF = hourlyRateUSD * USD_TO_CDF;

  // Calculer le nombre d'heures (minimum 1 heure)
  const hours = Math.max(1, Math.ceil(estimatedDurationMinutes / 60));
  
  // Prix total
  const basePrice = hourlyRateCDF * hours;
  const finalPrice = Math.round(basePrice);

  return {
    price: finalPrice,
    breakdown: {
      basePrice: hourlyRateCDF,
      hours,
      timeOfDay,
      hourlyRate: hourlyRateCDF
    }
  };
}

/**
 * Obtenir les informations de tarification pour affichage
 */
export function getPricingDisplay(category: VehicleCategory) {
  const categoryInfo = getCategoryInfo(category);
  const timeOfDay = getTimeOfDay();
  
  if (!categoryInfo) {
    return {
      name: 'Catégorie inconnue',
      hourlyRate: 0,
      hourlyRateFormatted: '0 CDF',
      timeOfDay: 'jour' as const,
      features: []
    };
  }

  const hourlyRateUSD = categoryInfo.pricing.course_heure[timeOfDay].usd;
  const hourlyRateCDF = hourlyRateUSD * USD_TO_CDF;

  return {
    name: categoryInfo.name,
    hourlyRate: hourlyRateCDF,
    hourlyRateFormatted: `${hourlyRateCDF.toLocaleString('fr-FR')} CDF`,
    timeOfDay,
    features: categoryInfo.features,
    capacity: categoryInfo.capacity,
    vehicles: categoryInfo.vehicles
  };
}

/**
 * Valider si une catégorie existe
 */
export function isValidCategory(category: string): category is VehicleCategory {
  const validCategories: VehicleCategory[] = [
    'smart_standard',
    'smart_confort',
    'smart_plus',
    'smart_business'
  ];
  
  return validCategories.includes(category as VehicleCategory);
}

/**
 * Normaliser le nom de catégorie (ajouter le préfixe smart_ si absent)
 */
export function normalizeCategory(category: string): VehicleCategory {
  if (category.startsWith('smart_')) {
    return category as VehicleCategory;
  }
  
  return `smart_${category}` as VehicleCategory;
}

/**
 * Obtenir une estimation rapide pour l'interface
 * Utilisé avant la confirmation de la course
 */
export function getQuickEstimate(
  category: VehicleCategory,
  distanceKm: number
): string {
  // Estimer la durée : ~30 km/h en moyenne en ville
  const estimatedDurationMinutes = Math.max(15, (distanceKm / 30) * 60);
  
  const { price } = estimateRidePrice(category, distanceKm, estimatedDurationMinutes);
  
  return `${price.toLocaleString('fr-FR')} CDF`;
}
