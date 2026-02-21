/**
 * 🌍 SERVICE DE GÉOCODAGE - GOOGLE MAPS
 * 
 * ✅ MIGRATION COMPLÈTE VERS GOOGLE MAPS API
 * Remplace complètement Nominatim (OpenStreetMap)
 * 
 * Fonctionnalités :
 * - Recherche d'adresse en temps réel (Google Places)
 * - Reverse geocoding (Google Geocoding API)
 * - Support complet de Kinshasa, RDC
 * - Cache pour optimiser les performances
 */

import * as GoogleMapsService from './google-maps-service';

export interface GeocodedAddress {
  id: string;
  name: string;
  description: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  type: string;
  importance: number;
}

// Cache simple pour éviter trop de requêtes
const searchCache = new Map<string, GeocodedAddress[]>();
const reverseCache = new Map<string, GeocodedAddress>();

/**
 * 🔍 RECHERCHE D'ADRESSE (Forward Geocoding)
 * Comme quand tu tapes dans Yango : "Avenue Kasa-Vubu"
 */
export async function searchAddress(query: string): Promise<GeocodedAddress[]> {
  if (!query || query.trim().length < 3) {
    return [];
  }

  // Vérifier le cache
  const cacheKey = query.toLowerCase().trim();
  if (searchCache.has(cacheKey)) {
    console.log('🎯 Cache hit pour:', query);
    return searchCache.get(cacheKey)!;
  }

  try {
    console.log('🔍 Google Maps - Recherche d\'adresse:', query);

    const results = await GoogleMapsService.searchPlaces(query);

    console.log(`📍 Google Maps a trouvé ${results.length} résultats pour "${query}"`);

    // Transformer en format SmartCabb
    const addresses: GeocodedAddress[] = results.map((result) => ({
      id: result.id,
      name: result.name,
      description: result.description,
      coordinates: result.coordinates,
      type: result.types?.[0] || 'place',
      importance: result.rating || 1.0
    }));

    // Mettre en cache
    searchCache.set(cacheKey, addresses);

    return addresses;
  } catch (error) {
    console.error('❌ Erreur géocodage Google Maps:', error);
    return [];
  }
}

/**
 * 📍 REVERSE GEOCODING (Coordonnées → Adresse)
 * Quand tu cliques sur la carte dans Yango
 */
export async function reverseGeocode(lat: number, lng: number): Promise<GeocodedAddress | null> {
  // Vérifier le cache
  const cacheKey = `${lat.toFixed(5)},${lng.toFixed(5)}`;
  if (reverseCache.has(cacheKey)) {
    console.log('🎯 Cache hit pour reverse geocoding');
    return reverseCache.get(cacheKey)!;
  }

  try {
    console.log('📍 Google Maps - Reverse Geocoding:', lat, lng);

    const result = await GoogleMapsService.reverseGeocode(lat, lng);

    if (!result) {
      console.error('❌ Aucune adresse trouvée');
      return null;
    }

    console.log('✅ Google Maps reverse geocoding réussi');

    const geocodedAddress: GeocodedAddress = {
      id: result.id,
      name: result.name,
      description: result.description,
      coordinates: result.coordinates,
      type: result.types?.[0] || 'place',
      importance: result.rating || 1.0
    };

    // Mettre en cache
    reverseCache.set(cacheKey, geocodedAddress);

    return geocodedAddress;
  } catch (error) {
    console.error('❌ Erreur reverse geocoding Google Maps:', error);
    return null;
  }
}

/**
 * 🧹 NETTOYER LE CACHE (pour éviter qu'il grossisse trop)
 */
export function clearGeocodingCache() {
  searchCache.clear();
  reverseCache.clear();
  console.log('🧹 Cache de géocodage nettoyé');
}

/**
 * 🔄 SYSTÈME HYBRIDE : Base de données locale + Google Maps
 * Pour avoir des suggestions rapides (base locale) + recherche précise (Google Maps)
 */
export async function hybridSearch(query: string, localResults: any[]): Promise<GeocodedAddress[]> {
  // 1. Utiliser d'abord la base locale (instantané)
  const local = localResults.map((loc, idx) => ({
    id: `local-${idx}`,
    name: loc.nom || loc.name,
    description: `${loc.quartier || loc.commune}, Kinshasa`,
    coordinates: { lat: loc.lat, lng: loc.lng },
    type: 'local',
    importance: 1.0
  }));

  // 2. En parallèle, lancer la recherche Google Maps (plus précis)
  const googleMapsPromise = searchAddress(query);

  // 3. Attendre max 1 seconde pour Google Maps
  const googleMapsResults = await Promise.race([
    googleMapsPromise,
    new Promise<GeocodedAddress[]>(resolve => setTimeout(() => resolve([]), 1000))
  ]);

  // 4. Fusionner les résultats (priorité à Google Maps)
  const combined = [...googleMapsResults];
  
  // Ajouter les résultats locaux qui ne sont pas déjà dans Google Maps
  for (const localItem of local) {
    const alreadyExists = combined.some(gm => 
      Math.abs(gm.coordinates.lat - localItem.coordinates.lat) < 0.001 &&
      Math.abs(gm.coordinates.lng - localItem.coordinates.lng) < 0.001
    );
    
    if (!alreadyExists) {
      combined.push(localItem);
    }
  }

  // 5. Limiter à 10 résultats
  return combined.slice(0, 10);
}
