#!/bin/bash

# Script pour corriger automatiquement tous les imports sonner
# Usage: bash fix-sonner-imports.sh

echo "🔧 Correction des imports sonner en cours..."

# Fichiers dans /components/admin/ → ../../lib/toast
echo "📁 Correction de /components/admin/*.tsx..."
find components/admin -name "*.tsx" -type f -exec sed -i "s|from 'sonner'|from '../../lib/toast'|g" {} \;

# Fichiers dans /components/driver/ → ../../lib/toast
echo "📁 Correction de /components/driver/*.tsx..."
find components/driver -name "*.tsx" -type f -exec sed -i "s|from 'sonner'|from '../../lib/toast'|g" {} \;

# Fichiers dans /components/passenger/ → ../../lib/toast
echo "📁 Correction de /components/passenger/*.tsx..."
find components/passenger -name "*.tsx" -type f -exec sed -i "s|from 'sonner'|from '../../lib/toast'|g" {} \;

# Fichiers dans /components/shared/ → ../../lib/toast (si existe)
echo "📁 Correction de /components/shared/*.tsx..."
find components/shared -name "*.tsx" -type f -exec sed -i "s|from 'sonner'|from '../../lib/toast'|g" {} \; 2>/dev/null

# Fichiers dans /components/auth/ → ../../lib/toast (si existe)
echo "📁 Correction de /components/auth/*.tsx..."
find components/auth -name "*.tsx" -type f -exec sed -i "s|from 'sonner'|from '../../lib/toast'|g" {} \; 2>/dev/null

# Fichiers dans /components/ (racine) → ../lib/toast
echo "📁 Correction de /components/*.tsx (racine)..."
find components -maxdepth 1 -name "*.tsx" -type f -exec sed -i "s|from 'sonner'|from '../lib/toast'|g" {} \;

echo "✅ Correction terminée!"
echo ""
echo "🔍 Vérification des fichiers restants avec 'sonner'..."
grep -r "from 'sonner'" components/ || echo "✅ Aucun import 'sonner' trouvé dans /components/"

echo ""
echo "🎉 Script terminé! Vous pouvez maintenant commit et push."
