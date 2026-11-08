-- ============================================================================
-- Nettoyage des alertes SOS de test (vérification de la mise en production)
-- ============================================================================
-- Supprime uniquement les alertes créées par les tests techniques, identifiées
-- par `metadata.source = 'agent-test'`. Aucune donnée utilisateur réelle n'est
-- concernée. La migration est idempotente.
-- ============================================================================

DELETE FROM public.emergency_alerts
WHERE metadata ->> 'source' = 'agent-test'
   OR user_id LIKE 'sos-test-%';
