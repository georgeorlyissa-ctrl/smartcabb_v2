import { useState } from 'react';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { toast } from '../../lib/toast';

export function PhoneMigrationButton() {
  const [loading, setLoading] = useState(false);

  const runMigration = async () => {
    if (!confirm('Voulez-vous normaliser tous les numéros de téléphone dans la base de données? Cette opération peut prendre quelques secondes.')) {
      return;
    }

    setLoading(true);
    try {
      console.log('🔧 Lancement de la migration des numéros de téléphone...');
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/auth/migrate-phone-numbers`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({})
        }
      );

      const data = await response.json();
      console.log('📥 Résultat migration:', data);
      
      if (data.success) {
        toast.success(`✅ Migration réussie! ${data.totalUpdated} profils mis à jour.`);
        if (data.errors && data.errors.length > 0) {
          toast.error(`⚠️ ${data.errors.length} erreurs détectées. Vérifiez la console.`);
          console.error('Erreurs de migration:', data.errors);
        }
      } else {
        toast.error(`❌ Erreur migration: ${data.error}`);
      }
    } catch (error) {
      console.error('❌ Erreur:', error);
      toast.error('Erreur lors de la migration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={runMigration}
      disabled={loading}
      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
    >
      {loading ? (
        <>
          <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
          Migration en cours...
        </>
      ) : (
        <>
          🔧 Migrer les numéros de téléphone
        </>
      )}
    </button>
  );
}
