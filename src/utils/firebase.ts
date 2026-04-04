/**
 * 🔥 SmartCabb - Firebase Cloud Messaging (FCM)
 * 
 * Gestion des notifications push pour passagers et conducteurs
 * 
 * @author SmartCabb Team
 * @date 15 Mars 2026
 */

import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';

// ════════════════════════════════════════════════════════════════════
// CONFIGURATION FIREBASE
// ════════════════════════════════════════════════════════════════════

const firebaseConfig = {
  apiKey: "AIzaSyC0Kq6QgnfVna4bEWUj0J3VknU0ZHMAaWU",
  authDomain: "smartcabb-bed00.firebaseapp.com",
  projectId: "smartcabb-bed00",
  storageBucket: "smartcabb-bed00.firebasestorage.app",
  messagingSenderId: "855559530237",
  appId: "1:855559530237:web:5ea0fa4232bb08196f4094",
  measurementId: "G-8QY9ZYGC7B"
};

const VAPID_KEY = "BDHm-w7od6Q7PP8y_vCv3TxuQiocDUyH3X6sg1zxQfm_KhCSFJnHtcVP4yekIOWUiJ6vHvO06yaXXnyp0i_1Muc";

// URL du backend Supabase
const BACKEND_URL = "https://zaerjqchzqmcxqblkfkg.supabase.co/functions/v1/make-server-2eb02e52";
const BACKEND_AUTH = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InphZXJqcWNoenFtY3hxYmxrZmtnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxNDMyOTgsImV4cCI6MjA3NTcxOTI5OH0.qwFRKsi9Gw4VVYoEGBBCIj0-lAZOxtqlGQ0eT6cPhik";

// ════════════════════════════════════════════════════════════════════
// VARIABLES GLOBALES
// ════════════════════════════════════════════════════════════════════

let firebaseApp: any = null;
let messaging: any = null;

// ════════════════════════════════════════════════════════════════════
// INITIALISATION
// ════════════════════════════════════════════════════════════════════

/**
 * Initialiser Firebase et Firebase Messaging
 * 
 * @returns messaging instance ou null si non supporté
 */
export async function initializeFirebase() {
  try {
    // Vérifier si déjà initialisé
    const apps = getApps();
    if (apps.length > 0) {
      firebaseApp = apps[0];
      console.log('✅ Firebase déjà initialisé');
    } else {
      firebaseApp = initializeApp(firebaseConfig);
      console.log('✅ Firebase initialisé');
    }

    // Vérifier support messaging
    const supported = await isSupported();
    if (!supported) {
      console.warn('⚠️ Firebase Messaging non supporté sur ce navigateur');
      return null;
    }

    messaging = getMessaging(firebaseApp);
    console.log('✅ Firebase Messaging initialisé');
    
    return messaging;
  } catch (error) {
    console.error('❌ Erreur initialisation Firebase:', error);
    return null;
  }
}

// ════════════════════════════════════════════════════════════════════
// GESTION DES TOKENS FCM
// ════════════════════════════════════════════════════════════════════

/**
 * Demander la permission et obtenir le token FCM
 * 
 * @returns token FCM ou null si échec
 */
export async function requestFCMToken(): Promise<string | null> {
  try {
    // Vérifier support des notifications
    if (!('Notification' in window)) {
      console.error('❌ Notifications non supportées');
      return null;
    }

    // Demander permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('⚠️ Permission notifications refusée');
      return null;
    }

    console.log('✅ Permission notifications accordée');

    // Initialiser Firebase si nécessaire
    if (!messaging) {
      await initializeFirebase();
    }

    if (!messaging) {
      console.error('❌ Messaging non disponible');
      return null;
    }

    // Obtenir token
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY
    });

    if (token) {
      console.log('✅ Token FCM obtenu:', token.substring(0, 20) + '...');
      return token;
    } else {
      console.error('❌ Impossible d\'obtenir le token FCM');
      return null;
    }
  } catch (error) {
    console.error('❌ Erreur obtention token FCM:', error);
    return null;
  }
}

/**
 * Sauvegarder le token FCM sur le serveur
 * 
 * @param userId - ID de l'utilisateur
 * @param token - Token FCM
 * @param userType - Type d'utilisateur ('passenger' ou 'driver')
 * @returns true si succès, false sinon
 */
export async function saveFCMTokenToServer(
  userId: string, 
  token: string, 
  userType: 'passenger' | 'driver'
): Promise<boolean> {
  try {
    const endpoint = userType === 'driver' 
      ? '/fcm/register-driver-token'
      : '/fcm/register-passenger-token';

    const paramKey = userType === 'driver' ? 'driverId' : 'passengerId';

    console.log(`💾 Sauvegarde token FCM pour ${userType} ${userId}...`);

    const response = await fetch(`${BACKEND_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': BACKEND_AUTH
      },
      body: JSON.stringify({
        [paramKey]: userId,
        fcmToken: token
      })
    });

    const data = await response.json();

    if (data.success) {
      console.log(`✅ Token FCM sauvegardé pour ${userType} ${userId}`);
      return true;
    } else {
      console.error(`❌ Erreur sauvegarde token:`, data.error);
      return false;
    }
  } catch (error) {
    console.error('❌ Erreur sauvegarde token FCM:', error);
    return false;
  }
}

// ════════════════════════════════════════════════════════════════════
// RÉCEPTION DES NOTIFICATIONS
// ════════════════════════════════════════════════════════════════════

/**
 * Type de payload de notification
 */
export interface FCMNotificationPayload {
  notification?: {
    title?: string;
    body?: string;
    icon?: string;
  };
  data?: {
    [key: string]: string;
  };
}

/**
 * Écouter les notifications en foreground (app ouverte)
 * 
 * @param callback - Fonction appelée à chaque notification
 */
export function listenToForegroundMessages(
  callback: (payload: FCMNotificationPayload) => void
) {
  if (!messaging) {
    console.warn('⚠️ Messaging non initialisé. Appelez initializeFirebase() d\'abord.');
    return;
  }

  onMessage(messaging, (payload) => {
    console.log('🔔 Notification reçue (foreground):', payload);
    callback(payload);
  });

  console.log('👂 Écoute des notifications foreground activée');
}

// ════════════════════════════════════════════════════════════════════
// INITIALISATION COMPLÈTE (HELPER)
// ════════════════════════════════════════════════════════════════════

/**
 * Configuration complète FCM pour un utilisateur
 * 
 * Initialise Firebase, demande permission, obtient token, sauvegarde sur serveur,
 * et configure l'écoute des notifications.
 * 
 * @param userId - ID de l'utilisateur
 * @param userType - Type d'utilisateur ('passenger' ou 'driver')
 * @param onNotification - Callback appelé quand une notification arrive
 * @returns true si succès complet, false sinon
 */
export async function setupFCMForUser(
  userId: string,
  userType: 'passenger' | 'driver',
  onNotification?: (payload: FCMNotificationPayload) => void
): Promise<boolean> {
  try {
    console.log(`🔥 Configuration FCM pour ${userType} ${userId}...`);

    // 1. Initialiser Firebase
    const msg = await initializeFirebase();
    if (!msg) {
      console.error('❌ Impossible d\'initialiser Firebase Messaging');
      return false;
    }

    // 2. Demander permission et obtenir token
    const token = await requestFCMToken();
    if (!token) {
      console.error('❌ Impossible d\'obtenir le token FCM');
      return false;
    }

    // 3. Sauvegarder le token sur le serveur
    const saved = await saveFCMTokenToServer(userId, token, userType);
    if (!saved) {
      console.warn('⚠️ Token non sauvegardé sur le serveur, mais les notifications locales fonctionneront');
    }

    // 4. Configurer l'écoute des notifications (si callback fourni)
    if (onNotification) {
      listenToForegroundMessages(onNotification);
    }

    console.log(`✅ FCM configuré avec succès pour ${userType} ${userId}`);
    return true;
  } catch (error) {
    console.error('❌ Erreur configuration FCM:', error);
    return false;
  }
}

// ════════════════════════════════════════════════════════════════════
// EXPORTS
// ════════════════════════════════════════════════════════════════════

export default {
  initializeFirebase,
  requestFCMToken,
  saveFCMTokenToServer,
  listenToForegroundMessages,
  setupFCMForUser
};
