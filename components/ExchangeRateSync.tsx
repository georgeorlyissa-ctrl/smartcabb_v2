import { useEffect, useState } from 'react';

/**
 * ExchangeRateSync — Synchronise le taux de change depuis le cache config global
 * Écoute les événements de mise à jour de config admin en temps réel
 */
export function ExchangeRateSync() {
  useEffect(() => {
    // Initialiser depuis le cache config si disponible
    try {
      for (const key of ['smartcabb_config_cache', 'smartcab_system_settings', 'smartcabb_settings']) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.exchangeRate && typeof parsed.exchangeRate === 'number' && parsed.exchangeRate > 0) {
            // Synchroniser aussi la clé legacy
            localStorage.setItem('smartcabb_exchange_rate', String(parsed.exchangeRate));
            window.dispatchEvent(new CustomEvent('exchange-rate-updated', { detail: { rate: parsed.exchangeRate } }));
            console.log(`✅ Taux de change initialisé : ${parsed.exchangeRate} CDF`);
            return;
          }
        }
      }
      // Aucune valeur → utiliser 2800 CDF (aligné avec le backend)
      localStorage.setItem('smartcabb_exchange_rate', '2800');
      console.log('ℹ️ Taux de change par défaut : 2800 CDF');
    } catch (_) {}

    // Écouter les mises à jour admin en temps réel
    const handleConfigUpdate = (event: CustomEvent) => {
      const rate = event.detail?.exchangeRate ?? event.detail?.rate;
      if (rate && typeof rate === 'number' && rate > 0) {
        localStorage.setItem('smartcabb_exchange_rate', String(rate));
        window.dispatchEvent(new CustomEvent('exchange-rate-updated', { detail: { rate } }));
        console.log(`🔄 Taux de change mis à jour par l'admin : ${rate} CDF`);
      }
    };

    window.addEventListener('smartcabb:config-updated', handleConfigUpdate as EventListener);
    return () => window.removeEventListener('smartcabb:config-updated', handleConfigUpdate as EventListener);
  }, []);

  return null;
}

/**
 * Hook pour récupérer le taux de change actuel (réactif aux mises à jour admin)
 */
export function useExchangeRate(): number {
  const [exchangeRate, setExchangeRate] = useState<number>(() => {
    try {
      for (const key of ['smartcabb_config_cache', 'smartcab_system_settings', 'smartcabb_exchange_rate']) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          const rate = typeof parsed === 'number' ? parsed : parsed?.exchangeRate;
          if (rate && typeof rate === 'number' && rate > 0) return rate;
        }
      }
    } catch (_) {}
    return 2800;
  });

  useEffect(() => {
    const handleRateUpdate = (event: CustomEvent) => {
      const rate = event.detail?.exchangeRate ?? event.detail?.rate;
      if (rate && typeof rate === 'number' && rate > 0) {
        setExchangeRate(rate);
      }
    };

    window.addEventListener('exchange-rate-updated', handleRateUpdate as EventListener);
    window.addEventListener('smartcabb:config-updated', handleRateUpdate as EventListener);
    return () => {
      window.removeEventListener('exchange-rate-updated', handleRateUpdate as EventListener);
      window.removeEventListener('smartcabb:config-updated', handleRateUpdate as EventListener);
    };
  }, []);

  return exchangeRate;
}
