import { useState, useEffect } from 'react';
import { motion } from '../../lib/motion';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { useAppState } from '../../hooks/useAppState';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import {
  ArrowLeft,
  Database,
  Download,
  Upload,
  Shield,
  Calendar,
  Clock,
  HardDrive,
  FileJson,
  Users,
  Car,
  MapPin,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Trash2,
  Archive,
  FileText
} from '../../lib/admin-icons';
import { toast } from '../../lib/toast';

interface BackupItem {
  id: string;
  name: string;
  timestamp: string;
  size: string;
  type: 'auto' | 'manual';
  tables: string[];
  status: 'completed' | 'in_progress' | 'failed';
}

export function BackupAndRecoveryScreen() {
  const { setCurrentScreen } = useAppState();
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(true);
  const [backupFrequency, setBackupFrequency] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedTables, setSelectedTables] = useState<string[]>([
    'profiles',
    'drivers',
    'rides',
    'emergency_alerts',
    'promo_codes',
    'settings'
  ]);

  // Tables disponibles pour backup/export
  const availableTables = [
    { id: 'profiles', name: 'Profils utilisateurs', icon: Users, color: 'blue' },
    { id: 'drivers', name: 'Conducteurs', icon: Car, color: 'green' },
    { id: 'rides', name: 'Courses', icon: MapPin, color: 'purple' },
    { id: 'emergency_alerts', name: 'Alertes SOS', icon: AlertTriangle, color: 'red' },
    { id: 'promo_codes', name: 'Codes promo', icon: FileText, color: 'orange' },
    { id: 'settings', name: 'Paramètres', icon: HardDrive, color: 'gray' }
  ];

  // Charger les backups existants
  useEffect(() => {
    loadBackups();
  }, []);

  const loadBackups = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/backups/list`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setBackups(data.backups || []);
      }
    } catch (error) {
      console.error('Erreur chargement backups:', error);
    }
  };

  // Créer un backup manuel
  const createManualBackup = async () => {
    if (selectedTables.length === 0) {
      toast.error('Sélectionnez au moins une table à sauvegarder');
      return;
    }

    setIsCreatingBackup(true);
    const toastId = toast.loading('Création du backup en cours...');

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/backups/create`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            tables: selectedTables,
            type: 'manual'
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        toast.success('✅ Backup créé avec succès !', { id: toastId });
        
        // Ajouter le nouveau backup à la liste
        setBackups(prev => [data.backup, ...prev]);
      } else {
        const error = await response.json();
        toast.error(`Erreur: ${error.message}`, { id: toastId });
      }
    } catch (error) {
      console.error('Erreur création backup:', error);
      toast.error('Erreur lors de la création du backup', { id: toastId });
    } finally {
      setIsCreatingBackup(false);
    }
  };

  // Export de données (téléchargement direct)
  const exportData = async () => {
    if (selectedTables.length === 0) {
      toast.error('Sélectionnez au moins une table à exporter');
      return;
    }

    setIsExporting(true);
    const toastId = toast.loading('Export des données en cours...');

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/export/data`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            tables: selectedTables,
            format: 'json'
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        
        // Télécharger le fichier JSON
        const blob = new Blob([JSON.stringify(data.export, null, 2)], { 
          type: 'application/json' 
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `smartcabb-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        toast.success('✅ Export terminé avec succès !', { id: toastId });
      } else {
        const error = await response.json();
        toast.error(`Erreur: ${error.message}`, { id: toastId });
      }
    } catch (error) {
      console.error('Erreur export données:', error);
      toast.error('Erreur lors de l\'export des données', { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  // Télécharger un backup
  const downloadBackup = async (backupId: string) => {
    const toastId = toast.loading('Téléchargement du backup...');

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/backups/download/${backupId}`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        
        // Télécharger le fichier
        const blob = new Blob([JSON.stringify(data.backup, null, 2)], { 
          type: 'application/json' 
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `smartcabb-backup-${backupId}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        toast.success('✅ Backup téléchargé !', { id: toastId });
      } else {
        toast.error('Erreur lors du téléchargement', { id: toastId });
      }
    } catch (error) {
      console.error('Erreur téléchargement backup:', error);
      toast.error('Erreur lors du téléchargement', { id: toastId });
    }
  };

  // Supprimer un backup
  const deleteBackup = async (backupId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce backup ?')) {
      return;
    }

    const toastId = toast.loading('Suppression du backup...');

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/backups/delete/${backupId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );

      if (response.ok) {
        toast.success('✅ Backup supprimé !', { id: toastId });
        setBackups(prev => prev.filter(b => b.id !== backupId));
      } else {
        toast.error('Erreur lors de la suppression', { id: toastId });
      }
    } catch (error) {
      console.error('Erreur suppression backup:', error);
      toast.error('Erreur lors de la suppression', { id: toastId });
    }
  };

  // Toggle sélection table
  const toggleTable = (tableId: string) => {
    setSelectedTables(prev => {
      if (prev.includes(tableId)) {
        return prev.filter(id => id !== tableId);
      } else {
        return [...prev, tableId];
      }
    });
  };

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
            <h1 className="text-2xl font-bold">Backup & Recovery</h1>
            <p className="text-blue-100 text-sm">Sauvegarde et récupération des données</p>
          </div>
        </div>

        {/* Stats rapides */}
        <div className="grid grid-cols-3 gap-4 mt-6">
          <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-4">
            <div className="text-center">
              <Database className="w-6 h-6 mx-auto mb-2 text-white" />
              <p className="text-2xl font-bold">{backups.length}</p>
              <p className="text-xs text-blue-100">Backups totaux</p>
            </div>
          </Card>
          <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-4">
            <div className="text-center">
              <CheckCircle className="w-6 h-6 mx-auto mb-2 text-green-300" />
              <p className="text-2xl font-bold">
                {backups.filter(b => b.status === 'completed').length}
              </p>
              <p className="text-xs text-blue-100">Réussis</p>
            </div>
          </Card>
          <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-4">
            <div className="text-center">
              <Calendar className="w-6 h-6 mx-auto mb-2 text-white" />
              <p className="text-2xl font-bold capitalize">{backupFrequency}</p>
              <p className="text-xs text-blue-100">Fréquence auto</p>
            </div>
          </Card>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Configuration Auto-Backup */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <RefreshCw className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold">Backup Automatique</h3>
                <p className="text-sm text-gray-600">
                  {autoBackupEnabled ? 'Activé' : 'Désactivé'}
                </p>
              </div>
            </div>
            <Switch
              checked={autoBackupEnabled}
              onCheckedChange={setAutoBackupEnabled}
            />
          </div>

          {autoBackupEnabled && (
            <div className="space-y-4 pt-4 border-t">
              <div>
                <Label>Fréquence de sauvegarde</Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <Button
                    variant={backupFrequency === 'daily' ? 'default' : 'outline'}
                    onClick={() => setBackupFrequency('daily')}
                    className="h-12"
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    Quotidien
                  </Button>
                  <Button
                    variant={backupFrequency === 'weekly' ? 'default' : 'outline'}
                    onClick={() => setBackupFrequency('weekly')}
                    className="h-12"
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    Hebdomadaire
                  </Button>
                  <Button
                    variant={backupFrequency === 'monthly' ? 'default' : 'outline'}
                    onClick={() => setBackupFrequency('monthly')}
                    className="h-12"
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    Mensuel
                  </Button>
                </div>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-start space-x-2">
                  <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-semibold mb-1">Protection automatique activée</p>
                    <p>
                      Les backups {backupFrequency === 'daily' ? 'quotidiens' : backupFrequency === 'weekly' ? 'hebdomadaires' : 'mensuels'} 
                      {' '}seront créés automatiquement à 2h00 du matin. Les 30 derniers backups sont conservés.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Sélection des tables */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Tables à sauvegarder/exporter</h3>
          <div className="grid grid-cols-2 gap-3">
            {availableTables.map((table) => {
              const Icon = table.icon;
              const isSelected = selectedTables.includes(table.id);
              
              return (
                <button
                  key={table.id}
                  onClick={() => toggleTable(table.id)}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      isSelected ? `bg-${table.color}-100` : 'bg-gray-100'
                    }`}>
                      <Icon className={`w-5 h-5 ${
                        isSelected ? `text-${table.color}-600` : 'text-gray-600'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{table.name}</p>
                      <p className="text-xs text-gray-500">{table.id}</p>
                    </div>
                    {isSelected && (
                      <CheckCircle className="w-5 h-5 text-blue-600" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3 mt-6">
            <Button
              onClick={createManualBackup}
              disabled={isCreatingBackup || selectedTables.length === 0}
              className="h-12 bg-green-500 hover:bg-green-600"
            >
              {isCreatingBackup ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Création...
                </>
              ) : (
                <>
                  <Archive className="w-4 h-4 mr-2" />
                  Créer backup
                </>
              )}
            </Button>
            <Button
              onClick={exportData}
              disabled={isExporting || selectedTables.length === 0}
              variant="outline"
              className="h-12"
            >
              {isExporting ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Export...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Exporter JSON
                </>
              )}
            </Button>
          </div>
        </Card>

        {/* Liste des backups */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Historique des backups</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={loadBackups}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualiser
            </Button>
          </div>

          {backups.length === 0 ? (
            <div className="text-center py-12">
              <Database className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Aucun backup disponible</p>
              <p className="text-sm text-gray-400">Créez votre premier backup ci-dessus</p>
            </div>
          ) : (
            <div className="space-y-3">
              {backups.map((backup) => (
                <div
                  key={backup.id}
                  className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        backup.type === 'auto' ? 'bg-blue-100' : 'bg-green-100'
                      }`}>
                        {backup.type === 'auto' ? (
                          <RefreshCw className={`w-5 h-5 ${
                            backup.type === 'auto' ? 'text-blue-600' : 'text-green-600'
                          }`} />
                        ) : (
                          <Archive className="w-5 h-5 text-green-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{backup.name}</p>
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <Clock className="w-3 h-3" />
                          <span>{new Date(backup.timestamp).toLocaleString('fr-FR')}</span>
                          <span>•</span>
                          <span>{backup.size}</span>
                        </div>
                      </div>
                    </div>
                    <Badge
                      variant={
                        backup.status === 'completed' ? 'default' :
                        backup.status === 'in_progress' ? 'secondary' :
                        'destructive'
                      }
                    >
                      {backup.status === 'completed' ? 'Complété' :
                       backup.status === 'in_progress' ? 'En cours' :
                       'Échoué'}
                    </Badge>
                  </div>

                  <div className="flex items-center space-x-2 mb-3">
                    {backup.tables.map((table) => (
                      <Badge key={table} variant="outline" className="text-xs">
                        {table}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => downloadBackup(backup.id)}
                      className="flex-1"
                    >
                      <Download className="w-3 h-3 mr-2" />
                      Télécharger
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteBackup(backup.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Plan de Disaster Recovery */}
        <Card className="p-6 bg-gradient-to-br from-orange-50 to-red-50 border-orange-200">
          <div className="flex items-start space-x-3 mb-4">
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h3 className="font-semibold text-orange-900">Plan de Disaster Recovery</h3>
              <p className="text-sm text-orange-700 mt-1">
                Procédures de récupération en cas d'incident
              </p>
            </div>
          </div>

          <div className="space-y-3 text-sm text-orange-900">
            <div className="flex items-start space-x-2">
              <div className="w-6 h-6 bg-orange-200 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold">1</span>
              </div>
              <div>
                <p className="font-semibold">Backup automatique quotidien</p>
                <p className="text-orange-700">Les données sont sauvegardées chaque nuit à 2h00</p>
              </div>
            </div>

            <div className="flex items-start space-x-2">
              <div className="w-6 h-6 bg-orange-200 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold">2</span>
              </div>
              <div>
                <p className="font-semibold">Rétention de 30 jours</p>
                <p className="text-orange-700">Possibilité de restaurer jusqu'à 30 jours en arrière</p>
              </div>
            </div>

            <div className="flex items-start space-x-2">
              <div className="w-6 h-6 bg-orange-200 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold">3</span>
              </div>
              <div>
                <p className="font-semibold">Export manuel disponible</p>
                <p className="text-orange-700">Téléchargez vos données en JSON à tout moment</p>
              </div>
            </div>

            <div className="flex items-start space-x-2">
              <div className="w-6 h-6 bg-orange-200 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold">4</span>
              </div>
              <div>
                <p className="font-semibold">Supabase Point-in-Time Recovery</p>
                <p className="text-orange-700">Restauration jusqu'à 7 jours en arrière via Supabase Dashboard</p>
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 bg-white rounded-lg border border-orange-200">
            <p className="text-xs text-orange-800">
              <strong>En cas d'incident :</strong> Contactez immédiatement l'équipe technique et récupérez
              le dernier backup disponible. La restauration prend généralement 15-30 minutes.
            </p>
          </div>
        </Card>
      </div>
    </motion.div>
  );
}