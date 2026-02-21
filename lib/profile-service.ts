/**
 * 👤 SERVICE DE GESTION DES PROFILS
 * 
 * Gère les profils utilisateurs (passagers, conducteurs, admins)
 */

import { supabase } from './supabase';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  role: 'passenger' | 'driver' | 'admin';
  created_at: string;
  updated_at?: string;
}

/**
 * 📥 RÉCUPÉRER UN PROFIL PAR ID
 */
export async function getProfile(userId: string): Promise<Profile | null> {
  try {
    console.log('📥 Récupération du profil:', userId);
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error('❌ Erreur récupération profil:', error);
      return null;
    }
    
    console.log('✅ Profil récupéré:', data);
    return data as Profile;
  } catch (error) {
    console.error('❌ Erreur getProfile:', error);
    return null;
  }
}

/**
 * 📥 RÉCUPÉRER UN PROFIL PAR EMAIL
 */
export async function getProfileByEmail(email: string): Promise<Profile | null> {
  try {
    console.log('📥 Récupération du profil par email:', email);
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .single();
    
    if (error) {
      console.error('❌ Erreur récupération profil par email:', error);
      return null;
    }
    
    console.log('✅ Profil récupéré:', data);
    return data as Profile;
  } catch (error) {
    console.error('❌ Erreur getProfileByEmail:', error);
    return null;
  }
}

/**
 * 📥 RÉCUPÉRER UN PROFIL PAR TÉLÉPHONE
 */
export async function getProfileByPhone(phone: string): Promise<Profile | null> {
  try {
    console.log('📥 Récupération du profil par téléphone:', phone);
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('phone', phone)
      .single();
    
    if (error) {
      console.error('❌ Erreur récupération profil par téléphone:', error);
      return null;
    }
    
    console.log('✅ Profil récupéré:', data);
    return data as Profile;
  } catch (error) {
    console.error('❌ Erreur getProfileByPhone:', error);
    return null;
  }
}

/**
 * ✏️ METTRE À JOUR UN PROFIL
 */
export async function updateProfile(
  userId: string,
  updates: Partial<Profile>
): Promise<Profile | null> {
  try {
    console.log('✏️ Mise à jour du profil:', userId, updates);
    
    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Erreur mise à jour profil:', error);
      return null;
    }
    
    console.log('✅ Profil mis à jour:', data);
    return data as Profile;
  } catch (error) {
    console.error('❌ Erreur updateProfile:', error);
    return null;
  }
}

/**
 * ➕ CRÉER UN PROFIL
 */
export async function createProfile(profile: Omit<Profile, 'created_at' | 'updated_at'>): Promise<Profile | null> {
  try {
    console.log('➕ Création du profil:', profile);
    
    const { data, error } = await supabase
      .from('profiles')
      .insert({
        ...profile,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      console.error('❌ Erreur création profil:', error);
      return null;
    }
    
    console.log('✅ Profil créé:', data);
    return data as Profile;
  } catch (error) {
    console.error('❌ Erreur createProfile:', error);
    return null;
  }
}

/**
 * 🗑️ SUPPRIMER UN PROFIL
 */
export async function deleteProfile(userId: string): Promise<boolean> {
  try {
    console.log('🗑️ Suppression du profil:', userId);
    
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);
    
    if (error) {
      console.error('❌ Erreur suppression profil:', error);
      return false;
    }
    
    console.log('✅ Profil supprimé');
    return true;
  } catch (error) {
    console.error('❌ Erreur deleteProfile:', error);
    return false;
  }
}

/**
 * 📋 RÉCUPÉRER TOUS LES PROFILS (ADMIN)
 */
export async function getAllProfiles(): Promise<Profile[]> {
  try {
    console.log('📋 Récupération de tous les profils');
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Erreur récupération profils:', error);
      return [];
    }
    
    console.log('✅ Profils récupérés:', data.length);
    return data as Profile[];
  } catch (error) {
    console.error('❌ Erreur getAllProfiles:', error);
    return [];
  }
}

/**
 * 📋 RÉCUPÉRER LES PROFILS PAR RÔLE
 */
export async function getProfilesByRole(role: 'passenger' | 'driver' | 'admin'): Promise<Profile[]> {
  try {
    console.log('📋 Récupération des profils par rôle:', role);
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', role)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Erreur récupération profils par rôle:', error);
      return [];
    }
    
    console.log('✅ Profils récupérés:', data.length);
    return data as Profile[];
  } catch (error) {
    console.error('❌ Erreur getProfilesByRole:', error);
    return [];
  }
}