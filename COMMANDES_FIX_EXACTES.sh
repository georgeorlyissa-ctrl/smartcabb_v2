#!/bin/bash

# 🔥 COMMANDES EXACTES POUR FIX BUILD VERCEL
# Copier-coller chaque bloc dans votre terminal

echo "🚀 FIX BUILD VERCEL - SMARTCABB"
echo "==============================="
echo ""

# ========================================
# BLOC 1 : VÉRIFICATION INITIALE
# ========================================
echo "📋 BLOC 1 : Vérification des fichiers"
echo "--------------------------------------"

ls -la lib/route-calculator.ts 2>/dev/null && echo "❌ route-calculator.ts EXISTE ENCORE" || echo "✅ route-calculator.ts supprimé"
ls -la components/InteractiveRouteMap.tsx 2>/dev/null && echo "❌ InteractiveRouteMap.tsx EXISTE ENCORE" || echo "✅ InteractiveRouteMap.tsx supprimé"
ls -la lib/icons.ts && echo "✅ icons.ts existe" || echo "❌ icons.ts MANQUANT"
ls -la components/InteractiveMapView.tsx && echo "✅ InteractiveMapView.tsx existe" || echo "❌ InteractiveMapView.tsx MANQUANT"

echo ""
echo "Appuyez sur ENTER pour continuer..."
read

# ========================================
# BLOC 2 : SUPPRESSION FICHIERS PROBLÉMATIQUES
# ========================================
echo ""
echo "🗑️  BLOC 2 : Suppression fichiers problématiques"
echo "------------------------------------------------"

# Supprimer avec git rm (si suivis par Git)
git rm -f lib/route-calculator.ts 2>/dev/null && echo "✅ route-calculator.ts supprimé de Git" || echo "⚠️  route-calculator.ts déjà absent de Git"
git rm -f components/InteractiveRouteMap.tsx 2>/dev/null && echo "✅ InteractiveRouteMap.tsx supprimé de Git" || echo "⚠️  InteractiveRouteMap.tsx déjà absent de Git"

# Supprimer physiquement (si pas suivis par Git)
rm -f lib/route-calculator.ts
rm -f components/InteractiveRouteMap.tsx

echo "✅ Fichiers problématiques supprimés"

echo ""
echo "Appuyez sur ENTER pour continuer..."
read

# ========================================
# BLOC 3 : CORRECTION lib/icons.ts
# ========================================
echo ""
echo "✏️  BLOC 3 : Correction de lib/icons.ts"
echo "--------------------------------------"

if grep -q "export { Loader as Loader2 }" lib/icons.ts; then
    echo "⚠️  Correction nécessaire dans lib/icons.ts"
    echo "AVANT : export { Loader as Loader2 } from 'lucide-react';"
    echo "APRÈS : export { Loader2 } from 'lucide-react';"
    echo ""
    echo "Correction automatique..."
    
    # Backup
    cp lib/icons.ts lib/icons.ts.backup
    
    # Correction avec sed
    sed -i.bak "s/export { Loader as Loader2 }/export { Loader2 }/g" lib/icons.ts
    
    echo "✅ Correction appliquée (backup créé : lib/icons.ts.backup)"
else
    echo "✅ lib/icons.ts est déjà correct"
fi

echo ""
echo "Appuyez sur ENTER pour continuer..."
read

# ========================================
# BLOC 4 : NETTOYAGE DES CACHES
# ========================================
echo ""
echo "🧹 BLOC 4 : Nettoyage des caches"
echo "--------------------------------"

rm -rf node_modules/.vite && echo "✅ node_modules/.vite supprimé" || echo "⚠️  node_modules/.vite n'existe pas"
rm -rf dist && echo "✅ dist/ supprimé" || echo "⚠️  dist/ n'existe pas"
rm -rf .vercel && echo "✅ .vercel/ supprimé" || echo "⚠️  .vercel/ n'existe pas"
rm -rf .next && echo "✅ .next/ supprimé" || echo "⚠️  .next/ n'existe pas"

# Suppression des fichiers backup si créés
rm -f lib/icons.ts.backup 2>/dev/null
rm -f lib/icons.ts.bak 2>/dev/null

echo "✅ Caches nettoyés"

echo ""
echo "Appuyez sur ENTER pour continuer..."
read

# ========================================
# BLOC 5 : VÉRIFICATION FINALE
# ========================================
echo ""
echo "🔍 BLOC 5 : Vérification finale"
echo "-------------------------------"

echo "Recherche d'imports problématiques..."
if grep -r "InteractiveRouteMap" --include="*.tsx" --include="*.ts" components/ lib/ 2>/dev/null | grep -v "node_modules" | grep -v ".md" | grep -v ".sh"; then
    echo "❌ ATTENTION : Des fichiers importent encore InteractiveRouteMap"
    echo "Fichiers concernés :"
    grep -r "InteractiveRouteMap" --include="*.tsx" --include="*.ts" components/ lib/ 2>/dev/null | grep -v "node_modules" | grep -v ".md" | grep -v ".sh"
else
    echo "✅ Aucun import de InteractiveRouteMap"
fi

if grep -r "route-calculator" --include="*.tsx" --include="*.ts" components/ lib/ 2>/dev/null | grep -v "node_modules" | grep -v ".md" | grep -v ".sh"; then
    echo "❌ ATTENTION : Des fichiers importent encore route-calculator"
    echo "Fichiers concernés :"
    grep -r "route-calculator" --include="*.tsx" --include="*.ts" components/ lib/ 2>/dev/null | grep -v "node_modules" | grep -v ".md" | grep -v ".sh"
else
    echo "✅ Aucun import de route-calculator"
fi

echo ""
echo "Appuyez sur ENTER pour continuer..."
read

# ========================================
# BLOC 6 : GIT STATUS ET COMMIT
# ========================================
echo ""
echo "📦 BLOC 6 : Git status et préparation commit"
echo "--------------------------------------------"

echo "Statut Git actuel :"
git status --short

echo ""
echo "Fichiers qui seront commitées :"
git add -A
git status --short

echo ""
echo "Voulez-vous commit et push ? (y/n)"
read -r response

if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    echo ""
    echo "📝 Commit..."
    git commit -m "fix: correction build Vercel - suppression OSRM + fix icons.ts Loader2"
    
    echo ""
    echo "🚀 Push vers GitHub..."
    git push origin main
    
    echo ""
    echo "✅ PUSH TERMINÉ !"
    echo ""
    echo "=========================================="
    echo "🌐 PROCHAINE ÉTAPE : VERCEL REDEPLOY"
    echo "=========================================="
    echo ""
    echo "1. Aller sur : https://vercel.com/votre-username/smartcabb"
    echo "2. Onglet : Deployments"
    echo "3. Dernier deployment → ... (3 points) → Redeploy"
    echo "4. ☑️ COCHER ABSOLUMENT : 'Clear Build Cache'"
    echo "5. Cliquer : Redeploy"
    echo ""
    echo "=========================================="
else
    echo ""
    echo "⚠️  Commit annulé. Vos changements sont prêts mais pas encore pushés."
    echo "Pour commit manuellement :"
    echo "  git commit -m \"fix: build Vercel\""
    echo "  git push origin main"
fi

echo ""
echo "🎉 SCRIPT TERMINÉ !"
