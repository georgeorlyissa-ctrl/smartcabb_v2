/**
 * 🗺️ ZONING SMARTCABB — Classification par géolocalisation
 * Zone A : tarif normal
 * Zone B : 1ère heure facturée double (une seule fois par course)
 * Zone C : facturation forfaitaire journalière obligatoire
 *
 * ⚠️ Coordonnées vérifiées août 2026 (Wikipédia / OSM / Yandex) —
 * à ajuster sur le terrain si nécessaire.
 */

export type ZoneCode = 'A' | 'B' | 'C';

interface ZonePoint {
  commune: string;
  zone: ZoneCode;
  lat: number;
  lng: number;
}

/** Rayon max (km) au-delà duquel un point n'est rattaché à aucune commune connue → Zone A par défaut */
export const MAX_ZONE_RADIUS_KM = 15;

export const ZONE_REFERENCE_POINTS: ZonePoint[] = [
  // ── ZONE A — Tarif normal ──────────────────────────────
  { commune: 'Gombe', zone: 'A', lat: -4.3006, lng: 15.2926 },
  { commune: 'Lingwala', zone: 'A', lat: -4.3184, lng: 15.2930 },
  { commune: 'Kasa-Vubu', zone: 'A', lat: -4.3444, lng: 15.3011 },
  { commune: 'Bandalungwa', zone: 'A', lat: -4.3535, lng: 15.2875 },
  { commune: 'Ngiri-Ngiri', zone: 'A', lat: -4.3596, lng: 15.2989 },
  { commune: 'Kalamu', zone: 'A', lat: -4.3629, lng: 15.3106 },
  { commune: 'Kinshasa', zone: 'A', lat: -4.3272, lng: 15.3086 },
  { commune: 'Barumbu', zone: 'A', lat: -4.3213, lng: 15.3143 },
  { commune: 'Limete', zone: 'A', lat: -4.3389, lng: 15.3389 },
  { commune: 'Cité du Fleuve', zone: 'A', lat: -4.3267, lng: 15.3528 },

  // ── ZONE B — 1ère heure doublée ────────────────────────
  { commune: 'Pompage', zone: 'B', lat: -4.3927, lng: 15.2225 },
  { commune: 'Mbudi', zone: 'B', lat: -4.3649, lng: 15.1901 },
  { commune: 'CPA', zone: 'B', lat: -4.3475, lng: 15.2023 },
  { commune: 'UPN/UNIKIN', zone: 'B', lat: -4.4285, lng: 15.3103 },
  { commune: 'Cité Verte', zone: 'B', lat: -4.3775, lng: 15.2611 },
  { commune: 'Mont Ngafula', zone: 'B', lat: -4.4636, lng: 15.2725 },
  { commune: 'Ngaba', zone: 'B', lat: -4.3838, lng: 15.3161 },
  { commune: 'Makala', zone: 'B', lat: -4.3908, lng: 15.2989 },
  { commune: 'Kisenso', zone: 'B', lat: -4.3917, lng: 15.3611 },
  { commune: 'Lemba', zone: 'B', lat: -4.4308, lng: 15.3181 },
  { commune: 'Masina', zone: 'B', lat: -4.3722, lng: 15.3833 },
  { commune: 'Kimbanseke', zone: 'B', lat: -4.3833, lng: 15.4167 },
  { commune: 'Ndjili', zone: 'B', lat: -4.3814, lng: 15.3644 },
  { commune: 'Selembao', zone: 'B', lat: -4.4022, lng: 15.2833 },

  // ── ZONE C — Forfait journalier obligatoire ────────────
  { commune: 'Matadi Kibala', zone: 'C', lat: -4.4436, lng: 15.2417 },
  { commune: 'Mitendi', zone: 'C', lat: -4.4633, lng: 15.1858 },
  { commune: 'Kimwenza Gare', zone: 'C', lat: -4.4864, lng: 15.2758 },
  { commune: 'Aéroport de Ndjili', zone: 'C', lat: -4.3858, lng: 15.4446 },
  { commune: 'Bibwa', zone: 'C', lat: -4.3763, lng: 15.4708 },
  { commune: 'Nsele', zone: 'C', lat: -4.3209, lng: 15.5141 },
  { commune: 'Kimpoko-Nsele', zone: 'C', lat: -4.2344, lng: 15.5503 },
  { commune: 'Maluku', zone: 'C', lat: -4.0494, lng: 15.5706 },
];

/**
 * Distance en km entre 2 points GPS (formule de Haversine)
 */
export function haversineDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // rayon de la Terre en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * 📍 Détermine la zone (A/B/C) d'un point GPS
 * en cherchant la commune de référence la plus proche.
 * Au-delà de MAX_ZONE_RADIUS_KM, retombe sur la Zone A (par défaut).
 */
export function classifyZone(
  lat: number,
  lng: number
): { zone: ZoneCode; nearestCommune: string; distanceKm: number; withinRadius: boolean } {
  if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
    return { zone: 'A', nearestCommune: 'Inconnu', distanceKm: 0, withinRadius: false };
  }

  let closest: ZonePoint | null = null;
  let minDist = Infinity;

  for (const point of ZONE_REFERENCE_POINTS) {
    const dist = haversineDistanceKm(lat, lng, point.lat, point.lng);
    if (dist < minDist) {
      minDist = dist;
      closest = point;
    }
  }

  if (!closest) {
    // Fallback sécurité — zone A par défaut si rien trouvé
    return { zone: 'A', nearestCommune: 'Inconnu', distanceKm: 0, withinRadius: false };
  }

  const withinRadius = minDist <= MAX_ZONE_RADIUS_KM;

  return {
    zone: withinRadius ? closest.zone : 'A',
    nearestCommune: closest.commune,
    distanceKm: minDist,
    withinRadius,
  };
}

/**
 * 🧮 Détermine la zone à appliquer pour une course (pickup + destination)
 * Règle : si l'une des deux extrémités est en Zone C → Zone C (forfait jour)
 *         sinon si l'une des deux est en Zone B → Zone B (1ère heure doublée, 1x)
 *         sinon → Zone A (normal)
 */
export function classifyRideZone(
  pickup: { lat: number; lng: number },
  destination: { lat: number; lng: number }
): { zone: ZoneCode; details: { pickup: ZoneCode; destination: ZoneCode } } {
  const pickupResult = classifyZone(pickup.lat, pickup.lng);
  const destResult = classifyZone(destination.lat, destination.lng);

  const pickupZone = pickupResult.zone;
  const destZone = destResult.zone;

  let finalZone: ZoneCode = 'A';
  if (pickupZone === 'C' || destZone === 'C') {
    finalZone = 'C';
  } else if (pickupZone === 'B' || destZone === 'B') {
    finalZone = 'B';
  }

  return { zone: finalZone, details: { pickup: pickupZone, destination: destZone } };
}
