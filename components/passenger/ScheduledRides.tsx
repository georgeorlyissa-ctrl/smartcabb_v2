import { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Plus, Calendar, Trash2, ArrowLeft, ChevronRight } from '../../lib/icons';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { motion, AnimatePresence } from '../../lib/motion';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { useAppState } from '../../hooks/useAppState';
import { useTranslation } from '../../hooks/useTranslation';
import { toast } from '../../lib/toast';
import { supabase } from '../../lib/supabase';
import { GooglePlacesSearch } from './GooglePlacesSearch';

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
  category: 'smart_standard' | 'smart_confort' | 'smart_plus' | 'smart_business';
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
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [detailsRide, setDetailsRide] = useState<ScheduledRide | null>(null);
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
    category: 'smart_plus',
    estimated_price: 30000,
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

  const handleCancelRide = async (id: string, scheduledDate: string, scheduledTime: string) => {
    const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
    const now = new Date();
    const hoursUntilRide = (scheduledDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilRide < 12) {
      toast.error('Annulation impossible moins de 12h avant la course. Contactez le support.');
      return;
    }

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
      category: 'smart_plus',
      estimated_price: 30000,
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
    const categories: Record<string, { label: string; price: string }> = {
      'smart_standard': { label: 'Standard', price: '20,000 CDF' },
      'smart_confort': { label: 'Confort', price: '25,000 CDF' },
      'smart_plus': { label: 'Plus', price: '30,000 CDF' },
      'smart_business': { label: 'Business', price: '450,000 CDF' }
    };
    return categories[category] || categories.smart_standard;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* En-tête */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setCurrentScreen('profile')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h3 className="text-sm text-gray-900">Courses planifiées</h3>
            <p className="text-xs text-gray-500">
              {scheduledRides.length} course{scheduledRides.length > 1 ? 's' : ''} à venir
            </p>
          </div>
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
                  <div className={`flex items-center gap-2 mb-2 ${urgencyClass}`}>
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      {dateStr} à {timeStr}
                    </span>
                  </div>

                  {/* Catégorie avec badge prix */}
                  <div className="flex items-center justify-between mb-2 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-2.5 border border-blue-200">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                        <span className="text-white text-sm">🚗</span>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-blue-900">{category.label}</p>
                        <p className="text-[10px] text-blue-600">
                          {ride.category === 'smart_business' ? 'VIP · Rafraîchissements' : 'Climatisation · GPS'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-blue-900">
                        ~{ride.estimated_price.toLocaleString()} CDF
                      </p>
                      <p className="text-[10px] text-blue-600">Prix estimé</p>
                    </div>
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

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (ride.id) handleCancelRide(ride.id, ride.scheduled_date, ride.scheduled_time);
                      }}
                      className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Annuler
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                      onClick={() => { setDetailsRide(ride); setShowDetailsDialog(true); }}
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
              <Label className="text-sm font-medium mb-2 block">Catégorie de véhicule</Label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'smart_standard', label: 'Standard', price: 20000, features: '3 places · Climatisation · GPS', capacity: 3 },
                  { value: 'smart_confort', label: 'Confort', price: 25000, features: '3 places · Data · Clim Premium', capacity: 3 },
                  { value: 'smart_plus', label: 'Plus (Familiale)', price: 30000, features: '6 places · Data · Grand espace', capacity: 6 },
                  { value: 'smart_business', label: 'Business', price: 450000, features: 'VIP · Data · Rafraîchissements', capacity: 4 }
                ].map((cat) => {
                  const isSelected = newRide.category === cat.value;
                  return (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setNewRide({ 
                        ...newRide, 
                        category: cat.value as any,
                        estimated_price: cat.price
                      })}
                      className={`relative w-full rounded-xl border-2 transition-all duration-300 p-3 text-left ${
                        isSelected
                          ? 'border-secondary bg-secondary/5 shadow-lg shadow-secondary/20 ring-2 ring-secondary/30'
                          : 'border-border hover:border-secondary/50 hover:shadow-md'
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-secondary rounded-full flex items-center justify-center shadow-lg">
                          <span className="text-white text-xs font-bold">✓</span>
                        </div>
                      )}
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                          <span className={`text-sm font-bold ${isSelected ? 'text-secondary' : 'text-foreground'}`}>
                            {cat.label}
                          </span>
                          {cat.value === 'smart_plus' || cat.value === 'smart_business' ? (
                            <span className="text-[8px] text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded-full font-medium">
                              Réservation
                            </span>
                          ) : null}
                        </div>
                        <span className="text-[10px] text-muted-foreground">{cat.features}</span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-sm font-bold ${isSelected ? 'text-secondary' : 'text-primary'}`}>
                            {cat.price.toLocaleString()}
                          </span>
                          <span className="text-[10px] text-muted-foreground">CDF</span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <span>👤 {cat.capacity} places</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
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

      {/* Dialog détails */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Details de la course</DialogTitle>
            <DialogDescription>
              Informations completes de la course planifiee
            </DialogDescription>
          </DialogHeader>
          {detailsRide && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="w-4 h-4" />
                {new Date(`${detailsRide.scheduled_date}T${detailsRide.scheduled_time}`).toLocaleDateString('fr-FR', {
                  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                })} a {detailsRide.scheduled_time}
              </div>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500 mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Depart</p>
                    <p className="text-sm">{detailsRide.pickup_address}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500 mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Arrivee</p>
                    <p className="text-sm">{detailsRide.dropoff_address}</p>
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-lg">🚗</span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-blue-900">
                        {getCategoryLabel(detailsRide.category).label}
                      </p>
                      <p className="text-xs text-blue-600">
                        {detailsRide.category === 'smart_standard' && 'Standard · 3 places'}
                        {detailsRide.category === 'smart_confort' && 'Confort · 3 places · Data'}
                        {detailsRide.category === 'smart_plus' && 'Familiale · 6 places · Grand espace'}
                        {detailsRide.category === 'smart_business' && 'Business VIP · 4 places · Rafraîchissements'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-blue-900">
                      {detailsRide.estimated_price.toLocaleString()} CDF
                    </p>
                    <p className="text-xs text-blue-600">Prix estimé</p>
                  </div>
                </div>
              </div>
              {detailsRide.id && (
                <div className="text-xs text-gray-400 bg-gray-50 rounded-lg p-2 text-center">
                  ID réservation: {detailsRide.id.substring(0, 8)}...
                </div>
              )}
              <Button
                className="w-full"
                onClick={() => setShowDetailsDialog(false)}
              >
                Fermer
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}