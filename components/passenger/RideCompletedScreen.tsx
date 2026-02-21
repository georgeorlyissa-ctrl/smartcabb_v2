import { useState, useEffect } from 'react';
import { motion } from '../../lib/motion'; // ✅ FIX: Utiliser l'implémentation locale
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { useAppState } from '../../hooks/useAppState';
import { getVehicleDisplayName } from '../../lib/vehicle-helpers';
import { 
  CheckCircle,
  MapPin,
  Clock,
  DollarSign,
  Navigation, // ✅ Remplacé Route par Navigation (0.263.1 compatible)
  Car,
  Star,
  User,
  CreditCard
} from '../../lib/icons';

export function RideCompletedScreen() {
  const { state, setCurrentScreen, drivers } = useAppState();
  const [showAnimation, setShowAnimation] = useState(true);

  // ✅ FIX: Ajouter une vérification de sécurité pour éviter l'erreur "Cannot read properties of undefined"
  const assignedDriver = drivers?.find(d => d.id === state.currentRide?.driverId) || null;
  const currentRide = state.currentRide;

  useEffect(() => {
    // Animation d'entrée
    const timer = setTimeout(() => {
      setShowAnimation(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const handleContinue = () => {
    setCurrentScreen('payment-receipt');
  };

  if (!currentRide) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen bg-white flex items-center justify-center p-6"
      >
        <div className="text-center">
          <p className="text-gray-600 mb-4">Aucune course trouvée</p>
          <Button onClick={() => setCurrentScreen('map')}>
            Retour à l'accueil
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex flex-col items-center justify-center p-6"
    >
      {showAnimation ? (
        // Animation de succès
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ 
            type: "spring", 
            stiffness: 200, 
            damping: 20 
          }}
          className="text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ 
              delay: 0.3,
              type: "spring", 
              stiffness: 150 
            }}
            className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <CheckCircle className="w-12 h-12 text-white" />
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="text-3xl font-bold text-green-600 mb-2"
          >
            Course terminée !
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="text-gray-600 text-lg"
          >
            Vous êtes arrivé à destination
          </motion.p>
        </motion.div>
      ) : (
        // Contenu principal
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md space-y-6"
        >
          {/* Success Icon */}
          <div className="text-center">
            <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl text-green-600 mb-2">Course terminée !</h1>
            <p className="text-gray-600">Merci d'avoir choisi SmartCabb</p>
          </div>

          {/* Trip Summary Card */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Résumé du trajet</h2>
            
            {/* Driver Info */}
            <div className="flex items-center space-x-3 mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
                {assignedDriver?.photo ? (
                  <img 
                    src={assignedDriver.photo} 
                    alt={assignedDriver.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <User className="w-6 h-6 text-gray-600" />
                )}
              </div>
              <div>
                <p className="font-semibold">{assignedDriver?.name}</p>
                <div className="flex items-center space-x-1">
                  <Star className="w-4 h-4 text-yellow-500 fill-current" />
                  <span className="text-sm text-gray-600">{assignedDriver?.rating}</span>
                </div>
                <p className="text-sm text-gray-600">
                  <Car className="w-4 h-4 inline mr-1" />
                  {getVehicleDisplayName(assignedDriver?.vehicleInfo)}
                </p>
              </div>
            </div>

            {/* Trip Details */}
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-500">Départ</p>
                  <p className="font-medium text-sm">{currentRide.pickup?.address}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-red-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-500">Arrivée</p>
                  <p className="font-medium text-sm">{currentRide.destination?.address}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                <div className="text-center">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-1">
                    <Navigation className="w-4 h-4 text-blue-600" />
                  </div>
                  <p className="text-xs text-gray-500">Distance</p>
                  <p className="font-semibold">8.7 km</p>
                </div>

                <div className="text-center">
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-1">
                    <Clock className="w-4 h-4 text-orange-600" />
                  </div>
                  <p className="text-xs text-gray-500">Durée</p>
                  <p className="font-semibold">{currentRide.duration || 15} min</p>
                </div>

                <div className="text-center">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-1">
                    <DollarSign className="w-4 h-4 text-green-600" />
                  </div>
                  <p className="text-xs text-gray-500">Coût</p>
                  <p className="font-semibold">{(currentRide.actualPrice || currentRide.estimatedPrice || 0).toLocaleString()} CDF</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Continue Button */}
          <Button
            onClick={handleContinue}
            className="w-full h-14 bg-green-500 hover:bg-green-600 text-white rounded-xl text-lg"
          >
            Continuer vers le paiement
          </Button>

          {/* Secondary Actions */}
          <div className="flex space-x-3">
            <Button
              onClick={() => setCurrentScreen('support')}
              variant="outline"
              className="flex-1 h-12"
            >
              Signaler un problème
            </Button>
            
            <Button
              onClick={() => setCurrentScreen('map')}
              variant="ghost"
              className="flex-1 h-12"
            >
              Nouvelle course
            </Button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
