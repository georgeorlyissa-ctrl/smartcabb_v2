import { Hono } from 'npm:hono@4';
import * as kv from './kv-wrapper.ts';

const emailRoutes = new Hono();

// ============================================
// 📧 CONFIGURATION EMAIL
// ============================================

// Récupérer la configuration email
emailRoutes.get('/admin/email-config', async (c) => {
  try {
    const config = await kv.get('system:email_config') || {
      provider: 'sendgrid',
      fromEmail: 'contact@smartcabb.com',
      fromName: 'SmartCabb',
      replyToEmail: 'support@smartcabb.com',
      isConfigured: false,
      isEnabled: false
    };

    return c.json({ success: true, config });
  } catch (error) {
    console.error('❌ Erreur récupération config email:', error);
    return c.json({ success: false, error: 'Erreur serveur' }, 500);
  }
});

// 🆕 RÉINITIALISER LA CONFIGURATION EMAIL (Force SendGrid)
emailRoutes.post('/admin/email-config/reset', async (c) => {
  try {
    const defaultConfig = {
      provider: 'sendgrid',
      fromEmail: 'contact@smartcabb.com',
      fromName: 'SmartCabb',
      replyToEmail: 'support@smartcabb.com',
      isConfigured: false,
      isEnabled: false
    };

    await kv.set('system:email_config', defaultConfig);

    console.log('✅ Configuration email réinitialisée avec SendGrid par défaut');

    return c.json({ success: true, config: defaultConfig });
  } catch (error) {
    console.error('❌ Erreur réinitialisation config email:', error);
    return c.json({ success: false, error: 'Erreur serveur' }, 500);
  }
});

// Sauvegarder la configuration email
emailRoutes.post('/admin/email-config', async (c) => {
  try {
    const config = await c.req.json();
    
    // Marquer comme configuré si une clé API est fournie
    config.isConfigured = !!(
      config.resendApiKey || 
      config.sendgridApiKey || 
      (config.smtpHost && config.smtpUser && config.smtpPassword)
    );

    await kv.set('system:email_config', config);

    console.log('✅ Configuration email sauvegardée:', {
      provider: config.provider,
      fromEmail: config.fromEmail,
      isConfigured: config.isConfigured,
      isEnabled: config.isEnabled
    });

    return c.json({ success: true, config });
  } catch (error) {
    console.error('❌ Erreur sauvegarde config email:', error);
    return c.json({ success: false, error: 'Erreur serveur' }, 500);
  }
});

// ============================================
// 📤 ENVOI D'EMAILS
// ============================================

// Fonction helper pour envoyer via Resend
async function sendViaResend(apiKey: string, emailData: any) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `${emailData.fromName} <${emailData.from}>`,
      to: emailData.to,
      reply_to: emailData.replyTo,
      subject: emailData.subject,
      html: emailData.html,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erreur Resend');
  }

  return await response.json();
}

// Fonction helper pour envoyer via SendGrid
async function sendViaSendGrid(apiKey: string, emailData: any) {
  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{
        to: [{ email: emailData.to }],
      }],
      from: {
        email: emailData.from,
        name: emailData.fromName,
      },
      reply_to: {
        email: emailData.replyTo,
      },
      subject: emailData.subject,
      content: [{
        type: 'text/html',
        value: emailData.html,
      }],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('❌ SendGrid error:', error);
    throw new Error(error || 'Erreur SendGrid');
  }

  return { success: true };
}

// Fonction helper pour envoyer via SMTP (nécessite nodemailer)
async function sendViaSMTP(config: any, emailData: any) {
  // Pour SMTP, on utiliserait normalement nodemailer
  // Mais dans Deno, on peut utiliser une alternative
  throw new Error('SMTP non encore implémenté - utilisez Resend ou SendGrid');
}

// Envoyer un email
emailRoutes.post('/send-email', async (c) => {
  try {
    const { to, subject, html, template, templateData } = await c.req.json();

    // Récupérer la configuration
    const config = await kv.get('system:email_config');

    if (!config || !config.isEnabled || !config.isConfigured) {
      console.log('⚠️ Email non configuré - Mode simulation');
      return c.json({ 
        success: true, 
        message: 'Email simulé (configuration manquante)',
        simulated: true 
      });
    }

    // Préparer les données de l'email
    let emailHtml = html;

    // Si un template est fourni, le charger et remplacer les variables
    if (template) {
      const templateHtml = await getEmailTemplate(template);
      emailHtml = replaceTemplateVariables(templateHtml, templateData || {});
    }

    const emailData = {
      from: config.fromEmail,
      fromName: config.fromName,
      replyTo: config.replyToEmail,
      to,
      subject,
      html: emailHtml,
    };

    // Envoyer selon le provider
    let result;
    switch (config.provider) {
      case 'resend':
        if (!config.resendApiKey) {
          throw new Error('Clé API Resend manquante');
        }
        result = await sendViaResend(config.resendApiKey, emailData);
        break;

      case 'sendgrid':
        // Utiliser la clé d'environnement si aucune clé n'est fournie
        const sendgridKey = config.sendgridApiKey || Deno.env.get('SENDGRID_API_KEY');
        if (!sendgridKey) {
          throw new Error('Clé API SendGrid manquante. Veuillez configurer SENDGRID_API_KEY dans l\'environnement ou sauvegarder votre configuration.');
        }
        result = await sendViaSendGrid(sendgridKey, emailData);
        break;

      case 'smtp':
        result = await sendViaSMTP(config, emailData);
        break;

      default:
        throw new Error('Provider email non supporté');
    }

    // Sauvegarder dans l'historique
    const emailLog = {
      id: crypto.randomUUID(),
      to,
      subject,
      provider: config.provider,
      status: 'sent',
      sentAt: new Date().toISOString(),
      result,
    };

    const logs = await kv.get('system:email_logs') || [];
    logs.unshift(emailLog);
    // Garder seulement les 1000 derniers emails
    await kv.set('system:email_logs', logs.slice(0, 1000));

    console.log('✅ Email envoyé:', { to, subject, provider: config.provider });

    return c.json({ success: true, result });

  } catch (error: any) {
    console.error('❌ Erreur envoi email:', error);
    
    // Sauvegarder l'erreur dans l'historique
    try {
      const { to, subject } = await c.req.json();
      const config = await kv.get('system:email_config');
      
      const emailLog = {
        id: crypto.randomUUID(),
        to,
        subject,
        provider: config?.provider || 'unknown',
        status: 'failed',
        error: error.message,
        sentAt: new Date().toISOString(),
      };

      const logs = await kv.get('system:email_logs') || [];
      logs.unshift(emailLog);
      await kv.set('system:email_logs', logs.slice(0, 1000));
    } catch (logError) {
      console.error('❌ Erreur sauvegarde log:', logError);
    }

    return c.json({ 
      success: false, 
      error: error.message || 'Erreur envoi email' 
    }, 500);
  }
});

// Test de connexion email
emailRoutes.post('/admin/test-email', async (c) => {
  try {
    const { to, config } = await c.req.json();

    if (!to) {
      return c.json({ success: false, error: 'Email destinataire requis' }, 400);
    }

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .success { background: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 SmartCabb Email Test</h1>
            </div>
            <div class="content">
              <div class="success">
                <strong>✅ Succès !</strong>
                <p>Votre configuration email SmartCabb fonctionne parfaitement.</p>
              </div>
              
              <h2>Détails de la configuration :</h2>
              <ul>
                <li><strong>Provider:</strong> ${config.provider.toUpperCase()}</li>
                <li><strong>From:</strong> ${config.fromName} <${config.fromEmail}></li>
                <li><strong>Reply-To:</strong> ${config.replyToEmail}</li>
                <li><strong>Date:</strong> ${new Date().toLocaleString('fr-FR', { timeZone: 'Africa/Kinshasa' })}</li>
              </ul>

              <p>Si vous recevez cet email, cela signifie que :</p>
              <ul>
                <li>✅ Vos identifiants API sont corrects</li>
                <li>✅ La connexion au serveur email fonctionne</li>
                <li>✅ SmartCabb peut envoyer des emails transactionnels</li>
              </ul>

              <p>Vous pouvez maintenant utiliser cette configuration pour :</p>
              <ul>
                <li>📧 Confirmations de réservation</li>
                <li>🔔 Notifications aux conducteurs</li>
                <li>🧾 Factures et reçus</li>
                <li>🔐 Réinitialisation de mots de passe</li>
                <li>📊 Rapports administratifs</li>
              </ul>
            </div>
            <div class="footer">
              <p>SmartCabb - Transport intelligent en RDC</p>
              <p>Kinshasa, République Démocratique du Congo</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const emailData = {
      from: config.fromEmail,
      fromName: config.fromName,
      replyTo: config.replyToEmail,
      to,
      subject: '✅ Test de configuration email SmartCabb',
      html: emailHtml,
    };

    let result;
    switch (config.provider) {
      case 'resend':
        if (!config.resendApiKey) {
          throw new Error('Clé API Resend manquante');
        }
        result = await sendViaResend(config.resendApiKey, emailData);
        break;

      case 'sendgrid':
        // Utiliser la clé d'environnement si aucune clé n'est fournie
        const sendgridKey = config.sendgridApiKey || Deno.env.get('SENDGRID_API_KEY');
        if (!sendgridKey) {
          throw new Error('Clé API SendGrid manquante. Veuillez configurer SENDGRID_API_KEY dans l\'environnement ou sauvegarder votre configuration.');
        }
        result = await sendViaSendGrid(sendgridKey, emailData);
        break;

      case 'smtp':
        result = await sendViaSMTP(config, emailData);
        break;

      default:
        throw new Error('Provider email non supporté');
    }

    console.log('✅ Email de test envoyé à:', to);

    return c.json({ success: true, result });

  } catch (error: any) {
    console.error('❌ Erreur test email:', error);
    return c.json({ 
      success: false, 
      error: error.message || 'Erreur test email' 
    }, 500);
  }
});

// Récupérer l'historique des emails
emailRoutes.get('/admin/email-logs', async (c) => {
  try {
    const logs = await kv.get('system:email_logs') || [];
    return c.json({ success: true, logs });
  } catch (error) {
    console.error('❌ Erreur récupération logs:', error);
    return c.json({ success: false, error: 'Erreur serveur' }, 500);
  }
});

// ============================================
// 🚀 TEST RAPIDE SENDGRID (avec clé env)
// ============================================

// Test rapide SendGrid avec la clé d'environnement
emailRoutes.post('/admin/quick-test-sendgrid', async (c) => {
  try {
    const { to } = await c.req.json();

    if (!to) {
      return c.json({ success: false, error: 'Email destinataire requis' }, 400);
    }

    // Récupérer la clé API depuis l'environnement
    const sendgridApiKey = Deno.env.get('SENDGRID_API_KEY');
    
    if (!sendgridApiKey) {
      return c.json({ 
        success: false, 
        error: 'SENDGRID_API_KEY non configurée dans l\'environnement' 
      }, 400);
    }

    console.log('🔑 Clé SendGrid trouvée dans l\'environnement');

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .success { background: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 5px; }
            .info-box { background: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 5px; }
            .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
            ul { line-height: 1.8; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 SendGrid est Configuré !</h1>
            </div>
            <div class="content">
              <div class="success">
                <strong>✅ Félicitations !</strong>
                <p>SendGrid est maintenant opérationnel sur SmartCabb.</p>
              </div>
              
              <h2>📧 Configuration Email Active</h2>
              <div class="info-box">
                <ul>
                  <li><strong>Provider:</strong> SendGrid</li>
                  <li><strong>Expéditeur:</strong> SmartCabb &lt;contact@smartcabb.com&gt;</li>
                  <li><strong>Limite gratuite:</strong> 100 emails/jour</li>
                  <li><strong>Date de test:</strong> ${new Date().toLocaleString('fr-FR', { timeZone: 'Africa/Kinshasa' })}</li>
                </ul>
              </div>

              <h2>✨ Fonctionnalités Activées</h2>
              <p>SmartCabb peut maintenant envoyer automatiquement :</p>
              <ul>
                <li>📧 <strong>Confirmations de réservation</strong> - Détails complets de la course</li>
                <li>🔔 <strong>Notifications aux conducteurs</strong> - Nouvelles demandes de course</li>
                <li>🧾 <strong>Factures électroniques</strong> - Reçus de paiement détaillés</li>
                <li>🔐 <strong>Codes de vérification</strong> - Sécurité des comptes</li>
                <li>📊 <strong>Rapports administratifs</strong> - Statistiques quotidiennes/hebdomadaires</li>
                <li>💰 <strong>Notifications de solde</strong> - Rechargements et transactions</li>
              </ul>

              <h2>🇨🇩 Configuration Congo</h2>
              <p>Tous les emails sont optimisés pour la RDC :</p>
              <ul>
                <li>✅ Montants en Franc Congolais (CDF)</li>
                <li>✅ Fuseau horaire Africa/Kinshasa</li>
                <li>✅ Interface en français</li>
                <li>✅ Support local via contact@smartcabb.com</li>
              </ul>

              <div class="info-box">
                <strong>💡 Astuce :</strong> Vous pouvez surveiller tous les emails envoyés depuis le panel administrateur dans la section "Historique des emails".
              </div>
            </div>
            <div class="footer">
              <p><strong>SmartCabb</strong> - Transport intelligent en République Démocratique du Congo</p>
              <p>📍 Kinshasa • 📧 contact@smartcabb.com</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const emailData = {
      from: 'contact@smartcabb.com',
      fromName: 'SmartCabb',
      replyTo: 'contact@smartcabb.com',
      to,
      subject: '🎉 SendGrid Configuré - SmartCabb est Prêt !',
      html: emailHtml,
    };

    const result = await sendViaSendGrid(sendgridApiKey, emailData);

    // Sauvegarder dans l'historique
    const emailLog = {
      id: crypto.randomUUID(),
      to,
      subject: emailData.subject,
      provider: 'sendgrid',
      status: 'sent',
      sentAt: new Date().toISOString(),
      result,
    };

    const logs = await kv.get('system:email_logs') || [];
    logs.unshift(emailLog);
    await kv.set('system:email_logs', logs.slice(0, 1000));

    console.log('✅ Email de test SendGrid envoyé à:', to);

    return c.json({ success: true, result });

  } catch (error: any) {
    console.error('❌ Erreur test SendGrid:', error);
    return c.json({ 
      success: false, 
      error: error.message || 'Erreur test SendGrid' 
    }, 500);
  }
});

// ============================================
// 📄 TEMPLATES D'EMAILS
// ============================================

async function getEmailTemplate(templateName: string): Promise<string> {
  const templates: { [key: string]: string } = {
    'ride-confirmation': `
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family: Arial, sans-serif;">
          <h1>Confirmation de réservation</h1>
          <p>Bonjour {{passengerName}},</p>
          <p>Votre course SmartCabb a été confirmée.</p>
          <p><strong>ID:</strong> {{rideId}}</p>
          <p><strong>Conducteur:</strong> {{driverName}}</p>
          <p><strong>Départ:</strong> {{pickup}}</p>
          <p><strong>Destination:</strong> {{destination}}</p>
          <p><strong>Prix:</strong> {{price}}</p>
        </body>
      </html>
    `,
    'welcome': `
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family: Arial, sans-serif;">
          <h1>Bienvenue sur SmartCabb !</h1>
          <p>Bonjour {{name}},</p>
          <p>Merci de rejoindre SmartCabb, votre solution de transport en RDC.</p>
        </body>
      </html>
    `,
  };

  return templates[templateName] || templates['welcome'];
}

function replaceTemplateVariables(template: string, data: { [key: string]: any }): string {
  let result = template;
  
  for (const [key, value] of Object.entries(data)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
  }
  
  return result;
}

export default emailRoutes;