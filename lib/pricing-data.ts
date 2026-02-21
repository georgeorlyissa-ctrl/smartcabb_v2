/**
 * 💰 DONNÉES DE CONFIGURATION DES TARIFS
 * Fichier contenant UNIQUEMENT les données brutes sans aucune logique
 * Créé pour éviter les références circulaires Rollup
 */

export type VehicleCategory = 
  | 'smart_standard' 
  | 'smart_confort' 
  | 'smart_plus' 
  | 'smart_business';

export type ServiceType = 
  | 'course_heure'      // Course par heure
  | 'location_jour'     // Location journalière
  | 'trajet_aeroport';  // Trajet aéroport

export type TimeOfDay = 'jour' | 'nuit';

/**
 * Configuration complète des tarifs par catégorie
 * AUCUNE logique ici - juste des données
 */
export const PRICING_CONFIG = {
  smart_standard: {
    name: 'Smart Cabb Standard',
    vehicles: ['IST', 'SUZUKI SWIFT', 'VITZ'],
    capacity: 3,
    features: ['Climatisé', 'Sécurisé'],
    pricing: {
      course_heure: {
        jour: { usd: 7, hours: '06:00-20:59' },
        nuit: { usd: 10, hours: '21:00-05:59' }
      },
      location_jour: {
        usd: 60,
        hours: '07:00-21:00',
        notes: 'Le carburant consommé est à charge du client'
      },
      trajet_aeroport: {
        aller: { usd: 35 },
        aller_retour: { usd: 70 },
        notes: 'Le frais de Parking est à la charge du client'
      }
    },
    rules: {
      zone_lointaine: 'Toute course qui débute ou s\'achève vers la Zone Lointaine, est facturée doublement à la 1ère heure',
      tolerance: '10 minutes de tolérance',
      attente_aeroport: '1 heure après l\'atterrissage'
    }
  },

  smart_confort: {
    name: 'Smart Cabb Confort',
    vehicles: ['BLADE', 'RACTIS', 'NISSAN JUKE', 'TERRIOS', 'RUNX'],
    capacity: 3,
    features: ['Climatisé', 'Sécurisé', 'Connexion Data gratuit'],
    pricing: {
      course_heure: {
        jour: { usd: 9, hours: '06:00-20:59' },
        nuit: { usd: 15, hours: '21:00-05:59' }
      },
      location_jour: {
        usd: 70,
        hours: '07:00-21:00',
        notes: 'Le carburant consommé est à charge du client'
      },
      trajet_aeroport: {
        aller: { usd: 40 },
        aller_retour: { usd: 80 },
        notes: 'Le frais de Parking est à la charge du client'
      }
    },
    rules: {
      zone_lointaine: 'Toute course qui débute ou s\'achève vers la Zone Lointaine, est facturée doublement à la 1ère heure',
      tolerance: '10 minutes de tolérance',
      attente_aeroport: '1 heure après l\'atterrissage'
    }
  },

  smart_plus: {
    name: 'Smart Cabb Plus ou Familia',
    vehicles: ['NOAH', 'ALPHARD', 'VOXY', 'TOYOTA MARX', 'TOYOTA CROWN', 'MERCEDES C CLASS', 'HARRIER', 'VANGUARD'],
    capacity: 7,
    features: ['Climatisé', 'Sécurisé', 'Connexion Data gratuit', 'Véhicule familial'],
    pricing: {
      course_heure: {
        jour: { usd: 15, hours: '06:00-20:59' },
        nuit: { usd: 17, hours: '21:00-05:59' }
      },
      location_jour: {
        usd: 80,
        hours: '07:00-21:00',
        notes: 'Le carburant consommé est à charge du client'
      },
      trajet_aeroport: {
        aller: { usd: 50 },
        aller_retour: { usd: 90 },
        notes: 'Le frais de Parking est à la charge du client'
      }
    },
    rules: {
      zone_lointaine: 'Toute course qui débute ou s\'achève vers la Zone Lointaine, est facturée doublement à la 1ère heure',
      tolerance: '10 minutes de tolérance',
      attente_aeroport: '1 heure après l\'atterrissage'
    }
  },

  smart_business: {
    name: 'Smart Cabb Business',
    vehicles: ['PRADO', 'FORTUNER'],
    capacity: 7,
    features: ['Climatisé', 'Sécurisé', 'Rafraichissement', 'Connexion Data gratuit'],
    pricing: {
      // ❌ PAS DE COURSE PAR HEURE pour Business (selon grille tarifaire)
      location_jour: {
        usd: 160,
        hours: '07:00-21:00',
        notes: 'Le carburant consommé est à charge du client. Après 21h00, heures supplémentaires à 30$/heure'
      },
      trajet_aeroport: {
        aller: { usd: 100 },
        aller_retour: { usd: 200 },
        notes: 'Le frais de Parking est à la charge du client'
      }
    },
    rules: {
      tolerance: '10 minutes de tolérance',
      attente_aeroport: '1 heure après l\'atterrissage',
      heures_supplementaires: '30$ par heure après 21h00'
    }
  }
} as const;

/**
 * 💳 CRÉDITS MINIMUMS PAR CATÉGORIE DE VÉHICULE
 * Montant minimum requis en CDF pour qu'un conducteur puisse se mettre en ligne
 * Basé sur le coût moyen d'une course d'une heure
 */
export const MINIMUM_CREDITS_BY_CATEGORY = {
  smart_standard: 20000,      // ~7-10 USD
  smart_confort: 25000,        // ~9-15 USD
  smart_plus: 42000,           // ~15-17 USD
  smart_business: 160000       // ~160 USD (location jour)
} as const;

/**
 * Constante USD_TO_CDF (deprecated)
 */
export const USD_TO_CDF = 2800;
