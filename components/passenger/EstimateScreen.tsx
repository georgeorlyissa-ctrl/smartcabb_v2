import { useState, useEffect } from 'react';
import { motion } from '../../lib/motion';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { useAppState } from '../../hooks/useAppState';
import { useTranslation } from '../../hooks/useTranslation';
import { toast } from '../../lib/toast';
import { ArrowLeft, Car, Users, Clock, MapPin, Info, Sun, Moon } from '../../lib/icons';
import { VehicleCategory, PromoCode } from '../../types';
import { VEHICLE_PRICING, convertUSDtoCDF, formatCDF, isDayTime } from '../../lib/pricing';
import { calculateRoute } from '../../lib/distance-calculator';
import { getCurrentTrafficConditions, calculateDuration } from '../../lib/duration-calculator';
import { RouteMapPreview } from '../RouteMapPreview';
import { VehicleImageCarousel } from '../VehicleImageCarousel';
import { PassengerCountSelector } from '../PassengerCountSelector';
import { PromoCodeInput } from '../PromoCodeInput';
import { BookForSomeoneElse } from './BookForSomeoneElse'; // 🆕 Commander pour quelqu'un d'autre
import { projectId, publicAnonKey } from '../../utils/supabase/info';

// 🚗 CHEMINS DES IMAGES DE VÉHICULES (pour GitHub/Vercel)
// ⚠️ Ces chemins pointent vers /public/vehicles/
const standardVehicle1 = '/vehicles/smartcabb_standard/Standard_1.png';
const standardVehicle2 = '/vehicles/smartcabb_standard/Standard_2.png';
const standardVehicle3 = '/vehicles/smartcabb_standard/Standard_3.png';
const standardVehicle4 = '/vehicles/smartcabb_standard/Standard_4.png';
const standardVehicle5 = '/vehicles/smartcabb_standard/Stadard_5.png';
const standardVehicle6 = '/vehicles/smartcabb_standard/Standard_6.png';

const confortVehicle1 = '/vehicles/smartcabb_confort/confort 1.png';
const confortVehicle2 = '/vehicles/smartcabb_confort/Confort_2.png';
const confortVehicle3 = '/vehicles/smartcabb_confort/Confort_3.png';

const plusVehicle1 = '/vehicles/smartcabb_familiale/Familiale_1.png';
const plusVehicle2 = '/vehicles/smartcabb_familiale/Familiale_2.png';
const plusVehicle3 = '/vehicles/smartcabb_familiale/Familiale_3.png';
const plusVehicle4 = '/vehicles/smartcabb_familiale/Familiale_4.png';

const businessVehicle1 = '/vehicles/smartcabb_business/Bussiness_1.png';
const businessVehicle2 = '/vehicles/smartcabb_business/Bussiness_2.png';
const businessVehicle3 = '/vehicles/smartcabb_business/Bussiness_3.png';
const businessVehicle4 = '/vehicles/smartcabb_business/Bussiness_4.png';
const businessVehicle5 = '/vehicles/smartcabb_business/Bussiness_5.png';
const businessVehicle6 = '/vehicles/smartcabb_business/Business_6.png';

export function EstimateScreen() {
  const { t } = useTranslation();
  const { setCurrentScreen, createRide, state, calculateDistance } = useAppState();
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleCategory>('smart_standard');
  const [passengerCount, setPassengerCount] = useState(1);
  const [appliedPromo, setAppliedPromo] = useState<PromoCode | null>(null);
  const [basePrice, setBasePrice] = useState(12500);
  const [estimatedDuration, setEstimatedDuration] = useState(15);

  // 🔒 Désactive le bouton après 1 clic (anti double-soumission)
  const [isBooking, setIsBooking] = useState(false);
  
  // 🆕 Commander pour quelqu'un d'autre
  const [showBookForOther, setShowBookForOther] = useState(false);
  const [beneficiary, setBeneficiary] = useState<{ name: string; phone: string } | null>(null);
  
  // 🆕 État pour le calcul OSRM (async)
  const [routeInfo, setRouteInfo] = useState<{
    distance: number;
    duration: number;
    distanceText: string;
    durationText: string;
  } | null>(null);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(true);
  
  // ❌ SUPPRESSION DES DONNÉES PAR DÉFAUT EN MÉMOIRE
  // ✅ Utiliser UNIQUEMENT les vraies données de l'utilisateur
  const pickup = state.pickup;
  const destination = state.destination;
  
  // 🚨 REDIRECTION : Si pas de pickup ou destination, retourner à la carte
  useEffect(() => {
    if (!pickup || !destination) {
      console.warn('⚠️ Pas de pickup ou destination, redirection vers la carte');
      setCurrentScreen('map');
    }
  }, [pickup, destination, setCurrentScreen]);
  
  // Si pas de données, ne rien afficher (on va être redirigé)
  if (!pickup || !destination) {
    return null;
  }
  
  const distanceKm = routeInfo?.distance || (calculateDistance ? calculateDistance(pickup, destination) : 10.0);
  
  const trafficCondition = getCurrentTrafficConditions();  // ✅ CORRECTION : Pour affichage UI (emoji, color, description)
  
  // Récupérer les instructions de prise en charge (point de repère)
  const pickupInstructions = state.pickupInstructions || '';
  
  // 🛣️ CALCUL OSRM ASYNC AU CHARGEMENT
  useEffect(() => {
    const fetchRoute = async () => {
      try {
        setIsCalculatingRoute(true);
        console.log('🛣️ Calcul itinéraire OSRM...');
        
        const result = await calculateRoute(
          pickup.lat,
          pickup.lng,
          destination.lat,
          destination.lng
        );
        
        setRouteInfo(result);
        
        // ✅ CORRECTION : La durée est déjà ajustée dans calculateRoute()
        // Pas besoin de réajuster ici (éviter double multiplication)
        setEstimatedDuration(result.duration);
        
        console.log(`✅ Itinéraire calculé: ${result.distanceText} en ${result.durationText}`);
      } catch (error) {
        console.error('❌ Erreur calcul itinéraire:', error);
        // Fallback: utiliser distance Haversine
        const fallbackDist = calculateDistance ? calculateDistance(pickup, destination) : 10.0;
        
        // 🎯 CORRECTION : Utiliser le même fallback intelligent que dans calculateRoute()
        // Distance réelle = distance à vol d'oiseau × 1.9
        const estimatedRealDistance = fallbackDist * 1.9;
        const fallbackDuration = calculateDuration(estimatedRealDistance);
        
        setRouteInfo({
          distance: estimatedRealDistance,
          duration: fallbackDuration,
          distanceText: `${estimatedRealDistance.toFixed(1)} km`,
          durationText: `${fallbackDuration} min`
        });
        setEstimatedDuration(fallbackDuration);
      } finally {
        setIsCalculatingRoute(false);
      }
    };
    
    fetchRoute();
  }, [pickup.lat, pickup.lng, destination.lat, destination.lng]);
  
  console.log('📍 EstimateScreen - Pickup:', pickup.address, `(${pickup.lat}, ${pickup.lng})`);
  console.log('📍 EstimateScreen - Point de repère:', pickupInstructions || 'Aucun');
  console.log('🎯 EstimateScreen - Destination:', destination.address, `(${destination.lat}, ${destination.lng})`);
  console.log('📏 Distance calculée:', (distanceKm || 0).toFixed(2), 'km');
  console.log('🔢 Détails calcul - Pickup Lat:', pickup.lat, 'Lng:', pickup.lng);
  console.log('🔢 Détails calcul - Destination Lat:', destination.lat, 'Lng:', destination.lng);

  const vehicles = [
    {
      id: 'smart_standard' as VehicleCategory,
      name: 'SmartCabb Standard',
      description: `${VEHICLE_PRICING.smart_standard.capacity} places · Climatisation · GPS`,
      capacity: VEHICLE_PRICING.smart_standard.capacity,
      icon: Car,
      color: 'bg-gray-100',
      hourlyRateUSD: VEHICLE_PRICING.smart_standard.pricing.course_heure.jour.usd,
      nightRateUSD: VEHICLE_PRICING.smart_standard.pricing.course_heure.nuit.usd,
      hourlyRateCDF: convertUSDtoCDF(VEHICLE_PRICING.smart_standard.pricing.course_heure.jour.usd),
      rateText: `${VEHICLE_PRICING.smart_standard.pricing.course_heure.jour.usd}$/h`,
      rateTextNight: `${VEHICLE_PRICING.smart_standard.pricing.course_heure.nuit.usd}$/h`,
      images: [standardVehicle1, standardVehicle2, standardVehicle3, standardVehicle4, standardVehicle5, standardVehicle6]
    },
    {
      id: 'smart_confort' as VehicleCategory,
      name: 'SmartCabb Confort',
      description: `${VEHICLE_PRICING.smart_confort.capacity} places · Data Internet · Clim Premium`,
      capacity: VEHICLE_PRICING.smart_confort.capacity,
      icon: Car,
      color: 'bg-blue-100',
      hourlyRateUSD: VEHICLE_PRICING.smart_confort.pricing.course_heure.jour.usd,
      nightRateUSD: VEHICLE_PRICING.smart_confort.pricing.course_heure.nuit.usd,
      hourlyRateCDF: convertUSDtoCDF(VEHICLE_PRICING.smart_confort.pricing.course_heure.jour.usd),
      rateText: `${VEHICLE_PRICING.smart_confort.pricing.course_heure.jour.usd}$/h`,
      rateTextNight: `${VEHICLE_PRICING.smart_confort.pricing.course_heure.nuit.usd}$/h`,
      images: [confortVehicle1, confortVehicle2, confortVehicle3]
    },
    {
      id: 'smart_plus' as VehicleCategory,
      name: 'SmartCabb Familiale',
      description: `${VEHICLE_PRICING.smart_plus.capacity} places · Data Internet · Grand espace`,
      capacity: VEHICLE_PRICING.smart_plus.capacity,
      icon: Users,
      color: 'bg-green-100',
      hourlyRateUSD: VEHICLE_PRICING.smart_plus.pricing.course_heure.jour.usd,
      nightRateUSD: VEHICLE_PRICING.smart_plus.pricing.course_heure.nuit.usd,
      hourlyRateCDF: convertUSDtoCDF(VEHICLE_PRICING.smart_plus.pricing.course_heure.jour.usd),
      rateText: `${VEHICLE_PRICING.smart_plus.pricing.course_heure.jour.usd}$/h`,
      rateTextNight: `${VEHICLE_PRICING.smart_plus.pricing.course_heure.nuit.usd}$/h`,
      images: [plusVehicle1, plusVehicle2, plusVehicle3, plusVehicle4]
    },
    {
      id: 'smart_business' as VehicleCategory,
      name: 'SmartCabb Business',
      description: `${VEHICLE_PRICING.smart_business.capacity} places VIP · Data · Rafraîchissements`,
      capacity: VEHICLE_PRICING.smart_business.capacity,
      icon: Users,
      color: 'bg-amber-100',
      hourlyRateUSD: VEHICLE_PRICING.smart_business.pricing.location_jour.usd,
      nightRateUSD: null,
      hourlyRateCDF: convertUSDtoCDF(VEHICLE_PRICING.smart_business.pricing.location_jour.usd),
      rateText: `${VEHICLE_PRICING.smart_business.pricing.location_jour.usd}$/jour`,
      rateTextNight: null,
      images: [businessVehicle1, businessVehicle2, businessVehicle3, businessVehicle4, businessVehicle5, businessVehicle6]
    }
  ];
  
  // Calculate price based on estimated time and vehicle category WITH DAY/NIGHT RATES
  const calculatePrice = (vehicleType: string, durationMinutes: number) => {
    const pricing = VEHICLE_PRICING[vehicleType as VehicleCategory];
    if (!pricing) return 25000; // Prix par défaut
    
    // Déterminer si c'est le jour ou la nuit
    const currentHour = new Date().getHours();
    const isDay = isDayTime(currentHour);
    
    // Business utilise uniquement le tarif de location journalière
    if (vehicleType === 'smart_business') {
      const dailyRateUSD = pricing.pricing.location_jour.usd;
      let priceCDF = convertUSDtoCDF(dailyRateUSD);
      
      // Appliquer réduction wallet si solde >= 20$
      const walletBalance = state.currentUser?.walletBalance || 0;
      const hasWalletDiscount = walletBalance >= convertUSDtoCDF(20);
      if (hasWalletDiscount) {
        priceCDF = Math.round(priceCDF * 0.95); // -5%
        console.log('🎁 Réduction wallet 5% appliquée (Business)');
      }
      
      console.log(`💰 Calcul prix ${vehicleType} (Business - Location journalière):`, {
        tarifJour: `${dailyRateUSD} USD`,
        prixCDF: `${priceCDF.toLocaleString()} CDF`,
        réductionWallet: hasWalletDiscount ? '5%' : 'Non'
      });
      
      return priceCDF;
    }
    
    // Convertir la durée en heures (minimum 1 heure)
    const hours = Math.max(1, Math.ceil(durationMinutes / 60));
    
    // Utiliser le tarif approprié selon l'heure - CORRECTION: Bonne structure de données
    const hourlyRateUSD = isDay 
      ? pricing.pricing.course_heure.jour.usd   // ️ Tarif de jour (06h00-20h59)
      : pricing.pricing.course_heure.nuit.usd;  // 🌙 Tarif de nuit (21h00-05h59)
    
    // Calculer le prix en USD puis convertir en CDF
    const priceUSD = hours * hourlyRateUSD;
    let priceCDF = convertUSDtoCDF(priceUSD);
    
    // Appliquer réduction wallet si solde >= 20$
    const walletBalance = state.currentUser?.walletBalance || 0;
    const hasWalletDiscount = walletBalance >= convertUSDtoCDF(20);
    if (hasWalletDiscount) {
      priceCDF = Math.round(priceCDF * 0.95); // -5%
      console.log('🎁 Réduction wallet 5% appliquée');
    }
    
    // Log pour debug
    console.log(`💰 Calcul prix ${vehicleType}:`, {
      heure: `${currentHour}h`,
      période: isDay ? '☀️ JOUR (06h-20h)' : '🌙 NUIT (21h-05h)',
      tarifHoraire: `${hourlyRateUSD} USD/h`,
      durée: `${durationMinutes} min → ${hours}h facturées`,
      prixUSD: `${priceUSD} USD`,
      prixCDF: `${priceCDF.toLocaleString()} CDF`,
      soldeWallet: `${formatCDF(walletBalance)}`,
      réductionWallet: hasWalletDiscount ? '5%' : 'Non'
    });
    
    return priceCDF;
  };
  
  // Update price when vehicle changes (but NOT duration - we use OSRM duration)
  useEffect(() => {
    // ✅ PROTECTION : Vérifier que pickup et destination existent
    if (!pickup || !destination) {
      console.warn('⚠️ Pickup ou destination manquant, calcul de prix impossible');
      return;
    }
    
    // ✅ CORRECTION : Utiliser la durée OSRM (déjà calculée dans routeInfo)
    // NE PAS recalculer avec calculateEstimatedDuration qui écrase la valeur réaliste d'OSRM
    const duration = routeInfo?.duration || estimatedDuration;
    
    // Calculer le prix basé sur cette durée et la catégorie de véhicule
    const newPrice = calculatePrice(selectedVehicle, duration);
    setBasePrice(newPrice);
    
    console.log('💰 Calcul du prix estimé:', {
      catégorie: selectedVehicle,
      duréeOSRM: `${duration} min`,
      distanceOSRM: `${routeInfo?.distance || 0} km`,
      prixEstimé: `${newPrice.toLocaleString()} CDF`
    });
  }, [selectedVehicle, routeInfo]); // ✅ Dépend de routeInfo, pas de pickup/destination
  
  // Calculate final price with promo discount
  const finalPrice = appliedPromo 
    ? appliedPromo.type === 'percentage' 
      ? Math.round(basePrice * (1 - appliedPromo.discount / 100))
      : Math.max(0, basePrice - appliedPromo.discount)
    : basePrice;

  const selectedVehicleData = vehicles.find(v => v.id === selectedVehicle);

  const handleBookRide = async () => {
    console.log("🚨🚨🚨 BOUTON CLIQUÉ ! 🚨🚨🚨");

    // 🔒 Désactiver immédiatement le bouton (anti double-soumission)
    if (isBooking) return;
    setIsBooking(true);

    const selectedVehicleData = vehicles.find(v => v.id === selectedVehicle);
    if (!selectedVehicleData) {
      console.error('❌ EstimateScreen: Aucun véhicule sélectionné');
      setIsBooking(false);
      toast.error('Aucun véhicule sélectionné');
      return;
    }

    if (!pickup || !destination) {
      setIsBooking(false);
      toast.error('Départ ou destination manquant');
      return;
    }

    console.log('🚗 EstimateScreen: Préparation course vers searching-drivers', {
      vehicleType: selectedVehicle,
      finalPrice,
      estimatedDuration,
      passengerCount,
    });

    // ─── Stocker les données dans sessionStorage ─────────────
    // SearchingDriversScreen lira ces données et appellera le backend
    const pendingRide = {
      passengerId: state.currentUser?.id || 'temp-user',
      passengerName: state.currentUser?.name || 'Passager',
      passengerPhone: state.currentUser?.phone || '',
      pickup,
      destination,
      pickupInstructions: state.pickupInstructions || '',
      vehicleType: selectedVehicle,
      vehicleLabel: selectedVehicleData.name,
      estimatedPrice: finalPrice,
      estimatedDuration,
      distance: distanceKm,
      passengerCount,
      promoCode: appliedPromo?.code,
      promoDiscount: appliedPromo
        ? (appliedPromo.type === 'percentage'
          ? Math.round(basePrice * (appliedPromo.discount / 100))
          : appliedPromo.discount)
        : undefined,
      beneficiary: beneficiary
        ? { name: beneficiary.name, phone: beneficiary.phone }
        : null,
    };

    try {
      sessionStorage.setItem('smartcab_pending_ride', JSON.stringify(pendingRide));
      console.log('✅ pendingRide stocké, navigation vers searching-drivers');
      // Navigation immédiate — bouton reste désactivé jusqu'au unmount
      setCurrentScreen('searching-drivers');
    } catch (err) {
      console.error('❌ Erreur stockage sessionStorage:', err);
      setIsBooking(false);
      toast.error('Erreur lors de la prparation de la course');
    }
  };

  return (
    <motion.div 
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -300, opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="h-full bg-gradient-to-br from-blue-50 via-white to-cyan-50 flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-white/80 backdrop-blur-sm border-b border-border flex-shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            console.log('⬅️ Estimate - Bouton retour cliqué - Navigation vers map');
            try {
              setCurrentScreen('map');
              console.log('✅ Estimate - setCurrentScreen(map) exécuté');
            } catch (error) {
              console.error('❌ Estimate - Erreur lors de setCurrentScreen:', error);
            }
          }}
          className="w-9 h-9 hover:bg-muted"
        >
          <ArrowLeft className="w-5 h-5 text-primary" />
        </Button>
        <h1 className="text-base font-semibold text-primary">Estimation du trajet</h1>
        <div className="w-9" />
      </div>

      {/* Scrollable Content Area — tout le contenu + bouton Commander */}
      <div className="flex-1 overflow-y-auto">
        <div className="pb-8">
          {/* AFFICHAGE DE DISTANCE ET DURÉE PRÉCISES - VERSION COMPACTE */}
          <div className="p-4 bg-gradient-to-br from-cyan-50 to-blue-50">
            <div className="bg-white rounded-xl p-3 shadow-md border border-cyan-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-gray-900">Détails du trajet</h3>
                <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${trafficCondition.color} bg-opacity-10`}>
                  <span className="text-base">{trafficCondition.emoji}</span>
                  <span className={`text-[10px] font-medium ${trafficCondition.color}`}>
                    {trafficCondition.description}
                  </span>
                </div>
              </div>
              
              {/* Grille d'informations compacte */}
              <div className="grid grid-cols-2 gap-2">
                {/* Distance */}
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg p-2.5 border border-blue-200">
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                      <MapPin className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-[10px] font-medium text-blue-700">Distance</span>
                  </div>
                  <p className="text-lg font-bold text-blue-900">{routeInfo?.distanceText || 'Calcul...'}</p>
                  <p className="text-[10px] text-blue-600 mt-0.5">Distance précise</p>
                </div>
                
                {/* Durée */}
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-2.5 border border-green-200">
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                      <Clock className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-[10px] font-medium text-green-700">Durée</span>
                  </div>
                  <p className="text-lg font-bold text-green-900">{routeInfo?.durationText || 'Calcul...'}</p>
                  <p className="text-[10px] text-green-600 mt-0.5">Actuelles</p>
                </div>
              </div>
              
              {/* Informations supplémentaires compactes */}
              <div className="mt-2 pt-2 border-t border-gray-200 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">Départ</span>
                  <span className="font-medium text-gray-900">
                    {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">Arrivée estimée</span>
                  <span className="font-medium text-green-600">
                    {/* ✅ CORRECTION : duration est en MINUTES, donc multiplier par 60*1000 */}
                    {new Date(Date.now() + (routeInfo?.duration || 0) * 60 * 1000).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* 🗺️ CARTE INTERACTIVE DE L'ITINÉRAIRE AVEC TRAFIC - VERSION COMPACTE */}
          <div className="p-3 bg-white/60 backdrop-blur-sm">
            <RouteMapPreview
              pickup={pickup}
              destination={destination}
              distanceKm={distanceKm}
              estimatedDuration={estimatedDuration}
              className="mb-3"
            />
          </div>

          {/* Route Info - VERSION COMPACTE */}
          <div className="p-3 bg-white/60 backdrop-blur-sm">
            <div className="bg-white rounded-xl p-3 shadow-sm border border-border space-y-3">
              <div className="flex items-start space-x-2">
                <div className="w-2.5 h-2.5 bg-secondary rounded-full mt-1.5 shadow-lg shadow-secondary/30" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">{t('pickup_location')}</p>
                  <p className="text-sm text-foreground">{pickup.address}</p>
                  {pickupInstructions && (
                    <div className="flex items-start gap-1.5 mt-1.5 px-2 py-1.5 bg-green-50 rounded-lg border border-green-100">
                      <MapPin className="w-3 h-3 text-green-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-[10px] text-green-700 font-medium mb-0.5">Point de repère</p>
                        <p className="text-xs text-green-900">{pickupInstructions}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="h-6 border-l-2 border-dashed border-border ml-1" />
              
              <div className="flex items-start space-x-2">
                <div className="w-2.5 h-2.5 bg-accent rounded-full mt-1.5 shadow-lg shadow-accent/30" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">{t('destination')}</p>
                  <p className="text-sm text-foreground">{destination.address}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Vehicle Options - HORIZONTAL SCROLLABLE */}
          <div className="space-y-4">
            <div className="px-4">
              <h2 className="text-base font-semibold mb-3">{t('choose_vehicle')}</h2>
            </div>
            
            {/* Wallet Discount Badge */}
            {((state.currentUser?.walletBalance || 0) >= convertUSDtoCDF(20)) && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mx-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-3 mb-3"
              >
                <div className="flex items-start gap-2">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 text-sm">
                    🎁
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-green-900 text-xs mb-0.5">
                      Réduction Portefeuille Active !
                    </p>
                    <p className="text-[10px] text-green-700">
                      <span className="font-semibold">-5%</span> sur tous les prix · Solde: {formatCDF(state.currentUser?.walletBalance || 0)}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
            
            {/* ── GRILLE RESPONSIVE DES VÉHICULES — 2 colonnes, tout visible ── */}
            <div className="px-4">
              <div className="grid grid-cols-2 gap-3">
                {vehicles.map((vehicle) => {
                  const Icon = vehicle.icon;
                  const isSelected = selectedVehicle === vehicle.id;
                  const vehiclePrice = calculatePrice(vehicle.id, estimatedDuration);
                  
                  const currentHour = new Date().getHours();
                  const isDay = isDayTime(currentHour);
                  const isNight = !isDay;
                  const pricing = VEHICLE_PRICING[vehicle.id];
                  
                  let dayPriceUSD, nightPriceUSD, dayPriceCDF, nightPriceCDF;
                  
                  if (vehicle.id === 'smart_business') {
                    dayPriceUSD = pricing.pricing.location_jour.usd;
                    dayPriceCDF = convertUSDtoCDF(dayPriceUSD);
                    nightPriceUSD = null;
                    nightPriceCDF = null;
                  } else {
                    const hours = Math.max(1, Math.ceil(estimatedDuration / 60));
                    dayPriceUSD = (pricing.pricing.course_heure.jour.usd || 0) * hours;
                    dayPriceCDF = convertUSDtoCDF(dayPriceUSD);
                    nightPriceUSD = (pricing.pricing.course_heure.nuit.usd || 0) * hours;
                    nightPriceCDF = convertUSDtoCDF(nightPriceUSD);
                  }
                  
                  return (
                    <motion.button
                      key={vehicle.id}
                      onClick={() => setSelectedVehicle(vehicle.id)}
                      whileTap={{ scale: 0.97 }}
                      className={`w-full rounded-xl border-2 transition-all duration-300 bg-white overflow-hidden text-left ${
                        isSelected 
                          ? 'border-secondary bg-secondary/5 shadow-lg shadow-secondary/20' 
                          : 'border-border hover:border-secondary/50 hover:shadow-md'
                      }`}
                    >
                      {/* Image du véhicule */}
                      {vehicle.images && vehicle.images.length > 0 && (
                        <VehicleImageCarousel
                          images={vehicle.images}
                          alt={vehicle.name}
                          isSelected={isSelected}
                        />
                      )}
                      
                      {/* Informations du véhicule */}
                      <div className="p-2.5 space-y-1.5">
                        {/* Nom + capacité */}
                        <div>
                          <h3 className={`text-xs font-bold leading-tight ${isSelected ? 'text-secondary' : 'text-foreground'}`}>
                            {vehicle.name}
                          </h3>
                          <p className="text-[9px] text-muted-foreground mt-0.5">
                            {vehicle.capacity} places · {VEHICLE_PRICING[vehicle.id].features[0]}
                          </p>
                        </div>
                        
                        {/* Prix principal */}
                        <div className="flex items-baseline justify-between">
                          <span className={`text-base font-bold ${isSelected ? 'text-secondary' : 'text-primary'}`}>
                            {vehiclePrice.toLocaleString()}
                          </span>
                          <span className="text-[9px] text-muted-foreground">{t('cdf')}</span>
                        </div>
                        <div className="text-[9px] text-muted-foreground -mt-0.5">
                          ≈ {vehicle.id === 'smart_business' 
                            ? `${dayPriceUSD}$/jour`
                            : `${isNight ? nightPriceUSD?.toFixed(1) : dayPriceUSD.toFixed(1)}$ USD`
                          }
                        </div>
                        
                        {/* Tarifs jour/nuit */}
                        {vehicle.id !== 'smart_business' && (
                          <div className="bg-muted/30 rounded-lg px-1.5 py-1 space-y-0.5">
                            <div className="flex items-center justify-between text-[9px]">
                              <div className="flex items-center gap-0.5">
                                <Sun className="w-2.5 h-2.5 text-amber-500" />
                                <span className={isNight ? 'text-muted-foreground' : 'text-primary font-medium'}>Jour</span>
                              </div>
                              <span className={`font-medium ${isNight ? 'text-muted-foreground' : 'text-primary'}`}>
                                {Math.round(dayPriceCDF).toLocaleString()}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[9px]">
                              <div className="flex items-center gap-0.5">
                                <Moon className="w-2.5 h-2.5 text-blue-500" />
                                <span className={isNight ? 'text-primary font-medium' : 'text-muted-foreground'}>Nuit</span>
                              </div>
                              <span className={`font-medium ${isNight ? 'text-primary' : 'text-muted-foreground'}`}>
                                {Math.round(nightPriceCDF).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Badge sélectionné */}
                        {isSelected && (
                          <div className="flex items-center justify-center gap-1 py-0.5 bg-secondary/10 rounded-lg">
                            <span className="text-[9px] font-bold text-secondary">✓ Sélectionné</span>
                          </div>
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Passenger Count Selector - PLUS COMPACT */}
            <div className="px-4">
              <PassengerCountSelector
                value={passengerCount}
                onChange={setPassengerCount}
                maxPassengers={VEHICLE_PRICING[selectedVehicle]?.capacity || 3}
              />
            </div>

            {/* Promo Code Input - PLUS COMPACT */}
            <div className="px-4">
              <PromoCodeInput
                rideAmount={basePrice}
                onPromoApplied={setAppliedPromo}
              />
            </div>

            {/* 🆕 Commander pour quelqu'un d'autre */}
            <div className="px-4">
              <BookForSomeoneElse
                showForm={showBookForOther}
                onToggleForm={setShowBookForOther}
                onBeneficiaryChange={setBeneficiary}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Book Button — sticky en bas, toujours visible */}
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="flex-shrink-0 p-4 border-t border-border bg-white/95 backdrop-blur-sm shadow-2xl"
      >
        {/* Prix résumé compact */}
        <div className="flex items-center justify-between mb-3 px-1">
          <div>
            <p className="text-xs text-muted-foreground">Prix total estimé</p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold bg-gradient-to-r from-secondary to-primary bg-clip-text text-transparent">
                {finalPrice.toLocaleString()}
              </span>
              <span className="text-sm font-medium text-muted-foreground">{t('cdf')}</span>
            </div>
            {appliedPromo && (
              <p className="text-xs text-secondary font-medium">
                Promo -{(basePrice - finalPrice).toLocaleString()} {t('cdf')}
              </p>
            )}
          </div>
          <div className="flex gap-3 text-center">
            <div className="bg-muted/40 rounded-xl px-3 py-2">
              <p className="text-[10px] text-muted-foreground">Durée</p>
              <p className="text-sm font-bold text-primary">{estimatedDuration} min</p>
            </div>
            <div className="bg-muted/40 rounded-xl px-3 py-2">
              <p className="text-[10px] text-muted-foreground">Dist.</p>
              <p className="text-sm font-bold text-primary">{(distanceKm || 0).toFixed(1)} km</p>
            </div>
          </div>
        </div>

        <Button
          onClick={handleBookRide}
          disabled={isBooking}
          className={`w-full h-14 rounded-xl shadow-lg transition-all duration-300 text-base font-semibold ${
            isBooking
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none'
              : 'bg-gradient-to-r from-secondary to-primary hover:from-secondary/90 hover:to-primary/90 text-white shadow-secondary/30 hover:shadow-xl'
          }`}
        >
          {isBooking ? (
            <span className="flex items-center gap-2 justify-center">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Recherche en cours…
            </span>
          ) : t('confirm_booking')}
        </Button>
      </motion.div>
    </motion.div>
  );
}
