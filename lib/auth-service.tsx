/**
 * 🔐 SERVICE D'AUTHENTIFICATION
 * 
 * Service centralisé pour gérer l'authentification avec le backend SmartCabb
 * 
 * @version 1.0.0
 * @date 2026-02-05
 */

import { projectId, publicAnonKey } from '../utils/supabase/info';

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52`;

/**
 * Connexion utilisateur (passager ou admin)
 */
export async function signIn(credentials: { identifier: string; password: string }) {
  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        identifier: credentials.identifier,  // ✅ Correction : utiliser "identifier" au lieu de "userIdentifier"
        password: credentials.password
      })
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('❌ Erreur signIn:', error);
    return {
      success: false,
      error: 'Erreur de connexion. Vérifiez votre connexion Internet.'
    };
  }
}

/**
 * Inscription passager
 */
export async function signUp(userData: {
  email: string;
  password: string;
  fullName: string;
  phone: string;
}) {
  try {
    const response = await fetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: userData.email,
        password: userData.password,
        full_name: userData.fullName,
        phone: userData.phone,
        role: 'passenger'
      })
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('❌ Erreur signUp:', error);
    return {
      success: false,
      error: 'Erreur lors de l\'inscription. Vérifiez votre connexion Internet.'
    };
  }
}

/**
 * Créer un compte admin
 */
export async function createAdminUser(userData: {
  email: string;
  password: string;
  fullName: string;
  phone: string;
}) {
  try {
    const response = await fetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: userData.email,
        password: userData.password,
        full_name: userData.fullName,
        phone: userData.phone,
        role: 'admin'
      })
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('❌ Erreur createAdminUser:', error);
    return {
      success: false,
      error: 'Erreur lors de la création du compte admin.'
    };
  }
}

/**
 * Créer un compte admin via l'endpoint backend /create-admin
 */
export async function createAdmin(adminData: {
  email: string;
  password: string;
  fullName: string;
}): Promise<{
  success: boolean;
  error?: string;
  user?: any;
  profile?: any;
}> {
  try {
    const response = await fetch(`${API_BASE}/create-admin`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: adminData.email,
        password: adminData.password,
        fullName: adminData.fullName
      })
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('❌ Erreur createAdmin:', error);
    return {
      success: false,
      error: 'Erreur lors de la création du compte admin.'
    };
  }
}

/**
 * Obtenir la session active (si elle existe)
 */
export async function getSession() {
  try {
    // Pour SmartCabb, nous n'utilisons pas de session côté client
    // L'authentification se fait à chaque requête avec le token
    // Cette fonction retourne null car nous gérons les sessions différemment
    console.log('ℹ️ getSession: SmartCabb n\'utilise pas de session côté client');
    return { session: null, user: null };
  } catch (error) {
    console.error('❌ Erreur getSession:', error);
    return { session: null, user: null };
  }
}

/**
 * Déconnexion
 */
export async function signOut() {
  try {
    // Pour SmartCabb, la déconnexion est gérée côté client
    // Il suffit de nettoyer le state local
    console.log('🚪 Déconnexion effectuée');
    return { success: true };
  } catch (error) {
    console.error('❌ Erreur signOut:', error);
    return {
      success: false,
      error: 'Erreur lors de la déconnexion.'
    };
  }
}

/**
 * Service d'authentification principal
 */
export const authService = {
  signIn,
  signUp,
  createAdminUser,
  createAdmin,
  getSession,
  signOut
};

export default authService;


