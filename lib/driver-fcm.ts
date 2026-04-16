/**
 * SYSTEME FCM POUR DRIVERS - SmartCabb
 *
 * VERSION HYBRID : Client génère token + Backend envoie notifications
 * Config Firebase publique nécessaire pour Web Push (Safe)
 *
 * @version 4.4.0 - FIX CRITIQUE : register-driver-token au lieu de save-token
 * @date 2026-04-14
 */

import { projectId, publicAnonKey } from '../utils/supabase/info';
import { toast } from './toast';

type Messaging = any;

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

let messaging: Messaging | null = null;
let firebaseModules: any = null;

async function loadFirebaseModules() {
  if (firebaseModules) return firebaseModules;
  if (typeof window === 'undefined') return null;

  try {
    console.log('Chargement des modules Firebase...');

    const [appModule, messagingModule] = await Promise.all([
      import('firebase/app').catch(() => null),
      import('firebase/messaging').catch(() => null)
    ]);

    if (!appModule || !messagingModule) {
      console.warn('Modules Firebase non disponibles');
      return null;
    }

    firebaseModules = {
      initializeApp: appModule.initializeApp,
      getApps: appModule.getApps,
      getMessaging: messagingModule.getMessaging,
      getToken: messagingModule.getToken,
      onMessage: messagingModule.onMessage,
      isSupported: messagingModule.isSupported
    };

    console.log('Modules Firebase charges avec succes');
    return firebaseModules;
  } catch (error) {
    console.error('Erreur chargement Firebase:', error);
    return null;
  }
}

export async function initializeFCM(): Promise<boolean> {
  try {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      console.warn('Service Worker non supporte');
      return false;
    }

    const modules = await loadFirebaseModules();
    if (!modules) {
      console.warn('Firebase non disponible');
      return false;
    }

    const supported = await modules.isSupported();
    if (!supported) {
      console.warn('FCM non supporte par ce navigateur');
      return false;
    }

    const apps = modules.getApps();
    let app;

    if (apps.length > 0) {
      app = apps[0];
    } else {
      app = modules.initializeApp(firebaseConfig);
      console.log('Firebase initialise pour SmartCabb');
    }

    messaging = modules.getMessaging(app);
    console.log('Firebase Cloud Messaging (FCM) initialise');

    try {
      const registration = await navigator.serviceWorker.ready;
      if (registration.active) {
        registration.active.postMessage({
          type: 'INIT_FIREBASE',
          config: firebaseConfig
        });
        console.log('Configuration envoyee au Service Worker');
      }
    } catch (swError) {
      console.warn('Impossible d\'envoyer la config au Service Worker:', swError);
    }

    return true;
  } catch (error) {
    console.error('Erreur initialisation FCM:', error);
    return false;
  }
}

export async function getFCMToken(): Promise<string | null> {
  try {
    if (!messaging) {
      const initialized = await initializeFCM();
      if (!initialized) return null;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Permission de notification refusee');
      toast('Veuillez autoriser les notifications pour recevoir les demandes de course', { type: 'warning' });
      return null;
    }

    const modules = await loadFirebaseModules();
    if (!modules || !messaging) return null;

    console.log('Demande de token FCM...');

    const token = await modules.getToken(messaging, { vapidKey: VAPID_KEY });

    if (token) {
      console.log('Token FCM obtenu:', token.substring(0, 20) + '...');
      return token;
    } else {
      console.warn('Aucun token FCM obtenu');
      return null;
    }
  } catch (error: any) {
    console.error('Erreur obtention token FCM:', error);

    if (error?.code === 'messaging/permission-blocked') {
      toast('Les notifications sont bloquees. Veuillez les autoriser dans les parametres du navigateur.', { type: 'error' });
    } else if (error?.message?.includes('API key not valid')) {
      console.error('CLE API FIREBASE INVALIDE');
    } else {
      toast('Erreur lors de l\'obtention du token de notification', { type: 'error' });
    }

    return null;
  }
}

/**
 * FIX CRITIQUE v4.4.0
 *
 * AVANT (bugge) : appelait /fcm/save-token
 *   → stockait dans kv['fcm_token_${userId}']
 *   → findAndNotifyNearbyDrivers cherche driver.fcmToken dans kv['driver:${id}']
 *   → token jamais trouve → aucune notification
 *
 * APRES (corrige) : appelle /fcm/register-driver-token
 *   → stocke fcmToken dans kv['driver:${driverId}'].fcmToken
 *   → ET dans kv['fcm_token_${driverId}'] (double stockage)
 *   → findAndNotifyNearbyDrivers trouve driver.fcmToken → notification envoyee
 */
export async function saveFCMToken(userId: string, token: string): Promise<boolean> {
  try {
    console.log('Sauvegarde du token FCM pour le conducteur:', userId);
    console.log('Token:', token.substring(0, 20) + '...');

    // CORRECTION : utiliser register-driver-token qui met à jour driver.fcmToken
    // dans le KV store, ce que findAndNotifyNearbyDrivers lit ensuite
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/fcm/register-driver-token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({ driverId: userId, fcmToken: token })
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Erreur serveur lors de la sauvegarde du token:', error);
      return false;
    }

    const data = await response.json();
    console.log('Token FCM sauvegarde sur le serveur (register-driver-token):', data);

    return true;
  } catch (error) {
    console.error('Erreur sauvegarde token FCM:', error);
    return false;
  }
}

export async function listenToFCMMessages(
  onMessageReceived: (payload: any) => void
): Promise<void> {
  try {
    if (!messaging) {
      const initialized = await initializeFCM();
      if (!initialized) return;
    }

    const modules = await loadFirebaseModules();
    if (!modules || !messaging) return;

    console.log('Ecoute des messages FCM en foreground...');

    modules.onMessage(messaging, (payload: any) => {
      console.log('📩 Message FCM recu (foreground):', payload);

      const data = payload?.data || {};

      // callback principal
      onMessageReceived(payload);

      // ✅ course déjà prise ou annulée
      if (
        data.type === 'ride_taken' ||
        data.type === 'ride_cancelled_by_passenger'
      ) {
        console.log('⏹️ Fermeture notification course');

        window.dispatchEvent(
          new CustomEvent('fcm-ride-dismissed', {
            detail: data
          })
        );

        return;
      }

      // ✅ nouvelle demande de course
      if (
        data.type === 'new_ride_request' &&
        data.rideId
      ) {
        console.log('🚕 Nouvelle course FCM');

        window.dispatchEvent(
          new CustomEvent('fcm-new-ride-request', {
            detail: data
          })
        );
      }

      // ✅ notification navigateur
      if (payload.notification) {
        const { title, body } = payload.notification;

        if (
          'Notification' in window &&
          Notification.permission === 'granted'
        ) {
          new Notification(title || 'SmartCabb', {
            body: body || 'Nouvelle notification',
            icon: '/logo-smartcabb.png',
            badge: '/logo-smartcabb.png',
            tag: 'smartcabb-notification',
            requireInteraction: true
          });
        }
      }
    });

    console.log('✅ Listener FCM active');
  } catch (error) {
    console.error('❌ Erreur listener FCM:', error);
  }
}

export async function testFCMNotification(userId: string): Promise<void> {
  try {
    console.log('Test d\'envoi de notification FCM...');

    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/fcm/test-notification`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({ userId })
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Erreur test notification:', error);
      toast('Erreur lors du test de notification', { type: 'error' });
      return;
    }

    const data = await response.json();
    console.log('Resultat du test:', data);
    toast('Notification de test envoyee ! Verifiez votre appareil.', { type: 'success' });
  } catch (error) {
    console.error('Erreur test FCM:', error);
    toast('Erreur lors du test de notification', { type: 'error' });
  }
}

export async function diagnoseFCM(): Promise<{
  supported: boolean;
  permission: NotificationPermission | null;
  serviceWorker: boolean;
  firebaseInitialized: boolean;
  token: string | null;
  error: string | null;
}> {
  const result = {
    supported: false,
    permission: null as NotificationPermission | null,
    serviceWorker: false,
    firebaseInitialized: false,
    token: null as string | null,
    error: null as string | null
  };

  try {
    if (typeof window === 'undefined') {
      result.error = 'Not in browser environment';
      return result;
    }

    result.serviceWorker = 'serviceWorker' in navigator;
    if (!result.serviceWorker) {
      result.error = 'Service Worker not supported';
      return result;
    }

    const modules = await loadFirebaseModules();
    if (!modules) {
      result.error = 'Firebase modules not available';
      return result;
    }

    result.supported = await modules.isSupported();
    if (!result.supported) {
      result.error = 'FCM not supported by browser';
      return result;
    }

    if ('Notification' in window) {
      result.permission = Notification.permission;
    }

    const initialized = await initializeFCM();
    result.firebaseInitialized = initialized;

    if (!initialized) {
      result.error = 'Failed to initialize Firebase';
      return result;
    }

    if (result.permission === 'granted') {
      result.token = await getFCMToken();
    }

    return result;
  } catch (error: any) {
    result.error = error?.message || 'Unknown error';
    return result;
  }
}

export async function registerDriverFCMToken(driverId: string): Promise<boolean> {
  try {
    console.log(`Enregistrement FCM pour le conducteur ${driverId}...`);

    // Vider le cache local pour forcer un nouveau token
    localStorage.removeItem(`fcm_token_${driverId}`);
    localStorage.removeItem(`fcm_registered_${driverId}`);

    // Obtenir le token FCM
    const token = await getFCMToken();
    if (!token) {
      console.error('Impossible d\'obtenir le token FCM');
      return false;
    }

    // Sauvegarder sur le serveur via register-driver-token (FIX)
    const saved = await saveFCMToken(driverId, token);
    if (!saved) {
      console.error('Impossible de sauvegarder le token FCM');
      return false;
    }

    // Sauvegarder localement
    localStorage.setItem(`fcm_token_${driverId}`, token);
    localStorage.setItem(`fcm_registered_${driverId}`, 'true');
    localStorage.setItem(`fcm_registered_at_${driverId}`, new Date().toISOString());

    console.log('Token FCM enregistre avec succes pour', driverId);
    return true;
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement FCM:', error);
    return false;
  }
}

export function isDriverFCMTokenRegistered(driverId: string): boolean {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return false;
  const registered = localStorage.getItem(`fcm_registered_${driverId}`);
  const token = localStorage.getItem(`fcm_token_${driverId}`);
  return registered === 'true' && !!token;
}

export async function forceRefreshDriverFCMToken(driverId: string): Promise<boolean> {
  try {
    console.log(`Rafraichissement force du token FCM pour ${driverId}...`);

    localStorage.removeItem(`fcm_token_${driverId}`);
    localStorage.removeItem(`fcm_registered_${driverId}`);
    localStorage.removeItem(`fcm_registered_at_${driverId}`);

    return await registerDriverFCMToken(driverId);
  } catch (error) {
    console.error('Erreur lors du rafraichissement du token FCM:', error);
    return false;
  }
}

export function getDriverFCMTokenInfo(driverId: string): {
  token: string | null;
  registered: boolean;
  registeredAt: string | null;
} {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return { token: null, registered: false, registeredAt: null };
  }

  return {
    token: localStorage.getItem(`fcm_token_${driverId}`),
    registered: localStorage.getItem(`fcm_registered_${driverId}`) === 'true',
    registeredAt: localStorage.getItem(`fcm_registered_at_${driverId}`)
  };
}
