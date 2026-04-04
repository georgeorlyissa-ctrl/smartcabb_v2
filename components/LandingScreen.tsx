import { useNavigate } from '../lib/simple-router';
import { useAppState } from '../hooks/useAppState';
import { SmartCabbLogo } from './SmartCabbLogo';
import { Button } from './ui/button';
import { 
  ArrowLeft,
  Shield,
  UserPlus,
  LogIn
} from '../lib/icons';

export function LandingScreen() {
  console.log('🏠 LandingScreen - Composant monté - VERSION SIMPLE - BUILD:', Date.now());
  
  const navigate = useNavigate();
  const { setCurrentScreen, setCurrentView } = useAppState();

  const handleRegister = () => {
    console.log('📝 Navigation vers inscription passager');
    setCurrentScreen('register');
  };

  const handleLogin = () => {
    console.log('🔐 Navigation vers connexion passager');
    setCurrentScreen('login');
  };

  const handleAdminAccess = () => {
    console.log('👨‍💼 handleAdminAccess appelé - Navigation vers /app/admin');
    navigate('/app/admin');
  };

  const handleBackToSite = () => {
    console.log('⬅️ Retour au site vitrine');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-500 via-cyan-600 to-green-500 relative overflow-hidden flex items-center justify-center">
      {/* Animated Background Elements - Design moderne */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Orbes flottants avec animations */}
        <div className="absolute top-20 left-20 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-yellow-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-green-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '0.5s' }}></div>
        
        {/* Grille de points moderne */}
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: 'radial-gradient(circle, rgba(255, 255, 255, 0.3) 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }} />
      </div>

      {/* Bouton retour en haut à gauche */}
      <div className="absolute top-6 left-6 animate-in fade-in slide-in-from-left duration-500 z-20">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleBackToSite}
          className="w-12 h-12 bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 text-white transition-all shadow-lg"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
      </div>

      {/* Badge Admin - EN HAUT À DROITE */}
      <div className="absolute top-6 right-6 animate-in fade-in slide-in-from-right duration-500 z-20">
        <button
          type="button"
          onClick={handleAdminAccess}
          className="w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center hover:scale-110 transition-all cursor-pointer shadow-xl shadow-yellow-400/50 hover:shadow-yellow-400/70"
          title="Accès Admin"
        >
          <Shield className="w-6 h-6 text-gray-900" />
        </button>
      </div>

      {/* Content centré */}
      <div className="relative z-10 w-full max-w-lg px-6">
        {/* Logo et titre au centre - Design ultra moderne */}
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
            
            {/* Logo principal - Carré blanc avec SC */}
            <div className="relative w-32 h-32 mx-auto bg-white rounded-3xl shadow-2xl shadow-black/30 flex items-center justify-center transform hover:scale-105 transition-all duration-500">
              <div className="text-center">
                <div className="text-5xl font-black bg-gradient-to-br from-cyan-500 via-cyan-600 to-green-500 bg-clip-text text-transparent">
                  SC
                </div>
              </div>
            </div>
          </div>

          {/* Nom SmartCabb ultra stylisé */}
          <h1 className="text-6xl mb-4 font-black text-white tracking-tight">
            Smart<span className="text-yellow-300">Cabb</span>
          </h1>
          
          {/* Ligne de séparation élégante */}
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-1 w-16 bg-gradient-to-r from-transparent via-white to-transparent rounded-full"></div>
            <div className="h-1 w-1 bg-white rounded-full"></div>
            <div className="h-1 w-16 bg-gradient-to-r from-transparent via-white to-transparent rounded-full"></div>
          </div>
          
          <p className="text-2xl text-white/95 font-semibold">
            Bienvenue !
          </p>
          <p className="text-white/80 mt-2 font-medium">
            Votre partenaire de mobilité urbaine
          </p>
        </div>

        {/* Deux boutons côte à côte - Design moderne */}
        <div className="grid grid-cols-2 gap-4 mb-6 animate-in fade-in slide-in-from-bottom duration-700" style={{ animationDelay: '200ms' }}>
          {/* Bouton S'inscrire */}
          <Button
            type="button"
            onClick={handleRegister}
            className="h-16 bg-white text-cyan-600 hover:bg-white/95 rounded-2xl font-bold text-lg shadow-2xl shadow-black/20 transition-all hover:scale-105 hover:shadow-white/30"
          >
            <UserPlus className="w-5 h-5 mr-2" />
            S'inscrire
          </Button>

          {/* Bouton Se connecter */}
          <Button
            type="button"
            onClick={handleLogin}
            className="h-16 bg-white/20 hover:bg-white/30 backdrop-blur-sm border-2 border-white/40 text-white rounded-2xl font-bold text-lg transition-all hover:scale-105 shadow-lg"
          >
            <LogIn className="w-5 h-5 mr-2" />
            Connexion
          </Button>
        </div>

        {/* Help text en bas */}
        <div className="text-center mt-8 flex items-center justify-center gap-6 animate-in fade-in duration-1000" style={{ animationDelay: '400ms' }}>
          <button 
            type="button"
            onClick={() => navigate('/contact')}
            className="text-sm text-white/70 hover:text-white transition-colors font-medium"
          >
            Besoin d'aide ?
          </button>
          <div className="w-1 h-1 bg-white/50 rounded-full"></div>
          <button 
            type="button"
            onClick={() => navigate('/about')}
            className="text-sm text-white/70 hover:text-white transition-colors font-medium"
          >
            À propos
          </button>
        </div>
      </div>
    </div>
  );
}
