/**
 * 🔐 ROUTES OTP - SMARTCABB
 * POST /otp/send   — Envoyer un code OTP par SMS via EJ SMS
 * POST /otp/verify — Vérifier le code OTP et obtenir un jeton de vérification
 * @version 2.0.0
 */

import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js@2";
import { normalizePhoneNumber, isValidPhoneNumber } from "./phone-utils.ts";
import {
  OTP_PURPOSES,
  canSendOTP,
  createOTP,
  sendOTPViaSMS,
  verifyOTP,
} from "./otp-core.ts";

const app = new Hono();

// ─── Garde d'authentification / anti-abus ─────────────────────────────────────
// L'Edge Function est en `verify_jwt = false` : on vérifie nous-mêmes que
// l'appelant est l'application (anon key) ou un utilisateur connecté, puis on
// borne le débit pour éviter de vider les crédits SMS.

function bearerToken(c: any): string {
  const header = c.req.header("Authorization") || c.req.header("authorization") || "";
  const match = /^Bearer\s+(.+)$/i.exec(String(header).trim());
  return match ? match[1].trim() : "";
}

function safeEqual(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function requireAppOrUser(c: any): Promise<boolean> {
  const token = bearerToken(c);
  if (!token) return false;

  const anon = Deno.env.get("SUPABASE_ANON_KEY") || "";
  if (anon && safeEqual(token, anon)) return true;

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );
    const { data, error } = await supabase.auth.getUser(token);
    return !error && Boolean(data?.user);
  } catch {
    return false;
  }
}

const OTP_RATE_WINDOW_MS = 10 * 60 * 1000;
const OTP_RATE_PER_IP = 10;
const otpRateBuckets = new Map<string, number[]>();

function checkIpRateLimit(ip: string): boolean {
  const now = Date.now();
  const hits = (otpRateBuckets.get(ip) || []).filter((t) => now - t < OTP_RATE_WINDOW_MS);
  if (hits.length >= OTP_RATE_PER_IP) {
    otpRateBuckets.set(ip, hits);
    return false;
  }
  hits.push(now);
  otpRateBuckets.set(ip, hits);
  return true;
}

function clientIp(c: any): string {
  const forwarded = c.req.header("x-forwarded-for") || "";
  return String(forwarded).split(",")[0].trim() || "unknown";
}

// ─── POST /send — Envoyer un code OTP ─────────────────────────────────────────

app.post("/send", async (c) => {
  try {
    if (!(await requireAppOrUser(c))) {
      return c.json({ success: false, error: "Authentification requise" }, 401);
    }

    const ip = clientIp(c);
    if (!checkIpRateLimit(ip)) {
      console.warn("⚠️ [OTP] Limite par IP atteinte:", ip);
      return c.json({ success: false, error: "Trop de demandes, réessayez dans quelques minutes" }, 429);
    }

    const body = await c.req.json().catch(() => ({}));
    const { phone, purpose = "registration" } = body;

    if (!OTP_PURPOSES.includes(purpose as any)) {
      return c.json({ success: false, error: "Purpose invalide. Attendu: registration, reset-password ou login" }, 400);
    }

    const normalized = normalizePhoneNumber(phone);
    if (!normalized || !isValidPhoneNumber(normalized)) {
      return c.json({ success: false, error: "Numéro de téléphone invalide. Format attendu : +243XXXXXXXXX" }, 400);
    }

    const cooldown = await canSendOTP(normalized, purpose as string);
    if (!cooldown.allowed) {
      return c.json({
        success: false,
        error: `Veuillez attendre ${cooldown.retryAfterSeconds}s avant de redemander un code`,
        retryAfterSeconds: cooldown.retryAfterSeconds,
      }, 429);
    }

    const code = await createOTP(normalized, purpose as string);

    // Envoi unique par SMS via EJ SMS
    const sms = await sendOTPViaSMS(normalized, code, purpose as string);
    if (sms.ok) {
      return c.json({ success: true, channel: "sms", message: "Code envoyé par SMS" });
    }

    console.error("❌ [OTP] Envoi SMS impossible:", sms.error);
    return c.json({
      success: false,
      error: `Envoi du code impossible (SMS: ${sms.error || "n/a"})`,
    }, 500);
  } catch (error) {
    console.error("❌ [OTP/SEND] Erreur inattendue:", error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : "Erreur lors de l'envoi du code",
    }, 500);
  }
});

// ─── POST /verify — Vérifier le code OTP ──────────────────────────────────────

app.post("/verify", async (c) => {
  try {
    if (!(await requireAppOrUser(c))) {
      return c.json({ success: false, error: "Authentification requise" }, 401);
    }

    const body = await c.req.json().catch(() => ({}));
    const { phone, purpose = "registration", code } = body;

    if (!OTP_PURPOSES.includes(purpose as any)) {
      return c.json({ success: false, error: "Purpose invalide. Attendu: registration, reset-password ou login" }, 400);
    }

    const normalized = normalizePhoneNumber(phone);
    if (!normalized || !isValidPhoneNumber(normalized)) {
      return c.json({ success: false, error: "Numéro de téléphone invalide. Format attendu : +243XXXXXXXXX" }, 400);
    }
    if (!code) {
      return c.json({ success: false, error: "Code OTP requis" }, 400);
    }

    const result = await verifyOTP(normalized, purpose as string, String(code));

    if (!result.ok) {
      return c.json({ success: false, error: result.error }, 400);
    }

    return c.json({
      success: true,
      token: result.token,
      purpose: purpose as string,
      message: "Numéro vérifié avec succès",
    });
  } catch (error) {
    console.error("❌ [OTP/VERIFY] Erreur inattendue:", error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : "Erreur lors de la vérification du code",
    }, 500);
  }
});

export default app;