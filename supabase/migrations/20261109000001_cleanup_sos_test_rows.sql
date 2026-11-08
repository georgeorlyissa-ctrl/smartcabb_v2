-- ============================================================================
-- Nettoyage SOS — seconde passe
-- ============================================================================
-- Une vérification manuelle post-déploiement a recréé une alerte technique avec
-- `user_id = 'sos-test-…'`. Ce nettoyage supprime toutes les alertes de test.
-- Idempotent : ne touche aucune alerte utilisateur réelle.
-- ============================================================================

DELETE FROM public.emergency_alerts
WHERE metadata ->> 'source' = 'agent-test'
   OR user_id LIKE 'sos-test-%';
