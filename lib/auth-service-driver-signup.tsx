/**
 * 🚗 SERVICE D'INSCRIPTION CONDUCTEUR
 * 
 * Service pour l'inscription des conducteurs avec documents
 * 
 * @version 1.0.0
 * @date 2026-02-05
 */

import { projectId, publicAnonKey } from '../utils/supabase/info';

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52`;

export interface DriverSignUpData {
  // Informations personnelles
  fullName: string;
  email?: string; // ✅ Optionnel maintenant
  phone: string;
  password: string;
  
  // Informations du véhicule - ✅ Support des deux formats
  vehicleType?: 'economique' | 'confort' | 'premium' | 'van';
  vehicleCategory?: 'standard' | 'comfort' | 'luxury' | 'van'; // ✅ Nouveau format
  licensePlate?: string;
  vehiclePlate?: string; // ✅ Alias
  vehicleBrand?: string;
  vehicleMake?: string; // ✅ Alias
  vehicleModel?: string;
  vehicleYear?: string;
  vehicleColor?: string;
  
  // Documents (optionnels selon l'implémentation)
  driverLicense?: string;
  vehicleRegistration?: string;
  insurance?: string;
  profilePhoto?: string;
}

/**
 * Inscription d'un nouveau conducteur
 */
export async function signUpDriver(driverData: DriverSignUpData) {
  try {
    console.log('🚗 Inscription conducteur...', driverData.phone);
    
    // ✅ Générer un email automatique si non fourni
    // ✅ UNIFORMISATION : Utiliser @smartcabb.app au lieu de @smartcabb.local
    const email = driverData.email || `${driverData.phone.replace(/[^0-9]/g, '')}_${Date.now()}@smartcabb.app`;
    
    // ✅ Normaliser les champs du véhicule
    const vehicleType = driverData.vehicleType || driverData.vehicleCategory || 'economique';
    const licensePlate = driverData.licensePlate || driverData.vehiclePlate || '';
    const vehicleBrand = driverData.vehicleBrand || driverData.vehicleMake || '';
    
    console.log('📋 Données normalisées:', { email, vehicleType, licensePlate, vehicleBrand });
    
    // 1. Créer le compte utilisateur
    const registerResponse = await fetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: email,
        password: driverData.password,
        full_name: driverData.fullName,
        phone: driverData.phone,
        role: 'driver'
      })
    });

    const registerResult = await registerResponse.json();

    if (!registerResult.success) {
      console.error('❌ Erreur création compte:', registerResult.error);
      return registerResult;
    }

    console.log('✅ Compte créé:', registerResult.profile.id);

    // 2. Créer le profil conducteur avec véhicule
    const driverProfileResponse = await fetch(`${API_BASE}/drivers/create`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: registerResult.profile.id,
        vehicleType: vehicleType,
        licensePlate: licensePlate,
        vehicleBrand: vehicleBrand,
        vehicleModel: driverData.vehicleModel || '',
        vehicleYear: driverData.vehicleYear || new Date().getFullYear().toString(),
        vehicleColor: driverData.vehicleColor || '',
        // Documents optionnels
        documents: {
          driverLicense: driverData.driverLicense,
          vehicleRegistration: driverData.vehicleRegistration,
          insurance: driverData.insurance,
          profilePhoto: driverData.profilePhoto
        }
      })
    });

    const driverProfileResult = await driverProfileResponse.json();

    if (!driverProfileResult.success) {
      console.error('❌ Erreur création profil conducteur:', driverProfileResult.error);
      return {
        success: false,
        error: driverProfileResult.error || 'Erreur lors de la création du profil conducteur'
      };
    }

    console.log('✅ Profil conducteur créé');

    return {
      success: true,
      profile: registerResult.profile,
      driver: driverProfileResult.driver,
      message: 'Inscription réussie ! Votre compte est en attente de validation.'
    };

  } catch (error) {
    console.error('❌ Erreur signUpDriver:', error);
    return {
      success: false,
      error: 'Erreur lors de l\'inscription. Vérifiez votre connexion Internet.'
    };
  }
}

export default signUpDriver;



