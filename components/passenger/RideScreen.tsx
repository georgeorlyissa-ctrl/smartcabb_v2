import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from '../../lib/motion'; // ✅ FIX: Utiliser l'implémentation locale avec AnimatePresence
import { Button } from '../ui/button';
import { useAppState } from '../../hooks/useAppState';
import { useTranslation } from '../../hooks/useTranslation';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { AlternativeVehicleDialog } from './AlternativeVehicleDialog';
import { CancelRideReasonModal } from './CancelRideReasonModal';
import { VehicleCategory } from '../../lib/pricing';
import { toast } from '../../lib/toast';
import { getVehicleDisplayName } from '../../lib/vehicle-helpers';

// Icônes SVG inline
const ArrowLeft = ({ className = "w-5 h-5" }: { className?: string }) => (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>);
const MapPin = ({ className = "w-5 h-5" }: { className?: string }) => (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>);
const Phone = ({ className = "w-5 h-5" }: { className?: string }) => (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>);
const MessageCircle = ({ className = "w-5 h-5" }: { className?: string }) => (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>);
const Star = ({ className = "w-4 h-4" }: { className?: string }) => (<svg className={className} fill="currentColor" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>);
const Navigation = ({ className = "w-5 h-5" }: { className?: string }) => (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>);
const Clock = ({ className = "w-5 h-5" }: { className?: string }) => (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>);
const User = ({ className = "w-10 h-10" }: { className?: string }) => (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>);
const Car = ({ className = "w-5 h-5" }: { className?: string }) => (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" /></svg>);
const X = ({ className = "w-5 h-5" }: { className?: string }) => (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>);
const CreditCard = ({ className = "w-5 h-5" }: { className?: string }) => (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>);
const Smartphone = ({ className = "w-5 h-5" }: { className?: string }) => (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>);
const Banknote = ({ className = "w-5 h-5" }: { className?: string }) => (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>);
const Wallet = ({ className = "w-5 h-5" }: { className?: string }) => (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>);
const TrendingUp = ({ className = "w-5 h-5" }: { className?: string }) => (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>);
const Award = ({ className = "w-5 h-5" }: { className?: string }) => (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="8" r="7" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /></svg>);
const AlertCircle = ({ className = "w-5 h-5" }: { className?: string }) => (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /><line x1="12" y1="8" x2="12" y2="12" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /><line x1="12" y1="16" x2="12.01" y2="16" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /></svg>);
const RefreshCw = ({ className = "w-5 h-5" }: { className?: string }) => (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /><polyline points="1 20 1 14 7 14" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /></svg>);
const Radio = ({ className = "w-5 h-5" }: { className?: string }) => (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="2" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /><path d="M16.24 7.76a6 6 0 010 8.49m-8.48-.01a6 6 0 010-8.49m11.31-2.82a10 10 0 010 14.14m-14.14 0a10 10 0 010-14.14" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /></svg>);

interface DriverData {
  id: string;
  full_name: string;
  phone: string;
  rating: number;
  total_rides: number;
  vehicle?: {
    make: string;
    model: string;
    year: number;
    color: string;
    license_plate: string;
  };
  // ✅ FIX #4: Ajout location pour itinéraire
  location?: {
    lat: number;
    lng: number;
  };
}

// ✅ FIX #6: Helper pour envoyer des notifications
const sendNotification = (title: string, message: string, type: 'info' | 'success' | 'warning' = 'info') => {
  switch(type) {
    case 'success':
      toast.success(title, { description: message, duration: 4000 });
      break;
    case 'warning':
      toast.warning(title, { description: message, duration: 4000 });
      break;
    default:
      toast.info(title, { description: message, duration: 4000 });
  }
};

export function RideScreen() {
  const { t } = useTranslation();
  const { setCurrentScreen, state, updateRide } = useAppState();
  const [searchingDriver, setSearchingDriver] = useState(true);
  const [driverFound, setDriverFound] = useState(false);
  const [driverArriving, setDriverArriving] = useState(false);
  const [rideInProgress, setRideInProgress] = useState(false);
  const [arrivalTime, setArrivalTime] = useState(3);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'mobile_money' | 'card' | 'cash' | 'wallet'>('wallet');
  const [driverData, setDriverData] = useState<DriverData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDriverFoundDialog, setShowDriverFoundDialog] = useState(false);
  
  // 🆕 États pour la gestion des alternatives
  const [showAlternativeDialog, setShowAlternativeDialog] = useState(false);
  const [alternativeCategory, setAlternativeCategory] = useState<VehicleCategory | null>(null);
  const [alternativeDriversCount, setAlternativeDriversCount] = useState(0);
  const [checkingAlternative, setCheckingAlternative] = useState(false);

  // ✅ FIX #2: États pour le modal d'annulation
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancellingRide, setCancellingRide] = useState(false);

  // ✅ FIX #3: État pour suivre la position du chauffeur
  const [driverLocation, setDriverLocation] = useState<{lat: number, lng: number} | null>(null);
  
  // ✅ FIX #4: État pour afficher le profil détaillé
  const [showDriverProfile, setShowDriverProfile] = useState(false);

  // ✅ FIX #6: État pour tracker si notification déjà envoyée
  const [notificationsSent, setNotificationsSent] = useState({
    searchStarted: false,
    driverFound: false,
    driverArriving: false,
    rideStarted: false
  });

  const currentRide = state.currentRide;

  // ✅ FIX #6: Notification au démarrage de la recherche
  useEffect(() => {
    if (searchingDriver && !notificationsSent.searchStarted) {
      sendNotification('Recherche en cours', 'Nous recherchons un chauffeur proche de vous...', 'info');
      setNotificationsSent(prev => ({ ...prev, searchStarted: true }));
    }
  }, [searchingDriver]);

  // ✅ FIX #3: Polling pour la localisation du chauffeur
  useEffect(() => {
    if (!currentRide?.driverId || !driverArriving) return;

    const updateDriverLocation = async () => {
      try {
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/drivers/${currentRide.driverId}/location`,
          {
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.location) {
            setDriverLocation(data.location);
          }
        }
      } catch (error) {
        console.debug('🔍 Localisation chauffeur:', error instanceof Error ? error.message : 'en cours');
      }
    };

    // Mettre à jour toutes les 5 secondes
    const locationInterval = setInterval(updateDriverLocation, 5000);
    updateDriverLocation(); // Appel initial

    return () => clearInterval(locationInterval);
  }, [currentRide?.driverId, driverArriving]);

  // Chercher un conducteur disponible dans la base de données
  useEffect(() => {
    // 🔒 NE PAS démarrer si pas de rideId - éviter les vérifications inutiles
    if (!currentRide?.id) {
      console.debug('⏳ En attente de la création de la course...');
      return;
    }

    let checkInterval: NodeJS.Timeout;
    let timeoutTimer: NodeJS.Timeout;
    let initialDelayTimer: NodeJS.Timeout;
    let hasCheckedAlternative = false;

    const checkRideStatus = async () => {
      // Double vérification de sécurité
      if (!currentRide?.id) {
        return;
      }

      try {
        console.log('🔍 Vérification statut de la course:', currentRide.id);
        
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/rides/status/${currentRide.id}`,
          {
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (!response.ok) {
          // Si 404, la course n'existe plus (annulée ou terminée) - c'est normal
          if (response.status === 404) {
            console.log('ℹ️ Course non trouvée (probablement terminée ou annulée)');
            return;
          }
          
          // Pour les autres erreurs, logger un warning
          const errorText = await response.text();
          console.warn('⚠️ Erreur lors de la vérification du statut:', response.status, errorText);
          return;
        }

        const data = await response.json();
        
        if (data.success && data.ride) {
          const ride = data.ride;
          
          // ✅ PROTECTION : Si la course est annulée, arrêter le polling
          if (ride.status === 'cancelled') {
            console.log('🚫 Course annulée détectée, arrêt du polling');
            clearInterval(checkInterval);
            clearTimeout(timeoutTimer);
            setSearchingDriver(false);
            toast.info('Course annulée', {
              description: 'La course a été annulée',
              duration: 3000
            });
            setCurrentScreen('map');
            return;
          }
          
          // ✅ Si la course est EN COURS (driver a confirmé le code)
          if (ride.status === 'in_progress') {
            console.log('🚗 Course en cours détectée !');
            
            // ✅ FIX #6: Notification de démarrage de la course
            if (!notificationsSent.rideStarted) {
              sendNotification('🚗 Course démarrée !', 
                'Votre course a commencé. Profitez de votre trajet en toute sécurité.', 
                'success'
              );
              setNotificationsSent(prev => ({ ...prev, rideStarted: true }));
            }
            
            if (updateRide && currentRide?.id) {
              updateRide(currentRide.id, {
                status: 'in_progress',
                startedAt: ride.startedAt || new Date().toISOString()
              });
            }
            // ✅ Navigation vers l'écran de SUIVI EN TEMPS RÉEL
            console.log('📍 Navigation vers ride-in-progress screen');
            setCurrentScreen('ride-in-progress');
            return;
          }
          
          // 🆕 Si la course est en recherche (auto-retry en cours)
          if (ride.status === 'searching') {
            console.log('🔄 Recherche en cours (cycle auto-retry):', ride.searchCycle || 1);
            // Mettre à jour le message de recherche
            if (updateRide && currentRide?.id) {
              updateRide(currentRide.id, {
                status: 'searching',
                searchCycle: ride.searchCycle,
                searchMessage: ride.searchMessage
              });
            }
            return; // Continuer le polling
          }
          
          // 🆕 Si on attend la décision du passager (après 2 cycles)
          if (ride.status === 'awaiting_retry_decision') {
            console.log('⚠️ En attente de décision passager (2 cycles échoués)');
            clearInterval(checkInterval);
            clearTimeout(timeoutTimer);
            // Mettre à jour le state
            if (updateRide && currentRide?.id) {
              updateRide(currentRide.id, {
                status: 'awaiting_retry_decision',
                driversContacted: ride.driversContacted,
                cyclesCompleted: ride.cyclesCompleted
              });
            }
            return; // Arrêter le polling
          }
          
          // Si un conducteur a accepté la course
          if (ride.status === 'accepted' && ride.driverId) {
            console.log('✅ Conducteur a accepté la course !');
            console.log('📊 Ride data complète:', ride);
            clearInterval(checkInterval);
            clearTimeout(timeoutTimer);
            
            // ✅ MISE À JOUR DU STATE (sans code de confirmation)
            if (updateRide && currentRide?.id) {
              console.log('🔄 Mise à jour du ride...');
              updateRide(currentRide.id, {
                status: 'accepted',
                driverId: ride.driverId,
                // 🚫 confirmationCode supprimé pour simplifier l'UX
                driverName: ride.driverName,
                driverPhone: ride.driverPhone,
                vehicleInfo: ride.vehicleInfo
              });
              console.log('✅ Ride mis à jour');
            } else {
              console.error('❌ Impossible de mettre à jour le ride:', {
                updateRideExists: !!updateRide,
                currentRideId: currentRide?.id
              });
            }
            
            // Récupérer les infos du conducteur
            const driverResponse = await fetch(
              `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/drivers/${ride.driverId}`,
              {
                headers: {
                  'Authorization': `Bearer ${publicAnonKey}`,
                  'Content-Type': 'application/json'
                }
              }
            );

            if (driverResponse.ok) {
              const driverData = await driverResponse.json();
              if (driverData.success) {
                setDriverData({
                  id: driverData.driver.id,
                  full_name: driverData.driver.name || driverData.driver.full_name,
                  phone: driverData.driver.phone || '',
                  rating: driverData.driver.rating || 4.8,
                  total_rides: driverData.driver.total_rides || 0,
                  photo_url: driverData.driver.photo, // ✅ AJOUT : Photo du conducteur
                  vehicle: driverData.driver.vehicleInfo || driverData.driver.vehicle_info,
                  location: driverData.driver.location // ✅ FIX #3
                });
              }
            }
            
            setSearchingDriver(false);
            setDriverFound(true);
            setDriverArriving(true);
            setArrivalTime(3);
            
            // ✅ FIX #6: Notification avec icône personnalisée
            if (!notificationsSent.driverFound) {
              sendNotification('🎉 Chauffeur trouvé !', 
                `${ride.driverName || 'Votre chauffeur'} arrive dans ${3} minutes`, 
                'success'
              );
              setNotificationsSent(prev => ({ ...prev, driverFound: true, driverArriving: true }));
            }
            
            // ✅ NAVIGATION VERS DRIVER-FOUND SCREEN (page fixe)
            console.log('📍 Navigation vers driver-found screen');
            setCurrentScreen('driver-found');
            return;
          }
        }
      } catch (error) {
        // Silencieux - ne pas polluer la console avec des erreurs réseau temporaires
        console.debug('🔍 Vérification statut:', error instanceof Error ? error.message : 'erreur');
      }
    };

    const checkAvailability = async () => {
      if (!currentRide?.id || hasCheckedAlternative || driverFound) return;

      hasCheckedAlternative = true;
      setCheckingAlternative(true);
      
      try {
        console.log('🔍 Vérification disponibilité après 30s...');
        
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/rides/check-availability/${currentRide.id}`,
          {
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (!response.ok) {
          // Si 404, la course n'existe plus - c'est normal
          if (response.status === 404) {
            console.log('ℹ️ Course non trouvée lors de la vérification de disponibilité (probablement terminée ou annulée)');
            setCheckingAlternative(false);
            return;
          }
          
          // Pour les autres erreurs, logger un warning
          const errorText = await response.text();
          console.warn('⚠️ Erreur lors de la vérification de disponibilité:', response.status, errorText);
          setCheckingAlternative(false);
          return;
        }

        const data = await response.json();
        console.log('📊 Résultat disponibilité:', data);

        if (data.success) {
          // Si un conducteur a accepté entre-temps
          if (data.accepted && data.ride) {
            console.log('✅ Un conducteur a accepté !');
            clearInterval(checkInterval);
            
            // Récupérer les infos du conducteur
            if (data.ride.driverId) {
              const driverResponse = await fetch(
                `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/drivers/${data.ride.driverId}`,
                {
                  headers: {
                    'Authorization': `Bearer ${publicAnonKey}`
                  }
                }
              );

              if (driverResponse.ok) {
                const driverData = await driverResponse.json();
                if (driverData.success) {
                  setDriverData({
                    id: driverData.driver.id,
                    full_name: driverData.driver.name || driverData.driver.full_name,
                    phone: driverData.driver.phone || '',
                    rating: driverData.driver.rating || 4.8,
                    total_rides: driverData.driver.total_rides || 0,
                    photo_url: driverData.driver.photo, // ✅ AJOUT : Photo du conducteur
                    vehicle: driverData.driver.vehicleInfo || driverData.driver.vehicle_info
                  });
                }
              }
            }
            
            setSearchingDriver(false);
            setDriverFound(true);
            setDriverArriving(true);
            return;
          }

          // Si une alternative est disponible
          if (!data.available && data.alternative) {
            console.log('💡 Alternative disponible:', data.alternative.category);
            setAlternativeCategory(data.alternative.category as VehicleCategory);
            setAlternativeDriversCount(data.alternative.driversCount);
            setShowAlternativeDialog(true);
            setSearchingDriver(false);
          } 
          // ✅ CORRECTION : N'afficher "Aucun conducteur disponible" QUE si AUCUN conducteur n'est en ligne
          else if (!data.available && !data.alternative && data.noDriversOnlineAtAll) {
            console.log('❌ AUCUN conducteur en ligne dans toutes les catégories');
            setError('Aucun conducteur disponible pour le moment. Veuillez réessayer plus tard.');
            setSearchingDriver(false);
            clearInterval(checkInterval);
          }
          // Des conducteurs sont disponibles dans d'autres catégories, continuer à attendre
          else if (!data.available && !data.alternative && !data.noDriversOnlineAtAll) {
            console.log('⏳ Pas de conducteur dans cette catégorie, mais d\'autres conducteurs en ligne - on attend');
            // Ne rien faire, continuer le polling
          }
          // Des conducteurs sont disponibles, continuer à attendre
          else if (data.available) {
            console.log('✅ Conducteurs disponibles, on continue à attendre');
          }
        }
      } catch (error) {
        // Silencieux - ne pas polluer la console avec des erreurs réseau temporaires
        console.debug('🔍 Disponibilité:', error instanceof Error ? error.message : 'vérification en cours');
      } finally {
        setCheckingAlternative(false);
      }
    };

    // ⏰ DÉLAI INITIAL : Attendre 800ms avant la première vérification
    // Le backend fait maintenant jusqu'à 3 tentatives de vérification (1s + 500ms + 1000ms = 2.5s max)
    // ⚡ OPTIMISATION : Réduit de 1500ms à 800ms pour accélérer le processus
    console.log('⏰ Délai initial de 800ms avant le premier polling...');
    
    initialDelayTimer = setTimeout(() => {
      console.log('✅ Début du polling du statut de la course');
      
      // Vérification initiale
      checkRideStatus();
      
      // Vérifier le statut toutes les 2 secondes (plus rapide pour le code PIN)
      checkInterval = setInterval(checkRideStatus, 2000);
      
      // Après 30 secondes, vérifier la disponibilité et proposer une alternative
timeoutTimer = setTimeout(() => {
  checkAvailability();
}, 30000);

// ⏰ TIMEOUT 3 MINUTES : Si aucun chauffeur n'accepte après 3 min
const globalTimeoutTimer = setTimeout(async () => {
  if (driverFound) return; // Un chauffeur a déjà accepté

  console.log('⏰ Timeout 3 minutes atteint - annulation automatique');

  clearInterval(checkInterval);
  setSearchingDriver(false);

  // Vérifier s'il y a des chauffeurs en ligne
  try {
    const res = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/rides/check-availability/${currentRide?.id}`,
      { headers: { 'Authorization': `Bearer ${publicAnonKey}` } }
    );
    const data = await res.json();

    if (data.success && data.alternatives && data.alternatives.length > 0) {
      // Des chauffeurs existent dans d'autres catégories
      setAlternativeCategory(data.alternatives[0].category as VehicleCategory);
      setAlternativeDriversCount(data.alternatives[0].count || data.alternatives[0].driversCount || 1);
      setShowAlternativeDialog(true);
    } else {
      // Aucun chauffeur du tout
      setError('Aucun chauffeur disponible pour votre commande. Veuillez réessayer plus tard.');
      // Annuler la course automatiquement
      if (currentRide?.id) {
        await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/rides/cancel`,
          {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${publicAnonKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              rideId: currentRide.id,
              passengerId: state.user?.id || 'unknown',
              reason: 'Timeout - aucun chauffeur disponible',
              cancelledBy: 'system'
            })
          }
        );
      }
    }
  } catch (e) {
    setError('Aucun chauffeur disponible pour votre commande. Veuillez réessayer plus tard.');
  }
}, 180000); // 3 minutes

// Nettoyer aussi le globalTimeout au unmount
return () => {
  clearInterval(checkInterval);
  clearTimeout(timeoutTimer);
  clearTimeout(initialDelayTimer);
  clearTimeout(globalTimeoutTimer);
};
    }, 800);

    return () => {
      clearInterval(checkInterval);
      clearTimeout(timeoutTimer);
      clearTimeout(initialDelayTimer);
    };
  }, [currentRide?.id]); // ✅ CORRECTION : Ne plus inclure driverFound pour continuer le polling

  // Simuler l'arrivée du chauffeur
  useEffect(() => {
    if (driverArriving && arrivalTime > 0) {
      const timer = setInterval(() => {
        setArrivalTime((prev) => {
          // ✅ FIX #6: Notification quand le chauffeur arrive (1 minute restante)
          if (prev === 1 && !notificationsSent.driverArriving) {
            sendNotification('📍 Chauffeur arrivé !', 
              'Votre chauffeur est arrivé et vous attend. Préparez votre code de confirmation.', 
              'success'
            );
            setNotificationsSent(prevState => ({ ...prevState, driverArriving: true }));
          }
          
          if (prev <= 1) {
            setDriverArriving(false);
            setRideInProgress(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [driverArriving, arrivalTime]);

  const handleCancelRide = () => {
    // Vérifier qu'il y a bien une course à annuler
    if (!currentRide?.id) {
      console.warn('⚠️ Aucune course active à annuler');
      toast.error('Aucune course active', {
        description: 'Il n\'y a pas de course en cours à annuler',
        duration: 3000
      });
      setCurrentScreen('map');
      return;
    }
    
    console.log('❌ Ouvrir le modal d\'annulation pour la course:', currentRide.id);
    setShowCancelModal(true); // ✅ FIX #2: Afficher le modal au lieu d'annuler directement
  };

  // ✅ FIX #2: Fonction pour confirmer l'annulation avec appel backend
  const handleConfirmCancellation = async (reason: string) => {
    if (!currentRide?.id) {
      console.error('❌ Pas de ride ID pour annuler');
      toast.error('Erreur', {
        description: 'Impossible d\'identifier la course à annuler',
        duration: 4000
      });
      setShowCancelModal(false);
      return;
    }

    console.log('🚫 Début annulation course:', {
      rideId: currentRide.id,
      reason,
      passengerId: state.user?.id
    });

    setCancellingRide(true);

    try {
      console.log('🚫 Annulation de la course avec raison:', reason);
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/rides/cancel`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            rideId: currentRide.id,
            passengerId: state.user?.id || 'unknown',
            reason: reason,
            cancelledBy: 'passenger'
          })
        }
      );

      console.log('📡 Réponse serveur:', response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.text();
        console.error('❌ Erreur serveur:', errorData);
        throw new Error(`Erreur ${response.status}: ${errorData}`);
      }

      const data = await response.json();
      console.log('✅ Données reçues:', data);

      if (data.success) {
        console.log('✅ Course annulée avec succès');
        
        // Mettre à jour le state local
        if (updateRide) {
          updateRide(currentRide.id, {
            status: 'cancelled',
            cancelledBy: 'passenger',
            cancelReason: reason,
            cancelledAt: new Date().toISOString()
          });
        }

        // ✅ FIX #6: Notification d'annulation
        toast.success('Course annulée', {
          description: 'Votre commande a été annulée avec succès',
          duration: 4000
        });

        // Fermer le modal et retourner à la carte
        setShowCancelModal(false);
        setCurrentScreen('map');
      } else {
        throw new Error(data.error || 'Erreur inconnue');
      }
    } catch (error) {
      console.error('❌ Erreur lors de l\'annulation:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      
      // ✅ FIX: Si la course est déjà terminée/annulée → naviguer vers la carte quand même
      const alreadyDone = errorMessage.includes('terminée') || 
                          errorMessage.includes('annulée') || 
                          errorMessage.includes('400') ||
                          errorMessage.includes('already') ||
                          errorMessage.includes('not found');
      
      if (alreadyDone) {
        toast.info('Course déjà terminée', {
          description: 'Retour à la carte...',
          duration: 3000
        });
        setShowCancelModal(false);
        setCurrentScreen('map');
      } else {
        toast.error('Erreur d\'annulation', {
          description: `Impossible d'annuler la course: ${errorMessage}`,
          duration: 6000
        });
      }
    } finally {
      setCancellingRide(false);
    }
  };

  const handleCompleteRide = () => {
    console.log('✅ Course terminée, sélectionner mode de paiement');
    
    // La course conserve son driverId réel assigné
    if (currentRide?.id) {
      updateRide(currentRide.id, {
        paymentMethod: selectedPaymentMethod,
        status: 'completed'
      });
    }
    
    // Naviguer vers l'écran de paiement
    setCurrentScreen('payment');
  };

  // 🆕 Accepter l'alternative proposée
  const handleAcceptAlternative = async (newPrice: number) => {
    if (!currentRide?.id || !alternativeCategory) {
      console.error('❌ Données manquantes pour accepter alternative');
      return;
    }

    try {
      console.log('✅ Acceptation alternative:', alternativeCategory, 'Prix:', newPrice);
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/rides/accept-alternative`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            rideId: currentRide.id,
            alternativeCategory,
            newEstimatedPrice: newPrice
          })
        }
      );

      if (!response.ok) {
        throw new Error('Erreur lors de l\'acceptation de l\'alternative');
      }

      const data = await response.json();
      
      if (data.success) {
        console.log('✅ Alternative acceptée, nouvelle recherche en cours');
        
        // Mettre à jour le prix localement
        if (currentRide.id) {
          updateRide(currentRide.id, {
            estimatedPrice: newPrice,
            vehicleType: alternativeCategory
          });
        }
        
        // Fermer le dialogue et reprendre la recherche
        setShowAlternativeDialog(false);
        setSearchingDriver(true);
        setError(null);
      } else {
        throw new Error(data.error || 'Erreur inconnue');
      }
    } catch (error) {
      console.error('❌ Erreur acceptation alternative:', error);
      setError('Erreur lors de l\'acceptation de l\'alternative');
    }
  };

  // 🆕 Refuser l'alternative
  const handleDeclineAlternative = () => {
    console.log('❌ Refus de l\'alternative');
    setShowAlternativeDialog(false);
    setError('Aucun conducteur disponible dans la catégorie demandée. Veuillez réessayer plus tard.');
    setSearchingDriver(false);
  };

  // 🆕 Handlers pour le système auto-retry
  const handleRetrySearch = async () => {
    if (!currentRide?.id) return;
    
    try {
      console.log('🔄 Retry search (normal radius)');
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/retry-ride-search`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            rideId: currentRide.id,
            expandRadius: false
          })
        }
      );
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('🔄 Nouvelle recherche lancée !');
        // Réactiver la recherche
        setSearchingDriver(true);
        setError(null);
      } else {
        toast.error(data.error || 'Erreur lors de la relance');
      }
    } catch (error) {
      console.error('❌ Erreur retry search:', error);
      toast.error('Erreur lors de la relance');
    }
  };

  const handleExpandedSearch = async () => {
    if (!currentRide?.id) return;
    
    try {
      console.log('📡 Expanded search (+10 km radius)');
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/retry-ride-search`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            rideId: currentRide.id,
            expandRadius: true // 🆕 Élargir le rayon
          })
        }
      );
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('📡 Recherche élargie lancée ! (+10 km)');
        // Réactiver la recherche
        setSearchingDriver(true);
        setError(null);
      } else {
        toast.error(data.error || 'Erreur lors de l\'élargissement');
      }
    } catch (error) {
      console.error('❌ Erreur expanded search:', error);
      toast.error('Erreur lors de l\'élargissement');
    }
  };

  const handleCancelRideFromRetryModal = async () => {
    // Réutiliser la logique existante
    handleCancelRide();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 flex flex-col">
      {/* 🆕 Dialogue d'alternative */}
      {alternativeCategory && (
        <AlternativeVehicleDialog
          isOpen={showAlternativeDialog}
          originalCategory={(currentRide?.vehicleType as VehicleCategory) || 'smart_standard'}
          alternativeCategory={alternativeCategory}
          availableDriversCount={alternativeDriversCount}
          estimatedDuration={currentRide?.estimatedDuration || 15}
          onAccept={handleAcceptAlternative}
          onDecline={handleDeclineAlternative}
        />
      )}

      {/* ✅ FIX #2: Modal d'annulation */}
      <CancelRideReasonModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleConfirmCancellation}
        hasPenalty={driverFound} // Pénalité si un conducteur a déjà accepté
        penaltyAmount={driverFound ? (currentRide?.estimatedPrice || 0) * 0.5 : 0}
      />

      {/* 🆕 MODAL 1 : Recherche en cours (auto-retry) */}
      {currentRide?.status === 'searching' && !showCancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-6 max-w-sm w-full"
          >
            <div className="flex items-center justify-center mb-4">
              <div className="relative">
                <motion.div
                  className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
                <RefreshCw className="w-6 h-6 text-blue-500 absolute inset-0 m-auto" />
              </div>
            </div>
            
            <h3 className="text-lg font-semibold text-center mb-2">
              Recherche en cours...
            </h3>
            
            <p className="text-sm text-gray-600 text-center">
              {currentRide.searchMessage || 'Recherche de conducteurs disponibles...'}
            </p>
            
            {currentRide.searchCycle && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-blue-700 text-center">
                  Tentative {currentRide.searchCycle}/2
                </p>
              </div>
            )}

            {/* ✅ FIX : Boutons dans le modal */}
            <div className="mt-6 space-y-2">
              <Button
                onClick={handleCancelRide}
                variant="ghost"
                className="w-full h-11 text-red-600 hover:bg-red-50 flex items-center justify-center gap-2"
                disabled={cancellingRide}
              >
                <X className="w-4 h-4" />
                {cancellingRide ? 'Annulation...' : 'Annuler la course'}
              </Button>
              {/* ✅ FIX: Bouton de secours toujours accessible */}
              <Button
                onClick={() => setCurrentScreen('map')}
                variant="outline"
                className="w-full h-10 text-gray-500 border-gray-200 text-sm flex items-center justify-center gap-2"
              >
                ← Retour à la carte
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* 🆕 MODAL 2 : Aucun conducteur disponible (décision passager) */}
      {currentRide?.status === 'awaiting_retry_decision' && !showCancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-6 max-w-sm w-full"
          >
            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-yellow-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">
                Aucun conducteur disponible
              </h3>
              <p className="text-sm text-gray-600">
                {currentRide.driversContacted || 0} conducteurs contactés
                <br />
                {currentRide.cyclesCompleted || 0} tentatives effectuées
              </p>
            </div>
            
            {/* Options */}
            <div className="space-y-3">
              {/* Option 1 : Réessayer */}
              <Button
                onClick={handleRetrySearch}
                className="w-full h-12 bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Réessayer
              </Button>
              
              {/* Option 2 : Recherche élargie */}
              <Button
                onClick={handleExpandedSearch}
                variant="outline"
                className="w-full h-12 border-2 border-blue-500 text-blue-600 hover:bg-blue-50 flex items-center justify-center gap-2"
              >
                <Radio className="w-4 h-4" />
                Recherche élargie (+10 km)
              </Button>
              
              {/* Option 3 : Annuler */}
              <Button
                onClick={handleCancelRideFromRetryModal}
                variant="ghost"
                className="w-full h-12 text-red-600 hover:bg-red-50 flex items-center justify-center gap-2"
              >
                <X className="w-4 h-4" />
                Annuler la course
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-border">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancelRide}
              className="p-2 hover:bg-muted"
            >
              <ArrowLeft className="w-5 h-5 text-primary" />
            </Button>
            <div>
              <h1 className="text-primary">
                {searchingDriver && 'Recherche de chauffeur...'}
                {driverFound && driverArriving && 'Chauffeur en route'}
                {rideInProgress && 'Course en cours'}
              </h1>
              <p className="text-sm text-muted-foreground">
                {currentRide?.vehicleType || 'Smart Flex'}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancelRide}
            className="text-destructive hover:bg-destructive/10"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="flex-1 flex flex-col p-4 space-y-4">
        {/* Carte avec animation de recherche */}
        <AnimatePresence mode="wait">
          {/* Erreur - Aucun conducteur disponible */}
          {error && !searchingDriver && (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex-1 flex flex-col items-center justify-center space-y-6 p-6"
            >
              <div className="w-32 h-32 bg-red-100 rounded-full flex items-center justify-center">
                <X className="w-16 h-16 text-red-500" />
              </div>

              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-red-600">Aucun conducteur disponible</h2>
                <p className="text-muted-foreground max-w-md">
                  {error}
                </p>
              </div>

              <Button
                onClick={() => setCurrentScreen('map')}
                className="bg-gradient-to-r from-secondary to-primary text-white px-8"
              >
                Retour à la carte
              </Button>
            </motion.div>
          )}

          {searchingDriver && (
            <motion.div
              key="searching"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex-1 flex flex-col items-center justify-center space-y-6"
            >
              {/* Animation de recherche */}
              <div className="relative">
                <motion.div
                  className="w-32 h-32 bg-gradient-to-br from-secondary to-primary rounded-full flex items-center justify-center"
                  animate={{ 
                    scale: [1, 1.1, 1],
                    rotate: [0, 360]
                  }}
                  transition={{ 
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  <Car className="w-16 h-16 text-white" />
                </motion.div>
                {/* Cercles d'ondes */}
                <motion.div
                  className="absolute inset-0 rounded-full border-4 border-secondary"
                  animate={{ 
                    scale: [1, 1.5, 2],
                    opacity: [0.6, 0.3, 0]
                  }}
                  transition={{ 
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeOut"
                  }}
                />
                <motion.div
                  className="absolute inset-0 rounded-full border-4 border-primary"
                  animate={{ 
                    scale: [1, 1.5, 2],
                    opacity: [0.6, 0.3, 0]
                  }}
                  transition={{ 
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeOut",
                    delay: 0.5
                  }}
                />
              </div>

              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-primary">Recherche en cours...</h2>
                <p className="text-muted-foreground">
                  Nous cherchons un chauffeur proche de vous
                </p>
              </div>

              {/* Infos de la course */}
              <div className="w-full max-w-md bg-white rounded-2xl p-5 shadow-lg border border-border space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="w-3 h-3 bg-secondary rounded-full mt-2" />
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Départ</p>
                    <p className="text-foreground">{currentRide?.pickup?.address || 'Gombe, Kinshasa'}</p>
                  </div>
                </div>
                
                <div className="h-6 border-l-2 border-dashed border-border ml-1.5" />
                
                <div className="flex items-start space-x-3">
                  <div className="w-3 h-3 bg-accent rounded-full mt-2" />
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Destination</p>
                    <p className="text-foreground">{currentRide?.destination?.address || 'Kalamu, Kinshasa'}</p>
                  </div>
                </div>

                <div className="pt-3 border-t border-border flex items-center justify-between">
                  <span className="text-muted-foreground">Prix estimé</span>
                  <span className="text-xl font-bold text-primary">
                    {(currentRide?.estimatedPrice || 17500).toLocaleString()} CDF
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Chauffeur trouvé */}
          {driverFound && !rideInProgress && (
            <motion.div
              key="driver-found"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              className="flex-1 flex flex-col space-y-4"
            >
              {/* Carte du chauffeur */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div className="w-16 h-16 bg-gradient-to-br from-secondary to-primary rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {driverData?.photo_url ? (
                        <img 
                          src={driverData.photo_url} 
                          alt={driverData.full_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-8 h-8 text-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-bold text-foreground truncate">{driverData?.full_name}</h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <div className="flex items-center space-x-1 flex-shrink-0">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span className="font-semibold">{driverData?.rating}</span>
                        </div>
                        <span className="text-sm text-muted-foreground truncate">
                          ({driverData?.total_rides} courses)
                        </span>
                      </div>
                    </div>
                  </div>
                  {driverArriving && (
                    <div className="text-right flex-shrink-0 ml-2">
                      <p className="text-sm text-muted-foreground">Arrive dans</p>
                      <p className="text-3xl font-bold text-secondary">{arrivalTime}</p>
                      <p className="text-xs text-muted-foreground">minute{arrivalTime > 1 ? 's' : ''}</p>
                    </div>
                  )}
                </div>

                {/* Infos véhicule */}
                <div className="bg-white rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground flex-shrink-0">Véhicule</span>
                    <span className="font-medium truncate ml-2">
                      {getVehicleDisplayName(driverData?.vehicle)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground flex-shrink-0">Couleur</span>
                    <span className="font-medium truncate ml-2">{driverData?.vehicle?.color}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground flex-shrink-0">Plaque</span>
                    <span className="font-medium font-mono truncate ml-2">{driverData?.vehicle?.license_plate}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => window.open(`tel:${driverData?.phone}`)}
                  >
                    <Phone className="w-4 h-4 mr-2" />
                    Appeler
                  </Button>
                  {/* ✅ FIX #5: WhatsApp comme contact par défaut */}
                  <Button
                    variant="outline"
                    className="w-full bg-green-50 hover:bg-green-100 border-green-200"
                    onClick={() => {
                      const phone = driverData?.phone?.replace(/[^0-9]/g, '') || '';
                      const message = encodeURIComponent(`Bonjour, je suis votre passager pour la course vers ${currentRide?.destination?.address || 'ma destination'}`);
                      window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
                    }}
                  >
                    <MessageCircle className="w-4 h-4 mr-2 text-green-600" />
                    WhatsApp
                  </Button>
                </div>
                
                {/* ✅ FIX #4: Bouton pour voir le profil complet */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 mt-3"
                  onClick={() => setShowDriverProfile(!showDriverProfile)}
                >
                  <Award className="w-4 h-4 mr-2" />
                  {showDriverProfile ? 'Masquer le profil' : 'Voir le profil du chauffeur'}
                </Button>
              </div>

              {/* ✅ FIX #4: Modal profil chauffeur détaillé */}
              <AnimatePresence>
                {showDriverProfile && driverData && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-white rounded-2xl p-6 shadow-lg border border-border overflow-hidden"
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b pb-3">
                        <h3 className="text-lg font-bold text-foreground flex items-center space-x-2">
                          <Award className="w-5 h-5 text-yellow-500" />
                          <span>Profil du chauffeur</span>
                        </h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowDriverProfile(false)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-blue-50 rounded-lg p-3 text-center">
                          <p className="text-xs text-muted-foreground mb-1">Note moyenne</p>
                          <div className="flex items-center justify-center space-x-1">
                            <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                            <span className="text-xl font-bold text-foreground">{driverData.rating}</span>
                          </div>
                        </div>
                        
                        <div className="bg-green-50 rounded-lg p-3 text-center">
                          <p className="text-xs text-muted-foreground mb-1">Courses totales</p>
                          <p className="text-xl font-bold text-foreground">{driverData.total_rides}</p>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between py-2 border-b">
                          <span className="text-sm text-muted-foreground">Nom complet</span>
                          <span className="font-medium">{driverData.full_name}</span>
                        </div>
                        <div className="flex items-center justify-between py-2 border-b">
                          <span className="text-sm text-muted-foreground">Téléphone</span>
                          <span className="font-medium">{driverData.phone}</span>
                        </div>
                        {driverData.vehicle && (
                          <>
                            <div className="flex items-center justify-between py-2 border-b">
                              <span className="text-sm text-muted-foreground">Véhicule</span>
                              <span className="font-medium">{driverData.vehicle.make} {driverData.vehicle.model} ({driverData.vehicle.year})</span>
                            </div>
                            <div className="flex items-center justify-between py-2 border-b">
                              <span className="text-sm text-muted-foreground">Couleur</span>
                              <span className="font-medium">{driverData.vehicle.color}</span>
                            </div>
                            <div className="flex items-center justify-between py-2">
                              <span className="text-sm text-muted-foreground">Plaque</span>
                              <span className="font-mono font-bold text-primary">{driverData.vehicle.license_plate}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ✅ FIX #3: Carte de l'itinéraire du chauffeur */}
              {driverArriving && (
                <div className="bg-white rounded-2xl p-5 shadow-lg border border-border space-y-3">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold flex items-center space-x-2">
                      <TrendingUp className="w-5 h-5 text-secondary" />
                      <span>Itinéraire du chauffeur</span>
                    </h3>
                    <div className="flex items-center space-x-1 text-sm text-secondary">
                      <Navigation className="w-4 h-4" />
                      <span className="font-semibold">En route</span>
                    </div>
                  </div>
                  
                  {/* Carte simplifiée */}
                  <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-6 border border-blue-200">
                    <div className="relative h-40 flex items-center justify-center">
                      {/* Animation voiture en déplacement */}
                      <motion.div
                        animate={{ 
                          x: [-50, 0, 50, 0, -50],
                          y: [-30, 0, 30, 0, -30]
                        }}
                        transition={{
                          duration: 4,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                        className="absolute"
                      >
                        <Car className="w-8 h-8 text-secondary" />
                      </motion.div>
                      
                      {/* Points de départ et destination */}
                      <div className="absolute top-2 left-2 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                      <div className="absolute bottom-2 right-2 w-3 h-3 bg-red-500 rounded-full" />
                      
                      {/* Ligne d'itinéraire */}
                      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 100">
                        <path
                          d="M 10 10 Q 50 50 100 50 T 190 90"
                          stroke="#3b82f6"
                          strokeWidth="2"
                          strokeDasharray="5,5"
                          fill="none"
                          opacity="0.5"
                        />
                      </svg>
                    </div>
                    
                    <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                      <div>
                        <p className="text-xs text-muted-foreground">Distance</p>
                        <p className="text-sm font-bold text-foreground">
                          {driverLocation ? '~2.5 km' : '~3 km'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Temps estimé</p>
                        <p className="text-sm font-bold text-secondary">{arrivalTime} min</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Statut</p>
                        <p className="text-sm font-bold text-green-600">En approche</p>
                      </div>
                    </div>
                    
                    {driverLocation && (
                      <div className="mt-3 p-2 bg-blue-100 rounded text-xs text-blue-800 text-center">
                        📍 Position GPS actualisée il y a quelques secondes
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 🚫 SUPPRIMÉ : Panneau code de confirmation (simplification UX) */}
              {/* Le conducteur démarre directement la course sans demander de code */}

              {/* Infos de la course */}
              <div className="bg-white rounded-2xl p-5 shadow-lg border border-border space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="w-3 h-3 bg-secondary rounded-full mt-2" />
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Départ</p>
                    <p className="text-foreground">{currentRide?.pickup?.address || 'Gombe, Kinshasa'}</p>
                  </div>
                </div>
                
                <div className="h-6 border-l-2 border-dashed border-border ml-1.5" />
                
                <div className="flex items-start space-x-3">
                  <div className="w-3 h-3 bg-accent rounded-full mt-2" />
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Destination</p>
                    <p className="text-foreground">{currentRide?.destination?.address || 'Kalamu, Kinshasa'}</p>
                  </div>
                </div>

                <div className="pt-3 border-t border-border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-muted-foreground">Prix estimé</span>
                    <span className="text-xl font-bold text-primary">
                      {(currentRide?.estimatedPrice || 17500).toLocaleString()} CDF
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Durée estimée</span>
                    <span className="font-medium">
                      {currentRide?.estimatedDuration || 15} min
                    </span>
                  </div>
                </div>
              </div>

              {/* Bouton annuler */}
              <Button
                variant="outline"
                className="w-full text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={handleCancelRide}
              >
                Annuler la course
              </Button>
            </motion.div>
          )}

          {/* Course en cours */}
          {rideInProgress && (
            <motion.div
              key="ride-in-progress"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex-1 flex flex-col space-y-4"
            >
              {/* Statut */}
              <div className="bg-gradient-to-r from-secondary to-primary rounded-2xl p-6 text-white text-center">
                <div className="flex justify-center mb-3">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  >
                    <Navigation className="w-12 h-12" />
                  </motion.div>
                </div>
                <h2 className="text-2xl font-bold mb-2">Course en cours</h2>
                <p className="text-white/90">Votre chauffeur vous conduit à destination</p>
              </div>

              {/* Carte du chauffeur mini */}
              <div className="bg-white rounded-2xl p-4 shadow-lg border border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-secondary to-primary rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="font-bold">{driverData?.full_name}</p>
                      <p className="text-sm text-muted-foreground">{driverData?.vehicle?.make} {driverData?.vehicle?.model}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => window.open(`tel:${driverData?.phone}`)}
                    >
                      <Phone className="w-5 h-5 text-secondary" />
                    </Button>
                    {/* ✅ FIX #5: WhatsApp */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const phone = driverData?.phone?.replace(/[^0-9]/g, '') || '';
                        const message = encodeURIComponent('Bonjour, concernant notre course en cours...');
                        window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
                      }}
                    >
                      <MessageCircle className="w-5 h-5 text-green-600" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Infos trajet */}
              <div className="bg-white rounded-2xl p-5 shadow-lg border border-border space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="w-3 h-3 bg-secondary rounded-full mt-2" />
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Départ</p>
                    <p className="text-foreground">{currentRide?.pickup?.address || 'Gombe, Kinshasa'}</p>
                  </div>
                </div>
                
                <div className="h-6 border-l-2 border-dashed border-border ml-1.5" />
                
                <div className="flex items-start space-x-3">
                  <div className="w-3 h-3 bg-accent rounded-full mt-2" />
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Destination</p>
                    <p className="text-foreground">{currentRide?.destination?.address || 'Kalamu, Kinshasa'}</p>
                  </div>
                </div>

                <div className="pt-3 border-t border-border">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Prix de la course</span>
                    <span className="text-2xl font-bold text-primary">
                      {(currentRide?.estimatedPrice || 17500).toLocaleString()} CDF
                    </span>
                  </div>
                </div>
              </div>

              {/* Sélecteur de mode de paiement */}
              <div className="bg-white rounded-2xl p-5 shadow-lg border border-border">
                <h3 className="font-semibold mb-4 text-foreground">Mode de paiement</h3>
                <div className="space-y-3">
                  {/* Mobile Money */}
                  <button
                    onClick={() => setSelectedPaymentMethod('mobile_money')}
                    className={`w-full p-4 rounded-xl border-2 transition-all duration-300 flex items-center space-x-4 ${
                      selectedPaymentMethod === 'mobile_money'
                        ? 'border-green-500 bg-green-50'
                        : 'border-border hover:border-green-200 hover:bg-green-50/50'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      selectedPaymentMethod === 'mobile_money' ? 'bg-green-500' : 'bg-green-100'
                    }`}>
                      <Smartphone className={`w-6 h-6 ${
                        selectedPaymentMethod === 'mobile_money' ? 'text-white' : 'text-green-600'
                      }`} />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-semibold text-foreground">Mobile Money</p>
                      <p className="text-sm text-muted-foreground">Airtel, M-Pesa, Orange</p>
                    </div>
                    {selectedPaymentMethod === 'mobile_money' && (
                      <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>

                  {/* Carte bancaire */}
                  <button
                    onClick={() => setSelectedPaymentMethod('card')}
                    className={`w-full p-4 rounded-xl border-2 transition-all duration-300 flex items-center space-x-4 ${
                      selectedPaymentMethod === 'card'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-border hover:border-blue-200 hover:bg-blue-50/50'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      selectedPaymentMethod === 'card' ? 'bg-blue-500' : 'bg-blue-100'
                    }`}>
                      <CreditCard className={`w-6 h-6 ${
                        selectedPaymentMethod === 'card' ? 'text-white' : 'text-blue-600'
                      }`} />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-semibold text-foreground">Carte bancaire</p>
                      <p className="text-sm text-muted-foreground">Visa, Mastercard</p>
                    </div>
                    {selectedPaymentMethod === 'card' && (
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>

                  {/* Espèces */}
                  <button
                    onClick={() => setSelectedPaymentMethod('cash')}
                    className={`w-full p-4 rounded-xl border-2 transition-all duration-300 flex items-center space-x-4 ${
                      selectedPaymentMethod === 'cash'
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-border hover:border-orange-200 hover:bg-orange-50/50'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      selectedPaymentMethod === 'cash' ? 'bg-orange-500' : 'bg-orange-100'
                    }`}>
                      <Banknote className={`w-6 h-6 ${
                        selectedPaymentMethod === 'cash' ? 'text-white' : 'text-orange-600'
                      }`} />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-semibold text-foreground">Espèces</p>
                      <p className="text-sm text-muted-foreground">Paiement en liquide</p>
                    </div>
                    {selectedPaymentMethod === 'cash' && (
                      <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>

                  {/* Porte-monnaie */}
                  <button
                    onClick={() => setSelectedPaymentMethod('wallet')}
                    className={`w-full p-4 rounded-xl border-2 transition-all duration-300 flex items-center space-x-4 ${
                      selectedPaymentMethod === 'wallet'
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-border hover:border-purple-200 hover:bg-purple-50/50'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      selectedPaymentMethod === 'wallet' ? 'bg-purple-500' : 'bg-purple-100'
                    }`}>
                      <Wallet className={`w-6 h-6 ${
                        selectedPaymentMethod === 'wallet' ? 'text-white' : 'text-purple-600'
                      }`} />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-semibold text-foreground">Porte-monnaie</p>
                      <p className="text-sm text-muted-foreground">Paiement numérique</p>
                    </div>
                    {selectedPaymentMethod === 'wallet' && (
                      <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Export par défaut pour compatibilité Rollup/Vite

export default RideScreen;


