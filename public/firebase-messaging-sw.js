/**
 * 🔔 SERVICE WORKER FIREBASE POUR SMARTCABB
 * 
 * Ce fichier permet de recevoir les notifications push Firebase
 * même quand l'application est fermée ou en arrière-plan.
 * 
 * ⚠️ IMPORTANT : Ce fichier DOIT être à la racine /public/
 * 
 * @version 2.1.0 - Avec gestion erreurs et fallback
 * @date 2026-02-28
 */

// Import Firebase scripts avec gestion d'erreur
// firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

const FIREBASE_CONFIG = {
  apiKey: "VOTRE_API_KEY",
  authDomain: "VOTRE_PROJECT.firebaseapp.com",
  projectId: "VOTRE_PROJECT_ID",
  storageBucket: "VOTRE_PROJECT.appspot.com",
  messagingSenderId: "VOTRE_SENDER_ID",
  appId: "VOTRE_APP_ID"
};

if (!firebase.apps.length) {
  firebase.initializeApp(FIREBASE_CONFIG);
}

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification?.title || 'SmartCabb';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: '/logo-smartcabb.png',
    badge: '/badge-smartcabb.png',
    tag: 'smartcabb-ride-' + (payload.data?.rideId || Date.now()),
    requireInteraction: true,
    vibrate: [200, 100, 200, 100, 200],
    data: payload.data || {},
    actions: payload.data?.rideId ? [
      { action: 'accept', title: 'Accepter' },
      { action: 'decline', title: 'Refuser' }
    ] : []
  };
  return self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const rideId = event.notification.data?.rideId;

  if (event.action === 'accept') {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes('smartcabb.com') && 'focus' in client) {
            client.postMessage({ type: 'ACCEPT_RIDE', rideId });
            return client.focus();
          }
        }
        return clients.openWindow('/driver-dashboard?action=accept&rideId=' + rideId);
      })
    );
  } else if (event.action === 'decline') {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes('smartcabb.com') && 'focus' in client) {
            client.postMessage({ type: 'DECLINE_RIDE', rideId });
            return client.focus();
          }
        }
        return clients.openWindow('/driver-dashboard?action=decline&rideId=' + rideId);
      })
    );
  } else {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes('smartcabb.com') && 'focus' in client) {
            return client.focus();
          }
        }
        return clients.openWindow('/driver-dashboard');
      })
    );
  }
});

console.log('[Service Worker] Firebase Messaging Service Worker chargé pour SmartCabb ✅');