#!/bin/bash
# Script de mise à jour en masse des imports react-router-dom

# Liste des fichiers à mettre à jour
FILES=(
  "components/admin/AdminLoginScreen.tsx"
  "components/admin/AdminRegisterScreen.tsx"
  "components/auth/ForgotPasswordPage.tsx"
  "components/auth/ResetPasswordByPhonePage.tsx"
  "components/auth/ResetPasswordPage.tsx"
  "components/driver/DriverRegistrationScreen.tsx"
  "components/driver/DriverWelcomeScreen.tsx"
  "components/passenger/LoginScreen.tsx"
  "components/passenger/RegisterScreen.tsx"
  "components/passenger/WelcomeScreen.tsx"
  "pages/AboutPage.tsx"
  "pages/ContactPage.tsx"
  "pages/DriversLandingPage.tsx"
  "pages/LegalPage.tsx"
  "pages/PrivacyPage.tsx"
  "pages/ServicesPage.tsx"
  "pages/TermsPage.tsx"
)

echo "Remplacement des imports react-router-dom dans ${#FILES[@]} fichiers..."

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "Mise à jour: $file"
    # Remplacer les imports
    sed -i "s|from 'react-router-dom'|from '../lib/simple-router'|g" "$file"
    sed -i "s|from \"react-router-dom\"|from \"../lib/simple-router\"|g" "$file"
    sed -i "s|from '../../lib/simple-router'|from '../../lib/simple-router'|g" "$file"
  else
    echo "⚠️  Fichier non trouvé: $file"
  fi
done

echo "✅ Mise à jour terminée!"
