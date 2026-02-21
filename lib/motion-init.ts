/**
 * 🎭 MOTION INIT - Initialisation et vérification du module motion
 * 
 * Ce fichier doit être importé au démarrage de l'application
 * pour garantir que le module motion est correctement chargé
 */

import { motion, AnimatePresence } from './motion-polyfill';

/**
 * Vérifie que motion est correctement chargé
 * Lance une erreur si motion n'est pas disponible
 */
export function initMotion(): void {
  // Vérification 1: motion existe
  if (typeof motion === 'undefined' || motion === null) {
    console.error('❌ ERREUR CRITIQUE: motion est undefined ou null');
    throw new Error('Motion module failed to load');
  }

  // Vérification 2: motion.div existe
  if (typeof motion.div === 'undefined' || motion.div === null) {
    console.error('❌ ERREUR CRITIQUE: motion.div est undefined ou null');
    throw new Error('Motion.div component failed to load');
  }

  // Vérification 3: AnimatePresence existe
  if (typeof AnimatePresence === 'undefined' || AnimatePresence === null) {
    console.error('❌ ERREUR CRITIQUE: AnimatePresence est undefined ou null');
    throw new Error('AnimatePresence component failed to load');
  }

  // Vérification 4: motion.div est un composant React valide (object ou function)
  const componentType = typeof motion.div;
  if (componentType !== 'function' && componentType !== 'object') {
    console.error('❌ ERREUR CRITIQUE: motion.div n\'est ni fonction ni objet, type:', componentType);
    throw new Error(`Motion.div has invalid type: ${componentType}`);
  }

  // ✅ Vérification additionnelle: Vérifier que window.motion existe
  if (typeof window !== 'undefined') {
    // @ts-ignore
    if (typeof window.motion === 'undefined') {
      console.warn('⚠️ window.motion n\'est pas défini - Attaching it now');
      // @ts-ignore
      window.motion = motion;
      // @ts-ignore
      window.AnimatePresence = AnimatePresence;
    }
  }

  // ✅ Tout est OK
  console.log('✅ Motion module initialized successfully');
  console.log('✅ Motion.div type:', typeof motion.div);
  console.log('✅ Available motion components:', Object.keys(motion).slice(0, 10).join(', '), '...');
}

// Export motion pour faciliter l'import
export { motion, AnimatePresence };
