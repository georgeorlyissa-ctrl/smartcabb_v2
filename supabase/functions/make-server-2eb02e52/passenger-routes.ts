/**
 * 🧑 ROUTES PASSAGERS - SMARTCABB
 * ⚠️ FICHIER 100% AUTONOME — aucun import local
 * @version 1.0.0
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
    const { data, error } = await kvClient().from(KV_TABLE).select("value").eq("key", key).maybeSingle();
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
    await kvClient().from(KV_TABLE).delete().eq("key", key);
  } catch (e) { console.error("KV del error:", e); }
}
async function kvGetByPrefix(prefix: string): Promise<any[]> {
  try {
    const { data, error } = await kvClient().from(KV_TABLE).select("key, value").like("key", prefix + "%");
    if (error) { console.error("KV getByPrefix error:", prefix, error.message); return []; }
    return data?.map((d: any) => d.value) ?? [];
  } catch (e) { console.error("KV getByPrefix exception:", e); return []; }
}

// ─── GET / — Tous les passagers ──────────────────────────────────────────────
app.get("/", async (c) => {
  try {
    console.log("📋 [PASSENGERS/GET-ALL] Récupération de tous les passagers...");
    const allPassengers = await kvGetByPrefix("passenger:");
    console.log(`✅ [PASSENGERS/GET-ALL] ${allPassengers.length} passager(s)`);
    return c.json({ success: true, passengers: allPassengers, count: allPassengers.length });
  } catch (error) {
    console.error("❌ [PASSENGERS/GET-ALL] Erreur:", error);
    return c.json({ success: false, error: "Erreur serveur", passengers: [] }, 500);
  }
});

// ─── GET /:id — Profil d'un passager ─────────────────────────────────────────
app.get("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    console.log(`👤 [PASSENGERS/GET-ONE] ${id}`);

    // Chercher dans passenger: et profile:
    let passenger = await kvGet(`passenger:${id}`);
    if (!passenger) passenger = await kvGet(`profile:${id}`);

    if (!passenger) {
      return c.json({ success: false, error: "Passager non trouvé" }, 404);
    }
    return c.json({ success: true, passenger, profile: passenger });
  } catch (error) {
    console.error("❌ [PASSENGERS/GET-ONE] Erreur:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

// ─── GET /:id/balance — Solde du passager ────────────────────────────────────
app.get("/:id/balance", async (c) => {
  try {
    const id = c.req.param("id");
    console.log(`💰 [PASSENGERS/BALANCE] ${id}`);

    let passenger = await kvGet(`passenger:${id}`);
    if (!passenger) passenger = await kvGet(`profile:${id}`);

    if (!passenger) {
      // Retourner 0 plutôt que 404 pour ne pas bloquer le frontend
      return c.json({ success: true, balance: 0, walletBalance: 0, passengerId: id });
    }

    const balance = passenger.walletBalance ?? passenger.balance ?? 0;
    return c.json({ success: true, balance, walletBalance: balance, passengerId: id });
  } catch (error) {
    console.error("❌ [PASSENGERS/BALANCE] Erreur:", error);
    return c.json({ success: false, error: "Erreur serveur", balance: 0 }, 500);
  }
});

// ─── GET /:id/stats — Statistiques du passager ───────────────────────────────
app.get("/:id/stats", async (c) => {
  try {
    const id = c.req.param("id");
    console.log(`📊 [PASSENGERS/STATS] ${id}`);

    let passenger = await kvGet(`passenger:${id}`);
    if (!passenger) passenger = await kvGet(`profile:${id}`);

    // Compter les courses terminées pour ce passager
    const allRides = await kvGetByPrefix("ride:");
    const passengerRides = allRides.filter(
      (r: any) => r.passengerId === id || r.passenger_id === id
    );
    // ✅ FIX : compter 'completed' ET 'rated' (après notation le statut passe à 'rated')
    const completedRides = passengerRides.filter(
      (r: any) => r.status === "completed" || r.status === "rated"
    );
    const totalSpent = completedRides.reduce(
      (sum: number, r: any) =>
        sum + (r.totalPrice || r.actualPrice || r.finalPrice || r.estimatedPrice || 0),
      0
    );

    return c.json({
      success: true,
      passengerId: id,
      stats: {
        totalRides: completedRides.length,
        totalSpent,
        walletBalance: passenger?.walletBalance ?? passenger?.balance ?? 0,
        rating: passenger?.rating ?? 5.0,
        memberSince: passenger?.created_at ?? new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("❌ [PASSENGERS/STATS] Erreur:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

// ─── GET /:id/favorites — Lieux favoris ──────────────────────────────────────
app.get("/:id/favorites", async (c) => {
  try {
    const id = c.req.param("id");
    console.log(`⭐ [PASSENGERS/FAVORITES-GET] ${id}`);

    const favorites = await kvGet(`favorites:${id}`) || [];
    return c.json({ success: true, favorites });
  } catch (error) {
    console.error("❌ [PASSENGERS/FAVORITES-GET] Erreur:", error);
    return c.json({ success: false, error: "Erreur serveur", favorites: [] }, 500);
  }
});

// ─── POST /:id/favorites — Ajouter un favori ─────────────────────────────────
app.post("/:id/favorites", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    console.log(`➕ [PASSENGERS/FAVORITES-ADD] ${id}:`, body);

    const favorites: any[] = await kvGet(`favorites:${id}`) || [];
    const newFavorite = {
      id: body.id || `fav_${Date.now()}`,
      name: body.name || "Lieu favori",
      address: body.address || "",
      coordinates: body.coordinates || null,
      type: body.type || "custom",
      createdAt: new Date().toISOString(),
    };

    favorites.push(newFavorite);
    await kvSet(`favorites:${id}`, favorites);

    return c.json({ success: true, favorite: newFavorite, favorites });
  } catch (error) {
    console.error("❌ [PASSENGERS/FAVORITES-ADD] Erreur:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

// ─── PUT /:id/favorites/:favId — Modifier un favori ──────────────────────────
app.put("/:id/favorites/:favId", async (c) => {
  try {
    const id = c.req.param("id");
    const favId = c.req.param("favId");
    const updates = await c.req.json();
    console.log(`✏️ [PASSENGERS/FAVORITES-UPDATE] ${id} / ${favId}`);

    const favorites: any[] = await kvGet(`favorites:${id}`) || [];
    const idx = favorites.findIndex((f: any) => f.id === favId);
    if (idx === -1) {
      return c.json({ success: false, error: "Favori non trouvé" }, 404);
    }
    favorites[idx] = { ...favorites[idx], ...updates, id: favId };
    await kvSet(`favorites:${id}`, favorites);

    return c.json({ success: true, favorite: favorites[idx], favorites });
  } catch (error) {
    console.error("❌ [PASSENGERS/FAVORITES-UPDATE] Erreur:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

// ─── DELETE /:id/favorites/:favId — Supprimer un favori ──────────────────────
app.delete("/:id/favorites/:favId", async (c) => {
  try {
    const id = c.req.param("id");
    const favId = c.req.param("favId");
    console.log(`🗑️ [PASSENGERS/FAVORITES-DEL] ${id} / ${favId}`);

    const favorites: any[] = await kvGet(`favorites:${id}`) || [];
    const updated = favorites.filter((f: any) => f.id !== favId);
    await kvSet(`favorites:${id}`, updated);

    return c.json({ success: true, favorites: updated });
  } catch (error) {
    console.error("❌ [PASSENGERS/FAVORITES-DEL] Erreur:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

// ─── POST /update/:id — Mettre à jour le profil passager ─────────────────────
app.post("/update/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const updates = await c.req.json();
    console.log(`🔄 [PASSENGERS/UPDATE] ${id}:`, Object.keys(updates));

    let passenger = await kvGet(`passenger:${id}`);
    if (!passenger) passenger = await kvGet(`profile:${id}`) || { id };

    const updatedPassenger = {
      ...passenger,
      ...updates,
      id,
      updated_at: new Date().toISOString(),
    };

    await kvSet(`passenger:${id}`, updatedPassenger);
    await kvSet(`profile:${id}`, updatedPassenger);

    console.log(`✅ [PASSENGERS/UPDATE] ${id} mis à jour`);
    return c.json({ success: true, passenger: updatedPassenger });
  } catch (error) {
    console.error("❌ [PASSENGERS/UPDATE] Erreur:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

// ─── POST /:id/wallet/recharge — Recharger le portefeuille passager ───────────
app.post("/:id/wallet/recharge", async (c) => {
  try {
    const id = c.req.param("id");
    const { amount } = await c.req.json();
    console.log(`💳 [PASSENGERS/WALLET-RECHARGE] ${id}: +${amount} CDF`);

    if (typeof amount !== "number" || amount <= 0) {
      return c.json({ success: false, error: "Montant invalide" }, 400);
    }

    let passenger = await kvGet(`passenger:${id}`);
    if (!passenger) passenger = await kvGet(`profile:${id}`) || { id };

    const currentBalance = passenger.walletBalance ?? passenger.balance ?? 0;
    const newBalance = currentBalance + amount;

    const updatedPassenger = {
      ...passenger,
      walletBalance: newBalance,
      balance: newBalance,
      updated_at: new Date().toISOString(),
    };

    await kvSet(`passenger:${id}`, updatedPassenger);
    await kvSet(`profile:${id}`, updatedPassenger);

    return c.json({
      success: true,
      walletBalance: newBalance,
      balance: newBalance,
      message: `Recharge de ${amount.toLocaleString()} CDF effectuée`,
    });
  } catch (error) {
    console.error("❌ [PASSENGERS/WALLET-RECHARGE] Erreur:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

// ─── GET /:id/stats — Statistiques d'un passager ─────────────────────────────
app.get("/:id/stats", async (c) => {
  try {
    const id = c.req.param("id");
    console.log(`📊 [PASSENGERS/STATS] Récupération des stats pour: ${id}`);

    // Récupérer toutes les courses
    const allRides = await kvGetByPrefix("ride:");

    // ✅ Filtrer SEULEMENT les courses TERMINÉES du passager (pas les annulées)
    const passengerCompletedRides = allRides.filter((r: any) =>
      r.passengerId === id &&
      (r.status === "completed" || r.status === "rated")
    );

    // Calculer les statistiques
    const totalRides = passengerCompletedRides.length;
    const totalSpent = passengerCompletedRides.reduce((sum: number, r: any) => {
      const price = r.finalPrice || r.totalPrice || r.estimatedPrice || 0;
      return sum + (typeof price === "number" ? price : parseFloat(price) || 0);
    }, 0);

    const averageRating = passengerCompletedRides
      .filter((r: any) => r.passengerRating && r.passengerRating > 0)
      .reduce((sum: number, r: any, _, arr: any[]) => {
        return sum + r.passengerRating / arr.length;
      }, 0);

    console.log(`✅ [PASSENGERS/STATS] ${totalRides} courses terminées (${totalSpent.toLocaleString()} CDF dépensés)`);

    return c.json({
      success: true,
      stats: {
        totalRides,
        totalSpent: Math.round(totalSpent),
        averageRating: Math.round(averageRating * 10) / 10 || 0,
      },
    });
  } catch (error) {
    console.error("❌ [PASSENGERS/STATS] Erreur:", error);
    return c.json({ success: false, error: "Erreur serveur", stats: { totalRides: 0, totalSpent: 0, averageRating: 0 } }, 500);
  }
});

export default app;
