import { useAppState } from '../../hooks/useAppState';
import { useState } from 'react';
import { 
  ArrowLeft, 
  Plus, 
  TrendingUp, 
  DollarSign, 
  Calendar,
  CreditCard,
  History,
  Wallet,
  AlertCircle,
  RefreshCw,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  Clock,
  Filter,
  Search,
  ChevronRight,
  Info,
  Download
} from '../../lib/icons';
import { toast } from '../../lib/toast';

// ✅ v517.77 - Helper pour formater les montants CDF de manière sécurisée
const formatCDF = (amount: number | null | undefined): string => {
  const safeAmount = Number(amount) || 0;
  return `${safeAmount.toLocaleString('fr-FR')} CDF`;
};

export function DriverWalletScreen() {
  const { setCurrentScreen, currentDriver } = useAppState();
  const { initiatePayment, loading: paymentLoading } = usePayment();
  const [selectedPackage, setSelectedPackage] = useState<WalletPackage | null>(null);
  const [walletInfo, setWalletInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [postpaidStats, setPostpaidStats] = useState({
    pending_amount: 0,
    approved_amount: 0,
    paid_amount: 0,
    total_count: 0,
    pending_count: 0,
    approved_count: 0,
  });

  useEffect(() => {
    loadWalletInfo();
    loadTransactions();
    loadPostpaidStats();
    
    // Rafraîchir les stats toutes les 30 secondes
    const interval = setInterval(() => {
      loadPostpaidStats();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [currentDriver?.id]);

  const loadWalletInfo = async () => {
    if (!currentDriver?.id) return;

    try {
      // Récupérer les infos du driver
      const { data: driverData, error } = await supabase
        .from('drivers')
        .select('wallet_balance, wallet_expiry_date, is_available')
        .eq('id', currentDriver.id)
        .single();

      if (error) throw error;

      setWalletInfo(driverData);
    } catch (error) {
      console.error('❌ Erreur chargement wallet:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async () => {
    if (!currentDriver?.id) return;

    try {
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('driver_id', currentDriver.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('❌ Erreur chargement transactions:', error);
    }
  };
  
  const loadPostpaidStats = async () => {
    if (!currentDriver?.id) return;

    try {
      // Récupérer les demandes de post-paiement pour ce conducteur
      const { data, error } = await supabase
        .from('postpaid_requests')
        .select('*')
        .eq('driver_id', currentDriver.id);

      if (error) throw error;

      // Calculer les statistiques
      const stats = {
        pending_amount: 0,
        approved_amount: 0,
        paid_amount: 0,
        total_count: data?.length || 0,
        pending_count: 0,
        approved_count: 0,
      };

      data?.forEach((request) => {
        if (request.status === 'pending') {
          stats.pending_amount += request.total_amount;
          stats.pending_count++;
        } else if (request.status === 'approved') {
          stats.approved_amount += request.remaining_balance;
          stats.approved_count++;
        } else if (request.status === 'paid') {
          stats.paid_amount += request.total_amount;
        }
      });

      setPostpaidStats(stats);
    } catch (error) {
      console.error('❌ Erreur chargement stats post-payé:', error);
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

      // Initialiser le paiement Flutterwave
      const paymentData = {
        amount: selectedPackage.amount,
        currency: 'CDF' as const,
        rideId: `WALLET_${currentDriver.id}_${Date.now()}`,
        passengerId: currentDriver.id,
        driverId: currentDriver.id,
        method: 'mobile_money' as const,
        customerEmail: currentDriver.email,
        customerPhone: currentDriver.phone || '+243000000000',
        customerName: currentDriver.name,
        metadata: {
          type: 'wallet_recharge',
          packageId: selectedPackage.id,
          days: selectedPackage.days
        }
      };

      const result = await initiatePayment(paymentData);

      if (result.success) {
        if (result.redirectUrl) {
          // Ouvrir Flutterwave
          toast.info('Complétez le paiement dans la fenêtre qui s\'ouvre');
          window.open(result.redirectUrl, '_blank');

          // Simuler l'activation après paiement (en production, utiliser webhook)
          setTimeout(async () => {
            await activateWallet(selectedPackage);
          }, 15000); // 15 secondes
        } else {
          // Paiement immédiat (CASH ou autre)
          await activateWallet(selectedPackage);
        }
      } else {
        toast.error(result.message || 'Erreur lors du paiement');
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
      // Calculer la nouvelle date d'expiration
      const currentExpiry = walletInfo?.wallet_expiry_date 
        ? new Date(walletInfo.wallet_expiry_date) 
        : new Date();
      
      const now = new Date();
      const startDate = currentExpiry > now ? currentExpiry : now;
      const newExpiry = new Date(startDate);
      newExpiry.setDate(newExpiry.getDate() + pkg.days);

      // Mettre à jour le wallet
      const { error: updateError } = await supabase
        .from('drivers')
        .update({
          wallet_balance: (walletInfo?.wallet_balance || 0) + pkg.amount,
          wallet_expiry_date: newExpiry.toISOString(),
          is_available: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentDriver.id);

      if (updateError) throw updateError;

      // Enregistrer la transaction
      const { error: txError } = await supabase
        .from('wallet_transactions')
        .insert({
          driver_id: currentDriver.id,
          amount: pkg.amount,
          type: 'recharge',
          package_id: pkg.id,
          package_name: pkg.name,
          days_added: pkg.days,
          status: 'completed',
          payment_method: 'mobile_money'
        });

      if (txError) throw txError;

      // Créer une notification pour l'admin
      const { error: notifError } = await supabase
        .from('admin_notifications')
        .insert({
          type: 'wallet_recharge',
          title: 'Nouvelle recharge de wallet',
          message: `${currentDriver.name} a rechargé son wallet de ${pkg.amount.toLocaleString()} CDF (${pkg.name})`,
          driver_id: currentDriver.id,
          amount: pkg.amount,
          read: false,
          metadata: {
            driverName: currentDriver.name,
            driverPhone: currentDriver.phone,
            packageName: pkg.name,
            packageAmount: pkg.amount,
            packageDays: pkg.days,
            newExpiryDate: newExpiry.toISOString(),
            activatedAutomatically: true
          }
        });

      if (notifError) {
        console.warn('⚠️ Erreur création notification admin:', notifError);
      }

      // Recharger les données
      await loadWalletInfo();
      await loadTransactions();

      toast.success(`Recharge réussie ! Votre compte est actif jusqu'au ${newExpiry.toLocaleDateString('fr-FR')}`, {
        duration: 5000
      });

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
      toast.error('Erreur lors de l\'activation du compte');
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

              <Button
                onClick={handleRecharge}
                disabled={processingPayment || paymentLoading}
                className="w-full h-14 bg-white text-blue-600 hover:bg-gray-100"
                size="lg"
              >
                {processingPayment || paymentLoading ? (
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
                Paiement sécurisé via M-Pesa, Airtel Money ou Orange Money
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
                <li>Complétez le paiement sur Flutterwave</li>
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