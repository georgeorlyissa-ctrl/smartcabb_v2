import { Hono } from "npm:hono";

const app = new Hono();

app.post("/database", async (c) => {
  try {
    return c.json({ success: false, error: "Not implemented" }, 501);
  } catch (error) {
    console.error("❌ Erreur reset:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

export default app;
