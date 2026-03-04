import { Hono } from "npm:hono";
import * as kv from "./kv-wrapper.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const app = new Hono();

// Fonction de détection des données de test (partagée entre preview et cleanup)
const isTestData = (item: any, type: 'passenger' | 'driver') => {
  if (!item) return false;
  
  const fullName = (item.full_name || '').toLowerCase().trim();
  const email = (item.email || '').toLowerCase().trim();
  const phone = (item.phone || '').toLowerCase().trim();
  const address = (item.address || '').toLowerCase().trim();
  const createdAt = item.created_at || '';
  
  // 🔍 Critères spécifiques pour passagers
  if (type === 'passenger') {
    // Client N/A ou similaire
    if (fullName.includes('client') && (fullName.includes('n/a') || fullName.includes('inconnu'))) {
      return true;
    }
  }
  
  // 🔍 Critères spécifiques pour conducteurs
  if (type === 'driver') {
    // Conducteur inconnu
    if (fullName.includes('conducteur') && fullName.includes('inconnu')) {
      return true;
    }
  }
  
  // 🔍 Critères généraux
  const testIndicators = [
    'non renseigné',
    'non renseignée',
    'n/a',
    'inconnu',
    'test',
    '@smartcabb.app', // Emails générés automatiquement
    'u243' // Pattern des emails générés (u243XXXXXXXXX@smartcabb.app)
  ];
  
  // Vérifier les indicateurs dans tous les champs
  const hasTestIndicator = testIndicators.some(indicator => 
    fullName.includes(indicator) || 
    email.includes(indicator) ||
    phone.includes(indicator) ||
    address.includes(indicator)
  );
  
  // Vérifier les champs vides ou invalides
  const hasEmptyFields = !fullName || !email || !phone || 
                        fullName === '' || 
                        email === '' || 
                        phone === '';
  
  // Vérifier les valeurs par défaut
  const hasDefaultValues = 
    fullName === 'client n/a' ||
    fullName === 'conducteur inconnu' ||
    email === 'non renseigné' ||
    phone === 'non renseigné' ||
    address === 'non renseignée' ||
    createdAt === 'N/A' ||
    createdAt === null ||
    createdAt === undefined;
  
  return hasTestIndicator || hasEmptyFields || hasDefaultValues;
};

// Route pour nettoyer les vieilles courses complétées
app.post("/old-rides", async (c) => {
  try {
    const rides = await kv.getByPrefix<any>('ride:');
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    let cleaned = 0;
    for (const ride of rides) {
      if (ride.status === 'completed' && new Date(ride.completedAt).getTime() < oneDayAgo) {
        await kv.del(`ride:${ride.id}`);
        cleaned++;
      }
    }
    return c.json({ success: true, cleaned });
  } catch (error) {
    console.error("❌ Erreur cleanup:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

// 🔍 ROUTE : Prévisualiser les données qui seront supprimées (sans supprimer)
app.get("/test-data/preview", async (c) => {
  try {
    console.log('🔍 Prévisualisation des données de test...');
    
    const passengers = await kv.getByPrefix<any>('passenger:') || [];
    const drivers = await kv.getByPrefix<any>('driver:') || [];
    const rides = await kv.getByPrefix<any>('ride:') || [];

    const passengersToDelete = passengers.filter(p => isTestData(p, 'passenger'));
    const driversToDelete = drivers.filter(d => isTestData(d, 'driver'));
    
    const passengersToKeep = passengers.filter(p => !isTestData(p, 'passenger'));
    const driversToKeep = drivers.filter(d => !isTestData(d, 'driver'));

    return c.json({
      success: true,
      preview: {
        passengers: {
          total: passengers.length,
          to_delete: passengersToDelete.length,
          to_keep: passengersToKeep.length,
          list_to_delete: passengersToDelete.map(p => ({
            id: p.id,
            full_name: p.full_name,
            email: p.email,
            phone: p.phone,
            created_at: p.created_at
          })),
          list_to_keep: passengersToKeep.map(p => ({
            id: p.id,
            full_name: p.full_name,
            email: p.email,
            phone: p.phone
          }))
        },
        drivers: {
          total: drivers.length,
          to_delete: driversToDelete.length,
          to_keep: driversToKeep.length,
          list_to_delete: driversToDelete.map(d => ({
            id: d.id,
            full_name: d.full_name,
            email: d.email,
            phone: d.phone,
            created_at: d.created_at
          })),
          list_to_keep: driversToKeep.map(d => ({
            id: d.id,
            full_name: d.full_name,
            email: d.email,
            phone: d.phone
          }))
        },
        rides: {
          total: rides.length
        }
      }
    });
  } catch (error) {
    console.error("❌ Erreur prévisualisation:", error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Erreur serveur" 
    }, 500);
  }
});

// 🧹 ROUTE : Nettoyer toutes les données de test
app.post("/test-data", async (c) => {
  try {
    console.log('🧹 Démarrage du nettoyage des données de test...');
    
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const stats = {
      passengers_deleted: 0,
      drivers_deleted: 0,
      rides_deleted: 0,
      auth_users_deleted: 0,
      errors: [] as string[]
    };

    // 1️⃣ Récupérer toutes les données
    const passengers = await kv.getByPrefix<any>('passenger:') || [];
    const drivers = await kv.getByPrefix<any>('driver:') || [];
    const rides = await kv.getByPrefix<any>('ride:') || [];

    console.log(`📊 Trouvé: ${passengers.length} passagers, ${drivers.length} conducteurs, ${rides.length} courses`);

    // 3️⃣ Supprimer les passagers de test
    console.log('🗑️ Suppression des passagers de test...');
    for (const passenger of passengers) {
      if (isTestData(passenger, 'passenger')) {
        try {
          console.log(`🔍 Passager détecté comme test: ${passenger.full_name} (${passenger.email})`);
          
          // Supprimer du KV Store
          await kv.del(`passenger:${passenger.id}`);
          
          // Supprimer de Supabase Auth
          try {
            await supabaseAdmin.auth.admin.deleteUser(passenger.id);
            stats.auth_users_deleted++;
          } catch (authError) {
            console.log(`⚠️ Erreur suppression auth passager ${passenger.id}:`, authError);
          }
          
          stats.passengers_deleted++;
          console.log(`✅ Passager supprimé: ${passenger.full_name} (${passenger.id})`);
        } catch (error) {
          const errorMsg = `Erreur passager ${passenger.id}: ${error}`;
          stats.errors.push(errorMsg);
          console.error('❌', errorMsg);
        }
      } else {
        console.log(`✓ Passager conservé: ${passenger.full_name} (${passenger.email})`);
      }
    }

    // 4️⃣ Supprimer les conducteurs de test
    console.log('🗑️ Suppression des conducteurs de test...');
    for (const driver of drivers) {
      if (isTestData(driver, 'driver')) {
        try {
          console.log(`🔍 Conducteur détecté comme test: ${driver.full_name} (${driver.email})`);
          
          // Supprimer du KV Store
          await kv.del(`driver:${driver.id}`);
          
          // Supprimer de Supabase Auth
          try {
            await supabaseAdmin.auth.admin.deleteUser(driver.id);
            stats.auth_users_deleted++;
          } catch (authError) {
            console.log(`⚠️ Erreur suppression auth conducteur ${driver.id}:`, authError);
          }
          
          stats.drivers_deleted++;
          console.log(`✅ Conducteur supprimé: ${driver.full_name} (${driver.id})`);
        } catch (error) {
          const errorMsg = `Erreur conducteur ${driver.id}: ${error}`;
          stats.errors.push(errorMsg);
          console.error('❌', errorMsg);
        }
      } else {
        console.log(`✓ Conducteur conservé: ${driver.full_name} (${driver.email})`);
      }
    }

    // 5️⃣ Supprimer toutes les courses de test ou orphelines
    console.log('🗑️ Suppression des courses de test/orphelines...');
    
    // Récupérer les IDs des utilisateurs restants (après suppression)
    const remainingPassengers = await kv.getByPrefix<any>('passenger:') || [];
    const remainingDrivers = await kv.getByPrefix<any>('driver:') || [];
    const remainingPassengerIds = new Set(remainingPassengers.map(p => p.id));
    const remainingDriverIds = new Set(remainingDrivers.map(d => d.id));
    
    for (const ride of rides) {
      try {
        // Supprimer si le passager ou le conducteur n'existe plus
        const passengerExists = remainingPassengerIds.has(ride.passenger_id);
        const driverExists = remainingDriverIds.has(ride.driver_id);
        
        if (!passengerExists || !driverExists) {
          await kv.del(`ride:${ride.id}`);
          stats.rides_deleted++;
          console.log(`✅ Course orpheline supprimée: ${ride.id} (passager: ${passengerExists}, conducteur: ${driverExists})`);
        }
      } catch (error) {
        const errorMsg = `Erreur course ${ride.id}: ${error}`;
        stats.errors.push(errorMsg);
        console.error('❌', errorMsg);
      }
    }

    console.log('✅ Nettoyage terminé !');
    console.log('📊 Statistiques:', stats);

    return c.json({ 
      success: true, 
      message: `Nettoyage terminé : ${stats.passengers_deleted} passagers, ${stats.drivers_deleted} conducteurs, ${stats.rides_deleted} courses supprimés`,
      stats 
    });
    
  } catch (error) {
    console.error("❌ Erreur nettoyage données de test:", error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Erreur serveur" 
    }, 500);
  }
});

export default app;
