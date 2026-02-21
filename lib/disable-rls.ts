/**
 * Service pour désactiver RLS et corriger les politiques récursives
 */

import { projectId, publicAnonKey } from '../utils/supabase/info';

const SUPABASE_URL = `https://${projectId}.supabase.co`;

/**
 * Désactive RLS sur toutes les tables via l'API Supabase
 */
export async function disableRLSPolicies(): Promise<{ success: boolean; message: string }> {
  try {
    console.log('🔧 Tentative de désactivation RLS...');

    // Script SQL pour désactiver RLS
    const sqlScript = `
      -- Supprimer toutes les politiques
      DO $$
      DECLARE pol RECORD;
      BEGIN
          FOR pol IN SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public'
          LOOP
              EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I CASCADE', pol.policyname, pol.schemaname, pol.tablename);
          END LOOP;
      END $$;

      -- Désactiver RLS sur toutes les tables
      DO $$
      DECLARE tbl RECORD;
      BEGIN
          FOR tbl IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
          LOOP
              EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', tbl.tablename);
          END LOOP;
      END $$;
    `;

    // Exécuter via l'API REST de Supabase
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': publicAnonKey,
        'Authorization': `Bearer ${publicAnonKey}`,
      },
      body: JSON.stringify({ query: sqlScript }),
    });

    if (!response.ok) {
      // Si l'API REST ne fonctionne pas, retourner un message d'instruction
      console.warn('⚠️ Impossible de désactiver RLS via API');
      return {
        success: false,
        message: 'MANUAL_SQL_REQUIRED',
      };
    }

    console.log('✅ RLS désactivé avec succès');
    return {
      success: true,
      message: 'RLS désactivé. Rafraîchissez la page.',
    };
  } catch (error) {
    console.error('❌ Erreur lors de la désactivation RLS:', error);
    return {
      success: false,
      message: 'MANUAL_SQL_REQUIRED',
    };
  }
}

/**
 * Script SQL à exécuter manuellement dans Supabase SQL Editor
 */
export const MANUAL_SQL_SCRIPT = `
-- 🔥 COPIER-COLLER CE CODE DANS SUPABASE SQL EDITOR

-- Supprimer toutes les politiques
DO $$
DECLARE pol RECORD;
BEGIN
    FOR pol IN SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I CASCADE', pol.policyname, pol.schemaname, pol.tablename);
    END LOOP;
END $$;

-- Désactiver RLS sur toutes les tables
DO $$
DECLARE tbl RECORD;
BEGIN
    FOR tbl IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    LOOP
        EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', tbl.tablename);
    END LOOP;
END $$;

-- Vérifier
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
`;
