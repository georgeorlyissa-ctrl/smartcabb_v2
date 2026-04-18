/**
 * SYSTEME FCM POUR DRIVERS - SmartCabb
 * @version 4.6.0 - FIX COMPLET listener FCM foreground
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
let fcmListenerActive = false;
let fcmUnsubscribe: (() => void) | null = null;

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
    if (!modules) return false;

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

    const token = await modules.getToken(messaging, { vapidKey: VAPID_KEY });

    if (token) {
      console.log('Token FCM obtenu:', token.substring(0, 20) + '...');
      return token;
    }

    console.warn('Aucun token FCM obtenu');
    return null;
  } catch (error: any) {
    console.error('Erreur obtention token FCM:', error);
    if (error?.code === 'messaging/permission-blocked') {
      toast('Les notifications sont bloquees. Veuillez les autoriser dans les parametres du navigateur.', { type: 'error' });
    }
    return null;
  }
}

export async function saveFCMToken(userId: string, token: string): Promise<boolean> {
  try {
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
      console.error('Erreur serveur sauvegarde token:', await response.text());
      return false;
    }

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
    // Empêcher les listeners dupliqués
    if (fcmListenerActive && fcmUnsubscribe) {
      console.log('ℹ️ Listener FCM déjà actif, réutilisation');
      return;
    }

    if (!messaging) {
      const initialized = await initializeFCM();
      if (!initialized) return;
    }

    const modules = await loadFirebaseModules();
    if (!modules || !messaging) return;

    console.log('Démarrage écoute messages FCM en foreground...');

    const unsubscribe = modules.onMessage(messaging, (payload: any) => {
      console.log('📨 Message FCM recu (foreground):', payload);

      const data = payload?.data || {};
      const notifTitle = payload?.notification?.title || 'SmartCabb';
      const notifBody = payload?.notification?.body || 'Nouvelle notification';

      // Callback principal
      onMessageReceived(payload);

      // Course prise ou annulée → fermer popup
      if (data.type === 'ride_taken' || data.type === 'ride_cancelled_by_passenger') {
        console.log('⏹️ Course prise/annulée - dispatch fcm-ride-dismissed');
        window.dispatchEvent(new CustomEvent('fcm-ride-dismissed', { detail: data }));
        return;
      }

      // Nouvelle course → ouvrir popup driver
      if (data.type === 'new_ride_request' && data.rideId) {
        console.log('🚕 Nouvelle course FCM - dispatch fcm-new-ride-request');
        window.dispatchEvent(new CustomEvent('fcm-new-ride-request', { detail: data }));
      }

      // Notification navigateur via Service Worker (compatible mobile)
      if (Notification.permission === 'granted' && 'serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(registration => {
          registration.showNotification(notifTitle, {
            body: notifBody,
            icon: '/logo-smartcabb.jpeg',
            badge: '/badge-smartcabb.png',
            tag: 'smartcabb-notification-' + (data.rideId || Date.now()),
            requireInteraction: true,
            data: data
          });
        }).catch(e => console.error('SW notification error:', e));
      }
    });

    fcmUnsubscribe = unsubscribe;
    fcmListenerActive = true;
    console.log('✅ Listener FCM actif');

  } catch (error) {
    console.error('❌ Erreur listener FCM:', error);
  }
}

export async function testFCMNotification(userId: string): Promise<void> {
  try {
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
      toast('Erreur lors du test de notification', { type: 'error' });
      return;
    }

    toast('Notification de test envoyee !', { type: 'success' });
  } catch (error) {
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

    localStorage.removeItem(`fcm_token_${driverId}`);
    localStorage.removeItem(`fcm_registered_${driverId}`);

    const token = await getFCMToken();
    if (!token) {
      console.error('Impossible d\'obtenir le token FCM');
      return false;
    }

    const saved = await saveFCMToken(driverId, token);
    if (!saved) {
      console.error('Impossible de sauvegarder le token FCM');
      return false;
    }

    localStorage.setItem(`fcm_token_${driverId}`, token);
    localStorage.setItem(`fcm_registered_${driverId}`, 'true');
    localStorage.setItem(`fcm_registered_at_${driverId}`, new Date().toISOString());

    // Démarrer l'écoute après enregistrement réussi
    await listenToFCMMessages((payload) => {
      console.log('📬 Message FCM reçu:', payload?.data?.type || 'unknown');
    });

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
    // Nettoyer l'ancien listener avant de recréer
    if (fcmUnsubscribe) {
      fcmUnsubscribe();
      fcmUnsubscribe = null;
    }
    fcmListenerActive = false;

    localStorage.removeItem(`fcm_token_${driverId}`);
    localStorage.removeItem(`fcm_registered_${driverId}`);
    localStorage.removeItem(`fcm_registered_at_${driverId}`);

    return await registerDriverFCMToken(driverId);
  } catch (error) {
    console.error('Erreur rafraichissement token FCM:', error);
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