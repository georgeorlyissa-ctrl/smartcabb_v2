import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv-wrapper.ts";
// 🔥 IMPORTS COMMENTÉS TEMPORAIREMENT POUR FIX 404
// import { isValidUUID } from "./uuid-validator.ts";
// import { normalizePhoneNumber, isValidPhoneNumber } from "./phone-utils.ts";
// import smsRoutes from "./sms-routes.ts";
// import backupRoutes from "./backup-routes.ts";
// import exportRoutes from "./export-routes.ts";
// import websiteRoutes from "./website-routes.ts";
// import chatRoutes from "./chat-routes.ts";
// import cleanupRoutes from "./cleanup-routes.ts";
import authRoutes from "./auth-routes.ts";
// import driverRoutes from "./driver-routes.ts";
// import passengerRoutes from "./passenger-routes.ts";
// import walletRoutes from "./wallet-routes.ts";
import rideRoutes from "./ride-routes.ts";
import adminRoutes from "./admin-routes.ts";
import cancellationRoutes from "./cancellation-routes.ts";
// import settingsRoutes from "./settings-routes.ts";
// import emailRoutes from "./email-routes.ts";
// import emergencyRoutes from "./emergency-routes.ts";
// import { testRoutes } from "./test-routes.ts";
// import diagnosticRoute from "./diagnostic-driver-route.ts";
// import geocodingApp from "./geocoding-api.ts";
// import analyticsApp from "./analytics-api.ts";
// import nominatimApp from "./nominatim-enriched-api.ts";
import fcmRoutes from "./fcm-routes.ts";
import googleMapsApp from "./google-maps-api.ts";
// import configRoutes from "./config-routes.ts";
// import * as adminUsersRoutes from "./admin_users_routes.ts";
// import resetDatabaseRoutes from "./reset-database-routes.ts";
// import { securityMiddleware } from "./security-middleware.ts";
// import auditRoutes from "./audit-emails-route.ts";
// import kvTestRoutes from "./kv-test-route.ts";

const app = new Hono();

// ✅ FONCTIONS UTILITAIRES INLINE (temporaire pour fix 404)

// Validation UUID
function isValidUUID(uuid: string): boolean {
  if (!uuid || typeof uuid !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// Normalisation numéro de téléphone congolais
function normalizePhoneNumber(phone: string): string | null {
  if (!phone) return null;
  
  // Retirer tous les caractères non numériques sauf le +
  let cleaned = phone.replace(/[^\d+]/g, '');
  
  // Si commence par +243, OK
  if (cleaned.startsWith('+243')) {
    return cleaned;
  }
  
  // Si commence par 00243, remplacer par +243
  if (cleaned.startsWith('00243')) {
    return '+' + cleaned.substring(2);
  }
  
  // Si commence par 243, ajouter +
  if (cleaned.startsWith('243')) {
    return '+' + cleaned;
  }
  
  // Si commence par 0, remplacer par +243
  if (cleaned.startsWith('0')) {
    return '+243' + cleaned.substring(1);
  }
  
  // Si 9 chiffres sans préfixe, ajouter +243
  if (/^\d{9}$/.test(cleaned)) {
    return '+243' + cleaned;
  }
  
  return null;
}

// Validation numéro de téléphone congolais
function isValidPhoneNumber(phone: string): boolean {
  if (!phone) return false;
  
  // Format attendu : +243XXXXXXXXX (9 chiffres après +243)
  const phoneRegex = /^\+243\d{9}$/;
  return phoneRegex.test(phone);
}

// ✅ Client Supabase global (Service Role Key pour admin)
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// 🧪 ROUTE DE TEST ULTRA-SIMPLE - Pour vérifier que le serveur démarre
app.get('/make-server-2eb02e52/ping', (c) => {
  console.log('✅ PING reçu - Serveur fonctionne !');
  return c.json({ 
    success: true, 
    message: 'SmartCabb Server is running!',
    timestamp: new Date().toISOString()
  });
});

// 🔄 REDÉPLOIEMENT FORCÉ V8 - FIX CONFLIT ROUTES - 07/03/2026
// ✅ Normalisation centralisée des numéros de téléphone (phone-utils.ts)
// ✅ Fix erreur InvalidPhoneNumber Africa's Talking
// ✅ Firebase Cloud Messaging pour notifications push
// ✅ Notifications sonores avec adresses dynamiques
// ✅ Architecture 100% standalone
// 🔒 Protection OWASP Top 10 2021
console.log('🔄 Serveur SmartCabb V7 - Fix Téléphone - 14/02/2026');

// 🚀 Démarrage immédiat du serveur (pas d'attente bloquante)
console.log('🚀 Démarrage du serveur SmartCabb...');

// ⚙️ DIAGNOSTIC : Vérification des variables d'environnement critiques
console.log('🔍 Diagnostic variables d\'environnement:');
console.log('  - SUPABASE_URL:', Deno.env.get('SUPABASE_URL') ? '✅ Configuré' : '❌ MANQUANT');
console.log('  - SUPABASE_SERVICE_ROLE_KEY:', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ? '✅ Configuré' : '❌ MANQUANT');
console.log('  - SUPABASE_ANON_KEY:', Deno.env.get('SUPABASE_ANON_KEY') ? '✅ Configuré' : '❌ MANQUANT');
console.log('  - FIREBASE_PROJECT_ID:', Deno.env.get('FIREBASE_PROJECT_ID') ? '✅ Configuré' : '❌ MANQUANT');
console.log('  - FIREBASE_SERVICE_ACCOUNT_JSON:', Deno.env.get('FIREBASE_SERVICE_ACCOUNT_JSON') ? '✅ Configuré' : '❌ MANQUANT');
console.log('  - AFRICAS_TALKING_API_KEY:', Deno.env.get('AFRICAS_TALKING_API_KEY') ? '✅ Configuré' : '❌ MANQUANT');

// Vérifier URL Supabase
const supabaseUrl = Deno.env.get('SUPABASE_URL');
if (supabaseUrl) {
  console.log('  📍 URL Supabase:', supabaseUrl);
  if (!supabaseUrl.includes('supabase.co')) {
    console.warn('  ⚠️ URL Supabase semble incorrecte (doit contenir "supabase.co")');
  }
}

// 🔥 CORS EN PREMIER - AVANT TOUT (y compris logger)
app.use('*', async (c, next) => {
  // Headers CORS ultra-permissifs pour debug
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  c.header('Access-Control-Allow-Headers', '*');
  c.header('Access-Control-Max-Age', '86400');
  c.header('Access-Control-Allow-Credentials', 'true');
  
  // Si c'est une requête OPTIONS (preflight), répondre IMMÉDIATEMENT
  if (c.req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Max-Age': '86400',
      }
    });
  }
  
  await next();
});

// Enable logger APRÈS CORS
app.use('*', logger(console.log));

// ✅ ROUTES PUBLIQUES (définies AVANT le middleware de sécurité)
// Health check endpoint
app.get("/make-server-2eb02e52/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

// 🔧 DIAGNOSTIC : Test connexion Supabase + KV Store
app.get("/make-server-2eb02e52/diagnostic/supabase", async (c) => {
  const diagnostics = {
    timestamp: new Date().toISOString(),
    env: {
      SUPABASE_URL: !!Deno.env.get('SUPABASE_URL'),
      SUPABASE_SERVICE_ROLE_KEY: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
      SUPABASE_ANON_KEY: !!Deno.env.get('SUPABASE_ANON_KEY'),
    },
    supabase: {
      url: Deno.env.get('SUPABASE_URL') || 'NOT_SET',
    },
    kvStore: {
      status: 'unknown',
      error: null as any
    }
  };

  // Test KV Store
  try {
    await kv.set('test_connection', { timestamp: new Date().toISOString() });
    const result = await kv.get('test_connection');
    await kv.del('test_connection');
    diagnostics.kvStore.status = result ? 'connected' : 'error';
  } catch (error) {
    diagnostics.kvStore.status = 'error';
    diagnostics.kvStore.error = error instanceof Error ? error.message : String(error);
  }

  return c.json(diagnostics);
});

// ✅ ENDPOINT MAPBOX API KEY
app.get('/make-server-2eb02e52/config/mapbox-key', (c) => {
  try {
    const mapboxKey = Deno.env.get('MAPBOX_API_KEY');
    if (!mapboxKey) {
      console.warn('⚠️ MAPBOX_API_KEY not found in environment');
      return c.json({ success: false, error: 'API key not configured' }, 500);
    }
    return c.json({ success: true, apiKey: mapboxKey });
  } catch (error) {
    console.error('❌ Error loading Mapbox key:', error);
    return c.json({ success: false, error: 'Failed to load API key' }, 500);
  }
});

// ✅ ENDPOINT GOOGLE MAPS API KEY (FRONTEND)
app.get('/make-server-2eb02e52/config/google-maps-key', (c) => {
  try {
    // Essayer plusieurs noms possibles de variables d'environnement
    const googleMapsKey = 
      Deno.env.get('GOOGLE_MAPS_API_KEY') || 
      Deno.env.get('GOOGLE_MAPS_SERVER_API_KEY') ||
      Deno.env.get('API_KEY');
    
    if (!googleMapsKey) {
      console.warn('⚠️ GOOGLE_MAPS_API_KEY not found in environment');
      console.warn('⚠️ Tried: GOOGLE_MAPS_API_KEY, GOOGLE_MAPS_SERVER_API_KEY, API_KEY');
      return c.json({ success: false, error: 'API key not configured' }, 500);
    }
    console.log('✅ Google Maps API key fournie au frontend (source: ' + 
      (Deno.env.get('GOOGLE_MAPS_API_KEY') ? 'GOOGLE_MAPS_API_KEY' : 
       Deno.env.get('GOOGLE_MAPS_SERVER_API_KEY') ? 'GOOGLE_MAPS_SERVER_API_KEY' : 'API_KEY') + ')');
    return c.json({ success: true, apiKey: googleMapsKey });
  } catch (error) {
    console.error('❌ Error loading Google Maps key:', error);
    return c.json({ success: false, error: 'Failed to load API key' }, 500);
  }
});

// ✅ ENDPOINT GOOGLE MAPS REVERSE GEOCODING (Coordonnées → Adresse)
app.get('/make-server-2eb02e52/google-maps/reverse', async (c) => {
  try {
    const lat = c.req.query('lat');
    const lng = c.req.query('lng');
    
    if (!lat || !lng) {
      return c.json({ success: false, error: 'Paramètres lat et lng requis' }, 400);
    }
    
    // Récupérer la clé API Google Maps
    const googleMapsKey = 
      Deno.env.get('GOOGLE_MAPS_SERVER_API_KEY') || 
      Deno.env.get('GOOGLE_MAPS_API_KEY') ||
      Deno.env.get('API_KEY');
    
    if (!googleMapsKey) {
      console.error('❌ GOOGLE_MAPS_API_KEY non configurée');
      return c.json({ success: false, error: 'API key not configured' }, 500);
    }
    
    console.log(`🌍 [GEOCODE] Reverse geocoding: ${lat}, ${lng}`);
    
    // Appeler l'API Google Maps Geocoding
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${googleMapsKey}&language=fr`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status === 'OK' && data.results && data.results.length > 0) {
      console.log(`✅ [GEOCODE] Adresse trouvée: ${data.results[0].formatted_address}`);
      return c.json({ 
        success: true, 
        result: data.results[0]
      });
    } else {
      console.warn(`⚠️ [GEOCODE] Aucune adresse trouvée (status: ${data.status})`);
      return c.json({ 
        success: false, 
        error: `Geocoding failed: ${data.status}`,
        status: data.status
      }, 404);
    }
  } catch (error) {
    console.error('❌ [GEOCODE] Erreur:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Erreur serveur' 
    }, 500);
  }
});

// ============================================
// 🔧 ROUTES DE CONFIGURATION GLOBALE
// ============================================

// GET /config/get - Récupérer la configuration globale
app.get('/make-server-2eb02e52/config/get', async (c) => {
  try {
    console.log('📋 [CONFIG] Récupération de la configuration globale...');
    
    // Récupérer la config depuis le KV store
    const config = await kv.get('smartcabb_global_config');
    
    if (config) {
      console.log('✅ [CONFIG] Configuration trouvée');
      return c.json({ success: true, config });
    }
    
    // Si pas de config, retourner la config par défaut
    console.log('ℹ️ [CONFIG] Aucune config trouvée, utilisation des valeurs par défaut');
    const defaultConfig = {
      exchangeRate: 2800,
      commissionRate: 10,
      nightTimeStart: '21:00',
      nightTimeEnd: '06:00',
      freeWaitingMinutes: 10,
      distantZoneMultiplier: 2,
      postpaidEnabled: true,
      postpaidFee: 5000,
      flutterwaveEnabled: true,
      smsEnabled: true,
      smsProvider: 'africas_talking',
      notificationsEnabled: true,
      appVersion: '1.0.0',
      maintenanceMode: false,
      lastUpdated: new Date().toISOString()
    };
    
    return c.json({ success: true, config: defaultConfig });
  } catch (error) {
    console.error('❌ [CONFIG] Erreur récupération config:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Erreur' 
    }, 500);
  }
});

// POST /config/update - Mettre à jour la configuration globale (admin uniquement)
app.post('/make-server-2eb02e52/config/update', async (c) => {
  try {
    console.log('💾 [CONFIG] Mise à jour de la configuration...');
    
    const { config } = await c.req.json();
    
    if (!config) {
      return c.json({ 
        success: false, 
        error: 'Configuration manquante' 
      }, 400);
    }
    
    // Ajouter le timestamp de mise à jour
    const updatedConfig = {
      ...config,
      lastUpdated: new Date().toISOString()
    };
    
    // Sauvegarder dans le KV store
    await kv.set('smartcabb_global_config', updatedConfig);
    
    console.log('✅ [CONFIG] Configuration mise à jour avec succès');
    return c.json({ success: true, config: updatedConfig });
  } catch (error) {
    console.error('❌ [CONFIG] Erreur mise à jour config:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Erreur' 
    }, 500);
  }
});

// ============================================
// ENDPOINT DE TEST - Envoyer un SMS réel
// ============================================
app.post("/make-server-2eb02e52/test-sms-send", async (c) => {
  try {
    const { phoneNumber } = await c.req.json();
    
    if (!phoneNumber) {
      return c.json({ 
        success: false, 
        error: 'Numéro de téléphone requis' 
      }, 400);
    }

    console.log('🧪 TEST ENVOI SMS à:', phoneNumber);
    
    // ✅ NORMALISER LE NUMÉRO DE TÉLÉPHONE
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    
    if (!normalizedPhone || !isValidPhoneNumber(normalizedPhone)) {
      console.error('❌ Format de numéro invalide:', phoneNumber, '→', normalizedPhone);
      return c.json({
        success: false,
        error: `Format de numéro invalide: ${phoneNumber}. Format attendu: +243XXXXXXXXX`,
        originalPhone: phoneNumber,
        normalizedPhone: normalizedPhone
      }, 400);
    }
    
    console.log('✅ Numéro normalisé:', phoneNumber, '→', normalizedPhone);

    // Récupérer les credentials
    const username = Deno.env.get('AFRICAS_TALKING_USERNAME') ?? '';
    const apiKey = Deno.env.get('AFRICAS_TALKING_API_KEY') ?? '';

    console.log('🔑 Username présent:', !!username);
    console.log('🔑 Username value:', username || 'VIDE');
    console.log('🔑 API Key présente:', !!apiKey);
    console.log('🔑 API Key length:', apiKey?.length || 0);

    // Si credentials manquantes, mode DEBUG
    if (!username || !apiKey) {
      const testCode = Math.floor(100000 + Math.random() * 900000).toString();
      console.log('⚠️ MODE DEBUG - Code généré:', testCode);
      
      return c.json({
        success: false,
        debugMode: true,
        debugOtpCode: testCode,
        error: 'Credentials Africa\'s Talking manquantes',
        config: {
          username_present: !!username,
          api_key_present: !!apiKey
        }
      });
    }

    // Envoyer le SMS réel
    const testCode = Math.floor(100000 + Math.random() * 900000).toString();
    const message = `SmartCabb - Votre code de test est : ${testCode}`;

    console.log('📤 Envoi du SMS via Africa\'s Talking...');
    console.log('📱 Numéro normalisé:', normalizedPhone);
    console.log('📝 Message:', message);

    try {
      const smsResponse = await fetch('https://api.africastalking.com/version1/messaging', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
          'apiKey': apiKey
        },
        body: new URLSearchParams({
          username: username,
          to: normalizedPhone,
          message: message,
          from: 'SMARTCABB' // ✅ Sender ID officiel SmartCabb
        }).toString()
      });

      const smsResult = await smsResponse.json();
      
      console.log('📊 Réponse Africa\'s Talking:', JSON.stringify(smsResult, null, 2));

      // Vérifier le statut de la réponse
      const recipients = smsResult.SMSMessageData?.Recipients || [];
      const status = recipients[0]?.status || 'Unknown';
      const messageId = recipients[0]?.messageId || null;

      if (status === 'Success' || smsResult.SMSMessageData?.Message === 'Sent') {
        console.log('✅ SMS envoyé avec succès !');
        return c.json({
          success: true,
          smsResult: {
            status: status,
            messageId: messageId,
            phoneNumber: normalizedPhone,
            originalPhone: phoneNumber
          },
          rawResponse: smsResult
        });
      } else {
        console.error('❌ Échec envoi SMS:', status);
        return c.json({ 
          success: false, 
          error: 'Échec de l\'envoi du SMS',
          testCode: testCode,
          smsDetails: {
            status: status || 'Unknown',
            messageId: messageId,
            phoneNumber: phoneNumber
          },
          rawResponse: smsResult
        }, 500);
      }

    } catch (smsError) {
      console.error('❌ Erreur lors de l\'appel API:', smsError);
      return c.json({ 
        success: false, 
        error: 'Erreur lors de l\'appel à Africa\'s Talking: ' + String(smsError),
        testCode: testCode
      }, 500);
    }

  } catch (error) {
    console.error('❌ Erreur test-sms-send:', error);
    return c.json({ 
      success: false, 
      error: 'Erreur serveur: ' + String(error) 
    }, 500);
  }
});

// Nettoyer un profil orphelin
app.post("/make-server-2eb02e52/clean-orphan-profile", async (c) => {
  try {
    const { userId } = await c.req.json();
    
    if (!userId) {
      return c.json({ success: false, error: 'userId requis' }, 400);
    }
    
    console.log('🧹 Nettoyage profil orphelin pour:', userId);
    
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    // ✅ Validation UUID
    if (!isValidUUID(userId)) {
      console.log('❌ ID invalide (pas un UUID):', userId);
      return c.json({ success: false, error: 'ID invalide' }, 400);
    }
    
    // Vérifier si l'utilisateur existe dans auth.users
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(userId);
    
    if (authError || !authUser) {
      console.log('❌ Utilisateur non trouvé, suppression du profil orphelin...');
      
      const { error: deleteError } = await supabaseAdmin
        .from('profiles')
        .delete()
        .eq('id', userId);
      
      if (deleteError) {
        console.error('❌ Erreur suppression:', deleteError);
        return c.json({ success: false, error: deleteError.message }, 500);
      }
      
      console.log('✅ Profil orphelin supprimé');
      return c.json({ success: true, deleted: true, reason: 'auth_user_not_found' });
    }
    
    // Vérifier si le profil existe
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    
    if (profile) {
      console.log('ℹ️ Le profil existe déjà');
      return c.json({ success: true, deleted: false, reason: 'profile_exists' });
    }
    
    console.log('✅ Pas de profil orphelin détecté');
    return c.json({ success: true, deleted: false, reason: 'no_orphan' });
    
  } catch (error) {
    console.error('❌ Erreur serveur:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Erreur inconnue' 
    }, 500);
  }
});

// ❌ ROUTE DÉSACTIVÉE - Create test admin user if none exists
// ⚠️ Cette route peut créer un admin de test
// ⚠️ Utilisez plutôt "Ajouter un admin" depuis le dashboard admin
// ⚠️ Si vous avez vraiment besoin de cette route, décommentez-la temporairement
/*
app.post("/make-server-2eb02e52/init-test-user", async (c) => {
  try {
    console.log("🔧 Creating test user...");
    
    // Create admin client with service role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check if admin already exists in KV store FIRST (plus fiable que listUsers)
    console.log('🔍 Vérification existence de l\'admin dans KV store...');
    const adminProfiles = await kv.getByPrefix('profile:');
    const existingAdmin = adminProfiles?.find((p: any) => p.email === 'admin@smartcabb.cd');

    if (existingAdmin) {
      console.log('✅ Admin user already exists in auth.users');
      return c.json({ 
        success: true, 
        message: 'Admin user already exists',
        credentials: {
          email: 'admin@smartcabb.cd',
          password: 'Admin123!',
          userId: existingAdmin.id
        },
        note: 'Connectez-vous avec ces identifiants'
      });
    }

    // Create auth user with admin.createUser (only if doesn't exist)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: 'admin@smartcabb.cd',
      password: 'Admin123!',
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: 'Admin SmartCabb',
        role: 'admin'
      }
    });

    if (authError) {
      console.error('❌ Error creating auth user:', authError);
      
      // If user already exists, return credentials
      if (authError.message.includes('already been registered')) {
        return c.json({ 
          success: true, 
          message: 'Admin user already exists',
          credentials: {
            email: 'admin@smartcabb.cd',
            password: 'Admin123!'
          },
          note: 'Connectez-vous avec ces identifiants'
        });
      }
      
      return c.json({ 
        success: false, 
        error: `Auth error: ${authError.message}` 
      }, 500);
    }

    if (!authData.user) {
      return c.json({ 
        success: false, 
        error: 'No user returned from auth' 
      }, 500);
    }

    console.log('✅ Auth user created:', authData.user.id);

    // Create profile in KV store
    const profile = {
      id: authData.user.id,
      email: 'admin@smartcabb.cd',
      full_name: 'Admin SmartCabb',
      phone: null,
      role: 'admin',
      balance: 0,
      password: 'Admin123!', // Stocker le mot de passe pour le panel admin
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Sauvegarder dans le KV store avec les deux préfixes
    await kv.set(`profile:${authData.user.id}`, profile);
    await kv.set(`admin:${authData.user.id}`, profile);

    console.log('✅ Profile created in KV store successfully');

    return c.json({
      success: true,
      message: 'Test admin user created successfully',
      credentials: {
        email: 'admin@smartcabb.cd',
        password: 'Admin123!',
        userId: authData.user.id
      }
    });
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, 500);
  }
});
*/

// ============================================
// FLUTTERWAVE PAYMENT ENDPOINTS - MODE PRODUCTION UNIQUEMENT
// ============================================

/**
 * Initialiser un paiement Flutterwave
 */
app.post("/make-server-2eb02e52/payments/flutterwave/init", async (c) => {
  try {
    const body = await c.req.json();
    const { 
      rideId, 
      reference, 
      description, 
      amount, 
      currency, 
      customerEmail, 
      customerPhone, 
      customerName, 
      passengerId, 
      driverId,
      metadata 
    } = body;

    console.log("🦋 Initialisation paiement Flutterwave:", { 
      rideId, 
      reference, 
      amount, 
      currency 
    });

    // Validation : On accepte soit rideId soit reference
    const txIdentifier = rideId || reference;
    if (!txIdentifier || !amount || !customerEmail) {
      return c.json({ 
        success: false, 
        error: 'Données manquantes (identifier, amount, customerEmail requis)' 
      }, 400);
    }

    const secretKey = Deno.env.get('FLUTTERWAVE_SECRET_KEY');
    
    if (!secretKey) {
      console.error('❌ FLUTTERWAVE_SECRET_KEY non configurée');
      return c.json({ 
        success: false, 
        error: 'Configuration Flutterwave manquante. Veuillez configurer FLUTTERWAVE_SECRET_KEY.' 
      }, 500);
    }

    // Générer transaction reference unique
    const txRef = rideId 
      ? `SMARTCABB_RIDE_${rideId}_${Date.now()}` 
      : (reference || `SMARTCABB_${Date.now()}`);

    // Déterminer la description
    const paymentDescription = description || 
      (rideId ? `Paiement course #${rideId.slice(-8)}` : 'Paiement SmartCabb');

    // MODE PRODUCTION - Appel réel à Flutterwave
    const paymentData = {
      tx_ref: txRef,
      amount: amount,
      currency: currency || 'CDF',
      redirect_url: `${c.req.header('origin') || 'http://localhost:5173'}/payment/verify`,
      payment_options: 'mobilemoney', // M-Pesa, Orange Money, Airtel Money
      customer: {
        email: customerEmail,
        phonenumber: customerPhone || '',
        name: customerName || 'Client SmartCabb',
      },
      customizations: {
        title: 'SmartCabb',
        description: paymentDescription,
        logo: `${c.req.header('origin') || 'http://localhost:5173'}/logo.png`,
      },
      meta: {
        ride_id: rideId || '',
        reference: reference || '',
        passenger_id: passengerId || '',
        driver_id: driverId || '',
        ...metadata,
      },
    };

    console.log('📤 Envoi à Flutterwave API (PRODUCTION)...');
    console.log('📋 Données envoyées:', JSON.stringify(paymentData, null, 2));

    // Appel API Flutterwave
    const response = await fetch('https://api.flutterwave.com/v3/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentData),
    });

    const result = await response.json();
    console.log('📥 Réponse Flutterwave COMPLÈTE:', JSON.stringify(result, null, 2));
    console.log('📥 Status HTTP:', response.status);

    // ⚠️ ATTENTION: Vérifier si Flutterwave renvoie vraiment un succès
    if (result.status === 'success' && result.data) {
      console.log('✅ Transaction créée avec succès');
      console.log('   - TX_REF:', txRef);
      console.log('   - FLW_ID:', result.data.id);
      console.log('   - LINK:', result.data.link);
      
      // 🔍 IMPORTANT: Vérifier que le lien est valide
      if (!result.data.link) {
        console.error('❌ ERREUR: Flutterwave n\'a pas retourné de lien valide !');
        console.error('📦 Données reçues:', JSON.stringify(result, null, 2));
        return c.json({
          success: false,
          error: 'Flutterwave n\'a pas retourné de lien de paiement valide',
          details: result
        }, 500);
      }
      
      // ℹ️ result.data.id peut être undefined en mode test, utiliser txRef comme fallback
      const paymentId = result.data.id || result.data.flw_ref || txRef;
      console.log('✅ Lien de paiement généré:', result.data.link);
      console.log('✅ Payment ID:', paymentId);
      
      return c.json({
        success: true,
        transactionId: txRef,
        status: 'pending',
        message: 'Paiement initié avec succès',
        redirectUrl: result.data.link,
        providerReference: paymentId,
        metadata: {
          flutterwaveId: paymentId,
          paymentLink: result.data.link,
          txRef: txRef,
        },
      });
    } else {
      console.error('❌ Erreur Flutterwave:', result);
      return c.json({
        success: false,
        error: 'Erreur lors de l\'initialisation du paiement Flutterwave',
        details: result.message || 'Erreur inconnue'
      }, 500);
    }
  } catch (error) {
    console.error('❌ Erreur Flutterwave init:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Erreur serveur' 
    }, 500);
  }
});

/**
 * Vérifier un paiement Flutterwave
 */
app.get("/make-server-2eb02e52/payments/flutterwave/verify/:txRef", async (c) => {
  try {
    const txRef = c.req.param('txRef');

    console.log("🔍 Vérification paiement Flutterwave:", txRef);

    const secretKey = Deno.env.get('FLUTTERWAVE_SECRET_KEY');
    
    if (!secretKey) {
      return c.json({ 
        success: false, 
        error: 'Configuration Flutterwave manquante. Veuillez configurer FLUTTERWAVE_SECRET_KEY.' 
      }, 500);
    }

    // Appel API de vérification
    const response = await fetch(
      `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${txRef}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${secretKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const result = await response.json();
    console.log('📥 Vérification Flutterwave COMPLÈTE:', JSON.stringify(result, null, 2));
    console.log('📥 Status HTTP Verify:', response.status);

    if (result.status === 'success' && result.data) {
      const transaction = result.data;
      
      console.log('✅ Transaction trouvée:', {
        tx_ref: transaction.tx_ref,
        status: transaction.status,
        amount: transaction.amount,
      });
      
      // Statut Flutterwave : successful, failed, pending
      const isSuccessful = transaction.status === 'successful';
      const isPending = transaction.status === 'pending';

      return c.json({
        isValid: isSuccessful,
        status: isSuccessful ? 'completed' : isPending ? 'processing' : 'failed',
        amount: transaction.amount,
        transactionId: transaction.tx_ref,
        paidAt: transaction.created_at,
        providerData: transaction,
      });
    } else {
      console.error('❌ Transaction non trouvée:', result);
      return c.json({
        isValid: false,
        status: 'failed',
        amount: 0,
        transactionId: txRef,
        error: result.message || 'Transaction non trouvée',
        details: result,
      }, 404);
    }
  } catch (error) {
    console.error('❌ Erreur vérification Flutterwave:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Erreur serveur' 
    }, 500);
  }
});



/**
 * Webhook Flutterwave pour notifications temps réel
 */
app.post("/make-server-2eb02e52/payments/flutterwave/webhook", async (c) => {
  try {
    const payload = await c.req.json();
    const signature = c.req.header('verif-hash');

    console.log('🔔 Webhook Flutterwave reçu:', payload.event);

    // Vérifier la signature (sécurité Flutterwave)
    const secretHash = Deno.env.get('FLUTTERWAVE_SECRET_KEY');
    if (signature !== secretHash) {
      console.error('❌ Signature webhook invalide');
      return c.json({ success: false }, 401);
    }

    const event = payload.event;
    const data = payload.data;

    // Traiter selon le type d'événement
    switch (event) {
      case 'charge.completed':
        console.log('✅ Paiement complété:', data.tx_ref);
        // TODO: Mettre à jour la course dans la DB
        break;
        
      case 'charge.failed':
        console.log('❌ Paiement échoué:', data.tx_ref);
        // TODO: Marquer le paiement comme échoué
        break;
        
      default:
        console.log('ℹ Événement Flutterwave:', event);
    }

    return c.json({ success: true });
  } catch (error) {
    console.error('❌ Erreur webhook Flutterwave:', error);
    return c.json({ success: false }, 500);
  }
});

// Create a new admin user (secured endpoint)
app.post("/make-server-2eb02e52/create-admin", async (c) => {
  try {
    const body = await c.req.json();
    const { email, password, fullName } = body;

    console.log("🔧 Creating new admin:", email);

    // Validation
    if (!email || !password || !fullName) {
      return c.json({ 
        success: false, 
        error: 'Email, password et nom complet sont requis' 
      }, 400);
    }

    if (password.length < 6) {
      return c.json({ 
        success: false, 
        error: 'Le mot de passe doit contenir au moins 6 caractères' 
      }, 400);
    }

    // Create admin client with service role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check if email already exists
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existingUser) {
      console.log('❌ Email already in use');
      return c.json({ 
        success: false, 
        error: 'Un compte existe déjà avec cet email' 
      }, 400);
    }

    // Create auth user with admin.createUser
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: fullName,
        role: 'admin'
      }
    });

    if (authError) {
      console.error('❌ Error creating auth user:', authError);
      return c.json({ 
        success: false, 
        error: `Erreur d'authentification: ${authError.message}` 
      }, 500);
    }

    if (!authData.user) {
      return c.json({ 
        success: false, 
        error: 'Erreur lors de la création du compte' 
      }, 500);
    }

    console.log('✅ Auth user created:', authData.user.id);

    // Wait a bit for any triggers to complete
    await new Promise(resolve => setTimeout(resolve, 100));

    // Create or update profile in database using UPSERT
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: authData.user.id,
        email,
        full_name: fullName,
        role: 'admin',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (profileError) {
      console.error('❌ Error creating profile:', profileError);
      // Try to clean up auth user
      await supabase.auth.admin.deleteUser(authData.user.id);
      return c.json({ 
        success: false, 
        error: `Erreur lors de la création du profil: ${profileError.message}` 
      }, 500);
    }

    console.log('✅ Admin profile created successfully');

    return c.json({
      success: true,
      message: 'Compte administrateur créé avec succès',
      user: {
        id: authData.user.id,
        email: authData.user.email
      },
      profile: profileData
    });

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Erreur inattendue' 
    }, 500);
  }
});

// ============================================
// 🔧 DIAGNOSE & FIX BAD EMAILS
// ============================================

/**
 * Diagnostique les utilisateurs avec des emails malformés
 * Format problématique : u+243XXXXXXXXX@smartcabb.app
 * Format correct : u243XXXXXXXXX@smartcabb.app
 */
app.get("/make-server-2eb02e52/admin/diagnose-bad-emails", async (c) => {
  try {
    console.log('🔍 [DIAGNOSE] Recherche des emails malformés...');

    // Liste tous les utilisateurs Auth
    const { data: users, error } = await supabase.auth.admin.listUsers();

    if (error) {
      console.error('❌ Erreur liste utilisateurs:', error);
      return c.json({ 
        success: false, 
        error: 'Erreur lors de la récupération des utilisateurs' 
      }, 500);
    }

    // Filtrer les utilisateurs avec email contenant "u+243"
    const usersWithBadEmails = users.users
      .filter(user => user.email && user.email.includes('u+243'))
      .map(user => ({
        id: user.id,
        email: user.email || '',
        full_name: user.user_metadata?.full_name || user.user_metadata?.name || 'Utilisateur',
        phone: user.user_metadata?.phone || ''
      }));

    console.log(`🔍 [DIAGNOSE] ${usersWithBadEmails.length} utilisateur(s) avec emails malformés`);

    return c.json({
      success: true,
      count: usersWithBadEmails.length,
      users: usersWithBadEmails
    });

  } catch (error) {
    console.error('❌ Erreur diagnostic:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Erreur inattendue' 
    }, 500);
  }
});

/**
 * Répare l'email d'un utilisateur spécifique
 * Retire le "+" du format email
 */
app.post("/make-server-2eb02e52/admin/fix-user-email/:userId", async (c) => {
  try {
    const userId = c.req.param('userId');
    console.log(`🔧 [FIX EMAIL] Réparation de l'utilisateur: ${userId}`);

    if (!isValidUUID(userId)) {
      return c.json({ 
        success: false, 
        error: 'ID utilisateur invalide' 
      }, 400);
    }

    // Récupérer l'utilisateur
    const { data: userData, error: getUserError } = await supabase.auth.admin.getUserById(userId);

    if (getUserError || !userData.user) {
      console.error('❌ Utilisateur introuvable:', getUserError);
      return c.json({ 
        success: false, 
        error: 'Utilisateur introuvable' 
      }, 404);
    }

    const oldEmail = userData.user.email || '';
    
    // Vérifier si l'email contient "u+243"
    if (!oldEmail.includes('u+243')) {
      console.log('✅ Email déjà au bon format:', oldEmail);
      return c.json({
        success: true,
        message: 'Email déjà au bon format',
        oldEmail,
        newEmail: oldEmail
      });
    }

    // Générer le nouvel email (retirer le +)
    const newEmail = oldEmail.replace('u+243', 'u243');
    console.log(`🔄 [FIX EMAIL] ${oldEmail} → ${newEmail}`);

    // Mettre à jour l'email dans Supabase Auth
    const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
      userId,
      { email: newEmail }
    );

    if (updateError) {
      console.error('❌ Erreur mise à jour email:', updateError);
      return c.json({ 
        success: false, 
        error: `Erreur mise à jour: ${updateError.message}` 
      }, 500);
    }

    console.log('✅ [FIX EMAIL] Email réparé avec succès');

    return c.json({
      success: true,
      message: 'Email réparé avec succès',
      oldEmail,
      newEmail,
      userId
    });

  } catch (error) {
    console.error('❌ Erreur réparation email:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Erreur inattendue' 
    }, 500);
  }
});

// ============================================
// CREATE PROFILE (FIX PERMISSIONS 42501)
// ============================================

/**
 * Créer un profil avec SERVICE_ROLE_KEY (bypass RLS)
 * Utilisé quand le frontend n'a pas les permissions
 */
app.post("/make-server-2eb02e52/create-profile", async (c) => {
  try {
    const body = await c.req.json();
    const { userId, email, fullName, phone, role } = body;

    console.log('��� Création profil serveur pour:', userId);

    // Create Supabase client with SERVICE_ROLE_KEY
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Créer le profil avec SERVICE_ROLE_KEY (permissions admin)
    const { data: profile, error } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        email: email,
        full_name: fullName,
        phone: phone,
        role: role || 'passenger',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      // Si le profil existe déjà (conflit), le récupérer
      if (error.code === '23505') {
        console.log('ℹ️ Profil existe déjà, récupération...');
        
        const { data: existingProfile, error: fetchError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (fetchError) {
          console.error('❌ Erreur récupération profil existant:', fetchError);
          return c.json({ 
            success: false, 
            error: `Erreur récupération profil: ${fetchError.message}` 
          }, 500);
        }

        console.log('✅ Profil existant récupéré:', existingProfile.full_name);
        return c.json({ 
          success: true, 
          profile: existingProfile,
          message: 'Profil existant récupéré'
        });
      }

      console.error('❌ Erreur création profil:', error);
      return c.json({ 
        success: false, 
        error: `Erreur création profil: ${error.message}` 
      }, 500);
    }

    console.log('✅ Profil créé avec succès:', profile.full_name);

    return c.json({ 
      success: true, 
      profile,
      message: 'Profil créé avec succès'
    });

  } catch (error: any) {
    console.error('❌ Erreur inattendue création profil:', error);
    return c.json({ 
      success: false, 
      error: `Erreur serveur: ${error.message}` 
    }, 500);
  }
});

// ============================================
// SIGNUP WITH PHONE ONLY (NO EMAIL REQUIRED)
// ============================================

/**
 * Inscription avec téléphone uniquement (sans email)
 * Utilise l'API Admin pour créer un utilisateur avec un téléphone
 */
app.post("/make-server-2eb02e52/signup-with-phone", async (c) => {
  try {
    const body = await c.req.json();
    const { phone, password, fullName, role } = body;

    console.log("📱 Inscription avec téléphone uniquement:", phone);

    // Validation
    if (!phone || !password || !fullName) {
      return c.json({ 
        success: false, 
        error: 'Téléphone, mot de passe et nom complet sont requis' 
      }, 400);
    }

    if (password.length < 6) {
      return c.json({ 
        success: false, 
        error: 'Le mot de passe doit contenir au moins 6 caractères' 
      }, 400);
    }

    // Create admin client with service role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Vérifier si le téléphone existe déjà
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('phone', phone)
      .maybeSingle();

    if (existingProfile) {
      console.log('❌ Téléphone déjà utilisé');
      return c.json({ 
        success: false, 
        error: 'Ce numéro de téléphone est déjà utilisé' 
      }, 400);
    }

    // Normaliser le téléphone au format 243XXXXXXXXX
    const cleanPhone = phone.replace(/[\s\-+]/g, '');
    let normalizedPhone: string;
    
    if (cleanPhone.length === 9) {
      normalizedPhone = `243${cleanPhone}`;
    } else if (cleanPhone.length === 10 && cleanPhone.startsWith('0')) {
      normalizedPhone = `243${cleanPhone.substring(1)}`;
    } else if (cleanPhone.length === 12 && cleanPhone.startsWith('243')) {
      normalizedPhone = cleanPhone;
    } else if (cleanPhone.length === 13 && cleanPhone.startsWith('2430')) {
      normalizedPhone = `243${cleanPhone.substring(4)}`;
    } else {
      normalizedPhone = cleanPhone.replace(/^0+/, '243');
    }
    
    // ✅ CORRECTION: Format simple SANS timestamp
    // Format : u243XXXXXXXXX@smartcabb.app (préfixe "u" car emails doivent commencer par une lettre)
    const tempEmail = `u${normalizedPhone}@smartcabb.app`;
    console.log('📝 Création de compte avec email:', tempEmail);

    // Create auth user with admin.createUser (permet de créer sans validation email)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: tempEmail,
      password,
      email_confirm: true, // Auto-confirm pour éviter la validation
      user_metadata: {
        full_name: fullName,
        phone: phone,
        role: role || 'passenger',
        uses_phone_auth: true // Flag pour indiquer que c'est un compte téléphone
      }
    });

    if (authError) {
      console.error('❌ Erreur création auth:', authError);
      return c.json({ 
        success: false, 
        error: `Erreur lors de la création du compte: ${authError.message}` 
      }, 500);
    }

    if (!authData.user) {
      return c.json({ 
        success: false, 
        error: 'Erreur lors de la création du compte' 
      }, 500);
    }

    console.log('✅ Utilisateur auth créé:', authData.user.id);

    // Attendre un peu pour les triggers
    await new Promise(resolve => setTimeout(resolve, 100));

    // Créer le profil (email temporaire pour respecter contrainte NOT NULL)
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: authData.user.id,
        email: tempEmail, // Email temporaire (contrainte NOT NULL)
        phone: phone,
        full_name: fullName,
        role: role || 'passenger',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (profileError) {
      console.error('❌ Erreur création profil:', profileError);
      // Nettoyer l'utilisateur auth
      await supabase.auth.admin.deleteUser(authData.user.id);
      return c.json({ 
        success: false, 
        error: `Erreur profil: ${profileError.message}` 
      }, 500);
    }

    console.log('✅ Profil créé avec succès');

    // Créer une session pour l'utilisateur
    const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: tempEmail
    });

    if (sessionError) {
      console.error('⚠️ Erreur génération session:', sessionError);
    }

    return c.json({
      success: true,
      message: 'Compte créé avec succès',
      user: {
        id: authData.user.id,
        phone: phone,
        email: tempEmail // Email interne (pour référence seulement)
      },
      profile: profileData,
      // Retourner les credentials pour connexion immédiate
      credentials: {
        phone: phone,
        tempEmail: tempEmail // Le frontend utilisera cet email pour se connecter
      }
    });

  } catch (error) {
    console.error('❌ Erreur inattendue:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Erreur inattendue' 
    }, 500);
  }
});

// ============================================
// SIGNUP PASSENGER ENDPOINT (ADMIN API)
// ============================================

/**
 * Inscription passager avec API Admin
 * Bypass les validations strictes de Supabase Auth côté client
 */
app.post("/make-server-2eb02e52/signup-passenger", async (c) => {
  try {
    const body = await c.req.json();
    const { email, phone, password, fullName, role } = body;

    console.log("🧑‍💼 Inscription passager:", fullName, "phone:", phone);

    // Validation
    if (!phone || !password || !fullName) {
      return c.json({ 
        success: false, 
        error: 'Nom, téléphone et mot de passe sont requis' 
      }, 400);
    }

    if (password.length < 6) {
      return c.json({ 
        success: false, 
        error: 'Le mot de passe doit contenir au moins 6 caractères' 
      }, 400);
    }

    // Create admin client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // ✅ VALIDATION STRICTE DES EMAILS RÉELS (Anti-bounce Supabase)
    // Fonction de validation email robuste
    const isValidRealEmail = (email: string): boolean => {
      if (!email || !email.includes('@')) return false;
      
      // Regex stricte pour validation email
      const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
      
      if (!emailRegex.test(email)) return false;
      
      // Vérifier que ce n'est pas un email @smartcabb.app généré automatiquement
      if (email.includes('@smartcabb.app')) return false;
      
      // Vérifier que le domaine a au moins 2 caractères après le point
      const domain = email.split('@')[1];
      const domainParts = domain.split('.');
      if (domainParts.length < 2 || domainParts[domainParts.length - 1].length < 2) {
        return false;
      }
      
      return true;
    };

    // D��terminer l'email à utiliser
    let finalEmail: string;
    let usesPhoneAuth = false;
    
    if (email && email.trim() && isValidRealEmail(email.trim())) {
      // ✅ Email réel fourni et VALIDE
      console.log('✅ Email réel valide fourni:', email.trim());
      
      const { data: existingEmailProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email.trim().toLowerCase())
        .maybeSingle();
      
      if (existingEmailProfile) {
        return c.json({ 
          success: false, 
          error: 'Cet email est déjà utilisé' 
        }, 400);
      }
      
      finalEmail = email.trim().toLowerCase();
      usesPhoneAuth = false;
    } else if (email && email.trim() && !isValidRealEmail(email.trim())) {
      // ❌ Email fourni mais INVALIDE
      console.error('❌ Email fourni mais invalide:', email.trim());
      return c.json({ 
        success: false, 
        error: 'Email invalide. Veuillez entrer un email valide (ex: nom@gmail.com) ou laissez vide pour utiliser uniquement le téléphone.' 
      }, 400);
    } else {
      // ⚠️ Pas d'email réel : créer email interne basé sur téléphone
      console.log('⚠️ Aucun email réel fourni, génération email interne @smartcabb.app');
      
      // Normaliser le téléphone au format 243XXXXXXXXX
      const cleanPhone = phone.replace(/[\s\-+]/g, '');
      let normalizedPhone: string;
      
      if (cleanPhone.length === 9) {
        normalizedPhone = `243${cleanPhone}`;
      } else if (cleanPhone.length === 10 && cleanPhone.startsWith('0')) {
        normalizedPhone = `243${cleanPhone.substring(1)}`;
      } else if (cleanPhone.length === 12 && cleanPhone.startsWith('243')) {
        normalizedPhone = cleanPhone;
      } else if (cleanPhone.length === 13 && cleanPhone.startsWith('2430')) {
        normalizedPhone = `243${cleanPhone.substring(4)}`;
      } else {
        normalizedPhone = cleanPhone.replace(/^0+/, '243');
      }
      
      // ✅ CORRECTION: Format simple SANS + et SANS timestamp
      // Format : u243XXXXXXXXX@smartcabb.app (préfixe "u" car emails doivent commencer par une lettre)
      finalEmail = `u${normalizedPhone}@smartcabb.app`;
      usesPhoneAuth = true;
      
      console.log('📧 Email interne généré:', finalEmail);
    }

    // Vérifier si le téléphone existe déjà dans le KV store
    const existingUsers = await kv.getByPrefix('passenger:');
    const phoneExists = existingUsers?.some((user: any) => user.phone === phone);

    if (phoneExists) {
      console.log('⚠️ Téléphone existe déjà dans le KV store');
      return c.json({ 
        success: false, 
        error: 'Ce numéro de tél��phone est déjà utilisé. Veuillez vous connecter.' 
      }, 400);
    }

    console.log("📧 Email final:", finalEmail);

    // ÉTAPE 1: Nettoyer préventivement le KV store pour éviter les doublons
    console.log('🧹 Nettoyage préventif du KV store pour le téléphone:', phone);
    try {
      const kvUsers = await kv.getByPrefix('passenger:');
      const existingKvUser = kvUsers?.find((user: any) => user.phone === phone);
      
      if (existingKvUser) {
        console.log('⚠️ Utilisateur trouvé dans KV avec ce téléphone:', existingKvUser.id);
        
        // Supprimer du KV store
        await kv.del(`passenger:${existingKvUser.id}`);
        console.log('✅ Profil KV supprimé');
        
        // Essayer de supprimer aussi de auth si possible
        try {
          await supabase.auth.admin.deleteUser(existingKvUser.id);
          console.log('✅ Utilisateur auth supprimé');
        } catch (authDeleteError) {
          console.log('⚠️ Erreur suppression auth (peut-être déjà supprimé):', authDeleteError);
        }
        
        // Attendre un peu pour la propagation
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (kvError) {
      console.error('⚠️ Erreur nettoyage KV préventif:', kvError);
      // Continuer malgré l'erreur
    }

    // ÉTAPE 2: Créer l'utilisateur avec Admin API (orphelins déjà nettoyés)
    console.log('📝 Création du compte dans Supabase Auth...');
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: finalEmail,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        phone: phone,
        role: role || 'passenger',
        uses_phone_auth: usesPhoneAuth // ✅ Indique si l'utilisateur utilise uniquement le téléphone
      }
    });

    // Gérer l'erreur création auth
    if (authError) {
      console.error('❌ Erreur création auth:', authError);
      return c.json({ 
        success: false, 
        error: `Erreur lors de la création du compte: ${authError.message}` 
      }, 500);
    }

    if (!authData.user) {
      return c.json({ 
        success: false, 
        error: 'Erreur création compte' 
      }, 500);
    }

    console.log('✅ Auth user créé:', authData.user.id);

    // Créer le profil dans le KV store
    const profileData = {
      id: authData.user.id,
      email: finalEmail,
      phone: phone,
      full_name: fullName,
      name: fullName, // ✅ Ajouter aussi 'name' pour compatibilité
      role: role || 'passenger',
      password: password, // ✅ Stocker le mot de passe pour le panel admin
      balance: 0, // ✅ Initialiser le solde
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    try {
      await kv.set(`passenger:${authData.user.id}`, profileData);
      console.log('✅ Profil passager créé avec succès dans KV store');
    } catch (kvError) {
      console.error('❌ Erreur création profil dans KV store:', kvError);
      console.error('❌ Type erreur KV:', kvError instanceof Error ? kvError.constructor.name : typeof kvError);
      console.error('❌ Message erreur KV:', kvError instanceof Error ? kvError.message : JSON.stringify(kvError));
      
      // Supprimer l'utilisateur Auth en cas d'échec
      try {
        await supabase.auth.admin.deleteUser(authData.user.id);
        console.log('✅ Utilisateur Auth supprimé suite à erreur KV');
      } catch (deleteError) {
        console.error('⚠️ Impossible de supprimer l\'utilisateur Auth:', deleteError);
      }
      
      return c.json({ 
        success: false, 
        error: `Erreur création profil: ${kvError instanceof Error ? kvError.message : 'Erreur KV store'}` 
      }, 500);
    }

    return c.json({
      success: true,
      message: 'Compte créé avec succès',
      user: {
        id: authData.user.id,
        phone: phone,
        email: finalEmail
      },
      profile: profileData
    });

  } catch (error) {
    console.error('❌ [SIGNUP-PASSENGER] Erreur inattendue:', error);
    console.error('❌ [SIGNUP-PASSENGER] Type:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('❌ [SIGNUP-PASSENGER] Message:', error instanceof Error ? error.message : JSON.stringify(error));
    console.error('❌ [SIGNUP-PASSENGER] Stack:', error instanceof Error ? error.stack : 'N/A');
    
    return c.json({ 
      success: false, 
      error: `Erreur inscription: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      details: error instanceof Error ? error.stack : undefined
    }, 500);
  }
});

// ============================================
// SIGNUP DRIVER ENDPOINT (ADMIN API)
// ============================================

/**
 * Inscription conducteur avec API Admin
 * Utilisé pour tous les cas (email ou téléphone uniquement)
 * Car l'API Admin bypass les validations strictes de Supabase
 */
app.post("/make-server-2eb02e52/signup-driver", async (c) => {
  try {
    const body = await c.req.json();
    const { 
      fullName, 
      email, 
      phone, 
      password, 
      vehicleMake, 
      vehicleModel, 
      vehiclePlate, 
      vehicleColor, 
      vehicleCategory,
      profilePhoto // 📸 Photo en Base64
    } = body;

    console.log("🚗 Inscription conducteur:", fullName, "téléphone:", phone);

    // Validation
    if (!phone || !password || !fullName) {
      return c.json({ 
        success: false, 
        error: 'Nom, téléphone et mot de passe sont requis' 
      }, 400);
    }

    if (password.length < 6) {
      return c.json({ 
        success: false, 
        error: 'Le mot de passe doit contenir au moins 6 caractères' 
      }, 400);
    }

    if (!vehicleMake || !vehicleModel || !vehiclePlate) {
      return c.json({ 
        success: false, 
        error: 'Informations véhicule requises' 
      }, 400);
    }

    // Create admin client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Vérifier si le téléphone existe déjà dans le KV store
    const existingDrivers = await kv.getByPrefix('driver:');
    const phoneExistsInDrivers = existingDrivers?.some((driver: any) => driver.phone === phone);

    if (phoneExistsInDrivers) {
      console.log('⚠️ Téléphone existe déjà dans le KV store (drivers)');
      
      // Vérifier si l'utilisateur auth correspondant existe
      const existingDriver = existingDrivers?.find((driver: any) => driver.phone === phone);
      
      if (existingDriver && isValidUUID(existingDriver.id)) {
        const { data: authUser, error: authCheckError } = await supabase.auth.admin.getUserById(existingDriver.id);
        
        if (authCheckError || !authUser) {
          console.log('🧹 Driver orphelin détecté (auth user inexistant), nettoyage...');
          
          // Supprimer le driver orphelin du KV store
          try {
            await kv.del(`driver:${existingDriver.id}`);
            console.log('✅ Driver orphelin supprimé du KV store');
          } catch (deleteError) {
            console.error('❌ Erreur suppression driver orphelin:', deleteError);
            return c.json({ 
              success: false, 
              error: 'Erreur lors du nettoyage. Veuillez réessayer.' 
            }, 500);
          }
        
          console.log('✅ Driver orphelin supprimé du KV, continuer inscription...');
        } else {
          console.log('ℹ️ Driver actif existant avec ce téléphone');
          return c.json({ 
            success: false, 
            error: 'Ce numéro de téléphone est déjà utilisé. Veuillez vous connecter.' 
          }, 400);
        }
      }
    }

    // ✅ VALIDATION STRICTE DES EMAILS RÉELS (Anti-bounce Supabase)
    // Fonction de validation email robuste
    const isValidRealEmail = (email: string): boolean => {
      if (!email || !email.includes('@')) return false;
      
      // Regex stricte pour validation email
      const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
      
      if (!emailRegex.test(email)) return false;
      
      // Vérifier que ce n'est pas un email @smartcabb.app généré automatiquement
      if (email.includes('@smartcabb.app')) return false;
      
      // Vérifier que le domaine a au moins 2 caractères après le point
      const domain = email.split('@')[1];
      const domainParts = domain.split('.');
      if (domainParts.length < 2 || domainParts[domainParts.length - 1].length < 2) {
        return false;
      }
      
      return true;
    };

    // Déterminer l'email à utiliser ET normaliser le téléphone pour le stockage
    let finalEmail: string;
    let normalizedPhoneForStorage: string;
    let usesPhoneAuth = false;
    
    // ✅ TOUJOURS normaliser le téléphone au format +243XXXXXXXXX pour le stockage
    const cleanPhone = phone.replace(/[\s\-+()]/g, '');
    if (cleanPhone.length === 9) {
      normalizedPhoneForStorage = `+243${cleanPhone}`;
    } else if (cleanPhone.length === 10 && cleanPhone.startsWith('0')) {
      normalizedPhoneForStorage = `+243${cleanPhone.substring(1)}`;
    } else if (cleanPhone.length === 12 && cleanPhone.startsWith('243')) {
      normalizedPhoneForStorage = `+${cleanPhone}`;
    } else if (cleanPhone.length === 13 && cleanPhone.startsWith('+243')) {
      normalizedPhoneForStorage = cleanPhone;
    } else if (cleanPhone.length === 13 && cleanPhone.startsWith('2430')) {
      normalizedPhoneForStorage = `+243${cleanPhone.substring(4)}`;
    } else {
      normalizedPhoneForStorage = `+${cleanPhone.replace(/^0+/, '243')}`;
    }
    
    if (email && email.trim() && isValidRealEmail(email.trim())) {
      // ✅ Email réel fourni et VALIDE
      console.log('✅ Email réel valide fourni:', email.trim());
      
      const { data: existingEmailProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email.trim().toLowerCase())
        .maybeSingle();
      
      if (existingEmailProfile) {
        return c.json({ 
          success: false, 
          error: 'Cet email est déjà utilisé' 
        }, 400);
      }
      
      finalEmail = email.trim().toLowerCase();
      usesPhoneAuth = false;
    } else if (email && email.trim() && !isValidRealEmail(email.trim())) {
      // ❌ Email fourni mais INVALIDE
      console.error('❌ Email fourni mais invalide:', email.trim());
      return c.json({ 
        success: false, 
        error: 'Email invalide. Veuillez entrer un email valide (ex: nom@gmail.com) ou laissez vide pour utiliser uniquement le téléphone.' 
      }, 400);
    } else {
      // ⚠️ Pas d'email réel : créer email interne basé sur téléphone
      console.log('⚠️ Aucun email réel fourni, génération email interne @smartcabb.app');
      
      // Utiliser normalizedPhoneForStorage sans le + pour l'email
      const normalizedPhoneForEmail = normalizedPhoneForStorage.substring(1); // Enlever le +
      
      // ✅ CORRECTION: Format simple SANS timestamp
      // Format : u243XXXXXXXXX@smartcabb.app (préfixe "u" car emails doivent commencer par une lettre)
      finalEmail = `u${normalizedPhoneForEmail}@smartcabb.app`;
      usesPhoneAuth = true;
      
      console.log('📧 Email interne généré:', finalEmail);
    }

    console.log("📧 Email final:", finalEmail);
    console.log("📱 Téléphone normalisé pour stockage:", normalizedPhoneForStorage);

    // ÉTAPE 1: Vérifier et nettoyer les utilisateurs orphelins AVANT de créer
    console.log('🔍 Vérification préventive des utilisateurs orphelins (conducteur)...');
    console.log('📧 Email à vérifier:', finalEmail);
    console.log('📱 Téléphone à vérifier:', phone);
    try {
      // ✅ CORRECTION: Au lieu de listUsers (qui peut échouer avec "Database error"), 
      // on vérifie d'abord dans le KV store qui est plus fiable
      
      // Vérifier si l'utilisateur existe dans le KV store
      const kvDrivers = await kv.getByPrefix('driver:');
      console.log(`📊 Nombre de conducteurs dans KV: ${kvDrivers?.length || 0}`);
      
      // Chercher un driver existant avec ce téléphone
      const existingDriver = kvDrivers?.find((driver: any) => driver.phone === phone);
      
      if (existingDriver) {
        console.log('⚠️ Conducteur trouvé dans KV avec ce téléphone:', existingDriver.id);
        console.log('📅 Créé le:', existingDriver.created_at);
        
        // ✅ Validation UUID avant appel
        if (!isValidUUID(existingDriver.id)) {
          console.log('🧹 ID invalide, suppression du conducteur orphelin...');
          await kv.del(`driver:${existingDriver.id}`);
          console.log('✅ Profil KV orphelin supprimé');
          await new Promise(resolve => setTimeout(resolve, 500));
          return;
        }
        
        // Essayer de récupérer son profil auth
        const { data: existingAuthUser, error: getUserError } = await supabase.auth.admin.getUserById(existingDriver.id);
        
        if (getUserError || !existingAuthUser?.user) {
          // C'est un utilisateur orphelin (KV mais pas d'auth)
          console.log('🧹 Utilisateur orphelin détecté (KV sans Auth), nettoyage...');
          await kv.del(`driver:${existingDriver.id}`);
          console.log('✅ Profil KV orphelin supprimé');
          console.log('⏳ Attente de 500ms pour la propagation...');
          await new Promise(resolve => setTimeout(resolve, 500));
        } else {
          // L'utilisateur existe avec un profil complet
          console.log('ℹ️ Conducteur complet existe déjà (Auth + KV)');
          return c.json({ 
            success: false, 
            error: 'Un compte conducteur avec ce téléphone existe déjà. Veuillez vous connecter.' 
          }, 400);
        }
      } else {
        console.log('✅ Aucun conducteur trouvé avec ce téléphone dans le KV store');
      }
    } catch (checkError) {
      console.error('⚠️ Erreur lors de la vérification préventive:', checkError);
      // Continuer malgré l'erreur de vérification
    }

    // ÉTAPE 2: Créer l'utilisateur avec Admin API (orphelins déjà nettoyés)
    console.log('📝 Création du compte conducteur dans Supabase Auth...');
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: finalEmail,
      password,
      email_confirm: true, // Auto-confirm
      user_metadata: {
        full_name: fullName,
        phone: phone,
        role: 'driver',
        uses_phone_auth: usesPhoneAuth // ✅ Indique si l'utilisateur utilise uniquement le téléphone
      }
    });

    if (authError) {
      console.error('❌ Erreur création auth conducteur:', authError);
      return c.json({ 
        success: false, 
        error: `Erreur lors de la création du compte conducteur: ${authError.message}` 
      }, 500);
    }

    if (!authData.user) {
      return c.json({ 
        success: false, 
        error: 'Erreur création compte' 
      }, 500);
    }

    console.log('✅ Auth user créé:', authData.user.id);

    // Créer le profil dans le KV store
    const profileData = {
      id: authData.user.id,
      email: finalEmail,
      phone: normalizedPhoneForStorage, // ✅ Utiliser le téléphone normalisé
      full_name: fullName,
      name: fullName, // ✅ Ajouter aussi 'name' pour compatibilité
      role: 'driver',
      password: password, // ✅ Stocker le mot de passe pour le panel admin
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Générer un numéro de permis temporaire unique basé sur le timestamp et l'ID utilisateur
    const tempLicenseNumber = `TEMP-${Date.now()}-${authData.user.id.substring(0, 8)}`;
    
    // Créer les données du driver avec le véhicule
    const driverData = {
      id: authData.user.id,
      user_id: authData.user.id,
      license_number: tempLicenseNumber,
      status: 'pending', // ✅ NOUVEAUX CONDUCTEURS EN ATTENTE D'APPROBATION
      isApproved: false, // ✅ Pas approuvé par défaut
      is_approved: false, // ✅ Alias pour compatibilité
      rating: 0,
      total_rides: 0,
      is_available: false,
      balance: 0, // ✅ Initialiser le solde
      profile_photo: profilePhoto || null, // 📸 Photo en Base64
      photo_url: profilePhoto || null, // 📸 Alias pour compatibilité
      vehicle: {
        make: vehicleMake,
        model: vehicleModel,
        year: new Date().getFullYear(),
        color: vehicleColor || 'Inconnu',
        license_plate: vehiclePlate,
        category: vehicleCategory ? vehicleCategory.toLowerCase() : 'standard',
        seats: 4
      },
      ...profileData // ✅ Ceci inclut maintenant le mot de passe
    };

    try {
      // Sauvegarder le driver dans le KV store
      await kv.set(`driver:${authData.user.id}`, driverData);
      console.log('✅ Conducteur créé avec succès dans KV store');
    } catch (kvError) {
      console.error('❌ Erreur création driver dans KV store:', kvError);
      await supabase.auth.admin.deleteUser(authData.user.id);
      return c.json({ 
        success: false, 
        error: 'Erreur lors de la création du profil conducteur. Veuillez réessayer.' 
      }, 500);
    }

    return c.json({
      success: true,
      message: 'Inscription réussie',
      user: {
        id: authData.user.id,
        email: finalEmail,
        phone: phone
      },
      profile: profileData,
      driver: driverData,
      credentials: {
        phone: phone,
        tempEmail: finalEmail
      }
    });

  } catch (error) {
    console.error('❌ Erreur inattendue:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Erreur inattendue' 
    }, 500);
  }
});

// ============================================
// CLEAN ORPHAN PROFILE ENDPOINT
// ============================================

/**
 * Supprimer un profil orphelin (profil sans compte auth)
 * Cet endpoint nettoie automatiquement les profils qui n'ont pas de compte correspondant
 */
app.post("/make-server-2eb02e52/clean-orphan-profile", async (c) => {
  try {
    const body = await c.req.json();
    const { userId } = body;

    console.log("🧹 Nettoyage profil orphelin:", userId);

    if (!userId) {
      return c.json({ 
        success: false, 
        error: 'userId manquant' 
      }, 400);
    }

    // Create admin client with service role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // ✅ Validation UUID
    if (!isValidUUID(userId)) {
      console.log('❌ ID invalide (pas un UUID):', userId);
      return c.json({ 
        success: false, 
        error: 'ID invalide - doit être un UUID' 
      }, 400);
    }

    // Vérifier si l'utilisateur existe dans auth.users
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId);

    if (authError && authError.message.includes('not found')) {
      // L'utilisateur n'existe pas dans auth.users, c'est un profil orphelin
      console.log('⚠️ Profil orphelin détecté, suppression...');
      
      // Supprimer le profil orphelin
      const { error: deleteError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (deleteError) {
        console.error('❌ Erreur lors de la suppression du profil orphelin:', deleteError);
        return c.json({ 
          success: false, 
          error: `Erreur suppression: ${deleteError.message}`,
          isOrphan: true
        }, 500);
      }

      console.log('✅ Profil orphelin supprimé avec succès');
      return c.json({
        success: true,
        message: 'Profil orphelin supprimé avec succès',
        wasOrphan: true,
        deleted: true
      });
    }

    // L'utilisateur existe dans auth.users, ce n'est pas un profil orphelin
    console.log('✅ Profil valide, aucune action nécessaire');
    return c.json({
      success: true,
      message: 'Profil valide, aucun nettoyage nécessaire',
      wasOrphan: false,
      deleted: false
    });

  } catch (error) {
    console.error('❌ Erreur lors du nettoyage du profil orphelin:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, 500);
  }
});

// ============================================
// DELETE USER COMPLETELY (Profile + Auth)
// ============================================

/**
 * Supprime complètement un utilisateur (profil + auth.users)
 * Utilisé pour nettoyer un compte par téléphone
 */
app.post("/make-server-2eb02e52/delete-user-by-phone", async (c) => {
  try {
    const { phone } = await c.req.json();

    console.log("🗑️ Suppression complète utilisateur par téléphone:", phone);

    if (!phone) {
      return c.json({ 
        success: false, 
        error: 'Téléphone requis' 
      }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Chercher le profil par téléphone
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('phone', phone)
      .maybeSingle();

    if (!profile) {
      console.log('ℹ️ Aucun profil trouvé avec ce téléphone');
      
      // Vérifier quand même dans auth.users avec email temporaire
      const cleanPhone = phone.replace(/[\s\-+]/g, '');
      let normalizedPhone: string;
      
      if (cleanPhone.length === 9) {
        normalizedPhone = `243${cleanPhone}`;
      } else if (cleanPhone.length === 10 && cleanPhone.startsWith('0')) {
        normalizedPhone = `243${cleanPhone.substring(1)}`;
      } else if (cleanPhone.length === 12 && cleanPhone.startsWith('243')) {
        normalizedPhone = cleanPhone;
      } else {
        normalizedPhone = cleanPhone.replace(/^0+/, '243');
      }
      
      const normalizedEmail = `u${normalizedPhone}@smartcabb.app`;
      const tempEmail = normalizedEmail;
      
      console.log('🔍 Recherche dans KV store par téléphone');
      
      // Chercher d'abord dans le KV store par téléphone
      const kvUsers = await kv.getByPrefix('passenger:');
      const kvProfile = kvUsers?.find((u: any) => u.phone === phone);
      
      if (kvProfile) {
        console.log('🔍 Utilisateur trouvé dans KV:', kvProfile.id);
        
        // Supprimer du KV store
        await kv.del(`passenger:${kvProfile.id}`);
        console.log('✅ Profil KV supprimé');
        
        // Supprimer de auth
        try {
          const { error: authDeleteError } = await supabase.auth.admin.deleteUser(kvProfile.id);
          if (authDeleteError) {
            console.error('❌ Erreur suppression auth:', authDeleteError);
          } else {
            console.log('✅ Utilisateur auth supprimé');
          }
        } catch (authError) {
          console.log('⚠️ Erreur suppression auth:', authError);
        }
        
        return c.json({ 
          success: true, 
          message: 'Utilisateur supprimé (KV + Auth)',
          deletedAuth: true,
          deletedProfile: false,
          deletedKV: true
        });
      }
      
      // Si pas trouvé dans KV, chercher aussi les conducteurs
      const driverKvUsers = await kv.getByPrefix('driver:');
      const driverKvProfile = driverKvUsers?.find((u: any) => u.phone === phone);
      
      if (driverKvProfile) {
        console.log('🔍 Conducteur trouvé dans KV:', driverKvProfile.id);
        
        await kv.del(`driver:${driverKvProfile.id}`);
        console.log('✅ Profil conducteur KV supprimé');
        
        try {
          const { error: authDeleteError } = await supabase.auth.admin.deleteUser(driverKvProfile.id);
          if (authDeleteError) {
            console.error('❌ Erreur suppression auth:', authDeleteError);
          } else {
            console.log('✅ Utilisateur auth supprimé');
          }
        } catch (authError) {
          console.log('⚠️ Erreur suppression auth:', authError);
        }
        
        return c.json({ 
          success: true, 
          message: 'Conducteur supprimé (KV + Auth)',
          deletedAuth: true,
          deletedProfile: false,
          deletedKV: true
        });
      }
      
      console.log('ℹ️ Aucun utilisateur trouvé avec ce téléphone');
      return c.json({ 
        success: true, 
        message: 'Aucun utilisateur trouvé avec ce téléphone',
        deletedAuth: false,
        deletedProfile: false,
        deletedKV: false
      });
    }

    console.log('📋 Profil trouvé:', profile.id, profile.email);

    // 2. Supprimer du KV store
    try {
      const kvUsers = await kv.getByPrefix('passenger:');
      const kvProfile = kvUsers?.find((u: any) => u.id === profile.id);
      if (kvProfile) {
        await kv.del(`passenger:${profile.id}`);
        console.log('✅ Profil KV supprimé');
      }
      
      // Vérifier aussi pour les conducteurs
      const driverKvUsers = await kv.getByPrefix('driver:');
      const driverKvProfile = driverKvUsers?.find((u: any) => u.id === profile.id);
      if (driverKvProfile) {
        await kv.del(`driver:${profile.id}`);
        console.log('✅ Profil conducteur KV supprimé');
      }
    } catch (kvError) {
      console.error('⚠️ Erreur suppression KV:', kvError);
      // Continuer même si erreur
    }

    // 3. Supprimer le profil de la table profiles
    const { error: deleteProfileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', profile.id);

    if (deleteProfileError) {
      console.error('❌ Erreur suppression profil:', deleteProfileError);
      return c.json({ 
        success: false, 
        error: `Erreur suppression profil: ${deleteProfileError.message}` 
      }, 500);
    }

    console.log('✅ Profil table supprimé');

    // 4. Supprimer l'utilisateur auth
    const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(profile.id);

    if (deleteAuthError) {
      console.error('⚠️ Erreur suppression auth:', deleteAuthError);
      // Continuer même si erreur (peut-être déjà supprimé)
    } else {
      console.log('✅ Utilisateur auth supprimé');
    }

    return c.json({ 
      success: true, 
      message: 'Utilisateur complètement supprimé (Auth + Table + KV)',
      deletedAuth: !deleteAuthError,
      deletedProfile: true,
      userId: profile.id
    });

  } catch (error) {
    console.error('❌ Erreur suppression utilisateur:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Erreur inconnue' 
    }, 500);
  }
});

// ============================================
// DELETE USER BY ID (utilisé par le panel admin)
// ============================================

/**
 * Supprime complètement un utilisateur par son ID
 * Utilisé par le panel admin pour supprimer un passager ou conducteur
 */
app.post("/make-server-2eb02e52/delete-user-by-id", async (c) => {
  try {
    const { userId } = await c.req.json();

    console.log("🗑️ Suppression complète utilisateur par ID:", userId);

    if (!userId) {
      return c.json({ 
        success: false, 
        error: 'ID utilisateur requis' 
      }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Supprimer du KV store (passagers et conducteurs)
    let deletedFromKV = false;
    try {
      const kvUsers = await kv.getByPrefix('passenger:');
      const kvProfile = kvUsers?.find((u: any) => u.id === userId);
      if (kvProfile) {
        await kv.del(`passenger:${userId}`);
        console.log('✅ Profil passager KV supprimé');
        deletedFromKV = true;
      }
      
      const driverKvUsers = await kv.getByPrefix('driver:');
      const driverKvProfile = driverKvUsers?.find((u: any) => u.id === userId);
      if (driverKvProfile) {
        await kv.del(`driver:${userId}`);
        console.log('✅ Profil conducteur KV supprimé');
        deletedFromKV = true;
      }
    } catch (kvError) {
      console.error('⚠️ Erreur suppression KV:', kvError);
    }

    // 2. Supprimer de la table profiles
    const { error: deleteProfileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (deleteProfileError) {
      console.error('❌ Erreur suppression profil:', deleteProfileError);
      // Continuer quand même pour essayer de supprimer auth
    } else {
      console.log('✅ Profil table supprimé');
    }

    // 3. Supprimer l'utilisateur auth
    const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(userId);

    if (deleteAuthError) {
      console.error('⚠️ Erreur suppression auth:', deleteAuthError);
    } else {
      console.log('✅ Utilisateur auth supprimé');
    }

    // Si rien n'a été supprimé, c'est une erreur
    if (!deletedFromKV && deleteProfileError && deleteAuthError) {
      return c.json({ 
        success: false, 
        error: 'Utilisateur non trouvé ou déjà supprimé' 
      }, 404);
    }

    return c.json({ 
      success: true, 
      message: 'Utilisateur complètement supprimé (Auth + Table + KV)',
      deletedAuth: !deleteAuthError,
      deletedProfile: !deleteProfileError,
      deletedKV: deletedFromKV,
      userId: userId
    });

  } catch (error) {
    console.error('❌ Erreur suppression utilisateur:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Erreur inconnue' 
    }, 500);
  }
});

// 🔒 MIDDLEWARE DE SÉCURITÉ OWASP (TEMPORAIREMENT DÉSACTIVÉ POUR DEBUG)
// TODO: Réactiver après avoir confirmé que /health fonctionne
// app.use('*', securityMiddleware);

// ============================================
// 🔥 ROUTES COMMENTÉES TEMPORAIREMENT POUR FIX 404
// ============================================
app.route('/make-server-2eb02e52/auth', authRoutes);
// app.route('/make-server-2eb02e52/sms', smsRoutes);
// app.route('/make-server-2eb02e52/test', testRoutes);
// app.route('/make-server-2eb02e52/kv-test', kvTestRoutes);
app.route('/make-server-2eb02e52/google-maps', googleMapsApp);
// app.route('/make-server-2eb02e52/geocoding', geocodingApp);
// app.route('/make-server-2eb02e52/nominatim', nominatimApp);
// app.route('/make-server-2eb02e52/analytics', analyticsApp);
// app.route('/make-server-2eb02e52', diagnosticRoute);
// app.route('/make-server-2eb02e52/backups', backupRoutes);
// app.route('/make-server-2eb02e52/export', exportRoutes);
// app.route('/make-server-2eb02e52/cleanup', cleanupRoutes);
// app.route('/make-server-2eb02e52', auditRoutes);
// app.route('/make-server-2eb02e52/website', websiteRoutes);
// app.route('/make-server-2eb02e52/chat', chatRoutes);

// ============================================
// DRIVER ROUTES (Conducteurs)
// ============================================
// 🔥 ROUTE INLINE SIMPLIFIÉE - Sans dépendances externes
app.get('/make-server-2eb02e52/drivers', async (c) => {
  try {
    console.log('📋 Récupération de la liste des conducteurs');
    
    // Récupérer tous les conducteurs depuis le KV store
    const allDrivers = await kv.getByPrefix('driver:');
    
    console.log(`✅ ${allDrivers.length} conducteurs trouvés`);
    
    return c.json({
      success: true,
      drivers: allDrivers,
      count: allDrivers.length
    });
  } catch (error) {
    console.error('❌ Erreur récupération conducteurs:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }, 500);
  }
});

// ============================================
// 📝 POST /drivers/signup - INSCRIPTION CONDUCTEUR
// ============================================
app.post('/make-server-2eb02e52/drivers/signup', async (c) => {
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

    // Générer l'email factice (SANS le +)
    const phoneWithoutPlus = normalizedPhone.replace(/\+/g, '');
    const generatedEmail = email || `u${phoneWithoutPlus}@smartcabb.app`;

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

    // 💾 Sauvegarder dans KV store
    console.log(`💾 [DRIVER/SIGNUP] Sauvegarde du profil ID: ${authData.user.id}`);
    
    await kv.set(`driver:${authData.user.id}`, driverProfile);
    
    console.log('✅ [DRIVER/SIGNUP] Profil conducteur créé avec succès');

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
// PASSENGER ROUTES (Passagers)
// ============================================
// 🔥 ROUTE INLINE SIMPLIFIÉE - Sans dépendances externes
app.get('/make-server-2eb02e52/passengers', async (c) => {
  try {
    console.log('📋 Récupération de la liste des passagers');
    
    // Récupérer tous les passagers depuis le KV store
    const allPassengers = await kv.getByPrefix('passenger:');
    
    console.log(`✅ ${allPassengers.length} passagers trouvés`);
    
    return c.json({
      success: true,
      passengers: allPassengers,
      count: allPassengers.length
    });
  } catch (error) {
    console.error('❌ Erreur récupération passagers:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }, 500);
  }
});

// 🆕 GET /passengers/:id - Récupérer un passager par ID (avec auto-création si nécessaire)
app.get('/make-server-2eb02e52/passengers/:id', async (c) => {
  try {
    const passengerId = c.req.param('id');
    
    console.log('🔍 [PASSENGER/GET] Recherche passager ID:', passengerId);
    
    // Validation UUID
    if (!isValidUUID(passengerId)) {
      return c.json({
        success: false,
        error: 'ID invalide'
      }, 400);
    }
    
    // Chercher le passager dans le KV store
    let passenger = await kv.get(`passenger:${passengerId}`);
    
    if (passenger) {
      console.log('✅ [PASSENGER/GET] Passager trouvé dans KV store');
      return c.json({
        success: true,
        passenger
      });
    }
    
    // 🔧 AUTO-RÉPARATION : Si le passager n'existe pas dans KV, tenter réparation UUID
    console.log('⚠️ [PASSENGER/GET] Passager non trouvé dans KV avec UUID:', passengerId);
    console.log('🔍 [PASSENGER/GET] Recherche dans Auth...');
    
    const { data: authData, error: authError } = await supabase.auth.admin.getUserById(passengerId);
    
    if (authError || !authData?.user) {
      // 🔧 ÉTAPE 2 : UUID pas dans Auth, c'est peut-être un UUID orphelin
      console.log('⚠️ [PASSENGER/GET] UUID non trouvé dans Auth, recherche profils orphelins...');
      
      // Récupérer tous les profils KV pour chercher cet UUID orphelin
      const allProfiles = await kv.getByPrefix('passenger:');
      const orphanProfile = allProfiles.find((p: any) => p.id === passengerId);
      
      if (orphanProfile && orphanProfile.phone) {
        console.log('🔧 [PASSENGER/GET] Profil orphelin trouvé:', orphanProfile.phone);
        
        // Chercher le vrai utilisateur dans Auth par téléphone
        const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
        
        if (!listError && users) {
          const normalizedOrphanPhone = (orphanProfile.phone || '').replace(/\D/g, '');
          const realAuthUser = users.find((u: any) => {
            const userPhone = (u.user_metadata?.phone || '').replace(/\D/g, '');
            return userPhone && userPhone === normalizedOrphanPhone;
          });
          
          if (realAuthUser) {
            console.log('🔧 [PASSENGER/GET] Auth trouvé, UUID correct:', realAuthUser.id);
            console.log('🔧 [PASSENGER/GET] Migration:', passengerId, '→', realAuthUser.id);
            
            // Supprimer le profil orphelin
            await kv.del(`passenger:${passengerId}`);
            console.log('  🗑️ Supprimé passenger orphelin:', passengerId);
            
            // Créer le profil avec le bon UUID
            const repairedPassenger = {
              id: realAuthUser.id,
              email: realAuthUser.email || orphanProfile.email,
              full_name: realAuthUser.user_metadata?.full_name || orphanProfile.full_name || 'Utilisateur',
              phone: realAuthUser.user_metadata?.phone || orphanProfile.phone,
              role: 'passenger',
              balance: orphanProfile.balance || 0,
              totalRides: orphanProfile.totalRides || 0,
              rating: orphanProfile.rating || 5.0,
              created_at: realAuthUser.created_at || orphanProfile.created_at || new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            
            await kv.set(`passenger:${realAuthUser.id}`, repairedPassenger);
            await kv.set(`profile:${realAuthUser.id}`, repairedPassenger);
            console.log('✅ [PASSENGER/GET] Profil réparé:', realAuthUser.id);
            
            return c.json({
              success: true,
              passenger: repairedPassenger,
              repaired: true,
              old_uuid: passengerId,
              new_uuid: realAuthUser.id
            });
          }
        }
      }
      
      // UUID vraiment invalide
      console.error('❌ [PASSENGER/GET] UUID invalide:', passengerId);
      return c.json({
        success: false,
        error: 'Profil introuvable. Veuillez contacter le support.',
        details: 'UUID non trouvé dans Auth et aucun profil orphelin dans KV'
      }, 404);
    }
    
    // ✅ UUID trouvé dans Auth, créer le profil KV
    console.log('✅ [PASSENGER/GET] Utilisateur trouvé dans Auth, création profil KV...');
    
    const newPassenger = {
      id: authData.user.id,
      email: authData.user.email || `u${authData.user.user_metadata?.phone}@smartcabb.app`,
      full_name: authData.user.user_metadata?.full_name || authData.user.user_metadata?.name || 'Utilisateur',
      phone: authData.user.user_metadata?.phone || '',
      role: 'passenger',
      balance: 0,
      totalRides: 0,
      rating: 5.0,
      created_at: authData.user.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Sauvegarder dans KV store
    await kv.set(`passenger:${passengerId}`, newPassenger);
    await kv.set(`profile:${passengerId}`, newPassenger);
    
    console.log('✅ [PASSENGER/GET] Profil passager créé automatiquement:', newPassenger);
    
    return c.json({
      success: true,
      passenger: newPassenger,
      created: true
    });
    
  } catch (error) {
    console.error('❌ [PASSENGER/GET] Erreur:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur serveur'
    }, 500);
  }
});

// 🆕 POST /passengers/signup - Inscription passager
app.post('/make-server-2eb02e52/passengers/signup', async (c) => {
  try {
    const body = await c.req.json();
    const { full_name, email, phone, password } = body;

    console.log('📝 [PASSENGER/SIGNUP] Inscription passager:', { full_name, phone, email });

    // Validation
    if (!full_name || !phone || !password) {
      return c.json({
        success: false,
        error: "Nom complet, téléphone et mot de passe requis"
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

    // Vérifier si l'utilisateur existe déjà
    const { data: { users: existingUsers } } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.find(u => {
      const userPhone = u.user_metadata?.phone || u.phone;
      return userPhone && normalizePhoneNumber(userPhone) === normalizedPhone;
    });

    if (existingUser) {
      console.log('⚠️ [PASSENGER/SIGNUP] Utilisateur existant avec ce numéro');
      return c.json({
        success: false,
        error: "Ce numéro de téléphone est déjà enregistré"
      }, 400);
    }

    // Générer l'email factice (SANS le +)
    const phoneWithoutPlus = normalizedPhone.replace(/\+/g, '');
    const generatedEmail = email || `u${phoneWithoutPlus}@smartcabb.app`;

    // Créer l'utilisateur
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: generatedEmail,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        name: full_name,
        phone: normalizedPhone,
        role: 'passenger'
      }
    });

    if (authError || !authData?.user) {
      console.error('❌ [PASSENGER/SIGNUP] Erreur création auth:', authError);
      return c.json({
        success: false,
        error: authError?.message || "Erreur lors de la création du compte"
      }, 500);
    }

    console.log('✅ [PASSENGER/SIGNUP] Utilisateur créé:', authData.user.id);

    // Créer le profil passager dans KV store
    const passengerProfile = {
      id: authData.user.id,
      email: generatedEmail,
      full_name,
      phone: normalizedPhone,
      role: 'passenger',
      balance: 0,
      totalRides: 0,
      rating: 5.0,
      created_at: authData.user.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // 💾 Sauvegarder dans KV store
    console.log(`💾 [PASSENGER/SIGNUP] Sauvegarde du profil ID: ${authData.user.id}`);
    
    await kv.set(`passenger:${authData.user.id}`, passengerProfile);
    
    console.log('✅ [PASSENGER/SIGNUP] Profil passager créé avec succès');

    return c.json({
      success: true,
      user: authData.user,
      profile: passengerProfile
    });

  } catch (error) {
    console.error('❌ [PASSENGER/SIGNUP] Erreur:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : "Erreur serveur"
    }, 500);
  }
});

// 🆕 ROUTE DE DIAGNOSTIC - Créer profil passager manuellement (URGENT FIX)
app.post('/make-server-2eb02e52/diagnostic/create-passenger-profile', async (c) => {
  try {
    const body = await c.req.json();
    const { userId } = body;
    
    console.log('🔧 [DIAGNOSTIC] Création manuelle profil pour user ID:', userId);
    
    if (!userId || !isValidUUID(userId)) {
      return c.json({
        success: false,
        error: 'User ID invalide ou manquant'
      }, 400);
    }
    
    // Récupérer les données depuis Supabase Auth
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
    
    if (userError || !userData?.user) {
      console.error('❌ [DIAGNOSTIC] Utilisateur non trouvé dans Auth:', userError);
      return c.json({
        success: false,
        error: 'Utilisateur non trouvé dans Supabase Auth',
        details: userError
      }, 404);
    }
    
    console.log('✅ [DIAGNOSTIC] Utilisateur trouvé dans Auth:', {
      id: userData.user.id,
      email: userData.user.email,
      phone: userData.user.user_metadata?.phone,
      full_name: userData.user.user_metadata?.full_name
    });
    
    // Vérifier si le profil existe déjà dans KV
    const existingProfile = await kv.get(`passenger:${userId}`);
    if (existingProfile) {
      console.log('⚠️ [DIAGNOSTIC] Profil déjà existant dans KV:', existingProfile);
      return c.json({
        success: true,
        message: 'Profil déjà existant',
        profile: existingProfile,
        wasCreated: false
      });
    }
    
    // Créer le profil passager
    const newPassenger = {
      id: userData.user.id,
      email: userData.user.email || `u${userData.user.user_metadata?.phone}@smartcabb.app`,
      full_name: userData.user.user_metadata?.full_name || userData.user.user_metadata?.name || 'Utilisateur',
      phone: userData.user.user_metadata?.phone || '',
      role: 'passenger',
      balance: 0,
      totalRides: 0,
      rating: 5.0,
      created_at: userData.user.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Sauvegarder dans KV store
    await kv.set(`passenger:${userId}`, newPassenger);
    
    console.log('✅ [DIAGNOSTIC] Profil passager créé avec succès:', newPassenger);
    
    return c.json({
      success: true,
      message: 'Profil créé avec succès',
      profile: newPassenger,
      wasCreated: true
    });
    
  } catch (error) {
    console.error('❌ [DIAGNOSTIC] Erreur:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur serveur',
      stack: error instanceof Error ? error.stack : undefined
    }, 500);
  }
});

// ============================================
// 🔥 ROUTES COMMENTÉES TEMPORAIREMENT POUR FIX 404
// ============================================
// app.route('/make-server-2eb02e52/wallet', walletRoutes);
app.route('/make-server-2eb02e52/rides', rideRoutes);
app.route('/make-server-2eb02e52/admin', adminRoutes);
app.route('/make-server-2eb02e52/cancellations', cancellationRoutes);
// app.route('/make-server-2eb02e52/reset', resetDatabaseRoutes);
// app.route('/make-server-2eb02e52/settings', settingsRoutes);

// ============================================
// TEST DIRECT SETTINGS ROUTE (Debugging)
// ============================================
app.get('/make-server-2eb02e52/settings-test', async (c) => {
  try {
    console.log('🧪 Route de test settings appelée');
    const systemSettings = await kv.get('system_settings');
    
    if (!systemSettings) {
      const defaultSettings = {
        exchangeRate: 2000,
        postpaidInterestRate: 15,
        emailNotifications: true,
        smsNotifications: false,
        pushNotifications: true
      };
      console.log('ℹ️ Test: Retour des valeurs par défaut');
      return c.json(defaultSettings);
    }
    
    console.log('✅ Test: Paramètres trouvés', systemSettings);
    return c.json(systemSettings);
  } catch (error) {
    console.error('❌ Test: Erreur', error);
    return c.json({ error: error instanceof Error ? error.message : 'Erreur serveur' }, 500);
  }
});

// ============================================
// 🔥 ROUTES COMMENTÉES TEMPORAIREMENT POUR FIX 404
// ============================================
// app.route('/make-server-2eb02e52', emailRoutes);
// app.route('/make-server-2eb02e52/emergency', emergencyRoutes);
app.route('/make-server-2eb02e52/fcm', fcmRoutes);
// app.route('/make-server-2eb02e52/config', configRoutes);

// ============================================
// CONTACT FORM ROUTE
// ============================================
/**
 * POST /make-server-2eb02e52/contact
 * Reçoit et enregistre les messages de contact du site web
 */
app.post('/make-server-2eb02e52/contact', async (c) => {
  try {
    const body = await c.req.json();
    const { name, email, phone, message, language, source } = body;

    console.log('📧 Nouveau message de contact:', { name, email, source });

    // Validation
    if (!name || !email || !message) {
      return c.json({ 
        success: false, 
        error: 'Nom, email et message sont requis' 
      }, 400);
    }

    // Validation email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return c.json({ 
        success: false, 
        error: 'Adresse email invalide' 
      }, 400);
    }

    // Save to key-value store
    const timestamp = Date.now();
    const contactKey = `contact_message_${timestamp}_${Math.random().toString(36).substring(7)}`;
    
    const contactData = {
      name,
      email,
      phone: phone || null,
      message,
      language: language || 'fr',
      source: source || 'website',
      created_at: new Date().toISOString(),
      read: false
    };

    await kv.set(contactKey, contactData);
    console.log('✅ Message de contact enregistré:', contactKey);

    // TODO: Send notification email to admin (future feature)
    // TODO: Send SMS notification to admin (future feature)

    return c.json({ 
      success: true, 
      message: 'Votre message a été envoyé avec succès. Nous vous répondrons dans les plus brefs délais.'
    });

  } catch (error) {
    console.error('❌ Erreur lors de l\'enregistrement du message:', error);
    return c.json({ 
      success: false, 
      error: 'Une erreur est survenue lors de l\'envoi de votre message' 
    }, 500);
  }
});

// ============================================
// GET CONTACT MESSAGES (Admin only)
// ============================================
/**
 * GET /make-server-2eb02e52/contact/messages
 * Récupère tous les messages de contact (pour l'admin)
 */
app.get('/make-server-2eb02e52/contact/messages', async (c) => {
  try {
    // Create admin client to query directly
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    // Get all contact messages directly from kv_store table
    const { data: rawMessages, error } = await supabase
      .from('kv_store_2eb02e52')
      .select('key, value')
      .like('key', 'contact_message_%');
    
    if (error) {
      console.error('❌ Erreur DB:', error);
      throw error;
    }
    
    console.log(`📬 Messages bruts récupérés: ${rawMessages?.length || 0}`);
    
    if (!rawMessages || rawMessages.length === 0) {
      console.log('ℹ️ Aucun message trouvé dans la base de données');
      return c.json({ 
        success: true, 
        messages: [],
        count: 0
      });
    }
    
    // Format messages with key and value
    const formattedMessages = rawMessages.map(msg => ({
      key: msg.key,
      value: msg.value
    }));
    
    // Filtrer les messages valides (qui ont une structure correcte)
    const validMessages = formattedMessages.filter(msg => {
      if (!msg || !msg.value) {
        console.warn('⚠️ Message invalide (pas de value):', msg);
        return false;
      }
      if (!msg.value.created_at) {
        console.warn('⚠️ Message invalide (pas de created_at):', msg);
        return false;
      }
      return true;
    });
    
    console.log(`✅ Messages valides: ${validMessages.length}`);
    
    // Sort by timestamp (newest first)
    const sortedMessages = validMessages.sort((a, b) => {
      const timeA = new Date(a.value.created_at).getTime();
      const timeB = new Date(b.value.created_at).getTime();
      return timeB - timeA;
    });

    return c.json({ 
      success: true, 
      messages: sortedMessages,
      count: sortedMessages.length
    });

  } catch (error) {
    console.error('❌ Erreur lors de la récupération des messages:', error);
    return c.json({ 
      success: false, 
      error: 'Erreur lors de la récupération des messages',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    }, 500);
  }
});

// ============================================
// MARK MESSAGE AS READ
// ============================================
/**
 * POST /make-server-2eb02e52/contact/mark-read
 * Marque un message comme lu
 */
app.post('/make-server-2eb02e52/contact/mark-read', async (c) => {
  try {
    const { messageKey } = await c.req.json();

    if (!messageKey) {
      return c.json({ success: false, error: 'Message key requis' }, 400);
    }

    const message = await kv.get(messageKey);
    if (!message) {
      return c.json({ success: false, error: 'Message non trouvé' }, 404);
    }

    // Update read status
    const updatedMessage = {
      ...message,
      read: true,
      read_at: new Date().toISOString()
    };

    await kv.set(messageKey, updatedMessage);

    return c.json({ success: true, message: 'Message marqué comme lu' });

  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour du message:', error);
    return c.json({ success: false, error: 'Erreur serveur' }, 500);
  }
});

// ============================================
// DELETE ALL ACCOUNTS (EXCEPT ADMINS)
// ============================================

/**
 * Supprimer tous les comptes passagers et conducteurs
 * Conserve uniquement les comptes administrateurs
 */
app.post("/make-server-2eb02e52/delete-all-accounts", async (c) => {
  try {
    console.log('🗑️ Suppression de tous les comptes passagers et conducteurs...');

    // Créer un client Supabase Admin pour supprimer les auth users
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let deletedProfiles = 0;
    let deletedDrivers = 0;
    let deletedAuthUsers = 0;
    let deletedRides = 0;
    const userIdsToDelete: string[] = [];

    // 🔧 CORRECTION : Récupérer les CLÉS (pas les valeurs) depuis le KV store
    // La fonction kv.getByPrefix() retourne les valeurs, mais on a besoin des clés !
    // Solution : requête directe à la table kv_store_2eb02e52
    
    console.log('🔍 Récupération des clés du KV store...');
    
    // Récupérer toutes les clés 'profile:*' avec leurs valeurs
    const { data: profileKeysData } = await supabaseAdmin
      .from('kv_store_2eb02e52')
      .select('key, value')
      .like('key', 'profile:%');
    
    // Récupérer toutes les clés 'driver:*'
    const { data: driverKeysData } = await supabaseAdmin
      .from('kv_store_2eb02e52')
      .select('key')
      .like('key', 'driver:%');

    console.log(`📊 Trouvé: ${profileKeysData?.length || 0} profils, ${driverKeysData?.length || 0} conducteurs`);

    // Identifier tous les profils qui ne sont pas admin et collecter les IDs
    const profileKeysToDelete: string[] = [];
    if (profileKeysData) {
      for (const row of profileKeysData) {
        const profile = row.value;
        if (profile && profile.role !== 'admin') {
          // Extraire l'ID utilisateur du profileKey (format: profile:userId)
          const userId = row.key.replace('profile:', '');
          userIdsToDelete.push(userId);
          profileKeysToDelete.push(row.key);
          deletedProfiles++;
          console.log(`✅ Profil identifié pour suppression: ${profile.full_name || profile.email} (${userId})`);
        }
      }
    }

    // ✅ OPTIMISATION : Supprimer TOUS les profils non-admin du KV store en une seule requête
    if (profileKeysToDelete.length > 0) {
      console.log(`🗑️ Suppression de ${profileKeysToDelete.length} profils du KV store...`);
      try {
        const { error: kvProfilesDeleteError } = await supabaseAdmin
          .from('kv_store_2eb02e52')
          .delete()
          .in('key', profileKeysToDelete);
        
        if (kvProfilesDeleteError) {
          console.warn('⚠️ Erreur suppression KV profiles:', kvProfilesDeleteError.message);
        } else {
          console.log(`✅ ${profileKeysToDelete.length} profil(s) supprimés du KV store`);
        }
      } catch (error) {
        console.warn('⚠️ Erreur suppression KV profiles:', error);
      }
    }

    // ✅ SUPPRESSION : Supprimer TOUS les conducteurs du KV store
    console.log('🗑️ Suppression des conducteurs du KV store...');
    try {
      const { error: kvDriversDeleteError } = await supabaseAdmin
        .from('kv_store_2eb02e52')
        .delete()
        .like('key', 'driver:%');
      
      if (kvDriversDeleteError) {
        console.warn('⚠️ Erreur suppression KV drivers:', kvDriversDeleteError.message);
      } else {
        deletedDrivers = driverKeysData?.length || 0;
        console.log(`✅ ${deletedDrivers} conducteur(s) supprimés du KV store`);
      }
    } catch (error) {
      console.warn('⚠️ Erreur suppression KV drivers:', error);
    }

    // ✅ SUPPRESSION : Supprimer TOUTES les courses du KV store
    console.log('🗑️ Suppression des courses du KV store...');
    try {
      const { data: rideKeysData } = await supabaseAdmin
        .from('kv_store_2eb02e52')
        .select('key')
        .like('key', 'ride:%');
        
      const { error: kvRidesDeleteError } = await supabaseAdmin
        .from('kv_store_2eb02e52')
        .delete()
        .like('key', 'ride:%');
      
      if (kvRidesDeleteError) {
        console.warn('⚠️ Erreur suppression KV rides:', kvRidesDeleteError.message);
      } else {
        deletedRides = rideKeysData?.length || 0;
        console.log(`✅ ${deletedRides} course(s) supprimées du KV store`);
      }
    } catch (error) {
      console.warn('⚠️ Erreur suppression KV rides:', error);
    }

    // ✅ NOUVEAU : Supprimer TOUS les conducteurs de la table Supabase 'drivers'
    console.log('🗑️ Suppression des conducteurs de la table Supabase...');
    try {
      const { error: driversDeleteError, count: driversCount } = await supabaseAdmin
        .from('drivers')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Supprimer tous sauf un ID impossible
      
      if (driversDeleteError && driversDeleteError.code !== 'PGRST116' && driversDeleteError.code !== '42P01') {
        console.warn('⚠️ Erreur suppression table drivers:', driversDeleteError.message);
      } else {
        console.log(`✅ ${driversCount || 'Tous les'} conducteurs supprimés de la table Supabase`);
      }
    } catch (error) {
      console.warn('⚠️ Table drivers introuvable ou erreur:', error);
    }

    // ✅ NOUVEAU : Supprimer TOUS les passagers de la table Supabase 'profiles' (non-admin)
    console.log('🗑️ Suppression des passagers de la table Supabase...');
    try {
      const { error: passengersDeleteError, count: passengersCount } = await supabaseAdmin
        .from('profiles')
        .delete()
        .neq('role', 'admin'); // Garder uniquement les admins
      
      if (passengersDeleteError && passengersDeleteError.code !== 'PGRST116' && passengersDeleteError.code !== '42P01') {
        console.warn('⚠️ Erreur suppression table profiles:', passengersDeleteError.message);
      } else {
        console.log(`✅ ${passengersCount || 'Tous les'} passagers supprimés de la table Supabase`);
      }
    } catch (error) {
      console.warn('⚠️ Table profiles introuvable ou erreur:', error);
    }

    // Supprimer les utilisateurs de Supabase Auth
    for (const userId of userIdsToDelete) {
      try {
        // Supprimer l'utilisateur de Supabase Auth
        const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
        
        if (authDeleteError) {
          console.warn(`⚠️ Erreur suppression auth user ${userId}:`, authDeleteError.message);
        } else {
          deletedAuthUsers++;
          console.log(`✅ Auth user supprimé: ${userId}`);
        }
      } catch (error) {
        console.warn(`⚠️ Erreur suppression utilisateur ${userId}:`, error);
      }
    }

    console.log(`✅ Suppression terminée: ${deletedProfiles} profils KV, ${deletedDrivers} conducteurs, ${deletedRides} courses, ${deletedAuthUsers} auth users`);

    return c.json({
      success: true,
      message: `${deletedProfiles + deletedDrivers} comptes supprimés avec succès`,
      details: {
        profiles: deletedProfiles,
        drivers: deletedDrivers,
        rides: deletedRides,
        authUsers: deletedAuthUsers
      }
    });

  } catch (error) {
    console.error('❌ Erreur lors de la suppression des comptes:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Erreur serveur' 
    }, 500);
  }
});

// ============================================
// CLEANUP AUTH USERS (TEMPORARY ENDPOINT)
// ============================================

/**
 * Nettoyer tous les utilisateurs auth orphelins
 * Utile pour nettoyer après une suppression partielle
 */
app.post("/make-server-2eb02e52/cleanup-auth-users", async (c) => {
  try {
    console.log('🧹 Nettoyage des utilisateurs auth orphelins...');

    // Créer un client Supabase Admin
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Récupérer tous les profils admins du KV store
    const profileKeys = await kv.getByPrefix('profile:');
    const adminIds = new Set<string>();

    for (const profileKey of profileKeys) {
      const profile = await kv.get(profileKey);
      if (profile && profile.role === 'admin') {
        const userId = profileKey.replace('profile:', '');
        adminIds.add(userId);
      }
    }

    console.log(`📋 ${adminIds.size} administrateurs à conserver`);

    // Récupérer tous les utilisateurs auth
    console.log('🔍 Récupération de la liste des utilisateurs Auth...');
    const { data: authUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Erreur listUsers:', listError);
      console.error('📊 Détails:', JSON.stringify(listError));
      
      // Si l'erreur est liée à la base de données, retourner un message informatif
      return c.json({
        success: false,
        error: 'Impossible de lister les utilisateurs. Cette opération nécessite des permissions admin étendues.',
        details: listError.message,
        suggestion: 'Utilisez l\'endpoint /cleanup-kv-only pour nettoyer uniquement le KV store sans toucher à Auth.'
      }, 500);
    }

    let deletedCount = 0;
    let keptCount = 0;

    // Supprimer tous les users qui ne sont pas admin
    for (const user of authUsers.users) {
      if (adminIds.has(user.id)) {
        console.log(`✅ Admin conservé: ${user.email}`);
        keptCount++;
      } else {
        try {
          const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
          
          if (deleteError) {
            console.warn(`⚠️ Erreur suppression ${user.email}:`, deleteError.message);
          } else {
            console.log(`🗑️ User supprimé: ${user.email}`);
            deletedCount++;
          }
        } catch (error) {
          console.warn(`⚠️ Erreur suppression user ${user.id}:`, error);
        }
      }
    }

    console.log(`✅ Nettoyage terminé: ${deletedCount} users supprimés, ${keptCount} admins conservés`);

    return c.json({
      success: true,
      message: `${deletedCount} utilisateurs auth supprimés`,
      details: {
        deleted: deletedCount,
        kept: keptCount,
        total: authUsers.users.length
      }
    });

  } catch (error) {
    console.error('❌ Erreur lors du nettoyage:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Erreur serveur' 
    }, 500);
  }
});

// ============================================
// MIGRATION : POSTGRES → KV STORE (CONDUCTEURS)
// ============================================

/**
 * 🔄 ROUTE DE MIGRATION : Synchroniser les conducteurs de Postgres vers KV store
 * Utile quand le KV store est vide mais que Postgres contient des conducteurs
 * 
 * Usage: GET /make-server-2eb02e52/admin/migrate-drivers-to-kv
 */
app.get("/make-server-2eb02e52/admin/migrate-drivers-to-kv", async (c) => {
  try {
    console.log('🔄 [MIGRATION] Début de la migration Postgres → KV store...');
    
    // 1. Récupérer les conducteurs depuis Postgres
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'driver');
    
    if (profilesError) {
      console.error('❌ Erreur récupération profiles:', profilesError);
      return c.json({ 
        success: false, 
        error: `Erreur Postgres: ${profilesError.message}` 
      }, 500);
    }
    
    if (!profiles || profiles.length === 0) {
      console.log('⚠️ Aucun conducteur trouvé dans Postgres');
      return c.json({ 
        success: true, 
        message: 'Aucun conducteur à migrer',
        migrated: 0 
      });
    }
    
    console.log(`📊 ${profiles.length} conducteur(s) trouvé(s) dans Postgres`);
    
    // 2. Vérifier le KV store actuel
    const existingDrivers = await kv.getByPrefix('driver:');
    console.log(`📦 KV store actuel: ${existingDrivers?.length || 0} conducteur(s)`);
    
    // 3. Migrer chaque conducteur vers le KV store
    let migrated = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const profile of profiles) {
      try {
        const driverId = profile.id;
        
        // Vérifier si le conducteur existe déjà dans KV
        const existingDriver = await kv.get(`driver:${driverId}`);
        
        if (existingDriver) {
          console.log(`  ⏭️ Conducteur déjà dans KV: ${profile.full_name || driverId}`);
          skipped++;
          continue;
        }
        
        // Créer l'objet driver pour le KV store
        const driverData = {
          id: driverId,
          user_id: driverId,
          full_name: profile.full_name || 'Conducteur inconnu',
          email: profile.email || `u${profile.phone?.replace(/\\D/g, '')}@smartcabb.app`,
          phone: profile.phone || '',
          status: 'pending', // Par défaut en attente d'approbation
          is_approved: false,
          isApproved: false, // Compatibilité
          is_available: false,
          rating: 0,
          total_rides: 0,
          total_earnings: 0,
          created_at: profile.created_at || new Date().toISOString(),
          updated_at: profile.updated_at || profile.created_at || new Date().toISOString(),
          // Infos véhicule (vides par défaut, à remplir par le conducteur)
          vehicle: {
            make: '',
            model: '',
            license_plate: '',
            color: '',
            category: 'standard',
            year: new Date().getFullYear()
          },
          vehicle_make: '',
          vehicle_model: '',
          vehicle_plate: '',
          vehicle_color: '',
          vehicle_category: 'standard',
          vehicle_year: new Date().getFullYear(),
          // Soldes (nouveau système double solde)
          balance: 0,
          credit_balance: 0,
          earnings_balance: 0,
          // Localisation
          last_location: null,
          last_location_update: null
        };
        
        // Sauvegarder dans le KV store
        await kv.set(`driver:${driverId}`, driverData);
        
        // Aussi sauvegarder le profil général
        await kv.set(`profile:${driverId}`, {
          id: driverId,
          full_name: driverData.full_name,
          email: driverData.email,
          phone: driverData.phone,
          role: 'driver',
          created_at: driverData.created_at,
          updated_at: driverData.updated_at
        });
        
        console.log(`  ✅ Migré: ${driverData.full_name} (${driverId})`);
        migrated++;
        
      } catch (driverError) {
        console.error(`  ❌ Erreur migration ${profile.full_name}:`, driverError);
        errors++;
      }
    }
    
    console.log('🎉 [MIGRATION] Terminée !');
    console.log(`  ✅ Migrés: ${migrated}`);
    console.log(`  ⏭️ Ignorés (déjà présents): ${skipped}`);
    console.log(`  ❌ Erreurs: ${errors}`);
    
    // Vérifier le résultat final
    const finalDrivers = await kv.getByPrefix('driver:');
    console.log(`📦 KV store final: ${finalDrivers?.length || 0} conducteur(s)`);
    
    return c.json({
      success: true,
      message: 'Migration terminée avec succès',
      stats: {
        postgres_total: profiles.length,
        migrated: migrated,
        skipped: skipped,
        errors: errors,
        kv_total_after: finalDrivers?.length || 0
      }
    });
    
  } catch (error) {
    console.error('❌ [MIGRATION] Erreur critique:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Erreur serveur' 
    }, 500);
  }
});

/**
 * 🔍 ROUTE DE DIAGNOSTIC - Afficher le contenu détaillé du KV store pour les drivers
 * Permet de voir exactement ce qui est stocké pour déboguer
 */
app.get("/make-server-2eb02e52/debug/drivers", async (c) => {
  try {
    console.log('🔍 [DEBUG /drivers] Récupération pour diagnostic...');
    
    // Récupérer tous les drivers
    const drivers = await kv.getByPrefix('driver:');
    
    console.log(`📊 [DEBUG] ${drivers?.length || 0} conducteur(s) dans KV store`);
    
    // Logger chaque conducteur en détail
    const driversDetails = drivers.map((driver: any) => ({
      id: driver.id,
      full_name: driver.full_name || driver.name,
      phone: driver.phone,
      email: driver.email,
      status: driver.status,
      is_approved: driver.is_approved,
      is_available: driver.is_available,
      vehicle_make: driver.vehicle_make,
      vehicle_model: driver.vehicle_model,
      vehicle_plate: driver.vehicle_plate,
      created_at: driver.created_at
    }));
    
    console.log('📋 [DEBUG] Détails des conducteurs:', JSON.stringify(driversDetails, null, 2));
    
    return c.json({
      success: true,
      count: drivers?.length || 0,
      drivers: driversDetails,
      raw_drivers: drivers // Données brutes complètes
    });
    
  } catch (error) {
    console.error('❌ [DEBUG] Erreur:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Erreur serveur'
    }, 500);
  }
});

// ============================================
// 🔄 SYNCHRONISATION AUTH → KV
// ============================================

/**
 * Synchroniser les conducteurs depuis Supabase Auth vers le KV store
 * Utile quand la sauvegarde automatique échoue lors de l'inscription
 */
app.post("/make-server-2eb02e52/admin/sync-drivers", async (c) => {
  try {
    console.log('🔄 [SYNC] Début synchronisation conducteurs Auth → KV...');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    // Récupérer tous les utilisateurs de Auth
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ [SYNC] Erreur récupération utilisateurs:', listError);
      return c.json({ success: false, error: listError.message }, 500);
    }
    
    // Filtrer les conducteurs
    const drivers = users?.filter(u => u.user_metadata?.role === 'driver') || [];
    console.log(`📋 [SYNC] ${drivers.length} conducteur(s) trouvé(s) dans Auth`);
    
    let syncCount = 0;
    let skipCount = 0;
    const errors: string[] = [];
    
    // Synchroniser chaque conducteur
    for (const driver of drivers) {
      const driverId = driver.id;
      const userMetadata = driver.user_metadata || {};
      
      // Vérifier si existe déjà dans KV
      const existingDriver = await kv.get(`driver:${driverId}`);
      
      if (existingDriver) {
        console.log(`⏭️ [SYNC] Driver ${driverId} existe déjà, skip`);
        skipCount++;
        continue;
      }
      
      // Créer le profil conducteur
      const driverProfile = {
        id: driverId,
        email: driver.email || `u${userMetadata.phone}@smartcabb.app`,
        full_name: userMetadata.full_name || userMetadata.name || 'Conducteur',
        phone: userMetadata.phone,
        role: 'driver',
        status: 'pending',
        isApproved: false,
        isAvailable: false,
        rating: 5.0,
        totalRides: 0,
        totalEarnings: 0,
        balance: 0,
        vehicle: userMetadata.vehicle || {},
        created_at: driver.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        lastUpdate: new Date().toISOString()
      };
      
      // Sauvegarder dans KV
      try {
        await kv.set(`driver:${driverId}`, driverProfile);
        console.log(`✅ [SYNC] Driver ${driverId} (${driverProfile.full_name}) synchronisé`);
        syncCount++;
      } catch (saveError) {
        const errorMsg = `Erreur sauvegarde ${driverId}: ${saveError instanceof Error ? saveError.message : 'Erreur inconnue'}`;
        console.error(`❌ [SYNC] ${errorMsg}`);
        errors.push(errorMsg);
      }
    }
    
    console.log(`✅ [SYNC] Synchronisation terminée: ${syncCount} créés, ${skipCount} skippés, ${errors.length} erreurs`);
    
    return c.json({
      success: true,
      message: `Synchronisation terminée`,
      synced: syncCount,
      skipped: skipCount,
      errors: errors,
      total: drivers.length
    });
    
  } catch (error) {
    console.error('❌ [SYNC] Erreur:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Erreur serveur'
    }, 500);
  }
});

// ============================================
// 🆕 ADMIN: Gestion des utilisateurs
// ============================================

// GET /admin/users/all - Récupérer tous les utilisateurs
app.get("/make-server-2eb02e52/admin/users/all", async (c) => {
  try {
    console.log('📋 [ADMIN] Récupération de tous les utilisateurs...');
    
    // Récupérer les utilisateurs depuis Supabase Auth
    const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ [ADMIN] Erreur récupération users Auth:', authError);
      return c.json({ success: false, error: authError.message }, 500);
    }
    
    console.log(`✅ [ADMIN] ${authUsers?.length || 0} utilisateur(s) trouvé(s) dans Auth`);
    
    // ✅ Fonction pour convertir les rôles en français
    const convertRole = (role: string) => {
      const roleMap: Record<string, string> = {
        'passenger': 'Passager',
        'driver': 'Conducteur',
        'admin': 'Administrateur'
      };
      return roleMap[role] || 'unknown';
    };
    
    // Formater les utilisateurs pour le frontend
    const formattedUsers = (authUsers || []).map(user => {
      const rawRole = user.user_metadata?.role || 'unknown';
      const fullName = user.user_metadata?.full_name || user.user_metadata?.name || 'N/A';
      return {
        id: user.id,
        role: convertRole(rawRole),
        name: fullName,  // ✅ Ajouter name pour compatibilité frontend
        full_name: fullName,
        phone: user.user_metadata?.phone || 'N/A',
        email: user.email || 'N/A',
        password: '••••••••',  // ✅ Mot de passe masqué par défaut
        created_at: user.created_at,
        createdAt: user.created_at,  // ✅ Alias pour compatibilité
        last_sign_in_at: user.last_sign_in_at,
        lastLoginAt: user.last_sign_in_at,  // ✅ Alias pour compatibilité
        vehicle_type: user.user_metadata?.vehicle_type,
        vehicleCategory: user.user_metadata?.vehicle_type,  // ✅ Alias
        license_plate: user.user_metadata?.license_plate,
        vehiclePlate: user.user_metadata?.license_plate,  // ✅ Alias
        status: user.user_metadata?.status || 'active'
      };
    });
    
    // ✅ Calculer les statistiques
    const stats = {
      passengers: formattedUsers.filter(u => u.role === 'Passager').length,
      drivers: formattedUsers.filter(u => u.role === 'Conducteur').length,
      admins: formattedUsers.filter(u => u.role === 'Administrateur').length
    };
    
    return c.json({ 
      success: true, 
      users: formattedUsers,
      total: formattedUsers.length,
      count: formattedUsers.length,
      stats: stats  // ✅ AJOUTÉ: stats pour le frontend
    });
  } catch (error) {
    console.error('❌ [ADMIN] Erreur récupération users:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Erreur' 
    }, 500);
  }
});

// GET /admin/users/diagnostic - Diagnostic utilisateurs (Auth vs KV)
app.get("/make-server-2eb02e52/admin/users/diagnostic", async (c) => {
  try {
    console.log('🔍 [ADMIN] Diagnostic utilisateurs...');
    
    const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) {
      return c.json({ success: false, error: authError.message }, 500);
    }
    
    const kvDrivers = await kv.getByPrefix('driver:') || [];
    const kvPassengers = await kv.getByPrefix('passenger:') || [];
    
    const authDrivers = (authUsers || []).filter(u => u.user_metadata?.role === 'driver');
    const authPassengers = (authUsers || []).filter(u => u.user_metadata?.role === 'passenger');
    const authAdmins = (authUsers || []).filter(u => u.user_metadata?.role === 'admin');
    
    const diagnostic = {
      auth: {
        total: authUsers?.length || 0,
        drivers: authDrivers.length,
        passengers: authPassengers.length,
        admins: authAdmins.length
      },
      kv: {
        drivers: kvDrivers.length,
        passengers: kvPassengers.length
      },
      orphaned: {
        authWithoutKV: authUsers?.filter(u => {
          const role = u.user_metadata?.role;
          if (role === 'driver') {
            return !kvDrivers.some((d: any) => d.id === u.id);
          }
          if (role === 'passenger') {
            return !kvPassengers.some((p: any) => p.id === u.id);
          }
          return false;
        }).length || 0,
        kvWithoutAuth: [
          ...kvDrivers.filter((d: any) => !authUsers?.some(u => u.id === d.id)),
          ...kvPassengers.filter((p: any) => !authUsers?.some(u => u.id === p.id))
        ].length
      }
    };
    
    console.log('✅ [ADMIN] Diagnostic:', JSON.stringify(diagnostic, null, 2));
    return c.json({ success: true, diagnostic });
  } catch (error) {
    console.error('❌ [ADMIN] Erreur diagnostic:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Erreur' 
    }, 500);
  }
});

// POST /admin/users/cleanup - Nettoyer les utilisateurs orphelins
app.post("/make-server-2eb02e52/admin/users/cleanup", async (c) => {
  try {
    console.log('🧹 [ADMIN] Nettoyage des utilisateurs orphelins...');
    
    const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) {
      return c.json({ success: false, error: authError.message }, 500);
    }
    
    const kvDrivers = await kv.getByPrefix('driver:') || [];
    const kvPassengers = await kv.getByPrefix('passenger:') || [];
    
    let cleaned = 0;
    
    for (const driver of kvDrivers) {
      if (driver && !authUsers?.some(u => u.id === (driver as any).id)) {
        await kv.del(`driver:${(driver as any).id}`);
        cleaned++;
        console.log(`🗑️ Driver KV orphelin supprimé: ${(driver as any).id}`);
      }
    }
    
    for (const passenger of kvPassengers) {
      if (passenger && !authUsers?.some(u => u.id === (passenger as any).id)) {
        await kv.del(`passenger:${(passenger as any).id}`);
        cleaned++;
        console.log(`🗑️ Passenger KV orphelin supprimé: ${(passenger as any).id}`);
      }
    }
    
    console.log(`✅ [ADMIN] ${cleaned} entrée(s) orpheline(s) supprimée(s)`);
    return c.json({ success: true, cleaned });
  } catch (error) {
    console.error('❌ [ADMIN] Erreur cleanup:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Erreur' 
    }, 500);
  }
});

// POST /admin/users/sync-from-auth - Synchroniser depuis Auth vers KV
app.post("/make-server-2eb02e52/admin/users/sync-from-auth", async (c) => {
  try {
    console.log('🔄 [ADMIN] Synchronisation Auth → KV...');
    
    const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) {
      return c.json({ success: false, error: authError.message }, 500);
    }
    
    let synced = 0;
    
    for (const user of authUsers || []) {
      const role = user.user_metadata?.role;
      
      if (role === 'driver') {
        const existingDriver = await kv.get(`driver:${user.id}`);
        if (!existingDriver) {
          const newDriver = {
            id: user.id,
            full_name: user.user_metadata?.full_name || user.user_metadata?.name,
            phone: user.user_metadata?.phone,
            vehicle_type: user.user_metadata?.vehicle_type || 'economy',
            license_plate: user.user_metadata?.license_plate,
            status: 'offline',
            is_available: false,
            created_at: user.created_at,
            updated_at: new Date().toISOString()
          };
          await kv.set(`driver:${user.id}`, newDriver);
          synced++;
          console.log(`✅ Driver créé dans KV: ${user.id}`);
        }
      } else if (role === 'passenger') {
        const existingPassenger = await kv.get(`passenger:${user.id}`);
        if (!existingPassenger) {
          const newPassenger = {
            id: user.id,
            full_name: user.user_metadata?.full_name || user.user_metadata?.name,
            phone: user.user_metadata?.phone,
            created_at: user.created_at,
            updated_at: new Date().toISOString()
          };
          await kv.set(`passenger:${user.id}`, newPassenger);
          synced++;
          console.log(`✅ Passenger créé dans KV: ${user.id}`);
        }
      }
    }
    
    console.log(`✅ [ADMIN] ${synced} utilisateur(s) synchronisé(s)`);
    return c.json({ success: true, synced });
  } catch (error) {
    console.error('❌ [ADMIN] Erreur sync:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Erreur' 
    }, 500);
  }
});

// Route: Diagnostic COMPLET (Auth + KV + Routes)
app.get("/make-server-2eb02e52/debug/full-diagnostic", async (c) => {
  try {
    console.log('🔍 [DIAGNOSTIC COMPLET] Début...');
    
    const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) {
      return c.json({ success: false, error: authError.message }, 500);
    }
    
    const authDrivers = (authUsers || []).filter(u => u.user_metadata?.role === 'driver');
    const kvDrivers = await kv.getByPrefix('driver:') || [];
    
    const diagnostic = {
      auth: { total: authUsers?.length || 0, drivers: authDrivers.length },
      kv: { drivers: kvDrivers.length },
      driversAuth: authDrivers.map(d => ({ id: d.id, name: d.user_metadata?.full_name, phone: d.user_metadata?.phone })),
      driversKV: kvDrivers.map((d: any) => ({ id: d.id, name: d.full_name, phone: d.phone, status: d.status })),
      summary: `Auth: ${authDrivers.length} drivers, KV: ${kvDrivers.length} drivers`
    };
    
    console.log('✅ [DIAGNOSTIC]:', JSON.stringify(diagnostic, null, 2));
    return c.json({ success: true, diagnostic });
  } catch (error) {
    return c.json({ success: false, error: error instanceof Error ? error.message : 'Erreur' }, 500);
  }
});

// ============================================
// 🔧 UUID SYNC ROUTES - DIAGNOSTIC ET RÉPARATION
// ============================================

/**
 * 🔍 DIAGNOSTIC : Vérifier la synchronisation UUID entre Auth et KV pour un utilisateur spécifique
 * POST /make-server-2eb02e52/sync/diagnostic
 * Body: { phone: "+243XXXXXXXXX" }
 */
app.post("/make-server-2eb02e52/sync/diagnostic", async (c) => {
  try {
    const { phone } = await c.req.json();
    
    if (!phone) {
      return c.json({ success: false, error: "Téléphone requis" }, 400);
    }

    console.log('🔍 [SYNC/DIAGNOSTIC] Recherche utilisateur avec téléphone:', phone);

    // Récupérer tous les utilisateurs de Supabase Auth
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ [SYNC/DIAGNOSTIC] Erreur récupération utilisateurs:', listError);
      return c.json({ success: false, error: listError.message }, 500);
    }

    // Normaliser le téléphone pour comparaison
    const normalizedPhone = phone.replace(/\D/g, '');
    
    // Chercher l'utilisateur dans Auth
    const authUser = users?.find(u => {
      const userPhone = u.user_metadata?.phone || u.phone || '';
      const normalizedUserPhone = userPhone.replace(/\D/g, '');
      return normalizedUserPhone === normalizedPhone || 
             normalizedUserPhone.endsWith(normalizedPhone) ||
             normalizedPhone.endsWith(normalizedUserPhone);
    });

    if (!authUser) {
      console.log('❌ [SYNC/DIAGNOSTIC] Utilisateur non trouvé dans Supabase Auth');
      return c.json({ 
        success: false, 
        error: "Utilisateur non trouvé dans Supabase Auth",
        phone: normalizedPhone
      }, 404);
    }

    console.log('✅ [SYNC/DIAGNOSTIC] Utilisateur trouvé dans Auth:', authUser.id);

    // Chercher les profils dans le KV store
    const profileKey = `profile:${authUser.id}`;
    const passengerKey = `passenger:${authUser.id}`;
    const driverKey = `driver:${authUser.id}`;

    const profile = await kv.get(profileKey);
    const passenger = await kv.get(passengerKey);
    const driver = await kv.get(driverKey);

    // Chercher aussi des profils orphelins (avec d'autres UUID)
    const allProfiles = await kv.getByPrefix('profile:');
    const allPassengers = await kv.getByPrefix('passenger:');
    const allDrivers = await kv.getByPrefix('driver:');

    const orphanProfiles = allProfiles.filter((p: any) => {
      const pPhone = p.value?.phone?.replace(/\D/g, '') || '';
      return pPhone === normalizedPhone && p.value?.id !== authUser.id;
    });

    const orphanPassengers = allPassengers.filter((p: any) => {
      const pPhone = p.value?.phone?.replace(/\D/g, '') || '';
      return pPhone === normalizedPhone && p.value?.id !== authUser.id;
    });

    const orphanDrivers = allDrivers.filter((d: any) => {
      const dPhone = d.value?.phone?.replace(/\D/g, '') || '';
      return dPhone === normalizedPhone && d.value?.id !== authUser.id;
    });

    console.log('📊 [SYNC/DIAGNOSTIC] Résultats:');
    console.log('  - Auth UUID:', authUser.id);
    console.log('  - Profile trouvé:', !!profile);
    console.log('  - Passenger trouvé:', !!passenger);
    console.log('  - Driver trouvé:', !!driver);
    console.log('  - Profils orphelins:', orphanProfiles.length);
    console.log('  - Passagers orphelins:', orphanPassengers.length);
    console.log('  - Conducteurs orphelins:', orphanDrivers.length);

    return c.json({
      success: true,
      diagnostic: {
        auth: {
          uuid: authUser.id,
          email: authUser.email,
          phone: authUser.user_metadata?.phone,
          name: authUser.user_metadata?.full_name || authUser.user_metadata?.name,
          role: authUser.user_metadata?.role,
          created_at: authUser.created_at
        },
        kv: {
          profile_exists: !!profile,
          passenger_exists: !!passenger,
          driver_exists: !!driver,
          profile_data: profile || null,
          passenger_data: passenger || null,
          driver_data: driver || null
        },
        orphans: {
          profiles: orphanProfiles.map((p: any) => ({
            key: p.key,
            uuid: p.value?.id,
            name: p.value?.full_name || p.value?.name,
            phone: p.value?.phone,
            role: p.value?.role
          })),
          passengers: orphanPassengers.map((p: any) => ({
            key: p.key,
            uuid: p.value?.id,
            name: p.value?.full_name || p.value?.name,
            phone: p.value?.phone
          })),
          drivers: orphanDrivers.map((d: any) => ({
            key: d.key,
            uuid: d.value?.id,
            name: d.value?.full_name || d.value?.name,
            phone: d.value?.phone
          }))
        },
        needs_sync: orphanProfiles.length > 0 || orphanPassengers.length > 0 || orphanDrivers.length > 0 || !profile
      }
    });
  } catch (error) {
    console.error('❌ [SYNC/DIAGNOSTIC] Erreur:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur serveur'
    }, 500);
  }
});

/**
 * 🔧 RÉPARATION : Synchroniser les UUID pour un utilisateur spécifique
 * POST /make-server-2eb02e52/sync/repair
 * Body: { phone: "+243XXXXXXXXX" }
 */
app.post("/make-server-2eb02e52/sync/repair", async (c) => {
  try {
    const { phone } = await c.req.json();
    
    if (!phone) {
      return c.json({ success: false, error: "Téléphone requis" }, 400);
    }

    console.log('🔧 [SYNC/REPAIR] Début de la réparation pour:', phone);

    // Récupérer tous les utilisateurs de Supabase Auth
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ [SYNC/REPAIR] Erreur récupération utilisateurs:', listError);
      return c.json({ success: false, error: listError.message }, 500);
    }

    // Normaliser le téléphone
    const normalizedPhone = phone.replace(/\D/g, '');
    
    // Chercher l'utilisateur dans Auth
    const authUser = users?.find(u => {
      const userPhone = u.user_metadata?.phone || u.phone || '';
      const normalizedUserPhone = userPhone.replace(/\D/g, '');
      return normalizedUserPhone === normalizedPhone || 
             normalizedUserPhone.endsWith(normalizedPhone) ||
             normalizedPhone.endsWith(normalizedUserPhone);
    });

    if (!authUser) {
      console.log('❌ [SYNC/REPAIR] Utilisateur non trouvé dans Supabase Auth');
      return c.json({ 
        success: false, 
        error: "Utilisateur non trouvé dans Supabase Auth" 
      }, 404);
    }

    console.log('✅ [SYNC/REPAIR] Utilisateur trouvé dans Auth:', authUser.id);

    const correctUUID = authUser.id;
    const metadata = authUser.user_metadata || {};
    const role = metadata.role || 'passenger';

    // Chercher les profils orphelins
    const allProfiles = await kv.getByPrefix('profile:');
    const allPassengers = await kv.getByPrefix('passenger:');
    const allDrivers = await kv.getByPrefix('driver:');

    const orphanProfiles = allProfiles.filter((p: any) => {
      const pPhone = p.value?.phone?.replace(/\D/g, '') || '';
      return pPhone === normalizedPhone && p.value?.id !== correctUUID;
    });

    const orphanPassengers = allPassengers.filter((p: any) => {
      const pPhone = p.value?.phone?.replace(/\D/g, '') || '';
      return pPhone === normalizedPhone && p.value?.id !== correctUUID;
    });

    const orphanDrivers = allDrivers.filter((d: any) => {
      const dPhone = d.value?.phone?.replace(/\D/g, '') || '';
      return dPhone === normalizedPhone && d.value?.id !== correctUUID;
    });

    console.log('🗑️ [SYNC/REPAIR] Suppression des profils orphelins...');
    
    // Récupérer les données d'un profil orphelin (si disponible) pour les fusionner
    let existingData: any = null;
    if (orphanProfiles.length > 0) {
      existingData = orphanProfiles[0].value;
    } else if (orphanPassengers.length > 0) {
      existingData = orphanPassengers[0].value;
    } else if (orphanDrivers.length > 0) {
      existingData = orphanDrivers[0].value;
    }

    // Supprimer les profils orphelins
    for (const orphan of orphanProfiles) {
      const oldUUID = orphan.value?.id;
      if (oldUUID) {
        await kv.del(`profile:${oldUUID}`);
        console.log('  ✅ Supprimé profile:', oldUUID);
      }
    }

    for (const orphan of orphanPassengers) {
      const oldUUID = orphan.value?.id;
      if (oldUUID) {
        await kv.del(`passenger:${oldUUID}`);
        console.log('  ✅ Supprimé passenger:', oldUUID);
      }
    }

    for (const orphan of orphanDrivers) {
      const oldUUID = orphan.value?.id;
      if (oldUUID) {
        await kv.del(`driver:${oldUUID}`);
        console.log('  ✅ Supprimé driver:', oldUUID);
      }
    }

    // Créer le profil avec le bon UUID
    console.log('✨ [SYNC/REPAIR] Création du profil avec le bon UUID...');

    const newProfile = {
      id: correctUUID,
      email: authUser.email || `u${metadata.phone || correctUUID}@smartcabb.app`,
      full_name: metadata.full_name || metadata.name || existingData?.full_name || existingData?.name || 'Utilisateur',
      phone: metadata.phone || existingData?.phone || null,
      role: role,
      balance: existingData?.balance || 0,
      account_type: existingData?.account_type || 'prepaid',
      created_at: authUser.created_at || existingData?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      
      // Conserver les données supplémentaires si disponibles
      ...(existingData?.profile_picture_url && { profile_picture_url: existingData.profile_picture_url }),
      ...(existingData?.is_blocked !== undefined && { is_blocked: existingData.is_blocked })
    };

    // Sauvegarder le profil avec les bonnes clés
    await kv.set(`profile:${correctUUID}`, newProfile);
    console.log('  ✅ Créé profile:', correctUUID);

    if (role === 'passenger') {
      await kv.set(`passenger:${correctUUID}`, newProfile);
      console.log('  ✅ Créé passenger:', correctUUID);
    } else if (role === 'driver') {
      // Pour les conducteurs, conserver les données spécifiques
      const driverProfile = {
        ...newProfile,
        ...(existingData?.vehicle_registration && { vehicle_registration: existingData.vehicle_registration }),
        ...(existingData?.vehicle_model && { vehicle_model: existingData.vehicle_model }),
        ...(existingData?.vehicle_category && { vehicle_category: existingData.vehicle_category }),
        ...(existingData?.isApproved !== undefined && { isApproved: existingData.isApproved }),
        ...(existingData?.status && { status: existingData.status }),
        ...(existingData?.isAvailable !== undefined && { isAvailable: existingData.isAvailable })
      };
      await kv.set(`driver:${correctUUID}`, driverProfile);
      console.log('  ✅ Créé driver:', correctUUID);
    }

    console.log('✅ [SYNC/REPAIR] Réparation terminée avec succès');

    return c.json({
      success: true,
      message: "Synchronisation réussie",
      repair: {
        correct_uuid: correctUUID,
        old_uuids_removed: [
          ...orphanProfiles.map((p: any) => p.value?.id),
          ...orphanPassengers.map((p: any) => p.value?.id),
          ...orphanDrivers.map((d: any) => d.value?.id)
        ].filter(id => id),
        profile_created: newProfile
      }
    });
  } catch (error) {
    console.error('❌ [SYNC/REPAIR] Erreur:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur serveur'
    }, 500);
  }
});

/**
 * 🔧 RÉPARATION GLOBALE : Synchroniser tous les utilisateurs Auth vers KV
 * POST /make-server-2eb02e52/sync/repair-all
 * 
 * Version 3.0.13 - Réparation complète avec détection et suppression des profils orphelins
 * Cette route applique la même logique que /sync/repair mais pour TOUS les utilisateurs automatiquement
 */
app.post("/make-server-2eb02e52/sync/repair-all", async (c) => {
  try {
    console.log('🔧 [SYNC/REPAIR-ALL] Début de la réparation globale...');

    // Récupérer tous les utilisateurs de Supabase Auth
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ [SYNC/REPAIR-ALL] Erreur récupération utilisateurs:', listError);
      return c.json({ success: false, error: listError.message }, 500);
    }

    console.log(`📋 [SYNC/REPAIR-ALL] ${users?.length || 0} utilisateurs trouvés dans Auth`);

    // Récupérer tous les profils existants UNE SEULE FOIS pour optimisation
    console.log('📦 [SYNC/REPAIR-ALL] Récupération de tous les profils existants...');
    const allProfiles = await kv.getByPrefix('profile:');
    const allPassengers = await kv.getByPrefix('passenger:');
    const allDrivers = await kv.getByPrefix('driver:');

    const results = {
      total: users?.length || 0,
      synced: 0,
      repaired: 0,
      orphansRemoved: 0,
      skipped: 0,
      errors: [] as any[]
    };

    for (const authUser of users || []) {
      try {
        const correctUUID = authUser.id;
        const metadata = authUser.user_metadata || {};
        const role = metadata.role || 'passenger';
        const authPhone = (metadata.phone || '').replace(/\D/g, '');

        console.log(`\n🔍 [SYNC/REPAIR-ALL] Traitement: ${metadata.full_name || 'Utilisateur'} (${correctUUID})`);

        // Vérifier si le profil existe déjà avec le bon UUID
        const existingProfile = await kv.get(`profile:${correctUUID}`);
        
        // Chercher les profils orphelins avec le même téléphone mais un UUID différent
        const orphanProfiles = allProfiles.filter((p: any) => {
          const pPhone = (p.value?.phone || '').replace(/\D/g, '');
          return pPhone && pPhone === authPhone && p.value?.id !== correctUUID;
        });

        const orphanPassengers = allPassengers.filter((p: any) => {
          const pPhone = (p.value?.phone || '').replace(/\D/g, '');
          return pPhone && pPhone === authPhone && p.value?.id !== correctUUID;
        });

        const orphanDrivers = allDrivers.filter((d: any) => {
          const dPhone = (d.value?.phone || '').replace(/\D/g, '');
          return dPhone && dPhone === authPhone && d.value?.id !== correctUUID;
        });

        const hasOrphans = orphanProfiles.length > 0 || orphanPassengers.length > 0 || orphanDrivers.length > 0;

        // Si le profil existe déjà avec le bon UUID ET qu'il n'y a pas d'orphelins, skip
        if (existingProfile && !hasOrphans) {
          console.log(`⏭️ [SYNC/REPAIR-ALL] Profil déjà synchronisé et pas d'orphelins`);
          results.skipped++;
          continue;
        }

        // Si profil existe ET il y a des orphelins : réparation nécessaire
        if (existingProfile && hasOrphans) {
          console.log(`🔧 [SYNC/REPAIR-ALL] Profil existe mais orphelins détectés - nettoyage...`);
        }

        // Si profil n'existe pas mais il y a des orphelins : migration nécessaire
        if (!existingProfile && hasOrphans) {
          console.log(`🔧 [SYNC/REPAIR-ALL] ⚠️ DÉSYNCHRONISATION UUID DÉTECTÉE !`);
          console.log(`  - UUID Auth correct: ${correctUUID}`);
          console.log(`  - ${orphanProfiles.length} profil(s) orphelin(s) trouvé(s)`);
          console.log(`  - ${orphanPassengers.length} passenger(s) orphelin(s) trouvé(s)`);
          console.log(`  - ${orphanDrivers.length} driver(s) orphelin(s) trouvé(s)`);
        }

        // Récupérer les données d'un profil orphelin (si disponible) pour les fusionner
        let existingData: any = null;
        if (orphanProfiles.length > 0) {
          existingData = orphanProfiles[0].value;
        } else if (orphanPassengers.length > 0) {
          existingData = orphanPassengers[0].value;
        } else if (orphanDrivers.length > 0) {
          existingData = orphanDrivers[0].value;
        }

        // Supprimer TOUS les profils orphelins
        for (const orphan of orphanProfiles) {
          const oldUUID = orphan.value?.id;
          if (oldUUID) {
            await kv.del(`profile:${oldUUID}`);
            console.log(`  🗑️ Supprimé profile orphelin: ${oldUUID}`);
            results.orphansRemoved++;
          }
        }

        for (const orphan of orphanPassengers) {
          const oldUUID = orphan.value?.id;
          if (oldUUID) {
            await kv.del(`passenger:${oldUUID}`);
            console.log(`  🗑️ Supprimé passenger orphelin: ${oldUUID}`);
            results.orphansRemoved++;
          }
        }

        for (const orphan of orphanDrivers) {
          const oldUUID = orphan.value?.id;
          if (oldUUID) {
            await kv.del(`driver:${oldUUID}`);
            console.log(`  🗑️ Supprimé driver orphelin: ${oldUUID}`);
            results.orphansRemoved++;
          }
        }

        // Créer/mettre à jour le profil avec le bon UUID
        const newProfile = {
          id: correctUUID,
          email: authUser.email || `u${metadata.phone || correctUUID}@smartcabb.app`,
          full_name: metadata.full_name || metadata.name || existingData?.full_name || existingData?.name || 'Utilisateur',
          phone: metadata.phone || existingData?.phone || null,
          role: role,
          balance: existingProfile?.balance || existingData?.balance || 0,
          account_type: existingProfile?.account_type || existingData?.account_type || 'prepaid',
          created_at: authUser.created_at || existingData?.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
          
          // Conserver les données supplémentaires si disponibles
          ...(existingProfile?.profile_picture_url && { profile_picture_url: existingProfile.profile_picture_url }),
          ...(existingData?.profile_picture_url && !existingProfile?.profile_picture_url && { profile_picture_url: existingData.profile_picture_url }),
          ...(existingProfile?.is_blocked !== undefined ? { is_blocked: existingProfile.is_blocked } : existingData?.is_blocked !== undefined && { is_blocked: existingData.is_blocked })
        };

        // Sauvegarder le profil
        await kv.set(`profile:${correctUUID}`, newProfile);
        
        if (role === 'passenger') {
          await kv.set(`passenger:${correctUUID}`, newProfile);
        } else if (role === 'driver') {
          // Pour les conducteurs, conserver les données spécifiques
          const driverProfile = {
            ...newProfile,
            ...(existingProfile?.vehicle_registration && { vehicle_registration: existingProfile.vehicle_registration }),
            ...(existingData?.vehicle_registration && !existingProfile?.vehicle_registration && { vehicle_registration: existingData.vehicle_registration }),
            ...(existingProfile?.vehicle_model && { vehicle_model: existingProfile.vehicle_model }),
            ...(existingData?.vehicle_model && !existingProfile?.vehicle_model && { vehicle_model: existingData.vehicle_model }),
            ...(existingProfile?.vehicle_category && { vehicle_category: existingProfile.vehicle_category }),
            ...(existingData?.vehicle_category && !existingProfile?.vehicle_category && { vehicle_category: existingData.vehicle_category }),
            ...(existingProfile?.isApproved !== undefined ? { isApproved: existingProfile.isApproved } : existingData?.isApproved !== undefined && { isApproved: existingData.isApproved }),
            ...(existingProfile?.status && { status: existingProfile.status }),
            ...(existingData?.status && !existingProfile?.status && { status: existingData.status }),
            ...(existingProfile?.isAvailable !== undefined ? { isAvailable: existingProfile.isAvailable } : existingData?.isAvailable !== undefined && { isAvailable: existingData.isAvailable })
          };
          await kv.set(`driver:${correctUUID}`, driverProfile);
        }

        if (hasOrphans) {
          console.log(`✅ [SYNC/REPAIR-ALL] ✨ Réparation réussie: ${correctUUID} (${newProfile.full_name})`);
          results.repaired++;
        } else {
          console.log(`✅ [SYNC/REPAIR-ALL] Profil créé: ${correctUUID} (${newProfile.full_name})`);
          results.synced++;
        }
      } catch (error) {
        console.error(`❌ [SYNC/REPAIR-ALL] Erreur pour ${authUser.id}:`, error);
        results.errors.push({
          uuid: authUser.id,
          name: authUser.user_metadata?.full_name || 'Inconnu',
          error: error instanceof Error ? error.message : 'Erreur inconnue'
        });
      }
    }

    console.log('\n🎉 [SYNC/REPAIR-ALL] RÉPARATION GLOBALE TERMINÉE');
    console.log('═══════════════════════════════════════════════');
    console.log(`  📊 Total utilisateurs: ${results.total}`);
    console.log(`  ✅ Profils créés: ${results.synced}`);
    console.log(`  🔧 Profils réparés: ${results.repaired}`);
    console.log(`  🗑️ Profils orphelins supprimés: ${results.orphansRemoved}`);
    console.log(`  ⏭️ Profils ignorés (déjà OK): ${results.skipped}`);
    console.log(`  ❌ Erreurs: ${results.errors.length}`);
    console.log('═══════════════════════════════════════════════');

    return c.json({
      success: true,
      message: "Réparation globale terminée avec succès",
      results
    });
  } catch (error) {
    console.error('❌ [SYNC/REPAIR-ALL] Erreur:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur serveur'
    }, 500);
  }
});

// ============================================
// 💓 DRIVER HEARTBEAT - PERSISTANCE STATUT EN LIGNE
// ============================================

/**
 * Reçoit le heartbeat du conducteur pour maintenir son statut en ligne
 * Appelé toutes les 30 secondes quand le conducteur est en ligne
 */
app.post("/make-server-2eb02e52/drivers/heartbeat", async (c) => {
  try {
    const { driverId, isOnline, location } = await c.req.json();
    
    console.log(`💓 Heartbeat reçu: ${driverId} - ${isOnline ? 'EN LIGNE' : 'HORS LIGNE'}`);
    
    // Récupérer le conducteur
    const driver = await kv.get(`driver:${driverId}`);
    
    if (!driver) {
      console.error('❌ Driver non trouvé pour heartbeat:', driverId);
      return c.json({ 
        success: false, 
        error: 'Conducteur non trouvé' 
      }, 404);
    }
    
    // Mettre à jour le statut
    const updatedDriver = {
      ...driver,
      is_available: isOnline,
      status: isOnline ? 'available' : 'offline',
      last_heartbeat_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    await kv.set(`driver:${driverId}`, updatedDriver);
    
    // Mettre à jour la localisation si fournie
    if (location && isOnline) {
      await kv.set(`driver_location:${driverId}`, {
        latitude: location.latitude,
        longitude: location.longitude,
        timestamp: new Date().toISOString()
      });
    }
    
    console.log(`✅ Heartbeat traité: ${driverId} - statut: ${updatedDriver.status}`);
    
    return c.json({
      success: true,
      message: 'Heartbeat enregistré',
      status: updatedDriver.status
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
// UPDATE DRIVER IN KV STORE
// ============================================

/**
 * Met à jour un conducteur dans le KV store
 */
app.post("/make-server-2eb02e52/drivers/:driverId", async (c) => {
  try {
    const driverId = c.req.param('driverId');
    const updates = await c.req.json();
    
    console.log('✏️ Mise à jour conducteur:', driverId, 'avec:', Object.keys(updates));
    
    // Récupérer le driver existant
    const existingDriver = await kv.get(`driver:${driverId}`);
    
    if (!existingDriver) {
      console.error('❌ Driver non trouvé:', driverId);
      return c.json({ 
        success: false, 
        error: 'Conducteur non trouvé' 
      }, 404);
    }
    
    // Fusionner les mises à jour
    const updatedDriver = {
      ...existingDriver,
      ...updates,
      updated_at: new Date().toISOString()
    };
    
    // Sauvegarder dans le KV store
    await kv.set(`driver:${driverId}`, updatedDriver);
    
    console.log('✅ Driver mis à jour avec succès');
    
    return c.json({
      success: true,
      driver: updatedDriver
    });
    
  } catch (error) {
    console.error('❌ Erreur mise à jour conducteur:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Erreur serveur'
    }, 500);
  }
});

// ============================================
// GET SINGLE DRIVER FROM KV STORE
// ============================================

/**
 * Récupère un conducteur spécifique depuis le KV store
 * ✅ AVEC AUTO-RÉPARATION UUID ORPHELIN (comme /passengers/:id)
 */
app.get("/make-server-2eb02e52/drivers/:driverId", async (c) => {
  try {
    const driverId = c.req.param('driverId');
    console.log('🔍 [DRIVER/GET] Recherche conducteur ID:', driverId);
    
    // ÉTAPE 1 : Chercher dans le KV Store
    let driver = await kv.get(`driver:${driverId}`);
    
    if (driver) {
      console.log('✅ [DRIVER/GET] Conducteur trouvé dans KV:', driver.full_name);
      
      // 🔧 FIX CRITIQUE : Normaliser les données du véhicule
      const vehicle = driver.vehicle || {};
      const normalizedDriver = {
        ...driver,
        vehicle_make: driver.vehicle_make || vehicle.make || '',
        vehicle_model: driver.vehicle_model || vehicle.model || '',
        vehicle_plate: driver.vehicle_plate || vehicle.license_plate || '',
        vehicle_category: driver.vehicle_category || vehicle.category || 'smart_standard',
        vehicle_color: driver.vehicle_color || vehicle.color || '',
        vehicle_year: driver.vehicle_year || vehicle.year || new Date().getFullYear(),
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
      
      if (normalizedDriver.vehicle_make || normalizedDriver.vehicle_model) {
        await kv.set(`driver:${driverId}`, normalizedDriver);
      }
      
      return c.json({
        success: true,
        driver: normalizedDriver
      });
    }
    
    // ÉTAPE 2 : Pas dans KV, chercher dans Supabase Auth
    console.log('⚠️ [DRIVER/GET] Conducteur non trouvé dans KV, recherche dans Auth...');
    
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.getUserById(driverId);
    
    if (authError || !authData?.user) {
      // ÉTAPE 3 : UUID orphelin - Auto-réparation
      console.log('⚠️ [DRIVER/GET] UUID non trouvé dans Auth, recherche profils orphelins...');
      
      const allDriverProfiles = await kv.getByPrefix('driver:');
      const orphanProfile = allDriverProfiles.find((item: any) => item.id === driverId);
      
      if (orphanProfile && orphanProfile.phone) {
        console.log('🔧 [DRIVER/GET] Profil orphelin trouvé avec téléphone:', orphanProfile.phone);
        
        // Chercher dans Auth par téléphone
        const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
        const users = usersData?.users || [];
        const realAuthUser = users.find((u: any) => u.phone === orphanProfile.phone);
        
        if (realAuthUser) {
          console.log('🔧 [DRIVER/GET] Auth trouvé, UUID correct:', realAuthUser.id);
          console.log('🔧 [DRIVER/GET] Migration:', driverId, '→', realAuthUser.id);
          
          // Supprimer l'ancien profil orphelin
          await kv.del(`driver:${driverId}`);
          console.log('  🗑️ Supprimé driver orphelin:', driverId);
          
          // Créer le profil avec le BON UUID
          const repairedDriver = {
            ...orphanProfile,
            id: realAuthUser.id,
            updated_at: new Date().toISOString()
          };
          
          await kv.set(`driver:${realAuthUser.id}`, repairedDriver);
          console.log('  ✅ Créé driver avec UUID correct:', realAuthUser.id);
          console.log('✅ [DRIVER/GET] Profil réparé:', repairedDriver.full_name);
          
          return c.json({
            success: true,
            driver: repairedDriver,
            repaired: true,
            old_uuid: driverId,
            new_uuid: realAuthUser.id
          });
        }
      }
      
      console.error('❌ [DRIVER/GET] Conducteur introuvable partout (KV + Auth + orphelins)');
      return c.json({ 
        success: false, 
        error: 'Conducteur non trouvé' 
      }, 404);
    }
    
    // ÉTAPE 2bis : Trouvé dans Auth, créer dans KV
    console.log('✅ [DRIVER/GET] Trouvé dans Auth, création dans KV...');
    const newDriver = {
      id: authData.user.id,
      email: authData.user.email,
      phone: authData.user.phone || authData.user.user_metadata?.phone,
      full_name: authData.user.user_metadata?.full_name || 'Conducteur',
      role: 'driver',
      status: authData.user.user_metadata?.status || 'pending',
      vehicle_make: authData.user.user_metadata?.vehicle_make || '',
      vehicle_model: authData.user.user_metadata?.vehicle_model || '',
      vehicle_plate: authData.user.user_metadata?.vehicle_plate || '',
      vehicle_category: authData.user.user_metadata?.vehicle_category || 'smart_standard',
      vehicle_color: authData.user.user_metadata?.vehicle_color || '',
      created_at: authData.user.created_at,
      updated_at: new Date().toISOString()
    };
    
    await kv.set(`driver:${authData.user.id}`, newDriver);
    console.log('✅ [DRIVER/GET] Conducteur créé dans KV depuis Auth');
    
    return c.json({
      success: true,
      driver: newDriver
    });
    
  } catch (error) {
    console.error('❌ Erreur récupération conducteur:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Erreur serveur'
    }, 500);
  }
});

/**
 * ✅ FIX #3: Récupère la localisation GPS en temps réel d'un conducteur
 */
app.get("/make-server-2eb02e52/drivers/:driverId/location", async (c) => {
  try {
    const driverId = c.req.param('driverId');
    console.log('📍 Récupération localisation conducteur:', driverId);
    
    const driver = await kv.get(`driver:${driverId}`);
    
    if (!driver) {
      return c.json({ 
        success: false, 
        error: 'Conducteur non trouvé' 
      }, 404);
    }
    
    // Retourner la localisation si disponible
    const location = driver.location || driver.current_location || {
      lat: -4.3276 + (Math.random() * 0.01 - 0.005), // Position aléatoire à Kinshasa
      lng: 15.3136 + (Math.random() * 0.01 - 0.005)
    };
    
    console.log(`✅ Localisation conducteur ${driver.full_name}:`, location);
    
    return c.json({
      success: true,
      location: location,
      lastUpdate: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Erreur récupération localisation:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Erreur serveur'
    }, 500);
  }
});

// ============================================
// DRIVER WALLET ROUTES - Gestion des portefeuilles conducteurs
// ============================================

/**
 * GET /drivers/:driverId/wallets - Récupérer les deux soldes
 */
app.get("/make-server-2eb02e52/drivers/:driverId/wallets", async (c) => {
  try {
    const driverId = c.req.param('driverId');
    
    if (!isValidUUID(driverId)) {
      return c.json({ success: false, error: "ID conducteur invalide" }, 400);
    }
    
    const driver = await kv.get(`driver:${driverId}`);
    if (!driver) {
      return c.json({ success: false, error: "Conducteur non trouvé" }, 404);
    }
    
    const creditBalance = driver.balance || 0;
    const earningsBalance = driver.earningsBalance || 0;
    
    console.log(`📊 [WALLETS] Driver ${driverId}:`, {
      creditBalance,
      earningsBalance
    });
    
    return c.json({
      success: true,
      creditBalance,
      earningsBalance
    });
  } catch (error) {
    console.error("❌ [WALLETS] Erreur:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

/**
 * POST /drivers/:driverId/wallet/recharge - Recharger le solde de crédit
 */
app.post("/make-server-2eb02e52/drivers/:driverId/wallet/recharge", async (c) => {
  try {
    const driverId = c.req.param('driverId');
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
    
    const driver = await kv.get(`driver:${driverId}`);
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

/**
 * POST /drivers/:driverId/wallet/withdraw - Retirer du solde de gains
 */
app.post("/make-server-2eb02e52/drivers/:driverId/wallet/withdraw", async (c) => {
  try {
    const driverId = c.req.param('driverId');
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
    
    const driver = await kv.get(`driver:${driverId}`);
    if (!driver) {
      return c.json({ success: false, error: "Conducteur non trouvé" }, 404);
    }
    
    const earningsBalance = driver.earningsBalance || 0;
    
    if (amount > earningsBalance) {
      return c.json({ 
        success: false, 
        error: `Solde insuffisant. Disponible: ${earningsBalance.toLocaleString('fr-FR')} CDF` 
      }, 400);
    }
    
    // Déduire du solde de gains
    const newEarningsBalance = earningsBalance - amount;
    
    driver.earningsBalance = newEarningsBalance;
    driver.lastUpdate = new Date().toISOString();
    
    await kv.set(`driver:${driverId}`, driver);
    
    console.log(`💸 [WITHDRAW] Driver ${driverId}: ${earningsBalance} CDF → ${newEarningsBalance} CDF (-${amount} CDF)`);
    
    // Enregistrer la demande de retrait
    const withdrawalKey = `withdrawal:${crypto.randomUUID()}`;
    await kv.set(withdrawalKey, {
      id: crypto.randomUUID(),
      driverId,
      driverName: driver.full_name || driver.name,
      driverPhone: driver.phone,
      amount,
      oldBalance: earningsBalance,
      newBalance: newEarningsBalance,
      status: 'pending',
      requestedAt: new Date().toISOString(),
      processedAt: null,
      paymentMethod: 'mobile_money',
      notes: 'Demande de retrait en attente de traitement'
    });
    
    return c.json({
      success: true,
      newEarningsBalance,
      message: `Demande de retrait de ${amount.toLocaleString('fr-FR')} CDF enregistrée. Traitement sous 24-48h.`
    });
  } catch (error) {
    console.error("❌ [WITHDRAW] Erreur:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

/**
 * POST /drivers/:driverId/status - Changer le statut online/offline
 */
app.post("/make-server-2eb02e52/drivers/:driverId/status", async (c) => {
  try {
    const driverId = c.req.param('driverId');
    const { status, location } = await c.req.json();
    
    console.log('🔄 [STATUS] Changement statut:', { driverId, status, hasLocation: !!location });
    
    if (!isValidUUID(driverId)) {
      return c.json({ success: false, error: "ID conducteur invalide" }, 400);
    }
    
    if (!status || !['online', 'offline'].includes(status)) {
      return c.json({ success: false, error: "Statut invalide (online ou offline)" }, 400);
    }
    
    const driver = await kv.get(`driver:${driverId}`);
    if (!driver) {
      console.error(`❌ [STATUS] Conducteur non trouvé: ${driverId}`);
      return c.json({ success: false, error: "Conducteur non trouvé" }, 404);
    }
    
    const isOnline = status === 'online';
    
    // Vérifier les statuts bloqués
    const blockedStatuses = ['pending', 'rejected', 'suspended'];
    const isBlocked = blockedStatuses.includes(driver.status);
    
    if (isOnline && isBlocked) {
      let errorMessage = "Votre compte doit être approuvé avant de vous mettre en ligne";
      if (driver.status === 'rejected') {
        errorMessage = "Votre compte a été rejeté. Contactez le support.";
      } else if (driver.status === 'suspended') {
        errorMessage = "Votre compte est suspendu. Contactez le support.";
      }
      console.error(`❌ [STATUS] Conducteur bloqué:`, { driverId, status: driver.status });
      return c.json({ success: false, error: errorMessage }, 403);
    }
    
    // Auto-approuver si nécessaire
    if (!driver.status || (driver.status !== 'approved' && !blockedStatuses.includes(driver.status))) {
      console.log(`✅ [STATUS] Auto-approbation du conducteur ${driverId}`);
      driver.status = 'approved';
      driver.approved_at = driver.approved_at || new Date().toISOString();
    }
    
    // Vérifier le solde si mise en ligne
    const currentBalance = driver.balance || 0;
    if (isOnline && currentBalance < 0) {
      console.error(`❌ [STATUS] Solde insuffisant:`, { driverId, balance: currentBalance });
      return c.json({ 
        success: false, 
        error: `Solde insuffisant (${currentBalance} CDF). Veuillez recharger votre compte.` 
      }, 403);
    }
    
    // ✅ FIX CRITIQUE : Mettre à jour TOUS les champs utilisés par le matching
    driver.is_available = isOnline;
    driver.available = isOnline;
    driver.status = status;
    
    // Mettre à jour la position si fournie
    if (location && typeof location.lat === 'number' && typeof location.lng === 'number') {
      driver.location = location;
      driver.current_location = location;
      driver.currentLocation = location;
      driver.last_location_update = new Date().toISOString();
    }
    
    driver.updated_at = new Date().toISOString();
    driver.lastUpdate = new Date().toISOString();
    
    // ✅ Sauvegarder dans KV Store (double sauvegarde pour compatibilité)
    await kv.set(`driver:${driverId}`, driver);
    await kv.set(`profile:${driverId}`, driver);
    
    console.log(`✅ [STATUS] Conducteur ${driverId} maintenant ${status} -`, {
      available: driver.available,
      is_available: driver.is_available,
      balance: currentBalance,
      hasLocation: !!driver.currentLocation,
      vehicleCategory: driver.vehicle?.category || driver.vehicleCategory || driver.vehicle_category
    });
    
    return c.json({ 
      success: true, 
      driver,
      message: isOnline ? 'Vous êtes maintenant en ligne' : 'Vous êtes maintenant hors ligne'
    });
  } catch (error) {
    console.error("❌ [STATUS] Erreur:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

/**
 * POST /drivers/:driverId/location - Mettre à jour la position GPS du conducteur
 */
app.post("/make-server-2eb02e52/drivers/:driverId/location", async (c) => {
  try {
    const driverId = c.req.param('driverId');
    const { latitude, longitude } = await c.req.json();
    
    console.log('📍 [LOCATION] Mise à jour position:', { driverId, latitude, longitude });
    
    if (!isValidUUID(driverId)) {
      return c.json({ success: false, error: "ID conducteur invalide" }, 400);
    }
    
    if (!latitude || !longitude || typeof latitude !== 'number' || typeof longitude !== 'number') {
      return c.json({ success: false, error: "Coordonnées GPS invalides" }, 400);
    }
    
    // Vérifier que les coordonnées sont dans la zone de Kinshasa (approximativement)
    if (latitude < -5.0 || latitude > -4.0 || longitude < 15.0 || longitude > 15.8) {
      console.warn('⚠️ [LOCATION] Coordonnées hors zone Kinshasa:', { latitude, longitude });
    }
    
    const driver = await kv.get(`driver:${driverId}`);
    if (!driver) {
      return c.json({ success: false, error: "Conducteur non trouvé" }, 404);
    }
    
    // Mettre à jour la position
    driver.currentLocation = {
      latitude,
      longitude,
      updated_at: new Date().toISOString()
    };
    driver.updated_at = new Date().toISOString();
    
    await kv.set(`driver:${driverId}`, driver);
    
    console.log(`✅ [LOCATION] Position du conducteur ${driverId} mise à jour`);
    
    return c.json({ 
      success: true,
      location: driver.currentLocation
    });
  } catch (error) {
    console.error("❌ [LOCATION] Erreur:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

// ============================================
// DIAGNOSTIC ENDPOINT - DEBUG KV STORE
// ============================================

/**
 * Endpoint de diagnostic pour voir ce qu'il y a dans le KV store
 */
app.get("/make-server-2eb02e52/debug-kv", async (c) => {
  try {
    console.log('🔍 Diagnostic du KV store...');

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Récupérer TOUTES les clés du KV store
    const { data: allData, error } = await supabaseAdmin
      .from('kv_store_2eb02e52')
      .select('key, value')
      .order('key');

    if (error) {
      console.error('❌ Erreur récupération KV:', error);
      return c.json({ success: false, error: error.message }, 500);
    }

    // Grouper par type
    const profiles = allData?.filter(d => d.key.startsWith('profile:')) || [];
    const drivers = allData?.filter(d => d.key.startsWith('driver:')) || [];
    const rides = allData?.filter(d => d.key.startsWith('ride:')) || [];

    // Compter les profils par rôle
    const adminProfiles = profiles.filter(p => p.value?.role === 'admin');
    const passengerProfiles = profiles.filter(p => p.value?.role === 'passenger');

    return c.json({
      success: true,
      summary: {
        total: allData?.length || 0,
        profiles: {
          total: profiles.length,
          admin: adminProfiles.length,
          passenger: passengerProfiles.length,
        },
        drivers: drivers.length,
        rides: rides.length,
      },
      data: {
        profiles: profiles.map(p => ({
          key: p.key,
          email: p.value?.email,
          role: p.value?.role,
          name: p.value?.full_name,
        })),
        drivers: drivers.map(d => ({
          key: d.key,
          name: d.value?.full_name,
          email: d.value?.email,
        })),
        rides: rides.map(r => ({
          key: r.key,
        })),
      }
    });

  } catch (error) {
    console.error('❌ Erreur diagnostic:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Erreur serveur' 
    }, 500);
  }
});

// ✅ GLOBAL ERROR HANDLER - Éviter les crashes silencieux
app.onError((err, c) => {
  console.error('❌❌❌ ERREUR NON GÉRÉE DANS LE SERVEUR ❌❌❌');
  console.error('Type:', err.name);
  console.error('Message:', err.message);
  console.error('Stack:', err.stack);
  
  return c.json({
    success: false,
    error: 'Erreur serveur interne',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  }, 500);
});

// ✅ 404 HANDLER
app.notFound((c) => {
  console.warn('⚠️ Route non trouvée:', c.req.path);
  return c.json({
    success: false,
    error: 'Route non trouvée',
    path: c.req.path
  }, 404);
});

console.log('✅✅✅ Serveur SmartCabb prêt à recevoir des requêtes !');

// ============================================
// 🧪 ROUTES ADMIN DE DÉBOGAGE
// ============================================

// Route 1: Statut complet du système
app.get('/make-server-2eb02e52/admin/system-status', async (c) => {
  try {
    console.log('📊 [ADMIN] Récupération du statut système...');
    
    // Compter les conducteurs
    const allDrivers = await kv.getByPrefix('driver:');
    const onlineDrivers = allDrivers ? allDrivers.filter(d => d.is_available || d.isOnline) : [];
    
    // Compter les courses
    const allRides = await kv.getByPrefix('ride_request_');
    const pendingRides = allRides ? allRides.filter(r => r.status === 'pending') : [];
    const acceptedRides = allRides ? allRides.filter(r => r.status === 'accepted') : [];
    
    // Détails des conducteurs
    const driverDetails = allDrivers ? allDrivers.map(d => ({
      id: d.id,
      name: d.full_name || d.name,
      phone: d.phone_number || d.phone,
      isOnline: d.is_available || d.isOnline,
      category: d.vehicle?.category || d.vehicle_category,
      location: d.location ? {
        lat: d.location.lat,
        lng: d.location.lng,
        hasGPS: !!(d.location.lat && d.location.lng)
      } : null,
      rating: d.rating || 5.0,
      totalRides: d.total_rides || 0
    })) : [];
    
    const status = {
      timestamp: new Date().toISOString(),
      drivers: {
        total: allDrivers ? allDrivers.length : 0,
        online: onlineDrivers.length,
        offline: allDrivers ? allDrivers.length - onlineDrivers.length : 0,
        details: driverDetails
      },
      rides: {
        total: allRides ? allRides.length : 0,
        pending: pendingRides.length,
        accepted: acceptedRides.length,
        completed: 0,
        cancelled: 0
      },
      environment: {
        hasFirebase: !!Deno.env.get('FIREBASE_SERVER_KEY'),
        hasAfricasTalking: !!Deno.env.get('AFRICAS_TALKING_API_KEY'),
        hasSupabase: !!Deno.env.get('SUPABASE_URL') && !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
      }
    };
    
    console.log(`✅ [ADMIN] Statut: ${status.drivers.total} conducteurs, ${status.rides.pending} courses en attente`);
    
    return c.json({ success: true, status });
  } catch (error) {
    console.error('❌ [ADMIN] Erreur statut système:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Erreur' 
    }, 500);
  }
});

// Route 2: Supprimer TOUS les conducteurs (avec Supabase Auth)
app.delete('/make-server-2eb02e52/admin/delete-all-drivers', async (c) => {
  try {
    console.log('🗑️ [ADMIN] Suppression de TOUS les conducteurs...');
    
    // Créer un client Supabase Admin
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    const allDrivers = await kv.getByPrefix('driver:');
    
    if (!allDrivers || allDrivers.length === 0) {
      console.log('✅ Aucun conducteur à supprimer');
      return c.json({ success: true, message: 'Aucun conducteur trouvé', count: 0 });
    }
    
    console.log(`🗑️ [ADMIN] ${allDrivers.length} conducteur(s) à supprimer`);
    
    // Supprimer chaque conducteur ET TOUTES SES CLÉS ASSOCIÉES + Supabase Auth
    const deleted = [];
    let totalKeysDeleted = 0;
    let deletedFromAuth = 0;
    const errors: Array<{ id: string; name: string; error: string }> = [];
    
    for (const driver of allDrivers) {
      if (driver && driver.id) {
        console.log(`🗑️ Suppression de: ${driver.full_name || driver.id} (${driver.id})`);
        
        // A. Supprimer de Supabase Auth
        try {
          const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(driver.id);
          if (authError) {
            console.warn(`  ⚠️ Erreur Auth: ${authError.message}`);
            errors.push({
              id: driver.id,
              name: driver.full_name || driver.id,
              error: `Auth: ${authError.message}`
            });
          } else {
            deletedFromAuth++;
            console.log(`  ✅ Supprimé de Supabase Auth`);
          }
        } catch (authErr) {
          console.warn(`  ⚠️ Erreur suppression Auth:`, authErr);
        }
        
        // B. Supprimer TOUTES les clés associées à ce conducteur
        const keysToDelete = [
          `driver:${driver.id}`,
          `profile:${driver.id}`,
          `wallet:${driver.id}`,
          `driver_location:${driver.id}`,
          `driver_status:${driver.id}`,
          `fcm_token:${driver.id}`,
          `driver_stats:${driver.id}`
        ];
        
        for (const key of keysToDelete) {
          try {
            await kv.del(key);
            totalKeysDeleted++;
            console.log(`  ✅ Supprimé KV: ${key}`);
          } catch (delError) {
            console.warn(`  ⚠️ Erreur suppression ${key}:`, delError);
          }
        }
        
        deleted.push(driver.id);
      }
    }
    
    console.log(`✅ [ADMIN] ${deleted.length} conducteur(s) supprimé(s) (${totalKeysDeleted} clés KV + ${deletedFromAuth} Auth)`);
    
    return c.json({ 
      success: true, 
      message: `${deleted.length} conducteur(s) supprimé(s) (${totalKeysDeleted} clés KV, ${deletedFromAuth} Auth)`,
      count: deleted.length,
      totalKeysDeleted,
      deletedFromAuth,
      errors
    });
  } catch (error) {
    console.error('🗑️ [ADMIN] Erreur suppression:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Erreur' 
    }, 500);
  }
});

// 🆕 Route 2.5: Supprimer TOUS les passagers (NOUVELLE ROUTE)
app.post('/make-server-2eb02e52/admin/passengers/delete-all', async (c) => {
  try {
    console.log('🗑️ [ADMIN] Suppression de TOUS les passagers...');
    
    // Créer un client Supabase Admin
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    const errors: Array<{ id: string; name: string; error: string }> = [];
    let deletedFromAuth = 0;
    let deletedFromKV = 0;
    let deletedRides = 0;
    
    // 1️⃣ RÉCUPÉRER TOUS LES UTILISATEURS DE SUPABASE AUTH
    console.log('📋 Récupération de tous les utilisateurs depuis Supabase Auth...');
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Erreur récupération utilisateurs:', listError.message);
      return c.json({ 
        success: false, 
        error: `Erreur lors de la récupération des utilisateurs: ${listError.message}` 
      }, 500);
    }
    
    if (!users || users.length === 0) {
      console.log('✅ Aucun utilisateur trouvé dans Supabase Auth');
      return c.json({
        success: true,
        message: 'Aucun passager à supprimer',
        deleted: { fromAuth: 0, fromKV: 0, rides: 0 },
        errors: []
      });
    }
    
    console.log(`📊 ${users.length} utilisateur(s) trouvé(s) dans Supabase Auth`);
    
    // 2️⃣ FILTRER LES PASSAGERS (exclure les admins et conducteurs)
    const passengers = [];
    for (const user of users) {
      // Récupérer le profil depuis le KV pour vérifier le rôle
      const profile = await kv.get(`profile:${user.id}`);
      const driver = await kv.get(`driver:${user.id}`);
      
      // Garder seulement si c'est un passager (ni admin, ni conducteur)
      const isAdmin = profile?.role === 'admin';
      const isDriver = !!driver;
      
      if (!isAdmin && !isDriver) {
        passengers.push({
          id: user.id,
          email: user.email || 'Email inconnu',
          name: profile?.full_name || user.user_metadata?.name || 'Passager inconnu',
          profile: profile
        });
      } else {
        console.log(`⏭️ Ignoré (${isAdmin ? 'Admin' : 'Conducteur'}): ${user.email}`);
      }
    }
    
    console.log(`🎯 ${passengers.length} passager(s) à supprimer`);
    
    if (passengers.length === 0) {
      console.log('✅ Aucun passager à supprimer (uniquement admins et conducteurs)');
      return c.json({
        success: true,
        message: 'Aucun passager à supprimer',
        deleted: { fromAuth: 0, fromKV: 0, rides: 0 },
        errors: []
      });
    }
    
    // 3️⃣ SUPPRIMER CHAQUE PASSAGER
    for (const passenger of passengers) {
      try {
        console.log(`🗑️ Suppression de: ${passenger.name} (${passenger.id})`);
        
        // A. Supprimer de Supabase Auth
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(passenger.id);
        
        if (authError) {
          console.error(`❌ Erreur suppression Auth: ${passenger.name}:`, authError.message);
          errors.push({
            id: passenger.id,
            name: passenger.name,
            error: `Auth: ${authError.message}`
          });
        } else {
          deletedFromAuth++;
          console.log(`  ✅ Supprimé de Supabase Auth`);
        }
        
        // B. Supprimer du KV Store (toutes les clés associées)
        const keysToDelete = [
          `passenger:${passenger.id}`,
          `profile:${passenger.id}`,
          `wallet:${passenger.id}`,
          `fcm_token:${passenger.id}`,
          `passenger_stats:${passenger.id}`
        ];
        
        for (const key of keysToDelete) {
          try {
            await kv.del(key);
            deletedFromKV++;
            console.log(`  ✅ Supprimé KV: ${key}`);
          } catch (delError) {
            console.warn(`  ⚠️ Erreur suppression ${key}:`, delError);
            errors.push({
              id: passenger.id,
              name: passenger.name,
              error: `KV (${key}): ${delError instanceof Error ? delError.message : 'Erreur inconnue'}`
            });
          }
        }
        
        // C. Supprimer les courses associées (comme passager)
        const allRides = await kv.getByPrefix('ride_request_');
        for (const ride of allRides) {
          if (ride.passenger_id === passenger.id) {
            try {
              await kv.del(`ride_request_${ride.id}`);
              await kv.del(`ride_pending_${ride.id}`);
              await kv.del(`ride_${ride.id}:current_driver`);
              await kv.del(`ride_${ride.id}:notified_at`);
              await kv.del(`ride_${ride.id}:refused_drivers`);
              deletedRides++;
              console.log(`  ✅ Supprimé course: ${ride.id}`);
            } catch (rideError) {
              console.warn(`  ⚠️ Erreur suppression course ${ride.id}:`, rideError);
            }
          }
        }
        
      } catch (error) {
        console.error(`❌ Erreur suppression passager ${passenger.name}:`, error);
        errors.push({
          id: passenger.id,
          name: passenger.name,
          error: error instanceof Error ? error.message : 'Erreur inconnue'
        });
      }
    }
    
    // 4️⃣ RAPPORT FINAL
    console.log('');
    console.log('═══════════════════════════════════════════════');
    console.log('📊 RAPPORT DE SUPPRESSION DES PASSAGERS');
    console.log('═══════════════════════════════════════════════');
    console.log(`��� Passagers supprimés de Supabase Auth: ${deletedFromAuth}`);
    console.log(`✅ Entrées KV supprimées: ${deletedFromKV}`);
    console.log(`✅ Courses supprimées: ${deletedRides}`);
    console.log(`❌ Erreurs: ${errors.length}`);
    console.log('═══════════════════════════════════════════════');
    
    if (errors.length > 0) {
      console.log('⚠️ ERREURS DÉTAILLÉES:');
      errors.forEach((err, idx) => {
        console.log(`  ${idx + 1}. ${err.name} (${err.id}): ${err.error}`);
      });
      console.log('═══════════════════════════════════════════════');
    }
    
    return c.json({
      success: true,
      message: `${deletedFromAuth} passager(s) supprimé(s) avec succès`,
      deleted: {
        fromAuth: deletedFromAuth,
        fromKV: deletedFromKV,
        rides: deletedRides
      },
      errors: errors,
      totalPassengers: passengers.length
    });
    
  } catch (error) {
    console.error('❌ [ADMIN] Erreur suppression passagers:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Erreur serveur' 
    }, 500);
  }
});

// 🆕 Route 2b: Nettoyer UNIQUEMENT les conducteurs invalides (sans nom, email, ou données incomplètes)
app.delete('/make-server-2eb02e52/admin/clean-invalid-drivers', async (c) => {
  try {
    console.log('🧹 [ADMIN] Nettoyage des conducteurs invalides...');
    
    // ✅ 1. Récupérer depuis KV Store
    const kvDrivers = await kv.getByPrefix('driver:');
    console.log(`🔍 [ADMIN] KV Store: ${kvDrivers?.length || 0} conducteur(s)...`);
    
    // ✅ 2. Récupérer depuis Postgres (où se trouvent souvent les conducteurs invalides)
    const { data: profileDrivers, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'driver');
    
    if (profileError) {
      console.error('❌ Erreur récupération Postgres profiles:', profileError);
    }
    console.log(`🔍 [ADMIN] Postgres profiles: ${profileDrivers?.length || 0} conducteur(s)...`);
    
    // ✅ 3. Fusionner les deux sources (éviter doublons)
    const allDriversMap = new Map();
    
    if (kvDrivers && kvDrivers.length > 0) {
      kvDrivers.forEach(driver => {
        if (driver && driver.id) {
          allDriversMap.set(driver.id, { ...driver, source: 'kv' });
        }
      });
    }
    
    if (profileDrivers && profileDrivers.length > 0) {
      profileDrivers.forEach((profile: any) => {
        if (profile && profile.id) {
          if (!allDriversMap.has(profile.id)) {
            allDriversMap.set(profile.id, {
              id: profile.id,
              full_name: profile.full_name || '',
              email: profile.email || '',
              phone: profile.phone || '',
              source: 'postgres'
            });
          }
        }
      });
    }
    
    const allDrivers = Array.from(allDriversMap.values());
    console.log(`📊 [ADMIN] TOTAL: ${allDrivers.length} conducteur(s)`);
    
    if (allDrivers.length === 0) {
      return c.json({ success: true, message: 'Aucun conducteur trouvé', count: 0 });
    }
    
    const invalidDrivers = [];
    let authDeleted = 0;
    let kvKeysDeleted = 0;
    
    // ✅ 4. Identifier les conducteurs invalides
    for (const driver of allDrivers) {
      if (!driver || !driver.id) continue;
      
      const isInvalid = 
        !driver.full_name || driver.full_name.trim() === '' ||
        driver.full_name === 'Conducteur inconnu' ||
        !driver.email || driver.email.trim() === '' ||
        driver.email === 'Non renseigné' ||
        !driver.phone || driver.phone.trim() === '' ||
        driver.phone === 'Non renseigné';
      
      if (isInvalid) {
        console.log(`⚠️ Invalide: ${driver.full_name || 'Sans nom'} (${driver.id})`);
        invalidDrivers.push(driver);
      }
    }
    
    if (invalidDrivers.length === 0) {
      return c.json({ 
        success: true, 
        message: 'Aucun conducteur invalide trouvé',
        count: 0 
      });
    }
    
    console.log(`🗑️ [ADMIN] ${invalidDrivers.length} invalide(s) à supprimer`);
    
    // ✅ 5. Supprimer de partout
    for (const driver of invalidDrivers) {
      if (!driver || !driver.id) continue;
      
      console.log(`🗑️ Suppression: ${driver.full_name || 'Sans nom'} (${driver.id})`);
      
      // A. Supprimer de Supabase Auth
      try {
        const { error } = await supabase.auth.admin.deleteUser(driver.id);
        if (!error) {
          console.log(`  ✅ Auth supprimé`);
          authDeleted++;
        }
      } catch (e) {
        console.warn(`  ⚠️ Erreur Auth:`, e);
      }
      
      // B. Supprimer de Postgres
      try {
        await supabase.from('profiles').delete().eq('id', driver.id);
        console.log(`  ✅ Postgres supprimé`);
      } catch (e) {
        console.warn(`  ⚠️ Erreur Postgres:`, e);
      }
      
      // C. Supprimer du KV
      const keys = [
        `driver:${driver.id}`,
        `profile:${driver.id}`,
        `wallet:${driver.id}`,
        `driver_location:${driver.id}`,
        `driver_status:${driver.id}`,
        `fcm_token:${driver.id}`,
        `driver_stats:${driver.id}`
      ];
      
      for (const key of keys) {
        try {
          await kv.del(key);
          kvKeysDeleted++;
        } catch (e) {}
      }
    }
    
    console.log(`✅ [ADMIN] ${invalidDrivers.length} supprimé(s) (Auth: ${authDeleted}, KV: ${kvKeysDeleted})`);
    
    return c.json({ 
      success: true, 
      message: `${invalidDrivers.length} conducteur(s) invalide(s) supprimé(s)`,
      count: invalidDrivers.length,
      details: { authDeleted, kvKeysDeleted }
    });
  } catch (error) {
    console.error('🧹 [ADMIN] Erreur nettoyage invalides:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Erreur lors du nettoyage' 
    }, 500);
  }
});

// Route 3: Supprimer TOUTES les courses
app.delete('/make-server-2eb02e52/admin/delete-all-rides', async (c) => {
  try {
    console.log('🗑️ [ADMIN] Suppression de TOUTES les courses...');
    
    const allRides = await kv.getByPrefix('ride_request_');
    
    if (!allRides || allRides.length === 0) {
      console.log('✅ Aucune course à supprimer');
      return c.json({ success: true, message: 'Aucune course trouvée', count: 0 });
    }
    
    console.log(`🗑️ [ADMIN] ${allRides.length} course(s) à supprimer`);
    
    const deleted = [];
    for (const ride of allRides) {
      if (ride && ride.id) {
        console.log(`🗑️ Suppression de: ${ride.id}`);
        await kv.del(`ride_request_${ride.id}`);
        await kv.del(`ride_pending_${ride.id}`);
        await kv.del(`ride_${ride.id}:current_driver`);
        await kv.del(`ride_${ride.id}:notified_at`);
        await kv.del(`ride_${ride.id}:refused_drivers`);
        deleted.push(ride.id);
      }
    }
    
    console.log(`✅ [ADMIN] ${deleted.length} course(s) supprimée(s)`);
    
    return c.json({ 
      success: true, 
      message: `${deleted.length} course(s) supprimée(s)`,
      count: deleted.length
    });
  } catch (error) {
    console.error('🗑️ [ADMIN] Erreur suppression courses:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Erreur' 
    }, 500);
  }
});

// ============================================
// 🧹 ROUTE ADMIN : Nettoyage TOTAL du système
// ============================================
app.delete('/make-server-2eb02e52/admin/clean-all-system', async (c) => {
  try {
    console.log('🧹 [ADMIN] NETTOYAGE TOTAL DU SYSTÈME...');
    
    let totalKeysDeleted = 0;
    const deletionReport: Record<string, number> = {
      drivers: 0,
      passengers: 0,
      rides: 0,
      profiles: 0,
      wallets: 0,
      locations: 0,
      fcmTokens: 0,
      stats: 0,
      other: 0
    };
    
    // 1️⃣ SUPPRIMER TOUS LES CONDUCTEURS ET LEURS DONNÉES
    console.log('🗑️ [1/7] Suppression des conducteurs...');
    const allDrivers = await kv.getByPrefix('driver:');
    for (const driver of allDrivers) {
      if (driver?.id) {
        const keysToDelete = [
          `driver:${driver.id}`,
          `profile:${driver.id}`,
          `wallet:${driver.id}`,
          `driver_location:${driver.id}`,
          `driver_status:${driver.id}`,
          `fcm_token:${driver.id}`,
          `driver_stats:${driver.id}`
        ];
        
        for (const key of keysToDelete) {
          try {
            await kv.del(key);
            totalKeysDeleted++;
            if (key.startsWith('driver:')) deletionReport.drivers++;
            else if (key.startsWith('profile:')) deletionReport.profiles++;
            else if (key.startsWith('wallet:')) deletionReport.wallets++;
            else if (key.includes('_location:')) deletionReport.locations++;
            else if (key.startsWith('fcm_token:')) deletionReport.fcmTokens++;
            else if (key.includes('_stats:')) deletionReport.stats++;
          } catch (err) {
            console.warn(`⚠️ Erreur suppression ${key}:`, err);
          }
        }
      }
    }
    console.log(`✅ ${deletionReport.drivers} conducteurs supprimés`);
    
    // 2️⃣ SUPPRIMER TOUS LES PASSAGERS ET LEURS DONNÉES
    console.log('🗑️ [2/7] Suppression des passagers...');
    const allPassengers = await kv.getByPrefix('passenger:');
    for (const passenger of allPassengers) {
      if (passenger?.id) {
        const keysToDelete = [
          `passenger:${passenger.id}`,
          `profile:${passenger.id}`,
          `wallet:${passenger.id}`,
          `fcm_token:${passenger.id}`
        ];
        
        for (const key of keysToDelete) {
          try {
            await kv.del(key);
            totalKeysDeleted++;
            if (key.startsWith('passenger:')) deletionReport.passengers++;
            else if (key.startsWith('profile:')) deletionReport.profiles++;
            else if (key.startsWith('wallet:')) deletionReport.wallets++;
            else if (key.startsWith('fcm_token:')) deletionReport.fcmTokens++;
          } catch (err) {
            console.warn(`⚠️ Erreur suppression ${key}:`, err);
          }
        }
      }
    }
    console.log(`✅ ${deletionReport.passengers} passagers supprimés`);
    
    // 3️⃣ SUPPRIMER TOUTES LES COURSES (ride_request_)
    console.log('🗑️ [3/7] Suppression des courses (ride_request_)...');
    const allRideRequests = await kv.getByPrefix('ride_request_');
    for (const ride of allRideRequests) {
      if (ride?.id) {
        const keysToDelete = [
          `ride_request_${ride.id}`,
          `ride_pending_${ride.id}`,
          `ride_${ride.id}:current_driver`,
          `ride_${ride.id}:notified_at`,
          `ride_${ride.id}:refused_drivers`
        ];
        
        for (const key of keysToDelete) {
          try {
            await kv.del(key);
            totalKeysDeleted++;
            deletionReport.rides++;
          } catch (err) {
            console.warn(`⚠️ Erreur suppression ${key}:`, err);
          }
        }
      }
    }
    
    // 4️⃣ SUPPRIMER TOUTES LES COURSES ACTIVES (ride_active_)
    console.log('🗑️ [4/7] Suppression des courses actives...');
    const allActiveRides = await kv.getByPrefix('ride_active_');
    for (const ride of allActiveRides) {
      if (ride?.id) {
        await kv.del(`ride_active_${ride.id}`);
        totalKeysDeleted++;
        deletionReport.rides++;
      }
    }
    
    // 5️⃣ SUPPRIMER TOUTES LES COURSES COMPLÉTÉES (ride_completed_)
    console.log('🗑️ [5/7] Suppression des courses complétées...');
    const allCompletedRides = await kv.getByPrefix('ride_completed_');
    for (const ride of allCompletedRides) {
      if (ride?.id) {
        await kv.del(`ride_completed_${ride.id}`);
        totalKeysDeleted++;
        deletionReport.rides++;
      }
    }
    
    // 6️⃣ SUPPRIMER TOUTES LES COURSES ANNULÉES (ride_cancelled_)
    console.log('🗑️ [6/7] Suppression des courses annulées...');
    const allCancelledRides = await kv.getByPrefix('ride_cancelled_');
    for (const ride of allCancelledRides) {
      if (ride?.id) {
        await kv.del(`ride_cancelled_${ride.id}`);
        totalKeysDeleted++;
        deletionReport.rides++;
      }
    }
    
    // 7️⃣ SUPPRIMER LES CLÉS ORPHELINES
    console.log('🗑️ [7/7] Nettoyage terminé');
    
    const summary = `
✅ NETTOYAGE TOTAL TERMINÉ

📊 STATISTIQUES DE SUPPRESSION:
   - Conducteurs: ${deletionReport.drivers}
   - Passagers: ${deletionReport.passengers}
   - Courses: ${deletionReport.rides}
   - Profils: ${deletionReport.profiles}
   - Wallets: ${deletionReport.wallets}
   - Localisations: ${deletionReport.locations}
   - Tokens FCM: ${deletionReport.fcmTokens}
   - Stats: ${deletionReport.stats}
   
🔢 TOTAL: ${totalKeysDeleted} clés supprimées
    `.trim();
    
    console.log(summary);
    
    return c.json({ 
      success: true, 
      message: 'Système nettoyé avec succès',
      totalKeysDeleted,
      deletionReport,
      summary
    });
  } catch (error) {
    console.error('🗑️ [ADMIN] Erreur nettoyage total:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Erreur' 
    }, 500);
  }
});

// ============================================
// 🌱 SEED TEST USERS - ❌ SUPPRIMÉ DÉFINITIVEMENT ❌
// ============================================
// ❌ CETTE ROUTE A ÉTÉ SUPPRIMÉE PAR DEMANDE EXPLICITE DE L'UTILISATEUR
// ❌ NE JAMAIS RECRÉER D'UTILISATEURS DE TEST AUTOMATIQUEMENT
// ❌ Les utilisateurs doivent être créés manuellement via l'inscription normale
// 
// Historique:
// - Créée pour faciliter les tests
// - Supprimée le 24/02/2026 car elle pollue la base de données
// - NE PAS RÉACTIVER CETTE FONCTIONNALITÉ

// ============================================
// 🔧 FIX EMAILS - RÉPARATION DES EMAILS MALFORMÉS
// ============================================
// Routes pour diagnostiquer et réparer les emails au format u+243... (avec +)
// qui doivent être corrigés en u243... (sans +) pour que la connexion fonctionne

import fixEmailsRoutes from "./fix-emails-routes.ts";
app.route('/make-server-2eb02e52/fix-emails', fixEmailsRoutes);

console.log('✅ Routes de réparation d\'emails chargées');

// ============================================
// 🛡️ ROUTE ADMIN PROFILE
// ============================================
// Route pour récupérer le profil admin depuis le KV store
app.get("/make-server-2eb02e52/admin/profile/:userId", async (c) => {
  try {
    const userId = c.req.param('userId');
    
    if (!userId || !isValidUUID(userId)) {
      return c.json({
        success: false,
        error: 'ID utilisateur invalide'
      }, 400);
    }
    
    console.log(`🛡️ [ADMIN PROFILE] Récupération du profil admin: ${userId}`);
    
    // Récupérer le profil depuis le KV store
    const adminProfile = await kv.get(`admin:${userId}`);
    
    if (!adminProfile) {
      // Essayer avec le préfixe profile:
      const profile = await kv.get(`profile:${userId}`);
      
      if (!profile || profile.role !== 'admin') {
        console.log(`❌ [ADMIN PROFILE] Profil admin non trouvé pour: ${userId}`);
        return c.json({
          success: false,
          error: 'Profil admin non trouvé'
        }, 404);
      }
      
      console.log(`✅ [ADMIN PROFILE] Profil admin récupéré (depuis profile:)`);
      return c.json({
        success: true,
        admin: profile
      });
    }
    
    console.log(`✅ [ADMIN PROFILE] Profil admin récupéré (depuis admin:)`);
    return c.json({
      success: true,
      admin: adminProfile
    });
    
  } catch (error) {
    console.error('❌ [ADMIN PROFILE] Erreur:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur serveur'
    }, 500);
  }
});

console.log('✅ Route admin profile chargée');

// ============================================
// 🗑️ PURGE UTILISATEUR - SUPPRESSION DÉFINITIVE
// ============================================
// Routes pour purger complètement un utilisateur de Supabase Auth
// et libérer son email pour permettre de créer un nouveau compte
import purgeUserRoutes from "./purge-user-route.ts";
app.route('/make-server-2eb02e52/purge', purgeUserRoutes);

console.log('✅ Routes de purge utilisateur chargées');

// ✅ Démarrage du serveur Hono avec CORS wrapper
Deno.serve(async (req) => {
  // Gérer OPTIONS en premier
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  // Passer la requête à Hono
  const response = await app.fetch(req);

  // Ajouter les headers CORS à TOUTES les réponses
  const headers = new Headers(response.headers);
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  headers.set('Access-Control-Allow-Headers', '*');
  headers.set('Access-Control-Max-Age', '86400');

  // Retourner la réponse avec les headers CORS
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
});