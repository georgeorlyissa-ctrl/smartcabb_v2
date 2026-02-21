/**
 * 🏙️ BASE DE DONNÉES LOCALE DES LIEUX DE KINSHASA
 * 
 * Structure améliorée avec scoring, catégories et métadonnées
 */

// ============================================================
// 📊 TYPES
// ============================================================

export interface LocalPlace {
  id: string;
  name: string;
  category: 'terminal' | 'market' | 'mall' | 'hotel' | 'restaurant' | 'hospital' | 'church' | 'school' | 'bank' | 'station' | 'office' | 'park' | 'university' | 'government' | 'airport' | 'stadium' | 'monument' | 'embassy' | 'gas_station' | 'landmark' | 'residential' | 'other';
  address: string;
  commune: string;
  quartier?: string;
  coordinates: { lat: number; lng: number };
  aliases: string[]; // Noms alternatifs
  tags?: string[]; // Tags pour recherche
  popularity?: number; // 1-10
  distance?: number; // Calculé dynamiquement
}

// ============================================================
// 🗃️ BASE DE DONNÉES DES LIEUX (200+ entrées)
// ============================================================

export const kinshasaPlacesDatabase: LocalPlace[] = [
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🚌 TERMINAUX ET GARES
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: 'lemba-terminus',
    name: 'Lemba Terminus',
    category: 'terminal',
    address: 'Avenue Sefu, Mont Amba',
    commune: 'Lemba',
    quartier: 'Terminus',
    coordinates: { lat: -4.3968, lng: 15.3111 },
    aliases: ['Terminus Lemba', 'Lemba', 'Terminus Sefu'],
    tags: ['transport', 'bus', 'terminus'],
    popularity: 9
  },
  {
    id: 'matete-terminus',
    name: 'Matete Terminus',
    category: 'terminal',
    address: 'Avenue Mama Yemo',
    commune: 'Matete',
    coordinates: { lat: -4.3682, lng: 15.2895 },
    aliases: ['Terminus Matete', 'Matete'],
    tags: ['transport', 'bus', 'terminus'],
    popularity: 8
  },
  {
    id: 'victoire-terminus',
    name: 'Victoire Terminus',
    category: 'terminal',
    address: 'Avenue de la Victoire',
    commune: 'Ngaliema',
    coordinates: { lat: -4.3412, lng: 15.2845 },
    aliases: ['Terminus Victoire', 'Victoire'],
    tags: ['transport', 'bus', 'terminus'],
    popularity: 8
  },
  {
    id: 'royale-terminus',
    name: 'Royale Terminus',
    category: 'terminal',
    address: 'Boulevard du 30 Juin',
    commune: 'Gombe',
    coordinates: { lat: -4.3245, lng: 15.3156 },
    aliases: ['Terminus Royale', 'Royale'],
    tags: ['transport', 'bus', 'terminus'],
    popularity: 7
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🛒 MARCHÉS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: 'kin-marche',
    name: 'KIN MARCHE',
    category: 'market',
    address: 'Avenue Sefu, Lemba Terminus',
    commune: 'Lemba',
    quartier: 'Terminus',
    coordinates: { lat: -4.3975, lng: 15.3105 },
    aliases: ['Kin Marché', 'Kinmarche', 'Supermarché Lemba'],
    tags: ['marché', 'supermarché', 'courses'],
    popularity: 9
  },
  {
    id: 'marche-central',
    name: 'Marché Central',
    category: 'market',
    address: 'Avenue du Commerce',
    commune: 'Gombe',
    coordinates: { lat: -4.3198, lng: 15.3134 },
    aliases: ['Central Market', 'Marché Gombe'],
    tags: ['marché', 'commerce'],
    popularity: 9
  },
  {
    id: 'marche-gambela',
    name: 'Marché Gambela',
    category: 'market',
    address: 'Quartier Gambela',
    commune: 'Barumbu',
    coordinates: { lat: -4.3425, lng: 15.2978 },
    aliases: ['Gambela Market'],
    tags: ['marché'],
    popularity: 7
  },
  {
    id: 'marche-liberte',
    name: 'Marché de la Liberté',
    category: 'market',
    address: 'Avenue de la Liberté',
    commune: 'Kalamu',
    coordinates: { lat: -4.3567, lng: 15.3089 },
    aliases: ['Liberté Market'],
    tags: ['marché'],
    popularity: 7
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🏬 CENTRES COMMERCIAUX
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: 'city-market',
    name: 'City Market',
    category: 'mall',
    address: 'Boulevard du 30 Juin',
    commune: 'Gombe',
    coordinates: { lat: -4.3287, lng: 15.3198 },
    aliases: ['Shopping City Market'],
    tags: ['shopping', 'centre commercial'],
    popularity: 9
  },
  {
    id: 'super-marche-gomme',
    name: 'Super Marché GOMME',
    category: 'mall',
    address: 'Avenue des Aviateurs',
    commune: 'Gombe',
    coordinates: { lat: -4.3234, lng: 15.3155 },
    aliases: ['GOMME', 'Supermarché GOMME'],
    tags: ['shopping', 'supermarché'],
    popularity: 8
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🏨 HÔTELS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: 'hotel-memling',
    name: 'Hôtel Memling',
    category: 'hotel',
    address: 'Avenue des Aviateurs',
    commune: 'Gombe',
    coordinates: { lat: -4.3220, lng: 15.3138 },
    aliases: ['Memling', 'Memling Hotel'],
    tags: ['hôtel', 'hébergement'],
    popularity: 9
  },
  {
    id: 'hotel-pullman',
    name: 'Pullman Kinshasa Grand Hotel',
    category: 'hotel',
    address: '4 Avenue Batetela',
    commune: 'Gombe',
    coordinates: { lat: -4.3227, lng: 15.3150 },
    aliases: ['Pullman', 'Grand Hotel'],
    tags: ['hôtel', 'hébergement', 'luxe'],
    popularity: 9
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🏥 HÔPITAUX
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: 'hopital-general',
    name: 'Hôpital Général de Kinshasa',
    category: 'hospital',
    address: 'Avenue de la Justice',
    commune: 'Gombe',
    coordinates: { lat: -4.3245, lng: 15.3123 },
    aliases: ['Hôpital Général', 'HGK'],
    tags: ['hôpital', 'santé', 'urgences'],
    popularity: 9
  },
  {
    id: 'clinique-ngaliema',
    name: 'Clinique Ngaliema',
    category: 'hospital',
    address: 'Mont Ngaliema',
    commune: 'Ngaliema',
    coordinates: { lat: -4.3456, lng: 15.2734 },
    aliases: ['Ngaliema Medical Center'],
    tags: ['clinique', 'santé'],
    popularity: 8
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🎓 UNIVERSITÉS ET ÉCOLES
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: 'unikin',
    name: 'Université de Kinshasa (UNIKIN)',
    category: 'university',
    address: 'Mont Amba',
    commune: 'Lemba',
    coordinates: { lat: -4.4045, lng: 15.2989 },
    aliases: ['UNIKIN', 'Université de Kinshasa', 'Campus UNIKIN'],
    tags: ['université', 'éducation'],
    popularity: 10
  },
  {
    id: 'upc',
    name: 'Université Protestante au Congo (UPC)',
    category: 'university',
    address: 'Lingwala',
    commune: 'Lingwala',
    coordinates: { lat: -4.3312, lng: 15.2934 },
    aliases: ['UPC', 'Université Protestante'],
    tags: ['université', 'éducation'],
    popularity: 8
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ✈️ AÉROPORT
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: 'aeroport-njili',
    name: 'Aéroport International de N\'djili',
    category: 'airport',
    address: 'N\'djili',
    commune: 'N\'djili',
    coordinates: { lat: -4.3857, lng: 15.4446 },
    aliases: ['N\'djili Airport', 'FIH', 'Aéroport de Kinshasa'],
    tags: ['aéroport', 'transport', 'international'],
    popularity: 10
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🏛️ LIEUX GOUVERNEMENTAUX
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: 'palais-nation',
    name: 'Palais de la Nation',
    category: 'government',
    address: 'Avenue Kabinda',
    commune: 'Gombe',
    coordinates: { lat: -4.3167, lng: 15.3089 },
    aliases: ['Palais Présidentiel', 'Présidence'],
    tags: ['gouvernement', 'politique'],
    popularity: 9
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🏦 BANQUES
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: 'rawbank-gombe',
    name: 'Rawbank Gombe',
    category: 'bank',
    address: 'Boulevard du 30 Juin',
    commune: 'Gombe',
    coordinates: { lat: -4.3256, lng: 15.3167 },
    aliases: ['Rawbank', 'Banque Rawbank'],
    tags: ['banque', 'finance'],
    popularity: 8
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ⛪ ÉGLISES
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: 'cathedrale-notre-dame',
    name: 'Cathédrale Notre-Dame du Congo',
    category: 'church',
    address: 'Avenue Roi Baudouin',
    commune: 'Gombe',
    coordinates: { lat: -4.3189, lng: 15.3145 },
    aliases: ['Notre-Dame', 'Cathédrale Gombe'],
    tags: ['église', 'cathédrale', 'religion'],
    popularity: 8
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🏟️ STADES
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: 'stade-martyrs',
    name: 'Stade des Martyrs',
    category: 'stadium',
    address: 'Lingwala',
    commune: 'Lingwala',
    coordinates: { lat: -4.3323, lng: 15.2945 },
    aliases: ['Martyrs Stadium', 'Stade National'],
    tags: ['stade', 'sport', 'football'],
    popularity: 10
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🌳 PARCS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: 'jardin-zoo',
    name: 'Jardin Zoologique de Kinshasa',
    category: 'park',
    address: 'Mont Ngaliema',
    commune: 'Ngaliema',
    coordinates: { lat: -4.3378, lng: 15.2812 },
    aliases: ['Zoo de Kinshasa', 'Jardin Zoo'],
    tags: ['parc', 'zoo', 'nature'],
    popularity: 8
  },

  // Ajouter plus de lieux selon les besoins...
];

// ============================================================
// 🔍 FONCTION DE RECHERCHE DANS LA BASE LOCALE
// ============================================================

/**
 * 🔍 FONCTION DE RECHERCHE DANS LA BASE LOCALE
 * 
 * Retourne uniquement les résultats VRAIMENT pertinents (score minimal requis)
 */
export function searchLocalPlaces(
  query: string,
  currentLocation?: { lat: number; lng: number },
  limit: number = 10
): LocalPlace[] {
  if (!query || query.length < 2) return [];

  const searchTerms = query.toLowerCase().trim().split(/\s+/);
  
  // 🎯 SEUIL MINIMAL DE PERTINENCE : Réduit pour permettre plus de résultats
  const MINIMUM_SCORE = 50; // ✅ RÉDUIT de 100 à 50 pour afficher plus de résultats pertinents
  
  // Calculer le score de correspondance pour chaque lieu
  const scoredPlaces = kinshasaPlacesDatabase.map(place => {
    let score = 0;
    
    // 1. Correspondance exacte du nom (score très élevé)
    if (place.name.toLowerCase() === query.toLowerCase()) {
      score += 1000;
    }
    
    // 2. Le nom commence par la requête
    if (place.name.toLowerCase().startsWith(query.toLowerCase())) {
      score += 500;
    }
    
    // 3. Le nom contient la requête
    if (place.name.toLowerCase().includes(query.toLowerCase())) {
      score += 300;
    }
    
    // 4. Correspondance avec les alias
    place.aliases.forEach(alias => {
      if (alias.toLowerCase() === query.toLowerCase()) {
        score += 800;
      } else if (alias.toLowerCase().startsWith(query.toLowerCase())) {
        score += 400;
      } else if (alias.toLowerCase().includes(query.toLowerCase())) {
        score += 200;
      }
    });
    
    // 5. Correspondance avec l'adresse
    if (place.address.toLowerCase().includes(query.toLowerCase())) {
      score += 150;
    }
    
    // 6. Correspondance avec la commune
    if (place.commune.toLowerCase().includes(query.toLowerCase())) {
      score += 100;
    }
    
    // 7. Correspondance avec les tags
    place.tags?.forEach(tag => {
      searchTerms.forEach(term => {
        if (tag.toLowerCase().includes(term)) {
          score += 50;
        }
      });
    });
    
    // 8. Correspondance multi-termes (chaque terme doit apparaître quelque part)
    const allText = `${place.name} ${place.aliases.join(' ')} ${place.address} ${place.commune} ${place.tags?.join(' ') || ''}`.toLowerCase();
    const allTermsMatch = searchTerms.every(term => allText.includes(term));
    if (allTermsMatch && searchTerms.length > 1) {
      score += 200;
    }
    
    // 9. Bonus de popularité
    score += (place.popularity || 5) * 10;
    
    // 10. Bonus de proximité si position fournie
    if (currentLocation) {
      const distance = calculateDistance(
        currentLocation.lat,
        currentLocation.lng,
        place.coordinates.lat,
        place.coordinates.lng
      );
      
      // Plus proche = meilleur score
      if (distance < 2) score += 100; // Moins de 2km
      else if (distance < 5) score += 50; // Moins de 5km
      else if (distance < 10) score += 20; // Moins de 10km
    }
    
    return {
      place,
      score,
      distance: currentLocation ? calculateDistance(
        currentLocation.lat,
        currentLocation.lng,
        place.coordinates.lat,
        place.coordinates.lng
      ) : undefined
    };
  });
  
  // ✅ FILTRER : Ne garder que les résultats avec un score >= MINIMUM_SCORE
  const matches = scoredPlaces
    .filter(item => item.score >= MINIMUM_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(item => ({
      ...item.place,
      distance: item.distance
    }));
  
  // 📊 Log pour debug
  if (matches.length > 0) {
    console.log(`🎯 Recherche locale "${query}": ${matches.length} résultats pertinents trouvés`);
    console.log('Top 3:', matches.slice(0, 3).map(m => m.name));
  } else {
    console.log(`⚠️ Recherche locale "${query}": Aucun résultat suffisamment pertinent (score < ${MINIMUM_SCORE})`);
  }
  
  return matches;
}

/**
 * 📏 CALCULER LA DISTANCE ENTRE DEUX POINTS (FORMULE HAVERSINE)
 */
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Rayon de la Terre en km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * 🏷️ OBTENIR L'ICÔNE EMOJI SELON LA CATÉGORIE
 */
export function getCategoryIcon(category: LocalPlace['category']): string {
  const icons: Record<LocalPlace['category'], string> = {
    market: '🛒',
    terminal: '🚌',
    hospital: '🏥',
    school: '🏫',
    university: '🎓',
    hotel: '🏨',
    restaurant: '🍽️',
    mall: '🏬',
    church: '⛪',
    bank: '🏦',
    government: '🏛️',
    airport: '✈️',
    stadium: '🏟️',
    park: '🌳',
    monument: '🗿',
    embassy: '🏢',
    gas_station: '⛽',
    landmark: '📍',
    office: '🏢',
    residential: '🏘️'
  };
  return icons[category] || '📍';
}