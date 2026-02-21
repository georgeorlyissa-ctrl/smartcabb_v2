/**
 * 🔧 CLIENT SUPABASE
 * 
 * Client Supabase pour SmartCabb (côté frontend)
 * 
 * ⚠️ NOTE : SmartCabb utilise principalement l'architecture API REST
 * Ce client est fourni pour la compatibilité avec certains composants legacy
 * 
 * @version 1.0.0
 * @date 2026-02-05
 */

import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '../utils/supabase/info';

const supabaseUrl = `https://${projectId}.supabase.co`;
const supabaseAnonKey = publicAnonKey;

// Créer le client Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Export par défaut
export default supabase;
