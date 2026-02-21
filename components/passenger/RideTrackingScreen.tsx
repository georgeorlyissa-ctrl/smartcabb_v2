import { motion } from '../../lib/motion'; // ✅ FIX: Utiliser l'implémentation locale
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { useAppState } from '../../hooks/useAppState';
import { GoogleMapView } from '../GoogleMapView';
import { useState, useEffect } from 'react';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { toast } from '../../lib/toast';
import { Phone, MessageCircle, Share2, AlertTriangle, MapPin, Clock } from '../icons/RideIcons';

interface Location {
  lat: number;
  lng: number;
  address: string;
}

export function RideTrackingScreen() {
  const { state, setCurrentScreen } = useAppState();
  const [driverLocation, setDriverLocation] = useState<Location | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showSOSDialog, setShowSOSDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const currentRide = state.currentRide;

  // ⏱️ Chronomètre - Calculer le temps écoulé depuis le début de la course
  useEffect(() => {
    if (!currentRide?.startedAt) return;

    const updateTimer = () => {
      const startTime = new Date(currentRide.startedAt).getTime();
      const now = Date.now();
      const elapsed = Math.floor((now - startTime) / 1000); // en secondes
      setElapsedTime(elapsed);
    };

    updateTimer(); // Mise à jour immédiate
    const timer = setInterval(updateTimer, 1000); // Mise à jour chaque seconde

    return () => clearInterval(timer);
  }, [currentRide?.startedAt]);

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

  // 🔗 Partager l'itinéraire
  const handleShareTrip = async () => {
    const shareText = `🚕 Je suis en course SmartCabb\n\n📍 Départ: ${currentRide.pickup?.address || 'Position de départ'}\n📍 Arrivée: ${currentRide.destination?.address || 'Destination'}\n👤 Conducteur: ${currentRide.driver?.name || 'N/A'}\n🚗 Véhicule: ${currentRide.driver?.vehicle?.make} ${currentRide.driver?.vehicle?.model || ''}\n⏱️ Temps écoulé: ${formatTime(elapsedTime)}\n💰 Prix: ${currentRide.estimatedPrice?.toLocaleString() || 'N/A'} CDF\n\nSuivez ma course en temps réel: https://smartcabb.com/track/${currentRide?.id}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Ma course SmartCabb',
          text: shareText
        });
        toast.success('Itinéraire partagé avec succès !');
        setShowShareDialog(false);
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('Erreur partage:', error);
        }
      }
    } else {
      // Fallback: Copier dans le presse-papiers
      try {
        await navigator.clipboard.writeText(shareText);
        toast.success('Informations copiées dans le presse-papiers !');
        setShowShareDialog(false);
      } catch (error) {
        console.error('Erreur copie:', error);
        toast.error('Impossible de copier les informations');
      }
    }
  };

  // 🚨 Déclencher SOS
  const handleSOS = async () => {
    try {
      const sosData = {
        userId: state.currentUser?.id,
        userName: state.currentUser?.name,
        userPhone: state.currentUser?.phone,
        rideId: currentRide?.id,
        driverName: currentRide.driver?.name,
        driverPhone: currentRide.driver?.phone,
        vehicleInfo: `${currentRide.driver?.vehicle?.make} ${currentRide.driver?.vehicle?.model} - ${currentRide.driver?.vehicle?.licensePlate || 'N/A'}`,
        currentLocation: driverLocation || currentRide.pickup,
        timestamp: new Date().toISOString()
      };

      console.log('🚨 SOS déclenché:', sosData);
      
      // Envoyer l'alerte SOS au backend
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/emergency/sos`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(sosData)
        }
      );

      if (response.ok) {
        toast.success('🚨 Alerte SOS envoyée !', {
          description: 'Les services d\'urgence ont été notifiés.',
          duration: 5000
        });
        setShowSOSDialog(false);
      } else {
        toast.error('Erreur lors de l\'envoi de l\'alerte SOS');
      }
    } catch (error) {
      console.error('Erreur SOS:', error);
      toast.error('Impossible d\'envoyer l\'alerte SOS');
    }
  };

  // ✅ POLLING : Obtenir la position du conducteur en temps réel
  useEffect(() => {
    if (!currentRide?.driverId) return;

    const fetchDriverLocation = async () => {
      try {
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/drivers/${currentRide.driverId}/location`,
          {
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`
            }
          }
        );

        if (response.ok) {
          const data = await response.json();
          if (data.location) {
            setDriverLocation({
              lat: data.location.lat,
              lng: data.location.lng,
              address: data.location.address
            });
          }
        }
      } catch (error) {
        console.error('❌ Erreur récupération position conducteur:', error);
      }
    };

    // Première récupération immédiate
    fetchDriverLocation();

    // Puis toutes les 5 secondes
    const interval = setInterval(fetchDriverLocation, 5000);

    return () => clearInterval(interval);
  }, [currentRide?.driverId]);

  // ✅ POLLING : Vérifier si la course est terminée
  useEffect(() => {
    if (!currentRide?.id) return;

    const checkRideStatus = async () => {
      try {
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/rides/status/${currentRide.id}`,
          {
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`
            }
          }
        );

        if (response.ok) {
          const data = await response.json();
          console.log('🔍 Statut course:', data.ride?.status);
          
          if (data.ride?.status === 'completed') {
            console.log('✅ Course terminée, redirection vers ride-completed');
            setCurrentScreen('ride-completed');
          }
        } else {
          console.debug('⚠️ Erreur récupération statut:', response.status);
        }
      } catch (error) {
        console.debug('🔍 Erreur vérification statut course:', error instanceof Error ? error.message : 'erreur');
      }
    };

    // Première vérification immédiate
    checkRideStatus();

    // Vérifier toutes les 3 secondes (plus rapide pour meilleure réactivité)
    const interval = setInterval(checkRideStatus, 3000);

    return () => clearInterval(interval);
  }, [currentRide?.id, setCurrentScreen]);

  if (!currentRide) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-6">
          <p>Aucune course en cours</p>
        </Card>
      </div>
    );
  }

  const handleCallDriver = () => {
    if (currentRide.driver?.phone) {
      window.open(`tel:${currentRide.driver.phone}`, '_self');
    }
  };

  const handleWhatsAppDriver = () => {
    if (currentRide.driver?.phone) {
      const cleanPhone = currentRide.driver.phone.replace(/[\s\-\(\)]/g, '');
      window.open(`https://wa.me/${cleanPhone}`, '_blank');
    }
  };

  const handleShareRide = () => {
    if (currentRide.driver?.phone) {
      const cleanPhone = currentRide.driver.phone.replace(/[\s\-\(\)]/g, '');
      const message = `Voici les détails de ma course avec ${currentRide.driver?.name} :
Départ : ${currentRide.pickup?.address}
Destination : ${currentRide.destination?.address}
Prix estimé : ${currentRide.estimatedPrice?.toLocaleString() || 'N/A'} CDF
Contact : ${currentRide.driver?.phone}`;
      window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
    }
  };

  const handleReportDriver = () => {
    toast.error('Fonctionnalité en cours de développement');
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Carte en plein écran avec Google Maps */}
      <div className="flex-1 relative">
        <GoogleMapView
          center={driverLocation || currentRide.pickup}
          zoom={14}
          showRoute={true}
          routeStart={currentRide.pickup}
          routeEnd={currentRide.destination}
          vehicleLocation={driverLocation || undefined}
          enableZoomControls={true}
          enableGeolocation={false}
          className="w-full h-full"
        />

        {/* Overlay - Info conducteur */}
        <motion.div
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          className="absolute top-4 left-4 right-4"
        >
          <Card className="p-4 shadow-lg">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-lg">🚗</span>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">{currentRide.driver?.name || 'Conducteur'}</h3>
                <p className="text-sm text-gray-600">
                  {currentRide.driver?.vehicle?.make} {currentRide.driver?.vehicle?.model}
                </p>
              </div>
              <div className="flex space-x-2">
                <Button 
                  onClick={handleCallDriver}
                  size="sm"
                  className="bg-green-500 hover:bg-green-600"
                >
                  <Phone className="w-4 h-4" />
                </Button>
                <Button 
                  onClick={handleWhatsAppDriver}
                  size="sm"
                  className="bg-green-500 hover:bg-green-600"
                >
                  <MessageCircle className="w-4 h-4" />
                </Button>
                <Button 
                  onClick={handleShareRide}
                  size="sm"
                  className="bg-blue-500 hover:bg-blue-600"
                >
                  <Share2 className="w-4 h-4" />
                </Button>
                <Button 
                  onClick={handleReportDriver}
                  size="sm"
                  className="bg-red-500 hover:bg-red-600"
                >
                  <AlertTriangle className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Overlay - Détails trajet */}
        <motion.div
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          className="absolute bottom-0 left-0 right-0"
        >
          <Card className="rounded-t-3xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-center mb-2">
              <div className="w-12 h-1 bg-gray-300 rounded-full" />
            </div>

            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Course en cours</h2>
              <div className="flex items-center space-x-2 text-green-600">
                <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse" />
                <span className="text-sm font-medium">En direct</span>
              </div>
            </div>

            {/* Itinéraire */}
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <MapPin className="w-3 h-3 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-600">Départ</p>
                  <p className="font-medium text-sm">{currentRide.pickup?.address || 'N/A'}</p>
                </div>
              </div>

              <div className="ml-3 border-l-2 border-dashed border-gray-300 h-4" />

              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <MapPin className="w-3 h-3 text-red-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-600">Destination</p>
                  <p className="font-medium text-sm">{currentRide.destination?.address || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Prix */}
            <div className="pt-4 border-t">
              <div className="flex justify-between items-center mb-4">
                <span className="text-gray-600">Prix de la course</span>
                <span className="text-2xl font-bold text-green-600">
                  {currentRide.estimatedPrice?.toLocaleString() || 'N/A'} CDF
                </span>
              </div>
              
              {/* Chronomètre */}
              {currentRide.startedAt && (
                <div className="flex items-center justify-center mb-4 py-3 bg-blue-50 rounded-lg">
                  <Clock className="w-5 h-5 text-blue-600 mr-2" />
                  <span className="text-2xl font-bold text-blue-600 tabular-nums">
                    {formatTime(elapsedTime)}
                  </span>
                </div>
              )}
              
              {/* Boutons Partager et SOS */}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={() => setShowShareDialog(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl shadow-md transition-all"
                >
                  <Share2 className="w-5 h-5 mr-2" />
                  Partager
                </Button>
                <Button
                  onClick={() => setShowSOSDialog(true)}
                  className="bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-xl shadow-md transition-all"
                >
                  <AlertTriangle className="w-5 h-5 mr-2" />
                  SOS
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Dialog SOS */}
      <Dialog open={showSOSDialog} onOpenChange={setShowSOSDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Alerte SOS d'urgence
            </DialogTitle>
            <DialogDescription>
              En cas de problème grave, cette alerte notifiera immédiatement les services d'urgence et vos contacts.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div className="bg-red-50 border border-red-200 p-3 rounded-lg text-sm text-red-800">
              <p className="font-semibold mb-2">⚠️ Cette action va :</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Alerter les services d'urgence</li>
                <li>Envoyer votre position GPS</li>
                <li>Notifier vos contacts d'urgence</li>
                <li>Enregistrer les infos du conducteur</li>
              </ul>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => setShowSOSDialog(false)}
                variant="outline"
                className="py-3"
              >
                Annuler
              </Button>
              <Button
                onClick={handleSOS}
                className="bg-red-600 hover:bg-red-700 text-white py-3 font-semibold"
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                Confirmer SOS
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Partage */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="w-5 h-5 text-blue-600" />
              Partager votre course
            </DialogTitle>
            <DialogDescription>
              Partagez votre itinéraire avec vos amis ou votre famille pour qu'ils puissent suivre votre course en temps réel.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div className="bg-gray-50 p-3 rounded-lg text-sm space-y-1">
              <p><strong>📍 Départ:</strong> {currentRide.pickup?.address || 'Position de départ'}</p>
              <p><strong>📍 Arrivée:</strong> {currentRide.destination?.address || 'Destination'}</p>
              <p><strong>👤 Conducteur:</strong> {currentRide.driver?.name || 'N/A'}</p>
              <p><strong>🚗 Véhicule:</strong> {currentRide.driver?.vehicle?.make} {currentRide.driver?.vehicle?.model}</p>
              {currentRide.startedAt && (
                <p><strong>⏱️ Temps:</strong> {formatTime(elapsedTime)}</p>
              )}
              <p><strong>💰 Prix:</strong> {currentRide.estimatedPrice?.toLocaleString() || 'N/A'} CDF</p>
            </div>
            <Button
              onClick={handleShareTrip}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Partager maintenant
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}