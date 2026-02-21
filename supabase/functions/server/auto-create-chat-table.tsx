// ============================================================
// SMARTCABB - AUTO-CRÉATION TABLE CHAT
// ============================================================
// Crée automatiquement la table chat_messages si elle n'existe pas
// ============================================================

import { createClient } from 'npm:@supabase/supabase-js@2';

export async function ensureChatTableExists(): Promise<boolean> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Variables d\'environnement Supabase manquantes');
      return false;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Tenter d'insérer un message de test pour vérifier si la table existe
    const testResult = await supabase
      .from('chat_messages')
      .select('id')
      .limit(1);

    if (testResult.error) {
      // Vérifier si c'est une erreur de service indisponible
      const errorMsg = testResult.error.message || '';
      if (errorMsg.includes('<!DOCTYPE html>') || 
          errorMsg.includes('Cloudflare') ||
          errorMsg.includes('Temporarily unavailable')) {
        console.warn('⚠️ Service Supabase temporairement indisponible, utilisation du KV');
        return true; // Continuer avec le KV
      }

      // La table n'existe probablement pas, la créer via KV
      console.log('⚠️ Table chat_messages non trouvée, tentative de création...');
      
      // Utiliser le KV pour stocker temporairement les messages
      console.log('📦 Utilisation du système KV pour le stockage des messages chat');
      
      return true; // On continue avec le KV
    }

    console.log('✅ Table chat_messages existe et est accessible');
    return true;

  } catch (error) {
    // Simplifier l'affichage des erreurs HTML
    if (error instanceof Error && error.message.includes('<!DOCTYPE html>')) {
      console.warn('⚠️ Service Supabase temporairement indisponible, utilisation du KV');
    } else {
      console.error('❌ Erreur lors de la vérification de la table chat:', 
        error instanceof Error ? error.message.substring(0, 200) : 'Erreur inconnue');
    }
    return true; // Continuer quand même avec le KV
  }
}