param(
    [switch]$NoDeploy = $false
)

$ErrorActionPreference = "Stop"

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "     SmartCabb - Rebuild APK + Deploy" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

# 1. Build web app
Write-Host "[1/4] npm run build..." -ForegroundColor Yellow
npm run build
if (-not $?) { Write-Host "FAIL Build failed" -ForegroundColor Red; exit 1 }

# 2. Sync Capacitor
Write-Host "[2/4] npx cap sync android..." -ForegroundColor Yellow
npx cap sync android
if (-not $?) { Write-Host "FAIL Sync failed" -ForegroundColor Red; exit 1 }

# 3. Build APK
Write-Host "[3/4] Build APK..." -ForegroundColor Yellow
$env:JAVA_HOME = "$env:USERPROFILE\AppData\Local\Programs\Eclipse Adoptium\jdk-21.0.11+10"
$env:ANDROID_HOME = "C:\Users\smart\AppData\Local\Android\Sdk"
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

# 4. Deploy Vercel (sauf si --NoDeploy)
if (-not $NoDeploy) {
    Write-Host "[4/4] Deploy Vercel..." -ForegroundColor Yellow
    npx vercel --prod
    if ($?) { Write-Host "OK Vercel deploy done" -ForegroundColor Green }
}

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "REBUILD COMPLETE" -ForegroundColor Green
Write-Host "APK: Desktop/smartcabb.apk" -ForegroundColor Green
Write-Host "Site: https://www.smartcabb.com" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan
