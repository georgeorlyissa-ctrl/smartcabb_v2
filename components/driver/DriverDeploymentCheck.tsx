import { useState } from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

/**
 * Composant de diagnostic pour vérifier si le nouveau code est déployé
 */
export function DriverDeploymentCheck() {
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<any>(null);

  const checkDeployment = async () => {
    setChecking(true);
    setResult(null);

    try {
      // Test 1: Vérifier la version du code
      console.log('🔍 Test 1: Vérification de la version du code...');
      
      const testId = 'test-00000000-0000-0000-0000-000000000000';
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/drivers/${testId}`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      const data = await response.json();
      
      // Analyser la réponse
      const isOldCode = data.error && data.error.includes('introuvable après');
      const isNewCode = data.error && (
        data.error.includes('non trouvé') || 
        data.error.includes('non trouvée') ||
        data.error.includes('Veuillez réessayer')
      );

      setResult({
        status: response.status,
        error: data.error,
        isOldCode,
        isNewCode,
        rawResponse: JSON.stringify(data, null, 2)
      });

    } catch (error) {
      setResult({
        error: 'Erreur lors du test',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      });
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <Card className="max-w-2xl mx-auto p-6">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold mb-2">🔍 Vérification Déploiement</h1>
            <p className="text-gray-600">
              Cet outil vérifie si le nouveau code avec le fix est bien déployé sur Supabase.
            </p>
          </div>

          <Button 
            onClick={checkDeployment} 
            disabled={checking}
            className="w-full"
          >
            {checking ? '⏳ Vérification en cours...' : '🚀 Vérifier le Déploiement'}
          </Button>

          {result && (
            <div className="space-y-4">
              <div className={`p-4 rounded-lg ${
                result.isOldCode ? 'bg-red-50 border-2 border-red-500' :
                result.isNewCode ? 'bg-green-50 border-2 border-green-500' :
                'bg-yellow-50 border-2 border-yellow-500'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  {result.isOldCode && (
                    <>
                      <span className="text-2xl">❌</span>
                      <span className="font-bold text-red-900">ANCIEN CODE DÉTECTÉ</span>
                    </>
                  )}
                  {result.isNewCode && (
                    <>
                      <span className="text-2xl">✅</span>
                      <span className="font-bold text-green-900">NOUVEAU CODE DÉTECTÉ</span>
                    </>
                  )}
                  {!result.isOldCode && !result.isNewCode && (
                    <>
                      <span className="text-2xl">⚠️</span>
                      <span className="font-bold text-yellow-900">STATUT INCONNU</span>
                    </>
                  )}
                </div>

                <div className="text-sm space-y-2">
                  <div>
                    <strong>Statut HTTP:</strong> {result.status}
                  </div>
                  {result.error && (
                    <div>
                      <strong>Message d'erreur:</strong>
                      <pre className="mt-1 p-2 bg-white rounded text-xs overflow-x-auto">
                        {result.error}
                      </pre>
                    </div>
                  )}
                </div>
              </div>

              {result.isOldCode && (
                <div className="bg-red-100 border-l-4 border-red-500 p-4">
                  <h3 className="font-bold text-red-900 mb-2">🚨 ACTION REQUISE</h3>
                  <div className="text-sm text-red-800 space-y-2">
                    <p>Le nouveau code n'est PAS déployé sur Supabase.</p>
                    <p className="font-semibold">Vous devez:</p>
                    <ol className="list-decimal list-inside space-y-1 ml-2">
                      <li>Ouvrir /supabase/functions/server/driver-routes.ts dans Figma Make</li>
                      <li>Copier TOUT le contenu (Ctrl+A, Ctrl+C)</li>
                      <li>Aller sur supabase.com/dashboard</li>
                      <li>Edge Functions → server → Edit → driver-routes.ts</li>
                      <li>Remplacer tout le contenu (Ctrl+A, Delete, Ctrl+V)</li>
                      <li>Cliquer "Deploy"</li>
                      <li>Attendre 60 secondes</li>
                      <li>Revenir ici et cliquer "Vérifier" à nouveau</li>
                    </ol>
                  </div>
                </div>
              )}

              {result.isNewCode && (
                <div className="bg-green-100 border-l-4 border-green-500 p-4">
                  <h3 className="font-bold text-green-900 mb-2">✅ SUCCÈS</h3>
                  <div className="text-sm text-green-800 space-y-2">
                    <p>Le nouveau code est bien déployé sur Supabase!</p>
                    <p>Le système devrait maintenant fonctionner correctement:</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>Les inscriptions de conducteurs devraient fonctionner</li>
                      <li>Le fallback automatique depuis Auth est actif</li>
                      <li>Plus d'erreur "introuvable après 3 tentatives"</li>
                    </ul>
                    <p className="font-semibold mt-2">
                      Vous pouvez maintenant tester l'inscription sur /app/driver/signup
                    </p>
                  </div>
                </div>
              )}

              <details className="text-sm">
                <summary className="cursor-pointer font-semibold text-gray-700 hover:text-gray-900">
                  🔍 Voir la réponse complète du serveur
                </summary>
                <pre className="mt-2 p-4 bg-gray-900 text-green-400 rounded text-xs overflow-x-auto">
                  {result.rawResponse}
                </pre>
              </details>

              <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm">
                <div className="font-semibold text-blue-900 mb-1">💡 Comment ça marche?</div>
                <div className="text-blue-800 space-y-1">
                  <p><strong>Ancien code:</strong> Message contient "introuvable après"</p>
                  <p><strong>Nouveau code:</strong> Message contient "non trouvé" ou "Veuillez réessayer"</p>
                  <p className="text-xs mt-2 text-blue-600">
                    Le nouveau code inclut un fallback automatique qui reconstruit le profil depuis Auth.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="border-t pt-4 text-sm text-gray-600">
            <p><strong>Note:</strong> Cet outil envoie une requête avec un ID fictif au serveur pour analyser le message d'erreur retourné.</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
