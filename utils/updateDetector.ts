// 🔄 DÉTECTEUR DE MISE À JOUR AUTOMATIQUE
// Vérifie les nouvelles versions et force le rechargement

let updateCheckInterval: ReturnType<typeof setInterval> | null = null;

// 🔧 Détection d'environnement robuste
const isDevelopment = () => {
  // ✅ SSR FIX: Vérifier que nous sommes côté client
  if (typeof window === 'undefined') {
    return false;
  }
  
  try {
    return (
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname.includes('localhost') ||
      window.location.port === '5173' ||
      window.location.port === '3000'
    );
  } catch {
    return false;
  }
};

export function startUpdateDetection() {
  // ✅ SSR FIX: Vérifier que nous sommes côté client
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return;
  }
  
  console.log('🔍 Détection de mise à jour activée');

  // Ne pas activer en mode prévisualisation ou si on ne peut pas accéder à index.html
  // Cela évite les erreurs "Failed to fetch" dans Figma Make
  if (!isDevelopment() && window.location.hostname.includes('figma')) {
    console.log('⚠️ Détection de mise à jour désactivée en mode prévisualisation Figma');
    return;
  }

  // 1. Vérifier au chargement
  checkForUpdates();

  // 2. Vérifier toutes les 30 secondes en développement
  if (isDevelopment()) {
    updateCheckInterval = setInterval(checkForUpdates, 30000);
  }

  // 3. Vérifier toutes les 5 minutes en production
  if (!isDevelopment()) {
    updateCheckInterval = setInterval(checkForUpdates, 5 * 60 * 1000);
  }

  // 4. ✅ Écouter les messages du Service Worker (mise à jour automatique)
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'SW_UPDATED') {
        console.log('🆕 Service Worker mis à jour - version:', event.data.version);
        console.log('🔄 Rechargement automatique dans 3 secondes...');

        // Petit délai pour laisser le SW finir son activation
        setTimeout(() => {
          forceReload();
        }, 3000);
      }

      if (event.data && event.data.type === 'FORCE_RELOAD') {
        console.log('🔥 Rechargement forcé par le Service Worker');
        forceReload();
      }
    });

    // 5. Détecter un nouveau Service Worker qui prend le contrôle
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;

      console.log('🆕 Nouveau Service Worker a pris le contrôle');
      console.log('🔄 Rechargement automatique...');

      // Rechargement immédiat car le SW est déjà actif
      window.location.reload();
    });
  }
}

export function stopUpdateDetection() {
  if (updateCheckInterval) {
    clearInterval(updateCheckInterval);
    updateCheckInterval = null;
  }
}

export async function checkForUpdates() {
  // Ne pas vérifier en mode prévisualisation Figma
  if (window.location.hostname.includes('figma') || 
      window.location.hostname.includes('preview') ||
      window.location.hostname.includes('--')) {
    // Mode prévisualisation détecté, skip silencieusement
    return;
  }

  try {
    // Vérifier si une nouvelle version existe en interrogeant index.html
    const response = await fetch('/index.html', {
      method: 'HEAD',
      cache: 'no-cache',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

    // Vérifier si la réponse est OK
    if (!response.ok) {
      // Échec silencieux en mode prévisualisation
      return;
    }

    const lastModified = response.headers.get('Last-Modified');
    const etag = response.headers.get('ETag');
    
    const storedLastModified = localStorage.getItem('app-last-modified');
    const storedEtag = localStorage.getItem('app-etag');

    // Première visite
    if (!storedLastModified && !storedEtag) {
      if (lastModified) localStorage.setItem('app-last-modified', lastModified);
      if (etag) localStorage.setItem('app-etag', etag);
      return;
    }

    // Détecter un changement
    const hasChanged = 
      (lastModified && lastModified !== storedLastModified) ||
      (etag && etag !== storedEtag);

    if (hasChanged) {
      console.log('🆕 Nouvelle version détectée!');
      console.log('Old ETag:', storedEtag, 'New ETag:', etag);
      console.log('Old Last-Modified:', storedLastModified, 'New Last-Modified:', lastModified);
      
      // Mettre à jour le stockage
      if (lastModified) localStorage.setItem('app-last-modified', lastModified);
      if (etag) localStorage.setItem('app-etag', etag);

      // Vider le cache du Service Worker - désactivé temporairement
      // 🚫 Code désactivé pour éviter les erreurs de Service Worker
      forceReload();
      
      /*
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        const messageChannel = new MessageChannel();
        navigator.serviceWorker.controller.postMessage(
          { type: 'CLEAR_CACHE' },
          [messageChannel.port2]
        );
        
        messageChannel.port1.onmessage = (event) => {
          if (event.data.success) {
            console.log('✅ Cache Service Worker vidé');
            forceReload();
          }
        };
      } else {
        forceReload();
      }
      */
    }
    
    return hasChanged;
  } catch (error) {
    // Ignorer complètement toutes les erreurs en mode prévisualisation
    // Ne rien logger pour éviter de polluer la console
    return false;
  }
}

// Export alias pour compatibilité
export const checkForUpdate = checkForUpdates;

function forceReload() {
  console.log('🔄 Mise à jour automatique détectée - Préparation du rechargement...');

  // ✅ MISE À JOUR AUTOMATIQUE SILENCIEUSE
  // Vérifier si l'utilisateur est en pleine action (course en cours, paiement, etc.)
  const currentScreen = localStorage.getItem('smartcab_current_screen');
  const currentRide = localStorage.getItem('smartcab_current_ride');

  // Liste des écrans où on NE DOIT PAS recharger immédiatement
  const criticalScreens = [
    'payment',
    'payment-confirmation',
    'driver-active-ride',
    'active-ride',
    'ride-in-progress',
    'booking',
    'searching-drivers',
    'driver-found'
  ];

  // Si l'utilisateur a une course en cours, on attend
  const hasActiveRide = currentRide && currentRide !== 'null';
  const isCriticalScreen = criticalScreens.some(screen => currentScreen?.includes(screen));

  if (hasActiveRide || isCriticalScreen) {
    console.log('⏳ Mise à jour reportée - Utilisateur en cours d\'action');
    console.log('   Screen:', currentScreen);
    console.log('   Active ride:', hasActiveRide);

    // Réessayer dans 2 minutes
    setTimeout(() => {
      console.log('🔄 Nouvelle tentative de mise à jour...');
      forceReload();
    }, 2 * 60 * 1000);

    return;
  }

  // ✅ Afficher un toast discret (2 secondes) avant de recharger
  const toast = document.createElement('div');
  toast.innerHTML = `
    <div style="
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(135deg, #06b6d4 0%, #10b981 100%);
      color: white;
      padding: 12px 24px;
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      font-weight: 600;
      z-index: 999999;
      display: flex;
      align-items: center;
      gap: 8px;
      animation: slideDown 0.3s ease-out;
    ">
      <span style="font-size: 18px;">✨</span>
      <span>Mise à jour en cours...</span>
    </div>
    <style>
      @keyframes slideDown {
        from {
          opacity: 0;
          transform: translateX(-50%) translateY(-20px);
        }
        to {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }
      }
    </style>
  `;
  document.body.appendChild(toast);

  // ✅ Vider tous les caches en arrière-plan
  if ('caches' in window) {
    caches.keys().then(names => {
      Promise.all(names.map(name => caches.delete(name)))
        .then(() => console.log('✅ Caches vidés:', names))
        .catch(err => console.warn('⚠️ Erreur vidage cache:', err));
    });
  }

  // ✅ Envoyer un message au Service Worker pour forcer la mise à jour
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHE' });
    navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
  }

  // ✅ Recharger automatiquement après 2 secondes (pour que l'utilisateur voie le toast)
  setTimeout(() => {
    console.log('🔄 Rechargement automatique...');
    // Forcer le rechargement complet (bypass cache)
    window.location.reload();
  }, 2000);
}

// Mode debug pour forcer le rechargement
if (isDevelopment()) {
  (window as any).forceUpdate = () => {
    console.log('🔥 Force update déclenché manuellement');
    localStorage.removeItem('app-last-modified');
    localStorage.removeItem('app-etag');
    forceReload();
  };
  
  (window as any).clearAllCaches = async () => {
    if ('caches' in window) {
      const names = await caches.keys();
      await Promise.all(names.map(name => caches.delete(name)));
      console.log('✅ Tous les caches supprimés:', names);
    }
    // 🚫 Service Worker désactivé temporairement
    /*
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHE' });
    }
    */
    localStorage.clear();
    sessionStorage.clear();
    window.location.reload();
  };
}
