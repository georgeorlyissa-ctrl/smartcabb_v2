import { useState, useEffect, useCallback } from 'react';
import { toast } from '../../lib/toast';
import { useAppState } from '../../hooks/useAppState';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';
import { motion } from '../../lib/motion';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import {
  ArrowLeft,
  FileText,
  TrendingUp,
  DollarSign,
  Download,
  RefreshCw,
  Percent,
  Users,
  CheckCircle,
  Trash2,
  AlertCircle,
  Car,
} from '../../lib/icons';

const API = `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/admin`;
const HEADERS = { 'Authorization': `Bearer ${publicAnonKey}`, 'Content-Type': 'application/json' };

const fmt = (n: number) => Math.round(n).toLocaleString('fr-FR');
const fmtDate = (s: string) => new Date(s).toLocaleDateString('fr-FR', {
  year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
});
const fmtDateShort = (s: string) => new Date(s).toLocaleDateString('fr-FR', {
  year: 'numeric', month: 'short', day: 'numeric',
});

interface Summary {
  totalRevenue: number;
  commissionAmount: number;
  driverEarnings: number;
  netRevenue: number;
  totalRides: number;
  commissionRate: number;
  month: string;
}

interface Report {
  id: string;
  period_start: string;
  period_end: string;
  total_revenue: number;
  total_rides: number;
  commission_amount: number;
  driver_earnings: number;
  refunds_amount: number;
  net_revenue: number;
  commission_rate?: number;
  by_category?: Record<string, { rides: number; revenue: number }>;
  status: 'pending' | 'finalized' | 'archived';
  created_at: string;
  generated_by: string;
}

interface FinancialReportsScreenProps {
  onBack?: () => void;
}

export function FinancialReportsScreen({ onBack }: FinancialReportsScreenProps) {
  const { setCurrentScreen } = useAppState();

  const [summary, setSummary]   = useState<Summary | null>(null);
  const [reports, setReports]   = useState<Report[]>([]);
  const [loading, setLoading]   = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);

  // Generator state
  const [reportType, setReportType] = useState<'daily' | 'weekly' | 'monthly' | 'custom'>('monthly');
  const [startDate, setStartDate]   = useState('');
  const [endDate,   setEndDate]     = useState('');

  // ─── Chargement ──────────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [sumRes, repRes] = await Promise.all([
        fetch(`${API}/reports/summary`, { headers: HEADERS }),
        fetch(`${API}/reports/financial`, { headers: HEADERS }),
      ]);

      if (sumRes.ok) {
        const d = await sumRes.json();
        if (d.success) setSummary(d.summary);
      }
      if (repRes.ok) {
        const d = await repRes.json();
        if (d.success) setReports(d.reports || []);
      }
    } catch (err) {
      console.error('Erreur chargement rapports:', err);
      toast.error('Erreur de chargement des données financières');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Quand le type change, pré-remplir les dates
  useEffect(() => {
    if (reportType === 'custom') return;
    const now  = new Date();
    const from = new Date();
    if (reportType === 'daily')   from.setHours(0, 0, 0, 0);
    if (reportType === 'weekly')  from.setDate(now.getDate() - 7);
    if (reportType === 'monthly') from.setMonth(now.getMonth() - 1);
    setStartDate(from.toISOString().slice(0, 10));
    setEndDate(now.toISOString().slice(0, 10));
  }, [reportType]);

  // ─── Génération ──────────────────────────────────────────────────────────────
  const generateReport = async () => {
    if (!startDate || !endDate) {
      toast.error('Veuillez sélectionner une période');
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      toast.error('La date de début doit être avant la date de fin');
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch(`${API}/reports/generate`, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify({
          startDate: new Date(startDate).toISOString(),
          endDate:   new Date(endDate + 'T23:59:59').toISOString(),
        }),
      });
      const d = await res.json();
      if (d.success) {
        toast.success(`✅ Rapport généré — ${d.report.total_rides} courses, ${fmt(d.report.total_revenue)} CDF`);
        setShowGenerator(false);
        loadAll();
      } else {
        toast.error(`Erreur : ${d.error || 'Génération échouée'}`);
      }
    } catch (err) {
      console.error('Erreur génération:', err);
      toast.error('Erreur réseau lors de la génération');
    } finally {
      setGenerating(false);
    }
  };

  // ─── Finalisation ─────────────────────────────────────────────────────────────
  const finalizeReport = async (id: string) => {
    try {
      const res = await fetch(`${API}/reports/finalize/${id}`, { method: 'PUT', headers: HEADERS });
      const d = await res.json();
      if (d.success) {
        toast.success('Rapport finalisé');
        setReports(prev => prev.map(r => r.id === id ? { ...r, status: 'finalized' } : r));
      } else {
        toast.error(d.error || 'Erreur lors de la finalisation');
      }
    } catch (err) {
      toast.error('Erreur réseau');
    }
  };

  // ─── Suppression ──────────────────────────────────────────────────────────────
  const deleteReport = async (id: string) => {
    if (!confirm('Supprimer ce rapport définitivement ?')) return;
    try {
      const res = await fetch(`${API}/reports/${id}`, { method: 'DELETE', headers: HEADERS });
      const d = await res.json();
      if (d.success) {
        toast.success('Rapport supprimé');
        setReports(prev => prev.filter(r => r.id !== id));
      } else {
        toast.error(d.error || 'Erreur de suppression');
      }
    } catch (err) {
      toast.error('Erreur réseau');
    }
  };

  // ─── Export CSV ───────────────────────────────────────────────────────────────
  const exportReport = (report: Report) => {
    let csv = `Rapport Financier SmartCabb\n`;
    csv += `Période:,${fmtDateShort(report.period_start)} - ${fmtDateShort(report.period_end)}\n`;
    csv += `Généré le:,${fmtDate(report.created_at)}\n`;
    csv += `Statut:,${report.status === 'finalized' ? 'Finalisé' : 'En attente'}\n\n`;
    csv += `MÉTRIQUES,MONTANT\n`;
    csv += `Revenus totaux,${report.total_revenue} CDF\n`;
    csv += `Nombre de courses,${report.total_rides}\n`;
    csv += `Commission SmartCabb (${report.commission_rate ?? 10}%),${report.commission_amount} CDF\n`;
    csv += `Gains conducteurs,${report.driver_earnings} CDF\n`;
    csv += `Remboursements,-${report.refunds_amount} CDF\n`;
    csv += `Revenu net,${report.net_revenue} CDF\n`;
    if (report.by_category && Object.keys(report.by_category).length > 0) {
      csv += `\nPAR CATÉGORIE,COURSES,REVENUS\n`;
      Object.entries(report.by_category).forEach(([cat, data]) => {
        csv += `${cat},${data.rides},${Math.round(data.revenue)} CDF\n`;
      });
    }

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `rapport-smartcabb-${report.period_start.slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Rapport exporté en CSV');
  };

  // ─── Rendu ────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button onClick={() => onBack ? onBack() : setCurrentScreen('admin-dashboard')} variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Rapports financiers</h1>
            <p className="text-sm text-gray-600">Générez et consultez les rapports financiers</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={loadAll} variant="outline" size="icon" disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={() => setShowGenerator(true)} className="gap-2">
            <FileText className="w-4 h-4" />
            Nouveau rapport
          </Button>
        </div>
      </div>

      {/* ── KPI du mois courant (données live) ── */}
      <div>
        <p className="text-xs text-gray-500 mb-3 flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block" />
          Données en temps réel — {summary?.month ?? 'Ce mois'}
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Revenus ce mois', value: summary?.totalRevenue ?? 0,    icon: DollarSign, color: 'text-green-600',  bg: 'bg-green-50'  },
            { label: 'Commission',       value: summary?.commissionAmount ?? 0, icon: Percent,    color: 'text-blue-600',   bg: 'bg-blue-50'   },
            { label: 'Gains conducteurs',value: summary?.driverEarnings ?? 0,  icon: Users,      color: 'text-purple-600', bg: 'bg-purple-50' },
            { label: 'Revenu net',       value: summary?.netRevenue ?? 0,      icon: TrendingUp, color: 'text-orange-600', bg: 'bg-orange-50' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <Card key={label} className={`p-5 ${bg} border-0`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">{label}</span>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              {loading ? (
                <div className="h-7 bg-gray-200 rounded animate-pulse w-28" />
              ) : (
                <div className={`text-2xl font-bold ${color}`}>{fmt(value)} CDF</div>
              )}
              {label === 'Revenus ce mois' && summary && (
                <p className="text-xs text-gray-500 mt-1">{summary.totalRides} courses</p>
              )}
              {label === 'Commission' && summary && (
                <p className="text-xs text-gray-500 mt-1">Taux : {summary.commissionRate}%</p>
              )}
            </Card>
          ))}
        </div>
      </div>

      {/* ── Historique des rapports ── */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold">Historique des rapports</h2>
          <Badge variant="secondary">{reports.length} rapport{reports.length !== 1 ? 's' : ''}</Badge>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="border rounded-lg p-4 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-64 mb-3" />
                <div className="grid grid-cols-5 gap-4">
                  {[1,2,3,4,5].map(j => <div key={j} className="h-8 bg-gray-200 rounded" />)}
                </div>
              </div>
            ))}
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <FileText className="w-14 h-14 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium mb-1">Aucun rapport généré</p>
            <p className="text-sm text-gray-400 mb-6">Créez votre premier rapport financier pour analyser les revenus</p>
            <Button onClick={() => setShowGenerator(true)} className="gap-2">
              <FileText className="w-4 h-4" />
              Générer le premier rapport
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((report, index) => (
              <motion.div
                key={report.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="border rounded-xl p-5 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">

                    {/* Période + badge */}
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      <h3 className="font-semibold text-sm">
                        {fmtDateShort(report.period_start)} → {fmtDateShort(report.period_end)}
                      </h3>
                      <Badge variant={report.status === 'finalized' ? 'default' : 'secondary'} className="text-xs">
                        {report.status === 'finalized' ? '✅ Finalisé' : '⏳ En attente'}
                      </Badge>
                      <span className="text-xs text-gray-400">
                        Généré le {fmtDateShort(report.created_at)}
                      </span>
                    </div>

                    {/* KPI grille */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      <div className="bg-green-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500">Revenus</p>
                        <p className="font-bold text-green-700">{fmt(report.total_revenue)} CDF</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500">Courses</p>
                        <p className="font-bold text-gray-800">{report.total_rides}</p>
                      </div>
                      <div className="bg-blue-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500">Commission ({report.commission_rate ?? 10}%)</p>
                        <p className="font-bold text-blue-700">{fmt(report.commission_amount)} CDF</p>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500">Conducteurs</p>
                        <p className="font-bold text-purple-700">{fmt(report.driver_earnings)} CDF</p>
                      </div>
                      <div className="bg-orange-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500">Net</p>
                        <p className="font-bold text-orange-700">{fmt(report.net_revenue)} CDF</p>
                      </div>
                    </div>

                    {/* Ventilation par catégorie */}
                    {report.by_category && Object.keys(report.by_category).length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {Object.entries(report.by_category).map(([cat, data]) => (
                          <span key={cat} className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-700 rounded-full px-3 py-1">
                            <Car className="w-3 h-3" />
                            {cat}: {data.rides} courses · {fmt(data.revenue)} CDF
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 shrink-0">
                    {report.status === 'pending' && (
                      <Button onClick={() => finalizeReport(report.id)} variant="outline" size="sm" className="gap-1 text-xs">
                        <CheckCircle className="w-3 h-3" />
                        Finaliser
                      </Button>
                    )}
                    <Button onClick={() => exportReport(report)} variant="outline" size="sm" className="gap-1 text-xs">
                      <Download className="w-3 h-3" />
                      CSV
                    </Button>
                    <Button
                      onClick={() => deleteReport(report.id)}
                      variant="ghost"
                      size="sm"
                      className="gap-1 text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-3 h-3" />
                      Supprimer
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </Card>

      {/* ── Dialogue génération ── */}
      <Dialog open={showGenerator} onOpenChange={setShowGenerator}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Générer un rapport financier</DialogTitle>
            <DialogDescription>
              Le rapport est calculé à partir des courses terminées dans la période choisie.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 pt-2">
            <div>
              <Label className="mb-2 block">Type de période</Label>
              <Select value={reportType} onValueChange={(v: any) => setReportType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Aujourd'hui</SelectItem>
                  <SelectItem value="weekly">7 derniers jours</SelectItem>
                  <SelectItem value="monthly">30 derniers jours</SelectItem>
                  <SelectItem value="custom">Période personnalisée</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start" className="mb-1 block">Date de début</Label>
                <input
                  id="start"
                  type="date"
                  value={startDate}
                  onChange={e => { setStartDate(e.target.value); setReportType('custom'); }}
                  className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <Label htmlFor="end" className="mb-1 block">Date de fin</Label>
                <input
                  id="end"
                  type="date"
                  value={endDate}
                  onChange={e => { setEndDate(e.target.value); setReportType('custom'); }}
                  className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min={startDate}
                />
              </div>
            </div>

            {startDate && endDate && (
              <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg text-xs text-blue-800">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>
                  Le rapport inclura toutes les courses <strong>terminées</strong> entre le{' '}
                  <strong>{fmtDateShort(startDate)}</strong> et le <strong>{fmtDateShort(endDate)}</strong>.
                </span>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2 border-t">
              <Button variant="outline" onClick={() => setShowGenerator(false)}>Annuler</Button>
              <Button
                onClick={generateReport}
                disabled={generating || !startDate || !endDate}
                className="gap-2"
              >
                {generating ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" /> Génération...</>
                ) : (
                  <><FileText className="w-4 h-4" /> Générer le rapport</>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
