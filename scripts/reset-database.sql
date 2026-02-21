-- ═══════════════════════════════════════════════════════════════════
-- 🗑️ SCRIPT SQL DE RÉINITIALISATION DE LA BASE DE DONNÉES SMARTCABB
-- ═══════════════════════════════════════════════════════════════════
-- 
-- ⚠️ ATTENTION : CES REQUÊTES SUPPRIMENT DÉFINITIVEMENT LES DONNÉES !
-- 
-- Usage : Copiez-collez les sections ci-dessous dans le SQL Editor
--         de Supabase (https://supabase.com/dashboard/project/YOUR_PROJECT/editor)
-- 
-- Date : 5 février 2026
-- Version : 1.0.0
-- ═══════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════
-- 📊 OPTION 0 : VOIR LES STATISTIQUES (SANS RIEN SUPPRIMER)
-- ═══════════════════════════════════════════════════════════════════
-- Exécutez cette requête pour voir combien de données vous avez

SELECT 
  'ratings' as table_name, COUNT(*) as count FROM ratings
UNION ALL
SELECT 'transactions', COUNT(*) FROM transactions
UNION ALL
SELECT 'notifications', COUNT(*) FROM notifications
UNION ALL
SELECT 'documents', COUNT(*) FROM documents
UNION ALL
SELECT 'rides', COUNT(*) FROM rides
UNION ALL
SELECT 'vehicles', COUNT(*) FROM vehicles
UNION ALL
SELECT 'drivers', COUNT(*) FROM drivers
UNION ALL
SELECT 'promo_codes', COUNT(*) FROM promo_codes
UNION ALL
SELECT 'settings', COUNT(*) FROM settings
UNION ALL
SELECT 'profiles', COUNT(*) FROM profiles
UNION ALL
SELECT 'kv_store_2eb02e52', COUNT(*) FROM kv_store_2eb02e52
ORDER BY table_name;


-- ═══════════════════════════════════════════════════════════════════
-- 🟢 OPTION 1 : SUPPRIMER UNIQUEMENT LES COURSES
-- ═══════════════════════════════════════════════════════════════════
-- Conserve : Utilisateurs, conducteurs, véhicules, paramètres
-- Supprime : Courses, avis, transactions liées aux courses

BEGIN;

-- Supprimer les avis
DELETE FROM ratings;

-- Supprimer les transactions
DELETE FROM transactions;

-- Supprimer les courses
DELETE FROM rides;

-- Afficher le résultat
SELECT 
  'Courses supprimées' as status,
  (SELECT COUNT(*) FROM rides) as rides_restantes,
  (SELECT COUNT(*) FROM ratings) as ratings_restants,
  (SELECT COUNT(*) FROM transactions) as transactions_restantes;

COMMIT;

-- Si tout s'est bien passé, vous devriez voir 0 partout
-- Si erreur, faites : ROLLBACK;


-- ═══════════════════════════════════════════════════════════════════
-- 🟡 OPTION 2 : SUPPRIMER LES UTILISATEURS (GARDE PARAMÈTRES)
-- ═══════════════════════════════════════════════════════════════════
-- Conserve : Codes promo, paramètres système
-- Supprime : Profils, conducteurs, véhicules, courses, notifications, documents

BEGIN;

-- 1. Supprimer les avis (dépend de rides)
DELETE FROM ratings;

-- 2. Supprimer les transactions (dépend de rides)
DELETE FROM transactions;

-- 3. Supprimer les notifications (dépend de profiles)
DELETE FROM notifications;

-- 4. Supprimer les documents (dépend de drivers)
DELETE FROM documents;

-- 5. Supprimer les courses (dépend de drivers, profiles)
DELETE FROM rides;

-- 6. Supprimer les véhicules (dépend de drivers)
DELETE FROM vehicles;

-- 7. Supprimer les conducteurs (dépend de profiles)
DELETE FROM drivers;

-- 8. Supprimer les profils
DELETE FROM profiles;

-- Afficher le résultat
SELECT 
  'Utilisateurs supprimés' as status,
  (SELECT COUNT(*) FROM profiles) as profiles_restants,
  (SELECT COUNT(*) FROM drivers) as drivers_restants,
  (SELECT COUNT(*) FROM rides) as rides_restantes,
  (SELECT COUNT(*) FROM promo_codes) as promos_conserves,
  (SELECT COUNT(*) FROM settings) as settings_conserves;

COMMIT;

-- Si tout s'est bien passé, profiles/drivers/rides = 0
-- promos et settings devraient être conservés
-- Si erreur, faites : ROLLBACK;


-- ═══════════════════════════════════════════════════════════════════
-- 🔴 OPTION 3 : RÉINITIALISATION COMPLÈTE (TOUT SUPPRIMER)
-- ═══════════════════════════════════════════════════════════════════
-- ⚠️ TRÈS DANGEREUX : Supprime ABSOLUMENT TOUT !
-- Seule la table kv_store_2eb02e52 sera partiellement conservée

BEGIN;

-- 1. Supprimer les avis
DELETE FROM ratings;

-- 2. Supprimer les transactions
DELETE FROM transactions;

-- 3. Supprimer les notifications
DELETE FROM notifications;

-- 4. Supprimer les documents
DELETE FROM documents;

-- 5. Supprimer les courses
DELETE FROM rides;

-- 6. Supprimer les véhicules
DELETE FROM vehicles;

-- 7. Supprimer les conducteurs
DELETE FROM drivers;

-- 8. Supprimer les codes promo
DELETE FROM promo_codes;

-- 9. Supprimer les paramètres
DELETE FROM settings;

-- 10. Supprimer les profils
DELETE FROM profiles;

-- 11. Nettoyer le KV Store (garde la config globale)
DELETE FROM kv_store_2eb02e52 
WHERE key != 'smartcabb_global_config';

-- Afficher le résultat
SELECT 
  'Base de données réinitialisée' as status,
  (SELECT COUNT(*) FROM profiles) as profiles,
  (SELECT COUNT(*) FROM drivers) as drivers,
  (SELECT COUNT(*) FROM rides) as rides,
  (SELECT COUNT(*) FROM promo_codes) as promos,
  (SELECT COUNT(*) FROM settings) as settings,
  (SELECT COUNT(*) FROM kv_store_2eb02e52) as kv_keys_restantes;

COMMIT;

-- Tout devrait être à 0 sauf kv_keys_restantes (= 1 pour la config globale)
-- Si erreur, faites : ROLLBACK;


-- ═══════════════════════════════════════════════════════════════════
-- 🔄 APRÈS RÉINITIALISATION : VÉRIFICATION
-- ═══════════════════════════════════════════════════════════════════
-- Exécutez cette requête pour vérifier que tout a bien été supprimé

SELECT 
  'VÉRIFICATION POST-RESET' as titre,
  (SELECT COUNT(*) FROM profiles) as profiles,
  (SELECT COUNT(*) FROM drivers) as drivers,
  (SELECT COUNT(*) FROM vehicles) as vehicles,
  (SELECT COUNT(*) FROM rides) as rides,
  (SELECT COUNT(*) FROM ratings) as ratings,
  (SELECT COUNT(*) FROM transactions) as transactions,
  (SELECT COUNT(*) FROM notifications) as notifications,
  (SELECT COUNT(*) FROM documents) as documents,
  (SELECT COUNT(*) FROM promo_codes) as promo_codes,
  (SELECT COUNT(*) FROM settings) as settings,
  (SELECT COUNT(*) FROM kv_store_2eb02e52) as kv_keys;


-- ═══════════════════════════════════════════════════════════════════
-- 🆘 EN CAS DE PROBLÈME : ANNULER
-- ═══════════════════════════════════════════════════════════════════
-- Si vous avez exécuté une requête et que vous voulez annuler :

ROLLBACK;

-- Note : Ceci n'annule QUE si vous n'avez pas encore fait COMMIT
-- Une fois COMMIT exécuté, les données sont définitivement supprimées !


-- ═══════════════════════════════════════════════════════════════════
-- 📝 NOTES IMPORTANTES
-- ═══════════════════════════════════════════════════════════════════
--
-- 1. Les requêtes sont dans l'ordre des dépendances (contraintes FK)
-- 2. BEGIN/COMMIT créent une transaction (tout ou rien)
-- 3. Si erreur, utilisez ROLLBACK pour annuler
-- 4. Les données supprimées sont IRRECUPÉRABLES
-- 5. Faites TOUJOURS une sauvegarde avant (Backup & Recovery)
--
-- ═══════════════════════════════════════════════════════════════════
