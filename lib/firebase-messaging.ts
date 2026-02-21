/**
 * 🔥 FIREBASE CLOUD MESSAGING - SERVICE FRONTEND
 * 
 * Gestion complète des notifications push pour SmartCabb :
 * - Enregistrement du token FCM
 * - Écoute des notifications en temps réel
 * - Déclenchement de la sonnerie + modale
 * 
 * @version 1.0.0 - Solution DÉFINITIVE
 */

import { initializeApp, getApp, FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, Messaging, isSupported } from 'firebase/messaging';
import { projectId } from '../utils/supabase/info';

// Configuration Firebase (ces valeurs viennent de Firebase Console)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

let app: FirebaseApp | null = null;
let messaging: Messaging | null = null;

/**
 * Initialise Firebase Messaging
 */
export async function initializeFirebaseMessaging(): Promise<Messaging | null> {
  try {
    // Vérifier si le navigateur supporte les notifications
    const supported = await isSupported();
    if (!supported) {
      console.warn('⚠️ Notifications push non supportées sur ce navigateur');
      return null;
    }

    // Initialiser Firebase App (une seule fois)
    if (!app) {
      try {
        app = getApp();
      } catch {
        app = initializeApp(firebaseConfig);
      }
    }

    // Initialiser Messaging
    if (!messaging) {
      messaging = getMessaging(app);
    }

    console.log('✅ Firebase Messaging initialisé');
    return messaging;
  } catch (error) {
    console.error('❌ Erreur initialisation Firebase Messaging:', error);
    return null;
  }
}

/**
 * Demande la permission et récupère le token FCM
 */
export async function requestNotificationPermission(): Promise<string | null> {
  try {
    // Demander la permission
    const permission = await Notification.requestPermission();
    
    if (permission !== 'granted') {
      console.warn('⚠️ Permission de notification refusée');
      return null;
    }

    console.log('✅ Permission de notification accordée');

    // Initialiser messaging
    const msg = await initializeFirebaseMessaging();
    if (!msg) {
      console.error('❌ Messaging non disponible');
      return null;
    }

    // Récupérer le VAPID key depuis les variables d'environnement
    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
    if (!vapidKey) {
      console.error('❌ VITE_FIREBASE_VAPID_KEY non configuré');
      return null;
    }

    // Obtenir le token FCM
    const token = await getToken(msg, { vapidKey });
    
    if (!token) {
      console.error('❌ Impossible d\'obtenir le token FCM');
      return null;
    }

    console.log('✅ Token FCM obtenu:', token.substring(0, 20) + '...');
    return token;

  } catch (error) {
    console.error('❌ Erreur lors de la demande de permission:', error);
    return null;
  }
}

/**
 * Enregistre le token FCM du conducteur dans le backend
 */
export async function registerDriverFCMToken(
  driverId: string,
  token: string,
  publicAnonKey: string
): Promise<boolean> {
  try {
    console.log('📤 Enregistrement du token FCM pour le conducteur:', driverId);

    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/drivers/fcm-token`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          driverId,
          fcmToken: token
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erreur enregistrement token:', errorText);
      return false;
    }

    const result = await response.json();
    console.log('✅ Token FCM enregistré avec succès:', result);
    return true;

  } catch (error) {
    console.error('❌ Erreur lors de l\'enregistrement du token:', error);
    return false;
  }
}

/**
 * Écoute les messages FCM en temps réel (foreground)
 */
export function listenToFCMMessages(
  onRideNotification: (data: {
    rideId: string;
    passengerName?: string;
    pickup?: string;
    destination?: string;
    distance?: number;
    estimatedEarnings?: number;
  }) => void
): (() => void) | null {
  if (!messaging) {
    console.warn('⚠️ Messaging non initialisé, impossible d\'écouter les messages');
    return null;
  }

  console.log('👂 Écoute des messages FCM en temps réel...');

  // Écouter les messages en foreground (app ouverte)
  const unsubscribe = onMessage(messaging, (payload) => {
    console.log('🔔 MESSAGE FCM REÇU:', payload);

    // Vérifier que c'est une notification de course
    if (payload.data?.type === 'new_ride' && payload.data?.rideId) {
      console.log('🚗 Nouvelle course détectée via FCM!');

      // Déclencher le callback avec les données
      onRideNotification({
        rideId: payload.data.rideId,
        passengerName: payload.data.passengerName,
        pickup: payload.data.pickup,
        destination: payload.data.destination,
        distance: payload.data.distance ? parseFloat(payload.data.distance) : undefined,
        estimatedEarnings: payload.data.estimatedEarnings ? parseFloat(payload.data.estimatedEarnings) : undefined
      });

      // Afficher aussi une notification navigateur si l'app n'est pas au premier plan
      if (document.hidden) {
        new Notification(payload.notification?.title || 'SmartCabb', {
          body: payload.notification?.body || 'Nouvelle course disponible',
          icon: '/logo-smartcabb.png',
          badge: '/badge-smartcabb.png',
          requireInteraction: true,
          vibrate: [200, 100, 200],
          tag: 'smartcabb-ride-' + payload.data.rideId
        });
      }
    }
  });

  return unsubscribe;
}

/**
 * Vérifie si les notifications sont activées
 */
export function areNotificationsEnabled(): boolean {
  return Notification.permission === 'granted';
}

/**
 * Vérifie si Firebase est configuré
 */
export function isFirebaseConfigured(): boolean {
  return !!(
    import.meta.env.VITE_FIREBASE_API_KEY &&
    import.meta.env.VITE_FIREBASE_PROJECT_ID &&
    import.meta.env.VITE_FIREBASE_VAPID_KEY
  );
}
