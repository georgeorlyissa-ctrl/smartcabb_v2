# ============================================================================
#  SmartCabb - Build RELEASE (AAB Play Store + APK) avec push natif
# ----------------------------------------------------------------------------
#  PREREQUIS : android/app/google-services.json
#  (Firebase Console > Parametres du projet > Vos applications > Android
#   package com.smartcabb.app > Telecharger google-services.json)
#
#  Utilisation :
#     powershell -ExecutionPolicy Bypass -File .\build-release-aab.ps1
#     powershell -ExecutionPolicy Bypass -File .\build-release-aab.ps1 -SkipWebBuild
#     powershell -ExecutionPolicy Bypass -File .\build-release-aab.ps1 -ApkOnly
# ============================================================================
param(
    [switch]$SkipWebBuild = $false,
    [switch]$ApkOnly = $false
)

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "   SmartCabb - Build RELEASE (push natif)" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

# 0. Controle du fichier Firebase (indispensable au FCM natif)
$googleServices = Join-Path $root "android\app\google-services.json"
if (-not (Test-Path -LiteralPath $googleServices)) {
    Write-Host ""
    Write-Host "google-services.json MANQUANT : android\app\google-services.json" -ForegroundColor Red
    Write-Host ""
    Write-Host "Sans ce fichier, le push natif ne fonctionne pas (aucune sonnerie" -ForegroundColor Yellow
    Write-Host "quand l'app est en arriere-plan ou fermee)." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. https://console.firebase.google.com/project/smartcabb-bed00/settings/general" -ForegroundColor White
    Write-Host "2. 'Vos applications' > Ajouter une application > Android" -ForegroundColor White
    Write-Host "3. Nom du package : com.smartcabb.app" -ForegroundColor White
    Write-Host "4. Telecharger google-services.json" -ForegroundColor White
    Write-Host "5. Le placer dans android\app\google-services.json puis relancer" -ForegroundColor White
    Write-Host ""
    throw "google-services.json manquant"
}

# 1. Build web
if (-not $SkipWebBuild) {
    Write-Host "[1/6] npm run build..." -ForegroundColor Yellow
    Push-Location -LiteralPath $root
    try {
        npm run build
        if ($LASTEXITCODE -ne 0) { throw "Build web echoue" }
    } finally { Pop-Location }
}

# 2. Sync Capacitor (recopie dist/ + met a jour les plugins natifs)
Write-Host "[2/6] npx cap sync android..." -ForegroundColor Yellow
Push-Location -LiteralPath $root
try {
    npx cap sync android
    if ($LASTEXITCODE -ne 0) { throw "cap sync echoue" }
} finally { Pop-Location }

# 3. Copie hors OneDrive (evite les verrous de synchronisation Gradle)
Write-Host "[3/6] Preparation du dossier de build hors OneDrive..." -ForegroundColor Yellow
$work = Join-Path $env:LOCALAPPDATA "Temp\smartcabb-release-build"
$workAndroid = Join-Path $work "android"
if (Test-Path -LiteralPath $work) { Remove-Item -LiteralPath $work -Recurse -Force }
New-Item -ItemType Directory -Force -Path $work | Out-Null

robocopy (Join-Path $root "android") $workAndroid /E /XD build .gradle .cxx /NFL /NDL /NJH /NJS /NP | Out-Null
if ($LASTEXITCODE -ge 8) { throw "Copie du projet android echouee (robocopy $LASTEXITCODE)" }

$plugins = @(
    @{ name = "android"; sub = "capacitor" },
    @{ name = "app"; sub = "android" },
    @{ name = "contacts"; sub = "android" },
    @{ name = "geolocation"; sub = "android" },
    @{ name = "push-notifications"; sub = "android" }
)
foreach ($p in $plugins) {
    $src = Join-Path $root "node_modules\@capacitor\$($p.name)\$($p.sub)"
    $dst = Join-Path $work "node_modules\@capacitor\$($p.name)\$($p.sub)"
    if (-not (Test-Path -LiteralPath $src)) { throw "Plugin introuvable: $src" }
    New-Item -ItemType Directory -Force -Path $dst | Out-Null
    robocopy $src $dst /E /XD build .gradle /NFL /NDL /NJH /NJS /NP | Out-Null
    if ($LASTEXITCODE -ge 8) { throw "Copie du plugin $($p.name) echouee (robocopy $LASTEXITCODE)" }
}

# 4. Compilation release signee
Write-Host "[4/6] Compilation release (signee)..." -ForegroundColor Yellow
$env:JAVA_HOME = "$env:USERPROFILE\AppData\Local\Programs\Eclipse Adoptium\jdk-21.0.11+10"
$env:ANDROID_HOME = "C:\Users\smart\AppData\Local\Android\Sdk"
$env:Path = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:Path"

Push-Location -LiteralPath $workAndroid
try {
    if ($ApkOnly) {
        .\gradlew assembleRelease --no-daemon
        if ($LASTEXITCODE -ne 0) { throw "Gradle assembleRelease failed" }
    } else {
        .\gradlew bundleRelease assembleRelease --no-daemon
        if ($LASTEXITCODE -ne 0) { throw "Gradle bundleRelease failed" }
    }
} finally { Pop-Location }

# 5. Recuperation des artefacts
$gradle = Get-Content -LiteralPath (Join-Path $workAndroid "app\build.gradle") -Raw
$versionName = "0.0"
if ($gradle -match 'versionName\s+"([^"]+)"') { $versionName = $matches[1] }

$desktop = Join-Path $env:USERPROFILE "OneDrive\Desktop"
$apk = Join-Path $workAndroid "app\build\outputs\apk\release\app-release.apk"
$aab = Join-Path $workAndroid "app\build\outputs\bundle\release\app-release.aab"

if (Test-Path -LiteralPath $apk) {
    Copy-Item -LiteralPath $apk -Destination (Join-Path $desktop "SmartCabb-$versionName.apk") -Force
    Write-Host "OK APK  : Desktop\SmartCabb-$versionName.apk" -ForegroundColor Green
} else {
    Write-Host "APK release introuvable." -ForegroundColor Yellow
}

if (-not $ApkOnly) {
    if (-not (Test-Path -LiteralPath $aab)) { throw "AAB introuvable: $aab" }
    Copy-Item -LiteralPath $aab -Destination (Join-Path $desktop "SmartCabb-$versionName.aab") -Force
    Write-Host "OK AAB  : Desktop\SmartCabb-$versionName.aab  (a televerser sur Play Console)" -ForegroundColor Green
}

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "BUILD RELEASE TERMINE - version $versionName" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan
