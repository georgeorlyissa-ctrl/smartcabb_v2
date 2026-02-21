import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from '../../lib/toast';
import { useAppState } from '../../hooks/useAppState';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { motion } from '../../lib/motion';
import {
  ArrowLeft,
  DollarSign,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  FileText,
  User,
  MapPin,
  Phone,
  Mail,
} from '../../lib/icons';

// Fonction de formatage de date simple
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

interface Refund {
  id: string;
  ride_id: string;
  user_id: string;
  amount: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes?: string;
  processed_by?: string;
  processed_at?: string;
  created_at: string;
  ride?: {
    pickup_address: string;
    dropoff_address: string;
    actual_price: number;
    passenger?: {
      full_name: string;
      phone: string;
      email: string;
    };
  };
  user?: {
    full_name: string;
    phone: string;
    email: string;
  };
}

interface RefundManagementScreenProps {
  onBack?: () => void;
}

export function RefundManagementScreen({ onBack }: RefundManagementScreenProps) {
  const { setCurrentScreen } = useAppState();
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRefund, setSelectedRefund] = useState<Refund | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');

  useEffect(() => {
    loadRefunds();
    
    // Subscribe to changes
    const channel = supabase
      .channel('refunds-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'refunds'
      }, () => {
        loadRefunds();
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  const loadRefunds = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('refunds')
        .select(`
          *,
          ride:rides(
            pickup_address, 
            dropoff_address, 
            actual_price,
            passenger:profiles(full_name, phone, email)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Transformer les données pour correspondre à l'interface
      const transformedData = data?.map(refund => ({
        ...refund,
        user: refund.ride?.passenger
      })) || [];
      
      setRefunds(transformedData);
    } catch (error) {
      console.error('Error loading refunds:', error);
      toast.error('Erreur de chargement des remboursements');
    } finally {
      setLoading(false);
    }
  };

  const approveRefund = async (refund: Refund) => {
    setProcessing(true);
    try {
      const admin = await supabase.auth.getUser();

      // Update refund status
      const { error: refundError } = await supabase
        .from('refunds')
        .update({
          status: 'approved',
          admin_notes: adminNotes,
          processed_by: admin.data.user?.id,
          processed_at: new Date().toISOString()
        })
        .eq('id', refund.id);

      if (refundError) throw refundError;

      // Mettre à jour le solde wallet du passager
      // ⚠️ DÉSACTIVÉ: La colonne wallet_balance n'existe pas dans Supabase profiles
      // Le solde est géré uniquement dans le KV store via le backend
      /*
      const { data: profile } = await supabase
        .from('profiles')
        .select('wallet_balance')
        .eq('id', refund.user_id)
        .single();

      if (profile) {
        // Ajouter le montant au wallet
        await supabase
          .from('profiles')
          .update({
            wallet_balance: (profile.wallet_balance || 0) + refund.amount
          })
          .eq('id', refund.user_id);
      }
      */

      // TODO: Appeler le backend pour mettre à jour le wallet dans le KV store
      console.log('ℹ️ Mise à jour du wallet désactivée - utiliser le backend KV store');

      // Create notification
      await supabase.from('notifications').insert({
        user_id: refund.user_id,
        title: 'Remboursement approuvé',
        message: `Votre demande de remboursement de ${refund.amount.toLocaleString()} CDF a été approuvée`,
        type: 'success'
      });

      // Log audit
      await supabase.from('audit_logs').insert({
        user_id: admin.data.user?.id,
        action: 'approve_refund',
        entity_type: 'refund',
        entity_id: refund.id,
        details: {
          amount: refund.amount,
          user_id: refund.user_id,
          notes: adminNotes
        }
      });

      toast.success('Remboursement approuvé');
      setShowDialog(false);
      setAdminNotes('');
      loadRefunds();

    } catch (error) {
      console.error('Error approving refund:', error);
      toast.error('Erreur lors de l\'approbation');
    } finally {
      setProcessing(false);
    }
  };

  const rejectRefund = async (refund: Refund) => {
    if (!adminNotes) {
      toast.error('Veuillez fournir une raison du rejet');
      return;
    }

    setProcessing(true);
    try {
      const admin = await supabase.auth.getUser();

      const { error } = await supabase
        .from('refunds')
        .update({
          status: 'rejected',
          admin_notes: adminNotes,
          processed_by: admin.data.user?.id,
          processed_at: new Date().toISOString()
        })
        .eq('id', refund.id);

      if (error) throw error;

      // Create notification
      await supabase.from('notifications').insert({
        user_id: refund.user_id,
        title: 'Remboursement refusé',
        message: `Votre demande de remboursement a été refusée. Raison: ${adminNotes}`,
        type: 'error'
      });

      // Log audit
      await supabase.from('audit_logs').insert({
        user_id: admin.data.user?.id,
        action: 'reject_refund',
        entity_type: 'refund',
        entity_id: refund.id,
        details: {
          amount: refund.amount,
          user_id: refund.user_id,
          notes: adminNotes
        }
      });

      toast.success('Demande refusée');
      setShowDialog(false);
      setAdminNotes('');
      loadRefunds();

    } catch (error) {
      console.error('Error rejecting refund:', error);
      toast.error('Erreur lors du rejet');
    } finally {
      setProcessing(false);
    }
  };

  const filteredRefunds = refunds.filter(refund => {
    const matchesFilter = filter === 'all' || refund.status === filter;
    const matchesSearch = !searchTerm || 
      refund.user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      refund.user?.phone?.includes(searchTerm) ||
      refund.ride?.pickup_address?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const stats = {
    pending: refunds.filter(r => r.status === 'pending').length,
    approved: refunds.filter(r => r.status === 'approved').length,
    rejected: refunds.filter(r => r.status === 'rejected').length,
    totalAmount: refunds.filter(r => r.status === 'approved')
      .reduce((sum, r) => sum + r.amount, 0)
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          onClick={() => onBack ? onBack() : setCurrentScreen('admin-dashboard')} 
          variant="ghost" 
          size="icon"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl">Gestion des remboursements</h1>
          <p className="text-sm text-gray-600">Traitez les demandes de remboursement</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">En attente</span>
            <Clock className="w-5 h-5 text-orange-600" />
          </div>
          <div className="text-2xl">{stats.pending}</div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Approuvés</span>
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-2xl">{stats.approved}</div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Refusés</span>
            <XCircle className="w-5 h-5 text-red-600" />
          </div>
          <div className="text-2xl">{stats.rejected}</div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Montant total</span>
            <DollarSign className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-2xl">{stats.totalAmount.toLocaleString()} CDF</div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher par nom, téléphone ou adresse..."
              className="pl-10"
            />
          </div>

          <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="pending">En attente</SelectItem>
              <SelectItem value="approved">Approuvés</SelectItem>
              <SelectItem value="rejected">Refusés</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Refunds List */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredRefunds.length === 0 ? (
          <Card className="p-12 text-center text-gray-500">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p>Aucune demande de remboursement</p>
          </Card>
        ) : (
          filteredRefunds.map((refund) => (
            <motion.div
              key={refund.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="font-medium">{refund.user?.full_name}</h3>
                      <Badge
                        variant={
                          refund.status === 'approved' ? 'default' :
                          refund.status === 'rejected' ? 'destructive' :
                          'secondary'
                        }
                      >
                        {refund.status === 'approved' ? 'Approuvé' :
                         refund.status === 'rejected' ? 'Refusé' :
                         'En attente'}
                      </Badge>
                      <span className="text-sm text-gray-600">
                        {formatDate(refund.created_at)}
                      </span>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600">Montant:</span>
                        <span className="font-medium text-blue-600">{refund.amount.toLocaleString()} CDF</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600">Téléphone:</span>
                        <span>{refund.user?.phone}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-gray-600">Trajet:</span>
                        <span>{refund.ride?.pickup_address} → {refund.ride?.dropoff_address}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-gray-600">Raison:</span>
                        <span>{refund.reason}</span>
                      </div>
                      {refund.admin_notes && (
                        <div className="flex items-start gap-2">
                          <span className="text-gray-600">Notes admin:</span>
                          <span className="text-orange-600">{refund.admin_notes}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {refund.status === 'pending' && (
                    <Button
                      onClick={() => {
                        setSelectedRefund(refund);
                        setShowDialog(true);
                      }}
                      variant="outline"
                    >
                      Traiter
                    </Button>
                  )}
                </div>
              </Card>
            </motion.div>
          ))
        )}
      </div>

      {/* Processing Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Traiter la demande de remboursement</DialogTitle>
          </DialogHeader>

          {selectedRefund && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Client:</span>
                  <span className="font-medium">{selectedRefund.user?.full_name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Montant:</span>
                  <span className="font-medium text-blue-600">{selectedRefund.amount.toLocaleString()} CDF</span>
                </div>
                <div className="flex items-start justify-between">
                  <span className="text-sm text-gray-600">Raison:</span>
                  <span className="text-right">{selectedRefund.reason}</span>
                </div>
              </div>

              <div>
                <Label>Notes administratives</Label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Ajoutez des notes sur le traitement..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  onClick={() => rejectRefund(selectedRefund)}
                  variant="outline"
                  disabled={processing}
                  className="text-red-600 border-red-600"
                >
                  Refuser
                </Button>
                <Button
                  onClick={() => approveRefund(selectedRefund)}
                  disabled={processing}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {processing ? 'Traitement...' : 'Approuver'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}