/**
 * 🗺️ Service de Géocodage Inverse (Reverse Geocoding)
 * Convertit les coordonnées GPS en adresse lisible
 * Utilise l'API Nominatim (OpenStreetMap) - gratuite, pas de clé API requise
 */

interface GeocodingResult {
  suburb?: string;      // Quartier (ex: Matete, Gombe)
  city_district?: string; // Commune
  city?: string;        // Ville (ex: Kinshasa)
  county?: string;      // Territoire
  state?: string;       // Province
  country?: string;     // Pays
}

interface ReverseGeocodeResponse {
  address?: GeocodingResult;
  display_name?: string;
  error?: string;
}

/**
 * Convertit des coordonnées GPS en nom de lieu lisible
 * @param lat Latitude
 * @param lng Longitude
 * @returns Nom du lieu (quartier, commune ou ville)
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
      return 'Position GPS activée';
    }

    // Coordonnées hors RDC → retourner fallback immédiatement
    const isInRDC = lat >= -13.5 && lat <= 5.5 && lng >= 12.0 && lng <= 31.5;
    if (!isInRDC) {
      console.warn(`⚠️ Coordonnées hors RDC: ${lat}, ${lng}`);
      return 'Kinshasa, RDC';
    }

    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'SmartCabb-RDC/1.0'
      }
    });

    if (!response.ok) return 'Position GPS activée';

    const data: ReverseGeocodeResponse = await response.json();
    if (data.error) return 'Position GPS activée';

    const address = data.address;
    if (!address) return 'Position GPS activée';

    return address.suburb || address.city_district || address.city || address.county || 'Kinshasa, RDC';

  } catch (error) {
    console.error('❌ Erreur reverse geocoding:', error);
    return 'Position GPS activée';
  }
}

/**
 * Cache pour éviter trop de requêtes à l'API
 * Format: "lat,lng" => "Nom du lieu"
 */
const geocodingCache = new Map<string, { name: string; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Version avec cache pour optimiser les appels API
 */
export async function reverseGeocodeWithCache(lat: number, lng: number): Promise<string> {
  // Arrondir à 4 décimales pour le cache (environ 11m de précision)
  const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  
  // Vérifier le cache
  const cached = geocodingCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log('📦 Lieu depuis cache:', cached.name);
    return cached.name;
  }
  
  // Appeler l'API
  const locationName = await reverseGeocode(lat, lng);
  
  // Mettre en cache
  geocodingCache.set(cacheKey, {
    name: locationName,
    timestamp: Date.now()
  });
  
  return locationName;
}

/**
 * Convertit une adresse en coordonnées GPS (Geocoding direct)
 * @param address Adresse textuelle
 * @returns Coordonnées GPS { lat, lng }
 */
export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    console.log('🔍 Geocoding:', address);
    
    if (!address || address.trim() === '') {
      return null;
    }
    
    // Ajouter "Kinshasa, RDC" si pas déjà présent
    const searchAddress = address.toLowerCase().includes('kinshasa') 
      ? address 
      : `${address}, Kinshasa, RDC`;
    
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchAddress)}&limit=1`;
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'SmartCabb-RDC/1.0'
      }
    });
    
    if (!response.ok) {
      console.warn('⚠️ Erreur API Nominatim:', response.status);
      return null;
    }
    
    const data = await response.json();
    
    if (!data || data.length === 0) {
      console.warn('⚠️ Aucun résultat pour:', address);
      return null;
    }
    
    const result = data[0];
    const coords = {
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon)
    };
    
    console.log('✅ Coordonnées trouvées:', coords);
    return coords;
    
  } catch (error) {
    console.error('❌ Erreur geocoding:', error);
    return null;
  }
}
