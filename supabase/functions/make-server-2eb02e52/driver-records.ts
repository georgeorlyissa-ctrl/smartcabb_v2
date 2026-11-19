/**
 * 🚑 Fiches conducteur : lecture allégée + réparation des fiches perdues
 *
 * Deux problèmes réels observés en production :
 *
 * 1. LECTURE LOURDE ET FRAGILE — chaque fiche `driver:<id>` embarque la photo
 *    de profil en base64 (jusqu'à 1,3 Mo). Lire tous les conducteurs
 *    (`like 'driver:%'`) ramenait ~5 Mo à chaque recherche passager, et une
 *    lecture en échec renvoyait `[]` en silence → « aucun chauffeur ».
 *    ➜ `loadDriversLite()` ne sélectionne que les petits champs utiles au
 *      matching (projection JSON côté PostgREST) avec nouvelles tentatives, et
 *      LÈVE une erreur si la base reste indisponible.
 *
 * 2. FICHES ÉCRASÉES — `fcm/register-driver-token` créait un placeholder
 *    `{ status: 'pending', … }` quand la lecture de la fiche échouait, ce qui
 *    remplaçait la vraie fiche. Le conducteur ne pouvait plus passer en ligne
 *    (403 « compte non approuvé »).
 *    ➜ `rebuildDriverRecord()` reconstruit la fiche depuis `profile:<id>`,
 *      Supabase Auth, l'historique des courses et le portefeuille.
 *
 * ⚠️ Règles de sûreté
 *  - Aucune fiche n'est créée sans compte Supabase Auth existant.
 *  - Aucune donnée n'est inventée : un solde inconnu vaut 0 et la fiche porte
 *    `needsBalanceReview: true` pour que l'admin le vérifie.
 *  - Une fiche reconstruite démarre HORS LIGNE : c'est le conducteur qui
 *    décide de se remettre en ligne.
 */

import { createClient } from "npm:@supabase/supabase-js@2";

const KV_TABLE = "kv_store_2eb02e52";

function kvClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const RETRY_DELAYS_MS = [0, 250, 800];

// ─── Lectures strictes (jamais de « null / [] » en cas d'erreur) ─────────────

async function kvGetStrict(key: string): Promise<any | null> {
  let lastError = "";
  for (const delay of RETRY_DELAYS_MS) {
    if (delay) await sleep(delay);
    try {
      const { data, error } = await kvClient()
        .from(KV_TABLE).select("value").eq("key", key).maybeSingle();
      if (!error) return data?.value ?? null;
      lastError = error.message;
    } catch (e: any) {
      lastError = String(e?.message || e);
    }
  }
  throw new Error(`KV get ${key}: ${lastError}`);
}

async function kvGetByPrefixStrict(prefix: string): Promise<any[]> {
  let lastError = "";
  for (const delay of RETRY_DELAYS_MS) {
    if (delay) await sleep(delay);
    try {
      const { data, error } = await kvClient()
        .from(KV_TABLE).select("value").like("key", prefix + "%");
      if (!error) return (data || []).map((row: any) => row.value);
      lastError = error.message;
    } catch (e: any) {
      lastError = String(e?.message || e);
    }
  }
  throw new Error(`KV getByPrefix ${prefix}: ${lastError}`);
}

async function kvSetStrict(key: string, value: any): Promise<void> {
  const { error } = await kvClient().from(KV_TABLE).upsert({ key, value });
  if (error) throw new Error(`KV set ${key}: ${error.message}`);
}

async function kvDelete(key: string): Promise<void> {
  const { error } = await kvClient().from(KV_TABLE).delete().eq("key", key);
  if (error) throw new Error(`KV delete ${key}: ${error.message}`);
}

/**
 * Lecture stricte pour les autres modules : lève une erreur quand la base est
 * indisponible, au lieu de renvoyer `null` (qui se confond avec « absent » et
 * conduit des handlers à créer une fiche vierge par-dessus la vraie).
 */
export const readKvStrict = kvGetStrict;

// ─── Lecture ALLÉGÉE de tous les conducteurs ─────────────────────────────────

/** Champs utiles au matching, à l'affichage carte et aux notifications. */
const LITE_FIELDS = [
  "id", "userId", "full_name", "name", "phone", "email", "role",
  "status", "isApproved", "is_approved",
  "isOnline", "is_online", "is_available", "available", "status_online",
  "activeRideId", "active_ride_id", "currentRideId", "current_ride_id",
  "vehicleCategory", "vehicle_category", "vehicle_type", "vehicleType",
  "balance", "creditBalance", "accountBalance",
  "rating", "note", "totalRides", "total_rides", "total_trips",
  "cleanliness", "vehicle_cleanliness", "preferences", "ride_preferences",
  "fcmToken", "fcmPlatform", "fcmAppVersion", "fcmTokenUpdatedAt",
  "lastSeenAt", "updated_at",
  "currentLocation", "current_location", "location", "lastLocation", "last_location",
  "locationUpdatedAt", "location_updated_at",
  "recoveredFrom", "recoveredAt",
];

// `alias:value->champ` = projection JSON PostgREST : seuls ces champs voyagent,
// les photos base64 restent en base.
const LITE_SELECT = [
  "key",
  ...LITE_FIELDS.map((field) => `${field}:value->${field}`),
  "vehCategory:value->vehicle->category",
  "vehType:value->vehicle->type",
].join(",");

/** Au-delà de cette taille, une chaîne est une image/un document : on l'écarte. */
const HEAVY_STRING_CHARS = 20_000;

function stripHeavy(value: any): any {
  if (!value || typeof value !== "object") return value;
  const out: any = Array.isArray(value) ? [] : {};
  for (const [k, v] of Object.entries(value)) {
    if (typeof v === "string" && v.length > HEAVY_STRING_CHARS) continue;
    out[k] = v && typeof v === "object" ? stripHeavy(v) : v;
  }
  return out;
}

function normalizeLiteRow(row: any): any {
  const out: any = {};
  for (const [k, v] of Object.entries(row)) {
    if (k === "key" || k === "vehCategory" || k === "vehType") continue;
    if (v !== null && v !== undefined) out[k] = v;
  }
  if (!out.id) out.id = String(row.key || "").replace(/^driver:/, "");
  if (row.vehCategory || row.vehType) {
    out.vehicle = {
      ...(row.vehCategory ? { category: row.vehCategory } : {}),
      ...(row.vehType ? { type: row.vehType } : {}),
    };
  }
  return out;
}

async function fetchDriversLite(): Promise<any[]> {
  let lastError = "";
  for (const delay of RETRY_DELAYS_MS) {
    if (delay) await sleep(delay);
    try {
      const { data, error } = await kvClient()
        .from(KV_TABLE).select(LITE_SELECT).like("key", "driver:%");
      if (!error) return (data || []).map(normalizeLiteRow);
      lastError = error.message;
    } catch (e: any) {
      lastError = String(e?.message || e);
    }
  }

  // Dernier recours : lecture complète (lourde mais fidèle), photos écartées.
  console.warn(`⚠️ [DRIVER-RECORDS] Projection indisponible (${lastError}) → lecture complète`);
  const { data, error } = await kvClient()
    .from(KV_TABLE).select("key, value").like("key", "driver:%");
  if (error) throw new Error(`Lecture des conducteurs impossible: ${error.message}`);
  return (data || []).map((row: any) => {
    const value = stripHeavy(row.value) || {};
    if (!value.id) value.id = String(row.key || "").replace(/^driver:/, "");
    return value;
  });
}

let liteCache: { at: number; drivers: any[] } | null = null;

const cloneDrivers = (drivers: any[]): any[] => JSON.parse(JSON.stringify(drivers));

/**
 * Tous les conducteurs, sans leurs photos.
 * `maxAgeMs` : réutilise un instantané récent (lectures répétées des cartes) ;
 * 0 / absent = lecture fraîche (matching, acceptation…).
 * Lève une erreur si la base est indisponible (jamais de liste vide trompeuse).
 */
export async function loadDriversLite(opts: { maxAgeMs?: number } = {}): Promise<any[]> {
  const maxAge = opts.maxAgeMs ?? 0;
  if (maxAge > 0 && liteCache && Date.now() - liteCache.at < maxAge) {
    return cloneDrivers(liteCache.drivers);
  }
  const drivers = await fetchDriversLite();
  liteCache = { at: Date.now(), drivers };
  return cloneDrivers(drivers);
}

/** À appeler après un changement EN LIGNE / HORS LIGNE. */
export function invalidateDriversLiteCache(): void {
  liteCache = null;
}

const LIVE_FIELDS = [
  "currentLocation", "current_location", "location", "lastLocation", "last_location",
  "locationUpdatedAt", "location_updated_at", "isOnline", "is_online",
];
const LIVE_SELECT = ["key", ...LIVE_FIELDS.map((field) => `${field}:value->${field}`)].join(",");

/**
 * Position + présence d'UN conducteur, sans charger sa fiche complète (photo
 * base64 jusqu'à 1,3 Mo) : les écrans de suivi l'interrogent toutes les
 * quelques secondes. `null` si la fiche n'existe pas ; erreur si la base est
 * indisponible.
 */
export async function readDriverLiveLite(driverId: string): Promise<any | null> {
  let lastError = "";
  for (const delay of RETRY_DELAYS_MS) {
    if (delay) await sleep(delay);
    try {
      const { data, error } = await kvClient()
        .from(KV_TABLE).select(LIVE_SELECT).eq("key", `driver:${driverId}`).maybeSingle();
      if (!error) return data ? normalizeLiteRow(data) : null;
      lastError = error.message;
    } catch (e: any) {
      lastError = String(e?.message || e);
    }
  }
  throw new Error(`KV live ${driverId}: ${lastError}`);
}

// ─── Utilitaires conducteur ──────────────────────────────────────────────────

/** Position du conducteur, quel que soit le format historiquement utilisé. */
export function readDriverPosition(d: any): { lat: number; lng: number } | null {
  const candidates = [
    d?.currentLocation, d?.current_location, d?.location, d?.lastLocation,
    d?.last_location, d?.position, d?.geo,
  ];
  for (const c of candidates) {
    const lat = Number(c?.lat ?? c?.latitude);
    const lng = Number(c?.lng ?? c?.lon ?? c?.longitude);
    if (Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0) {
      return { lat, lng };
    }
  }
  const lat = Number(d?.lat ?? d?.latitude);
  const lng = Number(d?.lng ?? d?.lon ?? d?.longitude);
  if (Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0) return { lat, lng };
  return null;
}

/**
 * Fiche « coquille » : aucune identité (ni nom, ni téléphone, ni email).
 * Un vrai compte conducteur en a toujours une ; une coquille est le reliquat
 * d'un enregistrement de token FCM qui a écrasé la vraie fiche.
 */
export function isPlaceholderDriverRecord(d: any): boolean {
  if (!d || typeof d !== "object") return false;
  return !(d.full_name || d.name || d.phone || d.email);
}

function metaFromAuthUser(user: any): any {
  const m = user?.user_metadata || {};
  return {
    full_name: m.full_name || m.name || m.display_name,
    phone: m.phone || m.phone_number || user?.phone,
    email: user?.email,
    role: m.role || user?.app_metadata?.role,
    vehicleCategory: m.vehicleCategory || m.vehicle_category,
  };
}

interface DriverHistory {
  category?: string;
  rides: number;
  completed: number;
  earnings: number;
  rechargeBalance?: number;
  plate?: string;
  model?: string;
}

/** Agrège l'historique d'un conducteur (courses + recharges de crédit). */
function summarizeHistory(driverId: string, rides: any[], walletTxs: any[]): DriverHistory {
  const history: DriverHistory = { rides: 0, completed: 0, earnings: 0 };
  let latestRideTs = 0;

  for (const ride of rides) {
    const rid = ride?.driverId || ride?.driver_id;
    if (!rid || String(rid) !== driverId) continue;
    history.rides += 1;
    const ts = Date.parse(ride?.completed_at || ride?.completedAt || ride?.createdAt || ride?.created_at || "") || 0;
    if (ts >= latestRideTs) {
      latestRideTs = ts;
      const cat = ride?.vehicleCategory || ride?.vehicle_category || ride?.vehicleType || ride?.vehicle_type;
      if (cat) history.category = cat;
      if (ride?.vehicle_plate) history.plate = ride.vehicle_plate;
      if (ride?.vehicle_model) history.model = ride.vehicle_model;
    }
    if (ride?.status === "completed" || ride?.status === "rated") {
      history.completed += 1;
      const amount = ride?.total_amount ?? ride?.finalPrice ?? ride?.totalPrice ?? ride?.estimatedPrice ?? ride?.estimated_price ?? 0;
      history.earnings += Number(amount) || 0;
    }
  }

  // Seules les RECHARGES de crédit portent le solde `balance` ; les retraits
  // (`withdraw*`) portent le solde bonus et fausseraient le crédit.
  let rechargeTs = -1;
  for (const tx of walletTxs) {
    if (String(tx?.driverId || "") !== driverId) continue;
    if (tx?.type !== "recharge" || tx?.status === "failed") continue;
    const after = Number(tx?.balanceAfter);
    if (!Number.isFinite(after)) continue;
    const ts = Date.parse(tx?.completed_at || tx?.created_at || "") || 0;
    if (ts >= rechargeTs) {
      rechargeTs = ts;
      history.rechargeBalance = after;
    }
  }
  return history;
}

const pickNumber = (...values: any[]): number | undefined => {
  for (const v of values) {
    const n = typeof v === "number" ? v : (typeof v === "string" && v.trim() !== "" ? Number(v) : NaN);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
};

/** Champs d'une coquille à conserver (token FCM, position, présence). */
const CARRY_OVER_KEYS = [
  "fcmToken", "fcmPlatform", "fcmAppVersion", "fcmTokenUpdatedAt", "lastSeenAt",
  "location", "currentLocation", "current_location", "lastLocation", "last_location",
  "locationUpdatedAt", "location_updated_at",
];

function buildDriverRecord(
  driverId: string,
  meta: any,
  profile: any,
  history: DriverHistory,
  existing: any,
): any {
  const now = new Date().toISOString();
  const base = profile && typeof profile === "object" ? { ...profile } : {};

  const name = profile?.full_name || profile?.name || meta?.full_name || meta?.name || "Conducteur";
  const phone = profile?.phone || meta?.phone || "";
  const email = profile?.email || meta?.email || "";

  const category =
    profile?.vehicleCategory || profile?.vehicle_category || profile?.vehicle_type || profile?.vehicleType ||
    profile?.vehicle?.category || profile?.vehicle?.type ||
    meta?.vehicleCategory || history.category || "smart_standard";

  // L'approbation n'est reprise que sur preuve (profil approuvé ou courses déjà
  // effectuées) : une coquille sans passé ne doit PAS devenir « approuvée ».
  const approved =
    profile?.status === "approved" || profile?.isApproved === true || profile?.is_approved === true ||
    history.completed > 0;

  const profileBalance = pickNumber(profile?.balance, profile?.creditBalance);
  const balance = profileBalance ?? history.rechargeBalance ?? 0;
  const balanceSource = profileBalance !== undefined
    ? "profile"
    : history.rechargeBalance !== undefined ? "wallet_recharge" : "none";

  const carried: any = {};
  for (const key of CARRY_OVER_KEYS) {
    if (existing && existing[key] !== undefined && existing[key] !== null) carried[key] = existing[key];
  }

  return {
    ...base,
    ...carried,
    id: driverId,
    userId: driverId,
    full_name: name,
    name,
    phone,
    email,
    role: "driver",
    status: approved ? "approved" : (profile?.status || "pending"),
    isApproved: approved,
    is_approved: approved,
    isOnline: false,
    is_online: false,
    is_available: false,
    available: false,
    vehicleCategory: category,
    vehicle_category: category,
    vehicleType: category,
    vehicle_type: category,
    vehicle: {
      ...(profile?.vehicle && typeof profile.vehicle === "object" ? profile.vehicle : {}),
      category,
      type: category,
      ...(history.plate && !profile?.vehicle?.license_plate ? { license_plate: history.plate } : {}),
      ...(history.model && !profile?.vehicle?.model ? { model: history.model } : {}),
    },
    balance,
    creditBalance: balance,
    earningsBalance: pickNumber(profile?.earningsBalance) ?? 0,
    bonusBalance: pickNumber(profile?.bonusBalance) ?? 0,
    rating: pickNumber(profile?.rating) ?? 5,
    total_rides: history.completed,
    totalRides: history.completed,
    total_earnings: history.earnings,
    totalEarnings: history.earnings,
    // Traçabilité : cette fiche a été reconstruite, pas créée par un signup.
    recoveredAt: now,
    recoveredFrom: profile ? "profile+auth+rides" : "auth+rides",
    recoveredBalance: balance,
    recoveredBalanceSource: balanceSource,
    needsBalanceReview: balanceSource === "none",
    created_at: profile?.created_at || existing?.created_at || now,
    updated_at: now,
  };
}

async function syncProfileAfterRebuild(driverId: string, driver: any, meta: any, profile: any): Promise<void> {
  const now = new Date().toISOString();
  if (profile) {
    await kvSetStrict(`profile:${driverId}`, {
      ...profile,
      role: "driver",
      status: driver.status,
      isApproved: driver.isApproved,
      is_approved: driver.isApproved,
      isOnline: false,
      is_online: false,
      is_available: false,
      available: false,
      vehicleCategory: driver.vehicleCategory,
      vehicle_category: driver.vehicle_category,
      updated_at: now,
    });
    return;
  }
  await kvSetStrict(`profile:${driverId}`, {
    id: driverId,
    role: "driver",
    full_name: driver.full_name,
    name: driver.name,
    phone: driver.phone || meta?.phone || "",
    email: driver.email || meta?.email || "",
    status: driver.status,
    isApproved: driver.isApproved,
    is_approved: driver.isApproved,
    isOnline: false,
    is_online: false,
    is_available: false,
    available: false,
    vehicleCategory: driver.vehicleCategory,
    vehicle_category: driver.vehicle_category,
    balance: driver.balance,
    creditBalance: driver.creditBalance,
    recoveredAt: now,
    updated_at: now,
  });
}

/**
 * Reconstruit la fiche d'UN conducteur (absente ou réduite à une coquille).
 * Retourne la fiche valide, ou `null` si le compte n'existe pas / n'a jamais
 * été conducteur / si la base est indisponible.
 */
export async function rebuildDriverRecord(
  driverId: string,
  context?: { rides: any[]; walletTxs: any[] },
): Promise<any | null> {
  if (!driverId) return null;

  try {
    const existing = await kvGetStrict(`driver:${driverId}`);
    if (existing && !isPlaceholderDriverRecord(existing)) return existing;

    // Pas de compte Auth = compte supprimé : on ne ressuscite rien.
    let user: any = null;
    try {
      const { data } = await kvClient().auth.admin.getUserById(driverId);
      user = (data as any)?.user ?? null;
    } catch (e) {
      console.warn("🚑 [DRIVER-RECORDS] auth.getUserById:", driverId, e);
    }
    if (!user) {
      console.warn(`🚑 [DRIVER-RECORDS] Aucun compte Auth pour ${driverId} → pas de reconstruction`);
      return null;
    }

    const [profile, rides, walletTxs] = await Promise.all([
      kvGetStrict(`profile:${driverId}`),
      context ? Promise.resolve(context.rides) : kvGetByPrefixStrict("ride:"),
      context ? Promise.resolve(context.walletTxs) : kvGetByPrefixStrict("wallet_tx:"),
    ]);

    const meta = metaFromAuthUser(user);
    const history = summarizeHistory(driverId, rides, walletTxs);

    // Preuves que ce compte est un conducteur : rôle Auth/profil, courses
    // effectuées, ou coquille laissée par l'app conducteur.
    const wasDriver =
      meta.role === "driver" || profile?.role === "driver" ||
      history.rides > 0 || !!existing;
    if (!wasDriver) return null;

    const driver = buildDriverRecord(driverId, meta, profile, history, existing);
    await kvSetStrict(`driver:${driverId}`, driver);
    await syncProfileAfterRebuild(driverId, driver, meta, profile);
    invalidateDriversLiteCache();

    console.log(
      `🚑 [DRIVER-RECORDS] Fiche reconstruite : ${driver.name} (cat=${driver.vehicleCategory}, ` +
      `courses=${history.completed}, solde=${driver.balance} [${driver.recoveredBalanceSource}], ` +
      `approuvé=${driver.isApproved})`,
    );
    return driver;
  } catch (e) {
    console.error("❌ [DRIVER-RECORDS] Reconstruction impossible:", driverId, e);
    return null;
  }
}

export interface RebuildReport {
  rebuilt: number;
  scanned: number;
  authUsers: number;
  authError: string | null;
  failures: string[];
}

/**
 * Reconstruit **toutes** les fiches manquantes ou réduites à une coquille.
 * Opération lourde (lit toutes les courses) : à lancer à la demande,
 * jamais dans un chemin chaud.
 */
export async function rebuildAllDriverRecords(): Promise<RebuildReport> {
  const report: RebuildReport = { rebuilt: 0, scanned: 0, authUsers: 0, authError: null, failures: [] };
  try {
    const supabase = kvClient();
    const [rides, walletTxs, existingDrivers] = await Promise.all([
      kvGetByPrefixStrict("ride:"),
      kvGetByPrefixStrict("wallet_tx:"),
      loadDriversLite(),
    ]);

    const realIds = new Set<string>();
    const candidateIds = new Set<string>();
    for (const d of existingDrivers) {
      const id = String(d?.id || "");
      if (!id) continue;
      if (isPlaceholderDriverRecord(d)) candidateIds.add(id);
      else realIds.add(id);
    }

    // 1) Comptes Auth déclarés conducteurs.
    try {
      let page = 1;
      while (page <= 10) {
        const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
        if (error) { report.authError = error.message; break; }
        const users = data?.users || [];
        report.authUsers += users.length;
        for (const u of users) {
          if (metaFromAuthUser(u).role === "driver") candidateIds.add(String(u.id));
        }
        if (users.length < 1000) break;
        page += 1;
      }
    } catch (e: any) {
      report.authError = String(e?.message || e);
    }

    // 2) Ids apparus comme conducteur dans une course (rebuildDriverRecord
    //    vérifie ensuite que le compte Auth existe toujours).
    for (const ride of rides) {
      const rid = ride?.driverId || ride?.driver_id;
      if (rid) candidateIds.add(String(rid));
    }

    for (const id of candidateIds) {
      if (realIds.has(id)) continue;
      report.scanned += 1;
      try {
        const created = await rebuildDriverRecord(id, { rides, walletTxs });
        if (created) report.rebuilt += 1;
        else if (report.failures.length < 8) report.failures.push(`${id}: ignoré (compte inexistant ou jamais conducteur)`);
      } catch (e: any) {
        if (report.failures.length < 8) report.failures.push(`${id}: ${String(e?.message || e)}`);
      }
    }
    return report;
  } catch (e: any) {
    report.authError = report.authError || String(e?.message || e);
    console.error("❌ [DRIVER-RECORDS] Reconstruction globale impossible:", e);
    return report;
  }
}

/**
 * Supprime les fiches fantômes issues d'une reconstruction trop permissive :
 * marquées `recoveredFrom: 'auth+rides'`, sans téléphone ni email, et dont le
 * compte Auth n'existe plus. Retourne les ids supprimés.
 */
export async function purgeBogusRecoveredDrivers(): Promise<string[]> {
  const removed: string[] = [];
  const drivers = await loadDriversLite();
  for (const d of drivers) {
    if (d?.recoveredFrom !== "auth+rides" || d?.phone || d?.email) continue;
    const id = String(d.id);
    let user: any = null;
    try {
      const { data } = await kvClient().auth.admin.getUserById(id);
      user = (data as any)?.user ?? null;
    } catch { /* compte introuvable */ }
    if (user) continue;

    await kvDelete(`driver:${id}`);
    const profile = await kvGetStrict(`profile:${id}`);
    if (profile?.recoveredAt && !profile?.phone && !profile?.email) {
      await kvDelete(`profile:${id}`);
    }
    removed.push(id);
  }
  if (removed.length > 0) invalidateDriversLiteCache();
  return removed;
}
