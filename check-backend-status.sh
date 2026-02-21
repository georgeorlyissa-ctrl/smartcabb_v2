#!/bin/bash

# 🔍 Script de Vérification Rapide du Backend SmartCabb
# Auteur : Assistant IA Figma Make
# Date : 5 février 2026

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

PROJECT_REF="zaerjqchzqmcxqblkfkg"
FUNCTION_NAME="make-server-2eb02e52"

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}🔍 Vérification du Backend SmartCabb${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# ============================================
# 1. Vérifier Supabase CLI
# ============================================
echo -e "${BLUE}[1/7]${NC} Vérification de Supabase CLI..."

if command -v supabase &> /dev/null; then
    VERSION=$(supabase --version 2>&1 | head -n 1)
    echo -e "${GREEN}✅ Supabase CLI installé : ${VERSION}${NC}"
else
    echo -e "${RED}❌ Supabase CLI non installé${NC}"
    echo ""
    echo "Installation requise :"
    echo "  macOS      : brew install supabase/tap/supabase"
    echo "  Windows    : scoop install supabase"
    echo "  NPM        : npm install -g supabase"
    echo ""
fi

echo ""

# ============================================
# 2. Vérifier la structure du dossier
# ============================================
echo -e "${BLUE}[2/7]${NC} Vérification de la structure du dossier..."

if [ -d "supabase/functions/${FUNCTION_NAME}" ]; then
    echo -e "${GREEN}✅ Dossier correct : /supabase/functions/${FUNCTION_NAME}/${NC}"
    
    # Compter les fichiers
    FILE_COUNT=$(find "supabase/functions/${FUNCTION_NAME}" -type f | wc -l)
    echo -e "   ${FILE_COUNT} fichiers trouvés"
elif [ -d "supabase/functions/server" ]; then
    echo -e "${RED}❌ Dossier incorrect : /supabase/functions/server${NC}"
    echo -e "${YELLOW}   ACTION REQUISE : Renommer le dossier${NC}"
    echo -e "   ${YELLOW}mv supabase/functions/server supabase/functions/${FUNCTION_NAME}${NC}"
else
    echo -e "${RED}❌ Aucun dossier backend trouvé !${NC}"
fi

echo ""

# ============================================
# 3. Vérifier l'authentification Supabase
# ============================================
echo -e "${BLUE}[3/7]${NC} Vérification de l'authentification Supabase..."

if command -v supabase &> /dev/null; then
    if supabase projects list &> /dev/null; then
        echo -e "${GREEN}✅ Authentifié auprès de Supabase${NC}"
    else
        echo -e "${RED}❌ Non authentifié${NC}"
        echo -e "${YELLOW}   ACTION REQUISE : supabase login${NC}"
    fi
else
    echo -e "${YELLOW}⏭️  Ignoré (Supabase CLI non installé)${NC}"
fi

echo ""

# ============================================
# 4. Vérifier la liaison du projet
# ============================================
echo -e "${BLUE}[4/7]${NC} Vérification de la liaison du projet..."

if [ -f ".supabase/config.toml" ]; then
    echo -e "${GREEN}✅ Projet lié localement${NC}"
    
    # Essayer d'extraire le project_id
    if grep -q "project_id" ".supabase/config.toml"; then
        LINKED_ID=$(grep "project_id" ".supabase/config.toml" | cut -d'"' -f2)
        if [ "$LINKED_ID" == "$PROJECT_REF" ]; then
            echo -e "   Project ID : ${LINKED_ID} ${GREEN}(correct)${NC}"
        else
            echo -e "   Project ID : ${LINKED_ID} ${YELLOW}(attendu : ${PROJECT_REF})${NC}"
        fi
    fi
else
    echo -e "${RED}❌ Projet non lié${NC}"
    echo -e "${YELLOW}   ACTION REQUISE : supabase link --project-ref ${PROJECT_REF}${NC}"
fi

echo ""

# ============================================
# 5. Vérifier les secrets
# ============================================
echo -e "${BLUE}[5/7]${NC} Vérification des secrets locaux..."

if [ -f ".env.supabase" ]; then
    echo -e "${GREEN}✅ Fichier .env.supabase trouvé${NC}"
    
    # Compter les secrets (lignes non vides, non commentées)
    SECRET_COUNT=$(grep -v '^#' .env.supabase | grep -v '^$' | wc -l)
    echo -e "   ${SECRET_COUNT} secrets configurés"
    
    # Lister les clés (sans les valeurs)
    echo -e "   ${CYAN}Secrets détectés :${NC}"
    grep -v '^#' .env.supabase | grep -v '^$' | cut -d'=' -f1 | sed 's/^/      - /'
else
    echo -e "${YELLOW}⚠️  Fichier .env.supabase non trouvé${NC}"
    echo -e "   ${YELLOW}Créez-le depuis .env.supabase.example${NC}"
    echo -e "   ${YELLOW}cp .env.supabase.example .env.supabase${NC}"
fi

echo ""

# ============================================
# 6. Vérifier si le backend est déployé
# ============================================
echo -e "${BLUE}[6/7]${NC} Vérification du déploiement backend..."

HEALTH_URL="https://${PROJECT_REF}.supabase.co/functions/v1/${FUNCTION_NAME}/health"

echo -e "   URL testée : ${HEALTH_URL}"
echo -e "   Test en cours..."

HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${HEALTH_URL}" 2>/dev/null)

if [ "$HTTP_STATUS" -eq 200 ]; then
    echo -e "${GREEN}✅ Backend déployé et opérationnel !${NC}"
    echo -e "   Status HTTP : ${HTTP_STATUS}"
    
    # Afficher la réponse
    RESPONSE=$(curl -s "${HEALTH_URL}" 2>/dev/null)
    echo -e "   Réponse : ${RESPONSE}"
elif [ "$HTTP_STATUS" -eq 404 ]; then
    echo -e "${RED}❌ Backend NON déployé (404 Not Found)${NC}"
    echo -e "${YELLOW}   ACTION REQUISE : Déployer le backend${NC}"
    echo -e "   ${YELLOW}supabase functions deploy ${FUNCTION_NAME}${NC}"
elif [ "$HTTP_STATUS" -eq 0 ]; then
    echo -e "${RED}❌ Impossible de joindre le serveur${NC}"
    echo -e "   Vérifiez votre connexion Internet"
else
    echo -e "${YELLOW}⚠️  Status HTTP inattendu : ${HTTP_STATUS}${NC}"
fi

echo ""

# ============================================
# 7. Vérifier le frontend
# ============================================
echo -e "${BLUE}[7/7]${NC} Vérification du frontend..."

FRONTEND_URL="https://smartcabb.com"

echo -e "   URL testée : ${FRONTEND_URL}"

FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${FRONTEND_URL}" 2>/dev/null)

if [ "$FRONTEND_STATUS" -eq 200 ]; then
    echo -e "${GREEN}✅ Frontend accessible${NC}"
    echo -e "   Status HTTP : ${FRONTEND_STATUS}"
else
    echo -e "${YELLOW}⚠️  Status HTTP : ${FRONTEND_STATUS}${NC}"
fi

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}📊 Résumé${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Calculer le score
SCORE=0
MAX_SCORE=7

# Supabase CLI installé
if command -v supabase &> /dev/null; then
    ((SCORE++))
fi

# Dossier correct
if [ -d "supabase/functions/${FUNCTION_NAME}" ]; then
    ((SCORE++))
fi

# Authentifié
if command -v supabase &> /dev/null && supabase projects list &> /dev/null; then
    ((SCORE++))
fi

# Projet lié
if [ -f ".supabase/config.toml" ]; then
    ((SCORE++))
fi

# Secrets configurés
if [ -f ".env.supabase" ]; then
    ((SCORE++))
fi

# Backend déployé
if [ "$HTTP_STATUS" -eq 200 ]; then
    ((SCORE++))
fi

# Frontend accessible
if [ "$FRONTEND_STATUS" -eq 200 ]; then
    ((SCORE++))
fi

# Afficher le score
echo -e "Score : ${SCORE}/${MAX_SCORE}"
echo ""

if [ $SCORE -eq $MAX_SCORE ]; then
    echo -e "${GREEN}🎉 Tout est opérationnel !${NC}"
    echo ""
    echo "Votre application SmartCabb est entièrement fonctionnelle."
    echo "Frontend : ${FRONTEND_URL}"
    echo "Backend  : ${HEALTH_URL}"
elif [ $SCORE -ge 5 ]; then
    echo -e "${YELLOW}⚠️  Presque prêt (${SCORE}/${MAX_SCORE})${NC}"
    echo ""
    echo "Quelques actions restantes. Consultez les messages ci-dessus."
elif [ $SCORE -ge 3 ]; then
    echo -e "${YELLOW}⚠️  Configuration partielle (${SCORE}/${MAX_SCORE})${NC}"
    echo ""
    echo "Plusieurs étapes à compléter. Consultez les messages ci-dessus."
else
    echo -e "${RED}❌ Configuration incomplète (${SCORE}/${MAX_SCORE})${NC}"
    echo ""
    echo "Le backend n'est pas opérationnel. Actions recommandées :"
    echo ""
    echo "1. Installer Supabase CLI"
    echo "   npm install -g supabase"
    echo ""
    echo "2. Exécuter le script de déploiement"
    echo "   ./deploy-backend.sh"
    echo ""
    echo "3. Consulter la documentation"
    echo "   cat README_BACKEND_DEPLOIEMENT.md"
fi

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Recommandations
if [ $SCORE -lt $MAX_SCORE ]; then
    echo -e "${BLUE}📋 Actions recommandées :${NC}"
    echo ""
    
    if ! command -v supabase &> /dev/null; then
        echo -e "  1. ${YELLOW}Installer Supabase CLI${NC}"
        echo -e "     npm install -g supabase"
        echo ""
    fi
    
    if [ ! -d "supabase/functions/${FUNCTION_NAME}" ]; then
        echo -e "  2. ${YELLOW}Renommer le dossier backend${NC}"
        echo -e "     mv supabase/functions/server supabase/functions/${FUNCTION_NAME}"
        echo ""
    fi
    
    if [ "$HTTP_STATUS" -ne 200 ]; then
        echo -e "  3. ${YELLOW}Déployer le backend${NC}"
        echo -e "     ./deploy-backend.sh"
        echo -e "     ${CYAN}OU${NC}"
        echo -e "     supabase functions deploy ${FUNCTION_NAME}"
        echo ""
    fi
    
    echo -e "  4. ${BLUE}Consulter la documentation complète${NC}"
    echo -e "     cat README_BACKEND_DEPLOIEMENT.md"
    echo ""
fi
