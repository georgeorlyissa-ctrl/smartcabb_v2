import { useState } from 'react';
import { toast } from '../lib/toast';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { useAppState } from '../hooks/useAppState';
import { sendOTPCode } from '../lib/otp-service';
import { resetPassword } from '../lib/auth-service';
import { Mail, CheckCircle, ShieldCheck, Smartphone, Clock, ArrowRight } from '../lib/icons';
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
} from './auth/AuthKit';

interface ForgotPasswordScreenProps {
  onBack: () => void;
  userType?: 'passenger' | 'driver' | 'admin';
}

export function ForgotPasswordScreen({ onBack, userType = 'passenger' }: ForgotPasswordScreenProps) {
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [resetMethod, setResetMethod] = useState<'email' | 'phone'>('email');
  const { setCurrentScreen } = useAppState();

  const handleResetPassword = async () => {
    // Convertir en string et vérifier
    const identifierStr = String(identifier || '').trim();
    
    if (!identifierStr) {
      toast.error('Veuillez entrer votre numéro de téléphone');
      return;
    }

    setLoading(true);

    try {
      // Déterminer si c'est un numéro de téléphone
      const isPhone = /^(\+243|0)?[0-9]{9}$/.test(identifierStr);

      if (isPhone) {
        // Réinitialisation par SMS
        console.log('📱 Réinitialisation par SMS pour:', identifierStr);

        // Normaliser le numéro
        let normalizedPhone = identifierStr;
        if (normalizedPhone.startsWith('0')) {
          normalizedPhone = '+243' + normalizedPhone.substring(1);
        } else if (!normalizedPhone.startsWith('+')) {
          normalizedPhone = '+243' + normalizedPhone;
        }

        console.log('📱 Numéro normalisé:', normalizedPhone);

        // ✅ ÉTAPE 1 : Vérifier que le compte existe AVANT d'envoyer le SMS
        console.log('🔍 Vérification de l\'existence du compte...');
        const checkResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/auth/check-phone-exists`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${publicAnonKey}`
            },
            body: JSON.stringify({ phoneNumber: normalizedPhone })
          }
        );

        const checkResult = await checkResponse.json();
        console.log('🔍 Résultat vérification:', checkResult);

        if (!checkResult.exists) {
          // Le compte n'existe pas
          toast.error('Aucun compte trouvé avec ce numéro', {
            duration: 5000,
            description: 'Vous devez d\'abord créer un compte.'
          });
          
          // Proposer de créer un compte
          setTimeout(() => {
            if (confirm('Aucun compte trouvé avec ce numéro. Voulez-vous créer un compte ?')) {
              // Rediriger vers l'inscription
              const registrationScreen = userType === 'driver' ? 'driver-registration' : 'registration';
              setCurrentScreen(registrationScreen);
            }
          }, 1500);
          
          setLoading(false);
          return;
        }

        // ✅ ÉTAPE 2 : Le compte existe, envoyer le code OTP via le backend (WhatsApp/SMS)
        console.log('✅ Compte existant trouvé, envoi du code OTP...');

        const otpResult = await sendOTPCode(normalizedPhone, 'reset-password');
        console.log('📱 Résultat envoi OTP:', otpResult);

        if (otpResult.success) {
          console.log('✅ Code OTP envoyé avec succès');
          
          // Stocker le numéro pour l'écran de vérification
          localStorage.setItem('reset_phone', normalizedPhone);
          
          toast.success(`Code envoyé au ${normalizedPhone}`);
          
          // Naviguer vers l'écran OTP approprié selon le type d'utilisateur
          const otpScreen = userType === 'driver' ? 'reset-password-otp-driver' : 
                          userType === 'admin' ? 'reset-password-otp-admin' : 
                          'reset-password-otp';
          setCurrentScreen(otpScreen);
        } else {
          console.error('❌ Erreur envoi OTP:', otpResult);
          toast.error(otpResult.error || 'Erreur lors de l\'envoi du code');
        }

      } else {
        // Réinitialisation par email (email de récupération Supabase)
        console.log('📧 Réinitialisation par email pour:', identifierStr);

        const result = await resetPassword(identifierStr);

        if (result.success) {
          console.log('✅ Email de réinitialisation envoyé');
          setResetMethod('email');
          setEmailSent(true);
          toast.success('Email de réinitialisation envoyé !');
        } else {
          toast.error(result.error || 'Erreur lors de la réinitialisation');
        }
      }

    } catch (error) {
      console.error('❌ Erreur inattendue:', error);
      toast.error('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };
  const isDriver = userType === 'driver';
  const isAdmin = userType === 'admin';

  const headline = isDriver
    ? 'Reprenez la route rapidement.'
    : isAdmin
      ? 'Accès administrateur sécurisé.'
      : "Retrouvez l'accès à votre compte.";

  const subline = isDriver
    ? 'Récupérez votre accès chauffeur en quelques secondes, sans passer par le support.'
    : isAdmin
      ? 'Réinitialisez votre mot de passe par email, puis reconnectez-vous avec la double vérification.'
      : 'Un code par SMS ou un lien par email : reprenez la main sur votre compte en quelques secondes.';

  const eyebrow = isAdmin ? 'Administration' : isDriver ? 'Espace chauffeur' : 'Récupération';

  if (emailSent) {
    return (
      <AuthShell
        audience={userType}
        headline={headline}
        subline={subline}
        highlights={[
          {
            icon: <ShieldCheck className="h-[18px] w-[18px]" />,
            title: 'Lien à usage unique',
            text: 'Le lien expire automatiquement après utilisation.',
          },
          {
            icon: <Clock className="h-[18px] w-[18px]" />,
            title: 'Valable 10 minutes',
            text: 'Demandez un nouveau lien si le délai est dépassé.',
          },
        ]}
      >
        <AuthCard>
          <AuthCardBrand audience={userType} />

          <div className="flex flex-col items-center py-2 text-center">
            <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#ECFDF3]">
              <CheckCircle className="h-8 w-8 text-[#0F9D58]" />
            </span>
            <p className="text-[22px] font-black leading-tight tracking-tight text-[#0B1B2B]">
              Email envoyé
            </p>
            <p className="mt-2 text-[12.5px] leading-relaxed text-[#64748B]">
              Un lien de réinitialisation vient d'être envoyé. Ouvrez-le sur cet appareil pour
              choisir un nouveau mot de passe.
            </p>
          </div>

          <div className="mt-5">
            <AuthAlert tone="info" title="Rien reçu ?">
              Vérifiez votre dossier spam, puis attendez quelques minutes avant de redemander un
              lien.
            </AuthAlert>
          </div>

          <div className="mt-5">
            <AuthButton variant={isDriver ? 'driver' : isAdmin ? 'admin' : 'primary'} onClick={onBack}>Retour à la connexion</AuthButton>
          </div>
        </AuthCard>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      audience={userType}
      headline={headline}
      subline={subline}
      highlights={[
        {
          icon: <Smartphone className="h-[18px] w-[18px]" />,
          title: 'Code par SMS',
          text: 'Entrez votre numéro : un code à 6 chiffres vous est envoyé.',
        },
        {
          icon: <Mail className="h-[18px] w-[18px]" />,
          title: 'Lien par email',
          text: 'Entrez votre adresse : un lien sécurisé arrive dans votre boîte.',
        },
        {
          icon: <ShieldCheck className="h-[18px] w-[18px]" />,
          title: 'Compte protégé',
          text: 'Aucun mot de passe n’est envoyé par message.',
        },
      ]}
    >
      <AuthCard>
        <AuthCardBrand audience={userType} />

        <div className="mb-4">
          <AuthBackButton label="Retour à la connexion" onClick={onBack} />
        </div>

        <AuthEyebrow audience={userType}>{eyebrow}</AuthEyebrow>
        <AuthHeading
          title="Mot de passe oublié"
          subtitle="Indiquez votre numéro de téléphone ou votre adresse email."
        />

        <div className="mt-5 space-y-4">
          <AuthField
            label="Téléphone ou email"
            htmlFor="recovery-identifier"
            hint="Exemple : 0812345678 ou nom@exemple.com"
          >
            <AuthInput
              id="recovery-identifier"
              type="text"
              placeholder="0812345678"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              disabled={loading}
              autoComplete="username"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              icon={<Mail className="h-[18px] w-[18px]" />}
            />
          </AuthField>

          <div className="flex items-start gap-2.5 rounded-2xl bg-[#EFF6FF] px-3.5 py-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#007AFF]" />
            <p className="text-[11.5px] leading-snug text-[#1E40AF]">
              Un SMS (code à 6 chiffres) ou un email (lien sécurisé) sera envoyé. Délai habituel :
              5 à 60 secondes.
            </p>
          </div>

          <AuthButton
            variant={isDriver ? 'driver' : isAdmin ? 'admin' : 'primary'}
            onClick={handleResetPassword}
            loading={loading}
            disabled={loading || !identifier}
            trailingIcon={<ArrowRight className="h-4 w-4" />}
          >
            Envoyer le code de réinitialisation
          </AuthButton>
        </div>

        <div className="mt-5 text-center">
          <AuthTextLink onClick={onBack} disabled={loading}>
            Annuler
          </AuthTextLink>
        </div>
      </AuthCard>
    </AuthShell>
  );
}
