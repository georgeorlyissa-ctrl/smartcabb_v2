/**
 * 🚨 INCIDENTS DE COURSE — ÉCRAN SOS ADMIN
 *
 * Liste les incidents déclarés en course (panne, crevaison, urgence, autre),
 * visibles dans le fil d'activité, et permet d'ouvrir immédiatement le détail
 * de la course concernée (lieu, itinéraire, chauffeur, position).
 *
 * Source : `GET /admin/live-feed` (événements `ride_incident` logués par
 * l'Edge Function lors d'un signalement depuis l'app chauffeur/passager).
 *
 * @version 1.0.0
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { AlertTriangle, ChevronDown, ChevronUp, MapPin, RefreshCw } from '../../lib/icons';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { SosRideDetails } from './SosRideDetails';

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52`;
const POLL_MS = 30_000;
const MAX_ITEMS = 12;

interface IncidentEvent {
  id: string;
  type: string;
  timestamp?: string;
  data?: {
    rideId?: string | null;
    kind?: string;
    kindLabel?: string;
    reporterType?: string;
    comment?: string | null;
    lat?: number | null;
    lng?: number | null;
    pickup?: string | null;
    destination?: string | null;
    driverName?: string | null;
    passengerName?: string | null;
  };
}

function formatTimestamp(value?: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function SosIncidentFeed() {
  const [incidents, setIncidents] = useState<IncidentEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openRideId, setOpenRideId] = useState<string | null>(null);

  const load = useCallback(async (options: { silent?: boolean } = {}) => {
    if (options.silent) setRefreshing(true);
    try {
      const response = await fetch(`${API_BASE}/admin/live-feed?limit=100&days=7`, {
        headers: { Authorization: `Bearer ${publicAnonKey}` },
      });
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.success) {
        setError(json?.error || `Fil indisponible (${response.status})`);
      } else {
        setError(null);
        const events: IncidentEvent[] = Array.isArray(json.events) ? json.events : [];
        setIncidents(
          events
            .filter((event) => event?.type === 'ride_incident' && event.data?.rideId)
            .slice(0, MAX_ITEMS),
        );
      }
    } catch {
      setError('Impossible de charger les incidents (réseau).');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load({ silent: true }), POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  const urgentCount = useMemo(
    () => incidents.filter((event) => event.data?.kind === 'urgence').length,
    [incidents],
  );

  if (loading || incidents.length === 0) return null;

  return (
    <Card className="p-4 border-l-4 border-amber-400">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <p className="font-semibold text-gray-900 text-sm sm:text-base">
            Incidents signalés en course
          </p>
          <Badge variant="outline">{incidents.length}</Badge>
          {urgentCount > 0 && (
            <Badge className="bg-red-600 text-white">{urgentCount} urgence(s)</Badge>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2"
          disabled={refreshing}
          onClick={() => void load({ silent: true })}
          title="Rafraîchir les incidents"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {error && <p className="text-xs text-amber-800 mt-2">{error}</p>}

      <div className="mt-3 space-y-2">
        {incidents.map((event) => {
          const d = event.data || {};
          const rideId = d.rideId ? String(d.rideId) : '';
          const isUrgent = d.kind === 'urgence';
          const open = openRideId === rideId || openRideId === event.id;
          const positionUrl =
            typeof d.lat === 'number' && typeof d.lng === 'number'
              ? `https://www.google.com/maps/search/?api=1&query=${d.lat},${d.lng}`
              : null;

          return (
            <div
              key={event.id}
              className={`rounded-lg border p-2.5 ${isUrgent ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'}`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={isUrgent ? 'bg-red-600 text-white' : 'bg-amber-100 text-amber-800'}>
                  {d.kindLabel || d.kind || 'Incident'}
                </Badge>
                <span className="text-xs text-gray-600">
                  {d.reporterType === 'driver' ? 'Chauffeur' : 'Passager'}
                  {d.driverName || d.passengerName
                    ? ` · ${d.driverName || d.passengerName}`
                    : ''}
                </span>
                <span className="text-xs text-gray-400">{formatTimestamp(event.timestamp)}</span>
                {rideId && (
                  <span className="text-xs text-gray-400">
                    Course #{rideId.slice(-8)}
                  </span>
                )}
              </div>

              {(d.pickup || d.destination) && (
                <p className="text-xs text-gray-700 mt-1 break-words">
                  {d.pickup || 'Départ non renseigné'}
                  {' → '}
                  {d.destination || 'Destination non renseignée'}
                </p>
              )}

              {d.comment && <p className="text-xs text-gray-700 mt-1 break-words">{d.comment}</p>}

              <div className="flex flex-wrap items-center gap-2 mt-2">
                {rideId && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs"
                    onClick={() => setOpenRideId(open ? null : rideId)}
                  >
                    {open ? <ChevronUp className="w-3.5 h-3.5 mr-1" /> : <ChevronDown className="w-3.5 h-3.5 mr-1" />}
                    {open ? 'Masquer le détail' : 'Détails & itinéraire'}
                  </Button>
                )}
                {positionUrl && (
                  <a
                    href={positionUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <MapPin className="w-3.5 h-3.5" /> Position signalée
                  </a>
                )}
              </div>

              {open && rideId && <SosRideDetails rideId={rideId} />}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
