import { SmartCabbLogo } from './SmartCabbLogo';

interface LoadingScreenProps {
  message?: string;
}

/**
 * LoadingScreen simplifié - Une seule image/indicateur de chargement
 * Remplace l'ancien écran surchargé d'éléments animés
 */
export function LoadingScreen({ message = 'Chargement...' }: LoadingScreenProps) {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
      {/* Logo SmartCabb centré */}
      <div className="mb-8">
        <SmartCabbLogo className="w-24 h-24 margin-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-800 text-center">SmartCabb</h2>
      </div>

      {/* Unique indicateur de chargement */}
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <svg
            className="w-16 h-16 text-gray-400 margin-auto"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-6 h-6 bg-primary-600 rounded-full animate-pulse"></div>
          </div>
        </div>

        <p className="text-gray-600 text-base">{message}</p>
      </div>

      {/* Petite ligne décorative subtile */}
      <div className="mt-8 w-24 h-1 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-primary-600 to-primary-500 rounded-full animate-pulse"
          style={{ width: '60%' }}
        ></div>
      </div>
    </div>
  );
}