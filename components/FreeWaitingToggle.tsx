import { useState, useEffect } from 'react';
import { motion } from '../lib/motion'; // ✅ FIX: Utiliser l'implémentation locale
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Switch } from './ui/switch';
import { Badge } from './ui/badge';
import { Label } from './ui/label';
import { 
  Timer, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  Info,
  Zap
} from '../lib/icons';
import { toast } from '../lib/toast';
import { useAppState } from '../hooks/useAppState';
import { projectId, publicAnonKey } from '../utils/supabase/info';

const FREE_WAITING_TIME = 3 * 60; // 3 minutes en secondes

/**
 * 🆕 COMPOSANT AUTONOME POUR CONDUCTEUR
 * Gère automatiquement le toggle du temps d'attente gratuit
 */
export function FreeWaitingToggle() {
  const { state, updateRide } = useAppState();
  const currentRide = state.currentRide;
  
  const [freeWaitingEnabled, setFreeWaitingEnabled] = useState(true);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [elapsedWaitingTime, setElapsedWaitingTime] = useState(0);
  const [billingActivated, setBillingActivated] = useState(false);

  if (!currentRide) return null;

  // 🔴 Vérifier si le compteur de facturation a déjà été activé
  // Une fois activé, il ne peut JAMAIS être désactivé
  useEffect(() => {
    if (currentRide.billingStartTime || currentRide.billingActive) {
      setBillingActivated(true);
      setFreeWaitingEnabled(false);
    }
  }, [currentRide.billingStartTime, currentRide.billingActive]);

  // ⏱️ Chronomètre du temps d'attente depuis le début de la course
  useEffect(() => {
    if (!currentRide.startedAt) return;

    const updateTimer = () => {
      const startTime = typeof currentRide.startedAt === 'number' 
        ? currentRide.startedAt 
        : new Date(currentRide.startedAt).getTime();
      const now = Date.now();
      const elapsed = Math.floor((now - startTime) / 1000); // en secondes
      setElapsedWaitingTime(elapsed);

      // 🔥 ACTIVATION AUTOMATIQUE DU CHRONO APRÈS LE TEMPS GRATUIT
      if (freeWaitingEnabled && elapsed >= FREE_WAITING_TIME && !billingActivated) {
        console.log('⚡ ACTIVATION AUTOMATIQUE DU CHRONO - Temps gratuit écoulé');
        activateBilling();
      }
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);

    return () => clearInterval(timer);
  }, [currentRide.startedAt, freeWaitingEnabled, billingActivated]);

  // 🔥 Activer le compteur de facturation
  const activateBilling = async () => {
    if (billingActivated) {
      console.log('⚠️ Compteur de facturation déjà activé');
      return;
    }

    try {
      console.log('🔥 Activation du compteur de facturation...');
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/rides/activate-billing`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            rideId: currentRide.id,
            waitingTimeFrozen: elapsedWaitingTime // Geler le temps d'attente gratuit
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Compteur de facturation activé:', data);
        
        // Mettre à jour localement
        if (updateRide) {
          updateRide({
            ...currentRide,
            billingActive: true,
            billingStartTime: Date.now(),
            waitingTimeFrozen: elapsedWaitingTime,
            freeWaitingDisabled: true
          });
        }

        setBillingActivated(true);
        setFreeWaitingEnabled(false);
        
        toast.success('⚡ Compteur de facturation activé !', {
          description: 'Le passager a été notifié'
        });
      } else {
        throw new Error('Erreur serveur');
      }
    } catch (error) {
      console.error('❌ Erreur activation chrono:', error);
      toast.error('Erreur lors de l\'activation du chrono');
    }
  };

  const handleToggle = () => {
    // ❌ UNE FOIS ACTIVÉ, ON NE PEUT PLUS DÉSACTIVER
    if (billingActivated) {
      toast.error('Le compteur de facturation ne peut pas être désactivé !', {
        description: 'Cette action est irréversible'
      });
      return;
    }

    if (freeWaitingEnabled) {
      // Désactiver l'attente gratuite = activer immédiatement le chrono
      setShowConfirmDialog(true);
    } else {
      // Impossible de réactiver une fois désactivé
      toast.error('Impossible de réactiver l\'attente gratuite', {
        description: 'Le compteur de facturation est déjà en cours'
      });
    }
  };

  const confirmDisable = () => {
    setShowConfirmDialog(false);
    activateBilling();
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const remainingFreeTime = Math.max(0, FREE_WAITING_TIME - elapsedWaitingTime);
  const isFreeTimeExpired = elapsedWaitingTime >= FREE_WAITING_TIME;

  return (
    <div className="space-y-4">
      {/* Main Toggle Card */}
      <Card className={`p-4 border-2 ${
        billingActivated 
          ? 'border-orange-300 bg-orange-50' 
          : freeWaitingEnabled 
            ? 'border-green-200 bg-green-50' 
            : 'border-red-200 bg-red-50'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              billingActivated 
                ? 'bg-orange-100' 
                : freeWaitingEnabled 
                  ? 'bg-green-100' 
                  : 'bg-red-100'
            }`}>
              {billingActivated ? (
                <Zap className="w-5 h-5 text-orange-600 animate-pulse" />
              ) : (
                <Timer className={`w-5 h-5 ${freeWaitingEnabled ? 'text-green-600' : 'text-red-600'}`} />
              )}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-semibold">
                  {billingActivated ? 'Facturation en cours' : 'Attente gratuite'}
                </h3>
                <Badge variant={billingActivated ? "default" : freeWaitingEnabled ? "default" : "destructive"}>
                  {billingActivated ? '⚡ Actif' : freeWaitingEnabled ? 'Activée' : 'Désactivée'}
                </Badge>
              </div>
              <p className="text-sm text-gray-600">
                {billingActivated 
                  ? 'Le compteur de facturation est activé (irréversible)'
                  : freeWaitingEnabled 
                    ? `${Math.floor(FREE_WAITING_TIME / 60)} minutes d'attente gratuite pour le passager`
                    : 'La facturation commence dès l\'arrivée'
                }
              </p>
            </div>
          </div>
          
          {/* ❌ DÉSACTIVER LE SWITCH SI LE COMPTEUR EST ACTIVÉ */}
          <Switch
            checked={!freeWaitingEnabled || billingActivated}
            onCheckedChange={handleToggle}
            disabled={billingActivated}
            className={billingActivated ? 'opacity-50 cursor-not-allowed' : ''}
          />
        </div>

        {/* Current Waiting Time Info */}
        {elapsedWaitingTime > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-4 pt-4 border-t border-gray-200"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-gray-600" />
                <span className="text-sm text-gray-600">Temps d'attente actuel:</span>
              </div>
              <span className="font-mono text-lg font-bold">{formatTime(elapsedWaitingTime)}</span>
            </div>
            
            {freeWaitingEnabled && !isFreeTimeExpired && !billingActivated && (
              <div className="mt-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-green-600">Temps gratuit restant:</span>
                  <span className="font-mono text-green-600 font-bold">{formatTime(remainingFreeTime)}</span>
                </div>
                <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(remainingFreeTime / FREE_WAITING_TIME) * 100}%` }}
                  />
                </div>
              </div>
            )}
            
            {(isFreeTimeExpired || billingActivated) && (
              <div className="mt-2 p-3 bg-orange-100 border-2 border-orange-300 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Zap className="w-5 h-5 text-orange-600 animate-pulse" />
                  <span className="text-sm font-bold text-orange-800">
                    {billingActivated 
                      ? '⚡ Facturation activée - Compteur en cours !' 
                      : 'Temps d\'attente gratuite dépassé - Activation automatique...'}
                  </span>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </Card>

      {/* Info Card */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="flex items-start space-x-3">
          <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-medium text-blue-900 mb-2">
              {billingActivated ? 'Compteur de facturation' : 'À propos de l\'attente gratuite'}
            </h4>
            <ul className="text-sm text-blue-800 space-y-1">
              {billingActivated ? (
                <>
                  <li>• Le compteur de facturation est activé et ne peut plus être désactivé</li>
                  <li>• Le passager a été notifié de l'activation</li>
                  <li>• Le temps d'attente gratuit ({formatTime(currentRide.waitingTimeFrozen || 0)}) a été gelé</li>
                  <li>• La facturation continuera jusqu'à la fin de la course</li>
                </>
              ) : (
                <>
                  <li>• Les premiers {Math.floor(FREE_WAITING_TIME / 60)} minutes d'attente sont offerts au passager</li>
                  <li>• ⚡ Le compteur s'active AUTOMATIQUEMENT après {Math.floor(FREE_WAITING_TIME / 60)} min</li>
                  <li>• Vous pouvez l'activer manuellement en désactivant ce toggle</li>
                  <li>• ⚠️ Une fois activé, le compteur ne peut PLUS être désactivé</li>
                </>
              )}
            </ul>
          </div>
        </div>
      </Card>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-6 z-50"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-6 w-full max-w-md"
          >
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
                <Zap className="w-8 h-8 text-orange-600 animate-pulse" />
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Activer le compteur de facturation ?
                </h3>
                <p className="text-sm text-gray-600 mt-2">
                  Cette action commencera la facturation immédiatement. 
                  Le passager sera notifié de ce changement.
                </p>
              </div>

              <div className="bg-red-50 border-2 border-red-300 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <span className="text-sm font-bold text-red-800">
                    ⚠️ Action IRRÉVERSIBLE - Le compteur ne pourra plus être désactivé
                  </span>
                </div>
              </div>

              <div className="flex space-x-3">
                <Button
                  onClick={() => setShowConfirmDialog(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Annuler
                </Button>
                <Button
                  onClick={confirmDisable}
                  className="flex-1 bg-orange-600 hover:bg-orange-700"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Activer le compteur
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}