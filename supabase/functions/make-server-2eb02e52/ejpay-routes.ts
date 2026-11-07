/**
 * 💳 EJ PAY — Routes HTTP (Mobile Money RDC)
 * ---------------------------------------------------------------------------
 * Monté dans `index.ts` sous : /make-server-2eb02e52/ejpay
 *
 *   GET  /config                     — état (activé/configuré), opérateurs, devises
 *   POST /collect                    — C2B : le client paie (recharge wallet, course…)
 *   GET  /status/:orderId            — statut local (+ rafraîchi auprès d'Ejpay)
 *   POST /webhook                    — callback signé (X-EJPay-Signature, HMAC-SHA512)
 *   POST /payout                     — B2C : retrait chauffeur (protégé par secret admin)
 *   GET  /orders                     — liste des transactions (admin)
 *   GET  /wallets                    — soldes marchand chez Ejpay (admin)
 *   POST /orders/:orderId/refresh    — re-vérifie le statut auprès d'Ejpay (admin)
 *
 * Sécurité : toutes les opérations **sortantes** (payout, listes, wallets) exigent
 * l'en-tête `X-Admin-Secret`. Les opérations entrantes (collect) sont limitées par
 * le rate-limit global et ne peuvent que faire *entrer* de l'argent chez SmartCabb.
 *
 * Idempotence : `orderId` est la clé. Un ordre déjà `SUCCESS` n'est jamais rejoué,
 * un ordre `PENDING` n'est jamais ré-initié, et le crédit n'est appliqué qu'une
 * seule fois (garde `settledAt`).
 */

import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  get as kvGet,
  set as kvSet,
} from "./kv-wrapper.ts";
import { sendFCMNotification } from "./firebase-admin.ts";
import {
  EJPAY_OPERATORS,
  ejpayCollect,
  ejpayConfigured,
  ejpayEnabled,
  ejpayPayout,
  ejpayStatus,
  ejpayWallets,
  ejpayCallbackUrl,
  getAccessToken,
  getOrder,
  listOrders,
  logWebhookEvent,
  readStatutCode,
  resolveOperator,
  saveOrder,
  toEjpayMsisdn,
  verifyWebhookSignature,
  type EjpayKind,
  type EjpayOrder,
} from "./ejpay-core.ts";

const app = new Hono();

const EVENT_PREFIX = "event:";

// ─── Helpers ────────────────────────────────────────────────────────────────

function sbAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
}

/** Événement visible dans le fil d'activité admin (même format que ride-routes). */
async function logAdminEvent(type: string, data: Record<string, unknown>): Promise<void> {
  try {
    const eventId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const today = new Date().toISOString().slice(0, 10);
    await kvSet(`${EVENT_PREFIX}${today}:${eventId}`, {
      id: eventId,
      type,
      data,
      actor: "system",
      timestamp: new Date().toISOString(),
    });
  } catch {
    /* un log ne doit jamais bloquer un paiement */
  }
}

/** Vérifie l'en-tête X-Admin-Secret en temps constant. */
function isAdminRequest(headers: Headers): boolean {
  const expected = Deno.env.get("EJPAY_ADMIN_SECRET") || Deno.env.get("ADMIN_CREATION_SECRET") || "";
  if (!expected) return false;
  const provided = headers.get("x-admin-secret") || "";
  if (!provided || provided.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

function normalizeCurrency(value: unknown): "CDF" | "USD" {
  return String(value || "CDF").toUpperCase() === "USD" ? "USD" : "CDF";
}

function minAmount(currency: "CDF" | "USD"): number {
  const raw = Deno.env.get(currency === "USD" ? "EJPAY_MIN_USD" : "EJPAY_MIN_CDF");
  const fallback = currency === "USD" ? 1 : 100;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function newOrderId(kind: EjpayKind): string {
  const tag = kind === "payout" ? "PAYOUT" : kind === "ride_payment" ? "RIDE" : kind === "deposit" ? "DEP" : "TOPUP";
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `SC-${tag}-${stamp}-${rand}`;
}

function paymentStatusOf(code: number | null, fallback?: unknown): "PENDING" | "SUCCESS" | "FAILED" {
  if (code === 2) return "SUCCESS";
  if (code === 3) return "FAILED";
  const s = String(fallback || "").toUpperCase();
  if (s === "SUCCESS") return "SUCCESS";
  if (s === "FAILED") return "FAILED";
  return "PENDING";
}

// ─── Règlement métier (une seule fois par ordre) ─────────────────────────────

async function creditPassengerWallet(passengerId: string, amount: number, order: EjpayOrder): Promise<number> {
  let passenger = await kvGet<any>(`passenger:${passengerId}`);
  if (!passenger) passenger = (await kvGet<any>(`profile:${passengerId}`)) || { id: passengerId };

  const current = Number(passenger.walletBalance ?? passenger.balance ?? 0);
  const next = current + amount;

  const updated = {
    ...passenger,
    walletBalance: next,
    balance: next,
    updated_at: new Date().toISOString(),
  };
  await kvSet(`passenger:${passengerId}`, updated);
  await kvSet(`profile:${passengerId}`, updated);
  await kvSet(`wallet_tx:${order.orderId}`, {
    id: order.orderId,
    passengerId,
    type: "recharge",
    method: "ejpay",
    amount,
    currency: order.currency,
    balanceBefore: current,
    balanceAfter: next,
    reference: order.reference,
    status: "completed",
    created_at: order.createdAt,
    completed_at: new Date().toISOString(),
  });

  return next;
}

/**
 * Crédit du portefeuille chauffeur après confirmation Ejpay (forfait / recharge).
 * Idempotence garantie par `settledAt` en amont. Le solde chauffeur vit sous
 * `driver:<id>` avec `balance` et `creditBalance` maintenus à la même valeur.
 */
async function creditDriverWallet(driverId: string, amount: number, order: EjpayOrder): Promise<number> {
  const driver = await kvGet<any>(`driver:${driverId}`);
  if (!driver) {
    console.warn("⚠️ [EJPAY/SETTLE] Chauffeur introuvable pour le crédit:", driverId);
    return 0;
  }

  const balanceRaw = driver.balance ?? null;
  const creditRaw = driver.creditBalance ?? null;
  const current =
    balanceRaw !== null && creditRaw !== null
      ? Math.min(Number(balanceRaw), Number(creditRaw))
      : Number(balanceRaw ?? creditRaw ?? 0);
  const next = current + amount;

  // Prolongation du forfait (jours fournis à l'initiation), stockée côté serveur.
  const days = Number(order.metadata?.days ?? 0);
  let expiry = driver.wallet_expiry_date ? new Date(driver.wallet_expiry_date) : null;
  if (days > 0) {
    const start = expiry && expiry.getTime() > Date.now() ? expiry : new Date();
    start.setDate(start.getDate() + days);
    expiry = start;
  }

  await kvSet(`driver:${driverId}`, {
    ...driver,
    balance: next,
    creditBalance: next,
    wallet_expiry_date: expiry ? expiry.toISOString() : driver.wallet_expiry_date ?? null,
    updated_at: new Date().toISOString(),
  });

  await kvSet(`wallet_tx:${order.orderId}`, {
    id: order.orderId,
    driverId,
    type: "recharge",
    method: "ejpay",
    amount,
    currency: order.currency,
    balanceBefore: current,
    balanceAfter: next,
    days: days > 0 ? days : null,
    reference: order.reference,
    status: "completed",
    created_at: order.createdAt,
    completed_at: new Date().toISOString(),
  });

  // Notifications (push + SMS) non bloquantes pour le chauffeur.
  try {
    if (driver.fcmToken) {
      await sendFCMNotification(driver.fcmToken, {
        title: "✅ Recharge confirmée",
        body: `${amount.toLocaleString("fr-FR")} ${order.currency} crédités sur votre portefeuille.`,
        data: { type: "driver_wallet_recharge", orderId: order.orderId },
      });
    }
  } catch { /* push non bloquant */ }

  return next;
}

async function settleOrder(order: EjpayOrder, payload: any): Promise<EjpayOrder> {
  if (order.settledAt) return order; // déjà réglé → jamais deux fois

  const amount = Number(order.amount);
  const targetId = order.passengerId || order.driverId || (order.metadata?.userId as string) || null;

  if (order.direction === "B2C") {
    // ── Retrait chauffeur : le solde a été débité à l'initiation ────────────
    if (order.driverId) {
      const driver = await kvGet<any>(`driver:${order.driverId}`);
      if (driver) {
        const before = Number(driver.bonusBalance ?? 0);
        await kvSet(`driver:${order.driverId}`, {
          ...driver,
          updated_at: new Date().toISOString(),
        });
        await kvSet(`wallet_tx:${order.orderId}`, {
          id: order.orderId,
          driverId: order.driverId,
          type: "withdraw",
          method: "ejpay",
          amount,
          currency: order.currency,
          balanceBefore: before,
          balanceAfter: before,
          reference: order.reference,
          status: "completed",
          created_at: order.createdAt,
          completed_at: new Date().toISOString(),
        });
      }
      try {
        const driver = await kvGet<any>(`driver:${order.driverId}`);
        if (driver?.fcmToken) {
          await sendFCMNotification(driver.fcmToken, {
            title: "💸 Retrait envoyé",
            body: `${amount.toLocaleString("fr-FR")} ${order.currency} envoyés sur ${order.msisdn}.`,
            data: { type: "payout_completed", orderId: order.orderId },
          });
        }
      } catch { /* push non bloquant */ }
    }
  } else if (order.kind === "driver_wallet_topup" && order.driverId) {
    await creditDriverWallet(order.driverId, amount, order);
  } else if (order.kind === "wallet_topup" && order.passengerId) {
    await creditPassengerWallet(order.passengerId, amount, order);
  } else if (order.kind === "ride_payment" && order.rideId) {
    const ride = await kvGet<any>(`ride:${order.rideId}`);
    if (ride) {
      await kvSet(`ride:${order.rideId}`, {
        ...ride,
        paymentStatus: "paid",
        payment_status: "paid",
        paymentMethod: "ejpay",
        payment_method: "ejpay",
        paymentReference: order.reference,
        paymentReferenceOrderId: order.orderId,
        paidAt: new Date().toISOString(),
        amountPaid: amount,
        paymentCurrency: order.currency,
        updatedAt: new Date().toISOString(),
      });
    }
  } else if (order.kind === "deposit" && order.rideId) {
    // Acompte de réservation (table scheduled_rides)
    const { error } = await sbAdmin()
      .from("scheduled_rides")
      .update({
        deposit_received: true,
        deposit_method: `Ejpay ${order.operatorName}`,
        deposit_received_at: new Date().toISOString(),
      })
      .eq("id", order.rideId);
    if (error) console.warn("⚠️ [EJPAY/SETTLE] Acompte réservation non mis à jour:", error.message);
  }

  order.status = "SUCCESS";
  order.statutCode = readStatutCode(payload) ?? 2;
  order.reason = payload?.reason || "Operation is successful";
  order.settledAt = new Date().toISOString();
  order.remote = payload || null;
  await saveOrder(order);

  await logAdminEvent("ejpay_payment", {
    orderId: order.orderId,
    reference: order.reference,
    direction: order.direction,
    kind: order.kind,
    amount,
    currency: order.currency,
    operator: order.operatorName,
    msisdn: order.msisdn,
    rideId: order.rideId || null,
    passengerId: order.passengerId || null,
    driverId: order.driverId || null,
    targetId,
  });

  return order;
}

async function failOrder(order: EjpayOrder, payload: any): Promise<EjpayOrder> {
  if (order.settledAt) return order;

  order.status = "FAILED";
  order.statutCode = readStatutCode(payload) ?? 3;
  order.reason = payload?.reason || "Paiement refusé";
  order.remote = payload || null;

  // Retrait échoué → on recrédite le solde bonus du chauffeur réservé à l'initiation
  if (order.direction === "B2C" && order.driverId && !order.refundedAt) {
    const driver = await kvGet<any>(`driver:${order.driverId}`);
    if (driver) {
      const before = Number(driver.bonusBalance ?? 0);
      const after = before + Number(order.amount);
      await kvSet(`driver:${order.driverId}`, {
        ...driver,
        bonusBalance: after,
        updated_at: new Date().toISOString(),
      });
      order.refundedAt = new Date().toISOString();
      await kvSet(`wallet_tx:${order.orderId}`, {
        id: order.orderId,
        driverId: order.driverId,
        type: "withdraw_refund",
        method: "ejpay",
        amount: Number(order.amount),
        currency: order.currency,
        balanceBefore: before,
        balanceAfter: after,
        reference: order.reference,
        status: "failed",
        reason: order.reason,
        created_at: order.createdAt,
        updated_at: new Date().toISOString(),
      });
    }
  }

  await saveOrder(order);
  await logAdminEvent("ejpay_payment_failed", {
    orderId: order.orderId,
    reference: order.reference,
    direction: order.direction,
    kind: order.kind,
    amount: Number(order.amount),
    currency: order.currency,
    operator: order.operatorName,
    reason: order.reason,
  });
  return order;
}

// ─── GET /config ────────────────────────────────────────────────────────────

app.get("/config", async (c) => {
  const enabled = await ejpayEnabled();
  return c.json({
    success: true,
    enabled,
    configured: ejpayConfigured(),
    provider: "ejpay",
    version: "3.6.7",
    currencies: ["CDF", "USD"],
    operators: EJPAY_OPERATORS.map((o) => ({ id: o.id, key: o.key, name: o.name })),
    minAmount: { CDF: minAmount("CDF"), USD: minAmount("USD") },
    callbackConfigured: Boolean(ejpayCallbackUrl()),
  });
});

// ─── GET /health — diagnostic public (aucune opération financière) ──────────

app.get("/health", async (c) => {
  const configured = ejpayConfigured();
  const callbackUrl = ejpayCallbackUrl();

  let oauthOk = false;
  let oauthError: string | null = null;

  if (configured) {
    const token = await getAccessToken();
    oauthOk = token.ok;
    oauthError = token.ok ? null : token.error || `HTTP ${token.status ?? 0}`;
  } else {
    oauthError = "EJPAY_CLIENT_ID / EJPAY_CLIENT_SECRET manquants";
  }

  return c.json({
    success: true,
    provider: "ejpay",
    version: "3.6.7",
    enabled: await ejpayEnabled(),
    configured,
    oauthOk,
    oauthError,
    callbackConfigured: Boolean(callbackUrl),
    callbackUrl: callbackUrl || null,
    operators: EJPAY_OPERATORS.map((o) => ({ id: o.id, key: o.key, name: o.name })),
    minAmount: { CDF: minAmount("CDF"), USD: minAmount("USD") },
    checkedAt: new Date().toISOString(),
  });
});

// ─── POST /collect — C2B ────────────────────────────────────────────────────

app.post("/collect", async (c) => {
  try {
    if (!(await ejpayEnabled())) {
      return c.json({
        success: false,
        error: "Paiement Ejpay désactivé",
        code: "EJPAY_DISABLED",
      }, 503);
    }

    const body = await c.req.json().catch(() => ({}));
    const kind: EjpayKind = ["wallet_topup", "driver_wallet_topup", "ride_payment", "deposit", "other"].includes(body.kind)
      ? body.kind
      : "wallet_topup";

    const amount = Math.round(Number(body.amount) * 100) / 100;
    const currency = normalizeCurrency(body.currency);
    const operator = resolveOperator(body.operatorId ?? body.network);
    const msisdn = toEjpayMsisdn(body.msisdn ?? body.phoneNumber ?? body.phone);

    if (!Number.isFinite(amount) || amount < minAmount(currency)) {
      return c.json({
        success: false,
        error: `Montant invalide (minimum ${minAmount(currency)} ${currency})`,
      }, 400);
    }
    if (!operator) {
      return c.json({ success: false, error: "Opérateur Mobile Money invalide" }, 400);
    }
    if (!msisdn) {
      return c.json({ success: false, error: "Numéro Mobile Money invalide (format attendu : 243XXXXXXXXX)" }, 400);
    }

    // ── Contrôle anti-surfacturation sur une course ─────────────────────────
    let expectedAmount: number | null = null;
    if (kind === "ride_payment" && body.rideId) {
      const ride = await kvGet<any>(`ride:${body.rideId}`);
      if (!ride) return c.json({ success: false, error: "Course introuvable" }, 404);
      expectedAmount = Number(
        ride.finalPrice ?? ride.totalPrice ?? ride.total_amount ?? ride.estimatedPrice ?? 0,
      );
      if (expectedAmount > 0 && amount > expectedAmount + 1) {
        return c.json({
          success: false,
          error: `Montant supérieur au prix de la course (${expectedAmount} ${currency})`,
        }, 400);
      }
    }

    const orderId = body.orderId ? String(body.orderId) : newOrderId(kind);

    // ── Idempotence : on ne rejoue jamais un ordre existant ─────────────────
    const existing = await getOrder(orderId);
    if (existing) {
      if (existing.status === "PENDING") {
        return c.json({
          success: true,
          duplicate: true,
          orderId: existing.orderId,
          reference: existing.reference,
          status: existing.status,
          message: "Paiement déjà en cours",
        });
      }
      return c.json({
        success: false,
        duplicate: true,
        orderId: existing.orderId,
        reference: existing.reference,
        status: existing.status,
        error:
          existing.status === "SUCCESS"
            ? "Ce paiement a déjà été réglé"
            : "Ce paiement a échoué — générez une nouvelle référence",
      }, 409);
    }

    const order: EjpayOrder = {
      orderId,
      reference: null,
      direction: "C2B",
      kind,
      amount,
      currency,
      operatorId: operator.id,
      operatorName: operator.name,
      msisdn,
      status: "PENDING",
      statutCode: null,
      reason: null,
      rideId: body.rideId || null,
      passengerId: body.passengerId || body.userId || null,
      driverId: kind === "driver_wallet_topup" ? (body.driverId || body.passengerId || null) : null,
      metadata: {
        expectedAmount,
        days: Number.isFinite(Number(body.days)) && Number(body.days) > 0 ? Number(body.days) : null,
        clientLabel: body.label ? String(body.label).slice(0, 120) : null,
        source: body.source ? String(body.source).slice(0, 40) : "app",
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      settledAt: null,
      refundedAt: null,
      webhookEvents: 0,
      remote: null,
    };
    await saveOrder(order);

    const resp = await ejpayCollect({
      msisdn,
      amount,
      currency,
      operatorId: operator.id,
      orderId,
      callbackUrl: ejpayCallbackUrl(),
    });

    if (!resp.ok) {
      order.status = "FAILED";
      order.reason = resp.error || "Initialisation refusée par Ejpay";
      order.remote = (resp.data as any) || null;
      await saveOrder(order);
      console.error("❌ [EJPAY/COLLECT]", orderId, resp.status, resp.error);
      return c.json({
        success: false,
        orderId,
        error: order.reason,
        status: order.status,
      }, resp.status === 0 ? 502 : resp.status || 502);
    }

    const data: any = resp.data || {};
    order.reference = data.reference || null;
    order.status = paymentStatusOf(readStatutCode(data), data.status);
    order.reason = data.message || null;
    order.remote = data;
    await saveOrder(order);

    console.log(`💳 [EJPAY/COLLECT] ${orderId} → ${order.reference} (${operator.name}, ${amount} ${currency})`);

    return c.json({
      success: true,
      orderId,
      reference: order.reference,
      status: order.status,
      message: "Demande envoyée — le client doit valider sur son téléphone",
      operator: { id: operator.id, name: operator.name },
      msisdn,
      amount,
      currency,
    });
  } catch (error) {
    console.error("❌ [EJPAY/COLLECT] Exception:", error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : "Erreur serveur",
    }, 500);
  }
});

// ─── Réconciliation (statut distant → ordre local) ──────────────────────────

/** Interroge Ejpay et applique le statut distant. Utilisé par `/status` (app) et l'admin. */
export async function reconcileOrder(
  orderId: string,
): Promise<{ ok: boolean; order?: EjpayOrder; error?: string }> {
  const order = await getOrder(orderId);
  if (!order) return { ok: false, error: "Transaction introuvable" };
  if (!order.reference || order.settledAt) return { ok: true, order };

  const remote = await ejpayStatus(order.reference);
  if (!remote.ok || !remote.data) {
    return { ok: false, error: remote.error || "Statut Ejpay indisponible", order };
  }

  const data: any = remote.data;
  const remoteStatus = paymentStatusOf(readStatutCode(data), data.status);
  order.remote = { ...(order.remote || {}), ...data, checkedAt: new Date().toISOString() };

  const remoteAmount = Number(data.amount);
  const amountMismatch =
    Number.isFinite(remoteAmount) && remoteAmount > 0 && Math.abs(remoteAmount - Number(order.amount)) > 1;

  if (remoteStatus === "SUCCESS" && !amountMismatch) {
    await settleOrder(order, data);
  } else if (remoteStatus === "FAILED") {
    await failOrder(order, data);
  } else if (amountMismatch) {
    order.status = "REVIEW";
    order.reason = `Montant reçu (${remoteAmount}) différent du montant attendu (${order.amount})`;
    await saveOrder(order);
    console.warn("⚠️ [EJPAY/STATUS] Écart de montant:", orderId, order.reason);
  } else {
    await saveOrder(order);
  }

  return { ok: true, order };
}

// ─── GET /status/:orderId ───────────────────────────────────────────────────

app.get("/status/:orderId", async (c) => {
  try {
    const orderId = c.req.param("orderId");
    const order = await getOrder(orderId);
    if (!order) return c.json({ success: false, error: "Transaction introuvable" }, 404);

    const wantsRefresh = c.req.query("refresh") === "1";
    const ageMs = Date.now() - new Date(order.updatedAt).getTime();
    const shouldRefresh =
      order.reference && (wantsRefresh || (order.status === "PENDING" && ageMs > 8000));

    if (shouldRefresh && order.reference) {
      const result = await reconcileOrder(orderId);
      if (result.order) return c.json({
        success: true,
        orderId: result.order.orderId,
        reference: result.order.reference,
        status: result.order.status,
        statutCode: result.order.statutCode,
        reason: result.order.reason,
        amount: result.order.amount,
        currency: result.order.currency,
        kind: result.order.kind,
        direction: result.order.direction,
        operator: { id: result.order.operatorId, name: result.order.operatorName },
        settledAt: result.order.settledAt || null,
        createdAt: result.order.createdAt,
      });
    }

    return c.json({
      success: true,
      orderId: order.orderId,
      reference: order.reference,
      status: order.status,
      statutCode: order.statutCode,
      reason: order.reason,
      amount: order.amount,
      currency: order.currency,
      kind: order.kind,
      direction: order.direction,
      operator: { id: order.operatorId, name: order.operatorName },
      settledAt: order.settledAt || null,
      createdAt: order.createdAt,
    });
  } catch (error) {
    console.error("❌ [EJPAY/STATUS] Exception:", error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : "Erreur serveur",
    }, 500);
  }
});

// ─── POST /webhook — callback signé ─────────────────────────────────────────

app.post("/webhook", async (c) => {
  let raw = "";
  try {
    // ⚠️ Corps BRUT obligatoire : toute re-sérialisation casserait la signature.
    raw = await c.req.text();
    const signature = c.req.header("x-ejpay-signature") || c.req.header("X-EJPay-Signature") || null;
    const event = c.req.header("x-ejpay-event") || c.req.header("X-EJPay-Event") || "payment.unknown";

    const valid = await verifyWebhookSignature(raw, signature);
    if (!valid) {
      console.warn("🚫 [EJPAY/WEBHOOK] Signature invalide — callback ignoré");
      return c.json({ success: false, error: "Signature invalide" }, 401);
    }

    let payload: any = null;
    try {
      payload = JSON.parse(raw);
    } catch {
      return c.json({ success: false, error: "Corps JSON invalide" }, 400);
    }

    const orderId = String(payload?.orderId || "");
    const reference = payload?.reference ? String(payload.reference) : null;

    let order = orderId ? await getOrder(orderId) : null;
    if (!order && reference) {
      const all = await listOrders(500);
      order = all.find((o) => o.reference === reference) || null;
    }

    await logWebhookEvent(orderId || reference || "unknown", payload, true);

    if (!order) {
      console.warn("⚠️ [EJPAY/WEBHOOK] Ordre inconnu:", orderId || reference);
      // On répond 200 : l'ordre peut arriver par polling, inutile de faire réessayer.
      return c.json({ success: true, ignored: true });
    }

    order.webhookEvents = Number(order.webhookEvents || 0) + 1;
    if (!order.reference && reference) order.reference = reference;

    const status = paymentStatusOf(readStatutCode(payload), payload.status);

    if (status === "SUCCESS") {
      const remoteAmount = Number(payload?.amount);
      if (Number.isFinite(remoteAmount) && remoteAmount > 0 && Math.abs(remoteAmount - Number(order.amount)) > 1) {
        order.status = "REVIEW";
        order.reason = `Montant reçu (${remoteAmount}) différent du montant attendu (${order.amount})`;
        order.remote = payload;
        await saveOrder(order);
        console.warn("⚠️ [EJPAY/WEBHOOK] Écart de montant:", order.orderId, order.reason);
        return c.json({ success: true, review: true });
      }
      await settleOrder(order, payload);
    } else if (status === "FAILED") {
      await failOrder(order, payload);
    } else {
      await saveOrder(order);
    }

    console.log(`✅ [EJPAY/WEBHOOK] ${event} ${order.orderId} → ${order.status}`);
    // 200 rapide : Ejpay réessaie jusqu'à 3 fois en cas d'échec.
    return c.json({ success: true, orderId: order.orderId, status: order.status });
  } catch (error) {
    console.error("❌ [EJPAY/WEBHOOK] Exception:", error);
    // On renvoie 500 pour qu'Ejpay réessaie (le traitement est idempotent).
    return c.json({ success: false, error: "Erreur de traitement" }, 500);
  }
});

// ─── POST /payout — B2C (admin) ─────────────────────────────────────────────

app.post("/payout", async (c) => {
  try {
    if (!isAdminRequest(c.req.raw.headers)) {
      return c.json({ success: false, error: "Non autorisé" }, 401);
    }
    if (!(await ejpayEnabled())) {
      return c.json({ success: false, error: "Paiement Ejpay désactivé", code: "EJPAY_DISABLED" }, 503);
    }

    const body = await c.req.json().catch(() => ({}));
    const amount = Math.round(Number(body.amount) * 100) / 100;
    const currency = normalizeCurrency(body.currency);
    const operator = resolveOperator(body.operatorId ?? body.network);
    const msisdn = toEjpayMsisdn(body.msisdn ?? body.phoneNumber ?? body.phone);
    const driverId = body.driverId ? String(body.driverId) : null;

    if (!Number.isFinite(amount) || amount <= 0) {
      return c.json({ success: false, error: "Montant invalide" }, 400);
    }
    if (!operator || !msisdn) {
      return c.json({ success: false, error: "Opérateur ou numéro invalide" }, 400);
    }

    // ── Réserve du solde AVANT l'appel (remboursé si échec) ─────────────────
    let driver: any = null;
    if (driverId) {
      driver = await kvGet<any>(`driver:${driverId}`);
      if (!driver) return c.json({ success: false, error: "Conducteur introuvable" }, 404);
      const available = Number(driver.bonusBalance ?? 0);
      if (amount > available) {
        return c.json({
          success: false,
          error: `Solde bonus insuffisant (${available.toLocaleString("fr-FR")} ${currency} disponibles)`,
        }, 400);
      }
    }

    const orderId = body.orderId ? String(body.orderId) : newOrderId("payout");
    const existing = await getOrder(orderId);
    if (existing) {
      return c.json({
        success: false,
        duplicate: true,
        orderId,
        status: existing.status,
        error: "Cet ordre de paiement existe déjà",
      }, 409);
    }

    const order: EjpayOrder = {
      orderId,
      reference: null,
      direction: "B2C",
      kind: "payout",
      amount,
      currency,
      operatorId: operator.id,
      operatorName: operator.name,
      msisdn,
      status: "PENDING",
      statutCode: null,
      reason: null,
      driverId,
      passengerId: null,
      rideId: null,
      metadata: {
        label: body.label ? String(body.label).slice(0, 120) : null,
        adminId: body.adminId || null,
        adminName: body.adminName || null,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      settledAt: null,
      refundedAt: null,
      webhookEvents: 0,
      remote: null,
    };
    await saveOrder(order);

    if (driver && driverId) {
      const before = Number(driver.bonusBalance ?? 0);
      const after = before - amount;
      await kvSet(`driver:${driverId}`, {
        ...driver,
        bonusBalance: after,
        updated_at: new Date().toISOString(),
      });
      await kvSet(`wallet_tx:${orderId}`, {
        id: orderId,
        driverId,
        type: "withdraw",
        method: "ejpay",
        amount,
        currency,
        balanceBefore: before,
        balanceAfter: after,
        reference: null,
        status: "pending",
        created_at: order.createdAt,
      });
    }

    const resp = await ejpayPayout({
      msisdn,
      amount,
      currency,
      operatorId: operator.id,
      orderId,
      callbackUrl: ejpayCallbackUrl(),
    });

    if (!resp.ok) {
      // Échec immédiat → on annule la réservation de solde
      order.status = "FAILED";
      order.reason = resp.error || "Décaissement refusé par Ejpay";
      order.remote = (resp.data as any) || null;
      await failOrder(order, { statutCode: 3, reason: order.reason });
      return c.json({
        success: false,
        orderId,
        error: order.reason,
        status: order.status,
      }, resp.status === 0 ? 502 : resp.status || 502);
    }

    const data: any = resp.data || {};
    order.reference = data.reference || null;
    order.status = paymentStatusOf(readStatutCode(data), data.status);
    order.reason = data.message || null;
    order.remote = data;
    await saveOrder(order);

    console.log(`💸 [EJPAY/PAYOUT] ${orderId} → ${order.reference} (${amount} ${currency} vers ${msisdn})`);

    return c.json({
      success: true,
      orderId,
      reference: order.reference,
      status: order.status,
      message: "Décaissement envoyé — en attente de confirmation opérateur",
    });
  } catch (error) {
    console.error("❌ [EJPAY/PAYOUT] Exception:", error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : "Erreur serveur",
    }, 500);
  }
});

// ─── GET /orders — liste admin ──────────────────────────────────────────────

app.get("/orders", async (c) => {
  if (!isAdminRequest(c.req.raw.headers)) {
    return c.json({ success: false, error: "Non autorisé" }, 401);
  }
  const limit = Math.min(Number(c.req.query("limit") || 100) || 100, 500);
  const status = c.req.query("status");
  const orders = (await listOrders(limit * 2))
    .filter((o) => (status ? o.status === status : true))
    .slice(0, limit)
    .map((o) => ({
      orderId: o.orderId,
      reference: o.reference,
      direction: o.direction,
      kind: o.kind,
      amount: o.amount,
      currency: o.currency,
      operator: o.operatorName,
      msisdn: o.msisdn,
      status: o.status,
      reason: o.reason,
      rideId: o.rideId,
      driverId: o.driverId,
      passengerId: o.passengerId,
      createdAt: o.createdAt,
      settledAt: o.settledAt,
    }));
  return c.json({ success: true, orders, count: orders.length });
});

// ─── GET /wallets — soldes marchand ─────────────────────────────────────────

app.get("/wallets", async (c) => {
  if (!isAdminRequest(c.req.raw.headers)) {
    return c.json({ success: false, error: "Non autorisé" }, 401);
  }
  if (!ejpayConfigured()) {
    return c.json({ success: false, error: "Ejpay non configuré" }, 503);
  }
  const resp = await ejpayWallets();
  if (!resp.ok) {
    return c.json({ success: false, error: resp.error, wallets: [] }, resp.status || 502);
  }
  return c.json({ success: true, wallets: resp.data || [] });
});

// ─── POST /orders/:orderId/refresh — réconciliation manuelle ───────────────

app.post("/orders/:orderId/refresh", async (c) => {
  if (!isAdminRequest(c.req.raw.headers)) {
    return c.json({ success: false, error: "Non autorisé" }, 401);
  }
  const orderId = c.req.param("orderId");
  const order = await getOrder(orderId);
  if (!order) return c.json({ success: false, error: "Transaction introuvable" }, 404);
  if (!order.reference) {
    return c.json({ success: false, error: "Aucune référence Ejpay pour cet ordre" }, 400);
  }

  const remote = await ejpayStatus(order.reference);
  if (!remote.ok || !remote.data) {
    return c.json({ success: false, error: remote.error || "Statut indisponible" }, remote.status || 502);
  }

  const data: any = remote.data;
  const status = paymentStatusOf(readStatutCode(data), data.status);
  if (status === "SUCCESS" && !order.settledAt) {
    await settleOrder(order, data);
  } else if (status === "FAILED") {
    await failOrder(order, data);
  } else {
    order.remote = data;
    await saveOrder(order);
  }

  return c.json({ success: true, orderId, status: order.status, reference: order.reference });
});

export default app;
