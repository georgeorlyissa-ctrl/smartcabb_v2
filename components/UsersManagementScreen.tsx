import React, { useEffect, useState } from 'react';
import { Search, Download, Copy, Eye, EyeOff, Filter, UserCircle, Users, Shield, RefreshCw, Activity } from '../lib/icons';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { toast } from '../lib/toast';
import { useAppState } from '../hooks/useAppState';

interface User {
  id: string;
  role: 'Passager' | 'Conducteur' | 'Administrateur';
  name: string;
  phone: string;
  email: string;
  password: string;
  balance?: number;
  accountType?: string;
  vehicleCategory?: string;
  vehiclePlate?: string;
  vehicleModel?: string;
  status?: string;
  rating?: number;
  totalTrips?: number;
  createdAt: string;
  lastLoginAt?: string;
}

interface UsersManagementScreenProps {
  onBack: () => void;
}

export function UsersManagementScreen({ onBack }: UsersManagementScreenProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'Passager' | 'Conducteur' | 'Administrateur'>('all');
  const [showPasswords, setShowPasswords] = useState<{ [key: string]: boolean }>({});
  const [stats, setStats] = useState({ passengers: 0, drivers: 0, admins: 0 });
  const { setCurrentScreen } = useAppState();

  // Charger tous les utilisateurs
  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/admin/users/all`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      const data = await response.json();
      console.log('📥 Utilisateurs chargés:', data);
      console.log('📊 Détails:', {
        success: data.success,
        total: data.total,
        stats: data.stats,
        usersCount: data.users?.length,
        firstUser: data.users?.[0]
      });

      if (data.success) {
        setUsers(data.users);
        setFilteredUsers(data.users);
        setStats(data.stats);
        toast.success(`${data.total} utilisateurs chargés`);
      } else {
        console.error('❌ Erreur:', data.error);
        toast.error(data.error || 'Erreur lors du chargement');
      }
    } catch (error) {
      console.error('❌ Erreur chargement utilisateurs:', error);
      toast.error('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // Filtrer les utilisateurs
  useEffect(() => {
    let filtered = users;

    // Filtrer par rôle
    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    // Filtrer par recherche
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(user =>
        user.name?.toLowerCase().includes(query) ||
        user.phone?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query) ||
        user.id?.toLowerCase().includes(query)
      );
    }

    setFilteredUsers(filtered);
  }, [users, searchQuery, roleFilter]);

  // Copier dans le presse-papier
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copié !`);
  };

  // Exporter en CSV
  const exportToCSV = () => {
    const headers = ['Rôle', 'Nom', 'Téléphone', 'Email', 'Mot de passe', 'Solde', 'Type de compte', 'Véhicule', 'Statut', 'Date création'];
    
    const rows = filteredUsers.map(user => [
      user.role,
      user.name,
      user.phone,
      user.email,
      user.password,
      user.balance || '',
      user.accountType || '',
      user.vehicleCategory || '',
      user.status || '',
      new Date(user.createdAt).toLocaleDateString('fr-FR')
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `smartcabb_users_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    toast.success('Fichier CSV téléchargé !');
  };

  // Toggle affichage mot de passe
  const togglePasswordVisibility = (userId: string) => {
    setShowPasswords(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  // Supprimer tous les passagers
  const deleteAllPassengers = async () => {
    const confirmation = window.confirm(
      `⚠️ ATTENTION : Vous êtes sur le point de supprimer TOUS les comptes passagers.\n\n` +
      `Cette action supprimera :\n` +
      `- ${stats.passengers} passagers de Supabase Auth\n` +
      `- Toutes leurs données du KV Store\n` +
      `- Toutes leurs courses associées\n\n` +
      `Cette action est IRRÉVERSIBLE.\n\n` +
      `Êtes-vous absolument sûr de vouloir continuer ?`
    );

    if (!confirmation) {
      return;
    }

    // Double confirmation
    const doubleConfirm = window.confirm(
      `⚠️ DERNIÈRE CONFIRMATION\n\n` +
      `Vous allez supprimer ${stats.passengers} passagers.\n` +
      `Cliquez sur OK pour confirmer.`
    );

    if (!doubleConfirm) {
      return;
    }

    try {
      toast.info('🗑️ Suppression en cours...', { duration: 5000 });
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/admin/passengers/delete-all`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
        }
      );

      const data = await response.json();
      console.log('📥 Résultat suppression:', data);

      if (data.success) {
        // Afficher les erreurs détaillées dans la console
        if (data.errors && data.errors.length > 0) {
          console.error('⚠️ Erreurs détaillées:', data.errors);
          data.errors.forEach((err: any, idx: number) => {
            console.error(`  ${idx + 1}. ${err.name} (${err.id}): ${err.error}`);
          });
        }

        // Afficher le résumé
        const successMessage = 
          `✅ Suppression terminée :\n` +
          `• ${data.deleted.fromAuth} passagers supprimés de Supabase Auth\n` +
          `• ${data.deleted.fromKV} entrées KV supprimées\n` +
          `• ${data.deleted.rides} courses supprimées`;
        
        const errorMessage = data.errors.length > 0 
          ? `\n\n⚠️ ${data.errors.length} erreurs (voir console pour détails)`
          : '';
        
        if (data.errors.length > 0) {
          toast.error(successMessage + errorMessage, { duration: 10000 });
        } else {
          toast.success(successMessage, { duration: 8000 });
        }
        
        // Recharger la liste
        setTimeout(() => {
          loadUsers();
        }, 1000);
      } else {
        console.error('❌ Erreur:', data.error);
        toast.error(data.error || 'Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('❌ Erreur suppression passagers:', error);
      toast.error('Erreur de connexion au serveur');
    }
  };

  // Badge de rôle avec couleur
  const getRoleBadge = (role: string) => {
    const styles = {
      'Passager': 'bg-blue-100 text-blue-700 border-blue-300',
      'Conducteur': 'bg-green-100 text-green-700 border-green-300',
      'Administrateur': 'bg-purple-100 text-purple-700 border-purple-300'
    };
    
    return (
      <span className={`px-3 py-1 rounded-full text-xs border ${styles[role] || 'bg-gray-100 text-gray-700'}`}>
        {role}
      </span>
    );
  };

  // Badge de statut
  const getStatusBadge = (status: string) => {
    const styles = {
      'active': 'bg-green-100 text-green-700',
      'available': 'bg-green-100 text-green-700',
      'busy': 'bg-yellow-100 text-yellow-700',
      'offline': 'bg-gray-100 text-gray-700'
    };
    
    return (
      <span className={`px-2 py-1 rounded text-xs ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Chargement des utilisateurs...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl mb-2 text-gray-800">👥 Gestion des utilisateurs</h1>
              <p className="text-gray-600">Visualisez tous les comptes SmartCabb avec leurs identifiants</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setCurrentScreen('admin-users-diagnostic')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Activity className="w-4 h-4" />
                Diagnostic & Nettoyage
              </button>
              {stats.passengers > 0 && (
                <button
                  onClick={deleteAllPassengers}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                  title="Supprimer tous les passagers (IRRÉVERSIBLE)"
                >
                  <Users className="w-4 h-4" />
                  🗑️ Supprimer tous les passagers ({stats.passengers})
                </button>
              )}
              <button
                onClick={loadUsers}
                className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors flex items-center gap-2"
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

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-indigo-100 text-sm">Total utilisateurs</p>
                  <p className="text-2xl mt-1">{users.length}</p>
                </div>
                <Users className="w-8 h-8 opacity-80" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">Passagers</p>
                  <p className="text-2xl mt-1">{stats.passengers}</p>
                </div>
                <UserCircle className="w-8 h-8 opacity-80" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">Conducteurs</p>
                  <p className="text-2xl mt-1">{stats.drivers}</p>
                </div>
                <UserCircle className="w-8 h-8 opacity-80" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">Administrateurs</p>
                  <p className="text-2xl mt-1">{stats.admins}</p>
                </div>
                <Shield className="w-8 h-8 opacity-80" />
              </div>
            </div>
          </div>

          {/* Filtres et recherche */}
          <div className="flex flex-col md:flex-row gap-4">
            {/* Recherche */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher par nom, téléphone, email ou ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Filtre par rôle */}
            <div className="flex gap-2">
              <button
                onClick={() => setRoleFilter('all')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  roleFilter === 'all'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Tous ({users.length})
              </button>
              <button
                onClick={() => setRoleFilter('Passager')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  roleFilter === 'Passager'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Passagers ({stats.passengers})
              </button>
              <button
                onClick={() => setRoleFilter('Conducteur')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  roleFilter === 'Conducteur'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Conducteurs ({stats.drivers})
              </button>
              <button
                onClick={() => setRoleFilter('Administrateur')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  roleFilter === 'Administrateur'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Admins ({stats.admins})
              </button>
            </div>

            {/* Export CSV */}
            <button
              onClick={exportToCSV}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Exporter CSV
            </button>
          </div>
        </div>

        {/* Tableau des utilisateurs */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">Rôle</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">Nom</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">Téléphone</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">Email</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">Mot de passe</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">Solde</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">Infos supplémentaires</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">Date création</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                      <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                      Aucun utilisateur trouvé
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                      {/* Rôle */}
                      <td className="px-4 py-3">
                        {getRoleBadge(user.role)}
                      </td>

                      {/* Nom */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-900">{user.name}</span>
                          <button
                            onClick={() => copyToClipboard(user.name, 'Nom')}
                            className="p-1 hover:bg-gray-100 rounded transition-colors"
                            title="Copier le nom"
                          >
                            <Copy className="w-3 h-3 text-gray-400" />
                          </button>
                        </div>
                      </td>

                      {/* Téléphone */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-700">{user.phone}</span>
                          <button
                            onClick={() => copyToClipboard(user.phone, 'Téléphone')}
                            className="p-1 hover:bg-gray-100 rounded transition-colors"
                            title="Copier le téléphone"
                          >
                            <Copy className="w-3 h-3 text-gray-400" />
                          </button>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-700 text-sm">{user.email}</span>
                          <button
                            onClick={() => copyToClipboard(user.email, 'Email')}
                            className="p-1 hover:bg-gray-100 rounded transition-colors"
                            title="Copier l'email"
                          >
                            <Copy className="w-3 h-3 text-gray-400" />
                          </button>
                        </div>
                      </td>

                      {/* Mot de passe */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                            {showPasswords[user.id] ? user.password : '••••••••'}
                          </code>
                          <button
                            onClick={() => togglePasswordVisibility(user.id)}
                            className="p-1 hover:bg-gray-100 rounded transition-colors"
                            title={showPasswords[user.id] ? 'Masquer' : 'Afficher'}
                          >
                            {showPasswords[user.id] ? (
                              <EyeOff className="w-4 h-4 text-gray-400" />
                            ) : (
                              <Eye className="w-4 h-4 text-gray-400" />
                            )}
                          </button>
                          <button
                            onClick={() => copyToClipboard(user.password, 'Mot de passe')}
                            className="p-1 hover:bg-gray-100 rounded transition-colors"
                            title="Copier le mot de passe"
                          >
                            <Copy className="w-3 h-3 text-gray-400" />
                          </button>
                        </div>
                      </td>

                      {/* Solde */}
                      <td className="px-4 py-3">
                        {user.balance !== undefined && (
                          <span className="text-gray-900">
                            {user.balance.toLocaleString('fr-FR')} CDF
                          </span>
                        )}
                      </td>

                      {/* Infos supplémentaires */}
                      <td className="px-4 py-3">
                        <div className="text-sm space-y-1">
                          {user.accountType && (
                            <div className="text-gray-600">
                              Type: <span className="text-gray-900">{user.accountType === 'prepaid' ? 'Prépayé' : 'Postpayé'}</span>
                            </div>
                          )}
                          {user.vehicleCategory && (
                            <div className="text-gray-600">
                              Véhicule: <span className="text-gray-900">{user.vehicleCategory}</span>
                            </div>
                          )}
                          {user.vehiclePlate && (
                            <div className="text-gray-600">
                              Plaque: <span className="text-gray-900">{user.vehiclePlate}</span>
                            </div>
                          )}
                          {user.rating !== undefined && (
                            <div className="text-gray-600">
                              Note: <span className="text-gray-900">⭐ {(user.rating || 0).toFixed(1)}</span>
                            </div>
                          )}
                          {user.totalTrips !== undefined && (
                            <div className="text-gray-600">
                              Courses: <span className="text-gray-900">{user.totalTrips}</span>
                            </div>
                          )}
                          {user.status && (
                            <div>
                              {getStatusBadge(user.status)}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Date création */}
                      <td className="px-4 py-3 text-gray-600 text-sm">
                        {new Date(user.createdAt).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer avec résultat de la recherche */}
          {filteredUsers.length > 0 && (
            <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                Affichage de {filteredUsers.length} utilisateur{filteredUsers.length > 1 ? 's' : ''} sur {users.length}
              </p>
            </div>
          )}
        </div>

        {/* Message de sécurité */}
        <div className="mt-6 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
          <div className="flex">
            <div className="flex-shrink-0">
              <Shield className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <strong>⚠️ Attention :</strong> Ces données contiennent des mots de passe en clair. 
                Assurez-vous de ne pas partager ces informations et de les utiliser uniquement pour le support technique.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
