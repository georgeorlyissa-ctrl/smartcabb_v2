import { Hono } from "npm:hono";

const app = new Hono();

app.get("/ping", (c) => {
  return c.json({ success: true, message: "pong", timestamp: new Date().toISOString() });
});

export const testRoutes = app;
export default app;
