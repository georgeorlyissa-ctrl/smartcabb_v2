import { useState, useEffect, useMemo } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { useSupabaseData } from '../../hooks/useSupabaseData';
import { getVehicleDisplayName } from '../../lib/vehicle-helpers';
import { supabase } from '../../lib/supabase';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { toast } from '../../lib/toast';

export interface AssignableRide {
  id: string;
  pickup_address: string;
  dropoff_address: string;
  scheduled_date: string;
  scheduled_time: string;
  category: string;
  estimated_price: number;
  status: string;
  driver_id?: string | null;
  driver_name?: string | null;
  driver_status?: string | null;
}

interface AssignDriverModalProps {
  ride: AssignableRide;
  onClose: () => void;
  onAssigned: () => void;
}

interface DateConflict {
  scheduled_time: string;
  pickup_address: string;
  driver_status: string;
}

const API = `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52`;

function digitsOnly(phone: string): string {
  return (phone || '').replace(/\D/g, '');
}

export function AssignDriverModal({ ride, onClose, onAssigned }: AssignDriverModalProps) {
  const { drivers } = useSupabaseData();
  const [conflicts, setConflicts] = useState<Record<string, DateConflict[]>>({});
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Conflits : autres réservations déjà attribuées à chaque conducteur le même jour
  useEffect(() => {
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from('scheduled_rides')
          .select('driver_id,scheduled_time,pickup_address,driver_status')
          .eq('scheduled_date', ride.scheduled_date)
          .neq('status', 'cancelled')
          .neq('id', ride.id)
          .not('driver_id', 'is', null);
        if (error) throw error;
        const map: Record<string, DateConflict[]> = {};
        (data || []).forEach((r: any) => {
          if (r.driver_status !== 'proposed' && r.driver_status !== 'accepted') return;
          if (!map[r.driver_id]) map[r.driver_id] = [];
          map[r.driver_id].push({
            scheduled_time: r.scheduled_time,
            pickup_address: r.pickup_address,
            driver_status: r.driver_status,
          });
        });
        setConflicts(map);
      } catch (e) {
        console.error('Conflits date:', e);
      }
    };
    load();
  }, [ride.id, ride.scheduled_date]);

  const sortedDrivers = useMemo(() => {
    const q = search.toLowerCase();
    return (drivers || [])
      .filter((d) => d.isApproved)
      .filter((d) => !q || (d.full_name || '').toLowerCase().includes(q) || (d.phone || '').includes(q))
      .map((d) => ({ d, nbConflicts: (conflicts[d.id] || []).length }))
      .sort((a, b) => {
        if (!!a.d.is_available !== !!b.d.is_available) return a.d.is_available ? -1 : 1;
        if (a.nbConflicts !== b.nbConflicts) return a.nbConflicts - b.nbConflicts;
        return (a.d.full_name || '').localeCompare(b.d.full_name || '');
      });
  }, [drivers, conflicts, search]);

  const handleAssign = async (driver: any) => {
    if (!confirm(`Attribuer cette course à ${driver.full_name} le ${ride.scheduled_date} à ${ride.scheduled_time} ?`)) return;
    setAssigningId(driver.id);
    try {
      // Attribution côté serveur (contourne RLS) + push au conducteur
      const resp = await fetch(`${API}/reservations/${ride.id}/assign`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${publicAnonKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ driverId: driver.id, driverName: driver.full_name }),
      });
      const j = await resp.json();
      if (!resp.ok || !j.success) {
        throw new Error(j.error || "Erreur lors de l'attribution");
      }

      if (j.push?.sent) toast.success(`Course proposée à ${driver.full_name} (push envoyé)`);
      else toast.success(`Course proposée à ${driver.full_name} — prévenez-le par appel/WhatsApp (${j.push?.reason || 'push indisponible'})`);
      onAssigned();
    } catch (e) {
      console.error('Attribution:', e);
      toast.error(e instanceof Error ? e.message : "Erreur lors de l'attribution");
    } finally {
      setAssigningId(null);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Attribuer un conducteur</DialogTitle>
          <DialogDescription>
            {ride.pickup_address} → {ride.dropoff_address}<br />
            Le {ride.scheduled_date} à {ride.scheduled_time} · {ride.estimated_price > 0 ? `≈ ${ride.estimated_price.toLocaleString()} CDF` : 'Sur devis'}
          </DialogDescription>
        </DialogHeader>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher nom ou téléphone..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
        />

        <div className="space-y-2 mt-2">
          {sortedDrivers.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-6">Aucun conducteur approuvé</p>
          )}
          {sortedDrivers.map(({ d, nbConflicts }) => {
            const phone = digitsOnly(d.phone || '');
            const isCurrent = ride.driver_id === d.id && (ride.driver_status === 'proposed' || ride.driver_status === 'accepted');
            return (
              <div key={d.id} className={`border rounded-xl p-3 ${isCurrent ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{d.full_name}</p>
                    <p className="text-xs text-gray-500">{d.phone || 'Sans téléphone'}</p>
                  </div>
                  {d.is_available ? (
                    <Badge className="bg-blue-100 text-blue-800 text-[10px]">En ligne</Badge>
                  ) : (
                    <Badge className="bg-gray-200 text-gray-600 text-[10px]">Hors ligne</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <Badge variant="outline" className="text-[10px]">
                    {getVehicleDisplayName({ category: d.vehicle_category || d.vehicle?.category })}
                  </Badge>
                  {nbConflicts > 0 ? (
                    <span className="text-[11px] text-orange-700 font-medium">
                      ⚠️ {nbConflicts} course{nbConflicts > 1 ? 's' : ''} ce jour : {(conflicts[d.id] || []).map((c) => c.scheduled_time).join(', ')}
                    </span>
                  ) : (
                    <span className="text-[11px] text-green-700">✓ Libre ce jour</span>
                  )}
                </div>
                <div className="flex gap-2 mt-2">
                  {phone && (
                    <>
                      <a href={`tel:+${phone}`} className="flex-1 text-center text-xs font-semibold py-2 rounded-lg border border-gray-300 hover:bg-gray-50">
                        📞 Appeler
                      </a>
                      <a href={`https://wa.me/${phone}`} target="_blank" rel="noopener noreferrer" className="flex-1 text-center text-xs font-semibold py-2 rounded-lg border border-green-300 text-green-700 hover:bg-green-50">
                        💬 WhatsApp
                      </a>
                    </>
                  )}
                  <Button
                    size="sm"
                    disabled={assigningId === d.id}
                    onClick={() => handleAssign(d)}
                    className={`flex-1 ${isCurrent ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-700'}`}
                  >
                    {assigningId === d.id ? '...' : isCurrent ? 'Ré-attribuer' : 'Attribuer'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
