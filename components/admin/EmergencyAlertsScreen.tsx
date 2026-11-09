/**
 * 🚨 ÉCRAN ADMIN — URGENCES SOS
 *
 * Supervision temps réel des alertes SOS déclenchées depuis l'application :
 *   - compteurs et filtres (en cours / toutes / clôturées),
 *   - position GPS + itinéraire, appel direct du demandeur,
 *   - chrono SLA (prise en charge attendue sous 60 s),
 *   - acquittement, clôture et marquage « faux positif »,
 *   - alarme sonore + notification navigateur sur nouvelle alerte.
 *
 * Temps réel Supabase + interrogation de secours toutes les 15 s (au cas où
 * la policy Realtime ne s'appliquerait pas à la session courante).
 *
 * @version 1.0.0
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  AlertTriangle,
  BellOff,
  CheckCircle,
  ChevronLeft,
  Clock,
  ExternalLink,
  Loader2,
  MapPin,
  Phone,
  RefreshCw,
  Shield,
  User,
  Volume2,
  XCircle,
} from '../../lib/icons';
import { supabase } from '../../lib/supabase';
import { playSosAlarm, preloadVoices, requestNotificationPermission } from '../../lib/notification-sound';
import {
  acknowledgeEmergency,
  formatDuration,
  isActiveEmergency,
  listEmergencyAlerts,
  resolveEmergency,
  secondsBetween,
  type AdminSosAlert,
} from '../../lib/emergency-admin-service';
import { toast } from '../../lib/toast';

/** Délai cible de prise en charge (secondes). */
const SLA_ACK_SECONDS = 60;
/** Intervalle de ré-alarme d'une alerte non acquittée. */
const RE_ALARM_MS = 2 * 60 * 1000;
/** Interrogation de secours si le temps réel est indisponible. */
const POLL_MS = 15_000;

type FilterKey = 'active' | 'all' | 'closed';

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: 'active', label: 'En cours' },
  { key: 'all', label: 'Toutes' },
  { key: 'closed', label: 'Clôturées' },
];

const TYPE_META: Record<
  string,
  { label: string; emoji: string; chip: string; border: string }
> = {
  medical: {
    label: 'Urgence médicale',
    emoji: '🩺',
    chip: 'bg-red-100 text-red-800',
    border: 'border-l-red-600',
  },
  security: {
    label: 'Sécurité',
    emoji: '🚨',
    chip: 'bg-orange-100 text-orange-800',
    border: 'border-l-orange-500',
  },
  accident: {
    label: 'Accident',
    emoji: '💥',
    chip: 'bg-amber-100 text-amber-900',
    border: 'border-l-amber-500',
  },
  harassment: {
    label: 'Harcèlement',
    emoji: '🛡️',
    chip: 'bg-purple-100 text-purple-800',
    border: 'border-l-purple-600',
  },
};

const STATUS_META: Record<string, { label: string; className: string }> = {
  active: { label: 'Non prise en charge', className: 'bg-red-600 text-white' },
  acknowledged: { label: 'Prise en charge', className: 'bg-amber-500 text-white' },
  resolved: { label: 'Résolue', className: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Annulée par l’utilisateur', className: 'bg-gray-200 text-gray-700' },
  false_alarm: { label: 'Faux positif', className: 'bg-gray-200 text-gray-700' },
};

function roleLabel(role: string): string {
  return role === 'driver' ? 'Conducteur' : 'Passager';
}

function formatDateTime(iso?: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return '—';
  return date.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function mapsUrl(alert: AdminSosAlert): string | null {
  if (
    typeof alert.lat === 'number' &&
    typeof alert.lng === 'number' &&
    Number.isFinite(alert.lat) &&
    Number.isFinite(alert.lng)
  ) {
    return `https://www.google.com/maps/search/?api=1&query=${alert.lat},${alert.lng}`;
  }
  if (alert.address?.trim()) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(alert.address.trim())}`;
  }
  return null;
}

function isToday(iso?: string | null): boolean {
  if (!iso) return false;
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return false;
  const now = new Date();
  return (
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  );
}

export function EmergencyAlertsScreen({ onBack }: { onBack?: () => void }) {
  const [alerts, setAlerts] = useState<AdminSosAlert[]>([]);
  const [filter, setFilter] = useState<FilterKey>('active');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());
  const [busyId, setBusyId] = useState<string | null>(null);

  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('smartcabb_sos_sound');
      return stored === null ? true : stored === 'true';
    } catch {
      return true;
    }
  });

  const [resolveTarget, setResolveTarget] = useState<AdminSosAlert | null>(null);
  const [resolveNote, setResolveNote] = useState('');
  const [falseAlarm, setFalseAlarm] = useState(false);

  // Références pour la détection de nouvelles alertes (sans relancer les effets).
  const soundEnabledRef = useRef(soundEnabled);
  const seenRef = useRef<Set<string>>(new Set());
  const lastAlarmRef = useRef<Map<string, number>>(new Map());
  const seededRef = useRef(false);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
    try {
      localStorage.setItem('smartcabb_sos_sound', String(soundEnabled));
    } catch {
      // Stockage indisponible : le réglage reste en mémoire.
    }
  }, [soundEnabled]);

  // Horloge (chrono SLA) — un seul intervalle pour tous les cartes.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  /** Déclenche l'alarme pour les nouvelles alertes, et ré-alarme les non acquittées. */
  const announceNewAlerts = useCallback((list: AdminSosAlert[]) => {
    const actives = list.filter(isActiveEmergency);
    const nowMs = Date.now();

    if (!seededRef.current) {
      seededRef.current = true;
      actives.forEach((alert) => {
        seenRef.current.add(alert.id);
        lastAlarmRef.current.set(alert.id, nowMs);
      });
      return;
    }

    let toAlarm: AdminSosAlert | null = null;

    for (const alert of actives) {
      const isNew = !seenRef.current.has(alert.id);
      const lastAlarm = lastAlarmRef.current.get(alert.id) || 0;
      const dueForReAlarm =
        alert.status === 'active' && nowMs - lastAlarm >= RE_ALARM_MS;

      if (isNew || dueForReAlarm) {
        seenRef.current.add(alert.id);
        lastAlarmRef.current.set(alert.id, nowMs);
        if (!toAlarm) toAlarm = alert; // une seule alarme par cycle
      }
    }

    if (toAlarm && soundEnabledRef.current) {
      playSosAlarm({
        type: toAlarm.type,
        role: toAlarm.role,
        userName: toAlarm.user_name || undefined,
        address: toAlarm.address || undefined,
      });
    }
  }, []);

  const load = useCallback(
    async (options: { silent?: boolean } = {}) => {
      if (!options.silent) setRefreshing(true);
      const result = await listEmergencyAlerts({ status: 'all', limit: 200 });

      if (!result.ok) {
        setError(result.error || 'Impossible de charger les alertes');
      } else {
        setError(null);
        setAlerts(result.alerts);
        announceNewAlerts(result.alerts);
      }

      setLoading(false);
      setRefreshing(false);
      setLastUpdated(Date.now());
    },
    [announceNewAlerts],
  );

  // Pré-chauffe audio/TTS + permission notifications.
  useEffect(() => {
    preloadVoices();
    void requestNotificationPermission();
  }, []);

  // Chargement initial + interrogation de secours.
  useEffect(() => {
    void load();
    const timer = setInterval(() => void load({ silent: true }), POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  // Temps réel Supabase (rafraîchit la liste dès qu'une alerte change).
  useEffect(() => {
    const channel = supabase
      .channel(`admin-emergency-alerts-${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'emergency_alerts' },
        () => {
          void load({ silent: true });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [load]);

  const activeAlerts = useMemo(() => alerts.filter(isActiveEmergency), [alerts]);
  const pendingAlerts = useMemo(() => alerts.filter((a) => a.status === 'active'), [alerts]);
  const overdueAlerts = useMemo(
    () =>
      pendingAlerts.filter(
        (alert) => secondsBetween(alert.created_at, now) > SLA_ACK_SECONDS,
      ),
    [pendingAlerts, now],
  );
  const closedAlerts = useMemo(() => alerts.filter((a) => !isActiveEmergency(a)), [alerts]);
  const closedToday = useMemo(
    () =>
      closedAlerts.filter(
        (alert) => isToday(alert.resolved_at) || isToday(alert.created_at),
      ),
    [closedAlerts],
  );

  const visibleAlerts = useMemo(() => {
    if (filter === 'active') return activeAlerts;
    if (filter === 'closed') return closedAlerts;
    return alerts;
  }, [filter, activeAlerts, closedAlerts, alerts]);

  const counts: Record<FilterKey, number> = {
    active: activeAlerts.length,
    all: alerts.length,
    closed: closedAlerts.length,
  };

  const handleAck = async (alert: AdminSosAlert) => {
    if (busyId) return;
    setBusyId(alert.id);
    try {
      const result = await acknowledgeEmergency(alert.id);
      if (!result.ok) {
        toast.error(result.error || 'Acquittement impossible');
        return;
      }
      toast.success('Alerte prise en charge ✓');
      await load({ silent: true });
    } finally {
      setBusyId(null);
    }
  };

  const openResolve = (alert: AdminSosAlert) => {
    setResolveTarget(alert);
    setResolveNote('');
    setFalseAlarm(false);
  };

  const handleResolve = async () => {
    if (!resolveTarget || busyId) return;
    setBusyId(resolveTarget.id);
    try {
      const result = await resolveEmergency(resolveTarget.id, {
        falseAlarm,
        note: resolveNote.trim() || undefined,
      });
      if (!result.ok) {
        toast.error(result.error || 'Clôture impossible');
        return;
      }
      toast.success(falseAlarm ? 'Alerte classée en faux positif' : 'Alerte clôturée ✓');
      setResolveTarget(null);
      await load({ silent: true });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* En-tête */}
      <div className="bg-white border-b sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => onBack?.()}>
            <ChevronLeft className="w-5 h-5" />
          </Button>

          <div className="flex items-center gap-2 min-w-0">
            <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold leading-tight">Urgences SOS</h1>
              <p className="text-xs text-gray-500">
                {activeAlerts.length > 0
                  ? `${activeAlerts.length} alerte(s) en cours`
                  : 'Aucune alerte en cours'}
                {lastUpdated ? ` · maj ${new Date(lastUpdated).toLocaleTimeString('fr-FR')}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSoundEnabled((value) => !value)}
              title={soundEnabled ? 'Couper l’alarme sonore' : 'Activer l’alarme sonore'}
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 sm:mr-2" />
              ) : (
                <BellOff className="w-4 h-4 sm:mr-2" />
              )}
              <span className="hidden sm:inline">
                {soundEnabled ? 'Alarme active' : 'Alarme coupée'}
              </span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => void load()}
              disabled={refreshing}
            >
              {refreshing ? (
                <Loader2 className="w-4 h-4 sm:mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 sm:mr-2" />
              )}
              <span className="hidden sm:inline">Actualiser</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 space-y-5">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="font-semibold text-red-900">Erreur de chargement</p>
              <p className="text-sm text-red-700">{error}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 text-red-600 border-red-300 hover:bg-red-100"
                onClick={() => void load()}
              >
                Réessayer
              </Button>
            </div>
          </div>
        )}

        {/* KPI */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-4 h-4" />
              <p className="text-xs sm:text-sm text-gray-600">En cours</p>
            </div>
            <p className="text-2xl sm:text-3xl font-bold mt-1">{activeAlerts.length}</p>
          </Card>

          <Card className={`p-4 ${pendingAlerts.length > 0 ? 'border-2 border-red-300 bg-red-50' : ''}`}>
            <div className="flex items-center gap-2 text-orange-600">
              <Clock className="w-4 h-4" />
              <p className="text-xs sm:text-sm text-gray-600">Sans prise en charge</p>
            </div>
            <p className="text-2xl sm:text-3xl font-bold mt-1">{pendingAlerts.length}</p>
          </Card>

          <Card className={`p-4 ${overdueAlerts.length > 0 ? 'border-2 border-red-400 bg-red-50' : ''}`}>
            <div className="flex items-center gap-2 text-red-600">
              <Shield className="w-4 h-4" />
              <p className="text-xs sm:text-sm text-gray-600">SLA &gt; {SLA_ACK_SECONDS} s</p>
            </div>
            <p className="text-2xl sm:text-3xl font-bold mt-1">{overdueAlerts.length}</p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-4 h-4" />
              <p className="text-xs sm:text-sm text-gray-600">Clôturées aujourd’hui</p>
            </div>
            <p className="text-2xl sm:text-3xl font-bold mt-1">{closedToday.length}</p>
          </Card>
        </div>

        {/* Filtres */}
        <div className="flex gap-2 flex-wrap">
          {FILTERS.map((item) => (
            <Button
              key={item.key}
              size="sm"
              variant={filter === item.key ? 'default' : 'outline'}
              onClick={() => setFilter(item.key)}
            >
              {item.label} ({counts[item.key]})
            </Button>
          ))}
        </div>

        {/* Liste */}
        {loading ? (
          <Card className="p-10 text-center text-gray-500">
            <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin text-gray-400" />
            Chargement des alertes…
          </Card>
        ) : visibleAlerts.length === 0 ? (
          <Card className="p-10 text-center text-gray-500">
            <Shield className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p className="font-medium">
              {filter === 'active'
                ? 'Aucune alerte en cours'
                : filter === 'closed'
                  ? 'Aucune alerte clôturée'
                  : 'Aucune alerte enregistrée'}
            </p>
            <p className="text-xs mt-1">
              Les demandes d’aide apparaîtront ici automatiquement.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {visibleAlerts.map((alert) => {
              const type = TYPE_META[alert.type] || TYPE_META.security;
              const status = STATUS_META[alert.status] || STATUS_META.active;
              const active = isActiveEmergency(alert);
              const elapsed = secondsBetween(alert.created_at, now);
              const ackDelay = alert.ack_at ? secondsBetween(alert.created_at, new Date(alert.ack_at).getTime()) : null;
              const closeDelay = alert.resolved_at
                ? secondsBetween(alert.created_at, new Date(alert.resolved_at).getTime())
                : null;
              const overdue = alert.status === 'active' && elapsed > SLA_ACK_SECONDS;
              const url = mapsUrl(alert);
              const busy = busyId === alert.id;

              return (
                <Card
                  key={alert.id}
                  className={`border-l-4 ${type.border} ${overdue ? 'border-2 border-red-300' : ''}`}
                >
                  <div className="p-4 sm:p-5 space-y-3">
                    {/* Bandeau statut */}
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={status.className}>
                        {alert.status === 'active' && (
                          <span className="inline-block w-2 h-2 rounded-full bg-white mr-1.5 animate-pulse" />
                        )}
                        {status.label}
                      </Badge>
                      <Badge className={type.chip}>
                        {type.emoji} {type.label}
                      </Badge>
                      <Badge variant="outline">
                        {alert.role === 'driver' ? '🚗' : '🧍'} {roleLabel(alert.role)}
                      </Badge>
                      {active && (
                        <span
                          className={`text-xs font-mono font-semibold px-2 py-1 rounded ${
                            overdue
                              ? 'bg-red-600 text-white'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                          title="Temps écoulé depuis le déclenchement"
                        >
                          ⏱ {formatDuration(elapsed)}
                          {overdue ? ' · SLA dépassé' : ''}
                        </span>
                      )}
                      <span className="text-xs text-gray-500 ml-auto">
                        {formatDateTime(alert.created_at)}
                      </span>
                    </div>

                    {/* Identité */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="font-semibold truncate">
                          {alert.user_name || 'Utilisateur inconnu'}
                        </span>
                      </div>
                      {alert.user_phone && (
                        <a
                          href={`tel:${alert.user_phone}`}
                          className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                        >
                          <Phone className="w-4 h-4" />
                          {alert.user_phone}
                        </a>
                      )}
                      {alert.ride_id && (
                        <span className="text-xs text-gray-500">
                          Course #{String(alert.ride_id).slice(-8)}
                        </span>
                      )}
                    </div>

                    {/* Position */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-700">
                      <div className="flex items-start gap-2 min-w-0">
                        <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                        <span className="break-words">
                          {alert.address ||
                            (typeof alert.lat === 'number' && typeof alert.lng === 'number'
                              ? `${alert.lat.toFixed(5)}, ${alert.lng.toFixed(5)}`
                              : 'Position non transmise')}
                          {typeof alert.accuracy === 'number' && (
                            <span className="text-xs text-gray-400">
                              {' '}
                              (±{Math.round(alert.accuracy)} m)
                            </span>
                          )}
                        </span>
                      </div>
                      {url && (
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline flex items-center gap-1 text-sm"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Voir sur la carte
                        </a>
                      )}
                    </div>

                    {/* Contexte */}
                    {(alert.note || alert.vehicle_info || alert.counterpart_name) && (
                      <div className="text-sm bg-gray-50 rounded-lg p-3 space-y-1">
                        {alert.note && (
                          <p>
                            <span className="text-gray-500">Note : </span>
                            {alert.note}
                          </p>
                        )}
                        {alert.vehicle_info && (
                          <p>
                            <span className="text-gray-500">Véhicule : </span>
                            {alert.vehicle_info}
                          </p>
                        )}
                        {alert.counterpart_name && (
                          <p>
                            <span className="text-gray-500">Autre partie : </span>
                            {alert.counterpart_name}
                            {alert.counterpart_phone ? ` · ${alert.counterpart_phone}` : ''}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Suivi */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                      {ackDelay !== null && (
                        <span className="flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5 text-amber-500" />
                          Prise en charge en {formatDuration(ackDelay)}
                        </span>
                      )}
                      {closeDelay !== null && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          Clôturée en {formatDuration(closeDelay)}
                        </span>
                      )}
                      {alert.resolution_note && <span>Motif : {alert.resolution_note}</span>}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {alert.user_phone && (
                        <Button size="sm" variant="outline" onClick={() => { window.location.href = `tel:${alert.user_phone}`; }}>
                          <Phone className="w-4 h-4 mr-1.5" />
                          Appeler
                        </Button>
                      )}
                      {url && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
                        >
                          <MapPin className="w-4 h-4 mr-1.5" />
                          Itinéraire
                        </Button>
                      )}
                      {alert.status === 'active' && (
                        <Button
                          size="sm"
                          className="bg-amber-500 hover:bg-amber-600 text-white"
                          onClick={() => void handleAck(alert)}
                          disabled={busy}
                        >
                          {busy ? (
                            <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                          ) : (
                            <CheckCircle className="w-4 h-4 mr-1.5" />
                          )}
                          Acquitter
                        </Button>
                      )}
                      {active && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-700 border-green-300 hover:bg-green-50"
                          onClick={() => openResolve(alert)}
                          disabled={busy}
                        >
                          <XCircle className="w-4 h-4 mr-1.5" />
                          Clôturer
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Clôture d'une alerte */}
      <Dialog
        open={Boolean(resolveTarget)}
        onOpenChange={(open: boolean) => {
          if (!open) setResolveTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clôturer l’alerte SOS</DialogTitle>
            <DialogDescription>
              {resolveTarget
                ? `${resolveTarget.user_name || 'Utilisateur'} · ${
                    (TYPE_META[resolveTarget.type] || TYPE_META.security).label
                  }`
                : ''}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <label className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-gray-50">
              <input
                type="checkbox"
                className="mt-1"
                checked={falseAlarm}
                onChange={(event) => setFalseAlarm(event.target.checked)}
              />
              <span>
                <span className="font-medium block">Faux positif / test</span>
                <span className="text-sm text-gray-500">
                  L’alerte est archivée comme fausse alerte, sans suite.
                </span>
              </span>
            </label>

            <div>
              <label className="text-sm font-medium block mb-1" htmlFor="sos-resolution-note">
                Note de clôture (optionnelle)
              </label>
              <textarea
                id="sos-resolution-note"
                value={resolveNote}
                onChange={(event) => setResolveNote(event.target.value)}
                rows={3}
                maxLength={500}
                placeholder="Ex. : personne contactée, police envoyée sur place…"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveTarget(null)} disabled={Boolean(busyId)}>
              Annuler
            </Button>
            <Button
              onClick={() => void handleResolve()}
              disabled={Boolean(busyId)}
              className={falseAlarm ? 'bg-gray-600 hover:bg-gray-700' : 'bg-green-600 hover:bg-green-700'}
            >
              {busyId ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-1.5" />
              )}
              {falseAlarm ? 'Classer en faux positif' : 'Clôturer l’alerte'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
