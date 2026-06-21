import { useAppState } from '../../hooks/useAppState';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { motion } from '../../lib/motion'; // ✅ FIX: Import local au lieu de motion/react
import { 
  CheckCircle, 
  XCircle, 
  DollarSign, 
  User, 
  Calendar 
} from '../../lib/icons'; // ✅ FIX: Import local au lieu de lucide-react
import { useState, useEffect } from 'react';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { toast } from '../../lib/toast';

export function PaymentConfirmationScreen() {
  const { state, setCurrentScreen, updateRide } = useAppState();
  const [isConfirming, setIsConfirming] = useState(false);
  const currentRide = state.currentRide;

  // ✅ POLLING : Vérifier si le passager a payé
  useEffect(() => {
    if (!currentRide?.id) return;

    const checkPaymentStatus = async () => {
      try {
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/rides/${currentRide.id}`,
          {
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`
            }
          }
        );

        if (response.ok) {
          const data = await response.json();
          if (data.ride?.paymentStatus === 'paid') {
            console.log('✅ Paiement confirmé par le passager');
            toast.success('Paiement confirmé !');
            // Rediriger automatiquement après confirmation
            setTimeout(() => {
              setCurrentScreen('driver-dashboard');
            }, 2000);
          }
        }
      } catch (error) {
        console.error('❌ Erreur vérification paiement:', error);
      }
    };

    // Vérifier toutes les 3 secondes
    const interval = setInterval(checkPaymentStatus, 3000);

    return () => clearInterval(interval);
  }, [currentRide?.id]);

  if (!currentRide) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-6">
          <p>Aucune course en cours</p>
        </Card>
      </div>
    );
  }

  const handleConfirmPayment = async () => {
    setIsConfirming(true);

    try {
      console.log('✅ Confirmation réception paiement');
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/rides/${currentRide.id}/confirm-payment`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            driverId: state.currentUser?.id
          })
        }
      );

      if (!response.ok) {
        throw new Error('Erreur confirmation paiement');
      }

      toast.success('Paiement confirmé !');
      
      // ✅ v518.1: Rafraîchir le solde du conducteur après la clôture de la course
      // Le backend a automatiquement déduit 15% du solde
      if (state.currentUser?.id || state.currentDriver?.id) {
        const driverId = state.currentUser?.id || state.currentDriver?.id;
        try {
          console.log('💰 Rafraîchissement du solde après clôture de course...');
          const balanceResponse = await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/drivers/${driverId}/balance`,
            {
              headers: {
                'Authorization': `Bearer ${publicAnonKey}`
              }
            }
          );
          
          if (balanceResponse.ok) {
            const balanceData = await balanceResponse.json();
            if (balanceData.success && balanceData.balance !== undefined) {
              const newBalance = balanceData.balance;
              console.log(`✅ Nouveau solde après commission: ${newBalance.toLocaleString()} CDF`);
              
              // Sauvegarder dans localStorage pour synchronisation
              localStorage.setItem(`driver_balance_${driverId}`, newBalance.toString());
              
              // Afficher une notification
              toast.info(
                `💰 Votre nouveau solde: ${newBalance.toLocaleString()} CDF (commission déduite)`,
                { duration: 5000 }
              );
            }
          }
        } catch (balanceError) {
          console.error('❌ Erreur rafraîchissement solde:', balanceError);
          // Ne pas bloquer la redirection si le rafraîchissement échoue
        }
      }
      
      // Rediriger vers le dashboard
      setTimeout(() => {
        setCurrentScreen('driver-dashboard');
      }, 1500);
      
    } catch (error) {
      console.error('❌ Erreur confirmation paiement:', error);
      toast.error('Erreur lors de la confirmation');
    } finally {
      setIsConfirming(false);
    }
  };

  const handleReportIssue = () => {
    toast.error('Signalement envoyé au support');
    // TODO: Implémenter la logique de signalement
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Confirmation de paiement</h1>
          <p className="text-gray-600 text-sm">Attendez que le passager paie</p>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Animation d'attente */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-8"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-24 h-24 mx-auto mb-4"
          >
            <Calendar className="w-24 h-24 text-blue-600" />
          </motion.div>
          <h2 className="text-xl font-semibold mb-2">En attente du paiement</h2>
          <p className="text-gray-600">Le passager est en train de payer...</p>
        </motion.div>

        {/* Résumé de la course */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Résumé de la course</h3>
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Passager</span>
                <span className="font-medium">{currentRide.passenger?.name || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Distance</span>
                <span className="font-medium">{(currentRide.distance || 0).toFixed(1) || 'N/A'} km</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Durée</span>
                <span className="font-medium">{currentRide.duration ? Math.round(currentRide.duration) : 'N/A'} min</span>
              </div>
              
              <div className="pt-3 border-t flex justify-between items-center">
                <span className="text-lg font-semibold">Montant à recevoir</span>
                <span className="text-3xl font-bold text-green-600">
                  {currentRide.finalPrice?.toLocaleString() || currentRide.totalPrice?.toLocaleString() || currentRide.estimatedPrice?.toLocaleString() || 'N/A'} CDF
                </span>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Mode de paiement */}
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="font-medium">Mode de paiement</p>
              <p className="text-sm text-gray-600">
                {currentRide.paymentMethod === 'cash' && 'Espèces'}
                {currentRide.paymentMethod === 'mobile_money' && 'Mobile Money'}
                {currentRide.paymentMethod === 'card' && 'Carte bancaire'}
              </p>
            </div>
          </div>
        </Card>

        {/* Instructions */}
        <Card className="p-4 bg-blue-50 border-blue-200">
          <h4 className="font-semibold text-blue-800 mb-2">Instructions</h4>
          {currentRide.paymentMethod === 'cash' && (
            <p className="text-sm text-blue-700">
              Assurez-vous de recevoir le montant exact en espèces avant de confirmer.
            </p>
          )}
          {currentRide.paymentMethod === 'mobile_money' && (
            <p className="text-sm text-blue-700">
              Vérifiez que vous avez bien reçu l'argent sur votre compte Mobile Money.
            </p>
          )}
          {currentRide.paymentMethod === 'card' && (
            <p className="text-sm text-blue-700">
              Le paiement par carte sera traité automatiquement.
            </p>
          )}
        </Card>

        {/* Boutons d'action */}
        <div className="space-y-3">
          <Button
            onClick={handleConfirmPayment}
            disabled={isConfirming}
            className="w-full bg-green-600 hover:bg-green-700"
            size="lg"
          >
            {isConfirming ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Confirmation en cours...
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5 mr-2" />
                J'ai reçu le paiement
              </>
            )}
          </Button>

          <Button
            onClick={handleReportIssue}
            variant="outline"
            className="w-full border-red-300 text-red-600 hover:bg-red-50"
            size="lg"
          >
            <XCircle className="w-5 h-5 mr-2" />
            Signaler un problème
          </Button>
        </div>

        {/* Note de sécurité */}
        <Card className="p-4 bg-gray-50">
          <p className="text-xs text-gray-600 text-center">
            🔒 Ne confirmez le paiement que si vous avez effectivement reçu l'argent
          </p>
        </Card>
      </div>
    </div>
  );
}