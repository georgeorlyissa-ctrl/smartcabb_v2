// ============================================
// CLIENT SUPABASE - SINGLETON
// ============================================

/**
 * ⚠️ Un seul client Supabase pour toute l'application.
 *
 * Le client officiel gère lui-même la persistance de session (localStorage) et
 * le rafraîchissement du jeton. Les écrans qui lisent `supabase.auth.getSession()`
 * (SOS admin, SMS, chat) disposent donc toujours du jeton du dernier compte
 * connecté — y compris les administrateurs.
 *
 * Pour les appels métier, préférer l'API REST :
 * fetch(`https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/...`)
 */

import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '../utils/supabase/info';

const supabaseUrl = `https://${projectId}.supabase.co`;
const supabaseAnonKey = publicAnonKey;

/** Marge de sécurité : on rafraîchit le jeton 90 s avant son expiration. */
const REFRESH_MARGIN_SECONDS = 90;

export interface StoredSession {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  expires_in?: number;
  token_type?: string;
  user?: any;
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

/**
 * Session courante, rafraîchie automatiquement si elle approche de
 * l'expiration. Retourne `null` si personne n'est connecté.
 */
export async function getFreshSession(): Promise<StoredSession | null> {
  try {
    const { data } = await supabase.auth.getSession();
    let session = (data.session as StoredSession | null) ?? null;
    if (!session?.access_token) return null;

    const expiring =
      typeof session.expires_at === 'number' &&
      session.expires_at * 1000 - Date.now() < REFRESH_MARGIN_SECONDS * 1000;

    if (expiring && session.refresh_token) {
      const { data: refreshed, error } = await supabase.auth.refreshSession();
      if (!error && refreshed.session?.access_token) {
        session = refreshed.session as StoredSession;
      }
    }

    return session;
  } catch {
    return null;
  }
}

/** Force le rafraîchissement de la session (null si impossible). */
export async function refreshSession(): Promise<StoredSession | null> {
  try {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) return null;
    return (data.session as StoredSession | null) ?? null;
  } catch {
    return null;
  }
}

export default supabase;

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
