import { useState } from 'react';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

export function AdminLoginDiagnostic() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('Admin SmartCabb');
  const [diagnostic, setDiagnostic] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [fixResult, setFixResult] = useState<any>(null);

  const runDiagnostic = async () => {
    if (!email) {
      alert('Veuillez entrer un email');
      return;
    }

    setLoading(true);
    setDiagnostic(null);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/auth/admin/diagnostic`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({ email })
        }
      );

      const data = await response.json();
      console.log('📊 Diagnostic:', data);

      if (data.success) {
        setDiagnostic(data.diagnostic);
      } else {
        alert('Erreur: ' + data.error);
      }
    } catch (error) {
      console.error('Erreur diagnostic:', error);
      alert('Erreur réseau: ' + String(error));
    } finally {
      setLoading(false);
    }
  };

  const fixAccount = async () => {
    if (!email || !password) {
      alert('Email et mot de passe requis');
      return;
    }

    if (password.length < 6) {
      alert('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setFixing(true);
    setFixResult(null);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/auth/admin/fix`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({ email, password, fullName })
        }
      );

      const data = await response.json();
      console.log('🔧 Fix result:', data);

      if (data.success) {
        setFixResult(data);
        // Re-run diagnostic
        await runDiagnostic();
      } else {
        alert('Erreur: ' + data.error);
      }
    } catch (error) {
      console.error('Erreur fix:', error);
      alert('Erreur réseau: ' + String(error));
    } finally {
      setFixing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            🔍 Diagnostic Compte Admin
          </h1>

          <div className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="admin@smartcabb.cd"
              />
            </div>

            {/* Nom complet (pour fix) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom complet (pour réparation)
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Admin SmartCabb"
              />
            </div>

            {/* Mot de passe (pour fix) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mot de passe (pour réparation)
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Minimum 6 caractères"
              />
            </div>

            {/* Boutons */}
            <div className="flex gap-3">
              <button
                onClick={runDiagnostic}
                disabled={loading || !email}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Analyse...' : '🔍 Analyser'}
              </button>

              <button
                onClick={fixAccount}
                disabled={fixing || !email || !password}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {fixing ? 'Réparation...' : '🔧 Réparer/Créer'}
              </button>
            </div>
          </div>

          {/* Résultat diagnostic */}
          {diagnostic && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                📊 Résultat du diagnostic
              </h2>

              <div className="space-y-3">
                {/* Status général */}
                <div className={`p-3 rounded-md ${diagnostic.canLogin ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  <p className={`font-semibold ${diagnostic.canLogin ? 'text-green-800' : 'text-red-800'}`}>
                    {diagnostic.canLogin ? '✅ Peut se connecter' : '❌ Ne peut PAS se connecter'}
                  </p>
                </div>

                {/* Supabase Auth */}
                <div className="p-3 bg-white rounded-md border border-gray-200">
                  <p className="font-medium text-gray-900 mb-2">
                    Supabase Auth: {diagnostic.existsInAuth ? '✅ Existe' : '❌ N\'existe pas'}
                  </p>
                  {diagnostic.authData && (
                    <pre className="text-xs text-gray-600 bg-gray-50 p-2 rounded overflow-x-auto">
                      {JSON.stringify(diagnostic.authData, null, 2)}
                    </pre>
                  )}
                </div>

                {/* KV Store */}
                <div className="p-3 bg-white rounded-md border border-gray-200">
                  <p className="font-medium text-gray-900 mb-2">
                    KV Store: {diagnostic.existsInKV ? '✅ Existe' : '❌ N\'existe pas'}
                  </p>
                  {diagnostic.kvData && (
                    <pre className="text-xs text-gray-600 bg-gray-50 p-2 rounded overflow-x-auto">
                      {JSON.stringify(diagnostic.kvData, null, 2)}
                    </pre>
                  )}
                </div>

                {/* Problèmes détectés */}
                {diagnostic.issues.length > 0 && (
                  <div className="p-3 bg-yellow-50 rounded-md border border-yellow-200">
                    <p className="font-medium text-yellow-900 mb-2">
                      ⚠️ Problèmes détectés:
                    </p>
                    <ul className="list-disc list-inside space-y-1">
                      {diagnostic.issues.map((issue: string, idx: number) => (
                        <li key={idx} className="text-sm text-yellow-800">{issue}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Recommandations */}
                {diagnostic.fixes.length > 0 && (
                  <div className="p-3 bg-blue-50 rounded-md border border-blue-200">
                    <p className="font-medium text-blue-900 mb-2">
                      💡 Recommandations:
                    </p>
                    <ul className="list-disc list-inside space-y-1">
                      {diagnostic.fixes.map((fix: string, idx: number) => (
                        <li key={idx} className="text-sm text-blue-800">{fix}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Résultat réparation */}
          {fixResult && (
            <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
              <h3 className="text-lg font-semibold text-green-900 mb-2">
                ✅ {fixResult.message}
              </h3>
              {fixResult.canLogin && (
                <div className="text-sm text-green-800 space-y-1">
                  <p>Vous pouvez maintenant vous connecter avec:</p>
                  <p className="font-mono bg-white p-2 rounded">
                    Email: {email}
                  </p>
                  <p className="font-mono bg-white p-2 rounded">
                    Mot de passe: (celui que vous avez entré)
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Instructions */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">
              📖 Instructions
            </h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
              <li>Entrez votre email admin</li>
              <li>Cliquez sur "🔍 Analyser" pour vérifier le compte</li>
              <li>Si le compte n'existe pas, entrez un mot de passe et cliquez sur "🔧 Réparer/Créer"</li>
              <li>Retournez sur la page de connexion et connectez-vous</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
