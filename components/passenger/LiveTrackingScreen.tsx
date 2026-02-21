import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { toast } from '../../lib/toast';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { LiveRideTracking } from '../LiveRideTracking';
import { useState, useEffect } from 'react';
import { useAppState } from '../../hooks/useAppState';

export function LiveTrackingScreen() {
  const { state, setCurrentScreen, updateRide } = useAppState();
  const currentRide = state.currentRide;
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showSOSDialog, setShowSOSDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [waitingForFinalData, setWaitingForFinalData] = useState(false); // 🆕 Indicateur d'attente

  // ⏱️ Chronomètre - CORRECTION : Utiliser billingStartTime au lieu de startedAt
  // Le chronomètre démarre UNIQUEMENT quand le driver désactive le temps d'attente
  // ✅ v518.53 - AVEC GESTION DES PAUSES
  useEffect(() => {
    const billingStart = currentRide?.billingStartTime;
    const isPaused = currentRide?.isPaused;
    const totalPauseDuration = currentRide?.totalPauseDuration || 0;
    
    if (!billingStart) {
      setElapsedTime(0);
      return;
    }

    // ⏸️ Si en pause, ne pas mettre à jour le timer
    if (isPaused) {
      console.log('⏸️ Chrono en pause côté passager');
      return;
    }

    const updateTimer = () => {
      const startTime = typeof billingStart === 'number' ? billingStart : new Date(billingStart).getTime();
      const now = Date.now();
      // Soustraire le temps total de pause
      const elapsed = Math.floor((now - startTime) / 1000) - totalPauseDuration;
      setElapsedTime(elapsed > 0 ? elapsed : 0);
    };

    updateTimer(); // Mise à jour immédiate
    const timer = setInterval(updateTimer, 1000); // Mise à jour chaque seconde

    return () => clearInterval(timer);
  }, [currentRide?.billingStartTime, currentRide?.isPaused, currentRide?.totalPauseDuration]);

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
    const shareText = `🚕 Je suis en course SmartCabb\n\n📍 Départ: ${state.pickup?.address || 'Position de départ'}\n📍 Arrivée: ${state.destination?.address || 'Destination'}\n👤 Conducteur: ${currentRide?.driverName || 'N/A'}\n🚗 Véhicule: ${currentRide?.vehicleType || 'N/A'}\n⏱️ Temps écoulé: ${formatTime(elapsedTime)}\n\nSuivez ma course en temps réel: https://smartcabb.com/track/${currentRide?.id}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Ma course SmartCabb',
          text: shareText
        });
        toast.success('Itinéraire partagé avec succès !');
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
        driverName: currentRide?.driverName,
        driverPhone: currentRide?.driverPhone,
        vehicleInfo: `${currentRide?.vehicleType} - ${currentRide?.vehiclePlate || 'N/A'}`,
        currentLocation: state.pickup,
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
          description: "Les services d'urgence ont été notifiés.",
          duration: 5000
        });
        setShowSOSDialog(false);
      } else {
        toast.error("Erreur lors de l'envoi de l'alerte SOS");
      }
    } catch (error) {
      console.error('Erreur SOS:', error);
      toast.error("Impossible d'envoyer l'alerte SOS");
    }
  };

  // 📡 Polling pour synchroniser billingStartTime depuis le backend
  useEffect(() => {
    if (!currentRide?.id) return;

    const checkRideStatus = async () => {
      try {
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/rides/status/${currentRide.id}`,
          {
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (response.ok) {
          const data = await response.json();
          
          // 🆕 SYNCHRONISER billingStartTime depuis le backend
          if (data.ride && updateRide) {
            // Mise à jour locale avec les données du backend
            updateRide(currentRide.id, {
              billingStartTime: data.ride.billingStartTime,
              freeWaitingDisabled: data.ride.freeWaitingDisabled,
              billingElapsedTime: data.ride.billingElapsedTime
            });
          }
          
          if (data.ride?.status === 'completed') {
            console.log('✅ Course terminée par le conducteur ! Vérification des données...');
            
            // ✅ CORRECTION CRITIQUE : Attendre que duration soit disponible
            const backendDuration = data.ride.duration || data.ride.billingElapsedTime || 0;
            
            console.log('📊 Données finales de la course:', {
              duration: data.ride.duration,
              billingElapsedTime: data.ride.billingElapsedTime,
              finalPrice: data.ride.finalPrice,
              distance: data.ride.distance,
              status: data.ride.status
            });
            
            // 🔥 NE PAS PASSER À PAYMENTSCREEN SI DURATION EST À 0
            // Le backend n'a probablement pas encore fini de sauvegarder
            if (backendDuration === 0) {
              console.warn('⚠️ Duration à 0, on attend le prochain polling...');
              setWaitingForFinalData(true); // 🆕 Indiquer qu'on attend les données finales
              return; // ❌ Ne pas passer au paiement, attendre le prochain cycle
            }
            
            // ✅ Duration disponible, on peut passer au paiement
            if (updateRide) {
              updateRide(currentRide.id, {
                status: 'completed',
                completedAt: data.ride.completedAt || new Date().toISOString(),
                finalPrice: data.ride.finalPrice || currentRide.estimatedPrice,
                duration: backendDuration,
                distance: data.ride.distance || currentRide.distance
              });
            }
            
            toast.success('Course terminée !', {
              description: `Durée : ${Math.floor(backendDuration / 60)}min ${backendDuration % 60}s`,
              duration: 3000
            });
            
            setCurrentScreen('payment');
          }
        }
      } catch (error) {
        console.debug('🔍 Vérification statut:', error instanceof Error ? error.message : 'erreur');
      }
    };

    const interval = setInterval(checkRideStatus, 3000);
    checkRideStatus();

    return () => clearInterval(interval);
  }, [currentRide?.id, setCurrentScreen, updateRide]);

  if (!currentRide) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-900 mb-4">Aucune course en cours</p>
          <button
            onClick={() => setCurrentScreen('map')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg"
          >
            Retour à la carte
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <div className="bg-white shadow-sm border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Course en cours</h1>
            <p className="text-sm text-gray-600">
              {currentRide.driverName || 'Conducteur'} vous emmène à destination
            </p>
          </div>
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
        </div>
      </div>

      {/* 🗺️ CARTE - Nouveau composant unifié */}
      <div className="flex-1 relative">
        <LiveRideTracking
          mode="passenger"
          rideId={currentRide.id}
          pickup={state.pickup || { lat: -4.3276, lng: 15.3136, address: 'Kinshasa' }}
          destination={state.destination || { lat: -4.3276, lng: 15.3136, address: 'Kinshasa' }}
          driverId={currentRide.driverId}
          driverName={currentRide.driverName}
          driverPhone={currentRide.driverPhone}
          estimatedDuration={currentRide.estimatedDuration}
          estimatedPrice={currentRide.estimatedPrice}
        />
        
        {/* 🆕 Overlay d'attente des données finales */}
        {waitingForFinalData && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm mx-4 text-center">
              <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <h3 className="text-lg font-bold text-gray-900 mb-2">Course terminée !</h3>
              <p className="text-sm text-gray-600">
                Finalisation du calcul en cours...<br/>
                <span className="text-xs text-gray-500">Veuillez patienter quelques secondes</span>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 🎛️ CONTRÔLES ET INFOS - Toujours visibles en bas */}
      <div className="bg-white border-t border-gray-200 p-4 space-y-4">
        {/* Chronomètre de facturation - Affiche UNIQUEMENT si billingStartTime existe */}
        {currentRide.billingStartTime && (
          <div className="flex items-center justify-center mb-3">
            <div className="flex items-center gap-2 bg-orange-100 border-2 border-orange-500 px-4 py-2 rounded-full">
              {/* Clock icon inline */}
              <svg className="w-5 h-5 text-orange-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              <span className="text-2xl font-bold text-orange-600 tabular-nums">
                {formatTime(elapsedTime)}
              </span>
            </div>
          </div>
        )}

        {/* Prix et Durée estimée */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center">
            <p className="text-xs text-gray-600 mb-1">Prix estimé</p>
            <p className="text-lg font-bold text-gray-900">
              {currentRide.estimatedPrice?.toLocaleString()} CDF
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-600 mb-1">Durée estimée</p>
            <p className="text-lg font-bold text-gray-900">
              {currentRide.estimatedDuration || 15} min
            </p>
          </div>
        </div>

        {/* Boutons Partager et SOS - TOUJOURS VISIBLES */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={() => setShowShareDialog(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl shadow-md transition-all"
          >
            {/* Share2 icon inline */}
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="18" cy="5" r="3"/>
              <circle cx="6" cy="12" r="3"/>
              <circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
            Partager
          </Button>
          <Button
            onClick={() => setShowSOSDialog(true)}
            className="bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-xl shadow-md transition-all"
          >
            {/* AlertTriangle icon inline */}
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            SOS
          </Button>
        </div>
      </div>

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
              <p><strong>📍 Départ:</strong> {state.pickup?.address || 'Position de départ'}</p>
              <p><strong>📍 Arrivée:</strong> {state.destination?.address || 'Destination'}</p>
              <p><strong>👤 Conducteur:</strong> {currentRide?.driverName || 'N/A'}</p>
              <p><strong>⏱️ Temps:</strong> {formatTime(elapsedTime)}</p>
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
    </div>
  );
}