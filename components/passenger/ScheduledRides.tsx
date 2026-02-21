import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Plus, Calendar, Trash2 } from '../../lib/icons';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { motion, AnimatePresence } from '../../lib/motion';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

interface ScheduledRide {
  id?: string;
  user_id?: string;
  pickup_address: string;
  pickup_lat: number;
  pickup_lng: number;
  dropoff_address: string;
  dropoff_lat: number;
  dropoff_lng: number;
  scheduled_date: string;
  scheduled_time: string;
  category: 'smart_standard' | 'smart_confort' | 'smart_plus';
  estimated_price: number;
  status: 'scheduled' | 'cancelled' | 'completed';
  created_at?: string;
}

interface ScheduledRidesProps {
  className?: string;
}

export function ScheduledRides({ className = "" }: ScheduledRidesProps) {
  const { state, setCurrentScreen } = useAppState();
  const [scheduledRides, setScheduledRides] = useState<ScheduledRide[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [newRide, setNewRide] = useState<Partial<ScheduledRide>>({
    pickup_address: '',
    pickup_lat: -4.3276,
    pickup_lng: 15.3136,
    dropoff_address: '',
    dropoff_lat: -4.3276,
    dropoff_lng: 15.3136,
    scheduled_date: '',
    scheduled_time: '',
    category: 'smart_standard',
    estimated_price: 20000,
    status: 'scheduled'
  });

  // Charger les courses planifiées
  useEffect(() => {
    loadScheduledRides();
  }, [state.currentUser]);

  const loadScheduledRides = async () => {
    if (!state.currentUser?.id) return;

    try {
      const { data, error } = await supabase
        .from('scheduled_rides')
        .select('*')
        .eq('user_id', state.currentUser.id)
        .eq('status', 'scheduled')
        .order('scheduled_date', { ascending: true })
        .order('scheduled_time', { ascending: true });

      if (error) throw error;

      if (data) {
        setScheduledRides(data);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des courses planifiées:', error);
    }
  };

  const handleAddScheduledRide = async () => {
    if (!state.currentUser?.id) {
      toast.error('Vous devez être connecté');
      return;
    }

    if (!newRide.pickup_address || !newRide.dropoff_address || !newRide.scheduled_date || !newRide.scheduled_time) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    // Vérifier que la date est future
    const scheduledDateTime = new Date(`${newRide.scheduled_date}T${newRide.scheduled_time}`);
    if (scheduledDateTime < new Date()) {
      toast.error('La date doit être dans le futur');
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('scheduled_rides')
        .insert({
          user_id: state.currentUser.id,
          pickup_address: newRide.pickup_address,
          pickup_lat: newRide.pickup_lat,
          pickup_lng: newRide.pickup_lng,
          dropoff_address: newRide.dropoff_address,
          dropoff_lat: newRide.dropoff_lat,
          dropoff_lng: newRide.dropoff_lng,
          scheduled_date: newRide.scheduled_date,
          scheduled_time: newRide.scheduled_time,
          category: newRide.category,
          estimated_price: newRide.estimated_price,
          status: 'scheduled'
        });

      if (error) throw error;

      toast.success('Course planifiée avec succès');
      await loadScheduledRides();
      handleCloseDialog();
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la planification');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelRide = async (id: string) => {
    if (!confirm('Annuler cette course planifiée ?')) return;

    try {
      const { error } = await supabase
        .from('scheduled_rides')
        .update({ status: 'cancelled' })
        .eq('id', id);

      if (error) throw error;

      toast.success('Course annulée');
      await loadScheduledRides();
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de l\'annulation');
    }
  };

  const handleCloseDialog = () => {
    setShowAddDialog(false);
    setNewRide({
      pickup_address: '',
      pickup_lat: -4.3276,
      pickup_lng: 15.3136,
      dropoff_address: '',
      dropoff_lat: -4.3276,
      dropoff_lng: 15.3136,
      scheduled_date: '',
      scheduled_time: '',
      category: 'smart_standard',
      estimated_price: 20000,
      status: 'scheduled'
    });
  };

  const formatDateTime = (date: string, time: string) => {
    const dateObj = new Date(`${date}T${time}`);
    const now = new Date();
    const diffHours = Math.floor((dateObj.getTime() - now.getTime()) / (1000 * 60 * 60));

    const dateStr = dateObj.toLocaleDateString('fr-FR', { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'short' 
    });
    const timeStr = dateObj.toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    let urgencyClass = 'text-gray-600';
    if (diffHours < 2) urgencyClass = 'text-red-600';
    else if (diffHours < 24) urgencyClass = 'text-orange-600';

    return { dateStr, timeStr, urgencyClass };
  };

  const getCategoryLabel = (category: string) => {
    const categories = {
      'smart_standard': { label: 'Standard', price: '20,000 CDF' },
      'smart_confort': { label: 'Confort', price: '25,000 CDF' },
      'smart_plus': { label: 'Plus', price: '30,000 CDF' }
    };
    return categories[category as keyof typeof categories] || categories.smart_standard;
  };

  return (
    <div className={className}>
      {/* En-tête */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm text-gray-900">Courses planifiées</h3>
          <p className="text-xs text-gray-500">
            {scheduledRides.length} course{scheduledRides.length > 1 ? 's' : ''} à venir
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setShowAddDialog(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-1" />
          Planifier
        </Button>
      </div>

      {/* Liste des courses planifiées */}
      {scheduledRides.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-300" />
          <p className="text-sm">Aucune course planifiée</p>
          <p className="text-xs mt-1">Planifiez vos courses à l'avance</p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {scheduledRides.map((ride) => {
              const { dateStr, timeStr, urgencyClass } = formatDateTime(ride.scheduled_date, ride.scheduled_time);
              const category = getCategoryLabel(ride.category);

              return (
                <motion.div
                  key={ride.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
                >
                  {/* Date et heure */}
                  <div className={`flex items-center gap-2 mb-3 ${urgencyClass}`}>
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm">
                      {dateStr} à {timeStr}
                    </span>
                  </div>

                  {/* Itinéraire */}
                  <div className="space-y-2 mb-3">
                    <div className="flex items-start gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500 mt-1 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-xs text-gray-500">Départ</p>
                        <p className="text-sm text-gray-900">{ride.pickup_address}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500 mt-1 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-xs text-gray-500">Arrivée</p>
                        <p className="text-sm text-gray-900">{ride.dropoff_address}</p>
                      </div>
                    </div>
                  </div>

                  {/* Catégorie et prix */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded">
                      {category.label}
                    </span>
                    <span className="text-sm text-gray-900">
                      ~{ride.estimated_price.toLocaleString()} CDF
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (ride.id) handleCancelRide(ride.id);
                      }}
                      className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Annuler
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                    >
                      Voir détails
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Dialog de planification */}
      <Dialog open={showAddDialog} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Planifier une course</DialogTitle>
            <DialogDescription>
              Programmez votre course à l'avance
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Départ */}
            <div>
              <Label>Point de départ</Label>
              <GooglePlacesSearch
                placeholder="Adresse de départ..."
                value={newRide.pickup_address}
                onSelectPlace={(place) => {
                  setNewRide({
                    ...newRide,
                    pickup_address: place.description,
                    pickup_lat: place.lat,
                    pickup_lng: place.lng
                  });
                }}
                className="mt-1"
              />
            </div>

            {/* Destination */}
            <div>
              <Label>Destination</Label>
              <GooglePlacesSearch
                placeholder="Adresse de destination..."
                value={newRide.dropoff_address}
                onSelectPlace={(place) => {
                  setNewRide({
                    ...newRide,
                    dropoff_address: place.description,
                    dropoff_lat: place.lat,
                    dropoff_lng: place.lng
                  });
                }}
                className="mt-1"
              />
            </div>

            {/* Date */}
            <div>
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                min={new Date().toISOString().split('T')[0]}
                value={newRide.scheduled_date}
                onChange={(e) => setNewRide({ ...newRide, scheduled_date: e.target.value })}
                className="mt-1"
              />
            </div>

            {/* Heure */}
            <div>
              <Label htmlFor="time">Heure</Label>
              <Input
                id="time"
                type="time"
                value={newRide.scheduled_time}
                onChange={(e) => setNewRide({ ...newRide, scheduled_time: e.target.value })}
                className="mt-1"
              />
            </div>

            {/* Catégorie */}
            <div>
              <Label>Catégorie de véhicule</Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {[
                  { value: 'smart_standard', label: 'Standard', price: '20K' },
                  { value: 'smart_confort', label: 'Confort', price: '25K' },
                  { value: 'smart_plus', label: 'Plus', price: '30K' }
                ].map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setNewRide({ 
                      ...newRide, 
                      category: cat.value as any,
                      estimated_price: parseInt(cat.price.replace('K', '000'))
                    })}
                    className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all ${
                      newRide.category === cat.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-sm">{cat.label}</span>
                    <span className="text-xs text-gray-500">{cat.price} CDF</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Estimation */}
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-xs text-gray-600 mb-1">Prix estimé par palier</p>
              <p className="text-lg text-blue-600">
                ~{newRide.estimated_price?.toLocaleString()} CDF
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Le prix final dépendra de la durée réelle du trajet
              </p>
            </div>

            {/* Boutons */}
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={handleCloseDialog}
                className="flex-1"
              >
                Annuler
              </Button>
              <Button
                onClick={handleAddScheduledRide}
                disabled={isLoading}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {isLoading ? 'Enregistrement...' : 'Planifier'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}