/**
 * SERVICE DE SYNCHRONISATION TEMPS RÉEL
 * 
 * Ce service assure la synchronisation en temps réel entre toutes les parties de l'application :
 * - Admin : Voit les modifications instantanément
 * - Passagers : Status des courses en temps réel
 * - Conducteurs : Nouvelles demandes de courses, modifications de solde, etc.
 * 
 * ARCHITECTURE :
 * - Toutes les données proviennent du backend KV store (source de vérité unique)
 * - Aucune donnée en mémoire locale (sauf cache temporaire)
 * - Polling intelligent avec détection de changements
 * - Notifications en temps réel des changements
 */

import { projectId, publicAnonKey } from '../utils/supabase/info';

const SERVER_URL = `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52`;

// ============================================
// TYPES
// ============================================

export type EntityType = 'driver' | 'passenger' | 'ride' | 'admin';

export interface SyncConfig {
  entityType: EntityType;
  entityId?: string;
  interval?: number; // Intervalle de polling en ms (défaut: 3000)
  onUpdate: (data: any) => void;
  onError?: (error: Error) => void;
}

export interface SyncSubscription {
  id: string;
  unsubscribe: () => void;
}

// ============================================
// GESTIONNAIRE DE SYNCHRONISATION
// ============================================

class RealtimeSyncService {
  private subscriptions: Map<string, NodeJS.Timeout> = new Map();
  private cache: Map<string, any> = new Map();
  private subscriptionCounter = 0;
  private userId: string | null = null;
  private userType: 'passenger' | 'driver' | 'admin' | null = null;
  private connected = false;

  /**
   * Initialiser le service avec l'ID et le type d'utilisateur
   */
  initialize(userId: string, userType: 'passenger' | 'driver' | 'admin'): void {
    this.userId = userId;
    this.userType = userType;
    this.connected = true;
    console.log(`🔗 Connexion établie pour ${userType} ${userId}`);
  }

  /**
   * Souscrire aux mises à jour en temps réel d'une entité
   */
  subscribe(config: SyncConfig): SyncSubscription {
    const subscriptionId = `${config.entityType}_${config.entityId || 'all'}_${++this.subscriptionCounter}`;
    const interval = config.interval || 3000; // Défaut: 3 secondes

    console.log(`🔔 Souscription temps réel: ${subscriptionId} (polling: ${interval}ms)`);

    // Charger immédiatement les données
    this.fetchAndNotify(config, subscriptionId);

    // Configurer le polling
    const intervalId = setInterval(() => {
      this.fetchAndNotify(config, subscriptionId);
    }, interval);

    this.subscriptions.set(subscriptionId, intervalId);

    return {
      id: subscriptionId,
      unsubscribe: () => this.unsubscribe(subscriptionId)
    };
  }

  /**
   * Se désabonner d'une synchronisation
   */
  private unsubscribe(subscriptionId: string) {
    const intervalId = this.subscriptions.get(subscriptionId);
    if (intervalId) {
      clearInterval(intervalId);
      this.subscriptions.delete(subscriptionId);
      this.cache.delete(subscriptionId);
      console.log(`🔕 Désinscription: ${subscriptionId}`);
    }
  }

  /**
   * Récupérer les données et notifier si changement
   */
  private async fetchAndNotify(config: SyncConfig, subscriptionId: string) {
    try {
      const data = await this.fetchData(config.entityType, config.entityId);
      
      // Comparer avec le cache pour détecter les changements
      const cached = this.cache.get(subscriptionId);
      const dataStr = JSON.stringify(data);
      const cachedStr = JSON.stringify(cached);

      if (dataStr !== cachedStr) {
        // Les données ont changé
        this.cache.set(subscriptionId, data);
        
        if (cached !== undefined) {
          // Ne pas notifier au premier chargement
          console.log(`🔄 Changement détecté: ${subscriptionId}`);
        }
        
        config.onUpdate(data);
      }
    } catch (error) {
      console.error(`❌ Erreur sync ${subscriptionId}:`, error);
      if (config.onError) {
        config.onError(error as Error);
      }
    }
  }

  /**
   * Récupérer les données depuis le backend
   */
  private async fetchData(entityType: EntityType, entityId?: string): Promise<any> {
    let url = '';

    switch (entityType) {
      case 'driver':
        if (entityId) {
          url = `${SERVER_URL}/drivers/${entityId}`;
        } else {
          url = `${SERVER_URL}/drivers`;
        }
        break;

      case 'passenger':
        if (entityId) {
          url = `${SERVER_URL}/passengers/${entityId}`;
        } else {
          url = `${SERVER_URL}/passengers`;
        }
        break;

      case 'ride':
        if (entityId) {
          url = `${SERVER_URL}/rides/${entityId}`;
        } else {
          url = `${SERVER_URL}/rides`;
        }
        break;

      case 'admin':
        url = `${SERVER_URL}/admin/stats`;
        break;

      default:
        throw new Error(`Type d'entité non supporté: ${entityType}`);
    }

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Nettoyer toutes les souscriptions
   */
  cleanup() {
    console.log('🧹 Nettoyage de toutes les souscriptions temps réel');
    this.subscriptions.forEach((intervalId) => {
      clearInterval(intervalId);
    });
    this.subscriptions.clear();
    this.cache.clear();
    this.connected = false;
    this.userId = null;
    this.userType = null;
  }

  /**
   * Forcer la synchronisation immédiate d'une entité
   */
  async sync(entityType: EntityType, entityId?: string): Promise<any> {
    console.log(`⚡ Synchronisation forcée: ${entityType} ${entityId || 'all'}`);
    return await this.fetchData(entityType, entityId);
  }

  /**
   * Mettre à jour une course et synchroniser
   */
  async syncRideUpdate(rideId: string, updates: Partial<any>): Promise<void> {
    console.log(`🔄 Mise à jour de la course ${rideId}:`, updates);
    const url = `${SERVER_URL}/rides/${rideId}`;
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    });

    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }

    // Recharger les données pour refléter les changements
    await this.sync('ride', rideId);
  }

  /**
   * Obtenir le statut de la connexion
   */
  getConnectionStatus(): { connected: boolean; userId: string | null; userType: string | null } {
    return {
      connected: this.connected,
      userId: this.userId,
      userType: this.userType
    };
  }
}

// ============================================
// INSTANCE SINGLETON
// ============================================

// ✅ FIX PRODUCTION V3: Factory function au lieu de Proxy
let realtimeSyncServiceInstance: RealtimeSyncService | null = null;

export function getRealtimeSyncService(): RealtimeSyncService {
  if (typeof window === 'undefined') {
    // SSR: retourner un mock
    return {} as RealtimeSyncService;
  }
  
  if (!realtimeSyncServiceInstance) {
    realtimeSyncServiceInstance = new RealtimeSyncService();
  }
  return realtimeSyncServiceInstance;
}

// Export pour compatibilité (utilise la factory)
export const realtimeSyncService = {
  initialize: (userId: string, userType: 'passenger' | 'driver' | 'admin') => 
    getRealtimeSyncService().initialize(userId, userType),
  subscribe: (config: SyncConfig) => getRealtimeSyncService().subscribe(config),
  cleanup: () => getRealtimeSyncService().cleanup(),
  sync: (entityType: EntityType, entityId?: string) => 
    getRealtimeSyncService().sync(entityType, entityId),
  syncRideUpdate: (rideId: string, updates: Partial<any>) => 
    getRealtimeSyncService().syncRideUpdate(rideId, updates),
  getConnectionStatus: () => getRealtimeSyncService().getConnectionStatus(),
};

// ============================================
// HOOKS REACT POUR FACILITER L'UTILISATION
// ============================================

export function useRealtimeDriver(driverId: string | undefined, onUpdate: (driver: any) => void) {
  const [subscription, setSubscription] = React.useState<SyncSubscription | null>(null);

  React.useEffect(() => {
    if (!driverId) return;

    const sub = realtimeSyncService.subscribe({
      entityType: 'driver',
      entityId: driverId,
      interval: 3000,
      onUpdate,
      onError: (error) => console.error('❌ Erreur sync conducteur:', error)
    });

    setSubscription(sub);

    return () => {
      sub.unsubscribe();
    };
  }, [driverId]);

  return subscription;
}

export function useRealtimeRide(rideId: string | undefined, onUpdate: (ride: any) => void) {
  const [subscription, setSubscription] = React.useState<SyncSubscription | null>(null);

  React.useEffect(() => {
    if (!rideId) return;

    const sub = realtimeSyncService.subscribe({
      entityType: 'ride',
      entityId: rideId,
      interval: 2000, // Plus fréquent pour les courses
      onUpdate,
      onError: (error) => console.error('❌ Erreur sync course:', error)
    });

    setSubscription(sub);

    return () => {
      sub.unsubscribe();
    };
  }, [rideId]);

  return subscription;
}

export function useRealtimeDrivers(onUpdate: (drivers: any[]) => void) {
  const [subscription, setSubscription] = React.useState<SyncSubscription | null>(null);

  React.useEffect(() => {
    const sub = realtimeSyncService.subscribe({
      entityType: 'driver',
      interval: 5000,
      onUpdate,
      onError: (error) => console.error('❌ Erreur sync conducteurs:', error)
    });

    setSubscription(sub);

    return () => {
      sub.unsubscribe();
    };
  }, []);

  return subscription;
}

export function useRealtimeAdminStats(onUpdate: (stats: any) => void) {
  const [subscription, setSubscription] = React.useState<SyncSubscription | null>(null);

  React.useEffect(() => {
    const sub = realtimeSyncService.subscribe({
      entityType: 'admin',
      interval: 10000, // Toutes les 10 secondes pour les stats
      onUpdate,
      onError: (error) => console.error('❌ Erreur sync stats admin:', error)
    });

    setSubscription(sub);

    return () => {
      sub.unsubscribe();
    };
  }, []);

  return subscription;
}

// Import React pour les hooks
import React from 'react';