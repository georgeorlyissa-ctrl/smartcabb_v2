import { projectId } from './supabase/info';

/**
 * 🌍 UTILITAIRES DE GESTION D'ENVIRONNEMENT
 */

/**
 * Détermine si l'application tourne en environnement de production
 */
export function isProductionEnvironment(): boolean {
  const hostname = window.location.hostname;
  return (
    hostname === 'smartcabb.com' ||
    hostname === 'www.smartcabb.com' ||
    hostname.endsWith('.vercel.app')
  );
}

/**
 * Obtient l'URL de base pour les appels API Supabase
 */
export function getSupabaseBaseUrl(): string {
  return `https://${projectId}.supabase.co`;
}

/**
 * Obtient le project ID Supabase
 */
export function getProjectId(): string {
  return projectId;
}