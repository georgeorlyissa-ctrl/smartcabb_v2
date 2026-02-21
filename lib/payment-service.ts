/**
 * SERVICE DE PAIEMENT UNIFIÉ
 * Gère tous les modes de paiement de SmartCabb
 * ✅ FIX PRODUCTION V4: Utilise providers sans classes
 */

import type { PaymentMethod, PaymentInitData, PaymentResult, PaymentVerification } from './payment-providers/base-provider';
import { cashProvider } from './payment-providers/cash-provider-pure';
import { flutterwaveProvider } from './payment-providers/flutterwave-provider-pure';
import { supabase } from './supabase'; // ✅ UTILISER LE SINGLETON

// Types
type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';

/**
 * Transaction dans Supabase
 */
export interface Transaction {
  id?: string;
  ride_id: string;
  user_id: string;
  transaction_type: 'ride_payment' | 'driver_payout' | 'refund' | 'commission';
  amount: number;
  currency: string;
  payment_method: string;
  status: PaymentStatus;
  provider_reference?: string;
  description?: string;
  created_at?: string;
  completed_at?: string;
  metadata?: Record<string, any>;
}

/**
 * Service de paiement principal
 */
class PaymentService {
  /**
   * Sélectionner le provider approprié selon la méthode
   */
  private getProvider(method: PaymentMethod) {
    switch (method) {
      case 'cash':
        return cashProvider;
      
      case 'mobile_money':
        // Utiliser Flutterwave si configuré, sinon cash
        return flutterwaveProvider.isConfigured() 
          ? flutterwaveProvider 
          : cashProvider;
      
      case 'card':
        // Pour le moment, utiliser Flutterwave
        return flutterwaveProvider;
      
      default:
        return cashProvider;
    }
  }

  /**
   * Initialiser un paiement
   */
  async initPayment(data: PaymentInitData): Promise<PaymentResult> {
    return this.initiatePayment(data);
  }

  /**
   * Initialiser un paiement
   */
  async initiatePayment(data: PaymentInitData): Promise<PaymentResult> {
    try {
      console.log('💳 Initialisation paiement:', {
        method: data.method,
        amount: data.amount,
        currency: data.currency,
        rideId: data.rideId || 'N/A',
        reference: data.reference || 'N/A',
      });

      // Validation
      if (data.amount <= 0) {
        return {
          success: false,
          status: 'failed',
          message: 'Montant invalide',
          error: 'INVALID_AMOUNT',
        };
      }

      // Sélectionner le provider
      const provider = this.getProvider(data.method);
      console.log(`📱 Provider sélectionné: ${provider.getName()}`);

      // Initier le paiement avec le provider
      const result = await provider.initPayment(data);

      // Enregistrer la transaction dans Supabase seulement si c'est une course
      if (result.success && data.rideId && data.passengerId) {
        await this.createTransaction({
          ride_id: data.rideId,
          user_id: data.passengerId,
          transaction_type: 'ride_payment',
          amount: data.amount,
          currency: data.currency,
          payment_method: data.method,
          status: result.status,
          provider_reference: result.transactionId,
          description: data.description || `Paiement course #${data.rideId.slice(-8)}`,
          metadata: {
            provider: provider.getName(),
            driverId: data.driverId,
            ...result.metadata,
            ...data.metadata,
          },
        });
      }

      return result;
    } catch (error: any) {
      console.error('❌ Erreur initialisation paiement:', error);
      return {
        success: false,
        status: 'failed',
        message: error.message || 'Erreur lors du paiement',
        error: error.code || 'PAYMENT_ERROR',
      };
    }
  }

  /**
   * Traiter un paiement mixte (cash + mobile money)
   */
  async processMixedPayment(data: PaymentInitData): Promise<PaymentResult> {
    try {
      const { cashAmount = 0, mobileMoneyAmount = 0 } = data;

      console.log('💰 Paiement mixte:', {
        total: data.amount,
        cash: cashAmount,
        mobileMoney: mobileMoneyAmount,
      });

      // Validation
      if (cashAmount + mobileMoneyAmount !== data.amount) {
        return {
          success: false,
          status: 'failed',
          message: 'Les montants ne correspondent pas',
          error: 'INVALID_AMOUNT',
        };
      }

      const results: PaymentResult[] = [];

      // 1. Traiter la partie cash si > 0
      if (cashAmount > 0) {
        const cashResult = await this.initiatePayment({
          ...data,
          amount: cashAmount,
          method: 'cash',
        });
        results.push(cashResult);
      }

      // 2. Traiter la partie mobile money si > 0
      if (mobileMoneyAmount > 0) {
        const mobileResult = await this.initiatePayment({
          ...data,
          amount: mobileMoneyAmount,
          method: 'mobile_money',
        });
        results.push(mobileResult);
      }

      // Vérifier si tous les paiements ont réussi
      const allSuccess = results.every(r => r.success);

      if (allSuccess) {
        return {
          success: true,
          status: 'pending',
          message: 'Paiements mixtes initiés avec succès',
          metadata: {
            cashTransaction: results[0]?.transactionId,
            mobileTransaction: results[1]?.transactionId,
          },
        };
      } else {
        return {
          success: false,
          status: 'failed',
          message: 'Échec de certains paiements',
          error: 'MIXED_PAYMENT_ERROR',
          metadata: { results },
        };
      }
    } catch (error: any) {
      console.error('❌ Erreur paiement mixte:', error);
      return {
        success: false,
        status: 'failed',
        message: error.message || 'Erreur paiement mixte',
        error: 'PAYMENT_ERROR',
      };
    }
  }

  /**
   * Vérifier le statut d'un paiement
   */
  async verifyPayment(transactionId: string, method?: PaymentMethod) {
    try {
      // Si method n'est pas fourni, essayer de deviner à partir de l'ID
      let paymentMethod: PaymentMethod = method || 'mobile_money';
      
      // Si l'ID commence par CASH_, c'est du cash
      if (transactionId.startsWith('CASH_')) {
        paymentMethod = 'cash';
      }
      
      const provider = this.getProvider(paymentMethod);
      return await provider.verifyPayment(transactionId);
    } catch (error: any) {
      console.error('❌ Erreur vérification paiement:', error);
      return {
        isValid: false,
        status: 'failed' as PaymentStatus,
        amount: 0,
        transactionId,
        error: error.message,
      };
    }
  }

  /**
   * Confirmer un paiement cash (appelé par le conducteur)
   */
  async confirmCashPayment(
    transactionId: string,
    amountReceived: number,
    driverId: string
  ): Promise<PaymentResult> {
    try {
      // Confirmer avec le provider cash
      const result = await cashProvider.confirmCashReceived(
        transactionId,
        amountReceived,
        driverId
      );

      // Mettre à jour dans Supabase
      if (result.success) {
        await this.updateTransactionStatus(transactionId, 'completed', {
          confirmedAt: new Date().toISOString(),
          confirmedBy: driverId,
          amountReceived,
        });
      }

      return result;
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
   * Rembourser un paiement
   */
  async refundPayment(
    transactionId: string,
    method: PaymentMethod,
    amount?: number
  ): Promise<PaymentResult> {
    try {
      const provider = this.getProvider(method);
      
      if (!provider.refundPayment) {
        return {
          success: false,
          status: 'failed',
          message: 'Remboursement non supporté pour cette méthode',
          error: 'NOT_SUPPORTED',
        };
      }

      const result = await provider.refundPayment(transactionId, amount);

      // Enregistrer le remboursement dans Supabase
      if (result.success) {
        const transaction = await this.getTransaction(transactionId);
        if (transaction) {
          await this.createTransaction({
            ride_id: transaction.ride_id,
            user_id: transaction.user_id,
            transaction_type: 'refund',
            amount: -(amount || transaction.amount),
            currency: transaction.currency,
            payment_method: method,
            status: 'completed',
            provider_reference: result.transactionId,
            description: `Remboursement ${transactionId}`,
            metadata: result.metadata,
          });
        }
      }

      return result;
    } catch (error: any) {
      console.error('❌ Erreur remboursement:', error);
      return {
        success: false,
        status: 'failed',
        message: error.message || 'Erreur remboursement',
        error: 'REFUND_ERROR',
      };
    }
  }

  /**
   * Créer une transaction dans Supabase
   */
  private async createTransaction(transaction: Transaction) {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .insert([transaction])
        .select()
        .single();

      if (error) {
        console.error('❌ Erreur création transaction:', error);
        return null;
      }

      console.log('✅ Transaction créée:', data.id);
      return data;
    } catch (error) {
      console.error('❌ Erreur création transaction:', error);
      return null;
    }
  }

  /**
   * Récupérer une transaction
   */
  private async getTransaction(providerReference: string): Promise<Transaction | null> {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('provider_reference', providerReference)
        .single();

      if (error) {
        console.error('❌ Erreur récupération transaction:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('❌ Erreur récupération transaction:', error);
      return null;
    }
  }

  /**
   * Mettre à jour le statut d'une transaction
   */
  private async updateTransactionStatus(
    providerReference: string,
    status: PaymentStatus,
    metadata?: Record<string, any>
  ) {
    try {
      const updates: any = { status };
      
      if (status === 'completed') {
        updates.completed_at = new Date().toISOString();
      }

      if (metadata) {
        updates.metadata = metadata;
      }

      const { error } = await supabase
        .from('transactions')
        .update(updates)
        .eq('provider_reference', providerReference);

      if (error) {
        console.error('❌ Erreur mise à jour transaction:', error);
      } else {
        console.log('✅ Transaction mise à jour:', providerReference);
      }
    } catch (error) {
      console.error('❌ Erreur mise à jour transaction:', error);
    }
  }

  /**
   * Obtenir toutes les transactions d'une course
   */
  async getRideTransactions(rideId: string): Promise<Transaction[]> {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('ride_id', rideId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Erreur récupération transactions:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ Erreur récupération transactions:', error);
      return [];
    }
  }
}

// ✅ FIX PRODUCTION V3: Factory function au lieu de Proxy
let paymentServiceInstance: PaymentService | null = null;

export function getPaymentService(): PaymentService {
  if (typeof window === 'undefined') {
    // SSR: retourner un mock
    return {} as PaymentService;
  }
  
  if (!paymentServiceInstance) {
    paymentServiceInstance = new PaymentService();
  }
  return paymentServiceInstance;
}

// Export pour compatibilité (utilise la factory)
export const paymentService = {
  initPayment: (data: PaymentInitData) => getPaymentService().initPayment(data),
  initiatePayment: (data: PaymentInitData) => getPaymentService().initiatePayment(data),
  processMixedPayment: (data: PaymentInitData) => getPaymentService().processMixedPayment(data),
  verifyPayment: (transactionId: string, method?: PaymentMethod) => 
    getPaymentService().verifyPayment(transactionId, method),
  confirmCashPayment: (transactionId: string, amountReceived: number, driverId: string) => 
    getPaymentService().confirmCashPayment(transactionId, amountReceived, driverId),
  refundPayment: (transactionId: string, method: PaymentMethod, amount?: number) => 
    getPaymentService().refundPayment(transactionId, method, amount),
  getRideTransactions: (rideId: string) => getPaymentService().getRideTransactions(rideId),
};