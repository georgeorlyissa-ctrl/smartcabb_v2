import { supabase } from './supabase';
import { profileService } from './supabase-services';
import { normalizePhoneNumber, detectInputType, isValidEmail, generateEmailFromPhone } from './phone-utils';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { apiCache, CACHE_DURATION } from './api-cache'; // ⚡ OPTIMISATION

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
    
    // Nettoyer l'identifiant (enlever les espaces avant/après)
    const cleanIdentifier = identifier.trim();
    
    console.log('🔐 [signIn] Début de la connexion...');
    console.log('🔐 [signIn] Identifier:', cleanIdentifier);
    
    if (!cleanIdentifier) {
      console.log('❌ [signIn] Identifiant vide');
      return {
        success: false,
        error: 'Veuillez entrer un email ou un numéro de téléphone'
      };
    }
    
    if (!password) {
      console.log('❌ [signIn] Mot de passe vide');
      return {
        success: false,
        error: 'Veuillez entrer votre mot de passe'
      };
    }
    
    // Détecter si c'est un email ou un numéro de téléphone
    const inputType = detectInputType(cleanIdentifier);
    
    console.log('🔍 [signIn] Type détecté:', inputType, 'pour:', cleanIdentifier);
    
    let email = cleanIdentifier;
    
    // Si c'est un numéro de téléphone, générer l'email correspondant
    if (inputType === 'phone') {
      const normalizedPhone = normalizePhoneNumber(cleanIdentifier);
      if (!normalizedPhone) {
        return {
          success: false,
          error: 'Numéro de téléphone invalide. Format attendu: 0812345678'
        };
      }
      
      console.log('📱 Connexion par téléphone:', normalizedPhone);
      
      // MODE STANDALONE : Générer l'email directement sans appel backend
      email = `${normalizedPhone}@smartcabb.app`;
      console.log('🔐 Email généré:', email);
    } else if (inputType === 'email') {
      // Vérifier que l'email est valide
      if (!isValidEmail(cleanIdentifier)) {
        return {
          success: false,
          error: 'Format email invalide'
        };
      }
      email = cleanIdentifier.toLowerCase();
    } else if (inputType === 'unknown') {
      // Essayer de normaliser comme téléphone quand même
      const normalizedPhone = normalizePhoneNumber(cleanIdentifier);
      if (normalizedPhone) {
        console.log('📱 Traitement comme téléphone:', normalizedPhone);
        email = `${normalizedPhone}@smartcabb.app`;
      } else {
        return {
          success: false,
          error: 'Format invalide. Entrez un email (ex: nom@email.com) ou un numéro de téléphone (ex: 0812345678)'
        };
      }
    }
    
    // ✅ CONNEXION DIRECTE SUPABASE (MODE STANDALONE - PAS DE BACKEND)
    console.log('🔐 Tentative de connexion via Supabase Auth direct...');
    console.log('🔐 Email/identifier:', email);
    console.log('🔑 Longueur du mot de passe:', password?.length || 0);
    
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (authError) {
      console.error('❌ Erreur de connexion:', authError.message);
      console.error('   - Status:', authError.status);
      console.error('   - Details:', authError);
      
      // ✅ FIX: Vérifier que authError.message existe avant d'utiliser .includes()
      const errorMessage = authError.message || '';
      
      if (errorMessage.includes('Email not confirmed')) {
        return {
          success: false,
          error: 'Compte non activé. Vérifiez vos emails ou contactez le support.'
        };
      }
      
      // Messages d'erreur plus clairs
      if (errorMessage.includes('Invalid login credentials') || authError.status === 400) {
        return {
          success: false,
          error: 'Identifiants incorrects. Vérifiez votre numéro de téléphone et votre mot de passe.'
        };
      }
      
      return {
        success: false,
        error: errorMessage || 'Erreur de connexion. Veuillez réessayer.'
      };
    }
    
    // ✅ FIX: Supabase signInWithPassword retourne access_token directement dans data
    if (!data?.user || !data?.access_token) {
      console.error('❌ [signIn] Réponse Supabase incomplète:');
      console.error('   - data:', data);
      console.error('   - data.user:', data?.user);
      console.error('   - data.access_token:', data?.access_token ? '[présent]' : '[absent]');
      console.error('   - Authentification échouée sans token valide');
      
      return {
        success: false,
        error: 'Erreur de connexion. Veuillez réessayer.'
      };
    }
    
    console.log('✅ [signIn] Authentification Supabase réussie');
    console.log('   - User ID:', data.user.id);
    console.log('   - Email:', data.user.email);
    console.log('   - Access token:', data.access_token ? '[présent]' : '[absent]');
    
    // ✅ Récupérer le profil depuis Postgres
    console.log('🔍 [signIn] Récupération du profil depuis Postgres...');
    const profile = await profileService.getProfile(data.user.id);
    
    if (!profile) {
      console.error('❌ [signIn] Aucun profil trouvé pour user ID:', data.user.id);
      return {
        success: false,
        error: 'Profil introuvable. Veuillez contacter le support.'
      };
    }
    
    console.log('✅ [signIn] Profil récupéré:', profile.role, profile.full_name);
    console.log('✅ Connexion réussie:', data.user.id);
    
    return {
      success: true,
      user: data.user,
      profile,
      accessToken: data.access_token
    };
    
  } catch (error) {
    console.error('❌ Erreur inattendue lors de la connexion:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    };
  }
}

/**
 * Inscription avec email ou numéro de téléphone
 */
export async function signUp(userData: SignUpData): Promise<AuthResult> {
  try {
    const { email, phone, password, fullName, role } = userData;
    
    // Validation basique
    if (!password || password.length < 6) {
      return {
        success: false,
        error: 'Le mot de passe doit contenir au moins 6 caractères'
      };
    }
    
    if (!fullName || fullName.trim().length < 2) {
      return {
        success: false,
        error: 'Veuillez entrer votre nom complet'
      };
    }
    
    // Normaliser le numéro de téléphone si fourni
    const normalizedPhone = phone ? normalizePhoneNumber(phone) : null;
    
    // Déterminer l'email final à utiliser
    let finalEmail: string;
    if (email && email.trim() && isValidEmail(email)) {
      // Email fourni et valide
      finalEmail = email.trim().toLowerCase();
    } else if (normalizedPhone) {
      // Pas d'email valide mais téléphone fourni
      finalEmail = generateEmailFromPhone(normalizedPhone);
      console.log('📧 Email généré depuis téléphone:', finalEmail);
    } else {
      return {
        success: false,
        error: 'Veuillez fournir un email ou un numéro de téléphone valide'
      };
    }
    
    console.log('📝 Inscription avec:', { finalEmail, phone: normalizedPhone, role });
    
    // UTILISER LE SERVEUR pour créer le compte (l'API Admin accepte tous les formats)
    console.log('🔄 Création via API serveur (Admin API)...');
    
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/signup-passenger`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: finalEmail,
            phone: normalizedPhone,
            password,
            fullName,
            role
          }),
        }
      );

      const result = await response.json();

      if (!result.success) {
        console.error('❌ Erreur serveur inscription:', result.error);
        return {
          success: false,
          error: result.error || 'Erreur lors de l\'inscription'
        };
      }

      console.log('✅ Compte créé via serveur:', result);

      // Se connecter automatiquement après inscription
      const { data, error } = await supabase.auth.signInWithPassword({
        email: finalEmail,
        password
      });

      if (error) {
        console.error('❌ Erreur connexion automatique:', error);
        return {
          success: true,
          user: result.user,
          profile: result.profile,
          error: 'Compte créé mais erreur de connexion. Veuillez vous connecter manuellement.'
        };
      }

      return {
        success: true,
        user: data.user,
        profile: result.profile,
        accessToken: data.session?.access_token
      };

    } catch (fetchError) {
      console.error('❌ Erreur appel serveur:', fetchError);
      
      // Fallback: essayer l'inscription côté client
      console.log('⚠️ Fallback: tentative inscription côté client...');
      
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
        console.error('❌ Erreur inscription fallback:', error);
        
        if (error.message.includes('already registered')) {
          return {
            success: false,
            error: 'Un compte existe déjà avec cet email ou ce numéro de téléphone'
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
          error: 'Aucun utilisateur créé'
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
        
        console.log('✅ Profil créé avec succès');
      } catch (profileError: any) {
        console.error('❌ Erreur création profil:', profileError);
        
        // Si c'est une erreur de clé dupliquée, essayer de récupérer le profil existant
        if (profileError.message?.includes('duplicate key') || profileError.code === '23505') {
          console.log('🔄 Profil existe déjà, récupération...');
          profile = await profileService.getProfile(data.user.id);
          
          if (!profile) {
            return {
              success: false,
              error: 'Erreur lors de la création du profil. Veuillez réessayer.'
            };
          }
          
          console.log('✅ Profil existant récupéré');
        } else {
          return {
            success: false,
            error: 'Erreur lors de la création du profil. Veuillez réessayer.'
          };
        }
      }
      
      return {
        success: true,
        user: data.user,
        profile,
        accessToken: data.session?.access_token
      };
    }
  } catch (error) {
    console.error('❌ Erreur inattendue lors de inscription:', error);
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
 * Récupérer la session active
 */
export async function getSession(): Promise<AuthResult> {
  try {
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      return {
        success: false,
        error: error.message
      };
    }
    
    if (!data.session) {
      return {
        success: false,
        error: 'No active session'
      };
    }
    
    const profile = await profileService.getProfile(data.session.user.id);
    
    return {
      success: true,
      user: data.session.user,
      profile,
      accessToken: data.session.access_token
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Créer un compte administrateur
 */
export async function createAdmin(adminData: CreateAdminData): Promise<AuthResult> {
  try {
    const { email, password, fullName } = adminData;
    
    // Validation
    if (!email || !isValidEmail(email)) {
      return {
        success: false,
        error: 'Email invalide'
      };
    }
    
    if (!password || password.length < 6) {
      return {
        success: false,
        error: 'Le mot de passe doit contenir au moins 6 caractères'
      };
    }
    
    // Appel à l'endpoint serveur pour créer l'admin
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/create-admin`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({ email, password, fullName })
      }
    );
    
    const result = await response.json();
    
    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Erreur lors de la création du compte admin'
      };
    }
    
    console.log('✅ Admin créé avec succès');
    return {
      success: true,
      user: result.user,
      profile: result.profile
    };
  } catch (error) {
    console.error('❌ Erreur création admin:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inattendue'
    };
  }
}

/**
 * Alias pour createAdmin (compatibilité)
 */
export const createAdminUser = createAdmin;

/**
 * Réinitialiser le mot de passe
 */
export async function resetPassword(identifier: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Nettoyer l'identifiant
    const cleanIdentifier = identifier.trim();
    
    if (!cleanIdentifier) {
      return {
        success: false,
        error: 'Veuillez entrer un email ou un numéro de téléphone'
      };
    }
    
    // Détecter le type d'identifiant
    const inputType = detectInputType(cleanIdentifier);
    let email = cleanIdentifier;
    
    // Si c'est un numéro de téléphone, convertir en email
    if (inputType === 'phone') {
      const normalizedPhone = normalizePhoneNumber(cleanIdentifier);
      if (!normalizedPhone) {
        return {
          success: false,
          error: 'Numéro de téléphone invalide. Format: 0812345678'
        };
      }
      
      // Générer l'email depuis le téléphone
      email = `${normalizedPhone}@smartcabb.app`;
      console.log('📱 Réinitialisation pour téléphone:', normalizedPhone, '-> Email:', email);
    } else if (inputType === 'email') {
      if (!isValidEmail(cleanIdentifier)) {
        return {
          success: false,
          error: 'Email invalide'
        };
      }
      email = cleanIdentifier.toLowerCase();
    } else {
      return {
        success: false,
        error: 'Format invalide. Utilisez un email ou un numéro (0812345678)'
      };
    }
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    });
    
    if (error) {
      console.error('❌ Erreur réinitialisation mot de passe:', error);
      return {
        success: false,
        error: 'Erreur lors de l\'envoi. Vérifiez que ce compte existe.'
      };
    }
    
    console.log('✅ Email de réinitialisation envoyé à:', email);
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