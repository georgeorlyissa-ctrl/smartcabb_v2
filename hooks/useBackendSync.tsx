import { useEffect, useRef } from 'react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { useAppState } from './useAppState';

/**
 * 🔄 Hook pour synchroniser AUTOMATIQUEMENT les données du backend
 * 
 * PROBLÈME RÉSOLU :
 * - Les données étaient en cache localStorage
 * - Changements sur un appareil ne se reflétaient pas sur les autres
 * 
 * SOLUTION :
 * - Charge les settings depuis le backend TOUJOURS
 * - Désactive le cache localStorage pour les settings
 * - Auto-refresh toutes les 30 secondes
 * - Force le rechargement au montage du composant
 */
export function useBackendSync() {
  const { state, updateSystemSettings } = useAppState();
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isFirstLoad = useRef(true);

  const loadSettingsFromBackend = async () => {
    try {
      console.log('🔄 Chargement des settings depuis le backend...');
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/settings`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        
        if (data.success && data.settings) {
          const backendSettings = data.settings;
          
          // ✅ Comparer avec les settings actuels
          const currentRate = state.systemSettings?.exchangeRate || 0;
          const backendRate = backendSettings.exchangeRate || 0;
          
          const currentCommission = state.systemSettings?.postpaidInterestRate || 0;
          const backendCommission = backendSettings.postpaidInterestRate || 0;
          
          // Si différent, mettre à jour
          if (currentRate !== backendRate || currentCommission !== backendCommission) {
            console.log('🔄 Mise à jour détectée :', {
              taux_actuel: currentRate,
              taux_backend: backendRate,
              commission_actuelle: currentCommission,
              commission_backend: backendCommission
            });
            
            if (updateSystemSettings) {
              updateSystemSettings({
                exchangeRate: backendSettings.exchangeRate,
                postpaidInterestRate: backendSettings.postpaidInterestRate,
                emailNotifications: backendSettings.emailNotifications ?? true,
                smsNotifications: backendSettings.smsNotifications ?? false,
                pushNotifications: backendSettings.pushNotifications ?? true,
                baseFare: backendSettings.baseFare,
                perKmRate: backendSettings.perKmRate,
                perMinuteRate: backendSettings.perMinuteRate,
                minimumFare: backendSettings.minimumFare,
                commission: backendSettings.commission
              });
              
              console.log('✅ Settings synchronisés depuis le backend !');
            }
          } else {
            if (isFirstLoad.current) {
              console.log('✅ Settings déjà à jour (premier chargement)');
              isFirstLoad.current = false;
            }
          }
        }
      } else {
        console.error('❌ Erreur chargement settings:', await response.text());
      }
    } catch (error) {
      console.error('❌ Erreur réseau chargement settings:', error);
    }
  };

  useEffect(() => {
    // Charger immédiatement au montage
    loadSettingsFromBackend();

    // ✅ Ensuite recharger toutes les 30 secondes
    const interval = setInterval(() => {
      loadSettingsFromBackend();
    }, 30000); // 30 secondes

    return () => {
      clearInterval(interval);
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, []);

  return null;
}
