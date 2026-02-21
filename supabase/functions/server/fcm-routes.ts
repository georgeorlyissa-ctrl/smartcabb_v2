s/**
 * 🔔 ROUTES FCM POUR LE SERVEUR SMARTCABB
 * 
 * Routes pour gérer Firebase Cloud Messaging :
 * - Enregistrement des tokens FCM (chauffeurs et passagers)
 * - Envoi de notifications push
 * - Test des notifications
 * 
 * @version 1.0.0
 * @date 2026-01-20
 */

import { Hono } from 'npm:hono@4';
import * as kv from './kv-wrapper.ts';
import {
  sendFCMNotification,
  sendRideNotificationToDriver,
  sendRideStatusToPassenger,
  isFirebaseAdminConfigured
} from './firebase-admin.tsx';

const fcmRoutes = new Hono();

/**
 * 📊 GET /fcm/status - Vérifier le statut de Firebase
 */
fcmRoutes.get('/status', async (c) => {
  const configured = isFirebaseAdminConfigured();

  return c.json({
    configured,
    message: configured
      ? 'Firebase Admin est configuré ✅'
      : 'Firebase Admin n\'est pas configuré. Ajoutez FIREBASE_PROJECT_ID et FIREBASE_SERVER_KEY ⚠️'
  });
});

/**
 * 📱 POST /fcm/register-driver-token - Enregistrer le token FCM d'un chauffeur
 */
fcmRoutes.post('/register-driver-token', async (c) => {
  try {
    const body = await c.req.json();
    const { driverId, fcmToken } = body;

    if (!driverId || !fcmToken) {
      return c.json({ error: 'driverId et fcmToken sont requis' }, 400);
    }

    // Sauvegarder le token dans le KV store
    const key = `driver_fcm_token:${driverId}`;
    await kv.set(key, {
      fcmToken,
      driverId,
      registeredAt: new Date().toISOString(),
      platform: 'web'
    });

    console.log(`✅ Token FCM enregistré pour le chauffeur ${driverId}`);

    return c.json({
      success: true,
      message: 'Token FCM enregistré avec succès',
      driverId
    });
  } catch (error) {
    console.error('❌ Erreur lors de l\'enregistrement du token FCM chauffeur :', error);
    return c.json({
      error: 'Erreur lors de l\'enregistrement du token FCM',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    }, 500);
  }
});

/**
 * 📱 POST /fcm/register-passenger-token - Enregistrer le token FCM d'un passager
 */
fcmRoutes.post('/register-passenger-token', async (c) => {
  try {
    const body = await c.req.json();
    const { passengerId, fcmToken } = body;

    if (!passengerId || !fcmToken) {
      return c.json({ error: 'passengerId et fcmToken sont requis' }, 400);
    }

    // Sauvegarder le token dans le KV store
    const key = `passenger_fcm_token:${passengerId}`;
    await kv.set(key, {
      fcmToken,
      passengerId,
      registeredAt: new Date().toISOString(),
      platform: 'web'
    });

    console.log(`✅ Token FCM enregistré pour le passager ${passengerId}`);

    return c.json({
      success: true,
      message: 'Token FCM enregistré avec succès',
      passengerId
    });
  } catch (error) {
    console.error('❌ Erreur lors de l\'enregistrement du token FCM passager :', error);
    return c.json({
      error: 'Erreur lors de l\'enregistrement du token FCM',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    }, 500);
  }
});

/**
 * 🔔 POST /fcm/send-ride-notification - Envoyer une notification de course à un chauffeur
 */
fcmRoutes.post('/send-ride-notification', async (c) => {
  try {
    const body = await c.req.json();
    const { driverId, rideDetails } = body;

    if (!driverId || !rideDetails) {
      return c.json({ error: 'driverId et rideDetails sont requis' }, 400);
    }

    // Récupérer le token FCM du chauffeur
    const key = `driver_fcm_token:${driverId}`;
    const tokenData = await kv.get(key);

    if (!tokenData || !tokenData.fcmToken) {
      return c.json({
        error: 'Token FCM non trouvé pour ce chauffeur',
        driverId
      }, 404);
    }

    // Envoyer la notification
    const result = await sendRideNotificationToDriver(tokenData.fcmToken, rideDetails);

    if (!result.success) {
      return c.json({
        error: 'Échec de l\'envoi de la notification',
        details: result.error
      }, 500);
    }

    console.log(`✅ Notification de course envoyée au chauffeur ${driverId}`);

    return c.json({
      success: true,
      message: 'Notification envoyée avec succès',
      messageId: result.messageId,
      driverId
    });
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi de la notification de course :', error);
    return c.json({
      error: 'Erreur lors de l\'envoi de la notification',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    }, 500);
  }
});

/**
 * 🔔 POST /fcm/send-passenger-notification - Envoyer une notification à un passager
 */
fcmRoutes.post('/send-passenger-notification', async (c) => {
  try {
    const body = await c.req.json();
    const { passengerId, status, message } = body;

    if (!passengerId || !status || !message) {
      return c.json({ error: 'passengerId, status et message sont requis' }, 400);
    }

    // Récupérer le token FCM du passager
    const key = `passenger_fcm_token:${passengerId}`;
    const tokenData = await kv.get(key);

    if (!tokenData || !tokenData.fcmToken) {
      return c.json({
        error: 'Token FCM non trouvé pour ce passager',
        passengerId
      }, 404);
    }

    // Envoyer la notification
    const result = await sendRideStatusToPassenger(tokenData.fcmToken, status, message);

    if (!result.success) {
      return c.json({
        error: 'Échec de l\'envoi de la notification',
        details: result.error
      }, 500);
    }

    console.log(`✅ Notification envoyée au passager ${passengerId}`);

    return c.json({
      success: true,
      message: 'Notification envoyée avec succès',
      messageId: result.messageId,
      passengerId
    });
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi de la notification passager :', error);
    return c.json({
      error: 'Erreur lors de l\'envoi de la notification',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    }, 500);
  }
});

/**
 * 🧪 POST /fcm/test - Tester l'envoi d'une notification FCM
 */
fcmRoutes.post('/test', async (c) => {
  try {
    const body = await c.req.json();
    const { fcmToken, title, message } = body;

    if (!fcmToken) {
      return c.json({ error: 'fcmToken est requis' }, 400);
    }

    const result = await sendFCMNotification(fcmToken, {
      title: title || 'Test SmartCabb',
      body: message || 'Ceci est une notification de test 🔔',
      data: {
        type: 'test',
        timestamp: new Date().toISOString()
      }
    });

    if (!result.success) {
      return c.json({
        error: 'Échec de l\'envoi de la notification de test',
        details: result.error
      }, 500);
    }

    return c.json({
      success: true,
      message: 'Notification de test envoyée avec succès',
      messageId: result.messageId
    });
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi de la notification de test :', error);
    return c.json({
      error: 'Erreur lors de l\'envoi de la notification de test',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    }, 500);
  }
});

/**
 * 📋 GET /fcm/driver-token/:driverId - Récupérer le token FCM d'un chauffeur
 */
fcmRoutes.get('/driver-token/:driverId', async (c) => {
  try {
    const driverId = c.req.param('driverId');
    const key = `driver_fcm_token:${driverId}`;
    const tokenData = await kv.get(key);

    if (!tokenData) {
      return c.json({
        error: 'Token FCM non trouvé pour ce chauffeur',
        driverId
      }, 404);
    }

    return c.json({
      success: true,
      driverId,
      hasToken: !!tokenData.fcmToken,
      registeredAt: tokenData.registeredAt,
      platform: tokenData.platform
    });
  } catch (error) {
    console.error('❌ Erreur lors de la récupération du token FCM :', error);
    return c.json({
      error: 'Erreur lors de la récupération du token FCM',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    }, 500);
  }
});

/**
 * 🗑️ DELETE /fcm/driver-token/:driverId - Supprimer le token FCM d'un chauffeur
 */
fcmRoutes.delete('/driver-token/:driverId', async (c) => {
  try {
    const driverId = c.req.param('driverId');
    const key = `driver_fcm_token:${driverId}`;
    await kv.del(key);

    console.log(`🗑️ Token FCM supprimé pour le chauffeur ${driverId}`);

    return c.json({
      success: true,
      message: 'Token FCM supprimé avec succès',
      driverId
    });
  } catch (error) {
    console.error('❌ Erreur lors de la suppression du token FCM :', error);
    return c.json({
      error: 'Erreur lors de la suppression du token FCM',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    }, 500);
  }
});

export default fcmRoutes;
