import { Hono } from "npm:hono";
import * as kv from "./kv_store.tsx";

const app = new Hono();

/**
 * 🔧 MIGRATION: Copier tous les profiles avec le bon préfixe
 * Endpoint : POST /migration/fix-prefixes
 */
app.post('/fix-prefixes', async (c) => {
  try {
    console.log('🔧 [MIGRATION] Début de la migration des profils...');
    
    // Récupérer tous les profils avec le préfixe "profile:"
    const allProfiles = await kv.getByPrefix('profile:');
    
    console.log(`📊 [MIGRATION] ${allProfiles?.length || 0} profils trouvés avec préfixe "profile:"`);
    
    if (!allProfiles || allProfiles.length === 0) {
      return c.json({
        success: true,
        message: 'Aucun profil à migrer',
        migrated: 0
      });
    }
    
    let migratedCount = 0;
    const errors = [];
    const details = [];
    
    for (const profile of allProfiles) {
      try {
        const role = profile.role || 'passenger';
        const newKey = `${role}:${profile.id}`;
        
        // Vérifier si le profil existe déjà avec le nouveau préfixe
        const existing = await kv.get(newKey);
        
        if (!existing) {
          // Copier le profil avec le nouveau préfixe
          await kv.set(newKey, profile);
          migratedCount++;
          console.log(`✅ [MIGRATION] Migré: ${profile.full_name} (${role}) -> ${newKey}`);
          details.push({
            id: profile.id,
            name: profile.full_name,
            role: role,
            newKey: newKey,
            status: 'migrated'
          });
        } else {
          console.log(`⚠️ [MIGRATION] Déjà existant: ${newKey}`);
          details.push({
            id: profile.id,
            name: profile.full_name,
            role: role,
            newKey: newKey,
            status: 'already_exists'
          });
        }
      } catch (error) {
        console.error(`❌ [MIGRATION] Erreur pour profil ${profile.id}:`, error);
        errors.push({ 
          id: profile.id, 
          name: profile.full_name,
          error: error instanceof Error ? error.message : 'Erreur inconnue'
        });
      }
    }
    
    console.log(`✅ [MIGRATION] Terminé: ${migratedCount} profils migrés`);
    
    return c.json({
      success: true,
      message: `Migration terminée avec succès`,
      total: allProfiles.length,
      migrated: migratedCount,
      skipped: allProfiles.length - migratedCount - errors.length,
      errors: errors.length > 0 ? errors : undefined,
      details: details
    });
    
  } catch (error) {
    console.error('❌ [MIGRATION] Erreur:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }, 500);
  }
});

/**
 * 🔍 DIAGNOSTIC: Vérifier l'état des profils
 * Endpoint : GET /migration/check-status
 */
app.get('/check-status', async (c) => {
  try {
    console.log('🔍 [DIAGNOSTIC] Vérification de l\'état des profils...');
    
    const profilePrefixed = await kv.getByPrefix('profile:');
    const passengerPrefixed = await kv.getByPrefix('passenger:');
    const driverPrefixed = await kv.getByPrefix('driver:');
    const adminPrefixed = await kv.getByPrefix('admin:');
    
    return c.json({
      success: true,
      counts: {
        'profile:': profilePrefixed?.length || 0,
        'passenger:': passengerPrefixed?.length || 0,
        'driver:': driverPrefixed?.length || 0,
        'admin:': adminPrefixed?.length || 0
      },
      profiles: {
        'profile:': profilePrefixed?.map(p => ({ id: p.id, name: p.full_name, role: p.role })),
        'passenger:': passengerPrefixed?.map(p => ({ id: p.id, name: p.full_name, phone: p.phone })),
        'driver:': driverPrefixed?.map(p => ({ id: p.id, name: p.full_name, phone: p.phone })),
        'admin:': adminPrefixed?.map(p => ({ id: p.id, name: p.full_name }))
      }
    });
  } catch (error) {
    console.error('❌ [DIAGNOSTIC] Erreur:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }, 500);
  }
});

export default app;
