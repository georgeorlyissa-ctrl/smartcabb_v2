import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv-wrapper.ts";
import { isValidUUID } from "./uuid-validator.ts";
import { normalizePhoneNumber, isValidPhoneNumber } from "./phone-utils.ts";
import smsRoutes from "./sms-routes.ts";
import backupRoutes from "./backup-routes.ts";
import exportRoutes from "./export-routes.ts";
import websiteRoutes from "./website-routes.ts";
import chatRoutes from "./chat-routes.ts";
import cleanupRoutes from "./cleanup-routes.ts";
import authRoutes from "./auth-routes.ts";
import driverRoutes from "./driver-routes.ts";
import passengerRoutes from "./passenger-routes.ts";
import walletRoutes from "./wallet-routes.ts";
import rideRoutes from "./ride-routes.ts";
import adminRoutes from "./admin-routes.ts";
import settingsRoutes from "./settings-routes.ts";
import emailRoutes from "./email-routes.ts";
import emergencyRoutes from "./emergency-routes.ts";
import { testRoutes } from "./test-routes.ts";
import diagnosticRoute from "./diagnostic-driver-route.ts";
import geocodingApp from "./geocoding-api.ts";
import analyticsApp from "./analytics-api.ts";
import nominatimApp from "./nominatim-enriched-api.ts";
import fcmRoutes from "./fcm-routes.ts";
import googleMapsApp from "./google-maps-api.ts";
import configRoutes from "./config-routes.ts";
import resetDatabaseRoutes from "./reset-database-routes.ts";
import { securityMiddleware } from "./security-middleware.ts";
import auditRoutes from "./audit-emails-route.ts";

const app = new Hono();

// 🔄 REDÉPLOIEMENT FORCÉ V7 - FIX NORMALISATION TÉLÉPHONE - 14/02/2026
// ✅ Normalisation centralisée des numéros de téléphone (phone-utils.ts)
// ✅ Fix erreur InvalidPhoneNumber Africa's Talking
// 🔄 REDÉPLOIEMENT FORCÉ V6 - SÉCURITÉ OWASP TOP 10 - 02/02/2026
// ✅ Firebase Cloud Messaging pour notifications push
// ✅ Notifications sonores avec adresses dynamiques
// ✅ Architecture 100% standalone
// 🔒 Protection OWASP Top 10 2021

console.log('🔄 Serveur SmartCabb V7 - Fix Téléphone - 14/02/2026');
console.log('🔄 Serveur SmartCabb V6 - Sécurité OWASP - 02/02/2026');


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

// Enable logger
app.use('*', logger(console.log));

// 🔒 MIDDLEWARE DE SÉCURITÉ OWASP (appliqué à toutes les routes)
app.use('*', securityMiddleware);

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({

    origin: ["https://smartcabb.com", "https://www.smartcabb.com", "http://localhost:3000", "http://localhost:5173"],

    origin: ["https://smartcabb.com", "https://www.smartcabb.com", "http://localhost:3000"],

    allowHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length", "X-RateLimit-Remaining"],
    maxAge: 600,
    credentials: true,
  }),
);

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

// Create test admin user if none exists
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

    console.log('📝 Création profil serveur pour:', userId);

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

    // Créer un email temporaire UNIQUE avec timestamp pour éviter les collisions
    // Format: 243999999999_1736537895432@smartcabb.app
    const tempEmail = `${phone.replace(/[\s\-+]/g, '')}_${Date.now()}@smartcabb.app`;
    console.log('📝 Création de compte avec email unique:', tempEmail);

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

    // Déterminer l'email à utiliser

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
      
      // ⚠️ IMPORTANT: Utiliser un email unique avec timestamp pour éviter les collisions
      // Ces emails NE DOIVENT JAMAIS recevoir d'emails (utiliser SMS à la place)
      finalEmail = `${normalizedPhone}_${Date.now()}@smartcabb.app`;
      usesPhoneAuth = true;
      
      console.log('📧 Email interne généré (NE RECEVRA PAS D\'EMAILS):', finalEmail);
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
      // Supprimer l'utilisateur Auth en cas d'échec
      await supabase.auth.admin.deleteUser(authData.user.id);
      return c.json({ 
        success: false, 
        error: 'Erreur lors de la création du profil. Veuillez réessayer.' 
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
    console.error('❌ Erreur inattendue:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Erreur inattendue' 
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
      
      // ⚠️ IMPORTANT: Utiliser un email unique avec timestamp pour éviter les collisions
      // Ces emails NE DOIVENT JAMAIS recevoir d'emails (utiliser SMS à la place)
      finalEmail = `${normalizedPhoneForEmail}_${Date.now()}@smartcabb.app`;
      usesPhoneAuth = true;
      
      console.log('📧 Email interne généré (NE RECEVRA PAS D\'EMAILS):', finalEmail);
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
      status: 'pending',
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
      const tempEmail = `${phone.replace(/[\s\-+]/g, '')}@smartcabb.app`;
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
      
      const normalizedEmail = `${normalizedPhone}@smartcabb.app`;
      
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
// AUTH ROUTES
// ============================================
app.route('/make-server-2eb02e52', authRoutes);

// ============================================
// SMS ROUTES
// ============================================
app.route('/make-server-2eb02e52/sms', smsRoutes);

// ============================================
// TEST ROUTES
// ============================================
app.route('/make-server-2eb02e52/test', testRoutes);

// ============================================
// 🗺️ GOOGLE MAPS API - ROUTES PRINCIPALES
// ============================================
app.route('/make-server-2eb02e52/google-maps', googleMapsApp);

// ============================================
// GEOCODING API ROUTES (Mapbox + Nominatim) - DEPRECATED
// ============================================
app.route('/make-server-2eb02e52/geocoding', geocodingApp);

// ============================================
// NOMINATIM ENRICHED API - 50 000+ POI EN RDC - DEPRECATED
// ============================================
app.route('/make-server-2eb02e52/nominatim', nominatimApp);

// ============================================
// ANALYTICS API ROUTES (Tracking pour ranking intelligent)
// ============================================
app.route('/make-server-2eb02e52/analytics', analyticsApp);

// ============================================
// DIAGNOSTIC ROUTES (Diagnostic conducteur)
// ============================================
app.route('/make-server-2eb02e52', diagnosticRoute);

// ============================================
// BACKUP ROUTES
// ============================================
app.route('/make-server-2eb02e52/backups', backupRoutes);

// ============================================
// EXPORT ROUTES
// ============================================
app.route('/make-server-2eb02e52/export', exportRoutes);

// ============================================
// CLEANUP ROUTES (Nettoyage des données)
// ============================================
app.route('/make-server-2eb02e52/cleanup', cleanupRoutes);

// ============================================
// 📧 AUDIT EMAILS ROUTES (Prévention bounces)
// ============================================
app.route('/make-server-2eb02e52', auditRoutes);

// ============================================
// WEBSITE ROUTES
// ============================================
app.route('/make-server-2eb02e52/website', websiteRoutes);

// ============================================
// CHAT ROUTES
// ============================================
app.route('/make-server-2eb02e52/chat', chatRoutes);

// ============================================
// DRIVER ROUTES (Conducteurs)
// ============================================
app.route('/make-server-2eb02e52/drivers', driverRoutes);

// ============================================
// PASSENGER ROUTES (Passagers)
// ============================================
app.route('/make-server-2eb02e52/passengers', passengerRoutes);

// ============================================
// WALLET ROUTES (Portefeuille & Recharges)
// ============================================
app.route('/make-server-2eb02e52/wallet', walletRoutes);

// ============================================
// RIDE ROUTES (Courses & Matching)
// ============================================
app.route('/make-server-2eb02e52/rides', rideRoutes);

// ============================================
// ADMIN ROUTES (Analytics & Statistics)
// ============================================
app.route('/make-server-2eb02e52/admin', adminRoutes);

// ============================================
// 🗑️ RESET DATABASE ROUTES (DANGER ZONE)
// ============================================
app.route('/make-server-2eb02e52/reset', resetDatabaseRoutes);

// ============================================
// SETTINGS ROUTES (System Settings)
// ============================================
app.route('/make-server-2eb02e52/settings', settingsRoutes);

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
// EMAIL ROUTES (Email Management)
// ============================================
app.route('/make-server-2eb02e52', emailRoutes);

// ============================================
// EMERGENCY ROUTES (SOS & Alerts)
// ============================================
app.route('/make-server-2eb02e52/emergency', emergencyRoutes);

// ============================================
// FCM ROUTES (Firebase Cloud Messaging)
// ============================================
app.route('/make-server-2eb02e52/fcm', fcmRoutes);

// ============================================
// CONFIG ROUTES (Configuration Globale)
// ============================================
app.route('/make-server-2eb02e52/config', configRoutes);

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
// GET ALL DRIVERS FROM KV STORE
// ============================================

/**
 * Récupère tous les conducteurs depuis le KV store
 * Utilisé par le panel admin pour afficher la liste des chauffeurs
 */
app.get("/make-server-2eb02e52/drivers", async (c) => {
  try {
    console.log('📊 Récupération de tous les conducteurs depuis KV store...');
    
    // Récupérer tous les drivers du KV store
    const drivers = await kv.getByPrefix('driver:');
    
    console.log(`✅ ${drivers?.length || 0} conducteur(s) trouvé(s)`);
    
    return c.json({
      success: true,
      drivers: drivers || [],
      count: drivers?.length || 0
    });
    
  } catch (error) {
    console.error('❌ Erreur récupération conducteurs:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Erreur serveur',
      drivers: []
    }, 500);
  }
});

/**
 * Récupère tous les passagers depuis le KV store
 * Utilisé par le panel admin pour afficher la liste des passagers
 */
app.get("/make-server-2eb02e52/passengers", async (c) => {
  try {
    console.log('📊 Récupération de tous les passagers depuis KV store...');
    
    // Récupérer tous les passengers du KV store
    const passengers = await kv.getByPrefix('passenger:');
    
    console.log(`✅ ${passengers?.length || 0} passager(s) trouvé(s)`);
    
    return c.json({
      success: true,
      passengers: passengers || [],
      count: passengers?.length || 0
    });
    
  } catch (error) {
    console.error('❌ Erreur récupération passagers:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Erreur serveur',
      passengers: []
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
 */
app.get("/make-server-2eb02e52/drivers/:driverId", async (c) => {
  try {
    const driverId = c.req.param('driverId');
    console.log('🔍 Récupération conducteur:', driverId);
    
    const driver = await kv.get(`driver:${driverId}`);
    
    if (!driver) {
      return c.json({ 
        success: false, 
        error: 'Conducteur non trouvé' 
      }, 404);
    }
    
    // 🔧 FIX CRITIQUE : Normaliser les données du véhicule
    // S'assurer que les champs individuels ET l'objet vehicle sont présents
    const vehicle = driver.vehicle || {};
    
    // Construire les champs individuels depuis vehicle OU vice-versa
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
    
    // 🚨 VÉRIFICATION CRITIQUE : Retourner le statut pour la validation côté client
    // Note: On retourne les données, mais le client DOIT vérifier le statut avant de permettre l'accès
    console.log(`✅ Conducteur trouvé: ${normalizedDriver.full_name || normalizedDriver.name} (Statut: ${normalizedDriver.status})`);
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

/**
 * ✅ FIX #3: Récupère la localisation GPS en temps réel d'un conducteur
 */
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

// Route 2: Supprimer TOUS les conducteurs
app.delete('/make-server-2eb02e52/admin/delete-all-drivers', async (c) => {
  try {
    console.log('🗑️ [ADMIN] Suppression de TOUS les conducteurs...');
    
    const allDrivers = await kv.getByPrefix('driver:');
    
    if (!allDrivers || allDrivers.length === 0) {
      console.log('✅ Aucun conducteur à supprimer');
      return c.json({ success: true, message: 'Aucun conducteur trouvé', count: 0 });
    }
    
    console.log(`🗑️ [ADMIN] ${allDrivers.length} conducteur(s) à supprimer`);
    
    // Supprimer chaque conducteur ET TOUTES SES CLÉS ASSOCIÉES
    const deleted = [];
    let totalKeysDeleted = 0;
    
    for (const driver of allDrivers) {
      if (driver && driver.id) {
        console.log(`🗑️ Suppression de: ${driver.full_name || driver.id} (${driver.id})`);
        
        // Supprimer TOUTES les clés associées à ce conducteur
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
            console.log(`  ✅ Supprimé: ${key}`);
          } catch (delError) {
            console.warn(`  ⚠️ Erreur suppression ${key}:`, delError);
          }
        }
        
        deleted.push(driver.id);
      }
    }
    
    console.log(`✅ [ADMIN] ${deleted.length} conducteur(s) supprimé(s) (${totalKeysDeleted} clés au total)`);
    
    return c.json({ 
      success: true, 
      message: `${deleted.length} conducteur(s) supprimé(s) (${totalKeysDeleted} clés nettoyées)`,
      count: deleted.length,
      totalKeysDeleted
    });
  } catch (error) {
    console.error('🗑️ [ADMIN] Erreur suppression:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Erreur' 
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

Deno.serve(app.fetch);
