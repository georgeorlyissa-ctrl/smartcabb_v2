import { Context } from "npm:hono";

/**
 * 🔒 MIDDLEWARE DE SÉCURITÉ OWASP TOP 10 2021
 */

export async function securityMiddleware(c: Context, next: () => Promise<void>) {
  const request = c.req;
  const url = new URL(request.url);
  const body = request.method !== 'GET' ? await request.text() : '';

  // 1️⃣ Protection SQL Injection (A03:2021)
  const sqlPatterns = [
    /(\bunion\b.*\bselect\b)|(\bselect\b.*\bunion\b)/i,
    /\b(drop|delete|insert|update|alter|create)\b.*\b(table|database)\b/i,
    /'.*--/,
    /;\s*(drop|delete|insert)/i
  ];

  for (const pattern of sqlPatterns) {
    if (pattern.test(body) || pattern.test(url.search)) {
      console.error('🚨 SQL Injection attempt detected:', { url: url.pathname, body: body.substring(0, 100) });
      return c.json({ error: 'Invalid request' }, 400);
    }
  }

  // 2️⃣ Protection XSS (A03:2021)
  const xssPatterns = [
    /<script[^>]*>.*<\/script>/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /<iframe/i
  ];

  for (const pattern of xssPatterns) {
    if (pattern.test(body)) {
      console.error('🚨 XSS attempt detected:', { url: url.pathname, body: body.substring(0, 100) });
      return c.json({ error: 'Invalid request' }, 400);
    }
  }

  // 3️⃣ Protection Path Traversal (A01:2021)
  if (url.pathname.includes('../') || url.pathname.includes('..\\')) {
    console.error('🚨 Path traversal attempt detected:', url.pathname);
    return c.json({ error: 'Invalid path' }, 400);
  }

  // 4️⃣ Limite taille requête (A04:2021 - Insecure Design)
  if (body.length > 10 * 1024 * 1024) { // 10MB max
    console.error('🚨 Request too large:', body.length);
    return c.json({ error: 'Request too large' }, 413);
  }

  // 5️⃣ Headers de sécurité (A05:2021 - Security Misconfiguration)
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('X-XSS-Protection', '1; mode=block');
  c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

  await next();
}
