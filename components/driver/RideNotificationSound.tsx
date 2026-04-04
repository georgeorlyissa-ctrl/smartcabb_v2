import { useEffect, useRef } from 'react';
import { playRideNotification } from '../../lib/notification-sound';

interface RideNotificationSoundProps {
  shouldPlay: boolean;
  rideDetails?: {
    passengerName?: string;
    pickup?: {
      address?: string;
      lat: number;
      lng: number;
    };
    destination?: {
      address?: string;
      lat: number;
      lng: number;
    };
    distance?: number;
    estimatedEarnings?: number;
  };
  onSoundComplete?: () => void;
}

/**
 * Composant qui joue UNIQUEMENT le son de notification avec message vocal
 * Sans afficher d'interface utilisateur
 * 
 * Utilisation:
 * <RideNotificationSound shouldPlay={showRideRequest} rideDetails={rideRequest} />
 */
export function RideNotificationSound({ shouldPlay, rideDetails, onSoundComplete }: RideNotificationSoundProps) {
  const hasPlayedRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    // Réinitialiser quand shouldPlay passe à false
    if (!shouldPlay) {
      hasPlayedRef.current = false;
      console.log('🔄 Notification réinitialisée - prête pour la prochaine course');
      return;
    }

    // Jouer uniquement une fois quand shouldPlay devient true
    if (shouldPlay && !hasPlayedRef.current) {
      hasPlayedRef.current = true;
      
      console.log('🔊 Déclenchement du son de notification avec message vocal');
      console.log('📍 Détails de la course:', rideDetails);
      
      // Préparer les détails de la course pour la notification
      const notificationDetails = rideDetails ? {
        passengerName: rideDetails.passengerName,
        pickup: rideDetails.pickup?.address,
        destination: rideDetails.destination?.address,
        distance: rideDetails.distance,
        estimatedEarnings: rideDetails.estimatedEarnings
      } : undefined;
      
      // Jouer le son + message vocal avec les adresses
      playRideNotification(notificationDetails)
        .then(() => {
          console.log('✅ Son de notification terminé');
          if (onSoundComplete) {
            onSoundComplete();
          }
        })
        .catch((error) => {
          console.error('❌ Erreur lecture son de notification:', error);
        });
    }
  }, [shouldPlay, rideDetails, onSoundComplete]);

  // Ce composant ne rend rien visuellement
  return null;
}
