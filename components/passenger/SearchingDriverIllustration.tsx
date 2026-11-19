/**
 * Illustration animée « Recherche d'un chauffeur disponible ».
 *
 * ⚠️ Animations en **CSS pur** (keyframes), volontairement pas via `motion` :
 * le projet utilise `lib/motion-polyfill.tsx`, qui ignore les props `animate`
 * (les animations framer-motion ne jouent donc pas dans l'app). Le CSS natif
 * fonctionne partout : Chrome/Android WebView, Safari/iOS, PWA et desktop.
 *
 * Deux variantes :
 *  - `map` (par défaut) : vue de dessus, plan de quartier, plusieurs véhicules,
 *    repère et itinéraire pointillé — lecture « je vois la zone autour de moi ».
 *  - `car` : gros plan 3/4 sur le véhicule, plus simple et plus « produit ».
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

/* Balayage radar (rotation autour d'un point du viewBox) */
.sdr-sweep    { transform-box: view-box; transform-origin: 100px 104px; animation: sdr-spin 3.6s linear infinite; }
.sdr-spin-slow{ transform-box: view-box; transform-origin: 100px 104px; animation: sdr-spin 26s linear infinite; }
@keyframes sdr-spin { to { transform: rotate(360deg); } }

/* Véhicule en gros plan */
.sdr-car { transform-box: fill-box; transform-origin: center; animation: sdr-bob 2.8s ease-in-out infinite; }
@keyframes sdr-bob {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-3.5px); }
}
.sdr-wheel { transform-box: fill-box; transform-origin: center; animation: sdr-spin 1.1s linear infinite; }
.sdr-shadow { transform-box: fill-box; transform-origin: center; animation: sdr-shadow 2.8s ease-in-out infinite; }
@keyframes sdr-shadow {
  0%, 100% { transform: scaleX(1);  opacity: 1; }
  50%      { transform: scaleX(.9); opacity: .7; }
}

/* Repère de localisation */
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

/* Points « véhicules détectés » */
.sdr-dot { animation: sdr-dot 3.6s ease-in-out infinite; }
@keyframes sdr-dot {
  0%, 100% { opacity: .18; }
  50%      { opacity: .95; }
}

/* Plan de quartier : véhicules qui circulent */
.sdr-drift-a { animation: sdr-drift-a 8s ease-in-out infinite; }
@keyframes sdr-drift-a {
  0%, 100% { transform: translateX(0); }
  50%      { transform: translateX(-16px); }
}
.sdr-drift-b { animation: sdr-drift-b 9s ease-in-out infinite; }
@keyframes sdr-drift-b {
  0%, 100% { transform: translateX(0); }
  50%      { transform: translateX(-10px); }
}
.sdr-drift-c { animation: sdr-drift-c 10s ease-in-out infinite; }
@keyframes sdr-drift-c {
  0%, 100% { transform: translateX(0); }
  50%      { transform: translateX(12px); }
}

/* Halo + sonar du véhicule mis en avant */
.sdr-glow { transform-box: fill-box; transform-origin: center; animation: sdr-glow 2.8s ease-in-out infinite; }
@keyframes sdr-glow {
  0%, 100% { transform: scale(.92); opacity: .8; }
  50%      { transform: scale(1.12); opacity: 1; }
}
.sdr-sonar { transform-box: fill-box; transform-origin: center; animation: sdr-sonar 2.8s ease-out infinite; }
@keyframes sdr-sonar {
  0%        { transform: scale(.45); opacity: .55; }
  75%, 100% { transform: scale(1.8); opacity: 0; }
}

/* Itinéraire pointillé (chenillard) */
.sdr-route { animation: sdr-route 1.4s linear infinite; }
@keyframes sdr-route { to { stroke-dashoffset: -20; } }

@media (prefers-reduced-motion: reduce) {
  .sdr-ripple, .sdr-spin-slow, .sdr-sweep, .sdr-car, .sdr-wheel, .sdr-shadow,
  .sdr-pin, .sdr-pin-halo, .sdr-dot, .sdr-drift-a, .sdr-drift-b, .sdr-drift-c,
  .sdr-glow, .sdr-sonar, .sdr-route {
    animation: none !important;
  }
}
`;

interface Props {
  /** Taille en pixels (le disque est carré). */
  size?: number;
  className?: string;
  /** `map` : plan de quartier vu de dessus (défaut). `car` : gros plan véhicule. */
  variant?: 'map' | 'car';
}

/** Éventail radar : dégradé angulaire reconstitué par empilement de parts. */
function buildBeams(cx: number, cy: number, r: number, maxOpacity: number) {
  const STEPS = 12;
  const SPAN = 5;
  const beams = Array.from({ length: STEPS }, (_, i) => {
    const a0 = ((-90 + i * SPAN) * Math.PI) / 180;
    const a1 = ((-90 + (i + 1) * SPAN) * Math.PI) / 180;
    const x0 = cx + r * Math.cos(a0);
    const y0 = cy + r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a1);
    const y1 = cy + r * Math.sin(a1);
    return {
      d: `M${cx} ${cy} L${x0.toFixed(2)} ${y0.toFixed(2)} A${r} ${r} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)} Z`,
      opacity: Number((0.04 + maxOpacity * Math.pow((i + 1) / STEPS, 1.7)).toFixed(3)),
    };
  });
  const edgeAngle = ((-90 + STEPS * SPAN) * Math.PI) / 180;
  return {
    beams,
    edge: {
      x: (cx + r * Math.cos(edgeAngle)).toFixed(2),
      y: (cy + r * Math.sin(edgeAngle)).toFixed(2),
      cx,
      cy,
    },
  };
}

export function SearchingDriverIllustration({ size = 128, className = '', variant = 'map' }: Props) {
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
          <radialGradient id="sdr-bg" cx="50%" cy="30%" r="78%">
            <stop offset="0%" stopColor="#F6FBFF" />
            <stop offset="55%" stopColor="#E6F1FC" />
            <stop offset="100%" stopColor="#C9E1F7" />
          </radialGradient>
          <radialGradient id="sdr-bg-car" cx="50%" cy="32%" r="76%">
            <stop offset="0%" stopColor="#F7FBFF" />
            <stop offset="50%" stopColor="#E1F0FF" />
            <stop offset="100%" stopColor="#BEDFFF" />
          </radialGradient>
          <radialGradient id="sdr-halo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#0098FF" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#0098FF" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="sdr-car-body" x1="0.1" y1="0" x2="0.9" y2="1">
            <stop offset="0%" stopColor="#43B2FF" />
            <stop offset="40%" stopColor="#0098FF" />
            <stop offset="100%" stopColor="#0055B4" />
          </linearGradient>
          <linearGradient id="sdr-glass" x1="0" y1="0" x2="0.25" y2="1">
            <stop offset="0%" stopColor="#F4FCFF" />
            <stop offset="100%" stopColor="#A9D5FF" />
          </linearGradient>
          <linearGradient id="sdr-glow-down" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#003D7A" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#003D7A" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="sdr-pin-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFE45C" />
            <stop offset="100%" stopColor="#FFC400" />
          </linearGradient>
          <clipPath id="sdr-clip">
            <circle cx="100" cy="100" r="96" />
          </clipPath>
        </defs>

        {variant === 'map' ? <MapScene /> : <CarScene />}
      </svg>
    </div>
  );
}

/* ─────────────────────────── Vue de dessus ─────────────────────────── */

const MAP_CX = 66;
const MAP_CY = 69;

function MapScene() {
  const { beams, edge } = buildBeams(MAP_CX, MAP_CY, 110, 0.3);

  return (
    <>
      <circle cx="100" cy="100" r="96" fill="url(#sdr-bg)" />

      <g clipPath="url(#sdr-clip)">
        {/* Îlots */}
        <g fill="#CFE4F7">
          <rect x="8" y="6" width="48" height="42" rx="8" />
          <rect x="64" y="10" width="40" height="32" rx="8" />
          <rect x="144" y="6" width="46" height="42" rx="8" />
          <rect x="10" y="90" width="44" height="26" rx="8" />
          <rect x="62" y="94" width="42" height="22" rx="8" />
          <rect x="144" y="88" width="48" height="30" rx="8" />
          <rect x="14" y="152" width="54" height="40" rx="8" />
          <rect x="78" y="156" width="32" height="36" rx="8" />
          <rect x="144" y="152" width="48" height="40" rx="8" />
        </g>

        {/* Rues */}
        <g fill="#FFFFFF">
          <rect x="0" y="60" width="200" height="18" />
          <rect x="0" y="130" width="200" height="14" />
          <rect x="118" y="0" width="16" height="200" />
        </g>

        {/* Marquages */}
        <line x1="0" y1="69" x2="200" y2="69" stroke="#CFE2F6" strokeWidth="1.4" strokeDasharray="7 7" />
        <line x1="0" y1="137" x2="118" y2="137" stroke="#CFE2F6" strokeWidth="1.2" strokeDasharray="6 6" />
        <line x1="126" y1="0" x2="126" y2="200" stroke="#CFE2F6" strokeWidth="1.2" strokeDasharray="6 6" />

        {/* Balayage radar autour du véhicule recherché */}
        <g
          className="sdr-sweep"
          style={{ transformOrigin: `${MAP_CX}px ${MAP_CY}px` }}
        >
          {beams.map((b, i) => (
            <path key={i} d={b.d} fill="#3FA9FF" opacity={b.opacity} />
          ))}
          <path
            d={`M${edge.cx} ${edge.cy} L${edge.x} ${edge.y}`}
            stroke="#8FD0FF"
            strokeWidth="1.8"
            strokeLinecap="round"
            opacity="0.6"
          />
        </g>

        {/* Halo + sonar du véhicule mis en avant */}
        <circle className="sdr-glow" cx={MAP_CX} cy={MAP_CY} r="24" fill="url(#sdr-halo)" />
        <circle
          className="sdr-sonar"
          cx={MAP_CX} cy={MAP_CY} r="16"
          fill="none" stroke="#0098FF" strokeWidth="1.6" opacity="0.5"
        />

        {/* Itinéraire pointillé */}
        <path
          className="sdr-route"
          d="M148 52 C138 62 112 58 96 62 C84 65 76 66 68 69"
          fill="none" stroke="#0098FF" strokeWidth="2.4"
          strokeDasharray="4 6" strokeLinecap="round" opacity="0.7"
        />

        {/* Véhicule mis en avant */}
        <g transform={`translate(${MAP_CX} ${MAP_CY})`}>
          <ellipse cx="0" cy="3.5" rx="12" ry="5.5" fill="#003D7A" opacity="0.13" />
          <rect x="-13" y="-6.5" width="26" height="13" rx="4.6" fill="#0098FF" />
          <rect x="-13" y="-6.5" width="26" height="13" rx="4.6" fill="none" stroke="#FFFFFF" strokeWidth="1.5" />
          <rect x="4.2" y="-4.6" width="7" height="9.2" rx="2.2" fill="#EAF7FF" />
          <rect x="-8.6" y="-4.2" width="5.4" height="8.4" rx="2" fill="#8FD0FF" />
          <rect x="-1" y="-5.6" width="1.6" height="11.2" rx="0.8" fill="#FFFFFF" opacity="0.35" />
        </g>

        {/* Autres véhicules détectés */}
        <g transform="translate(152 69)">
          <g className="sdr-drift-a">
            <ellipse cx="0" cy="3" rx="10" ry="4.8" fill="#003D7A" opacity="0.1" />
            <rect x="-11" y="-5.5" width="22" height="11" rx="4" fill="#94B6D5" />
            <rect x="-3.6" y="-3.8" width="6" height="7.6" rx="2" fill="#E8F3FD" />
            <rect x="4" y="-3.4" width="4.4" height="6.8" rx="1.8" fill="#C9DDEF" />
          </g>
        </g>
        <g transform="translate(126 170) rotate(-90)">
          <g className="sdr-drift-b">
            <ellipse cx="0" cy="3" rx="10" ry="4.8" fill="#003D7A" opacity="0.1" />
            <rect x="-11" y="-5.5" width="22" height="11" rx="4" fill="#94B6D5" />
            <rect x="-3.6" y="-3.8" width="6" height="7.6" rx="2" fill="#E8F3FD" />
            <rect x="4" y="-3.4" width="4.4" height="6.8" rx="1.8" fill="#C9DDEF" />
          </g>
        </g>
        <g transform="translate(34 137)">
          <g className="sdr-drift-c">
            <ellipse cx="0" cy="2.8" rx="9" ry="4.4" fill="#003D7A" opacity="0.08" />
            <rect x="-10" y="-5" width="20" height="10" rx="3.8" fill="#B2CADF" />
            <rect x="-3.2" y="-3.4" width="5.4" height="6.8" rx="1.8" fill="#EDF6FE" />
          </g>
        </g>
      </g>

      {/* Repère */}
      <g className="sdr-pin">
        <circle className="sdr-pin-halo" cx="150" cy="44" r="15" fill="#0098FF" opacity="0.25" />
        <path
          d="M150 30a11 11 0 0 0-11 11c0 7.9 11 18.5 11 18.5s11-10.6 11-18.5a11 11 0 0 0-11-11z"
          fill="url(#sdr-pin-fill)" stroke="#FFFFFF" strokeWidth="2.2" strokeLinejoin="round"
        />
        <circle cx="150" cy="41" r="3.6" fill="#003D7A" opacity="0.85" />
      </g>
    </>
  );
}

/* ─────────────────────── Gros plan sur le véhicule ─────────────────────── */

function CarScene() {
  const { beams, edge } = buildBeams(100, 104, 98, 0.34);

  return (
    <>
      <circle cx="100" cy="100" r="96" fill="url(#sdr-bg-car)" />

      {/* Radar */}
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
          <path
            d={`M${edge.cx} ${edge.cy} L${edge.x} ${edge.y}`}
            stroke="#8FD0FF" strokeWidth="1.8" strokeLinecap="round" opacity="0.55"
          />
        </g>
        <g className="sdr-dot">
          <circle cx="48" cy="70" r="9" fill="#0098FF" opacity="0.16" />
          <circle cx="48" cy="70" r="4.5" fill="#0098FF" />
        </g>
        <g className="sdr-dot" style={{ animationDelay: '1.2s' }}>
          <circle cx="158" cy="132" r="8" fill="#0098FF" opacity="0.14" />
          <circle cx="158" cy="132" r="4" fill="#0098FF" />
        </g>
      </g>

      {/* Repère */}
      <g className="sdr-pin">
        <circle className="sdr-pin-halo" cx="152" cy="46" r="16" fill="#0098FF" opacity="0.25" />
        <path
          d="M152 32a11 11 0 0 0-11 11c0 7.9 11 18.5 11 18.5s11-10.6 11-18.5a11 11 0 0 0-11-11z"
          fill="url(#sdr-pin-fill)" stroke="#FFFFFF" strokeWidth="2.4" strokeLinejoin="round"
        />
        <circle cx="152" cy="43" r="3.8" fill="#003D7A" opacity="0.85" />
      </g>

      {/* Ombre au sol */}
      <ellipse className="sdr-shadow" cx="100" cy="150" rx="66" ry="9" fill="url(#sdr-glow-down)" />

      {/* Halo doux derrière le véhicule */}
      <ellipse cx="100" cy="118" rx="76" ry="34" fill="#FFFFFF" opacity="0.35" />

      {/* Véhicule */}
      <g className="sdr-car">
        <path
          d="M34 132v-14q0-8 10-10l30-7c10-15 22-21 34-21h14c15 0 25 7 31 19l6 9q9 2 9 12v12q0 4-4 4H38q-4 0-4-4z"
          fill="url(#sdr-car-body)"
        />
        <path d="M52 106c9-13 20-19 32-19h14c13 0 22 6 28 17l1.5 3H50.5z" fill="#FFFFFF" opacity="0.18" />
        <path d="M78 102c8-13 17-17 30-17h8c11 0 19 5 24 15l1 2z" fill="url(#sdr-glass)" />
        <path d="M108 85v17" stroke="#0B4B7F" strokeWidth="2.6" strokeLinecap="round" opacity="0.26" />
        <rect x="118" y="110" width="10" height="3.2" rx="1.6" fill="#FFFFFF" opacity="0.6" />
        <rect x="158" y="115" width="9" height="6" rx="3" fill="#FFD600" />
        <rect x="33" y="117" width="7" height="5" rx="2.5" fill="#FF7A6B" opacity="0.9" />

        {/* Roues (moyeu en croix pour rendre la rotation visible) */}
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
    </>
  );
}

export default SearchingDriverIllustration;
