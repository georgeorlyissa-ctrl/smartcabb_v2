/**
 * 🔐 ADMIN 2FA CORE - SMARTCABB
 * Double authentification admin par code envoyé par email (SMTP Gmail)
 * @version 1.0.0
 */

import { createClient } from "npm:@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6.9.13";

const KV_TABLE = "kv_store_2eb02e52";
const CONFIG_KEY = "smartcabb_global_config";

const OTP_TTL_MS = 10 * 60 * 1000;              // Code valide 10 minutes
const OTP_MAX_ATTEMPTS = 5;                     // 5 tentatives max
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;       // 60s entre deux envois
const VERIFIED_TTL_MS = 10 * 60 * 1000;         // Jeton de vérification valide 10 minutes

// ─── KV helpers ───────────────────────────────────────────────────────────────

function kvClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );
}

async function kvGet(key: string): Promise<any> {
  try {
    const { data, error } = await kvClient()
      .from(KV_TABLE).select("value").eq("key", key).maybeSingle();
    if (error) { console.error("KV get error:", key, error.message); return null; }
    return data?.value ?? null;
  } catch (e) { console.error("KV get exception:", key, e); return null; }
}

async function kvSet(key: string, value: any): Promise<void> {
  try {
    const { error } = await kvClient().from(KV_TABLE).upsert({ key, value });
    if (error) throw new Error(error.message);
  } catch (e) { console.error("KV set error:", key, e); throw e; }
}

async function kvDel(key: string): Promise<void> {
  try {
    const { error } = await kvClient().from(KV_TABLE).delete().eq("key", key);
    if (error) throw new Error(error.message);
  } catch (e) { console.error("KV del error:", key, e); }
}

// ─── Config ───────────────────────────────────────────────────────────────────

/**
 * Email destinataire des codes 2FA admin (configurable via env ADMIN_2FA_EMAIL)
 */
export function getAdmin2FAEmail(): string | null {
  return Deno.env.get("ADMIN_2FA_EMAIL") || null;
}

/**
 * Lit le flag admin2faRequired de la config globale (admin).
 */
export async function isAdmin2FARequired(): Promise<boolean> {
  try {
    const stored = await kvGet(CONFIG_KEY);
    return stored?.admin2faRequired === true;
  } catch (e) {
    console.error("⚠️ [2FA] Erreur lecture config:", e);
    return false;
  }
}

// ─── Clés KV ──────────────────────────────────────────────────────────────────

function otpKey(email: string, purpose: string): string {
  return `otp_email:${email}:${purpose}`;
}

function otpVerifiedKey(email: string, purpose: string): string {
  return `otp_email_verified:${email}:${purpose}`;
}

function otpSendKey(email: string, purpose: string): string {
  return `otp_email_send:${email}:${purpose}`;
}

// ─── Génération ───────────────────────────────────────────────────────────────

export function generateOTP(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// ─── Cooldown ─────────────────────────────────────────────────────────────────

export async function canSendEmailOTP(
  email: string,
  purpose: string
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const last = await kvGet(otpSendKey(email, purpose));
  if (!last) return { allowed: true, retryAfterSeconds: 0 };

  const elapsed = Date.now() - (last as number);
  if (elapsed < OTP_RESEND_COOLDOWN_MS) {
    return { allowed: false, retryAfterSeconds: Math.ceil((OTP_RESEND_COOLDOWN_MS - elapsed) / 1000) };
  }
  return { allowed: true, retryAfterSeconds: 0 };
}

// ─── Création du code ─────────────────────────────────────────────────────────

export async function createEmailOTP(email: string, purpose: string): Promise<string> {
  const code = generateOTP();
  await kvSet(otpKey(email, purpose), {
    code,
    createdAt: Date.now(),
    attempts: 0,
  });
  await kvSet(otpSendKey(email, purpose), Date.now());
  return code;
}

// ─── Envoi SMTP (Gmail App Password) ──────────────────────────────────────────

export async function sendEmailViaSMTP(
  to: string,
  subject: string,
  html: string
): Promise<{ ok: boolean; error?: string }> {
  const host = Deno.env.get("SMTP_HOST") || "smtp.gmail.com";
  const port = Number(Deno.env.get("SMTP_PORT") || 465);
  const user = Deno.env.get("SMTP_USER");
  const pass = Deno.env.get("SMTP_PASSWORD");

  if (!user || !pass) {
    return { ok: false, error: "SMTP non configuré (SMTP_USER / SMTP_PASSWORD manquants)" };
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    await transporter.sendMail({
      from: `"SmartCabb Admin" <${user}>`,
      to,
      subject,
      html,
    });

    return { ok: true };
  } catch (error) {
    console.error("❌ [2FA/EMAIL] Erreur SMTP:", error);
    return { ok: false, error: error instanceof Error ? error.message : "Erreur SMTP" };
  }
}

/**
 * Envoi d'un code OTP par email (2FA admin).
 */
export async function sendEmailOTP(
  email: string,
  purpose: string
): Promise<{ ok: boolean; channel?: string; error?: string; retryAfterSeconds?: number }> {
  const cooldown = await canSendEmailOTP(email, purpose);
  if (!cooldown.allowed) {
    return { ok: false, error: `Veuillez attendre ${cooldown.retryAfterSeconds}s avant de redemander un code`, retryAfterSeconds: cooldown.retryAfterSeconds };
  }

  const code = await createEmailOTP(email, purpose);

  const subject = "🔐 SmartCabb - Code de connexion admin";
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px;">
      <h2 style="color: #6d28d9; margin: 0 0 16px;">SmartCabb - Connexion administrateur</h2>
      <p style="color: #374151; font-size: 15px;">Utilisez ce code pour valider votre connexion :</p>
      <div style="background: #f5f3ff; border: 2px dashed #7c3aed; border-radius: 8px; padding: 16px; text-align: center; margin: 16px 0;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #5b21b6; font-family: monospace;">${code}</span>
      </div>
      <p style="color: #6b7280; font-size: 13px;">Ce code expire dans <strong>10 minutes</strong>. Ne le partagez avec personne.</p>
      <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
    </div>
  `;

  const result = await sendEmailViaSMTP(email, subject, html);
  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  console.log(`✅ [2FA/EMAIL] Code envoyé à ${email}`);
  return { ok: true, channel: "email" };
}

// ─── Vérification du code ─────────────────────────────────────────────────────

export async function verifyEmailOTP(
  email: string,
  purpose: string,
  code: string | null | undefined
): Promise<{ ok: boolean; token?: string; error?: string }> {
  if (!code) {
    return { ok: false, error: "Veuillez entrer le code reçu par email." };
  }

  const entry = await kvGet(otpKey(email, purpose));
  if (!entry) {
    return { ok: false, error: "Aucun code actif. Veuillez redemander un code." };
  }

  if (Date.now() > (entry.createdAt as number) + OTP_TTL_MS) {
    await kvDel(otpKey(email, purpose));
    return { ok: false, error: "Code expiré. Veuillez redemander un code." };
  }

  if (String(entry.code) !== String(code)) {
    const attempts = (entry.attempts as number) + 1;
    await kvSet(otpKey(email, purpose), { ...entry, attempts });
    if (attempts >= OTP_MAX_ATTEMPTS) {
      await kvDel(otpKey(email, purpose));
      return { ok: false, error: "Trop de tentatives. Veuillez redemander un code." };
    }
    return { ok: false, error: "Code incorrect. Vérifiez l'email reçu." };
  }

  await kvDel(otpKey(email, purpose));

  const token = crypto.randomUUID();
  await kvSet(otpVerifiedKey(email, purpose), {
    token,
    expiresAt: Date.now() + VERIFIED_TTL_MS,
  });

  console.log(`✅ [2FA/EMAIL] Code vérifié pour ${email}`);
  return { ok: true, token };
}

// ─── Vérification du jeton (consommé après usage) ─────────────────────────────

export async function verifyEmailOTPToken(
  email: string,
  purpose: string,
  token: string | null | undefined
): Promise<{ ok: boolean; error?: string }> {
  if (!token) {
    return { ok: false, error: "Vérification 2FA requise." };
  }

  const entry = await kvGet(otpVerifiedKey(email, purpose));
  if (!entry) {
    return { ok: false, error: "2FA non vérifié. Veuillez saisir le code reçu par email." };
  }
  if (entry.token !== token) {
    return { ok: false, error: "Jeton 2FA invalide." };
  }
  if (Date.now() > (entry.expiresAt as number)) {
    await kvDel(otpVerifiedKey(email, purpose));
    return { ok: false, error: "Vérification 2FA expirée. Veuillez vous reconnecter." };
  }

  await kvDel(otpVerifiedKey(email, purpose));
  return { ok: true };
}