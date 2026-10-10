import { useState, useEffect, useCallback } from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { useAppState } from '../../hooks/useAppState';
import { supabase } from '../../lib/supabase';
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
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!driverId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('scheduled_rides')
        .select('*')
        .eq('driver_id', driverId)
        .in('status', ['scheduled', 'confirmed'])
        .in('driver_status', ['proposed', 'accepted'])
        .order('scheduled_date', { ascending: true })
        .order('scheduled_time', { ascending: true });
      if (error) throw error;
      setRides(data || []);
    } catch (e) {
      console.error('Réservations conducteur:', e);
    } finally {
      setLoading(false);
    }
  }, [driverId]);

  useEffect(() => { load(); }, [load]);

  const setStatus = async (ride: AssignedRide, next: 'accepted' | 'declined') => {
    const msg = next === 'accepted'
      ? `Accepter cette course le ${ride.scheduled_date} à ${ride.scheduled_time} ?`
      : 'Refuser cette course ? L’admin devra la ré-attribuer.';
    if (!confirm(msg)) return;
    setActingId(ride.id);
    try {
      const { error } = await supabase
        .from('scheduled_rides')
        .update({ driver_status: next })
        .eq('id', ride.id);
      if (error) throw error;
      toast.success(next === 'accepted' ? 'Course acceptée ✓' : 'Course refusée — l’admin sera prévenu');
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

      {loading ? (
        <p className="text-sm text-gray-500 text-center py-10">Chargement…</p>
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
