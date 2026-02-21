import { Hono } from 'npm:hono';
import * as kv from './kv-wrapper.ts';

const app = new Hono();

// 🚨 POST /emergency/sos - Déclencher une alerte SOS
app.post('/sos', async (c) => {
  try {
    const sosData = await c.req.json();
    
    console.log('🚨 Alerte SOS reçue:', sosData);

    // Générer un ID unique pour l'alerte SOS
    const sosId = `sos_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    // Enregistrer l'alerte dans le KV store
    const sosAlert = {
      id: sosId,
      userId: sosData.userId,
      userName: sosData.userName,
      userPhone: sosData.userPhone,
      rideId: sosData.rideId,
      driverName: sosData.driverName,
      driverPhone: sosData.driverPhone,
      vehicleInfo: sosData.vehicleInfo,
      currentLocation: sosData.currentLocation,
      timestamp: sosData.timestamp,
      status: 'active', // active, resolved
      createdAt: new Date().toISOString()
    };

    await kv.set(`sos:${sosId}`, sosAlert);
    
    // Ajouter à la liste des alertes actives
    const activeAlerts = await kv.get('sos:active') || [];
    activeAlerts.push(sosId);
    await kv.set('sos:active', activeAlerts);

    // TODO: En production, envoyer des notifications SMS/Email aux services d'urgence
    // Exemples:
    // - Police: +243 XXX XXX XXX
    // - Service SmartCabb: admin@smartcabb.com
    // - Contacts d'urgence de l'utilisateur

    console.log('✅ Alerte SOS enregistrée:', sosId);

    return c.json({
      success: true,
      sosId: sosId,
      message: 'Alerte SOS envoyée avec succès'
    });
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi de l\'alerte SOS:', error);
    return c.json(
      { 
        success: false, 
        error: 'Erreur lors de l\'envoi de l\'alerte SOS',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      500
    );
  }
});

// 📋 GET /emergency/sos/active - Récupérer toutes les alertes SOS actives
app.get('/sos/active', async (c) => {
  try {
    const activeAlertIds = await kv.get('sos:active') || [];
    const alerts = [];

    for (const sosId of activeAlertIds) {
      const alert = await kv.get(`sos:${sosId}`);
      if (alert && alert.status === 'active') {
        alerts.push(alert);
      }
    }

    return c.json({
      success: true,
      alerts: alerts
    });
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des alertes:', error);
    return c.json(
      { 
        success: false, 
        error: 'Erreur lors de la récupération des alertes',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      500
    );
  }
});

// ✅ PUT /emergency/sos/:sosId/resolve - Résoudre une alerte SOS
app.put('/sos/:sosId/resolve', async (c) => {
  try {
    const { sosId } = c.req.param();
    
    const alert = await kv.get(`sos:${sosId}`);
    
    if (!alert) {
      return c.json({ success: false, error: 'Alerte SOS non trouvée' }, 404);
    }

    alert.status = 'resolved';
    alert.resolvedAt = new Date().toISOString();
    
    await kv.set(`sos:${sosId}`, alert);

    // Retirer de la liste des alertes actives
    const activeAlerts = await kv.get('sos:active') || [];
    const updatedAlerts = activeAlerts.filter((id: string) => id !== sosId);
    await kv.set('sos:active', updatedAlerts);

    console.log('✅ Alerte SOS résolue:', sosId);

    return c.json({
      success: true,
      message: 'Alerte SOS résolue'
    });
  } catch (error) {
    console.error('❌ Erreur lors de la résolution de l\'alerte:', error);
    return c.json(
      { 
        success: false, 
        error: 'Erreur lors de la résolution de l\'alerte',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      500
    );
  }
});

export default app;
