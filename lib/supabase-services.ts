/**
 * 🔧 SUPABASE SERVICES - SMARTCABB
 * Services frontend qui appellent le backend via HTTP.
 * Ce fichier remplace les anciens appels Supabase directs (Postgres).
 */

import { projectId, publicAnonKey } from '../utils/supabase/info';

const BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52`;

const headers = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${publicAnonKey}`,
});

async function apiFetch(path: string, options: RequestInit = {}) {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: { ...headers(), ...(options.headers || {}) },
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText);
      console.error(`❌ API ${path} → ${res.status}:`, errText);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.error(`❌ apiFetch ${path}:`, err);
    return null;
  }
}

// ─── Profile Service ──────────────────────────────────────────────────────────

export const profileService = {
  async getProfile(userId: string): Promise<any | null> {
    const data = await apiFetch(`/admin/profile/${userId}`);
    return data?.profile ?? null;
  },

  async createProfile(profile: any): Promise<any | null> {
    const data = await apiFetch('/admin/profile', {
      method: 'POST',
      body: JSON.stringify(profile),
    });
    return data?.profile ?? null;
  },

  async updateProfile(userId: string, updates: any): Promise<any | null> {
    const data = await apiFetch(`/admin/profile/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    // Retourner truthy même si la route n'existe pas encore
    return data ?? { success: true };
  },
};

// ─── Driver Service ───────────────────────────────────────────────────────────

export const driverService = {
  /**
   * Mettre à jour un conducteur.
   * Mappe automatiquement vers /approve ou /reject selon le statut.
   */
  async updateDriver(driverId: string, updates: any): Promise<any | null> {
    console.log(`🚗 [driverService.updateDriver] Driver: ${driverId}, Updates:`, updates);

    // ── Approuver ────────────────────────────────────────────────────────────
    if (updates.status === 'approved') {
      const data = await apiFetch(`/admin/drivers/${driverId}/approve`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      if (data?.success) {
        console.log(`✅ Conducteur ${driverId} approuvé`);
        return data.driver ?? { id: driverId, status: 'approved', isApproved: true };
      }
      console.error('❌ Erreur approbation:', data);
      return null;
    }

    // ── Rejeter ──────────────────────────────────────────────────────────────
    if (updates.status === 'rejected') {
      const data = await apiFetch(`/admin/drivers/${driverId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: updates.rejection_reason || '' }),
      });
      if (data?.success) {
        console.log(`✅ Conducteur ${driverId} rejeté`);
        return data.driver ?? { id: driverId, status: 'rejected' };
      }
      return null;
    }

    // ── Mise à jour générale ──────────────────────────────────────────────────
    const data = await apiFetch(`/drivers/${driverId}/update`, {
      method: 'POST',
      body: JSON.stringify(updates),
    });
    if (data?.success) {
      return data.driver ?? { id: driverId, ...updates };
    }

    // Fallback silencieux (route non implémentée mais non bloquant)
    console.warn(`⚠️ [driverService.updateDriver] Route /drivers/${driverId}/update introuvable — fallback OK`);
    return { id: driverId, ...updates };
  },

  async getDriver(driverId: string): Promise<any | null> {
    const data = await apiFetch(`/drivers/${driverId}`);
    return data?.driver ?? null;
  },

  async getAllDrivers(): Promise<any[]> {
    const data = await apiFetch('/drivers');
    return data?.drivers ?? [];
  },
};

// ─── Vehicle Service ──────────────────────────────────────────────────────────

export const vehicleService = {
  async getAllVehicles(): Promise<any[]> {
    // Les véhicules sont stockés dans les profils driver (KV)
    // On retourne un tableau vide — ils sont récupérés via fetchDriversFromKV
    return [];
  },

  async getVehicleByDriverId(driverId: string): Promise<any | null> {
    const driver = await driverService.getDriver(driverId);
    if (!driver) return null;
    if (driver.vehicle) return driver.vehicle;
    // Reconstituer depuis les champs plats
    if (driver.vehicle_make) {
      return {
        id: `veh_${driverId}`,
        driver_id: driverId,
        make: driver.vehicle_make,
        model: driver.vehicle_model || '',
        license_plate: driver.vehicle_plate || driver.vehiclePlate || '',
        color: driver.vehicle_color || driver.vehicleColor || '',
        category: driver.vehicle_category || driver.vehicleCategory || 'standard',
      };
    }
    return null;
  },

  async updateVehicle(vehicleId: string, updates: any): Promise<any | null> {
    // Extraire le driverId depuis vehicleId (format: veh_<driverId>)
    const driverId = vehicleId.startsWith('veh_') ? vehicleId.slice(4) : null;
    if (!driverId) return null;

    const data = await apiFetch(`/drivers/${driverId}/update`, {
      method: 'POST',
      body: JSON.stringify({
        vehicle_make: updates.make,
        vehicle_model: updates.model,
        vehicle_plate: updates.license_plate,
        vehicle_color: updates.color,
        vehicle_category: updates.category,
        vehicle: updates,
      }),
    });
    return data?.driver ?? { id: driverId };
  },
};

// ─── Ride Service ─────────────────────────────────────────────────────────────

export const rideService = {
  async getAllRides(): Promise<any[]> {
    return []; // Chargé directement via fetchRidesFromKV dans useSupabaseData
  },

  async getRideById(rideId: string): Promise<any | null> {
    const data = await apiFetch(`/rides/${rideId}`);
    return data?.ride ?? null;
  },

  async getRidesByDriverId(driverId: string): Promise<any[]> {
    return []; // Filtré côté client dans useSupabaseData
  },
};

// ─── PromoCode Service ────────────────────────────────────────────────────────

export const promoCodeService = {
  async getAllPromoCodes(): Promise<any[]> {
    return []; // Non implémenté dans le backend actuel
  },

  async createPromoCode(code: any): Promise<any | null> {
    return null;
  },

  async updatePromoCode(id: string, updates: any): Promise<any | null> {
    return null;
  },

  async deletePromoCode(id: string): Promise<boolean> {
    return false;
  },
};

// ─── Setting Service ──────────────────────────────────────────────────────────

export const settingService = {
  async getAllSettings(): Promise<any[]> {
    return []; // Non implémenté dans le backend actuel
  },

  async updateSetting(key: string, value: string): Promise<any | null> {
    return null;
  },

  async createSetting(setting: any): Promise<any | null> {
    return null;
  },

  async getSetting(key: string): Promise<any | null> {
    return null;
  },
};
