import { Hono } from 'npm:hono';
import { createClient } from 'npm:@supabase/supabase-js@2';
import * as kv from './kv-wrapper.ts';
import { isValidUUID } from './uuid-validator.ts';

import { normalizePhoneNumber, isValidPhoneNumber } from './phone-utils.ts';


const authRoutes = new Hono();

// ============================================
// CONNEXION (LOGIN)
// ============================================
authRoutes.post('/auth/login', async (c) => {
  try {
    const { email, password, identifier } = await c.req.json();
    
    // Support both 'email' (legacy) and 'identifier' (new) parameters
    const userIdentifier = identifier || email;
    
    if (!userIdentifier || !password) {
      return c.json({ 
        success: false, 
        error: 'Email/téléphone et mot de passe requis' 
      }, 400);
    }

    console.log('🔐 Tentative de connexion avec:', userIdentifier);

    // Créer un client Supabase avec la clé service pour l'authentification
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Détecter si c'est un email ou un numéro de téléphone
    const isPhone = /^[0-9+\s\-()]+$/.test(userIdentifier.trim());
    let emailToUse = userIdentifier;
    let matchingProfile: any = null; // 🔥 Déclarer ici pour être accessible partout


    if (isPhone) {
      console.log('📱 Numéro de téléphone détecté, recherche de l\'email associé...');
      
      // Normaliser le numéro pour la recherche
      const normalizePhone = (phone: string): string[] => {
        const clean = phone.replace(/[\s()\-]/g, '');
        const formats = [clean];
        
        if (clean.startsWith('+243')) {
          formats.push(clean.substring(4));
          formats.push('0' + clean.substring(4));
          formats.push(clean.substring(1));
        } else if (clean.startsWith('243')) {
          formats.push('+' + clean);
          formats.push('0' + clean.substring(3));
        } else if (clean.startsWith('0')) {
          formats.push('+243' + clean.substring(1));
          formats.push('243' + clean.substring(1));
        }
        
        return [...new Set(formats)];
      };
      
      // ✅ NORMALISER AU FORMAT STANDARD pour comparaison exacte
      const normalizeToStandardFormat = (phone: string): string => {
        const clean = phone.replace(/[\s+()\-]/g, '');
        if (clean.length === 9) {
          return `+243${clean}`;
        } else if (clean.length === 10 && clean.startsWith('0')) {
          return `+243${clean.substring(1)}`;
        } else if (clean.length === 12 && clean.startsWith('243')) {
          return `+${clean}`;
        } else if (clean.length === 13 && clean.startsWith('+243')) {
          return clean;
        } else if (clean.startsWith('243')) {
          return `+${clean}`;
        } else if (clean.startsWith('0')) {
          return `+243${clean.substring(1)}`;
        }
        return clean;
      };
      
      const normalizedSearchPhone = normalizeToStandardFormat(userIdentifier);
      console.log('📱 Numéro de recherche normalisé:', normalizedSearchPhone);

      // Chercher dans tous les profils
      const allProfiles = await kv.getByPrefix('profile:');
      const allDrivers = await kv.getByPrefix('driver:');
      const allPassengers = await kv.getByPrefix('passenger:');
      const allUsers = [...allProfiles, ...allDrivers, ...allPassengers];


      matchingProfile = allUsers.find(p => {

      const matchingProfile = allUsers.find(p => {

        if (!p || !p.phone) return false;
        const normalizedProfilePhone = normalizeToStandardFormat(p.phone);
        return normalizedProfilePhone === normalizedSearchPhone;
      });

      if (matchingProfile && matchingProfile.email) {
        emailToUse = matchingProfile.email;
        console.log('✅ Email trouvé pour le numéro:', emailToUse);
      } else {
        console.log('❌ Aucun compte trouvé pour ce numéro');
        return c.json({ 
          success: false, 
          error: 'Aucun compte trouvé avec ce numéro de téléphone' 
        }, 401);
      }
    }

    // Connexion avec Supabase Auth
    console.log('🔐 Connexion Supabase Auth avec email:', emailToUse);

    let authData, authError;
    
    // Première tentative avec l'email trouvé
    ({ data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: emailToUse,
      password
    }));

    // 🔥 FIX : Si échec et email utilise un domaine, essayer l'autre domaine
    if (authError && authError.code === 'invalid_credentials') {
      let alternativeEmail: string | null = null;
      
      if (emailToUse.includes('@smartcabb.local')) {
        alternativeEmail = emailToUse.replace('@smartcabb.local', '@smartcabb.app');
        console.log('🔄 Tentative avec domaine alternatif:', alternativeEmail);
      } else if (emailToUse.includes('@smartcabb.app')) {
        alternativeEmail = emailToUse.replace('@smartcabb.app', '@smartcabb.local');
        console.log('🔄 Tentative avec domaine alternatif:', alternativeEmail);
      }
      
      if (alternativeEmail) {
        console.log('🔄 Réessai avec:', alternativeEmail);
        const { data: altAuthData, error: altAuthError } = await supabase.auth.signInWithPassword({
          email: alternativeEmail,
          password
        });
        
        if (!altAuthError && altAuthData) {
          console.log('✅ Connexion réussie avec domaine alternatif !');
          authData = altAuthData;
          authError = null;
          emailToUse = alternativeEmail;
          
          // 🔥 SYNCHRONISER : Mettre à jour l'email dans le KV pour la prochaine fois
          if (matchingProfile) {
            matchingProfile.email = alternativeEmail;
            const rolePrefix = matchingProfile.role === 'driver' ? 'driver:' : 
                              matchingProfile.role === 'passenger' ? 'passenger:' : 'profile:';
            await kv.set(`${rolePrefix}${matchingProfile.id}`, matchingProfile);
            console.log('✅ Email synchronisé dans KV:', alternativeEmail);
          }
        } else {
          console.error('❌ Échec avec domaine alternatif aussi');
        }
      }
      
      // 🔥 FIX CRITIQUE : Si toujours échec, essayer de synchroniser le mot de passe depuis KV vers Auth
      if (authError && matchingProfile && matchingProfile.password) {
        console.log('🔄 TENTATIVE ULTIME : Synchronisation du mot de passe KV → Auth...');
        console.log('📝 Mot de passe stocké dans KV existe:', !!matchingProfile.password);
        
        // Vérifier si le mot de passe fourni correspond au mot de passe KV
        if (matchingProfile.password === password) {
          console.log('✅ Le mot de passe fourni CORRESPOND au mot de passe KV !');
          console.log('🔄 Mise à jour du mot de passe dans Supabase Auth...');
          
          try {
            // Mettre à jour le mot de passe dans Auth
            const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
              matchingProfile.id,
              { password: password }
            );
            
            if (updateError) {
              console.error('❌ Erreur sync mot de passe vers Auth:', updateError);
            } else {
              console.log('✅ Mot de passe synchronisé vers Auth !');
              
              // Réessayer la connexion
              console.log('🔄 Nouvelle tentative de connexion...');
              const { data: retryAuthData, error: retryAuthError } = await supabase.auth.signInWithPassword({
                email: emailToUse,
                password
              });
              
              if (!retryAuthError && retryAuthData) {
                console.log('✅✅✅ CONNEXION RÉUSSIE APRÈS SYNCHRONISATION !');
                authData = retryAuthData;
                authError = null;
              } else {
                console.error('❌ Échec même après sync:', retryAuthError);
              }
            }
          } catch (syncError) {
            console.error('❌ Exception lors de la sync du mot de passe:', syncError);
          }
        } else {
          console.log('⚠️ Le mot de passe fourni NE CORRESPOND PAS au mot de passe KV');
          console.log('   Mot de passe fourni:', password?.substring(0, 3) + '...');
          console.log('   Mot de passe KV:', matchingProfile.password?.substring(0, 3) + '...');
        }
      }
    }

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: emailToUse,
      password
    });


    if (authError) {
      console.error('❌ Erreur authentification:', authError);
      console.error('📧 Email utilisé pour la connexion:', emailToUse);
      console.error('🔑 Longueur du mot de passe:', password?.length || 0);
      console.error('🆔 Identifiant original:', userIdentifier);
      
      // Message plus détaillé pour aider au debugging
      let errorMessage: string;
      let hint: string;
      
      if (authError.code === 'invalid_credentials') {
        errorMessage = 'Identifiants incorrects';
        hint = 'Vérifiez votre mot de passe. Si vous avez oublié votre mot de passe, utilisez "Mot de passe oublié".';
        
        // Log pour le debug
        console.error('═══════════════════════════════════════════════');
        console.error('❌ ERREUR: Identifiants invalides');
        console.error('');
        console.error('🔍 Détails du diagnostic:');
        console.error('   - Email trouvé dans KV: OUI (', emailToUse, ')');
        console.error('   - Compte Auth Supabase: PROBABLEMENT OUI');
        console.error('   - Mot de passe: INCORRECT');
        console.error('');
        console.error('💡 SOLUTIONS POSSIBLES:');
        console.error('   1. Vérifier que le mot de passe est correct');
        console.error('   2. Utiliser "Mot de passe oublié" pour réinitialiser');
        console.error('   3. Si inscription récente, réessayer dans 30 secondes');
        console.error('═══════════════════════════════════════════════');
      } else if (authError.message.includes('Email not confirmed')) {
        errorMessage = 'Compte non activé';
        hint = 'Votre email n\'a pas été confirmé. Contactez le support.';
      } else {
        errorMessage = authError.message;
        hint = 'Essayez de vous reconnecter ou contactez le support.';
      }
      
      return c.json({ 
        success: false, 
        error: errorMessage,
        detail: hint,
        debug: {
          code: authError.code,
          emailUsed: emailToUse,
          identifier: userIdentifier
        }
      }, 401);
    }

    if (!authData.user) {
      return c.json({ 
        success: false, 
        error: 'Utilisateur non trouvé' 
      }, 401);
    }

    // Récupérer le profil depuis le KV store (chercher dans tous les préfixes)
    let profile = await kv.get(`profile:${authData.user.id}`);
    
    if (!profile) {
      profile = await kv.get(`driver:${authData.user.id}`);
      console.log('🔍 Cherché dans driver:', profile ? '✅ Trouvé' : '❌ Non trouvé');
    }
    
    if (!profile) {
      profile = await kv.get(`passenger:${authData.user.id}`);
      console.log('🔍 Cherché dans passenger:', profile ? '✅ Trouvé' : '❌ Non trouvé');
    }

    if (!profile) {
      console.log('ℹ️ Création automatique du profil pour:', authData.user.id);
      
      // Créer automatiquement le profil s'il n'existe pas
      profile = {
        id: authData.user.id,
        email: authData.user.email || emailToUse,
        full_name: authData.user.user_metadata?.full_name || authData.user.user_metadata?.name || (authData.user.email || emailToUse).split('@')[0],
        phone: authData.user.user_metadata?.phone || null,
        role: authData.user.user_metadata?.role || 'admin', // Par défaut admin pour les comptes existants
        balance: 0,
        password: password, // Stocker le mot de passe
        created_at: authData.user.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // Sauvegarder le nouveau profil
      await kv.set(`profile:${authData.user.id}`, profile);
      
      // Stocker aussi avec le préfixe du rôle
      const rolePrefix = profile.role === 'driver' ? 'driver:' : profile.role === 'passenger' ? 'passenger:' : 'admin:';
      await kv.set(`${rolePrefix}${authData.user.id}`, profile);
      
      console.log('✅ Profil créé automatiquement pour:', authData.user.id);
    } else {
      // Mettre à jour le mot de passe dans le profil existant
      profile.password = password;
      profile.updated_at = new Date().toISOString();
      
      // Déterminer le préfixe du rôle
      const rolePrefix = profile.role === 'driver' ? 'driver:' : profile.role === 'passenger' ? 'passenger:' : 'profile:';
      
      // Mettre à jour dans le bon préfixe uniquement
      await kv.set(`${rolePrefix}${authData.user.id}`, profile);
      
      console.log('✅ Profil mis à jour avec préfixe:', rolePrefix);
    }

    console.log('✅ Connexion réussie:', authData.user.id, '- Role:', profile.role);

    return c.json({
      success: true,
      user: authData.user,
      session: authData.session, // 🔥 CRITIQUE : Retourner la session COMPLÈTE (access_token + refresh_token)
      profile,
      accessToken: authData.session?.access_token // Backward compatibility
    });

  } catch (error) {
    console.error('❌ Erreur serveur lors de la connexion:', error);
    return c.json({ 
      success: false, 
      error: 'Erreur serveur lors de la connexion' 
    }, 500);
  }
});

// ============================================
// INSCRIPTION (SIGNUP)
// ============================================
authRoutes.post('/auth/signup', async (c) => {
  try {
    const { email, password, full_name, role, phone } = await c.req.json();
    
    // ✅ CORRECTION : Accepter phone OU email
    if ((!email && !phone) || !password || !full_name) {
      return c.json({ 
        success: false, 
        error: 'Email/téléphone, mot de passe et nom complet requis' 
      }, 400);
    }

    if (password.length < 6) {
      return c.json({ 
        success: false, 
        error: 'Le mot de passe doit contenir au moins 6 caractères' 
      }, 400);
    }

    // ✅ Générer un email automatique si seulement le téléphone est fourni
    // ✅ UNIFORMISATION : Utiliser @smartcabb.app au lieu de @smartcabb.local
    const emailToUse = email || `${phone.replace(/[^0-9]/g, '')}_${Date.now()}@smartcabb.app`;

    // Créer un client Supabase avec la clé service
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Créer l'utilisateur avec l'Admin API
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: emailToUse,
      password,
      email_confirm: true, // Auto-confirmer l'email
      user_metadata: {
        full_name,
        role: role || 'admin',
        phone: phone || null
      }
    });

    if (authError) {
      console.error('❌ Erreur création utilisateur:', authError);
      
      if (authError.message.includes('already')) {
        return c.json({ 
          success: false, 
          error: 'Un compte existe déjà avec cet email/téléphone' 
        }, 409);
      }
      
      return c.json({ 
        success: false, 
        error: authError.message 
      }, 400);
    }

    if (!authData.user) {
      return c.json({ 
        success: false, 
        error: 'Erreur lors de la création du compte' 
      }, 500);
    }

    // Créer le profil dans le KV store
    const profile = {
      id: authData.user.id,
      email: email || emailToUse,
      full_name,
      phone: phone || null,
      role: role || 'admin',
      balance: 0,
      password: password, // ⚠️ Stocker le mot de passe en clair pour le panel admin (dev/test seulement)
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await kv.set(`profile:${authData.user.id}`, profile);
    
    // Stocker aussi avec le préfixe du rôle pour faciliter la récupération
    const rolePrefix = role === 'driver' ? 'driver:' : role === 'passenger' ? 'passenger:' : 'admin:';
    await kv.set(`${rolePrefix}${authData.user.id}`, profile);

    console.log('✅ Compte créé avec succès:', authData.user.id);

    return c.json({
      success: true,
      user: authData.user,
      profile
    });

  } catch (error) {
    console.error('❌ Erreur serveur lors de l\'inscription:', error);
    return c.json({ 
      success: false, 
      error: 'Erreur serveur lors de l\'inscription' 
    }, 500);
  }
});

// ============================================
// VÉRIFICATION DE SESSION
// ============================================
authRoutes.get('/auth/session', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ 
        success: false, 
        error: 'Pas de token fourni' 
      }, 401);
    }

    // Créer un client Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Vérifier le token
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (error || !user) {
      return c.json({ 
        success: false, 
        error: 'Session invalide' 
      }, 401);
    }

    // Récupérer le profil
    let profile = await kv.get(`profile:${user.id}`);

    if (!profile) {
      // Créer le profil s'il n'existe pas
      profile = {
        id: user.id,
        email: user.email || '',
        full_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Admin',
        phone: user.user_metadata?.phone || null,
        role: user.user_metadata?.role || 'admin',
        balance: 0,
        created_at: user.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      await kv.set(`profile:${user.id}`, profile);
      console.log('✅ Profil créé automatiquement lors de la vérification de session');
    }

    return c.json({
      success: true,
      user,
      profile
    });

  } catch (error) {
    console.error('❌ Erreur vérification session:', error);
    return c.json({ 
      success: false, 
      error: 'Erreur serveur' 
    }, 500);
  }
});

// ============================================
// MOT DE PASSE OUBLIÉ - PAR EMAIL
// ============================================
authRoutes.post('/auth/forgot-password', async (c) => {
  try {
    const { email } = await c.req.json();
    
    if (!email) {
      return c.json({ 
        success: false, 
        error: 'Email requis' 
      }, 400);
    }

    console.log('📧 Demande de réinitialisation pour:', email);

    // Créer un client Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Envoyer l'email de réinitialisation via Supabase Auth
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://chief-mess-97839970.figma.site/auth/reset-password'
    });

    if (error) {
      console.error('❌ Erreur envoi email:', error);
      // Pour la sécurité, ne pas révéler si l'email existe ou non
      return c.json({
        success: true,
        message: 'Si un compte existe avec cet email, un lien a été envoyé'
      });
    }

    console.log('✅ Email de réinitialisation envoyé');

    return c.json({
      success: true,
      message: 'Email envoyé avec succès'
    });

  } catch (error) {
    console.error('❌ Erreur forgot-password:', error);
    return c.json({ 
      success: false, 
      error: 'Erreur serveur' 
    }, 500);
  }
});

// ============================================
// DIAGNOSTIC COMPTE ADMIN - VÉRIFIER ET RÉPARER
// ============================================
authRoutes.post('/auth/admin/diagnostic', async (c) => {
  try {
    const { email } = await c.req.json();
    
    if (!email) {
      return c.json({ 
        success: false, 
        error: 'Email requis' 
      }, 400);
    }

    console.log('🔍 DIAGNOSTIC pour email:', email);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const diagnostic = {
      email: email,
      existsInAuth: false,
      existsInKV: false,
      kvData: null,
      authData: null,
      canLogin: false,
      issues: [] as string[],
      fixes: [] as string[]
    };

    // 1. Vérifier dans Supabase Auth
    console.log('🔍 Vérification dans Supabase Auth...');
    const { data: authList } = await supabase.auth.admin.listUsers();
    const authUser = authList?.users?.find(u => u.email === email);
    
    if (authUser) {
      diagnostic.existsInAuth = true;
      diagnostic.authData = {
        id: authUser.id,
        email: authUser.email,
        created_at: authUser.created_at,
        email_confirmed_at: authUser.email_confirmed_at,
        metadata: authUser.user_metadata
      };
      console.log('✅ Trouvé dans Auth:', authUser.id);
    } else {
      diagnostic.issues.push('Compte inexistant dans Supabase Auth');
      console.log('❌ PAS trouvé dans Auth');
    }

    // 2. Vérifier dans le KV store
    console.log('🔍 Vérification dans KV store...');
    const allProfiles = await kv.getByPrefix('profile:');
    const allAdmins = await kv.getByPrefix('admin:');
    const kvProfile = [...allProfiles, ...allAdmins].find(p => p && p.email === email);
    
    if (kvProfile) {
      diagnostic.existsInKV = true;
      diagnostic.kvData = {
        id: kvProfile.id,
        email: kvProfile.email,
        full_name: kvProfile.full_name,
        role: kvProfile.role,
        phone: kvProfile.phone
      };
      console.log('✅ Trouvé dans KV:', kvProfile.id);
    } else {
      diagnostic.issues.push('Profil inexistant dans le KV store');
      console.log('❌ PAS trouvé dans KV');
    }

    // 3. Analyse et recommandations
    if (diagnostic.existsInAuth && diagnostic.existsInKV) {
      diagnostic.canLogin = true;
      diagnostic.fixes.push('✅ Le compte est OK, vous devriez pouvoir vous connecter');
      diagnostic.fixes.push('Si la connexion échoue, vérifiez que le mot de passe est correct');
    } else if (diagnostic.existsInAuth && !diagnostic.existsInKV) {
      diagnostic.issues.push('Profil manquant dans KV (sera créé automatiquement à la connexion)');
      diagnostic.canLogin = true;
      diagnostic.fixes.push('Le compte Auth existe, tentez de vous connecter - le profil sera créé auto');
    } else if (!diagnostic.existsInAuth && diagnostic.existsInKV) {
      diagnostic.issues.push('PROBLÈME: Profil KV existe mais pas de compte Auth');
      diagnostic.canLogin = false;
      diagnostic.fixes.push('❌ Vous devez créer le compte dans Auth avec /auth/admin/fix');
    } else {
      diagnostic.issues.push('PROBLÈME: Aucun compte trouvé nulle part');
      diagnostic.canLogin = false;
      diagnostic.fixes.push('❌ Créez un nouveau compte admin avec /auth/signup');
    }

    console.log('📊 Diagnostic complet:', diagnostic);

    return c.json({
      success: true,
      diagnostic
    });

  } catch (error) {
    console.error('❌ Erreur diagnostic:', error);
    return c.json({ 
      success: false, 
      error: 'Erreur serveur' 
    }, 500);
  }
});

// ============================================
// RÉPARER COMPTE ADMIN - CRÉER DANS AUTH SI MANQUANT
// ============================================
authRoutes.post('/auth/admin/fix', async (c) => {
  try {
    const { email, password, fullName } = await c.req.json();
    
    if (!email || !password) {
      return c.json({ 
        success: false, 
        error: 'Email et mot de passe requis' 
      }, 400);
    }

    if (password.length < 6) {
      return c.json({ 
        success: false, 
        error: 'Le mot de passe doit contenir au moins 6 caractères' 
      }, 400);
    }

    console.log('🔧 RÉPARATION compte pour:', email);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Vérifier si le compte Auth existe déjà
    const { data: authList } = await supabase.auth.admin.listUsers();
    const existingAuth = authList?.users?.find(u => u.email === email);

    if (existingAuth) {
      console.log('ℹ️ Compte Auth existe déjà:', existingAuth.id);
      
      // Mettre à jour le mot de passe si nécessaire
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        existingAuth.id,
        { password: password }
      );

      if (updateError) {
        console.error('❌ Erreur mise à jour mot de passe:', updateError);
      } else {
        console.log('✅ Mot de passe mis à jour');
      }

      return c.json({
        success: true,
        message: 'Compte Auth existe déjà, mot de passe mis à jour',
        userId: existingAuth.id,
        canLogin: true
      });
    }

    // Créer le compte dans Auth
    console.log('🆕 Création compte Auth...');
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName || 'Admin SmartCabb',
        role: 'admin'
      }
    });

    if (authError) {
      console.error('❌ Erreur création Auth:', authError);
      return c.json({ 
        success: false, 
        error: `Erreur Auth: ${authError.message}` 
      }, 500);
    }

    if (!authData.user) {
      return c.json({ 
        success: false, 
        error: 'Aucun utilisateur retourné par Auth' 
      }, 500);
    }

    console.log('✅ Compte Auth créé:', authData.user.id);

    // Créer le profil dans le KV store
    const profile = {
      id: authData.user.id,
      email,
      full_name: fullName || 'Admin SmartCabb',
      phone: null,
      role: 'admin',
      balance: 0,
      password: password,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await kv.set(`profile:${authData.user.id}`, profile);
    await kv.set(`admin:${authData.user.id}`, profile);

    console.log('✅ Profil KV créé');

    return c.json({
      success: true,
      message: 'Compte admin créé avec succès',
      userId: authData.user.id,
      canLogin: true,
      credentials: {
        email: email,
        password: '***' // Ne pas renvoyer le vrai mot de passe
      }
    });

  } catch (error) {
    console.error('❌ Erreur fix admin:', error);
    return c.json({ 
      success: false, 
      error: 'Erreur serveur' 
    }, 500);
  }
});

// ============================================
// ENDPOINT DE TEST - Vérifier config Africa's Talking
// ============================================
authRoutes.get('/test-sms-config', async (c) => {
  try {
    const username = Deno.env.get('AFRICAS_TALKING_USERNAME') ?? '';
    const apiKey = Deno.env.get('AFRICAS_TALKING_API_KEY') ?? '';

    console.log('🔍 TEST CONFIG SMS');
    console.log('Username présent:', !!username);
    console.log('Username value:', username || 'VIDE');
    console.log('API Key présente:', !!apiKey);
    console.log('API Key (10 premiers char):', apiKey ? apiKey.substring(0, 10) + '...' : 'VIDE');

    return c.json({
      success: true,
      config: {
        username_present: !!username,
        username_value: username || 'NON CONFIGURÉ',
        api_key_present: !!apiKey,
        api_key_preview: apiKey ? apiKey.substring(0, 10) + '...' : 'NON CONFIGURÉ'
      }
    });
  } catch (error) {
    console.error('❌ Erreur test config:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// ============================================
// ENDPOINT DE TEST - Envoyer un SMS réel
// ============================================
authRoutes.post('/test-sms-send', async (c) => {
  try {
    const { phoneNumber } = await c.req.json();
    
    if (!phoneNumber) {
      return c.json({ 
        success: false, 
        error: 'Numéro de téléphone requis' 
      }, 400);
    }

    console.log('🧪 TEST ENVOI SMS à:', phoneNumber);

    
    // ✅ NORMALISER LE NUMÉRO DE TÉLÉPHONE
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    
    if (!normalizedPhone) {
      console.error('❌ Format de numéro invalide:', phoneNumber);
      return c.json({
        success: false,
        error: `Format de numéro invalide: ${phoneNumber}. Format attendu: +243XXXXXXXXX`,
        originalPhone: phoneNumber
      }, 400);
    }
    
    console.log('✅ Numéro normalisé:', phoneNumber, '→', normalizedPhone);


    // Récupérer les credentials
    const username = Deno.env.get('AFRICAS_TALKING_USERNAME') ?? '';
    const apiKey = Deno.env.get('AFRICAS_TALKING_API_KEY') ?? '';

    console.log('🔑 Username présent:', !!username);
    console.log('🔑 Username value:', username || 'VIDE');
    console.log('🔑 API Key présente:', !!apiKey);
    console.log('🔑 API Key length:', apiKey?.length || 0);

    // Vérifier les credentials
    if (!username || !apiKey || username.trim() === '' || apiKey.trim() === '') {
      console.error('❌ Credentials manquantes');
      
      return c.json({ 
        success: false,
        error: 'Configuration SMS manquante. Veuillez configurer Africa\'s Talking dans les paramètres.',
        debug: {
          username_present: !!username,
          username_value: username || 'MANQUANT',
          api_key_present: !!apiKey,
          api_key_length: apiKey?.length || 0
        }
      }, 500);
    }

    // Générer un code de test
    const testCode = Math.floor(100000 + Math.random() * 900000).toString();
    const smsMessage = `SmartCabb TEST: Votre code est ${testCode}. Ceci est un message de test.`;

    console.log('📤 Envoi SMS de test...');
    console.log('📝 Message:', smsMessage);

    try {
      const smsResponse = await fetch('https://api.africastalking.com/version1/messaging', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'apiKey': apiKey,
          'Accept': 'application/json'
        },
        body: new URLSearchParams({
          username: username,

          to: normalizedPhone,

          to: phoneNumber,
          message: smsMessage
        }).toString()
      });

      const smsResult = await smsResponse.json();
      console.log('📥 Résultat Africa\'s Talking:', JSON.stringify(smsResult, null, 2));

      // Vérifier le statut
      const status = smsResult.SMSMessageData?.Recipients?.[0]?.status;
      const messageId = smsResult.SMSMessageData?.Recipients?.[0]?.messageId;
      const cost = smsResult.SMSMessageData?.Recipients?.[0]?.cost;

      if (status === 'Success' || status === 'Sent') {
        console.log('✅ SMS envoyé avec succès !');
        return c.json({
          success: true,
          message: 'SMS envoyé avec succès',
          testCode: testCode,
          smsDetails: {
            status: status,
            messageId: messageId,
            cost: cost,

            phoneNumber: normalizedPhone,
            originalPhone: phoneNumber

            phoneNumber: phoneNumber

          },
          rawResponse: smsResult
        });
      } else {
        console.error('❌ Échec envoi SMS:', status);
        return c.json({
          success: false,
          error: `Échec envoi SMS: ${status}`,
          testCode: testCode,
          smsDetails: {
            status: status || 'Unknown',
            messageId: messageId,
            phoneNumber: phoneNumber
          },
          rawResponse: smsResult
        }, 500);
      }

    } catch (smsError) {
      console.error('❌ Erreur lors de l\'appel API:', smsError);
      return c.json({ 
        success: false, 
        error: 'Erreur lors de l\'appel à Africa\'s Talking: ' + String(smsError),
        testCode: testCode
      }, 500);
    }

  } catch (error) {
    console.error('❌ Erreur test-sms-send:', error);
    return c.json({ 
      success: false, 
      error: 'Erreur serveur: ' + String(error) 
    }, 500);
  }
});

// ============================================
// SYNCHRONISER COMPTE ADMIN EXISTANT
// ============================================
authRoutes.post('/auth/admin/sync-existing', async (c) => {
  try {
    console.log('🔄 SYNCHRONISATION compte admin existant...');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Chercher le compte admin dans le KV store
    const allProfiles = await kv.getByPrefix('profile:');
    const allAdmins = await kv.getByPrefix('admin:');
    const allUsers = [...allProfiles, ...allAdmins];

    // Trouver le compte contact@smartcabb.com
    const adminProfile = allUsers.find(p => 
      p && p.email === 'contact@smartcabb.com' && p.role === 'admin'
    );

    if (!adminProfile) {
      return c.json({ 
        success: false, 
        error: 'Compte admin contact@smartcabb.com non trouvé dans le KV store' 
      }, 404);
    }

    console.log('✅ Profil admin trouvé dans KV:', adminProfile.id);

    // 2. Vérifier si le compte existe dans Supabase Auth
    const { data: authList } = await supabase.auth.admin.listUsers();
    const existingAuth = authList?.users?.find(u => u.email === 'contact@smartcabb.com');

    if (existingAuth) {
      console.log('✅ Compte Auth existe déjà:', existingAuth.id);
      
      // Mettre à jour le mot de passe à Admin123
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        existingAuth.id,
        { password: 'Admin123' }
      );

      if (updateError) {
        console.error('❌ Erreur mise à jour mot de passe:', updateError);
        return c.json({ 
          success: false, 
          error: `Erreur mise à jour: ${updateError.message}` 
        }, 500);
      }

      console.log('✅ Mot de passe mis à jour à Admin123');

      // Mettre à jour l'ID dans le KV si différent
      if (adminProfile.id !== existingAuth.id) {
        console.log('🔄 Mise à jour ID profil KV:', existingAuth.id);
        
        // Supprimer l'ancien profil
        await kv.del(`profile:${adminProfile.id}`);
        await kv.del(`admin:${adminProfile.id}`);
        
        // Créer avec le nouvel ID
        const updatedProfile = {
          ...adminProfile,
          id: existingAuth.id,
          password: 'Admin123',
          updated_at: new Date().toISOString()
        };
        
        await kv.set(`profile:${existingAuth.id}`, updatedProfile);
        await kv.set(`admin:${existingAuth.id}`, updatedProfile);
      }

      return c.json({
        success: true,
        message: 'Compte synchronisé avec succès',
        userId: existingAuth.id,
        email: 'contact@smartcabb.com'
      });
    }

    // 3. Créer le compte dans Auth s'il n'existe pas
    console.log('🆕 Création compte Auth pour contact@smartcabb.com...');
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: 'contact@smartcabb.com',
      password: 'Admin123',
      email_confirm: true,
      user_metadata: {
        full_name: adminProfile.full_name || 'Admin SmartCabb',
        role: 'admin'
      }
    });

    if (authError) {
      console.error('❌ Erreur création Auth:', authError);
      return c.json({ 
        success: false, 
        error: `Erreur Auth: ${authError.message}` 
      }, 500);
    }

    if (!authData.user) {
      return c.json({ 
        success: false, 
        error: 'Aucun utilisateur retourné par Auth' 
      }, 500);
    }

    console.log('✅ Compte Auth créé:', authData.user.id);

    // Supprimer l'ancien profil
    await kv.del(`profile:${adminProfile.id}`);
    await kv.del(`admin:${adminProfile.id}`);

    // Créer le nouveau profil avec le bon ID
    const newProfile = {
      ...adminProfile,
      id: authData.user.id,
      email: 'contact@smartcabb.com',
      password: 'Admin123',
      updated_at: new Date().toISOString()
    };

    await kv.set(`profile:${authData.user.id}`, newProfile);
    await kv.set(`admin:${authData.user.id}`, newProfile);

    console.log('✅ Profil KV mis à jour avec le nouvel ID');

    return c.json({
      success: true,
      message: 'Compte créé et synchronisé avec succès',
      userId: authData.user.id,
      email: 'contact@smartcabb.com'
    });

  } catch (error) {
    console.error('❌ Erreur sync admin:', error);
    return c.json({ 
      success: false, 
      error: 'Erreur serveur' 
    }, 500);
  }
});

// ============================================
// CRÉER/SYNCHRONISER COMPTE SUPPORT
// ============================================
authRoutes.post('/auth/support/create', async (c) => {
  try {
    console.log('🔧 CRÉATION/SYNCHRONISATION compte support@smartcabb.com...');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Vérifier si le compte existe déjà dans Supabase Auth
    const { data: authList } = await supabase.auth.admin.listUsers();
    const existingAuth = authList?.users?.find(u => u.email === 'support@smartcabb.com');

    if (existingAuth) {
      console.log('✅ Compte Auth existe déjà:', existingAuth.id);
      
      // Mettre à jour le mot de passe
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        existingAuth.id,
        { password: 'Support2026!' }
      );

      if (updateError) {
        console.error('❌ Erreur mise à jour mot de passe:', updateError);
        return c.json({ 
          success: false, 
          error: `Erreur mise à jour: ${updateError.message}` 
        }, 500);
      }

      console.log('✅ Mot de passe mis à jour à Support2026!');

      // Créer/Mettre à jour le profil dans le KV store
      const profile = {
        id: existingAuth.id,
        email: 'support@smartcabb.com',
        full_name: 'Support SmartCabb',
        phone: '+243999999999',
        role: 'admin',
        balance: 0,
        password: 'Support2026!',
        created_at: existingAuth.created_at,
        updated_at: new Date().toISOString()
      };

      await kv.set(`profile:${existingAuth.id}`, profile);
      await kv.set(`admin:${existingAuth.id}`, profile);

      return c.json({
        success: true,
        message: 'Compte support synchronisé avec succès',
        userId: existingAuth.id,
        email: 'support@smartcabb.com',
        password: 'Support2026!',
        note: 'Mot de passe mis à jour'
      });
    }

    // 2. Créer le compte dans Auth s'il n'existe pas
    console.log('🆕 Création nouveau compte Auth pour support@smartcabb.com...');
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: 'support@smartcabb.com',
      password: 'Support2026!',
      email_confirm: true,
      user_metadata: {
        full_name: 'Support SmartCabb',
        role: 'admin'
      }
    });

    if (authError) {
      console.error('❌ Erreur création Auth:', authError);
      return c.json({ 
        success: false, 
        error: `Erreur Auth: ${authError.message}` 
      }, 500);
    }

    if (!authData.user) {
      return c.json({ 
        success: false, 
        error: 'Aucun utilisateur retourné par Auth' 
      }, 500);
    }

    console.log('✅ Compte Auth créé:', authData.user.id);

    // 3. Créer le profil dans le KV store
    const newProfile = {
      id: authData.user.id,
      email: 'support@smartcabb.com',
      full_name: 'Support SmartCabb',
      phone: '+243999999999',
      role: 'admin',
      balance: 0,
      password: 'Support2026!',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await kv.set(`profile:${authData.user.id}`, newProfile);
    await kv.set(`admin:${authData.user.id}`, newProfile);

    console.log('✅ Profil KV créé');

    return c.json({
      success: true,
      message: 'Compte support créé avec succès',
      userId: authData.user.id,
      email: 'support@smartcabb.com',
      password: 'Support2026!',
      note: 'Utilisez ces identifiants pour vous connecter'
    });

  } catch (error) {
    console.error('❌ Erreur création support:', error);
    return c.json({ 
      success: false, 
      error: 'Erreur serveur: ' + String(error)
    }, 500);
  }
});

// ============================================
// NETTOYER COMPTES ADMIN INDÉSIRABLES
// ============================================
authRoutes.post('/auth/admin/cleanup', async (c) => {
  try {
    console.log('🧹 NETTOYAGE comptes admin indésirables...');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: authList } = await supabase.auth.admin.listUsers();
    const adminEmails = ['admin@smartcabb.cd', 'admin@smartcabb.com'];
    const deletedAccounts: string[] = [];

    // Supprimer les comptes admin@smartcabb.cd et admin@smartcabb.com
    for (const user of (authList?.users || [])) {
      if (adminEmails.includes(user.email || '')) {
        console.log('🗑️ Suppression compte:', user.email);
        
        const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
        
        if (deleteError) {
          console.error('❌ Erreur suppression:', user.email, deleteError);
        } else {
          console.log('✅ Supprimé:', user.email);
          deletedAccounts.push(user.email || '');
          
          // Supprimer aussi du KV store
          await kv.del(`profile:${user.id}`);
          await kv.del(`admin:${user.id}`);
        }
      }
    }

    return c.json({
      success: true,
      message: `Nettoyage terminé. ${deletedAccounts.length} compte(s) supprimé(s)`,
      deletedAccounts
    });

  } catch (error) {
    console.error('❌ Erreur cleanup:', error);
    return c.json({ 
      success: false, 
      error: 'Erreur serveur' 
    }, 500);
  }
});

// ============================================
// RÉINITIALISATION PAR TÉLÉPHONE - ÉTAPE 1 : ENVOYER OTP
// ============================================
authRoutes.post('/send-reset-otp', async (c) => {
  try {
    const { phoneNumber } = await c.req.json();
    
    if (!phoneNumber) {
      return c.json({ 
        success: false, 
        error: 'Numéro de téléphone requis' 
      }, 400);
    }

    console.log('📞 Demande de réinitialisation pour:', phoneNumber);

    // Créer un client Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 🔧 CORRIGER : Chercher dans la table profiles au lieu du KV store
    console.log('🔍 Recherche du profil dans la table profiles...');
    
    // Normaliser le numéro pour la recherche (plusieurs formats possibles)
    const normalizePhone = (phone: string): string[] => {
      const clean = phone.replace(/[\s()\-]/g, '');
      const formats = [clean];
      
      if (clean.startsWith('+243')) {
        formats.push(clean.substring(4)); // Sans +243
        formats.push('0' + clean.substring(4)); // Avec 0
        formats.push(clean.substring(1)); // Sans +
      } else if (clean.startsWith('243')) {
        formats.push('+' + clean); // Avec +
        formats.push('0' + clean.substring(3)); // Avec 0
      } else if (clean.startsWith('0')) {
        formats.push('+243' + clean.substring(1)); // Avec +243
        formats.push('243' + clean.substring(1)); // Avec 243
      }
      
      return [...new Set(formats)]; // Enlever les doublons
    };
    
    const phoneFormats = normalizePhone(phoneNumber);
    console.log('🔍 Formats de téléphone à chercher:', phoneFormats);
    
    // Chercher l'utilisateur dans la table profiles
    const { data: profiles, error: searchError } = await supabase
      .from('profiles')
      .select('id, email, phone, full_name')
      .in('phone', phoneFormats)
      .limit(1);
    
    if (searchError) {
      console.error('❌ Erreur recherche profil:', searchError);
    }
    
    console.log('📊 Profils trouvés:', profiles?.length || 0);
    if (profiles && profiles.length > 0) {
      console.log('✅ Profil trouvé:', { id: profiles[0].id, email: profiles[0].email, phone: profiles[0].phone });
    }

    let userProfile = profiles && profiles.length > 0 ? profiles[0] : null;
    let userId = userProfile?.id || null;

    if (!userProfile || !userId) {
      // Pour la sécurité, ne pas révéler si le numéro existe ou non
      console.log('⚠️ Aucun utilisateur trouvé avec ce numéro:', phoneNumber);
      console.log('⚠️ Formats testés:', phoneFormats);
      
      // ❌ NE PAS ENVOYER DE CODE SI LE COMPTE N'EXISTE PAS
      return c.json({ 
        success: false,
        error: 'Aucun compte trouvé avec ce numéro. Veuillez créer un compte.'
      }, 404);
    }

    // Générer un code OTP à 6 chiffres
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Stocker le code OTP dans le KV store avec expiration de 13 minutes
    const otpData = {
      code: otpCode,
      userId: userId,
      phoneNumber: phoneNumber,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 13 * 60 * 1000).toISOString(), // 13 minutes
      used: false
    };

    await kv.set(`reset_otp:${phoneNumber}`, otpData);

    console.log('✅ Code OTP généré:', otpCode, 'pour', phoneNumber, 'userId:', userId);

    // Envoyer le SMS via Africa's Talking
    const username = Deno.env.get('AFRICAS_TALKING_USERNAME') ?? '';
    const apiKey = Deno.env.get('AFRICAS_TALKING_API_KEY') ?? '';

    console.log('🔑 Africa\'s Talking - Username présent:', !!username);
    console.log('🔑 Africa\'s Talking - Username value:', username || 'VIDE');
    console.log('🔑 Africa\'s Talking - API Key présente:', !!apiKey);
    console.log('🔑 Africa\'s Talking - API Key length:', apiKey?.length || 0);

    if (!username || !apiKey || username.trim() === '' || apiKey.trim() === '') {
      console.error('❌ Africa\'s Talking credentials manquantes ou vides');
      console.error('Username:', username || 'MANQUANT');
      console.error('Username length:', username?.length || 0);
      console.error('API Key:', apiKey ? `présente (${apiKey.length} chars)` : 'MANQUANTE');
      
      return c.json({ 
        success: false,
        error: 'Configuration SMS manquante. Impossible d\'envoyer le code OTP.'
      }, 500);
    }

    console.log('✅ Credentials OK, envoi du SMS via Africa\'s Talking...');

    // ✅ NORMALISER LE NUMÉRO DE TÉLÉPHONE
    console.log('🔧 Normalisation du numéro:', phoneNumber);
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    
    if (!normalizedPhone) {
      console.error('❌ Format de numéro invalide:', phoneNumber);
      return c.json({
        success: false,
        error: `Format de numéro invalide: ${phoneNumber}. Format attendu: +243XXXXXXXXX`
      }, 400);
    }
    
    if (!isValidPhoneNumber(normalizedPhone)) {
      console.error('❌ Numéro normalisé invalide:', normalizedPhone);
      return c.json({
        success: false,
        error: 'Le numéro normalisé est invalide'
      }, 400);
    }
    
    console.log('✅ Numéro normalisé:', normalizedPhone);

    try {
      const smsMessage = `SmartCabb: Votre code de réinitialisation est ${otpCode}. Valide pendant 13 minutes. Ne partagez ce code avec personne.`;

      console.log('📤 Envoi SMS à:', normalizedPhone);

    try {
      const smsMessage = `SmartCabb: Votre code de réinitialisation est ${otpCode}. Valide pendant 13 minutes. Ne partagez ce code avec personne.`;

      console.log('📤 Envoi SMS à:', phoneNumber);

      console.log('📝 Message:', smsMessage);

      const smsResponse = await fetch('https://api.africastalking.com/version1/messaging', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'apiKey': apiKey,
          'Accept': 'application/json'
        },
        body: new URLSearchParams({
          username: username,

          to: normalizedPhone,

          to: phoneNumber,

          message: smsMessage,
          from: 'SMARTCABB' // ✅ Sender ID officiel SmartCabb
        }).toString()
      });

      console.log('📡 Code HTTP reçu:', smsResponse.status);

      // Vérifier l'erreur HTTP avant de parser JSON
      if (!smsResponse.ok) {
        const errorText = await smsResponse.text();
        console.error('❌ Erreur HTTP Africa\'s Talking:', smsResponse.status, errorText);
        return c.json({
          success: false,
          error: `Erreur HTTP ${smsResponse.status}: ${errorText}. Vérifiez: 1) API Key correcte, 2) Username exact (${username}), 3) Compte activé`
        }, 500);
      }

      const smsResult = await smsResponse.json();
      console.log('📤 Résultat envoi SMS:', JSON.stringify(smsResult, null, 2));

      // Enregistrer le SMS dans la table
      try {
        await supabase
          .from('sms_logs')
          .insert({

            phone_number: normalizedPhone,
            phone_number: phoneNumber,

            message: smsMessage,
            status: smsResult.SMSMessageData?.Recipients?.[0]?.status || 'unknown',
            provider: 'africas_talking',
            type: 'reset_password_otp',

            metadata: { otpCode: otpCode, response: smsResult, originalPhone: phoneNumber }

            metadata: { otpCode: otpCode, response: smsResult }

          });
      } catch (error) {
        console.warn('⚠️ Impossible d\'enregistrer le SMS dans la table:', error);
      }

      // Vérifier si l'envoi a réussi
      if (smsResult.SMSMessageData?.Recipients?.[0]) {
        const recipient = smsResult.SMSMessageData.Recipients[0];
        const status = recipient.status;
        const statusCode = recipient.statusCode;
        
        console.log('📊 Status destinataire:', status, 'Code:', statusCode);
        
        // ✅ CORRECTION : Gestion spécifique du solde insuffisant
        if (status === 'InsufficientBalance' || statusCode === '405' || statusCode === 405) {
          const warnMsg = '⚠️ SOLDE INSUFFISANT sur votre compte Africa\'s Talking. Le code OTP a été généré mais le SMS n\'a pas pu être envoyé.';
          console.warn(warnMsg);
          console.log('💡 Code OTP disponible dans les logs pour test:', otpCode);
          // Retourner quand même succès car l'OTP est généré, juste informer sur le SMS
          return c.json({
            success: true,
            userId: userId,
            message: 'Code généré (SMS non envoyé - solde insuffisant)',
            warning: 'Solde SMS insuffisant - Veuillez recharger votre compte Africa\'s Talking',
            otpCode: otpCode // ✅ Inclure le code pour debug en cas de solde insuffisant
          });
        }
        
        // Accepter plusieurs codes de succès
        if (status === 'Success' || statusCode === '101' || statusCode === 101 || statusCode === '100' || statusCode === 100) {
          console.log('✅ SMS OTP accepté par Africa\'s Talking');
        } else {
          const errorMsg = `SMS rejeté par Africa's Talking - Code: ${statusCode}, Status: ${status}`;
          console.error('❌', errorMsg);
          // ⚠️ Ne pas bloquer l'utilisateur, juste logger l'erreur
          console.log('💡 Code OTP disponible pour debug:', otpCode);
        }
      } else {
        console.warn('⚠️ Aucun destinataire dans la réponse');
        console.log('📊 Réponse complète:', JSON.stringify(smsResult));
      }

      return c.json({
        success: true,
        userId: userId,
        message: 'Code envoyé par SMS'
      });

    } catch (smsError) {
      console.error('❌ Erreur envoi SMS:', smsError);
      return c.json({ 
        success: false, 
        error: 'Erreur lors de l\'envoi du SMS: ' + String(smsError)
      }, 500);
    }

  } catch (error) {
    console.error('❌ Erreur send-reset-otp:', error);
    return c.json({ 
      success: false, 
      error: 'Erreur serveur: ' + String(error)
    }, 500);
  }
});

// ============================================
// RÉINITIALISATION PAR TÉLÉPHONE - ÉTAPE 2 : VÉRIFIER OTP
// ============================================
authRoutes.post('/verify-reset-otp', async (c) => {
  try {
    const { phoneNumber, otpCode, userId } = await c.req.json();
    
    if (!phoneNumber || !otpCode) {
      return c.json({ 
        success: false, 
        error: 'Numéro et code requis' 
      }, 400);
    }

    console.log('🔍 Vérification OTP pour:', phoneNumber);

    // Récupérer le code OTP stocké
    const otpData = await kv.get(`reset_otp:${phoneNumber}`);

    if (!otpData) {
      console.log('❌ Aucun code OTP trouvé pour ce numéro');
      return c.json({ 
        success: false, 
        error: 'Code invalide ou expiré' 
      }, 400);
    }

    // Vérifier si le code a expiré
    const expiresAt = new Date(otpData.expiresAt);
    if (new Date() > expiresAt) {
      console.log('❌ Code OTP expiré');
      await kv.del(`reset_otp:${phoneNumber}`);
      return c.json({ 
        success: false, 
        error: 'Code expiré. Demandez un nouveau code.' 
      }, 400);
    }

    // Vérifier si le code a déjà été utilisé
    if (otpData.used) {
      console.log('❌ Code OTP déjà utilisé');
      return c.json({ 
        success: false, 
        error: 'Code déjà utilisé. Demandez un nouveau code.' 
      }, 400);
    }

    // Vérifier le code
    if (otpData.code !== otpCode) {
      console.log('❌ Code OTP incorrect');
      return c.json({ 
        success: false, 
        error: 'Code incorrect' 
      }, 400);
    }

    console.log('✅ Code OTP valide pour:', phoneNumber);

    // Marquer le code comme vérifié (mais pas encore utilisé)
    otpData.verified = true;
    otpData.verifiedAt = new Date().toISOString();
    await kv.set(`reset_otp:${phoneNumber}`, otpData);

    return c.json({
      success: true,
      message: 'Code vérifié avec succès'
    });

  } catch (error) {
    console.error('❌ Erreur verify-reset-otp:', error);
    return c.json({ 
      success: false, 
      error: 'Erreur serveur' 
    }, 500);
  }
});

// ============================================
// RÉINITIALISATION PAR TÉLÉPHONE - ÉTAPE 3 : CHANGER MOT DE PASSE
// ============================================
authRoutes.post('/reset-password-by-phone', async (c) => {
  try {
    const { userId, phoneNumber, otpCode, newPassword } = await c.req.json();
    
    if (!phoneNumber || !otpCode || !newPassword) {
      return c.json({ 
        success: false, 
        error: 'Tous les champs sont requis' 
      }, 400);
    }

    if (newPassword.length < 6) {
      return c.json({ 
        success: false, 
        error: 'Le mot de passe doit contenir au moins 6 caractères' 
      }, 400);
    }

    console.log('🔄 Réinitialisation du mot de passe pour:', phoneNumber);

    // Vérifier le code OTP une dernière fois
    const otpData = await kv.get(`reset_otp:${phoneNumber}`);

    if (!otpData || !otpData.verified || otpData.used) {
      return c.json({ 
        success: false, 
        error: 'Code invalide, non vérifié ou déjà utilisé' 
      }, 400);
    }

    // Vérifier expiration
    const expiresAt = new Date(otpData.expiresAt);
    if (new Date() > expiresAt) {
      await kv.del(`reset_otp:${phoneNumber}`);
      return c.json({ 
        success: false, 
        error: 'Code expiré' 
      }, 400);
    }

    // Créer un client Supabase Admin
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Mettre à jour le mot de passe de l'utilisateur
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      otpData.userId,
      { password: newPassword }
    );

    if (updateError) {
      console.error('❌ Erreur mise à jour mot de passe:', updateError);
      return c.json({ 
        success: false, 
        error: 'Erreur lors de la mise à jour du mot de passe' 
      }, 500);
    }

    console.log('✅ Mot de passe mis à jour pour:', otpData.userId);

    // Marquer le code comme utilisé
    otpData.used = true;
    otpData.usedAt = new Date().toISOString();
    await kv.set(`reset_otp:${phoneNumber}`, otpData);

    // Supprimer le code après 1 minute (pour éviter la réutilisation)
    setTimeout(async () => {
      await kv.del(`reset_otp:${phoneNumber}`);
    }, 60000);

    return c.json({
      success: true,
      message: 'Mot de passe réinitialisé avec succès'
    });

  } catch (error) {
    console.error('❌ Erreur reset-password-by-phone:', error);
    return c.json({ 
      success: false, 
      error: 'Erreur serveur' 
    }, 500);
  }
});

// ============================================
// RÉCUPÉRER L'EMAIL PAR NUMÉRO DE TÉLÉPHONE (POUR CONNEXION)
// ============================================
authRoutes.post('/auth/get-email-by-phone', async (c) => {
  try {
    const { phoneNumber } = await c.req.json();
    
    if (!phoneNumber) {
      return c.json({ 
        success: false, 
        error: 'Numéro de téléphone requis' 
      }, 400);
    }

    console.log('🔍 Recherche email pour le numéro:', phoneNumber);

    // Normaliser le numéro pour la recherche (plusieurs formats possibles)
    const normalizePhone = (phone: string): string[] => {
      const clean = phone.replace(/[\s()\-]/g, '');
      const formats = [clean];
      
      if (clean.startsWith('+243')) {
        formats.push(clean.substring(4)); // Sans +243
        formats.push('0' + clean.substring(4)); // Avec 0
        formats.push(clean.substring(1)); // Sans +
      } else if (clean.startsWith('243')) {
        formats.push('+' + clean); // Avec +
        formats.push('0' + clean.substring(3)); // Avec 0
      } else if (clean.startsWith('0')) {
        formats.push('+243' + clean.substring(1)); // Avec +243
        formats.push('243' + clean.substring(1)); // Avec 243
      }
      
      return [...new Set(formats)]; // Enlever les doublons
    };
    
    const phoneFormats = normalizePhone(phoneNumber);
    console.log('🔍 Formats de téléphone à chercher:', phoneFormats);

    // Chercher dans TOUS les préfixes (profile:, driver:, passenger:)
    const allProfiles = await kv.getByPrefix('profile:');
    const allDrivers = await kv.getByPrefix('driver:');
    const allPassengers = await kv.getByPrefix('passenger:');
    
    console.log(`📊 Total profils dans KV: ${allProfiles.length}`);
    console.log(`📊 Total conducteurs dans KV: ${allDrivers.length}`);
    console.log(`📊 Total passagers dans KV: ${allPassengers.length}`);
    
    // Combiner tous les profils
    const allUsers = [...allProfiles, ...allDrivers, ...allPassengers];
    
    // Log de tous les téléphones dans le KV pour debug
    console.log('📱 Téléphones dans le KV store:');
    allUsers.forEach((user, index) => {
      if (user && user.phone) {
        console.log(`  ${index + 1}. ${user.phone} (${user.role}) - Email: ${user.email}`);
      }
    });

    // Fonction pour normaliser un numéro au format +243XXXXXXXXX
    const normalizeToStandardFormat = (phone: string): string => {
      const clean = phone.replace(/[\s+()\-]/g, '');
      if (clean.length === 9) {
        return `+243${clean}`;
      } else if (clean.length === 10 && clean.startsWith('0')) {
        return `+243${clean.substring(1)}`;
      } else if (clean.length === 12 && clean.startsWith('243')) {
        return `+${clean}`;
      } else if (clean.length === 13 && clean.startsWith('+243')) {
        return clean;
      } else if (clean.startsWith('243')) {
        return `+${clean}`;
      } else if (clean.startsWith('0')) {
        return `+243${clean.substring(1)}`;
      }
      return clean;
    };
    
    const normalizedSearchPhone = normalizeToStandardFormat(phoneNumber);
    console.log('📱 Numéro de recherche normalisé:', normalizedSearchPhone);
    
    // Chercher le profil qui correspond au numéro
    const matchingProfile = allUsers.find(p => {
      if (!p || !p.phone) return false;
      const normalizedProfilePhone = normalizeToStandardFormat(p.phone);
      const matches = normalizedProfilePhone === normalizedSearchPhone;
      if (matches) {
        console.log(`✅ Match trouvé! ${normalizedSearchPhone} === ${normalizedProfilePhone}`);
      }
      return matches;
    });

    if (matchingProfile && matchingProfile.email) {
      console.log('✅ Email trouvé dans KV:', matchingProfile.email);
      console.log('✅ Rôle du profil:', matchingProfile.role);
      return c.json({
        success: true,
        email: matchingProfile.email,
        userId: matchingProfile.id,
        role: matchingProfile.role
      });
    }

    console.log('⚠️ Aucun email trouvé pour ce numéro');
    return c.json({ 
      success: false, 
      error: 'Aucun compte trouvé avec ce numéro' 
    }, 404);

  } catch (error) {
    console.error('❌ Erreur get-email-by-phone:', error);
    return c.json({ 
      success: false, 
      error: 'Erreur serveur' 
    }, 500);
  }
});

// ============================================
// VÉRIFIER SI UN NUMÉRO DE TÉLÉPHONE EXISTE
// ============================================
authRoutes.post('/auth/check-phone-exists', async (c) => {
  try {
    const { phoneNumber } = await c.req.json();
    
    if (!phoneNumber) {
      return c.json({ 
        success: false, 
        error: 'Numéro de téléphone requis' 
      }, 400);
    }

    console.log('🔍 Vérification existence du numéro:', phoneNumber);

    // Normaliser le numéro de téléphone
    const normalizePhone = (phone: string): string[] => {
      const clean = phone.replace(/[\s()\-]/g, '');
      const formats: string[] = [clean];
      
      if (clean.startsWith('+243')) {
        const digits = clean.substring(4);
        formats.push(`+243${digits}`);
        formats.push(`243${digits}`);
        formats.push(`0${digits}`);
      } else if (clean.startsWith('243')) {
        const digits = clean.substring(3);
        formats.push(`+243${digits}`);
        formats.push(`243${digits}`);
        formats.push(`0${digits}`);
      } else if (clean.startsWith('0')) {
        const digits = clean.substring(1);
        formats.push(`+243${digits}`);
        formats.push(`243${digits}`);
        formats.push(`0${digits}`);
      }
      
      return [...new Set(formats)];
    };

    const phoneFormats = normalizePhone(phoneNumber);
    console.log('📱 Formats à chercher:', phoneFormats);

    // 🔥 CHERCHER DANS LE KV STORE AU LIEU DE LA TABLE PROFILES
    console.log('🔍 Recherche dans le KV store...');
    
    // Chercher dans tous les profils du KV store
    const allProfiles = await kv.getByPrefix('profile:');
    console.log(`📊 ${allProfiles.length} profils trouvés dans le KV store`);
    
    let foundEmail = null;
    let foundProfile = null;
    
    for (const profileData of allProfiles) {
      if (profileData && profileData.phone) {
        // Vérifier si le téléphone correspond à un des formats
        if (phoneFormats.includes(profileData.phone)) {
          foundEmail = profileData.email;
          foundProfile = profileData;
          console.log('✅ Profil trouvé dans KV:', { id: profileData.id, email: profileData.email, phone: profileData.phone });
          break;
        }
      }
    }
    
    if (!foundEmail) {
      console.log('❌ Aucun profil trouvé avec ce numéro dans le KV store');
      return c.json({
        success: true,
        exists: false
      });
    }

    return c.json({
      success: true,
      exists: true,
      email: foundEmail
    });

  } catch (error) {
    console.error('❌ Erreur check-phone-exists:', error);
    return c.json({ 
      success: false, 
      error: 'Erreur serveur' 
    }, 500);
  }
});

// ============================================
// 🔥 NOUVELLE ROUTE : RÉCUPÉRER L'EMAIL PAR TÉLÉPHONE (KV STORE)
// ============================================
authRoutes.post('/auth/get-email-by-phone', async (c) => {
  try {
    const { phoneNumber } = await c.req.json();
    
    if (!phoneNumber) {
      return c.json({ 
        success: false, 
        error: 'Numéro de téléphone requis' 
      }, 400);
    }

    console.log('🔥 Récupération email par téléphone (KV store):', phoneNumber);

    // Normaliser le numéro de téléphone
    const normalizePhone = (phone: string): string[] => {
      const clean = phone.replace(/[\s()\-]/g, '');
      const formats: string[] = [clean];
      
      if (clean.startsWith('+243')) {
        const digits = clean.substring(4);
        formats.push(`+243${digits}`);
        formats.push(`243${digits}`);
        formats.push(`0${digits}`);
      } else if (clean.startsWith('243')) {
        const digits = clean.substring(3);
        formats.push(`+243${digits}`);
        formats.push(`243${digits}`);
        formats.push(`0${digits}`);
      } else if (clean.startsWith('0')) {
        const digits = clean.substring(1);
        formats.push(`+243${digits}`);
        formats.push(`243${digits}`);
        formats.push(`0${digits}`);
      }
      
      return [...new Set(formats)];
    };

    const phoneFormats = normalizePhone(phoneNumber);
    console.log('📱 Formats à chercher:', phoneFormats);

    // 🔥 CHERCHER DANS LE KV STORE
    console.log('🔍 Recherche dans le KV store...');
    
    // Chercher dans tous les profils
    const allProfiles = await kv.getByPrefix('profile:');
    console.log(`📊 ${allProfiles.length} profils trouvés`);
    
    for (const profileData of allProfiles) {
      if (profileData && profileData.phone) {
        // Vérifier si le téléphone correspond
        if (phoneFormats.includes(profileData.phone)) {
          console.log('✅ Profil trouvé (KV) avec phone:', profileData.phone);
          
          // 🔥 CRITIQUE : Récupérer l'email Auth RÉEL depuis Supabase (pas l'email du profil)
          console.log('🔍 Récupération de l\'email Auth depuis Supabase...');
          try {
            const { createClient } = await import('npm:@supabase/supabase-js@2');
            const supabase = createClient(
              Deno.env.get('SUPABASE_URL') ?? '',
              Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
            );
            
            // ✅ Validation UUID avant appel
            if (!isValidUUID(profileData.id)) {
              console.log('⚠️ ID profil invalide (pas un UUID), utilisation email profil');
              return c.json({
                success: true,
                email: profileData.email,
                userId: profileData.id
              });
            }
            
            const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(profileData.id);
            
            if (authError || !authUser || !authUser.user || !authUser.user.email) {
              console.error('❌ Erreur récupération Auth user:', authError);
              console.log('⚠️ Fallback : utilisation de l\'email du profil');
              return c.json({
                success: true,
                email: profileData.email,
                userId: profileData.id
              });
            }
            
            const authEmail = authUser.user.email;
            console.log(`✅ Email Auth trouvé: ${authEmail} (email profil: ${profileData.email})`);
            
            // ✅ RETOURNER L'EMAIL AUTH (pas l'email du profil)
            return c.json({
              success: true,
              email: authEmail,  // Email réel dans Supabase Auth
              profileEmail: profileData.email,  // Email dans le profil (peut être différent)
              userId: profileData.id
            });
          } catch (error) {
            console.error('❌ Erreur accès Supabase Auth:', error);
            // Fallback : utiliser l'email du profil
            return c.json({
              success: true,
              email: profileData.email,
              userId: profileData.id
            });
          }
        }
      }
    }
    
    // Si pas trouvé dans profile:, chercher dans user:, passenger:, driver:
    console.log('🔍 Recherche dans user:...');
    const allUsers = await kv.getByPrefix('user:');
    console.log(`📊 ${allUsers.length} users trouvés`);
    
    for (const userData of allUsers) {
      if (userData && userData.phone) {
        if (phoneFormats.includes(userData.phone)) {
          console.log('✅ User trouvé (user:) avec phone:', userData.phone);
          
          try {
            const { createClient } = await import('npm:@supabase/supabase-js@2');
            const supabase = createClient(
              Deno.env.get('SUPABASE_URL') ?? '',
              Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
            );
            
            // ✅ Validation UUID
            if (!isValidUUID(userData.id)) {
              console.log('⚠️ ID user invalide, skip Auth check');
              return c.json({
                success: true,
                email: userData.email,
                userId: userData.id
              });
            }
            
            const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userData.id);
            
            if (authError || !authUser || !authUser.user || !authUser.user.email) {
              return c.json({
                success: true,
                email: userData.email,
                userId: userData.id
              });
            }
            
            const authEmail = authUser.user.email;
            console.log(`✅ Email Auth trouvé: ${authEmail}`);
            
            return c.json({
              success: true,
              email: authEmail,
              profileEmail: userData.email,
              userId: userData.id
            });
          } catch (error) {
            return c.json({
              success: true,
              email: userData.email,
              userId: userData.id
            });
          }
        }
      }
    }
    
    console.log('🔍 Recherche dans passenger:...');
    const allPassengers = await kv.getByPrefix('passenger:');
    console.log(`📊 ${allPassengers.length} passengers trouvés`);
    
    for (const passengerData of allPassengers) {
      if (passengerData && passengerData.phone) {
        if (phoneFormats.includes(passengerData.phone)) {
          console.log('✅ Passenger trouvé (passenger:) avec phone:', passengerData.phone);
          
          try {
            const { createClient } = await import('npm:@supabase/supabase-js@2');
            const supabase = createClient(
              Deno.env.get('SUPABASE_URL') ?? '',
              Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
            );
            
            // ✅ Validation UUID
            if (!isValidUUID(passengerData.id)) {
              console.log('⚠️ ID passenger invalide, skip Auth check');
              return c.json({
                success: true,
                email: passengerData.email,
                userId: passengerData.id
              });
            }
            
            const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(passengerData.id);
            
            if (authError || !authUser || !authUser.user || !authUser.user.email) {
              return c.json({
                success: true,
                email: passengerData.email,
                userId: passengerData.id
              });
            }
            
            const authEmail = authUser.user.email;
            console.log(`✅ Email Auth trouvé: ${authEmail}`);
            
            return c.json({
              success: true,
              email: authEmail,
              profileEmail: passengerData.email,
              userId: passengerData.id
            });
          } catch (error) {
            return c.json({
              success: true,
              email: passengerData.email,
              userId: passengerData.id
            });
          }
        }
      }
    }
    
    console.log('🔍 Recherche dans driver:...');
    const allDrivers = await kv.getByPrefix('driver:');
    console.log(`📊 ${allDrivers.length} drivers trouvés`);
    
    for (const driverData of allDrivers) {
      if (driverData && driverData.phone) {
        if (phoneFormats.includes(driverData.phone)) {
          console.log('✅ Driver trouvé (driver:) avec phone:', driverData.phone);
          
          try {
            const { createClient } = await import('npm:@supabase/supabase-js@2');
            const supabase = createClient(
              Deno.env.get('SUPABASE_URL') ?? '',
              Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
            );
            
            // ✅ Validation UUID
            if (!isValidUUID(driverData.id)) {
              console.log('⚠️ ID driver invalide, skip Auth check');
              return c.json({
                success: true,
                email: driverData.email,
                userId: driverData.id
              });
            }
            
            const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(driverData.id);
            
            if (authError || !authUser || !authUser.user || !authUser.user.email) {
              return c.json({
                success: true,
                email: driverData.email,
                userId: driverData.id
              });
            }
            
            const authEmail = authUser.user.email;
            console.log(`✅ Email Auth trouvé: ${authEmail}`);
            
            return c.json({
              success: true,
              email: authEmail,
              profileEmail: driverData.email,
              userId: driverData.id
            });
          } catch (error) {
            return c.json({
              success: true,
              email: driverData.email,
              userId: driverData.id
            });
          }
        }
      }
    }
    
    console.log('❌ Aucun compte trouvé avec ce numéro:', phoneNumber);
    return c.json({
      success: false,
      error: 'Aucun compte trouvé avec ce numéro'
    }, 404);

  } catch (error) {
    console.error('❌ Erreur get-email-by-phone:', error);
    return c.json({ 
      success: false, 
      error: 'Erreur serveur: ' + String(error)
    }, 500);
  }
});

// ============================================
// RÉINITIALISATION PAR TÉLÉPHONE - VERSION SIMPLIFIÉE
// ============================================
authRoutes.post('/auth/reset-password-phone', async (c) => {
  try {
    const { phoneNumber, newPassword } = await c.req.json();
    
    if (!phoneNumber || !newPassword) {
      return c.json({ 
        success: false, 
        error: 'Numéro et mot de passe requis' 
      }, 400);
    }

    if (newPassword.length < 6) {
      return c.json({ 
        success: false, 
        error: 'Le mot de passe doit contenir au moins 6 caractères' 
      }, 400);
    }

    console.log('🔄 Réinitialisation du mot de passe pour:', phoneNumber);

    // Créer un client Supabase Admin
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 🔧 NORMALISER LE NUMÉRO DE TÉLÉPHONE POUR LA RECHERCHE
    // Accepter tous les formats : +243XXX, 243XXX, 0XXX
    const normalizePhone = (phone: string): string[] => {
      const clean = phone.replace(/[\s()\-]/g, ''); // Enlever espaces, tirets, parenthèses
      const formats: string[] = [clean]; // Format original
      
      // Si commence par +243
      if (clean.startsWith('+243')) {
        const digits = clean.substring(4); // Les chiffres après +243
        formats.push(`+243${digits}`);
        formats.push(`243${digits}`);
        formats.push(`0${digits}`);
      }
      // Si commence par 243 (sans +)
      else if (clean.startsWith('243')) {
        const digits = clean.substring(3);
        formats.push(`+243${digits}`);
        formats.push(`243${digits}`);
        formats.push(`0${digits}`);
      }
      // Si commence par 0
      else if (clean.startsWith('0')) {
        const digits = clean.substring(1);
        formats.push(`+243${digits}`);
        formats.push(`243${digits}`);
        formats.push(`0${digits}`);
      }
      
      return [...new Set(formats)]; // Retirer les doublons
    };

    const phoneFormats = normalizePhone(phoneNumber);
    console.log('🔍 Formats de numéro à rechercher:', phoneFormats);

    // Chercher l'utilisateur par numéro de téléphone dans TOUS les types de profils
    // (passenger:, driver:, profile:, admin:)
    console.log('🔍 Recherche dans le KV store...');
    console.log('🔍 Numéro recherché (original):', phoneNumber);
    
    let userProfile = null;
    let userId = null;
    let profileType = '';

    // Chercher dans passenger:
    const passengers = await kv.getByPrefix('passenger:');
    console.log('���� Nombre de passagers dans KV:', passengers?.length || 0);
    if (passengers && passengers.length > 0) {
      console.log('📋 Premiers passagers (debug):', passengers.slice(0, 3).map((p: any) => ({ id: p.id, phone: p.phone, full_name: p.full_name })));
      // ✅ RECHERCHE AVEC NORMALISATION
      const found = passengers.find((p: any) => {
        const profilePhone = p.phone || p.phone_number || '';
        const profileFormats = normalizePhone(profilePhone);
        // Vérifier si un des formats correspond
        return phoneFormats.some(format => profileFormats.includes(format));
      });
      if (found) {
        userProfile = found;
        userId = found.id;
        profileType = 'passenger';
        console.log('✅ Passager trouvé:', userId, 'avec numéro:', found.phone);
      } else {
        console.log('❌ Aucun passager trouvé avec le numéro:', phoneNumber);
        console.log('🔍 Tous les numéros de passagers:', passengers.map((p: any) => p.phone || p.phone_number));
      }
    }

    // Si pas trouvé, chercher dans driver:
    if (!userProfile) {
      const drivers = await kv.getByPrefix('driver:');
      console.log('📊 Nombre de conducteurs dans KV:', drivers?.length || 0);
      if (drivers && drivers.length > 0) {
        const found = drivers.find((d: any) => {
          const profilePhone = d.phone || d.phone_number || '';
          const profileFormats = normalizePhone(profilePhone);
          return phoneFormats.some(format => profileFormats.includes(format));
        });
        if (found) {
          userProfile = found;
          userId = found.id;
          profileType = 'driver';
          console.log('✅ Conducteur trouvé:', userId);
        }
      }
    }

    // Si pas trouvé, chercher dans profile:
    if (!userProfile) {
      const profiles = await kv.getByPrefix('profile:');
      console.log('📊 Nombre de profils dans KV:', profiles?.length || 0);
      if (profiles && profiles.length > 0) {
        const found = profiles.find((p: any) => {
          const profilePhone = p.phone || p.phone_number || '';
          const profileFormats = normalizePhone(profilePhone);
          return phoneFormats.some(format => profileFormats.includes(format));
        });
        if (found) {
          userProfile = found;
          userId = found.id;
          profileType = 'profile';
          console.log('✅ Profil trouvé:', userId);
        }
      }
    }

    console.log('📊 Résultat recherche:', { found: !!userProfile, type: profileType, userId });

    if (!userProfile || !userId) {
      console.error('❌ Utilisateur non trouvé avec le numéro:', phoneNumber);
      
      return c.json({ 
        success: false, 
        error: 'Aucun compte trouvé avec ce numéro de téléphone' 
      }, 404);
    }

    console.log('👤 Utilisateur trouvé:', userId, 'Type:', profileType);

    // Mettre à jour le mot de passe de l'utilisateur
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    if (updateError) {
      console.error('❌ Erreur mise à jour mot de passe:', updateError);
      return c.json({ 
        success: false, 
        error: 'Erreur lors de la mise à jour du mot de passe' 
      }, 500);
    }

    console.log('✅ Mot de passe mis à jour pour:', userId);

    return c.json({
      success: true,
      message: 'Mot de passe réinitialisé avec succès'
    });

  } catch (error) {
    console.error('❌ Erreur reset-password-phone:', error);
    return c.json({ 
      success: false, 
      error: 'Erreur serveur: ' + String(error)
    }, 500);
  }
});

// ============================================
// CRÉER UN COMPTE AUTH.USERS À PARTIR D'UN PROFIL EXISTANT
// ============================================
authRoutes.post('/create-auth-from-profile', async (c) => {
  try {
    const { email, password, phoneNumber } = await c.req.json();
    
    if (!email || !password) {
      return c.json({ 
        success: false, 
        error: 'Email et mot de passe requis' 
      }, 400);
    }

    if (password.length < 6) {
      return c.json({ 
        success: false, 
        error: 'Le mot de passe doit contenir au moins 6 caractères' 
      }, 400);
    }

    console.log('🔧 Création compte auth.users pour:', email);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Vérifier si le profil existe dans profiles
    const { data: profiles, error: searchError } = await supabase
      .from('profiles')
      .select('id, email, phone, full_name, role')
      .eq('email', email)
      .limit(1);
    
    if (searchError) {
      console.error('❌ Erreur recherche profil:', searchError);
      return c.json({ 
        success: false, 
        error: 'Erreur lors de la recherche du profil' 
      }, 500);
    }

    if (!profiles || profiles.length === 0) {
      return c.json({ 
        success: false, 
        error: 'Aucun profil trouvé avec cet email' 
      }, 404);
    }

    const profile = profiles[0];
    console.log('✅ Profil trouvé:', profile.id);

    // ✅ Validation UUID avant appel getUserById
    if (!isValidUUID(profile.id)) {
      console.error('❌ ID profil invalide (pas un UUID):', profile.id);
      return c.json({ 
        success: false, 
        error: 'ID de profil invalide. Veuillez créer un nouveau compte.' 
      }, 400);
    }

    // Vérifier si le compte auth.users existe déjà
    const { data: existingUser } = await supabase.auth.admin.getUserById(profile.id);
    
    if (existingUser && existingUser.user) {
      return c.json({ 
        success: false, 
        error: 'Un compte existe déjà. Utilisez "Mot de passe oublié" pour le réinitialiser.' 
      }, 400);
    }

    // Créer le compte dans auth.users avec l'ID du profil
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      id: profile.id, // Utiliser le même ID que le profil
      email: email,
      password: password,
      email_confirm: true, // Auto-confirmer l'email
      user_metadata: {
        name: profile.full_name,
        fullName: profile.full_name,
        phone: profile.phone || phoneNumber,
        role: profile.role
      }
    });

    if (createError) {
      console.error('❌ Erreur création compte:', createError);
      return c.json({ 
        success: false, 
        error: 'Erreur lors de la création du compte: ' + createError.message 
      }, 500);
    }

    console.log('✅ Compte auth.users créé avec succès:', newUser.user?.id);

    return c.json({
      success: true,
      message: 'Compte créé avec succès',
      userId: newUser.user?.id
    });

  } catch (error) {
    console.error('❌ Erreur create-auth-from-profile:', error);
    return c.json({ 
      success: false, 
      error: 'Erreur serveur: ' + String(error)
    }, 500);
  }
});

// ============================================
// VÉRIFIER SI UN PROFIL ORPHELIN EXISTE
// ============================================
authRoutes.post('/check-orphan-profile', async (c) => {
  try {
    const { identifier } = await c.req.json();
    
    if (!identifier) {
      return c.json({ 
        success: false, 
        error: 'Identifiant requis' 
      }, 400);
    }

    console.log('🔍 Vérification profil orphelin pour:', identifier);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Chercher dans profiles par email ou téléphone
    const { data: profiles, error: searchError } = await supabase
      .from('profiles')
      .select('id, email, phone, full_name, role')
      .or(`email.eq.${identifier},phone.eq.${identifier}`)
      .limit(1);
    
    if (searchError) {
      console.error('❌ Erreur recherche profil:', searchError);
      return c.json({ 
        success: false, 
        hasOrphanProfile: false
      });
    }

    if (!profiles || profiles.length === 0) {
      console.log('❌ Aucun profil trouvé');
      return c.json({ 
        success: true, 
        hasOrphanProfile: false
      });
    }

    const profile = profiles[0];
    console.log('✅ Profil trouvé:', profile.id);

    // ✅ Validation UUID avant appel getUserById
    if (!isValidUUID(profile.id)) {
      console.error('❌ ID profil invalide (pas un UUID):', profile.id);
      return c.json({ 
        success: true, 
        hasOrphanProfile: true,
        hasAuthAccount: false,
        reason: 'invalid_uuid'
      });
    }

    // Vérifier si le compte auth.users existe
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(profile.id);
    
    if (authUser && authUser.user) {
      console.log('✅ Compte auth.users existe');
      return c.json({ 
        success: true, 
        hasOrphanProfile: false,
        hasAuthAccount: true
      });
    }

    console.log('⚠️ PROFIL ORPHELIN DÉTECTÉ');
    return c.json({ 
      success: true, 
      hasOrphanProfile: true,
      profile: {
        email: profile.email,
        phone: profile.phone,
        fullName: profile.full_name,
        role: profile.role
      }
    });

  } catch (error) {
    console.error('❌ Erreur check-orphan-profile:', error);
    return c.json({ 
      success: false, 
      error: 'Erreur serveur: ' + String(error)
    }, 500);
  }
});

// ============================================
// TROUVER L'EMAIL À PARTIR DU NUMÉRO DE TÉLÉPHONE
// ============================================
authRoutes.post('/find-email-by-phone', async (c) => {
  try {
    const { phoneNumber } = await c.req.json();
    
    if (!phoneNumber) {
      return c.json({ 
        success: false, 
        error: 'Numéro de téléphone requis' 
      }, 400);
    }

    console.log('🔍 Recherche email pour le numéro:', phoneNumber);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Normaliser le numéro de téléphone (enlever les espaces, +, etc.)
    const cleanPhone = phoneNumber.replace(/[\s+()\-]/g, '');
    
    // Chercher dans profiles par différents formats de téléphone
    const phoneFormats = [
      cleanPhone,
      `+${cleanPhone}`,
      cleanPhone.startsWith('243') ? cleanPhone : `243${cleanPhone}`,
      cleanPhone.startsWith('0') ? `243${cleanPhone.substring(1)}` : null,
    ].filter(Boolean);

    console.log('🔍 Formats de téléphone à essayer:', phoneFormats);

    // Construire la requête OR pour tous les formats
    const orQuery = phoneFormats.map(format => `phone.eq.${format}`).join(',');

    const { data: profiles, error: searchError } = await supabase
      .from('profiles')
      .select('id, email, phone, full_name')
      .or(orQuery)
      .limit(1);
    
    if (searchError) {
      console.error('❌ Erreur recherche profil:', searchError);
      return c.json({ 
        success: false, 
        error: 'Erreur lors de la recherche' 
      }, 500);
    }

    if (!profiles || profiles.length === 0) {
      console.log('❌ Aucun profil trouvé pour ce numéro');
      return c.json({ 
        success: false, 
        error: 'Aucun compte trouvé avec ce numéro de téléphone'
      }, 404);
    }

    const profile = profiles[0];
    console.log('✅ Profil trouvé:', profile.email);

    // ✅ Validation UUID avant appel getUserById
    if (!isValidUUID(profile.id)) {
      console.error('❌ ID profil invalide (pas un UUID):', profile.id);
      return c.json({ 
        success: false, 
        error: 'ID de profil invalide. Veuillez créer un nouveau compte.' 
      }, 400);
    }

    // Vérifier que le compte auth.users existe
    const { data: authUser } = await supabase.auth.admin.getUserById(profile.id);
    
    if (!authUser || !authUser.user) {
      console.log('⚠️ Profil orphelin détecté');
      return c.json({ 
        success: false, 
        error: 'ORPHAN_PROFILE',
        profile: {
          email: profile.email,
          phone: profile.phone,
          fullName: profile.full_name
        }
      }, 404);
    }

    console.log('✅ Email trouvé:', profile.email);
    return c.json({ 
      success: true, 
      email: profile.email,
      fullName: profile.full_name
    });

  } catch (error) {
    console.error('❌ Erreur find-email-by-phone:', error);
    return c.json({ 
      success: false, 
      error: 'Erreur serveur: ' + String(error)
    }, 500);
  }
});

// ============================================
// ROUTE SPÉCIALE : CRÉER LE PREMIER ADMIN
// ============================================
authRoutes.post('/auth/create-first-admin', async (c) => {
  try {
    console.log('🔧 Création du premier admin...');

    const { email, password, full_name } = await c.req.json();

    // Validation
    if (!email || !password) {
      return c.json({ 
        success: false, 
        error: 'Email et mot de passe requis' 
      }, 400);
    }

    // Créer un client Supabase avec la clé service
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Vérifier s'il existe déjà un admin
    const existingAdmins = await kv.getByPrefix('profile:');
    const hasAdmin = existingAdmins.some((profile: any) => profile.role === 'admin');

    if (hasAdmin) {
      console.log('⚠️ Un admin existe déjà !');
      return c.json({ 
        success: false, 
        error: 'Un compte administrateur existe déjà. Utilisez la page d\'inscription normale.' 
      }, 403);
    }

    console.log('✅ Aucun admin existant, création...');

    // Créer l'utilisateur avec Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirmer l'email
      user_metadata: {
        full_name: full_name || 'Admin',
        role: 'admin'
      }
    });

    if (authError || !authData.user) {
      console.error('❌ Erreur création utilisateur:', authError);
      return c.json({ 
        success: false, 
        error: authError?.message || 'Erreur lors de la création du compte' 
      }, 500);
    }

    console.log('✅ Utilisateur Supabase créé:', authData.user.id);

    // Créer le profil dans le KV store
    const profile = {
      id: authData.user.id,
      email,
      full_name: full_name || 'Admin',
      phone: null,
      role: 'admin',
      balance: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await kv.set(`profile:${authData.user.id}`, profile);
    console.log('✅ Profil admin créé dans KV store');

    return c.json({
      success: true,
      message: 'Premier compte administrateur créé avec succès !',
      user: {
        id: authData.user.id,
        email,
        full_name: full_name || 'Admin'
      }
    });

  } catch (error) {
    console.error('❌ Erreur lors de la création du premier admin:', error);
    return c.json({ 
      success: false, 
      error: 'Erreur serveur: ' + String(error) 
    }, 500);
  }
});

// ============================================
// ENDPOINT DE DEBUG : Vérifier l'état d'un compte
// ============================================
authRoutes.post('/auth/debug-account', async (c) => {
  try {
    const { phoneNumber, email } = await c.req.json();
    
    if (!phoneNumber && !email) {
      return c.json({ 
        success: false, 
        error: 'Numéro de téléphone ou email requis' 
      }, 400);
    }

    console.log('🐛 DEBUG - Vérification compte pour:', phoneNumber || email);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const debugInfo: any = {
      phoneNumber: phoneNumber || null,
      email: email || null,
      kvProfiles: [],
      authUsers: []
    };

    // Chercher dans le KV store
    if (phoneNumber) {
      const normalizePhone = (phone: string): string[] => {
        const clean = phone.replace(/[\s()\-]/g, '');
        const formats = [clean];
        
        if (clean.startsWith('+243')) {
          formats.push(clean.substring(4));
          formats.push('0' + clean.substring(4));
          formats.push(clean.substring(1));
        } else if (clean.startsWith('243')) {
          formats.push('+' + clean);
          formats.push('0' + clean.substring(3));
        } else if (clean.startsWith('0')) {
          formats.push('+243' + clean.substring(1));
          formats.push('243' + clean.substring(1));
        }
        
        return [...new Set(formats)];
      };
      
      const phoneFormats = normalizePhone(phoneNumber);
      const allProfiles = await kv.getByPrefix('profile:');
      const allDrivers = await kv.getByPrefix('driver:');
      const allPassengers = await kv.getByPrefix('passenger:');
      const allUsers = [...allProfiles, ...allDrivers, ...allPassengers];

      const matchingProfiles = allUsers.filter(p => {
        if (!p || !p.phone) return false;
        const profilePhone = p.phone.replace(/[\s()\-]/g, '');
        return phoneFormats.some(format => 
          profilePhone.includes(format) || format.includes(profilePhone)
        );
      });

      debugInfo.kvProfiles = matchingProfiles.map(p => ({
        id: p.id,
        email: p.email,
        phone: p.phone,
        role: p.role,
        status: p.status,
        created_at: p.created_at
      }));

      // Vérifier dans Supabase Auth
      for (const profile of matchingProfiles) {
        // ✅ Validation UUID avant appel getUserById
        if (!isValidUUID(profile.id)) {
          console.warn('⚠️ ID profil invalide ignoré:', profile.id);
          continue;
        }
        
        const { data: authUser, error } = await supabase.auth.admin.getUserById(profile.id);
        if (authUser?.user) {
          debugInfo.authUsers.push({
            id: authUser.user.id,
            email: authUser.user.email,
            email_confirmed_at: authUser.user.email_confirmed_at,
            created_at: authUser.user.created_at,
            user_metadata: authUser.user.user_metadata
          });
        }
      }
    }

    return c.json({
      success: true,
      debug: debugInfo
    });

  } catch (error) {
    console.error('❌ Erreur debug-account:', error);
    return c.json({ 
      success: false, 
      error: 'Erreur serveur: ' + String(error) 
    }, 500);
  }
});

// ============================================
// 🔧 MIGRATION: NORMALISER TOUS LES TÉLÉPHONES DANS LE KV STORE
// ============================================
authRoutes.post('/auth/migrate-phone-numbers', async (c) => {
  try {
    console.log('🔧 MIGRATION: Normalisation des numéros de téléphone dans le KV store');
    
    // Fonction de normalisation
    const normalizeToStandardFormat = (phone: string): string => {
      if (!phone) return phone;
      const clean = phone.replace(/[\s+()\-]/g, '');
      if (clean.length === 9) {
        return `+243${clean}`;
      } else if (clean.length === 10 && clean.startsWith('0')) {
        return `+243${clean.substring(1)}`;
      } else if (clean.length === 12 && clean.startsWith('243')) {
        return `+${clean}`;
      } else if (clean.length === 13 && clean.startsWith('+243')) {
        return clean;
      } else if (clean.startsWith('243')) {
        return `+${clean}`;
      } else if (clean.startsWith('0')) {
        return `+243${clean.substring(1)}`;
      }
      return phone;
    };
    
    let totalUpdated = 0;
    const errors: string[] = [];
    
    // Récupérer tous les profils
    const allProfiles = await kv.getByPrefix('profile:');
    const allDrivers = await kv.getByPrefix('driver:');
    const allPassengers = await kv.getByPrefix('passenger:');
    
    console.log(`📊 Profils à vérifier: ${allProfiles.length} profiles, ${allDrivers.length} drivers, ${allPassengers.length} passengers`);
    
    // Fonction helper pour migrer un profil
    const migrateProfile = async (profile: any, prefix: string) => {
      if (!profile || !profile.phone || !profile.id) return;
      
      const oldPhone = profile.phone;
      const newPhone = normalizeToStandardFormat(oldPhone);
      
      if (oldPhone === newPhone) {
        console.log(`✅ ${prefix}${profile.id} - Téléphone déjà normalisé: ${oldPhone}`);
        return;
      }
      
      console.log(`🔄 Migration ${prefix}${profile.id}: "${oldPhone}" → "${newPhone}"`);
      
      try {
        const updatedProfile = {
          ...profile,
          phone: newPhone,
          updated_at: new Date().toISOString()
        };
        
        await kv.set(`${prefix}${profile.id}`, updatedProfile);
        totalUpdated++;
        console.log(`✅ ${prefix}${profile.id} migré avec succès`);
      } catch (error) {
        const errorMsg = `Erreur migration ${prefix}${profile.id}: ${error}`;
        console.error(`❌ ${errorMsg}`);
        errors.push(errorMsg);
      }
    };
    
    for (const profile of allProfiles) {
      await migrateProfile(profile, 'profile:');
    }
    
    for (const driver of allDrivers) {
      await migrateProfile(driver, 'driver:');
    }
    
    for (const passenger of allPassengers) {
      await migrateProfile(passenger, 'passenger:');
    }
    
    console.log(`✅ Migration terminée: ${totalUpdated} profils mis à jour`);
    
    return c.json({
      success: true,
      totalUpdated,
      errors: errors.length > 0 ? errors : undefined,
      message: `${totalUpdated} numéros de téléphone normalisés avec succès`
    });
    
  } catch (error) {
    console.error('❌ Erreur migration:', error);
    return c.json({ 
      success: false, 
      error: 'Erreur lors de la migration: ' + String(error) 
    }, 500);
  }
});

// ============================================
// DIAGNOSTIC COMPLET DE CONNEXION
// ============================================
authRoutes.post('/auth/diagnostic-login', async (c) => {
  try {
    const { identifier, password } = await c.req.json();
    
    if (!identifier) {
      return c.json({ 
        success: false, 
        error: 'Identifiant requis' 
      }, 400);
    }
    
    console.log('🔍 DIAGNOSTIC DE CONNEXION pour:', identifier);
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    const diagnostic: any = {
      identifier,
      passwordProvided: !!password,
      passwordLength: password?.length || 0,
      kvProfiles: [],
      authEmail: null,
      authUserExists: false,
      canLogin: false,
      issues: [],
      suggestions: []
    };
    
    // 1. Chercher dans le KV store
    const normalizeToStandardFormat = (phone: string): string => {
      let clean = phone.replace(/[\s()\-]/g, '');
      if (clean.startsWith('+')) {
        return clean;
      } else if (clean.startsWith('243')) {
        return `+${clean}`;
      } else if (clean.startsWith('0')) {
        return `+243${clean.substring(1)}`;
      }
      return clean;
    };
    
    const normalizedSearchPhone = normalizeToStandardFormat(identifier);
    console.log('📱 Numéro normalisé:', normalizedSearchPhone);
    
    const allProfiles = await kv.getByPrefix('profile:');
    const allDrivers = await kv.getByPrefix('driver:');
    const allPassengers = await kv.getByPrefix('passenger:');
    const allUsers = [...allProfiles, ...allDrivers, ...allPassengers];
    
    const matchingProfile = allUsers.find(p => {
      if (!p || !p.phone) return false;
      const normalizedProfilePhone = normalizeToStandardFormat(p.phone);
      return normalizedProfilePhone === normalizedSearchPhone;
    });
    
    if (matchingProfile) {
      diagnostic.kvProfiles.push({
        id: matchingProfile.id,
        email: matchingProfile.email,
        phone: matchingProfile.phone,
        role: matchingProfile.role,
        full_name: matchingProfile.full_name
      });
      diagnostic.authEmail = matchingProfile.email;
      console.log('✅ Profil KV trouvé:', matchingProfile.id);
      console.log('📧 Email du profil:', matchingProfile.email);
    } else {
      diagnostic.issues.push('Aucun profil trouvé dans le KV store pour ce numéro');
      diagnostic.suggestions.push('Vérifiez que vous êtes bien inscrit avec ce numéro');
      console.log('❌ Aucun profil KV trouvé');
      
      return c.json({
        success: false,
        diagnostic,
        message: 'Aucun compte trouvé avec ce numéro de téléphone'
      });
    }
    
    // 2. Vérifier si l'utilisateur existe dans Supabase Auth
    try {
      // ✅ Validation UUID avant appel getUserById
      if (!isValidUUID(matchingProfile.id)) {
        console.error('❌ ID profil invalide (pas un UUID):', matchingProfile.id);
        diagnostic.issues.push('ID de profil invalide (pas un UUID)');
        diagnostic.suggestions.push('Ce profil doit être recréé avec un ID valide');
        
        return c.json({
          success: false,
          diagnostic,
          message: 'Profil invalide détecté. Veuillez créer un nouveau compte.'
        });
      }
      
      const { data: authUser } = await supabase.auth.admin.getUserById(matchingProfile.id);
      
      if (authUser && authUser.user) {
        diagnostic.authUserExists = true;
        diagnostic.authEmail = authUser.user.email;
        console.log('✅ Utilisateur Auth existe:', authUser.user.id);
        console.log('📧 Email Auth:', authUser.user.email);
        
        // 3. Tester la connexion si mot de passe fourni
        if (password) {
          const { data: testAuth, error: testError } = await supabase.auth.signInWithPassword({
            email: authUser.user.email || diagnostic.authEmail,
            password
          });
          
          if (testError) {
            diagnostic.canLogin = false;
            diagnostic.issues.push(`Erreur de connexion: ${testError.code}`);
            
            if (testError.code === 'invalid_credentials') {
              diagnostic.issues.push('Le mot de passe fourni est INCORRECT');
              diagnostic.suggestions.push('Utilisez "Mot de passe oublié" pour réinitialiser votre mot de passe');
              diagnostic.suggestions.push('Ou vérifiez que vous utilisez le bon mot de passe');
            } else {
              diagnostic.issues.push(testError.message);
            }
            
            console.log('❌ Test de connexion échoué:', testError.code);
          } else {
            diagnostic.canLogin = true;
            diagnostic.suggestions.push('✅ Le compte et le mot de passe sont corrects !');
            console.log('✅ Test de connexion réussi !');
          }
        } else {
          diagnostic.suggestions.push('Fournissez un mot de passe pour tester la connexion');
        }
      } else {
        diagnostic.authUserExists = false;
        diagnostic.issues.push('PROBLÈME CRITIQUE: Profil KV existe mais pas de compte Auth Supabase');
        diagnostic.suggestions.push('Utilisez la route /auth/fix-orphan-profile pour créer le compte Auth');
        console.log('❌ Utilisateur Auth n\'existe pas');
      }
    } catch (authError) {
      diagnostic.authUserExists = false;
      diagnostic.issues.push('Erreur lors de la vérification du compte Auth');
      console.error('❌ Erreur vérification Auth:', authError);
    }
    
    console.log('📊 Diagnostic complet:', diagnostic);
    
    return c.json({
      success: true,
      diagnostic,
      message: diagnostic.canLogin 
        ? 'Le compte fonctionne correctement' 
        : 'Des problèmes ont été détectés'
    });
    
  } catch (error) {
    console.error('❌ Erreur diagnostic-login:', error);
    return c.json({ 
      success: false, 
      error: 'Erreur serveur' 
    }, 500);
  }
});

// ============================================
// INSCRIPTION ADMIN RAPIDE - SANS EMAIL
// ============================================
authRoutes.post('/auth/admin/quick-signup', async (c) => {
  try {
    const { email, password, fullName } = await c.req.json();
    
    if (!email || !password || !fullName) {
      return c.json({ 
        success: false, 
        error: 'Email, mot de passe et nom complet requis' 
      }, 400);
    }

    console.log('🚀 Création compte admin rapide:', email);

    // Créer un client Supabase avec la clé service pour bypass le rate limit
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Créer le compte dans Supabase Auth SANS envoyer d'email
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // ✅ Confirmer l'email automatiquement (pas d'envoi d'email)
      user_metadata: {
        full_name: fullName,
        role: 'admin'
      }
    });

    if (authError) {
      console.error('❌ Erreur création Auth:', authError);
      return c.json({ 
        success: false, 
        error: authError.message || 'Erreur lors de la création du compte Auth' 
      }, 400);
    }

    if (!authData.user) {
      return c.json({ 
        success: false, 
        error: 'Aucun utilisateur créé' 
      }, 400);
    }

    console.log('✅ Compte Auth créé:', authData.user.id);

    // 2. Créer le profil dans le KV store
    const profile = {
      id: authData.user.id,
      email: email,
      full_name: fullName,
      phone: '',
      role: 'admin',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await kv.set(`admin:${authData.user.id}`, profile);
    console.log('✅ Profil admin créé dans KV store');

    return c.json({
      success: true,
      message: 'Compte admin créé avec succès',
      user: {
        id: authData.user.id,
        email: email,
        full_name: fullName,
        role: 'admin'
      }
    });

  } catch (error) {
    console.error('❌ Erreur création admin:', error);
    return c.json({ 
      success: false, 
      error: error.message || 'Erreur serveur' 
    }, 500);
  }
});

// ============================================
// CRÉER COMPTE ADMIN RAPIDE (contact@smartcabb.com)
// ============================================
authRoutes.post('/auth/admin/quick-create', async (c) => {
  try {
    console.log('🚀 CRÉATION RAPIDE compte admin contact@smartcabb.com...');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Vérifier si le compte existe déjà
    const { data: authList } = await supabase.auth.admin.listUsers();
    const existingAuth = authList?.users?.find(u => u.email === 'contact@smartcabb.com');

    if (existingAuth) {
      console.log('✅ Compte existe déjà:', existingAuth.id);
      
      // Juste mettre à jour le mot de passe
      await supabase.auth.admin.updateUserById(existingAuth.id, { password: 'Admin123' });

      // Créer/Mettre à jour le profil
      const profile = {
        id: existingAuth.id,
        email: 'contact@smartcabb.com',
        full_name: 'Admin SmartCabb',
        phone: '+243999999999',
        role: 'admin',
        balance: 0,
        password: 'Admin123',
        created_at: existingAuth.created_at,
        updated_at: new Date().toISOString()
      };

      await kv.set(`profile:${existingAuth.id}`, profile);
      await kv.set(`admin:${existingAuth.id}`, profile);

      return c.json({
        success: true,
        message: '✅ Compte admin prêt !',
        credentials: {
          email: 'contact@smartcabb.com',
          password: 'Admin123',
          loginUrl: 'https://smartcabb.com/admin'
        }
      });
    }

    // Créer le nouveau compte
    console.log('🆕 Création nouveau compte...');
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: 'contact@smartcabb.com',
      password: 'Admin123',
      email_confirm: true,
      user_metadata: {
        full_name: 'Admin SmartCabb',
        role: 'admin'
      }
    });

    if (authError) {
      console.error('❌ Erreur création:', authError);
      return c.json({ 
        success: false,
        error: `Impossible de créer le compte: ${authError.message}`,
        code: authError.code
      }, 400);
    }

    if (!authData.user) {
      return c.json({ success: false, error: 'Aucun utilisateur retourné' }, 500);
    }

    console.log('✅ Compte créé:', authData.user.id);

    // Créer le profil
    const profile = {
      id: authData.user.id,
      email: 'contact@smartcabb.com',
      full_name: 'Admin SmartCabb',
      phone: '+243999999999',
      role: 'admin',
      balance: 0,
      password: 'Admin123',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await kv.set(`profile:${authData.user.id}`, profile);
    await kv.set(`admin:${authData.user.id}`, profile);

    console.log('✅ Profil créé');

    return c.json({
      success: true,
      message: '🎉 Compte admin créé avec succès !',
      credentials: {
        email: 'contact@smartcabb.com',
        password: 'Admin123',
        loginUrl: 'https://smartcabb.com/admin'
      }
    });

  } catch (error) {
    console.error('❌ Erreur:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

export default authRoutes;

export default authRoutes;
