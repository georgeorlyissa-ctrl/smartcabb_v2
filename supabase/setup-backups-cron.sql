-- ============================================================
-- SMARTCABB — Sauvegarde automatique quotidienne
-- À exécuter une fois dans Supabase → SQL Editor
-- ============================================================
-- Chaque nuit à 01:00 UTC (02:00 heure de Kinshasa), le cron appelle
-- l'Edge Function /backups/run qui exporte :
--   kv_store_2eb02e52, scheduled_rides, emergency_alerts,
--   auth.users (sans mots de passe) et les photos du bucket avatars.
-- Le fichier JSON compressé est stocké dans le bucket privé `backups`.
-- Rétention : 30 jours (variable BACKUP_RETENTION_DAYS).
-- ============================================================

-- 1. S'assurer que les extensions sont disponibles
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Supprimer l'ancienne planification si elle existe (idempotent)
DO $$
BEGIN
  PERFORM cron.unschedule('smartcabb-daily-backup');
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- 3. Planifier la sauvegarde quotidienne
SELECT cron.schedule(
  'smartcabb-daily-backup',
  '0 1 * * *', -- 01:00 UTC = 02:00 à Kinshasa (UTC+1)
  $$
  SELECT net.http_post(
    url := 'https://zaerjqchzqmcxqblkfkg.supabase.co/functions/v1/make-server-2eb02e52/backups/run',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', 'smartcabb-cron-2026'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- 4. Vérifier que le cron est bien enregistré
SELECT jobid, jobname, schedule, active
FROM cron.job
WHERE jobname = 'smartcabb-daily-backup';

-- 5. Vérifier les dernières exécutions (après la première nuit)
-- SELECT * FROM cron.job_run_details
-- WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'smartcabb-daily-backup')
-- ORDER BY start_time DESC LIMIT 5;
