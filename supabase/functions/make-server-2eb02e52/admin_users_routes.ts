// ============================================
// ADMIN: Routes de gestion des utilisateurs
// ============================================

import type { Context } from 'npm:hono';
import * as kv from './kv_store.tsx';
import { createClient } from 'npm:@supabase/supabase-js@2';

// 🆕 ADMIN: Récupérer TOUS les utilisateurs (passagers + conducteurs + admins)
export async function getAllUsers(c: Context) {
  try {
    console.log('👥 [ADMIN] Récupération de TOUS les utilisateurs...');
    
    // Créer le client Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    // Récupérer tous les conducteurs depuis KV
    const allDrivers = await kv.getByPrefix('driver:');
    
    // Récupérer tous les passagers depuis KV
    const allPassengersKV = await kv.getByPrefix('passenger:');
    
    // Récupérer tous les admins depuis KV
    const allAdmins = await kv.getByPrefix('admin:');
    
    // ✅ FILTRER UNIQUEMENT LES CONDUCTEURS APPROUVÉS (pour la liste principale)
    const approvedDrivers = allDrivers.filter((driver: any) => 
      driver.isApproved === true && driver.status !== 'pending' && driver.status !== 'rejected'
    );
    
    console.log(`📊 Conducteurs totaux: ${allDrivers.length}, Approuvés: ${approvedDrivers.length}`);
    
    // Récupérer aussi les passagers depuis la table profiles
    let passengersFromProfiles: any[] = [];
    try {
      const { data: profilesData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'passenger');
      
      if (!error && profilesData) {
        passengersFromProfiles = profilesData;
        console.log(`📊 Passagers depuis profiles: ${passengersFromProfiles.length}`);
      }
    } catch (err) {
      console.warn('⚠️ Impossible de récupérer les profiles:', err);
    }
    
    // Combiner les passagers KV et profiles (en évitant les doublons)
    const kvPassengerIds = new Set((allPassengersKV || []).map((p: any) => p.id));
    const uniquePassengersFromProfiles = passengersFromProfiles.filter(
      (p: any) => !kvPassengerIds.has(p.id)
    );
    
    const allPassengers = [...(allPassengersKV || []), ...uniquePassengersFromProfiles];
    
    console.log(`📊 Données brutes:`, {
      drivers: allDrivers?.length || 0,
      passengersKV: allPassengersKV?.length || 0,
      passengersProfiles: uniquePassengersFromProfiles.length,
      passengersTotal: allPassengers.length,
      admins: allAdmins?.length || 0
    });
    
    // Transformer les conducteurs
    const drivers = (approvedDrivers || []).map((driver: any) => ({
      id: driver.id,
      role: 'Conducteur' as const,
      name: driver.full_name || driver.name || 'Conducteur inconnu',
      phone: driver.phone || 'Non renseigné',
      email: driver.email || 'Non renseigné',
      password: '********', // Masqué
      balance: driver.balance || 0,
      accountType: driver.account_type || 'prepaid',
      vehicleCategory: driver.vehicle?.category || driver.vehicle_category,
      vehiclePlate: driver.vehicle?.license_plate || driver.license_plate,
      vehicleModel: driver.vehicle?.model || driver.vehicle_model,
      status: driver.status || 'pending',
      rating: driver.rating || 0,
      totalTrips: driver.total_trips || 0,
      createdAt: driver.created_at || new Date().toISOString(),
      lastLoginAt: driver.last_login_at
    }));
    
    // Transformer les passagers
    const passengers = (allPassengers || []).map((passenger: any) => ({
      id: passenger.id,
      role: 'Passager' as const,
      name: passenger.name || passenger.full_name || 'Passager inconnu',
      phone: passenger.phone || 'Non renseigné',
      email: passenger.email || 'Non renseigné',
      password: '********', // Masqué
      balance: passenger.balance || 0,
      accountType: passenger.account_type || 'prepaid',
      createdAt: passenger.created_at || new Date().toISOString(),
      lastLoginAt: passenger.last_login_at
    }));
    
    // Transformer les admins
    const admins = (allAdmins || []).map((admin: any) => ({
      id: admin.id,
      role: 'Administrateur' as const,
      name: admin.name || admin.full_name || 'Admin',
      phone: admin.phone || 'Non renseigné',
      email: admin.email || 'Non renseigné',
      password: '********', // Masqué
      createdAt: admin.created_at || new Date().toISOString(),
      lastLoginAt: admin.last_login_at
    }));
    
    // Combiner tous les utilisateurs
    const allUsers = [...passengers, ...drivers, ...admins];
    
    const stats = {
      passengers: passengers.length,
      drivers: drivers.length,
      admins: admins.length
    };
    
    console.log(`✅ [ADMIN] ${allUsers.length} utilisateurs trouvés:`, stats);
    
    return c.json({
      success: true,
      users: allUsers,
      total: allUsers.length,
      stats
    });
    
  } catch (error) {
    console.error('❌ [ADMIN] Erreur récupération utilisateurs:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur serveur',
      users: [],
      total: 0,
      stats: { passengers: 0, drivers: 0, admins: 0 }
    }, 500);
  }
}

// 🆕 ADMIN: Diagnostic des utilisateurs
export async function getUsersDiagnostic(c: Context) {
  try {
    console.log('🔍 [ADMIN] Diagnostic des utilisateurs...');
    
    // Récupérer tous les conducteurs, passagers et admins du KV Store
    const allDrivers = await kv.getByPrefix('driver:');
    const allPassengers = await kv.getByPrefix('passenger:');
    const allAdmins = await kv.getByPrefix('admin:');
    
    const kvTotal = (allDrivers?.length || 0) + (allPassengers?.length || 0) + (allAdmins?.length || 0);
    
    console.log(`📊 KV Store: ${kvTotal} utilisateurs`);
    
    // Diagnostic simple pour l'instant
    const diagnostic = {
      kvStore: {
        total: kvTotal,
        passengers: allPassengers?.length || 0,
        drivers: allDrivers?.length || 0,
        admins: allAdmins?.length || 0,
        orphaned: 0 // À calculer ci-dessous
      },
      supabaseAuth: {
        total: 0, // À implémenter avec Supabase Auth si nécessaire
        missingInKv: 0
      },
      profiles: {
        total: 0 // À implémenter avec table profiles
      }
    };
    
    // Identifier les utilisateurs orphelins (données de test)
    const orphanedUsers: any[] = [];
    
    // Vérifier les conducteurs
    for (const driver of allDrivers || []) {
      if (!driver.id || !driver.email || driver.email === 'Non renseigné' || !driver.full_name) {
        orphanedUsers.push({
          id: driver.id || 'unknown',
          name: driver.full_name || driver.name || 'Inconnu',
          phone: driver.phone || 'N/A',
          email: driver.email || 'N/A',
          role: 'Conducteur',
          createdAt: driver.created_at || new Date().toISOString(),
          source: 'KV Store'
        });
      }
    }
    
    // Vérifier les passagers
    for (const passenger of allPassengers || []) {
      if (!passenger.id || !passenger.email || passenger.email === 'Non renseigné' || !passenger.name) {
        orphanedUsers.push({
          id: passenger.id || 'unknown',
          name: passenger.name || passenger.full_name || 'Inconnu',
          phone: passenger.phone || 'N/A',
          email: passenger.email || 'N/A',
          role: 'Passager',
          createdAt: passenger.created_at || new Date().toISOString(),
          source: 'KV Store'
        });
      }
    }
    
    diagnostic.kvStore.orphaned = orphanedUsers.length;
    
    const recommendations = {
      message: orphanedUsers.length > 0
        ? `⚠️ ${orphanedUsers.length} utilisateur(s) orphelin(s) détecté(s). Ces données semblent être de test.`
        : '✅ Toutes les données semblent cohérentes.',
      shouldCleanup: orphanedUsers.length > 0,
      shouldSync: false
    };
    
    console.log(`✅ [ADMIN] Diagnostic terminé:`, { orphanedUsers: orphanedUsers.length });
    
    return c.json({
      success: true,
      diagnostic,
      orphanedUsers,
      authUsers: [], // À implémenter avec Supabase Auth
      recommendations
    });
    
  } catch (error) {
    console.error('❌ [ADMIN] Erreur diagnostic:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur serveur'
    }, 500);
  }
}

// 🆕 ADMIN: Nettoyer les utilisateurs orphelins
export async function cleanupOrphanedUsers(c: Context) {
  try {
    console.log('🧹 [ADMIN] Nettoyage des utilisateurs orphelins...');
    
    let deletedCount = 0;
    
    // Récupérer tous les conducteurs et passagers
    const allDrivers = await kv.getByPrefix('driver:');
    const allPassengers = await kv.getByPrefix('passenger:');
    
    // Supprimer les conducteurs invalides
    for (const driver of allDrivers || []) {
      if (!driver.id || !driver.email || driver.email === 'Non renseigné' || !driver.full_name) {
        console.log(`🗑️ Suppression conducteur invalide: ${driver.id}`);
        await kv.del(`driver:${driver.id}`);
        await kv.del(`profile:${driver.id}`);
        await kv.del(`wallet:${driver.id}`);
        await kv.del(`driver_location:${driver.id}`);
        await kv.del(`driver_status:${driver.id}`);
        await kv.del(`fcm_token:${driver.id}`);
        await kv.del(`driver_stats:${driver.id}`);
        deletedCount++;
      }
    }
    
    // Supprimer les passagers invalides
    for (const passenger of allPassengers || []) {
      if (!passenger.id || !passenger.email || passenger.email === 'Non renseigné' || !passenger.name) {
        console.log(`🗑️ Suppression passager invalide: ${passenger.id}`);
        await kv.del(`passenger:${passenger.id}`);
        await kv.del(`profile:${passenger.id}`);
        await kv.del(`wallet:${passenger.id}`);
        await kv.del(`fcm_token:${passenger.id}`);
        deletedCount++;
      }
    }
    
    console.log(`✅ [ADMIN] ${deletedCount} utilisateur(s) invalide(s) supprimé(s)`);
    
    return c.json({
      success: true,
      message: `${deletedCount} utilisateur(s) invalide(s) supprimé(s)`,
      deletedCount
    });
    
  } catch (error) {
    console.error('❌ [ADMIN] Erreur nettoyage:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur serveur'
    }, 500);
  }
}