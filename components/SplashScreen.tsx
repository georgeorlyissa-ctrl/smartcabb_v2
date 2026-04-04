import { useEffect, useState } from 'react';

export function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Animation de progression
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(onComplete, 300);
          return 100;
        }
        return prev + 2;
      });
    }, 30);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-cyan-500 via-cyan-600 to-green-500 overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Orbes flottants animés */}
        <div className="absolute -top-20 -left-20 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-yellow-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '0.7s' }}></div>
        <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-green-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.4s' }}></div>
        
        {/* Particules flottantes */}
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-white/30 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `float ${3 + Math.random() * 4}s ease-in-out infinite`,
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
        {/* Logo avec animation d'apparition */}
        <div className="mb-12 relative animate-in zoom-in duration-700">
          {/* Cercles animés autour du logo */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-48 h-48 rounded-full border-4 border-white/20 animate-ping" style={{ animationDuration: '3s' }}></div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-44 h-44 rounded-full border-2 border-white/30 animate-pulse" style={{ animationDuration: '2s' }}></div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-40 h-40 rounded-full border border-yellow-300/40 animate-spin" style={{ animationDuration: '8s' }}></div>
          </div>
          
          {/* Logo principal - carré blanc avec SC */}
          <div className="relative w-36 h-36 mx-auto bg-white rounded-[32px] shadow-2xl shadow-black/40 flex items-center justify-center transform hover:scale-105 transition-all duration-500">
            <div className="text-center">
              <div className="text-5xl font-black bg-gradient-to-br from-cyan-500 via-cyan-600 to-green-500 bg-clip-text text-transparent animate-pulse">
                SC
              </div>
            </div>
          </div>
        </div>

        {/* Nom SmartCabb ultra stylisé */}
        <div className="text-center mb-12 animate-in fade-in slide-in-from-bottom duration-700" style={{ animationDelay: '200ms' }}>
          <h1 className="text-6xl font-black text-white mb-3 tracking-tight">
            Smart<span className="text-yellow-300">Cabb</span>
          </h1>
          
          {/* Ligne de séparation animée */}
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="h-1 w-12 bg-gradient-to-r from-transparent via-white to-transparent rounded-full animate-pulse"></div>
            <div className="h-1 w-1 bg-white rounded-full"></div>
            <div className="h-1 w-12 bg-gradient-to-r from-transparent via-white to-transparent rounded-full animate-pulse"></div>
          </div>
          
          <p className="text-xl text-white/90 font-medium tracking-wide">
            Transport Kinshasa
          </p>
        </div>

        {/* Barre de progression moderne */}
        <div className="w-72 animate-in fade-in slide-in-from-bottom duration-700" style={{ animationDelay: '400ms' }}>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-white/80 text-sm font-medium">Chargement</span>
            <span className="text-white font-bold text-sm">{Math.round(progress)}%</span>
          </div>
          
          {/* Barre de progression */}
          <div className="h-2 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm">
            <div 
              className="h-full bg-gradient-to-r from-yellow-300 via-white to-yellow-300 rounded-full transition-all duration-300 ease-out shadow-lg shadow-yellow-300/50"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Message de bienvenue */}
        <div className="mt-8 text-center animate-in fade-in duration-700" style={{ animationDelay: '600ms' }}>
          <p className="text-white/70 text-sm font-medium">
            Votre partenaire de mobilité urbaine
          </p>
        </div>
      </div>

      {/* Animations CSS personnalisées */}
      <style>{`
        @keyframes float {
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
