/**
 * Utilitaires de compatibilité Safari/iOS
 * Gère les problèmes spécifiques à Safari sur iPad et iPhone
 */

import { detectBrowser } from './browserDetection';

/**
 * Vérifie si on est sur Safari
 */
export function isSafari(): boolean {
  const browser = detectBrowser();
  return browser.isSafari;
}

/**
 * Vérifie si on est sur iOS (iPhone/iPad)
 */
export function isIOS(): boolean {
  const browser = detectBrowser();
  return browser.isIOS;
}

/**
 * Applique les correctifs Safari au démarrage
 */
export function applySafariFixes(): void {
  // ✅ SSR FIX: Vérifier que nous sommes côté client
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }
  
  const browser = detectBrowser();
  
  if (!browser.isSafari && !browser.isIOS) {
    return; // Pas besoin de correctifs
  }
  
  console.log('🍎 Application des correctifs Safari/iOS...');
  
  // 1. Fix viewport height pour Safari iOS
  if (browser.isIOS) {
    const setVh = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    
    setVh();
    window.addEventListener('resize', setVh);
    window.addEventListener('orientationchange', setVh);
    
    // Empêcher le zoom au focus sur les inputs
    const metaViewport = document.querySelector('meta[name="viewport"]');
    if (metaViewport) {
      metaViewport.setAttribute('content', 
        'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no'
      );
    }
  }
  
  // 2. Fix pour les animations CSS
  if (browser.isSafari) {
    document.documentElement.classList.add('safari-browser');
    
    // Forcer le GPU rendering pour les animations
    const style = document.createElement('style');
    style.textContent = `
      .safari-browser * {
        -webkit-transform: translateZ(0);
        -webkit-backface-visibility: hidden;
        -webkit-perspective: 1000;
      }
    `;
    document.head.appendChild(style);
  }
  
  // 3. Fix LocalStorage - Vérifier la disponibilité
  try {
    if (typeof localStorage !== 'undefined') {
      const testKey = '__safari_storage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      console.log('✅ LocalStorage disponible sur Safari');
    }
  } catch (e) {
    console.error('❌ LocalStorage bloqué sur Safari (mode privé?)');
    alert('SmartCabb nécessite l\'accès au stockage local. Veuillez désactiver le mode navigation privée.');
  }
  
  // 4. Fix pour le scroll momentum
  if (browser.isIOS) {
    document.body.style.webkitOverflowScrolling = 'touch';
  }
  
  // 5. Désactiver le bounce scroll sur iOS
  document.addEventListener('touchmove', (e) => {
    if ((e.target as HTMLElement).closest('.allow-scroll')) {
      return; // Permettre le scroll dans certains éléments
    }
  }, { passive: false });
  
  // 6. Fix pour les inputs - Empêcher le zoom
  const inputs = document.querySelectorAll('input, textarea, select');
  inputs.forEach((input) => {
    input.addEventListener('touchstart', (e) => {
      e.stopPropagation();
    }, { passive: true });
  });
  
  console.log('✅ Correctifs Safari/iOS appliqués avec succès');
}

/**
 * Vérifie la disponibilité du LocalStorage
 */
export function isLocalStorageAvailable(): boolean {
  try {
    const test = '__localStorage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Stockage sécurisé compatible Safari
 * Utilise localStorage avec fallback vers sessionStorage ou mémoire
 */
class SafariSafeStorage {
  private storage: Storage | Map<string, string>;
  private isLocalStorage: boolean;
  
  constructor() {
    // ✅ SSR FIX: Ne pas instancier si on est côté serveur
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      this.storage = new Map();
      this.isLocalStorage = false;
      console.warn('⚠️ SafariSafeStorage: window/localStorage non disponible (SSR)');
      return;
    }

    // ✅ PRODUCTION FIX: Attendre que l'environnement soit prêt
    if (!(window as any).__SMARTCABB_CLIENT_READY__) {
      console.warn('⚠️ SafariSafeStorage: Environnement client pas encore prêt, utilisation Map');
      this.storage = new Map();
      this.isLocalStorage = false;
      return;
    }

    try {
      // Tenter d'utiliser localStorage
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      this.storage = localStorage;
      this.isLocalStorage = true;
      console.log('✅ SafariSafeStorage: Utilisation de localStorage');
    } catch (e) {
      try {
        // Fallback vers sessionStorage
        const test = '__storage_test__';
        sessionStorage.setItem(test, test);
        sessionStorage.removeItem(test);
        this.storage = sessionStorage;
        this.isLocalStorage = false;
        console.warn('⚠️ SafariSafeStorage: Fallback vers sessionStorage (données temporaires)');
      } catch (e2) {
        // Fallback vers Map en mémoire
        this.storage = new Map();
        this.isLocalStorage = false;
        console.error('❌ SafariSafeStorage: Fallback vers stockage mémoire (données perdues au refresh)');
      }
    }
  }
  
  getItem(key: string): string | null {
    if (this.storage instanceof Map) {
      return this.storage.get(key) || null;
    }
    return this.storage.getItem(key);
  }
  
  setItem(key: string, value: string): void {
    if (this.storage instanceof Map) {
      this.storage.set(key, value);
    } else {
      this.storage.setItem(key, value);
    }
  }
  
  removeItem(key: string): void {
    if (this.storage instanceof Map) {
      this.storage.delete(key);
    } else {
      this.storage.removeItem(key);
    }
  }
  
  clear(): void {
    if (this.storage instanceof Map) {
      this.storage.clear();
    } else {
      this.storage.clear();
    }
  }
  
  get usingLocalStorage(): boolean {
    return this.isLocalStorage;
  }
}

// ✅ FIX PRODUCTION: Utiliser un getter lazy au lieu d'instancier immédiatement
let safariStorageInstance: SafariSafeStorage | null = null;

export const safariStorage = {
  get instance(): SafariSafeStorage {
    if (!safariStorageInstance) {
      safariStorageInstance = new SafariSafeStorage();
    }
    return safariStorageInstance;
  },
  
  getItem(key: string): string | null {
    return this.instance.getItem(key);
  },
  
  setItem(key: string, value: string): void {
    this.instance.setItem(key, value);
  },
  
  removeItem(key: string): void {
    this.instance.removeItem(key);
  },
  
  clear(): void {
    this.instance.clear();
  },
  
  get usingLocalStorage(): boolean {
    return this.instance.usingLocalStorage;
  }
};

/**
 * Vérifie si les Service Workers sont supportés
 */
export function areServiceWorkersSupported(): boolean {
  return 'serviceWorker' in navigator;
}

/**
 * Enregistre le Service Worker de manière sécurisée pour Safari
 */
export async function registerServiceWorkerSafely(): Promise<boolean> {
  if (!areServiceWorkersSupported()) {
    console.warn('⚠️ Service Workers non supportés sur ce navigateur');
    return false;
  }
  
  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    console.log('✅ Service Worker enregistré:', registration);
    return true;
  } catch (error) {
    console.error('❌ Erreur enregistrement Service Worker:', error);
    return false;
  }
}

/**
 * Fix pour les événements touch sur Safari
 */
export function fixSafariTouchEvents(): void {
  // Empêcher le double-tap zoom
  let lastTouchEnd = 0;
  document.addEventListener('touchend', (e) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
      e.preventDefault();
    }
    lastTouchEnd = now;
  }, { passive: false });
  
  console.log('✅ Fix touch events Safari appliqué');
}

/**
 * Détecte si on est en mode navigation privée Safari
 */
export async function isPrivateBrowsing(): Promise<boolean> {
  return new Promise((resolve) => {
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    
    if (!isSafari) {
      resolve(false);
      return;
    }
    
    try {
      if (!isLocalStorageAvailable()) {
        resolve(true); // LocalStorage bloqué = mode privé
        return;
      }
      
      // Test spécifique Safari
      const testKey = '__private_test__';
      const storage = window.sessionStorage;
      storage.setItem(testKey, '1');
      storage.removeItem(testKey);
      resolve(false);
    } catch (e) {
      resolve(true);
    }
  });
}