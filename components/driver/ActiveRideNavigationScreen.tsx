/**
 * 🚗 ÉCRAN DE NAVIGATION - CONDUCTEUR
 * 
 * Affiche la carte Google Maps avec :
 * - Itinéraire complet (départ → destination)
 * - Position en temps réel du conducteur
 * - Icône de voiture animée qui se déplace
 * - Informations du passager
 * - Contrôles de course
 * 
 * @version 2.0.0
 * @date 2026-01-22
 */

import { useState, useEffect } from 'react';
import { useAppState } from '../../hooks/useAppState';
import { LiveRideTracking } from '../LiveRideTracking';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { toast } from '../../lib/toast';
import { Button } from '../ui/button';
import { FreeWaitingToggle } from '../FreeWaitingToggle';
import { motion, AnimatePresence } from '../../lib/motion';

interface Location {
  lat: number;
  lng: number;
  latitude?: number;
  longitude?: number;
  address?: string;
}

export function ActiveRideNavigationScreen() {
  const { state, setCurrentScreen, updateRide } = useAppState();
  const currentRide = state.currentRide;
  const [elapsedTime, setElapsedTime] = useState(0);
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);
  // 🆕 Confirmation paiement passager
  const [passengerPaid, setPassengerPaid] = useState<boolean | null>(null); // null = pas encore répondu
  const [isCompleting, setIsCompleting] = useState(false);

  // Protection: Si pas de course, retourner au tableau de bord
  if (!currentRide) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-6 text-center max-w-sm">
          <p className="text-gray-900 font-semibold mb-4">Aucune course en cours</p>
          <Button onClick={() => setCurrentScreen('driver-dashboard')} className="w-full">
            Retour au tableau de bord
          </Button>
        </div>
      </div>
    );
  }

  // Normaliser les coordonnées (support lat/lng ET latitude/longitude)
  const normalizeLocation = (loc: Location): { lat: number; lng: number; address?: string } => ({
    lat: loc.lat || loc.latitude || 0,
    lng: loc.lng || loc.longitude || 0,
    address: loc.address
  });

  const pickup = currentRide.pickup ? normalizeLocation(currentRide.pickup) : { lat: -4.3276, lng: 15.3136, address: 'Kinshasa' };
  const destination = currentRide.destination ? normalizeLocation(currentRide.destination) : { lat: -4.3276, lng: 15.3136, address: 'Kinshasa' };

  // 📍 Mise à jour de la position du conducteur en temps réel
  useEffect(() => {
    if (!currentRide || !state.userId) return;

    let watchId: number | null = null;

    const startTracking = () => {
      watchId = navigator.geolocation.watchPosition(
        async (position) => {
          const newLocation: Location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };

          setCurrentLocation(newLocation);

          // Envoyer la position au serveur (throttle pour éviter trop de requêtes)
          if (!isUpdatingLocation) {
            setIsUpdatingLocation(true);
            
            try {
              const response = await fetch(
                `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/drivers/update-driver-location`,
                {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${publicAnonKey}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    driverId: state.userId,
                    location: newLocation
                  })
                }
              );

              if (!response.ok) {
                console.error('❌ Erreur mise à jour position');
              } else {
                console.log('✅ Position mise à jour:', newLocation);
              }
            } catch (error) {
              console.error('❌ Erreur envoi position:', error);
            } finally {
              setIsUpdatingLocation(false);
            }
          }
        },
        (error) => {
          console.error('❌ Erreur géolocalisation:', error);
          toast.error('Erreur de géolocalisation');
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    };

    startTracking();

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [currentRide, state.userId, isUpdatingLocation]);

  // ⏱️ Chronomètre de la course
  useEffect(() => {
    if (!currentRide.startedAt) return;

    const updateTimer = () => {
      const startTime = typeof currentRide.startedAt === 'number' 
        ? currentRide.startedAt 
        : new Date(currentRide.startedAt).getTime();
      const now = Date.now();
      const elapsed = Math.floor((now - startTime) / 1000); // en secondes
      setElapsedTime(elapsed);
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);

    return () => clearInterval(timer);
  }, [currentRide.startedAt]);

  // Formater le temps en HH:MM:SS ou MM:SS
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 🏁 Terminer la course
  const handleEndRide = async () => {
    if (!passengerPaid) return; // sécurité supplémentaire
    if (!currentRide || !state.userId) return;
    setIsCompleting(true);

    try {
      toast.info('Finalisation de la course...');

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/rides/complete`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            rideId: currentRide.id,
            driverId: state.userId,
            endLocation: currentLocation || destination
          })
        }
      );

      if (!response.ok) {
        throw new Error('Erreur lors de la finalisation');
      }

      const data = await response.json();

      if (data.success) {
        toast.success('Course terminée avec succès !');
        
        if (updateRide) {
          updateRide({
            ...currentRide,
            status: 'completed',
            completedAt: new Date().toISOString(),
            finalPrice: data.ride?.finalPrice || currentRide.estimatedPrice,
            actualDistance: data.ride?.actualDistance,
            actualDuration: data.ride?.actualDuration
          });
        }

        setTimeout(() => {
          setCurrentScreen('driver-payment-confirmation');
        }, 1500);
      } else {
        throw new Error(data.error || 'Erreur inconnue');
      }
    } catch (error) {
      console.error('❌ Erreur fin de course:', error);
      toast.error('Erreur lors de la finalisation de la course');
    } finally {
      setIsCompleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* En-tête */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">Navigation en cours</h1>
            <p className="text-xs text-green-100">
              {currentRide.passengerName || 'Passager'}
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold tabular-nums">{formatTime(elapsedTime)}</div>
            <p className="text-xs text-green-100">Temps écoulé</p>
          </div>
        </div>
      </div>

      {/* 🗺️ CARTE GOOGLE MAPS - Composant unifié */}
      <div className="flex-1 relative">
        <LiveRideTracking
          mode="driver"
          rideId={currentRide.id}
          pickup={pickup}
          destination={destination}
          passengerName={currentRide.passengerName || currentRide.passenger_name}
          passengerPhone={currentRide.passengerPhone || currentRide.passenger_phone}
          estimatedDuration={currentRide.estimatedDuration}
          estimatedPrice={currentRide.estimatedPrice}
        />
      </div>

      {/* 🎛️ PANNEAU DE CONTRÔLE */}
      <div className="bg-white border-t-2 border-gray-200 p-4 space-y-4 shadow-2xl">
        {/* Informations de la course */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-blue-50 rounded-xl p-3 text-center border border-blue-200">
            <p className="text-xs text-blue-700 font-medium mb-1">Prix estimé</p>
            <p className="text-lg font-bold text-blue-900">
              {currentRide.estimatedPrice?.toLocaleString()} <span className="text-sm">CDF</span>
            </p>
          </div>
          <div className="bg-purple-50 rounded-xl p-3 text-center border border-purple-200">
            <p className="text-xs text-purple-700 font-medium mb-1">Distance</p>
            <p className="text-lg font-bold text-purple-900">
              {currentRide.estimatedDistance ? Number(currentRide.estimatedDistance).toFixed(1) : '~'} <span className="text-sm">km</span>
            </p>
          </div>
        </div>

        {/* Toggle Temps d'attente gratuit */}
        {!currentRide.billingStartTime && (
          <div className="border-t border-gray-200 pt-4">
            <FreeWaitingToggle />
          </div>
        )}

        {/* ━━━ CONFIRMATION PAIEMENT ━━━ */}
        <div className="border-t border-gray-200 pt-4">
          <AnimatePresence mode="wait">
            {passengerPaid !== true ? (
              /* ── Étape 1 : Question paiement ── */
              <motion.div
                key="payment-question"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className={`rounded-2xl border-2 p-4 ${
                  passengerPaid === false
                    ? 'bg-red-50 border-red-300'
                    : 'bg-orange-50 border-orange-300'
                }`}
              >
                {/* Icône + question */}
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-xl ${
                    passengerPaid === false ? 'bg-red-100' : 'bg-orange-100'
                  }`}>
                    💳
                  </div>
                  <div>
                    <p className={`font-bold text-base ${
                      passengerPaid === false ? 'text-red-800' : 'text-orange-800'
                    }`}>
                      Le passager a-t-il payé ?
                    </p>
                    <p className={`text-xs mt-0.5 ${
                      passengerPaid === false ? 'text-red-600' : 'text-orange-600'
                    }`}>
                      {passengerPaid === false
                        ? 'Veuillez d\'abord encaisser le montant'
                        : 'Confirmez avant de terminer la course'}
                    </p>
                  </div>
                </div>

                {/* Boutons Non / Oui */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setPassengerPaid(false)}
                    className={`h-14 rounded-xl font-bold text-sm transition-all border-2 flex items-center justify-center gap-2 ${
                      passengerPaid === false
                        ? 'bg-red-500 border-red-500 text-white shadow-lg shadow-red-200'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-red-300 hover:bg-red-50'
                    }`}
                  >
                    <span className="text-lg">❌</span>
                    <span>Non</span>
                  </button>
                  <button
                    onClick={() => setPassengerPaid(true)}
                    className="h-14 rounded-xl font-bold text-sm transition-all border-2 border-green-400 bg-green-50 text-green-800 hover:bg-green-500 hover:text-white hover:border-green-500 hover:shadow-lg hover:shadow-green-200 flex items-center justify-center gap-2 active:scale-95"
                  >
                    <span className="text-lg">✅</span>
                    <span>Oui, encaissé</span>
                  </button>
                </div>
              </motion.div>
            ) : (
              /* ── Étape 2 : Paiement confirmé → bouton Terminer ── */
              <motion.div
                key="payment-confirmed"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                className="space-y-3"
              >
                {/* Badge paiement confirmé */}
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-2">
                  <span className="text-green-600 text-lg">✅</span>
                  <p className="text-green-800 font-semibold text-sm">Paiement confirmé</p>
                  <button
                    onClick={() => setPassengerPaid(null)}
                    className="ml-auto text-xs text-gray-400 hover:text-gray-600 underline"
                  >
                    Modifier
                  </button>
                </div>

                {/* Bouton Terminer la course — n'apparaît QU'ICI */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                >
                  <Button
                    onClick={handleEndRide}
                    disabled={isCompleting}
                    className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold py-4 rounded-xl shadow-lg transition-all transform hover:scale-[1.02] disabled:opacity-70 disabled:scale-100"
                  >
                    {isCompleting ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                        </svg>
                        Finalisation...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M9 11l3 3L22 4"/>
                          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                        </svg>
                        Terminer la course
                      </span>
                    )}
                  </Button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
