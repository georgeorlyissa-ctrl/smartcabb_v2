/**
 * 💰 DONNÉES DE TARIFICATION SMARTCABB
 * Grille tarifaire officielle pour la République Démocratique du Congo
 * Version : Août 2026
 */

/**
 * 🚗 TYPES DE CATÉGORIES DE VÉHICULES
 */
export type VehicleCategory = 
  | 'smart_standard'   // 3 places
  | 'smart_confort'    // 3 places + Data
  | 'smart_plus'       // 7 places + Data (Familiale)
  | 'smart_business';  // 4 places VIP + Data + Rafraîchissement

/**
 * 📋 TYPES DE SERVICES
 */
export type ServiceType = 
  | 'course_heure'       // Course à l'heure
  | 'location_jour'      // Location à la journée
  | 'trajet_aeroport';   // Trajet aéroport

/**
 * 🌞🌙 MOMENTS DE LA JOURNÉE
 * Jour : 06h00 - 20h59 | Nuit : 21h00 - 05h59
 */
export type TimeOfDay = 'jour' | 'nuit';

/**
 * 💵 TAUX DE CHANGE USD → CDF
 * Valeur par défaut (peut être modifiée par l'admin)
 */
export const USD_TO_CDF = 2800;

/**
 * 💳 CRÉDITS MINIMUMS PAR CATÉGORIE DE VÉHICULE
 * = 15% du tarif de base JOUR de chaque catégorie (taux fixe 2 800 CDF/USD)
 * C'est la commission SmartCabb prélevée à chaque course.
 * Un conducteur doit disposer d'au moins ce montant pour se mettre en ligne.
 *
 *  Standard  : 15% × 6 USD   × 2 800 =  2 520 CDF
 *  Confort   : 15% × 10 USD  × 2 800 =  4 200 CDF
 *  Familiale : 15% × 12 USD  × 2 800 =  5 040 CDF
 *  Business  : 15% × 160 USD × 2 800 = 67 200 CDF
 */
export const MINIMUM_CREDITS_BY_CATEGORY = {
  smart_standard: Math.round(0.15 * 6   * USD_TO_CDF), // 2 520 CDF
  smart_confort:  Math.round(0.15 * 10  * USD_TO_CDF), // 4 200 CDF
  smart_plus:     Math.round(0.15 * 12  * USD_TO_CDF), // 5 040 CDF
  smart_business: Math.round(0.15 * 160 * USD_TO_CDF), // 67 200 CDF
} as const;

/**
 * 📊 CONFIGURATION COMPLÈTE DES TARIFS PAR CATÉGORIE
 */
export const PRICING_CONFIG = {
  smart_standard: {
    id: 'smart_standard',
    name: 'SmartCabb Standard',
    displayName: 'Standard',
    capacity: 3,
    features: ['3 places', 'Climatisation', 'GPS'],
    vehicles: ['Toyota IST', 'Toyota Ractis', 'Toyota Belta', 'Suzuki Swift', 'Toyota Vitz', 'Toyota Blade', 'Toyota Runx'],
    pricing: {
      course_heure: {
        jour: { usd: 6, cdf: 6 * USD_TO_CDF },
        nuit: { usd: 10, cdf: 10 * USD_TO_CDF }
      },
      location_jour: {
        usd: 50,
        cdf: 50 * USD_TO_CDF,
        available: true
      },
      trajet_aeroport: {
        aller: { usd: 0, cdf: 0, available: false },
        aller_retour: { usd: 0, cdf: 0, available: false }
      }
    },
    rules: {
      zone_lointaine: true, // Zone B : 1ère heure facturée double
      data_included: false,
      refreshments: false
    }
  },

  smart_confort: {
    id: 'smart_confort',
    name: 'SmartCabb Confort',
    displayName: 'Confort',
    capacity: 3,
    features: ['3 places', 'Data Internet', 'Climatisation Premium', 'GPS'],
    vehicles: ['Toyota Crown', 'Nissan Juke', 'Toyota RAV4', 'Suzuki Vitara', 'Toyota Vanguard'],
    pricing: {
      course_heure: {
        jour: { usd: 10, cdf: 10 * USD_TO_CDF },
        nuit: { usd: 15, cdf: 15 * USD_TO_CDF }
      },
      location_jour: {
        usd: 70,
        cdf: 70 * USD_TO_CDF,
        available: true
      },
      trajet_aeroport: {
        aller: { usd: 0, cdf: 0, available: false },
        aller_retour: { usd: 0, cdf: 0, available: false }
      }
    },
    rules: {
      zone_lointaine: true,
      data_included: true,
      refreshments: false
    }
  },

  smart_plus: {
    id: 'smart_plus',
    name: 'SmartCabb Familiale',
    displayName: 'Familiale',
    capacity: 7,
    features: ['7 places', 'Data Internet', 'Grand espace', 'GPS'],
    vehicles: ['Toyota Noah', 'Toyota Voxy (Boxy)'],
    pricing: {
      course_heure: {
        jour: { usd: 12, cdf: 12 * USD_TO_CDF },
        nuit: { usd: 15, cdf: 15 * USD_TO_CDF }
      },
      location_jour: {
        usd: 100,
        cdf: 100 * USD_TO_CDF,
        available: true,
        surReservation: true // Sur réservation uniquement
      },
      trajet_aeroport: {
        aller: { usd: 0, cdf: 0, available: false },
        aller_retour: { usd: 0, cdf: 0, available: false }
      }
    },
    rules: {
      zone_lointaine: true,
      data_included: true,
      refreshments: false
    }
  },

  smart_business: {
    id: 'smart_business',
    name: 'SmartCabb Business',
    displayName: 'Business',
    capacity: 4,
    features: ['4 places VIP', 'Data Internet', 'Rafraîchissements', 'Service Premium'],
    vehicles: ['Toyota Prado', 'Toyota Fortuner'],
    pricing: {
      // Business = uniquement en location journalière, pas de course à l'heure classique
      course_heure: {
        jour: { usd: 0, cdf: 0 },
        nuit: { usd: 0, cdf: 0 }
      },
      location_jour: {
        usd: 160,
        cdf: 160 * USD_TO_CDF,
        available: true,
        surReservation: true, // Sur réservation uniquement
        // Heures supplémentaires au-delà de la période louée
        overtimeHourly: { usd: 15, cdf: 15 * USD_TO_CDF }
      },
      trajet_aeroport: {
        aller: { usd: 0, cdf: 0, available: false },
        aller_retour: { usd: 0, cdf: 0, available: false }
      }
    },
    rules: {
      zone_lointaine: false, // Zone B/C non applicable — toujours en location
      data_included: true,
      refreshments: true,
      location_only: true // Uniquement en location journée
    }
  }
} as const;