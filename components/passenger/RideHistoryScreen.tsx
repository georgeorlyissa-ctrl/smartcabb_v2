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
import { supabase } from '../../lib/supabase';
import { getVehicleDisplayName } from '../../lib/vehicle-helpers';
import { toast } from '../../lib/toast';

type HistoryTab = 'all' | 'immediate' | 'reservation';

const RESERVATION_STAGE: Record<string, { label: string; classes: string }> = {
  accepted: { label: '🛡️ Chauffeur confirmé', classes: 'text-green-800 bg-green-100' },
  declined: { label: '🔄 Nouveau chauffeur recherché', classes: 'text-red-700 bg-red-100' },
  proposed: { label: '⏳ Chauffeur pressenti', classes: 'text-orange-800 bg-orange-100' },
  confirmed: { label: 'Confirmée (acompte reçu)', classes: 'text-green-700 bg-green-100' },
  scheduled: { label: 'Réservée', classes: 'text-blue-700 bg-blue-100' },
  completed: { label: 'Terminée', classes: 'text-gray-700 bg-gray-200' },
  cancelled: { label: 'Annulée', classes: 'text-red-600 bg-red-100' },
};

export function RideHistoryScreen() {
  const { setCurrentScreen, state } = useAppState();
  const [rides, setRides] = useState<any[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<HistoryTab>('all');

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

    // Réservations (tous statuts : à venir + passées)
    const fetchReservations = async () => {
      if (!state.currentUser?.id) return;
      try {
        const { data, error } = await supabase
          .from('scheduled_rides')
          .select('*')
          .eq('user_id', state.currentUser.id)
          .order('scheduled_date', { ascending: false })
          .order('scheduled_time', { ascending: false })
          .limit(100);
        if (error) throw error;
        setReservations(data || []);
      } catch (error) {
        console.error('❌ Erreur chargement réservations:', error);
      }
    };
    fetchReservations();
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
      case 'wallet':
        return 'Portefeuille';
      default:
        return 'Non spécifié';
    }
  };
  const ridePaymentMethod = (ride: any) =>
    ride.paymentMethod || ride.payment_method || ride.paymentMethodUsed || undefined;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'rated':
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
      case 'rated':
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

  // Liste unifiée : immédiates + réservations, triées par date décroissante
  const immediateItems = rides.map((r: any) => ({
    ...r,
    _type: 'immediate',
    _ts: new Date(r.created_at || r.createdAt || 0).getTime(),
  }));
  const reservationItems = reservations.map((r: any) => ({
    ...r,
    _type: 'reservation',
    _ts: new Date(`${r.scheduled_date}T${r.scheduled_time || '00:00'}`).getTime(),
  }));
  const allItems = [...immediateItems, ...reservationItems].sort((a, b) => b._ts - a._ts);
  const visibleItems = tab === 'all' ? allItems : tab === 'immediate' ? immediateItems : reservationItems;

  const tabs: { value: HistoryTab; label: string; count: number }[] = [
    { value: 'all', label: 'Toutes', count: allItems.length },
    { value: 'immediate', label: 'Immédiates', count: immediateItems.length },
    { value: 'reservation', label: 'Réservations', count: reservationItems.length },
  ];

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
              <h1 className="text-lg font-bold">Historique des courses</h1>
              <p className="text-sm text-gray-600">
                {rides.length} immédiate(s) · {reservations.length} réservation(s)
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Onglets Toutes / Immédiates / Réservations */}
      <div className="px-4 pt-4">
        <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg">
          {tabs.map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`flex-1 py-2 px-2 rounded-md text-sm font-medium transition-colors ${
                tab === t.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {t.label} ({t.count})
            </button>
          ))}
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
          visibleItems.length === 0 ? (
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
            visibleItems.map((item: any, index) => {
              // ── Carte réservation ──
              if (item._type === 'reservation') {
                const r = item;
                const stage = r.driver_status && RESERVATION_STAGE[r.driver_status]
                  ? RESERVATION_STAGE[r.driver_status]
                  : RESERVATION_STAGE[r.status] || RESERVATION_STAGE.scheduled;
                return (
                  <motion.div
                    key={`res-${r.id}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="p-4 border-purple-200">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                            📅 Réservation
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${stage.classes}`}>
                            {stage.label}
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-sm">
                            {r.estimated_price > 0 ? `≈ ${Number(r.estimated_price).toLocaleString()} CDF` : 'Sur devis'}
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mb-1">
                        {new Date(`${r.scheduled_date}T${r.scheduled_time}`).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                        {' '}à {(r.scheduled_time || '').slice(0, 5)}
                      </p>
                      <p className="text-sm font-medium">📍 {r.pickup_address}</p>
                      <p className="text-sm text-gray-600">→ {r.dropoff_address}</p>
                      {r.driver_name && (
                        <p className="text-xs text-gray-600 mt-1">🛡️ Chauffeur : {r.driver_name}</p>
                      )}
                    </Card>
                  </motion.div>
                );
              }
              // ── Carte course immédiate (inchangée) ──
              const ride = item;
              return (
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
                        {getPaymentIcon(ridePaymentMethod(ride))}
                        <span>{getPaymentLabel(ridePaymentMethod(ride))}</span>
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

                    {(ride.driver || ride.driverId) && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <div className="flex items-center gap-3">
                          {ride.driver?.photo ? (
                            <img
                              src={ride.driver.photo}
                              alt={ride.driver?.name || 'Chauffeur'}
                              className="w-10 h-10 rounded-full object-cover border border-gray-200"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                              <span className="text-blue-700 font-bold">
                                {((ride.driver?.name || ride.driverName || 'C') as string).charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-500">Chauffeur</p>
                            <p className="font-medium text-sm truncate">
                              {ride.driver?.name || ride.driverName || getDriverName(ride.driverId)}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              {getVehicleDisplayName({ category: ride.driver?.vehicleCategory || ride.vehicleCategory || ride.vehicle_category })}
                              {ride.driver?.phone ? ` · ${ride.driver.phone}` : ''}
                            </p>
                          </div>
                          {ride.rating && (
                            <div className="flex items-center space-x-1 flex-shrink-0">
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
              );
            })
          )
        )}
      </div>
    </div>
  );
}
