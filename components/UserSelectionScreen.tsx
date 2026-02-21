import { User, Car, Shield } from '../lib/icons';
import { useNavigate } from '../lib/simple-router';
import { useAppState } from '../hooks/useAppState';
import { Button } from './ui/button';
import { SmartCabbLogo } from './SmartCabbLogo';

export function UserSelectionScreen() {
  const { setCurrentScreen, setCurrentView } = useAppState();
  const navigate = useNavigate();

  const handlePassengerClick = () => {
    console.log('📱 Navigation vers app passager');
    setCurrentView('passenger');
    setCurrentScreen('login');
    navigate('/app/passenger');
  };

  const handleDriverClick = () => {
    console.log('🚗 Navigation vers app conducteur');
    setCurrentView('driver');
    setCurrentScreen('driver-welcome');
    navigate('/app/driver');
  };

  const handleAdminClick = () => {
    console.log('👨‍💼 Navigation vers connexion admin');
    setCurrentView('admin');
    setCurrentScreen('admin-login');
    navigate('/app/admin');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Cercles décoratifs */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-green-100 rounded-full blur-3xl opacity-30 -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-100 rounded-full blur-3xl opacity-30 translate-x-1/2 translate-y-1/2" />

      {/* Bouton Admin en haut à droite */}
      <div className="absolute top-6 right-6">
        <Button
          onClick={handleAdminClick}
          variant="outline"
          size="sm"
          className="bg-white/80 backdrop-blur-sm hover:bg-purple-50 border-purple-200 hover:border-purple-400 transition-all shadow-md"
        >
          <Shield className="w-4 h-4 mr-2 text-purple-600" />
          <span className="text-purple-700">Admin</span>
        </Button>
      </div>

      {/* Contenu principal */}
      <div className="relative z-10 w-full max-w-4xl">
        {/* Logo et titre */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <SmartCabbLogo size="large" />
          </div>
          <h1 className="text-primary mb-3">
            Bienvenue sur SmartCabb
          </h1>
          <p className="text-muted-foreground text-lg">
            Sélectionnez votre profil pour commencer
          </p>
        </div>

        {/* Boutons Passager et Conducteur côte à côte */}
        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* Bouton Passager */}
          <div>
            <button
              onClick={handlePassengerClick}
              className="w-full group relative overflow-hidden rounded-3xl bg-white shadow-lg hover:shadow-2xl transition-all duration-300 border-2 border-transparent hover:border-green-400 p-8 md:p-12"
            >
              {/* Gradient de fond au hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-emerald-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              <div className="relative z-10">
                {/* Icône */}
                <div className="mb-6 flex justify-center">
                  <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-xl group-hover:shadow-2xl transition-shadow">
                    <User className="w-12 h-12 md:w-16 md:h-16 text-white" />
                  </div>
                </div>

                {/* Texte */}
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 group-hover:text-green-700 transition-colors">
                  Passager
                </h2>
                <p className="text-gray-600 text-sm md:text-base mb-6">
                  Réservez une course en quelques secondes
                </p>

                {/* Features */}
                <div className="space-y-2 text-left text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    <span>Réservation rapide</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    <span>Suivi en temps réel</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    <span>Paiement sécurisé</span>
                  </div>
                </div>

                {/* Arrow indicator */}
                <div className="mt-6 text-green-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              </div>
            </button>
          </div>

          {/* Bouton Conducteur */}
          <div>
            <button
              onClick={handleDriverClick}
              className="w-full group relative overflow-hidden rounded-3xl bg-white shadow-lg hover:shadow-2xl transition-all duration-300 border-2 border-transparent hover:border-blue-400 p-8 md:p-12"
            >
              {/* Gradient de fond au hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              <div className="relative z-10">
                {/* Icône */}
                <div className="mb-6 flex justify-center">
                  <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-xl group-hover:shadow-2xl transition-shadow">
                    <Car className="w-12 h-12 md:w-16 md:h-16 text-white" />
                  </div>
                </div>

                {/* Texte */}
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 group-hover:text-blue-700 transition-colors">
                  Conducteur
                </h2>
                <p className="text-gray-600 text-sm md:text-base mb-6">
                  Générez des revenus en conduisant
                </p>

                {/* Features */}
                <div className="space-y-2 text-left text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    <span>Horaires flexibles</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    <span>Paiements instantanés</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    <span>Assistance 24/7</span>
                  </div>
                </div>

                {/* Arrow indicator */}
                <div className="mt-6 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center mt-12">
          <p className="text-sm text-gray-500">
            Nouveau sur SmartCabb ? Créez un compte en quelques secondes
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Transport intelligent • Kinshasa, RDC
          </p>
        </div>
      </div>

      {/* Version */}
      <div className="absolute bottom-4 left-0 right-0 text-center">
        <p className="text-xs text-gray-400">
          SmartCabb v96.4 • Interface Production
        </p>
      </div>
    </div>
  );
}