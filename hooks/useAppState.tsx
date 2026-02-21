import { useState, createContext, useContext, ReactNode, useMemo, useCallback, useEffect } from 'react';
import { AppState, User, Driver, Ride, Location, PromoCode, MarketingCampaign } from '../types';
import { supabase } from '../lib/supabase';
import { useSettings, type AppSettings } from './useSettings';
import { notifyConfirmationCode } from '../lib/sms-service';

const initialState: AppState = {
  currentUser: null,
  currentDriver: null,
  currentRide: null,
  isAdmin: false,
  currentView: null,
  currentScreen: '',
  policyAccepted: false,
  language: 'fr',
  systemSettings: {
    exchangeRate: 2850,
    postpaidInterestRate: 15,
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true
  }
};

interface AppContextType {
  state: AppState;
  setCurrentUser: (user: User | null) => void;
  updateUser?: (user: User | null) => void;
  setCurrentDriver: (driver: Driver | null) => void;
  setCurrentRide: (ride: Ride | null) => void;
  setCurrentView: (view: 'passenger' | 'driver' | 'admin' | null) => void;
  setCurrentScreen: (screen: string) => void;
  setIsAdmin: (isAdmin: boolean) => void;
  setPolicyAccepted: (accepted: boolean) => void;
  setLanguage: (language: 'fr' | 'en') => void;
  setPickup?: (pickup: Location | null) => void;
  setDestination?: (destination: Location | null) => void;
  updatePickup?: (pickup: Location | null) => void;
  updateDestination?: (destination: Location | null) => void;
  setPickupInstructions?: (instructions: string) => void;
  drivers: Driver[];
  rides: Ride[];
  passengers: User[];
  promoCodes: PromoCode[];
  campaigns: MarketingCampaign[];
  updateDriver: (driverId: string, updates: Partial<Driver>) => void;
  addDriver: (driver: Omit<Driver, 'id'>) => string;
  createRide: (ride: Omit<Ride, 'createdAt'> | Omit<Ride, 'id' | 'createdAt'>) => void;
  updateRide: (rideId: string, updates: Partial<Ride>) => void;
  clearCurrentRide?: () => void;
  generateConfirmationCode?: () => string;
  getHourlyRate?: (vehicleType: 'smart_standard' | 'smart_confort' | 'smart_plus') => number;
  addNotification?: (type: 'driver_cancel' | 'driver_refuse', driverId: string, rideId: string) => void;
  validatePromoCode?: (code: string, rideAmount: number) => PromoCode | null;
  addPromoCode?: (promoCode: Omit<PromoCode, 'id' | 'usedCount'>) => string;
  updatePromoCode?: (promoId: string, updates: Partial<PromoCode>) => void;
  addCampaign?: (campaign: Omit<MarketingCampaign, 'id' | 'createdAt'>) => string;
  updateCampaign?: (campaignId: string, updates: Partial<MarketingCampaign>) => void;
  calculateDistance?: (pickup: Location, destination: Location) => number;
  updateSystemSettings?: (updates: Partial<AppState['systemSettings']>) => void;
  updateAdminSettings?: (updates: Partial<AppState['adminSettings']>) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => {
    let policyAccepted = false;
    let savedSettings = initialState.systemSettings;
    let savedUser = null;
    let savedDriver = null;
    let savedRide = null;  // ✅ AJOUT
    let savedView = null;
    let savedScreen = '';
    let savedIsAdmin = false;
    let savedPickup = null;  // 🆕 AJOUT
    let savedDestination = null;  // 🆕 AJOUT
    let savedPickupInstructions = '';  // 🆕 AJOUT
    
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        policyAccepted = localStorage.getItem('smartcab_policy_accepted') === 'true';
        
        const savedSettingsStr = localStorage.getItem('smartcab_system_settings');
        if (savedSettingsStr) {
          savedSettings = JSON.parse(savedSettingsStr);
        }
        
        const savedUserStr = localStorage.getItem('smartcab_current_user');
        if (savedUserStr) {
          savedUser = JSON.parse(savedUserStr);
        }
        
        const savedDriverStr = localStorage.getItem('smartcab_current_driver');
        if (savedDriverStr) {
          savedDriver = JSON.parse(savedDriverStr);
        }
        
        // ✅ AJOUT : Charger currentRide depuis localStorage
        const savedRideStr = localStorage.getItem('smartcab_current_ride');
        if (savedRideStr) {
          savedRide = JSON.parse(savedRideStr);
          console.log('✅ currentRide chargé depuis localStorage:', savedRide);
        }
        
        // 🆕 AJOUT : Charger pickup depuis localStorage
        const savedPickupStr = localStorage.getItem('smartcab_pickup');
        if (savedPickupStr) {
          savedPickup = JSON.parse(savedPickupStr);
          console.log('✅ pickup chargé depuis localStorage:', savedPickup);
        }
        
        // 🆕 AJOUT : Charger destination depuis localStorage
        const savedDestinationStr = localStorage.getItem('smartcab_destination');
        if (savedDestinationStr) {
          savedDestination = JSON.parse(savedDestinationStr);
          console.log('✅ destination chargé depuis localStorage:', savedDestination);
        }
        
        // 🆕 AJOUT : Charger pickupInstructions depuis localStorage
        const savedPickupInstructionsStr = localStorage.getItem('smartcab_pickup_instructions');
        if (savedPickupInstructionsStr) {
          savedPickupInstructions = savedPickupInstructionsStr;
          console.log('✅ pickupInstructions chargé depuis localStorage:', savedPickupInstructions);
        }
        
        const savedViewStr = localStorage.getItem('smartcab_current_view');
        if (savedViewStr) {
          savedView = savedViewStr;
        }
        
        const savedScreenStr = localStorage.getItem('smartcab_current_screen');
        if (savedScreenStr) {
          savedScreen = savedScreenStr;
        }
        
        const savedIsAdminStr = localStorage.getItem('smartcab_is_admin');
        if (savedIsAdminStr) {
          savedIsAdmin = savedIsAdminStr === 'true';
        }
      }
    } catch (error) {
      console.warn('Erreur lors du chargement depuis localStorage:', error);
    }
    
    return {
      ...initialState,
      policyAccepted,
      systemSettings: savedSettings,
      currentUser: savedUser,
      currentDriver: savedDriver,
      currentRide: savedRide,  // ✅ AJOUT
      pickup: savedPickup,  // 🆕 AJOUT
      destination: savedDestination,  // 🆕 AJOUT
      pickupInstructions: savedPickupInstructions,  // 🆕 AJOUT
      currentView: savedView as any,
      currentScreen: savedScreen,
      isAdmin: savedIsAdmin
    };
  });

  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [rides, setRides] = useState<Ride[]>([]);
  const [passengers, setPassengers] = useState<User[]>([]);
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.setItem('smartcab_policy_accepted', state.policyAccepted.toString());
        if (state.systemSettings) {
          localStorage.setItem('smartcab_system_settings', JSON.stringify(state.systemSettings));
        }
        if (state.currentUser) {
          localStorage.setItem('smartcab_current_user', JSON.stringify(state.currentUser));
        } else {
          localStorage.removeItem('smartcab_current_user');
        }
        if (state.currentDriver) {
          localStorage.setItem('smartcab_current_driver', JSON.stringify(state.currentDriver));
        } else {
          localStorage.removeItem('smartcab_current_driver');
        }
        // ✅ AJOUT : Sauvegarder currentRide dans localStorage
        if (state.currentRide) {
          localStorage.setItem('smartcab_current_ride', JSON.stringify(state.currentRide));
        } else {
          localStorage.removeItem('smartcab_current_ride');
        }
        // 🆕 AJOUT : Sauvegarder pickup dans localStorage
        if (state.pickup) {
          localStorage.setItem('smartcab_pickup', JSON.stringify(state.pickup));
        } else {
          localStorage.removeItem('smartcab_pickup');
        }
        // 🆕 AJOUT : Sauvegarder destination dans localStorage
        if (state.destination) {
          localStorage.setItem('smartcab_destination', JSON.stringify(state.destination));
        } else {
          localStorage.removeItem('smartcab_destination');
        }
        // 🆕 AJOUT : Sauvegarder pickupInstructions dans localStorage
        if (state.pickupInstructions) {
          localStorage.setItem('smartcab_pickup_instructions', state.pickupInstructions);
        } else {
          localStorage.removeItem('smartcab_pickup_instructions');
        }
        if (state.currentView) {
          localStorage.setItem('smartcab_current_view', state.currentView);
        } else {
          localStorage.removeItem('smartcab_current_view');
        }
        localStorage.setItem('smartcab_current_screen', state.currentScreen);
        localStorage.setItem('smartcab_is_admin', state.isAdmin.toString());
      } catch (error) {
        console.warn('Erreur lors de la sauvegarde dans localStorage:', error);
      }
    }
  }, [state]);

  const setCurrentUser = useCallback((user: User | null) => {
    setState(prev => ({ ...prev, currentUser: user }));
  }, []);

  const setCurrentDriver = useCallback((driver: Driver | null) => {
    setState(prev => ({ ...prev, currentDriver: driver }));
  }, []);

  const setCurrentRide = useCallback((ride: Ride | null) => {
    setState(prev => ({ ...prev, currentRide: ride }));
  }, []);

  const setCurrentView = useCallback((view: 'passenger' | 'driver' | 'admin' | null) => {
    setState(prev => ({ ...prev, currentView: view }));
  }, []);

  const setCurrentScreen = useCallback((screen: string) => {
    console.log('🔄 setCurrentScreen appelé avec:', screen);
    console.log('📍 Ancien currentScreen:', state.currentScreen);
    setState(prev => {
      const newState = { ...prev, currentScreen: screen };
      console.log('✅ Nouveau state.currentScreen:', newState.currentScreen);
      return newState;
    });
  }, [state.currentScreen]);

  const setIsAdmin = useCallback((isAdmin: boolean) => {
    setState(prev => ({ ...prev, isAdmin }));
  }, []);

  const setPolicyAccepted = useCallback((accepted: boolean) => {
    setState(prev => ({ ...prev, policyAccepted: accepted }));
  }, []);

  const setLanguage = useCallback((language: 'fr' | 'en') => {
    setState(prev => ({ ...prev, language }));
  }, []);

  const setPickup = useCallback((pickup: Location | null) => {
    setState(prev => ({ ...prev, pickup }));
  }, []);

  const setDestination = useCallback((destination: Location | null) => {
    setState(prev => ({ ...prev, destination }));
  }, []);

  const updatePickup = useCallback((pickup: Location | null) => {
    setState(prev => ({ ...prev, pickup }));
  }, []);

  const updateDestination = useCallback((destination: Location | null) => {
    setState(prev => ({ ...prev, destination }));
  }, []);

  const setPickupInstructions = useCallback((instructions: string) => {
    setState(prev => ({ ...prev, pickupInstructions: instructions }));
  }, []);

  const updateDriver = useCallback((driverId: string, updates: Partial<Driver>) => {
    setDrivers(prev => prev.map(d => d.id === driverId ? { ...d, ...updates } : d));
    // ✅ Mettre à jour aussi currentDriver si c'est le conducteur connecté
    setState(prev => {
      if (prev.currentDriver?.id === driverId) {
        return {
          ...prev,
          currentDriver: { ...prev.currentDriver, ...updates }
        };
      }
      return prev;
    });
  }, []);

  const addDriver = useCallback((driver: Omit<Driver, 'id'>) => {
    const newDriver = { ...driver, id: `driver-${Date.now()}` } as Driver;
    setDrivers(prev => [...prev, newDriver]);
    return newDriver.id;
  }, []);

  const createRide = useCallback((ride: Omit<Ride, 'createdAt'> | Omit<Ride, 'id' | 'createdAt'>) => {
    const newRide = {
      ...ride,
      id: 'id' in ride ? ride.id : `ride-${Date.now()}`,
      createdAt: new Date()
    } as Ride;
    setRides(prev => [...prev, newRide]);
    setState(prev => ({ ...prev, currentRide: newRide }));
  }, []);

  const updateRide = useCallback((rideId: string, updates: Partial<Ride>) => {
    setRides(prev => prev.map(r => r.id === rideId ? { ...r, ...updates } : r));
    setState(prev => {
      if (prev.currentRide?.id === rideId) {
        return { ...prev, currentRide: { ...prev.currentRide, ...updates } };
      }
      return prev;
    });
  }, []);

  const clearCurrentRide = useCallback(() => {
    setState(prev => ({ ...prev, currentRide: null }));
  }, []);

  const generateConfirmationCode = useCallback(() => {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }, []);

  const getHourlyRate = useCallback((vehicleType: 'smart_standard' | 'smart_confort' | 'smart_plus') => {
    const rates = {
      smart_standard: 12000,
      smart_confort: 18000,
      smart_plus: 25000
    };
    return rates[vehicleType] || rates.smart_standard;
  }, []);

  const validatePromoCode = useCallback((code: string, rideAmount: number) => {
    const promo = promoCodes.find(p => p.code === code && p.isActive);
    if (!promo) return null;
    
    const now = new Date();
    if (now < promo.validFrom || now > promo.validTo) return null;
    if (promo.usageLimit && promo.usedCount >= promo.usageLimit) return null;
    if (promo.minRideAmount && rideAmount < promo.minRideAmount) return null;
    
    return promo;
  }, [promoCodes]);

  const addPromoCode = useCallback((promoCode: Omit<PromoCode, 'id' | 'usedCount'>) => {
    const newPromo = { ...promoCode, id: `promo-${Date.now()}`, usedCount: 0 };
    setPromoCodes(prev => [...prev, newPromo]);
    return newPromo.id;
  }, []);

  const updatePromoCode = useCallback((promoId: string, updates: Partial<PromoCode>) => {
    setPromoCodes(prev => prev.map(p => p.id === promoId ? { ...p, ...updates } : p));
  }, []);

  const addCampaign = useCallback((campaign: Omit<MarketingCampaign, 'id' | 'createdAt'>) => {
    const newCampaign = { ...campaign, id: `campaign-${Date.now()}`, createdAt: new Date() };
    setCampaigns(prev => [...prev, newCampaign]);
    return newCampaign.id;
  }, []);

  const updateCampaign = useCallback((campaignId: string, updates: Partial<MarketingCampaign>) => {
    setCampaigns(prev => prev.map(c => c.id === campaignId ? { ...c, ...updates } : c));
  }, []);

  const calculateDistance = useCallback((pickup: Location, destination: Location) => {
    const R = 6371;
    const dLat = (destination.lat - pickup.lat) * Math.PI / 180;
    const dLon = (destination.lng - pickup.lng) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(pickup.lat * Math.PI / 180) * Math.cos(destination.lat * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }, []);

  const updateSystemSettings = useCallback((updates: Partial<AppState['systemSettings']>) => {
    setState(prev => ({
      ...prev,
      systemSettings: { ...prev.systemSettings, ...updates } as any
    }));
  }, []);

  const updateAdminSettings = useCallback((updates: Partial<AppState['adminSettings']>) => {
    setState(prev => ({
      ...prev,
      adminSettings: { ...prev.adminSettings, ...updates } as any
    }));
  }, []);

  const value = useMemo(() => ({
    state,
    setCurrentUser,
    updateUser: setCurrentUser,
    setCurrentDriver,
    setCurrentRide,
    setCurrentView,
    setCurrentScreen,
    setIsAdmin,
    setPolicyAccepted,
    setLanguage,
    setPickup,
    setDestination,
    updatePickup,
    updateDestination,
    setPickupInstructions,
    drivers,
    rides,
    passengers,
    promoCodes,
    campaigns,
    updateDriver,
    addDriver,
    createRide,
    updateRide,
    clearCurrentRide,
    generateConfirmationCode,
    getHourlyRate,
    validatePromoCode,
    addPromoCode,
    updatePromoCode,
    addCampaign,
    updateCampaign,
    calculateDistance,
    updateSystemSettings,
    updateAdminSettings
  }), [
    state,
    setCurrentUser,
    setCurrentDriver,
    setCurrentRide,
    setCurrentView,
    setCurrentScreen,
    setIsAdmin,
    setPolicyAccepted,
    setLanguage,
    setPickup,
    setDestination,
    updatePickup,
    updateDestination,
    setPickupInstructions,
    drivers,
    rides,
    passengers,
    promoCodes,
    campaigns,
    updateDriver,
    addDriver,
    createRide,
    updateRide,
    clearCurrentRide,
    generateConfirmationCode,
    getHourlyRate,
    validatePromoCode,
    addPromoCode,
    updatePromoCode,
    addCampaign,
    updateCampaign,
    calculateDistance,
    updateSystemSettings,
    updateAdminSettings
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppState() {
  const context = useContext(AppContext);
  
  if (context === undefined) {
    throw new Error('useAppState must be used within AppProvider');
  }
  return context;
}