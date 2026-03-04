/**
 * Utilitaire pour créer automatiquement la table SMS
 * Note: Avec le KV store, pas besoin de créer de tables
 */
export async function ensureSMSTableExists() {
  console.log("✅ SMS utilise le KV store - pas de table SQL nécessaire");
  return true;
}
