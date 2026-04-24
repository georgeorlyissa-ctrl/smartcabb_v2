/**
 * 🚗 ROUTES CONDUCTEURS - SMARTCABB
 *
 * Gère l'inscription des conducteurs, la suppression d'utilisateurs orphelins
 * et toute autre opération spécifique aux conducteurs.
 *
 * @version 1.1.0
 */

import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv-wrapper.ts";
import { normalizePhoneNumber } from "./phone-utils.ts";

const app = new Hono();

// ============================================================
// POST /drivers/signup
// Inscription d'un nouveau conducteur avec infos véhicule
// ============================================================
app.post("/signup", async (c) => {
  try {
    const body = await c.req.json();

    const {
      full_name,
      phone,
      password,
      vehicleMake,
      vehicleModel,
      vehiclePlate,
      vehicleColor,
      vehicleCategory,
      profilePhoto,
      email,
    } = body;

    console.log("🚗 [DRIVERS/SIGNUP] Début inscription conducteur:", {
      full_name,
      phone,
      vehicleMake,
      vehicleModel,
      vehicleCategory,
    });

    // --- Validation de base ---
    if (!full_name || !phone || !password) {
      return c.json(
        { success: false, error: "Nom, téléphone et mot de passe requis" },
        400
      );
    }

    if (password.length < 6) {
      return c.json(
        {
          success: false,
          error: "Le mot de passe doit contenir au moins 6 caractères",
        },
        400
      );
    }

    if (!vehicleMake || !vehicleModel || !vehiclePlate || !vehicleColor || !vehicleCategory) {
      return c.json(
        { success: false, error: "Toutes les informations du véhicule sont requises" },
        400
      );
    }

    // --- Normalisation du téléphone ---
    const normalizedPhone = normalizePhoneNumber(phone);
    if (!normalizedPhone) {
      return c.json(
        {
          success: false,
          error: "Numéro de téléphone invalide. Format attendu : +243XXXXXXXXX",
        },
        400
      );
    }

    // --- Construction de l'email interne ---
    const phoneDigits = normalizedPhone.replace(/\D/g, "");
    const finalEmail =
      email?.trim() || `u${phoneDigits}@smartcabb.app`;

    console.log("📧 [DRIVERS/SIGNUP] Email utilisé:", finalEmail);

    // --- Création du client Supabase Admin ---
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // --- Vérifier si l'utilisateur existe déjà ---
    console.log("🔍 [DRIVERS/SIGNUP] Vérification utilisateur existant...");
    const { data: { users: existingUsers }, error: listError } =
      await supabase.auth.admin.listUsers();

    if (listError) {
      console.error("❌ [DRIVERS/SIGNUP] Erreur listUsers:", listError);
      return c.json({ success: false, error: "Erreur serveur interne" }, 500);
    }

    const existingUser = existingUsers?.find((u) => {
      if (u.email?.toLowerCase() === finalEmail.toLowerCase()) return true;
      const userPhone =
        u.user_metadata?.phone || (u as any).phone;
      if (userPhone && normalizePhoneNumber(userPhone) === normalizedPhone)
        return true;
      return false;
    });

    if (existingUser) {
      console.log(
        "⚠️ [DRIVERS/SIGNUP] Utilisateur existant trouvé, suppression...",
        existingUser.id
      );
      try {
        await supabase.auth.admin.deleteUser(existingUser.id);
        // Nettoyer aussi le KV store
        await kv.del(`profile:${existingUser.id}`);
        await kv.del(`driver:${existingUser.id}`);
        console.log("✅ [DRIVERS/SIGNUP] Utilisateur orphelin supprimé");
      } catch (deleteError) {
        console.error("❌ [DRIVERS/SIGNUP] Erreur suppression:", deleteError);
        return c.json(
          {
            success: false,
            error:
              "Ce numéro de téléphone est déjà associé à un compte. Veuillez vous connecter ou contacter le support.",
          },
          400
        );
      }
    }

    // --- Créer l'utilisateur dans Supabase Auth ---
    console.log("🔐 [DRIVERS/SIGNUP] Création utilisateur Supabase Auth...");
    const { data: createData, error: createError } =
      await supabase.auth.admin.createUser({
        email: finalEmail,
        password,
        email_confirm: true,
        user_metadata: {
          full_name,
          name: full_name,
          phone: normalizedPhone,
          role: "driver",
        },
      });

    if (createError) {
      console.error(
        "❌ [DRIVERS/SIGNUP] Erreur création Auth:",
        createError.message
      );

      if (
        createError.message?.includes("already") ||
        createError.message?.includes("exists")
      ) {
        return c.json(
          {
            success: false,
            error:
              "Ce numéro de téléphone est déjà enregistré. Veuillez vous connecter.",
          },
          400
        );
      }

      return c.json(
        {
          success: false,
          error: `Erreur d'inscription: ${createError.message}`,
        },
        400
      );
    }

    if (!createData?.user) {
      return c.json(
        { success: false, error: "Erreur lors de la création du compte" },
        500
      );
    }

    const userId = createData.user.id;
    console.log("✅ [DRIVERS/SIGNUP] Utilisateur Auth créé:", userId);

    // --- Créer le profil conducteur dans le KV store ---
    const now = new Date().toISOString();

    const driverProfile = {
      id: userId,
      email: finalEmail,
      full_name,
      name: full_name,
      phone: normalizedPhone,
      role: "driver",
      // Infos véhicule
      vehicle_make: vehicleMake,
      vehicle_model: vehicleModel,
      vehicle_plate: vehiclePlate,
      vehicle_color: vehicleColor,
      vehicle_category: vehicleCategory,
      // Photo de profil (Base64)
      profile_photo: profilePhoto || null,
      // Statut en attente d'approbation
      status: "pending",
      isApproved: false,
      is_online: false,
      // Financier
      balance: 0,
      total_trips: 0,
      rating: 0,
      rating_count: 0,
      // Timestamps
      created_at: now,
      updated_at: now,
      last_login_at: null,
    };

    console.log("💾 [DRIVERS/SIGNUP] Sauvegarde profil conducteur dans KV...");

    // Sauvegarder avec les deux préfixes
    await kv.set(`profile:${userId}`, driverProfile);
    await kv.set(`driver:${userId}`, driverProfile);

    console.log("✅ [DRIVERS/SIGNUP] Profil conducteur sauvegardé:", userId);

    return c.json({
      success: true,
      message: "Inscription réussie. Votre candidature est en attente d'approbation.",
      user: createData.user,
      profile: driverProfile,
    });
  } catch (error) {
    console.error("❌ [DRIVERS/SIGNUP] Erreur inattendue:", error);
    return c.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Erreur inattendue lors de l'inscription",
      },
      500
    );
  }
});

// ============================================================
// POST /delete-user-by-phone  (nettoyage des orphelins)
// ============================================================
app.post("/delete-user-by-phone", async (c) => {
  try {
    const { phone } = await c.req.json();

    if (!phone) {
      return c.json({ success: false, error: "Téléphone requis" }, 400);
    }

    const normalizedPhone = normalizePhoneNumber(phone);
    if (!normalizedPhone) {
      return c.json(
        { success: false, error: "Format de téléphone invalide" },
        400
      );
    }

    const phoneDigits = normalizedPhone.replace(/\D/g, "");
    const generatedEmail = `u${phoneDigits}@smartcabb.app`;

    console.log(
      "🧹 [DELETE-BY-PHONE] Nettoyage utilisateur par téléphone:",
      normalizedPhone
    );

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: { users }, error: listError } =
      await supabase.auth.admin.listUsers();

    if (listError) {
      console.error("❌ [DELETE-BY-PHONE] Erreur listUsers:", listError);
      return c.json({ success: false, deletedAuth: false, deletedProfile: false });
    }

    const targetUser = users?.find((u) => {
      if (u.email?.toLowerCase() === generatedEmail.toLowerCase()) return true;
      const userPhone = u.user_metadata?.phone || (u as any).phone;
      if (userPhone && normalizePhoneNumber(userPhone) === normalizedPhone)
        return true;
      return false;
    });

    let deletedAuth = false;
    let deletedProfile = false;

    if (targetUser) {
      try {
        await supabase.auth.admin.deleteUser(targetUser.id);
        deletedAuth = true;
        console.log(
          "✅ [DELETE-BY-PHONE] Utilisateur Auth supprimé:",
          targetUser.id
        );
      } catch (err) {
        console.warn("⚠️ [DELETE-BY-PHONE] Erreur suppression Auth:", err);
      }

      try {
        await kv.del(`profile:${targetUser.id}`);
        await kv.del(`driver:${targetUser.id}`);
        await kv.del(`passenger:${targetUser.id}`);
        deletedProfile = true;
        console.log(
          "✅ [DELETE-BY-PHONE] Profils KV supprimés:",
          targetUser.id
        );
      } catch (err) {
        console.warn("⚠️ [DELETE-BY-PHONE] Erreur suppression KV:", err);
      }
    } else {
      console.log(
        "ℹ️ [DELETE-BY-PHONE] Aucun utilisateur trouvé pour:",
        normalizedPhone
      );
    }

    return c.json({
      success: true,
      deletedAuth,
      deletedProfile,
      message: deletedAuth
        ? "Utilisateur orphelin supprimé"
        : "Aucun utilisateur à supprimer",
    });
  } catch (error) {
    console.error("❌ [DELETE-BY-PHONE] Erreur:", error);
    // Retourner success true pour ne pas bloquer le flux d'inscription
    return c.json({
      success: true,
      deletedAuth: false,
      deletedProfile: false,
      error: error instanceof Error ? error.message : "Erreur interne",
    });
  }
});

export default app;
