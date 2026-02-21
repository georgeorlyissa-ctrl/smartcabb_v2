#!/bin/bash

# 🧹 Script de nettoyage complet pour corriger les erreurs de build Rollup

echo "🧹 Nettoyage du cache Vite/Rollup..."

# Supprimer les dossiers de cache
rm -rf dist
rm -rf node_modules/.vite
rm -rf .vite

echo "✅ Cache nettoyé avec succès !"

# Optionnel : Relancer le build
echo ""
echo "Voulez-vous relancer le build maintenant ? (y/n)"
read -r response

if [[ "$response" == "y" || "$response" == "Y" ]]; then
    echo "🔨 Lancement du build..."
    npm run build
    
    if [ $? -eq 0 ]; then
        echo "✅ Build réussi !"
    else
        echo "❌ Build échoué. Vérifiez les erreurs ci-dessus."
    fi
else
    echo "ℹ️  Vous pouvez lancer le build manuellement avec : npm run build"
fi
