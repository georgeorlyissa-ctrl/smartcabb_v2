/**
 * Utilitaires pour gérer les erreurs de manière intelligente
 * Détecte automatiquement l'environnement Figma et supprime les logs inutiles
 */

/**
 * Vérifie si nous sommes dans l'environnement de prévisualisation Figma
 */
export function isFigmaPreview(): boolean {
  if (typeof window === 'undefined') return false;
  
  return window.location.href.includes('figma.com/webpack-artifacts') || 
         window.location.href.includes('code_components_preview') ||
         window.location.href.includes('figma.com/community/widget');
}

/**
 * Vérifie si une erreur est une erreur réseau (Failed to fetch, timeout, etc.)
 */
export function isNetworkError(error: any): boolean {
  if (!error) return false;
  
  const errorMessage = error?.message || String(error);
  const errorName = error?.name || '';
  
  return errorName === 'FetchError' ||
         errorName === 'AbortError' ||
         errorMessage.includes('Failed to fetch') || 
         errorMessage.includes('Network request failed') ||
         errorMessage.includes('Connection timeout') ||
         errorMessage.includes('timeout') ||
         errorMessage.includes('fetch') ||
         errorMessage === 'undefined';
}

/**
 * Logger une erreur de manière intelligente
 * - Supprime les logs d'erreurs réseau (toujours)
 * - Affiche les vraies erreurs normalement
 */
export function logError(context: string, error: any, forceLog = false): void {
  // Si on force le log, toujours afficher
  if (forceLog) {
    console.error(`❌ ${context}:`, error);
    return;
  }
  
  // Ne JAMAIS logger les erreurs réseau (même en dehors de Figma)
  // Car elles sont normales si Supabase n'est pas configuré
  if (isNetworkError(error)) {
    // Silencieux - c'est normal si backend non configuré
    return;
  }
  
  // Logger uniquement les vraies erreurs
  console.error(`❌ ${context}:`, error);
}

/**
 * Logger un warning de manière intelligente
 */
export function logWarning(context: string, message: string, showInFigma = false): void {
  // En mode Figma preview, ne pas logger sauf si demandé
  if (isFigmaPreview() && !showInFigma) {
    return;
  }
  
  console.warn(`⚠️ ${context}: ${message}`);
}

/**
 * Vérifie si une erreur Supabase est une erreur de table manquante
 */
export function isTableNotFoundError(error: any): boolean {
  if (!error) return false;
  
  const errorCode = error?.code || '';
  const errorMessage = error?.message || String(error);
  
  return errorCode === 'PGRST116' ||
         errorCode === 'PGRST204' || 
         errorCode === 'PGRST205' ||
         errorCode === '42P01' ||
         errorMessage.includes('does not exist') ||
         errorMessage.includes('Could not find the table');
}

/**
 * Wrapper pour les appels Supabase avec gestion d'erreur intelligente
 */
export async function safeSupabaseCall<T>(
  fn: () => Promise<{ data: T | null; error: any }>,
  context: string,
  options: {
    defaultValue?: T;
    silentNetworkErrors?: boolean;
    silentTableNotFound?: boolean;
  } = {}
): Promise<{ data: T | null; error: any }> {
  const {
    defaultValue = null,
    silentNetworkErrors = true,
    silentTableNotFound = true
  } = options;
  
  try {
    const result = await fn();
    
    if (result.error) {
      // Table manquante - logger silencieusement si demandé
      if (isTableNotFoundError(result.error)) {
        if (!silentTableNotFound) {
          logWarning(context, 'Table non trouvée');
        }
        return { data: defaultValue as T, error: result.error };
      }
      
      // Vraie erreur - toujours logger
      logError(context, result.error);
    }
    
    return result;
  } catch (error: any) {
    // Erreur réseau - logger silencieusement si demandé
    if (isNetworkError(error)) {
      if (!silentNetworkErrors) {
        logWarning(context, 'Erreur réseau');
      }
      return { data: defaultValue as T, error };
    }
    
    // Vraie erreur - toujours logger
    logError(context, error);
    return { data: defaultValue as T, error };
  }
}