import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from '../../lib/motion'; // ✅ FIX: Utiliser l'implémentation locale
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { useAppState } from '../../hooks/useAppState';
import { convertUSDtoCDF, convertCDFtoUSD, getExchangeRate } from '../../lib/pricing';

// Icônes SVG inline
const MapPin = ({ className = "w-5 h-5" }: { className?: string }) => (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>);
const Clock = ({ className = "w-5 h-5" }: { className?: string }) => (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>);
const DollarSign = ({ className = "w-5 h-5" }: { className?: string }) => (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>);
const User = ({ className = "w-10 h-10" }: { className?: string }) => (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>);
const Phone = ({ className = "w-5 h-5" }: { className?: string }) => (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>);
const Car = ({ className = "w-5 h-5" }: { className?: string }) => (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" /></svg>);
const AlertCircle = ({ className = "w-5 h-5" }: { className?: string }) => (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>);
const Sun = ({ className = "w-5 h-5" }: { className?: string }) => (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>);
const Moon = ({ className = "w-5 h-5" }: { className?: string }) => (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>);
const Zap = ({ className = "w-5 h-5" }: { className?: string }) => (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>);
const Timer = ({ className = "w-5 h-5" }: { className?: string }) => (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>);
const Share2 = ({ className = "w-5 h-5" }: { className?: string }) => (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>);
const Navigation = ({ className = "w-5 h-5" }: { className?: string }) => (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>);
const Navigation2 = ({ className = "w-5 h-5" }: { className?: string }) => (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>);
const MessageCircle = ({ className = "w-5 h-5" }: { className?: string }) => (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>);
const X = ({ className = "w-5 h-5" }: { className?: string }) => (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>);
import { PRICING_CONFIG } from '../../lib/pricing-data';
import { RatingDialog } from './RatingDialog';
import { MapView } from '../MapView'; // ✅ OPTIMISÉ: Utiliser MapView directement (Google Maps)
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { toast } from '../../lib/toast';

// ✅ Déclaration TypeScript pour Leaflet
declare global {
  interface Window {
    L: any;
  }
}

const FREE_WAITING_TIME = 10 * 60; // 10 minutes en secondes

// Fonction pour détecter jour/nuit
function getTimeOfDay(): 'jour' | 'nuit' {
  const hour = new Date().getHours();
  // Jour: 06:00-20:59 | Nuit: 21:00-05:59
  if (hour >= 6 && hour <= 20) {
    return 'jour';
  }
  return 'nuit';
}

export function RideInProgressScreen() {
  const { state, setCurrentScreen, updateRide } = useAppState();
  const currentRide = state.currentRide;
  
  const [elapsedTime, setElapsedTime] = useState(0); // Temps écoulé en secondes
  const [currentCost, setCurrentCost] = useState(0); // Coût actuel en CDF
  const [currentCostUSD, setCurrentCostUSD] = useState(0); // Coût actuel en USD
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [rideCompleted, setRideCompleted] = useState(false);
  const [timeOfDay, setTimeOfDay] = useState<'jour' | 'nuit'>(getTimeOfDay());
  
  // 🆕 États pour le compteur de facturation synchronisé
  const [billingActive, setBillingActive] = useState(false);
  const [billingElapsedTime, setBillingElapsedTime] = useState(0);
  const [showBillingNotification, setShowBillingNotification] = useState(false);
  
  // État pour tracker les notifications envoyées
  const [notificationsSent, setNotificationsSent] = useState({
    rideStarted: false,
    billingStarted: false,
    rideCompleted: false
  });

  // 🆕 État pour la position simulée du conducteur
  const [driverLocation, setDriverLocation] = useState({
    lat: currentRide?.pickup?.lat || -4.3276,
    lng: currentRide?.pickup?.lng || 15.3136,
  });
  
  // ✅ CARTE OPENSTREETMAP - États
  const [mapLoaded, setMapLoaded] = useState(false);
  const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string } | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  // 🆕 POLLING EN TEMPS RÉEL : Récupérer les mises à jour de la course toutes les 3 secondes
  useEffect(() => {
    if (!currentRide?.id) return;

    console.log('🔄 Démarrage du polling pour la course:', currentRide.id);


    const pollRideStatus = async () => {
      try {
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/rides/${currentRide.id}`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (!response.ok) {
          console.error('❌ Erreur polling:', response.status);
          return;
        }

        const updatedRide = await response.json();

        console.log('📥 Mise à jour reçue:', {
          status: updatedRide.status,
          billingStartTime: updatedRide.billingStartTime,
          billingElapsedTime: updatedRide.billingElapsedTime
        });

        // ✅ Mettre à jour le ride dans le contexte
        if (updatedRide && updatedRide.id) {
          updateRide(updatedRide.id, updatedRide);
        }

      } catch (error) {
        console.error('❌ Erreur lors du polling:', error);

    
    let isActive = true; // Flag pour éviter les mises à jour après unmount

    const pollRideStatus = async () => {
      // ✅ PROTECTION: Ne pas continuer si le composant est démonté
      if (!isActive) return;
      
      try {
        // ✅ PROTECTION: Vérifier que les variables nécessaires existent
        if (!projectId || !publicAnonKey) {
          console.error('❌ Configuration Supabase manquante');
          return;
        }
        
        const url = `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/rides/${currentRide.id}`;
        console.log('📡 Polling URL:', url);
        
        // ✅ Créer un timeout manuel (AbortSignal.timeout() n'est pas supporté partout)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 secondes max
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          signal: controller.signal
        }).catch(err => {
          clearTimeout(timeoutId);
          // ✅ Capturer spécifiquement les erreurs fetch
          if (err.name === 'AbortError') {
            console.warn('⚠️ Timeout du polling (5s dépassées)');
          } else {
            console.warn('⚠️ Erreur réseau lors du polling:', err.name);
          }
          return null; // Retourner null au lieu de laisser l'erreur se propager
        });

        clearTimeout(timeoutId);

        if (!response) {
          // Requête échouée (timeout, erreur réseau, etc.)
          return;
        }

        if (!response.ok) {
          console.error('❌ Erreur HTTP polling:', response.status, response.statusText);
          return;
        }

        const updatedRide = await response.json().catch(err => {
          console.error('❌ Erreur parsing JSON:', err);
          return null;
        });

        if (!updatedRide) return;

        console.log('📥 Mise à jour reçue:', {
          status: updatedRide?.status,
          billingStartTime: updatedRide?.billingStartTime,
          billingElapsedTime: updatedRide?.billingElapsedTime
        });

        // ✅ Mettre à jour le ride dans le contexte (avec protection)
        if (isActive && updatedRide && updatedRide.id) {
          updateRide(updatedRide.id, updatedRide);
        }

      } catch (error: any) {
        // ✅ NE PAS logger les erreurs "Script error" qui polluent la console
        if (error?.message && error.message !== 'Script error.') {
          console.error('❌ Erreur lors du polling:', {
            name: error?.name,
            message: error?.message
          });
        }
        // Ignorer silencieusement les autres erreurs pour éviter la pollution

      }
    };

    // Polling toutes les 3 secondes

    const interval = setInterval(pollRideStatus, 3000);

    const interval = setInterval(() => {
      if (isActive) {
        pollRideStatus();
      }
    }, 3000);


    // Premier polling immédiat
    pollRideStatus();

    return () => {
      console.log('🛑 Arrêt du polling');

      clearInterval(interval);
    };
  }, [currentRide?.id]);

      isActive = false;
      clearInterval(interval);
    };
  }, [currentRide?.id]); // ✅ Seulement currentRide.id comme dépendance


  // Mettre à jour l'heure du jour toutes les minutes
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeOfDay(getTimeOfDay());
    }, 60000); // Vérifier toutes les minutes
    return () => clearInterval(interval);
  }, []);

  // 🆕 SYNCHRONISATION DU COMPTEUR DE FACTURATION AVEC LE CONDUCTEUR
  useEffect(() => {
    // ✅ ARRÊTER SI LA COURSE N'EST PAS EN COURS OU DÉJÀ TERMINÉE
    if (!currentRide || currentRide.status !== 'in_progress' || rideCompleted) {
      console.log('⏸️ Arrêt synchronisation facturation:', {
        status: currentRide?.status,
        rideCompleted
      });
      return;
    }

    // Vérifier si le conducteur a activé la facturation
    if (currentRide.billingStartTime && !billingActive) {
      console.log('💰 Facturation activée par le conducteur !', {
        billingStartTime: currentRide.billingStartTime,
        currentTime: Date.now()
      });
      
      setBillingActive(true);
      setShowBillingNotification(true);
      
      // Notification immédiate au passager
      toast.warning('⚡ Facturation commencée !', {
        description: 'Le conducteur a activé la facturation. Le compteur est en cours.',
        duration: 7000
      });

      // Masquer la notification après 5 secondes
      setTimeout(() => {
        setShowBillingNotification(false);
      }, 5000);
    }

    // Synchroniser le temps de facturation avec le conducteur
    if (currentRide.billingStartTime && billingActive) {
      const startTime = currentRide.billingStartTime;
      const interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setBillingElapsedTime(elapsed);
        
        console.log('⏱️ Temps de facturation côté passager:', {
          elapsed,
          billingStartTime: startTime,
          currentTime: Date.now()
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [currentRide?.billingStartTime, currentRide?.billingElapsedTime, currentRide?.status, billingActive, rideCompleted]);

  // 🆕 DÉTECTION DE LA CLÔTURE DE LA COURSE
  useEffect(() => {
    if (!currentRide) return;

    console.log('🔍 Vérification clôture course:', {
      status: currentRide.status,
      billingElapsedTime: currentRide.billingElapsedTime,
      rideCompleted: rideCompleted
    });

    // ✅ CONDITION STRICTE : La course est terminée SI :
    // 1. Le statut est 'completed'
    // 2. On n'a PAS encore traité la clôture (rideCompleted === false)
    if (currentRide.status === 'completed' && !rideCompleted) {
      console.log('🏁 Course clôturée par le conducteur !', {
        billingElapsedTime: currentRide.billingElapsedTime,
        estimatedPrice: currentRide.estimatedPrice,
        finalPrice: currentRide.finalPrice
      });

      setRideCompleted(true);
      
      // Utiliser le billingElapsedTime du serveur si disponible
      if (currentRide.billingElapsedTime !== undefined) {
        setBillingElapsedTime(currentRide.billingElapsedTime);
      }
      
      // Calculer le temps pour la notification
      const finalBillingTime = currentRide.billingElapsedTime !== undefined ? currentRide.billingElapsedTime : billingElapsedTime;
      const minutes = Math.floor(finalBillingTime / 60);
      const seconds = finalBillingTime % 60;
      
      const timeStr = minutes > 0 
        ? `${minutes}min ${seconds}s`
        : `${seconds}s`;
      
      // Utiliser le prix final ou le prix estimé
      const finalAmount = currentRide.finalPrice || currentRide.estimatedPrice || 0;
      
      toast.success('🏁 Course terminée !', {
        description: `Temps de facturation: ${timeStr}. Montant: ${finalAmount.toLocaleString()} CDF`,
        duration: 8000
      });

      // Rediriger vers le paiement après 2 secondes
      setTimeout(() => {
        console.log('🔄 Redirection vers écran de paiement...');
        setCurrentScreen('payment');
      }, 2000);
    }
  }, [currentRide?.status, currentRide?.billingElapsedTime, rideCompleted, setCurrentScreen]);

  // Chronomètre général de la course
  useEffect(() => {
    // ✅ ARRÊTER LE CHRONO SI LA COURSE EST TERMINÉE
    if (!currentRide || currentRide.status !== 'in_progress' || rideCompleted) {
      console.log('⏸️ Chronomètre arrêté:', {
        status: currentRide?.status,
        rideCompleted
      });
      return;
    }

    // Notification au démarrage de la course (une seule fois)
    if (!notificationsSent.rideStarted) {
      toast.success('Course démarrée !', {
        description: 'Le chronomètre est activé. Les 10 premières minutes sont gratuites.',
        duration: 5000
      });
      setNotificationsSent(prev => ({ ...prev, rideStarted: true }));
    }

    const startTime = currentRide.startedAt ? new Date(currentRide.startedAt).getTime() : Date.now();
    
    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.floor((now - startTime) / 1000);
      setElapsedTime(elapsed);
      
      // Calculer le coût en temps réel
      const { costCDF, costUSD } = calculateRealTimeCost(elapsed);
      setCurrentCost(costCDF);
      setCurrentCostUSD(costUSD);
      
      // Notification quand la facturation commence automatiquement (après 10 minutes)
      if (elapsed >= FREE_WAITING_TIME && !notificationsSent.billingStarted && !billingActive) {
        toast.warning('Facturation automatique commencée', {
          description: `Les 10 minutes gratuites sont écoulées. Facturation en cours.`,
          duration: 6000
        });
        setNotificationsSent(prev => ({ ...prev, billingStarted: true }));
        setBillingActive(true);
        
        // 🔥 ACTIVER LE COMPTEUR CÔTÉ SERVEUR (synchronisation)
        fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/rides/activate-billing`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              rideId: currentRide.id,
              waitingTimeFrozen: elapsed
            })
          }
        ).then(res => {
          if (res.ok) {
            console.log('✅ Compteur de facturation activé automatiquement (passager)');
          }
        }).catch(err => {
          console.error('❌ Erreur activation chrono auto:', err);
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [currentRide, timeOfDay, billingActive, rideCompleted]);

  // 🆕 Simuler le mouvement du véhicule vers la destination
  useEffect(() => {
    if (!currentRide || !currentRide.destination?.lat || !currentRide.destination?.lng) return;

    const interval = setInterval(() => {
      setDriverLocation(prev => {
        // Calculer la direction vers la destination
        const latDiff = currentRide.destination.lat - prev.lat;
        const lngDiff = currentRide.destination.lng - prev.lng;
        
        // Avancer légèrement vers la destination
        const speed = 0.0001; // Vitesse de déplacement
        return {
          lat: prev.lat + latDiff * speed,
          lng: prev.lng + lngDiff * speed,
        };
      });
    }, 2000); // Mise à jour toutes les 2 secondes

    return () => clearInterval(interval);
  }, [currentRide?.destination?.lat, currentRide?.destination?.lng]);

  // 🆕 FONCTION DE CALCUL PAR PALIER D'HEURE (pas par minute/seconde)
  // ⚠️ ATTENTION : Cette fonction calcule UNIQUEMENT LA SURCHARGE (pas le prix de base)
  // Le prix de base (course) est déjà inclus dans estimatedPrice
  const calculateBillingCostByHourlySlot = (billingSeconds: number): { costCDF: number; costUSD: number } => {
    if (billingSeconds <= 0) {
      return { costCDF: 0, costUSD: 0 };
    }

    // Récupérer le prix de base de la catégorie
    const category = currentRide?.vehicleCategory || 'smart_standard';
    const categoryConfig = PRICING_CONFIG[category as keyof typeof PRICING_CONFIG];
    const baseHourlyRateUSD = categoryConfig?.pricing?.course_heure?.[timeOfDay]?.usd || 7;
    const baseHourlyRateCDF = categoryConfig?.pricing?.course_heure?.[timeOfDay]?.cdf || 20000;
    
    // 🎯 LOGIQUE : Le prix de base est déjà payé via estimatedPrice
    // On facture UNIQUEMENT les heures supplémentaires
    // 0sec à 59min59sec = +0 FC (gratuit, déjà dans le prix de base)
    // 1h à 1h59min59sec = +20 000 FC (1 heure supplémentaire)
    // 2h à 2h59min59sec = +40 000 FC (2 heures supplémentaires)
    
    const totalMinutes = Math.floor(billingSeconds / 60);
    const currentHourSlot = Math.floor(totalMinutes / 60); // 0 = première heure, 1 = deuxième heure, etc.
    
    // ✅ CORRECTION : On ne facture PAS la première heure (elle est dans estimatedPrice)
    // Surcharge = prix de base × nombre d'heures SUPPLÉMENTAIRES
    const additionalHours = Math.max(0, currentHourSlot); // 0 pour la première heure, 1 pour la deuxième, etc.
    
    const costUSD = (baseHourlyRateUSD || 7) * additionalHours;
    const costCDF = (baseHourlyRateCDF || 20000) * additionalHours;
    
    console.log('💰 Calcul facturation par palier:', {
      billingSeconds,
      totalMinutes,
      currentHourSlot,
      additionalHours,
      baseHourlyRateCDF,
      costCDF: Math.round(costCDF)
    });
    
    return { 
      costCDF: Math.round(costCDF) || 0, 
      costUSD: parseFloat((costUSD || 0).toFixed(2)) 
    };
  };

  // Fonction pour calculer le coût du temps d'attente (DEPRECATED - utiliser calculateBillingCostByHourlySlot)
  const calculateWaitingCost = (seconds: number): { costCDF: number; costUSD: number } => {
    if (seconds <= 0) {
      return { costCDF: 0, costUSD: 0 };
    }

    // Utiliser la nouvelle logique par palier
    return calculateBillingCostByHourlySlot(seconds);
  };

  // Calculer le coût en temps réel avec taux de change dynamique
  const calculateRealTimeCost = (totalSeconds: number): { costCDF: number; costUSD: number } => {
    if (!currentRide) {
      return { costCDF: 0, costUSD: 0 };
    }

    // 🆕 Si le conducteur a activé la facturation manuellement
    if (currentRide.billingStartTime && billingActive) {
      // Utiliser le temps de facturation activé par le conducteur
      return calculateBillingCostByHourlySlot(billingElapsedTime);
    }
    
    // 🆕 Sinon, pas de facturation tant que le conducteur ne l'active pas
    return { costCDF: 0, costUSD: 0 };
  };

  if (!currentRide) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-6">
          <p>Aucune course en cours</p>
        </Card>
      </div>
    );
  }

  // 🔥 VÉRIFICATION : S'assurer que toutes les données nécessaires sont présentes
  if (!currentRide.pickup || !currentRide.destination) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-6">
          <p>Données de course incomplètes</p>
          <pre className="text-xs mt-2">{JSON.stringify(currentRide, null, 2)}</pre>
        </Card>
      </div>
    );
  }

  // Format de temps pour affichage
  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs}h ${mins}min ${secs}s`;
    }
    return `${mins}min ${secs}s`;
  };

  // ✅ FIX: Calculer le taux horaire avec la bonne structure
  const category = currentRide.vehicleCategory || 'smart_standard';
  const categoryConfig = PRICING_CONFIG[category as keyof typeof PRICING_CONFIG];
  const hourlyRateUSD = categoryConfig?.pricing?.course_heure?.[timeOfDay]?.usd || 7;

  // 🆕 Fonction de partage de course
  const handleShareRide = async () => {
    const shareText = `🚗 Je suis en course avec SmartCabb\n📍 De: ${currentRide.pickup.address}\n🎯 Vers: ${currentRide.destination.address}\n💰 Prix estimé: ${currentRide.estimatedPrice?.toLocaleString()} CDF\n⏱️ Temps écoulé: ${formatTime(elapsedTime)}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Ma course SmartCabb',
          text: shareText,
        });
        toast.success('Course partagée avec succès !');
      } catch (error) {
        console.log('Erreur partage:', error);
      }
    } else {
      // Fallback: copier dans le presse-papiers
      try {
        await navigator.clipboard.writeText(shareText);
        toast.success('Informations copiées dans le presse-papiers !');
      } catch (error) {
        toast.error('Impossible de partager la course');
      }
    }
  };

  // Créer le driver avec la position simulée
  const simulatedDriver = currentRide ? {
    id: currentRide.driverId || 'driver-1',
    name: currentRide.driverName || 'Chauffeur',
    location: driverLocation,
    isOnline: true,
    isAvailable: false,
    documentsVerified: true,
    vehicleType: currentRide.vehicleCategory || 'standard',
    vehiclePlate: currentRide.vehiclePlate || 'CD-XXX-XXX',
    rating: 4.8,
    totalRides: 0,
    phoneNumber: '',
    currentRideId: currentRide.id
  } : null;

  return (
    <div className="h-screen w-full flex flex-col bg-gray-900 relative overflow-hidden">
      {/* 🗺️ CARTE EN PLEIN ÉCRAN */}
      <div className="absolute inset-0 z-0">
        <MapView
          center={driverLocation}
          drivers={simulatedDriver ? [simulatedDriver] : []}
          zoom={14}
          className="w-full h-full"
          showUserLocation={false}
          enableGeolocation={false}
          showRoute={!!(currentRide.destination?.lat && currentRide.destination?.lng)}
          routeStart={driverLocation}
          routeEnd={currentRide.destination?.lat && currentRide.destination?.lng ? {
            lat: currentRide.destination.lat,
            lng: currentRide.destination.lng,
            address: currentRide.destination.address
          } : undefined}
          enableZoomControls={true}
          disableAutoCenter={true}
        />
      </div>

      {/* 📱 HEADER TRANSPARENT */}
      <div className="absolute top-0 left-0 right-0 z-30">
        <div className="bg-gradient-to-b from-black/60 to-transparent backdrop-blur-sm">
          <div className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h1 className="text-lg font-bold text-white drop-shadow-lg">Course en cours</h1>
                <p className="text-xs text-white/90 drop-shadow-md">Trajet vers votre destination</p>
              </div>
              <div className="flex items-center space-x-2">
                {/* Bouton de partage */}
                <button
                  onClick={handleShareRide}
                  className="p-2.5 bg-white/90 backdrop-blur-md rounded-full shadow-xl hover:bg-white transition-all active:scale-95"
                >
                  <Share2 className="w-4 h-4 text-primary" />
                </button>
                
                {/* Bouton d'appel */}
                <button
                  onClick={() => {
                    if (currentRide.driverPhone) {
                      window.location.href = `tel:${currentRide.driverPhone}`;
                    } else {
                      toast.info('Numéro du conducteur non disponible');
                    }
                  }}
                  className="p-2.5 bg-green-500/90 backdrop-blur-md rounded-full shadow-xl hover:bg-green-600 transition-all active:scale-95"
                >
                  <Phone className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 🆕 NOTIFICATION DE FACTURATION ACTIVÉE (flottante) */}
      <AnimatePresence>
        {showBillingNotification && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="absolute top-24 left-4 right-4 z-50"
          >
            <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-4 rounded-2xl shadow-2xl backdrop-blur-xl">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center animate-pulse">
                  <Zap className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg">⚡ Facturation activée !</h3>
                  <p className="text-sm text-white/90">Le conducteur a activé le compteur de facturation.</p>
                </div>
                <button
                  onClick={() => setShowBillingNotification(false)}
                  className="p-1 hover:bg-white/20 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 💰 COMPTEUR DE COURSE EN BAS (STICKY) */}
      <div className="absolute bottom-0 left-0 right-0 z-40">
        <div className="bg-gradient-to-t from-black/80 to-transparent backdrop-blur-xl">
          <div className="p-4 space-y-3">
            {/* Compteur de facturation si actif */}
            {billingActive && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-3"
              >
                {/* 🔴 ZONE GRISE : Temps d'attente gelé (gratuit) */}
                {currentRide.waitingTimeFrozen !== undefined && currentRide.waitingTimeFrozen > 0 && (
                  <div className="bg-gradient-to-r from-gray-600 to-gray-700 rounded-2xl p-4 shadow-2xl">
                    <div className="flex items-center justify-between text-white">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                          <Clock className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs text-white/80">Temps d'attente (gratuit)</p>
                          <p className="text-2xl font-bold font-mono">{formatTime(currentRide.waitingTimeFrozen)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-white/80">Coût</p>
                        <p className="text-xl font-bold">+0 FC</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* 🔵 ZONE BLEUE : Facturation réelle */}
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-4 shadow-2xl">
                  <div className="flex items-center justify-between text-white">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center animate-pulse">
                        <Timer className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs text-white/80">Facturation active</p>
                        <p className="text-2xl font-bold font-mono">{formatTime(billingElapsedTime)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-white/80">Prix</p>
                      <p className="text-xl font-bold">
                        {((currentRide.estimatedPrice || 0) + calculateBillingCostByHourlySlot(billingElapsedTime).costCDF).toLocaleString()} FC
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Panneau principal de course - MASQUÉ si facturation active */}
            {!billingActive && (
              <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden">
                {/* Temps total et coût */}
                <div className="p-4 bg-gradient-to-br from-primary to-blue-600 text-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                        <Clock className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-xs text-white/80">Temps écoulé</p>
                        <p className="text-2xl font-bold font-mono">{formatTime(elapsedTime)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-white/80">Coût total</p>
                      <p className="text-3xl font-bold">
                        {(currentRide.estimatedPrice + currentCost).toLocaleString()} FC
                      </p>
                      <p className="text-xs text-white/70">
                        ≈ {(((currentRide.estimatedPrice || 0) + (currentCost || 0)) / (getExchangeRate() || 2850)).toFixed(2)} USD
                      </p>
                    </div>
                  </div>
                  
                  {/* Barre de progression des 10 minutes gratuites */}
                  {elapsedTime < FREE_WAITING_TIME && (
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-white/80 mb-1">
                        <span>Attente gratuite</span>
                        <span>{Math.floor((FREE_WAITING_TIME - elapsedTime) / 60)} min restantes</span>
                      </div>
                      <div className="w-full bg-white/20 rounded-full h-2">
                        <div 
                          className="h-2 bg-green-400 rounded-full transition-all duration-1000"
                          style={{ width: `${Math.min((elapsedTime / FREE_WAITING_TIME) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Détails du trajet */}
                <div className="p-4 space-y-3">
                  {/* Départ */}
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <MapPin className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500">Départ</p>
                      <p className="font-medium text-gray-900 truncate">{currentRide.pickup.address}</p>
                    </div>
                  </div>

                  {/* Ligne de séparation */}
                  <div className="flex items-center space-x-3">
                    <div className="w-8 flex justify-center">
                      <div className="w-0.5 h-6 bg-gradient-to-b from-green-300 to-red-300" />
                    </div>
                  </div>

                  {/* Destination */}
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <MapPin className="w-4 h-4 text-red-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500">Destination</p>
                      <p className="font-medium text-gray-900 truncate">{currentRide.destination.address}</p>
                    </div>
                  </div>

                  {/* Conducteur */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Conducteur</p>
                        <p className="font-semibold text-gray-900">{currentRide.driverName || 'Chauffeur'}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="px-3 py-1 bg-blue-100 rounded-full">
                        <p className="text-xs font-medium text-blue-700 capitalize">{currentRide.vehicleCategory || 'Standard'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dialog d'évaluation */}
      {showRatingDialog && (
        <RatingDialog
          onClose={() => {
            setShowRatingDialog(false);
            setCurrentScreen('home');
          }}
        />
      )}
    </div>
  );
}
