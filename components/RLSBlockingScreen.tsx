import { useState } from 'react';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { 
  AlertTriangle, 
  Copy, 
  ExternalLink, 
  RefreshCw,
  CheckCircle,
  ArrowRight,
  Loader2,
  Zap
} from '../lib/icons';
import { toast } from '../lib/toast';
import { projectId, publicAnonKey } from '../utils/supabase/info';

const SQL_SCRIPT = `-- 🚨 COPIEZ-COLLEZ CE CODE DANS SUPABASE MAINTENANT
-- Cette solution BRUTALE supprime toutes les policies et désactive RLS

-- ÉTAPE 1 : Supprimer toutes les policies
DO $
DECLARE r RECORD;
BEGIN
  FOR r IN (
    SELECT schemaname, tablename, policyname 
    FROM pg_policies 
    WHERE schemaname = 'public'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I CASCADE', 
      r.policyname, r.schemaname, r.tablename);
  END LOOP;
  RAISE NOTICE '✅ Toutes les policies supprimées';
END $;

-- ÉTAPE 2 : Désactiver RLS sur toutes les tables
DO $
DECLARE r RECORD;
BEGIN
  FOR r IN (
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  ) LOOP
    EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', r.tablename);
  END LOOP;
  RAISE NOTICE '✅ RLS désactivé sur toutes les tables';
END $;

-- ÉTAPE 3 : Vérifier le résultat
SELECT tablename AS "Table",
  CASE rowsecurity
    WHEN true THEN '❌ ACTIVÉ'
    WHEN false THEN '✅ DÉSACTIVÉ'
  END AS "Statut RLS"
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;`;

export function RLSBlockingScreen() {
  const [copied, setCopied] = useState(false);
  const [step, setStep] = useState(1);
  const [isFixing, setIsFixing] = useState(false);
  const [autoFixError, setAutoFixError] = useState<string | null>(null);

  const handleCopySQL = () => {
    navigator.clipboard.writeText(SQL_SCRIPT);
    setCopied(true);
    toast.success('✅ Code SQL copié dans le presse-papier !');
    setStep(2);
    
    setTimeout(() => setCopied(false), 5000);
  };

  const handleOpenSupabase = () => {
    window.open('https://supabase.com/dashboard', '_blank');
    setStep(3);
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleAutoFix = async () => {
    setIsFixing(true);
    setAutoFixError(null);
    
    try {
      toast.info('🔧 Tentative de correction automatique...');
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/disable-rls`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const result = await response.json();

      if (result.success) {
        toast.success('✅ RLS désactivé ! Rafraîchissement...');
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        setAutoFixError(result.error || 'Échec de la correction automatique');
        toast.error('❌ Correction automatique échouée. Utilisez la méthode manuelle.');
      }
    } catch (error) {
      console.error('Erreur auto-fix:', error);
      setAutoFixError('Impossible de contacter le serveur');
      toast.error('❌ Erreur réseau. Utilisez la méthode manuelle.');
    } finally {
      setIsFixing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-red-500 via-orange-500 to-red-600 flex items-center justify-center p-4 z-[9999]">
      <div className="max-w-4xl w-full bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-red-600 text-white p-6">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center animate-pulse">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Action requise immédiatement</h1>
              <p className="text-red-100 mt-1">
                Votre base de données a un problème critique qui empêche l'utilisation de l'application
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 space-y-6">
          {/* Alert */}
          <Alert className="bg-red-50 border-red-200">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <AlertDescription className="text-red-900">
              <strong>Erreur :</strong> Récursion infinie détectée dans les politiques RLS (Row Level Security).
              <br />
              Vous devez désactiver RLS pour continuer.
            </AlertDescription>
          </Alert>

          {/* Bouton de correction automatique */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl p-6">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0 animate-pulse">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  ⚡ Correction automatique disponible !
                </h3>
                <p className="text-gray-700 mb-4">
                  Cliquez sur ce bouton pour corriger le problème automatiquement en 1 clic.
                  Pas besoin d'aller dans Supabase !
                </p>
                <Button
                  onClick={handleAutoFix}
                  disabled={isFixing}
                  size="lg"
                  className="bg-green-600 hover:bg-green-700 text-white space-x-2"
                >
                  {isFixing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Correction en cours...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5" />
                      <span>Corriger automatiquement maintenant</span>
                    </>
                  )}
                </Button>
                {autoFixError && (
                  <Alert className="mt-4 bg-yellow-50 border-yellow-200">
                    <AlertTriangle className="w-4 h-4 text-yellow-600" />
                    <AlertDescription className="text-yellow-900 text-sm">
                      {autoFixError}. Utilisez la méthode manuelle ci-dessous.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          </div>

          {/* Séparateur */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500 font-semibold">
                OU utilisez la méthode manuelle
              </span>
            </div>
          </div>

          {/* Instructions */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900">
              Suivez ces 3 étapes maintenant :
            </h2>

            {/* Étape 1 */}
            <div className={`border-2 rounded-xl p-6 transition-all ${step >= 1 ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
              <div className="flex items-start space-x-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xl font-bold ${step >= 1 ? 'bg-blue-600' : 'bg-gray-400'}`}>
                  1
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    Copier le code SQL
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Cliquez sur ce bouton pour copier le code qui va corriger le problème
                  </p>
                  <Button 
                    onClick={handleCopySQL}
                    size="lg"
                    className="space-x-2"
                    variant={copied ? 'default' : 'outline'}
                  >
                    {copied ? (
                      <>
                        <CheckCircle className="w-5 h-5" />
                        <span>Code copié !</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-5 h-5" />
                        <span>Copier le code SQL</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Étape 2 */}
            <div className={`border-2 rounded-xl p-6 transition-all ${step >= 2 ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
              <div className="flex items-start space-x-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xl font-bold ${step >= 2 ? 'bg-green-600' : 'bg-gray-400'}`}>
                  2
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    Ouvrir Supabase et exécuter le code
                  </h3>
                  <div className="space-y-3">
                    <p className="text-gray-600">
                      Cliquez sur ce bouton pour ouvrir votre dashboard Supabase :
                    </p>
                    <Button 
                      onClick={handleOpenSupabase}
                      size="lg"
                      className="space-x-2 bg-green-600 hover:bg-green-700"
                    >
                      <ExternalLink className="w-5 h-5" />
                      <span>Ouvrir Supabase Dashboard</span>
                    </Button>
                    <div className="bg-white border border-green-200 rounded-lg p-4 space-y-2">
                      <p className="text-sm font-semibold text-gray-900">Dans Supabase, suivez ces étapes :</p>
                      <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
                        <li>Dans le menu de gauche, cliquez sur <strong>"SQL Editor"</strong></li>
                        <li>Cliquez sur <strong>"New query"</strong></li>
                        <li>Collez le code copié (Ctrl+V)</li>
                        <li>Cliquez sur <strong>"Run"</strong> ou appuyez sur Ctrl+Enter</li>
                        <li>Attendez que le script se termine (quelques secondes)</li>
                      </ol>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Étape 3 */}
            <div className={`border-2 rounded-xl p-6 transition-all ${step >= 3 ? 'border-purple-500 bg-purple-50' : 'border-gray-200'}`}>
              <div className="flex items-start space-x-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xl font-bold ${step >= 3 ? 'bg-purple-600' : 'bg-gray-400'}`}>
                  3
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    Rafraîchir cette page
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Une fois le script exécuté dans Supabase, revenez ici et cliquez sur ce bouton :
                  </p>
                  <Button 
                    onClick={handleRefresh}
                    size="lg"
                    className="space-x-2 bg-purple-600 hover:bg-purple-700"
                  >
                    <RefreshCw className="w-5 h-5" />
                    <span>Rafraîchir maintenant</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Code preview */}
          <div className="border-2 border-gray-200 rounded-xl p-4 bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-sm text-gray-700">
                Aperçu du code SQL :
              </h3>
              <Button 
                onClick={handleCopySQL}
                size="sm"
                variant="outline"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copier
              </Button>
            </div>
            <pre className="text-xs bg-gray-900 text-green-400 p-4 rounded overflow-x-auto max-h-48 overflow-y-auto">
              {SQL_SCRIPT}
            </pre>
          </div>

          {/* Help */}
          <Alert className="bg-blue-50 border-blue-200">
            <AlertTriangle className="w-5 h-5 text-blue-600" />
            <AlertDescription className="text-blue-900">
              <strong>Besoin d'aide ?</strong> Cette erreur est causée par des politiques de sécurité mal configurées.
              Le script SQL ci-dessus va les désactiver pour votre environnement de développement.
            </AlertDescription>
          </Alert>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-8 py-4 border-t">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              SmartCabb ne fonctionnera pas tant que ce problème n'est pas résolu
            </p>
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Vérifier si c'est résolu
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}