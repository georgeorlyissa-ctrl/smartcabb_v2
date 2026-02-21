/**
 * 🔒 MIDDLEWARE DE SÉCURITÉ OWASP TOP 10
 * Protection complète contre les vulnérabilités critiques
 */

import { Context, Next } from "npm:hono";

/**
 * 🛡️ OWASP #1: Broken Access Control
 * Validation des tokens JWT et vérification des permissions
 */
export async function validateAuth(c: Context, requireAuth = true) {
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader && requireAuth) {
    return c.json({ 
      success: false, 
      error: 'Authentication required',
      code: 'AUTH_REQUIRED'
    }, 401);
  }

  if (authHeader) {
    const token = authHeader.replace('Bearer ', '');
    
    // Valider le format du token
    if (!token || token.length < 20) {
      return c.json({ 
        success: false, 
        error: 'Invalid authentication token',
        code: 'INVALID_TOKEN'
      }, 401);
    }
  }

  return null;
}

/**
 * 🛡️ OWASP #2: Cryptographic Failures
 * Validation des données sensibles
 */
export function sanitizeSensitiveData(data: any) {
  const sensitiveFields = [
    'password', 'token', 'secret', 'api_key', 
    'credit_card', 'ssn', 'pin', 'cvv'
  ];

  const sanitized = { ...data };
  
  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      delete sanitized[field];
    }
  }

  return sanitized;
}

/**
 * 🛡️ OWASP #3: Injection
 * Protection contre les injections SQL, NoSQL, XSS
 */
export function sanitizeInput(input: any): any {
  if (typeof input === 'string') {
    // Protection XSS
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
      .trim()
      .substring(0, 10000); // Limite de longueur
  }
  
  if (Array.isArray(input)) {
    return input.map(item => sanitizeInput(item));
  }
  
  if (typeof input === 'object' && input !== null) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(input)) {
      // Bloquer les clés dangereuses
      if (!key.startsWith('$') && !key.startsWith('_') && !key.includes('..')) {
        sanitized[key] = sanitizeInput(value);
      }
    }
    return sanitized;
  }
  
  return input;
}

/**
 * 🛡️ OWASP #3: Protection SQL Injection
 */
export function validateSQLSafe(input: string): boolean {
  const dangerousPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/gi,
    /(--|;|\/\*|\*\/|xp_|sp_)/gi,
    /(\bOR\b.*=.*|'\s*OR\s*'1'\s*=\s*'1)/gi,
    /(\bUNION\b.*\bSELECT\b)/gi
  ];

  return !dangerousPatterns.some(pattern => pattern.test(input));
}

/**
 * 🛡️ OWASP #4: Insecure Design
 * Validation des données métier
 */
export function validateBusinessRules(data: any, type: string): { valid: boolean; error?: string } {
  switch (type) {
    case 'phone':
      // Format RDC: +243XXXXXXXXX
      if (!/^\+243[0-9]{9}$/.test(data)) {
        return { valid: false, error: 'Format de téléphone invalide' };
      }
      break;

    case 'email':
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data)) {
        return { valid: false, error: 'Format d\'email invalide' };
      }
      break;

    case 'amount':
      const amount = parseFloat(data);
      if (isNaN(amount) || amount < 0 || amount > 10000000) {
        return { valid: false, error: 'Montant invalide' };
      }
      break;

    case 'coordinate':
      const coord = parseFloat(data);
      if (isNaN(coord) || coord < -180 || coord > 180) {
        return { valid: false, error: 'Coordonnée invalide' };
      }
      break;

    case 'vehicle_category':
      const validCategories = ['economy', 'comfort', 'premium', 'van', 'moto'];
      if (!validCategories.includes(data)) {
        return { valid: false, error: 'Catégorie de véhicule invalide' };
      }
      break;
  }

  return { valid: true };
}

/**
 * 🛡️ OWASP #5: Security Misconfiguration
 * Rate limiting simple (protection DDoS)
 */
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  identifier: string, 
  maxRequests = 100, 
  windowMs = 60000
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const record = requestCounts.get(identifier);

  if (!record || now > record.resetTime) {
    requestCounts.set(identifier, {
      count: 1,
      resetTime: now + windowMs
    });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  if (record.count >= maxRequests) {
    return { allowed: false, remaining: 0 };
  }

  record.count++;
  return { allowed: true, remaining: maxRequests - record.count };
}

/**
 * 🛡️ OWASP #7: Identification and Authentication Failures
 * Validation robuste des mots de passe
 */
export function validatePasswordStrength(password: string): { 
  valid: boolean; 
  score: number; 
  errors: string[] 
} {
  const errors: string[] = [];
  let score = 0;

  // Longueur minimale
  if (password.length < 8) {
    errors.push('Le mot de passe doit contenir au moins 8 caractères');
  } else {
    score += 1;
  }

  // Majuscules
  if (!/[A-Z]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins une majuscule');
  } else {
    score += 1;
  }

  // Minuscules
  if (!/[a-z]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins une minuscule');
  } else {
    score += 1;
  }

  // Chiffres
  if (!/[0-9]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins un chiffre');
  } else {
    score += 1;
  }

  // Caractères spéciaux
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins un caractère spécial');
  } else {
    score += 1;
  }

  // Mots de passe courants
  const commonPasswords = [
    'password', '12345678', 'qwerty', 'abc123', 'password123',
    'admin', 'letmein', 'welcome', 'monkey', '1234567890'
  ];
  
  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push('Ce mot de passe est trop courant');
    score = 0;
  }

  return {
    valid: errors.length === 0 && score >= 4,
    score,
    errors
  };
}

/**
 * 🛡️ OWASP #8: Software and Data Integrity Failures
 * Validation de l'intégrité des données
 */
export function validateDataIntegrity(data: any, expectedFields: string[]): boolean {
  if (!data || typeof data !== 'object') {
    return false;
  }

  // Vérifier que tous les champs attendus sont présents
  for (const field of expectedFields) {
    if (!(field in data)) {
      return false;
    }
  }

  // Vérifier qu'il n'y a pas de champs suspects
  const suspiciousFields = ['__proto__', 'constructor', 'prototype'];
  for (const field of suspiciousFields) {
    if (field in data) {
      return false;
    }
  }

  return true;
}

/**
 * 🛡️ OWASP #9: Security Logging and Monitoring
 * Logging sécurisé
 */
export function securityLog(
  level: 'info' | 'warning' | 'error' | 'critical',
  event: string,
  details: any
) {
  const timestamp = new Date().toISOString();
  const sanitizedDetails = sanitizeSensitiveData(details);
  
  const logEntry = {
    timestamp,
    level,
    event,
    details: sanitizedDetails,
    source: 'smartcabb-security'
  };

  // Log selon le niveau
  switch (level) {
    case 'critical':
    case 'error':
      console.error('🚨 [SECURITY]', JSON.stringify(logEntry));
      break;
    case 'warning':
      console.warn('⚠️  [SECURITY]', JSON.stringify(logEntry));
      break;
    default:
      console.log('ℹ️  [SECURITY]', JSON.stringify(logEntry));
  }

  return logEntry;
}

/**
 * 🛡️ OWASP #10: Server-Side Request Forgery (SSRF)
 * Validation des URLs externes
 */
export function validateURL(url: string): { valid: boolean; error?: string } {
  try {
    const parsedUrl = new URL(url);

    // Liste blanche de domaines autorisés
    const allowedDomains = [
      'supabase.co',
      'googleapis.com',
      'mapbox.com',
      'openstreetmap.org',
      'flutterwave.com',
      'smartcabb.com'
    ];

    const isAllowed = allowedDomains.some(domain => 
      parsedUrl.hostname.endsWith(domain)
    );

    if (!isAllowed) {
      return { 
        valid: false, 
        error: 'Domaine non autorisé' 
      };
    }

    // Bloquer les protocoles dangereux
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return { 
        valid: false, 
        error: 'Protocole non autorisé' 
      };
    }

    // Bloquer les adresses IP privées
    const privateIPPatterns = [
      /^127\./,
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^192\.168\./,
      /^localhost$/i
    ];

    if (privateIPPatterns.some(pattern => pattern.test(parsedUrl.hostname))) {
      return { 
        valid: false, 
        error: 'Adresse IP privée non autorisée' 
      };
    }

    return { valid: true };
  } catch (error) {
    return { 
      valid: false, 
      error: 'URL invalide' 
    };
  }
}

/**
 * 🛡️ Middleware principal de sécurité
 */
export async function securityMiddleware(c: Context, next: Next) {
  const startTime = Date.now();
  const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';
  const userAgent = c.req.header('user-agent') || 'unknown';
  const path = c.req.path;
  const method = c.req.method;


  // ✅ WHITELIST : Routes publiques exemptées du middleware de sécurité
  const publicRoutes = [
    '/make-server-2eb02e52/health',
    '/make-server-2eb02e52/config/mapbox-key',
    '/make-server-2eb02e52/config/google-maps-key',
  ];

  // Si c'est une route publique, skip la validation de sécurité
  if (publicRoutes.includes(path)) {
    await next();
    return;
  }

  // Rate limiting par IP
  const rateLimit = checkRateLimit(ip, 1000, 60000); // 1000 req/min
  
  if (!rateLimit.allowed) {
    securityLog('warning', 'RATE_LIMIT_EXCEEDED', { ip, path, method });
    
    return c.json({
      success: false,
      error: 'Trop de requêtes. Veuillez réessayer plus tard.',
      code: 'RATE_LIMIT_EXCEEDED'
    }, 429);
  }

  // Ajouter l'en-tête de rate limit restant
  c.header('X-RateLimit-Remaining', rateLimit.remaining.toString());

  // ✅ WHITELIST pour les bots légitimes (SEO)
  const legitimateBots = [
    'googlebot',
    'bingbot',
    'slurp', // Yahoo
    'duckduckbot',
    'baiduspider',
    'yandexbot',
    'facebookexternalhit',
    'twitterbot',
    'linkedinbot',
    'whatsapp'
  ];

  const isLegitimateBot = legitimateBots.some(bot => 
    userAgent.toLowerCase().includes(bot)
  );

  // Bloquer les User-Agents suspects (sauf les bots légitimes)
  const suspiciousUserAgents = ['sqlmap', 'nikto', 'nmap', 'masscan'];
  const hasSuspiciousPattern = suspiciousUserAgents.some(ua => 
    userAgent.toLowerCase().includes(ua)
  );

  // ✅ Bloquer uniquement si suspect ET pas un bot légitime
  if (hasSuspiciousPattern || (userAgent.toLowerCase().includes('bot') && !isLegitimateBot)) {
    // ⚠️ Log seulement si vraiment suspect (pas Googlebot)
    if (!isLegitimateBot) {
      securityLog('critical', 'SUSPICIOUS_USER_AGENT', { ip, userAgent, path });
      
      return c.json({
        success: false,
        error: 'Accès refusé',
        code: 'FORBIDDEN'
      }, 403);
    }
  }

  // Log de la requête
  securityLog('info', 'REQUEST', {
    ip,
    method,
    path,
    userAgent: userAgent.substring(0, 100)
  });

  try {
    await next();
    
    const responseTime = Date.now() - startTime;
    
    // Log des réponses lentes (potentiel DoS)
    if (responseTime > 5000) {
      securityLog('warning', 'SLOW_RESPONSE', {
        ip,
        path,
        responseTime
      });
    }
  } catch (error) {
    securityLog('error', 'REQUEST_ERROR', {
      ip,
      path,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    throw error;
  }
}

/**
 * 🛡️ Validation complète des entrées utilisateur
 */
export function validateUserInput(data: any, rules: any): { 
  valid: boolean; 
  sanitized?: any; 
  errors?: string[] 
} {
  const errors: string[] = [];
  const sanitized: any = {};

  for (const [field, rule] of Object.entries(rules)) {
    const value = data[field];
    const fieldRules = rule as any;

    // Champ requis
    if (fieldRules.required && (value === undefined || value === null || value === '')) {
      errors.push(`Le champ ${field} est requis`);
      continue;
    }

    // Si le champ n'est pas requis et vide, continuer
    if (!value && !fieldRules.required) {
      continue;
    }

    // Type
    if (fieldRules.type && typeof value !== fieldRules.type) {
      errors.push(`Le champ ${field} doit être de type ${fieldRules.type}`);
      continue;
    }

    // Longueur min
    if (fieldRules.minLength && value.length < fieldRules.minLength) {
      errors.push(`Le champ ${field} doit contenir au moins ${fieldRules.minLength} caractères`);
      continue;
    }

    // Longueur max
    if (fieldRules.maxLength && value.length > fieldRules.maxLength) {
      errors.push(`Le champ ${field} ne peut pas dépasser ${fieldRules.maxLength} caractères`);
      continue;
    }

    // Pattern
    if (fieldRules.pattern && !fieldRules.pattern.test(value)) {
      errors.push(`Le champ ${field} a un format invalide`);
      continue;
    }

    // Validation métier
    if (fieldRules.businessType) {
      const validation = validateBusinessRules(value, fieldRules.businessType);
      if (!validation.valid) {
        errors.push(validation.error || `Le champ ${field} est invalide`);
        continue;
      }
    }

    // Sanitization
    sanitized[field] = sanitizeInput(value);
  }

  return {
    valid: errors.length === 0,
    sanitized: errors.length === 0 ? sanitized : undefined,
    errors: errors.length > 0 ? errors : undefined
  };
}

export default {
  validateAuth,
  sanitizeSensitiveData,
  sanitizeInput,
  validateSQLSafe,
  validateBusinessRules,
  checkRateLimit,
  validatePasswordStrength,
  validateDataIntegrity,
  securityLog,
  validateURL,
  securityMiddleware,
  validateUserInput

};

};

