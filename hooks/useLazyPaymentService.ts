/**
 * Hook pour charger le service de paiement de manière lazy
 * ✅ FIX PRODUCTION: Évite l'instanciation au niveau module
 */

import { useState, useEffect } from 'react';

type PaymentService = typeof import('../lib/payment-service').paymentService;

let cachedService: PaymentService | null = null;

export function useLazyPaymentService() {
  const [service, setService] = useState<PaymentService | null>(cachedService);
  const [loading, setLoading] = useState(!cachedService);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (cachedService) {
      setService(cachedService);
      setLoading(false);
      return;
    }

    let mounted = true;

    import('../lib/payment-service')
      .then((module) => {
        if (!mounted) return;
        cachedService = module.paymentService;
        setService(module.paymentService);
        setLoading(false);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err);
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return { service, loading, error };
}
