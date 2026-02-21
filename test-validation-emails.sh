#!/bin/bash

# 🧪 Script de test de validation des emails
# SmartCabb - Vérification des corrections anti-bounce
# Date: 5 février 2026

echo "🧪 TESTS DE VALIDATION DES EMAILS - SmartCabb"
echo "=============================================="
echo ""

# Configuration
BASE_URL="https://zaerjqchzqmcxqblkfkg.supabase.co/functions/v1/make-server-2eb02e52"
ANON_KEY="YOUR_SUPABASE_ANON_KEY_HERE" # ⚠️ À REMPLACER

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Compteurs
PASSED=0
FAILED=0

# Fonction de test
test_case() {
  local name="$1"
  local method="$2"
  local endpoint="$3"
  local data="$4"
  local expected_status="$5"
  local expected_keyword="$6"
  
  echo -n "Test: $name ... "
  
  response=$(curl -s -w "\n%{http_code}" -X "$method" \
    "$BASE_URL$endpoint" \
    -H "Authorization: Bearer $ANON_KEY" \
    -H "Content-Type: application/json" \
    -d "$data")
  
  http_code=$(echo "$response" | tail -n 1)
  body=$(echo "$response" | sed '$d')
  
  if [ "$http_code" -eq "$expected_status" ]; then
    if echo "$body" | grep -q "$expected_keyword"; then
      echo -e "${GREEN}✅ PASSED${NC}"
      PASSED=$((PASSED + 1))
    else
      echo -e "${RED}❌ FAILED${NC} (Wrong response body)"
      echo "  Expected keyword: $expected_keyword"
      echo "  Response: $body"
      FAILED=$((FAILED + 1))
    fi
  else
    echo -e "${RED}❌ FAILED${NC} (HTTP $http_code, expected $expected_status)"
    echo "  Response: $body"
    FAILED=$((FAILED + 1))
  fi
}

echo "📋 Groupe 1: Tests de validation des emails"
echo "--------------------------------------------"

# Test 1: Email valide doit être accepté
test_case \
  "Email valide (test@gmail.com)" \
  "POST" \
  "/signup-passenger" \
  '{
    "email": "test_valid_'$(date +%s)'@gmail.com",
    "phone": "081'$(date +%s | tail -c 8)'",
    "password": "test123",
    "fullName": "Test User Valid",
    "role": "passenger"
  }' \
  200 \
  "success"

# Test 2: Email invalide doit être rejeté
test_case \
  "Email invalide (invalidemail@)" \
  "POST" \
  "/signup-passenger" \
  '{
    "email": "invalidemail@",
    "phone": "081'$(date +%s | tail -c 8)'",
    "password": "test123",
    "fullName": "Test User Invalid",
    "role": "passenger"
  }' \
  400 \
  "Email invalide"

# Test 3: Email @smartcabb.app fourni doit être rejeté
test_case \
  "Email @smartcabb.app rejeté" \
  "POST" \
  "/signup-passenger" \
  '{
    "email": "test@smartcabb.app",
    "phone": "081'$(date +%s | tail -c 8)'",
    "password": "test123",
    "fullName": "Test User Smartcabb",
    "role": "passenger"
  }' \
  400 \
  "Email invalide"

# Test 4: Pas d'email doit générer @smartcabb.app automatiquement
test_case \
  "Pas d'email (génération auto)" \
  "POST" \
  "/signup-passenger" \
  '{
    "phone": "081'$(date +%s | tail -c 8)'",
    "password": "test123",
    "fullName": "Test User Phone Only",
    "role": "passenger"
  }' \
  200 \
  "success"

echo ""
echo "📋 Groupe 2: Tests de l'audit des emails"
echo "----------------------------------------"

# Test 5: Route d'audit accessible
test_case \
  "Route /audit-emails accessible" \
  "GET" \
  "/audit-emails" \
  "" \
  200 \
  "stats"

echo ""
echo "📋 Groupe 3: Tests conducteur (driver)"
echo "--------------------------------------"

# Test 6: Email valide conducteur
test_case \
  "Conducteur avec email valide" \
  "POST" \
  "/signup-driver" \
  '{
    "email": "driver_'$(date +%s)'@gmail.com",
    "phone": "081'$(date +%s | tail -c 8)'",
    "password": "test123",
    "fullName": "Test Driver Valid",
    "vehicleMake": "Toyota",
    "vehicleModel": "Corolla",
    "vehiclePlate": "CD-1234",
    "vehicleColor": "Blanc",
    "vehicleCategory": "economy"
  }' \
  200 \
  "success"

# Test 7: Email invalide conducteur
test_case \
  "Conducteur avec email invalide" \
  "POST" \
  "/signup-driver" \
  '{
    "email": "invalidemail",
    "phone": "081'$(date +%s | tail -c 8)'",
    "password": "test123",
    "fullName": "Test Driver Invalid",
    "vehicleMake": "Toyota",
    "vehicleModel": "Corolla",
    "vehiclePlate": "CD-1234",
    "vehicleColor": "Blanc",
    "vehicleCategory": "economy"
  }' \
  400 \
  "Email invalide"

echo ""
echo "=============================================="
echo "📊 RÉSULTATS DES TESTS"
echo "=============================================="
echo -e "${GREEN}✅ Tests réussis: $PASSED${NC}"
echo -e "${RED}❌ Tests échoués: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}🎉 TOUS LES TESTS SONT PASSÉS !${NC}"
  echo "✅ La validation des emails fonctionne correctement"
  echo "✅ Les emails invalides sont bien rejetés"
  echo "✅ Les emails @smartcabb.app fournis sont rejetés"
  echo "✅ L'audit des emails est accessible"
  exit 0
else
  echo -e "${RED}⚠️ CERTAINS TESTS ONT ÉCHOUÉ${NC}"
  echo "Vérifiez les logs ci-dessus pour plus de détails"
  echo ""
  echo "Actions recommandées:"
  echo "1. Vérifier que le backend est bien déployé"
  echo "2. Vérifier la clé ANON_KEY dans le script"
  echo "3. Vérifier les logs Supabase Edge Functions"
  exit 1
fi
