/**
 * 🔍 CHECK ICONS - Vérifie les icônes lucide-react avant build
 * S'assure qu'aucune icône inexistante dans 0.263.1 n'est utilisée
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Icônes connues comme NON disponibles dans 0.263.1
const FORBIDDEN_ICONS = [
  'Route', // Utiliser Navigation à la place
  // Ajouter d'autres icônes problématiques ici
];

let errors = 0;
let filesChecked = 0;

function checkFile(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    
    // Chercher les imports de lucide-react
    const importRegex = /import\s+{([^}]+)}\s+from\s+['"]lucide-react['"]/g;
    let match;
    
    while ((match = importRegex.exec(content)) !== null) {
      const importedIcons = match[1]
        .split(',')
        .map(icon => icon.trim())
        .filter(icon => icon.length > 0);
      
      importedIcons.forEach(icon => {
        if (FORBIDDEN_ICONS.includes(icon)) {
          console.error(`❌ ERREUR: ${filePath}`);
          console.error(`   Icône interdite: "${icon}" (n'existe pas dans lucide-react@0.263.1)`);
          
          if (icon === 'Route') {
            console.error(`   💡 Solution: Utiliser "Navigation" à la place`);
          }
          
          errors++;
        }
      });
    }
  } catch (e) {
    // Ignorer les erreurs de lecture
  }
}

function walkDirectory(dir) {
  const files = readdirSync(dir);
  
  files.forEach(file => {
    const filePath = join(dir, file);
    const stat = statSync(filePath);
    
    if (stat.isDirectory()) {
      // Ignorer node_modules et autres dossiers système
      if (!file.startsWith('.') && file !== 'node_modules' && file !== 'dist') {
        walkDirectory(filePath);
      }
    } else if (extname(file) === '.tsx' || extname(file) === '.ts') {
      filesChecked++;
      checkFile(filePath);
    }
  });
}

console.log('🔍 Vérification des icônes lucide-react...\n');

// Vérifier tous les fichiers .tsx et .ts
walkDirectory(join(__dirname, 'components'));
walkDirectory(join(__dirname, 'pages'));

console.log(`\n✅ ${filesChecked} fichiers vérifiés`);

if (errors > 0) {
  console.error(`\n❌ ${errors} erreur(s) trouvée(s) !`);
  console.error('   Corrigez les icônes avant de build.\n');
  process.exit(1);
} else {
  console.log('✅ Aucune icône interdite trouvée - OK pour build\n');
  process.exit(0);
}
