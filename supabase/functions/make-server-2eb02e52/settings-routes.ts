import { Hono } from "npm:hono";
import * as kv from "./kv-wrapper.ts";

const app = new Hono();

app.get("/global", async (c) => {
  try {
    const settings = await kv.get('global:settings') || {};
    return c.json({ success: true, settings });
  } catch (error) {
    console.error("❌ Erreur récupération paramètres:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

app.post("/update", async (c) => {
  try {
    const updates = await c.req.json();
    const settings = await kv.get<any>('global:settings') || {};
    Object.assign(settings, updates);
    settings.lastUpdate = new Date().toISOString();
    await kv.set('global:settings', settings);
    return c.json({ success: true, settings });
  } catch (error) {
    console.error("❌ Erreur mise à jour paramètres:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

export default app;
