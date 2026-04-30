// 🔄 DÉTECTEUR DE MISE À JOUR AUTOMATIQUE

let updateCheckInterval: ReturnType<typeof setInterval> | null = null;
// ✅ FIX: Compteur pour limiter les tentatives de report (évite la récursion infinie)
let reloadRetryCount = 0;
const MAX_RELOAD_RETRIES = 3;

const isDevelopment = () => {
  if (typeof window === 'undefined') return false;
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
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return;
  
  console.log('🔍 Détection de mise à jour activée');

  if (!isDevelopment() && window.location.hostname.includes('figma')) {
    console.log('⚠️ Détection de mise à jour désactivée en mode prévisualisation Figma');
    return;
  }

  checkForUpdates();

  if (isDevelopment()) {
    updateCheckInterval = setInterval(checkForUpdates, 30000);
  } else {
    updateCheckInterval = setInterval(checkForUpdates, 5 * 60 * 1000);
  }

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'SW_UPDATED') {
        console.log('🆕 Service Worker mis à jour - version:', event.data.version);
        setTimeout(() => forceReload(), 3000);
      }
      if (event.data && event.data.type === 'FORCE_RELOAD') {
        console.log('🔥 Rechargement forcé par le Service Worker');
        forceReload();
      }
    });

    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      console.log('🆕 Nouveau Service Worker a pris le contrôle');
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
  if (window.location.hostname.includes('figma') || 
      window.location.hostname.includes('preview') ||
      window.location.hostname.includes('--')) {
    return;
  }

  try {
    const response = await fetch('/index.html', {
      method: 'HEAD',
      cache: 'no-cache',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

    if (!response.ok) return;

    const lastModified = response.headers.get('Last-Modified');
    const etag = response.headers.get('ETag');
    
    const storedLastModified = localStorage.getItem('app-last-modified');
    const storedEtag = localStorage.getItem('app-etag');

    if (!storedLastModified && !storedEtag) {
      if (lastModified) localStorage.setItem('app-last-modified', lastModified);
      if (etag) localStorage.setItem('app-etag', etag);
      return;
    }

    const hasChanged = 
      (lastModified && lastModified !== storedLastModified) ||
      (etag && etag !== storedEtag);

    if (hasChanged) {
      console.log('🆕 Nouvelle version détectée!');
      console.log('Old ETag:', storedEtag, 'New ETag:', etag);
      console.log('Old Last-Modified:', storedLastModified, 'New Last-Modified:', lastModified);
      
      if (lastModified) localStorage.setItem('app-last-modified', lastModified);
      if (etag) localStorage.setItem('app-etag', etag);

      // ✅ FIX: Réinitialiser le compteur à chaque nouvelle version détectée
      reloadRetryCount = 0;
      forceReload();
    }
    
    return hasChanged;
  } catch (error) {
    return false;
  }
}

export const checkForUpdate = checkForUpdates;

function isActiveRide(rideStr: string | null): boolean {
  // ✅ FIX CRITIQUE: Vérifier que la course n'est pas annulée/terminée
  // Avant, hasActiveRide = !!rideStr → true même pour les courses annulées
  if (!rideStr || rideStr === 'null') return false;
  try {
    const ride = JSON.parse(rideStr);
    // Seulement les courses vraiment actives bloquent la mise à jour
    const activeStatuses = ['pending', 'accepted', 'arriving', 'in_progress', 'started'];
    return activeStatuses.includes(ride?.status);
  } catch {
    return false;
  }
}

function forceReload() {
  console.log('🔄 Mise à jour automatique détectée - Préparation du rechargement...');

  const currentScreen = localStorage.getItem('smartcab_current_screen');
  const currentRideStr = localStorage.getItem('smartcab_current_ride');

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

  // ✅ FIX CRITIQUE: Utiliser isActiveRide() au lieu de !!currentRideStr
  // Une course cancelled/completed ne doit pas bloquer la mise à jour
  const hasActiveRide = isActiveRide(currentRideStr);
  const isCriticalScreen = criticalScreens.some(screen => currentScreen?.includes(screen));

  if (hasActiveRide || isCriticalScreen) {
    // ✅ FIX: Limiter le nombre de retries pour éviter la récursion infinie
    reloadRetryCount++;
    
    if (reloadRetryCount > MAX_RELOAD_RETRIES) {
      console.log(`⚠️ Trop de tentatives de report (${reloadRetryCount}/${MAX_RELOAD_RETRIES}) - mise à jour ignorée jusqu'au prochain check`);
      reloadRetryCount = 0; // Reset pour le prochain cycle
      return; // ✅ SORTIR au lieu de boucler indéfiniment
    }

    console.log(`⏳ Mise à jour reportée (${reloadRetryCount}/${MAX_RELOAD_RETRIES}) - Utilisateur en cours d'action`);
    console.log('   Screen:', currentScreen);
    console.log('   Active ride:', hasActiveRide);

    // ✅ FIX: setTimeout non-récursif — utilise checkForUpdates au lieu de forceReload
    // pour laisser le prochain cycle de polling décider si on peut mettre à jour
    setTimeout(() => {
      console.log('🔄 Nouvelle tentative de mise à jour...');
      // ✅ On re-vérifie plutôt que de rappeler forceReload directement
      checkForUpdates();
    }, 2 * 60 * 1000);

    return;
  }

  // Reset compteur si on arrive ici (pas de course active)
  reloadRetryCount = 0;

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
        from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
        to { opacity: 1; transform: translateX(-50%) translateY(0); }
      }
    </style>
  `;
  document.body.appendChild(toast);

  if ('caches' in window) {
    caches.keys().then(names => {
      Promise.all(names.map(name => caches.delete(name)))
        .then(() => console.log('✅ Caches vidés:', names))
        .catch(err => console.warn('⚠️ Erreur vidage cache:', err));
    });
  }

  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHE' });
    navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
  }

  setTimeout(() => {
    console.log('🔄 Rechargement automatique...');
    window.location.reload();
  }, 2000);
}

if (isDevelopment()) {
  (window as any).forceUpdate = () => {
    console.log('🔥 Force update déclenché manuellement');
    localStorage.removeItem('app-last-modified');
    localStorage.removeItem('app-etag');
    reloadRetryCount = 0;
    forceReload();
  };
  
  (window as any).clearAllCaches = async () => {
    if ('caches' in window) {
      const names = await caches.keys();
      await Promise.all(names.map(name => caches.delete(name)));
      console.log('✅ Tous les caches supprimés:', names);
    }
    localStorage.clear();
    sessionStorage.clear();
    window.location.reload();
  };
}
