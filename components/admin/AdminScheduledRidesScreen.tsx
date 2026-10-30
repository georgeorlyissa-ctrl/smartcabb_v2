import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Calendar, Clock, XCircle, ChevronLeft } from '../../lib/icons';
import { useAppState } from '../../hooks/useAppState';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { toast } from '../../lib/toast';
import { AssignDriverModal } from './AssignDriverModal';

const API = `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52`;

interface ScheduledRide {
  id: string;
  user_id: string;
  pickup_address: string;
  dropoff_address: string;
  scheduled_date: string;
  scheduled_time: string;
  category: string;
  estimated_price: number;
  status: string;
  created_at: string;
  driver_id?: string | null;
  driver_name?: string | null;
  driver_status?: string | null;
  assigned_at?: string | null;
  presence_confirmed?: boolean;
  presence_confirmed_at?: string | null;
  reminder_sent_at?: string | null;
  deposit_received?: boolean;
  deposit_method?: string | null;
  deposit_received_at?: string | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  smart_standard: 'Standard',
  smart_confort: 'Confort',
  smart_plus: 'Plus (Familiale)',
  smart_business: 'Business'
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  scheduled: { label: 'Réservée', color: 'bg-blue-100 text-blue-800' },
  cancelled: { label: 'Annulée', color: 'bg-red-100 text-red-800' },
  completed: { label: 'Traitée', color: 'bg-green-100 text-green-800' }
};

export function AdminScheduledRidesScreen({ onBack }: { onBack?: () => void }) {
  const { setCurrentScreen } = useAppState();
  const [rides, setRides] = useState<ScheduledRide[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'scheduled' | 'cancelled' | 'completed'>('scheduled');
  const [assignRide, setAssignRide] = useState<ScheduledRide | null>(null);

  useEffect(() => {
    loadRides();
  }, []);

  // Chargement via backend service-role : marche même sans session Supabase
  // (le timeout admin déconnecte le Auth, ce qui vidait la liste en direct PostgREST)
  const loadRides = async () => {
    setLoading(true);
    try {
      const resp = await fetch(`${API}/reservations/admin/all?status=all&limit=500`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` },
      });
      const j = await resp.json();
      if (!resp.ok || !j.success) throw new Error(j.error || 'Erreur chargement');
      setRides(j.rides || []);
    } catch (err) {
      console.error('Erreur chargement reservations:', err);
      toast.error('Erreur chargement — vérifiez votre connexion');
    } finally {
      setLoading(false);
    }
  };

  const setRideStatus = async (id: string, status: 'cancelled' | 'completed', okMsg: string) => {
    try {
      const resp = await fetch(`${API}/reservations/${id}/admin-status`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${publicAnonKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const j = await resp.json();
      if (!resp.ok || !j.success) throw new Error(j.error || 'Erreur');
      toast.success(okMsg);
      loadRides();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    }
  };

  // 💰 Confirmer la réception de l'acompte → notifie le passager « prise en compte »
  const handleConfirmDeposit = async (ride: ScheduledRide) => {
    const amount = Math.round((ride.estimated_price || 0) * 0.5);
    if (!confirm(`Confirmer la réception de l'acompte de ${amount.toLocaleString()} CDF pour cette réservation ?\nLe passager sera notifié que sa réservation est prise en compte.`)) return;
    try {
      const resp = await fetch(`${API}/reservations/${ride.id}/confirm-deposit`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${publicAnonKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: ride.deposit_method || 'cash' }),
      });
      const j = await resp.json();
      if (!resp.ok || !j.success) throw new Error(j.error || 'Erreur');
      toast.success(`Acompte confirmé ✓ — passager notifié${j.pushSent ? ' (push)' : ' (cloche)'}`);
      loadRides();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    }
  };

  const handleForceProcess = async (ride: ScheduledRide, mode: 'preassigned' | 'automatch') => {    const label = mode === 'preassigned'
      ? `Créer la course maintenant pour ${ride.driver_name || 'le conducteur'} ?`
      : 'Lancer le matching auto (même catégorie) pour cette réservation ?';
    if (!confirm(label)) return;
    try {
      const resp = await fetch(`${API}/rides/admin-process-one`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${publicAnonKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduledRideId: ride.id, mode }),
      });
      const j = await resp.json();
      if (!resp.ok || !j.success) throw new Error(j.error || 'Erreur');
      toast.success(mode === 'preassigned' ? 'Course créée et attribuée ✓' : `Matching lancé (${j.matching === 'success' ? 'chauffeur trouvé' : 'aucun chauffeur pour l’instant'})`);
      loadRides();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    }
  };
  const handleCancel = async (id: string) => {
    if (!confirm('Annuler cette reservation ?')) return;
    await setRideStatus(id, 'cancelled', 'Reservation annulee');
  };

  const handleManualProcess = async (ride: ScheduledRide) => {
    // 🚦 Le bouton « Traiter » n'est actif qu'après acceptation du conducteur.
    // Double sécurité ici au cas où l'état aurait changé entre-temps.
    if (ride.driver_status !== 'accepted') {
      toast.error(
        ride.driver_id
          ? "En attente : le conducteur doit accepter la réservation avant de pouvoir la traiter"
          : "Aucun conducteur assigné : attribuez la réservation et attendez son acceptation"
      );
      return;
    }
    if (!confirm('Clôturer cette réservation et la classer dans les traitées ?')) return;
    await setRideStatus(ride.id, 'completed', 'Reservation marquee comme traitee');
  };

  const filters = [
    { value: 'scheduled' as const, label: 'Réservées', count: rides.filter(r => r.status === 'scheduled').length },
    { value: 'completed' as const, label: 'Traitées', count: rides.filter(r => r.status === 'completed').length },
    { value: 'cancelled' as const, label: 'Annulées', count: rides.filter(r => r.status === 'cancelled').length },
    { value: 'all' as const, label: 'Toutes', count: rides.length }
  ];

  // Filtre côté client (la liste complète est chargée une fois)
  const visibleRides = filter === 'all' ? rides : rides.filter((r) => r.status === filter);

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={() => onBack?.()}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-bold">Réservations</h1>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {filters.map(f => (
          <Button
            key={f.value}
            size="sm"
            variant={filter === f.value ? 'default' : 'outline'}
            onClick={() => setFilter(f.value)}
          >
            {f.label} ({f.count})
          </Button>
        ))}
      </div>

      {loading ? (
        <p className="text-gray-500">Chargement...</p>
      ) : visibleRides.length === 0 ? (
        <Card className="p-8 text-center text-gray-500">
          <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-300" />
          <p>Aucune reservation</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {visibleRides.map(ride => {
            const catLabel = CATEGORY_LABELS[ride.category] || ride.category;
            const statusInfo = STATUS_LABELS[ride.status] || { label: ride.status, color: 'bg-gray-100 text-gray-800' };
            const scheduledAt = new Date(`${ride.scheduled_date}T${ride.scheduled_time}`);
            const isPast = scheduledAt < new Date();

  const isActive = ride.status === 'scheduled' || ride.status === 'confirmed';
  const minsToStart = Math.round((scheduledAt.getTime() - Date.now()) / 60000);
  const noPresenceSoon = ride.driver_status === 'accepted' && !(ride as any).presence_confirmed &&
    (ride.status === 'scheduled' || ride.status === 'confirmed') && minsToStart <= 30;

  // 🚦 « Traiter » n'est cliquable qu'une fois la réservation acceptée par le conducteur
  const driverAccepted = ride.driver_status === 'accepted';

  return (
    <Card key={ride.id} className="p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
            <Badge variant="outline">{catLabel}</Badge>
            {ride.status === 'confirmed' && (
              <Badge className="bg-green-100 text-green-800">Acompte reçu</Badge>
            )}
            {isPast && isActive && (
              <Badge className="bg-orange-100 text-orange-800">En retard</Badge>
            )}
            {(ride as any).reminder_sent_at && isActive && (
              <Badge className="bg-blue-100 text-blue-800">🔔 Rappel envoyé</Badge>
            )}
            {(ride as any).presence_confirmed && isActive && (
              <Badge className="bg-green-100 text-green-800">✓ Présence confirmée</Badge>
            )}
            {noPresenceSoon && (
              <Badge className="bg-red-100 text-red-800">⚠️ Sans confirmation</Badge>
            )}
          </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                      <Calendar className="w-4 h-4" />
                      {scheduledAt.toLocaleDateString('fr-FR')}
                      <Clock className="w-4 h-4 ml-2" />
                      {ride.scheduled_time}
                    </div>
                    <p className="text-sm font-medium">{ride.pickup_address}</p>
                    <p className="text-xs text-gray-400">vers {ride.dropoff_address}</p>
                    <p className="text-xs text-gray-400 mt-1">Client: {ride.user_id}</p>
                    {ride.driver_id && (
                      <p className="text-xs mt-1">
                        {ride.driver_status === 'accepted' && (
                          <span className="font-semibold text-green-700">✓ Acceptée par {ride.driver_name || 'conducteur'}</span>
                        )}
                        {ride.driver_status === 'proposed' && (
                          <span className="font-semibold text-orange-600">⏳ Proposée à {ride.driver_name || 'conducteur'} (en attente)</span>
                        )}
                        {ride.driver_status === 'declined' && (
                          <span className="font-semibold text-red-600">✕ Refusée par {ride.driver_name || 'conducteur'} — à ré-attribuer</span>
                        )}
                      </p>
                    )}
                    <p className="text-sm font-semibold mt-1">{ride.estimated_price.toLocaleString()} CDF</p>
                    {(ride.estimated_price || 0) > 0 && (
                      <p className="text-xs mt-1">
                        {ride.deposit_received ? (
                          <span className="font-semibold text-green-700">
                            💰 Acompte reçu ({Math.round(ride.estimated_price / 2).toLocaleString()} CDF{ride.deposit_method ? ` · ${ride.deposit_method}` : ''})
                          </span>
                        ) : (
                          <span className="font-semibold text-orange-600">
                            ⏳ Acompte en attente ({Math.round(ride.estimated_price / 2).toLocaleString()} CDF)
                          </span>
                        )}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      Cree le {new Date(ride.created_at).toLocaleString('fr-FR')}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 ml-4">
                    {isActive && (
                      <>
                        {(ride.estimated_price || 0) > 0 && !ride.deposit_received && (
                          <Button size="sm" onClick={() => handleConfirmDeposit(ride)} className="bg-amber-500 hover:bg-amber-600 text-white">
                            💰 Confirmer l'acompte
                          </Button>
                        )}
                        <Button size="sm" onClick={() => setAssignRide(ride)} className="bg-blue-600 hover:bg-blue-700">
                          🚖 {ride.driver_id ? 'Ré-attribuer' : 'Attribuer'}
                        </Button>
                        {ride.driver_status === 'accepted' && (
                          <Button size="sm" onClick={() => handleForceProcess(ride, 'preassigned')} className="bg-purple-600 hover:bg-purple-700">
                            ▶ Créer maintenant
                          </Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => handleForceProcess(ride, 'automatch')} className="text-purple-700 border-purple-300">
                          🔍 Matching auto
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleCancel(ride.id)} className="text-red-600 border-red-200">
                          <XCircle className="w-4 h-4 mr-1" />
                          Annuler
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleManualProcess(ride)}
                          className="bg-green-600"
                          disabled={!driverAccepted}
                          title={driverAccepted
                            ? 'Clôturer la réservation et la classer dans les traitées'
                            : "Disponible uniquement quand le conducteur a accepté la réservation"}
                        >
                          Traiter
                        </Button>
                        {!driverAccepted && (
                          <span className="text-[10px] text-gray-500 text-center leading-tight max-w-[120px]">
                            {ride.driver_id
                              ? '⏳ En attente d’acceptation du conducteur'
                              : '⏳ Aucun conducteur assigné'}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {assignRide && (
        <AssignDriverModal
          ride={assignRide}
          onClose={() => setAssignRide(null)}
          onAssigned={() => { setAssignRide(null); loadRides(); }}
        />
      )}
    </div>
  );
}
