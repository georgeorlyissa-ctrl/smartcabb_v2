/**
 * 🔄 CACHE BUSTER - Version 3.0.11
 * Force le navigateur à recharger le code JavaScript
 * 
 * @date 2026-03-09
 * @changelog v3.0.11 - Outils de diagnostic complets + Analyse profonde erreurs
 */

export const APP_VERSION = '3.0.11-diagnostic-20260309';

export function clearAuthCache() {
  try {
    // Vider le localStorage
    const keysToRemove = Object.keys(localStorage).filter(key => 
      key.includes('auth') || 
      key.includes('supabase') || 
      key.includes('session')
    );
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      console.log('🗑️ Cache supprimé:', key);
    });
    
    // Vider le sessionStorage
    sessionStorage.clear();
    
    console.log('✅ Cache d\'authentification vidé');
    console.log('🔄 Version de l\'application:', APP_VERSION);
    
    return true;
  } catch (error) {
    console.error('❌ Erreur lors du vidage du cache:', error);
    return false;
  }
}

// Exécuter automatiquement au chargement pour forcer le rechargement
if (typeof window !== 'undefined') {
  const lastVersion = localStorage.getItem('app_version');
  
  if (lastVersion !== APP_VERSION) {
    console.log('🔄 Nouvelle version détectée:', APP_VERSION);
    console.log('🗑️ Ancienne version:', lastVersion);
    clearAuthCache();
    localStorage.setItem('app_version', APP_VERSION);
    console.log('✅ Cache mis à jour pour la version', APP_VERSION);
  }
}
