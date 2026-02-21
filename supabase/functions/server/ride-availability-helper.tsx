// ============================================
// 🚕 HELPER POUR VÉRIFIER LA DISPONIBILITÉ DES CONDUCTEURS
// ============================================

import * as kv from "./kv-wrapper.tsx";

// ✅ GRILLE TARIFAIRE PAR CATÉGORIE (synchronisée avec pricing-data.ts)
const PRICING_CONFIG = {
  smart_standard: {
    course_heure: {
      jour: { usd: 7 },
      nuit: { usd: 10 }
    }
  },
  smart_confort: {
    course_heure: {
      jour: { usd: 9 },
      nuit: { usd: 15 }
    }
  },
  smart_plus: {
    course_heure: {
      jour: { usd: 15 },
      nuit: { usd: 17 }
    }
  },
  smart_business: {
    course_heure: {
      jour: { usd: 20 },  // Estimation pour business
      nuit: { usd: 25 }   // Estimation pour business
    }
  }
};

// ✅ FONCTION : Calculer le solde minimum requis selon la catégorie
function getMinimumBalanceForCategory(category: string, exchangeRate: number = 2850): number {
  const pricing = PRICING_CONFIG[category as keyof typeof PRICING_CONFIG];
  if (!pricing) {
    console.warn(`⚠️ Catégorie inconnue: ${category}, utilisation de smart_standard`);
    return PRICING_CONFIG.smart_standard.course_heure.jour.usd * exchangeRate;
  }
  
  // Utiliser le tarif de jour comme base (le plus courant)
  const hourlyRateUSD = pricing.course_heure.jour.usd;
  const minimumBalanceCDF = hourlyRateUSD * exchangeRate;
  
  return minimumBalanceCDF;
}

// Helper: Obtenir le nom lisible d'une catégorie
export function getCategoryName(category: string): string {
  const names: Record<string, string> = {
    'smart_standard': 'Smart Standard',
    'smart_confort': 'Smart Confort',
    'smart_plus': 'Smart Plus',
    'smart_business': 'Smart Business'
  };
  return names[category] || category;
}

// Hiérarchie des catégories (pour les alternatives)
export const categoryHierarchy: Record<string, string[]> = {
  'smart_standard': ['smart_confort', 'smart_plus', 'smart_business'],
  'smart_confort': ['smart_plus', 'smart_business'],
  'smart_plus': ['smart_business'],
  'smart_business': []
};

// Vérifier les conducteurs disponibles pour une catégorie
export async function checkDriversAvailability(vehicleType: string) {
  try {
    console.log('🔍 Vérification conducteurs disponibles pour:', vehicleType);

    // Récupérer tous les conducteurs
    const allDrivers = await kv.getByPrefix('driver:');
    
    if (!allDrivers || allDrivers.length === 0) {
      console.log('❌ Aucun conducteur enregistré');
      return {
        available: false,
        driversCount: 0,
        alternatives: [],
        message: 'Aucun conducteur disponible pour le moment'
      };
    }

    console.log(`📊 ${allDrivers.length} conducteurs au total dans le système`);

    // ✅ Récupérer le taux de change depuis les settings système
    let exchangeRate = 2850; // Default
    try {
      const settings = await kv.get('system_settings');
      if (settings && settings.exchangeRate) {
        exchangeRate = settings.exchangeRate;
        console.log(`💱 Taux de change: ${exchangeRate} CDF/USD`);
      }
    } catch (error) {
      console.warn('⚠️ Impossible de récupérer le taux de change, utilisation du taux par défaut');
    }

    // ✅ CORRECTION CRITIQUE : Vérifier d'abord s'il y a AU MOINS UN conducteur en ligne (toutes catégories confondues)
    const anyDriverOnline = allDrivers.some(driver => {
      if (!driver) return false;
      const isOnline = driver.is_available === true;
      const isApproved = driver.status === 'approved';
      const category = driver.vehicleInfo?.type || driver.vehicle_category || 'smart_standard';
      const minimumBalance = getMinimumBalanceForCategory(category, exchangeRate);
      const hasEnoughCredit = (driver.account_balance || 0) >= minimumBalance;
      return isOnline && isApproved && hasEnoughCredit;
    });

    console.log(`🌍 Conducteurs en ligne (toutes catégories): ${anyDriverOnline ? 'OUI' : 'NON'}`);

    // ✅ Si AUCUN conducteur n'est en ligne dans TOUTES les catégories, retourner message d'erreur
    if (!anyDriverOnline) {
      console.log('❌ AUCUN conducteur disponible dans TOUTES les catégories');
      return {
        available: false,
        driversCount: 0,
        alternatives: [],
        message: 'Aucun conducteur disponible pour le moment',
        noDriversOnlineAtAll: true // Flag pour indiquer qu'aucun conducteur n'est en ligne
      };
    }

    // Filtrer les conducteurs pour la catégorie demandée
    const driversForCategory = allDrivers.filter(driver => {
      if (!driver) return false;
      
      const category = driver.vehicleInfo?.type || driver.vehicle_category || 'smart_standard';
      const isOnline = driver.is_available === true;
      const isApproved = driver.status === 'approved';
      
      // ✅ CORRECTION CRITIQUE : Vérifier le solde minimum selon la catégorie
      const minimumBalance = getMinimumBalanceForCategory(category, exchangeRate);
      const hasEnoughCredit = (driver.account_balance || 0) >= minimumBalance;
      
      // Debug détaillé pour chaque conducteur
      if (category === vehicleType) {
        console.log(`🔍 Conducteur ${driver.name || driver.id}:`, {
          category,
          isOnline,
          isApproved,
          balance: driver.account_balance,
          minimumRequired: minimumBalance,
          hasEnoughCredit
        });
      }
      
      return isOnline && isApproved && hasEnoughCredit && category === vehicleType;
    });

    console.log(`✅ ${driversForCategory.length} conducteurs disponibles pour ${vehicleType}`);

    // Vérifier les alternatives si aucun conducteur disponible POUR CETTE CATÉGORIE
    const alternatives = [];
    
    if (driversForCategory.length === 0) {
      const alternativeCategories = categoryHierarchy[vehicleType] || [];
      
      for (const altCategory of alternativeCategories) {
        const driversForAlt = allDrivers.filter(driver => {
          if (!driver) return false;
          const category = driver.vehicleInfo?.type || driver.vehicle_category || 'smart_standard';
          const isOnline = driver.is_available === true;
          const isApproved = driver.status === 'approved';
          
          // ✅ CORRECTION : Vérifier le solde minimum pour l'alternative aussi
          const minimumBalance = getMinimumBalanceForCategory(category, exchangeRate);
          const hasEnoughCredit = (driver.account_balance || 0) >= minimumBalance;
          
          return isOnline && isApproved && hasEnoughCredit && category === altCategory;
        });
        
        if (driversForAlt.length > 0) {
          alternatives.push({
            category: altCategory,
            driversCount: driversForAlt.length,
            categoryName: getCategoryName(altCategory)
          });
        }
      }
      
      console.log(`💡 ${alternatives.length} alternatives trouvées`);
    }

    return {
      available: driversForCategory.length > 0,
      driversCount: driversForCategory.length,
      requestedCategory: vehicleType,
      requestedCategoryName: getCategoryName(vehicleType),
      alternatives: alternatives,
      message: driversForCategory.length > 0 
        ? `${driversForCategory.length} conducteur(s) disponible(s)` 
        : 'Aucun conducteur disponible dans cette catégorie',
      noDriversOnlineAtAll: false // Il y a des conducteurs en ligne, mais pas dans cette catégorie
    };

  } catch (error) {
    console.error('❌ Erreur vérification disponibilité conducteurs:', error);
    throw error;
  }

}

}

