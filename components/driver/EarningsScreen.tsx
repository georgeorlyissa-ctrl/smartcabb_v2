import { useState, useEffect } from 'react';
import { useAppState } from '../../hooks/useAppState';
import { motion } from '../../lib/motion'; // ✅ FIX: Import depuis lib/motion
import { 
  ArrowLeft, 
  DollarSign, 
  TrendingUp, 
  Calendar, 
  Star, 
  Download, 
  Filter,
  Clock,
  MapPin,
  Award,
  Target,
  Trophy,
  TrendingDown,
  AlertCircle,
  Loader2
} from '../../lib/icons';
import { toast } from '../../lib/toast';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

export function EarningsScreen() {
  const { state, setCurrentScreen } = useAppState();
  const driver = state.currentDriver;

  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('today');
  const [earnings, setEarnings] = useState<any>(null);

  // ✅ Protection contre driver null
  if (!driver) {
    console.error('❌ EarningsScreen: driver is null');
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="p-6 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">Aucun conducteur connecté</h2>
          <p className="text-gray-600 mb-4">Veuillez vous connecter pour voir vos gains.</p>
          <Button
            onClick={() => setCurrentScreen('driver-dashboard')}
            className="w-full"
          >
            Retour au tableau de bord
          </Button>
        </Card>
      </div>
    );
  }

  // ✅ NOUVEAU : Récupérer les gains depuis le backend
  useEffect(() => {
    const fetchEarnings = async () => {
      setLoading(true);
      
      try {
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/rides/driver/${driver.id}/earnings?period=${selectedPeriod}`,
          {
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (!response.ok) {
          throw new Error(`Erreur ${response.status}: ${await response.text()}`);
        }

        const data = await response.json();
        
        if (data.success) {
          console.log('📊 Gains récupérés:', data.earnings);
          setEarnings(data.earnings);
        } else {
          toast.error('Erreur lors de la récupération des gains');
        }
      } catch (error) {
        console.error('❌ Erreur récupération gains:', error);
        toast.error('Impossible de charger les gains');
        // Valeurs par défaut en cas d'erreur
        setEarnings({
          total: 0,
          commission: 0,
          net: 0,
          ridesCount: 0,
          rides: []
        });
      } finally {
        setLoading(false);
      }
    };

    fetchEarnings();
  }, [driver.id, selectedPeriod]);

  const periodLabels = {
    today: "Aujourd'hui",
    week: 'Cette semaine',
    month: 'Ce mois'
  };

  return (
    <motion.div 
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -300, opacity: 0 }}
      transition={{ type: 'spring', damping: 25 }}
      className="min-h-screen bg-gray-50 flex flex-col"
    >
      {/* Header */}
      <div className="bg-white shadow-sm p-6">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentScreen('driver-dashboard')}
            className="w-10 h-10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl">Mes gains</h1>
          <div className="w-10" />
        </div>
      </div>

      {/* Period Selector */}
      <div className="p-6 pb-0">
        <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg">
          {(['today', 'week', 'month'] as const).map((period) => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                selectedPeriod === period
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {periodLabels[period]}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="p-6">
            <div className="grid grid-cols-2 gap-4 mb-6">
              <Card className="p-4 bg-gradient-to-br from-green-500 to-green-600 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm">Total brut</p>
                    <p className="text-2xl font-bold">{earnings?.total?.toLocaleString() || 0} CDF</p>
                  </div>
                  <DollarSign className="w-8 h-8 text-green-200" />
                </div>
              </Card>

              <Card className="p-4 bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm">Net (après commission)</p>
                    <p className="text-2xl font-bold">{earnings?.net?.toLocaleString() || 0} CDF</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-blue-200" />
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <Card className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <TrendingDown className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Commission</p>
                    <p className="text-lg font-semibold">{earnings?.commission?.toLocaleString() || 0} CDF</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Courses</p>
                    <p className="text-lg font-semibold">{earnings?.ridesCount || 0}</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Rides List */}
          <div className="flex-1 px-6 pb-6">
            <h2 className="text-lg mb-4">Détail des courses</h2>
            
            {earnings?.rides?.length === 0 ? (
              <Card className="p-8 text-center">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">Aucune course pour cette période</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {earnings?.rides?.map((ride: any, index: number) => (
                  <motion.div
                    key={ride.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <Clock className="w-4 h-4 text-gray-500" />
                          <span className="text-sm font-medium">
                            {new Date(ride.time).toLocaleTimeString('fr-FR', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center space-x-1">
                            <span className="text-xs text-green-600">CDF</span>
                            <span className="font-semibold text-green-600">
                              {ride.earnings?.toLocaleString()}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500">
                            Net: {ride.netEarning?.toLocaleString()} CDF
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2 mb-3">
                        <div className="flex items-start space-x-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full mt-2" />
                          <div className="flex-1">
                            <p className="text-sm text-gray-600">Départ</p>
                            <p className="font-medium text-sm">{ride.pickup}</p>
                          </div>
                        </div>
                        <div className="flex items-start space-x-2">
                          <div className="w-2 h-2 bg-red-500 rounded-full mt-2" />
                          <div className="flex-1">
                            <p className="text-sm text-gray-600">Destination</p>
                            <p className="font-medium text-sm">{ride.destination}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <span>
                          {ride.distance ? `${(ride.distance || 0).toFixed(1)} km` : 'N/A'} • 
                          {ride.duration ? ` ${Math.round(ride.duration)} min` : ' N/A'}
                        </span>
                        <div className="flex items-center space-x-3">
                          <span className="text-xs">
                            Commission: {ride.commission?.toLocaleString()} CDF
                          </span>
                          {ride.rating > 0 && (
                            <div className="flex items-center space-x-1">
                              <Star className="w-4 h-4 text-yellow-500 fill-current" />
                              <span>{ride.rating}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Back to Dashboard */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-8"
            >
              <Button
                onClick={() => setCurrentScreen('driver-dashboard')}
                className="w-full h-12 bg-blue-500 hover:bg-blue-600 text-white rounded-xl"
              >
                Retour au tableau de bord
              </Button>
            </motion.div>
          </div>
        </>
      )}
    </motion.div>
  );
}