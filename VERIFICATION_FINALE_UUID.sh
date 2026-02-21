#!/bin/bash

# Script de vérification finale avant déploiement
# Usage: ./VERIFICATION_FINALE_UUID.sh

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 VÉRIFICATION FINALE - Correction UUID SmartCabb"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Compteurs
total_checks=0
passed_checks=0
failed_checks=0

# Fonction pour afficher un check
check() {
  total_checks=$((total_checks + 1))
  if [ $1 -eq 0 ]; then
    echo "✅ $2"
    passed_checks=$((passed_checks + 1))
  else
    echo "❌ $2"
    failed_checks=$((failed_checks + 1))
  fi
}

echo "📋 1. VÉRIFICATION DES FICHIERS BACKEND"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Vérifier que uuid-validator.ts existe
if [ -f "supabase/functions/server/uuid-validator.ts" ]; then
  check 0 "uuid-validator.ts existe"
else
  check 1 "uuid-validator.ts N'EXISTE PAS"
fi

# Vérifier que tous les fichiers backend existent
backend_files=(
  "supabase/functions/server/index.tsx"
  "supabase/functions/server/driver-routes.tsx"
  "supabase/functions/server/auth-routes.tsx"
  "supabase/functions/server/passenger-routes.tsx"
  "supabase/functions/server/diagnostic-driver-route.tsx"
)

for file in "${backend_files[@]}"; do
  if [ -f "$file" ]; then
    check 0 "$(basename $file) existe"
  else
    check 1 "$(basename $file) N'EXISTE PAS"
  fi
done

echo ""
echo "📦 2. VÉRIFICATION DES IMPORTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Vérifier les imports de isValidUUID
for file in "${backend_files[@]}"; do
  if grep -q "import.*isValidUUID.*uuid-validator" "$file" 2>/dev/null; then
    check 0 "$(basename $file) importe isValidUUID"
  else
    check 1 "$(basename $file) N'IMPORTE PAS isValidUUID"
  fi
done

echo ""
echo "🔢 3. COMPTAGE DES VALIDATIONS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Compter les appels getUserById
total_calls=$(grep -r "auth\.admin\.getUserById" supabase/functions/server/*.tsx supabase/functions/server/*.ts 2>/dev/null | wc -l)
echo "   📞 Total appels getUserById: $total_calls"

# Compter les validations UUID (dans les 5 lignes avant getUserById)
total_validations=$(grep -B 5 "auth\.admin\.getUserById" supabase/functions/server/*.tsx supabase/functions/server/*.ts 2>/dev/null | grep -c "isValidUUID")
echo "   🛡️  Total validations UUID: $total_validations"

if [ "$total_calls" -gt 0 ]; then
  coverage=$((total_validations * 100 / total_calls))
  echo "   📊 Couverture: ${coverage}%"
  
  if [ "$coverage" -ge 90 ]; then
    check 0 "Couverture de validation >= 90%"
  else
    check 1 "Couverture de validation < 90%"
  fi
else
  check 1 "Aucun appel getUserById trouvé"
fi

echo ""
echo "📚 4. VÉRIFICATION DE LA DOCUMENTATION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

docs=(
  "LIRE_EN_PREMIER_UUID.md"
  "DEPLOIEMENT_IMMEDIAT.md"
  "GUIDE_DEPLOIEMENT_ET_TEST_UUID.md"
  "RESUME_CORRECTION_UUID.md"
  "INDEX_CORRECTION_UUID.md"
  "COMMANDES_DEPLOIEMENT.txt"
)

for doc in "${docs[@]}"; do
  if [ -f "$doc" ]; then
    check 0 "$doc existe"
  else
    check 1 "$doc N'EXISTE PAS"
  fi
done

echo ""
echo "🔧 5. VÉRIFICATION DES SCRIPTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

scripts=(
  "verify-uuid-validation.sh"
  "test-uuid-fix.sh"
  "VERIFICATION_FINALE_UUID.sh"
)

for script in "${scripts[@]}"; do
  if [ -f "$script" ]; then
    check 0 "$script existe"
    if [ -x "$script" ]; then
      echo "   ✓ $script est exécutable"
    else
      echo "   ⚠️  $script n'est pas exécutable (chmod +x $script)"
    fi
  else
    check 1 "$script N'EXISTE PAS"
  fi
done

echo ""
echo "🔍 6. VÉRIFICATION DU CONTENU DU VALIDATEUR"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ -f "supabase/functions/server/uuid-validator.ts" ]; then
  # Vérifier les fonctions essentielles
  if grep -q "function isValidUUID" supabase/functions/server/uuid-validator.ts || \
     grep -q "export function isValidUUID" supabase/functions/server/uuid-validator.ts; then
    check 0 "Fonction isValidUUID trouvée"
  else
    check 1 "Fonction isValidUUID INTROUVABLE"
  fi
  
  if grep -q "function validateUUIDOrThrow" supabase/functions/server/uuid-validator.ts || \
     grep -q "export function validateUUIDOrThrow" supabase/functions/server/uuid-validator.ts; then
    check 0 "Fonction validateUUIDOrThrow trouvée"
  else
    check 1 "Fonction validateUUIDOrThrow INTROUVABLE"
  fi
  
  if grep -q "function safeGetUserById" supabase/functions/server/uuid-validator.ts || \
     grep -q "export function safeGetUserById" supabase/functions/server/uuid-validator.ts; then
    check 0 "Fonction safeGetUserById trouvée"
  else
    check 1 "Fonction safeGetUserById INTROUVABLE"
  fi
  
  # Vérifier le pattern UUID regex
  if grep -q "uuidRegex.*[0-9a-f].*8.*4.*4.*4.*12" supabase/functions/server/uuid-validator.ts; then
    check 0 "Pattern UUID regex trouvé"
  else
    check 1 "Pattern UUID regex INTROUVABLE"
  fi
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 RÉSUMÉ"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Total de vérifications : $total_checks"
echo "✅ Réussies            : $passed_checks"
echo "❌ Échouées            : $failed_checks"
echo ""

# Calcul du score
if [ "$total_checks" -gt 0 ]; then
  score=$((passed_checks * 100 / total_checks))
  echo "🎯 Score : ${score}%"
  echo ""
  
  if [ "$score" -eq 100 ]; then
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🎉 PARFAIT ! Toutes les vérifications sont passées !"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "✅ Vous êtes PRÊT pour le déploiement !"
    echo ""
    echo "📋 Prochaines étapes :"
    echo "   1. Déployer : npx supabase functions deploy make-server-2eb02e52"
    echo "   2. Tester   : ./test-uuid-fix.sh [PROJECT_ID] [ANON_KEY]"
    echo "   3. Valider  : Approuver un conducteur dans le panel admin"
    echo ""
    exit 0
  elif [ "$score" -ge 90 ]; then
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✅ EXCELLENT ! Presque parfait (${score}%)"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "⚠️  Quelques vérifications mineures ont échoué, mais vous pouvez déployer."
    echo ""
    echo "📋 Prochaines étapes :"
    echo "   1. (Optionnel) Corriger les checks échoués ci-dessus"
    echo "   2. Déployer : npx supabase functions deploy make-server-2eb02e52"
    echo "   3. Tester   : ./test-uuid-fix.sh [PROJECT_ID] [ANON_KEY]"
    echo ""
    exit 0
  elif [ "$score" -ge 70 ]; then
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "⚠️  ATTENTION ! Plusieurs vérifications ont échoué (${score}%)"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "🔧 Recommandation : Corriger les checks échoués avant de déployer"
    echo ""
    exit 1
  else
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "❌ ÉCHEC ! Trop de vérifications ont échoué (${score}%)"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "🚫 NE PAS DÉPLOYER ! Corriger les erreurs ci-dessus d'abord."
    echo ""
    exit 1
  fi
else
  echo "❌ Aucune vérification n'a pu être effectuée"
  exit 1
fi
