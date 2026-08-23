import { useState, useEffect, useCallback } from 'react';
import { useAppState } from '../../hooks/useAppState';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { toast } from '../../lib/toast';

const API = `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52`;

export function LoyaltyScreen() {
  const { state, setCurrentScreen } = useAppState();
  const passengerId = state.currentUser?.id;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState<number | null>(null);

  const fetchLoyalty = useCallback(async () => {
    if (!passengerId) return;
    try {
      const resp = await fetch(`${API}/loyalty/${passengerId}`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` },
      });
      const j = await resp.json();
      if (j.success) setData(j);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [passengerId]);

  useEffect(() => { fetchLoyalty(); }, [fetchLoyalty]);

  const handleRedeem = async (points: number, category?: string) => {
    if (!passengerId) return;
    setRedeeming(points);
    try {
      const resp = await fetch(`${API}/loyalty/redeem`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${publicAnonKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ passengerId, points, category }),
      });
      const j = await resp.json();
      if (!j.success) throw new Error(j.error || 'Erreur');
      toast.success(`Code obtenu : ${j.redeemCode} — ${j.label} (cap ${j.cap} CDF)`);
      fetchLoyalty();
    } catch (e: any) {
      toast.error(e.message || 'Erreur');
    } finally { setRedeeming(null); }
  };

  if (!passengerId) {
    return <div className="min-h-screen flex items-center justify-center p-6"><p className="text-gray-500">Connectez-vous pour voir vos points</p></div>;
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="w-6 h-6 border-2 border-gray-200 border-t-green-500 rounded-full animate-spin" /></div>;
  }

  const balance = data?.loyalty?.balance || 0;
  const lifetime = data?.loyalty?.lifetime || 0;
  const tiers = data?.tiers || [];
  const nextTier = tiers.filter((t: any) => t.points > balance).sort((a: any, b: any) => a.points - b.points)[0];
  const progress = nextTier ? Math.min(100, Math.round((balance / nextTier.points) * 100)) : 100;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-gradient-to-br from-green-600 to-emerald-600 text-white px-6 pt-8 pb-10">
        <button onClick={() => setCurrentScreen('profile')} className="mb-4 text-white/80 text-sm">← Retour</button>
        <p className="text-white/80 text-sm">Mes points Smart Rewards</p>
        <p className="text-4xl font-bold mt-1">{balance.toLocaleString()} <span className="text-lg font-normal">pts</span></p>
        <p className="text-white/70 text-xs mt-1">À vie : {lifetime.toLocaleString()} pts</p>
        {nextTier && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-white/80 mb-1">
              <span>Prochain palier : {nextTier.label}</span>
              <span>{balance}/{nextTier.points}</span>
            </div>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}
      </div>

      <div className="max-w-md mx-auto px-4 -mt-6 space-y-4">
        <div className="bg-white rounded-2xl shadow-sm border p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Paliers</h3>
          <div className="space-y-2">
            {tiers.map((t: any) => {
              const canRedeem = balance >= t.points;
              return (
                <div key={`${t.points}-${t.category || t.label}`} className={`flex items-center justify-between p-3 rounded-xl border ${canRedeem ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{t.label} — {t.points.toLocaleString()} pts</p>
                    <p className="text-xs text-gray-500">{t.type === 'discount' ? `Remise -${Math.round(t.discount*100)}% plafonnée ${t.cap} CDF` : `Gratuite plafonnée ${t.cap} CDF`}</p>
                  </div>
                  <button
                    disabled={!canRedeem || redeeming === t.points}
                    onClick={() => handleRedeem(t.points, t.category)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold ${canRedeem ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-200 text-gray-400'}`}
                  >
                    {redeeming === t.points ? '...' : canRedeem ? 'Utiliser' : `${t.points - balance} pts`}
                  </button>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-gray-400 mt-3">Points crédités à chaque course terminée. Expiration 12 mois d'inactivité. Plafond 3000 pts/jour.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border p-4">
          <h3 className="font-semibold text-gray-900 mb-2">Historique récent</h3>
          {(data?.loyalty?.history || []).length === 0 ? (
            <p className="text-sm text-gray-400">Aucun mouvement</p>
          ) : (
            <div className="space-y-2">
              {(data.loyalty.history as any[]).slice(0, 10).map((h: any, i: number) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-gray-600">{h.type === 'earn' ? `Course +${h.points}` : h.type === 'welcome' ? h.label : `Utilisé -${h.points}`}</span>
                  <span className={h.type === 'redeem' ? 'text-red-600' : 'text-green-600'}>{h.type === 'redeem' ? `-${h.points}` : `+${h.points}`}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
          <p className="text-xs text-blue-800">Gagnez +10% la nuit (21h-6h). Multiplicateurs : Standard ×1,1 / Confort ×1,3 / Plus ×1,5 / Business ×2,0.</p>
        </div>
      </div>
    </div>
  );
}
