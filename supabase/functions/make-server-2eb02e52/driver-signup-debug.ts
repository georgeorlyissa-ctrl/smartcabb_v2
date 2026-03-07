import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js@2";

const app = new Hono();

/**
 * 🔍 ROUTE DE DIAGNOSTIC COMPLÈTE
 * Test toutes les opérations de base de données pour identifier le problème
 */
app.post("/test-save-and-retrieve", async (c) => {
  console.log('🧪 ========== DÉBUT DU TEST DE DIAGNOSTIC ==========');
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const testId = crypto.randomUUID();
  const testProfile = {
    id: testId,
    full_name: 'TEST Driver ' + Date.now(),
    phone: '+243999999999',
    email: 'test@smartcabb.app',
    role: 'driver',
    status: 'pending',
    created_at: new Date().toISOString()
  };

  const results: any = {
    testId,
    steps: {}
  };

  try {
    // ÉTAPE 1: Test UPSERT avec un seul enregistrement
    console.log('📝 ÉTAPE 1: Test UPSERT simple...');
    const { data: upsertData1, error: upsertError1 } = await supabase
      .from('kv_store_2eb02e52')
      .upsert({ key: `test-single:${testId}`, value: testProfile })
      .select();
    
    results.steps.step1_upsert_single = {
      success: !upsertError1,
      error: upsertError1?.message,
      data: upsertData1
    };
    console.log(`   ${upsertError1 ? '❌' : '✅'} UPSERT simple:`, upsertError1 || 'OK');

    // ÉTAPE 2: Test UPSERT avec tableau (comme dans le code actuel)
    console.log('📝 ÉTAPE 2: Test UPSERT avec tableau...');
    const { data: upsertData2, error: upsertError2 } = await supabase
      .from('kv_store_2eb02e52')
      .upsert([
        { key: `driver:${testId}`, value: testProfile },
        { key: `profile:${testId}`, value: testProfile }
      ])
      .select();
    
    results.steps.step2_upsert_array = {
      success: !upsertError2,
      error: upsertError2?.message,
      data: upsertData2
    };
    console.log(`   ${upsertError2 ? '❌' : '✅'} UPSERT tableau:`, upsertError2 || 'OK');

    // ÉTAPE 3: Attendre 500ms pour simuler la latence
    console.log('⏳ ÉTAPE 3: Attente 500ms...');
    await new Promise(resolve => setTimeout(resolve, 500));

    // ÉTAPE 4: Vérifier avec SELECT direct sur driver:
    console.log('🔍 ÉTAPE 4: SELECT sur driver:...');
    const { data: selectData1, error: selectError1 } = await supabase
      .from('kv_store_2eb02e52')
      .select('*')
      .eq('key', `driver:${testId}`)
      .maybeSingle();
    
    results.steps.step4_select_driver = {
      success: !selectError1,
      found: !!selectData1,
      error: selectError1?.message,
      data: selectData1
    };
    console.log(`   ${selectError1 ? '❌' : selectData1 ? '✅' : '⚠️'} SELECT driver:`, selectError1 || (selectData1 ? 'TROUVÉ' : 'NON TROUVÉ'));

    // ÉTAPE 5: Vérifier avec SELECT direct sur profile:
    console.log('🔍 ÉTAPE 5: SELECT sur profile:...');
    const { data: selectData2, error: selectError2 } = await supabase
      .from('kv_store_2eb02e52')
      .select('*')
      .eq('key', `profile:${testId}`)
      .maybeSingle();
    
    results.steps.step5_select_profile = {
      success: !selectError2,
      found: !!selectData2,
      error: selectError2?.message,
      data: selectData2
    };
    console.log(`   ${selectError2 ? '❌' : selectData2 ? '✅' : '⚠️'} SELECT profile:`, selectError2 || (selectData2 ? 'TROUVÉ' : 'NON TROUVÉ'));

    // ÉTAPE 6: Vérifier avec OR (comme dans GET /:id)
    console.log('🔍 ÉTAPE 6: SELECT avec OR...');
    const { data: selectData3, error: selectError3 } = await supabase
      .from('kv_store_2eb02e52')
      .select('*')
      .or(`key.eq.driver:${testId},key.eq.profile:${testId}`)
      .limit(1)
      .maybeSingle();
    
    results.steps.step6_select_or = {
      success: !selectError3,
      found: !!selectData3,
      error: selectError3?.message,
      data: selectData3
    };
    console.log(`   ${selectError3 ? '❌' : selectData3 ? '✅' : '⚠️'} SELECT OR:`, selectError3 || (selectData3 ? 'TROUVÉ' : 'NON TROUVÉ'));

    // ÉTAPE 7: Compter toutes les entrées de test
    console.log('📊 ÉTAPE 7: Comptage des entrées test...');
    const { data: countData, error: countError, count } = await supabase
      .from('kv_store_2eb02e52')
      .select('*', { count: 'exact', head: false })
      .or(`key.eq.driver:${testId},key.eq.profile:${testId},key.eq.test-single:${testId}`);
    
    results.steps.step7_count = {
      success: !countError,
      count: count,
      error: countError?.message,
      keys: countData?.map((d: any) => d.key)
    };
    console.log(`   ${countError ? '❌' : '✅'} Comptage:`, count, 'entrée(s) trouvée(s)');

    // ÉTAPE 8: Lister toutes les clés pour ce test
    console.log('📋 ÉTAPE 8: Liste de toutes les clés du test...');
    const { data: allKeys, error: allKeysError } = await supabase
      .from('kv_store_2eb02e52')
      .select('key')
      .like('key', `%${testId}%`);
    
    results.steps.step8_all_keys = {
      success: !allKeysError,
      error: allKeysError?.message,
      keys: allKeys?.map((d: any) => d.key) || []
    };
    console.log(`   ${allKeysError ? '❌' : '✅'} Clés trouvées:`, results.steps.step8_all_keys.keys);

    // ÉTAPE 9: Nettoyage
    console.log('🧹 ÉTAPE 9: Nettoyage des données de test...');
    const { error: deleteError } = await supabase
      .from('kv_store_2eb02e52')
      .delete()
      .like('key', `%${testId}%`);
    
    results.steps.step9_cleanup = {
      success: !deleteError,
      error: deleteError?.message
    };
    console.log(`   ${deleteError ? '❌' : '✅'} Nettoyage:`, deleteError || 'OK');

    // Résumé
    results.summary = {
      upsert_simple_works: !upsertError1,
      upsert_array_works: !upsertError2,
      select_driver_works: !!selectData1,
      select_profile_works: !!selectData2,
      select_or_works: !!selectData3,
      total_saved: count || 0,
      all_operations_successful: !upsertError1 && !upsertError2 && !!selectData1 && !!selectData2 && !!selectData3
    };

    console.log('🏁 ========== FIN DU TEST DE DIAGNOSTIC ==========');
    console.log('📊 RÉSUMÉ:', results.summary);

    return c.json({
      success: true,
      message: 'Test de diagnostic terminé',
      results
    });

  } catch (error) {
    console.error('❌ ERREUR DANS LE TEST:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
      results
    }, 500);
  }
});

/**
 * 🔍 Vérifier si un profil existe vraiment dans la base
 */
app.get("/verify-profile/:id", async (c) => {
  const driverId = c.req.param('id');
  console.log(`🔍 Vérification du profil: ${driverId}`);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    // Chercher dans toutes les tables possibles
    const results: any = {
      driverId,
      checks: {}
    };

    // 1. Check kv_store avec driver:
    const { data: kvDriver, error: kvDriverError } = await supabase
      .from('kv_store_2eb02e52')
      .select('*')
      .eq('key', `driver:${driverId}`)
      .maybeSingle();
    
    results.checks.kv_driver = {
      found: !!kvDriver,
      error: kvDriverError?.message,
      data: kvDriver
    };

    // 2. Check kv_store avec profile:
    const { data: kvProfile, error: kvProfileError } = await supabase
      .from('kv_store_2eb02e52')
      .select('*')
      .eq('key', `profile:${driverId}`)
      .maybeSingle();
    
    results.checks.kv_profile = {
      found: !!kvProfile,
      error: kvProfileError?.message,
      data: kvProfile
    };

    // 3. Check auth.users
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(driverId);
    
    results.checks.auth_user = {
      found: !!authUser?.user,
      error: authError?.message,
      data: authUser?.user ? {
        id: authUser.user.id,
        email: authUser.user.email,
        phone: authUser.user.phone,
        user_metadata: authUser.user.user_metadata
      } : null
    };

    // Résumé
    results.summary = {
      exists_in_kv_as_driver: !!kvDriver,
      exists_in_kv_as_profile: !!kvProfile,
      exists_in_auth: !!authUser?.user,
      profile_name: kvDriver?.value?.full_name || kvProfile?.value?.full_name || authUser?.user?.user_metadata?.full_name || 'N/A'
    };

    console.log('📊 Résumé de la vérification:', results.summary);

    return c.json({
      success: true,
      results
    });

  } catch (error) {
    console.error('❌ Erreur vérification:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }, 500);
  }
});

export default app;
