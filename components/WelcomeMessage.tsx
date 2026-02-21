import { motion, AnimatePresence } from '../lib/motion'; // ✅ FIX: Utiliser l'implémentation locale avec AnimatePresence
import { User, Car, Shield, CheckCircle } from '../lib/icons';
import { useEffect, useState } from 'react';

interface WelcomeMessageProps {
  userName: string;
  userType: 'passenger' | 'driver' | 'admin';
  onClose?: () => void;
  duration?: number; // en millisecondes
}

export function WelcomeMessage({ 
  userName, 
  userType, 
  onClose,
  duration = 3000 
}: WelcomeMessageProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      if (onClose) {
        setTimeout(onClose, 300); // Attendre la fin de l'animation
      }
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const getIcon = () => {
    switch (userType) {
      case 'passenger':
        return <User className="w-12 h-12 text-white" />;
      case 'driver':
        return <Car className="w-12 h-12 text-white" />;
      case 'admin':
        return <Shield className="w-12 h-12 text-white" />;
    }
  };

  const getGradient = () => {
    switch (userType) {
      case 'passenger':
        return 'from-green-500 to-emerald-600';
      case 'driver':
        return 'from-blue-500 to-blue-600';
      case 'admin':
        return 'from-purple-500 to-purple-600';
    }
  };

  const getRoleLabel = () => {
    switch (userType) {
      case 'passenger':
        return 'Passager';
      case 'driver':
        return 'Conducteur';
      case 'admin':
        return 'Administrateur';
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => {
            setIsVisible(false);
            if (onClose) setTimeout(onClose, 300);
          }}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 20 }}
            className="bg-white rounded-3xl shadow-2xl p-8 max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Icône animée */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', damping: 15 }}
              className="flex justify-center mb-6"
            >
              <div className={`w-24 h-24 bg-gradient-to-br ${getGradient()} rounded-full flex items-center justify-center shadow-lg relative`}>
                {getIcon()}
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="absolute -bottom-2 -right-2 bg-white rounded-full p-1.5 shadow-lg"
                >
                  <CheckCircle className="w-6 h-6 text-green-500" />
                </motion.div>
              </div>
            </motion.div>

            {/* Message de bienvenue */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-center"
            >
              <h2 className="mb-2 text-primary">
                Bienvenue, {userName} !
              </h2>
              <p className="text-muted-foreground mb-4">
                Connexion réussie en tant que {getRoleLabel()}
              </p>

              {/* Barre de progression */}
              <motion.div
                className="h-1 bg-gray-200 rounded-full overflow-hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <motion.div
                  className={`h-full bg-gradient-to-r ${getGradient()}`}
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: duration / 1000, ease: 'linear' }}
                />
              </motion.div>

              <p className="text-xs text-gray-400 mt-3">
                Redirection automatique...
              </p>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}