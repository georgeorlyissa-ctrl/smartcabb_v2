import { Button } from '../ui/button';
import { useState } from 'react';
import { toast } from '../../lib/toast';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

export function AdminAccountSync() {
  const [loading, setLoading] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);
  const [cleanupResult, setCleanupResult] = useState<any>(null);

  const handleSync = async () => {
    setLoading(true);
    setSyncResult(null);

    try {
      console.log('🔄 Synchronisation du compte admin existant...');
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/auth/admin/sync-existing`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );

      const result = await response.json();
      setSyncResult(result);

      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.error);
      }

    } catch (error) {
      console.error('❌ Erreur sync:', error);
      toast.error('Erreur lors de la synchronisation');
    } finally {
      setLoading(false);
    }
  };

  const handleCleanup = async () => {
    setLoading(true);
    setCleanupResult(null);

    try {
      console.log('🧹 Nettoyage des comptes indésirables...');
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/auth/admin/cleanup`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );

      const result = await response.json();
      setCleanupResult(result);

      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.error);
      }

    } catch (error) {
      console.error('❌ Erreur cleanup:', error);
      toast.error('Erreur lors du nettoyage');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-purple-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-600">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Synchronisation Compte Admin</h1>
          <p className="text-gray-600">Configuration du compte contact@smartcabb.com</p>
        </div>

        <div className="space-y-6">
          {/* Étape 1 : Synchroniser */}
          <div className="border border-gray-200 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-blue-600 font-bold">1</span>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Synchroniser le compte admin
                </h3>
                <p className="text-gray-600 mb-4 text-sm">
                  Cette action va créer ou synchroniser le compte <strong>contact@smartcabb.com</strong> avec le mot de passe <strong>Admin123</strong>.
                </p>
                <Button
                  onClick={handleSync}
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {loading ? 'Synchronisation...' : 'Synchroniser maintenant'}
                </Button>
                
                {syncResult && (
                  <div className={`mt-4 p-4 rounded-lg ${syncResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                    <p className={`text-sm font-medium ${syncResult.success ? 'text-green-800' : 'text-red-800'}`}>
                      {syncResult.message || syncResult.error}
                    </p>
                    {syncResult.userId && (
                      <p className="text-xs text-gray-600 mt-2">ID utilisateur : {syncResult.userId}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Étape 2 : Nettoyer */}
          <div className="border border-gray-200 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-red-600 font-bold">2</span>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Nettoyer les comptes indésirables
                </h3>
                <p className="text-gray-600 mb-4 text-sm">
                  Cette action va supprimer les comptes <strong>admin@smartcabb.cd</strong> et <strong>admin@smartcabb.com</strong> créés automatiquement.
                </p>
                <Button
                  onClick={handleCleanup}
                  disabled={loading}
                  variant="destructive"
                  className="w-full"
                >
                  {loading ? 'Nettoyage...' : 'Nettoyer maintenant'}
                </Button>

                {cleanupResult && (
                  <div className={`mt-4 p-4 rounded-lg ${cleanupResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                    <p className={`text-sm font-medium ${cleanupResult.success ? 'text-green-800' : 'text-red-800'}`}>
                      {cleanupResult.message || cleanupResult.error}
                    </p>
                    {cleanupResult.deletedAccounts && cleanupResult.deletedAccounts.length > 0 && (
                      <ul className="text-xs text-gray-600 mt-2 ml-4 list-disc">
                        {cleanupResult.deletedAccounts.map((email: string, index: number) => (
                          <li key={index}>{email}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Instructions finales */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-purple-900 mb-2">
              📝 Instructions
            </h3>
            <ol className="text-sm text-purple-800 space-y-2 ml-4 list-decimal">
              <li>Cliquez sur <strong>"Synchroniser maintenant"</strong> pour configurer votre compte</li>
              <li>Attendez la confirmation de succès</li>
              <li>Cliquez sur <strong>"Nettoyer maintenant"</strong> pour supprimer les comptes indésirables</li>
              <li>Une fois terminé, connectez-vous avec :
                <div className="mt-2 bg-white rounded p-3 border border-purple-200">
                  <p className="font-mono text-sm"><strong>Email :</strong> contact@smartcabb.com</p>
                  <p className="font-mono text-sm"><strong>Mot de passe :</strong> Admin123</p>
                </div>
              </li>
            </ol>
          </div>

          {/* Bouton retour */}
          <div className="text-center pt-4">
            <a 
              href="/admin/login" 
              className="text-purple-600 hover:text-purple-700 font-medium text-sm"
            >
              ← Retour à la connexion
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
