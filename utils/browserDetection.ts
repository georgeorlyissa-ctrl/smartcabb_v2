/**
 * Détection et optimisation du navigateur
 * Gère les spécificités de chaque navigateur (Chrome, Safari, Firefox, etc.)
 */

// Types de navigateur
export interface BrowserInfo {
  name: string;
  version: string;
  isChrome: boolean;
  isSafari: boolean;
  isFirefox: boolean;
  isEdge: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isMobile: boolean;
  supportsWebGL: boolean;
  supportsServiceWorker: boolean;
}

/**
 * Détecte le navigateur utilisé
 */
export function detectBrowser(): BrowserInfo {
  // ✅ SSR FIX: Vérifier que nous sommes côté client
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      name: 'Unknown',
      version: '0.0.0',
      isChrome: false,
      isSafari: false,
      isFirefox: false,
      isEdge: false,
      isIOS: false,
      isAndroid: false,
      isMobile: false,
      supportsWebGL: false,
      supportsServiceWorker: false,
    };
  }

  const ua = navigator.userAgent;
  
  // Détection du système d'exploitation
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
  const isAndroid = /Android/.test(ua);
  const isMobile = isIOS || isAndroid || /Mobile|mini|Fennec|Android|iP(ad|od|hone)/.test(ua);
  
  // Détection du navigateur
  const isChrome = /Chrome/.test(ua) && /Google Inc/.test(navigator.vendor);
  const isSafari = /Safari/.test(ua) && /Apple Computer/.test(navigator.vendor);
  const isFirefox = /Firefox/.test(ua);
  const isEdge = /Edg/.test(ua);
  
  // Version du navigateur
  let version = '0.0.0';
  let name = 'Unknown';
  
  if (isEdge) {
    name = 'Edge';
    const match = ua.match(/Edg\/(\d+\.\d+)/);
    version = match ? match[1] : '0.0.0';
  } else if (isChrome) {
    name = 'Chrome';
    const match = ua.match(/Chrome\/(\d+\.\d+)/);
    version = match ? match[1] : '0.0.0';
  } else if (isSafari) {
    name = 'Safari';
    const match = ua.match(/Version\/(\d+\.\d+)/);
    version = match ? match[1] : '0.0.0';
  } else if (isFirefox) {
    name = 'Firefox';
    const match = ua.match(/Firefox\/(\d+\.\d+)/);
    version = match ? match[1] : '0.0.0';
  }
  
  // Support WebGL
  let supportsWebGL = false;
  try {
    const canvas = document.createElement('canvas');
    supportsWebGL = !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch (e) {
    supportsWebGL = false;
  }
  
  // Support Service Worker
  const supportsServiceWorker = 'serviceWorker' in navigator;
  
  return {
    name,
    version,
    isChrome,
    isSafari,
    isFirefox,
    isEdge,
    isIOS,
    isAndroid,
    isMobile,
    supportsWebGL,
    supportsServiceWorker,
  };
}

/**
 * Applique les optimisations spécifiques au navigateur
 */
export function applyBrowserOptimizations(): void {
  // ✅ SSR FIX: Vérifier que nous sommes côté client
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  const browser = detectBrowser();
  
  console.log(`🌐 Navigateur détecté: ${browser.name} ${browser.version}`);
  console.log(`📱 Mobile: ${browser.isMobile ? 'Oui' : 'Non'}`);
  console.log(`🎨 WebGL: ${browser.supportsWebGL ? 'Supporté' : 'Non supporté'}`);
  console.log(`⚙️ Service Worker: ${browser.supportsServiceWorker ? 'Supporté' : 'Non supporté'}`);
  
  // Optimisations spécifiques Safari
  if (browser.isSafari || browser.isIOS) {
    console.log('🍎 Application des optimisations Safari/iOS...');

    // ✅ FIX: Ne pas ajouter les écouteurs ici, ils sont gérés dans App.tsx
    // pour éviter les duplications et les boucles infinies

    // Ajouter une classe CSS pour les optimisations Safari
    document.documentElement.classList.add('safari-browser');
  }
  
  // Optimisations Chrome
  if (browser.isChrome) {
    console.log('🔷 Application des optimisations Chrome...');
    document.documentElement.classList.add('chrome-browser');
  }
  
  // Optimisations Firefox
  if (browser.isFirefox) {
    console.log('🦊 Application des optimisations Firefox...');
    document.documentElement.classList.add('firefox-browser');
  }
  
  // Optimisations Mobile génériques
  if (browser.isMobile) {
    console.log('📱 Application des optimisations mobile...');
    document.documentElement.classList.add('mobile-browser');
    
    // Désactiver le zoom sur les inputs (mobile)
    const metaViewport = document.querySelector('meta[name="viewport"]');
    if (metaViewport) {
      metaViewport.setAttribute(
        'content',
        'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no'
      );
    }
  }
  
  // Avertir si Service Worker n'est pas supporté
  if (!browser.supportsServiceWorker) {
    console.log('ℹ️ Service Workers non supportés - Mode hors ligne limité');
  }
  
  // ✅ WebGL n'est pas utilisé dans SmartCabb - Pas besoin d'avertir
  // Les animations utilisent CSS et Motion/React, pas WebGL
  if (!browser.supportsWebGL) {
    console.log('ℹ️ WebGL non disponible (non critique pour SmartCabb)');
  }
}

/**
 * Vérifie si on est en mode développement
 */
export function isDevelopment(): boolean {
  // ✅ SSR FIX: Vérifier que nous sommes côté client
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    return (
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.port === '5173' ||
      window.location.port === '3000'
    );
  } catch {
    return false;
  }
}

/**
 * Log les informations du navigateur dans la console
 */
export function logBrowserInfo(): void {
  const browser = detectBrowser();
  
  console.group('🌐 Informations du navigateur');
  console.table({
    'Navigateur': browser.name,
    'Version': browser.version,
    'Mobile': browser.isMobile ? 'Oui' : 'Non',
    'iOS': browser.isIOS ? 'Oui' : 'Non',
    'Android': browser.isAndroid ? 'Oui' : 'Non',
    'WebGL': browser.supportsWebGL ? 'Supporté' : 'Non supporté',
    'Service Worker': browser.supportsServiceWorker ? 'Supporté' : 'Non supporté',
  });
  console.groupEnd();
}

/**
 * Applique les correctifs spécifiques à Safari
 * (Alias de applyBrowserOptimizations pour compatibilité)
 */
export function applySafariFixes(): void {
  applyBrowserOptimizations();
}

/**
 * Détecte si le navigateur est en mode navigation privée
 */
export async function isPrivateBrowsing(): Promise<boolean> {
  // ✅ SSR FIX: Vérifier que nous sommes côté client
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    // Test pour Safari
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const { quota } = await navigator.storage.estimate();
      // Safari en mode privé limite le quota à 0
      if (quota && quota < 120000000) {
        return true;
      }
    }

    // Test pour Firefox
    const db = indexedDB.open('test');
    return new Promise((resolve) => {
      db.onerror = () => resolve(true);
      db.onsuccess = () => {
        indexedDB.deleteDatabase('test');
        resolve(false);
      };
    });
  } catch {
    return false;
  }
}
