import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';

const BASE_URL = 'https://zaerjqchzqmcxqblkfkg.supabase.co/functions/v1/make-server-2eb02e52';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InphZXJqcWNoenFtY3hxYmxrZmtnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxNDMyOTgsImV4cCI6MjA3NTcxOTI5OH0.qwFRKsi9Gw4VVYoEGBBCIj0-lAZOxtqlGQ0eT6cPhik';

interface SystemStatus {
  success: boolean;
  status: {
    drivers: {
      total: number;
      online: number;
      offline: number;
      details: Array<{
        name: string;
        phone: string;
        isOnline: boolean;
        rating: number;
        location?: {
          hasGPS: boolean;
          lat?: number;
          lng?: number;
        };
      }>;
    };
    rides: {
      total: number;
      pending: number;
      accepted: number;
      completed: number;
      cancelled: number;
    };
    environment: {
      hasFirebase: boolean;
      hasAfricasTalking: boolean;
      hasSupabase: boolean;
    };
  };
}

interface DeleteResponse {
  success: boolean;
  message: string;
  count: number;
  totalKeysDeleted?: number;
  deletionReport?: Record<string, number>;
  summary?: string;
}

export default function AdminCleanSystem() {
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);

  const getSystemStatus = async () => {
    try {
      setLoading(true);
      setResult('⏳ Récupération du statut système...');
      
      const response = await fetch(`${BASE_URL}/admin/system-status`, {
        headers: {
          'Authorization': `Bearer ${ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      const data: SystemStatus = await response.json();
      
      setSystemStatus(data);
      setResult(JSON.stringify(data, null, 2));
      
      if (data.success) {
        const summary = `
✅ STATUT DU SYSTÈME

👨‍✈️ CONDUCTEURS:
   - Total: ${data.status.drivers.total}
   - En ligne: ${data.status.drivers.online}
   - Hors ligne: ${data.status.drivers.offline}

🚗 COURSES:
   - Total: ${data.status.rides.total}
   - En attente: ${data.status.rides.pending}
   - Acceptées: ${data.status.rides.accepted}

🔧 ENVIRONNEMENT:
   - Firebase: ${data.status.environment.hasFirebase ? '✅' : '❌'}
   - Africa's Talking: ${data.status.environment.hasAfricasTalking ? '✅' : '❌'}
   - Supabase: ${data.status.environment.hasSupabase ? '✅' : '❌'}

${data.status.drivers.details.length > 0 ? '\n📋 DÉTAILS DES CONDUCTEURS:\n' + data.status.drivers.details.map(d => 
    `   - ${d.name} (${d.phone}): ${d.isOnline ? '🟢 EN LIGNE' : '🔴 HORS LIGNE'} | GPS: ${d.location?.hasGPS ? '✅' : '❌'} | Note: ${d.rating}/5`
).join('\n') : ''}
`;
        alert(summary);
      }
    } catch (error: any) {
      setResult(`❌ ERREUR: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const deleteAllRides = async () => {
    if (!confirm('⚠️ ATTENTION ! Voulez-vous vraiment supprimer TOUTES les courses ?\n\nCette action est irréversible.')) {
      return;
    }

    try {
      setLoading(true);
      setResult('⏳ Suppression de toutes les courses...');
      
      const response = await fetch(`${BASE_URL}/admin/delete-all-rides`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      const data: DeleteResponse = await response.json();
      
      setResult(JSON.stringify(data, null, 2));
      
      if (data.success) {
        alert(`✅ ${data.count} course(s) supprimée(s) avec succès !`);
        // Rafraîchir le statut
        await getSystemStatus();
      }
    } catch (error: any) {
      setResult(`❌ ERREUR: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const deleteAllDrivers = async () => {
    if (!confirm('⚠️ ATTENTION ! Voulez-vous vraiment supprimer TOUS les conducteurs ?\n\nCette action est irréversible.\n\nLes comptes Supabase Auth ne seront PAS supprimés, seulement les données du KV store.')) {
      return;
    }

    try {
      setLoading(true);
      setResult('⏳ Suppression de tous les conducteurs...');
      
      console.log('🗑️ Début suppression conducteurs...');
      console.log('📡 URL:', `${BASE_URL}/admin/delete-all-drivers`);
      
      const response = await fetch(`${BASE_URL}/admin/delete-all-drivers`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('📡 Status:', response.status);
      console.log('📡 Status Text:', response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Erreur HTTP:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const data: DeleteResponse = await response.json();
      
      console.log('✅ Réponse:', data);
      setResult(JSON.stringify(data, null, 2));
      
      if (data.success) {
        alert(`✅ ${data.count} conducteur(s) supprimé(s) avec succès !\n\n${data.totalKeysDeleted || 0} clés nettoyées au total.`);
        // Rafraîchir le statut
        console.log('🔄 Rafraîchissement du statut...');
        await getSystemStatus();
      } else {
        alert(`❌ ERREUR: ${data.message || 'Erreur inconnue'}`);
      }
    } catch (error: any) {
      console.error('❌ Exception:', error);
      const errorMsg = `❌ ERREUR: ${error.message}`;
      setResult(errorMsg);
      alert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const cleanAllSystem = async () => {
    if (!confirm('🚨 ATTENTION DANGER ! 🚨\n\nVoulez-vous vraiment NETTOYER TOUT LE SYSTÈME ?\n\n⚠️ CETTE ACTION VA SUPPRIMER :\n✗ Tous les conducteurs\n✗ Tous les passagers\n✗ Toutes les courses\n✗ Tous les profils\n✗ Tous les wallets\n✗ Toutes les localisations\n✗ Tous les tokens FCM\n\n⚠️ Les comptes Supabase Auth ne seront PAS supprimés.\n\n⚠️ CETTE ACTION EST IRRÉVERSIBLE !\n\nTapez "CONFIRMER" pour continuer.')) {
      return;
    }

    const confirmation = prompt('Tapez "CONFIRMER" pour procéder au nettoyage total :');
    if (confirmation !== 'CONFIRMER') {
      alert('❌ Nettoyage annulé');
      return;
    }

    try {
      setLoading(true);
      setResult('⏳ NETTOYAGE TOTAL EN COURS... Cela peut prendre plusieurs minutes...');
      
      console.log('🧹 Début nettoyage total du système...');
      console.log('📡 URL:', `${BASE_URL}/admin/clean-all-system`);
      
      const response = await fetch(`${BASE_URL}/admin/clean-all-system`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('📡 Status:', response.status);
      console.log('📡 Status Text:', response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Erreur HTTP:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const data: DeleteResponse = await response.json();
      
      console.log('✅ Réponse:', data);
      setResult(data.summary || JSON.stringify(data, null, 2));
      
      if (data.success) {
        const report = data.deletionReport;
        let alertMsg = `✅ NETTOYAGE TOTAL TERMINÉ !\n\n📊 RAPPORT DE SUPPRESSION:\n`;
        if (report) {
          alertMsg += `- Conducteurs: ${report.drivers || 0}\n`;
          alertMsg += `- Passagers: ${report.passengers || 0}\n`;
          alertMsg += `- Courses: ${report.rides || 0}\n`;
          alertMsg += `- Profils: ${report.profiles || 0}\n`;
          alertMsg += `- Wallets: ${report.wallets || 0}\n`;
          alertMsg += `- Localisations: ${report.locations || 0}\n`;
          alertMsg += `- Tokens FCM: ${report.fcmTokens || 0}\n`;
          alertMsg += `- Stats: ${report.stats || 0}\n`;
        }
        alertMsg += `\n🔢 TOTAL: ${data.totalKeysDeleted || 0} clés supprimées`;
        
        alert(alertMsg);
        
        // Rafraîchir le statut
        console.log('🔄 Rafraîchissement du statut...');
        await getSystemStatus();
      } else {
        alert(`❌ ERREUR: ${data.message || 'Erreur inconnue'}`);
      }
    } catch (error: any) {
      console.error('❌ Exception:', error);
      const errorMsg = `❌ ERREUR: ${error.message}`;
      setResult(errorMsg);
      alert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-blue-600 mb-4 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Retour</span>
        </button>

        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <h1 className="text-3xl font-bold text-blue-600 mb-2">
            🧹 SmartCabb - Nettoyage Système
          </h1>
          <p className="text-gray-600 mb-6">
            Outils d'administration pour réinitialiser le système
          </p>

          {/* Buttons */}
          <div className="flex flex-wrap gap-3 mb-6">
            <button
              onClick={getSystemStatus}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              📊 Statut du Système
            </button>
            <button
              onClick={deleteAllRides}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              🗑️ Supprimer Toutes les Courses
            </button>
            <button
              onClick={deleteAllDrivers}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              🗑️ Supprimer Tous les Conducteurs
            </button>
          </div>

          {/* Danger Zone */}
          <div className="bg-red-50 border-2 border-red-300 rounded-lg p-6 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">🚨</span>
              <h3 className="text-xl font-bold text-red-700">ZONE DANGEREUSE</h3>
              <span className="text-2xl">🚨</span>
            </div>
            <p className="text-red-600 mb-4 text-sm">
              ⚠️ Cette action supprimera TOUTES les données (conducteurs, passagers, courses, profils, wallets, localisations, tokens FCM).
              Les comptes Supabase Auth ne seront PAS supprimés.
            </p>
            <button
              onClick={cleanAllSystem}
              disabled={loading}
              className="bg-red-700 hover:bg-red-800 text-white px-8 py-4 rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all w-full"
            >
              🧹 NETTOYAGE TOTAL DU SYSTÈME
            </button>
          </div>

          {/* Stats Cards */}
          {systemStatus?.success && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-600">
                <div className="text-3xl font-bold text-blue-600">
                  {systemStatus.status.drivers.total}
                </div>
                <div className="text-sm text-gray-600 mt-1">Conducteurs Total</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-600">
                <div className="text-3xl font-bold text-green-600">
                  {systemStatus.status.drivers.online}
                </div>
                <div className="text-sm text-gray-600 mt-1">En Ligne</div>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-600">
                <div className="text-3xl font-bold text-yellow-600">
                  {systemStatus.status.rides.pending}
                </div>
                <div className="text-sm text-gray-600 mt-1">Courses en Attente</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg border-l-4 border-purple-600">
                <div className="text-3xl font-bold text-purple-600">
                  {systemStatus.status.rides.accepted}
                </div>
                <div className="text-sm text-gray-600 mt-1">Courses Acceptées</div>
              </div>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className={`p-4 rounded-lg font-mono text-sm whitespace-pre-wrap overflow-auto max-h-96 ${
              result.includes('❌') || result.includes('ERREUR') 
                ? 'bg-red-50 border border-red-200 text-red-800'
                : result.includes('✅')
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-blue-50 border border-blue-200 text-blue-800'
            }`}>
              {result}
            </div>
          )}
        </div>

        {/* Driver Details */}
        {systemStatus?.success && systemStatus.status.drivers.details.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              📋 Détails des Conducteurs
            </h2>
            <div className="space-y-3">
              {systemStatus.status.drivers.details.map((driver, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border-l-4 ${
                    driver.isOnline && driver.location?.hasGPS
                      ? 'bg-green-50 border-green-500'
                      : 'bg-gray-50 border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-gray-800">
                        {driver.isOnline ? '🟢' : '🔴'} {driver.name}
                      </div>
                      <div className="text-sm text-gray-600">{driver.phone}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm">
                        {driver.location?.hasGPS ? '📍 GPS OK' : '❌ Pas de GPS'}
                      </div>
                      <div className="text-sm text-gray-600">
                        Note: {driver.rating}/5 ⭐
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

}

}

