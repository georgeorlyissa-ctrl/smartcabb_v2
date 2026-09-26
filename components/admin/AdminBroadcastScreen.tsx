/**
 * 📢 DIFFUSION ADMIN — SMARTCABB
 * Envoie un message (bonus, news, info) vers les apps driver / passager :
 * push FCM + boîte de réception persistée 30 jours.
 */

import { useState, useEffect, useCallback } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { ArrowLeft, Megaphone, RefreshCw } from '../../lib/admin-icons';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { toast } from '../../lib/toast';

const API = `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52`;

interface Broadcast {
  id: string;
  title: string;
  message: string;
  target: string;
  createdAt: string;
  tokens: number;
  sent: number;
  failed: number;
}

const TARGETS = [
  { value: 'all', label: 'Conducteurs + Passagers' },
  { value: 'drivers', label: 'Conducteurs uniquement' },
  { value: 'passengers', label: 'Passagers uniquement' },
];

export function AdminBroadcastScreen({ onBack }: { onBack: () => void }) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [target, setTarget] = useState('all');
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    try {
      const resp = await fetch(`${API}/fcm/broadcasts`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` },
      });
      const data = await resp.json();
      if (data.success) setHistory(data.broadcasts || []);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error('Titre et message requis');
      return;
    }
    setSending(true);
    try {
      const resp = await fetch(`${API}/fcm/broadcast`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${publicAnonKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), message: message.trim(), target }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.success) throw new Error(data.error || 'Échec de l\'envoi');
      toast.success(`Envoyé à ${data.sent} appareil(s) (${data.tokens} tokens)`);
      setTitle('');
      setMessage('');
      fetchHistory();
    } catch (err: any) {
      toast.error(err.message || 'Erreur');
    } finally {
      setSending(false);
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
              <Megaphone className="w-5 h-5 text-violet-600" />
              Diffuser un message
            </h1>
            <p className="text-xs text-gray-500">Bonus, news, infos → apps conducteur et passager</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-6 space-y-6">
        <Card className="p-5">
          <label className="block text-xs font-medium text-gray-600 mb-1">Titre</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex : Bonus week-end 🎁"
            maxLength={80}
            className="mb-3"
          />
          <label className="block text-xs font-medium text-gray-600 mb-1">Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ex : +500 CDF de bonus pour 5 courses terminées ce week-end !"
            rows={3}
            maxLength={500}
            className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-violet-400 resize-none mb-3"
          />
          <label className="block text-xs font-medium text-gray-600 mb-1">Destinataires</label>
          <div className="flex flex-wrap gap-2 mb-4">
            {TARGETS.map((t) => (
              <button
                key={t.value}
                onClick={() => setTarget(t.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  target === t.value
                    ? 'bg-violet-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <Button
            onClick={handleSend}
            disabled={sending}
            className="w-full bg-violet-600 hover:bg-violet-700 text-white"
          >
            {sending ? 'Envoi…' : 'Envoyer maintenant'}
          </Button>
        </Card>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900">Historique</h2>
            <button onClick={() => { setLoading(true); fetchHistory(); }} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700">
              <RefreshCw className="w-3.5 h-3.5" /> Actualiser
            </button>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-5 h-5 border-2 border-gray-200 border-t-violet-500 rounded-full animate-spin mr-2" />
              <span className="text-sm text-gray-400">Chargement…</span>
            </div>
          ) : history.length === 0 ? (
            <Card className="p-8 text-center text-sm text-gray-400">Aucun message envoyé pour l'instant</Card>
          ) : (
            <div className="space-y-2">
              {history.map((b) => (
                <Card key={b.id} className="p-4">
                  <p className="font-semibold text-gray-900 text-sm">{b.title}</p>
                  <p className="text-xs text-gray-600 mt-1">{b.message}</p>
                  <p className="text-xs text-gray-400 mt-2">
                    {b.target === 'all' ? 'Tous' : b.target === 'drivers' ? 'Conducteurs' : 'Passagers'}
                    {' · '}{new Date(b.createdAt).toLocaleString('fr-FR')}
                    {' · '}{b.sent}/{b.tokens} reçus
                  </p>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
