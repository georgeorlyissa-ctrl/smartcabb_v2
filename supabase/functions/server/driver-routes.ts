/**
 * 🚗 ROUTES CONDUCTEURS - SMARTCABB
 * ⚠️ FICHIER 100% AUTONOME — aucun import local
 * @version 3.0.0
 */

import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js@2";

const app = new Hono();

// ─── Table KV ────────────────────────────────────────────────────────────────
const KV_TABLE = "kv_store_2eb02e52";

// ─── KV helpers inlinés ──────────────────────────────────────────────────────

function kvClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );
}

async function kvGet(key: string): Promise<any> {
  try {
    const { data, error } = await kvClient()
      .from(KV_TABLE).select("value").eq("key", key).maybeSingle();
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

async function kvGetByPrefix(prefix: string): Promise<any[]> {
  try {
    const { data, error } = await kvClient()
      .from(KV_TABLE).select("key, value").like("key", prefix + "%");
    if (error) { console.error("KV getByPrefix error:", prefix, error.message); return []; }
    return data?.map((d: any) => d.value) ?? [];
  } catch (e) { console.error("KV getByPrefix exception:", e); return []; }
}

// ─── Utilitaires téléphone inlinés ───────────────────────────────────────────

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

// ─── GET / — Liste TOUS les conducteurs ──────────────────────────────────────
// Appelé par le frontend : GET /drivers
app.get("/", async (c) => {
  try {
    console.log("📋 [DRIVERS/GET-ALL] Récupération de tous les conducteurs...");
    const allDrivers = await kvGetByPrefix("driver:");
    console.log(`✅ [DRIVERS/GET-ALL] ${allDrivers.length} conducteur(s) trouvé(s)`);

    // Compter les stats
    const pending  = allDrivers.filter((d: any) => d.status === "pending").length;
    const approved = allDrivers.filter((d: any) => d.status === "approved").length;
    const rejected = allDrivers.filter((d: any) => d.status === "rejected").length;

    return c.json({
      success: true,
      drivers: allDrivers,
      count: allDrivers.length,
      stats: { pending, approved, rejected },
    });
  } catch (error) {
    console.error("❌ [DRIVERS/GET-ALL] Erreur:", error);
    return c.json({ success: false, error: "Erreur serveur", drivers: [] }, 500);
  }
});

// ─── GET /pending — Conducteurs en attente ────────────────────────────────────
app.get("/pending", async (c) => {
  try {
    console.log("📋 [DRIVERS/PENDING] Récupération des conducteurs en attente...");
    const allDrivers = await kvGetByPrefix("driver:");
    const pendingDrivers = allDrivers.filter(
      (d: any) => d.status === "pending" || (!d.isApproved && d.status !== "rejected" && d.status !== "approved")
    );
    console.log(`✅ [DRIVERS/PENDING] ${pendingDrivers.length} candidature(s) en attente`);
    return c.json({ success: true, drivers: pendingDrivers, count: pendingDrivers.length });
  } catch (error) {
    console.error("❌ [DRIVERS/PENDING] Erreur:", error);
    return c.json({ success: false, error: "Erreur serveur", drivers: [] }, 500);
  }
});

// ─── GET /:driverId — Un conducteur par ID ────────────────────────────────────
app.get("/:driverId", async (c) => {
  try {
    const driverId = c.req.param("driverId");
    const driver = await kvGet(`driver:${driverId}`);
    if (!driver) return c.json({ success: false, error: "Conducteur non trouvé" }, 404);
    return c.json({ success: true, driver });
  } catch (error) {
    console.error("❌ [DRIVERS/GET-ONE] Erreur:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

// ─── POST /signup ─────────────────────────────────────────────────────────────

app.post("/signup", async (c) => {
  try {
    const body = await c.req.json();
    const {
      full_name, phone, password,
      vehicleMake, vehicleModel, vehiclePlate,
      vehicleColor, vehicleCategory, profilePhoto, email,
    } = body;

    console.log("🚗 [DRIVERS/SIGNUP] Début inscription:", { full_name, phone, vehicleCategory });

    if (!full_name || !phone || !password) {
      return c.json({ success: false, error: "Nom, téléphone et mot de passe requis" }, 400);
    }
    if (password.length < 6) {
      return c.json({ success: false, error: "Le mot de passe doit contenir au moins 6 caractères" }, 400);
    }
    if (!vehicleMake || !vehicleModel || !vehiclePlate || !vehicleColor || !vehicleCategory) {
      return c.json({ success: false, error: "Toutes les informations du véhicule sont requises" }, 400);
    }

    const normalizedPhone = normalizePhoneNumber(phone);
    if (!normalizedPhone) {
      return c.json({ success: false, error: "Numéro de téléphone invalide. Format attendu : +243XXXXXXXXX" }, 400);
    }

    const phoneDigits = normalizedPhone.replace(/\D/g, "");
    const finalEmail = email?.trim() || `u${phoneDigits}@smartcabb.app`;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Vérifier si l'utilisateur existe déjà
    const { data: { users: existingUsers }, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
      console.error("❌ [DRIVERS/SIGNUP] Erreur listUsers:", listError);
      return c.json({ success: false, error: "Erreur serveur interne" }, 500);
    }

    const existingUser = existingUsers?.find((u) => {
      if (u.email?.toLowerCase() === finalEmail.toLowerCase()) return true;
      const userPhone = u.user_metadata?.phone || (u as any).phone;
      return userPhone && normalizePhoneNumber(userPhone) === normalizedPhone;
    });

    if (existingUser) {
      console.log("⚠️ [DRIVERS/SIGNUP] Suppression utilisateur existant:", existingUser.id);
      try {
        await supabase.auth.admin.deleteUser(existingUser.id);
        await kvDel(`profile:${existingUser.id}`);
        await kvDel(`driver:${existingUser.id}`);
      } catch (deleteError) {
        console.error("❌ [DRIVERS/SIGNUP] Erreur suppression:", deleteError);
        return c.json({
          success: false,
          error: "Ce numéro est déjà associé à un compte. Veuillez vous connecter ou contacter le support.",
        }, 400);
      }
    }

    const { data: createData, error: createError } = await supabase.auth.admin.createUser({
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
      console.error("❌ [DRIVERS/SIGNUP] Erreur création Auth:", createError.message);
      if (createError.message?.includes("already") || createError.message?.includes("exists")) {
        return c.json({ success: false, error: "Ce numéro est déjà enregistré. Veuillez vous connecter." }, 400);
      }
      return c.json({ success: false, error: `Erreur d'inscription: ${createError.message}` }, 400);
    }

    if (!createData?.user) {
      return c.json({ success: false, error: "Erreur lors de la création du compte" }, 500);
    }

    const userId = createData.user.id;
    const now = new Date().toISOString();

    const driverProfile = {
      id: userId,
      email: finalEmail,
      full_name,
      name: full_name,
      phone: normalizedPhone,
      role: "driver",
      // Infos véhicule stockées aux deux formats pour compatibilité
      vehicle_make: vehicleMake,
      vehicle_model: vehicleModel,
      vehicle_plate: vehiclePlate,
      vehicle_color: vehicleColor,
      vehicle_category: vehicleCategory,
      vehicleMake,
      vehicleModel,
      vehiclePlate,
      vehicleColor,
      vehicleCategory,
      vehicle: {
        make: vehicleMake,
        model: vehicleModel,
        license_plate: vehiclePlate,
        color: vehicleColor,
        category: vehicleCategory,
      },
      profile_photo: profilePhoto || null,
      status: "pending",
      isApproved: false,
      is_approved: false,
      is_online: false,
      is_available: false,
      balance: 0,
      total_trips: 0,
      total_rides: 0,
      rating: 0,
      rating_count: 0,
      created_at: now,
      updated_at: now,
      last_login_at: null,
    };

    await kvSet(`profile:${userId}`, driverProfile);
    await kvSet(`driver:${userId}`, driverProfile);
    console.log("✅ [DRIVERS/SIGNUP] Profil conducteur sauvegardé:", userId);

    return c.json({
      success: true,
      message: "Inscription réussie. Votre candidature est en attente d'approbation.",
      user: createData.user,
      profile: driverProfile,
    });
  } catch (error) {
    console.error("❌ [DRIVERS/SIGNUP] Erreur inattendue:", error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : "Erreur inattendue lors de l'inscription",
    }, 500);
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
        await kvDel(`driver:${targetUser.id}`);
        await kvDel(`passenger:${targetUser.id}`);
        deletedProfile = true;
      } catch (_) {}
    }

    return c.json({ success: true, deletedAuth, deletedProfile });
  } catch (error) {
    console.error("❌ [DRIVERS/DELETE-BY-PHONE] Erreur:", error);
    return c.json({ success: true, deletedAuth: false, deletedProfile: false });
  }
});

export default app;
