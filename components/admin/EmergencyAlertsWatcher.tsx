/**
 * 🚨 VEILLEUR GLOBAL SOS — SMARTCABB
 *
 * Monté au niveau du panneau admin, il surveille en permanence les alertes SOS
 * en cours, même quand l'administrateur travaille sur un autre écran :
 *   - bannière rouge persistante + compteur,
 *   - alarme sonore (sirène + vibration + notification navigateur + voix),
 *   - ré-alarme toutes les 2 minutes tant que l'alerte n'est pas acquittée.
 *
 * Le veilleur se met en sourdine lorsque l'écran « Urgences SOS » est ouvert :
 * c'est alors l'écran lui-même qui gère l'alarme.
 *
 * @version 1.0.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, ChevronRight, X } from '../../lib/icons';
import { useAppState } from '../../hooks/useAppState';
import { supabase } from '../../lib/supabase';
import { playSosAlarm } from '../../lib/notification-sound';
import {
  getActiveEmergencies,
  isActiveEmergency,
  type AdminSosAlert,
} from '../../lib/emergency-admin-service';

const RE_ALARM_MS = 2 * 60 * 1000;
const POLL_MS = 20_000;
const EMERGENCIES_SCREEN = 'admin-emergencies';

const TYPE_LABELS: Record<string, string> = {
  medical: 'Urgence médicale',
  security: 'Sécurité',
  accident: 'Accident',
  harassment: 'Harcèlement',
};

function readSoundEnabled(): boolean {
  try {
    return localStorage.getItem('smartcabb_sos_sound') !== 'false';
  } catch {
    return true;
  }
}

export function EmergencyAlertsWatcher({ currentScreen }: { currentScreen: string }) {
  const { setCurrentScreen } = useAppState();
  const [alerts, setAlerts] = useState<AdminSosAlert[]>([]);
  const [bannerOpen, setBannerOpen] = useState(false);
  const [latest, setLatest] = useState<AdminSosAlert | null>(null);

  const onScreenRef = useRef(false);
  const seededRef = useRef(false);
  const seenRef = useRef<Set<string>>(new Set());
  const lastAlarmRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    onScreenRef.current = currentScreen === EMERGENCIES_SCREEN;
  }, [currentScreen]);

  const applyAlerts = useCallback((list: AdminSosAlert[]) => {
    const actives = list.filter(isActiveEmergency);
    const nowMs = Date.now();

    if (!seededRef.current) {
      // Premier chargement : on mémorise l'existant sans déclencher l'alarme.
      seededRef.current = true;
      actives.forEach((alert) => {
        seenRef.current.add(alert.id);
        lastAlarmRef.current.set(alert.id, nowMs);
      });
      return;
    }

    let alarmAlert: AdminSosAlert | null = null;

    for (const alert of actives) {
      const isNew = !seenRef.current.has(alert.id);
      const lastAlarm = lastAlarmRef.current.get(alert.id) || 0;
      const dueForReAlarm =
        alert.status === 'active' && nowMs - lastAlarm >= RE_ALARM_MS;

      if (isNew || dueForReAlarm) {
        seenRef.current.add(alert.id);
        lastAlarmRef.current.set(alert.id, nowMs);
        if (!alarmAlert) alarmAlert = alert;

        // La bannière revient dès qu'une alerte nouvelle (ou non acquittée)
        // doit attirer l'attention.
        setLatest(alert);
        setBannerOpen(true);
      }
    }

    // L'écran « Urgences SOS » gère lui-même l'alarme : pas de doublon.
    if (alarmAlert && !onScreenRef.current && readSoundEnabled()) {
      playSosAlarm({
        type: alarmAlert.type,
        role: alarmAlert.role,
        userName: alarmAlert.user_name || undefined,
        address: alarmAlert.address || undefined,
      });
    }
  }, []);

  const load = useCallback(async () => {
    const result = await getActiveEmergencies();
    if (!result.ok) return; // silencieux : le panneau admin ne doit pas être pollué
    setAlerts(result.alerts);
    if (result.alerts.length === 0) {
      setBannerOpen(false);
      setLatest(null);
    }
    applyAlerts(result.alerts);
  }, [applyAlerts]);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel(`admin-emergency-watcher-${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'emergency_alerts' },
        () => {
          void load();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [load]);

  const activeCount = alerts.length;
  if (activeCount === 0) return null;

  const onScreen = currentScreen === EMERGENCIES_SCREEN;
  if (onScreen) return null;

  const top = latest || alerts[0];
  const typeLabel = TYPE_LABELS[top?.type || ''] || 'Urgence';
  const who =
    top?.user_name || (top?.role === 'driver' ? 'Un conducteur' : 'Un passager');

  return (
    <>
      {bannerOpen ? (
        <div className="fixed top-0 inset-x-0 z-[100] bg-red-600 text-white shadow-lg">
          <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 animate-pulse" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm sm:text-base truncate">
                {activeCount === 1
                  ? '1 alerte SOS en cours'
                  : `${activeCount} alertes SOS en cours`}
              </p>
              <p className="text-xs text-red-100 truncate">
                {who} · {typeLabel}
                {top?.address ? ` · ${top.address}` : ''}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setBannerOpen(false);
                setCurrentScreen(EMERGENCIES_SCREEN);
              }}
              className="flex-shrink-0 inline-flex items-center gap-1 bg-white text-red-700 hover:bg-red-50 font-semibold text-sm px-3 py-1.5 rounded-md transition-colors"
            >
              Voir
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setBannerOpen(false)}
              title="Masquer la bannière"
              className="flex-shrink-0 p-1.5 rounded hover:bg-red-700/60 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setCurrentScreen(EMERGENCIES_SCREEN)}
          className="fixed bottom-4 right-4 z-[100] inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-3 rounded-full shadow-xl transition-colors"
          title="Ouvrir les urgences SOS"
        >
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-white" />
          </span>
          {activeCount} SOS
        </button>
      )}
    </>
  );
}
