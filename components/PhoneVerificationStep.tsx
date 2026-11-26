import { useState, useEffect, useRef, useCallback } from 'react';
import { sendOTPCode, verifyOTPCode } from '../lib/otp-service';
import { AuthButton, AuthAlert, AuthInput, AUTH_COLORS } from './auth/AuthKit';
import { ShieldCheck } from '../lib/icons';

/**
 * 🔐 ÉTAPE DE VÉRIFICATION DU NUMÉRO PAR OTP
 * Envoie automatiquement un code par SMS (EJ SMS) et vérifie la saisie.
 * Appelle onVerified(token) après succès — le token doit être transmis au /signup.
 */
export function PhoneVerificationStep({
  phone,
  purpose = 'registration',
  onVerified,
  onBack,
  title = 'Vérification du numéro',
  variant = 'primary',
}: {
  phone: string;
  purpose?: 'registration' | 'reset-password' | 'login';
  onVerified: (token: string) => void;
  onBack?: () => void;
  title?: string;
  variant?: 'primary' | 'driver' | 'admin';
}) {
  const [code, setCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopCountdown = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

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

  const handleSend = useCallback(async () => {
    if (sending) return;
    setErrorMsg('');
    setSending(true);

    const result = await sendOTPCode(phone, purpose);

    setSending(false);

    if (!result.success) {
      if (result.retryAfterSeconds) {
        startCountdown(result.retryAfterSeconds);
      }
      setErrorMsg(result.error || "Erreur lors de l'envoi du code");
      return;
    }

    startCountdown(60);
  }, [phone, purpose, sending]);

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
    <div className="space-y-5">
      <div className="flex flex-col items-center text-center">
        <span
          className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl"
          style={{
            background:
              variant === 'driver' ? 'rgba(255,204,0,0.18)' : 'rgba(0,122,255,0.10)',
          }}
        >
          <ShieldCheck
            className="h-7 w-7"
            style={{ color: variant === 'driver' ? '#B45309' : AUTH_COLORS.blue }}
          />
        </span>
        <p className="text-[15px] font-black text-[#0B1B2B]">{title}</p>
        <p className="mt-1 text-[12px] leading-relaxed text-[#64748B]">
          Un code à 6 chiffres a été envoyé par SMS au{' '}
          <span className="font-semibold text-[#0B1B2B]">{phone}</span>
        </p>
      </div>

      {errorMsg && <AuthAlert tone="error">{errorMsg}</AuthAlert>}

      <div>
        <label
          htmlFor="otp-code"
          className="mb-1.5 block text-[10.5px] font-bold uppercase leading-none tracking-[0.12em] text-[#64748B]"
        >
          Code de vérification
        </label>
        <AuthInput
          id="otp-code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="••••••"
          value={code}
          autoFocus
          onChange={(e) => {
            setCode(e.target.value.replace(/\D/g, '').slice(0, 6));
            setErrorMsg('');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleVerify();
          }}
          style={{ height: 56, fontSize: 24, letterSpacing: '0.38em', textAlign: 'center', fontWeight: 700 }}
        />
        <p className="mt-2 text-center text-[10.5px] text-[#94A3B8]">
          Le code expire dans 10 minutes. Ne le partagez jamais.
        </p>
      </div>

      <AuthButton
        variant={variant}
        onClick={handleVerify}
        loading={verifying}
        disabled={verifying || sending || code.length !== 6}
      >
        Vérifier mon numéro
      </AuthButton>

      <div className="flex items-center justify-between gap-3 text-[11.5px]">
        {countdown > 0 ? (
          <span className="text-[#94A3B8]">Renvoyer le code dans {countdown}s</span>
        ) : (
          <button
            type="button"
            onClick={handleSend}
            disabled={sending}
            style={{ minHeight: 0 }}
            className="inline p-0 align-baseline font-semibold text-[#0063D1] hover:underline disabled:opacity-50"
          >
            {sending ? 'Envoi…' : 'Renvoyer le code'}
          </button>
        )}
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            style={{ minHeight: 0 }}
            className="inline p-0 align-baseline font-medium text-[#64748B] hover:text-[#0B1B2B] hover:underline"
          >
            Modifier le numéro
          </button>
        )}
      </div>
    </div>
  );
}
