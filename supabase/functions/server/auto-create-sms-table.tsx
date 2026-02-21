/**
 * Auto-création de la table SMS logs
 * Ce script s'exécute automatiquement au démarrage du serveur
 */

import { createClient } from 'npm:@supabase/supabase-js@2';

export async function ensureSMSTableExists(): Promise<boolean> {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    console.log('🔍 Vérification de l\'existence de la table sms_logs_2eb02e52...');

    // Essayer de récupérer les logs pour voir si la table existe
    const { error } = await supabase
      .from('sms_logs_2eb02e52')
      .select('id')
      .limit(1);

    if (!error) {
      console.log('✅ Table sms_logs_2eb02e52 existe déjà');
      return true;
    }

    // Vérifier si c'est une erreur de service indisponible (Cloudflare, etc.)
    if (error.message && (
      error.message.includes('<!DOCTYPE html>') || 
      error.message.includes('Cloudflare') ||
      error.message.includes('Temporarily unavailable')
    )) {
      console.warn('⚠️ Service Supabase temporairement indisponible, réessayez plus tard');
      return false;
    }

    // Si la table n'existe pas (erreur PGRST205)
    if (error.code === 'PGRST205' || error.message.includes('Could not find the table')) {
      console.log('⚠️ Table sms_logs_2eb02e52 introuvable, création automatique...');

      // Créer la table via une connexion PostgreSQL directe
      const DB_URL = Deno.env.get('SUPABASE_DB_URL');
      
      if (!DB_URL) {
        console.error('❌ SUPABASE_DB_URL non défini, impossible de créer la table automatiquement');
        return false;
      }

      try {
        // Importer le client PostgreSQL
        const { Client } = await import('https://deno.land/x/postgres@v0.17.0/mod.ts');
        
        // Créer une connexion à la base de données
        const client = new Client(DB_URL);
        await client.connect();

        console.log('📡 Connexion à la base de données établie');

        // Créer la table
        await client.queryArray(`
          -- Créer la table SMS logs
          CREATE TABLE IF NOT EXISTS sms_logs_2eb02e52 (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            phone TEXT NOT NULL,
            message TEXT NOT NULL,
            status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'pending')),
            provider TEXT CHECK (provider IN ('africas-talking', 'twilio')),
            cost NUMERIC(10, 4),
            error_message TEXT,
            sent_at TIMESTAMPTZ DEFAULT NOW(),
            created_at TIMESTAMPTZ DEFAULT NOW()
          );
        `);

        console.log('✅ Table sms_logs_2eb02e52 créée');

        // Activer RLS
        await client.queryArray(`
          ALTER TABLE sms_logs_2eb02e52 ENABLE ROW LEVEL SECURITY;
        `);

        console.log('✅ RLS activé');

        // Créer la politique RLS
        await client.queryArray(`
          DROP POLICY IF EXISTS "Enable all for sms_logs" ON sms_logs_2eb02e52;
          CREATE POLICY "Enable all for sms_logs" 
            ON sms_logs_2eb02e52 
            FOR ALL 
            USING (true) 
            WITH CHECK (true);
        `);

        console.log('✅ Politique RLS créée');

        // Créer les index
        await client.queryArray(`
          CREATE INDEX IF NOT EXISTS idx_sms_logs_sent_at 
            ON sms_logs_2eb02e52(sent_at DESC);
          CREATE INDEX IF NOT EXISTS idx_sms_logs_phone 
            ON sms_logs_2eb02e52(phone);
          CREATE INDEX IF NOT EXISTS idx_sms_logs_status 
            ON sms_logs_2eb02e52(status);
        `);

        console.log('✅ Index créés');

        // Ajouter des données de test
        await client.queryArray(`
          INSERT INTO sms_logs_2eb02e52 (phone, message, status, provider, cost)
          VALUES 
            ('+243812345678', 'Bienvenue sur SmartCabb !', 'sent', 'africas-talking', 0.05),
            ('+243999000000', 'Votre course est confirmée', 'sent', 'africas-talking', 0.05),
            ('+243811111111', 'Test SMS', 'failed', 'africas-talking', 0.00)
          ON CONFLICT DO NOTHING;
        `);

        console.log('✅ Données de test ajoutées');

        // Fermer la connexion
        await client.end();

        console.log('🎉 Table sms_logs_2eb02e52 créée automatiquement avec succès !');
        return true;
      } catch (dbError) {
        console.error('❌ Erreur lors de la création de la table:', dbError);
        return false;
      }
    }

    // Autre erreur - N'afficher que le message court, pas le HTML complet
    const errorMsg = error.message && error.message.includes('<!DOCTYPE html>')
      ? 'Service temporairement indisponible (Cloudflare/Supabase)'
      : error.message || 'Erreur inconnue';
    console.error('❌ Erreur inattendue lors de la vérification:', { 
      code: error.code, 
      message: errorMsg.substring(0, 200) 
    });
    return false;
  } catch (error) {
    // Simplifier l'affichage des erreurs HTML
    if (error instanceof Error && error.message.includes('<!DOCTYPE html>')) {
      console.error('❌ Service Supabase temporairement indisponible');
    } else {
      console.error('❌ Erreur dans ensureSMSTableExists:', error instanceof Error ? error.message : 'Erreur inconnue');
    }
    return false;
  }
}