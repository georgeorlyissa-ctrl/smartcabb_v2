// Chat routes for SmartCabb
// Handles real-time messaging between drivers and passengers with intelligent auto-replies

import { Hono } from 'npm:hono@3';
import { cors } from 'npm:hono/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { generateAutoReply, analyzeSentiment } from './chat-auto-replies.tsx';
import * as kv from './kv-wrapper.ts';

import { normalizePhoneNumber, isValidPhoneNumber } from './phone-utils.ts';



const app = new Hono();

// CORS pour permettre les requêtes du site web
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// Client Supabase
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================================
// ROUTE: Envoyer un message (depuis le widget)
// ============================================================
app.post('/send', async (c) => {
  try {
    const body = await c.req.json();
    const {
      name,
      email,
      message,
      page,
      source,
      language, // ✅ Récupération de la langue depuis le frontend
    } = body;

    // Validation
    if (!message) {
      return c.json({
        success: false,
        error: 'Message requis',
      }, 400);
    }

    console.log(`📩 Nouveau message chat reçu de ${name || 'Visiteur anonyme'}: "${message.substring(0, 50)}..."`);

    // Créer l'objet message
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const messageObj = {
      id: messageId,
      user_name: name || 'Visiteur anonyme',
      user_email: email || null,
      message: message.trim(),
      page_url: page || '/',
      source: source || 'chat_widget',
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    // Essayer d'insérer dans la table chat_messages
    let messageData = null;
    try {
      const { data, error: messageError } = await supabase
        .from('chat_messages')
        .insert(messageObj)
        .select()
        .single();

      if (messageError) {
        console.warn('⚠️ Table chat_messages non disponible, utilisation du KV:', messageError.message);
        // Fallback: Sauvegarder dans le KV
        await kv.set(`chat_message_${messageId}`, JSON.stringify(messageObj));
        messageData = messageObj;
      } else {
        messageData = data;
        console.log('✅ Message chat enregistré dans la table:', messageData.id);
      }
    } catch (dbError) {
      console.warn('⚠️ Erreur base de données, utilisation du KV fallback:', dbError);
      // Fallback: Sauvegarder dans le KV
      await kv.set(`chat_message_${messageId}`, JSON.stringify(messageObj));
      messageData = messageObj;
      console.log('✅ Message chat enregistré dans KV:', messageId);
    }

    // 🔥 NOTIFICATION SMS AUX ADMINS
    try {
      // Récupérer les paramètres SMS
      const { data: smsSettings } = await supabase
        .from('settings')
        .select('sms_notifications_enabled, admin_phone_numbers')
        .single();

      if (smsSettings?.sms_notifications_enabled && smsSettings?.admin_phone_numbers) {
        const apiKey = Deno.env.get('AFRICAS_TALKING_API_KEY');
        const username = Deno.env.get('AFRICAS_TALKING_USERNAME');

        if (apiKey && username) {
          const phoneNumbers = Array.isArray(smsSettings.admin_phone_numbers) 
            ? smsSettings.admin_phone_numbers 
            : [smsSettings.admin_phone_numbers];

          const smsMessage = `📩 Nouveau message SmartCabb\n\nDe: ${name || 'Visiteur'}\nPage: ${page}\nMessage: "${message.substring(0, 100)}${message.length > 100 ? '...' : ''}"\n\nRépondre: https://chief-mess-97839970.figma.site/admin`;

          // Envoyer SMS à chaque admin
          for (const phoneNumber of phoneNumbers) {
            try {
              // ✅ NORMALISER LE NUMÉRO DE TÉLÉPHONE
              const normalizedPhone = normalizePhoneNumber(phoneNumber);
              
              if (!normalizedPhone || !isValidPhoneNumber(normalizedPhone)) {
                console.error(`❌ Format de numéro invalide pour admin: ${phoneNumber}`);
                continue;
              }
              
              console.log(`📱 Envoi SMS à l'admin: ${phoneNumber} → ${normalizedPhone}`);
              
              const smsResponse = await fetch('https://api.sandbox.africastalking.com/version1/messaging', {
                method: 'POST',
                headers: {
                  'apiKey': apiKey,
                  'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                  username: username,
                  to: normalizedPhone,
                  message: smsMessage,
                  from: 'SMARTCABB' // ✅ Sender ID officiel SmartCabb
                }),
              });

              const smsResult = await smsResponse.json();
              console.log(`📱 SMS envoyé à ${normalizedPhone}:`, smsResult);

              // Logger le SMS dans la table sms_logs
              await supabase.from('sms_logs').insert({
                phone_number: normalizedPhone,
                message: smsMessage,
                status: smsResult.SMSMessageData?.Recipients?.[0]?.status || 'sent',
                provider: 'africastalking',
                type: 'admin_notification',
              });
            } catch (smsError) {
              console.error(`❌ Erreur envoi SMS à ${phoneNumber}:`, smsError);
            }
          }
        } else {
          console.log('⚠️ Clés API Africa\'s Talking manquantes');
        }
      }
    } catch (notifError) {
      console.error('❌ Erreur notification SMS:', notifError);
      // On continue même si la notification échoue
    }

    // 🔥 GÉNÉRATION DE LA RÉPONSE AUTOMATIQUE INTELLIGENTE
    const sentiment = analyzeSentiment(message);
    const userLanguage = (language === 'en') ? 'en' : 'fr'; // Default to French
    const autoReplyData = generateAutoReply(message, userLanguage);
    
    console.log(`🤖 Réponse auto générée - Langue: ${userLanguage}, Catégorie: ${autoReplyData.category}, Confiance: ${autoReplyData.confidence * 100}%`);
    
    // Si sentiment négatif, notifier l'admin en priorité
    if (sentiment === 'negative') {
      console.log('⚠️ Message avec sentiment négatif détecté - Priorité haute');
    }

    const autoReply = {
      message: autoReplyData.reply,
      suggestions: autoReplyData.suggestions,
      category: autoReplyData.category,
      timestamp: new Date().toISOString(),
      isBot: true,
    };

    return c.json({
      success: true,
      message: messageData,
      autoReply,
    });

  } catch (error) {
    console.error('❌ Erreur route /send:', error);
    return c.json({
      success: false,
      error: 'Erreur serveur',
      details: error.message,
    }, 500);
  }
});

// ============================================================
// ROUTE: Récupérer l'historique d'une conversation
// ============================================================
app.get('/conversation/:sessionId', async (c) => {
  try {
    const sessionId = c.req.param('sessionId');

    if (!sessionId) {
      return c.json({
        success: false,
        error: 'Session ID requis',
      }, 400);
    }

    // Récupérer tous les messages de cette session
    const { data: messages, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('❌ Erreur récupération conversation:', error);
      return c.json({
        success: false,
        error: 'Erreur lors de la récupération de la conversation',
      }, 500);
    }

    return c.json({
      success: true,
      messages,
      count: messages.length,
    });

  } catch (error) {
    console.error('❌ Erreur route /conversation:', error);
    return c.json({
      success: false,
      error: 'Erreur serveur',
      details: error.message,
    }, 500);
  }
});

// ============================================================
// ROUTE: Liste de toutes les conversations (ADMIN)
// ============================================================
app.get('/conversations', async (c) => {
  try {
    // Vérifier autorisation admin
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
      return c.json({ success: false, error: 'Non autorisé' }, 401);
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return c.json({ success: false, error: 'Non autorisé' }, 401);
    }

    // Vérifier que c'est un admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return c.json({ success: false, error: 'Accès réservé aux admins' }, 403);
    }

    // Récupérer toutes les conversations
    const { data: conversations, error } = await supabase
      .from('chat_conversations')
      .select('*')
      .order('last_message_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('❌ Erreur récupération conversations:', error);
      return c.json({
        success: false,
        error: 'Erreur lors de la récupération des conversations',
      }, 500);
    }

    return c.json({
      success: true,
      conversations,
      count: conversations.length,
    });

  } catch (error) {
    console.error('❌ Erreur route /conversations:', error);
    return c.json({
      success: false,
      error: 'Erreur serveur',
      details: error.message,
    }, 500);
  }
});

// ============================================================
// ROUTE: Répondre à un message (ADMIN)
// ============================================================
app.post('/reply/:messageId', async (c) => {
  try {
    // Vérifier autorisation admin
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
      return c.json({ success: false, error: 'Non autorisé' }, 401);
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return c.json({ success: false, error: 'Non autorisé' }, 401);
    }

    // Vérifier que c'est un admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return c.json({ success: false, error: 'Accès réservé aux admins' }, 403);
    }

    const messageId = c.req.param('messageId');
    const body = await c.req.json();
    const { reply } = body;

    if (!reply) {
      return c.json({
        success: false,
        error: 'Réponse requise',
      }, 400);
    }

    // Mettre à jour le message avec la réponse
    const { data: updatedMessage, error } = await supabase
      .from('chat_messages')
      .update({
        reply: reply.trim(),
        replied_by: user.id,
        replied_at: new Date().toISOString(),
        status: 'replied',
      })
      .eq('id', messageId)
      .select()
      .single();

    if (error) {
      console.error('❌ Erreur mise à jour message:', error);
      return c.json({
        success: false,
        error: 'Erreur lors de la mise à jour du message',
      }, 500);
    }

    console.log('✅ Réponse admin enregistrée:', messageId);

    // TODO: Optionnel - Envoyer SMS au client si numéro fourni
    if (updatedMessage.user_phone) {
      // Intégration Africa's Talking SMS ici
      console.log('📱 SMS à envoyer à:', updatedMessage.user_phone);
    }

    return c.json({
      success: true,
      message: updatedMessage,
    });

  } catch (error) {
    console.error('❌ Erreur route /reply:', error);
    return c.json({
      success: false,
      error: 'Erreur serveur',
      details: error.message,
    }, 500);
  }
});

// ============================================================
// ROUTE: Marquer une conversation comme résolue (ADMIN)
// ============================================================
app.put('/conversation/:sessionId/resolve', async (c) => {
  try {
    // Vérifier autorisation admin
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
      return c.json({ success: false, error: 'Non autorisé' }, 401);
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return c.json({ success: false, error: 'Non autorisé' }, 401);
    }

    const sessionId = c.req.param('sessionId');

    // Mettre à jour la conversation
    const { data, error } = await supabase
      .from('chat_conversations')
      .update({ status: 'resolved' })
      .eq('session_id', sessionId)
      .select()
      .single();

    if (error) {
      return c.json({
        success: false,
        error: 'Erreur lors de la résolution de la conversation',
      }, 500);
    }

    // Mettre à jour tous les messages de cette session
    await supabase
      .from('chat_messages')
      .update({ status: 'closed' })
      .eq('session_id', sessionId);

    return c.json({
      success: true,
      conversation: data,
    });

  } catch (error) {
    console.error('❌ Erreur route /resolve:', error);
    return c.json({
      success: false,
      error: 'Erreur serveur',
      details: error.message,
    }, 500);
  }
});

// ============================================================
// ROUTE: Statistiques chat (ADMIN)
// ============================================================
app.get('/statistics', async (c) => {
  try {
    // Vérifier autorisation admin
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
      return c.json({ success: false, error: 'Non autorisé' }, 401);
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return c.json({ success: false, error: 'Non autorisé' }, 401);
    }

    // Récupérer les statistiques
    const { data: stats, error } = await supabase
      .from('chat_statistics')
      .select('*')
      .single();

    if (error) {
      console.error('❌ Erreur récupération stats:', error);
      return c.json({
        success: false,
        error: 'Erreur lors de la récupération des statistiques',
      }, 500);
    }

    return c.json({
      success: true,
      statistics: stats,
    });

  } catch (error) {
    console.error('❌ Erreur route /statistics:', error);
    return c.json({
      success: false,
      error: 'Erreur serveur',
      details: error.message,
    }, 500);
  }
});

// ============================================================
// EXPORT
// ============================================================
export default app;