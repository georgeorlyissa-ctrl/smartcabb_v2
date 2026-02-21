import { useState, useEffect } from 'react';
import { toast } from '../../lib/toast';
import { RefreshCw } from '../../lib/icons';

interface CachedRide {
  id: string;
  passenger_name: string;
  passenger_phone: string;
  pickup_address: string;
  pickup_lat: number;
  pickup_lng: number;
  dropoff_address: string;
  dropoff_lat: number;
  dropoff_lng: number;
  status: string;
  started_at?: string;
  cached_at: string;
}

interface OfflineModeCacheProps {
  currentRide?: any;
  onSync: () => Promise<void>;
}

export function OfflineModeCache({ currentRide, onSync }: OfflineModeCacheProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [cachedRides, setCachedRides] = useState<CachedRide[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Connexion rétablie', {
        description: 'Synchronisation des données...'
      });
      syncCachedData();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('Mode hors ligne activé', {
        description: 'Les données seront synchronisées plus tard'
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Cache current ride when offline
  useEffect(() => {
    if (currentRide && !isOnline) {
      cacheRide(currentRide);
    }
  }, [currentRide, isOnline]);

  // Load cached rides from localStorage
  useEffect(() => {
    loadCachedRides();
  }, []);

  const loadCachedRides = () => {
    try {
      const cached = localStorage.getItem('smartcabb_cached_rides');
      if (cached) {
        const rides = JSON.parse(cached);
        setCachedRides(rides);
      }
    } catch (error) {
      console.error('Error loading cached rides:', error);
    }
  };

  const cacheRide = (ride: any) => {
    try {
      const cachedRide: CachedRide = {
        id: ride.id,
        passenger_name: ride.passenger_name,
        passenger_phone: ride.passenger_phone,
        pickup_address: ride.pickup_address,
        pickup_lat: ride.pickup_lat,
        pickup_lng: ride.pickup_lng,
        dropoff_address: ride.dropoff_address,
        dropoff_lat: ride.dropoff_lat,
        dropoff_lng: ride.dropoff_lng,
        status: ride.status,
        started_at: ride.started_at,
        cached_at: new Date().toISOString()
      };

      const existing = cachedRides.find(r => r.id === ride.id);
      let updatedRides;

      if (existing) {
        updatedRides = cachedRides.map(r => 
          r.id === ride.id ? cachedRide : r
        );
      } else {
        updatedRides = [...cachedRides, cachedRide];
      }

      localStorage.setItem('smartcabb_cached_rides', JSON.stringify(updatedRides));
      setCachedRides(updatedRides);

      toast.success('Course enregistrée hors ligne');
    } catch (error) {
      console.error('Error caching ride:', error);
      toast.error('Erreur lors de la mise en cache');
    }
  };

  const syncCachedData = async () => {
    if (!isOnline || cachedRides.length === 0) return;

    setIsSyncing(true);

    try {
      // Call the provided sync function
      await onSync();

      // Clear cache after successful sync
      localStorage.removeItem('smartcabb_cached_rides');
      setCachedRides([]);
      setLastSyncTime(new Date());

      toast.success('Données synchronisées', {
        description: `${cachedRides.length} course(s) synchronisée(s)`
      });
    } catch (error) {
      console.error('Error syncing:', error);
      toast.error('Erreur de synchronisation');
    } finally {
      setIsSyncing(false);
    }
  };

  const manualSync = async () => {
    if (!isOnline) {
      toast.error('Pas de connexion internet');
      return;
    }
    await syncCachedData();
  };

  const clearCache = () => {
    localStorage.removeItem('smartcabb_cached_rides');
    setCachedRides([]);
    toast.success('Cache vidé');
  };

  return (
    <div className="space-y-4">
      {/* Status bar */}
      <Card className={`p-4 ${isOnline ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isOnline ? (
              <Wifi className="w-5 h-5 text-green-600" />
            ) : (
              <WifiOff className="w-5 h-5 text-orange-600" />
            )}
            <div>
              <p className={`text-sm ${isOnline ? 'text-green-900' : 'text-orange-900'}`}>
                {isOnline ? 'Connecté' : 'Mode hors ligne'}
              </p>
              {lastSyncTime && (
                <p className="text-xs text-gray-500">
                  Dernière sync: {new Date(lastSyncTime).toLocaleTimeString()}
                </p>
              )}
            </div>
          </div>

          {isOnline && cachedRides.length > 0 && (
            <Button
              onClick={manualSync}
              disabled={isSyncing}
              size="sm"
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              Synchroniser
            </Button>
          )}
        </div>
      </Card>

      {/* Cached rides */}
      {cachedRides.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold">Courses en cache</h3>
              <Badge variant="secondary">{cachedRides.length}</Badge>
            </div>

            <Button
              onClick={clearCache}
              variant="ghost"
              size="sm"
              className="text-red-600 hover:text-red-700"
            >
              Vider le cache
            </Button>
          </div>

          <div className="space-y-3">
            {cachedRides.map((ride) => (
              <motion.div
                key={ride.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-gray-50 rounded-lg border"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-600" />
                    <span className="text-sm">{ride.passenger_name}</span>
                  </div>
                  <Badge variant={ride.status === 'in_progress' ? 'default' : 'secondary'}>
                    {ride.status}
                  </Badge>
                </div>

                <div className="space-y-1 text-xs text-gray-600">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    <span>{ride.pickup_address}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0 text-red-600" />
                    <span>{ride.dropoff_address}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-400">
                    <Clock className="w-3 h-3" />
                    <span>
                      Mis en cache: {new Date(ride.cached_at).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {!isOnline && (
            <p className="text-xs text-gray-500 mt-4 text-center">
              Les données seront automatiquement synchronisées lors de la reconnexion
            </p>
          )}
        </Card>
      )}

      {/* Storage info */}
      <Card className="p-4 bg-gray-50">
        <div className="flex items-center gap-2 mb-2">
          <Database className="w-4 h-4 text-gray-600" />
          <p className="text-sm text-gray-700">Stockage local</p>
        </div>
        <div className="space-y-1 text-xs text-gray-600">
          <p>• Les courses en cours sont sauvegardées automatiquement</p>
          <p>• Synchronisation automatique à la reconnexion</p>
          <p>• Données stockées de manière sécurisée sur l'appareil</p>
        </div>
      </Card>
    </div>
  );
}