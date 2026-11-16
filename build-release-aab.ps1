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

# ----------------------------------------------------------------------------
# Execute une commande externe et renvoie son code de sortie.
# On passe par Start-Process + fichiers de log : les WARNINGS que Vite/Gradle
# ecrivent sur stderr ne sont plus interpretes par PowerShell comme des
# erreurs fatales ($ErrorActionPreference = 'Stop' les transformerait en crash).
# ----------------------------------------------------------------------------
function Invoke-Logged {
    param(
        [string]$Exe,
        [string[]]$CmdArgs,
        [string]$WorkDir,
        [string]$Label
    )
    $logDir = Join-Path $env:TEMP "smartcabb-build-logs"
    New-Item -ItemType Directory -Force -Path $logDir | Out-Null
    $outLog = Join-Path $logDir "$Label.out.log"
    $errLog = Join-Path $logDir "$Label.err.log"
    if (Test-Path -LiteralPath $outLog) { Remove-Item -LiteralPath $outLog -Force }
    if (Test-Path -LiteralPath $errLog) { Remove-Item -LiteralPath $errLog -Force }

    $proc = Start-Process -FilePath $Exe -ArgumentList $CmdArgs -WorkingDirectory $WorkDir -NoNewWindow -Wait -PassThru -RedirectStandardOutput $outLog -RedirectStandardError $errLog

    if (Test-Path -LiteralPath $outLog) {
        Get-Content -LiteralPath $outLog -Encoding UTF8 | ForEach-Object { Write-Host $_ }
    }
    if (Test-Path -LiteralPath $errLog) {
        Get-Content -LiteralPath $errLog -Encoding UTF8 | ForEach-Object { Write-Host $_ -ForegroundColor DarkYellow }
    }
    return $proc.ExitCode
}

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
    $webBuildCode = Invoke-Logged -Exe "cmd.exe" -CmdArgs @('/c', 'npm run build') -WorkDir $root -Label 'npm-build'
    if ($webBuildCode -ne 0) { throw "Build web echoue (code $webBuildCode)" }
}

# 2. Sync Capacitor (recopie dist/ + met a jour les plugins natifs)
Write-Host "[2/6] npx cap sync android..." -ForegroundColor Yellow
$syncCode = Invoke-Logged -Exe "cmd.exe" -CmdArgs @('/c', 'npx cap sync android') -WorkDir $root -Label 'cap-sync'
if ($syncCode -ne 0) { throw "cap sync echoue (code $syncCode)" }

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

# Plugin TTS natif (voix de la sonnerie dans l'APK) — scope @capacitor-community
$ttsSrc = Join-Path $root "node_modules\@capacitor-community\text-to-speech\android"
$ttsDst = Join-Path $work "node_modules\@capacitor-community\text-to-speech\android"
if (Test-Path -LiteralPath $ttsSrc) {
    New-Item -ItemType Directory -Force -Path $ttsDst | Out-Null
    robocopy $ttsSrc $ttsDst /E /XD build .gradle /NFL /NDL /NJH /NJS /NP | Out-Null
    if ($LASTEXITCODE -ge 8) { throw "Copie du plugin text-to-speech echouee (robocopy $LASTEXITCODE)" }
} else {
    Write-Host "Plugin @capacitor-community/text-to-speech absent (voix native indisponible)" -ForegroundColor Yellow
}

# 4. Compilation release signee
Write-Host "[4/6] Compilation release (signee)..." -ForegroundColor Yellow
$env:JAVA_HOME = "$env:USERPROFILE\AppData\Local\Programs\Eclipse Adoptium\jdk-21.0.11+10"
$env:ANDROID_HOME = "C:\Users\smart\AppData\Local\Android\Sdk"
$env:Path = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:Path"

$gradleArgs = if ($ApkOnly) { 'gradlew.bat assembleRelease --no-daemon' } else { 'gradlew.bat bundleRelease assembleRelease --no-daemon' }
$gradleCode = Invoke-Logged -Exe "cmd.exe" -CmdArgs @('/c', $gradleArgs) -WorkDir $workAndroid -Label 'gradle-release'
if ($gradleCode -ne 0) { throw "Gradle release echoue (code $gradleCode)" }

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
