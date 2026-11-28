/**
 * 🔐 INTERCEPTEUR D'AUTHENTIFICATION API - SMARTCABB
 *
 * Les appels vers l'Edge Function `make-server-2eb02e52` envoyaient souvent la
 * clé `anon` (publique) à la place de la session de l'utilisateur connecté.
 * Résultat : le backend ne pouvait pas savoir QUI appelait, donc aucune route
 * sensible ne pouvait être protégée.
 *
 * Ce module remplace `window.fetch` une seule fois au démarrage et, pour les
 * appels vers notre API uniquement :
 *  - remplace `Authorization: Bearer <anon>` par le JWT Supabase de la session
 *    en cours (si elle existe) ;
 *  - ajoute `x-admin-2fa` (session 2FA serveur) dès qu'il existe, pour toutes
 *    les routes de notre API. Le backend l'ignore sur les routes publiques,
 *    et cela couvre les routes admin hors `/admin/` (`/drivers`, `/passengers`,
 *    etc.) qui exigent la 2FA.
 *
 * Les requêtes sans session (visiteur non connecté) conservent la clé anon :
 * les routes publiques (config, santé, carte) continuent de fonctionner.
 */

import { supabase } from './supabase';

const API_MARKER = '/functions/v1/make-server-2eb02e52';
const TOKEN_CACHE_MS = 30_000;

let installed = false;
let cachedToken: { value: string; at: number } | null = null;

async function currentAccessToken(): Promise<string | null> {
  if (cachedToken && Date.now() - cachedToken.at < TOKEN_CACHE_MS) {
    return cachedToken.value;
  }
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token || null;
    cachedToken = token ? { value: token, at: Date.now() } : null;
    return token;
  } catch {
    return null;
  }
}

function isApiUrl(url: string): boolean {
  return typeof url === 'string' && url.includes(API_MARKER);
}

function mergeHeaders(input: RequestInfo | URL, init?: RequestInit): Headers {
  const headers = new Headers(init?.headers || undefined);
  if (input instanceof Request) {
    input.headers.forEach((value, key) => {
      if (!headers.has(key)) headers.set(key, value);
    });
  }
  return headers;
}

export function installApiAuthInterceptor(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  const originalFetch = window.fetch.bind(window);

  // Mise à jour du cache dès qu'une connexion/déconnexion a lieu.
  try {
    supabase.auth.onAuthStateChange((_event, session) => {
      cachedToken = session?.access_token
        ? { value: session.access_token, at: Date.now() }
        : null;
    });
  } catch {
    /* non bloquant */
  }

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.href
        : input.url;

    if (!isApiUrl(url)) {
      return originalFetch(input as any, init);
    }

    const token = await currentAccessToken();
    if (!token) {
      // Pas de session : on laisse la requête telle quelle (clé anon).
      return originalFetch(input as any, init);
    }

    const headers = mergeHeaders(input, init);
    headers.set('Authorization', `Bearer ${token}`);

    // Session 2FA admin : envoyée à toutes les routes de notre API. Le backend
    // l'ignore sur les routes publiques ; en revanche les routes admin-only
    // hors `/admin/` (GET /drivers, GET /passengers, etc.) en ont besoin.
    try {
      const twoFa = localStorage.getItem('smartcab_admin_2fa_token');
      if (twoFa) headers.set('x-admin-2fa', twoFa);
    } catch {
      /* localStorage indisponible */
    }

    return originalFetch(input as any, { ...(init || {}), headers });
  };

  console.log('🔐 Intercepteur d’authentification API installé');
}
