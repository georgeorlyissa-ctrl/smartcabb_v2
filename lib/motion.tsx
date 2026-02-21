/**
 * 🎭 MOTION - WRAPPER LOCAL POUR FRAMER MOTION
 * 
 * Implémentation locale pour éviter les erreurs de build avec motion/react
 * Utilise des composants React simples comme fallback
 * 
 * ⚠️ IMPORTANT: Ce fichier remplace motion/react dans l'architecture standalone
 */

// Ré-exporter depuis le polyfill qui est chargé en premier dans main.tsx
export { motion, AnimatePresence } from './motion-polyfill';

// Aussi exporter par défaut pour compatibilité
import { motion as motionObject } from './motion-polyfill';
export default motionObject;
