import { motion } from '../lib/motion'; // ✅ FIX: Utiliser l'implémentation locale
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from './ui/dialog';
import { CheckCircle, Star } from '../lib/icons';

interface RideCompletionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  totalCost: number;
  duration: number;
  onRateRide?: (rating: number) => void;
}

export function RideCompletionDialog({ 
  isOpen, 
  onClose, 
  totalCost, 
  duration,
  onRateRide 
}: RideCompletionDialogProps) {
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    
    if (hours > 0) {
      return `${hours}h ${mins}min`;
    }
    return `${mins}min`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md">
        <DialogTitle className="sr-only">
          Course terminée
        </DialogTitle>
        <DialogDescription className="sr-only">
          Résumé de votre course et évaluation
        </DialogDescription>
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="text-center space-y-6 py-6"
        >
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          
          <div className="space-y-3">
            <h2 className="text-2xl font-semibold text-gray-900">
              Course terminée !
            </h2>
            
            <p className="text-gray-600 leading-relaxed">
              Nous vous remercions d'avoir choisi SmartCab. 
              Nous espérons vous revoir parmi nous.
            </p>
          </div>

          {/* Résumé de la course */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Durée</span>
              <span className="font-medium">{formatDuration(duration)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Coût total</span>
              <span className="font-bold text-lg text-green-600">
                {(totalCost || 0).toLocaleString()} CDF
              </span>
            </div>
          </div>

          {/* Évaluation */}
          {onRateRide && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Comment évaluez-vous cette course ?
              </p>
              <div className="flex justify-center space-x-2">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    onClick={() => onRateRide(rating)}
                    className="p-1 hover:scale-110 transition-transform"
                  >
                    <Star className="w-8 h-8 text-yellow-400 fill-current hover:text-yellow-500" />
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3">
            <Button
              onClick={onClose}
              className="w-full bg-green-500 hover:bg-green-600 text-white"
            >
              Terminer
            </Button>
            
            <Button
              variant="outline"
              onClick={() => {
                // Logic for new ride
                onClose();
              }}
              className="w-full"
            >
              Nouvelle course
            </Button>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}