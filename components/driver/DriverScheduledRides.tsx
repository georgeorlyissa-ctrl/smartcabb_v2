import { useState, useEffect, useCallback } from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { useAppState } from '../../hooks/useAppState';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { addLocalNotification } from '../AppNotificationsScreen';
import { toast } from '../../lib/toast';

interface AssignedRide {
  id: string;
  pickup_address: string;
  dropoff_address: string;
  scheduled_date: string;
  scheduled_time: string;
  category: string;
  estimated_price: number;
  status: string;
  driver_status: string;
  assigned_at?: string | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  smart_standard: 'Standard',
  smart_confort: 'Confort',
  smart_plus: 'Plus (Familiale)',
  smart_business: 'Business'
};

export function DriverScheduledRides({ onBack }: { onBack?: () => void }) {
  const { state, setCurrentScreen } = useAppState();
  const driverId = state.currentDriver?.id || (state.currentUser as any)?.id;
  const [rides, setRides] = useState<AssignedRide[]>([]);
  const [historyRides, setHistoryRides] = useState<AssignedRide[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');

  const load = useCallback(async () => {
    if (!driverId) return;
    setLoading(true);
    try {
      // Via backend service-role : le login conducteur n'a pas de session Supabase Auth (RLS bloquerait)
      const resp = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/reservations/driver/${driverId}`,
        { headers: { 'Authorization': `Bearer ${publicAnonKey}` } }
      );
      const j = await resp.json();
      if (!resp.ok || !j.success) throw new Error(j.error || 'Erreur chargement');
      setRides(j.rides || []);
      // Historique : tout ce qui ne demande plus d'action
      try {
        const hr = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/reservations/driver/${driverId}?history=1`,
          { headers: { 'Authorization': `Bearer ${publicAnonKey}` } }
        );
        const hj = await hr.json();
        if (hr.ok && hj.success) {
          setHistoryRides(
            (hj.rides || []).filter(
              (r: AssignedRide) =>
                r.driver_status === 'declined' || r.status === 'completed' || r.status === 'cancelled'
            )
          );
        }
      } catch {}
      // Cloche informative : chaque proposition y laisse une trace (sans doublon)
      (j.rides || [])
        .filter((r: AssignedRide) => r.driver_status === 'proposed')
        .forEach((r: AssignedRide) => {
          try {
            addLocalNotification(
              'drivers',
              '📅 Réservation proposée',
              `Course le ${r.scheduled_date} à ${(r.scheduled_time || '').slice(0, 5)} : ${r.pickup_address} → ${r.dropoff_address}.`,
              `res_proposed_${r.id}`
            );
          } catch {}
        });
    } catch (e) {
      console.error('Réservations conducteur:', e);
    } finally {
      setLoading(false);
    }
  }, [driverId]);

  useEffect(() => { load(); }, [load]);

  const confirmPresence = async (ride: AssignedRide) => {
    setActingId(ride.id);
    try {
      const resp = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/reservations/${ride.id}/presence`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${publicAnonKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ driverId }),
        }
      );
      const j = await resp.json();
      if (!resp.ok || !j.success) throw new Error(j.error || 'Erreur');
      toast.success('Présence confirmée ✓ — à l’heure pour la prise en charge');
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setActingId(null);
    }
  };
  const setStatus = async (ride: AssignedRide, next: 'accepted' | 'declined') => {
    const msg = next === 'accepted'
      ? `Accepter cette course le ${ride.scheduled_date} à ${ride.scheduled_time} ?`
      : 'Refuser cette course ? L’admin devra la ré-attribuer.';
    if (!confirm(msg)) return;
    setActingId(ride.id);
    try {
      // Via backend (vérifie que la course lui est bien attribuée)
      const resp = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/reservations/${ride.id}/driver-status`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${publicAnonKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ driverId, status: next }),
        }
      );
      const j = await resp.json();
      if (!resp.ok || !j.success) throw new Error(j.error || 'Erreur');
      if (next === 'accepted') {
        toast.success('Course acceptée ✓ — passager notifié...');
        // Notifie le passager (push + WhatsApp/SMS) avec tes coordonnées sécurité
        try {
          const resp = await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/reservations/${ride.id}/notify-accept`,
            {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${publicAnonKey}`, 'Content-Type': 'application/json' },
            }
          );
          const j = await resp.json();
          const ch = j.channels || {};
          const sent: string[] = [];
          if (ch.push?.sent) sent.push('push app');
          if (ch.whatsapp?.sent) sent.push('WhatsApp');
          if (ch.sms?.sent) sent.push('SMS');
          if (sent.length > 0) toast.success(`Passager notifié (${sent.join(' + ')})`);
          else toast.info('Passager : notification app à son ouverture (push/WhatsApp indisponibles pour l’instant)');
        } catch (e) {
          console.warn('Notify passager:', e);
        }
      } else {
        toast.success('Course refusée — l’admin sera prévenu');
      }
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setActingId(null);
    }
  };

  const proposed = rides.filter((r) => r.driver_status === 'proposed');
  const accepted = rides.filter((r) => r.driver_status === 'accepted');

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="sm" onClick={() => (onBack ? onBack() : setCurrentScreen('driver-dashboard'))}>
          ←
        </Button>
        <div>
          <h1 className="text-lg font-bold">Mes réservations</h1>
          <p className="text-xs text-gray-500">
            {proposed.length} en attente · {accepted.length} acceptée{accepted.length > 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Onglets À venir / Passées */}
      <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg mb-4">
        {([
          { value: 'upcoming' as const, label: `À venir (${rides.length})` },
          { value: 'past' as const, label: `Passées (${historyRides.length})` },
        ]).map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`flex-1 py-2 px-2 rounded-md text-sm font-medium transition-colors ${
              tab === t.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-gray-500 text-center py-10">Chargement…</p>
      ) : tab === 'past' ? (
        historyRides.length === 0 ? (
          <Card className="p-10 text-center">
            <div className="text-4xl mb-3">📋</div>
            <p className="font-medium text-gray-700">Aucune réservation passée</p>
            <p className="text-xs text-gray-400 mt-1">Refusées, annulées et terminées apparaîtront ici</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {historyRides.map((ride) => (
              <Card key={ride.id} className="p-4 bg-gray-50">
                <RideBody ride={ride} />
                <div className="mt-2">
                  {ride.driver_status === 'declined' && (
                    <Badge className="bg-red-100 text-red-700 text-xs">✕ Refusée</Badge>
                  )}
                  {ride.status === 'completed' && (
                    <Badge className="bg-gray-200 text-gray-700 text-xs">Terminée</Badge>
                  )}
                  {ride.status === 'cancelled' && (
                    <Badge className="bg-red-100 text-red-600 text-xs">Annulée</Badge>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )
      ) : rides.length === 0 ? (
        <Card className="p-10 text-center">
          <div className="text-4xl mb-3">📅</div>
          <p className="font-medium text-gray-700">Aucune réservation attribuée</p>
          <p className="text-xs text-gray-400 mt-1">L’admin vous proposera ici vos courses à l’avance</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {proposed.length > 0 && (
            <>
              <p className="text-xs font-bold text-orange-700 uppercase">⏳ À confirmer</p>
              {proposed.map((ride) => (
                <Card key={ride.id} className="p-4 border-orange-300">
                  <RideBody ride={ride} />
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      disabled={actingId === ride.id}
                      onClick={() => setStatus(ride, 'accepted')}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      ✓ Accepter
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={actingId === ride.id}
                      onClick={() => setStatus(ride, 'declined')}
                      className="flex-1 text-red-600 border-red-200"
                    >
                      ✕ Refuser
                    </Button>
                  </div>
                </Card>
              ))}
            </>
          )}
          {accepted.length > 0 && (
            <>
              <p className="text-xs font-bold text-green-700 uppercase mt-2">✓ Acceptées (suivi)</p>
              {accepted.map((ride) => (
                <Card key={ride.id} className="p-4 border-green-300">
                  <RideBody ride={ride} />
                  <Badge className="bg-green-100 text-green-800 text-xs mt-2">Acceptée — à effectuer</Badge>
                  {(ride as any).presence_confirmed ? (
                    <Badge className="bg-blue-100 text-blue-800 text-xs mt-2 ml-2">✓ Présence confirmée</Badge>
                  ) : (
                    <Button
                      size="sm"
                      disabled={actingId === ride.id}
                      onClick={() => confirmPresence(ride)}
                      className="w-full mt-2 bg-blue-600 hover:bg-blue-700"
                    >
                      📍 Je suis prêt — confirmer ma présence
                    </Button>
                  )}
                </Card>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function RideBody({ ride }: { ride: AssignedRide }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-sm font-bold">
          {new Date(`${ride.scheduled_date}T${ride.scheduled_time}`).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })} à {ride.scheduled_time}
        </span>
        <Badge variant="outline" className="text-[10px]">{CATEGORY_LABELS[ride.category] || ride.category}</Badge>
      </div>
      <p className="text-sm">📍 {ride.pickup_address}</p>
      <p className="text-sm text-gray-500">→ {ride.dropoff_address}</p>
      <p className="text-sm font-bold mt-1">
        {ride.estimated_price > 0 ? `≈ ${ride.estimated_price.toLocaleString()} CDF` : 'Sur devis'}
      </p>
    </div>
  );
}
