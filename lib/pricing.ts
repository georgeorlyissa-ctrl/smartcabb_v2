/**
 * 💰 MODULE PRINCIPAL DE PRICING SMARTCABB
 * VERSION FINALE - Import direct depuis pricing-data pour éviter les références circulaires
 */

// Import des DONNÉES depuis pricing-data
import { 
  PRICING_CONFIG,
  type VehicleCategory,
  type ServiceType,
  type TimeOfDay
} from './pricing-data';

// Import des FONCTIONS depuis pricing-config
import { 
  calculatePrice,
  getTimeOfDay,
  getCategoryInfo,
  getAllCategories,
  formatPriceCDF
} from './pricing-config';

// ✅ Réexports directs des types
export type { VehicleCategory, ServiceType, TimeOfDay };

// ✅ Réexports directs des constantes
export { PRICING_CONFIG };
export const VEHICLE_PRICING = PRICING_CONFIG; // Alias pour compatibilité

// ✅ Réexports directs des fonctions
export { 
  calculatePrice,
  getTimeOfDay,
  getCategoryInfo,
  getAllCategories,
  formatPriceCDF
};

/**
 * Récupère le taux de conversion depuis les paramètres système
 * IMPORTANT: Cette fonction lit d'abord depuis le backend, puis le localStorage en fallback
 */
export function getExchangeRate(): number {
  try {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return 2000;
    }

    for (const key of ['smartcabb_config_cache', 'smartcab_system_settings', 'smartcabb_exchange_rate']) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      if (key === 'smartcabb_exchange_rate') {
        const n = Number(raw);
        if (!isNaN(n) && n > 0) return n;
        continue;
      }
      try {
        const parsed = JSON.parse(raw);
        if (typeof parsed.exchangeRate === 'number' && parsed.exchangeRate > 0) return parsed.exchangeRate;
        if (typeof parsed.exchangeRate === 'string') {
          const n = parseFloat(parsed.exchangeRate);
          if (!isNaN(n) && n > 0) return n;
        }
      } catch {}
    }
  } catch (error) {
    console.warn('⚠️ Erreur lecture taux de conversion:', error);
  }
  return 2000;
}

/**
 * Récupère le pourcentage de gain postpaid
 */
export function getPostpaidInterestRate(): number {
  try {
    // Vérifier que localStorage est disponible (évite erreurs SSR)
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return 15; // Fallback pour SSR
    }
    
    const settingsStr = localStorage.getItem('smartcab_system_settings');
    if (settingsStr) {
      const settings = JSON.parse(settingsStr);
      if (settings.postpaidInterestRate && typeof settings.postpaidInterestRate === 'number') {
        return settings.postpaidInterestRate;
      }
    }
  } catch (error) {
    console.warn('⚠️ Erreur lecture taux postpaid:', error);
  }
  return 15;
}

/**
 * Alias pour getPostpaidInterestRate
 */
export function getCommissionRate(): number {
  try {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return 10;
    const configStr = localStorage.getItem('smartcabb_config_cache');
    if (configStr) {
      const config = JSON.parse(configStr);
      if (typeof config.commissionRate === 'number') return config.commissionRate;
    }
  } catch (e) { console.warn('⚠️ Erreur lecture commissionRate:', e); }
  return getPostpaidInterestRate();
}

/**
 * Convertit USD en CDF
 */
export function convertUSDtoCDF(amountUSD: number, exchangeRate?: number): number {
  if (amountUSD === undefined || amountUSD === null || isNaN(amountUSD)) {
    return 0;
  }
  const rate = exchangeRate || getExchangeRate();
  return Math.round(amountUSD * rate);
}

/**
 * Convertit CDF en USD
 */
export function convertCDFtoUSD(amountCDF: number, exchangeRate?: number): number {
  if (amountCDF === undefined || amountCDF === null || isNaN(amountCDF)) {
    return 0;
  }
  const rate = exchangeRate || getExchangeRate();
  return Number((amountCDF / rate).toFixed(2));
}

/**
 * Calcule la commission SmartCabb
 */
export function calculateCommission(totalAmount: number, commissionRate?: number): number {
  if (totalAmount === undefined || totalAmount === null || isNaN(totalAmount)) {
    return 0;
  }
  const rate = commissionRate !== undefined ? commissionRate : getCommissionRate();
  return Math.round(totalAmount * (rate / 100));
}

/**
 * Calcule le gain conducteur après commission
 */
export function calculateDriverEarnings(totalAmount: number, commissionRate?: number): number {
  const commission = calculateCommission(totalAmount, commissionRate);
  return totalAmount - commission;
}

/**
 * Réexports des formatters
 */
export { formatCDF, formatUSD, formatNumber } from '../utils/formatters';

/**
 * Constantes globales
 */
export const CONSTANTS = {
  get EXCHANGE_RATE() {
    return getExchangeRate();
  },
  get COMMISSION_RATE() {
    return getCommissionRate();
  },
  WALLET_DISCOUNT_THRESHOLD: 20,
  WALLET_DISCOUNT_PERCENT: 5
};

/**
 * Détermine si c'est le jour
 */
export function isDayTime(): boolean {
  const hour = new Date().getHours();
  return hour >= 6 && hour < 21;
}

/**
 * Calcule le prix horaire en USD
 */
export function calculateHourlyPrice(
  category: VehicleCategory,
  hours: number = 1,
  isNight: boolean = false
): number {
  const config = PRICING_CONFIG[category];
  if (!config) return 0;
  
  const timeOfDay = isNight ? 'nuit' : 'jour';
  const hourlyRate = config.pricing.course_heure[timeOfDay].usd;
  
  return hourlyRate * hours;
}

/**
 * Calcule le prix en CDF
 */
export function calculatePriceCDF(priceUSD: number, exchangeRate?: number): number {
  const rate = exchangeRate || getExchangeRate();
  return Math.round(priceUSD * rate);
}

/**
 * Interface pour la grille tarifaire
 */
export interface VehiclePricing {
  id: string;
  name: string;
  displayName: string;
  capacity: number;
  vehicles: string[];
  features: string[];
  hourlyRateDay: number;
  hourlyRateNight: number;
  dailyRate: number;
  airportOneWay: number;
  airportRoundTrip: number;
  dayHours: string;
  nightHours: string;
  notes: string[];
}