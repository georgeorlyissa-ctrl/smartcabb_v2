import { useAppState } from '../../hooks/useAppState';
import { useEffect, useState } from 'react';
import { motion } from '../../lib/motion';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { sendSMS } from '../../lib/sms-service';
import {
  ArrowLeft,
  Wallet,
  AlertCircle,
  CheckCircle,
  Smartphone,
  Loader2,
  CreditCard,
} from '../../lib/icons';
import { toast } from '../../lib/toast';
import { useEjpayCheckout } from '../../hooks/useEjpayCheckout';
import { EjpayWaitingModal } from '../passenger/EjpayWaitingModal';
import { OperatorLogo } from '../shared/OperatorLogo';
import { getMinimumCreditForCategory } from '../../lib/pricing-config';

// ✅ Recharge simple : pas de forfait, pas de durée.
const MIN_RECHARGE = 5000;
const MAX_RECHARGE = 1_000_000;
const QUICK_AMOUNTS = [5000, 10000, 20000, 50000];

const formatCDF = (amount: number | null | undefined): string => {
  const safeAmount = Number(amount) || 0;
  return `${safeAmount.toLocaleString('fr-FR')} CDF`;
};

// Opérateurs Mobile Money (identifiants repris par lib/ejpay-service)
const DRIVER_NETWORKS = [
  { id: 'mpesa', name: 'M-Pesa (Vodacom)' },
  { id: 'orange_money', name: 'Orange Money' },
  { id: 'airtel_money', name: 'Airtel Money' },
  { id: 'afrimoney', name: 'Afrimoney (Africell)' },
];

// API backend (le portefeuille chauffeur vit dans le KV, côté serveur)
const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52`;
const API_HEADERS = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${publicAnonKey}`,
};

export function DriverWalletScreen() {
  const { setCurrentScreen, state } = useAppState();
  const currentDriver = state.currentDriver;
  const ejpay = useEjpayCheckout();

  const [payNetwork, setPayNetwork] = useState('mpesa');
  const [payPhone, setPayPhone] = useState('');
  const [amountInput, setAmountInput] = useState(String(MIN_RECHARGE));
  const [checkoutInfo, setCheckoutInfo] = useState<{
    amount: number;
    msisdn: string;
    operatorName: string;
  } | null>(null);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);

  const category = (currentDriver as any)?.vehicle?.category || 'smart_standard';
  const minimumCredit = getMinimumCreditForCategory(category);
  const eligible = walletBalance >= minimumCredit;
  const shortfall = Math.max(0, minimumCredit - walletBalance);

  const amount = Math.floor(Number(amountInput) || 0);
  const amountValid = amount >= MIN_RECHARGE && amount <= MAX_RECHARGE;
  const balanceAfter = walletBalance + (amountValid ? amount : 0);

  useEffect(() => {
    void loadWalletInfo();
  }, [currentDriver?.id]);

  const loadWalletInfo = async () => {
    if (!currentDriver?.id) {
      setLoading(false);
      return;
    }

    try {
      // Le portefeuille chauffeur vit côté serveur (KV) : on lit la fiche conducteur.
      const response = await fetch(`${API_BASE}/drivers/${currentDriver.id}`, {
        headers: API_HEADERS,
      });
      const data = await response.json();
      if (!response.ok || !data?.success || !data.driver) {
        throw new Error(data?.error || `Erreur ${response.status}`);
      }
      setWalletBalance(Number(data.driver.balance ?? data.driver.creditBalance ?? 0));
    } catch (error) {
      console.error('❌ Erreur chargement wallet:', error);
    } finally {
      setLoading(false);
    }
  };

  /** Relit le solde serveur après confirmation Ejpay (source de vérité). */
  const refreshBalance = async (expectedCredit: number) => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const response = await fetch(`${API_BASE}/drivers/${currentDriver!.id}`, {
          headers: API_HEADERS,
        });
        const data = await response.json();
        if (response.ok && data?.success && data.driver) {
          const balance = Number(data.driver.balance ?? data.driver.creditBalance ?? 0);
          setWalletBalance(balance);
          if (balance >= expectedCredit) return balance;
        }
      } catch (error) {
        console.error('❌ Erreur relecture du solde:', error);
      }
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
    return null;
  };

  const handleRecharge = async () => {
    if (!currentDriver) return;

    if (!amountValid) {
      toast.error(`Le montant doit être compris entre ${MIN_RECHARGE.toLocaleString('fr-FR')} et ${MAX_RECHARGE.toLocaleString('fr-FR')} CDF`);
      return;
    }

    const phone = (payPhone || currentDriver.phone || '').trim();
    if (phone.replace(/\D/g, '').length < 9) {
      toast.error('Numéro Mobile Money invalide');
      return;
    }

    setProcessingPayment(true);
    const operatorName = DRIVER_NETWORKS.find((n) => n.id === payNetwork)?.name || payNetwork;

    try {
      setCheckoutInfo({ amount, msisdn: phone, operatorName });

      // 💳 Ejpay : encaissement Mobile Money (validation sur le téléphone)
      const outcome = await ejpay.pay({
        amount,
        currency: 'CDF',
        driverId: currentDriver.id,
        method: 'mobile_money',
        customerEmail: currentDriver.email,
        customerPhone: phone,
        customerName: currentDriver.name,
        reference: `DRIVERWALLET_${currentDriver.id}_${Date.now()}`,
        description: `Recharge portefeuille chauffeur`,
        metadata: {
          type: 'driver_wallet_recharge',
          network: payNetwork,
        },
      });

      if (outcome.status === 'completed') {
        await refreshBalance(walletBalance + amount);
        toast.success(
          `Recharge de ${formatCDF(amount)} confirmée. Votre solde est à jour.`,
          { duration: 5000 },
        );

        if (currentDriver.phone) {
          try {
            await sendSMS({
              to: currentDriver.phone,
              message: `SmartCabb: Recharge reussie! +${amount.toLocaleString('fr-FR')} CDF sur votre compte chauffeur. Bonne route!`,
              type: 'payment_received',
            });
          } catch (error) {
            console.error('❌ Erreur envoi SMS de recharge:', error);
          }
        }

        setAmountInput(String(MIN_RECHARGE));
      } else if (outcome.status === 'timeout') {
        toast.info('Paiement en attente : votre compte sera crédité dès validation sur votre téléphone.');
      } else if (outcome.status === 'cancelled') {
        toast.info(outcome.message);
      } else {
        toast.error(outcome.message || 'Erreur lors du paiement');
      }
    } catch (error: any) {
      console.error('❌ Erreur recharge:', error);
      toast.error('Erreur lors de la recharge');
    } finally {
      setProcessingPayment(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50"
    >
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
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentScreen('driver-dashboard')}
              className="p-2"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl">Mon Portefeuille</h1>
              <p className="text-sm text-gray-600">Rechargez pour recevoir des courses</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6 max-w-2xl mx-auto">
        {/* Solde + éligibilité */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className={`p-6 ${eligible ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${eligible ? 'bg-green-100' : 'bg-red-100'}`}>
                  <Wallet className={`w-6 h-6 ${eligible ? 'text-green-600' : 'text-red-600'}`} />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Solde actuel</p>
                  <h2 className="text-3xl">{formatCDF(walletBalance)}</h2>
                </div>
              </div>

              <Badge variant={eligible ? 'default' : 'destructive'} className="text-sm px-4 py-2">
                {eligible ? (
                  <><CheckCircle className="w-4 h-4 mr-2" /> Éligible</>
                ) : (
                  <><AlertCircle className="w-4 h-4 mr-2" /> Non éligible</>
                )}
              </Badge>
            </div>

            <p className={`text-sm ${eligible ? 'text-green-700' : 'text-red-700'}`}>
              {eligible
                ? 'Vous pouvez activer « En ligne » et recevoir des courses.'
                : `Il manque ${formatCDF(shortfall)} pour être éligible. Crédit minimum requis : ${formatCDF(minimumCredit)}.`}
            </p>

            <p className="text-xs text-gray-500 mt-2">
              Le crédit est débité de la commission à chaque course. Dès qu'il repasse sous le minimum,
              vous êtes automatiquement mis hors ligne : rechargez pour redevenir éligible.
            </p>
          </Card>
        </motion.div>

        {/* Formulaire de recharge */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="p-5 space-y-5">
            <div>
              <h3 className="text-lg mb-1">Recharger mon compte</h3>
              <p className="text-sm text-gray-600">
                Montant minimum : {formatCDF(MIN_RECHARGE)}. Le montant est crédité dès la validation
                sur votre téléphone.
              </p>
            </div>

            {/* Montant */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">
                Montant à recharger
              </label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value.replace(/\D/g, '').slice(0, 7))}
                  placeholder="5000"
                  className={`w-full rounded-xl border-2 px-4 py-4 pr-16 text-2xl font-semibold focus:outline-none ${
                    amountInput.length === 0
                      ? 'border-gray-200 focus:border-blue-500'
                      : amountValid
                        ? 'border-blue-500'
                        : 'border-red-300 focus:border-red-400'
                  }`}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-500">
                  CDF
                </span>
              </div>

              <div className="grid grid-cols-4 gap-2 mt-3">
                {QUICK_AMOUNTS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setAmountInput(String(value))}
                    className={`rounded-lg border py-2 text-sm font-medium transition-colors ${
                      amount === value
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300'
                    }`}
                  >
                    {value.toLocaleString('fr-FR')}
                  </button>
                ))}
              </div>

              {amountInput.length > 0 && !amountValid && (
                <p className="text-xs text-red-600 mt-2">
                  Le montant doit être compris entre {MIN_RECHARGE.toLocaleString('fr-FR')} et{' '}
                  {MAX_RECHARGE.toLocaleString('fr-FR')} CDF.
                </p>
              )}

              {amountValid && (
                <p className="text-xs text-gray-600 mt-2">
                  Nouveau solde après recharge : <strong>{formatCDF(balanceAfter)}</strong>
                  {balanceAfter >= minimumCredit ? ' — vous serez éligible aux courses.' : ''}
                </p>
              )}
            </div>

            {/* Opérateur + numéro */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Paiement Mobile Money</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-11 h-10 shrink-0 flex items-center justify-center rounded-lg border border-gray-200 bg-white p-1">
                    <OperatorLogo
                      network={payNetwork}
                      name={DRIVER_NETWORKS.find((n) => n.id === payNetwork)?.name}
                      height={22}
                    />
                  </div>
                  <select
                    value={payNetwork}
                    onChange={(e) => setPayNetwork(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-800 bg-white"
                  >
                    {DRIVER_NETWORKS.map((n) => (
                      <option key={n.id} value={n.id}>{n.name}</option>
                    ))}
                  </select>
                </div>
                <input
                  type="tel"
                  inputMode="tel"
                  value={payPhone}
                  onChange={(e) => setPayPhone(e.target.value)}
                  placeholder={currentDriver?.phone || '0812345678'}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-800 bg-white"
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Le numéro qui recevra la demande de validation (laisser vide pour utiliser votre numéro
                de compte : {currentDriver?.phone || '—'}).
              </p>
            </div>

            <Button
              onClick={handleRecharge}
              disabled={processingPayment || ejpay.isBusy || !amountValid}
              className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white"
              size="lg"
            >
              {processingPayment || ejpay.isBusy ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Traitement en cours...
                </>
              ) : (
                <>
                  <CreditCard className="w-5 h-5 mr-2" />
                  Recharger {amountValid ? formatCDF(amount) : ''}
                </>
              )}
            </Button>

            <p className="text-xs text-center text-gray-500">
              <Smartphone className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
              Paiement sécurisé via M-Pesa, Orange Money, Airtel Money ou Afrimoney. Aucune popup :
              validez directement sur votre téléphone.
            </p>
          </Card>
        </motion.div>

        {/* Rappel fonctionnement */}
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
            <div className="text-sm text-blue-900">
              <p className="font-medium mb-1">Comment ça marche ?</p>
              <ol className="list-decimal list-inside space-y-1 text-xs">
                <li>Saisissez le montant (minimum {formatCDF(MIN_RECHARGE)}).</li>
                <li>Choisissez votre opérateur et validez la demande sur votre téléphone.</li>
                <li>Le crédit est ajouté automatiquement à votre portefeuille.</li>
                <li>Activez « En ligne » sur le tableau de bord pour recevoir des courses.</li>
              </ol>
            </div>
          </div>
        </Card>
      </div>
    </motion.div>
  );
}
