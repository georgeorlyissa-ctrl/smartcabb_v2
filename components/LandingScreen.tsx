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
    <div className="min-h-screen bg-gradient-to-br from-[#001428] via-[#003D7A] to-[#002447] relative overflow-hidden flex items-center justify-center">
      {/* Animated Background Elements - CSS uniquement */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-yellow-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        
        {/* Grille de points */}
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle, rgba(0, 152, 255, 0.1) 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }} />
      </div>

      {/* Bouton retour en haut à gauche */}
      <div className="absolute top-6 left-6 animate-in fade-in slide-in-from-left duration-500">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleBackToSite}
          className="w-12 h-12 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 text-white transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
      </div>

      {/* Badge Admin uniquement - EN HAUT À DROITE */}
      <div className="absolute top-6 right-6 animate-in fade-in slide-in-from-right duration-500">
        <button
          type="button"
          onClick={handleAdminAccess}
          className="w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center animate-pulse hover:scale-110 transition-transform cursor-pointer shadow-lg shadow-yellow-400/50"
          title="Accès Admin"
        >
          <Shield className="w-6 h-6 text-gray-900" />
        </button>
      </div>

      {/* Content centré */}
      <div className="relative z-10 w-full max-w-lg px-6">
        {/* Logo et titre au centre */}
        <div className="text-center mb-12 animate-in fade-in zoom-in duration-700">
          <div className="mx-auto mb-6 relative inline-block">
            <div className="animate-spin-slow">
              <SmartCabbLogo className="w-28 h-28 mx-auto" />
            </div>
          </div>

          <h1 className="text-5xl mb-3 font-bold">
            <span className="bg-gradient-to-r from-cyan-400 to-yellow-400 bg-clip-text text-transparent">
              SmartCabb
            </span>
          </h1>
          <p className="text-2xl text-white">
            Bienvenue !
          </p>
        </div>

        {/* Deux boutons côte à côte : S'inscrire et Se connecter */}
        <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom duration-700" style={{ animationDelay: '200ms' }}>
          {/* Bouton S'inscrire */}
          <Button
            type="button"
            onClick={handleRegister}
            className="h-14 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white rounded-xl font-semibold shadow-xl shadow-cyan-500/30 transition-all hover:scale-105"
          >
            <UserPlus className="w-5 h-5 mr-2" />
            S'inscrire
          </Button>

          {/* Bouton Se connecter */}
          <Button
            type="button"
            onClick={handleLogin}
            className="h-14 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 text-white rounded-xl font-semibold transition-all hover:scale-105"
          >
            <LogIn className="w-5 h-5 mr-2" />
            Se connecter
          </Button>
        </div>

        {/* Help text en bas */}
        <div className="text-center mt-8 flex items-center justify-center gap-6 animate-in fade-in duration-1000" style={{ animationDelay: '400ms' }}>
          <button 
            type="button"
            onClick={() => navigate('/contact')}
            className="text-sm text-gray-400 hover:text-cyan-400 transition-colors"
          >
            Besoin d'aide ?
          </button>
          <button 
            type="button"
            onClick={() => navigate('/about')}
            className="text-sm text-gray-400 hover:text-cyan-400 transition-colors"
          >
            À propos
          </button>
        </div>
      </div>
    </div>
  );
}
