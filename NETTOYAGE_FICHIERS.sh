#!/bin/bash

# 🧹 Script de Nettoyage - Fichiers de Documentation Incorrects
# Auteur : Assistant IA Figma Make
# Date : 5 février 2026

echo "🧹 Nettoyage des fichiers de documentation incorrects..."
echo ""

# Fichiers basés sur le diagnostic incorrect (backend non déployé)
FILES_TO_REMOVE=(
  "deploy-backend.sh"
  "deploy-backend.ps1"
  "GUIDE_DEPLOIEMENT_BACKEND_SUPABASE.md"
  "DIAGNOSTIC_BACKEND.md"
  "README_BACKEND_DEPLOIEMENT.md"
  "SOLUTION_RAPIDE.md"
  "LIRE_DABORD.txt"
)

# Compteur
REMOVED=0
KEPT=0

echo "Fichiers à supprimer (basés sur un diagnostic incorrect) :"
echo ""

for file in "${FILES_TO_REMOVE[@]}"; do
  if [ -f "$file" ]; then
    echo "  ❌ $file"
    rm -f "$file"
    ((REMOVED++))
  else
    echo "  ⏭️  $file (déjà supprimé)"
  fi
done

echo ""
echo "Fichiers conservés (toujours utiles) :"
echo ""

KEEP_FILES=(
  ".env.supabase.example"
  ".gitignore"
  "check-backend-status.sh"
  "check-backend-status.ps1"
  "ARCHITECTURE_DEPLOIEMENT.md"
  "VRAIE_CAUSE_DU_PROBLEME.md"
  "FIX_APPLIQUE.md"
)

for file in "${KEEP_FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "  ✅ $file"
    ((KEPT++))
  else
    echo "  ⚠️  $file (manquant)"
  fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Résumé :"
echo "  Supprimés : $REMOVED fichiers"
echo "  Conservés : $KEPT fichiers"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ Nettoyage terminé !"
echo ""
echo "📖 Fichiers principaux à consulter :"
echo "  1. FIX_APPLIQUE.md - Résumé de la correction"
echo "  2. VRAIE_CAUSE_DU_PROBLEME.md - Analyse détaillée"
echo "  3. ARCHITECTURE_DEPLOIEMENT.md - Documentation de l'architecture"
echo ""
