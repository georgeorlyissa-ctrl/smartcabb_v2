import { WalletTransaction, User as UserType } from '../../types';
import { toast } from '../../lib/toast';
import { useAppState } from '../../hooks/useAppState';
import { useState } from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Textarea } from '../ui/textarea';
import { ArrowLeft, Clock, CheckCircle2, XCircle, AlertCircle, User, DollarSign, Phone } from '../../lib/admin-icons';

export function PendingRechargesScreen() {
  const { setCurrentScreen, state, updateUser } = useAppState();
  const [selectedTransaction, setSelectedTransaction] = useState<WalletTransaction & { user: UserType } | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0); // Pour forcer le re-render

  // Récupérer TOUS les utilisateurs depuis la liste globale
  const allUsersStr = localStorage.getItem('smartcab_all_users') || '[]';
  const allUsers: UserType[] = JSON.parse(allUsersStr);
  
  // Récupérer toutes les recharges en attente de tous les utilisateurs
  const pendingRecharges: Array<WalletTransaction & { user: UserType }> = [];
  
  allUsers.forEach(user => {
    if (user.walletTransactions) {
      user.walletTransactions.forEach(transaction => {
        if (transaction.status === 'pending' && transaction.type === 'recharge' && transaction.method === 'cash') {
          pendingRecharges.push({
            ...transaction,
            user: user
          });
        }
      });
    }
  });

  // Trier par date (plus récent d'abord)
  pendingRecharges.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const handleApprove = (transaction: WalletTransaction & { user: UserType }) => {
    const user = transaction.user;
    const currentBalance = user.walletBalance || 0;
    const newBalance = currentBalance + transaction.amount;

    // Mettre à jour la transaction
    const updatedTransactions = user.walletTransactions?.map(t => {
      if (t.id === transaction.id) {
        return {
          ...t,
          status: 'approved' as const,
          approvedAt: new Date(),
          approvedBy: 'admin',
          balanceAfter: newBalance,
          description: t.description?.replace('(En attente)', '(Approuvée)')
        };
      }
      return t;
    }) || [];

    // Mettre à jour l'utilisateur avec le nouveau solde
    const updatedUser: UserType = {
      ...user,
      walletBalance: newBalance,
      walletTransactions: updatedTransactions
    };

    // Sauvegarder dans la liste globale
    saveUserToGlobalList(updatedUser);

    // Si c'est l'utilisateur connecté, le mettre à jour aussi dans le state
    if (state.currentUser?.id === updatedUser.id) {
      updateUser(updatedUser);
    }

    console.log('✅ Recharge approuvée:', {
      utilisateur: user.name,
      montant: formatCDF(transaction.amount),
      nouveauSolde: formatCDF(newBalance)
    });

    toast.success(`Recharge de ${formatCDF(transaction.amount)} approuvée pour ${user.name}`);
    setRefreshKey(prev => prev + 1); // Forcer le re-render
  };

  const handleReject = () => {
    if (!selectedTransaction || !rejectionReason.trim()) return;

    const user = selectedTransaction.user;

    // Mettre à jour la transaction
    const updatedTransactions = user.walletTransactions?.map(t => {
      if (t.id === selectedTransaction.id) {
        return {
          ...t,
          status: 'rejected' as const,
          rejectionReason: rejectionReason,
          approvedAt: new Date(),
          approvedBy: 'admin',
          description: t.description?.replace('(En attente)', '(Rejetée)')
        };
      }
      return t;
    }) || [];

    // Mettre à jour l'utilisateur
    const updatedUser: UserType = {
      ...user,
      walletTransactions: updatedTransactions
    };

    // Sauvegarder dans la liste globale
    saveUserToGlobalList(updatedUser);

    // Si c'est l'utilisateur connecté, le mettre à jour aussi dans le state
    if (state.currentUser?.id === updatedUser.id) {
      updateUser(updatedUser);
    }

    console.log('❌ Recharge rejetée:', {
      utilisateur: user.name,
      montant: formatCDF(selectedTransaction.amount),
      raison: rejectionReason
    });

    setShowRejectionModal(false);
    setSelectedTransaction(null);
    setRejectionReason('');

    toast.error(`Recharge de ${formatCDF(selectedTransaction.amount)} rejetée pour ${user.name}`);
    setRefreshKey(prev => prev + 1); // Forcer le re-render
  };

  // Fonction pour sauvegarder l'utilisateur dans la liste globale
  const saveUserToGlobalList = (user: UserType) => {
    try {
      const allUsersStr = localStorage.getItem('smartcab_all_users') || '[]';
      const allUsers = JSON.parse(allUsersStr);
      
      // Trouver et mettre à jour l'utilisateur
      const userIndex = allUsers.findIndex((u: any) => u.id === user.id);
      if (userIndex >= 0) {
        allUsers[userIndex] = user;
      } else {
        allUsers.push(user);
      }
      
      localStorage.setItem('smartcab_all_users', JSON.stringify(allUsers));
      console.log('💾 Utilisateur mis à jour dans la liste globale');
    } catch (error) {
      console.error('❌ Erreur lors de la sauvegarde:', error);
    }
  };

  const formatDate = (date: Date) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'À l\'instant';
    if (minutes < 60) return `Il y a ${minutes} min`;
    if (hours < 24) return `Il y a ${hours}h`;
    if (days < 7) return `Il y a ${days}j`;
    
    return d.toLocaleDateString('fr-FR', { 
      day: '2-digit', 
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-border sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentScreen('admin-dashboard')}
                className="hover:bg-gray-100"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Recharges en attente</h1>
                <p className="text-sm text-muted-foreground">
                  {pendingRecharges.length} demande{pendingRecharges.length > 1 ? 's' : ''} en attente de validation
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {pendingRecharges.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-border">
            <Clock className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-30" />
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Aucune recharge en attente
            </h2>
            <p className="text-muted-foreground">
              Toutes les demandes de recharge ont été traitées
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {pendingRecharges.map((transaction) => (
              <motion.div
                key={transaction.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl p-6 shadow-sm border border-border hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4 flex-1">
                    {/* Icon */}
                    <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Clock className="w-6 h-6 text-orange-600" />
                    </div>

                    {/* Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg text-foreground">
                          {transaction.userName || 'Utilisateur'}
                        </h3>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                          <Clock className="w-3 h-3" />
                          En attente
                        </span>
                      </div>
                      
                      <div className="space-y-2 mt-3">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <User className="w-4 h-4" />
                          <span>ID: {transaction.userId?.substring(0, 8)}...</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="w-4 h-4" />
                          <span>{transaction.userPhone || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(transaction.timestamp)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground mb-1">Montant demandé</p>
                      <p className="text-2xl font-bold text-orange-600">
                        {formatCDF(transaction.amount)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        ID: {transaction.id.substring(0, 12)}...
                      </p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 pt-4 border-t border-border">
                  <Button
                    onClick={() => handleApprove(transaction)}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-xl h-11"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Approuver
                  </Button>
                  <Button
                    onClick={() => {
                      setSelectedTransaction(transaction);
                      setShowRejectionModal(true);
                    }}
                    variant="outline"
                    className="flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 rounded-xl h-11"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Rejeter
                  </Button>
                </div>

                {/* Additional Info */}
                <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs text-blue-800">
                    <strong>ℹ️ Note:</strong> {transaction.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Rejection Modal */}
      {showRejectionModal && selectedTransaction && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-6 max-w-md w-full"
          >
            <div className="flex items-start gap-3 mb-6">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  Rejeter la recharge
                </h3>
                <p className="text-sm text-muted-foreground">
                  Veuillez indiquer la raison du rejet
                </p>
              </div>
            </div>

            <div className="mb-6">
              <label className="text-sm font-medium text-foreground mb-2 block">
                Raison du rejet
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full p-3 rounded-xl border-2 border-border focus:border-red-500 focus:outline-none resize-none"
                placeholder="Ex: Document d'identité non conforme, montant incorrect..."
                rows={4}
              />
            </div>

            <div className="flex items-center gap-3">
              <Button
                onClick={() => {
                  setShowRejectionModal(false);
                  setSelectedTransaction(null);
                  setRejectionReason('');
                }}
                variant="outline"
                className="flex-1 rounded-xl h-11"
              >
                Annuler
              </Button>
              <Button
                onClick={handleReject}
                disabled={!rejectionReason.trim()}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-xl h-11 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Confirmer le rejet
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}