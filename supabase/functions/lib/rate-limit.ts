/**
 * Rate limiters Hono pour l'Edge Function SmartCabb.
 *
 * ⚠️ Ce fichier doit rester dans `supabase/functions/lib/` : `index.ts` et
 * `auth-routes.ts` l'importent via `../lib/rate-limit.ts`. S'il est déplacé,
 * le déploiement de la fonction échoue ("Module not found").
 *
 * Deux limiteurs distincts (compteurs séparés, donc une attaque sur /login
 * ne consomme pas le quota global) :
 * - global : par IP, toutes les routes (défaut 600 requêtes / 15 min)
 * - auth   : par IP, sur /signup et /login (défaut 10 tentatives / 15 min)
 *
 * Les seuils sont réglables sans redéploiement via les secrets Supabase :
 * - RATE_LIMIT_GLOBAL_MAX (0 = désactivé)
 * - RATE_LIMIT_AUTH_MAX   (0 = désactivé)
 *
 * Principe de sûreté : si le KV est indisponible, on laisse passer la requête
 * (fail-open). Un limiteur ne doit jamais rendre l'API inutilisable.
 */

import { createClient } from "npm:@supabase/supabase-js@2";

const KV_TABLE = "kv_store_2eb02e52";
const WINDOW_MS = 15 * 60 * 1000;

// Les réseaux mobiles partagent souvent une même IP publique (CGNAT) : un
// seuil trop bas bloquerait des utilisateurs légitimes. On reste généreux.
const DEFAULT_GLOBAL_MAX = 600;
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

/** Incrémente le compteur `bucket:ip` et renvoie l'état de la fenêtre. */
async function hit(
  bucket: string,
  ip: string,
  windowMs: number
): Promise<{ count: number; resetMs: number }> {
  const key = `rate_limit:${bucket}:${ip}`;
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

function buildLimiter(bucket: string, max: number, windowMs: number) {
  return async function rateLimitMiddleware(c: any, next: any) {
    if (max <= 0) return await next();

    try {
      const ip = clientIp(c);
      const { count, resetMs } = await hit(bucket, ip, windowMs);

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
 * @param maxRequests Seuil par fenêtre (défaut : RATE_LIMIT_GLOBAL_MAX ou 600)
 * @param windowMs Durée de la fenêtre (défaut : 15 min)
 */
export function rateLimit(maxRequests?: number, windowMs = WINDOW_MS) {
  const max = maxRequests ?? readLimit("RATE_LIMIT_GLOBAL_MAX", DEFAULT_GLOBAL_MAX);
  return buildLimiter("global", max, windowMs);
}

/**
 * Limiteur strict pour l'authentification (5 à 10 tentatives par 15 min).
 * @param maxRequests Seuil par fenêtre (défaut : RATE_LIMIT_AUTH_MAX ou 10)
 */
export function rateLimitAuth(maxRequests?: number, windowMs = WINDOW_MS) {
  const max = maxRequests ?? readLimit("RATE_LIMIT_AUTH_MAX", DEFAULT_AUTH_MAX);
  return buildLimiter("auth", max, windowMs);
}

/**
 * Alias historique utilisé par `auth-routes.ts` (`rateLimiter()`).
 * Conserve le nom pour ne pas casser les imports existants.
 */
export const rateLimiter = rateLimitAuth;
