import { supabase } from './supabase';
import { profileService } from './supabase-services';
import { normalizePhoneNumber, detectInputType, isValidEmail, generateEmailFromPhone } from './phone-utils';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { apiCache, CACHE_DURATION } from './api-cache'; // ⚡ OPTIMISATION

/**
 * 🔐 SERVICE D'AUTHENTIFICATION SMARTCABB
 * @version 3.0.0 - 2026-03-08
 * @description Mode STANDALONE - Connexion directe Supabase (pas de backend)
 * 
 * ✅ FONCTIONNALITÉS :
 * - Connexion par téléphone ou email
 * - Génération automatique d'email pour numéros de téléphone
 * - Pas d'appels backend /auth/login (404 supprimés)
 * - Format email : u243XXXXXXXXX@smartcabb.app
 * 
 * ⚠️ IMPORTANT : Ce fichier remplace tous les anciens auth-service
 */

export interface LoginCredentials {
  identifier: string; // Numéro de téléphone uniquement
  password: string;
}

export interface SignUpData {
  email?: string; // Optionnel - généré automatiquement si non fourni
  phone: string;  // Obligatoire
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
        error: 'Veuillez entrer votre numéro de téléphone'
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
      // ✅ CORRECTION: Préfixe "u" + numéro SANS + pour que Supabase accepte
      // normalizedPhone = +243XXXXXXXXX, on retire le +
      const phoneWithoutPlus = normalizedPhone.startsWith('+') ? normalizedPhone.substring(1) : normalizedPhone;
      email = `u${phoneWithoutPlus}@smartcabb.app`;
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
        // ✅ CORRECTION: Préfixe "u" + numéro SANS + pour que Supabase accepte
        const phoneWithoutPlus = normalizedPhone.startsWith('+') ? normalizedPhone.substring(1) : normalizedPhone;
        email = `u${phoneWithoutPlus}@smartcabb.app`;
      } else {
        return {
          success: false,
          error: 'Format invalide. Entrez un email (ex: nom@email.com) ou un numéro de téléphone (ex: 0812345678)'
        };
      }
    }
    
    // ✅ CONNEXION DIRECTE SUPABASE (MODE STANDALONE - PAS DE BACKEND)
    console.log('🔐 Tentative de connexion via Supabase Auth...');
    console.log('🔐 Email/identifier:', email);
    console.log('🔑 Longueur du mot de passe:', password?.length || 0);
    
    let authData;
    let authError;
    
    try {
      const authResult = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      authData = authResult.data;
      authError = authResult.error;
    } catch (fetchError) {
      console.error('❌ Erreur réseau lors de la connexion:', fetchError);
      return {
        success: false,
        error: 'Impossible de contacter le serveur. Vérifiez votre connexion internet.'
      };
    }
    
    if (authError) {
      console.error('❌ Erreur de connexion:', authError.message || authError);
      console.error('   - Status:', (authError as any).status);
      console.error('   - Details:', authError);
      
      // ✅ Si identifiants incorrects, afficher l'aide dans la console
      if (authError.message && (authError.message.includes('Invalid login credentials') || (authError as any).status === 400)) {
        console.log('');
        console.log('╔═══════════════════════════════════════════════════════════════╗');
        console.log('║  ❌ AUCUN COMPTE TROUVÉ AVEC CES IDENTIFIANTS                ║');
        console.log('╚═══════════════════════════════════════════════════════════════╝');
        console.log('');
        console.log('✅ SOLUTION EN 1 CLIC:');
        console.log('');
        console.log('   1. Ouvrir: /admin/create-test-users');
        console.log('   2. Cliquer \"Créer les utilisateurs de test\"');
        console.log('   3. Se connecter avec les identifiants affichés');
        console.log('');
        console.log('   🚗 Conducteur: +243990666661 / Test1234');
        console.log('   👤 Passager: +243990666662 / Test1234');
        console.log('   🛡️  Admin: admin@smartcabb.app / Admin1234');
        console.log('');
        console.log('   ⏱️  Temps: ~1 minute');
        console.log('');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('');
      }
      
      // ✅ FIX: Vérifier que authError.message existe avant d'utiliser .includes()
      const errorMessage = authError.message || '';
      
      if (errorMessage.includes('Email not confirmed')) {
        return {
          success: false,
          error: 'Compte non activé. Vérifiez vos emails ou contactez le support.'
        };
      }
      
      // Messages d'erreur plus clairs
      if (errorMessage.includes('Invalid login credentials') || (authError as any).status === 400) {
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
    
    // ✅ FIX: Supabase signInWithPassword retourne access_token dans data.session
    const accessToken = authData?.session?.access_token || authData?.access_token;
    
    if (!authData?.user || !accessToken) {
      console.error('❌ [signIn] Réponse Supabase incomplète:');
      console.error('   - data:', authData);
      console.error('   - data.user:', authData?.user);
      console.error('   - data.session:', authData?.session);
      console.error('   - data.access_token:', authData?.access_token ? '[présent]' : '[absent]');
      console.error('   - data.session.access_token:', authData?.session?.access_token ? '[présent]' : '[absent]');
      console.error('   - Authentification échouée sans token valide');
      
      return {
        success: false,
        error: 'Erreur de connexion. Veuillez réessayer.'
      };
    }
    
    console.log('✅ [signIn] Authentification Supabase réussie');
    console.log('   - User ID:', authData.user.id);
    console.log('   - Email:', authData.user.email);
    console.log('   - Access token:', accessToken ? '[présent]' : '[absent]');
    
    // ✅ Récupérer le rôle depuis les métadonnées Auth
    const userRole = authData.user.user_metadata?.role || 'passenger';
    console.log('🔍 [signIn] Rôle détecté:', userRole);
    
    // ✅ GESTION SPÉCIALE POUR LES ADMINS
    if (userRole === 'admin') {
      console.log('🛡️ [signIn] Utilisateur admin détecté, récupération du profil depuis le backend...');
      
      // Récupérer le profil admin depuis le KV store via le backend
      const adminEndpoint = `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/admin/profile/${authData.user.id}`;
      console.log('🔍 [signIn] Tentative de récupération du profil admin:', adminEndpoint);
      
      let adminProfile;
      try {
        const adminResponse = await fetch(adminEndpoint, {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (adminResponse.ok) {
          const adminData = await adminResponse.json();
          if (adminData.success && adminData.admin) {
            adminProfile = adminData.admin;
            console.log('✅ [signIn] Profil admin récupéré depuis le backend');
          }
        } else {
          console.log('⚠️ [signIn] Route admin/profile non disponible, utilisation du fallback');
        }
      } catch (error) {
        console.log('⚠️ [signIn] Erreur récupération profil admin, utilisation du fallback');
      }
      
      // Si pas de profil récupéré, créer un profil depuis les métadonnées Auth
      if (!adminProfile) {
        console.log('📝 [signIn] Création du profil admin depuis les métadonnées Auth');
        adminProfile = {
          id: authData.user.id,
          email: authData.user.email,
          full_name: authData.user.user_metadata?.full_name || 'Administrateur',
          phone: authData.user.user_metadata?.phone || '',
          role: 'admin',
          created_at: authData.user.created_at
        };
      }
      
      console.log('✅ [signIn] Profil admin prêt:', adminProfile.role, adminProfile.full_name);
      console.log('✅ Connexion admin réussie:', authData.user.id);
      
      return {
        success: true,
        user: authData.user,
        profile: adminProfile,
        accessToken
      };
    }
    
    // ✅ Récupérer le profil depuis le BACKEND (avec auto-réparation UUID) - POUR PASSAGERS ET CONDUCTEURS
    const endpoint = userRole === 'driver' 
      ? `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/drivers/${authData.user.id}`
      : `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/passengers/${authData.user.id}`;
    
    console.log('🔍 [signIn] Récupération du profil depuis:', endpoint);
    
    let profile;
    try {
      const profileResponse = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!profileResponse.ok) {
        const errorData = await profileResponse.json().catch(() => ({ error: 'Erreur inconnue' }));
        console.error('❌ [signIn] Erreur backend:', errorData);
        
        // Fallback : créer un profil minimal depuis les données Auth
        console.log('⚠️ [signIn] Fallback : utilisation des données Auth');
        profile = {
          id: authData.user.id,
          email: authData.user.email,
          full_name: authData.user.user_metadata?.full_name || 'Utilisateur',
          phone: authData.user.user_metadata?.phone || '',
          role: userRole,
          created_at: authData.user.created_at
        };
      } else {
        const profileData = await profileResponse.json();
        
        if (!profileData.success || (!profileData.passenger && !profileData.driver)) {
          console.error('❌ [signIn] Profil invalide dans la réponse:', profileData);
          
          // Fallback
          profile = {
            id: authData.user.id,
            email: authData.user.email,
            full_name: authData.user.user_metadata?.full_name || 'Utilisateur',
            phone: authData.user.user_metadata?.phone || '',
            role: userRole,
            created_at: authData.user.created_at
          };
        } else {
          profile = profileData.passenger || profileData.driver;
          
          // Si le profil a été réparé, afficher l'info
          if (profileData.repaired) {
            console.log('🔧 [signIn] Profil réparé automatiquement !');
            console.log('   - Ancien UUID:', profileData.old_uuid);
            console.log('   - Nouveau UUID:', profileData.new_uuid);
          }
        }
      }
    } catch (fetchError) {
      console.error('❌ [signIn] Erreur fetch profil:', fetchError);
      
      // Fallback : créer un profil minimal
      profile = {
        id: authData.user.id,
        email: authData.user.email,
        full_name: authData.user.user_metadata?.full_name || 'Utilisateur',
        phone: authData.user.user_metadata?.phone || '',
        role: userRole,
        created_at: authData.user.created_at
      };
    }
    
    console.log('✅ [signIn] Profil récupéré:', profile.role, profile.full_name);
    console.log('✅ Connexion réussie:', authData.user.id);
    
    return {
      success: true,
      user: authData.user,
      profile,
      accessToken // ✅ Utiliser le token extrait (session ou direct)
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
    
    console.log('📞 [signUp] Téléphone normalisé:', normalizedPhone);
    
    // ✅ FIX: Ne PAS envoyer d'email au backend si c'est juste un numéro de téléphone
    // Le backend générera automatiquement l'email @smartcabb.app
    let finalEmail: string | undefined;
    if (email && email.trim() && isValidEmail(email)) {
      // Email fourni et valide - l'utiliser
      finalEmail = email.trim().toLowerCase();
      console.log('📧 Email réel fourni:', finalEmail);
    } else {
      // Pas d'email réel - laisser le backend générer l'email @smartcabb.app
      finalEmail = undefined; // ✅ Ne pas envoyer d'email généré
      console.log('📧 Pas d\'email fourni, le backend générera l\'email automatiquement');
    }
    
    console.log('📝 Inscription avec:', { finalEmail, phone: normalizedPhone, role });
    
    // UTILISER LE SERVEUR pour créer le compte (l'API Admin accepte tous les formats)
    console.log('🔄 Création via API serveur (Admin API)...');
    
    // ✅ FIX CRITIQUE: Envoyer le téléphone NORMALISÉ au backend pour garantir
    // que backend et frontend génèrent le même email @smartcabb.app
    // Format attendu: "243XXXXXXXXX" (sans +, sans espaces, sans tirets)
    const phoneToSend = normalizedPhone ? normalizedPhone.replace(/[\s\-+]/g, '') : phone;
    console.log('📱 Téléphone envoyé au backend:', phoneToSend);
    
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
            phone: phoneToSend,  // ✅ Téléphone normalisé
            password,
            fullName,
            role
          }),
        }
      );

      console.log('📊 Response status:', response.status);
      console.log('📊 Response ok:', response.ok);

      const result = await response.json();
      
      console.log('📊 Response body:', result);

      if (!response.ok || !result.success) {
        console.error('❌ Erreur serveur inscription:', result.error);
        
        // Si l'erreur dit "Database error", essayer le fallback direct
        if (result.error?.includes('Database error') || result.error?.includes('unexpected_failure')) {
          console.log('⚠️ Erreur backend détectée, passage en mode fallback direct...');
          throw new Error('Backend unavailable - using fallback');
        }
        
        return {
          success: false,
          error: result.error || 'Erreur lors de l\'inscription'
        };
      }

      console.log('✅ Compte créé via serveur:', result);

      // Se connecter automatiquement après inscription
      // ✅ FIX: Utiliser le même email que celui généré par le backend
      const emailToUse = finalEmail || `u${phoneToSend}@smartcabb.app`;
      console.log('🔐 Connexion automatique avec email:', emailToUse);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailToUse,
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
      
      // Fallback: essayer l'inscription côté client DIRECTEMENT via Supabase
      console.log('⚠️ Fallback: tentative inscription DIRECTE via Supabase Auth...');
      console.log('📧 Email à utiliser:', finalEmail);
      console.log('📱 Téléphone:', normalizedPhone);
      
      const { data, error } = await supabase.auth.signUp({
        email: finalEmail || `u${normalizedPhone}@smartcabb.app`,
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
        
        // ✅ FIX: Vérifier que error.message existe avant d'utiliser .includes()
        const errorMessage = error.message || error.msg || (error as any).error_description || '';
        
        if (errorMessage.includes('already registered')) {
          return {
            success: false,
            error: 'Un compte existe déjà avec cet email ou ce numéro de téléphone'
          };
        }
        
        // ✅ Gestion spécifique de l'erreur "email_address_invalid"
        if (errorMessage.includes('invalid') || (error as any).error_code === 'email_address_invalid') {
          console.error('📧 Email rejeté par Supabase:', finalEmail);
          console.error('   Détails de l\'erreur:', error);
          
          return {
            success: false,
            error: `L'adresse email "${finalEmail}" n'est pas acceptée par le serveur. Essayez avec un autre email ou utilisez votre numéro de téléphone.`
          };
        }
        
        return {
          success: false,
          error: errorMessage || 'Erreur lors de l\'inscription'
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
          email: finalEmail || `u${normalizedPhone}@smartcabb.app`,
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
    
    // ✅ NOUVELLE ROUTE : Purge automatique + Création
    // Cette route supprime définitivement l'ancien compte s'il existe
    // et crée un nouveau compte admin avec le même email
    console.log('🔧 Création admin avec purge automatique si nécessaire...');
    
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/purge/create-admin-with-purge`,
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
    
    console.log('✅ Admin créé avec succès (ancien compte purgé si nécessaire)');
    return {
      success: true,
      user: result.admin,
      profile: result.admin
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
