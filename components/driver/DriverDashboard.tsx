import { useState, useEffect, useMemo } from 'react';
import { motion } from '../../lib/motion'; // ✅ FIX: Utiliser l'implémentation locale
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { useAppState } from '../../hooks/useAppState';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { stopAllNotifications } from '../../lib/notification-sound'; // ✅ Import pour arrêter la sonnerie
// import { SoundNotification } from '../SoundNotification'; // DÉSACTIVÉ: Remplacé par RideNotification
import { RideTimer } from '../RideTimer';
import { EmergencyAlert } from '../EmergencyAlert';
import { CommissionSettings } from '../CommissionSettings';
import { DriverBalanceManager } from './DriverBalanceManager';
import { supabase } from '../../lib/supabase';
import { VEHICLE_PRICING, isDayTime, VehicleCategory } from '../../lib/pricing';
import { useDriverLocation, isNearPickupLocation, calculateDistance } from '../../lib/gps-utils';
import { reverseGeocodeWithCache } from '../../lib/geocoding';
import { getVehicleDisplayName } from '../../lib/vehicle-helpers';
import { toast } from '../../lib/toast';

// Icônes SVG inline
const Power = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
);
const Euro = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
);
const Clock = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
);
const Star = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="currentColor" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
);
const Navigation = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
);
const User = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
);
const Settings = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
);
const TrendingUp = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
);
const Car = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" /></svg>
);
const Key = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
);
const Percent = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 8h6m-5 0a3 3 0 110 6H9l3 3m-3-6h6m6 1a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
);
const CreditCard = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
);
const Lock = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
);
const CheckCircle = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
);
const AlertCircle = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
);
const MapPin = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
);
const Phone = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
);
const MessageSquare = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
);
const PlayCircle = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
);
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { 
  notifyRideConfirmed,
  notifyDriverEnroute,
  notifyDriverArrived,
  notifyRideStarted,
  notifyRideCompleted,
  notifyPaymentReceived,
  notifyRideCancelled
} from '../../lib/sms-service';
import { RideNotificationSound } from './RideNotificationSound';

// ✅ v517.77 - Helper pour formater les montants CDF de manière sécurisée
const formatCDF = (amount: number | null | undefined): string => {
  const safeAmount = Number(amount) || 0;
  return `${safeAmount.toLocaleString('fr-FR')} CDF`;
};

// ✅ Fonction helper pour mettre à jour le solde dans le backend
async function updateBalanceInBackend(
  driverId: string,
  operation: 'add' | 'subtract',
  amount: number
): Promise<number | null> {
  // ✅ v517.86: Validation du montant AVANT l'envoi au backend
  if (!amount || isNaN(amount) || amount < 0) {
    console.error('❌ v517.86 - Montant invalide pour update balance:', amount);
    toast.error('Erreur: Montant invalide. Impossible de mettre à jour le solde.');
    return null;
  }
  
  try {
    console.log(`💰 v517.86 - Envoi au backend: ${operation} ${amount.toLocaleString()} CDF`);
    
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/drivers/${driverId}/balance`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation,
          amount,
        }),
      }
    );

    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        const newBalance = data.balance;
        
        // ✅ v517.79 IMPORTANT: Sauvegarder aussi dans localStorage pour persistance
        localStorage.setItem(`driver_balance_${driverId}`, newBalance.toString());
        
        console.log(
          `✅ Solde mis à jour: Backend + localStorage = ${newBalance.toLocaleString()} CDF`
        );
        return newBalance;
      }
    }
    return null;
  } catch (error) {
    console.error('❌ Erreur mise à jour solde backend:', error);
    return null;
  }
}

export function DriverDashboard() {
  const { state, setCurrentScreen, updateDriver, setCurrentDriver, setCurrentView, setCurrentRide, updateRide, clearCurrentRide } = useAppState();
  const driver = state.currentDriver; // Récupérer le conducteur actuel
  
  // ✅ FIX: Construire l'objet vehicleInfo depuis les champs individuels du driver
  const vehicleInfo = useMemo(() => {
    if (!driver) return null;
    
    // Si l'objet vehicle existe ET n'est pas vide, l'utiliser
    if (driver.vehicle && (driver.vehicle.make || driver.vehicle.category || driver.vehicle.license_plate)) {
      return {
        make: driver.vehicle.make || driver.vehicle_make || '',
        model: driver.vehicle.model || driver.vehicle_model || '',
        color: driver.vehicle.color || driver.vehicle_color || '',
        plate: driver.vehicle.license_plate || driver.vehicle_plate || driver.license_plate || '',
        type: driver.vehicle.category || driver.vehicle_category || driver.vehicle_type || 'standard',
        year: driver.vehicle.year || driver.vehicle_year || new Date().getFullYear(),
        seats: driver.vehicle.seats || 4
      };
    }
    
    // Sinon, construire depuis les champs individuels
    if (driver.vehicle_category || driver.vehicle_make || driver.vehicle_plate) {
      return {
        make: driver.vehicle_make || '',
        model: driver.vehicle_model || '',
        color: driver.vehicle_color || '',
        plate: driver.vehicle_plate || driver.license_plate || '',
        type: driver.vehicle_category || driver.vehicle_type || 'standard',
        year: driver.vehicle_year || new Date().getFullYear(),
        seats: 4
      };
    }
    
    return null;
  }, [driver]);
  
  // ✅ DEBUG: Logger les infos du véhicule
  useEffect(() => {
    if (driver) {
      console.log('🚗 Informations véhicule du conducteur:');
      console.log('   - vehicle (objet):', driver.vehicle);
      console.log('   - vehicle_category:', driver.vehicle_category);
      console.log('   - vehicle_make:', driver.vehicle_make);
      console.log('   - vehicle_model:', driver.vehicle_model);
      console.log('   - vehicle_plate:', driver.vehicle_plate);
      console.log('   - vehicleInfo construit:', vehicleInfo);
    }
  }, [driver, vehicleInfo]);
  
  // ✅ FIX: Rafraîchir le profil du conducteur pour récupérer les infos véhicule normalisées
  useEffect(() => {
    const refreshDriverProfile = async () => {
      if (!driver?.id) return;
      
      try {
        console.log('🔄 Rafraîchissement du profil conducteur depuis le backend...');
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/drivers/${driver.id}`,
          {
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`
            }
          }
        );
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.driver) {
            const driverData = data.driver;
            
            // Mettre à jour le driver avec les infos complètes normalisées du backend
            const updatedDriver = {
              ...driver,
              vehicle_make: driverData.vehicle_make || '',
              vehicle_model: driverData.vehicle_model || '',
              vehicle_plate: driverData.vehicle_plate || '',
              vehicle_category: driverData.vehicle_category || 'smart_standard',
              vehicle_color: driverData.vehicle_color || '',
              vehicle_year: driverData.vehicle_year || new Date().getFullYear(),
              vehicle: driverData.vehicle || {},
              profile_photo: driverData.profile_photo || driverData.photo_url || driver.profile_photo || driver.photo_url || '',
              photo_url: driverData.photo_url || driverData.profile_photo || driver.photo_url || driver.profile_photo || ''
            };
            
            updateDriver(updatedDriver);
            console.log('✅ Profil conducteur rafraîchi avec infos véhicule normalisées:', {
              vehicle_make: updatedDriver.vehicle_make,
              vehicle_model: updatedDriver.vehicle_model,
              vehicle_plate: updatedDriver.vehicle_plate,
              vehicle_category: updatedDriver.vehicle_category
            });
          }
        }
      } catch (error) {
        console.error('❌ Erreur rafraîchissement profil:', error);
      }
    };
    
    // Déclencher immédiatement si driver.id change
    refreshDriverProfile();
  }, [driver?.id]); // Se déclenche quand l'ID change (notamment au montage)
  
  // ✅ v517.81: Utiliser le taux de change du panel admin (par défaut 2850)
  const exchangeRate = state.systemSettings?.exchangeRate || 2850;
  console.log(`💱 Taux de change actuel: 1 USD = ${exchangeRate} CDF`);
  
  // ✅ v518.52 - PERSISTANCE DU STATUT EN LIGNE
  // Restaurer le statut depuis localStorage au d��marrage
  const [isOnline, setIsOnline] = useState(() => {
    if (driver?.id) {
      const savedStatus = localStorage.getItem(`driver_online_${driver.id}`);
      if (savedStatus !== null) {
        const isOnlineSaved = savedStatus === 'true';
        console.log(`🔄 Statut "en ligne" restauré depuis localStorage: ${isOnlineSaved ? 'EN LIGNE' : 'HORS LIGNE'}`);
        return isOnlineSaved;
      }
    }
    return driver?.isOnline || false;
  });
  const [rideRequest, setRideRequest] = useState<any>(null);
  const [showRideRequest, setShowRideRequest] = useState(false);
  // ✅ PLUS DE STATE LOCAL currentRide - On utilise state.currentRide du global
  // 🚫 SUPPRIMÉ : const [confirmationCode, setConfirmationCode] = useState<string>('');
  // 🚫 SUPPRIMÉ : const [enteredCode, setEnteredCode] = useState<string>('');
  const [rideStartTime, setRideStartTime] = useState<Date | null>(null);
  const [freeWaitingEnabled, setFreeWaitingEnabled] = useState(true);
  const [showCommissionSettings, setShowCommissionSettings] = useState(false);
  const [postpaidEnabled, setPostpaidEnabled] = useState(false);
  const [postpaidPaid, setPostpaidPaid] = useState(false); // État du paiement pour activer post-payé
  const [showPaymentModal, setShowPaymentModal] = useState(false); // Modal de paiement
  
  const [paymentPhone, setPaymentPhone] = useState('');
  const [paymentOperator, setPaymentOperator] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState(''); // Nouveau : montant de recharge
  
  // Force re-render du solde
  const [balanceRenderKey, setBalanceRenderKey] = useState(0);
  
  // 🆕 State séparé pour forcer l'affichage
  const [displayBalance, setDisplayBalance] = useState(0);
  
  // 🆕 v517.90 - États pour stocker les gains d'aujourd'hui en CDF (pas en USD)
  const [todayEarningsCDF, setTodayEarningsCDF] = useState(0); // Total brut
  const [todayNetEarningsCDF, setTodayNetEarningsCDF] = useState(0); // Net après commission
  const [todayRidesCount, setTodayRidesCount] = useState(0);
  
  // 🆕 v517.91 - États pour les stats globales du driver (note + total courses)
  const [driverRating, setDriverRating] = useState(0);
  const [totalRides, setTotalRides] = useState(0);
  
  // NOUVEAU: États pour la gestion de la proximité GPS et du temps d'attente
  const [isNearPickup, setIsNearPickup] = useState(false);
  const [canStartWaiting, setCanStartWaiting] = useState(false);
  const [waitingTimeStarted, setWaitingTimeStarted] = useState(false);
  const [waitingStartTime, setWaitingStartTime] = useState<Date | null>(null);
  
  // 🗺️ NOUVEAU: Nom du lieu géocodé (ex: "Matete", "Gombe")
  const [locationName, setLocationName] = useState<string>('Détection...');
  
  // ✅ CRITIQUE: GPS activé dès que le conducteur est connecté (pas seulement en course)
  // Sans GPS, le conducteur ne peut pas passer en ligne
  const { location: driverLocation, error: gpsError, permissionDenied, accuracy } = useDriverLocation(true);
  
  // ✅ SOLDE SYNCHRONISÉ AVEC LE BACKEND (source de vérité unique)
  const [accountBalance, setAccountBalance] = useState(0);
  
  // 💾 Charger le solde depuis le backend au démarrage
  useEffect(() => {
    const loadBalanceFromBackend = async () => {
      if (!driver?.id) return;
      
      try {
        console.log('💰 Chargement du solde depuis le backend...');
        
        // ✅ Créer un timeout manuel (AbortSignal.timeout() n'est pas supporté partout)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 secondes max
        
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/drivers/${driver.id}/balance`,
          {
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`
            },
            signal: controller.signal
          }
        ).catch(err => {
          clearTimeout(timeoutId);
          if (err.name === 'AbortError') {
            console.warn('⚠️ Timeout chargement solde (5s dépassées)');
          } else {
            console.warn('⚠️ Erreur réseau chargement solde:', err.name);
          }
          return null;
        });
        
        clearTimeout(timeoutId);
        
        if (response && response.ok) {
          const data = await response.json().catch(err => {
            console.error('❌ Erreur parsing JSON:', err);
            return null;
          });
          
          if (data && data.success) {
            const backendBalance = data.balance;
            
            // ✅ v517.79: Sauvegarder dans localStorage pour persistance
            localStorage.setItem(`driver_balance_${driver.id}`, backendBalance.toString());
            
            setAccountBalance(backendBalance);
            setBalanceRenderKey(prev => prev + 1);
            console.log(`✅ Solde chargé: Backend ${backendBalance.toLocaleString()} CDF → localStorage`);
          }
        } else {
          // Fallback: Si backend échoue, charger depuis localStorage
          const savedBalance = localStorage.getItem(`driver_balance_${driver.id}`);
          if (savedBalance) {
            // ✅ v517.88: Validation stricte après parseFloat
            const balance = parseFloat(savedBalance);
            
            if (isNaN(balance)) {
              console.error('❌ v517.88 - Solde localStorage invalide (NaN), initialisation à 0');
              console.error('   Valeur localStorage:', savedBalance);
              localStorage.setItem(`driver_balance_${driver.id}`, '0');
              setAccountBalance(0);
            } else {
              setAccountBalance(balance);
              setBalanceRenderKey(prev => prev + 1);
              console.log(`⚠️ Backend indisponible, fallback localStorage: ${balance.toLocaleString()} CDF`);
            }
          }
        }
      } catch (error: any) {
        // ✅ NE PAS logger les erreurs "Script error" qui polluent la console
        if (error?.message && error.message !== 'Script error.') {
          console.error('❌ Erreur chargement solde:', error.message);
        }
      }
    };
    
    loadBalanceFromBackend();
  }, [driver?.id]);
  
  // ✅ SUPPRIMÉ : La synchronisation automatique toutes les 5 secondes causait des conflits
  // Le solde est maintenant géré uniquement par le backend comme source de vérité
  // Les mises à jour se font explicitement via updateBalanceInBackend()

  // Auto-activer le post-payé si le solde est suffisant au chargement
  useEffect(() => {
    if (driver?.id && accountBalance > 0) {
      const minBalance = getMinimumBalance();
      if (accountBalance >= minBalance && !postpaidPaid) {
        // Activer automatiquement le post-payé si le solde est suffisant
        setPostpaidPaid(true);
        setPostpaidEnabled(true);
        console.log('✅ Post-payé activé automatiquement (solde suffisant)');
        
        // Notification au conducteur
        setTimeout(() => {
          toast.success(
            `✅ Mode Post-Payé activé automatiquement ! Votre solde: ${accountBalance.toLocaleString()} CDF`,
            { duration: 5000 }
          );
          toast.info(
            '🚗 Vous pouvez maintenant passer en ligne pour recevoir des courses',
            { duration: 4000 }
          );
        }, 500);
      }
    }
  }, [driver?.id]); // Se déclenche une seule fois au chargement

  // ✅ v518.52 - PERSISTANCE ET HEARTBEAT DU STATUT "EN LIGNE"
  // Sauvegarder le statut dans localStorage ET envoyer au backend régulièrement
  useEffect(() => {
    if (!driver?.id) return;
    
    // 1. Sauvegarder dans localStorage immédiatement
    localStorage.setItem(`driver_online_${driver.id}`, isOnline.toString());
    console.log(`💾 Statut "${isOnline ? 'EN LIGNE' : 'HORS LIGNE'}" sauvegardé dans localStorage`);
    
    // 2. Envoyer au backend pour persistance
    const updateOnlineStatus = async () => {
      try {

        // ✅ FIX CRITIQUE: Utiliser publicAnonKey au lieu de accessToken

        // ✅ Créer un timeout manuel
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 secondes max
        
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/drivers/heartbeat`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',

              'Authorization': `Bearer ${publicAnonKey}` // ✅ Utiliser publicAnonKey
            },
            body: JSON.stringify({
              driverId: driver?.id, // ✅ AJOUTER l'ID du conducteur
              isOnline: isOnline,
              location: driverLocation || null,
              lastSeen: new Date().toISOString()
            })
          }
        );
        
        if (response.ok) {
          console.log(`💓 Heartbeat envoyé: ${isOnline ? 'EN LIGNE' : 'HORS LIGNE'}`);
        }
      } catch (error) {
        console.error('❌ Erreur envoi heartbeat:', error);

              'Authorization': `Bearer ${publicAnonKey}`
            },
            body: JSON.stringify({
              driverId: driver?.id,
              isOnline: isOnline,
              location: driverLocation || null,
              lastSeen: new Date().toISOString()
            }),
            signal: controller.signal
          }
        ).catch(err => {
          clearTimeout(timeoutId);
          if (err.name === 'AbortError') {
            console.warn('⚠️ Timeout heartbeat (5s dépassées)');
          } else {
            console.warn('⚠️ Erreur réseau heartbeat:', err.name);
          }
          return null;
        });
        
        clearTimeout(timeoutId);
        
        if (response && response.ok) {
          console.log(`💓 Heartbeat envoyé: ${isOnline ? 'EN LIGNE' : 'HORS LIGNE'}`);
        }
      } catch (error: any) {
        // ✅ NE PAS logger les erreurs "Script error"
        if (error?.message && error.message !== 'Script error.') {
          console.error('❌ Erreur envoi heartbeat:', error.message);
        }

      }
    };
    
    // Envoyer immédiatement
    updateOnlineStatus();
    
    // 3. Si EN LIGNE, envoyer un heartbeat toutes les 30 secondes
    if (isOnline) {
      const heartbeatInterval = setInterval(updateOnlineStatus, 30000);
      return () => clearInterval(heartbeatInterval);
    }
  }, [isOnline, driver?.id, driverLocation]);
  
  // ✅ v518.52 - DÉTECTER LE RETOUR SUR L'APPLICATION
  // Restaurer et re-synchroniser le statut quand l'utilisateur revient
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && driver?.id) {
        console.log('👁️ Application visible à nouveau, re-synchronisation...');
        
        // Restaurer le statut depuis localStorage
        const savedStatus = localStorage.getItem(`driver_online_${driver.id}`);
        if (savedStatus !== null) {
          const wasOnline = savedStatus === 'true';
          if (wasOnline !== isOnline) {
            setIsOnline(wasOnline);
            console.log(`🔄 Statut restauré: ${wasOnline ? 'EN LIGNE' : 'HORS LIGNE'}`);
            
            if (wasOnline) {
              toast.info('🟢 Vous êtes toujours en ligne !', { duration: 3000 });
            }
          }
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [driver?.id, isOnline]);
  
  // ✅ v518.52 - NE PAS DÉSACTIVER LE STATUT LORS DE LA FERMETURE
  // Au lieu de désactiver, sauvegarder simplement l'état actuel
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (driver?.id && isOnline) {
        // Ne rien faire ! Le statut reste en ligne
        console.log('🚪 Application fermée - Statut EN LIGNE maintenu');
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [driver?.id, isOnline]);

  // Détecter la proximité GPS au point de pickup
  useEffect(() => {
    if (!state.currentRide || state.currentRide.status !== 'accepted' || !driverLocation) {
      setIsNearPickup(false);
      setCanStartWaiting(false);
      return;
    }

    // Calculer la distance au point de pickup
    const distance = calculateDistance(
      driverLocation.lat,
      driverLocation.lng,
      state.currentRide.pickup.lat,
      state.currentRide.pickup.lng
    );

    const safeDistance = distance || 0;
    console.log(`📍 Distance au pickup: ${safeDistance.toFixed(2)}m`);

    // Si à moins de 10 mètres, autoriser le démarrage du temps d'attente
    if (distance <= 10) {
      if (!isNearPickup) {
        setIsNearPickup(true);
        setCanStartWaiting(true);
        toast.success('📍 Vous êtes arrivé au point de départ !', { duration: 3000 });
        
        // Notification SMS au passager
        if (rideRequest && driver) {
          notifyDriverArrived(
            rideRequest.passengerPhone || '+243999999999',
            driver.name,
            driver.phone || '+243999999999'
          ).catch(err => console.error('❌ Erreur envoi SMS arrivée:', err));
        }
      }
    } else {
      setIsNearPickup(false);
      if (distance > 50) { // Si le conducteur s'éloigne de plus de 50m
        setCanStartWaiting(false);
      }
    }
  }, [driverLocation, state.currentRide, isNearPickup]);

  // ✅ ENVOYER LA POSITION GPS EN TEMPS RÉEL AU BACKEND
  useEffect(() => {
    // ✅ CORRECTION CRITIQUE: Envoyer la position dès qu'elle est disponible
    // PAS seulement quand en ligne, sinon le conducteur ne peut jamais passer en ligne!
    if (!driverLocation || !driver?.id) {
      console.log('⏸️ Envoi GPS en attente - Position:', !!driverLocation, 'Driver:', !!driver?.id);
      return;
    }

    console.log('📍 Envoi position GPS RÉELLE au backend:', driverLocation);

    // Fonction pour envoyer la position
    const sendLocation = async () => {
      try {
        // 🔥 FIX CRITIQUE 1: METTRE À JOUR LE STATE LOCAL EN PREMIER
        // Cela permet au passager de voir la position en temps réel IMMÉDIATEMENT
        updateDriver(driver.id, { location: driverLocation });
        console.log('✅ Position GPS mise à jour dans state local:', driverLocation);
        
        // Puis envoyer au backend pour persistance
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/drivers/update-driver-location`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${publicAnonKey}`
            },
            body: JSON.stringify({
              driverId: driver.id,
              location: driverLocation
            })
          }
        );

        if (response.ok) {
          console.log('✅ Position GPS RÉELLE envoyée au backend:', driverLocation);
        } else {
          console.error('❌ Erreur envoi position GPS:', await response.text());
        }
      } catch (error) {
        console.error('❌ Erreur réseau envoi GPS:', error);
      }
    };

    // Envoyer immédiatement
    sendLocation();

    // Puis envoyer toutes les 10 secondes (même si hors ligne, pour garder la position à jour)
    const interval = setInterval(sendLocation, 10000);

    return () => clearInterval(interval);
  }, [driverLocation, driver?.id, updateDriver]); // ✅ Retiré isOnline des dépendances!

  // 🗺️ GEOCODER LA POSITION GPS EN NOM DE LIEU
  useEffect(() => {
    if (!driverLocation) {
      setLocationName('Détection...');
      return;
    }
    
    const geocodeLocation = async () => {
      try {
        console.log('🗺️ Geocoding position:', driverLocation);
        const name = await reverseGeocodeWithCache(driverLocation.lat, driverLocation.lng);
        setLocationName(name);
        console.log('✅ Nom du lieu:', name);
      } catch (error) {
        console.error('❌ Erreur geocoding:', error);
        setLocationName('Position GPS activée');
      }
    };
    
    geocodeLocation();
    
    // Re-géocoder toutes les 30 secondes si la position change
    const interval = setInterval(geocodeLocation, 30000);
    
    return () => clearInterval(interval);
  }, [driverLocation]);

  // ✅ VÉRIFICATION TEMPS RÉEL DES DEMANDES DE COURSE depuis le backend
  useEffect(() => {
    // ✅ CORRECTION CRITIQUE : Polling simplifié - uniquement si en ligne
    if (!isOnline) {
      console.log('⏸️ Polling arrêté : conducteur hors ligne');
      return;
    }

    console.log('🔄 Démarrage du polling des demandes de courses...');

    // Vérifier les demandes toutes les 5 secondes
    const checkRideRequests = async () => {
      if (!driver?.id) return;

      try {
        // ✅ Créer un timeout manuel
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/rides/pending/${driver.id}`,
          {
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`
            },
            signal: controller.signal
          }
        ).catch(err => {
          clearTimeout(timeoutId);
          if (err.name !== 'AbortError') {
            console.warn('⚠️ Erreur réseau polling demandes:', err.name);
          }
          return null;
        });
        
        clearTimeout(timeoutId);

        if (response && response.ok) {
          const data = await response.json().catch(() => null);
          if (data && data.success && data.ride) {
            // 🔥 FIX : Vérifier si c'est une NOUVELLE demande avant d'afficher
            const newRideId = data.ride.id;
            const currentRideId = rideRequest?.id;
            
            // N'afficher que si c'est une nouvelle demande différente
            if (newRideId !== currentRideId) {
              console.log('📱 Nouvelle demande de course reçue:', data.ride);
              console.log('📍 v517.82 - Adresses reçues:', {
                pickup: data.ride.pickup,
                pickupAddress: data.ride.pickup?.address || 'MANQUANT',
                destination: data.ride.destination,
                destinationAddress: data.ride.destination?.address || 'MANQUANT'
              });
              setRideRequest(data.ride);
              setShowRideRequest(true);
            } else {
              // C'est la même demande, ne rien faire
              console.log('🔍 Même demande déjà affichée, pas de notification');
            }
          } else if (data && data.success && !data.ride) {
            console.log('🔍 Polling actif - Aucune demande en attente');
            // ❌ CORRECTION : Ne PAS fermer automatiquement si le driver a déjà une demande affichée
            // ou s'il a accepté une course (state.currentRide existe)
            // Cela évite l'annulation automatique quand le passager est déjà matché
            if (showRideRequest && !state.currentRide && !rideRequest) {
              // ✅ ARRÊTER LA SONNERIE
              stopAllNotifications();
              console.log('🔕 Sonnerie arrêtée - fermeture du panneau');
              
              setShowRideRequest(false);
              setRideRequest(null);
              console.log('✅ Fermeture du panneau de demande (pas de course active)');
            }
          }
        }
      } catch (error: any) {
        // ✅ NE PAS logger les erreurs "Script error"
        if (error?.message && error.message !== 'Script error.') {
          console.error('❌ Erreur vérification demandes:', error.message);
        }
      }
    };

    // ⚡ OPTIMISATION : Vérifier immédiatement puis toutes les 2 secondes pour une détection plus rapide
    // Au lieu de 5 secondes, cela réduit le délai de notification de 60%
    checkRideRequests();
    const interval = setInterval(checkRideRequests, 2000);
    
    return () => {
      console.log('🛑 Arrêt du polling des demandes');
      clearInterval(interval);
    };
  }, [isOnline, driver?.id, rideRequest?.id, showRideRequest, state.currentRide]);

  // 🔥 NOUVEAU: SURVEILLANCE DE L'ÉTAT DE LA COURSE AFFICHÉE
  // Détecter si le passager annule ou si un autre conducteur accepte
  useEffect(() => {
    if (!showRideRequest || !rideRequest?.id || !driver?.id) {
      return;
    }

    console.log('👁️ Surveillance de la course:', rideRequest.id);

    const checkRideStatus = async () => {
      try {
        // ✅ Créer un timeout manuel
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/rides/status/${rideRequest.id}`,
          {
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`
            },
            signal: controller.signal
          }
        ).catch(err => {
          clearTimeout(timeoutId);
          if (err.name !== 'AbortError') {
            console.warn('⚠️ Erreur réseau surveillance statut:', err.name);
          }
          return null;
        });
        
        clearTimeout(timeoutId);

        if (response && response.ok) {
          const data = await response.json().catch(() => null);
          
          if (data && data.success && data.ride) {
            const rideStatus = data.ride.status;
            const assignedDriverId = data.ride.driverId;
            
            // Cas 1: Le passager a annulé
            if (rideStatus === 'cancelled') {
              console.log('❌ Le passager a annulé sa course');
              
              // ✅ ARRÊTER LA SONNERIE
              stopAllNotifications();
              console.log('🔕 Sonnerie arrêtée - passager a annulé');
              
              setShowRideRequest(false);
              setRideRequest(null);
              toast.error('😔 Le passager a annulé sa course', {
                duration: 5000
              });
              return;
            }
            
            // Cas 2: Un autre conducteur a accepté
            if (rideStatus === 'accepted' && assignedDriverId && assignedDriverId !== driver.id) {
              console.log('⚡ Course acceptée par un autre conducteur:', assignedDriverId);
              
              // ✅ ARRÊTER LA SONNERIE
              stopAllNotifications();
              console.log('🔕 Sonnerie arrêtée - course prise par un autre conducteur');
              
              setShowRideRequest(false);
              setRideRequest(null);
              toast.info('🚗 Course déjà récupérée par un autre conducteur', {
                duration: 5000
              });
              return;
            }
          }
        }
      } catch (error: any) {
        // ✅ NE PAS logger les erreurs "Script error"
        if (error?.message && error.message !== 'Script error.') {
          console.error('❌ Erreur surveillance statut:', error.message);
        }
      }
    };

    // Vérifier toutes les 2 secondes
    const interval = setInterval(checkRideStatus, 2000);

    return () => {
      clearInterval(interval);
    };
  }, [showRideRequest, rideRequest?.id, driver?.id]);

  // 🔥 NOUVEAU: TIMEOUT AUTOMATIQUE APRÈS 10 SECONDES
  // Si le conducteur ne répond pas, la demande est offerte au suivant
  useEffect(() => {
    if (!showRideRequest || !rideRequest?.id) {
      return;
    }

    console.log('⏱️ Démarrage du timer de 10s pour la course:', rideRequest.id);

    // ⚡ OPTIMISATION : Après 10 secondes (au lieu de 15s), refuser automatiquement
    const timeoutId = setTimeout(() => {
      console.log('⏰ Timeout de 10s atteint, refus automatique');
      
      // ✅ ARRÊTER LA SONNERIE
      stopAllNotifications();
      console.log('🔕 Sonnerie arrêtée - timeout 10s');
      
      setShowRideRequest(false);
      setRideRequest(null);
      toast.info('⏱️ Temps écoulé - Course offerte à un autre conducteur', {
        duration: 4000
      });
    }, 10000); // ⚡ 10 secondes (optimisé)

    return () => {
      clearTimeout(timeoutId);
    };
  }, [showRideRequest, rideRequest?.id]);

  // 🔥 NOUVEAU: SYNCHRONISATION DE LA COURSE EN COURS
  // Polling pour mettre à jour le statut de la course en temps réel côté driver
  useEffect(() => {
    if (!state.currentRide || !driver?.id) {
      return;
    }

    // Ne synchroniser que si la course n'est pas terminée
    // ✅ FIX: Continuer à synchroniser même si cancelled (pour détecter l'annulation)
    if (state.currentRide.status === 'completed') {
      return;
    }

    console.log('🔄 Démarrage synchronisation course en cours:', state.currentRide.id);

    const syncCurrentRide = async () => {
      try {

        // ✅ Créer un timeout manuel
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/rides/${state.currentRide.id}`,
          {
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`

            }
          }
        );

        if (response.ok) {
          const data = await response.json();
          
          if (data.success && data.ride) {

            },
            signal: controller.signal
          }
        ).catch(err => {
          clearTimeout(timeoutId);
          if (err.name !== 'AbortError') {
            console.warn('⚠️ Erreur réseau sync course:', err.name);
          }
          return null;
        });
        
        clearTimeout(timeoutId);

        if (response && response.ok) {
          const data = await response.json().catch(() => null);
          
          if (data && data.success && data.ride) {

            const backendRide = data.ride;
            
            // ✅ ANNULATION: Si le passager a annulé, notifier et nettoyer
            if (backendRide.status === 'cancelled' && state.currentRide.status !== 'cancelled') {
              console.log('❌ Le passager a annulé la course');
              
              // ✅ ARRÊTER LA SONNERIE immédiatement
              stopAllNotifications();
              console.log('🔕 Sonnerie arrêtée suite à l\'annulation par le passager');
              
              // Notification
              toast.error('😔 Le passager a annulé sa course', {
                description: 'La course a été annulée par le passager.',
                duration: 5000
              });
              
              // Nettoyer la course en cours
              if (clearCurrentRide) {
                clearCurrentRide();
              }
              
              // Réinitialiser les états locaux liés à la course
              setShowRideRequest(false);
              setRideRequest(null);
              setRideStartTime(null);
              setWaitingTimeStarted(false);
              setWaitingStartTime(null);
              setIsNearPickup(false);
              setCanStartWaiting(false);
              
              return; // Arrêter le traitement
            }
            
            // ✅ Mettre à jour le state local si le statut a changé
            if (backendRide.status !== state.currentRide.status) {
              console.log('🔄 Mise à jour statut course:', state.currentRide.status, '→', backendRide.status);
              updateRide(state.currentRide.id, {
                status: backendRide.status,
                startedAt: backendRide.startedAt,
                completedAt: backendRide.completedAt
              });
              
              // Si la course a été démarrée mais qu'on n'a pas de rideStartTime local, le définir
              if (backendRide.status === 'in_progress' && backendRide.startedAt && !rideStartTime) {
                console.log('⏱️ Synchronisation rideStartTime depuis backend:', backendRide.startedAt);
                setRideStartTime(new Date(backendRide.startedAt));
              }
            }
          }
        }

      } catch (error) {
        console.error('❌ Erreur synchronisation course:', error);

      } catch (error: any) {
        // ✅ NE PAS logger les erreurs "Script error"
        if (error?.message && error.message !== 'Script error.') {
          console.error('❌ Erreur sync course:', error.message);
        }

      }
    };

    // Synchroniser immédiatement
    syncCurrentRide();

    // Puis toutes les 3 secondes
    const syncInterval = setInterval(syncCurrentRide, 3000);

    return () => {
      console.log('🛑 Arrêt synchronisation course');
      clearInterval(syncInterval);
    };
  }, [state.currentRide?.id, state.currentRide?.status, driver?.id, rideStartTime, updateRide]);

  // ==================== FONCTION DE RAFRAÎCHISSEMENT TEMPS RÉEL ====================
  const refreshDriverData = async () => {
    if (!driver?.id) return;
    
    console.log('🔄 v517.91 - Rafraîchissement des données du conducteur depuis KV store...');
    
    try {
      // ✅ v517.91: Récupérer les stats globales (note + total courses) depuis le backend
      const statsResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/drivers/${driver.id}/stats`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        
        if (statsData.success && statsData.stats) {
          setDriverRating(statsData.stats.averageRating || 0);
          setTotalRides(statsData.stats.totalRides || 0);
          
          console.log(`⭐ v517.91 - Stats globales:`, {
            rating: `${(statsData.stats.averageRating || 0).toFixed(1)}/5`,
            totalRides: statsData.stats.totalRides || 0,
            ratingsCount: statsData.stats.ratingsCount || 0
          });
        }
      }
      
      // ✅ v517.83: Récupérer les gains du jour depuis le backend KV store (au lieu de Supabase)
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/rides/driver/${driver.id}/earnings?period=today`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        
        if (data.success && data.earnings) {
          const todayEarnings = data.earnings.total || 0; // Montant total des courses
          const todayNetEarnings = data.earnings.net || 0; // Gains nets après commission
          const todayRidesCount = data.earnings.ridesCount || 0;
          
          console.log(`📊 v517.90 - Stats aujourd'hui depuis KV store:`, {
            courses: todayRidesCount,
            revenuTotal: `${todayEarnings.toLocaleString()} CDF`,
            gainsNets: `${todayNetEarnings.toLocaleString()} CDF (après commission)`,
            commission: `${(todayEarnings - todayNetEarnings).toLocaleString()} CDF`
          });
          
          // ✅ v517.90: Stocker les gains en CDF directement (pas en USD)
          setTodayEarningsCDF(todayEarnings);
          setTodayNetEarningsCDF(todayNetEarnings);
          setTodayRidesCount(todayRidesCount);
          
          // Mettre à jour les statistiques du driver (garder en USD pour compatibilité)
          updateDriver({
            ...driver,
            earnings: todayNetEarnings / exchangeRate, // Gains nets en USD
            ridesCount: todayRidesCount,
          });
        } else {
          console.log('ℹ️ Aucune course aujourd\'hui');
          setTodayEarningsCDF(0);
          setTodayNetEarningsCDF(0);
          setTodayRidesCount(0);
          updateDriver({
            ...driver,
            earnings: 0,
            ridesCount: 0,
          });
        }
      } else {
        console.error('❌ Erreur récupération stats:', response.status);
      }
      
      // ✅ SUPPRIMÉ : Ne plus lire le solde depuis localStorage
      // Le solde est maintenant chargé UNIQUEMENT depuis le backend (source de vérité unique)
      
      console.log('✅ v517.83 - Données du conducteur rafraîchies depuis KV store !');
      
    } catch (error) {
      console.error('❌ Erreur lors du rafraîchissement:', error);
    }
  };
  // ==================== FIN FONCTION DE RAFRAÎCHISSEMENT ====================

  // ✅ v517.91: Rafraîchir automatiquement les stats toutes les 10 secondes
  useEffect(() => {
    if (!driver?.id) return;

    console.log('⏰ v517.91 - Démarrage auto-refresh stats toutes les 10s (même hors ligne)');
    
    // Rafraîchir immédiatement
    refreshDriverData();
    
    // Puis toutes les 10 secondes
    const interval = setInterval(() => {
      console.log('🔄 Auto-refresh stats du jour...');
      refreshDriverData();
    }, 10000); // 10 secondes

    return () => {
      console.log('🛑 Arrêt auto-refresh stats');
      clearInterval(interval);
    };
  }, [driver?.id]); // ✅ v517.91: Retirer isOnline pour charger les stats même hors ligne

  // Fonction helper pour obtenir le tarif horaire correct selon le type de véhicule
  const getHourlyRate = (): number => {
    const vehicleType = vehicleInfo?.type as VehicleCategory;
    if (!vehicleType || !VEHICLE_PRICING[vehicleType]) {
      return 7; // Fallback au tarif Smart Flex jour
    }
    
    const currentHour = new Date().getHours();
    const isDay = isDayTime(currentHour);
    const pricing = VEHICLE_PRICING[vehicleType];
    
    return isDay ? (pricing.hourlyRateDay || 0) : (pricing.hourlyRateNight || 0);
  };

  // Calculer le solde minimum requis pour une course (1 heure au tarif actuel)
  const getMinimumBalance = (): number => {
    const hourlyRateUSD = getHourlyRate();
    return hourlyRateUSD * exchangeRate; // ✅ v517.81: Utiliser le taux admin
  };

  // Vérifier si le solde est suffisant
  const hasEnoughBalance = (): boolean => {
    // ✅ SIMPLIFIER : Vérifier uniquement le solde minimum
    return accountBalance >= getMinimumBalance();
  };
  
  // Calculer le solde affiché avec useMemo pour forcer le re-render
  const displayedBalance = useMemo(() => {
    return accountBalance;
  }, [accountBalance, balanceRenderKey]); // Dépend du balanceRenderKey ET accountBalance

  const toggleOnlineStatus = async () => {
    // ✅ VÉRIFICATION GPS AVANT TOUT (CRITIQUE)
    if (!isOnline && !driverLocation) {
      toast.error(
        '📍 GPS requis ! Veuillez autoriser la géolocalisation pour passer en ligne.',
        { duration: 6000 }
      );
      if (permissionDenied) {
        toast.error(
          '⚠️ Accédez aux paramètres de votre navigateur pour autoriser la géolocalisation',
          { duration: 8000 }
        );
      }
      return;
    }

    // ✅ VÉRIFICATION DU SOLDE
    if (!isOnline && accountBalance <= 0) {
      toast.error(
        'Solde insuffisant ! Vous devez recharger votre compte pour vous mettre en ligne.',
        { duration: 5000 }
      );
      setShowPaymentModal(true);
      return;
    }

    // Vérifier si le solde est suffisant pour une course minimale
    if (!isOnline && !hasEnoughBalance()) {
      const minBalance = getMinimumBalance();
      toast.error(
        `Solde insuffisant ! Vous devez avoir au moins ${minBalance.toLocaleString()} CDF pour une course.`,
        { duration: 5000 }
      );
      setShowPaymentModal(true);
      return;
    }

    const newStatus = !isOnline;

    // Appeler l'API backend pour mettre à jour le statut
    try {
      // ✅ FIX CRITIQUE: Utiliser publicAnonKey au lieu de accessToken
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/drivers/toggle-online-status`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}` // ✅ Utiliser publicAnonKey
          },
          body: JSON.stringify({
            driverId: driver?.id, // ✅ AJOUTER l'ID du conducteur
            isOnline: newStatus,
            location: driverLocation || null
          })
        }
      );

      const result = await response.json();

      if (!result.success) {
        // Si le backend refuse l'activation (solde insuffisant)
        console.error('❌ Erreur toggle online:', result);
        
        // ✅ v518.1: Afficher un message détaillé avec le montant manquant
        if (result.message && result.currentBalance !== undefined && result.minimumRequired !== undefined) {
          const shortfall = result.minimumRequired - result.currentBalance;
          toast.error(
            `💰 ${result.message}\n\nMontant manquant: ${shortfall.toLocaleString()} CDF\n\nVeuillez recharger votre compte.`,
            { duration: 8000 }
          );
        } else {
          toast.error(result.error || result.message || 'Impossible de changer le statut');
        }
        
        if (result.error?.includes('Solde insuffisant') || result.message?.includes('insuffisant')) {
          setShowPaymentModal(true);
        }
        return;
      }

      // Mise à jour réussie
      setIsOnline(newStatus);

      if (driver) {
        updateDriver(driver.id, { isOnline: newStatus, location: driverLocation || undefined });
      }

      if (newStatus) {
        // 🔥 AFFICHER LE NOM DU LIEU QUAND LE CONDUCTEUR PASSE EN LIGNE
        toast.success('✅ Vous êtes maintenant en ligne !', { duration: 3000 });
        
        if (driverLocation) {
          toast.success(
            `📍 Votre position: ${locationName}`,
            { duration: 5000 }
          );
          console.log('🟢 CONDUCTEUR EN LIGNE - Position GPS:', driverLocation);
          console.log('   Latitude:', driverLocation.lat);
          console.log('   Longitude:', driverLocation.lng);
          console.log('   Lieu:', locationName);
          console.log('   Cette position est maintenant visible par les passagers');
        }
        
        toast.info('🔍 Recherche de courses en cours...', { duration: 3000 });
      } else {
        toast.success('Vous êtes maintenant hors ligne');
      }
    } catch (error) {
      console.error('❌ Erreur toggle status:', error);
      toast.error('Erreur lors du changement de statut');
    }
  };
  
  const handlePostpaidToggle = (checked: boolean) => {
    if (checked && !postpaidPaid) {
      // Si on veut activer mais pas encore payé, montrer le modal de paiement
      setShowPaymentModal(true);
    } else if (!checked) {
      // Désactiver directement
      setPostpaidEnabled(false);
      toast.info('Mode Post-Payé désactivé');
    } else {
      // Déjà payé, juste activer
      setPostpaidEnabled(checked);
      toast.success('Mode Post-Payé activé !');
    }
  };
  
  const handlePostpaidPayment = () => {
    // ✅ v517.87: Validation stricte du montant AVANT parseInt
    if (!rechargeAmount || rechargeAmount.trim() === '') {
      toast.error('Veuillez entrer un montant de recharge');
      return;
    }
    
    const amountToPay = parseInt(rechargeAmount);
    
    // ✅ v517.87: Vérifier que parseInt a réussi ET montant >= 1000
    if (isNaN(amountToPay) || amountToPay < 1000) {
      console.error('❌ v517.87 - Montant de recharge invalide:', { rechargeAmount, amountToPay });
      toast.error('Le montant minimum de recharge est de 1,000 CDF');
      return;
    }
    
    console.log('✅ v517.87 - Montant de recharge validé:', amountToPay.toLocaleString(), 'CDF');
    
    // Validation de l'opérateur
    if (!paymentOperator) {
      toast.error('Veuillez sélectionner un opérateur de paiement');
      return;
    }
    
    // Validation du téléphone
    if (!paymentPhone) {
      toast.error('Veuillez entrer votre numéro de téléphone');
      return;
    }
    
    // Validation du numéro de téléphone (10 chiffres maximum, formats RDC)
    if (paymentPhone.length < 9 || paymentPhone.length > 10) {
      toast.error('Numéro invalide. Utilisez 10 chiffres (ex: 0XXXXXXXXX)');
      return;
    }
    
    // Simuler le paiement Mobile Money
    setIsProcessingPayment(true);
    
    const operatorNames: { [key: string]: string } = {
      orange: 'Orange Money',
      mpesa: 'M-Pesa',
      airtel: 'Airtel Money'
    };
    
    // Utiliser un seul toast qui s'update pour éviter les problèmes
    const toastId = toast.loading(`Connexion à ${operatorNames[paymentOperator]}...`);
    
    setTimeout(() => {
      toast.loading(`Traitement du paiement de ${amountToPay.toLocaleString()} CDF...`, { id: toastId });
      
      setTimeout(async () => {
        setPostpaidEnabled(true);
        setPostpaidPaid(true);
        setShowPaymentModal(false);
        setIsProcessingPayment(false);
        
        // ✅ Ajouter le montant au backend (source de vérité unique)
        const newBalance = await updateBalanceInBackend(driver.id, 'add', amountToPay);
        if (newBalance !== null) {
          setAccountBalance(newBalance);
          setBalanceRenderKey(prev => prev + 1);
        } else {
          // Fallback: mise à jour locale si le backend échoue
          const fallbackBalance = accountBalance + amountToPay;
          setAccountBalance(fallbackBalance);
          // ✅ v517.79: Sauvegarder aussi le fallback dans localStorage
          localStorage.setItem(`driver_balance_${driver.id}`, fallbackBalance.toString());
          console.log(`⚠️ Fallback localStorage: ${fallbackBalance.toLocaleString()} CDF`);
        }
        
        // Réinitialiser le formulaire
        setPaymentPhone('');
        setPaymentOperator('');
        setRechargeAmount('');
        
        // ✅ Fermer les toasts de loading et afficher le succès
        toast.dismiss(toastId);
        toast.success(
          `✅ Recharge de ${amountToPay.toLocaleString()} CDF réussie via ${operatorNames[paymentOperator]} !`,
          { duration: 5000 }
        );
        toast.info('Vous pouvez maintenant activer le mode Post-Payé et recevoir des courses.', {
          duration: 4000
        });
        
        // Force re-render du solde
        setBalanceRenderKey(prev => prev + 1);
        
        // Rafraîchir les données du tableau de bord
        setTimeout(() => {
          refreshDriverData();
        }, 2500);
      }, 2000);
    }, 1500);
  };

  const handleAcceptRide = async () => {
    // ✅ ARRÊTER LA SONNERIE dès que le conducteur accepte
    stopAllNotifications();
    console.log('🔕 Sonnerie arrêtée suite à l\'acceptation de la course');
    
    // ✅ CORRECTION : Récupérer le VRAI prix depuis la base de données
    const estimatedCost = rideRequest?.estimatedPrice;
    
    // ❌ Vérifier si le prix existe dans la base de données
    if (!estimatedCost || estimatedCost === 0) {
      console.error('❌ Prix non trouvé dans la base de données !');
      
      // ✅ ARRÊTER LA SONNERIE
      stopAllNotifications();
      console.log('🔕 Sonnerie arrêtée - erreur prix');
      
      toast.error('Erreur : Prix de la course introuvable. Veuillez réessayer.');
      setShowRideRequest(false);
      return;
    }
    
    console.log(`💰 Prix récupéré depuis le backend : ${estimatedCost.toLocaleString()} CDF`);
    
    // Vérifier le solde avant d'accepter la course
    
    if (accountBalance < estimatedCost) {
      toast.error(
        `❌ Solde insuffisant ! Coût estimé: ${estimatedCost.toLocaleString()} CDF • Votre solde: ${accountBalance.toLocaleString()} CDF`,
        { duration: 6000 }
      );
      toast.warning(
        `Vous devez recharger au moins ${(estimatedCost - accountBalance).toLocaleString()} CDF pour accepter cette course`,
        { duration: 5000 }
      );
      
      // ✅ ARRÊTER LA SONNERIE (déjà fait au début de handleAcceptRide, mais par sécurité)
      stopAllNotifications();
      console.log('🔕 Sonnerie arrêtée - solde insuffisant');
      
      // Refuser automatiquement la course
      setShowRideRequest(false);
      
      // Ouvrir le modal de recharge
      setTimeout(() => {
        setShowPaymentModal(true);
      }, 1000);
      
      // Notification SMS au passager
      if (rideRequest && driver) {
        try {
          await notifyRideCancelled(
            rideRequest.passengerPhone || '+243999999999',
            driver.phone || '+243999999999',
            rideRequest.passengerName || 'Passager',
            driver.name,
            'Le conducteur a un solde insuffisant'
          );
          console.log('✅ SMS refus (solde insuffisant) envoyé au passager');
        } catch (error) {
          console.error('❌ Erreur envoi SMS refus:', error);
        }
      }
      
      return; // Arrêter l'exécution ici
    }
    
    // ✅ APPELER LE BACKEND POUR ACCEPTER LA COURSE (sans code de confirmation)
    try {
      console.log('📞 Appel backend pour accepter la course:', rideRequest.id);
      console.log('🗺️ Coordonnées GPS reçues:', {
        pickupLat: rideRequest.pickupLat,
        pickupLng: rideRequest.pickupLng,
        dropoffLat: rideRequest.dropoffLat,
        dropoffLng: rideRequest.dropoffLng,
        pickup: rideRequest.pickup,
        destination: rideRequest.destination
      });
      
      const acceptResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/rides/accept`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            rideId: rideRequest.id,
            driverId: driver?.id,
            driverName: driver?.name,
            driverPhone: driver?.phone,
            vehicleInfo: driver?.vehicleInfo
          })
        }
      );
      
      if (!acceptResponse.ok) {
        const errorText = await acceptResponse.text();
        console.error('❌ Erreur backend acceptation:', errorText);
        toast.error('Erreur lors de l\'acceptation de la course');
        return;
      }
      
      const acceptData = await acceptResponse.json();
      
      if (!acceptData.success) {
        console.error('❌ Échec acceptation:', acceptData.error);
        toast.error(acceptData.error || 'Erreur lors de l\'acceptation');
        return;
      }
      
      // 🚫 SUPPRIMÉ : Récupération du code de confirmation (simplification UX)
      // Le conducteur peut maintenant démarrer directement sans code
      console.log('✅ Course acceptée - Pas de code requis');
      
    } catch (error) {
      console.error('❌ Erreur lors de l\'appel backend:', error);
      toast.error('Erreur réseau lors de l\'acceptation');
      return;
    }
    
    // ✅ Créer les données de la course à partir de la vraie demande du passager
    const rideData = {
      id: rideRequest.id || `ride_${Date.now()}`,
      passengerId: rideRequest.userId || rideRequest.passengerId,
      driverId: driver?.id,
      pickup: { 
        lat: rideRequest.pickupLat || rideRequest.pickup?.lat, 
        lng: rideRequest.pickupLng || rideRequest.pickup?.lng, 
        address: rideRequest.pickupAddress || rideRequest.pickup?.address || 'Point de départ'
      },
      destination: { 
        lat: rideRequest.dropoffLat || rideRequest.destination?.lat, 
        lng: rideRequest.dropoffLng || rideRequest.destination?.lng, 
        address: rideRequest.dropoffAddress || rideRequest.destination?.address || 'Destination'
      },
      distance: rideRequest.distanceKm || rideRequest.distance || 0, // ✅ AJOUT : distance pour la carte
      vehicleType: rideRequest.vehicleType || rideRequest.category || 'Smart Confort',
      status: 'accepted',
      // 🚫 confirmationCode supprimé pour simplifier l'UX
      estimatedPrice: estimatedCost, // ✅ Prix réel de la demande depuis le backend
      estimatedDuration: Math.ceil((rideRequest.distanceKm || 5) / 20 * 60), // Estimation en minutes (20 km/h en ville)
      createdAt: new Date(),
      pickupInstructions: rideRequest.pickupInstructions, // Instructions du passager
      passengerName: rideRequest.passengerName || 'Passager',
      passengerPhone: rideRequest.passengerPhone
    };
    
    console.log('🚗 Course créée avec les données:', {
      pickup: rideData.pickup,
      destination: rideData.destination,
      vehicleType: rideData.vehicleType,
      estimatedPrice: rideData.estimatedPrice
    });
    
    setCurrentRide(rideData);
    setShowRideRequest(false);
    
    // ✅ Sauvegarder dans le state global de l'application
    console.log('✅ Course sauvegardée dans le state global avec setCurrentRide');
    
    toast.success(`✅ Course acceptée ! Vous pouvez démarrer la course quand le passager monte à bord.`);
    
    // 📱 SMS: Notification au passager que le conducteur a accepté
    if (rideRequest && driver) {
      try {
        await notifyRideConfirmed(
          rideRequest.passengerPhone || '+243999999999',
          driver.phone || '+243999999999',
          driver.name,
          rideRequest.passengerName || 'Passager',
          `${vehicleInfo?.make} ${vehicleInfo?.model} - ${vehicleInfo?.plate}`,
          rideRequest.pickup?.address || rideRequest.pickupAddress || 'Point de depart',
          rideRequest.destination?.address || rideRequest.dropoffAddress || 'Destination',
          vehicleInfo?.type || 'Standard',
          '5'
        );
        console.log('✅ SMS confirmation envoyé au passager et conducteur');
      } catch (error) {
        console.error('❌ Erreur envoi SMS confirmation:', error);
      }
    }
  };

  const handleDeclineRide = async () => {
    // ✅ ARRÊTER LA SONNERIE dès que le conducteur refuse
    stopAllNotifications();
    console.log('🔕 Sonnerie arrêtée suite au refus de la course');
    
    setShowRideRequest(false);
    toast.info('Course refusée');
    
    // 📱 SMS: Notification au passager que le conducteur a refusé
    if (rideRequest && driver) {
      try {
        await notifyRideCancelled(
          rideRequest.passengerPhone || '+243999999999',
          driver.phone || '+243999999999',
          rideRequest.passengerName || 'Passager',
          driver.name,
          'Le conducteur a refusé la course'
        );
        console.log('✅ SMS refus envoyé au passager');
      } catch (error) {
        console.error('❌ Erreur envoi SMS refus:', error);
      }
    }
  };

  const handleConfirmStart = async () => {
    // 🚫 SUPPRIMÉ : Vérification du code de confirmation (simplification UX)
    // Le conducteur démarre directement la course sans code
    
    console.log('✅ Démarrage de course sans code - simplification UX');
    
    if (state.currentRide) {
      // ✅ Vérification du statut avant appel backend
      if (state.currentRide.status !== 'accepted') {
        console.error('❌ Impossible de démarrer : statut actuel =', state.currentRide.status);
        toast.error(`La course ne peut pas être démarrée (statut: ${state.currentRide.status})`);
        return;
      }

      // 🚀 APPELER LE BACKEND POUR DÉMARRER LA COURSE
      try {
        console.log('🚀 Appel backend pour démarrer la course...');
        
        const startResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/rides/start`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              rideId: state.currentRide.id,
              driverId: driver?.id
              // 🚫 confirmationCode supprimé
            })
          }
        );
        
        if (!startResponse.ok) {
          const errorData = await startResponse.json();
          console.error('❌ Erreur backend démarrage course:', errorData);
          toast.error(errorData.error || 'Erreur lors du démarrage de la course');
          return;
        }
        
        const startData = await startResponse.json();
        console.log('✅ Backend a confirmé le démarrage:', startData);
        
        // ✅ Gérer le cas où la course est déjà démarrée (idempotence)
        if (startData.alreadyStarted) {
          console.log('ℹ️ Course déjà démarrée, synchronisation state...');
          // Utiliser le startedAt du backend pour synchroniser
          if (startData.ride?.startedAt) {
            setRideStartTime(new Date(startData.ride.startedAt));
          }
          toast.info('La course est déjà en cours', {
            duration: 3000
          });
          return;
        }
        
        // ✅ Mettre à jour le state global ET local
        const startTime = new Date();
        setRideStartTime(startTime);
        
        // ✅ Mettre à jour le state global pour que l'UI se rafraîchisse
        if (updateRide) {
          updateRide(state.currentRide.id, { 
            status: 'in_progress',
            startedAt: startData.ride?.startedAt || startTime.toISOString()
          });
        }
        
        toast.success('Course démarrée ! Le chronomètre tourne.', {
          duration: 5000
        });
        // 🚫 SUPPRIMÉ : setEnteredCode('');
        
      } catch (error) {
        console.error('❌ Erreur appel backend démarrage:', error);
        toast.error('Erreur réseau lors du démarrage de la course');
        return;
      }
      
      // Le SMS de démarrage sera envoyé quand le driver désactive le temps d'attente gratuite
    }
  };

  const handleCompleteRide = async () => {
    if (state.currentRide && rideStartTime) {
      // Calculer la durée de la course en secondes
      const endTime = new Date();
      const durationInSeconds = Math.floor((endTime.getTime() - rideStartTime.getTime()) / 1000);
      
      // Calculer le coût de la course (temps facturable après 10 minutes gratuites)
      const freeWaitingTimeSeconds = 10 * 60; // 10 minutes
      const billableSeconds = Math.max(0, durationInSeconds - freeWaitingTimeSeconds);
      
      // Calculer le nombre d'heures (toute heure entamée compte)
      const hours = Math.ceil(billableSeconds / 3600);
      
      // Obtenir le tarif horaire actuel
      const hourlyRateUSD = getHourlyRate();
      
      // ✅ v517.86: VALIDATIONS STRICTES CONTRE NaN
      if (!hourlyRateUSD || isNaN(hourlyRateUSD) || hourlyRateUSD <= 0) {
        console.error('❌ v517.86 - Tarif horaire invalide:', hourlyRateUSD);
        toast.error('Erreur: Tarif horaire invalide. Contactez le support.');
        return;
      }
      
      if (!exchangeRate || isNaN(exchangeRate) || exchangeRate <= 0) {
        console.error('❌ v517.86 - Taux de change invalide:', exchangeRate);
        toast.error('Erreur: Taux de change invalide. Contactez le support.');
        return;
      }
      
      // Calculer le coût total en USD puis convertir en CDF (ce que le PASSAGER paie)
      const costUSD = hours * hourlyRateUSD;
      const totalRideCost = Math.round(costUSD * exchangeRate);
      
      // ✅ v517.86: Vérifier que totalRideCost est valide
      if (isNaN(totalRideCost) || totalRideCost < 0) {
        console.error('❌ v517.86 - Coût total invalide:', { hours, hourlyRateUSD, costUSD, exchangeRate, totalRideCost });
        toast.error('Erreur: Calcul du coût invalide. Contactez le support.');
        return;
      }
      
      // ✅ v517.86: Récupérer le taux de commission depuis les paramètres admin
      const commissionPercentage = state.systemSettings?.postpaidInterestRate || 15;
      const commissionAmount = Math.round(totalRideCost * (commissionPercentage / 100));
      const driverEarnings = Math.round(totalRideCost - commissionAmount);
      
      // ✅ v517.86: Vérifier que driverEarnings est valide
      if (isNaN(driverEarnings) || driverEarnings < 0) {
        console.error('❌ v517.86 - Gains conducteur invalides:', { totalRideCost, commissionPercentage, commissionAmount, driverEarnings });
        toast.error('Erreur: Calcul des gains invalide. Contactez le support.');
        return;
      }
      
      console.log('💰 v517.86 - Calcul paiement conducteur (VALIDÉ):', {
        coutTotal: `${totalRideCost.toLocaleString()} CDF (ce que le passager paie)`,
        commission: `${commissionPercentage}% = ${commissionAmount.toLocaleString()} CDF`,
        gainConducteur: `${driverEarnings.toLocaleString()} CDF (crédité au solde)`,
        heures: hours,
        tauxHoraire: `${hourlyRateUSD} USD/h`,
        tauxChange: `${exchangeRate} CDF/USD`
      });

      // 🔥 v517.85: SAUVEGARDER LA COURSE DANS LE BACKEND (CRITIQUE!)
      // SANS CETTE ÉTAPE, LES STATS NE PEUVENT PAS SE METTRE À JOUR !
      try {
        // 🔥 CORRECTION CRITIQUE: Utiliser state.currentRide.id au lieu de générer un nouveau
        const rideId = state.currentRide.id;
        console.log('💾 v517.92 - Sauvegarde course dans le backend avec rideId:', rideId);
        console.log('📊 Durée calculée:', durationInSeconds, 'secondes');
        console.log('📊 Données complètes:', {
          rideId,
          driverId: driver.id,
          finalPrice: totalRideCost,
          duration: durationInSeconds,
          distance: rideRequest?.distance || state.currentRide.distance || 0
        });
        
        const completeResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/rides/complete`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${publicAnonKey}`
            },
            body: JSON.stringify({
              rideId: rideId, // 🔥 UTILISER L'ID EXISTANT POUR QUE LE PASSAGER PUISSE LE RETROUVER
              driverId: driver.id,
              passengerId: rideRequest?.passengerId || state.currentRide.passengerId || 'unknown',
              finalPrice: totalRideCost,
              duration: durationInSeconds, // 🔥 CETTE VALEUR DOIT ÊTRE > 0
              rating: 0, // Sera mis à jour par le passager plus tard
              feedback: '',
              paymentMethod: 'cash', // Mode post-payé = cash à la fin
              pickup: rideRequest?.pickup || state.currentRide.pickup,
              destination: rideRequest?.destination || state.currentRide.destination,
              distance: rideRequest?.distance || state.currentRide.distance || 0,
              vehicleType: vehicleInfo?.type || 'economic',
              completedAt: new Date().toISOString(),
              createdAt: rideRequest?.createdAt || state.currentRide.createdAt || new Date().toISOString()
            })
          }
        );

        if (completeResponse.ok) {
          const completeData = await completeResponse.json();
          console.log('✅ v517.85 - Course sauvegardée dans le backend:', completeData);
        } else {
          console.error('❌ v517.85 - Erreur sauvegarde course backend:', completeResponse.status);
          const errorText = await completeResponse.text();
          console.error('Détails erreur:', errorText);
        }
      } catch (error) {
        console.error('❌ v517.85 - Exception lors de la sauvegarde de la course:', error);
      }
      
      // ✅ v517.82: AJOUTER le gain au solde du conducteur (pas déduire!)
      const newBalance = await updateBalanceInBackend(driver.id, 'add', driverEarnings);
      
      if (newBalance !== null) {
        setAccountBalance(newBalance);
        console.log(`💰 Solde mis à jour dans le backend: ${newBalance.toLocaleString()} CDF`);
        
        // ✅ v517.82: Notification du gain reçu
        toast.success(
          `🎉 Paiement reçu! +${driverEarnings.toLocaleString()} CDF (Commission: ${commissionAmount.toLocaleString()} CDF)`,
          { duration: 5000 }
        );
        
        setTimeout(() => {
          toast.info(
            `Nouveau solde: ${newBalance.toLocaleString()} CDF`,
            { duration: 4000 }
          );
        }, 1500);
      } else {
        // Fallback: mise à jour locale si le backend échoue
        const fallbackBalance = accountBalance + driverEarnings;
        setAccountBalance(fallbackBalance);
        // ✅ v517.79: Sauvegarder aussi le fallback dans localStorage
        localStorage.setItem(`driver_balance_${driver.id}`, fallbackBalance.toString());
        console.log(`⚠️ Fallback localStorage après course: ${fallbackBalance.toLocaleString()} CDF`);
      }
      
      // Forcer le re-render visuel du solde
      setBalanceRenderKey(prev => prev + 1);
      
      // ✅ v518.2: RECHARGER LE SOLDE DEPUIS LE BACKEND APRÈS LA COURSE
      // Pour refléter la déduction automatique de 15% effectuée par le backend
      setTimeout(async () => {
        try {
          console.log('🔄 Rechargement du solde après course pour voir la déduction de 15%...');
          const balanceResponse = await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/drivers/${driver.id}/balance`,
            {
              headers: {
                'Authorization': `Bearer ${publicAnonKey}`
              }
            }
          );
          
          if (balanceResponse.ok) {
            const balanceData = await balanceResponse.json();
            if (balanceData.success) {
              const updatedBalance = balanceData.balance;
              setAccountBalance(updatedBalance);
              setBalanceRenderKey(prev => prev + 1);
              localStorage.setItem(`driver_balance_${driver.id}`, updatedBalance.toString());
              console.log(`✅ Solde mis à jour après course: ${updatedBalance.toLocaleString()} CDF`);
              
              // Notification de la déduction de commission
              setTimeout(() => {
                toast.info(
                  `💰 Commission SmartCabb (${commissionPercentage}%): -${commissionAmount.toLocaleString()} CDF`,
                  { duration: 5000 }
                );
              }, 2500);
            }
          }
        } catch (error) {
          console.error('❌ Erreur rechargement solde après course:', error);
        }
      }, 3000); // Attendre 3 secondes pour laisser le backend traiter la déduction
      
      // Mettre à jour l'état
      setCurrentRide(null);
      // 🚫 SUPPRIMÉ : setConfirmationCode('');
      setRideStartTime(null);
      
      // Rafraîchir les données du tableau de bord
      setTimeout(() => {
        console.log('🔄 v517.85 - Rafraîchissement des stats après course...');
        refreshDriverData();
      }, 2000); // 2 secondes pour laisser le backend traiter la course
      
      // Notification de succès avec détails
      toast.success(
        `Course terminée ! Durée: ${Math.floor(durationInSeconds / 60)} min • Coût: ${totalRideCost.toLocaleString()} CDF`,
        { duration: 5000 }
      );
      
      // 📱 SMS: Notification de fin de course
      if (driver && rideRequest) {
        const durationStr = `${Math.floor(durationInSeconds / 60)} min`;
        notifyRideCompleted(
          rideRequest.passengerPhone || '+243999999999',
          driver.phone || '+243999999999',
          totalRideCost,
          durationStr
        ).catch(err => console.error('❌ Erreur envoi SMS fin de course:', err));
        
        // 📱 SMS: Notification de paiement reçu
        notifyPaymentReceived(
          driver.phone || '+243999999999',
          driverEarnings,
          'Post-Payé SmartCabb'
        ).catch(err => console.error('❌ Erreur envoi SMS paiement:', err));
      }
    } else {
      setCurrentRide(null);
      // 🚫 SUPPRIMÉ : setConfirmationCode('');
      setRideStartTime(null);
      toast.success('Course terminée !');
    }
  };

  if (!driver) {
    // Rediriger vers login si pas de conducteur connecté
    console.error('❌ Pas de conducteur connecté, redirection vers driver-login');
    setCurrentScreen('driver-login');
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Redirection...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-gray-50 flex flex-col"
    >
      {/* Header */}
      <div className="bg-white shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            {/* Photo de profil du conducteur */}
            {driver.profile_photo || driver.photo_url ? (
              <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-blue-500">
                <ImageWithFallback 
                  src={driver.profile_photo || driver.photo_url} 
                  alt={driver.name}
                  className="w-full h-full object-cover"
                  fallback={
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-blue-600" />
                    </div>
                  }
                />
              </div>
            ) : (
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="w-6 h-6 text-blue-600" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-xl truncate">Bonjour {driver.name.split(' ')[0]}</h1>
              <p className="text-sm text-gray-600 truncate">
                {isOnline ? 'En ligne' : 'Hors ligne'}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentScreen('driver-settings')}
            className="w-10 h-10 flex-shrink-0 ml-2"
          >
            <Settings className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Online Status */}
      <div className="p-6">
        {/* Solde du compte - AFFICHAGE DIRECT */}
        <Card 
          key={`balance-${Date.now()}-${accountBalance}`}
          className="p-6 mb-4 bg-gradient-to-r from-green-500 to-emerald-600 border-0 text-white"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <CreditCard className="w-7 h-7 text-white" />
              </div>
              <div>
                <p className="text-sm text-green-100 mb-1">Solde de votre compte</p>
                <div className="flex items-baseline space-x-2">
                  <h2 className="text-3xl font-bold">
                    {formatCDF(accountBalance)}
                  </h2>
                  <span className="text-lg text-green-100 font-medium">
                    (${((accountBalance || 0) / (exchangeRate || 2850)).toFixed(2)} USD)
                  </span>
                </div>
                {postpaidPaid && postpaidEnabled && (
                  <p className="text-xs text-green-100 mt-1">
                    {hasEnoughBalance() 
                      ? ` Solde suffisant (minimum: ${formatCDF(getMinimumBalance())})`
                      : `⚠️ Solde insuffisant - Rechargez au moins ${formatCDF(getMinimumBalance() - accountBalance)}`
                    }
                  </p>
                )}
              </div>
            </div>
            <div>
              <Button
                onClick={() => setShowPaymentModal(true)}
                variant="outline"
                className="bg-white bg-opacity-10 hover:bg-opacity-20 border-white border-opacity-30 text-white h-10"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Recharger
              </Button>
            </div>
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-4 h-4 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
              <div className="flex-1">
                <h3 className="font-semibold">
                  {isOnline ? 'Vous êtes en ligne' : 'Vous êtes hors ligne'}
                </h3>
                <p className="text-sm text-gray-600">
                  {isOnline 
                    ? '✅ Prêt à recevoir des courses' 
                    : !driverLocation
                      ? '📍 GPS requis - Autorisez la géolocalisation'
                      : accountBalance <= 0
                        ? '⚠️ Solde insuffisant - Rechargez pour vous mettre en ligne'
                        : '👆 Activez pour recevoir des courses'
                  }
                </p>
                
                {/* 🔥 AFFICHAGE POSITION GPS EN TEMPS RÉEL (style capture1) */}
                {driverLocation && (
                  <div className="mt-2 p-2 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-start space-x-2">
                      <MapPin className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-green-800">
                          {isOnline ? '🟢 Actif pour recevoir des courses' : '⚪ Hors ligne'}
                        </p>
                        <p className="text-xs text-green-700 mt-0.5">
                          📍 {locationName}
                        </p>
                        {accuracy && (
                          <p className="text-xs text-gray-600 mt-0.5">
                            Précision GPS: ±{accuracy.toFixed(0)}m
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                
                {!driverLocation && !isOnline && gpsError && (
                  <div className="mt-2 p-2 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-xs text-red-600">
                      ⚠️ {gpsError}
                    </p>
                  </div>
                )}
                
                {!driverLocation && !gpsError && !isOnline && (
                  <div className="mt-2 p-2 bg-yellow-50 rounded-lg border border-yellow-200">
                    <p className="text-xs text-yellow-700">
                      ⏳ Détection GPS en cours...
                    </p>
                  </div>
                )}
              </div>
            </div>
            <Switch
              checked={isOnline}
              onCheckedChange={toggleOnlineStatus}
              disabled={accountBalance <= 0 || !driverLocation}
            />
          </div>
        </Card>
      </div>

      {/* Current Ride */}
      {state.currentRide && state.currentRide.status !== 'completed' && state.currentRide.status !== 'cancelled' && (
        <div className="px-6 pb-6">
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Course en cours</h3>
            
            {/* 🚫 SUPPRIMÉ : Section de saisie du code de confirmation (simplification UX) */}
            {/* Le conducteur démarre directement la course avec le bouton "Démarrer" */}
            
            {false && state.currentRide.status === 'accepted' && (
              <div className="mb-4 p-4 bg-orange-50 rounded-lg border border-orange-200">
                <div className="text-center mb-4">
                  <div className="flex items-center justify-center mb-2">
                    <Key className="w-5 h-5 text-orange-600 mr-2" />
                    <p className="text-sm text-orange-600 font-semibold">Demandez le code au passager</p>
                  </div>
                  <p className="text-xs text-orange-500">
                    Le passager a reçu un code de confirmation. Demandez-lui le code et saisissez-le ci-dessous.
                  </p>
                </div>
                
                {/* Indicateur de proximité GPS */}
                {driverLocation && (
                  <div className={`mb-3 p-3 rounded-lg border-2 ${
                    isNearPickup 
                      ? 'bg-green-50 border-green-300' 
                      : 'bg-blue-50 border-blue-300'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <MapPin className={`w-5 h-5 ${isNearPickup ? 'text-green-600' : 'text-blue-600'}`} />
                        <div>
                          <p className={`text-sm font-semibold ${isNearPickup ? 'text-green-800' : 'text-blue-800'}`}>
                            {isNearPickup ? '✅ Vous êtes arrivé !' : '📍 En route vers le passager'}
                          </p>
                          {driverLocation && state.currentRide && (
                            <p className="text-xs text-gray-600">
                              Distance: {(calculateDistance(
                                driverLocation.lat,
                                driverLocation.lng,
                                state.currentRide.pickup.lat,
                                state.currentRide.pickup.lng
                              ) || 0).toFixed(0)}m du point de départ
                            </p>
                          )}
                        </div>
                      </div>
                      {isNearPickup && (
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                      )}
                    </div>
                  </div>
                )}
                
                {gpsError && (
                  <div className="mb-3 p-3 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-yellow-800">Mode GPS désactivé</p>
                        <p className="text-xs text-yellow-700">L'application fonctionne normalement</p>
                        <p className="text-xs text-gray-600 mt-1">
                          📍 Position par défaut: Kinshasa Centre
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="code" className="text-sm text-gray-600">Code de confirmation du passager</Label>
                    <Input
                      id="code"
                      type="text"
                      placeholder="Entrez le code à 4 chiffres"
                      value={enteredCode}
                      onChange={(e) => setEnteredCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      className="mt-1 text-center text-lg font-mono"
                      maxLength={4}
                    />
                  </div>
                  
                  <Button
                    onClick={handleConfirmStart}
                    disabled={enteredCode.length !== 4}
                    className="w-full bg-green-500 hover:bg-green-600"
                  >
                    {enteredCode.length !== 4 ? 'Entrez le code complet' : 'Démarrer la course'}
                  </Button>
                </div>
              </div>
            )}

            {/* ✅ NOUVEAU : Bouton direct pour démarrer la course quand statut = accepted */}
            {state.currentRide.status === 'accepted' && !rideStartTime && (
              <div className="mb-4">
                <div className="mb-3 p-4 bg-green-50 border-2 border-green-300 rounded-lg">
                  <div className="flex items-center justify-center mb-2">
                    <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center mr-3">
                      <Clock className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-green-800">Prêt à démarrer</p>
                      <p className="text-xs text-green-600">Le passager vous attend</p>
                    </div>
                  </div>
                </div>
                
                <Button
                  onClick={handleConfirmStart}
                  className="w-full bg-green-500 hover:bg-green-600 text-white py-6 text-lg font-semibold shadow-lg"
                >
                  <PlayCircle className="w-6 h-6 mr-2" />
                  Démarrer la course
                </Button>
                
                <p className="text-xs text-center text-gray-500 mt-2">
                  Le chronomètre démarrera automatiquement
                </p>
              </div>
            )}

            {/* 🆕 AFFICHAGE DU CHRONOMÈTRE (seulement si rideStartTime est défini) */}
            {rideStartTime && state.currentRide.status === 'in_progress' && (
              <div className="mb-4">
                <RideTimer
                  isActive={true}
                  startTime={rideStartTime}
                  hourlyRate={getHourlyRate()}
                  showWaitingTime={true}
                />
              </div>
            )}

            {/* ⚠️ AVERTISSEMENT SI COURSE DÉMARRÉE MAIS PAS DE CHRONO LOCAL */}
            {!rideStartTime && state.currentRide.status === 'in_progress' && (
              <div className="mb-4 p-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-yellow-800">Course démarrée</p>
                    <p className="text-xs text-yellow-700 mt-1">
                      La course a été démarrée. Le chronomètre n'est pas disponible localement.
                    </p>
                    <p className="text-xs text-yellow-600 mt-1">
                      Vous pouvez terminer la course ci-dessous.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Départ</p>
                <p className="font-medium">{state.currentRide.pickup.address}</p>
                {/* 🆕 Instructions de prise en charge */}
                {state.currentRide.pickupInstructions && (
                  <div className="mt-2 bg-green-50 border-l-4 border-green-500 p-3 rounded-r-lg">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-green-700 font-medium mb-1">Point de repère</p>
                        <p className="text-sm text-green-900">{state.currentRide.pickupInstructions}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm text-gray-600">Destination</p>
                <p className="font-medium">{state.currentRide.destination.address}</p>
              </div>
              
              {/* 🆕 v517.91: BOUTONS DE CONTACT PASSAGER */}
              {state.currentRide.passengerPhone && (
                <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded-r-lg">
                  <p className="text-xs text-blue-700 font-medium mb-2">📞 Contacter le passager</p>
                  <div className="grid grid-cols-3 gap-2">
                    {/* WhatsApp */}
                    <a
                      href={`https://wa.me/${state.currentRide.passengerPhone?.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col items-center justify-center p-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors text-center"
                    >
                      <svg className="w-5 h-5 mb-1" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                      </svg>
                      <span className="text-xs">WhatsApp</span>
                    </a>
                    
                    {/* Appel WhatsApp */}
                    <a
                      href={`https://wa.me/${state.currentRide.passengerPhone?.replace(/[^0-9]/g, '')}?text=`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col items-center justify-center p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors text-center"
                    >
                      <Phone className="w-5 h-5 mb-1" />
                      <span className="text-xs">Appeler</span>
                    </a>
                    
                    {/* SMS */}
                    <a
                      href={`sms:${state.currentRide.passengerPhone}`}
                      className="flex flex-col items-center justify-center p-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors text-center"
                    >
                      <MessageSquare className="w-5 h-5 mb-1" />
                      <span className="text-xs">SMS</span>
                    </a>
                  </div>
                </div>
              )}
            </div>

            {state.currentRide.status === 'in_progress' && (
              <div className="space-y-3 mt-4">
                <Button
                  onClick={() => setCurrentScreen('driver-navigation')}
                  className="w-full bg-blue-500 hover:bg-blue-600"
                >
                  🚗 Voir les contrôles de navigation (avec chrono)
                </Button>
                
                {/* ✅ BOUTON TERMINER LA COURSE (visible et imposant) */}
                <Button
                  onClick={handleCompleteRide}
                  className="w-full bg-red-500 hover:bg-red-600 text-white py-6 text-lg font-bold shadow-xl border-2 border-red-600"
                >
                  <CheckCircle className="w-6 h-6 mr-2" />
                  Terminer la course
                </Button>
                <p className="text-xs text-center text-gray-500">
                  ⚠️ Cliquez uniquement quand le passager est arrivé à destination
                </p>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Stats */}
      <div className="px-6 pb-6">
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Euro className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-600 truncate">Aujourd'hui</p>
                <p className="text-lg font-semibold truncate">{formatCDF(todayNetEarningsCDF)}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-600 truncate">En ligne</p>
                <p className="text-lg font-semibold truncate">6h 30m</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Star className="w-5 h-5 text-yellow-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-600 truncate">Note</p>
                <p className="text-lg font-semibold truncate">{driverRating > 0 ? (driverRating || 0).toFixed(1) : '0.0'} ⭐</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-600 truncate">Courses réalisées</p>
                <p className="text-lg font-semibold truncate">{totalRides}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Vehicle Info */}
      <div className="px-6 pb-6">
        <Card className="p-4">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Car className="w-5 h-5 text-gray-600" />
            </div>
            <div className="flex-1 min-w-0">
              {vehicleInfo ? (
                <>
                  <h3 className="font-semibold truncate">
                    {getVehicleDisplayName(vehicleInfo)}
                  </h3>
                  <p className="text-sm text-gray-600 font-mono truncate">{vehicleInfo.plate || vehicleInfo.license_plate || 'Plaque non configurée'}</p>
                </>
              ) : (
                <div className="min-w-0">
                  <h3 className="font-semibold text-gray-400 truncate">
                    Véhicule non configuré
                  </h3>
                  <p className="text-sm text-gray-500 truncate">Ajoutez vos informations de véhicule</p>
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="px-6 pb-6">
        <h3 className="text-lg mb-4">Actions rapides</h3>
        <div className="space-y-3">
          <Button
            onClick={() => {
              console.log('🔘 Clic sur bouton "Voir mes gains"');
              setCurrentScreen('driver-earnings'); // ✅ CORRECTION: Ajouter préfixe "driver-"
            }}
            variant="outline"
            className="w-full justify-start h-12"
          >
            <Euro className="w-5 h-5 mr-3" />
            Voir mes gains
          </Button>
          <Button
            onClick={() => {
              console.log('🔘 Clic sur bouton "Mon profil"');
              setCurrentScreen('driver-profile');
            }}
            variant="outline"
            className="w-full justify-start h-12"
          >
            <User className="w-5 h-5 mr-3" />
            Mon profil
          </Button>
          
          {/* Post-Payé Toggle avec statut de paiement */}
          <Card className={`p-4 border-2 ${postpaidPaid ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50'}`}>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${postpaidPaid ? 'bg-green-100' : 'bg-orange-100'}`}>
                    {postpaidPaid ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <Lock className="w-5 h-5 text-orange-600" />
                    )}
                  </div>
                  <div>
                    <h3 className={`font-semibold ${postpaidPaid ? 'text-green-900' : 'text-orange-900'}`}>
                      Mode Post-Payé
                    </h3>
                    <p className={`text-xs ${postpaidPaid ? 'text-green-600' : 'text-orange-600'}`}>
                      {postpaidPaid 
                        ? (postpaidEnabled ? 'Activé et payé ✅' : 'Payé - Activez pour recevoir des courses')
                        : 'Rechargez votre compte pour recevoir des courses'}
                    </p>
                  </div>
                </div>
                {postpaidPaid && (
                  <Switch
                    checked={postpaidEnabled}
                    onCheckedChange={handlePostpaidToggle}
                    className="data-[state=checked]:bg-green-600"
                  />
                )}
              </div>
              
              {!postpaidPaid && (
                <Button
                  onClick={() => setShowPaymentModal(true)}
                  className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white"
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Recharger mon compte
                </Button>
              )}
            </div>
          </Card>
          
          <div className="flex space-x-2">
            <Button
              onClick={() => setShowCommissionSettings(!showCommissionSettings)}
              variant="outline"
              className="flex-1 justify-start h-12"
            >
              <Percent className="w-5 h-5 mr-3" />
              Commissions
            </Button>
            <EmergencyAlert userType="driver" />
          </div>
        </div>
        
        {/* Commission Settings Panel */}
        {showCommissionSettings && (
          <div className="px-6 pb-6">
            <CommissionSettings userType="driver" driverId={driver.id} />
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="mt-auto bg-white border-t p-4">
        <Button
          onClick={() => {
            console.log('🚪 Déconnexion du conducteur depuis Dashboard');
            setCurrentDriver(null);
            setCurrentScreen('landing');
            toast.success('Déconnexion réussie');
          }}
          variant="ghost"
          className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          Déconnexion
        </Button>
      </div>

      {/* Sound Notification - DÉSACTIVÉ: Remplacé par le nouveau système RideNotification avec message vocal */}
      {/* <SoundNotification shouldPlay={showRideRequest} duration={15000} /> */}

      {/* Ride Request Modal */}
      {showRideRequest && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center p-6 z-50"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-6 w-full max-w-sm"
          >
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Navigation className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl mb-2">Nouvelle course !</h3>
              <p className="text-gray-600">Un passager vous attend</p>
            </div>

            <div className="space-y-3 mb-6">
              <div>
                <p className="text-sm text-gray-600">Départ</p>
                <p className="font-semibold">{rideRequest?.pickup?.address || rideRequest?.pickupAddress || 'Adresse de départ'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Destination</p>
                <p className="font-semibold">{rideRequest?.destination?.address || rideRequest?.dropoffAddress || 'Adresse de destination'}</p>
              </div>
              <div className="flex justify-between">
                <div>
                  <p className="text-sm text-gray-600">Distance</p>
                  <p className="font-semibold">{(rideRequest?.distance || rideRequest?.distanceKm || 0).toFixed(1)} km</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Estimation</p>
                  <p className="font-semibold">{formatCDF(rideRequest?.estimatedPrice)}</p>
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              <Button
                onClick={handleDeclineRide}
                variant="outline"
                className="flex-1 h-12"
              >
                Refuser
              </Button>
              <Button
                onClick={handleAcceptRide}
                className="flex-1 h-12 bg-green-500 hover:bg-green-600"
              >
                Accepter
              </Button>
            </div>

            {/* Auto decline timer */}
            <motion.div
              className="mt-4 text-center text-sm text-gray-500"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
            >
              Refus automatique dans 10s
            </motion.div>
          </motion.div>
        </motion.div>
      )}

      {/* Modal de Paiement Mobile Money */}
      {showPaymentModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-6 z-50"
          onClick={() => !isProcessingPayment && setShowPaymentModal(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6">
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
                  <CreditCard className="w-8 h-8 text-orange-600" />
                </div>
              </div>
              <h3 className="text-xl text-center mb-2">Recharger votre compte</h3>
              <p className="text-sm text-center text-gray-600">
                Rechargez votre compte pour activer le mode Post-Payé
              </p>
            </div>

            <div className="space-y-4">
              {/* Montant de recharge - NOUVEAU */}
              <div>
                <Label htmlFor="recharge-amount">Montant de recharge (CDF)</Label>
                <Input
                  id="recharge-amount"
                  type="number"
                  placeholder="Exemple: 10000"
                  value={rechargeAmount}
                  onChange={(e) => setRechargeAmount(e.target.value)}
                  disabled={isProcessingPayment}
                  className="mt-1 h-12 text-lg"
                  min="1000"
                  step="1000"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Montant minimum: 1,000 CDF
                </p>
              </div>

              {/* Montant à payer - mis à jour */}
              {rechargeAmount && parseInt(rechargeAmount) >= 1000 && (
                <div className="p-4 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg border-2 border-orange-200 text-center">
                  <span className="text-sm text-gray-600">Montant à payer</span>
                  <span className="font-semibold text-3xl text-orange-600 block mt-1">
                    {formatCDF(parseInt(rechargeAmount))}
                  </span>
                </div>
              )}

              {/* Opérateur - DÉPLACÉ EN PREMIER */}
              <div>
                <Label>Choisissez votre opérateur Mobile Money</Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <Button
                    type="button"
                    variant={paymentOperator === 'orange' ? 'default' : 'outline'}
                    className={`h-20 ${paymentOperator === 'orange' ? 'bg-orange-500 hover:bg-orange-600 border-2 border-orange-600' : 'border-2'}`}
                    onClick={() => setPaymentOperator('orange')}
                    disabled={isProcessingPayment}
                  >
                    <div className="text-center">
                      <div className="font-semibold">Orange</div>
                      <div className="text-xs">Money</div>
                    </div>
                  </Button>
                  <Button
                    type="button"
                    variant={paymentOperator === 'mpesa' ? 'default' : 'outline'}
                    className={`h-20 ${paymentOperator === 'mpesa' ? 'bg-green-600 hover:bg-green-700 border-2 border-green-700' : 'border-2'}`}
                    onClick={() => setPaymentOperator('mpesa')}
                    disabled={isProcessingPayment}
                  >
                    <div className="text-center">
                      <div className="font-semibold">M-Pesa</div>
                      <div className="text-xs">Vodacom</div>
                    </div>
                  </Button>
                  <Button
                    type="button"
                    variant={paymentOperator === 'airtel' ? 'default' : 'outline'}
                    className={`h-20 ${paymentOperator === 'airtel' ? 'bg-red-600 hover:bg-red-700 border-2 border-red-700' : 'border-2'}`}
                    onClick={() => setPaymentOperator('airtel')}
                    disabled={isProcessingPayment}
                  >
                    <div className="text-center">
                      <div className="font-semibold">Airtel</div>
                      <div className="text-xs">Money</div>
                    </div>
                  </Button>
                </div>
              </div>

              {/* Téléphone - APRÈS L'OPÉRATEUR */}
              {paymentOperator && (
                <div>
                  <Label htmlFor="payment-phone">Numéro de téléphone Mobile Money</Label>
                  <Input
                    id="payment-phone"
                    type="tel"
                    placeholder="0XXXXXXXXX"
                    value={paymentPhone}
                    onChange={(e) => {
                      // Limiter à 10 chiffres maximum (formats RDC)
                      const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setPaymentPhone(value);
                    }}
                    disabled={isProcessingPayment}
                    className="mt-1 h-12 text-lg font-mono"
                    maxLength={10}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    10 chiffres maximum • Formats acceptés: 0XXXXXXXXX, +243XXXXXXXXX
                  </p>
                </div>
              )}

              {/* Information */}
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-800">
                    <strong>Important :</strong> Après le paiement, vous pourrez activer le mode Post-Payé
                    et commencer à recevoir des demandes de courses.
                  </p>
                </div>
              </div>

              {/* Boutons */}
              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  className="flex-1 h-12"
                  onClick={() => setShowPaymentModal(false)}
                  disabled={isProcessingPayment}
                >
                  Annuler
                </Button>
                <Button
                  onClick={handlePostpaidPayment}
                  className="flex-1 h-12 bg-orange-500 hover:bg-orange-600"
                  disabled={isProcessingPayment || !paymentPhone || !paymentOperator || !rechargeAmount || parseInt(rechargeAmount) < 1000}
                >
                  {isProcessingPayment ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Traitement...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4 mr-2" />
                      Payer maintenant
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* 🔔 SYSTÈME DE NOTIFICATIONS SONORES - Joue le son + message vocal automatiquement */}
      <RideNotificationSound shouldPlay={showRideRequest} rideDetails={rideRequest} />
    </motion.div>
  );
}