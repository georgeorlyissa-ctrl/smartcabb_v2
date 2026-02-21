/**
 * Provider FLUTTERWAVE - Paiements Mobile Money RDC
 * Supporte : M-Pesa, Orange Money,Airtel Money
 * 
 * ARCHITECTURE SÉCURISÉE :
 * - Frontend : Utilise PUBLIC_KEY pour UI uniquement
 * - Serveur : Utilise SECRET_KEY pour toutes les opérations sensibles
 * 
 * CONFIGURATION :
 * 1. Créer compte sur https://flutterwave.com
 * 2. Obtenir clés TEST ou LIVE
 * 3. Configurer FLUTTERWAVE_SECRET_KEY dans Supabase Secrets
 * 4. Configurer VITE_FLUTTERWAVE_PUBLIC_KEY dans .env.local
 * 
 * MODE TEST (défaut) :
 * - Utilise FLWPUBK_TEST-xxx
 * - Transactions simulées
 * 
 * MODE PRODUCTION :
 * - Créez un fichier .env.local avec VITE_FLUTTERWAVE_PUBLIC_KEY=FLWPUBK-xxx
 * - Configurez FLUTTERWAVE_SECRET_KEY dans Supabase Edge Functions Secrets
 * - Vraies transactions avec argent réel
 */

import type { PaymentProvider, PaymentInitData, PaymentResult, PaymentVerification } from './base-provider';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

export class FlutterwaveProvider implements PaymentProvider {
  name = 'flutterwave';
  
  private serverUrl = `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52`;

  /**
   * Récupérer la clé publique Flutterwave
   * 
   * ORDRE DE PRIORITÉ :
   * 1. Variable d'environnement VITE_FLUTTERWAVE_PUBLIC_KEY (PRODUCTION)
   * 2. Clé de test par défaut (DÉVELOPPEMENT)
   * 
   * Pour passer en PRODUCTION :
   * - Créez .env.local avec : VITE_FLUTTERWAVE_PUBLIC_KEY=FLWPUBK-votre-cle-live
   */
  private getPublicKey(): string {
    // Essayer d'abord la variable d'environnement (PRODUCTION)
    const envKey = import.meta.env.VITE_FLUTTERWAVE_PUBLIC_KEY;
    if (envKey) {
      console.log('🔑 Flutterwave: Utilisation clé depuis .env.local');
      return envKey;
    }

    // Sinon, utiliser la clé de test (DÉVELOPPEMENT)
    console.log('🔑 Flutterwave: Utilisation clé TEST par défaut');
    return 'FLWPUBK_TEST-ad26e82c1491ad6843fe40d3bef5102b-X';
  }

  /**
   * Déterminer si on est en mode TEST ou LIVE
   */
  private isTestMode(): boolean {
    const key = this.getPublicKey();
    return key.includes('_TEST-') || key.includes('TEST');
  }

  /**
   * Vérifier si Flutterwave est configuré
   */
  isConfigured(): boolean {
    const key = this.getPublicKey();
    const isConfigured = !!key && key.startsWith('FLWPUBK');
    
    if (isConfigured) {
      const mode = this.isTestMode() ? 'TEST' : 'PRODUCTION';
      console.log(`✅ Flutterwave configuré en mode ${mode}`);
    }
    
    return isConfigured;
  }

  /**
   * Initialiser un paiement Flutterwave
   * Appelle le serveur qui utilise la SECRET_KEY
   */
  async initiatePayment(data: PaymentInitData): Promise<PaymentResult> {
    try {
      if (!this.isConfigured()) {
        return {
          success: false,
          status: 'failed',
          message: 'Flutterwave non configuré. Veuillez ajouter les clés API.',
          error: 'NOT_CONFIGURED',
        };
      }

      console.log('🦋 Initialisation paiement Flutterwave via serveur:', data);

      // Appel au serveur Supabase qui gère la SECRET_KEY
      const response = await fetch(`${this.serverUrl}/payments/flutterwave/init`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rideId: data.rideId,
          reference: data.reference, // Pour recharge de portefeuille, abonnements, etc.
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
        const errorData = await response.json();
        console.error('❌ Erreur serveur:', errorData);
        return {
          success: false,
          status: 'failed',
          message: errorData.error || 'Erreur serveur lors de l\'initialisation',
          error: 'SERVER_ERROR',
        };
      }

      const result = await response.json();
      console.log('✅ Paiement initialisé:', result);

      return result;
    } catch (error: any) {
      console.error('❌ Erreur Flutterwave:', error);
      return {
        success: false,
        status: 'failed',
        message: error.message || 'Erreur réseau Flutterwave',
        error: 'NETWORK_ERROR',
      };
    }
  }

  /**
   * Vérifier le statut d'un paiement Flutterwave
   * Appelle le serveur qui utilise la SECRET_KEY
   */
  async verifyPayment(transactionId: string): Promise<PaymentVerification> {
    try {
      if (!this.isConfigured()) {
        return {
          isValid: false,
          status: 'failed',
          amount: 0,
          transactionId,
          error: 'Flutterwave non configuré',
        };
      }

      console.log('🔍 Vérification paiement Flutterwave via serveur:', transactionId);

      // Appel au serveur Supabase
      const response = await fetch(
        `${this.serverUrl}/payments/flutterwave/verify/${encodeURIComponent(transactionId)}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Erreur vérification:', errorData);
        return {
          isValid: false,
          status: 'failed',
          amount: 0,
          transactionId,
          error: errorData.error || 'Erreur serveur',
        };
      }

      const result = await response.json();
      console.log('✅ Vérification terminée:', result);

      return result;
    } catch (error: any) {
      console.error('❌ Erreur vérification Flutterwave:', error);
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
   * Rembourser un paiement
   * NOTE: Les remboursements nécessitent une implémentation serveur dédiée
   */
  async refundPayment(transactionId: string, amount?: number): Promise<PaymentResult> {
    try {
      console.log('💸 Remboursement Flutterwave:', { transactionId, amount });

      // TODO: Créer endpoint serveur /payments/flutterwave/refund
      // Pour l'instant, retourne une erreur non implémentée
      return {
        success: false,
        status: 'failed',
        message: 'Les remboursements Flutterwave nécessitent une validation manuelle',
        error: 'NOT_IMPLEMENTED',
      };
    } catch (error: any) {
      console.error('❌ Erreur remboursement Flutterwave:', error);
      return {
        success: false,
        status: 'failed',
        message: error.message || 'Erreur réseau',
        error: 'NETWORK_ERROR',
      };
    }
  }

  /**
   * Gérer le webhook Flutterwave (pour notifications temps réel)
   */
  async handleWebhook(payload: any, signature: string): Promise<boolean> {
    try {
      // Vérifier la signature du webhook
      // (Flutterwave envoie un hash pour sécuriser)
      
      const event = payload.event;
      const data = payload.data;

      console.log('🔔 Webhook Flutterwave reçu:', event, data);

      // Traiter selon le type d'événement
      switch (event) {
        case 'charge.completed':
          // Paiement complété
          console.log('✅ Paiement complété:', data.tx_ref);
          break;
          
        case 'charge.failed':
          // Paiement échoué
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
}

// ✅ FIX PRODUCTION V3: Factory function au lieu de Proxy
let flutterwaveProviderInstance: FlutterwaveProvider | null = null;

export function getFlutterwaveProvider(): FlutterwaveProvider {
  if (typeof window === 'undefined') {
    // SSR: retourner un mock
    return {} as FlutterwaveProvider;
  }
  
  if (!flutterwaveProviderInstance) {
    flutterwaveProviderInstance = new FlutterwaveProvider();
  }
  return flutterwaveProviderInstance;
}

// Export pour compatibilité (utilise la factory)
export const flutterwaveProvider = {
  getName: () => getFlutterwaveProvider().name,
  isConfigured: () => getFlutterwaveProvider().isConfigured(),
  initPayment: (data: PaymentInitData) => getFlutterwaveProvider().initiatePayment(data),
  verifyPayment: (transactionId: string) => getFlutterwaveProvider().verifyPayment(transactionId),
  refundPayment: (transactionId: string, amount?: number) => 
    getFlutterwaveProvider().refundPayment(transactionId, amount),
  handleWebhook: (payload: any, signature: string) => 
    getFlutterwaveProvider().handleWebhook(payload, signature),
};