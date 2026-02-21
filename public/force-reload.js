/**
 * 🚀 v513.0 - FORCE RELOAD SCRIPT
 * 
 * Ce script force le navigateur à recharger TOUT depuis le réseau
 */

(function() {
  'use strict';
  
  const VERSION = 'v513-ultimate';
  const FORCE_RELOAD_KEY = 'smartcabb-force-reload-done';
  
  console.log('🔥 v513: Force Reload Script activated');
  
  // Vérifier si on a déjà fait le force reload pour cette version
  const lastReload = localStorage.getItem(FORCE_RELOAD_KEY);
  
  if (lastReload !== VERSION) {
    console.log('🧨 v513: First load of this version, forcing hard reload');
    
    // Marquer qu'on a fait le reload
    localStorage.setItem(FORCE_RELOAD_KEY, VERSION);
    
    // Forcer un hard reload (bypass cache)
    setTimeout(() => {
      console.log('💥 v513: Executing hard reload NOW');
      window.location.reload(true); // Hard reload
    }, 100);
  } else {
    console.log('✅ v513: Already reloaded for this version, proceeding normally');
  }
  
  // Nettoyer les anciennes clés
  try {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.includes('react-router') || 
        key.includes('esm.sh') || 
        key.includes('router-') ||
        key.includes('route-')
      )) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => {
      console.log('🧹 v513: Removing suspicious key:', key);
      localStorage.removeItem(key);
    });
    
    if (keysToRemove.length > 0) {
      console.log('✅ v513: Cleaned', keysToRemove.length, 'suspicious keys');
    }
  } catch(e) {
    console.warn('⚠️ v513: Could not clean localStorage:', e);
  }
})();
