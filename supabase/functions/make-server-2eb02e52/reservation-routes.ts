/**
 * 📅 ROUTES RÉSERVATIONS - SMARTCABB
 * ⚠️ Fichier autonome : helpers KV inlinés (aucun import local sauf firebase-admin et phone-utils)
 *
 * POST /:id/notify-accept — Notifie le passager quand le conducteur accepte :
 *   1. Push app (FCM) avec les détails du chauffeur (sécurité)
 *   2. WhatsApp via Africa's Talking (si service activé)
 *   3. SMS en repli (si WhatsApp indisponible et SMS configuré)
 *
 * Monté dans index.ts sous /make-server-2eb02e52/reservations
 * @version 1.0.0
 */

import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendFCMNotification, isFirebaseAdminConfigured } from "./firebase-admin.ts";
import { normalizePhoneNumber } from "./phone-utils.ts";

const app = new Hono();

// ─── Clients & helpers ───────────────────────────────────────────────────────
function sbAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );
}

const KV_TABLE = "kv_store_2eb02e52";
async function kvGet(key: string): Promise<any> {
  try {
    const { data, error } = await sbAdmin().from(KV_TABLE).select("value").eq("key", key).maybeSingle();
    if (error) { console.error("KV get error:", key, error.message); return null; }
    return data?.value ?? null;
  } catch (e) { console.error("KV get exception:", e); return null; }
}

// ─── Africa's Talking : WhatsApp puis SMS ─────────────────────────────────────
function atConfig() {
  return {
    username: Deno.env.get("AFRICAS_TALKING_USERNAME") || "",
    apiKey: Deno.env.get("AFRICAS_TALKING_API_KEY") || "",
    waNumber: Deno.env.get("AFRICAS_TALKING_WHATSAPP_WA_NUMBER") || "",
  };
}

async function sendWhatsApp(phone: string, message: string): Promise<{ sent: boolean; reason?: string }> {
  const { username, apiKey, waNumber } = atConfig();
  if (!username || !apiKey || !waNumber) {
    return { sent: false, reason: "WhatsApp non activé (service Africa's Talking à activer)" };
  }
  try {
    const resp = await fetch("https://chat.africastalking.com/whatsapp/message/send", {
      method: "POST",
      headers: { apiKey, Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ username, waNumber, phoneNumber: phone, body: { message } }),
    });
    const data = await resp.json().catch(() => null);
    if (!resp.ok) {
      console.error("❌ [RESERVATION/WHATSAPP] Erreur AT:", resp.status, data);
      return { sent: false, reason: data?.message || `WhatsApp erreur ${resp.status}` };
    }
    console.log("✅ [RESERVATION/WHATSAPP] Envoyé à", phone);
    return { sent: true };
  } catch (e) {
    return { sent: false, reason: e instanceof Error ? e.message : "Erreur réseau WhatsApp" };
  }
}

async function sendSMS(phone: string, message: string): Promise<{ sent: boolean; reason?: string }> {
  const { username, apiKey } = atConfig();
  if (!username || !apiKey) {
    return { sent: false, reason: "SMS non configuré" };
  }
  try {
    const form = new URLSearchParams({ username, to: phone, message });
    const resp = await fetch("https://api.africastalking.com/version1/messaging", {
      method: "POST",
      headers: { apiKey, Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });
    const data = await resp.json().catch(() => null);
    const recipient = data?.SMSMessageData?.Recipients?.[0];
    if (!resp.ok || recipient?.status !== "Success") {
      console.error("❌ [RESERVATION/SMS] Erreur AT:", resp.status, data);
      return { sent: false, reason: recipient?.status || data?.message || `SMS erreur ${resp.status}` };
    }
    console.log("✅ [RESERVATION/SMS] Envoyé à", phone);
    return { sent: true };
  } catch (e) {
    return { sent: false, reason: e instanceof Error ? e.message : "Erreur réseau SMS" };
  }
}

// ─── Labels catégories ───────────────────────────────────────────────────────
const CATEGORY_LABELS: Record<string, string> = {
  smart_standard: "Standard",
  smart_confort: "Confort",
  smart_plus: "Familiale",
  smart_business: "Business",
};

// ─── POST /:id/notify-accept ─────────────────────────────────────────────────
app.post("/:id/notify-accept", async (c) => {
  try {
    const id = c.req.param("id");

    // 1. Réservation (doit être acceptée par le conducteur)
    const { data: ride, error: rideErr } = await sbAdmin()
      .from("scheduled_rides")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (rideErr || !ride) {
      return c.json({ success: false, error: "Réservation introuvable" }, 404);
    }
    if (!ride.driver_id || ride.driver_status !== "accepted") {
      return c.json({ success: false, error: "Réservation non acceptée par un conducteur" }, 400);
    }

    // 2. Conducteur (détails sécurité)
    const driver = await kvGet(`driver:${ride.driver_id}`);
    if (!driver) {
      return c.json({ success: false, error: "Conducteur introuvable" }, 404);
    }
    const vehicle = driver.vehicle || {};
    const driverName = driver.full_name || driver.name || "Votre chauffeur";
    const driverPhone = driver.phone || "";
    const carMake = vehicle.make || "";
    const carModel = vehicle.model || "";
    const carColor = vehicle.color || "";
    const carPlate = vehicle.license_plate || vehicle.plate || "";
    const category = CATEGORY_LABELS[ride.category] || CATEGORY_LABELS[vehicle.category] || ride.category;

    // 3. Passager (téléphone + push)
    const passenger = await kvGet(`passenger:${ride.user_id}`) || await kvGet(`profile:${ride.user_id}`);
    const rawPhone = passenger?.phone || passenger?.phoneNumber || null;
    const phone = rawPhone ? normalizePhoneNumber(rawPhone) : null;

    const dateStr = ride.scheduled_date || "";
    const timeStr = (ride.scheduled_time || "").slice(0, 5);
    const vehicleStr = [carColor, carMake, carModel].filter(Boolean).join(" ") || "Véhicule SmartCabb";

    const message =
      `SmartCabb : votre réservation du ${dateStr} à ${timeStr} est confirmée. ` +
      `Chauffeur : ${driverName}${driverPhone ? ` (${driverPhone})` : ""}. ` +
      `Véhicule : ${vehicleStr}, plaque ${carPlate || "à confirmer"}, catégorie ${category}. ` +
      `Trajet : ${ride.pickup_address} → ${ride.dropoff_address}. ` +
      `Vérifiez la plaque avant de monter. Bon voyage !`;

    const channels: Record<string, { sent: boolean; reason?: string }> = {};

    // 4a. Push app (toujours tenté en premier)
    if (isFirebaseAdminConfigured()) {
      const token = await kvGet(`fcm_token_${ride.user_id}`);
      if (token) {
        const r = await sendFCMNotification(token, {
          title: "✅ Chauffeur attribué",
          body: `${driverName} · ${vehicleStr} · ${carPlate}`,
          data: { type: "reservation_driver_accepted", reservationId: id },
        });
        channels.push = r.success ? { sent: true } : { sent: false, reason: r.error };
      } else {
        channels.push = { sent: false, reason: "App non connectée (token absent)" };
      }
    } else {
      channels.push = { sent: false, reason: "Push non configuré" };
    }

    // 4b. WhatsApp, sinon SMS (service activable plus tard, échec gracieux)
    if (phone) {
      const wa = await sendWhatsApp(phone, message);
      channels.whatsapp = wa;
      if (!wa.sent) {
        channels.sms = await sendSMS(phone, message);
      } else {
        channels.sms = { sent: false, reason: "Non requis (WhatsApp envoyé)" };
      }
    } else {
      channels.whatsapp = { sent: false, reason: "Numéro passager introuvable" };
      channels.sms = { sent: false, reason: "Numéro passager introuvable" };
    }

    console.log(`📅 [RESERVATIONS/NOTIFY-ACCEPT] ${id} →`, JSON.stringify(channels));
    return c.json({ success: true, channels });
  } catch (error) {
    console.error("❌ [RESERVATIONS/NOTIFY-ACCEPT] Erreur:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

export default app;
