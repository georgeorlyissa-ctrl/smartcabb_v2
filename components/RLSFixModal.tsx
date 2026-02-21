import { useState } from 'react';
import { motion } from '../lib/motion'; // ✅ FIX: Utiliser l'implémentation locale
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { 
  AlertCircle, 
  Copy, 
  ExternalLink, 
  RefreshCw,
  CheckCircle,
  XCircle
} from '../lib/icons';
import { MANUAL_SQL_SCRIPT } from '../lib/disable-rls';
import { toast } from '../lib/toast';

interface RLSFixModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RLSFixModal({ isOpen, onClose }: RLSFixModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopySQL = () => {
    navigator.clipboard.writeText(MANUAL_SQL_SCRIPT);
    setCopied(true);
    toast.success('Code SQL copié !');
    
    setTimeout(() => setCopied(false), 3000);
  };

  const handleOpenSupabase = () => {
    // Ouvrir Supabase dans un nouvel onglet
    window.open('https://supabase.com/dashboard', '_blank');
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <AlertCircle className="w-6 h-6 text-red-500" />
            <span>Erreur de récursion infinie détectée</span>
          </DialogTitle>
          <DialogDescription>
            Les politiques RLS de votre base de données causent une boucle infinie.
            Suivez ces étapes pour corriger le problème.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Alert explicatif */}
          <Alert>
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>
              <strong>Problème :</strong> Les politiques de sécurité (RLS) sur la table "profiles" 
              créent une récursion infinie. Vous devez les désactiver dans Supabase.
            </AlertDescription>
          </Alert>

          {/* Étapes */}
          <div className="space-y-4">
            <h3 className="font-semibold">Suivez ces 4 étapes simples :</h3>

            {/* Étape 1 */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="border rounded-lg p-4 bg-blue-50"
            >
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0">
                  1
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold mb-2">Ouvrir Supabase SQL Editor</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Cliquez sur ce bouton pour ouvrir votre dashboard Supabase dans un nouvel onglet
                  </p>
                  <Button onClick={handleOpenSupabase} className="space-x-2">
                    <ExternalLink className="w-4 h-4" />
                    <span>Ouvrir Supabase Dashboard</span>
                  </Button>
                  <p className="text-xs text-gray-500 mt-2">
                    Ensuite, dans le menu de gauche : <strong>SQL Editor</strong> → <strong>New query</strong>
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Étape 2 */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="border rounded-lg p-4 bg-green-50"
            >
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center flex-shrink-0">
                  2
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold mb-2">Copier le code SQL</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Cliquez pour copier le code SQL qui va corriger le problème
                  </p>
                  <Button 
                    onClick={handleCopySQL} 
                    variant={copied ? 'default' : 'outline'}
                    className="space-x-2"
                  >
                    {copied ? (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        <span>Code copié !</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copier le code SQL</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>

            {/* Étape 3 */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="border rounded-lg p-4 bg-purple-50"
            >
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center flex-shrink-0">
                  3
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold mb-2">Coller et exécuter dans Supabase</h4>
                  <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                    <li>Collez le code copié dans l'éditeur SQL de Supabase</li>
                    <li>Cliquez sur le bouton <strong>"Run"</strong> (ou appuyez sur Ctrl+Enter)</li>
                    <li>Attendez que le script se termine (quelques secondes)</li>
                  </ol>
                </div>
              </div>
            </motion.div>

            {/* Étape 4 */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="border rounded-lg p-4 bg-orange-50"
            >
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-orange-600 text-white rounded-full flex items-center justify-center flex-shrink-0">
                  4
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold mb-2">Rafraîchir cette page</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Une fois le script exécuté dans Supabase, revenez ici et rafraîchissez la page
                  </p>
                  <Button onClick={handleRefresh} className="space-x-2">
                    <RefreshCw className="w-4 h-4" />
                    <span>Rafraîchir maintenant</span>
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Code SQL en aperçu */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <h4 className="font-semibold mb-2 text-sm">Aperçu du code SQL :</h4>
            <pre className="text-xs bg-gray-900 text-green-400 p-3 rounded overflow-x-auto max-h-40">
              {MANUAL_SQL_SCRIPT.slice(0, 400)}...
            </pre>
            <p className="text-xs text-gray-500 mt-2">
              Ce code supprime les politiques RLS problématiques et désactive RLS sur toutes les tables.
            </p>
          </div>

          {/* Aide */}
          <Alert>
            <AlertCircle className="w-4 h-4" />
            <AlertDescription className="text-sm">
              <strong>Besoin d'aide ?</strong> Si vous ne voyez pas où aller dans Supabase :
              <br />
              Dashboard → Menu gauche → <strong>SQL Editor</strong> → <strong>New query</strong>
            </AlertDescription>
          </Alert>
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
          <div className="flex space-x-2">
            <Button onClick={handleCopySQL} variant="outline">
              {copied ? <CheckCircle className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
              {copied ? 'Copié' : 'Copier le code'}
            </Button>
            <Button onClick={handleOpenSupabase}>
              <ExternalLink className="w-4 h-4 mr-2" />
              Ouvrir Supabase
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}