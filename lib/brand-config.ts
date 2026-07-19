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
export const BRAND_LOGO_URL = '/logo-smartcabb.jpeg';

// ─── Nom & slogans ────────────────────────────────────────────────────────────
export const BRAND_NAME = 'SmartCabb';
export const BRAND_TAGLINE_FR = 'Transport intelligent';
export const BRAND_TAGLINE_EN = 'Smart transport';

// ─── Couleurs de la marque (Charte graphique SmartCabb) ───────────────────────
export const BRAND_COLOR_PRIMARY = '#007AFF';   // Bleu Principal — confiance, sécurité
export const BRAND_COLOR_ACCENT  = '#FFCC00';   // Jaune Secondaire — vivacité, CTA
export const BRAND_COLOR_BG      = '#E0E0E0';   // Gris Clair — arrière-plans
export const BRAND_COLOR_TEXT    = '#222222';   // Noir — texte principal
