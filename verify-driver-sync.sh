#!/bin/bash

# Script de vérification de la synchronisation des conducteurs
# Usage: ./verify-driver-sync.sh DRIVER_ID

if [ -z "$1" ]; then
  echo "❌ Usage: ./verify-driver-sync.sh DRIVER_ID"
  echo "   Exemple: ./verify-driver-sync.sh abc123-def456-789"
  exit 1
fi

DRIVER_ID=$1

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

echo "🔍 Vérification de la synchronisation du conducteur: $DRIVER_ID"
echo "🌐 Projet Supabase: $PROJECT_ID"
echo ""

# Appeler la route de debug
echo "📡 Appel de la route de debug..."
RESPONSE=$(curl -s "https://${PROJECT_ID}.supabase.co/functions/v1/make-server-2eb02e52/drivers/${DRIVER_ID}/debug" \
  -H "Authorization: Bearer ${VITE_SUPABASE_ANON_KEY}")

echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"

# Extraire les statuts (nécessite jq)
if command -v jq &> /dev/null; then
  echo ""
  echo "📊 Résumé de synchronisation:"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  KV_STATUS=$(echo "$RESPONSE" | jq -r '.debug.sources.kv_store.status // "N/A"')
  AUTH_STATUS=$(echo "$RESPONSE" | jq -r '.debug.sources.auth.status_in_metadata // "N/A"')
  PG_STATUS=$(echo "$RESPONSE" | jq -r '.debug.sources.postgres_drivers.status // "N/A"')
  
  echo "📦 KV Store:    $KV_STATUS"
  echo "🔐 Auth:        $AUTH_STATUS"
  echo "💾 Postgres:    $PG_STATUS"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  if [ "$KV_STATUS" = "$AUTH_STATUS" ] && [ "$AUTH_STATUS" = "$PG_STATUS" ]; then
    echo "✅ SYNCHRONISÉ - Toutes les sources ont le même statut: $KV_STATUS"
  else
    echo "❌ INCOHÉRENCE DÉTECTÉE !"
    echo "   Les 3 sources ne sont pas synchronisées."
    echo "   Veuillez redéployer le backend et réapprouver le conducteur."
  fi
else
  echo ""
  echo "⚠️ jq non installé. Installez-le pour voir le résumé formaté:"
  echo "   macOS: brew install jq"
  echo "   Linux: sudo apt-get install jq"
fi

echo ""
