/**
 * Helpers pour la gestion des véhicules SmartCabb
 */

export interface VehicleInfo {
  make?: string;
  model?: string;
  color?: string;
  plate?: string;
  license_plate?: string;
  type?: string;
  category?: string;
  year?: number;
  seats?: number;
}

/**
 * Obtenir le nom d'affichage du véhicule
 * Si make et model sont fournis, on les affiche
 * Sinon, on affiche le nom de la catégorie SmartCabb
 */
export function getVehicleDisplayName(vehicleInfo: VehicleInfo | null | undefined): string {
  if (!vehicleInfo) {
    return 'Véhicule non configuré';
  }

  // Si on a la marque et le modèle, les afficher
  if (vehicleInfo.make && vehicleInfo.model) {
    const color = vehicleInfo.color ? `${vehicleInfo.color} ` : '';
    return `${color}${vehicleInfo.make} ${vehicleInfo.model}`;
  }

  // Si on a juste la marque, l'afficher
  if (vehicleInfo.make) {
    const color = vehicleInfo.color ? `${vehicleInfo.color} ` : '';
    return `${color}${vehicleInfo.make}`;
  }

  // Sinon, mapper la catégorie vers un nom lisible
  const category = vehicleInfo.type || vehicleInfo.category || '';
  
  switch (category) {
    case 'smart_standard':
    case 'standard':
    case 'economique':
      return 'SmartCabb STANDARD';
    
    case 'smart_confort':
    case 'comfort':
    case 'confort':
      return 'SmartCabb CONFORT';
    
    case 'smart_plus':
    case 'van':
      return 'SmartCabb PLUS';
    
    case 'smart_luxury':
    case 'luxury':
    case 'premium':
      return 'SmartCabb LUXURY';
    
    default:
      return 'Véhicule';
  }
}

/**
 * Obtenir la description de la catégorie de véhicule
 */
export function getVehicleCategoryDescription(category: string): string {
  switch (category) {
    case 'smart_standard':
    case 'standard':
    case 'economique':
      return 'Toyota IST, Vitz, Swift, Blade, Ractis, Runx (3 places, Clim)';
    
    case 'smart_confort':
    case 'comfort':
    case 'confort':
      return 'Toyota Marx, Crown, Mercedes C-Class, Harrier (3 places, Clim, Data)';
    
    case 'smart_plus':
    case 'van':
      return 'Toyota Hiace, Noah, Voxy (7 places, Clim, Data)';
    
    case 'smart_luxury':
    case 'luxury':
    case 'premium':
      return 'Mercedes E-Class, BMW Série 5, Audi A6 (Premium, Clim, Data)';
    
    default:
      return '';
  }
}

/**
 * Obtenir l'icône emoji de la catégorie de véhicule
 */
export function getVehicleCategoryIcon(category: string): string {
  switch (category) {
    case 'smart_standard':
    case 'standard':
    case 'economique':
      return '🚗';
    
    case 'smart_confort':
    case 'comfort':
    case 'confort':
      return '🚙';
    
    case 'smart_plus':
    case 'van':
      return '🚐';
    
    case 'smart_luxury':
    case 'luxury':
    case 'premium':
      return '✨';
    
    default:
      return '🚗';
  }
}
