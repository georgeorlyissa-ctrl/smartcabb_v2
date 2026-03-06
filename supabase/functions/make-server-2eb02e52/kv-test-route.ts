/**
 * 🔍 Route de test pour diagnostiquer le KV Store
 */

import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";

const app = new Hono();

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

// Test 1: Vérifier que la table existe
app.get("/check-table", async (c) => {
  try {
    console.log("🔍 [KV-TEST] Vérification de l'existence de la table kv_store_2eb02e52...");
    
    const { data, error } = await supabase
      .from("kv_store_2eb02e52")
      .select("key")
      .limit(1);
    
    if (error) {
      console.error("❌ [KV-TEST] Erreur accès table:", error);
      return c.json({
        success: false,
        error: error.message,
        details: error,
        hint: "La table kv_store_2eb02e52 n'existe peut-être pas ou les permissions RLS sont incorrectes"
      }, 500);
    }
    
    console.log("✅ [KV-TEST] Table accessible");
    return c.json({
      success: true,
      message: "Table kv_store_2eb02e52 existe et est accessible",
      sampleData: data
    });
  } catch (error) {
    console.error("❌ [KV-TEST] Exception:", error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

// Test 2: Test de sauvegarde simple via kv.set()
app.post("/test-kv-set", async (c) => {
  try {
    const testKey = `test:${Date.now()}`;
    const testValue = {
      timestamp: new Date().toISOString(),
      test: "Hello KV Store"
    };
    
    console.log(`🔍 [KV-TEST] Test kv.set() avec clé: ${testKey}`);
    
    // Tenter de sauvegarder
    await kv.set(testKey, testValue);
    console.log(`✅ [KV-TEST] kv.set() terminé sans erreur`);
    
    // Vérifier immédiatement
    const retrieved = await kv.get(testKey);
    
    if (retrieved) {
      console.log(`✅ [KV-TEST] Valeur récupérée:`, retrieved);
      
      // Nettoyer
      await kv.del(testKey);
      
      return c.json({
        success: true,
        message: "kv.set() et kv.get() fonctionnent correctement",
        saved: testValue,
        retrieved: retrieved
      });
    } else {
      console.error(`❌ [KV-TEST] kv.set() n'a pas lancé d'erreur mais la valeur n'est pas récupérable!`);
      return c.json({
        success: false,
        error: "Sauvegarde silencieuse échouée - kv.set() ne lance pas d'erreur mais la valeur n'est pas sauvegardée",
        saved: testValue,
        retrieved: null
      }, 500);
    }
  } catch (error) {
    console.error("❌ [KV-TEST] Exception:", error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, 500);
  }
});

// Test 3: Test de sauvegarde directe via Supabase (bypass kv.set)
app.post("/test-direct-save", async (c) => {
  try {
    const testKey = `test-direct:${Date.now()}`;
    const testValue = {
      timestamp: new Date().toISOString(),
      test: "Hello Direct Save"
    };
    
    console.log(`🔍 [KV-TEST] Test sauvegarde directe avec clé: ${testKey}`);
    
    // Sauvegarde directe
    const { error: saveError } = await supabase
      .from("kv_store_2eb02e52")
      .upsert({ key: testKey, value: testValue });
    
    if (saveError) {
      console.error("❌ [KV-TEST] Erreur sauvegarde directe:", saveError);
      return c.json({
        success: false,
        error: saveError.message,
        details: saveError
      }, 500);
    }
    
    console.log(`✅ [KV-TEST] Sauvegarde directe réussie`);
    
    // Vérifier avec SELECT
    const { data, error: selectError } = await supabase
      .from("kv_store_2eb02e52")
      .select("value")
      .eq("key", testKey)
      .single();
    
    if (selectError) {
      console.error("❌ [KV-TEST] Erreur récupération:", selectError);
      return c.json({
        success: false,
        error: selectError.message,
        phase: "retrieval"
      }, 500);
    }
    
    console.log(`✅ [KV-TEST] Valeur récupérée:`, data.value);
    
    // Nettoyer
    await supabase.from("kv_store_2eb02e52").delete().eq("key", testKey);
    
    return c.json({
      success: true,
      message: "Sauvegarde directe fonctionne correctement",
      saved: testValue,
      retrieved: data.value
    });
  } catch (error) {
    console.error("❌ [KV-TEST] Exception:", error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

// Test 4: Simuler l'inscription d'un conducteur
app.post("/simulate-driver-signup", async (c) => {
  try {
    const testDriverId = `test-driver-${Date.now()}`;
    const driverProfile = {
      id: testDriverId,
      full_name: "Test Driver",
      phone: "+243999999999",
      role: "driver",
      status: "pending",
      vehicle: {
        make: "Toyota",
        model: "Corolla",
        license_plate: "TEST-123"
      },
      created_at: new Date().toISOString()
    };
    
    console.log(`🔍 [KV-TEST] Simulation inscription conducteur ID: ${testDriverId}`);
    
    // Méthode 1: Via kv.set()
    console.log("  📝 Tentative via kv.set()...");
    try {
      await kv.set(`driver:${testDriverId}`, driverProfile);
      await kv.set(`profile:${testDriverId}`, driverProfile);
      console.log("  ✅ kv.set() terminé");
      
      // Vérifier
      await new Promise(resolve => setTimeout(resolve, 500));
      const retrieved = await kv.get(`driver:${testDriverId}`);
      
      if (retrieved) {
        console.log("  ✅ Profil récupéré via kv.get()");
        await kv.del(`driver:${testDriverId}`);
        await kv.del(`profile:${testDriverId}`);
        
        return c.json({
          success: true,
          method: "kv.set",
          message: "Simulation réussie via kv.set()",
          profile: retrieved
        });
      } else {
        console.error("  ❌ kv.set() silencieux - profil non récupérable");
      }
    } catch (kvError) {
      console.error("  ❌ Erreur kv.set():", kvError);
    }
    
    // Méthode 2: Sauvegarde directe (fallback)
    console.log("  📝 Tentative via sauvegarde directe...");
    const { error: saveError } = await supabase
      .from("kv_store_2eb02e52")
      .upsert([
        { key: `driver:${testDriverId}`, value: driverProfile },
        { key: `profile:${testDriverId}`, value: driverProfile }
      ]);
    
    if (saveError) {
      console.error("  ❌ Erreur sauvegarde directe:", saveError);
      return c.json({
        success: false,
        error: saveError.message,
        method: "direct-save"
      }, 500);
    }
    
    console.log("  ✅ Sauvegarde directe réussie");
    
    // Vérifier
    await new Promise(resolve => setTimeout(resolve, 500));
    const { data } = await supabase
      .from("kv_store_2eb02e52")
      .select("value")
      .eq("key", `driver:${testDriverId}`)
      .single();
    
    // Nettoyer
    await supabase.from("kv_store_2eb02e52").delete().eq("key", `driver:${testDriverId}`);
    await supabase.from("kv_store_2eb02e52").delete().eq("key", `profile:${testDriverId}`);
    
    return c.json({
      success: true,
      method: "direct-save",
      message: "Simulation réussie via sauvegarde directe (kv.set ne fonctionne pas)",
      profile: data?.value,
      warning: "kv.set() échoue silencieusement - utiliser sauvegarde directe"
    });
    
  } catch (error) {
    console.error("❌ [KV-TEST] Exception:", error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

export default app;
