import { useState, useEffect } from 'react';
import { motion } from '../../lib/motion';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { useAppState } from '../../hooks/useAppState';
import { useSupabaseData, type EnrichedDriver } from '../../hooks/useSupabaseData';
import { DriverDetailModal } from './DriverDetailModal';
import { 
  ArrowLeft, 
  Search, 
  Users, 
  Star,
  Car,
  Phone,
  Mail,
  CheckCircle,
  XCircle,
  Filter,
  FileText,
  Eye,
  RefreshCw,
  Download
} from '../../lib/admin-icons';
import { toast } from '../../lib/toast';
import type { Vehicle } from '../../lib/supabase';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

interface DriversListScreenProps {
  onBack?: () => void;
}

export function DriversListScreen({ onBack }: DriversListScreenProps) {
  const { setCurrentScreen } = useAppState();
  const { drivers, rides, loading, refresh, vehicleService } = useSupabaseData();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'online' | 'offline' | 'pending'>('all');
  const [selectedDriver, setSelectedDriver] = useState<EnrichedDriver | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const handleBackClick = () => {
    // ✅ Fix: Utiliser onBack() si disponible, sinon fallback vers setCurrentScreen
    if (onBack) {
      onBack();
    } else {
      setCurrentScreen('dashboard');
    }
  };

  const filteredDrivers = (drivers || []).filter(driver => {
    const matchesSearch = (driver.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (driver.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || 
                         (filterStatus === 'online' && driver.is_available) ||
                         (filterStatus === 'offline' && !driver.is_available) ||
                         (filterStatus === 'pending' && driver.status === 'pending');
    return matchesSearch && matchesFilter;
  });

  const handleOpenDriverDetails = async (driver: EnrichedDriver) => {
    setSelectedDriver(driver);
    
    // ✅ FIX : Le véhicule est déjà dans driver.vehicle du KV store
    // Pas besoin de faire un appel séparé
    const vehicle = driver.vehicle || null;
    setSelectedVehicle(vehicle);
    
    setShowDetailModal(true);
  };

  const exportDriversData = () => {
    const csvData = [
      ['Nom', 'Email', 'Téléphone', 'Véhicule', 'Immatriculation', 'Statut', 'Note', 'Courses totales', 'Gains totaux (CDF)', 'Date inscription'],
      ...filteredDrivers.map(driver => [
        driver.full_name || '',
        driver.email || '',
        driver.phone || '',
        `${driver.vehicle_color} ${driver.vehicle_make} ${driver.vehicle_model}`,
        driver.vehicle_plate || '',
        driver.status === 'approved' ? 'Approuvé' : driver.status === 'pending' ? 'En attente' : 'Rejeté',
        (driver.rating || 0).toFixed(1),
        driver.total_rides.toString(),
        (driver.total_earnings || 0).toFixed(0),
        driver.created_at ? new Date(driver.created_at).toLocaleDateString('fr-FR') : 'N/A'
      ])
    ];

    // Format CSV compatible Excel (séparateur point-virgule pour format européen)
    const csvContent = '\uFEFF' + csvData.map(row => row.join(';')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `smartcabb-conducteurs-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exportation de ${filteredDrivers.length} conducteur(s) terminée !`);
  };

  const cleanInvalidDrivers = async () => {
    if (!confirm('⚠️ Voulez-vous vraiment supprimer tous les conducteurs invalides (sans nom, sans email, ou données incomplètes) ?\n\nCette action est irréversible.')) {
      return;
    }

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/cleanup/invalid-drivers`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Nettoyage réussi:', data);
        
        // Le serveur renvoie data.data au lieu de data.details
        const deletedCount = data.data?.drivers || data.details?.drivers || 0;
        toast.success(`${deletedCount} conducteur(s) invalide(s) supprimé(s) avec succès !`);
        
        // Rafraîchir la liste
        await refresh();
      } else {
        const errorData = await response.json();
        console.error('❌ Erreur nettoyage:', errorData);
        toast.error(errorData.message || 'Erreur lors du nettoyage');
      }
    } catch (error) {
      console.error('❌ Erreur nettoyage:', error);
      toast.error('Erreur lors du nettoyage des conducteurs invalides');
    }
  };

  const debugDrivers = async () => {
    try {
      console.log('🔍 ========== DIAGNOSTIC COMPLET ==========');
      console.log('📊 Nombre de conducteurs affichés dans le frontend:', (drivers || []).length);
      console.log('📋 Liste des conducteurs dans le state:', drivers);
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/cleanup/debug-drivers`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log('🔍 DEBUG - Réponse complète du backend:', data);
        console.log('📊 KV Store:', data.kv);
        console.log('📊 Postgres:', data.postgres);
        
        // Comparaison détaillée
        console.log('⚖️ COMPARAISON DÉTAILLÉE:');
        console.log('  - Frontend affiche:', (drivers || []).length, 'conducteurs');
        console.log('  - KV Store contient:', data.kv?.total || 0, 'conducteurs');
        console.log('  - Postgres drivers table:', data.postgres?.drivers?.total || 0, 'conducteurs');
        console.log('  - Postgres profiles (role=driver):', data.postgres?.profiles?.total || 0, 'profils');
        
        if ((drivers || []).length > (data.kv?.total || 0)) {
          console.warn('🚨 PROBLÈME DÉTECTÉ: Le frontend affiche PLUS de conducteurs que le KV store !');
          console.warn('   Les conducteurs affichés viennent probablement de Supabase Postgres.');
          console.warn('   👉 Postgres drivers:', data.postgres?.drivers?.total || 0);
          console.warn('   👉 Postgres profiles (driver):', data.postgres?.profiles?.total || 0);
          console.warn('   👉 Il faut supprimer ces données de Postgres !');
        }
        
        toast.success(`KV: ${data.kv?.total || 0} | Postgres drivers: ${data.postgres?.drivers?.total || 0} | Postgres profiles: ${data.postgres?.profiles?.total || 0} | Frontend: ${(drivers || []).length} - Consultez F12`);
      } else {
        const errorData = await response.json();
        console.error('❌ Erreur debug:', errorData);
        toast.error('Erreur lors du diagnostic');
      }
    } catch (error) {
      console.error('❌ Erreur debug:', error);
      toast.error('Erreur lors du diagnostic des conducteurs');
    }
  };

  const deleteAllDrivers = async () => {
    // PREMIÈRE CONFIRMATION
    if (!confirm('💥 ATTENTION : Voulez-vous vraiment supprimer TOUS LES CONDUCTEURS sans exception ?\n\n⚠️ Cette action supprimera :\n- Tous les conducteurs (même ceux avec des données valides)\n- Tous leurs véhicules\n- Tous leurs profils\n- Tous leurs comptes utilisateurs\n\n❌ CETTE ACTION EST IRRÉVERSIBLE !\n\nCliquez OK pour continuer ou Annuler pour arrêter.')) {
      return;
    }

    // DEUXIÈME CONFIRMATION
    if (!confirm('🔴 DERNIÈRE CHANCE !\n\nÊtes-vous ABSOLUMENT SÛR de vouloir supprimer TOUS les conducteurs ?\n\nTapez "OUI" dans votre tête et cliquez OK uniquement si vous êtes certain.')) {
      return;
    }

    try {
      toast.success('💥 Suppression en cours... Cela peut prendre quelques secondes...');

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/cleanup/delete-all-drivers`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Suppression nucléaire réussie:', data);
        
        const deletedCount = data.data?.drivers || 0;
        toast.success(`💥 ${deletedCount} conducteur(s) supprimé(s) avec succès ! Base de données nettoyée.`);
        
        // Rafraîchir la liste
        await refresh();
      } else {
        const errorData = await response.json();
        console.error('❌ Erreur suppression:', errorData);
        toast.error(errorData.message || 'Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('❌ Erreur suppression:', error);
      toast.error('Erreur lors de la suppression de tous les conducteurs');
    }
  };

  const fixDriverStatuses = async () => {
    try {
      toast.success('🔧 Correction des statuts en cours...');

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/cleanup/fix-driver-statuses`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Correction statuts réussie:', data);
        
        const fixedCount = data.data?.fixed || 0;
        toast.success(`✅ ${fixedCount} conducteur(s) corrigé(s) ! Tous les statuts sont maintenant "En attente".`);
        
        // Rafraîchir la liste
        await refresh();
      } else {
        const errorData = await response.json();
        console.error('❌ Erreur correction statuts:', errorData);
        toast.error(errorData.message || 'Erreur lors de la correction');
      }
    } catch (error) {
      console.error('❌ Erreur correction statuts:', error);
      toast.error('Erreur lors de la correction des statuts');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackClick}
                className="p-2"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl">Conducteurs</h1>
                <p className="text-sm text-gray-600">{filteredDrivers.length} conducteur(s)</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                onClick={refresh}
                variant="outline"
                className="text-blue-600 border-blue-200 hover:bg-blue-50"
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Actualiser
              </Button>
              <Button
                onClick={exportDriversData}
                variant="outline"
                className="text-green-600 border-green-200 hover:bg-green-50"
              >
                <Download className="w-4 h-4 mr-2" />
                Exporter CSV
              </Button>
              <Button
                onClick={debugDrivers}
                variant="outline"
                className="text-purple-600 border-purple-200 hover:bg-purple-50"
              >
                <Eye className="w-4 h-4 mr-2" />
                Debug
              </Button>
              <Button
                onClick={cleanInvalidDrivers}
                variant="outline"
                className="text-orange-600 border-orange-200 hover:bg-orange-50"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Nettoyer invalides
              </Button>
              <Button
                onClick={deleteAllDrivers}
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                <XCircle className="w-4 h-4 mr-2" />
                💥 SUPPRIMER TOUS
              </Button>
              <Button
                onClick={fixDriverStatuses}
                variant="outline"
                className="text-gray-600 border-gray-200 hover:bg-gray-50"
              >
                <Filter className="w-4 h-4 mr-2" />
                Fixer statuts
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Filtres et recherche */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Card className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
              <div className="relative flex-1 lg:w-80">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Rechercher par nom ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  onClick={() => setFilterStatus('all')}
                  variant={filterStatus === 'all' ? 'default' : 'outline'}
                  size="sm"
                >
                  Tous
                </Button>
                <Button
                  onClick={() => setFilterStatus('online')}
                  variant={filterStatus === 'online' ? 'default' : 'outline'}
                  size="sm"
                >
                  En ligne
                </Button>
                <Button
                  onClick={() => setFilterStatus('offline')}
                  variant={filterStatus === 'offline' ? 'default' : 'outline'}
                  size="sm"
                >
                  Hors ligne
                </Button>
                <Button
                  onClick={() => setFilterStatus('pending')}
                  variant={filterStatus === 'pending' ? 'default' : 'outline'}
                  size="sm"
                >
                  En attente
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Statistiques rapides */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"
        >
          <Card className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total conducteurs</p>
                <p className="text-2xl font-bold">{(drivers || []).length}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <Car className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Courses totales</p>
                <p className="text-2xl font-bold">
                  {(drivers || []).reduce((total, driver) => total + (driver.total_rides || 0), 0)}
                </p>
              </div>
            </div>
          </Card>
          
          <Card className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Conducteurs actifs</p>
                <p className="text-2xl font-bold">
                  {(drivers || []).filter(d => d.is_available).length}
                </p>
              </div>
            </div>
          </Card>
          
          <Card className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <Star className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Note moyenne</p>
                <p className="text-2xl font-bold">
                  {(drivers || []).length > 0 
                    ? ((drivers || []).reduce((sum, d) => sum + (d.rating || 0), 0) / (drivers || []).length).toFixed(1)
                    : '0.0'
                  }
                </p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Liste des conducteurs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-500">Chargement des conducteurs...</p>
            </div>
          ) : filteredDrivers.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg mb-2">Aucun conducteur trouvé</h3>
              <p className="text-gray-600">
                {searchTerm ? 'Aucun conducteur ne correspond à votre recherche' : 'Aucun conducteur enregistré'}
              </p>
            </div>
          ) : (
            filteredDrivers.map((driver, index) => (
              <motion.div
                key={driver.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                        <Car className="w-8 h-8 text-blue-600" />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold">{driver.full_name || 'Conducteur inconnu'}</h3>
                          {driver.status === 'approved' ? (
                            <Badge className="bg-green-100 text-green-800 text-xs">
                              ✓ Approuvé
                            </Badge>
                          ) : driver.status === 'pending' ? (
                            <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                              ⏳ En attente
                            </Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-800 text-xs">
                              ✕ {driver.status || 'Statut inconnu'} {/* 🔍 DEBUG : Afficher le vrai statut */}
                            </Badge>
                          )}
                          {driver.is_available && (
                            <Badge className="bg-blue-100 text-blue-800 text-xs">
                              En ligne
                            </Badge>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          <div className="flex items-center space-x-2">
                            <Mail className="w-4 h-4 text-gray-500" />
                            <span>{driver.email || 'Non renseigné'}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Phone className="w-4 h-4 text-gray-500" />
                            <span>{driver.phone || 'Non renseigné'}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Car className="w-4 h-4 text-gray-500" />
                            <span>
                              {driver.vehicle_color} {driver.vehicle_make} {driver.vehicle_model} 
                              {driver.vehicle_plate && ` (${driver.vehicle_plate})`}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <FileText className="w-4 h-4 text-gray-500" />
                            <span>
                              Inscrit le {driver.created_at 
                                ? new Date(driver.created_at).toLocaleDateString('fr-FR')
                                : 'N/A'
                              }
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Statistiques du conducteur */}
                    <div className="text-right space-y-2">
                      <div className="flex items-center justify-end space-x-2">
                        <Car className="w-4 h-4 text-blue-500" />
                        <span className="text-sm font-medium">{driver.total_rides || 0} courses</span>
                      </div>
                      <div className="flex items-center justify-end space-x-2">
                        <Star className="w-4 h-4 text-yellow-500 fill-current" />
                        <span className="text-sm font-medium">{(driver.rating || 0).toFixed(1)}</span>
                      </div>
                      <div className="flex items-center justify-end space-x-2">
                        <span className="text-sm font-medium text-green-600">
                          {(driver.total_earnings || 0).toLocaleString()} CDF
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-end">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleOpenDriverDetails(driver)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Voir détails
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))
          )}
        </motion.div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedDriver && (
        <DriverDetailModal
          driver={selectedDriver}
          vehicle={selectedVehicle}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedDriver(null);
            setSelectedVehicle(null);
          }}
          onRefresh={refresh}
        />
      )}
    </div>
  );
}
