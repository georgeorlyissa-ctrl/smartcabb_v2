/**
 * 🗑️ ROUTES DE RÉINITIALISATION DE LA BASE DE DONNÉES
 * 
 * ⚠️ ATTENTION : Ces routes suppriment TOUTES les données !
 * À utiliser uniquement pour nettoyer les données de test.
 * 
 * @version 1.0.0
 * @date 2026-02-05
 */

import { Hono } from 'npm:hono@4';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';

const app = new Hono();

// Créer le client Supabase avec les droits admin
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

/**
 * Liste des tables à vider (dans l'ordre pour respecter les contraintes FK)
 */
const TABLES_TO_CLEAR = [
  'ratings',           // Dépend de rides, profiles
  'transactions',      // Dépend de rides, profiles
  'notifications',     // Dépend de profiles
  'documents',         // Dépend de drivers
  'rides',            // Dépend de drivers, profiles
  'vehicles',         // Dépend de drivers
  'drivers',          // Dépend de profiles
  'promo_codes',      // Indépendant
  'settings',         // Indépendant
  'profiles',         // Table principale
];

/**
 * 🗑️ Vider complètement la base de données
 * ⚠️ DANGEREUX : Supprime toutes les données !
 */
app.post('/reset-all', async (c) => {
  try {
    console.log('🗑️ DÉBUT DE LA RÉINITIALISATION COMPLÈTE DE LA BASE DE DONNÉES');
    
    const results: any = {
      success: true,
      cleared: [],
      errors: [],
      summary: {
        totalDeleted: 0,
        tablesCleared: 0,
        kvKeysDeleted: 0
      }
    };

    // 1️⃣ Vider toutes les tables Supabase
    for (const table of TABLES_TO_CLEAR) {
      try {
        console.log(`🗑️ Vidage de la table: ${table}`);
        
        // Compter avant suppression
        const { count: beforeCount } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });

        // Supprimer toutes les lignes
        const { error } = await supabase
          .from(table)
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000'); // Supprime tout sauf un ID impossible
        
        if (error) {
          console.error(`❌ Erreur lors du vidage de ${table}:`, error);
          results.errors.push({
            table,
            error: error.message
          });
        } else {
          console.log(`✅ Table ${table} vidée: ${beforeCount || 0} lignes supprimées`);
          results.cleared.push({
            table,
            deletedRows: beforeCount || 0
          });
          results.summary.totalDeleted += beforeCount || 0;
          results.summary.tablesCleared++;
        }
      } catch (err) {
        console.error(`❌ Exception lors du vidage de ${table}:`, err);
        results.errors.push({
          table,
          error: String(err)
        });
      }
    }

    // 2️⃣ Vider le KV Store (sauf la config globale)
    try {
      console.log('🗑️ Nettoyage du KV Store...');
      
      // Récupérer toutes les clés avec préfixe smartcabb
      const allKeys = await kv.getByPrefix('smartcabb_');
      
      let kvDeletedCount = 0;
      for (const item of allKeys) {
        // Garder la configuration globale
        if (item.key === 'smartcabb_global_config') {
          console.log('ℹ️ Configuration globale conservée');
          continue;
        }
        
        // Supprimer les autres clés
        await kv.del(item.key);
        kvDeletedCount++;
      }
      
      results.summary.kvKeysDeleted = kvDeletedCount;
      console.log(`✅ KV Store nettoyé: ${kvDeletedCount} clés supprimées`);
    } catch (err) {
      console.error('❌ Erreur lors du nettoyage du KV Store:', err);
      results.errors.push({
        table: 'kv_store',
        error: String(err)
      });
    }

    // 3️⃣ Résumé final
    console.log('✅ RÉINITIALISATION TERMINÉE');
    console.log(`   📊 Tables vidées: ${results.summary.tablesCleared}/${TABLES_TO_CLEAR.length}`);
    console.log(`   📊 Lignes supprimées: ${results.summary.totalDeleted}`);
    console.log(`   📊 Clés KV supprimées: ${results.summary.kvKeysDeleted}`);
    
    if (results.errors.length > 0) {
      console.log(`   ⚠️ Erreurs: ${results.errors.length}`);
      results.success = false;
    }

    return c.json(results);
  } catch (error) {
    console.error('❌ ERREUR CRITIQUE lors de la réinitialisation:', error);
    return c.json({
      success: false,
      error: 'Erreur critique',
      details: String(error)
    }, 500);
  }
});

/**
 * 🗑️ Vider seulement les données utilisateurs (garder les paramètres)
 */
app.post('/reset-users-only', async (c) => {
  try {
    console.log('🗑️ NETTOYAGE DES DONNÉES UTILISATEURS');
    
    const USER_TABLES = [
      'ratings',
      'transactions',
      'notifications',
      'documents',
      'rides',
      'vehicles',
      'drivers',
      'profiles'
    ];

    const results: any = {
      success: true,
      cleared: [],
      errors: [],
      summary: {
        totalDeleted: 0,
        tablesCleared: 0
      }
    };

    for (const table of USER_TABLES) {
      try {
        const { count: beforeCount } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });

        const { error } = await supabase
          .from(table)
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000');
        
        if (error) {
          results.errors.push({ table, error: error.message });
        } else {
          results.cleared.push({ table, deletedRows: beforeCount || 0 });
          results.summary.totalDeleted += beforeCount || 0;
          results.summary.tablesCleared++;
        }
      } catch (err) {
        results.errors.push({ table, error: String(err) });
      }
    }

    console.log(`✅ Nettoyage terminé: ${results.summary.totalDeleted} lignes supprimées`);
    
    if (results.errors.length > 0) {
      results.success = false;
    }

    return c.json(results);
  } catch (error) {
    console.error('❌ Erreur:', error);
    return c.json({
      success: false,
      error: String(error)
    }, 500);
  }
});

/**
 * 🗑️ Vider seulement les courses (garder users et paramètres)
 */
app.post('/reset-rides-only', async (c) => {
  try {
    console.log('🗑️ NETTOYAGE DES COURSES');
    
    const RIDE_TABLES = [
      'ratings',
      'transactions',
      'rides'
    ];

    const results: any = {
      success: true,
      cleared: [],
      errors: [],
      summary: {
        totalDeleted: 0,
        tablesCleared: 0
      }
    };

    for (const table of RIDE_TABLES) {
      try {
        const { count: beforeCount } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });

        const { error } = await supabase
          .from(table)
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000');
        
        if (error) {
          results.errors.push({ table, error: error.message });
        } else {
          results.cleared.push({ table, deletedRows: beforeCount || 0 });
          results.summary.totalDeleted += beforeCount || 0;
          results.summary.tablesCleared++;
        }
      } catch (err) {
        results.errors.push({ table, error: String(err) });
      }
    }

    console.log(`✅ Courses nettoyées: ${results.summary.totalDeleted} lignes supprimées`);
    
    if (results.errors.length > 0) {
      results.success = false;
    }

    return c.json(results);
  } catch (error) {
    console.error('❌ Erreur:', error);
    return c.json({
      success: false,
      error: String(error)
    }, 500);
  }
});

/**
 * 📊 Obtenir un rapport sur l'état de la base de données
 */
app.get('/database-stats', async (c) => {
  try {
    const stats: any = {
      tables: [],
      totalRecords: 0,
      kvKeys: 0
    };

    // Compter les enregistrements dans chaque table
    for (const table of TABLES_TO_CLEAR) {
      try {
        const { count } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        stats.tables.push({
          name: table,
          count: count || 0
        });
        stats.totalRecords += count || 0;
      } catch (err) {
        stats.tables.push({
          name: table,
          count: 0,
          error: String(err)
        });
      }
    }

    // Compter les clés KV
    try {
      const allKeys = await kv.getByPrefix('smartcabb_');
      stats.kvKeys = allKeys.length;
    } catch (err) {
      stats.kvKeys = 0;
      stats.kvError = String(err);
    }

    return c.json(stats);
  } catch (error) {
    return c.json({
      error: String(error)
    }, 500);
  }
});

export default app;
