/**
 * 🔐 ROUTES OTP - SMARTCABB
 * POST /otp/send   — Envoyer un code OTP (WhatsApp en priorité, fallback SMS)
 * POST /otp/verify — Vérifier le code OTP et obtenir un jeton de vérification
 * @version 1.0.0
 */

import { Hono } from "npm:hono";
import { normalizePhoneNumber, isValidPhoneNumber } from "./phone-utils.ts";
import {
  OTP_PURPOSES,
  canSendOTP,
  createOTP,
  sendOTPViaWhatsApp,
  sendOTPViaSMS,
  verifyOTP,
} from "./otp-core.ts";

const app = new Hono();

// ─── POST /send — Envoyer un code OTP ─────────────────────────────────────────

app.post("/send", async (c) => {
  try {
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

    // WhatsApp en priorité
    const whatsapp = await sendOTPViaWhatsApp(normalized, code, purpose as string);
    if (whatsapp.ok) {
      return c.json({ success: true, channel: "whatsapp", message: "Code envoyé par WhatsApp" });
    }
    console.warn("⚠️ [OTP] WhatsApp indisponible, fallback SMS:", whatsapp.error);

    // Fallback SMS
    const sms = await sendOTPViaSMS(normalized, code, purpose as string);
    if (sms.ok) {
      return c.json({ success: true, channel: "sms", message: "Code envoyé par SMS" });
    }

    console.error("❌ [OTP] Aucun canal disponible:", { whatsapp: whatsapp.error, sms: sms.error });
    return c.json({
      success: false,
      error: `Envoi du code impossible (WhatsApp: ${whatsapp.error || "n/a"}, SMS: ${sms.error || "n/a"})`,
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