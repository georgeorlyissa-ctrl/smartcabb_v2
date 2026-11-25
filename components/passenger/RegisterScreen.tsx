import { useState, useEffect } from 'react';
import { useAppState } from '../../hooks/useAppState';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { User, Lock, ArrowRight, ShieldCheck, CreditCard, MapPin } from '../../lib/icons';
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
  AuthAlert,
  AuthFootnote,
  AuthBackButton,
  AuthCheckbox,
  PasswordStrength,
} from '../auth/AuthKit';
import { PhoneInput } from '../PhoneInput';
import { UnifiedPolicyModal } from '../shared/UnifiedPolicyModal';
import { signUp } from '../../lib/auth-service';
import { sendSMS } from '../../lib/sms-service';
import { PhoneVerificationStep } from '../PhoneVerificationStep';

// Icônes inline (évite import lib/icons qui n'existe plus)
const ArrowLeftIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m12 19-7-7 7-7" />
    <path d="M19 12H5" />
  </svg>
);

const AlertCircleIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" x2="12" y1="8" y2="12" />
    <line x1="12" x2="12.01" y1="16" y2="16" />
  </svg>
);

export function RegisterScreen() {
  const { setCurrentScreen, setCurrentUser, setCurrentView } = useAppState();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Nettoyer les messages d'erreur au montage et démontage du composant
  useEffect(() => {
    setErrorMsg('');
    setSuccessMsg('');
    
    return () => {
      setErrorMsg('');
      setSuccessMsg('');
    };
  }, []);

  const handleRegister = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    
    // Validation: nom, téléphone et mot de passe obligatoires
    if (!formData.name || !formData.phone || !formData.password) {
      setErrorMsg('Veuillez remplir tous les champs obligatoires');
      return;
    }

    // Vérifier que le téléphone a 9 ou 10 chiffres (sans compter +243)
    const phoneDigits = formData.phone.replace(/\D/g, '');
    // Retirer le préfixe 243 si présent pour obtenir les 9-10 chiffres
    const phoneWithoutPrefix = phoneDigits.startsWith('243') ? phoneDigits.substring(3) : phoneDigits;
    if (phoneWithoutPrefix.length < 9 || phoneWithoutPrefix.length > 10) {
      setErrorMsg('Le numéro de téléphone doit contenir 9 ou 10 chiffres');
      return;
    }

    if (formData.password.length < 6) {
      setErrorMsg('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setErrorMsg('Les mots de passe ne correspondent pas');
      return;
    }

    if (!termsAccepted) {
      setErrorMsg('Veuillez accepter les conditions d\'utilisation');
      return;
    }

    // 🔐 Étape OTP OBLIGATOIRE : le numéro doit être confirmé par SMS avant
    // la création du compte passager (le backend refuse le /signup sans jeton).
    setShowOtp(true);
  };

  const handleOtpVerified = async (otpToken: string) => {
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);
    
    try {
      console.log('📱 Début inscription avec:', { 
        phone: formData.phone, 
        name: formData.name 
      });
      
      // Inscription avec Supabase — le jeton OTP prouve la possession du numéro.
      // Le backend gère lui-même un éventuel ancien compte (même numéro).
      const result = await signUp({
        phone: formData.phone,
        password: formData.password,
        fullName: formData.name,
        role: 'passenger',
        otpToken: otpToken || undefined
      });
      
      console.log('📊 Résultat inscription:', result);
      
      if (result.success && result.profile) {
        console.log('✅ Inscription réussie!');
        setCurrentUser({
          id: result.profile.id,
          name: result.profile.full_name,
          phone: result.profile.phone || formData.phone
        });
        
        setSuccessMsg(`Bienvenue ${result.profile.full_name}!`);
        
        // 📱 Envoyer SMS de bienvenue au nouveau passager
        const phone = result.profile.phone || formData.phone;
        if (phone) {
          try {
            await sendSMS({
              to: phone,
              message: `SmartCabb: Bienvenue ${result.profile.full_name}! Votre compte passager a ete cree avec succes. Reservez votre premiere course des maintenant!`,
              type: 'account_validated',
            });
            console.log('✅ SMS de bienvenue envoyé au nouveau passager');
          } catch (error) {
            console.error('❌ Erreur envoi SMS de bienvenue:', error);
          }
        }
        
        setTimeout(() => {
          setCurrentScreen('map');
        }, 500);
      } else {
        // 🔍 Détecter si l'utilisateur existe déjà
        // ✅ FIX: Convertir l'erreur en string pour éviter [object Object]
        let errorMessage = 'Erreur lors de l\'inscription';
        if (result.error) {
          if (typeof result.error === 'string') {
            errorMessage = result.error;
          } else if (typeof result.error === 'object') {
            errorMessage = result.error.message || JSON.stringify(result.error);
          }
        }
        
        console.error('❌ Erreur inscription:', errorMessage);
        
        if (errorMessage.toLowerCase().includes('already been registered') || 
            errorMessage.toLowerCase().includes('déjà enregistré') ||
            errorMessage.toLowerCase().includes('already exists') ||
            errorMessage.toLowerCase().includes('user with this email already exists')) {
          setErrorMsg('Ce numéro de téléphone est déjà inscrit. Connectez-vous plutôt.');
          
          // Rediriger automatiquement vers l'écran de connexion après 3 secondes
          setTimeout(() => {
            setCurrentScreen('login');
          }, 3000);
        } else if (errorMessage.toLowerCase().includes('database error')) {
          setErrorMsg('Erreur serveur. Veuillez réessayer dans quelques instants.');
        } else {
          setErrorMsg(errorMessage);
        }
      }
    } catch (error) {
      console.error('❌ Erreur inattendue lors de l\'inscription:', error);
      const errorMsg = error instanceof Error ? error.message : 'Erreur inconnue';
      console.error('❌ Détails erreur:', errorMsg);
      setErrorMsg('Erreur lors de l\'inscription. Vérifiez votre connexion Internet.');
    }
    
    setLoading(false);
  };

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <AuthShell
      audience="passenger"
      headline="Rejoignez SmartCabb."
      subline="Un compte, une application, et un chauffeur à votre porte en quelques minutes."
      highlights={[
        {
          icon: <MapPin className="h-[18px] w-[18px]" />,
          title: 'Partout à Kinshasa',
          text: 'Des chauffeurs disponibles dans toutes les communes de la capitale.',
        },
        {
          icon: <ShieldCheck className="h-[18px] w-[18px]" />,
          title: 'Numéro vérifié',
          text: 'Chaque compte est confirmé par SMS pour protéger vos trajets.',
        },
        {
          icon: <CreditCard className="h-[18px] w-[18px]" />,
          title: 'Paiement flexible',
          text: 'Espèces, Mobile Money ou portefeuille SmartCabb.',
        },
      ]}
    >
      <AuthCard>
        <AuthCardBrand audience="passenger" />

        {showOtp ? (
          <>
            <AuthEyebrow audience="passenger">Vérification</AuthEyebrow>
            <AuthHeading
              title="Confirmez votre numéro"
              subtitle="Saisissez le code à 6 chiffres reçu par SMS pour activer votre compte."
            />
            <div className="mt-5">
              <PhoneVerificationStep
                phone={formData.phone}
                purpose="registration"
                onVerified={handleOtpVerified}
                onBack={() => setShowOtp(false)}
                title="Code de vérification"
                accentClass="bg-[#007AFF] hover:bg-[#0069DB]"
              />
            </div>
          </>
        ) : (
          <>
            <div className="mb-4">
              <AuthBackButton
                label="Accueil"
                onClick={() => {
                  setCurrentView(null);
                  setCurrentScreen('landing');
                }}
              />
            </div>

            <AuthEyebrow audience="passenger">Nouveau compte</AuthEyebrow>
            <AuthHeading
              title="Créez votre compte"
              subtitle="Quelques informations suffisent pour commander votre première course."
            />

            {(successMsg || errorMsg) && (
              <div className="mt-4 space-y-2">
                {successMsg && <AuthAlert tone="success">{successMsg}</AuthAlert>}
                {errorMsg && (
                  <AuthAlert
                    tone="error"
                    title="Inscription impossible"
                    action={
                      (errorMsg.includes('déjà inscrit') || errorMsg.includes('already registered')) ? (
                        <button
                          type="button"
                          onClick={() => setCurrentScreen('login')}
                          className="w-full rounded-xl bg-[#007AFF] px-3 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-[#0069DB]"
                        >
                          Aller à la connexion
                        </button>
                      ) : undefined
                    }
                  >
                    {errorMsg}
                  </AuthAlert>
                )}
              </div>
            )}

            <form
              className="mt-5 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (!loading) handleRegister();
              }}
            >
              <AuthField label="Nom complet" htmlFor="register-name">
                <AuthInput
                  id="register-name"
                  type="text"
                  placeholder="Ex : Jean Mulamba"
                  value={formData.name}
                  onChange={(e) => updateFormData('name', e.target.value)}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="words"
                  spellCheck={false}
                  icon={<User className="h-[18px] w-[18px]" />}
                />
              </AuthField>

              <AuthField
                label="Téléphone"
                htmlFor="register-phone"
                hint="Format congolais : +243 suivi de 9 chiffres."
              >
                <PhoneInput
                  id="register-phone"
                  variant="auth"
                  value={formData.phone}
                  onChange={(value) => updateFormData('phone', value)}
                />
              </AuthField>

              <AuthField label="Mot de passe" htmlFor="register-password">
                <AuthPasswordInput
                  id="register-password"
                  value={formData.password}
                  onChange={(e) => updateFormData('password', e.target.value)}
                  autoComplete="new-password"
                  icon={<Lock className="h-[18px] w-[18px]" />}
                />
                <PasswordStrength password={formData.password} />
              </AuthField>

              <AuthField
                label="Confirmer le mot de passe"
                htmlFor="register-confirmPassword"
                hint={
                  formData.confirmPassword && formData.confirmPassword !== formData.password
                    ? undefined
                    : undefined
                }
              >
                <AuthPasswordInput
                  id="register-confirmPassword"
                  value={formData.confirmPassword}
                  onChange={(e) => updateFormData('confirmPassword', e.target.value)}
                  autoComplete="new-password"
                  icon={<Lock className="h-[18px] w-[18px]" />}
                />
                {formData.confirmPassword.length > 0 && (
                  <p
                    className={`mt-1.5 text-[11px] font-semibold ${
                      formData.confirmPassword === formData.password ? 'text-[#0F9D58]' : 'text-[#E11D48]'
                    }`}
                  >
                    {formData.confirmPassword === formData.password
                      ? '✓ Les mots de passe correspondent'
                      : '✕ Les mots de passe ne correspondent pas'}
                  </p>
                )}
              </AuthField>

              <div className="rounded-2xl border border-[#E4E9F0] bg-[#FBFCFE] p-3.5">
                <div className="flex items-start gap-2.5">
                  <AuthCheckbox
                    id="terms"
                    checked={termsAccepted}
                    onChange={(checked) => setTermsAccepted(checked)}
                  />
                  <label htmlFor="terms" className="text-[11.5px] leading-relaxed text-[#64748B]">
                    J'accepte les{' '}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setShowTermsModal(true);
                      }}
                      className="inline p-0 align-baseline font-semibold text-[#0063D1] hover:underline" style={{ minHeight: 0 }}
                    >
                      conditions d'utilisation
                    </button>{' '}
                    et la{' '}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setShowPrivacyModal(true);
                      }}
                      className="inline p-0 align-baseline font-semibold text-[#0063D1] hover:underline" style={{ minHeight: 0 }}
                    >
                      politique de confidentialité
                    </button>{' '}
                    de SmartCabb.
                  </label>
                </div>
              </div>

              <div className="flex items-start gap-2.5 rounded-2xl bg-[#EFF6FF] px-3.5 py-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#007AFF]" />
                <p className="text-[11.5px] leading-snug text-[#1E40AF]">
                  Un code SMS à 6 chiffres vous sera demandé pour confirmer votre numéro.
                </p>
              </div>

              <AuthButton
                type="submit"
                loading={loading}
                disabled={!termsAccepted}
                trailingIcon={<ArrowRight className="h-4 w-4" />}
              >
                Créer mon compte
              </AuthButton>
            </form>

            <div className="mt-5">
              <AuthFootnote
                text="Déjà un compte ?"
                actionLabel="Se connecter"
                onAction={() => setCurrentScreen('login')}
                disabled={loading}
              />
            </div>
          </>
        )}
      </AuthCard>

      <UnifiedPolicyModal
        isOpen={showTermsModal}
        onAccept={() => setShowTermsModal(false)}
        showCloseButton={true}
        mode="terms"
      />
      <UnifiedPolicyModal
        isOpen={showPrivacyModal}
        onAccept={() => setShowPrivacyModal(false)}
        showCloseButton={true}
        mode="privacy"
      />
    </AuthShell>
  );
}
