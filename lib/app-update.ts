/**
 * Mise à jour forcée de l'application.
 *
 * Problème récurrent : un téléphone (ou un WebView Capacitor) conserve un
 * ancien Service Worker / Cache Storage qui sert d'anciens fichiers JS. Les
 * correctifs déployés ne sont alors jamais exécutés, alors que l'écran d'erreur
 * affiché, lui, vient du nouveau code.
 *
 * Ce module :
 *  1. désinscrit les Service Workers hérités et vide les caches ;
 *  2. force un rechargement en contournant le cache HTTP ;
 *  3. détecte un nouveau build (index-*.js différent) et s'auto-répare.
 */

/** Marqueur local pour ne purger qu'une fois par build. */
const CLEANUP_KEY = 'smartcabb_sw_cleanup_done';
const RELOAD_KEY = 'smartcabb_sw_reloaded';
const BUILD_REFRESH_KEY = 'smartcabb_build_refresh_at';

/** Supprime les Service Workers et le Cache Storage. */
export async function purgeRuntimeCaches(): Promise<void> {
  try {
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }
  } catch (error) {
    console.warn('⚠️ Désinscription Service Worker impossible:', error);
  }

  try {
    if (typeof caches !== 'undefined') {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
  } catch (error) {
    console.warn('⚠️ Vidage du cache impossible:', error);
  }
}

/** Recharge l'application sans servir de fichiers en cache. */
export function reloadWithoutCache(): void {
  try {
    const url = new URL(window.location.href);
    url.searchParams.set('_v', Date.now().toString(36));
    window.location.replace(url.toString());
  } catch {
    window.location.reload();
  }
}

/** Purge + rechargement, appelé par l'écran d'erreur. */
export async function forceAppUpdate(): Promise<void> {
  await purgeRuntimeCaches();
  reloadWithoutCache();
}

/**
 * À appeler une fois au démarrage : si un ancien Service Worker contrôle
 * encore la page, on le supprime et on recharge une seule fois pour que le
 * document ne soit plus servi depuis son cache.
 */
export async function releaseStaleServiceWorker(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;

  let hadController = false;
  let hadRegistrations = false;

  try {
    hadController = Boolean(navigator.serviceWorker.controller);
    const registrations = await navigator.serviceWorker.getRegistrations();
    hadRegistrations = registrations.length > 0;

    if (!hadController && !hadRegistrations) return;

    await purgeRuntimeCaches();
    console.log('🧹 Ancien Service Worker supprimé, caches vidés');
  } catch (error) {
    console.warn('⚠️ Nettoyage Service Worker impossible:', error);
    return;
  }

  try {
    // Un seul rechargement automatique par session, sinon on boucle.
    if (hadController && !sessionStorage.getItem(RELOAD_KEY)) {
      sessionStorage.setItem(RELOAD_KEY, '1');
      reloadWithoutCache();
    }
  } catch {
    // sessionStorage indisponible : on ne recharge pas pour éviter une boucle
  }
}

/**
 * Compare le bundle actuellement exécuté au bundle référencé par le serveur.
 * Si un nouveau déploiement est en ligne, on vide les caches et on recharge.
 */
export async function checkForNewBuild(): Promise<void> {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  try {
    const response = await fetch('/index.html', { cache: 'no-store' });
    if (!response.ok) return;

    const html = await response.text();
    const served = html.match(/assets\/index-[A-Za-z0-9_-]+\.js/);
    if (!served) return;

    const current = Array.from(document.querySelectorAll('script[src]'))
      .map((script) => script.getAttribute('src') || '')
      .find((src) => /assets\/index-/.test(src));

    if (!current || current.includes(served[0])) return;

    // Anti-boucle : au maximum un rechargement toutes les 60 secondes.
    const last = Number(sessionStorage.getItem(BUILD_REFRESH_KEY) || 0);
    if (last && Date.now() - last < 60_000) return;
    sessionStorage.setItem(BUILD_REFRESH_KEY, String(Date.now()));

    console.log('🔄 Nouveau build détecté — mise à jour automatique');
    await forceAppUpdate();
  } catch {
    // Hors ligne ou HTML indisponible : on ne fait rien
  }
}

/** Nettoyage unique par version (appelé au démarrage). */
export async function runStartupCacheCleanup(buildId: string): Promise<void> {
  try {
    if (localStorage.getItem(CLEANUP_KEY) === buildId) return;
    await purgeRuntimeCaches();
    localStorage.setItem(CLEANUP_KEY, buildId);
  } catch {
    // localStorage indisponible : on ne bloque jamais le démarrage
  }
}
