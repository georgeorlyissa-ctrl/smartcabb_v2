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
  apiKey: "AIzaSyC0Kq6QgnfVna4bEWUj0J3VknU0ZHMAaWU",
  authDomain: "smartcabb-bed00.firebaseapp.com",
  projectId: "smartcabb-bed00",
  storageBucket: "smartcabb-bed00.firebasestorage.app",
  messagingSenderId: "855559530237",
  appId: "1:855559530237:web:5ea0fa4232bb08196f4094"
};

if (!firebase.apps.length) {
  firebase.initializeApp(FIREBASE_CONFIG);
}

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Message reçu en arrière-plan:', payload);

  const data = payload.data || {};

  // Ne pas afficher de notification si course prise ou annulée
  if (data.type === 'ride_taken' || data.type === 'ride_cancelled_by_passenger') {
    console.log('[SW] Course prise/annulée - pas de notification');
    return;
  }

  const notificationTitle = payload.notification?.title || 'SmartCabb - Nouvelle Course';
  const notificationOptions = {
    body: payload.notification?.body || 'Nouvelle course disponible',
    icon: '/logo-smartcabb.png',
    badge: '/badge-smartcabb.png',
    tag: 'smartcabb-ride-' + (data.rideId || Date.now()),
    requireInteraction: true,
    vibrate: [300, 100, 300, 100, 300],
    data: data,
    actions: data.rideId ? [
      { action: 'accept', title: 'Accepter' },
      { action: 'decline', title: 'Refuser' }
    ] : []
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const rideId = event.notification.data?.rideId;
  const action = event.action;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('smartcabb.com') && 'focus' in client) {
          if (action === 'accept') {
            client.postMessage({ type: 'ACCEPT_RIDE', rideId });
          } else if (action === 'decline') {
            client.postMessage({ type: 'DECLINE_RIDE', rideId });
          }
          return client.focus();
        }
      }
      const url = action === 'accept'
        ? `/app/driver?action=accept&rideId=${rideId}`
        : '/app/driver';
      return clients.openWindow(url);
    })
  );
});

// Écouter aussi les messages de l'app pour config dynamique (compatibilité)
self.addEventListener('message', (event) => {
  if (event.data?.type === 'INIT_FIREBASE') {
    console.log('[SW] Config Firebase reçue (déjà initialisé)');
  }
});