import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv-wrapper.ts";
import { isValidUUID } from "./uuid-validator.ts";
import { normalizePhoneNumber, isValidPhoneNumber } from "./phone-utils.ts";
import smsRoutes from "./sms-routes.ts";
import backupRoutes from "./backup-routes.ts";
import exportRoutes from "./export-routes.ts";
import websiteRoutes from "./website-routes.ts";
import chatRoutes from "./chat-routes.ts";
import cleanupRoutes from "./cleanup-routes.ts";
import authRoutes from "./auth-routes.ts";
import driverRoutes from "./driver-routes.ts";
import passengerRoutes from "./passenger-routes.ts";
import walletRoutes from "./wallet-routes.ts";
import rideRoutes from "./ride-routes.ts";
import adminRoutes from "./admin-routes.ts";
import settingsRoutes from "./settings-routes.ts";
import emailRoutes from "./email-routes.ts";
import emergencyRoutes from "./emergency-routes.ts";
import { testRoutes } from "./test-routes.ts";
import diagnosticRoute from "./diagnostic-driver-route.ts";
import geocodingApp from "./geocoding-api.ts";
import analyticsApp from "./analytics-api.ts";
import nominatimApp from "./nominatim-enriched-api.ts";
import fcmRoutes from "./fcm-routes.ts";
import googleMapsApp from "./google-maps-api.ts";
import configRoutes from "./config-routes.ts";
import resetDatabaseRoutes from "./reset-database-routes.ts";
import { securityMiddleware } from "./security-middleware.ts";
import auditRoutes from "./audit-emails-route.ts";

const app = new Hono();

console.log('🚀 Démarrage du serveur SmartCabb V8 - Backend 100% TypeScript');

// Enable logger
app.use('*', logger(console.log));

// Enable CORS
app.use(
  "/*",
  cors({
    origin: ["https://smartcabb.com", "https://www.smartcabb.com", "http://localhost:3000", "http://localhost:5173"],
    allowHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length", "X-RateLimit-Remaining"],
    maxAge: 600,
    credentials: true,
  }),
);

// Health check
app.get("/make-server-2eb02e52/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString(), version: "8.0.0" });
});

// Routes
app.route("/make-server-2eb02e52/sms", smsRoutes);
app.route("/make-server-2eb02e52/backup", backupRoutes);
app.route("/make-server-2eb02e52/export", exportRoutes);
app.route("/make-server-2eb02e52/website", websiteRoutes);
app.route("/make-server-2eb02e52/chat", chatRoutes);
app.route("/make-server-2eb02e52/cleanup", cleanupRoutes);
app.route("/make-server-2eb02e52/auth", authRoutes);
app.route("/make-server-2eb02e52/drivers", driverRoutes);
app.route("/make-server-2eb02e52/passengers", passengerRoutes);
app.route("/make-server-2eb02e52/wallet", walletRoutes);
app.route("/make-server-2eb02e52/rides", rideRoutes);
app.route("/make-server-2eb02e52/admin", adminRoutes);
app.route("/make-server-2eb02e52/settings", settingsRoutes);
app.route("/make-server-2eb02e52/email", emailRoutes);
app.route("/make-server-2eb02e52/emergency", emergencyRoutes);
app.route("/make-server-2eb02e52/test", testRoutes);
app.route("/make-server-2eb02e52/diagnostic", diagnosticRoute);
app.route("/make-server-2eb02e52/geocoding", geocodingApp);
app.route("/make-server-2eb02e52/analytics", analyticsApp);
app.route("/make-server-2eb02e52/nominatim", nominatimApp);
app.route("/make-server-2eb02e52/fcm", fcmRoutes);
app.route("/make-server-2eb02e52/google-maps", googleMapsApp);
app.route("/make-server-2eb02e52/config", configRoutes);
app.route("/make-server-2eb02e52/reset", resetDatabaseRoutes);
app.route("/make-server-2eb02e52/audit", auditRoutes);

console.log('✅ Serveur SmartCabb prêt - Tous les modules chargés');

Deno.serve(app.fetch);
