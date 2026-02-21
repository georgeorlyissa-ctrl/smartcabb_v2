/**
 * 🔧 GESTIONNAIRE DE COMPTE SUPPORT
 * Permet de créer/synchroniser le compte support@smartcabb.com
 * 
 * @version 1.0.0
 * @date 2026-02-04
 */

import { useState } from 'react';
import { Shield, RefreshCw, CheckCircle, AlertCircle, Copy, Eye, EyeOff } from 'lucide-react';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

interface SupportAccountManagerProps {
  onBack?: () => void;
}

export function SupportAccountManager({ onBack }: SupportAccountManagerProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const createSupportAccount = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/auth/support/create`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la création du compte');
      }

      setResult(data);
    } catch (err: any) {
      console.error('❌ Erreur création compte support:', err);
      setError(err.message || 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copié dans le presse-papiers !');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                ←
              </button>
            )}
            <Shield className="w-8 h-8 text-cyan-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Gestionnaire de Compte Support
              </h1>
              <p className="text-sm text-gray-600">
                Créer ou synchroniser le compte support@smartcabb.com
              </p>
            </div>
          </div>

          {/* Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-semibold mb-1">À propos de ce compte</p>
                <ul className="space-y-1 text-xs">
                  <li>• Email: <strong>support@smartcabb.com</strong></li>
                  <li>• Mot de passe par défaut: <strong>Support2026!</strong></li>
                  <li>• Rôle: Administrateur</li>
                  <li>• Utilisé pour le support technique et l'assistance</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={createSupportAccount}
            disabled={loading}
            className="w-full bg-gradient-to-r from-cyan-500 to-cyan-600 text-white font-semibold py-4 rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Traitement en cours...
              </>
            ) : (
              <>
                <Shield className="w-5 h-5" />
                Créer/Synchroniser le compte
              </>
            )}
          </button>
        </div>

        {/* Success Result */}
        {result && result.success && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  ✅ Compte créé/synchronisé avec succès !
                </h2>
                <p className="text-sm text-gray-600">{result.message}</p>
              </div>
            </div>

            {/* Credentials */}
            <div className="space-y-4">
              {/* Email */}
              <div className="bg-slate-50 rounded-lg p-4">
                <label className="text-xs font-semibold text-gray-600 mb-2 block">
                  📧 Email
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={result.email}
                    readOnly
                    className="flex-1 bg-white border border-gray-300 rounded-lg px-4 py-2 font-mono text-sm"
                  />
                  <button
                    onClick={() => copyToClipboard(result.email)}
                    className="p-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
                    title="Copier"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Password */}
              <div className="bg-slate-50 rounded-lg p-4">
                <label className="text-xs font-semibold text-gray-600 mb-2 block">
                  🔑 Mot de passe
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={result.password}
                    readOnly
                    className="flex-1 bg-white border border-gray-300 rounded-lg px-4 py-2 font-mono text-sm"
                  />
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
                    title={showPassword ? 'Masquer' : 'Afficher'}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => copyToClipboard(result.password)}
                    className="p-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
                    title="Copier"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* User ID */}
              <div className="bg-slate-50 rounded-lg p-4">
                <label className="text-xs font-semibold text-gray-600 mb-2 block">
                  🆔 User ID
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={result.userId}
                    readOnly
                    className="flex-1 bg-white border border-gray-300 rounded-lg px-4 py-2 font-mono text-xs"
                  />
                  <button
                    onClick={() => copyToClipboard(result.userId)}
                    className="p-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
                    title="Copier"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Note */}
              {result.note && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-sm text-amber-800">
                    💡 <strong>Note:</strong> {result.note}
                  </p>
                </div>
              )}
            </div>

            {/* Login Link */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <a
                href="/app/admin"
                className="block w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold py-3 rounded-xl hover:shadow-lg transition-all text-center"
              >
                🚀 Se connecter au panel admin
              </a>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  ❌ Erreur
                </h2>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            </div>

            <button
              onClick={() => setError(null)}
              className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 rounded-xl transition-all"
            >
              Fermer
            </button>
          </div>
        )}

        {/* Documentation */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            📖 Documentation
          </h2>
          
          <div className="space-y-4 text-sm text-gray-700">
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">
                🔹 Que fait cet outil ?
              </h3>
              <p className="text-xs">
                Cet outil crée ou synchronise le compte <strong>support@smartcabb.com</strong> dans Supabase Auth
                et dans le KV store. Si le compte existe déjà, il met à jour le mot de passe.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-1">
                🔹 Quand l'utiliser ?
              </h3>
              <ul className="text-xs space-y-1">
                <li>• Après un déploiement initial</li>
                <li>• Si le mot de passe a été oublié</li>
                <li>• Pour résynchroniser le compte après des modifications</li>
                <li>• En cas d'erreur d'authentification</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-1">
                🔹 Sécurité
              </h3>
              <p className="text-xs">
                Le mot de passe par défaut <strong>Support2026!</strong> devrait être changé après la première
                connexion pour des raisons de sécurité.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
