#!/bin/bash

# Script de vérification que toutes les validations UUID sont en place
# Usage: ./verify-uuid-validation.sh

echo "🔍 Vérification des validations UUID dans le backend..."
echo ""

# Vérifier que uuid-validator.ts existe
if [ ! -f "supabase/functions/server/uuid-validator.ts" ]; then
  echo "❌ ERREUR: uuid-validator.ts n'existe pas!"
  exit 1
fi
echo "✅ uuid-validator.ts existe"

# Vérifier que tous les fichiers importent isValidUUID
echo ""
echo "📦 Vérification des imports..."
files=("index.tsx" "driver-routes.tsx" "auth-routes.tsx" "passenger-routes.tsx" "diagnostic-driver-route.tsx")

for file in "${files[@]}"; do
  if grep -q "import.*isValidUUID.*uuid-validator" "supabase/functions/server/$file"; then
    echo "✅ $file importe isValidUUID"
  else
    echo "❌ ERREUR: $file n'importe pas isValidUUID!"
    exit 1
  fi
done

# Compter le nombre d'appels getUserById
echo ""
echo "🔢 Comptage des appels getUserById..."
total_calls=$(grep -r "auth\.admin\.getUserById" supabase/functions/server/*.tsx supabase/functions/server/*.ts | wc -l)
echo "   Total d'appels getUserById trouvés: $total_calls"

# Compter le nombre de validations UUID
total_validations=$(grep -B 5 "auth\.admin\.getUserById" supabase/functions/server/*.tsx supabase/functions/server/*.ts | grep -c "isValidUUID")
echo "   Total de validations UUID trouvées: $total_validations"

if [ "$total_calls" -eq "$total_validations" ]; then
  echo "✅ Tous les appels getUserById ont une validation UUID!"
else
  echo "⚠️  ATTENTION: $((total_calls - total_validations)) appels sans validation détectés"
  echo "   (Certains peuvent être intentionnellement sans validation si l'ID vient d'une source sûre)"
fi

# Vérifier les fichiers modifiés récemment
echo ""
echo "📅 Fichiers modifiés récemment:"
ls -lht supabase/functions/server/*.tsx supabase/functions/server/*.ts | head -10

echo ""
echo "✅ Vérification terminée!"
echo ""
echo "📋 Prochaines étapes:"
echo "   1. Déployer le backend: npx supabase functions deploy make-server-2eb02e52"
echo "   2. Tester l'approbation d'un conducteur"
echo "   3. Vérifier les logs pour les erreurs UUID"
