/**
 * ✨ RÉVÉLATION AU SCROLL — PAGES PUBLIQUES
 *
 * Le projet utilise `lib/motion-polyfill.tsx`, qui ignore volontairement les
 * props d'animation (`initial`, `whileInView`, …). Les pages vitrine qui
 * dépendaient de `motion` n'avaient donc aucune animation.
 *
 * Ce composant ajoute une révélation réelle, légère et globale :
 *  - chaque `<section>` et `<main>` des pages publiques est animé ;
 *  - tout élément marqué `data-reveal` est animé (avec `data-reveal-delay`) ;
 *  - les éléments déjà visibles au chargement ont une animation CSS immédiate ;
 *  - les éléments sous la ligne de flottaison sont révélés à l'entrée dans le
 *    viewport via IntersectionObserver ;
 *  - `prefers-reduced-motion` désactive totalement le système.
 *
 * Aucune dépendance : CSS + IntersectionObserver + MutationObserver (pour les
 * pages chargées en lazy et les contenus ajoutés après le montage).
 *
 * @version 1.0.0
 */

import { useLayoutEffect } from 'react';
import { useLocation } from '../../lib/simple-router';

const SELECTOR = 'section, main, [data-reveal]';

/** Routes qui ne sont pas des pages vitrine (applications connectées). */
function isAppRoute(pathname: string): boolean {
  return /^\/(app|admin|driver|auth)(\/|$)/.test(pathname);
}

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/** Éléments qui possèdent déjà leur propre animation locale. */
function hasLocalAnimation(el: Element): boolean {
  return (
    el.classList.contains('lk-reveal') ||
    el.classList.contains('reveal') ||
    el.classList.contains('reveal-left') ||
    el.classList.contains('reveal-right')
  );
}

export function ScrollRevealStyles() {
  return (
    <style>{`
      /* État initial : uniquement appliqué par JS, donc aucun contenu caché
         si JavaScript est indisponible. */
      [data-sc-reveal] {
        opacity: 0;
        transform: translate3d(0, 30px, 0);
        transition:
          opacity 0.7s cubic-bezier(0.22, 1, 0.36, 1),
          transform 0.7s cubic-bezier(0.22, 1, 0.36, 1);
        transition-delay: var(--sc-delay, 0s);
        will-change: opacity, transform;
      }

      [data-sc-reveal].sc-reveal-in {
        opacity: 1;
        transform: none;
        will-change: auto;
      }

      /* Élément déjà présent dans le viewport au chargement : animation
         immédiate, sans flash (l'état de départ est peint par l'animation). */
      [data-sc-reveal].sc-reveal-now {
        animation: scRevealUp 0.75s cubic-bezier(0.22, 1, 0.36, 1) both;
        animation-delay: var(--sc-delay, 0s);
      }

      @keyframes scRevealUp {
        from { opacity: 0; transform: translate3d(0, 30px, 0); }
        to   { opacity: 1; transform: none; }
      }

      @media (prefers-reduced-motion: reduce) {
        [data-sc-reveal] {
          opacity: 1 !important;
          transform: none !important;
          animation: none !important;
          transition: none !important;
        }
      }

      @media print {
        [data-sc-reveal] {
          opacity: 1 !important;
          transform: none !important;
          animation: none !important;
        }
      }
    `}</style>
  );
}

export function ScrollReveal() {
  const location = useLocation();

  useLayoutEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    if (isAppRoute(location.pathname)) return;
    if (prefersReducedMotion()) return;

    // Navigation interne : repartir en haut de la nouvelle page (le body est
    // le conteneur de défilement à cause de `height: 100%`). On laisse le
    // navigateur gérer les ancres explicites (#section).
    try {
      if (!window.location.hash) {
        const previous = document.body.style.scrollBehavior;
        document.body.style.scrollBehavior = 'auto';
        document.body.scrollTop = 0;
        document.documentElement.scrollTop = 0;
        if (window.scrollY) window.scrollTo(0, 0);
        document.body.style.scrollBehavior = previous;
      }
    } catch {}

    const getRoot = () => document.querySelector('.app-container') || document.body;
    const observed = new WeakSet<Element>();
    const revealed = new WeakSet<Element>();
    let scanTimer = 0;
    let scrollTimer = 0;
    const retryTimers: number[] = [];

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) reveal(entry.target as HTMLElement);
        });
      },
      { threshold: 0, rootMargin: '0px 0px -6% 0px' },
    );

    function reveal(el: HTMLElement) {
      if (!revealed.has(el)) {
        revealed.add(el);
        observer.unobserve(el);
      }
      // Réparation : un re-render React peut réécrire `className` et retirer
      // la classe ajoutée ici. On la remet sans rejouer l'animation.
      if (!el.classList.contains('sc-reveal-in')) {
        el.classList.add('sc-reveal-in');
      }
    }

    function register(el: Element) {
      if (!(el instanceof HTMLElement)) return;
      if (observed.has(el)) return;
      if (el.hasAttribute('data-sc-reveal')) return;
      if (el.closest('[data-no-reveal]')) return;
      if (hasLocalAnimation(el)) return;

      observed.add(el);

      const delay = el.getAttribute('data-reveal-delay');
      if (delay) el.style.setProperty('--sc-delay', delay);

      el.setAttribute('data-sc-reveal', '');

      const rect = el.getBoundingClientRect();
      const alreadyInView = rect.top < window.innerHeight * 0.94 && rect.bottom > 0;
      const aboveViewport = rect.bottom <= 0;

      if (alreadyInView || aboveViewport) {
        // L'animation CSS démarre dès la peinture, sans attendre un scroll.
        // `sc-reveal-in` garantit l'état final même après la fin de l'animation.
        el.classList.add('sc-reveal-now', 'sc-reveal-in');
        revealed.add(el);
      } else {
        observer.observe(el);
      }
    }

    /** Révèle tout élément déjà entré (ou dépassé) dans le viewport. */
    const revealEntered = () => {
      const pending = getRoot().querySelectorAll('[data-sc-reveal]:not(.sc-reveal-in)');
      pending.forEach((node) => {
        const rect = node.getBoundingClientRect();
        if (rect.bottom <= 0 || (rect.top < window.innerHeight * 0.94 && rect.bottom > 0)) {
          reveal(node as HTMLElement);
        }
      });
    };

    /** Vérifications différées : la mise en page peut changer après un appel
     *  réseau (carte, message d'erreur) sans nouveau défilement. */
    const layoutTimers: number[] = [];
    const scheduleLayoutChecks = (delays: number[]) => {
      layoutTimers.forEach((timer) => window.clearTimeout(timer));
      layoutTimers.length = 0;
      delays.forEach((ms) => layoutTimers.push(window.setTimeout(revealEntered, ms)));
    };

    const scan = () => {
      getRoot().querySelectorAll(SELECTOR).forEach(register);
      revealEntered();
    };

    // Scan immédiat (useLayoutEffect : avant peinture), puis relances de
    // sécurité pour les pages lazy montées après cet effet.
    scan();
    retryTimers.push(
      window.setTimeout(scan, 150),
      window.setTimeout(scan, 400),
      window.setTimeout(scan, 1000),
      window.setTimeout(scan, 2500),
    );
    scheduleLayoutChecks([3500, 6000]);

    // Les pages sont chargées en lazy : on écoute les ajouts de nœuds pour
    // animer les sections qui arrivent après le montage du composant.
    const mutationObserver = new MutationObserver((mutations) => {
      let shouldScan = false;

      for (const mutation of mutations) {
        if (mutation.type === 'attributes') {
          // React (ou un autre script) a réécrit la classe d'un élément déjà
          // révélé : on la restaure immédiatement, avant peinture.
          const el = mutation.target as HTMLElement;
          if (revealed.has(el) && !el.classList.contains('sc-reveal-in')) {
            el.classList.add('sc-reveal-in');
          }
          continue;
        }
        if (mutation.type === 'characterData') {
          shouldScan = true;
          break;
        }
        for (const node of Array.from(mutation.addedNodes)) {
          if (node.nodeType !== 1) continue;
          const el = node as Element;
          if (el.matches(SELECTOR) || el.querySelector(SELECTOR)) {
            shouldScan = true;
            break;
          }
        }
        if (shouldScan) break;
      }

      if (!shouldScan || scanTimer) return;
      scanTimer = window.setTimeout(() => {
        scanTimer = 0;
        scan();
      }, 50);
      scheduleLayoutChecks([300, 900, 1800]);
    });

    mutationObserver.observe(document.body, {
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['class'],
      subtree: true,
    });

    // Filet de sécurité : une vérification géométrique au défilement, même si
    // IntersectionObserver est throttlé (onglet en arrière-plan, navigateur
    // embarqué). Le body est le conteneur de défilement : on écoute en capture.
    const onScroll = () => {
      if (scrollTimer) return;
      scrollTimer = window.setTimeout(() => {
        scrollTimer = 0;
        revealEntered();
      }, 120);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('scroll', onScroll, { passive: true, capture: true });

    // Recalcule les éléments qui étaient masqués puis affichés (ex. retour
    // depuis un onglet en arrière-plan).
    const onPageShow = () => scan();
    window.addEventListener('pageshow', onPageShow);

    return () => {
      mutationObserver.disconnect();
      observer.disconnect();
      window.removeEventListener('pageshow', onPageShow);
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('scroll', onScroll, true);
      if (scanTimer) window.clearTimeout(scanTimer);
      if (scrollTimer) window.clearTimeout(scrollTimer);
      retryTimers.forEach((timer) => window.clearTimeout(timer));
      layoutTimers.forEach((timer) => window.clearTimeout(timer));

      document.querySelectorAll('[data-sc-reveal]').forEach((el) => {
        el.removeAttribute('data-sc-reveal');
        el.classList.remove('sc-reveal-in', 'sc-reveal-now');
        (el as HTMLElement).style.removeProperty('--sc-delay');
      });
    };
  }, [location.pathname]);

  return <ScrollRevealStyles />;
}
