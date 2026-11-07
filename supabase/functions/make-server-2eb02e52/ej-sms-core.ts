/**
 * 📨 EJ SMS — Client API (OAuth 2.0) — EJSARL
 * ---------------------------------------------------------------------------
 * Guide de référence : « Guide API EJ SMS » v1.0 (EJSARL, juillet 2026).
 *
 * Ce module est **autonome** : il ne dépend que de `kv-wrapper.ts`.
 * Aucun secret en dur — tout vient des secrets Supabase :
 *
 *   EJSMS_CLIENT_ID        (dashboard EJ SMS → API Credentials, format ejsms-…)
 *   EJSMS_CLIENT_SECRET    (affiché une seule fois)
 *   EJSMS_SENDER           (nom d'expéditeur validé, max 11 caractères — défaut SMARTCABB)
 *   EJSMS_WEBHOOK_SECRET   (préfixe `whsec_…`, pour vérifier X-EJSms-Signature)
 *   EJSMS_SCOPE            (optionnel — défaut « sms:send sms:read »)
 *   EJSMS_TOKEN_URL        (optionnel — défaut Keycloak EJ SMS)
 *   EJSMS_API_BASE         (optionnel — défaut https://api.ejsarl.cd)
 *   EJSMS_CALLBACK_URL     (optionnel — URL publique du webhook DLR)
 *
 * Rappels du guide :
 *  - token OAuth 2.0 `client_credentials`, realm `ej-sms`, durée 5 min ;
 *  - `POST /sms/send` répond immédiatement `PENDING` puis `SENT` / `DELIVERED` / `FAILED` ;
 *  - le numéro s'envoie au format international **sans +** : `243XXXXXXXXX` ;
 *  - les callbacks DLR sont signés HMAC-SHA512 (hex) dans `X-EJSms-Signature`.
 */

import {
  get as kvGet,
  set as kvSet,
} from "./kv-wrapper.ts";

// ─── Constantes API ──────────────────────────────────────────────────────────

const DEFAULT_TOKEN_URL =
  "https://auth.ejsarl.cd/realms/ej-sms/protocol/openid-connect/token";
const DEFAULT_API_BASE = "https://api.ejsarl.cd";
const DEFAULT_SCOPE = "sms:send sms:read";
const DEFAULT_SENDER = "SMARTCABB";
const TOKEN_SAFETY_RATIO = 0.9; // renouvellement à 90 % de la durée de vie
const TOKEN_KV_KEY = "ejsms_token_cache";

// ─── Configuration ───────────────────────────────────────────────────────────

export function ejSmsTokenUrl(): string {
  return Deno.env.get("EJSMS_TOKEN_URL") || DEFAULT_TOKEN_URL;
}

export function ejSmsApiBase(): string {
  return (Deno.env.get("EJSMS_API_BASE") || DEFAULT_API_BASE).replace(/\/+$/, "");
}

export function ejSmsScope(): string {
  return Deno.env.get("EJSMS_SCOPE") || DEFAULT_SCOPE;
}

export function ejSmsCredentials(): { clientId: string; clientSecret: string } {
  return {
    clientId: Deno.env.get("EJSMS_CLIENT_ID") || "",
    clientSecret: Deno.env.get("EJSMS_CLIENT_SECRET") || "",
  };
}

export function ejSmsSender(): string {
  return (Deno.env.get("EJSMS_SENDER") || DEFAULT_SENDER).trim().slice(0, 11);
}

export function ejSmsWebhookSecret(): string {
  return Deno.env.get("EJSMS_WEBHOOK_SECRET") || "";
}

/** Les 2 secrets d'authentification sont-ils présents ? (ne révèle jamais leur valeur) */
export function ejSmsConfigured(): boolean {
  const { clientId, clientSecret } = ejSmsCredentials();
  return Boolean(clientId && clientSecret);
}

/** URL publique du callback DLR (configurée par requête dans `callbackUrl`). */
export function ejSmsCallbackUrl(): string {
  const override = (Deno.env.get("EJSMS_CALLBACK_URL") || "").trim();
  if (override) return override;
  const base = (Deno.env.get("SUPABASE_URL") || "").replace(/\/+$/, "");
  if (!base) return "";
  return `${base}/functions/v1/make-server-2eb02e52/sms/dlr`;
}

// ─── Numéro au format EJ SMS (243XXXXXXXXX, sans +) ─────────────────────────

/**
 * Convertit un numéro RDC (local ou international) au format EJ SMS.
 * Accepte : +243XXXXXXXXX, 243XXXXXXXXX, 00243XXXXXXXXX, 0XXXXXXXXX, XXXXXXXXX.
 */
export function toMsisdn(phone: string | null | undefined): string | null {
  if (!phone) return null;

  let digits = String(phone).replace(/\D/g, "");
  if (!digits) return null;

  if (digits.startsWith("00")) digits = digits.slice(2);

  if (/^243\d{9}$/.test(digits)) return digits;
  if (/^0\d{9}$/.test(digits)) return `243${digits.slice(1)}`;
  if (/^\d{9}$/.test(digits)) return `243${digits}`;

  return null;
}

// ─── Token OAuth 2.0 (client_credentials) ───────────────────────────────────

interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

let memoryToken: CachedToken | null = null;

async function requestToken(): Promise<{ ok: boolean; token?: string; error?: string; status?: number }> {
  const { clientId, clientSecret } = ejSmsCredentials();
  if (!clientId || !clientSecret) {
    return { ok: false, error: "EJ SMS non configuré (EJSMS_CLIENT_ID / EJSMS_CLIENT_SECRET)" };
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
    scope: ejSmsScope(),
  });

  try {
    const resp = await fetch(ejSmsTokenUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: body.toString(),
    });
    const data = await resp.json().catch(() => null);

    if (!resp.ok || !data?.access_token) {
      console.error(
        "❌ [EJSMS/TOKEN] Échec d'authentification:",
        resp.status,
        data?.error_description || data?.error || "",
      );
      return {
        ok: false,
        status: resp.status,
        error: data?.error_description || data?.error || `Authentification EJ SMS échouée (${resp.status})`,
      };
    }

    const expiresIn = Number(data.expires_in) || 300;
    const ttlMs = Math.max(30_000, expiresIn * 1000 * TOKEN_SAFETY_RATIO);
    const cached: CachedToken = {
      accessToken: data.access_token,
      expiresAt: Date.now() + ttlMs,
    };
    memoryToken = cached;
    // Partage entre isolates : évite un appel token par requête.
    await kvSet(TOKEN_KV_KEY, cached).catch(() => undefined);

    return { ok: true, token: cached.accessToken };
  } catch (e) {
    console.error("❌ [EJSMS/TOKEN] Exception:", e instanceof Error ? e.message : e);
    return { ok: false, error: "Impossible de joindre le serveur d'authentification EJ SMS" };
  }
}

/**
 * Retourne un access_token valide.
 * Ordre : cache mémoire → cache KV → nouvel appel au token endpoint.
 */
export async function getEjSmsToken(
  force = false,
): Promise<{ ok: boolean; token?: string; error?: string; status?: number }> {
  const now = Date.now();

  if (!force) {
    if (memoryToken && memoryToken.expiresAt > now) {
      return { ok: true, token: memoryToken.accessToken };
    }
    const shared = await kvGet<CachedToken>(TOKEN_KV_KEY).catch(() => null);
    if (shared?.accessToken && shared.expiresAt > now) {
      memoryToken = shared;
      return { ok: true, token: shared.accessToken };
    }
  }

  return await requestToken();
}

// ─── Appels API signés ──────────────────────────────────────────────────────

export interface EjSmsCallResult<T = any> {
  ok: boolean;
  status: number;
  data: T | null;
  error?: string;
}

async function ejSmsRequest<T = any>(
  path: string,
  init: RequestInit = {},
  retry = true,
): Promise<EjSmsCallResult<T>> {
  const auth = await getEjSmsToken();
  if (!auth.ok || !auth.token) {
    return {
      ok: false,
      status: auth.status || 503,
      data: null,
      error: auth.error || "Token EJ SMS indisponible",
    };
  }

  try {
    const resp = await fetch(`${ejSmsApiBase()}${path}`, {
      ...init,
      headers: {
        ...(init.headers || {}),
        Authorization: `Bearer ${auth.token}`,
        Accept: "application/json",
      },
    });

    if (resp.status === 401 && retry) {
      const refreshed = await getEjSmsToken(true);
      if (refreshed.ok) {
        return await ejSmsRequest<T>(path, init, false);
      }
    }

    const data = await resp.json().catch(() => null);
    if (!resp.ok) {
      return {
        ok: false,
        status: resp.status,
        data,
        error:
          (data as any)?.message ||
          (data as any)?.error_description ||
          (data as any)?.error ||
          `Erreur EJ SMS (${resp.status})`,
      };
    }

    return { ok: true, status: resp.status, data };
  } catch (e) {
    console.error(`❌ [EJSMS] ${path}:`, e instanceof Error ? e.message : e);
    return { ok: false, status: 0, data: null, error: "Impossible de joindre l'API EJ SMS" };
  }
}

// ─── Envoi unitaire ─────────────────────────────────────────────────────────

export interface EjSmsSendResult {
  ok: boolean;
  status?: number;
  reference?: string;
  /** Statut renvoyé par l'API : PENDING, SCHEDULED… */
  statut?: string;
  error?: string;
  raw?: any;
}

/**
 * Envoie un SMS à un destinataire unique.
 * Le crédit n'est débité qu'à l'envoi effectif (statut SENT) : un échec
 * synchrone ne consomme rien.
 */
export async function sendEjSms(options: {
  to: string;
  message: string;
  callbackUrl?: string;
}): Promise<EjSmsSendResult> {
  if (!ejSmsConfigured()) {
    return { ok: false, error: "EJ SMS non configuré (EJSMS_CLIENT_ID / EJSMS_CLIENT_SECRET)" };
  }

  const msisdn = toMsisdn(options.to);
  if (!msisdn) {
    return { ok: false, error: `Numéro invalide (attendu 243XXXXXXXXX) : ${options.to}` };
  }

  const message = String(options.message ?? "").trim();
  if (!message) {
    return { ok: false, error: "Message vide" };
  }

  const callbackUrl = options.callbackUrl ?? ejSmsCallbackUrl();

  const body: Record<string, unknown> = {
    sender: ejSmsSender(),
    message,
    msisdn,
  };
  if (callbackUrl) body.callbackUrl = callbackUrl;

  const res = await ejSmsRequest<any>("/sms/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    return { ok: false, status: res.status, error: res.error, raw: res.data };
  }

  return {
    ok: true,
    status: res.status,
    reference: res.data?.reference || res.data?.id || null,
    statut: res.data?.statut || res.data?.status || "PENDING",
    raw: res.data,
  };
}

// ─── Solde de crédits ───────────────────────────────────────────────────────

export async function getEjSmsBalance(): Promise<{
  ok: boolean;
  credits?: number;
  statut?: string;
  dateUpdate?: string;
  entrepriseId?: string;
  error?: string;
  status?: number;
}> {
  const res = await ejSmsRequest<any>("/sms/credits/balance");
  if (!res.ok) {
    return { ok: false, error: res.error, status: res.status };
  }

  return {
    ok: true,
    credits: Number(res.data?.solde ?? 0),
    statut: res.data?.statut || "",
    dateUpdate: res.data?.dateUpdate || "",
    entrepriseId: res.data?.entrepriseId || "",
  };
}

// ─── Vérification de la signature des callbacks DLR ─────────────────────────

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Vérifie `X-EJSms-Signature` : HMAC-SHA512 hexadécimal du **corps brut**.
 * La comparaison est faite en temps constant.
 */
export async function verifyEjSmsSignature(
  rawBody: string,
  signature: string | null | undefined,
): Promise<boolean> {
  const secret = ejSmsWebhookSecret();
  if (!secret || !signature) return false;

  const provided = String(signature).trim().replace(/^sha512=/i, "").toLowerCase();
  if (!/^[0-9a-f]+$/.test(provided)) return false;

  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-512" },
      false,
      ["sign"],
    );
    const digest = await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(rawBody),
    );
    const expected = toHex(digest);

    if (expected.length !== provided.length) return false;

    let diff = 0;
    for (let i = 0; i < expected.length; i += 1) {
      diff |= expected.charCodeAt(i) ^ provided.charCodeAt(i);
    }
    return diff === 0;
  } catch (e) {
    console.error("❌ [EJSMS/SIGNATURE] Exception:", e instanceof Error ? e.message : e);
    return false;
  }
}
