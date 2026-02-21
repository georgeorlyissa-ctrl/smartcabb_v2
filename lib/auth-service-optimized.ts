import { supabase } from './supabase';
import { profileService } from './supabase-services';
import { normalizePhoneNumber, detectInputType, isValidEmail, generateEmailFromPhone } from './phone-utils';
import { projectId, publicAnonKey } from '../utils/supabase/info';

/**
 * Service d'authentification pour SmartCabb (Version optimisée)
 * Messages d'erreur courts - L'UI gère les actions via toasts
 */

export interface LoginCredentials {
  identifier: string; // Email ou numéro de téléphone
  password: string;
}

export interface SignUpData {
  email?: string;
  phone?: string;
  password: string;
  fullName: string;
  role: 'passenger' | 'driver';
}

export interface AuthResult {
  success: boolean;
  user?: any;
  profile?: any;
  error?: string;
  accessToken?: string;
}

export interface CreateAdminData {
  email: string;
  password: string;
  fullName: string;
}

/**
 * Connexion avec email ou numéro de téléphone
 */
export async function signIn(credentials: LoginCredentials): Promise<AuthResult> {
  try {
    const { identifier, password } = credentials;
    
    // Détecter si c'est un email ou un numéro de téléphone
    const inputType = detectInputType(identifier);
    
    if (inputType === 'unknown') {
      return {
        success: false,
        error: 'Format invalide. Veuillez entrer un email ou un numéro de téléphone valide.'
      };
    }
    
    let email = identifier;
    
    // Si c'est un numéro de téléphone, chercher l'email associé
    if (inputType === 'phone') {
      const normalizedPhone = normalizePhoneNumber(identifier);
      if (!normalizedPhone) {
        return {
          success: false,
          error: 'Numéro de téléphone invalide.'
        };
      }
      
      console.log('🔍 Recherche du profil avec le numéro:', normalizedPhone);
      
      // 🔥 UTILISER LA NOUVELLE ROUTE QUI CHERCHE DANS LE KV STORE
      try {
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/auth/get-email-by-phone`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${publicAnonKey}`
            },
            body: JSON.stringify({ phoneNumber: normalizedPhone })
          }
        );
        
        const result = await response.json();
        
        if (!result.success || !result.email) {
          console.error('❌ Aucun compte trouvé avec ce numéro');
          return {
            success: false,
            error: 'Aucun compte trouvé - Veuillez créer un compte'
          };
        }
        
        email = result.email;
        console.log('✅ Email trouvé (KV store):', email);
      } catch (error) {
        console.error('❌ Erreur lors de la recherche du téléphone:', error);
        return {
          success: false,
          error: 'Erreur lors de la recherche du compte.'
        };
      }
    }
    
    // Connexion avec Supabase Auth
    console.log('🔐 Tentative de connexion avec email:', email);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      console.error('❌ Erreur de connexion:', error);
      
      // Messages d'erreur personnalisés
      if (error.message.includes('Invalid login credentials')) {
        return {
          success: false,
          error: 'Mot de passe incorrect'
        };
      }
      
      if (error.message.includes('Database error querying schema') || 
          error.message.includes('relation') || 
          error.message.includes('does not exist')) {
        console.error('═══════════════════════════════════════════════');
        console.error('❌ BASE DE DONNÉES NON INITIALISÉE');
        console.error('Exécutez SETUP-TOUT-EN-UN.sql dans Supabase');
        console.error('═══════════════════════════════════════════════');
        
        return {
          success: false,
          error: 'BASE DE DONNÉES NON INITIALISÉE'
        };
      }
      
      return {
        success: false,
        error: error.message
      };
    }
    
    if (!data.user) {
      return {
        success: false,
        error: 'Erreur de connexion. Veuillez réessayer.'
      };
    }
    
    // Récupérer le profil de l'utilisateur
    const profile = await profileService.getProfile(data.user.id);
    
    if (!profile) {
      return {
        success: false,
        error: 'Profil utilisateur non trouvé.'
      };
    }
    
    console.log('✅ Connexion réussie:', profile.full_name);
    
    return {
      success: true,
      user: data.user,
      profile,
      accessToken: data.access_token // ✅ FIX: Utiliser data.access_token directement
    };
  } catch (error) {
    console.error('❌ Erreur inattendue lors de la connexion:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inattendue'
    };
  }
}

/**
 * Inscription d'un nouvel utilisateur
 */
export async function signUp(signUpData: SignUpData): Promise<AuthResult> {
  try {
    const { email, phone, password, fullName, role } = signUpData;
    
    // Validation
    if (!email && !phone) {
      return {
        success: false,
        error: 'Email ou numéro de téléphone requis.'
      };
    }
    
    // Normaliser le téléphone d'abord (prioritaire)
    let normalizedPhone: string | null = null;
    if (phone) {
      normalizedPhone = normalizePhoneNumber(phone);
      if (!normalizedPhone) {
        return {
          success: false,
          error: 'Numéro de téléphone invalide. Format attendu : 9 chiffres (ex: 812345678)'
        };
      }
    }
    
    // Email facultatif : si fourni, on vérifie qu'il est valide, sinon on utilise le téléphone
    let finalEmail: string;
    
    if (email && email.trim()) {
      // Validation basique de l'email
      if (!isValidEmail(email)) {
        return {
          success: false,
          error: 'Email invalide.'
        };
      }
      finalEmail = email.trim().toLowerCase();
    } else if (normalizedPhone) {
      // Pas d'email fourni : créer un email basé sur le téléphone
      finalEmail = generateEmailFromPhone(normalizedPhone);
    } else {
      return {
        success: false,
        error: 'Email ou numéro de téléphone requis.'
      };
    }
    
    console.log('📝 Inscription de:', fullName, 'avec email:', finalEmail);
    
    // Créer le compte Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email: finalEmail,
      password,
      options: {
        data: {
          full_name: fullName,
          phone: normalizedPhone,
          role
        }
      }
    });
    
    if (error) {
      console.error('❌ Erreur lors de l\'inscription:', error);
      
      if (error.message.includes('Email address') && error.message.includes('invalid')) {
        // Email rejeté par Supabase : réessayer avec email basé sur téléphone
        if (normalizedPhone && email) {
          console.log('🔄 Email rejeté, réessai avec téléphone uniquement...');
          // Rappeler signUp avec téléphone uniquement
          return signUp({
            email: undefined,
            phone,
            password,
            fullName,
            role
          });
        }
        return {
          success: false,
          error: 'Format d\'email non accepté par le système. Essayez avec votre numéro de téléphone uniquement.'
        };
      }
      
      if (error.message.includes('already registered') || error.message.includes('already been registered')) {
        return {
          success: false,
          error: 'Un compte existe déjà avec cet email ou ce numéro de téléphone.'
        };
      }
      
      return {
        success: false,
        error: error.message || 'Erreur lors de l\'inscription.'
      };
    }
    
    if (!data.user) {
      return {
        success: false,
        error: 'Erreur lors de la création du compte.'
      };
    }
    
    // Créer le profil dans la table profiles
    let profile;
    try {
      profile = await profileService.createProfile({
        id: data.user.id,
        email: finalEmail,
        full_name: fullName,
        phone: normalizedPhone || undefined,
        role
      });
      
      if (!profile) {
        console.error('❌ Échec création du profil');
        return {
          success: false,
          error: 'Erreur lors de la création du profil.'
        };
      }
      
      console.log('✅ Profil créé avec succès');
    } catch (profileError) {
      console.error('❌ Erreur création profil:', profileError);
      return {
        success: false,
        error: 'Erreur lors de la création du profil. Veuillez réessayer.'
      };
    }
    
    console.log('✅ Inscription réussie:', fullName);
    
    return {
      success: true,
      user: data.user,
      profile,
      accessToken: data.access_token // ✅ FIX: Utiliser data.access_token directement
    };
  } catch (error) {
    console.error('❌ Erreur inattendue lors de l\'inscription:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inattendue'
    };
  }
}

/**
 * Déconnexion
 */
export async function signOut(): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('❌ Erreur lors de la déconnexion:', error);
      return {
        success: false,
        error: error.message
      };
    }
    
    console.log('✅ Déconnexion réussie');
    return {
      success: true
    };
  } catch (error) {
    console.error('❌ Erreur inattendue lors de la déconnexion:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inattendue'
    };
  }
}

/**
 * Récupérer la session active avec timeout
 */
export async function getSession(): Promise<AuthResult> {
  try {
    // Créer une promesse de timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Session check timeout')), 3000);
    });

    // Race entre la vérification de session et le timeout
    const { data, error } = await Promise.race([
      supabase.auth.getSession(),
      timeoutPromise
    ]);
    
    if (error) {
      console.warn('⚠️ Erreur lors de la récupération de la session:', error);
      return {
        success: false,
        error: error.message
      };
    }
    
    if (!data.session) {
      return {
        success: false,
        error: 'Aucune session active.'
      };
    }
    
    // Récupérer le profil avec timeout aussi
    const profilePromise = profileService.getProfile(data.session.user.id);
    const profileTimeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Profile fetch timeout')), 2000);
    });

    const profile = await Promise.race([
      profilePromise,
      profileTimeoutPromise
    ]);
    
    return {
      success: true,
      user: data.session.user,
      profile,
      accessToken: data.session.access_token
    };
  } catch (error) {
    // Ne pas logger comme erreur si c'est juste un timeout ou une erreur réseau
    if (error instanceof Error && (error.message.includes('timeout') || error.message.includes('fetch'))) {
      console.log('ℹ️ Session check skipped (Supabase non configuré ou timeout)');
    } else {
      console.warn('⚠️ Erreur lors de la récupération de la session:', error);
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inattendue'
    };
  }
}

/**
 * Réinitialiser le mot de passe
 */
export async function resetPassword(identifier: string): Promise<{ success: boolean; error?: string }> {
  try {
    const inputType = detectInputType(identifier);
    
    let email = identifier;
    
    // Si c'est un numéro de téléphone, chercher l'email associé
    if (inputType === 'phone') {
      const normalizedPhone = normalizePhoneNumber(identifier);
      if (!normalizedPhone) {
        return {
          success: false,
          error: 'Numéro de téléphone invalide.'
        };
      }
      
      const { data: profiles } = await supabase
        .from('profiles')
        .select('email')
        .eq('phone', normalizedPhone)
        .limit(1);
      
      if (!profiles || profiles.length === 0) {
        return {
          success: false,
          error: 'Aucun compte trouvé avec ce numéro.'
        };
      }
      
      email = profiles[0].email;
    }
    
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    
    if (error) {
      console.error('❌ Erreur lors de la réinitialisation:', error);
      return {
        success: false,
        error: error.message
      };
    }
    
    console.log('✅ Email de réinitialisation envoyé');
    return {
      success: true
    };
  } catch (error) {
    console.error('❌ Erreur inattendue lors de la réinitialisation:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inattendue'
    };
  }
}

/**
 * Vérifier si un email/téléphone existe déjà
 */
export async function checkIfExists(identifier: string): Promise<{ exists: boolean; type?: 'email' | 'phone' }> {
  try {
    const inputType = detectInputType(identifier);
    
    if (inputType === 'email') {
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', identifier)
        .limit(1);
      
      return {
        exists: !!data && data.length > 0,
        type: 'email'
      };
    }
    
    if (inputType === 'phone') {
      const normalizedPhone = normalizePhoneNumber(identifier);
      if (!normalizedPhone) {
        return { exists: false };
      }
      
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('phone', normalizedPhone)
        .limit(1);
      
      return {
        exists: !!data && data.length > 0,
        type: 'phone'
      };
    }
    
    return { exists: false };
  } catch (error) {
    console.error('❌ Erreur lors de la vérification:', error);
    return { exists: false };
  }
}

/**
 * Créer un compte administrateur
 */
export async function createAdminUser(adminData: CreateAdminData): Promise<AuthResult> {
  try {
    const { email, password, fullName } = adminData;
    
    // Validation
    if (!isValidEmail(email)) {
      return {
        success: false,
        error: 'Email invalide.'
      };
    }
    
    if (password.length < 6) {
      return {
        success: false,
        error: 'Le mot de passe doit contenir au moins 6 caractères.'
      };
    }
    
    console.log('📝 Création d\'un admin via serveur:', fullName, 'avec email:', email);
    
    // Utiliser la route serveur pour créer l'admin avec service_role_key
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/create-admin`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({
          email,
          password,
          fullName
        })
      }
    );
    
    const result = await response.json();
    
    if (!result.success) {
      console.error('❌ Erreur lors de la création de l\'admin:', result.error);
      return {
        success: false,
        error: result.error || 'Erreur lors de la création du compte'
      };
    }
    
    console.log('✅ Admin créé avec succès via serveur:', fullName);
    
    // Connecter automatiquement l'utilisateur
    const loginResult = await signIn({ identifier: email, password });
    
    if (loginResult.success) {
      return {
        success: true,
        user: loginResult.user,
        profile: loginResult.profile,
        accessToken: loginResult.accessToken
      };
    }
    
    // Si la connexion automatique échoue, retourner quand même un succès
    // L'utilisateur devra se connecter manuellement
    return {
      success: true,
      user: result.user,
      profile: result.profile
    };
  } catch (error) {
    console.error('❌ Erreur inattendue lors de la création de l\'admin:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inattendue'
    };
  }
}