/**
 * 🛡️ SERVICE 2FA ADMIN - SMARTCABB
 * Double authentification admin par code envoyé par email (SMTP backend)
 * @version 1.0.0
 */

import { projectId, publicAnonKey } from '../utils/supabase/info';

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/admin`;

export interface Send2FAResult {
  success: boolean;
  disabled?: boolean;
  error?: string;
  retryAfterSeconds?: number;
}

export interface Verify2FAResult {
  success: boolean;
  token?: string;
  error?: string;
}

/**
 * Demande l'envoi du code 2FA par email (après mot de passe correct)
 */
export async function sendAdmin2FA(accessToken: string): Promise<Send2FAResult> {
  try {
    const response = await fetch(`${API_BASE}/2fa/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
      },
      body: JSON.stringify({ accessToken }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.success) {
      return {
        success: false,
        error: data.error || 'Erreur lors de l\'envoi du code',
        retryAfterSeconds: data.retryAfterSeconds,
      };
    }

    return { success: true, disabled: data.disabled === true };
  } catch (error) {
    console.error('❌ [2FA/SEND] Erreur réseau:', error);
    return { success: false, error: 'Erreur réseau. Vérifiez votre connexion Internet.' };
  }
}

/**
 * Vérifie le code 2FA. Retourne un jeton de session 2FA.
 */
export async function verifyAdmin2FA(accessToken: string, code: string): Promise<Verify2FAResult> {
  try {
    const response = await fetch(`${API_BASE}/2fa/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
      },
      body: JSON.stringify({ accessToken, code }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.success) {
      return { success: false, error: data.error || 'Code incorrect' };
    }

    return { success: true, token: data.token };
  } catch (error) {
    console.error('❌ [2FA/VERIFY] Erreur réseau:', error);
    return { success: false, error: 'Erreur réseau. Vérifiez votre connexion Internet.' };
  }
}