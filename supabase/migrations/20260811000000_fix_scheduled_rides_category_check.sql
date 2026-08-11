-- Migration: Corriger la contrainte category de scheduled_rides
-- Date: 2026-08-11
-- La contrainte ne permettait que smart_standard/smart_confort/smart_plus
-- (créée avant la scission clim et avant smart_business) → erreur 23514
-- à la réservation d'une course Business.

ALTER TABLE public.scheduled_rides DROP CONSTRAINT IF EXISTS scheduled_rides_category_check;
ALTER TABLE public.scheduled_rides ADD CONSTRAINT scheduled_rides_category_check
  CHECK (category = ANY (ARRAY[
    'smart_standard',
    'smart_standard_clim',
    'smart_standard_no_clim',
    'smart_confort',
    'smart_plus',
    'smart_business'
  ]));
