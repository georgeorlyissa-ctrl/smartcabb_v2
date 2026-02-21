import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from '../../lib/toast';
import { useAppState } from '../../hooks/useAppState';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { motion } from '../../lib/motion';
import {
  ArrowLeft,
  FileText,
  TrendingUp,
  DollarSign,
  Calendar as CalendarIcon,
  Download,
  Plus,
  Eye,
  Archive,
  RefreshCw,
  Percent,
  Users,
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

interface FinancialReport {
  id: string;
  period_start: string;
  period_end: string;
  total_revenue: number;
  total_rides: number;
  commission_amount: number;
  driver_earnings: number;
  refunds_amount: number;
  net_revenue: number;
  status: 'pending' | 'finalized' | 'archived';
  created_at: string;
  generated_by: string;
}

interface FinancialReportsScreenProps {
  onBack?: () => void;
}

export function FinancialReportsScreen({ onBack }: FinancialReportsScreenProps) {
  const { setCurrentScreen } = useAppState();
  const [reports, setReports] = useState<FinancialReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [reportType, setReportType] = useState<'daily' | 'weekly' | 'monthly' | 'custom'>('monthly');

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('financial_reports')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error('Error loading reports:', error);
      toast.error('Erreur de chargement des rapports');
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async () => {
    if (!startDate || !endDate) {
      toast.error('Veuillez sélectionner les dates');
      return;
    }

    setGenerating(true);

    try {
      // Fetch rides data
      const { data: rides, error: ridesError } = await supabase
        .from('rides')
        .select('*, driver:drivers(commission_rate)')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .eq('status', 'completed');

      if (ridesError) throw ridesError;

      // Fetch refunds data
      const { data: refunds, error: refundsError } = await supabase
        .from('refunds')
        .select('amount')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .eq('status', 'approved');

      if (refundsError) throw refundsError;

      // Calculate totals
      const totalRevenue = rides?.reduce((sum, ride) => sum + (ride.actual_price || 0), 0) || 0;
      const totalRides = rides?.length || 0;
      const refundsAmount = refunds?.reduce((sum, refund) => sum + refund.amount, 0) || 0;

      // Calculate commission (15% default)
      const commissionAmount = rides?.reduce((sum, ride) => {
        const rate = ride.driver?.commission_rate || 0.15;
        return sum + ((ride.actual_price || 0) * rate);
      }, 0) || 0;

      const driverEarnings = totalRevenue - commissionAmount;
      const netRevenue = totalRevenue - refundsAmount;

      // Create report
      const { data: report, error: reportError } = await supabase
        .from('financial_reports')
        .insert({
          period_start: startDate.toISOString(),
          period_end: endDate.toISOString(),
          total_revenue: totalRevenue,
          total_rides: totalRides,
          commission_amount: commissionAmount,
          driver_earnings: driverEarnings,
          refunds_amount: refundsAmount,
          net_revenue: netRevenue,
          status: 'pending',
          generated_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (reportError) throw reportError;

      toast.success('Rapport généré avec succès');
      setShowGenerator(false);
      loadReports();

    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Erreur lors de la génération du rapport');
    } finally {
      setGenerating(false);
    }
  };

  const finalizeReport = async (reportId: string) => {
    try {
      const { error } = await supabase
        .from('financial_reports')
        .update({ status: 'finalized' })
        .eq('id', reportId);

      if (error) throw error;

      toast.success('Rapport finalisé');
      loadReports();
    } catch (error) {
      console.error('Error finalizing report:', error);
      toast.error('Erreur lors de la finalisation');
    }
  };

  const exportReport = (report: FinancialReport) => {
    const csv = `Rapport Financier SmartCabb
Période: ${formatDate(report.period_start)} - ${formatDate(report.period_end)}

Revenus totaux,${report.total_revenue} CDF
Nombre de courses,${report.total_rides}
Commission SmartCabb,${report.commission_amount} CDF
Gains conducteurs,${report.driver_earnings} CDF
Remboursements,${report.refunds_amount} CDF
Revenu net,${report.net_revenue} CDF

Généré le: ${formatDate(report.created_at)}
Statut: ${report.status}
`;

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rapport-financier-${report.id}.csv`;
    link.click();

    toast.success('Rapport exporté');
  };

  const getQuickDates = (type: string) => {
    const now = new Date();
    const start = new Date();

    switch (type) {
      case 'daily':
        start.setHours(0, 0, 0, 0);
        setStartDate(start);
        setEndDate(now);
        break;
      case 'weekly':
        start.setDate(now.getDate() - 7);
        setStartDate(start);
        setEndDate(now);
        break;
      case 'monthly':
        start.setMonth(now.getMonth() - 1);
        setStartDate(start);
        setEndDate(now);
        break;
    }
  };

  useEffect(() => {
    if (reportType !== 'custom') {
      getQuickDates(reportType);
    }
  }, [reportType]);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            onClick={() => onBack ? onBack() : setCurrentScreen('admin-dashboard')}
            variant="ghost"
            size="icon"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl">Rapports financiers</h1>
            <p className="text-sm text-gray-600">Générez et consultez les rapports financiers</p>
          </div>
        </div>

        <Button onClick={() => setShowGenerator(true)} className="gap-2">
          <FileText className="w-4 h-4" />
          Nouveau rapport
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Revenus ce mois</span>
            <DollarSign className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-2xl">
            {reports.filter(r => {
              const date = new Date(r.period_start);
              return date.getMonth() === new Date().getMonth();
            }).reduce((sum, r) => sum + r.total_revenue, 0).toLocaleString()} CDF
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Commission</span>
            <Percent className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-2xl">
            {reports.filter(r => {
              const date = new Date(r.period_start);
              return date.getMonth() === new Date().getMonth();
            }).reduce((sum, r) => sum + r.commission_amount, 0).toLocaleString()} CDF
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Gains conducteurs</span>
            <Users className="w-5 h-5 text-purple-600" />
          </div>
          <div className="text-2xl">
            {reports.filter(r => {
              const date = new Date(r.period_start);
              return date.getMonth() === new Date().getMonth();
            }).reduce((sum, r) => sum + r.driver_earnings, 0).toLocaleString()} CDF
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Revenu net</span>
            <TrendingUp className="w-5 h-5 text-orange-600" />
          </div>
          <div className="text-2xl">
            {reports.filter(r => {
              const date = new Date(r.period_start);
              return date.getMonth() === new Date().getMonth();
            }).reduce((sum, r) => sum + r.net_revenue, 0).toLocaleString()} CDF
          </div>
        </Card>
      </div>

      {/* Reports List */}
      <Card className="p-6">
        <h2 className="text-lg mb-4">Historique des rapports</h2>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p>Aucun rapport généré</p>
            <Button onClick={() => setShowGenerator(true)} className="mt-4">
              Générer le premier rapport
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((report) => (
              <motion.div
                key={report.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-medium">
                        {formatDate(report.period_start)} - {formatDate(report.period_end)}
                      </h3>
                      <Badge variant={report.status === 'finalized' ? 'default' : 'secondary'}>
                        {report.status === 'finalized' ? 'Finalisé' : 'En attente'}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Revenus:</span>
                        <p className="font-medium">{report.total_revenue.toLocaleString()} CDF</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Courses:</span>
                        <p className="font-medium">{report.total_rides}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Commission:</span>
                        <p className="font-medium text-blue-600">{report.commission_amount.toLocaleString()} CDF</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Remboursements:</span>
                        <p className="font-medium text-red-600">-{report.refunds_amount.toLocaleString()} CDF</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Net:</span>
                        <p className="font-medium text-green-600">{report.net_revenue.toLocaleString()} CDF</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    {report.status === 'pending' && (
                      <Button
                        onClick={() => finalizeReport(report.id)}
                        variant="outline"
                        size="sm"
                      >
                        Finaliser
                      </Button>
                    )}
                    <Button
                      onClick={() => exportReport(report)}
                      variant="outline"
                      size="sm"
                      className="gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Exporter
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </Card>

      {/* Generator Dialog */}
      <Dialog open={showGenerator} onOpenChange={setShowGenerator}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Générer un rapport financier</DialogTitle>
            <DialogDescription>
              Créez un rapport financier pour analyser les revenus et statistiques
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Type de rapport</Label>
              <Select value={reportType} onValueChange={(v: any) => setReportType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Journalier</SelectItem>
                  <SelectItem value="weekly">Hebdomadaire</SelectItem>
                  <SelectItem value="monthly">Mensuel</SelectItem>
                  <SelectItem value="custom">Personnalisé</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {reportType === 'custom' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Date de début</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <CalendarIcon className="w-4 h-4 mr-2" />
                        {startDate ? formatDate(startDate.toISOString()) : 'Sélectionner'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent>
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        locale="fr"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label>Date de fin</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <CalendarIcon className="w-4 h-4 mr-2" />
                        {endDate ? formatDate(endDate.toISOString()) : 'Sélectionner'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent>
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        locale="fr"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowGenerator(false)}>
                Annuler
              </Button>
              <Button onClick={generateReport} disabled={generating || !startDate || !endDate}>
                {generating ? 'Génération...' : 'Générer le rapport'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}