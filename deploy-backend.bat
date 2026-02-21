@echo off
REM 🚀 Script de déploiement du backend SmartCabb pour Windows
REM Ce script déploie la fonction Edge sur Supabase

echo 🚀 Déploiement du backend SmartCabb...
echo.

REM Vérifier si Supabase CLI est installé
where supabase >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Supabase CLI n'est pas installé
    echo.
    echo 📦 Installation avec npm :
    echo    npm install -g supabase
    echo.
    pause
    exit /b 1
)

REM Vérifier si l'utilisateur est connecté
echo 🔑 Vérification de la connexion Supabase...
supabase functions list >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Vous n'êtes pas connecté à Supabase
    echo 🔐 Connexion...
    supabase login
)

REM Déployer la fonction
echo.
echo 📤 Déploiement de la fonction make-server-2eb02e52...
echo.

supabase functions deploy make-server-2eb02e52

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ BACKEND DÉPLOYÉ AVEC SUCCÈS !
    echo.
    echo 🎉 Vous pouvez maintenant :
    echo    1. Recharger votre application (Ctrl+R)
    echo    2. Essayer de vous inscrire côté conducteur
    echo.
) else (
    echo.
    echo ❌ ÉCHEC DU DÉPLOIEMENT
    echo.
    echo 🔧 Vérifiez :
    echo    1. Que vous êtes connecté : supabase login
    echo    2. Que votre projet est lié : supabase link
    echo    3. Les logs d'erreur ci-dessus
    echo.
    pause
    exit /b 1
)

pause
