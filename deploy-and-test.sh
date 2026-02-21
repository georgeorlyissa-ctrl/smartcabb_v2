#!/bin/bash

# Script tout-en-un pour déployer et tester les corrections
# Usage: ./deploy-and-test.sh [DRIVER_ID]

set -e  # Arrêter en cas d'erreur

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 SmartCabb - Déploiement et Test des Corrections"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Vérifier que nous sommes dans le bon répertoire
if [ ! -f "supabase/functions/server/driver-routes.tsx" ]; then
  echo "❌ Erreur: Ce script doit être exécuté depuis la racine du projet SmartCabb"
  exit 1
fi

# Lire les variables d'environnement
if [ -f .env.local ]; then
  export $(cat .env.local | grep -v '#' | xargs)
else
  echo "❌ Fichier .env.local non trouvé"
  exit 1
fi

PROJECT_ID=$(echo $VITE_SUPABASE_URL | sed 's/https:\/\/\([^.]*\).*/\1/')

echo "📊 Configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌐 Projet Supabase: $PROJECT_ID"
echo ""

# Étape 1: Vérifier le code source
echo "1️⃣ Vérification du code source..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if grep -q "\.eq('user_id', driverId)" supabase/functions/server/driver-routes.tsx; then
  echo "✅ Correction présente dans le code source (user_id)"
else
  echo "❌ Correction ABSENTE du code source"
  echo "   Le fichier driver-routes.tsx ne contient pas .eq('user_id', driverId)"
  exit 1
fi

if grep -q "FIX CRITIQUE : Utiliser user_id au lieu de id" supabase/functions/server/driver-routes.tsx; then
  echo "✅ Commentaire de correction trouvé"
else
  echo "⚠️ Commentaire de correction non trouvé (mais correction présente)"
fi

echo ""

# Étape 2: Déployer le backend
echo "2️⃣ Déploiement du backend sur Supabase..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⚠️ Cette opération peut prendre quelques minutes..."
echo ""

npx supabase functions deploy make-server-2eb02e52

echo ""
echo "✅ Déploiement terminé !"
echo ""

# Étape 3: Vérifier que le backend répond
echo "3️⃣ Vérification de l'accessibilité du backend..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

RESPONSE=$(curl -s -w "\n%{http_code}" "https://${PROJECT_ID}.supabase.co/functions/v1/make-server-2eb02e52/drivers" \
  -H "Authorization: Bearer ${VITE_SUPABASE_ANON_KEY}")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Backend accessible (HTTP $HTTP_CODE)"
else
  echo "❌ Backend non accessible (HTTP $HTTP_CODE)"
  echo "📄 Réponse: $RESPONSE"
  exit 1
fi

echo ""

# Étape 4: Si un DRIVER_ID est fourni, tester la synchronisation
if [ -n "$1" ]; then
  DRIVER_ID=$1
  echo "4️⃣ Test de synchronisation pour le conducteur: $DRIVER_ID"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  DEBUG_RESPONSE=$(curl -s "https://${PROJECT_ID}.supabase.co/functions/v1/make-server-2eb02e52/drivers/${DRIVER_ID}/debug" \
    -H "Authorization: Bearer ${VITE_SUPABASE_ANON_KEY}")
  
  if command -v jq &> /dev/null; then
    echo "$DEBUG_RESPONSE" | jq .
    
    KV_STATUS=$(echo "$DEBUG_RESPONSE" | jq -r '.debug.sources.kv_store.status // "N/A"')
    AUTH_STATUS=$(echo "$DEBUG_RESPONSE" | jq -r '.debug.sources.auth.status_in_metadata // "N/A"')
    PG_STATUS=$(echo "$DEBUG_RESPONSE" | jq -r '.debug.sources.postgres_drivers.status // "N/A"')
    
    echo ""
    echo "📊 Résumé de synchronisation:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📦 KV Store:    $KV_STATUS"
    echo "🔐 Auth:        $AUTH_STATUS"
    echo "💾 Postgres:    $PG_STATUS"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    if [ "$KV_STATUS" = "$AUTH_STATUS" ] && [ "$AUTH_STATUS" = "$PG_STATUS" ]; then
      echo "✅ SYNCHRONISÉ - Toutes les sources ont le même statut: $KV_STATUS"
    else
      echo "❌ INCOHÉRENCE DÉTECTÉE !"
      echo "   Les 3 sources ne sont pas synchronisées."
      echo "   Veuillez approuver à nouveau le conducteur dans le panel admin."
    fi
  else
    echo "$DEBUG_RESPONSE"
  fi
  
  echo ""
fi

# Résumé final
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Déploiement et tests terminés !"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Prochaines étapes :"
echo ""
echo "1️⃣ Ouvrez le panel admin : https://smartcabb.com/admin"
echo "2️⃣ Allez dans 'Gestion des chauffeurs'"
echo "3️⃣ Approuvez un conducteur en attente"
echo "4️⃣ Vérifiez que les logs de synchronisation s'affichent dans la console (F12)"
echo "5️⃣ Déconnectez-vous de l'app conducteur et reconnectez-vous"
echo "6️⃣ Vérifiez que vous arrivez directement sur l'écran principal"
echo ""
echo "🔍 Pour vérifier la synchronisation d'un conducteur :"
echo "   ./verify-driver-sync.sh DRIVER_ID"
echo ""
echo "📚 Pour plus d'informations :"
echo "   Consultez /DEPLOYMENT_GUIDE.md et /RESOLUTION_PROBLEME.md"
echo ""
