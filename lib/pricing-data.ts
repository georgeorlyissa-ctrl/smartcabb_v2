/**
 * 💰 DONNÉES DE TARIFICATION SMARTCABB
 * Grille tarifaire officielle pour la République Démocratique du Congo
 * Version : Décembre 2024
 */

/**
 * 🚗 TYPES DE CATÉGORIES DE VÉHICULES
 */
export type VehicleCategory = 
  | 'smart_standard'   // 3 places
  | 'smart_confort'    // 3 places + Data
  | 'smart_plus'       // 4 places + Data
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
 */
export type TimeOfDay = 'jour' | 'nuit';

/**
 * 💵 TAUX DE CHANGE USD → CDF
 * Valeur par défaut (peut être modifiée par l'admin)
 */
export const USD_TO_CDF = 2800;

/**
 * 💳 CRÉDITS MINIMUMS PAR CATÉGORIE DE VÉHICULE
 * Montant minimum requis en CDF pour qu'un conducteur puisse se mettre en ligne
 * Équivalent à ~1-2 courses moyennes (réduit pour l'accessibilité)
 */
export const MINIMUM_CREDITS_BY_CATEGORY = {
  smart_standard: 5000,        // ~2 USD (1-2 courses courtes)
  smart_confort: 7000,          // ~3 USD (1-2 courses courtes)
  smart_plus: 10000,            // ~4 USD (1-2 courses courtes)
  smart_business: 50000         // ~20 USD (location partielle)
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
    vehicles: ['Toyota IST', 'Suzuki Swift', 'Toyota Vitz', 'Toyota Blade', 'Toyota Ractis', 'Toyota Runx'],
    pricing: {
      course_heure: {
        jour: { usd: 7, cdf: 7 * USD_TO_CDF },
        nuit: { usd: 10, cdf: 10 * USD_TO_CDF }
      },
      location_jour: {
        usd: 0,
        cdf: 0,
        available: false
      },
      trajet_aeroport: {
        aller: { usd: 0, cdf: 0, available: false },
        aller_retour: { usd: 0, cdf: 0, available: false }
      }
    },
    rules: {
      zone_lointaine: true, // Prix doublé en zone lointaine
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
    vehicles: ['Toyota Marx', 'Toyota Crown', 'Mercedes C-Class', 'Toyota Harrier', 'Toyota Vanguard', 'Nissan Juke'],
    pricing: {
      course_heure: {
        jour: { usd: 15, cdf: 15 * USD_TO_CDF },
        nuit: { usd: 17, cdf: 17 * USD_TO_CDF }
      },
      location_jour: {
        usd: 0,
        cdf: 0,
        available: false
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
    name: 'SmartCabb Plus',
    displayName: 'Plus',
    capacity: 4,
    features: ['4 places', 'Data Internet', 'Espace XL', 'GPS'],
    vehicles: ['Toyota Noah', 'Toyota Alphard', 'Toyota Voxy'],
    pricing: {
      course_heure: {
        jour: { usd: 15, cdf: 15 * USD_TO_CDF },
        nuit: { usd: 20, cdf: 20 * USD_TO_CDF }
      },
      location_jour: {
        usd: 0,
        cdf: 0,
        available: false
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
      course_heure: {
        jour: { usd: 0, cdf: 0 },
        nuit: { usd: 0, cdf: 0 }
      },
      location_jour: {
        usd: 160,
        cdf: 160 * USD_TO_CDF,
        available: true
      },
      trajet_aeroport: {
        aller: { usd: 0, cdf: 0, available: false },
        aller_retour: { usd: 0, cdf: 0, available: false }
      }
    },
    rules: {
      zone_lointaine: false,
      data_included: true,
      refreshments: true,
      location_only: true // Uniquement en location journée
    }
  }
} as const;
