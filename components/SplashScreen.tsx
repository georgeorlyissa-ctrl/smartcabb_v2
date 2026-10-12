import { useEffect, useState } from 'react';
import { SmartCabbLogo } from './SmartCabbLogo';

const PHASE_1_DELAY = 1100; // ms — phase 1 : médaillon logo
const TOTAL_DELAY   = 2600; // ms — phase 2 : marque + slogan, puis onComplete()

// ⚡ Perf : au 2e chargement (session), le splash est raccourci (assets en cache)
const FAST_PHASE_1_DELAY = 350;
const FAST_TOTAL_DELAY   = 1000;

/**
 * SplashScreen — identité SmartCabb (acier/bleu riveté, comme le logo CS)
 * Fond bleu nuit acier + grille blueprint + itinéraire animé traversé par le point course.
 * Phase 1 : médaillon logo (halo + rivets).
 * Phase 2 : SMARTCABB + slogan « Ride Smart, Live Smart ».
 */
export function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState(0);
  const isFast = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('sc-splash-seen') === '1';

  useEffect(() => {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('sc-splash-seen', '1');
    }
    const phaseDelay = isFast ? FAST_PHASE_1_DELAY : PHASE_1_DELAY;
    const totalDelay = isFast ? FAST_TOTAL_DELAY : TOTAL_DELAY;
    const t1 = setTimeout(() => setPhase(1), phaseDelay);
    const t2 = setTimeout(onComplete, totalDelay);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onComplete, isFast]);

  return (
    <div className="fixed inset-0 z-[9999] overflow-hidden sc-splash-in"
      style={{ background: 'linear-gradient(160deg, #081C28 0%, #0E3548 45%, #175A78 100%)' }}>

      {/* Grille blueprint + vignettage */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 opacity-[0.13]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
        }} />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, transparent 40%, rgba(4,15,22,0.55) 100%)' }} />
      </div>

      {/* Itinéraire animé — le trajet se dessine, le point course avance */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice">
        <path
          d="M -20 620 C 80 600, 90 480, 180 470 S 300 380, 290 270 S 360 150, 420 130"
          fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="3" strokeDasharray="10 10"
          className="sc-route-draw"
        />
        <circle r="7" fill="#FFCC00" className="sc-route-dot" />
        <circle r="12" fill="none" stroke="#FFCC00" strokeWidth="1.5" opacity="0.5" className="sc-route-dot" />
      </svg>

      {/* Contenu principal */}
      <div className="relative z-10 h-full flex flex-col items-center justify-center px-6">
        <div
          className={`flex flex-col items-center transition-all duration-700 ease-out ${
            phase === 1 ? '-translate-y-5 scale-[0.86]' : 'translate-y-0 scale-100'
          }`}
        >
          {/* Médaillon logo — blanc brossé + halo acier + rivets */}
          <div className="relative w-48 h-48 mb-8 sc-medal-in">
            <div className="absolute inset-0 rounded-full sc-halo" />
            {/* Rivets orbitaux (clin d'œil aux boulons du logo) */}
            {[0, 60, 120, 180, 240, 300].map((deg) => (
              <span
                key={deg}
                className="absolute w-2 h-2 rounded-full sc-rivet"
                style={{
                  left: '50%', top: '50%',
                  transform: `rotate(${deg}deg) translateX(88px) translate(-50%, -50%)`,
                }}
              />
            ))}
            <div className="absolute inset-[18px] rounded-[32px] overflow-hidden flex items-center justify-center sc-medal-face">
              <SmartCabbLogo plain className="w-full h-full object-contain p-2" />
            </div>
          </div>

          {/* Marque */}
          <h1 className="text-[42px] font-black tracking-[0.18em] text-center sc-brand-in" style={{ color: '#FFFFFF' }}>
            SMART<span style={{ color: '#7FB8D4' }}>CABB</span>
          </h1>
          <div className="mt-2 h-[3px] w-24 rounded-full sc-bar-fill" style={{ background: 'rgba(255,255,255,0.15)' }}>
            <div className="h-full w-full rounded-full" style={{ background: '#FFCC00' }} />
          </div>
        </div>

        {/* Phase 2 : slogan */}
        <div
          className={`absolute bottom-[16%] left-0 right-0 flex flex-col items-center transition-all duration-700 ease-out ${
            phase === 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6 pointer-events-none'
          }`}
        >
          <p className="text-xl font-bold tracking-wide text-center" style={{ color: '#FFFFFF' }}>
            Ride Smart, Live Smart
          </p>
          <p className="text-sm mt-1.5 font-medium" style={{ color: 'rgba(255,255,255,0.65)' }}>
            Kinshasa · République Démocratique du Congo
          </p>
        </div>
      </div>

      <style>{`
        @keyframes sc-splash-in { from { opacity: 0; } to { opacity: 1; } }
        .sc-splash-in { animation: sc-splash-in 0.35s ease-out forwards; }

        @keyframes sc-medal-in {
          0% { opacity: 0; transform: scale(0.6); }
          60% { opacity: 1; transform: scale(1.04); }
          100% { opacity: 1; transform: scale(1); }
        }
        .sc-medal-in { animation: sc-medal-in 0.9s cubic-bezier(0.22, 1.4, 0.36, 1) forwards; }

        .sc-halo {
          background: radial-gradient(circle, rgba(127,184,212,0.35) 0%, rgba(127,184,212,0.08) 55%, transparent 70%);
          animation: sc-halo-pulse 2.4s ease-in-out infinite;
        }
        @keyframes sc-halo-pulse {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.08); opacity: 1; }
        }

        .sc-medal-face {
          background: linear-gradient(145deg, #ffffff 0%, #dfe9ef 60%, #c3d5e0 100%);
          box-shadow: 0 18px 50px rgba(0,0,0,0.5), inset 0 2px 6px rgba(255,255,255,0.9), 0 0 0 3px rgba(127,184,212,0.45);
        }

        .sc-rivet {
          background: radial-gradient(circle at 35% 35%, #ffffff 0%, #9fb6c3 55%, #5d7a8a 100%);
          box-shadow: 0 1px 3px rgba(0,0,0,0.6);
          animation: sc-rivet-orbit 9s linear infinite;
        }
        @keyframes sc-rivet-orbit {
          from { rotate: 0deg; }
          to { rotate: 360deg; }
        }

        @keyframes sc-brand-in {
          from { opacity: 0; letter-spacing: 0.42em; }
          to { opacity: 1; letter-spacing: 0.18em; }
        }
        .sc-brand-in { animation: sc-brand-in 0.9s ease-out 0.25s both; }

        .sc-bar-fill > div { animation: sc-bar-fill 1.6s ease-out 0.4s both; transform-origin: left; }
        @keyframes sc-bar-fill {
          from { transform: scaleX(0); }
          to { transform: scaleX(1); }
        }

        .sc-route-draw {
          stroke-dasharray: 10 10;
          animation: sc-route-dash 1.4s linear infinite;
        }
        @keyframes sc-route-dash {
          to { stroke-dashoffset: -40; }
        }
        .sc-route-dot {
          offset-path: path('M -20 620 C 80 600, 90 480, 180 470 S 300 380, 290 270 S 360 150, 420 130');
          animation: sc-route-move 2.6s linear infinite;
        }
        @keyframes sc-route-move {
          from { offset-distance: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          to { offset-distance: 100%; opacity: 0; }
        }
      `}</style>
    </div>
  );
}
