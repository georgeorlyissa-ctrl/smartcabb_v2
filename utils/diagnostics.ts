/**
 * Utilitaires de diagnostic pour identifier les problèmes au démarrage
 */

export function logStartupDiagnostics() {
  console.group('🔍 DIAGNOSTICS DE DÉMARRAGE');
  
  try {
    // 1. Environnement
    console.log('1️⃣ ENVIRONNEMENT');
    console.log('  - window:', typeof window !== 'undefined' ? '✅' : '❌');
    console.log('  - document:', typeof document !== 'undefined' ? '✅' : '❌');
    console.log('  - navigator:', typeof navigator !== 'undefined' ? '✅' : '❌');
    console.log('  - localStorage:', typeof localStorage !== 'undefined' ? '✅' : '❌');
    
    // 2. URL et routing
    if (typeof window !== 'undefined') {
      console.log('2️⃣ ROUTING');
      console.log('  - href:', window.location.href);
      console.log('  - pathname:', window.location.pathname);
      console.log('  - hash:', window.location.hash);
      console.log('  - search:', window.location.search);
    }
    
    // 3. LocalStorage data
    if (typeof localStorage !== 'undefined') {
      console.log('3️⃣ LOCALSTORAGE');
      try {
        const currentView = localStorage.getItem('smartcab_current_view');
        const currentScreen = localStorage.getItem('smartcab_current_screen');
        const currentUser = localStorage.getItem('smartcab_current_user');
        const currentDriver = localStorage.getItem('smartcab_current_driver');
        
        console.log('  - current_view:', currentView || 'null');
        console.log('  - current_screen:', currentScreen || 'null');
        console.log('  - current_user:', currentUser ? 'présent' : 'null');
        console.log('  - current_driver:', currentDriver ? 'présent' : 'null');
      } catch (e) {
        console.error('  ❌ Erreur lecture localStorage:', e);
      }
    }
    
    // 4. Modules chargés
    console.log('4️⃣ MODULES');
    console.log('  - React:', typeof React !== 'undefined' ? '✅' : '❌');
    console.log('  - ReactDOM:', typeof ReactDOM !== 'undefined' ? '✅' : '❌');
    
    // 5. Build info
    console.log('5️⃣ BUILD INFO');
    console.log('  - Version: 517.6.0');
    console.log('  - Environment:', process.env.NODE_ENV);
    
  } catch (error) {
    console.error('❌ ERREUR PENDANT LES DIAGNOSTICS:', error);
  }
  
  console.groupEnd();
}

/**
 * Intercepte les erreurs non capturées
 */
export function setupErrorInterceptors() {
  if (typeof window === 'undefined') return;

  // ✅ Erreurs bénignes à ignorer (n'affichent PAS l'overlay)
  const BENIGN_PATTERNS = [
    'ResizeObserver loop',                          // Erreur cosmétique du navigateur
    'ResizeObserver loop completed',
    'ResizeObserver loop limit exceeded',
    'Non-Error exception captured',
    'Non-Error promise rejection captured',
    'was released because another request stole it', // Race bénigne supabase-js sur le verrou du token (multi-onglets)
    'Lock broken by another request',                // Web Locks : un autre onglet a récupéré le verrou (erreur attendue)
    'The lock request is aborted',                   // Variante Chromium du même événement
    'lock:sb-',                                      // Verrou d'auth supabase (transitoire, auto-réparé)
    'Acquiring lock',                                // Compétition de verrous auth, sans impact
    'chrome-extension://',
    'moz-extension://',
    'webkit-masked-url',
    'Script error',                                 // Erreur cross-origin sans détail
    // ─── Bruit des librairies tierces (ne cassent pas l'application) ────────
    'IntersectionObserver',                         // Bug Google Maps iOS : observe(null)
    'ResizeObserver',
    'gm_authFailure',
    'You must enable Billing',
    'Google Maps JavaScript API',
    'This page can\'t load Google Maps correctly',
    // ── Plugins natifs Capacitor appelés depuis une version qui ne les embarque
    //    pas encore (ex. app 1.5 + web 1.6) : fonctionnalité dégradée, pas un bug
    //    bloquant → jamais d'overlay technique pour l'utilisateur.
    'plugin is not implemented',
    'is not implemented on android',
    'is not implemented on ios',
    'is not implemented on web',
  ];

  const isBenign = (message: string) =>
    BENIGN_PATTERNS.some(p => message?.includes(p));

  /**
   * AbortError / verrous Web Locks : opérations volontairement annulées
   * (changement d'écran, refresh de session Supabase, autre onglet).
   * Elles ne cassent rien et ne doivent jamais afficher l'overlay rouge.
   */
  const isAbortLike = (error: any): boolean => {
    if (!error) return false;
    const name = String(error.name || '');
    const message = String(error.message || error || '');
    return (
      name === 'AbortError' ||
      name === 'TimeoutError' ||
      message.includes('AbortError') ||
      message.includes('Lock broken by another request') ||
      message.includes('lock request is aborted') ||
      message.includes('was released because another request stole it')
    );
  };

  /**
   * Erreur provenant d'un script tiers (Google Maps, widgets, etc.) :
   * elle ne doit JAMAIS afficher l'overlay technique à l'utilisateur.
   * On détecte via le nom de fichier et/ou la pile d'appels.
   */
  const THIRD_PARTY_HOSTS = [
    'maps.googleapis.com',
    'maps.gstatic.com',
    'google-analytics.com',
    'googletagmanager.com',
  ];

  const isThirdPartyNoise = (payload: {
    filename?: string;
    message?: string;
    stack?: string;
  }): boolean => {
    const haystack = `${payload.filename || ''}\n${payload.message || ''}\n${payload.stack || ''}`;
    return THIRD_PARTY_HOSTS.some(host => haystack.includes(host));
  };

  // Intercepter les erreurs JavaScript
  window.addEventListener('error', (event) => {
    const stack = (event.error as any)?.stack ? String((event.error as any).stack) : '';

    // ✅ Opérations annulées (AbortController) et verrous Web Locks : bénin
    if (isAbortLike(event.error) || isAbortLike(event.message)) {
      event.preventDefault();
      console.warn('⚠️ AbortError ignorée (pas d\'overlay):', event.message);
      return;
    }

    // ✅ Ignorer les erreurs bénignes
    if (isBenign(event.message)) {
      event.preventDefault();
      console.warn('⚠️ Erreur bénigne ignorée (pas d\'overlay):', event.message);
      return;
    }

    // ✅ Ignorer les erreurs provenant de scripts tiers (Google Maps…)
    if (isThirdPartyNoise({ filename: event.filename, message: event.message, stack })) {
      event.preventDefault();
      console.warn('⚠️ Erreur tierce ignorée (pas d\'overlay):', event.message);
      return;
    }

    console.error('❌ ERREUR NON CAPTURÉE:', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error,
      stack: event.error?.stack
    });
    
    // Afficher une popup d'erreur avec stack si dispo (utile iOS)
    const stackSuffix = stack ? `\n\nStack:\n${String(stack).slice(0, 1200)}` : '';
    const errorMessage = `${event.message}\n\nFichier: ${event.filename}:${event.lineno}:${event.colno}${stackSuffix}`;
    showErrorOverlay(errorMessage);
  });
  
  // Intercepter les promesses rejetées
  window.addEventListener('unhandledrejection', (event) => {
    const reason = String(event.reason || '');
    const stack = (event.reason as any)?.stack ? String((event.reason as any).stack) : '';

    // ✅ AbortError / verrou volé par un autre onglet : bénin, auto-réparé
    if (isAbortLike(event.reason)) {
      event.preventDefault();
      console.warn('⚠️ Rejet AbortError ignoré (pas d\'overlay):', reason);
      return;
    }

    // ✅ Ignorer les rejets bénins
    if (isBenign(reason)) {
      event.preventDefault();
      console.warn('⚠️ Rejet bénin ignoré:', reason);
      return;
    }

    // ✅ Ignorer les rejets provenant de scripts tiers (Google Maps…)
    if (isThirdPartyNoise({ filename: (event.reason as any)?.fileName, message: reason, stack })) {
      event.preventDefault();
      console.warn('⚠️ Rejet tiers ignoré (pas d\'overlay):', reason);
      return;
    }

    console.error('❌ PROMESSE NON GÉRÉE:', {
      reason: event.reason,
      promise: event.promise,
      stack: (event.reason as any)?.stack
    });
    
    const errorMessage = `Promesse non gérée: ${event.reason}${stack ? `\n\nStack:\n${stack.slice(0, 1200)}` : ''}`;
    showErrorOverlay(errorMessage);
  });
  
  console.log('✅ Intercepteurs d\'erreurs configurés (ResizeObserver filtré)');
}

/**
 * Reset complet : vide les caches SW, désinscrit le SW, vide le storage.
 * Utilisé par le bouton "Nettoyer et redémarrer" de l'overlay d'erreur.
 */
if (typeof window !== 'undefined') {
  (window as any).__smartcabbHardReset = async () => {
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch {}
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
    } catch {}
    try { localStorage.clear(); } catch {}
    try { sessionStorage.clear(); } catch {}
    window.location.href = '/';
  };
}

/**
 * Affiche une overlay d'erreur pour l'utilisateur
 */
function showErrorOverlay(message: string) {
  if (typeof document === 'undefined') return;
  
  // Ne créer qu'une seule overlay
  let overlay = document.getElementById('error-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'error-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.9);
      color: white;
      z-index: 999999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      font-family: monospace;
    `;
    document.body.appendChild(overlay);
  }
  
  overlay.innerHTML = `
    <div style="max-width: 600px; background: #dc2626; padding: 2rem; border-radius: 1rem;">
      <h2 style="margin: 0 0 1rem 0; font-size: 1.5rem;">❌ Erreur détectée</h2>
      <pre style="white-space: pre-wrap; overflow: auto; max-height: 300px; background: rgba(0,0,0,0.3); padding: 1rem; border-radius: 0.5rem; margin-bottom: 1rem;">${message}</pre>
      <button onclick="window.location.reload()" style="background: white; color: #dc2626; border: none; padding: 0.75rem 2rem; border-radius: 0.5rem; cursor: pointer; font-size: 1rem; font-weight: bold;">
        🔄 Recharger la page
      </button>
      <button onclick="window.__smartcabbHardReset()" style="background: #f59e0b; color: white; border: none; padding: 0.75rem 2rem; border-radius: 0.5rem; cursor: pointer; font-size: 1rem; font-weight: bold; margin-left: 0.5rem;">
        🧹 Nettoyer et redémarrer
      </button>
    </div>
  `;
}
