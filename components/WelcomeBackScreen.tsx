import { useState, useEffect, useRef } from 'react';
import { motion } from '../lib/motion'; // ✅ FIX: Import depuis lib/motion
import { useAppState } from '../hooks/useAppState';
import { SmartCabbLogo } from './SmartCabbLogo';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { User, Car, Sparkles, ArrowRight } from '../lib/icons';
import { Button } from './ui/button';

interface WelcomeBackScreenProps {
  userName?: string;
  userType: 'passenger' | 'driver';
  userPhoto?: string;
  targetScreen?: string;
  /** `reconnect` = « Bon retour » (session retrouvée), `welcome` = première connexion. */
  mode?: 'welcome' | 'reconnect';
  /** Durée avant redirection automatique (ms). */
  autoContinueMs?: number;
  onComplete?: () => void;
  onContinue?: () => void;
  onChangeUser?: () => void;
}

export function WelcomeBackScreen({ 
  userName, 
  userType, 
  userPhoto,
  targetScreen,
  mode = 'welcome',
  autoContinueMs = 3000,
  onComplete,
  onContinue,
  onChangeUser
}: WelcomeBackScreenProps) {
  const { setCurrentScreen } = useAppState();
  const [progress, setProgress] = useState(0);
  const animationRef = useRef<number | null>(null);
  const isReconnect = mode === 'reconnect';

  console.log('👋 WelcomeBackScreen - Affichage:', { userName, userType, targetScreen, mode });

  // ✅ Animation simple avec navigation UNE SEULE FOIS
  useEffect(() => {
    let startTime: number;
    let hasNavigated = false;
    const duration = Math.max(800, autoContinueMs);

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const elapsed = currentTime - startTime;
      const newProgress = Math.min((elapsed / duration) * 100, 100);
      
      setProgress(newProgress);

      if (elapsed < duration) {
        animationRef.current = requestAnimationFrame(animate);
      } else if (!hasNavigated) {
        hasNavigated = true;
        console.log('⏱️ WelcomeBackScreen - Navigation automatique');
        
        const callback = onContinue || onComplete;
        if (callback) {
          callback();
        } else if (targetScreen) {
          setCurrentScreen(targetScreen);
        }
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []); // ✅ Aucune dépendance - s'exécute UNE SEULE FOIS

  const handleSkip = () => {
    console.log('⏭️ Skip manuel');
    const callback = onContinue || onComplete;
    if (callback) {
      callback();
    } else if (targetScreen) {
      setCurrentScreen(targetScreen);
    }
  };

  const isPassenger = userType === 'passenger';
  
  const colors = {
    primary: isPassenger ? 'from-green-500 to-emerald-600' : 'from-blue-500 to-indigo-600',
    light: isPassenger ? 'from-green-50 to-emerald-50' : 'from-blue-50 to-indigo-50',
    text: isPassenger ? 'text-green-600' : 'text-blue-600',
    bg: isPassenger ? 'bg-green-500' : 'bg-blue-500',
    ring: isPassenger ? 'ring-green-200' : 'ring-blue-200',
  };

  const messages = {
    passenger: {
      greetingWithName: isReconnect ? 'Bon retour' : 'Bienvenue',
      greetingWithoutName: isReconnect ? 'Bon retour !' : 'Bienvenue !',
      subtitleWithName: isReconnect
        ? 'Content de vous revoir. Où allez-vous aujourd\'hui ?'
        : 'Où allez-vous aujourd\'hui ?',
      subtitleWithoutName: 'Connectez-vous pour commencer votre trajet',
      action: isReconnect ? 'Reconnexion à votre compte' : 'Préparation de l\'interface',
    },
    driver: {
      greetingWithName: isReconnect ? 'Bon retour' : 'Bienvenue',
      greetingWithoutName: isReconnect ? 'Bon retour conducteur !' : 'Bienvenue conducteur !',
      subtitleWithName: isReconnect
        ? 'Content de vous revoir. Prêt pour de nouvelles courses ?'
        : 'Prêt pour de nouvelles courses ?',
      subtitleWithoutName: 'Connectez-vous pour accepter des courses',
      action: isReconnect ? 'Reconnexion à votre compte' : 'Préparation de l\'interface',
    },
  };

  const currentMessages = messages[userType];
  const hasUserName = Boolean(userName);

  return (
    <div className={`min-h-screen bg-gradient-to-br ${colors.light} flex flex-col items-center justify-center px-6 py-4 relative overflow-hidden`}>
      {/* Cercles décoratifs */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 0.1 }}
        transition={{ duration: 1, ease: "easeOut" }}
        className={`absolute top-20 left-10 w-64 h-64 bg-gradient-to-br ${colors.primary} rounded-full blur-3xl`}
      />
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 0.1 }}
        transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
        className={`absolute bottom-20 right-10 w-80 h-80 bg-gradient-to-br ${colors.primary} rounded-full blur-3xl`}
      />

      {/* Contenu principal */}
      <div className="relative z-10 w-full max-w-md">
        {/* Logo SmartCabb */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="flex justify-center mb-2"
        >
          <div className="relative">
            <SmartCabbLogo className="w-16 h-16" />
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
              className={`absolute -top-2 -right-2 ${colors.bg} rounded-full p-2 shadow-lg`}
            >
              <Sparkles className="w-4 h-4 text-white" />
            </motion.div>
          </div>
        </motion.div>

        {/* Avatar et nom */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="text-center mb-2"
        >
          <div className="relative inline-block mb-3">
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5, type: "spring", stiffness: 200, damping: 10 }}
              className={`w-24 h-24 rounded-full overflow-hidden ring-4 ${colors.ring} shadow-2xl`}
            >
              {userPhoto ? (
                <ImageWithFallback
                  src={userPhoto}
                  alt={userName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className={`w-full h-full bg-gradient-to-br ${colors.primary} flex items-center justify-center`}>
                  {isPassenger ? (
                    <User className="w-14 h-14 text-white" />
                  ) : (
                    <Car className="w-14 h-14 text-white" />
                  )}
                </div>
              )}
            </motion.div>
          </div>

          {/* Message de bienvenue */}
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {hasUserName ? currentMessages.greetingWithName : currentMessages.greetingWithoutName}
            </h1>
            {hasUserName && (
              <p className={`text-2xl ${colors.text} mb-3`}>
                {userName.split(' ')[0]} ! 👋
              </p>
            )}
            {!hasUserName && (
              <p className={`text-xl ${colors.text} mb-3`}>
                👋
              </p>
            )}
            <p className="text-gray-600">
              {hasUserName ? currentMessages.subtitleWithName : currentMessages.subtitleWithoutName}
            </p>
          </motion.div>
        </motion.div>

        {/* Barre de progression */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mb-2"
        >
          <div className="relative">
            <div className="w-full h-2 bg-white/50 rounded-full overflow-hidden backdrop-blur-sm">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className={`h-full bg-gradient-to-r ${colors.primary} rounded-full`}
                transition={{ duration: 0.1 }}
              />
            </div>
            
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="text-center text-sm text-gray-600 mt-3"
            >
              {currentMessages.action}
              <motion.span
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                ...
              </motion.span>
            </motion.p>
          </div>
        </motion.div>
      </div>

      {/* Bouton Continuer en bas */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="relative z-10 mt-2 w-full max-w-md text-center"
      >
        <p className="text-sm text-gray-500 mb-1">
          SmartCabb • Transport intelligent
        </p>
        
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.8 }}
        >
          <Button
            onClick={handleSkip}
            className={`bg-gradient-to-r ${colors.primary} text-white px-8 py-6 rounded-full shadow-lg hover:shadow-xl transition-all active:scale-95`}
          >
            <span className="mr-2">Continuer</span>
            <ArrowRight className="w-5 h-5" />
          </Button>
          <p className="text-xs text-gray-400 mt-2">
            Ou attendez {Math.max(0, Math.ceil((autoContinueMs / 1000) * (1 - progress / 100)))}s
          </p>
          {onChangeUser && (
            <button
              onClick={onChangeUser}
              className="mt-4 text-sm text-gray-500 underline underline-offset-2 hover:text-gray-700"
            >
              Ce n'est pas moi ?
            </button>
          )}
        </motion.div>
      </motion.div>

      {/* Bouton skip en haut à droite */}
      <div className="absolute top-8 right-8 hidden sm:block">
        <Button
          size="icon"
          variant="outline"
          onClick={handleSkip}
          className="rounded-full shadow-md hover:shadow-lg transition-all"
        >
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}