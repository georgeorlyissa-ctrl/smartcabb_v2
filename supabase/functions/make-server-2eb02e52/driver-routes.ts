import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv-wrapper.ts";
import { isValidUUID } from "./uuid-validator.ts";

const app = new Hono();

import { normalizePhoneNumber } from "./phone-utils.ts";

// 🔥 FCM: Initialisation Firebase Admin SDK (backend uniquement)
let firebaseAdmin: any = null;

async function getFirebaseAdmin() {
  if (firebaseAdmin) return firebaseAdmin;
  
  try {
    const { initializeApp, cert, getApps } = await import('npm:firebase-admin@12.0.0/app');
    const { getMessaging } = await import('npm:firebase-admin@12.0.0/messaging');
    
    // Vérifier si Firebase est déjà initialisé
    const apps = getApps();
    if (apps.length > 0) {
      console.log('✅ Firebase Admin déjà initialisé');
      firebaseAdmin = { messaging: getMessaging(apps[0]) };
      return firebaseAdmin;
    }
    
    // Récupérer les credentials depuis les variables d'environnement
    const serviceAccountJson = Deno.env.get('FIREBASE_SERVICE_ACCOUNT_JSON');
    
    if (!serviceAccountJson) {
      console.error('❌ FIREBASE_SERVICE_ACCOUNT_JSON non défini');
      return null;
    }
    
    const serviceAccount = JSON.parse(serviceAccountJson);
    
    // Initialiser Firebase Admin
    const app = initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.project_id
    });
    
    console.log('✅ Firebase Admin initialisé');
    
    firebaseAdmin = {
      messaging: getMessaging(app)
    };
    
    return firebaseAdmin;
  } catch (error) {
    console.error('❌ Erreur initialisation Firebase Admin:', error);
    return null;
  }
}

// ============================================
// 📝 POST /signup - INSCRIPTION CONDUCTEUR
// ============================================
app.post("/signup", async (c) => {
  try {
    const body = await c.req.json();
    const {
      full_name,
      email,
      phone,
      password,
      vehicleMake,
      vehicleModel,
      vehiclePlate,
      vehicleColor,
      vehicleCategory,
      profilePhoto
    } = body;

    console.log('📝 [DRIVER/SIGNUP] Inscription conducteur:', { full_name, phone, email });

    // Validation
    if (!full_name || !phone || !password) {
      return c.json({
        success: false,
        error: "Nom complet, téléphone et mot de passe requis"
      }, 400);
    }

    if (!vehicleMake || !vehicleModel || !vehiclePlate || !vehicleColor || !vehicleCategory) {
      return c.json({
        success: false,
        error: "Toutes les informations du véhicule sont requises"
      }, 400);
    }

    // Normaliser le téléphone
    const normalizedPhone = normalizePhoneNumber(phone);
    if (!normalizedPhone) {
      return c.json({
        success: false,
        error: "Numéro de téléphone invalide"
      }, 400);
    }

    // Créer l'utilisateur via Supabase Auth
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Vérifier si l'utilisateur existe déjà
    const { data: { users: existingUsers } } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.find(u => {
      const userPhone = u.user_metadata?.phone || u.phone;
      return userPhone && normalizePhoneNumber(userPhone) === normalizedPhone;
    });

    if (existingUser) {
      console.log('⚠️ [DRIVER/SIGNUP] Utilisateur existant, suppression...');
      try {
        await supabase.auth.admin.deleteUser(existingUser.id);
        console.log('✅ [DRIVER/SIGNUP] Utilisateur supprimé');
      } catch (deleteError) {
        console.error('❌ [DRIVER/SIGNUP] Erreur suppression:', deleteError);
        return c.json({
          success: false,
          error: "Ce numéro de téléphone est déjà enregistré"
        }, 400);
      }
    }

    // Générer l'email factice
    const generatedEmail = email || `u${normalizedPhone}@smartcabb.app`;

    // Créer l'utilisateur
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: generatedEmail,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        name: full_name,
        phone: normalizedPhone,
        role: 'driver',
        vehicle: {
          make: vehicleMake,
          model: vehicleModel,
          license_plate: vehiclePlate,
          color: vehicleColor,
          category: vehicleCategory
        }
      }
    });

    if (authError || !authData?.user) {
      console.error('❌ [DRIVER/SIGNUP] Erreur création auth:', authError);
      return c.json({
        success: false,
        error: authError?.message || "Erreur lors de la création du compte"
      }, 500);
    }

    console.log('✅ [DRIVER/SIGNUP] Utilisateur créé:', authData.user.id);

    // Créer le profil conducteur dans KV store
    const driverProfile = {
      id: authData.user.id,
      email: generatedEmail,
      full_name,
      phone: normalizedPhone,
      role: 'driver',
      status: 'pending', // En attente d'approbation
      isApproved: false,
      isAvailable: false,
      rating: 5.0,
      totalRides: 0,
      totalEarnings: 0,
      balance: 0,
      vehicle: {
        make: vehicleMake,
        model: vehicleModel,
        license_plate: vehiclePlate,
        color: vehicleColor,
        category: vehicleCategory
      },
      profilePhoto: profilePhoto || null,
      created_at: authData.user.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      lastUpdate: new Date().toISOString()
    };

    // 💾 SAUVEGARDE DANS KV STORE - DIRECT BYPASS
    console.log(`💾 [DRIVER/SIGNUP] Sauvegarde du profil ID: ${authData.user.id}`);
    console.log(`📦 [DRIVER/SIGNUP] Données à sauvegarder:`, JSON.stringify(driverProfile, null, 2));
    
    try {
      // Sauvegarder directement via Supabase (bypass du wrapper KV qui peut échouer)
      const { data: savedData, error: saveError } = await supabase
        .from("kv_store_2eb02e52")
        .upsert({ key: `driver:${authData.user.id}`, value: driverProfile })
        .select();
      
      if (saveError) {
        console.error(`❌ [DRIVER/SIGNUP] Erreur sauvegarde KV:`, saveError);
        console.error(`❌ [DRIVER/SIGNUP] Code erreur:`, saveError.code);
        console.error(`❌ [DRIVER/SIGNUP] Message:`, saveError.message);
        console.error(`❌ [DRIVER/SIGNUP] Détails:`, saveError.details);
        console.error(`❌ [DRIVER/SIGNUP] ERREUR CRITIQUE: Le conducteur ne sera pas visible dans le panel admin!`);
        console.error(`❌ [DRIVER/SIGNUP] Il faudra synchroniser manuellement depuis Auth vers KV`);
        
        // ⚠️ Retourner une erreur pour informer l'utilisateur
        return c.json({
          success: false,
          error: "Erreur technique lors de l'enregistrement. Votre compte est créé mais invisible pour l'admin. Contactez le support.",
          details: saveError.message
        }, 500);
      }
      
      console.log(`✅ [DRIVER/SIGNUP] Profil sauvegardé dans KV store`);
      console.log(`✅ [DRIVER/SIGNUP] Données sauvegardées:`, savedData);
      
      // Vérification immédiate
      const { data: checkData, error: checkError } = await supabase
        .from("kv_store_2eb02e52")
        .select("value")
        .eq("key", `driver:${authData.user.id}`)
        .single();
      
      if (checkError) {
        console.error(`⚠️ [DRIVER/SIGNUP] Erreur vérification:`, checkError.message);
        
        return c.json({
          success: false,
          error: "Erreur technique: impossible de vérifier l'enregistrement. Contactez le support.",
          details: checkError.message
        }, 500);
      }
      
      if (!checkData) {
        console.error(`❌ [DRIVER/SIGNUP] ÉCHEC CRITIQUE: Profil non trouvé après sauvegarde!`);
        
        return c.json({
          success: false,
          error: "Erreur technique: votre compte n'est pas visible. Contactez le support.",
        }, 500);
      }
      
      console.log(`✅ [DRIVER/SIGNUP] Vérification: profil trouvé (${checkData.value?.full_name})`);
      
    } catch (kvError) {
      console.error(`❌ [DRIVER/SIGNUP] Exception sauvegarde KV:`, kvError);
      console.error(`❌ [DRIVER/SIGNUP] Type exception:`, kvError?.constructor?.name);
      console.error(`❌ [DRIVER/SIGNUP] Message exception:`, kvError instanceof Error ? kvError.message : 'N/A');
      console.error(`❌ [DRIVER/SIGNUP] Stack trace:`, kvError instanceof Error ? kvError.stack : 'N/A');
      // Important: ne pas throw pour éviter de bloquer l'inscription
      // Le profil sera récupéré depuis Auth si nécessaire
    }

    console.log('✅ [DRIVER/SIGNUP] Profil conducteur créé et prêt à être retourné');

    return c.json({
      success: true,
      user: authData.user,
      profile: driverProfile
    });

  } catch (error) {
    console.error('❌ [DRIVER/SIGNUP] Erreur:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : "Erreur serveur"
    }, 500);
  }
});

// ============================================
// 📋 GET ALL DRIVERS (LISTE POUR ADMIN PANEL)
// ============================================
app.get("/", async (c) => {
  try {
    console.log('📊 [GET /drivers] Récupération depuis Supabase Auth (source unique de vérité)...');
    
    // ✅ LIRE DIRECTEMENT DEPUIS SUPABASE AUTH
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ [GET /drivers] Erreur Supabase Auth:', authError);
      return c.json({
        success: false,
        error: authError.message,
        drivers: [],
        count: 0
      }, 500);
    }
    
    // Filtrer uniquement les conducteurs
    const driverAuthUsers = (authUsers || []).filter(u => u.user_metadata?.role === 'driver');
    console.log(`📋 [GET /drivers] ${driverAuthUsers.length} conducteur(s) trouvé(s) dans Auth`);
    
    // Enrichir chaque conducteur avec les données du KV store
    const drivers = await Promise.all(
      driverAuthUsers.map(async (authUser) => {
        const metadata = authUser.user_metadata || {};
        
        // Essayer de récupérer les données enrichies depuis le KV store
        let kvData = null;
        try {
          kvData = await kv.get(`driver:${authUser.id}`);
        } catch (err) {
          // Pas grave si le KV n'a pas les données
        }
        
        // Auth comme source principale, KV comme enrichissement
        return {
          id: authUser.id,
          user_id: authUser.id,
          full_name: metadata.full_name || metadata.name || kvData?.full_name || kvData?.name || 'Conducteur',
          email: authUser.email || kvData?.email || `u${metadata.phone || authUser.id}@smartcabb.app`,
          phone: metadata.phone || kvData?.phone || '',
          status: kvData?.status || 'pending',
          is_approved: kvData?.is_approved || kvData?.isApproved || false,
          isApproved: kvData?.is_approved || kvData?.isApproved || false,
          is_available: kvData?.is_available || kvData?.isAvailable || false,
          isAvailable: kvData?.is_available || kvData?.isAvailable || false,
          rating: kvData?.rating || 0,
          total_rides: kvData?.total_rides || kvData?.totalRides || 0,
          totalRides: kvData?.total_rides || kvData?.totalRides || 0,
          total_earnings: kvData?.total_earnings || kvData?.totalEarnings || 0,
          totalEarnings: kvData?.total_earnings || kvData?.totalEarnings || 0,
          balance: kvData?.balance || 0,
          created_at: authUser.created_at || new Date().toISOString(),
          updated_at: kvData?.updated_at || authUser.created_at,
          vehicle_make: kvData?.vehicle?.make || kvData?.vehicle_make || 'Toyota',
          vehicle_model: kvData?.vehicle?.model || kvData?.vehicle_model || 'Corolla',
          vehicle_plate: kvData?.vehicle?.license_plate || kvData?.vehicle_plate || kvData?.license_plate || 'AA-000-CD',
          vehicle_color: kvData?.vehicle?.color || kvData?.vehicle_color || 'Blanc',
          vehicle_category: kvData?.vehicle?.category || kvData?.vehicle_category || 'standard',
          vehicle_year: kvData?.vehicle?.year || kvData?.vehicle_year || new Date().getFullYear(),
          license_number: kvData?.license_number || `TEMP-${Date.now()}`,
          last_login_at: authUser.last_sign_in_at,
          last_heartbeat_at: kvData?.last_heartbeat_at,
          // Aussi stocker l'objet vehicle pour compatibilité
          vehicle: {
            make: kvData?.vehicle?.make || kvData?.vehicle_make || 'Toyota',
            model: kvData?.vehicle?.model || kvData?.vehicle_model || 'Corolla',
            license_plate: kvData?.vehicle?.license_plate || kvData?.vehicle_plate || kvData?.license_plate || 'AA-000-CD',
            color: kvData?.vehicle?.color || kvData?.vehicle_color || 'Blanc',
            category: kvData?.vehicle?.category || kvData?.vehicle_category || 'standard',
            year: kvData?.vehicle?.year || kvData?.vehicle_year || new Date().getFullYear()
          }
        };
      })
    );
    
    console.log(`✅ [GET /drivers] ${drivers.length} conducteur(s) retourné(s) (Auth + KV)`);
    
    // ✅ DEBUG: Logger les IDs des conducteurs trouvés
    if (drivers && drivers.length > 0) {
      console.log(`📋 [GET /drivers] IDs conducteurs:`, drivers.map((d: any) => d.id || 'NO_ID'));
      console.log(`📋 [GET /drivers] Noms conducteurs:`, drivers.map((d: any) => d.full_name || 'NO_NAME'));
      console.log(`📋 [GET /drivers] Status conducteurs:`, drivers.map((d: any) => `${d.full_name}: status=${d.status}, isApproved=${d.isApproved}`));
    }
    
    return c.json({
      success: true,
      drivers: drivers,
      count: drivers.length,
      source: 'supabase-auth-enriched-kv'
    });
    
  } catch (error) {
    console.error('❌ [GET /drivers] Erreur:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur serveur',
      drivers: [],
      count: 0
    }, 500);
  }
});

// 🔍 DIAGNOSTIC - Vérifier l'état du KV store pour un driver
app.get("/debug/:id", async (c) => {
  try {
    const driverId = c.req.param('id');
    console.log(`🔍 [DEBUG /drivers/debug/:id] Diagnostic pour ID: ${driverId}`);
    
    // Vérifier avec driver:
    const driverKey = await kv.get(`driver:${driverId}`);
    console.log(`  ├─ driver:${driverId} => ${driverKey ? '✅ TROUVÉ' : '❌ ABSENT'}`);
    
    // Vérifier avec profile:
    const profileKey = await kv.get(`profile:${driverId}`);
    console.log(`  ├─ profile:${driverId} => ${profileKey ? '✅ TROUVÉ' : '❌ ABSENT'}`);
    
    // Lister toutes les clés commençant par driver:
    const allDrivers = await kv.getByPrefix('driver:');
    console.log(`  ├─ Total clés driver:* => ${allDrivers?.length || 0}`);
    
    // Lister toutes les clés commençant par profile:
    const allProfiles = await kv.getByPrefix('profile:');
    console.log(`  └─ Total clés profile:* => ${allProfiles?.length || 0}`);
    
    return c.json({
      success: true,
      driverId,
      found: {
        driver: !!driverKey,
        profile: !!profileKey
      },
      data: {
        driver: driverKey || null,
        profile: profileKey || null
      },
      counts: {
        totalDrivers: allDrivers?.length || 0,
        totalProfiles: allProfiles?.length || 0
      }
    });
  } catch (error) {
    console.error('❌ [DEBUG /drivers/debug/:id] Erreur:', error);
    return c.json({ success: false, error: 'Erreur diagnostic' }, 500);
  }
});

// 🧪 TEST - Créer manuellement un profil dans le KV store
app.post("/test-kv-save", async (c) => {
  try {
    const testProfile = {
      id: 'test-' + Date.now(),
      full_name: 'Test Driver ' + Date.now(),
      phone: '+243900000000',
      email: 'test@example.com',
      role: 'driver',
      status: 'pending',
      created_at: new Date().toISOString()
    };
    
    console.log('🧪 [TEST] Tentative de sauvegarde test:', testProfile.id);
    
    // Test 1: Via kv.set()
    await kv.set(`driver:${testProfile.id}`, testProfile);
    console.log('✅ [TEST] kv.set() terminé');
    
    // Test 2: Vérification immédiate
    const retrieved = await kv.get(`driver:${testProfile.id}`);
    console.log('🔍 [TEST] kv.get() résultat:', retrieved ? 'TROUVÉ' : 'ABSENT');
    
    // Test 3: Sauvegarde directe Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    const { error: directError } = await supabase
      .from('kv_store_2eb02e52')
      .upsert({ key: `test-direct:${testProfile.id}`, value: testProfile });
    
    console.log('🔍 [TEST] Sauvegarde directe:', directError ? 'ERREUR' : 'OK');
    if (directError) {
      console.error('❌ [TEST] Erreur Supabase:', directError);
    }
    
    // Test 4: Récupération directe
    const { data: directData, error: getError } = await supabase
      .from('kv_store_2eb02e52')
      .select('value')
      .eq('key', `test-direct:${testProfile.id}`)
      .maybeSingle();
    
    console.log('🔍 [TEST] Récupération directe:', directData ? 'TROUVÉ' : 'ABSENT');
    
    return c.json({
      success: true,
      results: {
        kvSet: 'completed',
        kvGet: retrieved ? 'found' : 'not_found',
        supabaseSave: directError ? 'error' : 'success',
        supabaseGet: directData ? 'found' : 'not_found'
      },
      testProfile
    });
  } catch (error) {
    console.error('❌ [TEST] Erreur:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// 👨‍✈️ GET DRIVER PROFILE
app.get("/:id", async (c) => {
  try {
    const driverId = c.req.param('id');
    if (!isValidUUID(driverId)) {
      return c.json({ success: false, error: "ID conducteur invalide" }, 400);
    }
    
    console.log(`🔍 [GET /:id] Récupération profil conducteur: ${driverId}`);
    
    // ✅ FIX COMPLET: Utiliser UNIQUEMENT la méthode directe Supabase
    // kv.get() semble avoir des problèmes - bypass complet
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    let driver = null;
    const maxAttempts = 3;
    const delays = [0, 500, 1000]; // 0ms, 500ms, 1s
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (attempt > 0) {
        console.log(`⏳ [GET /:id] Tentative ${attempt + 1}/${maxAttempts} après ${delays[attempt]}ms...`);
        await new Promise(resolve => setTimeout(resolve, delays[attempt]));
      }
      
      console.log(`🔧 [GET /:id] Recherche DIRECTE dans kv_store_2eb02e52...`);
      
      try {
        // Rechercher avec les deux clés possibles
        const { data, error } = await supabase
          .from('kv_store_2eb02e52')
          .select('value')
          .or(`key.eq.driver:${driverId},key.eq.profile:${driverId}`)
          .limit(1)
          .maybeSingle();
        
        if (error) {
          console.error(`❌ [GET /:id] Erreur SQL tentative ${attempt + 1}:`, error);
          continue;
        }
        
        if (data && data.value) {
          console.log(`✅ [GET /:id] Profil trouvé à la tentative ${attempt + 1}!`);
          console.log(`📊 [GET /:id] Nom: ${data.value.full_name}, Téléphone: ${data.value.phone}`);
          driver = data.value;
          break;
        } else {
          console.log(`⚠️ [GET /:id] Tentative ${attempt + 1}: Aucun résultat`);
        }
      } catch (queryError) {
        console.error(`❌ [GET /:id] Exception tentative ${attempt + 1}:`, queryError);
      }
    }
    
    // Si pas trouvé dans KV, essayer de récupérer depuis Auth et recréer le profil
    if (!driver) {
      console.log(`⚠️ [GET /:id] Profil non trouvé dans KV, tentative depuis Auth...`);
      
      try {
        const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(driverId);
        
        if (authError || !authUser?.user) {
          // L'utilisateur n'existe nulle part (ni KV ni Auth)
          // C'est une situation normale si l'ID est invalide ou si l'utilisateur a été supprimé
          console.log(`ℹ️ [GET /:id] Utilisateur ${driverId} n'existe pas dans Auth (${authError?.message || 'user not found'})`);
          return c.json({ 
            success: false, 
            error: "Profil conducteur non trouvé. Veuillez réessayer dans quelques instants." 
          }, 404);
        }
        
        console.log(`✅ [GET /:id] Utilisateur trouvé dans Auth, reconstruction du profil...`);
        
        // Reconstruire le profil depuis les metadata Auth
        const metadata = authUser.user.user_metadata || {};
        driver = {
          id: authUser.user.id,
          email: authUser.user.email || metadata.email || '',
          full_name: metadata.full_name || metadata.name || 'Conducteur',
          phone: metadata.phone || authUser.user.phone || '',
          role: 'driver',
          status: 'pending',
          isApproved: false,
          isAvailable: false,
          rating: 5.0,
          totalRides: 0,
          totalEarnings: 0,
          balance: 0,
          vehicle: metadata.vehicle || {},
          profilePhoto: metadata.profilePhoto || null,
          created_at: authUser.user.created_at,
          updated_at: new Date().toISOString(),
          lastUpdate: new Date().toISOString()
        };
        
        // Sauvegarder dans KV pour la prochaine fois
        try {
          await supabase
            .from('kv_store_2eb02e52')
            .upsert({ key: `driver:${driverId}`, value: driver });
          console.log(`✅ [GET /:id] Profil reconstruit et sauvegardé dans KV`);
        } catch (saveError) {
          console.error(`⚠️ [GET /:id] Impossible de sauvegarder le profil reconstruit:`, saveError);
        }
        
      } catch (reconstructError) {
        console.error(`❌ [GET /:id] Erreur reconstruction profil:`, reconstructError);
        return c.json({ 
          success: false, 
          error: "Profil conducteur non trouvé. Veuillez réessayer dans quelques instants." 
        }, 404);
      }
    }
    
    console.log(`✅ [GET /:id] Retour du profil: ${driver.full_name}`);
    return c.json({ success: true, driver });
  } catch (error) {
    console.error("❌ Erreur récupération conducteur:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

// ✅ UPDATE DRIVER STATUS
app.post("/:id/status", async (c) => {
  try {
    const driverId = c.req.param('id');
    const { status, location } = await c.req.json();
    
    console.log(`🔄 [POST /:id/status] Changement statut pour ${driverId}:`, { status, hasLocation: !!location });
    
    if (!isValidUUID(driverId)) {
      return c.json({ success: false, error: "ID conducteur invalide" }, 400);
    }
    
    const driver = await kv.get<any>(`driver:${driverId}`);
    if (!driver) {
      console.error(`❌ [POST /:id/status] Conducteur non trouvé: ${driverId}`);
      return c.json({ success: false, error: "Conducteur non trouvé" }, 404);
    }
    
    // Vérifier le solde si mise en ligne
    if (status === 'online' && (driver.balance || 0) < 0) {
      console.error(`❌ [POST /:id/status] Solde insuffisant:`, { driverId, balance: driver.balance });
      return c.json({ success: false, error: "Solde insuffisant pour se mettre en ligne" }, 403);
    }
    
    // ✅ FIX CRITIQUE : Mettre à jour TOUS les champs utilisés par le matching
    driver.status = status;
    driver.available = (status === 'online');  // ✅ Champ utilisé par findAndNotifyNearbyDrivers
    driver.is_available = (status === 'online');  // ✅ Champ alternatif utilisé par findAndNotifyNearbyDrivers
    
    // Mettre à jour la position si fournie
    if (location) {
      driver.location = location;
      driver.current_location = location;
      driver.currentLocation = location;  // ✅ Champ utilisé par le matching
      driver.last_location_update = new Date().toISOString();
    }
    
    driver.lastUpdate = new Date().toISOString();
    driver.updated_at = new Date().toISOString();
    
    // Sauvegarder dans KV Store
    await kv.set(`driver:${driverId}`, driver);
    await kv.set(`profile:${driverId}`, driver);  // ✅ Double sauvegarde pour compatibilité
    
    console.log(`✅ [POST /:id/status] Statut mis à jour:`, {
      driverId: driverId.substring(0, 8),
      status: driver.status,
      available: driver.available,
      is_available: driver.is_available,
      hasLocation: !!driver.currentLocation,
      vehicleCategory: driver.vehicle?.category || driver.vehicleCategory || driver.vehicle_category
    });
    
    return c.json({ success: true, driver });
  } catch (error) {
    console.error("❌ Erreur mise à jour statut:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

// 💰 GET DRIVER BALANCE (DOIT ÊTRE AVANT POST POUR ÉVITER LES CONFLITS DE ROUTES)
app.get("/:id/balance", async (c) => {
  try {
    const driverId = c.req.param('id');
    
    console.log(`💰 [GET-BALANCE] Récupération du solde pour: ${driverId}`);
    
    if (!isValidUUID(driverId)) {
      return c.json({ success: false, error: "ID conducteur invalide" }, 400);
    }
    
    const driver = await kv.get<any>(`driver:${driverId}`);
    
    if (!driver) {
      console.error(`❌ [GET-BALANCE] Conducteur non trouvé: ${driverId}`);
      return c.json({ success: false, error: "Conducteur non trouvé" }, 404);
    }
    
    const balance = driver.balance || 0;
    
    console.log(`✅ [GET-BALANCE] Solde récupéré: ${balance} CDF pour ${driver.full_name || driver.name}`);
    
    return c.json({ 
      success: true, 
      balance: balance,
      driver: {
        id: driver.id,
        name: driver.full_name || driver.name,
        phone: driver.phone
      }
    });
  } catch (error) {
    console.error("❌ [GET-BALANCE] Erreur:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

// 💰 UPDATE DRIVER BALANCE (POST APRÈS GET)
app.post("/:id/balance", async (c) => {
  try {
    const driverId = c.req.param('id');
    const { amount, reason } = await c.req.json();
    if (!isValidUUID(driverId)) {
      return c.json({ success: false, error: "ID conducteur invalide" }, 400);
    }
    const driver = await kv.get<any>(`driver:${driverId}`);
    if (!driver) {
      return c.json({ success: false, error: "Conducteur non trouvé" }, 404);
    }
    driver.balance = (driver.balance || 0) + amount;
    driver.lastUpdate = new Date().toISOString();
    await kv.set(`driver:${driverId}`, driver);
    console.log(`💰 Solde conducteur ${driverId} mis à jour: ${driver.balance} (${reason})`);
    return c.json({ success: true, balance: driver.balance });
  } catch (error) {
    console.error("❌ Erreur mise à jour solde:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

// 📱 POST FCM TOKEN FOR DRIVER (Enregistrer le token)
app.post("/:id/fcm-token", async (c) => {
  try {
    const driverId = c.req.param('id');
    const { fcmToken } = await c.req.json();
    
    console.log(`📱 [FCM-TOKEN] Enregistrement token pour driver ${driverId}...`);
    
    if (!isValidUUID(driverId)) {
      return c.json({ success: false, error: "ID conducteur invalide" }, 400);
    }
    
    if (!fcmToken || typeof fcmToken !== 'string' || fcmToken.length < 20) {
      console.error(`❌ [FCM-TOKEN] Token invalide:`, fcmToken?.substring(0, 20));
      return c.json({ success: false, error: "Token FCM invalide" }, 400);
    }
    
    const driver = await kv.get<any>(`driver:${driverId}`);
    if (!driver) {
      return c.json({ success: false, error: "Conducteur non trouvé" }, 404);
    }
    
    // Sauvegarder le token FCM
    driver.fcmToken = fcmToken;
    driver.fcmTokenUpdatedAt = new Date().toISOString();
    driver.lastUpdate = new Date().toISOString();
    
    await kv.set(`driver:${driverId}`, driver);
    
    console.log(`✅ [FCM-TOKEN] Token FCM enregistré pour ${driver.full_name || driver.name}`);
    console.log(`   Token: ${fcmToken.substring(0, 30)}...`);
    
    return c.json({ 
      success: true, 
      message: "Token FCM enregistré avec succès",
      driver: {
        id: driver.id,
        name: driver.full_name || driver.name,
        fcmTokenRegistered: true
      }
    });
  } catch (error) {
    console.error("❌ [FCM-TOKEN] Erreur enregistrement token:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

// 🗑️ DELETE FCM TOKEN FOR DRIVER
app.delete("/:id/fcm-token", async (c) => {
  try {
    const driverId = c.req.param('id');
    
    console.log(`🗑️ Suppression token FCM pour driver ${driverId}...`);
    
    if (!isValidUUID(driverId)) {
      return c.json({ success: false, error: "ID conducteur invalide" }, 400);
    }
    
    const driver = await kv.get<any>(`driver:${driverId}`);
    if (!driver) {
      return c.json({ success: false, error: "Conducteur non trouvé" }, 404);
    }
    
    // Supprimer le token FCM
    delete driver.fcmToken;
    delete driver.fcmTokenUpdatedAt;
    driver.lastUpdate = new Date().toISOString();
    
    await kv.set(`driver:${driverId}`, driver);
    
    console.log(`✅ Token FCM supprimé pour ${driver.full_name || driver.name}`);
    
    return c.json({ success: true, message: "Token FCM supprimé" });
  } catch (error) {
    console.error("❌ Erreur suppression token FCM:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

// 🔥 NOUVELLES ROUTES FCM SÉCURISÉES (Backend-only)

// 📱 FCM REGISTER (Le frontend envoie maintenant le token via /fcm-token)
// Cette route est maintenant deprecated - utiliser POST /:id/fcm-token à la place
app.post("/:id/fcm-register", async (c) => {
  try {
    const driverId = c.req.param('id');
    
    console.log(`⚠️ [FCM-REGISTER] Route deprecated - redirection vers /fcm-token`);
    console.log(`📱 [FCM-REGISTER] Driver: ${driverId}`);
    
    // Cette route ne fait plus rien - le frontend doit utiliser POST /:id/fcm-token
    // avec le vrai token FCM généré côté client
    
    return c.json({ 
      success: false, 
      error: "Route deprecated - Utilisez POST /:id/fcm-token avec un vrai token FCM",
      message: "Le frontend doit générer le token FCM et l'envoyer à /fcm-token"
    }, 410); // 410 Gone
  } catch (error) {
    console.error("❌ [FCM-REGISTER] Erreur:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

// 🗑️ FCM UNREGISTER
app.post("/:id/fcm-unregister", async (c) => {
  try {
    const driverId = c.req.param('id');
    
    console.log(`🗑️ [FCM-UNREGISTER] Désenregistrement FCM pour driver: ${driverId}`);
    
    if (!isValidUUID(driverId)) {
      return c.json({ success: false, error: "ID conducteur invalide" }, 400);
    }
    
    const driver = await kv.get<any>(`driver:${driverId}`);
    if (!driver) {
      return c.json({ success: false, error: "Conducteur non trouvé" }, 404);
    }
    
    // Supprimer le token FCM
    delete driver.fcmToken;
    delete driver.fcmTokenUpdatedAt;
    driver.lastUpdate = new Date().toISOString();
    
    await kv.set(`driver:${driverId}`, driver);
    
    console.log(`✅ [FCM-UNREGISTER] Token supprimé pour ${driver.full_name || driver.name}`);
    
    return c.json({ success: true, message: "Notifications désactivées" });
  } catch (error) {
    console.error("❌ [FCM-UNREGISTER] Erreur:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

// 📤 ENVOYER NOTIFICATION TEST À UN CONDUCTEUR
app.post("/:id/send-notification", async (c) => {
  try {
    const driverId = c.req.param('id');
    const { title, body, data } = await c.req.json();
    
    console.log(`📤 [SEND-NOTIFICATION] Envoi notification à driver: ${driverId}`);
    console.log(`   Titre: ${title}`);
    console.log(`   Message: ${body}`);
    
    if (!isValidUUID(driverId)) {
      return c.json({ success: false, error: "ID conducteur invalide" }, 400);
    }
    
    if (!title || !body) {
      return c.json({ success: false, error: "Titre et message requis" }, 400);
    }
    
    // Récupérer le conducteur avec son token FCM
    const driver = await kv.get<any>(`driver:${driverId}`);
    if (!driver) {
      return c.json({ success: false, error: "Conducteur non trouvé" }, 404);
    }
    
    if (!driver.fcmToken) {
      return c.json({ 
        success: false, 
        error: "Token FCM non enregistré pour ce conducteur",
        hint: "Le conducteur doit d'abord ouvrir son dashboard et accepter les notifications"
      }, 400);
    }
    
    console.log(`   → Envoi à: ${driver.full_name || driver.name}`);
    console.log(`   → Token: ${driver.fcmToken.substring(0, 30)}...`);
    
    // Initialiser Firebase Admin
    const firebaseAdmin = await getFirebaseAdmin();
    if (!firebaseAdmin) {
      return c.json({ 
        success: false, 
        error: "Firebase Admin non disponible",
        hint: "Vérifiez que FIREBASE_SERVICE_ACCOUNT_JSON est défini"
      }, 500);
    }
    
    // Préparer le message FCM
    const message = {
      notification: {
        title,
        body
      },
      data: data || {},
      token: driver.fcmToken,
      android: {
        priority: 'high' as const,
        notification: {
          sound: 'default',
          channelId: 'smartcabb-rides',
          priority: 'high' as const,
          defaultSound: true,
          defaultVibrateTimings: true
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1
          }
        }
      },
      webpush: {
        notification: {
          icon: '/logo-smartcabb.png',
          badge: '/badge-smartcabb.png',
          requireInteraction: true,
          vibrate: [200, 100, 200, 100, 200]
        }
      }
    };
    
    // Envoyer la notification
    try {
      const response = await firebaseAdmin.messaging.send(message);
      console.log(`✅ [SEND-NOTIFICATION] Notification envoyée avec succès:`, response);
      
      return c.json({ 
        success: true, 
        message: "Notification envoyée avec succès",
        messageId: response,
        driver: {
          id: driver.id,
          name: driver.full_name || driver.name
        }
      });
    } catch (fcmError: any) {
      console.error(`❌ [SEND-NOTIFICATION] Erreur FCM:`, fcmError);
      
      // Erreurs spécifiques FCM
      if (fcmError.code === 'messaging/invalid-registration-token' || 
          fcmError.code === 'messaging/registration-token-not-registered') {
        // Token invalide ou expiré - le supprimer
        delete driver.fcmToken;
        delete driver.fcmTokenUpdatedAt;
        await kv.set(`driver:${driverId}`, driver);
        
        return c.json({ 
          success: false, 
          error: "Token FCM invalide ou expiré - supprimé",
          hint: "Demandez au conducteur de réenregistrer son token"
        }, 400);
      }
      
      return c.json({ 
        success: false, 
        error: `Erreur FCM: ${fcmError.message}`,
        code: fcmError.code
      }, 500);
    }
  } catch (error: any) {
    console.error("❌ [SEND-NOTIFICATION] Erreur serveur:", error);
    return c.json({ 
      success: false, 
      error: "Erreur serveur",
      details: error.message 
    }, 500);
  }
});

// ✏️ UPDATE DRIVER (SYNCHRONISATION TRIPLE SOURCE)
app.post("/update/:id", async (c) => {
  try {
    const driverId = c.req.param('id');
    const updates = await c.req.json();
    
    console.log('🔥🔥🔥 ========== BACKEND: UPDATE DRIVER DÉBUT ==========');
    console.log('📋 Driver ID:', driverId);
    console.log('📝 Updates:', JSON.stringify(updates, null, 2));
    
    if (!isValidUUID(driverId)) {
      console.error('❌ ID invalide:', driverId);
      return c.json({ success: false, error: "ID conducteur invalide" }, 400);
    }
    
    // Initialiser Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Variables Supabase manquantes');
      return c.json({ success: false, error: "Configuration serveur incorrecte" }, 500);
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // SOURCE 1️⃣: Mettre à jour dans KV Store
    console.log('📦 SOURCE 1: Mise à jour KV Store...');
    const existingDriver = await kv.get<any>(`driver:${driverId}`);
    
    if (!existingDriver) {
      console.error('❌ Conducteur non trouvé dans KV');
      return c.json({ success: false, error: "Conducteur non trouvé" }, 404);
    }
    
    const updatedDriver = {
      ...existingDriver,
      ...updates,
      updated_at: new Date().toISOString()
    };
    
    await kv.set(`driver:${driverId}`, updatedDriver);
    await kv.set(`profile:${driverId}`, updatedDriver);
    console.log('✅ SOURCE 1: KV Store mis à jour');
    console.log('   Status KV:', updatedDriver.status);
    
    // SOURCE 2️⃣: Mettre à jour dans Postgres (table drivers)
    console.log('🗄️ SOURCE 2: Mise à jour Postgres...');
    const { data: pgDriver, error: pgError } = await supabase
      .from('drivers')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', driverId)
      .select()
      .single();
    
    if (pgError) {
      console.error('❌ SOURCE 2: Erreur Postgres:', pgError);
      console.warn('⚠️ Continuing despite Postgres error');
    } else {
      console.log('✅ SOURCE 2: Postgres mis à jour');
      console.log('   Status Postgres:', pgDriver?.status);
    }
    
    // SOURCE 3️⃣: Mettre à jour dans Auth (user_metadata)
    console.log('🔐 SOURCE 3: Mise à jour Auth metadata...');
    
    try {
      // Récupérer l'utilisateur Auth actuel
      const { data: authUser, error: authGetError } = await supabase.auth.admin.getUserById(driverId);
      
      if (authGetError || !authUser) {
        // ✅ FIX: Ne pas bloquer si l'utilisateur Auth n'est pas trouvé (peut être supprimé ou pas encore créé)
        console.error('❌ SOURCE 3: Impossible de récupérer l\'utilisateur Auth:', authGetError?.message);
        console.log('⚠️ Continuing without Auth metadata update (user might not exist in Auth yet)');
      } else {
        // Mettre à jour le user_metadata
        const currentMetadata = authUser.user.user_metadata || {};
        const updatedMetadata = {
          ...currentMetadata,
          ...updates,
          updated_at: new Date().toISOString()
        };
        
        const { data: updatedAuthUser, error: authUpdateError } = await supabase.auth.admin.updateUserById(
          driverId,
          { user_metadata: updatedMetadata }
        );
        
        if (authUpdateError) {
          console.error('❌ SOURCE 3: Erreur mise à jour Auth:', authUpdateError);
        } else {
          console.log('✅ SOURCE 3: Auth metadata mis à jour');
          console.log('   Status Auth:', updatedMetadata.status);
        }
      }
    } catch (authError) {
      console.error('❌ SOURCE 3: Exception Auth:', authError instanceof Error ? authError.message : authError);
      console.log('⚠️ Continuing despite Auth error');
    }
    
    console.log('🔥🔥🔥 ========== BACKEND: UPDATE DRIVER FIN ==========');
    
    return c.json({ 
      success: true, 
      driver: updatedDriver,
      message: 'Conducteur mis à jour avec succès'
    });
    
  } catch (error) {
    console.error("❌ Erreur mise à jour conducteur:", error);
    console.log('🔥🔥🔥 ========== BACKEND: UPDATE DRIVER ERREUR ==========');
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Erreur serveur" 
    }, 500);
  }
});

// 📍 UPDATE DRIVER LOCATION
app.post("/update-driver-location", async (c) => {
  try {
    const { driverId, location } = await c.req.json();
    
    console.log('📍 [UPDATE-LOCATION] Mise à jour position conducteur:', driverId);
    
    if (!driverId) {
      return c.json({ success: false, error: "ID conducteur requis" }, 400);
    }
    
    if (!isValidUUID(driverId)) {
      return c.json({ success: false, error: "ID conducteur invalide" }, 400);
    }
    
    if (!location || typeof location.lat !== 'number' || typeof location.lng !== 'number') {
      return c.json({ success: false, error: "Position invalide" }, 400);
    }
    
    // Récupérer le conducteur depuis KV Store
    const driver = await kv.get<any>(`driver:${driverId}`);
    
    if (!driver) {
      console.error('❌ [UPDATE-LOCATION] Driver non trouvé:', driverId);
      return c.json({ success: false, error: "Conducteur non trouvé" }, 404);
    }
    
    // Mettre à jour la position
    driver.location = location;
    driver.current_location = location;
    driver.last_location_update = new Date().toISOString();
    driver.updated_at = new Date().toISOString();
    
    // Sauvegarder dans KV Store
    await kv.set(`driver:${driverId}`, driver);
    await kv.set(`profile:${driverId}`, driver);
    
    console.log('✅ [UPDATE-LOCATION] Position mise à jour:', {
      lat: location.lat,
      lng: location.lng,
      timestamp: driver.last_location_update
    });
    
    return c.json({ 
      success: true, 
      location,
      message: 'Position mise à jour'
    });
    
  } catch (error) {
    console.error("❌ [UPDATE-LOCATION] Erreur:", error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Erreur serveur" 
    }, 500);
  }
});

// 🔄 TOGGLE ONLINE STATUS
app.post("/toggle-online-status", async (c) => {
  try {
    const { driverId, isOnline, location } = await c.req.json();
    
    console.log('🔄 [TOGGLE-ONLINE] Changement statut en ligne:', { driverId, isOnline });
    
    if (!driverId) {
      return c.json({ success: false, error: "ID conducteur requis" }, 400);
    }
    
    if (!isValidUUID(driverId)) {
      return c.json({ success: false, error: "ID conducteur invalide" }, 400);
    }
    
    // Récupérer le conducteur depuis KV Store
    const driver = await kv.get<any>(`driver:${driverId}`);
    
    if (!driver) {
      console.error('❌ [TOGGLE-ONLINE] Driver non trouvé:', driverId);
      return c.json({ success: false, error: "Conducteur non trouvé" }, 404);
    }
    
    // ✅ VÉRIFICATION : Bloquer UNIQUEMENT les conducteurs explicitement rejetés/suspendus ou en attente
    // Accepter tous les autres statuts (approved, offline, available, null, undefined, etc.)
    const blockedStatuses = ['pending', 'rejected', 'suspended'];
    const isBlocked = blockedStatuses.includes(driver.status);
    
    if (isOnline && isBlocked) {
      console.error('❌ [TOGGLE-ONLINE] Conducteur bloqué:', { 
        driverId, 
        status: driver.status 
      });
      
      let errorMessage = "Votre compte doit être approuvé avant de vous mettre en ligne";
      
      if (driver.status === 'rejected') {
        errorMessage = "Votre compte a été rejeté. Contactez le support.";
      } else if (driver.status === 'suspended') {
        errorMessage = "Votre compte est suspendu. Contactez le support.";
      } else if (driver.status === 'pending') {
        errorMessage = "Votre compte est en attente d'approbation.";
      }
      
      return c.json({ 
        success: false, 
        error: errorMessage
      }, 403);
    }
    
    // ✅ Auto-approuver si le statut n'est pas 'approved' mais n'est pas bloqué non plus
    if (!driver.status || (driver.status !== 'approved' && !blockedStatuses.includes(driver.status))) {
      console.log(`✅ [TOGGLE-ONLINE] Auto-approbation du conducteur ${driverId} avec statut: ${driver.status || 'null'}`);
      driver.status = 'approved';
      driver.approved_at = driver.approved_at || new Date().toISOString();
    }
    
    // Vérifier le solde si le conducteur veut se mettre en ligne
    // Le conducteur ne peut pas se mettre en ligne si son solde est négatif
    const currentBalance = driver.balance || 0;
    if (isOnline && currentBalance < 0) {
      console.error('❌ [TOGGLE-ONLINE] Solde insuffisant:', { 
        driverId, 
        balance: currentBalance 
      });
      return c.json({ 
        success: false, 
        error: `Solde insuffisant (${currentBalance} FC). Veuillez recharger votre compte.` 
      }, 403);
    }
    
    // Mettre à jour le statut en ligne
    driver.is_available = isOnline;
    driver.available = isOnline; // ✅ NOUVEAU : Champ utilisé par le matching
    driver.status = isOnline ? 'online' : 'offline'; // ✅ NOUVEAU : Champ utilisé par le matching
    
    // Mettre à jour la position si fournie
    if (location && typeof location.lat === 'number' && typeof location.lng === 'number') {
      driver.location = location;
      driver.current_location = location;
      driver.currentLocation = location; // ✅ NOUVEAU : Champ utilisé par le matching
      driver.last_location_update = new Date().toISOString();
    }
    
    driver.updated_at = new Date().toISOString();
    
    // Sauvegarder dans KV Store
    await kv.set(`driver:${driverId}`, driver);
    await kv.set(`profile:${driverId}`, driver);
    
    console.log('✅ [TOGGLE-ONLINE] Statut en ligne mis à jour:', {
      driverId,
      is_available: driver.is_available,
      balance: currentBalance,
      location: driver.location ? 'oui' : 'non'
    });
    
    return c.json({ 
      success: true, 
      driver,
      message: isOnline ? 'Vous êtes maintenant en ligne' : 'Vous êtes maintenant hors ligne'
    });
    
  } catch (error) {
    console.error("❌ [TOGGLE-ONLINE] Erreur:", error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Erreur serveur" 
    }, 500);
  }
});

// 📍 GET ONLINE DRIVERS
app.get("/online/list", async (c) => {
  try {
    const allDrivers = await kv.getByPrefix<any>('driver:');
    const onlineDrivers = allDrivers.filter(d => d.status === 'online');
    return c.json({ success: true, drivers: onlineDrivers });
  } catch (error) {
    console.error("❌ Erreur récupération conducteurs en ligne:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

// 🆕 CREATE DRIVER PROFILE WITH VEHICLE INFO
app.post("/create", async (c) => {
  try {
    const body = await c.req.json();
    const {
      userId,
      vehicleType,
      vehicleCategory,
      licensePlate,
      vehiclePlate,
      vehicleBrand,
      vehicleMake,
      vehicleModel,
      vehicleYear,
      vehicleColor,
      documents
    } = body;

    console.log('🚗 [DRIVERS/CREATE] Début création profil conducteur');
    console.log('📋 [DRIVERS/CREATE] userId:', userId);
    console.log('📋 [DRIVERS/CREATE] Données reçues:', {
      vehicleCategory,
      vehicleType,
      vehicleMake,
      vehicleBrand,
      vehicleModel,
      vehiclePlate,
      licensePlate,
      vehicleColor,
      vehicleYear,
      hasProfilePhoto: !!(documents?.profilePhoto),
      photoLength: documents?.profilePhoto ? documents.profilePhoto.length : 0
    });

    if (!userId || !isValidUUID(userId)) {
      console.error('❌ [DRIVERS/CREATE] ID utilisateur invalide:', userId);
      return c.json({ success: false, error: "ID utilisateur invalide" }, 400);
    }

    // Récupérer le profil de base depuis Supabase Auth (avec retry)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // ✅ FIX: Retry pour gérer les délais de propagation Auth
    let authUser: any = null;
    let authError: any = null;
    
    for (let attempt = 1; attempt <= 3; attempt++) {
      console.log(`🔄 [DRIVERS/CREATE] Tentative ${attempt}/3 de récupération Auth...`);
      const result = await supabase.auth.admin.getUserById(userId);
      authUser = result.data;
      authError = result.error;
      
      if (!authError && authUser) {
        console.log(`✅ [DRIVERS/CREATE] Utilisateur Auth trouvé à la tentative ${attempt}`);
        break;
      }
      
      if (attempt < 3) {
        console.log(`⚠️ [DRIVERS/CREATE] Utilisateur non trouvé, attente 1s avant retry...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    if (authError || !authUser) {
      console.error('❌ [DRIVERS/CREATE] Utilisateur non trouvé dans Auth après 3 tentatives:', authError?.message || 'User not found');
      console.log('⚠️ [DRIVERS/CREATE] Création du profil avec données minimales...');
      
      // ✅ FIX: Continuer avec des données minimales au lieu de bloquer
      authUser = {
        user: {
          id: userId,
          email: '',
          user_metadata: {
            full_name: 'Conducteur',
            name: 'Conducteur',
            phone: ''
          },
          phone: ''
        }
      };
    }

    // Normaliser les champs du véhicule
    const plate = licensePlate || vehiclePlate || '';
    const make = vehicleBrand || vehicleMake || '';
    const category = vehicleCategory || vehicleType || 'smart_standard';
    const color = vehicleColor || '';
    const model = vehicleModel || '';
    const year = vehicleYear || new Date().getFullYear().toString();

    console.log('✅ [DRIVERS/CREATE] Données normalisées:', {
      category,
      make,
      model,
      plate,
      color,
      year
    });

    // Créer le profil conducteur complet
    const driverProfile = {
      id: userId,
      user_id: userId,
      email: authUser.user.email || '',
      full_name: authUser.user.user_metadata?.full_name || authUser.user.user_metadata?.name || 'Conducteur',
      name: authUser.user.user_metadata?.full_name || authUser.user.user_metadata?.name || 'Conducteur',
      phone: authUser.user.user_metadata?.phone || authUser.user.phone || '',
      role: 'driver',
      
      // Informations du véhicule - TOUS LES FORMATS
      vehicle_category: category,
      vehicle_type: category, // Alias
      license_plate: plate,
      vehicle_plate: plate, // Alias
      vehicle_make: make,
      vehicle_brand: make, // Alias
      vehicle_model: model,
      vehicle_year: year,
      vehicle_color: color,
      
      // Objet véhicule structuré
      vehicle: {
        category: category,
        make: make,
        model: model,
        year: year,
        color: color,
        license_plate: plate
      },
      
      // Documents
      profile_photo: documents?.profilePhoto || null,
      driver_license: documents?.driverLicense || null,
      vehicle_registration: documents?.vehicleRegistration || null,
      insurance: documents?.insurance || null,
      
      // Statut et validation
      status: 'pending', // En attente d'approbation admin
      is_available: false,
      is_approved: false,
      
      // Financier
      balance: 0,
      total_earnings: 0,
      
      // Statistiques
      total_trips: 0,
      completed_trips: 0,
      cancelled_trips: 0,
      rating: 0,
      ratings_count: 0,
      
      // Localisation
      location: null,
      current_location: null,
      last_location_update: null,
      
      // Timestamps
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_login_at: new Date().toISOString()
    };

    console.log('💾 [DRIVERS/CREATE] Profil à sauvegarder:', {
      id: driverProfile.id,
      full_name: driverProfile.full_name,
      phone: driverProfile.phone,
      vehicle_category: driverProfile.vehicle_category,
      vehicle_make: driverProfile.vehicle_make,
      vehicle_model: driverProfile.vehicle_model,
      vehicle_plate: driverProfile.vehicle_plate,
      vehicle_color: driverProfile.vehicle_color,
      hasPhoto: !!driverProfile.profile_photo
    });

    // Sauvegarder dans le KV store avec tous les préfixes nécessaires
    await kv.set(`driver:${userId}`, driverProfile);
    await kv.set(`profile:${userId}`, driverProfile);
    
    console.log('✅ [DRIVERS/CREATE] Profil sauvegardé dans KV store');
    console.log('✅ [DRIVERS/CREATE] Clés KV créées: driver:' + userId + ', profile:' + userId);
    console.log('📋 [DRIVERS/CREATE] Véhicule enregistré:', { 
      make: driverProfile.vehicle_make, 
      model: driverProfile.vehicle_model, 
      plate: driverProfile.vehicle_plate, 
      category: driverProfile.vehicle_category, 
      color: driverProfile.vehicle_color 
    });
    console.log('📸 [DRIVERS/CREATE] Photo de profil:', driverProfile.profile_photo ? 'OUI (' + driverProfile.profile_photo.substring(0, 50) + '...)' : 'NON');

    return c.json({
      success: true,
      driver: driverProfile,
      message: 'Profil conducteur créé avec succès'
    });

  } catch (error) {
    console.error("❌ [DRIVERS/CREATE] Erreur création profil conducteur:", error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Erreur serveur" 
    }, 500);
  }
});

// 📊 GET DRIVER STATS (Statistiques du conducteur)
app.get("/:id/stats", async (c) => {
  try {
    const driverId = c.req.param('id');
    
    console.log(`📊 [GET-STATS] Récupération des stats pour: ${driverId}`);
    
    if (!isValidUUID(driverId)) {
      return c.json({ success: false, error: "ID conducteur invalide" }, 400);
    }
    
    const driver = await kv.get<any>(`driver:${driverId}`);
    
    if (!driver) {
      console.error(`❌ [GET-STATS] Conducteur non trouvé: ${driverId}`);
      return c.json({ success: false, error: "Conducteur non trouvé" }, 404);
    }
    
    // Retourner les statistiques du conducteur
    const stats = {
      totalRides: driver.totalRides || driver.total_trips || driver.completed_trips || 0,
      completedTrips: driver.completed_trips || driver.totalRides || driver.total_trips || 0,
      cancelledTrips: driver.cancelled_trips || 0,
      rating: driver.rating || 0,
      ratingsCount: driver.ratings_count || 0,
      totalEarnings: driver.total_earnings || 0,
      balance: driver.balance || 0
    };
    
    console.log(`✅ [GET-STATS] Stats récupérées:`, stats);
    
    return c.json({ 
      success: true, 
      stats
    });
  } catch (error) {
    console.error("❌ [GET-STATS] Erreur:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

// 💵 GET DRIVER EARNINGS (Gains du conducteur par période)
app.get("/:id/earnings/period=:period", async (c) => {
  try {
    const driverId = c.req.param('id');
    const period = c.req.param('period'); // today, week, month, year
    
    console.log(`💵 [GET-EARNINGS] Récupération des gains pour: ${driverId}, période: ${period}`);
    
    if (!isValidUUID(driverId)) {
      return c.json({ success: false, error: "ID conducteur invalide" }, 400);
    }
    
    // Pour l'instant, retourner 0 car on n'a pas de système de tracking détaillé
    // TODO: Implémenter le système de tracking des gains par période
    const earnings = {
      period: period,
      amount: 0,
      rides: 0
    };
    
    console.log(`✅ [GET-EARNINGS] Gains récupérés:`, earnings);
    
    return c.json({ 
      success: true, 
      earnings
    });
  } catch (error) {
    console.error("❌ [GET-EARNINGS] Erreur:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

// 💰💵 NOUVEAU SYSTÈME DE TRIPLE SOLDE
// =======================================
// 1. creditBalance (balance) : Solde de crédit pour se mettre en ligne (réduit de 15% après course)
// 2. earningsBalance : Solde de gains informatif (argent gagné après commission - NON RETIRABLE)
// 3. bonusBalance : Solde de bonus défini par l'admin (SEUL MONTANT RETIRABLE)

// 📊 GET WALLETS - Récupérer les trois soldes
app.get("/:id/wallets", async (c) => {
  try {
    const driverId = c.req.param('id');
    
    if (!isValidUUID(driverId)) {
      return c.json({ success: false, error: "ID conducteur invalide" }, 400);
    }
    
    const driver = await kv.get<any>(`driver:${driverId}`);
    if (!driver) {
      return c.json({ success: false, error: "Conducteur non trouvé" }, 404);
    }
    
    const creditBalance = driver.balance || 0;
    const earningsBalance = driver.earningsBalance || 0;
    const bonusBalance = driver.bonusBalance || 0;
    
    console.log(`📊 [WALLETS] Driver ${driverId}:`, {
      creditBalance,
      earningsBalance,
      bonusBalance
    });
    
    return c.json({
      success: true,
      creditBalance,
      earningsBalance,
      bonusBalance,
      driver: {
        id: driver.id,
        name: driver.full_name || driver.name
      }
    });
  } catch (error) {
    console.error("❌ [WALLETS] Erreur:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

// 💳 RECHARGE - Recharger le solde de crédit
app.post("/:id/wallet/recharge", async (c) => {
  try {
    const driverId = c.req.param('id');
    const { amount } = await c.req.json();
    
    if (!isValidUUID(driverId)) {
      return c.json({ success: false, error: "ID conducteur invalide" }, 400);
    }
    
    if (!amount || isNaN(amount) || amount <= 0) {
      return c.json({ success: false, error: "Montant invalide" }, 400);
    }
    
    if (amount < 1000) {
      return c.json({ success: false, error: "Montant minimum: 1 000 CDF" }, 400);
    }
    
    const driver = await kv.get<any>(`driver:${driverId}`);
    if (!driver) {
      return c.json({ success: false, error: "Conducteur non trouvé" }, 404);
    }
    
    // Ajouter au solde de crédit
    const oldBalance = driver.balance || 0;
    const newCreditBalance = oldBalance + amount;
    
    driver.balance = newCreditBalance;
    driver.lastUpdate = new Date().toISOString();
    
    await kv.set(`driver:${driverId}`, driver);
    
    console.log(`💳 [RECHARGE] Driver ${driverId}: ${oldBalance} CDF → ${newCreditBalance} CDF (+${amount} CDF)`);
    
    // Enregistrer la transaction dans l'historique
    const transactionKey = `transaction:${crypto.randomUUID()}`;
    await kv.set(transactionKey, {
      id: crypto.randomUUID(),
      driverId,
      type: 'recharge',
      amount,
      oldBalance,
      newBalance: newCreditBalance,
      timestamp: new Date().toISOString(),
      status: 'completed'
    });
    
    return c.json({
      success: true,
      newCreditBalance,
      message: `Recharge de ${amount.toLocaleString('fr-FR')} CDF effectuée avec succès`
    });
  } catch (error) {
    console.error("❌ [RECHARGE] Erreur:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

// 💸 WITHDRAW - Retirer du solde de bonus (SEUL SOLDE RETIRABLE)
app.post("/:id/wallet/withdraw", async (c) => {
  try {
    const driverId = c.req.param('id');
    const { amount } = await c.req.json();
    
    if (!isValidUUID(driverId)) {
      return c.json({ success: false, error: "ID conducteur invalide" }, 400);
    }
    
    if (!amount || isNaN(amount) || amount <= 0) {
      return c.json({ success: false, error: "Montant invalide" }, 400);
    }
    
    if (amount < 5000) {
      return c.json({ success: false, error: "Montant minimum de retrait: 5 000 CDF" }, 400);
    }
    
    const driver = await kv.get<any>(`driver:${driverId}`);
    if (!driver) {
      return c.json({ success: false, error: "Conducteur non trouvé" }, 404);
    }
    
    const bonusBalance = driver.bonusBalance || 0;
    
    if (amount > bonusBalance) {
      return c.json({ 
        success: false, 
        error: `Solde de bonus insuffisant. Disponible: ${bonusBalance.toLocaleString('fr-FR')} CDF` 
      }, 400);
    }
    
    // Déduire du solde de bonus
    const newBonusBalance = bonusBalance - amount;
    
    driver.bonusBalance = newBonusBalance;
    driver.lastUpdate = new Date().toISOString();
    
    await kv.set(`driver:${driverId}`, driver);
    
    console.log(`💸 [WITHDRAW] Driver ${driverId}: ${bonusBalance} CDF → ${newBonusBalance} CDF (-${amount} CDF bonus)`);
    
    // Enregistrer la demande de retrait
    const withdrawalKey = `withdrawal:${crypto.randomUUID()}`;
    await kv.set(withdrawalKey, {
      id: crypto.randomUUID(),
      driverId,
      driverName: driver.full_name || driver.name,
      driverPhone: driver.phone,
      amount,
      oldBalance: bonusBalance,
      newBalance: newBonusBalance,
      balanceType: 'bonus', // Préciser que c'est un retrait de bonus
      status: 'pending', // pending → processing → completed / failed
      requestedAt: new Date().toISOString(),
      processedAt: null,
      paymentMethod: 'mobile_money', // À implémenter avec M-PESA, Airtel Money, etc.
      notes: 'Demande de retrait de bonus en attente de traitement'
    });
    
    return c.json({
      success: true,
      newBonusBalance,
      message: `Demande de retrait de ${amount.toLocaleString('fr-FR')} CDF enregistrée. Traitement sous 24-48h.`
    });
  } catch (error) {
    console.error("❌ [WITHDRAW] Erreur:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

// 💰 ADD EARNINGS - Ajouter au solde de gains (appelé après une course complétée)
app.post("/:id/wallet/add-earnings", async (c) => {
  try {
    const driverId = c.req.param('id');
    const { amount, rideId } = await c.req.json();
    
    if (!isValidUUID(driverId)) {
      return c.json({ success: false, error: "ID conducteur invalide" }, 400);
    }
    
    if (!amount || isNaN(amount) || amount <= 0) {
      return c.json({ success: false, error: "Montant invalide" }, 400);
    }
    
    const driver = await kv.get<any>(`driver:${driverId}`);
    if (!driver) {
      return c.json({ success: false, error: "Conducteur non trouvé" }, 404);
    }
    
    // Ajouter au solde de gains
    const oldEarningsBalance = driver.earningsBalance || 0;
    const newEarningsBalance = oldEarningsBalance + amount;
    
    driver.earningsBalance = newEarningsBalance;
    driver.lastUpdate = new Date().toISOString();
    
    await kv.set(`driver:${driverId}`, driver);
    
    console.log(`💰 [ADD-EARNINGS] Driver ${driverId}: ${oldEarningsBalance} CDF → ${newEarningsBalance} CDF (+${amount} CDF) [Ride: ${rideId}]`);
    
    return c.json({
      success: true,
      newEarningsBalance,
      message: `Gains de ${amount.toLocaleString('fr-FR')} CDF ajoutés à votre solde`
    });
  } catch (error) {
    console.error("❌ [ADD-EARNINGS] Erreur:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

// 🎁 ADMIN - Ajouter un bonus au conducteur
app.post("/:id/wallet/add-bonus", async (c) => {
  try {
    const driverId = c.req.param('id');
    const { amount, reason } = await c.req.json();
    
    if (!isValidUUID(driverId)) {
      return c.json({ success: false, error: "ID conducteur invalide" }, 400);
    }
    
    if (!amount || isNaN(amount) || amount <= 0) {
      return c.json({ success: false, error: "Montant invalide" }, 400);
    }
    
    const driver = await kv.get<any>(`driver:${driverId}`);
    if (!driver) {
      return c.json({ success: false, error: "Conducteur non trouvé" }, 404);
    }
    
    // Ajouter au solde de bonus
    const oldBonusBalance = driver.bonusBalance || 0;
    const newBonusBalance = oldBonusBalance + amount;
    
    driver.bonusBalance = newBonusBalance;
    driver.lastUpdate = new Date().toISOString();
    
    await kv.set(`driver:${driverId}`, driver);
    
    console.log(`🎁 [ADD-BONUS] Driver ${driverId}: ${oldBonusBalance} CDF → ${newBonusBalance} CDF (+${amount} CDF bonus) | Raison: ${reason || 'Non spécifiée'}`);
    
    // Enregistrer l'opération dans l'historique
    const bonusKey = `bonus:${crypto.randomUUID()}`;
    await kv.set(bonusKey, {
      id: crypto.randomUUID(),
      driverId,
      driverName: driver.full_name || driver.name,
      amount,
      oldBalance: oldBonusBalance,
      newBalance: newBonusBalance,
      reason: reason || 'Bonus administrateur',
      createdAt: new Date().toISOString(),
      createdBy: 'admin'
    });
    
    return c.json({
      success: true,
      newBonusBalance,
      message: `Bonus de ${amount.toLocaleString('fr-FR')} CDF ajouté avec succès !`
    });
  } catch (error) {
    console.error("❌ [ADD-BONUS] Erreur:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

// 🔍 ROUTE DE DIAGNOSTIC - Vérifier l'état d'un conducteur dans le KV Store
app.get("/:id/diagnostic", async (c) => {
  try {
    const driverId = c.req.param('id');
    
    console.log(`🔍 [DIAGNOSTIC] Vérification conducteur: ${driverId}`);
    
    if (!isValidUUID(driverId)) {
      return c.json({ success: false, error: "ID conducteur invalide" }, 400);
    }
    
    // Récupérer le conducteur depuis KV Store
    const driver = await kv.get<any>(`driver:${driverId}`);
    
    if (!driver) {
      console.log(`❌ [DIAGNOSTIC] Conducteur non trouvé dans KV Store`);
      return c.json({ 
        success: false, 
        error: "Conducteur non trouvé dans KV Store",
        found: false
      }, 404);
    }
    
    // Analyser tous les champs importants pour le matching
    const diagnostic = {
      found: true,
      driverId: driver.id,
      name: driver.full_name || driver.name,
      phone: driver.phone,
      
      // Statuts
      status: driver.status,
      available: driver.available,
      is_available: driver.is_available,
      isApproved: driver.isApproved,
      
      // Position
      hasLocation: !!driver.currentLocation || !!driver.location || !!driver.current_location,
      currentLocation: driver.currentLocation || driver.location || driver.current_location,
      lastLocationUpdate: driver.last_location_update,
      
      // Véhicule - TOUS les champs possibles
      vehicleCategory: driver.vehicleCategory || driver.vehicle_category || driver.vehicle_type || driver.vehicle?.category,
      vehicleInfo: {
        category: driver.vehicleCategory || driver.vehicle_category || driver.vehicle_type || driver.vehicle?.category,
        make: driver.vehicleMake || driver.vehicle?.make,
        model: driver.vehicleModel || driver.vehicle?.model,
        plate: driver.vehiclePlate || driver.vehicle?.plate || driver.vehicle?.license_plate,
        color: driver.vehicleColor || driver.vehicle?.color
      },
      
      // FCM
      fcmToken: driver.fcmToken ? `${driver.fcmToken.substring(0, 20)}...` : null,
      hasFCMToken: !!driver.fcmToken,
      
      // Solde
      balance: driver.balance || 0,
      earningsBalance: driver.earningsBalance || 0,
      bonusBalance: driver.bonusBalance || 0,
      
      // Timestamps
      created_at: driver.created_at,
      updated_at: driver.updated_at,
      lastUpdate: driver.lastUpdate,
      
      // Éligibilité pour le matching
      eligibleForMatching: {
        isOnline: driver.status === 'online',
        isAvailable: driver.available === true || driver.is_available === true,
        hasVehicleCategory: !!(driver.vehicleCategory || driver.vehicle_category || driver.vehicle_type || driver.vehicle?.category),
        hasFCMToken: !!driver.fcmToken,
        hasPositiveBalance: (driver.balance || 0) >= 0,
        
        // Verdict final
        eligible: (
          driver.status === 'online' &&
          (driver.available === true || driver.is_available === true) &&
          !!(driver.vehicleCategory || driver.vehicle_category || driver.vehicle_type || driver.vehicle?.category) &&
          !!driver.fcmToken
        )
      }
    };
    
    console.log(`✅ [DIAGNOSTIC] Résultat:`, {
      eligible: diagnostic.eligibleForMatching.eligible,
      status: diagnostic.status,
      available: diagnostic.available,
      vehicleCategory: diagnostic.vehicleCategory,
      hasFCMToken: diagnostic.hasFCMToken
    });
    
    return c.json({ 
      success: true, 
      diagnostic 
    });
    
  } catch (error) {
    console.error("❌ [DIAGNOSTIC] Erreur:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

export default app;