import { PRICING_CONFIG } from '../../lib/pricing-data';
import { toast } from '../../lib/toast';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

interface RatingDialogProps {
  ride: any;
  onClose: () => void;
}

const FREE_WAITING_TIME = 10 * 60; // 10 minutes en secondes

// Fonction pour détecter jour/nuit au moment de la course
function getTimeOfDayFromTimestamp(timestamp: string | Date): 'jour' | 'nuit' {
  const date = new Date(timestamp);
  const hour = date.getHours();
  // Jour: 06:00-20:59 | Nuit: 21:00-05:59
  if (hour >= 6 && hour <= 20) {
    return 'jour';
  }
  return 'nuit';
}

export function RatingDialog({ ride, onClose }: RatingDialogProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Calculer les détails de coût avec taux dynamique
  const exchangeRate = getExchangeRate();
  const category = ride.vehicleType || 'smart_standard';
  const categoryConfig = PRICING_CONFIG[category];
  
  // Déterminer si c'était jour ou nuit au début de la course
  const timeOfDay = ride.startedAt ? getTimeOfDayFromTimestamp(ride.startedAt) : 'jour';
  const hourlyRateUSD = categoryConfig?.pricing?.course_heure?.[timeOfDay]?.usd || 0;
  
  // Calculer le coût total
  const duration = ride.duration || 0; // en secondes
  const billableSeconds = Math.max(0, duration - FREE_WAITING_TIME);
  const billableHours = billableSeconds / 3600;
  const totalCostUSD = billableHours * hourlyRateUSD;
  const totalCostCDF = Math.round(totalCostUSD * exchangeRate);

  // Calculer la durée
  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    
    if (h > 0) {
      return `${h}h ${m}min ${s}s`;
    } else if (m > 0) {
      return `${m}min ${s}s`;
    } else {
      return `${s}s`;
    }
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error('Veuillez donner une note au conducteur');
      return;
    }

    setSubmitting(true);

    try {
      // Envoyer la notation au backend
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/rides/rate`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            rideId: ride.id,
            rating,
            comment
          })
        }
      );

      if (response.ok) {
        toast.success('Merci pour votre évaluation !');
        onClose();
      } else {
        toast.error('Erreur lors de l\'envoi de la notation');
      }
    } catch (error) {
      console.error('❌ Erreur notation:', error);
      toast.error('Erreur réseau');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6 space-y-4">
          {/* Header */}
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Course terminée !</h2>
            <p className="text-sm text-gray-600 mt-1">
              Conducteur: {ride.driverName || 'Conducteur'}
            </p>
          </div>

          {/* Itinéraire */}
          <Card className="p-4 bg-gray-50">
            <div className="flex items-center justify-between text-sm mb-2">
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-blue-600" />
                <span className="font-semibold">Itinéraire</span>
              </div>
              <div className="flex items-center space-x-2">
                {timeOfDay === 'jour' ? (
                  <Sun className="w-4 h-4 text-yellow-500" />
                ) : (
                  <Moon className="w-4 h-4 text-blue-500" />
                )}
                <span className="text-xs font-semibold">
                  {timeOfDay === 'jour' ? 'JOUR' : 'NUIT'}
                </span>
              </div>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-1"></div>
                <div>
                  <p className="text-gray-600">Départ</p>
                  <p className="font-medium">{ride.pickup?.address || 'Point de départ'}</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-red-500 rounded-full mt-1"></div>
                <div>
                  <p className="text-gray-600">Arrivée</p>
                  <p className="font-medium">{ride.destination?.address || 'Destination'}</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-3 text-center bg-blue-50">
              <Clock className="w-5 h-5 text-blue-600 mx-auto mb-1" />
              <p className="text-xs text-gray-600">Durée totale</p>
              <p className="font-bold">{formatDuration(duration)}</p>
            </Card>
            
            <Card className="p-3 text-center bg-green-50">
              <MapPin className="w-5 h-5 text-green-600 mx-auto mb-1" />
              <p className="text-xs text-gray-600">Distance</p>
              <p className="font-bold">{ride.distance || '0.0'} km</p>
            </Card>
          </div>

          {/* Détails des coûts */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold flex items-center space-x-2">
                <DollarSign className="w-5 h-5 text-blue-600" />
                <span>Détail des coûts</span>
              </h3>
              <span className="text-sm font-semibold text-blue-600">
                Taux: {exchangeRate} CDF/USD
              </span>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-gray-600">Tarif horaire ({timeOfDay === 'jour' ? 'JOUR' : 'NUIT'})</span>
                  <div className="flex items-center space-x-1 mt-1">
                    {timeOfDay === 'jour' ? (
                      <Sun className="w-3 h-3 text-yellow-500" />
                    ) : (
                      <Moon className="w-3 h-3 text-blue-500" />
                    )}
                    <span className="text-xs text-gray-500">${hourlyRateUSD}/h</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">${hourlyRateUSD}/h</div>
                  <div className="text-xs text-gray-500">
                    {Math.round(hourlyRateUSD * exchangeRate).toLocaleString()} CDF/h
                  </div>
                </div>
              </div>
              
              <div className="border-t pt-2"></div>
              
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-gray-600">Facturation ({formatDuration(billableSeconds)})</span>
                  {duration < FREE_WAITING_TIME && (
                    <div className="bg-green-100 border border-green-300 rounded px-2 py-1 mt-1 inline-block">
                      <span className="text-xs text-green-700">⏱️ Attente gratuite appliquée</span>
                    </div>
                  )}
                  {duration >= FREE_WAITING_TIME && (
                    <div className="mt-1">
                      <span className="text-xs text-gray-500">
                        (10 min gratuites déduites)
                      </span>
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="font-semibold">{totalCostCDF.toLocaleString()} CDF</div>
                  <div className="text-xs text-gray-500">
                    ${totalCostUSD.toFixed(2)} USD
                  </div>
                </div>
              </div>

              <div className="text-xs text-gray-500 italic">
                Catégorie : {categoryConfig?.name || category}
              </div>
            </div>

            <div className="border-t pt-3 mt-3">
              <div className="flex justify-between items-center">
                <span className="font-bold text-lg">Total</span>
                <div className="text-right">
                  <div className="text-xl font-bold text-green-600">
                    {totalCostCDF.toLocaleString()} CDF
                  </div>
                  <div className="text-sm text-gray-600">
                    ≈ ${totalCostUSD.toFixed(2)} USD
                  </div>
                </div>
              </div>
            </div>

            {/* Info sur le taux de change */}
            <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded">
              <p className="text-xs text-blue-800 text-center">
                💱 Taux de change appliqué: 1 USD = {exchangeRate} CDF
              </p>
            </div>
          </Card>

          {/* Notation */}
          <div className="text-center space-y-3">
            <p className="font-semibold">Comment était votre course ?</p>
            
            <div className="flex justify-center space-x-2">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  onClick={() => setRating(value)}
                  onMouseEnter={() => setHoveredRating(value)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-10 h-10 ${
                      value <= (hoveredRating || rating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>

            {rating > 0 && (
              <p className="text-sm text-gray-600">
                {rating === 5 && '🌟 Excellent !'}
                {rating === 4 && '😊 Très bien'}
                {rating === 3 && '😐 Correct'}
                {rating === 2 && '😕 Peut mieux faire'}
                {rating === 1 && '😞 Mauvaise expérience'}
              </p>
            )}
          </div>

          {/* Commentaire */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Commentaire (optionnel)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Partagez votre expérience..."
              className="w-full border border-gray-300 rounded-lg p-3 text-sm resize-none"
              rows={3}
            />
          </div>

          {/* Bouton Terminer */}
          <Button
            onClick={handleSubmit}
            disabled={submitting || rating === 0}
            className="w-full bg-green-500 hover:bg-green-600 text-white py-3 text-lg"
          >
            {submitting ? 'Envoi...' : 'Terminer'}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}