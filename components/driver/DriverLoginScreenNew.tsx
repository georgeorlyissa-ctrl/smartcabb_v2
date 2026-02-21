import { useState } from 'react';
import { motion } from '../../lib/motion'; // ✅ FIX: Utiliser l'implémentation locale
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
      const result = await signIn({ identifier, password });

      if (!result.success) {
        toast.error(result.error || 'Erreur de connexion');
        setLoading(false);
        return;
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/drivers/${result.user.id}`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );

      if (!response.ok) {
        toast.error('Profil conducteur introuvable');
        setLoading(false);
        return;
      }

      const data = await response.json();

      if (!data.success || !data.driver) {
        toast.error('Profil conducteur introuvable');
        setLoading(false);
        return;
      }

      const driverData = data.driver;

      // 🚨 VÉRIFICATION CRITIQUE : Bloquer les conducteurs non approuvés
      if (driverData.status !== 'approved') {
        let statusMessage = '';
        
        switch (driverData.status) {
          case 'pending':
            statusMessage = '⏳ Votre compte est en attente d\'approbation.\n\nUn administrateur doit approuver votre inscription avant que vous puissiez vous connecter.\n\nVeuillez patienter ou contacter le support.';
            break;
          case 'rejected':
            statusMessage = '❌ Votre compte a été rejeté.\n\nVeuillez contacter le support pour plus d\'informations.';
            break;
          case 'suspended':
            statusMessage = '🚫 Votre compte a été suspendu.\n\nVeuillez contacter le support pour plus d\'informations.';
            break;
          default:
            statusMessage = '⚠️ Votre compte n\'est pas actif.\n\nVeuillez contacter le support.';
        }
        
        toast.error(statusMessage, {
          duration: 8000,
          position: 'top-center'
        });
        
        setLoading(false);
        return;
      }

      const driver = {
        id: driverData.id || driverData.user_id,
        name: driverData.full_name || driverData.name || 'Conducteur',
        phone: driverData.phone || driverData.phone_number || '',
        email: driverData.email || '',
        status: driverData.status || 'pending',
        is_available: driverData.is_available || false,
        photo: driverData.photo, // ✅ AJOUT : Photo de profil
        // ✅ CORRECTION : Structurer les données du véhicule correctement
        vehicleInfo: driverData.vehicle ? {
          make: driverData.vehicle.make || '',
          model: driverData.vehicle.model || '',
          color: driverData.vehicle.color || '',
          plate: driverData.vehicle.license_plate || '',
          category: driverData.vehicle.category || '',
          year: driverData.vehicle.year || new Date().getFullYear(),
          seats: driverData.vehicle.seats || 4
        } : null,
        // Garder aussi les champs individuels pour compatibilité
        vehicle_make: driverData.vehicle?.make || '',
        vehicle_model: driverData.vehicle?.model || '',
        vehicle_plate: driverData.vehicle?.license_plate || '',
        vehicle_category: driverData.vehicle?.category || '',
        rating: driverData.rating || 0,
        total_rides: driverData.total_rides || 0,
        wallet_balance: driverData.wallet_balance || 0
      };

      setCurrentDriver(driver);
      setCurrentUser({
        id: driver.id,
        email: driver.email,
        role: 'driver',
        full_name: driver.name
      });

      toast.success(`Bienvenue ${driver.name}!`);
      setCurrentScreen('driver-dashboard');

    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 flex items-center justify-center p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
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
      </motion.div>
    </div>
  );
}