#!/bin/bash

# 🔍 SCRIPT DE VÉRIFICATION - CARTE INTERACTIVE

echo "🔍 VÉRIFICATION DE LA CARTE INTERACTIVE SMARTCABB"
echo "=================================================="
echo ""

# Compteur d'erreurs
ERRORS=0

# 1. Vérifier que InteractiveMapView.tsx existe
echo "1️⃣  Vérification de InteractiveMapView.tsx..."
if [ -f "components/InteractiveMapView.tsx" ]; then
    SIZE=$(wc -c < "components/InteractiveMapView.tsx")
    if [ "$SIZE" -gt 10000 ]; then
        echo "   ✅ InteractiveMapView.tsx existe ($SIZE bytes)"
    else
        echo "   ⚠️  InteractiveMapView.tsx existe mais est trop petit ($SIZE bytes)"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo "   ❌ InteractiveMapView.tsx MANQUANT !"
    ERRORS=$((ERRORS + 1))
fi

# 2. Vérifier que RouteMapPreview.tsx utilise InteractiveMapView
echo ""
echo "2️⃣  Vérification de RouteMapPreview.tsx..."
if [ -f "components/RouteMapPreview.tsx" ]; then
    if grep -q "import.*InteractiveMapView" "components/RouteMapPreview.tsx"; then
        echo "   ✅ RouteMapPreview utilise InteractiveMapView"
    else
        echo "   ❌ RouteMapPreview n'importe PAS InteractiveMapView"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo "   ❌ RouteMapPreview.tsx MANQUANT !"
    ERRORS=$((ERRORS + 1))
fi

# 3. Vérifier que MapScreen.tsx utilise InteractiveMapView
echo ""
echo "3️⃣  Vérification de MapScreen.tsx..."
if [ -f "components/passenger/MapScreen.tsx" ]; then
    if grep -q "import.*InteractiveMapView" "components/passenger/MapScreen.tsx"; then
        echo "   ✅ MapScreen utilise InteractiveMapView"
    else
        echo "   ❌ MapScreen n'importe PAS InteractiveMapView"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo "   ❌ MapScreen.tsx MANQUANT !"
    ERRORS=$((ERRORS + 1))
fi

# 4. Vérifier les imports d'icônes dans InteractiveMapView
echo ""
echo "4️⃣  Vérification des imports d'icônes..."
if [ -f "components/InteractiveMapView.tsx" ]; then
    if grep -q "Plus, Minus, Maximize2" "components/InteractiveMapView.tsx"; then
        echo "   ✅ Icônes de zoom importées correctement"
    else
        echo "   ⚠️  Icônes de zoom peut-être manquantes"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo "   ❌ Impossible de vérifier (fichier manquant)"
    ERRORS=$((ERRORS + 1))
fi

# 5. Vérifier que lib/icons.ts est correct
echo ""
echo "5️⃣  Vérification de lib/icons.ts..."
if [ -f "lib/icons.ts" ]; then
    if grep -q "export { Loader2 }" "lib/icons.ts"; then
        echo "   ✅ lib/icons.ts contient l'export correct de Loader2"
    else
        echo "   ⚠️  lib/icons.ts peut avoir un problème d'export Loader2"
        ERRORS=$((ERRORS + 1))
    fi
    
    if grep -q "export { Plus }" "lib/icons.ts" || grep -q "export \* from" "lib/icons.ts"; then
        echo "   ✅ lib/icons.ts exporte Plus, Minus, Maximize2"
    else
        echo "   ⚠️  lib/icons.ts peut manquer des exports d'icônes"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo "   ❌ lib/icons.ts MANQUANT !"
    ERRORS=$((ERRORS + 1))
fi

# 6. Vérifier que les fichiers problématiques ont bien été supprimés
echo ""
echo "6️⃣  Vérification de la suppression des anciens fichiers..."
PROBLEMATIC_FILES=0

if [ -f "lib/route-calculator.ts" ]; then
    echo "   ❌ lib/route-calculator.ts existe encore (DOIT ÊTRE SUPPRIMÉ)"
    PROBLEMATIC_FILES=$((PROBLEMATIC_FILES + 1))
fi

if [ -f "components/InteractiveRouteMap.tsx" ]; then
    echo "   ❌ components/InteractiveRouteMap.tsx existe encore (DOIT ÊTRE SUPPRIMÉ)"
    PROBLEMATIC_FILES=$((PROBLEMATIC_FILES + 1))
fi

if [ "$PROBLEMATIC_FILES" -eq 0 ]; then
    echo "   ✅ Aucun fichier problématique trouvé"
else
    echo "   ⚠️  $PROBLEMATIC_FILES fichier(s) problématique(s) trouvé(s)"
    ERRORS=$((ERRORS + PROBLEMATIC_FILES))
fi

# 7. Vérifier la documentation
echo ""
echo "7️⃣  Vérification de la documentation..."
DOC_ERRORS=0

if [ -f "CARTE_INTERACTIVE_GUIDE.md" ]; then
    echo "   ✅ CARTE_INTERACTIVE_GUIDE.md existe"
else
    echo "   ⚠️  CARTE_INTERACTIVE_GUIDE.md manquant"
    DOC_ERRORS=$((DOC_ERRORS + 1))
fi

if [ -f "CHANGELOG_CARTE.md" ]; then
    echo "   ✅ CHANGELOG_CARTE.md existe"
else
    echo "   ⚠️  CHANGELOG_CARTE.md manquant"
    DOC_ERRORS=$((DOC_ERRORS + 1))
fi

if [ "$DOC_ERRORS" -eq 0 ]; then
    echo "   ✅ Documentation complète"
else
    echo "   ⚠️  Documentation incomplète ($DOC_ERRORS fichier(s) manquant(s))"
fi

# 8. Vérifier les dépendances dans package.json
echo ""
echo "8️⃣  Vérification de package.json..."
if [ -f "package.json" ]; then
    if grep -q "leaflet" "package.json"; then
        echo "   ✅ Leaflet est dans package.json"
    else
        echo "   ⚠️  Leaflet peut être manquant dans package.json (import dynamique utilisé)"
    fi
else
    echo "   ⚠️  package.json non trouvé"
fi

# RÉSUMÉ
echo ""
echo "=================================================="
echo "RÉSUMÉ DE LA VÉRIFICATION"
echo "=================================================="
echo ""

if [ "$ERRORS" -eq 0 ]; then
    echo "✅ TOUT EST BON !"
    echo ""
    echo "La carte interactive est correctement installée."
    echo "Vous pouvez maintenant :"
    echo ""
    echo "1. Commiter les changements :"
    echo "   git add -A"
    echo "   git commit -m 'feat: carte interactive complète avec Leaflet + zoom + trafic'"
    echo "   git push origin main"
    echo ""
    echo "2. Déployer sur Vercel :"
    echo "   - Aller sur vercel.com"
    echo "   - Redeploy avec 'Clear Build Cache'"
    echo ""
    echo "3. Consulter la documentation :"
    echo "   - CARTE_INTERACTIVE_GUIDE.md"
    echo "   - CHANGELOG_CARTE.md"
    echo ""
    exit 0
else
    echo "⚠️  $ERRORS PROBLÈME(S) DÉTECTÉ(S)"
    echo ""
    echo "Veuillez corriger les erreurs ci-dessus avant de déployer."
    echo ""
    echo "Pour obtenir de l'aide :"
    echo "- Consultez CARTE_INTERACTIVE_GUIDE.md"
    echo "- Vérifiez la console du navigateur"
    echo ""
    exit 1
fi
