import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { CheckCircle, Clock, Star } from '../lib/icons';
import { useTranslation } from '../hooks/useTranslation';
import { Ride } from '../types';

interface PaymentSuccessDialogProps {
  isOpen: boolean;
  onClose: () => void;
  ride: Ride;
  onRateDriver?: () => void;
}

export function PaymentSuccessDialog({ 
  isOpen, 
  onClose, 
  ride, 
  onRateDriver 
}: PaymentSuccessDialogProps) {
  const { t } = useTranslation();

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins}min`;
    }
    return `${mins} ${t('minutes')}`;
  };

  const totalPaid = (ride.actualPrice || 0) + (ride.tip || 0) - (ride.promoDiscount || 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-green-600 text-center justify-center">
            <CheckCircle className="w-6 h-6" />
            {t('payment_successful')}
          </DialogTitle>
          <DialogDescription>
            Confirmation de votre paiement et récapitulatif de la course.
          </DialogDescription>
        </DialogHeader>

        <div className="text-center space-y-4">
          {/* Success message */}
          <div className="bg-green-50 rounded-lg p-4">
            <p className="text-green-800">
              {t('your_payment_of')} <span className="font-bold">{(totalPaid || 0).toLocaleString()} {t('cdf')}</span> {t('to_smartcab_successful')}
            </p>
          </div>

          {/* Trip duration */}
          <div className="flex items-center justify-center gap-2 text-gray-600">
            <Clock className="w-5 h-5" />
            <span>{t('ride_duration')}: {formatDuration(ride.estimatedDuration)}</span>
          </div>

          {/* Payment breakdown */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Prix de la course:</span>
              <span>{(ride.actualPrice || 0).toLocaleString()} {t('cdf')}</span>
            </div>
            
            {ride.tip && ride.tip > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Pourboire:</span>
                <span>+{(ride.tip || 0).toLocaleString()} {t('cdf')}</span>
              </div>
            )}
            
            {ride.promoDiscount && ride.promoDiscount > 0 && (
              <div className="flex justify-between text-blue-600">
                <span>Réduction ({ride.promoCode}):</span>
                <span>-{(ride.promoDiscount || 0).toLocaleString()} {t('cdf')}</span>
              </div>
            )}
            
            <div className="border-t pt-2 flex justify-between font-semibold">
              <span>Total payé:</span>
              <span>{(totalPaid || 0).toLocaleString()} {t('cdf')}</span>
            </div>
          </div>

          {/* Trip details */}
          <div className="text-sm text-gray-600 space-y-1">
            <p><strong>Distance:</strong> {(ride.distanceKm || 0).toFixed(1)} km</p>
            <p><strong>Date:</strong> {new Date().toLocaleDateString('fr-FR')}</p>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Fermer
            </Button>
            {onRateDriver && (
              <Button
                onClick={() => {
                  onClose();
                  onRateDriver();
                }}
                className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white"
              >
                <Star className="w-4 h-4 mr-2" />
                Évaluer
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}