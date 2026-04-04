import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { toast } from '../../lib/toast';
import { Trash2, AlertTriangle, CheckCircle } from 'lucide-react';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

/**
 * 🗑️ PAGE DE PURGE D'UTILISATEUR
 * 
 * Permet de :
 * - Purger complètement un utilisateur de Supabase Auth par email
 * - Libérer un email pour créer un nouveau compte
 * - Utile quand un compte a été supprimé mais l'email reste réservé
 */
export function PurgeUserPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handlePurge = async () => {
    if (!email || !email.trim()) {
      toast.error('Veuillez entrer un email');
      return;
    }

    // Confirmation de sécurité
    const confirmed = window.confirm(
      `⚠️ ATTENTION : Cette action va SUPPRIMER DÉFINITIVEMENT l'utilisateur avec l'email:\n\n${email}\n\nCette action est IRRÉVERSIBLE.\n\nContinuer ?`
    );

    if (!confirmed) {
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      console.log('🗑️ Purge de l\'utilisateur:', email);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/purge/purge-user-by-email`,
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

      if (!data.success) {
        toast.error(data.error || 'Erreur lors de la purge');
        setResult({ success: false, error: data.error });
        setLoading(false);
        return;
      }

      console.log('✅ Purge réussie:', data);
      toast.success(`✅ ${data.message}`);
      setResult(data);
      setEmail(''); // Réinitialiser le champ

    } catch (error: any) {
      console.error('❌ Erreur purge:', error);
      toast.error('Erreur: ' + (error.message || 'Erreur inconnue'));
      setResult({ success: false, error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Purge d'utilisateur
              </h1>
              <p className="text-sm text-gray-600">
                Suppression définitive d'un compte Supabase
              </p>
            </div>
          </div>

          {/* Warning */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-red-900">
                <p className="font-semibold mb-2">⚠️ Action irréversible</p>
                <ul className="space-y-1 text-xs">
                  <li>• Supprime DÉFINITIVEMENT le compte de Supabase Auth</li>
                  <li>• Libère l'email pour permettre de créer un nouveau compte</li>
                  <li>• Nettoie les données du KV store</li>
                  <li>• À utiliser uniquement si un compte a été supprimé mais l'email reste bloqué</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="email">Email à purger</Label>
              <Input
                id="email"
                type="email"
                placeholder="exemple@smartcabb.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2"
                disabled={loading}
              />
              <p className="text-xs text-gray-500 mt-1">
                Entrez l'email du compte à supprimer définitivement
              </p>
            </div>

            <Button
              onClick={handlePurge}
              disabled={loading || !email.trim()}
              className="w-full bg-red-600 hover:bg-red-700 text-white"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Suppression en cours...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <Trash2 className="w-4 h-4" />
                  <span>Purger définitivement</span>
                </div>
              )}
            </Button>
          </div>
        </div>

        {/* Result */}
        {result && (
          <div className={`rounded-xl shadow-md p-6 ${
            result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
          }`}>
            <div className="flex items-start gap-3">
              {result.success ? (
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              )}
              <div className="flex-1">
                <p className={`font-semibold mb-2 ${
                  result.success ? 'text-green-900' : 'text-red-900'
                }`}>
                  {result.success ? '✅ Purge réussie' : '❌ Erreur'}
                </p>
                <p className={`text-sm ${
                  result.success ? 'text-green-800' : 'text-red-800'
                }`}>
                  {result.message || result.error}
                </p>

                {result.purged_user && (
                  <div className="mt-3 p-3 bg-white rounded-lg border border-green-300">
                    <p className="text-xs font-semibold text-gray-700 mb-1">
                      Utilisateur supprimé :
                    </p>
                    <ul className="text-xs text-gray-600 space-y-0.5">
                      <li>• ID: {result.purged_user.id}</li>
                      <li>• Email: {result.purged_user.email}</li>
                      <li>• Créé le: {new Date(result.purged_user.created_at).toLocaleString('fr-FR')}</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mt-6">
          <p className="text-sm text-blue-900 font-semibold mb-3">
            💡 Cas d'usage
          </p>
          <div className="space-y-3 text-sm text-blue-800">
            <div>
              <p className="font-medium">Problème :</p>
              <p className="text-xs">
                Vous supprimez un compte admin depuis Supabase Dashboard, mais quand vous essayez
                de créer un nouveau compte avec le même email, vous obtenez l'erreur "Un compte existe déjà".
              </p>
            </div>
            <div>
              <p className="font-medium">Cause :</p>
              <p className="text-xs">
                Supabase fait une suppression "douce" (soft delete). Le compte est marqué comme supprimé
                mais l'email reste réservé dans la base de données.
              </p>
            </div>
            <div>
              <p className="font-medium">Solution :</p>
              <p className="text-xs">
                Utilisez cette page pour purger complètement le compte. L'email sera libéré et vous
                pourrez créer un nouveau compte avec le même email.
              </p>
            </div>
          </div>
        </div>

        {/* Alternative */}
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-6 mt-6">
          <p className="text-sm text-purple-900 font-semibold mb-2">
            🚀 Alternative : Création avec purge automatique
          </p>
          <p className="text-xs text-purple-800 mb-3">
            Au lieu de purger manuellement puis créer, vous pouvez utiliser la page de création
            d'admin qui purge automatiquement l'ancien compte si nécessaire.
          </p>
          <Button
            onClick={() => window.location.href = '/admin/signup'}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white"
          >
            → Créer un compte admin (avec purge auto)
          </Button>
        </div>
      </div>
    </div>
  );
}
