/**
 * Cache Manager - Force le rafraîchissement du cache dans l'aperçu Figma
 */

// Version de l'application - Incrémenter pour forcer le refresh
export const APP_VERSION = '110.0';
export const BUILD_TIME = Date.now();

/**
 * Force le rafraîchissement complet du cache
 */
export function clearAppCache() {
  try {
    // Clear localStorage
    if (typeof window !== 'undefined' && window.localStorage) {
      const keysToKeep = ['supabase.auth.token']; // Garder les tokens auth
      const storage: { [key: string]: string } = {};
      
      keysToKeep.forEach(key => {
        const value = localStorage.getItem(key);
        if (value) storage[key] = value;
      });
      
      localStorage.clear();
      
      // Restaurer les clés importantes
      Object.keys(storage).forEach(key => {
        localStorage.setItem(key, storage[key]);
      });
      
      console.log('✅ Cache localStorage vidé (tokens auth préservés)');
    }
    
    // Clear sessionStorage
    if (typeof window !== 'undefined' && window.sessionStorage) {
      sessionStorage.clear();
      console.log('✅ Cache sessionStorage vidé');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Erreur lors du vidage du cache:', error);
    return false;
  }
}

/**
 * Vérifie si une nouvelle version est disponible
 */
export function checkForUpdate() {
  try {
    const storedVersion = localStorage.getItem('smartcabb_version');
    
    if (storedVersion !== APP_VERSION) {
      console.log(`🔄 Nouvelle version détectée: ${storedVersion} -> ${APP_VERSION}`);
      localStorage.setItem('smartcabb_version', APP_VERSION);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('❌ Erreur lors de la vérification de version:', error);
    return false;
  }
}

/**
 * Force le rechargement de la page (utile pour l'aperçu Figma)
 */
export function forceReload() {
  try {
    if (typeof window !== 'undefined') {
      // Ajouter un timestamp pour éviter le cache
      const url = new URL(window.location.href);
      url.searchParams.set('_v', APP_VERSION);
      url.searchParams.set('_t', BUILD_TIME.toString());
      
      // Utiliser replace pour éviter d'ajouter une entrée dans l'historique
      window.location.replace(url.toString());
    }
  } catch (error) {
    console.error('❌ Erreur lors du rechargement forcé:', error);
  }
}

/**
 * Ajoute des headers no-cache aux requêtes fetch
 */
export function getNoCacheHeaders() {
  return {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  };
}

/**
 * Ajoute un paramètre de cache-busting à une URL
 */
export function addCacheBuster(url: string): string {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}_v=${APP_VERSION}&_t=${BUILD_TIME}`;
}

console.log(`📦 Cache Manager initialisé - Version ${APP_VERSION} - Build ${BUILD_TIME}`);