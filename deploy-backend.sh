#!/bin/bash

# 🚀 Script de déploiement du backend SmartCabb
# Ce script déploie la fonction Edge sur Supabase

echo "🚀 Déploiement du backend SmartCabb..."
echo ""

# Vérifier si Supabase CLI est installé
if ! command -v supabase &> /dev/null
then
    echo "❌ Supabase CLI n'est pas installé"
    echo ""
    echo "📦 Installation avec npm :"
    echo "   npm install -g supabase"
    echo ""
    echo "📦 Ou avec Homebrew (Mac) :"
    echo "   brew install supabase/tap/supabase"

# 🚀 Script de Déploiement Backend SmartCabb sur Supabase
# Auteur : Assistant IA Figma Make
# Date : 5 février 2026

set -e  # Arrêter le script en cas d'erreur

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 Déploiement Backend SmartCabb sur Supabase"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Couleurs pour les messages
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Variables
PROJECT_REF="zaerjqchzqmcxqblkfkg"
FUNCTION_NAME="make-server-2eb02e52"
OLD_DIR="supabase/functions/server"
NEW_DIR="supabase/functions/${FUNCTION_NAME}"

# ============================================
# ÉTAPE 1 : Vérifier la présence de Supabase CLI
# ============================================
echo -e "${BLUE}[1/6]${NC} Vérification de Supabase CLI..."

if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI n'est pas installé${NC}"
    echo ""
    echo "Installation requise :"
    echo ""
    echo "macOS :"
    echo "  brew install supabase/tap/supabase"
    echo ""
    echo "Windows (Scoop) :"
    echo "  scoop bucket add supabase https://github.com/supabase/scoop-bucket.git"
    echo "  scoop install supabase"
    echo ""
    echo "NPM (toutes plateformes) :"
    echo "  npm install -g supabase"

    echo ""
    exit 1
fi

# Vérifier si l'utilisateur est connecté
echo "🔑 Vérification de la connexion Supabase..."
if ! supabase functions list &> /dev/null; then
    echo "❌ Vous n'êtes pas connecté à Supabase"
    echo "🔐 Connexion..."
    supabase login
fi

# Déployer la fonction
echo ""
echo "📤 Déploiement de la fonction make-server-2eb02e52..."
echo ""

supabase functions deploy make-server-2eb02e52

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ BACKEND DÉPLOYÉ AVEC SUCCÈS !"
    echo ""
    echo "🎉 Vous pouvez maintenant :"
    echo "   1. Recharger votre application (Ctrl+R)"
    echo "   2. Essayer de vous inscrire côté conducteur"
    echo ""
else
    echo ""
    echo "❌ ÉCHEC DU DÉPLOIEMENT"
    echo ""
    echo "🔧 Vérifiez :"
    echo "   1. Que vous êtes connecté : supabase login"
    echo "   2. Que votre projet est lié : supabase link"
    echo "   3. Les logs d'erreur ci-dessus"
    echo ""
    exit 1
fi
echo -e "${GREEN}✅ Supabase CLI trouvé : $(supabase --version)${NC}"
echo ""

# ============================================
# ÉTAPE 2 : Restructurer le dossier backend
# ============================================
echo -e "${BLUE}[2/6]${NC} Restructuration du dossier backend..."

if [ -d "$OLD_DIR" ]; then
    if [ -d "$NEW_DIR" ]; then
        echo -e "${YELLOW}⚠️  Le dossier ${NEW_DIR} existe déjà${NC}"
        echo -e "${YELLOW}   Suppression de l'ancien dossier 'server'...${NC}"
        rm -rf "$OLD_DIR"
        echo -e "${GREEN}✅ Ancien dossier supprimé${NC}"
    else
        echo -e "${YELLOW}📁 Renommage : ${OLD_DIR} → ${NEW_DIR}${NC}"
        mv "$OLD_DIR" "$NEW_DIR"
        echo -e "${GREEN}✅ Dossier renommé avec succès${NC}"
    fi
elif [ -d "$NEW_DIR" ]; then
    echo -e "${GREEN}✅ Structure correcte déjà en place${NC}"
else
    echo -e "${RED}❌ Aucun dossier backend trouvé !${NC}"
    echo -e "${RED}   Attendu : ${OLD_DIR} ou ${NEW_DIR}${NC}"
    exit 1
fi

echo ""

# ============================================
# ÉTAPE 3 : Authentification Supabase
# ============================================
echo -e "${BLUE}[3/6]${NC} Authentification Supabase..."

# Vérifier si déjà authentifié
if supabase projects list &> /dev/null; then
    echo -e "${GREEN}✅ Déjà authentifié${NC}"
else
    echo -e "${YELLOW}⚠️  Non authentifié. Ouverture du navigateur...${NC}"
    supabase login
    echo -e "${GREEN}✅ Authentification réussie${NC}"
fi

echo ""

# ============================================
# ÉTAPE 4 : Liaison du projet
# ============================================
echo -e "${BLUE}[4/6]${NC} Liaison au projet Supabase..."

# Vérifier si le projet est déjà lié
if [ -f ".supabase/config.toml" ]; then
    echo -e "${GREEN}✅ Projet déjà lié${NC}"
else
    echo -e "${YELLOW}🔗 Liaison au projet ${PROJECT_REF}...${NC}"
    supabase link --project-ref "${PROJECT_REF}"
    echo -e "${GREEN}✅ Projet lié avec succès${NC}"
fi

echo ""

# ============================================
# ÉTAPE 5 : Configuration des secrets
# ============================================
echo -e "${BLUE}[5/6]${NC} Configuration des secrets..."

if [ -f ".env.supabase" ]; then
    echo -e "${YELLOW}📋 Fichier .env.supabase détecté${NC}"
    echo -e "${YELLOW}   Application des secrets...${NC}"
    
    # Lire et appliquer chaque secret
    while IFS='=' read -r key value; do
        # Ignorer les lignes vides et les commentaires
        if [[ -n "$key" && ! "$key" =~ ^# ]]; then
            # Supprimer les espaces
            key=$(echo "$key" | xargs)
            value=$(echo "$value" | xargs)
            
            if [[ -n "$value" ]]; then
                echo -e "   Setting ${key}..."
                echo "${value}" | supabase secrets set "${key}" --env-file /dev/stdin 2>/dev/null || true
            fi
        fi
    done < .env.supabase
    
    echo -e "${GREEN}✅ Secrets configurés depuis .env.supabase${NC}"
else
    echo -e "${YELLOW}⚠️  Fichier .env.supabase non trouvé${NC}"
    echo -e "${YELLOW}   Les secrets doivent être configurés manuellement :${NC}"
    echo ""
    echo "   supabase secrets set AFRICAS_TALKING_USERNAME=..."
    echo "   supabase secrets set AFRICAS_TALKING_API_KEY=..."
    echo "   supabase secrets set FLUTTERWAVE_SECRET_KEY=..."
    echo "   supabase secrets set SENDGRID_API_KEY=..."
    echo "   supabase secrets set GOOGLE_MAPS_SERVER_API_KEY=..."
    echo "   supabase secrets set MAPBOX_API_KEY=..."
    echo "   supabase secrets set FIREBASE_PROJECT_ID=..."
    echo "   supabase secrets set FIREBASE_SERVER_KEY=..."
    echo ""
    echo -e "${YELLOW}   Ou créez un fichier .env.supabase avec vos secrets${NC}"
fi

echo ""

# ============================================
# ÉTAPE 6 : Déploiement de la fonction
# ============================================
echo -e "${BLUE}[6/6]${NC} Déploiement de la fonction Edge..."

echo -e "${YELLOW}🚀 Déploiement en cours...${NC}"
supabase functions deploy "${FUNCTION_NAME}"

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Déploiement réussi !${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# ============================================
# VÉRIFICATION
# ============================================
echo -e "${BLUE}🔍 Vérification du déploiement...${NC}"
echo ""

HEALTH_URL="https://${PROJECT_REF}.supabase.co/functions/v1/${FUNCTION_NAME}/health"

echo -e "   URL : ${HEALTH_URL}"
echo -e "   Test en cours..."
echo ""

# Tester le endpoint health check
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${HEALTH_URL}")

if [ "$HTTP_STATUS" -eq 200 ]; then
    echo -e "${GREEN}✅ Backend opérationnel !${NC}"
    echo -e "${GREEN}   Status HTTP : ${HTTP_STATUS}${NC}"
else
    echo -e "${YELLOW}⚠️  Status HTTP : ${HTTP_STATUS}${NC}"
    echo -e "${YELLOW}   Le backend peut nécessiter quelques secondes pour démarrer${NC}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}📋 Prochaines étapes${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Testez votre frontend : https://smartcabb.com"
echo "2. Créez un compte admin pour vérifier la connexion"
echo "3. Surveillez les logs en temps réel :"
echo "   supabase functions logs ${FUNCTION_NAME} --follow"
echo ""
echo "4. Pour redéployer après modifications :"
echo "   supabase functions deploy ${FUNCTION_NAME}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

