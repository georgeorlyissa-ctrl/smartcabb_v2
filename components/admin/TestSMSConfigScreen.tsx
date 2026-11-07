import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { CheckCircle, XCircle, RefreshCw } from '../../lib/admin-icons';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

/**
 * Écran de diagnostic rapide de la configuration SMS (EJ SMS / EJSARL).
 * Appelle GET /sms/config qui ne renvoie jamais les valeurs secrètes.
 */
export function TestSMSConfigScreen() {
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<any>(null);
  const [error, setError] = useState('');

  const testConfig = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/sms/config`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );

      const result = await response.json();
      if (!response.ok) {
        setError(result.error || `HTTP ${response.status}`);
        return;
      }

      setConfig(result);
    } catch (err: any) {
      console.error('Erreur test config SMS:', err);
      setError(err.message || 'Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    testConfig();
  }, []);

  const configured = Boolean(config?.configured);
  const enabled = config?.enabled !== false;

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
            <div className="border rounded-lg p-4 flex items-center justify-between">
              <div>
                <h3 className="font-medium">Fournisseur SMS</h3>
                <p className="text-sm text-gray-600">EJ SMS (EJSARL) — opérateurs RDC</p>
              </div>
              {config.provider === 'ejsms' ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600" />
              )}
            </div>

            <div className="border rounded-lg p-4 flex items-center justify-between">
              <div>
                <h3 className="font-medium">Identifiants OAuth</h3>
                <p className="text-sm text-gray-600">
                  EJSMS_CLIENT_ID / EJSMS_CLIENT_SECRET :{' '}
                  {configured ? 'configurés' : 'non configurés'}
                </p>
              </div>
              {configured ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600" />
              )}
            </div>

            <div className={`border-2 rounded-lg p-4 ${
              configured && enabled
                ? 'bg-green-50 border-green-300'
                : 'bg-red-50 border-red-300'
            }`}>
              <div className="flex items-start space-x-3">
                {configured && enabled ? (
                  <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <h3 className="font-medium mb-2">
                    {configured && enabled
                      ? '✅ Configuration complète'
                      : '❌ Configuration incomplète'}
                  </h3>
                  <ul className="list-disc list-inside text-sm mt-2 space-y-1 text-gray-700">
                    <li>Le compte EJ SMS est-il approvisionné en crédits ?</li>
                    <li>Le Sender ID <code className="bg-gray-100 px-1 rounded">SMARTCABB</code> est-il validé ?</li>
                    <li>Les numéros sont-ils valides (+243XXXXXXXXX) ?</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-2">💡 Comment configurer</h3>
              <ol className="list-decimal list-inside text-sm text-blue-800 space-y-1">
                <li>Supabase Dashboard → Settings → Edge Functions → Secrets</li>
                <li>Ajoutez ou modifiez :</li>
              </ol>
              <div className="bg-white rounded p-3 mt-2 font-mono text-xs space-y-1">
                <div>EJSMS_CLIENT_ID = <span className="text-blue-600">ejsms-…</span></div>
                <div>EJSMS_CLIENT_SECRET = <span className="text-blue-600">votre_secret</span></div>
                <div>EJSMS_SENDER = <span className="text-blue-600">SMARTCABB</span></div>
                <div>EJSMS_WEBHOOK_SECRET = <span className="text-blue-600">whsec_…</span></div>
              </div>
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
