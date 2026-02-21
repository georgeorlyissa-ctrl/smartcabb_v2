/**
 * Validation d'UUID
 * Évite l'erreur "@supabase/auth-js: Expected parameter to be UUID but is not"
 */


import * as kv from './kv-wrapper.tsx';

export function isValidUUID(id: string | null | undefined): boolean {
  if (!id || typeof id !== 'string') {
    return false;
  }
  
  // Pattern UUID v4
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

export function validateUUIDOrThrow(id: string | null | undefined, context: string): string {
  if (!isValidUUID(id)) {
    throw new Error(`${context}: ID invalide (pas un UUID): ${id}`);
  }
  return id as string;
}

export function safeGetUserById(supabase: any, userId: string | null | undefined) {
  if (!isValidUUID(userId)) {
    console.error(`❌ UUID invalide pour getUserById: ${userId}`);
    return Promise.resolve({ data: null, error: { message: 'ID invalide - pas un UUID' } });
  }
  
  return supabase.auth.admin.getUserById(userId);
}


/**
 * Récupère un utilisateur par ID, gère les profils orphelins automatiquement
 * Si l'utilisateur n'existe pas dans Auth, supprime son profil du KV store
 * @param supabase - Client Supabase
 * @param userId - ID de l'utilisateur
 * @param userType - Type d'utilisateur ('driver' ou 'passenger') pour le nettoyage KV
 * @returns { data, error, wasOrphan } - Données user + flag orphelin
 */
export async function safeGetUserByIdWithCleanup(
  supabase: any, 
  userId: string | null | undefined,
  userType: 'driver' | 'passenger' | 'unknown' = 'unknown'
): Promise<{ data: any; error: any; wasOrphan: boolean }> {
  if (!isValidUUID(userId)) {
    console.error(`❌ UUID invalide pour getUserById: ${userId}`);
    return { 
      data: null, 
      error: { message: 'ID invalide - pas un UUID' },
      wasOrphan: false
    };
  }
  
  try {
    const { data, error } = await supabase.auth.admin.getUserById(userId);
    
    // Si l'utilisateur n'existe pas dans Auth (user_not_found)
    if (error?.code === 'user_not_found' || error?.status === 404) {
      console.warn(`⚠️ Profil orphelin détecté: ${userId} (compte Auth supprimé)`);
      
      // Nettoyer automatiquement le KV store
      const keysToDelete = [
        `${userType}:${userId}`,
        `profile:${userId}`,
        `wallet:${userId}`,
        `fcm_token:${userId}`,
        `driver_location:${userId}`,
        `driver_status:${userId}`,
        `driver_stats:${userId}`
      ];
      
      let cleanedKeys = 0;
      for (const key of keysToDelete) {
        try {
          await kv.del(key);
          cleanedKeys++;
          console.log(`🧹 Supprimé: ${key}`);
        } catch (delError) {
          // Ignorer les erreurs de suppression
          console.warn(`⚠️ Erreur suppression ${key}:`, delError);
        }
      }
      
      console.log(`✅ Profil orphelin nettoyé: ${cleanedKeys} clés supprimées`);
      
      return {
        data: null,
        error: { message: 'Profil orphelin nettoyé', code: 'user_not_found' },
        wasOrphan: true
      };
    }
    
    // Utilisateur trouvé normalement
    return { data, error, wasOrphan: false };
    
  } catch (err) {
    console.error(`❌ Erreur getUserById pour ${userId}:`, err);
    return { data: null, error: err, wasOrphan: false };
  }
}

