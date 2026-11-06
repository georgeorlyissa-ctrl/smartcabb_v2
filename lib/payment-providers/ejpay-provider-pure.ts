/**
 * Provider EJPAY — Mobile Money RDC (fonctions pures, même contrat que les
 * autres providers de `lib/payment-providers`).
 *
 * Remplace Flutterwave dans `lib/payment-service.ts` : les écrans continuent
 * d'appeler `paymentService.initPayment()` / `verifyPayment()`, seul le
 * transport change.
 *
 * Différence majeure avec une passerelle par redirection : **il n'y a pas
 * d'URL de paiement**. Le client reçoit une demande de validation sur son
 * téléphone (prompt opérateur / USSD). `initPayment` renvoie donc
 * `status: 'pending'` + `transactionId = orderId`, et l'écran interroge
 * `verifyPayment(orderId)` jusqu'à l'état final (via `useEjpayCheckout`).
 */

import type { PaymentInitData, PaymentResult, PaymentVerification } from './base-provider';
import {
  collectEjpayPayment,
  getEjpayStatus,
  operatorName,
  toOperatorId,
  type EjpayKind,
} from '../ejpay-service';

export function getName(): string {
  return 'ejpay';
}

/**
 * Le serveur reste la seule autorité d'activation (`ejpayEnabled` +
 * secrets présents). On ne bloque donc pas côté client : si le service est
 * coupé, `POST /ejpay/collect` renvoie un `503 EJPAY_DISABLED` explicite.
 */
export function isConfigured(): boolean {
  return true;
}

function resolveKind(data: PaymentInitData): EjpayKind {
  const type = String(data.metadata?.type || '').toLowerCase();
  if (type.startsWith('ride_payment')) return 'ride_payment';
  if (type === 'reservation_deposit') return 'deposit';
  if (type === 'wallet_recharge' || type === 'wallet_topup') return 'wallet_topup';
  // Forfait chauffeur : encaissement simple, l'activation est faite côté app.
  if (type === 'driver_wallet_recharge') return 'other';
  return data.rideId ? 'ride_payment' : 'wallet_topup';
}

/** `orderId` est la clé d'idempotence : on la nettoie et on la borne. */
function resolveOrderId(data: PaymentInitData): string | undefined {
  const raw = data.reference ? String(data.reference) : '';
  if (!raw) return undefined;
  return raw.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64);
}

/**
 * Initialise un encaissement Mobile Money.
 * ⚠️ `success: true` + `status: 'pending'` = demande envoyée au téléphone,
 * **pas** un paiement encaissé.
 */
export async function initPayment(data: PaymentInitData): Promise<PaymentResult> {
  try {
    if (data.method === 'card') {
      return {
        success: false,
        status: 'failed',
        message: 'Le paiement par carte bancaire n\'est pas disponible. Choisissez Mobile Money, le portefeuille ou les espèces.',
        error: 'CARD_NOT_SUPPORTED',
      };
    }

    const network = data.metadata?.network ?? data.metadata?.networkId ?? data.metadata?.networkName;
    const operatorId = toOperatorId(network);

    if (!operatorId) {
      return {
        success: false,
        status: 'failed',
        message: 'Choisissez un opérateur Mobile Money (M-Pesa, Orange Money, Airtel Money ou Afrimoney).',
        error: 'INVALID_OPERATOR',
      };
    }

    if (!data.customerPhone || String(data.customerPhone).replace(/\D/g, '').length < 9) {
      return {
        success: false,
        status: 'failed',
        message: 'Numéro Mobile Money invalide.',
        error: 'INVALID_PHONE',
      };
    }

    const kind = resolveKind(data);
    const orderId = resolveOrderId(data);

    console.log('💳 [EJPAY] Initiation:', {
      amount: data.amount,
      currency: data.currency,
      operator: operatorName(operatorId),
      kind,
      orderId,
    });

    const result = await collectEjpayPayment({
      amount: data.amount,
      currency: data.currency || 'CDF',
      msisdn: data.customerPhone,
      operatorId,
      kind,
      orderId,
      rideId: data.rideId ?? null,
      passengerId: data.passengerId ?? (data.metadata?.userId as string) ?? null,
      label: data.description ?? null,
      source: 'app',
    });

    if (!result.success) {
      console.error('❌ [EJPAY] Initiation refusée:', result.error);
      return {
        success: false,
        status: 'failed',
        message: result.error || 'Paiement Mobile Money indisponible',
        error: result.code || 'EJPAY_ERROR',
      };
    }

    return {
      success: true,
      status: 'pending',
      transactionId: result.orderId,
      providerReference: result.reference || undefined,
      message: 'Validez le paiement sur votre téléphone',
      metadata: {
        provider: 'ejpay',
        operatorId,
        operatorName: operatorName(operatorId),
        msisdn: String(data.customerPhone).replace(/\D/g, ''),
        requiresPhoneValidation: true,
        ejpayStatus: result.status,
      },
    };
  } catch (error: any) {
    console.error('❌ [EJPAY] initPayment:', error);
    return {
      success: false,
      status: 'failed',
      message: error?.message || 'Erreur lors de l\'initialisation du paiement',
      error: 'INIT_ERROR',
    };
  }
}

/** Interroge le statut réel de l'ordre (source de vérité : le serveur). */
export async function verifyPayment(transactionId: string): Promise<PaymentVerification> {
  const order = await getEjpayStatus(transactionId);

  if (!order.success && order.status === 'PENDING') {
    return {
      isValid: false,
      status: 'pending',
      amount: 0,
      transactionId,
      error: order.error,
    };
  }

  const map: Record<string, PaymentVerification['status']> = {
    SUCCESS: 'completed',
    FAILED: 'failed',
    CANCELLED: 'cancelled',
    REVIEW: 'processing',
    PENDING: 'pending',
  };

  return {
    isValid: order.status === 'SUCCESS',
    status: map[order.status] || 'pending',
    amount: Number(order.amount ?? 0),
    transactionId,
    paidAt: order.settledAt || undefined,
    error: order.status === 'FAILED' ? order.reason || 'Paiement refusé' : undefined,
  };
}

/**
 * Un encaissement C2B ne se rembourse pas via l'API de collecte : il faut un
 * décaissement B2C depuis l'espace admin (`POST /ejpay/payout`, protégé par
 * `X-Admin-Secret`). On refuse donc explicitement côté client.
 */
export async function refundPayment(transactionId: string): Promise<PaymentResult> {
  console.warn('↩️ [EJPAY] Remboursement demandé côté client (non autorisé):', transactionId);
  return {
    success: false,
    status: 'failed',
    transactionId,
    message: 'Les remboursements Mobile Money sont traités par un administrateur depuis l\'espace Transactions.',
    error: 'REFUND_REQUIRES_ADMIN',
  };
}

// Export objet compatible avec `paymentService`
export const ejpayProvider = {
  getName,
  isConfigured,
  initPayment,
  verifyPayment,
  refundPayment,
};
