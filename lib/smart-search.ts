/**
 * 🔍 MOTEUR DE RECHERCHE INTELLIGENT - COMME YANGO
 * 
 * Recherche floue, partielle, multi-mots avec scoring
 */

import { KINSHASA_PLACES, type Place } from './kinshasa-places';
import { QUARTIERS_KINSHASA } from './kinshasa-map-data';

export interface SearchResult {
  id: string;
  name: string;
  description: string;
  coordinates: { lat: number; lng: number };
  placeId?: string;
  type: 'recent' | 'favorite' | 'place';
  placeType?: Place['type'];
  distance?: number;
  score?: number; // Score de pertinence
}

/**
 * 🎯 RECHERCHE PRINCIPALE - INTELLIGENTE
 */
export async function smartSearch(
  query: string,
  currentLocation?: { lat: number; lng: number }
): Promise<SearchResult[]> {
  if (!query || query.trim().length < 1) {
    return [];
  }

  const results: SearchResult[] = [];
  
  // Normaliser la requête
  const normalizedQuery = normalizeString(query);
  const queryTokens = tokenize(normalizedQuery);
  
  console.log('🔍 Recherche intelligente:', query);
  console.log('   Tokens:', queryTokens);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 1. RECHERCHER DANS LES LIEUX CONNUS (priorité haute)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  for (const place of KINSHASA_PLACES) {
    const score = calculatePlaceScore(place, normalizedQuery, queryTokens);
    
    if (score > 0) {
      results.push({
        id: place.id,
        name: place.name,
        description: buildPlaceDescription(place),
        coordinates: { lat: place.lat, lng: place.lng },
        type: 'place',
        placeType: place.type,
        score
      });
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 2. RECHERCHER DANS LES QUARTIERS (priorité moyenne)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  for (const quartier of QUARTIERS_KINSHASA) {
    const score = calculateQuartierScore(quartier, normalizedQuery, queryTokens);
    
    if (score > 0) {
      // Éviter les doublons si déjà dans les lieux
      const exists = results.some(r => 
        r.coordinates.lat === quartier.lat && 
        r.coordinates.lng === quartier.lng
      );
      
      if (!exists) {
        results.push({
          id: `quartier-${quartier.nom}`,
          name: quartier.nom,
          description: `Quartier • ${quartier.commune}, Kinshasa`,
          coordinates: { lat: quartier.lat, lng: quartier.lng },
          type: 'place',
          score
        });
      }
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 3. TRIER PAR SCORE (pertinence)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  results.sort((a, b) => {
    // Score principal
    const scoreDiff = (b.score || 0) - (a.score || 0);
    if (scoreDiff !== 0) return scoreDiff;
    
    // Si égalité, trier par distance si disponible
    if (currentLocation && a.coordinates && b.coordinates) {
      const distA = calculateDistance(
        currentLocation.lat,
        currentLocation.lng,
        a.coordinates.lat,
        a.coordinates.lng
      );
      const distB = calculateDistance(
        currentLocation.lat,
        currentLocation.lng,
        b.coordinates.lat,
        b.coordinates.lng
      );
      return distA - distB;
    }
    
    return 0;
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 4. AJOUTER LES DISTANCES
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (currentLocation) {
    for (const result of results) {
      if (result.coordinates) {
        result.distance = calculateDistance(
          currentLocation.lat,
          currentLocation.lng,
          result.coordinates.lat,
          result.coordinates.lng
        );
      }
    }
  }

  // Limiter à 20 résultats (comme Yango)
  const topResults = results.slice(0, 20);
  
  console.log(`✅ ${topResults.length} résultats trouvés`);
  console.log('   Top 3:', topResults.slice(0, 3).map(r => `${r.name} (${r.score})`));
  
  return topResults;
}

/**
 * 🎯 CALCULER LE SCORE D'UN LIEU
 */
function calculatePlaceScore(
  place: Place,
  normalizedQuery: string,
  queryTokens: string[]
): number {
  let score = 0;

  const placeName = normalizeString(place.name);
  const placeDescription = normalizeString(place.description);
  const placeAddress = normalizeString(place.address);
  const placeCommune = normalizeString(place.commune);
  const placeKeywords = place.keywords.map(normalizeString);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SCORE 1000 : Correspondance EXACTE du nom
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (placeName === normalizedQuery) {
    score += 1000;
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SCORE 800 : Le nom COMMENCE par la requête
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (placeName.startsWith(normalizedQuery)) {
    score += 800;
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SCORE 600 : Le nom CONTIENT la requête
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (placeName.includes(normalizedQuery)) {
    score += 600;
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SCORE 500 : Correspondance EXACTE dans les keywords
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  for (const keyword of placeKeywords) {
    if (keyword === normalizedQuery) {
      score += 500;
      break;
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SCORE 400 : TOUS les tokens présents dans les keywords
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const allTokensMatch = queryTokens.every(token => 
    placeKeywords.some(keyword => keyword.includes(token))
  );
  if (allTokensMatch && queryTokens.length > 1) {
    score += 400;
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SCORE 300 : Recherche par tokens individuels
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  for (const token of queryTokens) {
    if (token.length < 2) continue; // Ignorer les tokens trop courts
    
    // Token dans le nom
    if (placeName.includes(token)) {
      score += 150;
    }
    
    // Token dans les keywords
    if (placeKeywords.some(kw => kw.includes(token))) {
      score += 100;
    }
    
    // Token dans la description
    if (placeDescription.includes(token)) {
      score += 50;
    }
    
    // Token dans l'adresse
    if (placeAddress.includes(token)) {
      score += 50;
    }
    
    // Token dans la commune
    if (placeCommune.includes(token)) {
      score += 30;
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // BONUS : Recherche fuzzy (tolérance typos)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (score === 0) {
    for (const keyword of placeKeywords) {
      const similarity = fuzzyMatch(normalizedQuery, keyword);
      if (similarity > 0.7) {
        score += similarity * 200;
      }
    }
  }

  return score;
}

/**
 * 🏘️ CALCULER LE SCORE D'UN QUARTIER
 */
function calculateQuartierScore(
  quartier: { nom: string; commune: string; lat: number; lng: number },
  normalizedQuery: string,
  queryTokens: string[]
): number {
  let score = 0;

  const quartierNom = normalizeString(quartier.nom);
  const quartierCommune = normalizeString(quartier.commune);

  // Correspondance exacte
  if (quartierNom === normalizedQuery) {
    score += 700;
  }

  // Commence par
  if (quartierNom.startsWith(normalizedQuery)) {
    score += 500;
  }

  // Contient
  if (quartierNom.includes(normalizedQuery)) {
    score += 300;
  }

  // Par tokens
  for (const token of queryTokens) {
    if (token.length < 2) continue;
    
    if (quartierNom.includes(token)) {
      score += 100;
    }
    if (quartierCommune.includes(token)) {
      score += 50;
    }
  }

  // Fuzzy match
  if (score === 0) {
    const similarity = fuzzyMatch(normalizedQuery, quartierNom);
    if (similarity > 0.7) {
      score += similarity * 150;
    }
  }

  return score;
}

/**
 * 📋 CONSTRUIRE LA DESCRIPTION D'UN LIEU
 */
function buildPlaceDescription(place: Place): string {
  const parts: string[] = [];
  
  // Type de lieu
  if (place.description) {
    parts.push(place.description);
  }
  
  // Adresse
  if (place.address) {
    parts.push(place.address);
  }
  
  // Commune
  if (place.commune) {
    parts.push(place.commune);
  }
  
  return parts.join(' • ');
}

/**
 * 🧹 NORMALISER UNE CHAÎNE (minuscules, sans accents)
 */
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Supprimer accents
    .replace(/[^a-z0-9\s]/g, ' ') // Garder seulement alphanumériques
    .replace(/\s+/g, ' ') // Espaces multiples → simple
    .trim();
}

/**
 * 🔪 TOKENISER (découper en mots)
 */
function tokenize(str: string): string[] {
  // Mots vides à ignorer (français + courants)
  const stopWords = new Set([
    'le', 'la', 'les', 'un', 'une', 'des', 'de', 'du',
    'et', 'ou', 'a', 'en', 'pour', 'sur', 'dans'
  ]);
  
  return str
    .split(/\s+/)
    .filter(token => token.length > 1 && !stopWords.has(token));
}

/**
 * 🎯 FUZZY MATCH (Levenshtein similarity)
 */
function fuzzyMatch(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  
  if (len1 === 0) return len2 === 0 ? 1 : 0;
  if (len2 === 0) return 0;
  
  // Matrice de distances
  const matrix: number[][] = [];
  
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // Suppression
        matrix[i][j - 1] + 1,      // Insertion
        matrix[i - 1][j - 1] + cost // Substitution
      );
    }
  }
  
  const distance = matrix[len1][len2];
  const maxLen = Math.max(len1, len2);
  
  return 1 - (distance / maxLen);
}

/**
 * 📍 CALCULER LA DISTANCE (Haversine)
 */
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Rayon de la Terre en km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}
