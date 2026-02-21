@echo off
REM 🧹 Script de nettoyage complet pour corriger les erreurs de build Rollup (Windows)

echo 🧹 Nettoyage du cache Vite/Rollup...

REM Supprimer les dossiers de cache
if exist dist rmdir /s /q dist
if exist node_modules\.vite rmdir /s /q node_modules\.vite
if exist .vite rmdir /s /q .vite

echo ✅ Cache nettoyé avec succès !
echo.

REM Optionnel : Relancer le build
set /p response="Voulez-vous relancer le build maintenant ? (y/n) "

if /i "%response%"=="y" (
    echo 🔨 Lancement du build...
    call npm run build
    
    if %errorlevel% equ 0 (
        echo ✅ Build réussi !
    ) else (
        echo ❌ Build échoué. Vérifiez les erreurs ci-dessus.
    )
) else (
    echo ℹ️  Vous pouvez lancer le build manuellement avec : npm run build
)

pause
