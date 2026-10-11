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
async function kvSet(key: string, value: any): Promise<void> {
  try {
    const { error } = await sbAdmin().from(KV_TABLE).upsert({ key, value });
    if (error) throw new Error(error.message);
  } catch (e) { console.error("KV set error:", key, e); throw e; }
}

// ─── Accusés persistés par utilisateur (cloche uniforme sur tous les appareils) ─
const USER_NOTIF_PREFIX = "user_notif:";
const FULL_CATEGORY_LABELS: Record<string, string> = {
  smart_standard: "SMARTCABB Standard",
  smart_confort: "SMARTCABB Confort",
  smart_plus: "SMARTCABB Familiale",
  smart_business: "SMARTCABB Business",
};

function fmtDateFR(dateStr: string): string {
  try {
    const d = new Date(`${dateStr}T12:00:00`);
    const s = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(d);
    return s.charAt(0).toUpperCase() + s.slice(1);
  } catch { return dateStr; }
}
function fmtTimeFR(timeStr: string): string {
  const m = /^(\d{1,2}):(\d{2})/.exec(timeStr || "");
  if (!m) return timeStr;
  return `${parseInt(m[1], 10)}h${m[2]}`;
}

function confirmationMessage(ride: any): { title: string; message: string } {
  const cat = FULL_CATEGORY_LABELS[ride.category] || ride.category;
  const title = "🎉 Réservation confirmée !";
  const message =
    `Bonjour et merci d'avoir choisi SMARTCABB !\n\n` +
    `Votre réservation pour une course en catégorie ${cat} a bien été enregistrée avec succès.\n\n` +
    `📅 Date : ${fmtDateFR(ride.scheduled_date)}\n` +
    `🕗 Heure de prise en charge : ${fmtTimeFR(ride.scheduled_time)}\n` +
    `🚘 Catégorie : ${cat}\n\n` +
    `✅ Votre réservation est bien prise en compte. Nous vous invitons à être prêt(e) à l'heure convenue afin de faciliter votre prise en charge.\n\n` +
    `👨‍✈️ Informations du chauffeur : dans quelques instants, nous vous transmettrons les informations de votre chauffeur, notamment son nom, les détails du véhicule et les informations nécessaires pour le reconnaître facilement lors de votre prise en charge.\n\n` +
    `💙 Merci pour votre confiance et votre fidélité. Avec SMARTCABB, profitez d'un déplacement simple, confortable et sécurisé.\n\n` +
    `SMARTCABB — Ride Smart, Live Smart !`;
  return { title, message };
}

async function storeUserNotif(userId: string, title: string, message: string, kind: string, reservationId: string) {
  const notif = {
    id: `res_${kind}_${reservationId}`,
    title,
    message,
    createdAt: new Date().toISOString(),
    kind,
    reservationId,
  };
  await kvSet(`${USER_NOTIF_PREFIX}${userId}:${notif.id}`, notif);
  return notif;
}

async function getUserNotifs(userId: string) {
  try {
    const { data, error } = await sbAdmin()
      .from(KV_TABLE).select("key, value").like("key", `${USER_NOTIF_PREFIX}${userId}:%`)
      .order("key", { ascending: false }).limit(50);
    if (error) throw new Error(error.message);
    return (data || []).map((d: any) => d.value).filter(Boolean)
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (e) { console.error("User notifs:", e); return []; }
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

    // 5. Accusé persistant pour la cloche (uniforme sur tous les appareils)
    try {
      const vehicleStr = [carColor, carMake, carModel].filter(Boolean).join(" ") || "Véhicule SmartCabb";
      await storeUserNotif(
        ride.user_id,
        "👨‍✈️ Votre chauffeur est attribué",
        `Bonne nouvelle ! Votre chauffeur pour le ${fmtDateFR(ride.scheduled_date)} à ${fmtTimeFR(ride.scheduled_time)} est confirmé.\n\n` +
        `👨‍✈️ Chauffeur : ${driverName}${driverPhone ? ` (${driverPhone})` : ""}\n` +
        `🚘 Véhicule : ${vehicleStr}\n` +
        `🔢 Plaque : ${carPlate || "à confirmer"}\n` +
        `🚘 Catégorie : ${category}\n\n` +
        `Vérifiez la plaque avant de monter. Bon voyage avec SMARTCABB !`,
        "driver",
        id
      );
    } catch (e) { console.warn("Store driver notif:", e); }

    return c.json({ success: true, channels });
  } catch (error) {
    console.error("❌ [RESERVATIONS/NOTIFY-ACCEPT] Erreur:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

// ─── POST /notify-created — Accusé de confirmation après enregistrement réel ─
// À appeler UNIQUEMENT après insertion réussie en base (le message affirme
// que la réservation est enregistrée). Persiste l'accusé pour la cloche.
app.post("/notify-created", async (c) => {
  try {
    const { rideId } = await c.req.json();
    if (!rideId) return c.json({ success: false, error: "rideId requis" }, 400);

    const { data: ride, error } = await sbAdmin()
      .from("scheduled_rides").select("*").eq("id", rideId).maybeSingle();
    if (error || !ride) {
      return c.json({ success: false, error: "Réservation introuvable — non enregistrée" }, 404);
    }

    const { title, message } = confirmationMessage(ride);
    const notif = await storeUserNotif(ride.user_id, title, message, "created", rideId);
    console.log(`📅 [RESERVATIONS/NOTIFY-CREATED] ${rideId} → accusé persisté`);
    return c.json({ success: true, notification: notif });
  } catch (error) {
    console.error("❌ [RESERVATIONS/NOTIFY-CREATED] Erreur:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

// ─── GET /mine/:userId — Accusés du passager (cloche uniforme) ───────────────
app.get("/mine/:userId", async (c) => {
  try {
    const userId = c.req.param("userId");
    const notifications = await getUserNotifs(userId);
    return c.json({ success: true, notifications });
  } catch (error) {
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

export default app;
