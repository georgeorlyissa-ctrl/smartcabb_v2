-- ============================================================================
-- SOS / URGENCES — Table de persistance des alertes
-- ============================================================================
-- Objectif : tracer chaque alerte SOS déclenchée depuis l'application
-- (passager ou conducteur), avec la position réelle, le contexte de course et
-- le cycle de vie de l'alerte (active → acquittée → résolue / annulée).
--
-- Les écritures passent par l'Edge Function (service role). Les politiques RLS
-- ci-dessous encadrent les lectures directes éventuelles (temps réel admin).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.emergency_alerts (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           text NOT NULL,
  role              text NOT NULL DEFAULT 'passenger'
                      CHECK (role IN ('passenger', 'driver')),
  user_name         text,
  user_phone        text,
  ride_id           text,
  type              text NOT NULL DEFAULT 'security'
                      CHECK (type IN ('medical', 'security', 'accident', 'harassment')),
  status            text NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active', 'acknowledged', 'resolved', 'cancelled', 'false_alarm')),
  lat               double precision,
  lng               double precision,
  accuracy          double precision,
  address           text,
  note              text,
  vehicle_info      text,
  counterpart_name  text,
  counterpart_phone text,
  metadata          jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at        timestamptz NOT NULL DEFAULT now(),
  ack_by            uuid,
  ack_at            timestamptz,
  resolved_by       uuid,
  resolved_at       timestamptz,
  resolution_note   text
);

CREATE INDEX IF NOT EXISTS emergency_alerts_status_created_idx
  ON public.emergency_alerts (status, created_at DESC);

CREATE INDEX IF NOT EXISTS emergency_alerts_user_created_idx
  ON public.emergency_alerts (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS emergency_alerts_ride_idx
  ON public.emergency_alerts (ride_id);

ALTER TABLE public.emergency_alerts ENABLE ROW LEVEL SECURITY;

-- L'utilisateur peut relire ses propres alertes.
DROP POLICY IF EXISTS "emergency_alerts_select_own" ON public.emergency_alerts;
CREATE POLICY "emergency_alerts_select_own"
  ON public.emergency_alerts
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = user_id);

-- Les administrateurs peuvent tout consulter (rôle dans user_metadata ou app_metadata).
DROP POLICY IF EXISTS "emergency_alerts_select_admin" ON public.emergency_alerts;
CREATE POLICY "emergency_alerts_select_admin"
  ON public.emergency_alerts
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- Aucune politique INSERT/UPDATE/DELETE : seules les Edge Functions
-- (service role, qui contourne RLS) écrivent dans cette table.

-- Temps réel pour les écrans d'administration (ignore silencieusement si la
-- table est déjà publiée).
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.emergency_alerts;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

COMMENT ON TABLE public.emergency_alerts IS
  'Alertes SOS SmartCabb — écriture via Edge Function uniquement, lecture RLS (propriétaire ou admin).';
