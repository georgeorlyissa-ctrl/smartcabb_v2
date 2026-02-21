/**
 * 🧹 BANNIÈRE DE NETTOYAGE AUTOMATIQUE
 * Affiche un bouton pour nettoyer facilement les données
 */

import { useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Trash2, Loader2, CheckCircle, AlertTriangle } from '../../lib/admin-icons';
import { toast } from '../../lib/toast';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

interface AutoCleanupBannerProps {
  onCleanupComplete?: () => void;
}

export function AutoCleanupBanner({ onCleanupComplete }: AutoCleanupBannerProps) {
  const [loading, setLoading] = useState(false);
  const [cleaned, setCleaned] = useState(false);

  const handleCleanup = async () => {
    if (!confirm('⚠️ ATTENTION - SUPPRESSION TOTALE ⚠️\n\nVoulez-vous vraiment supprimer TOUTES les données ?\n\n🗑️ SERA SUPPRIMÉ :\n✅ Toutes les courses\n✅ Tous les chauffeurs (KV + Auth)\n✅ Tous les passagers (KV + Auth)\n✅ Tous les profils non-admin\n✅ Tous les véhicules\n✅ Tous les codes promo\n✅ Toutes les transactions\n✅ Tous les messages\n✅ Tout l\'historique\n\n✅ SERA CONSERVÉ :\n👤 Les comptes ADMIN uniquement\n\n⚠️ Cette action est IRRÉVERSIBLE !\n\nÊtes-vous absolument sûr ?')) {
      return;
    }

    setLoading(true);
    try {
      console.log('🧹 Nettoyage en cours...');
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/cleanup/all`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();

      if (data.success) {
        console.log('✅ NETTOYAGE TERMINÉ !', data.deleted);
        toast.success('✅ Nettoyage terminé avec succès !', {
          description: `${data.deleted.profiles} profils et ${data.deleted.authUsers} utilisateurs supprimés. ${data.adminsConserves} admin(s) conservé(s).`
        });
        setCleaned(true);
        
        // Attendre un peu pour que le backend finisse, puis rafraîchir
        setTimeout(() => {
          if (onCleanupComplete) {
            console.log('🔄 Rafraîchissement des données...');
            onCleanupComplete();
          }
        }, 500);
      } else {
        console.error('❌ Erreur:', data.message);
        toast.error(data.message || 'Erreur lors du nettoyage');
      }
    } catch (error: any) {
      console.error('❌ Erreur:', error);
      toast.error('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  if (cleaned) {
    return (
      <Card className="p-4 bg-green-50 border-green-200 mb-6">
        <div className="flex items-center space-x-3">
          <CheckCircle className="w-6 h-6 text-green-600" />
          <div className="flex-1">
            <h3 className="font-semibold text-green-900">
              ✅ Nettoyage terminé avec succès !
            </h3>
            <p className="text-sm text-green-700">
              Toutes les données de simulation ont été supprimées. Vous pouvez maintenant commencer les tests avec de vraies données.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 bg-orange-50 border-orange-200 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-start space-x-3 flex-1">
          <AlertTriangle className="w-6 h-6 text-orange-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-orange-900 mb-1">
              🧹 Prêt pour les tests avec vraies données ?
            </h3>
            <p className="text-sm text-orange-700">
              Cliquez sur le bouton pour supprimer toutes les données de simulation (courses, chauffeurs, passagers, promos...).
              <span className="block font-semibold mt-1">⚠️ Les profils admins seront conservés, tous les autres profils seront supprimés.</span>
            </p>
          </div>
        </div>
        <Button
          onClick={handleCleanup}
          disabled={loading}
          variant="destructive"
          className="ml-4 flex-shrink-0"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Nettoyage...
            </>
          ) : (
            <>
              <Trash2 className="w-4 h-4 mr-2" />
              Nettoyer maintenant
            </>
          )}
        </Button>
      </div>
    </Card>
  );
}