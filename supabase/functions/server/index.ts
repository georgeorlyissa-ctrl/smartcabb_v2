/**
 * 🚀 SERVEUR BACKEND SMARTCABB - HONO + SUPABASE
 *
 * Point d'entrée principal qui monte toutes les routes de l'API
 *
 * @version 2.0.0
 * @date 2026-04-24
 */

import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";

// Import des routes
import rideRoutes from "./ride-routes.ts";
import fcmRoutes from "./fcm-routes.ts";
import adminRoutes from "./admin-routes.ts";
import authRoutes from "./auth-routes.ts";
import cancellationRoutes from "./cancellation-routes.ts";
import fixEmailsRoutes from "./fix-emails-routes.ts";
import purgeUserRoute from "./purge-user-route.ts";
import googleMapsApi from "./google-maps-api.ts";
import driverRoutes from "./driver-routes.ts";
import configRoutes from "./config-routes.ts";

const app = new Hono();

// ============================================
// MIDDLEWARES GLOBAUX
// ============================================

// Enable logger pour tous les endpoints
app.use('*', logger(console.log));

// Enable CORS pour toutes les routes
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// ============================================
// ROUTES
// ============================================

// Health check
app.get("/make-server-2eb02e52/health", (c) => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "2.0.0",
    service: "smartcabb-backend"
  });
});

// Monter les routes
app.route("/make-server-2eb02e52/rides", rideRoutes);
app.route("/make-server-2eb02e52/fcm", fcmRoutes);
app.route("/make-server-2eb02e52/admin", adminRoutes);
app.route("/make-server-2eb02e52/auth", authRoutes);
app.route("/make-server-2eb02e52/cancellation", cancellationRoutes);
app.route("/make-server-2eb02e52/fix-emails", fixEmailsRoutes);
app.route("/make-server-2eb02e52/purge", purgeUserRoute);
app.route("/make-server-2eb02e52/maps", googleMapsApi);
app.route("/make-server-2eb02e52/drivers", driverRoutes);
app.route("/make-server-2eb02e52/config", configRoutes);

// Route 404
app.notFound((c) => {
  return c.json({
    success: false,
    error: "Route not found",
    path: c.req.path
  }, 404);
});

// Error handler global
app.onError((err, c) => {
  console.error('❌ Erreur serveur:', err);
  return c.json({
    success: false,
    error: err.message || 'Internal server error'
  }, 500);
});

console.log('✅ SmartCabb Backend Server démarré');

// Démarrer le serveur
Deno.serve(app.fetch);
