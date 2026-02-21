/**
 * 🧠 ALGORITHME DE RANKING INTELLIGENT - COMME UBER/YANGO
 * 
 * Classe les suggestions selon plusieurs critères :
 * - **PERTINENCE DU NOM (40%)** ← PRIORITAIRE !
 * - **SOURCE (30%)** ← Base locale prioritaire
 * - Distance (20%)
 * - Popularité (7%)
 * - Historique utilisateur (3%)
 */

export interface SearchResult {
  id: string;
  name: string;
  description: string;
  coordinates: { lat: number; lng: number };
  placeType?: string;
  distance?: number;
  source?: 'local' | 'nominatim' | 'hybrid'; // 🆕 Source du résultat
  
  // Métadonnées de ranking
  score?: number;
  relevanceScore?: number;
  sourceScore?: number; // 🆕 Score de source
  distanceScore?: number;
  popularityScore?: number;
  contextScore?: number;
  historyScore?: number;
}

export interface RankingContext {
  userLocation?: { lat: number; lng: number };
  currentHour?: number;
  recentSearches?: string[];
  favoriteLocations?: string[];
  query?: string; // ← ESSENTIEL pour la pertinence !
}

/**
 * 🎯 RANKER PRINCIPAL
 */
export class SearchRanker {
  
  static rank(
    results: SearchResult[],
    context: RankingContext = {}
  ): SearchResult[] {
    
    const scored = results.map(result => {
      const score = this.calculateScore(result, context);
      
      return {
        ...result,
        score,
        relevanceScore: this.getRelevanceScore(result, context.query),
        sourceScore: this.getSourceScore(result), // 🆕
        distanceScore: this.getDistanceScore(result.distance),
        popularityScore: this.getPopularityScore(result),
        contextScore: this.getContextScore(result, context.currentHour),
        historyScore: this.getHistoryScore(result, context)
      };
    });
    
    // Trier par score décroissant
    scored.sort((a, b) => (b.score || 0) - (a.score || 0));
    
    return scored;
  }
  
  /**
   * 🧮 CALCULER LE SCORE TOTAL
   * 
   * NOUVELLE PONDÉRATION (avec base locale) :
   * - Pertinence nom : 40% (PRIORITAIRE!)
   * - Source : 30% (Base locale = meilleur score)
   * - Distance : 20%
   * - Popularité : 7%
   * - Historique : 3%
   */
  private static calculateScore(
    result: SearchResult,
    context: RankingContext
  ): number {
    let score = 0;
    
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 🔍 PERTINENCE DU NOM (40% du score) - PRIORITAIRE !
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const relevanceScore = this.getRelevanceScore(result, context.query);
    score += relevanceScore * 0.40;
    
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 🗄️ SOURCE (30% du score) - Base locale prioritaire
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const sourceScore = this.getSourceScore(result);
    score += sourceScore * 0.30;
    
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 📏 DISTANCE (20% du score)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const distanceScore = this.getDistanceScore(result.distance);
    score += distanceScore * 0.20;
    
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // ⭐ POPULARITÉ (7% du score)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const popularityScore = this.getPopularityScore(result);
    score += popularityScore * 0.07;
    
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 📚 HISTORIQUE UTILISATEUR (3% du score)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const historyScore = this.getHistoryScore(result, context);
    score += historyScore * 0.03;
    
    return score;
  }
  
  /**
   * 🗄️ SCORE DE SOURCE - PRIVILÉGIER LA BASE LOCALE
   * 
   * Les résultats de la base locale sont plus fiables car vérifiés manuellement
   */
  private static getSourceScore(result: SearchResult): number {
    if (!result.source) return 50; // Score neutre
    
    switch (result.source) {
      case 'local':
        // Base locale = données vérifiées et riches
        return 100;
        
      case 'nominatim':
        // OpenStreetMap = données complètes mais moins riches
        return 70;
        
      case 'hybrid':
        // Mix des deux
        return 85;
        
      default:
        return 50;
    }
  }
  
  /**
   * 🔍 SCORE DE PERTINENCE DU NOM - ALGORITHME AMÉLIORÉ
   * 
   * Compare le nom du lieu avec la requête de recherche
   */
  private static getRelevanceScore(
    result: SearchResult,
    query?: string
  ): number {
    if (!query || query.trim().length === 0) {
      return 50; // Score neutre si pas de requête
    }
    
    const name = result.name.toLowerCase().trim();
    const description = result.description.toLowerCase().trim();
    const queryLower = query.toLowerCase().trim();
    
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 1️⃣ CORRESPONDANCE EXACTE DU NOM = 100 points
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (name === queryLower) {
      console.log(`🎯 Correspondance exacte: "${result.name}"`);
      return 100;
    }
    
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 2️⃣ NOM COMMENCE PAR LA REQUÊTE = 95 points
    // Exemple: "UPN" → "UPN Kinshasa"
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (name.startsWith(queryLower)) {
      console.log(`🎯 Nom commence par: "${result.name}"`);
      return 95;
    }
    
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 3️⃣ NOM CONTIENT LA REQUÊTE = 85 points
    // Exemple: "UPN" → "Université Pédagogique Nationale (UPN)"
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (name.includes(queryLower)) {
      console.log(`🎯 Nom contient: "${result.name}"`);
      return 85;
    }
    
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 4️⃣ MOT DU NOM COMMENCE PAR LA REQUÊTE = 80 points
    // Exemple: "université" → "Université Pédagogique"
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const nameWords = name.split(/\s+/);
    for (const word of nameWords) {
      if (word.startsWith(queryLower)) {
        console.log(`🎯 Mot commence par: "${result.name}" (mot: "${word}")`);
        return 80;
      }
    }
    
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 5️⃣ ACRONYME MATCH = 75 points
    // Exemple: "UPN" → "Université Pédagogique Nationale"
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const acronym = nameWords
      .filter(word => word.length > 2) // Ignorer les petits mots (de, la, etc.)
      .map(word => word[0])
      .join('');
    
    if (acronym.toLowerCase() === queryLower) {
      console.log(`🎯 Acronyme match: "${result.name}" (${acronym})`);
      return 75;
    }
    
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 6️⃣ DESCRIPTION CONTIENT LA REQUÊTE = 40 points
    // Exemple: "UPN" dans "Avenue de Binza UPN"
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (description.includes(queryLower)) {
      console.log(`⚠️ Description contient: "${result.name}" (${result.description})`);
      return 40;
    }
    
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 7️⃣ SIMILARITÉ PARTIELLE = 20-30 points
    // Utilise la distance de Levenshtein
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const similarity = this.calculateSimilarity(name, queryLower);
    if (similarity > 0.7) {
      console.log(`⚠️ Similarité partielle: "${result.name}" (${(similarity * 100).toFixed(0)}%)`);
      return 20 + (similarity * 10);
    }
    
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 8️⃣ PAS DE CORRESPONDANCE = 10 points
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log(`❌ Pas de correspondance: "${result.name}"`);
    return 10;
  }
  
  /**
   * 📏 CALCULER LA SIMILARITÉ ENTRE DEUX CHAÎNES
   * Utilise la distance de Levenshtein
   */
  private static calculateSimilarity(str1: string, str2: string): number {
    const distance = this.levenshteinDistance(str1, str2);
    const maxLength = Math.max(str1.length, str2.length);
    
    if (maxLength === 0) return 1;
    
    return 1 - (distance / maxLength);
  }
  
  /**
   * 📐 DISTANCE DE LEVENSHTEIN
   */
  private static levenshteinDistance(str1: string, str2: string): number {
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
            dp[i - 1][j] + 1,
            dp[i][j - 1] + 1,
            dp[i - 1][j - 1] + 1
          );
        }
      }
    }

    return dp[m][n];
  }
  
  /**
   * 📏 SCORE DE DISTANCE
   */
  private static getDistanceScore(distance?: number): number {
    if (!distance) return 50;
    
    if (distance <= 0.5) return 100;
    if (distance <= 1) return 90;
    if (distance <= 2) return 75;
    if (distance <= 3) return 60;
    if (distance <= 5) return 45;
    if (distance <= 10) return 30;
    return 15;
  }
  
  /**
   * ⭐ SCORE DE POPULARITÉ
   */
  private static getPopularityScore(result: SearchResult): number {
    const type = result.placeType?.toLowerCase() || '';
    const name = result.name.toLowerCase();
    
    if (type === 'terminal' || name.includes('terminus')) return 100;
    if (type === 'airport' || name.includes('aéroport')) return 95;
    if (type === 'station' || name.includes('gare')) return 90;
    if (type === 'market' || name.includes('marché')) return 85;
    if (type === 'mall' || name.includes('centre commercial')) return 80;
    if (type === 'hospital' || name.includes('hôpital')) return 80;
    if (type === 'school' || name.includes('école') || name.includes('université')) return 75;
    if (type === 'hotel' || name.includes('hôtel')) return 75;
    if (type === 'restaurant') return 70;
    if (type === 'bank' || name.includes('banque')) return 70;
    if (type === 'church' || name.includes('église')) return 65;
    
    return 50;
  }
  
  /**
   * 🕐 SCORE CONTEXTUEL
   */
  private static getContextScore(
    result: SearchResult,
    currentHour?: number
  ): number {
    if (currentHour === undefined) return 50;
    
    const type = result.placeType?.toLowerCase() || '';
    const name = result.name.toLowerCase();
    
    // Matin (6h-9h)
    if (currentHour >= 6 && currentHour < 9) {
      if (type === 'school' || name.includes('école')) return 90;
      if (type === 'office') return 90;
      if (type === 'restaurant') return 40;
    }
    
    // Midi (12h-14h)
    if (currentHour >= 12 && currentHour < 14) {
      if (type === 'restaurant' || name.includes('restaurant')) return 95;
      if (name.includes('café')) return 90;
    }
    
    // Soir (17h-20h)
    if (currentHour >= 17 && currentHour < 20) {
      if (type === 'terminal' || name.includes('terminus')) return 90;
      if (type === 'market' || name.includes('marché')) return 80;
    }
    
    // Nuit (21h-5h)
    if (currentHour >= 21 || currentHour < 6) {
      if (type === 'hotel' || name.includes('hôtel')) return 95;
      if (type === 'hospital' || name.includes('hôpital')) return 85;
      if (type === 'school') return 20;
    }
    
    return 50;
  }
  
  /**
   * 📚 SCORE D'HISTORIQUE
   */
  private static getHistoryScore(
    result: SearchResult,
    context: RankingContext
  ): number {
    let score = 0;
    
    if (context.favoriteLocations?.includes(result.id)) {
      score += 100;
    }
    
    if (context.recentSearches?.includes(result.id)) {
      score += 70;
    }
    
    return Math.min(score, 100);
  }
}

/**
 * 🎯 HELPER : RANK RAPIDE
 */
export function rankSearchResults(
  results: SearchResult[],
  userLocation?: { lat: number; lng: number },
  recentSearches?: string[],
  favoriteLocations?: string[],
  query?: string
): SearchResult[] {
  
  const currentHour = new Date().getHours();
  
  return SearchRanker.rank(results, {
    userLocation,
    currentHour,
    recentSearches,
    favoriteLocations,
    query // ← ESSENTIEL !
  });
}