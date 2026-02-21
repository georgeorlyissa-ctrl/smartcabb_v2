import { projectId } from '../utils/supabase/info';

/**
 * 🌍 Configuration des endpoints API
 */
export const apiConfig = {
  // Détection de l'environnement
  isProduction: window.location.hostname === 'smartcabb.com' || window.location.hostname === 'www.smartcabb.com',
  
  // URL de base pour les appels API Supabase Functions
  // ✅ FIX: Utiliser le vrai project ID même en production
  baseUrl: `https://${projectId}.supabase.co`, // Utilise toujours le vrai project ID
  
  // Préfixe de route pour le serveur Make
  serverPrefix: '/functions/v1/make-server-2eb02e52',
  
  // Environnement actuel
  environment: isProduction ? 'production' : 'development'
} as const;

/**
 * Construit l'URL complète pour une route API
 * 
 * @param route - Route relative (ex: '/drivers/online-drivers')
 * @returns URL complète pour l'appel API
 * 
 * @example
 * ```ts
 * const url = getApiUrl('/drivers/online-drivers');
 * // Dev: https://xyz.supabase.co/functions/v1/make-server-2eb02e52/drivers/online-drivers
 * // Prod: https://smartcabb.supabase.co/functions/v1/make-server-2eb02e52/drivers/online-drivers
 * ```
 */
export function getApiUrl(route: string): string {
  // Nettoyer la route (enlever le slash initial si présent)
  const cleanRoute = route.startsWith('/') ? route : `/${route}`;
  
  return `${apiConfig.baseUrl}${apiConfig.serverPrefix}${cleanRoute}`;
}

/**
 * Headers par défaut pour les requêtes API
 * 
 * @param accessToken - Token d'accès optionnel pour l'authentification
 * @returns Headers à inclure dans les requêtes fetch
 */
export function getApiHeaders(accessToken?: string): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  // Ajouter le token d'autorisation si fourni
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }
  
  return headers;
}

/**
 * Log la configuration actuelle (debug uniquement)
 */
export function logApiConfig() {
  console.log('🔧 Configuration API SmartCabb:');
  console.log(`   Environnement: ${apiConfig.environment}`);
  console.log(`   URL de base: ${apiConfig.baseUrl}`);
  console.log(`   Préfixe serveur: ${apiConfig.serverPrefix}`);
  console.log(`   Exemple d'URL: ${getApiUrl('/drivers/online-drivers')}`);
}

// ✅ Log au démarrage en développement
if (!apiConfig.isProduction) {
  logApiConfig();
}