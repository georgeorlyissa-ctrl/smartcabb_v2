// ============================================
// ADMIN: Routes de gestion des utilisateurs
// ============================================

import type { Context } from 'npm:hono';
import * as kv from './kv_store.tsx';
import { createClient } from 'npm:@supabase/supabase-js@2';

// 🆕 ADMIN: Récupérer TOUS les utilisateurs DIRECTEMENT depuis Supabase Auth (source unique de vérité)
export async function getAllUsers(c: Context) {
  try {
    console.log('👥 [ADMIN] Récupération de TOUS les utilisateurs depuis Supabase Auth...');
    
    // Créer le client Supabase avec les droits admin
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    // ✅ LIRE DIRECTEMENT DEPUIS SUPABASE AUTH (source unique de vérité)
    const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ [ADMIN] Erreur lecture Supabase Auth:', authError);
      return c.json({ 
        success: false, 
        error: authError.message,
        users: [],
        total: 0,
        stats: { passengers: 0, drivers: 0, admins: 0 }
      }, 500);
    }
    
    console.log(`📊 [ADMIN] ${authUsers?.length || 0} utilisateurs trouvés dans Supabase Auth`);
    
    // Pour chaque utilisateur, enrichir avec les données du KV store (si disponibles)
    const enrichedUsers = await Promise.all(
      (authUsers || []).map(async (authUser) => {
        const metadata = authUser.user_metadata || {};
        const role = metadata.role || 'passenger';
        
        // Essayer de récupérer les données enrichies depuis le KV store
        let kvData = null;
        try {
          if (role === 'driver') {
            kvData = await kv.get(`driver:${authUser.id}`);
          } else if (role === 'admin') {
            kvData = await kv.get(`admin:${authUser.id}`);
          } else {
            kvData = await kv.get(`passenger:${authUser.id}`);
          }
        } catch (err) {
          // Pas grave si le KV n'a pas les données
          console.log(`⚠️ Pas de données KV pour ${authUser.id}`);
        }
        
        // Construire l'utilisateur avec Auth comme source principale, KV comme enrichissement
        const user: any = {
          id: authUser.id,
          role: role === 'driver' ? 'Conducteur' : role === 'admin' ? 'Administrateur' : 'Passager',
          name: metadata.full_name || metadata.name || kvData?.full_name || kvData?.name || 'Utilisateur',
          phone: metadata.phone || kvData?.phone || 'Non renseigné',
          email: authUser.email || kvData?.email || 'Non renseigné',
          password: metadata.password || kvData?.password || 'password123', // Mot de passe depuis metadata ou KV
          balance: kvData?.balance || 0,
          accountType: kvData?.account_type || 'prepaid',
          createdAt: authUser.created_at || new Date().toISOString(),
          lastLoginAt: authUser.last_sign_in_at || kvData?.last_login_at
        };
        
        // Ajouter les champs spécifiques aux conducteurs
        if (role === 'driver') {
          user.vehicleCategory = kvData?.vehicle?.category || kvData?.vehicle_category || 'standard';
          user.vehiclePlate = kvData?.vehicle?.license_plate || kvData?.vehicle_plate || kvData?.license_plate || 'N/A';
          user.vehicleModel = kvData?.vehicle?.model || kvData?.vehicle_model || 'N/A';
          user.status = kvData?.status || 'pending';
          user.rating = kvData?.rating || 0;
          user.totalTrips = kvData?.total_trips || kvData?.total_rides || 0;
        }
        
        return user;
      })
    );
    
    // Séparer par rôle pour les stats
    const passengers = enrichedUsers.filter(u => u.role === 'Passager');
    const drivers = enrichedUsers.filter(u => u.role === 'Conducteur');
    const admins = enrichedUsers.filter(u => u.role === 'Administrateur');
    
    const stats = {
      passengers: passengers.length,
      drivers: drivers.length,
      admins: admins.length
    };
    
    console.log(`✅ [ADMIN] Utilisateurs enrichis:`, stats);
    console.log(`📋 Détail:`, {
      totalAuth: authUsers?.length || 0,
      totalEnrichi: enrichedUsers.length,
      passengers: passengers.length,
      drivers: drivers.length,
      admins: admins.length
    });
    
    return c.json({
      success: true,
      users: enrichedUsers,
      total: enrichedUsers.length,
      stats,
      source: 'supabase-auth' // Indiquer la source des données
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

// 🔍 DIAGNOSTIC: Comparer Auth vs KV
export async function getUsersDiagnostic(c: Context) {
  try {
    console.log('🔍 [DIAGNOSTIC] Analyse Auth vs KV...');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    // Compter dans Auth
    const { data: { users: authUsers }, error } = await supabase.auth.admin.listUsers();
    const authCount = authUsers?.length || 0;
    
    const authByRole = {
      drivers: authUsers?.filter(u => u.user_metadata?.role === 'driver').length || 0,
      passengers: authUsers?.filter(u => u.user_metadata?.role === 'passenger').length || 0,
      admins: authUsers?.filter(u => u.user_metadata?.role === 'admin').length || 0
    };
    
    // Compter dans KV
    const kvDrivers = await kv.getByPrefix('driver:');
    const kvPassengers = await kv.getByPrefix('passenger:');
    const kvAdmins = await kv.getByPrefix('admin:');
    
    const kvCount = (kvDrivers?.length || 0) + (kvPassengers?.length || 0) + (kvAdmins?.length || 0);
    
    const kvByRole = {
      drivers: kvDrivers?.length || 0,
      passengers: kvPassengers?.length || 0,
      admins: kvAdmins?.length || 0
    };
    
    // Trouver les utilisateurs manquants dans KV
    const missingInKV: any[] = [];
    for (const authUser of authUsers || []) {
      const role = authUser.user_metadata?.role || 'passenger';
      const prefix = role === 'driver' ? 'driver' : role === 'admin' ? 'admin' : 'passenger';
      const kvUser = await kv.get(`${prefix}:${authUser.id}`);
      
      if (!kvUser) {
        missingInKV.push({
          id: authUser.id,
          email: authUser.email,
          role: role,
          phone: authUser.user_metadata?.phone,
          name: authUser.user_metadata?.full_name || authUser.user_metadata?.name
        });
      }
    }
    
    console.log(`📊 DIAGNOSTIC:`, {
      auth: { total: authCount, ...authByRole },
      kv: { total: kvCount, ...kvByRole },
      missingInKV: missingInKV.length
    });
    
    return c.json({
      success: true,
      diagnostic: {
        auth: {
          total: authCount,
          byRole: authByRole
        },
        kv: {
          total: kvCount,
          byRole: kvByRole
        },
        discrepancy: {
          totalMissing: missingInKV.length,
          missingUsers: missingInKV
        }
      }
    });
    
  } catch (error) {
    console.error('❌ [DIAGNOSTIC] Erreur:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Erreur serveur'
    }, 500);
  }
}

// 🧹 NETTOYAGE: Supprimer les utilisateurs orphelins (KV sans Auth)
export async function cleanupOrphanedUsers(c: Context) {
  try {
    console.log('🧹 [CLEANUP] Nettoyage des utilisateurs orphelins...');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    // Récupérer tous les utilisateurs Auth
    const { data: { users: authUsers } } = await supabase.auth.admin.listUsers();
    const authIds = new Set((authUsers || []).map(u => u.id));
    
    // Récupérer tous les utilisateurs KV
    const kvDrivers = await kv.getByPrefix('driver:') || [];
    const kvPassengers = await kv.getByPrefix('passenger:') || [];
    const kvAdmins = await kv.getByPrefix('admin:') || [];
    
    const allKvUsers = [...kvDrivers, ...kvPassengers, ...kvAdmins];
    
    // Trouver et supprimer les orphelins
    let deletedCount = 0;
    const orphans: string[] = [];
    
    for (const kvUser of allKvUsers) {
      if (!authIds.has(kvUser.id)) {
        // Cet utilisateur est dans KV mais pas dans Auth = orphelin
        const role = kvUser.role || 'passenger';
        const prefix = role === 'driver' ? 'driver' : role === 'admin' ? 'admin' : 'passenger';
        
        await kv.del(`${prefix}:${kvUser.id}`);
        orphans.push(`${kvUser.full_name || kvUser.name} (${kvUser.id})`);
        deletedCount++;
        
        console.log(`🗑️ Orphelin supprimé: ${kvUser.full_name} (${kvUser.id})`);
      }
    }
    
    console.log(`✅ [CLEANUP] ${deletedCount} orphelins supprimés`);
    
    return c.json({
      success: true,
      message: `${deletedCount} utilisateur(s) orphelin(s) supprimé(s)`,
      deletedCount,
      orphans
    });
    
  } catch (error) {
    console.error('❌ [CLEANUP] Erreur:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Erreur serveur'
    }, 500);
  }
}
