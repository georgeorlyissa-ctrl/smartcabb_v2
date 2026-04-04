import { toast } from '../../lib/toast';
import { Button } from '../ui/button';
import { useAppState } from '../../hooks/useAppState';
import { useTranslation } from '../../hooks/useTranslation';
import { motion } from '../../lib/motion';
import { useState, useEffect } from 'react';
import { getVehicleDisplayName, getVehicleCategoryDescription } from '../../lib/vehicle-helpers';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

// Icônes SVG inline
const ArrowLeft = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);

const Phone = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
  </svg>
);

const MessageCircle = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

const Star = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="currentColor" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
  </svg>
);

const Car = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
  </svg>
);

const User = ({ className = "w-10 h-10" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const MapPin = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const Clock = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const Award = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="8" r="7" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
    <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
  </svg>
);
 
interface DriverFoundScreenProps {
  driverData: {
    id: string;
    full_name: string;
    phone: string;
    rating: number;
    total_rides: number;
    photo_url?: string; // ✅ Ajout photo
    vehicle?: {
      make?: string;
      model?: string;
      year?: number;
      color?: string;
      license_plate?: string;
      category?: string; // ✅ Catégorie du véhicule (smart_standard, etc.)
    };
  };
  // 🚫 SUPPRIMÉ : confirmationCode n'est plus nécessaire
  estimatedArrival: number; // en minutes
}

export function DriverFoundScreen({ driverData: initialDriverData, estimatedArrival }: DriverFoundScreenProps) {
  const { t } = useTranslation();
  const { setCurrentScreen, state, updateRide } = useAppState();
  const [arrivalTime, setArrivalTime] = useState(estimatedArrival);
  const [driverData, setDriverData] = useState(initialDriverData);
  const [isLoadingDriverData, setIsLoadingDriverData] = useState(true);

  // ✅ Charger les VRAIES données du chauffeur depuis le backend
  useEffect(() => {
    const fetchDriverData = async () => {
      if (!initialDriverData.id) return;

      try {
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/drivers/${initialDriverData.id}`,
          {
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (response.ok) {
          const data = await response.json();
          if (data.driver) {
            console.log('✅ Données chauffeur chargées depuis la DB:', data.driver);
            console.log('🚗 Véhicule du chauffeur:', {
              make: data.driver.vehicle?.make,
              model: data.driver.vehicle?.model,
              color: data.driver.vehicle?.color,
              license_plate: data.driver.vehicle?.license_plate,
              category: data.driver.vehicle?.category,
              displayName: getVehicleDisplayName(data.driver.vehicle)
            });
            setDriverData({
              id: data.driver.id,
              full_name: data.driver.full_name,
              phone: data.driver.phone,
              rating: data.driver.rating || 5.0,
              total_rides: data.driver.total_rides || 0, // ✅ Vraies données
              photo_url: data.driver.photo || data.driver.photo_url, // ✅ Support des deux formats
              vehicle: data.driver.vehicle
            });
          }
        }
      } catch (error) {
        console.error('❌ Erreur chargement données chauffeur:', error);
      } finally {
        setIsLoadingDriverData(false);
      }
    };

    fetchDriverData();
  }, [initialDriverData.id]);

  // Compte à rebours de l'arrivée
  useEffect(() => {
    if (arrivalTime > 0) {
      const timer = setInterval(() => {
        setArrivalTime((prev) => Math.max(0, prev - 1));
      }, 60000); // Décrémenter chaque minute

      return () => clearInterval(timer);
    }
  }, [arrivalTime]);

  // ✅ POLLING : Détecter quand le conducteur confirme le code
  useEffect(() => {
    if (!state.currentRide?.id) return;

    const checkRideStatus = async () => {
      try {
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/rides/status/${state.currentRide.id}`,
          {
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (response.ok) {
          const data = await response.json();
          
          // Si le conducteur a confirmé le code → course démarre
          if (data.ride?.status === 'in_progress') {
            console.log('🚗 Conducteur a confirmé le code ! Course démarrée');
            
            // Mettre à jour le state
            if (updateRide) {
              updateRide(state.currentRide.id, {
                status: 'in_progress',
                startedAt: data.ride.startedAt || new Date().toISOString()
              });
            }
            
            // Notification
            toast.success('Course démarrée !', {
              description: 'Votre chauffeur a confirmé le code. Suivez votre trajet en temps réel.',
              duration: 5000
            });
            
            // Navigation vers l'écran de suivi en temps réel
            setCurrentScreen('ride-in-progress');
          }
        }
      } catch (error) {
        console.debug('🔍 Vérification statut:', error instanceof Error ? error.message : 'erreur');
      }
    };

    // Vérifier toutes les 2 secondes
    const interval = setInterval(checkRideStatus, 2000);
    
    // Première vérification immédiate
    checkRideStatus();

    return () => clearInterval(interval);
  }, [state.currentRide?.id, setCurrentScreen, updateRide]);

  const handleWhatsAppCall = () => {
    // Ouvrir WhatsApp avec le numéro du chauffeur
    const phoneNumber = driverData.phone.replace(/\D/g, ''); // Retirer les caractères non numériques
    const message = encodeURIComponent(
      `Bonjour ${driverData.full_name}, je suis votre passager SmartCabb.`
    );
    window.open(`https://wa.me/${phoneNumber}?text=${message}`, '_blank');
  };

  const handlePhoneCall = () => {
    window.location.href = `tel:${driverData.phone}`;
  };

  // ✅ ANNULATION DE LA COURSE (flèche retour)
  const handleCancelRide = async () => {
    if (!state.currentRide?.id) {
      // Si pas de course active, retour simple
      setCurrentScreen('map');
      return;
    }

    // Confirmation de l'annulation
    const confirmCancel = window.confirm(
      'Êtes-vous sûr de vouloir annuler cette course ? Le chauffeur sera notifié.'
    );

    if (!confirmCancel) return;

    try {
      console.log('🚫 Annulation de la course:', state.currentRide.id);

      // Appeler l'API backend pour annuler la course
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/rides/cancel`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            rideId: state.currentRide.id,
            passengerId: state.user?.id,
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
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Animation de succès */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", duration: 0.6 }}
          className="flex flex-col items-center justify-center py-6"
        >
          <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-lg mb-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
            >
              <Car className="w-12 h-12 text-white" />
            </motion.div>
          </div>
          <h2 className="text-2xl font-bold text-green-600 mb-2">Chauffeur en route !</h2>
          <p className="text-muted-foreground text-center">
            Votre conducteur arrive dans <span className="font-semibold text-primary">quelques instants</span>
          </p>
        </motion.div>

        {/* 🚫 SUPPRIMÉ : Code de confirmation pour simplifier l'UX */}
        {/* Le conducteur démarre directement sans demander de code */}

        {/* Informations du chauffeur */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl shadow-lg border border-border overflow-hidden"
        >
          {/* En-tête avec photo */}
          <div className="bg-gradient-to-r from-secondary to-primary p-6 text-white">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg overflow-hidden">
                {driverData.photo_url ? (
                  <img 
                    src={driverData.photo_url} 
                    alt={driverData.full_name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Fallback si l'image ne charge pas
                      e.currentTarget.style.display = 'none';
                      const nextSibling = e.currentTarget.nextElementSibling;
                      if (nextSibling instanceof HTMLElement) {
                        nextSibling.classList.remove('hidden');
                      }
                    }}
                  />
                ) : null}
                {/* Avatar avec initiales si pas de photo */}
                {!driverData.photo_url && driverData.full_name ? (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-600 text-white font-bold text-2xl">
                    {driverData.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                  </div>
                ) : null}
                {/* Icône User en fallback final */}
                <User className={`w-10 h-10 text-primary ${driverData.photo_url || driverData.full_name ? 'hidden' : ''}`} />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold">{driverData.full_name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-semibold">{driverData.rating.toFixed(1)}</span>
                  <span className="text-sm opacity-90">
                    ({isLoadingDriverData ? '...' : driverData.total_rides} courses)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Détails du véhicule */}
          {driverData.vehicle && (
            <div className="p-6 border-b border-border">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Car className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Véhicule</p>
                  <p className="font-semibold">
                    {getVehicleDisplayName(driverData.vehicle) || 'Véhicule'}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Couleur</p>
                  <p className="font-medium">{driverData.vehicle.color || 'Non spécifiée'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Plaque</p>
                  <p className="font-mono font-bold text-primary">{driverData.vehicle.license_plate || 'N/A'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Badges de confiance */}
          <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50">
            <div className="flex items-center gap-3 mb-3">
              <Award className="w-5 h-5 text-green-600" />
              <p className="font-semibold text-green-900">Chauffeur vérifié</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 bg-white border border-green-200 rounded-full text-xs font-medium text-green-700">
                ✓ Permis vérifié
              </span>
              <span className="px-3 py-1 bg-white border border-green-200 rounded-full text-xs font-medium text-green-700">
                ✓ Assurance valide
              </span>
              <span className="px-3 py-1 bg-white border border-green-200 rounded-full text-xs font-medium text-green-700">
                ✓ Identité confirmée
              </span>
            </div>
          </div>
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
