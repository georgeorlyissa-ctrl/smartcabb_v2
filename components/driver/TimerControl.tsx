import { useState } from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { 
  Clock, 
  Pause, 
  Play, 
  StopCircle, 
  AlertTriangle,
  DollarSign,
  Timer,
  Ban
} from '../../lib/icons';
import { toast } from '../../lib/toast';

interface TimerControlProps {
  isTimerActive: boolean;
  isTimerDisabled: boolean;
  onTimerToggle: (disabled: boolean) => void;
  onOfferPostpaid: () => void;
  onDisableFreeWaiting?: () => void;
  currentCost: number;
  elapsedTime: number;
  freeWaitingDisabled?: boolean;
  waitingTime?: number;
  waitingTimeFrozen?: number | null;
  billingElapsedTime?: number;
  isBillingActive?: boolean;
}

export function TimerControl({ 
  isTimerActive,
  isTimerDisabled,
  onTimerToggle,
  onOfferPostpaid,
  onDisableFreeWaiting,
  currentCost,
  elapsedTime,
  freeWaitingDisabled = false,
  waitingTime = 0,
  waitingTimeFrozen = null,
  billingElapsedTime = 0,
  isBillingActive = false
}: TimerControlProps) {
  const [showPostpaidOption, setShowPostpaidOption] = useState(false);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const handleTimerToggle = () => {
    const newDisabledState = !isTimerDisabled;
    onTimerToggle(newDisabledState);
    
    if (newDisabledState) {
      toast.info('Chronomètre suspendu par entente avec le passager');
      setShowPostpaidOption(true);
    } else {
      toast.info('Chronomètre réactivé');
      setShowPostpaidOption(false);
    }
  };

  const handleOfferPostpaid = () => {
    onOfferPostpaid();
    toast.success('Option post payé proposée au passager (15% d\'intérêt)');
  };

  const handleDisableFreeWaiting = () => {
    if (onDisableFreeWaiting) {
      onDisableFreeWaiting();
      toast.success('Attente gratuite désactivée - La facturation commence immédiatement');
    }
  };

  const isWaitingPeriod = waitingTime < 600; // 10 minutes en secondes
  const remainingFreeTime = Math.max(0, 600 - waitingTime); // Temps gratuit restant
  
  // Note: isBillingActive est déjà reçu en prop depuis le parent

  return (
    <Card className="p-4 bg-gradient-to-r from-blue-50 to-green-50 border-blue-200">
      <div className="space-y-4">
        {/* Timer Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-full ${isTimerDisabled ? 'bg-red-100' : isBillingActive ? 'bg-orange-100' : 'bg-green-100'}`}>
              <Clock className={`w-5 h-5 ${isTimerDisabled ? 'text-red-600' : isBillingActive ? 'text-orange-600' : 'text-green-600'}`} />
            </div>
            <div>
              <h3 className="font-semibold">Contrôle du chronomètre</h3>
              <p className="text-sm text-gray-600">
                {isTimerDisabled ? 'Suspendu par entente' : isBillingActive ? 'Actif - Facturation en cours' : 'Attente gratuite'}
              </p>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-lg font-bold">
              {isBillingActive ? formatTime(billingElapsedTime) : '0:00'}
            </div>
            <div className="text-sm font-semibold text-green-600">
              {currentCost.toLocaleString()} CDF
            </div>
          </div>
        </div>

        {/* Indicateur FACTURATION EN COURS - Affiché quand billing actif */}
        {isBillingActive && !isTimerDisabled && (
          <div
            className="bg-gradient-to-r from-red-500 to-orange-500 text-white p-4 rounded-xl border-2 border-red-600 shadow-lg"
          >
            <div className="flex items-center justify-center space-x-2 mb-3">
              <DollarSign className="w-6 h-6 animate-pulse" />
              <span className="font-bold text-lg">💰 FACTURATION EN COURS</span>
              <DollarSign className="w-6 h-6 animate-pulse" />
            </div>
            <p className="text-center text-sm mb-3 font-medium">
              {freeWaitingDisabled && waitingTime < 600 
                ? "Attente gratuite désactivée - Facturation dès maintenant" 
                : "Période d'attente gratuite épuisée - Facturation active"}
            </p>
            
            {/* NOUVEAU : Chrono de facturation */}
            <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Clock className="w-5 h-5" />
                  <span className="font-medium">Temps écoulé:</span>
                </div>
                <span className="font-mono text-2xl font-bold">
                  {formatTime(billingElapsedTime)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Temps d'attente info */}
        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Timer className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium">Temps d'attente:</span>
            </div>
            <span className="font-bold text-blue-600">
              {Math.floor(waitingTime / 60)}min {waitingTime % 60}s
            </span>
          </div>
          {!isBillingActive && (
            <p className="text-xs text-blue-600 mt-1">
              🆓 Gratuit pendant encore {Math.floor((600 - waitingTime) / 60)}min {(600 - waitingTime) % 60}s
            </p>
          )}
        </div>

        {/* CONTRÔLE D'ATTENTE GRATUITE - Visible UNIQUEMENT si attente gratuite encore disponible */}
        {!isBillingActive && (
          <div
            className="p-4 rounded-lg border-2 border-green-200 bg-green-50"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <Timer className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <label className="font-medium text-green-800">🆓 Attente gratuite ACTIVE</label>
                  <p className="text-sm text-green-700">
                    Temps gratuit restant: <strong>{Math.floor(remainingFreeTime / 60)}min {remainingFreeTime % 60}s</strong>
                  </p>
                </div>
              </div>
              
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDisableFreeWaiting}
                className="bg-orange-600 hover:bg-orange-700 font-semibold"
              >
                <Ban className="w-4 h-4 mr-1" />
                Désactiver
              </Button>
            </div>
            
            <p className="text-xs text-green-700 font-medium">
              💡 Cliquez sur "Désactiver" pour commencer la facturation immédiatement.
            </p>
          </div>
        )}

        {/* OPTION DE RÉACTIVATION - Si désactivé manuellement ET encore dans les 10 min */}
        {isBillingActive && freeWaitingDisabled && waitingTime < 600 && (
          <div
            className="p-3 rounded-lg border border-green-300 bg-green-50"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm text-green-800">
                Temps gratuit restant disponible: <strong>{Math.floor(remainingFreeTime / 60)}min {remainingFreeTime % 60}s</strong>
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDisableFreeWaiting}
                className="bg-green-100 hover:bg-green-200 text-green-700 border-green-300"
              >
                <Timer className="w-4 h-4 mr-1" />
                Réactiver gratuit
              </Button>
            </div>
          </div>
        )}

        {/* Timer Control Switch - Amélioré */}
        <div className={`p-4 rounded-lg border-2 ${isTimerDisabled ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              {isTimerDisabled ? (
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                  <Pause className="w-4 h-4 text-red-600" />
                </div>
              ) : (
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <Play className="w-4 h-4 text-green-600" />
                </div>
              )}
              <div>
                <label className="font-medium">
                  {isTimerDisabled ? 'Facturation suspendue' : 'Facturation active'}
                </label>
                <p className="text-sm text-gray-600">
                  Temps d'entente avec le passager
                </p>
              </div>
            </div>
            
            <Button
              variant={isTimerDisabled ? "default" : "destructive"}
              size="sm"
              onClick={handleTimerToggle}
              className={isTimerDisabled ? "bg-green-600 hover:bg-green-700" : ""}
            >
              {isTimerDisabled ? 'Reprendre' : 'Suspendre'}
            </Button>
          </div>
          
          <p className="text-xs text-gray-500">
            💡 Utilisez cette fonction lorsque vous et le passager convenez d'un arrêt ou d'une pause.
          </p>
        </div>

        {/* Warning Message */}
        {isTimerDisabled && (
          <div
            className="p-3 bg-amber-50 border border-amber-200 rounded-lg"
          >
            <div className="flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800">
                  Facturation suspendue
                </p>
                <p className="text-xs text-amber-700">
                  Le temps ne sera pas facturé pendant la suspension. 
                  Assurez-vous que le passager est d'accord.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Postpaid Option */}
        {showPostpaidOption && (
          <div
            className="space-y-3"
          >
            <div className="border-t pt-3">
              <h4 className="font-medium mb-2">Options de paiement</h4>
              
              <Button
                onClick={handleOfferPostpaid}
                variant="outline"
                className="w-full justify-start"
                size="sm"
              >
                <DollarSign className="w-4 h-4 mr-2" />
                Proposer le post payé (15% d'intérêt)
              </Button>
              
              <p className="text-xs text-gray-600 mt-2">
                Le passager pourra payer plus tard avec un taux d'intérêt de 15%.
                Cette option sera envoyée sur son interface.
              </p>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}