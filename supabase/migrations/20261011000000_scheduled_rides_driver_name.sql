-- Migration: colonne driver_name manquante (attribution manuelle des réservations)
-- Date: 2026-10-11

ALTER TABLE scheduled_rides
  ADD COLUMN IF NOT EXISTS driver_name TEXT;
