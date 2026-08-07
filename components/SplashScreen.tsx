import { useEffect, useState } from 'react';
import { SmartCabbLogo } from './SmartCabbLogo';

const PHASE_1_DELAY = 1200; // ms — phase 1 : logo seul (zoom-in)
const TOTAL_DELAY   = 2600; // ms — phase 2 : logo + slogan, puis onComplete()

/**
 * SplashScreen — animation 2 phases façon Yango
 * Phase 1 : logo seul (zoom-in + cercles animés)
 * Phase 2 : logo + slogan « Ride Smart, Live Smart »
 */
export function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), PHASE_1_DELAY);
    const t2 = setTimeout(onComplete, TOTAL_DELAY);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[9999] bg-gradient-to-br from-cyan-500 via-cyan-600 to-green-500 overflow-hidden">
      {/* Orbes flottants animés */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -left-20 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-yellow-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '0.7s' }}></div>
        <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-green-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.4s' }}></div>

        {/* Particules flottantes */}
        {[...Array(18)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-white/30 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `sc-float ${3 + Math.random() * 4}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 2}s`
            }}
          />
        ))}

        {/* Grille de points moderne */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle, rgba(255, 255, 255, 0.4) 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }} />
      </div>

      {/* Contenu principal */}
      <div className="relative z-10 h-full flex flex-col items-center justify-center px-6">
        {/* ── PHASE 1 : logo seul ── */}
        <div
          className={`flex flex-col items-center transition-all duration-700 ease-out ${
            phase === 1 ? '-translate-y-6 scale-[0.82] opacity-90' : 'translate-y-0 scale-100 opacity-100'
          }`}
        >
          <div className="relative w-44 h-44 mb-10">
            {/* Cercles animés autour du logo */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-full h-full rounded-full border-4 border-white/20 animate-ping" style={{ animationDuration: '3s' }}></div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-[90%] h-[90%] rounded-full border-2 border-white/30 animate-pulse" style={{ animationDuration: '2s' }}></div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-4/5 h-4/5 rounded-full border border-yellow-300/40 animate-spin" style={{ animationDuration: '8s' }}></div>
            </div>

            {/* Logo — zoom-in à l'apparition */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-32 h-32 rounded-[28px] bg-white shadow-2xl shadow-black/40 flex items-center justify-center overflow-hidden">
                <SmartCabbLogo plain className="w-full h-full object-contain p-1" />
              </div>
            </div>
          </div>

          {/* Nom de la marque — apparaît avec le logo */}
          <h1 className="text-5xl font-black text-white mb-2 tracking-tight text-center animate-in">
            Smart<span className="text-yellow-300">Cabb</span>
          </h1>
        </div>

        {/* ── PHASE 2 : slogan ── */}
        <div
          className={`absolute bottom-[18%] left-0 right-0 flex flex-col items-center transition-all duration-700 ease-out ${
            phase === 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6 pointer-events-none'
          }`}
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-px w-12 bg-gradient-to-r from-transparent via-white/80 to-white/80 rounded-full"></div>
            <div className="w-1.5 h-1.5 bg-yellow-300 rounded-full"></div>
            <div className="h-px w-12 bg-gradient-to-l from-transparent via-white/80 to-white/80 rounded-full"></div>
          </div>
          <p className="text-2xl font-bold text-white tracking-wide text-center drop-shadow-md">
            Ride Smart, Live Smart
          </p>
          <p className="text-white/80 text-sm font-medium mt-2">
            Votre partenaire de mobilité urbaine
          </p>
        </div>
      </div>

      {/* Animations CSS personnalisées */}
      <style>{`
        @keyframes sc-float {
          0%, 100% {
            transform: translateY(0) translateX(0);
            opacity: 0.3;
          }
          50% {
            transform: translateY(-20px) translateX(10px);
            opacity: 0.6;
          }
        }

        @keyframes animate-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-in {
          animation: animate-in 0.6s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
