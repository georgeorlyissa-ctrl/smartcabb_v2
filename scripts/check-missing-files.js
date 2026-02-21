#!/usr/bin/env node

/**
 * Script de vérification des fichiers manquants dans Git
 * Usage: node scripts/check-missing-files.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Vérification des fichiers critiques pour SmartCabb...\n');

// Liste des fichiers critiques
const criticalFiles = [
  'components/admin/AdminForgotPasswordScreen.tsx',
  'components/admin/QuickAdminSignup.tsx',
  'components/admin/AdminLoginScreen.tsx',
  'components/admin/AdminDashboard.tsx',
  'components/admin/AdminAccountSync.tsx',
  'components/admin/AdminQuickSetup.tsx',
  'components/admin/AdminLoginDiagnostic.tsx',
  'App.tsx',
  'lib/auth-service.ts',
  'lib/simple-router.tsx',
  'lib/toast.tsx',
];

const missingFiles = [];
const notInGit = [];
const existsLocal = [];

console.log('📋 Fichiers critiques:\n');

for (const file of criticalFiles) {
  const fullPath = path.join(process.cwd(), file);
  const exists = fs.existsSync(fullPath);
  
  if (!exists) {
    console.log(`❌ ${file} - MANQUANT localement`);
    missingFiles.push(file);
    continue;
  }
  
  // Vérifier si le fichier est suivi par Git
  try {
    execSync(`git ls-files --error-unmatch "${file}"`, { 
      stdio: 'pipe',
      cwd: process.cwd()
    });
    console.log(`✅ ${file} - OK (local + Git)`);
    existsLocal.push(file);
  } catch (error) {
    console.log(`⚠️  ${file} - Existe localement mais PAS dans Git`);
    notInGit.push(file);
  }
}

console.log('\n' + '='.repeat(60) + '\n');

// Résumé
console.log('📊 RÉSUMÉ:\n');
console.log(`✅ Fichiers OK: ${existsLocal.length}`);
console.log(`⚠️  Fichiers non suivis par Git: ${notInGit.length}`);
console.log(`❌ Fichiers manquants: ${missingFiles.length}\n`);

// Afficher les fichiers non suivis
if (notInGit.length > 0) {
  console.log('⚠️  FICHIERS À AJOUTER À GIT:\n');
  notInGit.forEach(file => console.log(`   - ${file}`));
  console.log('\n🔧 Pour les ajouter:\n');
  console.log('   git add ' + notInGit.join(' '));
  console.log('   git commit -m "fix: Ajout composants admin manquants"');
  console.log('   git push origin main\n');
}

// Afficher les fichiers manquants
if (missingFiles.length > 0) {
  console.log('❌ FICHIERS MANQUANTS (À RE-CRÉER):\n');
  missingFiles.forEach(file => console.log(`   - ${file}`));
  console.log('\n');
}

// Statut Git
console.log('📊 Statut Git:\n');
try {
  const status = execSync('git status --short', { 
    encoding: 'utf-8',
    cwd: process.cwd()
  });
  if (status.trim()) {
    console.log(status);
  } else {
    console.log('   (Aucun changement non commité)\n');
  }
} catch (error) {
  console.log('   Erreur lors de la lecture du statut Git\n');
}

// Conclusion
console.log('='.repeat(60) + '\n');

if (notInGit.length === 0 && missingFiles.length === 0) {
  console.log('✅ TOUS LES FICHIERS SONT CORRECTS !\n');
  console.log('🚀 Vous pouvez déployer en toute sécurité:\n');
  console.log('   git push origin main\n');
} else {
  console.log('⚠️  ACTION REQUISE\n');
  console.log('Suivez les instructions ci-dessus pour corriger les fichiers manquants.\n');
}

// Code de sortie
process.exit(notInGit.length > 0 || missingFiles.length > 0 ? 1 : 0);
