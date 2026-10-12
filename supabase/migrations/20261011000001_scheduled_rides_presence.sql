-- Migration: présence conducteur + rappel avant course (attribution manuelle)
-- Date: 2026-10-11

ALTER TABLE scheduled_rides
  ADD COLUMN IF NOT EXISTS presence_confirmed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS presence_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;
