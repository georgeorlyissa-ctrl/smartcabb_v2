/**
 * 📊 ANALYTICS DE RECHERCHE - TRACKING D'USAGE
 * 
 * Suit l'utilisation des lieux pour améliorer le ranking
 * - Quels lieux sont populaires ?
 * - Quels trajets sont fréquents ?
 * - Quelles heures de pointe ?
 * 
 * Comme Uber/Yango : apprentissage machine léger
 */

import { projectId, publicAnonKey } from '../utils/supabase/info';

export interface SearchAnalytics {
  placeId: string;
  placeName: string;
  searchCount: number;
  selectionCount: number;
  lastSearched: string;
  lastSelected: string;
  popularHours: number[]; // 0-23
}

export interface RouteAnalytics {
  pickupPlaceId: string;
  destinationPlaceId: string;
  count: number;
  lastUsed: string;
}

/**
 * 📊 CLASSE D'ANALYTICS
 */
export class SearchAnalyticsTracker {
  
  /**
   * 🔍 ENREGISTRER UNE RECHERCHE
   * 
   * Appelé quand l'utilisateur tape dans la barre de recherche
   */
  static async trackSearch(
    placeId: string,
    placeName: string
  ): Promise<void> {
    try {
      const hour = new Date().getHours();
      
      // Enregistrer dans le backend
      await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/analytics/search`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            placeId,
            placeName,
            hour,
            timestamp: new Date().toISOString()
          })
        }
      );
      
      console.log('📊 Search tracked:', placeName);
    } catch (error) {
      console.warn('⚠️ Failed to track search:', error);
      // Ne pas bloquer l'UX si le tracking échoue
    }
  }
  
  /**
   * ✅ ENREGISTRER UNE SÉLECTION
   * 
   * Appelé quand l'utilisateur clique sur un résultat
   */
  static async trackSelection(
    placeId: string,
    placeName: string,
    distance?: number
  ): Promise<void> {
    try {
      const hour = new Date().getHours();
      
      await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/analytics/selection`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            placeId,
            placeName,
            distance,
            hour,
            timestamp: new Date().toISOString()
          })
        }
      );
      
      console.log('📊 Selection tracked:', placeName);
    } catch (error) {
      console.warn('⚠️ Failed to track selection:', error);
    }
  }
  
  /**
   * 🚗 ENREGISTRER UN TRAJET
   * 
   * Appelé quand l'utilisateur confirme une course
   */
  static async trackRoute(
    pickupPlaceId: string,
    destinationPlaceId: string
  ): Promise<void> {
    try {
      await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/analytics/route`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            pickupPlaceId,
            destinationPlaceId,
            timestamp: new Date().toISOString()
          })
        }
      );
      
      console.log('📊 Route tracked');
    } catch (error) {
      console.warn('⚠️ Failed to track route:', error);
    }
  }
  
  /**
   * 📈 RÉCUPÉRER LES STATISTIQUES GLOBALES
   * 
   * Pour le ranking intelligent
   */
  static async getGlobalUsage(): Promise<Record<string, number>> {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/analytics/global-usage`,
        {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` }
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch global usage');
      }
      
      const data = await response.json();
      return data.usage || {};
      
    } catch (error) {
      console.warn('⚠️ Failed to get global usage:', error);
      return {};
    }
  }
  
  /**
   * 🔥 RÉCUPÉRER LES LIEUX POPULAIRES
   * 
   * Top 10 des lieux les plus recherchés
   */
  static async getPopularPlaces(limit: number = 10): Promise<SearchAnalytics[]> {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/analytics/popular-places?limit=${limit}`,
        {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` }
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch popular places');
      }
      
      const data = await response.json();
      return data.places || [];
      
    } catch (error) {
      console.warn('⚠️ Failed to get popular places:', error);
      return [];
    }
  }
  
  /**
   * 🚗 RÉCUPÉRER LES TRAJETS POPULAIRES
   * 
   * Top trajets les plus fréquents
   */
  static async getPopularRoutes(limit: number = 10): Promise<RouteAnalytics[]> {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/analytics/popular-routes?limit=${limit}`,
        {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` }
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch popular routes');
      }
      
      const data = await response.json();
      return data.routes || [];
      
    } catch (error) {
      console.warn('⚠️ Failed to get popular routes:', error);
      return [];
    }
  }
}

/**
 * 🎯 HELPERS RAPIDES
 */

export function trackSearch(placeId: string, placeName: string) {
  return SearchAnalyticsTracker.trackSearch(placeId, placeName);
}

export function trackSelection(placeId: string, placeName: string, distance?: number) {
  return SearchAnalyticsTracker.trackSelection(placeId, placeName, distance);
}

export function trackRoute(pickupPlaceId: string, destinationPlaceId: string) {
  return SearchAnalyticsTracker.trackRoute(pickupPlaceId, destinationPlaceId);
}
