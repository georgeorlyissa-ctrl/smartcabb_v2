/**
 * 🛡️ ROUTES ADMIN - SMARTCABB
 * ⚠️ FICHIER 100% AUTONOME — aucun import local
 * @version 3.0.0
 */

import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendFCMNotification } from "./firebase-admin.ts";

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
    const [drivers, passengers, rides] = await Promise.all([
      kvGetByPrefix("driver:"),
      kvGetByPrefix("passenger:"),
      kvGetByPrefix("ride:"),
    ]);

    // ─── Filtres conducteurs ──────────────────────────────────────────────────
    const approvedDrivers = drivers.filter(
      (d: any) => d.isApproved === true || d.is_approved === true || d.status === "approved"
    );
    const pendingDrivers = drivers.filter(
      (d: any) => d.status === "pending" || (!d.isApproved && !d.is_approved && d.status !== "rejected" && d.status !== "approved")
    );
    const onlineDrivers = drivers.filter(
      (d: any) => d.isOnline === true || d.is_online === true || d.status === "online" || d.is_available === true
    );

    // ─── Métriques courses ────────────────────────────────────────────────────
    const completedRides = rides.filter((r: any) => r.status === "completed" || r.status === "rated");
    // ✅ FIX: Ajouter "in_progress" pour les courses réellement en cours
    const activeRides    = rides.filter((r: any) => r.status === "in_progress" || r.status === "started" || r.status === "accepted" || r.status === "searching");
    const cancelledRides = rides.filter((r: any) => r.status === "cancelled");

    function ridePrice(r: any): number {
      const raw = r.totalPrice ?? r.finalPrice ?? r.finalAmount ?? r.estimatedPrice ?? r.price ?? 0;
      return typeof raw === "string" ? parseFloat(raw) || 0 : Number(raw) || 0;
    }

    const totalRevenueCDF = completedRides.reduce((s: number, r: any) => s + ridePrice(r), 0);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayCompleted = completedRides.filter((r: any) => {
      const ts = r.completedAt || r.updatedAt || r.createdAt || r.created_at || "";
      return ts && new Date(ts) >= todayStart;
    });
    const revenueTodayCDF = todayCompleted.reduce((s: number, r: any) => s + ridePrice(r), 0);

    const cancelledToday = cancelledRides.filter((r: any) => {
      const ts = r.cancelledAt || r.updatedAt || r.createdAt || r.created_at || "";
      return ts && new Date(ts) >= todayStart;
    });

    const ratedDrivers = drivers.filter((d: any) => (d.rating || 0) > 0);
    const avgRating = ratedDrivers.length > 0
      ? ratedDrivers.reduce((s: number, d: any) => s + (d.rating || 0), 0) / ratedDrivers.length
      : 0;

    console.log(`📊 Stats: ${approvedDrivers.length} conducteurs, ${passengers.length} passagers, ${rides.length} courses, ${Math.round(totalRevenueCDF)} CDF`);

    return c.json({
      success: true,
      stats: {
        totalDrivers:     approvedDrivers.length,
        totalPassengers:  passengers.length,
        pendingDrivers:   pendingDrivers.length,
        onlineDrivers:    onlineDrivers.length,
        totalRides:       rides.length,
        completedRides:   completedRides.length,
        activeRides:      activeRides.length,
        cancelledRides:   cancelledRides.length,
        cancelledToday:   cancelledToday.length,
        ridesToday:       todayCompleted.length,
        totalRevenueCDF:  Math.round(totalRevenueCDF),
        revenueTodayCDF:  Math.round(revenueTodayCDF),
        averageRating:    Math.round(avgRating * 10) / 10,
      },
    });
  } catch (error) {
    console.error("❌ Erreur stats admin:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// ─── Constante config ─────────────────────────────────────────────────────────
const CONFIG_KEY = "smartcabb_global_config";
const DEFAULT_SETTINGS = {
  exchangeRate: 2800, commissionRate: 10, nightTimeStart: "21:00",
  nightTimeEnd: "06:00", freeWaitingMinutes: 10, distantZoneMultiplier: 2,
  postpaidEnabled: true, postpaidFee: 5000, flutterwaveEnabled: true,
  smsEnabled: true, smsProvider: "africas_talking", notificationsEnabled: true,
  appVersion: "1.0.0", maintenanceMode: false, commissionEnabled: true,
  minimumCommission: 500, paymentFrequency: "immediate", autoDeduction: true,
  postpaidInterestRate: 15,
};

// ─── GET /settings/load — Charger la configuration globale ───────────────────
app.get("/settings/load", async (c) => {
  try {
    const stored = await kvGet(CONFIG_KEY);
    return c.json({ success: true, settings: { ...DEFAULT_SETTINGS, ...(stored || {}) } });
  } catch (error) {
    console.error("❌ Erreur settings/load:", error);
    return c.json({ success: true, settings: DEFAULT_SETTINGS });
  }
});

// ─── POST /settings/save — Sauvegarder la configuration globale ───────────────
app.post("/settings/save", async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const existing = (await kvGet(CONFIG_KEY)) ?? DEFAULT_SETTINGS;
    const merged = { ...existing, ...body, lastUpdated: new Date().toISOString() };
    await kvSet(CONFIG_KEY, merged);
    console.log("⚙️ [ADMIN/SETTINGS/SAVE] Configuration sauvegardée");
    return c.json({ success: true, settings: merged });
  } catch (error) {
    console.error("❌ Erreur settings/save:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// ─── GET /sms/balance — Solde Africa's Talking ───────────────────────────────
app.get("/sms/balance", async (c) => {
  try {
    const username = Deno.env.get("AFRICAS_TALKING_USERNAME") || "";
    const apiKey   = Deno.env.get("AFRICAS_TALKING_API_KEY")  || "";

    // Lire statistiques SMS depuis le KV (logs d'envoi)
    const smsLogs = await kvGetByPrefix("sms_log:");
    const totalSent     = smsLogs.filter((l: any) => l.status === "sent"   || l.success === true).length;
    const totalFailed   = smsLogs.filter((l: any) => l.status === "failed" || l.success === false).length;
    const totalAttempted = smsLogs.length;

    const byType: Record<string, number> = {};
    smsLogs.forEach((l: any) => {
      const t = l.type || "other";
      byType[t] = (byType[t] || 0) + 1;
    });

    const successRate = totalAttempted > 0
      ? `${Math.round((totalSent / totalAttempted) * 100)}%`
      : "100%";

    // Appel à l'API Africa's Talking si les credentials existent
    let atBalance = 0;
    let atCurrency = "KES";
    let atError: string | undefined;

    if (username && apiKey) {
      try {
        const atResp = await fetch(
          `https://api.africastalking.com/version1/user?username=${encodeURIComponent(username)}`,
          {
            headers: {
              "Accept":    "application/json",
              "apiKey":    apiKey,
            },
          }
        );

        if (atResp.ok) {
          const atData = await atResp.json();
          const balanceStr: string = atData?.UserData?.balance ?? "0";
          // Format: "KES 12.50" ou "USD 3.00"
          const parts = balanceStr.trim().split(" ");
          if (parts.length >= 2) {
            atCurrency = parts[0];
            atBalance  = parseFloat(parts[1]) || 0;
          } else {
            atBalance = parseFloat(balanceStr) || 0;
          }
        } else {
          atError = `AT API HTTP ${atResp.status}`;
        }
      } catch (atErr: any) {
        atError = atErr.message;
        console.warn("⚠️ Africa's Talking balance error:", atErr.message);
      }
    } else {
      atError = "Credentials Africa's Talking non configurés";
    }

    const costPerSms  = 0.0035; // ~$0.0035 USD par SMS (Kenya)
    const remainingSms = atBalance > 0 ? Math.floor(atBalance / costPerSms) : 0;

    return c.json({
      success:  true,
      balance:  atBalance,
      currency: atCurrency,
      balance_data: {
        amount:          atBalance,
        currency:        atCurrency,
        formattedBalance: `${atCurrency} ${atBalance.toFixed(2)}`,
        error:           atError,
      },
      estimation: {
        costPerSms,
        remainingSms,
        estimatedCost: {
          perSms:    `$${costPerSms}`,
          per100Sms: `$${(costPerSms * 100).toFixed(2)}`,
          per1000Sms: `$${(costPerSms * 1000).toFixed(2)}`,
        },
      },
      usage: { totalSent, totalFailed, totalAttempted, successRate, byType },
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Erreur sms/balance:", error);
    return c.json({
      success: false,
      error: String(error),
      balance: 0, currency: "USD",
      balance_data: { amount: 0, currency: "USD", formattedBalance: "USD 0.00" },
      estimation: { costPerSms: 0.0035, remainingSms: 0, estimatedCost: { perSms: "$0.0035", per100Sms: "$0.35", per1000Sms: "$3.50" } },
      usage: { totalSent: 0, totalFailed: 0, totalAttempted: 0, successRate: "0%", byType: {} },
      lastUpdated: new Date().toISOString(),
    }, 500);
  }
});

// ─── GET /rides — Liste de toutes les courses ─────────────────────────────────
app.get("/rides", async (c) => {
  try {
    const limit  = Math.min(parseInt(c.req.query("limit")  || "500"), 1000);
    const status = c.req.query("status") || null;

    const allRides = await kvGetByPrefix("ride:");

    const filtered = status
      ? allRides.filter((r: any) => r.status === status)
      : allRides;

    const sorted = filtered
      .sort((a: any, b: any) => {
        const ta = new Date(a.createdAt || a.created_at || 0).getTime();
        const tb = new Date(b.createdAt || b.created_at || 0).getTime();
        return tb - ta;
      })
      .slice(0, limit);

    // Normaliser les champs pour la compatibilité front-end
    const rides = sorted.map((r: any) => ({
      id:               r.id,
      passenger_id:     r.passengerId     || r.passenger_id     || null,
      driver_id:        r.driverId        || r.driver_id        || null,
      pickup_address:   r.pickup?.address || r.pickupAddress    || "—",
      dropoff_address:  r.destination?.address || r.destinationAddress || "—",
      total_amount:     r.totalPrice      ?? r.finalPrice ?? r.finalAmount ?? r.estimatedPrice ?? 0,
      status:           r.status          || "unknown",
      created_at:       r.createdAt       || r.created_at       || null,
      completed_at:     r.completedAt     || r.completed_at     || null,
      vehicle_category: r.vehicleCategory || r.vehicle_category || r.vehicleType || null,
      rating:           r.rating          || null,
      duration:         r.duration        || null,
      passengerName:    r.passengerName   || r.passenger_name   || null,
      driverName:       r.driverName      || r.driver_name      || null,
      cancelReason:     r.cancellationReason || r.cancelReason  || null,
    }));

    console.log(`📋 /admin/rides: ${rides.length} courses retournées`);
    return c.json({ success: true, rides, count: rides.length });
  } catch (error) {
    console.error("❌ Erreur /admin/rides:", error);
    return c.json({ success: false, rides: [], error: String(error) }, 500);
  }
});

// ─── GET /reports/financial — Lister les rapports sauvegardés ────────────────
app.get("/reports/financial", async (c) => {
  try {
    const reports = await kvGetByPrefix("financial_report:");
    const sorted = reports.sort((a: any, b: any) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    return c.json({ success: true, reports: sorted });
  } catch (error) {
    console.error("❌ Erreur /reports/financial:", error);
    return c.json({ success: false, reports: [], error: String(error) }, 500);
  }
});

// ─── POST /reports/generate — Générer un rapport depuis le KV store ──────────
app.post("/reports/generate", async (c) => {
  try {
    const body = await c.req.json();
    const { startDate, endDate } = body;

    if (!startDate || !endDate) {
      return c.json({ success: false, error: "startDate et endDate requis" }, 400);
    }

    const [allRides, config] = await Promise.all([
      kvGetByPrefix("ride:"),
      kvGet(CONFIG_KEY),
    ]);

    const cfg = config || DEFAULT_SETTINGS;
    const commissionRate = (cfg.commissionRate ?? 10) / 100;
    const start = new Date(startDate).getTime();
    const end   = new Date(endDate).getTime();

    const periodRides = allRides.filter((ride: any) => {
      const ts = new Date(ride.createdAt || ride.created_at || 0).getTime();
      const done = ride.status === "completed" || ride.status === "rated";
      return done && ts >= start && ts <= end;
    });

    const totalRevenue = periodRides.reduce((s: number, r: any) =>
      s + (r.totalPrice ?? r.finalPrice ?? r.finalAmount ?? r.estimatedPrice ?? 0), 0);
    const commissionAmount = Math.round(totalRevenue * commissionRate);
    const driverEarnings   = Math.round(totalRevenue - commissionAmount);
    const netRevenue       = Math.round(totalRevenue); // pas de remboursements

    // Ventilation par catégorie
    const byCategory: Record<string, { rides: number; revenue: number }> = {};
    periodRides.forEach((r: any) => {
      const cat = r.vehicleCategory || r.vehicle_category || r.vehicleType || "Autre";
      if (!byCategory[cat]) byCategory[cat] = { rides: 0, revenue: 0 };
      byCategory[cat].rides++;
      byCategory[cat].revenue += r.totalPrice ?? r.finalPrice ?? r.estimatedPrice ?? 0;
    });

    const report = {
      id:               `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      period_start:     startDate,
      period_end:       endDate,
      total_revenue:    Math.round(totalRevenue),
      total_rides:      periodRides.length,
      commission_amount: commissionAmount,
      driver_earnings:  driverEarnings,
      refunds_amount:   0,
      net_revenue:      netRevenue,
      commission_rate:  cfg.commissionRate ?? 10,
      by_category:      byCategory,
      status:           "pending",
      created_at:       new Date().toISOString(),
      generated_by:     "admin",
    };

    await kvSet(`financial_report:${report.id}`, report);
    console.log(`📊 Rapport financier généré: ${report.id} (${periodRides.length} courses, ${totalRevenue} CDF)`);
    return c.json({ success: true, report });
  } catch (error) {
    console.error("❌ Erreur /reports/generate:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// ─── PUT /reports/finalize/:id — Finaliser un rapport ────────────────────────
app.put("/reports/finalize/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const report = await kvGet(`financial_report:${id}`);
    if (!report) return c.json({ success: false, error: "Rapport introuvable" }, 404);
    const updated = { ...report, status: "finalized", finalized_at: new Date().toISOString() };
    await kvSet(`financial_report:${id}`, updated);
    return c.json({ success: true, report: updated });
  } catch (error) {
    console.error("❌ Erreur /reports/finalize:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// ─── DELETE /reports/:id — Supprimer un rapport ───────────────────────────────
app.delete("/reports/:id", async (c) => {
  try {
    const id = c.req.param("id");
    await kvDel(`financial_report:${id}`);
    return c.json({ success: true });
  } catch (error) {
    console.error("❌ Erreur /reports/delete:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// ─── GET /reports/summary — Stats en temps réel du mois courant ──────────────
app.get("/reports/summary", async (c) => {
  try {
    const [allRides, config] = await Promise.all([
      kvGetByPrefix("ride:"),
      kvGet(CONFIG_KEY),
    ]);

    const cfg = config || DEFAULT_SETTINGS;
    const commissionRate = (cfg.commissionRate ?? 10) / 100;

    const now   = new Date();
    const month = now.getMonth();
    const year  = now.getFullYear();

    const monthRides = allRides.filter((r: any) => {
      const d = new Date(r.createdAt || r.created_at || 0);
      return d.getMonth() === month && d.getFullYear() === year &&
        (r.status === "completed" || r.status === "rated");
    });

    const totalRevenue    = monthRides.reduce((s: number, r: any) =>
      s + (r.totalPrice ?? r.finalPrice ?? r.estimatedPrice ?? 0), 0);
    const commissionAmount = Math.round(totalRevenue * commissionRate);
    const driverEarnings  = Math.round(totalRevenue - commissionAmount);

    return c.json({
      success: true,
      summary: {
        totalRevenue:    Math.round(totalRevenue),
        commissionAmount,
        driverEarnings,
        netRevenue:      Math.round(totalRevenue),
        totalRides:      monthRides.length,
        commissionRate:  cfg.commissionRate ?? 10,
        month:           now.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }),
      },
    });
  } catch (error) {
    console.error("❌ Erreur /reports/summary:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// ─── GET /revenue — Détail financier ──────────────────────────────────────────
app.get("/revenue", async (c) => {
  try {
    const rides = await kvGetByPrefix("ride:");
    const completedRides = rides.filter((r: any) => r.status === "completed" || r.status === "rated");

    // Group by day (last 30 days)
    const byDay: Record<string, { revenue: number; rides: number }> = {};
    const now = new Date();

    for (let i = 0; i < 30; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      byDay[key] = { revenue: 0, rides: 0 };
    }

    completedRides.forEach((r: any) => {
      const dateStr = (r.completedAt || r.createdAt || r.created_at || "").slice(0, 10);
      if (byDay[dateStr]) {
        const price = r.totalPrice || r.estimatedPrice || r.finalAmount || 0;
        byDay[dateStr].revenue += typeof price === "string" ? parseFloat(price) || 0 : price;
        byDay[dateStr].rides   += 1;
      }
    });

    // Group by category
    const byCategory: Record<string, { revenue: number; rides: number }> = {};
    completedRides.forEach((r: any) => {
      const cat = r.vehicleCategory || r.vehicleType || "unknown";
      if (!byCategory[cat]) byCategory[cat] = { revenue: 0, rides: 0 };
      const price = r.totalPrice || r.estimatedPrice || r.finalAmount || 0;
      byCategory[cat].revenue += typeof price === "string" ? parseFloat(price) || 0 : price;
      byCategory[cat].rides   += 1;
    });

    const totalRevenue = completedRides.reduce((sum: number, r: any) => {
      const price = r.totalPrice || r.estimatedPrice || r.finalAmount || 0;
      return sum + (typeof price === "string" ? parseFloat(price) || 0 : price);
    }, 0);

    // Get exchange rate from config
    const config = await kvGet("smartcabb_global_config");
    const exchangeRate = config?.exchangeRate || 2800;

    return c.json({
      success: true,
      revenue: {
        totalCDF:     Math.round(totalRevenue),
        totalUSD:     Math.round(totalRevenue / exchangeRate * 100) / 100,
        exchangeRate,
        byDay:        Object.entries(byDay)
                        .sort(([a], [b]) => a.localeCompare(b))
                        .map(([date, data]) => ({ date, ...data })),
        byCategory,
        completedCount: completedRides.length,
      },
    });
  } catch (error) {
    console.error("❌ Erreur revenue:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

// ─── POST /log-event — Journalisation des événements ──────────────────────────
app.post("/log-event", async (c) => {
  try {
    const body = await c.req.json();
    const { type, data, actor } = body;

    if (!type) return c.json({ success: false, error: "type required" }, 400);

    const eventId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const event = {
      id: eventId,
      type,
      data: data || {},
      actor: actor || "system",
      timestamp: new Date().toISOString(),
    };

    await kvSet(`event:${event.timestamp.slice(0, 10)}:${eventId}`, event);
    console.log(`📝 Événement enregistré: ${type} (${eventId})`);

    return c.json({ success: true, event });
  } catch (error) {
    console.error("❌ Erreur log-event:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

// ─── Helper : extraire texte depuis pickup/destination (string ou objet) ───────
function extractPlace(p: any): string {
  if (!p) return "—";
  if (typeof p === "string") return p || "—";
  return p.name || p.address || p.formatted_address || p.label || "—";
}

// ─── Helper : extraire prix normalisé ─────────────────────────────────────────
function extractPrice(r: any): number {
  const raw = r.totalPrice ?? r.finalPrice ?? r.finalAmount ?? r.estimatedPrice ?? r.price ?? 0;
  return typeof raw === "string" ? parseFloat(raw) || 0 : Number(raw) || 0;
}

// ─── GET /live-feed — Flux d'événements temps réel ────────────────────────────
app.get("/live-feed", async (c) => {
  try {
    const limit  = Math.min(parseInt(c.req.query("limit") || "50"), 100);
    const days   = parseInt(c.req.query("days") || "7");
    const cutoff = Date.now() - days * 86400000;

    // ─── 1. Toutes les courses ───────────────────────────────────────────────
    const allRides = await kvGetByPrefix("ride:");
    const rideEvents = allRides
      .map((r: any) => {
        const ts = r.completedAt || r.cancelledAt || r.startedAt || r.acceptedAt || r.createdAt || r.created_at;
        let type = "ride_requested";
        if (r.status === "completed" || r.status === "rated") type = "ride_completed";
        else if (r.status === "cancelled") type = "ride_cancelled";
        else if (r.status === "started")   type = "ride_started";
        else if (r.status === "accepted")  type = "ride_accepted";
        return {
          id: `ride-${r.id || Math.random()}`,
          type,
          data: {
            rideId:        r.id,
            passengerName: r.passengerName  || r.passenger_name  || "Passager",
            driverName:    r.driverName     || r.driver_name     || null,
            pickup:        extractPlace(r.pickup || r.pickupLocation),
            destination:   extractPlace(r.destination || r.dropoffLocation),
            price:         extractPrice(r),
            category:      r.vehicleCategory || r.vehicle_category || r.vehicleType || "—",
            cancelledBy:   r.cancelledBy     || null,
            cancelReason:  r.cancellationReason || r.cancelReason || r.reason || null,
            duration:      r.duration || null,
            distance:      r.distance || null,
          },
          timestamp: ts || new Date().toISOString(),
          _ts: ts ? new Date(ts).getTime() : 0,
        };
      })
      .filter((e: any) => e._ts === 0 || e._ts >= cutoff)
      .sort((a: any, b: any) => b._ts - a._ts)
      .slice(0, limit);

    // ─── 2. Annulations dédiées (prefixe cancellation:) ─────────────────────
    const allCancellations = await kvGetByPrefix("cancellation:");
    const cancelEvents = allCancellations
      .map((c: any) => {
        const ts = c.cancelledAt || c.createdAt || c.created_at;
        return {
          id: `cancel-${c.id || Math.random()}`,
          type: "ride_cancelled",
          data: {
            rideId:        c.rideId,
            passengerName: c.passengerName || "Passager",
            driverName:    c.driverName    || null,
            pickup:        extractPlace(c.pickup),
            destination:   extractPlace(c.destination),
            price:         c.estimatedPrice || 0,
            category:      c.vehicleType   || c.vehicleCategory || "—",
            cancelledBy:   c.cancelledBy   || null,
            cancelReason:  c.reason        || null,
            hasPenalty:    c.hasPenalty    || false,
            penaltyAmount: c.penaltyAmount || 0,
          },
          timestamp: ts || new Date().toISOString(),
          _ts: ts ? new Date(ts).getTime() : 0,
        };
      })
      .filter((e: any) => e._ts === 0 || e._ts >= cutoff)
      .sort((a: any, b: any) => b._ts - a._ts)
      .slice(0, limit);

    // ─── 3. Événements logués ────────────────────────────────────────────────
    const loggedEvents: any[] = [];
    for (let i = 0; i < Math.min(days, 7); i++) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      const dayEvents = await kvGetByPrefix(`event:${d}:`);
      loggedEvents.push(...dayEvents);
    }
    const sortedLog = loggedEvents
      .filter((e: any) => e && e.timestamp)
      .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);

    // ─── 4. Merger sans doublons ─────────────────────────────────────────────
    const cancelRideIds = new Set(cancelEvents.map((e: any) => e.data?.rideId).filter(Boolean));
    const filteredRideEvents = rideEvents.filter(
      (e: any) => !(e.type === "ride_cancelled" && cancelRideIds.has(e.data?.rideId))
    );

    const merged = [...cancelEvents, ...filteredRideEvents, ...sortedLog]
      .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);

    console.log(`📡 live-feed: ${rideEvents.length} rides, ${cancelEvents.length} annulations, ${sortedLog.length} logs → ${merged.length} total`);
    return c.json({ success: true, events: merged, count: merged.length });
  } catch (error) {
    console.error("❌ Erreur live-feed:", error);
    return c.json({ success: false, events: [], error: String(error) }, 500);
  }
});

// ─── GET /cancellations — Écran annulations admin ────────────────────────────
app.get("/cancellations", async (c) => {
  try {
    console.log("📋 [ADMIN/CANCELLATIONS] Chargement...");

    const [allCancellations, allRides] = await Promise.all([
      kvGetByPrefix("cancellation:"),
      kvGetByPrefix("ride:"),
    ]);

    const cancelledRides = allRides.filter((r: any) => r.status === "cancelled");
    const existingRideIds = new Set(allCancellations.map((c: any) => c.rideId).filter(Boolean));

    // Rides annulés sans enregistrement dédié
    const rideCancellations = cancelledRides
      .filter((r: any) => !existingRideIds.has(r.id))
      .map((r: any) => ({
        id: `ride-cancel-${r.id}`,
        rideId: r.id,
        cancelledAt: r.cancelledAt || r.updated_at || r.createdAt || new Date().toISOString(),
        cancelledBy: r.cancelledBy || "unknown",
        reason: r.cancellationReason || r.cancelReason || "Non spécifiée",
        pickup: extractPlace(r.pickup || r.pickupLocation),
        destination: extractPlace(r.destination || r.dropoffLocation),
        estimatedPrice: extractPrice(r),
        distance: r.distance || 0,
        vehicleType: r.vehicleCategory || r.vehicleType || "—",
        status: "cancelled",
        passengerId: r.passengerId || null,
        passengerName: r.passengerName || "Passager",
        passengerPhone: r.passengerPhone || "—",
        driverId: r.driverId || null,
        driverName: r.driverName || null,
        driverPhone: r.driverPhone || null,
        createdAt: r.createdAt || new Date().toISOString(),
        acceptedAt: r.acceptedAt || null,
        startedAt: r.startedAt || null,
        hasPenalty: false,
        penaltyAmount: 0,
      }));

    // Normaliser enregistrements dédiés
    const normalized = allCancellations.map((c: any) => ({
      id: c.id,
      rideId: c.rideId,
      cancelledAt: c.cancelledAt || new Date().toISOString(),
      cancelledBy: c.cancelledBy || "unknown",
      reason: c.reason || "Non spécifiée",
      pickup: extractPlace(c.pickup),
      destination: extractPlace(c.destination),
      estimatedPrice: c.estimatedPrice || 0,
      distance: c.distance || 0,
      vehicleType: c.vehicleType || "—",
      status: c.status || "cancelled",
      passengerId: c.passengerId || null,
      passengerName: c.passengerName || "Passager",
      passengerPhone: c.passengerPhone || "—",
      driverId: c.driverId || null,
      driverName: c.driverName || null,
      driverPhone: c.driverPhone || null,
      createdAt: c.createdAt || new Date().toISOString(),
      acceptedAt: c.acceptedAt || null,
      startedAt: c.startedAt || null,
      hasPenalty: c.hasPenalty || false,
      penaltyAmount: c.penaltyAmount || 0,
    }));

    const all = [...normalized, ...rideCancellations]
      .sort((a, b) => new Date(b.cancelledAt).getTime() - new Date(a.cancelledAt).getTime());

    const stats = {
      total:          all.length,
      byPassenger:    all.filter(c => c.cancelledBy === "passenger").length,
      byDriver:       all.filter(c => c.cancelledBy === "driver").length,
      withPenalty:    all.filter(c => c.hasPenalty).length,
      totalPenalties: all.reduce((s, c) => s + (c.penaltyAmount || 0), 0),
    };
    const byReason: Record<string, number> = {};
    all.forEach(c => { const r = c.reason || "Non spécifiée"; byReason[r] = (byReason[r] || 0) + 1; });

    console.log(`✅ [ADMIN/CANCELLATIONS] ${all.length} annulations`);
    return c.json({ success: true, cancellations: all, stats, byReason });
  } catch (error) {
    console.error("❌ Erreur /admin/cancellations:", error);
    return c.json({ success: false, cancellations: [], stats: { total:0, byPassenger:0, byDriver:0, withPenalty:0, totalPenalties:0 }, byReason: {}, error: String(error) }, 500);
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

    // ✅ FIX : Charger aussi les driver: KV pour avoir les vraies stats (note, courses, gains)
    const allDriversKV = await kvGetByPrefix("driver:");
    const driverMap = new Map<string, any>(
      allDriversKV.map((d: any) => [d.id || d.userId, d])
    );

    const formattedUsers = allProfiles.map((profile: any) => {
      // Pour les conducteurs, on fusionne avec le driver KV (vrai source des stats)
      const driverKV = profile.role === "driver" ? driverMap.get(profile.id) : null;

      return {
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
        vehicleCategory: profile.vehicle_category || profile.vehicleCategory
          || driverKV?.vehicle?.category || "-",
        vehiclePlate: profile.vehicle_plate || profile.vehiclePlate
          || driverKV?.vehicle?.license_plate || "-",
        vehicleModel: profile.vehicle_model || profile.vehicleModel
          || (driverKV?.vehicle ? `${driverKV.vehicle.make || ""} ${driverKV.vehicle.model || ""}`.trim() : "-"),
        status: profile.status || driverKV?.status || (profile.role === "driver" ? "pending" : "Actif"),
        // ✅ Priorité driver KV (source de vérité des stats conducteurs)
        rating: driverKV?.rating || profile.rating || 0,
        totalTrips: driverKV?.total_rides || driverKV?.totalRides || profile.total_trips || profile.total_rides || 0,
        // ✅ NOUVEAU : Gains totaux depuis driver KV
        totalEarnings: driverKV?.total_earnings || driverKV?.totalEarnings || profile.total_earnings || 0,
        createdAt: profile.created_at || new Date().toISOString(),
        lastLoginAt: profile.last_login_at || null,
      };
    });

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

    // ─── Log événement + notification FCM au conducteur ───────────────────
    try {
      const eventId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const today   = new Date().toISOString().slice(0, 10);
      await kvSet(`event:${today}:${eventId}`, {
        id: eventId, type: 'driver_approved',
        data: { driverId, name: driver.full_name || driver.name, phone: driver.phone },
        actor: 'admin', timestamp: new Date().toISOString(),
      });
      if (driver.fcmToken) {
        await sendFCMNotification(driver.fcmToken, {
          title: '✅ Compte approuvé !',
          body: 'Félicitations ! Votre compte SmartCabb a été approuvé. Vous pouvez maintenant vous mettre en ligne.',
          data: { type: 'account_approved' }
        });
      }
    } catch (_) {}

    return c.json({ success: true, message: "Conducteur approuvé avec succès", driver: updatedDriver });
  } catch (error) {
    console.error("❌ Erreur approbation conducteur:", error);
    return c.json({ success: false, error: error instanceof Error ? error.message : "Erreur serveur" }, 500);
  }
});

// ─── POST /drivers/:driverId/reject ────────────────────────────────────────��──

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

    // ─── Log événement + notification FCM au conducteur ───────────────────
    try {
      const eventId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const today   = new Date().toISOString().slice(0, 10);
      await kvSet(`event:${today}:${eventId}`, {
        id: eventId, type: 'driver_rejected',
        data: { driverId, name: driver.full_name || driver.name, phone: driver.phone, reason },
        actor: 'admin', timestamp: new Date().toISOString(),
      });
      if (driver.fcmToken) {
        await sendFCMNotification(driver.fcmToken, {
          title: '❌ Candidature non retenue',
          body: `Votre candidature SmartCabb n'a pas été acceptée. Raison : ${reason}`,
          data: { type: 'account_rejected', reason }
        });
      }
    } catch (_) {}

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

// ─── POST /drivers/approve-all ───────────────────────────────────────────────

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

// ─── DELETE /delete-all-drivers — Suppression totale des conducteurs ──────────
app.delete("/delete-all-drivers", async (c) => {
  try {
    console.log("💥 [ADMIN/DELETE-ALL-DRIVERS] Suppression totale des conducteurs...");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: kvRows } = await supabase
      .from(KV_TABLE).select("key, value").like("key", "driver:%");
    const drivers = kvRows?.map((r: any) => r.value) ?? [];
    let deleted = 0;
    const errors: string[] = [];

    for (const driver of drivers) {
      try {
        const id = driver?.id;
        if (!id) continue;
        try { await supabase.auth.admin.deleteUser(id); } catch (_) {}
        await supabase.from(KV_TABLE).delete().eq("key", `driver:${id}`);
        await supabase.from(KV_TABLE).delete().eq("key", `profile:${id}`);
        deleted++;
        console.log(`✅ Driver supprimé: ${driver.full_name || id}`);
      } catch (err: any) {
        errors.push(`${driver?.id}: ${err.message}`);
      }
    }
    // Nettoyer aussi les FCM tokens orphelins
    await supabase.from(KV_TABLE).delete().like("key", "fcm_token:driver:%");

    return c.json({ success: true, count: deleted, errors, message: `${deleted} conducteur(s) supprimé(s)` });
  } catch (error) {
    console.error("❌ [ADMIN/DELETE-ALL-DRIVERS] Erreur:", error);
    return c.json({ success: false, error: error instanceof Error ? error.message : "Erreur serveur" }, 500);
  }
});

// ─── DELETE /clean-invalid-drivers — Suppression des conducteurs invalides ────
app.delete("/clean-invalid-drivers", async (c) => {
  try {
    console.log("🧹 [ADMIN/CLEAN-INVALID] Nettoyage des conducteurs invalides...");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: kvRows } = await supabase
      .from(KV_TABLE).select("key, value").like("key", "driver:%");
    const drivers = kvRows?.map((r: any) => r.value) ?? [];
    let deleted = 0;

    for (const driver of drivers) {
      const isInvalid = !driver?.id
        || (!driver?.full_name && !driver?.name)
        || !driver?.email
        || (!driver?.vehicleCategory && !driver?.vehicle_category);
      if (!isInvalid) continue;
      try {
        if (driver?.id) {
          try { await supabase.auth.admin.deleteUser(driver.id); } catch (_) {}
          await supabase.from(KV_TABLE).delete().eq("key", `driver:${driver.id}`);
          await supabase.from(KV_TABLE).delete().eq("key", `profile:${driver.id}`);
        }
        deleted++;
      } catch (err: any) {
        console.error(`❌ Erreur clean ${driver?.id}:`, err.message);
      }
    }

    return c.json({ success: true, count: deleted, message: `${deleted} conducteur(s) invalide(s) supprimé(s)` });
  } catch (error) {
    console.error("❌ [ADMIN/CLEAN-INVALID] Erreur:", error);
    return c.json({ success: false, error: error instanceof Error ? error.message : "Erreur serveur" }, 500);
  }
});

// ─── POST /passengers/delete-all — Suppression totale des passagers ───────────
app.post("/passengers/delete-all", async (c) => {
  try {
    console.log("💥 [ADMIN/DELETE-ALL-PASSENGERS] Suppression totale des passagers...");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: kvRows } = await supabase
      .from(KV_TABLE).select("key, value").like("key", "passenger:%");
    const passengers = kvRows?.map((r: any) => r.value) ?? [];
    let fromAuth = 0, fromKV = 0, rides = 0;
    const errors: any[] = [];

    for (const passenger of passengers) {
      try {
        const id = passenger?.id;
        if (!id) continue;
        try { await supabase.auth.admin.deleteUser(id); fromAuth++; } catch (_) {}
        await supabase.from(KV_TABLE).delete().eq("key", `passenger:${id}`);
        await supabase.from(KV_TABLE).delete().eq("key", `profile:${id}`);
        fromKV++;
      } catch (err: any) {
        errors.push({ id: passenger?.id, error: err.message });
      }
    }

    // Supprimer les courses
    const { data: rideRows } = await supabase.from(KV_TABLE).select("key").like("key", "ride:%");
    for (const row of rideRows ?? []) {
      await supabase.from(KV_TABLE).delete().eq("key", row.key);
      rides++;
    }

    return c.json({ success: true, deleted: { fromAuth, fromKV, rides }, errors, message: `${fromAuth} passager(s) supprimé(s)` });
  } catch (error) {
    console.error("❌ [ADMIN/DELETE-ALL-PASSENGERS] Erreur:", error);
    return c.json({ success: false, error: error instanceof Error ? error.message : "Erreur serveur" }, 500);
  }
});

// ─── POST /delete-all-users — RESET TOTAL (passagers + conducteurs, pas admin) ─
app.post("/delete-all-users", async (c) => {
  try {
    console.log("💥 [ADMIN/DELETE-ALL-USERS] RESET TOTAL...");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Supprimer tous les comptes Auth non-admin
    const { data: { users: authUsers } } = await supabase.auth.admin.listUsers();
    let deletedAuth = 0;
    const errors: string[] = [];

    for (const user of authUsers ?? []) {
      if (user.user_metadata?.role === "admin") continue;
      try {
        await supabase.auth.admin.deleteUser(user.id);
        deletedAuth++;
      } catch (err: any) {
        errors.push(`${user.id}: ${err.message}`);
      }
    }

    // Vider toutes les clés KV sauf admin:*
    let deletedKV = 0;
    for (const prefix of ["driver:", "passenger:", "profile:", "ride:", "fcm_token:", "wallet_tx:"]) {
      const { data: rows } = await supabase.from(KV_TABLE).select("key").like("key", prefix + "%");
      for (const row of rows ?? []) {
        await supabase.from(KV_TABLE).delete().eq("key", row.key);
        deletedKV++;
      }
    }

    console.log(`✅ [ADMIN/DELETE-ALL-USERS] ${deletedAuth} comptes + ${deletedKV} KV supprimés`);
    return c.json({ success: true, deletedAuth, deletedKV, errors, message: `${deletedAuth} compte(s) + ${deletedKV} entrée(s) KV supprimés` });
  } catch (error) {
    console.error("❌ [ADMIN/DELETE-ALL-USERS] Erreur:", error);
    return c.json({ success: false, error: error instanceof Error ? error.message : "Erreur serveur" }, 500);
  }
});

// ─── POST /drivers/:driverId/set-online-status — Forcer en ligne / hors ligne ─
app.post("/drivers/:driverId/set-online-status", async (c) => {
  try {
    const driverId = c.req.param("driverId");
    const { isOnline } = await c.req.json() as { isOnline: boolean };

    console.log(`🔧 [ADMIN/SET-ONLINE-STATUS] ${driverId} → ${isOnline ? "EN LIGNE" : "HORS LIGNE"}`);

    const driver = await kvGet(`driver:${driverId}`);
    if (!driver) {
      return c.json({ success: false, error: "Conducteur non trouvé" }, 404);
    }

    const now = new Date().toISOString();
    const updated = {
      ...driver,
      isOnline,
      is_online:     isOnline,
      is_available:  isOnline,
      available:     isOnline,
      lastOnlineChange: now,
      updated_at:    now,
      adminForcedStatus: isOnline ? "online" : "offline",
      adminForcedAt: now,
    };

    await kvSet(`driver:${driverId}`, updated);

    // Sync profil
    const profile = await kvGet(`profile:${driverId}`);
    if (profile) {
      await kvSet(`profile:${driverId}`, {
        ...profile,
        isOnline,
        is_online:    isOnline,
        is_available: isOnline,
        available:    isOnline,
        updated_at:   now,
      });
    }

    console.log(`✅ [ADMIN/SET-ONLINE-STATUS] Statut forcé : ${driverId} → ${isOnline ? "EN LIGNE" : "HORS LIGNE"}`);
    return c.json({
      success: true,
      isOnline,
      driver:  updated,
      message: isOnline ? "Conducteur forcé EN LIGNE" : "Conducteur forcé HORS LIGNE",
    });
  } catch (error) {
    console.error("❌ [ADMIN/SET-ONLINE-STATUS] Erreur:", error);
    return c.json({ success: false, error: error instanceof Error ? error.message : "Erreur serveur" }, 500);
  }
});

export default app;
