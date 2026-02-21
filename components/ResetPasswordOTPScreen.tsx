import { useState, useEffect } from 'react';
import { motion } from '../lib/motion';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ArrowLeft, MessageSquare, Lock, CheckCircle, Eye, EyeOff } from '../lib/icons';
import { toast } from '../lib/toast';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface ResetPasswordOTPScreenProps {
  onBack: () => void;
  userType?: 'passenger' | 'driver' | 'admin';
  onSuccess?: () => void;
}

export function ResetPasswordOTPScreen({ onBack, userType = 'passenger', onSuccess }: ResetPasswordOTPScreenProps) {
  console.log('🚀 ResetPasswordOTPScreen chargé - VERSION AVEC LOGS');
  
  const [step, setStep] = useState<'otp' | 'password' | 'success'>('otp');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [userId, setUserId] = useState('');
  const [resendCountdown, setResendCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [debugCode, setDebugCode] = useState<string | null>(null);

  useEffect(() => {
    const phone = localStorage.getItem('reset_phone');
    const storedOtpCode = localStorage.getItem('reset_otp_code');
    
    if (!phone) {
      toast.error('Session expirée. Recommencez le processus.');
      onBack();
      return;
    }
    
    setPhoneNumber(phone);
    
    if (storedOtpCode) {
      console.log('🔧 CODE OTP DISPONIBLE:', storedOtpCode);
    }
  }, [onBack]);

  useEffect(() => {
    if (resendCountdown > 0 && step === 'otp') {
      const timer = setTimeout(() => {
        setResendCountdown(resendCountdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (resendCountdown === 0) {
      setCanResend(true);
    }
  }, [resendCountdown, step]);

  const handleVerifyOTP = async () => {
    if (!otpCode || otpCode.length !== 6) {
      toast.error('Veuillez entrer le code à 6 chiffres');
      return;
    }

    setLoading(true);

    try {
      const storedOtpCode = localStorage.getItem('reset_otp_code');
      const storedTimestamp = localStorage.getItem('reset_otp_timestamp');
      
      if (!storedOtpCode || !storedTimestamp) {
        toast.error('Code expiré. Recommencez le processus.');
        onBack();
        return;
      }

      const now = Date.now();
      const timestamp = parseInt(storedTimestamp);
      const tenMinutes = 10 * 60 * 1000;
      
      if (now - timestamp > tenMinutes) {
        toast.error('Code expiré. Veuillez recommencer.');
        localStorage.removeItem('reset_otp_code');
        localStorage.removeItem('reset_otp_timestamp');
        onBack();
        return;
      }

      if (otpCode === storedOtpCode) {
        console.log('✅ Code OTP valide');
        setStep('password');
        toast.success('Code vérifié ! Choisissez un nouveau mot de passe');
      } else {
        toast.error('Code invalide. Veuillez réessayer.');
      }

    } catch (error: any) {
      console.error('❌ Erreur vérification OTP:', error);
      toast.error('Erreur lors de la vérification du code');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    console.log('🔄 handleResetPassword appelé');
    console.log('📱 Numéro de téléphone:', phoneNumber);
    console.log('🔑 Nouveau mot de passe:', newPassword ? '✅ Rempli' : '❌ Vide');
    console.log('🔑 Confirmation:', confirmPassword ? '✅ Rempli' : '❌ Vide');

    if (!newPassword || !confirmPassword) {
      toast.error('Veuillez remplir tous les champs');
      console.log('❌ Champs vides');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères');
      console.log('❌ Mot de passe trop court');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      console.log('❌ Mots de passe différents');
      return;
    }

    console.log('✅ Validation OK, envoi de la requête...');
    setLoading(true);

    try {
      const url = `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/auth/reset-password-phone`;
      console.log('📤 URL:', url);
      console.log('📤 Body:', { phoneNumber, newPassword: '***' });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({
          phoneNumber: phoneNumber,
          newPassword: newPassword
        })
      });

      console.log('📥 Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erreur inconnue' }));
        console.error('❌ Erreur HTTP:', response.status, errorData);
        
        if (response.status === 404) {
          const errorMessage = errorData.error || 'Aucun compte trouvé avec ce numéro de téléphone';
          toast.error(errorMessage, {
            duration: 6000,
            description: 'Vous devez d\'abord créer un compte pour pouvoir le réinitialiser.'
          });
          
          setTimeout(() => {
            if (confirm('Aucun compte trouvé avec ce numéro. Voulez-vous créer un compte ?')) {
              localStorage.removeItem('reset_phone');
              localStorage.removeItem('reset_otp_code');
              localStorage.removeItem('reset_otp_timestamp');
              onBack();
            }
          }, 2000);
          
          setLoading(false);
          return;
        }
        
        throw new Error(errorData.error || `Erreur ${response.status}`);
      }

      const result = await response.json();
      console.log('📥 Résultat:', result);

      if (result.success) {
        console.log('✅ Mot de passe réinitialisé');
        
        toast.success('Mot de passe réinitialisé avec succès !');
        
        setStep('success');
        
        localStorage.removeItem('reset_phone');
        localStorage.removeItem('reset_otp_code');
        localStorage.removeItem('reset_otp_timestamp');

        if (onSuccess) {
          setTimeout(() => {
            onSuccess();
          }, 2000);
        } else {
          setTimeout(() => {
            onBack();
          }, 3000);
        }
      } else {
        console.error('❌ Échec:', result.error);
        const errorMsg = typeof result.error === 'string' 
          ? result.error 
          : result.error?.message || 'Erreur lors de la réinitialisation';
        toast.error(errorMsg);
      }

    } catch (error: any) {
      console.error('❌ Erreur réinitialisation:', error);
      console.error('❌ Détails:', error.message);
      toast.error('Erreur lors de la réinitialisation du mot de passe');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setLoading(true);

    try {
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const message = `SmartCabb : Votre code de reinitialisation est ${otpCode}. Utilisez ce code pour reinitialiser votre mot de passe. Ne partagez jamais ce code avec qui que ce soit.`;

      console.log('🔐 Nouveau code OTP généré:', otpCode);

      const smsResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/sms/send`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({ 
            phoneNumber: phoneNumber,
            message: message,
            type: 'otp_code'
          })
        }
      );

      const smsResult = await smsResponse.json();
      console.log('📱 Résultat SMS renvoi:', smsResult);

      if (smsResult.success) {
        localStorage.setItem('reset_otp_code', otpCode);
        localStorage.setItem('reset_otp_timestamp', Date.now().toString());
        
        setOtpCode('');
        toast.success('Nouveau code envoyé par SMS');
        setResendCountdown(60);
        setCanResend(false);
      } else {
        toast.error('Erreur lors du renvoi du code');
      }

    } catch (error) {
      console.error('❌ Erreur renvoi OTP:', error);
      toast.error('Erreur lors du renvoi du code');
    } finally {
      setLoading(false);
    }
  };

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

  if (step === 'success') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`min-h-screen bg-gradient-to-br ${theme.gradient} flex flex-col`}
      >
        <div className="flex items-center justify-between p-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="w-10 h-10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl">Réinitialisation</h1>
          <div className="w-10" />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.2 }}
            className={`w-20 h-20 ${theme.icon} rounded-full flex items-center justify-center mb-6`}
          >
            <CheckCircle className="w-10 h-10 text-white" />
          </motion.div>

          <h2 className="text-2xl mb-4">Mot de passe réinitialisé !</h2>
          <p className="text-gray-600 mb-6 text-center">
            Votre mot de passe a été mis à jour avec succès.
          </p>
          <p className="text-sm text-gray-500">
            Retour automatique à la connexion...
          </p>
        </div>
      </motion.div>
    );
  }

  if (step === 'otp') {
    return (
      <motion.div
        initial={{ x: 300, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: -300, opacity: 0 }}
        transition={{ type: 'spring', damping: 25 }}
        className={`min-h-screen bg-gradient-to-br ${theme.gradient} flex flex-col`}
      >
        <div className="flex items-center justify-between p-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="w-10 h-10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl">Vérification du code</h1>
          <div className="w-10" />
        </div>

        <div className="flex-1 px-6 py-8">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-center mb-8"
          >
            <div className={`w-16 h-16 ${theme.icon} rounded-full flex items-center justify-center mx-auto mb-4`}>
              <MessageSquare className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl mb-2">Code envoyé</h2>
            <p className="text-gray-600">
              Entrez le code à 6 chiffres reçu au {phoneNumber}
            </p>
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="space-y-6"
          >
            <div>
              <Input
                type="text"
                placeholder="123456"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="text-center text-2xl tracking-widest h-14"
                disabled={loading}
                maxLength={6}
                autoFocus
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-sm text-blue-800">
                Le code est valide pendant 13 minutes
              </p>
            </div>

            {debugCode && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-yellow-50 border-2 border-yellow-400 rounded-xl p-4"
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center">
                      <span className="text-xl">🔧</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-yellow-900 mb-2">MODE DEBUG</h3>
                    <p className="text-sm text-yellow-800 mb-3">
                      Les credentials SMS (Africa's Talking) ne sont pas configurés. 
                      Utilisez le code ci-dessous :
                    </p>
                    <div className="bg-white border-2 border-yellow-400 rounded-lg p-3 text-center">
                      <p className="text-xs text-yellow-700 mb-1">Code OTP :</p>
                      <p className="text-3xl font-mono font-bold text-yellow-900 tracking-wider">
                        {debugCode}
                      </p>
                    </div>
                    <p className="text-xs text-yellow-700 mt-2">
                      💡 Pour activer les SMS réels, configurez les secrets Supabase
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>

        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="px-6 pb-8 space-y-4"
        >
          <Button
            onClick={handleVerifyOTP}
            disabled={loading || otpCode.length !== 6}
            className={`w-full h-14 ${theme.button} text-white rounded-xl`}
          >
            {loading ? 'Vérification...' : 'Vérifier le code'}
          </Button>

          <div className="text-center space-y-2">
            <button
              onClick={handleResendOTP}
              disabled={loading || !canResend}
              className={`text-sm ${theme.text} font-medium`}
            >
              {canResend ? 'Renvoyer le code' : `Renvoyer dans ${resendCountdown}s`}
            </button>
          </div>

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

  console.log('📝 Affichage écran password');
  console.log('📝 newPassword:', newPassword);
  console.log('📝 confirmPassword:', confirmPassword);
  console.log('📝 loading:', loading);
  
  return (
    <motion.div
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -300, opacity: 0 }}
      transition={{ type: 'spring', damping: 25 }}
      className={`min-h-screen bg-gradient-to-br ${theme.gradient} flex flex-col`}
    >
      <div className="flex items-center justify-between p-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setStep('otp')}
          className="w-10 h-10"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl">Nouveau mot de passe</h1>
        <div className="w-10" />
      </div>

      <div className="flex-1 px-6 py-8">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-8"
        >
          <div className={`w-16 h-16 ${theme.icon} rounded-full flex items-center justify-center mx-auto mb-4`}>
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl mb-2">Nouveau mot de passe</h2>
          <p className="text-gray-600">
            Choisissez un nouveau mot de passe sécurisé
          </p>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm mb-2">Nouveau mot de passe</label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Min. 6 caractères"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="pr-10 h-12"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm mb-2">Confirmer le mot de passe</label>
            <div className="relative">
              <Input
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirmer"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pr-10 h-12"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

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
        </motion.div>
      </div>

      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="px-6 pb-8 space-y-4"
      >
        <Button
          onClick={() => {
            console.log('🖱️ CLIC SUR LE BOUTON RÉINITIALISER');
            handleResetPassword();
          }}
          disabled={loading}
          className={`w-full h-14 ${theme.button} text-white rounded-xl`}
        >
          {loading ? 'Mise à jour...' : 'Réinitialiser le mot de passe'}
        </Button>

        <Button
          onClick={() => setStep('otp')}
          variant="ghost"
          className="w-full"
        >
          Retour
        </Button>
      </motion.div>
    </motion.div>
  );
}
