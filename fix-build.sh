#!/bin/bash

echo "🔧 Fix du problème de build Rollup..."

# Étape 1: Nettoyer le cache et les builds
echo "1️⃣ Nettoyage du cache..."
rm -rf dist
rm -rf node_modules/.vite
rm -rf .vite
rm -rf node_modules/.cache

# Étape 2: Nettoyer les node_modules (optionnel mais recommandé)
echo "2️⃣ Suppression de node_modules (peut prendre du temps)..."
rm -rf node_modules

# Étape 3: Réinstaller les dépendances
echo "3️⃣ Réinstallation des dépendances..."
npm install

echo ""
echo "✅ Fix terminé!"
echo ""
echo "Maintenant, lancez:"
echo "  npm run build"
echo ""
