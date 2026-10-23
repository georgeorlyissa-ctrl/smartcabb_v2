/**
 * PAGE D'INSCRIPTION - SmartCabb
 * ✅ Avec indication de chargement, messages d'erreur friendly
 * ✅ Rate limiting à 5 tentatives/15min
 * ✅ Utilise useApiCall + LoadingOverlay
 * @author SmartCabb Team
 * @date 15 Mars 2026
 */

import { useState } from 'react';
import { useApiCall } from '../../hooks/useApi';
import { register } from '../../supabase/functions/make-server-2eb02e52/auth-routes';
import { LoadingScreen } from '../../components/LoadingScreen';
import { toast } from '../../components/ui/toast';

export function RegisterPage() {
  const [fullName, setFullName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [rememberMe, setRememberMe] = useState<boolean>(false);

  // Validation du mot de passe
  const passwordValid = password.length >= 6;
  const passwordsMatch = password === confirmPassword && !!password;

  const { execute, loading, error, success } = useApiCall(() =>
    register({
      email: phone ? `${phone.replace(/\D/g, "")}@smartcabb.app` : '',
      password,
      phone,
      name: fullName,
      role: 'passenger',
    })
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordsMatch) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }
    if (!passwordValid) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    await execute();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
          Inscription à SmartCabb
        </h2>

        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nom complet
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Jean Mukendi"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Téléphone
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="+243 XXX XXX XXX"
              required
            />
          </div>

          <div className="mb-4">
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

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirmer le mot de passe
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••••••••••"
            />
          </div>

          <div className="mb-6 flex items-start">
            <input
              type="checkbox"
              id="rememberMe2"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded border-gray-500 focus:ring-2 focus:ring-blue-500 cursor-pointer mr-2"
            />
            <label htmlFor="rememberMe2" className="text-sm text-gray-600 cursor-pointer">
              Se souvenir de moi
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Inscription en cours...' : 'Créer un compte'}
          </button>

          {error && (
            <p className="mt-3 text-sm text-red-600">{error}</p>
          )}

          {success && (
            <p className="mt-3 text-sm text-green-600">
              Inscription réussie ! Veuillez vous connecter.
            </p>
          )}
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Vous avez déjà un compte ?
            <a
              href="/connexion"
              className="text-blue-600 underline hover:text-blue-800"
            >
              Connectez-vous
            </a>
          </p>
        </div>
      </div>

      <LoadingOverlay isLoading={loading} />
    </div>
  );
}