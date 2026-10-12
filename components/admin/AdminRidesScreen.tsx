import { useState, useEffect, useMemo } from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { useAppState } from '../../hooks/useAppState';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { toast } from '../../lib/toast';

const API = `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52`;

const DONE = ['completed', 'rated'];
const LIVE = ['accepted', 'enroute', 'arrived', 'in_progress'];
const LIVE_MAX_AGE_MS = 4 * 60 * 60 * 1000;

const STATUS_STYLE: Record<string, string> = {
  completed: 'bg-green-100 text-green-800',
  rated: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  no_driver_found: 'bg-orange-100 text-orange-800',
  in_progress: 'bg-blue-100 text-blue-800',
  accepted: 'bg-blue-100 text-blue-800',
  enroute: 'bg-blue-100 text-blue-800',
  arrived: 'bg-blue-100 text-blue-800',
  searching: 'bg-yellow-100 text-yellow-800',
  pending: 'bg-yellow-100 text-yellow-800',
  scheduled: 'bg-purple-100 text-purple-800',
  confirmed: 'bg-green-100 text-green-800',
};

function tsOf(r: any): number {
  return new Date(r.createdAt || r.created_at || r.createdAt || 0).getTime() || 0;
}

export function AdminRidesScreen({ onBack }: { onBack?: () => void }) {
  const { setCurrentScreen } = useAppState();
  const [rides, setRides] = useState<any[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'immediate' | 'reserved'>('immediate');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [rr, rs] = await Promise.all([
          fetch(`${API}/admin/rides?limit=1000`, { headers: { 'Authorization': `Bearer ${publicAnonKey}` } }).then((r) => r.json()),
          fetch(`${API}/reservations/admin/all?status=all&limit=500`, { headers: { 'Authorization': `Bearer ${publicAnonKey}` } }).then((r) => r.json()),
        ]);
        if (rr.success) setRides(rr.rides || []);
        if (rs.success) setReservations(rs.rides || []);
      } catch (e) {
        console.error(e);
        toast.error('Erreur chargement');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const stats = useMemo(() => {
    const now = Date.now();
    const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
    const weekStart = now - 7 * 24 * 3600 * 1000;
    const monthStart = now - 30 * 24 * 3600 * 1000;
    const done = rides.filter((r) => DONE.includes(r.status));
    const live = rides.filter((r) => {
      if (!LIVE.includes(r.status)) return false;
      const t = tsOf(r);
      return t && now - t <= LIVE_MAX_AGE_MS;
    });
    const inDay = (r: any) => tsOf(r) >= dayStart.getTime();
    return {
      total: rides.length,
      done: done.length,
      cancelled: rides.filter((r) => r.status === 'cancelled').length,
      reserved: reservations.filter((r) => r.status === 'scheduled' || r.status === 'confirmed').length,
      live: live.length,
      today: rides.filter(inDay).length,
      week: rides.filter((r) => tsOf(r) >= weekStart).length,
      month: rides.filter((r) => tsOf(r) >= monthStart).length,
    };
  }, [rides, reservations]);

  const filteredRides = useMemo(() => {
    const q = search.toLowerCase();
    return rides
      .filter((r) => statusFilter === 'all' || r.status === statusFilter)
      .filter((r) => !q ||
        (r.passengerName || '').toLowerCase().includes(q) ||
        (r.driverName || '').toLowerCase().includes(q) ||
        (r.pickup_address || r.pickup?.address || '').toLowerCase().includes(q) ||
        (r.dropoff_address || r.destination?.address || '').toLowerCase().includes(q))
      .sort((a, b) => tsOf(b) - tsOf(a))
      .slice(0, 200);
  }, [rides, statusFilter, search]);

  const filteredReservations = useMemo(() => {
    const q = search.toLowerCase();
    return reservations
      .filter((r) => !q || (r.pickup_address || '').toLowerCase().includes(q) || (r.dropoff_address || '').toLowerCase().includes(q))
      .sort((a, b) => new Date(`${b.scheduled_date}T${b.scheduled_time || '00:00'}`).getTime() - new Date(`${a.scheduled_date}T${a.scheduled_time || '00:00'}`).getTime())
      .slice(0, 200);
  }, [reservations, search]);

  const kpis = [
    { label: 'Courses totales', value: stats.total, color: 'bg-blue-100 text-blue-700' },
    { label: 'Achevées', value: stats.done, color: 'bg-green-100 text-green-700' },
    { label: 'Annulées', value: stats.cancelled, color: 'bg-red-100 text-red-700' },
    { label: 'Réservées', value: stats.reserved, color: 'bg-purple-100 text-purple-700' },
    { label: 'En direct', value: stats.live, color: 'bg-cyan-100 text-cyan-700' },
    { label: "Aujourd'hui", value: stats.today, color: 'bg-amber-100 text-amber-700' },
    { label: '7 derniers jours', value: stats.week, color: 'bg-indigo-100 text-indigo-700' },
    { label: '30 derniers jours', value: stats.month, color: 'bg-gray-200 text-gray-700' },
  ];

  const statuses = ['all', ...Array.from(new Set(rides.map((r) => r.status).filter(Boolean)))];

  // Par catégorie : nombre + revenus (effectuées uniquement pour les revenus)
  const normCat = (c: any) => (c || 'smart_standard').toLowerCase();
  const byCategory = useMemo(() => {
    const map = new Map<string, { count: number; done: number; revenue: number }>();
    rides.forEach((r) => {
      const c = normCat(r.vehicle_category || r.vehicleCategory || r.vehicleType || r.category);
      const e = map.get(c) || { count: 0, done: 0, revenue: 0 };
      e.count++;
      if (DONE.includes(r.status)) {
        e.done++;
        e.revenue += Number(r.total_amount || r.totalPrice || r.finalPrice || 0);
      }
      map.set(c, e);
    });
    const order = ['smart_standard', 'smart_standard_clim', 'smart_standard_no_clim', 'smart_confort', 'smart_plus', 'smart_business'];
    return [...map.entries()].sort((a, b) => {
      const ia = order.indexOf(a[0]);
      const ib = order.indexOf(b[0]);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
  }, [rides]);

  const CAT_LABELS: Record<string, string> = {
    smart_standard: 'SmartCabb Standard',
    smart_standard_clim: 'SmartCabb Standard avec Clim',
    smart_standard_no_clim: 'SmartCabb Standard sans Clim',
    smart_confort: 'SmartCabb Confort',
    smart_plus: 'SmartCabb Familiale',
    smart_business: 'SmartCabb Business',
  };

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={() => (onBack ? onBack() : setCurrentScreen('admin-dashboard'))}>
          ←
        </Button>
        <h1 className="text-xl font-bold">Gestion des courses</h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {kpis.map((k) => (
          <Card key={k.label} className="p-4">
            <p className="text-xs text-gray-500">{k.label}</p>
            <p className="text-2xl font-bold mt-1">
              <span className={`inline-block px-2 rounded-lg ${k.color}`}>{k.value}</span>
            </p>
          </Card>
        ))}
      </div>

      <h2 className="text-sm font-bold text-gray-700 mb-2">Par catégorie (immédiates)</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
        {byCategory.map(([cat, e]) => (
          <Card key={cat} className="p-3">
            <p className="text-xs font-semibold text-gray-700">{CAT_LABELS[cat] || cat}</p>
            <p className="text-lg font-bold mt-1">{e.count} <span className="text-xs font-normal text-gray-500">courses</span></p>
            <p className="text-xs text-gray-600">{e.done} achevée{e.done > 1 ? 's' : ''}</p>
            <p className="text-xs font-semibold text-green-700">{e.revenue.toLocaleString()} CDF</p>
          </Card>
        ))}
        {byCategory.length === 0 && (
          <p className="text-sm text-gray-400 col-span-full">Aucune donnée</p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Button size="sm" variant={tab === 'immediate' ? 'default' : 'outline'} onClick={() => setTab('immediate')}>
          Immédiates ({rides.length})
        </Button>        <Button size="sm" variant={tab === 'reserved' ? 'default' : 'outline'} onClick={() => setTab('reserved')}>
          Réservées ({reservations.length})
        </Button>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher passager, chauffeur, adresse…"
          className="flex-1 min-w-[180px] px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
        />
        {tab === 'immediate' && (
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm bg-white"
          >
            {statuses.map((s) => (
              <option key={s} value={s}>{s === 'all' ? 'Tous statuts' : s}</option>
            ))}
          </select>
        )}
      </div>

      {loading ? (
        <p className="text-gray-500">Chargement…</p>
      ) : tab === 'immediate' ? (
        <div className="space-y-2">
          {filteredRides.length === 0 && <Card className="p-8 text-center text-gray-500">Aucune course</Card>}
          {filteredRides.map((r) => (
            <Card key={r.id} className="p-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 min-w-0">
                  <Badge className={STATUS_STYLE[r.status] || 'bg-gray-100 text-gray-700'}>{r.status}</Badge>
                  <span className="text-sm font-medium truncate">
                    {r.pickup_address || r.pickup?.address || '—'} → {r.dropoff_address || r.destination?.address || '—'}
                  </span>
                </div>
                <span className="text-xs text-gray-500 flex-shrink-0">
                  {(r.passengerName || 'Passager')} · {(r.driverName || 'sans chauffeur')} · {Number(r.total_amount || r.totalPrice || 0).toLocaleString()} CDF
                </span>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          <Button size="sm" variant="outline" onClick={() => setCurrentScreen('admin-scheduled-rides')}>
            Gérer les réservations (attribuer, acompte) →
          </Button>
          {filteredReservations.length === 0 && <Card className="p-8 text-center text-gray-500">Aucune réservation</Card>}
          {filteredReservations.map((r) => (
            <Card key={r.id} className="p-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 min-w-0">
                  <Badge className={STATUS_STYLE[r.status] || 'bg-gray-100 text-gray-700'}>{r.status}</Badge>
                  {r.driver_status === 'accepted' && <Badge className="bg-green-100 text-green-800">🛡️ {r.driver_name}</Badge>}
                  <span className="text-sm font-medium truncate">
                    {r.scheduled_date} {(r.scheduled_time || '').slice(0, 5)} · {r.pickup_address} → {r.dropoff_address}
                  </span>
                </div>
                <span className="text-xs text-gray-500 flex-shrink-0">
                  {Number(r.estimated_price || 0).toLocaleString()} CDF{r.deposit_received ? ' · acompte ✓' : ''}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
