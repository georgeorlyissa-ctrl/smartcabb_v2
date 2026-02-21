/**
 * ⚡ SYSTÈME DE CACHE API - OPTIMISATION DES PERFORMANCES
 * 
 * Cache intelligent pour réduire les appels API répétitifs
 * et améliorer la réactivité de l'application
 * 
 * @version 1.0.0
 * @date 2026-01-30
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresIn: number; // en millisecondes
}

class APICache {
  private cache = new Map<string, CacheEntry<any>>();
  
  /**
   * Récupérer depuis le cache ou exécuter la fonction
   */
  async getOrFetch<T>(
    key: string,
    fetchFn: () => Promise<T>,
    expiresIn: number = 30000 // 30 secondes par défaut
  ): Promise<T> {
    const cached = this.cache.get(key);
    
    // Si le cache est valide, retourner directement
    if (cached && Date.now() - cached.timestamp < cached.expiresIn) {
      console.log(`⚡ Cache HIT: ${key}`);
      return cached.data;
    }
    
    // Sinon, récupérer les données
    console.log(`🔄 Cache MISS: ${key} - Fetching...`);
    const data = await fetchFn();
    
    // Mettre en cache
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresIn
    });
    
    return data;
  }
  
  /**
   * Invalider une entrée du cache
   */
  invalidate(key: string): void {
    this.cache.delete(key);
    console.log(`🗑️ Cache invalidé: ${key}`);
  }
  
  /**
   * Invalider toutes les entrées correspondant à un pattern
   */
  invalidatePattern(pattern: string): void {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
        count++;
      }
    }
    console.log(`🗑️ ${count} entrées invalidées pour le pattern: ${pattern}`);
  }
  
  /**
   * Nettoyer les entrées expirées
   */
  cleanup(): void {
    const now = Date.now();
    let count = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp >= entry.expiresIn) {
        this.cache.delete(key);
        count++;
      }
    }
    
    if (count > 0) {
      console.log(`🧹 ${count} entrées expirées nettoyées`);
    }
  }
  
  /**
   * Vider tout le cache
   */
  clear(): void {
    this.cache.clear();
    console.log('🗑️ Cache vidé complètement');
  }
  
  /**
   * Obtenir les statistiques du cache
   */
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Instance singleton
export const apiCache = new APICache();

// Nettoyer automatiquement toutes les 2 minutes
setInterval(() => {
  apiCache.cleanup();
}, 2 * 60 * 1000);

/**
 * ⚡ DURÉES DE CACHE RECOMMANDÉES
 */
export const CACHE_DURATION = {
  VERY_SHORT: 10 * 1000,      // 10 secondes - données très volatiles
  SHORT: 30 * 1000,            // 30 secondes - données fréquemment modifiées
  MEDIUM: 2 * 60 * 1000,       // 2 minutes - données semi-statiques
  LONG: 10 * 60 * 1000,        // 10 minutes - données quasi-statiques
  VERY_LONG: 30 * 60 * 1000    // 30 minutes - données statiques
};

/**
 * Hook React pour utiliser le cache
 */
export function useCachedAPI<T>(
  key: string,
  fetchFn: () => Promise<T>,
  expiresIn: number = CACHE_DURATION.SHORT
): {
  fetch: () => Promise<T>;
  invalidate: () => void;
} {
  return {
    fetch: () => apiCache.getOrFetch(key, fetchFn, expiresIn),
    invalidate: () => apiCache.invalidate(key)
  };
}
