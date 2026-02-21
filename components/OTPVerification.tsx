import { useState, useEffect } from 'react';
import { motion } from '../lib/motion'; // ✅ FIX: Utiliser l'implémentation locale
import { Dialog, DialogContent, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ShieldCheck, RefreshCw } from '../lib/icons';
import { toast } from '../lib/toast';
import { sendOTPCode } from '../lib/sms-service';

interface OTPVerificationProps {
  phone: string;
  onVerified: () => void;
  onCancel: () => void;
  purpose?: string;
}

export function OTPVerification({ phone, onVerified, onCancel, purpose = 'Authentification' }: OTPVerificationProps) {
  const [otp, setOtp] = useState('');
  const [generatedOTP, setGeneratedOTP] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  // Générer et envoyer le code OTP au montage du composant
  useEffect(() => {
    generateAndSendOTP();
  }, []);

  // Gérer le compte à rebours pour renvoyer le code
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => {
        setResendCountdown(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [resendCountdown]);

  const generateOTP = (): string => {
    // Générer un code à 6 chiffres
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const generateAndSendOTP = async () => {
    const newOTP = generateOTP();
    setGeneratedOTP(newOTP);
    
    console.log('🔐 OTP généré:', newOTP);
    console.log('📱 Envoi SMS vers:', phone);
    
    try {
      await sendOTPCode(
        phone,
        newOTP,
        `Code pour ${purpose}`
      );
      console.log('✅ SMS envoyé avec succès');
      toast.success('Code de vérification envoyé par SMS');
    } catch (error) {
      console.error('❌ Erreur envoi OTP:', error);
      toast.error('Erreur lors de l\'envoi du code');
    }
  };

  const handleResendOTP = async () => {
    if (!canResend) return;
    
    setCanResend(false);
    setResendCountdown(60);
    await generateAndSendOTP();
  };

  const handleVerifyOTP = () => {
    if (!otp) {
      toast.error('Veuillez entrer le code de vérification');
      return;
    }

    setLoading(true);

    // Vérifier le code OTP
    if (otp === generatedOTP) {
      toast.success('Code vérifié avec succès!');
      setTimeout(() => {
        setLoading(false);
        onVerified();
      }, 500);
    } else {
      toast.error('Code incorrect. Veuillez réessayer.');
      setLoading(false);
      setOtp('');
    }
  };

  const handleOTPChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setOtp(value);
    
    // Auto-vérifier quand 6 chiffres sont entrés
    if (value.length === 6) {
      setTimeout(() => {
        if (value === generatedOTP) {
          toast.success('Code vérifié avec succès!');
          setTimeout(() => {
            onVerified();
          }, 500);
        } else {
          toast.error('Code incorrect. Veuillez réessayer.');
          setOtp('');
        }
      }, 300);
    }
  };

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md">
        <DialogTitle className="sr-only">
          Vérification OTP
        </DialogTitle>
        <DialogDescription className="sr-only">
          Entrez le code de vérification envoyé par SMS
        </DialogDescription>
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-6 py-4"
        >
          {/* Header */}
          <div className="space-y-3">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
              <ShieldCheck className="w-8 h-8 text-blue-600" />
            </div>
            
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Vérification de sécurité
              </h2>
              <p className="text-sm text-gray-600 mt-2">
                Un code de vérification a été envoyé au
              </p>
              <p className="font-medium text-gray-900">
                {phone}
              </p>
            </div>
          </div>

          {/* OTP Input */}
          <div className="space-y-3">
            <Input
              type="text"
              inputMode="numeric"
              placeholder="000000"
              value={otp}
              onChange={handleOTPChange}
              maxLength={6}
              className="text-center text-2xl tracking-widest"
              autoFocus
            />
            <p className="text-xs text-gray-500">
              Entrez le code à 6 chiffres
            </p>
          </div>

          {/* Resend Button */}
          <div className="space-y-2">
            {canResend ? (
              <Button
                onClick={handleResendOTP}
                variant="ghost"
                size="sm"
                className="w-full"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Renvoyer le code
              </Button>
            ) : (
              <p className="text-sm text-gray-500">
                Renvoyer le code dans {resendCountdown}s
              </p>
            )}
          </div>

          {/* Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-900">
              🔒 Ne partagez jamais ce code avec personne, même un employé SmartCabb
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <Button
              onClick={onCancel}
              variant="outline"
              className="flex-1"
              disabled={loading}
            >
              Annuler
            </Button>
            <Button
              onClick={handleVerifyOTP}
              className="flex-1"
              disabled={loading || otp.length !== 6}
            >
              {loading ? 'Vérification...' : 'Vérifier'}
            </Button>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}