import { Hono } from "npm:hono";
import * as kv from "./kv-wrapper.ts";

const app = new Hono();

// ⚙️ Route pour récupérer la configuration globale
app.get("/get", async (c) => {
  try {
    const config = await kv.get('smartcabb_global_config');
    
    if (!config) {
      // Retourner config par défaut si aucune config n'existe
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
    }
    
    return c.json({ success: true, config });
  } catch (error) {
    console.error("❌ Erreur récupération config globale:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

// ⚙️ Route pour mettre à jour la configuration globale
app.post("/update", async (c) => {
  try {
    const body = await c.req.json();
    const { config } = body;
    
    if (!config) {
      return c.json({ success: false, error: "Configuration manquante" }, 400);
    }
    
    await kv.set('smartcabb_global_config', config);
    
    console.log('✅ Configuration globale mise à jour');
    return c.json({ success: true, config });
  } catch (error) {
    console.error("❌ Erreur mise à jour config:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

app.get("/app", async (c) => {
  try {
    const config = await kv.get('app:config') || {};
    return c.json({ success: true, config });
  } catch (error) {
    console.error("❌ Erreur config:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

// 🗺️ Route pour récupérer la clé Google Maps API
app.get("/google-maps-key", async (c) => {
  try {
    const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY') || Deno.env.get('GOOGLE_MAPS_SERVER_API_KEY');
    
    if (!apiKey) {
      console.error("❌ GOOGLE_MAPS_API_KEY non configurée dans les variables d'environnement");
      return c.json({ 
        success: false, 
        error: "Clé API Google Maps non configurée" 
      }, 500);
    }
    
    return c.json({ 
      success: true, 
      apiKey 
    });
  } catch (error) {
    console.error("❌ Erreur récupération clé Google Maps:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

// 🗺️ Route pour récupérer la clé Mapbox API
app.get("/mapbox-key", async (c) => {
  try {
    const apiKey = Deno.env.get('MAPBOX_API_KEY');
    
    if (!apiKey) {
      console.error("❌ MAPBOX_API_KEY non configurée dans les variables d'environnement");
      return c.json({ 
        success: false, 
        error: "Clé API Mapbox non configurée" 
      }, 500);
    }
    
    return c.json({ 
      success: true, 
      apiKey 
    });
  } catch (error) {
    console.error("❌ Erreur récupération clé Mapbox:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

export default app;