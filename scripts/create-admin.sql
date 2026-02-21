-- ═══════════════════════════════════════════════════════════════════
-- 👑 CRÉER UN NOUVEAU COMPTE ADMIN
-- ═══════════════════════════════════════════════════════════════════
-- 
-- Usage : Exécutez dans le SQL Editor de Supabase
-- 
-- ⚠️ IMPORTANT : Remplacez les valeurs ci-dessous par les vôtres !
-- ═══════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════
-- ÉTAPE 1 : CRÉER LE PROFIL ADMIN
-- ═══════════════════════════════════════════════════════════════════

INSERT INTO profiles (
  id,
  full_name,
  email,
  phone,
  role,
  is_admin,
  avatar_url,
  address,
  city,
  country,
  postal_code,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  
  -- ⬇️ MODIFIEZ CES VALEURS ⬇️
  'George Admin',              -- 👤 Votre nom
  'george@smartcabb.com',      -- 📧 Votre email
  '+243990000000',             -- 📱 Votre téléphone
  
  -- ⬇️ NE PAS MODIFIER ⬇️
  'admin',
  true,
  'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
  'Kinshasa',
  'Kinshasa',
  'RDC',
  '00000',
  NOW(),
  NOW()
)
RETURNING 
  id,
  full_name,
  email,
  phone,
  role;

-- ✅ Notez l'ID retourné, vous en aurez besoin pour l'étape 2


-- ═══════════════════════════════════════════════════════════════════
-- ÉTAPE 2 : CRÉER LE COMPTE AUTH (VIA API - VOIR CI-DESSOUS)
-- ═══════════════════════════════════════════════════════════════════

-- ⚠️ Vous ne pouvez pas créer un compte Supabase Auth directement en SQL
-- Utilisez une des méthodes ci-dessous :

-- MÉTHODE A : Via l'interface Supabase
--   1. Allez dans "Authentication" → "Users"
--   2. Cliquez sur "Add user"
--   3. Entrez l'email et le mot de passe
--   4. Cochez "Auto Confirm User"

-- MÉTHODE B : Via curl (depuis votre terminal)
-- Remplacez <USER_ID>, <EMAIL>, <PASSWORD> par vos valeurs

/*
curl -X POST 'https://zaerjqchzqmcxqblkfkg.supabase.co/auth/v1/admin/users' \
  -H "apikey: VOTRE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer VOTRE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "george@smartcabb.com",
    "password": "VotreMotDePasseSecurise123!",
    "email_confirm": true,
    "user_metadata": {
      "full_name": "George Admin",
      "role": "admin"
    }
  }'
*/

-- MÉTHODE C : Via le panel admin SmartCabb (route signup)
-- Allez sur smartcabb.com/admin et créez le compte


-- ═══════════════════════════════════════════════════════════════════
-- ÉTAPE 3 : VÉRIFIER QUE TOUT FONCTIONNE
-- ═══════════════════════════════════════════════════════════════════

SELECT 
  p.id,
  p.full_name,
  p.email,
  p.phone,
  p.role,
  p.is_admin,
  CASE 
    WHEN a.id IS NOT NULL THEN '✅ Compte Auth créé'
    ELSE '⚠️ Compte Auth manquant'
  END as status,
  a.email_confirmed_at,
  a.created_at as auth_created_at
FROM profiles p
LEFT JOIN auth.users a ON a.email = p.email
WHERE p.role = 'admin'
ORDER BY p.created_at DESC;


-- ═══════════════════════════════════════════════════════════════════
-- 🔧 BONUS : PROMOUVOIR UN UTILISATEUR EXISTANT EN ADMIN
-- ═══════════════════════════════════════════════════════════════════

-- Si vous avez déjà un compte utilisateur, vous pouvez le promouvoir :

UPDATE profiles
SET 
  role = 'admin',
  is_admin = true,
  updated_at = NOW()
WHERE email = 'votre.email@example.com'; -- ⬅️ VOTRE EMAIL ICI

-- Vérifier
SELECT id, full_name, email, role, is_admin
FROM profiles
WHERE email = 'votre.email@example.com';
