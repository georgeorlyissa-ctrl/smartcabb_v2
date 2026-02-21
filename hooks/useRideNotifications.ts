/**
 * 🔔 HOOK POUR GÉRER LES NOTIFICATIONS DE COURSES
 * 
 * Écoute les nouvelles courses assignées à un chauffeur
 * et déclenche les notifications sonores automatiquement
 */

import { useState, useEffect, useCallback } from 'react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface RideRequest {
  id: string;
  passengerId: string;
  passengerName: string;
  passengerRating?: number;
  pickup: {
    lat: number;
    lng: number;
    address: string;
  };
  destination?: {
    lat: number;
    lng: number;
    address: string;
  };
  distance: number;
  estimatedEarnings: number;
  estimatedDuration: number;
  vehicleType: string;
  createdAt: string;
}

interface Notification {
  type: string;
  rideId: string;
  driverId: string;
  createdAt: string;
  expiresAt: string;
  ride?: RideRequest;
}

export function useRideNotifications(driverId: string | null) {
  const [currentNotification, setCurrentNotification] = useState<Notification | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 🔍 Vérifier les notifications périodiquement
  const checkNotifications = useCallback(async () => {
    if (!driverId) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/rides/notifications/${driverId}`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        
        if (data.success && data.notifications && data.notifications.length > 0) {
          // Prendre la première notification active
          const notification = data.notifications[0];
          
          // Si c'est une nouvelle notification (différente de l'actuelle)
          if (!currentNotification || currentNotification.rideId !== notification.rideId) {
            console.log('🔔 Nouvelle notification de course:', notification);
            setCurrentNotification(notification);
          }
        } else {
          // Pas de notifications
          setCurrentNotification(null);
        }
      }
    } catch (error) {
      console.error('❌ Erreur vérification notifications:', error);
    }
  }, [driverId, currentNotification]);

  // ✅ Accepter une course
  const acceptRide = useCallback(async (rideId: string) => {
    if (!driverId) return false;

    setIsLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/rides/accept`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ rideId, driverId })
        }
      );

      const data = await response.json();
      
      if (data.success) {
        console.log('✅ Course acceptée');
        setCurrentNotification(null);
        return true;
      } else {
        console.error('❌ Échec acceptation:', data.error);
        return false;
      }
    } catch (error) {
      console.error('❌ Erreur acceptation course:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [driverId]);

  // ❌ Refuser une course
  const declineRide = useCallback(async (rideId: string) => {
    if (!driverId) return false;

    setIsLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/rides/decline`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ rideId, driverId })
        }
      );

      const data = await response.json();
      
      if (data.success) {
        console.log('❌ Course refusée');
        setCurrentNotification(null);
        return true;
      } else {
        console.error('❌ Échec refus:', data.error);
        return false;
      }
    } catch (error) {
      console.error('❌ Erreur refus course:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [driverId]);

  // 🔄 Polling toutes les 3 secondes
  useEffect(() => {
    if (!driverId) return;

    // Vérification initiale
    checkNotifications();

    // Polling régulier
    const interval = setInterval(() => {
      checkNotifications();
    }, 3000); // Toutes les 3 secondes

    return () => clearInterval(interval);
  }, [driverId, checkNotifications]);

  return {
    currentNotification,
    isLoading,
    acceptRide,
    declineRide,
    checkNotifications
  };
}
