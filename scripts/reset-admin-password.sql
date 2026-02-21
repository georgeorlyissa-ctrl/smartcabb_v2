-- ═══════════════════════════════════════════════════════════════════
-- 🔐 RÉINITIALISER LE MOT DE PASSE ADMIN
-- ═══════════════════════════════════════════════════════════════════
-- 
-- Usage : Copiez-collez dans le SQL Editor de Supabase
-- 
-- IMPORTANT : Remplacez les valeurs entre <...> par vos vraies valeurs
-- ═══════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════
-- ÉTAPE 1 : TROUVER VOTRE EMAIL ADMIN
-- ═══════════════════════════════════════════════════════════════════

SELECT 
  id,
  full_name,
  email,
  phone,
  role
FROM profiles
WHERE role = 'admin'
ORDER BY created_at DESC;

-- Copiez l'EMAIL que vous voulez réinitialiser


-- ═══════════════════════════════════════════════════════════════════
-- ÉTAPE 2 : RÉINITIALISER LE MOT DE PASSE
-- ═══════════════════════════════════════════════════════════════════
-- ⚠️ Cette requête nécessite les droits SERVICE_ROLE
-- Elle doit être exécutée depuis l'API, pas depuis SQL Editor

-- Utilisez plutôt la méthode B ci-dessous (créer un nouvel admin)


-- ═══════════════════════════════════════════════════════════════════
-- MÉTHODE ALTERNATIVE : CRÉER UN NOUVEL ADMIN
-- ═══════════════════════════════════════════════════════════════════

-- 1. D'abord, insérer dans la table profiles
INSERT INTO profiles (
  id,
  full_name,
  email,
  phone,
  role,
  is_admin,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(), -- Génère un ID unique
  'George Admin',     -- ⬅️ VOTRE NOM
  'admin@smartcabb.com', -- ⬅️ VOTRE EMAIL
  '+243900000000',   -- ⬅️ VOTRE TÉLÉPHONE
  'admin',
  true,
  NOW(),
  NOW()
)
RETURNING *;

-- 2. Notez l'ID retourné, puis créez le compte auth via l'API
-- (voir méthode B ci-dessous)


-- ═══════════════════════════════════════════════════════════════════
-- VÉRIFIER LES ADMINS EXISTANTS
-- ═══════════════════════════════════════════════════════════════════

SELECT 
  p.id,
  p.full_name,
  p.email,
  p.phone,
  p.role,
  p.is_admin,
  p.created_at,
  CASE 
    WHEN a.id IS NOT NULL THEN '✅ Auth OK'
    ELSE '❌ Pas de compte auth'
  END as status_auth
FROM profiles p
LEFT JOIN auth.users a ON a.email = p.email
WHERE p.role = 'admin'
ORDER BY p.created_at DESC;

-- Si "Pas de compte auth", vous devez créer le compte via l'API
