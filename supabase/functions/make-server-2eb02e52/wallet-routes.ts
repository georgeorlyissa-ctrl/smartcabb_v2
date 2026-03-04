import { Hono } from "npm:hono";
import * as kv from "./kv-wrapper.ts";
import { isValidUUID } from "./uuid-validator.ts";

const app = new Hono();

app.post("/recharge", async (c) => {
  try {
    const { userId, amount } = await c.req.json();
    if (!isValidUUID(userId)) {
      return c.json({ success: false, error: "ID utilisateur invalide" }, 400);
    }
    const wallet = await kv.get<any>(`wallet:${userId}`) || { balance: 0 };
    wallet.balance = (wallet.balance || 0) + amount;
    wallet.lastUpdate = new Date().toISOString();
    await kv.set(`wallet:${userId}`, wallet);
    return c.json({ success: true, wallet });
  } catch (error) {
    console.error("❌ Erreur recharge:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

app.get("/:userId", async (c) => {
  try {
    const userId = c.req.param('userId');
    if (!isValidUUID(userId)) {
      return c.json({ success: false, error: "ID utilisateur invalide" }, 400);
    }
    const wallet = await kv.get(`wallet:${userId}`) || { balance: 0 };
    return c.json({ success: true, wallet });
  } catch (error) {
    console.error("❌ Erreur récupération wallet:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

export default app;
