import { useState, useEffect, useCallback } from 'react';
import { settingService } from '../lib/supabase-services';
import type { Setting } from '../lib/supabase';

// Types pour les paramètres
export interface AppSettings {
  // Commission
  commissionRate: number;
  
  // SMS
  smsProvider: 'africas_talking' | 'twilio' | 'disabled';
  smsEnabled: boolean;
  
  // Tarification
  nightTimeStart: string; // "21:00"
  nightTimeEnd: string;   // "06:00"
  freeWaitingMinutes: number;
  distantZoneMultiplier: number;
  
  // Paiement
  postpaidEnabled: boolean;
  postpaidFee: number;
  flutterwaveEnabled: boolean;
  
  // Notifications
  notificationsEnabled: boolean;
  
  // Autres
  appVersion: string;
  maintenanceMode: boolean;
}

// Valeurs par défaut
const DEFAULT_SETTINGS: AppSettings = {
  commissionRate: 10,
  smsProvider: 'africas_talking',
  smsEnabled: true,
  nightTimeStart: '21:00',
  nightTimeEnd: '06:00',
  freeWaitingMinutes: 10,
  distantZoneMultiplier: 2,
  postpaidEnabled: true,
  postpaidFee: 5000,
  flutterwaveEnabled: true,
  notificationsEnabled: true,
  appVersion: '1.0.0',
  maintenanceMode: false,
};

/**
 * Hook centralisé pour gérer tous les paramètres de l'application
 * Les modifications sont automatiquement propagées à tous les composants
 */
export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Charger les paramètres depuis Supabase
  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const supabaseSettings = await settingService.getAllSettings();

      if (supabaseSettings && supabaseSettings.length > 0) {
        // Convertir les settings Supabase en objet AppSettings
        const loadedSettings: Partial<AppSettings> = {};

        supabaseSettings.forEach((setting: Setting) => {
          const key = setting.key as keyof AppSettings;
          
          // Parser la valeur selon le type
          if (typeof DEFAULT_SETTINGS[key] === 'number') {
            loadedSettings[key] = parseFloat(setting.value) as any;
          } else if (typeof DEFAULT_SETTINGS[key] === 'boolean') {
            loadedSettings[key] = (setting.value === 'true' || setting.value === '1') as any;
          } else {
            loadedSettings[key] = setting.value as any;
          }
        });

        // Fusionner avec les valeurs par défaut
        setSettings({
          ...DEFAULT_SETTINGS,
          ...loadedSettings,
        });

        console.log('✅ Settings chargés:', loadedSettings);
      } else {
        // Utiliser les valeurs par défaut si aucun setting en base
        console.log('ℹ️ Aucun setting en base, utilisation des valeurs par défaut');
        setSettings(DEFAULT_SETTINGS);
      }
    } catch (err) {
      // ✅ Ne plus logger l'erreur - utiliser simplement les valeurs par défaut
      console.debug('⚠️ Settings non disponibles, utilisation valeurs par défaut');
      setSettings(DEFAULT_SETTINGS);
      // Ne pas définir d'erreur, juste utiliser les defaults
      setError(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Mettre à jour un paramètre
  const updateSetting = useCallback(async <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ): Promise<boolean> => {
    try {
      // Mettre à jour localement d'abord (optimistic update)
      setSettings(prev => ({
        ...prev,
        [key]: value,
      }));

      // Sauvegarder dans Supabase
      const stringValue = String(value);
      const updated = await settingService.updateSetting(key, stringValue);

      if (!updated) {
        // Si échec, créer le setting
        await settingService.createSetting({
          key,
          value: stringValue,
          description: `Paramètre ${key}`,
        });
      }

      console.log(`✅ Setting ${key} mis à jour:`, value);
      return true;
    } catch (err) {
      console.error(`❌ Erreur mise à jour setting ${key}:`, err);
      
      // Revenir à la valeur précédente en cas d'erreur
      await loadSettings();
      return false;
    }
  }, [loadSettings]);

  // Mettre à jour plusieurs paramètres en une fois
  const updateSettings = useCallback(async (
    updates: Partial<AppSettings>
  ): Promise<boolean> => {
    try {
      // Mettre à jour localement
      setSettings(prev => ({
        ...prev,
        ...updates,
      }));

      // Sauvegarder chaque setting dans Supabase
      const promises = Object.entries(updates).map(([key, value]) =>
        updateSetting(key as keyof AppSettings, value)
      );

      const results = await Promise.all(promises);
      const allSuccess = results.every(r => r);

      if (allSuccess) {
        console.log('✅ Tous les settings mis à jour:', updates);
      } else {
        console.warn('⚠️ Certains settings n\'ont pas pu être mis à jour');
      }

      return allSuccess;
    } catch (err) {
      console.error('❌ Erreur mise à jour settings:', err);
      await loadSettings();
      return false;
    }
  }, [updateSetting, loadSettings]);

  // Réinitialiser aux valeurs par défaut
  const resetToDefaults = useCallback(async (): Promise<boolean> => {
    try {
      setSettings(DEFAULT_SETTINGS);
      
      // Sauvegarder les valeurs par défaut dans Supabase
      const promises = Object.entries(DEFAULT_SETTINGS).map(([key, value]) =>
        updateSetting(key as keyof AppSettings, value)
      );

      await Promise.all(promises);
      console.log('✅ Settings réinitialisés aux valeurs par défaut');
      return true;
    } catch (err) {
      console.error('❌ Erreur réinitialisation settings:', err);
      return false;
    }
  }, [updateSetting]);

  // Charger les settings au montage
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return {
    settings,
    loading,
    error,
    updateSetting,
    updateSettings,
    resetToDefaults,
    refresh: loadSettings,
  };
}

// Hook pour obtenir un setting spécifique
export function useSetting<K extends keyof AppSettings>(key: K): AppSettings[K] {
  const { settings } = useSettings();
  return settings[key];
}