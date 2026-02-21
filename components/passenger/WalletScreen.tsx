import { useState, useEffect } from 'react';
import { useAppState } from '../../hooks/useAppState';
import { walletService } from '../../lib/wallet-service';
import { toast } from '../../lib/toast';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { getExchangeRate, convertUSDtoCDF, formatCDF } from '../../lib/pricing';
import { WalletTransaction } from '../../types';
import { RechargeModal } from './RechargeModal';
import { DebugPaymentModal } from '../DebugPaymentModal';
import { Button } from '../ui/button';
import { motion } from '../../lib/motion'; // ✅ FIX: Utiliser l'implémentation locale

// Icônes
import { 
  ArrowLeft, 
  Wallet, 
  Gift, 
  Plus, 
  TrendingUp, 
  Check, 
  Clock, 
  DollarSign,
  Bug,
  RefreshCw
} from '../../lib/icons';

export function WalletScreen() {
  const { setCurrentScreen, state, updateUser } = useAppState();
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [showDebugModal, setShowDebugModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const walletBalance = state.currentUser?.walletBalance || 0;
  const walletBalanceUSD = walletBalance / getExchangeRate();
  const transactions = state.currentUser?.walletTransactions || [];

  // 🎁 Vérifier si le client bénéficie de la réduction de 5%
  const hasDiscount = walletBalanceUSD >= 20;
  const discountThresholdCDF = convertUSDtoCDF(20);

  const handleRechargeSuccess = (amountCDF: number, txId: string, method: 'mobile_money' | 'cash') => {
    if (!state.currentUser) return;

    // Pour les paiements en espèces, créer une transaction "pending"
    if (method === 'cash') {
      const amountUSD = amountCDF / getExchangeRate();

      // Créer la transaction avec statut "pending"
      const transaction: WalletTransaction = {
        id: txId,
        type: 'recharge',
        amount: amountCDF,
        method: method,
        status: 'pending', // 🔶 Statut en attente
        description: `Recharge Espèces (En attente) - ${amountUSD.toFixed(2)}$ USD`,
        timestamp: new Date(),
        balanceAfter: walletBalance, // Le solde ne change pas tant que c'est pending
        userId: state.currentUser!.id,
        userName: state.currentUser!.name,
        userPhone: state.currentUser!.phone
      };

      // Ajouter la transaction à l'historique SANS modifier le solde
      const updatedTransactions = [transaction, ...transactions];
      
      const updatedUser = {
        ...state.currentUser!,
        walletTransactions: updatedTransactions
      };

      updateUser(updatedUser);

      // 🆕 Sauvegarder dans la liste globale pour l'admin
      saveUserToGlobalList(updatedUser);

      console.log('⏳ Recharge espèces en attente:', {
        montant: `${amountUSD.toFixed(2)}$ USD (${amountCDF.toLocaleString()} CDF)`,
        statut: 'En attente de validation admin',
        soldeInchangé: formatCDF(walletBalance)
      });
      
      toast.info(`Demande de recharge de ${formatCDF(amountCDF)} enregistrée. En attente de validation.`);
      return;
    }

    // Pour Mobile Money, traiter normalement (paiement immédiat)
    const newBalance = walletBalance + amountCDF;
    const amountUSD = amountCDF / getExchangeRate();

    // Créer la transaction
    const transaction: WalletTransaction = {
      id: txId,
      type: 'recharge',
      amount: amountCDF,
      method: method,
      status: 'approved', // ✅ Statut approuvé immédiatement pour Mobile Money
      description: `Recharge ${method === 'mobile_money' ? 'Mobile Money (Flutterwave)' : 'Espèces'} - ${amountUSD.toFixed(2)}$ USD`,
      timestamp: new Date(),
      balanceAfter: newBalance,
      approvedAt: new Date()
    };

    // Mettre à jour le solde et l'historique
    const updatedTransactions = [transaction, ...transactions];
    
    const updatedUser = {
      ...state.currentUser!,
      walletBalance: newBalance,
      walletTransactions: updatedTransactions
    };

    updateUser(updatedUser);

    // 🆕 Sauvegarder dans la liste globale pour l'admin
    saveUserToGlobalList(updatedUser);

    console.log('💰 Recharge effectuée:', {
      montant: `${amountUSD.toFixed(2)}$ USD (${amountCDF.toLocaleString()} CDF)`,
      méthode: method,
      nouveauSolde: `${formatCDF(newBalance)}`,
      réductionActivée: newBalance >= discountThresholdCDF
    });
    
    toast.success(`Recharge de ${formatCDF(amountCDF)} réussie ! 🎉`);
  };

  // 🆕 Fonction pour sauvegarder l'utilisateur dans la liste globale
  const saveUserToGlobalList = (user: any) => {
    try {
      const allUsersStr = localStorage.getItem('smartcab_all_users') || '[]';
      const allUsers = JSON.parse(allUsersStr);
      
      // Trouver et mettre à jour l'utilisateur, ou l'ajouter s'il n'existe pas
      const userIndex = allUsers.findIndex((u: any) => u.id === user.id);
      if (userIndex >= 0) {
        allUsers[userIndex] = user;
      } else {
        allUsers.push(user);
      }
      
      localStorage.setItem('smartcab_all_users', JSON.stringify(allUsers));
      console.log('💾 Utilisateur sauvegardé dans la liste globale');
    } catch (error) {
      console.error('❌ Erreur lors de la sauvegarde de l\'utilisateur:', error);
    }
  };

  const formatTransactionDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'À l\'instant';
    if (minutes < 60) return `Il y a ${minutes} min`;
    if (hours < 24) return `Il y a ${hours}h`;
    return `Il y a ${days}j`;
  };

  // 🔄 Fonction pour rafraîchir le solde depuis le KV store
  const refreshBalance = async () => {
    if (!state.currentUser) return;
    
    setRefreshing(true);
    try {
      console.log('🔄 Rafraîchissement du solde depuis le KV store...');
      
      const result = await walletService.getPassengerBalance(state.currentUser.id);
      
      if (result.success) {
        console.log('✅ Nouveau solde récupéré:', result.balance);
        
        // Mettre à jour le solde de l'utilisateur
        const updatedUser = {
          ...state.currentUser,
          walletBalance: result.balance
        };
        
        updateUser(updatedUser);
        toast.success('Solde mis à jour !');
      } else {
        console.warn('⚠️ Erreur récupération solde:', result.error);
      }
    } catch (error) {
      console.error('❌ Erreur rafraîchissement solde:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // 🆕 Fonction pour rafraîchir les transactions depuis le backend
  const refreshTransactions = async () => {
    if (!state.currentUser) return;
    
    try {
      console.log('🔄 Rafraîchissement des transactions depuis le backend...');
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/wallet/transactions/${state.currentUser.id}`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        const backendTransactions = data.transactions || [];
        
        console.log(`✅ ${backendTransactions.length} transactions récupérées depuis le backend`);
        
        // Mettre à jour les transactions de l'utilisateur
        const updatedUser = {
          ...state.currentUser,
          walletTransactions: backendTransactions
        };
        
        updateUser(updatedUser);
        
        // 🆕 Sauvegarder dans la liste globale pour l'admin
        saveUserToGlobalList(updatedUser);
      } else {
        console.warn('⚠️ Erreur récupération transactions:', response.status);
      }
    } catch (error) {
      console.error('❌ Erreur rafraîchissement transactions:', error);
    }
  };

  // 🔄 Rafraîchir automatiquement le solde ET les transactions toutes les 30 secondes
  useEffect(() => {
    // Premier rafraîchissement au montage
    refreshBalance();
    refreshTransactions();
    
    // Puis toutes les 30 secondes
    const interval = setInterval(() => {
      refreshBalance();
      refreshTransactions();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [state.currentUser?.id]);

  return (
    <div 
      className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-6 bg-white/80 backdrop-blur-sm border-b border-border">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCurrentScreen('profile')}
          className="w-10 h-10 hover:bg-muted"
        >
          <ArrowLeft className="w-5 h-5 text-primary" />
        </Button>
        <h1 className="text-primary">Mon Portefeuille</h1>
        <div className="w-10" />
      </div>

      {/* Balance Card */}
      <div className="p-6">
        <motion.div 
          className="bg-gradient-to-br from-secondary to-primary rounded-3xl p-8 shadow-2xl relative overflow-hidden"
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.2 }}
        >
          {/* Decorative circles */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-20 -mt-20" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full -ml-16 -mb-16" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="w-5 h-5 text-white/80" />
              <p className="text-white/80 text-sm">Solde disponible</p>
            </div>
            
            <div className="mb-6">
              <h2 className="text-white text-4xl mb-1">
                {formatCDF(walletBalance)}
              </h2>
              <p className="text-white/70 text-sm">
                ≈ {walletBalanceUSD.toFixed(2)}$ USD
              </p>
            </div>

            {/* Discount Badge */}
            {hasDiscount && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 mb-4"
              >
                <Gift className="w-4 h-4 text-white" />
                <span className="text-white text-sm font-medium">
                  🎉 Réduction de 5% active sur toutes vos courses !
                </span>
              </motion.div>
            )}

            {!hasDiscount && walletBalance > 0 && (
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-white" />
                  <span className="text-white text-xs font-medium">
                    Rechargez encore {formatCDF(discountThresholdCDF - walletBalance)}
                  </span>
                </div>
                <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(walletBalance / discountThresholdCDF) * 100}%` }}
                    transition={{ duration: 0.5 }}
                    className="bg-white h-full rounded-full"
                  />
                </div>
                <p className="text-white/70 text-xs mt-2">
                  pour bénéficier de 5% de réduction sur toutes vos courses !
                </p>
              </div>
            )}

            <Button
              onClick={() => setShowRechargeModal(true)}
              className="w-full bg-white text-primary hover:bg-white/90 rounded-xl h-12 font-medium shadow-lg"
            >
              <Plus className="w-5 h-5 mr-2" />
              Recharger mon portefeuille
            </Button>
          </div>
        </motion.div>

        {/* Benefits Card */}
        <div className="mt-6 bg-white rounded-2xl p-6 shadow-sm border border-border">
          <h3 className="text-foreground mb-4 flex items-center gap-2">
            <Gift className="w-5 h-5 text-secondary" />
            Avantages du portefeuille
          </h3>
          
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Check className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-foreground">Paiement instantané</p>
                <p className="text-sm text-muted-foreground">Plus besoin de chercher de la monnaie</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className={`w-8 h-8 ${hasDiscount ? 'bg-amber-100' : 'bg-gray-100'} rounded-lg flex items-center justify-center flex-shrink-0`}>
                <Gift className={`w-5 h-5 ${hasDiscount ? 'text-amber-600' : 'text-gray-400'}`} />
              </div>
              <div>
                <p className="font-medium text-foreground">Réduction de 5%</p>
                <p className="text-sm text-muted-foreground">
                  Dès 20$ de solde ({formatCDF(discountThresholdCDF)})
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-foreground">Historique complet</p>
                <p className="text-sm text-muted-foreground">Suivez toutes vos transactions</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction History */}
      <div className="flex-1 px-6 pb-6">
        <h3 className="text-foreground mb-4">Historique des transactions</h3>
        
        {transactions.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-border">
            <Wallet className="w-16 h-16 text-muted-foreground mx-auto mb-3 opacity-30" />
            <p className="text-muted-foreground">Aucune transaction pour le moment</p>
            <p className="text-sm text-muted-foreground mt-1">
              Rechargez votre portefeuille pour commencer
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.slice(0, 10).map((transaction) => (
              <motion.div
                key={transaction.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl p-4 shadow-sm border border-border"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      transaction.status === 'pending'
                        ? 'bg-orange-100'
                        : transaction.type === 'recharge' 
                        ? 'bg-green-100' 
                        : transaction.type === 'debit'
                        ? 'bg-red-100'
                        : 'bg-blue-100'
                    }`}>
                      {transaction.status === 'pending' ? (
                        <Clock className="w-5 h-5 text-orange-600" />
                      ) : transaction.type === 'recharge' ? (
                        <Plus className={`w-5 h-5 ${
                          transaction.type === 'recharge' 
                            ? 'text-green-600' 
                            : transaction.type === 'debit'
                            ? 'text-red-600'
                            : 'text-blue-600'
                        }`} />
                      ) : transaction.type === 'debit' ? (
                        <DollarSign className="w-5 h-5 text-red-600" />
                      ) : (
                        <TrendingUp className="w-5 h-5 text-blue-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{transaction.description}</p>
                      <div className="flex items-center gap-2">
                        {transaction.method && (
                          <p className="text-xs text-muted-foreground">
                            {transaction.method === 'mobile_money' ? '📱 Mobile Money' : '💵 Espèces'}
                          </p>
                        )}
                        {transaction.status === 'pending' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs">
                            <Clock className="w-3 h-3" />
                            En attente
                          </span>
                        )}
                        {transaction.status === 'rejected' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs">
                            ❌ Rejetée
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${
                      transaction.status === 'pending'
                        ? 'text-orange-600'
                        : transaction.type === 'recharge' || transaction.type === 'refund'
                        ? 'text-green-600' 
                        : 'text-red-600'
                    }`}>
                      {transaction.type === 'recharge' || transaction.type === 'refund' ? '+' : '-'}
                      {formatCDF(transaction.amount)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatTransactionDate(transaction.timestamp)}
                    </p>
                  </div>
                </div>
                <div className="pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    Solde après: {formatCDF(transaction.balanceAfter)}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Recharge Modal */}
      {state.currentUser && (
        <RechargeModal
          show={showRechargeModal}
          onClose={() => setShowRechargeModal(false)}
          currentBalance={walletBalance}
          hasDiscount={hasDiscount}
          discountThreshold={discountThresholdCDF}
          userEmail={state.currentUser.email}
          userName={state.currentUser.name}
          userId={state.currentUser.id}
          onSuccess={handleRechargeSuccess}
        />
      )}

      {/* Debug Modal */}
      <DebugPaymentModal
        show={showDebugModal}
        onClose={() => setShowDebugModal(false)}
      />

      {/* Debug Button (Fixed) */}
      <motion.button
        onClick={() => setShowDebugModal(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-orange-500 hover:bg-orange-600 text-white rounded-full shadow-2xl flex items-center justify-center z-40"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        title="Debug Flutterwave"
      >
        <Bug className="w-6 h-6" />
      </motion.button>

      {/* Refresh Button (Fixed) */}
      <motion.button
        onClick={refreshBalance}
        disabled={refreshing}
        className="fixed bottom-6 left-6 w-14 h-14 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center z-40 disabled:opacity-50"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        title="Actualiser le solde"
      >
        <RefreshCw className={`w-6 h-6 ${refreshing ? 'animate-spin' : ''}`} />
      </motion.button>
    </div>
  );
}