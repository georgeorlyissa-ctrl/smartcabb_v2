import { useState } from 'react';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

export function AdminQuickSetup() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const createAdminAccount = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      console.log('🚀 Création du compte admin par défaut...');
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/init-test-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );

      const data = await response.json();
      console.log('📊 Résultat:', data);

      if (data.success) {
        setResult(data);
      } else {
        setError(data.error || 'Erreur inconnue');
      }
    } catch (err) {
      console.error('❌ Erreur:', err);
      setError('Erreur réseau: ' + String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-blue-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🔧</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Configuration Admin Rapide
          </h1>
          <p className="text-sm text-gray-600">
            Créez un compte administrateur par défaut en un clic
          </p>
        </div>

        {!result && !error && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900 font-medium mb-2">
                ℹ️ Ce bouton va créer un compte admin avec :
              </p>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>📧 <strong>Email</strong> : admin@smartcabb.cd</li>
                <li>🔒 <strong>Mot de passe</strong> : Admin123!</li>
                <li>👤 <strong>Rôle</strong> : Administrateur</li>
              </ul>
            </div>

            <button
              onClick={createAdminAccount}
              disabled={loading}
              className="w-full bg-cyan-500 text-white px-6 py-3 rounded-lg hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Création en cours...
                </span>
              ) : (
                '🚀 Créer le compte admin'
              )}
            </button>

            <div className="text-center">
              <a
                href="/admin/diagnostic"
                className="text-sm text-cyan-600 hover:text-cyan-700 underline"
              >
                🔍 Diagnostic avancé
              </a>
            </div>
          </div>
        )}

        {result && (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">✅</span>
                <div className="flex-1">
                  <p className="font-semibold text-green-900 mb-2">
                    {result.message}
                  </p>
                  {result.credentials && (
                    <div className="space-y-2 mt-3">
                      <div className="bg-white rounded p-3 border border-green-200">
                        <p className="text-xs text-green-700 mb-1">Email</p>
                        <p className="text-sm font-mono text-green-900">
                          {result.credentials.email}
                        </p>
                      </div>
                      <div className="bg-white rounded p-3 border border-green-200">
                        <p className="text-xs text-green-700 mb-1">Mot de passe</p>
                        <p className="text-sm font-mono text-green-900">
                          {result.credentials.password}
                        </p>
                      </div>
                    </div>
                  )}
                  {result.note && (
                    <p className="text-sm text-green-700 mt-3 italic">
                      💡 {result.note}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <a
                href="/"
                className="flex-1 bg-cyan-500 text-white px-4 py-3 rounded-lg hover:bg-cyan-600 font-medium text-center transition-colors"
              >
                ← Aller à la page de connexion
              </a>
              <button
                onClick={() => {
                  setResult(null);
                  setError(null);
                }}
                className="px-4 py-3 rounded-lg border border-gray-300 hover:bg-gray-50 font-medium text-gray-700 transition-colors"
              >
                🔄 Recommencer
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">❌</span>
                <div className="flex-1">
                  <p className="font-semibold text-red-900 mb-1">Erreur</p>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setResult(null);
                setError(null);
              }}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 hover:bg-gray-50 font-medium text-gray-700 transition-colors"
            >
              🔄 Réessayer
            </button>
          </div>
        )}

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            SmartCabb Administration • Configuration initiale
          </p>
        </div>
      </div>
    </div>
  );
}
