import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function usePWA() {
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Vérifier si l'app est déjà installée
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    setIsInstalled(isStandalone);

    // Écouter l'événement d'installation
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      setIsInstallable(true);
      console.log('💾 PWA: Installation disponible');
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      console.log('✅ PWA: Application installée');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = async () => {
    if (!deferredPrompt) {
      console.warn('⚠️ PWA: Pas de prompt disponible');
      return false;
    }

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      console.log(`📱 PWA: Choix utilisateur: ${outcome}`);
      
      if (outcome === 'accepted') {
        setIsInstallable(false);
        setDeferredPrompt(null);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ PWA: Erreur lors de l\'installation:', error);
      return false;
    }
  };

  const updateServiceWorker = () => {
    // 🚫 Service Worker désactivé temporairement
    console.log('⚠️ PWA: Service Worker désactivé temporairement');
    return;
    
    // Code commenté pour éviter les erreurs de Service Worker
    /*
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.update();
        console.log('🔄 PWA: Mise à jour du Service Worker demandée');
      });
    }
    */
  };

  const clearCache = async () => {
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map((cacheName) => caches.delete(cacheName))
      );
      console.log('🗑️ PWA: Cache vidé');
    }
  };

  return {
    isInstallable,
    isInstalled,
    promptInstall,
    updateServiceWorker,
    clearCache,
  };
}

// Hook pour vérifier le statut en ligne/hors ligne
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Afficher uniquement en cas de retour en ligne (pas au démarrage)
      if (!isOnline) {
        console.log('✅ Connexion rétablie');
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      // Message silencieux - pas d'alerte car l'iframe peut déclencher de faux positifs
      console.log('📡 Mode hors ligne détecté (peut être temporaire)');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isOnline]);

  return isOnline;
}