import { useState } from 'react';
import { Button } from '../ui/button';
import { toast } from '../../lib/toast';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { AlertCircle, CheckCircle, Wrench, RefreshCw, Users } from '../../lib/icons';

/**
 * 🔧 PAGE DE RÉPARATION DES EMAILS MALFORMÉS
 * 
 * PROBLÈME IDENTIFIÉ:
 * Les anciens utilisateurs ont été créés avec des emails au format:
 * ❌ u+243XXXXXXXXX@smartcabb.app (AVEC le +)
 * 
 * Le code actuel génère des emails au format:
 * ✅ u243XXXXXXXXX@smartcabb.app (SANS le +)
 * 
 * Résultat: Les utilisateurs existants ne peuvent pas se connecter car
 * le frontend cherche "u243..." mais dans Supabase c'est "u+243..."
 * 
 * SOLUTIONS:
 * 1. RECOMMANDÉE: Supprimer et recréer les utilisateurs avec le bon format
 * 2. ALTERNATIVE: Modifier manuellement dans Supabase Dashboard
 */

interface UserWithBadEmail {
  id: string;
  email: string;
  full_name: string;
  phone: string;
}

export function FixEmailsPage() {
  const [loading, setLoading] = useState(false);
  const [diagnosing, setDiagnosing] = useState(false);
  const [usersWithBadEmails, setUsersWithBadEmails] = useState<UserWithBadEmail[]>([]);
  const [fixed, setFixed] = useState<string[]>([]);

  /**
   * Diagnostique les utilisateurs avec emails malformés
   */
  const diagnoseUsers = async () => {
    setDiagnosing(true);
    setUsersWithBadEmails([]);
    
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/fix-emails/diagnose`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();

      if (data.success && data.users) {
        setUsersWithBadEmails(data.users);
        if (data.users.length === 0) {
          toast.success('✅ Aucun email malformé détecté !');
        } else {
          toast.info(`🔍 ${data.users.length} utilisateur(s) avec emails malformés détecté(s)`);
        }
      } else {
        toast.error('Erreur lors du diagnostic');
      }
    } catch (error) {
      console.error('Erreur diagnostic:', error);
      toast.error('Erreur lors du diagnostic. Vérifiez la console.');
    } finally {
      setDiagnosing(false);
    }
  };

  /**
   * Répare automatiquement les emails malformés
   */
  const fixEmails = async () => {
    if (usersWithBadEmails.length === 0) {
      toast.error('Aucun utilisateur à réparer');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/fix-emails/fix-all`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();

      if (data.success) {
        const successCount = data.successCount || 0;
        const totalProcessed = data.totalProcessed || 0;
        
        if (successCount === totalProcessed) {
          toast.success(`✅ ${successCount} email(s) réparé(s) avec succès !`);
        } else {
          toast.error(`⚠️ ${successCount}/${totalProcessed} email(s) réparé(s)`);
        }
        
        // Afficher les détails dans la console
        console.log('📊 Résultats de la réparation:', data.results);
        
        // Afficher un message important sur les mots de passe
        if (successCount > 0) {
          toast.info(
            '⚠️ IMPORTANT: Les utilisateurs doivent réinitialiser leur mot de passe',
            { duration: 10000 }
          );
        }
        
        // Relancer le diagnostic pour vérifier
        setTimeout(() => diagnoseUsers(), 2000);
      } else {
        toast.error(`Erreur: ${data.error || 'Erreur inconnue'}`);
      }
    } catch (error) {
      console.error('Erreur réparation:', error);
      toast.error('Erreur lors de la réparation. Vérifiez la console.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center">
              <Wrench className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Réparation des emails malformés
              </h1>
              <p className="text-sm text-gray-500">
                Correction automatique des emails avec "+" dans le format
              </p>
            </div>
          </div>

          {/* Explication du problème */}
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg mb-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-red-900 font-medium mb-2">
                  🔍 Problème détecté : Format d'email incompatible
                </p>
                <div className="text-sm text-red-800 space-y-1">
                  <div>❌ <strong>Format ancien (incorrect) :</strong> <code className="bg-red-100 px-2 py-0.5 rounded">u+243XXXXXXXXX@smartcabb.app</code></div>
                  <div>✅ <strong>Format actuel (correct) :</strong> <code className="bg-green-100 px-2 py-0.5 rounded">u243XXXXXXXXX@smartcabb.app</code></div>
                  <div className="mt-2 pt-2 border-t border-red-200">
                    <strong>Conséquence :</strong> Les utilisateurs avec l'ancien format ne peuvent pas se connecter car le système de connexion cherche le nouveau format.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Boutons d'action */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Button
              onClick={diagnoseUsers}
              disabled={diagnosing || loading}
              className="bg-blue-500 hover:bg-blue-600 text-white"
            >
              {diagnosing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                  Diagnostic en cours...
                </>
              ) : (
                <>
                  <RefreshCw className="w-5 h-5 mr-2" />
                  Lancer le diagnostic
                </>
              )}
            </Button>

            <Button
              onClick={fixEmails}
              disabled={loading || diagnosing || usersWithBadEmails.length === 0}
              className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                  Réparation en cours...
                </>
              ) : (
                <>
                  <Wrench className="w-5 h-5 mr-2" />
                  Réparer automatiquement
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Résultats du diagnostic */}
        {usersWithBadEmails.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Utilisateurs affectés ({usersWithBadEmails.length})
            </h2>
            <div className="space-y-3">
              {usersWithBadEmails.map((user) => {
                const isFixed = fixed.includes(user.id);
                const correctEmail = user.email.replace('u+', 'u');

                return (
                  <div key={user.id} className={`p-4 rounded-xl border-2 ${
                    isFixed ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'
                  }`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="font-semibold text-gray-900">{user.full_name}</div>
                          {isFixed && (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          )}
                        </div>
                        <div className="text-sm space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-600">📱 Téléphone:</span>
                            <code className="text-gray-900 font-mono">{user.phone}</code>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-600">❌ Email actuel:</span>
                            <code className="bg-red-100 text-red-800 px-2 py-0.5 rounded font-mono text-xs">
                              {user.email}
                            </code>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-600">✅ Email corrigé:</span>
                            <code className="bg-green-100 text-green-800 px-2 py-0.5 rounded font-mono text-xs">
                              {correctEmail}
                            </code>
                          </div>
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                        isFixed 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-orange-100 text-orange-800'
                      }`}>
                        {isFixed ? 'Réparé' : 'À réparer'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Instructions alternatives */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Solutions alternatives
          </h2>
          <div className="space-y-4 text-sm text-gray-700">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="font-semibold text-blue-900 mb-2">
                💡 Option 1 : Réparation automatique (Recommandée)
              </div>
              <div className="text-blue-800">
                Utilisez le bouton "Réparer automatiquement" ci-dessus. Cette fonction corrige les emails directement dans Supabase Auth.
              </div>
            </div>

            <div className="p-4 bg-purple-50 rounded-lg">
              <div className="font-semibold text-purple-900 mb-2">
                🔄 Option 2 : Recréer les utilisateurs
              </div>
              <div className="text-purple-800 space-y-1">
                <div>1. Supprimer les utilisateurs problématiques dans Supabase Auth Dashboard</div>
                <div>2. Aller sur <code className="bg-purple-100 px-1 rounded">/admin/create-test-users</code></div>
                <div>3. Créer de nouveaux utilisateurs de test avec le format correct</div>
              </div>
            </div>

            <div className="p-4 bg-yellow-50 rounded-lg">
              <div className="font-semibold text-yellow-900 mb-2">
                ✏️ Option 3 : Correction manuelle
              </div>
              <div className="text-yellow-800 space-y-1">
                <div>1. Ouvrir Supabase Dashboard → Authentication → Users</div>
                <div>2. Pour chaque utilisateur affecté, modifier l'email manuellement</div>
                <div>3. Retirer le "+" du format : <code className="bg-yellow-100 px-1 rounded">u+243...</code> → <code className="bg-green-100 px-1 rounded">u243...</code></div>
              </div>
            </div>
          </div>
        </div>

        {/* Note technique */}
        <div className="mt-6 bg-gray-50 rounded-xl p-4">
          <div className="text-xs text-gray-600 space-y-1">
            <div><strong>📋 Note technique :</strong></div>
            <div>• Le frontend génère les emails au format <code>u243XXXXXXXXX@smartcabb.app</code> (ligne 100 de /lib/auth-service.ts)</div>
            <div>• Le backend génère également ce format (lignes 1194, 1406, 1722 de /supabase/functions/server/index.tsx)</div>
            <div>• Les anciens utilisateurs ont été créés avec un format incompatible contenant le caractère "+"</div>
            <div>• Cette page automatise la correction pour éviter les modifications manuelles</div>
          </div>
        </div>
      </div>
    </div>
  );
}
