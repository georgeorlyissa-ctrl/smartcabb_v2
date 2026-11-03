import { useEffect } from 'react';
import { BrandLoader } from './BrandLoader';

/**
 * Durées du splash.
 * - 1er chargement : le temps de charger les modules lazy.
 * - Chargements suivants (session) : très court, les assets sont en cache.
 */
const FIRST_LOAD_DELAY = 1200;
const FAST_LOAD_DELAY = 500;

/**
 * SplashScreen — écran d'ouverture.
 *
 * Volontairement minimaliste : il réutilise `BrandLoader`, donc **une seule
 * animation** (la barre de progression) et une identité visuelle identique
 * au preloader natif puis aux fallbacks de chargement. Les anciennes
 * animations concurrentes (halo, rivets, itinéraire, slogan en 2 phases)
 * ont été supprimées pour un démarrage plus rapide et plus sobre.
 */
export function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const isFast =
    typeof sessionStorage !== 'undefined' && sessionStorage.getItem('sc-splash-seen') === '1';

  useEffect(() => {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('sc-splash-seen', '1');
    }
    const timer = setTimeout(onComplete, isFast ? FAST_LOAD_DELAY : FIRST_LOAD_DELAY);
    return () => clearTimeout(timer);
  }, [onComplete, isFast]);

  return <BrandLoader />;
}
