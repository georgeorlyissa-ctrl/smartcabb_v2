import { Hono } from "npm:hono";
import * as kv from "./kv-wrapper.ts";
import { isValidUUID } from "./uuid-validator.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.7";

const app = new Hono();

// ============================================
// 📋 GET ALL PASSENGERS (LISTE POUR ADMIN PANEL)
// ============================================
app.get("/", async (c) => {
  try {
    console.log('📊 [GET /passengers] Récupération depuis Supabase Auth (source unique de vérité)...');
    
    // ✅ LIRE DIRECTEMENT DEPUIS SUPABASE AUTH
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ [GET /passengers] Erreur Supabase Auth:', authError);
      return c.json({
        success: false,
        error: authError.message,
        passengers: [],
        count: 0
      }, 500);
    }
    
    // Filtrer uniquement les passagers (role='passenger' OU pas de role défini)
    const passengerAuthUsers = (authUsers || []).filter(u => {
      const role = u.user_metadata?.role;
      return !role || role === 'passenger';
    });
    console.log(`📋 [GET /passengers] ${passengerAuthUsers.length} passager(s) trouvé(s) dans Auth`);
    
    // Enrichir chaque passager avec les données du KV store
    const passengers = await Promise.all(
      passengerAuthUsers.map(async (authUser) => {
        const metadata = authUser.user_metadata || {};
        
        // Essayer de récupérer les données enrichies depuis le KV store
        let kvData = null;
        try {
          kvData = await kv.get(`passenger:${authUser.id}`);
        } catch (err) {
          // Pas grave si le KV n'a pas les données
        }
        
        // Auth comme source principale, KV comme enrichissement
        return {
          id: authUser.id,
          user_id: authUser.id,
          name: metadata.full_name || metadata.name || kvData?.name || kvData?.full_name || 'Passager',
          full_name: metadata.full_name || metadata.name || kvData?.full_name || kvData?.name || 'Passager',
          email: authUser.email || kvData?.email || `u${metadata.phone || authUser.id}@smartcabb.app`,
          phone: metadata.phone || kvData?.phone || '',
          balance: kvData?.balance || 0,
          account_type: kvData?.account_type || 'prepaid',
          created_at: authUser.created_at || new Date().toISOString(),
          updated_at: kvData?.updated_at || authUser.created_at,
          last_login_at: authUser.last_sign_in_at,
          role: 'passenger',
          is_blocked: kvData?.is_blocked || false
        };
      })
    );
    
    console.log(`✅ [GET /passengers] ${passengers.length} passager(s) retourné(s) (Auth + KV)`);
    
    return c.json({
      success: true,
      passengers: passengers,
      count: passengers.length,
      source: 'supabase-auth-enriched-kv'
    });
    
  } catch (error) {
    console.error('❌ [GET /passengers] Erreur:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur serveur',
      passengers: [],
      count: 0
    }, 500);
  }
});

app.get("/:id", async (c) => {
  try {
    const passengerId = c.req.param('id');
    if (!isValidUUID(passengerId)) {
      return c.json({ success: false, error: "ID passager invalide" }, 400);
    }
    
    let passenger = await kv.get(`passenger:${passengerId}`);
    
    // ✅ AUTO-CRÉATION : Si le profil passager n'existe pas, le créer automatiquement
    if (!passenger) {
      console.log(`⚠️ Profil passager ${passengerId} introuvable dans KV store, tentative d'auto-création...`);
      
      // Récupérer les infos de l'utilisateur depuis Supabase Auth
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );
      
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(passengerId);
      
      if (userError || !userData?.user) {
        console.error(`❌ Impossible de récupérer l'utilisateur depuis Supabase Auth:`, userError);
        return c.json({ 
          success: false, 
          error: "Profil passager non trouvé et impossible de le créer automatiquement" 
        }, 404);
      }
      
      // Créer le profil passager à partir des données Supabase Auth
      const userMetadata = userData.user.user_metadata || {};
      passenger = {
        id: userData.user.id,
        email: userData.user.email || `u${userMetadata.phone || passengerId}@smartcabb.app`,
        full_name: userMetadata.full_name || userMetadata.name || 'Utilisateur',
        phone: userMetadata.phone || null,
        role: 'passenger',
        balance: 0,
        created_at: userData.user.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        lastUpdate: new Date().toISOString()
      };
      
      // Sauvegarder dans le KV store
      await kv.set(`passenger:${passengerId}`, passenger);
      
      // Sauvegarder aussi avec le préfixe profile: pour compatibilité
      await kv.set(`profile:${passengerId}`, passenger);
      
      console.log(`✅ Profil passager créé automatiquement: ${passenger.full_name} (${passenger.email})`);
    }
    
    return c.json({ success: true, passenger });
  } catch (error) {
    console.error("❌ Erreur récupération passager:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

app.post("/:id/update", async (c) => {
  try {
    const passengerId = c.req.param('id');
    const updates = await c.req.json();
    if (!isValidUUID(passengerId)) {
      return c.json({ success: false, error: "ID passager invalide" }, 400);
    }
    const passenger = await kv.get<any>(`passenger:${passengerId}`) || {};
    Object.assign(passenger, updates);
    passenger.lastUpdate = new Date().toISOString();
    await kv.set(`passenger:${passengerId}`, passenger);
    return c.json({ success: true, passenger });
  } catch (error) {
    console.error("❌ Erreur mise à jour passager:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

export default app;