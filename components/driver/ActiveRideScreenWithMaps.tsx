import { motion } from '../../lib/motion'; // ✅ FIX: Utiliser l'implémentation locale
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { useAppState } from '../../hooks/useAppState';
import { 
  ArrowLeft, 
  User, 
  Phone, 
  MapPin,
  MessageCircle,
  CheckCircle,
  Clock,
  DollarSign,
  Play,
  Pause
} from '../../lib/icons';
import { useState, useEffect, useRef } from 'react';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { toast } from '../../lib/toast';

// ✅ Déclaration TypeScript pour l'API Google Maps
declare global {
  interface Window {
    google: any;
    initMap: () => void;
  }
}

export function ActiveRideScreenWithMaps() {
  const { setCurrentScreen, state, updateRide } = useAppState();
  const [isCompleting, setIsCompleting] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [currentCost, setCurrentCost] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const directionsServiceRef = useRef<any>(null);
  const directionsRendererRef = useRef<any>(null);
  
  const currentRide = state.currentRide;

  // ✅ Charger l'API Google Maps
  useEffect(() => {
    // Vérifier si l'API est déjà chargée
    if (window.google && window.google.maps) {
      setMapLoaded(true);
      return;
    }

    // Charger le script Google Maps avec loading=async (best practice)
    const loadScript = async () => {
      try {
        // Récupérer la clé API depuis le backend
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/config/google-maps-key`,
          {
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`
            }
          }
        );

        if (!response.ok) {
          throw new Error('Impossible de récupérer la clé API Google Maps');
        }

        const data = await response.json();
        if (!data.success || !data.apiKey) {
          throw new Error('Clé API Google Maps non configurée');
        }

        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${data.apiKey}&libraries=places,geometry&loading=async`;
        script.async = true;
        script.defer = true;
        script.onload = () => {
          console.log('✅ Google Maps API chargée');
          setMapLoaded(true);
        };
        script.onerror = (err) => {
          console.error('❌ Erreur chargement Google Maps:', err);
        };
        document.head.appendChild(script);
      } catch (error) {
        console.error('❌ Erreur récupération clé API:', error);
      }
    };

    loadScript();
  }, []);

  // ✅ Initialiser la carte et l'itinéraire
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || !currentRide) return;

    const pickup = currentRide.pickup;
    const destination = currentRide.destination;

    // ✅ Support des deux formats: lat/lng ET latitude/longitude
    const pickupLat = pickup?.latitude || pickup?.lat;
    const pickupLng = pickup?.longitude || pickup?.lng;
    const destLat = destination?.latitude || destination?.lat;
    const destLng = destination?.longitude || destination?.lng;

    if (!pickupLat || !pickupLng || !destLat || !destLng) {
      console.error('❌ Coordonnées manquantes pour la carte', {
        pickupLat,
        pickupLng,
        destLat,
        destLng
      });
      return;
    }

    try {
      // Initialiser la carte
      const map = new window.google.maps.Map(mapRef.current, {
        zoom: 13,
        center: { lat: pickupLat, lng: pickupLng },
        mapTypeControl: true,
        mapTypeControlOptions: {
          mapTypeIds: ['roadmap', 'traffic']
        },
        trafficLayerEnabled: true,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          }
        ]
      });

      // Ajouter la couche de trafic
      const trafficLayer = new window.google.maps.TrafficLayer();
      trafficLayer.setMap(map);

      mapInstanceRef.current = map;

      // Service de directions
      const directionsService = new window.google.maps.DirectionsService();
      const directionsRenderer = new window.google.maps.DirectionsRenderer({
        map: map,
        suppressMarkers: false,
        polylineOptions: {
          strokeColor: '#10b981',
          strokeWeight: 5,
          strokeOpacity: 0.8
        }
      });

      directionsServiceRef.current = directionsService;
      directionsRendererRef.current = directionsRenderer;

      // Calculer l'itinéraire
      const request = {
        origin: { lat: pickupLat, lng: pickupLng },
        destination: { lat: destLat, lng: destLng },
        travelMode: window.google.maps.TravelMode.DRIVING,
        drivingOptions: {
          departureTime: new Date(),
          trafficModel: window.google.maps.TrafficModel.BEST_GUESS
        },
        provideRouteAlternatives: false
      };

      directionsService.route(request, (result: any, status: string) => {
        if (status === 'OK') {
          directionsRenderer.setDirections(result);
          console.log('✅ Itinéraire affiché avec trafic en temps réel');
          
          // Extraire les infos de trafic
          const route = result.routes[0];
          const leg = route.legs[0];
          console.log(`📍 Distance: ${leg.distance.text}`);
          console.log(`⏱️ Durée (avec trafic): ${leg.duration_in_traffic?.text || leg.duration.text}`);
        } else {
          console.error('❌ Erreur directions:', status);
          toast.error('Impossible de charger l\'itinéraire');
        }
      });

    } catch (error) {
      console.error('❌ Erreur initialisation carte:', error);
    }
  }, [mapLoaded, currentRide]);

  // ✅ Chronomètre pour le coût actuel
  useEffect(() => {
    if (!isTimerRunning) return;

    const interval = setInterval(() => {
      setElapsedTime(prev => prev + 1);
      
      // Calcul du coût basé sur le temps (exemple: 500 CDF/min)
      const costPerMinute = 500;
      setCurrentCost(prev => prev + (costPerMinute / 60));
    }, 1000);

    return () => clearInterval(interval);
  }, [isTimerRunning]);

  if (!currentRide) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="p-6">
          <p>Aucune course en cours</p>
          <Button onClick={() => setCurrentScreen('driver-dashboard')} className="mt-4">
            Retour au tableau de bord
          </Button>
        </Card>
      </div>
    );
  }

  const handleCallPassenger = () => {
    if (currentRide.passenger?.phone) {
      window.open(`tel:${currentRide.passenger.phone}`, '_self');
    }
  };

  const handleWhatsAppPassenger = () => {
    if (currentRide.passenger?.phone) {
      const cleanPhone = currentRide.passenger.phone.replace(/[\s\-\(\)]/g, '');
      window.open(`https://wa.me/${cleanPhone}`, '_blank');
    }
  };

  const handleCompleteRide = async () => {
    setIsCompleting(true);
    
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/rides/${currentRide.id}/complete`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            driverId: state.currentUser?.id,
            actualCost: Math.round(currentCost)
          })
        }
      );

      if (!response.ok) throw new Error('Erreur lors de la clôture');

      const data = await response.json();
      console.log('✅ Course clôturée:', data);

      updateRide(currentRide.id, { status: 'completed' });
      toast.success('Course terminée avec succès !');
      setCurrentScreen('payment-confirmation');
      
    } catch (error) {
      console.error('❌ Erreur clôture course:', error);
      toast.error('Impossible de terminer la course');
    } finally {
      setIsCompleting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header compact */}
      <div className="bg-green-600 text-white p-3 shadow-md">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentScreen('driver-dashboard')}
            className="text-white hover:bg-green-700 h-8 w-8 p-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse" />
            <span className="font-semibold text-sm">Course en cours</span>
          </div>
          <div className="w-8" /> {/* Spacer */}
        </div>
      </div>

      {/* Carte Google Maps avec trafic */}
      <div className="relative h-64 bg-gray-200">
        <div ref={mapRef} className="w-full h-full" />
        {!mapLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-sm text-gray-600">Chargement de la carte...</p>
            </div>
          </div>
        )}
      </div>

      {/* Contenu principal - scrollable */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        
        {/* Informations passager - compact */}
        <Card className="p-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold">Informations passager</h3>
          </div>
          
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold truncate">{currentRide.passenger?.name || 'Passager'}</h4>
              <p className="text-xs text-gray-600 truncate">{currentRide.passenger?.phone || 'N/A'}</p>
            </div>
          </div>

          {/* Boutons d'action - compact */}
          <div className="grid grid-cols-2 gap-2">
            <Button 
              onClick={handleCallPassenger}
              className="bg-green-500 hover:bg-green-600 h-8 text-xs"
            >
              <Phone className="w-3 h-3 mr-1" />
              Appeler
            </Button>
            <Button 
              onClick={handleWhatsAppPassenger}
              className="bg-green-500 hover:bg-green-600 h-8 text-xs"
            >
              <MessageCircle className="w-3 h-3 mr-1" />
              Message
            </Button>
          </div>
        </Card>

        {/* Points de trajet - compact */}
        <Card className="p-3">
          <div className="space-y-2">
            {/* Point de départ */}
            <div className="flex items-start space-x-2">
              <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <MapPin className="w-3 h-3 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-600">Point de départ</p>
                <p className="text-sm font-medium truncate">{currentRide.pickup?.address || 'N/A'}</p>
              </div>
            </div>

            {/* Ligne de séparation */}
            <div className="ml-3 border-l-2 border-dashed border-gray-300 h-4" />

            {/* Destination */}
            <div className="flex items-start space-x-2">
              <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <MapPin className="w-3 h-3 text-red-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-600">Destination</p>
                <p className="text-sm font-medium truncate">{currentRide.destination?.address || 'N/A'}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Métriques - 2 colonnes compactes */}
        <div className="grid grid-cols-2 gap-2">
          {/* Temps écoulé */}
          <Card className="p-3">
            <div className="flex items-center justify-center mb-1">
              <Clock className="w-4 h-4 text-blue-600 mr-1" />
              <span className="text-xs text-gray-600">Temps écoulé</span>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold">{formatTime(elapsedTime)}</p>
            </div>
          </Card>

          {/* Coût actuel */}
          <Card className="p-3">
            <div className="flex items-center justify-center mb-1">
              <DollarSign className="w-4 h-4 text-green-600 mr-1" />
              <span className="text-xs text-gray-600">Coût actuel</span>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-green-600">{Math.round(currentCost).toLocaleString()} CDF</p>
            </div>
          </Card>
        </div>

        {/* Contrôle du chronomètre */}
        <Card className="p-3 bg-gradient-to-r from-orange-50 to-yellow-50 border-orange-200">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs font-semibold text-orange-800">Contrôle du chronomètre</p>
              <p className="text-xs text-orange-600">
                {isTimerRunning ? 'Facturation en cours' : 'Facturation en pause'}
              </p>
            </div>
            <Button
              onClick={() => setIsTimerRunning(!isTimerRunning)}
              variant="outline"
              size="sm"
              className="border-orange-300 text-orange-700 hover:bg-orange-100 h-8"
            >
              {isTimerRunning ? (
                <>
                  <Pause className="w-3 h-3 mr-1" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="w-3 h-3 mr-1" />
                  Reprendre
                </>
              )}
            </Button>
          </div>
          
          {/* Barre de progression facturation */}
          <div className="mt-2 bg-white rounded-full h-2 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-orange-400 to-red-500 transition-all duration-1000"
              style={{ width: `${Math.min((elapsedTime / 1800) * 100, 100)}%` }}
            />
          </div>
        </Card>

        {/* Bouton Terminer la course */}
        <Button
          onClick={handleCompleteRide}
          disabled={isCompleting}
          className="w-full bg-green-600 hover:bg-green-700 h-12"
        >
          {isCompleting ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Clôture en cours...
            </>
          ) : (
            <>
              <CheckCircle className="w-5 h-5 mr-2" />
              Terminer la course
            </>
          )}
        </Button>
      </div>
    </div>
  );
}