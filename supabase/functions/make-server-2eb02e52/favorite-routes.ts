import { Hono } from "npm:hono";
import * as kv from "./kv-wrapper.ts";

const app = new Hono();

app.post("/make-server-2eb02e52/favorites/add", async (c) => {
  try {
    const { userId, location } = await c.req.json();
    const favorites = await kv.get<any>(`favorites:${userId}`) || { locations: [] };
    favorites.locations.push(location);
    await kv.set(`favorites:${userId}`, favorites);
    return c.json({ success: true, favorites });
  } catch (error) {
    console.error("❌ Erreur favoris:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

export default app;
