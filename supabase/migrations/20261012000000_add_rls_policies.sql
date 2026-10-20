-- Migration: Ajout des policies Row Level Security (RLS)
-- Date: 2026-10-12
-- But: Sécuriser l'accès aux données utilisateur (pas tout le monde peut tout lire)

-- -----------------------------------------------------
-- 1. Profiles table : les users ne voient que leur propre profil
-- -----------------------------------------------------

-- Activer RLS sur la table profiles si ce n'est pas déjà fait
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy : Users can read their own profile
-- Si la policy existe déjà, on la supprime avant de la recréer
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Policy : Users can update their own profile
-- Si la policy existe déjà, on la supprime avant de la recréer
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Policy : Service role (admin backend) peut tout faire
-- Si la policy existe déjà, on la supprime avant de la recréer
DROP POLICY IF EXISTS "Admins can do anything via service role" ON profiles;
CREATE POLICY "Admins can do anything via service role" ON profiles
  USING (false) -- Never triggered when using service-role key
  WITH CHECK (false);

-- -----------------------------------------------------
-- 2. Scheduled_rides table : isolation par user_id
-- -----------------------------------------------------

-- Activer RLS sur la table scheduled_rides si ce n'est pas déjà fait
ALTER TABLE scheduled_rides ENABLE ROW LEVEL SECURITY;

-- Policy : Users can read their own rides
-- Si la policy existe déjà, on la supprime avant de la recréer
DROP POLICY IF EXISTS "Users can read own rides" ON scheduled_rides;
CREATE POLICY "Users can read own rides" ON scheduled_rides
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy : Users can insert their own rides
-- Si la policy existe déjà, on la supprime avant de la recréer
DROP POLICY IF EXISTS "Users can insert own rides" ON scheduled_rides;
CREATE POLICY "Users can insert own rides" ON scheduled_rides
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy : Users can update their own rides
-- Si la policy existe déjà, on la supprime avant de la recréer
DROP POLICY IF EXISTS "Users can update own rides" ON scheduled_rides;
CREATE POLICY "Users can update own rides" ON scheduled_rides
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy : Drivers can read rides assigned to them
-- Si la policy existe déjà, on la supprime avant de la recréer
DROP POLICY IF EXISTS "Drivers can read assigned rides" ON scheduled_rides;
CREATE POLICY "Drivers can read assigned rides" ON scheduled_rides
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'driver'
    )
    AND (
      driver_id = auth.uid()
      OR user_id = auth.uid()
    )
  );

-- Policy : Admin full access via service role (handled separately)
-- Si la policy existe déjà, on la supprime avant de la recréer
DROP POLICY IF EXISTS "Admins can do anything via service role" ON scheduled_rides;
CREATE POLICY "Admins can do anything via service role" ON scheduled_rides
  USING (false)
  WITH CHECK (false);

-- -----------------------------------------------------
-- 3. KV store : minimal security (optional)
-- -----------------------------------------------------

-- Note: La table kv_store_2eb02e52 est utilisée pour les données de configuration
-- Elle contient des clés-valeurs globales. Si nécessaire, ajouter des policies :
-- ALTER TABLE kv_store_2eb02e52 ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Everyone can read kv store" ON kv_store_2eb02e52
--   FOR SELECT TO authenticated USING (true);
-- CREATE POLICY "Admins can update kv store" ON kv_store_2eb02e52
--   FOR UPDATE TO authenticated USING (
--     EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
--   );

-- -----------------------------------------------------
-- Résumé des règles appliquées :
-- - Tout utilisateur authentifié isole ses données via auth.uid() = user_id
-- - Les conducteurs peuvent voir leurs courses assignées
-- - Le backend utilise la clé service-role qui contourne RLS (à garder pour les opérations admin)
-- - Pas de policy "public" = personne anonyme ne peut rien lire/écrire sans token