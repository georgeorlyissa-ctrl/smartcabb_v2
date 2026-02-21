import { useState } from 'react';
import { motion } from '../lib/motion'; // ✅ FIX: Utiliser l'implémentation locale
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { useAppState } from '../hooks/useAppState';
import { 
  Bug, 
  X, 
  RefreshCw, 
  MapPin, 
  User,
  Car,
  CreditCard
} from '../lib/icons';

export function DebugPanel() {
  const { state, setCurrentScreen, clearCurrentRide } = useAppState();
  const [isOpen, setIsOpen] = useState(false);

  if (process.env.NODE_ENV === 'production') {
    return null; // Ne pas afficher en production
  }

  const debugInfo = {
    currentScreen: state.currentScreen,
    currentUser: state.currentUser?.name || 'Non connecté',
    currentRide: state.currentRide ? {
      id: state.currentRide.id,
      status: state.currentRide.status,
      driverId: state.currentRide.driverId,
      estimatedPrice: state.currentRide.estimatedPrice,
      paymentMethod: state.currentRide.paymentMethod
    } : null
  };

  const quickNavigation = [
    { screen: 'map', label: 'Carte' },
    { screen: 'ride-tracking', label: 'Suivi course' },
    { screen: 'ride-completed', label: 'Course terminée' },
    { screen: 'payment-receipt', label: 'Reçu paiement' },
    { screen: 'rating', label: 'Évaluation' },
    { screen: 'ride-history', label: 'Historique' }
  ];

  const handleClearRide = () => {
    if (clearCurrentRide) {
      clearCurrentRide();
      setCurrentScreen('map');
    }
  };

  if (!isOpen) {
    return (
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-50 w-12 h-12 bg-orange-500 hover:bg-orange-600 text-white rounded-full shadow-lg flex items-center justify-center"
      >
        <Bug className="w-5 h-5" />
      </motion.button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed inset-4 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4"
    >
      <Card className="w-full max-w-md max-h-[80vh] overflow-y-auto">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Bug className="w-5 h-5 text-orange-500" />
              <h3 className="font-semibold">Debug Panel</h3>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="w-8 h-8"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* État actuel */}
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">État actuel</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Écran:</span>
                  <Badge variant="outline">{debugInfo.currentScreen}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Utilisateur:</span>
                  <span>{debugInfo.currentUser}</span>
                </div>
              </div>
            </div>

            {/* Course actuelle */}
            {debugInfo.currentRide && (
              <div>
                <h4 className="font-medium mb-2">Course actuelle</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">ID:</span>
                    <span className="font-mono text-xs">{debugInfo.currentRide.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Statut:</span>
                    <Badge 
                      variant={debugInfo.currentRide.status === 'ride_completed' ? 'default' : 'secondary'}
                    >
                      {debugInfo.currentRide.status}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Conducteur:</span>
                    <span>{debugInfo.currentRide.driverId || 'Aucun'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Prix:</span>
                    <span>{(debugInfo.currentRide.estimatedPrice || 0).toLocaleString()} CDF</span>
                  </div>
                </div>
              </div>
            )}

            {/* Actions rapides */}
            <div>
              <h4 className="font-medium mb-2">Actions rapides</h4>
              <div className="space-y-2">
                <Button
                  onClick={handleClearRide}
                  variant="destructive"
                  size="sm"
                  className="w-full"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Réinitialiser course
                </Button>
              </div>
            </div>

            {/* Navigation rapide */}
            <div>
              <h4 className="font-medium mb-2">Navigation rapide</h4>
              <div className="grid grid-cols-2 gap-2">
                {quickNavigation.map((nav) => (
                  <Button
                    key={nav.screen}
                    onClick={() => {
                      setCurrentScreen(nav.screen as any);
                      setIsOpen(false);
                    }}
                    variant={state.currentScreen === nav.screen ? "default" : "outline"}
                    size="sm"
                    className="text-xs"
                  >
                    {nav.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Instructions */}
            <div className="text-xs text-gray-500 p-3 bg-gray-50 rounded">
              <p><strong>Problème de navigation ?</strong></p>
              <p>1. Vérifiez le statut de la course</p>
              <p>2. Utilisez "Réinitialiser course" si bloqué</p>
              <p>3. Naviguez manuellement si nécessaire</p>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}