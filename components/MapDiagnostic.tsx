import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, Loader2 } from '../lib/icons';

export function MapDiagnostic() {
  const [checks, setChecks] = useState({
    leafletCss: false,
    leafletJs: false,
    leafletObject: false,
    domReady: false,
    error: null as string | null
  });

  useEffect(() => {
    console.log('🔍 Début du diagnostic de carte...');

    // Vérifier que le DOM est prêt
    setChecks(prev => ({ ...prev, domReady: true }));

    // Vérifier le CSS Leaflet
    const checkCss = () => {
      const cssLink = document.querySelector('link[href*="leaflet.css"]');
      console.log('📄 CSS Leaflet trouvé:', !!cssLink);
      setChecks(prev => ({ ...prev, leafletCss: !!cssLink }));
      return !!cssLink;
    };

    // Vérifier le JS Leaflet
    const checkJs = () => {
      const jsScript = document.querySelector('script[src*="leaflet.js"]');
      console.log('📜 JS Leaflet trouvé:', !!jsScript);
      setChecks(prev => ({ ...prev, leafletJs: !!jsScript }));
      return !!jsScript;
    };

    // Vérifier l'objet Leaflet
    const checkLeafletObject = () => {
      const hasLeaflet = !!(window as any).L;
      console.log('🌍 Objet Leaflet disponible:', hasLeaflet);
      setChecks(prev => ({ ...prev, leafletObject: hasLeaflet }));
      return hasLeaflet;
    };

    // Exécuter les vérifications
    setTimeout(() => {
      checkCss();
      checkJs();
      checkLeafletObject();
    }, 500);

    // Vérifier périodiquement si Leaflet charge
    const interval = setInterval(() => {
      if ((window as any).L) {
        console.log('✅ Leaflet chargé avec succès!');
        setChecks(prev => ({ ...prev, leafletObject: true }));
        clearInterval(interval);
      }
    }, 200);

    // Timeout après 10 secondes
    const timeout = setTimeout(() => {
      if (!(window as any).L) {
        console.error('❌ Leaflet n\'a pas pu se charger après 10 secondes');
        setChecks(prev => ({ 
          ...prev, 
          error: 'Leaflet ne s\'est pas chargé après 10 secondes' 
        }));
      }
      clearInterval(interval);
    }, 10000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  return (
    <div className="fixed top-4 right-4 z-[9999] bg-white rounded-lg shadow-2xl p-4 max-w-sm border-2 border-blue-500">
      <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
        🔍 Diagnostic de Carte
      </h3>

      <div className="space-y-2 text-sm">
        <DiagnosticLine 
          label="DOM Ready" 
          status={checks.domReady} 
        />
        <DiagnosticLine 
          label="CSS Leaflet chargé" 
          status={checks.leafletCss} 
        />
        <DiagnosticLine 
          label="JS Leaflet chargé" 
          status={checks.leafletJs} 
        />
        <DiagnosticLine 
          label="Objet L disponible" 
          status={checks.leafletObject} 
        />
      </div>

      {checks.error && (
        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
          <AlertCircle className="w-4 h-4 inline mr-1" />
          {checks.error}
        </div>
      )}

      {checks.leafletObject && (
        <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-700">
          <CheckCircle className="w-4 h-4 inline mr-1" />
          Carte prête !
        </div>
      )}
    </div>
  );
}

function DiagnosticLine({ label, status }: { label: string; status: boolean }) {
  return (
    <div className="flex items-center justify-between py-1 border-b border-gray-100">
      <span className="text-gray-700">{label}</span>
      {status ? (
        <CheckCircle className="w-5 h-5 text-green-500" />
      ) : (
        <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
      )}
    </div>
  );
}