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
    <div className="min-h-screen bg-gradient-to-br from-cyan-500 via-cyan-600 to-green-500 flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Animated Background Elements - Design moderne */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Orbes flottants */}
        <div className="absolute top-20 left-20 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-yellow-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-green-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '0.5s' }}></div>
        
        {/* Grille de points moderne */}
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: 'radial-gradient(circle, rgba(255, 255, 255, 0.3) 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }} />
      </div>

      {/* Bouton Admin en haut à droite */}
      <div className="absolute top-6 right-6 z-20">
        <button
          onClick={handleAdminClick}
          className="w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center hover:scale-110 transition-all cursor-pointer shadow-xl shadow-yellow-400/50"
          title="Accès Admin"
        >
          <Shield className="w-6 h-6 text-gray-900" />
        </button>
      </div>

      {/* Contenu principal */}
      <div className="relative z-10 w-full max-w-4xl">
        {/* Logo et titre */}
        <div className="text-center mb-12 animate-in fade-in zoom-in duration-700">
          {/* Logo avec cercles animés */}
          <div className="mx-auto mb-8 relative inline-block">
            {/* Cercles extérieurs animés */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-40 h-40 rounded-full border-4 border-white/20 animate-ping" style={{ animationDuration: '3s' }}></div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-36 h-36 rounded-full border-2 border-white/30 animate-pulse" style={{ animationDuration: '2s' }}></div>
            </div>
            
            {/* Logo principal */}
            <div className="relative w-28 h-28 mx-auto bg-white rounded-3xl shadow-2xl shadow-black/30 flex items-center justify-center">
              <div className="text-center">
                <div className="text-4xl font-black bg-gradient-to-br from-cyan-500 via-cyan-600 to-green-500 bg-clip-text text-transparent">
                  SC
                </div>
              </div>
            </div>
          </div>

          <h1 className="text-5xl font-black text-white mb-3 tracking-tight">
            Smart<span className="text-yellow-300">Cabb</span>
          </h1>
          
          {/* Ligne de séparation */}
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-1 w-16 bg-gradient-to-r from-transparent via-white to-transparent rounded-full"></div>
            <div className="h-1 w-1 bg-white rounded-full"></div>
            <div className="h-1 w-16 bg-gradient-to-r from-transparent via-white to-transparent rounded-full"></div>
          </div>
          
          <p className="text-xl text-white/95 font-semibold">
            Sélectionnez votre profil
          </p>
        </div>

        {/* Boutons Passager et Conducteur - Design ultra moderne */}
        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom duration-700" style={{ animationDelay: '200ms' }}>
          {/* Bouton Passager */}
          <button
            onClick={handlePassengerClick}
            className="group relative overflow-hidden rounded-3xl bg-white shadow-2xl hover:shadow-white/30 transition-all duration-300 p-8 md:p-10 hover:scale-105"
          >
            <div className="relative z-10">
              {/* Icône */}
              <div className="mb-6 flex justify-center">
                <div className="w-24 h-24 md:w-28 md:h-28 rounded-full bg-gradient-to-br from-cyan-500 to-green-500 flex items-center justify-center shadow-xl group-hover:shadow-2xl transition-all group-hover:scale-110">
                  <User className="w-12 h-12 md:w-14 md:h-14 text-white" />
                </div>
              </div>

              {/* Texte */}
              <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-3 group-hover:text-cyan-600 transition-colors">
                Passager
              </h2>
              <p className="text-gray-600 text-base md:text-lg mb-6 font-medium">
                Réservez une course instantanément
              </p>

              {/* Features */}
              <div className="space-y-3 text-left text-sm md:text-base text-gray-600 font-medium">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-cyan-500" />
                  <span>✨ Réservation rapide</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-cyan-500" />
                  <span>📍 Suivi en temps réel</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-cyan-500" />
                  <span>💳 Paiement sécurisé</span>
                </div>
              </div>
            </div>
          </button>

          {/* Bouton Conducteur */}
          <button
            onClick={handleDriverClick}
            className="group relative overflow-hidden rounded-3xl bg-white shadow-2xl hover:shadow-white/30 transition-all duration-300 p-8 md:p-10 hover:scale-105"
          >
            <div className="relative z-10">
              {/* Icône */}
              <div className="mb-6 flex justify-center">
                <div className="w-24 h-24 md:w-28 md:h-28 rounded-full bg-gradient-to-br from-green-500 to-yellow-500 flex items-center justify-center shadow-xl group-hover:shadow-2xl transition-all group-hover:scale-110">
                  <Car className="w-12 h-12 md:w-14 md:h-14 text-white" />
                </div>
              </div>

              {/* Texte */}
              <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-3 group-hover:text-green-600 transition-colors">
                Conducteur
              </h2>
              <p className="text-gray-600 text-base md:text-lg mb-6 font-medium">
                Générez des revenus en conduisant
              </p>

              {/* Features */}
              <div className="space-y-3 text-left text-sm md:text-base text-gray-600 font-medium">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span>⏰ Horaires flexibles</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span>💰 Paiements instantanés</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span>🛟 Assistance 24/7</span>
                </div>
              </div>
            </div>
          </button>
        </div>

        {/* Footer info */}
        <div className="text-center mt-10 animate-in fade-in duration-1000" style={{ animationDelay: '400ms' }}>
          <p className="text-white/90 font-medium">
            Nouveau sur SmartCabb ? Créez un compte en quelques secondes
          </p>
          <p className="text-white/70 text-sm mt-2">
            🚗 Transport intelligent • 📍 Kinshasa, RDC
          </p>
        </div>
      </div>
    </div>
  );
}
