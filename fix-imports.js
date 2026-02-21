#!/usr/bin/env node

/**
 * 🔧 Script de correction automatique des imports lucide-react → /lib/icons
 * Usage : node fix-imports.js
 */

const fs = require('fs');
const path = require('path');

let filesFixed = 0;
let errors = 0;

/**
 * Détermine le chemin relatif correct selon la profondeur du fichier
 */
function getCorrectImportPath(filePath) {
  // Compter les niveaux de profondeur depuis /components/
  const relativePath = filePath.replace(/^\//, ''); // Enlever le / initial
  const parts = relativePath.split('/');
  
  // components/File.tsx → '../lib/icons'
  // components/ui/File.tsx → '../../lib/icons'
  // components/admin/File.tsx → '../../lib/icons'
  
  if (parts.length === 2) {
    // components/*.tsx
    return "'../lib/icons'";
  } else {
    // components/**/*.tsx (sous-dossiers)
    return "'../../lib/icons'";
  }
}

/**
 * Corrige un fichier
 */
function fixFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Vérifier si le fichier contient 'lucide-react'
    if (!content.includes("from 'lucide-react'") && !content.includes('from "lucide-react"')) {
      return false; // Pas besoin de correction
    }
    
    const correctPath = getCorrectImportPath(filePath);
    
    // Remplacer les imports
    content = content.replace(/from ['"]lucide-react['"]/g, `from ${correctPath}`);
    
    // Écrire le fichier corrigé
    fs.writeFileSync(filePath, content, 'utf8');
    
    console.log(`✅ ${filePath}`);
    filesFixed++;
    return true;
  } catch (error) {
    console.error(`❌ Erreur sur ${filePath}:`, error.message);
    errors++;
    return false;
  }
}

/**
 * Parcourt récursivement un dossier
 */
function walkDir(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      walkDir(fullPath);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      fixFile(fullPath);
    }
  });
}

// Démarrer la correction
console.log('🚀 Début de la correction des imports lucide-react...\n');

const componentsDir = path.join(__dirname, 'components');
const pagesDir = path.join(__dirname, 'pages');

// Corriger /components/**/*.tsx
if (fs.existsSync(componentsDir)) {
  console.log('📁 Correction de /components/**/*.tsx...\n');
  walkDir(componentsDir);
}

// Corriger /pages/**/*.tsx
if (fs.existsSync(pagesDir)) {
  console.log('\n📁 Correction de /pages/**/*.tsx...\n');
  
  // Pour les pages, utiliser '../lib/icons'
  const pagesFiles = fs.readdirSync(pagesDir).filter(f => f.endsWith('.tsx') || f.endsWith('.ts'));
  pagesFiles.forEach(file => {
    const fullPath = path.join(pagesDir, file);
    try {
      let content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes("from 'lucide-react'") || content.includes('from "lucide-react"')) {
        content = content.replace(/from ['"]lucide-react['"]/g, "from '../lib/icons'");
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`✅ ${fullPath}`);
        filesFixed++;
      }
    } catch (error) {
      console.error(`❌ Erreur sur ${fullPath}:`, error.message);
      errors++;
    }
  });
}

console.log('\n' + '='.repeat(60));
console.log('✨ CORRECTION TERMINÉE !');
console.log('='.repeat(60));
console.log(`✅ Fichiers corrigés : ${filesFixed}`);
console.log(`❌ Erreurs : ${errors}`);
console.log('\n🚀 Prochaines étapes :');
console.log('  git add .');
console.log('  git commit -m "fix: replace all lucide-react imports with local /lib/icons"');
console.log('  git push origin main');
console.log('');
