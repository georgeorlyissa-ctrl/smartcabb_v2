import { useState } from 'react';
import { Car, Eye, EyeOff, AlertCircle } from '../../lib/icons';
import { toast } from '../../lib/toast';
import { signIn } from '../../lib/auth-service';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { useAppState } from '../../hooks/useAppState';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { PhoneInput } from '../PhoneInput';

export function DriverLoginScreen() {
  const { setCurrentScreen, setCurrentDriver, setCurrentUser } = useAppState();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleLogin = async () => {
    if (!identifier || !password) {
      setErrorMsg('Veuillez remplir tous les champs');
      return;
    }

    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      console.log('🔐 Tentative de connexion conducteur...');
      const result = await signIn({ identifier, password });

      if (!result.success) {
        if (result.error?.includes('Impossible de contacter le serveur')) {
          setErrorMsg('');
          toast.error(
            '🌐 Problème de connexion\n\n' +
            'Impossible de contacter le serveur d\'authentification Supabase.\n\n' +
            'Solutions possibles :\n' +
            '• Vérifiez votre connexion internet\n' +
            '• Vérifiez que Supabase est accessible\n' +
            '• Consultez la console développeur (F12)',
            { duration: 10000, position: 'top-center' }
          );
          setLoading(false);
          return;
        }

        let errorMessage = 'Erreur de connexion';
        if (result.error) {
          if (typeof result.error === 'string') errorMessage = result.error;
          else if (typeof result.error === 'object') errorMessage = result.error.message || JSON.stringify(result.error);
        }

        setErrorMsg(errorMessage);

        if (errorMessage.includes('Identifiants incorrects') || errorMessage.includes('Invalid login credentials')) {
          toast.error('Compte introuvable. Créez un compte ou contactez l\'administrateur.', { duration: 5000 });
        } else {
          toast.error(errorMessage, { duration: 6000 });
        }
        setLoading(false);
        return;
      }

      console.log('✅ Authentification réussie, récupération du profil conducteur...');

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/drivers/${result.user.id}`,
        { headers: { 'Authorization': `Bearer ${publicAnonKey}` } }
      );

      if (!response.ok) {
        console.warn('⚠️ Profil conducteur non trouvé dans la base');
        setErrorMsg('Profil conducteur introuvable. Veuillez contacter le support.');
        toast.error('Profil conducteur introuvable', { description: 'Veuillez contacter le support', duration: 5000 });
        setLoading(false);
        return;
      }

      const data = await response.json();

      if (!data.success || !data.driver) {
        console.warn('⚠️ Réponse backend invalide:', data);
        setErrorMsg('Erreur de chargement du profil.');
        toast.error('Erreur de chargement du profil', { description: 'Impossible de charger vos informations', duration: 5000 });
        setLoading(false);
        return;
      }

      const driverData = data.driver;

      const blockedStatuses = ['rejected', 'suspended'];
      const isPending = driverData.status === 'pending';
      const isBlocked = blockedStatuses.includes(driverData.status);

      if (isPending || isBlocked) {
        let statusMessage = '';
        if (isPending) {
          statusMessage = 'Votre compte est en attente d\'approbation. Un administrateur doit valider votre inscription.';
        } else if (driverData.status === 'rejected') {
          statusMessage = 'Votre compte a été rejeté. Contactez le support.';
        } else if (driverData.status === 'suspended') {
          statusMessage = 'Votre compte a été suspendu. Contactez le support.';
        }
        setErrorMsg(statusMessage);
        toast.error(statusMessage, { duration: 8000 });
        setLoading(false);
        return;
      }

      if (!driverData.status || (driverData.status !== 'approved' && !blockedStatuses.includes(driverData.status))) {
        console.log(`✅ Auto-approbation du conducteur ${driverData.id}`);
        try {
          await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/admin/drivers/${driverData.id}/approve`,
            { method: 'POST', headers: { 'Authorization': `Bearer ${publicAnonKey}`, 'Content-Type': 'application/json' } }
          );
        } catch (updateError) {
          console.warn('⚠️ Impossible de mettre à jour le statut:', updateError);
        }
      }

      const driver = {
        id: driverData.id || driverData.user_id,
        name: driverData.full_name || driverData.name || 'Conducteur',
        phone: driverData.phone || driverData.phone_number || '',
        email: driverData.email || '',
        status: driverData.status || 'pending',
        is_available: driverData.is_available || false,
        photo: driverData.photo,
        vehicleInfo: driverData.vehicle ? {
          make: driverData.vehicle.make || '',
          model: driverData.vehicle.model || '',
          color: driverData.vehicle.color || '',
          plate: driverData.vehicle.license_plate || '',
          category: driverData.vehicle.category || '',
          type: driverData.vehicle.category || '',
          year: driverData.vehicle.year || new Date().getFullYear(),
          seats: driverData.vehicle.seats || 4
        } : (driverData.vehicle_make || driverData.vehicle_model || driverData.vehicle_plate || driverData.vehicle_category) ? {
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

      setCurrentDriver(driver);
      setCurrentUser({ id: driver.id, email: driver.email, role: 'driver', full_name: driver.name });

      const driverName = driver.name?.split(' ')[0] || 'Conducteur';
      setSuccessMsg(`Bienvenue ${driverName} ! 👋`);
      toast.success(`Bienvenue ${driverName} ! 👋`);

      setTimeout(() => setCurrentScreen('driver-dashboard'), 500);

    } catch (error) {
      console.error('❌ Erreur inattendue:', error);
      setErrorMsg('Erreur lors de la connexion');
      toast.error('Une erreur inattendue s\'est produite.', { duration: 5000 });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) handleLogin();
  };

  try {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 animate-in fade-in duration-300">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Car className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Connexion Conducteur</h1>
            <p className="text-gray-600">Accédez à votre espace conducteur</p>
          </div>

          {successMsg && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-green-800 font-medium">{successMsg}</p>
            </div>
          )}

          {errorMsg && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-red-800 font-medium">{errorMsg}</p>
            </div>
          )}

          <div className="space-y-6">
            <div>
              <PhoneInput
                id="driver-identifier"
                value={identifier}
                onChange={(value) => setIdentifier(value)}
                onKeyPress={handleKeyPress}
                className="px-4 h-12 text-base"
                disabled={loading}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                label="Numéro de téléphone"
              />
            </div>

            <div>
              <Label htmlFor="password">Mot de passe</Label>
              <div className="relative mt-2">
                <Input
                  id="driver-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="px-4 pr-12 h-12 text-base"
                  disabled={loading}
                  autoComplete="new-password"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 z-10"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <Button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleLogin();
              }}
              disabled={loading}
              className="w-full h-12 bg-blue-500 hover:bg-blue-600 text-white text-lg transition-colors"
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
                type="button"
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
                  type="button"
                  onClick={() => setCurrentScreen('driver-registration')}
                  className="text-blue-500 hover:text-blue-600 font-semibold transition-colors"
                  disabled={loading}
                >
                  Postuler maintenant
                </button>
              </p>
            </div>

            <div className="text-center hide-in-apk">
              <button 
                type="button"
                onClick={() => setCurrentScreen('driver-welcome')}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                disabled={loading}
              >
                ← Retour
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    return (
      <div className="min-h-screen bg-red-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Erreur de rendu</h1>
          <p className="text-gray-700">{String(error)}</p>
        </div>
      </div>
    );
  }
}
