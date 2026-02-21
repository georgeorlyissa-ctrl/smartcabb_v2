import { motion } from '../../lib/motion'; // ✅ FIX: Utiliser l'implémentation locale
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { useAppState } from '../../hooks/useAppState';
import { useState } from 'react';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { toast } from '../../lib/toast';

// Icônes SVG inline
const ArrowLeft = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);

const User = ({ className = "w-8 h-8" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const Phone = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
  </svg>
);

const MapPin = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const Navigation = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
  </svg>
);

const MessageCircle = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

const CheckCircle = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
 
export function ActiveRideScreen() {
  const { setCurrentScreen, state, updateRide } = useAppState();
  const [isCompleting, setIsCompleting] = useState(false);
  const currentRide = state.currentRide;

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
    } else {
      toast.error('Numéro de téléphone non disponible');
    }
  };

  const handleWhatsAppPassenger = () => {
    if (currentRide.passenger?.phone) {
      const cleanPhone = currentRide.passenger.phone.replace(/[\s\-\(\)]/g, '');
      window.open(`https://wa.me/${cleanPhone}`, '_blank');
    } else {
      toast.error('Numéro de téléphone non disponible');
    }
  };

  const handleCompleteRide = async () => {
    setIsCompleting(true);
    
    try {
      console.log('🏁 Clôture de la course:', currentRide.id);
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/rides/${currentRide.id}/complete`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            driverId: state.currentUser?.id
          })
        }
      );

      if (!response.ok) {
        throw new Error('Erreur lors de la clôture');
      }

      const data = await response.json();
      console.log('✅ Course clôturée:', data);

      // Mettre à jour l'état local
      updateRide(currentRide.id, {
        status: 'completed'
      });

      toast.success('Course terminée avec succès !');
      
      // Rediriger vers l'écran de confirmation de paiement
      setCurrentScreen('payment-confirmation');
      
    } catch (error) {
      console.error('❌ Erreur clôture course:', error);
      toast.error('Impossible de terminer la course');
    } finally {
      setIsCompleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-green-600 text-white p-4">
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentScreen('navigation')}
            className="text-white hover:bg-green-700"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse" />
            <span className="font-semibold">Course en cours</span>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Informations passager */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Informations passager</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentScreen('client-info')}
              >
                Voir plus
              </Button>
            </div>

            <div className="flex items-center space-x-4 mb-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="w-8 h-8 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{currentRide.passenger?.name || 'Passager'}</h3>
                <p className="text-gray-600 text-sm">{currentRide.passenger?.phone || 'N/A'}</p>
              </div>
            </div>

            {/* Boutons d'action */}
            <div className="grid grid-cols-3 gap-2">
              <Button 
                onClick={handleCallPassenger}
                className="bg-green-500 hover:bg-green-600"
                size="sm"
              >
                <Phone className="w-4 h-4 mr-1" />
                Appeler
              </Button>
              <Button 
                onClick={handleWhatsAppPassenger}
                className="bg-green-500 hover:bg-green-600"
                size="sm"
              >
                <MessageCircle className="w-4 h-4 mr-1" />
                WhatsApp
              </Button>
              <Button 
                onClick={() => setCurrentScreen('passenger-chat')}
                variant="outline"
                size="sm"
              >
                <MessageCircle className="w-4 h-4 mr-1" />
                Message
              </Button>
            </div>
          </Card>
        </motion.div>

        {/* Détails du trajet */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="p-6 space-y-4">
            <h3 className="font-semibold">Détails du trajet</h3>
            
            {/* Point de départ */}
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <MapPin className="w-4 h-4 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-600">Point de départ</p>
                <p className="font-medium">{currentRide.pickup?.address || 'Point de départ non spécifié'}</p>
              </div>
            </div>

            {/* Ligne de séparation */}
            <div className="ml-4 border-l-2 border-dashed border-gray-300 h-8" />

            {/* Destination */}
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <MapPin className="w-4 h-4 text-red-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-600">Destination</p>
                <p className="font-medium">{currentRide.destination?.address || 'Destination non spécifiée'}</p>
              </div>
            </div>

            {/* Informations supplémentaires */}
            <div className="pt-4 border-t space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Distance</span>
                <span className="font-semibold">{(currentRide.distance || 0).toFixed(1) || 'N/A'} km</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Prix de la course</span>
                <span className="font-semibold text-green-600">{currentRide.estimatedPrice?.toLocaleString() || 'N/A'} CDF</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Catégorie</span>
                <span className="font-semibold">{currentRide.vehicleCategory || 'Standard'}</span>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Bouton Navigation */}
        <Button
          onClick={() => setCurrentScreen('navigation')}
          className="w-full bg-blue-600 hover:bg-blue-700"
          size="lg"
        >
          <Navigation className="w-5 h-5 mr-2" />
          Ouvrir la navigation GPS
        </Button>

        {/* Bouton Terminer la course */}
        <Button
          onClick={handleCompleteRide}
          disabled={isCompleting}
          className="w-full bg-green-600 hover:bg-green-700"
          size="lg"
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