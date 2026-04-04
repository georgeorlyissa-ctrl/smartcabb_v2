// Loader2 icon inline (évite import lucide-react qui échoue avec esm.sh)
const Loader2Icon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message = 'Chargement...' }: LoadingScreenProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-500 via-cyan-600 to-green-500 relative overflow-hidden flex flex-col items-center justify-center p-6">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Orbes flottants */}
        <div className="absolute top-20 left-20 w-64 h-64 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-yellow-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-green-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '0.5s' }}></div>
        
        {/* Grille de points subtile */}
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: 'radial-gradient(circle, rgba(255, 255, 255, 0.3) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} />
      </div>

      {/* Logo SmartCabb ultra designé */}
      <div className="relative z-10 text-center">
        {/* Logo avec animation */}
        <div className="mb-8 relative">
          {/* Cercle extérieur animé */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-40 h-40 rounded-full border-4 border-white/30 animate-ping" style={{ animationDuration: '2s' }}></div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-36 h-36 rounded-full border-2 border-white/40 animate-pulse"></div>
          </div>
          
          {/* Logo principal */}
          <div className="relative w-32 h-32 mx-auto bg-white rounded-3xl shadow-2xl shadow-black/30 flex items-center justify-center transform hover:scale-105 transition-transform duration-300">
            <div className="text-center">
              <div className="text-4xl font-black bg-gradient-to-br from-cyan-500 to-green-500 bg-clip-text text-transparent">
                SC
              </div>
            </div>
          </div>
        </div>

        {/* Nom de l'app avec typographie moderne */}
        <div className="mb-8">
          <h1 className="text-5xl font-black text-white mb-2 tracking-tight">
            Smart<span className="text-yellow-300">Cabb</span>
          </h1>
          <div className="flex items-center justify-center gap-2 text-white/90 text-sm font-medium">
            <div className="w-8 h-0.5 bg-white/50 rounded-full"></div>
            <span>Transport Kinshasa</span>
            <div className="w-8 h-0.5 bg-white/50 rounded-full"></div>
          </div>
        </div>

        {/* Spinner moderne */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <Loader2Icon className="w-10 h-10 text-white animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-6 h-6 bg-yellow-300 rounded-full animate-pulse"></div>
            </div>
          </div>
          
          <p className="text-white font-semibold text-lg">{message}</p>
        </div>

        {/* Indicateur de progression */}
        <div className="mt-8 w-64 h-1 bg-white/20 rounded-full overflow-hidden mx-auto">
          <div className="h-full bg-gradient-to-r from-yellow-300 via-white to-yellow-300 rounded-full animate-pulse" style={{
            width: '60%',
            animation: 'slide 1.5s ease-in-out infinite'
          }}></div>
        </div>
      </div>

      {/* Animation CSS personnalisée */}
      <style>{`
        @keyframes slide {
          0% {
            transform: translateX(-100%);
          }
          50% {
            transform: translateX(100%);
          }
          100% {
            transform: translateX(-100%);
          }
        }
      `}</style>
    </div>
  );
}
