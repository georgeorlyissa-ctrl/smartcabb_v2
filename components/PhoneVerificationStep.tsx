import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { sendOTPCode, verifyOTPCode } from '../lib/otp-service';

/**
 * 🔐 ÉTAPE DE VÉRIFICATION DU NUMÉRO PAR OTP
 * Envoie automatiquement un code (WhatsApp, fallback SMS) et vérifie la saisie.
 * Appelle onVerified(token) après succès — le token doit être transmis au /signup.
 */
export function PhoneVerificationStep({
  phone,
  purpose = 'registration',
  onVerified,
  onBack,
  title = 'Vérification du numéro',
  accentClass = 'bg-green-500 hover:bg-green-600',
}: {
  phone: string;
  purpose?: 'registration' | 'reset-password' | 'login';
  onVerified: (token: string) => void;
  onBack?: () => void;
  title?: string;
  accentClass?: string;
}) {
  const [code, setCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [channel, setChannel] = useState<'whatsapp' | 'sms' | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopCountdown = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  const handleSend = useCallback(async () => {
    if (sending) return;
    setErrorMsg('');
    setSending(true);

    const result = await sendOTPCode(phone, purpose);

    setSending(false);

    if (!result.success) {
      if (result.retryAfterSeconds) {
        setCountdown(result.retryAfterSeconds);
        startCountdown(result.retryAfterSeconds);
      }
      setErrorMsg(result.error || 'Erreur lors de l\'envoi du code');
      return;
    }

    setChannel(result.channel || null);
    setCountdown(60);
    startCountdown(60);
  }, [phone, purpose, sending]);

  const startCountdown = (seconds: number) => {
    stopCountdown();
    setCountdown(seconds);
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          stopCountdown();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    handleSend();
    return () => stopCountdown();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleVerify = async () => {
    if (!code || code.length !== 6) {
      setErrorMsg('Entrez le code à 6 chiffres reçu');
      return;
    }

    setErrorMsg('');
    setVerifying(true);

    const result = await verifyOTPCode(phone, code, purpose);

    setVerifying(false);

    if (!result.success || !result.token) {
      setErrorMsg(result.error || 'Code incorrect. Vérifiez le code reçu.');
      setCode('');
      return;
    }

    onVerified(result.token);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-blue-50 flex items-center justify-center">
          <svg className="w-7 h-7 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <h2 className="text-lg font-medium">{title}</h2>
        <p className="text-sm text-gray-600 mt-2">
          Un code à 6 chiffres a été envoyé au{' '}
          <span className="font-semibold">{phone}</span>
          {channel ? (
            <> par <span className="capitalize font-medium text-gray-800">{channel}</span></>
          ) : (
            <> (WhatsApp ou SMS)</>
          )}
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-red-800 font-medium text-sm">{errorMsg}</p>
        </div>
      )}

      <div>
        <label className="text-sm font-medium text-gray-700">Code de vérification</label>
        <Input
          type="text"
          inputMode="numeric"
          maxLength={6}
          placeholder="••••••"
          value={code}
          onChange={(e) => {
            setCode(e.target.value.replace(/\D/g, ''));
            setErrorMsg('');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleVerify();
          }}
          className="mt-2 px-4 h-14 bg-gray-50 border-0 rounded-xl text-center text-2xl font-mono tracking-[0.5em]"
          autoComplete="one-time-code"
          autoFocus
        />
        <p className="text-xs text-gray-500 mt-2 text-center">
          Le code expire dans 10 minutes. Ne le partagez jamais.
        </p>
      </div>

      <Button
        onClick={handleVerify}
        disabled={verifying || sending || code.length !== 6}
        className={`w-full h-12 text-white rounded-xl disabled:opacity-50 ${accentClass}`}
      >
        {verifying ? 'Vérification...' : 'Vérifier mon numéro'}
      </Button>

      <div className="flex items-center justify-between text-sm">
        {countdown > 0 ? (
          <span className="text-gray-500">Renvoyer le code dans {countdown}s</span>
        ) : (
          <button
            type="button"
            onClick={handleSend}
            disabled={sending}
            className="text-blue-500 hover:underline disabled:opacity-50"
          >
            {sending ? 'Envoi...' : 'Renvoyer le code'}
          </button>
        )}
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="text-gray-500 hover:underline"
          >
            Modifier le numéro
          </button>
        )}
      </div>
    </div>
  );
}