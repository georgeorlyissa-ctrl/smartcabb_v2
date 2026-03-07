import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js@2";
import { normalizePhoneNumber, isValidPhoneNumber } from "./phone-utils.ts";

const app = new Hono();

/**
 * Provider Africa's Talking pour la RDC
 */
async function sendViaAfricasTalking(to: string, message: string): Promise<{ success: boolean; error?: string; silent?: boolean }> {
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
    const errorMsg = `Numéro de téléphone invalide: ${to}. Format requis: +243XXXXXXXXX (9 chiffres après +243)`;
    console.error('❌', errorMsg);
    console.error('📋 Formats acceptés: +243XXXXXXXXX, 243XXXXXXXXX, 0XXXXXXXXX, ou XXXXXXXXX (9 chiffres)');
    return { success: false, error: errorMsg };
  }

  console.log('📱 Envoi SMS vers:', formattedPhone);
  console.log('💬 Message:', message.substring(0, 50) + (message.length > 50 ? '...' : ''));

  try {
    const response = await fetch('https://api.africastalking.com/version1/messaging', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        'apiKey': apiKey
      },
      body: new URLSearchParams({
        username,
        to: formattedPhone,
        message
      })
    });

    const data = await response.json();
    console.log('📤 Réponse Africa\'s Talking:', JSON.stringify(data));

    if (!response.ok) {
      return { success: false, error: data.message || 'Erreur API Africa\'s Talking' };
    }

    if (data.SMSMessageData?.Recipients?.[0]?.status === 'Success') {
      console.log('✅ SMS envoyé avec succès à', formattedPhone);
      return { success: true };
    } else {
      const errorStatus = data.SMSMessageData?.Recipients?.[0]?.status || 'Échec envoi SMS';
      
      // ✅ GESTION SPÉCIFIQUE DE L'ERREUR InsufficientBalance
      if (errorStatus === 'InsufficientBalance') {
        console.warn('⚠️ SOLDE SMS INSUFFISANT - Compte Africa\'s Talking sans crédit');
        console.warn('💡 Rechargez sur: https://account.africastalking.com');
        console.warn(`📱 SMS non envoyé vers ${formattedPhone}: ${message.substring(0, 50)}...`);
        
        // ✅ NE PAS BLOQUER L'APPLICATION - Juste logger l'erreur
        return { 
          success: false, 
          error: 'SMS non envoyé (solde insuffisant)',
          silent: true  // Indicateur pour ne pas afficher l'erreur à l'utilisateur
        };
      }
      
      // Autres erreurs
      console.error('❌ Échec SMS:', errorStatus);
      return { success: false, error: errorStatus };
    }
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi SMS:', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

// 📤 SEND SMS - Envoi de SMS
app.post("/send", async (c) => {
  try {
    const { to, message } = await c.req.json();

    if (!to || !message) {
      return c.json({ success: false, error: "Numéro et message requis" }, 400);
    }

    const result = await sendViaAfricasTalking(to, message);
    
    if (result.success) {
      return c.json({ success: true });
    } else {
      return c.json({ success: false, error: result.error }, 400);
    }
  } catch (error) {
    console.error("❌ Erreur envoi SMS:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

// 📋 GET SMS CONFIG - Récupérer la configuration SMS
app.get("/config", async (c) => {
  try {
    const provider = Deno.env.get('SMS_PROVIDER') || 'africas_talking';
    const isEnabled = Deno.env.get('SMS_ENABLED') !== 'false';
    const apiKey = Deno.env.get('AFRICAS_TALKING_API_KEY');
    const username = Deno.env.get('AFRICAS_TALKING_USERNAME') || 'sandbox';
    
    return c.json({ 
      success: true, 
      config: {
        provider,
        enabled: isEnabled,
        configured: !!apiKey,
        username: username === 'sandbox' ? 'sandbox' : '***' // Masquer le vrai username
      }
    });
  } catch (error) {
    console.error("❌ Erreur récupération config SMS:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

export default app;