import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { CheckCircle, XCircle, AlertCircle, RefreshCw } from '../../lib/admin-icons';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

export function TestSMSConfigScreen() {
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<any>(null);
  const [error, setError] = useState('');

  const testConfig = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/test-sms-config`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );

      const result = await response.json();

      if (result.success) {
        setConfig(result.config);
      } else {
        setError(result.error || 'Erreur inconnue');
      }

    } catch (err: any) {
      console.error('Erreur test config:', err);
      setError(err.message || 'Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    testConfig();
  }, []);

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Test Configuration SMS</h1>
          <Button
            onClick={testConfig}
            disabled={loading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start space-x-3">
            <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-800">Erreur</p>
              <p className="text-sm text-red-600">{error}</p>
            </div>
          </div>
        )}

        {config && (
          <div className="space-y-4">
            {/* Username */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">AFRICAS_TALKING_USERNAME</h3>
                {config.username_present ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600" />
                )}
              </div>
              <p className="text-sm text-gray-600 mb-1">
                Status: {config.username_present ? '✅ Configuré' : '❌ Non configuré'}
              </p>
              <div className="bg-gray-100 rounded p-3 font-mono text-sm">
                {config.username_value}
              </div>
              {config.username_value !== 'orfylisa' && config.username_present && (
                <div className="mt-2 bg-yellow-50 border border-yellow-200 rounded p-3 flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-yellow-800">
                    Le username actuel est "{config.username_value}" mais votre dashboard Africa's Talking montre "orfylisa". 
                    Vérifiez que les valeurs correspondent.
                  </p>
                </div>
              )}
            </div>

            {/* API Key */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">AFRICAS_TALKING_API_KEY</h3>
                {config.api_key_present ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600" />
                )}
              </div>
              <p className="text-sm text-gray-600 mb-1">
                Status: {config.api_key_present ? '✅ Configuré' : '❌ Non configuré'}
              </p>
              <div className="bg-gray-100 rounded p-3 font-mono text-sm">
                {config.api_key_preview}
              </div>
            </div>

            {/* Résumé */}
            <div className={`border-2 rounded-lg p-4 ${
              config.username_present && config.api_key_present
                ? 'bg-green-50 border-green-300'
                : 'bg-red-50 border-red-300'
            }`}>
              <div className="flex items-start space-x-3">
                {config.username_present && config.api_key_present ? (
                  <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <h3 className="font-medium mb-2">
                    {config.username_present && config.api_key_present
                      ? '✅ Configuration complète'
                      : '❌ Configuration incomplète'}
                  </h3>
                  {config.username_present && config.api_key_present ? (
                    <p className="text-sm text-green-800">
                      Les credentials Africa's Talking sont configurés. Les SMS devraient être envoyés.
                      Si les SMS n'arrivent toujours pas, vérifiez :
                    </p>
                  ) : (
                    <p className="text-sm text-red-800">
                      Les credentials Africa's Talking ne sont pas configurés. Configurez-les dans Supabase :
                    </p>
                  )}
                  <ul className="list-disc list-inside text-sm mt-2 space-y-1 text-gray-700">
                    <li>Le compte Africa's Talking est-il en mode "Live" (pas Sandbox) ?</li>
                    <li>Le compte a-t-il du crédit ?</li>
                    <li>Le username correspond-il exactement (case-sensitive) ?</li>
                    <li>L'API Key est-elle valide et active ?</li>
                    <li>Les numéros sont-ils au format international (+243...) ?</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-2">💡 Comment configurer</h3>
              <ol className="list-decimal list-inside text-sm text-blue-800 space-y-1">
                <li>Allez dans Supabase Dashboard</li>
                <li>Settings → Edge Functions → Secrets</li>
                <li>Ajoutez ou modifiez :</li>
              </ol>
              <div className="bg-white rounded p-3 mt-2 font-mono text-xs space-y-1">
                <div>AFRICAS_TALKING_USERNAME = <span className="text-blue-600">orfylisa</span></div>
                <div>AFRICAS_TALKING_API_KEY = <span className="text-blue-600">votre_api_key</span></div>
              </div>
              <p className="text-xs text-blue-700 mt-2">
                ⚠️ Attention : Le username est case-sensitive (orfylisa ≠ Orfylisa)
              </p>
            </div>
          </div>
        )}

        {loading && !config && (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        )}
      </Card>
    </div>
  );
}