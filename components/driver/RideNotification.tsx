import { useState, useEffect } from 'react';
import { MapPin, User, DollarSign, Clock, X, Check } from '../../lib/icons';
import { playRideNotification, stopAllNotifications } from '../../lib/notification-sound';

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

interface RideNotificationProps {
  rideRequest: RideRequest | null;
  onAccept: (rideId: string) => void;
  onDecline: (rideId: string) => void;
  timeoutSeconds?: number;
}

/**
 * 🔔 COMPOSANT DE NOTIFICATION DE COURSE POUR CHAUFFEUR
 * 
 * Affiche une course disponible avec :
 * - Compte à rebours
 * - Détails de la course
 * - Boutons ACCEPTER / REFUSER
 * - Son + vibration automatique
 */
export function RideNotification({
  rideRequest,
  onAccept,
  onDecline,
  timeoutSeconds = 15
}: RideNotificationProps) {
  const [timeLeft, setTimeLeft] = useState(timeoutSeconds);
  const [hasPlayed, setHasPlayed] = useState(false);

  // Compte à rebours
  useEffect(() => {
    if (!rideRequest) {
      setTimeLeft(timeoutSeconds);
      setHasPlayed(false);
      return;
    }

    // Jouer le son/notification une seule fois
    if (!hasPlayed) {
      playRideNotification({
        passengerName: rideRequest.passengerName,
        pickup: rideRequest.pickup.address,
        distance: rideRequest.distance,
        estimatedEarnings: rideRequest.estimatedEarnings
      });
      setHasPlayed(true);
    }

    // Démarrer le compte à rebours
    setTimeLeft(timeoutSeconds);
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          // Auto-refuser après timeout
          onDecline(rideRequest.id);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(interval);
      stopAllNotifications();
    };
  }, [rideRequest, timeoutSeconds, onDecline, hasPlayed]);

  if (!rideRequest) return null;

  const progressPercent = (timeLeft / timeoutSeconds) * 100;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-bounce-in">
        {/* Barre de progression */}
        <div className="h-2 bg-gray-200">
          <div
            className="h-full bg-primary transition-all duration-1000 ease-linear"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Contenu */}
        <div className="p-6 space-y-4">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <MapPin className="w-8 h-8 text-primary animate-pulse" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Nouvelle Course !</h2>
            <div className="flex items-center justify-center gap-2">
              <Clock className="w-5 h-5 text-red-500" />
              <span className="text-3xl font-bold text-red-500">{timeLeft}s</span>
            </div>
          </div>

          {/* Détails passager */}
          <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">{rideRequest.passengerName}</p>
                {rideRequest.passengerRating && (
                  <div className="flex items-center gap-1">
                    <span className="text-yellow-500">⭐</span>
                    <span className="text-sm text-gray-600">{rideRequest.passengerRating.toFixed(1)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Point de départ */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                <MapPin className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 mb-1">Point de départ</p>
                <p className="text-sm font-medium text-gray-900">{rideRequest.pickup.address}</p>
              </div>
            </div>

            {/* Destination (si disponible) */}
            {rideRequest.destination && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 mb-1">Destination</p>
                  <p className="text-sm font-medium text-gray-900">{rideRequest.destination.address}</p>
                </div>
              </div>
            )}
          </div>

          {/* Informations de la course */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-blue-50 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-600 mb-1">Distance</p>
              <p className="text-lg font-bold text-blue-600">{rideRequest.distance.toFixed(1)} km</p>
            </div>
            <div className="bg-green-50 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-600 mb-1">Gain estimé</p>
              <p className="text-lg font-bold text-green-600">{rideRequest.estimatedEarnings} FC</p>
            </div>
            <div className="bg-purple-50 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-600 mb-1">Durée</p>
              <p className="text-lg font-bold text-purple-600">{rideRequest.estimatedDuration} min</p>
            </div>
          </div>

          {/* Type de véhicule */}
          <div className="bg-yellow-50 rounded-xl p-3 text-center">
            <p className="text-sm font-medium text-yellow-800">
              🚗 {rideRequest.vehicleType}
            </p>
          </div>

          {/* Boutons d'action */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => {
                stopAllNotifications();
                onDecline(rideRequest.id);
              }}
              className="py-4 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
            >
              <X className="w-5 h-5" />
              REFUSER
            </button>
            <button
              onClick={() => {
                stopAllNotifications();
                onAccept(rideRequest.id);
              }}
              className="py-4 bg-primary text-white rounded-xl font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-lg"
            >
              <Check className="w-5 h-5" />
              ACCEPTER
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}