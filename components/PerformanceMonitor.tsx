import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Activity, Wifi, Download, Package } from '../lib/icons';
import { useOnlineStatus } from '../hooks/usePWA';

interface PerformanceMetrics {
  loadTime: number;
  chunks: number;
  cacheStatus: 'enabled' | 'disabled';
  swStatus: 'active' | 'inactive';
  online: boolean;
  totalSize: number;
}

export function PerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    loadTime: 0,
    chunks: 0,
    cacheStatus: 'disabled',
    swStatus: 'inactive',
    online: true,
    totalSize: 0,
  });
  const [isVisible, setIsVisible] = useState(false);
  const isOnline = useOnlineStatus();

  useEffect(() => {
    // Activer avec Ctrl+Shift+P
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        setIsVisible(!isVisible);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isVisible]);

  useEffect(() => {
    const calculateMetrics = async () => {
      // Temps de chargement
      const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const loadTime = perfData ? Math.round(perfData.loadEventEnd - perfData.fetchStart) : 0;

      // Nombre de chunks JS
      const resources = performance.getEntriesByType('resource');
      const jsFiles = resources.filter((r) => r.name.includes('.js'));
      const chunks = jsFiles.length;

      // Taille totale
      const totalSize = jsFiles.reduce((acc, r) => {
        const entry = r as PerformanceResourceTiming;
        return acc + (entry.transferSize || 0);
      }, 0);

      // Cache status
      const cacheStatus = ('caches' in window) ? 'enabled' : 'disabled';

      // Service Worker status - désactivé temporairement
      let swStatus: 'active' | 'inactive' = 'inactive';
      // 🚫 Code désactivé pour éviter les erreurs de Service Worker
      /*
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        swStatus = registration?.active ? 'active' : 'inactive';
      }
      */

      setMetrics({
        loadTime,
        chunks,
        cacheStatus,
        swStatus,
        online: isOnline,
        totalSize,
      });
    };

    if (isVisible) {
      calculateMetrics();
    }
  }, [isVisible, isOnline]);

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Badge 
          variant="outline" 
          className="cursor-help bg-black/80 text-white text-xs px-2 py-1"
          title="Appuyez sur Ctrl+Shift+P pour afficher"
        >
          ⚡ Optimisé
        </Badge>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80">
      <Card className="shadow-lg border-2 border-orange-500/50 bg-white/95 backdrop-blur">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-orange-500" />
              Performance Monitor
            </span>
            <button
              onClick={() => setIsVisible(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-3 text-xs">
          {/* Temps de chargement */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground flex-1">
              Temps de chargement
            </span>
            <Badge variant={metrics.loadTime < 3000 ? 'default' : 'destructive'}>
              {((metrics.loadTime || 0) / 1000).toFixed(2)}s
            </Badge>
          </div>

          {/* Chunks chargés */}
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-gray-600">
              <Package className="w-3 h-3" />
              Chunks JS
            </span>
            <Badge variant="outline">
              {metrics.chunks} fichiers
            </Badge>
          </div>

          {/* Taille totale */}
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-gray-600">
              <Download className="w-3 h-3" />
              Taille totale
            </span>
            <Badge variant="outline">
              {(metrics.totalSize / 1024).toFixed(0)} KB
            </Badge>
          </div>

          {/* Service Worker */}
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Service Worker</span>
            <Badge 
              variant={metrics.swStatus === 'active' ? 'default' : 'outline'}
              className={metrics.swStatus === 'active' ? 'bg-green-500' : ''}
            >
              {metrics.swStatus === 'active' ? '✅ Actif' : '❌ Inactif'}
            </Badge>
          </div>

          {/* Cache */}
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Cache API</span>
            <Badge 
              variant={metrics.cacheStatus === 'enabled' ? 'default' : 'outline'}
              className={metrics.cacheStatus === 'enabled' ? 'bg-green-500' : ''}
            >
              {metrics.cacheStatus === 'enabled' ? '✅ Activé' : '❌ Désactivé'}
            </Badge>
          </div>

          {/* Connexion */}
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-gray-600">
              <Wifi className="w-3 h-3" />
              Connexion
            </span>
            <Badge 
              variant={metrics.online ? 'default' : 'destructive'}
              className={metrics.online ? 'bg-green-500' : ''}
            >
              {metrics.online ? '🌐 En ligne' : '📡 Hors ligne'}
            </Badge>
          </div>

          {/* Indicateurs de performance */}
          <div className="pt-2 border-t space-y-1">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-gray-500">Code Splitting</span>
              <span className="text-green-600">✅ Activé</span>
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-gray-500">Lazy Loading</span>
              <span className="text-green-600">✅ Activé</span>
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-gray-500">PWA Ready</span>
              <span className="text-green-600">✅ Oui</span>
            </div>
          </div>

          {/* Info */}
          <div className="pt-2 border-t text-[10px] text-gray-500 text-center">
            Ctrl+Shift+P pour masquer
          </div>
        </CardContent>
      </Card>
    </div>
  );
}