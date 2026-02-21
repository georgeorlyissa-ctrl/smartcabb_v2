/**
 * 🧹 SCRIPT DE NETTOYAGE IMMÉDIAT
 * Exécute le nettoyage des données de simulation
 */

import { projectId, publicAnonKey } from './supabase/info';

export async function cleanupAllSimulationData() {
  try {
    console.log('🧹 Début du nettoyage des données de simulation...');
    
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/cleanup/all`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const data = await response.json();

    if (data.success) {
      console.log('✅ NETTOYAGE TERMINÉ !');
      console.log('📊 Données supprimées:', data.deleted);
      console.log('💡', data.note);
      return true;
    } else {
      console.error('❌ Erreur:', data.message);
      return false;
    }
  } catch (error) {
    console.error('❌ Erreur de connexion:', error);
    return false;
  }
}

// Auto-exécution au chargement
if (typeof window !== 'undefined') {
  console.log('🔧 Script de nettoyage chargé. Vous pouvez maintenant utiliser le panneau admin.');
}
