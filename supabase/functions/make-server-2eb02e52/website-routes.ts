import { Hono } from "npm:hono";
import * as kv from "./kv-wrapper.ts";

const app = new Hono();

app.post("/contact", async (c) => {
  try {
    const contactData = await c.req.json();
    const contactId = crypto.randomUUID();
    const contact = { ...contactData, id: contactId, createdAt: new Date().toISOString() };
    await kv.set(`contact:${contactId}`, contact);
    return c.json({ success: true });
  } catch (error) {
    console.error("❌ Erreur contact:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

export default app;
