# 🔍 Script de Vérification Rapide du Backend SmartCabb (PowerShell)
# Auteur : Assistant IA Figma Make
# Date : 5 février 2026

$PROJECT_REF = "zaerjqchzqmcxqblkfkg"
$FUNCTION_NAME = "make-server-2eb02e52"

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "🔍 Vérification du Backend SmartCabb" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

$SCORE = 0
$MAX_SCORE = 7

# ============================================
# 1. Vérifier Supabase CLI
# ============================================
Write-Host "[1/7] Vérification de Supabase CLI..." -ForegroundColor Blue

try {
    $version = & supabase --version 2>&1
    Write-Host "✅ Supabase CLI installé : $version" -ForegroundColor Green
    $SCORE++
} catch {
    Write-Host "❌ Supabase CLI non installé" -ForegroundColor Red
    Write-Host ""
    Write-Host "Installation requise :"
    Write-Host "  Windows    : scoop install supabase" -ForegroundColor White
    Write-Host "  NPM        : npm install -g supabase" -ForegroundColor White
    Write-Host ""
}

Write-Host ""

# ============================================
# 2. Vérifier la structure du dossier
# ============================================
Write-Host "[2/7] Vérification de la structure du dossier..." -ForegroundColor Blue

if (Test-Path "supabase\functions\$FUNCTION_NAME") {
    Write-Host "✅ Dossier correct : /supabase/functions/$FUNCTION_NAME/" -ForegroundColor Green
    $SCORE++
    
    # Compter les fichiers
    $fileCount = (Get-ChildItem -Path "supabase\functions\$FUNCTION_NAME" -File -Recurse).Count
    Write-Host "   $fileCount fichiers trouvés"
} elseif (Test-Path "supabase\functions\server") {
    Write-Host "❌ Dossier incorrect : /supabase/functions/server" -ForegroundColor Red
    Write-Host "   ACTION REQUISE : Renommer le dossier" -ForegroundColor Yellow
    Write-Host "   Rename-Item -Path 'supabase\functions\server' -NewName '$FUNCTION_NAME'" -ForegroundColor Yellow
} else {
    Write-Host "❌ Aucun dossier backend trouvé !" -ForegroundColor Red
}

Write-Host ""

# ============================================
# 3. Vérifier l'authentification Supabase
# ============================================
Write-Host "[3/7] Vérification de l'authentification Supabase..." -ForegroundColor Blue

try {
    $null = & supabase projects list 2>&1
    Write-Host "✅ Authentifié auprès de Supabase" -ForegroundColor Green
    $SCORE++
} catch {
    Write-Host "❌ Non authentifié" -ForegroundColor Red
    Write-Host "   ACTION REQUISE : supabase login" -ForegroundColor Yellow
}

Write-Host ""

# ============================================
# 4. Vérifier la liaison du projet
# ============================================
Write-Host "[4/7] Vérification de la liaison du projet..." -ForegroundColor Blue

if (Test-Path ".supabase\config.toml") {
    Write-Host "✅ Projet lié localement" -ForegroundColor Green
    $SCORE++
    
    # Essayer d'extraire le project_id
    $configContent = Get-Content ".supabase\config.toml" -Raw
    if ($configContent -match 'project_id\s*=\s*"([^"]+)"') {
        $linkedId = $matches[1]
        if ($linkedId -eq $PROJECT_REF) {
            Write-Host "   Project ID : $linkedId (correct)" -ForegroundColor Green
        } else {
            Write-Host "   Project ID : $linkedId (attendu : $PROJECT_REF)" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "❌ Projet non lié" -ForegroundColor Red
    Write-Host "   ACTION REQUISE : supabase link --project-ref $PROJECT_REF" -ForegroundColor Yellow
}

Write-Host ""

# ============================================
# 5. Vérifier les secrets
# ============================================
Write-Host "[5/7] Vérification des secrets locaux..." -ForegroundColor Blue

if (Test-Path ".env.supabase") {
    Write-Host "✅ Fichier .env.supabase trouvé" -ForegroundColor Green
    $SCORE++
    
    # Compter les secrets (lignes non vides, non commentées)
    $secrets = Get-Content ".env.supabase" | Where-Object { $_ -notmatch '^\s*#' -and $_ -notmatch '^\s*$' }
    $secretCount = $secrets.Count
    Write-Host "   $secretCount secrets configurés"
    
    # Lister les clés (sans les valeurs)
    Write-Host "   Secrets détectés :" -ForegroundColor Cyan
    foreach ($secret in $secrets) {
        if ($secret -match '^([^=]+)=') {
            Write-Host "      - $($matches[1])"
        }
    }
} else {
    Write-Host "⚠️  Fichier .env.supabase non trouvé" -ForegroundColor Yellow
    Write-Host "   Créez-le depuis .env.supabase.example" -ForegroundColor Yellow
    Write-Host "   cp .env.supabase.example .env.supabase" -ForegroundColor Yellow
}

Write-Host ""

# ============================================
# 6. Vérifier si le backend est déployé
# ============================================
Write-Host "[6/7] Vérification du déploiement backend..." -ForegroundColor Blue

$HEALTH_URL = "https://$PROJECT_REF.supabase.co/functions/v1/$FUNCTION_NAME/health"

Write-Host "   URL testée : $HEALTH_URL"
Write-Host "   Test en cours..."

try {
    $response = Invoke-WebRequest -Uri $HEALTH_URL -Method Get -UseBasicParsing -ErrorAction Stop
    $statusCode = $response.StatusCode
    
    if ($statusCode -eq 200) {
        Write-Host "✅ Backend déployé et opérationnel !" -ForegroundColor Green
        Write-Host "   Status HTTP : $statusCode"
        Write-Host "   Réponse : $($response.Content)"
        $SCORE++
    } else {
        Write-Host "⚠️  Status HTTP inattendu : $statusCode" -ForegroundColor Yellow
    }
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    
    if ($statusCode -eq 404) {
        Write-Host "❌ Backend NON déployé (404 Not Found)" -ForegroundColor Red
        Write-Host "   ACTION REQUISE : Déployer le backend" -ForegroundColor Yellow
        Write-Host "   supabase functions deploy $FUNCTION_NAME" -ForegroundColor Yellow
    } elseif ($null -eq $statusCode) {
        Write-Host "❌ Impossible de joindre le serveur" -ForegroundColor Red
        Write-Host "   Vérifiez votre connexion Internet"
    } else {
        Write-Host "⚠️  Status HTTP inattendu : $statusCode" -ForegroundColor Yellow
    }
}

Write-Host ""

# ============================================
# 7. Vérifier le frontend
# ============================================
Write-Host "[7/7] Vérification du frontend..." -ForegroundColor Blue

$FRONTEND_URL = "https://smartcabb.com"

Write-Host "   URL testée : $FRONTEND_URL"

try {
    $frontendResponse = Invoke-WebRequest -Uri $FRONTEND_URL -Method Get -UseBasicParsing -ErrorAction Stop
    $frontendStatus = $frontendResponse.StatusCode
    
    if ($frontendStatus -eq 200) {
        Write-Host "✅ Frontend accessible" -ForegroundColor Green
        Write-Host "   Status HTTP : $frontendStatus"
        $SCORE++
    } else {
        Write-Host "⚠️  Status HTTP : $frontendStatus" -ForegroundColor Yellow
    }
} catch {
    $frontendStatus = $_.Exception.Response.StatusCode.value__
    Write-Host "⚠️  Status HTTP : $frontendStatus" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "📊 Résumé" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

# Afficher le score
Write-Host "Score : $SCORE/$MAX_SCORE"
Write-Host ""

if ($SCORE -eq $MAX_SCORE) {
    Write-Host "🎉 Tout est opérationnel !" -ForegroundColor Green
    Write-Host ""
    Write-Host "Votre application SmartCabb est entièrement fonctionnelle."
    Write-Host "Frontend : $FRONTEND_URL"
    Write-Host "Backend  : $HEALTH_URL"
} elseif ($SCORE -ge 5) {
    Write-Host "⚠️  Presque prêt ($SCORE/$MAX_SCORE)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Quelques actions restantes. Consultez les messages ci-dessus."
} elseif ($SCORE -ge 3) {
    Write-Host "⚠️  Configuration partielle ($SCORE/$MAX_SCORE)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Plusieurs étapes à compléter. Consultez les messages ci-dessus."
} else {
    Write-Host "❌ Configuration incomplète ($SCORE/$MAX_SCORE)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Le backend n'est pas opérationnel. Actions recommandées :"
    Write-Host ""
    Write-Host "1. Installer Supabase CLI"
    Write-Host "   npm install -g supabase"
    Write-Host ""
    Write-Host "2. Exécuter le script de déploiement"
    Write-Host "   .\deploy-backend.ps1"
    Write-Host ""
    Write-Host "3. Consulter la documentation"
    Write-Host "   Get-Content README_BACKEND_DEPLOIEMENT.md"
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

# Recommandations
if ($SCORE -lt $MAX_SCORE) {
    Write-Host "📋 Actions recommandées :" -ForegroundColor Blue
    Write-Host ""
    
    try {
        $null = & supabase --version 2>&1
    } catch {
        Write-Host "  1. Installer Supabase CLI" -ForegroundColor Yellow
        Write-Host "     npm install -g supabase"
        Write-Host ""
    }
    
    if (-not (Test-Path "supabase\functions\$FUNCTION_NAME")) {
        Write-Host "  2. Renommer le dossier backend" -ForegroundColor Yellow
        Write-Host "     Rename-Item -Path 'supabase\functions\server' -NewName '$FUNCTION_NAME'"
        Write-Host ""
    }
    
    if ($SCORE -lt 6) {
        Write-Host "  3. Déployer le backend" -ForegroundColor Yellow
        Write-Host "     .\deploy-backend.ps1"
        Write-Host "     OU" -ForegroundColor Cyan
        Write-Host "     supabase functions deploy $FUNCTION_NAME"
        Write-Host ""
    }
    
    Write-Host "  4. Consulter la documentation complète" -ForegroundColor Blue
    Write-Host "     Get-Content README_BACKEND_DEPLOIEMENT.md"
    Write-Host ""
}
