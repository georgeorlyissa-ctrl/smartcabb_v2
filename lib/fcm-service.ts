/**
 * 🔔 SERVICE FCM (FIREBASE CLOUD MESSAGING) POUR SMARTCABB
 * 
 * Gestion des notifications push pour les chauffeurs et passagers :
 * - Demande de permission de notification
 * - Récupération du token FCM
 * - Enregistrement du token dans Supabase
 * - Réception des notifications en temps réel
 * 
 * ⚠️ CHARGEMENT DYNAMIQUE : Firebase/messaging chargé de manière asynchrone
 * 
 * @version 2.0.0 - Chargement dynamique
 * @date 2026-01-21
 */

import { getFirebaseMessaging } from './firebase-config';
import { projectId, publicAnonKey } from '../utils/supabase/info';

// Types Firebase (définis localement)
type Messaging = any;
type MessagePayload = any;

// Cache pour les fonctions Firebase Messaging
let fcmFunctions: any = null;

/**
 * 📦 Charge les fonctions FCM de manière dynamique
 */
async function loadFCMFunctions() {
  if (fcmFunctions) {
    return fcmFunctions;
  }

  // ⚠️ Ne pas charger pendant le build SSR
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    console.log('📦 Chargement dynamique des fonctions Firebase Messaging...');
    
    // ⚠️ DÉSACTIVÉ COMPLÈTEMENT : Import CDN Firebase Messaging cause des erreurs de build
    console.warn('⚠️ FCM DÉSACTIVÉ - Firebase Messaging non disponible dans cet environnement');
    console.warn('⚠️ Les notifications push ne fonctionneront qu\'après configuration en production');
    
    // Retourner null pour que l'app continue sans FCM
    return null;
    
    /*
    // ✅ CODE ORIGINAL FCM (À RÉACTIVER EN PRODUCTION SI BESOIN) :
    
    const messagingModule = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging.js').catch(() => null);
    
    if (!messagingModule) {
      console.warn('⚠️ Module Firebase Messaging non disponible');
      return null;
    }
    
    fcmFunctions = {
      getToken: messagingModule.getToken,
      onMessage: messagingModule.onMessage
    };
    
    console.log('✅ Fonctions FCM chargées avec succès');
    return fcmFunctions;
    */
  } catch (error) {
    console.error('❌ Erreur chargement FCM functions:', error);
    return null;
  }
}

/**
 * 🔑 VAPID Key (Web Push Certificate)
 * 
 * ✅ CLÉ VAPID CONFIGURÉE POUR SMARTCABB
 * Générée depuis Firebase Console > Project Settings > Cloud Messaging > Web Push certificates
 */
const VAPID_KEY = 'BDHm-w7od6Q7PP8y_vCv3TxuQiocDUyH3X6sg1zxQfm_KhCSFJnHtcVP4yekIOWUiJ6vHvO06yaXXnyp0i_1Muc';

/**
 * Type pour les détails de notification de course
 */
export interface RideNotificationData {
  rideId: string;
  passengerName?: string;
  pickup?: string;
  destination?: string;
  distance?: number;
  estimatedEarnings?: number;
  vehicleType?: string;
}

/**
 * Demande la permission d'envoyer des notifications
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('⚠️ Les notifications ne sont pas supportées par ce navigateur');
    return 'denied';
  }

  const permission = await Notification.requestPermission();
  console.log(`🔔 Permission de notification : ${permission}`);

  return permission;
}

/**
 * Récupère le token FCM pour ce device
 */
export async function getFCMToken(): Promise<string | null> {
  try {
    // Demander la permission d'abord
    const permission = await requestNotificationPermission();
    if (permission !== 'granted') {
      console.log('ℹ️ Notifications push non activées (permission requise pour les recevoir)');
      return null;
    }

    // Récupérer l'instance FCM
    const messaging = await getFirebaseMessaging();
    if (!messaging) {
      console.log('ℹ️ Firebase Messaging non disponible (fonctionnalité optionnelle)');
      return null;
    }

    // Charger les fonctions FCM
    const fcm = await loadFCMFunctions();
    if (!fcm) {
      console.log('ℹ️ Fonctions FCM non disponibles (fonctionnalité optionnelle)');
      return null;
    }

    // Vérifier si le Service Worker est enregistré
    if (!('serviceWorker' in navigator)) {
      console.log('ℹ️ Service Worker non supporté (notifications push désactivées)');
      return null;
    }

    // Attendre l'enregistrement du Service Worker
    const registration = await navigator.serviceWorker.ready;
    console.log('✅ Service Worker prêt');

    // Récupérer le token FCM
    const token = await fcm.getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration
    });

    if (token) {
      console.log('✅ Token FCM récupéré :', token.substring(0, 20) + '...');
      return token;
    } else {
      console.log('ℹ️ Token FCM non disponible (fonctionnalité optionnelle)');
      return null;
    }
  } catch (error) {
    console.log('ℹ️ Notifications push non disponibles :', error instanceof Error ? error.message : 'Erreur inconnue');
    return null;
  }
}

/**
 * Enregistre le token FCM pour un chauffeur dans Supabase
 */
export async function registerDriverFCMToken(driverId: string, token: string): Promise<boolean> {
  try {
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/fcm/register-driver-token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({
          driverId,
          fcmToken: token
        })
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Erreur lors de l\'enregistrement du token FCM :', error);
      return false;
    }

    const data = await response.json();
    console.log('✅ Token FCM enregistré pour le chauffeur :', driverId);
    return true;
  } catch (error) {
    console.error('❌ Erreur réseau lors de l\'enregistrement du token FCM :', error);
    return false;
  }
}

/**
 * Enregistre le token FCM pour un passager dans Supabase
 */
export async function registerPassengerFCMToken(passengerId: string, token: string): Promise<boolean> {
  try {
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/fcm/register-passenger-token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({
          passengerId,
          fcmToken: token
        })
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Erreur lors de l\'enregistrement du token FCM :', error);
      return false;
    }

    const data = await response.json();
    console.log('✅ Token FCM enregistré pour le passager :', passengerId);
    return true;
  } catch (error) {
    console.error('❌ Erreur réseau lors de l\'enregistrement du token FCM :', error);
    return false;
  }
}

/**
 * Initialise FCM pour un chauffeur (à appeler au démarrage du dashboard)
 */
export async function initializeFCMForDriver(driverId: string): Promise<boolean> {
  try {
    console.log('🔔 Initialisation FCM pour le chauffeur :', driverId);

    // 1. Récupérer le token FCM
    const token = await getFCMToken();
    if (!token) {
      console.warn('⚠️ Impossible d\'initialiser FCM : pas de token');
      return false;
    }

    // 2. Enregistrer le token dans Supabase
    const registered = await registerDriverFCMToken(driverId, token);
    if (!registered) {
      console.warn('⚠️ Token FCM non enregistré dans Supabase');
      return false;
    }

    // 3. Écouter les messages en temps réel (foreground)
    const messaging = await getFirebaseMessaging();
    const fcm = await loadFCMFunctions();
    
    if (messaging && fcm) {
      fcm.onMessage(messaging, (payload: any) => {
        console.log('🔔 Notification FCM reçue (foreground) :', payload);

        // Afficher une notification locale
        if (payload.notification) {
          showLocalNotification(
            payload.notification.title || 'SmartCabb',
            payload.notification.body || 'Nouvelle notification'
          );
        }

        // Gérer les données personnalisées
        if (payload.data) {
          handleRideNotification(payload.data as any);
        }
      });

      console.log('✅ FCM initialisé et en écoute pour le chauffeur');
    }

    return true;
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation FCM :', error);
    return false;
  }
}

/**
 * Initialise FCM pour un passager
 */
export async function initializeFCMForPassenger(passengerId: string): Promise<boolean> {
  try {
    console.log('🔔 Initialisation FCM pour le passager :', passengerId);

    // 1. Récupérer le token FCM
    const token = await getFCMToken();
    if (!token) {
      console.warn('⚠️ Impossible d\'initialiser FCM : pas de token');
      return false;
    }

    // 2. Enregistrer le token dans Supabase
    const registered = await registerPassengerFCMToken(passengerId, token);
    if (!registered) {
      console.warn('⚠️ Token FCM non enregistré dans Supabase');
      return false;
    }

    // 3. Écouter les messages en temps réel (foreground)
    const messaging = await getFirebaseMessaging();
    const fcm = await loadFCMFunctions();
    
    if (messaging && fcm) {
      fcm.onMessage(messaging, (payload: any) => {
        console.log('🔔 Notification FCM reçue (foreground) :', payload);

        // Afficher une notification locale
        if (payload.notification) {
          showLocalNotification(
            payload.notification.title || 'SmartCabb',
            payload.notification.body || 'Nouvelle notification'
          );
        }
      });

      console.log('✅ FCM initialisé et en écoute pour le passager');
    }

    return true;
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation FCM :', error);
    return false;
  }
}

/**
 * Affiche une notification locale (navigateur)
 */
function showLocalNotification(title: string, body: string) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon: '/logo-smartcabb.png', // TODO: Ajouter votre logo
      badge: '/badge-smartcabb.png',
      tag: 'smartcabb-notification',
      requireInteraction: true
    });
  }
}

/**
 * Gère les notifications de course (chauffeurs)
 */
function handleRideNotification(data: RideNotificationData) {
  console.log('🚗 Notification de course reçue :', data);

  // Émettre un événement personnalisé pour que le dashboard réagisse
  const event = new CustomEvent('smartcabb:new-ride', {
    detail: data
  });
  window.dispatchEvent(event);

  // Jouer le son de notification (si le système de notification sonore est actif)
  if ((window as any).playRideNotificationSound) {
    (window as any).playRideNotificationSound({
      passengerName: data.passengerName,
      pickup: data.pickup,
      destination: data.destination,
      distance: data.distance,
      estimatedEarnings: data.estimatedEarnings
    });
  }
}

/**
 * Vérifie si FCM est supporté et configuré
 */
export async function isFCMSupported(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (!('Notification' in window)) return false;
  if (!('serviceWorker' in navigator)) return false;

  const messaging = await getFirebaseMessaging();
  return messaging !== null;
}

/**
 * Récupère le statut de la permission de notification
 */
export function getNotificationPermissionStatus(): NotificationPermission {
  if (!('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
}