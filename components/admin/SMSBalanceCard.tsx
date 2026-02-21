import { useState, useEffect } from 'react';
import { motion } from '../../lib/motion';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { MessageSquare, RefreshCw, TrendingUp, CheckCircle, Send, XCircle, AlertTriangle } from '../../lib/admin-icons';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { toast } from '../../lib/toast';

interface SMSBalanceData {
  balance: {
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
    byType?: {
      otp_code?: number;
      reset_password_otp?: number;
      ride_notification?: number;
      other?: number;
    };
  };
  lastUpdated: string;
}

export function SMSBalanceCard() {
  const [data, setData] = useState<SMSBalanceData | null>(null);
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
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setData(result);
      } else {
        setError(result.error || 'Erreur inconnue');
      }
    } catch (err: any) {
      console.error('❌ Erreur récupération balance SMS:', err);
      setError(err.message || 'Erreur de connexion');
      toast.error('Impossible de récupérer la balance SMS');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalance();
    
    // Rafraîchir toutes les 5 minutes
    const interval = setInterval(fetchBalance, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !data) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <MessageSquare className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded animate-pulse w-32 mb-2"></div>
            <div className="h-6 bg-gray-200 rounded animate-pulse w-24"></div>
          </div>
        </div>
      </Card>
    );
  }

  if (error && !data) {
    return (
      <Card className="p-6 border-red-200 bg-red-50">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-red-900">Erreur Balance SMS</h3>
            <p className="text-sm text-red-700">{error}</p>
          </div>
          <Button
            onClick={fetchBalance}
            variant="ghost"
            size="icon"
            className="text-red-600 hover:text-red-700"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </Card>
    );
  }

  if (!data) return null;

  const balanceAmount = data.balance.amount;
  const remainingSms = data.estimation.remainingSms;
  const successRate = parseFloat(data.usage.successRate);

  // Déterminer la couleur selon le nombre de SMS restants
  const getBalanceColor = () => {
    if (remainingSms > 10000) return 'text-green-600';
    if (remainingSms > 1000) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getBalanceBgColor = () => {
    if (remainingSms > 10000) return 'bg-green-100';
    if (remainingSms > 1000) return 'bg-yellow-100';
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
              <p className="text-2xl">
                {data.balance.formattedBalance}
              </p>
              {data.balance.error && (
                <p className="text-xs text-red-500 mt-1">{data.balance.error}</p>
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
            <p className={`text-2xl ${getBalanceColor()}`}>
              {remainingSms.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              ~{data.estimation.costPerSms} USD/SMS
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-4 h-4 text-gray-500" />
              <span className="text-xs text-gray-600">Taux de succès</span>
            </div>
            <p className="text-2xl text-gray-900">
              {data.usage.successRate}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {data.usage.totalSent}/{data.usage.totalAttempted} envoyés
            </p>
          </div>
        </div>

        {/* Statistiques d'utilisation */}
        <div className="space-y-3">
          <h4 className="text-sm text-gray-700">Utilisation</h4>
          
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Send className="w-4 h-4 text-green-600" />
              <span className="text-gray-600">Envoyés</span>
            </div>
            <span className="text-green-600">{data.usage.totalSent}</span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-600" />
              <span className="text-gray-600">Échoués</span>
            </div>
            <span className="text-red-600">{data.usage.totalFailed}</span>
          </div>

          {/* Par type */}
          {data.usage.byType && (
            <div className="pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-500 mb-2">Par type</p>
              <div className="space-y-2">
                {data.usage.byType.otp_code > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">Codes OTP</span>
                    <span className="text-gray-900">{data.usage.byType.otp_code}</span>
                  </div>
                )}
                {data.usage.byType.reset_password_otp > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">Récup. mot de passe</span>
                    <span className="text-gray-900">{data.usage.byType.reset_password_otp}</span>
                  </div>
                )}
                {data.usage.byType.ride_notification > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">Notifications course</span>
                    <span className="text-gray-900">{data.usage.byType.ride_notification}</span>
                  </div>
                )}
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
              <p className="text-gray-900">{data.estimation.estimatedCost.perSms}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-600">100 SMS</p>
              <p className="text-gray-900">{data.estimation.estimatedCost.per100Sms}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-600">1000 SMS</p>
              <p className="text-gray-900">{data.estimation.estimatedCost.per1000Sms}</p>
            </div>
          </div>
        </div>

        {/* Warning si balance faible */}
        {remainingSms < 1000 && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-yellow-800">
                  <strong>Attention:</strong> Votre balance SMS est faible. Pensez à recharger votre compte Africa's Talking.
                </p>
              </div>
            </div>
          </div>
        )}

        <p className="text-xs text-gray-400 text-center mt-4">
          Dernière mise à jour : {new Date(data.lastUpdated).toLocaleTimeString('fr-FR')}
        </p>
      </Card>
    </motion.div>
  );
}