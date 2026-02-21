#!/bin/bash

# Script pour vérifier que le backend est bien déployé avec les dernières corrections
# Usage: ./check-backend-version.sh

# Lire les variables d'environnement depuis .env.local
if [ -f .env.local ]; then
  export $(cat .env.local | grep -v '#' | xargs)
else
  echo "❌ Fichier .env.local non trouvé"
  exit 1
fi

if [ -z "$VITE_SUPABASE_URL" ] || [ -z "$VITE_SUPABASE_ANON_KEY" ]; then
  echo "❌ Variables VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY requises dans .env.local"
  exit 1
fi

# Extraire le PROJECT_ID de l'URL Supabase
PROJECT_ID=$(echo $VITE_SUPABASE_URL | sed 's/https:\/\/\([^.]*\).*/\1/')

echo "🔍 Vérification du backend SmartCabb"
echo "🌐 Projet Supabase: $PROJECT_ID"
echo ""

# Tester une route simple pour vérifier que le backend répond
echo "📡 Test de connexion au backend..."
RESPONSE=$(curl -s -w "\n%{http_code}" "https://${PROJECT_ID}.supabase.co/functions/v1/make-server-2eb02e52/drivers" \
  -H "Authorization: Bearer ${VITE_SUPABASE_ANON_KEY}")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Backend accessible (HTTP $HTTP_CODE)"
  
  # Compter le nombre de conducteurs
  if command -v jq &> /dev/null; then
    COUNT=$(echo "$BODY" | jq -r '.count // 0')
    echo "📊 Nombre de conducteurs: $COUNT"
  fi
else
  echo "❌ Backend non accessible (HTTP $HTTP_CODE)"
  echo "📄 Réponse: $BODY"
  echo ""
  echo "⚠️ Le backend n'a peut-être pas été déployé ou il y a une erreur."
  echo "   Exécutez: npx supabase functions deploy make-server-2eb02e52"
  exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 Vérification de la version du code"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Vérifier que le fichier driver-routes.tsx contient bien la correction
if grep -q "\.eq('user_id', driverId)" /supabase/functions/server/driver-routes.tsx; then
  echo "✅ Correction présente dans le code source (user_id)"
else
  echo "❌ Correction ABSENTE du code source"
  echo "   Le fichier driver-routes.tsx ne contient pas .eq('user_id', driverId)"
  exit 1
fi

if grep -q "FIX CRITIQUE : Utiliser user_id au lieu de id" /supabase/functions/server/driver-routes.tsx; then
  echo "✅ Commentaire de correction trouvé"
else
  echo "⚠️ Commentaire de correction non trouvé"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 Prochaines étapes"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1️⃣ Si le backend est accessible, déployez les dernières modifications :"
echo "   npx supabase functions deploy make-server-2eb02e52"
echo ""
echo "2️⃣ Testez l'approbation d'un conducteur dans le panel admin"
echo ""
echo "3️⃣ Vérifiez la synchronisation avec :"
echo "   ./verify-driver-sync.sh DRIVER_ID"
echo ""
