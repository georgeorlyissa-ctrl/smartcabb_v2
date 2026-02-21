"use client";

// 🔥 v311.3 - Version simplifiée SANS recharts (évite les erreurs de build Vercel)
import { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { 
  TrendingUp, 
  DollarSign, 
  Car, 
  Users, 
  Calendar,
  Download,
  RefreshCw,
  Star,
  ArrowUp,
  ArrowDown,
  ArrowLeft
} from '../../lib/admin-icons';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { toast } from '../../lib/toast';
import { useAppState } from '../../hooks/useAppState';

const CATEGORY_NAMES = {
  smart_standard: 'Standard',
  smart_confort: 'Confort',
  smart_plus: 'Plus',
  smart_business: 'Business'
};

export function AdminAnalyticsDashboard() {
  const { setCurrentScreen } = useAppState();
  const [stats, setStats] = useState<any>(null);
  const [periodData, setPeriodData] = useState<any[]>([]);
  const [categoryStats, setCategoryStats] = useState<any>({});
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [period, setPeriod] = useState(7); // 7 jours par défaut
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadAllData();
    // ❌ PAS de rechargement automatique
  }, [period]);

  const loadAllData = async () => {
    setLoading(true);
    setIsRefreshing(true);
    try {
      await Promise.all([
        loadOverviewStats(),
        loadPeriodStats(),
        loadCategoryStats(),
        loadLeaderboard()
      ]);
    } catch (error) {
      console.error('❌ Erreur chargement données:', error);
      toast.error('Erreur lors du chargement des statistiques');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // ✅ Fonction pour actualiser manuellement
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadAllData();
  };

  const handleExport = () => {
    try {
      // Préparer les données à exporter
      const exportData = [];

      // 1. Statistiques générales
      exportData.push(['STATISTIQUES GÉNÉRALES']);
      exportData.push(['']);
      if (stats) {
        exportData.push(['Total Courses', stats.totalRides || 0]);
        exportData.push(['Revenu Total (CDF)', stats.totalRevenue || 0]);
        exportData.push(['Total Commissions (CDF)', stats.totalCommissions || 0]);
        exportData.push(['Conducteurs Actifs', stats.activeDrivers || 0]);
      }
      exportData.push(['']);

      // 2. Données par période
      exportData.push(['ÉVOLUTION SUR ' + period + ' JOURS']);
      exportData.push(['']);
      exportData.push(['Date', 'Courses', 'Revenus (CDF)', 'Commissions (CDF)', 'Conducteurs Actifs']);
      periodData.forEach(day => {
        exportData.push([
          day.date,
          day.rides,
          day.revenue,
          day.commissions,
          day.activeDrivers
        ]);
      });
      exportData.push(['']);

      // 3. Statistiques par catégorie
      exportData.push(['STATISTIQUES PAR CATÉGORIE']);
      exportData.push(['']);
      exportData.push(['Catégorie', 'Courses', 'Revenus (CDF)']);
      Object.entries(categoryStats).forEach(([category, data]: [string, any]) => {
        exportData.push([
          CATEGORY_NAMES[category as keyof typeof CATEGORY_NAMES] || category,
          data.rides || 0,
          data.revenue || 0
        ]);
      });
      exportData.push(['']);

      // 4. Top 10 conducteurs
      exportData.push(['TOP 10 CONDUCTEURS']);
      exportData.push(['']);
      exportData.push(['Rang', 'Nom', 'Courses', 'Gains Nets (CDF)', 'Commissions (CDF)', 'Note Moyenne']);
      leaderboard.forEach((driver, index) => {
        exportData.push([
          index + 1,
          driver.driverName || driver.driverId,
          driver.totalRides,
          driver.netEarnings,
          driver.totalCommissions,
          driver.averageRating?.toFixed(1) || 'N/A'
        ]);
      });

      // Convertir en CSV
      const csv = exportData.map(row => row.join(',')).join('\n');

      // Créer le fichier et télécharger
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      const date = new Date().toISOString().split('T')[0];
      link.setAttribute('href', url);
      link.setAttribute('download', `smartcabb_analytics_${date}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Export réussi !');
    } catch (error) {
      console.error('❌ Erreur export:', error);
      toast.error('Erreur lors de l\'export');
    }
  };

  const loadOverviewStats = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/admin/stats/overview`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error('❌ Erreur stats overview:', error);
    }
  };

  const loadPeriodStats = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/admin/stats/period/${period}`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setPeriodData(data.data || []);
      }
    } catch (error) {
      console.error('❌ Erreur stats période:', error);
    }
  };

  const loadCategoryStats = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/admin/stats/categories`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setCategoryStats(data.categories || {});
      }
    } catch (error) {
      console.error('❌ Erreur stats catégories:', error);
    }
  };

  const loadLeaderboard = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/admin/drivers/leaderboard`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setLeaderboard(data.leaderboard || []);
      }
    } catch (error) {
      console.error('❌ Erreur leaderboard:', error);
    }
  };

  const formatCurrency = (value: number) => {
    return `${(value || 0).toLocaleString()} CDF`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  };

  const calculateTrend = (current: number, previous: number) => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600">Chargement des statistiques...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Button 
              onClick={() => setCurrentScreen('admin-dashboard')} 
              variant="ghost" 
              size="icon"
              className="shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
              <p className="text-gray-600 mt-1">Vue d'ensemble des performances SmartCabb</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualiser
            </Button>
            <Button onClick={handleExport} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Exporter
            </Button>
          </div>
        </div>

        {/* Période selector */}
        <div className="flex gap-2">
          {[7, 14, 30, 90].map(days => (
            <Button
              key={days}
              onClick={() => setPeriod(days)}
              variant={period === days ? 'default' : 'outline'}
              size="sm"
            >
              {days} jours
            </Button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Courses du jour */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Car className="w-6 h-6 text-blue-600" />
            </div>
            <TrendingUp className="w-5 h-5 text-green-500" />
          </div>
          <h3 className="text-sm text-gray-600 mb-1">Courses aujourd'hui</h3>
          <p className="text-3xl font-bold text-gray-900">{stats?.today?.rides || 0}</p>
          <p className="text-xs text-gray-500 mt-2">
            Total: {stats?.allTime?.totalRides || 0} courses
          </p>
        </Card>

        {/* Revenus du jour */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <TrendingUp className="w-5 h-5 text-green-500" />
          </div>
          <h3 className="text-sm text-gray-600 mb-1">Revenus aujourd'hui</h3>
          <p className="text-3xl font-bold text-gray-900">
            {formatCurrency(stats?.today?.revenue || 0)}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Total: {formatCurrency(stats?.allTime?.totalRevenue || 0)}
          </p>
        </Card>

        {/* Commissions */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-orange-600" />
            </div>
            <span className="text-sm text-orange-600 font-semibold">15%</span>
          </div>
          <h3 className="text-sm text-gray-600 mb-1">Commissions aujourd'hui</h3>
          <p className="text-3xl font-bold text-gray-900">
            {formatCurrency(stats?.today?.commissions || 0)}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Total: {formatCurrency(stats?.allTime?.totalCommissions || 0)}
          </p>
        </Card>

        {/* Conducteurs actifs */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
            <Calendar className="w-5 h-5 text-purple-500" />
          </div>
          <h3 className="text-sm text-gray-600 mb-1">Conducteurs actifs</h3>
          <p className="text-3xl font-bold text-gray-900">{stats?.today?.activeDrivers || 0}</p>
          <p className="text-xs text-gray-500 mt-2">
            {stats?.allTime?.totalDrivers || 0} conducteurs enregistrés
          </p>
        </Card>
      </div>

      {/* Stats par catégorie */}
      <Card className="p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">Répartition par catégorie</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(categoryStats).map(([key, value]: [string, any]) => (
            <div key={key} className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-900 mb-2">
                {CATEGORY_NAMES[key as keyof typeof CATEGORY_NAMES] || key}
              </h4>
              <div className="space-y-1">
                <p className="text-2xl font-bold text-blue-900">{value.rides}</p>
                <p className="text-sm text-blue-700">courses</p>
                <p className="text-sm font-semibold text-blue-800 mt-2">
                  {formatCurrency(value.revenue)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Tableau des données périodiques */}
      <Card className="p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">Évolution sur {period} jours</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4">Date</th>
                <th className="text-right py-3 px-4">Courses</th>
                <th className="text-right py-3 px-4">Revenus</th>
                <th className="text-right py-3 px-4">Commissions</th>
                <th className="text-right py-3 px-4">Conducteurs actifs</th>
                <th className="text-right py-3 px-4">Passagers actifs</th>
              </tr>
            </thead>
            <tbody>
              {periodData.map((day, index) => (
                <tr key={day.date} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4">{formatDate(day.date)}</td>
                  <td className="text-right py-3 px-4 font-semibold">{day.rides}</td>
                  <td className="text-right py-3 px-4">{formatCurrency(day.revenue)}</td>
                  <td className="text-right py-3 px-4 text-green-600">{formatCurrency(day.commissions)}</td>
                  <td className="text-right py-3 px-4">{day.activeDrivers}</td>
                  <td className="text-right py-3 px-4">{day.activePassengers}</td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {periodData.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              Aucune donnée disponible pour cette période
            </div>
          )}
        </div>
      </Card>

      {/* Leaderboard */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">🏆 Top Conducteurs</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4">Rang</th>
                <th className="text-left py-3 px-4">Conducteur</th>
                <th className="text-right py-3 px-4">Courses</th>
                <th className="text-right py-3 px-4">Gains</th>
                <th className="text-right py-3 px-4">Commissions</th>
                <th className="text-right py-3 px-4">Note</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.slice(0, 10).map((driver, index) => (
                <tr key={driver.driverId} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <span className={`font-bold ${
                      index === 0 ? 'text-yellow-500' :
                      index === 1 ? 'text-gray-400' :
                      index === 2 ? 'text-orange-600' :
                      'text-gray-600'
                    }`}>
                      #{index + 1}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-medium">{driver.driverName || driver.driverId}</td>
                  <td className="text-right py-3 px-4">{driver.totalRides}</td>
                  <td className="text-right py-3 px-4 font-semibold text-green-600">
                    {formatCurrency(driver.totalEarnings)}
                  </td>
                  <td className="text-right py-3 px-4 text-orange-600">
                    {formatCurrency(driver.totalCommissions)}
                  </td>
                  <td className="text-right py-3 px-4">
                    <div className="flex items-center justify-end gap-1">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      <span className="font-semibold">{(driver.averageRating || 0).toFixed(1)}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {leaderboard.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              Aucune donnée disponible
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}