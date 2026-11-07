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
  TrendingUp,
  DollarSign,
  Calendar,
  CreditCard,
  Wallet,
  AlertCircle,
  CheckCircle,
  Clock,
  Gift,
  FileText,
  Smartphone,
  Loader2
} from '../../lib/icons';
import { toast } from '../../lib/toast';
import { useEjpayCheckout } from '../../hooks/useEjpayCheckout';
import { EjpayWaitingModal } from '../passenger/EjpayWaitingModal';

// ✅ v517.77 - Helper pour formater les montants CDF de manière sécurisée
const formatCDF = (amount: number | null | undefined): string => {
  const safeAmount = Number(amount) || 0;
  return `${safeAmount.toLocaleString('fr-FR')} CDF`;
};

// Forfaits de recharge du wallet chauffeur
export interface WalletPackage {
  id: string;
  name: string;
  description: string;
  amount: number;
  days: number;
  popular?: boolean;
  discount?: number;
}

const WALLET_PACKAGES: WalletPackage[] = [
  {
    id: 'starter_7',
    name: 'Starter',
    description: 'Pour découvrir la plateforme',
    amount: 5000,
    days: 7,
  },
  {
    id: 'standard_14',
    name: 'Standard',
    description: 'Le choix de la majorité des chauffeurs',
    amount: 9000,
    days: 14,
    popular: true,
    discount: 10,
  },
  {
    id: 'pro_30',
    name: 'Pro',
    description: 'Un mois complet, sans interruption',
    amount: 15000,
    days: 30,
    discount: 30,
  },
];

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
  // 💳 Paiement Mobile Money (Ejpay) du forfait chauffeur
  const ejpay = useEjpayCheckout();
  const [payNetwork, setPayNetwork] = useState('mpesa');
  const [payPhone, setPayPhone] = useState('');
  const [checkoutInfo, setCheckoutInfo] = useState<{
    amount: number;
    msisdn: string;
    operatorName: string;
  } | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<WalletPackage | null>(null);
  const [walletInfo, setWalletInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  // Statistiques post-payé : aucune route publique ne les expose pour l'instant.
  const [postpaidStats] = useState({
    pending_amount: 0,
    approved_amount: 0,
    paid_amount: 0,
    total_count: 0,
    pending_count: 0,
    approved_count: 0,
  });

  useEffect(() => {
    loadWalletInfo();
  }, [currentDriver?.id]);

  const loadWalletInfo = async () => {
    if (!currentDriver?.id) {
      setLoading(false);
      return;
    }

    try {
      // Le portefeuille chauffeur vit côté serveur (KV) : on lit la fiche conducteur
      const response = await fetch(`${API_BASE}/drivers/${currentDriver.id}`, {
        headers: API_HEADERS,
      });
      const data = await response.json();
      if (!response.ok || !data?.success || !data.driver) {
        throw new Error(data?.error || `Erreur ${response.status}`);
      }

      const driver = data.driver;
      setWalletInfo((prev: any) => ({
        wallet_balance: Number(driver.balance ?? driver.creditBalance ?? 0),
        wallet_expiry_date: driver.wallet_expiry_date ?? prev?.wallet_expiry_date ?? null,
        is_available: Boolean(driver.is_available ?? driver.isOnline ?? false),
      }));
    } catch (error) {
      console.error('❌ Erreur chargement wallet:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRecharge = async () => {
    if (!selectedPackage || !currentDriver) {
      toast.error('Veuillez sélectionner un forfait');
      return;
    }

    setProcessingPayment(true);

    try {
      console.log('💳 Démarrage recharge:', selectedPackage);

      const phone = (payPhone || currentDriver.phone || '').trim();
      if (phone.replace(/\D/g, '').length < 9) {
        toast.error('Numéro Mobile Money invalide');
        setProcessingPayment(false);
        return;
      }

      // 💳 Ejpay : encaissement Mobile Money (validation sur le téléphone)
      const paymentData = {
        amount: selectedPackage.amount,
        currency: 'CDF' as const,
        driverId: currentDriver.id,
        method: 'mobile_money' as const,
        customerEmail: currentDriver.email,
        customerPhone: phone,
        customerName: currentDriver.name,
        reference: `DRIVERWALLET_${currentDriver.id}_${Date.now()}`,
        description: `Forfait chauffeur ${selectedPackage.days} jours`,
        metadata: {
          type: 'driver_wallet_recharge',
          packageId: selectedPackage.id,
          days: selectedPackage.days,
          network: payNetwork,
        },
      };

      setCheckoutInfo({
        amount: selectedPackage.amount,
        msisdn: phone,
        operatorName: DRIVER_NETWORKS.find((n) => n.id === payNetwork)?.name || payNetwork,
      });

      const outcome = await ejpay.pay(paymentData);

      if (outcome.status === 'completed') {
        await activateWallet(selectedPackage);
      } else if (outcome.status === 'timeout') {
        toast.info('Paiement en attente : le forfait sera activé dès confirmation.');
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

  const activateWallet = async (pkg: WalletPackage) => {
    if (!currentDriver?.id) return;

    try {
      // Le crédit est appliqué côté serveur au règlement Ejpay (driver_wallet_topup) :
      // on relit la fiche conducteur, source de vérité (solde + expiration du forfait).
      const response = await fetch(`${API_BASE}/drivers/${currentDriver.id}`, {
        headers: API_HEADERS,
      });
      const data = await response.json();
      if (!response.ok || !data?.success || !data.driver) {
        throw new Error(data?.error || `Lecture du solde impossible (${response.status})`);
      }

      const driver = data.driver;
      const newBalance = Number(driver.balance ?? driver.creditBalance ?? 0);
      const serverExpiry = driver.wallet_expiry_date ? new Date(driver.wallet_expiry_date) : null;
      const fallbackExpiry = new Date();
      fallbackExpiry.setDate(fallbackExpiry.getDate() + pkg.days);
      const newExpiry = serverExpiry ?? fallbackExpiry;

      setWalletInfo({
        wallet_balance: newBalance,
        wallet_expiry_date: newExpiry.toISOString(),
        is_available: true,
      });

      // Historique de session (l'API n'expose pas la liste des mouvements)
      setTransactions((prev) => [
        {
          id: `local_${Date.now()}`,
          amount: pkg.amount,
          type: 'recharge',
          package_name: pkg.name,
          days_added: pkg.days,
          status: 'completed',
          payment_method: 'mobile_money',
          created_at: new Date().toISOString(),
        },
        ...prev,
      ].slice(0, 10));

      toast.success(
        `Recharge réussie ! Votre compte est actif jusqu'au ${newExpiry.toLocaleDateString('fr-FR')}`,
        { duration: 5000 },
      );

      // 📱 Envoyer SMS de confirmation de recharge
      if (currentDriver?.phone) {
        try {
          await sendSMS({
            to: currentDriver.phone,
            message: `SmartCabb: Recharge reussie! ${pkg.amount.toLocaleString()} CDF (${pkg.name}). Votre compte est actif jusqu'au ${newExpiry.toLocaleDateString('fr-FR')}. Bonne route!`,
            type: 'payment_received',
          });
          console.log('✅ SMS de confirmation de recharge envoyé');
        } catch (error) {
          console.error('❌ Erreur envoi SMS de recharge:', error);
        }
      }

      setSelectedPackage(null);
    } catch (error) {
      console.error('❌ Erreur activation wallet:', error);
      toast.error(
        error instanceof Error ? error.message : 'Erreur lors de l\'activation du compte',
      );
    }
  };

  const isExpired = () => {
    if (!walletInfo?.wallet_expiry_date) return true;
    return new Date(walletInfo.wallet_expiry_date) < new Date();
  };

  const getDaysRemaining = () => {
    if (!walletInfo?.wallet_expiry_date) return 0;
    const expiry = new Date(walletInfo.wallet_expiry_date);
    const now = new Date();
    const diff = expiry.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const daysRemaining = getDaysRemaining();
  const expired = isExpired();

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
              <p className="text-sm text-gray-600">Rechargez votre compte conducteur</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6 max-w-4xl mx-auto">
        {/* Statut du compte */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className={`p-6 ${expired ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${expired ? 'bg-red-100' : 'bg-green-100'}`}>
                  <Wallet className={`w-6 h-6 ${expired ? 'text-red-600' : 'text-green-600'}`} />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Solde actuel</p>
                  <h2 className="text-3xl">{formatCDF(walletInfo?.wallet_balance)}</h2>
                </div>
              </div>
              
              <Badge variant={expired ? 'destructive' : 'default'} className="text-sm px-4 py-2">
                {expired ? (
                  <><AlertCircle className="w-4 h-4 mr-2" /> Expiré</>
                ) : (
                  <><CheckCircle className="w-4 h-4 mr-2" /> Actif</>
                )}
              </Badge>
            </div>

            <div className="flex items-center space-x-2 text-sm">
              <Calendar className="w-4 h-4 text-gray-500" />
              {expired ? (
                <span className="text-red-600">Compte expiré - Rechargez pour continuer</span>
              ) : (
                <span className="text-green-600">
                  Expire dans {daysRemaining} jour{daysRemaining > 1 ? 's' : ''} ({new Date(walletInfo.wallet_expiry_date).toLocaleDateString('fr-FR')})
                </span>
              )}
            </div>

            {daysRemaining > 0 && daysRemaining <= 3 && (
              <div className="mt-4 p-3 bg-yellow-100 rounded-lg flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-yellow-600" />
                <span className="text-sm text-yellow-800">
                  Votre compte expire bientôt. Rechargez maintenant pour éviter l'interruption.
                </span>
              </div>
            )}
          </Card>
        </motion.div>

        {/* Montants Post-Payés en Temps Réel */}
        {postpaidStats.total_count > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h3 className="text-lg mb-4 flex items-center">
              <DollarSign className="w-5 h-5 mr-2 text-orange-600" />
              Revenus Post-Payés
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* En attente de validation */}
              {postpaidStats.pending_count > 0 && (
                <Card className="p-4 border-2 border-yellow-200 bg-yellow-50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-5 h-5 text-yellow-600" />
                      <span className="text-sm text-yellow-800">En attente</span>
                    </div>
                    <Badge variant="secondary" className="bg-yellow-200 text-yellow-800">
                      {postpaidStats.pending_count}
                    </Badge>
                  </div>
                  <div className="text-2xl text-yellow-900">
                    {formatCDF(postpaidStats.pending_amount)}
                  </div>
                  <p className="text-xs text-yellow-700 mt-1">
                    En attente de validation admin
                  </p>
                </Card>
              )}

              {/* Approuvé - en attente de paiement */}
              {postpaidStats.approved_count > 0 && (
                <Card className="p-4 border-2 border-orange-200 bg-orange-50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <FileText className="w-5 h-5 text-orange-600" />
                      <span className="text-sm text-orange-800">Approuvé</span>
                    </div>
                    <Badge variant="secondary" className="bg-orange-200 text-orange-800">
                      {postpaidStats.approved_count}
                    </Badge>
                  </div>
                  <div className="text-2xl text-orange-900">
                    {postpaidStats.approved_amount.toLocaleString()} CDF
                  </div>
                  <p className="text-xs text-orange-700 mt-1">
                    À recevoir du passager
                  </p>
                </Card>
              )}

              {/* Payé */}
              <Card className="p-4 border-2 border-green-200 bg-green-50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-sm text-green-800">Payé</span>
                  </div>
                  <Badge variant="secondary" className="bg-green-200 text-green-800">
                    Total
                  </Badge>
                </div>
                <div className="text-2xl text-green-900">
                  {postpaidStats.paid_amount.toLocaleString()} CDF
                </div>
                <p className="text-xs text-green-700 mt-1">
                  Revenus post-payés reçus
                </p>
              </Card>
            </div>

            {/* Total à recevoir */}
            {(postpaidStats.pending_amount + postpaidStats.approved_amount) > 0 && (
              <Card className="p-4 mt-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm opacity-90">Total à recevoir</p>
                    <h3 className="text-3xl">
                      {(postpaidStats.pending_amount + postpaidStats.approved_amount).toLocaleString()} CDF
                    </h3>
                    <p className="text-xs opacity-75 mt-1">
                      {postpaidStats.pending_count + postpaidStats.approved_count} course{(postpaidStats.pending_count + postpaidStats.approved_count) > 1 ? 's' : ''} en post-payé
                    </p>
                  </div>
                  <TrendingUp className="w-12 h-12 opacity-50" />
                </div>
              </Card>
            )}

            {/* Info Post-Payé */}
            <Card className="p-4 mt-4 bg-orange-50 border-orange-200">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5" />
                <div className="text-sm text-orange-800">
                  <p className="mb-1">
                    <strong>À propos des revenus post-payés :</strong>
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li><strong>En attente</strong> : L'admin doit valider la demande de paiement différé</li>
                    <li><strong>Approuvé</strong> : Le passager a un délai pour payer (inclut 15% d'intérêt)</li>
                    <li><strong>Payé</strong> : Vous avez reçu le montant sur votre compte</li>
                  </ul>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Forfaits de recharge */}
        <div>
          <h3 className="text-lg mb-4 flex items-center">
            <Gift className="w-5 h-5 mr-2 text-blue-600" />
            Choisissez votre forfait
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {WALLET_PACKAGES.map((pkg) => (
              <motion.div
                key={pkg.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Card
                  className={`p-6 cursor-pointer transition-all relative ${
                    selectedPackage?.id === pkg.id
                      ? 'border-2 border-blue-500 shadow-lg bg-blue-50'
                      : 'border border-gray-200 hover:border-blue-300 hover:shadow-md'
                  }`}
                  onClick={() => setSelectedPackage(pkg)}
                >
                  {pkg.popular && (
                    <Badge className="absolute -top-2 -right-2 bg-gradient-to-r from-yellow-400 to-orange-500">
                      ⭐ Populaire
                    </Badge>
                  )}
                  
                  {pkg.discount && (
                    <Badge variant="secondary" className="absolute -top-2 -left-2 bg-green-500 text-white">
                      -{pkg.discount}%
                    </Badge>
                  )}

                  <div className="mb-4">
                    <h4 className="text-xl mb-1">{pkg.name}</h4>
                    <p className="text-sm text-gray-600">{pkg.description}</p>
                  </div>

                  <div className="mb-4">
                    <div className="text-3xl text-blue-600 mb-1">
                      {pkg.amount.toLocaleString()} CDF
                    </div>
                    {pkg.discount && (
                      <div className="text-sm text-gray-500 line-through">
                        {Math.round(pkg.amount / (1 - pkg.discount / 100)).toLocaleString()} CDF
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2 text-gray-600">
                      <Clock className="w-4 h-4" />
                      <span>{pkg.days} jours</span>
                    </div>
                    
                    <div className="flex items-center space-x-2 text-green-600">
                      <TrendingUp className="w-4 h-4" />
                      <span>{Math.round(pkg.amount / pkg.days).toLocaleString()} CDF/jour</span>
                    </div>
                  </div>

                  {selectedPackage?.id === pkg.id && (
                    <div className="mt-4 pt-4 border-t border-blue-200">
                      <div className="flex items-center justify-center text-blue-600">
                        <CheckCircle className="w-5 h-5 mr-2" />
                        <span className="text-sm">Forfait sélectionné</span>
                      </div>
                    </div>
                  )}
                </Card>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Bouton de paiement */}
        {selectedPackage && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="p-6 bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm opacity-90">Vous allez payer</p>
                  <h3 className="text-2xl">{selectedPackage.amount.toLocaleString()} CDF</h3>
                </div>
                <Smartphone className="w-12 h-12 opacity-50" />
              </div>

              {/* Opérateur + numéro Mobile Money */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <select
                  value={payNetwork}
                  onChange={(e) => setPayNetwork(e.target.value)}
                  className="w-full rounded-lg px-2 py-2 text-sm text-gray-800 bg-white"
                >
                  {DRIVER_NETWORKS.map((n) => (
                    <option key={n.id} value={n.id}>{n.name}</option>
                  ))}
                </select>
                <input
                  type="tel"
                  value={payPhone}
                  onChange={(e) => setPayPhone(e.target.value)}
                  placeholder={currentDriver?.phone || '0812345678'}
                  className="w-full rounded-lg px-2 py-2 text-sm text-gray-800 bg-white"
                />
              </div>

              <Button
                onClick={handleRecharge}
                disabled={processingPayment || ejpay.isBusy}
                className="w-full h-14 bg-white text-blue-600 hover:bg-gray-100"
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
                    Payer avec Mobile Money
                  </>
                )}
              </Button>

              <p className="text-xs text-center mt-3 opacity-75">
                Paiement sécurisé via M-Pesa, Airtel Money, Orange Money ou Afrimoney
              </p>
            </Card>
          </motion.div>
        )}

        {/* Historique des transactions */}
        {transactions.length > 0 && (
          <div>
            <h3 className="text-lg mb-4">Historique des recharges</h3>
            <Card className="divide-y">
              {transactions.map((tx) => (
                <div key={tx.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      tx.status === 'completed' ? 'bg-green-100' : 'bg-gray-100'
                    }`}>
                      {tx.status === 'completed' ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <Clock className="w-5 h-5 text-gray-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{tx.package_name}</p>
                      <p className="text-sm text-gray-600">
                        {new Date(tx.created_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-green-600">
                      +{tx.amount.toLocaleString()} CDF
                    </p>
                    <p className="text-xs text-gray-600">
                      +{tx.days_added} jours
                    </p>
                  </div>
                </div>
              ))}
            </Card>
          </div>
        )}

        {/* Info */}
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="mb-2">
                <strong>Comment ça marche ?</strong>
              </p>
              <ol className="list-decimal list-inside space-y-1 text-xs">
                <li>Choisissez votre forfait préféré</li>
                <li>Cliquez sur "Payer avec Mobile Money"</li>
                <li>Validez le paiement sur votre téléphone</li>
                <li>Votre compte est automatiquement activé</li>
                <li>Commencez à recevoir des courses !</li>
              </ol>
            </div>
          </div>
        </Card>
      </div>
    </motion.div>
  );
}