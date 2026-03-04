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
    console.log('📊 [GET /passengers] Récupération de tous les passagers...');
    
    // Récupérer tous les passengers du KV store
    const passengers = await kv.getByPrefix('passenger:');
    
    console.log(`📦 [GET /passengers] KV Store: ${passengers?.length || 0} passager(s) trouvé(s)`);
    
    // ✅ FIX: Si KV est vide, récupérer depuis Postgres
    if (!passengers || passengers.length === 0) {
      console.log('⚠️ [GET /passengers] KV store vide, récupération depuis Postgres...');
      
      try {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );
        
        // Récupérer les profils passagers depuis Postgres
        const { data: profiles, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('role', 'passenger');
        
        if (error) {
          console.error('❌ [GET /passengers] Erreur Postgres profiles:', error);
          return c.json({
            success: true,
            passengers: [],
            count: 0,
            source: 'kv-empty'
          });
        } else if (profiles && profiles.length > 0) {
          console.log(`✅ [GET /passengers] Postgres: ${profiles.length} passager(s) trouvé(s)`);
          
          // Convertir les profiles en format passenger
          const passengersFromPostgres = profiles.map((profile: any) => ({
            id: profile.id,
            full_name: profile.full_name || 'Passager inconnu',
            email: profile.email || '',
            phone: profile.phone || '',
            role: 'passenger',
            balance: 0,
            created_at: profile.created_at,
            updated_at: profile.updated_at || profile.created_at,
            is_blocked: false
          }));
          
          console.log('✅ [GET /passengers] Passagers convertis depuis Postgres:', passengersFromPostgres.length);
          
          return c.json({
            success: true,
            passengers: passengersFromPostgres,
            count: passengersFromPostgres.length,
            source: 'postgres'
          });
        }
      } catch (postgresError) {
        console.error('❌ [GET /passengers] Erreur récupération Postgres:', postgresError);
      }
    }
    
    console.log(`✅ [GET /passengers] TOTAL: ${passengers?.length || 0} passager(s) retourné(s)`);
    
    return c.json({
      success: true,
      passengers: passengers || [],
      count: passengers?.length || 0,
      source: 'kv'
    });
    
  } catch (error) {
    console.error('❌ [GET /passengers] Erreur récupération passagers:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Erreur serveur',
      passengers: []
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