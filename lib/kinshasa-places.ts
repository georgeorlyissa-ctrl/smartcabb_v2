/**
 * 🏙️ BASE DE DONNÉES DES LIEUX CONNUS DE KINSHASA
 * 
 * Lieux populaires, terminaux, marchés, centres commerciaux, hôtels, etc.
 * Comme Yango/Google Places - base locale riche
 */

export interface Place {
  id: string;
  name: string;
  type: 'terminal' | 'market' | 'mall' | 'hotel' | 'restaurant' | 'hospital' | 'church' | 'school' | 'bank' | 'station' | 'office' | 'park' | 'other';
  description: string;
  address: string;
  commune: string;
  quartier?: string;
  lat: number;
  lng: number;
  keywords: string[]; // Pour recherche intelligente
}

export const KINSHASA_PLACES: Place[] = [
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🚌 TERMINAUX ET GARES
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: 'lemba-terminus',
    name: 'Lemba Terminus',
    type: 'terminal',
    description: 'Terminal de bus principal',
    address: 'Avenue Sefu, Mont Amba',
    commune: 'Lemba',
    quartier: 'Terminus',
    lat: -4.3968,
    lng: 15.3111,
    keywords: ['lemba', 'terminus', 'terminal', 'bus', 'transport', 'sefu']
  },
  {
    id: 'matete-terminus',
    name: 'Matete Terminus',
    type: 'terminal',
    description: 'Terminal de bus',
    address: 'Avenue Mama Yemo',
    commune: 'Matete',
    lat: -4.3682,
    lng: 15.2895,
    keywords: ['matete', 'terminus', 'terminal', 'bus', 'mama', 'yemo']
  },
  {
    id: 'victoire-terminus',
    name: 'Victoire Terminus',
    type: 'terminal',
    description: 'Terminal de bus et marché',
    address: 'Avenue de la Victoire',
    commune: 'Ngaliema',
    lat: -4.3412,
    lng: 15.2845,
    keywords: ['victoire', 'terminus', 'terminal', 'bus', 'ngaliema']
  },
  {
    id: 'royale-terminus',
    name: 'Royale Terminus',
    type: 'terminal',
    description: 'Terminal de bus',
    address: 'Boulevard du 30 Juin',
    commune: 'Gombe',
    lat: -4.3245,
    lng: 15.3156,
    keywords: ['royale', 'terminus', 'terminal', 'bus', '30', 'juin']
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🛒 MARCHÉS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: 'kin-marche',
    name: 'KIN MARCHE',
    type: 'market',
    description: 'Supermarché et marché fermier',
    address: 'Avenue Sefu, Lemba Terminus',
    commune: 'Lemba',
    quartier: 'Terminus',
    lat: -4.3975,
    lng: 15.3105,
    keywords: ['kin', 'marche', 'marché', 'supermarché', 'lemba', 'terminus', 'courses']
  },
  {
    id: 'marche-central',
    name: 'Marché Central',
    type: 'market',
    description: 'Grand marché central',
    address: 'Avenue du Commerce',
    commune: 'Gombe',
    lat: -4.3198,
    lng: 15.3134,
    keywords: ['marché', 'central', 'gombe', 'commerce']
  },
  {
    id: 'marche-gambela',
    name: 'Marché Gambela',
    type: 'market',
    description: 'Marché populaire',
    address: 'Avenue Gambela',
    commune: 'Ngaliema',
    lat: -4.3556,
    lng: 15.2734,
    keywords: ['gambela', 'marché', 'ngaliema']
  },
  {
    id: 'marche-liberte',
    name: 'Marché de la Liberté',
    type: 'market',
    description: 'Marché de Kalamu',
    address: 'Avenue de la Liberté',
    commune: 'Kalamu',
    lat: -4.3367,
    lng: 15.3245,
    keywords: ['liberté', 'marché', 'kalamu']
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🏬 CENTRES COMMERCIAUX
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: 'city-market',
    name: 'City Market',
    type: 'mall',
    description: 'Centre commercial',
    address: 'Boulevard du 30 Juin',
    commune: 'Gombe',
    lat: -4.3223,
    lng: 15.3167,
    keywords: ['city', 'market', 'centre', 'commercial', 'shopping', 'gombe']
  },
  {
    id: 'peloustore',
    name: 'Peloustore',
    type: 'mall',
    description: 'Supermarché',
    address: 'Avenue Colonel Lukusa',
    commune: 'Gombe',
    lat: -4.3189,
    lng: 15.3178,
    keywords: ['peloustore', 'pelou', 'supermarché', 'gombe']
  },
  {
    id: 'hasson-hasson',
    name: 'Hasson & Frères',
    type: 'mall',
    description: 'Centre commercial',
    address: 'Boulevard du 30 Juin',
    commune: 'Gombe',
    lat: -4.3267,
    lng: 15.3145,
    keywords: ['hasson', 'frères', 'centre', 'commercial', 'shopping']
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🏨 HÔTELS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: 'memling-hotel',
    name: 'Hôtel Memling',
    type: 'hotel',
    description: 'Hôtel 5 étoiles',
    address: 'Avenue de la Justice',
    commune: 'Gombe',
    lat: -4.3212,
    lng: 15.3089,
    keywords: ['memling', 'hôtel', 'hotel', '5', 'étoiles', 'luxe', 'gombe']
  },
  {
    id: 'fleuve-congo-hotel',
    name: 'Fleuve Congo Hotel',
    type: 'hotel',
    description: 'Hôtel sur le fleuve',
    address: 'Boulevard du 30 Juin',
    commune: 'Gombe',
    lat: -4.3234,
    lng: 15.3123,
    keywords: ['fleuve', 'congo', 'hôtel', 'hotel', 'gombe']
  },
  {
    id: 'pullman-hotel',
    name: 'Pullman Kinshasa Grand Hotel',
    type: 'hotel',
    description: 'Hôtel international',
    address: 'Boulevard du 30 Juin',
    commune: 'Gombe',
    lat: -4.3189,
    lng: 15.3234,
    keywords: ['pullman', 'grand', 'hôtel', 'hotel', 'international', 'gombe']
  },
  {
    id: 'hotel-lemba',
    name: 'Rond Point Lemba Terminus',
    type: 'hotel',
    description: 'Hôtel - Avenue Itimbiri',
    address: 'Avenue Itimbiri, Commune de Lemba',
    commune: 'Lemba',
    quartier: 'Mont Amba',
    lat: -4.3982,
    lng: 15.3118,
    keywords: ['rond', 'point', 'lemba', 'terminus', 'hôtel', 'itimbiri', 'mont', 'amba']
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ⛪ ÉGLISES ET LIEUX DE CULTE
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: 'paroisse-saint-benoit',
    name: 'Paroisse Saint Benoit',
    type: 'church',
    description: 'Église catholique',
    address: 'Rue Mongala, Commune de Lemba',
    commune: 'Lemba',
    quartier: 'Mont Amba',
    lat: -4.3995,
    lng: 15.3095,
    keywords: ['paroisse', 'saint', 'benoit', 'église', 'catholique', 'lemba', 'mongala']
  },
  {
    id: 'cathedrale-notre-dame',
    name: 'Cathédrale Notre-Dame du Congo',
    type: 'church',
    description: 'Cathédrale principale',
    address: 'Avenue de Lemera',
    commune: 'Gombe',
    lat: -4.3178,
    lng: 15.3156,
    keywords: ['cathédrale', 'notre', 'dame', 'congo', 'église', 'gombe']
  },
  {
    id: 'eglise-ellia-lemba',
    name: 'Lemba Terminus',
    type: 'church',
    description: 'Association religieuse - Rue Ellia',
    address: 'Rue Ellia, Commune de Lemba',
    commune: 'Lemba',
    quartier: 'Mont Amba',
    lat: -4.3988,
    lng: 15.3102,
    keywords: ['lemba', 'terminus', 'association', 'religieuse', 'ellia', 'mont', 'amba']
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🏥 HÔPITAUX ET CENTRES MÉDICAUX
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: 'hopital-ngaliema',
    name: 'Hôpital Général de Référence de Ngaliema',
    type: 'hospital',
    description: 'Hôpital public',
    address: 'Avenue Cliniques',
    commune: 'Ngaliema',
    lat: -4.3445,
    lng: 15.2678,
    keywords: ['hôpital', 'hospital', 'ngaliema', 'clinique', 'médical']
  },
  {
    id: 'clinique-ngaliema',
    name: 'Cliniques Universitaires de Kinshasa',
    type: 'hospital',
    description: 'Hôpital universitaire',
    address: 'Avenue de la Clinique',
    commune: 'Lemba',
    lat: -4.4012,
    lng: 15.2989,
    keywords: ['clinique', 'universitaire', 'hôpital', 'unikin', 'lemba']
  },
  {
    id: 'gymep-lemba',
    name: 'Gymep-Lemba Terminus',
    type: 'hospital',
    description: 'Centre médical, clinique',
    address: 'Rue Zizi, Commune de Lemba',
    commune: 'Lemba',
    quartier: 'Mont Amba',
    lat: -4.3978,
    lng: 15.3125,
    keywords: ['gymep', 'lemba', 'terminus', 'centre', 'médical', 'clinique', 'zizi']
  },
  {
    id: 'hopital-mama-yemo',
    name: 'Hôpital Mama Yemo',
    type: 'hospital',
    description: 'Grand hôpital public',
    address: 'Avenue Mama Yemo',
    commune: 'Lemba',
    lat: -4.3834,
    lng: 15.3023,
    keywords: ['hôpital', 'mama', 'yemo', 'clinique', 'lemba']
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🎓 UNIVERSITÉS ET ÉCOLES
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: 'unikin',
    name: 'Université de Kinshasa (UNIKIN)',
    type: 'school',
    description: 'Université publique',
    address: 'Campus de Lemba',
    commune: 'Lemba',
    lat: -4.4067,
    lng: 15.2956,
    keywords: ['unikin', 'université', 'kinshasa', 'campus', 'lemba', 'faculté']
  },
  {
    id: 'unikin-polytechnique',
    name: 'École Polytechnique UNIKIN',
    type: 'school',
    description: 'Faculté Polytechnique',
    address: 'Campus UNIKIN',
    commune: 'Lemba',
    lat: -4.4089,
    lng: 15.2934,
    keywords: ['polytechnique', 'école', 'ingénieur', 'unikin', 'lemba']
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🏢 BUREAUX ET ADMINISTRATIONS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: 'palais-du-peuple',
    name: 'Palais du Peuple',
    type: 'office',
    description: 'Parlement',
    address: 'Boulevard du 30 Juin',
    commune: 'Gombe',
    lat: -4.3156,
    lng: 15.3089,
    keywords: ['palais', 'peuple', 'parlement', 'assemblée', 'nationale', 'gombe']
  },
  {
    id: 'palais-de-la-nation',
    name: 'Palais de la Nation',
    type: 'office',
    description: 'Présidence',
    address: 'Boulevard du 30 Juin',
    commune: 'Gombe',
    lat: -4.3234,
    lng: 15.3201,
    keywords: ['palais', 'nation', 'présidence', 'gouvernement', 'gombe']
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ⛽ STATIONS ET AUTRES
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: 'aeroport-ndjili',
    name: 'Aéroport International de N\'Djili',
    type: 'station',
    description: 'Aéroport principal',
    address: 'Route de l\'Aéroport',
    commune: 'Nsele',
    lat: -4.3856,
    lng: 15.4444,
    keywords: ['aéroport', 'airport', 'ndjili', 'vol', 'avion', 'nsele']
  },
  {
    id: 'gare-centrale',
    name: 'Gare Centrale de Kinshasa',
    type: 'station',
    description: 'Gare ferroviaire',
    address: 'Boulevard du 30 Juin',
    commune: 'Gombe',
    lat: -4.3267,
    lng: 15.3089,
    keywords: ['gare', 'centrale', 'train', 'chemin', 'fer', 'gombe']
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🎯 AUTRES LIEUX POPULAIRES
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: 'stade-martyrs',
    name: 'Stade des Martyrs',
    type: 'other',
    description: 'Stade national',
    address: 'Boulevard Triomphal',
    commune: 'Lingwala',
    lat: -4.3334,
    lng: 15.2945,
    keywords: ['stade', 'martyrs', 'football', 'sport', 'lingwala', 'triomphal']
  },
  {
    id: 'zoo-kinshasa',
    name: 'Jardin Zoologique de Kinshasa',
    type: 'park',
    description: 'Zoo et parc',
    address: 'Avenue de la Justice',
    commune: 'Gombe',
    lat: -4.3189,
    lng: 15.3067,
    keywords: ['zoo', 'jardin', 'zoologique', 'animaux', 'parc', 'gombe']
  },
  {
    id: 'marche-kilija',
    name: 'Lemba Terminus',
    type: 'market',
    description: 'Marché fermier - Rue Kilija',
    address: 'Rue Kilija, Commune de Lemba',
    commune: 'Lemba',
    quartier: 'Mont Amba',
    lat: -4.3972,
    lng: 15.3108,
    keywords: ['lemba', 'terminus', 'marché', 'fermier', 'kilija', 'mont', 'amba']
  },
  {
    id: 'makanga-events',
    name: 'Lemba Terminus',
    type: 'other',
    description: 'Organisation d\'événements - Rue Makanga',
    address: 'Rue Makanga, Commune de Lemba',
    commune: 'Lemba',
    quartier: 'Mont Amba',
    lat: -4.3965,
    lng: 15.3115,
    keywords: ['lemba', 'terminus', 'organisation', 'événements', 'makanga', 'mont', 'amba']
  }
];

/**
 * 📍 ICÔNES PAR TYPE DE LIEU (comme Yango)
 */
export const PLACE_TYPE_ICONS: Record<Place['type'], string> = {
  terminal: '🚌',
  market: '🛒',
  mall: '🏬',
  hotel: '🏨',
  restaurant: '🍽️',
  hospital: '🏥',
  church: '⛪',
  school: '🎓',
  bank: '🏦',
  station: '🚉',
  office: '🏢',
  park: '🌳',
  other: '📍'
};

/**
 * 📋 LABELS PAR TYPE
 */
export const PLACE_TYPE_LABELS: Record<Place['type'], string> = {
  terminal: 'Terminal',
  market: 'Marché',
  mall: 'Centre commercial',
  hotel: 'Hôtel',
  restaurant: 'Restaurant',
  hospital: 'Hôpital',
  church: 'Lieu de culte',
  school: 'École',
  bank: 'Banque',
  station: 'Gare / Aéroport',
  office: 'Bureau',
  park: 'Parc',
  other: 'Lieu'
};
