param(
    [switch]$ForceBuild = $false
)

$ErrorActionPreference = "Stop"

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "     SmartCabb - Deploy (APK initial + Web)" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

# Build web app
Write-Host "[1/3] npm run build..." -ForegroundColor Yellow
npm run build
if (-not $?) { Write-Host "FAIL Build failed" -ForegroundColor Red; exit 1 }

# APK initial build (optionnel, seulement si --ForceBuild ou APK manquant)
if ($ForceBuild -or -not (Test-Path -LiteralPath "android\app\build\outputs\apk\debug\app-debug.apk")) {
    Write-Host "[2/3] Build APK (initial)..." -ForegroundColor Yellow
    $env:JAVA_HOME = "$env:USERPROFILE\AppData\Local\Programs\Eclipse Adoptium\jdk-21.0.11+10"
    $env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
    $env:Path = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:Path"

    Push-Location -LiteralPath "android"
    try {
        .\gradlew assembleDebug --no-daemon
        if (-not $?) { throw "Gradle build failed" }
    } finally {
        Pop-Location
    }

    Copy-Item -Path "android\app\build\outputs\apk\debug\app-debug.apk" -Destination "$env:USERPROFILE\OneDrive\Desktop\smartcabb.apk" -Force
    Write-Host "OK APK copied to Desktop (smartcabb.apk)" -ForegroundColor Green
} else {
    Write-Host "[2/3] Build APK ignoré (deja fait, utiliser --ForceBuild pour recompiler)" -ForegroundColor DarkYellow
}

# Deploy Vercel
Write-Host "[3/3] Deploy Vercel..." -ForegroundColor Yellow
npx vercel --prod
if (-not $?) { Write-Host "FAIL Vercel deploy" -ForegroundColor Red; exit 1 }

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "DEPLOY COMPLETE" -ForegroundColor Green
Write-Host "Site: https://www.smartcabb.com" -ForegroundColor Green
Write-Host "APK: Desktop/smartcabb.apk" -ForegroundColor Green
Write-Host "Prochaines mises a jour : npm run build + npx vercel --prod" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
