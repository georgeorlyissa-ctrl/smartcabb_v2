/**
 * 🔐 ROUTES AUTH - SMARTCABB
 * Fichier auto-suffisant (pas de dépendances locales externes)
 * @version 2.0.0
 */

import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";

const app = new Hono();

// ─── Utilitaires inlinés ────────────────────────────────────────────────────

function normalizePhoneNumber(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const cleaned = phone.replace(/[\s\-().]/g, "");
  if (/^\+243\d{9}$/.test(cleaned)) return cleaned;
  if (/^243\d{9}$/.test(cleaned)) return "+" + cleaned;
  if (/^00243\d{9}$/.test(cleaned)) return "+" + cleaned.substring(2);
  if (/^0\d{9}$/.test(cleaned)) return "+243" + cleaned.substring(1);
  if (/^\d{9}$/.test(cleaned)) return "+243" + cleaned;
  return null;
}

function isValidEmail(email: string): boolean {
  if (!email || typeof email !== "string") return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.toLowerCase());
}

function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

// ─── POST /signup ────────────────────────────────────────────────────────────

app.post("/signup", async (c) => {
  try {
    const body = await c.req.json();
    // Accepter fullName (camelCase) ET full_name/name (snake_case)
    const { email, password, phone, name, full_name, fullName, role } = body;
    const resolvedName = full_name || fullName || name || "Utilisateur";

    console.log("📱 [AUTH/SIGNUP] Début inscription:", { email, phone, resolvedName, role });

    if (!password) {
      return c.json({ success: false, error: "Mot de passe requis" }, 400);
    }
    if (!email && !phone) {
      return c.json({ success: false, error: "Email ou téléphone requis" }, 400);
    }

    // Générer email automatiquement si seulement téléphone fourni
    let finalEmail = email;
    if (!email && phone) {
      const phoneDigits = phone.replace(/\D/g, "");
      const phoneNumber = phoneDigits.startsWith("243") ? phoneDigits : `243${phoneDigits}`;
      finalEmail = `u${phoneNumber}@smartcabb.app`;
      console.log("📧 [AUTH/SIGNUP] Email généré:", finalEmail);
    }

    if (email && !isValidEmail(email)) {
      return c.json({ success: false, error: "Email invalide" }, 400);
    }

    const normalizedEmail = normalizeEmail(finalEmail);
    const normalizedPhone = phone ? normalizePhoneNumber(phone) : null;

    console.log("✅ [AUTH/SIGNUP] Email normalisé:", normalizedEmail);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Vérifier si l'utilisateur existe déjà
    console.log("🔐 [AUTH/SIGNUP] Vérification utilisateur existant...");
    const { data: { users: existingUsers } } = await supabase.auth.admin.listUsers();

    const existingUser = existingUsers?.find((u) => {
      if (u.email?.toLowerCase() === normalizedEmail.toLowerCase()) return true;
      if (normalizedPhone) {
        const userPhone = u.user_metadata?.phone || u.phone;
        if (userPhone && normalizePhoneNumber(userPhone) === normalizedPhone) return true;
      }
      return false;
    });

    if (existingUser) {
      console.log("🗑️ [AUTH/SIGNUP] Suppression utilisateur existant:", existingUser.id);
      try {
        await supabase.auth.admin.deleteUser(existingUser.id);
        console.log("✅ [AUTH/SIGNUP] Utilisateur supprimé");
      } catch (deleteError) {
        console.error("❌ [AUTH/SIGNUP] Erreur suppression:", deleteError);
        return c.json({
          success: false,
          error: "Ce numéro de téléphone a déjà été enregistré. Veuillez vous connecter.",
        }, 400);
      }
    }

    // Créer l'utilisateur
    const { data, error } = await supabase.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: resolvedName,
        name: resolvedName,
        phone: normalizedPhone,
        role: role || "passenger",
      },
    });

    if (error) {
      console.error("❌ [AUTH/SIGNUP] Erreur création:", error.message);
      if (error.message?.includes("already been registered") || error.message?.includes("already exists")) {
        return c.json({
          success: false,
          error: "Ce numéro de téléphone a déjà été enregistré. Veuillez vous connecter.",
        }, 400);
      }
      return c.json({ success: false, error: `Erreur d'inscription: ${error.message}` }, 400);
    }

    if (!data?.user) {
      return c.json({ success: false, error: "Erreur lors de la création du compte" }, 500);
    }

    console.log("✅ [AUTH/SIGNUP] Utilisateur créé:", data.user.id);

    // Créer le profil dans le KV store
    const profile = {
      id: data.user.id,
      email: normalizedEmail,
      full_name: resolvedName,
      phone: normalizedPhone,
      role: role || "passenger",
      balance: 0,
      created_at: data.user.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      await kv.set(`profile:${data.user.id}`, profile);
      await kv.set(`${role || "passenger"}:${data.user.id}`, profile);
      console.log("✅ [AUTH/SIGNUP] Profil KV sauvegardé");
    } catch (kvError) {
      console.error("⚠️ [AUTH/SIGNUP] Erreur KV (non bloquant):", kvError);
    }

    return c.json({ success: true, user: data.user, profile });
  } catch (error) {
    console.error("❌ [AUTH/SIGNUP] Erreur inattendue:", error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : "Erreur lors de l'inscription",
    }, 500);
  }
});

// ─── POST /login ─────────────────────────────────────────────────────────────

app.post("/login", async (c) => {
  try {
    const body = await c.req.json();
    const { identifier, email, password } = body;
    const userIdentifier = identifier || email;

    console.log("🔑 [AUTH/LOGIN] Connexion:", { identifier: userIdentifier });

    if (!userIdentifier || !password) {
      return c.json({ success: false, error: "Email/téléphone et mot de passe requis" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );

    let loginEmail = userIdentifier;
    const phoneRegex = /^[\d\s+\-()]+$/;
    const isPhoneNumber = phoneRegex.test(userIdentifier.trim());

    if (isPhoneNumber) {
      console.log("📱 [AUTH/LOGIN] Identifiant téléphone détecté");
      const normalizedPhone = normalizePhoneNumber(userIdentifier);

      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (listError) {
        return c.json({ success: false, error: "Erreur serveur" }, 500);
      }

      const userWithPhone = users?.find((u) => {
        const userPhone = u.user_metadata?.phone || u.phone;
        if (!userPhone) return false;
        return normalizePhoneNumber(userPhone) === normalizedPhone;
      });

      if (!userWithPhone) {
        return c.json({ success: false, error: "Numéro de téléphone ou mot de passe incorrect" }, 401);
      }

      loginEmail = userWithPhone.email!;
      console.log("✅ [AUTH/LOGIN] Utilisateur trouvé, email:", loginEmail);
    } else {
      loginEmail = normalizeEmail(userIdentifier);
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email: loginEmail, password });

    if (error) {
      console.error("❌ [AUTH/LOGIN] Erreur auth:", error.message);
      return c.json({
        success: false,
        error: isPhoneNumber ? "Numéro de téléphone ou mot de passe incorrect" : "Email ou mot de passe incorrect",
      }, 401);
    }

    console.log("✅ [AUTH/LOGIN] Auth réussie, récupération profil...");

    let profile = await kv.get(`profile:${data.user.id}`);

    if (!profile) {
      console.log("⚠️ Profil introuvable, création automatique...");
      const userMetadata = data.user.user_metadata || {};
      const role = userMetadata.role || "passenger";

      profile = {
        id: data.user.id,
        email: data.user.email || "",
        full_name: userMetadata.full_name || userMetadata.name || "Utilisateur",
        phone: userMetadata.phone || null,
        role,
        balance: 0,
        created_at: data.user.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await kv.set(`profile:${data.user.id}`, profile);
      if (role === "admin") await kv.set(`admin:${data.user.id}`, profile);
      if (role === "driver") await kv.set(`driver:${data.user.id}`, profile);
      console.log("✅ Profil créé automatiquement:", profile.id, "- Role:", role);
    }

    // Bloquer les conducteurs non approuvés
    if ((profile as any).role === "driver") {
      const driverProfile = await kv.get(`driver:${data.user.id}`);
      if (driverProfile) {
        const dp = driverProfile as any;
        if (!dp.isApproved || dp.status === "pending") {
          return c.json({
            success: false,
            error: "Votre compte est en attente d'approbation par l'administrateur.",
          }, 403);
        }
        if (dp.status === "rejected" || dp.status === "suspended") {
          return c.json({
            success: false,
            error: "Votre compte a été désactivé. Veuillez contacter l'administrateur.",
          }, 403);
        }
      }
    }

    return c.json({ success: true, session: data.session, user: data.user, profile });
  } catch (error) {
    console.error("❌ [AUTH/LOGIN] Erreur:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

// ─── POST /logout ─────────────────────────────────────────────────────────────

app.post("/logout", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    if (!accessToken) return c.json({ success: false, error: "Non autorisé" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error } = await supabase.auth.admin.signOut(accessToken);
    if (error) return c.json({ success: false, error: error.message }, 400);

    return c.json({ success: true });
  } catch (error) {
    console.error("❌ [AUTH/LOGOUT] Erreur:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

// ─── POST /delete-user-by-phone ───────────────────────────────────────────────

app.post("/delete-user-by-phone", async (c) => {
  try {
    const { phone } = await c.req.json();
    if (!phone) return c.json({ success: false, error: "Téléphone requis" }, 400);

    const normalizedPhone = normalizePhoneNumber(phone);
    if (!normalizedPhone) return c.json({ success: false, error: "Format invalide" }, 400);

    const phoneDigits = normalizedPhone.replace(/\D/g, "");
    const generatedEmail = `u${phoneDigits}@smartcabb.app`;

    console.log("🧹 [AUTH/DELETE-BY-PHONE] Nettoyage passager:", normalizedPhone);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) return c.json({ success: true, deletedAuth: false, deletedProfile: false });

    const targetUser = users?.find((u) => {
      if (u.email?.toLowerCase() === generatedEmail.toLowerCase()) return true;
      const userPhone = u.user_metadata?.phone || (u as any).phone;
      return userPhone && normalizePhoneNumber(userPhone) === normalizedPhone;
    });

    let deletedAuth = false;
    let deletedProfile = false;

    if (targetUser) {
      try {
        await supabase.auth.admin.deleteUser(targetUser.id);
        deletedAuth = true;
      } catch (err) {
        console.warn("⚠️ [AUTH/DELETE-BY-PHONE] Erreur suppression Auth:", err);
      }
      try {
        await kv.del(`profile:${targetUser.id}`);
        await kv.del(`passenger:${targetUser.id}`);
        deletedProfile = true;
      } catch (err) {
        console.warn("⚠️ [AUTH/DELETE-BY-PHONE] Erreur suppression KV:", err);
      }
    }

    return c.json({
      success: true,
      deletedAuth,
      deletedProfile,
      message: deletedAuth ? "Utilisateur orphelin supprimé" : "Aucun utilisateur à supprimer",
    });
  } catch (error) {
    console.error("❌ [AUTH/DELETE-BY-PHONE] Erreur:", error);
    return c.json({ success: true, deletedAuth: false, deletedProfile: false });
  }
});

export default app;
