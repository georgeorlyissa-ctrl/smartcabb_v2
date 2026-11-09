// ✅ PROTECTION SSR: Polyfill pour éviter "Illegal constructor"

// Protection 1: S'assurer que nous sommes côté client
if (typeof window === 'undefined') {
  throw new Error('❌ Ce code ne devrait jamais s\'exécuter côté serveur');
}

// Protection 2: Créer des stubs pour les APIs manquantes
window.__SMARTCABB_CLIENT_READY__ = false;

// 🎯 APK mode detection: inject CSS BEFORE any React render
(function() {
  try {
    var isApk = false;
    try {
      isApk = window.location.search.indexOf('platform=apk') !== -1
        || window.location.href.indexOf('platform=apk') !== -1
        || !!(window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform())
        || localStorage.getItem('sc_is_apk') === '1';
    } catch (e) {}

    if (isApk) {
      // Mémorisé : même si l'URL perd ?platform=apk, l'app reste reconnue
      try { localStorage.setItem('sc_is_apk', '1'); } catch (e) {}

      // Marqueur global : active les marges de sécurité Android (barre système)
      document.documentElement.classList.add('cap-apk');
      var s = document.createElement('style');
      s.id = 'apk-hide-style';
      s.textContent = '.hide-in-apk { display: none !important; }';
      document.head.appendChild(s);
    }
  } catch(e) {}
})();

// Protection 3: Wrapper sécurisé pour localStorage/sessionStorage
(function() {
  try {
    const test = '__test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    console.log('✅ localStorage disponible');
  } catch (e) {
    console.warn('⚠️ localStorage non disponible, création d\'un fallback');
    
    // Créer un fallback en mémoire
    const memoryStorage = new Map();
    
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: (key) => memoryStorage.get(key) || null,
        setItem: (key, value) => memoryStorage.set(key, value),
        removeItem: (key) => memoryStorage.delete(key),
        clear: () => memoryStorage.clear(),
        key: (index) => {
          const keys = Array.from(memoryStorage.keys());
          return keys[index] || null;
        },
        get length() {
          return memoryStorage.size;
        }
      },
      writable: false,
      configurable: false
    });
  }
  
  // Marquer comme prêt
  window.__SMARTCABB_CLIENT_READY__ = true;
  console.log('✅ Environnement client initialisé');
})();
