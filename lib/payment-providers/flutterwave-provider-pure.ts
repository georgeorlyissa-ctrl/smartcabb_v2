/**
 * Provider FLUTTERWAVE - Paiements Mobile Money RDC (pur fonctions)
 * ✅ FIX PRODUCTION V4: Aucune classe, que des fonctions pures
 */

import type { PaymentProvider, PaymentInitData, PaymentResult, PaymentVerification } from './base-provider';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

const SERVER_URL = `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52`;

/**
 * Récupérer la clé publique Flutterwave
 */
function getPublicKey(): string {
  const envKey = import.meta.env.VITE_FLUTTERWAVE_PUBLIC_KEY;
  if (envKey) {
    console.log('🔑 Flutterwave: Utilisation clé depuis .env.local');
    return envKey;
  }
  console.log('🔑 Flutterwave: Utilisation clé TEST par défaut');
  return 'FLWPUBK_TEST-ad26e82c1491ad6843fe40d3bef5102b-X';
}

/**
 * Déterminer si on est en mode TEST ou LIVE
 */
function isTestMode(): boolean {
  const key = getPublicKey();
  return key.includes('_TEST-') || key.includes('TEST');
}

/**
 * Nom du provider
 */
export function getName(): string {
  return 'flutterwave';
}

/**
 * Vérifier si Flutterwave est configuré
 */
export function isConfigured(): boolean {
  const key = getPublicKey();
  const configured = !!key && key.startsWith('FLWPUBK');
  
  if (configured) {
    const mode = isTestMode() ? 'TEST' : 'PRODUCTION';
    console.log(`✅ Flutterwave configuré en mode ${mode}`);
  }
  
  return configured;
}

/**
 * Initialiser un paiement Flutterwave
 */
export async function initPayment(data: PaymentInitData): Promise<PaymentResult> {
  try {
    if (!isConfigured()) {
      return {
        success: false,
        status: 'failed',
        message: 'Flutterwave non configuré. Veuillez ajouter les clés API.',
        error: 'NOT_CONFIGURED',
      };
    }

    console.log('🦋 Initialisation paiement Flutterwave via serveur:', data);

    const response = await fetch(`${SERVER_URL}/payments/flutterwave/init`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        rideId: data.rideId,
        reference: data.reference,
        description: data.description,
        amount: data.amount,
        currency: data.currency || 'CDF',
        customerEmail: data.customerEmail,
        customerPhone: data.customerPhone,
        customerName: data.customerName,
        passengerId: data.passengerId,
        driverId: data.driverId,
        metadata: data.metadata,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Erreur serveur inconnue' }));
      console.error('❌ Erreur serveur Flutterwave:', {
        status: response.status,
        statusText: response.statusText,
        errorData
      });
      return {
        success: false,
        status: 'failed',
        message: errorData.error || `Erreur serveur (${response.status})`,
        error: 'SERVER_ERROR',
      };
    }

    const result = await response.json();
    console.log('✅ Paiement Flutterwave initialisé:', result);

    // Vérifier la structure de la réponse
    if (!result.data || !result.data.link) {
      console.error('❌ Réponse invalide de Flutterwave:', result);
      return {
        success: false,
        status: 'failed',
        message: 'Réponse invalide du serveur de paiement',
        error: 'INVALID_RESPONSE',
      };
    }

    return {
      success: true,
      status: 'pending',
      transactionId: result.data.id,
      message: 'Paiement initialisé',
      paymentUrl: result.data.link,
      amount: data.amount,
      currency: data.currency || 'CDF',
      metadata: {
        flw_ref: result.data.flw_ref,
        tx_ref: result.data.tx_ref,
      },
    };
  } catch (error: any) {
    console.error('❌ Erreur init Flutterwave (CATCH):', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      data: data
    });
    return {
      success: false,
      status: 'failed',
      message: `Erreur technique: ${error.message || 'Erreur inconnue'}`,
      error: 'INIT_ERROR',
    };
  }
}

/**
 * Vérifier le statut d'un paiement
 */
export async function verifyPayment(transactionId: string): Promise<PaymentVerification> {
  try {
    if (!isConfigured()) {
      return {
        verified: false,
        status: 'failed',
        message: 'Flutterwave non configuré',
      };
    }

    console.log('🔍 Vérification paiement Flutterwave:', transactionId);

    const response = await fetch(`${SERVER_URL}/payments/flutterwave/verify/${transactionId}`, {
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        verified: false,
        status: 'failed',
        message: errorData.error || 'Erreur vérification',
      };
    }

    const result = await response.json();
    return {
      verified: result.status === 'successful',
      status: result.status,
      message: result.message || 'Vérification effectuée',
      amount: result.amount,
      currency: result.currency,
      metadata: result.data,
    };
  } catch (error: any) {
    console.error('❌ Erreur vérification Flutterwave:', error);
    return {
      verified: false,
      status: 'failed',
      message: error.message || 'Erreur vérification',
    };
  }
}

/**
 * Rembourser un paiement
 */
export async function refundPayment(
  transactionId: string,
  amount?: number
): Promise<PaymentResult> {
  try {
    console.log('💰 Remboursement Flutterwave:', { transactionId, amount });

    const response = await fetch(`${SERVER_URL}/payments/flutterwave/refund`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ transactionId, amount }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        status: 'failed',
        message: errorData.error || 'Erreur remboursement',
        error: 'REFUND_ERROR',
      };
    }

    const result = await response.json();
    return {
      success: true,
      status: 'refunded',
      transactionId,
      message: 'Remboursement effectué',
      metadata: result,
    };
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
 * Gérer les webhooks Flutterwave
 */
export async function handleWebhook(payload: any, signature: string): Promise<boolean> {
  try {
    console.log('🔔 Webhook Flutterwave reçu:', payload);
    
    const event = payload.event;
    const data = payload.data;

    switch (event) {
      case 'charge.completed':
        console.log('✅ Paiement complété:', data.tx_ref);
        break;
        
      case 'charge.failed':
        console.log('❌ Paiement échoué:', data.tx_ref);
        break;
        
      default:
        console.log('ℹ️ Événement Flutterwave:', event);
    }

    return true;
  } catch (error: any) {
    console.error('❌ Erreur webhook Flutterwave:', error);
    return false;
  }
}

// Export objet compatible avec l'interface PaymentProvider
export const flutterwaveProvider = {
  getName,
  isConfigured,
  initPayment,
  verifyPayment,
  refundPayment,
  handleWebhook,
};