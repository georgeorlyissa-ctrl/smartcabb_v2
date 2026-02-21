/**
 * HOOK : useRealtimeRides
 * 
 * Synchronisation en temps réel des courses depuis le backend KV store
 * - Polling intelligent toutes les 2 secondes
 * - Détection automatique des changements
 * - Notifications des nouvelles courses
 * - Pas de données en mémoire, tout vient du backend
 */

import { useState, useEffect, useCallback } from 'react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { toast } from 'sonner';

const SERVER_URL = `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52`;

export interface RealtimeRide {
  id: string;
  passengerId: string;
  driverId?: string;
  status: 'pending' | 'accepted' | 'enroute' | 'arrived' | 'in_progress' | 'completed' | 'cancelled';
  pickup: {
    address: string;
    lat: number;
    lng: number;
  };
  destination: {
    address: string;
    lat: number;
    lng: number;
  };
  price: number;
  distance: number;
  vehicleType: string;
  passengerName?: string;
  passengerPhone?: string;
  driverName?: string;
  driverPhone?: string;
  createdAt: string;
  updatedAt?: string;
  startedAt?: string;
  completedAt?: string;
}

interface UseRealtimeRidesOptions {
  /**
   * Filtrer par statut
   */
  status?: RealtimeRide['status'] | RealtimeRide['status'][];
  
  /**
   * Filtrer par conducteur
   */
  driverId?: string;
  
  /**
   * Filtrer par passager
   */
  passengerId?: string;
  
  /**
   * Intervalle de polling (ms)
   * @default 2000
   */
  interval?: number;
  
  /**
   * Activer les notifications toast
   * @default true
   */
  enableNotifications?: boolean;
  
  /**
   * Callback appelé quand une nouvelle course est créée
   */
  onNewRide?: (ride: RealtimeRide) => void;
  
  /**
   * Callback appelé quand une course est mise à jour
   */
  onRideUpdate?: (ride: RealtimeRide, previousRide: RealtimeRide) => void;
}

export function useRealtimeRides(options: UseRealtimeRidesOptions = {}) {
  const {
    status,
    driverId,
    passengerId,
    interval = 2000,
    enableNotifications = true,
    onNewRide,
    onRideUpdate
  } = options;

  const [rides, setRides] = useState<RealtimeRide[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  /**
   * Récupérer les courses depuis le backend
   */
  const fetchRides = useCallback(async () => {
    try {
      // Construire les paramètres de requête
      const params = new URLSearchParams();
      
      if (status) {
        if (Array.isArray(status)) {
          status.forEach(s => params.append('status', s));
        } else {
          params.append('status', status);
        }
      }
      
      if (driverId) {
        params.append('driverId', driverId);
      }
      
      if (passengerId) {
        params.append('passengerId', passengerId);
      }

      const url = `${SERVER_URL}/rides?${params.toString()}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && Array.isArray(data.rides)) {
        const newRides = data.rides as RealtimeRide[];
        
        // Détecter les changements
        setRides(prevRides => {
          // Nouvelles courses
          const newRideIds = new Set(newRides.map(r => r.id));
          const prevRideIds = new Set(prevRides.map(r => r.id));
          
          newRides.forEach(newRide => {
            if (!prevRideIds.has(newRide.id)) {
              // Nouvelle course
              console.log('🆕 Nouvelle course détectée:', newRide.id);
              
              if (enableNotifications) {
                toast.success(`Nouvelle course : ${newRide.pickup.address}`, {
                  duration: 5000
                });
              }
              
              if (onNewRide) {
                onNewRide(newRide);
              }
            } else {
              // Course mise à jour
              const prevRide = prevRides.find(r => r.id === newRide.id);
              if (prevRide && JSON.stringify(prevRide) !== JSON.stringify(newRide)) {
                console.log('🔄 Course mise à jour:', newRide.id, 'Status:', newRide.status);
                
                if (onRideUpdate) {
                  onRideUpdate(newRide, prevRide);
                }
                
                // Notifier les changements de statut importants
                if (enableNotifications && prevRide.status !== newRide.status) {
                  const statusMessages: Record<string, string> = {
                    'accepted': '✅ Course acceptée',
                    'enroute': '🚗 Conducteur en route',
                    'arrived': '📍 Conducteur arrivé',
                    'in_progress': '🏁 Course démarrée',
                    'completed': '✅ Course terminée',
                    'cancelled': '❌ Course annulée'
                  };
                  
                  const message = statusMessages[newRide.status];
                  if (message) {
                    toast.info(message, { duration: 3000 });
                  }
                }
              }
            }
          });
          
          return newRides;
        });
        
        setLastFetch(new Date());
        setError(null);
      }
      
      setLoading(false);
    } catch (err) {
      console.error('❌ Erreur récupération courses:', err);
      setError(err as Error);
      setLoading(false);
    }
  }, [status, driverId, passengerId, enableNotifications, onNewRide, onRideUpdate]);

  /**
   * Configurer le polling
   */
  useEffect(() => {
    // Charger immédiatement
    fetchRides();

    // Configurer le polling
    const intervalId = setInterval(fetchRides, interval);

    // Nettoyer à la désinscription
    return () => {
      clearInterval(intervalId);
    };
  }, [fetchRides, interval]);

  /**
   * Forcer une synchronisation immédiate
   */
  const refresh = useCallback(() => {
    setLoading(true);
    fetchRides();
  }, [fetchRides]);

  return {
    rides,
    loading,
    error,
    lastFetch,
    refresh
  };
}

/**
 * Hook simplifié pour les conducteurs
 */
export function useDriverRides(driverId: string | undefined) {
  return useRealtimeRides({
    driverId,
    status: ['pending', 'accepted', 'enroute', 'arrived', 'in_progress'],
    interval: 2000,
    enableNotifications: true
  });
}

/**
 * Hook simplifié pour les passagers
 */
export function usePassengerRides(passengerId: string | undefined) {
  return useRealtimeRides({
    passengerId,
    status: ['pending', 'accepted', 'enroute', 'arrived', 'in_progress', 'completed'],
    interval: 2000,
    enableNotifications: true
  });
}

/**
 * Hook simplifié pour l'admin (toutes les courses actives)
 */
export function useAdminActiveRides() {
  return useRealtimeRides({
    status: ['pending', 'accepted', 'enroute', 'arrived', 'in_progress'],
    interval: 3000,
    enableNotifications: false // Pas de notifications pour l'admin
  });
}

/**
 * Hook pour une course spécifique
 */
export function useRealtimeRide(rideId: string | undefined) {
  const [ride, setRide] = useState<RealtimeRide | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!rideId) {
      setRide(null);
      setLoading(false);
      return;
    }

    const fetchRide = async () => {
      try {
        const response = await fetch(`${SERVER_URL}/rides/${rideId}`, {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`Erreur HTTP: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.success && data.ride) {
          setRide(data.ride);
          setError(null);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('❌ Erreur récupération course:', err);
        setError(err as Error);
        setLoading(false);
      }
    };

    // Charger immédiatement
    fetchRide();

    // Polling toutes les 2 secondes
    const intervalId = setInterval(fetchRide, 2000);

    return () => {
      clearInterval(intervalId);
    };
  }, [rideId]);

  return {
    ride,
    loading,
    error
  };
}
