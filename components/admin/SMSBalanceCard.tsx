import { useState, useEffect } from 'react';
import { motion } from '../../lib/motion';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { MessageSquare, RefreshCw, TrendingUp, CheckCircle, Send, XCircle, AlertTriangle } from '../../lib/admin-icons';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { toast } from '../../lib/toast';

interface SMSBalanceData {
  balance_data: {
    amount: number;
    currency: string;
    formattedBalance: string;
    error?: string;
  };
  estimation: {
    costPerSms: number;
    remainingSms: number;
    estimatedCost: {
      perSms: string;
      per100Sms: string;
      per1000Sms: string;
    };
  };
  usage: {
    totalSent: number;
    totalFailed: number;
    totalAttempted: number;
    successRate: string;
    byType?: Record<string, number>;
  };
  lastUpdated: string;
}

export function SMSBalanceCard() {
  const [smsData, setSmsData] = useState<SMSBalanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/admin/sms/balance`,
        {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${publicAnonKey}` }
        }
      );

      const data = await response.json();

      if (data.success || data.balance !== undefined) {
        setSmsData({
          balance_data:  data.balance_data  || { amount: data.balance || 0, currency: data.currency || 'USD', formattedBalance: `${data.currency || 'USD'} ${(data.balance || 0).toFixed(2)}` },
          estimation:    data.estimation    || { costPerSms: 0.0035, remainingSms: 0, estimatedCost: { perSms: '$0.0035', per100Sms: '$0.35', per1000Sms: '$3.50' } },
          usage:         data.usage         || { totalSent: 0, totalFailed: 0, totalAttempted: 0, successRate: '0%', byType: {} },
          lastUpdated:   data.lastUpdated   || new Date().toISOString(),
        });
      } else {
        setError(data.error || 'Impossible de récupérer le solde SMS');
      }
    } catch (err) {
      console.error('Erreur récupération balance SMS:', err);
      setError('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalance();
    const interval = setInterval(fetchBalance, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // ─── État chargement ──────────────────────────────────────────────────────────
  if (loading && !smsData) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <MessageSquare className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded animate-pulse w-32 mb-2" />
            <div className="h-6 bg-gray-200 rounded animate-pulse w-24" />
          </div>
        </div>
      </Card>
    );
  }

  // ─── État erreur (sans données) ───────────────────────────────────────────────
  if (error && !smsData) {
    return (
      <Card className="p-6 border-orange-200 bg-orange-50">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-orange-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-orange-900 font-medium">Balance SMS</h3>
            <p className="text-sm text-orange-700">{error}</p>
            <p className="text-xs text-orange-600 mt-1">Vérifiez la configuration Africa's Talking</p>
          </div>
          <Button onClick={fetchBalance} variant="ghost" size="icon" className="text-orange-600 hover:text-orange-700">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </Card>
    );
  }

  if (!smsData) return null;

  const { balance_data, estimation, usage, lastUpdated } = smsData;
  const remainingSms = estimation.remainingSms;

  const getBalanceColor = () => {
    if (remainingSms > 10000) return 'text-green-600';
    if (remainingSms > 1000)  return 'text-yellow-600';
    return 'text-red-600';
  };

  const getBalanceBgColor = () => {
    if (remainingSms > 10000) return 'bg-green-100';
    if (remainingSms > 1000)  return 'bg-yellow-100';
    return 'bg-red-100';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 ${getBalanceBgColor()} rounded-lg flex items-center justify-center`}>
              <MessageSquare className={`w-6 h-6 ${getBalanceColor()}`} />
            </div>
            <div>
              <h3 className="text-sm text-gray-600">Balance SMS</h3>
              <p className="text-2xl font-bold">{balance_data.formattedBalance}</p>
              {balance_data.error && (
                <p className="text-xs text-orange-500 mt-1">{balance_data.error}</p>
              )}
            </div>
          </div>
          <Button
            onClick={fetchBalance}
            variant="ghost"
            size="icon"
            disabled={loading}
            className="shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* SMS Restants */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-gray-500" />
              <span className="text-xs text-gray-600">SMS Restants</span>
            </div>
            <p className={`text-2xl font-bold ${getBalanceColor()}`}>
              {remainingSms.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              ~{estimation.costPerSms} USD/SMS
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-4 h-4 text-gray-500" />
              <span className="text-xs text-gray-600">Taux de succès</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{usage.successRate}</p>
            <p className="text-xs text-gray-500 mt-1">
              {usage.totalSent}/{usage.totalAttempted} envoyés
            </p>
          </div>
        </div>

        {/* Statistiques d'utilisation */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700">Utilisation</h4>
          
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Send className="w-4 h-4 text-green-600" />
              <span className="text-gray-600">Envoyés</span>
            </div>
            <span className="text-green-600 font-medium">{usage.totalSent}</span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-600" />
              <span className="text-gray-600">Échoués</span>
            </div>
            <span className="text-red-600 font-medium">{usage.totalFailed}</span>
          </div>

          {/* Par type */}
          {usage.byType && Object.keys(usage.byType).length > 0 && (
            <div className="pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-500 mb-2">Par type</p>
              <div className="space-y-2">
                {Object.entries(usage.byType).map(([type, count]) => count > 0 && (
                  <div key={type} className="flex items-center justify-between text-xs">
                    <span className="text-gray-600 capitalize">{type.replace(/_/g, ' ')}</span>
                    <span className="text-gray-900 font-medium">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Estimation des coûts */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 mb-2">Estimation des coûts</p>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="text-center">
              <p className="text-gray-600">1 SMS</p>
              <p className="text-gray-900 font-medium">{estimation.estimatedCost.perSms}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-600">100 SMS</p>
              <p className="text-gray-900 font-medium">{estimation.estimatedCost.per100Sms}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-600">1000 SMS</p>
              <p className="text-gray-900 font-medium">{estimation.estimatedCost.per1000Sms}</p>
            </div>
          </div>
        </div>

        {/* Warning si balance faible */}
        {remainingSms > 0 && remainingSms < 1000 && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
              <p className="text-xs text-yellow-800">
                <strong>Attention :</strong> Votre balance SMS est faible. Pensez à recharger votre compte Africa's Talking.
              </p>
            </div>
          </div>
        )}

        <p className="text-xs text-gray-400 text-center mt-4">
          Dernière mise à jour : {new Date(lastUpdated).toLocaleTimeString('fr-FR')}
        </p>
      </Card>
    </motion.div>
  );
}
