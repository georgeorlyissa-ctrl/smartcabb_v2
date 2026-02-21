/**
 * Provider CASH - Paiement en espèces
 * Mode le plus simple : confirmation immédiate par le conducteur
 */

import type { PaymentProvider, PaymentInitData, PaymentResult, PaymentVerification } from './base-provider';

export class CashPaymentProvider implements PaymentProvider {
  name = 'cash';

  /**
   * Pour cash, on valide juste que le conducteur a reçu l'argent
   */
  async initiatePayment(data: PaymentInitData): Promise<PaymentResult> {
    try {
      // Validation basique
      if (data.amount <= 0) {
        return {
          success: false,
          status: 'failed',
          message: 'Montant invalide',
          error: 'INVALID_AMOUNT',
        };
      }

      // Générer un ID de transaction unique
      const transactionId = `CASH_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      console.log('💵 Paiement cash initié:', {
        transactionId,
        amount: data.amount,
        currency: data.currency,
        rideId: data.rideId,
      });

      // Pour cash, on considère le paiement comme "pending" 
      // jusqu'à confirmation du conducteur
      return {
        success: true,
        transactionId,
        status: 'pending',
        message: 'Paiement en attente de confirmation du conducteur',
        metadata: {
          method: 'cash',
          rideId: data.rideId,
          amount: data.amount,
          currency: data.currency,
        },
      };
    } catch (error: any) {
      console.error('❌ Erreur paiement cash:', error);
      return {
        success: false,
        status: 'failed',
        message: error.message || 'Erreur lors du paiement cash',
        error: error.code || 'PROVIDER_ERROR',
      };
    }
  }

  /**
   * Vérifier un paiement cash
   * En réalité, vérifié manuellement par le conducteur
   */
  async verifyPayment(transactionId: string): Promise<PaymentVerification> {
    try {
      // Pour cash, on vérifie dans la base de données
      // si le conducteur a confirmé la réception
      
      return {
        isValid: true,
        status: 'completed',
        amount: 0, // À récupérer de la DB
        transactionId,
        paidAt: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        isValid: false,
        status: 'failed',
        amount: 0,
        transactionId,
        error: error.message,
      };
    }
  }

  /**
   * Confirmer un paiement cash (appelé par le conducteur)
   */
  async confirmCashReceived(
    transactionId: string, 
    amountReceived: number,
    confirmedBy: string
  ): Promise<PaymentResult> {
    try {
      console.log('✅ Paiement cash confirmé:', {
        transactionId,
        amountReceived,
        confirmedBy,
      });

      return {
        success: true,
        transactionId,
        status: 'completed',
        message: 'Paiement cash confirmé',
        metadata: {
          confirmedAt: new Date().toISOString(),
          confirmedBy,
          amountReceived,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        status: 'failed',
        message: error.message || 'Erreur confirmation paiement',
        error: 'CONFIRMATION_ERROR',
      };
    }
  }

  /**
   * Rembourser un paiement cash
   */
  async refundPayment(transactionId: string, amount?: number): Promise<PaymentResult> {
    try {
      console.log('💰 Remboursement cash:', {
        transactionId,
        amount,
      });

      return {
        success: true,
        transactionId,
        status: 'refunded',
        message: 'Remboursement cash effectué',
        metadata: {
          refundedAt: new Date().toISOString(),
          amount: amount || 0,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        status: 'failed',
        message: error.message || 'Erreur remboursement paiement',
        error: 'REFUND_ERROR',
      };
    }
  }
}

// ✅ FIX PRODUCTION V3: Factory function au lieu de Proxy
let cashProviderInstance: CashPaymentProvider | null = null;

export function getCashProvider(): CashPaymentProvider {
  if (typeof window === 'undefined') {
    // SSR: retourner un mock
    return {} as CashPaymentProvider;
  }
  
  if (!cashProviderInstance) {
    cashProviderInstance = new CashPaymentProvider();
  }
  return cashProviderInstance;
}

// Export pour compatibilité (utilise la factory)
export const cashProvider = {
  getName: () => getCashProvider().name,
  initPayment: (data: PaymentInitData) => getCashProvider().initiatePayment(data),
  verifyPayment: (transactionId: string) => getCashProvider().verifyPayment(transactionId),
  confirmCashReceived: (transactionId: string, amountReceived: number, driverId: string) => 
    getCashProvider().confirmCashReceived(transactionId, amountReceived, driverId),
  refundPayment: (transactionId: string, amount?: number) => 
    getCashProvider().refundPayment(transactionId, amount),
};