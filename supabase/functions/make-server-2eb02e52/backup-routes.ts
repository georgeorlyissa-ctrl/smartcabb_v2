import { Hono } from "npm:hono";

const app = new Hono();

app.post("/create", async (c) => {
  try {
    return c.json({ success: true, message: "Backup stub" });
  } catch (error) {
    console.error("❌ Erreur backup:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

export default app;
