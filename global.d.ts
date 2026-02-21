/**
 * Déclarations TypeScript globales pour SmartCabb
 */

interface Window {
  /**
   * Indique si l'environnement client est complètement initialisé
   * Défini dans index.html avant le chargement de main.tsx
   */
  __SMARTCABB_CLIENT_READY__?: boolean;
}

// Export vide pour que TypeScript considère ce fichier comme un module
export {};
