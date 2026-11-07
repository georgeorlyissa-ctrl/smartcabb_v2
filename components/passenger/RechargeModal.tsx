import { useState } from 'react';
import { motion, AnimatePresence } from '../../lib/motion'; // ✅ FIX: Utiliser l'implémentation locale avec AnimatePresence
import { Button } from '../ui/button';
import {
  ArrowLeft,
  Plus,
  CreditCard,
  DollarSign,
  Gift,
  Check,
  Phone,
  AlertCircle,
  Loader2,
  ChevronRight,
  CheckCircle2,
  Bug,
  Clock
} from '../../lib/icons';
import { convertUSDtoCDF, formatCDF, getExchangeRate } from '../../lib/pricing';
import type { PaymentInitData } from '../../lib/payment-providers/base-provider';
import { useEjpayCheckout } from '../../hooks/useEjpayCheckout';
import { EjpayWaitingModal } from './EjpayWaitingModal';
import { DebugPaymentModal } from '../DebugPaymentModal';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

// Opérateurs Mobile Money (identifiants repris par lib/ejpay-service)
const RECHARGE_NETWORKS = [
  { id: 'orange_money', name: 'Orange Money' },
  { id: 'mpesa', name: 'M-Pesa (Vodacom)' },
  { id: 'airtel_money', name: 'Airtel Money' },
  { id: 'afrimoney', name: 'Afrimoney (Africell)' },
];

// Étapes du processus de paiement
type PaymentStep = 'amount' | 'method' | 'details' | 'confirm' | 'processing' | 'success' | 'error';

interface RechargeModalProps {
  show: boolean;
  onClose: () => void;
  currentBalance: number;
  hasDiscount: boolean;
  discountThreshold: number;
  userEmail: string;
  userName: string;
  userId: string;
  onSuccess: (amount: number, transactionId: string, method: 'mobile_money' | 'cash') => void;
}

export function RechargeModal({
  show,
  onClose,
  currentBalance,
  hasDiscount,
  discountThreshold,
  userEmail,
  userName,
  userId,
  onSuccess
}: RechargeModalProps) {
  const [currentStep, setCurrentStep] = useState<PaymentStep>('amount');
  const [rechargeAmount, setRechargeAmount] = useState<number>(20);
  const [paymentMethod, setPaymentMethod] = useState<'mobile_money' | 'cash'>('mobile_money');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [network, setNetwork] = useState('');
  const [showDebug, setShowDebug] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [transactionId, setTransactionId] = useState('');

  // 💳 Paiement Mobile Money (Ejpay) — attente de validation sur le téléphone
  const ejpay = useEjpayCheckout();
  const [checkoutInfo, setCheckoutInfo] = useState<{
    amount: number;
    msisdn: string;
    operatorName: string;
  } | null>(null);

  const suggestedAmounts = [20, 50, 100, 200];

  const handleClose = () => {
    if (isProcessing) return;
    setCurrentStep('amount');
    setRechargeAmount(20);
    setPhoneNumber('');
    setErrorMessage('');
    setTransactionId('');
    onClose();
  };

  const handleNextStep = () => {
    if (currentStep === 'amount') {
      if (rechargeAmount <= 0) {
        setErrorMessage('Veuillez entrer un montant valide');
        return;
      }
      setCurrentStep('method');
      setErrorMessage('');
    } else if (currentStep === 'method') {
      if (paymentMethod === 'mobile_money') {
        setCurrentStep('details');
      } else {
        // Pour cash, passer directement à la confirmation
        setCurrentStep('confirm');
      }
      setErrorMessage('');
    } else if (currentStep === 'details') {
      // Validation du numéro de téléphone
      if (!phoneNumber || phoneNumber.length < 9) {
        setErrorMessage('Veuillez entrer un numéro de téléphone valide (minimum 9 chiffres)');
        return;
      }
      if (!network) {
        setErrorMessage('Veuillez choisir votre opérateur Mobile Money');
        return;
      }
      // Aller vers la confirmation au lieu d'initier le paiement
      setCurrentStep('confirm');
      setErrorMessage('');
    } else if (currentStep === 'confirm') {
      // C'EST ICI qu'on initie le paiement après confirmation
      handleRecharge();
    }
  };

  const handlePreviousStep = () => {
    if (currentStep === 'method') {
      setCurrentStep('amount');
    } else if (currentStep === 'details') {
      setCurrentStep('method');
    } else if (currentStep === 'confirm') {
      // Retourner à l'étape précédente selon le mode de paiement
      if (paymentMethod === 'mobile_money') {
        setCurrentStep('details');
      } else {
        setCurrentStep('method');
      }
    }
    setErrorMessage('');
  };

  const handleRecharge = async () => {
    setIsProcessing(true);
    setCurrentStep('processing');
    setErrorMessage('');

    try {
      const amountCDF = convertUSDtoCDF(rechargeAmount);

      if (paymentMethod === 'mobile_money') {
        // Mobile Money via Ejpay
        const paymentData: PaymentInitData = {
          amount: amountCDF,
          currency: 'CDF',
          method: 'mobile_money',
          customerEmail: userEmail,
          customerName: userName,
          customerPhone: phoneNumber,
          reference: `WALLET_${Date.now()}_${userId}`,
          description: `Recharge portefeuille SmartCabb - ${rechargeAmount}$ USD`,
          metadata: {
            userId: userId,
            type: 'wallet_recharge',
            amountUSD: rechargeAmount,
            network: network,
          }
        };

        console.log('💳 [EJPAY] Recharge portefeuille:', paymentData);

        if (!network) {
          setCurrentStep('details');
          setErrorMessage('Choisissez votre opérateur Mobile Money');
          setIsProcessing(false);
          return;
        }

        setCheckoutInfo({
          amount: amountCDF,
          msisdn: phoneNumber,
          operatorName: RECHARGE_NETWORKS.find((n) => n.id === network)?.name || network,
        });

        // 💳 Ejpay : la validation se fait sur le téléphone du client
        const outcome = await ejpay.pay(paymentData);

        if (outcome.status === 'completed') {
          setTransactionId(outcome.transactionId || '');
          setIsProcessing(false);
          setCurrentStep('success');
          onSuccess(amountCDF, outcome.transactionId || '', paymentMethod);

          // Fermer le modal après 3 secondes
          setTimeout(() => {
            handleClose();
          }, 3000);
        } else if (outcome.status === 'cancelled') {
          setCurrentStep('details');
          setErrorMessage(outcome.message);
          setIsProcessing(false);
        } else if (outcome.status === 'timeout') {
          setCurrentStep('processing');
          setErrorMessage(outcome.message);
          setIsProcessing(false);
        } else {
          setCurrentStep('error');
          setErrorMessage(outcome.message || 'Le paiement a échoué. Veuillez réessayer.');
          setIsProcessing(false);
        }
      } else {
        // 💵 Paiement en espèces - Créer une demande de recharge dans le KV store
        console.log('💵 Création demande de recharge en espèces...');
        
        try {
          const response = await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/wallet/cash-recharge-request`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${publicAnonKey}`
              },
              body: JSON.stringify({
                userId: userId,
                userName: userName,
                userPhone: phoneNumber || userEmail,
                amount: amountCDF,
                description: `Recharge en espèces de ${formatCDF(amountCDF)} (${rechargeAmount}$ USD) - En attente de validation admin`
              })
            }
          );

          const result = await response.json();

          if (!result.success) {
            throw new Error(result.error || 'Erreur lors de la création de la demande');
          }

          console.log('✅ Demande de recharge créée:', result.transaction);

          const txId = result.transaction.id;
          setTransactionId(txId);
          setIsProcessing(false);
          setCurrentStep('success');
          
          // Appeler onSuccess pour informer le composant parent (optionnel)
          onSuccess(amountCDF, txId, paymentMethod);
          
          // Fermer après 4 secondes pour laisser le temps de lire le message
          setTimeout(() => {
            handleClose();
          }, 4000);
          
        } catch (error: any) {
          console.error('❌ Erreur création demande recharge:', error);
          throw error;
        }
      }
    } catch (error: any) {
      console.error('❌ Erreur recharge:', error);
      setCurrentStep('error');
      setErrorMessage(error.message || 'Une erreur s\'est produite. Veuillez réessayer.');
      setIsProcessing(false);
    }
  };

  const handleRetry = () => {
    setCurrentStep('amount');
    setErrorMessage('');
    setTransactionId('');
  };

  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-6"
        onClick={() => !isProcessing && handleClose()}
      >
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-t-3xl md:rounded-3xl w-full md:max-w-lg max-h-[90vh] overflow-y-auto"
        >
          <div className="p-6">
            {/* 💳 Attente de validation Mobile Money (Ejpay) */}
            <EjpayWaitingModal
              open={ejpay.phase === 'waiting'}
              elapsedMs={ejpay.elapsedMs}
              message={ejpay.message}
              amount={checkoutInfo?.amount}
              msisdn={checkoutInfo?.msisdn}
              operatorName={checkoutInfo?.operatorName}
              onCancel={() => ejpay.cancel()}
            />

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl text-foreground">
                {currentStep === 'amount' && 'Montant de recharge'}
                {currentStep === 'method' && 'Méthode de paiement'}
                {currentStep === 'details' && 'Informations de paiement'}
                {currentStep === 'confirm' && 'Confirmer le paiement'}
                {currentStep === 'processing' && 'Traitement en cours'}
                {currentStep === 'success' && 'Recharge réussie !'}
                {currentStep === 'error' && 'Erreur'}
              </h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => !isProcessing && handleClose()}
                disabled={isProcessing}
                className="w-8 h-8"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </div>

            {/* Progress Steps */}
            {!['success', 'error', 'processing'].includes(currentStep) && (
              <div className="flex items-center justify-center mb-8 gap-2">
                {['amount', 'method', 'details'].map((step, index) => {
                  const isActive = step === currentStep;
                  const isPassed = ['amount', 'method', 'details'].indexOf(currentStep) > index;
                  const isVisible = step !== 'details' || paymentMethod === 'mobile_money';
                  
                  if (!isVisible) return null;
                  
                  return (
                    <div key={step} className="flex items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                        isPassed ? 'bg-green-500 text-white' :
                        isActive ? 'bg-secondary text-white' :
                        'bg-gray-200 text-gray-400'
                      }`}>
                        {isPassed ? <Check className="w-5 h-5" /> : index + 1}
                      </div>
                      {step !== 'details' && (
                        <div className={`w-12 h-1 mx-1 transition-all ${
                          isPassed ? 'bg-green-500' :
                          isActive ? 'bg-secondary/30' :
                          'bg-gray-200'
                        }`} />
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Step Content */}
            <AnimatePresence mode="wait">
              {/* STEP 1: Amount */}
              {currentStep === 'amount' && (
                <motion.div
                  key="amount"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  {/* Suggested Amounts */}
                  <div className="mb-6">
                    <p className="text-sm text-muted-foreground mb-3">Montants suggérés (USD)</p>
                    <div className="grid grid-cols-4 gap-2">
                      {suggestedAmounts.map((amount) => (
                        <button
                          key={amount}
                          onClick={() => setRechargeAmount(amount)}
                          className={`p-3 rounded-xl border-2 transition-all ${
                            rechargeAmount === amount
                              ? 'border-secondary bg-secondary/5 shadow-sm'
                              : 'border-border hover:border-secondary/50'
                          }`}
                        >
                          <p className="font-semibold text-foreground">{amount}$</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Amount */}
                  <div className="mb-6">
                    <label className="text-sm text-muted-foreground mb-2 block">
                      Ou entrez un montant personnalisé (USD)
                    </label>
                    <input
                      type="number"
                      value={rechargeAmount}
                      onChange={(e) => setRechargeAmount(Number(e.target.value))}
                      className="w-full p-3 rounded-xl border-2 border-border focus:border-secondary focus:outline-none"
                      placeholder="Montant en USD"
                      min="1"
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      ≈ {formatCDF(convertUSDtoCDF(rechargeAmount))}
                    </p>
                  </div>

                  {/* Discount Info */}
                  {rechargeAmount >= 20 && !hasDiscount && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 mb-6"
                    >
                      <div className="flex items-start gap-3">
                        <Gift className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-amber-900 text-sm mb-1">
                            🎉 Félicitations ! Vous débloquez la réduction de 5%
                          </p>
                          <p className="text-xs text-amber-700">
                            Avec cette recharge, vous bénéficierez de 5% de réduction sur toutes vos prochaines courses !
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )}

              {/* STEP 2: Payment Method */}
              {currentStep === 'method' && (
                <motion.div
                  key="method"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-3"
                >
                  <p className="text-sm text-muted-foreground mb-3">Choisissez votre méthode de paiement</p>
                  
                  <button
                    onClick={() => setPaymentMethod('mobile_money')}
                    className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${
                      paymentMethod === 'mobile_money'
                        ? 'border-secondary bg-secondary/5 shadow-sm'
                        : 'border-border hover:border-secondary/50'
                    }`}
                  >
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <CreditCard className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="text-left flex-1">
                      <p className="font-semibold text-foreground">Mobile Money</p>
                      <p className="text-xs text-muted-foreground">M-Pesa, Airtel Money, Orange Money</p>
                      <p className="text-xs text-green-600 mt-1">✨ Instantané et sécurisé via Mobile Money</p>
                    </div>
                    {paymentMethod === 'mobile_money' && (
                      <div className="w-6 h-6 bg-secondary rounded-full flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </button>

                  <button
                    onClick={() => setPaymentMethod('cash')}
                    className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${
                      paymentMethod === 'cash'
                        ? 'border-secondary bg-secondary/5 shadow-sm'
                        : 'border-border hover:border-secondary/50'
                    }`}
                  >
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <DollarSign className="w-6 h-6 text-green-600" />
                    </div>
                    <div className="text-left flex-1">
                      <p className="font-semibold text-foreground">Espèces</p>
                      <p className="text-xs text-muted-foreground">Paiement en espèces à un agent SmartCabb</p>
                    </div>
                    {paymentMethod === 'cash' && (
                      <div className="w-6 h-6 bg-secondary rounded-full flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </button>
                </motion.div>
              )}

              {/* STEP 3: Payment Details (Mobile Money only) */}
              {currentStep === 'details' && (
                <motion.div
                  key="details"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <Phone className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-blue-900 text-sm mb-1">
                          Numéro de téléphone Mobile Money
                        </p>
                        <p className="text-xs text-blue-700">
                          Entrez le numéro de téléphone associé à votre compte M-Pesa, Airtel Money ou Orange Money
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mb-6">
                    <label className="text-sm text-muted-foreground mb-2 block">
                      Opérateur Mobile Money
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {RECHARGE_NETWORKS.map((op) => (
                        <button
                          key={op.id}
                          type="button"
                          onClick={() => setNetwork(op.id)}
                          className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                            network === op.id
                              ? 'border-secondary bg-secondary/5 shadow-sm text-foreground'
                              : 'border-border hover:border-secondary/50 text-muted-foreground'
                          }`}
                        >
                          {op.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mb-6">
                    <label className="text-sm text-muted-foreground mb-2 block">
                      Numéro de téléphone
                    </label>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="w-full p-3 rounded-xl border-2 border-border focus:border-secondary focus:outline-none"
                      placeholder="Ex: 0810000000"
                      minLength={9}
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      Le numéro doit contenir au moins 9 chiffres
                    </p>
                  </div>

                  {/* Summary */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-sm text-muted-foreground mb-2">Récapitulatif</p>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-sm text-foreground">Montant:</span>
                        <span className="text-sm font-semibold text-foreground">
                          {rechargeAmount}$ USD ({formatCDF(convertUSDtoCDF(rechargeAmount))})
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-foreground">Méthode:</span>
                        <span className="text-sm font-semibold text-foreground">Mobile Money</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* STEP 4: Confirm Payment */}
              {currentStep === 'confirm' && (
                <motion.div
                  key="confirm"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="space-y-6"
                >
                  {/* Confirmation Banner */}
                  <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-6 h-6 text-orange-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-orange-900 mb-1">
                          Confirmation de paiement
                        </p>
                        <p className="text-sm text-orange-700">
                          Vérifiez les détails avant de confirmer votre recharge
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Récapitulatif Détaillé */}
                  <div className="bg-white border-2 border-gray-200 rounded-xl p-6 space-y-4">
                    <h3 className="font-semibold text-lg text-foreground mb-4">Détails de la recharge</h3>
                    
                    {/* Montant */}
                    <div className="flex justify-between items-center pb-3 border-b">
                      <span className="text-muted-foreground">Montant à recharger</span>
                      <div className="text-right">
                        <p className="font-bold text-lg text-foreground">{rechargeAmount}$ USD</p>
                        <p className="text-sm text-muted-foreground">≈ {formatCDF(convertUSDtoCDF(rechargeAmount))}</p>
                      </div>
                    </div>

                    {/* Méthode de paiement */}
                    <div className="flex justify-between items-center pb-3 border-b">
                      <span className="text-muted-foreground">Méthode de paiement</span>
                      <div className="flex items-center gap-2">
                        {paymentMethod === 'mobile_money' ? (
                          <>
                            <CreditCard className="w-4 h-4 text-blue-600" />
                            <span className="font-semibold text-foreground">Mobile Money</span>
                          </>
                        ) : (
                          <>
                            <DollarSign className="w-4 h-4 text-green-600" />
                            <span className="font-semibold text-foreground">Espèces</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Numéro de téléphone (si Mobile Money) */}
                    {paymentMethod === 'mobile_money' && (
                      <>
                        <div className="flex justify-between items-center pb-3 border-b">
                          <span className="text-muted-foreground">Opérateur</span>
                          <span className="font-semibold text-foreground">
                            {RECHARGE_NETWORKS.find((n) => n.id === network)?.name || '—'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center pb-3 border-b">
                          <span className="text-muted-foreground">Numéro Mobile Money</span>
                          <span className="font-semibold text-foreground">{phoneNumber}</span>
                        </div>
                      </>
                    )}

                    {/* Nouveau solde après recharge */}
                    <div className="flex justify-between items-center pt-2">
                      <span className="text-muted-foreground">
                        {paymentMethod === 'cash' ? 'Solde après validation' : 'Nouveau solde estimé'}
                      </span>
                      <div className="text-right">
                        <p className="font-bold text-lg text-green-600">
                          {formatCDF(currentBalance + convertUSDtoCDF(rechargeAmount))}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Solde actuel: {formatCDF(currentBalance)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Avantage réduction si applicable */}
                  {rechargeAmount >= 20 && !hasDiscount && (
                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <Gift className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-amber-900 text-sm mb-1">
                            🎉 Bonus: Réduction de 5% activée !
                          </p>
                          <p className="text-xs text-amber-700">
                            Vous bénéficierez de 5% de réduction sur toutes vos courses
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Note importante pour les paiements espèces */}
                  {paymentMethod === 'cash' && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-blue-900 text-sm mb-1">
                            📝 Note: Rendez-vous chez un agent SmartCabb pour effectuer le paiement en espèces.
                          </p>
                          <p className="text-xs text-blue-700">
                            Votre solde sera mis à jour après validation par l'administrateur.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* STEP 5: Processing */}
              {currentStep === 'processing' && (
                <motion.div
                  key="processing"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="py-8 text-center"
                >
                  <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                  </div>
                  <h3 className="text-xl mb-2 text-foreground">Traitement en cours...</h3>
                  <p className="text-muted-foreground mb-4">
                    {paymentMethod === 'mobile_money'
                      ? 'Validez la demande de paiement reçue sur votre téléphone (code secret Mobile Money).'
                      : 'Veuillez patienter pendant que nous traitons votre paiement.'}
                  </p>
                  {paymentMethod === 'mobile_money' && (
                    <p className="text-sm text-muted-foreground">
                      Une fois le paiement effectué, votre portefeuille sera automatiquement mis à jour.
                    </p>
                  )}
                </motion.div>
              )}

              {/* STEP 6: Success */}
              {currentStep === 'success' && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="py-8 text-center"
                >
                  <div className={`w-20 h-20 ${paymentMethod === 'cash' ? 'bg-orange-100' : 'bg-green-100'} rounded-full flex items-center justify-center mx-auto mb-6`}>
                    {paymentMethod === 'cash' ? (
                      <Clock className="w-10 h-10 text-orange-600" />
                    ) : (
                      <CheckCircle2 className="w-10 h-10 text-green-600" />
                    )}
                  </div>
                  <h3 className="text-2xl mb-2 text-foreground">
                    {paymentMethod === 'cash' ? 'Demande enregistrée !' : 'Recharge réussie !'}
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    {paymentMethod === 'cash' 
                      ? 'Votre demande de recharge a été enregistrée. Rendez-vous chez un agent SmartCabb pour effectuer le paiement.'
                      : 'Votre portefeuille a été rechargé avec succès'
                    }
                  </p>
                  <div className={`bg-gradient-to-r ${paymentMethod === 'cash' ? 'from-orange-50 to-amber-50 border border-orange-200' : 'from-secondary/10 to-primary/10'} rounded-xl p-4`}>
                    <p className="text-sm text-muted-foreground mb-1">Montant {paymentMethod === 'cash' ? 'demandé' : 'rechargé'}</p>
                    <p className={`text-2xl font-bold ${paymentMethod === 'cash' ? 'text-orange-600' : 'text-primary'} mb-2`}>
                      {formatCDF(convertUSDtoCDF(rechargeAmount))}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      ID Transaction: {transactionId.substring(0, 20)}...
                    </p>
                  </div>
                  {paymentMethod === 'cash' && (
                    <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4">
                      <p className="text-sm text-blue-800">
                        <strong>ℹ️ Prochaine étape:</strong> Rendez-vous chez un agent SmartCabb avec cette référence pour effectuer le paiement. Votre solde sera mis à jour après validation.
                      </p>
                    </div>
                  )}
                </motion.div>
              )}

              {/* STEP 7: Error */}
              {currentStep === 'error' && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="py-8 text-center"
                >
                  <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <AlertCircle className="w-10 h-10 text-red-600" />
                  </div>
                  <h3 className="text-2xl mb-2 text-foreground">Erreur de paiement</h3>
                  <p className="text-muted-foreground mb-6">{errorMessage}</p>
                  <Button
                    onClick={handleRetry}
                    className="bg-gradient-to-r from-secondary to-primary hover:from-secondary/90 hover:to-primary/90 text-white rounded-xl h-12 px-8"
                  >
                    Réessayer
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error Message (for form steps) */}
            {errorMessage && !['processing', 'success', 'error'].includes(currentStep) && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{errorMessage}</p>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            {!['processing', 'success', 'error'].includes(currentStep) && (
              <div className="flex items-center gap-3 mt-6">
                {currentStep !== 'amount' && (
                  <Button
                    onClick={handlePreviousStep}
                    disabled={isProcessing}
                    variant="outline"
                    className="flex-1 h-12 rounded-xl"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Précédent
                  </Button>
                )}
                <Button
                  onClick={handleNextStep}
                  disabled={isProcessing}
                  className="flex-1 bg-gradient-to-r from-secondary to-primary hover:from-secondary/90 hover:to-primary/90 text-white rounded-xl h-12 shadow-lg"
                >
                  {currentStep === 'confirm' 
                    ? 'Confirmer et Payer' 
                    : currentStep === 'details' || (currentStep === 'method' && paymentMethod === 'cash')
                      ? 'Continuer'
                      : 'Suivant'}
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}