import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js@2";

const app = new Hono();

// ─── Table KV & helpers inlinés ──────────────────────────────────────────────
const KV_TABLE = "kv_store_2eb02e52";
function kvClient() {
  return createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
}
async function kvSet(key: string, value: any): Promise<void> {
  try { const { error } = await kvClient().from(KV_TABLE).upsert({ key, value }); if (error) throw new Error(error.message); } catch (e) { console.error("KV set error:", e); throw e; }
}
async function kvDel(key: string): Promise<void> {
  try { await kvClient().from(KV_TABLE).delete().eq("key", key); } catch (e) { console.error("KV del error:", e); }
}

// ============================================
// 🗑️ PURGER COMPLÈTEMENT UN UTILISATEUR
// ============================================
// Cette route permet de supprimer définitivement un utilisateur de Supabase Auth
// pour libérer son email et permettre de créer un nouveau compte avec le même email
app.post("/purge-user-by-email", async (c) => {
  try {
    const { email } = await c.req.json();
    
    if (!email) {
      return c.json({ 
        success: false, 
        error: "Email requis" 
      }, 400);
    }

    console.log(`🗑️ Purge complète de l'utilisateur avec email: ${email}`);
    
    // Créer le client Supabase avec SERVICE_ROLE_KEY pour avoir les droits admin
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    );
    
    // 1️⃣ Chercher tous les utilisateurs (y compris les soft-deleted)
    const { data: allUsers, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error("❌ Erreur listUsers:", listError);
      return c.json({ 
        success: false, 
        error: `Erreur Supabase: ${listError.message}` 
      }, 500);
    }
    
    // 2️⃣ Trouver l'utilisateur avec cet email
    const userToDelete = allUsers?.users?.find(u => u.email === email);
    
    if (!userToDelete) {
      console.log(`⚠️ Aucun utilisateur trouvé avec l'email: ${email}`);
      return c.json({ 
        success: true, 
        message: "Aucun utilisateur à purger (email déjà libre)",
        email: email
      });
    }
    
    console.log(`📋 Utilisateur trouvé:`, {
      id: userToDelete.id,
      email: userToDelete.email,
      created_at: userToDelete.created_at,
      deleted_at: userToDelete.deleted_at
    });
    
    // 3️⃣ Supprimer définitivement l'utilisateur de Supabase Auth
    // shouldSoftDelete: false force une suppression définitive (hard delete)
    const { error: deleteError } = await supabase.auth.admin.deleteUser(
      userToDelete.id,
      false // shouldSoftDelete = false pour purger complètement (pas true)
    );
    
    if (deleteError) {
      console.error("❌ Erreur deleteUser:", deleteError);
      return c.json({ 
        success: false, 
        error: `Erreur suppression: ${deleteError.message}` 
      }, 500);
    }
    
    console.log(`✅ Utilisateur supprimé définitivement de Supabase Auth: ${userToDelete.id}`);
    
    // 4️⃣ Nettoyer aussi le KV store
    try {
      await kvDel(`profile:${userToDelete.id}`);
      await kvDel(`admin:${userToDelete.id}`);
      await kvDel(`driver:${userToDelete.id}`);
      await kvDel(`passenger:${userToDelete.id}`);
      console.log(`✅ Données KV nettoyées pour: ${userToDelete.id}`);
    } catch (kvError) {
      console.warn("⚠️ Erreur nettoyage KV (peut être ignoré):", kvError);
    }
    
    return c.json({
      success: true,
      message: `Utilisateur purgé avec succès. L'email ${email} est maintenant disponible.`,
      purged_user: {
        id: userToDelete.id,
        email: userToDelete.email,
        created_at: userToDelete.created_at
      }
    });
    
  } catch (error) {
    console.error("❌ Erreur purge utilisateur:", error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Erreur serveur" 
    }, 500);
  }
});

// ============================================
// ✨ CRÉER UN ADMIN AVEC PURGE AUTOMATIQUE
// ============================================
// Cette route crée un compte admin en purgeant automatiquement 
// l'ancien compte si l'email existe déjà
app.post("/create-admin-with-purge", async (c) => {
  try {
    const { email, password, fullName } = await c.req.json();
    
    if (!email || !password || !fullName) {
      return c.json({ 
        success: false, 
        error: "Email, mot de passe et nom complet requis" 
      }, 400);
    }

    console.log(`✨ Création admin avec purge automatique: ${email}`);
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    );
    
    // 1️⃣ Chercher si un utilisateur existe déjà avec cet email
    const { data: allUsers } = await supabase.auth.admin.listUsers();
    const existingUser = allUsers?.users?.find(u => u.email === email);
    
    // 2️⃣ Si l'utilisateur existe, le purger d'abord
    if (existingUser) {
      console.log(`🗑️ Email déjà utilisé, purge de l'ancien compte: ${existingUser.id}`);
      
      // Suppression définitive
      const { error: deleteError } = await supabase.auth.admin.deleteUser(
        existingUser.id,
        false // shouldSoftDelete = false pour purger complètement
      );
      
      if (deleteError) {
        console.error("❌ Erreur purge:", deleteError);
        // On continue quand même, peut-être que la création marchera
      } else {
        console.log(`✅ Ancien compte purgé`);
      }
      
      // Nettoyer le KV store
      try {
        await kvDel(`profile:${existingUser.id}`);
        await kvDel(`admin:${existingUser.id}`);
      } catch (kvError) {
        console.warn("⚠️ Erreur nettoyage KV:", kvError);
      }
    }
    
    // 3️⃣ Créer le nouveau compte admin
    console.log(`➕ Création du nouveau compte admin...`);
    
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Auto-confirmer l'email
      user_metadata: {
        full_name: fullName,
        role: "admin"
      }
    });
    
    if (createError) {
      console.error("❌ Erreur création admin:", createError);
      return c.json({ 
        success: false, 
        error: `Erreur création: ${createError.message}` 
      }, 500);
    }
    
    console.log(`✅ Compte admin créé dans Supabase Auth: ${newUser.user.id}`);
    
    // 4️⃣ Créer le profil dans le KV store
    const adminProfile = {
      id: newUser.user.id,
      email: email,
      full_name: fullName,
      role: "admin",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    await kvSet(`profile:${newUser.user.id}`, adminProfile);
    await kvSet(`admin:${newUser.user.id}`, adminProfile);
    
    console.log(`✅ Profil admin créé dans le KV store`);
    
    return c.json({
      success: true,
      message: "Compte admin créé avec succès",
      admin: {
        id: newUser.user.id,
        email: email,
        full_name: fullName,
        role: "admin"
      },
      credentials: {
        email: email,
        password: password,
        note: "Conservez ces identifiants en sécurité"
      }
    });
    
  } catch (error) {
    console.error("❌ Erreur création admin avec purge:", error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Erreur serveur" 
    }, 500);
  }
});

export default app;
