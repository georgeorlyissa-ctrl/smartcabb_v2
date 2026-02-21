import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, RefreshCw, Trash2, Users, Database, Shield, Activity } from '../../lib/icons';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { toast } from '../../lib/toast';

interface DiagnosticData {
  kvStore: {
    total: number;
    passengers: number;
    drivers: number;
    admins: number;
    orphaned: number;
  };
  supabaseAuth: {
    total: number;
    missingInKv: number;
  };
  profiles: {
    total: number;
  };
}

interface OrphanedUser {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: string;
  createdAt: string;
  source: string;
}

interface AuthUser {
  id: string;
  email: string;
  phone: string;
  createdAt: string;
  lastSignIn: string;
  inKV: boolean;
  inProfiles: boolean;
}

interface UsersDiagnosticScreenProps {
  onBack: () => void;
}

export function UsersDiagnosticScreen({ onBack }: UsersDiagnosticScreenProps) {
  const [loading, setLoading] = useState(true);
  const [diagnostic, setDiagnostic] = useState<DiagnosticData | null>(null);
  const [orphanedUsers, setOrphanedUsers] = useState<OrphanedUser[]>([]);
  const [authUsers, setAuthUsers] = useState<AuthUser[]>([]);
  const [recommendations, setRecommendations] = useState<any>(null);
  const [cleaning, setCleaning] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Charger le diagnostic
  const loadDiagnostic = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/admin/users/diagnostic`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      const data = await response.json();
      console.log('🔍 Diagnostic chargé:', data);

      if (data.success) {
        setDiagnostic(data.diagnostic);
        setOrphanedUsers(data.orphanedUsers);
        setAuthUsers(data.authUsers);
        setRecommendations(data.recommendations);
      } else {
        toast.error(data.error || 'Erreur lors du diagnostic');
      }
    } catch (error) {
      console.error('❌ Erreur diagnostic:', error);
      toast.error('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  // Nettoyer les données de test
  const cleanupTestData = async () => {
    if (!confirm(`⚠️ ATTENTION !\n\nVous êtes sur le point de supprimer ${diagnostic?.kvStore.orphaned || 0} utilisateurs de test du KV Store.\n\nCes utilisateurs n'existent pas dans Supabase Auth et seront définitivement supprimés.\n\nContinuer ?`)) {
      return;
    }

    try {
      setCleaning(true);
      toast.info('🧹 Nettoyage en cours...');

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/admin/users/cleanup`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();
      console.log('🧹 Résultat nettoyage:', data);

      if (data.success) {
        toast.success(data.message);
        // Recharger le diagnostic
        await loadDiagnostic();
      } else {
        toast.error(data.error || 'Erreur lors du nettoyage');
      }
    } catch (error) {
      console.error('❌ Erreur nettoyage:', error);
      toast.error('Erreur de connexion au serveur');
    } finally {
      setCleaning(false);
    }
  };

  // Synchroniser depuis Supabase Auth
  const syncFromAuth = async () => {
    if (!confirm('🔄 Synchroniser les utilisateurs depuis Supabase Auth ?\n\nCela va mettre à jour les données dans le KV Store avec les vrais comptes Supabase Auth.\n\nContinuer ?')) {
      return;
    }

    try {
      setSyncing(true);
      toast.info('🔄 Synchronisation en cours...');

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/admin/users/sync-from-auth`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();
      console.log('🔄 Résultat synchronisation:', data);

      if (data.success) {
        toast.success(data.message);
        // Recharger le diagnostic
        await loadDiagnostic();
      } else {
        toast.error(data.error || 'Erreur lors de la synchronisation');
      }
    } catch (error) {
      console.error('❌ Erreur synchronisation:', error);
      toast.error('Erreur de connexion au serveur');
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    loadDiagnostic();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Analyse en cours...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl mb-2 text-gray-800">🔍 Diagnostic des utilisateurs</h1>
              <p className="text-gray-600">Analyse et nettoyage de la base de données</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={loadDiagnostic}
                disabled={loading}
                className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <RefreshCw className="w-4 h-4" />
                Actualiser
              </button>
              <button
                onClick={onBack}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                ← Retour
              </button>
            </div>
          </div>

          {/* Recommendation Banner */}
          {recommendations && (
            <div className={`mb-6 p-4 rounded-lg border-l-4 ${
              recommendations.shouldCleanup
                ? 'bg-yellow-50 border-yellow-400'
                : 'bg-green-50 border-green-400'
            }`}>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  {recommendations.shouldCleanup ? (
                    <AlertTriangle className="w-6 h-6 text-yellow-500" />
                  ) : (
                    <CheckCircle className="w-6 h-6 text-green-500" />
                  )}
                </div>
                <div className="flex-1">
                  <p className={`text-sm ${
                    recommendations.shouldCleanup ? 'text-yellow-800' : 'text-green-800'
                  }`}>
                    {recommendations.message}
                  </p>
                  {recommendations.shouldCleanup && (
                    <div className="mt-3 flex gap-3">
                      <button
                        onClick={cleanupTestData}
                        disabled={cleaning}
                        className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                      >
                        {cleaning ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            Nettoyage...
                          </>
                        ) : (
                          <>
                            <Trash2 className="w-4 h-4" />
                            Nettoyer maintenant
                          </>
                        )}
                      </button>
                      {recommendations.shouldSync && (
                        <button
                          onClick={syncFromAuth}
                          disabled={syncing}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                          {syncing ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              Synchronisation...
                            </>
                          ) : (
                            <>
                              <Activity className="w-4 h-4" />
                              Synchroniser depuis Auth
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Statistics Grid */}
          {diagnostic && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* KV Store Stats */}
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <Database className="w-8 h-8 opacity-80" />
                  <span className="text-3xl">{diagnostic.kvStore.total}</span>
                </div>
                <h3 className="text-lg mb-2">KV Store</h3>
                <div className="space-y-1 text-sm text-blue-100">
                  <p>👥 {diagnostic.kvStore.passengers} Passagers</p>
                  <p>🚗 {diagnostic.kvStore.drivers} Conducteurs</p>
                  <p>🛡️ {diagnostic.kvStore.admins} Admins</p>
                  {diagnostic.kvStore.orphaned > 0 && (
                    <p className="text-yellow-300">⚠️ {diagnostic.kvStore.orphaned} Orphelins</p>
                  )}
                </div>
              </div>

              {/* Supabase Auth Stats */}
              <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <Shield className="w-8 h-8 opacity-80" />
                  <span className="text-3xl">{diagnostic.supabaseAuth.total}</span>
                </div>
                <h3 className="text-lg mb-2">Supabase Auth</h3>
                <div className="space-y-1 text-sm text-green-100">
                  <p>✅ {diagnostic.supabaseAuth.total} Utilisateurs réels</p>
                  {diagnostic.supabaseAuth.missingInKv > 0 && (
                    <p className="text-yellow-300">📝 {diagnostic.supabaseAuth.missingInKv} Manquants dans KV</p>
                  )}
                </div>
              </div>

              {/* Profiles Table Stats */}
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <Users className="w-8 h-8 opacity-80" />
                  <span className="text-3xl">{diagnostic.profiles.total}</span>
                </div>
                <h3 className="text-lg mb-2">Table Profiles</h3>
                <div className="space-y-1 text-sm text-purple-100">
                  <p>📊 {diagnostic.profiles.total} Profils</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Orphaned Users Table */}
        {orphanedUsers.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
            <div className="bg-yellow-50 border-b border-yellow-200 px-6 py-4">
              <h2 className="text-xl text-gray-800 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                Utilisateurs orphelins (données de test) - {orphanedUsers.length}
              </h2>
              <p className="text-sm text-yellow-700 mt-1">
                Ces utilisateurs sont dans le KV Store mais n'existent pas dans Supabase Auth
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs text-gray-600 uppercase">Rôle</th>
                    <th className="px-4 py-3 text-left text-xs text-gray-600 uppercase">Nom</th>
                    <th className="px-4 py-3 text-left text-xs text-gray-600 uppercase">Téléphone</th>
                    <th className="px-4 py-3 text-left text-xs text-gray-600 uppercase">Email</th>
                    <th className="px-4 py-3 text-left text-xs text-gray-600 uppercase">ID</th>
                    <th className="px-4 py-3 text-left text-xs text-gray-600 uppercase">Date création</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {orphanedUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-700">
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-900">{user.name}</td>
                      <td className="px-4 py-3 text-gray-700">{user.phone}</td>
                      <td className="px-4 py-3 text-gray-700 text-sm">{user.email}</td>

                      <td className="px-4 py-3 text-gray-500 text-xs font-mono">{user.id.substring(0, 8)}...</td>

                      <td className="px-4 py-3 text-gray-500 text-xs font-mono">{user.id?.substring(0, 8) || 'N/A'}...</td>

                      <td className="px-4 py-3 text-gray-600 text-sm">
                        {new Date(user.createdAt).toLocaleDateString('fr-FR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Real Auth Users Table */}
        {authUsers.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="bg-green-50 border-b border-green-200 px-6 py-4">
              <h2 className="text-xl text-gray-800 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Utilisateurs réels (Supabase Auth) - {authUsers.length}
              </h2>
              <p className="text-sm text-green-700 mt-1">
                Ces utilisateurs existent dans Supabase Auth et sont authentifiés
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs text-gray-600 uppercase">Email</th>
                    <th className="px-4 py-3 text-left text-xs text-gray-600 uppercase">Téléphone</th>
                    <th className="px-4 py-3 text-left text-xs text-gray-600 uppercase">ID</th>
                    <th className="px-4 py-3 text-left text-xs text-gray-600 uppercase">Dans KV</th>
                    <th className="px-4 py-3 text-left text-xs text-gray-600 uppercase">Dans Profiles</th>
                    <th className="px-4 py-3 text-left text-xs text-gray-600 uppercase">Dernière connexion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {authUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-900">{user.email}</td>
                      <td className="px-4 py-3 text-gray-700">{user.phone || 'N/A'}</td>

                      <td className="px-4 py-3 text-gray-500 text-xs font-mono">{user.id.substring(0, 8)}...</td>

                      <td className="px-4 py-3 text-gray-500 text-xs font-mono">{user.id?.substring(0, 8) || 'N/A'}...</td>

                      <td className="px-4 py-3">
                        {user.inKV ? (
                          <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">✓ Oui</span>
                        ) : (
                          <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-700">✗ Non</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {user.inProfiles ? (
                          <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">✓ Oui</span>
                        ) : (
                          <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-700">✗ Non</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-sm">
                        {user.lastSignIn ? new Date(user.lastSignIn).toLocaleDateString('fr-FR') : 'Jamais'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Help Section */}
        <div className="mt-6 bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
          <div className="flex">
            <div className="flex-shrink-0">
              <Shield className="h-5 w-5 text-blue-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm text-blue-800">💡 Explication</h3>
              <div className="mt-2 text-sm text-blue-700 space-y-2">
                <p><strong>KV Store :</strong> Base de données locale (clé-valeur) utilisée pour le cache rapide</p>
                <p><strong>Supabase Auth :</strong> Système d'authentification officiel (source de vérité)</p>
                <p><strong>Utilisateurs orphelins :</strong> Données de test qui ne correspondent à aucun compte réel</p>
                <p><strong>Action recommandée :</strong> Nettoyer les orphelins, puis synchroniser depuis Auth pour garantir la cohérence</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
