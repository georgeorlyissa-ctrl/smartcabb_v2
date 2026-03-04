import { Hono } from "npm:hono";
import * as kv from "./kv-wrapper.ts";

const app = new Hono();

// 🔍 DIAGNOSTIC COMPLET D'UN DRIVER
app.get("/:driverId", async (c) => {
  try {
    const driverId = c.req.param('driverId');
    
    console.log(`🔍 [DIAGNOSTIC] Récupération driver: ${driverId}`);
    
    const driver = await kv.get<any>(`driver:${driverId}`);
    
    if (!driver) {
      return c.json({ 
        success: false, 
        error: "Driver non trouvé" 
      }, 404);
    }
    
    // Analyser les champs critiques pour le matching
    const diagnostic = {
      id: driver.id,
      name: driver.full_name || driver.name,
      
      // Statut
      status: driver.status,
      isOnline: driver.status === 'online',
      
      // Disponibilité
      available: driver.available,
      is_available: driver.is_available,
      isAvailable: driver.available === true || driver.is_available === true,
      
      // Catégorie véhicule
      vehicleCategory: driver.vehicleCategory,
      vehicle_category: driver.vehicle_category,
      vehicle_type: driver.vehicle_type,
      vehicleType: driver.vehicleType,
      actualCategory: driver.vehicleCategory || driver.vehicle_category || driver.vehicle_type || driver.vehicleType,
      
      // FCM Token
      fcmToken: driver.fcmToken ? driver.fcmToken.substring(0, 30) + '...' : null,
      hasFCMToken: !!driver.fcmToken,
      fcmTokenUpdatedAt: driver.fcmTokenUpdatedAt,
      
      // Localisation
      currentLocation: driver.currentLocation,
      hasLocation: !!(driver.currentLocation?.lat && driver.currentLocation?.lng),
      
      // Balance
      balance: driver.balance || 0,
      
      // Dernière mise à jour
      lastUpdate: driver.lastUpdate,
      
      // Verdict final
      verdict: {
        isEligibleForRides: (driver.status === 'online') && 
                           (driver.available === true || driver.is_available === true) &&
                           !!(driver.vehicleCategory || driver.vehicle_category || driver.vehicle_type || driver.vehicleType) &&
                           !!(driver.fcmToken),
        reasons: []
      }
    };
    
    // Analyser les raisons de non-éligibilité
    if (driver.status !== 'online') {
      diagnostic.verdict.reasons.push(`❌ Status: ${driver.status} (devrait être "online")`);
    }
    if (driver.available !== true && driver.is_available !== true) {
      diagnostic.verdict.reasons.push(`❌ Not available (available=${driver.available}, is_available=${driver.is_available})`);
    }
    if (!driver.vehicleCategory && !driver.vehicle_category && !driver.vehicle_type && !driver.vehicleType) {
      diagnostic.verdict.reasons.push(`❌ No vehicle category set`);
    }
    if (!driver.fcmToken) {
      diagnostic.verdict.reasons.push(`❌ No FCM token registered`);
    }
    if (!driver.currentLocation?.lat || !driver.currentLocation?.lng) {
      diagnostic.verdict.reasons.push(`⚠️ No current location`);
    }
    
    if (diagnostic.verdict.reasons.length === 0) {
      diagnostic.verdict.reasons.push(`✅ Driver is eligible for rides!`);
    }
    
    console.log(`✅ [DIAGNOSTIC] Driver ${driver.full_name || driver.name}: eligible=${diagnostic.verdict.isEligibleForRides}`);
    
    return c.json({ 
      success: true, 
      driver: diagnostic
    });
    
  } catch (error) {
    console.error("❌ [DIAGNOSTIC] Erreur:", error);
    return c.json({ 
      success: false, 
      error: "Erreur serveur" 
    }, 500);
  }
});

// 📋 LISTER TOUS LES DRIVERS AVEC LEUR STATUT
app.get("/", async (c) => {
  try {
    console.log(`📋 [DIAGNOSTIC] Liste de tous les drivers`);
    
    const allDrivers = await kv.getByPrefix<any>('driver:');
    
    const driversStatus = allDrivers.map(driver => ({
      id: driver.id,
      name: driver.full_name || driver.name,
      status: driver.status,
      available: driver.available || driver.is_available,
      category: driver.vehicleCategory || driver.vehicle_category || driver.vehicle_type || driver.vehicleType,
      hasFCMToken: !!driver.fcmToken,
      hasLocation: !!(driver.currentLocation?.lat),
      balance: driver.balance || 0,
      isEligible: (driver.status === 'online') && 
                  (driver.available === true || driver.is_available === true) &&
                  !!(driver.vehicleCategory || driver.vehicle_category || driver.vehicle_type || driver.vehicleType) &&
                  !!(driver.fcmToken)
    }));
    
    const eligible = driversStatus.filter(d => d.isEligible);
    
    console.log(`✅ [DIAGNOSTIC] ${driversStatus.length} drivers totaux, ${eligible.length} éligibles`);
    
    return c.json({
      success: true,
      total: driversStatus.length,
      eligible: eligible.length,
      drivers: driversStatus
    });
    
  } catch (error) {
    console.error("❌ [DIAGNOSTIC] Erreur:", error);
    return c.json({ 
      success: false, 
      error: "Erreur serveur" 
    }, 500);
  }
});

export default app;