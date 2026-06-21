/**
 * 🔧 HOOK DE CONFIGURATION GLOBALE
 * 
 * Fournit un accès réactif à la configuration globale de l'application
 * avec synchronisation automatique depuis le serveur
 * 
 * @version 1.0.0
 * @date 2026-01-28
 */

import { useState, useEffect, useCallback } from 'react';
import {
  GlobalConfig,
  DEFAULT_CONFIG,
  fetchGlobalConfig,
  saveGlobalConfig,
  listenConfigUpdates,
  getConfigValue,
  initConfigSync
} from '../lib/config-sync';

/**
 * Hook pour accéder à la configuration globale
 */
export function useGlobalConfig() {
  const [config, setConfig] = useState<GlobalConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Charger la configuration au montage
  useEffect(() => {
    let mounted = true;

    const loadConfig = async () => {
      try {
        setLoading(true);
        const loadedConfig = await initConfigSync();
        
        if (mounted) {
          setConfig(loadedConfig);
          setError(null);
        }
      } catch (err) {
        console.error('❌ Erreur chargement config:', err);
        if (mounted) {
          setError('Erreur chargement configuration');
          // Utiliser la config par défaut en cas d'erreur
          setConfig(DEFAULT_CONFIG);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadConfig();

    return () => {
      mounted = false;
    };
  }, []);

  // Écouter les mises à jour en temps réel
  useEffect(() => {
    // BroadcastChannel pour les mises à jour cross-tab
    const unsubscribe = listenConfigUpdates((updatedConfig) => {
      console.log('🔄 Configuration mise à jour reçue');
      setConfig(updatedConfig);
    });

    // CustomEvent pour les mises à jour locales
    const handleConfigUpdate = (event: CustomEvent) => {
      const detail = event.detail;
      if (!detail || typeof detail !== 'object' || Array.isArray(detail)) return;
      console.log('🔄 Configuration mise à jour (local)');
      setConfig(detail);
    };

    window.addEventListener('smartcabb:config-updated', handleConfigUpdate as EventListener);

    return () => {
      unsubscribe();
      window.removeEventListener('smartcabb:config-updated', handleConfigUpdate as EventListener);
    };
  }, []);

  // Fonction pour mettre à jour la configuration (admin uniquement)
  const updateConfig = useCallback(async (updates: Partial<GlobalConfig>): Promise<boolean> => {
    try {
      const success = await saveGlobalConfig({
        ...config,
        ...updates
      });

      if (success) {
        setConfig(prev => ({
          ...prev,
          ...updates
        }));
      }

      return success;
    } catch (err) {
      console.error('❌ Erreur mise à jour config:', err);
      return false;
    }
  }, [config]);

  // Fonction pour rafraîchir la configuration
  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const freshConfig = await fetchGlobalConfig();
      setConfig(freshConfig);
      setError(null);
    } catch (err) {
      console.error('❌ Erreur refresh config:', err);
      setError('Erreur refresh configuration');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    config,
    loading,
    error,
    updateConfig,
    refresh
  };
}

/**
 * Hook pour accéder à une valeur spécifique de la config
 */
export function useConfigValue<K extends keyof GlobalConfig>(
  key: K
): GlobalConfig[K] {
  const { config } = useGlobalConfig();
  return config[key];
}

/**
 * Hook pour le taux de change
 */
export function useExchangeRate(): number {
  return useConfigValue('exchangeRate');
}

/**
 * Hook pour le taux de commission
 */
export function useCommissionRate(): number {
  return useConfigValue('commissionRate');
}

/**
 * Hook pour vérifier si on est en mode maintenance
 */
export function useMaintenanceMode(): boolean {
  return useConfigValue('maintenanceMode');
}
