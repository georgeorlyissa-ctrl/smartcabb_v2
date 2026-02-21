/**
 * Configuration pour ignorer certains modules problématiques dans esbuild
 * Ces modules ne sont pas utilisés dans l'app mais causent des erreurs de build
 */

export const IGNORED_MODULES = [
  '@radix-ui/react-accordion',
  '@radix-ui/react-alert-dialog',
  '@radix-ui/react-aspect-ratio',
  '@radix-ui/react-avatar',
  '@radix-ui/react-collapsible',
  '@radix-ui/react-context-menu',
  '@radix-ui/react-dropdown-menu',
  '@radix-ui/react-hover-card',
  '@radix-ui/react-menubar',
  '@radix-ui/react-navigation-menu',
  '@radix-ui/react-progress',
  '@radix-ui/react-radio-group',
  '@radix-ui/react-slider',
  '@radix-ui/react-toggle',
  '@radix-ui/react-toggle-group',
  '@radix-ui/react-tooltip',
  '@firebase/util',
  'clsx',
  'tailwind-merge'
];
