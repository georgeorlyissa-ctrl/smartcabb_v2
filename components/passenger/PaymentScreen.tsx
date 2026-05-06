import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from '../../lib/motion';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import {
  Wallet, Banknote, Smartphone, CreditCard, Split,
  X, CheckCircle, AlertCircle, Clock, DollarSign,
  Loader2, Phone
} from '../../lib/icons';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { useAppState } from '../../hooks/useAppState';
import { useTranslation } from '../../hooks/useTranslation';
import { toast } from '../../lib/toast';
import { paymentService } from '../../lib/payment-service';
import type { PaymentInitData } from '../../lib/payment-providers/base-provider';
import { VodacomMpesaLogo, OrangeMoneyLogo, AirtelMoneyLogo, AfrimoneyLogo } from '../mobile-money-logos';

// ─── Réseaux Mobile Money ─────────────────────────────────────
const MOBILE_MONEY_NETWORKS = [
  {
    id: 'orange_money',
    name: 'Orange Money',
    code: '*144#',
    shortcode: '144',
    color: 'bg-orange-500',
    LogoComponent: OrangeMoneyLogo
  },
  {
    id: 'mpesa',
    name: 'M-Pesa (Vodacom)',
    code: '*150#',
    shortcode: '150',
    color: 'bg-red-500',
    LogoComponent: VodacomMpesaLogo
  },
  {
    id: 'airtel_money',
    name: 'Airtel Money',
    code: '*501#',
    shortcode: '501',
    color: 'bg-red-600',
    LogoComponent: AirtelMoneyLogo
  },
  {
    id: 'afrimoney',
    name: 'Afrimoney (Africell)',
    code: '*555#',
    shortcode: '555',
    color: 'bg-blue-600',
    LogoComponent: AfrimoneyLogo
  }
];

export function PaymentScreen() {
  const { state, setCurrentScreen } = useAppState();
  const { t } = useTranslation();

  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedNetwork, setSelectedNetwork] = useState<typeof MOBILE_MONEY_NETWORKS[0] | null>(null);
  const [fullName, setFullName] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cashCollected, setCashCollected] = useState(false);

  // États paiement mixte
  const [cashAmount, setCashAmount] = useState<string>('');
  const [mixedPhoneNumber, setMixedPhoneNumber] = useState('');
  const [mixedNetwork, setMixedNetwork] = useState<typeof MOBILE_MONEY_NETWORKS[0] | null>(null);

  // Modaux
  const [showNetworkSelection, setShowNetworkSelection] = useState(false);
  const [showMobileMoneyModal, setShowMobileMoneyModal] = useState(false);
  const [showMixedPaymentModal, setShowMixedPaymentModal] = useState(false);

  // Polling durée
  const [isLoadingDuration, setIsLoadingDuration] = useState(false);

  const currentRide = state.currentRide;
  const currentUser = state.currentUser;

  // ─── Calculs ─────────────────────────────────────────────────
  const distance = currentRide?.distanceKm || currentRide?.distance || 0;
  const durationInSeconds = currentRide?.duration || currentRide?.billingElapsedTime || 0;
  const safeDistance = isNaN(distance) || distance < 0 ? 0 : distance;
  const safeDuration = isNaN(durationInSeconds) || durationInSeconds < 0 ? 0 : durationInSeconds;

  const formatDuration = (seconds: number | undefined): string => {
    if (seconds === undefined || seconds === null || isNaN(seconds) || seconds < 0) return '0min';
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (secs > 0) return `${minutes}min ${secs}s`;
    return `${minutes}min`;
  };

  // ─── Polling durée si = 0 ────────────────────────────────────
  useEffect(() => {
    if (!currentRide?.id || durationInSeconds > 0) return;

    console.log('⚠️ PaymentScreen - Durée à 0, démarrage du polling...');
    setIsLoadingDuration(true);

    const fetchDuration = async () => {
      try {
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/rides/status/${currentRide.id}`,
          {
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (response.ok) {
          const data = await response.json();
          const retrievedDuration = data.ride?.duration || data.ride?.billingElapsedTime || 0;

          if (data.ride && retrievedDuration > 0) {
            console.log('✅ PaymentScreen - Durée récupérée:', retrievedDuration);
            if (state.updateRide) {
              state.updateRide(currentRide.id, {
                duration: retrievedDuration,
                billingElapsedTime: retrievedDuration,
                distance: data.ride.distance || currentRide.distance,
                finalPrice: data.ride.finalPrice || currentRide.estimatedPrice
              });
            }
            setIsLoadingDuration(false);
          }
        }
      } catch (error) {
        console.error('❌ Erreur récupération durée:', error);
      }
    };

    fetchDuration();
    const interval = setInterval(fetchDuration, 2000);
    const timeout = setTimeout(() => {
      clearInterval(interval);
      setIsLoadingDuration(false);
      console.warn('⚠️ Timeout polling durée');
    }, 30000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [currentRide?.id, durationInSeconds, state.updateRide]);

  const ridePrice = currentRide?.estimatedPrice || 0;
  const userBalance = currentUser?.walletBalance || currentUser?.balance || 0;
  const cashAmountNum = parseFloat(cashAmount) || 0;
  const mobileMoneyAmount = ridePrice - cashAmountNum;

  console.log('💳 PaymentScreen - Données:', {
    distance, durationInSeconds, ridePrice, userBalance
  });

  if (!currentRide) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-6">
          {/* ✅ TRADUIT */}
          <p>{t('error')}</p>
        </Card>
      </div>
    );
  }

  // ─── Finaliser la course ──────────────────────────────────────
  const completeRide = async (
    paymentMethodUsed: string,
    transactionId?: string,
    cashPart?: number,
    mobilePart?: number
  ) => {
    try {
      console.log('🏁 Finalisation de la course:', { rideId: currentRide.id, method: paymentMethodUsed });

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/rides/complete`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            rideId: currentRide.id,
            driverId: currentRide.driverId,
            passengerId: currentUser?.id,
            actualCost: ridePrice,
            totalCost: ridePrice,
            paymentMethod: paymentMethodUsed,
            paymentTransactionId: transactionId,
            cashAmount: cashPart,
            mobileMoneyAmount: mobilePart,
            driverEarnings: Math.round(ridePrice * 0.85),
            duration: durationInSeconds || 0,
            distance: distance || 0
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Erreur backend finalisation:', errorData);
        throw new Error(errorData.error || t('error'));
      }

      const data = await response.json();
      console.log('✅ Course finalisée:', data);

      // Recharger le solde si paiement wallet
      if (paymentMethodUsed === 'wallet' && currentUser?.id) {
        try {
          const balanceResponse = await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/wallet/passenger-balance/${currentUser.id}`,
            {
              headers: {
                'Authorization': `Bearer ${publicAnonKey}`,
                'Content-Type': 'application/json'
              }
            }
          );
          if (balanceResponse.ok) {
            const balanceData = await balanceResponse.json();
            const newBalance = balanceData.balance || 0;
            if (state.updateUser) {
              state.updateUser({
                ...currentUser,
                walletBalance: newBalance,
                balance: newBalance
              });
            }
          }
        } catch (error) {
          console.error('Erreur rechargement solde:', error);
        }
      }

      if (state.updateRide) {
        state.updateRide(currentRide.id, {
          paymentStatus: 'paid',
          paymentMethod: paymentMethodUsed,
          status: 'completed'
        });
      }

      return true;
    } catch (error) {
      console.error('❌ Erreur completeRide:', error);
      throw error;
    }
  };

  // ─── Paiement Mixte ───────────────────────────────────────────
  const handleMixedPayment = async () => {
    if (!cashAmount || cashAmountNum <= 0) {
      toast.error(t('error')); return;
    }
    if (cashAmountNum >= ridePrice) {
      toast.error(t('error')); return;
    }
    if (!mixedNetwork) {
      toast.error(t('error')); return;
    }
    if (!mixedPhoneNumber || mixedPhoneNumber.length < 9) {
      toast.error(t('error')); return;
    }

    setIsProcessing(true);

    try {
      const paymentData: PaymentInitData = {
        amount: mobileMoneyAmount,
        currency: 'CDF',
        method: 'mobile_money',
        customerEmail: currentUser?.email || 'passager@smartcabb.com',
        customerName: currentUser?.name || currentUser?.full_name || 'Passager',
        customerPhone: mixedPhoneNumber,
        reference: `RIDE_MIXED_${currentRide.id}_${Date.now()}`,
        description: `${t('payment_method')} SmartCabb #${currentRide.id} (${mobileMoneyAmount.toLocaleString()} ${t('cdf')} via ${mixedNetwork.name})`,
        rideId: currentRide.id,
        passengerId: currentUser?.id,
        driverId: currentRide.driverId,
        metadata: {
          type: 'ride_payment_mixed',
          cashAmount: cashAmountNum,
          mobileMoneyAmount,
          network: mixedNetwork.id,
          networkName: mixedNetwork.name
        }
      };

      const result = await paymentService.initPayment(paymentData);

      if (result.success && result.paymentUrl) {
        setShowMixedPaymentModal(false);

        const width = 500, height = 700;
        const left = (window.screen.width - width) / 2;
        const top = (window.screen.height - height) / 2;

        const paymentWindow = window.open(
          result.paymentUrl,
          'FlutterwavePayment',
          `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
        );

        if (!paymentWindow) {
          toast.error(t('error'));
          setIsProcessing(false);
          return;
        }

        const checkPaymentStatus = async () => {
          if (!result.transactionId) return false;
          try {
            const verification = await paymentService.verifyPayment(result.transactionId);
            if (verification.isValid && (verification.status === 'successful' || verification.status === 'completed')) {
              await completeRide('mixed', result.transactionId, cashAmountNum, mobileMoneyAmount);
              // ✅ TRADUIT
              toast.success(t('payment_successful'));
              setIsProcessing(false);
              if (paymentWindow && !paymentWindow.closed) paymentWindow.close();
              setTimeout(() => { setCurrentScreen('rating'); }, 1500);
              return true;
            } else if (verification.status === 'failed') {
              toast.error(t('error'));
              setIsProcessing(false);
              if (paymentWindow && !paymentWindow.closed) paymentWindow.close();
              return true;
            }
            return false;
          } catch { return false; }
        };

        let attempts = 0;
        const intervalId = setInterval(async () => {
          attempts++;
          if (paymentWindow.closed) {
            clearInterval(intervalId);
            const finalCheck = await checkPaymentStatus();
            if (!finalCheck) {
              let extraAttempts = 0;
              const extraInterval = setInterval(async () => {
                extraAttempts++;
                if (extraAttempts >= 15) { clearInterval(extraInterval); setIsProcessing(false); return; }
                const status = await checkPaymentStatus();
                if (status) clearInterval(extraInterval);
              }, 2000);
            }
            return;
          }
          const isDone = await checkPaymentStatus();
          if (isDone) clearInterval(intervalId);
          if (attempts >= 60) {
            clearInterval(intervalId);
            toast.error(t('error'));
            setIsProcessing(false);
            if (paymentWindow && !paymentWindow.closed) paymentWindow.close();
          }
        }, 2000);
      } else {
        throw new Error(result.error || result.message || t('error'));
      }
    } catch (error) {
      console.error('❌ Erreur paiement mixte:', error);
      toast.error(error instanceof Error ? error.message : t('error'));
      setIsProcessing(false);
    }
  };

  // ─── Paiement Mobile Money ────────────────────────────────────
  const handleMobileMoneyPayment = async () => {
    if (!selectedNetwork) { toast.error(t('error')); return; }
    if (!phoneNumber || phoneNumber.length < 9) { toast.error(t('error')); return; }

    setIsProcessing(true);

    try {
      const paymentData: PaymentInitData = {
        amount: ridePrice,
        currency: 'CDF',
        method: 'mobile_money',
        customerEmail: currentUser?.email || 'passager@smartcabb.com',
        customerName: currentUser?.name || currentUser?.full_name || 'Passager',
        customerPhone: phoneNumber,
        reference: `RIDE_${currentRide.id}_${Date.now()}`,
        description: `${t('payment_method')} SmartCabb #${currentRide.id} via ${selectedNetwork.name}`,
        rideId: currentRide.id,
        passengerId: currentUser?.id,
        driverId: currentRide.driverId,
        metadata: { type: 'ride_payment', network: selectedNetwork.id, networkName: selectedNetwork.name }
      };

      const result = await paymentService.initPayment(paymentData);

      if (result.success && result.paymentUrl) {
        setShowMobileMoneyModal(false);

        const width = 500, height = 700;
        const left = (window.screen.width - width) / 2;
        const top = (window.screen.height - height) / 2;

        const paymentWindow = window.open(
          result.paymentUrl,
          'FlutterwavePayment',
          `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
        );

        if (!paymentWindow) {
          toast.error(t('error'));
          setIsProcessing(false);
          return;
        }

        const checkPaymentStatus = async () => {
          if (!result.transactionId) return false;
          try {
            const verification = await paymentService.verifyPayment(result.transactionId);
            if (verification.isValid && (verification.status === 'successful' || verification.status === 'completed')) {
              await completeRide('mobile_money', result.transactionId);
              // ✅ TRADUIT
              toast.success(t('payment_successful'));
              setIsProcessing(false);
              if (paymentWindow && !paymentWindow.closed) paymentWindow.close();
              setTimeout(() => { setCurrentScreen('rating'); }, 1500);
              return true;
            } else if (verification.status === 'failed') {
              toast.error(t('error'));
              setIsProcessing(false);
              if (paymentWindow && !paymentWindow.closed) paymentWindow.close();
              return true;
            }
            return false;
          } catch { return false; }
        };

        let attempts = 0;
        const intervalId = setInterval(async () => {
          attempts++;
          if (paymentWindow.closed) {
            clearInterval(intervalId);
            const finalCheck = await checkPaymentStatus();
            if (!finalCheck) {
              let extraAttempts = 0;
              const extraInterval = setInterval(async () => {
                extraAttempts++;
                if (extraAttempts >= 15) { clearInterval(extraInterval); setIsProcessing(false); return; }
                const status = await checkPaymentStatus();
                if (status) clearInterval(extraInterval);
              }, 2000);
            }
            return;
          }
          const isDone = await checkPaymentStatus();
          if (isDone) clearInterval(intervalId);
          if (attempts >= 60) {
            clearInterval(intervalId);
            toast.error(t('error'));
            setIsProcessing(false);
            if (paymentWindow && !paymentWindow.closed) paymentWindow.close();
          }
        }, 2000);
      } else {
        throw new Error(result.error || result.message || t('error'));
      }
    } catch (error) {
      console.error('❌ Erreur paiement Mobile Money:', error);
      toast.error(error instanceof Error ? error.message : t('error'));
      setIsProcessing(false);
    }
  };

  // ─── Paiement principal ───────────────────────────────────────
  const handlePayment = async () => {
    if (selectedMethod === 'mobile_money') {
      setShowNetworkSelection(true);
      return;
    }
    if (selectedMethod === 'mixed') {
      setShowMixedPaymentModal(true);
      return;
    }

    setIsProcessing(true);

    try {
      if (selectedMethod === 'wallet') {
        if (userBalance < ridePrice) {
          // ✅ TRADUIT
          toast.error(`${t('wallet_balance')}: ${userBalance.toLocaleString()} ${t('cdf')}`);
          setIsProcessing(false);
          return;
        }
      }

      await completeRide(selectedMethod);
      // ✅ TRADUIT
      toast.success(t('payment_successful'));
      setTimeout(() => { setCurrentScreen('rating'); }, 1500);
    } catch (error) {
      console.error('❌ Erreur paiement:', error);
      toast.error(error instanceof Error ? error.message : t('error'));
    } finally {
      setIsProcessing(false);
    }
  };

  // ─── Méthodes de paiement — ✅ NOMS TRADUITS ─────────────────
  const paymentMethods = [
    {
      id: 'wallet',
      // ✅ TRADUIT
      name: t('wallet'),
      icon: Wallet,
      description: `${t('wallet_balance')}: ${userBalance.toLocaleString()} ${t('cdf')}`,
      color: 'bg-purple-100 text-purple-600'
    },
    {
      id: 'cash',
      // ✅ TRADUIT
      name: t('cash'),
      icon: Banknote,
      description: t('payment_method'),
      color: 'bg-green-100 text-green-600'
    },
    {
      id: 'mobile_money',
      // ✅ TRADUIT
      name: t('mobile_money'),
      icon: Smartphone,
      description: 'Orange Money, Airtel Money, M-Pesa',
      color: 'bg-orange-100 text-orange-600'
    },
    {
      id: 'mixed',
      // ✅ TRADUIT
      name: `${t('cash')} + ${t('mobile_money')}`,
      icon: Split,
      description: `${t('cash')} + ${t('mobile_money')}`,
      color: 'bg-blue-100 text-blue-600'
    },
    {
      id: 'card',
      // ✅ TRADUIT
      name: t('card'),
      icon: CreditCard,
      description: 'Visa, Mastercard',
      color: 'bg-gray-100 text-gray-600'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* ── HEADER — ✅ TRADUIT ── */}
      <div className="bg-white border-b p-3 sm:p-4">
        <div className="text-center">
          {/* ✅ TRADUIT : "Paiement" */}
          <h1 className="text-xl sm:text-2xl font-bold">{t('confirm_payment')}</h1>
          {/* ✅ TRADUIT : "Choisissez votre mode de paiement" */}
          <p className="text-gray-600 text-xs sm:text-sm">{t('payment_method')}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-3 sm:p-4 space-y-4 max-w-2xl mx-auto">

          {/* ── RÉSUMÉ DE LA COURSE — ✅ TRADUIT ── */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                {/* ✅ TRADUIT : "Résumé de la course" */}
                <h2 className="font-semibold text-sm sm:text-base">{t('trip_summary')}</h2>
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  {/* ✅ TRADUIT : "Distance" */}
                  <span className="text-gray-600">{t('distance')}</span>
                  <span className="font-medium">{safeDistance.toFixed(1)} {t('km')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  {/* ✅ TRADUIT : "Durée" */}
                  <span className="text-gray-600">{t('ride_duration')}</span>
                  <span className="font-medium">{formatDuration(safeDuration)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  {/* ✅ TRADUIT : "Catégorie" */}
                  <span className="text-gray-600">{t('choose_vehicle')}</span>
                  <span className="font-medium">{currentRide.vehicleCategory || 'Standard'}</span>
                </div>

                {currentRide.promoDiscount && currentRide.promoDiscount > 0 && (
                  <>
                    <div className="flex justify-between text-sm">
                      {/* ✅ TRADUIT */}
                      <span className="text-gray-600">{t('price')}</span>
                      <span className="font-medium">{(currentRide.estimatedPrice || 0).toLocaleString()} {t('cdf')}</span>
                    </div>
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Promo</span>
                      <span>-{currentRide.promoDiscount}%</span>
                    </div>
                  </>
                )}

                <div className="pt-2 border-t flex justify-between items-center">
                  {/* ✅ TRADUIT : "Total à payer" */}
                  <span className="text-base sm:text-lg font-semibold">{t('price')}</span>
                  <span className="text-2xl sm:text-3xl font-bold text-green-600">
                    {ridePrice.toLocaleString()} {t('cdf')}
                  </span>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* ── MÉTHODES DE PAIEMENT — ✅ TRADUIT ── */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            {/* ✅ TRADUIT */}
            <h3 className="font-semibold mb-2 text-sm sm:text-base">{t('payment_method')}</h3>

            <div className="space-y-2">
              {paymentMethods.map((method) => (
                <motion.div
                  key={method.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedMethod(method.id)}
                >
                  <Card className={`p-3 cursor-pointer transition-all ${
                    selectedMethod === method.id
                      ? 'border-2 border-green-500 bg-green-50'
                      : 'border hover:border-gray-300'
                  }`}>
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 sm:w-12 sm:h-12 ${method.color} rounded-full flex items-center justify-center flex-shrink-0`}>
                        <method.icon className="w-5 h-5 sm:w-6 sm:h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm sm:text-base">{method.name}</h4>
                        <p className="text-xs sm:text-sm text-gray-600 truncate">{method.description}</p>
                      </div>
                      {selectedMethod === method.id && (
                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                      )}
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* ── INFOS SELON MÉTHODE — ✅ TRADUIT ── */}
          {selectedMethod === 'mobile_money' && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
              <Card className="p-3 bg-blue-50 border-blue-200">
                <p className="text-xs sm:text-sm text-blue-800">
                  <strong>{t('mobile_money')} :</strong> {t('payment_method')}
                </p>
              </Card>
            </motion.div>
          )}

          {selectedMethod === 'mixed' && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
              <Card className="p-3 bg-blue-50 border-blue-200">
                <p className="text-xs sm:text-sm text-blue-800">
                  <strong>{t('cash')} + {t('mobile_money')} :</strong> {t('payment_method')}
                </p>
              </Card>
            </motion.div>
          )}

          {selectedMethod === 'cash' && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
              <Card className="p-3 bg-green-50 border-green-200">
                <p className="text-xs sm:text-sm text-green-800">
                  <strong>{t('cash')} :</strong> {t('confirm_payment')}
                </p>
              </Card>
            </motion.div>
          )}

          {selectedMethod === 'wallet' && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
              <Card className={`p-3 ${userBalance >= ridePrice ? 'bg-purple-50 border-purple-200' : 'bg-red-50 border-red-200'}`}>
                <p className={`text-xs sm:text-sm ${userBalance >= ridePrice ? 'text-purple-800' : 'text-red-800'}`}>
                  {/* ✅ TRADUIT */}
                  <strong>{t('wallet_balance')} :</strong> {userBalance.toLocaleString()} {t('cdf')}<br/>
                  {userBalance >= ridePrice
                    ? `✅ ${t('success')}`
                    : `❌ ${t('error')} · -${(ridePrice - userBalance).toLocaleString()} ${t('cdf')}`
                  }
                </p>
              </Card>
            </motion.div>
          )}

          {/* ── BOUTON PAIEMENT — ✅ TRADUIT ── */}
          <Button
            onClick={handlePayment}
            disabled={isProcessing || (selectedMethod === 'wallet' && userBalance < ridePrice)}
            className="w-full bg-green-600 hover:bg-green-700 h-12 sm:h-14"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2 animate-spin" />
                {/* ✅ TRADUIT : "Traitement..." */}
                <span className="text-sm sm:text-base">{t('loading')}</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                {/* ✅ TRADUIT : "Confirmer le paiement" */}
                <span className="text-sm sm:text-base">{t('confirm_payment')}</span>
              </>
            )}
          </Button>

          {/* Note de sécurité */}
          <Card className="p-3 bg-gray-50">
            <p className="text-xs text-gray-600 text-center">
              🔒 {t('success')} · Sécurisé
            </p>
          </Card>
        </div>
      </div>

      {/* ── MODAL SÉLECTION RÉSEAU MOBILE MONEY — ✅ TRADUIT ── */}
      <AnimatePresence>
        {showNetworkSelection && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
            onClick={() => !isProcessing && setShowNetworkSelection(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  {/* ✅ TRADUIT : "Sélectionnez votre réseau" */}
                  <h3 className="text-lg font-bold">{t('mobile_money')}</h3>
                  <p className="text-sm text-gray-600">{ridePrice.toLocaleString()} {t('cdf')}</p>
                </div>
                <button
                  onClick={() => setShowNetworkSelection(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="space-y-3 mb-4">
                {MOBILE_MONEY_NETWORKS.map((network) => (
                  <motion.div
                    key={network.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedNetwork(network)}
                  >
                    <Card className={`p-4 cursor-pointer transition-all ${
                      selectedNetwork?.id === network.id
                        ? 'border-2 border-green-500 bg-green-50'
                        : 'border hover:border-gray-300'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 overflow-hidden rounded-lg">
                            <network.LogoComponent />
                          </div>
                          <div>
                            <h4 className="font-semibold">{network.name}</h4>
                            <p className="text-sm text-gray-600">{network.code}</p>
                          </div>
                        </div>
                        {selectedNetwork?.id === network.id && (
                          <CheckCircle className="w-6 h-6 text-green-600" />
                        )}
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>

              <Button
                onClick={() => {
                  if (selectedNetwork) {
                    setShowNetworkSelection(false);
                    setShowMobileMoneyModal(true);
                  }
                }}
                disabled={!selectedNetwork}
                className="w-full bg-orange-600 hover:bg-orange-700 h-12"
              >
                <CheckCircle className="w-5 h-5 mr-2" />
                {/* ✅ TRADUIT : "Continuer" */}
                {t('continue')}
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MODAL NUMÉRO TÉLÉPHONE MOBILE MONEY — ✅ TRADUIT ── */}
      <AnimatePresence>
        {showMobileMoneyModal && selectedNetwork && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
            onClick={() => !isProcessing && setShowMobileMoneyModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 overflow-hidden rounded-lg">
                    <selectedNetwork.LogoComponent />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">{selectedNetwork.name}</h3>
                    <p className="text-sm text-gray-600">{ridePrice.toLocaleString()} {t('cdf')}</p>
                  </div>
                </div>
                {!isProcessing && (
                  <button
                    onClick={() => setShowMobileMoneyModal(false)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  {/* ✅ TRADUIT : "Numéro de téléphone" */}
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('phone_number')}
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+243 999 999 999"
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      disabled={isProcessing}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{selectedNetwork.name}</p>
                </div>

                <Card className="p-3 bg-blue-50 border-blue-200">
                  <p className="text-xs text-blue-800">
                    💡 {selectedNetwork.code} → {t('confirm_payment')}
                  </p>
                </Card>

                <Button
                  onClick={handleMobileMoneyPayment}
                  disabled={isProcessing || !phoneNumber || phoneNumber.length < 9}
                  className="w-full bg-orange-600 hover:bg-orange-700 h-12"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      {/* ✅ TRADUIT */}
                      {t('loading')}
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5 mr-2" />
                      {/* ✅ TRADUIT */}
                      {t('confirm_payment')}
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MODAL PAIEMENT MIXTE — ✅ TRADUIT ── */}
      <AnimatePresence>
        {showMixedPaymentModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
            onClick={() => !isProcessing && setShowMixedPaymentModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <Split className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    {/* ✅ TRADUIT : "Paiement Mixte" */}
                    <h3 className="text-lg font-bold">{t('cash')} + {t('mobile_money')}</h3>
                    <p className="text-sm text-gray-600">{t('price')}: {ridePrice.toLocaleString()} {t('cdf')}</p>
                  </div>
                </div>
                {!isProcessing && (
                  <button
                    onClick={() => setShowMixedPaymentModal(false)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                )}
              </div>

              <div className="space-y-4">
                {/* Montant espèces */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    💵 {t('cash')} ({t('cdf')})
                  </label>
                  <div className="relative">
                    <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="number"
                      value={cashAmount}
                      onChange={(e) => setCashAmount(e.target.value)}
                      placeholder="10000"
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={isProcessing}
                      min="1"
                      max={ridePrice - 1}
                    />
                  </div>
                </div>

                {/* Calcul automatique */}
                {cashAmountNum > 0 && cashAmountNum < ridePrice && (
                  <Card className="p-4 bg-gradient-to-r from-green-50 to-orange-50 border-2 border-dashed border-blue-300">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        {/* ✅ TRADUIT */}
                        <span className="text-sm text-gray-600">💵 {t('cash')} :</span>
                        <span className="font-semibold text-green-700">{cashAmountNum.toLocaleString()} {t('cdf')}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        {/* ✅ TRADUIT */}
                        <span className="text-sm text-gray-600">📱 {t('mobile_money')} :</span>
                        <span className="font-semibold text-orange-700">{mobileMoneyAmount.toLocaleString()} {t('cdf')}</span>
                      </div>
                      <div className="pt-2 border-t border-blue-200 flex justify-between items-center">
                        {/* ✅ TRADUIT */}
                        <span className="font-semibold text-gray-800">{t('price')} :</span>
                        <span className="text-lg font-bold text-blue-600">{ridePrice.toLocaleString()} {t('cdf')}</span>
                      </div>
                    </div>
                  </Card>
                )}

                {/* Sélection réseau et numéro Mobile Money */}
                {cashAmountNum > 0 && cashAmountNum < ridePrice && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        📱 {t('mobile_money')}
                      </label>
                      <div className="space-y-2">
                        {MOBILE_MONEY_NETWORKS.map((network) => (
                          <motion.div
                            key={network.id}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setMixedNetwork(network)}
                          >
                            <Card className={`p-3 cursor-pointer transition-all ${
                              mixedNetwork?.id === network.id
                                ? 'border-2 border-green-500 bg-green-50'
                                : 'border hover:border-gray-300'
                            }`}>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <div className="w-8 h-8 overflow-hidden rounded-lg">
                                    <network.LogoComponent />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">{network.name}</p>
                                    <p className="text-xs text-gray-500">{network.code}</p>
                                  </div>
                                </div>
                                {mixedNetwork?.id === network.id && (
                                  <CheckCircle className="w-5 h-5 text-green-600" />
                                )}
                              </div>
                            </Card>
                          </motion.div>
                        ))}
                      </div>
                    </div>

                    {/* Numéro téléphone Mobile Money */}
                    {mixedNetwork && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          📱 {t('phone_number')} {mixedNetwork.name}
                        </label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input
                            type="tel"
                            value={mixedPhoneNumber}
                            onChange={(e) => setMixedPhoneNumber(e.target.value)}
                            placeholder="+243 999 999 999"
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            disabled={isProcessing}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {mobileMoneyAmount.toLocaleString()} {t('cdf')}
                        </p>
                      </div>
                    )}
                  </>
                )}

                <Button
                  onClick={handleMixedPayment}
                  disabled={
                    isProcessing ||
                    !cashAmount ||
                    cashAmountNum <= 0 ||
                    cashAmountNum >= ridePrice ||
                    !mixedNetwork ||
                    !mixedPhoneNumber ||
                    mixedPhoneNumber.length < 9
                  }
                  className="w-full bg-blue-600 hover:bg-blue-700 h-12"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      {/* ✅ TRADUIT */}
                      {t('loading')}
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5 mr-2" />
                      {/* ✅ TRADUIT : "Confirmer le paiement mixte" */}
                      {t('confirm_payment')}
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
