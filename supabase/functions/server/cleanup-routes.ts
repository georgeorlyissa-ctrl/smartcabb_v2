/**
 * 🧹 ROUTES DE NETTOYAGE DES DONNÉES
 * Script pour nettoyer les données de test/simulation avant les tests avec vraies données
 * Version: 3.0 - Option nucléaire ajoutée
 */

import { Hono } from 'npm:hono';
import * as kv from './kv-wrapper.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const cleanupRoutes = new Hono();

// Client Supabase avec service role key pour supprimer les utilisateurs
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

/**
 * 🔍 DEBUG - Afficher tous les conducteurs du KV store
 * GET /cleanup/debug-drivers
 */
cleanupRoutes.get('/debug-drivers', async (c) => {
  try {
    console.log('🔍 ========== DIAGNOSTIC CONDUCTEURS ==========');
    
    // 1. Charger tous les drivers du KV store
    const driversKV = await kv.getByPrefix('driver:');
    console.log('📊 KV Store - Total conducteurs:', driversKV.length);
    console.log('📋 KV Store - Conducteurs:', driversKV);
    
    // 2. Charger aussi depuis Supabase Postgres pour comparaison
    const { data: driversPostgres, error: errorDrivers } = await supabase
      .from('drivers')
      .select('*');
    
    const { data: profilesPostgres, error: errorProfiles } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'driver');
    
    console.log('📊 Postgres - Drivers table:', driversPostgres?.length || 0);
    console.log('📊 Postgres - Profiles (role=driver):', profilesPostgres?.length || 0);
    
    return c.json({
      success: true,
      kv: {
        total: driversKV.length,
        drivers: driversKV
      },
      postgres: {
        drivers: {
          total: driversPostgres?.length || 0,
          data: driversPostgres || [],
          error: errorDrivers
        },
        profiles: {
          total: profilesPostgres?.length || 0,
          data: profilesPostgres || [],
          error: errorProfiles
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur debug conducteurs:', error);
    return c.json({
      success: false,
      error: String(error)
    }, 500);
  }
});

/**
 * 💥 OPTION NUCLÉAIRE : Supprimer TOUS LES CONDUCTEURS sans exception
 * ⚠️ Cette route supprime TOUS les conducteurs, même ceux avec des données valides
 * 
 * DELETE /cleanup/delete-all-drivers
 */
cleanupRoutes.delete('/delete-all-drivers', async (c) => {
  try {
    console.log('💥💥💥 OPTION NUCLÉAIRE : Suppression de TOUS les conducteurs...');
    
    const deletedCount = {
      driversKV: 0,
      driversPostgres: 0,
      profilesKV: 0,
      profilesPostgres: 0,
      vehiclesKV: 0,
      vehiclesPostgres: 0,
      authUsers: 0
    };

    // 🔥 ÉTAPE 1 : SUPPRIMER TOUS LES CONDUCTEURS DE POSTGRES EN PREMIER
    console.log('🔥 ÉTAPE 1 : Suppression de TOUS les conducteurs de Postgres...');
    
    // 1A. Supprimer de la table "drivers"
    try {
      const { data: allDriversPostgres, error: fetchError } = await supabase
        .from('drivers')
        .select('id, user_id');
      
      if (!fetchError && allDriversPostgres) {
        console.log(`📊 Postgres - Table drivers : ${allDriversPostgres.length} conducteurs trouvés`);
        
        const { error: deleteDriversError } = await supabase
          .from('drivers')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000');
        
        if (!deleteDriversError) {
          deletedCount.driversPostgres = allDriversPostgres.length;
          console.log(`✅ ${allDriversPostgres.length} conducteurs supprimés de la table drivers`);
        } else {
          console.error('❌ Erreur suppression table drivers:', deleteDriversError);
        }
      }
    } catch (error) {
      console.error('⚠️ Erreur lors de la suppression des drivers Postgres:', error);
    }

    // 1B. Supprimer les profiles avec role='driver'
    try {
      const { data: driverProfiles, error: fetchProfilesError } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'driver');
      
      if (!fetchProfilesError && driverProfiles) {
        console.log(`📊 Postgres - Profiles (role=driver) : ${driverProfiles.length} profils trouvés`);
        
        const { error: deleteProfilesError } = await supabase
          .from('profiles')
          .delete()
          .eq('role', 'driver');
        
        if (!deleteProfilesError) {
          deletedCount.profilesPostgres = driverProfiles.length;
          console.log(`✅ ${driverProfiles.length} profils conducteurs supprimés de la table profiles`);
        } else {
          console.error('❌ Erreur suppression profils conducteurs:', deleteProfilesError);
        }
      }
    } catch (error) {
      console.error('⚠️ Erreur lors de la suppression des profils conducteurs Postgres:', error);
    }

    // 1C. Supprimer TOUS les véhicules de Postgres
    try {
      const { data: allVehicles, error: fetchVehiclesError } = await supabase
        .from('vehicles')
        .select('id');
      
      if (!fetchVehiclesError && allVehicles) {
        console.log(`📊 Postgres - Table vehicles : ${allVehicles.length} véhicules trouvés`);
        
        const { error: deleteVehiclesError } = await supabase
          .from('vehicles')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000');
        
        if (!deleteVehiclesError) {
          deletedCount.vehiclesPostgres = allVehicles.length;
          console.log(`✅ ${allVehicles.length} véhicules supprimés de la table vehicles`);
        } else {
          console.error('❌ Erreur suppression véhicules:', deleteVehiclesError);
        }
      }
    } catch (error) {
      console.error('⚠️ Erreur lors de la suppression des véhicules Postgres:', error);
    }

    // 🧹 ÉTAPE 2 : SUPPRIMER TOUS LES CONDUCTEURS DU KV STORE
    console.log('🧹 ÉTAPE 2 : Suppression de tous les conducteurs du KV store...');
    const driversKeys = await kv.getByPrefix('driver:');
    console.log(`📊 KV Store - Total conducteurs : ${driversKeys.length}`);
    
    // 🔥 SOLUTION RADICALE : Supprimer DIRECTEMENT dans la table kv_store_2eb02e52
    // Car les objets corrompus n'ont pas d'ID, on ne peut pas les supprimer un par un
    console.log('💣 Suppression DIRECTE dans la table kv_store_2eb02e52...');
    
    try {
      // Supprimer TOUTES les clés commençant par "driver:"
      const { data: deletedDrivers, error: errorDrivers } = await supabase
        .from('kv_store_2eb02e52')
        .delete()
        .like('key', 'driver:%')
        .select();
      
      if (!errorDrivers) {
        const driversDeleted = deletedDrivers?.length || 0;
        deletedCount.driversKV = driversDeleted;
        console.log(`✅ ${driversDeleted} clés "driver:*" supprimées directement de la table KV`);
      } else {
        console.error('❌ Erreur suppression drivers du KV:', errorDrivers);
      }
      
      // Supprimer TOUTES les clés commençant par "profile:"
      const { data: deletedProfiles, error: errorProfiles } = await supabase
        .from('kv_store_2eb02e52')
        .delete()
        .like('key', 'profile:%')
        .select();
      
      if (!errorProfiles) {
        const profilesDeleted = deletedProfiles?.length || 0;
        deletedCount.profilesKV = profilesDeleted;
        console.log(`✅ ${profilesDeleted} clés "profile:*" supprimées directement de la table KV`);
      } else {
        console.error('❌ Erreur suppression profiles du KV:', errorProfiles);
      }
      
      // Supprimer TOUTES les clés commençant par "vehicle:"
      const { data: deletedVehicles, error: errorVehicles } = await supabase
        .from('kv_store_2eb02e52')
        .delete()
        .like('key', 'vehicle:%')
        .select();
      
      if (!errorVehicles) {
        const vehiclesDeleted = deletedVehicles?.length || 0;
        deletedCount.vehiclesKV = vehiclesDeleted;
        console.log(`✅ ${vehiclesDeleted} clés "vehicle:*" supprimées directement de la table KV`);
      } else {
        console.error('❌ Erreur suppression vehicles du KV:', errorVehicles);
      }
      
      // Supprimer les utilisateurs Auth (si on a récupéré des IDs)
      console.log('🗑️ Tentative de suppression des utilisateurs Auth...');
      for (const driver of driversKeys) {
        if (driver?.id) {
          try {
            const { error: deleteError } = await supabase.auth.admin.deleteUser(driver.id);
            if (!deleteError) {
              deletedCount.authUsers++;
              console.log(`  ✅ Utilisateur Auth supprimé: ${driver.id}`);
            }
          } catch (authError) {
            console.log(`  ⚠️ Impossible de supprimer l'utilisateur Auth: ${driver.id}`);
          }
        }
      }
    } catch (error) {
      console.error('⚠️ Erreur lors de la suppression directe dans la table KV:', error);
    }

    const totalDeleted = deletedCount.driversKV + deletedCount.driversPostgres;
    console.log('💥 SUPPRESSION NUCLÉAIRE TERMINÉE');
    console.log(`📊 Résumé:`);
    console.log(`   - KV Store: ${deletedCount.driversKV} conducteurs, ${deletedCount.profilesKV} profils, ${deletedCount.vehiclesKV} véhicules`);
    console.log(`   - Postgres: ${deletedCount.driversPostgres} conducteurs, ${deletedCount.profilesPostgres} profils, ${deletedCount.vehiclesPostgres} véhicules`);
    console.log(`   - Auth: ${deletedCount.authUsers} utilisateurs`);
    console.log(`   - TOTAL: ${totalDeleted} conducteurs supprimés`);

    return c.json({
      success: true,
      message: `TOUS les conducteurs ont été supprimés (${totalDeleted} au total)`,
      data: deletedCount
    });

  } catch (error: any) {
    console.error('❌ Erreur lors de la suppression nucléaire:', error);
    return c.json({
      success: false,
      message: 'Erreur lors de la suppression de tous les conducteurs',
      error: error.message
    }, 500);
  }
});


/**
 * 🔧 FIX - Corriger les statuts de tous les conducteurs
 * POST /cleanup/fix-driver-statuses
 * 
 * Problème : Les anciens conducteurs ont un statut undefined, rejected, ou autre
 * Solution : Mettre tous les conducteurs à status: 'pending'
 */
cleanupRoutes.post('/fix-driver-statuses', async (c) => {
  try {
    console.log('🔧 ========== FIX STATUTS CONDUCTEURS ==========');
    
    // 1. Charger tous les drivers du KV store
    const drivers = await kv.getByPrefix('driver:');
    console.log(`📊 Total conducteurs trouvés: ${drivers.length}`);
    
    let fixedCount = 0;
    const errors = [];
    
    // 2. Parcourir tous les conducteurs et corriger leur statut
    for (const driver of drivers) {
      try {
        const oldStatus = driver.status;
        
        // Si le statut est undefined, null, ou différent de 'pending'/'approved'/'rejected'
        if (!driver.status || !['pending', 'approved', 'rejected'].includes(driver.status)) {
          console.log(`🔧 Correction driver ${driver.id}: status "${oldStatus}" → "pending"`);
          
          // Mettre à jour le driver avec status: 'pending'
          const updatedDriver = {
            ...driver,
            status: 'pending',
            driver_status: 'pending',
            updated_at: new Date().toISOString()
          };
          
          // Sauvegarder dans KV
          await kv.set(`driver:${driver.id}`, updatedDriver);
          await kv.set(`profile:${driver.id}`, updatedDriver);
          
          fixedCount++;
        } else {
          console.log(`✅ Driver ${driver.id}: statut déjà correct "${driver.status}"`);
        }
      } catch (error) {
        console.error(`❌ Erreur fix driver ${driver.id}:`, error);
        errors.push({ id: driver.id, error: error.message });
      }
    }
    
    console.log(`✅ Fix terminé: ${fixedCount} conducteur(s) corrigé(s)`);
    
    return c.json({
      success: true,
      message: `${fixedCount} conducteur(s) corrigé(s) avec succès`,
      data: {
        total: drivers.length,
        fixed: fixedCount,
        errors: errors.length
      },
      errors
    });
    
  } catch (error) {
    console.error('❌ Erreur fix statuts:', error);
    return c.json({
      success: false,
      message: 'Erreur lors de la correction des statuts',
      error: error.message
    }, 500);
  }
});

/**
 * 🔧 NORMALISER LES DONNÉES DES CONDUCTEURS
 * Corrige le problème "Véhicule non configuré" en s'assurant que tous les conducteurs
 * ont à la fois l'objet vehicle ET les champs individuels
 * POST /cleanup/normalize-drivers
 */
cleanupRoutes.post('/normalize-drivers', async (c) => {
  try {
    console.log('🔧 ========== NORMALISATION DES CONDUCTEURS ==========');
    
    // 1. Charger tous les drivers du KV store
    const drivers = await kv.getByPrefix('driver:');
    console.log(`📊 Total conducteurs trouvés: ${drivers.length}`);
    
    let normalizedCount = 0;
    const errors = [];
    
    // 2. Parcourir tous les conducteurs et normaliser leurs données
    for (const driver of drivers) {
      try {
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
          } : {},
          updated_at: new Date().toISOString()
        };
        
        // Sauvegarder dans KV
        await kv.set(`driver:${driver.id}`, normalizedDriver);
        
        console.log(`✅ Normalisé driver ${driver.id} (${driver.full_name || driver.name}):`, {
          vehicle_make: normalizedDriver.vehicle_make,
          vehicle_category: normalizedDriver.vehicle_category
        });
        
        normalizedCount++;
      } catch (error) {
        console.error(`❌ Erreur normalisation driver ${driver.id}:`, error);
        errors.push({ id: driver.id, error: error.message });
      }
    }
    
    console.log(`✅ Normalisation terminée: ${normalizedCount} conducteur(s) normalisé(s)`);
    
    return c.json({
      success: true,
      message: `${normalizedCount} conducteur(s) normalisé(s) avec succès`,
      data: {
        total: drivers.length,
        normalized: normalizedCount,
        errors: errors.length
      },
      errors
    });
    
  } catch (error) {
    console.error('❌ Erreur normalisation:', error);
    return c.json({
      success: false,
      message: 'Erreur lors de la normalisation des conducteurs',
      error: error.message
    }, 500);
  }
});

export default cleanupRoutes;


