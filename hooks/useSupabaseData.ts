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
  isApproved?: boolean;
  is_approved?: boolean;
  total_rides?: number;
  total_earnings?: number;
  vehicle?: {
    make?: string;
    model?: string;
    license_plate?: string;
    color?: string;
    category?: string;
  };
  vehicleType?: string;
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

export function useSupabaseData() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [passengers, setPassengers] = useState<any[]>([]); // ✅ AJOUTÉ: State séparé pour les passagers du KV
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
  const abortControllerRef = useRef<AbortController | null>(null);

  // Fonction pour récupérer les drivers depuis le KV store
  const fetchDriversFromKV = useCallback(async (): Promise<any[]> => {
    const controller = new AbortController();
    try {
      console.log('🔄 Chargement des conducteurs depuis le KV store...');
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/drivers`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          signal: controller.signal,
        }
      );

      if (!response.ok) {
        console.error('❌ Serveur backend non accessible:', response.status, response.statusText);
        return [];
      }

      const data = await response.json();
      console.log('✅ Drivers chargés depuis KV store:', data.drivers?.length || 0);
      return data.drivers || [];
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('⚠️ Fetch drivers annulé');
        return [];
      }
      console.error('❌ Erreur fetch drivers KV:', error);
      return [];
    }
  }, []);

  const fetchPassengersFromKV = useCallback(async (): Promise<any[]> => {
    const controller = new AbortController();
    try {
      console.log('🔄 Chargement des passagers depuis le KV store...');
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/passengers`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          signal: controller.signal,
        }
      );

      if (!response.ok) {
        console.error('❌ Serveur backend non accessible:', response.status, response.statusText);
        return [];
      }

      const data = await response.json();
      console.log('✅ Passagers chargés depuis KV store:', data.passengers?.length || 0);
      return data.passengers || [];
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('⚠️ Fetch passengers annulé');
        return [];
      }
      console.error('❌ Erreur fetch passengers KV:', error);
      return [];
    }
  }, []);

  // Fonction pour récupérer les courses depuis le KV store
  const fetchRidesFromKV = useCallback(async (): Promise<Ride[]> => {
    const controller = new AbortController();
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/admin/rides?limit=1000`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          },
          signal: controller.signal,
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
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('⚠️ Fetch rides annulé');
        return [];
      }
      console.error('❌ Erreur récupération courses depuis KV:', error);
      return [];
    }
  }, []);

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
      // IMPORTANT: Les drivers et passagers sont chargés depuis le KV store via l'API serveur
      const [profilesData, driversData, vehiclesData, ridesData, promoCodesData, settingsData] = await Promise.all([
        createTimeoutPromise(fetchPassengersFromKV(), 0, 'Passengers'), // ✅ CHANGÉ: Charger depuis KV au lieu de Postgres
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
      setPassengers(profilesData); // ✅ AJOUTÉ: Assigner les passagers
      setRawDrivers(driversData);
      setVehicles(vehiclesData);
      setRawRides(ridesData);
      setPromoCodes(promoCodesData);
      setSettings(settingsData);

      // ✅ DEBUG: Logger les données avant enrichissement
      console.log('🔍 DEBUG - Données brutes reçues:');
      console.log('  - driversData:', driversData.length, driversData);
      console.log('  - profilesData:', profilesData.length);

      // Enrichir les drivers avec les profils et véhicules
      // NOTE: Les drivers du KV store ont déjà les infos du véhicule intégrées
      const enrichedDrivers: EnrichedDriver[] = driversData.map(driver => {
        // ✅ FIX: Ne pas chercher profile car driver du KV a déjà full_name, email, phone
        
        // ✅ FIX: Normaliser isApproved (peut être is_approved ou isApproved)
        const isApproved = driver.isApproved !== undefined 
          ? driver.isApproved 
          : driver.is_approved !== undefined 
            ? driver.is_approved 
            : false;

        // ✅ FIX : Calculer les stats depuis les courses complétées si le KV les a à 0
        const completedRides = ridesData.filter((r: any) =>
          (r.driver_id === driver.id || r.driverId === driver.id) &&
          r.status === 'completed'
        );
        const computedRides    = completedRides.length;
        const computedEarnings = completedRides.reduce(
          (sum: number, r: any) => sum + (r.total_amount || r.price || r.fare || r.amount || 0), 0
        );

        return {
          ...driver,
          // ✅ Les infos sont déjà dans driver du KV store
          full_name: driver.full_name || 'Conducteur inconnu',
          email: driver.email || '',
          phone: driver.phone,
          // ✅ Normaliser le champ isApproved
          isApproved: isApproved,
          is_approved: isApproved, // ✅ Compatibilité
          // ✅ Infos véhicule
          vehicle_make: driver.vehicle?.make || '',
          vehicle_model: driver.vehicle?.model || '',
          vehicle_plate: driver.vehicle?.license_plate || '',
          vehicle_color: driver.vehicle?.color || '',
          vehicle_category: driver.vehicle?.category || driver.vehicleType || 'standard',
          // ✅ Stats réelles : priorité KV, sinon calculé depuis les courses
          total_rides:    (driver.total_rides    > 0) ? driver.total_rides    : computedRides,
          total_earnings: (driver.total_earnings > 0) ? driver.total_earnings : computedEarnings,
        };
      });

      // ✅ DEBUG: Logger les drivers enrichis
      console.log('🔍 DEBUG - Drivers enrichis:', enrichedDrivers.length, enrichedDrivers);

      setDrivers(enrichedDrivers);
      
      // ✅ DEBUG: Vérifier après setDrivers
      console.log('✅ setDrivers appelé avec', enrichedDrivers.length, 'conducteurs');

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
    
    // Créer un AbortController pour ce chargement
    const controller = new AbortController();
    abortControllerRef.current = controller;
    
    // Timeout augmenté pour éviter les erreurs
    const timeoutId = setTimeout(() => {
      if (isLoadingRef.current) {
        controller.abort(); // Annuler toutes les requêtes en cours
        isLoadingRef.current = false;
        setLoading(false);
        // Ne pas définir d'erreur si c'est juste un timeout - mode dégradé
        hasLoadedRef.current = true; // Marquer comme chargé pour éviter les retry
      }
    }, 20000); // Timeout augmenté à 20 secondes
    
    loadAllData().finally(() => {
      clearTimeout(timeoutId);
    });
    
    // Cleanup : annuler toutes les requêtes en cours
    return () => {
      console.log('🧹 Cleanup: Annulation des requêtes en cours');
      clearTimeout(timeoutId);
      controller.abort();
      abortControllerRef.current = null;
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
  }, []); // ✅ FIX: Pas de dépendances, on appelle loadAllData directement

  // Obtenir les passagers (profils avec role = 'passenger')
  const getPassengers = useCallback(() => {
    // ✅ FIX: Retourner directement les passagers du KV store
    return passengers;
  }, [passengers]); // ✅ Dépendance corrigée

  // Obtenir les admins
  const getAdmins = useCallback(() => {
    return profiles.filter(p => p.role === 'admin');
  }, [profiles]);

  // Obtenir les statistiques
  const getStats = useCallback(() => {
    const completedRides = rides.filter(r => r.status === 'completed');
    const totalRevenue = completedRides.reduce((sum, ride) => sum + (ride.estimatedPrice || 0), 0);
    const activeDrivers = drivers.filter(d => d.is_available && d.status === 'approved');
    const totalPassengers = passengers.length; // ✅ FIX: Utiliser passengers.length

    return {
      totalRevenue,
      totalRides: rides.length,
      completedRides: completedRides.length,
      activeDrivers: activeDrivers.length,
      totalDrivers: drivers.length,
      totalPassengers,
      pendingDrivers: drivers.filter(d => d.status === 'pending').length,
    };
  }, [rides, drivers, passengers]); // ✅ Dépendance corrigée

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
