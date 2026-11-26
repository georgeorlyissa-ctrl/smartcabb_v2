import { useState, useEffect } from 'react';
import { useAppState } from '../../hooks/useAppState';
import { useNavigate } from '../../lib/simple-router';
import { toast } from '../../lib/toast';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import * as authService from '../../lib/auth-service'; // ✅ Import de toutes les exports nommées
import { sendAdmin2FA, verifyAdmin2FA } from '../../lib/admin-2fa-service';
import { fetchGlobalConfig } from '../../lib/config-sync';
import { Mail, Lock, ArrowRight, ShieldCheck, Clock } from '../../lib/icons';
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
  AuthTextLink,
} from '../auth/AuthKit';

// Icônes inline (évite import lib/icons qui n'existe plus)
const ArrowLeftIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m12 19-7-7 7-7" />
    <path d="M19 12H5" />
  </svg>
);

const ShieldIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
  </svg>
);

const EyeIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
    <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
    <line x1="2" x2="22" y1="2" y2="22" />
  </svg>
);

export function AdminLoginScreen() {
  const { setCurrentScreen, setCurrentView, setIsAdmin, setCurrentAdmin } = useAppState();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // 🔐 Étape 2FA
  const [twoFaStep, setTwoFaStep] = useState<'none' | 'verify'>('none');
  const [accessToken, setAccessToken] = useState('');
  const [pendingAdminUser, setPendingAdminUser] = useState<any>(null);
  const [otpCode, setOtpCode] = useState('');
  const [resendCountdown, setResendCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    if (resendCountdown > 0 && twoFaStep === 'verify') {
      const timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (resendCountdown === 0) {
      setCanResend(true);
    }
  }, [resendCountdown, twoFaStep]);

  const completeAdminLogin = (adminUser: any, name: string) => {
    // 🔒 Slot admin DÉDIÉ — ne touche jamais au slot passager (currentUser)
    setCurrentAdmin(adminUser);
    setIsAdmin(true);
    setCurrentView('admin');
    try { localStorage.setItem('smartcab_current_admin', JSON.stringify(adminUser)); } catch {}
    toast.success(`Bienvenue ${name} ! 👋`);
    setCurrentScreen('admin-dashboard');
  };

  const handleSend2FA = async (token?: string, adminUser?: any, name?: string) => {
    const useToken = token || accessToken;
    const useUser = adminUser || pendingAdminUser;
    if (!useToken) return;

    setLoading(true);
    try {
      const result = await sendAdmin2FA(useToken);

      if (result.disabled) {
        // 2FA désactivé côté serveur → connexion directe
        completeAdminLogin(useUser, name || useUser?.name?.split(' ')[0] || 'Admin');
        return;
      }

      if (result.success) {
        toast.success('Code de vérification envoyé par email');
        setOtpCode('');
        setResendCountdown(60);
        setCanResend(false);
        setTwoFaStep('verify');
      } else {
        if (result.retryAfterSeconds) {
          setResendCountdown(result.retryAfterSeconds);
          setCanResend(false);
          toast.info(`Un code a déjà été envoyé. Réessayez dans ${result.retryAfterSeconds}s`);
        } else {
          toast.error(result.error || 'Erreur lors de l\'envoi du code');
        }
      }
    } catch (error) {
      console.error('❌ [2FA] Erreur envoi:', error);
      toast.error('Erreur lors de l\'envoi du code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async () => {
    if (!otpCode || otpCode.length !== 6) {
      toast.error('Veuillez entrer le code à 6 chiffres');
      return;
    }

    setLoading(true);
    try {
      const result = await verifyAdmin2FA(accessToken, otpCode);

      if (result.success) {
        console.log('✅ [2FA] Connexion admin validée');
        localStorage.setItem('smartcab_admin_2fa_token', result.token || '');
        completeAdminLogin(pendingAdminUser, pendingAdminUser?.name?.split(' ')[0] || 'Admin');
      } else {
        toast.error(result.error || 'Code incorrect. Veuillez réessayer.');
        setOtpCode('');
      }
    } catch (error) {
      console.error('❌ [2FA] Erreur vérification:', error);
      toast.error('Erreur lors de la vérification du code');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel2FA = () => {
    setTwoFaStep('none');
    setAccessToken('');
    setPendingAdminUser(null);
    setOtpCode('');
  };

  // ❌ SUPPRIMÉ : Pas de vérification automatique de session
  // L'admin DOIT toujours saisir son mot de passe pour se connecter (sécurité)

  const handleLogin = async () => {
    // Validation simple
    if (!email || !password) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);

    try {
      console.log('👑 Connexion admin en mode standalone...', email);
      
      // ✅ MODE STANDALONE : Utiliser auth-service directement
      if (!authService || typeof authService.signIn !== 'function') {
        console.error('❌ Erreur: authService non disponible ou invalide', authService);
        toast.error('Erreur système: Service d\'authentification non disponible');
        setLoading(false);
        return;
      }
      
      const result = await authService.signIn({ identifier: email, password });

      if (!result.success) {
        // ✅ FIX: Convertir l'erreur en string pour éviter [object Object]
        let errorMsg = 'Erreur inconnue';
        if (result.error) {
          if (typeof result.error === 'string') {
            errorMsg = result.error;
          } else if (typeof result.error === 'object') {
            errorMsg = result.error.message || JSON.stringify(result.error);
          }
        }
        
        console.error('❌ Erreur authentification:', errorMsg);
        
        toast.error('Email ou mot de passe incorrect');
        
        setLoading(false);
        return;
      }

      console.log('✅ Authentification réussie, vérification du rôle admin...');

      // ✅ Vérifier que le profil existe
      if (!result.profile) {
        console.error('❌ Profil non trouvé dans le KV store');
        toast.error('Profil utilisateur non trouvé. Veuillez contacter le support.');
        setLoading(false);
        return;
      }

      // Vérifier que c'est bien un admin
      if (result.profile.role !== 'admin') {
        console.error('❌ Pas un compte admin');
        toast.error('Ce compte n\'a pas les droits d\'administration');
        setLoading(false);
        return;
      }

      console.log('✅ Mise à jour des états admin...');

      // Créer l'objet utilisateur admin
      const adminUser = {
        id: result.profile.id,
        name: result.profile.full_name || 'Admin',
        email: result.profile.email,
        phone: result.profile.phone || '',
        role: 'admin'
      };

      const adminName = result.profile.full_name?.split(' ')[0] || email.split('@')[0];

      // 🔐 ÉTAPE 2FA : mot de passe correct → envoyer le code de vérification par email
      const config = await fetchGlobalConfig();
      const twoFaRequired = config?.admin2faRequired !== false;

      setAccessToken(result.accessToken || '');
      setPendingAdminUser({ ...adminUser, name: adminName });

      if (twoFaRequired) {
        console.log('🔐 [2FA] 2FA activé, envoi du code de vérification...');
        await handleSend2FA(result.accessToken || '', { ...adminUser, name: adminName }, adminName);
      } else {
        console.log('🔐 [2FA] 2FA désactivé, connexion directe');
        completeAdminLogin(adminUser, adminName);
        console.log('✅ Redirection effectuée vers admin-dashboard');
      }

    } catch (error) {
      console.error('❌ Erreur:', error);
      toast.error('Erreur de connexion. Vérifiez votre connexion Internet.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleLogin();
  };

  if (twoFaStep === 'verify') {
    return (
      <AuthShell
        audience="admin"
        headline="Sécurité renforcée."
        subline="Chaque connexion administrateur est confirmée par email, puis vérifiée côté serveur pendant 12 heures."
        highlights={[
          {
            icon: <ShieldCheck className="h-[18px] w-[18px]" />,
            title: 'Double vérification',
            text: 'Mot de passe + code email à chaque nouvelle session.',
          },
          {
            icon: <Clock className="h-[18px] w-[18px]" />,
            title: 'Code temporaire',
            text: 'Le code expire après 10 minutes et ne sert qu’une fois.',
          },
        ]}
      >
        <AuthCard>
          <AuthCardBrand audience="admin" />

          <div className="mb-4">
            <AuthBackButton label="Annuler la connexion" onClick={handleCancel2FA} />
          </div>

          <AuthEyebrow audience="admin">Vérification</AuthEyebrow>
          <AuthHeading
            title="Code de sécurité"
            subtitle="Un code à 6 chiffres a été envoyé à votre adresse email."
          />

          <form
            className="mt-5 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              handleVerify2FA();
            }}
          >
            <AuthField
              label="Code de sécurité"
              htmlFor="otp"
              hint="Valable 10 minutes. Pensez à vérifier les spams."
            >
              <AuthInput
                id="otp"
                type="text"
                inputMode="numeric"
                placeholder="••••••"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                disabled={loading}
                maxLength={6}
                autoFocus
                autoComplete="one-time-code"
                style={{ height: 56, fontSize: 24, letterSpacing: '0.38em', textAlign: 'center', fontWeight: 700 }}
              />
            </AuthField>

            <AuthButton
              variant="admin"
              type="submit"
              loading={loading}
              disabled={otpCode.length !== 6}
              trailingIcon={<ArrowRight className="h-4 w-4" />}
            >
              Valider et se connecter
            </AuthButton>
          </form>

          <div className="mt-5 text-center">
            <AuthTextLink onClick={() => handleSend2FA()} disabled={loading || !canResend}>
              {canResend ? 'Renvoyer le code' : `Renvoyer dans ${resendCountdown}s`}
            </AuthTextLink>
          </div>
        </AuthCard>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      audience="admin"
      headline="Pilotez SmartCabb en toute sécurité."
      subline="Tableau de bord, chauffeurs, paiements et alertes SOS : un accès unique, protégé par double vérification."
      highlights={[
        {
          icon: <ShieldCheck className="h-[18px] w-[18px]" />,
          title: 'Double vérification',
          text: 'Mot de passe + code email, session serveur de 12 h.',
        },
        {
          icon: <Clock className="h-[18px] w-[18px]" />,
          title: 'Déconnexion automatique',
          text: 'La session se ferme après 30 minutes d’inactivité.',
        },
        {
          icon: <Mail className="h-[18px] w-[18px]" />,
          title: 'Accès tracé',
          text: 'Les connexions et actions sensibles sont journalisées.',
        },
      ]}
    >
      <AuthCard>
        <AuthCardBrand audience="admin" />

        <AuthEyebrow audience="admin">Administration</AuthEyebrow>
        <AuthHeading
          title="Connexion administrateur"
          subtitle="Identifiez-vous pour accéder au tableau de bord SmartCabb."
        />

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <AuthField label="Email administrateur" htmlFor="admin-email">
            <AuthInput
              id="admin-email"
              type="email"
              placeholder="admin@smartcabb.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              autoComplete="username"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              icon={<Mail className="h-[18px] w-[18px]" />}
            />
          </AuthField>

          <AuthField
            label="Mot de passe"
            htmlFor="admin-password"
            action={
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/admin/forgot-password');
                }}
                disabled={loading}
                style={{ minHeight: 0 }}
                className="inline p-0 align-baseline text-[11px] font-bold text-[#0063D1] transition-colors hover:text-[#004A9E] hover:underline disabled:opacity-50"
              >
                Mot de passe oublié ?
              </button>
            }
          >
            <AuthPasswordInput
              id="admin-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              autoComplete="current-password"
              icon={<Lock className="h-[18px] w-[18px]" />}
            />
          </AuthField>

          <AuthButton
            variant="admin"
            type="submit"
            loading={loading}
            trailingIcon={<ArrowRight className="h-4 w-4" />}
          >
            Se connecter
          </AuthButton>
        </form>

        <div className="mt-5 flex items-start gap-2.5 rounded-2xl bg-[#F1F5F9] px-3.5 py-3">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#003D7A]" />
          <p className="text-[11.5px] leading-snug text-[#475569]">
            Un code de vérification sera envoyé à votre adresse email après la saisie du mot de
            passe.
          </p>
        </div>

        <div className="mt-5 text-center">
          <p className="text-[12.5px] text-[#64748B]">
            Pas de compte administrateur ?{' '}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                navigate('/admin/signup');
              }}
              disabled={loading}
              style={{ minHeight: 0 }}
              className="inline p-0 align-baseline font-semibold text-[#0063D1] hover:underline disabled:opacity-50"
            >
              Créer un compte
            </button>
          </p>
        </div>

        <div className="mt-4 flex justify-center hide-in-apk">
          <AuthBackButton
            label="Retour au site"
            onClick={() => {
              setIsAdmin(false);
              setCurrentView('passenger');
              setCurrentScreen('landing');
              navigate('/');
            }}
          />
        </div>
      </AuthCard>
    </AuthShell>
  );
}
