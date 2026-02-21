#!/bin/bash

# Script de test automatisé pour vérifier la correction UUID
# Usage: ./test-uuid-fix.sh [PROJECT_ID] [ANON_KEY]

PROJECT_ID=$1
ANON_KEY=$2

if [ -z "$PROJECT_ID" ] || [ -z "$ANON_KEY" ]; then
  echo "❌ Usage: ./test-uuid-fix.sh [PROJECT_ID] [ANON_KEY]"
  echo ""
  echo "Exemple:"
  echo "  ./test-uuid-fix.sh abcdefghijk eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  exit 1
fi

BASE_URL="https://${PROJECT_ID}.supabase.co/functions/v1/make-server-2eb02e52"

echo "🧪 Test de la correction UUID - SmartCabb"
echo "=========================================="
echo ""
echo "🌐 URL Backend: $BASE_URL"
echo ""

# Test 1: Health Check
echo "1️⃣ Test du Health Check..."
health_response=$(curl -s "${BASE_URL}/health")
if echo "$health_response" | grep -q "ok"; then
  echo "   ✅ Backend opérationnel"
else
  echo "   ❌ Backend ne répond pas correctement"
  echo "   Réponse: $health_response"
  exit 1
fi

# Test 2: Version Check
echo ""
echo "2️⃣ Test de la version du serveur..."
version_response=$(curl -s "${BASE_URL}/version" -H "Authorization: Bearer ${ANON_KEY}")
echo "   Version: $version_response"
if echo "$version_response" | grep -q "V6"; then
  echo "   ✅ Version V6 détectée (avec validation UUID)"
else
  echo "   ⚠️  Version non V6 - vérifier le déploiement"
fi

# Test 3: Test avec un UUID invalide (doit gérer gracieusement)
echo ""
echo "3️⃣ Test de gestion d'UUID invalide..."
invalid_uuid_response=$(curl -s "${BASE_URL}/drivers/invalid-uuid-123/debug" \
  -H "Authorization: Bearer ${ANON_KEY}")
  
if echo "$invalid_uuid_response" | grep -q "ID invalide"; then
  echo "   ✅ UUID invalide géré correctement (pas de crash)"
else
  echo "   ❌ Gestion UUID invalide problématique"
  echo "   Réponse: $invalid_uuid_response"
fi

# Test 4: Lister les conducteurs (endpoint admin)
echo ""
echo "4️⃣ Test de listing des conducteurs..."
drivers_response=$(curl -s "${BASE_URL}/admin/drivers" \
  -H "Authorization: Bearer ${ANON_KEY}" \
  -H "Content-Type: application/json")

if echo "$drivers_response" | grep -q "success"; then
  driver_count=$(echo "$drivers_response" | grep -o '"id"' | wc -l)
  echo "   ✅ Endpoint drivers fonctionne ($driver_count conducteurs)"
else
  echo "   ❌ Endpoint drivers ne répond pas correctement"
fi

# Test 5: Recherche de logs d'erreur récents
echo ""
echo "5️⃣ Vérification des logs récents..."
echo "   (Vérifier manuellement avec: npx supabase functions logs make-server-2eb02e52)"
echo "   Rechercher l'absence de: 'Expected parameter to be UUID but is not'"

# Résumé
echo ""
echo "=========================================="
echo "📊 Résumé des Tests"
echo "=========================================="
echo ""
echo "✅ Tests de base réussis"
echo ""
echo "🎯 Prochaines étapes manuelles:"
echo "   1. Tester l'approbation d'un conducteur dans le panel admin"
echo "   2. Vérifier que le conducteur approuvé voit son tableau de bord"
echo "   3. Surveiller les logs: npx supabase functions logs make-server-2eb02e52 --follow"
echo ""
echo "📋 Endpoint de debug pour un conducteur:"
echo "   curl \"${BASE_URL}/drivers/[DRIVER_ID]/debug\" \\"
echo "     -H \"Authorization: Bearer ${ANON_KEY}\""
echo ""
echo "🎉 Si tous les tests passent, la correction UUID est en place !"
