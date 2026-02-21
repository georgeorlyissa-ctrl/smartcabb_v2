import { Hono } from 'npm:hono';
import { createClient } from 'npm:@supabase/supabase-js@2';
import * as kv from './kv-wrapper.ts';
import { isValidUUID } from './uuid-validator.ts';

const diagnosticRoute = new Hono();

/**
 * 🔧 ROUTE DE DIAGNOSTIC POUR COMPTE CONDUCTEUR
 * Permet de diagnostiquer pourquoi un conducteur ne peut pas se connecter
 */
diagnosticRoute.post('/diagnostic-driver', async (c) => {
  try {
    const { identifier } = await c.req.json();
    
    if (!identifier) {
      return c.json({
        success: false,
        error: 'Identifiant requis'
      }, 400);
    }

    console.log('🔧 ========== DIAGNOSTIC CONDUCTEUR ==========');
    console.log('🔍 Identifiant:', identifier);

    const results = {
      identifier: identifier,
      timestamp: new Date().toISOString(),
      checks: []
    };

    // Fonction de normalisation
    const normalizePhone = (phone: string): string[] => {
      const clean = phone.replace(/[\s\-+()]/g, '');
      const formats: string[] = [clean];
      
      if (clean.startsWith('+243')) {
        const digits = clean.substring(4);
        formats.push(`243${digits}`);
        formats.push(`0${digits}`);
      } else if (clean.startsWith('243')) {
        const digits = clean.substring(3);
        formats.push(`+243${digits}`);
        formats.push(`0${digits}`);
      } else if (clean.startsWith('0')) {
        const digits = clean.substring(1);
        formats.push(`243${digits}`);
        formats.push(`+243${digits}`);
      }
      
      return [...new Set(formats)];
    };

    const detectType = (input: string): string => {
      if (input.includes('@')) return 'email';
      const cleaned = input.replace(/[\s\-+()]/g, '');
      if (/^\d+$/.test(cleaned)) return 'phone';
      return 'unknown';
    };

    const inputType = detectType(identifier);
    results.checks.push({
      check: 'Type d\'identifiant',
      result: inputType,
      status: 'info'
    });

    let phoneFormats: string[] = [];
    if (inputType === 'phone') {
      phoneFormats = normalizePhone(identifier);
      results.checks.push({
        check: 'Formats de téléphone',
        result: phoneFormats,
        status: 'info'
      });
    }

    // CHECK 1: Recherche dans le KV store
    console.log('📊 CHECK 1: Recherche dans le KV store...');
    
    const kvSearches = [
      { prefix: 'driver:', name: 'Drivers' },
      { prefix: 'profile:', name: 'Profiles' },
      { prefix: 'user:', name: 'Users' },
    ];

    let foundInKV = null;
    let foundKVKey = null;

    for (const search of kvSearches) {
      const items = await kv.getByPrefix(search.prefix);
      console.log(`   🔍 ${search.name}: ${items.length} entrées`);
      
      for (const item of items) {
        if (!item) continue;
        
        let matches = false;
        
        if (inputType === 'phone' && item.phone) {
          matches = phoneFormats.includes(item.phone);
          if (matches) {
            console.log(`   ✅ Trouvé dans ${search.name}! Phone: ${item.phone}`);
          }
        } else if (inputType === 'email' && item.email) {
          matches = item.email.toLowerCase() === identifier.toLowerCase();
          if (matches) {
            console.log(`   ✅ Trouvé dans ${search.name}! Email: ${item.email}`);
          }
        }
        
        if (matches) {
          foundInKV = item;
          foundKVKey = search.prefix + item.id;
          break;
        }
      }
      
      if (foundInKV) break;
    }

    if (foundInKV) {
      results.checks.push({
        check: 'Présence dans KV store',
        result: {
          found: true,
          key: foundKVKey,
          id: foundInKV.id,
          email: foundInKV.email,
          phone: foundInKV.phone,
          name: foundInKV.name || foundInKV.full_name,
          role: foundInKV.role
        },
        status: 'success'
      });
    } else {
      results.checks.push({
        check: 'Présence dans KV store',
        result: { found: false },
        status: 'error'
      });
      
      console.log('❌ Aucun compte trouvé dans le KV store');
      return c.json({
        success: false,
        error: 'Aucun compte trouvé avec cet identifiant',
        results
      });
    }

    // CHECK 2: Vérifier dans la table profiles
    console.log('📊 CHECK 2: Vérification dans la table profiles...');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', foundInKV.id)
      .single();

    if (profileError) {
      console.log('⚠️ Erreur lecture profiles:', profileError);
      results.checks.push({
        check: 'Présence dans table profiles',
        result: { found: false, error: profileError.message },
        status: 'warning'
      });
    } else if (profileData) {
      console.log('✅ Trouvé dans profiles:', profileData);
      results.checks.push({
        check: 'Présence dans table profiles',
        result: {
          found: true,
          email: profileData.email,
          phone: profileData.phone,
          full_name: profileData.full_name,
          role: profileData.role
        },
        status: 'success'
      });
    }

    // CHECK 3: Vérifier dans Supabase Auth
    console.log('📊 CHECK 3: Vérification dans Supabase Auth...');
    
    // ✅ Validation UUID
    if (!isValidUUID(foundInKV.id)) {
      console.log('❌ ID invalide (pas un UUID):', foundInKV.id);
      results.checks.push({
        check: 'Présence dans Supabase Auth',
        result: { found: false, error: 'ID invalide (pas un UUID)' },
        status: 'error'
      });
      return c.json(results);
    }
    
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(foundInKV.id);

    if (authError) {
      console.log('❌ Erreur récupération Auth user:', authError);
      results.checks.push({
        check: 'Présence dans Supabase Auth',
        result: { found: false, error: authError.message },
        status: 'error'
      });
      
      return c.json({
        success: false,
        error: 'Compte trouvé dans KV store mais pas dans Supabase Auth. Compte corrompu.',
        results,
        recommendation: 'Le compte doit être recréé dans Supabase Auth'
      });
    }

    if (!authUser || !authUser.user) {
      console.log('❌ Auth user introuvable');
      results.checks.push({
        check: 'Présence dans Supabase Auth',
        result: { found: false },
        status: 'error'
      });
      
      return c.json({
        success: false,
        error: 'Compte introuvable dans Supabase Auth',
        results,
        recommendation: 'Le compte doit être recréé'
      });
    }

    const authEmail = authUser.user.email;
    const authConfirmed = authUser.user.email_confirmed_at !== null;
    
    console.log('✅ Compte Auth trouvé:');
    console.log('   Email:', authEmail);
    console.log('   Confirmé:', authConfirmed);
    console.log('   Créé:', authUser.user.created_at);
    console.log('   Metadata:', authUser.user.user_metadata);

    results.checks.push({
      check: 'Présence dans Supabase Auth',
      result: {
        found: true,
        email: authEmail,
        email_confirmed: authConfirmed,
        created_at: authUser.user.created_at,
        phone_metadata: authUser.user.user_metadata?.phone,
        role_metadata: authUser.user.user_metadata?.role
      },
      status: 'success'
    });

    // CHECK 4: Vérifier la cohérence des données
    console.log('📊 CHECK 4: Vérification de la cohérence...');
    
    const coherence = {
      email_kv_vs_auth: foundInKV.email === authEmail,
      email_profile_vs_auth: profileData?.email === authEmail,
      phone_kv_vs_profile: foundInKV.phone === profileData?.phone,
      role_consistent: foundInKV.role === profileData?.role
    };

    results.checks.push({
      check: 'Cohérence des données',
      result: coherence,
      status: Object.values(coherence).every(v => v) ? 'success' : 'warning'
    });

    // CHECK 5: Email confirmé ?
    if (!authConfirmed) {
      console.log('⚠️ Email non confirmé !');
      results.checks.push({
        check: 'Email confirmé',
        result: { confirmed: false },
        status: 'error'
      });
      
      return c.json({
        success: false,
        error: 'Email non confirmé',
        results,
        recommendation: 'Exécutez cette requête SQL dans Supabase:\n' +
          `UPDATE auth.users SET email_confirmed_at = NOW() WHERE id = '${foundInKV.id}';`,
        sql_fix: `UPDATE auth.users SET email_confirmed_at = NOW() WHERE id = '${foundInKV.id}';`
      });
    }

    results.checks.push({
      check: 'Email confirmé',
      result: { confirmed: true },
      status: 'success'
    });

    // CONCLUSION
    console.log('✅ ========== DIAGNOSTIC TERMINÉ ==========');
    console.log('✅ Le compte semble OK !');
    console.log(`📧 Email Auth: ${authEmail}`);
    console.log(`📱 Téléphone: ${foundInKV.phone}`);
    console.log(`👤 Nom: ${foundInKV.name || foundInKV.full_name}`);

    return c.json({
      success: true,
      message: 'Diagnostic terminé - Compte OK',
      results,
      login_info: {
        email_auth: authEmail,
        phone: foundInKV.phone,
        user_id: foundInKV.id,
        name: foundInKV.name || foundInKV.full_name,
        role: foundInKV.role
      },
      recommendation: `Utilisez cet email pour vous connecter: ${authEmail}\n` +
        `Si le mot de passe ne fonctionne pas, utilisez "Mot de passe oublié".`
    });

  } catch (error) {
    console.error('❌ Erreur diagnostic:', error);
    return c.json({
      success: false,
      error: 'Erreur serveur: ' + String(error),
      stack: error instanceof Error ? error.stack : 'N/A'
    }, 500);
  }
});

export default diagnosticRoute;
