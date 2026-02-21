# 🚀 Script de Déploiement Backend SmartCabb sur Supabase (PowerShell)
# Auteur : Assistant IA Figma Make
# Date : 5 février 2026

# Arrêter le script en cas d'erreur
$ErrorActionPreference = "Stop"

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "🚀 Déploiement Backend SmartCabb sur Supabase" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

# Variables
$PROJECT_REF = "zaerjqchzqmcxqblkfkg"
$FUNCTION_NAME = "make-server-2eb02e52"
$OLD_DIR = "supabase\functions\server"
$NEW_DIR = "supabase\functions\$FUNCTION_NAME"

# ============================================
# ÉTAPE 1 : Vérifier la présence de Supabase CLI
# ============================================
Write-Host "[1/6] Vérification de Supabase CLI..." -ForegroundColor Blue

try {
    $version = & supabase --version 2>&1
    Write-Host "✅ Supabase CLI trouvé : $version" -ForegroundColor Green
} catch {
    Write-Host "❌ Supabase CLI n'est pas installé" -ForegroundColor Red
    Write-Host ""
    Write-Host "Installation requise :" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Windows (Scoop) :" -ForegroundColor Yellow
    Write-Host "  scoop bucket add supabase https://github.com/supabase/scoop-bucket.git" -ForegroundColor White
    Write-Host "  scoop install supabase" -ForegroundColor White
    Write-Host ""
    Write-Host "NPM (toutes plateformes) :" -ForegroundColor Yellow
    Write-Host "  npm install -g supabase" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host ""

# ============================================
# ÉTAPE 2 : Restructurer le dossier backend
# ============================================
Write-Host "[2/6] Restructuration du dossier backend..." -ForegroundColor Blue

if (Test-Path $OLD_DIR) {
    if (Test-Path $NEW_DIR) {
        Write-Host "⚠️  Le dossier $NEW_DIR existe déjà" -ForegroundColor Yellow
        Write-Host "   Suppression de l'ancien dossier 'server'..." -ForegroundColor Yellow
        Remove-Item -Recurse -Force $OLD_DIR
        Write-Host "✅ Ancien dossier supprimé" -ForegroundColor Green
    } else {
        Write-Host "📁 Renommage : $OLD_DIR → $NEW_DIR" -ForegroundColor Yellow
        Rename-Item -Path $OLD_DIR -NewName $FUNCTION_NAME
        Write-Host "✅ Dossier renommé avec succès" -ForegroundColor Green
    }
} elseif (Test-Path $NEW_DIR) {
    Write-Host "✅ Structure correcte déjà en place" -ForegroundColor Green
} else {
    Write-Host "❌ Aucun dossier backend trouvé !" -ForegroundColor Red
    Write-Host "   Attendu : $OLD_DIR ou $NEW_DIR" -ForegroundColor Red
    exit 1
}

Write-Host ""

# ============================================
# ÉTAPE 3 : Authentification Supabase
# ============================================
Write-Host "[3/6] Authentification Supabase..." -ForegroundColor Blue

try {
    $null = & supabase projects list 2>&1
    Write-Host "✅ Déjà authentifié" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Non authentifié. Ouverture du navigateur..." -ForegroundColor Yellow
    & supabase login
    Write-Host "✅ Authentification réussie" -ForegroundColor Green
}

Write-Host ""

# ============================================
# ÉTAPE 4 : Liaison du projet
# ============================================
Write-Host "[4/6] Liaison au projet Supabase..." -ForegroundColor Blue

if (Test-Path ".supabase\config.toml") {
    Write-Host "✅ Projet déjà lié" -ForegroundColor Green
} else {
    Write-Host "🔗 Liaison au projet $PROJECT_REF..." -ForegroundColor Yellow
    & supabase link --project-ref $PROJECT_REF
    Write-Host "✅ Projet lié avec succès" -ForegroundColor Green
}

Write-Host ""

# ============================================
# ÉTAPE 5 : Configuration des secrets
# ============================================
Write-Host "[5/6] Configuration des secrets..." -ForegroundColor Blue

if (Test-Path ".env.supabase") {
    Write-Host "📋 Fichier .env.supabase détecté" -ForegroundColor Yellow
    Write-Host "   Application des secrets..." -ForegroundColor Yellow
    
    # Lire et appliquer chaque secret
    Get-Content ".env.supabase" | ForEach-Object {
        if ($_ -match '^([^#][^=]+)=(.+)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            
            if ($key -and $value) {
                Write-Host "   Setting $key..." -ForegroundColor Gray
                echo $value | & supabase secrets set $key --env-file /dev/stdin 2>$null
            }
        }
    }
    
    Write-Host "✅ Secrets configurés depuis .env.supabase" -ForegroundColor Green
} else {
    Write-Host "⚠️  Fichier .env.supabase non trouvé" -ForegroundColor Yellow
    Write-Host "   Les secrets doivent être configurés manuellement :" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   supabase secrets set AFRICAS_TALKING_USERNAME=..." -ForegroundColor White
    Write-Host "   supabase secrets set AFRICAS_TALKING_API_KEY=..." -ForegroundColor White
    Write-Host "   supabase secrets set FLUTTERWAVE_SECRET_KEY=..." -ForegroundColor White
    Write-Host "   supabase secrets set SENDGRID_API_KEY=..." -ForegroundColor White
    Write-Host "   supabase secrets set GOOGLE_MAPS_SERVER_API_KEY=..." -ForegroundColor White
    Write-Host "   supabase secrets set MAPBOX_API_KEY=..." -ForegroundColor White
    Write-Host "   supabase secrets set FIREBASE_PROJECT_ID=..." -ForegroundColor White
    Write-Host "   supabase secrets set FIREBASE_SERVER_KEY=..." -ForegroundColor White
    Write-Host ""
    Write-Host "   Ou créez un fichier .env.supabase avec vos secrets" -ForegroundColor Yellow
}

Write-Host ""

# ============================================
# ÉTAPE 6 : Déploiement de la fonction
# ============================================
Write-Host "[6/6] Déploiement de la fonction Edge..." -ForegroundColor Blue

Write-Host "🚀 Déploiement en cours..." -ForegroundColor Yellow
& supabase functions deploy $FUNCTION_NAME

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host "✅ Déploiement réussi !" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host ""

# ============================================
# VÉRIFICATION
# ============================================
Write-Host "🔍 Vérification du déploiement..." -ForegroundColor Blue
Write-Host ""

$HEALTH_URL = "https://$PROJECT_REF.supabase.co/functions/v1/$FUNCTION_NAME/health"

Write-Host "   URL : $HEALTH_URL"
Write-Host "   Test en cours..."
Write-Host ""

try {
    $response = Invoke-WebRequest -Uri $HEALTH_URL -Method Get -UseBasicParsing
    $statusCode = $response.StatusCode
    
    if ($statusCode -eq 200) {
        Write-Host "✅ Backend opérationnel !" -ForegroundColor Green
        Write-Host "   Status HTTP : $statusCode" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Status HTTP : $statusCode" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  Erreur lors de la vérification" -ForegroundColor Yellow
    Write-Host "   Le backend peut nécessiter quelques secondes pour démarrer" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "📋 Prochaines étapes" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Testez votre frontend : https://smartcabb.com"
Write-Host "2. Créez un compte admin pour vérifier la connexion"
Write-Host "3. Surveillez les logs en temps réel :"
Write-Host "   supabase functions logs $FUNCTION_NAME --follow" -ForegroundColor White
Write-Host ""
Write-Host "4. Pour redéployer après modifications :"
Write-Host "   supabase functions deploy $FUNCTION_NAME" -ForegroundColor White
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
