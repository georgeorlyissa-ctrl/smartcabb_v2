/**
 * 📊 FLUX & DEMANDES — ADMIN SMARTCABB
 * Flux des événements + zones et heures de forte demande de courses
 * Interface épurée, sans badges
 */

import { useState, useEffect, useCallback } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { motion } from '../../lib/motion';
import { ArrowLeft, Activity, MapPin, Clock, RefreshCw } from '../../lib/admin-icons';
import { AdminLiveFeed } from './AdminLiveFeed';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

const API = `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52`;

interface ZoneStat { rank: number; label: string; count: number }
interface HourStat { hour: number; count: number }

interface DemandStats {
  days: number;
  total: number;
  completed: number;
  cancelled: number;
  active: number;
  topZones: ZoneStat[];
  hourly: HourStat[];
  peakHour: { hour: number; count: number } | null;
}

function hourLabel(hour: number): string {
  return `${String(hour).padStart(2, '0')}h`;
}

export function AdminDemandScreen({ onBack }: { onBack: () => void }) {
  const [stats, setStats] = useState<DemandStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const fetchStats = useCallback(async () => {
    try {
      const resp = await fetch(`${API}/admin/demand-stats?days=30`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` },
      });
      if (!resp.ok) {
        setError(`Erreur ${resp.status}`);
        return;
      }
      const data = await resp.json();
      if (!data.success) {
        setError(data.error || 'Erreur serveur');
        return;
      }
      setStats(data);
      setError(null);
      setLastRefresh(new Date());
    } catch (err: any) {
      setError(err.message || 'Erreur réseau');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const iv = setInterval(fetchStats, 60000);
    return () => clearInterval(iv);
  }, [fetchStats]);

  const maxZoneCount = stats?.topZones?.length ? stats.topZones[0].count : 0;
  const maxHourCount = stats?.hourly?.length ? Math.max(...stats.hourly.map(h => h.count), 1) : 1;
  const topHours = stats?.hourly
    ? [...stats.hourly].filter(h => h.count > 0).sort((a, b) => b.count - a.count).slice(0, 8)
    : [];

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack} className="flex-shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900">Flux & demandes</h1>
            <p className="text-xs text-gray-500">Activité récente, zones et heures de forte demande</p>
          </div>
          <button
            onClick={() => { setLoading(true); fetchStats(); }}
            className="ml-auto flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{lastRefresh.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-6 space-y-6">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
            <span>⚠️ {error}</span>
            <button onClick={() => { setLoading(true); fetchStats(); }} className="ml-auto underline">Réessayer</button>
          </div>
        )}

        {/* Résumé simple */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-4"
        >
          {[
            { label: 'Demandes (30 j)', value: stats ? String(stats.total) : '—' },
            { label: 'Courses terminées', value: stats ? String(stats.completed) : '—' },
            { label: 'En cours / actives', value: stats ? String(stats.active) : '—' },
            { label: 'Annulées', value: stats ? String(stats.cancelled) : '—' },
          ].map(item => (
            <Card key={item.label} className="p-4">
              <p className="text-xs text-gray-500 mb-1">{item.label}</p>
              <p className="text-2xl font-bold text-gray-900">{loading && !stats ? '…' : item.value}</p>
            </Card>
          ))}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Zones à forte demande */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="p-5 sm:p-6 h-full">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="w-4 h-4 text-violet-600" />
                <h2 className="font-semibold text-gray-900">Où les demandes arrivent</h2>
              </div>

              {loading && !stats && (
                <div className="flex items-center justify-center py-10">
                  <div className="w-5 h-5 border-2 border-gray-200 border-t-violet-500 rounded-full animate-spin mr-2" />
                  <span className="text-sm text-gray-400">Chargement…</span>
                </div>
              )}

              {!loading && (!stats || stats.topZones.length === 0) && (
                <div className="text-center py-10 text-gray-400">
                  <div className="text-3xl mb-2">🗺️</div>
                  <div className="text-sm font-medium">Pas encore de données</div>
                  <div className="text-xs mt-1 text-gray-300">Les zones apparaîtront avec les premières courses</div>
                </div>
              )}

              {stats && stats.topZones.length > 0 && (
                <div className="space-y-3">
                  {stats.topZones.map(zone => (
                    <div key={zone.label} className="flex items-center gap-3">
                      <span className="w-5 text-xs text-gray-400 text-right flex-shrink-0">{zone.rank}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2 mb-1">
                          <span className="text-sm font-medium text-gray-800 truncate">{zone.label}</span>
                          <span className="text-xs text-gray-500 flex-shrink-0">{zone.count}</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500"
                            style={{ width: `${maxZoneCount ? Math.round((zone.count / maxZoneCount) * 100) : 0}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </motion.div>

          {/* Heures de forte demande */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="p-5 sm:p-6 h-full">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-4 h-4 text-violet-600" />
                <h2 className="font-semibold text-gray-900">Quand les demandes arrivent</h2>
              </div>

              {loading && !stats && (
                <div className="flex items-center justify-center py-10">
                  <div className="w-5 h-5 border-2 border-gray-200 border-t-violet-500 rounded-full animate-spin mr-2" />
                  <span className="text-sm text-gray-400">Chargement…</span>
                </div>
              )}

              {!loading && (!stats || stats.total === 0) && (
                <div className="text-center py-10 text-gray-400">
                  <div className="text-3xl mb-2">🕒</div>
                  <div className="text-sm font-medium">Pas encore de données</div>
                  <div className="text-xs mt-1 text-gray-300">Les heures de pointe apparaîtront avec les premières courses</div>
                </div>
              )}

              {stats && stats.total > 0 && (
                <>
                  {stats.peakHour && (
                    <p className="text-sm text-gray-700 mb-4">
                      Le pic d'activité est à{' '}
                      <span className="font-bold text-violet-700">{hourLabel(stats.peakHour.hour)}</span>
                      {' '}avec {stats.peakHour.count} demandes sur les {stats.days} derniers jours.
                    </p>
                  )}

                  <div className="space-y-2.5">
                    {topHours.map(h => (
                      <div key={h.hour} className="flex items-center gap-3">
                        <span className="w-10 text-xs text-gray-500 text-right flex-shrink-0">{hourLabel(h.hour)}</span>
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
                            style={{ width: `${Math.round((h.count / maxHourCount) * 100)}%` }}
                          />
                        </div>
                        <span className="w-8 text-xs text-gray-500 flex-shrink-0">{h.count}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </Card>
          </motion.div>
        </div>

        {/* Flux des événements */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4 text-violet-600" />
              <h2 className="font-semibold text-gray-900">Flux des événements</h2>
            </div>
            <AdminLiveFeed limit={30} pollInterval={15000} showHeader={false} />
          </Card>
        </motion.div>
      </div>
    </div>
  );
}