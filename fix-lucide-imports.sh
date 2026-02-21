#!/bin/bash

# 🔧 Script de correction automatique des imports lucide-react vers /lib/icons
# Utilisation : bash fix-lucide-imports.sh

echo "🚀 Début de la correction des imports lucide-react..."

# Fonction pour remplacer dans un fichier
replace_in_file() {
    local file=$1
    local old=$2
    local new=$3
    
    if [ -f "$file" ]; then
        sed -i "s|$old|$new|g" "$file"
        echo "✅ $file"
    fi
}

# 1. Corriger les fichiers dans /components/*.tsx (38 fichiers)
echo ""
echo "📁 Correction de /components/*.tsx..."
for file in components/*.tsx; do
    if [ -f "$file" ]; then
        sed -i "s|from 'lucide-react'|from '../lib/icons'|g" "$file"
        sed -i 's|from "lucide-react"|from "../lib/icons"|g' "$file"
        sed -i "s|from 'motion/react'|from '../lib/motion'|g" "$file"
        sed -i 's|from "motion/react"|from "../lib/motion"|g' "$file"
        echo "✅ $file"
    fi
done

# 2. Corriger les fichiers dans /components/ui/*.tsx (7 fichiers)
echo ""
echo "📁 Correction de /components/ui/*.tsx..."
for file in components/ui/*.tsx; do
    if [ -f "$file" ]; then
        sed -i "s|from 'lucide-react'|from '../../lib/icons'|g" "$file"
        sed -i 's|from "lucide-react"|from "../../lib/icons"|g' "$file"
        sed -i "s|from 'motion/react'|from '../../lib/motion'|g" "$file"
        sed -i 's|from "motion/react"|from "../../lib/motion"|g' "$file"
        echo "✅ $file"
    fi
done

# 3. Corriger les fichiers dans /components/admin/*.tsx
echo ""
echo "📁 Correction de /components/admin/*.tsx..."
for file in components/admin/*.tsx; do
    if [ -f "$file" ]; then
        sed -i "s|from 'lucide-react'|from '../../lib/icons'|g" "$file"
        sed -i 's|from "lucide-react"|from "../../lib/icons"|g' "$file"
        sed -i "s|from 'motion/react'|from '../../lib/motion'|g" "$file"
        sed -i 's|from "motion/react"|from "../../lib/motion"|g' "$file"
        echo "✅ $file"
    fi
done

# 4. Corriger les fichiers dans /components/driver/*.tsx
echo ""
echo "📁 Correction de /components/driver/*.tsx..."
for file in components/driver/*.tsx; do
    if [ -f "$file" ]; then
        sed -i "s|from 'lucide-react'|from '../../lib/icons'|g" "$file"
        sed -i 's|from "lucide-react"|from "../../lib/icons"|g' "$file"
        sed -i "s|from 'motion/react'|from '../../lib/motion'|g" "$file"
        sed -i 's|from "motion/react"|from "../../lib/motion"|g' "$file"
        echo "✅ $file"
    fi
done

# 5. Corriger les fichiers dans /components/passenger/*.tsx
echo ""
echo "📁 Correction de /components/passenger/*.tsx..."
for file in components/passenger/*.tsx; do
    if [ -f "$file" ]; then
        sed -i "s|from 'lucide-react'|from '../../lib/icons'|g" "$file"
        sed -i 's|from "lucide-react"|from "../../lib/icons"|g' "$file"
        sed -i "s|from 'motion/react'|from '../../lib/motion'|g" "$file"
        sed -i 's|from "motion/react"|from "../../lib/motion"|g' "$file"
        echo "✅ $file"
    fi
done

# 6. Corriger les fichiers dans /components/shared/*.tsx
echo ""
echo "📁 Correction de /components/shared/*.tsx..."
for file in components/shared/*.tsx; do
    if [ -f "$file" ]; then
        sed -i "s|from 'lucide-react'|from '../../lib/icons'|g" "$file"
        sed -i 's|from "lucide-react"|from "../../lib/icons"|g' "$file"
        sed -i "s|from 'motion/react'|from '../../lib/motion'|g" "$file"
        sed -i 's|from "motion/react"|from "../../lib/motion"|g' "$file"
        echo "✅ $file"
    fi
done

# 7. Corriger les fichiers dans /components/test/*.tsx
echo ""
echo "📁 Correction de /components/test/*.tsx..."
for file in components/test/*.tsx; do
    if [ -f "$file" ]; then
        sed -i "s|from 'lucide-react'|from '../../lib/icons'|g" "$file"
        sed -i 's|from "lucide-react"|from "../../lib/icons"|g' "$file"
        sed -i "s|from 'motion/react'|from '../../lib/motion'|g" "$file"
        sed -i 's|from "motion/react"|from "../../lib/motion"|g' "$file"
        echo "✅ $file"
    fi
done

echo ""
echo "✨ Correction terminée !"
echo ""
echo "📊 Résumé :"
echo "  - Tous les imports 'lucide-react' ont été remplacés"
echo "  - Tous les imports 'motion/react' ont été corrigés"
echo ""
echo "🚀 Prochaine étape : Commit et push vers GitHub"
echo "  git add ."
echo "  git commit -m 'fix: replace lucide-react imports with local /lib/icons'"
echo "  git push origin main"
