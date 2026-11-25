/**
 * 🔐 AUTH GUARD - SMARTCABB
 *
 * L'Edge Function est déployée avec `verify_jwt = false` : le gateway Supabase
 * ne vérifie AUCUN jeton. Chaque route sensible doit donc contrôler elle-même
 * l'appelant. Ce module centralise ces contrôles :
 *
 *  - `requireUser()`         : session utilisateur réelle (jamais la clé anon)
 *  - `requireAdmin()`        : session + rôle admin + session 2FA serveur
 *  - `requireOwnerOrAdmin()` : la ressource appartient à l'appelant (ou admin)
 *  - `optionalUser()`        : identité facultative (routes publiques enrichies)
 *
 * @version 1.0.0
 */

import { createClient } from "npm:@supabase/supabase-js@2";

const KV_TABLE = "kv_store_2eb02e52";
const CONFIG_KEY = "smartcabb_global_config";
const ADMIN_2FA_SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 h
const ADMIN_2FA_SESSION_PREFIX = "admin_2fa_session:";

export type AuthOk<T = any> = { ok: true; user: T };
export type AuthFail = { ok: false; response: Response };
export type AuthResult<T = any> = AuthOk<T> | AuthFail;

const USER_CACHE_TTL_MS = 60_000;
const USER_CACHE_MAX = 500;
const userCache = new Map<string, { user: any; at: number }>();

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function bearerToken(c: any): string {
  const header = c.req.header("Authorization") || c.req.header("authorization") || "";
  const match = /^Bearer\s+(.+)$/i.exec(String(header).trim());
  return match ? match[1].trim() : "";
}

export function isAnonKey(token: string): boolean {
  const anon = Deno.env.get("SUPABASE_ANON_KEY") || "";
  return anon !== "" && token === anon;
}

function serviceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
}

async function kvGet(key: string): Promise<any> {
  try {
    const { data } = await serviceClient()
      .from(KV_TABLE).select("value").eq("key", key).maybeSingle();
    return data?.value ?? null;
  } catch (e) {
    console.error("KV get error:", key, e);
    return null;
  }
}

async function kvSet(key: string, value: any): Promise<void> {
  const { error } = await serviceClient().from(KV_TABLE).upsert({ key, value });
  if (error) throw new Error(error.message);
}

async function kvDel(key: string): Promise<void> {
  try { await serviceClient().from(KV_TABLE).delete().eq("key", key); } catch { /* ignore */ }
}

/** Rôle applicatif porté par le jeton (métadonnées Auth). */
export function roleOf(user: any): string {
  return String(
    user?.user_metadata?.role ||
    user?.app_metadata?.role ||
    "passenger",
  ).toLowerCase();
}

export async function getSessionUser(token: string): Promise<any | null> {
  if (!token || isAnonKey(token)) return null;

  // Cache mémoire court : les écrans de suivi appellent l'API toutes les 5–8 s.
  // Sans ce cache, chaque poll déclenchait un appel réseau vers Supabase Auth.
  const now = Date.now();
  const cached = userCache.get(token);
  if (cached && now - cached.at < USER_CACHE_TTL_MS) return cached.user;
  if (cached) userCache.delete(token);

  try {
    const { data, error } = await serviceClient().auth.getUser(token);
    if (error || !data?.user) return null;
    if (userCache.size > USER_CACHE_MAX) {
      for (const [k, v] of userCache) {
        if (now - v.at > USER_CACHE_TTL_MS) userCache.delete(k);
      }
    }
    userCache.set(token, { user: data.user, at: now });
    return data.user;
  } catch (e) {
    console.error("⚠️ [AUTH] Vérification du jeton impossible:", e);
    return null;
  }
}

function unauthorized(c: any, message = "Session requise"): AuthFail {
  return { ok: false, response: c.json({ success: false, error: message, code: "AUTH_REQUIRED" }, 401) };
}

function forbidden(c: any, message = "Accès non autorisé", code = "FORBIDDEN"): AuthFail {
  return { ok: false, response: c.json({ success: false, error: message, code }, 403) };
}

// ─── 2FA admin : session serveur ─────────────────────────────────────────────

export async function isAdmin2FARequired(): Promise<boolean> {
  const config = await kvGet(CONFIG_KEY);
  // Par défaut (config illisible) : on EXIGE la 2FA. Fail-closed.
  if (!config || typeof config !== "object") return true;
  return config.admin2faRequired !== false;
}

/** Crée une session 2FA serveur (12 h) après validation du code email. */
export async function createAdmin2FASession(userId: string, email?: string): Promise<string> {
  const token = crypto.randomUUID();
  await kvSet(`${ADMIN_2FA_SESSION_PREFIX}${userId}`, {
    token,
    userId,
    email: email || null,
    createdAt: Date.now(),
    expiresAt: Date.now() + ADMIN_2FA_SESSION_TTL_MS,
  });
  return token;
}

/** Vérifie le jeton `x-admin-2fa` (session serveur, pas le jeton OTP). */
export async function validateAdmin2FASession(userId: string, token: string): Promise<boolean> {
  if (!token) return false;
  const entry = await kvGet(`${ADMIN_2FA_SESSION_PREFIX}${userId}`);
  if (!entry || entry.token !== token) return false;
  if (Date.now() > Number(entry.expiresAt || 0)) {
    await kvDel(`${ADMIN_2FA_SESSION_PREFIX}${userId}`);
    return false;
  }
  return true;
}

export async function revokeAdmin2FASession(userId: string): Promise<void> {
  await kvDel(`${ADMIN_2FA_SESSION_PREFIX}${userId}`);
}

// ─── Gardes ───────────────────────────────────────────────────────────────────

/** Session utilisateur réelle. La clé anon est explicitement refusée. */
export async function requireUser(c: any): Promise<AuthResult> {
  const token = bearerToken(c);
  if (!token) return unauthorized(c);
  if (isAnonKey(token)) return unauthorized(c, "Session utilisateur requise (clé publique refusée)");
  const user = await getSessionUser(token);
  if (!user) return unauthorized(c, "Session invalide ou expirée");
  return { ok: true, user };
}

/** Identité facultative : renvoie l'utilisateur ou null, sans bloquer. */
export async function optionalUser(c: any): Promise<any | null> {
  const token = bearerToken(c);
  if (!token) return null;
  return await getSessionUser(token);
}

/**
 * Administrateur : session valide + rôle admin + session 2FA serveur
 * (si `admin2faRequired` est actif).
 */
export async function requireAdmin(c: any): Promise<AuthResult> {
  const auth = await requireUser(c);
  if (!auth.ok) return auth;

  if (roleOf(auth.user) !== "admin") {
    return forbidden(c, "Compte administrateur requis", "ADMIN_REQUIRED");
  }

  if (await isAdmin2FARequired()) {
    const token = c.req.header("x-admin-2fa") ||
      c.req.header("X-Admin-2FA") ||
      c.req.header("x-admin-2fa-token") || "";
    const valid = await validateAdmin2FASession(auth.user.id, token);
    if (!valid) {
      return {
        ok: false,
        response: c.json({
          success: false,
          error: "Double authentification requise. Reconnectez-vous.",
          code: "ADMIN_2FA_REQUIRED",
        }, 401),
      };
    }
  }

  return auth;
}

/** La ressource doit appartenir à l'appelant (ou l'appelant est admin). */
export async function requireOwnerOrAdmin(c: any, ownerId: string | null | undefined): Promise<AuthResult> {
  const auth = await requireUser(c);
  if (!auth.ok) return auth;
  if (roleOf(auth.user) === "admin") return auth;
  if (!ownerId || String(auth.user.id) !== String(ownerId)) {
    return forbidden(c);
  }
  return auth;
}

/** Rôle admin OU propriétaire parmi plusieurs identifiants (ex. course). */
export async function requireAnyOwnerOrAdmin(
  c: any,
  ownerIds: Array<string | null | undefined>,
): Promise<AuthResult> {
  const auth = await requireUser(c);
  if (!auth.ok) return auth;
  if (roleOf(auth.user) === "admin") return auth;
  const me = String(auth.user.id);
  const allowed = ownerIds.some((id) => id && String(id) === me);
  return allowed ? auth : forbidden(c);
}

/**
 * Vérifie qu'un conducteur a bien une course active avec ce passager
 * (utilisé par la fiche client affichée pendant une course).
 */
export async function driverHasActiveRideWithPassenger(
  driverId: string,
  passengerId: string,
): Promise<boolean> {
  if (!driverId || !passengerId) return false;
  const rideId = await kvGet(`passenger_active_ride:${passengerId}`);
  if (!rideId || typeof rideId !== "string") return false;
  const ride = await kvGet(`ride:${rideId}`);
  if (!ride) return false;
  const sameDriver = String(ride.driverId || ride.driver_id || "") === String(driverId);
  const active = ["accepted", "enroute", "arrived", "in_progress", "started"]
    .includes(String(ride.status));
  return sameDriver && active;
}

/** Un passager a-t-il une course active avec ce conducteur ? */
export async function passengerHasActiveRideWithDriver(
  passengerId: string,
  driverId: string,
): Promise<boolean> {
  if (!passengerId || !driverId) return false;
  const rideId = await kvGet(`passenger_active_ride:${passengerId}`);
  if (!rideId || typeof rideId !== "string") return false;
  const ride = await kvGet(`ride:${rideId}`);
  if (!ride) return false;
  const sameDriver = String(ride.driverId || ride.driver_id || "") === String(driverId);
  const active = ["accepted", "enroute", "arrived", "in_progress", "started"]
    .includes(String(ride.status));
  return sameDriver && active;
}
