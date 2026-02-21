import React, { useState, useEffect } from 'react';

// ✅ Utiliser des emojis au lieu de lucide-react pour éviter les erreurs esm.sh
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// Online/Offline Status Indicator
export function OnlineStatusIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Ne rien afficher si en ligne
  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-orange-500 text-white py-2 px-4 text-center text-sm font-medium flex items-center justify-center gap-2">
      <span className="text-base">📡</span>
      Vous êtes hors ligne
    </div>
  );
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Détecter iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Détecter si déjà installé (mode standalone)
    const standalone = window.matchMedia('(display-mode: standalone)').matches || 
                      (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    // Vérifier si déjà fermé
    const hasClosedPrompt = localStorage.getItem('smartcabb_pwa_prompt_closed');
    
    if (hasClosedPrompt === 'true' || standalone) {
      return;
    }

    // Attendre 5 secondes avant d'afficher le prompt
    const timer = setTimeout(() => {
      if (iOS && !standalone) {
        // Pour iOS, afficher les instructions manuelles
        setShowPrompt(true);
      }
    }, 5000);

    // Écouter l'événement beforeinstallprompt (Android/Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      
      // Attendre 5 secondes avant d'afficher
      setTimeout(() => {
        setShowPrompt(true);
      }, 5000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Afficher le prompt natif
    deferredPrompt.prompt();

    // Attendre le choix de l'utilisateur
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('✅ PWA installée avec succès');
    }

    // Nettoyer
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleClose = () => {
    setShowPrompt(false);
    localStorage.setItem('smartcabb_pwa_prompt_closed', 'true');
  };

  // Ne rien afficher si déjà installé
  if (isStandalone || !showPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 animate-in slide-in-from-bottom-8 duration-500 md:left-auto md:right-4 md:max-w-md">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-cyan-500 to-emerald-500 p-4 text-white relative">
          <button
            onClick={handleClose}
            className="absolute top-2 right-2 p-1 hover:bg-white/20 rounded-full transition-colors"
            aria-label="Fermer"
          >
            <span className="text-base">❌</span>
          </button>
          
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
              <span className="text-2xl font-black bg-gradient-to-br from-cyan-500 to-emerald-500 bg-clip-text text-transparent">
                SC
              </span>
            </div>
            <div>
              <h3 className="font-bold text-lg">Installer SmartCabb</h3>
              <p className="text-sm text-white/90">Accès rapide depuis votre écran d'accueil</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {isIOS ? (
            // Instructions iOS
            <div className="space-y-3">
              <p className="text-sm text-gray-700">
                Pour installer SmartCabb sur votre iPhone :
              </p>
              <ol className="text-sm text-gray-600 space-y-2 ml-4 list-decimal">
                <li>Appuyez sur le bouton <strong>Partager</strong> <span className="inline-block">□↑</span></li>
                <li>Faites défiler et sélectionnez <strong>"Sur l'écran d'accueil"</strong></li>
                <li>Appuyez sur <strong>"Ajouter"</strong></li>
              </ol>
              <div className="flex items-center gap-2 mt-4 p-3 bg-cyan-50 rounded-lg">
                <span className="text-base">📱</span>
                <p className="text-xs text-cyan-700">
                  L'app fonctionnera comme une vraie application native !
                </p>
              </div>
            </div>
          ) : (
            // Bouton Android/Chrome
            <div className="space-y-3">
              <p className="text-sm text-gray-700">
                Installez SmartCabb pour un accès rapide et une meilleure expérience.
              </p>
              
              <button
                onClick={handleInstallClick}
                className="w-full bg-gradient-to-r from-cyan-500 to-emerald-500 text-white font-semibold py-3 px-4 rounded-xl hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2"
              >
                <span className="text-base">⬇️</span>
                Installer l'application
              </button>

              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                <span className="text-base">📱</span>
                <p className="text-xs text-gray-600">
                  Fonctionne hors ligne • Notifications en temps réel • Géolocalisation
                </p>
              </div>
            </div>
          )}

          <button
            onClick={handleClose}
            className="w-full mt-3 text-sm text-gray-500 hover:text-gray-700 py-2"
          >
            Plus tard
          </button>
        </div>
      </div>
    </div>
  );
}