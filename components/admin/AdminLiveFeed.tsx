/**
 * 📡 FLUX D'ACTIVITÉ EN TEMPS RÉEL — ADMIN SMARTCABB
 * Affiche toutes les activités : courses, annulations, config, conducteurs
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

const API = `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52`;

interface FeedEvent {
  id: string;
  type: string;
  data: Record<string, any>;
  actor?: string;
  timestamp: string;
}

const EVENT_CFG: Record<string, { label: string; color: string; bg: string; border: string; icon: string }> = {
  ride_completed:  { label: 'Course terminée',      color: 'text-green-800',  bg: 'bg-green-50',   border: 'border-green-200',  icon: '✅' },
  ride_cancelled:  { label: 'Course annulée',        color: 'text-red-800',    bg: 'bg-red-50',     border: 'border-red-200',    icon: '❌' },
  ride_started:    { label: 'Course en cours',       color: 'text-blue-800',   bg: 'bg-blue-50',    border: 'border-blue-200',   icon: '🚗' },
  ride_accepted:   { label: 'Course acceptée',       color: 'text-blue-700',   bg: 'bg-blue-50',    border: 'border-blue-100',   icon: '👍' },
  ride_requested:  { label: 'Nouvelle demande',      color: 'text-purple-800', bg: 'bg-purple-50',  border: 'border-purple-200', icon: '📍' },
  config_updated:  { label: 'Config mise à jour',    color: 'text-orange-800', bg: 'bg-orange-50',  border: 'border-orange-200', icon: '⚙️' },
  driver_approved: { label: 'Conducteur approuvé',   color: 'text-green-800',  bg: 'bg-green-50',   border: 'border-green-200',  icon: '✅' },
  driver_rejected: { label: 'Conducteur rejeté',     color: 'text-red-800',    bg: 'bg-red-50',     border: 'border-red-200',    icon: '🚫' },
};

function cfg(type: string) {
  return EVENT_CFG[type] ?? { label: type, color: 'text-gray-700', bg: 'bg-gray-50', border: 'border-gray-200', icon: '📋' };
}

function timeAgo(ts: string): string {
  const d = new Date(ts);
  if (isNaN(d.getTime())) return '—';
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'À l\'instant';
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h}h`;
  const days = Math.floor(h / 24);
  if (days < 7) return `il y a ${days}j`;
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

function formatFC(price: any): string | null {
  const n = typeof price === 'string' ? parseFloat(price) : Number(price);
  if (!n || isNaN(n) || n <= 0) return null;
  return `${Math.round(n).toLocaleString('fr-FR')} FC`;
}

function EventBody({ event }: { event: FeedEvent }) {
  const d = event.data;
  const price = formatFC(d.price);

  if (event.type.startsWith('ride_')) {
    const from = d.pickup   !== '—' ? d.pickup   : null;
    const to   = d.destination !== '—' ? d.destination : null;
    const name = d.passengerName && d.passengerName !== 'Passager' ? d.passengerName : null;
    const driver = d.driverName  && d.driverName  !== 'Conducteur'  ? d.driverName  : null;

    return (
      <div className="mt-1 space-y-0.5 text-xs text-gray-600">
        {/* Noms */}
        {(name || driver) && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {name   && <span className="font-medium text-gray-800">{name}</span>}
            {name && driver && <span className="text-gray-300">·</span>}
            {driver && <span className="text-gray-500">{driver}</span>}
          </div>
        )}
        {/* Trajet */}
        {(from || to) && (
          <div className="flex items-start gap-1 text-gray-500">
            <span className="text-xs mt-0.5 flex-shrink-0">📍</span>
            <span className="truncate">{from || '?'}{to ? ` → ${to}` : ''}</span>
          </div>
        )}
        {/* Prix + catégorie + annulé par */}
        <div className="flex items-center gap-2 flex-wrap pt-0.5">
          {price && (
            <span className="font-bold text-gray-900 text-sm">{price}</span>
          )}
          {d.category && d.category !== '—' && (
            <span className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-gray-500 text-xs">{d.category}</span>
          )}
          {event.type === 'ride_cancelled' && d.cancelledBy && (
            <span className="text-red-600 text-xs">
              par {d.cancelledBy === 'passenger' ? 'le passager' : d.cancelledBy === 'driver' ? 'le conducteur' : d.cancelledBy}
            </span>
          )}
          {event.type === 'ride_cancelled' && d.cancelReason && d.cancelReason !== 'Non spécifiée' && (
            <span className="text-gray-400 text-xs italic truncate max-w-[200px]">« {d.cancelReason} »</span>
          )}
          {event.type === 'ride_cancelled' && d.hasPenalty && d.penaltyAmount > 0 && (
            <span className="text-orange-600 text-xs font-medium">Pénalité: {formatFC(d.penaltyAmount)}</span>
          )}
          {d.distance && (
            <span className="text-gray-400 text-xs">{typeof d.distance === 'number' ? d.distance.toFixed(1) : d.distance} km</span>
          )}
        </div>
      </div>
    );
  }

  if (event.type === 'config_updated') {
    return (
      <div className="mt-1 text-xs text-gray-600">
        {d.changedKeys?.length > 0
          ? <span>Paramètres : <span className="font-mono text-orange-700">{d.changedKeys.join(', ')}</span></span>
          : 'Configuration globale mise à jour'
        }
        {d.configVersion && <span className="ml-1 text-orange-500 font-medium">v{d.configVersion}</span>}
      </div>
    );
  }

  if (event.type === 'driver_approved' || event.type === 'driver_rejected') {
    return d.name
      ? <div className="mt-1 text-xs text-gray-600">{d.name}{d.phone ? ` · ${d.phone}` : ''}</div>
      : null;
  }

  return null;
}

// ─── Composant principal ──────────────────────────────────────────────────────
interface Props {
  limit?: number;
  pollInterval?: number;
  className?: string;
  showHeader?: boolean;
}

export function AdminLiveFeed({ limit = 40, pollInterval = 10000, className = '', showHeader = true }: Props) {
  const [events, setEvents]       = useState<FeedEvent[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [newCount, setNewCount]   = useState(0);
  const knownIds = useRef(new Set<string>());
  const firstLoad = useRef(true);

  const fetchFeed = useCallback(async () => {
    try {
      const resp = await fetch(
        `${API}/admin/live-feed?limit=${limit}&days=30`,
        { headers: { 'Authorization': `Bearer ${publicAnonKey}` } }
      );

      if (!resp.ok) {
        setError(`Erreur ${resp.status}`);
        return;
      }

      const data = await resp.json();

      if (!data.success) {
        setError(data.error || 'Erreur serveur');
        return;
      }

      const incoming: FeedEvent[] = data.events || [];
      setError(null);

      // Compter les nouveaux événements
      let added = 0;
      incoming.forEach(e => {
        if (!knownIds.current.has(e.id)) {
          knownIds.current.add(e.id);
          if (!firstLoad.current) added++;
        }
      });

      setEvents(incoming);
      setLastRefresh(new Date());
      if (added > 0) setNewCount(n => n + added);
      firstLoad.current = false;
    } catch (err: any) {
      setError(err.message || 'Erreur réseau');
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchFeed();
    const iv = setInterval(fetchFeed, pollInterval);
    return () => clearInterval(iv);
  }, [fetchFeed, pollInterval]);

  const handleRefresh = () => {
    setNewCount(0);
    setLoading(true);
    fetchFeed();
  };

  return (
    <div className={`flex flex-col ${className}`}>
      {showHeader && (
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-800">Activité en direct</span>
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" title="Mise à jour auto" />
            {newCount > 0 && (
              <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full font-bold">
                +{newCount}
              </span>
            )}
          </div>
          <button
            onClick={handleRefresh}
            className="text-xs text-gray-400 hover:text-gray-700 flex items-center gap-1 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{lastRefresh.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
          </button>
        </div>
      )}

      {/* Erreur */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-3 text-xs text-red-700">
          <span>⚠️ {error}</span>
          <button onClick={handleRefresh} className="ml-auto underline">Réessayer</button>
        </div>
      )}

      {/* Chargement */}
      {loading && events.length === 0 && (
        <div className="flex items-center justify-center py-10">
          <div className="w-5 h-5 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin mr-2" />
          <span className="text-sm text-gray-400">Chargement du flux...</span>
        </div>
      )}

      {/* Vide */}
      {!loading && !error && events.length === 0 && (
        <div className="text-center py-10 text-gray-400">
          <div className="text-4xl mb-2">📋</div>
          <div className="text-sm font-medium">Aucune activité récente</div>
          <div className="text-xs mt-1 text-gray-300">Les courses et événements apparaîtront ici</div>
        </div>
      )}

      {/* Liste événements */}
      <div className="space-y-2 overflow-y-auto max-h-[500px] pr-1">
        {events.map(event => {
          const c = cfg(event.type);
          return (
            <div
              key={event.id}
              className={`rounded-xl border px-3 py-2.5 ${c.bg} ${c.border}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 min-w-0">
                  <span className="text-base leading-none mt-0.5 flex-shrink-0">{c.icon}</span>
                  <div className="min-w-0">
                    <span className={`text-xs font-semibold ${c.color}`}>{c.label}</span>
                    <EventBody event={event} />
                  </div>
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0 whitespace-nowrap mt-0.5">
                  {timeAgo(event.timestamp)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
