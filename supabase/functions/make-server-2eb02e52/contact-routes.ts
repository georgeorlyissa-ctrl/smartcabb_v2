import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js@2";

const app = new Hono();
const KV_TABLE = "kv_store_2eb02e52";

function kvClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );
}
async function kvGet(key: string): Promise<any> {
  try {
    const { data, error } = await kvClient().from(KV_TABLE).select("value").eq("key", key).maybeSingle();
    if (error) { console.error("KV get error:", key, error.message); return null; }
    return data?.value ?? null;
  } catch (e) { console.error("KV get exception:", e); return null; }
}
async function kvSet(key: string, value: any): Promise<void> {
  try {
    const { error } = await kvClient().from(KV_TABLE).upsert({ key, value });
    if (error) throw new Error(error.message);
  } catch (e) { console.error("KV set error:", key, e); throw e; }
}

app.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const { name, email, phone, subject, message } = body;
    if (!name || !email || !message) {
      return c.json({ success: false, error: "Nom, email et message sont requis" }, 400);
    }
    const createdAt = new Date().toISOString();
    const key = `msg_${Date.now()}`;
    const newMessage = {
      key,
      value: {
        name,
        email,
        phone: phone || "",
        message,
        subject: subject || "Sans objet",
        language: "fr",
        source: "siteweb",
        created_at: createdAt,
        read: false,
      }
    };
    const existing = await kvGet("contact_messages") || [];
    existing.unshift(newMessage);
    await kvSet("contact_messages", existing);
    return c.json({ success: true, message: "Message envoyé avec succès" });
  } catch (error) {
    console.error("Erreur contact:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

app.get("/messages", async (c) => {
  try {
    const messages = await kvGet("contact_messages") || [];
    return c.json({ success: true, messages });
  } catch (error) {
    console.error("Erreur chargement messages:", error);
    return c.json({ success: false, error: "Erreur serveur", messages: [] }, 500);
  }
});

app.post("/mark-read", async (c) => {
  try {
    const body = await c.req.json();
    const { messageKey } = body;
    if (!messageKey) {
      return c.json({ success: false, error: "messageKey requis" }, 400);
    }
    const messages = await kvGet("contact_messages") || [];
    const updated = messages.map((msg: any) => {
      if (msg.key === messageKey) {
        return { ...msg, value: { ...msg.value, read: true } };
      }
      return msg;
    });
    await kvSet("contact_messages", updated);
    return c.json({ success: true, message: "Message marqué comme lu" });
  } catch (error) {
    console.error("Erreur mark-read:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

export default app;
