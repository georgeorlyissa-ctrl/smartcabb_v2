import { Hono } from "npm:hono";
import * as kv from "./kv-wrapper.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const app = new Hono();

// ============================================
// 🆘 ROUTE D'URGENCE : Réinitialiser le compte admin
// ============================================
app.post("/reset-admin-account", async (c) => {
  try {
    console.log("🆘 RÉINITIALISATION DU COMPTE ADMIN...");
    
    const adminEmail = "contact@smartcabb.com";
    const adminPassword = "SmartCabb2024!";
    const adminPhone = "+243900000000";
    
    // Créer le client Supabase avec SERVICE_ROLE_KEY
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    );
    
    // 1️⃣ Vérifier si l'utilisateur existe déjà dans Supabase Auth
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === adminEmail);
    
    let authUserId;
    
    if (existingUser) {
      console.log("✅ Utilisateur existant trouvé, mise à jour du mot de passe...");
      authUserId = existingUser.id;
      
      // Mettre à jour le mot de passe
      await supabase.auth.admin.updateUserById(authUserId, {
        password: adminPassword,
        email_confirm: true
      });
    } else {
      console.log("➕ Création d'un nouveau compte admin dans Supabase Auth...");
      
      // Créer le compte admin dans Supabase Auth
      const { data, error } = await supabase.auth.admin.createUser({
        email: adminEmail,
        password: adminPassword,
        email_confirm: true,
        user_metadata: {
          full_name: "Admin SmartCabb",
          phone: adminPhone,
          role: "admin"
        }
      });
      
      if (error) {
        console.error("❌ Erreur création compte Supabase:", error);
        return c.json({ 
          success: false, 
          error: `Erreur Supabase Auth: ${error.message}` 
        }, 500);
      }
      
      authUserId = data.user.id;
    }
    
    console.log(`✅ Compte Supabase Auth prêt: ${authUserId}`);
    
    // 2️⃣ Créer/Mettre à jour le profil dans le KV store
    const adminProfile = {
      id: authUserId,
      email: adminEmail,
      phone: adminPhone,
      full_name: "Admin SmartCabb",
      role: "admin",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_login_at: null
    };
    
    await kv.set(`profile:${authUserId}`, adminProfile);
    console.log("✅ Profil admin créé dans le KV store");
    
    // 3️⃣ Créer aussi une entrée admin:
    await kv.set(`admin:${authUserId}`, adminProfile);
    console.log("✅ Entrée admin créée dans le KV store");
    
    return c.json({
      success: true,
      message: "Compte admin réinitialisé avec succès",
      credentials: {
        email: adminEmail,
        password: adminPassword,
        note: "Utilisez ces identifiants pour vous connecter"
      },
      admin: adminProfile
    });
    
  } catch (error) {
    console.error("❌ Erreur réinitialisation admin:", error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Erreur serveur" 
    }, 500);
  }
});

app.get("/stats", async (c) => {
  try {
    const drivers = await kv.getByPrefix('driver:');
    const passengers = await kv.getByPrefix('passenger:');
    const rides = await kv.getByPrefix('ride:');
    return c.json({ success: true, stats: { totalDrivers: drivers.length, totalPassengers: passengers.length, totalRides: rides.length } });
  } catch (error) {
    console.error("❌ Erreur stats admin:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

// ✅ NOUVELLE ROUTE : Récupérer tous les utilisateurs (passagers, conducteurs, admins)
app.get("/users/all", async (c) => {
  try {
    console.log("📋 Récupération de tous les utilisateurs...");
    
    // Récupérer tous les profils depuis le KV store
    const allProfiles = await kv.getByPrefix('profile:');
    
    if (!allProfiles || allProfiles.length === 0) {
      console.log("⚠️ Aucun utilisateur trouvé dans le KV store");
      return c.json({ 
        success: true, 
        users: [],
        stats: { passengers: 0, drivers: 0, admins: 0, total: 0 }
      });
    }
    
    console.log(`✅ ${allProfiles.length} utilisateurs trouvés`);
    
    // Formater les utilisateurs pour le frontend
    const formattedUsers = allProfiles.map((profile: any) => ({
      id: profile.id,
      role: profile.role === 'passenger' ? 'Passager' : 
            profile.role === 'driver' ? 'Conducteur' : 
            profile.role === 'admin' ? 'Administrateur' : 'Inconnu',
      name: profile.full_name || profile.name || 'Nom inconnu',
      phone: profile.phone || 'Non renseigné',
      email: profile.email || 'Non renseigné',
      password: profile.password || '••••••••', // Mot de passe masqué
      balance: profile.balance || 0,
      accountType: profile.account_type || (profile.role === 'driver' ? 'Postpayé' : 'Standard'),
      vehicleCategory: profile.vehicle_category || '-',
      vehiclePlate: profile.vehicle_plate || '-',
      vehicleModel: profile.vehicle_model || '-',
      status: profile.status || (profile.role === 'driver' ? 'Hors ligne' : 'Actif'),
      rating: profile.rating || 0,
      totalTrips: profile.total_trips || 0,
      createdAt: profile.created_at || new Date().toISOString(),
      lastLoginAt: profile.last_login_at || null
    }));
    
    // Calculer les statistiques
    const stats = {
      passengers: formattedUsers.filter(u => u.role === 'Passager').length,
      drivers: formattedUsers.filter(u => u.role === 'Conducteur').length,
      admins: formattedUsers.filter(u => u.role === 'Administrateur').length,
      total: formattedUsers.length
    };
    
    console.log("📊 Stats:", stats);
    
    return c.json({ 
      success: true, 
      users: formattedUsers,
      stats: stats
    });
    
  } catch (error) {
    console.error("❌ Erreur /admin/users/all:", error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Erreur serveur" 
    }, 500);
  }
});

// ✅ NOUVELLE ROUTE : Approuver un conducteur
app.post("/drivers/:driverId/approve", async (c) => {
  try {
    const driverId = c.req.param('driverId');
    console.log(`✅ Approbation du conducteur: ${driverId}`);
    
    // Récupérer le conducteur depuis le KV store
    const driver = await kv.get(`driver:${driverId}`);
    
    if (!driver) {
      console.error(`❌ Conducteur non trouvé: ${driverId}`);
      return c.json({ 
        success: false, 
        error: 'Conducteur non trouvé' 
      }, 404);
    }
    
    // Mettre à jour le statut à "approved"
    const updatedDriver = {
      ...driver,
      status: 'approved',
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    await kv.set(`driver:${driverId}`, updatedDriver);
    
    // Mettre à jour aussi le profil
    const profile = await kv.get(`profile:${driverId}`);
    if (profile) {
      const updatedProfile = {
        ...profile,
        status: 'approved',
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      await kv.set(`profile:${driverId}`, updatedProfile);
    }
    
    console.log(`✅ Conducteur approuvé: ${driver.full_name || driver.name}`);
    
    return c.json({ 
      success: true, 
      message: 'Conducteur approuvé avec succès',
      driver: updatedDriver
    });
    
  } catch (error) {
    console.error("❌ Erreur approbation conducteur:", error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Erreur serveur" 
    }, 500);
  }
});

// ✅ NOUVELLE ROUTE : Récupérer les conducteurs en attente d'approbation
app.get("/drivers/pending", async (c) => {
  try {
    console.log("📋 Récupération des conducteurs en attente...");
    
    // Récupérer tous les conducteurs
    const allDrivers = await kv.getByPrefix('driver:');
    
    // Filtrer les conducteurs en attente
    const pendingDrivers = allDrivers.filter((driver: any) => 
      driver.status === 'pending' || !driver.status
    );
    
    console.log(`✅ ${pendingDrivers.length} conducteur(s) en attente d'approbation`);
    
    return c.json({ 
      success: true, 
      drivers: pendingDrivers,
      count: pendingDrivers.length
    });
    
  } catch (error) {
    console.error("❌ Erreur récupération conducteurs en attente:", error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Erreur serveur" 
    }, 500);
  }
});

// ✅ NOUVELLE ROUTE : Approuver TOUS les conducteurs en attente (FIX URGENCE)
app.post("/drivers/approve-all", async (c) => {
  try {
    console.log("🚀 Approbation de TOUS les conducteurs en attente...");
    
    // Récupérer tous les conducteurs
    const allDrivers = await kv.getByPrefix('driver:');
    
    // Filtrer les conducteurs en attente
    const pendingDrivers = allDrivers.filter((driver: any) => 
      driver.status === 'pending' || !driver.status || driver.status === 'inactive'
    );
    
    console.log(`📋 ${pendingDrivers.length} conducteur(s) à approuver`);
    
    let approvedCount = 0;
    const approvedList = [];
    
    // Approuver chaque conducteur
    for (const driver of pendingDrivers) {
      try {
        // Mettre à jour le statut à "approved"
        const updatedDriver = {
          ...driver,
          status: 'approved',
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        await kv.set(`driver:${driver.id}`, updatedDriver);
        
        // Mettre à jour aussi le profil
        const profile = await kv.get(`profile:${driver.id}`);
        if (profile) {
          const updatedProfile = {
            ...profile,
            status: 'approved',
            approved_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          await kv.set(`profile:${driver.id}`, updatedProfile);
        }
        
        approvedCount++;
        approvedList.push({
          id: driver.id,
          name: driver.full_name || driver.name,
          phone: driver.phone
        });
        
        console.log(`✅ Conducteur approuvé: ${driver.full_name || driver.name} (${driver.phone})`);
      } catch (error) {
        console.error(`❌ Erreur approbation conducteur ${driver.id}:`, error);
      }
    }
    
    console.log(`🎉 ${approvedCount} conducteur(s) approuvé(s) avec succès`);
    
    return c.json({ 
      success: true, 
      message: `${approvedCount} conducteur(s) approuvé(s) avec succès`,
      approved_count: approvedCount,
      approved_drivers: approvedList
    });
    
  } catch (error) {
    console.error("❌ Erreur approbation massive:", error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Erreur serveur" 
    }, 500);
  }
});

// 🔍 NOUVELLE ROUTE : Diagnostic d'un conducteur par téléphone
app.get("/drivers/diagnostic/:phone", async (c) => {
  try {
    const phone = c.req.param('phone');
    console.log(`🔍 Diagnostic du conducteur avec téléphone: ${phone}`);
    
    // Récupérer tous les conducteurs
    const allDrivers = await kv.getByPrefix('driver:');
    
    // Chercher le conducteur avec ce téléphone
    const driver = allDrivers.find((d: any) => 
      d.phone === phone || 
      d.phone === `+${phone}` || 
      d.phone === phone.replace('+', '')
    );
    
    if (!driver) {
      return c.json({ 
        success: false, 
        error: 'Conducteur non trouvé',
        searched_phone: phone
      }, 404);
    }
    
    console.log(`✅ Conducteur trouvé:`, driver);
    
    return c.json({ 
      success: true, 
      driver: driver,
      diagnostic: {
        id: driver.id,
        name: driver.full_name || driver.name,
        phone: driver.phone,
        status: driver.status,
        is_available: driver.is_available,
        created_at: driver.created_at,
        approved_at: driver.approved_at,
        last_login: driver.last_login_at
      }
    });
    
  } catch (error) {
    console.error("❌ Erreur diagnostic conducteur:", error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Erreur serveur" 
    }, 500);
  }
});

export default app;