import { useEffect, useRef } from 'react';
import { useAppState } from './useAppState';
import { calculateDistanceHaversine } from '../lib/distance-calculator';
import {
  playPassengerApproachSound,
  playPassengerArrivedSound,
} from '../lib/notification-sound';
import { toast } from '../lib/toast';
import { projectId, publicAnonKey } from '../utils/supabase/info';

const APPROACH_KM = 0.5; // Son doux quand le chauffeur passe sous ~500 m
const ARRIVED_KM  = 0.12; // Son distinct quand le chauffeur passe sous ~120 m
const POLL_MS     = 3000;

/**
 * 🔊 Alertes sonores passager — approche + arrivée du chauffeur
 *
 * Partie A (statut) : quand le statut de la course passe à `arrived`
 *   (le chauffeur a tapé « arrivé ») → son d'arrivée. Double filet :
 *   fonctionne même si le GPS du chauffeur est imprécis.
 *
 * Partie B (proximité GPS) : polling de la position du chauffeur.
 *   < 500 m → son doux + toast « votre chauffeur approche »
 *   < 120 m → son d'arrivée (fonctionne même si le chauffeur oublie
 *   de taper « arrivé »).
 *
 * À monter une seule fois au niveau du conteneur passager : chaque seuil
 * ne sonne qu'une fois par course, quel que soit l'écran affiché.
 */
export function usePassengerArrivalAlerts() {
  const { state } = useAppState();
  const ride = state.currentRide;

  const rideId  = ride?.id;
  const driverId = ride?.driverId;
  const status   = ride?.status;
  const pickup   = ride?.pickup;

  const approachedRef = useRef(false);
  const arrivedRef    = useRef(false);

  // Reset des fronts quand on change de course
  useEffect(() => {
    approachedRef.current = false;
    arrivedRef.current = false;
  }, [rideId]);

  const isWatching =
    !!rideId &&
    !!driverId &&
    !!pickup &&
    (status === 'pending' || status === 'accepted' || status === 'arrived');

  // ─── Partie A : statut `arrived` ─────────────────────────────────────────
  useEffect(() => {
    if (!rideId || !status || arrivedRef.current) return;
    if (status === 'arrived') {
      arrivedRef.current = true;
      playPassengerArrivedSound();
      console.log('🔔 [Alerts] Statut "arrived" → son arrivée');
    }
  }, [rideId, status]);

  // ─── Partie B : proximité GPS ────────────────────────────────────────────
  useEffect(() => {
    if (!isWatching || !driverId || !pickup) return;

    const check = async () => {
      try {
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/drivers/location/${driverId}`,
          { headers: { Authorization: `Bearer ${publicAnonKey}` } }
        );
        if (!response.ok) return;
        const data = await response.json();
        const loc = data?.location;
        if (!loc || typeof loc.lat !== 'number' || typeof loc.lng !== 'number') return;

        const distKm = calculateDistanceHaversine(pickup.lat, pickup.lng, loc.lat, loc.lng);

        if (!arrivedRef.current && distKm < ARRIVED_KM) {
          arrivedRef.current = true;
          playPassengerArrivedSound();
          console.log(`🚗 [Alerts] Chauffeur < ${ARRIVED_KM} km (${distKm.toFixed(2)}) → son arrivée`);
          return;
        }
        if (!approachedRef.current && distKm < APPROACH_KM) {
          approachedRef.current = true;
          playPassengerApproachSound();
          toast.info('🚗 Votre chauffeur approche', {
            description: 'Préparez-vous, il arrive à votre position.',
            duration: 4000,
          });
          console.log(`🚗 [Alerts] Chauffeur < ${APPROACH_KM} km (${distKm.toFixed(2)}) → son approche`);
        }
      } catch (e) {
        console.debug('🔇 [Alerts] Erreur polling position:', e);
      }
    };

    check();
    const interval = setInterval(check, POLL_MS);
    return () => clearInterval(interval);
  }, [isWatching, driverId, pickup?.lat, pickup?.lng]);
}
