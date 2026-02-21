import { useState, useEffect } from 'react';
import { motion } from '../../lib/motion';
import { formatCDF } from '../../lib/pricing';
import { toast } from '../../lib/toast';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { useAppState } from '../../hooks/useAppState';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Textarea } from '../ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { ArrowLeft, Clock, CheckCircle2, XCircle, AlertCircle, User, DollarSign, Phone, RefreshCw, Calendar, History } from '../../lib/admin-icons';

interface Recharge {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  amount: number;
  description: string;
  type: string;
  method: string;
  status: 'pending' | 'approved' | 'rejected';
  timestamp: string;
  createdAt: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectedAt?: string;
  rejectedBy?: string;
  rejectionReason?: string;
  balanceAfter?: number;
}

export function PendingRechargesScreenNew() {
  const { setCurrentScreen, state } = useAppState();
  const [selectedTransaction, setSelectedTransaction] = useState<Recharge | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  const [pendingRecharges, setPendingRecharges] = useState<Recharge[]>([]);
  const [allRecharges, setAllRecharges] = useState<Recharge[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0
  });

  // Charger les recharges
  const loadRecharges = async (showLoader = true) => {
    try {
      if (showLoader) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      console.log('📋 Chargement des recharges...');

      // Charger les recharges en attente
      const pendingResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/wallet/pending-recharges`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );

      const pendingData = await pendingResponse.json();

      if (pendingData.success) {
        setPendingRecharges(pendingData.recharges || []);
        console.log('✅ Recharges en attente:', pendingData.count);
      }

      // Charger l'historique complet
      const historyResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/wallet/recharges-history`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );

      const historyData = await historyResponse.json();

      if (historyData.success) {
        setAllRecharges(historyData.recharges || []);
        setStats(historyData.stats);
        console.log('✅ Historique chargé:', historyData.stats);
      }

    } catch (error) {
      console.error('❌ Erreur chargement recharges:', error);
      toast.error('Erreur lors du chargement des recharges');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadRecharges();
    
    // Rafraîchir toutes les 30 secondes
    const interval = setInterval(() => {
      loadRecharges(false);
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const handleApprove = async (transaction: Recharge) => {
    try {
      console.log('✅ Approbation de la recharge:', transaction.id);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/wallet/approve-cash-recharge`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({
            transactionId: transaction.id,
            adminId: state.currentUser?.id,
            adminName: state.currentUser?.full_name || state.currentUser?.name || 'Admin'
          })
        }
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Erreur lors de l\'approbation');
      }

      console.log('✅ Résultat:', result);

      toast.success(result.message, {
        description: `Nouveau solde: ${formatCDF(result.newBalance)}`
      });

      // Recharger les recharges
      await loadRecharges(false);

    } catch (error) {
      console.error('❌ Erreur approbation:', error);
      toast.error(error instanceof Error ? error.message : 'Erreur lors de l\'approbation');
    }
  };

  const handleReject = async () => {
    if (!selectedTransaction || !rejectionReason.trim()) return;

    try {
      console.log('❌ Rejet de la recharge:', selectedTransaction.id);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/wallet/reject-cash-recharge`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({
            transactionId: selectedTransaction.id,
            adminId: state.currentUser?.id,
            adminName: state.currentUser?.full_name || state.currentUser?.name || 'Admin',
            reason: rejectionReason
          })
        }
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Erreur lors du rejet');
      }

      console.log('✅ Résultat:', result);

      toast.success(result.message);

      // Fermer le modal
      setShowRejectionModal(false);
      setSelectedTransaction(null);
      setRejectionReason('');

      // Recharger les recharges
      await loadRecharges(false);

    } catch (error) {
      console.error('❌ Erreur rejet:', error);
      toast.error(error instanceof Error ? error.message : 'Erreur lors du rejet');
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
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

  const RechargeCard = ({ transaction, isPending }: { transaction: Recharge, isPending: boolean }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl p-6 shadow-sm border border-border hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-4 flex-1">
          {/* Icon */}
          <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
            transaction.status === 'pending' ? 'bg-orange-100' :
            transaction.status === 'approved' ? 'bg-green-100' :
            'bg-red-100'
          }`}>
            {transaction.status === 'pending' ? (
              <Clock className="w-6 h-6 text-orange-600" />
            ) : transaction.status === 'approved' ? (
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            ) : (
              <XCircle className="w-6 h-6 text-red-600" />
            )}
          </div>

          {/* Info */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-lg text-foreground">
                {transaction.userName || 'Utilisateur'}
              </h3>
              <Badge variant={
                transaction.status === 'pending' ? 'secondary' :
                transaction.status === 'approved' ? 'default' :
                'destructive'
              }>
                {transaction.status === 'pending' ? 'En attente' :
                 transaction.status === 'approved' ? 'Approuvée' :
                 'Rejetée'}
              </Badge>
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
                <span>{formatDate(transaction.createdAt || transaction.timestamp)}</span>
              </div>
              {transaction.approvedBy && (
                <div className="text-xs text-green-600 mt-2">
                  ✅ Approuvée par {transaction.approvedBy} - {formatDate(transaction.approvedAt!)}
                </div>
              )}
              {transaction.rejectedBy && (
                <div className="text-xs text-red-600 mt-2">
                  ❌ Rejetée par {transaction.rejectedBy} - {formatDate(transaction.rejectedAt!)}
                  <br />
                  Raison: {transaction.rejectionReason}
                </div>
              )}
            </div>
          </div>

          {/* Amount */}
          <div className="text-right">
            <p className="text-sm text-muted-foreground mb-1">Montant</p>
            <p className={`text-2xl font-bold ${
              transaction.status === 'pending' ? 'text-orange-600' :
              transaction.status === 'approved' ? 'text-green-600' :
              'text-red-600'
            }`}>
              {formatCDF(transaction.amount)}
            </p>
            {transaction.balanceAfter && (
              <p className="text-xs text-muted-foreground mt-1">
                Solde après: {formatCDF(transaction.balanceAfter)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Actions (uniquement pour les pending) */}
      {isPending && (
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
      )}

      {/* Description */}
      <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-xs text-blue-800">
          <strong>ℹ️ Note:</strong> {transaction.description}
        </p>
      </div>
    </motion.div>
  );

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
                <h1 className="text-2xl font-bold text-foreground">Recharges en espèces</h1>
                <p className="text-sm text-muted-foreground">
                  {stats.pending} en attente • {stats.total} au total
                </p>
              </div>
            </div>
            <Button
              onClick={() => loadRecharges(false)}
              variant="outline"
              disabled={refreshing}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 border border-border">
            <p className="text-sm text-muted-foreground mb-1">Total</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>
          <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
            <p className="text-sm text-orange-700 mb-1">En attente</p>
            <p className="text-2xl font-bold text-orange-600">{stats.pending}</p>
          </div>
          <div className="bg-green-50 rounded-xl p-4 border border-green-200">
            <p className="text-sm text-green-700 mb-1">Approuvées</p>
            <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
          </div>
          <div className="bg-red-50 rounded-xl p-4 border border-red-200">
            <p className="text-sm text-red-700 mb-1">Rejetées</p>
            <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : (
          <Tabs defaultValue="pending" className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="pending">
                <Clock className="w-4 h-4 mr-2" />
                En attente ({stats.pending})
              </TabsTrigger>
              <TabsTrigger value="history">
                <History className="w-4 h-4 mr-2" />
                Historique ({stats.total})
              </TabsTrigger>
            </TabsList>

            {/* Recharges en attente */}
            <TabsContent value="pending">
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
                    <RechargeCard key={transaction.id} transaction={transaction} isPending={true} />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Historique complet */}
            <TabsContent value="history">
              {allRecharges.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center border border-border">
                  <History className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-30" />
                  <h2 className="text-xl font-semibold text-foreground mb-2">
                    Aucun historique
                  </h2>
                  <p className="text-muted-foreground">
                    Aucune recharge enregistrée
                  </p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {allRecharges.map((transaction) => (
                    <RechargeCard key={transaction.id} transaction={transaction} isPending={false} />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
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