/**
 * Provider CASH - Paiement en espèces (pur fonctions)
 * ✅ FIX PRODUCTION V4: Aucune classe, que des fonctions pures
 */

import type { PaymentProvider, PaymentInitData, PaymentResult, PaymentVerification } from './base-provider';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

const SERVER_URL = `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52`;

/**
 * Nom du provider
 */
export function getName(): string {
  return 'cash';
}

/**
 * Initialiser un paiement cash
 */
export async function initPayment(data: PaymentInitData): Promise<PaymentResult> {
  try {
    console.log('💵 Initialisation paiement cash:', data);

    // Le paiement cash est toujours "en attente" jusqu'à confirmation du conducteur
    return {
      success: true,
      status: 'pending',
      transactionId: `cash_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      message: 'Paiement en espèces à effectuer au conducteur',
      amount: data.amount,
      currency: data.currency || 'CDF',
      metadata: {
        method: 'cash',
        rideId: data.rideId,
        passengerId: data.passengerId,
        driverId: data.driverId,
      },
    };
  } catch (error: any) {
    console.error('❌ Erreur init paiement cash:', error);
    return {
      success: false,
      status: 'failed',
      message: error.message || 'Erreur initialisation paiement cash',
      error: 'INIT_ERROR',
    };
  }
}

/**
 * Vérifier le statut d'un paiement cash
 */
export async function verifyPayment(transactionId: string): Promise<PaymentVerification> {
  try {
    console.log('🔍 Vérification paiement cash:', transactionId);

    // Appel au serveur pour vérifier le statut
    const response = await fetch(`${SERVER_URL}/payments/cash/verify/${transactionId}`, {
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return {
        verified: false,
        status: 'pending',
        message: 'En attente de confirmation du conducteur',
      };
    }

    const result = await response.json();
    return result;
  } catch (error: any) {
    console.error('❌ Erreur vérification cash:', error);
    return {
      verified: false,
      status: 'pending',
      message: error.message || 'Erreur vérification',
    };
  }
}

/**
 * Confirmer la réception du cash (côté conducteur)
 */
export async function confirmCashReceived(
  transactionId: string,
  amountReceived: number,
  driverId: string
): Promise<PaymentResult> {
  try {
    console.log('✅ Confirmation réception cash:', { transactionId, amountReceived, driverId });

    const response = await fetch(`${SERVER_URL}/payments/cash/confirm`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transactionId,
        amountReceived,
        driverId,
        confirmedAt: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        status: 'failed',
        message: errorData.error || 'Erreur confirmation',
        error: 'CONFIRMATION_ERROR',
      };
    }

    const result = await response.json();
    return {
      success: true,
      status: 'completed',
      transactionId,
      message: 'Paiement cash confirmé',
      amount: amountReceived,
      metadata: result,
    };
  } catch (error: any) {
    console.error('❌ Erreur confirmation cash:', error);
    return {
      success: false,
      status: 'failed',
      message: error.message || 'Erreur confirmation',
      error: 'CONFIRMATION_ERROR',
    };
  }
}

/**
 * Rembourser un paiement cash (non supporté)
 */
export async function refundPayment(
  transactionId: string,
  amount?: number
): Promise<PaymentResult> {
  return {
    success: false,
    status: 'failed',
    message: 'Remboursement non supporté pour les paiements en espèces',
    error: 'NOT_SUPPORTED',
  };
}

// Export objet compatible avec l'interface PaymentProvider
export const cashProvider = {
  getName,
  initPayment,
  verifyPayment,
  confirmCashReceived,
  refundPayment,
};
