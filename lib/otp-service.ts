import { projectId, publicAnonKey } from '../utils/supabase/info';

/**
 * 🔐 SERVICE OTP CLIENT - SMARTCABB
 * Envoie et vérifie les codes OTP via le backend (/otp/send, /otp/verify)
 * Canal : WhatsApp en priorité, fallback SMS
 * @version 1.0.0
 */

const OTP_API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/otp`;

export type OTPPurpose = 'registration' | 'reset-password' | 'login';

export interface SendOTPResult {
  success: boolean;
  channel?: 'whatsapp' | 'sms';
  error?: string;
  retryAfterSeconds?: number;
}

export interface VerifyOTPResult {
  success: boolean;
  token?: string;
  error?: string;
}

/**
 * Demande l'envoi d'un code OTP (WhatsApp, fallback SMS)
 */
export async function sendOTPCode(
  phone: string,
  purpose: OTPPurpose = 'registration'
): Promise<SendOTPResult> {
  try {
    const response = await fetch(`${OTP_API_URL}/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
      },
      body: JSON.stringify({ phone, purpose }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.success) {
      return {
        success: false,
        error: data.error || 'Erreur lors de l\'envoi du code',
        retryAfterSeconds: data.retryAfterSeconds,
      };
    }

    return { success: true, channel: data.channel };
  } catch (error) {
    console.error('❌ [OTP/SEND] Erreur réseau:', error);
    return { success: false, error: 'Erreur réseau. Vérifiez votre connexion Internet.' };
  }
}

/**
 * Vérifie le code OTP saisi. Retourne un jeton à transmettre au /signup.
 */
export async function verifyOTPCode(
  phone: string,
  code: string,
  purpose: OTPPurpose = 'registration'
): Promise<VerifyOTPResult> {
  try {
    const response = await fetch(`${OTP_API_URL}/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
      },
      body: JSON.stringify({ phone, purpose, code }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.success) {
      return { success: false, error: data.error || 'Code incorrect' };
    }

    return { success: true, token: data.token };
  } catch (error) {
    console.error('❌ [OTP/VERIFY] Erreur réseau:', error);
    return { success: false, error: 'Erreur réseau. Vérifiez votre connexion Internet.' };
  }
}