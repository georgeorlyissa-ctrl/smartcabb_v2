/**
 * 🛡️ GARDE-FOU INTERSECTIONOBSERVER
 *
 * Début 2026, Google Maps JS (v3.66) appelle `IntersectionObserver.observe()`
 * avec une cible `null` dans certains cas sur iOS/Safari : la carte s'affiche
 * puis une exception asynchrone est levée :
 *
 *   TypeError: Argument 1 ('target') to IntersectionObserver.observe must be
 *   an instance of Element
 *
 * Cette exception provient du script Google (maps.googleapis.com), n'empêche
 * PAS la carte de fonctionner, mais déclenche notre overlay d'erreur global —
 * un écran rouge technique incompréhensible pour un passager.
 *
 * On protège donc la méthode `observe` (et `unobserve`) au niveau du
 * prototype : une cible invalide est ignorée silencieusement au lieu de lever
 * une exception. Les appels valides ne sont pas modifiés.
 *
 * ⚠️ À installer très tôt (main.tsx) pour être en place avant le chargement
 * du script Google Maps.
 */

let installed = false;

export function installSafeIntersectionObserver(): void {
  if (installed) return;
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (typeof IntersectionObserver === 'undefined') return;

  const proto: any = IntersectionObserver.prototype;
  if (!proto || proto.__smartcabbSafeObserve) {
    installed = true;
    return;
  }

  // Un Element a nodeType === 1 (fonctionne aussi pour un élément provenant
  // d'une iframe, contrairement à `instanceof Element`).
  const isObservableElement = (target: any): boolean =>
    !!target && typeof target === 'object' && target.nodeType === 1;

  const nativeObserve = proto.observe;
  const nativeUnobserve = proto.unobserve;

  proto.observe = function patchedObserve(target: any) {
    if (!isObservableElement(target)) {
      console.warn(
        '⚠️ IntersectionObserver.observe ignoré : cible non-Element (librairie tierce)'
      );
      return;
    }
    try {
      return nativeObserve.call(this, target);
    } catch (err) {
      console.warn('⚠️ IntersectionObserver.observe a échoué (ignoré):', err);
    }
  };

  if (typeof nativeUnobserve === 'function') {
    proto.unobserve = function patchedUnobserve(target: any) {
      if (!isObservableElement(target)) return;
      try {
        return nativeUnobserve.call(this, target);
      } catch {
        // ignore
      }
    };
  }

  Object.defineProperty(proto, '__smartcabbSafeObserve', {
    value: true,
    enumerable: false,
  });

  installed = true;
  console.log('✅ Garde-fou IntersectionObserver installé');
}
