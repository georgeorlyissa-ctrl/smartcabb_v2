#!/bin/bash

# Script de vérification avant déploiement - Version 2224
# Ce script vérifie que tout est prêt pour le déploiement

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 VÉRIFICATION PRÉ-DÉPLOIEMENT - VERSION 2224"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Compteurs
ERRORS=0
WARNINGS=0
SUCCESS=0

# Fonction pour afficher les résultats
check_result() {
  if [ $1 -eq 0 ]; then
    echo "✅ $2"
    SUCCESS=$((SUCCESS + 1))
  else
    echo "❌ $2"
    ERRORS=$((ERRORS + 1))
  fi
}

warn() {
  echo "⚠️  $1"
  WARNINGS=$((WARNINGS + 1))
}

info() {
  echo "ℹ️  $1"
}

# ═══════════════════════════════════════════════════════════
# 1. VÉRIFIER LES FICHIERS CRITIQUES
# ═══════════════════════════════════════════════════════════

echo "📂 1. Vérification des fichiers critiques..."
echo ""

[ -f "App.tsx" ] && check_result 0 "App.tsx existe" || check_result 1 "App.tsx manquant"
[ -f "package.json" ] && check_result 0 "package.json existe" || check_result 1 "package.json manquant"
[ -f "vite.config.ts" ] && check_result 0 "vite.config.ts existe" || check_result 1 "vite.config.ts manquant"
[ -f "BUILD_VERSION.ts" ] && check_result 0 "BUILD_VERSION.ts existe" || check_result 1 "BUILD_VERSION.ts manquant"
[ -f "index.html" ] && check_result 0 "index.html existe" || check_result 1 "index.html manquant"

echo ""

# ═══════════════════════════════════════════════════════════
# 2. VÉRIFIER LES IMPORTS PROBLÉMATIQUES
# ═══════════════════════════════════════════════════════════

echo "🔍 2. Vérification des imports problématiques..."
echo ""

# Vérifier les imports @/
AT_IMPORTS=$(grep -r "from '@/" --include="*.tsx" --include="*.ts" components/ lib/ hooks/ 2>/dev/null | wc -l)
if [ "$AT_IMPORTS" -eq 0 ]; then
  check_result 0 "Pas d'imports '@/' trouvés"
else
  warn "Imports '@/' trouvés: $AT_IMPORTS (peuvent causer des problèmes)"
fi

# Vérifier les imports sonner@version
SONNER_VERSION=$(grep -r "from 'sonner@" --include="*.tsx" --include="*.ts" components/ lib/ hooks/ 2>/dev/null | wc -l)
if [ "$SONNER_VERSION" -eq 0 ]; then
  check_result 0 "Pas d'imports 'sonner@version' (correct)"
else
  warn "Imports 'sonner@version' trouvés: $SONNER_VERSION (peuvent causer des problèmes)"
fi

# Vérifier les imports motion/react (acceptables avec alias)
MOTION_IMPORTS=$(grep -r "from 'motion/react'" --include="*.tsx" --include="*.ts" components/ 2>/dev/null | wc -l)
if [ "$MOTION_IMPORTS" -gt 0 ]; then
  info "Imports 'motion/react' trouvés: $MOTION_IMPORTS (OK avec alias dans vite.config.ts)"
fi

echo ""

# ═══════════════════════════════════════════════════════════
# 3. VÉRIFIER LA CONFIGURATION VITE
# ═══════════════════════════════════════════════════════════

echo "⚙️  3. Vérification de la configuration Vite..."
echo ""

if grep -q "motion/react.*framer-motion" vite.config.ts; then
  check_result 0 "Alias motion/react → framer-motion configuré"
else
  check_result 1 "Alias motion/react manquant dans vite.config.ts"
fi

if grep -q "exclude.*supabase" vite.config.ts; then
  check_result 0 "Exclusion des fichiers backend configurée"
else
  warn "Exclusion des fichiers backend non configurée"
fi

echo ""

# ═══════════════════════════════════════════════════════════
# 4. VÉRIFIER LES DÉPENDANCES
# ═══════════════════════════════════════════════════════════

echo "📦 4. Vérification des dépendances..."
echo ""

if grep -q '"react"' package.json; then
  check_result 0 "React dans package.json"
else
  check_result 1 "React manquant dans package.json"
fi

if grep -q '"framer-motion"' package.json; then
  check_result 0 "Framer Motion dans package.json"
else
  check_result 1 "Framer Motion manquant dans package.json"
fi

if grep -q '"sonner"' package.json; then
  check_result 0 "Sonner dans package.json"
else
  check_result 1 "Sonner manquant dans package.json"
fi

if grep -q '"lucide-react"' package.json; then
  check_result 0 "Lucide React dans package.json"
else
  check_result 1 "Lucide React manquant dans package.json"
fi

echo ""

# ═══════════════════════════════════════════════════════════
# 5. VÉRIFIER LES COMPOSANTS CRITIQUES
# ═══════════════════════════════════════════════════════════

echo "🧩 5. Vérification des composants critiques..."
echo ""

[ -f "components/LoadingScreen.tsx" ] && check_result 0 "LoadingScreen.tsx" || check_result 1 "LoadingScreen.tsx manquant"
[ -f "components/PWAInstallPrompt.tsx" ] && check_result 0 "PWAInstallPrompt.tsx" || check_result 1 "PWAInstallPrompt.tsx manquant"
[ -f "components/ErrorBoundary.tsx" ] && check_result 0 "ErrorBoundary.tsx" || warn "ErrorBoundary.tsx manquant"
[ -f "components/passenger/MapScreen.tsx" ] && check_result 0 "MapScreen.tsx" || warn "MapScreen.tsx manquant"

echo ""

# ═══════════════════════════════════════════════════════════
# 6. VÉRIFIER LES ROUTES BACKEND
# ═══════════════════════════════════════════════════════════

echo "🛣️  6. Vérification des routes backend..."
echo ""

[ -f "supabase/functions/server/index.tsx" ] && check_result 0 "index.tsx (serveur principal)" || check_result 1 "index.tsx manquant"
[ -f "supabase/functions/server/driver-routes.tsx" ] && check_result 0 "driver-routes.tsx" || warn "driver-routes.tsx manquant"
[ -f "supabase/functions/server/passenger-routes.tsx" ] && check_result 0 "passenger-routes.tsx" || warn "passenger-routes.tsx manquant"
[ -f "supabase/functions/server/ride-routes.tsx" ] && check_result 0 "ride-routes.tsx" || warn "ride-routes.tsx manquant"

echo ""

# ═══════════════════════════════════════════════════════════
# RÉSUMÉ FINAL
# ═══════════════════════════════════════════════════════════

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 RÉSUMÉ DE LA VÉRIFICATION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ Succès     : $SUCCESS"
echo "⚠️  Avertissements : $WARNINGS"
echo "❌ Erreurs    : $ERRORS"
echo ""

if [ $ERRORS -eq 0 ]; then
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "🎉 TOUT EST PRÊT POUR LE DÉPLOIEMENT !"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "📋 Prochaines étapes :"
  echo ""
  echo "1. Commit sur GitHub :"
  echo "   git add -A"
  echo "   git commit -m '🚀 Version 2224 - Déploiement stable'"
  echo "   git push origin main"
  echo ""
  echo "2. Vérifier le déploiement Vercel :"
  echo "   → https://vercel.com/dashboard"
  echo ""
  echo "3. Tester l'application :"
  echo "   → https://smartcabb.com"
  echo ""
  exit 0
else
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "⚠️  ATTENTION : $ERRORS ERREUR(S) DÉTECTÉE(S)"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "⚠️  Veuillez corriger les erreurs avant de déployer."
  echo ""
  echo "📖 Consultez le guide de déploiement :"
  echo "   → GUIDE_DEPLOIEMENT_VERSION_2224.md"
  echo ""
  exit 1
fi
