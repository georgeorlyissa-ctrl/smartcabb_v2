import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv-wrapper.ts";
import { isValidUUID, safeGetUserByIdWithCleanup } from "./uuid-validator.ts";

const app = new Hono();

// ✅ v518.1: GRILLE TARIFAIRE PAR CATÉGORIE (pour calculer le solde minimum)
const PRICING_CONFIG = {
  smart_standard: { course_heure: { jour: { usd: 7 }, nuit: { usd: 10 } } },
  smart_confort: { course_heure: { jour: { usd: 9 }, nuit: { usd: 15 } } },
  smart_plus: { course_heure: { jour: { usd: 15 }, nuit: { usd: 17 } } },
  smart_business: { course_heure: { jour: { usd: 20 }, nuit: { usd: 25 } } }
};

// ✅ v518.1: FONCTION : Calculer le solde minimum requis selon la catégorie
function getMinimumBalanceForCategory(category: string, exchangeRate: number = 2850): number {
  const pricing = PRICING_CONFIG[category as keyof typeof PRICING_CONFIG];
  if (!pricing) {
    return PRICING_CONFIG.smart_standard.course_heure.jour.usd * exchangeRate;
  }
  return pricing.course_heure.jour.usd * exchangeRate;
}

// ============================================
// 🔧 FONCTION UTILITAIRE : Récupérer un conducteur avec fallback Auth
// ============================================
async function getDriverWithAuthFallback(driverId: string) {
  // Essayer dans le KV store
  let driver = await kv.get(`driver:${driverId}`);
  
  if (driver) {
    return driver;
  }
  
  // Essayer avec profile:
  driver = await kv.get(`profile:${driverId}`);
  
  if (driver) {
    return driver;
  }
  
  // FALLBACK : Récupérer depuis Supabase Auth avec nettoyage auto des orphelins
  console.warn(`⚠️ Driver ${driverId} non trouvé dans KV, tentative depuis Auth...`);
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    
    const { data, error: authError, wasOrphan } = await safeGetUserByIdWithCleanup(supabase, driverId, 'driver');
    
    if (wasOrphan) {
      console.log('🧹 Profil orphelin nettoyé automatiquement');
      return null;
    }
    
    if (authError || !data?.user) {
      console.error('❌ Driver non trouvé dans Auth:', driverId);
      return null;
    }
    
    const user = data.user;
    console.log('✅ Driver trouvé dans Auth, création du profil KV...');
    
    // Créer l'objet conducteur depuis Auth
    driver = {
      id: driverId,
      email: user.email || '',
      full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
      phone: user.user_metadata?.phone || user.phone || '',
      status: user.user_metadata?.status || 'pending',
      driver_status: user.user_metadata?.driver_status || 'pending',
      is_available: user.user_metadata?.is_available || false,
      isOnline: user.user_metadata?.isOnline || false,
      location: user.user_metadata?.location || null,
      rating: user.user_metadata?.rating || 0,
      total_rides: user.user_metadata?.total_rides || 0,
      vehicle: user.user_metadata?.vehicle || null,
      vehicle_category: user.user_metadata?.vehicle_category || 'standard',
      created_at: user.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Sauvegarder dans KV
    await kv.set(`driver:${driverId}`, driver);
    await kv.set(`profile:${driverId}`, driver);
    console.log('✅ Profil conducteur créé dans KV depuis Auth');
    
    return driver;
    
  } catch (authError) {
    console.error('❌ Erreur récupération depuis Auth:', authError);
    return null;
  }
}

// ============================================
// 🚗 CRÉER UN NOUVEAU PROFIL CONDUCTEUR AVEC VÉHICULE
// ============================================
app.post('/create', async (c) => {
  try {
    const body = await c.req.json();
    const { 
      userId, 
      vehicleType, 
      licensePlate, 
      vehicleBrand, 
      vehicleModel,
      vehicleYear,
      vehicleColor,
      documents 
    } = body;

    console.log('🚗 Création profil conducteur pour userId:', userId);
    console.log('📝 Données reçues:', { vehicleType, licensePlate, vehicleBrand, vehicleModel });

    if (!userId) {
      return c.json({ 
        success: false, 
        error: 'userId manquant' 
      }, 400);
    }

    // Vérifier si le profil existe déjà
    const existingDriver = await kv.get(`driver:${userId}`);
    if (existingDriver) {
      console.log('⚠️ Profil conducteur existe déjà');
      return c.json({
        success: true,
        driver: existingDriver,
        message: 'Profil conducteur déjà existant'
      });
    }

    // Initialiser Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Récupérer les infos utilisateur depuis Auth
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
    
    if (userError || !userData?.user) {
      console.error('❌ Utilisateur non trouvé dans Auth:', userError);
      return c.json({ 
        success: false, 
        error: 'Utilisateur non trouvé' 
      }, 404);
    }

    const user = userData.user;

    // Créer le profil conducteur
    const driverProfile = {
      id: userId,
      user_id: userId,
      email: user.email || '',
      full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
      phone: user.user_metadata?.phone || user.phone || '',
      status: 'pending', // En attente de validation
      driver_status: 'pending',
      is_available: false,
      isOnline: false,
      location: null,
      rating: 0,
      total_rides: 0,
      total_earnings: 0,
      vehicle_category: vehicleType || 'standard',
      // ✅ Ajouter les infos du véhicule directement dans le profil (champs individuels)
      vehicle_make: vehicleBrand || '',
      vehicle_model: vehicleModel || '',
      vehicle_year: vehicleYear || new Date().getFullYear().toString(),
      vehicle_color: vehicleColor || '',
      vehicle_plate: licensePlate || '',
      vehicle_type: vehicleType || 'standard',
      // ✅ NOUVEAU : Ajouter aussi l'objet vehicle dès la création
      vehicle: {
        make: vehicleBrand || '',
        model: vehicleModel || '',
        year: vehicleYear || new Date().getFullYear().toString(),
        color: vehicleColor || '',
        license_plate: licensePlate || '',
        category: vehicleType || 'standard',
        seats: 4
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      documents: documents || {}
    };

    // Sauvegarder le profil conducteur dans KV
    await kv.set(`driver:${userId}`, driverProfile);
    await kv.set(`profile:${userId}`, driverProfile);
    console.log('✅ Profil conducteur créé dans KV');

    // Créer le véhicule si les données sont fournies
    if (licensePlate) {
      const vehicle = {
        id: `vehicle_${userId}_${Date.now()}`,
        driver_id: userId,
        type: vehicleType || 'standard',
        make: vehicleBrand || '',
        model: vehicleModel || '',
        year: vehicleYear || new Date().getFullYear().toString(),
        color: vehicleColor || '',
        plate: licensePlate,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      await kv.set(`vehicle:${vehicle.id}`, vehicle);
      console.log('✅ Véhicule créé dans KV:', vehicle.id);

      // Ajouter l'ID du véhicule au profil
      driverProfile.vehicle_id = vehicle.id;
      await kv.set(`driver:${userId}`, driverProfile);
      await kv.set(`profile:${userId}`, driverProfile);
    }

    console.log('✅ Profil conducteur et véhicule créés avec succès');

    return c.json({
      success: true,
      driver: driverProfile,
      message: 'Profil conducteur créé avec succès'
    });

  } catch (error) {
    console.error('❌ Erreur création profil conducteur:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Erreur serveur' 
    }, 500);
  }
});

// ============================================
// 📊 RÉCUPÉRER LES STATISTIQUES D'UN CONDUCTEUR
// ⚠️ IMPORTANT : Cette route DOIT être avant /:driverId sinon elle ne sera jamais atteinte
// ============================================
app.get('/:driverId/stats', async (c) => {
  try {
    const driverId = c.req.param('driverId');
    
    console.log('📊 Récupération des stats du conducteur:', driverId);

    // Récupérer les stats depuis le KV store
    const statsKey = `driver:${driverId}:stats`;
    const stats = await kv.get(statsKey);
    
    if (!stats) {
      // Pas encore de stats, retourner des valeurs par défaut
      console.log('⚠️ Aucune statistique trouvée pour ce conducteur');
      return c.json({
        success: true,
        stats: {
          totalRides: 0,
          averageRating: 0,
          totalEarnings: 0,
          totalCommissions: 0,
          ratingsCount: 0,
          ratings: []
        }
      });
    }

    // Calculer le nombre de notes
    const ratingsCount = stats.ratings?.length || 0;

    console.log(`✅ Stats récupérées: ${stats.totalRides} courses, note moyenne: ${stats.averageRating?.toFixed(1) || 0}/5`);

    return c.json({
      success: true,
      stats: {
        totalRides: stats.totalRides || 0,
        averageRating: stats.averageRating || 0,
        totalEarnings: stats.totalEarnings || 0,
        totalCommissions: stats.totalCommissions || 0,
        ratingsCount: ratingsCount,
        ratings: stats.ratings || [],
        lastRideAt: stats.lastRideAt || null
      }
    });

  } catch (error) {
    console.error('❌ Erreur récupération stats conducteur:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Erreur serveur',
      stats: {
        totalRides: 0,
        averageRating: 0,
        totalEarnings: 0,
        totalCommissions: 0,
        ratingsCount: 0,
        ratings: []
      }
    }, 500);
  }
});

// ============================================
// 🚗 RÉCUPÉRER LE PROFIL D'UN CONDUCTEUR
// ============================================
app.get('/:driverId', async (c) => {
  try {
    const driverId = c.req.param('driverId');
    
    console.log('🔍 Recherche du conducteur:', driverId);

    // Essayer d'abord dans le KV store
    let driver = await kv.get(`driver:${driverId}`);
    
    if (!driver) {
      // Fallback : essayer avec la clé profile:
      driver = await kv.get(`profile:${driverId}`);
    }

    if (!driver) {
      console.log('⚠️ Conducteur non trouvé dans KV');
      return c.json({ 
        success: false, 
        error: 'Conducteur non trouvé' 
      }, 404);
    }

    console.log('✅ Conducteur trouvé:', driver.full_name);

    // ✅ FIX CRITIQUE : Normaliser les données du véhicule
    // S'assurer que les champs individuels ET l'objet vehicle sont présents
    const vehicle = driver.vehicle || {};
    
    // Construire les données normalisées
    const normalizedDriver = {
      ...driver,
      // Champs individuels (priorité aux champs existants, sinon depuis vehicle)
      vehicle_make: driver.vehicle_make || vehicle.make || '',
      vehicle_model: driver.vehicle_model || vehicle.model || '',
      vehicle_plate: driver.vehicle_plate || vehicle.license_plate || '',
      vehicle_category: driver.vehicle_category || vehicle.category || 'smart_standard',
      vehicle_color: driver.vehicle_color || vehicle.color || '',
      vehicle_year: driver.vehicle_year || vehicle.year || new Date().getFullYear(),
      // Objet vehicle (priorité à l'objet existant, sinon depuis les champs individuels)
      vehicle: Object.keys(vehicle).length > 0 ? {
        make: vehicle.make || driver.vehicle_make || '',
        model: vehicle.model || driver.vehicle_model || '',
        license_plate: vehicle.license_plate || driver.vehicle_plate || '',
        category: vehicle.category || driver.vehicle_category || 'smart_standard',
        color: vehicle.color || driver.vehicle_color || '',
        year: vehicle.year || driver.vehicle_year || new Date().getFullYear(),
        seats: vehicle.seats || 4
      } : (driver.vehicle_make || driver.vehicle_model || driver.vehicle_plate) ? {
        make: driver.vehicle_make || '',
        model: driver.vehicle_model || '',
        license_plate: driver.vehicle_plate || '',
        category: driver.vehicle_category || 'smart_standard',
        color: driver.vehicle_color || '',
        year: driver.vehicle_year || new Date().getFullYear(),
        seats: 4
      } : {}
    };
    
    // Si des données ont été normalisées, les sauvegarder pour la prochaine fois
    if (normalizedDriver.vehicle_make || normalizedDriver.vehicle_model || normalizedDriver.vehicle_plate) {
      await kv.set(`driver:${driverId}`, normalizedDriver);
      console.log('✅ Données conducteur normalisées et sauvegardées');
    }
    
    console.log(`✅ Conducteur retourné: ${normalizedDriver.full_name} (Statut: ${normalizedDriver.status})`);
    console.log(`🚗 Véhicule: ${normalizedDriver.vehicle_make} ${normalizedDriver.vehicle_model} (${normalizedDriver.vehicle_category})`);

    return c.json({
      success: true,
      driver: normalizedDriver
    });

  } catch (error) {
    console.error('❌ Erreur récupération conducteur:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Erreur serveur' 
    }, 500);
  }
});

// ============================================
// 💰 RÉCUPÉRER LE SOLDE D'UN CONDUCTEUR
// ============================================
app.get('/:driverId/balance', async (c) => {
  try {
    const driverId = c.req.param('driverId');
    
    console.log('💰 Récupération du solde pour le conducteur:', driverId);

    // Récupérer le solde depuis le KV store
    const balanceKey = `driver:${driverId}:balance`;
    const balanceData = await kv.get(balanceKey);
    
    let balance = 0;
    
    if (balanceData) {
      // Le solde peut être stocké comme un nombre ou comme un objet { balance: number }
      balance = typeof balanceData === 'number' ? balanceData : (balanceData.balance || 0);
    } else {
      // Fallback : essayer de récupérer depuis le profil du conducteur
      const driver = await kv.get(`driver:${driverId}`) || await kv.get(`profile:${driverId}`);
      if (driver) {
        balance = driver.wallet_balance || driver.account_balance || driver.balance || 0;
      }
    }
    
    console.log(`✅ Solde récupéré: ${balance} CDF`);

    return c.json({
      success: true,
      balance: balance
    });

  } catch (error) {
    console.error('❌ Erreur récupération solde:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Erreur serveur',
      balance: 0 
    }, 500);
  }
});

// ============================================
// 💰 METTRE À JOUR LE SOLDE D'UN CONDUCTEUR
// ============================================
app.post('/:driverId/balance', async (c) => {
  try {
    const driverId = c.req.param('driverId');
    const { operation, amount } = await c.req.json();
    
    console.log('💰 Mise à jour du solde pour le conducteur:', driverId);
    console.log('   Opération:', operation);
    console.log('   Montant:', amount);

    // Validation
    if (!operation || !['add', 'subtract', 'set'].includes(operation)) {
      return c.json({ 
        success: false, 
        error: 'Opération invalide. Utilisez "add", "subtract" ou "set".' 
      }, 400);
    }

    if (typeof amount !== 'number' || isNaN(amount) || amount < 0) {
      return c.json({ 
        success: false, 
        error: 'Montant invalide' 
      }, 400);
    }

    // Récupérer le solde actuel
    const balanceKey = `driver:${driverId}:balance`;
    const balanceData = await kv.get(balanceKey);
    
    let currentBalance = 0;
    if (balanceData) {
      currentBalance = typeof balanceData === 'number' ? balanceData : (balanceData.balance || 0);
    }

    // Calculer le nouveau solde
    let newBalance = currentBalance;
    
    if (operation === 'add') {
      newBalance = currentBalance + amount;
    } else if (operation === 'subtract') {
      newBalance = currentBalance - amount;
      if (newBalance < 0) newBalance = 0; // Ne pas permettre de solde négatif
    } else if (operation === 'set') {
      newBalance = amount;
    }

    console.log(`💰 Solde: ${currentBalance} CDF → ${newBalance} CDF`);

    // Sauvegarder le nouveau solde
    await kv.set(balanceKey, {
      balance: newBalance,
      updated_at: new Date().toISOString()
    });

    console.log(`✅ Solde mis à jour: ${newBalance} CDF`);

    return c.json({
      success: true,
      balance: newBalance,
      operation: operation,
      amount: amount
    });

  } catch (error) {
    console.error('❌ Erreur mise à jour solde:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Erreur serveur',
      balance: 0 
    }, 500);
  }
});

// ============================================
// 🚗 METTRE À JOUR LE PROFIL D'UN CONDUCTEUR
// ============================================
app.post('/update', async (c) => {
  try {
    const body = await c.req.json();
    const { driverId, updates } = body;

    console.log('🔥🔥🔥 ========== DÉBUT UPDATE CONDUCTEUR ==========');
    console.log('🆔 Driver ID:', driverId);
    console.log('📝 Updates à appliquer:', JSON.stringify(updates, null, 2));

    if (!driverId || !updates) {
      return c.json({ 
        success: false, 
        error: 'Données manquantes' 
      }, 400);
    }

    // Initialiser Supabase client avec service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !serviceRoleKey) {
      console.error('❌ Clés Supabase manquantes');
      return c.json({ 
        success: false, 
        error: 'Configuration serveur invalide' 
      }, 500);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Récupérer le conducteur depuis le KV store
    const driverKey = `driver:${driverId}`;
    let currentDriver = await kv.get(driverKey);
    
    if (!currentDriver) {
      console.warn(`⚠️ Conducteur ${driverId} non trouvé dans KV, tentative de récupération depuis Auth...`);
      
      // FALLBACK : Récupérer depuis Supabase Auth avec nettoyage auto des orphelins
      try {
        const { data, error: authError, wasOrphan } = await safeGetUserByIdWithCleanup(supabase, driverId, 'driver');
        
        if (wasOrphan) {
          console.log('🧹 Profil orphelin nettoyé automatiquement');
          return c.json({ 
            success: false, 
            error: 'Conducteur introuvable (profil orphelin supprimé)' 
          }, 404);
        }
        
        if (authError || !data?.user) {
          console.error('❌ Erreur Auth:', authError);
          throw new Error('Conducteur introuvable dans Auth');
        }
        
        const user = data.user;
        console.log('✅ Conducteur trouvé dans Auth, création du profil KV...');
        
        // Créer l'objet conducteur depuis les données Auth
        currentDriver = {
          id: driverId,
          email: user.email || '',
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
          phone: user.user_metadata?.phone || user.phone || '',
          status: user.user_metadata?.status || 'pending',
          driver_status: user.user_metadata?.driver_status || user.user_metadata?.status || 'pending',
          is_available: user.user_metadata?.is_available || false,
          isOnline: user.user_metadata?.isOnline || false,
          location: user.user_metadata?.location || null,
          vehicle: {
            make: user.user_metadata?.vehicle_make || '',
            model: user.user_metadata?.vehicle_model || '',
            color: user.user_metadata?.vehicle_color || '',
            license_plate: user.user_metadata?.vehicle_plate || '',
            category: user.user_metadata?.vehicle_category || 'standard',
            year: new Date().getFullYear(),
            seats: 4
          },
          vehicle_make: user.user_metadata?.vehicle_make || '',
          vehicle_model: user.user_metadata?.vehicle_model || '',
          vehicle_plate: user.user_metadata?.vehicle_plate || '',
          vehicle_category: user.user_metadata?.vehicle_category || 'standard',
          rating: 5.0,
          total_rides: 0,
          wallet_balance: 0,
          balance: 0,
          created_at: user.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        // Sauvegarder dans le KV
        await kv.set(driverKey, currentDriver);
        await kv.set(`profile:${driverId}`, currentDriver);
        console.log('✅ Profil conducteur créé dans KV depuis Auth');
        
      } catch (authError) {
        console.error('❌ Erreur récupération depuis Auth:', authError);
        return c.json({ 
          success: false, 
          error: 'Conducteur introuvable' 
        }, 404);
      }
    }

    console.log('✅ Conducteur trouvé dans KV store');
    console.log('📊 Statut ACTUEL:', currentDriver.status);
    console.log('📊 Nouveau statut:', updates.status);

    // Fusionner les mises à jour
    const updatedDriver = {
      ...currentDriver,
      ...updates,
      updated_at: new Date().toISOString()
    };

    console.log('🔄 Objet conducteur fusionné:', JSON.stringify(updatedDriver, null, 2));

    // Sauvegarder dans le KV store
    console.log(`💾 Sauvegarde dans KV store avec la clé: ${driverKey}`);
    await kv.set(driverKey, updatedDriver);
    console.log('✅ Conducteur mis à jour dans KV store');
    
    // 🔥 FIX CRITIQUE : SYNCHRONISER AUSSI profile:${driverId}
    const profileKey = `profile:${driverId}`;
    console.log(`💾 SYNCHRONISATION CRITIQUE : Sauvegarde AUSSI dans ${profileKey}`);
    await kv.set(profileKey, updatedDriver);
    console.log('✅ Profil synchronisé dans KV store');
    
    // Vérifier immédiatement que la sauvegarde a fonctionné
    const verifyDriver = await kv.get(driverKey);
    const verifyProfile = await kv.get(profileKey);
    
    if (verifyDriver && verifyDriver.status === updates.status) {
      console.log('✅ VÉRIFICATION : Statut correctement sauvegardé dans driver: KV !');
      console.log('   Statut vérifié:', verifyDriver.status);
    } else {
      console.error('❌ ERREUR CRITIQUE : Le statut n\'a PAS été sauvegardé dans driver: !');
      console.error('   Statut attendu:', updates.status);
      console.error('   Statut trouvé:', verifyDriver?.status);
    }
    
    if (verifyProfile && verifyProfile.status === updates.status) {
      console.log('✅ VÉRIFICATION : Statut correctement sauvegardé dans profile: KV !');
      console.log('   Statut vérifié:', verifyProfile.status);
    } else {
      console.error('❌ ERREUR CRITIQUE : Le statut n\'a PAS été sauvegardé dans profile: !');
      console.error('   Statut attendu:', updates.status);
      console.error('   Statut trouvé:', verifyProfile?.status);
    }

    // ✅ SYNCHRONISATION CRITIQUE : Mettre à jour le statut dans Auth user_metadata
    if (updates.status) {
      try {
        console.log('🔄 Synchronisation du statut dans Auth user_metadata...');
        console.log('📊 Statut à synchroniser:', updates.status);
        
        const { data, error: authError } = await supabase.auth.admin.updateUserById(
          driverId,
          {
            user_metadata: {
              status: updates.status,
              driver_status: updates.status,
              updated_at: new Date().toISOString()
            }
          }
        );
        
        if (authError) {
          console.error('❌ Erreur synchro Auth:', authError);
        } else {
          console.log('✅ Statut synchronisé dans Auth user_metadata');
          console.log('📋 Auth user_metadata:', data.user?.user_metadata);
        }
      } catch (authSyncError) {
        console.error('❌ Exception synchro Auth:', authSyncError);
        // Continue même si la synchro échoue
      }
    }
    
    // ✅ SYNCHRONISATION POSTGRES : Mettre à jour la table drivers
    try {
      console.log('🔄 Synchronisation dans table Postgres drivers...');
      
      // ✅ FIX CRITIQUE : Utiliser user_id au lieu de id pour la table drivers
      // La table drivers utilise user_id comme référence à l'utilisateur Auth
      const { data: existingDriver, error: checkError } = await supabase
        .from('drivers')
        .select('id, user_id')
        .eq('user_id', driverId)
        .maybeSingle();
      
      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = not found
        console.error('❌ Erreur vérification Postgres:', checkError);
      } else if (existingDriver) {
        // Le conducteur existe, faire un UPDATE
        console.log('✅ Conducteur trouvé dans Postgres, UPDATE...');
        
        // 🔥 FIX: Construire l'objet UPDATE avec SEULEMENT les champs que PostgreSQL accepte
        const pgUpdateData: any = {
          updated_at: new Date().toISOString()
        };
        
        // Ajouter les champs seulement s'ils sont présents dans updates
        if (updates.status) pgUpdateData.status = updates.status;
        if (updates.full_name) pgUpdateData.full_name = updates.full_name;
        if (updates.email) pgUpdateData.email = updates.email;
        if (updates.phone) pgUpdateData.phone = updates.phone;
        if (updates.is_available !== undefined) pgUpdateData.is_available = updates.is_available;
        
        console.log('📝 Données à UPDATE dans Postgres:', JSON.stringify(pgUpdateData, null, 2));
        
        const { error: pgError } = await supabase
          .from('drivers')
          .update(pgUpdateData)
          .eq('user_id', driverId);
        
        if (pgError) {
          console.error('❌ Erreur UPDATE Postgres:', pgError);
          console.error('   Code:', pgError.code);
          console.error('   Message:', pgError.message);
          console.error('   Details:', pgError.details);
        } else {
          console.log('✅ Table drivers mise à jour dans Postgres (UPDATE)');
        }
      } else {
        // Le conducteur n'existe pas, faire un INSERT
        console.log('⚠️ Conducteur absent de Postgres, INSERT...');
        
        // 🔥 FIX: Construire l'objet INSERT avec les champs de base
        const pgInsertData: any = {
          user_id: driverId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        // Ajouter les champs depuis updatedDriver (pas updates!)
        if (updatedDriver.status) pgInsertData.status = updatedDriver.status;
        if (updatedDriver.full_name) pgInsertData.full_name = updatedDriver.full_name;
        if (updatedDriver.email) pgInsertData.email = updatedDriver.email;
        if (updatedDriver.phone) pgInsertData.phone = updatedDriver.phone;
        if (updatedDriver.is_available !== undefined) pgInsertData.is_available = updatedDriver.is_available;
        
        console.log('📝 Données à INSERT dans Postgres:', JSON.stringify(pgInsertData, null, 2));
        
        const { error: insertError } = await supabase
          .from('drivers')
          .insert(pgInsertData);
        
        if (insertError) {
          console.error('❌ Erreur INSERT Postgres:', insertError);
          console.error('   Code:', insertError.code);
          console.error('   Message:', insertError.message);
          console.error('   Details:', insertError.details);
        } else {
          console.log('✅ Conducteur créé dans Postgres (INSERT)');
        }
      }
    } catch (pgSyncError) {
      console.error('❌ Exception synchro Postgres:', pgSyncError);
      // Continue même si la synchro échoue
    }

    console.log('🔥🔥🔥 ========== FIN UPDATE CONDUCTEUR (SUCCÈS) ==========');

    return c.json({
      success: true,
      driver: updatedDriver
    });

  } catch (error) {
    console.error('🔥🔥🔥 ========== FIN UPDATE CONDUCTEUR (ERREUR) ==========');
    console.error('❌ Erreur mise à jour conducteur:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Erreur serveur' 
    }, 500);
  }
});

// ============================================
// 🚗 METTRE À JOUR LE PROFIL D'UN CONDUCTEUR (Route RESTful)
// ============================================
app.post('/update/:id', async (c) => {
  try {
    const driverId = c.req.param('id');
    const updates = await c.req.json();

    console.log('🔥🔥🔥 ========== DÉBUT UPDATE CONDUCTEUR (RESTful) ==========');
    console.log('🆔 Driver ID:', driverId);
    console.log('📝 Updates à appliquer:', JSON.stringify(updates, null, 2));

    if (!driverId || !updates) {
      return c.json({ 
        success: false, 
        error: 'Données manquantes' 
      }, 400);
    }

    // Initialiser Supabase client avec service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !serviceRoleKey) {
      console.error('❌ Clés Supabase manquantes');
      return c.json({ 
        success: false, 
        error: 'Configuration serveur invalide' 
      }, 500);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Récupérer le conducteur depuis le KV store
    const driverKey = `driver:${driverId}`;
    let currentDriver = await kv.get(driverKey);
    
    if (!currentDriver) {
      console.warn(`⚠️ Conducteur ${driverId} non trouvé dans KV, tentative de récupération depuis Auth...`);
      
      // FALLBACK : Récupérer depuis Supabase Auth avec nettoyage auto des orphelins
      try {
        const { data, error: authError, wasOrphan } = await safeGetUserByIdWithCleanup(supabase, driverId, 'driver');
        
        if (wasOrphan) {
          console.log('🧹 Profil orphelin nettoyé automatiquement');
          return c.json({ 
            success: false, 
            error: 'Conducteur introuvable (profil orphelin supprimé)' 
          }, 404);
        }
        
        if (authError || !data?.user) {
          console.error('❌ Erreur Auth:', authError);
          throw new Error('Conducteur introuvable dans Auth');
        }
        
        const user = data.user;
        console.log('✅ Conducteur trouvé dans Auth, création du profil KV...');
        
        // Créer l'objet conducteur depuis les données Auth
        currentDriver = {
          id: driverId,
          email: user.email || '',
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
          phone: user.user_metadata?.phone || user.phone || '',
          status: user.user_metadata?.status || 'pending',
          driver_status: user.user_metadata?.driver_status || user.user_metadata?.status || 'pending',
          is_available: user.user_metadata?.is_available || false,
          isOnline: user.user_metadata?.isOnline || false,
          location: user.user_metadata?.location || null,
          vehicle: {
            make: user.user_metadata?.vehicle_make || '',
            model: user.user_metadata?.vehicle_model || '',
            color: user.user_metadata?.vehicle_color || '',
            license_plate: user.user_metadata?.vehicle_plate || '',
            category: user.user_metadata?.vehicle_category || 'standard',
            year: new Date().getFullYear(),
            seats: 4
          },
          vehicle_make: user.user_metadata?.vehicle_make || '',
          vehicle_model: user.user_metadata?.vehicle_model || '',
          vehicle_plate: user.user_metadata?.vehicle_plate || '',
          vehicle_category: user.user_metadata?.vehicle_category || 'standard',
          rating: 5.0,
          total_rides: 0,
          wallet_balance: 0,
          balance: 0,
          created_at: user.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        // Sauvegarder dans le KV
        await kv.set(driverKey, currentDriver);
        await kv.set(`profile:${driverId}`, currentDriver);
        console.log('✅ Profil conducteur créé dans KV depuis Auth');
        
      } catch (authError) {
        console.error('❌ Erreur récupération depuis Auth:', authError);
        return c.json({ 
          success: false, 
          error: 'Conducteur introuvable' 
        }, 404);
      }
    }

    console.log('✅ Conducteur trouvé dans KV store');
    console.log('📊 Statut ACTUEL:', currentDriver.status);
    console.log('📊 Nouveau statut:', updates.status);

    // Fusionner les mises à jour
    const updatedDriver = {
      ...currentDriver,
      ...updates,
      updated_at: new Date().toISOString()
    };

    console.log('🔄 Objet conducteur fusionné:', JSON.stringify(updatedDriver, null, 2));

    // Sauvegarder dans le KV store
    console.log(`💾 Sauvegarde dans KV store avec la clé: ${driverKey}`);
    await kv.set(driverKey, updatedDriver);
    console.log('✅ Conducteur mis à jour dans KV store');
    
    // 🔥 FIX CRITIQUE : SYNCHRONISER AUSSI profile:${driverId}
    const profileKey = `profile:${driverId}`;
    console.log(`💾 SYNCHRONISATION CRITIQUE : Sauvegarde AUSSI dans ${profileKey}`);
    await kv.set(profileKey, updatedDriver);
    console.log('✅ Profil synchronisé dans KV store');
    
    // Vérifier immédiatement que la sauvegarde a fonctionné
    const verifyDriver = await kv.get(driverKey);
    const verifyProfile = await kv.get(profileKey);
    
    if (verifyDriver && verifyDriver.status === updates.status) {
      console.log('✅ VÉRIFICATION : Statut correctement sauvegardé dans driver: KV !');
      console.log('   Statut vérifié:', verifyDriver.status);
    } else {
      console.error('❌ ERREUR CRITIQUE : Le statut n\'a PAS été sauvegardé dans driver: !');
      console.error('   Statut attendu:', updates.status);
      console.error('   Statut trouvé:', verifyDriver?.status);
    }
    
    if (verifyProfile && verifyProfile.status === updates.status) {
      console.log('✅ VÉRIFICATION : Statut correctement sauvegardé dans profile: KV !');
      console.log('   Statut vérifié:', verifyProfile.status);
    } else {
      console.error('❌ ERREUR CRITIQUE : Le statut n\'a PAS été sauvegardé dans profile: !');
      console.error('   Statut attendu:', updates.status);
      console.error('   Statut trouvé:', verifyProfile?.status);
    }

    // ✅ SYNCHRONISATION CRITIQUE : Mettre à jour le statut dans Auth user_metadata
    if (updates.status) {
      try {
        console.log('🔄 Synchronisation du statut dans Auth user_metadata...');
        console.log('📊 Statut à synchroniser:', updates.status);
        
        const { data, error: authError } = await supabase.auth.admin.updateUserById(
          driverId,
          {
            user_metadata: {
              status: updates.status,
              driver_status: updates.status,
              updated_at: new Date().toISOString()
            }
          }
        );
        
        if (authError) {
          console.error('❌ Erreur synchro Auth:', authError);
        } else {
          console.log('✅ Statut synchronisé dans Auth user_metadata');
          console.log('📋 Auth user_metadata:', data.user?.user_metadata);
        }
      } catch (authSyncError) {
        console.error('❌ Exception synchro Auth:', authSyncError);
        // Continue même si la synchro échoue
      }
    }
    
    // ✅ SYNCHRONISATION POSTGRES : Mettre à jour la table drivers
    try {
      console.log('🔄 Synchronisation dans table Postgres drivers...');
      
      // ✅ FIX CRITIQUE : Utiliser user_id au lieu de id pour la table drivers
      // La table drivers utilise user_id comme référence à l'utilisateur Auth
      const { data: existingDriver, error: checkError } = await supabase
        .from('drivers')
        .select('id, user_id')
        .eq('user_id', driverId)
        .maybeSingle();
      
      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = not found
        console.error('❌ Erreur vérification Postgres:', checkError);
      } else if (existingDriver) {
        // Le conducteur existe, faire un UPDATE
        console.log('✅ Conducteur trouvé dans Postgres, UPDATE...');
        
        // 🔥 FIX: Construire l'objet UPDATE avec SEULEMENT les champs que PostgreSQL accepte
        const pgUpdateData: any = {
          updated_at: new Date().toISOString()
        };
        
        // Ajouter les champs seulement s'ils sont présents dans updates
        if (updates.status) pgUpdateData.status = updates.status;
        if (updates.full_name) pgUpdateData.full_name = updates.full_name;
        if (updates.email) pgUpdateData.email = updates.email;
        if (updates.phone) pgUpdateData.phone = updates.phone;
        if (updates.is_available !== undefined) pgUpdateData.is_available = updates.is_available;
        
        console.log('📝 Données à UPDATE dans Postgres:', JSON.stringify(pgUpdateData, null, 2));
        
        const { error: pgError } = await supabase
          .from('drivers')
          .update(pgUpdateData)
          .eq('user_id', driverId);
        
        if (pgError) {
          console.error('❌ Erreur UPDATE Postgres:', pgError);
          console.error('   Code:', pgError.code);
          console.error('   Message:', pgError.message);
          console.error('   Details:', pgError.details);
        } else {
          console.log('✅ Table drivers mise à jour dans Postgres (UPDATE)');
        }
      } else {
        // Le conducteur n'existe pas, faire un INSERT
        console.log('⚠️ Conducteur absent de Postgres, INSERT...');
        
        // 🔥 FIX: Construire l'objet INSERT avec les champs de base
        const pgInsertData: any = {
          user_id: driverId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        // Ajouter les champs depuis updatedDriver (pas updates!)
        if (updatedDriver.status) pgInsertData.status = updatedDriver.status;
        if (updatedDriver.full_name) pgInsertData.full_name = updatedDriver.full_name;
        if (updatedDriver.email) pgInsertData.email = updatedDriver.email;
        if (updatedDriver.phone) pgInsertData.phone = updatedDriver.phone;
        if (updatedDriver.is_available !== undefined) pgInsertData.is_available = updatedDriver.is_available;
        
        console.log('📝 Données à INSERT dans Postgres:', JSON.stringify(pgInsertData, null, 2));
        
        const { error: insertError } = await supabase
          .from('drivers')
          .insert(pgInsertData);
        
        if (insertError) {
          console.error('❌ Erreur INSERT Postgres:', insertError);
          console.error('   Code:', insertError.code);
          console.error('   Message:', insertError.message);
          console.error('   Details:', insertError.details);
        } else {
          console.log('✅ Conducteur créé dans Postgres (INSERT)');
        }
      }
    } catch (pgSyncError) {
      console.error('❌ Exception synchro Postgres:', pgSyncError);
      // Continue même si la synchro échoue
    }

    console.log('🔥🔥🔥 ========== FIN UPDATE CONDUCTEUR (SUCCÈS) ==========');

    return c.json({
      success: true,
      driver: updatedDriver
    });

  } catch (error) {
    console.error('🔥🔥🔥 ========== FIN UPDATE CONDUCTEUR (ERREUR) ==========');
    console.error('❌ Erreur mise à jour conducteur:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Erreur serveur' 
    }, 500);
  }
});

// ============================================
// 🚗 METTRE À JOUR LA POSITION GPS DU CONDUCTEUR
// ============================================
app.post('/location', async (c) => {
  try {
    const body = await c.req.json();
    const { driverId, location } = body;

    if (!driverId || !location || !location.lat || !location.lng) {
      return c.json({ 
        success: false, 
        error: 'Données de localisation invalides' 
      }, 400);
    }

    // Récupérer le conducteur
    const driverKey = `driver:${driverId}`;
    let driver = await kv.get(driverKey);

    if (!driver) {
      console.warn(`⚠️ Driver ${driverId} non trouvé dans KV, tentative depuis Auth...`);
      
      // FALLBACK : Récupérer depuis Supabase Auth avec nettoyage auto des orphelins
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        const supabase = createClient(supabaseUrl, serviceRoleKey);
        
        const { data, error: authError, wasOrphan } = await safeGetUserByIdWithCleanup(supabase, driverId, 'driver');
        
        if (wasOrphan) {
          console.log('🧹 Profil orphelin nettoyé automatiquement');
          return c.json({ 
            success: false, 
            error: 'Conducteur non trouvé (profil orphelin supprimé)' 
          }, 404);
        }
        
        if (authError || !data?.user) {
          console.error('❌ Driver non trouvé dans Auth:', driverId);
          return c.json({ 
            success: false, 
            error: 'Conducteur non trouvé' 
          }, 404);
        }
        
        const user = data.user;
        console.log('✅ Driver trouvé dans Auth, création du profil KV...');
        
        // Créer l'objet conducteur depuis Auth
        driver = {
          id: driverId,
          email: user.email || '',
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
          phone: user.user_metadata?.phone || user.phone || '',
          status: user.user_metadata?.status || 'pending',
          driver_status: user.user_metadata?.driver_status || 'pending',
          is_available: user.user_metadata?.is_available || false,
          isOnline: user.user_metadata?.isOnline || false,
          location: user.user_metadata?.location || null,
          rating: user.user_metadata?.rating || 0,
          total_rides: user.user_metadata?.total_rides || 0,
          vehicle: user.user_metadata?.vehicle || null,
          vehicle_category: user.user_metadata?.vehicle_category || 'standard',
          created_at: user.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        // Sauvegarder dans KV
        await kv.set(driverKey, driver);
        await kv.set(`profile:${driverId}`, driver);
        console.log('✅ Profil conducteur créé dans KV depuis Auth');
        
      } catch (authError) {
        console.error('❌ Erreur récupération depuis Auth:', authError);
        return c.json({ 
          success: false, 
          error: 'Conducteur non trouvé' 
        }, 404);
      }
    }

    // Mettre à jour la position
    driver.location = {
      lat: location.lat,
      lng: location.lng,
      address: location.address || '',
      updated_at: new Date().toISOString()
    };
    driver.updated_at = new Date().toISOString();

    // Sauvegarder
    await kv.set(driverKey, driver);
    await kv.set(`profile:${driverId}`, driver);

    return c.json({
      success: true,
      message: 'Position mise à jour'
    });

  } catch (error) {
    console.error('❌ Erreur mise à jour position:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Erreur serveur' 
    }, 500);
  }
});

// ============================================
// 🚗 METTRE À JOUR LA POSITION GPS (ROUTE ALTERNATIVE)
// ============================================
app.post('/update-driver-location', async (c) => {
  try {
    const body = await c.req.json();
    const { driverId, location } = body;

    console.log('📍 Mise à jour position driver:', driverId, location);

    if (!driverId || !location || !location.lat || !location.lng) {
      return c.json({ 
        success: false, 
        error: 'Données de localisation invalides' 
      }, 400);
    }

    // Récupérer le conducteur avec fallback Auth
    const driver = await getDriverWithAuthFallback(driverId);
    
    if (!driver) {
      return c.json({ 
        success: false, 
        error: 'Conducteur non trouvé' 
      }, 404);
    }

    // Mettre à jour la position
    driver.location = {
      lat: location.lat,
      lng: location.lng,
      address: location.address || '',
      updated_at: new Date().toISOString()
    };
    driver.updated_at = new Date().toISOString();

    // Sauvegarder dans les deux clés
    const driverKey = `driver:${driverId}`;
    await kv.set(driverKey, driver);
    await kv.set(`profile:${driverId}`, driver);

    console.log('✅ Position GPS mise à jour avec succès');

    return c.json({
      success: true,
      message: 'Position mise à jour'
    });

  } catch (error) {
    console.error('❌ Erreur mise à jour position:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Erreur serveur' 
    }, 500);
  }
});

// ============================================
// 💓 HEARTBEAT - Maintenir le statut en ligne
// ============================================
app.post('/heartbeat', async (c) => {
  try {
    const body = await c.req.json();
    const { driverId, isOnline, location, lastSeen } = body;

    console.log('💓 Heartbeat reçu:', driverId, 'isOnline:', isOnline);

    if (!driverId) {
      return c.json({ 
        success: false, 
        error: 'ID conducteur manquant'
      }, 400);
    }

    // Récupérer le conducteur avec fallback Auth
    const driver = await getDriverWithAuthFallback(driverId);
    
    if (!driver) {
      return c.json({ 
        success: false, 
        error: 'Conducteur non trouvé' 
      }, 404);
    }

    // Mettre à jour le statut en ligne
    driver.isOnline = isOnline;
    driver.is_available = isOnline;
    driver.lastSeen = lastSeen || new Date().toISOString();
    
    // Mettre à jour la position si fournie
    if (location && location.lat && location.lng) {
      driver.location = {
        lat: location.lat,
        lng: location.lng,
        address: location.address || '',
        updated_at: new Date().toISOString()
      };
    }
    
    driver.updated_at = new Date().toISOString();

    // Sauvegarder dans les deux clés
    const driverKey = `driver:${driverId}`;
    await kv.set(driverKey, driver);
    await kv.set(`profile:${driverId}`, driver);

    console.log(`✅ Heartbeat traité: ${isOnline ? 'EN LIGNE' : 'HORS LIGNE'}`);

    return c.json({
      success: true,
      message: 'Heartbeat enregistré',
      isOnline: driver.isOnline
    });

  } catch (error) {
    console.error('❌ Erreur heartbeat:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Erreur serveur' 
    }, 500);
  }
});

// ============================================
// 🔄 TOGGLE ONLINE STATUS - Activer/Désactiver le statut en ligne
// ============================================
app.post('/toggle-online-status', async (c) => {
  try {
    const body = await c.req.json();
    const { driverId, isOnline, location } = body;

    console.log('🔄 Toggle online status:', driverId, 'isOnline:', isOnline);

    if (!driverId) {
      return c.json({ 
        success: false, 
        error: 'ID conducteur manquant' 
      }, 400);
    }

    // Récupérer le conducteur avec fallback Auth
    const driver = await getDriverWithAuthFallback(driverId);
    
    if (!driver) {
      return c.json({ 
        success: false, 
        error: 'Conducteur non trouvé' 
      }, 404);
    }

    // ✅ v518.1: VÉRIFIER LE SOLDE AVANT DE PERMETTRE LA MISE EN LIGNE
    if (isOnline) {
      // ✅ FIX CRITIQUE : Récupérer le solde depuis la clé séparée (comme dans /:driverId/balance)
      const balanceKey = `driver:${driverId}:balance`;
      const balanceData = await kv.get(balanceKey);
      
      let accountBalance = 0;
      
      if (balanceData) {
        // Le solde peut être stocké comme un nombre ou comme un objet { balance: number }
        accountBalance = typeof balanceData === 'number' ? balanceData : (balanceData.balance || 0);
      } else {
        // Fallback : essayer de récupérer depuis le profil du conducteur
        accountBalance = driver.wallet_balance || driver.account_balance || driver.balance || driver.accountBalance || 0;
      }
      
      const vehicleCategory = driver.vehicle?.category || driver.vehicleCategory || 'smart_standard';
      
      // Calculer le solde minimum requis selon la catégorie
      const exchangeRate = 2850; // Taux de change par défaut
      const minimumBalance = getMinimumBalanceForCategory(vehicleCategory, exchangeRate);
      
      console.log(`🔍 Vérification solde conducteur: ${accountBalance} CDF (minimum requis: ${minimumBalance} CDF)`);
      console.log(`🔍 Solde récupéré depuis: ${balanceData ? 'clé balance séparée' : 'profil conducteur'}`);
      
      if (accountBalance < minimumBalance) {
        console.warn(`❌ Solde insuffisant: ${accountBalance} < ${minimumBalance} CDF`);
        return c.json({
          success: false,
          error: 'Solde insuffisant',
          message: `Votre solde (${accountBalance.toLocaleString()} CDF) est insuffisant. Minimum requis: ${minimumBalance.toLocaleString()} CDF pour votre catégorie ${vehicleCategory}.`,
          currentBalance: accountBalance,
          minimumRequired: minimumBalance,
          shortfall: minimumBalance - accountBalance
        }, 400);
      }
      
      console.log(`✅ Solde suffisant: ${accountBalance} >= ${minimumBalance} CDF`);
    }

    // Mettre à jour le statut en ligne
    driver.isOnline = isOnline;
    driver.is_available = isOnline;
    driver.lastSeen = new Date().toISOString();
    
    // Mettre à jour la position si fournie
    if (location && location.lat && location.lng) {
      driver.location = {
        lat: location.lat,
        lng: location.lng,
        address: location.address || '',
        updated_at: new Date().toISOString()
      };
    }
    
    driver.updated_at = new Date().toISOString();

    // Sauvegarder dans les deux clés
    const driverKey = `driver:${driverId}`;
    await kv.set(driverKey, driver);
    await kv.set(`profile:${driverId}`, driver);

    console.log(`✅ Statut changé: ${isOnline ? 'EN LIGNE ✅' : 'HORS LIGNE ❌'}`);

    return c.json({
      success: true,
      message: isOnline ? 'Vous êtes maintenant en ligne' : 'Vous êtes maintenant hors ligne',
      isOnline: driver.isOnline,
      driver: {
        id: driver.id,
        isOnline: driver.isOnline,
        is_available: driver.is_available,
        location: driver.location
      }
    });

  } catch (error) {
    console.error('❌ Erreur toggle online status:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Erreur serveur' 
    }, 500);
  }
});

// ============================================
// 🚗 RÉCUPÉRER TOUS LES CONDUCTEURS
// ============================================
app.get('/', async (c) => {
  try {
    console.log('📋 Récupération de tous les conducteurs...');
    
    const drivers = await kv.getByPrefix('driver:');
    
    // ✅ FIX : Ajouter status si manquant (fallback sur driver_status)
    // ✅ FIX : Créer l'objet vehicle s'il n'existe pas
    const driversWithStatus = (drivers || []).map(driver => {
      // Créer l'objet vehicle s'il n'existe pas
      const vehicle = driver.vehicle || {
        make: driver.vehicle_make || '',
        model: driver.vehicle_model || '',
        color: driver.vehicle_color || '',
        license_plate: driver.vehicle_plate || '',
        category: driver.vehicle_category || driver.vehicle_type || 'standard',
        year: driver.vehicle_year || new Date().getFullYear(),
        seats: 4
      };
      
      return {
        ...driver,
        // ✅ Si status est undefined/null, utiliser driver_status, sinon 'pending' par défaut
        status: driver.status || driver.driver_status || 'pending',
        // ✅ Assurer que driver_status existe aussi
        driver_status: driver.driver_status || driver.status || 'pending',
        // ✅ Ajouter l'objet vehicle
        vehicle: vehicle
      };
    });
    
    console.log(`✅ ${driversWithStatus.length} conducteurs trouvés`);
    console.log('🔍 Premier conducteur - status:', driversWithStatus[0]?.status);
    console.log('🔍 Premier conducteur - vehicle:', driversWithStatus[0]?.vehicle);

    return c.json({
      success: true,
      drivers: driversWithStatus,
      count: driversWithStatus.length
    });

  } catch (error) {
    console.error('❌ Erreur récupération conducteurs:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Erreur serveur',
      drivers: [],
      count: 0
    }, 500);
  }
});

export default app;

