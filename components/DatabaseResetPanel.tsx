/**
 * 🗑️ PANNEAU DE RÉINITIALISATION DE LA BASE DE DONNÉES
 * 
 * Interface admin pour nettoyer les données de test
 * 
 * @version 1.0.0
 * @date 2026-02-05
 */

import React, { useState } from 'react';
import { Trash2, AlertTriangle, RefreshCw, Database, Users, Car } from '../lib/icons';
import { Button } from './ui/button';
import { toast } from '../lib/toast';
import { projectId, publicAnonKey } from '../utils/supabase/info';

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52`;

interface DatabaseStats {
  tables: Array<{
    name: string;
    count: number;
    error?: string;
  }>;
  totalRecords: number;
  kvKeys: number;
}

interface ResetResult {
  success: boolean;
  cleared: Array<{
    table: string;
    deletedRows: number;
  }>;
  errors: Array<{
    table: string;
    error: string;
  }>;
  summary: {
    totalDeleted: number;
    tablesCleared: number;
    kvKeysDeleted?: number;
  };
}

export function DatabaseResetPanel() {
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState<string | null>(null);

  // Charger les statistiques de la base de données
  const loadStats = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/reset/database-stats`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        }
      });

      if (!response.ok) {
        throw new Error('Erreur lors du chargement des statistiques');
      }

      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('❌ Erreur:', error);
      toast.error('Impossible de charger les statistiques');
    } finally {
      setLoading(false);
    }
  };

  // Exécuter une réinitialisation
  const executeReset = async (endpoint: string, actionName: string) => {
    setLoading(true);
    const toastId = toast.loading(`${actionName} en cours...`);
    
    try {

      const response = await fetch(`${API_BASE}/reset/${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la réinitialisation');
      }

      const result: ResetResult = await response.json();

      if (result.success) {
        toast.success(`✅ ${actionName} réussie !`, {
          id: toastId,
          description: `${result.summary.totalDeleted} lignes supprimées dans ${result.summary.tablesCleared} tables`
        });
        
        // Rafraîchir les stats
        await loadStats();
      } else {
        toast.error(`⚠️ ${actionName} partielle`, {
          id: toastId,
          description: `${result.errors.length} erreurs détectées`
        });
      }

      console.log('📊 Résultat:', result);
      setConfirmAction(null);
    } catch (error) {
      console.error('❌ Erreur:', error);
      toast.error('Échec de la réinitialisation', { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* En-tête */}
      <div className="bg-red-50 border-2 border-red-500 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="size-8 text-red-600" />
          <div>
            <h2 className="text-2xl font-bold text-red-900">
              🗑️ Zone Dangereuse
            </h2>
            <p className="text-red-700">
              Réinitialisation de la base de données
            </p>
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 border border-red-200">
          <p className="text-sm text-gray-700">
            ⚠️ <strong>ATTENTION :</strong> Ces actions suppriment définitivement les données.
            <br />
            ✅ À utiliser uniquement pour nettoyer les données de test avant la production.
          </p>
        </div>
      </div>

      {/* Statistiques de la base */}
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Database className="size-5 text-gray-600" />
            <h3 className="text-lg font-semibold">État de la base de données</h3>
          </div>
          <Button
            onClick={loadStats}
            disabled={loading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`size-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>

        {stats ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-sm text-blue-600 font-medium mb-1">
                  Total enregistrements
                </div>
                <div className="text-3xl font-bold text-blue-900">
                  {stats.totalRecords.toLocaleString()}
                </div>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="text-sm text-purple-600 font-medium mb-1">
                  Clés KV Store
                </div>
                <div className="text-3xl font-bold text-purple-900">
                  {stats.kvKeys}
                </div>
              </div>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-3 font-medium text-gray-600">Table</th>
                    <th className="text-right p-3 font-medium text-gray-600">Enregistrements</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {stats.tables.map((table) => (
                    <tr key={table.name} className={table.error ? 'bg-red-50' : ''}>
                      <td className="p-3 font-mono text-gray-700">{table.name}</td>
                      <td className="p-3 text-right">
                        {table.error ? (
                          <span className="text-red-600 text-xs">Erreur</span>
                        ) : (
                          <span className={table.count > 0 ? 'font-semibold' : 'text-gray-400'}>
                            {table.count.toLocaleString()}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            Cliquez sur "Actualiser" pour charger les statistiques
          </div>
        )}
      </div>

      {/* Actions de réinitialisation */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Réinitialiser tout */}
        <ResetCard
          icon={<Trash2 className="size-6" />}
          title="Tout réinitialiser"
          description="Supprime TOUTES les données (users, courses, paramètres, KV store)"
          danger="high"
          actionName="reset-all"
          confirmAction={confirmAction}
          onConfirm={() => setConfirmAction('reset-all')}
          onCancel={() => setConfirmAction(null)}
          onExecute={() => executeReset('reset-all', 'Réinitialisation complète')}
          loading={loading}
        />

        {/* Réinitialiser utilisateurs */}
        <ResetCard
          icon={<Users className="size-6" />}
          title="Utilisateurs uniquement"
          description="Supprime les profils, conducteurs, et leurs données (garde les paramètres)"
          danger="medium"
          actionName="reset-users-only"
          confirmAction={confirmAction}
          onConfirm={() => setConfirmAction('reset-users-only')}
          onCancel={() => setConfirmAction(null)}
          onExecute={() => executeReset('reset-users-only', 'Suppression des utilisateurs')}
          loading={loading}
        />

        {/* Réinitialiser courses */}
        <ResetCard
          icon={<Car className="size-6" />}
          title="Courses uniquement"
          description="Supprime les courses, transactions et avis (garde users et paramètres)"
          danger="low"
          actionName="reset-rides-only"
          confirmAction={confirmAction}
          onConfirm={() => setConfirmAction('reset-rides-only')}
          onCancel={() => setConfirmAction(null)}
          onExecute={() => executeReset('reset-rides-only', 'Suppression des courses')}
          loading={loading}
        />
      </div>
    </div>
  );
}

interface ResetCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  danger: 'high' | 'medium' | 'low';
  actionName: string;
  confirmAction: string | null;
  onConfirm: () => void;
  onCancel: () => void;
  onExecute: () => void;
  loading: boolean;
}

function ResetCard({
  icon,
  title,
  description,
  danger,
  actionName,
  confirmAction,
  onConfirm,
  onCancel,
  onExecute,
  loading
}: ResetCardProps) {
  const isConfirming = confirmAction === actionName;

  const dangerStyles = {
    high: 'border-red-300 bg-red-50',
    medium: 'border-orange-300 bg-orange-50',
    low: 'border-yellow-300 bg-yellow-50'
  };

  const buttonStyles = {
    high: 'bg-red-600 hover:bg-red-700',
    medium: 'bg-orange-600 hover:bg-orange-700',
    low: 'bg-yellow-600 hover:bg-yellow-700'
  };

  return (
    <div className={`border-2 rounded-lg p-4 ${dangerStyles[danger]}`}>
      <div className="flex items-start gap-3 mb-3">
        <div className={danger === 'high' ? 'text-red-600' : danger === 'medium' ? 'text-orange-600' : 'text-yellow-600'}>
          {icon}
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900 mb-1">{title}</h4>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
      </div>

      {isConfirming ? (
        <div className="space-y-2">
          <div className="bg-white rounded p-3 border-2 border-red-500">
            <p className="text-sm font-semibold text-red-900 mb-2">
              ⚠️ Êtes-vous absolument sûr ?
            </p>
            <p className="text-xs text-gray-600 mb-3">
              Cette action est <strong>irréversible</strong>. Les données seront définitivement supprimées.
            </p>
            <div className="flex gap-2">
              <Button
                onClick={onExecute}
                disabled={loading}
                className={`flex-1 text-white ${buttonStyles[danger]}`}
                size="sm"
              >
                Confirmer la suppression
              </Button>
              <Button
                onClick={onCancel}
                disabled={loading}
                variant="outline"
                size="sm"
              >
                Annuler
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <Button
          onClick={onConfirm}
          disabled={loading}
          className={`w-full text-white ${buttonStyles[danger]}`}
          size="sm"
        >
          <Trash2 className="size-4 mr-2" />
          Réinitialiser
        </Button>
      )}
    </div>
  );
}
