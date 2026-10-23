/**
 * PAGE DE CONNEXION - SmartCabb
 * ✅ Avec indication de chargement, messages d'erreur friendly
 * ✅ Intègre la limitation de taux (rate limit) à 5 tentatives/15min
 * ✅ Utilise le hook useApiCall avec LoadingOverlay
 * @author SmartCabb Team
 * @date 15 Mars 2026
 */

import { useState } from 'react';
import { useApiCall } from '../../hooks/useApi';
import { login } from '../../supabase/functions/make-server-2eb02e52/auth-routes';
import { LoadingScreen } from '../../components/LoadingScreen';
import { toast } from '../../components/ui/toast';

export function LoginPage() {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [rememberMe, setRememberMe] = useState<boolean>(false);

  const { execute, loading, error, success } = useApiCall(() =>
    login({ email, password })
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await execute();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
          Connexion à SmartCabb
        </h2>

        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="votre@email.com"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••••••••••"
              required
            />
          </div>

          <div className="mb-6 flex items-start">
            <input
              type="checkbox"
              id="rememberMe"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded border-gray-500 focus:ring-2 focus:ring-blue-500 cursor-pointer mr-2"
            />
            <label htmlFor="rememberMe" className="text-sm text-gray-600 cursor-pointer">
              Se souvenir de moi
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Connexion en cours...' : 'Se connecter'}
          </button>

          {error && (
            <p className="mt-3 text-sm text-red-600">{error}</p>
          )}

          {success && (
            <p className="mt-3 text-sm text-green-600">
              Connexion réussie ! Redirection...
            </p>
          )}
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Vous n'avez pas de compte ?
            <a
              href="/inscription"
              className="text-blue-600 underline hover:text-blue-800"
            >
              Créez-en un
            </a>
          </p>
        </div>
      </div>

      <LoadingOverlay isLoading={loading} />
    </div>
  );
}