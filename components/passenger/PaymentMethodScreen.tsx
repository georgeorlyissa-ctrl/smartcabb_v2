import { motion } from '../../lib/motion'; // ✅ FIX: Utiliser l'implémentation locale
import { useState } from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { useAppState } from '../../hooks/useAppState';
import { getExchangeRate } from '../../lib/pricing';
import { CurrencySelector } from '../CurrencySelector';
import { MixedPaymentSelector } from '../MixedPaymentSelector';
import { 
  ArrowLeft, 
  Smartphone, 
  Banknote,
  Check,
  Shield,
  Clock,
  CreditCard,
  Calculator,
  Building2,
  Wallet
} from '../../lib/icons';
import { toast } from '../../lib/toast';

export function PaymentMethodScreen() {
  const { setCurrentScreen, updateRide, state, createRide } = useAppState();
  const [selectedMethod, setSelectedMethod] = useState<'flutterwave' | 'cash' | 'mixed' | 'wallet' | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<'USD' | 'CDF'>('CDF');
  const [cashAmount, setCashAmount] = useState(0);
  const [mobileMoneyAmount, setMobileMoneyAmount] = useState(0);
  
  // Exchange rate - readonly from admin settings (source fiable)
  const exchangeRate = getExchangeRate();
  
  // ✅ NOUVEAU : Récupérer le solde du passager
  const userBalance = state.currentUser?.balance || 0;
  const ridePrice = state.currentRide?.estimatedPrice || 12500;
  const hasSufficientBalance = userBalance >= ridePrice;

  console.log('💳 PaymentMethodScreen rendered with state:', {
    hasCurrentRide: !!state.currentRide,
    rideId: state.currentRide?.id,
    estimatedPrice: state.currentRide?.estimatedPrice
  });

  // Protection: Si pas de course, retourner à l'estimation
  if (!state.currentRide) {
    console.warn('⚠️ PaymentMethodScreen: Pas de course en cours, redirection vers estimate');
    setTimeout(() => setCurrentScreen('estimate'), 100);
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  const paymentMethods = [
    {
      id: 'flutterwave' as const,
      title: 'Flutterwave',
      subtitle: 'Carte bancaire, Mobile Money',
      description: 'Paiement en ligne sécurisé',
      icon: CreditCard,
      color: 'bg-blue-600',
      borderColor: 'border-blue-200',
      bgColor: 'bg-blue-50',
      features: ['Carte Visa/Mastercard', 'Mobile Money', 'Paiement sécurisé']
    },
    {
      id: 'cash' as const,
      title: 'Espèces',
      subtitle: 'Paiement au chauffeur',
      description: 'Payez directement en espèces',
      icon: Banknote,
      color: 'bg-orange-500',
      borderColor: 'border-orange-200',
      bgColor: 'bg-orange-50',
      features: ['Paiement direct', 'USD ou CDF', 'Reçu papier']
    },
    {
      id: 'mixed' as const,
      title: 'Paiement mixte',
      subtitle: 'Espèces + Flutterwave',
      description: 'Combinez espèces et paiement en ligne',
      icon: Calculator,
      color: 'bg-purple-500',
      borderColor: 'border-purple-200',
      bgColor: 'bg-purple-50',
      features: ['Flexible', 'Répartition personnalisée', 'Sécurisé']
    },
    {
      id: 'wallet' as const,
      title: 'Portefeuille',
      subtitle: 'Solde du passager',
      description: 'Payer avec votre solde de portefeuille',
      icon: Wallet,
      color: 'bg-green-500',
      borderColor: 'border-green-200',
      bgColor: 'bg-green-50',
      features: ['Rapide', 'Sécurisé', 'Solde disponible']
    }
  ];

  const handleConfirmPayment = () => {
    if (!selectedMethod) return;

    // Calculer le montant en devise sélectionnée
    const basePrice = state.currentRide?.estimatedPrice || 12500;
    const priceInSelectedCurrency = selectedCurrency === 'USD' 
      ? basePrice / exchangeRate 
      : basePrice;

    const paymentDetails = {
      currency: selectedCurrency,
      exchangeRate: exchangeRate,
      ...(selectedMethod === 'mixed' && {
        cashAmount: selectedCurrency === 'USD' ? cashAmount : cashAmount * exchangeRate,
        mobileMoneyAmount: selectedCurrency === 'USD' ? mobileMoneyAmount : mobileMoneyAmount * exchangeRate
      })
    };

    // Vérifier si une course existe déjà depuis l'écran d'estimation
    if (state.currentRide?.id) {
      console.log('Updating existing ride with payment method:', selectedMethod);
      
      // Mettre à jour la course existante avec la méthode de paiement
      if (updateRide) {
        updateRide(state.currentRide.id, {
          paymentMethod: selectedMethod === 'flutterwave' ? 'mobile_money' : selectedMethod,
          paymentDetails: paymentDetails,
          estimatedPrice: selectedCurrency === 'USD' ? priceInSelectedCurrency * exchangeRate : priceInSelectedCurrency
        });
      }
      
      toast.success('Méthode de paiement confirmée ! Recherche d\'un chauffeur...');
    } else {
      console.log('No existing ride found, creating new ride');
      
      // Si aucune course n'existe, en créer une nouvelle
      const passengerId = state.currentUser?.id || 'user1';
      
      // ✅ CORRECTION : Utiliser les vraies adresses saisies par l'utilisateur
      const pickupLocation = state.pickup;
      const destinationLocation = state.destination;
      
      // Validation des adresses
      if (!pickupLocation || !destinationLocation) {
        console.error('❌ Adresses manquantes:', { pickup: pickupLocation, destination: destinationLocation });
        toast.error('Erreur: Adresses de départ/arrivée manquantes');
        return;
      }
      
      if (createRide) {
        createRide({
          passengerId,
          pickup: pickupLocation,
          destination: destinationLocation,
          status: 'pending',
          estimatedPrice: selectedCurrency === 'USD' ? priceInSelectedCurrency * exchangeRate : priceInSelectedCurrency,
          estimatedDuration: 15,
          vehicleType: 'smart_standard',
          paymentMethod: selectedMethod === 'flutterwave' ? 'mobile_money' : selectedMethod,
          paymentDetails: paymentDetails,
          driverId: null
        });
        
        toast.success('Course créée ! Recherche d\'un chauffeur...');
      } else {
        console.error('createRide function not available');
        toast.error('Erreur: impossible de créer la course');
        return;
      }
    }

    // Rediriger vers le suivi de course
    setCurrentScreen('ride-tracking');
  };

  // ✅ NOUVEAU : Gérer le clic direct sur un mode de paiement
  const handlePaymentMethodClick = (methodId: 'flutterwave' | 'cash' | 'mixed' | 'wallet') => {
    // Sélectionner le mode
    setSelectedMethod(methodId);
    
    // Afficher un feedback visuel
    toast.info(`Mode sélectionné : ${paymentMethods.find(m => m.id === methodId)?.title}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentScreen('estimate')}
              className="p-2"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl">Mode de paiement</h1>
              <p className="text-sm text-gray-600">Choisissez votre méthode de paiement préférée</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4">
        {/* Sélection de devise */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <CurrencySelector
            onCurrencySelect={setSelectedCurrency}
            selectedCurrency={selectedCurrency}
            exchangeRate={exchangeRate}
            amount={state.currentRide?.estimatedPrice || 12500}
          />
        </motion.div>

        {/* Résumé de la course */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Montant estimé</p>
                <p className="text-2xl font-bold text-green-600">
                  {selectedCurrency === 'USD' 
                    ? `${((state.currentRide?.estimatedPrice || 12500) / exchangeRate).toFixed(2)}`
                    : `${(state.currentRide?.estimatedPrice || 12500).toLocaleString()} CDF`
                  }
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Durée estimée</p>
                <p className="text-lg font-semibold">
                  {state.currentRide?.estimatedDuration || 15} min
                </p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Méthodes de paiement */}
        <div className="space-y-4 mb-6">
          {paymentMethods.map((method, index) => {
            const Icon = method.icon;
            const isSelected = selectedMethod === method.id;
            
            // ✅ NOUVEAU : Désactiver wallet si solde insuffisant
            const isWalletDisabled = method.id === 'wallet' && !hasSufficientBalance;
            
            return (
              <motion.div
                key={method.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: (index + 1) * 0.1 }}
              >
                <Card 
                  className={`p-4 cursor-pointer transition-all ${
                    isWalletDisabled
                      ? 'opacity-50 cursor-not-allowed bg-gray-100'
                      : isSelected 
                        ? `${method.borderColor} border-2 ${method.bgColor}` 
                        : 'border border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => !isWalletDisabled && handlePaymentMethodClick(method.id)}
                >
                  <div className="flex items-start space-x-4">
                    <div className={`w-12 h-12 ${isWalletDisabled ? 'bg-gray-400' : method.color} rounded-full flex items-center justify-center`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h3 className={`font-semibold ${isWalletDisabled ? 'text-gray-500' : ''}`}>
                            {method.title}
                          </h3>
                          <p className="text-sm text-gray-600">{method.subtitle}</p>
                          
                          {/* ✅ AFFICHER LE SOLDE POUR WALLET */}
                          {method.id === 'wallet' && (
                            <div className="mt-1">
                              <p className={`text-sm font-semibold ${hasSufficientBalance ? 'text-green-600' : 'text-red-600'}`}>
                                Solde: {userBalance.toLocaleString()} CDF
                              </p>
                              {!hasSufficientBalance && (
                                <p className="text-xs text-red-500 mt-1">
                                  ⚠️ Solde insuffisant (manque {(ridePrice - userBalance).toLocaleString()} CDF)
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                        {isSelected && !isWalletDisabled && (
                          <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </div>
                      
                      <p className={`text-sm mb-3 ${isWalletDisabled ? 'text-gray-500' : 'text-gray-700'}`}>
                        {method.description}
                      </p>
                      
                      <div className="flex flex-wrap gap-2">
                        {method.features.map((feature, featureIndex) => (
                          <span 
                            key={featureIndex}
                            className={`text-xs px-2 py-1 rounded-full ${
                              isWalletDisabled ? 'bg-gray-200 text-gray-500' : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Configuration paiement mixte */}
        {selectedMethod === 'mixed' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <MixedPaymentSelector
              totalAmount={selectedCurrency === 'USD' 
                ? (state.currentRide?.estimatedPrice || 12500) / exchangeRate
                : state.currentRide?.estimatedPrice || 12500
              }
              currency={selectedCurrency}
              onPaymentSplit={(cash, mobile) => {
                setCashAmount(cash);
                setMobileMoneyAmount(mobile);
              }}
              cashAmount={cashAmount}
              mobileMoneyAmount={mobileMoneyAmount}
            />
          </motion.div>
        )}

        {/* Informations de sécurité */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="p-4 mb-6 bg-blue-50 border-blue-200">
            <div className="flex items-start space-x-3">
              <Shield className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-800 mb-1">Paiement sécurisé</h3>
                <p className="text-sm text-blue-700">
                  Toutes vos transactions sont protégées et cryptées. 
                  SmartCabb ne stocke jamais vos informations bancaires.
                </p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Note sur le timing */}
        {(selectedMethod === 'cash' || selectedMethod === 'mixed') && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="p-4 mb-6 bg-orange-50 border-orange-200">
              <div className="flex items-start space-x-3">
                <Clock className="w-6 h-6 text-orange-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-orange-800 mb-1">
                    {selectedMethod === 'mixed' ? 'Paiement mixte' : 'Paiement en espèces'}
                  </h3>
                  <p className="text-sm text-orange-700">
                    {selectedMethod === 'mixed' 
                      ? 'Préparez le montant en espèces. Le solde sera payé par Flutterwave au moment de la course.'
                      : 'Assurez-vous d\'avoir le montant exact. Le chauffeur peut avoir une capacité limitée pour rendre la monnaie.'
                    }
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Bouton de confirmation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Button 
            onClick={handleConfirmPayment}
            disabled={!selectedMethod}
            className="w-full py-3"
            size="lg"
          >
            {selectedMethod ? (
              `Confirmer avec ${paymentMethods.find(m => m.id === selectedMethod)?.title}`
            ) : (
              'Sélectionnez une méthode de paiement'
            )}
          </Button>
        </motion.div>
      </div>
    </div>
  );
}