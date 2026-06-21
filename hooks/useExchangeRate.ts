import { useState, useEffect, useCallback } from 'react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

/**
 * Hook pour gérer le taux de change synchronisé avec le backend
 * Garantit que tous les appareils ont le même taux de change
 */
export function useExchangeRate() {
  const [exchangeRate, setExchangeRate] = useState<number>(2000);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Charger le taux depuis le backend
  const loadExchangeRate = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/config/get`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        const rate = data.config?.exchangeRate || 2000;
        
        setExchangeRate(rate);
        
        // Mettre à jour le localStorage pour synchroniser
        const settingsStr = localStorage.getItem('smartcab_system_settings');
        const settings = settingsStr ? JSON.parse(settingsStr) : {};
        settings.exchangeRate = rate;
        localStorage.setItem('smartcab_system_settings', JSON.stringify(settings));
        // Synchroniser aussi les autres clés pour compatibilité
        localStorage.setItem('smartcabb_exchange_rate', String(rate));
        try {
          const cacheStr = localStorage.getItem('smartcabb_config_cache');
          if (cacheStr) {
            const cache = JSON.parse(cacheStr);
            cache.exchangeRate = rate;
            localStorage.setItem('smartcabb_config_cache', JSON.stringify(cache));
          }
        } catch (_) {}
        
        console.log('✅ Taux de change synchronisé depuis le backend:', rate);
      } else {
        // Si l'API échoue, utiliser la valeur du localStorage
        const settingsStr = localStorage.getItem('smartcab_system_settings');
        if (settingsStr) {
          const settings = JSON.parse(settingsStr);
          if (settings.exchangeRate) {
            setExchangeRate(settings.exchangeRate);
            console.log('⚠️ Backend inaccessible, utilisation smartcab_system_settings:', settings.exchangeRate);
            return;
          }
        }
        const cacheStr = localStorage.getItem('smartcabb_config_cache');
        if (cacheStr) {
          const cache = JSON.parse(cacheStr);
          if (cache.exchangeRate) {
            setExchangeRate(cache.exchangeRate);
            console.log('⚠️ Backend inaccessible, utilisation smartcabb_config_cache:', cache.exchangeRate);
            return;
          }
        }
        const rateStr = localStorage.getItem('smartcabb_exchange_rate');
        if (rateStr) {
          const rate = parseFloat(rateStr);
          if (!isNaN(rate) && rate > 0) {
            setExchangeRate(rate);
            console.log('⚠️ Backend inaccessible, utilisation smartcabb_exchange_rate:', rate);
          }
        }
      }
    } catch (err) {
      console.warn('⚠️ Erreur chargement taux de change:', err);
      setError('Impossible de charger le taux de change');
      
      // Fallback sur localStorage
      try {
        const settingsStr = localStorage.getItem('smartcab_system_settings');
        if (settingsStr) {
          const settings = JSON.parse(settingsStr);
          if (settings.exchangeRate) {
            setExchangeRate(settings.exchangeRate);
            return;
          }
        }
        // Fallback smartcabb_config_cache
        const cacheStr = localStorage.getItem('smartcabb_config_cache');
        if (cacheStr) {
          const cache = JSON.parse(cacheStr);
          if (cache.exchangeRate) {
            setExchangeRate(cache.exchangeRate);
            return;
          }
        }
        // Fallback smartcabb_exchange_rate
        const rateStr = localStorage.getItem('smartcabb_exchange_rate');
        if (rateStr) {
          const rate = parseFloat(rateStr);
          if (!isNaN(rate) && rate > 0) {
            setExchangeRate(rate);
          }
        }
      } catch (localErr) {
        console.error('Erreur lecture localStorage:', localErr);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Sauvegarder le taux dans le backend et localStorage
  const saveExchangeRate = useCallback(async (newRate: number): Promise<boolean> => {
    try {
      // Mettre à jour localement d'abord (optimistic update)
      setExchangeRate(newRate);
      
      // Mettre à jour localStorage
      const settingsStr = localStorage.getItem('smartcab_system_settings');
      const settings = settingsStr ? JSON.parse(settingsStr) : {};
      settings.exchangeRate = newRate;
      localStorage.setItem('smartcab_system_settings', JSON.stringify(settings));
      localStorage.setItem('smartcabb_exchange_rate', String(newRate));
      try {
        const cacheStr = localStorage.getItem('smartcabb_config_cache');
        if (cacheStr) {
          const cache = JSON.parse(cacheStr);
          cache.exchangeRate = newRate;
          localStorage.setItem('smartcabb_config_cache', JSON.stringify(cache));
        }
      } catch (_) {}

      // Envoyer au backend via /config/update
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/config/update`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            config: { exchangeRate: newRate }
          })
        }
      );

      if (response.ok) {
        console.log('✅ Taux de change sauvegardé dans le backend:', newRate);
        return true;
      } else {
        console.error('❌ Erreur sauvegarde backend taux de change');
        return false;
      }
    } catch (err) {
      console.error('❌ Erreur sauvegarde taux de change:', err);
      return false;
    }
  }, []);

  // Charger au montage du composant
  useEffect(() => {
    loadExchangeRate();
    
    // Recharger toutes les 30 secondes pour synchroniser
    const interval = setInterval(() => {
      loadExchangeRate();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [loadExchangeRate]);

  return {
    exchangeRate,
    loading,
    error,
    saveExchangeRate,
    refresh: loadExchangeRate
  };
}
