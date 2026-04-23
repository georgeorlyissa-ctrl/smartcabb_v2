/**
 * 🎭 MOTION POLYFILL - Polyfill global pour éviter "motion is not defined"
 * 
 * Ce fichier DOIT être importé en premier dans index.html ou main.tsx
 * pour garantir que motion est disponible globalement
 */

import React from 'react';

// Types pour les props motion
interface MotionProps {
  initial?: any;
  animate?: any;
  exit?: any;
  transition?: any;
  variants?: any;
  whileHover?: any;
  whileTap?: any;
  whileInView?: any;
  viewport?: any;
  layout?: boolean | string;
  layoutId?: string;
  drag?: boolean | 'x' | 'y';
  dragConstraints?: any;
  dragElastic?: number;
  dragMomentum?: boolean;
  onDragStart?: (event: any, info: any) => void;
  onDragEnd?: (event: any, info: any) => void;
  children?: React.ReactNode;
  [key: string]: any;
}

// Créer une factory pour chaque type d'élément HTML
const createMotionElement = (type: string) => {
  const Component = React.forwardRef<any, MotionProps>((props, ref) => {
    const {
      initial,
      animate,
      exit,
      transition,
      variants,
      whileHover,
      whileTap,
      whileInView,
      viewport,
      layout,
      layoutId,
      drag,
      dragConstraints,
      dragElastic,
      dragMomentum,
      onDragStart,
      onDragEnd,
      children,
      ...htmlProps
    } = props;

    // Créer l'élément HTML approprié sans les props d'animation
    return React.createElement(type, { ref, ...htmlProps }, children);
  });

  Component.displayName = `Motion${type.charAt(0).toUpperCase()}${type.slice(1)}`;
  return Component;
};

// Liste de tous les éléments HTML supportés
const motionElements = [
  'div', 'button', 'span', 'img', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'a', 'section', 'article', 'nav', 'header', 'footer', 'aside', 'main',
  'ul', 'ol', 'li', 'form', 'label', 'input', 'textarea', 'select',
  'table', 'thead', 'tbody', 'tr', 'td', 'th',
];

// Créer l'objet motion avec tous les composants
const createMotionObject = (): Record<string, React.ForwardRefExoticComponent<any>> => {
  const obj: Record<string, React.ForwardRefExoticComponent<any>> = {};
  
  motionElements.forEach(element => {
    obj[element] = createMotionElement(element);
  });
  
  return obj;
};

// AnimatePresence fallback
const AnimatePresenceFallback: React.FC<{
  children: React.ReactNode;
  mode?: 'wait' | 'sync' | 'popLayout';
  initial?: boolean;
  onExitComplete?: () => void;
}> = ({ children }) => {
  return <>{children}</>;
};

AnimatePresenceFallback.displayName = 'AnimatePresence';

// Créer et exporter l'objet motion
export const motion = createMotionObject();
export const AnimatePresence = AnimatePresenceFallback;

// Vérification immédiate après création
if (!motion || typeof motion !== 'object') {
  console.error('❌ ERREUR CRITIQUE: motion object n\'a pas pu être créé');
  throw new Error('Failed to create motion object');
}

if (!motion.div) {
  console.error('❌ ERREUR CRITIQUE: motion.div n\'existe pas');
  throw new Error('Failed to create motion.div component');
}

// Attacher au window pour accès global (protection contre tree-shaking)
if (typeof window !== 'undefined') {
  // @ts-ignore
  window.motion = motion;
  // @ts-ignore
  window.AnimatePresence = AnimatePresence;
  
  console.log('✅ Motion polyfill attaché au window global');
  console.log('✅ Motion.div type:', typeof motion.div);
  console.log('✅ Composants disponibles:', Object.keys(motion).length);
}

// Export par défaut
export default motion;
