import { useCallback, useEffect, useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import {
  ArrowLeft,
  RefreshCw,
  Smartphone,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Wallet,
  Phone,
} from '../../lib/admin-icons';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/admin`;
const HEADERS = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${publicAnonKey}`,
};

type EjpayStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'REVIEW';

interface EjpayOrderRow {
  orderId: string;
  reference: string | null;
  direction: 'C2B' | 'B2C';
  kind: string;
  amount: number;
  currency: string;
  operatorName: string;
  msisdn: string;
  status: EjpayStatus;
  reason?: string | null;
  createdAt: string;
  settledAt?: string | null;
}

interface Totals {
  count: number;
  successAmount: number;
  pending: number;
  failed: number;
  review: number;
}

const KIND_LABEL: Record<string, string> = {
  wallet_topup: 'Recharge passager',
  driver_wallet_topup: 'Recharge chauffeur',
  ride_payment: 'Paiement course',
  deposit: 'Acompte réservation',
  payout: 'Retrait chauffeur',
  other: 'Autre',
};

const STATUS_LABEL: Record<EjpayStatus, string> = {
  PENDING: 'En attente',
  SUCCESS: 'Réussi',
  FAILED: 'Échoué',
  REVIEW: 'À vérifier',
};

const STATUS_CLASS: Record<EjpayStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-800 border-amber-200',
  SUCCESS: 'bg-green-100 text-green-800 border-green-200',
  FAILED: 'bg-red-100 text-red-800 border-red-200',
  REVIEW: 'bg-orange-100 text-orange-900 border-orange-300',
};

const OPERATOR_BY_ID: Record<number, string> = {
  9: 'Vodacom M-Pesa',
  10: 'Orange Money',
  17: 'Airtel Money',
  19: 'Africell Afrimoney',
};

function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function EjpayTransactionsScreen({ onBack }: { onBack?: () => void }) {
  const [orders, setOrders] = useState<EjpayOrderRow[]>([]);
  const [totals, setTotals] = useState<Totals>({ count: 0, successAmount: 0, pending: 0, failed: 0, review: 0 });
  const [filter, setFilter] = useState<'ALL' | EjpayStatus>('ALL');
  const [loading, setLoading] = useState(true);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [wallets, setWallets] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/ejpay/orders?limit=300`, { headers: HEADERS });
      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || `Erreur ${response.status}`);
      }
      setOrders(data.orders || []);
      setTotals(data.totals || { count: 0, successAmount: 0, pending: 0, failed: 0, review: 0 });
    } catch (err: any) {
      setError(err?.message || 'Impossible de charger les transactions');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadWallets = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/ejpay/wallets`, { headers: HEADERS });
      const data = await response.json();
      if (response.ok && data?.success) {
        setWallets(Array.isArray(data.wallets) ? data.wallets : []);
      }
    } catch {
      /* soldes facultatifs */
    }
  }, []);

  useEffect(() => {
    void load();
    void loadWallets();
  }, [load, loadWallets]);

  const refreshOrder = async (orderId: string) => {
    setRefreshingId(orderId);
    try {
      const response = await fetch(`${API_BASE}/ejpay/orders/${encodeURIComponent(orderId)}/refresh`, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify({}),
      });
      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || `Erreur ${response.status}`);
      }
      await load();
    } catch (err: any) {
      setError(err?.message || 'Réconciliation impossible');
    } finally {
      setRefreshingId(null);
    }
  };

  const visibleOrders = filter === 'ALL' ? orders : orders.filter((o) => o.status === filter);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b px-4 py-4 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {onBack && (
              <Button variant="ghost" size="icon" onClick={onBack}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
            )}
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Transactions Mobile Money</h1>
              <p className="text-sm text-gray-500">Ejpay (M-Pesa, Orange, Airtel, Afrimoney)</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => { void load(); void loadWallets(); }} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            <span className="ml-2">Actualiser</span>
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 space-y-4">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-4">
            <p className="text-xs text-gray-500">Encaissé (réussi)</p>
            <p className="text-lg font-bold text-green-700">
              {totals.successAmount.toLocaleString('fr-FR')} CDF
            </p>
            <p className="text-xs text-gray-500 mt-1">{totals.count} transaction(s)</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-gray-500">En attente</p>
            <p className="text-lg font-bold text-amber-700">{totals.pending}</p>
            <p className="text-xs text-gray-500 mt-1">validation téléphone</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-gray-500">Échoués</p>
            <p className="text-lg font-bold text-red-700">{totals.failed}</p>
            <p className="text-xs text-gray-500 mt-1">refus / erreur</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-gray-500">À vérifier</p>
            <p className="text-lg font-bold text-orange-700">{totals.review}</p>
            <p className="text-xs text-gray-500 mt-1">écart de montant</p>
          </Card>
        </div>

        <div className="flex flex-wrap gap-2">
          {(['ALL', 'PENDING', 'SUCCESS', 'FAILED', 'REVIEW'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                filter === status
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
              }`}
            >
              {status === 'ALL' ? 'Toutes' : STATUS_LABEL[status]}
            </button>
          ))}
        </div>

        <Card className="overflow-hidden">
          {loading ? (
            <div className="p-10 flex flex-col items-center gap-3 text-gray-500">
              <Loader2 className="w-6 h-6 animate-spin" />
              <p className="text-sm">Chargement des transactions…</p>
            </div>
          ) : visibleOrders.length === 0 ? (
            <div className="p-10 flex flex-col items-center gap-3 text-gray-500">
              <Smartphone className="w-10 h-10 text-gray-300" />
              <p className="text-sm">Aucune transaction pour ce filtre.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Date</th>
                    <th className="text-left px-4 py-3 font-medium">Type</th>
                    <th className="text-left px-4 py-3 font-medium">Opérateur</th>
                    <th className="text-left px-4 py-3 font-medium">Téléphone</th>
                    <th className="text-right px-4 py-3 font-medium">Montant</th>
                    <th className="text-left px-4 py-3 font-medium">Statut</th>
                    <th className="text-right px-4 py-3 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {visibleOrders.map((order) => (
                    <tr key={order.orderId} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                        {formatDate(order.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        <div className="font-medium">{KIND_LABEL[order.kind] || order.kind}</div>
                        <div className="text-xs text-gray-400 font-mono">
                          {order.orderId.length > 22 ? `${order.orderId.slice(0, 22)}…` : order.orderId}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{order.operatorName}</td>
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5 text-gray-400" />
                          {order.msisdn}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900 whitespace-nowrap">
                        {Number(order.amount).toLocaleString('fr-FR')} {order.currency}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border text-xs font-medium ${STATUS_CLASS[order.status]}`}
                        >
                          {order.status === 'SUCCESS' && <CheckCircle2 className="w-3.5 h-3.5" />}
                          {order.status === 'FAILED' && <XCircle className="w-3.5 h-3.5" />}
                          {order.status === 'PENDING' && <Clock className="w-3.5 h-3.5" />}
                          {order.status === 'REVIEW' && <AlertCircle className="w-3.5 h-3.5" />}
                          {STATUS_LABEL[order.status]}
                        </span>
                        {order.settledAt && (
                          <div className="text-xs text-gray-400 mt-1">
                            réglé {formatDate(order.settledAt)}
                          </div>
                        )}
                        {order.status === 'REVIEW' && order.reason && (
                          <div className="text-xs text-orange-700 mt-1 max-w-[220px]">{order.reason}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {(order.status === 'PENDING' || order.status === 'REVIEW') && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => refreshOrder(order.orderId)}
                            disabled={refreshingId === order.orderId}
                          >
                            {refreshingId === order.orderId ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <RefreshCw className="w-3.5 h-3.5" />
                            )}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Wallet className="w-4 h-4 text-gray-500" />
            <h2 className="font-medium text-gray-900">Soldes marchand chez Ejpay</h2>
          </div>
          {wallets.length === 0 ? (
            <p className="text-sm text-gray-500">
              Aucun solde retourné (compte marchand pas encore alimenté, ou API indisponible).
            </p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {wallets.map((wallet, index) => (
                <div key={wallet.id ?? index} className="rounded-lg border p-3">
                  <p className="text-xs text-gray-500">
                    {wallet.operator ||
                      wallet.operatorName ||
                      OPERATOR_BY_ID[Number(wallet.operateurId)] ||
                      wallet.name ||
                      `Wallet ${index + 1}`}
                  </p>
                  <p className="font-semibold text-gray-900">
                    {Number(wallet.solde ?? wallet.balance ?? wallet.amount ?? 0).toLocaleString('fr-FR')}{' '}
                    {wallet.devise || wallet.currency || 'CDF'}
                  </p>
                  {wallet.action && (
                    <p className="text-xs text-gray-400 mt-1">
                      {wallet.action === 'DEBIT' ? 'débit' : 'crédit'}
                      {wallet.source ? ` · ${wallet.source}` : ''}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
