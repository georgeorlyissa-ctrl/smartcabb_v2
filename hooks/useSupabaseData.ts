import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  profileService, 
  driverService, 
  vehicleService, 
  rideService, 
  promoCodeService,
  settingService 
} from '../lib/supabase-services';
import type { Profile, Driver, Vehicle, Ride, PromoCode, Setting } from '../lib/supabase';
import { projectId, publicAnonKey } from '../utils/supabase/info';

// Type enrichi qui combine Driver + Profile + Vehicle
export type EnrichedDriver = Driver & {
  full_name: string;
  email: string;
  phone?: string;
  vehicle_make?: string;
  vehicle_model?: string;
  vehicle_plate?: string;
  vehicle_color?: string;
  vehicle_category?: string;
};

// Type enrichi pour les rides
export type EnrichedRide = Ride & {
  pickup: {
    address: string;
    lat: number;
    lng: number;
  };
  destination: {
    address: string;
    lat: number;
    lng: number;
  };
  estimatedPrice: number;
  estimatedDuration: number;
  passengerId: string;
  driverId?: string;
  createdAt: Date;
};

// Fonction pour récupérer les drivers depuis le KV store
async function fetchDriversFromKV(): Promise<Driver[]> {
  try {
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/drivers`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        }
      }
    );
    
    if (!response.ok) {
      console.error('Erreur fetch drivers KV:', response.statusText);
      return [];
    }
    
    const data = await response.json();
    
    if (data.success && data.drivers) {
      console.log('✅ Drivers chargés depuis KV store:', data.count);
      console.log('🔍 DEBUG - Premier conducteur:', data.drivers[0]); // 🔍 DEBUG
      console.log('🔍 DEBUG - Statut du premier conducteur:', data.drivers[0]?.status); // 🔍 DEBUG
      return data.drivers;
    }
    
    return [];
  } catch (error) {
    console.error('❌ Erreur récupération drivers depuis KV:', error);
    return [];
  }
}

// Fonction pour récupérer les courses depuis le KV store
async function fetchRidesFromKV(): Promise<Ride[]> {
  try {
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/admin/rides?limit=1000`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        }
      }
    );
    
    if (!response.ok) {
      console.error('Erreur fetch rides KV:', response.statusText);
      return [];
    }
    
    const data = await response.json();
    
    if (data.success && data.rides) {
      console.log('✅ Courses chargées depuis KV store:', data.count);
      // Convertir les courses du KV store au format attendu
      return data.rides.map((ride: any) => ({
        id: ride.id,
        passenger_id: ride.passengerId || ride.passenger_id,
        driver_id: ride.driverId || ride.driver_id,
        pickup_address: ride.pickup?.address || ride.pickupAddress,
        pickup_lat: ride.pickup?.lat || ride.pickupLat,
        pickup_lng: ride.pickup?.lng || ride.pickupLng,
        dropoff_address: ride.destination?.address || ride.destinationAddress,
        dropoff_lat: ride.destination?.lat || ride.destinationLat,
        dropoff_lng: ride.destination?.lng || ride.destinationLng,
        total_amount: ride.finalPrice || ride.total_amount || ride.estimatedPrice,
        duration_minutes: ride.duration || ride.duration_minutes,
        status: ride.status,
        created_at: ride.createdAt || ride.created_at,
        vehicle_category: ride.vehicleType || ride.vehicle_category,
        rating: ride.rating,
        payment_method: ride.paymentMethod || ride.payment_method
      }));
    }
    
    return [];
  } catch (error) {
    console.error('❌ Erreur récupération courses depuis KV:', error);
    return [];
  }
}

// Fonction pour récupérer les passagers depuis le KV store
async function fetchPassengersFromKV(): Promise<Profile[]> {
  try {
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/passengers`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        }
      }
    );
    
    if (!response.ok) {
      console.error('Erreur fetch passengers KV:', response.statusText);
      return [];
    }
    
    const data = await response.json();
    
    if (data.success && data.passengers) {
      console.log('✅ Passagers chargés depuis KV store:', data.count);
      // Convertir les passagers du KV store au format Profile
      return data.passengers.map((passenger: any) => ({
        id: passenger.id,
        email: passenger.email,
        full_name: passenger.name || passenger.full_name,
        phone: passenger.phone,
        role: 'passenger' as const,
        balance: passenger.balance || 0,
        account_type: passenger.account_type || 'prepaid',
        created_at: passenger.created_at || new Date().toISOString(),
        updated_at: passenger.updated_at || new Date().toISOString()
      }));
    }
    
    return [];
  } catch (error) {
    console.error('❌ Erreur récupération passagers depuis KV:', error);
    return [];
  }
}

export function useSupabaseData() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [rawDrivers, setRawDrivers] = useState<Driver[]>([]);
  const [drivers, setDrivers] = useState<EnrichedDriver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [rawRides, setRawRides] = useState<Ride[]>([]);
  const [rides, setRides] = useState<EnrichedRide[]>([]);
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRLSFixModal, setShowRLSFixModal] = useState(false);
  
  // Utiliser useRef au lieu de state pour éviter les re-renders
  const isLoadingRef = useRef(false);
  const hasLoadedRef = useRef(false);

  // Charger toutes les données
  const loadAllData = useCallback(async () => {
    // Protection : empêcher les appels multiples simultanés
    if (isLoadingRef.current) {
      console.log('⚠️ Data loading already in progress, skipping...');
      return;
    }

    try {
      isLoadingRef.current = true;
      setLoading(true);
      setError(null);

      console.log('🔄 Loading data from Supabase...');

      // Créer des promesses avec timeout pour chaque service
      const createTimeoutPromise = (promise: Promise<any>, timeoutMs: number, serviceName: string) => {
        // Plus de timeout - laisser la requête se terminer naturellement
        return promise.catch(err => {
          // Retourner un tableau vide au lieu de rejeter
          console.debug(`⚠️ ${serviceName} - ${err.message || 'erreur'}`);
          return [];
        });
      };

      // Charger avec Promise.all (sans timeouts artificiels)
      // IMPORTANT: Les drivers sont chargés depuis le KV store via l'API serveur
      const [profilesData, driversData, vehiclesData, ridesData, promoCodesData, settingsData] = await Promise.all([
        createTimeoutPromise(profileService.getAllProfiles(), 0, 'Profiles'),
        createTimeoutPromise(fetchDriversFromKV(), 0, 'Drivers'),
        createTimeoutPromise(vehicleService.getAllVehicles(), 0, 'Vehicles'),
        createTimeoutPromise(fetchRidesFromKV(), 0, 'Rides'),
        createTimeoutPromise(promoCodeService.getAllPromoCodes(), 0, 'PromoCodes'),
        createTimeoutPromise(settingService.getAllSettings(), 0, 'Settings'),
      ]);

      // Logger les erreurs individuelles (en mode info si c'est un timeout)
      let hasRLSError = false;
      const results = [
        { status: 'fulfilled', value: profilesData },
        { status: 'fulfilled', value: driversData },
        { status: 'fulfilled', value: vehiclesData },
        { status: 'fulfilled', value: ridesData },
        { status: 'fulfilled', value: promoCodesData },
        { status: 'fulfilled', value: settingsData },
      ];
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          const names = ['profiles', 'drivers', 'vehicles', 'rides', 'promoCodes', 'settings'];
          const error = result.reason;
          
          // Détecter erreur de récursion RLS
          if (error?.code === '42P17' || error?.message?.includes('infinite recursion')) {
            console.error(`❌ ERREUR RLS RÉCURSION: ${names[index]}`);
            hasRLSError = true;
          } else if (error?.message?.includes('timeout')) {
            // Silencieux - timeout normal si Supabase n'est pas configuré
            console.debug(`⏱️ ${names[index]} fetch timeout (Supabase non configuré)`);
          } else if (error?.message?.includes('fetch') || error?.message?.includes('aborted') || error?.message?.includes('connection')) {
            // Silencieux - problème de connexion normal
            console.debug(`ℹ️ ${names[index]} - connection issue (Supabase non configuré)`);
          } else {
            // Seulement logger les vraies erreurs inattendues
            console.debug(`⚠️ Error loading ${names[index]}:`, result.reason);
          }
        }
      });
      
      // Afficher le modal de fix RLS si erreur détectée
      if (hasRLSError) {
        console.error('🔥 ERREUR CRITIQUE: Récursion infinie RLS détectée!');
        console.error('📋 Ouvrez le modal pour corriger le problème');
        setShowRLSFixModal(true);
      }

      // Log uniquement si des données sont chargées
      const totalData = profilesData.length + driversData.length + vehiclesData.length + ridesData.length + promoCodesData.length + settingsData.length;
      if (totalData > 0) {
        console.log('✅ Data loaded:', {
          profiles: profilesData.length,
          drivers: driversData.length,
          vehicles: vehiclesData.length,
          rides: ridesData.length,
          promoCodes: promoCodesData.length,
          settings: settingsData.length,
        });
      }

      setProfiles(profilesData);
      setRawDrivers(driversData);
      setVehicles(vehiclesData);
      setRawRides(ridesData);
      setPromoCodes(promoCodesData);
      setSettings(settingsData);

      // Enrichir les drivers avec les profils et véhicules
      // NOTE: Les drivers du KV store ont déjà les infos du véhicule intégrées
      const enrichedDrivers: EnrichedDriver[] = driversData.map(driver => {
        const profile = profilesData.find(p => p.id === driver.user_id);
        
        // Si le driver vient du KV store, il a déjà vehicle.make, vehicle.model, etc.
        // Sinon, on cherche dans vehiclesData
        const vehicle = vehiclesData.find(v => v.id === driver.vehicle_id);
        
        return {
          ...driver,
          full_name: driver.full_name || profile?.full_name || 'Conducteur inconnu',
          email: driver.email || profile?.email || '',
          phone: driver.phone || profile?.phone,
          vehicle_make: driver.vehicle?.make || vehicle?.make,
          vehicle_model: driver.vehicle?.model || vehicle?.model,
          vehicle_plate: driver.vehicle?.license_plate || vehicle?.license_plate,
          vehicle_color: driver.vehicle?.color || vehicle?.color,
          vehicle_category: driver.vehicle?.category || vehicle?.category,
        };
      });

      setDrivers(enrichedDrivers);

      // Enrichir les rides
      const enrichedRides: EnrichedRide[] = ridesData.map(ride => ({
        ...ride,
        pickup: {
          address: ride.pickup_address,
          lat: ride.pickup_lat,
          lng: ride.pickup_lng,
        },
        destination: {
          address: ride.dropoff_address,
          lat: ride.dropoff_lat,
          lng: ride.dropoff_lng,
        },
        estimatedPrice: ride.total_amount,
        estimatedDuration: ride.duration_minutes,
        status: ride.status,
        passengerId: ride.passenger_id || '',
        driverId: ride.driver_id,
        createdAt: new Date(ride.created_at),
      }));

      setRides(enrichedRides);
      
      hasLoadedRef.current = true;
    } catch (err) {
      const error = err as Error;
      if (error?.message?.includes('timeout') || error?.message?.includes('fetch')) {
        console.log('ℹ️ Data loading skipped (Supabase non configuré ou timeout)');
        // Ne pas définir d'erreur pour un timeout - mode dégradé gracieux
      } else {
        console.warn('⚠️ Error loading data from Supabase:', err);
        setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      }
      hasLoadedRef.current = true; // Marquer comme chargé même en cas d'erreur
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, []); // AUCUNE dépendance pour éviter les boucles infinies

  // Charger les données au montage
  useEffect(() => {
    // Marquer comme chargé pour éviter les boucles
    if (hasLoadedRef.current) {
      console.log('⚠️ Data already loaded, skipping auto-load');
      return;
    }
    
    console.log('🚀 Initial data load on mount');
    
    // Timeout augmenté pour éviter les erreurs
    const timeoutId = setTimeout(() => {
      if (isLoadingRef.current) {
        isLoadingRef.current = false;
        setLoading(false);
        // Ne pas définir d'erreur si c'est juste un timeout - mode dégradé
        hasLoadedRef.current = true; // Marquer comme chargé pour éviter les retry
      }
    }, 20000); // Timeout augmenté à 20 secondes
    
    loadAllData().finally(() => {
      clearTimeout(timeoutId);
    });
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, []); // Tableau vide = exécute UNE SEULE FOIS au montage

  // Rafraîchir les données manuellement
  const refresh = useCallback(() => {
    console.log('🔄 Manual refresh requested - Forcing data reload');
    // Réinitialiser le flag de protection pour forcer le rechargement
    isLoadingRef.current = false;
    hasLoadedRef.current = false; // ✅ Réinitialiser aussi ce flag pour forcer le rechargement
    setLoading(true);
    loadAllData();
  }, [loadAllData]);

  // Obtenir les passagers (profils avec role = 'passenger')
  const getPassengers = useCallback(() => {
    return profiles.filter(p => p.role === 'passenger');
  }, [profiles]);

  // Obtenir les admins
  const getAdmins = useCallback(() => {
    return profiles.filter(p => p.role === 'admin');
  }, [profiles]);

  // Obtenir les statistiques
  const getStats = useCallback(() => {
    const completedRides = rides.filter(r => r.status === 'completed');
    const totalRevenue = completedRides.reduce((sum, ride) => sum + (ride.estimatedPrice || 0), 0);
    const activeDrivers = drivers.filter(d => d.is_available && d.status === 'approved');
    const totalPassengers = profiles.filter(p => p.role === 'passenger').length;

    return {
      totalRevenue,
      totalRides: rides.length,
      completedRides: completedRides.length,
      activeDrivers: activeDrivers.length,
      totalDrivers: drivers.length,
      totalPassengers,
      pendingDrivers: drivers.filter(d => d.status === 'pending').length,
    };
  }, [rides, drivers, profiles]);

  // Obtenir le véhicule d'un conducteur
  const getDriverVehicle = useCallback(async (driverId: string) => {
    return await vehicleService.getVehicleByDriverId(driverId);
  }, []);

  // Obtenir le profil d'un conducteur
  const getDriverProfile = useCallback((userId: string) => {
    return profiles.find(p => p.id === userId);
  }, [profiles]);

  return {
    // Données
    profiles,
    drivers,
    vehicles,
    rides,
    promoCodes,
    settings,
    
    // États
    loading,
    error,
    showRLSFixModal,
    setShowRLSFixModal,
    
    // Fonctions utilitaires
    refresh,
    getPassengers,
    getAdmins,
    getStats,
    getDriverVehicle,
    getDriverProfile,
    
    // Services pour les mutations
    profileService,
    driverService,
    vehicleService,
    rideService,
    promoCodeService,
    settingService,
  };
}
