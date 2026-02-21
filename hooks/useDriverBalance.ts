import { useState, useEffect, useCallback } from 'react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

/**
 * Hook personnalisé pour gérer le solde du conducteur
 * avec rafraîchissement automatique depuis le backend
 * 
 * @param driverId - ID du conducteur
 * @param autoRefresh - Activer le rafraîchissement automatique (default: true)
 * @param refreshInterval - Intervalle de rafraîchissement en ms (default: 10000 = 10s)
 * @returns { balance, loading, error, refreshBalance }
 */
export function useDriverBalance(
  driverId: string | undefined,
  autoRefresh: boolean = true,
  refreshInterval: number = 10000 // 10 secondes
) {
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Récupère le solde depuis le backend
   */
  const refreshBalance = useCallback(async () => {
    if (!driverId) {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/drivers/${driverId}/balance`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && typeof data.balance === 'number') {
        setBalance(data.balance);
        console.log(`💰 [useDriverBalance] Solde chargé: ${data.balance.toLocaleString()} CDF`);
      } else {
        throw new Error('Format de réponse invalide');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      console.error('❌ [useDriverBalance] Erreur chargement solde:', errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [driverId]);

  /**
   * Rafraîchissement initial au montage du composant
   */
  useEffect(() => {
    refreshBalance();
  }, [refreshBalance]);

  /**
   * Rafraîchissement automatique à intervalle régulier
   */
  useEffect(() => {
    if (!autoRefresh || !driverId) return;

    console.log(`🔄 [useDriverBalance] Rafraîchissement automatique activé (${refreshInterval}ms)`);

    const interval = setInterval(() => {
      console.log('🔄 [useDriverBalance] Rafraîchissement du solde...');
      refreshBalance();
    }, refreshInterval);

    return () => {
      console.log('🛑 [useDriverBalance] Arrêt du rafraîchissement automatique');
      clearInterval(interval);
    };
  }, [autoRefresh, driverId, refreshInterval, refreshBalance]);

  return {
    balance,
    loading,
    error,
    refreshBalance
  };
}

/**
 * Fonction utilitaire pour mettre à jour le solde du conducteur
 * 
 * @param driverId - ID du conducteur
 * @param operation - 'add' ou 'subtract'
 * @param amount - Montant en CDF
 * @returns Nouveau solde ou null en cas d'erreur
 */
export async function updateDriverBalance(
  driverId: string,
  operation: 'add' | 'subtract',
  amount: number
): Promise<number | null> {
  try {
    console.log(`💰 [updateDriverBalance] ${operation === 'add' ? 'Ajout' : 'Déduction'} de ${amount.toLocaleString()} CDF...`);

    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/drivers/${driverId}/balance`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          operation,
          amount
        })
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.success && typeof data.balance === 'number') {
      console.log(`✅ [updateDriverBalance] Nouveau solde: ${data.balance.toLocaleString()} CDF`);
      return data.balance;
    }

    return null;
  } catch (error) {
    console.error('❌ [updateDriverBalance] Erreur:', error);
    return null;
  }
}
