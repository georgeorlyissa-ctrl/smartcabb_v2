import { BrandLoader } from './BrandLoader';

interface LoadingScreenProps {
  message?: string;
}

/**
 * LoadingScreen — fallback de chargement (Suspense, données, session).
 *
 * Réutilise l'écran de chargement unique `BrandLoader` : même visuel et
 * même animation que le preloader natif et le splash. Plus de spinner
 * concurrent, plus de double animation.
 */
export function LoadingScreen({ message }: LoadingScreenProps) {
  return <BrandLoader message={message} />;
}
