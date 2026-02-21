import { useState, useEffect, useRef } from 'react';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { useAppState } from '../../hooks/useAppState';
import { toast } from '../../lib/toast';
import { motion } from '../../lib/motion';
import { GoogleMapView } from '../GoogleMapView';

interface Location {
  lat: number;
  lng: number;
  address?: string;
}

interface LiveTrackingMapProps {
  driverId: string;
  pickup: Location;
  destination: Location;
  driverName: string;
}

interface Driver {
  id: string;
  name: string;
  location: Location;
}

export function LiveTrackingMap({ driverId, pickup, destination, driverName }: LiveTrackingMapProps) {
  const { state } = useAppState();
  const [driverLocation, setDriverLocation] = useState<Location | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 🚗 Polling de la position du conducteur
  useEffect(() => {
    if (!driverId) return;

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
            setDriverLocation({
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

    return () => clearInterval(interval);
  }, [driverId]);

  // Marquer le chargement comme terminé après un court délai
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  // Fonction pour appeler le chauffeur
  const handleCallDriver = () => {
    const phone = state.currentRide?.driverPhone;
    if (phone) {
      window.location.href = `tel:${phone}`;
    } else {
      toast.error('Numéro du chauffeur indisponible');
    }
  };

  // Fonction pour contacter via WhatsApp
  const handleWhatsApp = () => {
    const phone = state.currentRide?.driverPhone?.replace(/\D/g, '');
    if (phone) {
      const message = encodeURIComponent(`Bonjour ${driverName}, je suis votre passager SmartCabb.`);
      window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
    } else {
      toast.error('Numéro du chauffeur indisponible');
    }
  };

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-100 p-6">
        <div className="text-center">
          {/* AlertCircle icon inline */}
          <svg className="w-12 h-12 text-red-500 mx-auto mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <p className="text-lg font-semibold text-gray-900 mb-2">Erreur de carte</p>
          <p className="text-sm text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  // Préparer les données du conducteur pour GoogleMapView
  const drivers: Driver[] = driverLocation ? [{
    id: driverId,
    name: driverName,
    location: driverLocation
  }] : [];

  return (
    <div className="relative h-full w-full">
      {/* 🗺️ CARTE GOOGLE MAPS avec itinéraire et position conducteur */}
      <GoogleMapView
        center={driverLocation || pickup}
        zoom={14}
        showRoute={true}
        routeStart={pickup}
        routeEnd={destination}
        vehicleLocation={driverLocation || undefined}
        enableGeolocation={false}
        enableZoomControls={true}
        className="w-full h-full"
      />

      {/* Loader pendant le chargement */}
      {isLoading && (
        <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-[1000]">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm text-gray-600">Chargement de la carte...</p>
          </div>
        </div>
      )}

      {/* Badge de statut en haut */}
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="absolute top-4 left-4 right-4 z-[1000]"
      >
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
              {/* Car icon inline */}
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 17h14v2a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-2Z"/>
                <path d="M15 9a2 2 0 1 1 0-4 2 2 0 0 1 0 4Z"/>
                <path d="M9 9a2 2 0 1 1 0-4 2 2 0 0 1 0 4Z"/>
                <path d="M5 17V7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v10"/>
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-600">Votre chauffeur</p>
              <p className="font-semibold text-lg">{driverName}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCallDriver}
                className="w-10 h-10 bg-green-600 hover:bg-green-700 rounded-full flex items-center justify-center shadow-lg transition-colors"
              >
                {/* Phone icon inline */}
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                </svg>
              </button>
              <button
                onClick={handleWhatsApp}
                className="w-10 h-10 bg-green-600 hover:bg-green-700 rounded-full flex items-center justify-center shadow-lg transition-colors"
              >
                {/* MessageCircle icon inline */}
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Barre de progression si disponible */}
          {driverLocation && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-gray-600">En cours</span>
                </div>
                <span className="font-semibold text-blue-600">
                  {state.currentRide?.estimatedDuration || 15} min
                </span>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Indicateur de destination flottant */}
      <motion.div
        initial={{ x: 100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="absolute top-32 right-4 z-[1000]"
      >
        <div className="bg-gradient-to-br from-red-500 to-red-600 text-white rounded-2xl shadow-2xl p-4 max-w-xs">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center flex-shrink-0">
              {/* Navigation icon inline */}
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="3 11 22 2 13 21 11 13 3 11"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white/80 uppercase tracking-wide mb-1">Destination</p>
              <p className="font-bold text-sm leading-tight line-clamp-2">
                {destination.address || "Point d'arrivée"}
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}