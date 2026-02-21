import { useState, useEffect } from 'react'; // ✅ FIX: Ajout useEffect
import { motion } from '../../lib/motion';
import { Button } from '../ui/button';
import { Card } from '../ui/card'; // ✅ FIX: Ajout Card
import { Textarea } from '../ui/textarea';
import { Star, User, Car, ArrowLeft, Send, Home } from '../../lib/icons';
import { useAppState } from '../../hooks/useAppState';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { toast } from '../../lib/toast';

// 🔧 FIX: Loader2 inline pour éviter l'erreur "Loader2 is not defined"
const Loader2 = ({ className = '' }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

export function RatingScreen() {
  const { state, setCurrentScreen } = useAppState();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [driverData, setDriverData] = useState<any>(null);
  const [loadingDriver, setLoadingDriver] = useState(true);
  const currentRide = state.currentRide;

  // 🆕 CHARGER LES VRAIES DONNÉES DU CONDUCTEUR DEPUIS LE BACKEND
  useEffect(() => {
    const fetchDriverData = async () => {
      if (!currentRide?.driverId) {
        console.warn('⚠️ Pas de driverId dans currentRide');
        setLoadingDriver(false);
        return;
      }

      try {
        console.log('🔍 Chargement des données du conducteur:', currentRide.driverId);
        
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/drivers/${currentRide.driverId}`,
          {
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (!response.ok) {
          throw new Error(`Erreur HTTP: ${response.status}`);
        }

        const data = await response.json();
        console.log('✅ Données conducteur reçues:', data);
        
        if (data.success && data.driver) {
          setDriverData(data.driver);
        }
      } catch (error) {
        console.error('❌ Erreur chargement conducteur:', error);
      } finally {
        setLoadingDriver(false);
      }
    };

    fetchDriverData();
  }, [currentRide?.driverId]);

  if (!currentRide) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-6">
          <p>Aucune course à évaluer</p>
        </Card>
      </div>
    );
  }

  const handleSubmitRating = async () => {
    if (rating === 0) {
      toast.error('Veuillez donner une note');
      return;
    }

    setIsSubmitting(true);

    try {
      console.log('⭐ Envoi de l\'évaluation:', { 
        rideId: currentRide.id,
        driverId: currentRide.driverId,
        rating, 
        comment 
      });
      
      // ✅ ROUTE CORRECTE : /rides/rate (pas /rides/${id}/rate)
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/rides/rate`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            rideId: currentRide.id,
            driverId: currentRide.driverId,
            rating: rating,
            comment: comment,
            passengerId: state.currentUser?.id
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Erreur backend évaluation:', errorData);
        throw new Error(errorData.error || 'Erreur lors de l\'évaluation');
      }

      const data = await response.json();
      console.log('✅ Évaluation enregistrée:', data);

      toast.success('Merci pour votre évaluation !');
      
      // Rediriger vers l'accueil
      setTimeout(() => {
        setCurrentScreen('map');
      }, 1500);
      
    } catch (error) {
      console.error('❌ Erreur évaluation:', error);
      toast.error(error instanceof Error ? error.message : 'Impossible d\'enregistrer l\'évaluation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const quickComments = [
    { icon: Star, text: 'Excellent conducteur', emoji: '👍' },
    { icon: Star, text: 'Véhicule propre', emoji: '✨' },
    { icon: Star, text: 'Conduite sécuritaire', emoji: '🛡️' },
    { icon: Star, text: 'Très ponctuel', emoji: '⏰' },
    { icon: Star, text: 'Très sympathique', emoji: '😊' },
    { icon: Star, text: 'Pourrait être amélioré', emoji: '⚠️' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header - Plus compact */}
      <div className="bg-gradient-to-br from-green-600 to-green-700 text-white p-4 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-16 h-16 bg-white/20 rounded-full mx-auto mb-2 flex items-center justify-center"
        >
          <Star className="w-8 h-8 fill-white" />
        </motion.div>
        <h1 className="text-xl font-bold mb-1">Course terminée !</h1>
        <p className="text-green-100 text-sm">Comment s'est passée votre course ?</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-3 sm:p-4 md:p-6 space-y-3 max-w-2xl mx-auto">
          {/* Informations conducteur - Compact */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="p-4">
              <div className="text-center">
                {loadingDriver ? (
                  <div className="flex flex-col items-center justify-center py-4">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-2" />
                    <p className="text-sm text-gray-500">Chargement...</p>
                  </div>
                ) : (
                  <>
                    <div className="w-16 h-16 bg-blue-100 rounded-full mx-auto mb-2 flex items-center justify-center">
                      <span className="text-2xl">👤</span>
                    </div>
                    <h2 className="font-semibold">
                      {driverData?.name || currentRide.driverName || 'Conducteur'}
                    </h2>
                    <p className="text-gray-600 text-sm">
                      {driverData?.vehicle?.make || driverData?.vehicle?.brand || currentRide.vehicleInfo?.make || 'Véhicule'} {driverData?.vehicle?.model || currentRide.vehicleInfo?.model || ''}
                    </p>
                    {(driverData?.vehicle?.licensePlate || driverData?.vehicle?.license_plate || currentRide.vehicleInfo?.licensePlate) && (
                      <p className="text-gray-500 text-xs mt-1">
                        {driverData?.vehicle?.licensePlate || driverData?.vehicle?.license_plate || currentRide.vehicleInfo?.licensePlate}
                      </p>
                    )}
                  </>
                )}
              </div>
            </Card>
          </motion.div>

          {/* Étoiles de notation - Compact */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="p-4">
              <h3 className="text-center font-semibold mb-3 text-sm sm:text-base">Notez votre expérience</h3>
              
              <div className="flex justify-center space-x-2 sm:space-x-3 mb-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <motion.button
                    key={star}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setRating(star)}
                    className="focus:outline-none"
                  >
                    <Star 
                      className={`w-10 h-10 sm:w-12 sm:h-12 transition-all ${
                        star <= rating 
                          ? 'fill-yellow-400 text-yellow-400' 
                          : 'text-gray-300'
                      }`}
                    />
                  </motion.button>
                ))}
              </div>

              <div className="text-center">
                {rating === 0 && <p className="text-gray-500 text-xs sm:text-sm">Tapez pour noter</p>}
                {rating === 1 && <p className="text-red-600 text-xs sm:text-sm font-medium">Très mauvais</p>}
                {rating === 2 && <p className="text-orange-600 text-xs sm:text-sm font-medium">Mauvais</p>}
                {rating === 3 && <p className="text-yellow-600 text-xs sm:text-sm font-medium">Moyen</p>}
                {rating === 4 && <p className="text-green-600 text-xs sm:text-sm font-medium">Bien</p>}
                {rating === 5 && <p className="text-green-600 text-xs sm:text-sm font-medium">Excellent !</p>}
              </div>
            </Card>
          </motion.div>

          {/* Commentaires rapides - Grid adaptatif */}
          {rating > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
            >
              <h3 className="font-semibold mb-2 text-sm">Commentaires rapides (optionnel)</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {quickComments.map((item, index) => (
                  <motion.button
                    key={index}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setComment(item.text)}
                    className={`p-2 rounded-lg border text-xs transition-all ${
                      comment === item.text 
                        ? 'bg-green-50 border-green-500 text-green-700' 
                        : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <span className="mr-1">{item.emoji}</span>
                    {item.text}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Zone de commentaire - Plus compact */}
          {rating > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
            >
              <Card className="p-3">
                <label className="block text-xs sm:text-sm font-medium mb-2">
                  Ajoutez un commentaire (optionnel)
                </label>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Partagez votre expérience..."
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none text-sm"
                  rows={3}
                  maxLength={500}
                />
                <p className="text-xs text-gray-500 mt-1 text-right">
                  {comment.length}/500
                </p>
              </Card>
            </motion.div>
          )}

          {/* Boutons d'action - Compact */}
          <div className="space-y-2 pt-2">
            <Button
              onClick={handleSubmitRating}
              disabled={isSubmitting || rating === 0}
              className="w-full bg-green-600 hover:bg-green-700 h-12"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  <span className="text-sm">Envoi...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  <span className="text-sm">Envoyer l'évaluation</span>
                </>
              )}
            </Button>

            <Button
              onClick={() => setCurrentScreen('map')}
              variant="outline"
              className="w-full h-10"
            >
              <Home className="w-4 h-4 mr-2" />
              <span className="text-sm">Retour à l'accueil</span>
            </Button>
          </div>

          {/* Message de remerciement - Compact */}
          <Card className="p-3 bg-blue-50 border-blue-200">
            <p className="text-xs text-blue-800 text-center">
              💙 Merci d'utiliser SmartCabb ! Votre avis nous aide à améliorer nos services.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}