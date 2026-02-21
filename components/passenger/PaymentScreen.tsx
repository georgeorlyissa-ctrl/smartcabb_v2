import { useState, useEffect } from 'react'; // ✅ FIX CRITIQUE: Import React hooks
import { motion, AnimatePresence } from '../../lib/motion'; // ✅ FIX: Import motion + AnimatePresence
import { Button } from '../ui/button'; // ✅ FIX: Import Button
import { Card } from '../ui/card'; // ✅ FIX: Import Card
import { Input } from '../ui/input'; // ✅ FIX: Import Input
import { Wallet, Banknote, Smartphone, CreditCard, Split, X, CheckCircle, AlertCircle, Clock, DollarSign, Loader2, Phone } from '../../lib/icons'; // ✅ FIX: Import icons + Loader2 + Phone
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { useAppState } from '../../hooks/useAppState'; // ✅ FIX: Import manquant
import { toast } from '../../lib/toast';
import { paymentService } from '../../lib/payment-service';
import type { PaymentInitData } from '../../lib/payment-providers/base-provider';
import { VodacomMpesaLogo, OrangeMoneyLogo, AirtelMoneyLogo, AfrimoneyLogo } from '../mobile-money-logos';

// Configuration des réseaux Mobile Money RDC
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
  const [selectedMethod, setSelectedMethod] = useState<typeof PAYMENT_METHODS[number]['id'] | ''>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedNetwork, setSelectedNetwork] = useState<typeof MOBILE_MONEY_NETWORKS[0] | null>(null);
  const [fullName, setFullName] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cashCollected, setCashCollected] = useState(false);
  
  // États pour paiement mixte
  const [cashAmount, setCashAmount] = useState<string>('');
  const [mixedPhoneNumber, setMixedPhoneNumber] = useState('');
  const [mixedNetwork, setMixedNetwork] = useState<typeof MOBILE_MONEY_NETWORKS[0] | null>(null);
  
  // ✅ États pour les modaux
  const [showNetworkSelection, setShowNetworkSelection] = useState(false);
  const [showMobileMoneyModal, setShowMobileMoneyModal] = useState(false);
  const [showMixedPaymentModal, setShowMixedPaymentModal] = useState(false);
  
  // 🆕 État pour polling de la durée si elle est à 0
  const [isLoadingDuration, setIsLoadingDuration] = useState(false);
  
  const currentRide = state.currentRide;
  const currentUser = state.currentUser;

  // ✅ Calculer la distance et durée depuis les données de la course
  const distance = currentRide?.distanceKm || currentRide?.distance || 0;
  
  // 🔥 CORRECTION MAJEURE : Prioriser billingElapsedTime qui est la vraie durée
  // duration peut être à 0 si pas encore sauvegardé, mais billingElapsedTime devrait être là
  const durationInSeconds = currentRide?.duration || currentRide?.billingElapsedTime || 0;
  const durationInMinutes = Math.round(durationInSeconds / 60);
  
  // 🔥 PROTECTION : S'assurer que distance et duration sont des nombres valides
  const safeDistance = isNaN(distance) || distance < 0 ? 0 : distance;
  const safeDuration = isNaN(durationInSeconds) || durationInSeconds < 0 ? 0 : durationInSeconds;
  
  // ✅ FONCTION POUR FORMATER LA DURÉE (cohérente avec le driver)
  const formatDuration = (seconds: number | undefined): string => {
    // 🔥 PROTECTION contre undefined/NaN
    if (seconds === undefined || seconds === null || isNaN(seconds) || seconds < 0) {
      return '0min';
    }
    
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (secs > 0) {
      return `${minutes}min ${secs}s`;
    }
    return `${minutes}min`;
  };
  
  // 🔥 NOUVEAU: Polling pour récupérer la durée si elle est à 0
  useEffect(() => {
    if (!currentRide?.id || durationInSeconds > 0) {
      return; // Pas besoin de polling si la durée existe déjà
    }
    
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
          
          console.log('🔍 Données récupérées du backend:', {
            duration: data.ride?.duration,
            billingElapsedTime: data.ride?.billingElapsedTime,
            distance: data.ride?.distance
          });
          
          // 🔥 Vérifier SOIT duration SOIT billingElapsedTime
          const retrievedDuration = data.ride?.duration || data.ride?.billingElapsedTime || 0;
          
          if (data.ride && retrievedDuration > 0) {
            console.log('✅ PaymentScreen - Durée récupérée:', retrievedDuration);
            
            // Mettre à jour la course avec la durée
            if (state.updateRide) {
              state.updateRide(currentRide.id, {
                duration: retrievedDuration,
                billingElapsedTime: retrievedDuration, // Mettre à jour les deux
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
    
    // Vérifier immédiatement
    fetchDuration();
    
    // Puis toutes les 2 secondes pendant 30 secondes max
    const interval = setInterval(fetchDuration, 2000);
    const timeout = setTimeout(() => {
      clearInterval(interval);
      setIsLoadingDuration(false);
      console.warn('⚠️ Timeout polling durée - durée reste à 0');
    }, 30000);
    
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [currentRide?.id, durationInSeconds, state.updateRide]);
  
  console.log('🔥🔥🔥 PaymentScreen - ÉTAT ACTUEL:', {
    'currentRide.id': currentRide?.id,
    'currentRide.duration': currentRide?.duration,
    'currentRide.billingElapsedTime': currentRide?.billingElapsedTime,
    'durationInSeconds (calculé)': durationInSeconds,
    'durationInMinutes': durationInMinutes,
    'formatted': formatDuration(durationInSeconds),
    'distance': distance,
    'isLoadingDuration': isLoadingDuration,
    'currentRide.status': currentRide?.status,
    'OBJET COMPLET currentRide': currentRide
  });
    
  const ridePrice = currentRide?.estimatedPrice || 0;
  // ✅ FIX: Utiliser walletBalance au lieu de balance
  const userBalance = currentUser?.walletBalance || currentUser?.balance || 0;
  
  // Calculer le montant Mobile Money pour paiement mixte
  const cashAmountNum = parseFloat(cashAmount) || 0;
  const mobileMoneyAmount = ridePrice - cashAmountNum;
  
  console.log('💳 PaymentScreen - Données:', {
    distance,
    duration: durationInMinutes,
    billingElapsedTime: durationInSeconds,
    ridePrice,
    userBalance,
    hasSufficientBalance: userBalance >= ridePrice
  });

  if (!currentRide) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-6">
          <p>Aucune course à payer</p>
        </Card>
      </div>
    );
  }

  // ✅ FONCTION POUR COMPLÉTER LA COURSE (appelée après paiement réussi)
  const completeRide = async (paymentMethodUsed: string, transactionId?: string, cashPart?: number, mobilePart?: number) => {
    try {
      console.log('🏁 Finalisation de la course:', { 
        rideId: currentRide.id, 
        method: paymentMethodUsed,
        cashPart,
        mobilePart
      });
      
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
            totalCost: ridePrice,
            paymentMethod: paymentMethodUsed,
            paymentTransactionId: transactionId,
            cashAmount: cashPart,
            mobileMoneyAmount: mobilePart,
            driverEarnings: Math.round(ridePrice * 0.85), // 85% pour le conducteur
            duration: durationInSeconds || 0,
            distance: distance || 0
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Erreur backend finalisation:', errorData);
        throw new Error(errorData.error || 'Erreur lors de la finalisation');
      }

      const data = await response.json();
      console.log('✅ Course finalisée:', data);

      // ✅ RECHARGER LE SOLDE DEPUIS LE BACKEND APRÈS PAIEMENT
      if (paymentMethodUsed === 'wallet' && currentUser?.id) {
        console.log('🔄 Rechargement du solde depuis le backend...');
        
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
            
            console.log(`✅ Solde rechargé depuis le backend: ${newBalance.toLocaleString()} CDF`);
            
            // Mettre à jour le state avec le nouveau solde
            if (state.updateUser) {
              state.updateUser({ 
                ...currentUser, 
                walletBalance: newBalance,
                balance: newBalance // Mettre à jour les deux pour compatibilité
              });
            }
          } else {
            console.error('❌ Erreur rechargement solde:', balanceResponse.status);
          }
        } catch (error) {
          console.error(' Erreur rechargement solde:', error);
        }
      }

      // Mettre à jour l'état local de la course
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

  // ✅ GESTION PAIEMENT MIXTE (ESPÈCES + MOBILE MONEY)
  const handleMixedPayment = async () => {
    // Validation
    if (!cashAmount || cashAmountNum <= 0) {
      toast.error('Veuillez entrer un montant en espèces valide');
      return;
    }

    if (cashAmountNum >= ridePrice) {
      toast.error('Le montant en espèces doit être inférieur au total. Utilisez le paiement en espèces uniquement.');
      return;
    }

    if (!mixedNetwork) {
      toast.error('Veuillez sélectionner un réseau Mobile Money');
      return;
    }

    if (!mixedPhoneNumber || mixedPhoneNumber.length < 9) {
      toast.error('Veuillez entrer un numéro de téléphone valide (minimum 9 chiffres)');
      return;
    }

    setIsProcessing(true);

    try {
      console.log('💰 Paiement Mixte:', {
        total: ridePrice,
        espèces: cashAmountNum,
        mobileMoney: mobileMoneyAmount,
        network: mixedNetwork.name
      });

      // 1. Initier le paiement Mobile Money pour la différence
      const paymentData: PaymentInitData = {
        amount: mobileMoneyAmount,
        currency: 'CDF',
        method: 'mobile_money',
        customerEmail: currentUser?.email || 'passager@smartcabb.com',
        customerName: currentUser?.name || currentUser?.full_name || 'Passager',
        customerPhone: mixedPhoneNumber,
        reference: `RIDE_MIXED_${currentRide.id}_${Date.now()}`,
        description: `Paiement mixte course SmartCabb #${currentRide.id} (${mobileMoneyAmount.toLocaleString()} CDF via ${mixedNetwork.name})`,
        rideId: currentRide.id,
        passengerId: currentUser?.id,
        driverId: currentRide.driverId,
        metadata: {
          type: 'ride_payment_mixed',
          cashAmount: cashAmountNum,
          mobileMoneyAmount: mobileMoneyAmount,
          network: mixedNetwork.id,
          networkName: mixedNetwork.name
        }
      };

      console.log('💳 Initialisation paiement Flutterwave Mobile Money (Mixte):', paymentData);

      const result = await paymentService.initPayment(paymentData);

      console.log('🔍 Résultat initPayment:', result);

      if (result.success && result.paymentUrl) {
        console.log('✅ Redirection vers Flutterwave:', result.paymentUrl);
        
        // Fermer le modal de paiement mixte
        setShowMixedPaymentModal(false);
        
        // 2. Ouvrir Flutterwave dans une popup
        const width = 500;
        const height = 700;
        const left = (window.screen.width - width) / 2;
        const top = (window.screen.height - height) / 2;
        
        const paymentWindow = window.open(
          result.paymentUrl, 
          'FlutterwavePayment',
          `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
        );
        
        if (!paymentWindow) {
          toast.error('Veuillez autoriser les popups pour ce site');
          setIsProcessing(false);
          return;
        }
        
        // 3. Polling pour vérifier le statut du paiement
        const checkPaymentStatus = async () => {
          if (!result.transactionId) return false;
          
          try {
            const verification = await paymentService.verifyPayment(result.transactionId);
            
            console.log('🔍 Vérification paiement mixte:', verification);
            
            if (verification.isValid && (verification.status === 'successful' || verification.status === 'completed')) {
              // 4. Paiement réussi → Finaliser la course
              console.log('✅ Paiement Mixte validé, finalisation de la course...');
              
              await completeRide('mixed', result.transactionId, cashAmountNum, mobileMoneyAmount);
              
              toast.success(`Paiement mixte effectué ! ${cashAmountNum.toLocaleString()} CDF en espèces + ${mobileMoneyAmount.toLocaleString()} CDF Mobile Money`);
              setIsProcessing(false);
              
              // Fermer la popup si elle est encore ouverte
              if (paymentWindow && !paymentWindow.closed) {
                paymentWindow.close();
              }
              
              // Rediriger vers l'écran d'évaluation
              setTimeout(() => {
                setCurrentScreen('rating');
              }, 1500);
              
              return true;
            } else if (verification.status === 'failed') {
              toast.error('Le paiement Mobile Money a échoué. Veuillez réessayer.');
              setIsProcessing(false);
              
              if (paymentWindow && !paymentWindow.closed) {
                paymentWindow.close();
              }
              return true;
            }
            
            return false;
          } catch (error) {
            console.error('❌ Erreur vérification:', error);
            return false;
          }
        };
        
        // Vérifier toutes les 2 secondes
        const maxAttempts = 60; // 2 minutes
        let attempts = 0;
        
        const intervalId = setInterval(async () => {
          attempts++;
          
          // Vérifier si la popup est fermée
          if (paymentWindow.closed) {
            console.log('🪟 Popup fermée, vérification finale...');
            clearInterval(intervalId);
            
            const finalCheck = await checkPaymentStatus();
            
            if (!finalCheck) {
              // Continuer à vérifier pendant 30 secondes supplémentaires
              let extraAttempts = 0;
              const extraInterval = setInterval(async () => {
                extraAttempts++;
                
                if (extraAttempts >= 15) {
                  clearInterval(extraInterval);
                  toast.error('Délai de vérification dépassé. Vérifiez l\'historique des paiements.');
                  setIsProcessing(false);
                  return;
                }
                
                const status = await checkPaymentStatus();
                if (status) {
                  clearInterval(extraInterval);
                }
              }, 2000);
            }
            
            return;
          }
          
          // Vérifier le statut du paiement
          const isDone = await checkPaymentStatus();
          if (isDone) {
            clearInterval(intervalId);
          }
          
          // Timeout après 2 minutes
          if (attempts >= maxAttempts) {
            clearInterval(intervalId);
            toast.error('Délai de paiement dépassé. Veuillez réessayer.');
            setIsProcessing(false);
            
            if (paymentWindow && !paymentWindow.closed) {
              paymentWindow.close();
            }
          }
        }, 2000);
        
      } else {
        throw new Error(result.error || result.message || 'Impossible d\'initialiser le paiement');
      }
      
    } catch (error) {
      console.error('❌ Erreur paiement mixte:', error);
      toast.error(error instanceof Error ? error.message : 'Impossible de traiter le paiement mixte');
      setIsProcessing(false);
    }
  };

  // ✅ GESTION MOBILE MONEY AVEC SIMULATION FLUTTERWAVE
  const handleMobileMoneyPayment = async () => {
    if (!selectedNetwork) {
      toast.error('Veuillez sélectionner un réseau Mobile Money');
      return;
    }

    if (!phoneNumber || phoneNumber.length < 9) {
      toast.error('Veuillez entrer un numéro de téléphone valide (minimum 9 chiffres)');
      return;
    }

    setIsProcessing(true);

    try {
      // 1. Initier le paiement Flutterwave
      const paymentData: PaymentInitData = {
        amount: ridePrice,
        currency: 'CDF',
        method: 'mobile_money',
        customerEmail: currentUser?.email || 'passager@smartcabb.com',
        customerName: currentUser?.name || currentUser?.full_name || 'Passager',
        customerPhone: phoneNumber,
        reference: `RIDE_${currentRide.id}_${Date.now()}`,
        description: `Paiement course SmartCabb #${currentRide.id} via ${selectedNetwork.name}`,
        rideId: currentRide.id,
        passengerId: currentUser?.id,
        driverId: currentRide.driverId,
        metadata: {
          type: 'ride_payment',
          network: selectedNetwork.id,
          networkName: selectedNetwork.name
        }
      };

      console.log('💳 Initialisation paiement Flutterwave Mobile Money:', paymentData);

      const result = await paymentService.initPayment(paymentData);

      console.log('🔍 Résultat initPayment:', result);

      if (result.success && result.paymentUrl) {
        console.log('✅ Redirection vers Flutterwave:', result.paymentUrl);
        
        // Fermer le modal de numéro de téléphone
        setShowMobileMoneyModal(false);
        
        // 2. Ouvrir Flutterwave dans une popup
        const width = 500;
        const height = 700;
        const left = (window.screen.width - width) / 2;
        const top = (window.screen.height - height) / 2;
        
        const paymentWindow = window.open(
          result.paymentUrl, 
          'FlutterwavePayment',
          `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
        );
        
        if (!paymentWindow) {
          toast.error('Veuillez autoriser les popups pour ce site');
          setIsProcessing(false);
          return;
        }
        
        // 3. Polling pour vérifier le statut du paiement
        const checkPaymentStatus = async () => {
          if (!result.transactionId) return false;
          
          try {
            const verification = await paymentService.verifyPayment(result.transactionId);
            
            console.log('🔍 Vérification paiement:', verification);
            
            if (verification.isValid && (verification.status === 'successful' || verification.status === 'completed')) {
              // 4. Paiement réussi → Finaliser la course
              console.log('✅ Paiement Mobile Money validé, finalisation de la course...');
              
              await completeRide('mobile_money', result.transactionId);
              
              toast.success('Paiement effectué avec succès !');
              setIsProcessing(false);
              
              // Fermer la popup si elle est encore ouverte
              if (paymentWindow && !paymentWindow.closed) {
                paymentWindow.close();
              }
              
              // Rediriger vers l'écran d'évaluation
              setTimeout(() => {
                setCurrentScreen('rating');
              }, 1500);
              
              return true;
            } else if (verification.status === 'failed') {
              toast.error('Le paiement a échoué. Veuillez réessayer.');
              setIsProcessing(false);
              
              if (paymentWindow && !paymentWindow.closed) {
                paymentWindow.close();
              }
              return true;
            }
            
            return false;
          } catch (error) {
            console.error('❌ Erreur vérification:', error);
            return false;
          }
        };
        
        // Vérifier toutes les 2 secondes
        const maxAttempts = 60; // 2 minutes
        let attempts = 0;
        
        const intervalId = setInterval(async () => {
          attempts++;
          
          // Vérifier si la popup est fermée
          if (paymentWindow.closed) {
            console.log('🪟 Popup fermée, vérification finale...');
            clearInterval(intervalId);
            
            const finalCheck = await checkPaymentStatus();
            
            if (!finalCheck) {
              // Continuer à vérifier pendant 30 secondes supplémentaires
              let extraAttempts = 0;
              const extraInterval = setInterval(async () => {
                extraAttempts++;
                
                if (extraAttempts >= 15) {
                  clearInterval(extraInterval);
                  toast.error('Délai de vérification dépassé. Vérifiez l\'historique des paiements.');
                  setIsProcessing(false);
                  return;
                }
                
                const status = await checkPaymentStatus();
                if (status) {
                  clearInterval(extraInterval);
                }
              }, 2000);
            }
            
            return;
          }
          
          // Vérifier le statut du paiement
          const isDone = await checkPaymentStatus();
          if (isDone) {
            clearInterval(intervalId);
          }
          
          // Timeout après 2 minutes
          if (attempts >= maxAttempts) {
            clearInterval(intervalId);
            toast.error('Délai de paiement dépassé. Veuillez réessayer.');
            setIsProcessing(false);
            
            if (paymentWindow && !paymentWindow.closed) {
              paymentWindow.close();
            }
          }
        }, 2000);
        
      } else {
        throw new Error(result.error || result.message || 'Impossible d\'initialiser le paiement');
      }
      
    } catch (error) {
      console.error('❌ Erreur paiement Mobile Money:', error);
      const errorMessage = error instanceof Error ? error.message : 'Impossible de traiter le paiement';
      toast.error(`Erreur paiement : ${errorMessage}`);
      setIsProcessing(false);
    }
  };

  // ✅ GESTION DES AUTRES MÉTHODES DE PAIEMENT
  const handlePayment = async () => {
    // Si Mobile Money, ouvrir d'abord la sélection du réseau
    if (selectedMethod === 'mobile_money') {
      setShowNetworkSelection(true);
      return;
    }

    // Si Paiement Mixte, ouvrir le modal spécial
    if (selectedMethod === 'mixed') {
      setShowMixedPaymentModal(true);
      return;
    }

    setIsProcessing(true);

    try {
      console.log('💳 Traitement du paiement:', { method: selectedMethod, rideId: currentRide.id });
      
      // ✅ VALIDATION : Vérifier le solde si paiement par wallet
      if (selectedMethod === 'wallet') {
        if (userBalance < ridePrice) {
          toast.error(`Solde insuffisant ! Solde: ${userBalance.toLocaleString()} CDF, Requis: ${ridePrice.toLocaleString()} CDF`);
          setIsProcessing(false);
          return;
        }
        
        console.log(`💰 Paiement par wallet - Solde actuel: ${userBalance.toLocaleString()} CDF, Prix: ${ridePrice.toLocaleString()} CDF`);
        // ✅ NE PAS déduire localement, le backend le fera et on rechargera après
      }
      
      // Pour cash et wallet, finaliser directement
      await completeRide(selectedMethod);

      toast.success('Paiement effectué avec succès !');
      
      // Rediriger vers l'écran d'évaluation
      setTimeout(() => {
        setCurrentScreen('rating');
      }, 1500);
      
    } catch (error) {
      console.error('❌ Erreur paiement:', error);
      toast.error(error instanceof Error ? error.message : 'Impossible de traiter le paiement');
    } finally {
      setIsProcessing(false);
    }
  };

  const paymentMethods = [
    {
      id: 'wallet',
      name: 'Portefeuille',
      icon: Wallet,
      description: 'Payer avec votre solde SmartCabb',
      color: 'bg-purple-100 text-purple-600'
    },
    {
      id: 'cash',
      name: 'Espèces',
      icon: Banknote,
      description: 'Payer en cash au conducteur',
      color: 'bg-green-100 text-green-600'
    },
    {
      id: 'mobile_money',
      name: 'Mobile Money',
      icon: Smartphone,
      description: 'Orange Money, Airtel Money, M-Pesa',
      color: 'bg-orange-100 text-orange-600'
    },
    {
      id: 'mixed',
      name: 'Paiement Mixte',
      icon: Split,
      description: 'Espèces + Mobile Money',
      color: 'bg-blue-100 text-blue-600'
    },
    {
      id: 'card',
      name: 'Carte bancaire',
      icon: CreditCard,
      description: 'Visa, Mastercard',
      color: 'bg-gray-100 text-gray-600'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header - Compact */}
      <div className="bg-white border-b p-3 sm:p-4">
        <div className="text-center">
          <h1 className="text-xl sm:text-2xl font-bold">Paiement</h1>
          <p className="text-gray-600 text-xs sm:text-sm">Choisissez votre mode de paiement</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-3 sm:p-4 space-y-4 max-w-2xl mx-auto">
          {/* Résumé de la course - Compact */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-sm sm:text-base">Résumé de la course</h2>
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Distance</span>
                  <span className="font-medium">{safeDistance.toFixed(1)} km</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Durée</span>
                  <span className="font-medium">{formatDuration(safeDuration)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Catégorie</span>
                  <span className="font-medium">{currentRide.vehicleCategory || 'Standard'}</span>
                </div>
                
                {currentRide.promoDiscount && currentRide.promoDiscount > 0 && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Prix initial</span>
                      <span className="font-medium">{(currentRide.estimatedPrice || 0).toLocaleString()} CDF</span>
                    </div>
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Réduction promo</span>
                      <span>-{currentRide.promoDiscount}%</span>
                    </div>
                  </>
                )}
                
                <div className="pt-2 border-t flex justify-between items-center">
                  <span className="text-base sm:text-lg font-semibold">Total à payer</span>
                  <span className="text-2xl sm:text-3xl font-bold text-green-600">
                    {ridePrice.toLocaleString()} CDF
                  </span>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Méthodes de paiement - Compact */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h3 className="font-semibold mb-2 text-sm sm:text-base">Choisissez un mode de paiement</h3>
            
            <div className="space-y-2">
              {paymentMethods.map((method) => (
                <motion.div
                  key={method.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedMethod(method.id as any)}
                >
                  <Card 
                    className={`p-3 cursor-pointer transition-all ${
                      selectedMethod === method.id 
                        ? 'border-2 border-green-500 bg-green-50' 
                        : 'border hover:border-gray-300'
                    }`}
                  >
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

          {/* Informations supplémentaires - Compact */}
          {selectedMethod === 'mobile_money' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
            >
              <Card className="p-3 bg-blue-50 border-blue-200">
                <p className="text-xs sm:text-sm text-blue-800">
                  <strong>Mobile Money :</strong> Sélectionnez votre réseau (Orange Money, M-Pesa, Airtel Money, Afrimoney), puis suivez les instructions de paiement.
                </p>
              </Card>
            </motion.div>
          )}

          {selectedMethod === 'mixed' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
            >
              <Card className="p-3 bg-blue-50 border-blue-200">
                <p className="text-xs sm:text-sm text-blue-800">
                  <strong>Paiement Mixte :</strong> Payez une partie en espèces et le reste via Mobile Money. 
                  Idéal si vous n'avez pas le montant total en liquide.
                </p>
              </Card>
            </motion.div>
          )}

          {selectedMethod === 'cash' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
            >
              <Card className="p-3 bg-green-50 border-green-200">
                <p className="text-xs sm:text-sm text-green-800">
                  <strong>Paiement en espèces :</strong> Veuillez remettre le montant exact au conducteur.
                </p>
              </Card>
            </motion.div>
          )}

          {selectedMethod === 'wallet' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
            >
              <Card className={`p-3 ${userBalance >= ridePrice ? 'bg-purple-50 border-purple-200' : 'bg-red-50 border-red-200'}`}>
                <p className={`text-xs sm:text-sm ${userBalance >= ridePrice ? 'text-purple-800' : 'text-red-800'}`}>
                  <strong>Solde actuel :</strong> {userBalance.toLocaleString()} CDF<br/>
                  {userBalance >= ridePrice ? (
                    <>✅ Solde suffisant pour cette course</>
                  ) : (
                    <>❌ Solde insuffisant ! Il vous manque {(ridePrice - userBalance).toLocaleString()} CDF</>
                  )}
                </p>
              </Card>
            </motion.div>
          )}

          {/* Bouton de paiement - Compact */}
          <Button
            onClick={handlePayment}
            disabled={isProcessing || (selectedMethod === 'wallet' && userBalance < ridePrice)}
            className="w-full bg-green-600 hover:bg-green-700 h-12 sm:h-14"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2 animate-spin" />
                <span className="text-sm sm:text-base">Traitement...</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                <span className="text-sm sm:text-base">Confirmer le paiement</span>
              </>
            )}
          </Button>

          {/* Note de sécurité - Compact */}
          <Card className="p-3 bg-gray-50">
            <p className="text-xs text-gray-600 text-center">
              🔒 Paiement sécurisé • Vos données sont protégées
            </p>
          </Card>
        </div>
      </div>

      {/* 🆕 MODAL SÉLECTION DU RÉSEAU MOBILE MONEY */}
      <AnimatePresence>
        {showNetworkSelection && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
            onClick={() => !isProcessing && setShowNetworkSelection(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold">Sélectionnez votre réseau</h3>
                  <p className="text-sm text-gray-600">{ridePrice.toLocaleString()} CDF</p>
                </div>
                <button
                  onClick={() => setShowNetworkSelection(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Réseaux */}
              <div className="space-y-3 mb-4">
                {MOBILE_MONEY_NETWORKS.map((network) => (
                  <motion.div
                    key={network.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedNetwork(network)}
                  >
                    <Card 
                      className={`p-4 cursor-pointer transition-all ${
                        selectedNetwork?.id === network.id 
                          ? 'border-2 border-green-500 bg-green-50' 
                          : 'border hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 overflow-hidden rounded-lg">
                            <network.LogoComponent />
                          </div>
                          <div>
                            <h4 className="font-semibold">{network.name}</h4>
                            <p className="text-sm text-gray-600">Code: {network.code}</p>
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

              {/* Bouton */}
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
                Continuer
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🆕 MODAL MOBILE MONEY - Demander le numéro de téléphone */}
      <AnimatePresence>
        {showMobileMoneyModal && selectedNetwork && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
            onClick={() => !isProcessing && setShowMobileMoneyModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`w-12 h-12 ${selectedNetwork.color} rounded-full flex items-center justify-center text-2xl`}>
                    <selectedNetwork.LogoComponent />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">{selectedNetwork.name}</h3>
                    <p className="text-sm text-gray-600">{ridePrice.toLocaleString()} CDF</p>
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

              {/* Form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Numéro de téléphone
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
                  <p className="text-xs text-gray-500 mt-1">
                    Numéro {selectedNetwork.name}
                  </p>
                </div>

                {/* Info */}
                <Card className="p-3 bg-blue-50 border-blue-200">
                  <p className="text-xs text-blue-800">
                    💡 <strong>Comment ça marche ?</strong><br/>
                    1. Composez {selectedNetwork.code} sur votre téléphone<br/>
                    2. Une fenêtre de paiement s'ouvrira<br/>
                    3. Suivez les instructions pour finaliser
                  </p>
                </Card>

                {/* Bouton */}
                <Button
                  onClick={handleMobileMoneyPayment}
                  disabled={isProcessing || !phoneNumber || phoneNumber.length < 9}
                  className="w-full bg-orange-600 hover:bg-orange-700 h-12"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Ouverture du paiement...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Continuer vers le paiement
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🆕 MODAL PAIEMENT MIXTE - Espèces + Mobile Money */}
      <AnimatePresence>
        {showMixedPaymentModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
            onClick={() => !isProcessing && setShowMixedPaymentModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <Split className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">Paiement Mixte</h3>
                    <p className="text-sm text-gray-600">Total : {ridePrice.toLocaleString()} CDF</p>
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

              {/* Form */}
              <div className="space-y-4">
                {/* Montant en espèces */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    💵 Montant en espèces (CDF)
                  </label>
                  <div className="relative">
                    <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="number"
                      value={cashAmount}
                      onChange={(e) => setCashAmount(e.target.value)}
                      placeholder="Exemple : 10000"
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={isProcessing}
                      min="1"
                      max={ridePrice - 1}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Montant que vous donnerez au conducteur
                  </p>
                </div>

                {/* Calcul automatique */}
                {cashAmountNum > 0 && cashAmountNum < ridePrice && (
                  <Card className="p-4 bg-gradient-to-r from-green-50 to-orange-50 border-2 border-dashed border-blue-300">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">💵 Espèces :</span>
                        <span className="font-semibold text-green-700">{cashAmountNum.toLocaleString()} CDF</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">📱 Mobile Money :</span>
                        <span className="font-semibold text-orange-700">{mobileMoneyAmount.toLocaleString()} CDF</span>
                      </div>
                      <div className="pt-2 border-t border-blue-200 flex justify-between items-center">
                        <span className="font-semibold text-gray-800">Total :</span>
                        <span className="text-lg font-bold text-blue-600">{ridePrice.toLocaleString()} CDF</span>
                      </div>
                    </div>
                  </Card>
                )}

                {/* Validation */}
                {cashAmountNum >= ridePrice && (
                  <Card className="p-3 bg-red-50 border-red-200">
                    <p className="text-xs text-red-800">
                      ⚠️ Le montant en espèces doit être inférieur au total. 
                      Utilisez le mode "Espèces" pour payer tout en cash.
                    </p>
                  </Card>
                )}

                {/* Sélection du réseau Mobile Money */}
                {cashAmountNum > 0 && cashAmountNum < ridePrice && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        📱 Réseau Mobile Money
                      </label>
                      <div className="space-y-2">
                        {MOBILE_MONEY_NETWORKS.map((network) => (
                          <motion.div
                            key={network.id}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setMixedNetwork(network)}
                          >
                            <Card 
                              className={`p-3 cursor-pointer transition-all ${
                                mixedNetwork?.id === network.id 
                                  ? 'border-2 border-green-500 bg-green-50' 
                                  : 'border hover:border-gray-300'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <div className={`w-8 h-8 ${network.color} rounded-full flex items-center justify-center text-lg`}>
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

                    {/* Numéro de téléphone */}
                    {mixedNetwork && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          📱 Numéro {mixedNetwork.name}
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
                          Pour payer {mobileMoneyAmount.toLocaleString()} CDF
                        </p>
                      </div>
                    )}
                  </>
                )}

                {/* Info */}
                <Card className="p-3 bg-blue-50 border-blue-200">
                  <p className="text-xs text-blue-800">
                    💡 <strong>Comment ça marche ?</strong><br/>
                    1. Donnez les espèces au conducteur<br/>
                    2. Sélectionnez votre réseau Mobile Money<br/>
                    3. Payez le reste via Mobile Money<br/>
                    4. La course sera finalisée une fois les deux paiements confirmés
                  </p>
                </Card>

                {/* Bouton */}
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
                      Traitement...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Confirmer le paiement mixte
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