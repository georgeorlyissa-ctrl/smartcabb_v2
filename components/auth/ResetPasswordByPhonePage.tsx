import React, { useState } from 'react';
import { motion } from '../../lib/motion';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card } from '../ui/card';
import { toast } from '../../lib/toast';
import { useNavigate } from '../../lib/simple-router';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { supabase } from '../../lib/supabase';

// Icônes inline (évite import lucide-react)
const PhoneIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

const LockIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const ArrowLeftIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m12 19-7-7 7-7" />
    <path d="M19 12H5" />
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

const MessageSquareIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

export function ResetPasswordByPhonePage() {
  const [step, setStep] = useState<'phone' | 'otp' | 'password' | 'success'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState('');
  const navigate = useNavigate();

  // Étape 1 : Envoyer le code OTP
  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phoneNumber) {
      toast.error('Veuillez entrer votre numéro de téléphone');
      return;
    }

    // Validation du format de téléphone congolais
    const phoneRegex = /^(\+243|0)?[0-9]{9}$/;
    if (!phoneRegex.test(phoneNumber)) {
      toast.error('Format invalide. Ex: +243812345678 ou 0812345678');
      return;
    }

    setLoading(true);

    try {
      console.log('📞 Envoi du code OTP au:', phoneNumber);

      // Normaliser le numéro (ajouter +243 si nécessaire)
      let normalizedPhone = phoneNumber.trim();
      if (normalizedPhone.startsWith('0')) {
        normalizedPhone = '+243' + normalizedPhone.substring(1);
      } else if (!normalizedPhone.startsWith('+')) {
        normalizedPhone = '+243' + normalizedPhone;
      }

      // Appeler l'API backend pour envoyer le code OTP
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/send-reset-otp`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({
            phoneNumber: normalizedPhone
          })
        }
      );

      const result = await response.json();

      if (result.success) {
        console.log('✅ Code OTP envoyé');
        setUserId(result.userId);
        setPhoneNumber(normalizedPhone);
        setStep('otp');
        toast.success(`Code envoyé au ${normalizedPhone}`);
      } else {
        toast.error(result.error || 'Erreur lors de l\'envoi du code');
      }

    } catch (error: any) {
      console.error('❌ Erreur envoi OTP:', error);
      toast.error('Erreur lors de l\'envoi du code');
    } finally {
      setLoading(false);
    }
  };

  // Étape 2 : Vérifier le code OTP
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!otpCode) {
      toast.error('Veuillez entrer le code reçu par SMS');
      return;
    }

    if (otpCode.length !== 6) {
      toast.error('Le code doit contenir 6 chiffres');
      return;
    }

    setLoading(true);

    try {
      console.log('🔍 Vérification du code OTP...');

      // Vérifier le code OTP via l'API backend
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/verify-reset-otp`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({
            phoneNumber,
            otpCode,
            userId
          })
        }
      );

      const result = await response.json();

      if (result.success) {
        console.log('✅ Code OTP valide');
        setStep('password');
        toast.success('Code vérifié ! Choisissez un nouveau mot de passe');
      } else {
        toast.error(result.error || 'Code invalide ou expiré');
      }

    } catch (error: any) {
      console.error('❌ Erreur vérification OTP:', error);
      toast.error('Erreur lors de la vérification du code');
    } finally {
      setLoading(false);
    }
  };

  // Étape 3 : Changer le mot de passe
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newPassword || !confirmPassword) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    setLoading(true);

    try {
      console.log('🔄 Mise à jour du mot de passe...');

      // Mettre à jour le mot de passe via l'API backend
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/reset-password-by-phone`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({
            userId,
            phoneNumber,
            otpCode,
            newPassword
          })
        }
      );

      const result = await response.json();

      if (result.success) {
        console.log('✅ Mot de passe mis à jour');
        setStep('success');
        toast.success('Mot de passe réinitialisé avec succès !');

        // Rediriger vers la page de connexion après 3 secondes
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        toast.error(result.error || 'Erreur lors de la réinitialisation');
      }

    } catch (error: any) {
      console.error('❌ Erreur réinitialisation:', error);
      toast.error('Erreur lors de la réinitialisation du mot de passe');
    } finally {
      setLoading(false);
    }
  };

  // Renvoyer le code OTP
  const handleResendOTP = async () => {
    setOtpCode('');
    await handleSendOTP(new Event('submit') as any);
  };

  // Écran de succès
  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-600 flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="w-full max-w-md p-8 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
            >
              <CheckIcon className="w-10 h-10 text-green-600" />
            </motion.div>

            <h1 className="text-2xl mb-4">Mot de passe réinitialisé !</h1>
            <p className="text-gray-600 mb-6">
              Votre mot de passe a été mis à jour avec succès.
            </p>
            <p className="text-sm text-gray-500">
              Redirection vers la page de connexion...
            </p>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-600 flex items-center justify-center p-4">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="p-8">
          {/* En-tête */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              {step === 'phone' && <PhoneIcon className="w-8 h-8 text-white" />}
              {step === 'otp' && <MessageSquareIcon className="w-8 h-8 text-white" />}
              {step === 'password' && <LockIcon className="w-8 h-8 text-white" />}
            </div>
            <h1 className="text-2xl mb-2">
              {step === 'phone' && 'Réinitialisation par SMS'}
              {step === 'otp' && 'Vérification du code'}
              {step === 'password' && 'Nouveau mot de passe'}
            </h1>
            <p className="text-gray-600">
              {step === 'phone' && 'Entrez votre numéro de téléphone'}
              {step === 'otp' && `Code envoyé au ${phoneNumber}`}
              {step === 'password' && 'Choisissez un nouveau mot de passe sécurisé'}
            </p>
          </div>

          {/* Étape 1 : Numéro de téléphone */}
          {step === 'phone' && (
            <form onSubmit={handleSendOTP} className="space-y-6">
              <div>
                <label className="block text-sm mb-2">Numéro de téléphone</label>
                <div className="relative">
                  <PhoneIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    type="tel"
                    placeholder="+243812345678 ou 0812345678"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="pl-10"
                    disabled={loading}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Format : +243XXXXXXXXX ou 0XXXXXXXXX
                </p>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <MessageSquareIcon className="w-4 h-4" />
                    </motion.div>
                    <span>Envoi...</span>
                  </div>
                ) : (
                  'Recevoir le code par SMS'
                )}
              </Button>

              <div className="text-center">
                <Button
                  variant="link"
                  onClick={() => navigate('/auth/forgot-password')}
                  disabled={loading}
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Utiliser l'email à la place
                </Button>
              </div>
            </form>
          )}

          {/* Étape 2 : Code OTP */}
          {step === 'otp' && (
            <form onSubmit={handleVerifyOTP} className="space-y-6">
              <div>
                <label className="block text-sm mb-2">Code de vérification</label>
                <Input
                  type="text"
                  placeholder="123456"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="text-center text-2xl tracking-widest"
                  disabled={loading}
                  maxLength={6}
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Entrez le code à 6 chiffres reçu par SMS
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                <p className="text-sm">
                  📱 <strong>Code envoyé au {phoneNumber}</strong>
                </p>
                <p className="text-blue-700 mt-1">
                  Le code est valide pendant 13 minutes
                </p>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                disabled={loading || otpCode.length !== 6}
              >
                {loading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <MessageSquareIcon className="w-4 h-4" />
                    </motion.div>
                    <span>Vérification...</span>
                  </div>
                ) : (
                  'Vérifier le code'
                )}
              </Button>

              <div className="text-center space-y-2">
                <Button
                  variant="link"
                  onClick={handleResendOTP}
                  disabled={loading}
                  className="text-sm text-purple-600 hover:text-purple-700"
                >
                  Renvoyer le code
                </Button>
                <br />
                <Button
                  variant="link"
                  onClick={() => setStep('phone')}
                  disabled={loading}
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Changer de numéro
                </Button>
              </div>
            </form>
          )}

          {/* Étape 3 : Nouveau mot de passe */}
          {step === 'password' && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              {/* Nouveau mot de passe */}
              <div>
                <label className="block text-sm mb-2">Nouveau mot de passe</label>
                <div className="relative">
                  <LockIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Min. 6 caractères"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pl-10 pr-10"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Confirmer le mot de passe */}
              <div>
                <label className="block text-sm mb-2">Confirmer le mot de passe</label>
                <div className="relative">
                  <LockIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirmer le mot de passe"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 pr-10"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Indicateurs de force */}
              {newPassword && (
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-sm">
                    <div className={`w-2 h-2 rounded-full ${newPassword.length >= 6 ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <span className={newPassword.length >= 6 ? 'text-green-600' : 'text-gray-500'}>
                      Au moins 6 caractères
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <div className={`w-2 h-2 rounded-full ${newPassword === confirmPassword && confirmPassword ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <span className={newPassword === confirmPassword && confirmPassword ? 'text-green-600' : 'text-gray-500'}>
                      Les mots de passe correspondent
                    </span>
                  </div>
                </div>
              )}

              {/* Bouton de soumission */}
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <LockIcon className="w-4 h-4" />
                    </motion.div>
                    <span>Mise à jour...</span>
                  </div>
                ) : (
                  'Réinitialiser le mot de passe'
                )}
              </Button>
            </form>
          )}

          {/* Lien retour */}
          <div className="text-center mt-6">
            <Button
              variant="link"
              onClick={() => navigate('/login')}
              disabled={loading}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              <ArrowLeftIcon className="w-4 h-4 mr-1" />
              Retour à la connexion
            </Button>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}