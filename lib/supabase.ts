// ============================================
// CLIENT SUPABASE - NE PAS UTILISER DIRECTEMENT
// Utiliser plutôt les appels API vers le serveur
// ============================================

/**
 * ⚠️ ATTENTION : Ce fichier est conservé pour la compatibilité
 * mais ne devrait PAS être utilisé directement dans l'application.
 * 
 * Utilisez plutôt les appels API vers le serveur backend :
 * fetch(`https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/...`)
 */

import { projectId, publicAnonKey } from '../utils/supabase/info';

const supabaseUrl = `https://${projectId}.supabase.co`;
const supabaseAnonKey = publicAnonKey;

// ✅ CLIENT SUPABASE SIMPLIFIÉ - Sans dépendance externe
// Fournit uniquement les méthodes d'authentification nécessaires
export const supabase = {
  auth: {
    signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
      const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
        },
        body: JSON.stringify({ email, password }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        return { data: { user: null, session: null }, error };
      }
      
      return { data: await response.json(), error: null };
    },
    
    signUp: async ({ email, password, options }: { email: string; password: string; options?: any }) => {
      const response = await fetch(`${supabaseUrl}/auth/v1/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
        },
        body: JSON.stringify({ email, password, data: options?.data }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        return { data: { user: null, session: null }, error };
      }
      
      return { data: await response.json(), error: null };
    },
    
    signOut: async () => {
      // Nettoyer le localStorage
      localStorage.removeItem('supabase.auth.token');
      return { error: null };
    },
    
    getSession: async () => {
      const token = localStorage.getItem('supabase.auth.token');
      if (!token) {
        return { data: { session: null }, error: null };
      }
      
      try {
        const session = JSON.parse(token);
        return { data: { session }, error: null };
      } catch {
        return { data: { session: null }, error: null };
      }
    },
    
    setSession: async (session: any) => {
      localStorage.setItem('supabase.auth.token', JSON.stringify(session));
      return { data: { session }, error: null };
    },
    
    getUser: async (token?: string) => {
      const accessToken = token || JSON.parse(localStorage.getItem('supabase.auth.token') || '{}').access_token;
      
      if (!accessToken) {
        return { data: { user: null }, error: { message: 'No token' } };
      }
      
      const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'apikey': supabaseAnonKey,
        },
      });
      
      if (!response.ok) {
        const error = await response.json();
        return { data: { user: null }, error };
      }
      
      return { data: { user: await response.json() }, error: null };
    },
    
    resetPasswordForEmail: async (email: string) => {
      const response = await fetch(`${supabaseUrl}/auth/v1/recover`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
        },
        body: JSON.stringify({ email }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        return { data: null, error };
      }
      
      return { data: {}, error: null };
    },
    
    updateUser: async (attributes: any) => {
      const token = JSON.parse(localStorage.getItem('supabase.auth.token') || '{}').access_token;
      
      const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'apikey': supabaseAnonKey,
        },
        body: JSON.stringify(attributes),
      });
      
      if (!response.ok) {
        const error = await response.json();
        return { data: { user: null }, error };
      }
      
      return { data: { user: await response.json() }, error: null };
    },
    
    signInWithOAuth: async ({ provider }: { provider: string }) => {
      // OAuth n'est pas supporté dans ce client simplifié
      return { 
        data: { provider, url: null }, 
        error: { message: 'OAuth not supported in simplified client' } 
      };
    },
    
    admin: {
      createUser: async ({ email, password, user_metadata, email_confirm }: any) => {
        // Cette fonction nécessite le service role key, donc elle doit être appelée depuis le serveur
        return {
          data: null,
          error: { message: 'Admin functions must be called from server' }
        };
      }
    }
  }
};

// ============================================
// TYPES DE BASE DE DONNÉES
// ============================================

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  address?: string;
  wallet_balance?: number;
  role: 'passenger' | 'driver' | 'admin';
  created_at: string;
  updated_at: string;
}

export interface Driver {
  id: string;
  user_id: string;
  license_number?: string;
  status: 'pending' | 'approved' | 'rejected';
  rating: number;
  total_rides: number;
  total_earnings?: number;
  is_available: boolean;
  current_lat?: number;
  current_lng?: number;
  vehicle_id?: string;
  created_at: string;
  updated_at?: string;
  // Champs ajoutés par le KV store
  full_name?: string;
  email?: string;
  phone?: string;
  vehicle?: {
    make: string;
    model: string;
    year: number;
    color: string;
    license_plate: string;
    category: string;
    seats: number;
  };
}

export interface Vehicle {
  id: string;
  driver_id: string;
  make: string;
  model: string;
  year: number;
  color: string;
  license_plate: string;
  category: 'standard' | 'comfort' | 'luxury';
  seats: number;
  created_at: string;
  updated_at?: string;
}

export interface Ride {
  id: string;
  passenger_id: string;
  driver_id?: string;
  pickup_address: string;
  pickup_lat: number;
  pickup_lng: number;
  dropoff_address: string;
  dropoff_lat: number;
  dropoff_lng: number;
  status: 'pending' | 'accepted' | 'waiting' | 'in_progress' | 'completed' | 'cancelled';
  total_amount: number;
  duration_minutes: number;
  distance_km?: number;
  vehicle_category?: string;
  payment_method?: string;
  payment_status?: string;
  created_at: string;
  updated_at?: string;
}

export interface Document {
  id: string;
  driver_id: string;
  document_type: string;
  document_url: string;
  verification_status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at?: string;
}

export interface Rating {
  id: string;
  ride_id: string;
  driver_id: string;
  passenger_id: string;
  rating: number;
  comment?: string;
  created_at: string;
}

export interface PromoCode {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  is_active: boolean;
  expiry_date?: string;
  max_uses?: number;
  current_uses: number;
  created_at: string;
  updated_at?: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  ride_id?: string;
  amount: number;
  type: 'payment' | 'refund' | 'withdrawal';
  status: 'pending' | 'completed' | 'failed';
  payment_method?: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

export interface Setting {
  id: string;
  key: string;
  value: string;
  created_at: string;
  updated_at?: string;
}