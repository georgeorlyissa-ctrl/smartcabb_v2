import { useState } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { toast } from '../lib/toast';

export type IncidentKind = 'panne' | 'crevaison' | 'urgence' | 'autre';

const KINDS: { value: IncidentKind; icon: string; label: string }[] = [
  { value: 'panne', icon: '🔧', label: 'Panne véhicule' },
  { value: 'crevaison', icon: '🛞', label: 'Crevaison' },
  { value: 'urgence', icon: '🚨', label: 'Urgence / sécurité' },
  { value: 'autre', icon: '📝', label: 'Autre incident' },
];

interface IncidentModalProps {
  rideId: string;
  reporterType: 'driver' | 'passenger';
  reporterId?: string;
  onClose: () => void;
  onSent?: () => void;
}

export function IncidentModal({ rideId, reporterType, reporterId, onClose, onSent }: IncidentModalProps) {
  const [kind, setKind] = useState<IncidentKind>('panne');
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    setSending(true);
    try {
      let lat: number | null = null;
      let lng: number | null = null;
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          if (!('geolocation' in navigator)) return reject(new Error('no gps'));
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 });
        });
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch {}

      const resp = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/rides/${rideId}/incident`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${publicAnonKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ reporterType, reporterId, kind, comment, lat, lng }),
        }
      );
      const j = await resp.json();
      if (!resp.ok || !j.success) throw new Error(j.error || 'Envoi impossible');
      toast.success('Incident signalé — SmartCabb est prévenu et vous recontactera');
      onSent?.();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Envoi impossible');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>⚠️ Signaler un incident</DialogTitle>
          <DialogDescription>
            SmartCabb est alerté immédiatement avec votre position.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2 py-2">
          {KINDS.map((k) => (
            <button
              key={k.value}
              type="button"
              onClick={() => setKind(k.value)}
              className={`rounded-xl border-2 p-3 text-left transition-all ${
                kind === k.value ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-xl">{k.icon}</div>
              <div className="text-xs font-bold mt-1">{k.label}</div>
            </button>
          ))}
        </div>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Détail (optionnel)…"
          rows={2}
          maxLength={500}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
        />
        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={onClose} className="flex-1" disabled={sending}>
            Annuler
          </Button>
          <Button onClick={handleSend} disabled={sending} className="flex-1 bg-red-600 hover:bg-red-700">
            {sending ? 'Envoi…' : 'Envoyer'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
