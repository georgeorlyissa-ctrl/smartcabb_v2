import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { CheckCircle, Clock, MapPin, CreditCard } from '../lib/icons';
import { useTranslation } from '../hooks/useTranslation';
import { Ride } from '../types';

interface RideCompletionSummaryProps {
  isOpen: boolean;
  onClose: () => void;
  ride: Ride;
  onPayment: () => void;
}

export function RideCompletionSummary({ 
  isOpen, 
  onClose, 
  ride, 
  onPayment 
}: RideCompletionSummaryProps) {
  const { t } = useTranslation();

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins}min`;
    }
    return `${mins} ${t('minutes')}`;
  };

  const totalAmount = (ride.actualPrice || 0) + (ride.tip || 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-green-600">
            <CheckCircle className="w-6 h-6" />
            Course terminée
          </DialogTitle>
          <DialogDescription className="sr-only">
            Résumé de votre course terminée avec le montant total à payer
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Résumé de la course */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">{t('amount_to_pay')}</span>
              <span className="font-bold text-lg">
                {(ride.actualPrice || 0).toLocaleString()} {t('cdf')}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-gray-600">{t('trip_duration')}</span>
              <span className="font-medium">
                {formatDuration(ride.estimatedDuration)}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-gray-600">{t('distance_traveled')}</span>
              <span className="font-medium">
                {(ride.distanceKm || 0).toFixed(1)} {t('km')}
              </span>
            </div>

            {ride.tip && ride.tip > 0 && (
              <div className="flex items-center justify-between border-t pt-2">
                <span className="text-gray-600">Pourboire</span>
                <span className="font-medium text-green-600">
                  +{(ride.tip || 0).toLocaleString()} {t('cdf')}
                </span>
              </div>
            )}

            {ride.promoDiscount && ride.promoDiscount > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Réduction ({ride.promoCode})</span>
                <span className="font-medium text-green-600">
                  -{(ride.promoDiscount || 0).toLocaleString()} {t('cdf')}
                </span>
              </div>
            )}

            <div className="border-t pt-2 flex items-center justify-between">
              <span className="font-medium">Total à payer</span>
              <span className="font-bold text-xl text-green-600">
                {(totalAmount || 0).toLocaleString()} {t('cdf')}
              </span>
            </div>
          </div>

          {/* Informations de localisation */}
          <div className="space-y-2">
            <div className="flex items-start gap-3">
              <div className="w-3 h-3 bg-blue-500 rounded-full mt-1"></div>
              <div className="flex-1">
                <p className="text-sm text-gray-600">Départ</p>
                <p className="font-medium">{ride.pickup.address}</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full mt-1"></div>
              <div className="flex-1">
                <p className="text-sm text-gray-600">Arrivée</p>
                <p className="font-medium">{ride.destination.address}</p>
              </div>
            </div>
          </div>

          {/* Mode de paiement sélectionné */}
          <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
            <CreditCard className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-sm text-gray-600">Mode de paiement</p>
              <p className="font-medium capitalize">
                {ride.paymentMethod === 'mobile_money' ? 'Mobile Money' :
                 ride.paymentMethod === 'card' ? 'Carte bancaire' : 'Espèces'}
              </p>
            </div>
          </div>

          {/* Boutons d'action */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Plus tard
            </Button>
            <Button
              onClick={onPayment}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              Payer maintenant
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}