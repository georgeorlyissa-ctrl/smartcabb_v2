import { useState } from 'react';
import { Button } from '../ui/button';
import { toast } from '../../lib/toast';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { Users, User, Car, Shield, AlertCircle, CheckCircle } from '../../lib/icons';

interface UserToCreate {
  type: 'passenger' | 'driver' | 'admin';
  phone: string;
  password: string;
  fullName: string;
  vehicleInfo?: {
    make: string;
    model: string;
    plate: string;
    category: string;
    color: string;
  };
}

export function CreateTestUsers() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  // Utilisateurs à créer
  const usersToCreate: UserToCreate[] = [
    {
      type: 'passenger',
      phone: '+243990666662',
      password: 'Test1234',
      fullName: 'Jean Passager Test'
    },
    {
      type: 'driver',
      phone: '+243990666661',
      password: 'Test1234',
      fullName: 'Patrick Conducteur Test',
      vehicleInfo: {
        make: 'Toyota',
        model: 'Corolla',
        plate: 'KIN-1234-CD',
        category: 'smart_standard',
        color: 'Blanc'
      }
    },
    {
      type: 'admin',
      phone: '+243990666660',
      password: 'Admin1234',
      fullName: 'Admin SmartCabb'
    }
  ];

  const createAllUsers = async () => {
    setLoading(true);
    setResults([]);
    const newResults: any[] = [];

    for (const user of usersToCreate) {
      console.log(`🌱 Création de ${user.type}: ${user.fullName}`);
      
      try {
        let endpoint = '';
        let body: any = {
          phone: user.phone,
          password: user.password,
          fullName: user.fullName
        };

        if (user.type === 'passenger') {
          endpoint = 'signup-passenger';
          body.role = 'passenger';
        } else if (user.type === 'driver') {
          endpoint = 'drivers/signup';
          body.full_name = user.fullName;
          body.vehicleMake = user.vehicleInfo?.make;
          body.vehicleModel = user.vehicleInfo?.model;
          body.vehiclePlate = user.vehicleInfo?.plate;
          body.vehicleCategory = user.vehicleInfo?.category;
          body.vehicleColor = user.vehicleInfo?.color;
        } else if (user.type === 'admin') {
          endpoint = 'create-admin';
          body.email = `admin@smartcabb.app`;
        }

        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/${endpoint}`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
          }
        );

        const data = await response.json();

        if (data.success) {
          newResults.push({
            success: true,
            type: user.type,
            name: user.fullName,
            phone: user.phone,
            password: user.password,
            id: data.user?.id || 'N/A'
          });
          console.log(`✅ ${user.type} créé:`, user.fullName);
        } else {
          // Si l'utilisateur existe déjà, ce n'est pas grave
          if (data.error?.includes('déjà utilisé') || data.error?.includes('already')) {
            newResults.push({
              success: true,
              type: user.type,
              name: user.fullName,
              phone: user.phone,
              password: user.password,
              alreadyExists: true
            });
            console.log(`ℹ️ ${user.type} existe déjà:`, user.fullName);
          } else {
            newResults.push({
              success: false,
              type: user.type,
              name: user.fullName,
              error: data.error || 'Erreur inconnue'
            });
            console.error(`❌ Erreur ${user.type}:`, data.error);
          }
        }
      } catch (error) {
        newResults.push({
          success: false,
          type: user.type,
          name: user.fullName,
          error: error instanceof Error ? error.message : 'Erreur réseau'
        });
        console.error(`❌ Erreur création ${user.type}:`, error);
      }

      // Attendre un peu entre chaque création
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setResults(newResults);
    setLoading(false);

    const successCount = newResults.filter(r => r.success).length;
    if (successCount === usersToCreate.length) {
      toast.success(`✅ ${successCount} utilisateurs créés/vérifiés avec succès !`, {
        duration: 5000
      });
    } else {
      toast.error(`⚠️ ${successCount}/${usersToCreate.length} utilisateurs créés`, {
        duration: 5000
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-purple-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Créer des utilisateurs de test
              </h1>
              <p className="text-sm text-gray-500">
                Initialisation rapide pour les tests
              </p>
            </div>
          </div>

          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg mb-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-blue-900 font-medium mb-1">
                  Cette page crée 3 comptes de test :
                </p>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• 1 Passager (pour tester l'app mobile passagers)</li>
                  <li>• 1 Conducteur (pour tester l'app mobile conducteurs)</li>
                  <li>• 1 Admin (pour tester le panel administrateur)</li>
                </ul>
              </div>
            </div>
          </div>

          <Button
            onClick={createAllUsers}
            disabled={loading}
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-medium py-3"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                Création en cours...
              </>
            ) : (
              <>
                <Users className="w-5 h-5 mr-2" />
                Créer les utilisateurs de test
              </>
            )}
          </Button>
        </div>

        {/* Utilisateurs prévus */}
        {results.length === 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Utilisateurs qui seront créés
            </h2>
            <div className="space-y-3">
              {usersToCreate.map((user, index) => {
                const Icon = user.type === 'passenger' ? User : user.type === 'driver' ? Car : Shield;
                const bgColor = user.type === 'passenger' ? 'bg-green-100' : user.type === 'driver' ? 'bg-blue-100' : 'bg-purple-100';
                const iconColor = user.type === 'passenger' ? 'text-green-600' : user.type === 'driver' ? 'text-blue-600' : 'text-purple-600';

                return (
                  <div key={index} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                    <div className={`w-10 h-10 ${bgColor} rounded-lg flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-5 h-5 ${iconColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900">{user.fullName}</div>
                      <div className="text-sm text-gray-500">
                        {user.phone} • {user.password}
                      </div>
                      {user.vehicleInfo && (
                        <div className="text-xs text-gray-400 mt-1">
                          {user.vehicleInfo.make} {user.vehicleInfo.model} ({user.vehicleInfo.category})
                        </div>
                      )}
                    </div>
                    <div className="text-xs font-medium text-gray-500 uppercase">
                      {user.type}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Résultats */}
        {results.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Résultats de la création
            </h2>
            <div className="space-y-3">
              {results.map((result, index) => {
                const Icon = result.type === 'passenger' ? User : result.type === 'driver' ? Car : Shield;
                const bgColor = result.success 
                  ? (result.type === 'passenger' ? 'bg-green-100' : result.type === 'driver' ? 'bg-blue-100' : 'bg-purple-100')
                  : 'bg-red-100';
                const iconColor = result.success 
                  ? (result.type === 'passenger' ? 'text-green-600' : result.type === 'driver' ? 'text-blue-600' : 'text-purple-600')
                  : 'text-red-600';

                return (
                  <div key={index} className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                    <div className={`w-10 h-10 ${bgColor} rounded-lg flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-5 h-5 ${iconColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="font-medium text-gray-900">{result.name}</div>
                        {result.success && (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        )}
                        {result.alreadyExists && (
                          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                            Existe déjà
                          </span>
                        )}
                      </div>
                      
                      {result.success ? (
                        <>
                          <div className="text-sm text-gray-600 font-mono mb-1">
                            📱 {result.phone}
                          </div>
                          <div className="text-sm text-gray-600 font-mono mb-1">
                            🔑 {result.password}
                          </div>
                          {result.id && result.id !== 'N/A' && (
                            <div className="text-xs text-gray-400 font-mono">
                              ID: {result.id}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-sm text-red-600">
                          ❌ {result.error}
                        </div>
                      )}
                    </div>
                    <div className="text-xs font-medium text-gray-500 uppercase">
                      {result.type}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Instructions */}
            {results.some(r => r.success) && (
              <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl">
                <h3 className="text-sm font-semibold text-green-900 mb-3">
                  ✅ Comptes créés avec succès ! Vous pouvez maintenant :
                </h3>
                <div className="space-y-2 text-sm text-green-800">
                  {results.find(r => r.success && r.type === 'passenger') && (
                    <div className="flex items-start gap-2">
                      <User className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-medium">Tester l'app passagers :</div>
                        <div className="font-mono text-xs mt-1">
                          Aller sur / → Se connecter avec {results.find(r => r.type === 'passenger')?.phone}
                        </div>
                      </div>
                    </div>
                  )}
                  {results.find(r => r.success && r.type === 'driver') && (
                    <div className="flex items-start gap-2">
                      <Car className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-medium">Tester l'app conducteurs :</div>
                        <div className="font-mono text-xs mt-1">
                          Aller sur /driver → Se connecter avec {results.find(r => r.type === 'driver')?.phone}
                        </div>
                      </div>
                    </div>
                  )}
                  {results.find(r => r.success && r.type === 'admin') && (
                    <div className="flex items-start gap-2">
                      <Shield className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-medium">Tester le panel admin :</div>
                        <div className="font-mono text-xs mt-1">
                          Aller sur /admin → Se connecter avec admin@smartcabb.app
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="mt-4 flex gap-3">
              <Button
                onClick={createAllUsers}
                disabled={loading}
                variant="outline"
                className="flex-1"
              >
                Recréer les utilisateurs
              </Button>
              <Button
                onClick={() => window.location.href = '/'}
                className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white"
              >
                Aller à l'accueil
              </Button>
            </div>
          </div>
        )}

        {/* Aide */}
        <div className="mt-6 bg-white rounded-xl shadow-lg p-4">
          <div className="text-xs text-gray-500 space-y-1">
            <div>💡 <strong>Astuce :</strong> Si la création échoue, vérifiez que le backend est déployé</div>
            <div>🔧 <strong>Debug :</strong> Ouvrez la console (F12) pour voir les logs détaillés</div>
            <div>📞 <strong>Format téléphone :</strong> Les numéros doivent être au format +243XXXXXXXXX</div>
          </div>
        </div>
      </div>
    </div>
  );
}
