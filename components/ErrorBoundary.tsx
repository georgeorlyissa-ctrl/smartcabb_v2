import * as React from 'react';
import { Button } from './ui/button';

// Icônes inline (évite import lucide-react)
const AlertCircleIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" x2="12" y1="8" y2="12" />
    <line x1="12" x2="12.01" y1="16" y2="16" />
  </svg>
);

const HomeIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const WifiOffIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 20h.01" />
    <path d="M8.5 16.429a5 5 0 0 1 7 0" />
    <path d="M5 12.859a10 10 0 0 1 5.17-2.69" />
    <path d="M19 12.859a10 10 0 0 0-2.007-1.523" />
    <path d="M2 8.82a15 15 0 0 1 4.177-2.643" />
    <path d="M22 8.82a15 15 0 0 0-11.288-3.764" />
    <path d="m2 2 20 20" />
  </svg>
);

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: any;
  isOfflineError: boolean;
}

export class ErrorBoundary extends React.Component<Props, State> {
  private mounted = false;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, isOfflineError: false };
  }

  componentDidMount() {
    this.mounted = true;
  }

  componentWillUnmount() {
    this.mounted = false;
  }

  static getDerivedStateFromError(error: Error): State {
    console.error('❌ ErrorBoundary - getDerivedStateFromError:', error);
    return { hasError: true, error, errorInfo: null, isOfflineError: false };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('❌ ErrorBoundary caught an error:', error);
    console.error('❌ Error info:', errorInfo);
    console.error('❌ Component Stack:', errorInfo.componentStack);
    
    // 🔍 Détecter si c'est une erreur de module dynamique
    const isDynamicImportError = error.message?.includes('Failed to fetch dynamically imported module') ||
                                 error.message?.includes('error loading dynamically imported module');
    
    // 🌐 Vérifier l'état de la connexion de manière plus fiable
    let isActuallyOffline = false;
    
    if (isDynamicImportError) {
      console.warn('⚠️ Erreur de chargement de module dynamique détectée');
      
      // Vérifier plusieurs indicateurs de connexion
      if (typeof window !== 'undefined') {
        const navigatorOffline = !window.navigator.onLine;
        
        // Test supplémentaire : tenter de charger une ressource depuis le serveur
        // Si on est vraiment hors ligne, l'ErrorBoundary devrait seulement s'afficher
        // quand navigator.onLine est false
        if (navigatorOffline) {
          console.warn('📡 Navigator.onLine = false - Mode hors ligne confirmé');
          isActuallyOffline = true;
        } else {
          console.log('✅ Navigator.onLine = true - Connexion détectée');
          console.log('⚠️ Erreur de module, mais connexion active - Probablement un problème de build/cache');
        }
      }
    }
    
    if (this.mounted) {
      this.setState({ errorInfo, isOfflineError: isActuallyOffline });
    }
  }

  handleReset = () => {
    // 🧹 Nettoyer les données corrompues dans localStorage
    try {
      // ✅ SSR FIX: Vérifier que nous sommes côté client
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        console.warn('⚠️ localStorage non disponible (SSR)');
        this.setState({ hasError: false, error: null, errorInfo: null, isOfflineError: false });
        return;
      }
      
      console.log('🧹 Nettoyage des données corrompues...');
      
      // Supprimer les données potentiellement corrompues
      const keysToCheck = [
        'smartcab_current_user',
        'smartcab_current_driver',
        'smartcab_current_ride',
        'smartcab_system_settings'
      ];
      
      keysToCheck.forEach(key => {
        try {
          const data = localStorage.getItem(key);
          if (data) {
            JSON.parse(data); // Vérifier si le JSON est valide
          }
        } catch (e) {
          console.warn(`⚠️ Données corrompues détectées pour ${key}, suppression...`);
          localStorage.removeItem(key);
        }
      });
      
      console.log('✅ Nettoyage terminé');
    } catch (error) {
      console.error('❌ Erreur lors du nettoyage:', error);
    }
    
    this.setState({ hasError: false, error: null, errorInfo: null, isOfflineError: false });
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, isOfflineError: false });
    
    // ✅ SSR FIX: Vérifier que nous sommes côté client
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  render() {
    if (this.state.hasError) {
      // Si un fallback personnalisé est fourni, l'utiliser
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // 📡 Affichage spécial pour les erreurs hors ligne
      if (this.state.isOfflineError) {
        return (
          <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50 flex items-center justify-center p-6">
            <div className="max-w-lg w-full bg-white rounded-2xl shadow-2xl p-8">
              <div className="text-center mb-6">
                <WifiOffIcon className="w-20 h-20 text-orange-500 mx-auto mb-4" />
                <h2 className="text-3xl mb-3 text-gray-900">Mode hors ligne</h2>
                <p className="text-gray-600 mb-2">
                  Cette page n'est pas disponible hors ligne.
                </p>
              </div>

              {/* Message informatif */}
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6">
                <p className="text-sm text-orange-800">
                  Vous devez être connecté à Internet pour accéder aux panneaux Admin et Conducteur.
                </p>
                <p className="text-sm text-orange-700 mt-2">
                  Veuillez vous reconnecter ou revenir à l'accueil.
                </p>
              </div>

              {/* Actions */}
              <div className="space-y-3">
                <Button 
                  onClick={this.handleReset}
                  className="w-full h-12 bg-cyan-500 hover:bg-cyan-600 text-white"
                >
                  Réessayer
                </Button>
                <Button 
                  onClick={this.handleGoHome}
                  variant="outline"
                  className="w-full h-12"
                >
                  <HomeIcon className="w-4 h-4 mr-2" />
                  Retour à l'accueil
                </Button>
              </div>

              {/* Info supplémentaire */}
              <p className="text-xs text-gray-500 text-center mt-6">
                Si le problème persiste, vérifiez la console du navigateur
              </p>
            </div>
          </div>
        );
      }

      // 🔴 Affichage standard pour les autres erreurs
      return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white rounded-2xl shadow-2xl p-8">
            <div className="text-center mb-6">
              <AlertCircleIcon className="w-20 h-20 text-red-500 mx-auto mb-4" />
              <h2 className="text-3xl mb-3 text-gray-900">Erreur de chargement</h2>
              <p className="text-gray-600 mb-2">
                Une erreur est survenue lors du chargement de cette page.
              </p>
            </div>

            {/* Détails de l'erreur */}
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
              <p className="text-sm text-red-800 font-mono break-words">
                {this.state.error?.message || 'Erreur inconnue'}
              </p>
              
              {/* Conseil pour problème de cache/build */}
              {this.state.error?.message?.includes('Failed to fetch') && (
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-xs text-yellow-800 font-bold">💡 Solution rapide :</p>
                  <p className="text-xs text-yellow-700 mt-1">
                    1. Videz le cache du navigateur (Ctrl+Shift+Delete)<br/>
                    2. Actualisez la page (Ctrl+F5 ou Cmd+Shift+R)<br/>
                    3. Si le problème persiste, attendez quelques minutes que le serveur se mette à jour
                  </p>
                </div>
              )}
              
              {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                <details className="mt-3">
                  <summary className="text-xs text-red-600 cursor-pointer hover:text-red-800">
                    Détails techniques
                  </summary>
                  <pre className="mt-2 text-xs text-red-700 overflow-auto max-h-40 bg-red-100 p-2 rounded">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <Button 
                onClick={this.handleReset}
                className="w-full h-12 bg-cyan-500 hover:bg-cyan-600 text-white"
              >
                Réessayer
              </Button>
              <Button 
                onClick={this.handleGoHome}
                variant="outline"
                className="w-full h-12"
              >
                <HomeIcon className="w-4 h-4 mr-2" />
                Retour à l'accueil
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}