import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendFCMNotification } from "./firebase-admin.ts";

const app = new Hono();

// ─── Helpers "en ligne" & "disponible" — compatibilité ancien + nouveau format ──
function isDriverOnline(d: any): boolean {
  return d.isOnline === true || d.is_online === true ||
         d.status === 'online' || d.status_online === 'online';
}
function isDriverAvailable(d: any): boolean {
  return d.available === true || d.is_available === true || d.status === 'online';
}

// ✅ Catégories Standard :
//  - 'smart_standard' (legacy) == 'smart_standard_clim' : le produit historique "SmartCabb
//    STANDARD (Clim)". Le legacy est normalisé → clim, pour ne PLUS jamais matcher
//    une demande "sans clim" (bug : un chauffeur clim recevait les courses no_clim).
//  - 'smart_standard_no_clim' : produit distinct (505 FC/km) → matche UNIQUEMENT
//    les chauffeurs no_clim.
// Compatibilité STRICTE après normalisation.
function normalizeCategory(cat: string | undefined): string | undefined {
  if (!cat) return undefined;
  if (cat === 'smart_standard') return 'smart_standard_clim';
  return cat;
}
function categoriesCompatible(a: string | undefined, b: string | undefined): boolean {
  const na = normalizeCategory(a);
  const nb = normalizeCategory(b);
  if (!na || !nb) return false;
  // Compatibilité stricte : clim <-> clim, no_clim <-> no_clim
  return na === nb;
}

// ─── Table KV & helpers inlinés ──────────────────────────────────────────────
const KV_TABLE = "kv_store_2eb02e52";
function kvClient() {
  return createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
}
async function kvGet(key: string): Promise<any> {
  try { const { data } = await kvClient().from(KV_TABLE).select("value").eq("key", key).maybeSingle(); return data?.value ?? null; } catch { return null; }
}
async function kvSet(key: string, value: any): Promise<void> {
  try { const { error } = await kvClient().from(KV_TABLE).upsert({ key, value }); if (error) throw new Error(error.message); } catch (e) { console.error("KV set error:", e); throw e; }
}
async function kvDel(key: string): Promise<void> {
  try { await kvClient().from(KV_TABLE).delete().eq("key", key); } catch (e) { console.error("KV del error:", e); }
}
// ✅ Lecture complète des paramètres de commission (taux + activé + minimum)
async function getCommissionSettings(): Promise<{ rate: number; enabled: boolean; minimum: number }> {
  try {
    const config = await kvGet('smartcabb_global_config');
    if (config && typeof config === 'object') {
      return {
        rate:    typeof config.commissionRate === 'number' ? config.commissionRate : 10,
        enabled: config.commissionEnabled !== false, // défaut : activé
        minimum: typeof config.minimumCommission === 'number' ? config.minimumCommission : 0,
      };
    }
  } catch (e) { console.error('Error reading commission settings:', e); }
  return { rate: 10, enabled: true, minimum: 0 };
}
async function kvGetByPrefix(prefix: string): Promise<any[]> {
  try { const { data } = await kvClient().from(KV_TABLE).select("key, value").like("key", prefix + "%"); return data?.map((d: any) => d.value) ?? []; } catch { return []; }
}

// ─── Blocage passager après annulations successives ──────────────────────────
const PASSENGER_BLOCK_PREFIX = "passenger_block:";
const BLOCK_THRESHOLD = 3; // 3 annulations successives
const BLOCK_DURATION_MS = 24 * 60 * 60 * 1000; // 24h

async function getPassengerBlock(passengerId: string): Promise<any | null> {
  const block = await kvGet(`${PASSENGER_BLOCK_PREFIX}${passengerId}`);
  if (!block) return null;
  if (block.blockedUntil && new Date(block.blockedUntil).getTime() < Date.now()) {
    await kvDel(`${PASSENGER_BLOCK_PREFIX}${passengerId}`);
    return null;
  }
  return block;
}

async function isPassengerBlocked(passengerId: string): Promise<{ blocked: boolean; blockedUntil?: string; reason?: string }> {
  const block = await getPassengerBlock(passengerId);
  if (!block) return { blocked: false };
  return { blocked: true, blockedUntil: block.blockedUntil, reason: block.reason };
}

async function recordCancellationAndCheckBlock(passengerId: string): Promise<{ blocked: boolean; blockedUntil?: string }> {
  const allRides = await kvGetByPrefix("ride:");
  const passengerRides = allRides
    .filter((r: any) => (r.passengerId || r.passenger_id) === passengerId)
    .sort((a: any, b: any) => new Date(b.createdAt || b.created_at || 0).getTime() - new Date(a.createdAt || a.created_at || 0).getTime());

  let consecutiveCancelled = 0;
  for (const r of passengerRides) {
    if (r.status === 'cancelled' && r.cancelledBy === 'passenger') consecutiveCancelled++;
    else if (r.status === 'completed' || r.status === 'rated') break;
    else if (r.status === 'cancelled') break; // annulation driver interrompt la série
    else break; // autre statut en cours interrompt
    if (consecutiveCancelled >= BLOCK_THRESHOLD) break;
  }

  if (consecutiveCancelled >= BLOCK_THRESHOLD) {
    const blockedUntil = new Date(Date.now() + BLOCK_DURATION_MS).toISOString();
    await kvSet(`${PASSENGER_BLOCK_PREFIX}${passengerId}`, {
      passengerId,
      blockedAt: new Date().toISOString(),
      blockedUntil,
      reason: `${consecutiveCancelled} annulations successives`,
      cancelCount: consecutiveCancelled,
    });
    await logAdminEvent('passenger_blocked', { passengerId, blockedUntil, cancelCount: consecutiveCancelled });
    return { blocked: true, blockedUntil };
  }
  return { blocked: false };
}

// Compatibilité avec les anciens appels kv.*
const kv = { get: kvGet, set: kvSet, del: kvDel, getByPrefix: kvGetByPrefix, delete: kvDel };

// ─── Helper : enregistrer un événement pour le panel admin ───────────────────
async function logAdminEvent(type: string, data: Record<string, any>): Promise<void> {
  try {
    const eventId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const today   = new Date().toISOString().slice(0, 10);
    await kvSet(`event:${today}:${eventId}`, {
      id: eventId, type, data, actor: 'system',
      timestamp: new Date().toISOString(),
    });
  } catch (_) { /* Ne jamais bloquer une course pour un log */ }
}

// isValidUUID inliné pour éviter l'import local
function isValidUUID(uuid: string): boolean {
  if (!uuid || typeof uuid !== "string") return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid);
}

/**
 * 🎯 SYSTÈME DE MATCHING INTELLIGENT
 * Trouve les chauffeurs disponibles à proximité et leur envoie des notifications
 */
/**
 * 🎯 SYSTÈME DE SCORING INTELLIGENT
 * Calcule un score de matching basé sur distance, note, propreté et préférences
 */
function calculateDriverScore(driver: any, distanceToPickup: number): number {
  // Poids des critères (total = 100)
  const WEIGHT_DISTANCE = 40;     // Distance au point de prise en charge
  const WEIGHT_RATING = 25;       // Note du conducteur
  const WEIGHT_EXPERIENCE = 15;   // Nombre de courses effectuées
  const WEIGHT_CLEANLINESS = 10;  // Propreté du véhicule
  const WEIGHT_PREFERENCE = 10;   // Correspondance aux préférences

  // Score de distance (0-100) : plus proche = meilleur score
  const maxDistance = 50; // km — distance max considérée
  const distanceScore = Math.max(0, 100 - (distanceToPickup / maxDistance) * 100);

  // Score de note (0-100) : sur base de 5 étoiles
  const rating = driver.rating || driver.note || 0;
  const ratingScore = Math.min(100, (rating / 5) * 100);

  // Score d'expérience (0-100) : plus de courses = meilleur score
  const totalRides = driver.totalRides || driver.total_rides || driver.total_trips || 0;
  const experienceScore = Math.min(100, (totalRides / 100) * 100);

  // Score de propreté (0-100) : note de propreté du véhicule
  const cleanliness = driver.cleanliness || driver.vehicle_cleanliness || 3;
  const cleanlinessScore = Math.min(100, (cleanliness / 5) * 100);

  // Score de préférence de zone/distances (0-100)
  const preferences = driver.preferences || driver.ride_preferences || {};
  let preferenceScore = 50; // valeur neutre par défaut
  if (preferences.prefersLongRides === true && distanceToPickup > 10) {
    preferenceScore = 90; // préfère les longues distances → bonus
  } else if (preferences.prefersLongRides === false && distanceToPickup > 10) {
    preferenceScore = 10; // n'aime pas les longues distances → malus
  }
  if (preferences.prefersShortRides === true && distanceToPickup <= 5) {
    preferenceScore = 90;
  } else if (preferences.prefersShortRides === false && distanceToPickup <= 5) {
    preferenceScore = 10;
  }

  // Score total pondéré
  const totalScore = (
    (distanceScore * WEIGHT_DISTANCE) +
    (ratingScore * WEIGHT_RATING) +
    (experienceScore * WEIGHT_EXPERIENCE) +
    (cleanlinessScore * WEIGHT_CLEANLINESS) +
    (preferenceScore * WEIGHT_PREFERENCE)
  ) / 100;

  return Math.round(totalScore * 100) / 100;
}

/**
 * 🎯 MATCHING PARALLÈLE - Tous les chauffeurs notifiés simultanément
 * Le premier à accepter remporte la course.
 * Timeout global de 30s si aucun n'accepte.
 */
const MATCHING_TIMEOUT_MS = 30000;

async function findAndNotifyNearbyDrivers(ride: any) {
  try {
    console.log(`🔍 Recherche de chauffeurs pour la course ${ride.id}`);

    const allDrivers = await kv.getByPrefix('driver:');
    console.log(`👥 Total chauffeurs dans la base: ${allDrivers.length}`);

    const eligibleDrivers = allDrivers.filter((driver: any) => {
      const isOnline = isDriverOnline(driver);
      const isAvailable = isDriverAvailable(driver);
      const driverCategory = driver.vehicleCategory || 
                       driver.vehicle_category ||
                       driver.vehicle_type || 
                       driver.vehicleType ||
                       driver.vehicle?.category ||
                       driver.vehicle?.type;
      const categoryMatch = categoriesCompatible(driverCategory, ride.vehicleCategory);
      return isOnline && isAvailable && categoryMatch;
    });

    if (eligibleDrivers.length === 0) {
      console.warn(`⚠️ Aucun chauffeur éligible pour ${ride.vehicleCategory}`);
      allDrivers.forEach((d: any) => {
        console.log(`  Driver ${d.full_name || d.name}: isOnline=${isDriverOnline(d)}, isAvailable=${isDriverAvailable(d)}, cat=${d.vehicleCategory||d.vehicle_category||d.vehicle?.category}, fcm=${!!d.fcmToken}`);
      });
      return { success: false, reason: 'no_drivers_available' };
    }

    const pickupLat = ride.pickup?.coordinates?.lat || -4.3276;
    const pickupLng = ride.pickup?.coordinates?.lng || 15.3136;

    const driversWithScore = eligibleDrivers.map((driver: any) => {
      const driverLat = driver.currentLocation?.lat || driver.current_location?.lat || driver.location?.lat || -4.3276;
      const driverLng = driver.currentLocation?.lng || driver.current_location?.lng || driver.location?.lng || 15.3136;
      const distance = calculateDistance(pickupLat, pickupLng, driverLat, driverLng);
      const score = calculateDriverScore(driver, distance);
      console.log(`📊 Driver ${driver.full_name || driver.name}: distance=${distance.toFixed(1)}km, note=${driver.rating || 0}, courses=${driver.totalRides || 0}, propreté=${driver.cleanliness || 3}, score=${score}`);
      return { ...driver, distanceToPickup: distance, matchingScore: score };
    });

    driversWithScore.sort((a, b) => b.matchingScore - a.matchingScore);
    const nearbyDrivers = driversWithScore.slice(0, 10);

    console.log(`📍 ${nearbyDrivers.length} chauffeurs notifiés en parallèle`);

    await kv.set(`matching:${ride.id}`, {
      rideId: ride.id,
      queue: nearbyDrivers.map(d => d.id),
      currentIndex: 0,
      startedAt: new Date().toISOString(),
      status: 'searching'
    });

    // Notifier TOUS les chauffeurs en parallèle
    const notifyPromises = nearbyDrivers.map(driver => notifyDriver(ride, driver));
    await Promise.allSettled(notifyPromises);

    // Timeout global : après 30s, si personne n'a accepté, annuler
    setTimeout(async () => {
      const currentRide = await kv.get<any>(`ride:${ride.id}`);
      if (currentRide && currentRide.status === 'searching') {
        console.warn(`⏰ Timeout de ${MATCHING_TIMEOUT_MS/1000}s pour la course ${ride.id}`);
        currentRide.status = 'no_driver_found';
        currentRide.noDriverFoundAt = new Date().toISOString();
        await kv.set(`ride:${ride.id}`, currentRide);
        // Nettoyer toutes les notifications
        for (const d of nearbyDrivers) {
          await kv.delete(`driver_notification:${d.id}`);
        }
        await kv.delete(`matching:${ride.id}`);
      }
    }, MATCHING_TIMEOUT_MS);

    return {
      success: true,
      driversNotified: nearbyDrivers.length,
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

async function notifyDriver(ride: any, driver: any) {
  const pickupName = ride.pickup?.name || 
                   ride.pickup?.address || 
                   ride.pickupAddress || 
                   ride.from?.name || 
                   'Point de départ';
  const destinationName = ride.destination?.name || 
                        ride.destination?.address || 
                        ride.destinationAddress || 
                        ride.to?.name || 
                        'Destination';
  const distance = ride.distance || 0;
  const estimatedPrice = ride.estimatedPrice || 0;
  const pickupLat = ride.pickup?.coordinates?.lat || -4.3276;
  const pickupLng = ride.pickup?.coordinates?.lng || 15.3136;
  const destinationLat = ride.destination?.coordinates?.lat || -4.3276;
  const destinationLng = ride.destination?.coordinates?.lng || 15.3136;

  console.log(`📱 Notification driver ${driver.full_name || driver.name} (FCM: ${!!driver.fcmToken})`);

  const notificationPayload = {
    rideId: ride.id,
    type: 'new_ride_request',
    passengerId: ride.passengerId || '',
    passengerName: ride.passengerName || 'Passager',
    passengerPhone: ride.passengerPhone || ride.passenger_phone || '',
    pickupLat: pickupLat.toString(),
    pickupLng: pickupLng.toString(),
    destinationLat: destinationLat.toString(),
    destinationLng: destinationLng.toString(),
    pickupName,
    destinationName,
    distance: distance.toString(),
    duration: (ride.duration || 0).toString(),
    estimatedPrice: estimatedPrice.toString(),
    vehicleCategory: ride.vehicleCategory,
    distanceToPickup: (driver.distanceToPickup || 0).toFixed(1),
    notifiedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + MATCHING_TIMEOUT_MS).toISOString()
  };

  await kv.set(`driver_notification:${driver.id}`, notificationPayload);
  console.log(`📥 Notification KV écrite pour ${driver.full_name || driver.name}`);

  if (driver.fcmToken) {
    const result = await sendFCMNotification(driver.fcmToken, {
      title: 'SmartCabb - Nouvelle Course',
      body: `${pickupName} vers ${destinationName} - ${distance.toFixed(1)} km - ${Math.round(estimatedPrice)} FC`,
      data: notificationPayload
    });
    if (result.success) {
      console.log(`✅ FCM envoyé à ${driver.full_name || driver.name}`);
    } else {
      console.warn(`⚠️ Échec FCM pour ${driver.full_name || driver.name}`);
    }
  } else {
    console.warn(`⚠️ Pas de token FCM pour ${driver.full_name || driver.name}`);
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
    
    const passengerIdForBlock = rideData.passengerId || rideData.passenger_id;
    if (passengerIdForBlock) {
      const block = await isPassengerBlocked(passengerIdForBlock);
      if (block.blocked) {
        return c.json({
          success: false,
          error: "COMPTE_BLOQUE",
          message: `Votre compte est temporairement bloqué jusqu'au ${new Date(block.blockedUntil!).toLocaleString('fr-FR')} pour annulations répétées.`,
          blockedUntil: block.blockedUntil,
        }, 403);
      }
    }

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
// 🔍 GET /debug-drivers - DIAGNOSTIC endpoint (à placer AVANT GET /:id !)
// ============================================
app.get("/debug-drivers", async (c) => {
  try {
    const allDrivers = await kv.getByPrefix('driver:');
    
    const driversInfo = allDrivers.map((d: any) => ({
      id: d.id,
      name: d.full_name || d.name || '?',
      // Champs status
      status: d.status,           // approval status (pending/approved/rejected)
      isOnline: d.isOnline,       // ← le bon champ
      is_online: d.is_online,     // ← alias
      status_online: d.status_online, // ← ancien champ potentiel
      is_available: d.is_available,
      available: d.available,
      // FCM Token
      hasFcmToken: !!d.fcmToken,
      fcmTokenPreview: d.fcmToken ? d.fcmToken.substring(0, 20) + '...' : null,
      // Catégorie véhicule
      vehicleCategory: d.vehicleCategory,
      vehicle_category: d.vehicle_category,
      vehicle_type: d.vehicle_type,
      vehicleType: d.vehicleType,
      vehicleFromObj: d.vehicle?.category || d.vehicle?.type,
      // Solde
      balance: d.balance,
      creditBalance: d.creditBalance,
      // Éligibilité
      eligible: (d.isOnline === true || d.is_online === true || d.status_online === 'online') &&
                (d.available === true || d.is_available === true) &&
                !!d.fcmToken
    }));

    const onlineCount = driversInfo.filter((d: any) => d.isOnline || d.is_online).length;
    const eligibleCount = driversInfo.filter((d: any) => d.eligible).length;

    console.log(`🔍 [DEBUG] ${allDrivers.length} chauffeurs, ${onlineCount} en ligne, ${eligibleCount} éligibles`);

    return c.json({
      success: true,
      totalDrivers: allDrivers.length,
      onlineCount,
      eligibleCount,
      drivers: driversInfo
    });
  } catch (error) {
    console.error("❌ Erreur debug-drivers:", error);
    return c.json({ success: false, error: error.message }, 500);
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

    // ✅ SUIVI TEMPS RÉEL — joindre la dernière position connue du chauffeur
    let driverLocation: any = null;
    if (ride.driverId) {
      try {
        const driver = await kv.get<any>(`driver:${ride.driverId}`);
        const loc = driver?.currentLocation || driver?.current_location || driver?.location || null;
        if (loc && typeof loc.lat === 'number' && typeof loc.lng === 'number') {
          driverLocation = {
            lat: loc.lat,
            lng: loc.lng,
            updatedAt: loc.updatedAt || driver?.locationUpdatedAt || driver?.location_updated_at || null
          };
        }
      } catch (e) {
        console.error("⚠️ Erreur lecture position chauffeur:", e);
      }
    }

    return c.json({ success: true, ride: { ...ride, driverLocation } });
  } catch (error) {
    console.error("❌ Erreur récupération course:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

// ============================================
// GET /pending/:driverId - Courses en attente pour un chauffeur
// ============================================
app.get("/pending/:driverId", async (c) => {
  try {
    const driverId = c.req.param('driverId');
    
    // ✅ FIX PRINCIPAL: Chercher dans driver_notification (clé écrite par notifyDriverAtIndex)
    const notification = await kv.get<any>(`driver_notification:${driverId}`);
    
    if (notification?.rideId) {
      // Vérifier que la course est toujours en recherche (pas encore acceptée par un autre)
      const ride = await kv.get<any>(`ride:${notification.rideId}`);
      if (ride && ride.status === 'searching') {
        console.log(`📋 Notification de course trouvée pour ${driverId}: ${notification.rideId}`);
        return c.json({ success: true, ride: { ...ride, ...notification } });
      } else {
        // Course annulée ou prise — nettoyer
        await kv.delete(`driver_notification:${driverId}`);
        console.log(`🗑️ Notification expirée nettoyée pour ${driverId}`);
      }
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
      // ✅ FIX: isOnline correct + variable 'd' (pas 'driver')
      const isOnline = isDriverOnline(d);
      const isAvailable = isDriverAvailable(d);
      const hasPositiveBalance = (d.balance || d.creditBalance || 0) >= 0;
      
      // ✅ FIX: 'd' au lieu de 'driver' (évite ReferenceError)
      const driverCategory = d.vehicleCategory || 
                      d.vehicle_category || 
                      d.vehicle_type || 
                      d.vehicleType ||
                      d.vehicle?.category ||
                      d.vehicle?.type;
      
      const categoryMatch = categoriesCompatible(driverCategory, vehicleCategory);
      
      // Log détaillé pour debugging
      if (isOnline && isAvailable && hasPositiveBalance && !categoryMatch) {
        console.log(`⏭️ Driver ${d.full_name || d.name} online mais catégorie différente: ` +
          `${driverCategory} vs ${vehicleCategory}`);
      }
      
      return isOnline && isAvailable && hasPositiveBalance && categoryMatch;
    });
    
    // Compter tous les chauffeurs en ligne (toutes catégories)
    const allOnlineDrivers = allDrivers.filter((d: any) => 
      isDriverOnline(d) && (d.balance || d.creditBalance || 0) >= 0
    );
    
    const available = eligibleDrivers.length > 0;
    const driversCount = eligibleDrivers.length;
    const totalOnline = allOnlineDrivers.length;
    
    console.log(`✅ ${driversCount} chauffeurs disponibles pour ${vehicleCategory} (${totalOnline} total en ligne)`);
    
    // Si aucun chauffeur disponible pour cette catégorie, proposer des alternatives
    let alternatives = [];
    if (!available && totalOnline > 0) {
      const categories = ['smart_standard', 'smart_confort', 'smart_plus', 'smart_business'];
      alternatives = categories
        .filter(cat => cat !== vehicleCategory)
        .map(cat => {
          const count = allDrivers.filter((d: any) => {
            // ✅ FIX: isOnline correct + variable 'd'
            const isOnline = isDriverOnline(d);
            const isAvailable = isDriverAvailable(d);
            const hasPositiveBalance = (d.balance || d.creditBalance || 0) >= 0;
            
            const driverCategory = d.vehicleCategory || 
                      d.vehicle_category || 
                      d.vehicle_type || 
                      d.vehicleType ||
                      d.vehicle?.category ||
                      d.vehicle?.type;
            return isOnline && isAvailable && hasPositiveBalance && categoriesCompatible(driverCategory, cat);
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
      // ✅ FIX: isOnline correct + variable 'd'
      const isOnline = isDriverOnline(d);
      const isAvailable = isDriverAvailable(d);
      const hasPositiveBalance = (d.balance || d.creditBalance || 0) >= 0;
      
      const driverCategory = d.vehicleCategory || 
                      d.vehicle_category || 
                      d.vehicle_type || 
                      d.vehicleType ||
                      d.vehicle?.category ||
                      d.vehicle?.type;
      const categoryMatch = categoriesCompatible(driverCategory, ride.vehicleCategory);
      
      return isOnline && isAvailable && hasPositiveBalance && categoryMatch;
    });
    
    const available = eligibleDrivers.length > 0;
    
    // Si toujours pas de chauffeurs, proposer des alternatives
    let alternatives = [];
    if (!available) {
      const categories = ['smart_standard', 'smart_confort', 'smart_plus', 'smart_business'];
      alternatives = categories
        .filter(cat => cat !== ride.vehicleCategory)
        .map(cat => {
          const count = allDrivers.filter((d: any) => {
            // ✅ FIX: isOnline correct + variable 'd'
            const isOnline = isDriverOnline(d);
            const isAvailable = isDriverAvailable(d);
            const hasPositiveBalance = (d.balance || d.creditBalance || 0) >= 0;
            
            const driverCategory = d.vehicleCategory || 
                      d.vehicle_category || 
                      d.vehicle_type || 
                      d.vehicleType ||
                      d.vehicle?.category ||
                      d.vehicle?.type;
            return isOnline && isAvailable && hasPositiveBalance && categoriesCompatible(driverCategory, cat);
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
    'smart_standard': 'SmartCabb Standard',
    'smart_confort': 'SmartCabb Confort',
    'smart_plus': 'SmartCabb Familiale',
    'smart_business': 'SmartCabb Business',
    'economic': 'SmartCabb Standard',
    'comfort': 'SmartCabb Confort',
    'van': 'SmartCabb Familiale',
    'luxury': 'SmartCabb Business'
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

    // ✅ NOUVEAU: Vérifier le solde du conducteur AVANT d'accepter
    const driver = await kv.get<any>(`driver:${driverId}`);
    if (!driver) {
      return c.json({ success: false, error: "Conducteur non trouvé" }, 404);
    }

    const driverBalance = driver.accountBalance || driver.balance || driver.creditBalance || 0;
    const ridePrice = ride.estimatedPrice || 0;

    // ✅ Seuil basé sur le tarif de BASE de la catégorie (taux fixe 2 800 CDF/USD)
    // On N'utilise PAS le prix réel de la course — sinon une course chère bloquerait
    // un driver éligible. Ex: standard 4 000 CDF > seuil 2 520 CDF → accepté.
    const MIN_COMMISSION_BY_CATEGORY: Record<string, number> = {
      smart_standard:       Math.round(0.15 * 6   * 2800), // 2 520 CDF
      smart_standard_clim:  Math.round(0.15 * 6   * 2800), // 2 520 CDF
      smart_standard_no_clim: Math.round(0.15 * 7 * 2800), // 2 940 CDF
      smart_confort:  Math.round(0.15 * 10  * 2800), // 4 200 CDF
      smart_plus:     Math.round(0.15 * 12  * 2800), // 5 040 CDF
      smart_business: Math.round(0.15 * 160 * 2800), // 67 200 CDF
    };
    const rideCategory = ride.vehicleCategory || ride.vehicleType ||
                         driver.vehicleCategory || driver.vehicle?.category || 'smart_standard';
    const requiredBalance = MIN_COMMISSION_BY_CATEGORY[rideCategory] ??
                            Math.round(0.15 * 6 * 2800); // fallback standard

    console.log(`💰 Vérification solde conducteur ${driverName}:`, {
      solde: driverBalance,
      prix_course: ridePrice,
      categorie: rideCategory,
      seuil_minimum_categorie: requiredBalance,
    });

    if (driverBalance < requiredBalance) {
      console.warn(`⚠️ Solde insuffisant pour ${driverName}: ${driverBalance} CDF < ${requiredBalance} CDF (seuil 15% base ${rideCategory})`);

      // ✅ Désactiver automatiquement le statut en ligne
      driver.is_available = false;
      driver.isOnline = false;
      driver.status = 'offline';
      driver.updated_at = new Date().toISOString();
      await kv.set(`driver:${driverId}`, driver);

      console.log(`🔴 Conducteur ${driverName} mis hors ligne automatiquement (solde insuffisant)`);

      return c.json({
        success: false,
        error: "SOLDE_INSUFFISANT",
        message: `Solde insuffisant pour accepter cette course. Votre solde: ${driverBalance.toLocaleString()} CDF. Minimum requis pour la catégorie ${rideCategory}: ${requiredBalance.toLocaleString()} CDF (15% du tarif de base). Veuillez recharger votre crédit.`,
        balance: driverBalance,
        ridePrice: ridePrice,
        required: requiredBalance,
        threshold: 0.15
      }, 403);
    }

    ride.status = 'accepted';
    ride.driverId = driverId;
    ride.driver = { id: driverId, name: driverName, phone: driverPhone, vehicle: driverVehicle, rating: driverRating };
    ride.acceptedAt = new Date().toISOString();

    // ✅ Champs plats pour la compatibilité du polling passager
    ride.driverName  = driverName;
    ride.driverPhone = driverPhone;

    await kv.set(`ride:${rideId}`, ride);

    console.log(`✅ Course ${rideId} acceptée par ${driverName}`);

    // ✅ Lire la file d'attente AVANT de supprimer le matching
    const matchingData = await kv.get<any>(`matching:${rideId}`);

    // Arrêter le matching séquentiel
    await kv.delete(`matching:${rideId}`);

    // ✅ FIX: Nettoyer la notification KV du driver qui accepte
    await kv.delete(`driver_notification:${driverId}`);

    // ✅ FIX: Nettoyer TOUTES les notifications KV des drivers encore en file
    if (matchingData?.queue && Array.isArray(matchingData.queue)) {
      for (const qId of matchingData.queue) {
        if (qId !== driverId) {
          await kv.delete(`driver_notification:${qId}`);
          console.log(`🗑️ Notification KV nettoyée pour driver en attente: ${qId}`);
        }
      }
      console.log(`✅ ${matchingData.queue.length} notifications de file nettoyées`);
    }

    // Notifier les autres drivers de la même catégorie que la course est prise
    try {
      const allDrivers = await kv.getByPrefix('driver:');
      const otherDrivers = allDrivers.filter((d: any) => {
        // ✅ FIX: variable 'd' + isOnline correct
        const driverCategory = d.vehicleCategory || 
                       d.vehicle_category ||
                       d.vehicle_type || 
                       d.vehicleType ||
                       d.vehicle?.category ||
                       d.vehicle?.type;
        return d.id !== driverId &&
               isDriverOnline(d) &&
               categoriesCompatible(driverCategory, ride.vehicleCategory) &&
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

    await kv.delete(`driver_notification:${driverId}`);

    const ride = await kv.get<any>(`ride:${rideId}`);
    if (!ride) {
      return c.json({ success: false, error: "Course non trouvée" }, 404);
    }

    // Vérifier s'il reste des chauffeurs dans la file
    const matching = await kv.get<any>(`matching:${rideId}`);
    if (matching) {
      const remaining = (matching.queue || []).filter((id: string) => id !== driverId);
      if (remaining.length === 0) {
        console.warn(`⚠️ Tous les chauffeurs ont refusé la course ${rideId}`);
        if (ride.status === 'searching') {
          ride.status = 'no_driver_found';
          ride.noDriverFoundAt = new Date().toISOString();
          await kv.set(`ride:${rideId}`, ride);
        }
        await kv.delete(`matching:${rideId}`);
      } else {
        matching.queue = remaining;
        await kv.set(`matching:${rideId}`, matching);
      }
    }

    return c.json({ success: true });
  } catch (error) {
    console.error("❌ Erreur refus course:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

// ============================================
// POST /arrived - Conducteur arrivé au point de prise en charge
// ============================================
app.post("/arrived", async (c) => {
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

    if (ride.status !== 'accepted') {
      return c.json({ success: false, error: "La course n'est pas en statut accepté" }, 400);
    }

    // Marquer le conducteur comme arrivé
    ride.status = 'arrived';
    ride.driverArrivedAt = new Date().toISOString();

    await kv.set(`ride:${rideId}`, ride);

    console.log(`🚗 Conducteur arrivé pour course ${rideId} à ${ride.driverArrivedAt}`);

    // Notifier le passager
    try {
      const passenger = await kv.get<any>(`passenger:${ride.passengerId}`);
      if (passenger?.fcmToken) {
        await sendFCMNotification(passenger.fcmToken, {
          title: '🚗 Conducteur arrivé !',
          body: `${ride.driverName || 'Votre conducteur'} est arrivé au point de rendez-vous`,
          data: { rideId, type: 'driver_arrived', driverId }
        });
      }
    } catch (error) {
      console.error('❌ Erreur notification arrivée conducteur:', error);
    }

    return c.json({ success: true, ride });
  } catch (error) {
    console.error("❌ Erreur arrivée conducteur:", error);
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
    
    // Vérifier que la course n'est pas déjà terminée/annulée
    if (ride.status === 'completed' || ride.status === 'rated') {
      return c.json({ success: false, error: "Course déjà terminée" }, 400);
    }
    if (ride.status === 'cancelled') {
      return c.json({ success: false, error: "Course déjà annulée" }, 400);
    }
    // ✅ FIX BUG "Annulée" : bloquer l'annulation passager si la course est démarrée
    if (ride.status === 'in_progress' && cancelledBy === 'passenger') {
      return c.json({
        success: false,
        error: "Impossible d'annuler une course en cours de route. Contactez le support.",
      }, 400);
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

    // ─── Blocage automatique après 3 annulations successives ───────────────
    if (cancelledBy === 'passenger' && ride.passengerId) {
      const blockResult = await recordCancellationAndCheckBlock(ride.passengerId);
      if (blockResult.blocked) {
        console.log(`🔒 Passager ${ride.passengerId} bloqué jusqu'au ${blockResult.blockedUntil}`);
      }
    }

    // ─── Log événement annulation → panel admin ───────────────────────────
    await logAdminEvent('ride_cancelled', {
      rideId,
      passengerName: ride.passengerName || ride.passenger_name || 'Passager',
      driverName:    ride.driverName    || ride.driver_name    || null,
      pickup:        typeof ride.pickup === 'object' ? (ride.pickup?.name || ride.pickup?.address) : (ride.pickup || '—'),
      destination:   typeof ride.destination === 'object' ? (ride.destination?.name || ride.destination?.address) : (ride.destination || '—'),
      price:         ride.estimatedPrice || 0,
      category:      ride.vehicleCategory || ride.vehicleType || 'unknown',
      cancelledBy,
      cancelReason:  reason,
    });

    // ✅ FIX: Notifier tous les drivers - variable 'd' + isOnline correct
    try {
      const allDriversForCancel = await kv.getByPrefix('driver:');
      const categoryDrivers = allDriversForCancel.filter((d: any) => {
        const driverCategory = d.vehicleCategory || 
                         d.vehicle_category ||
                         d.vehicle_type || 
                         d.vehicleType ||
                         d.vehicle?.category ||
                         d.vehicle?.type;
        return isDriverOnline(d) && categoriesCompatible(driverCategory, ride.vehicleCategory) && d.fcmToken;
      });

      for (const d of categoryDrivers) {
        await sendFCMNotification(d.fcmToken, {
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
    const body = await c.req.json();
    const { rideId, endLocation } = body;
    // ✅ FIX : accepter actualCost OU totalCost OU finalPrice (multi-sources frontend)
    const actualCost: number | undefined =
      body.actualCost ?? body.totalCost ?? body.finalPrice ?? undefined;

    if (!rideId || typeof rideId !== 'string') {
      return c.json({ success: false, error: "ID course manquant" }, 400);
    }

    let ride = await kv.get<any>(`ride:${rideId}`);

    // ✅ FIX : si la course n'existe pas (ID généré côté DriverDashBoard), la créer
    if (!ride) {
      console.log(`⚠️ [RIDE-COMPLETE] Course ${rideId} introuvable → création automatique`);
      ride = {
        id: rideId,
        driverId: body.driverId || null,
        passengerId: body.passengerId || null,
        status: 'searching',
        estimatedPrice: actualCost || 0,
        createdAt: new Date().toISOString(),
        pickup: body.pickup || null,
        destination: body.destination || null,
        distance: body.distance || 0,
        vehicleType: body.vehicleType || 'smart_standard',
        passengerName: body.passengerName || '',
        passengerPhone: body.passengerPhone || '',
      };
    }

    // ✅ FIX : éviter le double incrément si la course est déjà 'completed'/'rated'
    const alreadyCompleted = ride.status === 'completed' || ride.status === 'rated';
    const effectiveDriverId = ride.driverId || body.driverId || null;

    if (effectiveDriverId && actualCost && !alreadyCompleted) {
      const driver = await kv.get<any>(`driver:${effectiveDriverId}`);
      if (driver) {
        // ✅ Commission depuis la config admin (taux + activé + minimum)
        const cs = await getCommissionSettings();
        let commission = 0;
        if (cs.enabled) {
          commission = Math.max(Math.round(actualCost * cs.rate / 100), cs.minimum);
        }
        const driverEarnings  = actualCost - commission;

        const newBalance = (driver.balance || 0) - commission;

        // ✅ FIX BUG SOLDE : Synchroniser balance ET creditBalance en même temps
        // (évite la dérive qui causait des recharges incorrectes)
        driver.balance         = newBalance;
        driver.creditBalance   = newBalance; // ← toujours identique à balance
        driver.earningsBalance = (driver.earningsBalance || 0) + driverEarnings;

        // ✅ incrémenter le compteur (une seule fois par course)
        const prevCount = driver.totalRides || driver.total_rides || 0;
        driver.totalRides  = prevCount + 1;
        driver.total_rides = prevCount + 1;

        // ✅ FIX AUTO-OFFLINE : forcer hors ligne si solde sous le seuil minimum
        // Seuil = 15% du tarif de base par catégorie (taux fixe 2 800 CDF/USD)
        const MIN_CREDITS_BY_CATEGORY: Record<string, number> = {
          smart_standard:       Math.round(0.15 * 6   * 2800), // 2 520 CDF
          smart_standard_clim:  Math.round(0.15 * 6   * 2800), // 2 520 CDF
          smart_standard_no_clim: Math.round(0.15 * 7 * 2800), // 2 940 CDF
          smart_confort:  Math.round(0.15 * 10  * 2800), // 4 200 CDF
          smart_plus:     Math.round(0.15 * 12  * 2800), // 5 040 CDF
          smart_business: Math.round(0.15 * 160 * 2800), // 67 200 CDF
        };
        const driverCategory = driver.vehicleCategory || driver.vehicle_category ||
                               driver.vehicle?.category || 'smart_standard';
        const minimumCredit  = MIN_CREDITS_BY_CATEGORY[driverCategory] ?? Math.round(0.15 * 6 * 2800);

        let forcedOffline = false;
        if (newBalance < minimumCredit) {
          driver.isOnline = false; driver.is_online = false;
          driver.is_available = false; driver.available = false;
          driver.status_online = 'offline';
          forcedOffline = true;
          console.log(`⚠️ [RIDE-COMPLETE] Driver ${effectiveDriverId} → HORS LIGNE ` +
            `(${newBalance.toFixed(0)} CDF < minimum ${minimumCredit} CDF)`);
        }

        await kv.set(`driver:${effectiveDriverId}`, driver);

        // Sync profil aussi
        const profile = await kv.get<any>(`profile:${effectiveDriverId}`);
        if (profile) {
          await kv.set(`profile:${effectiveDriverId}`, {
            ...profile, balance: newBalance, creditBalance: newBalance,
            ...(forcedOffline ? { isOnline: false, is_online: false, is_available: false, available: false } : {}),
          });
        }

        ride._driverForcedOffline = forcedOffline;
        ride._driverNewBalance    = newBalance;

        console.log(`💰 [RIDE-COMPLETE] Driver ${effectiveDriverId}:`);
        console.log(`   - Commission (${cs.enabled ? cs.rate + '%' : 'DÉSACTIVÉE'}): ${commission.toLocaleString('fr-FR')} CDF`);
        console.log(`   - Gains (${cs.enabled ? 100 - cs.rate + '%' : '100%'}): ${driverEarnings.toLocaleString('fr-FR')} CDF`);
        console.log(`   - Nouveau solde: ${newBalance.toLocaleString('fr-FR')} CDF`);
        console.log(`   - Forcé hors ligne: ${forcedOffline}`);
        console.log(`   - Total courses: ${driver.totalRides}`);
      }
    }

    if (!alreadyCompleted) {
      ride.status      = 'completed';
      ride.completedAt = new Date().toISOString();
      ride.totalPrice  = actualCost || ride.totalPrice || ride.estimatedPrice;
      ride.finalPrice  = ride.totalPrice; // Alias pour compatibilité frontend
    }
    if (endLocation)            ride.endLocation = endLocation;
    if (effectiveDriverId && !ride.driverId) ride.driverId = effectiveDriverId;

    await kv.set(`ride:${rideId}`, ride);

    // ─── Log événement complétion → panel admin ───────────────────────────
    if (!alreadyCompleted) {
      await logAdminEvent('ride_completed', {
        rideId,
        passengerName: ride.passengerName || ride.passenger_name || 'Passager',
        driverName:    ride.driverName    || ride.driver_name    || 'Conducteur',
        pickup:        typeof ride.pickup === 'object' ? (ride.pickup?.name || ride.pickup?.address) : (ride.pickup || '—'),
        destination:   typeof ride.destination === 'object' ? (ride.destination?.name || ride.destination?.address) : (ride.destination || '—'),
        price:         ride.totalPrice || ride.estimatedPrice || 0,
        category:      ride.vehicleCategory || ride.vehicleType || 'unknown',
      });
    }

    console.log(`✅ Course ${rideId} terminée (alreadyCompleted=${alreadyCompleted})`);

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
    const body = await c.req.json();
    const { driverId } = body;
    // ✅ FIX : accepter actualCost OU totalCost OU finalPrice
    const actualCost: number | undefined =
      body.actualCost ?? body.totalCost ?? body.finalPrice ?? undefined;

    if (!isValidUUID(rideId)) {
      return c.json({ success: false, error: "ID course invalide" }, 400);
    }
    const ride = await kv.get<any>(`ride:${rideId}`);
    if (!ride) {
      return c.json({ success: false, error: "Course non trouvée" }, 404);
    }

    // ✅ FIX : éviter le double incrément si la course est déjà 'completed'/'rated'
    const alreadyCompleted = ride.status === 'completed' || ride.status === 'rated';
    const effectiveDriverId = ride.driverId || driverId;

    if (effectiveDriverId && actualCost && !alreadyCompleted) {
      const driver = await kv.get<any>(`driver:${effectiveDriverId}`);
      if (driver) {
        // ✅ Commission depuis la config admin (taux + activé + minimum)
        const cs = await getCommissionSettings();
        let commission = 0;
        if (cs.enabled) {
          commission = Math.max(Math.round(actualCost * cs.rate / 100), cs.minimum);
        }
        const driverEarnings  = actualCost - commission;

        const newBalance = (driver.balance || 0) - commission;

        // ✅ FIX BUG SOLDE : Synchroniser balance ET creditBalance
        driver.balance         = newBalance;
        driver.creditBalance   = newBalance; // ← toujours identique
        driver.earningsBalance = (driver.earningsBalance || 0) + driverEarnings;

        const prevCount = driver.totalRides || driver.total_rides || 0;
        driver.totalRides  = prevCount + 1;
        driver.total_rides = prevCount + 1;

        // ✅ FIX AUTO-OFFLINE — seuil = 15% du tarif de base par catégorie (taux 2 800 CDF/USD)
        const MIN_CREDITS_BY_CATEGORY: Record<string, number> = {
          smart_standard:       Math.round(0.15 * 6   * 2800), // 2 520 CDF
          smart_standard_clim:  Math.round(0.15 * 6   * 2800), // 2 520 CDF
          smart_standard_no_clim: Math.round(0.15 * 7 * 2800), // 2 940 CDF
          smart_confort:  Math.round(0.15 * 10  * 2800), // 4 200 CDF
          smart_plus:     Math.round(0.15 * 12  * 2800), // 5 040 CDF
          smart_business: Math.round(0.15 * 160 * 2800), // 67 200 CDF
        };
        const driverCategory = driver.vehicleCategory || driver.vehicle_category ||
                               driver.vehicle?.category || 'smart_standard';
        const minimumCredit  = MIN_CREDITS_BY_CATEGORY[driverCategory] ?? 5000;

        let forcedOffline = false;
        if (newBalance < minimumCredit) {
          driver.isOnline = false; driver.is_online = false;
          driver.is_available = false; driver.available = false;
          driver.status_online = 'offline';
          forcedOffline = true;
          console.log(`⚠️ [RIDE-COMPLETE-ALT] Driver ${effectiveDriverId} → HORS LIGNE ` +
            `(${newBalance.toFixed(0)} CDF < minimum ${minimumCredit} CDF)`);
        }

        await kv.set(`driver:${effectiveDriverId}`, driver);

        // Sync profil aussi
        const profile = await kv.get<any>(`profile:${effectiveDriverId}`);
        if (profile) {
          await kv.set(`profile:${effectiveDriverId}`, {
            ...profile, balance: newBalance, creditBalance: newBalance,
            ...(forcedOffline ? { isOnline: false, is_online: false, is_available: false, available: false } : {}),
          });
        }

        ride._driverForcedOffline = forcedOffline;
        ride._driverNewBalance    = newBalance;
        console.log(`💰 [RIDE-COMPLETE-ALT] Driver ${effectiveDriverId} — Solde: ${newBalance.toFixed(0)}, Hors ligne: ${forcedOffline}, Total: ${driver.totalRides}`);
      }
    }

    if (!alreadyCompleted) {
      ride.status      = 'completed';
      ride.completedAt = new Date().toISOString();
      ride.totalPrice  = actualCost || ride.totalPrice || ride.estimatedPrice;
      ride.finalPrice  = ride.totalPrice; // Alias pour compatibilité frontend
    }
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
    
    const cs = await getCommissionSettings();
    const effectiveRate = cs.enabled ? cs.rate : 0;
    const totalEarnings = filteredRides.reduce((sum: number, r: any) => 
      sum + (r.totalPrice || r.estimatedPrice || 0), 0
    );
    const commission = Math.round(totalEarnings * effectiveRate / 100);
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

// ============================================
// ✅ NOUVEAU : GET /history/:passengerId — Historique des courses d'un passager
// ============================================
app.get("/history/:passengerId", async (c) => {
  try {
    const passengerId = c.req.param('passengerId');
    console.log(`📋 [RIDES/HISTORY-PASSENGER] Chargement pour passager: ${passengerId}`);

    const allRides = await kv.getByPrefix('ride:');

    // Filtrer les courses du passager (terminées + annulées)
    const passengerRides = allRides.filter((r: any) =>
      r.passengerId === passengerId &&
      (r.status === 'completed' || r.status === 'cancelled' || r.status === 'rated')
    );

    // Trier par date décroissante
    passengerRides.sort((a: any, b: any) => {
      const dateA = new Date(a.completedAt || a.cancelledAt || a.createdAt || 0).getTime();
      const dateB = new Date(b.completedAt || b.cancelledAt || b.createdAt || 0).getTime();
      return dateB - dateA;
    });

    console.log(`✅ [RIDES/HISTORY-PASSENGER] ${passengerRides.length} course(s) trouvée(s)`);

    return c.json({
      success: true,
      rides: passengerRides,
      count: passengerRides.length
    });
  } catch (error) {
    console.error("❌ [RIDES/HISTORY-PASSENGER] Erreur:", error);
    return c.json({ success: false, error: "Erreur serveur", rides: [] }, 500);
  }
});

// ============================================
// ✅ NOUVEAU : GET /driver/:driverId/rides — Historique des courses d'un conducteur
// ============================================
app.get("/driver/:driverId/rides", async (c) => {
  try {
    const driverId = c.req.param('driverId');
    console.log(`📋 [RIDES/HISTORY-DRIVER] Chargement pour conducteur: ${driverId}`);

    const allRides = await kv.getByPrefix('ride:');

    // Filtrer les courses du conducteur
    const driverRidesRaw = allRides.filter((r: any) =>
      r.driverId === driverId &&
      (r.status === 'completed' || r.status === 'cancelled' || r.status === 'rated' || r.status === 'in_progress')
    );

    // ✅ FIX BUG "Annulée" : si la course a un startedAt, elle est considérée comme terminée
    // (le driver a physiquement transporté le passager, même si le statut KV est incorrect)
    const driverRides = driverRidesRaw.map((r: any) => {
      if (r.status === 'cancelled' && r.startedAt) {
        return { ...r, status: 'completed', _fixedFromCancelled: true };
      }
      return r;
    });

    // Trier par date décroissante
    driverRides.sort((a: any, b: any) => {
      const dateA = new Date(a.completedAt || a.startedAt || a.cancelledAt || a.createdAt || 0).getTime();
      const dateB = new Date(b.completedAt || b.startedAt || b.cancelledAt || b.createdAt || 0).getTime();
      return dateB - dateA;
    });

    // Calculer les stats (on inclut les courses avec startedAt même si cancelled)
    const completedRides = driverRides.filter((r: any) => r.status === 'completed' || r.status === 'rated');
    const now = new Date();
    const todayStart  = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart   = new Date(now.getTime() - 7  * 24 * 60 * 60 * 1000);
    const monthStart  = new Date(now.getFullYear(), now.getMonth(), 1);

    const sumPrice = (rides: any[]) => rides.reduce((s: number, r: any) => s + (r.totalPrice || r.actualPrice || r.estimatedPrice || 0), 0);

    const todayRides = completedRides.filter((r: any) => new Date(r.completedAt || r.createdAt) >= todayStart);
    const weekRides  = completedRides.filter((r: any) => new Date(r.completedAt || r.createdAt) >= weekStart);
    const monthRides = completedRides.filter((r: any) => new Date(r.completedAt || r.createdAt) >= monthStart);

    const cs = await getCommissionSettings();
    const effRate = cs.enabled ? cs.rate : 0;
    const stats = {
      today:  { count: todayRides.length,  earnings: Math.round(sumPrice(todayRides)  * (1 - effRate / 100)) },
      week:   { count: weekRides.length,   earnings: Math.round(sumPrice(weekRides)   * (1 - effRate / 100)) },
      month:  { count: monthRides.length,  earnings: Math.round(sumPrice(monthRides)  * (1 - effRate / 100)) },
      total:  { count: completedRides.length, earnings: Math.round(sumPrice(completedRides) * (1 - effRate / 100)) },
    };

    console.log(`✅ [RIDES/HISTORY-DRIVER] ${driverRides.length} course(s), stats:`, stats);

    return c.json({
      success: true,
      rides: driverRides,
      count: driverRides.length,
      stats
    });
  } catch (error) {
    console.error("❌ [RIDES/HISTORY-DRIVER] Erreur:", error);
    return c.json({ success: false, error: "Erreur serveur", rides: [], stats: {} }, 500);
  }
});

// ============================================
// ✅ NOUVEAU : POST /rate — Évaluer un conducteur après course
// ============================================
app.post("/rate", async (c) => {
  try {
    const { rideId, driverId, passengerId, rating, comment, tags } = await c.req.json();

    if (!rideId || !driverId || !rating) {
      return c.json({ success: false, error: "rideId, driverId et rating requis" }, 400);
    }

    const ride = await kv.get<any>(`ride:${rideId}`);
    if (!ride) {
      return c.json({ success: false, error: "Course non trouvée" }, 404);
    }

    // Mettre à jour la course avec la note
    ride.passengerRating  = rating;
    ride.passengerComment = comment || '';
    ride.passengerRatingTags = tags || [];
    ride.ratedAt          = new Date().toISOString();
    ride.status           = 'rated';
    await kv.set(`ride:${rideId}`, ride);

    // ✅ Mettre à jour la note moyenne du conducteur
    const driver = await kvGet(`driver:${driverId}`);
    if (driver) {
      // rating=0 = valeur initiale "pas encore noté", on se base sur ratedRidesCount
      const currentRideCount = driver.ratedRidesCount || driver.rating_count || 0;
      const currentRating    = currentRideCount > 0 ? (Number(driver.rating) || 0) : 0;
      const newRideCount     = currentRideCount + 1;
      const newRating        = (currentRating * currentRideCount + Number(rating)) / newRideCount;

      driver.rating          = Math.round(newRating * 10) / 10; // arrondi à 1 décimale
      driver.ratedRidesCount = newRideCount;
      driver.rating_count    = newRideCount; // compatibilité champ legacy
      await kvSet(`driver:${driverId}`, driver);

      console.log(`⭐ [RIDES/RATE] Driver ${driverId}: note ${driver.rating} (${newRideCount} évaluation(s)), soumis: ${rating}`);
    }

    return c.json({ success: true });
  } catch (error) {
    console.error("❌ [RIDES/RATE] Erreur:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

// ============================================
// POST /process-scheduled - Convertir les réservations programmées en courses réelles
// ============================================
app.post("/process-scheduled", async (c) => {
  const cronSecret = c.req.header("x-cron-secret");
  const expectedSecret = Deno.env.get("CRON_SECRET") || "smartcabb-cron-2026";
  if (cronSecret !== expectedSecret) {
    console.warn("Tentative d acces non autorise a /process-scheduled");
    return c.json({ success: false, error: "Unauthorized" }, 401);
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const bufferMinutes = parseInt(Deno.env.get("SCHEDULED_RIDE_BUFFER_MINUTES") || "5");
    const futureTime = new Date(now.getTime() + bufferMinutes * 60000);
    const futureTimeStr = futureTime.toTimeString().slice(0, 5);

    const { data: scheduledRides, error } = await supabase
      .from("scheduled_rides")
      .select("*")
      .eq("status", "scheduled")
      .lte("scheduled_date", today);

    if (error) {
      console.error("Erreur requete scheduled_rides:", error);
      return c.json({ success: false, error: error.message }, 500);
    }

    if (!scheduledRides || scheduledRides.length === 0) {
      return c.json({ success: true, processed: 0, message: "Aucune course programmee a traiter" });
    }

    const dueRides = scheduledRides.filter((r) => {
      if (r.scheduled_date < today) return true;
      return r.scheduled_time <= futureTimeStr;
    });

    console.log(`📋 ${dueRides.length}/${scheduledRides.length} courses programmees a traiter`);

    const results = [];

    for (const sr of dueRides) {
      try {
        const passengerProfile = await kvGet(`passenger:${sr.user_id}`);
        const passengerName = passengerProfile?.full_name || passengerProfile?.name || "Passager";
        const passengerPhone = passengerProfile?.phone || passengerProfile?.phone_number || "";

        const rideId = crypto.randomUUID();
        const ride = {
          id: rideId,
          passengerId: sr.user_id,
          passengerName,
          passengerPhone,
          pickup: {
            name: sr.pickup_address,
            address: sr.pickup_address,
            coordinates: { lat: sr.pickup_lat, lng: sr.pickup_lng }
          },
          destination: {
            name: sr.dropoff_address,
            address: sr.dropoff_address,
            coordinates: { lat: sr.dropoff_lat, lng: sr.dropoff_lng }
          },
          vehicleCategory: sr.category,
          estimatedPrice: sr.estimated_price,
          distance: 0,
          duration: 0,
          pickupAddress: sr.pickup_address,
          destinationAddress: sr.dropoff_address,
          status: "searching",
          createdAt: new Date().toISOString(),
          isScheduled: true,
          scheduledDate: sr.scheduled_date,
          scheduledTime: sr.scheduled_time,
          passengerCount: 1
        };

        await kv.set(`ride:${rideId}`, ride);
        console.log(`Course programmee creee: ${rideId}`);

        const matchingResult = await findAndNotifyNearbyDrivers(ride);

        const { error: updateError } = await supabase
          .from("scheduled_rides")
          .update({ status: "completed" })
          .eq("id", sr.id);

        if (updateError) {
          console.error(`Erreur mise a jour scheduled_ride ${sr.id}:`, updateError);
        }

        // Tentative notification FCM passager
        try {
          const fcmTokenData = await kvGet(`fcm_token_${sr.user_id}`);
          if (fcmTokenData) {
            const token = typeof fcmTokenData === "string" ? fcmTokenData : fcmTokenData.token;
            if (token) {
              await sendFCMNotification(token, {
                title: "SmartCabb - Course programmee",
                body: `Votre course ${sr.pickup_address} vers ${sr.dropoff_address} est en cours de traitement. Un chauffeur arrive bientot.`,
                data: { rideId, type: "scheduled_ride_processing" }
              });
            }
          }
        } catch (fcmErr) {
          console.warn(`Notification FCM passager echouee pour ${sr.user_id}:`, fcmErr);
        }

        results.push({
          scheduledRideId: sr.id,
          rideId,
          matching: matchingResult.success ? "success" : "no_driver"
        });

      } catch (innerError) {
        console.error(`Erreur traitement course programmee ${sr.id}:`, innerError);
        results.push({ scheduledRideId: sr.id, error: innerError.message });
      }
    }

    return c.json({ success: true, processed: results.length, results });

  } catch (error) {
    console.error("Erreur process-scheduled:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default app;
