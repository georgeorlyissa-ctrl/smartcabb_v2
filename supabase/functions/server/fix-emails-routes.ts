import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js@2";

const app = new Hono();

/**
 * 🔧 ROUTE DE DIAGNOSTIC DES EMAILS MALFORMÉS
 * 
 * Vérifie tous les utilisateurs dans Supabase Auth et identifie ceux
 * qui ont des emails au format u+243XXXXXXXXX@smartcabb.app (avec le +)
 */
app.get("/diagnose", async (c) => {
  try {
    console.log('🔍 [FIX-EMAILS] Début du diagnostic des emails...');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    // Récupérer tous les utilisateurs
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      console.error('❌ [FIX-EMAILS] Erreur récupération utilisateurs:', error);
      return c.json({ 
        success: false, 
        error: 'Erreur récupération utilisateurs',
        details: error.message 
      }, 500);
    }
    
    // Filtrer les utilisateurs avec des emails malformés (contenant +)
    const usersWithBadEmails = users.filter(user => {
      const email = user.email || '';
      // Détecte les emails au format u+243... (avec le +)
      return email.includes('u+243') && email.endsWith('@smartcabb.app');
    });
    
    console.log(`✅ [FIX-EMAILS] Diagnostic terminé: ${usersWithBadEmails.length}/${users.length} utilisateurs avec emails malformés`);
    
    return c.json({
      success: true,
      totalUsers: users.length,
      usersWithBadEmails: usersWithBadEmails.length,
      users: usersWithBadEmails.map(u => ({
        id: u.id,
        email: u.email,
        fullName: u.user_metadata?.full_name || u.user_metadata?.name || 'N/A',
        phone: u.user_metadata?.phone || u.phone || 'N/A',
        role: u.user_metadata?.role || 'N/A',
        createdAt: u.created_at
      }))
    });
  } catch (error) {
    console.error('❌ [FIX-EMAILS] Erreur inattendue:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Erreur inconnue' 
    }, 500);
  }
});

/**
 * 🔧 ROUTE DE RÉPARATION AUTOMATIQUE DES EMAILS
 * 
 * Corrige tous les emails malformés en:
 * 1. Supprimant l'ancien utilisateur avec l'email u+243...
 * 2. Créant un nouveau utilisateur avec l'email u243... (sans +)
 * 3. Préservant toutes les métadonnées (nom, téléphone, rôle, etc.)
 */
app.post("/fix-all", async (c) => {
  try {
    console.log('🔧 [FIX-EMAILS] Début de la réparation des emails...');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    // Récupérer tous les utilisateurs
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ [FIX-EMAILS] Erreur récupération utilisateurs:', listError);
      return c.json({ 
        success: false, 
        error: 'Erreur récupération utilisateurs',
        details: listError.message 
      }, 500);
    }
    
    // Filtrer les utilisateurs avec des emails malformés
    const usersToFix = users.filter(user => {
      const email = user.email || '';
      return email.includes('u+243') && email.endsWith('@smartcabb.app');
    });
    
    console.log(`📊 [FIX-EMAILS] ${usersToFix.length} utilisateurs à réparer`);
    
    const results = [];
    
    // Traiter chaque utilisateur
    for (const user of usersToFix) {
      const oldEmail = user.email!;
      const phone = user.user_metadata?.phone || user.phone;
      
      // Générer le nouvel email sans le +
      // u+243XXXXXXXXX@smartcabb.app → u243XXXXXXXXX@smartcabb.app
      const newEmail = oldEmail.replace('u+243', 'u243');
      
      console.log(`🔄 [FIX-EMAILS] Réparation: ${oldEmail} → ${newEmail}`);
      
      try {
        // ⚠️ IMPORTANT: On doit supprimer et recréer car Supabase ne permet pas
        // de modifier l'email d'un utilisateur via l'API Admin
        
        // 1. Supprimer l'ancien utilisateur
        const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
        
        if (deleteError) {
          console.error(`❌ [FIX-EMAILS] Erreur suppression ${user.id}:`, deleteError);
          results.push({
            success: false,
            oldEmail,
            newEmail,
            userId: user.id,
            error: `Erreur suppression: ${deleteError.message}`
          });
          continue;
        }
        
        console.log(`✅ [FIX-EMAILS] Utilisateur supprimé: ${user.id}`);
        
        // 2. Créer un nouveau utilisateur avec le bon email
        // ⚠️ On ne peut pas récupérer l'ancien mot de passe, donc on en génère un nouveau
        const temporaryPassword = `Temp${Math.random().toString(36).slice(2)}!`;
        
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email: newEmail,
          password: temporaryPassword,
          email_confirm: true,
          user_metadata: {
            ...user.user_metadata,
            phone: phone,
            _migrated: true,
            _old_email: oldEmail,
            _migration_date: new Date().toISOString()
          }
        });
        
        if (createError) {
          console.error(`❌ [FIX-EMAILS] Erreur création utilisateur:`, createError);
          results.push({
            success: false,
            oldEmail,
            newEmail,
            error: `Erreur création: ${createError.message}`
          });
          continue;
        }
        
        console.log(`✅ [FIX-EMAILS] Nouvel utilisateur créé: ${newUser.user?.id}`);
        
        results.push({
          success: true,
          oldEmail,
          newEmail,
          oldUserId: user.id,
          newUserId: newUser.user?.id,
          fullName: user.user_metadata?.full_name || user.user_metadata?.name,
          phone: phone,
          temporaryPassword,
          message: '⚠️ L\'utilisateur doit réinitialiser son mot de passe'
        });
        
      } catch (error) {
        console.error(`❌ [FIX-EMAILS] Erreur traitement ${oldEmail}:`, error);
        results.push({
          success: false,
          oldEmail,
          newEmail,
          error: error instanceof Error ? error.message : 'Erreur inconnue'
        });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    
    console.log(`✅ [FIX-EMAILS] Réparation terminée: ${successCount}/${usersToFix.length} réussis`);
    
    return c.json({
      success: true,
      totalProcessed: usersToFix.length,
      successCount,
      failedCount: usersToFix.length - successCount,
      results
    });
    
  } catch (error) {
    console.error('❌ [FIX-EMAILS] Erreur inattendue:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Erreur inconnue' 
    }, 500);
  }
});

export default app;
