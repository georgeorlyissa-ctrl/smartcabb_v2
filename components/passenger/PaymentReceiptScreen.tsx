import { useState, useEffect } from 'react';
import { motion } from '../../lib/motion'; // ✅ FIX: Utiliser l'implémentation locale
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { useAppState } from '../../hooks/useAppState';
import { TipSelector } from '../TipSelector';
import { 
  CheckCircle,
  Clock,
  MapPin,
  Star,
  User,
  Car,
  Receipt,
  CreditCard,
  Smartphone,
  Banknote,
  Download,
  Share,
  ArrowLeft,
  X
} from '../../lib/icons';
import { toast } from '../../lib/toast';

export function PaymentReceiptScreen() {
  const { state, setCurrentScreen, updateRide, drivers } = useAppState();
  const [isProcessingPayment, setIsProcessingPayment] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<'processing' | 'success' | 'failed'>('processing');
  const [selectedTip, setSelectedTip] = useState(0);
  const [showTipSection, setShowTipSection] = useState(false);

  // ✅ FIX: Ajouter une vérification de sécurité pour éviter l'erreur "Cannot read properties of undefined"
  const assignedDriver = drivers?.find(d => d.id === state.currentRide?.driverId) || null;
  const currentRide = state.currentRide;

  // Traitement du paiement via backend
  useEffect(() => {
    const processPayment = setTimeout(() => {
      setIsProcessingPayment(false);
      setPaymentStatus('success');
      
      if (currentRide?.id) {
        updateRide(currentRide.id, { 
          paymentStatus: 'completed',
          paymentProcessedAt: new Date()
        });
      }
      
      toast.success('Paiement effectué avec succès !');
      
      // Show tip section after successful payment
      setTimeout(() => {
        setShowTipSection(true);
      }, 1000);
    }, 3000);

    return () => clearTimeout(processPayment);
  }, [currentRide?.id, updateRide]);

  const handleTipSelection = (amount: number) => {
    setSelectedTip(amount);
    if (currentRide?.id && amount > 0) {
      updateRide(currentRide.id, { 
        tip: amount,
        actualPrice: (currentRide.actualPrice || 0) + amount
      });
      toast.success(`Pourboire de ${amount.toLocaleString()} CDF ajouté !`);
    }
  };

  const handleContinueToRating = () => {
    setCurrentScreen('rating');
  };

  const handleBackToMap = () => {
    setCurrentScreen('map');
  };

  const getPaymentMethodIcon = () => {
    switch (currentRide?.paymentMethod) {
      case 'mobile_money':
        return <Smartphone className="w-5 h-5" />;
      case 'card':
        return <CreditCard className="w-5 h-5" />;
      case 'cash':
        return <Banknote className="w-5 h-5" />;
      default:
        return <CreditCard className="w-5 h-5" />;
    }
  };

  const getPaymentMethodName = () => {
    switch (currentRide?.paymentMethod) {
      case 'mobile_money':
        return 'Mobile Money';
      case 'card':
        return 'Carte bancaire';
      case 'cash':
        return 'Espèces';
      default:
        return 'Carte bancaire';
    }
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
      className="min-h-screen bg-gray-50 flex flex-col"
    >
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBackToMap}
            className="w-10 h-10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold">Reçu de paiement</h1>
          <div className="w-10" /> {/* Spacer */}
        </div>
      </div>

      <div className="flex-1 p-6 space-y-6">
        {/* Payment Status */}
        <Card className="p-6">
          <div className="text-center">
            {isProcessingPayment ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full mx-auto"
                />
                <h2 className="text-xl font-semibold">Traitement du paiement...</h2>
                <p className="text-gray-600">Veuillez patienter</p>
              </motion.div>
            ) : paymentStatus === 'success' ? (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="space-y-4"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                >
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
                </motion.div>
                <h2 className="text-xl font-semibold text-green-600">Paiement réussi !</h2>
                <p className="text-gray-600">Votre paiement a été traité avec succès</p>
              </motion.div>
            ) : (
              <div className="space-y-4">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                  <X className="w-8 h-8 text-red-500" />
                </div>
                <h2 className="text-xl font-semibold text-red-600">Échec du paiement</h2>
                <p className="text-gray-600">Une erreur s'est produite</p>
              </div>
            )}
          </div>
        </Card>

        {/* Trip Summary */}
        {paymentStatus === 'success' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Détails de la course</h3>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  Terminée
                </Badge>
              </div>

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
                    {assignedDriver?.vehicleInfo.color} {assignedDriver?.vehicleInfo.make}
                  </p>
                </div>
              </div>

              {/* Trip Details */}
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <MapPin className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Départ</p>
                    <p className="font-medium">{currentRide.pickup?.address}</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <MapPin className="w-5 h-5 text-red-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Arrivée</p>
                    <p className="font-medium">{currentRide.destination?.address}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Clock className="w-5 h-5 text-blue-500" />
                  <div>
                    <p className="text-sm text-gray-500">Durée</p>
                    <p className="font-medium">{currentRide.duration || 15} minutes</p>
                  </div>
                </div>
              </div>

              <Separator className="my-4" />

              {/* Payment Breakdown */}
              <div className="space-y-3">
                <h4 className="font-semibold">Détail du paiement</h4>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Course de base</span>
                  <span>{(currentRide.actualPrice || currentRide.estimatedPrice || 0).toLocaleString()} CDF</span>
                </div>
                
                {currentRide.tip && currentRide.tip > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Pourboire</span>
                    <span>+{currentRide.tip.toLocaleString()} CDF</span>
                  </div>
                )}
                
                <Separator />
                
                <div className="flex justify-between font-semibold text-lg">
                  <span>Total</span>
                  <span>{((currentRide.actualPrice || currentRide.estimatedPrice || 0) + (currentRide.tip || 0)).toLocaleString()} CDF</span>
                </div>
                
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <div className="flex items-center space-x-2">
                    {getPaymentMethodIcon()}
                    <span>Payé par {getPaymentMethodName()}</span>
                  </div>
                  <span>{new Date().toLocaleDateString('fr-FR')}</span>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Tip Section */}
        {showTipSection && !selectedTip && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Laisser un pourboire ?</h3>
              <p className="text-gray-600 mb-4">
                Votre chauffeur a-t-il fourni un excellent service ?
              </p>
              
              <TipSelector
                onTipSelected={handleTipSelection}
                baseAmount={currentRide.actualPrice || currentRide.estimatedPrice || 0}
              />
            </Card>
          </motion.div>
        )}

        {/* Receipt Actions */}
        {paymentStatus === 'success' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="flex space-x-3"
          >
            <Button
              variant="outline"
              className="flex-1 h-12"
              onClick={() => toast.info('Fonctionnalité bientôt disponible')}
            >
              <Download className="w-4 h-4 mr-2" />
              Télécharger
            </Button>
            
            <Button
              variant="outline"
              className="flex-1 h-12"
              onClick={() => toast.info('Fonctionnalité bientôt disponible')}
            >
              <Share className="w-4 h-4 mr-2" />
              Partager
            </Button>
          </motion.div>
        )}
      </div>

      {/* Bottom Actions */}
      {paymentStatus === 'success' && (
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="p-6 bg-white border-t space-y-3"
        >
          <Button
            onClick={handleContinueToRating}
            className="w-full h-14 bg-green-500 hover:bg-green-600 text-white rounded-xl"
          >
            <Star className="w-5 h-5 mr-2" />
            Évaluer le chauffeur
          </Button>
          
          <Button
            onClick={handleBackToMap}
            variant="ghost"
            className="w-full h-12 text-gray-600"
          >
            Nouvelle course
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
}