import { Hono } from "npm:hono";
import * as kv from "./kv-wrapper.tsx";

const app = new Hono();

// ============================================
// METTRE À JOUR LES PARAMÈTRES SYSTÈME
// ============================================
app.post('/update', async (c) => {
  try {
    const body = await c.req.json();
    const { 
      exchangeRate, 
      postpaidInterestRate,
      emailNotifications,
      smsNotifications,
      pushNotifications,
      updatedAt
    } = body;

    console.log('🔧 Mise à jour paramètres système:', {
      exchangeRate,
      postpaidInterestRate,
      emailNotifications,
      smsNotifications,
      pushNotifications
    });

    // Validation
    if (!exchangeRate || !postpaidInterestRate) {
      return c.json({ 
        success: false, 
        error: 'Paramètres manquants' 
      }, 400);
    }

    // Sauvegarder dans le KV store
    const systemSettings = {
      exchangeRate: parseFloat(exchangeRate),
      postpaidInterestRate: parseFloat(postpaidInterestRate),
      emailNotifications: emailNotifications ?? true,
      smsNotifications: smsNotifications ?? false,
      pushNotifications: pushNotifications ?? true,
      updatedAt: updatedAt || new Date().toISOString()
    };

    await kv.set('system_settings', systemSettings);

    console.log('✅ Paramètres système sauvegardés dans KV store');

    return c.json({
      success: true,
      settings: systemSettings,
      message: 'Paramètres système sauvegardés avec succès'
    });

  } catch (error) {
    console.error('❌ Erreur sauvegarde paramètres:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Erreur serveur' 
    }, 500);
  }
});

// ============================================
// RÉCUPÉRER LES PARAMÈTRES SYSTÈME (Route directe)
// ============================================
app.get('/', async (c) => {
  try {
    console.log('🔍 Récupération paramètres système (route directe)');

    const systemSettings = await kv.get('system_settings');

    if (!systemSettings) {
      // Retourner les valeurs par défaut
      const defaultSettings = {
        exchangeRate: 2000,
        postpaidInterestRate: 15,
        emailNotifications: true,
        smsNotifications: false,
        pushNotifications: true
      };

      console.log('ℹ️ Aucun paramètre trouvé, utilisation valeurs par défaut');

      return c.json(defaultSettings);
    }

    console.log('✅ Paramètres système trouvés:', systemSettings);

    return c.json(systemSettings);

  } catch (error) {
    console.error('❌ Erreur récupération paramètres:', error);
    return c.json({ 
      error: error instanceof Error ? error.message : 'Erreur serveur' 
    }, 500);
  }
});

// ============================================
// RÉCUPÉRER LES PARAMÈTRES SYSTÈME
// ============================================
app.get('/get', async (c) => {
  try {
    console.log('🔍 Récupération paramètres système');

    const systemSettings = await kv.get('system_settings');

    if (!systemSettings) {
      // Retourner les valeurs par défaut
      const defaultSettings = {
        exchangeRate: 2000, // 🔄 Mis à jour : valeur par défaut synchronisée
        postpaidInterestRate: 15,
        emailNotifications: true,
        smsNotifications: false,
        pushNotifications: true
      };

      console.log('ℹ️ Aucun paramètre trouvé, utilisation valeurs par défaut');

      return c.json({
        success: true,
        settings: defaultSettings,
        isDefault: true
      });
    }

    console.log('✅ Paramètres système trouvés');

    return c.json({
      success: true,
      settings: systemSettings,
      isDefault: false
    });

  } catch (error) {
    console.error('❌ Erreur récupération paramètres:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Erreur serveur' 
    }, 500);
  }
});

export default app;