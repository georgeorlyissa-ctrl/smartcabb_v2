/**
 * 🔐 ROUTES AUTH - SMARTCABB
 * ⚠️ FICHIER 100% AUTONOME — aucun import local, zero dépendances externes
 * Toutes les fonctions utilitaires et KV sont inlinées ici.
 * @version 3.0.0
 */

import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js@2";
import { isOTPRequired, verifyOTPToken } from "./otp-core.ts";

const app = new Hono();

// ─── Table KV ───────────────────────────────────────────────────────────────
const KV_TABLE = "kv_store_2eb02e52";

// ─── KV helpers inlinés ─────────────────────────────────────────────────────

function kvClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );
}

async function kvGet(key: string): Promise<any> {
  try {
    const { data, error } = await kvClient()
      .from(KV_TABLE)
      .select("value")
      .eq("key", key)
      .maybeSingle();
    if (error) { console.error("KV get error:", key, error.message); return null; }
    return data?.value ?? null;
  } catch (e) { console.error("KV get exception:", e); return null; }
}

async function kvSet(key: string, value: any): Promise<void> {
  try {
    const { error } = await kvClient().from(KV_TABLE).upsert({ key, value });
    if (error) throw new Error(error.message);
  } catch (e) { console.error("KV set error:", key, e); throw e; }
}

async function kvDel(key: string): Promise<void> {
  try {
    const { error } = await kvClient().from(KV_TABLE).delete().eq("key", key);
    if (error) throw new Error(error.message);
  } catch (e) { console.error("KV del error:", key, e); }
}

// ─── Utilitaires téléphone / email inlinés ──────────────────────────────────

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

// ─── POST /signup ─────────────────────────────────────────────────────────────

app.post("/signup", async (c) => {
  try {
    const body = await c.req.json();
    const { email, password, phone, name, full_name, fullName, role } = body;
    const resolvedName = full_name || fullName || name || "Utilisateur";

    console.log("📱 [AUTH/SIGNUP] Début inscription:", { email, phone, resolvedName, role });

    if (!password) return c.json({ success: false, error: "Mot de passe requis" }, 400);
    if (!email && !phone) return c.json({ success: false, error: "Email ou téléphone requis" }, 400);

    let finalEmail = email;
    if (!email && phone) {
      const phoneDigits = phone.replace(/\D/g, "");
      const phoneNumber = phoneDigits.startsWith("243") ? phoneDigits : `243${phoneDigits}`;
      finalEmail = `u${phoneNumber}@smartcabb.app`;
      console.log("📧 [AUTH/SIGNUP] Email généré:", finalEmail);
    }

    if (email && !isValidEmail(email)) return c.json({ success: false, error: "Email invalide" }, 400);

    const normalizedEmail = normalizeEmail(finalEmail);
    const normalizedPhone = phone ? normalizePhoneNumber(phone) : null;

    // 🔐 Vérification OTP du numéro (requise seulement si activée dans la config admin)
    if (normalizedPhone) {
      const otpRequired = await isOTPRequired();
      if (otpRequired) {
        const otpCheck = await verifyOTPToken(normalizedPhone, "registration", body.otpToken);
        if (!otpCheck.ok) {
          console.warn("⚠️ [AUTH/SIGNUP] OTP non vérifié:", otpCheck.error);
          return c.json({ success: false, error: otpCheck.error }, 400);
        }
      }
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Vérifier si l'utilisateur existe déjà
    const { data: { users: existingUsers } } = await supabase.auth.admin.listUsers();

    const existingUser = existingUsers?.find((u) => {
      if (u.email?.toLowerCase() === normalizedEmail.toLowerCase()) return true;
      if (normalizedPhone) {
        const userPhone = u.user_metadata?.phone || (u as any).phone;
        if (userPhone && normalizePhoneNumber(userPhone) === normalizedPhone) return true;
      }
      return false;
    });

    if (existingUser) {
      console.log("🗑️ [AUTH/SIGNUP] Suppression utilisateur existant:", existingUser.id);
      try {
        await supabase.auth.admin.deleteUser(existingUser.id);
      } catch (deleteError) {
        console.error("❌ [AUTH/SIGNUP] Erreur suppression:", deleteError);
        return c.json({
          success: false,
          error: "Ce numéro est déjà enregistré. Veuillez vous connecter.",
        }, 400);
      }
    }

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
        return c.json({ success: false, error: "Ce numéro est déjà enregistré. Veuillez vous connecter." }, 400);
      }
      return c.json({ success: false, error: `Erreur d'inscription: ${error.message}` }, 400);
    }

    if (!data?.user) return c.json({ success: false, error: "Erreur lors de la création du compte" }, 500);

    console.log("✅ [AUTH/SIGNUP] Utilisateur créé:", data.user.id);

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
      await kvSet(`profile:${data.user.id}`, profile);
      await kvSet(`${role || "passenger"}:${data.user.id}`, profile);
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

// ─── POST /login ──────────────────────────────────────────────────────────────

app.post("/login", async (c) => {
  try {
    const body = await c.req.json();
    const { identifier, email, password } = body;
    const userIdentifier = identifier || email;

    console.log("🔑 [AUTH/LOGIN] Connexion:", { identifier: userIdentifier });

    if (!userIdentifier || !password) {
      return c.json({ success: false, error: "Email/téléphone et mot de passe requis" }, 400);
    }

    const supabaseAnon = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );

    let loginEmail = userIdentifier;
    const isPhoneNumber = /^[\d\s+\-()]+$/.test(userIdentifier.trim());

    if (isPhoneNumber) {
      const normalizedPhone = normalizePhoneNumber(userIdentifier);
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
      const userWithPhone = users?.find((u) => {
        const userPhone = u.user_metadata?.phone || (u as any).phone;
        return userPhone && normalizePhoneNumber(userPhone) === normalizedPhone;
      });

      if (!userWithPhone) {
        return c.json({ success: false, error: "Numéro de téléphone ou mot de passe incorrect" }, 401);
      }
      loginEmail = userWithPhone.email!;
    } else {
      loginEmail = normalizeEmail(userIdentifier);
    }

    const { data, error } = await supabaseAnon.auth.signInWithPassword({ email: loginEmail, password });

    if (error) {
      return c.json({
        success: false,
        error: isPhoneNumber ? "Numéro de téléphone ou mot de passe incorrect" : "Email ou mot de passe incorrect",
      }, 401);
    }

    let profile = await kvGet(`profile:${data.user.id}`);

    if (!profile) {
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
      await kvSet(`profile:${data.user.id}`, profile);
      if (role === "admin") await kvSet(`admin:${data.user.id}`, profile);
      if (role === "driver") await kvSet(`driver:${data.user.id}`, profile);
    }

    // Bloquer les conducteurs non approuvés
    if ((profile as any).role === "driver") {
      const dp = await kvGet(`driver:${data.user.id}`);
      if (dp) {
        if (!dp.isApproved || dp.status === "pending") {
          return c.json({ success: false, error: "Votre compte est en attente d'approbation par l'administrateur." }, 403);
        }
        if (dp.status === "rejected" || dp.status === "suspended") {
          return c.json({ success: false, error: "Votre compte a été désactivé. Veuillez contacter l'administrateur." }, 403);
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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: { users } } = await supabase.auth.admin.listUsers();

    const targetUser = users?.find((u) => {
      if (u.email?.toLowerCase() === generatedEmail.toLowerCase()) return true;
      const userPhone = u.user_metadata?.phone || (u as any).phone;
      return userPhone && normalizePhoneNumber(userPhone) === normalizedPhone;
    });

    let deletedAuth = false;
    let deletedProfile = false;

    if (targetUser) {
      try { await supabase.auth.admin.deleteUser(targetUser.id); deletedAuth = true; } catch (_) {}
      try {
        await kvDel(`profile:${targetUser.id}`);
        await kvDel(`passenger:${targetUser.id}`);
        deletedProfile = true;
      } catch (_) {}
    }

    return c.json({ success: true, deletedAuth, deletedProfile });
  } catch (error) {
    console.error("❌ [AUTH/DELETE-BY-PHONE] Erreur:", error);
    return c.json({ success: true, deletedAuth: false, deletedProfile: false });
  }
});

// ─── POST /check-phone-exists ─────────────────────────────────────────────────

app.post("/check-phone-exists", async (c) => {
  try {
    const { phoneNumber } = await c.req.json();
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    if (!normalizedPhone) {
      return c.json({ success: false, exists: false, error: "Format de numéro invalide" }, 400);
    }

    const phoneDigits = normalizedPhone.replace(/\D/g, "");
    const generatedEmail = `u${phoneDigits}@smartcabb.app`;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: { users } } = await supabase.auth.admin.listUsers();

    const targetUser = users?.find((u) => {
      if (u.email?.toLowerCase() === generatedEmail.toLowerCase()) return true;
      const userPhone = u.user_metadata?.phone || (u as any).phone;
      return userPhone && normalizePhoneNumber(userPhone) === normalizedPhone;
    });

    return c.json({ success: true, exists: !!targetUser, userId: targetUser?.id || null });
  } catch (error) {
    console.error("❌ [AUTH/CHECK-PHONE-EXISTS] Erreur:", error);
    return c.json({ success: false, exists: false, error: "Erreur serveur" }, 500);
  }
});

// ─── POST /reset-password-phone ───────────────────────────────────────────────

app.post("/reset-password-phone", async (c) => {
  try {
    const { phoneNumber, otpToken, newPassword } = await c.req.json();

    if (!newPassword || newPassword.length < 6) {
      return c.json({ success: false, error: "Le mot de passe doit contenir au moins 6 caractères" }, 400);
    }

    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    if (!normalizedPhone) {
      return c.json({ success: false, error: "Format de numéro invalide" }, 400);
    }

    // 🔐 Vérifier le jeton OTP (purpose reset-password, consommé après usage)
    const otpCheck = await verifyOTPToken(normalizedPhone, "reset-password", otpToken);
    if (!otpCheck.ok) {
      console.warn("⚠️ [AUTH/RESET-PASSWORD] OTP non vérifié:", otpCheck.error);
      return c.json({ success: false, error: otpCheck.error }, 400);
    }

    const phoneDigits = normalizedPhone.replace(/\D/g, "");
    const generatedEmail = `u${phoneDigits}@smartcabb.app`;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: { users } } = await supabase.auth.admin.listUsers();

    const targetUser = users?.find((u) => {
      if (u.email?.toLowerCase() === generatedEmail.toLowerCase()) return true;
      const userPhone = u.user_metadata?.phone || (u as any).phone;
      return userPhone && normalizePhoneNumber(userPhone) === normalizedPhone;
    });

    if (!targetUser) {
      return c.json({
        success: false,
        error: "Aucun compte trouvé avec ce numéro de téléphone. Créez d'abord un compte.",
        notFound: true,
      }, 404);
    }

    const { error: updateError } = await supabase.auth.admin.updateUserById(targetUser.id, {
      password: newPassword,
    });

    if (updateError) {
      console.error("❌ [AUTH/RESET-PASSWORD] Erreur mise à jour:", updateError.message);
      return c.json({ success: false, error: `Erreur lors de la mise à jour: ${updateError.message}` }, 400);
    }

    console.log("✅ [AUTH/RESET-PASSWORD] Mot de passe réinitialisé pour", normalizedPhone);
    return c.json({ success: true, message: "Mot de passe réinitialisé avec succès" });
  } catch (error) {
    console.error("❌ [AUTH/RESET-PASSWORD] Erreur inattendue:", error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : "Erreur lors de la réinitialisation",
    }, 500);
  }
});

export default app;
