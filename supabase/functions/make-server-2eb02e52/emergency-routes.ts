import { Hono } from "npm:hono";
import * as kv from "./kv-wrapper.ts";

const app = new Hono();

app.post("/alert", async (c) => {
  try {
    const alertData = await c.req.json();
    const alertId = crypto.randomUUID();
    const alert = { ...alertData, id: alertId, createdAt: new Date().toISOString(), status: 'active' };
    await kv.set(`emergency:${alertId}`, alert);
    console.log("🚨 Alerte d'urgence créée:", alertId);
    return c.json({ success: true, alert });
  } catch (error) {
    console.error("❌ Erreur alerte urgence:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

export default app;
