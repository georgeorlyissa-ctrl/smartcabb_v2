/**
 * 🇨🇩 BASE DE DONNÉES DES COMMUNES ET QUARTIERS DE KINSHASA, RDC
 * 
 * Source : Cartographie officielle de Kinshasa
 * Mise à jour : Décembre 2024
 */

export interface Quartier {
  nom: string;
  commune: string;
  lat: number;
  lng: number;
  populaire?: boolean; // Quartiers très connus
}

export interface Commune {
  nom: string;
  lat: number;
  lng: number;
  quartiers: string[];
}

/**
 * 24 COMMUNES DE KINSHASA
 */
export const COMMUNES_KINSHASA: Commune[] = [
  // ⭐ COMMUNES CENTRALES
  {
    nom: "Gombe",
    lat: -4.3217,
    lng: 15.3136,
    quartiers: ["Centre-ville", "Hôtel de Ville", "Socimat", "Fleuve", "Concession", "Aviation", "Victoire"]
  },
  {
    nom: "Kinshasa",
    lat: -4.3369,
    lng: 15.3271,
    quartiers: ["Matonge", "Victoire", "Kalamu", "Salongo", "Révolution"]
  },
  {
    nom: "Barumbu",
    lat: -4.3389,
    lng: 15.2947,
    quartiers: ["Marché Central", "Marché Gambela", "Croix-Rouge", "Kalembelembe"]
  },
  {
    nom: "Lingwala",
    lat: -4.3264,
    lng: 15.2858,
    quartiers: ["Yolo Nord", "Yolo Sud", "Saint Jean", "Lingwala"]
  },
  
  // 🏘️ COMMUNES OUEST
  {
    nom: "Ngaliema",
    lat: -4.3861,
    lng: 15.2728,
    quartiers: ["Mont Ngafula", "Binza", "Kin-Oasis", "Résidentiel", "Joli Parc", "Ma Campagne", "Ngaliema"]
  },
  {
    nom: "Selembao",
    lat: -4.3906,
    lng: 15.2944,
    quartiers: ["Selembao", "Bumbu", "Matadi Mayo", "Righini"]
  },
  {
    nom: "Ngiri-Ngiri",
    lat: -4.3528,
    lng: 15.2783,
    quartiers: ["Ngiri-Ngiri", "Bumbu", "Kinsuka", "Mibongo"]
  },
  {
    nom: "Bumbu",
    lat: -4.4108,
    lng: 15.2925,
    quartiers: ["Bumbu", "Kindele", "Mikondo", "Bumbu Village"]
  },
  {
    nom: "Makala",
    lat: -4.3667,
    lng: 15.2889,
    quartiers: ["Makala", "Kimwenza", "Livulu", "Matete II"]
  },
  
  // 🏙️ COMMUNES SUD
  {
    nom: "Kalamu",
    lat: -4.3444,
    lng: 15.3064,
    quartiers: ["Matonge", "Victoire", "Salongo", "Kalamu Centre", "Yolo"]
  },
  {
    nom: "Lemba",
    lat: -4.3847,
    lng: 15.3172,
    quartiers: ["Lemba", "Makala", "UPN", "Kimwenza", "Livulu", "Kingabwa"]
  },
  {
    nom: "Matete",
    lat: -4.3681,
    lng: 15.3217,
    quartiers: ["Matete", "Mazamba", "Kingabwa", "Righini", "Mbuku", "Makelele"]
  },
  {
    nom: "Kintambo",
    lat: -4.3389,
    lng: 15.2883,
    quartiers: ["Kintambo", "Magasin", "Libanga", "Station", "Ndanu"]
  },
  {
    nom: "Bandalungwa",
    lat: -4.3481,
    lng: 15.3000,
    quartiers: ["Bandalungwa", "Kimpoko", "Révolution", "Mombele"]
  },
  
  // 🌆 COMMUNES EST
  {
    nom: "Kasa-Vubu",
    lat: -4.3517,
    lng: 15.3147,
    quartiers: ["Kasavubu", "Victoire", "Matonge", "Boyambi", "Mososo", "Pangala"]
  },
  {
    nom: "Ngaba",
    lat: -4.3608,
    lng: 15.3069,
    quartiers: ["Ngaba", "Mombele", "Camp Luka", "Sans Fil"]
  },
  {
    nom: "Kimbanseke",
    lat: -4.4186,
    lng: 15.3444,
    quartiers: ["Kimbanseke", "Mitendi", "Mpasa", "Dingi-Dingi", "Mapela", "Camp Permanent"]
  },
  {
    nom: "Ndjili",
    lat: -4.3894,
    lng: 15.4119,
    quartiers: ["Ndjili", "Aéroport", "Mitendi", "Camp Luka", "Kingabwa"]
  },
  
  // 🏞️ COMMUNES PÉRIPHÉRIQUES
  {
    nom: "Kisenso",
    lat: -4.4089,
    lng: 15.2419,
    quartiers: ["Kisenso", "Kindele", "Makala", "Matadi Kibala"]
  },
  {
    nom: "Limete",
    lat: -4.3681,
    lng: 15.3444,
    quartiers: ["Limete", "Industriel", "Kingabwa", "Camp Kokolo", "Funa", "Salongo"]
  },
  {
    nom: "Masina",
    lat: -4.3981,
    lng: 15.3919,
    quartiers: ["Masina", "Petro-Congo", "Macampagne", "Camp Luka", "Sans Fil"]
  },
  {
    nom: "Nsele",
    lat: -4.3578,
    lng: 15.4519,
    quartiers: ["Nsele", "Maluku", "Kinkole", "Kibanseke"]
  },
  {
    nom: "Mont-Ngafula",
    lat: -4.4489,
    lng: 15.2839,
    quartiers: ["Mont-Ngafula", "Kimwenza", "Kinsuka", "Matadi Mayo", "Binza Météo", "Bibwa"]
  },
  {
    nom: "Maluku",
    lat: -4.2908,
    lng: 15.5206,
    quartiers: ["Maluku", "Nsele", "Kinkole", "Mbudi"]
  }
];

/**
 * QUARTIERS POPULAIRES AVEC COORDONNÉES PRÉCISES
 */
export const QUARTIERS_KINSHASA: Quartier[] = [
  // GOMBE
  { nom: "Centre-ville", commune: "Gombe", lat: -4.3217, lng: 15.3136, populaire: true },
  { nom: "Socimat", commune: "Gombe", lat: -4.3228, lng: 15.3192, populaire: true },
  { nom: "Fleuve", commune: "Gombe", lat: -4.3192, lng: 15.3089 },
  { nom: "Hôtel de Ville", commune: "Gombe", lat: -4.3203, lng: 15.3119 },
  
  // KINSHASA (COMMUNE)
  { nom: "Matonge", commune: "Kinshasa", lat: -4.3369, lng: 15.3271, populaire: true },
  { nom: "Victoire", commune: "Kinshasa", lat: -4.3417, lng: 15.3222 },
  
  // MATETE
  { nom: "Matete", commune: "Matete", lat: -4.3681, lng: 15.3217, populaire: true },
  { nom: "Mazamba", commune: "Matete", lat: -4.3708, lng: 15.3189 },
  { nom: "Righini", commune: "Matete", lat: -4.3722, lng: 15.3253 },
  { nom: "Kingabwa", commune: "Matete", lat: -4.3653, lng: 15.3294 },
  { nom: "Makelele", commune: "Matete", lat: -4.3694, lng: 15.3164 },
  
  // LEMBA
  { nom: "Lemba", commune: "Lemba", lat: -4.3847, lng: 15.3172, populaire: true },
  { nom: "UPN", commune: "Lemba", lat: -4.3892, lng: 15.3208 },
  { nom: "Makala", commune: "Lemba", lat: -4.3889, lng: 15.3131 },
  { nom: "Livulu", commune: "Lemba", lat: -4.3917, lng: 15.3056 },
  
  // NGALIEMA
  { nom: "Binza", commune: "Ngaliema", lat: -4.3972, lng: 15.2764, populaire: true },
  { nom: "Joli Parc", commune: "Ngaliema", lat: -4.3894, lng: 15.2647 },
  { nom: "Ma Campagne", commune: "Ngaliema", lat: -4.3831, lng: 15.2694 },
  
  // KASA-VUBU
  { nom: "Kasavubu", commune: "Kasa-Vubu", lat: -4.3517, lng: 15.3147, populaire: true },
  { nom: "Boyambi", commune: "Kasa-Vubu", lat: -4.3561, lng: 15.3175 },
  { nom: "Pangala", commune: "Kasa-Vubu", lat: -4.3489, lng: 15.3108 },
  
  // KALAMU
  { nom: "Kalamu", commune: "Kalamu", lat: -4.3444, lng: 15.3064, populaire: true },
  { nom: "Salongo", commune: "Kalamu", lat: -4.3472, lng: 15.3092 },
  
  // LIMETE
  { nom: "Limete", commune: "Limete", lat: -4.3681, lng: 15.3444, populaire: true },
  { nom: "Industriel", commune: "Limete", lat: -4.3667, lng: 15.3478 },
  { nom: "Funa", commune: "Limete", lat: -4.3711, lng: 15.3419 },
  
  // NDJILI
  { nom: "Ndjili", commune: "Ndjili", lat: -4.3894, lng: 15.4119, populaire: true },
  { nom: "Aéroport", commune: "Ndjili", lat: -4.3858, lng: 15.4144 },
  
  // KIMBANSEKE
  { nom: "Kimbanseke", commune: "Kimbanseke", lat: -4.4186, lng: 15.3444, populaire: true },
  { nom: "Mitendi", commune: "Kimbanseke", lat: -4.4228, lng: 15.3486 },
  { nom: "Mpasa", commune: "Kimbanseke", lat: -4.4156, lng: 15.3503 },
  
  // MASINA
  { nom: "Masina", commune: "Masina", lat: -4.3981, lng: 15.3919, populaire: true },
  { nom: "Petro-Congo", commune: "Masina", lat: -4.4006, lng: 15.3947 },
  
  // MONT-NGAFULA
  { nom: "Mont-Ngafula", commune: "Mont-Ngafula", lat: -4.4489, lng: 15.2839, populaire: true },
  { nom: "Kimwenza", commune: "Mont-Ngafula", lat: -4.4561, lng: 15.2878 },
  { nom: "Binza Météo", commune: "Mont-Ngafula", lat: -4.4422, lng: 15.2781 },
  
  // AUTRES QUARTIERS POPULAIRES
  { nom: "Bandal", commune: "Bandalungwa", lat: -4.3481, lng: 15.3000, populaire: true },
  { nom: "Kintambo", commune: "Kintambo", lat: -4.3389, lng: 15.2883, populaire: true },
  { nom: "Ngaba", commune: "Ngaba", lat: -4.3608, lng: 15.3069, populaire: true },
  { nom: "Barumbu", commune: "Barumbu", lat: -4.3389, lng: 15.2947, populaire: true },
  { nom: "Lingwala", commune: "Lingwala", lat: -4.3264, lng: 15.2858, populaire: true }
];

/**
 * Calculer la distance entre deux coordonnées (en km)
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Rayon de la Terre en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Trouver les quartiers proches d'une position (rayon en km)
 */
export function findNearbyQuartiers(
  lat: number,
  lng: number,
  radiusKm: number = 5
): Quartier[] {
  return QUARTIERS_KINSHASA.filter(quartier => {
    const distance = calculateDistance(lat, lng, quartier.lat, quartier.lng);
    return distance <= radiusKm;
  }).sort((a, b) => {
    const distA = calculateDistance(lat, lng, a.lat, a.lng);
    const distB = calculateDistance(lat, lng, b.lat, b.lng);
    return distA - distB;
  });
}

/**
 * Trouver une commune par nom de quartier
 */
export function findCommuneByQuartier(quartierName: string): Commune | null {
  const quartier = QUARTIERS_KINSHASA.find(
    q => q.nom.toLowerCase() === quartierName.toLowerCase()
  );
  
  if (!quartier) return null;
  
  return COMMUNES_KINSHASA.find(
    c => c.nom === quartier.commune
  ) || null;
}

/**
 * Rechercher des quartiers par nom (fuzzy search)
 */
export function searchQuartiers(query: string): Quartier[] {
  const lowerQuery = query.toLowerCase().trim();
  if (!lowerQuery) return [];
  
  return QUARTIERS_KINSHASA.filter(quartier => {
    const nom = quartier.nom.toLowerCase();
    const commune = quartier.commune.toLowerCase();
    
    return nom.includes(lowerQuery) || 
           nom.startsWith(lowerQuery) ||
           commune.includes(lowerQuery);
  }).sort((a, b) => {
    // Priorité aux quartiers populaires
    if (a.populaire && !b.populaire) return -1;
    if (!a.populaire && b.populaire) return 1;
    
    // Priorité aux correspondances exactes
    const aExact = a.nom.toLowerCase().startsWith(lowerQuery);
    const bExact = b.nom.toLowerCase().startsWith(lowerQuery);
    if (aExact && !bExact) return -1;
    if (!aExact && bExact) return 1;
    
    return 0;
  });
}

/**
 * Obtenir tous les quartiers d'une commune
 */
export function getQuartiersByCommune(communeName: string): Quartier[] {
  return QUARTIERS_KINSHASA.filter(
    q => q.commune.toLowerCase() === communeName.toLowerCase()
  );
}
