/**
 * 🚀 SERVEUR BACKEND SMARTCABB - HONO + SUPABASE
 *
 * Point d'entrée principal qui monte toutes les routes de l'API
 *
 * @version 2.0.2
 * @date 2026-05-08
 */

import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { rateLimit } from "../lib/rate-limit.ts";
import { sendOpsAlert } from "./ops-alerts.ts";

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
import passengerRoutes from "./passenger-routes.ts";
import contactRoutes from "./contact-routes.ts";
import appVersionRoutes from "./app-version-routes.ts";
import otpRoutes from "./otp-routes.ts";
import smsRoutes from "./sms-routes.ts";
import loyaltyRoutes from "./loyalty-routes.ts";
import ejpayRoutes from "./ejpay-routes.ts";
import reservationRoutes from "./reservation-routes.ts";
import emergencyRoutes from "./emergency-routes.ts";
import backupRoutes from "./backup-routes.ts";

const app = new Hono();

// ============================================
// MIDDLEWARES GLOBAUX
// ============================================

// Enable logger pour tous les endpoints
app.use('*', logger(console.log));

// ✅ RATE LIMITING GLOBAL — 100 requêtes par 15 min par IP
app.use('*', rateLimit());

// ✅ CORS — seules les origines de l'application sont autorisées.
// (La clé anon est publique, mais inutile d'ouvrir l'API à tous les sites.)
const ALLOWED_ORIGINS = new Set([
  "https://www.smartcabb.com",
  "https://smartcabb.com",
  "https://www.smartcabb.cd",
  "https://smartcabb.cd",
  "capacitor://localhost",
  "ionic://localhost",
  "http://localhost",
  "https://localhost",
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:4173",
]);

function isAllowedOrigin(origin: string): boolean {
  if (!origin) return true; // clients natifs / curl : pas de CORS
  if (ALLOWED_ORIGINS.has(origin)) return true;
  // Previews Vercel du projet (test avant production).
  if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) return true;
  return false;
}

app.use('*', cors({
  origin: (origin) => {
    if (!origin) return '*';
    return isAllowedOrigin(origin) ? origin : '';
  },
  allowHeaders: [
    'Content-Type',
    'Authorization',
    'X-Client-Info',
    'apikey',
    'Accept',
    'Origin',
    'X-Requested-With',
    'x-admin-2fa',
    'x-admin-secret',
    'x-cron-secret',
  ],
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  exposeHeaders: ['Content-Length', 'X-Request-Id'],
  maxAge: 86400, // 24h — évite les preflight répétitifs
  credentials: false,
}));

// ✅ FIX CRITIQUE — Répondre immédiatement aux requêtes OPTIONS (preflight)
// Sans ça, Supabase Edge Functions ne renvoie pas HTTP 200 sur OPTIONS
// ce qui fait échouer le CORS check côté navigateur
app.options('*', (c) => {
  const origin = c.req.header('origin') || '';
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, apikey, Accept, Origin, X-Requested-With, x-admin-2fa, x-admin-secret, x-cron-secret',
    'Access-Control-Max-Age': '86400',
  };
  if (origin && isAllowedOrigin(origin)) headers['Access-Control-Allow-Origin'] = origin;
  return new Response(null, { status: 204, headers });
});

// ============================================
// ROUTES
// ============================================

// Health check
app.get("/make-server-2eb02e52/health", (c) => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "2.0.2",
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
// ✅ Alias /google-maps → même handler que /maps
app.route("/make-server-2eb02e52/google-maps", googleMapsApi);
app.route("/make-server-2eb02e52/drivers", driverRoutes);
app.route("/make-server-2eb02e52/config", configRoutes);
// ✅ Routes passagers
app.route("/make-server-2eb02e52/passengers", passengerRoutes);
// ✅ Route formulaire de contact site vitrine
app.route("/make-server-2eb02e52/contact", contactRoutes);
// ✅ Route version app (auto-update APK)
app.route("/make-server-2eb02e52/app", appVersionRoutes);
// ✅ Route OTP (vérification de numéro)
app.route("/make-server-2eb02e52/otp", otpRoutes);
// ✅ Route SMS (envoi, config, solde)
app.route("/make-server-2eb02e52/sms", smsRoutes);
// ✅ Route fidélité
app.route("/make-server-2eb02e52/loyalty", loyaltyRoutes);
// ✅ Route réservations (notifications passager à l'acceptation conducteur)
app.route("/make-server-2eb02e52/reservations", reservationRoutes);
// ✅ Route Ejpay — Mobile Money (inactive tant que `ejpayEnabled` est faux)
app.route("/make-server-2eb02e52/ejpay", ejpayRoutes);
// ✅ Route SOS / urgences (persistance + notification de l'équipe sécurité)
app.route("/make-server-2eb02e52/emergency", emergencyRoutes);
// 💾 Route sauvegardes automatiques (export JSON vers bucket privé)
app.route("/make-server-2eb02e52/backups", backupRoutes);

// Route 404
app.notFound((c) => {
  return c.json({
    success: false,
    error: "Route not found",
    path: c.req.path
  }, 404);
});

// Error handler global — ne divulgue jamais le détail interne au client.
app.onError((err, c) => {
  const requestId = crypto.randomUUID();
  console.error(`❌ [${requestId}] Erreur serveur:`, err);

  // 🚨 Alerte email (anti-spam 15 min) — ne bloque jamais la réponse.
  const alertPromise = sendOpsAlert(
    'server_error',
    'Erreur serveur 5xx',
    [
      `Route : ${c.req.method} ${c.req.path}`,
      `Message : ${err instanceof Error ? err.message : String(err)}`,
      `Référence : ${requestId}`,
    ],
    { throttleMs: 15 * 60 * 1000 },
  ).catch(() => undefined);

  try {
    const ctx = (c as any).executionCtx;
    if (ctx?.waitUntil) ctx.waitUntil(alertPromise);
  } catch {
    // pas de contexte d'exécution : l'alerte part en tâche de fond
  }

  return c.json({
    success: false,
    error: 'Erreur interne du serveur',
    requestId,
  }, 500);
});

console.log('✅ SmartCabb Backend Server v2.0.2 démarré');

// Démarrer le serveur
Deno.serve(app.fetch);
