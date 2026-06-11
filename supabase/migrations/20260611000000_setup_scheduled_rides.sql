-- Migration: Créer la table scheduled_rides et le cron de traitement
-- Date: 2026-06-11

-- ============================================
-- 1. TABLE scheduled_rides
-- ============================================
CREATE TABLE IF NOT EXISTS scheduled_rides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  pickup_address TEXT NOT NULL,
  pickup_lat DOUBLE PRECISION NOT NULL,
  pickup_lng DOUBLE PRECISION NOT NULL,
  dropoff_address TEXT NOT NULL,
  dropoff_lat DOUBLE PRECISION NOT NULL,
  dropoff_lng DOUBLE PRECISION NOT NULL,
  scheduled_date DATE NOT NULL,
  scheduled_time TIME NOT NULL,
  category TEXT NOT NULL DEFAULT 'smart_standard',
  estimated_price DOUBLE PRECISION NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'scheduled',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour les requêtes du cron
CREATE INDEX IF NOT EXISTS idx_scheduled_rides_status_date ON scheduled_rides(status, scheduled_date);

-- ============================================
-- 2. EXTENSIONS pg_cron + pg_net
-- ============================================
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ============================================
-- 3. CRON JOB: traiter les réservations toutes les 5 minutes
-- ============================================
SELECT cron.schedule(
  'process-scheduled-rides',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://zaerjqchzqmcxqblkfkg.supabase.co/functions/v1/make-server-2eb02e52/rides/process-scheduled',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', 'smartcabb-cron-2026'
    )
  );
  $$
);
