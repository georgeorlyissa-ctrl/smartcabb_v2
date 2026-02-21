import { useState, useEffect } from 'react';
import { motion } from '../../lib/motion';
import { useAppState } from '../../hooks/useAppState';
import { useSupabaseData } from '../../hooks/useSupabaseData';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { 
  Users, 
  Search, 
  ArrowLeft, 
  Mail, 
  Phone, 
  Calendar, 
  MapPin, 
  TrendingUp,
  Clock,
  DollarSign,
  User,
  Car,
  RefreshCw,
  Download,
  Filter,
  CreditCard,
  Smartphone,
  Wallet,
  Star,
  Eye
} from '../../lib/admin-icons';
import type { Profile } from '../../lib/supabase';
import { User as UserType } from '../../types';
import { toast } from '../../lib/toast';
import { syncAllUsersFromSupabase, listenToProfileChanges } from '../../lib/sync-service';
import { formatCDF } from '../../utils/formatters';
import { PassengerDetailModal } from './PassengerDetailModal';

interface ClientsListScreenProps {
  onBack?: () => void;
}

export function ClientsListScreen({ onBack }: ClientsListScreenProps) {
  const { setCurrentScreen } = useAppState();
  const { getPassengers, rides, loading, refresh } = useSupabaseData();
  const passengers = getPassengers();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'rides' | 'date'>('name');
  const [selectedPassenger, setSelectedPassenger] = useState<Profile | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Filter and sort passengers
  const filteredPassengers = passengers
    .filter(passenger => 
      (passenger.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (passenger.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (passenger.phone || '').includes(searchTerm)
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.full_name || '').localeCompare(b.full_name || '');
        case 'rides':
          const aRides = rides.filter(r => r.passenger_id === a.id).length;
          const bRides = rides.filter(r => r.passenger_id === b.id).length;
          return bRides - aRides;
        case 'date':
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        default:
          return 0;
      }
    });

  const getPaymentMethodIcon = (method?: string) => {
    switch (method) {
      case 'mobile_money':
        return <Smartphone className="w-4 h-4 text-green-600" />;
      case 'card':
        return <CreditCard className="w-4 h-4 text-blue-600" />;
      case 'cash':
        return <DollarSign className="w-4 h-4 text-orange-600" />;
      default:
        return <CreditCard className="w-4 h-4 text-gray-600" />;
    }
  };

  const getPaymentMethodLabel = (method?: string) => {
    switch (method) {
      case 'mobile_money':
        return 'Mobile Money';
      case 'card':
        return 'Carte';
      case 'cash':
        return 'Espèces';
      default:
        return 'Non défini';
    }
  };

  const getTotalSpent = (passengerId: string) => {
    return rides
      .filter(ride => ride.passenger_id === passengerId && ride.status === 'completed')
      .reduce((total, ride) => total + (ride.total_amount || 0), 0);
  };

  const getAverageRating = (passengerId: string) => {
    const passengerRides = rides.filter(
      ride => ride.passenger_id === passengerId && ride.rating
    );
    if (passengerRides.length === 0) return 0;
    return passengerRides.reduce((sum, ride) => sum + (ride.rating || 0), 0) / passengerRides.length;
  };

  const getPassengerRidesCount = (passengerId: string) => {
    return rides.filter(r => r.passenger_id === passengerId).length;
  };

  const exportClientsData = () => {
    const csvData = [
      ['Nom', 'Email', 'Téléphone', 'Adresse', 'Date inscription', 'Courses totales', 'Montant total (CDF)'],
      ...filteredPassengers.map(passenger => [
        passenger.full_name || '',
        passenger.email || '',
        passenger.phone || '',
        passenger.address || 'Non renseignée',
        passenger.created_at ? new Date(passenger.created_at).toLocaleDateString('fr-FR') : 'N/A',
        getPassengerRidesCount(passenger.id).toString(),
        getTotalSpent(passenger.id).toLocaleString()
      ])
    ];

    // Format CSV compatible Excel (séparateur point-virgule pour format européen)
    const csvContent = '\uFEFF' + csvData.map(row => row.join(';')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `smartcabb-clients-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exportation de ${filteredPassengers.length} client(s) terminée !`);
  };

  useEffect(() => {
    // Synchroniser les utilisateurs depuis Supabase au démarrage
    syncAllUsersFromSupabase();
    
    // Écouter les changements de profil en temps réel
    const channel = listenToProfileChanges((payload) => {
      console.log('🔔 [ADMIN] Changement de profil détecté:', payload);
      // Rafraîchir les données
      refresh();
      // Resynchroniser localStorage
      syncAllUsersFromSupabase();
    });
    
    // Nettoyer l'écoute au démontage du composant
    return () => {
      channel?.unsubscribe();
    };
  }, []);

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
                onClick={() => onBack ? onBack() : setCurrentScreen('admin-dashboard')}
                className="p-2"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl">Gestion des clients</h1>
                <p className="text-sm text-gray-600">{filteredPassengers.length} client(s)</p>
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
                onClick={exportClientsData}
                variant="outline"
                className="text-green-600 border-green-200 hover:bg-green-50"
              >
                <Download className="w-4 h-4 mr-2" />
                Exporter CSV
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
              <div className="flex items-center space-x-4">
                <div className="relative flex-1 lg:w-80">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Rechercher par nom, email ou téléphone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <Filter className="w-4 h-4 text-gray-500" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'name' | 'rides' | 'date')}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="name">Trier par nom</option>
                  <option value="rides">Trier par nombre de courses</option>
                  <option value="date">Trier par date d'inscription</option>
                </select>
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
                <User className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total clients</p>
                <p className="text-2xl font-bold">{passengers.length}</p>
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
                  {rides.filter(r => passengers.some(p => p.id === r.passenger_id)).length}
                </p>
              </div>
            </div>
          </Card>
          
          <Card className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Clients actifs ce mois</p>
                <p className="text-2xl font-bold">
                  {passengers.filter(p => {
                    const passengerRides = rides.filter(r => r.passenger_id === p.id);
                    return passengerRides.some(r => {
                      const rideDate = new Date(r.created_at);
                      const now = new Date();
                      return rideDate.getMonth() === now.getMonth() && rideDate.getFullYear() === now.getFullYear();
                    });
                  }).length}
                </p>
              </div>
            </div>
          </Card>
          
          <Card className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <Calendar className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Nouveaux ce mois</p>
                <p className="text-2xl font-bold">
                  {passengers.filter(p => {
                    const regDate = new Date(p.created_at || 0);
                    const now = new Date();
                    return regDate.getMonth() === now.getMonth() && regDate.getFullYear() === now.getFullYear();
                  }).length}
                </p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Liste des clients */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          {filteredPassengers.map((passenger, index) => {
            const totalSpent = getTotalSpent(passenger.id);
            const avgRating = getAverageRating(passenger.id);
            
            // Récupérer le solde du portefeuille depuis localStorage
            const allUsersStr = localStorage.getItem('smartcab_all_users') || '[]';
            const allUsers: UserType[] = JSON.parse(allUsersStr);
            const userWithWallet = allUsers.find((u: UserType) => u.id === passenger.id);
            const walletBalance = userWithWallet?.walletBalance || 0;
            
            return (
              <motion.div
                key={passenger.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="w-8 h-8 text-blue-600" />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold">{passenger.full_name}</h3>
                          <Badge variant="secondary" className="text-xs">
                            Client #{passenger.id.slice(-4)}
                          </Badge>
                          {passenger.is_blocked && (
                            <Badge variant="destructive" className="text-xs">
                              Bloqué
                            </Badge>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          <div className="flex items-center space-x-2">
                            <Mail className="w-4 h-4 text-gray-500" />
                            <span>{passenger.email}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Phone className="w-4 h-4 text-gray-500" />
                            <span>{passenger.phone || 'Non renseigné'}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <MapPin className="w-4 h-4 text-gray-500" />
                            <span>{passenger.address || 'Non renseignée'}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Calendar className="w-4 h-4 text-gray-500" />
                            <span>
                              Inscrit le {passenger.created_at 
                                ? new Date(passenger.created_at).toLocaleDateString('fr-FR')
                                : 'N/A'
                              }
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Statistiques du client */}
                    <div className="text-right space-y-2">
                      <div className="flex items-center justify-end space-x-2">
                        <Car className="w-4 h-4 text-blue-500" />
                        <span className="text-sm font-medium">{getPassengerRidesCount(passenger.id)} courses</span>
                      </div>
                      <div className="flex items-center justify-end space-x-2">
                        <CreditCard className="w-4 h-4 text-green-500" />
                        <span className="text-sm font-medium text-green-600">
                          {formatCDF(totalSpent)}
                        </span>
                      </div>
                      <div className="flex items-center justify-end space-x-2">
                        <Wallet className="w-4 h-4 text-purple-500" />
                        <span className="text-sm font-medium text-purple-600">
                          {formatCDF(walletBalance)}
                        </span>
                      </div>
                      {avgRating > 0 && (
                        <div className="flex items-center justify-end space-x-1">
                          <Star className="w-4 h-4 text-yellow-500 fill-current" />
                          <span className="text-sm">{avgRating.toFixed(1)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-end">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setSelectedPassenger(passenger);
                          setShowDetailModal(true);
                        }}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Voir détails
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>

        {filteredPassengers.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg mb-2">Aucun client trouvé</h3>
            <p className="text-gray-600">
              {searchTerm ? 'Aucun client ne correspond à votre recherche' : 'Aucun client enregistré'}
            </p>
          </motion.div>
        )}
      </div>

      {/* Modal de détails du passager */}
      <PassengerDetailModal
        open={showDetailModal}
        onOpenChange={setShowDetailModal}
        passenger={selectedPassenger}
        rides={rides}
        onUpdate={() => {
          refresh();
          setShowDetailModal(false);
        }}
      />
    </div>
  );
}