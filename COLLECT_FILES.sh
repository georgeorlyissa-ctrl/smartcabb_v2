#!/bin/bash

# 📦 Script de collecte des fichiers pour déploiement Vercel
# SmartCabb v512.0

echo "🚀 SmartCabb - Collecte des fichiers pour GitHub/Vercel"
echo "========================================================="
echo ""

# Créer un dossier de destination
DEST_DIR="smartcabb-deploy-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$DEST_DIR"

echo "📁 Destination: $DEST_DIR"
echo ""

# Fonction pour copier un fichier
copy_file() {
    local file="$1"
    if [ -f "$file" ]; then
        local dir=$(dirname "$file")
        mkdir -p "$DEST_DIR/$dir"
        cp "$file" "$DEST_DIR/$file"
        echo "✅ $file"
    else
        echo "⚠️  Manquant: $file"
    fi
}

# Fonction pour copier un dossier entier
copy_dir() {
    local dir="$1"
    if [ -d "$dir" ]; then
        mkdir -p "$DEST_DIR/$(dirname "$dir")"
        cp -r "$dir" "$DEST_DIR/$dir"
        echo "✅ $dir/ (dossier complet)"
    else
        echo "⚠️  Manquant: $dir/"
    fi
}

echo "📋 FICHIERS CRITIQUES"
echo "---------------------"
copy_file "package.json"
copy_file "tsconfig.json"
copy_file "tsconfig.node.json"
copy_file "vercel.json"
copy_file "index.html"
copy_file "main.tsx"
copy_file "App.tsx"
copy_file "BUILD_VERSION.ts"
copy_file "deps.ts"
copy_file "global.d.ts"
copy_file ".gitignore"
copy_file "postcss.config.mjs"
echo ""

echo "🎨 STYLES"
echo "---------"
copy_dir "styles"
echo ""

echo "🧩 COMPOSANTS"
echo "-------------"
copy_dir "components"
echo ""

echo "🔧 HOOKS"
echo "--------"
copy_dir "hooks"
echo ""

echo "📚 LIBRARY"
echo "----------"
copy_dir "lib"
echo ""

echo "📄 PAGES"
echo "--------"
copy_dir "pages"
echo ""

echo "🔐 TYPES"
echo "--------"
copy_dir "types"
echo ""

echo "🛠️  UTILS"
echo "---------"
copy_dir "utils"
echo ""

echo "🌐 PUBLIC"
echo "---------"
copy_dir "public"
echo ""

echo "⚙️  BACKEND SUPABASE"
echo "--------------------"
copy_dir "supabase"
echo ""

echo "📖 DOCUMENTATION (optionnel)"
echo "----------------------------"
copy_file "README.md"
copy_file "README_v512.md"
echo ""

echo "========================================================="
echo "✅ COLLECTE TERMINÉE !"
echo ""
echo "📁 Dossier créé: $DEST_DIR"
echo ""
echo "🎯 PROCHAINES ÉTAPES :"
echo ""
echo "1. Vérifier le contenu :"
echo "   cd $DEST_DIR"
echo "   ls -la"
echo ""
echo "2. Initialiser Git :"
echo "   cd $DEST_DIR"
echo "   git init"
echo "   git add ."
echo "   git commit -m 'SmartCabb v512.0 - Initial commit'"
echo ""
echo "3. Pusher vers GitHub :"
echo "   git remote add origin https://github.com/VOTRE_USERNAME/smartcabb-app.git"
echo "   git branch -M main"
echo "   git push -u origin main"
echo ""
echo "4. Déployer sur Vercel :"
echo "   - Aller sur vercel.com"
echo "   - Import Git Repository"
echo "   - Ajouter les variables d'environnement"
echo "   - Deploy !"
echo ""
echo "🚀 Bon déploiement !"
echo "========================================================="
