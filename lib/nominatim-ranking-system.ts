/**
 * 🧠 SYSTÈME DE RANKING INTELLIGENT POUR NOMINATIM
 * 
 * Algorithme de scoring avancé pour prioriser les résultats de recherche
 * Inspiré des systèmes de Uber, Yango, Bolt
 * 
 * Critères de scoring :
 * - Distance par rapport à l'utilisateur
 * - Importance du lieu (popularité OSM)
 * - Pertinence du nom par rapport à la requête
 * - Type de lieu (priorité aux lieux publics importants)
 * - Historique des recherches de l'utilisateur
 * - Qualité des données (présence de métadonnées)
 */

import type { EnrichedPlace } from './nominatim-enriched-service';

// ⚖️ POIDS DES CRITÈRES
const SCORING_WEIGHTS = {
  DISTANCE: 0.35,        // 35% - Proximité très importante
  IMPORTANCE: 0.25,      // 25% - Popularité du lieu
  NAME_RELEVANCE: 0.20,  // 20% - Pertinence du nom
  PLACE_TYPE: 0.10,      // 10% - Type de lieu
  METADATA_QUALITY: 0.05, // 5% - Qualité des données
  USER_HISTORY: 0.05     // 5% - Historique utilisateur
};

// 🏆 PRIORITÉS DES TYPES DE LIEUX
const PLACE_TYPE_PRIORITY = {
  // Transport (haute priorité)
  'Transport': 100,
  'Aéroport': 95,
  'Terminus': 90,
  'Gare': 85,
  
  // Services essentiels
  'Santé': 80,
  'Hôpital': 80,
  'Urgences': 85,
  
  // Services publics
  'Gouvernement': 75,
  'Ambassade': 75,
  'Police': 70,
  
  // Commerce
  'Commerce': 65,
  'Supermarché': 70,
  'Centre commercial': 75,
  
  // Restauration
  'Restaurant': 60,
  'Café': 55,
  'Bar': 50,
  
  // Hébergement
  'Hôtel': 70,
  'Auberge': 60,
  
  // Éducation
  'Éducation': 65,
  'Université': 70,
  'École': 60,
  
  // Banque
  'Banque': 65,
  'ATM': 55,
  
  // Autres
  'Tourisme': 55,
  'Loisirs': 50,
  'Service': 45,
  'Autre': 30
};

// 📊 INTERFACE DE RÉSULTAT AVEC SCORE
export interface ScoredPlace extends EnrichedPlace {
  score: number;
  scoreBreakdown?: {
    distance: number;
    importance: number;
    nameRelevance: number;
    placeType: number;
    metadataQuality: number;
    userHistory: number;
  };
}

/**
 * 🎯 CALCULER LE SCORE D'UN LIEU
 */
export function calculatePlaceScore(
  place: EnrichedPlace,
  query: string,
  userLocation?: { lat: number; lng: number },
  userHistory?: string[]
): ScoredPlace {
  
  // 1️⃣ SCORE DE DISTANCE
  let distanceScore = 0;
  if (place.distance !== undefined) {
    // Plus proche = meilleur score
    // 0km = 100, 5km = 50, 10km = 25, 20km+ = 0
    if (place.distance <= 1) distanceScore = 100;
    else if (place.distance <= 5) distanceScore = 80 - (place.distance - 1) * 10;
    else if (place.distance <= 10) distanceScore = 40 - (place.distance - 5) * 6;
    else if (place.distance <= 20) distanceScore = 10 - (place.distance - 10) * 1;
    else distanceScore = 0;
  } else {
    // Pas de distance = score moyen
    distanceScore = 50;
  }

  // 2️⃣ SCORE D'IMPORTANCE (basé sur OSM)
  let importanceScore = 0;
  if (place.importance !== undefined) {
    // Importance OSM est entre 0 et 1, on convertit en 0-100
    importanceScore = Math.min(100, place.importance * 100);
  } else {
    importanceScore = 30; // Score par défaut
  }

  // 3️⃣ SCORE DE PERTINENCE DU NOM
  const nameRelevanceScore = calculateNameRelevance(place.name, query);

  // 4️⃣ SCORE DU TYPE DE LIEU
  const placeTypeScore = PLACE_TYPE_PRIORITY[place.category] || 30;

  // 5️⃣ SCORE DE QUALITÉ DES MÉTADONNÉES
  let metadataScore = 0;
  if (place.metadata) {
    if (place.metadata.phone) metadataScore += 25;
    if (place.metadata.hours) metadataScore += 25;
    if (place.metadata.website) metadataScore += 25;
    if (place.metadata.cuisine) metadataScore += 25;
  }

  // 6️⃣ SCORE D'HISTORIQUE UTILISATEUR
  let historyScore = 0;
  if (userHistory && userHistory.includes(place.id)) {
    historyScore = 100; // Bonus pour les lieux déjà visités
  }

  // 📊 CALCUL DU SCORE FINAL (moyenne pondérée)
  const finalScore = 
    (distanceScore * SCORING_WEIGHTS.DISTANCE) +
    (importanceScore * SCORING_WEIGHTS.IMPORTANCE) +
    (nameRelevanceScore * SCORING_WEIGHTS.NAME_RELEVANCE) +
    (placeTypeScore * SCORING_WEIGHTS.PLACE_TYPE) +
    (metadataScore * SCORING_WEIGHTS.METADATA_QUALITY) +
    (historyScore * SCORING_WEIGHTS.USER_HISTORY);

  return {
    ...place,
    score: Math.round(finalScore * 10) / 10,
    scoreBreakdown: {
      distance: Math.round(distanceScore * 10) / 10,
      importance: Math.round(importanceScore * 10) / 10,
      nameRelevance: Math.round(nameRelevanceScore * 10) / 10,
      placeType: placeTypeScore,
      metadataQuality: metadataScore,
      userHistory: historyScore
    }
  };
}

/**
 * 🔍 CALCULER LA PERTINENCE DU NOM
 */
function calculateNameRelevance(placeName: string, query: string): number {
  const normalizedPlace = placeName.toLowerCase().trim();
  const normalizedQuery = query.toLowerCase().trim();

  // 1. Correspondance exacte = 100
  if (normalizedPlace === normalizedQuery) {
    return 100;
  }

  // 2. Commence par la requête = 90
  if (normalizedPlace.startsWith(normalizedQuery)) {
    return 90;
  }

  // 3. Contient la requête = 70-80 selon position
  const index = normalizedPlace.indexOf(normalizedQuery);
  if (index !== -1) {
    // Plus tôt dans le nom = meilleur score
    const positionRatio = 1 - (index / normalizedPlace.length);
    return 70 + (positionRatio * 10);
  }

  // 4. Correspondance de mots individuels
  const placeWords = normalizedPlace.split(/\s+/);
  const queryWords = normalizedQuery.split(/\s+/);
  
  let matchingWords = 0;
  for (const queryWord of queryWords) {
    for (const placeWord of placeWords) {
      if (placeWord.includes(queryWord) || queryWord.includes(placeWord)) {
        matchingWords++;
        break;
      }
    }
  }

  if (matchingWords > 0) {
    const matchRatio = matchingWords / queryWords.length;
    return 40 + (matchRatio * 30);
  }

  // 5. Similarité de Levenshtein (pour fautes de frappe)
  const similarity = calculateLevenshteinSimilarity(normalizedPlace, normalizedQuery);
  if (similarity > 0.7) {
    return similarity * 60;
  }

  // Aucune correspondance
  return 10;
}

/**
 * 📏 CALCULER LA SIMILARITÉ DE LEVENSHTEIN
 */
function calculateLevenshteinSimilarity(str1: string, str2: string): number {
  const distance = levenshteinDistance(str1, str2);
  const maxLength = Math.max(str1.length, str2.length);
  
  if (maxLength === 0) return 1;
  
  return 1 - (distance / maxLength);
}

/**
 * 🔢 DISTANCE DE LEVENSHTEIN
 */
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,    // deletion
          dp[i][j - 1] + 1,    // insertion
          dp[i - 1][j - 1] + 1 // substitution
        );
      }
    }
  }

  return dp[m][n];
}

/**
 * 🏆 TRIER LES LIEUX PAR SCORE
 */
export function rankPlaces(
  places: EnrichedPlace[],
  query: string,
  userLocation?: { lat: number; lng: number },
  userHistory?: string[]
): ScoredPlace[] {
  
  console.log(`🧠 Ranking de ${places.length} lieux pour "${query}"`);

  // Calculer les scores
  const scoredPlaces = places.map(place => 
    calculatePlaceScore(place, query, userLocation, userHistory)
  );

  // Trier par score décroissant
  const sorted = scoredPlaces.sort((a, b) => b.score - a.score);

  // Afficher le top 5 dans les logs
  if (sorted.length > 0) {
    console.log('🏆 Top 5 résultats :');
    sorted.slice(0, 5).forEach((place, index) => {
      console.log(`  ${index + 1}. ${place.name} - Score: ${place.score}`);
      if (place.scoreBreakdown) {
        console.log(`     → Distance: ${place.scoreBreakdown.distance}, Importance: ${place.scoreBreakdown.importance}, Nom: ${place.scoreBreakdown.nameRelevance}`);
      }
    });
  }

  return sorted;
}

/**
 * 🎯 FILTRER PAR SCORE MINIMUM
 */
export function filterByMinScore(
  places: ScoredPlace[],
  minScore: number = 30
): ScoredPlace[] {
  return places.filter(place => place.score >= minScore);
}

/**
 * 📊 OBTENIR LES STATISTIQUES DE SCORING
 */
export function getScoringStats(places: ScoredPlace[]): {
  avgScore: number;
  maxScore: number;
  minScore: number;
  distribution: { range: string; count: number }[];
} {
  if (places.length === 0) {
    return {
      avgScore: 0,
      maxScore: 0,
      minScore: 0,
      distribution: []
    };
  }

  const scores = places.map(p => p.score);
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  const maxScore = Math.max(...scores);
  const minScore = Math.min(...scores);

  // Distribution par tranches
  const distribution = [
    { range: '0-20', count: scores.filter(s => s < 20).length },
    { range: '20-40', count: scores.filter(s => s >= 20 && s < 40).length },
    { range: '40-60', count: scores.filter(s => s >= 40 && s < 60).length },
    { range: '60-80', count: scores.filter(s => s >= 60 && s < 80).length },
    { range: '80-100', count: scores.filter(s => s >= 80).length }
  ];

  return {
    avgScore: Math.round(avgScore * 10) / 10,
    maxScore,
    minScore,
    distribution
  };
}

/**
 * 🔄 APPLIQUER DES BOOST CONTEXTUELS
 */
export function applyContextualBoosts(
  places: ScoredPlace[],
  context?: {
    timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
    dayOfWeek?: 'weekday' | 'weekend';
    weather?: 'sunny' | 'rainy';
  }
): ScoredPlace[] {
  
  if (!context) return places;

  return places.map(place => {
    let boost = 0;

    // Boost selon l'heure
    if (context.timeOfDay === 'morning') {
      if (place.category === 'Restaurant' && place.name.toLowerCase().includes('café')) {
        boost += 10; // Boost cafés le matin
      }
    } else if (context.timeOfDay === 'evening') {
      if (place.category === 'Restaurant' || place.name.toLowerCase().includes('bar')) {
        boost += 10; // Boost restaurants/bars le soir
      }
    }

    // Boost selon la météo
    if (context.weather === 'rainy') {
      if (place.category === 'Commerce' && place.name.toLowerCase().includes('mall')) {
        boost += 15; // Boost centres commerciaux sous la pluie
      }
    }

    return {
      ...place,
      score: place.score + boost
    };
  }).sort((a, b) => b.score - a.score);
}
