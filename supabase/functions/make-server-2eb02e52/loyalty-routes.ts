/**
 * 🎁 LOYALTY ROUTES — SMART REWARDS V1
 * Points = (prix_payé_CDF / 10) × multiplicateur catégorie × 1.1 si nuit (21h-6h)
 * Bonus bienvenue : 1ère course +1000, 2e/3e +500
 * Paliers : 3000 (-15% cap 2000), 6000 (-30% cap 3500), 7500 (Standard gratuite), 12000 (Confort), 20000 (Plus), 35000 (Business)
 */

import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js@2";

const app = new Hono();

const KV_TABLE = "kv_store_2eb02e52";
function kvClient() {
  return createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
}
async function kvGet(key: string): Promise<any> {
  try { const { data } = await kvClient().from(KV_TABLE).select("value").eq("key", key).maybeSingle(); return data?.value ?? null; } catch { return null; }
}
async function kvSet(key: string, value: any): Promise<void> {
  try { const { error } = await kvClient().from(KV_TABLE).upsert({ key, value }); if (error) throw new Error(error.message); } catch (e) { console.error("KV set error:", e); throw e; }
}
async function kvGetByPrefix(prefix: string): Promise<any[]> {
  try { const { data } = await kvClient().from(KV_TABLE).select("key, value").like("key", prefix + "%"); return data?.map((d: any) => d.value) ?? []; } catch { return []; }
}

// ─── Config ──────────────────────────────────────────────────────
const MULTIPLIERS: Record<string, number> = {
  smart_standard_no_clim: 1.0,
  smart_standard: 1.1,
  smart_standard_clim: 1.1,
  smart_confort: 1.3,
  smart_plus: 1.5,
  smart_business: 2.0,
};

const FREE_TIERS: Record<string, { points: number; cap: number; label: string }> = {
  smart_standard_no_clim: { points: 7500, cap: 4000, label: "Standard sans clim gratuite" },
  smart_standard: { points: 7500, cap: 6500, label: "Standard gratuite" },
  smart_standard_clim: { points: 7500, cap: 6500, label: "Standard clim gratuite" },
  smart_confort: { points: 12000, cap: 9000, label: "Confort gratuite" },
  smart_plus: { points: 20000, cap: 13000, label: "Plus gratuite" },
  smart_business: { points: 35000, cap: 25000, label: "Business gratuite" },
};

const DISCOUNT_TIERS = [
  { points: 3000, discount: 0.15, cap: 2000, label: "-15%" },
  { points: 6000, discount: 0.30, cap: 3500, label: "-30%" },
];

const DAILY_CAP = 3000;
const EXPIRY_DAYS = 365;

function isNightHour(d = new Date()): boolean {
  const h = d.getHours();
  return h >= 21 || h < 6;
}

export function calculatePoints(priceCDF: number, category: string, date = new Date()): number {
  const mult = MULTIPLIERS[category] ?? 1.1;
  const night = isNightHour(date) ? 1.1 : 1.0;
  return Math.round((priceCDF / 10) * mult * night);
}

function loyaltyKey(passengerId: string): string { return `loyalty:${passengerId}`; }

// Nettoyer les points expirés et recalculer le solde
function cleanExpired(history: any[]): { history: any[]; balance: number; lifetime: number } {
  const now = Date.now();
  let balance = 0;
  let lifetime = 0;
  const kept: any[] = [];
  for (const h of history || []) {
    if (h.type === 'earn' || h.type === 'welcome') {
      lifetime += h.points;
      if (h.expireAt && new Date(h.expireAt).getTime() < now) continue;
      balance += h.points;
    } else if (h.type === 'redeem') {
      balance -= h.points;
    }
    kept.push(h);
  }
  // Ne pas laisser balance négatif (sécurité)
  if (balance < 0) balance = 0;
  return { history: kept, balance, lifetime };
}

async function getLoyalty(passengerId: string): Promise<any> {
  const raw = await kvGet(loyaltyKey(passengerId));
  if (!raw) return { passengerId, balance: 0, lifetime: 0, history: [], daily: null };
  const cleaned = cleanExpired(raw.history || []);
  return { passengerId, balance: cleaned.balance, lifetime: cleaned.lifetime, history: cleaned.history, daily: raw.daily || null, welcomeCount: raw.welcomeCount || 0 };
}

async function saveLoyalty(data: any): Promise<void> {
  await kvSet(loyaltyKey(data.passengerId), data);
}

// ─── Crédit automatique appelé depuis /rides/complete ─────────────────
export async function creditLoyaltyForRide(ride: any, priceCDF: number): Promise<{ points: number; balance: number }> {
  const passengerId = ride.passengerId || ride.passenger_id;
  if (!passengerId) return { points: 0, balance: 0 };
  if (ride.loyaltyPointsCredited) return { points: 0, balance: 0 }; // déjà crédité

  const category = ride.vehicleCategory || ride.vehicleType || 'smart_standard_clim';
  // Ne pas créditer si payé avec des points
  if (ride.paidWithPoints) return { points: 0, balance: 0 };

  let points = calculatePoints(priceCDF, category, new Date(ride.completedAt || Date.now()));

  const loyalty = await getLoyalty(passengerId);

  // Welcome bonus : 1ère +1000, 2e/3e +500
  const completedCount = (loyalty.history || []).filter((h: any) => h.type === 'earn').length;
  let welcomeBonus = 0;
  if (completedCount === 0) welcomeBonus = 1000;
  else if (completedCount === 1 || completedCount === 2) welcomeBonus = 500;

  // Daily cap
  const todayStr = new Date().toISOString().slice(0, 10);
  let dailyPoints = 0;
  if (loyalty.daily && loyalty.daily.date === todayStr) dailyPoints = loyalty.daily.points || 0;
  else loyalty.daily = { date: todayStr, points: 0 };

  const totalForToday = dailyPoints + points + welcomeBonus;
  if (totalForToday > DAILY_CAP) {
    const allowed = Math.max(0, DAILY_CAP - dailyPoints);
    // Réduire proportionnellement
    if (allowed <= 0) {
      points = 0;
      welcomeBonus = 0;
    } else if (points + welcomeBonus > allowed) {
      // Priorité aux points de course, bonus tronqué
      if (points >= allowed) { points = allowed; welcomeBonus = 0; }
      else { welcomeBonus = allowed - points; }
    }
  }

  const now = new Date();
  const expireAt = new Date(now.getTime() + EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString();

  if (points > 0) {
    loyalty.history.push({ type: 'earn', rideId: ride.id, points, earnedAt: now.toISOString(), expireAt, category, price: priceCDF });
  }
  if (welcomeBonus > 0) {
    loyalty.history.push({ type: 'welcome', rideId: ride.id, points: welcomeBonus, earnedAt: now.toISOString(), expireAt, label: completedCount === 0 ? 'Bienvenue +1000' : 'Bonus +500' });
  }

  loyalty.daily.points = (loyalty.daily.points || 0) + points + welcomeBonus;
  loyalty.updatedAt = now.toISOString();

  const cleaned = cleanExpired(loyalty.history);
  loyalty.balance = cleaned.balance;
  loyalty.lifetime = cleaned.lifetime;
  loyalty.history = cleaned.history;

  await saveLoyalty(loyalty);

  // Marquer la course comme créditée
  try {
    ride.loyaltyPointsCredited = true;
    const kv = kvClient();
    await kv.from(KV_TABLE).upsert({ key: `ride:${ride.id}`, value: ride });
  } catch {}

  return { points: points + welcomeBonus, balance: loyalty.balance };
}

// ─── GET /loyalty/:passengerId — solde et paliers ─────────────────────
app.get("/:passengerId", async (c) => {
  try {
    const passengerId = c.req.param("passengerId");
    const loyalty = await getLoyalty(passengerId);

    // Paliers disponibles
    const tiers = [
      ...DISCOUNT_TIERS.map(t => ({ ...t, type: 'discount' as const })),
      ...Object.entries(FREE_TIERS).map(([cat, v]) => ({ category: cat, points: v.points, cap: v.cap, label: v.label, type: 'free' as const })),
    ];

    const redeemable = tiers.filter(t => loyalty.balance >= t.points);

    return c.json({ success: true, loyalty: { passengerId, balance: loyalty.balance, lifetime: loyalty.lifetime, history: loyalty.history.slice(-20).reverse() }, tiers, redeemable });
  } catch (error) {
    console.error("❌ Erreur loyalty get:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// ─── POST /loyalty/redeem — utiliser des points ────────────────────────
app.post("/redeem", async (c) => {
  try {
    const { passengerId, points, category, discount } = await c.req.json();

    if (!passengerId || !points) return c.json({ success: false, error: "passengerId et points requis" }, 400);

    const loyalty = await getLoyalty(passengerId);
    if (loyalty.balance < points) return c.json({ success: false, error: "Solde insuffisant" }, 400);

    // Vérifier que le palier existe
    const isDiscount = DISCOUNT_TIERS.some(t => t.points === points);
    const freeTier = Object.values(FREE_TIERS).find(t => t.points === points);
    if (!isDiscount && !freeTier) return c.json({ success: false, error: "Palier invalide" }, 400);

    // Si free, vérifier la catégorie demandée correspond au palier
    let cap = 0;
    let label = "";
    if (freeTier) {
      if (!category) return c.json({ success: false, error: "Catégorie requise pour une course gratuite" }, 400);
      const tier = FREE_TIERS[category];
      if (!tier || tier.points !== points) return c.json({ success: false, error: "Palier incompatible avec la catégorie" }, 400);
      cap = tier.cap;
      label = tier.label;
    } else {
      const d = DISCOUNT_TIERS.find(t => t.points === points)!;
      cap = d.cap;
      label = d.label;
    }

    // Débiter
    loyalty.history.push({ type: 'redeem', points, category: category || null, discount: discount || null, cap, label, redeemedAt: new Date().toISOString() });
    const cleaned = cleanExpired(loyalty.history);
    loyalty.balance = cleaned.balance - points; // clean déjà soustrait les redeems précédents, on soustrait le nouveau
    // Recalcul propre
    let bal = 0;
    for (const h of loyalty.history) {
      if (h.type === 'earn' || h.type === 'welcome') {
        if (h.expireAt && new Date(h.expireAt).getTime() < Date.now()) continue;
        bal += h.points;
      } else if (h.type === 'redeem') bal -= h.points;
    }
    loyalty.balance = Math.max(0, bal);
    loyalty.updatedAt = new Date().toISOString();
    await saveLoyalty(loyalty);

    // Générer un code de réduction à usage unique (pour le prochain ride)
    const redeemCode = `SMART-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    await kvSet(`loyalty_redeem:${redeemCode}`, {
      passengerId, points, category: category || null, cap, label, discount: discount || null,
      createdAt: new Date().toISOString(),
      used: false,
    });

    return c.json({ success: true, redeemCode, cap, label, balance: loyalty.balance });
  } catch (error) {
    console.error("❌ Erreur loyalty redeem:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// ─── POST /loyalty/apply — appliquer un code sur une course (appelé à la création) ─
app.post("/apply", async (c) => {
  try {
    const { redeemCode, ridePrice } = await c.req.json();
    if (!redeemCode) return c.json({ success: false, error: "Code requis" }, 400);
    const redeem = await kvGet(`loyalty_redeem:${redeemCode}`);
    if (!redeem || redeem.used) return c.json({ success: false, error: "Code invalide ou déjà utilisé" }, 400);

    let discountAmount = 0;
    if (redeem.discount) {
      // Remise -15% / -30%
      const tier = DISCOUNT_TIERS.find(t => t.points === redeem.points);
      if (tier) discountAmount = Math.min(Math.round(ridePrice * tier.discount), tier.cap);
    } else {
      // Gratuite plafonnée
      discountAmount = Math.min(ridePrice, redeem.cap);
    }

    redeem.used = true;
    redeem.usedAt = new Date().toISOString();
    await kvSet(`loyalty_redeem:${redeemCode}`, redeem);

    return c.json({ success: true, discountAmount, cap: redeem.cap, label: redeem.label });
  } catch (error) {
    console.error("❌ Erreur loyalty apply:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// ─── GET /admin/stats — coût fidélité du mois (pour panel admin) ───────
app.get("/admin/stats", async (c) => {
  try {
    const all = await kvGetByPrefix("loyalty:");
    let totalBalance = 0;
    let totalLifetime = 0;
    let totalRedeemed = 0;
    for (const l of all) {
      const h = l.history || [];
      for (const e of h) {
        if ((e.type === 'earn' || e.type === 'welcome') && (!e.expireAt || new Date(e.expireAt).getTime() >= Date.now())) totalBalance += e.points;
        if (e.type === 'earn' || e.type === 'welcome') totalLifetime += e.points;
        if (e.type === 'redeem') totalRedeemed += e.points;
      }
    }
    const redeems = await kvGetByPrefix("loyalty_redeem:");
    let costThisMonth = 0;
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);
    for (const r of redeems) {
      if (r.used && r.usedAt && new Date(r.usedAt) >= monthStart) costThisMonth += r.cap || 0;
    }

    return c.json({ success: true, stats: { totalBalance, totalLifetime, totalRedeemed, costThisMonth, totalPassengers: all.length } });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

export default app;
