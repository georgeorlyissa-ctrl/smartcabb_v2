#!/bin/bash

# 🔍 SCRIPT DE VÉRIFICATION BUILD FIX VERCEL
# Vérifie que tous les fichiers sont corrects avant le push

echo "🔍 VÉRIFICATION BUILD FIX SMARTCABB"
echo "===================================="
echo ""

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

errors=0

# 1. Vérifier que les fichiers problématiques n'existent PAS
echo "1️⃣  Vérification des fichiers à supprimer..."
if [ -f "lib/route-calculator.ts" ]; then
    echo -e "${RED}❌ lib/route-calculator.ts existe encore${NC}"
    errors=$((errors+1))
else
    echo -e "${GREEN}✅ lib/route-calculator.ts supprimé${NC}"
fi

if [ -f "components/InteractiveRouteMap.tsx" ]; then
    echo -e "${RED}❌ components/InteractiveRouteMap.tsx existe encore${NC}"
    errors=$((errors+1))
else
    echo -e "${GREEN}✅ components/InteractiveRouteMap.tsx supprimé${NC}"
fi

echo ""

# 2. Vérifier que les fichiers requis EXISTENT
echo "2️⃣  Vérification des fichiers requis..."
if [ ! -f "lib/icons.ts" ]; then
    echo -e "${RED}❌ lib/icons.ts manquant${NC}"
    errors=$((errors+1))
else
    echo -e "${GREEN}✅ lib/icons.ts existe${NC}"
fi

if [ ! -f "components/InteractiveMapView.tsx" ]; then
    echo -e "${RED}❌ components/InteractiveMapView.tsx manquant${NC}"
    errors=$((errors+1))
else
    echo -e "${GREEN}✅ components/InteractiveMapView.tsx existe${NC}"
fi

if [ ! -f "components/passenger/MapScreen.tsx" ]; then
    echo -e "${RED}❌ components/passenger/MapScreen.tsx manquant${NC}"
    errors=$((errors+1))
else
    echo -e "${GREEN}✅ components/passenger/MapScreen.tsx existe${NC}"
fi

echo ""

# 3. Vérifier le contenu de lib/icons.ts
echo "3️⃣  Vérification de lib/icons.ts..."
if [ -f "lib/icons.ts" ]; then
    if grep -q "export { Loader as Loader2 }" lib/icons.ts; then
        echo -e "${RED}❌ lib/icons.ts contient 'Loader as Loader2' (MAUVAIS)${NC}"
        echo -e "${YELLOW}   Doit être: export { Loader2 } from 'lucide-react';${NC}"
        errors=$((errors+1))
    elif grep -q "export { Loader2 }" lib/icons.ts; then
        echo -e "${GREEN}✅ lib/icons.ts export Loader2 correctement${NC}"
    else
        echo -e "${YELLOW}⚠️  lib/icons.ts ne contient pas d'export Loader2${NC}"
    fi
fi

echo ""

# 4. Rechercher les imports problématiques
echo "4️⃣  Recherche d'imports problématiques..."
if grep -r "InteractiveRouteMap" --include="*.tsx" --include="*.ts" components/ lib/ 2>/dev/null | grep -v "node_modules" | grep -v ".md"; then
    echo -e "${RED}❌ Des fichiers importent encore InteractiveRouteMap${NC}"
    errors=$((errors+1))
else
    echo -e "${GREEN}✅ Aucun import de InteractiveRouteMap trouvé${NC}"
fi

if grep -r "route-calculator" --include="*.tsx" --include="*.ts" components/ lib/ 2>/dev/null | grep -v "node_modules" | grep -v ".md"; then
    echo -e "${RED}❌ Des fichiers importent encore route-calculator${NC}"
    errors=$((errors+1))
else
    echo -e "${GREEN}✅ Aucun import de route-calculator trouvé${NC}"
fi

echo ""

# 5. Vérifier les caches locaux
echo "5️⃣  Vérification des caches..."
if [ -d "node_modules/.vite" ]; then
    echo -e "${YELLOW}⚠️  node_modules/.vite existe (devrait être supprimé)${NC}"
    echo -e "   Exécutez: rm -rf node_modules/.vite"
fi

if [ -d "dist" ]; then
    echo -e "${YELLOW}⚠️  dist/ existe (devrait être supprimé avant push)${NC}"
    echo -e "   Exécutez: rm -rf dist"
fi

if [ -d ".vercel" ]; then
    echo -e "${YELLOW}⚠️  .vercel/ existe (devrait être supprimé avant push)${NC}"
    echo -e "   Exécutez: rm -rf .vercel"
fi

echo ""

# 6. Statut Git
echo "6️⃣  Statut Git..."
if git status --short | grep -q "route-calculator\|InteractiveRouteMap"; then
    echo -e "${YELLOW}⚠️  Des fichiers problématiques sont dans Git${NC}"
    git status --short | grep "route-calculator\|InteractiveRouteMap"
fi

echo ""

# Résumé
echo "===================================="
if [ $errors -eq 0 ]; then
    echo -e "${GREEN}✅ TOUT EST OK ! Prêt à push vers GitHub${NC}"
    echo ""
    echo "Commandes à exécuter :"
    echo "  git add -A"
    echo "  git commit -m \"fix: correction build Vercel\""
    echo "  git push origin main"
    echo ""
    echo "Ensuite sur Vercel :"
    echo "  → Deployments → Redeploy"
    echo "  → ☑️ Cocher 'Clear Build Cache'"
else
    echo -e "${RED}❌ $errors erreur(s) trouvée(s)${NC}"
    echo -e "${YELLOW}⚠️  Corrigez les erreurs avant de push${NC}"
    exit 1
fi
