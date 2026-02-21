#!/bin/bash

# 🚨 FIX D'URGENCE - ERREUR PERSISTANTE BUILD VERCEL

echo "🚨 FIX D'URGENCE - BUILD VERCEL"
echo "================================"
echo ""

# ÉTAPE 1 : Diagnostic rapide
echo "📋 ÉTAPE 1 : Diagnostic rapide..."
echo ""

if [ ! -f "components/InteractiveMapView.tsx" ]; then
    echo "❌ PROBLÈME TROUVÉ : components/InteractiveMapView.tsx manquant !"
    echo ""
    echo "Ce fichier est requis par MapScreen.tsx mais n'existe pas dans votre repo."
    echo ""
    echo "SOLUTION : Le fichier doit être restauré ou le repo doit être synchronisé."
    echo ""
    exit 1
fi

# ÉTAPE 2 : Vérifier lib/icons.ts
echo "📋 ÉTAPE 2 : Vérification de lib/icons.ts..."
echo ""

if grep -q "export { Loader as Loader2 }" lib/icons.ts; then
    echo "⚠️  Correction de lib/icons.ts..."
    sed -i.bak 's/export { Loader as Loader2 }/export { Loader2 }/' lib/icons.ts
    echo "✅ lib/icons.ts corrigé"
else
    echo "✅ lib/icons.ts déjà correct"
fi

# ÉTAPE 3 : Supprimer fichiers problématiques
echo ""
echo "📋 ÉTAPE 3 : Suppression fichiers problématiques..."
echo ""

rm -f lib/route-calculator.ts
rm -f components/InteractiveRouteMap.tsx
git rm -f lib/route-calculator.ts 2>/dev/null
git rm -f components/InteractiveRouteMap.tsx 2>/dev/null

echo "✅ Fichiers problématiques supprimés"

# ÉTAPE 4 : Nettoyer TOUS les caches
echo ""
echo "📋 ÉTAPE 4 : Nettoyage des caches..."
echo ""

rm -rf node_modules/.vite
rm -rf node_modules/.cache
rm -rf .vite
rm -rf dist
rm -rf .vercel
rm -rf .next
rm -rf out
rm -rf build

echo "✅ Tous les caches nettoyés"

# ÉTAPE 5 : Vérifier les imports problématiques
echo ""
echo "📋 ÉTAPE 5 : Recherche d'imports problématiques..."
echo ""

if grep -r "InteractiveRouteMap" --include="*.tsx" --include="*.ts" components/ lib/ 2>/dev/null | grep -v "node_modules"; then
    echo "❌ ATTENTION : Des fichiers importent encore InteractiveRouteMap !"
    echo ""
    echo "Fichiers à corriger :"
    grep -r "InteractiveRouteMap" --include="*.tsx" --include="*.ts" components/ lib/ 2>/dev/null | grep -v "node_modules"
    echo ""
    echo "⚠️  VOUS DEVEZ SUPPRIMER CES IMPORTS MANUELLEMENT"
    exit 1
else
    echo "✅ Aucun import de InteractiveRouteMap trouvé"
fi

# ÉTAPE 6 : Commit et push
echo ""
echo "📋 ÉTAPE 6 : Préparation du commit..."
echo ""

git add -A

echo "Fichiers modifiés :"
git status --short

echo ""
read -p "Continuer avec le commit et push ? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    git commit -m "fix: urgence build Vercel - nettoyage complet caches + suppression OSRM"
    git push origin main
    
    echo ""
    echo "✅ PUSH TERMINÉ !"
    echo ""
    echo "========================================"
    echo "🌐 PROCHAINE ÉTAPE : VERCEL"
    echo "========================================"
    echo ""
    echo "1. Aller sur : https://vercel.com"
    echo "2. Deployments → Redeploy"
    echo "3. ☑️ COCHER 'Clear Build Cache'"
    echo "4. Deploy"
    echo ""
    echo "SI L'ERREUR PERSISTE ENCORE :"
    echo "- Essayer de supprimer le projet Vercel"
    echo "- Recréer le projet depuis GitHub"
    echo ""
else
    echo "❌ Commit annulé"
fi
