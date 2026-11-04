import { useEffect } from 'react';
import { BrandLoader } from './BrandLoader';

/**
 * Durées du splash (première ouverture de la session).
 * - MIN : durée minimale pour que l'écran soit lisible (pas un flash).
 * - MAX : filet de sécurité si le réseau traîne.
 */
const FIRST_LOAD_MIN = 800;
const FIRST_LOAD_MAX = 2600;

/**
 * Préchauffe le module de la route courante pendant le splash.
 * Sans cela, le module lazy arrivait APRÈS le splash et déclenchait un
 * deuxième écran de chargement (le fallback Suspense) : c'est exactement
 * le « 2 ou 3 images de chargement » signalé en navigation.
 */
function warmRouteModule(): Promise<unknown> {
  const path = typeof window === 'undefined' ? '' : window.location.pathname;
  const load = () => {
    if (path === '/app' || path === '/app/') {
      return import('./LandingScreen');
    }
    if (path.startsWith('/app/driver') || path.startsWith('/driver/')) {
      return import('../pages/DriverApp');
    }
    if (path.startsWith('/app/admin') || path.startsWith('/admin/')) {
      return import('../pages/AdminApp');
    }
    if (path.startsWith('/app/passenger') || path.startsWith('/app')) {
      return import('../pages/PassengerApp');
    }
    return import('../pages/LandingPage');
  };
  try {
    return Promise.resolve(load()).catch(() => undefined);
  } catch {
    return Promise.resolve();
  }
}

/**
 * SplashScreen — écran d'ouverture, **au plus une fois par session**.
 *
 * C'est `AppRouter` qui décide de l'afficher (sessionStorage `sc-splash-seen`).
 * Ici on gère uniquement son temps d'affichage : on précharge la route en
 * cours pour que l'utilisateur ne voie jamais un deuxième écran de chargement
 * derrière le splash.
 *
 * Une seule animation : la barre de progression de `BrandLoader`.
 */
export function SplashScreen({ onComplete }: { onComplete: () => void }) {
  useEffect(() => {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('sc-splash-seen', '1');
    }

    const startedAt = Date.now();
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      onComplete();
    };

    const hardStop = setTimeout(finish, FIRST_LOAD_MAX);
    warmRouteModule().then(() => {
      const remaining = Math.max(0, FIRST_LOAD_MIN - (Date.now() - startedAt));
      setTimeout(finish, remaining);
    });

    return () => clearTimeout(hardStop);
  }, [onComplete]);

  return <BrandLoader />;
}
