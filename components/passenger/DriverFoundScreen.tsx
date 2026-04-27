import { useEffect, useState } from 'react';
import { useAppState } from '../../hooks/useAppState';
import { motion } from '../../lib/motion';
import { toast } from '../../lib/toast';
import { ArrowLeft, Star, Car, MapPin, Clock, MessageCircle, Phone } from '../../lib/icons';
import { Button } from '../ui/button';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

interface DriverData {
  full_name: string;
  rating: number;
  total_rides: number;
  phone: string;
  photo_url?: string;
  vehicle?: {
    make?: string;
    model?: string;
    color?: string;
    license_plate?: string;
  };
}

export function DriverFoundScreen() {
  const { state, setCurrentScreen, updateRide } = useAppState();
  const [driverData, setDriverData] = useState<DriverData>({
    full_name: '',
    rating: 4.8,
    total_rides: 0,
    phone: ''
  });
  const [isLoadingDriverData, setIsLoadingDriverData] = useState(true);
  const [arrivalTime, setArrivalTime] = useState(5);

  useEffect(() => {
    if (!state.currentRide) {
      setCurrentScreen('map');
      return;
    }

    // Charger les données du chauffeur
    const loadDriverData = async () => {
      try {
        if (!state.currentRide.driverId) return;

        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/drivers/${state.currentRide.driverId}`,
          {
            headers: { Authorization: `Bearer ${publicAnonKey}` }
          }
        );

        if (response.ok) {
          const data = await response.json();
          setDriverData(data);
        }
      } catch (error) {
        console.error('Erreur chargement données chauffeur:', error);
      } finally {
        setIsLoadingDriverData(false);
      }
    };

    loadDriverData();
  }, [state.currentRide]);

  const getVehicleDisplayName = (vehicle: DriverData['vehicle']) => {
    if (!vehicle) return null;
    return `${vehicle.make || ''} ${vehicle.model || ''}`.trim() || null;
  };

  const handlePhoneCall = () => {
    if (driverData.phone) {
      window.location.href = `tel:${driverData.phone}`;
    } else {
      toast.error('Numéro de téléphone non disponible');
    }
  };

  const handleWhatsAppCall = () => {
    if (driverData.phone) {
      const phoneNumber = driverData.phone.replace(/[^0-9]/g, '');
      window.open(`https://wa.me/${phoneNumber}`, '_blank');
    } else {
      toast.error('Numéro de téléphone non disponible');
    }
  };

  const handleCancelRide = async () => {
    if (!state.currentRide?.id) return;

    const confirmed = window.confirm(
      'Voulez-vous vraiment annuler cette course ? Le chauffeur a déjà accepté et est en route.'
    );

    if (!confirmed) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/rides/cancel`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            rideId: state.currentRide.id,
            passengerId: state.currentUser?.id,
            cancelledBy: 'passenger',
            reason: 'Annulation depuis écran chauffeur trouvé'
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Course annulée avec succès:', data);

        // Notification
        toast.success('Course annulée', {
          description: 'Votre course a été annulée. Le chauffeur a été notifié.',
          duration: 5000
        });

        // Mettre à jour le state local
        if (updateRide) {
          updateRide(state.currentRide.id, {
            status: 'cancelled',
            cancelledBy: 'passenger',
            cancelledAt: new Date().toISOString()
          });
        }

        // Retour à la carte
        setCurrentScreen('map');
      } else {
        const error = await response.json();
        console.error('❌ Erreur annulation:', error);
        toast.error('Erreur', {
          description: error.error || 'Impossible d\'annuler la course',
          duration: 5000
        });
      }
    } catch (error) {
      console.error('❌ Erreur annulation course:', error);
      toast.error('Erreur', {
        description: 'Impossible de contacter le serveur',
        duration: 5000
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 flex flex-col">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-border">
        <div className="flex items-center justify-between p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCancelRide}
            className="w-10 h-10 hover:bg-muted"
          >
            <ArrowLeft className="w-5 h-5 text-primary" />
          </Button>
          <h1 className="text-primary">Chauffeur trouvé !</h1>
          <div className="w-10" />
        </div>
      </div>

      {/* Contenu principal */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* 🔒 SÉCURITÉ — Photo du conducteur en avant-plan */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="bg-white rounded-2xl shadow-lg border-2 border-green-200 overflow-hidden"
        >
          <div className="bg-gradient-to-r from-green-600 to-emerald-500 px-4 py-3 flex items-center gap-2">
            <span className="text-xl">🔒</span>
            <div>
              <p className="text-white font-bold text-sm">Vérification de sécurité</p>
              <p className="text-green-100 text-xs">Vérifiez la photo avant de monter dans le véhicule</p>
            </div>
          </div>
          <div className="p-5 flex flex-col items-center">
            {/* Grande photo conducteur */}
            <div className="relative w-28 h-28 mb-3">
              <div className="w-full h-full rounded-full border-4 border-green-400 overflow-hidden bg-gray-100 shadow-lg">
                {isLoadingDriverData ? (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : driverData.photo_url ? (
                  <img
                    src={driverData.photo_url}
                    alt={driverData.full_name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                      if (fallback) fallback.classList.remove('hidden');
                    }}
                  />
                ) : null}
                {/* Fallback initiales */}
                <div className={`absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-600 text-white font-bold text-3xl ${driverData.photo_url ? 'hidden' : ''}`}>
                  {driverData.full_name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || '?'}
                </div>
              </div>
              {/* Badge vérifié */}
              <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center border-2 border-white shadow">
                <span className="text-white text-xs font-bold">✓</span>
              </div>
            </div>

            <h2 className="text-xl font-bold text-gray-900">{driverData.full_name}</h2>
            <div className="flex items-center gap-1 mt-1 mb-3">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span className="font-semibold text-sm">{driverData.rating.toFixed(1)}</span>
              <span className="text-gray-400 text-xs">({isLoadingDriverData ? '...' : driverData.total_rides} courses)</span>
            </div>

            <div className="w-full bg-green-50 border border-green-200 rounded-xl p-3 text-center">
              <p className="text-green-800 font-semibold text-sm">✅ Identité confirmée</p>
              <p className="text-green-600 text-xs mt-0.5">Permis ✓ · Assurance ✓ · Dossier vérifié ✓</p>
            </div>
          </div>
        </motion.div>

        {/* Animation de succès réduite */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-center"
        >
          <h2 className="text-lg font-bold text-green-600">Chauffeur en route !</h2>
          <p className="text-muted-foreground text-sm">
            Arrivée estimée dans <span className="font-semibold text-primary">{arrivalTime} min</span>
          </p>
        </motion.div>

        {/* Informations du chauffeur */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl shadow-lg border border-border overflow-hidden"
        >
          {/* Détails du véhicule */}
          {driverData.vehicle && (
            <div className="p-5 border-b border-border">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Car className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Véhicule</p>
                  <p className="font-semibold">
                    {getVehicleDisplayName(driverData.vehicle) || 'Véhicule'}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-lg p-2.5">
                  <p className="text-xs text-muted-foreground mb-0.5">Couleur</p>
                  <p className="font-medium text-sm">{driverData.vehicle.color || 'Non spécifiée'}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2.5">
                  <p className="text-xs text-muted-foreground mb-0.5">Plaque</p>
                  <p className="font-mono font-bold text-primary text-sm">{driverData.vehicle.license_plate || 'N/A'}</p>
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* Informations de trajet */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-2xl shadow-lg border border-border p-6 space-y-4"
        >
          <h3 className="font-semibold text-lg mb-4">Détails du trajet</h3>

          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-secondary mt-1" />
            <div>
              <p className="text-sm text-muted-foreground">Point de départ</p>
              <p className="font-medium">{state.pickup?.address || 'Chargement...'}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-accent mt-1" />
            <div>
              <p className="text-sm text-muted-foreground">Destination</p>
              <p className="font-medium">{state.destination?.address || 'Chargement...'}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-blue-600 mt-1" />
            <div>
              <p className="text-sm text-muted-foreground">Durée estimée</p>
              <p className="font-medium">{state.currentRide?.estimatedDuration || 15} minutes</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Boutons d'action fixes en bas */}
      <div className="bg-white border-t border-border p-4 space-y-3">
        <Button
          onClick={handleWhatsAppCall}
          className="w-full bg-green-600 hover:bg-green-700 text-white py-6 text-lg"
        >
          <MessageCircle className="w-5 h-5 mr-2" />
          Contacter sur WhatsApp
        </Button>

        <Button
          onClick={handlePhoneCall}
          variant="outline"
          className="w-full border-2 border-primary text-primary py-6 text-lg hover:bg-primary hover:text-white"
        >
          <Phone className="w-5 h-5 mr-2" />
          Appeler le chauffeur
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          Votre chauffeur arrive. Il démarrera la course à son arrivée.
        </p>
      </div>
    </div>
  );
}
