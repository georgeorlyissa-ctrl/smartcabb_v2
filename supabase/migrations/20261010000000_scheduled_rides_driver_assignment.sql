-- Migration: Attribution manuelle des réservations aux conducteurs
-- Ajoute le conducteur attribué + son statut d'acceptation sur scheduled_rides
-- Date: 2026-10-10

ALTER TABLE scheduled_rides
  ADD COLUMN IF NOT EXISTS driver_id UUID,
  ADD COLUMN IF NOT EXISTS driver_status TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ;

-- driver_status: 'none' (non attribuée) | 'proposed' (proposée, en attente du conducteur)
--                | 'accepted' (conducteur OK) | 'declined' (conducteur indisponible)

CREATE INDEX IF NOT EXISTS idx_scheduled_rides_driver
  ON scheduled_rides(driver_id, scheduled_date);
