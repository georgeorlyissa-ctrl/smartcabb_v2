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
    'chrome-extension://',
    'moz-extension://',
    'webkit-masked-url',
    'Script error',                                 // Erreur cross-origin sans détail
  ];

  const isBenign = (message: string) =>
    BENIGN_PATTERNS.some(p => message?.includes(p));

  // Intercepter les erreurs JavaScript
  window.addEventListener('error', (event) => {
    // ✅ Ignorer les erreurs bénignes
    if (isBenign(event.message)) {
      event.preventDefault();
      console.warn('⚠️ Erreur bénigne ignorée (pas d\'overlay):', event.message);
      return;
    }

    console.error('❌ ERREUR NON CAPTURÉE:', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error
    });
    
    // Afficher une popup d'erreur
    const errorMessage = `${event.message}\n\nFichier: ${event.filename}:${event.lineno}:${event.colno}`;
    showErrorOverlay(errorMessage);
  });
  
  // Intercepter les promesses rejetées
  window.addEventListener('unhandledrejection', (event) => {
    const reason = String(event.reason || '');

    // ✅ Ignorer les rejets bénins
    if (isBenign(reason)) {
      event.preventDefault();
      console.warn('⚠️ Rejet bénin ignoré:', reason);
      return;
    }

    console.error('❌ PROMESSE NON GÉRÉE:', {
      reason: event.reason,
      promise: event.promise
    });
    
    const errorMessage = `Promesse non gérée: ${event.reason}`;
    showErrorOverlay(errorMessage);
  });
  
  console.log('✅ Intercepteurs d\'erreurs configurés (ResizeObserver filtré)');
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
      <button onclick="localStorage.clear(); window.location.href='/'" style="background: #f59e0b; color: white; border: none; padding: 0.75rem 2rem; border-radius: 0.5rem; cursor: pointer; font-size: 1rem; font-weight: bold; margin-left: 0.5rem;">
        🧹 Nettoyer et redémarrer
      </button>
    </div>
  `;
}
