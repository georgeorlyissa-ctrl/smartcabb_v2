import { useState } from 'react';
import { toast } from '../../lib/toast';
import { useNavigate } from '../../lib/simple-router';
import { resetPassword } from '../../lib/auth-service';
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
} from '../auth/AuthKit';

export function AdminForgotPasswordScreen() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!email) {
      toast.error('Veuillez entrer votre email');
      return;
    }

    // Validation email basique
    if (!email.includes('@')) {
      toast.error('Email invalide');
      return;
    }

    setLoading(true);

    try {
      console.log('📧 Envoi de la demande de réinitialisation pour:', email);

      const result = await resetPassword(email);

      if (!result.success) {
        console.error('❌ Erreur:', result.error);
        toast.error(result.error || 'Erreur lors de l\'envoi de l\'email');
        setLoading(false);
        return;
      }

      console.log('✅ Email envoyé avec succès');
      setSuccess(true);
      toast.success('Email de réinitialisation envoyé !');

    } catch (error) {
      console.error('❌ Erreur:', error);
      toast.error('Erreur de connexion. Vérifiez votre connexion Internet.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <AuthShell
        audience="admin"
        headline="Accès administrateur sécurisé."
        subline="La réinitialisation du mot de passe passe par votre adresse email, puis par la double vérification."
        highlights={[
          {
            icon: <ShieldCheck className="h-[18px] w-[18px]" />,
            title: 'Lien à usage unique',
            text: 'Le lien expire après utilisation ou au bout de 24 heures.',
          },
          {
            icon: <Clock className="h-[18px] w-[18px]" />,
            title: 'Session courte',
            text: 'La double vérification reste valable 12 heures.',
          },
        ]}
      >
        <AuthCard>
          <AuthCardBrand audience="admin" />

          <div className="flex flex-col items-center py-2 text-center">
            <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#ECFDF3]">
              <CheckCircle className="h-8 w-8 text-[#0F9D58]" />
            </span>
            <p className="text-[22px] font-black leading-tight tracking-tight text-[#0B1B2B]">
              Email envoyé
            </p>
            <p className="mt-2 text-[12.5px] leading-relaxed text-[#64748B]">
              Un lien de réinitialisation a été envoyé à <strong className="text-[#0B1B2B]">{email}</strong>.
            </p>
          </div>

          <div className="mt-5">
            <AuthAlert tone="info" title="Prochaines étapes">
              <span className="block">1. Vérifiez votre boîte email (et les spams).</span>
              <span className="block">2. Ouvrez le lien de réinitialisation.</span>
              <span className="block">3. Choisissez un nouveau mot de passe.</span>
            </AuthAlert>
          </div>

          <div className="mt-5">
            <AuthButton variant="admin" onClick={() => navigate('/admin/login')}>
              Retour à la connexion
            </AuthButton>
          </div>
        </AuthCard>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      audience="admin"
      headline="Accès administrateur sécurisé."
      subline="Indiquez l'adresse email du compte administrateur pour recevoir un lien de réinitialisation."
      highlights={[
        {
          icon: <ShieldCheck className="h-[18px] w-[18px]" />,
          title: 'Vérification par email',
          text: 'Seul le propriétaire de la boîte peut ouvrir le lien.',
        },
        {
          icon: <Clock className="h-[18px] w-[18px]" />,
          title: 'Double vérification',
          text: 'Un code email sera demandé à la prochaine connexion.',
        },
      ]}
    >
      <AuthCard>
        <AuthCardBrand audience="admin" />

        <div className="mb-4">
          <AuthBackButton label="Retour à la connexion" onClick={() => navigate('/admin/login')} />
        </div>

        <AuthEyebrow audience="admin">Administration</AuthEyebrow>
        <AuthHeading
          title="Mot de passe oublié"
          subtitle="Nous vous enverrons un lien sécurisé pour définir un nouveau mot de passe."
        />

        <form
          className="mt-5 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
        >
          <AuthField label="Email administrateur" htmlFor="email">
            <AuthInput
              id="email"
              type="email"
              placeholder="admin@smartcabb.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              autoComplete="username"
              autoFocus
              icon={<Mail className="h-[18px] w-[18px]" />}
            />
          </AuthField>

          <AuthButton
            variant="admin"
            type="submit"
            loading={loading}
            disabled={loading || !email}
            trailingIcon={<ArrowRight className="h-4 w-4" />}
          >
            Envoyer le lien de réinitialisation
          </AuthButton>
        </form>

        <div className="mt-5 text-center">
          <AuthTextLink onClick={() => navigate('/admin/login')} disabled={loading}>
            Annuler
          </AuthTextLink>
        </div>
      </AuthCard>
    </AuthShell>
  );
}
