/**
 * 💾 GESTIONNAIRE DE CACHE POI INTELLIGENT
 * 
 * Système de cache avancé pour les Points d'Intérêt (POI)
 * Optimise les performances et réduit les appels API
 * 
 * Fonctionnalités :
 * - Cache en mémoire avec expiration TTL
 * - Cache persistant dans LocalStorage
 * - Stratégie LRU (Least Recently Used)
 * - Statistiques d'utilisation
 * - Pré-chargement des lieux populaires
 */

import type { EnrichedPlace } from './nominatim-enriched-service';

// ⚙️ CONFIGURATION DU CACHE
const CACHE_CONFIG = {
  MEMORY_TTL: 1000 * 60 * 60, // 1 heure en mémoire
  STORAGE_TTL: 1000 * 60 * 60 * 24 * 7, // 7 jours en storage
  MAX_MEMORY_ITEMS: 200, // Max 200 requêtes en mémoire
  MAX_STORAGE_ITEMS: 1000, // Max 1000 requêtes en storage
  STORAGE_KEY: 'smartcabb_poi_cache_v1'
};

// 📊 STATISTIQUES DU CACHE
interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  lastClear: number;
}

// 🗂️ ENTRÉE DU CACHE
interface CacheEntry {
  data: EnrichedPlace[];
  timestamp: number;
  accessCount: number;
  lastAccess: number;
  queryHash: string;
}

// 💾 STOCKAGE PERSISTANT
interface StorageCache {
  entries: Record<string, CacheEntry>;
  stats: CacheStats;
  version: string;
}

/**
 * 🎯 GESTIONNAIRE DE CACHE POI
 */
class POICacheManager {
  private memoryCache = new Map<string, CacheEntry>();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    lastClear: Date.now()
  };

  constructor() {
    this.loadFromStorage();
    this.startCleanupInterval();
  }

  /**
   * 📥 RÉCUPÉRER DES DONNÉES DU CACHE
   */
  get(queryHash: string): EnrichedPlace[] | null {
    // Chercher en mémoire d'abord
    const memoryEntry = this.memoryCache.get(queryHash);
    
    if (memoryEntry && !this.isExpired(memoryEntry, CACHE_CONFIG.MEMORY_TTL)) {
      this.stats.hits++;
      memoryEntry.accessCount++;
      memoryEntry.lastAccess = Date.now();
      console.log(`✅ Cache HIT (mémoire): ${queryHash.slice(0, 20)}...`);
      return memoryEntry.data;
    }

    // Chercher dans le storage persistant
    const storageEntry = this.getFromStorage(queryHash);
    
    if (storageEntry && !this.isExpired(storageEntry, CACHE_CONFIG.STORAGE_TTL)) {
      this.stats.hits++;
      storageEntry.accessCount++;
      storageEntry.lastAccess = Date.now();
      
      // Copier dans la mémoire cache
      this.memoryCache.set(queryHash, storageEntry);
      
      console.log(`✅ Cache HIT (storage): ${queryHash.slice(0, 20)}...`);
      return storageEntry.data;
    }

    // Aucun résultat
    this.stats.misses++;
    console.log(`❌ Cache MISS: ${queryHash.slice(0, 20)}...`);
    return null;
  }

  /**
   * 💾 STOCKER DES DONNÉES DANS LE CACHE
   */
  set(queryHash: string, data: EnrichedPlace[]): void {
    const entry: CacheEntry = {
      data,
      timestamp: Date.now(),
      accessCount: 1,
      lastAccess: Date.now(),
      queryHash
    };

    // Ajouter en mémoire
    this.memoryCache.set(queryHash, entry);

    // Ajouter au storage persistant
    this.saveToStorage(queryHash, entry);

    // Nettoyer si nécessaire
    this.enforceMemoryLimit();

    console.log(`💾 Cache SET: ${queryHash.slice(0, 20)}... (${data.length} résultats)`);
  }

  /**
   * 🗑️ SUPPRIMER UNE ENTRÉE
   */
  delete(queryHash: string): void {
    this.memoryCache.delete(queryHash);
    this.removeFromStorage(queryHash);
    console.log(`🗑️ Cache DELETE: ${queryHash.slice(0, 20)}...`);
  }

  /**
   * 🧹 NETTOYER TOUT LE CACHE
   */
  clear(): void {
    this.memoryCache.clear();
    this.clearStorage();
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      lastClear: Date.now()
    };
    console.log('🧹 Cache entièrement nettoyé');
  }

  /**
   * 📊 OBTENIR LES STATISTIQUES
   */
  getStats(): CacheStats & { hitRate: number; memorySize: number } {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
    
    return {
      ...this.stats,
      hitRate: Math.round(hitRate * 100) / 100,
      memorySize: this.memoryCache.size
    };
  }

  /**
   * 🔍 GÉNÉRER UN HASH POUR UNE REQUÊTE
   */
  static hashQuery(
    query: string,
    location?: { lat: number; lng: number },
    filters?: Record<string, any>
  ): string {
    const parts = [
      query.toLowerCase().trim(),
      location ? `${location.lat.toFixed(4)},${location.lng.toFixed(4)}` : '',
      filters ? JSON.stringify(filters) : ''
    ];
    return parts.join('|');
  }

  /**
   * ⏰ VÉRIFIER SI UNE ENTRÉE EST EXPIRÉE
   */
  private isExpired(entry: CacheEntry, ttl: number): boolean {
    return Date.now() - entry.timestamp > ttl;
  }

  /**
   * 🎯 APPLIQUER LA LIMITE MÉMOIRE (LRU)
   */
  private enforceMemoryLimit(): void {
    if (this.memoryCache.size <= CACHE_CONFIG.MAX_MEMORY_ITEMS) {
      return;
    }

    // Trier par dernière utilisation (LRU)
    const entries = Array.from(this.memoryCache.entries())
      .sort((a, b) => a[1].lastAccess - b[1].lastAccess);

    // Supprimer les plus anciennes
    const toRemove = entries.slice(0, this.memoryCache.size - CACHE_CONFIG.MAX_MEMORY_ITEMS);
    
    for (const [key] of toRemove) {
      this.memoryCache.delete(key);
      this.stats.evictions++;
    }

    console.log(`🗑️ Cache LRU: ${toRemove.length} entrées supprimées`);
  }

  /**
   * 📂 CHARGER LE CACHE DEPUIS LE STORAGE
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(CACHE_CONFIG.STORAGE_KEY);
      if (!stored) return;

      const storageCache: StorageCache = JSON.parse(stored);
      
      // Charger les entrées récentes en mémoire
      const now = Date.now();
      let loadedCount = 0;

      for (const [key, entry] of Object.entries(storageCache.entries)) {
        if (!this.isExpired(entry, CACHE_CONFIG.STORAGE_TTL)) {
          // Charger seulement les plus récentes en mémoire
          if (now - entry.lastAccess < CACHE_CONFIG.MEMORY_TTL) {
            this.memoryCache.set(key, entry);
            loadedCount++;
          }
        }
      }

      console.log(`📂 Cache chargé: ${loadedCount} entrées en mémoire`);

    } catch (error) {
      console.error('❌ Erreur chargement cache:', error);
      this.clearStorage();
    }
  }

  /**
   * 💾 SAUVEGARDER DANS LE STORAGE
   */
  private saveToStorage(queryHash: string, entry: CacheEntry): void {
    try {
      const stored = localStorage.getItem(CACHE_CONFIG.STORAGE_KEY);
      const storageCache: StorageCache = stored 
        ? JSON.parse(stored)
        : { entries: {}, stats: this.stats, version: '1.0' };

      storageCache.entries[queryHash] = entry;

      // Nettoyer les entrées expirées
      const now = Date.now();
      for (const [key, e] of Object.entries(storageCache.entries)) {
        if (this.isExpired(e, CACHE_CONFIG.STORAGE_TTL)) {
          delete storageCache.entries[key];
        }
      }

      // Limiter le nombre d'entrées (LRU)
      const entries = Object.entries(storageCache.entries);
      if (entries.length > CACHE_CONFIG.MAX_STORAGE_ITEMS) {
        const sorted = entries.sort((a, b) => a[1].lastAccess - b[1].lastAccess);
        const toKeep = sorted.slice(-CACHE_CONFIG.MAX_STORAGE_ITEMS);
        storageCache.entries = Object.fromEntries(toKeep);
      }

      localStorage.setItem(CACHE_CONFIG.STORAGE_KEY, JSON.stringify(storageCache));

    } catch (error) {
      console.error('❌ Erreur sauvegarde cache:', error);
      // Si quota dépassé, nettoyer le storage
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        this.clearStorage();
      }
    }
  }

  /**
   * 📂 RÉCUPÉRER DU STORAGE
   */
  private getFromStorage(queryHash: string): CacheEntry | null {
    try {
      const stored = localStorage.getItem(CACHE_CONFIG.STORAGE_KEY);
      if (!stored) return null;

      const storageCache: StorageCache = JSON.parse(stored);
      return storageCache.entries[queryHash] || null;

    } catch (error) {
      console.error('❌ Erreur lecture cache:', error);
      return null;
    }
  }

  /**
   * 🗑️ SUPPRIMER DU STORAGE
   */
  private removeFromStorage(queryHash: string): void {
    try {
      const stored = localStorage.getItem(CACHE_CONFIG.STORAGE_KEY);
      if (!stored) return;

      const storageCache: StorageCache = JSON.parse(stored);
      delete storageCache.entries[queryHash];

      localStorage.setItem(CACHE_CONFIG.STORAGE_KEY, JSON.stringify(storageCache));

    } catch (error) {
      console.error('❌ Erreur suppression cache:', error);
    }
  }

  /**
   * 🧹 NETTOYER LE STORAGE
   */
  private clearStorage(): void {
    try {
      localStorage.removeItem(CACHE_CONFIG.STORAGE_KEY);
      console.log('🧹 Storage cache nettoyé');
    } catch (error) {
      console.error('❌ Erreur nettoyage storage:', error);
    }
  }

  /**
   * ⏱️ DÉMARRER LE NETTOYAGE AUTOMATIQUE
   */
  private startCleanupInterval(): void {
    // Nettoyer les entrées expirées toutes les 10 minutes
    setInterval(() => {
      const before = this.memoryCache.size;
      
      for (const [key, entry] of this.memoryCache.entries()) {
        if (this.isExpired(entry, CACHE_CONFIG.MEMORY_TTL)) {
          this.memoryCache.delete(key);
        }
      }

      const after = this.memoryCache.size;
      if (before !== after) {
        console.log(`🧹 Nettoyage auto: ${before - after} entrées expirées`);
      }
    }, 1000 * 60 * 10); // 10 minutes
  }

  /**
   * 📋 OBTENIR TOUTES LES CLÉS DU CACHE
   */
  getKeys(): string[] {
    return Array.from(this.memoryCache.keys());
  }

  /**
   * 📊 OBTENIR LA TAILLE DU CACHE
   */
  getSize(): { memory: number; storage: number } {
    try {
      const stored = localStorage.getItem(CACHE_CONFIG.STORAGE_KEY);
      const storageSize = stored ? Object.keys(JSON.parse(stored).entries).length : 0;

      return {
        memory: this.memoryCache.size,
        storage: storageSize
      };
    } catch {
      return {
        memory: this.memoryCache.size,
        storage: 0
      };
    }
  }
}

// 🌍 INSTANCE SINGLETON
export const poiCache = new POICacheManager();

/**
 * 🔧 UTILITAIRES POUR LES COMPOSANTS
 */

// Générer un hash pour une recherche
export function createSearchHash(
  query: string,
  location?: { lat: number; lng: number },
  filters?: Record<string, any>
): string {
  return POICacheManager.hashQuery(query, location, filters);
}

// Obtenir les statistiques du cache
export function getCacheStats() {
  return poiCache.getStats();
}

// Nettoyer le cache
export function clearPOICache(): void {
  poiCache.clear();
}

// Obtenir la taille du cache
export function getCacheSize() {
  return poiCache.getSize();
}
