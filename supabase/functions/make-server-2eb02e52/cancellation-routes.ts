import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js@2";

const app = new Hono();

// ─── Table KV & helpers inlinés ──────────────────────────────────────────────
const KV_TABLE = "kv_store_2eb02e52";
function kvClient() {
  return createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
}
async function kvGet(key: string): Promise<any> {
  try { const { data } = await kvClient().from(KV_TABLE).select("value").eq("key", key).maybeSingle(); return data?.value ?? null; } catch { return null; }
}
async function kvDel(key: string): Promise<void> {
  try { await kvClient().from(KV_TABLE).delete().eq("key", key); } catch (e) { console.error("KV del error:", e); }
}
async function kvGetByPrefix(prefix: string): Promise<any[]> {
  try { const { data } = await kvClient().from(KV_TABLE).select("key, value").like("key", prefix + "%"); return data?.map((d: any) => d.value) ?? []; } catch { return []; }
}

// ============================================
// GET /all - Récupérer toutes les annulations
// ============================================
app.get("/all", async (c) => {
  try {
    console.log('📊 Récupération de toutes les annulations...');
    
    // Récupérer toutes les annulations
    const allCancellations = await kvGetByPrefix('cancellation:');
    
    // Trier par date (plus récent en premier)
    const sortedCancellations = allCancellations.sort((a: any, b: any) => {
      return new Date(b.cancelledAt).getTime() - new Date(a.cancelledAt).getTime();
    });
    
    // Calculer les statistiques
    const stats = {
      total: allCancellations.length,
      byPassenger: allCancellations.filter((c: any) => c.cancelledBy === 'passenger').length,
      byDriver: allCancellations.filter((c: any) => c.cancelledBy === 'driver').length,
      withPenalty: allCancellations.filter((c: any) => c.hasPenalty).length,
      totalPenalties: allCancellations
        .filter((c: any) => c.hasPenalty)
        .reduce((sum: number, c: any) => sum + (c.penaltyAmount || 0), 0),
    };
    
    console.log(`✅ ${allCancellations.length} annulations récupérées`);
    console.log(`📊 Statistiques:`, stats);
    
    return c.json({
      success: true,
      cancellations: sortedCancellations,
      stats
    });
  } catch (error) {
    console.error("❌ Erreur récupération annulations:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

// ============================================
// GET /stats - Statistiques des annulations
// ============================================
app.get("/stats", async (c) => {
  try {
    const allCancellations = await kvGetByPrefix('cancellation:');
    
    const stats = {
      total: allCancellations.length,
      byPassenger: allCancellations.filter((c: any) => c.cancelledBy === 'passenger').length,
      byDriver: allCancellations.filter((c: any) => c.cancelledBy === 'driver').length,
      withPenalty: allCancellations.filter((c: any) => c.hasPenalty).length,
      totalPenalties: allCancellations
        .filter((c: any) => c.hasPenalty)
        .reduce((sum: number, c: any) => sum + (c.penaltyAmount || 0), 0),
      
      // Répartition par raison
      byReason: {},
      
      // Répartition par statut de course au moment de l'annulation
      byStatus: {
        searching: allCancellations.filter((c: any) => c.status === 'searching').length,
        accepted: allCancellations.filter((c: any) => c.status === 'accepted').length,
        in_progress: allCancellations.filter((c: any) => c.status === 'in_progress').length,
      },
    };
    
    // Compter les raisons d'annulation
    const reasonCounts: Record<string, number> = {};
    allCancellations.forEach((c: any) => {
      const reason = c.reason || 'Non spécifiée';
      reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
    });
    stats.byReason = reasonCounts;
    
    return c.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error("❌ Erreur récupération statistiques:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

// ============================================
// GET /passenger/:passengerId - Annulations d'un passager
// ============================================
app.get("/passenger/:passengerId", async (c) => {
  try {
    const passengerId = c.req.param('passengerId');
    
    const allCancellations = await kvGetByPrefix('cancellation:');
    const passengerCancellations = allCancellations.filter((c: any) => 
      c.passengerId === passengerId
    );
    
    const stats = {
      total: passengerCancellations.length,
      asPassenger: passengerCancellations.filter((c: any) => c.cancelledBy === 'passenger').length,
      byDriver: passengerCancellations.filter((c: any) => c.cancelledBy === 'driver').length,
      totalPenalties: passengerCancellations
        .filter((c: any) => c.hasPenalty && c.cancelledBy === 'passenger')
        .reduce((sum: number, c: any) => sum + (c.penaltyAmount || 0), 0),
    };
    
    return c.json({
      success: true,
      cancellations: passengerCancellations,
      stats
    });
  } catch (error) {
    console.error("❌ Erreur récupération annulations passager:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

// ============================================
// GET /driver/:driverId - Annulations d'un conducteur
// ============================================
app.get("/driver/:driverId", async (c) => {
  try {
    const driverId = c.req.param('driverId');
    
    const allCancellations = await kvGetByPrefix('cancellation:');
    const driverCancellations = allCancellations.filter((c: any) => 
      c.driverId === driverId
    );
    
    const stats = {
      total: driverCancellations.length,
      asDriver: driverCancellations.filter((c: any) => c.cancelledBy === 'driver').length,
      byPassenger: driverCancellations.filter((c: any) => c.cancelledBy === 'passenger').length,
      totalPenalties: driverCancellations
        .filter((c: any) => c.hasPenalty && c.cancelledBy === 'driver')
        .reduce((sum: number, c: any) => sum + (c.penaltyAmount || 0), 0),
    };
    
    return c.json({
      success: true,
      cancellations: driverCancellations,
      stats
    });
  } catch (error) {
    console.error("❌ Erreur récupération annulations conducteur:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

// ============================================
// GET /:id - Récupérer une annulation spécifique
// ============================================
app.get("/:id", async (c) => {
  try {
    const cancellationId = c.req.param('id');
    
    const cancellation = await kvGet(`cancellation:${cancellationId}`);
    
    if (!cancellation) {
      return c.json({ success: false, error: "Annulation non trouvée" }, 404);
    }
    
    return c.json({
      success: true,
      cancellation
    });
  } catch (error) {
    console.error("❌ Erreur récupération annulation:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

// ============================================
// DELETE /:id - Supprimer une annulation (admin only)
// ============================================
app.delete("/:id", async (c) => {
  try {
    const cancellationId = c.req.param('id');
    
    const cancellation = await kvGet(`cancellation:${cancellationId}`);
    
    if (!cancellation) {
      return c.json({ success: false, error: "Annulation non trouvée" }, 404);
    }
    
    await kvDel(`cancellation:${cancellationId}`);
    
    console.log(`✅ Annulation ${cancellationId} supprimée`);
    
    return c.json({
      success: true,
      message: "Annulation supprimée"
    });
  } catch (error) {
    console.error("❌ Erreur suppression annulation:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

export default app;
