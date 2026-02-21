import { useState, useEffect } from 'react';
import { motion } from '../../lib/motion';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { useAppState } from '../../hooks/useAppState';
import { supabase } from '../../lib/supabase';
import { 
  ArrowLeft, 
  DollarSign, 
  Clock, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  Calendar,
  User,
  Car,
  TrendingUp,
  FileText,
  Loader2,
  Download,
  RefreshCw,
  UserCheck
} from '../../lib/admin-icons';
import { toast } from '../../lib/toast';
import { formatCDF } from '../../lib/pricing';

interface PostpaidRequest {
  id: string;
  ride_id: string;
  passenger_id: string;
  driver_id: string;
  base_amount: number;
  interest_rate: number;
  interest_amount: number;
  total_amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'paid' | 'overdue' | 'cancelled';
  requested_at: string;
  reviewed_at?: string;
  approved_at?: string;
  rejected_at?: string;
  due_date?: string;
  paid_at?: string;
  reviewed_by?: string;
  rejection_reason?: string;
  admin_notes?: string;
  remaining_balance: number;
  amount_paid: number;
  
  // Données enrichies de la vue
  passenger_name?: string;
  passenger_email?: string;
  passenger_phone?: string;
  driver_name?: string;
  driver_phone?: string;
}

interface Stats {
  pending: number;
  approved: number;
  rejected: number;
  paid: number;
  overdue: number;
  total_pending_amount: number;
  total_approved_amount: number;
}

interface PostpaidRequestsScreenProps {
  onBack?: () => void;
}

export function PostpaidRequestsScreen({ onBack }: PostpaidRequestsScreenProps) {
  const { setCurrentScreen } = useAppState();
  const [requests, setRequests] = useState<PostpaidRequest[]>([]);
  const [stats, setStats] = useState<Stats>({
    pending: 0,
    approved: 0,
    rejected: 0,
    paid: 0,
    overdue: 0,
    total_pending_amount: 0,
    total_approved_amount: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<PostpaidRequest | null>(null);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [daysToPayment, setDaysToPayment] = useState(7);
  const [adminNotes, setAdminNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'paid' | 'overdue'>('pending');

  useEffect(() => {
    loadRequests();
    loadStats();
    
    // Rafraîchir toutes les 30 secondes
    const interval = setInterval(() => {
      loadRequests();
      loadStats();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [filter]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('postpaid_requests')
        .select(`
          *,
          passenger:profiles!postpaid_requests_passenger_id_fkey(full_name, email, phone),
          driver:profiles!postpaid_requests_driver_id_fkey(full_name, phone)
        `)
        .order('requested_at', { ascending: false });
      
      if (filter !== 'all') {
        query = query.eq('status', filter);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // Transformer les données
      const transformedData = data?.map(req => ({
        ...req,
        passenger_name: req.passenger?.full_name,
        passenger_email: req.passenger?.email,
        passenger_phone: req.passenger?.phone,
        driver_name: req.driver?.full_name,
        driver_phone: req.driver?.phone
      })) || [];
      
      setRequests(transformedData);
    } catch (error) {
      console.error('❌ Erreur chargement demandes:', error);
      toast.error('Erreur lors du chargement des demandes');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const { data, error } = await supabase
        .from('postpaid_requests')
        .select('status, total_amount, remaining_balance');
      
      if (error) throw error;
      
      const statsData = data?.reduce((acc, req) => {
        acc[req.status] = (acc[req.status] || 0) + 1;
        if (req.status === 'pending') {
          acc.total_pending_amount += req.total_amount || 0;
        }
        if (req.status === 'approved') {
          acc.total_approved_amount += req.remaining_balance || 0;
        }
        return acc;
      }, {
        pending: 0,
        approved: 0,
        rejected: 0,
        paid: 0,
        overdue: 0,
        total_pending_amount: 0,
        total_approved_amount: 0
      } as Stats);
      
      setStats(statsData);
    } catch (error) {
      console.error('❌ Erreur chargement stats:', error);
    }
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;
    
    try {
      setProcessing(true);
      
      // Appeler la fonction SQL
      const { data, error } = await supabase.rpc('approve_postpaid_request', {
        p_request_id: selectedRequest.id,
        p_admin_id: (await supabase.auth.getUser()).data.user?.id,
        p_days_to_pay: daysToPayment,
        p_admin_notes: adminNotes || null
      });
      
      if (error) throw error;
      
      if (data?.success) {
        toast.success('✅ Demande approuvée avec succès');
        setShowApproveDialog(false);
        setSelectedRequest(null);
        setAdminNotes('');
        loadRequests();
        loadStats();
      } else {
        throw new Error(data?.error || 'Erreur inconnue');
      }
    } catch (error: any) {
      console.error('❌ Erreur approbation:', error);
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !rejectionReason.trim()) {
      toast.error('Veuillez indiquer une raison de rejet');
      return;
    }
    
    try {
      setProcessing(true);
      
      const { data, error } = await supabase.rpc('reject_postpaid_request', {
        p_request_id: selectedRequest.id,
        p_admin_id: (await supabase.auth.getUser()).data.user?.id,
        p_rejection_reason: rejectionReason
      });
      
      if (error) throw error;
      
      if (data?.success) {
        toast.success('❌ Demande rejetée');
        setShowRejectDialog(false);
        setSelectedRequest(null);
        setRejectionReason('');
        loadRequests();
        loadStats();
      } else {
        throw new Error(data?.error || 'Erreur inconnue');
      }
    } catch (error: any) {
      console.error('❌ Erreur rejet:', error);
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'En attente' },
      approved: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Approuvé' },
      rejected: { color: 'bg-red-100 text-red-800', icon: XCircle, label: 'Rejeté' },
      paid: { color: 'bg-blue-100 text-blue-800', icon: CheckCircle, label: 'Payé' },
      overdue: { color: 'bg-orange-100 text-orange-800', icon: AlertCircle, label: 'En retard' },
    };
    
    const { color, icon: Icon, label } = config[status as keyof typeof config] || config.pending;
    
    return (
      <Badge className={color}>
        <Icon className="w-3 h-3 mr-1" />
        {label}
      </Badge>
    );
  };

  const formatDate = (date: string) => new Date(date).toLocaleDateString('fr-FR', { 
    day: '2-digit', 
    month: 'short', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const exportPostpaidData = () => {
    const filteredRequests = filter === 'all' 
      ? requests 
      : requests.filter(r => r.status === filter);

    const csvData = [
      ['ID', 'Passager', 'Email', 'Téléphone', 'Conducteur', 'Montant de base (CDF)', 'Taux intérêt (%)', 'Montant intérêt (CDF)', 'Montant total (CDF)', 'Statut', 'Date demande', 'Date échéance', 'Notes admin'],
      ...filteredRequests.map(request => [
        request.id.slice(-8),
        request.passenger_name || 'N/A',
        request.passenger_email || 'N/A',
        request.passenger_phone || 'N/A',
        request.driver_name || 'N/A',
        (request.base_amount || 0).toFixed(0),
        request.interest_rate.toString(),
        (request.interest_amount || 0).toFixed(0),
        (request.total_amount || 0).toFixed(0),
        request.status === 'pending' ? 'En attente' : 
        request.status === 'approved' ? 'Approuvé' : 
        request.status === 'rejected' ? 'Rejeté' : 
        request.status === 'paid' ? 'Payé' : 'En retard',
        formatDate(request.requested_at),
        request.due_date ? formatDate(request.due_date) : 'N/A',
        request.admin_notes || ''
      ])
    ];

    const csvContent = '\uFEFF' + csvData.map(row => row.join(';')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `smartcabb-postpaiements-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exportation de ${filteredRequests.length} demande(s) terminée !`);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6"
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onBack ? onBack() : setCurrentScreen('admin-dashboard')}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Demandes de Post-Paiement</h1>
              <p className="text-gray-600">Gérer les paiements différés avec intérêts</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              onClick={() => {
                loadRequests();
                loadStats();
                toast.success('Données actualisées');
              }}
              variant="outline"
              className="text-blue-600 border-blue-200 hover:bg-blue-50"
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
            <Button
              onClick={exportPostpaidData}
              variant="outline"
              className="text-green-600 border-green-200 hover:bg-green-50"
            >
              <Download className="w-4 h-4 mr-2" />
              Exporter CSV
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <Card className="p-4 bg-yellow-50 border-yellow-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-600">En attente</p>
                <p className="text-2xl font-bold text-yellow-800">{stats.pending}</p>
                <p className="text-xs text-yellow-600 mt-1">
                  {formatCDF(stats.total_pending_amount)}
                </p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
          </Card>

          <Card className="p-4 bg-green-50 border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600">Approuvé</p>
                <p className="text-2xl font-bold text-green-800">{stats.approved}</p>
                <p className="text-xs text-green-600 mt-1">
                  {formatCDF(stats.total_approved_amount)}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </Card>

          <Card className="p-4 bg-blue-50 border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600">Payé</p>
                <p className="text-2xl font-bold text-blue-800">{stats.paid}</p>
              </div>
              <DollarSign className="w-8 h-8 text-blue-600" />
            </div>
          </Card>

          <Card className="p-4 bg-red-50 border-red-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600">Rejeté</p>
                <p className="text-2xl font-bold text-red-800">{stats.rejected}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
          </Card>

          <Card className="p-4 bg-orange-50 border-orange-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600">En retard</p>
                <p className="text-2xl font-bold text-orange-800">{stats.overdue}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-orange-600" />
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-4 mb-6">
          <div className="flex items-center space-x-2 overflow-x-auto">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              Toutes
            </Button>
            <Button
              variant={filter === 'pending' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('pending')}
            >
              En attente ({stats.pending})
            </Button>
            <Button
              variant={filter === 'approved' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('approved')}
            >
              Approuvées ({stats.approved})
            </Button>
            <Button
              variant={filter === 'paid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('paid')}
            >
              Payées ({stats.paid})
            </Button>
            <Button
              variant={filter === 'rejected' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('rejected')}
            >
              Rejetées ({stats.rejected})
            </Button>
            <Button
              variant={filter === 'overdue' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('overdue')}
            >
              En retard ({stats.overdue})
            </Button>
          </div>
        </Card>

        {/* Requests List */}
        {loading ? (
          <Card className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600">Chargement des demandes...</p>
          </Card>
        ) : requests.length === 0 ? (
          <Card className="p-12 text-center">
            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600">Aucune demande {filter !== 'all' ? `(${filter})` : ''}</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <Card key={request.id} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-4">
                      {getStatusBadge(request.status)}
                      <span className="text-sm text-gray-500">
                        {formatDate(request.requested_at)}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      {/* Passager */}
                      <div className="flex items-start space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <User className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Passager</p>
                          <p className="font-semibold">{request.passenger_name || 'N/A'}</p>
                          <p className="text-sm text-gray-600">{request.passenger_phone}</p>
                        </div>
                      </div>

                      {/* Conducteur */}
                      <div className="flex items-start space-x-3">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <Car className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Conducteur</p>
                          <p className="font-semibold">{request.driver_name || 'N/A'}</p>
                          <p className="text-sm text-gray-600">{request.driver_phone}</p>
                        </div>
                      </div>
                    </div>

                    {/* Montants */}
                    <div className="bg-gray-50 rounded-lg p-4 mb-4">
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-xs text-gray-500">Montant de base</p>
                          <p className="font-semibold">{formatCDF(request.base_amount)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Intérêts ({request.interest_rate}%)</p>
                          <p className="font-semibold text-orange-600">+{formatCDF(request.interest_amount)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Total à payer</p>
                          <p className="font-bold text-lg">{formatCDF(request.total_amount)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Échéance si approuvé */}
                    {request.due_date && (
                      <div className="flex items-center space-x-2 text-sm">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-600">
                          Échéance: <span className="font-semibold">{formatDate(request.due_date)}</span>
                        </span>
                        {request.remaining_balance > 0 && (
                          <span className="ml-4 text-orange-600">
                            Reste: {formatCDF(request.remaining_balance)}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Raison de rejet */}
                    {request.rejection_reason && (
                      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm font-semibold text-red-800">Raison du rejet:</p>
                        <p className="text-sm text-red-700">{request.rejection_reason}</p>
                      </div>
                    )}

                    {/* Notes admin */}
                    {request.admin_notes && (
                      <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm font-semibold text-blue-800">Notes admin:</p>
                        <p className="text-sm text-blue-700">{request.admin_notes}</p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  {request.status === 'pending' && (
                    <div className="flex flex-col space-y-2 ml-4">
                      <Button
                        onClick={() => {
                          setSelectedRequest(request);
                          setShowApproveDialog(true);
                        }}
                        className="bg-green-600 hover:bg-green-700"
                        size="sm"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Approuver
                      </Button>
                      <Button
                        onClick={() => {
                          setSelectedRequest(request);
                          setShowRejectDialog(true);
                        }}
                        variant="destructive"
                        size="sm"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Rejeter
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Approve Dialog */}
        <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Approuver la demande de post-paiement</DialogTitle>
              <DialogDescription>
                Définir le délai de paiement et approuver cette demande de paiement différé
              </DialogDescription>
            </DialogHeader>
            
            {selectedRequest && (
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Passager:</span>
                      <span className="font-semibold">{selectedRequest.passenger_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Montant de base:</span>
                      <span>{formatCDF(selectedRequest.base_amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Intérêts ({selectedRequest.interest_rate}%):</span>
                      <span className="text-orange-600">+{formatCDF(selectedRequest.interest_amount)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="font-bold">Total:</span>
                      <span className="font-bold text-lg">{formatCDF(selectedRequest.total_amount)}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="daysToPayment">Délai de paiement (jours)</Label>
                  <Input
                    id="daysToPayment"
                    type="number"
                    min="1"
                    max="90"
                    value={daysToPayment}
                    onChange={(e) => setDaysToPayment(parseInt(e.target.value) || 7)}
                    className="mt-2"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Date d'échéance: {new Date(Date.now() + daysToPayment * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR')}
                  </p>
                </div>

                <div>
                  <Label htmlFor="adminNotes">Notes admin (optionnel)</Label>
                  <Textarea
                    id="adminNotes"
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Ajouter des notes internes..."
                    className="mt-2"
                    rows={3}
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowApproveDialog(false)} disabled={processing}>
                Annuler
              </Button>
              <Button onClick={handleApprove} disabled={processing} className="bg-green-600 hover:bg-green-700">
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Approbation...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approuver
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reject Dialog */}
        <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rejeter la demande de post-paiement</DialogTitle>
              <DialogDescription>
                Indiquer la raison du rejet de cette demande de paiement différé
              </DialogDescription>
            </DialogHeader>
            
            {selectedRequest && (
              <div className="space-y-4">
                <div className="bg-red-50 rounded-lg p-4">
                  <p className="text-sm text-red-800">
                    Vous êtes sur le point de rejeter la demande de <strong>{selectedRequest.passenger_name}</strong> pour un montant de <strong>{formatCDF(selectedRequest.total_amount)}</strong>.
                  </p>
                </div>

                <div>
                  <Label htmlFor="rejectionReason">Raison du rejet *</Label>
                  <Textarea
                    id="rejectionReason"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Indiquez la raison du rejet..."
                    className="mt-2"
                    rows={4}
                    required
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRejectDialog(false)} disabled={processing}>
                Annuler
              </Button>
              <Button onClick={handleReject} disabled={processing || !rejectionReason.trim()} variant="destructive">
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Rejet...
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 mr-2" />
                    Rejeter
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </motion.div>
  );
}