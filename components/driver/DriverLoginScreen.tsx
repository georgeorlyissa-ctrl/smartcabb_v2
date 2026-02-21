import { useState } from 'react';
import { Car, Lock, Eye, EyeOff } from '../../lib/icons';
import { toast } from '../../lib/toast';
import { signIn } from '../../lib/auth-service';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { useAppState } from '../../hooks/useAppState';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

export function DriverLoginScreen() {
  const { setCurrentScreen, setCurrentDriver, setCurrentUser } = useAppState();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!identifier || !password) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);

    try {
      console.log('🔐 Tentative de connexion conducteur...');
      
      // Étape 1: Connexion Supabase Auth
      const result = await signIn({ identifier, password });

      if (!result.success) {
        // Afficher l'erreur de connexion
        toast.error(result.error || 'Erreur de connexion', {
          description: 'Vérifiez votre numéro de téléphone et mot de passe',
          duration: 4000
        });
        setLoading(false);
        return;
      }

      console.log('✅ Authentification réussie, récupération du profil conducteur...');

      // Étape 2: Récupérer le profil conducteur depuis le backend
      try {
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/drivers/${result.user.id}`,
          {
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`
            }
          }
        );

        if (!response.ok) {
          console.warn('⚠️ Profil conducteur non trouvé dans la base');
          toast.error('Profil conducteur introuvable', {
            description: 'Veuillez contacter le support',
            duration: 5000
          });
          setLoading(false);
          return;
        }

        const data = await response.json();

        if (!data.success || !data.driver) {
          console.warn('⚠️ Réponse backend invalide:', data);
          toast.error('Erreur de chargement du profil', {
            description: 'Impossible de charger vos informations',
            duration: 5000
          });
          setLoading(false);
          return;
        }

        const driverData = data.driver;

        // 🚨 VÉRIFICATION : Bloquer les conducteurs non approuvés
        if (driverData.status !== 'approved') {
          let statusMessage = '';
          
          switch (driverData.status) {
            case 'pending':
              statusMessage = 'Votre compte est en attente d\'approbation. Un administrateur doit valider votre inscription.';
              break;
            case 'rejected':
              statusMessage = 'Votre compte a été rejeté. Contactez le support pour plus d\'informations.';
              break;
            case 'suspended':
              statusMessage = 'Votre compte a été suspendu. Contactez le support.';
              break;
            default:
              statusMessage = 'Votre compte n\'est pas actif. Contactez le support.';
          }
          
          toast.error(statusMessage, {
            duration: 8000
          });
          
          setLoading(false);
          return;
        }

        // Construire l'objet conducteur
        const driver = {
          id: driverData.id || driverData.user_id,
          name: driverData.full_name || driverData.name || 'Conducteur',
          phone: driverData.phone || driverData.phone_number || '',
          email: driverData.email || '',
          status: driverData.status || 'pending',
          is_available: driverData.is_available || false,
          photo: driverData.photo,
          // ✅ FIX CRITIQUE : Construire vehicleInfo depuis l'objet vehicle OU depuis les champs individuels
          vehicleInfo: (driverData.vehicle && (driverData.vehicle.make || driverData.vehicle.category || driverData.vehicle.license_plate)) ? {
            make: driverData.vehicle.make || '',
            model: driverData.vehicle.model || '',
            color: driverData.vehicle.color || '',
            plate: driverData.vehicle.license_plate || '',
            category: driverData.vehicle.category || '',
            type: driverData.vehicle.category || '',
            year: driverData.vehicle.year || new Date().getFullYear(),
            seats: driverData.vehicle.seats || 4
          } : (driverData.vehicle_make || driverData.vehicle_model || driverData.vehicle_plate || driverData.vehicle_category) ? {
            // FALLBACK : Construire depuis les champs individuels si vehicle n'existe pas ou est vide
            make: driverData.vehicle_make || '',
            model: driverData.vehicle_model || '',
            color: driverData.vehicle_color || '',
            plate: driverData.vehicle_plate || '',
            category: driverData.vehicle_category || driverData.vehicle_type || '',
            type: driverData.vehicle_category || driverData.vehicle_type || '',
            year: driverData.vehicle_year || new Date().getFullYear(),
            seats: 4
          } : null,
          vehicle_make: driverData.vehicle?.make || driverData.vehicle_make || '',
          vehicle_model: driverData.vehicle?.model || driverData.vehicle_model || '',
          vehicle_plate: driverData.vehicle?.license_plate || driverData.vehicle_plate || '',
          vehicle_category: driverData.vehicle?.category || driverData.vehicle_category || '',
          rating: driverData.rating || 0,
          total_rides: driverData.total_rides || 0,
          wallet_balance: driverData.wallet_balance || 0
        };

        // Enregistrer dans l'état global
        setCurrentDriver(driver);
        setCurrentUser({
          id: driver.id,
          email: driver.email,
          role: 'driver',
          full_name: driver.name
        });

        toast.success(`Bienvenue ${driver.name}!`);
        setCurrentScreen('driver-dashboard');

      } catch (fetchError) {
        console.error('❌ Erreur lors de la récupération du profil:', fetchError);
        toast.error('Erreur de connexion au serveur', {
          description: 'Impossible de charger votre profil',
          duration: 5000
        });
        setLoading(false);
        return;
      }

    } catch (error) {
      console.error('❌ Erreur inattendue:', error);
      toast.error('Erreur de connexion', {
        description: 'Une erreur inattendue s\'est produite',
        duration: 4000
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 flex items-center justify-center p-4">
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Car className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Connexion Conducteur</h1>
          <p className="text-gray-600">Accédez à votre dashboard</p>
        </div>

        <div className="space-y-6">
          <div>
            <Label htmlFor="identifier">Numéro de téléphone</Label>
            <div className="relative mt-2">
              <Car className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                placeholder="email@exemple.com ou +243 XXX XXX XXX"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="pl-12 h-12"
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="password">Mot de passe</Label>
            <div className="relative mt-2">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-12 pr-12 h-12"
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <Button
            onClick={handleLogin}
            disabled={loading}
            className="w-full h-12 bg-blue-500 hover:bg-blue-600 text-white text-lg"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Connexion...</span>
              </div>
            ) : (
              'Se connecter'
            )}
          </Button>

          <div className="text-center">
            <button 
              onClick={() => setCurrentScreen('forgot-password-driver')}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
              disabled={loading}
            >
              Mot de passe oublié ?
            </button>
          </div>

          <div className="text-center">
            <p className="text-gray-600">
              Nouveau conducteur ?{' '}
              <button 
                onClick={() => setCurrentScreen('driver-registration')}
                className="text-blue-500 hover:text-blue-600 font-semibold"
                disabled={loading}
              >
                Postuler maintenant
              </button>
            </p>
          </div>

          <div className="text-center">
            <button 
              onClick={() => setCurrentScreen('driver-welcome')}
              className="text-sm text-gray-500 hover:text-gray-700"
              disabled={loading}
            >
              ← Retour
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}