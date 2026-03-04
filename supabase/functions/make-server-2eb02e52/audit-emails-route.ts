import { Hono } from "npm:hono";

const app = new Hono();

app.get("/emails", async (c) => {
  try {
    return c.json({ success: true, emails: [] });
  } catch (error) {
    console.error("❌ Erreur audit:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

export default app;
