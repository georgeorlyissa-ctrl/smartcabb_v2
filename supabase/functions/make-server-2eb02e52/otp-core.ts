/**
 * 🔐 OTP CORE - SMARTCABB
 * Logique de vérification de numéro par OTP (inscription, reset mot de passe, login)
 * Envoi WhatsApp (Africa's Talking WhatsApp Business API) avec fallback SMS
 * @version 1.0.0
 */

import { createClient } from "npm:@supabase/supabase-js@2";

const KV_TABLE = "kv_store_2eb02e52";
const CONFIG_KEY = "smartcabb_global_config";

export const OTP_PURPOSES = ["registration", "reset-password", "login"] as const;
export type OTPPurpose = (typeof OTP_PURPOSES)[number];

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

// ─── Clés KV ──────────────────────────────────────────────────────────────────

function otpKey(phone: string, purpose: string): string {
  return `otp:${phone}:${purpose}`;
}

function otpVerifiedKey(phone: string, purpose: string): string {
  return `otp_verified:${phone}:${purpose}`;
}

function otpSendKey(phone: string, purpose: string): string {
  return `otp_send:${phone}:${purpose}`;
}

// ─── Génération ───────────────────────────────────────────────────────────────

export function generateOTP(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function generateToken(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

// ─── Config ───────────────────────────────────────────────────────────────────

/**
 * Lit le flag otpRequired de la config globale (admin).
 * Tant qu'il est false, /signup accepte les inscriptions sans OTP (rétrocompatible).
 */
export async function isOTPRequired(): Promise<boolean> {
  try {
    const stored = await kvGet(CONFIG_KEY);
    return stored?.otpRequired === true;
  } catch (e) {
    console.error("⚠️ [OTP] Lecture config échouée:", e);
    return false;
  }
}

// ─── Envoi ────────────────────────────────────────────────────────────────────

/**
 * Vérifie le cooldown de renvoi (60s)
 */
export async function canSendOTP(
  phone: string,
  purpose: string
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const last = await kvGet(otpSendKey(phone, purpose));
  if (last && Date.now() - (last as number) < OTP_RESEND_COOLDOWN_MS) {
    const wait = OTP_RESEND_COOLDOWN_MS - (Date.now() - (last as number));
    return { allowed: false, retryAfterSeconds: Math.ceil(wait / 1000) };
  }
  return { allowed: true, retryAfterSeconds: 0 };
}

/**
 * Génère et stocke un code OTP pour un numéro
 */
export async function createOTP(phone: string, purpose: string): Promise<string> {
  const code = generateOTP();
  await kvSet(otpKey(phone, purpose), {
    code,
    attempts: 0,
    createdAt: Date.now(),
    expiresAt: Date.now() + OTP_TTL_MS,
  });
  await kvSet(otpSendKey(phone, purpose), Date.now());
  console.log(`🔐 [OTP] Code généré pour ${phone} (${purpose})`);
  return code;
}

function purposeText(purpose: string): string {
  if (purpose === "registration") return "Pour confirmer votre inscription SmartCabb.";
  if (purpose === "reset-password") return "Pour reinitialiser votre mot de passe SmartCabb.";
  return "Utilisez ce code pour vous authentifier.";
}

/**
 * Envoie le code via WhatsApp (Africa's Talking WhatsApp Business API)
 * POST https://chat.africastalking.com/whatsapp/message/send
 */
export async function sendOTPViaWhatsApp(
  phone: string,
  code: string,
  purpose: string
): Promise<{ ok: boolean; error?: string }> {
  const username = Deno.env.get("AFRICAS_TALKING_USERNAME") || "";
  const apiKey = Deno.env.get("AFRICAS_TALKING_API_KEY") || "";
  const waNumber = Deno.env.get("AFRICAS_TALKING_WHATSAPP_WA_NUMBER") || "";

  if (!username || !apiKey || !waNumber) {
    return { ok: false, error: "WhatsApp non configuré (AFRICAS_TALKING_WHATSAPP_WA_NUMBER manquant)" };
  }

  const message = `SmartCabb : Votre code de verification est ${code}. ${purposeText(purpose)} Ne partagez jamais ce code avec qui que ce soit.`;

  try {
    const response = await fetch("https://chat.africastalking.com/whatsapp/message/send", {
      method: "POST",
      headers: {
        apiKey,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username,
        waNumber,
        phoneNumber: phone,
        body: { message },
      }),
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      console.error("❌ [OTP/WHATSAPP] Erreur AT:", response.status, data);
      return { ok: false, error: data?.message || `WhatsApp API erreur ${response.status}` };
    }
    console.log("✅ [OTP/WHATSAPP] Code envoyé par WhatsApp à", phone);
    return { ok: true };
  } catch (e) {
    console.error("❌ [OTP/WHATSAPP] Exception:", e);
    return { ok: false, error: e instanceof Error ? e.message : "Erreur réseau WhatsApp" };
  }
}

/**
 * Envoie le code par SMS (Africa's Talking SMS API) - fallback
 * POST https://api.africastalking.com/version1/messaging
 */
export async function sendOTPViaSMS(
  phone: string,
  code: string,
  purpose: string
): Promise<{ ok: boolean; error?: string }> {
  const username = Deno.env.get("AFRICAS_TALKING_USERNAME") || "";
  const apiKey = Deno.env.get("AFRICAS_TALKING_API_KEY") || "";

  if (!username || !apiKey) {
    return { ok: false, error: "SMS non configuré (env manquantes)" };
  }

  const message = `SmartCabb : Votre code de verification est ${code}. ${purposeText(purpose)} Ne partagez jamais ce code.`;

  try {
    const form = new URLSearchParams({ username, to: phone, message });
    const response = await fetch("https://api.africastalking.com/version1/messaging", {
      method: "POST",
      headers: {
        apiKey,
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    });

    const data = await response.json().catch(() => null);
    const recipient = data?.SMSMessageData?.Recipients?.[0];
    if (!response.ok || recipient?.status !== "Success") {
      console.error("❌ [OTP/SMS] Erreur AT:", response.status, data);
      return { ok: false, error: recipient?.status || data?.message || `SMS API erreur ${response.status}` };
    }
    console.log("✅ [OTP/SMS] Code envoyé par SMS à", phone);
    return { ok: true };
  } catch (e) {
    console.error("❌ [OTP/SMS] Exception:", e);
    return { ok: false, error: e instanceof Error ? e.message : "Erreur réseau SMS" };
  }
}

// ─── Vérification ─────────────────────────────────────────────────────────────

/**
 * Vérifie le code OTP saisi par l'utilisateur.
 * En cas de succès, génère un jeton de vérification consommable par /signup.
 */
export async function verifyOTP(
  phone: string,
  purpose: string,
  code: string
): Promise<{ ok: boolean; error?: string; token?: string }> {
  const entry = await kvGet(otpKey(phone, purpose));

  if (!entry) {
    return { ok: false, error: "Aucun code envoyé pour ce numéro. Demandez un nouveau code." };
  }
  if (Date.now() > (entry.expiresAt as number)) {
    await kvDel(otpKey(phone, purpose));
    return { ok: false, error: "Code expiré. Demandez un nouveau code." };
  }
  if ((entry.attempts as number) >= OTP_MAX_ATTEMPTS) {
    await kvDel(otpKey(phone, purpose));
    return { ok: false, error: "Trop de tentatives. Demandez un nouveau code." };
  }
  if (String(entry.code) !== String(code).trim()) {
    await kvSet(otpKey(phone, purpose), { ...entry, attempts: (entry.attempts as number) + 1 });
    return { ok: false, error: "Code incorrect. Vérifiez le code reçu." };
  }

  await kvDel(otpKey(phone, purpose));

  const token = generateToken();
  await kvSet(otpVerifiedKey(phone, purpose), {
    token,
    phone,
    purpose,
    expiresAt: Date.now() + VERIFIED_TTL_MS,
  });

  console.log(`✅ [OTP] Numéro vérifié: ${phone} (${purpose})`);
  return { ok: true, token };
}

/**
 * Vérifie le jeton de vérification fourni au /signup (consommé après usage).
 */
export async function verifyOTPToken(
  phone: string,
  purpose: string,
  token: string | null | undefined
): Promise<{ ok: boolean; error?: string }> {
  if (!token) {
    return { ok: false, error: "Vérification du numéro requise (code OTP)." };
  }

  const entry = await kvGet(otpVerifiedKey(phone, purpose));
  if (!entry) {
    return { ok: false, error: "Numéro non vérifié. Veuillez confirmer votre code OTP." };
  }
  if (entry.token !== token) {
    return { ok: false, error: "Jeton de vérification invalide." };
  }
  if (Date.now() > (entry.expiresAt as number)) {
    await kvDel(otpVerifiedKey(phone, purpose));
    return { ok: false, error: "Vérification expirée. Veuillez redemander un code OTP." };
  }

  await kvDel(otpVerifiedKey(phone, purpose));
  return { ok: true };
}