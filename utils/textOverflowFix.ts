/**
 * 🔧 Text Overflow Fix Utilities
 * Utilitaires pour éviter les superpositions de textes sur mobile
 * Date: 01 Décembre 2024
 */

/**
 * Classes Tailwind recommandées pour éviter les superpositions
 */
export const OVERFLOW_FIX_CLASSES = {
  // Pour les conteneurs flex
  flexContainer: 'flex-1 min-w-0',
  
  // Pour les éléments qui ne doivent pas rétrécir (icônes, boutons)
  noShrink: 'flex-shrink-0',
  
  // Pour les textes longs
  textTruncate: 'truncate',
  
  // Pour permettre le scroll horizontal si nécessaire
  horizontalScroll: 'overflow-x-auto',
  
  // Combinaison complète pour un élément texte dans un flex
  safeText: 'flex-1 min-w-0 truncate',
  
  // Combinaison pour un conteneur avec icône et texte
  iconTextContainer: 'flex items-center space-x-2 min-w-0',
  
  // Pour les icônes dans un flex avec texte
  safeIcon: 'flex-shrink-0 w-5 h-5'
};

/**
 * Applique les classes de protection contre overflow à un élément
 * @param elementType - Type d'élément ('text', 'icon', 'container')
 * @returns Classes Tailwind appropriées
 */
export function getOverflowSafeClasses(elementType: 'text' | 'icon' | 'container'): string {
  switch (elementType) {
    case 'text':
      return OVERFLOW_FIX_CLASSES.safeText;
    case 'icon':
      return OVERFLOW_FIX_CLASSES.safeIcon;
    case 'container':
      return OVERFLOW_FIX_CLASSES.iconTextContainer;
    default:
      return '';
  }
}

/**
 * Vérifie si un élément a besoin de protection contre overflow
 * @param hasFlexParent - Si l'élément est dans un conteneur flex
 * @param hasLongText - Si l'élément contient du texte long
 * @param isIcon - Si l'élément est une icône
 * @returns Classes à ajouter
 */
export function checkOverflowProtection(
  hasFlexParent: boolean,
  hasLongText: boolean,
  isIcon: boolean
): string {
  const classes: string[] = [];
  
  if (hasFlexParent && hasLongText) {
    classes.push(OVERFLOW_FIX_CLASSES.flexContainer);
    classes.push(OVERFLOW_FIX_CLASSES.textTruncate);
  }
  
  if (hasFlexParent && isIcon) {
    classes.push(OVERFLOW_FIX_CLASSES.noShrink);
  }
  
  return classes.join(' ');
}

/**
 * Pattern recommandé pour card avec icône et texte
 */
export const CARD_WITH_ICON_PATTERN = `
<div className="flex items-center space-x-3 min-w-0">
  <div className="w-10 h-10 flex-shrink-0">
    {/* Icône */}
  </div>
  <div className="flex-1 min-w-0">
    <h3 className="truncate">{title}</h3>
    <p className="text-sm truncate">{description}</p>
  </div>
</div>
`;

/**
 * Liste des composants qui ont été corrigés
 */
export const FIXED_COMPONENTS = [
  'RideScreen.tsx - Carte du chauffeur',
  'RideScreen.tsx - Infos véhicule',
  'DriverDashboard.tsx - Header',
  'DriverDashboard.tsx - Stats cards (4 cartes)',
  'DriverDashboard.tsx - Vehicle Info',
  'DriverProfileScreen.tsx - Photo et stats',
  'DriverProfileScreen.tsx - Localisation',
  'ProfileScreen.tsx - Photo et infos',
  'ProfileScreen.tsx - Champs de profil (4 champs)'
];

/**
 * Export des correctifs appliqués
 */
export const TEXT_OVERFLOW_FIXES_APPLIED = {
  date: '2024-12-01',
  version: '1.0.0',
  components: FIXED_COMPONENTS,
  totalFixes: 9,
  filesModified: 4
};
