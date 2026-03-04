import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js@2";
import { normalizePhoneNumber } from "./phone-utils.ts";
import { isValidEmail, normalizeEmail } from "./email-validation.ts";

const app = new Hono();

// 📱 SIGNUP - Inscription utilisateur (passager ou conducteur)
app.post("/auth/signup", async (c) => {
  try {
    const { email, password, phone, name, full_name, role } = await c.req.json();

    console.log('📱 [AUTH/SIGNUP] Début inscription:', { email, phone, name, full_name, role });

    // Validation : mot de passe obligatoire
    if (!password) {
      console.error('❌ [AUTH/SIGNUP] Mot de passe manquant');
      return c.json({ success: false, error: "Mot de passe requis" }, 400);
    }

    // Validation : soit email soit téléphone requis
    if (!email && !phone) {
      console.error('❌ [AUTH/SIGNUP] Email et téléphone manquants');
      return c.json({ success: false, error: "Email ou téléphone requis" }, 400);
    }

    // Générer email automatiquement si seulement téléphone fourni
    let finalEmail = email;
    if (!email && phone) {
      // Format: u243XXXXXXXXX@smartcabb.app (préfixe "u" pour éviter rejet Supabase)
      const phoneDigits = phone.replace(/\D/g, '');
      const phoneNumber = phoneDigits.startsWith('243') ? phoneDigits : `243${phoneDigits}`;
      finalEmail = `u${phoneNumber}@smartcabb.app`;
      console.log('📧 [AUTH/SIGNUP] Email généré automatiquement:', finalEmail);
    }

    // Validation email si fourni
    if (email && !isValidEmail(email)) {
      console.error('❌ [AUTH/SIGNUP] Email invalide:', email);
      return c.json({ success: false, error: "Email invalide" }, 400);
    }

    const normalizedEmail = normalizeEmail(finalEmail);
    const normalizedPhone = phone ? normalizePhoneNumber(phone) : null;

    console.log('✅ [AUTH/SIGNUP] Email normalisé:', normalizedEmail);
    console.log('✅ [AUTH/SIGNUP] Téléphone normalisé:', normalizedPhone);

    // Créer l'utilisateur avec Supabase Auth
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    console.log('🔐 [AUTH/SIGNUP] Vérification si utilisateur existe déjà...');
    
    // ✅ VÉRIFIER SI L'UTILISATEUR EXISTE DÉJÀ (par email ou téléphone)
    const { data: { users: existingUsers } } = await supabase.auth.admin.listUsers();
    
    const existingUser = existingUsers?.find(u => {
      // Vérifier par email
      if (u.email?.toLowerCase() === normalizedEmail.toLowerCase()) {
        console.log('🔍 [AUTH/SIGNUP] Utilisateur trouvé avec le même email:', u.id);
        return true;
      }
      // Vérifier par téléphone
      if (normalizedPhone) {
        const userPhone = u.user_metadata?.phone || u.phone;
        if (userPhone && normalizePhoneNumber(userPhone) === normalizedPhone) {
          console.log('🔍 [AUTH/SIGNUP] Utilisateur trouvé avec le même téléphone:', u.id);
          return true;
        }
      }
      return false;
    });

    if (existingUser) {
      console.error('❌ [AUTH/SIGNUP] Utilisateur déjà existant:', existingUser.id);
      
      // ✅ OPTION : Supprimer l'ancien utilisateur et créer un nouveau
      console.log('🗑️ [AUTH/SIGNUP] Suppression de l\'utilisateur existant...');
      try {
        await supabase.auth.admin.deleteUser(existingUser.id);
        console.log('✅ [AUTH/SIGNUP] Utilisateur supprimé, création d\'un nouveau compte...');
        // Continuer vers la création
      } catch (deleteError) {
        console.error('❌ [AUTH/SIGNUP] Erreur suppression:', deleteError);
        return c.json({ 
          success: false, 
          error: "Ce numéro de téléphone a déjà été enregistré. Veuillez vous connecter." 
        }, 400);
      }
    } else {
      console.log('🔐 [AUTH/SIGNUP] Aucun utilisateur existant, création...');
    }

    // ✅ CRÉER L'UTILISATEUR
    let createResult;
    try {
      createResult = await supabase.auth.admin.createUser({
        email: normalizedEmail,
        password,
        email_confirm: true, // Auto-confirm car pas de serveur email
        user_metadata: {
          full_name: full_name || name, // ✅ Priorité à full_name
          name: full_name || name,      // ✅ Compatibilité
          phone: normalizedPhone,
          role: role || 'passenger'
        }
      });
    } catch (createError) {
      console.error("❌ [AUTH/SIGNUP] Exception lors de la création:", createError);
      throw createError;
    }

    const { data, error } = createResult;

    if (error) {
      console.error("❌ [AUTH/SIGNUP] Erreur création utilisateur Supabase:", error.message);
      console.error("❌ [AUTH/SIGNUP] Code erreur:", error.code || error.status);
      console.error("❌ [AUTH/SIGNUP] Détails erreur:", JSON.stringify(error, null, 2));
      
      // Messages d'erreur plus explicites
      if (error.message?.includes('already been registered') || error.message?.includes('already exists')) {
        return c.json({ 
          success: false, 
          error: "Ce numéro de téléphone a déjà été enregistré. Veuillez vous connecter." 
        }, 400);
      }
      
      return c.json({ 
        success: false, 
        error: `Erreur d'inscription: ${error.message}` 
      }, 400);
    }

    if (!data?.user) {
      console.error("❌ [AUTH/SIGNUP] Aucun utilisateur retourné par Supabase");
      return c.json({ 
        success: false, 
        error: "Erreur lors de la création du compte" 
      }, 500);
    }

    console.log("✅ [AUTH/SIGNUP] Utilisateur créé dans Supabase Auth:", data.user.id);
    
    // ✅ Créer le profil de base dans KV store
    const profile = {
      id: data.user.id,
      email: normalizedEmail,
      full_name: full_name || name || 'Utilisateur',
      phone: normalizedPhone,
      role: role || 'passenger',
      balance: 0,
      created_at: data.user.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Importer kv pour sauvegarder le profil
    try {
      console.log('💾 [AUTH/SIGNUP] Sauvegarde profil dans KV store...');
      const kvModule = await import('./kv-wrapper.ts');
      
      // ✅ Sauvegarder dans le KV store
      await kvModule.set(`profile:${data.user.id}`, profile);
      
      // Sauvegarder aussi avec le préfixe selon le rôle
      const userRole = role || 'passenger';
      await kvModule.set(`${userRole}:${data.user.id}`, profile);
      
      console.log(`✅ Profil créé automatiquement: ${profile.id} - Role: ${profile.role} - Clés KV: profile:${data.user.id} et ${userRole}:${data.user.id}`);
    } catch (kvError) {
      console.error("⚠️ [AUTH/SIGNUP] Erreur sauvegarde KV (non bloquant):", kvError);
      // Ne pas bloquer l'inscription si le KV échoue
    }
    
    console.log("✅ [AUTH/SIGNUP] Inscription terminée avec succès");
    
    // ✅ RETOURNER PROFILE AU LIEU DE USER
    return c.json({ success: true, user: data.user, profile });
  } catch (error) {
    console.error("❌ [AUTH/SIGNUP] Erreur inattendue:", error);
    console.error("❌ [AUTH/SIGNUP] Type d'erreur:", error?.constructor?.name);
    console.error("❌ [AUTH/SIGNUP] Message:", error instanceof Error ? error.message : 'N/A');
    console.error("❌ [AUTH/SIGNUP] Stack trace:", error instanceof Error ? error.stack : 'N/A');
    
    // Retourner le message d'erreur réel au lieu de "Database error"
    const errorMessage = error instanceof Error ? error.message : "Erreur lors de l'inscription";
    return c.json({ 
      success: false, 
      error: errorMessage,
      details: error instanceof Error ? error.stack : undefined
    }, 500);
  }
});

// 🔑 LOGIN - Connexion
app.post("/auth/login", async (c) => {
  try {
    const body = await c.req.json();
    const { identifier, email, password } = body;

    // ✅ Accepter "identifier" (frontend) ou "email" (legacy)
    const userIdentifier = identifier || email;

    console.log("🔑 [AUTH/LOGIN] Tentative de connexion:", { identifier: userIdentifier });

    if (!userIdentifier || !password) {
      return c.json({ success: false, error: "Email/téléphone et mot de passe requis" }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!
    );

    let loginEmail = userIdentifier;
    
    // 🔍 DÉTECTER SI C'EST UN NUMÉRO DE TÉLÉPHONE
    // Un téléphone contient uniquement des chiffres, espaces, +, -, ()
    const phoneRegex = /^[\d\s+\-()]+$/;
    const isPhoneNumber = phoneRegex.test(userIdentifier.trim());
    
    if (isPhoneNumber) {
      console.log("📱 [AUTH/LOGIN] Identifiant détecté comme numéro de téléphone");
      
      // Normaliser le téléphone
      const normalizedPhone = normalizePhoneNumber(userIdentifier);
      console.log("📱 [AUTH/LOGIN] Téléphone normalisé:", normalizedPhone);
      
      // Chercher l'utilisateur par téléphone dans Auth user_metadata
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );
      
      // Récupérer tous les utilisateurs (on devrait avoir une table d'index, mais pour l'instant...)
      const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      
      if (listError) {
        console.error("❌ [AUTH/LOGIN] Erreur récupération utilisateurs:", listError);
        return c.json({ success: false, error: "Erreur serveur" }, 500);
      }
      
      // Chercher l'utilisateur avec ce numéro de téléphone
      const userWithPhone = users?.find(u => {
        const userPhone = u.user_metadata?.phone || u.phone;
        if (!userPhone) return false;
        
        // Normaliser les deux téléphones pour comparaison
        const normalizedUserPhone = normalizePhoneNumber(userPhone);
        return normalizedUserPhone === normalizedPhone;
      });
      
      if (!userWithPhone) {
        console.error("❌ [AUTH/LOGIN] Aucun utilisateur trouvé avec le téléphone:", normalizedPhone);
        return c.json({ 
          success: false, 
          error: "Numéro de téléphone ou mot de passe incorrect" 
        }, 401);
      }
      
      // Utiliser l'email de cet utilisateur pour se connecter
      loginEmail = userWithPhone.email!;
      console.log("✅ [AUTH/LOGIN] Utilisateur trouvé par téléphone, email:", loginEmail);
    } else {
      // C'est un email, normaliser
      loginEmail = normalizeEmail(userIdentifier);
      console.log("📧 [AUTH/LOGIN] Identifiant détecté comme email:", loginEmail);
    }

    // Se connecter avec l'email
    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password
    });

    if (error) {
      console.error("❌ [AUTH/LOGIN] Erreur authentification:", error.message);
      return c.json({ 
        success: false, 
        error: isPhoneNumber 
          ? "Numéro de téléphone ou mot de passe incorrect" 
          : "Email ou mot de passe incorrect" 
      }, 401);
    }

    console.log("✅ [AUTH/LOGIN] Auth réussie, récupération du profil...");
    
    // Importer le kv wrapper
    const kvModule = await import('./kv-wrapper.ts');
    let profile = await kvModule.get(`profile:${data.user.id}`);
    
    // ✅ Si le profil n'existe pas, le créer automatiquement à partir des user_metadata
    if (!profile) {
      console.log("⚠️ Profil introuvable dans KV store, création automatique...");
      
      const userMetadata = data.user.user_metadata || {};
      const role = userMetadata.role || 'passenger';
      
      profile = {
        id: data.user.id,
        email: data.user.email || normalizedEmail,
        full_name: userMetadata.full_name || userMetadata.name || 'Utilisateur',
        phone: userMetadata.phone || null,
        role: role,
        balance: 0,
        created_at: data.user.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // Sauvegarder dans le KV store
      await kvModule.set(`profile:${data.user.id}`, profile);
      
      // Si c'est un admin, sauvegarder aussi avec le préfixe admin:
      if (role === 'admin') {
        await kvModule.set(`admin:${data.user.id}`, profile);
      }
      
      // Si c'est un driver, sauvegarder aussi avec le préfixe driver:
      if (role === 'driver') {
        await kvModule.set(`driver:${data.user.id}`, profile);
      }
      
      console.log("✅ Profil créé automatiquement:", profile.id, "- Role:", profile.role);
    } else {
      console.log("📋 Profil récupéré:", profile ? "✅" : "❌");
    }

    return c.json({ 
      success: true, 
      session: data.session,
      user: data.user,
      profile: profile
    });
  } catch (error) {
    console.error("❌ Erreur login:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

// 🚪 LOGOUT - Déconnexion
app.post("/auth/logout", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ success: false, error: "Non autorisé" }, 401);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { error } = await supabase.auth.admin.signOut(accessToken);

    if (error) {
      console.error("❌ Erreur logout:", error);
      return c.json({ success: false, error: error.message }, 400);
    }

    return c.json({ success: true });
  } catch (error) {
    console.error("❌ Erreur logout:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

export default app;