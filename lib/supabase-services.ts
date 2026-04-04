import { supabase } from './supabase';
import type { Profile, Driver, Vehicle, Ride, Document, Rating, PromoCode, Transaction, Notification, Setting } from './supabase';
import { projectId, publicAnonKey } from '../utils/supabase/info';

// ============================================
// HELPER: QUERY WITH TIMEOUT
// ============================================

async function queryWithTimeout<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  timeoutMs: number = 30000, // Augmenté à 30 secondes
  errorMessage: string = 'Query timeout'
): Promise<{ data: T | null; error: any }> {
  // Ne pas utiliser de timeout du tout - laisser la requête se terminer naturellement
  // Ceci évite les erreurs de timeout prématurées dans Figma Make
  try {
    const result = await queryFn();
    return result;
  } catch (error: any) {
    console.debug(`⚠️ ${errorMessage}:`, error.message || 'Unknown error');
    // Retourner une structure d'erreur cohérente
    return { 
      data: null, 
      error: {
        message: error?.message || 'FetchError: undefined',
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
      }
    };
  }
}

// ============================================
// HELPER: FORMAT ERROR
// ============================================

function formatError(error: any, context: string = 'Error') {
  return {
    context,
    message: error?.message || 'Unknown error',
    details: error?.details || '',
    hint: error?.hint || '',
    code: error?.code || '',
    timestamp: new Date().toISOString()
  };
}

function shouldLogError(error: any): boolean {
  // Ne pas logger les erreurs réseau et de connexion (normal si Supabase pas configuré)
  if (error?.message?.includes('timeout')) return false;
  if (error?.message?.includes('fetch')) return false;
  if (error?.message?.includes('Failed to fetch')) return false;
  if (error?.message?.includes('FetchError')) return false;
  if (error?.message?.includes('aborted')) return false;
  if (error?.message?.includes('undefined')) return false;
  if (error?.message?.includes('Network')) return false;
  if (error?.message?.includes('network')) return false;
  if (error?.name === 'FetchError') return false;
  if (error?.name === 'AbortError') return false;
  
  return true;
}

// Helper pour logger les erreurs de manière intelligente
function logIfRealError(context: string, error: any): void {
  if (shouldLogError(error)) {
    console.error(`❌ ${context}:`, error);
  }
  // Sinon, silencieux (erreur réseau normale)
}

// ============================================
// PROFILES
// ============================================

export const profileService = {
  async getProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await queryWithTimeout(
      () => supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle(),
      2000,
      'Profile fetch'
    );
    
    if (error) {
      return null;
    }
    
    return data;
  },

  async createProfile(profile: Omit<Profile, 'created_at' | 'updated_at'>): Promise<Profile | null> {
    try {
      console.log('🔍 Création profil pour ID:', profile.id);
      
      // Vérifier d'abord si le profil existe déjà
      const existing = await this.getProfile(profile.id);
      
      if (existing) {
        console.log('✅ Profil existe déjà, retour immédiat');
        return existing;
      }
      
      console.log('🆕 Profil non trouvé, création...');
      
      // Tenter la création avec upsert pour éviter les doublons
      const { data, error } = await supabase
        .from('profiles')
        .upsert([profile], { 
          onConflict: 'id',
          ignoreDuplicates: false 
        })
        .select()
        .maybeSingle();
      
      if (error) {
        console.error('❌ Erreur lors de la création:', error);
        
        // Si erreur de duplication, récupérer le profil existant
        if (error.code === '23505') {
          console.log('🔄 Clé dupliquée détectée, récupération du profil...');
          const retryProfile = await this.getProfile(profile.id);
          if (retryProfile) {
            console.log('✅ Profil récupéré après duplication');
            return retryProfile;
          }
        }
        
        throw error;
      }
      
      if (!data) {
        console.error('❌ Aucune donnée retournée après création');
        const retryProfile = await this.getProfile(profile.id);
        if (retryProfile) {
          return retryProfile;
        }
        throw new Error('Échec création profil - aucune donnée retournée');
      }
      
      console.log('✅ Profil créé avec succès');
      return data;
      
    } catch (error: any) {
      console.error('❌ Erreur fatale création profil:', error);
      
      // Dernière tentative: récupérer le profil s'il existe
      if (profile.id) {
        const lastTry = await this.getProfile(profile.id);
        if (lastTry) {
          console.log('✅ Profil récupéré en dernier recours');
          return lastTry;
        }
      }
      
      throw error;
    }
  },

  async updateProfile(userId: string, updates: Partial<Profile>): Promise<Profile | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .maybeSingle();
      
      if (error) {
        console.error('❌ Erreur mise à jour profil:', error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('❌ Erreur fatale mise à jour:', error);
      return null;
    }
  },

  async getAllProfiles(): Promise<Profile[]> {
    try {
      const { data, error } = await queryWithTimeout(
        () => supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false }),
        5000,
        'Profiles fetch'
      );
      
      if (error) {
        // Silencieux si c'est juste un problème de connexion
        return [];
      }
      return data || [];
    } catch (err) {
      return [];
    }
  },

  async isAdmin(userId: string): Promise<boolean> {
    const profile = await this.getProfile(userId);
    return profile?.role === 'admin';
  },
};

// ============================================
// DRIVERS
// ============================================

export const driverService = {
  async getDriverByUserId(userId: string): Promise<Driver | null> {
    const { data, error } = await supabase
      .from('drivers')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (error) {
      if (shouldLogError(error)) {
        console.error('Error fetching driver:', formatError(error, 'getDriverByUserId'));
      }
      return null;
    }
    return data;
  },

  async getAllDrivers(): Promise<Driver[]> {
    const { data, error } = await queryWithTimeout(
      () => supabase
        .from('drivers')
        .select('*')
        .order('created_at', { ascending: false }),
      3000,
      'Drivers fetch'
    );
    
    if (error) {
      // Silencieux - timeout normal si pas configuré
      return [];
    }
    return data || [];
  },

  async getAvailableDrivers(): Promise<Driver[]> {
    const { data, error } = await supabase
      .from('drivers')
      .select('*')
      .eq('is_available', true)
      .eq('status', 'approved')
      .order('rating', { ascending: false });
    
    if (error) {
      logIfRealError('Error fetching available drivers', error);
      return [];
    }
    return data || [];
  },

  async createDriver(driver: Omit<Driver, 'id' | 'created_at' | 'updated_at'>): Promise<Driver | null> {
    const { data, error } = await supabase
      .from('drivers')
      .insert([driver])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating driver:', error);
      return null;
    }
    return data;
  },

  async updateDriver(driverId: string, updates: Partial<Driver>): Promise<Driver | null> {
    // Utiliser l'API KV store au lieu de la table Supabase
    try {
      console.log('🔥🔥��� ========== FRONTEND: DÉBUT UPDATE DRIVER ==========');
      console.log('🔄 Updating driver in KV store:', driverId);
      console.log('📝 Updates:', JSON.stringify(updates, null, 2));
      
      const url = `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/drivers/${driverId}`;
      console.log('🌐 URL complète:', url);
      console.log('🔑 Authorization:', `Bearer ${publicAnonKey.substring(0, 20)}...`);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify(updates)
      });
      
      console.log('📡 Response status:', response.status, response.statusText);
      console.log('📡 Response ok:', response.ok);
      
      const responseText = await response.text();
      console.log('📄 Response text (raw):', responseText);
      
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error('❌ Erreur parsing JSON:', parseError);
        console.error('   Raw response:', responseText);
        return null;
      }
      
      console.log('📋 Result parsed:', JSON.stringify(result, null, 2));
      
      if (!result.success) {
        console.error('❌ Error updating driver:', result.error);
        console.log('🔥🔥🔥 ========== FRONTEND: FIN UPDATE DRIVER (ERREUR) ==========');
        return null;
      }
      
      console.log('✅ Driver updated successfully in KV store');
      console.log('📊 Updated status:', result.driver?.status);
      console.log('📊 Full updated driver:', JSON.stringify(result.driver, null, 2));
      console.log('🔥🔥🔥 ========== FRONTEND: FIN UPDATE DRIVER (SUCCÈS) ==========');
      return result.driver;
      
    } catch (error) {
      console.error('🔥🔥🔥 ========== FRONTEND: FIN UPDATE DRIVER (EXCEPTION) ==========');
      console.error('❌ Error updating driver:', error);
      console.error('❌ Error type:', error instanceof Error ? error.constructor.name : typeof error);
      console.error('❌ Error message:', error instanceof Error ? error.message : String(error));
      console.error('❌ Error stack:', error instanceof Error ? error.stack : 'N/A');
      return null;
    }
  },

  async updateLocation(driverId: string, lat: number, lng: number): Promise<boolean> {
    const { error } = await supabase
      .from('drivers')
      .update({ 
        current_lat: lat, 
        current_lng: lng,
        updated_at: new Date().toISOString()
      })
      .eq('id', driverId);
    
    if (error) {
      console.error('Error updating driver location:', error);
      return false;
    }
    return true;
  },

  async toggleAvailability(driverId: string, isAvailable: boolean): Promise<boolean> {
    const { error } = await supabase
      .from('drivers')
      .update({ is_available: isAvailable })
      .eq('id', driverId);
    
    if (error) {
      console.error('Error toggling driver availability:', error);
      return false;
    }
    return true;
  },
};

// ============================================
// RIDES
// ============================================

export const rideService = {
  async getAllRides(): Promise<Ride[]> {
    const { data, error } = await queryWithTimeout(
      () => supabase
        .from('rides')
        .select('*')
        .order('created_at', { ascending: false }),
      3000,
      'Rides fetch'
    );
    
    if (error) {
      // Silencieux - timeout normal si pas configuré
      return [];
    }
    return data || [];
  },

  async getRideById(rideId: string): Promise<Ride | null> {
    const { data, error } = await supabase
      .from('rides')
      .select('*')
      .eq('id', rideId)
      .single();
    
    if (error) {
      console.error('Error fetching ride:', error);
      return null;
    }
    return data;
  },

  async createRide(ride: Omit<Ride, 'id' | 'created_at' | 'updated_at'>): Promise<Ride | null> {
    const { data, error } = await supabase
      .from('rides')
      .insert([ride])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating ride:', error);
      return null;
    }
    return data;
  },

  async updateRide(rideId: string, updates: Partial<Ride>): Promise<Ride | null> {
    const { data, error } = await supabase
      .from('rides')
      .update(updates)
      .eq('id', rideId)
      .select()
      .maybeSingle();
    
    if (error) {
      console.error('Error updating ride:', error);
      return null;
    }
    
    if (!data) {
      console.error('Error updating ride: No ride found with id:', rideId);
      return null;
    }
    
    return data;
  },

  async getRidesByPassenger(passengerId: string): Promise<Ride[]> {
    const { data, error } = await supabase
      .from('rides')
      .select('*')
      .eq('passenger_id', passengerId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching passenger rides:', error);
      return [];
    }
    return data || [];
  },

  async getRidesByDriver(driverId: string): Promise<Ride[]> {
    const { data, error } = await supabase
      .from('rides')
      .select('*')
      .eq('driver_id', driverId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching driver rides:', error);
      return [];
    }
    return data || [];
  },
};

// ============================================
// VEHICLES
// ============================================

export const vehicleService = {
  async getVehicleByDriverId(driverId: string): Promise<Vehicle | null> {
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('driver_id', driverId)
      .maybeSingle();
    
    if (error) {
      console.error('Error fetching vehicle:', error);
      return null;
    }
    return data;
  },

  async getAllVehicles(): Promise<Vehicle[]> {
    try {
      const { data, error } = await queryWithTimeout(
        () => supabase
          .from('vehicles')
          .select('*')
          .order('created_at', { ascending: false }),
        8000, // Augmenté à 8 secondes
        'Vehicles fetch'
      );
      
      if (error) {
        // Ne logger que si c'est une vraie erreur (pas timeout/fetch)
        const isConnectionError = 
          error?.message?.includes('timeout') || 
          error?.message?.includes('fetch') ||
          error?.message?.includes('FetchError') ||
          error?.message?.includes('undefined') ||
          error?.message?.includes('aborted');
        
        if (!isConnectionError) {
          console.error('Error fetching vehicles:', {
            message: error?.message || 'Unknown error',
            details: error?.details || '',
            hint: error?.hint || '',
            code: error?.code || ''
          });
        }
        // Mode démo silencieux si erreur de connexion
        return [];
      }
      return data || [];
    } catch (err) {
      // Mode démo silencieux
      return [];
    }
  },

  async createVehicle(vehicle: Omit<Vehicle, 'id' | 'created_at' | 'updated_at'>): Promise<Vehicle | null> {
    const { data, error } = await supabase
      .from('vehicles')
      .insert([vehicle])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating vehicle:', error);
      return null;
    }
    return data;
  },

  async updateVehicle(vehicleId: string, updates: Partial<Vehicle>): Promise<Vehicle | null> {
    const { data, error } = await supabase
      .from('vehicles')
      .update(updates)
      .eq('id', vehicleId)
      .select()
      .maybeSingle();
    
    if (error) {
      console.error('Error updating vehicle:', error);
      return null;
    }
    
    if (!data) {
      console.error('Error updating vehicle: No vehicle found with id:', vehicleId);
      return null;
    }
    
    return data;
  },

  async deleteVehicle(vehicleId: string): Promise<boolean> {
    const { error } = await supabase
      .from('vehicles')
      .delete()
      .eq('id', vehicleId);
    
    if (error) {
      console.error('Error deleting vehicle:', error);
      return false;
    }
    return true;
  },
};

// ============================================
// DOCUMENTS
// ============================================

export const documentService = {
  async getDocumentsByDriverId(driverId: string): Promise<Document[]> {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('driver_id', driverId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching documents:', error);
      return [];
    }
    return data || [];
  },

  async createDocument(document: Omit<Document, 'id' | 'created_at' | 'updated_at'>): Promise<Document | null> {
    const { data, error } = await supabase
      .from('documents')
      .insert([document])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating document:', error);
      return null;
    }
    return data;
  },

  async updateDocumentStatus(documentId: string, status: string): Promise<Document | null> {
    const { data, error } = await supabase
      .from('documents')
      .update({ 
        verification_status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', documentId)
      .select()
      .maybeSingle();
    
    if (error) {
      console.error('Error updating document status:', error);
      return null;
    }
    
    if (!data) {
      console.error('Error updating document status: No document found with id:', documentId);
      return null;
    }
    
    return data;
  },
};

// ============================================
// RATINGS
// ============================================

export const ratingService = {
  async createRating(rating: Omit<Rating, 'id' | 'created_at'>): Promise<Rating | null> {
    const { data, error } = await supabase
      .from('ratings')
      .insert([rating])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating rating:', error);
      return null;
    }
    return data;
  },

  async getRatingsByDriver(driverId: string): Promise<Rating[]> {
    const { data, error } = await supabase
      .from('ratings')
      .select('*')
      .eq('driver_id', driverId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching driver ratings:', error);
      return [];
    }
    return data || [];
  },

  async getRatingsByPassenger(passengerId: string): Promise<Rating[]> {
    const { data, error } = await supabase
      .from('ratings')
      .select('*')
      .eq('passenger_id', passengerId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching passenger ratings:', error);
      return [];
    }
    return data || [];
  },
};

// ============================================
// PROMO CODES
// ============================================

export const promoCodeService = {
  async getAllPromoCodes(): Promise<PromoCode[]> {
    try {
      const { data, error } = await queryWithTimeout(
        () => supabase
          .from('promo_codes')
          .select('*')
          .order('created_at', { ascending: false }),
        5000,
        'Promo codes fetch timeout'
      );
      
      if (error) {
        // Si la table n'existe pas, retourner un tableau vide silencieusement
        if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
          console.log('ℹ️ Table promo_codes non trouvée - retour tableau vide');
          return [];
        }
        // Erreurs de connexion (Failed to fetch, timeout, etc.)
        if (error.message?.includes('fetch') || error.message?.includes('timeout') || error.message?.includes('aborted')) {
          console.log('ℹ️ Promo codes temporairement indisponibles (connexion)');
          return [];
        }
        console.log('ℹ️ Promo codes non disponibles:', error.message);
        return [];
      }
      return data || [];
    } catch (error: any) {
      // Gérer toutes les erreurs inattendues silencieusement
      console.log('ℹ️ Promo codes non disponibles:', error?.message || 'Erreur inconnue');
      return [];
    }
  },

  async getPromoCodeByCode(code: string): Promise<PromoCode | null> {
    const { data, error } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('code', code)
      .eq('is_active', true)
      .maybeSingle();
    
    if (error) {
      console.error('Error fetching promo code:', error);
      return null;
    }
    return data;
  },

  async createPromoCode(promoCode: Omit<PromoCode, 'id' | 'created_at' | 'updated_at'>): Promise<PromoCode | null> {
    const { data, error } = await supabase
      .from('promo_codes')
      .insert([promoCode])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating promo code:', error);
      return null;
    }
    return data;
  },

  async updatePromoCode(promoCodeId: string, updates: Partial<PromoCode>): Promise<PromoCode | null> {
    const { data, error } = await supabase
      .from('promo_codes')
      .update(updates)
      .eq('id', promoCodeId)
      .select()
      .maybeSingle();
    
    if (error) {
      console.error('Error updating promo code:', error);
      return null;
    }
    
    if (!data) {
      console.error('Error updating promo code: No promo code found with id:', promoCodeId);
      return null;
    }
    
    return data;
  },

  async deletePromoCode(promoCodeId: string): Promise<boolean> {
    const { error } = await supabase
      .from('promo_codes')
      .delete()
      .eq('id', promoCodeId);
    
    if (error) {
      console.error('Error deleting promo code:', error);
      return false;
    }
    return true;
  },

  async validatePromoCode(code: string, userId: string): Promise<{ valid: boolean; discount?: number; error?: string }> {
    const promoCode = await this.getPromoCodeByCode(code);
    
    if (!promoCode) {
      return { valid: false, error: 'Code promo invalide' };
    }
    
    // Vérifier la date d'expiration
    if (promoCode.expiry_date && new Date(promoCode.expiry_date) < new Date()) {
      return { valid: false, error: 'Ce code promo a expiré' };
    }
    
    // Vérifier le nombre d'utilisations
    if (promoCode.max_uses && promoCode.current_uses >= promoCode.max_uses) {
      return { valid: false, error: 'Ce code promo a atteint sa limite d\'utilisation' };
    }
    
    return { 
      valid: true, 
      discount: promoCode.discount_type === 'percentage' 
        ? promoCode.discount_value 
        : promoCode.discount_value 
    };
  },
};

// ============================================
// TRANSACTIONS
// ============================================

export const transactionService = {
  async getAllTransactions(): Promise<Transaction[]> {
    const { data, error } = await queryWithTimeout(
      () => supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false }),
      5000,
      'Transactions fetch timeout'
    );
    
    if (error) {
      console.error('Error fetching transactions:', error);
      return [];
    }
    return data || [];
  },

  async getTransactionsByUser(userId: string): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching user transactions:', error);
      return [];
    }
    return data || [];
  },

  async createTransaction(transaction: Omit<Transaction, 'id' | 'created_at'>): Promise<Transaction | null> {
    const { data, error } = await supabase
      .from('transactions')
      .insert([transaction])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating transaction:', error);
      return null;
    }
    return data;
  },

  async updateTransactionStatus(transactionId: string, status: string): Promise<Transaction | null> {
    const { data, error } = await supabase
      .from('transactions')
      .update({ status })
      .eq('id', transactionId)
      .select()
      .maybeSingle();
    
    if (error) {
      console.error('Error updating transaction status:', error);
      return null;
    }
    
    if (!data) {
      console.error('Error updating transaction status: No transaction found with id:', transactionId);
      return null;
    }
    
    return data;
  },
};

// ============================================
// NOTIFICATIONS
// ============================================

export const notificationService = {
  async getNotificationsByUser(userId: string): Promise<Notification[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
    return data || [];
  },

  async createNotification(notification: Omit<Notification, 'id' | 'created_at'>): Promise<Notification | null> {
    const { data, error } = await supabase
      .from('notifications')
      .insert([notification])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating notification:', error);
      return null;
    }
    return data;
  },

  async markAsRead(notificationId: string): Promise<boolean> {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);
    
    if (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
    return true;
  },

  async markAllAsRead(userId: string): Promise<boolean> {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);
    
    if (error) {
      console.error('Error marking all notifications as read:', error);
      return false;
    }
    return true;
  },
};

// ============================================
// SETTINGS
// ============================================

export const settingService = {
  async getAllSettings(): Promise<Setting[]> {
    try {
      const { data, error } = await queryWithTimeout(
        () => supabase
          .from('settings')
          .select('*'),
        3000,
        'Settings fetch'
      );
      
      if (error) {
        // Silencieux - timeout normal si pas configuré
        return [];
      }
      return data || [];
    } catch (err) {
      // ✅ Silencieux - retourner vide sans log d'erreur
      console.debug('⚠️ Erreur lors de la récupération des settings (table peut ne pas exister)');
      return [];
    }
  },

  async getSettingByKey(key: string): Promise<Setting | null> {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('key', key)
        .maybeSingle();
      
      if (error) {
        // Si la table n'existe pas, retourner null sans erreur
        if (error.message && (error.message.includes('does not exist') || error.message.includes('relation'))) {
          return null;
        }
        console.error('Error fetching setting:', error);
        return null;
      }
      return data;
    } catch (err) {
      return null;
    }
  },

  async updateSetting(key: string, value: string): Promise<Setting | null> {
    try {
      const { data, error } = await supabase
        .from('settings')
        .upsert([{ key, value, updated_at: new Date().toISOString() }], {
          onConflict: 'key'
        })
        .select()
        .single();
      
      if (error) {
        if (error.message && (error.message.includes('does not exist') || error.message.includes('relation'))) {
          console.warn('⚠️ Table settings non trouvée. Impossible de mettre à jour.');
          return null;
        }
        console.error('Error updating setting:', error);
        return null;
      }
      return data;
    } catch (err) {
      console.warn('⚠️ Erreur lors de la mise à jour du setting');
      return null;
    }
  },

  async createSetting(setting: Omit<Setting, 'id' | 'created_at' | 'updated_at'>): Promise<Setting | null> {
    const { data, error } = await supabase
      .from('settings')
      .insert([setting])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating setting:', error);
      return null;
    }
    return data;
  },
};

// Export default object with all services
export default {
  profileService,
  driverService,
  rideService,
  vehicleService,
  documentService,
  ratingService,
  promoCodeService,
  transactionService,
  notificationService,
  settingService,
};
