import { Hono } from "npm:hono";
import * as kv from "./kv-wrapper.ts";

const app = new Hono();

app.post("/send", async (c) => {
  try {
    const messageData = await c.req.json();
    const messageId = crypto.randomUUID();
    const message = { ...messageData, id: messageId, timestamp: new Date().toISOString() };
    await kv.set(`chat:${messageId}`, message);
    return c.json({ success: true, message });
  } catch (error) {
    console.error("❌ Erreur chat:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

export default app;
