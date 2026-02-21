import { useEffect, useState } from 'react';

/**
 * ExchangeRateSync - Synchronise le taux de change depuis le localStorage
 * Fonctionne en mode local uniquement avec localStorage
 */
export function ExchangeRateSync() {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const syncExchangeRate = async () => {
      try {
        console.log('🔄 Initialisation du taux de change...');
        
        // Initialiser les paramètres par défaut si nécessaire
        const currentRate = localStorage.getItem('smartcabb_exchange_rate');
        if (!currentRate) {
          localStorage.setItem('smartcabb_exchange_rate', '2000');
          const defaultSettings = {
            exchangeRate: 2000,
            freeWaitingMinutes: 10,
            commission: 15,
            smartStandardDay: 7,
            smartStandardNight: 10,
            smartConfortDay: 9,
            smartConfortNight: 15,
            smartPlusDay: 15,
            smartPlusNight: 17,
            smartPlusPlusDay: 15,
            smartPlusPlusNight: 20
          };
          localStorage.setItem('smartcabb_settings', JSON.stringify(defaultSettings));
          console.log('✅ Paramètres par défaut initialisés dans le localStorage (2000 CDF)');
        } else {
          console.log(`ℹ️ Taux de change actuel: ${currentRate} CDF`);
        }
      } catch (error: any) {
        console.log('ℹ️ Erreur lors de l\'initialisation des paramètres:', error?.message);
      } finally {
        setIsInitialized(true);
      }
    };

    // Synchroniser au montage
    syncExchangeRate();
  }, []);

  // Ce composant ne rend rien (composant invisible)
  return null;
}

/**
 * Hook pour récupérer le taux de change actuel
 */
export function useExchangeRate() {
  const [exchangeRate, setExchangeRate] = useState(() => {
    const rate = localStorage.getItem('smartcabb_exchange_rate');
    return rate ? parseInt(rate) : 2000;
  });

  useEffect(() => {
    // Écouter les mises à jour du taux de change
    const handleUpdate = (event: any) => {
      setExchangeRate(event.detail.rate);
    };

    window.addEventListener('exchange-rate-updated', handleUpdate);

    return () => {
      window.removeEventListener('exchange-rate-updated', handleUpdate);
    };
  }, []);

  return exchangeRate;
}