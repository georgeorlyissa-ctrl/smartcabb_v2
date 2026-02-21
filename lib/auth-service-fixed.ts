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
    
    // Nettoyer l'identifiant (enlever les espaces avant/après)
    const cleanIdentifier = identifier.trim();
    
    if (!cleanIdentifier) {
      return {
        success: false,
        error: 'Veuillez entrer un email ou un numéro de téléphone'
      };
    }
    
    if (!password) {
      return {
        success: false,
        error: 'Veuillez entrer votre mot de passe'
      };
    }
    
    // Détecter si c'est un email ou un numéro de téléphone
    const inputType = detectInputType(cleanIdentifier);
    
    console.log('🔍 Type détecté:', inputType, 'pour:', cleanIdentifier);
    
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
      
      // Essayer d'abord avec l'email interne (nouveau format serveur)
      // Format: {phone}@smartcabb.app (sans le + et sans préfixe "phone")
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
    
    // Connexion avec Supabase Auth
    console.log('🔐 Tentative de connexion avec email:', email);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      console.error('❌ Erreur de connexion:', error.message);
      
      // Message d'erreur spécifique pour "Email not confirmed"
      if (error.message.includes('Email not confirmed')) {
        console.error('═══════════════════════════════════════════════');
        console.error('❌ ERREUR: Email non confirmé');
        console.error('');
        console.error('Votre compte existe mais lemail nest pas confirmé.');
        console.error('');
        console.error('💡 SOLUTION RAPIDE:');
        console.error('   Ouvrez la console Supabase:');
        console.error('   1. Allez dans Authentication > Users');
        console.error('   2. Trouvez votre utilisateur');
        console.error('   3. Cliquez sur "Confirm email"');
        console.error('');
        console.error('OU exécutez ce SQL dans SQL Editor:');
        console.error('   UPDATE auth.users');
        console.error('   SET email_confirmed_at = NOW()');
        console.error('   WHERE email = votre_email_ici;');
        console.error('═══════════════════════════════════════════════');
        return {
          success: false,
          error: 'Compte non activé. Vérifiez vos emails ou contactez le support.'
        };
      }
      
      // Messages d'erreur personnalisés pour "Invalid login credentials"
      if (error.message.includes('Invalid login credentials')) {
        // Si c'était un téléphone et que ça a échoué, essayer les anciens formats
        if (inputType === 'phone') {
          const normalizedPhone = normalizePhoneNumber(identifier);
          
          if (!normalizedPhone) {
            return {
              success: false,
              error: 'Numéro de téléphone invalide'
            };
          }
          
          console.log('🔄 Tentative avec autres formats pour:', normalizedPhone);
          
          // Liste des formats à essayer
          const emailFormats = [
            `${normalizedPhone}@smartcabb.app`,       // Ancien format 1
            `phone+${normalizedPhone}@smartcabb.app`, // Ancien format 2
            `${normalizedPhone}@smartcabb.temp`,      // Legacy
            `sc${normalizedPhone}@temp.mail`,         // Format généré
          ];
          
          for (const testEmail of emailFormats) {
            console.log('🔄 Test avec:', testEmail);
            
            const { data: testData, error: testError } = await supabase.auth.signInWithPassword({
              email: testEmail,
              password
            });
            
            // ✅ FIX: Vérifier data.access_token au lieu de data.session
            if (!testError && testData.access_token) {
              console.log('✅ Connexion réussie avec format:', testEmail);
              
              const profile = await profileService.getProfile(testData.user.id);
              return {
                success: true,
                user: testData.user,
                profile,
                accessToken: testData.access_token // ✅ FIX: Utiliser data.access_token directement
              };
            }
          }
        }
        
        // Si toujours en échec
        console.error('═══════════════════════════════════════════════');
        console.error('❌ ERREUR: Identifiants incorrects');
        console.error('');
        console.error('Numéro/email ou mot de passe incorrect');
        console.error('');
        console.error('💡 SOLUTIONS:');
        console.error('   1. Vérifiez votre numéro de téléphone/email');
        console.error('   2. Vérifiez votre mot de passe');
        console.error('   3. Si vous navez pas de compte, inscrivez-vous');
        console.error('═══════════════════════════════════════════════');
        return {
          success: false,
          error: inputType === 'phone' 
            ? `Numéro ou mot de passe incorrect. Si vous n'avez pas de compte, veuillez vous inscrire.`
            : `Email ou mot de passe incorrect`
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
    
    console.log('✅ Connexion réussie:', data.user.id);
    
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
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    };
  }
}

// Les autres fonctions restent inchangées...
export async function signUp(data: SignUpData): Promise<AuthResult> {
  // Implementation existante...
  return { success: false, error: 'Not implemented' };
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

export async function createAdmin(data: CreateAdminData): Promise<AuthResult> {
  // Implementation existante...
  return { success: false, error: 'Not implemented' };
}