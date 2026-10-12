import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { useAppState } from '../../hooks/useAppState';
import { useSupabaseData } from '../../hooks/useSupabaseData';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { toast } from '../../lib/toast';

const API = `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52`;
const METER_REASONS = ['panne', 'crevaison', 'urgence', 'convenance', 'transfert', 'cloture', 'autre'];

function fmtSec(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return h > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${m}min ${sec.toString().padStart(2, '0')}s`;
}

export function RideLiveControls({ liveRide, onChanged }: { liveRide: any; onChanged?: () => void }) {
  const { state } = useAppState();
  const { drivers } = useSupabaseData();
  const [busy, setBusy] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [showJournal, setShowJournal] = useState(false);
  const [journal, setJournal] = useState<any | null>(null);

  const adminId = (state as any).currentAdmin?.id;
  const adminName = (state as any).currentAdmin?.name || 'Admin';

  const meterAction = async (action: 'pause' | 'resume' | 'stop') => {
    const reason = window.prompt(
      `Motif ${action === 'pause' ? 'de suspension' : action === 'resume' ? 'de reprise' : "d'arrêt"} (panne, crevaison, urgence, convenance, transfert, cloture, autre) :`,
      action === 'stop' ? 'cloture' : 'panne'
    );
    if (!reason) return;
    setBusy(true);
    try {
      const resp = await fetch(`${API}/rides/${liveRide.id}/meter`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${publicAnonKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason, adminId, adminName }),
      });
      const j = await resp.json();
      if (!resp.ok || !j.success) throw new Error(j.error || 'Erreur');
      toast.success(action === 'pause' ? 'Chronomètre suspendu ⏸️' : action === 'resume' ? 'Chronomètre repris ▶️' : 'Chronomètre arrêté ⏹️');
      onChanged?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setBusy(false);
    }
  };

  const openJournal = async () => {
    setShowJournal(true);
    setJournal(null);
    try {
      const resp = await fetch(`${API}/rides/${liveRide.id}/journal`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` },
      });
      const j = await resp.json();
      if (j.success) setJournal(j.journal);
    } catch {}
  };

  return (
    <div className="mt-2 pt-2 border-t border-green-200">
      <p className="text-[11px] font-bold text-green-800 mb-1.5">⏱️ Télécommande SmartCabb</p>
      <div className="flex flex-wrap gap-1.5">
        <Button size="sm" variant="outline" disabled={busy} onClick={() => meterAction('pause')} className="text-xs">
          ⏸️ Suspendre
        </Button>
        <Button size="sm" variant="outline" disabled={busy} onClick={() => meterAction('resume')} className="text-xs">
          ▶️ Reprendre
        </Button>
        <Button size="sm" variant="outline" disabled={busy} onClick={() => meterAction('stop')} className="text-xs text-red-600 border-red-200">
          ⏹️ Arrêter
        </Button>
        <Button size="sm" variant="outline" disabled={busy} onClick={() => setShowTransfer(true)} className="text-xs text-purple-700 border-purple-300">
          🔄 Transférer
        </Button>
        <Button size="sm" variant="ghost" disabled={busy} onClick={openJournal} className="text-xs">
          📋 Journal
        </Button>
      </div>

      {showTransfer && (
        <TransferModal
          liveRide={liveRide}
          drivers={drivers || []}
          adminId={adminId}
          adminName={adminName}
          onClose={() => setShowTransfer(false)}
          onDone={() => { setShowTransfer(false); onChanged?.(); }}
        />
      )}

      {showJournal && (
        <Dialog open onOpenChange={() => setShowJournal(false)}>
          <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>📋 Journal de la course</DialogTitle>
              <DialogDescription>Transparence : incidents + compteur, dans l’ordre.</DialogDescription>
            </DialogHeader>
            {!journal ? (
              <p className="text-sm text-gray-500 py-6 text-center">Chargement…</p>
            ) : (
              <div className="space-y-3 py-2">
                <div>
                  <p className="text-xs font-bold text-gray-700 uppercase mb-1">Compteur ({journal.meter ? `état : ${journal.meter.state}` : 'non initialisé'})</p>
                  {(journal.meter?.segments || []).map((s: any, i: number) => (
                    <div key={i} className="text-xs bg-gray-50 border rounded-lg px-2 py-1.5 mb-1">
                      🚗 {s.driverName || s.driverId} · {fmtSec(s.billedSec || 0)}
                      {s.endedAt ? '' : ' (en cours)'}
                    </div>
                  ))}
                  {(journal.meter?.log || []).map((l: any, i: number) => (
                    <div key={`l${i}`} className="text-xs text-gray-600 px-1 py-0.5">
                      • {new Date(l.at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} — {l.action} par {l.actorName || l.actor}{l.reason ? ` (${l.reason})` : ''}
                    </div>
                  ))}
                  {(journal.meter?.log || []).length === 0 && (
                    <p className="text-xs text-gray-400">Aucune opération compteur.</p>
                  )}
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-700 uppercase mb-1">Incidents ({(journal.incidents || []).length})</p>
                  {(journal.incidents || []).map((inc: any) => (
                    <div key={inc.id} className="text-xs bg-red-50 border border-red-200 rounded-lg px-2 py-1.5 mb-1">
                      ⚠️ {inc.kindLabel || inc.kind} — {inc.reporterType === 'driver' ? 'chauffeur' : 'passager'}
                      {inc.comment ? ` : ${inc.comment}` : ''}
                      <span className="text-gray-400"> · {new Date(inc.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  ))}
                  {(journal.incidents || []).length === 0 && (
                    <p className="text-xs text-gray-400">Aucun incident déclaré.</p>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function TransferModal({ liveRide, drivers, adminId, adminName, onClose, onDone }: {
  liveRide: any; drivers: any[]; adminId?: string; adminName?: string;
  onClose: () => void; onDone: () => void;
}) {
  const [reason, setReason] = useState('panne');
  const [sendingId, setSendingId] = useState<string | null>(null);

  const norm = (c?: string) => (c || '').toLowerCase().replace(/^smart_/, '');
  const rideCat = norm(liveRide.vehicleCategory || liveRide.vehicle_category);
  const currentId = liveRide.driver_id || liveRide.driverId;
  const candidates = (drivers || [])
    .filter((d: any) => d.isApproved && d.id !== currentId)
    .filter((d: any) => !!d.is_available)
    .filter((d: any) => {
      const dc = norm(d.vehicle_category || d.vehicle?.category);
      if (rideCat === 'standard') return dc === 'standard' || dc === 'standard_clim';
      return dc === rideCat;
    })
    .slice(0, 20);

  const propose = async (d: any) => {
    if (!confirm(`Proposer le transfert à ${d.full_name} ? Le compteur est gelé en attendant.`)) return;
    setSendingId(d.id);
    try {
      const resp = await fetch(`${API}/rides/${liveRide.id}/transfer/propose`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${publicAnonKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ toDriverId: d.id, reason, adminId, adminName }),
      });
      const j = await resp.json();
      if (!resp.ok || !j.success) throw new Error(j.error || 'Erreur');
      toast.success(`Transfert proposé à ${d.full_name} ✓`);
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setSendingId(null);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>🔄 Transférer la course</DialogTitle>
          <DialogDescription>
            Même catégorie ({rideCat || '—'}) · compteur gelé · le nouveau chauffeur doit accepter.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-1.5 py-2">
          {METER_REASONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setReason(r)}
              className={`text-xs px-2.5 py-1 rounded-full border ${reason === r ? 'bg-purple-600 text-white border-purple-600' : 'border-gray-300 text-gray-600'}`}
            >
              {r}
            </button>
          ))}
        </div>
        <div className="space-y-2">
          {candidates.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">Aucun conducteur éligible en ligne</p>
          )}
          {candidates.map((d: any) => (
            <div key={d.id} className="border rounded-xl p-2.5 flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">{d.full_name}</p>
                <p className="text-xs text-gray-500">{d.phone || ''}</p>
              </div>
              <Button size="sm" disabled={sendingId === d.id} onClick={() => propose(d)} className="bg-purple-600 hover:bg-purple-700">
                {sendingId === d.id ? '…' : 'Proposer'}
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
