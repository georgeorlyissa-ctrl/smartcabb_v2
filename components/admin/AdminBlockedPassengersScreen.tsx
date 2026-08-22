/**
 * 🚫 PASSAGERS BLOQUÉS — ADMIN SMARTCABB
 * Liste des comptes passagers bloqués après 3 annulations successives (24h auto)
 */

import { useState, useEffect, useCallback } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { ArrowLeft, Ban, Clock, RefreshCw, ShieldCheck } from '../../lib/admin-icons';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { toast } from '../../lib/toast';

const API = `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52`;

interface BlockedPassenger {
  passengerId: string;
  name: string;
  phone: string;
  blockedAt: string;
  blockedUntil: string;
  reason: string;
  cancelCount: number;
  remainingHours: number;
}

export function AdminBlockedPassengersScreen({ onBack }: { onBack: () => void }) {
  const [blocked, setBlocked] = useState<BlockedPassenger[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBlocked = useCallback(async () => {
    try {
      const resp = await fetch(`${API}/admin/blocked-passengers`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` },
      });
      if (!resp.ok) throw new Error(`Erreur ${resp.status}`);
      const data = await resp.json();
      if (!data.success) throw new Error(data.error || 'Erreur serveur');
      setBlocked(data.blocked || []);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Erreur réseau');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBlocked();
    const iv = setInterval(fetchBlocked, 30000);
    return () => clearInterval(iv);
  }, [fetchBlocked]);

  const handleUnblock = async (passengerId: string) => {
    try {
      const resp = await fetch(`${API}/admin/blocked-passengers/${passengerId}/unblock`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${publicAnonKey}`, 'Content-Type': 'application/json' },
      });
      const data = await resp.json();
      if (!resp.ok || !data.success) throw new Error(data.error || 'Échec du déblocage');
      toast.success('Passager débloqué');
      fetchBlocked();
    } catch (err: any) {
      toast.error(err.message || 'Erreur');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack} className="flex-shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Ban className="w-5 h-5 text-red-600" />
              Passagers bloqués
            </h1>
            <p className="text-xs text-gray-500">3 annulations successives → blocage 24h (auto ou manuel)</p>
          </div>
          <button
            onClick={() => { setLoading(true); fetchBlocked(); }}
            className="ml-auto flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Actualiser
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-6">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 mb-4">
            <span>⚠️ {error}</span>
            <button onClick={() => { setLoading(true); fetchBlocked(); }} className="ml-auto underline">Réessayer</button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-14">
            <div className="w-5 h-5 border-2 border-gray-200 border-t-red-500 rounded-full animate-spin mr-2" />
            <span className="text-sm text-gray-400">Chargement…</span>
          </div>
        ) : blocked.length === 0 ? (
          <Card className="p-10 text-center">
            <ShieldCheck className="w-10 h-10 text-green-400 mx-auto mb-3" />
            <p className="font-medium text-gray-700">Aucun passager bloqué</p>
            <p className="text-xs text-gray-400 mt-1">Les comptes bloqués après 3 annulations successives apparaîtront ici</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {blocked.map(b => (
              <Card key={b.passengerId} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 truncate">{b.name}</p>
                    <p className="text-xs text-gray-500">{b.phone} · ID {b.passengerId.slice(0, 8)}</p>
                    <p className="text-xs text-gray-600 mt-2">{b.reason}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Bloqué le {new Date(b.blockedAt).toLocaleString('fr-FR')}</span>
                      <span className="text-orange-600 font-medium">Reste {b.remainingHours}h</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Jusqu'au {new Date(b.blockedUntil).toLocaleString('fr-FR')}</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleUnblock(b.passengerId)}
                    className="bg-green-600 hover:bg-green-700 text-white flex-shrink-0"
                  >
                    <ShieldCheck className="w-4 h-4 mr-1" />
                    Débloquer
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
