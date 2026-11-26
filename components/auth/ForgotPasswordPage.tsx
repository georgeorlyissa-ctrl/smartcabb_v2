import React, { useState, useEffect } from 'react';
import { toast } from '../../lib/toast';
import { useNavigate } from '../../lib/simple-router';
import { supabase } from '../../lib/supabase';
import { Mail, CheckCircle, ArrowRight, ShieldCheck, Clock } from '../../lib/icons';
import {
  AuthShell,
  AuthCard,
  AuthCardBrand,
  AuthEyebrow,
  AuthHeading,
  AuthField,
  AuthInput,
  AuthButton,
  AuthAlert,
  AuthBackButton,
  AuthTextLink,
} from './AuthKit';

// Icônes inline (évite import lucide-react qui échoue avec esm.sh)
const MailIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect width="20" height="16" x="2" y="4" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
);

const CheckIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

const AlertCircleIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" x2="12" y1="8" y2="12" />
    <line x1="12" x2="12.01" y1="16" y2="16" />
  </svg>
);

const ArrowLeftIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m12 19-7-7 7-7" />
    <path d="M19 12H5" />
  </svg>
);

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  // 🔧 Détecter si on a un token de réinitialisation dans l'URL et rediriger
  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const type = hashParams.get('type');

    console.log('🔍 ForgotPasswordPage - Vérification token dans hash');
    console.log('Token présent:', !!accessToken);
    console.log('Type:', type);

    // Si on a un token de recovery, rediriger vers la page de réinitialisation
    if (accessToken && type === 'recovery') {
      console.log('✅ Token détecté, redirection vers /auth/reset-password');
      navigate('/auth/reset-password' + window.location.hash, { replace: true });
    }
  }, [navigate]);

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error('Veuillez entrer votre adresse email');
      return;
    }

    // Validation email basique
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Adresse email invalide');
      return;
    }

    setLoading(true);

    try {
      console.log('🔄 Demande de réinitialisation pour:', email);

      // Demander la réinitialisation avec Supabase
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) {
        console.error('❌ Erreur:', error);
        
        // Même s'il y a une erreur, on affiche le message de succès pour la sécurité
        // (ne pas révéler si l'email existe ou non)
        setSuccess(true);
      } else {
        console.log('✅ Email de réinitialisation envoyé');
        setSuccess(true);
      }

    } catch (error: any) {
      console.error('❌ Erreur réinitialisation:', error);
      // Pour la sécurité, on affiche quand même le message de succès
      setSuccess(true);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <AuthShell
        audience="passenger"
        headline="Reprenez la main sur votre compte."
        subline="Un lien sécurisé suffit pour choisir un nouveau mot de passe et retrouver vos courses."
        highlights={[
          {
            icon: <ShieldCheck className="h-[18px] w-[18px]" />,
            title: 'Lien à usage unique',
            text: 'Le lien expire après utilisation ou au bout d’une heure.',
          },
          {
            icon: <Clock className="h-[18px] w-[18px]" />,
            title: 'Aucun mot de passe partagé',
            text: 'Nous ne demandons jamais votre mot de passe par message.',
          },
        ]}
      >
        <AuthCard>
          <AuthCardBrand audience="passenger" />

          <div className="flex flex-col items-center py-2 text-center">
            <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#ECFDF3]">
              <CheckCircle className="h-8 w-8 text-[#0F9D58]" />
            </span>
            <p className="text-[22px] font-black leading-tight tracking-tight text-[#0B1B2B]">
              Email envoyé
            </p>
            <p className="mt-2 text-[12.5px] leading-relaxed text-[#64748B]">
              Si un compte existe avec <strong className="text-[#0B1B2B]">{email}</strong>, vous
              recevrez un lien pour réinitialiser votre mot de passe.
            </p>
          </div>

          <div className="mt-5">
            <AuthAlert tone="info" title="À vérifier">
              <span className="block">• Le dossier spam / courrier indésirable</span>
              <span className="block">• Le lien reste valable 1 heure</span>
              <span className="block">• Ouvrez-le sur cet appareil si possible</span>
            </AuthAlert>
          </div>

          <div className="mt-5 space-y-3">
            <AuthButton onClick={() => navigate('/login')}>Retour à la connexion</AuthButton>
            <div className="text-center">
              <AuthTextLink
                onClick={() => {
                  setSuccess(false);
                  setEmail('');
                }}
              >
                Envoyer à nouveau
              </AuthTextLink>
            </div>
          </div>
        </AuthCard>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      audience="passenger"
      headline="Reprenez la main sur votre compte."
      subline="Indiquez votre adresse email : nous vous envoyons un lien sécurisé pour choisir un nouveau mot de passe."
      highlights={[
        {
          icon: <ShieldCheck className="h-[18px] w-[18px]" />,
          title: 'Sécurisé par email',
          text: 'Seul le propriétaire de la boîte peut ouvrir le lien.',
        },
        {
          icon: <Clock className="h-[18px] w-[18px]" />,
          title: 'Rapide',
          text: 'Le lien arrive en général en moins d’une minute.',
        },
      ]}
    >
      <AuthCard>
        <AuthCardBrand audience="passenger" />

        <div className="mb-4">
          <AuthBackButton label="Retour à la connexion" onClick={() => navigate('/login')} />
        </div>

        <AuthEyebrow audience="passenger">Récupération</AuthEyebrow>
        <AuthHeading
          title="Mot de passe oublié"
          subtitle="Nous vous enverrons un lien pour définir un nouveau mot de passe."
        />

        <form className="mt-5 space-y-4" onSubmit={handleResetRequest}>
          <AuthField
            label="Adresse email"
            htmlFor="email"
            hint="Utilisez l'email associé à votre compte SmartCabb."
          >
            <AuthInput
              id="email"
              type="email"
              placeholder="nom@exemple.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              autoComplete="email"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              icon={<Mail className="h-[18px] w-[18px]" />}
            />
          </AuthField>

          <AuthButton
            type="submit"
            loading={loading}
            disabled={loading || !email}
            trailingIcon={<ArrowRight className="h-4 w-4" />}
          >
            Envoyer le lien
          </AuthButton>
        </form>

        <div className="mt-5 text-center">
          <AuthTextLink onClick={() => navigate('/login')} disabled={loading}>
            Annuler
          </AuthTextLink>
        </div>
      </AuthCard>
    </AuthShell>
  );
}