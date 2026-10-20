/**
 * Rate Limiter Middleware pour Hono
 * Limite les requêtes par IP pour prévenir les attaques par force brute
 * Utilise le même KV store que auth-routes.ts
 * 
 * Configuration :
 * - MAX_ATTEMPTS : 5 essais par fenêtre
 * - WINDOW_MS : 15 minutes
 */

const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes en ms
const MAX_ATTEMPTS = 5; // Nombre maximal de tentatives

/**
 * Crée un middleware de rate limiting
 * @param maxAttempts Nombre maximal de tentatives autorisées
 * @param windowMs Fenêtre de temps en millisecondes
 * @returns Middleware Hono
 */
export function rateLimiter(maxAttempts = MAX_ATTEMPTS, windowMs = RATE_LIMIT_WINDOW) {
  return async function rateLimiterMiddleware(c, next) {
    // Récupérer l'IP de l'expéditeur
    const ip = c.req.header('X-Forwarded-For') || c.req.header('Remote-Addr') || 'unknown';
    const key = `rate_limit:${ip}`;
    
    // Utiliser le même pattern que auth-routes.ts : kvClient().from(KV_TABLE)
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
      // Première requête - démarrer avec count=1
      await kvClient().from("kv_store_2eb02e52").upsert({
        key,
        value: JSON.stringify({ count: 1, firstRequest: Date.now() })
      });
      return await next();
    }
    
    const record = JSON.parse(data.value);
    const elapsed = Date.now() - record.firstRequest;
    
    // Si la fenêtre de temps est écoulée, réinitialiser
    if (elapsed > RATE_LIMIT_WINDOW) {
      await kvClient().from("kv_store_2eb02e52").upsert({
        key,
        value: JSON.stringify({ count: 1, firstRequest: Date.now() })
      });
      return await next();
    }
    
    // Si le nombre de tentatives dépasse la limite, bloquer
    if (record.count >= maxAttempts) {
      return c.json(
        { success: false, error: 'Trop de tentatives. Réessayez dans 15 minutes.' },
        429 // Too Many Requests
      );
    }
    
    // Incrémenter le compteur
    record.count = (record.count || 0) + 1;
    await kvClient().from("kv_store_2eb02e52").upsert({ key, value: JSON.stringify(record) });
    
    return await next();
  };
}