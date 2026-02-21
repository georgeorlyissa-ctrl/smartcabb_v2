/**
 * 🔒 POST-INSTALL - Vérification version lucide-react
 * S'assure que lucide-react@0.263.1 est installé
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔍 Vérification de lucide-react...');

try {
  // Lire le package.json de lucide-react installé
  const lucidePackagePath = join(__dirname, 'node_modules', 'lucide-react', 'package.json');
  const lucidePackage = JSON.parse(readFileSync(lucidePackagePath, 'utf-8'));
  
  const installedVersion = lucidePackage.version;
  const expectedVersion = '0.263.1';
  
  console.log(`   Installé: ${installedVersion}`);
  console.log(`   Attendu:  ${expectedVersion}`);
  
  if (installedVersion !== expectedVersion) {
    console.error(`\n❌ ERREUR: Mauvaise version de lucide-react !`);
    console.error(`   Version installée: ${installedVersion}`);
    console.error(`   Version requise:   ${expectedVersion}`);
    console.error(`\n💡 Solution: Supprimer node_modules et réinstaller :`);
    console.error(`   rm -rf node_modules package-lock.json`);
    console.error(`   npm install --legacy-peer-deps\n`);
    process.exit(1);
  }
  
  console.log('✅ lucide-react@0.263.1 correctement installé\n');
} catch (e) {
  console.warn('⚠️ Impossible de vérifier lucide-react:', e.message);
  console.warn('   Continuer quand même...\n');
}
