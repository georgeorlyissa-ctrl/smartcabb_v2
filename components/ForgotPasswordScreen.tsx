import { useState } from 'react';
import { motion } from '../lib/motion'; // ✅ FIX: Import local au lieu de motion/react
import { Button } from './ui/button';
import { EmailPhoneInput } from './EmailPhoneInput';
import { ArrowLeft, Mail, CheckCircle, Phone } from '../lib/icons'; // ✅ FIX: Import local au lieu de lucide-react
import { toast } from '../lib/toast';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { useAppState } from '../hooks/useAppState';
import { sendOTPCode } from '../lib/otp-service';
import { resetPassword } from '../lib/auth-service';

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

  // Couleurs selon le type d'utilisateur
  const colors = {
    passenger: {
      gradient: 'from-green-50 to-emerald-50',
      button: 'bg-green-500 hover:bg-green-600',
      icon: 'bg-green-500',
      text: 'text-green-600'
    },
    driver: {
      gradient: 'from-blue-50 to-indigo-50',
      button: 'bg-blue-500 hover:bg-blue-600',
      icon: 'bg-blue-500',
      text: 'text-blue-600'
    },
    admin: {
      gradient: 'from-purple-50 to-indigo-50',
      button: 'bg-purple-500 hover:bg-purple-600',
      icon: 'bg-purple-500',
      text: 'text-purple-600'
    }
  };

  const theme = colors[userType];

  if (emailSent) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`min-h-screen bg-gradient-to-br ${theme.gradient} flex flex-col`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="w-10 h-10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl">Mot de passe oublié</h1>
          <div className="w-10" />
        </div>

        {/* Success Message */}
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.2 }}
            className={`w-20 h-20 ${theme.icon} rounded-full flex items-center justify-center mb-6`}
          >
            <CheckCircle className="w-10 h-10 text-white" />
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-center"
          >
            <h2 className="text-2xl mb-4">Email envoyé !</h2>
            <p className="text-gray-600 mb-6">
              Un email de réinitialisation a été envoyé à votre adresse email.
            </p>
            <p className="text-sm text-gray-500 mb-8">
              Vérifiez votre boîte de réception et suivez les instructions pour réinitialiser votre mot de passe.
            </p>
            
            <div className={`${theme.text} bg-white p-4 rounded-xl mb-8`}>
              <p className="text-sm">
                💡 <strong>Astuce :</strong> Si vous ne voyez pas l'email, vérifiez votre dossier spam.
              </p>
            </div>

            <Button
              onClick={onBack}
              variant="outline"
              className="w-full"
            >
              Retour à la connexion
            </Button>
          </motion.div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -300, opacity: 0 }}
      transition={{ type: 'spring', damping: 25 }}
      className={`min-h-screen bg-gradient-to-br ${theme.gradient} flex flex-col`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="w-10 h-10"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl">Mot de passe oublié</h1>
        <div className="w-10" />
      </div>

      {/* Form */}
      <div className="flex-1 px-6 py-8">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-8"
        >
          <div className={`w-16 h-16 ${theme.icon} rounded-full flex items-center justify-center mx-auto mb-4`}>
            <Mail className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl mb-4">Récupération du compte</h2>
          <p className="text-gray-600">
            Entrez votre numéro de téléphone pour recevoir un code de réinitialisation.
          </p>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="space-y-6"
        >
          <EmailPhoneInput
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            label="Numéro de téléphone"
            placeholder="0812345678"
            required
          />

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-sm text-blue-800">
              <strong>Note :</strong> Un SMS avec un code de vérification sera envoyé à votre numéro (délai : 5-60 secondes).
            </p>
          </div>
        </motion.div>
      </div>

      {/* Actions */}
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="px-6 pb-8 space-y-4"
      >
        <Button
          onClick={handleResetPassword}
          disabled={loading || !identifier}
          className={`w-full h-14 ${theme.button} text-white rounded-xl`}
        >
          {loading ? 'Envoi en cours...' : 'Envoyer le lien de réinitialisation'}
        </Button>

        <Button
          onClick={onBack}
          variant="ghost"
          className="w-full"
        >
          Annuler
        </Button>
      </motion.div>
    </motion.div>
  );
}
