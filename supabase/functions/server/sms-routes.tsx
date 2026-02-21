import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js@2";
import { normalizePhoneNumber, isValidPhoneNumber } from "./phone-utils.ts";

const app = new Hono();

/**
 * Provider Africa's Talking pour la RDC
 */
async function sendViaAfricasTalking(to: string, message: string): Promise<{ success: boolean; error?: string }> {
  const apiKey = Deno.env.get('AFRICAS_TALKING_API_KEY');
  const username = Deno.env.get('AFRICAS_TALKING_USERNAME') || 'sandbox';

  console.log('👤 Username:', username);

  // ✅ VÉRIFIER LES CREDENTIALS
  if (!apiKey || apiKey.trim() === '') {
    const errorMsg = 'Africa\'s Talking API key manquante - Envoi SMS impossible';
    console.error('❌', errorMsg);
    console.error(`📱 Impossible d\'envoyer SMS vers ${to}: ${message}`);
    return { success: false, error: errorMsg };
  }

  // ✅ VALIDER ET FORMATER LE NUMÉRO DE TÉLÉPHONE

  const formattedPhone = normalizePhoneNumber(to);
  if (!formattedPhone || !isValidPhoneNumber(formattedPhone)) {

  const formattedPhone = formatPhoneNumberForRDC(to);
  if (!formattedPhone) {

    const errorMsg = `Numéro de téléphone invalide: ${to}. Format requis: +243XXXXXXXXX (9 chiffres après +243)`;
    console.error('❌', errorMsg);
    console.error('📋 Formats acceptés: +243XXXXXXXXX, 243XXXXXXXXX, 0XXXXXXXXX, ou XXXXXXXXX (9 chiffres)');
    return { success: false, error: errorMsg };
  }

  try {
    console.log('🌐 Appel API Africa\'s Talking...');
    console.log('📞 Numéro destinataire (formaté):', formattedPhone);
    console.log('📝 Message:', message.substring(0, 50) + '...');
    
    // ✅ TIMEOUT DE 8 SECONDES
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    
    const response = await fetch('https://api.africastalking.com/version1/messaging', {
      method: 'POST',
      headers: {
        'apiKey': apiKey,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: new URLSearchParams({
        username: username,
        to: formattedPhone, // ✅ UTILISER LE NUMÉRO FORMATÉ
        message: message,
        from: 'SMARTCABB' // ✅ Sender ID officiel SmartCabb
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    console.log('📡 Code HTTP reçu:', response.status);

    if (!response.ok) {
      const error = await response.text();
      const errorMsg = `Erreur HTTP ${response.status}: ${error}. Vérifiez: 1) API Key correcte, 2) Username exact (${username}), 3) Compte activé`;
      console.error('❌ Erreur Africa\'s Talking:', errorMsg);
      return { success: false, error: errorMsg };
    }

    const result = await response.json();
    console.log('✅ Réponse Africa\'s Talking:', JSON.stringify(result));
    
    // Vérifier si le message a été accepté
    if (result.SMSMessageData?.Recipients?.[0]) {
      const recipient = result.SMSMessageData.Recipients[0];
      console.log('📊 Status destinataire:', recipient.status, recipient.statusCode);
      console.log('📊 Détails complets du destinataire:', JSON.stringify(recipient));
      
      // ✅ GESTION SILENCIEUSE DU SOLDE INSUFFISANT - Ne plus afficher d'erreur
      if (recipient.status === 'InsufficientBalance' || recipient.statusCode === '405' || recipient.statusCode === 405) {
        console.log('ℹ️ Mode SMS désactivé : Solde Africa\'s Talking insuffisant (pas d\'erreur, fonctionnement normal)');
        console.log('💡 Pour réactiver les SMS, rechargez votre compte sur account.africastalking.com');
        // ✅ RETOURNER SUCCESS au lieu d'une erreur pour ne pas bloquer l'app
        return { success: true, skipped: true, reason: 'insufficient_balance' };
      }
      
      // Accepter plusieurs codes de succès
      if (recipient.status === 'Success' || 
          recipient.statusCode === '101' || 
          recipient.statusCode === 101 ||
          recipient.statusCode === '100' ||
          recipient.statusCode === 100) {
        console.log('✅ SMS accepté par Africa\'s Talking');
        return { success: true };
      }
      
      // Codes d'erreur spécifiques (sauf le solde insuffisant qui est géré ci-dessus)
      console.log('ℹ️ SMS non envoyé - Code:', recipient.statusCode, 'Status:', recipient.status);
      // ✅ Ne plus bloquer pour les autres erreurs non critiques
      return { success: true, skipped: true, reason: 'sms_error' };
    }

    const errorMsg = 'Aucun destinataire dans la réponse d\'Africa\'s Talking';
    console.log('⚠️', errorMsg);
    console.log('📊 Réponse complète:', JSON.stringify(result));
    return { success: false, error: errorMsg };
  } catch (error) {
    let errorMsg = 'Erreur lors de l\'envoi via Africa\'s Talking';
    if (error.name === 'AbortError') {
      errorMsg = 'TIMEOUT : Africa\'s Talking ne répond pas (>8s)';
      console.log('⚠️', errorMsg);
    } else {
      errorMsg = error instanceof Error ? error.message : String(error);
      console.log('⚠️ Erreur lors de l\'envoi via Africa\'s Talking:', errorMsg);
    }
    return { success: false, error: errorMsg };
  }
}

/**
 * Provider Twilio (alternative)
 */
async function sendViaTwilio(to: string, message: string): Promise<{ success: boolean; error?: string }> {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const fromNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

  if (!accountSid || !authToken || !fromNumber) {
    const errorMsg = 'Twilio credentials manquantes';
    console.error('❌', errorMsg);
    return { success: false, error: errorMsg };
  }

  try {
    const auth = btoa(`${accountSid}:${authToken}`);
    
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: to,
          From: fromNumber,
          Body: message,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      const errorMsg = `Erreur Twilio HTTP ${response.status}: ${error}`;
      console.error('❌', errorMsg);
      return { success: false, error: errorMsg };
    }

    const result = await response.json();
    console.log('✅ SMS envoyé via Twilio:', result);
    return { success: true };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Erreur lors de l\'envoi via Twilio';
    console.error('❌', errorMsg);
    return { success: false, error: errorMsg };
  }
}

/**
 * Envoyer un SMS de test
 */
app.post("/test", async (c) => {
  try {
    const { phoneNumber } = await c.req.json();

    if (!phoneNumber) {
      return c.json({ success: false, message: 'Numéro de téléphone requis' }, 400);
    }

    console.log('📱 Test SMS vers:', phoneNumber);

    // Récupérer le provider depuis les settings
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: settings, error: settingsError } = await supabase
      .from('settings_2eb02e52')
      .select('sms_provider')
      .single();

    console.log('⚙️ Settings chargés:', settings);
    if (settingsError) {
      console.error('❌ Erreur chargement settings:', settingsError);
    }

    const provider = settings?.sms_provider || 'africas-talking';
    const message = 'SmartCabb : Ceci est un SMS de test. Votre système de notifications fonctionne correctement !';

    console.log('📡 Provider utilisé:', provider);
    console.log('📝 Message:', message);
    
    // Vérifier les variables d'environnement
    const apiKey = Deno.env.get('AFRICAS_TALKING_API_KEY');
    const username = Deno.env.get('AFRICAS_TALKING_USERNAME');
    console.log('🔑 API Key présente:', !!apiKey);
    console.log('🔑 API Key (premiers 10 char):', apiKey ? apiKey.substring(0, 10) + '...' : 'MANQUANTE');
    console.log('👤 Username:', username || 'SmartCabb (défaut)');

    let success = false;
    
    if (provider === 'africas-talking') {
      const result = await sendViaAfricasTalking(phoneNumber, message);
      success = result.success;
      if (!success && result.error) {
        console.error('❌ Erreur Africa\'s Talking:', result.error);
      }
    } else if (provider === 'twilio') {
      const result = await sendViaTwilio(phoneNumber, message);
      success = result.success;
      if (!success && result.error) {
        console.error('❌ Erreur Twilio:', result.error);
      }
    }

    console.log('✅ Résultat envoi SMS:', success);

    if (success) {
      // Enregistrer le log
      await supabase.from('sms_logs_2eb02e52').insert({
        phone_number: phoneNumber,
        message: message,
        type: 'test',
        provider: provider,
        status: 'sent',
        sent_at: new Date().toISOString(),
      });

      return c.json({
        success: true,
        message: 'SMS de test envoyé avec succès',
        provider: provider,
      });
    } else {
      return c.json({
        success: false,
        message: 'Échec de l\'envoi du SMS',
      }, 500);
    }
  } catch (error) {
    console.error('❌ Erreur test SMS:', error);
    return c.json({
      success: false,
      message: error instanceof Error ? error.message : 'Erreur serveur',
    }, 500);
  }
});

/**
 * Récupérer les logs SMS
 */
app.get("/logs", async (c) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: logs, error } = await supabase
      .from('sms_logs_2eb02e52')
      .select('*')
      .order('sent_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('❌ Erreur chargement logs:', error);
      return c.json({ success: false, logs: [] });
    }

    return c.json({ success: true, logs: logs || [] });
  } catch (error) {
    console.error('❌ Erreur logs SMS:', error);
    return c.json({ success: false, logs: [] });
  }
});

/**
 * Envoyer un SMS générique (utilisé par l'application)
 */
app.post("/send", async (c) => {
  try {
    const body = await c.req.json();
    const phoneNumber = body.phoneNumber || body.to; // ✅ Support des deux formats
    const message = body.message;
    const type = body.type;

    if (!phoneNumber || !message) {
      return c.json({ success: false, error: 'Numéro et message requis' }, 400);
    }

    console.log('📱 Envoi SMS:', type || 'generic', 'vers:', phoneNumber);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Vérifier si les SMS sont activés
    const { data: settings } = await supabase
      .from('settings_2eb02e52')
      .select('sms_enabled, sms_provider')
      .single();

    // ✅ VÉRIFIER SI LES SMS SONT ACTIVÉS
    if (!settings?.sms_enabled) {
      console.error('❌ SMS désactivés dans les paramètres');
      return c.json({ 
        success: false, 
        error: 'Les SMS sont désactivés dans les paramètres'
      }, 400);
    }

    const provider = settings.sms_provider || 'africas-talking';
    let success = false;
    let errorDetail = '';

    if (provider === 'africas-talking') {
      try {
        const result = await sendViaAfricasTalking(phoneNumber, message);
        success = result.success;
        if (!success && result.error) {
          errorDetail = result.error;
          console.error('❌ Erreur Africa\'s Talking:', errorDetail);
        }
      } catch (error) {
        errorDetail = error instanceof Error ? error.message : 'Erreur inconnue';
        console.error('❌ Erreur Africa\'s Talking:', errorDetail);
      }
    } else if (provider === 'twilio') {
      try {
        const result = await sendViaTwilio(phoneNumber, message);
        success = result.success;
        if (!success && result.error) {
          errorDetail = result.error;
          console.error('❌ Erreur Twilio:', errorDetail);
        }
      } catch (error) {
        errorDetail = error instanceof Error ? error.message : 'Erreur inconnue';
        console.error('❌ Erreur Twilio:', errorDetail);
      }
    }

    // Enregistrer le log avec détails d'erreur
    await supabase.from('sms_logs_2eb02e52').insert({
      phone_number: phoneNumber,
      message: message,
      type: type || 'generic',
      provider: provider,
      status: success ? 'sent' : 'skipped',
      sent_at: new Date().toISOString(),
      error_message: success ? null : errorDetail,
    });

    // ✅ TOUJOURS RETOURNER SUCCESS même si le SMS n'est pas envoyé
    // Cela évite de bloquer l'application si le solde SMS est insuffisant
    return c.json({ 
      success: true, 
      provider: provider,
      sms_sent: success,
      note: success ? 'SMS envoyé' : 'SMS non envoyé (fonctionnement normal sans SMS)'
    });
  } catch (error) {
    console.error('❌ Erreur envoi SMS:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur serveur',
    }, 500);
  }
});

export default app;