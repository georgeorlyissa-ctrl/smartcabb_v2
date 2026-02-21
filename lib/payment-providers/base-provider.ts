/**
 * Interface de base pour tous les providers de paiement
 * Chaque provider (Flutterwave, M-Pesa, Cash, etc.) doit implémenter cette interface
 */

export type PaymentMethod = 'cash' | 'mobile_money' | 'card' | 'mixed';
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface PaymentInitData {
  amount: number;
  currency: 'CDF' | 'USD';
  rideId?: string; // Optionnel pour les recharges de portefeuille
  passengerId?: string; // Optionnel pour les recharges de portefeuille
  driverId?: string; // Optionnel pour les recharges de portefeuille
  method: PaymentMethod;
  // Pour paiement mixte
  cashAmount?: number;
  mobileMoneyAmount?: number;
  // Infos client
  customerEmail: string;
  customerPhone: string;
  customerName: string;
  // Pour identification alternative (recharge, etc.)
  reference?: string;
  description?: string;
  metadata?: Record<string, any>;
}

export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  status: PaymentStatus;
  message: string;
  providerReference?: string;
  error?: string;
  // Pour redirection (Flutterwave, etc.)
  redirectUrl?: string;
  // Données additionnelles
  metadata?: Record<string, any>;
}

export interface PaymentVerification {
  isValid: boolean;
  status: PaymentStatus;
  amount: number;
  transactionId: string;
  paidAt?: string;
  error?: string;
}

/**
 * Interface que tous les providers doivent implémenter
 */
export interface PaymentProvider {
  name: string;
  
  /**
   * Initialiser un paiement
   */
  initiatePayment(data: PaymentInitData): Promise<PaymentResult>;
  
  /**
   * Vérifier le statut d'un paiement
   */
  verifyPayment(transactionId: string): Promise<PaymentVerification>;
  
  /**
   * Annuler un paiement (si possible)
   */
  cancelPayment?(transactionId: string): Promise<boolean>;
  
  /**
   * Rembourser un paiement
   */
  refundPayment?(transactionId: string, amount?: number): Promise<PaymentResult>;
}

/**
 * Configuration générale des paiements
 */
export interface PaymentConfig {
  defaultCurrency: 'CDF' | 'USD';
  exchangeRate: number; // USD to CDF
  minAmount: number;
  maxAmount: number;
  supportedMethods: PaymentMethod[];
}

/**
 * Erreurs de paiement standardisées
 */
export class PaymentError extends Error {
  constructor(
    message: string,
    public code: string,
    public provider?: string,
    public metadata?: Record<string, any>
  ) {
    super(message);
    this.name = 'PaymentError';
  }
}

/**
 * Codes d'erreur standardisés
 */
export const PaymentErrorCodes = {
  INVALID_AMOUNT: 'INVALID_AMOUNT',
  INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  PROVIDER_ERROR: 'PROVIDER_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  CANCELLED: 'CANCELLED',
  FRAUD_DETECTED: 'FRAUD_DETECTED',
} as const;