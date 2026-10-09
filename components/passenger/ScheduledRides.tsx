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
import { YangoStyleSearch } from './YangoStyleSearch';
import { paymentService } from '../../lib/payment-service';
import type { PaymentInitData } from '../../lib/payment-providers/base-provider';

// Réseaux Mobile Money (mêmes moyens de paiement que dans l'application)
const DEPOSIT_NETWORKS = [
  { id: 'orange_money', name: 'Orange Money (*144#)' },
  { id: 'mpesa', name: 'M-Pesa Vodacom (*150#)' },
  { id: 'airtel_money', name: 'Airtel Money (*501#)' },
  { id: 'afrimoney', name: 'Afrimoney (*555#)' },
];
import { supabase } from '../../lib/supabase';

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

  // Acompte 50% + CGU location (réservation ferme)
  const [cguAccepted, setCguAccepted] = useState(false);
  const [depositMethod, setDepositMethod] = useState<'mobile_money' | 'card' | 'wallet' | 'cash'>('mobile_money');
  const [depositNetwork, setDepositNetwork] = useState(DEPOSIT_NETWORKS[0].id);
  const [depositPhone, setDepositPhone] = useState('');
  const [payingDeposit, setPayingDeposit] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const depositAmount = Math.round((newRide.estimated_price || 0) * 0.5);

  const DEPOSIT_METHODS = [
    { value: 'mobile_money' as const, icon: '📱', label: 'Mobile Money' },
    { value: 'card' as const, icon: '💳', label: 'Carte bancaire' },
    { value: 'wallet' as const, icon: '👛', label: 'Portefeuille' },
    { value: 'cash' as const, icon: '💵', label: 'Espèces' },
  ];

  // Motif de réservation (guide l'utilisateur, tarification inchangée)
  const [purpose, setPurpose] = useState<null | 'journee' | 'aeroport' | 'hors-ville'>(null);
  const PURPOSES = [
    {
      value: 'journee' as const,
      icon: '📅',
      title: 'Location à la journée',
      desc: 'Véhicule + chauffeur toute la journée',
      hint: 'Idéal Business : votre chauffeur reste à disposition toute la journée.',
      category: 'smart_business' as const,
      price: 450000,
    },
    {
      value: 'aeroport' as const,
      icon: '✈️',
      title: 'Aéroport',
      desc: 'Transfert depuis ou vers N’djili',
      hint: 'Prise en charge ou dépôt à l’aéroport de N’djili à l’heure choisie.',
      category: 'smart_confort' as const,
      price: 25000,
    },
    {
      value: 'hors-ville' as const,
      icon: '🛣️',
      title: 'Hors ville',
      desc: 'Déplacement en dehors de Kinshasa',
      hint: 'Forfait journée appliqué (zone C), chauffeur dédié pour le trajet.',
      category: 'smart_plus' as const,
      price: 30000,
    },
  ];

  // Charger les courses réservées
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
        .in('status', ['scheduled', 'confirmed'])
        .order('scheduled_date', { ascending: true })
        .order('scheduled_time', { ascending: true });

      if (error) throw error;

      if (data) {
        setScheduledRides(data);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des courses réservées:', error);
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

    // CGU location obligatoires : la réservation n'est ferme qu'après acceptation
    if (!cguAccepted) {
      toast.error('Veuillez accepter les conditions générales de location du véhicule');
      return;
    }

    // Espèces : pas d'encaissement à distance → réservation enregistrée, non ferme
    if (depositMethod === 'cash') {
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
        toast.info(`Demande enregistrée : réglez l\u2019acompte de ${depositAmount.toLocaleString()} CDF en espèces pour confirmer la réservation`);
        setCguAccepted(false);
        await loadScheduledRides();
        handleCloseDialog();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Erreur lors de la réservation');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Portefeuille : débit direct du solde
    if (depositMethod === 'wallet') {
      setIsLoading(true);
      try {
        const resp = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/passengers/${state.currentUser?.id}/wallet/debit`,
          {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${publicAnonKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: depositAmount, reason: 'Acompte 50% réservation' }),
          }
        );
        const data = await resp.json();
        if (!resp.ok || !data.success) {
          const msg = data.error || 'Débit impossible';
          throw new Error(
            /insuffisant/i.test(msg)
              ? `Solde portefeuille insuffisant (${(data.balance ?? 0).toLocaleString()} CDF). Rechargez votre portefeuille ou choisissez Espèces.`
              : msg
          );
        }
        await insertConfirmedRide();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Paiement par portefeuille impossible');
        setIsLoading(false);
      }
      return;
    }

    // Mobile Money / Carte : téléphone requis uniquement pour Mobile Money
    const phoneDigits = (depositPhone || '').replace(/\D/g, '');
    if (depositMethod === 'mobile_money' && phoneDigits.length < 9) {
      toast.error('Numéro Mobile Money invalide pour payer l\u2019acompte');
      return;
    }

    setIsLoading(true);
    setPayingDeposit(true);

    try {
      // 1. Payer l'acompte de 50% via le moyen existant (Flutterwave)
      const network = DEPOSIT_NETWORKS.find((n) => n.id === depositNetwork);
      const paymentData: PaymentInitData = {
        amount: depositAmount,
        currency: 'CDF',
        method: depositMethod === 'card' ? 'card' : 'mobile_money',
        customerEmail: state.currentUser?.email || 'passager@smartcabb.com',
        customerName: state.currentUser?.name || 'Passager',
        customerPhone: depositPhone,
        reference: `RES_DEPOSIT_${state.currentUser?.id}_${Date.now()}`,
        description: `Acompte 50% réservation SmartCabb (${depositAmount.toLocaleString()} CDF via ${network?.name})`,
        passengerId: state.currentUser?.id,
        metadata: {
          type: 'reservation_deposit',
          network: depositNetwork,
          networkName: network?.name,
          scheduled_date: newRide.scheduled_date,
          scheduled_time: newRide.scheduled_time,
        }
      };

      const result = await paymentService.initPayment(paymentData);
      if (!result.success || !result.paymentUrl) {
        // Message technique brut (ex: SERVER_ERROR) → consigne claire côté client
        const raw = `${result.message || ''} ${result.error || ''}`;
        const gatewayDown = /SERVER_ERROR|NOT_CONFIGURED|INVALID_RESPONSE|INIT_ERROR|NETWORK_ERROR|Route not found|404|500/i.test(raw);
        throw new Error(
          gatewayDown
            ? 'Paiement Mobile Money / Carte indisponible pour le moment. Choisissez Espèces ou Portefeuille, ou appelez le +243 960 624 008.'
            : (result.message && !/^[A-Z_]+$/.test(result.message) ? result.message : 'Paiement refusé. Vérifiez le numéro et réessayez, ou choisissez Espèces.')
        );
      }

      const width = 500, height = 700;
      const left = (window.screen.width - width) / 2;
      const top = (window.screen.height - height) / 2;
      const paymentWindow = window.open(
        result.paymentUrl,
        'SmartCabbDeposit',
        `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
      );
      if (!paymentWindow) {
        throw new Error('Fenêtre de paiement bloquée par le navigateur');
      }

      // 2. Attendre la confirmation du paiement (vérification toutes les 2s, 60s max)
      const depositPaid = await new Promise<boolean>((resolve) => {
        let attempts = 0;
        const iv = setInterval(async () => {
          attempts++;
          try {
            if (paymentWindow.closed) {
              clearInterval(iv);
              resolve(false);
              return;
            }
            if (!result.transactionId) return;
            const verification = await paymentService.verifyPayment(result.transactionId);
            if (verification.isValid && (verification.status === 'successful' || verification.status === 'completed')) {
              clearInterval(iv);
              if (!paymentWindow.closed) paymentWindow.close();
              resolve(true);
            } else if (verification.status === 'failed') {
              clearInterval(iv);
              if (!paymentWindow.closed) paymentWindow.close();
              resolve(false);
            }
          } catch {}
          if (attempts >= 30) {
            clearInterval(iv);
            if (!paymentWindow.closed) paymentWindow.close();
            resolve(false);
          }
        }, 2000);
      });

      if (!depositPaid) {
        toast.error('Acompte non reçu : la réservation n\u2019est pas confirmée');
        return;
      }

      // 3. Acompte reçu → réservation FERME
      await insertConfirmedRide();
    } catch (error) {
      console.error('Erreur:', error);
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la réservation');
    } finally {
      setIsLoading(false);
      setPayingDeposit(false);
    }
  };

  const insertConfirmedRide = async () => {
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
        status: 'confirmed'
      });

    if (error) throw error;

    toast.success(`Réservation confirmée : acompte de ${depositAmount.toLocaleString()} CDF reçu (solde à régler : ${(newRide.estimated_price! - depositAmount).toLocaleString()} CDF)`);
    setCguAccepted(false);
    await loadScheduledRides();
    handleCloseDialog();
  };

  const handleCancelRide = async (id: string, scheduledDate: string, scheduledTime: string) => {
    const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
    const now = new Date();
    const hoursUntilRide = (scheduledDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilRide < 12) {
      toast.error('Annulation impossible moins de 12h avant la course. Contactez le support.');
      return;
    }

    if (!confirm('Annuler cette course réservée ?')) return;

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

  // 🚗 Miniature photo par catégorie (style Yango : petit format rond)
  const CATEGORY_IMAGES: Record<string, string> = {
    'smart_standard': '/vehicles/smartcabb_standard/Standard_1.jpg',
    'smart_confort': '/vehicles/smartcabb_confort/Confort_1.jpg',
    'smart_plus': '/vehicles/smartcabb_familiale/Familiale_1.jpg',
    'smart_business': '/vehicles/smartcabb_business/Business_1.jpg'
  };
  const getCategoryImage = (category: string) =>
    CATEGORY_IMAGES[category] || CATEGORY_IMAGES.smart_standard;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* En-tête */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setCurrentScreen('profile')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h3 className="text-sm text-gray-900">Courses réservées</h3>
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
          Réserver une course
        </Button>
      </div>

      {/* Liste des courses réservées */}
      {scheduledRides.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-300" />
          <p className="text-sm">Aucune course réservée</p>
          <p className="text-xs mt-1">Réservez vos courses à l'avance</p>
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
                    {ride.status === 'confirmed' ? (
                      <span className="text-[10px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                        Confirmée (acompte reçu)
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full">
                        En attente
                      </span>
                    )}
                  </div>

                  {/* Catégorie avec badge prix */}
                  <div className="flex items-center justify-between mb-2 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-2.5 border border-blue-200">
                    <div className="flex items-center gap-2">
                      <img
                        src={getCategoryImage(ride.category)}
                        alt={category.label}
                        className="w-8 h-8 rounded-full object-cover border border-blue-200 shadow-sm"
                        loading="lazy"
                      />
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
            <DialogTitle>Réserver une course</DialogTitle>
            <DialogDescription>
              Réservez votre course à l'avance
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Motif de réservation */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Motif de réservation</Label>
              <div className="grid grid-cols-3 gap-2">
                {PURPOSES.map((p) => {
                  const selected = purpose === p.value;
                  return (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => {
                        setPurpose(p.value);
                        setNewRide({ ...newRide, category: p.category, estimated_price: p.price });
                      }}
                      className={`rounded-xl border-2 p-2.5 text-left transition-all ${
                        selected
                          ? 'border-purple-500 bg-purple-50 shadow-md'
                          : 'border-gray-200 hover:border-purple-300'
                      }`}
                    >
                      <div className="text-xl mb-1">{p.icon}</div>
                      <div className={`text-xs font-bold leading-tight ${selected ? 'text-purple-700' : 'text-gray-800'}`}>
                        {p.title}
                      </div>
                      <div className="text-[10px] text-gray-500 leading-tight mt-0.5">{p.desc}</div>
                    </button>
                  );
                })}
              </div>
              {purpose && (
                <p className="text-xs text-purple-700 bg-purple-50 border border-purple-100 rounded-lg px-3 py-2 mt-2">
                  {PURPOSES.find((p) => p.value === purpose)?.hint}
                </p>
              )}
            </div>

            {/* Départ */}
            <div>
              <Label>Point de départ</Label>
              <div className="mt-1">
              <YangoStyleSearch
                placeholder="Adresse de départ..."
                value={newRide.pickup_address}
                onChange={(v) => setNewRide({ ...newRide, pickup_address: v })}
                onSelect={(r) => {
                  setNewRide({
                    ...newRide,
                    pickup_address: r.description || r.name,
                    pickup_lat: r.coordinates.lat,
                    pickup_lng: r.coordinates.lng
                  });
                }}
              />
              </div>
            </div>

            {/* Destination */}
            <div>
              <Label>Destination</Label>
              <div className="mt-1">
              <YangoStyleSearch
                placeholder="Adresse de destination..."
                value={newRide.dropoff_address}
                onChange={(v) => setNewRide({ ...newRide, dropoff_address: v })}
                onSelect={(r) => {
                  setNewRide({
                    ...newRide,
                    dropoff_address: r.description || r.name,
                    dropoff_lat: r.coordinates.lat,
                    dropoff_lng: r.coordinates.lng
                  });
                }}
              />
              </div>
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

            {/* Acompte 50% + CGU location */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-3">
              <p className="text-xs text-gray-700">
                La réservation devient <strong>ferme</strong> après versement d'un acompte de <strong>50%</strong>
                (<strong>{depositAmount.toLocaleString()} CDF</strong>, solde de {(newRide.estimated_price! - depositAmount).toLocaleString()} CDF à régler) et acceptation des conditions de location.
              </p>
              <label className="flex items-start gap-2 text-xs text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={cguAccepted}
                  onChange={(e) => setCguAccepted(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-green-600"
                />
                <span>J'ai lu et j'accepte les conditions générales de location du véhicule</span>
              </label>

              {/* Moyen de paiement */}
              <div>
                <Label className="text-xs">Moyen de paiement de l'acompte</Label>
                <div className="grid grid-cols-4 gap-1.5 mt-1.5">
                  {DEPOSIT_METHODS.map((m) => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => setDepositMethod(m.value)}
                      className={`rounded-xl border-2 py-2 px-1 text-center transition-all ${
                        depositMethod === m.value
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="text-xl">{m.icon}</div>
                      <div className={`text-[10px] font-semibold leading-tight mt-0.5 ${depositMethod === m.value ? 'text-green-700' : 'text-gray-600'}`}>
                        {m.label}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Réseaux : uniquement si Mobile Money */}
              {depositMethod === 'mobile_money' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Réseau Mobile Money</Label>
                    <select
                      value={depositNetwork}
                      onChange={(e) => setDepositNetwork(e.target.value)}
                      className="mt-1 w-full px-2 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                    >
                      {DEPOSIT_NETWORKS.map((n) => (
                        <option key={n.id} value={n.id}>{n.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs">Numéro payeur</Label>
                    <Input
                      value={depositPhone}
                      onChange={(e) => setDepositPhone(e.target.value)}
                      placeholder="0812345678"
                      inputMode="tel"
                      className="mt-1"
                    />
                  </div>
                </div>
              )}
              {depositMethod === 'card' && (
                <p className="text-xs text-gray-600 bg-white border border-gray-200 rounded-lg px-3 py-2">
                  Paiement sécurisé par carte via la fenêtre Flutterwave.
                </p>
              )}
              {depositMethod === 'wallet' && (
                <p className="text-xs text-gray-600 bg-white border border-gray-200 rounded-lg px-3 py-2">
                  {depositAmount.toLocaleString()} CDF seront débités de votre portefeuille SmartCabb.
                </p>
              )}
              {depositMethod === 'cash' && (
                <p className="text-xs text-gray-600 bg-white border border-gray-200 rounded-lg px-3 py-2">
                  Réglez l'acompte en espèces pour confirmer : la réservation reste en attente jusque-là.
                </p>
              )}
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
                {payingDeposit ? 'Paiement de l\u2019acompte...' : isLoading ? 'Enregistrement...' : depositMethod === 'cash' ? 'Enregistrer la demande' : `Payer l\u2019acompte (${depositAmount.toLocaleString()} CDF)`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog détails */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Détails de la course</DialogTitle>
            <DialogDescription>
              Informations complètes de la course réservée
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
                    <img
                      src={getCategoryImage(detailsRide.category)}
                      alt={getCategoryLabel(detailsRide.category).label}
                      className="w-10 h-10 rounded-full object-cover border border-blue-200 shadow-sm"
                    />
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