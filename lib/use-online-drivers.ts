import { useState, useEffect, useCallback } from 'react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface Location {
  lat: number;
  lng: number;
  address?: string;
}

export interface OnlineDriver {
  id: string;
  name: string;
  phone: string;
  location: Location;
  vehicleInfo: {
    make: string;
    model: string;
    color: string;
    plate: string;
  };
  rating: number;
  totalRides: number;
}

interface UseOnlineDriversReturn {
  drivers: OnlineDriver[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook pour récupérer les conducteurs en ligne depuis la base de données
 * Mise à jour automatique toutes les 10 secondes
 * ⚠️ AUCUNE SIMULATION - Données réelles uniquement
 */
export function useOnlineDrivers(autoRefresh = true): UseOnlineDriversReturn {
  const [drivers, setDrivers] = useState<OnlineDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOnlineDrivers = useCallback(async () => {
    try {
      console.log('🔍 Récupération des conducteurs en ligne...');
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/drivers/online-drivers`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );

      const contentType = response.headers.get('content-type');
      if (!response.ok || contentType?.includes('text/html')) {
        const errorMsg = `Serveur backend inaccessible (code: ${response.status})`;
        console.error('❌', errorMsg);
        setDrivers([]);
        setError(errorMsg);
        setLoading(false);
        return;
      }

      const result = await response.json();
      console.log('📥 Résultat conducteurs:', result);

      if (result.success) {
        setDrivers(result.drivers || []);
        setError(null);
        console.log(`✅ ${result.count} conducteur(s) en ligne récupéré(s)`);
      } else {
        const errorMsg = result.error || 'Impossible de récupérer les conducteurs';
        console.error('❌', errorMsg);
        setDrivers([]);
        setError(errorMsg);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erreur de connexion au serveur';
      console.error('❌ Erreur lors de la récupération des conducteurs:', errorMsg);
      setDrivers([]);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  // Récupération initiale
  useEffect(() => {
    fetchOnlineDrivers();
  }, [fetchOnlineDrivers]);

  // Auto-refresh toutes les 10 secondes si activé
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      console.log('🔄 Mise à jour automatique des conducteurs...');
      fetchOnlineDrivers();
    }, 10000); // 10 secondes

    return () => clearInterval(interval);
  }, [autoRefresh, fetchOnlineDrivers]);

  return {
    drivers,
    loading,
    error,
    refetch: fetchOnlineDrivers
  };
}
