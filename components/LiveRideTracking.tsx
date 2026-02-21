/**
 * 🚗 SUIVI EN TEMPS RÉEL DE LA COURSE
 * 
 * Composant unifié pour passagers ET conducteurs
 * Affiche la carte Google Maps avec :
 * - Position en temps réel du véhicule
 * - Trajet complet (départ → destination)
 * - Marqueurs visibles (départ noir ⚫, destination rouge 🔴)
 * - Information du trajet
 * 
 * @version 2.0.0
 * @date 2026-01-22
 */

import { useState, useEffect } from 'react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { useAppState } from '../hooks/useAppState';
import { toast } from '../lib/toast';
import { motion } from '../lib/motion';
import { GoogleMapView } from './GoogleMapView';

interface Location {
  lat: number;
  lng: number;
  latitude?: number;
  longitude?: number;
  address?: string;
}

interface LiveRideTrackingProps {
  mode: 'passenger' | 'driver';
  rideId: string;
  pickup: Location;
  destination: Location;
  driverId?: string;
  driverName?: string;
  driverPhone?: string;
  passengerName?: string;
  passengerPhone?: string;
  estimatedDuration?: number;
  estimatedPrice?: number;
}

export function LiveRideTracking({
  mode,
  rideId,
  pickup,
  destination,
  driverId,
  driverName,
  driverPhone,
  passengerName,
  passengerPhone,
  estimatedDuration,
  estimatedPrice
}: LiveRideTrackingProps) {
  const { state } = useAppState();
  const [vehicleLocation, setVehicleLocation] = useState<Location | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Normaliser les coordonnées (support lat/lng ET latitude/longitude)
  const normalizeLocation = (loc: Location): { lat: number; lng: number; address?: string } => ({
    lat: loc.lat || loc.latitude || 0,
    lng: loc.lng || loc.longitude || 0,
    address: loc.address
  });

  const normalizedPickup = normalizeLocation(pickup);
  const normalizedDestination = normalizeLocation(destination);

  // 🚗 Polling de la position du véhicule (conducteur)
  useEffect(() => {
    if (!driverId || mode === 'driver') {
      // Si on est conducteur, pas besoin de récupérer notre propre position depuis le serveur
      // On utilisera la géolocalisation directe
      setIsLoading(false);
      return;
    }

    const fetchDriverLocation = async () => {
      try {
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/drivers/location/${driverId}`,
          {
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (response.ok) {
          const data = await response.json();
          if (data.location) {
            setVehicleLocation({
              lat: data.location.lat,
              lng: data.location.lng
            });
          }
        }
      } catch (err) {
        console.debug('🔍 Récupération position conducteur:', err);
      }
    };

    // Polling toutes les 3 secondes
    fetchDriverLocation();
    const interval = setInterval(fetchDriverLocation, 3000);
    setIsLoading(false);

    return () => clearInterval(interval);
  }, [driverId, mode]);

  // 📱 Fonction pour appeler
  const handleCall = () => {
    const phone = mode === 'passenger' ? driverPhone : passengerPhone;
    if (phone) {
      window.location.href = `tel:${phone}`;
    } else {
      toast.error('Numéro indisponible');
    }
  };

  // 💬 Fonction pour WhatsApp
  const handleWhatsApp = () => {
    const phone = mode === 'passenger' ? driverPhone : passengerPhone;
    const name = mode === 'passenger' ? driverName : passengerName;
    if (phone) {
      const cleanPhone = phone.replace(/\D/g, '');
      const message = encodeURIComponent(`Bonjour ${name}, concernant notre course SmartCabb en cours...`);
      window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
    } else {
      toast.error('Numéro indisponible');
    }
  };

  return (
    <div className="relative h-full w-full">
      {/* 🗺️ CARTE GOOGLE MAPS COMPLÈTE */}
      <GoogleMapView
        center={vehicleLocation || normalizedPickup}
        zoom={14}
        showRoute={true}
        routeStart={normalizedPickup}
        routeEnd={normalizedDestination}
        vehicleLocation={vehicleLocation || undefined}
        enableGeolocation={mode === 'driver'} // Géolocalisation uniquement pour le conducteur
        enableZoomControls={true}
        disableAutoCenter={mode === 'driver'} // Le conducteur peut zoomer librement
        className="w-full h-full"
      />

      {/* Loader pendant le chargement initial */}
      {isLoading && (
        <div className="absolute inset-0 bg-white/90 flex items-center justify-center z-[1000]">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm text-gray-700 font-medium">Chargement de la carte...</p>
          </div>
        </div>
      )}

      {/* 👤 BADGE UTILISATEUR (Conducteur ou Passager) */}
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="absolute top-4 left-4 right-4 z-[1000]"
      >
        <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-200 p-4">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-xl font-bold ${
              mode === 'passenger' ? 'bg-gradient-to-br from-blue-500 to-blue-600' : 'bg-gradient-to-br from-green-500 to-green-600'
            }`}>
              {mode === 'passenger' ? '🚗' : '👤'}
            </div>
            
            {/* Info */}
            <div className="flex-1">
              <p className="text-xs text-gray-600 font-medium">
                {mode === 'passenger' ? 'Votre chauffeur' : 'Votre passager'}
              </p>
              <p className="font-bold text-lg text-gray-900">
                {mode === 'passenger' ? (driverName || 'Conducteur') : (passengerName || 'Passager')}
              </p>
            </div>

            {/* Boutons d'action */}
            <div className="flex gap-2">
              <button
                onClick={handleCall}
                className="w-11 h-11 bg-green-600 hover:bg-green-700 rounded-full flex items-center justify-center shadow-lg transition-all transform hover:scale-105"
                aria-label="Appeler"
              >
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                </svg>
              </button>
              <button
                onClick={handleWhatsApp}
                className="w-11 h-11 bg-green-600 hover:bg-green-700 rounded-full flex items-center justify-center shadow-lg transition-all transform hover:scale-105"
                aria-label="WhatsApp"
              >
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Barre de statut */}
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-lg shadow-green-500/50" />
                <span className="text-gray-700 font-medium">Course en cours</span>
              </div>
              {estimatedDuration && (
                <span className="font-bold text-blue-600">
                  ~{estimatedDuration} min
                </span>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* 🎯 INDICATEUR DESTINATION */}
      <motion.div
        initial={{ x: 100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="absolute top-32 right-4 z-[1000]"
      >
        <div className="bg-gradient-to-br from-red-500 to-red-600 text-white rounded-2xl shadow-2xl p-4 max-w-xs border-2 border-red-700">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polygon points="3 11 22 2 13 21 11 13 3 11"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white/90 uppercase tracking-wider mb-1">
                🎯 Destination
              </p>
              <p className="font-bold text-sm leading-tight line-clamp-2">
                {normalizedDestination.address || "Point d'arrivée"}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 💰 INDICATEUR PRIX (Si disponible) */}
      {estimatedPrice && mode === 'passenger' && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="absolute bottom-6 left-4 right-4 z-[1000]"
        >
          <div className="bg-white rounded-2xl shadow-2xl border-2 border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 font-medium mb-1">Prix estimé</p>
                <p className="text-2xl font-bold text-gray-900">
                  {estimatedPrice.toLocaleString()} <span className="text-lg text-gray-600">CDF</span>
                </p>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
                <span className="text-2xl">💰</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}