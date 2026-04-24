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

// ─── POST /toggle-online-status — Passer en ligne / hors ligne ────────────────
app.post("/toggle-online-status", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    if (!accessToken) {
      return c.json({ success: false, error: "Token d'authentification manquant" }, 401);
    }

    // Identifier le conducteur depuis son JWT
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ success: false, error: "Utilisateur non authentifié" }, 401);
    }

    const driverId = user.id;
    const { isOnline, location } = await c.req.json();

    console.log(`🔄 [DRIVERS/TOGGLE-ONLINE] ${driverId} → ${isOnline ? "EN LIGNE" : "HORS LIGNE"}`);

    const driver = await kvGet(`driver:${driverId}`);
    if (!driver) {
      return c.json({ success: false, error: "Conducteur non trouvé" }, 404);
    }

    // Vérifier que le conducteur est approuvé
    if (driver.status !== "approved" && !driver.isApproved) {
      return c.json({
        success: false,
        error: "Votre compte n'est pas encore approuvé. Veuillez attendre la validation de l'administrateur.",
      }, 403);
    }

    // Vérifier le solde si passage EN LIGNE
    if (isOnline) {
      const balance = driver.creditBalance ?? driver.balance ?? 0;
      if (balance <= 0) {
        return c.json({
          success: false,
          error: "Solde insuffisant ! Rechargez votre compte pour vous mettre en ligne.",
        }, 400);
      }
    }

    const now = new Date().toISOString();
    const updatedDriver = {
      ...driver,
      isOnline,
      is_online: isOnline,
      is_available: isOnline,
      ...(location ? { location, lastLocation: location } : {}),
      lastOnlineChange: now,
      updated_at: now,
    };

    await kvSet(`driver:${driverId}`, updatedDriver);

    // Sync profil
    const profile = await kvGet(`profile:${driverId}`);
    if (profile) {
      await kvSet(`profile:${driverId}`, {
        ...profile,
        isOnline,
        is_online: isOnline,
        is_available: isOnline,
        updated_at: now,
      });
    }

    console.log(`✅ [DRIVERS/TOGGLE-ONLINE] Statut mis à jour : ${driverId} → ${isOnline ? "EN LIGNE" : "HORS LIGNE"}`);
    return c.json({
      success: true,
      isOnline,
      driver: updatedDriver,
      message: isOnline ? "Vous êtes maintenant en ligne" : "Vous êtes maintenant hors ligne",
    });
  } catch (error) {
    console.error("❌ [DRIVERS/TOGGLE-ONLINE] Erreur:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

// ─── GET /:driverId/balance — Solde principal ─────────────────────────────────
app.get("/:driverId/balance", async (c) => {
  try {
    const driverId = c.req.param("driverId");
    const driver = await kvGet(`driver:${driverId}`);
    if (!driver) return c.json({ success: false, error: "Conducteur non trouvé" }, 404);

    const balance = driver.balance ?? driver.creditBalance ?? 0;
    return c.json({ success: true, balance, driverId });
  } catch (error) {
    console.error("❌ [DRIVERS/BALANCE-GET] Erreur:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

// ─── GET /:driverId/wallets — Tous les soldes (crédit, gains, bonus) ──────────
app.get("/:driverId/wallets", async (c) => {
  try {
    const driverId = c.req.param("driverId");
    const driver = await kvGet(`driver:${driverId}`);
    if (!driver) return c.json({ success: false, error: "Conducteur non trouvé" }, 404);

    return c.json({
      success: true,
      creditBalance:   driver.creditBalance   ?? driver.balance ?? 0,
      earningsBalance: driver.earningsBalance ?? 0,
      bonusBalance:    driver.bonusBalance    ?? 0,
      balance:         driver.balance         ?? driver.creditBalance ?? 0,
    });
  } catch (error) {
    console.error("❌ [DRIVERS/WALLETS] Erreur:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

// ─── POST /:driverId/balance — Ajout/Soustraction de balance (useDriverBalance) ─
app.post("/:driverId/balance", async (c) => {
  try {
    const driverId = c.req.param("driverId");
    const { operation, amount } = await c.req.json();

    if (!operation || typeof amount !== "number" || amount <= 0) {
      return c.json({ success: false, error: "Paramètres invalides" }, 400);
    }

    const driver = await kvGet(`driver:${driverId}`);
    if (!driver) return c.json({ success: false, error: "Conducteur non trouvé" }, 404);

    const currentBalance = driver.balance ?? driver.creditBalance ?? 0;
    let newBalance: number;

    if (operation === "add") {
      newBalance = currentBalance + amount;
    } else if (operation === "subtract") {
      newBalance = Math.max(0, currentBalance - amount);
    } else {
      return c.json({ success: false, error: "Opération invalide. Utilisez 'add' ou 'subtract'" }, 400);
    }

    const updatedDriver = {
      ...driver,
      balance: newBalance,
      creditBalance: newBalance,
      updated_at: new Date().toISOString(),
    };
    await kvSet(`driver:${driverId}`, updatedDriver);

    console.log(`💰 [DRIVERS/BALANCE-POST] ${driverId}: ${currentBalance} → ${newBalance} (${operation} ${amount})`);
    return c.json({ success: true, balance: newBalance, driverId });
  } catch (error) {
    console.error("❌ [DRIVERS/BALANCE-POST] Erreur:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

// ─── POST /:driverId/wallet/recharge — Recharger le crédit conducteur ─────────
app.post("/:driverId/wallet/recharge", async (c) => {
  try {
    const driverId = c.req.param("driverId");
    const { amount } = await c.req.json();

    console.log(`💳 [DRIVERS/RECHARGE] ${driverId}: +${amount} CDF`);

    if (typeof amount !== "number" || amount <= 0) {
      return c.json({ success: false, error: "Montant invalide" }, 400);
    }
    if (amount < 1000) {
      return c.json({ success: false, error: "Le montant minimum est 1 000 CDF" }, 400);
    }

    const driver = await kvGet(`driver:${driverId}`);
    if (!driver) return c.json({ success: false, error: "Conducteur non trouvé" }, 404);

    const currentCredit  = driver.creditBalance   ?? driver.balance ?? 0;
    const currentEarnings = driver.earningsBalance ?? 0;
    const currentBonus   = driver.bonusBalance    ?? 0;
    const newCreditBalance = currentCredit + amount;

    const updatedDriver = {
      ...driver,
      balance: newCreditBalance,
      creditBalance: newCreditBalance,
      earningsBalance: currentEarnings,
      bonusBalance: currentBonus,
      updated_at: new Date().toISOString(),
    };
    await kvSet(`driver:${driverId}`, updatedDriver);

    // Enregistrer la transaction
    const txId = `wallet_tx_${Date.now()}_${driverId}`;
    await kvSet(`wallet_tx:${txId}`, {
      id: txId,
      driverId,
      type: "recharge",
      amount,
      balanceBefore: currentCredit,
      balanceAfter: newCreditBalance,
      created_at: new Date().toISOString(),
    });

    console.log(`✅ [DRIVERS/RECHARGE] Nouveau solde crédit: ${newCreditBalance} CDF`);
    return c.json({
      success: true,
      newCreditBalance,
      creditBalance: newCreditBalance,
      earningsBalance: currentEarnings,
      bonusBalance: currentBonus,
      message: `Recharge de ${amount.toLocaleString()} CDF effectuée`,
    });
  } catch (error) {
    console.error("❌ [DRIVERS/RECHARGE] Erreur:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

// ─── POST /:driverId/wallet/withdraw — Retrait depuis bonus ──────────────────
app.post("/:driverId/wallet/withdraw", async (c) => {
  try {
    const driverId = c.req.param("driverId");
    const { amount } = await c.req.json();

    console.log(`💸 [DRIVERS/WITHDRAW] ${driverId}: -${amount} CDF`);

    if (typeof amount !== "number" || amount <= 0) {
      return c.json({ success: false, error: "Montant invalide" }, 400);
    }
    if (amount < 5000) {
      return c.json({ success: false, error: "Le montant minimum de retrait est 5 000 CDF" }, 400);
    }

    const driver = await kvGet(`driver:${driverId}`);
    if (!driver) return c.json({ success: false, error: "Conducteur non trouvé" }, 404);

    const currentBonus    = driver.bonusBalance    ?? 0;
    const currentCredit   = driver.creditBalance   ?? driver.balance ?? 0;
    const currentEarnings = driver.earningsBalance ?? 0;

    if (amount > currentBonus) {
      return c.json({ success: false, error: "Solde bonus insuffisant" }, 400);
    }

    const newBonusBalance = currentBonus - amount;
    const updatedDriver = {
      ...driver,
      bonusBalance: newBonusBalance,
      creditBalance: currentCredit,
      earningsBalance: currentEarnings,
      balance: currentCredit,
      updated_at: new Date().toISOString(),
    };
    await kvSet(`driver:${driverId}`, updatedDriver);

    // Enregistrer la transaction
    const txId = `wallet_tx_${Date.now()}_${driverId}`;
    await kvSet(`wallet_tx:${txId}`, {
      id: txId,
      driverId,
      type: "withdraw",
      amount,
      balanceBefore: currentBonus,
      balanceAfter: newBonusBalance,
      status: "pending", // En attente de traitement manuel
      created_at: new Date().toISOString(),
    });

    console.log(`✅ [DRIVERS/WITHDRAW] Nouveau solde bonus: ${newBonusBalance} CDF`);
    return c.json({
      success: true,
      newBonusBalance,
      creditBalance: currentCredit,
      earningsBalance: currentEarnings,
      bonusBalance: newBonusBalance,
      message: `Retrait de ${amount.toLocaleString()} CDF en cours de traitement`,
    });
  } catch (error) {
    console.error("❌ [DRIVERS/WITHDRAW] Erreur:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

// ─── GET /:driverId — Un conducteur par ID ───────────────────────────────────
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

// ─── POST /:driverId/update — Mise à jour générale ────────────────────────────
app.post("/:driverId/update", async (c) => {
  try {
    const driverId = c.req.param("driverId");
    const updates = await c.req.json();
    console.log(`🔄 [DRIVERS/UPDATE] ${driverId}:`, updates);

    const driver = await kvGet(`driver:${driverId}`);
    if (!driver) return c.json({ success: false, error: "Conducteur non trouvé" }, 404);

    // Appliquer les mises à jour
    const updatedDriver = {
      ...driver,
      ...updates,
      // S'assurer que isApproved est cohérent avec status
      ...(updates.status === 'approved' ? { isApproved: true, is_approved: true } : {}),
      ...(updates.status === 'rejected' ? { isApproved: false, is_approved: false } : {}),
      updated_at: new Date().toISOString(),
    };

    await kvSet(`driver:${driverId}`, updatedDriver);

    // Sync profil
    const profile = await kvGet(`profile:${driverId}`);
    if (profile) {
      await kvSet(`profile:${driverId}`, {
        ...profile,
        ...updates,
        updated_at: new Date().toISOString(),
      });
    }

    console.log(`✅ [DRIVERS/UPDATE] Conducteur ${driverId} mis à jour`);
    return c.json({ success: true, driver: updatedDriver });
  } catch (error) {
    console.error("❌ [DRIVERS/UPDATE] Erreur:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

// ─── POST /:driverId/status — Passer en ligne / hors ligne ───────────────────
app.post("/:driverId/status", async (c) => {
  try {
    const driverId = c.req.param("driverId");
    const { status, location } = await c.req.json();

    if (!status || !["online", "offline"].includes(status)) {
      return c.json({ success: false, error: "Statut invalide. Utilisez 'online' ou 'offline'" }, 400);
    }

    const isOnline = status === "online";
    console.log(`🔄 [DRIVERS/STATUS] ${driverId} → ${status.toUpperCase()}`);

    const driver = await kvGet(`driver:${driverId}`);
    if (!driver) {
      return c.json({ success: false, error: "Conducteur non trouvé" }, 404);
    }

    // Vérifier que le conducteur est approuvé
    if (driver.status !== "approved" && !driver.isApproved) {
      return c.json({
        success: false,
        error: "Votre compte n'est pas encore approuvé. Veuillez attendre la validation de l'administrateur.",
      }, 403);
    }

    // Vérifier le solde si passage EN LIGNE
    if (isOnline) {
      const balance = driver.creditBalance ?? driver.balance ?? 0;
      if (balance <= 0) {
        return c.json({
          success: false,
          error: "Solde insuffisant ! Rechargez votre compte pour vous mettre en ligne.",
        }, 400);
      }
    }

    const now = new Date().toISOString();
    const updatedDriver = {
      ...driver,
      isOnline,
      is_online: isOnline,
      is_available: isOnline,
      status_online: status,
      ...(location ? { location, lastLocation: location } : {}),
      lastOnlineChange: now,
      updated_at: now,
    };

    await kvSet(`driver:${driverId}`, updatedDriver);

    // Sync profil
    const profile = await kvGet(`profile:${driverId}`);
    if (profile) {
      await kvSet(`profile:${driverId}`, {
        ...profile,
        isOnline,
        is_online: isOnline,
        is_available: isOnline,
        updated_at: now,
      });
    }

    console.log(`✅ [DRIVERS/STATUS] ${driverId} → ${status.toUpperCase()} OK`);
    return c.json({
      success: true,
      isOnline,
      status,
      driver: updatedDriver,
      message: isOnline ? "Vous êtes maintenant en ligne" : "Vous êtes maintenant hors ligne",
    });
  } catch (error) {
    console.error("❌ [DRIVERS/STATUS] Erreur:", error);
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

// ─── GET /location/:driverId — Position GPS du conducteur ────────────────────
app.get("/location/:driverId", async (c) => {
  try {
    const driverId = c.req.param("driverId");
    console.log(`📍 [DRIVERS/LOCATION-GET] ${driverId}`);

    const driver = await kvGet(`driver:${driverId}`);
    if (!driver) {
      return c.json({ success: false, error: "Conducteur non trouvé" }, 404);
    }

    const location =
      driver.currentLocation ||
      driver.lastLocation ||
      driver.location ||
      driver.current_location ||
      null;

    return c.json({
      success: true,
      driverId,
      location,
      isOnline: driver.isOnline ?? driver.is_online ?? false,
    });
  } catch (error) {
    console.error("�� [DRIVERS/LOCATION-GET] Erreur:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

// ─── POST /:driverId/location — Mettre à jour la position ────────────────────
app.post("/:driverId/location", async (c) => {
  try {
    const driverId = c.req.param("driverId");
    const body = await c.req.json();
    const lat = body.lat ?? body.latitude;
    const lng = body.lng ?? body.longitude;

    if (lat === undefined || lng === undefined) {
      return c.json({ success: false, error: "lat et lng requis" }, 400);
    }

    console.log(`📍 [DRIVERS/LOCATION-POST] ${driverId}: (${lat}, ${lng})`);

    const driver = await kvGet(`driver:${driverId}`);
    if (!driver) {
      return c.json({ success: false, error: "Conducteur non trouvé" }, 404);
    }

    const locationObj = { lat, lng, updatedAt: new Date().toISOString() };
    const updatedDriver = {
      ...driver,
      location: locationObj,
      currentLocation: locationObj,
      lastLocation: locationObj,
      current_location: locationObj,
      updated_at: new Date().toISOString(),
    };

    await kvSet(`driver:${driverId}`, updatedDriver);

    return c.json({ success: true, driverId, location: locationObj });
  } catch (error) {
    console.error("❌ [DRIVERS/LOCATION-POST] Erreur:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

// ─── POST /update-driver-location — Endpoint alternatif de localisation ───────
app.post("/update-driver-location", async (c) => {
  try {
    const body = await c.req.json();
    const driverId = body.driverId;
    const lat = body.lat ?? body.latitude;
    const lng = body.lng ?? body.longitude;

    if (!driverId || lat === undefined || lng === undefined) {
      return c.json({ success: false, error: "driverId, lat et lng requis" }, 400);
    }

    console.log(`📍 [DRIVERS/UPDATE-LOCATION] ${driverId}: (${lat}, ${lng})`);

    const driver = await kvGet(`driver:${driverId}`);
    if (!driver) {
      // Créer une entrée minimale si inexistante
      const locationObj = { lat, lng, updatedAt: new Date().toISOString() };
      await kvSet(`driver:${driverId}`, {
        id: driverId,
        location: locationObj,
        currentLocation: locationObj,
        lastLocation: locationObj,
        updated_at: new Date().toISOString(),
      });
      return c.json({ success: true, driverId, location: locationObj });
    }

    const locationObj = { lat, lng, updatedAt: new Date().toISOString() };
    const updatedDriver = {
      ...driver,
      location: locationObj,
      currentLocation: locationObj,
      lastLocation: locationObj,
      current_location: locationObj,
      updated_at: new Date().toISOString(),
    };

    await kvSet(`driver:${driverId}`, updatedDriver);

    return c.json({ success: true, driverId, location: locationObj });
  } catch (error) {
    console.error("❌ [DRIVERS/UPDATE-LOCATION] Erreur:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

export default app;
