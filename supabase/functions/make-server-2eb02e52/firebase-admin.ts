/**
 * 🔥 FIREBASE ADMIN SDK POUR SMARTCABB BACKEND
 * 
 * Configuration et utilitaires pour Firebase Admin côté serveur :
 * - Envoi de notifications FCM vers les chauffeurs
 * - Envoi de notifications FCM vers les passagers
 * - Gestion des tokens FCM
 * 
 * @version 2.0.0 - Migration vers FCM API V1 avec Service Account
 * @date 2026-02-04
 */

/**
 * ⚠️ IMPORTANT : Configuration Firebase Admin
 * 
 * Pour utiliser Firebase Admin SDK avec l'API V1, vous avez besoin d'un Service Account.
 * 
 * ÉTAPES POUR OBTENIR LA CLÉ :
 * 1. Allez dans Firebase Console > Project Settings > Service Accounts
 * 2. Cliquez sur "Generate new private key"
 * 3. Téléchargez le fichier JSON
 * 4. Ajoutez le CONTENU COMPLET du JSON dans Vercel/Supabase :
 *    Variable : FIREBASE_SERVICE_ACCOUNT_JSON
 *    Valeur : Le JSON complet (peut être sur une seule ligne)
 * 
 * ✅ Migration complétée vers FCM API V1 (moderne et sécurisé)
 */

// Import crypto pour la signature JWT
import { create as createJWT, getNumericDate } from "https://deno.land/x/djwt@v3.0.2/mod.ts";

interface FCMNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

interface FCMSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Cache pour le token d'accès Firebase
 */
let cachedAccessToken: string | null = null;
let tokenExpiresAt: number = 0;

/**
 * Génère un access token OAuth2 à partir du Service Account
 * 
 * @returns Access token valide
 */
async function getFirebaseAccessToken(): Promise<string> {
  // Vérifier si le token en cache est toujours valide
  if (cachedAccessToken && Date.now() < tokenExpiresAt) {
    return cachedAccessToken;
  }

  try {
    // Récupérer le Service Account JSON depuis les variables d'environnement
    const serviceAccountJson = Deno.env.get('FIREBASE_SERVICE_ACCOUNT_JSON');
    
    if (!serviceAccountJson) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON non configuré');
    }

    const serviceAccount = JSON.parse(serviceAccountJson);

    // Créer un JWT signé avec les credentials du service account
    const now = Math.floor(Date.now() / 1000);
    const expiry = now + 3600; // 1 heure

    const payload = {
      iss: serviceAccount.client_email,
      sub: serviceAccount.client_email,
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: expiry,
      scope: 'https://www.googleapis.com/auth/firebase.messaging'
    };

    // Importer la clé privée
    const privateKey = await crypto.subtle.importKey(
      'pkcs8',
      pemToArrayBuffer(serviceAccount.private_key),
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const jwt = await createJWT(
      { alg: 'RS256', typ: 'JWT' },
      payload,
      privateKey
    );

    // Échanger le JWT contre un access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt
      })
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      throw new Error(`Erreur OAuth2: ${tokenResponse.status} - ${errorText}`);
    }

    const tokenData = await tokenResponse.json();
    
    // Mettre en cache le token (expire dans 55 minutes pour être sûr)
    cachedAccessToken = tokenData.access_token;
    tokenExpiresAt = Date.now() + (55 * 60 * 1000);

    console.log('✅ Access token Firebase généré avec succès');
    return cachedAccessToken;

  } catch (error) {
    console.error('❌ Erreur lors de la génération du token Firebase:', error);
    throw error;
  }
}

/**
 * Convertit une clé PEM en ArrayBuffer pour crypto.subtle
 */
function pemToArrayBuffer(pem: string): ArrayBuffer {
  const pemContent = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '');
  
  const binaryString = atob(pemContent);
  const bytes = new Uint8Array(binaryString.length);
  
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  return bytes.buffer;
}

/**
 * Envoie une notification FCM à un token spécifique
 * 
 * @param token - Token FCM du destinataire
 * @param notification - Contenu de la notification
 * @returns Résultat de l'envoi
 */
export async function sendFCMNotification(
  token: string,
  notification: FCMNotificationPayload
): Promise<FCMSendResult> {
  try {
    // Récupérer le Project ID
    const projectId = Deno.env.get('FIREBASE_PROJECT_ID');

    if (!projectId) {
      console.error('❌ Variable Firebase manquante (FIREBASE_PROJECT_ID)');
      return {
        success: false,
        error: 'Firebase non configuré - FIREBASE_PROJECT_ID manquant'
      };
    }

    // Obtenir un access token valide
    let accessToken: string;
    try {
      accessToken = await getFirebaseAccessToken();
    } catch (error) {
      console.error('❌ Impossible d\'obtenir un access token Firebase:', error);
      return {
        success: false,
        error: 'Erreur d\'authentification Firebase - Vérifiez FIREBASE_SERVICE_ACCOUNT_JSON'
      };
    }

    // Construire le payload FCM
    const fcmPayload = {
      message: {
        token: token,
        notification: {
          title: notification.title,
          body: notification.body
        },
        data: notification.data || {},
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channelId: 'smartcabb_rides',
            defaultSound: true,
            defaultVibrateTimings: true
          }
        },
        apns: {
          headers: {
            'apns-priority': '10',
            'apns-push-type': 'alert'
          },
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
              'content-available': 1,
              alert: {
                title: notification.title,
                body: notification.body
              }
            }
          }
        },
        webpush: {
          notification: {
            icon: '/logo-smartcabb.png',
            badge: '/badge-smartcabb.png',
            requireInteraction: true,
            vibrate: [200, 100, 200, 100, 200],
            silent: false,
            sound: '/notification-sound.mp3',
            tag: 'smartcabb-ride-' + (notification.data?.rideId || Date.now()),
            renotify: true,
            timestamp: Date.now()
          },
          headers: {
            'Urgency': 'high',
            'TTL': '3600'
          },
          fcm_options: {
            link: '/driver-dashboard'
          }
        }
      }
    };

    // Envoyer la requête à l'API FCM v1
    const response = await fetch(
      `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(fcmPayload)
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erreur FCM API :', errorText);
      return {
        success: false,
        error: `Erreur FCM : ${response.status} - ${errorText}`
      };
    }

    const result = await response.json();
    console.log('✅ Notification FCM envoyée :', result.name);

    return {
      success: true,
      messageId: result.name
    };
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi FCM :', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    };
  }
}

/**
 * Envoie une notification de nouvelle course à un chauffeur
 */
export async function sendRideNotificationToDriver(
  driverToken: string,
  rideDetails: {
    rideId: string;
    passengerName?: string;
    pickup?: string;
    destination?: string;
    distance?: number;
    estimatedEarnings?: number;
    vehicleType?: string;
  }
): Promise<FCMSendResult> {
  let bodyMessage = '🚗 Nouvelle course disponible !';
  
  if (rideDetails.pickup && rideDetails.destination) {
    bodyMessage = `De ${rideDetails.pickup} à ${rideDetails.destination}`;
  } else if (rideDetails.pickup) {
    bodyMessage = `Départ : ${rideDetails.pickup}`;
  }

  const data: Record<string, string> = {
    type: 'new_ride',
    rideId: rideDetails.rideId,
    timestamp: new Date().toISOString()
  };

  if (rideDetails.passengerName) data.passengerName = rideDetails.passengerName;
  if (rideDetails.pickup) data.pickup = rideDetails.pickup;
  if (rideDetails.destination) data.destination = rideDetails.destination;
  if (rideDetails.distance) data.distance = rideDetails.distance.toFixed(1);
  if (rideDetails.estimatedEarnings) data.estimatedEarnings = Math.round(rideDetails.estimatedEarnings).toString();
  if (rideDetails.vehicleType) data.vehicleType = rideDetails.vehicleType;

  return await sendFCMNotification(driverToken, {
    title: 'SmartCabb - Nouvelle Course',
    body: bodyMessage,
    data
  });
}

/**
 * Envoie une notification de statut de course au passager
 */
export async function sendRideStatusToPassenger(
  passengerToken: string,
  status: 'accepted' | 'arrived' | 'started' | 'completed' | 'cancelled',
  message: string
): Promise<FCMSendResult> {
  const titles: Record<typeof status, string> = {
    accepted: '✅ Chauffeur en route',
    arrived: '📍 Chauffeur arrivé',
    started: '🚗 Course commencée',
    completed: '🎉 Course terminée',
    cancelled: '❌ Course annulée'
  };

  return await sendFCMNotification(passengerToken, {
    title: titles[status],
    body: message,
    data: {
      type: 'ride_status',
      status,
      timestamp: new Date().toISOString()
    }
  });
}

/**
 * Envoie une notification à plusieurs tokens (multicast)
 */
export async function sendFCMMulticast(
  tokens: string[],
  notification: FCMNotificationPayload
): Promise<{ successCount: number; failureCount: number; results: FCMSendResult[] }> {
  const results = await Promise.all(
    tokens.map(token => sendFCMNotification(token, notification))
  );

  const successCount = results.filter(r => r.success).length;
  const failureCount = results.filter(r => !r.success).length;

  console.log(`📊 Multicast FCM : ${successCount} réussis, ${failureCount} échoués sur ${tokens.length}`);

  return {
    successCount,
    failureCount,
    results
  };
}

/**
 * Vérifie si Firebase Admin est configuré
 */
export function isFirebaseAdminConfigured(): boolean {
  const projectId = Deno.env.get('FIREBASE_PROJECT_ID');
  const serviceAccountJson = Deno.env.get('FIREBASE_SERVICE_ACCOUNT_JSON');

  return !!(projectId && serviceAccountJson);
}

/**
 * 🆕 Envoie une notification d'annulation de course à un chauffeur
 */
export async function sendRideCancellationToDriver(
  driverToken: string,
  rideId: string,
  reason: string
): Promise<FCMSendResult> {
  console.log(`📱 Envoi notification annulation à un conducteur (ride: ${rideId})`);
  
  return await sendFCMNotification(driverToken, {
    title: '❌ Course déjà prise',
    body: reason,
    data: {
      type: 'ride_cancelled',
      rideId,
      reason,
      timestamp: new Date().toISOString(),
      action: 'dismiss_notification'
    }
  });
}