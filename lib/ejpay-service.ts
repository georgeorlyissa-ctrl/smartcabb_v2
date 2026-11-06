/**
 * 💳 SERVICE EJPAY — Mobile Money (côté client)
 * ---------------------------------------------------------------------------
 * Toutes les requêtes passent par l'Edge Function SmartCabb : aucun secret
 * Ejpay (client_id / client_secret / webhook) ne transite par le navigateur.
 *
 * Le backend expose :
 *   GET  /ejpay/config              → état (enabled / configured), opérateurs, minimums
 *   POST /ejpay/collect             → initiation d'un encaissement (C2B)
 *   GET  /ejpay/status/:orderId     → statut local (rafraîchi auprès d'Ejpay si nécessaire)
 *   POST /ejpay/orders/:id/refresh  → réconciliation forcée (admin)
 *   GET  /ejpay/orders              → liste (admin, X-Admin-Secret)
 *   GET  /ejpay/wallets             → soldes marchand (admin, X-Admin-Secret)
 *
 * ⚠️ Le paiement Mobile Money est **asynchrone** : `collect` renvoie toujours
 * `PENDING`, le client valide sur son téléphone, puis `waitForEjpayOrder`
 * détecte le résultat final (webhook ou interrogation du statut).
 */

import { projectId, publicAnonKey } from '../utils/supabase/info';

const BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/ejpay`;

// ─── Types ──────────────────────────────────────────────────────────────────

export type EjpayStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'REVIEW';
export type EjpayCurrency = 'CDF' | 'USD';
export type EjpayKind = 'wallet_topup' | 'ride_payment' | 'deposit' | 'other';

export interface EjpayOperator {
  id: number;
  key: string;
  name: string;
}

export interface EjpayConfig {
  enabled: boolean;
  configured: boolean;
  provider: string;
  version: string;
  currencies: EjpayCurrency[];
  operators: EjpayOperator[];
  minAmount: Record<EjpayCurrency, number>;
  callbackConfigured: boolean;
}

export interface EjpayCollectInput {
  amount: number;
  currency?: EjpayCurrency;
  /** Numéro au format local ou international, normalisé par le serveur. */
  msisdn: string;
  /** Id numérique (9, 10, 17, 19) ou clé (`mpesa`, `orange_money`, …). */
  operatorId?: number | string | null;
  kind?: EjpayKind;
  orderId?: string;
  rideId?: string | null;
  passengerId?: string | null;
  label?: string | null;
  source?: string;
}

export interface EjpayOrderView {
  success: boolean;
  orderId: string;
  reference: string | null;
  status: EjpayStatus;
  statutCode?: number | null;
  reason?: string | null;
  amount?: number;
  currency?: EjpayCurrency;
  kind?: EjpayKind;
  direction?: 'C2B' | 'B2C';
  operator?: { id: number; name: string } | null;
  settledAt?: string | null;
  createdAt?: string;
  error?: string;
  code?: string;
  duplicate?: boolean;
  message?: string;
}

// ─── Opérateurs ─────────────────────────────────────────────────────────────

export const EJPAY_OPERATORS: EjpayOperator[] = [
  { id: 9, key: 'mpesa', name: 'Vodacom M-Pesa' },
  { id: 10, key: 'orange', name: 'Orange Money' },
  { id: 17, key: 'airtel', name: 'Airtel Money' },
  { id: 19, key: 'afrimoney', name: 'Africell Afrimoney' },
];

/**
 * Les écrans SmartCabb utilisent plusieurs identifiants pour le même opérateur
 * (`mpesa`, `orange_money`, `airtel_money`, `afrimoney`…). On les ramène tous
 * vers l'identifiant numérique attendu par Ejpay.
 */
const OPERATOR_ALIASES: Record<string, number> = {
  // Vodacom M-Pesa
  '9': 9, mpesa: 9, 'm-pesa': 9, vodacom: 9, vodacom_mpesa: 9,
  // Orange Money
  '10': 10, orange: 10, orange_money: 10, orangemoney: 10,
  // Airtel Money
  '17': 17, airtel: 17, airtel_money: 17, airtelmoney: 17,
  // Africell Afrimoney
  '19': 19, africell: 19, afrimoney: 19, africell_money: 19,
};

export function toOperatorId(network: string | number | null | undefined): number | null {
  if (network === null || network === undefined) return null;
  if (typeof network === 'number') {
    return EJPAY_OPERATORS.some((o) => o.id === network) ? network : null;
  }
  const key = String(network).trim().toLowerCase().replace(/\s+/g, '_');
  return OPERATOR_ALIASES[key] ?? null;
}

export function operatorName(network: string | number | null | undefined): string | null {
  const id = toOperatorId(network);
  return EJPAY_OPERATORS.find((o) => o.id === id)?.name ?? null;
}

/** Affiche `243812345678` sous la forme `+243 812 345 678` (confort de lecture). */
export function formatMsisdn(msisdn: string | null | undefined): string {
  if (!msisdn) return '';
  const digits = String(msisdn).replace(/\D/g, '');
  const national = digits.startsWith('243') ? digits.slice(3) : digits;
  if (national.length !== 9) return String(msisdn);
  return `+243 ${national.slice(0, 3)} ${national.slice(3, 6)} ${national.slice(6)}`;
}

// ─── Transport ──────────────────────────────────────────────────────────────

function headers(extra?: Record<string, string>): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${publicAnonKey}`,
    ...(extra || {}),
  };
}

async function readJson(response: Response): Promise<any> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

// ─── Configuration (mise en cache 60 s) ─────────────────────────────────────

let configCache: { value: EjpayConfig; expiresAt: number } | null = null;

export async function getEjpayConfig(force = false): Promise<EjpayConfig | null> {
  if (!force && configCache && configCache.expiresAt > Date.now()) {
    return configCache.value;
  }
  try {
    const response = await fetch(`${BASE_URL}/config`, { headers: headers() });
    if (!response.ok) return null;
    const data = await readJson(response);
    if (!data?.success) return null;
    const value: EjpayConfig = {
      enabled: Boolean(data.enabled),
      configured: Boolean(data.configured),
      provider: data.provider || 'ejpay',
      version: data.version || '3.6.7',
      currencies: data.currencies || ['CDF', 'USD'],
      operators: data.operators || EJPAY_OPERATORS,
      minAmount: data.minAmount || { CDF: 100, USD: 1 },
      callbackConfigured: Boolean(data.callbackConfigured),
    };
    configCache = { value, expiresAt: Date.now() + 60_000 };
    return value;
  } catch (error) {
    console.warn('⚠️ [EJPAY] Configuration indisponible:', error);
    return null;
  }
}

// ─── Encaissement (C2B) ─────────────────────────────────────────────────────

export async function collectEjpayPayment(input: EjpayCollectInput): Promise<EjpayOrderView> {
  try {
    const response = await fetch(`${BASE_URL}/collect`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        amount: input.amount,
        currency: input.currency || 'CDF',
        msisdn: input.msisdn,
        operatorId: input.operatorId ?? null,
        kind: input.kind || 'wallet_topup',
        orderId: input.orderId,
        rideId: input.rideId ?? null,
        passengerId: input.passengerId ?? null,
        label: input.label ?? null,
        source: input.source || 'app',
      }),
    });

    const data = await readJson(response);

    if (!response.ok || !data?.success) {
      return {
        success: false,
        orderId: data?.orderId || input.orderId || '',
        reference: data?.reference || null,
        status: (data?.status as EjpayStatus) || 'FAILED',
        error: data?.error || `Paiement indisponible (${response.status})`,
        code: data?.code,
        duplicate: Boolean(data?.duplicate),
      };
    }

    return {
      success: true,
      orderId: data.orderId,
      reference: data.reference || null,
      status: (data.status as EjpayStatus) || 'PENDING',
      message: data.message,
      amount: data.amount,
      currency: data.currency,
      operator: data.operator || null,
      duplicate: Boolean(data.duplicate),
    };
  } catch (error: any) {
    console.error('❌ [EJPAY] collect:', error);
    return {
      success: false,
      orderId: input.orderId || '',
      reference: null,
      status: 'FAILED',
      error: error?.message || 'Réseau indisponible — vérifiez votre connexion',
      code: 'NETWORK_ERROR',
    };
  }
}

// ─── Statut ─────────────────────────────────────────────────────────────────

export async function getEjpayStatus(orderId: string, refresh = false): Promise<EjpayOrderView> {
  try {
    const url = `${BASE_URL}/status/${encodeURIComponent(orderId)}${refresh ? '?refresh=1' : ''}`;
    const response = await fetch(url, { headers: headers() });
    const data = await readJson(response);

    if (!response.ok || !data?.success) {
      return {
        success: false,
        orderId,
        reference: data?.reference || null,
        status: (data?.status as EjpayStatus) || 'PENDING',
        error: data?.error || `Statut indisponible (${response.status})`,
      };
    }

    return {
      success: true,
      orderId: data.orderId,
      reference: data.reference || null,
      status: (data.status as EjpayStatus) || 'PENDING',
      statutCode: data.statutCode ?? null,
      reason: data.reason ?? null,
      amount: data.amount,
      currency: data.currency,
      kind: data.kind,
      direction: data.direction,
      operator: data.operator || null,
      settledAt: data.settledAt || null,
      createdAt: data.createdAt,
    };
  } catch (error: any) {
    return {
      success: false,
      orderId,
      reference: null,
      status: 'PENDING',
      error: error?.message || 'Réseau indisponible',
    };
  }
}

// ─── Attente du résultat final (polling) ────────────────────────────────────

export interface WaitForOrderOptions {
  /** Intervalle entre deux interrogations (défaut 3 s). */
  intervalMs?: number;
  /** Durée maximale d'attente (défaut 3 min). */
  timeoutMs?: number;
  /** Appelé à chaque interrogation (utile pour afficher le temps écoulé). */
  onTick?: (elapsedMs: number) => void;
  /** Permet d'annuler l'attente (bouton « Annuler »). */
  signal?: AbortSignal;
}

export interface WaitForOrderResult {
  status: 'SUCCESS' | 'FAILED' | 'REVIEW' | 'TIMEOUT' | 'CANCELLED';
  elapsedMs: number;
  reason?: string | null;
  order?: EjpayOrderView;
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Attend que l'ordre quitte l'état `PENDING`.
 * Le backend interroge Ejpay lui-même au-delà de 8 s : on se contente donc de
 * relire `GET /ejpay/status/:orderId`, sans marteler l'API du fournisseur.
 */
export async function waitForEjpayOrder(
  orderId: string,
  options: WaitForOrderOptions = {},
): Promise<WaitForOrderResult> {
  const intervalMs = options.intervalMs ?? 3000;
  const timeoutMs = options.timeoutMs ?? 180_000;
  const startedAt = Date.now();

  let last: EjpayOrderView | null = null;

  while (Date.now() - startedAt < timeoutMs) {
    if (options.signal?.aborted) {
      return { status: 'CANCELLED', elapsedMs: Date.now() - startedAt, order: last || undefined };
    }

    const order = await getEjpayStatus(orderId);
    if (order.success) last = order;

    if (last?.status === 'SUCCESS') {
      return { status: 'SUCCESS', elapsedMs: Date.now() - startedAt, order: last };
    }
    if (last?.status === 'FAILED') {
      return {
        status: 'FAILED',
        elapsedMs: Date.now() - startedAt,
        reason: last.reason,
        order: last,
      };
    }
    if (last?.status === 'REVIEW') {
      return {
        status: 'REVIEW',
        elapsedMs: Date.now() - startedAt,
        reason: last.reason,
        order: last,
      };
    }

    options.onTick?.(Date.now() - startedAt);
    await sleep(intervalMs);
  }

  return {
    status: 'TIMEOUT',
    elapsedMs: Date.now() - startedAt,
    reason: 'Délai dépassé — le paiement sera confirmé automatiquement dès réception',
    order: last || undefined,
  };
}

// ─── Administration (X-Admin-Secret requis) ─────────────────────────────────

export async function listEjpayOrders(
  adminSecret: string,
  params: { limit?: number; status?: EjpayStatus } = {},
): Promise<{ success: boolean; orders: EjpayOrderView[]; error?: string }> {
  const query = new URLSearchParams();
  if (params.limit) query.set('limit', String(params.limit));
  if (params.status) query.set('status', params.status);

  const response = await fetch(`${BASE_URL}/orders${query.size ? `?${query}` : ''}`, {
    headers: headers({ 'X-Admin-Secret': adminSecret }),
  });
  const data = await readJson(response);
  if (!response.ok || !data?.success) {
    return { success: false, orders: [], error: data?.error || `Erreur ${response.status}` };
  }
  return { success: true, orders: data.orders || [] };
}

export async function getEjpayWallets(
  adminSecret: string,
): Promise<{ success: boolean; wallets: any[]; error?: string }> {
  const response = await fetch(`${BASE_URL}/wallets`, {
    headers: headers({ 'X-Admin-Secret': adminSecret }),
  });
  const data = await readJson(response);
  if (!response.ok || !data?.success) {
    return { success: false, wallets: [], error: data?.error || `Erreur ${response.status}` };
  }
  return { success: true, wallets: data.wallets || [] };
}

export async function refreshEjpayOrder(
  adminSecret: string,
  orderId: string,
): Promise<{ success: boolean; status?: EjpayStatus; error?: string }> {
  const response = await fetch(`${BASE_URL}/orders/${encodeURIComponent(orderId)}/refresh`, {
    method: 'POST',
    headers: headers({ 'X-Admin-Secret': adminSecret }),
  });
  const data = await readJson(response);
  if (!response.ok || !data?.success) {
    return { success: false, error: data?.error || `Erreur ${response.status}` };
  }
  return { success: true, status: data.status };
}
