/**
 * 🔥💥 ULTRA CACHE DESTRUCTION v513.0
 * Script de nettoyage COMPLET de tous les caches
 */

(async function ultraCacheDestruction() {
  try {
    // ÉTAPE 1: Détruire TOUS les Service Workers
    console.log('💣 STEP 1: Unregistering ALL Service Workers...');
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      console.log(`Found ${registrations.length} Service Workers to destroy`);
      
      for (const registration of registrations) {
        await registration.unregister();
        console.log('🔥 Service Worker unregistered:', registration.scope);
      }
    }

    // ÉTAPE 2: Détruire TOUS les caches
    console.log('💣 STEP 2: Destroying ALL caches...');
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      console.log(`Found ${cacheNames.length} caches to destroy:`, cacheNames);
      
      for (const cacheName of cacheNames) {
        await caches.delete(cacheName);
        console.log('🔥 Cache deleted:', cacheName);
      }
    }

    // ÉTAPE 3: Vider localStorage
    console.log('💣 STEP 3: Clearing localStorage...');
    try {
      const keysToDelete = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
          key.includes('react-router') ||
          key.includes('router') ||
          key.includes('navigation') ||
          key.includes('npm') ||
          key.includes('esm') ||
          key.includes('cache')
        )) {
          keysToDelete.push(key);
        }
      }
      
      keysToDelete.forEach(key => {
        localStorage.removeItem(key);
        console.log('🔥 localStorage removed:', key);
      });
      
      console.log(`✅ Removed ${keysToDelete.length} localStorage items`);
    } catch (e) {
      console.warn('⚠️ localStorage clearing failed:', e);
    }

    // ÉTAPE 4: Vider sessionStorage
    console.log('💣 STEP 4: Clearing sessionStorage...');
    try {
      sessionStorage.clear();
      console.log('✅ sessionStorage cleared');
    } catch (e) {
      console.warn('⚠️ sessionStorage clearing failed:', e);
    }

    // ÉTAPE 5: Détruire IndexedDB
    console.log('💣 STEP 5: Destroying IndexedDB...');
    if ('indexedDB' in window) {
      try {
        const databases = await indexedDB.databases();
        for (const db of databases) {
          if (db.name) {
            indexedDB.deleteDatabase(db.name);
            console.log('🔥 IndexedDB deleted:', db.name);
          }
        }
      } catch (e) {
        console.warn('⚠️ IndexedDB deletion failed:', e);
      }
    }

    // ÉTAPE 6: Forcer le rechargement complet
    console.log('💣 STEP 6: Force reloading with cache bypass...');
    console.log('✅ ALL CACHES DESTROYED - Reloading in 1 second...');
    
    setTimeout(() => {
      // Hard reload avec bypass du cache
      window.location.reload(true);
    }, 1000);

  } catch (error) {
    console.error('❌ Ultra cache destruction failed:', error);
    // Forcer le reload même en cas d'erreur
    setTimeout(() => {
      window.location.reload(true);
    }, 2000);
  }
})();