import { BRAND_LOGO_URL, BRAND_NAME } from '../lib/brand-config';

interface SmartCabbLogoProps {
  className?: string;
  size?: 'small' | 'medium' | 'large';
  /** Affiche uniquement l'image sans fond circulaire */
  plain?: boolean;
}

/**
 * SmartCabbLogo
 *
 * Affiche le logo de l'application.
 *  - Si BRAND_LOGO_URL est défini dans lib/brand-config.ts → affiche l'image
 *  - Sinon → affiche le logo SVG par défaut (voiture jaune sur fond bleu)
 *
 * Pour mettre votre propre logo :
 *   1. Copiez votre image dans smartcabb_v2/public/  (ex: mon-logo.png)
 *   2. Dans lib/brand-config.ts, changez :
 *        export const BRAND_LOGO_URL = '/mon-logo.png';
 */
export function SmartCabbLogo({ className, size = 'medium', plain = false }: SmartCabbLogoProps) {
  const sizeClasses = {
    small:  'w-10 h-10',
    medium: 'w-20 h-20',
    large:  'w-32 h-32',
  };

  const finalClassName = className || sizeClasses[size];

  // ── Image personnalisée ───────────────────────────────────────────────────
  if (BRAND_LOGO_URL) {
    if (plain) {
      return (
        <img
          src={BRAND_LOGO_URL}
          alt={BRAND_NAME}
          className={`${finalClassName} object-contain`}
          onError={(e) => {
            // Fallback vers le SVG si l'image ne charge pas
            const target = e.currentTarget;
            target.style.display = 'none';
            const svg = target.nextElementSibling as HTMLElement | null;
            if (svg) svg.style.display = 'block';
          }}
        />
      );
    }

    return (
      <div className={`${finalClassName} rounded-2xl overflow-hidden flex items-center justify-center bg-white shadow-md`}>
        <img
          src={BRAND_LOGO_URL}
          alt={BRAND_NAME}
          className="w-full h-full object-contain"
          onError={(e) => {
            // Fallback : remplace l'image par les initiales de la marque
            const parent = e.currentTarget.parentElement;
            if (parent) {
              parent.style.background = 'linear-gradient(135deg, #003D7A, #0098FF)';
              e.currentTarget.style.display = 'none';
              const span = document.createElement('span');
              span.textContent = 'SC';
              span.style.cssText = 'color:white;font-size:1.2rem;font-weight:900;letter-spacing:-1px';
              parent.appendChild(span);
            }
          }}
        />
      </div>
    );
  }

  // ── Logo SVG par défaut ───────────────────────────────────────────────────
  return (
    <svg
      viewBox="0 0 100 100"
      className={finalClassName}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background Circle - Navy Blue */}
      <circle cx="50" cy="50" r="48" fill="#003D7A" />

      {/* Accent Ring - Cyan */}
      <circle cx="50" cy="50" r="44" fill="none" stroke="#0098FF" strokeWidth="2" />

      {/* Car Body - Yellow */}
      <path
        d="M 30 55 L 32 45 Q 35 40 40 40 L 60 40 Q 65 40 68 45 L 70 55 Q 72 58 70 60 L 68 62 Q 65 63 62 62 L 60 60 L 40 60 L 38 62 Q 35 63 32 62 L 30 60 Q 28 58 30 55 Z"
        fill="#FFD600"
      />

      {/* Car Windows - Navy Blue */}
      <path d="M 38 45 L 40 42 L 48 42 L 48 50 L 38 50 Z" fill="#003D7A" />
      <path d="M 52 42 L 60 42 L 62 45 L 62 50 L 52 50 Z" fill="#003D7A" />

      {/* Front Light - Cyan */}
      <circle cx="32" cy="56" r="2" fill="#0098FF" />

      {/* Back Light - Cyan */}
      <circle cx="68" cy="56" r="2" fill="#0098FF" />

      {/* Wheels - White */}
      <circle cx="38" cy="62" r="3.5" fill="white" />
      <circle cx="62" cy="62" r="3.5" fill="white" />

      {/* Wheel Centers - Navy */}
      <circle cx="38" cy="62" r="1.5" fill="#003D7A" />
      <circle cx="62" cy="62" r="1.5" fill="#003D7A" />

      {/* Speed Lines - Cyan */}
      <line x1="20" y1="48" x2="28" y2="48" stroke="#0098FF" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="22" y1="53" x2="28" y2="53" stroke="#0098FF" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="24" y1="58" x2="28" y2="58" stroke="#0098FF" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
