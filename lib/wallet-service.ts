import { projectId, publicAnonKey } from '../utils/supabase/info';

export const walletService = {
  /**
   * Soumettre une demande de recharge en espèces
   */
  async requestCashRecharge(data: {
    userId: string;
    userName: string;
    userPhone: string;
    amount: number;
    description: string;
  }) {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/wallet/cash-recharge-request`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify(data)
        }
      );

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('❌ Erreur demande recharge:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur serveur'
      };
    }
  },

  /**
   * Récupérer toutes les recharges en attente (admin)
   */
  async getPendingRecharges() {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/wallet/pending-recharges`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('❌ Erreur récupération recharges pending:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur serveur',
        recharges: []
      };
    }
  },

  /**
   * Récupérer l'historique complet des recharges (admin)
   */
  async getRechargesHistory() {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/wallet/recharges-history`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('❌ Erreur récupération historique:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur serveur',
        recharges: []
      };
    }
  },

  /**
   * Approuver une recharge en espèces (admin)
   */
  async approveCashRecharge(data: {
    transactionId: string;
    adminId: string;
    adminName: string;
  }) {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/wallet/approve-cash-recharge`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify(data)
        }
      );

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('❌ Erreur approbation recharge:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur serveur'
      };
    }
  },

  /**
   * Rejeter une recharge en espèces (admin)
   */
  async rejectCashRecharge(data: {
    transactionId: string;
    adminId: string;
    adminName: string;
    reason: string;
  }) {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/wallet/reject-cash-recharge`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify(data)
        }
      );

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('❌ Erreur rejet recharge:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur serveur'
      };
    }
  },

  /**
   * Récupérer le solde d'un passager
   */
  async getPassengerBalance(userId: string) {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/wallet/passenger-balance/${userId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('❌ Erreur récupération solde:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur serveur',
        balance: 0
      };
    }
  }
};
