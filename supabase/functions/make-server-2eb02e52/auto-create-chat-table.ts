/**
 * Utilitaire pour créer automatiquement la table de chat
 * Note: Avec le KV store, pas besoin de créer de tables
 */
export async function ensureChatTableExists() {
  console.log("✅ Chat utilise le KV store - pas de table SQL nécessaire");
  return true;
}
