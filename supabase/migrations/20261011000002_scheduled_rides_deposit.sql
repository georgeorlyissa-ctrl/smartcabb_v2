-- Migration: suivi de l'acompte 50% (preuve d'encaissement admin)
-- Date: 2026-10-11

ALTER TABLE scheduled_rides
  ADD COLUMN IF NOT EXISTS deposit_received BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deposit_method TEXT,
  ADD COLUMN IF NOT EXISTS deposit_received_at TIMESTAMPTZ;

-- Rétro-compatibilité : les réservations déjà 'confirmed' avaient un acompte encaissé
UPDATE scheduled_rides
  SET deposit_received = true,
      deposit_received_at = COALESCE(created_at, NOW())
  WHERE status = 'confirmed' AND deposit_received = false;
