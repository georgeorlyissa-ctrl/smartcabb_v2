// Configuration Firebase
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

// Variables globales
let firebaseApp = null;
let messaging = null;
let currentToken = null;

// Afficher la configuration
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('firebase-config').textContent = JSON.stringify(firebaseConfig, null, 2);
});

// Fonctions de log
function addLog(message, type = 'info') {
  const logsDiv = document.getElementById('logs');
  const entry = document.createElement('div');
  entry.className = `log-entry ${type}`;
  entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
  logsDiv.appendChild(entry);
  logsDiv.scrollTop = logsDiv.scrollHeight;
  console.log(`[${type.toUpperCase()}]`, message);
}

function updateStatus(elementId, icon, text) {
  document.getElementById(elementId + '-icon').textContent = icon;
  document.getElementById(elementId + '-status').textContent = text;
}

// Vérification initiale
async function checkInitialStatus() {
  addLog('🔍 Vérification du statut initial...', 'info');
  
  // Service Worker
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    if (registrations.length > 0) {
      updateStatus('service-worker', '✅', `${registrations.length} service worker(s) enregistré(s)`);
      addLog(`✅ Service Worker trouvé : ${registrations[0].scope}`, 'success');
    } else {
      updateStatus('service-worker', '❌', 'Aucun service worker');
      addLog('❌ Aucun Service Worker enregistré', 'error');
    }
  } else {
    updateStatus('service-worker', '❌', 'Non supporté');
    addLog('❌ Service Workers non supportés', 'error');
  }
  
  // Permission
  if ('Notification' in window) {
    const permission = Notification.permission;
    if (permission === 'granted') {
      updateStatus('permission', '✅', 'Accordée');
      addLog('✅ Permission notifications accordée', 'success');
    } else if (permission === 'denied') {
      updateStatus('permission', '❌', 'Refusée');
      addLog('❌ Permission notifications refusée', 'error');
    } else {
      updateStatus('permission', '⚠️', 'Non demandée');
      addLog('⚠️ Permission notifications non demandée', 'warning');
    }
  } else {
    updateStatus('permission', '❌', 'Non supporté');
    addLog('❌ Notifications non supportées', 'error');
  }
  
  // Tester le backend
  try {
    const response = await fetch('https://zaerjqchzqmcxqblkfkg.supabase.co/functions/v1/make-server-2eb02e52/fcm/diagnostic', {
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InphZXJqcWNoenFtY3hxYmxrZmtnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxNDMyOTgsImV4cCI6MjA3NTcxOTI5OH0.qwFRKsi9Gw4VVYoEGBBCIj0-lAZOxtqlGQ0eT6cPhik'
      }
    });
    if (response.ok) {
      const data = await response.json();
      updateStatus('backend', '✅', 'Configuré');
      addLog(`✅ Backend FCM configuré : ${JSON.stringify(data)}`, 'success');
    } else {
      updateStatus('backend', '❌', `Erreur ${response.status}`);
      addLog(`❌ Backend FCM erreur ${response.status}`, 'error');
    }
  } catch (error) {
    updateStatus('backend', '❌', 'Inaccessible');
    addLog(`❌ Backend FCM inaccessible : ${error.message}`, 'error');
  }
}

// 1. Demander permission
async function requestPermission() {
  addLog('📱 Demande de permission notifications...', 'info');
  
  if (!('Notification' in window)) {
    addLog('❌ Notifications non supportées', 'error');
    return;
  }
  
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      updateStatus('permission', '✅', 'Accordée');
      addLog('✅ Permission accordée !', 'success');
    } else {
      updateStatus('permission', '❌', 'Refusée');
      addLog('❌ Permission refusée', 'error');
    }
  } catch (error) {
    addLog(`❌ Erreur demande permission : ${error.message}`, 'error');
  }
}

// 2. Initialiser Firebase
async function initializeFirebase() {
  addLog('🔥 Initialisation de Firebase...', 'info');
  
  try {
    const { initializeApp, getApps } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
    const { getMessaging, isSupported } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging.js');
    
    const apps = getApps();
    if (apps.length > 0) {
      firebaseApp = apps[0];
      addLog('✅ Firebase déjà initialisé', 'success');
    } else {
      firebaseApp = initializeApp(firebaseConfig);
      addLog('✅ Firebase initialisé', 'success');
    }
    
    const supported = await isSupported();
    if (!supported) {
      updateStatus('firebase', '❌', 'Messaging non supporté');
      addLog('❌ Firebase Messaging non supporté', 'error');
      return;
    }
    
    messaging = getMessaging(firebaseApp);
    updateStatus('firebase', '✅', 'Initialisé');
    addLog('✅ Firebase Messaging initialisé', 'success');
    
  } catch (error) {
    updateStatus('firebase', '❌', 'Erreur initialisation');
    addLog(`❌ Erreur Firebase : ${error.message}`, 'error');
  }
}

// 3. Obtenir token
async function getToken() {
  if (!messaging) {
    addLog('❌ Firebase Messaging non initialisé', 'error');
    return;
  }
  
  addLog('🎫 Demande de token FCM...', 'info');
  
  try {
    const { getToken: getTokenFn } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging.js');
    
    currentToken = await getTokenFn(messaging, { 
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' })
    });
    
    if (currentToken) {
      updateStatus('token', '✅', currentToken.substring(0, 20) + '...');
      addLog(`✅ Token FCM obtenu : ${currentToken.substring(0, 50)}...`, 'success');
    } else {
      updateStatus('token', '❌', 'Impossible d\'obtenir');
      addLog('❌ Impossible d\'obtenir le token', 'error');
    }
  } catch (error) {
    updateStatus('token', '❌', 'Erreur');
    addLog(`❌ Erreur obtention token : ${error.message}`, 'error');
  }
}

// 4. Tester backend
async function testBackend() {
  addLog('🔧 Test du backend FCM...', 'info');
  
  try {
    const response = await fetch('https://zaerjqchzqmcxqblkfkg.supabase.co/functions/v1/make-server-2eb02e52/fcm/diagnostic', {
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InphZXJqcWNoenFtY3hxYmxrZmtnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxNDMyOTgsImV4cCI6MjA3NTcxOTI5OH0.qwFRKsi9Gw4VVYoEGBBCIj0-lAZOxtqlGQ0eT6cPhik'
      }
    });
    const data = await response.json();
    
    if (response.ok) {
      addLog(`✅ Backend répond : ${JSON.stringify(data, null, 2)}`, 'success');
    } else {
      addLog(`❌ Backend erreur ${response.status} : ${JSON.stringify(data)}`, 'error');
    }
  } catch (error) {
    addLog(`❌ Erreur test backend : ${error.message}`, 'error');
  }
}

// 5. Envoyer notification test
async function sendTestNotification() {
  if (!currentToken) {
    addLog('❌ Pas de token FCM. Obtenez-en un d\'abord.', 'error');
    return;
  }
  
  addLog('📤 Envoi notification test...', 'info');
  
  try {
    const response = await fetch('https://zaerjqchzqmcxqblkfkg.supabase.co/functions/v1/make-server-2eb02e52/fcm/send-direct', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InphZXJqcWNoenFtY3hxYmxrZmtnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxNDMyOTgsImV4cCI6MjA3NTcxOTI5OH0.qwFRKsi9Gw4VVYoEGBBCIj0-lAZOxtqlGQ0eT6cPhik'
      },
      body: JSON.stringify({
        token: currentToken,
        title: '🧪 Test SmartCabb',
        body: 'Notification test envoyée depuis la page de diagnostic !',
        data: {
          type: 'test',
          timestamp: new Date().toISOString()
        }
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      addLog(`✅ Notification envoyée ! ${JSON.stringify(data)}`, 'success');
    } else {
      addLog(`❌ Erreur envoi : ${JSON.stringify(data)}`, 'error');
    }
  } catch (error) {
    addLog(`❌ Erreur envoi notification : ${error.message}`, 'error');
  }
}

// Clear logs
function clearLogs() {
  document.getElementById('logs').innerHTML = '';
  addLog('🗑️ Logs effacés', 'info');
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-permission').addEventListener('click', requestPermission);
  document.getElementById('btn-init-firebase').addEventListener('click', initializeFirebase);
  document.getElementById('btn-get-token').addEventListener('click', getToken);
  document.getElementById('btn-test-backend').addEventListener('click', testBackend);
  document.getElementById('btn-send-test').addEventListener('click', sendTestNotification);
  document.getElementById('btn-clear-logs').addEventListener('click', clearLogs);
  
  // Lancer la vérification initiale
  checkInitialStatus();
});
