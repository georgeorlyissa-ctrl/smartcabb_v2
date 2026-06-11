import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Calendar, Clock, XCircle, ChevronLeft } from '../../lib/icons';
import { useAppState } from '../../hooks/useAppState';
import { supabase } from '../../lib/supabase';
import { toast } from '../../lib/toast';

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
}

const CATEGORY_LABELS: Record<string, string> = {
  smart_standard: 'Standard',
  smart_confort: 'Confort',
  smart_plus: 'Plus (Familiale)',
  smart_business: 'Business'
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  scheduled: { label: 'Planifiée', color: 'bg-blue-100 text-blue-800' },
  cancelled: { label: 'Annulée', color: 'bg-red-100 text-red-800' },
  completed: { label: 'Traitée', color: 'bg-green-100 text-green-800' }
};

export function AdminScheduledRidesScreen({ onBack }: { onBack?: () => void }) {
  const { setCurrentScreen } = useAppState();
  const [rides, setRides] = useState<ScheduledRide[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'scheduled' | 'cancelled' | 'completed'>('scheduled');

  useEffect(() => {
    loadRides();
  }, [filter]);

  const loadRides = async () => {
    setLoading(true);
    try {
      let query = supabase.from('scheduled_rides').select('*').order('created_at', { ascending: false });
      if (filter !== 'all') query = query.eq('status', filter);
      const { data, error } = await query;
      if (error) throw error;
      setRides(data || []);
    } catch (err) {
      console.error('Erreur chargement reservations:', err);
      toast.error('Erreur chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Annuler cette reservation ?')) return;
    try {
      const { error } = await supabase.from('scheduled_rides').update({ status: 'cancelled' }).eq('id', id);
      if (error) throw error;
      toast.success('Reservation annulee');
      loadRides();
    } catch (err) {
      toast.error('Erreur annulation');
    }
  };

  const handleManualProcess = async (ride: ScheduledRide) => {
    if (!confirm('Declencher le traitement maintenant pour cette reservation ?')) return;
    try {
      const { error } = await supabase.from('scheduled_rides').update({ status: 'completed' }).eq('id', ride.id);
      if (error) throw error;
      toast.success('Reservation marquee comme traitee');
      loadRides();
    } catch (err) {
      toast.error('Erreur');
    }
  };

  const filters = [
    { value: 'scheduled' as const, label: 'Planifiées', count: rides.filter(r => r.status === 'scheduled').length },
    { value: 'completed' as const, label: 'Traitées', count: rides.filter(r => r.status === 'completed').length },
    { value: 'cancelled' as const, label: 'Annulées', count: rides.filter(r => r.status === 'cancelled').length },
    { value: 'all' as const, label: 'Toutes', count: rides.length }
  ];

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={() => onBack?.()}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-bold">Reservations programmees</h1>
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
      ) : rides.length === 0 ? (
        <Card className="p-8 text-center text-gray-500">
          <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-300" />
          <p>Aucune reservation</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {rides.map(ride => {
            const catLabel = CATEGORY_LABELS[ride.category] || ride.category;
            const statusInfo = STATUS_LABELS[ride.status] || { label: ride.status, color: 'bg-gray-100 text-gray-800' };
            const scheduledAt = new Date(`${ride.scheduled_date}T${ride.scheduled_time}`);
            const isPast = scheduledAt < new Date();

            return (
              <Card key={ride.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
                      <Badge variant="outline">{catLabel}</Badge>
                      {isPast && ride.status === 'scheduled' && (
                        <Badge className="bg-orange-100 text-orange-800">En retard</Badge>
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
                    <p className="text-sm font-semibold mt-1">{ride.estimated_price.toLocaleString()} CDF</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Cree le {new Date(ride.created_at).toLocaleString('fr-FR')}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 ml-4">
                    {ride.status === 'scheduled' && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => handleCancel(ride.id)} className="text-red-600 border-red-200">
                          <XCircle className="w-4 h-4 mr-1" />
                          Annuler
                        </Button>
                        <Button size="sm" onClick={() => handleManualProcess(ride)} className="bg-green-600">
                          Traiter
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
