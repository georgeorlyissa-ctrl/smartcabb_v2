// ═══════════════════════════════════════════════════════════════════════════
//  SMARTCABB — CONFIGURATION DE LA MARQUE
//  Modifiez ce fichier pour personnaliser le logo de l'application
// ═══════════════════════════════════════════════════════════════════════════

/**
 * URL de votre logo personnalisé.
 *
 * ┌─ COMMENT UTILISER VOTRE PROPRE LOGO ─────────────────────────────────────┐
 * │                                                                           │
 * │  OPTION 1 — Logo depuis le dossier /public/ (RECOMMANDÉ)                 │
 * │  ──────────────────────────────────────────────────────                   │
 * │  1. Copiez votre fichier logo (PNG, JPG, SVG, WebP) dans le dossier :    │
 * │       smartcabb_v2/public/                                                │
 * │  2. Remplacez la valeur ci-dessous par le nom de votre fichier :          │
 * │       export const BRAND_LOGO_URL = '/mon-logo.png';                      │
 * │                                                                           │
 * │  OPTION 2 — Logo hébergé en ligne                                         │
 * │  ────────────────────────────────                                          │
 * │       export const BRAND_LOGO_URL = 'https://monsite.com/logo.png';       │
 * │                                                                           │
 * │  OPTION 3 — Désactiver (utilise le logo SVG intégré)                      │
 * │  ───────────────────────────────────────────────────                       │
 * │       export const BRAND_LOGO_URL = null;                                 │
 * │                                                                           │
 * └───────────────────────────────────────────────────────────────────────────┘
 *
 * ⚠️  NOTE : Le fichier logo-smartcabb.jpeg est dans /public/ par défaut.
 *     Remplacez-le par votre propre image ou changez la valeur ci-dessous.
 */
export const BRAND_LOGO_URL: string | null = '/logo-smartcabb.jpeg';

// ─── Nom & slogans ────────────────────────────────────────────────────────────
export const BRAND_NAME = 'SmartCabb';
export const BRAND_TAGLINE_FR = 'Transport intelligent';
export const BRAND_TAGLINE_EN = 'Smart transport';

// ─── Couleurs primaires (utilisées comme fallback si pas de logo) ─────────────
export const BRAND_COLOR_PRIMARY = '#003D7A';   // Bleu marine
export const BRAND_COLOR_ACCENT  = '#0098FF';   // Cyan/Bleu vif
export const BRAND_COLOR_YELLOW  = '#FFD600';   // Jaune
