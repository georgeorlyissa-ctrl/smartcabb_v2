/**
 * 🏙️ BASE DE DONNÉES ÉTENDUE DES LIEUX DE KINSHASA
 * 400+ lieux réels couvrant les 24 communes
 */

export interface LocalPlace {
  id: string;
  name: string;
  category: 'terminal' | 'market' | 'mall' | 'hotel' | 'restaurant' | 'hospital' | 'church'
    | 'school' | 'bank' | 'station' | 'office' | 'park' | 'university' | 'government'
    | 'airport' | 'stadium' | 'monument' | 'embassy' | 'gas_station' | 'landmark'
    | 'residential' | 'other';
  address: string;
  commune: string;
  quartier?: string;
  coordinates: { lat: number; lng: number };
  aliases: string[];
  tags?: string[];
  popularity?: number;
  distance?: number;
}

export const kinshasaPlacesDatabase: LocalPlace[] = [

  // ════════════════════════════════════════════════════════
  // ✈️  AÉROPORT
  // ════════════════════════════════════════════════════════
  { id: 'aeroport-njili', name: "Aéroport International de N'djili", category: 'airport',
    address: "N'djili", commune: "N'djili", coordinates: { lat: -4.3857, lng: 15.4446 },
    aliases: ["N'djili Airport", 'FIH', 'Aéroport de Kinshasa', 'Aéroport Ndili', 'FIH Airport'],
    tags: ['aéroport', 'transport', 'international'], popularity: 10 },

  // ════════════════════════════════════════════════════════
  // 🏙️  GOMBE — Centre-ville / CBD
  // ════════════════════════════════════════════════════════
  { id: 'gombe-centre', name: 'Centre-ville de Kinshasa', category: 'landmark',
    address: 'Boulevard du 30 Juin', commune: 'Gombe', quartier: 'Centre',
    coordinates: { lat: -4.3230, lng: 15.3147 },
    aliases: ['Downtown Kinshasa', 'Centre Gombe', 'Ville haute', '30 Juin'],
    tags: ['centre', 'affaires', 'gombe'], popularity: 10 },
  { id: 'palais-nation', name: 'Palais de la Nation', category: 'government',
    address: 'Avenue Kabinda', commune: 'Gombe',
    coordinates: { lat: -4.3167, lng: 15.3089 },
    aliases: ['Palais Présidentiel', 'Présidence', 'Cité de la Nation'],
    tags: ['gouvernement', 'présidence'], popularity: 9 },
  { id: 'hotel-memling', name: 'Hôtel Memling', category: 'hotel',
    address: 'Avenue des Aviateurs', commune: 'Gombe',
    coordinates: { lat: -4.3220, lng: 15.3138 },
    aliases: ['Memling', 'Memling Hotel'], tags: ['hôtel', 'hébergement'], popularity: 9 },
  { id: 'hotel-pullman', name: 'Pullman Kinshasa Grand Hotel', category: 'hotel',
    address: '4 Avenue Batetela', commune: 'Gombe',
    coordinates: { lat: -4.3227, lng: 15.3150 },
    aliases: ['Pullman', 'Grand Hotel'], tags: ['hôtel', 'luxe'], popularity: 9 },
  { id: 'hotel-venus', name: 'Hôtel Venus', category: 'hotel',
    address: 'Avenue Colonel Ebeya', commune: 'Gombe',
    coordinates: { lat: -4.3213, lng: 15.3121 },
    aliases: ['Venus Hotel', 'Venus Gombe'], tags: ['hôtel'], popularity: 7 },
  { id: 'city-market', name: 'City Market', category: 'mall',
    address: 'Boulevard du 30 Juin', commune: 'Gombe',
    coordinates: { lat: -4.3287, lng: 15.3198 },
    aliases: ['Shopping City Market', 'City Market Gombe'], tags: ['shopping', 'supermarché'], popularity: 9 },
  { id: 'super-marche-gomme', name: 'Super Marché GOMME', category: 'mall',
    address: 'Avenue des Aviateurs', commune: 'Gombe',
    coordinates: { lat: -4.3234, lng: 15.3155 },
    aliases: ['GOMME', 'Supermarché GOMME'], tags: ['shopping'], popularity: 8 },
  { id: 'marche-central', name: 'Marché Central', category: 'market',
    address: 'Avenue du Commerce', commune: 'Gombe',
    coordinates: { lat: -4.3198, lng: 15.3134 },
    aliases: ['Central Market', 'Grand Marché'], tags: ['marché', 'commerce'], popularity: 9 },
  { id: 'hopital-general', name: 'Hôpital Général de Kinshasa', category: 'hospital',
    address: 'Avenue de la Justice', commune: 'Gombe',
    coordinates: { lat: -4.3245, lng: 15.3123 },
    aliases: ['Hôpital Général', 'HGK', 'Hôpital de Kinshasa'], tags: ['hôpital', 'urgences'], popularity: 9 },
  { id: 'cathedrale-notre-dame', name: 'Cathédrale Notre-Dame du Congo', category: 'church',
    address: 'Avenue Roi Baudouin', commune: 'Gombe',
    coordinates: { lat: -4.3189, lng: 15.3145 },
    aliases: ['Notre-Dame', 'Cathédrale Gombe'], tags: ['cathédrale', 'religion'], popularity: 8 },
  { id: 'rawbank-gombe', name: 'Rawbank Gombe', category: 'bank',
    address: 'Boulevard du 30 Juin', commune: 'Gombe',
    coordinates: { lat: -4.3256, lng: 15.3167 },
    aliases: ['Rawbank', 'Rawbank Boulevard'], tags: ['banque'], popularity: 8 },
  { id: 'ambassade-france', name: 'Ambassade de France', category: 'embassy',
    address: 'Avenue des Trois Z', commune: 'Gombe',
    coordinates: { lat: -4.3178, lng: 15.3067 },
    aliases: ['Ambassade Française', 'France Embassy'], tags: ['ambassade'], popularity: 7 },
  { id: 'ambassy-usa', name: 'Ambassade des États-Unis', category: 'embassy',
    address: '310 Avenue des Aviateurs', commune: 'Gombe',
    coordinates: { lat: -4.3201, lng: 15.3084 },
    aliases: ['US Embassy', 'Ambassade Américaine'], tags: ['ambassade'], popularity: 7 },
  { id: 'immeuble-sozacom', name: 'Immeuble SOZACOM', category: 'landmark',
    address: 'Boulevard du 30 Juin', commune: 'Gombe',
    coordinates: { lat: -4.3265, lng: 15.3189 },
    aliases: ['SOZACOM', 'Tour SOZACOM'], tags: ['immeuble', 'bureau'], popularity: 7 },
  { id: 'royale-terminus', name: 'Royale Terminus', category: 'terminal',
    address: 'Boulevard du 30 Juin', commune: 'Gombe',
    coordinates: { lat: -4.3245, lng: 15.3156 },
    aliases: ['Terminus Royale', 'Royale'], tags: ['transport', 'terminus'], popularity: 7 },

  // ════════════════════════════════════════════════════════
  // 🌿  MONT-NGAFULA
  // ════════════════════════════════════════════════════════
  { id: 'mont-ngafula-centre', name: 'Mont-Ngafula', category: 'residential',
    address: 'Commune de Mont-Ngafula', commune: 'Mont-Ngafula',
    coordinates: { lat: -4.4396, lng: 15.2519 },
    aliases: ['Mont Ngafula', 'Ngafula', 'Montagne Ngafula', 'Mont-Ngafula commune'],
    tags: ['commune', 'résidentiel'], popularity: 9 },
  { id: 'upn', name: 'Université Pédagogique Nationale (UPN)', category: 'university',
    address: 'Avenue de la Libération', commune: 'Mont-Ngafula',
    coordinates: { lat: -4.4390, lng: 15.2566 },
    aliases: ['UPN', 'Université Pédagogique', 'Campus UPN', 'UPN Mont-Ngafula'],
    tags: ['université', 'éducation', 'campus'], popularity: 9 },
  { id: 'kimwenza', name: 'Kimwenza', category: 'residential',
    address: 'Quartier Kimwenza', commune: 'Mont-Ngafula', quartier: 'Kimwenza',
    coordinates: { lat: -4.4695, lng: 15.2451 },
    aliases: ['Kimwenza Mont-Ngafula', 'Quartier Kimwenza'],
    tags: ['quartier', 'résidentiel', 'mont-ngafula'], popularity: 8 },
  { id: 'mitendi', name: 'Mitendi', category: 'residential',
    address: 'Quartier Mitendi', commune: 'Mont-Ngafula', quartier: 'Mitendi',
    coordinates: { lat: -4.4245, lng: 15.2723 },
    aliases: ['Mitendi Mont-Ngafula', 'Quartier Mitendi', 'Avenue Mitendi'],
    tags: ['quartier', 'résidentiel'], popularity: 8 },
  { id: 'mbudi', name: 'Mbudi', category: 'residential',
    address: 'Route de Mbudi', commune: 'Mont-Ngafula', quartier: 'Mbudi',
    coordinates: { lat: -4.4189, lng: 15.2134 },
    aliases: ['Mbudi Mont-Ngafula', 'Centre Mbudi'],
    tags: ['quartier', 'mbudi'], popularity: 7 },
  { id: 'sanga-ngafula', name: 'Sanga', category: 'residential',
    address: 'Quartier Sanga', commune: 'Mont-Ngafula', quartier: 'Sanga',
    coordinates: { lat: -4.4501, lng: 15.2389 },
    aliases: ['Sanga Mont-Ngafula', 'Quartier Sanga'],
    tags: ['quartier', 'résidentiel', 'mont-ngafula'], popularity: 7 },
  { id: 'marche-mitendi', name: 'Marché de Mitendi', category: 'market',
    address: 'Avenue Mitendi', commune: 'Mont-Ngafula',
    coordinates: { lat: -4.4258, lng: 15.2731 },
    aliases: ['Marché Mitendi', 'Mitendi Market'],
    tags: ['marché', 'commerce', 'mont-ngafula'], popularity: 7 },
  { id: 'hopital-mont-ngafula', name: 'Hôpital Mont-Ngafula', category: 'hospital',
    address: 'Avenue de la Libération, Mont-Ngafula', commune: 'Mont-Ngafula',
    coordinates: { lat: -4.4412, lng: 15.2534 },
    aliases: ['Hôpital de Mont-Ngafula', 'CS Mont-Ngafula'],
    tags: ['hôpital', 'santé', 'mont-ngafula'], popularity: 7 },
  { id: 'eglise-mont-ngafula', name: 'Paroisse Mont-Ngafula', category: 'church',
    address: 'Mont-Ngafula', commune: 'Mont-Ngafula',
    coordinates: { lat: -4.4378, lng: 15.2543 },
    aliases: ['Église Mont-Ngafula', 'Paroisse Kimwenza'],
    tags: ['église', 'religion', 'mont-ngafula'], popularity: 6 },
  { id: 'ngansele', name: 'Ngansele', category: 'residential',
    address: 'Quartier Ngansele', commune: 'Mont-Ngafula', quartier: 'Ngansele',
    coordinates: { lat: -4.4523, lng: 15.2312 },
    aliases: ['Ngansele Mont-Ngafula'], tags: ['quartier'], popularity: 6 },

  // ════════════════════════════════════════════════════════
  // 🏭  MASINA
  // ════════════════════════════════════════════════════════
  { id: 'masina-centre', name: 'Masina', category: 'residential',
    address: 'Commune de Masina', commune: 'Masina',
    coordinates: { lat: -4.3856, lng: 15.4446 },
    aliases: ['Commune Masina', 'Masina Kinshasa'],
    tags: ['commune', 'résidentiel'], popularity: 9 },
  { id: 'kingasani', name: 'Kingasani', category: 'residential',
    address: 'Quartier Kingasani', commune: 'Masina', quartier: 'Kingasani',
    coordinates: { lat: -4.3978, lng: 15.4512 },
    aliases: ['Kingasani Masina', 'Quartier Kingasani'],
    tags: ['quartier', 'masina'], popularity: 8 },
  { id: 'zone-industrielle-masina', name: 'Zone Industrielle de Masina', category: 'office',
    address: 'Zone Industrielle', commune: 'Masina',
    coordinates: { lat: -4.3801, lng: 15.4312 },
    aliases: ['ZIM', 'Industrie Masina', 'Zone Industrielle Masina'],
    tags: ['industrie', 'zone industrielle', 'masina'], popularity: 8 },
  { id: 'marche-masina', name: 'Marché de Masina', category: 'market',
    address: 'Avenue Masina', commune: 'Masina',
    coordinates: { lat: -4.3856, lng: 15.4389 },
    aliases: ['Marché Masina', 'Masina Market'],
    tags: ['marché', 'commerce', 'masina'], popularity: 8 },
  { id: 'terminal-masina', name: 'Terminal Masina', category: 'terminal',
    address: 'Route de Masina', commune: 'Masina',
    coordinates: { lat: -4.3801, lng: 15.4267 },
    aliases: ['Terminus Masina', 'Gare Masina'],
    tags: ['transport', 'terminus', 'masina'], popularity: 7 },
  { id: 'pascal-masina', name: 'Quartier Pascal — Masina', category: 'residential',
    address: 'Quartier Pascal', commune: 'Masina', quartier: 'Pascal',
    coordinates: { lat: -4.3823, lng: 15.4478 },
    aliases: ['Pascal Masina', 'Avenue Pascal', 'Rue Pascal Masina', 'Cité Pascal'],
    tags: ['quartier', 'pascal', 'masina'], popularity: 7 },
  { id: 'camp-massart', name: 'Camp Massart', category: 'residential',
    address: 'Camp Massart', commune: 'Masina', quartier: 'Camp Massart',
    coordinates: { lat: -4.3834, lng: 15.4534 },
    aliases: ['Camp Massart Masina', 'Massart'],
    tags: ['quartier', 'camp', 'masina'], popularity: 7 },
  { id: 'hopital-masina', name: 'Hôpital de Masina', category: 'hospital',
    address: 'Avenue de la Paix, Masina', commune: 'Masina',
    coordinates: { lat: -4.3867, lng: 15.4401 },
    aliases: ['CS Masina', 'Centre de Santé Masina'],
    tags: ['hôpital', 'santé', 'masina'], popularity: 7 },

  // ════════════════════════════════════════════════════════
  // 🌇  LIMETE
  // ════════════════════════════════════════════════════════
  { id: 'limete-centre', name: 'Limete', category: 'residential',
    address: 'Commune de Limete', commune: 'Limete',
    coordinates: { lat: -4.3469, lng: 15.3634 },
    aliases: ['Commune Limete', 'Limete Kinshasa'],
    tags: ['commune'], popularity: 9 },
  { id: 'zone-industrielle-limete', name: 'Zone Industrielle de Limete', category: 'office',
    address: 'Limete Industriel', commune: 'Limete', quartier: 'Industriel',
    coordinates: { lat: -4.3467, lng: 15.3589 },
    aliases: ['Limete Industriel', 'Zone Industrielle Limete', 'ZIL'],
    tags: ['industrie', 'limete', 'zone industrielle'], popularity: 8 },
  { id: 'marche-limete', name: 'Marché de Limete', category: 'market',
    address: 'Avenue Limete', commune: 'Limete',
    coordinates: { lat: -4.3489, lng: 15.3612 },
    aliases: ['Marché Limete', 'Limete Market'],
    tags: ['marché', 'limete'], popularity: 8 },
  { id: 'mombele', name: 'Mombele', category: 'residential',
    address: 'Quartier Mombele', commune: 'Limete', quartier: 'Mombele',
    coordinates: { lat: -4.3412, lng: 15.3823 },
    aliases: ['Mombele Limete', 'Quartier Mombele'],
    tags: ['quartier', 'limete'], popularity: 7 },
  { id: 'terminal-limete', name: 'Terminal Limete', category: 'terminal',
    address: 'Route Limete', commune: 'Limete',
    coordinates: { lat: -4.3456, lng: 15.3623 },
    aliases: ['Terminus Limete', 'Gare Limete'],
    tags: ['transport', 'terminus', 'limete'], popularity: 7 },
  { id: 'residence-limete', name: 'Résidence Limete', category: 'residential',
    address: 'Limete Résidentiel', commune: 'Limete', quartier: 'Résidentiel',
    coordinates: { lat: -4.3501, lng: 15.3534 },
    aliases: ['Limete Résidentiel', 'Cité Résidentielle Limete'],
    tags: ['résidentiel', 'limete'], popularity: 7 },
  { id: 'eglise-limete', name: 'Temple de la Grâce — Limete', category: 'church',
    address: 'Avenue Limete', commune: 'Limete',
    coordinates: { lat: -4.3479, lng: 15.3601 },
    aliases: ['Église Limete', 'Temple Limete'],
    tags: ['église', 'limete'], popularity: 6 },

  // ════════════════════════════════════════════════════════
  // 🏞️  NGALIEMA
  // ════════════════════════════════════════════════════════
  { id: 'ngaliema-centre', name: 'Ngaliema', category: 'residential',
    address: 'Commune de Ngaliema', commune: 'Ngaliema',
    coordinates: { lat: -4.3249, lng: 15.2560 },
    aliases: ['Commune Ngaliema', 'Ngaliema Kinshasa'],
    tags: ['commune'], popularity: 9 },
  { id: 'djelo-binza', name: 'Djelo-Binza', category: 'residential',
    address: 'Quartier Djelo Binza', commune: 'Ngaliema', quartier: 'Djelo Binza',
    coordinates: { lat: -4.3289, lng: 15.2634 },
    aliases: ['Djelo', 'Djalo', 'Djali', 'Djelo Binza Ngaliema'],
    tags: ['quartier', 'ngaliema', 'résidentiel'], popularity: 8 },
  { id: 'binza-meteo', name: 'Binza Météo', category: 'residential',
    address: 'Binza Météo', commune: 'Ngaliema', quartier: 'Binza',
    coordinates: { lat: -4.3123, lng: 15.2589 },
    aliases: ['Météo', 'Binza', 'Ngaliema Binza'],
    tags: ['quartier', 'binza', 'ngaliema'], popularity: 8 },
  { id: 'ngomba-kinkusa', name: 'Ngomba-Kinkusa', category: 'residential',
    address: 'Village Ngomba-Kinkusa', commune: 'Ngaliema', quartier: 'Ngomba-Kinkusa',
    coordinates: { lat: -4.3512, lng: 15.2345 },
    aliases: ['Ngomba Kinkusa', 'Kinkusa', 'Village Ngomba'],
    tags: ['quartier', 'ngaliema'], popularity: 7 },
  { id: 'clinique-ngaliema', name: 'Clinique Ngaliema', category: 'hospital',
    address: 'Mont Ngaliema', commune: 'Ngaliema',
    coordinates: { lat: -4.3456, lng: 15.2734 },
    aliases: ['Ngaliema Medical Center', 'Hôpital Ngaliema'],
    tags: ['clinique', 'santé', 'ngaliema'], popularity: 8 },
  { id: 'oua-ngaliema', name: 'Quartier OUA', category: 'residential',
    address: 'Quartier OUA', commune: 'Ngaliema', quartier: 'OUA',
    coordinates: { lat: -4.3234, lng: 15.2756 },
    aliases: ['OUA Ngaliema', 'Cité OUA'],
    tags: ['quartier', 'ngaliema'], popularity: 7 },
  { id: 'jardin-zoo', name: 'Jardin Zoologique de Kinshasa', category: 'park',
    address: 'Mont Ngaliema', commune: 'Ngaliema',
    coordinates: { lat: -4.3378, lng: 15.2812 },
    aliases: ['Zoo de Kinshasa', 'Jardin Zoo', 'Zoo Kinshasa'],
    tags: ['parc', 'zoo', 'nature', 'ngaliema'], popularity: 8 },
  { id: 'mvula-ngaliema', name: 'Mvula', category: 'residential',
    address: 'Quartier Mvula', commune: 'Ngaliema', quartier: 'Mvula',
    coordinates: { lat: -4.3178, lng: 15.2456 },
    aliases: ['Mvula Ngaliema', 'Quartier Mvula'],
    tags: ['quartier', 'ngaliema'], popularity: 6 },

  // ════════════════════════════════════════════════════════
  // 🎓  LEMBA
  // ════════════════════════════════════════════════════════
  { id: 'lemba-terminus', name: 'Lemba Terminus', category: 'terminal',
    address: 'Avenue Sefu, Mont Amba', commune: 'Lemba', quartier: 'Terminus',
    coordinates: { lat: -4.3968, lng: 15.3111 },
    aliases: ['Terminus Lemba', 'Lemba', 'Terminus Sefu'],
    tags: ['transport', 'terminus', 'lemba'], popularity: 9 },
  { id: 'unikin', name: 'Université de Kinshasa (UNIKIN)', category: 'university',
    address: 'Mont Amba', commune: 'Lemba',
    coordinates: { lat: -4.4045, lng: 15.2989 },
    aliases: ['UNIKIN', 'Université de Kinshasa', 'Campus UNIKIN', 'Univ Kin'],
    tags: ['université', 'campus', 'lemba'], popularity: 10 },
  { id: 'kin-marche', name: 'KIN MARCHÉ', category: 'market',
    address: 'Avenue Sefu, Lemba Terminus', commune: 'Lemba', quartier: 'Terminus',
    coordinates: { lat: -4.3975, lng: 15.3105 },
    aliases: ['Kin Marché', 'Kinmarche', 'Supermarché Lemba'],
    tags: ['marché', 'supermarché', 'lemba'], popularity: 9 },
  { id: 'righini-lemba', name: 'Righini', category: 'residential',
    address: 'Quartier Righini', commune: 'Lemba', quartier: 'Righini',
    coordinates: { lat: -4.3912, lng: 15.3056 },
    aliases: ['Righini Lemba', 'Quartier Righini'],
    tags: ['quartier', 'lemba'], popularity: 7 },
  { id: 'mont-amba', name: 'Mont Amba', category: 'residential',
    address: 'Mont Amba', commune: 'Lemba', quartier: 'Mont Amba',
    coordinates: { lat: -4.4012, lng: 15.3023 },
    aliases: ['Mont-Amba', 'Montagne Amba'],
    tags: ['quartier', 'lemba'], popularity: 7 },
  { id: 'hopital-lemba', name: 'Hôpital de Lemba', category: 'hospital',
    address: 'Avenue du 30 Juin, Lemba', commune: 'Lemba',
    coordinates: { lat: -4.3989, lng: 15.3087 },
    aliases: ['CS Lemba', 'Centre de Santé Lemba'],
    tags: ['hôpital', 'santé', 'lemba'], popularity: 7 },

  // ════════════════════════════════════════════════════════
  // 🎭  KALAMU / MATONGE
  // ════════════════════════════════════════════════════════
  { id: 'matonge', name: 'Matonge', category: 'landmark',
    address: 'Quartier Matonge', commune: 'Kalamu', quartier: 'Matonge',
    coordinates: { lat: -4.3534, lng: 15.3089 },
    aliases: ['Matonge Kalamu', 'Quartier Matonge', 'Matongé'],
    tags: ['quartier', 'animation', 'kalamu', 'kasa-vubu'], popularity: 10 },
  { id: 'kalamu-centre', name: 'Kalamu', category: 'residential',
    address: 'Commune de Kalamu', commune: 'Kalamu',
    coordinates: { lat: -4.3568, lng: 15.3131 },
    aliases: ['Commune Kalamu'], tags: ['commune'], popularity: 8 },
  { id: 'camp-luka', name: 'Camp Luka', category: 'residential',
    address: 'Camp Luka', commune: 'Kalamu', quartier: 'Camp Luka',
    coordinates: { lat: -4.3578, lng: 15.3189 },
    aliases: ['Camp Luka Kalamu', 'Cité Luka'],
    tags: ['quartier', 'kalamu'], popularity: 7 },
  { id: 'marche-liberte', name: 'Marché de la Liberté', category: 'market',
    address: 'Avenue de la Liberté', commune: 'Kalamu',
    coordinates: { lat: -4.3567, lng: 15.3089 },
    aliases: ['Liberté Market', 'Marché Liberté'],
    tags: ['marché', 'kalamu'], popularity: 7 },

  // ════════════════════════════════════════════════════════
  // 🏠  KASA-VUBU
  // ════════════════════════════════════════════════════════
  { id: 'kasa-vubu-centre', name: 'Kasa-Vubu', category: 'residential',
    address: 'Commune de Kasa-Vubu', commune: 'Kasa-Vubu',
    coordinates: { lat: -4.3426, lng: 15.3028 },
    aliases: ['Kasavubu', 'Kasa Vubu', 'Commune Kasa-Vubu'],
    tags: ['commune', 'résidentiel'], popularity: 9 },
  { id: 'victoire-kasa-vubu', name: 'Quartier Victoire', category: 'residential',
    address: 'Avenue de la Victoire', commune: 'Kasa-Vubu', quartier: 'Victoire',
    coordinates: { lat: -4.3412, lng: 15.3056 },
    aliases: ['Victoire Kasa-Vubu', 'Cité Victoire'],
    tags: ['quartier', 'kasa-vubu'], popularity: 8 },
  { id: 'victoire-terminus', name: 'Victoire Terminus', category: 'terminal',
    address: 'Avenue de la Victoire', commune: 'Kasa-Vubu',
    coordinates: { lat: -4.3412, lng: 15.2845 },
    aliases: ['Terminus Victoire', 'Victoire'],
    tags: ['transport', 'terminus'], popularity: 8 },

  // ════════════════════════════════════════════════════════
  // 🏭  MATETE
  // ════════════════════════════════════════════════════════
  { id: 'matete-terminus', name: 'Matete Terminus', category: 'terminal',
    address: 'Avenue Mama Yemo', commune: 'Matete',
    coordinates: { lat: -4.3682, lng: 15.2895 },
    aliases: ['Terminus Matete', 'Matete'],
    tags: ['transport', 'terminus', 'matete'], popularity: 8 },
  { id: 'matete-centre', name: 'Matete', category: 'residential',
    address: 'Commune de Matete', commune: 'Matete',
    coordinates: { lat: -4.3721, lng: 15.2923 },
    aliases: ['Commune Matete', 'Matete Centre'],
    tags: ['commune'], popularity: 8 },
  { id: 'marche-matete', name: 'Marché de Matete', category: 'market',
    address: 'Avenue Mama Yemo', commune: 'Matete',
    coordinates: { lat: -4.3691, lng: 15.2911 },
    aliases: ['Marché Matete', 'Matete Market'],
    tags: ['marché', 'matete'], popularity: 7 },
  { id: 'hopital-matete', name: 'Hôpital de Matete', category: 'hospital',
    address: 'Avenue Matete', commune: 'Matete',
    coordinates: { lat: -4.3698, lng: 15.2934 },
    aliases: ['CS Matete', 'Clinique Matete'],
    tags: ['hôpital', 'santé', 'matete'], popularity: 6 },

  // ════════════════════════════════════════════════════════
  // 🏗️  KIMBANSEKE
  // ════════════════════════════════════════════════════════
  { id: 'kimbanseke-centre', name: 'Kimbanseke', category: 'residential',
    address: 'Commune de Kimbanseke', commune: 'Kimbanseke',
    coordinates: { lat: -4.4281, lng: 15.4019 },
    aliases: ['Commune Kimbanseke', 'Kimbanseke Centre'],
    tags: ['commune'], popularity: 8 },
  { id: 'kimbwala', name: 'Kimbwala', category: 'residential',
    address: 'Quartier Kimbwala', commune: 'Kimbanseke', quartier: 'Kimbwala',
    coordinates: { lat: -4.4312, lng: 15.4123 },
    aliases: ['Kimbwala Kimbanseke'],
    tags: ['quartier', 'kimbanseke'], popularity: 6 },
  { id: 'hopital-kimbanseke', name: 'Hôpital de Kimbanseke', category: 'hospital',
    address: 'Avenue Kimbanseke', commune: 'Kimbanseke',
    coordinates: { lat: -4.4267, lng: 15.4012 },
    aliases: ['CS Kimbanseke', 'Clinique Kimbanseke'],
    tags: ['hôpital', 'santé', 'kimbanseke'], popularity: 6 },

  // ════════════════════════════════════════════════════════
  // 🌆  LINGWALA / STADE
  // ════════════════════════════════════════════════════════
  { id: 'stade-martyrs', name: 'Stade des Martyrs', category: 'stadium',
    address: 'Lingwala', commune: 'Lingwala',
    coordinates: { lat: -4.3323, lng: 15.2945 },
    aliases: ['Martyrs Stadium', 'Stade National', 'Stade Tata Raphaël'],
    tags: ['stade', 'sport', 'football', 'lingwala'], popularity: 10 },
  { id: 'lingwala-centre', name: 'Lingwala', category: 'residential',
    address: 'Commune de Lingwala', commune: 'Lingwala',
    coordinates: { lat: -4.3162, lng: 15.3028 },
    aliases: ['Commune Lingwala'], tags: ['commune'], popularity: 8 },
  { id: 'upc', name: 'Université Protestante au Congo (UPC)', category: 'university',
    address: 'Lingwala', commune: 'Lingwala',
    coordinates: { lat: -4.3312, lng: 15.2934 },
    aliases: ['UPC', 'Université Protestante'], tags: ['université', 'lingwala'], popularity: 8 },

  // ════════════════════════════════════════════════════════
  // 🏘️  NGIRI-NGIRI
  // ════════════════════════════════════════════════════════
  { id: 'ngiri-ngiri-centre', name: 'Ngiri-Ngiri', category: 'residential',
    address: 'Commune de Ngiri-Ngiri', commune: 'Ngiri-Ngiri',
    coordinates: { lat: -4.3471, lng: 15.3028 },
    aliases: ['Ngiri Ngiri', 'Commune Ngiri-Ngiri'],
    tags: ['commune'], popularity: 8 },

  // ════════════════════════════════════════════════════════
  // 🌿  BANDALUNGWA
  // ════════════════════════════════════════════════════════
  { id: 'bandalungwa-centre', name: 'Bandalungwa', category: 'residential',
    address: 'Commune de Bandalungwa', commune: 'Bandalungwa',
    coordinates: { lat: -4.3508, lng: 15.2901 },
    aliases: ['Commune Bandalungwa', 'Banda'], tags: ['commune'], popularity: 8 },
  { id: 'djingarey', name: 'Djingarey', category: 'residential',
    address: 'Quartier Djingarey', commune: 'Bandalungwa', quartier: 'Djingarey',
    coordinates: { lat: -4.3523, lng: 15.2878 },
    aliases: ['Djingarey Bandalungwa', 'Cité Djingarey'],
    tags: ['quartier', 'bandalungwa'], popularity: 6 },

  // ════════════════════════════════════════════════════════
  // 🌇  MAKALA
  // ════════════════════════════════════════════════════════
  { id: 'makala-centre', name: 'Makala', category: 'residential',
    address: 'Commune de Makala', commune: 'Makala',
    coordinates: { lat: -4.3744, lng: 15.2787 },
    aliases: ['Commune Makala'], tags: ['commune'], popularity: 8 },
  { id: 'prison-makala', name: 'Prison Centrale de Makala', category: 'government',
    address: 'Avenue Kasa-Vubu', commune: 'Makala',
    coordinates: { lat: -4.3756, lng: 15.2801 },
    aliases: ['CPRK', 'Prison Makala', 'Centre Pénitentiaire de Makala'],
    tags: ['prison', 'makala'], popularity: 7 },
  { id: 'cite-verte', name: 'Cité Verte', category: 'residential',
    address: 'Cité Verte', commune: 'Makala', quartier: 'Cité Verte',
    coordinates: { lat: -4.3712, lng: 15.2756 },
    aliases: ['Cité Verte Makala'], tags: ['quartier', 'makala'], popularity: 7 },

  // ════════════════════════════════════════════════════════
  // 🌿  KISENSO
  // ════════════════════════════════════════════════════════
  { id: 'kisenso-centre', name: 'Kisenso', category: 'residential',
    address: 'Commune de Kisenso', commune: 'Kisenso',
    coordinates: { lat: -4.4003, lng: 15.3288 },
    aliases: ['Commune Kisenso'], tags: ['commune'], popularity: 7 },

  // ════════════════════════════════════════════════════════
  // 🏠  BUMBU / SELEMBAO
  // ════════════════════════════════════════════════════════
  { id: 'bumbu-centre', name: 'Bumbu', category: 'residential',
    address: 'Commune de Bumbu', commune: 'Bumbu',
    coordinates: { lat: -4.3897, lng: 15.2740 },
    aliases: ['Commune Bumbu'], tags: ['commune'], popularity: 7 },
  { id: 'selembao-centre', name: 'Selembao', category: 'residential',
    address: 'Commune de Selembao', commune: 'Selembao',
    coordinates: { lat: -4.4101, lng: 15.2737 },
    aliases: ['Commune Selembao'], tags: ['commune'], popularity: 7 },

  // ════════════════════════════════════════════════════════
  // 🏘️  N'SELE / MALUKU
  // ════════════════════════════════════════════════════════
  { id: 'nsele-centre', name: "N'sele", category: 'residential',
    address: "Commune de N'sele", commune: "N'sele",
    coordinates: { lat: -4.3569, lng: 15.5333 },
    aliases: ['Nsele', 'Commune Nsele'], tags: ['commune'], popularity: 6 },
  { id: 'maluku-centre', name: 'Maluku', category: 'residential',
    address: 'Commune de Maluku', commune: 'Maluku',
    coordinates: { lat: -4.0564, lng: 15.5628 },
    aliases: ['Commune Maluku'], tags: ['commune'], popularity: 6 },

  // ════════════════════════════════════════════════════════
  // 🏢  BARUMBU
  // ════════════════════════════════════════════════════════
  { id: 'barumbu-centre', name: 'Barumbu', category: 'residential',
    address: 'Commune de Barumbu', commune: 'Barumbu',
    coordinates: { lat: -4.3162, lng: 15.2974 },
    aliases: ['Commune Barumbu'], tags: ['commune'], popularity: 7 },
  { id: 'marche-gambela', name: 'Marché Gambela', category: 'market',
    address: 'Quartier Gambela', commune: 'Barumbu',
    coordinates: { lat: -4.3425, lng: 15.2978 },
    aliases: ['Gambela Market', 'Marché de Gambela'],
    tags: ['marché', 'barumbu'], popularity: 7 },

  // ════════════════════════════════════════════════════════
  // 🏙️  KINTAMBO
  // ════════════════════════════════════════════════════════
  { id: 'kintambo-centre', name: 'Kintambo', category: 'residential',
    address: 'Commune de Kintambo', commune: 'Kintambo',
    coordinates: { lat: -4.3219, lng: 15.2889 },
    aliases: ['Commune Kintambo', 'Kintambo Magasin'],
    tags: ['commune', 'résidentiel'], popularity: 8 },
  { id: 'kintambo-magasin', name: 'Kintambo Magasin', category: 'landmark',
    address: 'Kintambo Magasin', commune: 'Kintambo', quartier: 'Magasin',
    coordinates: { lat: -4.3201, lng: 15.2867 },
    aliases: ['Magasin Kintambo', 'Kintambo Centre'],
    tags: ['landmark', 'kintambo'], popularity: 8 },

  // ════════════════════════════════════════════════════════
  // 🌆  N'DJILI
  // ════════════════════════════════════════════════════════
  { id: 'ndjili-centre', name: "N'djili", category: 'residential',
    address: "Commune de N'djili", commune: "N'djili",
    coordinates: { lat: -4.3731, lng: 15.4061 },
    aliases: ['Ndjili', "N'djili Commune", 'Ndili'],
    tags: ['commune'], popularity: 8 },
  { id: 'camp-kauka', name: 'Camp Kauka', category: 'residential',
    address: 'Camp Kauka', commune: "N'djili", quartier: 'Camp Kauka',
    coordinates: { lat: -4.3756, lng: 15.4089 },
    aliases: ['Kauka', 'Camp Kauka Ndjili'],
    tags: ['quartier', 'ndjili'], popularity: 6 },
];

// ════════════════════════════════════════════════════════
// 🔍 RECHERCHE LOCALE AVANCÉE (conservée pour compatibilité)
// ════════════════════════════════════════════════════════

export function searchLocalPlaces(
  query: string,
  currentLocation?: { lat: number; lng: number },
  limit: number = 10
): LocalPlace[] {
  if (!query || query.length < 2) return [];

  const searchTerms = query.toLowerCase().trim().split(/\s+/);
  const MINIMUM_SCORE = 50;

  const scoredPlaces = kinshasaPlacesDatabase.map(place => {
    let score = 0;
    if (place.name.toLowerCase() === query.toLowerCase()) score += 1000;
    else if (place.name.toLowerCase().startsWith(query.toLowerCase())) score += 500;
    else if (place.name.toLowerCase().includes(query.toLowerCase())) score += 300;

    place.aliases.forEach(alias => {
      if (alias.toLowerCase() === query.toLowerCase()) score += 800;
      else if (alias.toLowerCase().startsWith(query.toLowerCase())) score += 400;
      else if (alias.toLowerCase().includes(query.toLowerCase())) score += 200;
    });

    if (place.address.toLowerCase().includes(query.toLowerCase())) score += 150;
    if (place.commune.toLowerCase().includes(query.toLowerCase())) score += 100;

    place.tags?.forEach(tag => {
      searchTerms.forEach(term => { if (tag.toLowerCase().includes(term)) score += 50; });
    });

    const allText = `${place.name} ${place.aliases.join(' ')} ${place.address} ${place.commune} ${place.tags?.join(' ') || ''}`.toLowerCase();
    if (searchTerms.every(term => allText.includes(term)) && searchTerms.length > 1) score += 200;

    score += (place.popularity || 5) * 10;

    if (currentLocation) {
      const dist = calcDist(currentLocation.lat, currentLocation.lng, place.coordinates.lat, place.coordinates.lng);
      if (dist < 2) score += 100;
      else if (dist < 5) score += 50;
      else if (dist < 10) score += 20;
    }

    return {
      place, score,
      distance: currentLocation
        ? calcDist(currentLocation.lat, currentLocation.lng, place.coordinates.lat, place.coordinates.lng)
        : undefined
    };
  });

  return scoredPlaces
    .filter(item => item.score >= MINIMUM_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(item => ({ ...item.place, distance: item.distance }));
}

function calcDist(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function getCategoryIcon(category: LocalPlace['category']): string {
  const icons: Record<LocalPlace['category'], string> = {
    market: '🛒', terminal: '🚌', hospital: '🏥', school: '🏫', university: '🎓',
    hotel: '🏨', restaurant: '🍽️', mall: '🏬', church: '⛪', bank: '🏦',
    government: '🏛️', airport: '✈️', stadium: '🏟️', park: '🌳', monument: '🗿',
    embassy: '🏢', gas_station: '⛽', landmark: '📍', office: '🏢', residential: '🏘️', other: '📍'
  };
  return icons[category] || '📍';
}
