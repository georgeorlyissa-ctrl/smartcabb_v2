import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendFCMNotification } from "./firebase-admin.ts";
import { creditLoyaltyForRide } from "./loyalty-routes.ts";
import { sendSosAlertSms } from "./sos-sms.ts";
import {
  loadDriversLite,
  purgeBogusRecoveredDrivers,
  readDriverLiveLite,
  readDriverPosition,
  rebuildAllDriverRecords,
  rebuildDriverRecord,
} from "./driver-records.ts";

const app = new Hono();

// ─── Helpers "en ligne" & "disponible" — compatibilité ancien + nouveau format ──
function isDriverOnline(d: any): boolean {
  // Priorite aux booleens explicites : un chauffeur force hors ligne
  // (solde insuffisant) garde parfois status_online='online' obsolete.
  if (typeof d.isOnline === 'boolean') return d.isOnline;
  if (typeof d.is_online === 'boolean') return d.is_online;
  return d.status_online === 'online' || d.status === 'online';
}
function isDriverAvailable(d: any): boolean {
  if (typeof d.is_available === 'boolean' || typeof d.available === 'boolean') {
    return d.is_available === true || d.available === true;
  }
  return d.status_online === 'online' || d.status === 'online';
}
// Chauffeur deja affecte a une course : ne doit plus recevoir de propositions.
function driverHasActiveRide(d: any, rideId?: string): boolean {
  const active = d?.activeRideId || d?.active_ride_id || d?.currentRideId || d?.current_ride_id;
  if (!active) return false;
  return !rideId || active !== rideId;
}

// ─── Verrous de course : detection des verrous obsletes ─────────────────────
// Un chauffeur dont `activeRideId` pointe vers une course terminee/annulee
// (ou inexistante) restait `is_available = false` POUR TOUJOURS : il ne
// recevait plus aucune proposition. On considere ces verrous comme obsletes.
const ACTIVE_RIDE_STATUSES = [
  'searching', 'pending', 'accepted', 'enroute', 'arrived', 'waiting', 'in_progress',
];

function isActiveRideStatus(status?: string | null): boolean {
  return typeof status === 'string' && ACTIVE_RIDE_STATUSES.includes(status);
}

function readDriverActiveRideId(driver: any): string | null {
  const id = driver?.activeRideId || driver?.active_ride_id ||
             driver?.currentRideId || driver?.current_ride_id;
  return id ? String(id) : null;
}

/** Ensemble des identifiants de courses encore reellement en cours. */
async function loadActiveRideIdSet(): Promise<Set<string>> {
  const set = new Set<string>();
  try {
    const rides = await kv.getByPrefix('ride:');
    for (const ride of rides) {
      if (ride?.id && isActiveRideStatus(ride.status)) set.add(String(ride.id));
    }
  } catch (e) {
    console.error('[RIDE-LOCK] Lecture des courses impossible:', e);
  }
  return set;
}

/**
 * Libere le verrou d'un chauffeur si sa course n'est plus active.
 * Retourne true si le chauffeur a ete repare.
 */
async function releaseStaleDriverLock(driverId: string | null | undefined): Promise<boolean> {
  if (!driverId) return false;
  try {
    const driver = await kv.get<any>(`driver:${driverId}`);
    if (!driver) return false;
    const activeId = readDriverActiveRideId(driver);
    if (!activeId) return false;

    const ride = await kv.get<any>(`ride:${activeId}`);
    if (ride && isActiveRideStatus(ride.status)) return false;

    const online = isDriverOnline(driver);
    const now = new Date().toISOString();
    delete driver.activeRideId;
    delete driver.active_ride_id;
    delete driver.currentRideId;
    delete driver.current_ride_id;
    driver.is_available = online;
    driver.available = online;
    driver.updated_at = now;
    await kv.set(`driver:${driverId}`, driver);

    const profile = await kv.get<any>(`profile:${driverId}`);
    if (profile) {
      await kv.set(`profile:${driverId}`, {
        ...profile,
        is_available: online,
        available: online,
        activeRideId: null,
        updated_at: now,
      });
    }
    console.log(`[RIDE-LOCK] Verrou obsolete libere pour ${driverId} (course ${activeId}, dispo=${online})`);
    return true;
  } catch (e) {
    console.error('[RIDE-LOCK] Liberation impossible:', e);
    return false;
  }
}
/**
 * État réel du verrou d'un chauffeur, par **lecture ciblée** de sa course.
 * - `busy`  : la course pointée est encore active → le chauffeur roule.
 * - `stale` : la course pointée n'existe plus ou est terminée/annulée.
 */
async function readDriverLockState(driver: any): Promise<{ busy: boolean; stale: boolean }> {
  const activeId = readDriverActiveRideId(driver);
  if (!activeId) return { busy: false, stale: false };
  try {
    const ride = await kv.get<any>(`ride:${activeId}`);
    if (ride && isActiveRideStatus(ride.status)) return { busy: true, stale: false };
    return { busy: false, stale: true };
  } catch {
    // Lecture impossible : on ne bloque pas le chauffeur pour autant.
    return { busy: false, stale: false };
  }
}

/**
 * Répare les verrous obsolètes d'une liste de chauffeurs déjà chargée.
 * Les objets passés sont corrigés **en mémoire** (pour le filtrage qui suit) ;
 * la persistance relit la fiche COMPLÈTE par id (`releaseStaleDriverLock`) :
 * la liste peut être « allégée » (sans photo) et ne doit jamais être réécrite
 * telle quelle dans le KV. Retourne le nombre de chauffeurs réparés.
 */
async function repairStaleLocksInList(drivers: any[]): Promise<number> {
  let repaired = 0;
  try {
    const states = await Promise.all(
      drivers.map(async (driver) => ({ driver, ...(await readDriverLockState(driver)) })),
    );

    const toPersist: string[] = [];
    for (const { driver, stale } of states) {
      if (!stale) continue;

      const online = isDriverOnline(driver);
      delete driver.activeRideId;
      delete driver.active_ride_id;
      delete driver.currentRideId;
      delete driver.current_ride_id;
      driver.is_available = online;
      driver.available = online;

      if (driver.id) toPersist.push(String(driver.id));
      repaired += 1;
    }
    await Promise.allSettled(toPersist.map((id) => releaseStaleDriverLock(id)));
    if (repaired > 0) {
      console.log(`[RIDE-LOCK] ${repaired} verrou(s) obsolète(s) réparé(s) à la volée`);
    }
  } catch (e) {
    console.error('[RIDE-LOCK] Réparation de liste impossible:', e);
  }
  return repaired;
}

/**
 * Libere un chauffeur apres cloture/annulation d'une course :
 * efface activeRideId et remet la disponibilite UNIQUEMENT s'il est en ligne
 * et qu'il ne roule pas sur une autre course.
 */
async function releaseDriverAfterRide(driverId: string | null | undefined, rideId: string) {
  if (!driverId) return;
  try {
    const driver = await kv.get<any>(`driver:${driverId}`);
    if (!driver) return;
    const active = driver.activeRideId || driver.active_ride_id || driver.currentRideId || driver.current_ride_id;
    if (active && active !== rideId) {
      console.log(`[RELEASE] Driver ${driverId} roule encore sur ${active} -> disponibilite inchangee`);
      return;
    }
    const online = isDriverOnline(driver);
    driver.is_available = online;
    driver.available = online;
    delete driver.activeRideId;
    delete driver.active_ride_id;
    delete driver.currentRideId;
    delete driver.current_ride_id;
    driver.updated_at = new Date().toISOString();
    await kv.set(`driver:${driverId}`, driver);
    const profile = await kv.get<any>(`profile:${driverId}`);
    if (profile) {
      await kv.set(`profile:${driverId}`, {
        ...profile,
        is_available: online,
        available: online,
        updated_at: driver.updated_at,
      });
    }
    console.log(`[RELEASE] Driver ${driverId} libere apres course ${rideId} (dispo=${online})`);
  } catch (e) {
    console.error('[RELEASE] Erreur liberation chauffeur:', e);
  }
}

// ✅ Catégories Standard — 🚦 la variante « sans clim » est EN PAUSE (28/10/2026) :
//  - 'smart_standard_no_clim' est fusionnée dans 'smart_standard' : les chauffeurs
//    « sans clim » roulent désormais avec les Standard, et une éventuelle course
//    no_clim résiduelle retombe sur le même pool.
//  - 'smart_standard' (legacy) == 'smart_standard_clim' : le produit historique
//    "SmartCabb STANDARD". Le legacy est normalisé → clim pour que les anciennes
//    courses et anciens chauffeurs matchent le même pool.
// Compatibilité STRICTE après normalisation.
function normalizeCategory(cat: string | undefined): string | undefined {
  if (!cat) return undefined;
  if (cat === 'smart_standard') return 'smart_standard_clim';
  if (cat === 'smart_standard_no_clim') return 'smart_standard_clim';
  return cat;
}
function categoriesCompatible(a: string | undefined, b: string | undefined): boolean {
  const na = normalizeCategory(a);
  const nb = normalizeCategory(b);
  if (!na || !nb) return false;
  // Compatibilité stricte après normalisation (toutes les variantes Standard
  // sont ramenées au même pool tant que « sans clim » est en pause)
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
// 35 s : la carte de course côté conducteur reste 30 s ouverte, il faut une
// marge pour qu'il puisse accepter (30 s exactement = course expirée au moment
// où il appuie).
const MATCHING_TIMEOUT_MS = 35000;
/** Au-delà de ce délai, une recherche encore « searching » est considérée sans chauffeur. */
const SEARCH_STALE_MS = 45_000;

async function findAndNotifyNearbyDrivers(ride: any) {
  try {
    console.log(`🔍 Recherche de chauffeurs pour la course ${ride.id}`);

    // Lecture ALLÉGÉE (sans photos base64 : ~5 Mo → quelques Ko) et fraîche.
    const allDrivers = await loadDriversLite();
    console.log(`👥 Total chauffeurs dans la base: ${allDrivers.length}`);

    // ✅ Verrous obsolètes : un chauffeur dont `activeRideId` pointe une course
    // terminée/annulée restait indisponible pour toujours (2e course sans
    // notification). On valide chaque verrou par une lecture **ciblée** de sa
    // course (pas de scan complet de toutes les courses : trop coûteux).
    const lockStates = await Promise.all(
      allDrivers.map(async (driver: any) => {
        const { busy, stale } = await readDriverLockState(driver);
        return { driver, busy, stale };
      }),
    );
    const staleLockDriverIds = lockStates
      .filter((s) => s.stale && s.driver.id)
      .map((s) => s.driver.id);

    const eligibleDrivers = lockStates
      .filter(({ driver, busy, stale }) => {
        const isOnline = isDriverOnline(driver);
        const driverCategory = driver.vehicleCategory ||
                         driver.vehicle_category ||
                         driver.vehicle_type ||
                         driver.vehicleType ||
                         driver.vehicle?.category ||
                         driver.vehicle?.type;
        const categoryMatch = categoriesCompatible(driverCategory, ride.vehicleCategory);

        // Un verrou obsolète ne doit pas bloquer la disponibilité.
        const isAvailable = stale ? isOnline : isDriverAvailable(driver);

        // Catégorie compatible + en ligne + disponible + pas déjà en course
        return isOnline && isAvailable && !busy && categoryMatch;
      })
      .map(({ driver }) => driver);

    // Réparation silencieuse des chauffeurs débloqués.
    if (staleLockDriverIds.length > 0) {
      console.log(`🧹 ${staleLockDriverIds.length} verrou(s) de course obsolète(s) → réparation`);
      await Promise.allSettled(staleLockDriverIds.map((id) => releaseStaleDriverLock(id)));
    }

    if (eligibleDrivers.length === 0) {
      console.warn(`⚠️ Aucun chauffeur éligible pour ${ride.vehicleCategory}`);
      allDrivers.forEach((d: any) => {
        console.log(`  Driver ${d.full_name || d.name}: isOnline=${isDriverOnline(d)}, isAvailable=${isDriverAvailable(d)}, cat=${d.vehicleCategory||d.vehicle_category||d.vehicle?.category}, fcm=${!!d.fcmToken}`);
      });

      // ⛔ Personne n'a été notifié : la course ne peut pas être servie. Sans
      // cette clôture immédiate, elle restait `searching` POUR TOUJOURS (aucun
      // timeout n'était programmé) et pouvait être acceptée plus tard par un
      // chauffeur qui venait de terminer sa course — alors que le passager
      // avait déjà quitté l'écran (course orpheline).
      ride.status = 'no_driver_found';
      ride.noDriverFoundAt = new Date().toISOString();
      await kv.set(`ride:${ride.id}`, ride).catch(() => undefined);
      await kv.delete(`matching:${ride.id}`).catch(() => undefined);

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
      try {
        const currentRide = await kv.get<any>(`ride:${ride.id}`);
        // ⚠️ Ne jamais écraser une course acceptée entre-temps : un chauffeur
        // a peut-être validé la course pendant cette fenêtre.
        if (!currentRide || currentRide.status !== 'searching' || currentRide.driverId) return;

        // 🔒 Anti-course avec l'acceptation : si un chauffeur notifié a déjà
        // verrouillé cette course, c'est qu'il l'a acceptée. On restaure la
        // course au lieu de la marquer « sans chauffeur » (sinon il restait
        // bloqué « en course » sur une course fantôme).
        for (const candidate of nearbyDrivers) {
          const freshDriver = await kv.get<any>(`driver:${candidate.id}`);
          if (readDriverActiveRideId(freshDriver) !== ride.id) continue;

          console.warn(`🔒 [MATCHING] Course ${ride.id} acceptée par ${candidate.id} pendant le timeout → restauration`);
          const acceptedRide = await kv.get<any>(`ride:${ride.id}`);
          if (acceptedRide) {
            acceptedRide.status = 'accepted';
            acceptedRide.driverId = candidate.id;
            acceptedRide.driverName = freshDriver.full_name || freshDriver.name || acceptedRide.driverName;
            acceptedRide.driverPhone = freshDriver.phone || acceptedRide.driverPhone;
            acceptedRide.acceptedAt = acceptedRide.acceptedAt || new Date().toISOString();
            await kv.set(`ride:${ride.id}`, acceptedRide);
          }
          await kv.delete(`matching:${ride.id}`);
          return;
        }

        console.warn(`⏰ Timeout de ${MATCHING_TIMEOUT_MS/1000}s pour la course ${ride.id}`);
        currentRide.status = 'no_driver_found';
        currentRide.noDriverFoundAt = new Date().toISOString();
        await kv.set(`ride:${ride.id}`, currentRide);

        // Nettoyer toutes les notifications
        for (const d of nearbyDrivers) {
          await kv.delete(`driver_notification:${d.id}`);
        }
        await kv.delete(`matching:${ride.id}`);

        // ✅ Sécurité : libérer tout chauffeur dont le verrou pointe encore
        // cette course (évite un chauffeur bloqué « en course » à vie).
        await Promise.allSettled(nearbyDrivers.map((d) => releaseStaleDriverLock(d.id)));
      } catch (e) {
        console.error('❌ Erreur timeout matching:', e);
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

    // 🆔 Idempotence : le client envoie un identifiant de tentative. Un second
    // appel (réseau lent, bouton pressé deux fois, réessai automatique) renvoie
    // la MÊME course au lieu d'en créer une deuxième.
    const clientRequestId = typeof rideData.clientRequestId === "string"
      ? rideData.clientRequestId.trim().slice(0, 80)
      : "";
    if (clientRequestId) {
      try {
        const existingId = await kvGet(`ride_req:${clientRequestId}`);
        if (existingId && typeof existingId === "string") {
          const existingRide = await kvGet(`ride:${existingId}`);
          if (existingRide) {
            console.log(`♻️ [RIDES/CREATE] Requête ${clientRequestId} déjà traitée → course ${existingId}`);
            return c.json({
              success: true,
              rideId: existingId,
              ride: existingRide,
              matching: { success: true, idempotent: true, driversNotified: 0 },
            });
          }
        }
      } catch (e) {
        console.warn("⚠️ [RIDES/CREATE] Vérification d'idempotence impossible:", e);
      }
    }
    
    const passengerIdForBlock = rideData.passengerId || rideData.passenger_id;
    if (passengerIdForBlock) {
      const block = await isPassengerBlocked(passengerIdForBlock);
      if (block.blocked) {
        const until = new Date(block.blockedUntil!).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        return c.json({
          success: false,
          error: "COMPTE_BLOQUE",
          message: `Votre compte a été temporairement suspendu suite à plusieurs annulations successives. Vous pourrez commander à nouveau après le ${until}. Merci de votre compréhension.`,
          blockedUntil: block.blockedUntil,
        }, 403);
      }
    }

    const rideId = crypto.randomUUID();

    // ─── Fidélité : appliquer remise si code fourni ─────────────────────
    let loyaltyDiscount = 0;
    let loyaltyLabel: string | null = null;
    const loyaltyRedeemCode = rideData.loyaltyRedeemCode || rideData.loyaltyCode || null;
    if (loyaltyRedeemCode) {
      const redeem = await kvGet(`loyalty_redeem:${loyaltyRedeemCode}`);
      if (!redeem || redeem.used || redeem.passengerId !== passengerIdForBlock) {
        return c.json({ success: false, error: "Code fidélité invalide ou déjà utilisé" }, 400);
      }
      const originalPrice = Number(rideData.estimatedPrice) || 0;
      if (redeem.discountRate) {
        loyaltyDiscount = Math.min(Math.round(originalPrice * redeem.discountRate), redeem.cap);
      } else {
        loyaltyDiscount = Math.min(originalPrice, redeem.cap);
      }
      loyaltyLabel = redeem.label;
      redeem.used = true;
      redeem.usedAt = new Date().toISOString();
      redeem.rideId = rideId;
      await kvSet(`loyalty_redeem:${loyaltyRedeemCode}`, redeem);
    }
    
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
      createdAt: new Date().toISOString(),
      ...(loyaltyDiscount > 0 ? {
        originalPrice: rideData.estimatedPrice,
        estimatedPrice: Math.max(0, Number(rideData.estimatedPrice) - loyaltyDiscount),
        loyaltyDiscount,
        loyaltyLabel,
        paidWithPoints: true,
        loyaltyRedeemCode,
      } : {}),
    };
    
    // 💾 Écriture RETENTÉE : sans cela, une microcoupure KV renvoyait une 500
    // et le passager voyait « service indisponible » sans qu'aucune course
    // n'existe côté serveur (aucune notification possible ensuite).
    let persisted = false;
    let lastWriteError = "";
    for (const delay of [0, 250, 800]) {
      if (delay) await new Promise((r) => setTimeout(r, delay));
      try {
        await kv.set(`ride:${rideId}`, ride);
        persisted = true;
        break;
      } catch (e: any) {
        lastWriteError = String(e?.message || e);
      }
    }
    if (!persisted) {
      console.error(`❌ [RIDES/CREATE] Écriture impossible pour ${rideId}: ${lastWriteError}`);
      await logAdminEvent("ride_create_failed", {
        rideId,
        passengerId: passengerIdForBlock || null,
        category: vehicleCategory || null,
        reason: lastWriteError || "écriture KV impossible",
      }).catch(() => undefined);
      return c.json({
        success: false,
        error: "RIDE_CREATE_UNAVAILABLE",
        retry: true,
        message: "Course non enregistrée. Réessayez dans un instant.",
      }, 503);
    }

    console.log("✅ Course créée:", rideId, "- Catégorie:", vehicleCategory);

    // 🔁 Mémorise la tentative pour l'idempotence (best effort).
    if (clientRequestId) {
      await kvSet(`ride_req:${clientRequestId}`, rideId).catch(() => undefined);
    }

    // 📊 Trace visible dans le journal admin (création de course).
    await logAdminEvent("ride_created", {
      rideId,
      passengerId: passengerIdForBlock || null,
      passengerName: rideData.passengerName || null,
      category: vehicleCategory || null,
      pickup: rideData.pickup?.address || rideData.pickupAddress || null,
      destination: rideData.destination?.address || rideData.destinationAddress || null,
      clientRequestId: clientRequestId || null,
    }).catch(() => undefined);

    // 🎯 LANCER LE MATCHING ET NOTIFIER LES CHAUFFEURS
    let matchingResult: any;
    try {
      matchingResult = await findAndNotifyNearbyDrivers(ride);
    } catch (e: any) {
      console.error(`❌ [RIDES/CREATE] Matching en erreur pour ${rideId}:`, e);
      matchingResult = { success: false, reason: "matching_error", error: String(e?.message || e) };
    }

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
    return c.json({ success: false, error: error instanceof Error ? error.message : "Erreur serveur" }, 500);
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
    const ride = await kv.get<any>(`ride:${rideId}`);
    if (!ride) {
      return c.json({ success: false, error: "Course non trouvée" }, 404);
    }

    // ⏱️ Auto-réparation : une recherche sans chauffeur ne doit pas rester
    // bloquée à vie. Le `setTimeout` de matching ne survit pas toujours à
    // l'arrêt de l'instance Edge : on tranche à la lecture.
    if (ride.status === 'searching' && !ride.driverId) {
      const createdAt = Date.parse(ride.createdAt || ride.created_at || '');
      const ageMs = Number.isFinite(createdAt) ? Date.now() - createdAt : 0;
      if (ageMs > SEARCH_STALE_MS) {
        ride.status = 'no_driver_found';
        ride.noDriverFoundAt = new Date().toISOString();
        await kv.set(`ride:${rideId}`, ride);
        await kv.delete(`matching:${rideId}`);
        console.log(`⏰ [RIDES/STATUS] Recherche expirée (${Math.round(ageMs / 1000)}s) → no_driver_found : ${rideId}`);
      }
    }

    return c.json({ success: true, ride });
  } catch (error) {
    console.error("❌ Erreur récupération statut:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

// ============================================
// POST /heal-stuck-state — Réparer les états bloqués (idempotent)
//   - chauffeurs dont le verrou de course est obsolète (plus de notifications)
//   - courses restées « searching » au-delà du délai de matching
// ============================================
app.post("/heal-stuck-state", async (c) => {
  try {
    const drivers = await loadDriversLite();
    const activeRideIds = await loadActiveRideIdSet();

    const staleDrivers: string[] = [];
    for (const driver of drivers) {
      const activeId = readDriverActiveRideId(driver);
      if (activeId && !activeRideIds.has(activeId)) staleDrivers.push(String(driver.id));
    }

    let releasedDrivers = 0;
    for (const id of staleDrivers) {
      const driver = await kv.get<any>(`driver:${id}`);
      if (!driver) continue;
      const activeId = readDriverActiveRideId(driver);
      if (activeId && activeRideIds.has(activeId)) continue; // course réellement en cours
      const online = isDriverOnline(driver);
      const now = new Date().toISOString();
      delete driver.activeRideId;
      delete driver.active_ride_id;
      delete driver.currentRideId;
      delete driver.current_ride_id;
      driver.is_available = online;
      driver.available = online;
      driver.updated_at = now;
      await kv.set(`driver:${id}`, driver);
      const profile = await kv.get<any>(`profile:${id}`);
      if (profile) {
        await kv.set(`profile:${id}`, {
          ...profile, is_available: online, available: online, activeRideId: null, updated_at: now,
        });
      }
      releasedDrivers += 1;
    }

    let expiredRides = 0;
    const rides = await kv.getByPrefix('ride:');
    for (const ride of rides) {
      if (!ride?.id || ride.status !== 'searching' || ride.driverId) continue;
      const createdAt = Date.parse(ride.createdAt || ride.created_at || '');
      if (!Number.isFinite(createdAt) || Date.now() - createdAt <= SEARCH_STALE_MS) continue;
      ride.status = 'no_driver_found';
      ride.noDriverFoundAt = new Date().toISOString();
      await kv.set(`ride:${ride.id}`, ride);
      await kv.delete(`matching:${ride.id}`);
      expiredRides += 1;
    }

    console.log(`🧹 [HEAL] ${releasedDrivers} chauffeur(s) libéré(s), ${expiredRides} recherche(s) expirée(s)`);
    return c.json({ success: true, releasedDrivers, expiredRides });
  } catch (error: any) {
    console.error("❌ [HEAL] Erreur:", error);
    return c.json({ success: false, error: error?.message || "Erreur serveur" }, 500);
  }
});

// ============================================
// 🔍 GET /debug-drivers - DIAGNOSTIC endpoint (à placer AVANT GET /:id !)
// ============================================
app.get("/debug-drivers", async (c) => {
  try {
    const allDrivers = await loadDriversLite();
    // Diagnostic fidèle : un verrou obsolète ne doit pas apparaître comme « occupé ».
    await repairStaleLocksInList(allDrivers);
    
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
      activeRideId: d.activeRideId || d.currentRideId || null,
      busy: driverHasActiveRide(d),
      // Flags calcules (memes regles que le matching)
      onlineResolved: isDriverOnline(d),
      availableResolved: isDriverAvailable(d),
      // FCM Token
      hasFcmToken: !!d.fcmToken,
      fcmTokenPreview: d.fcmToken ? d.fcmToken.substring(0, 20) + '...' : null,
      // 🔎 Origine du token : 'native' = plugin Capacitor (push réel), sinon web
      fcmPlatform: d.fcmPlatform || 'web',
      fcmAppVersion: d.fcmAppVersion || null,
      fcmTokenUpdatedAt: d.fcmTokenUpdatedAt || null,
      // Catégorie véhicule
      vehicleCategory: d.vehicleCategory,
      vehicle_category: d.vehicle_category,
      vehicle_type: d.vehicle_type,
      vehicleType: d.vehicleType,
      vehicleFromObj: d.vehicle?.category || d.vehicle?.type,
      // Solde
      balance: d.balance,
      creditBalance: d.creditBalance,
      // Éligibilité (mêmes règles que findAndNotifyNearbyDrivers)
      eligible: isDriverOnline(d) && isDriverAvailable(d) && !driverHasActiveRide(d) && !!d.fcmToken
    }));

    const onlineCount = driversInfo.filter((d: any) => d.onlineResolved).length;
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

/**
 * Conducteurs en ligne + position, pour les cartes passager.
 * Données volontairement minimales : prénom, position, disponibilité — ni
 * téléphone, ni photo, ni solde.
 */
function toMapDrivers(
  drivers: any[],
  eligibleIds: Set<string> | null,
  pickup?: { lat: number; lng: number },
  radiusKm?: number,
): any[] {
  return drivers
    .map((d: any) => {
      const pos = readDriverPosition(d);
      if (!pos) return null;
      const distanceKm = pickup
        ? calculateDistance(pickup.lat, pickup.lng, pos.lat, pos.lng)
        : undefined;
      if (radiusKm !== undefined && distanceKm !== undefined && distanceKm > radiusKm) return null;
      const fullName = String(d.full_name || d.name || '').trim();
      const driverCategory = d.vehicleCategory || d.vehicle_category ||
        d.vehicle_type || d.vehicleType || d.vehicle?.category || d.vehicle?.type;
      return {
        id: d.id,
        name: fullName.split(/\s+/)[0] || 'Chauffeur',
        rating: d.rating,
        totalRides: d.totalRides || d.total_rides,
        vehicleType: driverCategory,
        lat: pos.lat,
        lng: pos.lng,
        distanceKm,
        available: eligibleIds ? eligibleIds.has(String(d.id)) : !driverHasActiveRide(d),
      };
    })
    .filter(Boolean)
    .sort((a: any, b: any) => (a.distanceKm ?? 9e9) - (b.distanceKm ?? 9e9));
}

// ============================================
// GET /online-drivers - Conducteurs connectés + position (cartes passager)
//   ?lat=&lng=   : trie par distance et filtre dans `radiusKm` (25 km par défaut)
// Lecture allégée + instantané de 3 s : sûr à interroger toutes les 8 s.
// ⚠️ À garder AVANT `GET /:id`, sinon « online-drivers » serait pris pour un id.
// ============================================
app.get("/online-drivers", async (c) => {
  try {
    const lat = Number(c.req.query('lat'));
    const lng = Number(c.req.query('lng'));
    const hasPoint = c.req.query('lat') !== undefined && c.req.query('lng') !== undefined &&
      Number.isFinite(lat) && Number.isFinite(lng);
    const radiusKm = Math.min(Math.max(Number(c.req.query('radiusKm')) || 25, 1), 100);

    const drivers = await loadDriversLite({ maxAgeMs: 3000 });
    const online = drivers.filter((d: any) =>
      isDriverOnline(d) && (d.balance || d.creditBalance || 0) >= 0
    );
    // Un verrou de course obsolète ne doit pas griser un chauffeur réellement libre.
    await repairStaleLocksInList(online);
    const mapDrivers = toMapDrivers(
      online,
      null,
      hasPoint ? { lat, lng } : undefined,
      hasPoint ? radiusKm : undefined,
    ).slice(0, 50);

    return c.json({
      success: true,
      count: mapDrivers.length,
      totalOnline: online.length,
      drivers: mapDrivers,
    });
  } catch (error) {
    console.error("❌ [ONLINE-DRIVERS] Lecture impossible:", error);
    return c.json({ success: false, error: "DRIVERS_UNAVAILABLE", retry: true }, 503);
  }
});

// Les opérations de maintenance exigent le secret admin (même règle que les
// crédits manuels dans driver-routes.ts).
function hasValidAdminSecret(c: any): boolean {
  const expected =
    Deno.env.get("EJPAY_ADMIN_SECRET") || Deno.env.get("ADMIN_CREATION_SECRET") || "";
  if (!expected) return false;
  return (c.req.header("x-admin-secret") || "") === expected;
}

// ============================================
// POST /repair-drivers - Réparation à la demande des fiches conducteur
//   en-tête : x-admin-secret (obligatoire)
//   body    : { driverId?: string, purge?: boolean, all?: boolean }
//     driverId : reconstruit CE conducteur (absent ou réduit à une coquille)
//     all      : reconstruit toutes les fiches manquantes/coquilles (lourd)
//     purge    : supprime les fiches fantômes issues d'une reconstruction
// Réponse sans donnée personnelle (ids, booléens, compteurs).
// ============================================
app.post("/repair-drivers", async (c) => {
  if (!hasValidAdminSecret(c)) {
    return c.json({ success: false, error: "Non autorisé" }, 403);
  }
  const report: any = {};
  try {
    const body = await c.req.json().catch(() => ({}));

    if (body?.purge === true) {
      report.purged = await purgeBogusRecoveredDrivers();
    }

    if (body?.driverId) {
      const id = String(body.driverId);
      const before = await kv.get<any>(`driver:${id}`);
      report.target = {
        id,
        existedBefore: !!before,
        wasPlaceholder: !!before && !(before.full_name || before.name || before.phone || before.email),
      };
      const rebuilt = await rebuildDriverRecord(id);
      report.target.rebuilt = !!rebuilt;
      if (rebuilt) {
        report.target.status = rebuilt.status;
        report.target.isApproved = rebuilt.isApproved;
        report.target.category = rebuilt.vehicleCategory;
        report.target.balance = rebuilt.balance;
        report.target.balanceSource = rebuilt.recoveredBalanceSource ?? null;
        report.target.needsBalanceReview = rebuilt.needsBalanceReview ?? false;
        report.target.hasFcmToken = !!rebuilt.fcmToken;
        report.target.isOnline = rebuilt.isOnline === true;
      }
    }

    if (body?.all === true) {
      report.all = await rebuildAllDriverRecords();
    }

    const drivers = await loadDriversLite();
    report.totalDrivers = drivers.length;
    report.placeholders = drivers
      .filter((d: any) => !(d.full_name || d.name || d.phone || d.email))
      .map((d: any) => d.id);
    report.online = drivers.filter((d: any) => isDriverOnline(d)).length;

    return c.json({ success: true, ...report });
  } catch (e: any) {
    console.error("❌ [REPAIR-DRIVERS]", e);
    return c.json({ success: false, error: String(e?.message || e), ...report }, 500);
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
        // Lecture ciblée (position seulement) : route sondée en continu pendant
        // la course, inutile de charger la fiche complète avec sa photo.
        const driver = await readDriverLiveLite(String(ride.driverId));
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
      // Proposition de TRANSFERT : la course est en cours, ne pas supprimer
      if (notification.type === 'transfer_ride_request') {
        const ride = await kv.get<any>(`ride:${notification.rideId}`);
        if (ride && ride.transferProposal?.toDriverId === driverId &&
            ["accepted", "enroute", "arrived", "in_progress"].includes(ride.status)) {
          console.log(`🔄 Proposition de transfert pour ${driverId}: ${notification.rideId}`);
          return c.json({ success: true, ride: { ...ride, ...notification } });
        }
        await kv.delete(`driver_notification:${driverId}`);
        return c.json({ success: true, ride: null });
      }
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
    const body = await c.req.json().catch(() => ({}));
    const { vehicleCategory } = body || {};
    const pickupLat = Number(body?.pickupLat);
    const pickupLng = Number(body?.pickupLng);
    const hasPickup = Number.isFinite(pickupLat) && Number.isFinite(pickupLng);
    
    console.log(`🔍 Vérification disponibilité chauffeurs pour catégorie: ${vehicleCategory}`);
    
    // Lecture ALLÉGÉE (sans photos base64) + instantané de 3 s partagé entre
    // les passagers qui interrogent en même temps. Si la base est
    // indisponible on répond 503 (le client réessaie) au lieu d'un faux
    // « aucun chauffeur ».
    let allDrivers: any[];
    try {
      allDrivers = await loadDriversLite({ maxAgeMs: 3000 });
    } catch (e) {
      console.error("❌ [AVAILABILITY] Lecture des conducteurs impossible:", e);
      return c.json({ success: false, error: "DRIVERS_UNAVAILABLE", retry: true }, 503);
    }
    // 🧹 Un verrou de course obsolète ne doit pas faire croire qu'aucun
    // chauffeur n'est disponible (sinon le passager ne peut plus commander).
    await repairStaleLocksInList(allDrivers);
    
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
      
      return isOnline && isAvailable && hasPositiveBalance && !driverHasActiveRide(d) && categoryMatch;
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
    
    // ─── Positions des conducteurs connectés (carte passager) ────────────
    // On renvoie TOUS les conducteurs en ligne, même ceux dont la catégorie ou
    // la disponibilité ne correspond pas : la carte doit montrer « qui est
    // connecté autour de moi », pas seulement qui est éligible.
    const eligibleIds = new Set(eligibleDrivers.map((d: any) => String(d.id)));
    const driverPositions = toMapDrivers(
      allOnlineDrivers,
      eligibleIds,
      hasPickup ? { lat: pickupLat, lng: pickupLng } : undefined,
    );

    return c.json({
      success: true,
      available,
      driversCount,
      totalOnline,
      categoryName: getCategoryName(vehicleCategory),
      alternatives,
      noDriversOnlineAtAll: totalOnline === 0,
      // ⬇️ consommé par l'écran de recherche pour placer les marqueurs
      drivers: driverPositions,
      driversWithPosition: driverPositions.length,
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
    const allDrivers = await loadDriversLite({ maxAgeMs: 3000 });
    await repairStaleLocksInList(allDrivers);
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
      
      return isOnline && isAvailable && hasPositiveBalance && !driverHasActiveRide(d) && categoryMatch;
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

    // ⏰ Une recherche expirée ne doit plus être acceptée (course abandonnée
    // par le passager ou restée sans chauffeur). On la clôture à la volée.
    if (ride.status === 'searching') {
      const createdMs = Date.parse(ride.createdAt || ride.created_at || '');
      if (Number.isFinite(createdMs) && Date.now() - createdMs > MATCHING_TIMEOUT_MS + 15_000) {
        ride.status = 'no_driver_found';
        ride.noDriverFoundAt = new Date().toISOString();
        await kv.set(`ride:${rideId}`, ride).catch(() => undefined);
        await kv.delete(`matching:${rideId}`).catch(() => undefined);
        return c.json({
          success: false,
          error: 'RIDE_EXPIRED',
          message: "Cette course n'est plus disponible (recherche expirée).",
        }, 410);
      }
    }

    // ✅ NOUVEAU: Vérifier le solde du conducteur AVANT d'accepter
    let driver = await kv.get<any>(`driver:${driverId}`);
    if (!driver) {
      return c.json({ success: false, error: "Conducteur non trouvé" }, 404);
    }

    // 🧹 Verrou obsolète (course terminée/annulée/inexistante) : on le libère
    // avant le contrôle « une seule course à la fois », sinon le chauffeur
    // refusait toute nouvelle course alors qu'il était libre.
    if (await releaseStaleDriverLock(driverId)) {
      driver = (await kv.get<any>(`driver:${driverId}`)) || driver;
    }

    // ✅ 1 seule course a la fois : refuser si deja en course
    if (driverHasActiveRide(driver, rideId)) {
      const busyId = driver.activeRideId || driver.active_ride_id || driver.currentRideId || driver.current_ride_id;
      const busyRide = await kv.get<any>(`ride:${busyId}`);
      const busyTerminal = !busyRide ||
        ['completed', 'rated', 'cancelled', 'no_driver_found'].includes(busyRide.status);
      if (!busyTerminal) {
        return c.json({
          success: false,
          error: "COURSE_EN_COURS",
          message: "Vous avez deja une course en cours. Terminez-la avant d'en accepter une autre.",
          activeRideId: busyId,
        }, 409);
      }
    }

    // ✅ Controle de compatibilite de categorie (cote serveur)
    const rideCategoryRaw = ride.vehicleCategory || ride.vehicleType || ride.vehicle_type;
    const driverCategoryRaw = driver.vehicleCategory || driver.vehicle_category ||
      driver.vehicle_type || driver.vehicleType || driver.vehicle?.category || driver.vehicle?.type;
    if (rideCategoryRaw && driverCategoryRaw && !categoriesCompatible(driverCategoryRaw, rideCategoryRaw)) {
      return c.json({
        success: false,
        error: "CATEGORIE_INCOMPATIBLE",
        message: `Cette course est en categorie ${rideCategoryRaw}. Votre vehicule est en ${driverCategoryRaw}.`,
        rideCategory: rideCategoryRaw,
        driverCategory: driverCategoryRaw,
      }, 409);
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
    const rideCategory = normalizeCategory(
      ride.vehicleCategory || ride.vehicleType ||
      driver.vehicleCategory || driver.vehicle?.category || 'smart_standard'
    ) || 'smart_standard';
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

    // 💾 Persister la course AVANT de verrouiller le chauffeur : si une erreur
    // survient ensuite, on ne laisse jamais un chauffeur bloqué « en course »
    // sur une course restée « searching » (cause de la 2ᵉ course sans notif).
    await kv.set(`ride:${rideId}`, ride);

    // 🛡️ ANTI-FRAUDE : provisionner la commission dès l'acceptation.
    // Sans ça, un chauffeur qui transporte hors-système (jamais de start/complete)
    // ne paie rien. La provision est restituée si la course est annulée avant démarrage,
    // et déduite de la commission finale à la clôture.
    let commissionHold = 0;
    try {
      const csHold = await getCommissionSettings();
      if (csHold.enabled) {
        commissionHold = Math.max(Math.round((ride.estimatedPrice || 0) * csHold.rate / 100), csHold.minimum);
      }
      if (commissionHold > 0) {
        const newBal = (driver.balance || 0) - commissionHold;
        driver.balance = newBal;
        driver.creditBalance = newBal;
        ride.commissionHold = commissionHold;
        ride.commissionHoldAt = new Date().toISOString();
        const loc = driver.currentLocation || driver.current_location || driver.location || null;
        if (loc && typeof loc.lat === 'number' && typeof loc.lng === 'number') {
          ride.acceptDriverLoc = { lat: loc.lat, lng: loc.lng, at: new Date().toISOString() };
        }
        await kv.set(`driver:${driverId}`, driver);
        const prof = await kv.get<any>(`profile:${driverId}`);
        if (prof) {
          await kv.set(`profile:${driverId}`, { ...prof, balance: newBal, creditBalance: newBal });
        }
        console.log(`💰 Provision commission ${commissionHold} CDF prélevée à ${driverName} (nouveau solde ${newBal})`);
      }
    } catch (e) {
      console.error('❌ Erreur provision commission:', e);
    }

    // ✅ Marquer le chauffeur comme occupe (empeche le double booking + matching)
    try {
      driver.is_available = false;
      driver.available = false;
      driver.activeRideId = rideId;
      driver.currentRideId = rideId;
      driver.updated_at = new Date().toISOString();
      if (typeof driver.isOnline !== 'boolean') driver.isOnline = isDriverOnline(driver);
      if (typeof driver.is_online !== 'boolean') driver.is_online = driver.isOnline;
      await kv.set(`driver:${driverId}`, driver);
      const profBusy = await kv.get<any>(`profile:${driverId}`);
      if (profBusy) {
        await kv.set(`profile:${driverId}`, {
          ...profBusy,
          is_available: false,
          available: false,
          activeRideId: rideId,
          updated_at: driver.updated_at,
        });
      }
      console.log(`🔒 Chauffeur ${driverName} marque OCCUPE (course ${rideId})`);
    } catch (e) {
      console.error('❌ Erreur marquage chauffeur occupe:', e);
    }

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
      const allDrivers = await loadDriversLite();
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

    return c.json({ success: true, ride, commissionHold });
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

// ⏸️ Exigence du code de confirmation au démarrage : DÉSACTIVÉE (28/10/2026).
// Le parcours chauffeur réellement en production (NavigationScreen) n'envoie pas
// encore le code, la vérification est donc neutralisée pour ne pas bloquer les
// démarrages de course. À réactiver sans redéploiement une fois la saisie du code
// branchée dans l'app mobile :
//   Supabase → Settings → Edge Functions → Secrets → RIDE_CONFIRMATION_CODE_REQUIRED=true
const CONFIRMATION_CODE_REQUIRED =
  (Deno.env.get("RIDE_CONFIRMATION_CODE_REQUIRED") ?? "").trim().toLowerCase() === "true";

app.post("/start", async (c) => {
  try {
    const { rideId, driverId, confirmationCode } = await c.req.json();
    
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
    
    // ✅ VÉRIFICATION CODE DE CONFIRMATION (désactivée, voir CONFIRMATION_CODE_REQUIRED)
    // Le passager reçoit un code 4 chiffres par SMS. Le chauffeur doit le saisir.
    if (CONFIRMATION_CODE_REQUIRED && !confirmationCode) {
      return c.json({ success: false, error: "Code de confirmation requis pour démarrer la course" }, 400);
    }

    // Démarrer la course
    ride.status = 'in_progress';
    ride.startedAt = new Date().toISOString();
    // On garde la trace du code fourni, même quand l'exigence est désactivée
    ride.confirmationCodeVerified = !!confirmationCode;

    await kv.set(`ride:${rideId}`, ride);

    console.log(
      `✅ Course ${rideId} démarrée par ${driverId}` +
      (confirmationCode ? " avec code de confirmation" : " sans code (vérification désactivée)")
    );
    
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
    // 🚦 Une course déjà commencée ne s'annule plus (passager ET chauffeur).
    // Seule la clôture (Terminer) est possible, ou le support.
    const started = ride.status === 'in_progress' || !!ride.startedAt;
    if (started) {
      return c.json({
        success: false,
        error: "Impossible d'annuler une course déjà commencée. Terminez la course ou contactez le support.",
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

    // 🛡️ ANTI-FRAUDE : restituer la provision si la course n'a jamais démarré.
    // (Annulation avant démarrage = pas de transport = pas de commission.)
    // Si le conducteur annule ALORS QUE la course roule, la provision est conservée.
    try {
      const hold = ride.commissionHold || 0;
      const did = ride.driverId || driverId;
      if (hold > 0 && !ride.startedAt && did) {
        const drv = await kv.get<any>(`driver:${did}`);
        if (drv) {
          const refunded = (drv.balance || 0) + hold;
          drv.balance = refunded;
          drv.creditBalance = refunded;
          await kv.set(`driver:${did}`, drv);
          ride.commissionHoldRefunded = true;
          await kv.set(`ride:${rideId}`, ride);
          console.log(`💰 Provision ${hold} CDF restituée à ${did} (annulation avant démarrage)`);
        }
      }
    } catch (e) {
      console.error('❌ Erreur restitution provision:', e);
    }

    // ✅ Liberer le chauffeur assigne : la course est annulee, il redevient dispo
    await releaseDriverAfterRide(ride.driverId || driverId, rideId);

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
      const allDriversForCancel = await loadDriversLite();
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
// 🛡️ POST /sweep-fraud - Balayage anti-fraude (timeout, mouvement, arrivée)
// Protégé par CRON_SECRET (cron) ou une session admin (bouton du panneau).
// ?dryRun=true : simule sans rien modifier.
//  - accepté/arrivé jamais démarré depuis +15 min :
//      * conducteur a bougé > 500 m depuis l'acceptation → démarrage auto + suspect
//      * sinon → annulation auto (système) + restitution provision + strike
//  - in_progress proche de la destination depuis +45 min → clôture auto au prix estimé
// ============================================
app.post("/sweep-fraud", async (c) => {
  try {
    if (!(await hasValidCronOrAdmin(c))) {
      return c.json({ success: false, error: "Unauthorized" }, 401);
    }
    const url = new URL(c.req.url);
    const dryRun = url.searchParams.get("dryRun") === "true";
    const now = Date.now();
    const summary: any = { dryRun, autoStarted: [], autoCancelled: [], autoCompleted: [], strikes: {} };

    const distanceKm = (a: number, b: number, d: number, e: number) => {
      const R = 6371;
      const dLat = (d - a) * Math.PI / 180;
      const dLon = (e - b) * Math.PI / 180;
      const s =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(a * Math.PI / 180) * Math.cos(d * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      return 2 * R * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
    };

    const rides = await kv.getByPrefix("ride:");
    const strike = async (driverId: string) => {
      const key = `fraud_strikes:${driverId}`;
      const cur = (await kv.get<any>(key)) || { count: 0 };
      cur.count = (cur.count || 0) + 1;
      cur.lastAt = new Date().toISOString();
      await kv.set(key, cur);
      summary.strikes[driverId] = cur.count;
      return cur.count;
    };

    for (const ride of rides) {
      try {
        const did = ride.driverId || ride.driver_id;
        if (!did) continue;
        const acceptedAt = new Date(ride.acceptedAt || ride.createdAt || 0).getTime();
        const startedAt = ride.startedAt ? new Date(ride.startedAt).getTime() : 0;

        // ── 1. Accepté/arrivé mais jamais démarré depuis +15 min ──
        if ((ride.status === "accepted" || ride.status === "arrived") && acceptedAt && now - acceptedAt > 15 * 60 * 1000) {
          const driver = await kv.get<any>(`driver:${did}`);
          const snap = ride.acceptDriverLoc;
          const cur = driver?.currentLocation || driver?.current_location || driver?.location || null;
          let movedKm = -1;
          if (snap && cur && typeof cur.lat === "number" && typeof cur.lng === "number") {
            movedKm = distanceKm(snap.lat, snap.lng, cur.lat, cur.lng);
          }

          if (movedKm >= 0.5) {
            // Le chauffeur roule sans avoir démarré → démarrage auto + suspect
            if (!dryRun) {
              ride.status = "in_progress";
              ride.startedAt = new Date().toISOString();
              ride.startedBy = "system-antifraude";
              ride.fraudSuspect = true;
              await kv.set(`ride:${ride.id}`, ride);
              const n = await strike(did);
              await logAdminEvent("fraud_auto_start", {
                rideId: ride.id, driverId: did,
                driverName: ride.driverName || null,
                movedKm: Math.round(movedKm * 10) / 10,
                strikes: n,
              });
              await pushToRidePartiesSafe(ride, "🚖 Course démarrée",
                "Départ détecté : la course est maintenant suivie par SmartCabb.", ride.id);
            }
            summary.autoStarted.push({ rideId: ride.id, driverId: did, movedKm: Math.round(movedKm * 10) / 10 });
          } else {
            // Immobile sans démarrage → annulation auto + restitution + strike
            if (!dryRun) {
              const hold = ride.commissionHold || 0;
              if (hold > 0 && driver) {
                const refunded = (driver.balance || 0) + hold;
                driver.balance = refunded;
                driver.creditBalance = refunded;
                await kv.set(`driver:${did}`, driver);
              }
              ride.status = "cancelled";
              ride.cancelledAt = new Date().toISOString();
              ride.cancelledBy = "system";
              ride.cancellationReason = "Démarrage jamais effectué (timeout 15 min)";
              ride.commissionHoldRefunded = hold > 0;
              await kv.set(`ride:${ride.id}`, ride);
              await releaseDriverAfterRide(did, ride.id);
              const n = await strike(did);
              await logAdminEvent("fraud_auto_cancel", {
                rideId: ride.id, driverId: did,
                driverName: ride.driverName || null,
                strikes: n,
              });
              await pushToRidePartiesSafe(ride, "❌ Course annulée",
                "Le chauffeur n'a pas démarré la course. Une nouvelle recherche va démarrer.", ride.id);
            }
            summary.autoCancelled.push({ rideId: ride.id, driverId: did });
          }
          continue;
        }

        // ── 2. En cours, proche de la destination depuis +45 min, jamais clôturée ──
        if (ride.status === "in_progress" && startedAt && now - startedAt > 45 * 60 * 1000) {
          const dest = ride.destination || {};
          const dlat = dest.coordinates?.lat ?? dest.lat;
          const dlng = dest.coordinates?.lng ?? dest.lng;
          const driver = await kv.get<any>(`driver:${did}`);
          const cur = driver?.currentLocation || driver?.current_location || driver?.location || null;
          if (typeof dlat === "number" && typeof dlng === "number" && cur &&
              distanceKm(cur.lat, cur.lng, dlat, dlng) < 0.2) {
            if (!dryRun) {
              const price = ride.estimatedPrice || 0;
              ride.status = "completed";
              ride.completedAt = new Date().toISOString();
              ride.totalPrice = price;
              ride.finalPrice = price;
              ride.autoCompleted = true;
              await kv.set(`ride:${ride.id}`, ride);
              await releaseDriverAfterRide(did, ride.id);
              // Commission normale (provision déjà prélevée déduite)
              if (did && price > 0) {
                const drv = await kv.get<any>(`driver:${did}`);
                if (drv) {
                  const cs = await getCommissionSettings();
                  let commission = 0;
                  if (cs.enabled) commission = Math.max(Math.round(price * cs.rate / 100), cs.minimum);
                  const due = commission - (ride.commissionHold || 0);
                  const nb = (drv.balance || 0) - due;
                  drv.balance = nb;
                  drv.creditBalance = nb;
                  drv.earningsBalance = (drv.earningsBalance || 0) + (price - commission);
                  const pc = drv.totalRides || drv.total_rides || 0;
                  drv.totalRides = pc + 1;
                  drv.total_rides = pc + 1;
                  await kv.set(`driver:${did}`, drv);
                }
              }
              await logAdminEvent("fraud_auto_complete", { rideId: ride.id, driverId: did, price });
              await pushToRidePartiesSafe(ride, "🏁 Course clôturée",
                "Arrivée détectée : la course a été clôturée automatiquement.", ride.id);
            }
            summary.autoCompleted.push({ rideId: ride.id, driverId: did });
          }
          continue;
        }
      } catch (e) {
        console.error("sweep ride:", ride?.id, e);
      }
    }

    console.log("🛡️ Sweep anti-fraude:", JSON.stringify(summary));
    return c.json({ success: true, ...summary });
  } catch (error) {
    console.error("Erreur sweep-fraud:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Le secret cron est obligatoire (CRON_SECRET) : plus de repli sur l'ancien
// secret historique, qui était présent dans le dépôt.
function hasValidCronSecret(c: any): boolean {
  const got = c.req.header("x-cron-secret") || "";
  const expected = Deno.env.get("CRON_SECRET") || "";
  return expected !== "" && got === expected;
}

/** Vérifie un jeton de session Supabase et exige le rôle `admin`. */
async function hasValidAdminJwt(c: any): Promise<boolean> {
  const header = c.req.header("Authorization") || c.req.header("authorization") || "";
  const match = /^Bearer\s+(.+)$/i.exec(String(header).trim());
  if (!match) return false;
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );
    const { data, error } = await supabase.auth.getUser(match[1].trim());
    if (error || !data?.user) return false;
    const role = data.user.user_metadata?.role || data.user.app_metadata?.role || "passenger";
    return role === "admin";
  } catch (e) {
    console.error("❌ [RIDES/AUTH] Erreur vérification jeton:", e instanceof Error ? e.message : e);
    return false;
  }
}

/** Le cron (x-cron-secret) ou un administrateur connecté. */
async function hasValidCronOrAdmin(c: any): Promise<boolean> {
  if (hasValidCronSecret(c)) return true;
  return await hasValidAdminJwt(c);
}
async function pushToRidePartiesSafe(ride: any, title: string, body: string, rideId: string): Promise<void> {
  try {
    const did = ride.driverId || ride.driver_id;
    if (did) {
      const driver = await kv.get<any>(`driver:${did}`);
      if (driver?.fcmToken) {
        await sendFCMNotification(driver.fcmToken, { title, body, data: { type: "ride_antifraud", rideId } });
      }
    }
  } catch (e) { console.warn("push driver antifraude:", e); }
  try {
    const pid = ride.passengerId || ride.passenger_id;
    if (pid) {
      const t = await kv.get(`fcm_token_${pid}`);
      const token = typeof t === "string" ? t : t?.token;
      if (token) {
        await sendFCMNotification(token, { title, body, data: { type: "ride_antifraud", rideId } });
      }
    }
  } catch (e) { console.warn("push passenger antifraude:", e); }
}

// ============================================
// GET /admin/fraud-signals - Tableau anti-fraude : démarrages manqués, taux, délais
// ============================================
app.get("/admin/fraud-signals", async (c) => {
  try {
    const rides = await kv.getByPrefix("ride:");
    // Fenêtre 30 jours : le passé lointain (tests) ne doit pas accuser
    const since = Date.now() - 30 * 24 * 3600 * 1000;
    const recent = rides.filter((r: any) => {
      const t = new Date(r.acceptedAt || r.createdAt || r.created_at || 0).getTime();
      return t >= since;
    });
    const byDriver: Record<string, any> = {};
    const bump = (did: string, key: string, ride: any) => {
      if (!did) return;
      if (!byDriver[did]) {
        byDriver[did] = { driverId: did, driverName: null, accepts: 0, completed: 0, cancelled: 0, noStart: 0, suspectStarts: 0, startDelaysSec: [] };
      }
      const s = byDriver[did];
      if (!s.driverName) s.driverName = ride.driverName || null;
      if (key === "delay" && typeof ride._delay === "number") s.startDelaysSec.push(ride._delay);
      else s[key]++;
    };

    for (const r of recent) {
      const did = r.driverId || r.driver_id;
      if (!did) continue;
      if (r.status === "accepted" || r.status === "arrived" || r.status === "in_progress" ||
          r.status === "completed" || r.status === "rated" || r.status === "cancelled") {
        // accepté (tout ce qui a dépassé searching/pending compte comme acceptation)
        if (r.acceptedAt || ["accepted", "arrived", "in_progress", "completed", "rated"].includes(r.status)) {
          bump(did, "accepts", r);
        }
      }
      if (r.status === "completed" || r.status === "rated") bump(did, "completed", r);
      if (r.status === "cancelled") bump(did, "cancelled", r);
      if ((r.status === "cancelled" && r.cancelledBy === "system") ||
          (r.cancellationReason || "").includes("jamais effectué")) {
        bump(did, "noStart", r);
      }
      if (r.fraudSuspect) bump(did, "suspectStarts", r);
      if (r.acceptedAt && r.startedAt) {
        const d = Math.floor((new Date(r.startedAt).getTime() - new Date(r.acceptedAt).getTime()) / 1000);
        if (d >= 0 && d < 24 * 3600) { bump(did, "delay", { ...r, _delay: d }); }
      }
    }

    const drivers = await loadDriversLite({ maxAgeMs: 30_000 });
    const nameOf: Record<string, string> = {};
    drivers.forEach((d: any) => { if (d.id) nameOf[d.id] = d.full_name || d.name || null; });

    const signals = Object.values(byDriver).map((s: any) => {
      const avgDelay = s.startDelaysSec.length > 0
        ? Math.round(s.startDelaysSec.reduce((a: number, b: number) => a + b, 0) / s.startDelaysSec.length)
        : null;
      const completionRate = s.accepts > 0 ? Math.round((s.completed / s.accepts) * 100) : null;
      return {
        driverId: s.driverId,
        driverName: s.driverName || nameOf[s.driverId] || "Conducteur",
        accepts: s.accepts,
        completed: s.completed,
        cancelled: s.cancelled,
        noStartTimeouts: s.noStart,
        suspectStarts: s.suspectStarts,
        avgStartDelaySec: avgDelay,
        completionRate,
        score: (s.noStart * 3) + (s.suspectStarts * 2) + (s.accepts >= 5 && (completionRate ?? 100) < 60 ? 2 : 0),
      };
    })
    .filter((s: any) => s.accepts > 0)
    .sort((a: any, b: any) => b.score - a.score || b.noStartTimeouts - a.noStartTimeouts);

    const strikes: Record<string, number> = {};
    for (const s of signals) {
      const st = await kv.get<any>(`fraud_strikes:${s.driverId}`);
      if (st?.count) strikes[s.driverId] = st.count;
    }

    return c.json({ success: true, signals: signals.map((s: any) => ({ ...s, strikes: strikes[s.driverId] || 0 })) });
  } catch (error) {
    console.error("Erreur fraud-signals:", error);
    return c.json({ success: false, error: error.message }, 500);
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
    let actualCost: number | undefined =
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

    // ⏱️ Pénalité « location journalière » après 21h (heure de Kinshasa) :
    // 10 $ par heure entamée. Concerne les courses journalières (Business /
    // location_jour) ; la pénalité est ajoutée au montant réglé à la clôture.
    let penaltyCDF = 0;
    const isDailyRide =
      ride.serviceType === 'location_jour' ||
      ride.vehicleCategory === 'smart_business' ||
      ride.vehicleType === 'smart_business' ||
      ride.vehicle_category === 'smart_business';
    if (isDailyRide && !ride.penaltyApplied) {
      const offsetMin = parseInt(Deno.env.get('BUSINESS_UTC_OFFSET_MINUTES') || '60');
      const local = new Date(Date.now() + offsetMin * 60000);
      const localHours = local.getUTCHours() + local.getUTCMinutes() / 60;
      if (localHours > 21) {
        const overHours = Math.ceil(localHours - 21);
        let rate = 2250;
        try {
          const cfg = await kvGet('smartcabb_global_config');
          const r = Number(cfg?.exchangeRate);
          if (Number.isFinite(r) && r > 0) rate = r;
        } catch { /* taux par défaut */ }
        penaltyCDF = Math.round(10 * overHours * rate);
        ride.penaltyApplied = true;
        ride.penaltyHours = overHours;
        ride.penaltyCDF = penaltyCDF;
        actualCost = (actualCost || 0) + penaltyCDF;
        console.log(`⏱️ [RIDE-COMPLETE] Pénalité journalière ${overHours}h après 21h : ${penaltyCDF} CDF`);
      }
    }

    if (effectiveDriverId && actualCost && !alreadyCompleted) {
      const driver = await kv.get<any>(`driver:${effectiveDriverId}`);
      if (driver) {
        // ✅ Commission depuis la config admin (taux + activé + minimum)
        const cs = await getCommissionSettings();
        // 💰 Base des gains conducteur = prix TOTAL de la course (acompte inclus)
        // + pénalité. Sinon, avec une réservation, il n'aurait touché que 85 %
        // du « reste à payer » et l'acompte ne lui aurait jamais été crédité.
        const baseForDriver = Number(ride.scheduledTotalPrice) > 0
          ? Number(ride.scheduledTotalPrice) + (Number(ride.penaltyCDF) || 0)
          : (actualCost || 0);
        let commission = 0;
        if (cs.enabled) {
          commission = Math.max(Math.round(baseForDriver * cs.rate / 100), cs.minimum);
        }
        const driverEarnings  = baseForDriver - commission;

        // 🛡️ ANTI-FRAUDE : déduire la provision déjà prélevée à l'acceptation.
        // Si la course a coûté moins que prévu, le trop-perçu est restitué.
        const hold = ride.commissionHold || 0;
        const due = commission - hold;
        const newBalance = (driver.balance || 0) - due;

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
        // 🚦 variantes Standard fusionnées (sans clim en pause)
        const driverCategory = normalizeCategory(
          driver.vehicleCategory || driver.vehicle_category || driver.vehicle?.category || 'smart_standard'
        ) || 'smart_standard';
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

    // ✅ Liberer le chauffeur (disponible a nouveau s'il est toujours en ligne)
    if (effectiveDriverId) await releaseDriverAfterRide(effectiveDriverId, rideId);

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

    // ─── Crédit fidélité ────────────────────────────────────────────────
    if (!alreadyCompleted && actualCost) {
      try {
        const res = await creditLoyaltyForRide(ride, actualCost);
        console.log(`🎁 Loyalty crédité: ${res.points} pts pour ${ride.passengerId}, solde ${res.balance}`);
      } catch (e) { console.error("⚠️ Loyalty credit error:", e); }
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
        // 💰 Base des gains conducteur = prix TOTAL de la course (acompte inclus)
        // + pénalité. Sinon, avec une réservation, il n'aurait touché que 85 %
        // du « reste à payer » et l'acompte ne lui aurait jamais été crédité.
        const baseForDriver = Number(ride.scheduledTotalPrice) > 0
          ? Number(ride.scheduledTotalPrice) + (Number(ride.penaltyCDF) || 0)
          : (actualCost || 0);
        let commission = 0;
        if (cs.enabled) {
          commission = Math.max(Math.round(baseForDriver * cs.rate / 100), cs.minimum);
        }
        const driverEarnings  = baseForDriver - commission;

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
        // 🚦 variantes Standard fusionnées (sans clim en pause)
        const driverCategory = normalizeCategory(
          driver.vehicleCategory || driver.vehicle_category || driver.vehicle?.category || 'smart_standard'
        ) || 'smart_standard';
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

    // ✅ Liberer le chauffeur (disponible a nouveau s'il est toujours en ligne)
    if (effectiveDriverId) await releaseDriverAfterRide(effectiveDriverId, rideId);
    
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
    // Courses effectuées = terminées OU notées (rated = terminée + avis passager)
    const driverRides = allRides.filter((r: any) =>
      r.driverId === driverId && (r.status === 'completed' || r.status === 'rated')
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

    // Enrichir avec la fiche conducteur (photo, véhicule) pour l'historique
    const enriched = await Promise.all(passengerRides.map(async (r: any) => {
      const did = r.driverId || r.driver_id;
      if (!did) return r;
      try {
        const d = await kv.get<any>(`driver:${did}`);
        if (!d) return r;
        const v = d.vehicle || {};
        return {
          ...r,
          driver: {
            name: d.full_name || d.name || r.driverName || 'Conducteur',
            phone: d.phone || '',
            photo: d.photo || d.photo_url || d.profile_photo || null,
            vehicleCategory: d.vehicleCategory || d.vehicle_category || v.category || r.vehicleCategory || r.vehicle_category || null,
            color: v.color || '',
            make: v.make || '',
            model: v.model || '',
            plate: v.license_plate || v.plate || '',
          },
        };
      } catch {
        return r;
      }
    }));

    return c.json({
      success: true,
      rides: enriched,
      count: enriched.length
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
// Helper : push passager (gracieux si token absent)
async function notifyPassenger(userId: string, notif: { title: string; body: string; data?: Record<string, string> }): Promise<boolean> {
  try {
    const tokenData = await kvGet(`fcm_token_${userId}`);
    const token = typeof tokenData === "string" ? tokenData : tokenData?.token;
    if (!token) return false;
    const r = await sendFCMNotification(token, {
      title: notif.title,
      body: notif.body,
      data: notif.data || {},
    });
    return !!r.success;
  } catch (e) {
    console.warn("notifyPassenger:", e);
    return false;
  }
}

// POST /process-scheduled - Convertir les réservations programmées en courses réelles
// ============================================
// Cycle Jour-J (cron toutes les 5 min) :
//  1. Rappel H-1h au conducteur ayant accepté + demande de confirmation de présence.
//  2. 15 min avant l'heure (SCHEDULED_RIDE_BUFFER_MINUTES, défaut 15) :
//     si conducteur accepté ET présent → course PRÉ-ATTRIBUÉE (pas de matching).
//     Si accepté mais SANS confirmation → pas de création auto, alerte admin (badge + live-feed).
//     Si aucun conducteur → matching auto même catégorie (comportement historique).
// Traite les statuts 'scheduled' ET 'confirmed' (acompte payé).
// ============================================
app.post("/process-scheduled", async (c) => {
  if (!hasValidCronSecret(c)) {
    console.warn("Tentative d acces non autorise a /process-scheduled");
    return c.json({ success: false, error: "Unauthorized" }, 401);
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const now = new Date();
    // On charge jusqu'à demain (une course à 00:05 peut devoir être traitée
    // quelques minutes avant minuit) ; l'échéance exacte est calculée en ms.
    const tomorrowStr = new Date(now.getTime() + 24 * 60 * 60000).toISOString().slice(0, 10);
    const bufferMinutes = parseInt(Deno.env.get("SCHEDULED_RIDE_BUFFER_MINUTES") || "15");
    if (!Number.isFinite(bufferMinutes) || bufferMinutes < 1) {
      // Sécurité : toujours au moins quelques minutes d'avance.
      console.warn(`SCHEDULED_RIDE_BUFFER_MINUTES invalide (${Deno.env.get("SCHEDULED_RIDE_BUFFER_MINUTES")}) — repli sur 15`);
    }
    const leadMinutes = Number.isFinite(bufferMinutes) && bufferMinutes > 0 ? bufferMinutes : 15;
    // Fenêtre de rappel : course qui démarre dans ~1h (55-65 min)
    const remindFrom = new Date(now.getTime() + 55 * 60000);
    const remindTo = new Date(now.getTime() + 65 * 60000);

    const { data: scheduledRides, error } = await supabase
      .from("scheduled_rides")
      .select("*")
      .in("status", ["scheduled", "confirmed"])
      .lte("scheduled_date", tomorrowStr);

    if (error) {
      console.error("Erreur requete scheduled_rides:", error);
      return c.json({ success: false, error: error.message }, 500);
    }

    if (!scheduledRides || scheduledRides.length === 0) {
      return c.json({ success: true, processed: 0, reminded: 0, message: "Aucune course programmee a traiter" });
    }

    // 🌍 Les heures de réservation sont saisies en heure LOCALE de Kinshasa
    // (UTC+1), alors que l'Edge Function tourne en UTC. Sans cette conversion,
    // une course réservée à 10:30 était traitée à 11:30 (une heure de retard).
    const businessOffsetMin = parseInt(Deno.env.get("BUSINESS_UTC_OFFSET_MINUTES") || "60");
    const startTs = (r: any) => {
      const raw = Date.parse(`${r.scheduled_date}T${String(r.scheduled_time || "00:00").slice(0, 8)}Z`);
      return Number.isFinite(raw) ? raw - businessOffsetMin * 60000 : NaN;
    };
    const results = [];
    let reminded = 0;

    for (const sr of scheduledRides) {
      try {
        const start = startTs(sr);

        // ── 1. RAPPEL H-1h au conducteur ayant accepté ──
        if (
          sr.driver_id && sr.driver_status === "accepted" && !sr.reminder_sent_at &&
          start >= remindFrom.getTime() && start <= remindTo.getTime()
        ) {
          const drv = await kv.get<any>(`driver:${sr.driver_id}`);
          const token = drv?.fcmToken;
          if (token) {
            await sendFCMNotification(token, {
              title: "📅 Rappel de course dans 1h",
              body: `Course ${sr.pickup_address} → ${sr.dropoff_address} à ${(sr.scheduled_time || "").slice(0, 5)}. Confirmez votre présence dans l'app.`,
              data: { type: "reservation_reminder", reservationId: sr.id },
            });
          }
          await supabase.from("scheduled_rides").update({ reminder_sent_at: new Date().toISOString() }).eq("id", sr.id);
          reminded++;
          console.log(`🔔 Rappel H-1h envoyé pour ${sr.id} (conducteur ${sr.driver_id})`);
          continue;
        }

        // ── 2. Échéance : la course doit démarrer (passée ou dans ~5 min) ──
        // Fenêtre limitée aux 24 dernières heures : une très vieille réservation
        // restée « scheduled » ne doit pas être traitée par surprise.
        const notTooOld = now.getTime() - 24 * 60 * 60000;
        const isDue = Number.isFinite(start) &&
          start <= now.getTime() + leadMinutes * 60000 &&
          start >= notTooOld;
        if (!isDue) continue;

        const passengerProfile = await kv.get(`passenger:${sr.user_id}`);
        const passengerName = passengerProfile?.full_name || passengerProfile?.name || "Passager";
        const passengerPhone = passengerProfile?.phone || passengerProfile?.phone_number || "";

        // ── 2a. Conducteur accepté → course PRÉ-ATTRIBUÉE (pas de matching) ──
        if (sr.driver_id && sr.driver_status === "accepted") {
          if (!sr.presence_confirmed) {
            // Pas de confirmation de présence → on ne crée rien, alerte admin
            await logAdminEvent("reservation_no_presence", {
              reservationId: sr.id,
              driverId: sr.driver_id,
              driverName: sr.driver_name || null,
              pickup: sr.pickup_address,
              destination: sr.dropoff_address,
              scheduledDate: sr.scheduled_date,
              scheduledTime: sr.scheduled_time,
            });
            console.log(`⚠️ Pas de confirmation de présence pour ${sr.id} — action admin requise`);
            // Rassurer le passager sans promettre un chauffeur précis
            await notifyPassenger(sr.user_id, {
              title: "SmartCabb — Votre course",
              body: `Votre course de ${(sr.scheduled_time || "").slice(0, 5)} est en cours de finalisation. Nous vous confirmons votre chauffeur dans un instant.`,
              data: { type: "reservation_finalizing", reservationId: sr.id },
            });
            results.push({ scheduledRideId: sr.id, skipped: "no_presence" });
            continue;
          }

          const driver = await kv.get<any>(`driver:${sr.driver_id}`);
          const rideId = crypto.randomUUID();
          const ride = {
            id: rideId,
            passengerId: sr.user_id,
            passengerName,
            passengerPhone,
            driverId: sr.driver_id,
            driverName: driver?.full_name || driver?.name || sr.driver_name || "Conducteur",
            driverPhone: driver?.phone || "",
            pickup: { name: sr.pickup_address, address: sr.pickup_address, coordinates: { lat: sr.pickup_lat, lng: sr.pickup_lng } },
            destination: { name: sr.dropoff_address, address: sr.dropoff_address, coordinates: { lat: sr.dropoff_lat, lng: sr.dropoff_lng } },
            vehicleCategory: sr.category,
            // 💰 L'acompte (50 %) a déjà été réglé à la réservation : la course
            // n'affiche et ne facture QUE le reste à payer. Le total reste
            // stocké pour le calcul des gains du conducteur.
            estimatedPrice: Math.max(
              0,
              (Number(sr.estimated_price) || 0) -
                (sr.deposit_received ? Math.round((Number(sr.estimated_price) || 0) * 0.5) : 0),
            ),
            scheduledTotalPrice: Number(sr.estimated_price) || 0,
            scheduledDepositPaid: sr.deposit_received
              ? Math.round((Number(sr.estimated_price) || 0) * 0.5)
              : 0,
            depositMethod: sr.deposit_method || null,
            distance: 0,
            duration: 0,
            pickupAddress: sr.pickup_address,
            destinationAddress: sr.dropoff_address,
            status: "accepted",
            acceptedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            isScheduled: true,
            scheduledDate: sr.scheduled_date,
            scheduledTime: sr.scheduled_time,
            scheduledRideId: sr.id,
            passengerCount: 1
          };

          await kv.set(`ride:${rideId}`, ride);
          // Index réservation → course : permet à l'admin de savoir si la
          // réservation a déjà été transformée en course (bouton « Rouvrir »).
          await kv.set(`scheduled_ride:${sr.id}`, rideId);
          console.log(`Course pre-attribuee creee: ${rideId} (conducteur ${sr.driver_id})`);

          // ✅ Marquer le chauffeur occupe : il ne doit pas recevoir d'autres courses
          if (driver) {
            driver.is_available = false;
            driver.available = false;
            driver.activeRideId = rideId;
            driver.currentRideId = rideId;
            driver.updated_at = new Date().toISOString();
            await kv.set(`driver:${sr.driver_id}`, driver);
          }

          // Notifier le conducteur : mise en route
          if (driver?.fcmToken) {
            await sendFCMNotification(driver.fcmToken, {
              title: "🚖 Votre course réservée démarre",
              body: `${sr.pickup_address} → ${sr.dropoff_address}. Mettez-vous en route vers le point de départ.`,
              data: { type: "reservation_started", rideId, reservationId: sr.id },
            });
          }

          await supabase.from("scheduled_rides").update({ status: "completed" }).eq("id", sr.id);

          // Notifier le passager avec les détails du chauffeur (sécurité)
          await notifyPassenger(sr.user_id, {
            title: "🚖 Votre chauffeur est en route",
            body: `${ride.driverName} · ${sr.pickup_address} → ${sr.dropoff_address}. Suivez votre course dans l'app.`,
            data: { type: "reservation_driver_enroute", rideId, reservationId: sr.id },
          });

          results.push({ scheduledRideId: sr.id, rideId, matching: "preassigned" });
          continue;
        }

        // ── 2b. Aucun conducteur accepté → matching auto même catégorie ──
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
          // 💰 L'acompte (50 %) a déjà été réglé à la réservation : la course
            // n'affiche et ne facture QUE le reste à payer. Le total reste
            // stocké pour le calcul des gains du conducteur.
            estimatedPrice: Math.max(
              0,
              (Number(sr.estimated_price) || 0) -
                (sr.deposit_received ? Math.round((Number(sr.estimated_price) || 0) * 0.5) : 0),
            ),
            scheduledTotalPrice: Number(sr.estimated_price) || 0,
            scheduledDepositPaid: sr.deposit_received
              ? Math.round((Number(sr.estimated_price) || 0) * 0.5)
              : 0,
            depositMethod: sr.deposit_method || null,
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
        // Index réservation → course (voir /reservations/:id/reopen).
        await kv.set(`scheduled_ride:${sr.id}`, rideId);
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

    return c.json({ success: true, processed: results.length, reminded, results });

  } catch (error) {
    console.error("Erreur process-scheduled:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// POST /:id/incident - Déclarer un incident en cours de course (panne, crevaison…)
// Body : { reporterType: 'driver'|'passenger', reporterId, kind, comment?, lat?, lng? }
// → stocké + événement admin (fil d'activité) + push à l'autre partie.
// ============================================
app.post("/:id/incident", async (c) => {
  try {
    const rideId = c.req.param("id");
    const { reporterType, reporterId, kind, comment, lat, lng } = await c.req.json();

    if (!isValidUUID(rideId)) {
      return c.json({ success: false, error: "ID de course invalide" }, 400);
    }
    const KINDS = ["panne", "crevaison", "urgence", "autre"];
    if ((reporterType !== "driver" && reporterType !== "passenger") || !KINDS.includes(kind)) {
      return c.json({ success: false, error: "Paramètres invalides" }, 400);
    }

    const ride = await kv.get<any>(`ride:${rideId}`);
    if (!ride) {
      return c.json({ success: false, error: "Course introuvable" }, 404);
    }
    if (!["accepted", "enroute", "arrived", "in_progress"].includes(ride.status)) {
      return c.json({ success: false, error: "Course non active" }, 400);
    }

    const KIND_LABELS: Record<string, string> = {
      panne: "Panne véhicule",
      crevaison: "Crevaison",
      urgence: "Urgence / sécurité",
      autre: "Autre incident",
    };
    const incident = {
      id: `inc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      rideId,
      reporterType,
      reporterId: reporterId || null,
      kind,
      kindLabel: KIND_LABELS[kind],
      comment: (comment || "").slice(0, 500),
      lat: typeof lat === "number" ? lat : null,
      lng: typeof lng === "number" ? lng : null,
      scheduledRideId: ride.scheduledRideId || null,
      createdAt: new Date().toISOString(),
    };
    await kv.set(`incident:${rideId}:${incident.id}`, incident);

    await logAdminEvent("ride_incident", {
      rideId,
      kind,
      kindLabel: incident.kindLabel,
      reporterType,
      comment: incident.comment || null,
      lat: incident.lat,
      lng: incident.lng,
      pickup: typeof ride.pickup === "object" ? (ride.pickup?.address || ride.pickup?.name) : ride.pickup,
      destination: typeof ride.destination === "object" ? (ride.destination?.address || ride.destination?.name) : ride.destination,
      driverId: ride.driverId || ride.driver_id || null,
      driverName: ride.driverName || null,
      passengerId: ride.passengerId || ride.passenger_id || null,
      passengerName: ride.passengerName || null,
      scheduledRideId: ride.scheduledRideId || null,
    });

    // 🚨 Une « urgence / sécurité » déclarée en course doit aussi apparaître
    // dans l'écran admin « Urgences SOS » (en plus du fil d'activité).
    if (kind === "urgence") {
      try {
        const supabase = kvClient();
        const { data: existing } = await supabase
          .from("emergency_alerts")
          .select("id")
          .eq("ride_id", rideId)
          .in("status", ["active", "acknowledged"])
          .limit(1);

        if (!existing || existing.length === 0) {
          const driver = ride.driver || {};
          const fromDriver = reporterType === "driver";
          const pickupLabel =
            typeof ride.pickup === "object"
              ? (ride.pickup?.address || ride.pickup?.name || null)
              : (ride.pickup || null);

          const { error: alertError } = await supabase.from("emergency_alerts").insert({
            user_id: reporterId || (fromDriver ? ride.driverId : ride.passengerId) || `ride:${rideId}`,
            role: fromDriver ? "driver" : "passenger",
            user_name: fromDriver
              ? (driver?.name || ride.driverName || "Conducteur")
              : (ride.passengerName || "Passager"),
            user_phone: fromDriver
              ? (driver?.phone || null)
              : (ride.passengerPhone || null),
            ride_id: rideId,
            type: "security",
            status: "active",
            lat: typeof incident.lat === "number" ? incident.lat : null,
            lng: typeof incident.lng === "number" ? incident.lng : null,
            accuracy: null,
            address: pickupLabel ? String(pickupLabel).slice(0, 250) : null,
            note: (incident.comment || "Urgence signalée pendant la course").slice(0, 500),
            vehicle_info: driver?.vehicle
              ? [driver.vehicle.make, driver.vehicle.model, driver.vehicle.plate || driver.vehicle.license_plate]
                  .filter(Boolean)
                  .join(" ")
                  .slice(0, 160)
              : null,
            counterpart_name: fromDriver
              ? (ride.passengerName || null)
              : (driver?.name || ride.driverName || null),
            counterpart_phone: fromDriver ? (ride.passengerPhone || null) : (driver?.phone || null),
            metadata: { source: "ride_incident", sessionVerified: false },
          });

          if (alertError) {
            console.error("⚠️ [INCIDENT] Alerte SOS non créée:", alertError.message);
          } else {
            console.log("🚨 [INCIDENT] Alerte SOS créée pour la course", rideId);

            // 📱 SMS au support : un incident « urgence » en course doit alerter
            // l'équipe exactement comme le bouton SOS (mêmes destinataires).
            try {
              const fromDriver = reporterType === "driver";
              const who = fromDriver
                ? (driver?.name || ride.driverName || "Conducteur")
                : (ride.passengerName || "Passager");
              const phone = fromDriver
                ? (driver?.phone || null)
                : (ride.passengerPhone || null);
              const latSms = typeof incident.lat === "number" ? incident.lat : null;
              const lngSms = typeof incident.lng === "number" ? incident.lng : null;
              const place = latSms !== null && lngSms !== null
                ? `${latSms.toFixed(5)},${lngSms.toFixed(5)}`
                : (pickupLabel ? String(pickupLabel).slice(0, 80) : "position inconnue");
              const message =
                `SOS SMARTCABB ${who} (${fromDriver ? "driver" : "passenger"}) - Urgence. ${place}` +
                ` Course ${String(rideId).slice(0, 12)}` +
                (phone ? ` Tel ${phone}` : "");

              const sms = await sendSosAlertSms(message);
              console.log(`📱 [INCIDENT] SMS SOS → ${sms.results.filter((r) => r.ok).length}/${sms.results.length} destinataire(s)`);
            } catch (smsException) {
              // Ne jamais bloquer le signalement d'incident.
              console.error("⚠️ [INCIDENT] Erreur SMS SOS:", smsException);
            }
          }
        }
      } catch (alertException) {
        // Ne jamais bloquer le signalement d'incident.
        console.error("⚠️ [INCIDENT] Erreur création alerte SOS:", alertException);
      }
    }

    // Notifier l'autre partie
    try {
      const mapsUrl = incident.lat != null && incident.lng != null
        ? ` Position : https://www.google.com/maps?q=${incident.lat},${incident.lng}` : "";
      if (reporterType === "driver" && (ride.passengerId || ride.passenger_id)) {
        const passenger = await kv.get<any>(`passenger:${ride.passengerId || ride.passenger_id}`);
        const pToken = passenger?.fcmToken;
        if (!pToken) {
          const t = await kv.get(`fcm_token_${ride.passengerId || ride.passenger_id}`);
          if (t) {
            await sendFCMNotification(typeof t === "string" ? t : t.token, {
              title: "⚠️ Incident signalé",
              body: `Votre chauffeur signale : ${incident.kindLabel}.${mapsUrl}`,
              data: { type: "ride_incident", rideId },
            });
          }
        } else {
          await sendFCMNotification(pToken, {
            title: "⚠️ Incident signalé",
            body: `Votre chauffeur signale : ${incident.kindLabel}.${mapsUrl}`,
            data: { type: "ride_incident", rideId },
          });
        }
      } else if (reporterType === "passenger" && (ride.driverId || ride.driver_id)) {
        const driver = await kv.get<any>(`driver:${ride.driverId || ride.driver_id}`);
        if (driver?.fcmToken) {
          await sendFCMNotification(driver.fcmToken, {
            title: "⚠️ Incident signalé",
            body: `Votre passager signale : ${incident.kindLabel}.${mapsUrl}`,
            data: { type: "ride_incident", rideId },
          });
        }
      }
    } catch (e) {
      console.warn("Notif incident autre partie:", e);
    }

    console.log(`⚠️ Incident ${kind} déclaré sur course ${rideId} par ${reporterType}`);
    return c.json({ success: true, incident });
  } catch (error) {
    console.error("Erreur incident:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// GET /:id/incidents - Journal des incidents d'une course (transparence)
// ============================================
app.get("/:id/incidents", async (c) => {
  try {
    const rideId = c.req.param("id");
    if (!isValidUUID(rideId)) {
      return c.json({ success: false, error: "ID de course invalide" }, 400);
    }
    const all = await kvGetByPrefix(`incident:${rideId}:`);
    all.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    return c.json({ success: true, incidents: all });
  } catch (error) {
    console.error("Erreur journal incidents:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ⏱️ COMPTEUR SERVEUR + TRANSFERT — horloge de référence, journal infalsifiable
// ============================================
// ride.meter = { state, accumulatedSec, lastResumeAt, currentDriverId,
//                segments: [{driverId, driverName, startedAt, endedAt, billedSec}],
//                log: [{at, actor, actorName, action, reason, billedSec}] }

function ensureMeter(ride: any): any {
  if (!ride.meter) {
    const start = ride.startedAt || ride.acceptedAt || ride.createdAt || new Date().toISOString();
    ride.meter = {
      state: "running",
      accumulatedSec: 0,
      lastResumeAt: start,
      currentDriverId: ride.driverId || ride.driver_id || null,
      segments: [{
        driverId: ride.driverId || ride.driver_id || null,
        driverName: ride.driverName || null,
        startedAt: start,
        endedAt: null,
        billedSec: 0,
      }],
      log: [{ at: start, actor: "system", actorName: "Système", action: "start", reason: "Début de course", billedSec: 0 }],
    };
  }
  return ride.meter;
}

function meterBilledSec(ride: any): number {
  const m = ensureMeter(ride);
  let total = m.accumulatedSec || 0;
  if (m.state === "running" && m.lastResumeAt) {
    total += Math.max(0, Math.floor((Date.now() - new Date(m.lastResumeAt).getTime()) / 1000));
  }
  return total;
}

function meterLog(ride: any, entry: any): void {
  const m = ensureMeter(ride);
  m.log.push({ at: new Date().toISOString(), billedSec: meterBilledSec(ride), ...entry });
  if (m.log.length > 200) m.log = m.log.slice(-200);
}

async function pushToRideParties(ride: any, title: string, body: string, data: Record<string, string>): Promise<void> {
  try {
    const did = ride.driverId || ride.driver_id;
    if (did) {
      const driver = await kv.get<any>(`driver:${did}`);
      if (driver?.fcmToken) {
        await sendFCMNotification(driver.fcmToken, { title, body, data });
      }
    }
  } catch (e) { console.warn("push driver:", e); }
  try {
    const pid = ride.passengerId || ride.passenger_id;
    if (pid) {
      const t = await kv.get(`fcm_token_${pid}`);
      const token = typeof t === "string" ? t : t?.token;
      if (token) {
        await sendFCMNotification(token, { title, body, data });
      }
    }
  } catch (e) { console.warn("push passenger:", e); }
}

const METER_REASONS = ["panne", "crevaison", "urgence", "convenance", "transfert", "cloture", "autre"];

// POST /:id/meter - Télécommande admin : pause | resume | stop (+ motif obligatoire)
// ============================================
app.post("/:id/meter", async (c) => {
  try {
    const rideId = c.req.param("id");
    const { action, reason, adminId, adminName } = await c.req.json();
    if (!isValidUUID(rideId)) {
      return c.json({ success: false, error: "ID course invalide" }, 400);
    }
    if (!["pause", "resume", "stop"].includes(action)) {
      return c.json({ success: false, error: "Action invalide (pause|resume|stop)" }, 400);
    }
    if (!reason) {
      return c.json({ success: false, error: "Motif obligatoire" }, 400);
    }
    const ride = await kv.get<any>(`ride:${rideId}`);
    if (!ride) {
      return c.json({ success: false, error: "Course introuvable" }, 404);
    }
    if (!["accepted", "enroute", "arrived", "in_progress"].includes(ride.status)) {
      return c.json({ success: false, error: "Course non active" }, 400);
    }

    const m = ensureMeter(ride);
    const who = adminName || "Admin";
    if (action === "pause") {
      if (m.state !== "running") {
        return c.json({ success: false, error: "Chronomètre non actif" }, 400);
      }
      m.accumulatedSec = meterBilledSec(ride);
      m.lastResumeAt = null;
      m.state = "paused";
      meterLog(ride, { actor: "admin", actorId: adminId || null, actorName: who, action: "pause", reason });
      await kv.set(`ride:${rideId}`, ride);
      await pushToRideParties(ride, "⏸️ Chronomètre suspendu", `Suspendu par SmartCabb (${reason}). Le temps d'arrêt n'est pas facturé.`, { type: "meter_paused", rideId });
    } else if (action === "resume") {
      if (m.state !== "paused") {
        return c.json({ success: false, error: "Chronomètre non suspendu" }, 400);
      }
      m.lastResumeAt = new Date().toISOString();
      m.state = "running";
      meterLog(ride, { actor: "admin", actorId: adminId || null, actorName: who, action: "resume", reason });
      await kv.set(`ride:${rideId}`, ride);
      await pushToRideParties(ride, "▶️ Chronomètre repris", `Repris par SmartCabb (${reason}).`, { type: "meter_resumed", rideId });
    } else {
      if (m.state === "stopped") {
        return c.json({ success: false, error: "Chronomètre déjà arrêté" }, 400);
      }
      m.accumulatedSec = meterBilledSec(ride);
      m.lastResumeAt = null;
      m.state = "stopped";
      const seg = m.segments[m.segments.length - 1];
      if (seg && !seg.endedAt) {
        seg.endedAt = new Date().toISOString();
        seg.billedSec = m.accumulatedSec - m.segments.slice(0, -1).reduce((s: number, x: any) => s + (x.billedSec || 0), 0);
      }
      ride.meterFinalSec = m.accumulatedSec;
      meterLog(ride, { actor: "admin", actorId: adminId || null, actorName: who, action: "stop", reason });
      await kv.set(`ride:${rideId}`, ride);
      await pushToRideParties(ride, "⏹️ Chronomètre arrêté", `Arrêté par SmartCabb (${reason}). Montant arrêté : ${m.accumulatedSec}s facturables.`, { type: "meter_stopped", rideId });
    }

    await logAdminEvent("ride_meter", {
      rideId, action, reason, adminId: adminId || null, adminName: who,
      billedSec: m.accumulatedSec,
      driverId: ride.driverId || ride.driver_id || null,
    });
    return c.json({ success: true, meter: m });
  } catch (error) {
    console.error("Erreur meter:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// POST /:id/transfer/propose - Proposer le transfert à un autre conducteur
// Body : { toDriverId, reason, adminId, adminName }
// ============================================
app.post("/:id/transfer/propose", async (c) => {
  try {
    const rideId = c.req.param("id");
    const { toDriverId, reason, adminId, adminName } = await c.req.json();
    if (!isValidUUID(rideId) || !toDriverId) {
      return c.json({ success: false, error: "Paramètres invalides" }, 400);
    }
    if (!reason) {
      return c.json({ success: false, error: "Motif obligatoire" }, 400);
    }
    const ride = await kv.get<any>(`ride:${rideId}`);
    if (!ride) {
      return c.json({ success: false, error: "Course introuvable" }, 404);
    }
    if (!["accepted", "enroute", "arrived", "in_progress"].includes(ride.status)) {
      return c.json({ success: false, error: "Course non active" }, 400);
    }
    const fromId = ride.driverId || ride.driver_id;
    if (fromId === toDriverId) {
      return c.json({ success: false, error: "Même conducteur" }, 400);
    }
    if (ride.transferProposal) {
      return c.json({ success: false, error: "Un transfert est déjà proposé" }, 400);
    }

    const nd = await kv.get<any>(`driver:${toDriverId}`);
    if (!nd) {
      return c.json({ success: false, error: "Conducteur destinataire introuvable" }, 404);
    }
    if (!isDriverOnline(nd) || !isDriverAvailable(nd)) {
      return c.json({ success: false, error: "Conducteur non disponible" }, 400);
    }
    const rideCat = ride.vehicleCategory || ride.vehicle_category;
    const ndCat = nd.vehicleCategory || nd.vehicle_category || nd.vehicle_type || nd.vehicleType || nd.vehicle?.category || nd.vehicle?.type;
    if (!categoriesCompatible(ndCat, rideCat)) {
      return c.json({ success: false, error: "Catégorie de véhicule incompatible" }, 400);
    }
    // Conducteur déjà occupé ?
    const allRides = await kv.getByPrefix("ride:");
    const busy = allRides.some((r: any) =>
      (r.driverId === toDriverId || r.driver_id === toDriverId) &&
      ["accepted", "enroute", "arrived", "in_progress"].includes(r.status) &&
      r.id !== rideId
    );
    if (busy) {
      return c.json({ success: false, error: "Conducteur déjà en course" }, 400);
    }

    // Geler le compteur pendant le transfert
    const m = ensureMeter(ride);
    if (m.state === "running") {
      m.accumulatedSec = meterBilledSec(ride);
      m.lastResumeAt = null;
      m.state = "paused";
    }
    meterLog(ride, { actor: "admin", actorId: adminId || null, actorName: adminName || "Admin", action: "transfer_proposed", reason });
    ride.transferProposal = { toDriverId, reason, at: new Date().toISOString(), by: adminId || null, byName: adminName || "Admin" };
    await kv.set(`ride:${rideId}`, ride);

    const notif = {
      rideId,
      type: "transfer_ride_request",
      transfer: true,
      reason,
      pickupName: typeof ride.pickup === "object" ? (ride.pickup?.address || ride.pickup?.name) : ride.pickup,
      destinationName: typeof ride.destination === "object" ? (ride.destination?.address || ride.destination?.name) : ride.destination,
      passengerName: ride.passengerName || "Passager",
      vehicleCategory: rideCat,
      notifiedAt: new Date().toISOString(),
    };
    await kv.set(`driver_notification:${toDriverId}`, notif);
    if (nd.fcmToken) {
      await sendFCMNotification(nd.fcmToken, {
        title: "🔄 Transfert de course proposé",
        body: `Reprendre une course en cours (${notif.pickupName} → ${notif.destinationName}). Motif : ${reason}.`,
        data: { type: "transfer_ride_request", rideId },
      });
    }

    // Ancien conducteur + passager informés
    await pushToRideParties(ride, "🔄 Transfert en cours", `Transfert proposé (${reason}). Compteur gelé en attendant.`, { type: "transfer_proposed", rideId });
    await logAdminEvent("ride_transfer_proposed", {
      rideId, fromDriverId: fromId, toDriverId,
      toDriverName: nd.full_name || nd.name || null, reason,
      adminId: adminId || null, adminName: adminName || "Admin",
    });
    return c.json({ success: true });
  } catch (error) {
    console.error("Erreur transfer propose:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// POST /:id/transfer/accept - Le nouveau conducteur accepte le transfert
// ============================================
app.post("/:id/transfer/accept", async (c) => {
  try {
    const rideId = c.req.param("id");
    const { driverId } = await c.req.json();
    if (!isValidUUID(rideId) || !driverId) {
      return c.json({ success: false, error: "Paramètres invalides" }, 400);
    }
    const ride = await kv.get<any>(`ride:${rideId}`);
    if (!ride?.transferProposal || ride.transferProposal.toDriverId !== driverId) {
      return c.json({ success: false, error: "Aucune proposition pour vous" }, 400);
    }
    const nd = await kv.get<any>(`driver:${driverId}`);
    if (!nd) {
      return c.json({ success: false, error: "Conducteur introuvable" }, 404);
    }

    const m = ensureMeter(ride);
    // Clôturer le segment précédent (montant partiel prorata temporis au journal)
    const prevSeg = m.segments[m.segments.length - 1];
    if (prevSeg && !prevSeg.endedAt) {
      prevSeg.endedAt = new Date().toISOString();
      const before = m.segments.slice(0, -1).reduce((s: number, x: any) => s + (x.billedSec || 0), 0);
      prevSeg.billedSec = Math.max(0, m.accumulatedSec - before);
    }
    const oldDriverId = ride.driverId || ride.driver_id;
    const oldDriverName = ride.driverName;
    ride.driverId = driverId;
    ride.driver_id = driverId;
    ride.driverName = nd.full_name || nd.name || "Conducteur";
    ride.driverPhone = nd.phone || "";
    ride.transferProposal = null;
    m.currentDriverId = driverId;
    m.segments.push({
      driverId,
      driverName: ride.driverName,
      startedAt: new Date().toISOString(),
      endedAt: null,
      billedSec: 0,
    });
    // Reprise du compteur par le nouveau conducteur
    m.lastResumeAt = new Date().toISOString();
    m.state = "running";
    meterLog(ride, { actor: "driver", actorId: driverId, actorName: ride.driverName, action: "transfer_accepted", reason: "Transfert accepté" });
    await kv.set(`ride:${rideId}`, ride);
    await kv.delete(`driver_notification:${driverId}`);

    await pushToRideParties(ride, "✅ Transfert effectué", `${ride.driverName} reprend la course. Compteur relancé.`, { type: "transfer_done", rideId });
    // Prévenir l'ancien conducteur
    try {
      const od = oldDriverId ? await kv.get<any>(`driver:${oldDriverId}`) : null;
      if (od?.fcmToken) {
        await sendFCMNotification(od.fcmToken, {
          title: "🔄 Course transférée",
          body: "La course a été reprise par un autre conducteur. Merci.",
          data: { type: "transfer_relieved", rideId },
        });
      }
    } catch (e) { console.warn("push ancien conducteur:", e); }
    await logAdminEvent("ride_transfer_accepted", {
      rideId, oldDriverId, oldDriverName, newDriverId: driverId, newDriverName: ride.driverName,
    });
    return c.json({ success: true, ride });
  } catch (error) {
    console.error("Erreur transfer accept:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// POST /:id/transfer/decline - Le nouveau conducteur refuse le transfert
// ============================================
app.post("/:id/transfer/decline", async (c) => {
  try {
    const rideId = c.req.param("id");
    const { driverId } = await c.req.json();
    if (!isValidUUID(rideId) || !driverId) {
      return c.json({ success: false, error: "Paramètres invalides" }, 400);
    }
    const ride = await kv.get<any>(`ride:${rideId}`);
    if (!ride?.transferProposal || ride.transferProposal.toDriverId !== driverId) {
      return c.json({ success: false, error: "Aucune proposition pour vous" }, 400);
    }
    const m = ensureMeter(ride);
    meterLog(ride, { actor: "driver", actorId: driverId, actorName: null, action: "transfer_declined", reason: "Transfert refusé" });
    ride.transferProposal = null;
    await kv.set(`ride:${rideId}`, ride);
    await kv.delete(`driver_notification:${driverId}`);
    await logAdminEvent("ride_transfer_declined", { rideId, driverId });
    return c.json({ success: true });
  } catch (error) {
    console.error("Erreur transfer decline:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// GET /:id/journal - Journal complet : incidents + compteur (transparence)
// ============================================
app.get("/:id/journal", async (c) => {
  try {
    const rideId = c.req.param("id");
    if (!isValidUUID(rideId)) {
      return c.json({ success: false, error: "ID course invalide" }, 400);
    }
    const ride = await kv.get<any>(`ride:${rideId}`);
    if (!ride) {
      return c.json({ success: false, error: "Course non trouvée" }, 404);
    }
    const incidents = await kvGetByPrefix(`incident:${rideId}:`);
    incidents.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const m = ride.meter || null;
    return c.json({
      success: true,
      journal: {
        rideId,
        status: ride.status,
        meter: m ? {
          state: m.state,
          billedSec: meterBilledSec(ride),
          currentDriverId: m.currentDriverId,
          segments: m.segments || [],
          log: m.log || [],
        } : null,
        incidents,
      },
    });
  } catch (error) {
    console.error("Erreur journal:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// POST /admin-process-one - L'admin crée la course d'une réservation immédiatement// Body : { scheduledRideId, mode: 'preassigned' | 'automatch' }
//  - preassigned : conducteur accepté → course créée directement pour lui (pas de matching).
//  - automatch : libère l'attribution (declined-système) → searching + matching même catégorie.
// ============================================
app.post("/admin-process-one", async (c) => {
  try {
    const { scheduledRideId, mode } = await c.req.json();
    if (!scheduledRideId || (mode !== "preassigned" && mode !== "automatch")) {
      return c.json({ success: false, error: "scheduledRideId et mode (preassigned|automatch) requis" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: sr, error } = await supabase
      .from("scheduled_rides").select("*").eq("id", scheduledRideId).maybeSingle();
    if (error || !sr) {
      return c.json({ success: false, error: "Réservation introuvable" }, 404);
    }
    if (sr.status !== "scheduled" && sr.status !== "confirmed") {
      return c.json({ success: false, error: "Réservation déjà traitée ou annulée" }, 400);
    }

    // ⏰ Ne pas transformer une réservation en course AVANT l'heure prévue :
    // la course serait créée (et le chauffeur envoyé) une heure trop tôt, et à
    // l'heure réelle plus rien ne se déclencherait (réservation déjà « traitée »).
    // Heure saisie en local Kinshasa (UTC+1) → conversion en UTC.
    const offsetMin = parseInt(Deno.env.get("BUSINESS_UTC_OFFSET_MINUTES") || "60");
    const rawStart = Date.parse(
      `${sr.scheduled_date}T${String(sr.scheduled_time || "00:00").slice(0, 8)}Z`,
    );
    const startMs = Number.isFinite(rawStart) ? rawStart - offsetMin * 60000 : NaN;
    const minutesUntil = (startMs - Date.now()) / 60000;
    const earlyWindow = Number(Deno.env.get("SCHEDULED_RIDE_EARLY_MINUTES") || "15");
    if (Number.isFinite(minutesUntil) && minutesUntil > earlyWindow) {
      return c.json({
        success: false,
        error: `Trop tôt : cette réservation est prévue le ${sr.scheduled_date} à ${String(sr.scheduled_time || "").slice(0, 5)}. ` +
          `Elle sera traitée automatiquement ${earlyWindow} min avant l'heure prévue.`,
        minutesUntil: Math.round(minutesUntil),
      }, 409);
    }

    const passengerProfile = await kvGet(`passenger:${sr.user_id}`);
    const base: any = {
      id: crypto.randomUUID(),
      passengerId: sr.user_id,
      passengerName: passengerProfile?.full_name || passengerProfile?.name || "Passager",
      passengerPhone: passengerProfile?.phone || passengerProfile?.phone_number || "",
      pickup: { name: sr.pickup_address, address: sr.pickup_address, coordinates: { lat: sr.pickup_lat, lng: sr.pickup_lng } },
      destination: { name: sr.dropoff_address, address: sr.dropoff_address, coordinates: { lat: sr.dropoff_lat, lng: sr.dropoff_lng } },
      vehicleCategory: sr.category,
      // 💰 L'acompte (50 %) a déjà été réglé à la réservation : la course
            // n'affiche et ne facture QUE le reste à payer. Le total reste
            // stocké pour le calcul des gains du conducteur.
            estimatedPrice: Math.max(
              0,
              (Number(sr.estimated_price) || 0) -
                (sr.deposit_received ? Math.round((Number(sr.estimated_price) || 0) * 0.5) : 0),
            ),
            scheduledTotalPrice: Number(sr.estimated_price) || 0,
            scheduledDepositPaid: sr.deposit_received
              ? Math.round((Number(sr.estimated_price) || 0) * 0.5)
              : 0,
            depositMethod: sr.deposit_method || null,
      distance: 0,
      duration: 0,
      pickupAddress: sr.pickup_address,
      destinationAddress: sr.dropoff_address,
      createdAt: new Date().toISOString(),
      isScheduled: true,
      scheduledDate: sr.scheduled_date,
      scheduledTime: sr.scheduled_time,
      scheduledRideId: sr.id,
      passengerCount: 1,
    };

    if (mode === "preassigned") {
      if (!sr.driver_id || sr.driver_status !== "accepted") {
        return c.json({ success: false, error: "Aucun conducteur accepté — utilisez le matching auto" }, 400);
      }
      const driver = await kvGet<any>(`driver:${sr.driver_id}`);
      const ride = {
        ...base,
        driverId: sr.driver_id,
        driverName: driver?.full_name || driver?.name || sr.driver_name || "Conducteur",
        driverPhone: driver?.phone || "",
        status: "accepted",
        acceptedAt: new Date().toISOString(),
      };
      await kv.set(`ride:${ride.id}`, ride);
      await kv.set(`scheduled_ride:${sr.id}`, ride.id);
      await supabase.from("scheduled_rides").update({ status: "completed" }).eq("id", sr.id);
      if (driver?.fcmToken) {
        await sendFCMNotification(driver.fcmToken, {
          title: "🚖 Votre course réservée démarre",
          body: `${sr.pickup_address} → ${sr.dropoff_address}. Mettez-vous en route.`,
          data: { type: "reservation_started", rideId: ride.id, reservationId: sr.id },
        });
      }
      await notifyPassenger(sr.user_id, {
        title: "🚖 Votre chauffeur est en route",
        body: `${ride.driverName} · ${sr.pickup_address} → ${sr.dropoff_address}. Suivez votre course dans l'app.`,
        data: { type: "reservation_driver_enroute", rideId: ride.id, reservationId: sr.id },
      });
      console.log(`Course forcee pre-attribuee: ${ride.id} (reservation ${sr.id})`);
      return c.json({ success: true, rideId: ride.id, mode: "preassigned" });
    }

    // automatch : libère l'attribution puis matching auto même catégorie
    await supabase.from("scheduled_rides").update({ driver_status: "declined" }).eq("id", sr.id);
    const ride = { ...base, status: "searching" };
    await kv.set(`ride:${ride.id}`, ride);
    await kv.set(`scheduled_ride:${sr.id}`, ride.id);
    const matchingResult = await findAndNotifyNearbyDrivers(ride);
    await supabase.from("scheduled_rides").update({ status: "completed" }).eq("id", sr.id);
    await notifyPassenger(sr.user_id, {
      title: "SmartCabb - Course programmee",
      body: `Votre course ${sr.pickup_address} vers ${sr.dropoff_address} est en cours de traitement. Un chauffeur arrive bientot.`,
      data: { type: "scheduled_ride_processing", rideId: ride.id, reservationId: sr.id },
    });
    console.log(`Course forcee matching auto: ${ride.id} (reservation ${sr.id})`);
    return c.json({ success: true, rideId: ride.id, mode: "automatch", matching: matchingResult.success ? "success" : "no_driver" });
  } catch (error) {
    console.error("Erreur admin-process-one:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default app;
