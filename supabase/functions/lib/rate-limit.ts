/**
 * Rate limiters Hono pour l'Edge Function SmartCabb.
 *
 * ⚠️ Ce fichier doit rester dans `supabase/functions/lib/` : `index.ts` et
 * `auth-routes.ts` l'importent via `../lib/rate-limit.ts`. S'il est déplacé,
 * le déploiement de la fonction échoue ("Module not found").
 *
 * Deux limiteurs distincts (compteurs séparés) :
 * - global : par IP, sur toutes les routes — DÉSACTIVÉ par défaut
 * - auth   : sur /signup et /login — activé, 10 tentatives / 15 min
 *
 * Pourquoi le global est désactivé par défaut : au Congo les réseaux mobiles
 * partagent une même IP publique (CGNAT). Un plafond par IP trop bas bloque
 * des utilisateurs légitimes (l'app interroge l'API en continu). On l'active
 * quand les mesures de trafic le justifient.
 *
 * Réglage sans redéploiement (secrets Supabase) :
 * - RATE_LIMIT_GLOBAL_MAX : requêtes autorisées / 15 min par IP (0 ou absent = désactivé)
 * - RATE_LIMIT_AUTH_MAX   : tentatives autorisées / 15 min (0 = désactivé)
 *
 * Le limiteur d'authentification compte par IP **et** par identifiant
 * (email/téléphone), donc un utilisateur ne peut pas être bloqué par le
 * trafic d'autres personnes partageant la même IP.
 *
 * Principe de sûreté : si le KV est indisponible, la requête passe
 * (fail-open). Un limiteur ne doit jamais rendre l'API inutilisable.
 */

import { createClient } from "npm:@supabase/supabase-js@2";

const KV_TABLE = "kv_store_2eb02e52";
const WINDOW_MS = 15 * 60 * 1000;

const DEFAULT_GLOBAL_MAX = 0; // désactivé (voir explication CGNAT ci-dessus)
const DEFAULT_AUTH_MAX = 10;

function readLimit(name: string, fallback: number): number {
  const raw = Deno.env.get(name);
  if (raw === undefined || raw.trim() === "") return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : fallback;
}

function kvClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );
}

function clientIp(c: any): string {
  const forwarded = c.req.header("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return c.req.header("x-real-ip") || c.req.header("remote-addr") || "unknown";
}

/** Clé de comptage : IP seule (global) ou IP + identifiant (auth). */
async function authSubject(c: any, ip: string): Promise<string> {
  try {
    // clone() permet de lire le corps sans le consommer pour le handler
    const body = await c.req.raw.clone().json();
    const raw = body?.identifier ?? body?.email ?? body?.phone;
    if (typeof raw === "string" && raw.trim()) {
      return `${ip}|${raw.trim().toLowerCase()}`;
    }
  } catch {
    // corps absent ou non JSON : on retombe sur l'IP
  }
  return ip;
}

/** Incrémente le compteur `bucket:subject` et renvoie l'état de la fenêtre. */
async function hit(
  bucket: string,
  subject: string,
  windowMs: number
): Promise<{ count: number; resetMs: number }> {
  const key = `rate_limit:${bucket}:${subject}`;
  const now = Date.now();
  const supabase = kvClient();

  const { data, error } = await supabase
    .from(KV_TABLE).select("value").eq("key", key).maybeSingle();
  if (error) throw new Error(error.message);

  const stored: any = data?.value;
  const started = typeof stored?.firstRequest === "number" ? stored.firstRequest : 0;
  const expired = !stored || now - started > windowMs;

  const record = expired
    ? { count: 1, firstRequest: now, lastRequest: now }
    : {
        count: (typeof stored.count === "number" ? stored.count : 0) + 1,
        firstRequest: started,
        lastRequest: now,
      };

  const { error: writeError } = await supabase.from(KV_TABLE).upsert({ key, value: record });
  if (writeError) throw new Error(writeError.message);

  return {
    count: record.count,
    resetMs: Math.max(0, windowMs - (now - record.firstRequest)),
  };
}

function buildLimiter(
  bucket: string,
  max: number,
  windowMs: number,
  keyOf: (c: any, ip: string) => Promise<string> | string = (_c, ip) => ip
) {
  return async function rateLimitMiddleware(c: any, next: any) {
    if (max <= 0) return await next();

    try {
      const ip = clientIp(c);
      const subject = await keyOf(c, ip);
      const { count, resetMs } = await hit(bucket, subject, windowMs);

      c.header("RateLimit-Limit", String(max));
      c.header("RateLimit-Remaining", String(Math.max(0, max - count)));
      c.header("RateLimit-Reset", String(Math.ceil(resetMs / 1000)));

      if (count > max) {
        const minutes = Math.max(1, Math.ceil(resetMs / 60000));
        return c.json(
          {
            success: false,
            error: "Limite de requêtes dépassée",
            message: `Vous avez effectué trop de requêtes. Veuillez patienter ${minutes} minute(s) avant de réessayer.`,
            retryAfter: `${minutes} minutes`,
          },
          429
        );
      }
    } catch (e) {
      // KV indisponible : on ne bloque pas l'API.
      console.error("⚠️ Rate limit indisponible (fail-open):", e);
    }

    return await next();
  };
}

/**
 * Limiteur global, monté sur toutes les routes : `app.use('*', rateLimit())`.
 * Désactivé par défaut ; activer avec le secret RATE_LIMIT_GLOBAL_MAX.
 */
export function rateLimit(maxRequests?: number, windowMs = WINDOW_MS) {
  const max = maxRequests ?? readLimit("RATE_LIMIT_GLOBAL_MAX", DEFAULT_GLOBAL_MAX);
  return buildLimiter("global", max, windowMs);
}

/**
 * Limiteur strict pour l'authentification (10 tentatives / 15 min).
 * Compte par IP + identifiant pour ne pas pénaliser les IP partagées.
 */
export function rateLimitAuth(maxRequests?: number, windowMs = WINDOW_MS) {
  const max = maxRequests ?? readLimit("RATE_LIMIT_AUTH_MAX", DEFAULT_AUTH_MAX);
  return buildLimiter("auth", max, windowMs, authSubject);
}

/**
 * Alias historique utilisé par `auth-routes.ts` (`rateLimiter()`).
 */
export const rateLimiter = rateLimitAuth;
