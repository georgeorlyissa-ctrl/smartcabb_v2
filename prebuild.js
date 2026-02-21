/**
 * 🔥 PREBUILD v517.9 - NETTOYAGE CACHE AVANT BUILD
 * Force un rebuild complet sans cache
 */

import { rmSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🧹 v517.9: Nettoyage du cache avant build...');

// Supprimer tous les dossiers de cache
const cacheDirs = [
  '.vite',
  '.vite-cache-517-9',
  'node_modules/.vite',
  'node_modules/.cache',
  'dist',
];

let cleaned = 0;
cacheDirs.forEach(dir => {
  const fullPath = join(__dirname, dir);
  if (existsSync(fullPath)) {
    try {
      rmSync(fullPath, { recursive: true, force: true });
      console.log(`✅ Supprimé: ${dir}`);
      cleaned++;
    } catch (e) {
      console.warn(`⚠️ Impossible de supprimer ${dir}:`, e.message);
    }
  }
});

console.log(`✅ ${cleaned} dossiers de cache supprimés`);
console.log('🚀 Prêt pour un build propre avec lucide-react@0.263.1');
