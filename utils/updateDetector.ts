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

  // 4. Écouter les messages du Service Worker - désactivé temporairement
  // 🚫 Code désactivé pour éviter les erreurs de Service Worker
  /*
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'FORCE_RELOAD') {
        console.log('🔥 Rechargement forcé par le Service Worker');
        window.location.reload();
      }
    });

    // 5. Détecter un nouveau Service Worker
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('🆕 Nouveau Service Worker détecté - rechargement...');
      window.location.reload();
    });
  }
  */
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
  // Afficher une notification à l'utilisateur
  const shouldReload = confirm(
    '🆕 Une nouvelle version de SmartCabb est disponible!\n\n' +
    'Voulez-vous recharger maintenant pour obtenir les dernières améliorations?'
  );

  if (shouldReload) {
    // Vider tous les caches
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => caches.delete(name));
      });
    }

    // Forcer le rechargement complet (bypass cache)
    window.location.reload();
  }
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