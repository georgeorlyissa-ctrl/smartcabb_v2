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

const app = new Hono();

// ============================================
// MIDDLEWARES GLOBAUX
// ============================================

// Enable logger pour tous les endpoints
app.use('*', logger(console.log));

// ✅ FIX CORS — Doit être AVANT toutes les routes
// Supabase Edge Functions nécessite une gestion explicite du preflight OPTIONS
app.use('*', cors({
  origin: (origin) => {
    // Autoriser tous les origines (ajuster si besoin pour plus de sécurité)
    return origin || '*';
  },
  allowHeaders: [
    'Content-Type',
    'Authorization',
    'X-Client-Info',
    'apikey',
    'Accept',
    'Origin',
    'X-Requested-With',
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
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, apikey, Accept, Origin, X-Requested-With',
      'Access-Control-Max-Age': '86400',
    },
  });
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

console.log('✅ SmartCabb Backend Server v2.0.2 démarré');

// Démarrer le serveur
Deno.serve(app.fetch);
