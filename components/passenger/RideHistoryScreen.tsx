import { useState, useEffect } from 'react';
import { motion } from '../../lib/motion'; // ✅ FIX: Utiliser l'implémentation locale
import { 
  ArrowLeft, 
  MapPin, 
  Calendar, 
  Clock, 
  Star, 
  Smartphone, 
  CreditCard, 
  Banknote,
  Navigation,
  Loader2
} from '../../lib/icons';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { useAppState } from '../../hooks/useAppState';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { toast } from '../../lib/toast';

export function RideHistoryScreen() {
  const { setCurrentScreen, state } = useAppState();
  const [rides, setRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 🆕 CHARGER L'HISTORIQUE DEPUIS LE BACKEND
  useEffect(() => {
    const fetchRideHistory = async () => {
      if (!state.currentUser?.id) {
        console.warn('⚠️ Pas d\'utilisateur connecté');
        setLoading(false);
        return;
      }

      try {
        console.log('🔍 Chargement de l\'historique pour:', state.currentUser.id);
        
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/rides/history/${state.currentUser.id}`,
          {
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (!response.ok) {
          throw new Error(`Erreur HTTP: ${response.status}`);
        }

        const data = await response.json();
        console.log('✅ Historique reçu:', data);
        
        if (data.success && data.rides) {
          // Trier par date décroissante
          const sortedRides = data.rides.sort((a: any, b: any) => 
            new Date(b.created_at || b.createdAt).getTime() - new Date(a.created_at || a.createdAt).getTime()
          );
          setRides(sortedRides);
        }
      } catch (error) {
        console.error('❌ Erreur chargement historique:', error);
        toast.error('Impossible de charger l\'historique');
      } finally {
        setLoading(false);
      }
    };

    fetchRideHistory();
  }, [state.currentUser?.id]);

  const getPaymentIcon = (method?: string) => {
    switch (method) {
      case 'mobile_money':
        return <Smartphone className="w-4 h-4" />;
      case 'card':
        return <CreditCard className="w-4 h-4" />;
      case 'cash':
        return <Banknote className="w-4 h-4" />;
      default:
        return <CreditCard className="w-4 h-4" />;
    }
  };

  const getPaymentLabel = (method?: string) => {
    switch (method) {
      case 'mobile_money':
        return 'Mobile Money';
      case 'card':
        return 'Carte bancaire';
      case 'cash':
        return 'Espèces';
      default:
        return 'Non spécifié';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'cancelled':
        return 'text-red-600 bg-red-100';
      case 'in_progress':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-yellow-600 bg-yellow-100';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Terminée';
      case 'cancelled':
        return 'Annulée';
      case 'in_progress':
        return 'En cours';
      case 'pending':
        return 'En attente';
      default:
        return 'Acceptée';
    }
  };

  const getDriverName = (driverId?: string) => {
    if (!driverId) return 'Aucun chauffeur';
    // ✅ FIX: Les données du conducteur sont déjà dans ride.driverName depuis le backend
    // Pas besoin de chercher dans state.drivers qui peut être undefined
    return 'Conducteur'; // Fallback, normalement pas utilisé car ride.driverName existe
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentScreen('map')}
              className="p-2"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl">Historique des courses</h1>
              <p className="text-sm text-gray-600">{rides.length} course(s) réalisée(s)</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {loading ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
            </div>
            <h3 className="text-lg mb-2">Chargement...</h3>
            <p className="text-gray-600 mb-6">Veuillez patienter pendant que nous chargeons votre historique de courses</p>
          </motion.div>
        ) : (
          rides.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-12"
            >
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <Navigation className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg mb-2">Aucune course</h3>
              <p className="text-gray-600 mb-6">Vous n'avez pas encore effectué de course</p>
              <Button onClick={() => setCurrentScreen('map')}>
                Réserver une course
              </Button>
            </motion.div>
          ) : (
            rides.map((ride, index) => (
              <motion.div
                key={ride.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center space-x-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(ride.status)}`}>
                        {getStatusLabel(ride.status)}
                      </span>
                      <span className="text-xs text-gray-500">
                        Course #{ride.id.slice(-4)}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{(ride.actualPrice || ride.estimatedPrice).toLocaleString()} CDF</p>
                      <div className="flex items-center space-x-1 text-xs text-gray-500">
                        {getPaymentIcon(ride.paymentMethod)}
                        <span>{getPaymentLabel(ride.paymentMethod)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Itinéraire */}
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <div className="flex flex-col items-center">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <div className="w-0.5 h-8 bg-gray-300"></div>
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      </div>
                      <div className="flex-1 space-y-4">
                        <div>
                          <div className="flex items-center space-x-2 mb-1">
                            <MapPin className="w-4 h-4 text-green-600" />
                            <span className="text-sm text-gray-600">Départ</span>
                          </div>
                          <p className="text-sm font-medium">{ride.pickup.address}</p>
                        </div>
                        <div>
                          <div className="flex items-center space-x-2 mb-1">
                            <MapPin className="w-4 h-4 text-red-600" />
                            <span className="text-sm text-gray-600">Destination</span>
                          </div>
                          <p className="text-sm font-medium">{ride.destination.address}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Détails supplémentaires */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <div>
                          <p className="text-gray-600">Date</p>
                          <p className="font-medium">
                            {new Date(ride.createdAt).toLocaleDateString('fr-FR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric'
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <div>
                          <p className="text-gray-600">Heure</p>
                          <p className="font-medium">
                            {new Date(ride.createdAt).toLocaleTimeString('fr-FR', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                    </div>

                    {ride.driverId && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-600">Chauffeur</p>
                            <p className="font-medium">{ride.driverName || getDriverName(ride.driverId)}</p>
                          </div>
                          {ride.rating && (
                            <div className="flex items-center space-x-1">
                              <Star className="w-4 h-4 text-yellow-500 fill-current" />
                              <span className="text-sm font-medium">{ride.rating}/5</span>
                            </div>
                          )}
                        </div>
                        {ride.comment && (
                          <div className="mt-2">
                            <p className="text-sm text-gray-600">Commentaire</p>
                            <p className="text-sm italic">"{ride.comment}"</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </Card>
              </motion.div>
            ))
          )
        )}
      </div>
    </div>
  );
}