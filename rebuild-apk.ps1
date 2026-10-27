param(
    [switch]$NoDeploy = $false
)

$ErrorActionPreference = "Stop"

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "     SmartCabb - Rebuild APK + Deploy" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

$root = $PSScriptRoot

# 1. Build web app
Write-Host "[1/5] npm run build..." -ForegroundColor Yellow
Push-Location -LiteralPath $root
try {
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "Build web echoue" }
} finally {
    Pop-Location
}

# 2. Sync Capacitor
Write-Host "[2/5] npx cap sync android..." -ForegroundColor Yellow
Push-Location -LiteralPath $root
try {
    npx cap sync android
    if ($LASTEXITCODE -ne 0) { throw "cap sync echoue" }
} finally {
    Pop-Location
}

# 3. Build APK HORS OneDrive
#    Le dossier du projet est dans OneDrive : les fichiers "a la demande"
#    (ReparsePoint) et les verrous de synchronisation font echouer Gradle
#    (mergeDebugResources / mergeDebugAssets / clean). On copie donc le
#    projet Android dans un dossier local temporaire et on compile la-bas.
Write-Host "[3/5] Preparation du dossier de build hors OneDrive..." -ForegroundColor Yellow
$work = Join-Path $env:LOCALAPPDATA "Temp\smartcabb-apk-build"
$workAndroid = Join-Path $work "android"

if (Test-Path -LiteralPath $work) { Remove-Item -LiteralPath $work -Recurse -Force }
New-Item -ItemType Directory -Force -Path $work | Out-Null

robocopy (Join-Path $root "android") $workAndroid /E /XD build .gradle .cxx /NFL /NDL /NJH /NJS /NP | Out-Null
if ($LASTEXITCODE -ge 8) { throw "Copie du projet android echouee (robocopy $LASTEXITCODE)" }

# Les plugins Capacitor sont references en dehors de android/ (../node_modules)
$plugins = @(
    @{ name = "android"; sub = "capacitor" },
    @{ name = "app"; sub = "android" },
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

# 4. Compilation Gradle
Write-Host "[4/5] Compilation APK..." -ForegroundColor Yellow
$env:JAVA_HOME = "$env:USERPROFILE\AppData\Local\Programs\Eclipse Adoptium\jdk-21.0.11+10"
$env:ANDROID_HOME = "C:\Users\smart\AppData\Local\Android\Sdk"
$env:Path = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:Path"

Push-Location -LiteralPath $workAndroid
try {
    .\gradlew assembleDebug --no-daemon
    if ($LASTEXITCODE -ne 0) { throw "Gradle build failed" }
} finally {
    Pop-Location
}

$apk = Join-Path $workAndroid "app\build\outputs\apk\debug\app-debug.apk"
if (-not (Test-Path -LiteralPath $apk)) { throw "APK introuvable: $apk" }

# Version lue dans le build.gradle pour nommer l'APK
$gradle = Get-Content -LiteralPath (Join-Path $workAndroid "app\build.gradle") -Raw
$versionName = "0.0"
if ($gradle -match 'versionName\s+"([^"]+)"') { $versionName = $matches[1] }

$desktop = "$env:USERPROFILE\OneDrive\Desktop"
Copy-Item -LiteralPath $apk -Destination (Join-Path $desktop "smartcabb.apk") -Force
Copy-Item -LiteralPath $apk -Destination (Join-Path $desktop "smartcabb-$versionName.apk") -Force
Write-Host "OK APK copie sur le Bureau (smartcabb.apk / smartcabb-$versionName.apk)" -ForegroundColor Green

# 5. Deploy Vercel (sauf si --NoDeploy)
if (-not $NoDeploy) {
    Write-Host "[5/5] Deploy Vercel..." -ForegroundColor Yellow
    Push-Location -LiteralPath $root
    try {
        npx vercel --prod
        if ($LASTEXITCODE -eq 0) { Write-Host "OK Vercel deploy done" -ForegroundColor Green }
    } finally {
        Pop-Location
    }
}

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "REBUILD COMPLETE - version $versionName" -ForegroundColor Green
Write-Host "APK: Desktop/smartcabb-$versionName.apk" -ForegroundColor Green
Write-Host "Site: https://www.smartcabb.com" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan
