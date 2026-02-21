import { useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Bell, Volume2, CheckCircle, AlertCircle } from '../../lib/admin-icons';
import { toast } from '../../lib/toast';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

/**
 * Composant de test pour le système de notifications sonores des chauffeurs
 * À utiliser dans le panel admin pour tester le son + message vocal
 */
export function NotificationTester() {
  const [driverId, setDriverId] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [lastRideId, setLastRideId] = useState<string | null>(null);

  const createTestRide = async () => {
    if (!driverId.trim()) {
      toast.error('Veuillez entrer un ID de chauffeur');
      return;
    }

    setIsCreating(true);

    try {
      console.log('🧪 Création d\'une course test pour le chauffeur:', driverId);

      // Créer une demande de course test
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/rides/request`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            passengerId: 'test-passenger-' + Date.now(),
            passengerName: 'Test Passager',
            passengerPhone: '+243999999999',
            pickup: {
              lat: -4.3217,
              lng: 15.3125,
              address: 'Avenue du Commerce, Kinshasa',
            },
            destination: {
              lat: -4.3317,
              lng: 15.3225,
              address: 'Boulevard du 30 Juin, Kinshasa',
            },
            vehicleCategory: 'sedan',
            estimatedPrice: 5000,
            estimatedDuration: 15,
            estimatedDistance: 5.2,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de la création de la course test');
      }

      const data = await response.json();
      
      if (data.success && data.ride) {
        setLastRideId(data.ride.id);
        toast.success('✅ Course test créée avec succès !', {
          description: `Le chauffeur ${driverId} devrait entendre le son + message vocal dans quelques secondes`,
          duration: 5000,
        });
        console.log('✅ Course test créée:', data.ride.id);
      } else {
        throw new Error('Réponse invalide du serveur');
      }
    } catch (error: any) {
      console.error('❌ Erreur création course test:', error);
      toast.error('❌ Erreur', {
        description: error.message || 'Impossible de créer la course test',
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-cyan-600" />
          <h3 className="font-semibold text-lg">Testeur de Notifications Sonores</h3>
        </div>

        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-1">Comment tester :</p>
              <ol className="list-decimal list-inside space-y-1 text-xs">
                <li>Connectez-vous en tant que chauffeur sur un autre onglet/appareil</li>
                <li>Assurez-vous que le chauffeur est EN LIGNE</li>
                <li>Entrez l'ID du chauffeur ci-dessous et cliquez sur "Créer une course test"</li>
                <li>Le chauffeur devrait entendre : son de 10 secondes + message vocal "Bonjour, vous avez une course en attente, merci de confirmer"</li>
              </ol>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <Label htmlFor="driver-id">ID du Chauffeur</Label>
            <Input
              id="driver-id"
              placeholder="ex: driver-123456789"
              value={driverId}
              onChange={(e) => setDriverId(e.target.value)}
              disabled={isCreating}
              className="mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">
              L'ID du chauffeur se trouve dans la base de données ou dans les logs de connexion
            </p>
          </div>

          <Button
            onClick={createTestRide}
            disabled={isCreating || !driverId.trim()}
            className="w-full"
          >
            {isCreating ? (
              <>
                <Volume2 className="w-4 h-4 mr-2 animate-pulse" />
                Création en cours...
              </>
            ) : (
              <>
                <Bell className="w-4 h-4 mr-2" />
                Créer une Course Test
              </>
            )}
          </Button>
        </div>

        {lastRideId && (
          <div className="p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-green-800">
                <p className="font-semibold">Course créée avec succès !</p>
                <p className="text-xs mt-1">ID: {lastRideId}</p>
                <p className="text-xs mt-1">
                  Le chauffeur devrait recevoir la notification dans 3-5 secondes maximum.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
          <p className="text-xs text-yellow-800">
            <strong>Note :</strong> Le système vérifie les nouvelles courses toutes les 3 secondes.
            Si le son ne se déclenche pas, vérifiez que le chauffeur est bien connecté et EN LIGNE.
          </p>
        </div>
      </div>
    </Card>
  );
}