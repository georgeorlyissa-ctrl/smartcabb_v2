import { useEffect, useState } from 'react';
import { BrandLoader } from './BrandLoader';

/**
 * DeferredLoading — fallback de `Suspense` qui n'affiche l'écran de
 * chargement que si le module met vraiment du temps à arriver.
 *
 * Objectif produit : **un seul écran de chargement par ouverture**.
 * Aujourd'hui, naviguer d'une page à l'autre affichait parfois 2 ou 3 écrans
 * de chargement successifs (splash → fallback Suspense → écran de données),
 * ce qui donnait une impression de lourdeur.
 *
 * Avec ce composant :
 * - chunk déjà en cache (cas normal) → 0 ms → **rien ne s'affiche** ;
 * - chunk lent (> `delay`) → l'écran SmartCabb s'affiche, identique au
 *   preloader natif et au splash, donc toujours la même image.
 */
export function DeferredLoading({ delay = 400 }: { delay?: number }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return show ? <BrandLoader /> : null;
}
