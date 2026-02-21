#!/bin/bash

# 🔍 Script de Vérification du Déploiement SmartCabb V7
# Ce script vérifie que le backend a été correctement déployé sur Supabase

# Couleurs pour les messages
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔍 Vérification du Déploiement SmartCabb Backend V7"
echo "=================================================="
echo ""

# Demander l'URL du projet Supabase
read -p "Entrez votre PROJECT_ID Supabase (ex: abcdefghijklmnop) : " PROJECT_ID

if [ -z "$PROJECT_ID" ]; then
  echo -e "${RED}❌ PROJECT_ID requis${NC}"
  exit 1
fi

BASE_URL="https://${PROJECT_ID}.supabase.co/functions/v1/make-server-2eb02e52"

echo ""
echo "📡 URL de base : $BASE_URL"
echo ""

# Test 1 : Health Check
echo "🧪 Test 1 : Health Check"
echo "------------------------"
HEALTH_RESPONSE=$(curl -s "${BASE_URL}/health")
if echo "$HEALTH_RESPONSE" | grep -q '"status":"ok"'; then
  echo -e "${GREEN}✅ Health check : OK${NC}"
  echo "   Réponse : $HEALTH_RESPONSE"
else
  echo -e "${RED}❌ Health check : ÉCHEC${NC}"
  echo "   Réponse : $HEALTH_RESPONSE"
fi
echo ""

# Test 2 : Diagnostic Supabase
echo "🧪 Test 2 : Diagnostic Supabase"
echo "--------------------------------"
DIAG_RESPONSE=$(curl -s "${BASE_URL}/diagnostic/supabase")
if echo "$DIAG_RESPONSE" | grep -q '"status":"connected"'; then
  echo -e "${GREEN}✅ KV Store : Connecté${NC}"
else
  echo -e "${YELLOW}⚠️  KV Store : Vérifier la connexion${NC}"
fi
echo "   Réponse : $DIAG_RESPONSE"
echo ""

# Test 3 : Vérification des logs
echo "🧪 Test 3 : Vérification de la Version"
echo "---------------------------------------"
echo "Ouvrez les logs de la fonction dans le dashboard Supabase :"
echo "https://supabase.com/dashboard/project/${PROJECT_ID}/functions/make-server-2eb02e52/logs"
echo ""
echo "Vous devriez voir :"
echo -e "${GREEN}🔄 Serveur SmartCabb V7 - Fix Téléphone - 14/02/2026${NC}"
echo ""

# Résumé
echo "📊 Résumé"
echo "========="
echo ""
echo "Si tous les tests sont verts (✅), le déploiement a réussi !"
echo ""
echo "Prochaines étapes :"
echo "1. Tester l'envoi de SMS depuis le panel admin"
echo "2. Créer une course test depuis l'app passager"
echo "3. Vérifier que les conducteurs reçoivent les notifications"
echo ""
echo "📚 Pour plus d'informations, consultez /DEPLOYMENT_GUIDE_V7.md"
