import { Hono } from "npm:hono";
import * as kv from "./kv-wrapper.ts";
import { isValidUUID } from "./uuid-validator.ts";
import { sendFCMNotification } from "./firebase-admin.ts";

const app = new Hono();

/**
 * 🎯 SYSTÈME DE MATCHING INTELLIGENT
 * Trouve les chauffeurs disponibles à proximité et leur envoie des notifications
 */
/**
 * 🎯 MATCHING SÉQUENTIEL - 15 secondes par chauffeur
 * Driver 1 → 15s → Driver 2 → 15s → etc.
 */
async function findAndNotifyNearbyDrivers(ride: any) {
  try {
    console.log(`🔍 Recherche de chauffeurs pour la course ${ride.id}`);

    const allDrivers = await kv.getByPrefix('driver:');
    console.log(`👥 Total chauffeurs dans la base: ${allDrivers.length}`);

    const eligibleDrivers = allDrivers.filter((driver: any) => {
      const isOnline = driver.status === 'online';
      const isAvailable = driver.available === true || driver.is_available === true;
      const driverCategory = driver.vehicleCategory || driver.vehicle_category ||
                             driver.vehicle_type || driver.vehicleType;
      const categoryMatch = driverCategory === ride.vehicleCategory;
      return isOnline && isAvailable && categoryMatch && driver.fcmToken;
    });

    if (eligibleDrivers.length === 0) {
      console.warn(`⚠️ Aucun chauffeur éligible pour ${ride.vehicleCategory}`);
      return { success: false, reason: 'no_drivers_available' };
    }

    // Trier par distance
    const pickupLat = ride.pickup?.coordinates?.lat || -4.3276;
    const pickupLng = ride.pickup?.coordinates?.lng || 15.3136;

    const driversWithDistance = eligibleDrivers.map((driver: any) => {
      const driverLat = driver.currentLocation?.lat || driver.current_location?.lat || driver.location?.lat || -4.3276;
      const driverLng = driver.currentLocation?.lng || driver.current_location?.lng || driver.location?.lng || 15.3136;
      return { ...driver, distanceToPickup: calculateDistance(pickupLat, pickupLng, driverLat, driverLng) };
    });

    driversWithDistance.sort((a, b) => a.distanceToPickup - b.distanceToPickup);
    const nearbyDrivers = driversWithDistance.slice(0, 5);

    console.log(`📍 ${nearbyDrivers.length} chauffeurs à notifier séquentiellement`);

    // Sauvegarder la file d'attente dans KV
    await kv.set(`matching:${ride.id}`, {
      rideId: ride.id,
      queue: nearbyDrivers.map(d => d.id),
      currentIndex: 0,
      startedAt: new Date().toISOString(),
      status: 'searching'
    });

    // Notifier le premier chauffeur
    await notifyDriverAtIndex(ride, nearbyDrivers, 0);

    return {
      success: true,
      driversNotified: 1,
      totalEligible: nearbyDrivers.length,
      nearbyDrivers: nearbyDrivers.map(d => ({
        id: d.id,
        name: d.full_name || d.name,
        distance: d.distanceToPickup
      }))
    };

  } catch (error) {
    console.error('❌ Erreur matching:', error);
    return { success: false, reason: 'matching_error', error: error.message };
  }
}

/**
 * Notifie un chauffeur et programme le passage au suivant après 15s
 */
async function notifyDriverAtIndex(ride: any, drivers: any[], index: number) {
  if (index >= drivers.length) {
    console.warn(`⚠️ Tous les chauffeurs ont refusé la course ${ride.id}`);
    // Marquer la course comme non trouvée
    const currentRide = await kv.get<any>(`ride:${ride.id}`);
    if (currentRide && currentRide.status === 'searching') {
      currentRide.status = 'no_driver_found';
      currentRide.noDriverFoundAt = new Date().toISOString();
      await kv.set(`ride:${ride.id}`, currentRide);
    }
    await kv.delete(`matching:${ride.id}`);
    return;
  }

  // Vérifier que la course est toujours en recherche
  const currentRide = await kv.get<any>(`ride:${ride.id}`);
  if (!currentRide || currentRide.status !== 'searching') {
    console.log(`⏹️ Course ${ride.id} n'est plus en recherche (${currentRide?.status}), arrêt du matching`);
    await kv.delete(`matching:${ride.id}`);
    return;
  }

  const driver = drivers[index];
  const pickupName = ride.pickup?.name || 'Point de départ';
  const destinationName = ride.destination?.name || 'Destination';
  const distance = ride.distance || 0;
  const estimatedPrice = ride.estimatedPrice || 0;
  const pickupLat = ride.pickup?.coordinates?.lat || -4.3276;
  const pickupLng = ride.pickup?.coordinates?.lng || 15.3136;
  const destinationLat = ride.destination?.coordinates?.lat || -4.3276;
  const destinationLng = ride.destination?.coordinates?.lng || 15.3136;

  console.log(`📱 Notification driver ${index + 1}/${drivers.length}: ${driver.full_name || driver.name}`);

  const result = await sendFCMNotification(driver.fcmToken, {
    title: 'SmartCabb - Nouvelle Course',
    body: `${pickupName} vers ${destinationName} - ${distance.toFixed(1)} km - ${Math.round(estimatedPrice)} FC`,
    data: {
      rideId: ride.id,
      type: 'new_ride_request',
      pickupLat: pickupLat.toString(),
      pickupLng: pickupLng.toString(),
      destinationLat: destinationLat.toString(),
      destinationLng: destinationLng.toString(),
      pickupName,
      destinationName,
      passengerName: ride.passengerName || 'Passager',
      distance: distance.toString(),
      duration: (ride.duration || 0).toString(),
      estimatedPrice: estimatedPrice.toString(),
      vehicleCategory: ride.vehicleCategory,
      distanceToPickup: driver.distanceToPickup.toFixed(1),
      driverIndex: index.toString(),
      totalDrivers: drivers.length.toString()
    }
  });

  if (result.success) {
    console.log(`✅ Driver ${driver.full_name || driver.name} notifié - attente 15s`);

    // Mettre à jour l'index courant
    const matching = await kv.get<any>(`matching:${ride.id}`);
    if (matching) {
      matching.currentIndex = index;
      matching.currentDriverId = driver.id;
      matching.notifiedAt = new Date().toISOString();
      await kv.set(`matching:${ride.id}`, matching);
    }

    // Attendre 15 secondes puis passer au suivant
    await new Promise(resolve => setTimeout(resolve, 15000));

    // Re-vérifier le statut de la course après 15s
    const rideAfterWait = await kv.get<any>(`ride:${ride.id}`);
    if (!rideAfterWait || rideAfterWait.status !== 'searching') {
      console.log(`✅ Course ${ride.id} acceptée ou annulée pendant l'attente`);
      await kv.delete(`matching:${ride.id}`);
      return;
    }

    // Notifier le driver suivant
    await notifyDriverAtIndex(ride, drivers, index + 1);
  } else {
    console.error(`❌ Échec notification driver ${driver.full_name || driver.name}, passage au suivant`);
    await notifyDriverAtIndex(ride, drivers, index + 1);
  }
}

/**
 * 📏 Calcul de distance (formule Haversine)
 */
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Rayon de la Terre en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ============================================
// POST /create - Créer une nouvelle course
// ============================================
app.post("/create", async (c) => {
  console.log("🚨🚨🚨 POST /rides/create APPELÉE ! 🚨🚨🚨");
  
  try {
    const rideData = await c.req.json();
    console.log("📦 Données reçues:", JSON.stringify(rideData, null, 2));
    
    const rideId = crypto.randomUUID();
    
    // 🔧 MAPPING : vehicleType → vehicleCategory pour compatibilité
    const vehicleCategory = rideData.vehicleCategory || rideData.vehicleType || rideData.vehicle_type;
    
    console.log("🔧 Mapping vehicleType:", {
      original: rideData.vehicleType,
      category: rideData.vehicleCategory,
      mapped: vehicleCategory
    });
    
    const ride = {
      ...rideData,
      id: rideId,
      status: 'searching',
      vehicleCategory, // ✅ Champ normalisé pour le matching
      createdAt: new Date().toISOString()
    };
    
    await kv.set(`ride:${rideId}`, ride);
    console.log("✅ Course créée:", rideId, "- Catégorie:", vehicleCategory);
    
    // 🎯 LANCER LE MATCHING ET NOTIFIER LES CHAUFFEURS
    const matchingResult = await findAndNotifyNearbyDrivers(ride);
    
    if (matchingResult.success) {
      console.log(`✅ ${matchingResult.driversNotified} chauffeurs notifiés pour la course ${rideId}`);
    } else {
      console.warn(`⚠️ Matching échoué pour la course ${rideId}:`, matchingResult.reason);
    }
    
    // ✅ Retourner rideId (attendu par le frontend)
    return c.json({ 
      success: true, 
      rideId, 
      ride,
      matching: matchingResult
    });
  } catch (error) {
    console.error("❌ Erreur création course:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

// ============================================
// GET /:id - Récupérer une course par ID
// ============================================
app.get("/:id", async (c) => {
  try {
    const rideId = c.req.param('id');
    if (!isValidUUID(rideId)) {
      return c.json({ success: false, error: "ID course invalide" }, 400);
    }
    const ride = await kv.get(`ride:${rideId}`);
    if (!ride) {
      return c.json({ success: false, error: "Course non trouvée" }, 404);
    }
    return c.json({ success: true, ride });
  } catch (error) {
    console.error("❌ Erreur récupération course:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

// ============================================
// GET /status/:id - Récupérer le statut d'une course
// ============================================
app.get("/status/:id", async (c) => {
  try {
    const rideId = c.req.param('id');
    if (!isValidUUID(rideId)) {
      return c.json({ success: false, error: "ID course invalide" }, 400);
    }
    const ride = await kv.get(`ride:${rideId}`);
    if (!ride) {
      return c.json({ success: false, error: "Course non trouvée" }, 404);
    }
    return c.json({ success: true, ride });
  } catch (error) {
    console.error("❌ Erreur récupération statut:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

// ============================================
// GET /pending/:driverId - Courses en attente pour un chauffeur
// ============================================
app.get("/pending/:driverId", async (c) => {
  try {
    const driverId = c.req.param('driverId');
    
    // Récupérer toutes les courses en attente assignées à ce chauffeur
    const allRides = await kv.getByPrefix('ride:');
    const pendingRides = allRides.filter((r: any) => 
      r.status === 'pending' && r.assignedDriverId === driverId
    );
    
    if (pendingRides.length > 0) {
      console.log(`📋 Course en attente trouvée pour ${driverId}:`, pendingRides[0].id);
      return c.json({ success: true, ride: pendingRides[0] });
    }
    
    return c.json({ success: true, ride: null });
  } catch (error) {
    console.error("❌ Erreur récupération courses en attente:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

// ============================================
// POST /check-drivers-availability - Vérifier la disponibilité des chauffeurs
// ============================================
app.post("/check-drivers-availability", async (c) => {
  try {
    const { vehicleCategory } = await c.req.json();
    
    console.log(`🔍 Vérification disponibilité chauffeurs pour catégorie: ${vehicleCategory}`);
    
    // Récupérer tous les chauffeurs
    const allDrivers = await kv.getByPrefix('driver:');
    
    console.log(`👥 Total chauffeurs dans base: ${allDrivers.length}`);
    
    // Filtrer les chauffeurs disponibles pour cette catégorie
    const eligibleDrivers = allDrivers.filter((d: any) => {
      const isOnline = d.status === 'online';
      const isAvailable = d.available === true || d.is_available === true;
      const hasPositiveBalance = (d.balance || 0) >= 0;
      
      // Supporter toutes les variantes de catégorie
      const driverCategory = d.vehicleCategory || 
                            d.vehicle_category || 
                            d.vehicle_type || 
                            d.vehicleType;
      
      const categoryMatch = driverCategory === vehicleCategory;
      
      // Log détaillé pour debugging
      if (isOnline && isAvailable && hasPositiveBalance && !categoryMatch) {
        console.log(`⏭️ Driver ${d.full_name || d.name} online mais catégorie différente: ` +
          `${driverCategory} vs ${vehicleCategory}`);
      }
      
      return isOnline && isAvailable && hasPositiveBalance && categoryMatch;
    });
    
    // Compter tous les chauffeurs en ligne (toutes catégories)
    const allOnlineDrivers = allDrivers.filter((d: any) => 
      d.status === 'online' && (d.balance || 0) >= 0
    );
    
    const available = eligibleDrivers.length > 0;
    const driversCount = eligibleDrivers.length;
    const totalOnline = allOnlineDrivers.length;
    
    console.log(`✅ ${driversCount} chauffeurs disponibles pour ${vehicleCategory} (${totalOnline} total en ligne)`);
    
    // Si aucun chauffeur disponible pour cette catégorie, proposer des alternatives
    let alternatives = [];
    if (!available && totalOnline > 0) {
      const categories = ['economic', 'comfort', 'van', 'luxury', 'smart_standard', 'smart_comfort', 'smart_van', 'smart_luxury'];
      alternatives = categories
        .filter(cat => cat !== vehicleCategory)
        .map(cat => {
          const count = allDrivers.filter((d: any) => {
            const isOnline = d.status === 'online';
            const isAvailable = d.available === true || d.is_available === true;
            const hasPositiveBalance = (d.balance || 0) >= 0;
            
            // Supporter toutes les variantes
            const driverCategory = d.vehicleCategory || 
                                  d.vehicle_category || 
                                  d.vehicle_type || 
                                  d.vehicleType;
            
            return isOnline && isAvailable && hasPositiveBalance && driverCategory === cat;
          }).length;
          return { category: cat, count };
        })
        .filter(alt => alt.count > 0);
      
      console.log(`🔄 Alternatives disponibles:`, alternatives);
    }
    
    return c.json({
      success: true,
      available,
      driversCount,
      totalOnline,
      categoryName: getCategoryName(vehicleCategory),
      alternatives,
      noDriversOnlineAtAll: totalOnline === 0
    });
  } catch (error) {
    console.error("❌ Erreur vérification disponibilité:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

// ============================================
// GET /check-availability/:id - Vérifier si des chauffeurs sont disponibles pour une course
// ============================================
app.get("/check-availability/:id", async (c) => {
  try {
    const rideId = c.req.param('id');
    
    if (!isValidUUID(rideId)) {
      return c.json({ success: false, error: "ID course invalide" }, 400);
    }
    
    const ride = await kv.get<any>(`ride:${rideId}`);
    if (!ride) {
      return c.json({ success: false, error: "Course non trouvée" }, 404);
    }
    
    console.log(`🔍 Vérification disponibilité pour course ${rideId}, catégorie: ${ride.vehicleCategory}`);
    
    // Récupérer tous les chauffeurs disponibles pour cette catégorie
    const allDrivers = await kv.getByPrefix('driver:');
    const eligibleDrivers = allDrivers.filter((d: any) => {
      const isOnline = d.status === 'online';
      const isAvailable = d.available === true || d.is_available === true;
      const hasPositiveBalance = (d.balance || 0) >= 0;
      
      // Supporter toutes les variantes de catégorie
      const driverCategory = d.vehicleCategory || 
                            d.vehicle_category || 
                            d.vehicle_type || 
                            d.vehicleType;
      
      const categoryMatch = driverCategory === ride.vehicleCategory;
      
      return isOnline && isAvailable && hasPositiveBalance && categoryMatch;
    });
    
    const available = eligibleDrivers.length > 0;
    
    // Si toujours pas de chauffeurs, proposer des alternatives
    let alternatives = [];
    if (!available) {
      const categories = ['economic', 'comfort', 'van', 'luxury', 'smart_standard', 'smart_comfort', 'smart_van', 'smart_luxury'];
      alternatives = categories
        .filter(cat => cat !== ride.vehicleCategory)
        .map(cat => {
          const count = allDrivers.filter((d: any) => {
            const isOnline = d.status === 'online';
            const isAvailable = d.available === true || d.is_available === true;
            const hasPositiveBalance = (d.balance || 0) >= 0;
            
            // Supporter toutes les variantes
            const driverCategory = d.vehicleCategory || 
                                  d.vehicle_category || 
                                  d.vehicle_type || 
                                  d.vehicleType;
            
            return isOnline && isAvailable && hasPositiveBalance && driverCategory === cat;
          }).length;
          return { category: cat, count };
        })
        .filter(alt => alt.count > 0);
    }
    
    console.log(`✅ Disponibilité pour course ${rideId}: ${available} (${eligibleDrivers.length} chauffeurs)`);
    
    return c.json({
      success: true,
      available,
      driversCount: eligibleDrivers.length,
      alternatives
    });
  } catch (error) {
    console.error("❌ Erreur vérification disponibilité course:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

// Helper pour obtenir le nom de la catégorie
function getCategoryName(category: string): string {
  const names: Record<string, string> = {
    'economic': 'Économique',
    'comfort': 'Confort',
    'van': 'Van',
    'luxury': 'Luxe'
  };
  return names[category] || category;
}

// ============================================
// POST /accept - Accepter une course
// ============================================
app.post("/accept", async (c) => {
  try {
    const { rideId, driverId, driverName, driverPhone, driverVehicle, driverRating } = await c.req.json();

    if (!isValidUUID(rideId)) {
      return c.json({ success: false, error: "ID course invalide" }, 400);
    }

    const ride = await kv.get<any>(`ride:${rideId}`);
    if (!ride) {
      return c.json({ success: false, error: "Course non trouvée" }, 404);
    }

    if (ride.status !== 'pending' && ride.status !== 'searching') {
      return c.json({ success: false, error: "Course déjà acceptée ou terminée" }, 400);
    }

    ride.status = 'accepted';
    ride.driverId = driverId;
    ride.driver = { id: driverId, name: driverName, phone: driverPhone, vehicle: driverVehicle, rating: driverRating };
    ride.acceptedAt = new Date().toISOString();
    await kv.set(`ride:${rideId}`, ride);

    console.log(`✅ Course ${rideId} acceptée par ${driverName}`);

    // Arrêter le matching séquentiel
    await kv.delete(`matching:${rideId}`);

    // Notifier les autres drivers de la même catégorie que la course est prise
    try {
      const allDrivers = await kv.getByPrefix('driver:');
      const otherDrivers = allDrivers.filter((d: any) => {
        const driverCategory = d.vehicleCategory || d.vehicle_category || d.vehicle_type || d.vehicleType;
        return d.id !== driverId &&
               d.status === 'online' &&
               driverCategory === ride.vehicleCategory &&
               d.fcmToken;
      });

      for (const otherDriver of otherDrivers) {
        await sendFCMNotification(otherDriver.fcmToken, {
          title: 'SmartCabb',
          body: 'Cette course a été acceptée par un autre chauffeur.',
          data: { type: 'ride_taken', rideId }
        });
      }
      console.log(`📢 ${otherDrivers.length} autres chauffeurs notifiés (course prise)`);
    } catch (error) {
      console.error('❌ Erreur notification autres drivers:', error);
    }

    // Notifier le passager
    try {
      const passenger = await kv.get<any>(`passenger:${ride.passengerId}`);
      if (passenger?.fcmToken) {
        await sendFCMNotification(passenger.fcmToken, {
          title: 'Chauffeur trouvé !',
          body: `${driverName} arrive dans quelques minutes`,
          data: { rideId, type: 'ride_accepted', driverId, driverName }
        });
      }
    } catch (error) {
      console.error('❌ Erreur notification passager:', error);
    }

    return c.json({ success: true, ride });
  } catch (error) {
    console.error("❌ Erreur acceptation course:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

// ============================================
// POST /decline - Refuser une course (passe au driver suivant)
// ============================================
app.post("/decline", async (c) => {
  try {
    const { rideId, driverId } = await c.req.json();

    if (!isValidUUID(rideId)) {
      return c.json({ success: false, error: "ID course invalide" }, 400);
    }

    console.log(`❌ Driver ${driverId} a refusé la course ${rideId}`);

    const ride = await kv.get<any>(`ride:${rideId}`);
    if (!ride) {
      return c.json({ success: false, error: "Course non trouvée" }, 404);
    }

    if (ride.status !== 'searching') {
      return c.json({ success: false, error: "Course non disponible" }, 400);
    }

    // Récupérer la file de matching
    const matching = await kv.get<any>(`matching:${rideId}`);
    if (!matching) {
      return c.json({ success: true, message: "Matching déjà terminé" });
    }

    const currentIndex = matching.currentIndex || 0;
    const nextIndex = currentIndex + 1;

    // Récupérer les drivers de la file
    const allDrivers = await kv.getByPrefix('driver:');
    const queuedDriverIds: string[] = matching.queue || [];

    const queuedDrivers = queuedDriverIds
      .map((id: string) => allDrivers.find((d: any) => d.id === id))
      .filter(Boolean);

    console.log(`⏭️ Passage au driver suivant (index ${nextIndex}/${queuedDrivers.length})`);

    if (nextIndex >= queuedDrivers.length) {
      // Plus de drivers disponibles
      console.warn(`⚠️ Tous les chauffeurs ont refusé la course ${rideId}`);
      ride.status = 'no_driver_found';
      ride.noDriverFoundAt = new Date().toISOString();
      await kv.set(`ride:${rideId}`, ride);
      await kv.delete(`matching:${rideId}`);
      return c.json({ success: true, message: "Aucun chauffeur disponible" });
    }

    // Mettre à jour l'index
    matching.currentIndex = nextIndex;
    await kv.set(`matching:${rideId}`, matching);

    // Notifier le driver suivant immédiatement
    const nextDriver = queuedDrivers[nextIndex];
    if (!nextDriver?.fcmToken) {
      return c.json({ success: true, message: "Driver suivant sans token" });
    }

    const pickupName = ride.pickup?.name || 'Point de départ';
    const destinationName = ride.destination?.name || 'Destination';
    const distance = ride.distance || 0;
    const estimatedPrice = ride.estimatedPrice || 0;

    const result = await sendFCMNotification(nextDriver.fcmToken, {
      title: 'SmartCabb - Nouvelle Course',
      body: `${pickupName} vers ${destinationName} - ${distance.toFixed(1)} km - ${Math.round(estimatedPrice)} FC`,
      data: {
        rideId: ride.id,
        type: 'new_ride_request',
        pickupLat: (ride.pickup?.coordinates?.lat || -4.3276).toString(),
        pickupLng: (ride.pickup?.coordinates?.lng || 15.3136).toString(),
        destinationLat: (ride.destination?.coordinates?.lat || -4.3276).toString(),
        destinationLng: (ride.destination?.coordinates?.lng || 15.3136).toString(),
        pickupName,
        destinationName,
        passengerName: ride.passengerName || 'Passager',
        distance: distance.toString(),
        duration: (ride.duration || 0).toString(),
        estimatedPrice: estimatedPrice.toString(),
        vehicleCategory: ride.vehicleCategory,
        driverIndex: nextIndex.toString(),
        totalDrivers: queuedDrivers.length.toString()
      }
    });

    if (result.success) {
      console.log(`✅ Driver suivant notifié: ${nextDriver.full_name || nextDriver.name}`);
    }

    return c.json({ success: true, nextDriverNotified: result.success });
  } catch (error) {
    console.error("❌ Erreur refus course:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

// ============================================
// POST /start - Démarrer une course
// ============================================
app.post("/start", async (c) => {
  try {
    const { rideId, driverId } = await c.req.json();
    
    if (!isValidUUID(rideId)) {
      return c.json({ success: false, error: "ID course invalide" }, 400);
    }
    
    const ride = await kv.get<any>(`ride:${rideId}`);
    if (!ride) {
      return c.json({ success: false, error: "Course non trouvée" }, 404);
    }
    
    if (ride.driverId !== driverId) {
      return c.json({ success: false, error: "Vous n'êtes pas le chauffeur assigné" }, 403);
    }
    
    // ✅ PAS DE CODE DE CONFIRMATION - Démarrage direct
    // Le driver démarre la course après avoir cliqué "Je suis arrivé"
    
    // Démarrer la course
    ride.status = 'in_progress';
    ride.startedAt = new Date().toISOString();
    
    await kv.set(`ride:${rideId}`, ride);
    
    console.log(`✅ Course ${rideId} démarrée par ${driverId}`);
    
    return c.json({ success: true, ride });
  } catch (error) {
    console.error("❌ Erreur démarrage course:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

// ============================================
// POST /cancel - Annuler une course
// ============================================
app.post("/cancel", async (c) => {
  try {
    const { rideId, passengerId, driverId, reason, cancelledBy } = await c.req.json();
    
    console.log(`🚫 Demande d'annulation de course ${rideId} par ${cancelledBy}`);
    
    if (!isValidUUID(rideId)) {
      return c.json({ success: false, error: "ID de course invalide" }, 400);
    }
    
    // Récupérer la course
    const ride = await kv.get<any>(`ride:${rideId}`);
    
    if (!ride) {
      return c.json({ success: false, error: "Course non trouvée" }, 404);
    }
    
    // Vérifier que la course n'est pas déjà terminée
    if (ride.status === 'completed' || ride.status === 'cancelled') {
      return c.json({ success: false, error: "Course déjà terminée ou annulée" }, 400);
    }
    
    // 📊 Créer l'enregistrement d'annulation pour le panel admin
    const cancellationRecord = {
      id: `cancellation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      rideId: rideId,
      cancelledAt: new Date().toISOString(),
      cancelledBy: cancelledBy, // 'passenger' ou 'driver'
      reason: reason || 'Non spécifiée',
      
      // Informations de la course
      pickup: ride.pickup || 'Non spécifié',
      destination: ride.destination || 'Non spécifié',
      estimatedPrice: ride.estimatedPrice || 0,
      distance: ride.distance || 0,
      vehicleType: ride.vehicleType || 'smart_standard',
      status: ride.status, // 'searching', 'accepted', 'in_progress', etc.
      
      // Informations passager
      passengerId: ride.passengerId,
      passengerName: ride.passengerName || 'Non spécifié',
      passengerPhone: ride.passengerPhone || 'Non spécifié',
      
      // Informations conducteur (si déjà assigné)
      driverId: ride.driverId || null,
      driverName: ride.driverName || null,
      driverPhone: ride.driverPhone || null,
      
      // Métadonnées
      createdAt: ride.createdAt || new Date().toISOString(),
      acceptedAt: ride.acceptedAt || null,
      startedAt: ride.startedAt || null,
      
      // Calcul de pénalité potentielle
      hasPenalty: false,
      penaltyAmount: 0,
    };
    
    // Calculer la pénalité si annulation après acceptation
    if (ride.status === 'accepted' || ride.status === 'in_progress') {
      cancellationRecord.hasPenalty = true;
      // Pénalité de 10% du prix estimé (minimum 500 CDF)
      cancellationRecord.penaltyAmount = Math.max(500, Math.round(ride.estimatedPrice * 0.1));
    }
    
    // Sauvegarder l'annulation dans la KV store
    await kv.set(`cancellation:${cancellationRecord.id}`, cancellationRecord);
    
    console.log(`✅ Annulation enregistrée : ${cancellationRecord.id}`);
    
    // Annuler la course
    ride.status = 'cancelled';
    ride.cancelledAt = new Date().toISOString();
    ride.cancelledBy = cancelledBy;
    ride.cancellationReason = reason;
    
    await kv.set(`ride:${rideId}`, ride);
    // Notifier tous les drivers de la même catégorie que la course est annulée
try {
  const allDrivers = await kv.getByPrefix('driver:');
  const categoryDrivers = allDrivers.filter((d: any) => {
    const driverCategory = d.vehicleCategory || d.vehicle_category || d.vehicle_type || d.vehicleType;
    return d.status === 'online' && driverCategory === ride.vehicleCategory && d.fcmToken;
  });

  for (const driver of categoryDrivers) {
    await sendFCMNotification(driver.fcmToken, {
      title: 'SmartCabb',
      body: 'Le passager a annulé sa course.',
      data: { type: 'ride_cancelled_by_passenger', rideId }
    });
  }
  await kv.delete(`matching:${rideId}`);
  console.log(`📢 ${categoryDrivers.length} chauffeurs notifiés de l'annulation`);
} catch (error) {
  console.error('❌ Erreur notification annulation drivers:', error);
}
    
    console.log(`✅ Course ${rideId} annulée par ${cancelledBy}`);
    
    // ✅ Envoyer notification push à l'autre partie
    // Si annulé par passager → notifier le chauffeur
    // Si annulé par chauffeur → notifier le passager
    try {
      if (cancelledBy === 'passenger' && ride.driverId) {
        const driver = await kv.get<any>(`driver:${ride.driverId}`);
        if (driver?.fcmToken) {
          await sendFCMNotification(driver.fcmToken, {
            title: '❌ Course annulée',
            body: `Le passager a annulé la course. Raison: ${reason || 'Non spécifiée'}`,
            data: {
              rideId: rideId,
              type: 'ride_cancelled',
              cancelledBy: 'passenger'
            }
          });
          console.log(`📱 Notification d'annulation envoyée au chauffeur ${ride.driverId}`);
        }
      } else if (cancelledBy === 'driver' && ride.passengerId) {
        const passenger = await kv.get<any>(`passenger:${ride.passengerId}`);
        if (passenger?.fcmToken) {
          await sendFCMNotification(passenger.fcmToken, {
            title: '❌ Course annulée',
            body: `Le chauffeur a annulé la course. Raison: ${reason || 'Non spécifiée'}`,
            data: {
              rideId: rideId,
              type: 'ride_cancelled',
              cancelledBy: 'driver'
            }
          });
          console.log(`📱 Notification d'annulation envoyée au passager ${ride.passengerId}`);
        }
      }
    } catch (error) {
      console.error('❌ Erreur envoi notification d\'annulation:', error);
    }
    
    return c.json({ 
      success: true, 
      ride,
      cancellation: cancellationRecord 
    });
  } catch (error) {
    console.error("❌ Erreur annulation course:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

// ============================================
// POST /activate-billing - Activer la facturation
// ============================================
app.post("/activate-billing", async (c) => {
  try {
    const { rideId, waitingTimeFrozen } = await c.req.json();
    
    if (!isValidUUID(rideId)) {
      return c.json({ success: false, error: "ID course invalide" }, 400);
    }
    
    const ride = await kv.get<any>(`ride:${rideId}`);
    if (!ride) {
      return c.json({ success: false, error: "Course non trouvée" }, 404);
    }
    
    ride.billingActivated = true;
    ride.billingActivatedAt = new Date().toISOString();
    ride.waitingTimeFrozen = waitingTimeFrozen;
    
    await kv.set(`ride:${rideId}`, ride);
    
    console.log(`💰 Facturation activée pour course ${rideId}`);
    
    return c.json({ success: true, ride });
  } catch (error) {
    console.error("❌ Erreur activation facturation:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

// ============================================
// POST /:id/update - Mettre à jour une course
// ============================================
app.post("/:id/update", async (c) => {
  try {
    const rideId = c.req.param('id');
    const updates = await c.req.json();
    if (!isValidUUID(rideId)) {
      return c.json({ success: false, error: "ID course invalide" }, 400);
    }
    const ride = await kv.get<any>(`ride:${rideId}`);
    if (!ride) {
      return c.json({ success: false, error: "Course non trouvée" }, 404);
    }
    Object.assign(ride, updates);
    ride.lastUpdate = new Date().toISOString();
    await kv.set(`ride:${rideId}`, ride);
    return c.json({ success: true, ride });
  } catch (error) {
    console.error("❌ Erreur mise à jour course:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

// ============================================
// POST /complete - Terminer une course
// ============================================
app.post("/complete", async (c) => {
  try {
    const { rideId, driverId, actualCost, endLocation } = await c.req.json();
    
    if (!isValidUUID(rideId)) {
      return c.json({ success: false, error: "ID course invalide" }, 400);
    }
    
    const ride = await kv.get<any>(`ride:${rideId}`);
    if (!ride) {
      return c.json({ success: false, error: "Course non trouvée" }, 404);
    }
    
    // 💰 NOUVEAU SYSTÈME DE DOUBLE SOLDE
    // 1. Déduire 15% du solde de crédit (balance)
    // 2. Ajouter 85% au solde de gains (earningsBalance)
    if (ride.driverId && actualCost) {
      const driver = await kv.get<any>(`driver:${ride.driverId}`);
      if (driver) {
        const commission = actualCost * 0.15;
        const driverEarnings = actualCost * 0.85; // 85% pour le conducteur
        
        // Déduire la commission du solde de crédit
        driver.balance = (driver.balance || 0) - commission;
        
        // Ajouter les gains au solde retirable
        driver.earningsBalance = (driver.earningsBalance || 0) + driverEarnings;
        
        await kv.set(`driver:${ride.driverId}`, driver);
        
        console.log(`💰 [RIDE-COMPLETE] Driver ${ride.driverId}:`);
        console.log(`   - Commission (15%): ${commission.toLocaleString('fr-FR')} CDF déduite du solde de crédit`);
        console.log(`   - Gains (85%): ${driverEarnings.toLocaleString('fr-FR')} CDF ajoutés au solde retirable`);
        console.log(`   - Nouveau solde crédit: ${driver.balance.toLocaleString('fr-FR')} CDF`);
        console.log(`   - Nouveau solde gains: ${driver.earningsBalance.toLocaleString('fr-FR')} CDF`);
      }
    }
    
    ride.status = 'completed';
    ride.completedAt = new Date().toISOString();
    ride.totalPrice = actualCost || ride.estimatedPrice;
    ride.endLocation = endLocation;
    
    await kv.set(`ride:${rideId}`, ride);
    
    console.log(`✅ Course ${rideId} terminée`);
    
    return c.json({ success: true, ride });
  } catch (error) {
    console.error("❌ Erreur complétion course:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

// ============================================
// POST /:id/complete - Terminer une course (route alternative)
// ============================================
app.post("/:id/complete", async (c) => {
  try {
    const rideId = c.req.param('id');
    const { driverId, actualCost } = await c.req.json();
    
    if (!isValidUUID(rideId)) {
      return c.json({ success: false, error: "ID course invalide" }, 400);
    }
    const ride = await kv.get<any>(`ride:${rideId}`);
    if (!ride) {
      return c.json({ success: false, error: "Course non trouvée" }, 404);
    }
    
    // 💰 NOUVEAU SYSTÈME DE DOUBLE SOLDE
    // 1. Déduire 15% du solde de crédit (balance)
    // 2. Ajouter 85% au solde de gains (earningsBalance)
    if (ride.driverId && actualCost) {
      const driver = await kv.get<any>(`driver:${ride.driverId}`);
      if (driver) {
        const commission = actualCost * 0.15;
        const driverEarnings = actualCost * 0.85; // 85% pour le conducteur
        
        // Déduire la commission du solde de crédit
        driver.balance = (driver.balance || 0) - commission;
        
        // Ajouter les gains au solde retirable
        driver.earningsBalance = (driver.earningsBalance || 0) + driverEarnings;
        
        await kv.set(`driver:${ride.driverId}`, driver);
        
        console.log(`💰 [RIDE-COMPLETE] Driver ${ride.driverId}:`);
        console.log(`   - Commission (15%): ${commission.toLocaleString('fr-FR')} CDF déduite du solde de crédit`);
        console.log(`   - Gains (85%): ${driverEarnings.toLocaleString('fr-FR')} CDF ajoutés au solde retirable`);
        console.log(`   - Nouveau solde crédit: ${driver.balance.toLocaleString('fr-FR')} CDF`);
        console.log(`   - Nouveau solde gains: ${driver.earningsBalance.toLocaleString('fr-FR')} CDF`);
      }
    }
    
    ride.status = 'completed';
    ride.completedAt = new Date().toISOString();
    ride.totalPrice = actualCost || ride.estimatedPrice;
    await kv.set(`ride:${rideId}`, ride);
    
    return c.json({ success: true, ride });
  } catch (error) {
    console.error("❌ Erreur complétion course:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

// ============================================
// GET /driver/:driverId/earnings - Gains du chauffeur
// ============================================
app.get("/driver/:driverId/earnings", async (c) => {
  try {
    const driverId = c.req.param('driverId');
    const period = c.req.query('period') || 'today';
    
    const allRides = await kv.getByPrefix('ride:');
    const driverRides = allRides.filter((r: any) => 
      r.driverId === driverId && r.status === 'completed'
    );
    
    const now = new Date();
    let filteredRides = driverRides;
    
    if (period === 'today') {
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      filteredRides = driverRides.filter((r: any) => 
        new Date(r.completedAt) >= todayStart
      );
    } else if (period === 'week') {
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filteredRides = driverRides.filter((r: any) => 
        new Date(r.completedAt) >= weekStart
      );
    }
    
    const totalEarnings = filteredRides.reduce((sum: number, r: any) => 
      sum + (r.totalPrice || r.estimatedPrice || 0), 0
    );
    const commission = totalEarnings * 0.15;
    const netEarnings = totalEarnings - commission;
    
    return c.json({
      success: true,
      earnings: {
        total: totalEarnings,
        commission,
        net: netEarnings,
        ridesCount: filteredRides.length
      }
    });
  } catch (error) {
    console.error("❌ Erreur récupération gains:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

export default app;