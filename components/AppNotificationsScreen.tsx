/**
 * 🔔 BOÎTE DE RÉCEPTION — APPS CONDUCTEUR & PASSAGER
 * Liste les messages diffusés depuis le panel admin (bonus, news, infos).
 * Les "lus" sont mémorisés en local (localStorage).
 */

import { useState, useEffect, useCallback } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { projectId, publicAnonKey } from '../utils/supabase/info';

const API = `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52`;

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  createdAt: string;
}

const ArrowLeftIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);

const BellIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
  </svg>
);

function readKey(target: string): string {
  return `sc_notif_read_${target}`;
}

export function getReadIds(target: string): string[] {
  try {
    return JSON.parse(localStorage.getItem(readKey(target)) || '[]');
  } catch {
    return [];
  }
}

export function markAllRead(target: string, ids: string[]): void {
  try {
    localStorage.setItem(readKey(target), JSON.stringify(ids));
  } catch {}
}

/** Compte les non-lus pour la pastille de la cloche */
export function useUnreadNotifications(target: 'drivers' | 'passengers'): number {
  const [unread, setUnread] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const resp = await fetch(`${API}/fcm/inbox?target=${target}`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` },
      });
      const data = await resp.json();
      if (!data.success) return;
      const read = new Set(getReadIds(target));
      const ids: string[] = (data.notifications || []).map((n: AppNotification) => n.id);
      setUnread(ids.filter((id) => !read.has(id)).length);
    } catch {}
  }, [target]);

  useEffect(() => {
    refresh();
    const iv = setInterval(refresh, 60000);
    return () => clearInterval(iv);
  }, [refresh]);

  return unread;
}

export function NotificationBell({
  target,
  onOpen,
  dark = false,
}: {
  target: 'drivers' | 'passengers';
  onOpen: () => void;
  dark?: boolean;
}) {
  const unread = useUnreadNotifications(target);
  return (
    <button
      onClick={onOpen}
      className={`relative w-9 h-9 rounded-full flex items-center justify-center transition-colors flex-shrink-0 ${
        dark ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
      }`}
      aria-label="Notifications"
    >
      <BellIcon className="w-5 h-5" />
      {unread > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </button>
  );
}

export function AppNotificationsScreen({
  target,
  title,
  onBack,
}: {
  target: 'drivers' | 'passengers';
  title: string;
  onBack: () => void;
}) {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInbox = useCallback(async () => {
    try {
      const resp = await fetch(`${API}/fcm/inbox?target=${target}`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` },
      });
      const data = await resp.json();
      if (data.success) {
        setItems(data.notifications || []);
        markAllRead(
          target,
          (data.notifications || []).map((n: AppNotification) => n.id)
        );
      }
    } catch {}
    finally {
      setLoading(false);
    }
  }, [target]);

  useEffect(() => {
    fetchInbox();
  }, [fetchInbox]);

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="flex-shrink-0">
            <ArrowLeftIcon />
          </Button>
          <p className="text-base font-bold text-gray-900">{title}</p>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-14">
            <div className="w-5 h-5 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin mr-2" />
            <span className="text-sm text-gray-400">Chargement…</span>
          </div>
        ) : items.length === 0 ? (
          <Card className="p-10 text-center">
            <div className="text-4xl mb-3">🔔</div>
            <p className="font-medium text-gray-700">Aucun message</p>
            <p className="text-xs text-gray-400 mt-1">Les annonces SmartCabb apparaîtront ici</p>
          </Card>
        ) : (
          items.map((n) => (
            <Card key={n.id} className="p-4">
              <p className="font-semibold text-gray-900 text-sm">{n.title}</p>
              <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">{n.message}</p>
              <p className="text-xs text-gray-400 mt-2">
                {new Date(n.createdAt).toLocaleString('fr-FR', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
