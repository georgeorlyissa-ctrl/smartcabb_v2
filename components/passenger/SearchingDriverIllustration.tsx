/**
 * Illustration animée « Recherche d'un chauffeur disponible ».
 *
 * ⚠️ Animations en **CSS pur** (keyframes), volontairement pas via `motion` :
 * le projet utilise `lib/motion-polyfill.tsx`, qui ignore les props `animate`
 * (les animations framer-motion ne jouent donc pas dans l'app). Le CSS natif
 * fonctionne partout : Chrome/Android WebView, Safari/iOS, PWA et desktop.
 */

const STYLES = `
.sdr-root { position: relative; display: block; }
.sdr-svg { width: 100%; height: 100%; display: block; overflow: visible; }

/* Ondes concentriques autour du disque */
.sdr-ripple {
  position: absolute; inset: 0; border-radius: 9999px;
  border: 4px solid #0098ff; opacity: 0;
  animation: sdr-ripple 2.8s cubic-bezier(.22,.61,.36,1) infinite;
  will-change: transform, opacity;
}
.sdr-ripple--2 { border-color: #003d7a; animation-delay: 1.4s; }
@keyframes sdr-ripple {
  0%   { transform: scale(.96); opacity: .5; }
  70%  { opacity: .08; }
  100% { transform: scale(1.85); opacity: 0; }
}

/* Rotation lente de l'onde radar pointillée */
.sdr-spin-slow { transform-box: view-box; transform-origin: 100px 104px; animation: sdr-spin 26s linear infinite; }

/* Balayage radar */
.sdr-sweep { transform-box: view-box; transform-origin: 100px 104px; animation: sdr-spin 3.6s linear infinite; }

/* Véhicule : léger flottement */
.sdr-car { transform-box: fill-box; transform-origin: center; animation: sdr-bob 2.8s ease-in-out infinite; }
@keyframes sdr-bob {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-3.5px); }
}

/* Roues : rotation (visible grâce au moyeu en croix) */
.sdr-wheel { transform-box: fill-box; transform-origin: center; animation: sdr-spin 1.1s linear infinite; }

/* Ombre : rétrécit quand le véhicule monte */
.sdr-shadow { transform-box: fill-box; transform-origin: center; animation: sdr-shadow 2.8s ease-in-out infinite; }
@keyframes sdr-shadow {
  0%, 100% { transform: scaleX(1);   opacity: 1; }
  50%      { transform: scaleX(.9);  opacity: .7; }
}

/* Repère de localisation : petit saut + halo qui pulse */
.sdr-pin { transform-box: fill-box; transform-origin: bottom center; animation: sdr-pin-hop 2.8s ease-in-out infinite; }
@keyframes sdr-pin-hop {
  0%, 100% { transform: translateY(0) scale(1); }
  45%      { transform: translateY(-4px) scale(1.04); }
}
.sdr-pin-halo { transform-box: fill-box; transform-origin: center; animation: sdr-ping 2.8s ease-out infinite; }
@keyframes sdr-ping {
  0%        { transform: scale(.55); opacity: .5; }
  75%, 100% { transform: scale(1.7); opacity: 0; }
}

/* Véhicules détectés autour */
.sdr-dot { animation: sdr-dot 3.6s ease-in-out infinite; }
@keyframes sdr-dot {
  0%, 100% { opacity: .18; }
  50%      { opacity: .95; }
}

@keyframes sdr-spin { to { transform: rotate(360deg); } }

@media (prefers-reduced-motion: reduce) {
  .sdr-ripple, .sdr-spin-slow, .sdr-sweep, .sdr-car,
  .sdr-wheel, .sdr-shadow, .sdr-pin, .sdr-pin-halo, .sdr-dot {
    animation: none !important;
  }
}
`;

interface Props {
  /** Taille en pixels (le disque est carré). */
  size?: number;
  className?: string;
}

export function SearchingDriverIllustration({ size = 128, className = '' }: Props) {
  // Balayage radar reconstitué en éventail : le dégradé angulaire n'existe pas en
  // SVG, on empile donc de fines parts d'angle dont l'opacité croît jusqu'au bord
  // d'attaque (rendu « scanner »).
  const CX = 100;
  const CY = 104;
  const R = 98;
  const STEPS = 12;
  const SPAN = 5;
  const beams = Array.from({ length: STEPS }, (_, i) => {
    const a0 = ((-90 + i * SPAN) * Math.PI) / 180;
    const a1 = ((-90 + (i + 1) * SPAN) * Math.PI) / 180;
    const x0 = CX + R * Math.cos(a0);
    const y0 = CY + R * Math.sin(a0);
    const x1 = CX + R * Math.cos(a1);
    const y1 = CY + R * Math.sin(a1);
    return {
      d: `M${CX} ${CY} L${x0.toFixed(2)} ${y0.toFixed(2)} A${R} ${R} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)} Z`,
      opacity: Number((0.04 + 0.34 * Math.pow((i + 1) / STEPS, 1.7)).toFixed(3)),
    };
  });
  const edgeAngle = ((-90 + STEPS * SPAN) * Math.PI) / 180;
  const edgeX = (CX + R * Math.cos(edgeAngle)).toFixed(2);
  const edgeY = (CY + R * Math.sin(edgeAngle)).toFixed(2);

  return (
    <div className={`sdr-root ${className}`} style={{ width: size, height: size }}>
      <style>{STYLES}</style>

      {/* Ondes concentriques (hors SVG pour ne pas être rognées) */}
      <span className="sdr-ripple" aria-hidden="true" />
      <span className="sdr-ripple sdr-ripple--2" aria-hidden="true" />

      <svg
        className="sdr-svg"
        viewBox="0 0 200 200"
        role="img"
        aria-label="Recherche d'un véhicule disponible à proximité"
      >
        <defs>
          <radialGradient id="sdr-bg" cx="50%" cy="32%" r="76%">
            <stop offset="0%" stopColor="#F7FBFF" />
            <stop offset="50%" stopColor="#E1F0FF" />
            <stop offset="100%" stopColor="#BEDFFF" />
          </radialGradient>

          <linearGradient id="sdr-car" x1="0.1" y1="0" x2="0.9" y2="1">
            <stop offset="0%" stopColor="#43B2FF" />
            <stop offset="40%" stopColor="#0098FF" />
            <stop offset="100%" stopColor="#0055B4" />
          </linearGradient>

          <linearGradient id="sdr-glass" x1="0" y1="0" x2="0.25" y2="1">
            <stop offset="0%" stopColor="#F4FCFF" />
            <stop offset="100%" stopColor="#A9D5FF" />
          </linearGradient>

          <linearGradient id="sdr-glow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#003D7A" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#003D7A" stopOpacity="0" />
          </linearGradient>

          <linearGradient id="sdr-pin" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFE45C" />
            <stop offset="100%" stopColor="#FFC400" />
          </linearGradient>

          <clipPath id="sdr-clip">
            <circle cx="100" cy="100" r="96" />
          </clipPath>
        </defs>

        {/* Fond */}
        <circle cx="100" cy="100" r="96" fill="url(#sdr-bg)" />

        {/* Radar (rogné au disque) */}
        <g clipPath="url(#sdr-clip)">
          <g className="sdr-spin-slow">
            <circle
              cx="100" cy="104" r="74" fill="none" stroke="#6DBAFF"
              strokeWidth="2.2" strokeDasharray="3 10" opacity="0.4" strokeLinecap="round"
            />
          </g>
          <g className="sdr-sweep">
            {beams.map((b, i) => (
              <path key={i} d={b.d} fill="#3FA9FF" opacity={b.opacity} />
            ))}
            {/* Bord d'attaque du scanner */}
            <path
              d={`M${CX} ${CY} L${edgeX} ${edgeY}`}
              stroke="#8FD0FF"
              strokeWidth="1.8"
              strokeLinecap="round"
              opacity="0.55"
            />
          </g>
          {/* Véhicules détectés autour */}
          <g className="sdr-dot">
            <circle cx="48" cy="70" r="9" fill="#0098FF" opacity="0.16" />
            <circle cx="48" cy="70" r="4.5" fill="#0098FF" />
          </g>
          <g className="sdr-dot" style={{ animationDelay: '1.2s' }}>
            <circle cx="158" cy="132" r="8" fill="#0098FF" opacity="0.14" />
            <circle cx="158" cy="132" r="4" fill="#0098FF" />
          </g>
        </g>

        {/* Repère de localisation */}
        <g className="sdr-pin">
          <circle className="sdr-pin-halo" cx="152" cy="46" r="16" fill="#0098FF" opacity="0.25" />
          <path
            d="M152 32a11 11 0 0 0-11 11c0 7.9 11 18.5 11 18.5s11-10.6 11-18.5a11 11 0 0 0-11-11z"
            fill="url(#sdr-pin)" stroke="#FFFFFF" strokeWidth="2.4" strokeLinejoin="round"
          />
          <circle cx="152" cy="43" r="3.8" fill="#003D7A" opacity="0.85" />
        </g>

        {/* Ombre au sol */}
        <ellipse className="sdr-shadow" cx="100" cy="150" rx="66" ry="9" fill="url(#sdr-glow)" />

        {/* Halo doux derrière le véhicule */}
        <ellipse cx="100" cy="118" rx="76" ry="34" fill="#FFFFFF" opacity="0.35" />

        {/* Véhicule */}
        <g className="sdr-car">
          <path
            d="M34 132v-14q0-8 10-10l30-7c10-15 22-21 34-21h14c15 0 25 7 31 19l6 9q9 2 9 12v12q0 4-4 4H38q-4 0-4-4z"
            fill="url(#sdr-car)"
          />
          <path d="M52 106c9-13 20-19 32-19h14c13 0 22 6 28 17l1.5 3H50.5z" fill="#FFFFFF" opacity="0.18" />
          <path d="M78 102c8-13 17-17 30-17h8c11 0 19 5 24 15l1 2z" fill="url(#sdr-glass)" />
          <path d="M108 85v17" stroke="#0B4B7F" strokeWidth="2.6" strokeLinecap="round" opacity="0.26" />
          <rect x="118" y="110" width="10" height="3.2" rx="1.6" fill="#FFFFFF" opacity="0.6" />
          <rect x="158" y="115" width="9" height="6" rx="3" fill="#FFD600" />
          <rect x="33" y="117" width="7" height="5" rx="2.5" fill="#FF7A6B" opacity="0.9" />

          {/* Roues (moyeu en croix pour rendre la rotation visible) */}
          <g>
            <circle cx="66" cy="134" r="15" fill="#152B44" />
            <g className="sdr-wheel">
              <circle cx="66" cy="134" r="7" fill="#DCE7F1" />
              <rect x="60.5" y="133.1" width="11" height="1.8" rx="0.9" fill="#9FB4C7" />
              <rect x="65.1" y="128.5" width="1.8" height="11" rx="0.9" fill="#9FB4C7" />
            </g>
            <circle cx="142" cy="134" r="15" fill="#152B44" />
            <g className="sdr-wheel">
              <circle cx="142" cy="134" r="7" fill="#DCE7F1" />
              <rect x="136.5" y="133.1" width="11" height="1.8" rx="0.9" fill="#9FB4C7" />
              <rect x="141.1" y="128.5" width="1.8" height="11" rx="0.9" fill="#9FB4C7" />
            </g>
          </g>
        </g>
      </svg>
    </div>
  );
}

export default SearchingDriverIllustration;
