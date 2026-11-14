import * as React from 'react';
import { Button } from './ui/button';

// Icônes inline (évite import lucide-react et permet de s'afficher même si
// un module externe n'a pas pu être chargé).
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

const RefreshIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
    <path d="M21 3v5h-5" />
    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
    <path d="M8 16H3v5" />
  </svg>
);

/** Dernier rechargement automatique (anti-boucle). */
const AUTO_RELOAD_KEY = 'smartcabb_chunk_reload_at';
/** Fenêtre minimale entre deux rechargements automatiques (ms). */
const AUTO_RELOAD_COOLDOWN = 60_000;

type ErrorKind = 'offline' | 'network' | 'runtime';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: any;
  errorKind: ErrorKind;
}

const MESSAGES: Record<ErrorKind, { title: string; intro: string; hint: string }> = {
  offline: {
    title: 'Vous êtes hors ligne',
    intro: "Impossible de charger cette page : aucune connexion Internet n'est détectée.",
    hint: "Activez vos données mobiles ou connectez-vous au Wi-Fi, puis appuyez sur Réessayer."
  },
  network: {
    title: 'Connexion instable',
    intro: "Cette page n'a pas pu être chargée. La connexion a probablement été interrompue.",
    hint: "Vérifiez votre réseau (Wi-Fi ou données mobiles), puis appuyez sur Réessayer."
  },
  runtime: {
    title: 'Page indisponible',
    intro: "Une erreur inattendue a empêché l'affichage de cette page.",
    hint: "Réessayez. Si le problème persiste, revenez à l'accueil et rouvrez la page."
  }
};

const isDynamicImportError = (message: string) =>
  /Failed to fetch dynamically imported module|error loading dynamically imported module|Loading chunk|ChunkLoadError|Importing a module script failed/i.test(message);

const isNetworkError = (message: string) =>
  isDynamicImportError(message) || /Failed to fetch|NetworkError|Load failed|ERR_NETWORK/i.test(message);

export class ErrorBoundary extends React.Component<Props, State> {
  private mounted = false;
  private autoReloadTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, errorKind: 'runtime' };
  }

  componentDidMount() {
    this.mounted = true;
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleBackOnline);
    }
  }

  componentWillUnmount() {
    this.mounted = false;
    if (this.autoReloadTimer) clearTimeout(this.autoReloadTimer);
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleBackOnline);
    }
  }

  /** Le réseau revient : on recharge automatiquement (sans boucle possible,
   *  l'événement ne se déclenche qu'au passage hors ligne → en ligne). */
  private handleBackOnline = () => {
    if (!this.state.hasError) return;
    if (typeof window !== 'undefined') window.location.reload();
  };

  static getDerivedStateFromError(error: Error): Partial<State> {
    console.error('❌ ErrorBoundary - getDerivedStateFromError:', error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('❌ ErrorBoundary caught an error:', error);
    console.error('❌ Component stack:', errorInfo?.componentStack);

    const message = error?.message || '';
    const offline =
      typeof navigator !== 'undefined' && navigator.onLine === false;
    const network = offline || isNetworkError(message);

    // 🔁 Module dynamique indisponible alors que la connexion semble bonne :
    // c'est très souvent un ancien index.html qui pointe vers un fichier
    // remplacé par un nouveau déploiement. Un seul rechargement règle le
    // problème… à condition de ne pas boucler si le fichier manque vraiment.
    if (!offline && isDynamicImportError(message)) {
      let canReload = true;
      try {
        const last = Number(window.sessionStorage.getItem(AUTO_RELOAD_KEY) || 0);
        canReload = !last || Date.now() - last > AUTO_RELOAD_COOLDOWN;
        if (canReload) {
          window.sessionStorage.setItem(AUTO_RELOAD_KEY, String(Date.now()));
        }
      } catch {
        // sessionStorage indisponible (navigation privée) : on évite de boucler
        canReload = false;
      }

      if (canReload) {
        console.warn('🔄 Module manquant après déploiement — rechargement unique…');
        this.autoReloadTimer = setTimeout(() => {
          if (this.mounted && typeof window !== 'undefined') {
            window.location.reload();
          }
        }, 300);
        return;
      }

      console.warn('⚠️ Module toujours indisponible après rechargement — affichage du message.');
    }

    if (this.mounted) {
      this.setState({
        errorInfo,
        errorKind: offline ? 'offline' : network ? 'network' : 'runtime'
      });
    }
  }

  /** Réessayer : rechargement complet pour les erreurs réseau (le fichier
   *  manquant doit être re-téléchargé), simple réinitialisation sinon. */
  handleRetry = () => {
    const { errorKind } = this.state;

    if (errorKind !== 'runtime' && typeof window !== 'undefined') {
      window.location.reload();
      return;
    }

    this.setState({ hasError: false, error: null, errorInfo: null, errorKind: 'runtime' });
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, errorKind: 'runtime' });

    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    // Si un fallback personnalisé est fourni, l'utiliser
    if (this.props.fallback) return this.props.fallback;

    const kind = this.state.errorKind;
    const message = MESSAGES[kind];
    const isConnectionIssue = kind !== 'runtime';

    return (
      <div
        role="alert"
        className={`min-h-[100dvh] flex items-center justify-center px-4 pt-6 pb-safe-page ${
          isConnectionIssue
            ? 'bg-gradient-to-b from-orange-50 to-yellow-50'
            : 'bg-gradient-to-b from-red-50 to-orange-50'
        }`}
      >
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-5 sm:p-8">
          <div className="text-center mb-5">
            {isConnectionIssue ? (
              <WifiOffIcon className="w-14 h-14 text-orange-500 mx-auto mb-3" />
            ) : (
              <AlertCircleIcon className="w-14 h-14 text-red-500 mx-auto mb-3" />
            )}
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">{message.title}</h2>
            <p className="text-sm text-gray-600 leading-relaxed">{message.intro}</p>
          </div>

          <div
            className={`rounded-xl p-3.5 mb-5 text-sm leading-relaxed ${
              isConnectionIssue
                ? 'bg-orange-50 border border-orange-200 text-orange-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}
          >
            {message.hint}
          </div>

          <div className="space-y-3">
            <Button
              onClick={this.handleRetry}
              className="w-full h-12 bg-cyan-500 hover:bg-cyan-600 text-white font-medium"
            >
              <RefreshIcon className="w-4 h-4 mr-2" />
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

          <p className="text-[11px] text-gray-400 text-center mt-5 leading-relaxed">
            {isConnectionIssue
              ? 'Astuce : si vous utilisez les données mobiles, vérifiez que votre forfait est encore actif.'
              : 'Si le problème persiste, contactez le support SmartCabb.'}
          </p>

          {/* Détails techniques : uniquement en développement */}
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details className="mt-4">
              <summary className="text-xs text-gray-400 cursor-pointer">
                Détails techniques
              </summary>
              <pre className="mt-2 text-[11px] text-red-700 overflow-auto max-h-40 bg-red-50 p-2 rounded whitespace-pre-wrap break-words">
                {this.state.error.message}
                {this.state.errorInfo?.componentStack
                  ? `\n${this.state.errorInfo.componentStack}`
                  : ''}
              </pre>
            </details>
          )}
        </div>
      </div>
    );
  }
}
