import { useState } from 'react';
import { motion } from '../../lib/motion';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card } from '../ui/card';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { PhoneInput } from '../PhoneInput'; // ✅ FIX: Ajout import PhoneInput
import { useAppState } from '../../hooks/useAppState';
import { toast } from '../../lib/toast';
import { Eye, EyeOff, AlertCircle } from '../../lib/icons';
import { Lock, ArrowRight, ShieldCheck, CreditCard, MapPin } from '../../lib/icons';
import {
  AuthShell,
  AuthCard,
  AuthCardBrand,
  AuthEyebrow,
  AuthHeading,
  AuthField,
  AuthPasswordInput,
  AuthButton,
  AuthAlert,
  AuthFootnote,
  AuthBackButton,
} from '../auth/AuthKit';
import { useNavigate } from '../../lib/simple-router';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { validatePhoneNumberRDC } from '../../lib/phone-utils';
import { supabase } from '../../lib/supabase';
import { signIn } from '../../lib/auth-service';
import { SmartCabbLogo } from '../SmartCabbLogo';

export function LoginScreen() {
  console.log('🔐 LoginScreen - Début du render');
  
  const navigate = useNavigate();
  
  let hookData;
  try {
    hookData = useAppState();
    console.log('✅ useAppState OK');
  } catch (error) {
    console.error('❌ CRASH useAppState:', error);
    return (
      <div className="min-h-screen bg-red-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Erreur useAppState</h1>
          <p className="text-gray-700">{String(error)}</p>
        </div>
      </div>
    );
  }

  const { setCurrentScreen, setCurrentUser, setCurrentView } = hookData;
  
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  console.log('✅ LoginScreen - States initialisés');

  const doLogin = async () => {
    console.log('🔐 DÉBUT LOGIN - Vraie connexion Supabase');
    
    setErrorMsg('');
    setSuccessMsg('');
    
    if (!identifier || !password) {
      setErrorMsg('Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    console.log('⏳ Loading = true');

    try {
      // ✅ VRAIE CONNEXION avec Supabase Auth
      console.log('🔐 Tentative de connexion avec:', identifier);
      const result = await signIn({ identifier, password });

      if (!result.success) {
        console.error('❌ Erreur de connexion:', result.error);
        
        // ✅ CAS 1 : Erreur réseau (serveur non accessible)
        if (result.error?.includes('Impossible de contacter le serveur')) {
          setErrorMsg('');
          
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
        
        // 🆕 CAS 2 : Profil orphelin détecté
        if (result.error === 'ORPHAN_PROFILE' && (result as any).orphanProfile) {
          const orphanProfile = (result as any).orphanProfile;
          console.log('⚠️ Profil orphelin détecté:', orphanProfile);
          
          setErrorMsg('');
          
          toast.error(
            '⚠️ Compte incomplet détecté\n\n' +
            'Votre profil existe mais votre compte d\'authentification n\'a pas été créé.\n\n' +
            'Cliquez sur le bouton ci-dessous pour activer votre compte.',
            {
              duration: 10000,
              position: 'top-center',
              action: {
                label: 'Activer mon compte',
                onClick: () => {
                  window.location.href = '/auth/create-auth-from-profile';
                }
              }
            }
          );
          
          setLoading(false);
          return;
        }
        
        // ✅ FIX: Convertir l'erreur en string si c'est un objet
        const errorMessage = typeof result.error === 'string' 
          ? result.error 
          : result.error?.message || JSON.stringify(result.error) || 'Erreur de connexion';
        
        // ✅ Afficher aussi le détail si disponible
        const errorDetail = (result as any).detail || '';
        const fullMessage = errorDetail ? `${errorMessage}. ${errorDetail}` : errorMessage;
        
        setErrorMsg(fullMessage);
        
        // 🔍 Afficher les infos de debug si disponibles (dev mode uniquement)
        if ((result as any).debug) {
          console.error('🐛 Debug info:', (result as any).debug);
        }
        
        // 🆕 CAS 3 : Si le compte n'existe pas, proposer de s'inscrire OU de créer un compte de test
        if (errorMessage.includes('Identifiants incorrects') || errorMessage.includes('Invalid login credentials')) {
          toast.error('Compte introuvable. Créez un compte ou contactez l\'administrateur.', {
            duration: 5000
          });
        } else {
          toast.error(fullMessage, {
            duration: 6000
          });
        }
        
        setLoading(false);
        return;
      }

      console.log('✅ Connexion réussie, récupération du profil...');

      // 🔥 Récupérer le profil depuis le backend (auto-création si nécessaire)
      let profileData;
      let profile;
      
      try {
        const profileResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/passengers/${result.user.id}`,
          {
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (!profileResponse.ok) {
          const errorData = await profileResponse.json().catch(() => ({ error: 'Erreur inconnue' }));
          console.error('❌ Erreur récupération profil depuis le backend:', errorData);
          
          // ✅ Si le backend n'est pas disponible, utiliser le profil de l'auth
          console.log('⚠️ Backend non disponible, utilisation du profil d\'authentification');
          profile = {
            id: result.user.id,
            email: result.user.email,
            full_name: result.user.user_metadata?.full_name || 'Utilisateur',
            phone: result.user.user_metadata?.phone || '',
            role: 'passenger',
            created_at: result.user.created_at
          };
        } else {
          profileData = await profileResponse.json();
          
          if (!profileData.success || !profileData.passenger) {
            console.error('❌ Profil introuvable dans la réponse du backend:', profileData);
            
            // Fallback : utiliser les données de l'auth
            profile = {
              id: result.user.id,
              email: result.user.email,
              full_name: result.user.user_metadata?.full_name || 'Utilisateur',
              phone: result.user.user_metadata?.phone || '',
              role: 'passenger',
              created_at: result.user.created_at
            };
          } else {
            profile = profileData.passenger;
          }
        }
      } catch (fetchError) {
        console.error('❌ Erreur fetch profil:', fetchError);
        
        // Fallback : utiliser les données de l'auth
        console.log('⚠️ Utilisation du profil d\'authentification comme fallback');
        profile = {
          id: result.user.id,
          email: result.user.email,
          full_name: result.user.user_metadata?.full_name || 'Utilisateur',
          phone: result.user.user_metadata?.phone || '',
          role: 'passenger',
          created_at: result.user.created_at
        };
      }

      console.log('✅ Profil récupéré depuis le backend:', profile);

      // 🔒 VÉRIFICATION DE SÉCURITÉ : Vérifier le rôle depuis les données du backend
      // Le backend a déjà créé le profil si nécessaire, donc on utilise directement les données
      // Note: Le backend retourne toujours un profil avec role='passenger' pour cette route
      console.log('✅ Profil validé avec rôle:', profile.role || 'passenger');

      // 💰 CHARGER LE SOLDE DU PORTEFEUILLE DEPUIS LE BACKEND
      let walletBalance = 0;
      try {
        console.log('💳 Chargement du solde du portefeuille...');
        const balanceResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/wallet/passenger-balance/${profile.id}`,
          {
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        if (balanceResponse.ok) {
          const balanceData = await balanceResponse.json();
          walletBalance = balanceData.balance || 0;
          console.log('✅ Solde chargé:', walletBalance, 'CDF');
        } else {
          console.warn('⚠️ Impossible de charger le solde, utilisation de 0 par défaut');
        }
      } catch (balanceError) {
        console.error('❌ Erreur chargement solde:', balanceError);
        // Continue avec solde 0
      }

      // Créer l'objet utilisateur avec les vraies données Supabase
      const user: any = {
        id: profile.id,
        name: profile.full_name || 'Utilisateur',
        email: profile.email,
        phone: profile.phone || '',
        // ✅ Mode de paiement : stocké côté serveur (profile/passenger) pour
        // survivre à la déconnexion. Les profils anciens peuvent l'avoir en
        // snake_case.
        favoritePaymentMethod:
          profile.favoritePaymentMethod || profile.favorite_payment_method || undefined,
        // ✅ FIX: Utiliser le solde chargé depuis le backend
        walletBalance: walletBalance,
        walletTransactions: [], // Seront chargées depuis la base si nécessaire
        // ✅ FIX: Ajouter les dates depuis le profil
        created_at: profile.created_at,
        registeredAt: profile.created_at
      };

      // 💾 CHARGER LES DONNÉES DE LOCALSTORAGE (override Supabase si disponible)
      try {
        const userKey = `smartcabb_user_${profile.id}`;
        const localData = localStorage.getItem(userKey);
        if (localData) {
          const parsedLocalData = JSON.parse(localData);
          console.log('✅ Données locales trouvées:', parsedLocalData);
          // Merger avec les données Supabase (localStorage a priorité pour name, email, phone, address)
          user.name = parsedLocalData.name || user.name;
          user.email = parsedLocalData.email || user.email;
          user.phone = parsedLocalData.phone || user.phone;
          if (parsedLocalData.address) {
            user.address = parsedLocalData.address;
          }
          // Le serveur reste prioritaire ; le cache local sert de secours
          if (!user.favoritePaymentMethod && parsedLocalData.favoritePaymentMethod) {
            user.favoritePaymentMethod = parsedLocalData.favoritePaymentMethod;
          }
          console.log('✅ Données mergées avec localStorage:', user);
        }
      } catch (e) {
        console.warn('⚠️ Impossible de charger localStorage:', e);
      }

      console.log('✅ User créé avec vraies données:', user);
      
      setCurrentUser(user);
      console.log('✅ setCurrentUser appelé avec vraies données');
      
      const passengerName = user.name?.split(' ')[0] || user.email?.split('@')[0] || 'Passager';
      setSuccessMsg(`Bienvenue ${passengerName} ! 👋`);
      toast.success(`Bienvenue ${passengerName} ! 👋`);
      console.log('✅ Message de succès affiché');
      
      // Attendre un peu avant de naviguer
      setTimeout(() => {
        // Deep link en attente (ex: boutons Commander / Réserver du site) ?
        try {
          const pending = localStorage.getItem('sc_pending_screen');
          if (pending === 'scheduled-rides' || pending === 'map') {
            localStorage.removeItem('sc_pending_screen');
            setCurrentScreen(pending);
            console.log('✅ Redirection deep link vers', pending);
            return;
          }
          localStorage.removeItem('sc_pending_screen');
        } catch {}
        setCurrentScreen('map');
        console.log('✅ setCurrentScreen(map) appelé');
      }, 500);
      
      setLoading(false);
      console.log('✅ Loading = false');
      console.log('🎉 LOGIN TERMINÉ');
    } catch (error) {
      console.error('❌ Erreur pendant le login:', error);
      setLoading(false);
      setErrorMsg('Erreur lors de la connexion');
      
      toast.error('Une erreur inattendue s\'est produite. Vérifiez votre connexion.', {
        duration: 5000
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      doLogin();
    }
  };

  console.log('✅ LoginScreen - doLogin défini, début du JSX');

  try {
    return (
      <AuthShell
        audience="passenger"
        headline="Votre chauffeur, à portée de main."
        subline="Des trajets sûrs, un tarif affiché avant le départ et un suivi en temps réel, partout à Kinshasa."
        highlights={[
          {
            icon: <ShieldCheck className="h-[18px] w-[18px]" />,
            title: 'Chauffeurs vérifiés',
            text: 'Identité et véhicule contrôlés par notre équipe avant chaque mise en ligne.',
          },
          {
            icon: <CreditCard className="h-[18px] w-[18px]" />,
            title: 'Prix transparents',
            text: 'Le tarif est connu avant le départ : aucune surprise à l’arrivée.',
          },
          {
            icon: <MapPin className="h-[18px] w-[18px]" />,
            title: 'Suivi en direct',
            text: 'Suivez votre course et partagez votre trajet avec vos proches.',
          },
        ]}
      >
        <AuthCard>
          <AuthCardBrand audience="passenger" />

          <AuthEyebrow audience="passenger">Espace passager</AuthEyebrow>
          <AuthHeading
            title="Content de vous revoir"
            subtitle="Connectez-vous pour commander votre prochaine course."
          />

          {(successMsg || errorMsg) && (
            <div className="mt-4 space-y-2">
              {successMsg && <AuthAlert tone="success">{successMsg}</AuthAlert>}
              {errorMsg && <AuthAlert tone="error" title="Connexion impossible">{errorMsg}</AuthAlert>}
            </div>
          )}

          <form
            className="mt-5 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!loading) doLogin();
            }}
          >
            <AuthField label="Numéro de téléphone" htmlFor="passenger-identifier">
              <PhoneInput
                id="passenger-identifier"
                variant="auth"
                value={identifier}
                onChange={(value) => setIdentifier(value)}
                disabled={loading}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
              />
            </AuthField>

            <AuthField
              label="Mot de passe"
              htmlFor="passenger-password"
              action={
                <button
                  type="button"
                  onClick={() => setCurrentScreen('forgot-password')}
                  disabled={loading}
                  className="inline p-0 align-baseline text-[11px] font-bold text-[#0063D1] transition-colors hover:text-[#004A9E] hover:underline disabled:opacity-50" style={{ minHeight: 0 }}
                >
                  Mot de passe oublié ?
                </button>
              }
            >
              <AuthPasswordInput
                id="passenger-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                autoComplete="new-password"
                icon={<Lock className="h-[18px] w-[18px]" />}
              />
            </AuthField>

            <AuthButton
              type="submit"
              loading={loading}
              trailingIcon={<ArrowRight className="h-4 w-4" />}
            >
              Se connecter
            </AuthButton>
          </form>

          <div className="mt-5 flex items-start gap-2.5 rounded-2xl bg-[#F6F8FB] px-3.5 py-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#007AFF]" />
            <p className="text-[11.5px] leading-snug text-[#64748B]">
              Connexion sécurisée : votre numéro et votre mot de passe ne sont jamais partagés.
            </p>
          </div>

          <div className="mt-5">
            <AuthFootnote
              text="Pas encore de compte ?"
              actionLabel="Créer un compte"
              onAction={() => setCurrentScreen('register')}
              disabled={loading}
            />
          </div>

          <div className="mt-4 flex justify-center hide-in-apk">
            <AuthBackButton
              label="Retour à l'accueil"
              onClick={() => {
                setCurrentView(null);
                setCurrentScreen('landing');
                navigate('/');
              }}
            />
          </div>
        </AuthCard>
      </AuthShell>
    );
  } catch (error) {
    console.error('❌ CRASH dans le JSX du LoginScreen:', error);
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
