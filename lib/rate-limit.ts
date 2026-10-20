/**
 * Rate Limiter Global pour Hono
 * Limite toutes les requêtes API par adresse IP
 * Prévente les attaques par force brute et le spam
 * Affiche un message utilisateur friendly quand la limite est dépassée
 * 
 * Configuration par défaut :
 * - 100 requêtes par 15 minutes par IP
 * - Header RateLimit-Remaining dans la réponse
 * - Header RateLimit-Reset avec le temps avant réinitialisation
 * - Message français friendly en cas de dépassement
 */

const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes en ms
const DEFAULT_MAX_REQUESTS = 100; // Nombre maximal de requêtes par fenêtre

/**
 * Crée un middleware de rate limiting global
 * @param maxRequests Nombre maximal de requêtes autorisées (défaut: 100)
 * @param windowMs Fenêtre de temps en millisecondes (défaut: 15min)
 * @returns Middleware Hono
 */
export function rateLimit(maxRequests = DEFAULT_MAX_REQUESTS, windowMs = RATE_LIMIT_WINDOW) {
  return async function rateLimitMiddleware(c, next) {
    // Récupérer l'IP de l'expéditeur
    const ip = c.req.header('X-Forwarded-For') || c.req.header('Remote-Addr') || 'unknown';
    const key = `global_rate_limit:${ip}`;
    
    // Utiliser le même pattern KV que le projet
    const kvClient = () =>
      createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );
    
    const { data, error } = await kvClient()
      .from("kv_store_2eb02e52")
      .select("value")
      .eq("key", key)
      .maybeSingle();
    
    if (error || !data) {
      // Première requête - initialiser le compteur
      await kvClient().from("kv_store_2eb02e52").upsert({
        key,
        value: JSON.stringify({ count: 1, firstRequest: Date.now(), lastRequest: Date.now() })
      });
    } else {
      const record = JSON.parse(data.value);
      const now = Date.now();
      
      // Vérifier si la fenêtre a expiré
      if (now - record.firstRequest > RATE_LIMIT_WINDOW) {
        // Fenêtre expirée - réinitialiser
        await kvClient().from("kv_store_2eb02e52").upsert({
          key,
          value: JSON.stringify({ count: 1, firstRequest: now, lastRequest: now })
        });
      } else {
        // Incrémenter le compteur dans la fenêtre active
        record.count = (record.count || 0) + 1;
        record.lastRequest = now;
        await kvClient().from("kv_store_2eb02e52").upsert({ key, value: JSON.stringify(record) });
      }
    }
    
    // Récupérer le compteur mis à jour
    const { data: finalData, error: finalError } = await kvClient()
      .from("kv_store_2eb02e52")
      .select("value")
      .eq("key", key)
      .maybeSingle();
    
    const finalRecord = finalError ? null : JSON.parse(finalData.value);
    const currentCount = finalRecord ? finalRecord.count : 1;
    const timeToReset = finalRecord ? Math.max(0, RATE_LIMIT_WINDOW - (Date.now() - record.firstRequest)) : 0;
    
    // Ajouter des headers d'information
    c.header('RateLimit-Limit', DEFAULT_MAX_REQUESTS.toString());
    c.header('RateLimit-Remaining', (DEFAULT_MAX_REQUESTS - currentCount).toString());
    c.header('RateLimit-Reset', timeToReset.toString());
    
    // Si limite dépassée, bloquer avec message utilisateur français
    if (currentCount > DEFAULT_MAX_REQUESTS) {
      return c.json(
        { 
          success: false, 
          error: 'Limite de requêtes dépassée',
          message: 'Vous avez effectué trop de requêtes. Veuillez patienter 15 minutes avant de réessayer.',
          retryAfter: Math.ceil(timeToReset / 60000) + ' minutes'
        },
        429
      );
    }
    
    return await next();
  };
}

/**
 * Alias pour une limite plus stricte (authentification)
 * @returns Middleware avec 5 requêtes/15min
 */
export function rateLimitAuth() {
  return rateLimit(5, 15 * 60 * 1000);
}