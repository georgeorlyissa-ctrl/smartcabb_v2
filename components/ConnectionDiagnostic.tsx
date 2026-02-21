import { useState, useEffect } from 'react';
import { Alert, AlertDescription } from './ui/alert';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { 
  Wifi, 
  WifiOff, 
  MapPin, 
  MapPinOff, 
  Database, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Shield
} from '../lib/icons';
import {
  runFullDiagnostic,
  getErrorMessage,
  getSuggestions,
  getDefaultPosition
} from '../lib/connection-checker';

export function ConnectionDiagnostic() {
  const [diagnostic, setDiagnostic] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const runDiagnostic = async () => {
    setIsRunning(true);
    try {
      const result = await runFullDiagnostic();
      setDiagnostic(result);
    } catch (error) {
      console.error('Erreur lors du diagnostic:', error);
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    runDiagnostic();
  }, []);

  if (!diagnostic) {
    return (
      <div className="p-4 text-center">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
        <p>Diagnostic en cours...</p>
      </div>
    );
  }

  const hasErrors = 
    !diagnostic.internet.connected || 
    !diagnostic.supabase.connected || 
    !diagnostic.geolocation.available ||
    !diagnostic.secureContext.secure;

  const errorMsg = getErrorMessage(diagnostic);
  const suggestions = getSuggestions(diagnostic);

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      {hasErrors && (
        <Card className="p-4 bg-white shadow-2xl border-2 border-orange-500">
          {/* En-tête */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              <h3 className="font-semibold">Problèmes détectés</h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
            >
              {showDetails ? 'Masquer' : 'Détails'}
            </Button>
          </div>

          {/* Résumé */}
          <div className="mb-3 text-sm">
            <pre className="whitespace-pre-wrap text-gray-700">{errorMsg}</pre>
          </div>

          {/* Détails (si affichés) */}
          {showDetails && (
            <div className="space-y-2 mb-3 text-sm">
              {/* Internet */}
              <div className="flex items-center gap-2">
                {diagnostic.internet.connected ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-500" />
                )}
                <Wifi className="w-4 h-4" />
                <span>
                  {diagnostic.internet.connected ? 'Internet OK' : 'Pas de connexion'}
                </span>
              </div>

              {/* Supabase */}
              <div className="flex items-center gap-2">
                {diagnostic.supabase.connected ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-500" />
                )}
                <Database className="w-4 h-4" />
                <span>
                  {diagnostic.supabase.connected 
                    ? `Supabase OK (${diagnostic.supabase.latency}ms)` 
                    : 'Supabase inaccessible'}
                </span>
              </div>

              {/* Géolocalisation */}
              <div className="flex items-center gap-2">
                {diagnostic.geolocation.available ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-500" />
                )}
                <MapPin className="w-4 h-4" />
                <span>
                  {diagnostic.geolocation.available 
                    ? 'Géolocalisation OK' 
                    : 'Géolocalisation bloquée'}
                </span>
              </div>

              {/* Contexte sécurisé */}
              <div className="flex items-center gap-2">
                {diagnostic.secureContext.secure ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-500" />
                )}
                <Shield className="w-4 h-4" />
                <span>
                  {diagnostic.secureContext.secure 
                    ? `${diagnostic.secureContext.protocol} OK` 
                    : 'Contexte non sécurisé'}
                </span>
              </div>
            </div>
          )}

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <Alert className="mb-3">
              <AlertDescription>
                <strong className="block mb-1">💡 Solutions:</strong>
                <ul className="list-disc list-inside text-xs space-y-1">
                  {suggestions.map((suggestion, i) => (
                    <li key={i}>{suggestion}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Bouton relancer */}
          <Button
            onClick={runDiagnostic}
            disabled={isRunning}
            className="w-full"
            size="sm"
          >
            {isRunning ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Test en cours...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Relancer le diagnostic
              </>
            )}
          </Button>

          {/* Position par défaut */}
          {!diagnostic.geolocation.available && (
            <div className="mt-3 p-2 bg-blue-50 rounded text-xs text-blue-700">
              📍 Position par défaut utilisée: Centre de Kinshasa
            </div>
          )}
        </Card>
      )}
    </div>
  );
}