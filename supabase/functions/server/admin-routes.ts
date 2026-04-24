/**
 * 🛡️ ROUTES ADMIN - SMARTCABB
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

async function kvGetByPrefix(prefix: string): Promise<any[]> {
  try {
    const { data, error } = await kvClient()
      .from(KV_TABLE).select("key, value").like("key", prefix + "%");
    if (error) { console.error("KV getByPrefix error:", prefix, error.message); return []; }
    return data?.map((d: any) => d.value) ?? [];
  } catch (e) { console.error("KV getByPrefix exception:", e); return []; }
}

async function kvDel(key: string): Promise<void> {
  try {
    const { error } = await kvClient().from(KV_TABLE).delete().eq("key", key);
    if (error) throw new Error(error.message);
  } catch (e) { console.error("KV del error:", key, e); }
}

// ─── POST /reset-admin-account ────────────────────────────────────────────────

app.post("/reset-admin-account", async (c) => {
  try {
    console.log("🆘 RÉINITIALISATION DU COMPTE ADMIN...");

    const adminEmail = "contact@smartcabb.com";
    const adminPassword = "SmartCabb2024!";
    const adminPhone = "+243900000000";

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    );

    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find((u) => u.email === adminEmail);

    let authUserId;

    if (existingUser) {
      console.log("✅ Utilisateur existant trouvé, mise à jour du mot de passe...");
      authUserId = existingUser.id;
      await supabase.auth.admin.updateUserById(authUserId, {
        password: adminPassword,
        email_confirm: true,
      });
    } else {
      console.log("➕ Création d'un nouveau compte admin...");
      const { data, error } = await supabase.auth.admin.createUser({
        email: adminEmail,
        password: adminPassword,
        email_confirm: true,
        user_metadata: { full_name: "Admin SmartCabb", phone: adminPhone, role: "admin" },
      });

      if (error) {
        return c.json({ success: false, error: `Erreur Supabase Auth: ${error.message}` }, 500);
      }
      authUserId = data.user.id;
    }

    const adminProfile = {
      id: authUserId,
      email: adminEmail,
      phone: adminPhone,
      full_name: "Admin SmartCabb",
      role: "admin",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_login_at: null,
    };

    await kvSet(`profile:${authUserId}`, adminProfile);
    await kvSet(`admin:${authUserId}`, adminProfile);

    return c.json({
      success: true,
      message: "Compte admin réinitialisé avec succès",
      credentials: { email: adminEmail, password: adminPassword },
      admin: adminProfile,
    });
  } catch (error) {
    console.error("❌ Erreur réinitialisation admin:", error);
    return c.json({ success: false, error: error instanceof Error ? error.message : "Erreur serveur" }, 500);
  }
});

// ─── GET /stats ───────────────────────────────────────────────────────────────

app.get("/stats", async (c) => {
  try {
    const drivers = await kvGetByPrefix("driver:");
    const passengers = await kvGetByPrefix("passenger:");
    const rides = await kvGetByPrefix("ride:");

    const approvedDrivers = drivers.filter(
      (d: any) => d.isApproved === true && d.status !== "pending" && d.status !== "rejected"
    );
    const pendingDrivers = drivers.filter(
      (d: any) => d.status === "pending" || (!d.isApproved && d.status !== "rejected" && d.status !== "approved")
    );

    return c.json({
      success: true,
      stats: {
        totalDrivers: approvedDrivers.length,
        totalPassengers: passengers.length,
        totalRides: rides.length,
        pendingDrivers: pendingDrivers.length,
      },
    });
  } catch (error) {
    console.error("❌ Erreur stats admin:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

// ─── GET /users/all ───────────────────────────────────────────────────────────

app.get("/users/all", async (c) => {
  try {
    console.log("📋 Récupération de tous les utilisateurs...");
    const allProfiles = await kvGetByPrefix("profile:");

    if (!allProfiles || allProfiles.length === 0) {
      return c.json({ success: true, users: [], stats: { passengers: 0, drivers: 0, admins: 0, total: 0 } });
    }

    const formattedUsers = allProfiles.map((profile: any) => ({
      id: profile.id,
      role: profile.role === "passenger" ? "Passager"
          : profile.role === "driver" ? "Conducteur"
          : profile.role === "admin" ? "Administrateur"
          : "Inconnu",
      name: profile.full_name || profile.name || "Nom inconnu",
      phone: profile.phone || "Non renseigné",
      email: profile.email || "Non renseigné",
      password: profile.password || "••••••••",
      balance: profile.balance || 0,
      accountType: profile.account_type || (profile.role === "driver" ? "Postpayé" : "Standard"),
      vehicleCategory: profile.vehicle_category || profile.vehicleCategory || "-",
      vehiclePlate: profile.vehicle_plate || profile.vehiclePlate || "-",
      vehicleModel: profile.vehicle_model || profile.vehicleModel || "-",
      status: profile.status || (profile.role === "driver" ? "pending" : "Actif"),
      rating: profile.rating || 0,
      totalTrips: profile.total_trips || profile.total_rides || 0,
      createdAt: profile.created_at || new Date().toISOString(),
      lastLoginAt: profile.last_login_at || null,
    }));

    const stats = {
      passengers: formattedUsers.filter((u) => u.role === "Passager").length,
      drivers: formattedUsers.filter((u) => u.role === "Conducteur").length,
      admins: formattedUsers.filter((u) => u.role === "Administrateur").length,
      total: formattedUsers.length,
    };

    return c.json({ success: true, users: formattedUsers, stats });
  } catch (error) {
    console.error("❌ Erreur /admin/users/all:", error);
    return c.json({ success: false, error: error instanceof Error ? error.message : "Erreur serveur" }, 500);
  }
});

// ─── POST /drivers/:driverId/approve ──────────────────────────────────────────

app.post("/drivers/:driverId/approve", async (c) => {
  try {
    const driverId = c.req.param("driverId");
    console.log(`✅ Approbation du conducteur: ${driverId}`);

    const driver = await kvGet(`driver:${driverId}`);
    if (!driver) return c.json({ success: false, error: "Conducteur non trouvé" }, 404);

    const updatedDriver = {
      ...driver,
      status: "approved",
      isApproved: true,
      is_approved: true,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await kvSet(`driver:${driverId}`, updatedDriver);

    const profile = await kvGet(`profile:${driverId}`);
    if (profile) {
      await kvSet(`profile:${driverId}`, {
        ...profile,
        status: "approved",
        isApproved: true,
        is_approved: true,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    console.log(`✅ Conducteur approuvé: ${driver.full_name || driver.name}`);
    return c.json({ success: true, message: "Conducteur approuvé avec succès", driver: updatedDriver });
  } catch (error) {
    console.error("❌ Erreur approbation conducteur:", error);
    return c.json({ success: false, error: error instanceof Error ? error.message : "Erreur serveur" }, 500);
  }
});

// ─── POST /drivers/:driverId/reject ───────────────────────────────────────────

app.post("/drivers/:driverId/reject", async (c) => {
  try {
    const driverId = c.req.param("driverId");
    const body = await c.req.json().catch(() => ({}));
    const reason = body.reason || "Candidature rejetée par l'administrateur";

    const driver = await kvGet(`driver:${driverId}`);
    if (!driver) return c.json({ success: false, error: "Conducteur non trouvé" }, 404);

    const updatedDriver = {
      ...driver,
      status: "rejected",
      isApproved: false,
      is_approved: false,
      rejection_reason: reason,
      rejected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await kvSet(`driver:${driverId}`, updatedDriver);

    const profile = await kvGet(`profile:${driverId}`);
    if (profile) {
      await kvSet(`profile:${driverId}`, {
        ...profile,
        status: "rejected",
        isApproved: false,
        is_approved: false,
        updated_at: new Date().toISOString(),
      });
    }

    return c.json({ success: true, message: "Conducteur rejeté", driver: updatedDriver });
  } catch (error) {
    console.error("❌ Erreur rejet conducteur:", error);
    return c.json({ success: false, error: error instanceof Error ? error.message : "Erreur serveur" }, 500);
  }
});

// ─── GET /drivers/pending ─────────────────────────────────────────────────────

app.get("/drivers/pending", async (c) => {
  try {
    console.log("📋 Récupération des conducteurs en attente...");
    const allDrivers = await kvGetByPrefix("driver:");
    const pendingDrivers = allDrivers.filter(
      (d: any) => d.status === "pending" || (!d.isApproved && d.status !== "rejected" && d.status !== "approved")
    );
    console.log(`✅ ${pendingDrivers.length} conducteur(s) en attente`);
    return c.json({ success: true, drivers: pendingDrivers, count: pendingDrivers.length });
  } catch (error) {
    console.error("❌ Erreur récupération conducteurs en attente:", error);
    return c.json({ success: false, error: error instanceof Error ? error.message : "Erreur serveur" }, 500);
  }
});

// ─── POST /drivers/approve-all ────────────────────────────────────────────────

app.post("/drivers/approve-all", async (c) => {
  try {
    console.log("🚀 Approbation de TOUS les conducteurs en attente...");
    const allDrivers = await kvGetByPrefix("driver:");
    const pendingDrivers = allDrivers.filter(
      (d: any) => d.status === "pending" || !d.status || d.status === "inactive"
    );

    let approvedCount = 0;
    const approvedList = [];

    for (const driver of pendingDrivers) {
      try {
        const updatedDriver = {
          ...driver,
          status: "approved",
          isApproved: true,
          is_approved: true,
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        await kvSet(`driver:${driver.id}`, updatedDriver);

        const profile = await kvGet(`profile:${driver.id}`);
        if (profile) {
          await kvSet(`profile:${driver.id}`, {
            ...profile,
            status: "approved",
            isApproved: true,
            is_approved: true,
            approved_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }
        approvedCount++;
        approvedList.push({ id: driver.id, name: driver.full_name || driver.name, phone: driver.phone });
      } catch (err) {
        console.error(`❌ Erreur approbation ${driver.id}:`, err);
      }
    }

    return c.json({
      success: true,
      message: `${approvedCount} conducteur(s) approuvé(s)`,
      approved_count: approvedCount,
      approved_drivers: approvedList,
    });
  } catch (error) {
    console.error("❌ Erreur approbation massive:", error);
    return c.json({ success: false, error: error instanceof Error ? error.message : "Erreur serveur" }, 500);
  }
});

// ─── GET /drivers/diagnostic/:phone ──────────────────────────────────────────

app.get("/drivers/diagnostic/:phone", async (c) => {
  try {
    const phone = c.req.param("phone");
    const allDrivers = await kvGetByPrefix("driver:");
    const driver = allDrivers.find(
      (d: any) => d.phone === phone || d.phone === `+${phone}` || d.phone === phone.replace("+", "")
    );

    if (!driver) return c.json({ success: false, error: "Conducteur non trouvé", searched_phone: phone }, 404);

    return c.json({
      success: true,
      driver,
      diagnostic: {
        id: driver.id,
        name: driver.full_name || driver.name,
        phone: driver.phone,
        status: driver.status,
        isApproved: driver.isApproved,
        is_available: driver.is_available,
        created_at: driver.created_at,
        approved_at: driver.approved_at,
        last_login: driver.last_login_at,
      },
    });
  } catch (error) {
    console.error("❌ Erreur diagnostic conducteur:", error);
    return c.json({ success: false, error: error instanceof Error ? error.message : "Erreur serveur" }, 500);
  }
});

// ─── GET /cancellations ───────────────────────────────────────────────────────

app.get("/cancellations", async (c) => {
  try {
    const allCancellations = await kvGetByPrefix("cancellation:");
    const sorted = allCancellations.sort(
      (a: any, b: any) => new Date(b.cancelledAt).getTime() - new Date(a.cancelledAt).getTime()
    );

    const byPassenger = allCancellations.filter((c: any) => c.cancelledBy === "passenger").length;
    const byDriver = allCancellations.filter((c: any) => c.cancelledBy === "driver").length;
    const withPenalty = allCancellations.filter((c: any) => c.hasPenalty).length;
    const totalPenalties = allCancellations
      .filter((c: any) => c.hasPenalty)
      .reduce((sum: number, c: any) => sum + (c.penaltyAmount || 0), 0);

    const reasonCounts: Record<string, number> = {};
    allCancellations.forEach((c: any) => {
      const reason = c.reason || "Non spécifiée";
      reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
    });

    return c.json({
      success: true,
      cancellations: sorted,
      stats: { total: allCancellations.length, byPassenger, byDriver, withPenalty, totalPenalties },
      byReason: reasonCounts,
    });
  } catch (error) {
    console.error("❌ Erreur récupération annulations:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

export default app;
