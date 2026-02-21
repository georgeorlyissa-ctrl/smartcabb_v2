import React, { useEffect, useRef, useState } from 'react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { useAppState } from '../hooks/useAppState';

/**
 * 🔄 Composant pour synchroniser les données du backend
 * 
 * CHANGEMENT v517.64 :
 * - ❌ SUPPRESSION du rechargement automatique
 * - ✅ Chargement manuel uniquement (via bouton Actualiser)
 * - ✅ Migration automatique localStorage → backend au premier lancement
 * - ✅ Une seule source de vérité : le backend KV store
 * 
 * MIGRATION DES DONNÉES :
 * 1. Au premier lancement, on copie les données de localStorage → backend
 * 2. Ensuite, on utilise UNIQUEMENT le backend
 * 3. Cela évite de perdre les données existantes
 */
export function BackendSyncProvider() {
  const { state, updateSystemSettings } = useAppState();
  const hasMigratedData = useRef(false);
  const hasLoggedError = useRef(false);

  // ✅ MIGRATION : Copier localStorage → backend au premier lancement
  const migrateLocalStorageToBackend = async () => {
    if (hasMigratedData.current) return;
    
    try {
      // Vérifier si des données existent dans localStorage
      const localStorageData = localStorage.getItem('smartcabb-state');
      if (!localStorageData) {
        console.log('ℹ️ Aucune donnée à migrer depuis localStorage');
        hasMigratedData.current = true;
        return;
      }

      const parsedData = JSON.parse(localStorageData);
      const localSettings = parsedData?.systemSettings;

      if (!localSettings) {
        console.log('ℹ️ Aucun settings à migrer depuis localStorage');
        hasMigratedData.current = true;
        return;
      }

      // Vérifier si le backend a déjà des données
      const checkResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/settings`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      let shouldMigrate = false;

      if (checkResponse.ok) {
        const backendData = await checkResponse.json();
        
        // Si le backend est vide ou a des valeurs par défaut, on migre
        if (!backendData.exchangeRate || backendData.exchangeRate === 2800) {
          shouldMigrate = true;
        }
      } else {
        // Si le backend n'est pas accessible, on ne migre pas (on laissera utiliser localStorage)
        console.log('ℹ️ Backend non accessible, pas de migration');
        hasMigratedData.current = true;
        return;
      }

      if (shouldMigrate) {
        console.log('🔄 Migration des données localStorage → backend...');
        
        // Envoyer les données au backend
        const migrateResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/settings`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(localSettings)
          }
        );

        if (migrateResponse.ok) {
          console.log('✅ Migration réussie ! Données copiées dans le backend');
        } else {
          console.error('❌ Erreur lors de la migration:', await migrateResponse.text());
        }
      }

      hasMigratedData.current = true;
    } catch (error) {
      console.error('❌ Erreur durant la migration:', error);
      hasMigratedData.current = true; // On continue même en cas d'erreur
    }
  };

  // ✅ CHARGEMENT INITIAL : Charger les données du backend une seule fois
  const loadSettingsFromBackend = async () => {
    try {
      const url = `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/settings`;
      
      console.log('🔄 Chargement des settings depuis le backend...');
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const backendSettings = await response.json();
        
        // Vérifier que les données sont valides
        if (backendSettings && typeof backendSettings === 'object') {
          const currentRate = state.systemSettings?.exchangeRate || 0;
          const backendRate = backendSettings.exchangeRate || 0;
          
          const currentCommission = state.systemSettings?.postpaidInterestRate || 0;
          const backendCommission = backendSettings.postpaidInterestRate || 0;
          
          // Si différent, mettre à jour
          if (currentRate !== backendRate || currentCommission !== backendCommission) {
            console.log('🔄 Application des settings backend:', {
              taux: backendRate,
              commission: backendCommission
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
              
              console.log('✅ Settings chargés depuis le backend');
            }
          }
          
          hasLoggedError.current = false;
        }
      }
    } catch (error) {
      if (!hasLoggedError.current) {
        console.log('ℹ️ Backend non accessible, utilisation du cache localStorage');
        hasLoggedError.current = true;
      }
    }
  };

  useEffect(() => {
    // ✅ ÉTAPE 1 : Migrer les données localStorage → backend
    migrateLocalStorageToBackend().then(() => {
      // ✅ ÉTAPE 2 : Charger les données depuis le backend
      loadSettingsFromBackend();
    });

    // ❌ PAS DE RECHARGEMENT AUTOMATIQUE
    // Les données ne se rechargent que quand l'utilisateur clique sur "Actualiser"
  }, []);

  return null; // Ce composant ne rend rien visuellement
}

/**
 * 🔄 Hook pour forcer le rechargement manuel des données
 * 
 * Utilisation :
 * ```tsx
 * import { useManualSync } from './components/BackendSyncProvider';
 * 
 * const { refreshData, isRefreshing } = useManualSync();
 * 
 * <Button onClick={refreshData} disabled={isRefreshing}>
 *   <RefreshCw className={isRefreshing ? 'animate-spin' : ''} />
 *   Actualiser
 * </Button>
 * ```
 */
export function useManualSync() {
  const { updateSystemSettings } = useAppState();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshData = async () => {
    setIsRefreshing(true);
    
    try {
      const url = `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/settings`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const backendSettings = await response.json();
        
        if (backendSettings && typeof backendSettings === 'object' && updateSystemSettings) {
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
          
          console.log('✅ Données actualisées manuellement');
        }
      }
    } catch (error) {
      console.error('❌ Erreur lors de l\'actualisation:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  return { refreshData, isRefreshing };
}