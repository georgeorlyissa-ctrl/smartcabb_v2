import { useEffect, useState, useRef } from 'react';
import { Button } from '../ui/button';
import { Navigation as NavigationIcon, ArrowLeft, Minimize2, Maximize2, Phone, MessageSquare, MapPin, AlertTriangle } from '../../lib/icons';
import { MapView } from '../MapView'; // ✅ OPTIMISÉ: Utiliser MapView directement (Google Maps)
import { motion } from '../../lib/motion';

// Types
interface Position {
  lat: number;
  lng: number;
  accuracy?: number | null;
  speed?: number | null;
  heading?: number | null;
}

interface NavigationStep {
  instruction: string;
  distance: string;
  duration: string;
}

interface GPSNavigationScreenProps {
  passengerName: string;
  pickup: { lat: number; lng: number; address: string };
  dropoff: { lat: number; lng: number; address: string };
  onBack: () => void;
  onCallPassenger: () => void;
  onOpenChat: () => void;
  onEmergency: () => void;
}

// Composants UI simples (puisque nous n'avons pas shadcn/ui)
const Badge = ({ children, variant = 'default', className = '' }: any) => {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {children}
    </span>
  );
};

const Card = ({ children, className = '' }: any) => {
  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      {children}
    </div>
  );
};

export function GPSNavigationScreen({
  passengerName,
  pickup,
  dropoff,
  onBack,
  onCallPassenger,
  onOpenChat,
  onEmergency
}: GPSNavigationScreenProps) {
  const [currentPosition, setCurrentPosition] = useState<Position | null>(null);
  const [isTracking, setIsTracking] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [eta, setEta] = useState<string>('Calcul...');
  const [distanceRemaining, setDistanceRemaining] = useState<string>('--');
  const [currentStep, setCurrentStep] = useState<NavigationStep | null>(null);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [heading, setHeading] = useState<number>(0);

  // Démarrer le suivi GPS
  useEffect(() => {
    if (!isTracking) return;

    if (!navigator.geolocation) {
      toast.error('GPS non disponible sur cet appareil');
      return;
    }

    try {
      const id = navigator.geolocation.watchPosition(
        (position) => {
          const newPosition: Position = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            speed: position.coords.speed,
            heading: position.coords.heading
          };
          
          setCurrentPosition(newPosition);
          
          if (newPosition.heading !== null) {
            setHeading(newPosition.heading);
          }

          // Calculer ETA et distance
          calculateETAAndDistance(newPosition, dropoff);
          
          // Log pour debug
          console.log('📍 Position GPS:', newPosition);
        },
        (error) => {
          console.warn('⚠️ Erreur GPS:', error);
          
          // Gestion améliorée des erreurs
          let errorMessage = 'Impossible d\'obtenir votre position GPS';
          
          if (error?.message && (
            error.message.includes('permissions policy') ||
            error.message.includes('Permissions policy') ||
            error.message.includes('disabled in this document')
          )) {
            errorMessage = 'GPS bloqué - Vérifiez les paramètres';
            console.warn('⚠️ Permissions Policy détectée');
          } else if (error.code === 1) {
            errorMessage = 'Permission GPS refusée';
          } else if (error.code === 2) {
            errorMessage = 'Position GPS indisponible';
          } else if (error.code === 3) {
            errorMessage = 'Timeout GPS - réessai...';
          }
          
          toast.warning(errorMessage);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );

      setWatchId(id);

      return () => {
        if (id !== null) {
          navigator.geolocation.clearWatch(id);
        }
      };
    } catch (syncError: any) {
      // Erreur synchrone (Permissions Policy, etc.)
      console.warn('⚠️ Erreur synchrone lors du démarrage GPS:', syncError);
      
      let errorMessage = 'GPS non disponible';
      
      if (syncError?.message && syncError.message.includes('permissions policy')) {
        errorMessage = 'GPS bloqué par la sécurité du navigateur';
      }
      
      toast.warning(errorMessage);
    }
  }, [isTracking, dropoff]);

  const toRad = (deg: number) => deg * (Math.PI / 180);

  const calculateBearing = (from: Position, to: { lat: number; lng: number }) => {
    const dLng = toRad(to.lng - from.lng);
    const lat1 = toRad(from.lat);
    const lat2 = toRad(to.lat);
    
    const y = Math.sin(dLng) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) -
              Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
    
    let bearing = Math.atan2(y, x) * (180 / Math.PI);
    bearing = (bearing + 360) % 360;
    
    return bearing;
  };

  const getDirectionFromBearing = (bearing: number): string => {
    const directions = ['Nord', 'Nord-Est', 'Est', 'Sud-Est', 'Sud', 'Sud-Ouest', 'Ouest', 'Nord-Ouest'];
    const index = Math.round(bearing / 45) % 8;
    return directions[index];
  };

  // Calculer ETA et distance restante
  const calculateETAAndDistance = useCallback((from: Position, to: { lat: number; lng: number }) => {
    // Calcul simple de distance (formule Haversine)
    const R = 6371; // Rayon de la Terre en km
    const dLat = toRad(to.lat - from.lat);
    const dLng = toRad(to.lng - from.lng);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(from.lat)) * Math.cos(toRad(to.lat)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    const safeDistance = distance || 0;
    setDistanceRemaining(`${(safeDistance || 0).toFixed(1)} km`);

    // Calcul ETA simple (vitesse moyenne 40 km/h en ville)
    const avgSpeed = from.speed ? from.speed * 3.6 : 40; // m/s → km/h
    const timeHours = distance / avgSpeed;
    const timeMinutes = Math.round(timeHours * 60);
    
    setEta(`${timeMinutes} min`);

    // Générer une instruction de navigation simple
    const bearing = calculateBearing(from, to);
    const direction = getDirectionFromBearing(bearing);
    
    setCurrentStep({
      instruction: `Continuez vers ${direction}`,
      distance: `${(safeDistance || 0).toFixed(1)} km`,
      duration: `${timeMinutes} min`
    });
  }, []);

  // Ouvrir dans Google Maps / Apple Maps
  const openInMaps = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${dropoff.lat},${dropoff.lng}&travelmode=driving`;
    window.open(url, '_blank');
    toast.success('Google Maps ouvert dans un nouvel onglet');
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div className={`min-h-screen bg-gray-50 ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      {/* Header avec infos passager */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="hover:bg-gray-100"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>

            <div className="flex items-center gap-2">
              <Badge variant="default" className="bg-green-600">
                Navigation active
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleFullscreen}
              >
                {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Passager</p>
              <p className="text-base">{passengerName}</p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={onCallPassenger}
                className="gap-1"
              >
                <Phone className="w-4 h-4" />
                Appeler
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={onOpenChat}
                className="gap-1"
              >
                <MessageSquare className="w-4 h-4" />
                Chat
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ETA et Distance */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs opacity-80">Temps restant</p>
            <p className="text-3xl">{eta}</p>
          </div>
          <div className="text-right">
            <p className="text-xs opacity-80">Distance</p>
            <p className="text-3xl">{distanceRemaining}</p>
          </div>
        </div>
      </div>

      {/* Carte + Instructions */}
      <div className="relative" style={{ height: isFullscreen ? 'calc(100vh - 280px)' : '400px' }}>
        <MapView
          center={currentPosition ? { lat: currentPosition.lat, lng: currentPosition.lng } : pickup}
          markers={[pickup, dropoff]}
          zoom={15}
          className="w-full h-full"
          showUserLocation={true}
          enableGeolocation={true}
          onLocationUpdate={(location) => {
            setCurrentPosition({
              lat: location.lat,
              lng: location.lng,
              accuracy: 10,
              speed: null,
              heading: null
            });
          }}
        />

        {/* Boussole (rotation basée sur le cap) */}
        {currentPosition?.heading !== null && (
          <div className="absolute top-4 right-4 z-10">
            <div 
              className="w-16 h-16 bg-white rounded-full shadow-lg flex items-center justify-center"
              style={{ transform: `rotate(${heading}deg)` }}
            >
              <div className="w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-b-12 border-b-red-600" />
            </div>
          </div>
        )}

        {/* Vitesse actuelle */}
        {currentPosition?.speed !== null && (
          <div className="absolute bottom-4 right-4 z-10 bg-white px-4 py-2 rounded-full shadow-lg">
            <p className="text-xs text-gray-500">Vitesse</p>
            <p className="text-lg">
              {currentPosition.speed ? ((currentPosition.speed * 3.6) || 0).toFixed(0) : 0} km/h
            </p>
          </div>
        )}
      </div>

      {/* Instruction de navigation */}
      {currentStep && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="mx-4 -mt-6 mb-4 z-10 relative"
        >
          <Card className="p-4 shadow-xl border-2 border-blue-500">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                <NavigationIcon className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-base mb-1">{currentStep.instruction}</p>
                <p className="text-xs text-gray-500">
                  {currentStep.distance} • {currentStep.duration}
                </p>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Actions rapides */}
      <div className="px-4 pb-4 space-y-3">
        {/* Ouvrir dans Maps externe */}
        <Button
          onClick={openInMaps}
          className="w-full bg-green-600 hover:bg-green-700 gap-2"
        >
          <MapPin className="w-5 h-5" />
          Ouvrir dans Google Maps
        </Button>

        {/* Bouton SOS */}
        <Button
          onClick={onEmergency}
          variant="destructive"
          className="w-full gap-2"
        >
          <AlertTriangle className="w-5 h-5" />
          SOS Urgence
        </Button>
      </div>

      {/* Destination */}
      <div className="px-4 pb-6">
        <Card className="p-4 bg-gray-50">
          <div className="flex items-start gap-3">
            <div className="w-3 h-3 bg-red-600 rounded-full mt-1 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-gray-500 mb-1">Destination</p>
              <p className="text-sm">{dropoff.address}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Toggle tracking */}
      <div className="px-4 pb-4">
        <Button
          variant="outline"
          onClick={() => setIsTracking(!isTracking)}
          className={`w-full ${isTracking ? 'border-green-600 text-green-600' : ''}`}
        >
          {isTracking ? '🟢 Suivi GPS actif' : '⚫ Suivi GPS désactivé'}
        </Button>
      </div>
    </div>
  );
}