import { useState } from 'react';
import { Car, Lock, Eye, EyeOff } from '../../lib/icons';
import { Smartphone, ArrowRight, MapPin, Wallet, ShieldCheck, Sparkles } from '../../lib/icons';
import {
  AuthShell,
  AuthCard,
  AuthCardBrand,
  AuthEyebrow,
  AuthHeading,
  AuthField,
  AuthInput,
  AuthPasswordInput,
  AuthButton,
  AuthBackButton,
} from '../auth/AuthKit';
import { toast } from '../../lib/toast';
import { signIn } from '../../lib/auth-service';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { useAppState } from '../../hooks/useAppState';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { PhoneInput } from '../PhoneInput';
import { useNavigate } from '../../lib/simple-router';

export function DriverLoginScreen() {
  const { setCurrentScreen, setCurrentDriver } = useAppState();
  const navigate = useNavigate();
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
        // ✅ CAS 1 : Erreur réseau (serveur non accessible)
        if (result.error?.includes('Impossible de contacter le serveur')) {
          toast.error(
            '🌐 Problème de connexion\n\n' +
            'Impossible de contacter le serveur d\'authentification Supabase.\n\n' +
            'Solutions possibles :\n' +
            '• Vérifiez votre connexion internet\n' +
            '• Vérifiez que Supabase est accessible\n' +
            '• Consultez la console développeur (F12)',
            {
              duration: 10000,
              position: 'top-center'
            }
          );
          
          setLoading(false);
          return;
        }
        
        // Afficher l'erreur de connexion
        // ✅ FIX: Convertir l'erreur en string pour éviter [object Object]
        let errorMsg = 'Erreur de connexion';
        if (result.error) {
          if (typeof result.error === 'string') {
            errorMsg = result.error;
          } else if (typeof result.error === 'object') {
            errorMsg = result.error.message || JSON.stringify(result.error);
          }
        }
        
        // ✅ CAS 2 : Si identifiants incorrects, proposer de créer un compte
        if (errorMsg.includes('Identifiants incorrects') || errorMsg.includes('Invalid login credentials')) {
          toast.error('Compte introuvable. Créez un compte ou contactez l\'administrateur.', {
            duration: 5000
          });
        } else {
          toast.error(errorMsg, {
            description: 'Vérifiez votre numéro de téléphone et mot de passe',
            duration: 4000
          });
        }
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

        // 🚨 VÉRIFICATION CRITIQUE : Bloquer UNIQUEMENT les conducteurs explicitement rejetés/suspendus
        // ✅ NOUVELLE LOGIQUE : Accepter tous les statuts SAUF 'pending', 'rejected', 'suspended'
        const blockedStatuses = ['rejected', 'suspended'];
        const isPending = driverData.status === 'pending';
        const isBlocked = blockedStatuses.includes(driverData.status);
        
        if (isPending || isBlocked) {
          let statusMessage = '';
          
          if (isPending) {
            statusMessage = 'Votre compte est en attente d\'approbation. Un administrateur doit valider votre inscription.';
          } else if (driverData.status === 'rejected') {
            statusMessage = 'Votre compte a été rejeté. Contactez le support pour plus d\'informations.';
          } else if (driverData.status === 'suspended') {
            statusMessage = 'Votre compte a été suspendu. Contactez le support.';
          }
          
          toast.error(statusMessage, {
            duration: 8000
          });
          
          setLoading(false);
          return;
        }
        
        // ✅ Si le conducteur n'a pas de statut ou a un statut non bloqué, on le laisse passer
        // et on met à jour son statut à 'approved' si nécessaire
        if (!driverData.status || (driverData.status !== 'approved' && !blockedStatuses.includes(driverData.status))) {
          console.log(`✅ Auto-approbation du conducteur ${driverData.id} avec statut: ${driverData.status || 'null'}`);
          
          // Mettre à jour le statut en backend
          try {
            await fetch(
              `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/admin/drivers/${driverData.id}/approve`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${publicAnonKey}`,
                  'Content-Type': 'application/json'
                }
              }
            );
            console.log('✅ Statut mis à jour vers "approved"');
          } catch (updateError) {
            console.warn('⚠️ Impossible de mettre à jour le statut, mais on laisse passer:', updateError);
          }
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

        // Enregistrer dans l'état global — slot conducteur UNIQUEMENT
        // (le slot passager currentUser n'est jamais touché par le login conducteur)
        setCurrentDriver(driver);

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
    <AuthShell
      audience="driver"
      headline="Roulez avec SmartCabb."
      subline="Recevez des courses proches de vous, suivez vos gains et gardez le contrôle de votre activité."
      highlights={[
        {
          icon: <MapPin className="h-[18px] w-[18px]" />,
          title: 'Courses à proximité',
          text: 'Vous n’êtes notifié que pour les demandes proches de votre position.',
        },
        {
          icon: <Wallet className="h-[18px] w-[18px]" />,
          title: 'Gains transparents',
          text: 'Commission, solde et historique visibles après chaque course.',
        },
        {
          icon: <ShieldCheck className="h-[18px] w-[18px]" />,
          title: 'Support 24/7',
          text: 'Une équipe joignable à tout moment, en plus du bouton SOS.',
        },
      ]}
    >
      <AuthCard>
        <AuthCardBrand audience="driver" />

        <AuthEyebrow audience="driver">Espace chauffeur</AuthEyebrow>
        <AuthHeading
          title="Connexion chauffeur"
          subtitle="Accédez à votre tableau de bord et à vos courses en cours."
        />

        <form
          className="mt-5 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!loading) handleLogin();
          }}
        >
          <AuthField
            label="Numéro de téléphone"
            htmlFor="driver-identifier"
            hint="Le numéro renseigné lors de votre inscription."
          >
            <PhoneInput
              id="driver-identifier"
              variant="auth"
              value={identifier}
              onChange={(value) => setIdentifier(value)}
              disabled={loading}
            />
          </AuthField>

          <AuthField
            label="Mot de passe"
            htmlFor="driver-password"
            action={
              <button
                type="button"
                onClick={() => setCurrentScreen('forgot-password-driver')}
                disabled={loading}
                className="inline p-0 align-baseline text-[11px] font-bold text-[#0063D1] transition-colors hover:text-[#004A9E] hover:underline disabled:opacity-50" style={{ minHeight: 0 }}
              >
                Mot de passe oublié ?
              </button>
            }
          >
            <AuthPasswordInput
              id="driver-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              autoComplete="current-password"
              icon={<Lock className="h-[18px] w-[18px]" />}
            />
          </AuthField>

          <AuthButton
            type="submit"
            variant="driver"
            loading={loading}
            trailingIcon={<ArrowRight className="h-4 w-4" />}
          >
            Accéder à mon tableau de bord
          </AuthButton>
        </form>

        <div className="mt-5 rounded-2xl border border-[#FDE68A] bg-[#FFFBEB] p-3.5">
          <p className="text-[12px] font-bold text-[#92400E]">Pas encore chauffeur SmartCabb ?</p>
          <p className="mt-1 text-[11.5px] leading-snug text-[#A16207]">
            Créez votre dossier en 2 minutes. Validation sous 48 h.
          </p>
          <button
            type="button"
            onClick={() => {
              try {
                window.history.replaceState({}, '', '/app/driver/signup');
              } catch {}
              setCurrentScreen('driver-registration');
            }}
            disabled={loading}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-[#FFCC00] bg-white px-3 py-2.5 text-[12.5px] font-bold text-[#001B3D] transition-colors hover:bg-[#FFFDF5] disabled:opacity-50"
          >
            Déposer ma candidature
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 flex justify-center">
          <AuthBackButton
            label="Retour au site"
            onClick={() => {
              navigate('/');
            }}
          />
        </div>
      </AuthCard>
    </AuthShell>
  );
}
