/**
 * 🎯 SERVICE DE MATCHING DE COURSES
 * 
 * Gère :
 * - Recherche de chauffeurs disponibles à proximité
 * - Attribution de course
 * - Timeout et réattribution
 * - Notifications en temps réel
 */

import * as kv from './kv-wrapper.tsx';

interface Location {
  lat: number;
  lng: number;
  address?: string;
}

interface Driver {
  id: string;
  name: string;
  vehicleType: string;
  rating: number;
  location: Location;
  status: 'available' | 'busy' | 'offline';
  phone?: string;
}

interface RideRequest {
  id: string;
  passengerId: string;
  passengerName: string;
  passengerPhone?: string;
  passengerRating?: number;
  pickup: Location;
  destination?: Location;
  vehicleType: string;
  estimatedPrice: number;
  estimatedDistance: number;
  estimatedDuration: number;
  status: 'pending' | 'assigned' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  assignedDriverId?: string;
  assignedAt?: string;
  acceptedAt?: string;
  rejectedBy?: string[]; // IDs des chauffeurs qui ont refusé
  createdAt: string;
}

// 📏 Calculer distance entre deux points (formule de Haversine)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Rayon de la Terre en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// 🔍 Trouver les chauffeurs disponibles à proximité
export async function findNearbyDrivers(
  location: Location,
  vehicleType: string,
  maxDistance: number = 5 // km
): Promise<Driver[]> {
  console.log('🔍 Recherche chauffeurs proches:', { location, vehicleType, maxDistance });

  // Récupérer tous les chauffeurs
  const allDrivers = await kv.getByPrefix('driver:');
  
  if (!allDrivers || allDrivers.length === 0) {
    console.log('❌ Aucun chauffeur trouvé');
    return [];
  }

  console.log(`📊 ${allDrivers.length} chauffeurs trouvés`);

  // Filtrer par disponibilité, type de véhicule et distance
  const nearbyDrivers = allDrivers
    .map(d => d as Driver)
    .filter(driver => {
      // Disponible
      if (driver.status !== 'available') {
        return false;
      }

      // Type de véhicule correspond
      if (driver.vehicleType !== vehicleType) {
        return false;
      }

      // Distance acceptable
      const distance = calculateDistance(
        location.lat,
        location.lng,
        driver.location.lat,
        driver.location.lng
      );

      return distance <= maxDistance;
    })
    .map(driver => {
      // Ajouter la distance calculée
      const distance = calculateDistance(
        location.lat,
        location.lng,
        driver.location.lat,
        driver.location.lng
      );
      return { ...driver, distance };
    })
    .sort((a, b) => {
      // Trier par distance puis par note
      if (a.distance === b.distance) {
        return b.rating - a.rating;
      }
      return a.distance - b.distance;
    });

  console.log(`✅ ${nearbyDrivers.length} chauffeurs disponibles à proximité`);
  return nearbyDrivers as Driver[];
}

// 📤 Assigner une course à un chauffeur
export async function assignRideToDriver(
  rideId: string,
  driverId: string
): Promise<boolean> {
  console.log(`📤 Attribution course ${rideId} au chauffeur ${driverId}`);

  try {
    // Récupérer la course
    const ride = await kv.get(`ride:${rideId}`) as RideRequest | null;
    if (!ride) {
      console.error('❌ Course introuvable');
      return false;
    }

    // Vérifier que la course est toujours en attente
    if (ride.status !== 'pending') {
      console.error('❌ Course déjà assignée ou terminée');
      return false;
    }

    // Marquer comme assignée
    ride.status = 'assigned';
    ride.assignedDriverId = driverId;
    ride.assignedAt = new Date().toISOString();

    await kv.set(`ride:${rideId}`, ride);

    // Créer une notification pour le chauffeur
    await kv.set(`notification:driver:${driverId}:${rideId}`, {
      type: 'ride_request',
      rideId,
      driverId,
      createdAt: new Date().toISOString(),

      expiresAt: new Date(Date.now() + 10000).toISOString() // ⚡ 10 secondes (optimisé)

      expiresAt: new Date(Date.now() + 15000).toISOString() // 15 secondes

    });

    console.log('✅ Course assignée avec succès');
    return true;
  } catch (error) {
    console.error('❌ Erreur attribution course:', error);
    return false;
  }
}

// ✅ Accepter une course (chauffeur)
export async function acceptRide(rideId: string, driverId: string): Promise<boolean> {
  console.log(`✅ Chauffeur ${driverId} accepte course ${rideId}`);

  try {
    const ride = await kv.get(`ride:${rideId}`) as RideRequest | null;
    if (!ride) {
      return false;
    }

    // Vérifier que c'est le bon chauffeur
    if (ride.assignedDriverId !== driverId) {
      console.error('❌ Course assignée à un autre chauffeur');
      return false;
    }

    // Vérifier le statut
    if (ride.status !== 'assigned') {
      console.error('❌ Course non assignée ou déjà acceptée');
      return false;
    }

    // Marquer comme acceptée
    ride.status = 'accepted';
    ride.acceptedAt = new Date().toISOString();
    await kv.set(`ride:${rideId}`, ride);

    // Mettre à jour le statut du chauffeur
    const driver = await kv.get(`driver:${driverId}`) as Driver | null;
    if (driver) {
      driver.status = 'busy';
      await kv.set(`driver:${driverId}`, driver);
    }

    // Supprimer la notification
    await kv.del(`notification:driver:${driverId}:${rideId}`);

    console.log('✅ Course acceptée');
    return true;
  } catch (error) {
    console.error('❌ Erreur acceptation course:', error);
    return false;
  }
}

// ❌ Refuser une course (chauffeur)
export async function declineRide(rideId: string, driverId: string): Promise<boolean> {
  console.log(`❌ Chauffeur ${driverId} refuse course ${rideId}`);

  try {
    const ride = await kv.get(`ride:${rideId}`) as RideRequest | null;
    if (!ride) {
      return false;
    }

    // Ajouter à la liste des refus
    if (!ride.rejectedBy) {
      ride.rejectedBy = [];
    }
    ride.rejectedBy.push(driverId);

    // Remettre en attente
    ride.status = 'pending';
    ride.assignedDriverId = undefined;
    ride.assignedAt = undefined;

    await kv.set(`ride:${rideId}`, ride);

    // Supprimer la notification
    await kv.del(`notification:driver:${driverId}:${rideId}`);

    console.log('✅ Course refusée, recherche d\'un autre chauffeur...');
    
    // Essayer d'assigner à un autre chauffeur
    await findAndAssignDriver(rideId);

    return true;
  } catch (error) {
    console.error('❌ Erreur refus course:', error);
    return false;
  }
}

// 🎯 Trouver et assigner automatiquement un chauffeur
export async function findAndAssignDriver(rideId: string): Promise<boolean> {
  console.log(`🎯 Recherche chauffeur pour course ${rideId}`);

  try {
    const ride = await kv.get(`ride:${rideId}`) as RideRequest | null;
    if (!ride) {
      console.error('❌ Course introuvable');
      return false;
    }

    // Trouver chauffeurs disponibles
    const drivers = await findNearbyDrivers(
      ride.pickup,
      ride.vehicleType,
      10 // 10 km max
    );

    if (drivers.length === 0) {
      console.log('❌ Aucun chauffeur disponible');
      return false;
    }

    // Exclure ceux qui ont déjà refusé
    const rejectedIds = ride.rejectedBy || [];
    const availableDrivers = drivers.filter(d => !rejectedIds.includes(d.id));

    if (availableDrivers.length === 0) {
      console.log('❌ Tous les chauffeurs proches ont refusé');
      return false;
    }

    // Assigner au premier chauffeur disponible (le plus proche)
    const selectedDriver = availableDrivers[0];
    console.log(`✅ Chauffeur sélectionné: ${selectedDriver.name}`);

    return await assignRideToDriver(rideId, selectedDriver.id);
  } catch (error) {
    console.error('❌ Erreur recherche et attribution:', error);
    return false;
  }
}

// ⏱️ Gérer le timeout d'une assignation
export async function handleRideTimeout(rideId: string, driverId: string): Promise<void> {
  console.log(`⏱️ Timeout course ${rideId} pour chauffeur ${driverId}`);

  const ride = await kv.get(`ride:${rideId}`) as RideRequest | null;
  if (!ride) {
    return;
  }

  // Si toujours assignée au même chauffeur et pas acceptée
  if (ride.assignedDriverId === driverId && ride.status === 'assigned') {
    console.log('⏱️ Course expirée, réattribution...');
    await declineRide(rideId, driverId);
  }
}
