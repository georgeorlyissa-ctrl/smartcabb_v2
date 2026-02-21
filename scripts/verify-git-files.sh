#!/bin/bash

# Script de vérification des fichiers Git pour SmartCabb
# Usage: bash scripts/verify-git-files.sh

echo "🔍 Vérification des fichiers critiques dans Git..."
echo ""

# Liste des fichiers critiques pour l'interface admin
CRITICAL_FILES=(
  "components/admin/AdminForgotPasswordScreen.tsx"
  "components/admin/QuickAdminSignup.tsx"
  "components/admin/AdminLoginScreen.tsx"
  "components/admin/AdminDashboard.tsx"
  "components/admin/AdminAccountSync.tsx"
  "components/admin/AdminQuickSetup.tsx"
  "components/admin/AdminLoginDiagnostic.tsx"
)

echo "📋 Fichiers critiques à vérifier:"
echo ""

MISSING_FILES=()

for file in "${CRITICAL_FILES[@]}"; do
  if git ls-files --error-unmatch "$file" > /dev/null 2>&1; then
    echo "✅ $file - Suivi par Git"
  else
    echo "❌ $file - NON suivi par Git"
    MISSING_FILES+=("$file")
  fi
done

echo ""

if [ ${#MISSING_FILES[@]} -eq 0 ]; then
  echo "✅ Tous les fichiers critiques sont suivis par Git !"
  echo ""
  echo "🚀 Prochaines étapes:"
  echo "   1. git status"
  echo "   2. git add ."
  echo "   3. git commit -m 'fix: Ajout des composants admin manquants'"
  echo "   4. git push"
else
  echo "⚠️  ${#MISSING_FILES[@]} fichier(s) manquant(s) dans Git:"
  echo ""
  for file in "${MISSING_FILES[@]}"; do
    echo "   - $file"
  done
  echo ""
  echo "🔧 Pour les ajouter:"
  echo "   git add ${MISSING_FILES[@]}"
  echo "   git commit -m 'fix: Ajout des composants admin manquants'"
  echo "   git push"
fi

echo ""
echo "📊 Statut Git actuel:"
git status --short
