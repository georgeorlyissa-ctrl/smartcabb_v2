import { useState, useEffect } from 'react';
import { motion } from '../../lib/motion'; // ✅ FIX: Utiliser l'implémentation locale
import { getSession } from "../../lib/auth-service";
import { useNavigate } from "../../lib/simple-router";
import { useAppState } from '../../hooks/useAppState';
import { WelcomeBackScreen } from '../WelcomeBackScreen';
import { SmartCabbLogo } from '../SmartCabbLogo';
import { Button } from '../ui/button';
import { ArrowLeft, Car } from '../../lib/icons';

export function DriverWelcomeScreen() {
  console.log("🚗 DriverWelcomeScreen - Composant monté");

  const { setCurrentScreen, setCurrentView, setIsAdmin } = useAppState();
  const navigate = useNavigate();
  const [isCheckingSession, setIsCheckingSession] = useState(false);
  const [showWelcomeBack, setShowWelcomeBack] = useState(false);
  const [userName, setUserName] = useState("");
  const [userPhoto, setUserPhoto] = useState<string | undefined>(undefined);

  console.log("✅ DriverWelcomeScreen rendu - Prêt à afficher");

  useEffect(() => {
    console.log("🔍 useEffect - Début de la vérification de session");

    const checkSession = async () => {
      // Vérifier si on a déjà affiché le WelcomeBack dans cette session
      const hasSeenWelcomeBack = sessionStorage.getItem('smartcabb_driver_welcome_shown');
      
      if (hasSeenWelcomeBack) {
        console.log('ℹ️ WelcomeBack conducteur déjà affiché - Navigation directe');
        setShowWelcomeBack(false);
        setIsCheckingSession(false);
        return;
      }

      const timeoutId = setTimeout(() => {
        console.log("⏱️ Timeout de vérification de session");
      }, 500);

      try {
        console.log("🔍 checkSession - Appel de getSession()...");
        const session = await getSession();
        console.log("🔍 checkSession - Résultat getSession():", session);

        clearTimeout(timeoutId);

        if (session.success && session.profile && session.profile.role === "driver") {
          console.log("✅ Session conducteur active:", session.profile.full_name);
          setUserName(session.profile.full_name);
          setShowWelcomeBack(true);
          setIsCheckingSession(false);
        } else {
          console.log("ℹ️ Aucune session conducteur active");
          setShowWelcomeBack(false);
          setIsCheckingSession(false);
        }
      } catch (error) {
        clearTimeout(timeoutId);
        console.warn("⚠️ Erreur lors de la vérification de session:", error);
        setShowWelcomeBack(false);
        setIsCheckingSession(false);
      }
    };

    checkSession();
  }, [setCurrentScreen, setCurrentView, setIsAdmin]);

  const handleWelcomeBackComplete = () => {
    console.log("🎉 Welcome Back conducteur terminé, redirection...");
    
    // Marquer comme vu pour cette session
    sessionStorage.setItem('smartcabb_driver_welcome_shown', 'true');
    
    setCurrentView("driver");
    setCurrentScreen("driver-dashboard");
  };

  const handleNavigation = (screen: string) => {
    console.log('🚀 handleNavigation appelé avec screen:', screen);
    setCurrentScreen(screen);
  };

  if (isCheckingSession) {
    return null;
  }

  if (showWelcomeBack && userName) {
    return (
      <WelcomeBackScreen
        userName={userName}
        userType="driver"
        userPhoto={userPhoto}
        onComplete={handleWelcomeBackComplete}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#001428] via-[#003D7A] to-[#002447] relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -top-40 -right-40 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            rotate: [0, -90, 0],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-40 -left-40 w-96 h-96 bg-yellow-500/20 rounded-full blur-3xl"
        />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Bouton retour */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="absolute top-6 left-6 z-50"
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              console.log('⬅️ Retour au site vitrine');
              navigate('/');
            }}
            className="w-12 h-12 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 text-white transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </motion.div>

        {/* Header et Boutons - Centré */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
          <motion.div
            initial={{ scale: 0.8, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center mb-12"
          >
            <div className="mx-auto mb-6 relative">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              >
                <SmartCabbLogo className="w-32 h-32 mx-auto" />
              </motion.div>
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center"
              >
                <Car className="w-5 h-5 text-gray-900" />
              </motion.div>
            </div>
            <h1 className="text-5xl mb-4 font-bold">
              <span className="bg-gradient-to-r from-cyan-400 to-yellow-400 bg-clip-text text-transparent">
                SmartCabb Driver
              </span>
            </h1>
            <p className="text-lg text-gray-300 max-w-md leading-relaxed">
              Gagnez de l'argent en conduisant avec SmartCabb
            </p>
          </motion.div>

          {/* Boutons uniquement */}
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="w-full max-w-2xl px-2"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                onClick={() => handleNavigation("driver-registration")}
                className="w-full h-16 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white rounded-2xl text-lg font-semibold shadow-2xl shadow-cyan-500/50"
              >
                Devenir conducteur
              </Button>
              <Button
                onClick={() => handleNavigation("driver-login")}
                className="w-full h-16 bg-white/10 backdrop-blur-sm border-2 border-white/30 text-white hover:bg-white/20 rounded-2xl text-lg font-semibold"
              >
                Se connecter
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}