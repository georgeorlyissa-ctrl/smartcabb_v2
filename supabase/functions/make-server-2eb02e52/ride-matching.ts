import * as kv from "./kv-wrapper.ts";

/**
 * Trouve le meilleur conducteur pour une course
 * Basé sur proximité et note
 */
export async function findBestDriver(pickup: { lat: number; lng: number }, vehicleCategory: string) {
  const allDrivers = await kv.getByPrefix<any>('driver:');
  
  // Filtre: en ligne, catégorie correcte, solde >= 0
  const availableDrivers = allDrivers.filter(d => 
    d.status === 'online' && 
    d.vehicleCategory === vehicleCategory &&
    (d.balance || 0) >= 0
  );

  if (availableDrivers.length === 0) {
    return null;
  }

  // Calcule la distance et trie par proximité puis note
  const driversWithDistance = availableDrivers.map(d => {
    const distance = calculateDistance(pickup, d.location);
    return { ...d, distance };
  });

  driversWithDistance.sort((a, b) => {
    if (Math.abs(a.distance - b.distance) < 0.5) {
      // Si distances similaires, privilégier la meilleure note
      return (b.rating || 0) - (a.rating || 0);
    }
    return a.distance - b.distance;
  });

  return driversWithDistance[0];
}

function calculateDistance(point1: { lat: number; lng: number }, point2: { lat: number; lng: number }): number {
  const R = 6371; // Rayon de la Terre en km
  const dLat = deg2rad(point2.lat - point1.lat);
  const dLon = deg2rad(point2.lng - point1.lng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(point1.lat)) * Math.cos(deg2rad(point2.lat)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}
