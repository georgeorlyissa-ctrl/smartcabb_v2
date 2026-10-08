import { useEffect } from 'react';
import { useLocation } from '../lib/simple-router';

const SITE = 'https://www.smartcabb.com';

interface SeoEntry {
  title: string;
  description: string;
  canonical: string;
  index: boolean;
}

// ─── SEO par route vitrine : 1 URL = 1 canonical = 1 title/description ──────
const SEO_MAP: Record<string, SeoEntry> = {
  '/': {
    title: 'SmartCabb — Taxi & VTC à Kinshasa | Réservez votre chauffeur',
    description:
      'SmartCabb est le service de taxi et VTC de référence à Kinshasa (RDC). Réservez un chauffeur professionnel en quelques secondes. Paiement Mobile Money (M-Pesa, Orange Money, Airtel Money). Disponible 24h/24.',
    canonical: `${SITE}/`,
    index: true,
  },
  '/services': {
    title: 'Nos Services Taxi & VTC à Kinshasa | Standard, Confort, Familiale, Business — SmartCabb',
    description:
      'Découvrez les services SmartCabb à Kinshasa : Standard économique, Confort premium, Familiale 6-7 places, Business VIP. Véhicules climatisés, chauffeurs vérifiés, Mobile Money accepté.',
    canonical: `${SITE}/services`,
    index: true,
  },
  '/drivers': {
    title: 'Devenir Chauffeur Taxi à Kinshasa | Rejoignez SmartCabb',
    description:
      'Devenez chauffeur partenaire SmartCabb à Kinshasa : revenus attractifs, planning flexible, application dédiée. Inscrivez-vous en quelques minutes et recevez vos premières courses.',
    canonical: `${SITE}/drivers`,
    index: true,
  },
  '/about': {
    title: 'À propos de SmartCabb | Taxi & VTC de confiance à Kinshasa',
    description:
      'SmartCabb, le service de transport avec chauffeur de référence à Kinshasa (RDC). Chauffeurs vérifiés, véhicules climatisés, paiement Mobile Money, disponible 24h/24.',
    canonical: `${SITE}/about`,
    index: true,
  },
  '/contact': {
    title: 'Contact SmartCabb Kinshasa | Réservation Taxi 24h/24',
    description:
      'Contactez SmartCabb à Kinshasa : réservation de taxi, support client, partenariats. Disponible 24h/24, 7j/7. Réponse rapide.',
    canonical: `${SITE}/contact`,
    index: true,
  },
  '/legal': {
    title: 'Mentions légales — SmartCabb',
    description: 'Mentions légales du service SmartCabb, taxi et VTC à Kinshasa (RDC).',
    canonical: `${SITE}/legal`,
    index: true,
  },
  '/privacy': {
    title: 'Politique de confidentialité — SmartCabb',
    description: 'Politique de confidentialité SmartCabb : collecte, utilisation et protection de vos données personnelles.',
    canonical: `${SITE}/privacy`,
    index: true,
  },
  '/terms': {
    title: "Conditions d'utilisation — SmartCabb",
    description: "Conditions générales d'utilisation du service de taxi et VTC SmartCabb à Kinshasa.",
    canonical: `${SITE}/terms`,
    index: true,
  },
};

function upsertMetaByName(name: string, content: string) {
  let el = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('name', name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertMetaByProperty(property: string, content: string) {
  let el = document.querySelector<HTMLMetaElement>(`meta[property="${property}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('property', property);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertCanonical(href: string) {
  let el = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

/** Met à jour title / description / canonical / robots à chaque changement de route. */
export function SeoHead() {
  const location = useLocation();

  useEffect(() => {
    const rawPath = location.pathname || '/';
    // Normalise : enlève le trailing slash (sauf racine)
    const path =
      rawPath.length > 1 && rawPath.endsWith('/') ? rawPath.slice(0, -1) : rawPath;

    const isPrivate =
      path.startsWith('/app') ||
      path.startsWith('/driver') ||
      path.startsWith('/admin') ||
      path.startsWith('/auth') ||
      path.startsWith('/track') ||
      path === '/account-deletion';

    const entry: SeoEntry | undefined = SEO_MAP[path];

    if (entry && !isPrivate) {
      document.title = entry.title;
      upsertMetaByName('description', entry.description);
      upsertCanonical(entry.canonical);
      upsertMetaByProperty('og:url', entry.canonical);
      upsertMetaByProperty('og:title', entry.title);
      upsertMetaByProperty('og:description', entry.description);
      upsertMetaByName('twitter:url', entry.canonical);
      upsertMetaByName('twitter:title', entry.title);
      upsertMetaByName('twitter:description', entry.description);
      upsertMetaByName('robots', 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');
      upsertMetaByName('googlebot', 'index, follow');
    } else if (isPrivate) {
      // Pages applicatives : jamais indexées (robots.txt les bloque déjà côté crawl)
      document.title = 'SmartCabb';
      upsertMetaByName('robots', 'noindex, nofollow');
      upsertMetaByName('googlebot', 'noindex, nofollow');
    } else {
      // 404 : contenu explicite + noindex (au lieu de renvoyer la homepage en 200 déguisé)
      document.title = 'Page introuvable (404) — SmartCabb';
      upsertMetaByName(
        'description',
        "La page demandée est introuvable. Retournez à l'accueil SmartCabb, taxi et VTC à Kinshasa."
      );
      upsertCanonical(`${SITE}/`);
      upsertMetaByName('robots', 'noindex, nofollow');
      upsertMetaByName('googlebot', 'noindex, nofollow');
    }
  }, [location.pathname]);

  return null;
}
