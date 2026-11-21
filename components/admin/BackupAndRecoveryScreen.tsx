import { useCallback, useEffect, useState } from 'react';
import { motion } from '../../lib/motion';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { useAppState } from '../../hooks/useAppState';
import { supabase } from '../../lib/supabase';
import { projectId } from '../../utils/supabase/info';
import {
  ArrowLeft,
  Database,
  Download,
  Shield,
  Clock,
  CheckCircle,
  RefreshCw,
  Trash2,
  Archive,
  AlertTriangle,
  HardDrive,
} from '../../lib/admin-icons';
import { toast } from '../../lib/toast';

const API = `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52`;

interface BackupItem {
  name: string;
  size: number;
  sizeLabel: string;
  createdAt: string | null;
}

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    throw new Error('Session administrateur requise — déconnectez-vous puis reconnectez-vous.');
  }
  return { Authorization: `Bearer ${token}` };
}

export function BackupAndRecoveryScreen() {
  const { setCurrentScreen } = useAppState();
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [retentionDays, setRetentionDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [busyName, setBusyName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadBackups = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch(`${API}/backups/list`, { headers: await authHeaders() });
      const j = await resp.json();
      if (!resp.ok || !j.success) throw new Error(j.error || 'Erreur de chargement');
      setBackups(j.backups || []);
      setRetentionDays(j.retentionDays || 30);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erreur de chargement';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBackups();
  }, [loadBackups]);

  const createBackup = async () => {
    setCreating(true);
    const toastId = toast.loading('Sauvegarde en cours… (quelques secondes)');
    try {
      const resp = await fetch(`${API}/backups/run`, {
        method: 'POST',
        headers: { ...(await authHeaders()), 'Content-Type': 'application/json' },
      });
      const j = await resp.json();
      if (!resp.ok || !j.success) throw new Error(j.error || 'Erreur de sauvegarde');
      toast.success(
        `Backup créé : ${j.backup?.name || 'OK'} (${j.backup?.sizeLabel || ''})`,
        { id: toastId },
      );
      await loadBackups();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erreur de sauvegarde';
      toast.error(msg, { id: toastId });
    } finally {
      setCreating(false);
    }
  };

  const downloadBackup = async (name: string) => {
    setBusyName(name);
    const toastId = toast.loading('Préparation du téléchargement…');
    try {
      const resp = await fetch(`${API}/backups/download/${encodeURIComponent(name)}`, {
        headers: await authHeaders(),
      });
      const j = await resp.json();
      if (!resp.ok || !j.success || !j.url) throw new Error(j.error || 'Lien indisponible');
      const a = document.createElement('a');
      a.href = j.url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.download = name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success('Téléchargement lancé', { id: toastId });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur de téléchargement', { id: toastId });
    } finally {
      setBusyName(null);
    }
  };

  const deleteBackup = async (name: string) => {
    if (!confirm(`Supprimer définitivement ${name} ?`)) return;
    setBusyName(name);
    const toastId = toast.loading('Suppression…');
    try {
      const resp = await fetch(`${API}/backups/${encodeURIComponent(name)}`, {
        method: 'DELETE',
        headers: await authHeaders(),
      });
      const j = await resp.json();
      if (!resp.ok || !j.success) throw new Error(j.error || 'Erreur de suppression');
      toast.success('Backup supprimé', { id: toastId });
      setBackups((prev) => prev.filter((b) => b.name !== name));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur de suppression', { id: toastId });
    } finally {
      setBusyName(null);
    }
  };

  const lastBackup = backups[0];
  const lastDate = lastBackup?.createdAt ? new Date(lastBackup.createdAt).toLocaleString('fr-FR') : '—';
  const totalSize = backups.reduce((sum, b) => sum + (b.size || 0), 0);
  const totalSizeLabel = totalSize > 1024 * 1024
    ? `${(totalSize / (1024 * 1024)).toFixed(1)} Mo`
    : `${Math.round(totalSize / 1024)} Ko`;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="min-h-screen bg-gray-50 pb-20"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
        <div className="flex items-center space-x-4 mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentScreen('admin-dashboard')}
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Sauvegardes</h1>
            <p className="text-blue-100 text-sm">Sauvegarde automatique des données SmartCabb</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-6">
          <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-4">
            <div className="text-center">
              <Archive className="w-6 h-6 mx-auto mb-2 text-white" />
              <p className="text-2xl font-bold">{backups.length}</p>
              <p className="text-xs text-blue-100">Backups disponibles</p>
            </div>
          </Card>
          <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-4">
            <div className="text-center">
              <Clock className="w-6 h-6 mx-auto mb-2 text-white" />
              <p className="text-sm font-bold leading-tight">{lastDate}</p>
              <p className="text-xs text-blue-100 mt-1">Dernier backup</p>
            </div>
          </Card>
          <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-4">
            <div className="text-center">
              <HardDrive className="w-6 h-6 mx-auto mb-2 text-white" />
              <p className="text-2xl font-bold">{retentionDays} j</p>
              <p className="text-xs text-blue-100">Conservation</p>
            </div>
          </Card>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Statut automatique */}
        <Card className="p-6">
          <div className="flex items-start space-x-3">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Shield className="w-6 h-6 text-green-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold">Sauvegarde automatique</h3>
                <Badge className="bg-green-100 text-green-800">Active</Badge>
              </div>
              <p className="text-sm text-gray-600">
                Tous les jours à <strong>02:00 (heure de Kinshasa)</strong>, le serveur exporte
                les profils, chauffeurs, courses, réservations, alertes SOS, comptes et photos.
                Les {retentionDays} derniers backups sont conservés.
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Destination : bucket privé <code className="bg-gray-100 px-1 rounded">backups</code>
                {' '}de Supabase — {backups.length} fichier(s), {totalSizeLabel}.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
            <Button
              onClick={createBackup}
              disabled={creating}
              className="h-12 bg-green-600 hover:bg-green-700"
            >
              {creating ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Sauvegarde en cours…
                </>
              ) : (
                <>
                  <Archive className="w-4 h-4 mr-2" />
                  Créer un backup maintenant
                </>
              )}
            </Button>
            <Button
              onClick={() => loadBackups()}
              disabled={loading}
              variant="outline"
              className="h-12"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Actualiser la liste
            </Button>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}
        </Card>

        {/* Liste des backups */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Historique des backups</h3>

          {loading ? (
            <div className="text-center py-10 text-gray-500">
              <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin text-gray-300" />
              Chargement…
            </div>
          ) : backups.length === 0 ? (
            <div className="text-center py-12">
              <Database className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Aucun backup pour l'instant</p>
              <p className="text-sm text-gray-400">Cliquez sur « Créer un backup maintenant »</p>
            </div>
          ) : (
            <div className="space-y-3">
              {backups.map((backup, index) => (
                <div
                  key={backup.name}
                  className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <Archive className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{backup.name}</p>
                        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {backup.createdAt
                              ? new Date(backup.createdAt).toLocaleString('fr-FR')
                              : 'date inconnue'}
                          </span>
                          <span>•</span>
                          <span>{backup.sizeLabel}</span>
                          {index === 0 && (
                            <Badge className="bg-green-100 text-green-800 text-xs">Dernier</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadBackup(backup.name)}
                        disabled={busyName === backup.name}
                      >
                        <Download className="w-3 h-3 mr-2" />
                        Télécharger
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteBackup(backup.name)}
                        disabled={busyName === backup.name}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Conseils */}
        <Card className="p-6 bg-gradient-to-br from-orange-50 to-red-50 border-orange-200">
          <div className="flex items-start space-x-3 mb-3">
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h3 className="font-semibold text-orange-900">Pour ne rien perdre</h3>
              <p className="text-sm text-orange-700 mt-1">
                Un backup stocké dans Supabase ne protège pas contre la perte totale du compte.
              </p>
            </div>
          </div>
          <ul className="space-y-2 text-sm text-orange-900">
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 mt-0.5 text-orange-600 flex-shrink-0" />
              <span>Téléchargez le dernier backup <strong>une fois par semaine</strong> sur votre PC/OneDrive.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 mt-0.5 text-orange-600 flex-shrink-0" />
              <span>Activez les <strong>backups quotidiens Supabase Pro</strong> (Database → Backups) pour une restauration complète.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 mt-0.5 text-orange-600 flex-shrink-0" />
              <span>Les mots de passe des comptes ne sont jamais exportés : les utilisateurs devront les réinitialiser.</span>
            </li>
          </ul>
        </Card>
      </div>
    </motion.div>
  );
}
