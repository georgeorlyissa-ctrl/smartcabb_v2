import { Hono } from "npm:hono";

const app = new Hono();

app.get("/data", async (c) => {
  try {
    return c.json({ success: true, message: "Export stub" });
  } catch (error) {
    console.error("❌ Erreur export:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

export default app;
