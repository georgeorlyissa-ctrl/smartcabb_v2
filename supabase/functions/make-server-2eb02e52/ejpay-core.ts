/**
 * 💳 EJ PAY — Client API (OAuth 2.0) — Mobile Money RDC
 * ---------------------------------------------------------------------------
 * Guide de référence : EJ PAY API User Guide v3.6.7 (EJSARL), janvier 2026.
 *
 * Ce module est **autonome** : il ne dépend que de `kv-wrapper.ts`.
 * Il ne lit jamais de secret en dur — tout vient des secrets Supabase :
 *
 *   EJPAY_CLIENT_ID        (dashboard https://pay.ejsarl.cd → API Credentials)
 *   EJPAY_CLIENT_SECRET    (affiché une seule fois)
 *   EJPAY_WEBHOOK_SECRET   (préfixe `whsec_…`, pour vérifier X-EJPay-Signature)
 *   EJPAY_SCOPE            (optionnel — défaut « payment:write payment:read »)
 *   EJPAY_TOKEN_URL        (optionnel — défaut Keycloak EJ PAY)
 *   EJPAY_API_BASE         (optionnel — défaut https://api.ejsarl.cd)
 *
 * Rappels du guide :
 *  - le token d'accès vit 5 min (300 s) → on le renouvelle à 90 % de sa durée ;
 *  - les paiements sont **asynchrones** : la réponse synchrone est toujours
 *    `PENDING` (statutCode 1). Seul le callback signé (ou le polling du statut)
 *    donne le résultat final ;
 *  - `orderId` est la clé d'idempotence : le réutiliser évite tout double débit ;
 *  - le numéro client s'envoie **toujours** au format `243XXXXXXXXX`.
 */

import {
  get as kvGet,
  set as kvSet,
  getByPrefix as kvGetByPrefix,
} from "./kv-wrapper.ts";

// ─── Constantes API ──────────────────────────────────────────────────────────

const DEFAULT_TOKEN_URL =
  "https://auth.ejsarl.cd/realms/ej-payment/protocol/openid-connect/token";
const DEFAULT_API_BASE = "https://api.ejsarl.cd";
const DEFAULT_SCOPE = "payment:write payment:read";
const TOKEN_SAFETY_RATIO = 0.9; // renouvellement à 90 % de la durée de vie
const TOKEN_KV_KEY = "ejpay_token_cache";
const CONFIG_KEY = "smartcabb_global_config";

// ─── Opérateurs (section XI du guide) ───────────────────────────────────────

export interface EjpayOperator {
  id: number;
  key: "mpesa" | "orange" | "airtel" | "afrimoney";
  name: string;
}

export const EJPAY_OPERATORS: EjpayOperator[] = [
  { id: 9, key: "mpesa", name: "Vodacom M-Pesa" },
  { id: 10, key: "orange", name: "Orange Money" },
  { id: 17, key: "airtel", name: "Airtel Money" },
  { id: 19, key: "afrimoney", name: "Africell Afrimoney" },
];

export function resolveOperator(input: number | string | null | undefined): EjpayOperator | null {
  if (input === null || input === undefined) return null;
  if (typeof input === "number" || /^\d+$/.test(String(input))) {
    const id = Number(input);
    return EJPAY_OPERATORS.find((o) => o.id === id) ?? null;
  }
  const key = String(input).toLowerCase();
  return EJPAY_OPERATORS.find((o) => o.key === key) ?? null;
}

// ─── Configuration / activation ─────────────────────────────────────────────

export function ejpayTokenUrl(): string {
  return Deno.env.get("EJPAY_TOKEN_URL") || DEFAULT_TOKEN_URL;
}

export function ejpayApiBase(): string {
  return (Deno.env.get("EJPAY_API_BASE") || DEFAULT_API_BASE).replace(/\/+$/, "");
}

export function ejpayScope(): string {
  return Deno.env.get("EJPAY_SCOPE") || DEFAULT_SCOPE;
}

export function ejpayCredentials(): { clientId: string; clientSecret: string } {
  return {
    clientId: Deno.env.get("EJPAY_CLIENT_ID") || "",
    clientSecret: Deno.env.get("EJPAY_CLIENT_SECRET") || "",
  };
}

export function ejpayWebhookSecret(): string {
  return Deno.env.get("EJPAY_WEBHOOK_SECRET") || "";
}

/** Les 3 secrets obligatoires sont-ils présents ? (ne révèle jamais leur valeur) */
export function ejpayConfigured(): boolean {
  const { clientId, clientSecret } = ejpayCredentials();
  return Boolean(clientId && clientSecret);
}

/**
 * Le drapeau `ejpayEnabled` de la configuration globale est-il actif ?
 * Tant qu'il est faux, **aucune** route Ejpay n'accepte de paiement :
 * on peut donc déployer le code sans risque avant la mise en production.
 */
export async function ejpayEnabled(): Promise<boolean> {
  if (!ejpayConfigured()) return false;
  try {
    const cfg = await kvGet<any>(CONFIG_KEY);
    return cfg?.ejpayEnabled === true;
  } catch {
    return false;
  }
}

/** URL publique du callback (doit répondre 200 en moins de 10 s). */
export function ejpayCallbackUrl(): string {
  const base = (Deno.env.get("SUPABASE_URL") || "").replace(/\/+$/, "");
  if (!base) return "";
  return `${base}/functions/v1/make-server-2eb02e52/ejpay/webhook`;
}

// ─── Token OAuth 2.0 (client_credentials) ───────────────────────────────────

interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

let memoryToken: CachedToken | null = null;

async function requestToken(): Promise<{ ok: boolean; token?: string; error?: string; status?: number }> {
  const { clientId, clientSecret } = ejpayCredentials();
  if (!clientId || !clientSecret) {
    return { ok: false, error: "Ejpay non configuré (EJPAY_CLIENT_ID / EJPAY_CLIENT_SECRET)" };
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
    scope: ejpayScope(),
  });

  try {
    const resp = await fetch(ejpayTokenUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: body.toString(),
    });
    const data = await resp.json().catch(() => null);

    if (!resp.ok || !data?.access_token) {
      console.error("❌ [EJPAY/TOKEN] Échec d'authentification:", resp.status, data?.error_description || data?.error || "");
      return {
        ok: false,
        status: resp.status,
        error: data?.error_description || data?.error || `Authentification Ejpay échouée (${resp.status})`,
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
    console.error("❌ [EJPAY/TOKEN] Exception:", e instanceof Error ? e.message : e);
    return { ok: false, error: "Impossible de joindre le serveur d'authentification Ejpay" };
  }
}

/**
 * Retourne un access_token valide.
 * Ordre : cache mémoire → cache KV → nouvel appel au token endpoint.
 */
export async function getAccessToken(force = false): Promise<{ ok: boolean; token?: string; error?: string; status?: number }> {
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

export interface EjpayCallResult<T = any> {
  ok: boolean;
  status: number;
  data: T | null;
  error?: string;
}

/**
 * Appel authentifié vers api.ejsarl.cd.
 * En cas de 401 (token expiré/révoqué), on redemande un token et on réessaie
 * une seule fois — comportement recommandé par le guide (§ 6.9 / 10).
 */
async function ejRequest<T = any>(
  path: string,
  init: RequestInit = {},
  retry = true,
): Promise<EjpayCallResult<T>> {
  const auth = await getAccessToken();
  if (!auth.ok || !auth.token) {
    return { ok: false, status: auth.status || 503, data: null, error: auth.error || "Token Ejpay indisponible" };
  }

  try {
    const resp = await fetch(`${ejpayApiBase()}${path}`, {
      ...init,
      headers: {
        ...(init.headers || {}),
        Authorization: `Bearer ${auth.token}`,
        Accept: "application/json",
      },
    });

    if (resp.status === 401 && retry) {
      const refreshed = await getAccessToken(true);
      if (refreshed.ok) {
        return await ejRequest<T>(path, init, false);
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
          (data as any)?.reason ||
          (data as any)?.error ||
          `Ejpay a répondu ${resp.status}`,
      };
    }
    return { ok: true, status: resp.status, data };
  } catch (e) {
    return {
      ok: false,
      status: 0,
      data: null,
      error: e instanceof Error ? e.message : "Erreur réseau Ejpay",
    };
  }
}

export interface EjpayPaymentRequest {
  msisdn: string;
  amount: number | string;
  currency?: "CDF" | "USD";
  operatorId: number;
  orderId: string;
  callbackUrl?: string;
}

function paymentBody(req: EjpayPaymentRequest) {
  return {
    msisdn: req.msisdn,
    // Le guide attend une chaîne (« 100 ») ; on garde 2 décimales max.
    amount: String(Number(req.amount)),
    currency: req.currency || "CDF",
    operatorId: req.operatorId,
    orderId: req.orderId,
    callbackUrl: req.callbackUrl || ejpayCallbackUrl(),
  };
}

/** C2B — le client paie le marchand (collecte). */
export async function ejpayCollect(req: EjpayPaymentRequest): Promise<EjpayCallResult> {
  return await ejRequest("/payment/c2b", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(paymentBody(req)),
  });
}

/** B2C — le marchand paie le client (décaissement / retrait chauffeur). */
export async function ejpayPayout(req: EjpayPaymentRequest): Promise<EjpayCallResult> {
  return await ejRequest("/payment/b2c", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(paymentBody(req)),
  });
}

/** B2C en lot (scope `payment:bulk` requis). */
export async function ejpayBulkPayout(reqs: EjpayPaymentRequest[]): Promise<EjpayCallResult> {
  return await ejRequest("/payment/b2c/bulk", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(reqs.map(paymentBody)),
  });
}

/** Statut d'une transaction, par sa `reference` Ejpay. */
export async function ejpayStatus(reference: string): Promise<EjpayCallResult> {
  return await ejRequest(`/payment/${encodeURIComponent(reference)}`, { method: "GET" });
}

/** Soldes des portefeuilles marchand (un par opérateur + devise). */
export async function ejpayWallets(): Promise<EjpayCallResult> {
  return await ejRequest("/payment/wallets", { method: "GET" });
}

// ─── Signature du callback (section V) ──────────────────────────────────────

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Vérifie `X-EJPay-Signature` = HMAC-SHA512(rawBody, webhookSecret), en hex.
 * ⚠️ Toujours passer le **corps brut** (avant tout JSON.parse/re-sérialisation).
 */
export async function verifyWebhookSignature(
  rawBody: string,
  headerSignature: string | null | undefined,
): Promise<boolean> {
  const secret = ejpayWebhookSecret();
  if (!secret || !headerSignature) return false;
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-512" },
      false,
      ["sign"],
    );
    const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
    return timingSafeEqual(toHex(signature), String(headerSignature).trim().toLowerCase());
  } catch (e) {
    console.error("❌ [EJPAY/WEBHOOK] Erreur de vérification:", e);
    return false;
  }
}

// ─── Numéros de téléphone ───────────────────────────────────────────────────

/**
 * Ejpay exige `243XXXXXXXXX` (sans « + »), quel que soit l'opérateur.
 * Accepte : +243…, 00243…, 243…, 0XXXXXXXXX (10 chiffres), 9 chiffres.
 */
export function toEjpayMsisdn(input: string | null | undefined): string | null {
  if (!input) return null;
  let cleaned = String(input).replace(/[\s\-().]/g, "");
  if (cleaned.startsWith("+")) cleaned = cleaned.slice(1);
  if (cleaned.startsWith("00")) cleaned = cleaned.slice(2);

  if (/^243\d{9}$/.test(cleaned)) return cleaned;
  if (/^0\d{9}$/.test(cleaned)) return "243" + cleaned.slice(1);
  if (/^\d{9}$/.test(cleaned)) return "243" + cleaned;

  return null;
}

// ─── Suivi des ordres (idempotence + réconciliation) ────────────────────────

export type EjpayKind = "wallet_topup" | "ride_payment" | "deposit" | "payout" | "other";
export type EjpayStatus = "PENDING" | "SUCCESS" | "FAILED" | "CANCELLED" | "REVIEW";

export interface EjpayOrder {
  orderId: string;
  reference: string | null;
  direction: "C2B" | "B2C";
  kind: EjpayKind;
  amount: number;
  currency: "CDF" | "USD";
  operatorId: number;
  operatorName: string;
  msisdn: string;
  status: EjpayStatus;
  statutCode: number | null;
  reason: string | null;
  rideId?: string | null;
  passengerId?: string | null;
  driverId?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  settledAt?: string | null;
  refundedAt?: string | null;
  webhookEvents: number;
  remote?: Record<string, unknown> | null;
}

const ORDER_PREFIX = "ejpay_order:";
const EVENT_PREFIX = "ejpay_event:";

export function orderKey(orderId: string): string {
  return `${ORDER_PREFIX}${orderId}`;
}

export async function getOrder(orderId: string): Promise<EjpayOrder | null> {
  return await kvGet<EjpayOrder>(orderKey(orderId));
}

export async function saveOrder(order: EjpayOrder): Promise<void> {
  order.updatedAt = new Date().toISOString();
  await kvSet(orderKey(order.orderId), order);
}

export async function listOrders(limit = 100): Promise<EjpayOrder[]> {
  const all = await kvGetByPrefix<EjpayOrder>(ORDER_PREFIX);
  return all
    .filter(Boolean)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

/** Journalise chaque callback reçu (audit + réconciliation). */
export async function logWebhookEvent(orderId: string, payload: unknown, signatureOk: boolean): Promise<void> {
  const key = `${EVENT_PREFIX}${orderId}:${Date.now()}:${Math.random().toString(36).slice(2, 7)}`;
  await kvSet(key, {
    orderId,
    signatureOk,
    receivedAt: new Date().toISOString(),
    payload,
  }).catch(() => undefined);
}

/** `statutCode` numérique du callback, avec tolérance à la faute `stautCode` du guide. */
export function readStatutCode(payload: any): number | null {
  const raw = payload?.statutCode ?? payload?.stautCode ?? payload?.statusCode;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}
