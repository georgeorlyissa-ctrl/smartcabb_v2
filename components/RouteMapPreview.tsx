import { useEffect, useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence } from '../lib/motion';
import { formatDuration, getCurrentTrafficConditions } from '../lib/duration-calculator';
import { GoogleMapView } from './GoogleMapView';

interface Location {
  lat: number;
  lng: number;
  address: string;
}

interface RouteMapPreviewProps {
  pickup: Location;
  destination: Location;
  distanceKm: number;
  estimatedDuration: number;
  className?: string;
}

/**
 * 🗺️ PRÉVISUALISATION ULTRA-MODERNE DE L'ITINÉRAIRE
 * 
 * Version spectaculaire avec Google Maps API :
 * - Tracé animé et gradient de couleurs
 * - Marqueurs 3D avec animations pulse
 * - Interface futuriste avec glassmorphism
 * - Indicateurs de trafic en temps réel
 * - Animations fluides et transitions élégantes
 */
export function RouteMapPreview({ 
  pickup, 
  destination, 
  distanceKm, 
  estimatedDuration,
  className = '' 
}: RouteMapPreviewProps) {
  const [isMapReady, setIsMapReady] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false); // 🆕 État pour expand/collapse
  const traffic = getCurrentTrafficConditions();

  // ✅ VALIDATION DES COORDONNÉES - PROTECTION CONTRE LES CRASHES
  if (!pickup?.lat || !pickup?.lng || !destination?.lat || !destination?.lng) {
    console.error('❌ [RouteMapPreview] Coordonnées manquantes', {
      pickup: { lat: pickup?.lat, lng: pickup?.lng },
      destination: { lat: destination?.lat, lng: destination?.lng }
    });
    return (
      <div className={`relative ${className}`}>
        <div className="relative w-full h-80 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 bg-gray-100 flex items-center justify-center">
          <div className="text-center p-6">
            {/* AlertCircle icon inline */}
            <svg className="w-12 h-12 text-red-500 mx-auto mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <p className="text-sm font-medium text-gray-700">Impossible d'afficher la carte</p>
            <p className="text-xs text-gray-500 mt-1">Coordonnées manquantes</p>
          </div>
        </div>
      </div>
    );
  }

  // 🔥 DEBUG: Logger chaque render du composant
  console.log('🗺️ [RouteMapPreview] RENDER avec Google Maps', {
    pickup: `${(pickup.lat || 0).toFixed(6)}, ${(pickup.lng || 0).toFixed(6)}`,
    destination: `${(destination.lat || 0).toFixed(6)}, ${(destination.lng || 0).toFixed(6)}`,
    timestamp: new Date().toISOString()
  });

  // 🔥 MÉMORISER les objets pickup et destination pour éviter les re-renders de GoogleMapView
  const stablePickup = useMemo(() => pickup, [pickup.lat, pickup.lng, pickup.address]);
  const stableDestination = useMemo(() => destination, [destination.lat, destination.lng, destination.address]);

  // Calculer le statut du trafic avec emoji et couleur
  const getTrafficStatus = () => {
    if (traffic.congestionMultiplier > 1.4) {
      return { 
        text: 'Dense', 
        color: '#ef4444',
        gradient: 'from-red-500 to-orange-500',
        emoji: '🚦',
        description: 'Circulation très dense'
      };
    }
    if (traffic.congestionMultiplier > 1.2) {
      return { 
        text: 'Modéré', 
        color: '#f59e0b',
        gradient: 'from-orange-500 to-yellow-500',
        emoji: '⚠️',
        description: 'Trafic modéré'
      };
    }
    return { 
      text: 'Fluide', 
      color: '#10b981',
      gradient: 'from-green-500 to-emerald-500',
      emoji: '✨',
      description: 'Circulation fluide'
    };
  };

  const trafficStatus = getTrafficStatus();

  // Animation du loader
  useEffect(() => {
    const timer = setTimeout(() => setIsMapReady(true), 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`relative ${className}`}>
      {/* 🗺️ CARTE GOOGLE MAPS INTERACTIVE avec tracé de route */}
      <div className="relative w-full h-80 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20">
        <GoogleMapView
          center={stablePickup}
          zoom={13}
          showRoute={true}
          routeStart={stablePickup}
          routeEnd={stableDestination}
          enableZoomControls={true}
          enableGeolocation={false}
          className="w-full h-full"
        />
        
        {/* Gradient overlay en haut pour meilleure lisibilité */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/20 to-transparent pointer-events-none" />
        
        {/* Gradient overlay en bas */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
      </div>

      {/* 🌈 LÉGENDE DU TRAFIC - Style moderne avec glassmorphism */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="absolute bottom-3 left-3 backdrop-blur-xl bg-white/90 rounded-xl shadow-xl px-3 py-2 border border-white/30"
      >
        <p className="text-[9px] font-semibold text-gray-700 mb-1.5">État du trafic</p>
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 shadow-lg shadow-green-500/50" />
            <span className="text-[9px] text-gray-700 font-medium">Fluide</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-orange-500 to-yellow-500 shadow-lg shadow-orange-500/50" />
            <span className="text-[9px] text-gray-700 font-medium">Modéré</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-red-500 to-orange-500 shadow-lg shadow-red-500/50" />
            <span className="text-[9px] text-gray-700 font-medium">Dense</span>
          </div>
        </div>
      </motion.div>

      {/* 🎨 BADGE "EN DIRECT" - Indicateur animé */}
      <motion.div
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5, type: "spring" }}
        className="absolute top-3 right-3 backdrop-blur-xl bg-red-500/90 rounded-full px-2.5 py-1 border border-white/30 shadow-lg"
      >
        <div className="flex items-center gap-1.5">
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [1, 0.7, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-1.5 h-1.5 bg-white rounded-full"
          />
          <span className="text-[9px] font-bold text-white uppercase tracking-wide">En Direct</span>
        </div>
      </motion.div>
    </div>
  );
}