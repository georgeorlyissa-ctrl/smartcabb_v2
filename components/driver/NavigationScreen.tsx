import { useEffect, useState } from 'react';
import { useAppState } from '../../hooks/useAppState';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Phone, MessageCircle, Clock, DollarSign, CheckCircle } from '../../lib/icons';
import { TimerControl } from './TimerControl';
import { RideCompletionSummaryDialog } from '../RideCompletionSummaryDialog';
import { GoogleMapView } from '../GoogleMapView';
import { VEHICLE_PRICING, type VehicleCategory } from '../../lib/pricing';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { toast } from '../../lib/toast';
import { motion } from '../../lib/motion';
import { notifyRideStarted } from '../../lib/sms-service';

// Fonction pour mettre à jour le solde du conducteur
async function updateDriverBalance(
  driverId: string,
  operation: 'add' | 'subtract',
  amount: number
): Promise<number | null> {
  try {
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/wallet/driver-balance`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          driverId,
          operation,
          amount
        })
      }
    );

    if (response.ok) {
      const data = await response.json();
      return data.newBalance || null;
    }
    return null;
  } catch (error) {
    console.error('❌ Erreur mise à jour solde:', error);
    return null;
  }
}

interface NavigationScreenProps {
  onBack: () => void;
}

export function NavigationScreen({ onBack }: NavigationScreenProps) {
  const { state, setCurrentScreen, updateRide, updateDriver } = useAppState();
  const [phase, setPhase] = useState<'pickup' | 'destination'>('pickup');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [currentCost, setCurrentCost] = useState(0);
  const [isTimerDisabled, setIsTimerDisabled] = useState(false);
  const [waitingTime, setWaitingTime] = useState(0);
  const [freeWaitingDisabled, setFreeWaitingDisabled] = useState(false);
  const [waitingTimeFrozen, setWaitingTimeFrozen] = useState<number | null>(null);
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const [billingStartTime, setBillingStartTime] = useState<number | null>(null);
  const [billingElapsedTime, setBillingElapsedTime] = useState(0);
  const [passengerPaid, setPassengerPaid] = useState(false);
  const [isLoadingRideData, setIsLoadingRideData] = useState(false);
  const [mapboxApiKey, setMapboxApiKey] = useState<string>('');
  
  // ✅ CHARGER LA CLÉ MAPBOX DEPUIS L'ENVIRONNEMENT
  useEffect(() => {
    const loadMapboxKey = async () => {
      try {
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/config/mapbox-key`,
          {
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`
            }
          }
        );
        if (response.ok) {
          const data = await response.json();
          if (data.apiKey) {
            setMapboxApiKey(data.apiKey);
            console.log('✅ Clé Mapbox chargée pour NavigationScreen');
          }
        }
      } catch (err) {
        console.error('❌ Erreur chargement clé Mapbox:', err);
      }
    };
    loadMapboxKey();
  }, []);
  
  // ✅ NOUVEAU : CHARGER LES VRAIES DONNÉES DU BACKEND AU DÉMARRAGE
  useEffect(() => {
    const loadRideFromBackend = async () => {
      if (!state.currentRide?.id || isLoadingRideData) {
        console.warn('⚠️ Pas de currentRide ou déjà en chargement');
        return;
      }

      setIsLoadingRideData(true);
      
      try {
        console.log('🔄 Chargement des données de la course depuis le backend...', state.currentRide.id);
        
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/rides/status/${state.currentRide.id}`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.ride) {
            console.log('✅ Données chargées depuis le backend:', {
              vehicleType: result.ride.vehicleType,
              estimatedPrice: result.ride.estimatedPrice,
              pickup: result.ride.pickup,
              destination: result.ride.destination,
              pickupAddress: result.ride.pickupAddress,
              dropoffAddress: result.ride.dropoffAddress
            });
            
            // ✅ FIX : Normaliser les données pickup/destination
            // Le backend peut avoir soit pickup.address, soit pickupAddress
            const normalizedPickup = result.ride.pickup || {};
            if (!normalizedPickup.address && result.ride.pickupAddress) {
              normalizedPickup.address = result.ride.pickupAddress;
            }
            if (!normalizedPickup.lat && result.ride.pickupLat) {
              normalizedPickup.lat = result.ride.pickupLat;
            }
            if (!normalizedPickup.lng && result.ride.pickupLng) {
              normalizedPickup.lng = result.ride.pickupLng;
            }
            
            const normalizedDestination = result.ride.destination || {};
            if (!normalizedDestination.address && result.ride.dropoffAddress) {
              normalizedDestination.address = result.ride.dropoffAddress;
            }
            if (!normalizedDestination.lat && result.ride.dropoffLat) {
              normalizedDestination.lat = result.ride.dropoffLat;
            }
            if (!normalizedDestination.lng && result.ride.dropoffLng) {
              normalizedDestination.lng = result.ride.dropoffLng;
            }
            
            console.log('✅ Données normalisées:', {
              pickup: normalizedPickup,
              destination: normalizedDestination
            });
            
            // ✅ METTRE À JOUR LE STATE LOCAL AVEC LES VRAIES DONNÉES
            if (updateRide) {
              updateRide(state.currentRide.id, {
                vehicleType: result.ride.vehicleType,
                estimatedPrice: result.ride.estimatedPrice,
                pickup: normalizedPickup,
                destination: normalizedDestination,
                distance: result.ride.distance || result.ride.distanceKm,
                passengerName: result.ride.passengerName,
                passengerPhone: result.ride.passengerPhone
              });
            }
          } else {
            console.warn('⚠️ Course non trouvée dans le backend, utilisation des données locales');
          }
        } else {
          console.warn('⚠️ Erreur lors du chargement:', response.status);
        }
      } catch (error) {
        console.error('❌ Erreur chargement données backend:', error);
      } finally {
        setIsLoadingRideData(false);
      }
    };

    // Charger au démarrage uniquement
    loadRideFromBackend();
  }, []); // ✅ Pas de dépendances - charger UNE SEULE FOIS au mount
  
  // ✅ PRODUCTION : Pas de simulation automatique - Le driver confirme manuellement
  const handleArriveAtPickup = () => {
    setPhase('destination');
    toast.success('Arrivé au point de départ !', {
      description: 'Vous pouvez maintenant commencer la course'
    });
  };

  // ✅ Timer d'attente (compte jusqu'à 10 minutes = 600 secondes)
  useEffect(() => {
    if (phase === 'destination' && !freeWaitingDisabled && waitingTime < 600) {
      const interval = setInterval(() => {
        setWaitingTime(prev => prev + 1);
      }, 1000);

      return () => clearInterval(interval);
    }
    // ✅ FIX React #310 : Toujours retourner undefined explicitement si pas de cleanup
    return undefined;
  }, [phase, freeWaitingDisabled, waitingTime]);

  // ✅ NOUVEAU : Auto-démarrage du chrono de facturation après 10 minutes d'attente
  useEffect(() => {
    if (phase === 'destination' && waitingTime >= 600 && !freeWaitingDisabled && !billingStartTime) {
      setFreeWaitingDisabled(true);
      const startTime = Date.now();
      setBillingStartTime(startTime);
      if (updateRide && state.currentRide?.id) {
        updateRide(state.currentRide.id, {
          billingStartTime: startTime,
          billingElapsedTime: 0
        });
      }
      console.log('🚀 Chrono de facturation démarré automatiquement (10 minutes atteintes)');
    }
    
    if (phase === 'destination' && isBillingActive && !isTimerDisabled && billingStartTime) {
      const interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - billingStartTime) / 1000);
        setBillingElapsedTime(elapsed);
        
        // Synchroniser avec le state global
        if (updateRide && state.currentRide?.id) {
          updateRide(state.currentRide.id, {
            billingElapsedTime: elapsed
          });
        }
      }, 1000);

      return () => clearInterval(interval);
    }
    // ✅ FIX React #310 : Toujours retourner undefined explicitement si pas de cleanup
    return undefined;
  }, [phase, freeWaitingDisabled, waitingTime, billingStartTime, isTimerDisabled, updateRide, state.currentRide?.id]);

  // Timer logic for billing - NOUVEAU : Calcul basé sur billingElapsedTime
  useEffect(() => {
    if (phase === 'destination' && !isTimerDisabled) {
      const interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);

      return () => clearInterval(interval);
    }
    // ✅ FIX React #310 : Toujours retourner undefined explicitement si pas de cleanup
    return undefined;
  }, [phase, isTimerDisabled]);

  // Calcul du coût en temps réel basé sur billingElapsedTime - NOUVEAU SYSTÈME PAR PALIERS
  useEffect(() => {
    // ✅ CORRECTION MAJEURE : Utiliser TOUJOURS estimatedPrice du backend
    // Le calcul temps réel ne doit servir QUE d'affichage pendant la course
    // À la clôture, on utilise l'estimatedPrice d'origine
    
    const backendEstimatedPrice = state.currentRide?.estimatedPrice;
    
    if (backendEstimatedPrice && backendEstimatedPrice > 0) {
      // ✅ SI LE BACKEND A UN PRIX, ON L'UTILISE
      setCurrentCost(backendEstimatedPrice);
      console.log(`💰 Prix depuis le backend: ${backendEstimatedPrice.toLocaleString()} CDF`);
      return; // Ne pas calculer avec le chrono
    }
    
    // ⚠️ FALLBACK: Si pas de prix backend, calculer avec le chrono (ne devrait pas arriver)
    // Récupérer la catégorie du véhicule depuis la course actuelle
    const vehicleCategory = (state.currentRide?.vehicleType?.toLowerCase().replace(' ', '_') || 'smart_standard') as VehicleCategory;
    
    // 🎯 FACTURATION PAR TRANCHE D'HEURE COMPLÈTE
    // 0-59min = 1h facturée, 1h00-1h59 = 2h facturées, etc.
    const billedHours = Math.max(1, Math.ceil(billingElapsedTime / 3600));
    
    const currentHour = new Date().getHours();
    const pricing = VEHICLE_PRICING[vehicleCategory];
    
    // ✅ CORRECTION : Utiliser la vraie structure de PRICING_CONFIG
    // pricing.pricing.course_heure.jour.usd ou nuit.usd
    const isDay = currentHour >= 6 && currentHour <= 20;
    const hourlyRateUSD = isDay 
      ? pricing.pricing.course_heure.jour.usd
      : pricing.pricing.course_heure.nuit.usd;
    
    // Calcul du prix en USD
    const priceUSD = hourlyRateUSD * billedHours;
    
    // ✅ CORRECTION : Utiliser systemSettings au lieu de adminSettings
    const exchangeRate = state.systemSettings?.exchangeRate || 2850;
    const totalCost = Math.round(priceUSD * exchangeRate);
    
    setCurrentCost(totalCost);
    
    console.log(`💰 CALCUL TARIFICATION PAR TRANCHE D'HEURE (FALLBACK):`);
    console.log(`   Catégorie: ${pricing.name}`);
    console.log(`   vehicleCategory KEY: "${vehicleCategory}"`);
    console.log(`   state.currentRide?.vehicleType: "${state.currentRide?.vehicleType}"`);
    console.log(`   Temps écoulé: ${billingElapsedTime}s (${Math.floor(billingElapsedTime / 60)}min ${billingElapsedTime % 60}s)`);
    console.log(`   Tranches d'heures facturées: ${billedHours}h`);
    console.log(`   Période: ${isDay ? 'Jour (6h-20h)' : 'Nuit (21h-5h)'}`);
    console.log(`   Tarif horaire: $${hourlyRateUSD}/h`);
    console.log(`   Prix USD: $${priceUSD}`);
    console.log(`   Taux de change: ${exchangeRate}`);
    console.log(`   💵 TOTAL CALCULÉ: ${totalCost.toLocaleString()} CDF ($${(priceUSD || 0).toFixed(2)})`);
    
    // ✅ DEBUG : Vérifier si le calcul est correct
    if (totalCost === 0 || isNaN(totalCost)) {
      console.error('❌ ERREUR : Le montant calculé est 0 ou NaN !');
      console.error('   billingElapsedTime:', billingElapsedTime);
      console.error('   billedHours:', billedHours);
      console.error('   hourlyRateUSD:', hourlyRateUSD);
      console.error('   priceUSD:', priceUSD);
      console.error('   exchangeRate:', exchangeRate);
      console.error('   VEHICLE_PRICING:', VEHICLE_PRICING);
      console.error('   pricing structure:', pricing);
    }
  }, [billingElapsedTime, state.currentRide?.vehicleType, state.systemSettings?.exchangeRate]);

  const handleCompleteRide = async () => {
    // ARRÊTER TOUS LES TIMERS
    // Le chrono et le prix doivent se figer à leur valeur actuelle
    
    // ✅ NOUVEAU : Si state.currentRide est null, charger depuis le backend
    let rideData = state.currentRide;
    
    if (!rideData || !rideData.id) {
      console.warn('⚠️ state.currentRide est null, tentative de chargement depuis le backend...');
      
      // Chercher le rideId dans localStorage en fallback
      try {
        const storedState = localStorage.getItem('smartcab_app_state');
        if (storedState) {
          const parsedState = JSON.parse(storedState);
          if (parsedState.currentRide?.id) {
            rideData = parsedState.currentRide;
            console.log('✅ currentRide trouvé dans localStorage:', rideData.id);
          }
        }
      } catch (error) {
        console.warn('⚠️ Impossible de lire localStorage:', error);
      }
      
      // Si toujours pas de rideData, chercher les courses actives du conducteur
      if (!rideData || !rideData.id) {
        console.log('🔍 Recherche de la course active du conducteur...');
        
        try {
          const driverId = state.currentDriver?.id;
          if (!driverId) {
            toast.error('Erreur: Conducteur non identifié');
            return;
          }
          
          const response = await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/rides/active-driver-ride/${driverId}`,
            {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${publicAnonKey}`,
                'Content-Type': 'application/json'
              }
            }
          );
          
          if (response.ok) {
            const result = await response.json();
            if (result.success && result.ride) {
              rideData = result.ride;
              console.log('✅ Course active trouvée:', rideData.id);
            } else {
              console.error('❌ Aucune course active trouvée pour ce conducteur');
              toast.error('Erreur: Aucune course active trouvée');
              return;
            }
          } else {
            console.error('❌ Erreur API:', response.status);
            toast.error('Erreur lors du chargement de la course');
            return;
          }
        } catch (error) {
          console.error('❌ Erreur réseau:', error);
          toast.error('Erreur réseau. Veuillez réessayer.');
          return;
        }
      }
    }
    
    // ✅ À ce stade, rideData DOIT être valide
    if (!rideData || !rideData.id) {
      console.error('❌ Impossible de récupérer les données de la course');
      toast.error('Erreur: Impossible de récupérer les données. Veuillez réessayer.');
      return;
    }

    // ✅ RÉCUPÉRER LE VRAI VEHICLETYPE DEPUIS LE BACKEND
    let actualVehicleType = rideData.vehicleType;
    let actualEstimatedPrice = rideData.estimatedPrice;
    
    try {
      // Charger les vraies données depuis le backend
      const backendRideResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/rides/status/${rideData.id}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (backendRideResponse.ok) {
        const backendRideData = await backendRideResponse.json();
        if (backendRideData.success && backendRideData.ride) {
          actualVehicleType = backendRideData.ride.vehicleType || actualVehicleType;
          actualEstimatedPrice = backendRideData.ride.estimatedPrice || actualEstimatedPrice;
          console.log('✅ Données backend chargées:', {
            vehicleType: actualVehicleType,
            estimatedPrice: actualEstimatedPrice,
            pickup: backendRideData.ride.pickup,
            destination: backendRideData.ride.destination
          });
          
          // Mettre à jour rideData avec les vraies données
          rideData.vehicleType = actualVehicleType;
          rideData.estimatedPrice = actualEstimatedPrice;
          rideData.pickup = backendRideData.ride.pickup || rideData.pickup;
          rideData.destination = backendRideData.ride.destination || rideData.destination;
        }
      }
    } catch (error) {
      console.warn('⚠️ Impossible de charger depuis le backend, utilisation données locales');
    }

    const vehicleCategory = (actualVehicleType?.toLowerCase().replace(' ', '_') || 'smart_standard') as VehicleCategory;
    const pricing = VEHICLE_PRICING[vehicleCategory];
    const pickupAddress = rideData.pickup?.address || 'Point de départ non spécifié';
    const destinationAddress = rideData.destination?.address || 'Destination non spécifiée';
    const distance = rideData.distance || rideData.distanceKm || 0;
    
    // ✅ UTILISER LE VRAI PRIX CALCULÉ AVEC LA BONNE CATÉGORIE
    const finalCost = currentCost > 0 ? currentCost : actualEstimatedPrice;
    
    console.log('🏁 Fin de course - Données:', {
      rideId: rideData.id,
      vehicleType: actualVehicleType,
      vehicleCategory: vehicleCategory,
      pickup: pickupAddress,
      destination: destinationAddress,
      distance: distance,
      prixCalculé: currentCost,
      prixEstimé: actualEstimatedPrice,
      prixFinal: finalCost,
      driverId: state.currentDriver?.id
    });
    
    // ✅ Figer les états locaux
    setIsTimerDisabled(true);
    setBillingStartTime(null);
    
    // ✅ ENVOYER LA COURSE TERMINÉE AU BACKEND
    try {
      console.log('🔥 NavigationScreen - Envoi au backend:', {
        rideId: rideData.id,
        billingElapsedTime: billingElapsedTime,
        finalCost: finalCost,
        distance: distance
      });
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/rides/complete`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            rideId: rideData.id,
            driverId: state.currentDriver?.id,
            passengerId: rideData.passengerId,
            finalPrice: finalCost,
            duration: billingElapsedTime, // 🔥 DOIT ÊTRE > 0
            rating: 0,
            feedback: '',
            paymentMethod: 'cash',
            // ✅ DONNÉES COMPLÈTES DE LA COURSE
            pickup: { address: pickupAddress },
            destination: { address: destinationAddress },
            distance: distance,
            vehicleType: actualVehicleType,
            completedAt: new Date().toISOString()
          })
        }
      );

      const result = await response.json();
      
      if (!result.success) {
        console.error('❌ Erreur backend:', result.error);
        toast.error(`Erreur: ${result.error}`);
        return;
      }

      console.log('✅ Course enregistrée dans le backend:', result);
      
      // ✅ Mettre à jour localement APRÈS la confirmation backend
      if (updateRide) {
        updateRide(rideData.id, {
          actualPrice: finalCost,
          timerDisabled: true,
          freeWaitingDisabled: freeWaitingDisabled,
          waitingTime: waitingTime,
          waitingTimeFrozen: waitingTimeFrozen,
          elapsedTime: elapsedTime,
          billingElapsedTime: billingElapsedTime,
          completedAt: new Date().toISOString(),
          status: 'completed',
          paymentStatus: 'paid',
          // ✅ S'assurer que les données sont sauvegardées
          pickup: { address: pickupAddress },
          destination: { address: destinationAddress },
          distance: distance,
          vehicleType: actualVehicleType
        });
      }
      
      // ✅ AJOUTER LE MONTANT AU SOLDE DU CONDUCTEUR (locale ET backend)
      if (state.currentDriver?.id && finalCost > 0) {
        console.log(`💰 Ajout de ${finalCost.toLocaleString()} CDF au solde du conducteur...`);
        
        const newBalance = await updateDriverBalance(state.currentDriver.id, 'add', finalCost);
        
        if (newBalance !== null) {
          toast.success('🎉 Course terminée avec succès !', {
            description: `Vous avez gagné ${finalCost.toLocaleString()} CDF. Nouveau solde : ${newBalance.toLocaleString()} CDF`
          });
        } else {
          toast.success('🎉 Course terminée avec succès !', {
            description: `Montant gagné : ${finalCost.toLocaleString()} CDF`
          });
        }
      }
      
      setShowCompletionDialog(true);
      
    } catch (error) {
      console.error('❌ Erreur lors de la complétion de la course:', error);
      toast.error('Erreur lors de l\'enregistrement de la course');
    }
  };

  const handleCallPassenger = () => {
    toast.info('Appel du passager...');
  };

  const handleMessagePassenger = () => {
    toast.info('Envoi d\'un message...');
  };

  const handleTimerToggle = async (disabled: boolean) => {
    setIsTimerDisabled(disabled);
    
    // ✅ v518.53 - SYNCHRONISER LA PAUSE/REPRISE AVEC LE BACKEND
    if (state.currentRide?.id) {
      try {
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/rides/${state.currentRide.id}/toggle-pause`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              isPaused: disabled,
              pausedAt: disabled ? Date.now() : null,
              resumedAt: disabled ? null : Date.now(),
              currentElapsedTime: billingElapsedTime // Envoyer le temps actuel
            })
          }
        );
        
        if (response.ok) {
          const data = await response.json();
          console.log(`✅ Pause ${disabled ? 'activée' : 'désactivée'} et synchronisée avec le passager`);
          
          // Mettre à jour le ride local avec les infos de pause
          if (updateRide) {
            updateRide(state.currentRide.id, {
              timerDisabled: disabled,
              isPaused: disabled,
              pausedAt: disabled ? Date.now() : null,
              totalPauseDuration: data.totalPauseDuration || 0
            });
          }
        } else {
          console.error('❌ Erreur synchronisation pause:', await response.text());
        }
      } catch (error) {
        console.error('❌ Erreur réseau toggle pause:', error);
      }
    }
    
    // Fallback: mise à jour locale même si le backend échoue
    if (updateRide && state.currentRide?.id) {
      updateRide(state.currentRide.id, {
        timerDisabled: disabled
      });
    }
  };

  const handleDisableFreeWaiting = async () => {
    const newState = !freeWaitingDisabled;
    setFreeWaitingDisabled(newState);
    
    // Quand on désactive l'attente gratuite, on gèle le compteur de temps d'attente
    if (newState && waitingTime < 600) {
      setWaitingTimeFrozen(waitingTime);
      // NOUVEAU : Démarrer le chrono de facturation
      const billingStart = Date.now();
      setBillingStartTime(billingStart);
      setBillingElapsedTime(0);
      console.log(`⏸️ Temps d'attente gelé à ${waitingTime}s (${Math.floor(waitingTime / 60)}min ${waitingTime % 60}s)`);
      console.log(`🚀 Chrono de facturation démarré !`);
      
      // 🆕 SYNCHRONISER AVEC LE BACKEND pour que le passager reçoive l'info
      if (state.currentRide?.id) {
        try {
          const response = await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/rides/${state.currentRide.id}/start-billing`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${publicAnonKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                waitingTimeFrozen: waitingTime // 🆕 Envoyer le temps d'attente gelé
              })
            }
          );
          
          if (response.ok) {
            const data = await response.json();
            console.log('✅ Facturation activée côté serveur:', data);
            
            // Mettre à jour le ride dans le contexte
            updateRide(state.currentRide.id, {
              billingStartTime: data.billingStartTime,
              billingActive: true,
              waitingTimeFrozen: waitingTime // 🆕 Synchroniser le temps gelé
            });
          } else {
            console.error('❌ Erreur activation facturation:', await response.text());
          }
        } catch (error) {
          console.error('❌ Erreur réseau activation facturation:', error);
        }
      }
      
      // 📱 SMS: Notification de démarrage de course au passager
      if (state.currentRide && state.currentDriver) {
        try {
          await notifyRideStarted(
            state.currentUser?.phone || '+243999999999', // Téléphone du passager
            state.currentDriver.phone || '+243999999999', // Téléphone du conducteur
            state.currentUser?.name || 'Passager',
            state.currentDriver.name || 'Conducteur',
            state.currentRide.vehicleType || 'Smart Standard',
            state.currentRide.pickup?.address || 'Point de départ',
            state.currentRide.destination?.address || 'Destination'
          );
          console.log('✅ SMS démarrage de course envoyé au passager (attente gratuite désactivée)');
        } catch (error) {
          console.error('❌ Erreur envoi SMS démarrage:', error);
        }
      }
    } else if (!newState) {
      // Quand on réactive, on dégèle le compteur
      setWaitingTimeFrozen(null);
      // NOUVEAU : Arrêter le chrono de facturation
      setBillingStartTime(null);
      setBillingElapsedTime(0);
      console.log("▶️ Temps d'attente dégelé - Compteur reprend");
      console.log('⏹️ Chrono de facturation arrêté');
      
      // 🆕 SYNCHRONISER L'ARRÊT AVEC LE BACKEND
      if (state.currentRide?.id) {
        try {
          await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/rides/update-billing/${state.currentRide.id}`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${publicAnonKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                billingStartTime: null,
                freeWaitingDisabled: false,
                billingElapsedTime: 0
              })
            }
          );
        } catch (error) {
          console.error('❌ Erreur synchronisation backend:', error);
        }
      }
    }
    
    if (updateRide && state.currentRide?.id) {
      updateRide(state.currentRide.id, {
        freeWaitingDisabled: newState,
        waitingTimeFrozen: newState ? waitingTime : null,
        billingStartTime: newState ? Date.now() : null,
        billingElapsedTime: 0
      });
    }
    
    // Message de confirmation
    if (newState) {
      toast.warning('Attente gratuite désactivée', {
        description: `Compteur bloqué à ${Math.floor(waitingTime / 60)}min ${waitingTime % 60}s - Facturation commence maintenant`
      });
    } else {
      toast.success('Attente gratuite réactivée', {
        description: 'Les 10 minutes gratuites recommencent à compter'
      });
    }
  };

  const handleOfferPostpaid = () => {
    toast.info('Option post-payé proposée au passager');
  };

  const isBillingActive = waitingTime >= 600 || freeWaitingDisabled;

  const formatTime = (seconds: number | undefined) => {
    // 🔥 PROTECTION contre undefined/NaN
    if (seconds === undefined || seconds === null || isNaN(seconds) || seconds < 0) {
      return '0:00';
    }
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="min-h-screen bg-gray-50 p-4"
    >
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-4">
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="outline"
            onClick={onBack}
            className="flex items-center space-x-2"
          >
            ← Retour
          </Button>
          
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${phase === 'pickup' ? 'bg-yellow-500' : 'bg-green-500'}`} />
            <span className="font-medium">
              {phase === 'pickup' ? 'En route vers le client' : 'Course en cours'}
            </span>
          </div>
        </div>

        {/* Passenger Info */}
        <div className="bg-blue-50 rounded-lg p-4 mb-4">
          <h3 className="font-semibold mb-2">Informations passager</h3>
          <p className="text-sm">{state.currentRide?.passengerName || 'Grace-Divine Kambamba'}</p>
          <div className="flex items-center space-x-2 mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCallPassenger}
              className="flex items-center space-x-1"
            >
              <Phone className="w-4 h-4" />
              <span>Appeler</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleMessagePassenger}
              className="flex items-center space-x-1"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Message</span>
            </Button>
          </div>
        </div>

        {/* 🗺️ CARTE GOOGLE MAPS AVEC ITINÉRAIRE */}
        {state.currentRide?.pickup?.lat && 
         state.currentRide?.pickup?.lng && 
         state.currentRide?.destination?.lat && 
         state.currentRide?.destination?.lng ? (
          <div className="mb-4 h-64 rounded-lg overflow-hidden">
            <GoogleMapView
              center={state.currentRide.pickup}
              zoom={13}
              showRoute={true}
              routeStart={state.currentRide.pickup}
              routeEnd={state.currentRide.destination}
              enableGeolocation={true}
              enableZoomControls={true}
              className="w-full h-full"
            />
          </div>
        ) : (
          <div className="mb-4 h-64 bg-gray-100 rounded-lg flex items-center justify-center">
            <div className="text-center p-4">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-gray-600 font-medium">Chargement de la carte...</p>
              <p className="text-xs text-gray-500 mt-1">🗺️ Google Maps • Itinéraire en temps réel</p>
              <p className="text-xs text-gray-400 mt-2">
                Pickup: {state.currentRide?.pickup?.lat && state.currentRide?.pickup?.lng ? '✅' : '❌'} | 
                Dest: {state.currentRide?.destination?.lat && state.currentRide?.destination?.lng ? '✅' : '❌'}
              </p>
            </div>
          </div>
        )}

        {/* Locations */}
        <div className="space-y-3">
          <div className="flex items-start space-x-3">
            <div className="w-3 h-3 bg-green-500 rounded-full mt-2" />
            <div>
              <p className="text-sm text-gray-600">Point de départ</p>
              <p className="font-medium">{state.currentRide?.pickup?.address || 'Point de départ non spécifié'}</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="w-3 h-3 bg-red-500 rounded-full mt-2" />
            <div>
              <p className="text-sm text-gray-600">Destination</p>
              <p className="font-medium">{state.currentRide?.destination?.address || 'Destination non spécifiée'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Timer and Cost Display */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-white rounded-lg shadow-md p-6 mb-4"
      >
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <Clock className="w-6 h-6 text-blue-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Temps écoulé</p>
            <p className="text-xl font-bold">{formatTime(elapsedTime)}</p>
          </div>
          
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <DollarSign className="w-6 h-6 text-green-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Coût actuel</p>
            <p className="text-xl font-bold">{(currentCost || 0).toLocaleString()} CDF</p>
          </div>
        </div>

        {/* Timer Controls - Afficher uniquement si en destination */}
        {phase === 'destination' && (
          <TimerControl
            isTimerActive={!isTimerDisabled}
            isTimerDisabled={isTimerDisabled}
            onTimerToggle={handleTimerToggle}
            onOfferPostpaid={handleOfferPostpaid}
            onDisableFreeWaiting={handleDisableFreeWaiting}
            currentCost={currentCost}
            elapsedTime={elapsedTime}
            freeWaitingDisabled={freeWaitingDisabled}
            waitingTime={waitingTime}
            waitingTimeFrozen={waitingTimeFrozen}
            billingElapsedTime={billingElapsedTime}
            isBillingActive={isBillingActive}
          />
        )}
      </motion.div>

      {/* Action Button */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-white rounded-lg shadow-md p-4"
      >
        {phase === 'pickup' ? (
          <Button
            onClick={handleArriveAtPickup}
            className="w-full h-14 bg-green-500 hover:bg-green-600 text-white rounded-xl"
          >
            <CheckCircle className="w-5 h-5 mr-2" />
            Arrivé au point de départ
          </Button>
        ) : (
          <div className="space-y-3">
            {!passengerPaid ? (
              <Button
                onClick={() => {
                  setPassengerPaid(true);
                  toast.success('Paiement confirmé', {
                    description: 'Vous pouvez maintenant clôturer la course'
                  });
                }}
                className="w-full h-14 bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl"
              >
                <CheckCircle className="w-5 h-5 mr-2" />
                Confirmer le paiement du passager
              </Button>
            ) : (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-green-800 font-semibold">✅ Paiement confirmé</p>
                <p className="text-xs text-green-600 mt-1">Vous pouvez maintenant terminer la course</p>
              </div>
            )}
            
            {/* Bouton de clôture de course */}
            <Button
              onClick={handleCompleteRide}
              disabled={!passengerPaid}
              className={`w-full h-14 rounded-xl ${
                passengerPaid 
                  ? 'bg-green-500 hover:bg-green-600' 
                  : 'bg-gray-300 cursor-not-allowed'
              } text-white`}
            >
              <CheckCircle className="w-5 h-5 mr-2" />
              {passengerPaid ? 'Clôturer la course' : 'Confirmer le paiement d\'abord'}
            </Button>
          </div>
        )}
      </motion.div>

      {/* Ride Completion Dialog */}
      <RideCompletionSummaryDialog
        isOpen={showCompletionDialog}
        onClose={() => {
          setShowCompletionDialog(false);
          toast.success('Retour au tableau de bord');
          // ✅ Rediriger vers le dashboard conducteur après la clôture
          setCurrentScreen('driver-dashboard');
        }}
        userType="driver"
        rideData={{
          duration: elapsedTime || 0,
          distance: state.currentRide?.distance || 0,
          baseCost: 0, // ✅ CORRECTION : Ne pas calculer baseCost/waitingCost séparément
          waitingTime: waitingTime || 0,
          waitingCost: 0, // ✅ CORRECTION : Tout est dans totalCost
          totalCost: (currentCost && !isNaN(currentCost)) ? currentCost : 0, // ✅ PROTECTION ANTI-CRASH
          freeWaitingDisabled: freeWaitingDisabled,
          billingElapsedTime: billingElapsedTime || 0,
          passengerName: state.currentUser?.name || state.currentRide?.passengerName || 'Passager',
          vehicleType: (state.currentRide?.vehicleType || 'Smart Confort') as 'Smart Standard' | 'Smart Confort' | 'Smart Plus',
          startLocation: state.currentRide?.pickup?.address || state.currentRide?.pickupAddress || 'Point de départ',
          endLocation: state.currentRide?.destination?.address || state.currentRide?.destinationAddress || 'Destination'
        }}
      />
    </motion.div>
  );
}