/**
 * 💳 ROUTES PAIEMENT FLUTTERWAVE - SMARTCABB
 * ⚠️ FICHIER 100% AUTONOME — aucun import local
 *
 * POST /flutterwave/init              — Créer un lien de paiement (acompte, course)
 * GET  /flutterwave/verify/:txId      — Vérifier le statut d'un paiement
 * POST /flutterwave/refund            — Remboursement (validation manuelle)
 *
 * Secrets Supabase requis :
 *   FLUTTERWAVE_SECRET_KEY     (clé TEST FLWSECK_TEST-... = mode simulation, sans argent réel)
 *   FLUTTERWAVE_SIMULATION_MODE (true/false, informatif pour les logs)
 *
 * Monté dans index.ts sous /make-server-2eb02e52/payments
 * @version 1.0.0
 */

import { Hono } from "npm:hono";

const app = new Hono();

const FLW_API = "https://api.flutterwave.com/v3";

function getSecret(): string {
  return Deno.env.get("FLUTTERWAVE_SECRET_KEY") ?? "";
}

function isSimulation(): boolean {
  return (Deno.env.get("FLUTTERWAVE_SIMULATION_MODE") ?? "false").toLowerCase() === "true";
}

// ─── POST /flutterwave/init — Créer un lien de paiement ──────────────────────
app.post("/flutterwave/init", async (c) => {
  try {
    const secret = getSecret();
    if (!secret) {
      console.error("❌ [PAYMENTS/INIT] FLUTTERWAVE_SECRET_KEY manquant");
      return c.json({ success: false, error: "Passerelle de paiement non configurée" }, 500);
    }

    const body = await c.req.json();
    const amount = Number(body.amount);
    const currency = body.currency === "USD" ? "USD" : "CDF";
    const customerEmail = body.customerEmail || "passager@smartcabb.com";
    const customerPhone = body.customerPhone || "";
    const customerName = body.customerName || "Passager SmartCabb";
    const tx_ref = body.reference || `SMARTCABB_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
    const description = body.description || "Paiement SmartCabb";
    const redirectUrl = body.redirectUrl || "https://smartcabb.com";

    if (!amount || amount <= 0) {
      return c.json({ success: false, error: "Montant invalide" }, 400);
    }

    console.log(`💳 [PAYMENTS/INIT] ${amount} ${currency} ref=${tx_ref} simulation=${isSimulation()}`);

    const flwResp = await fetch(`${FLW_API}/payments`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tx_ref,
        amount,
        currency,
        redirect_url: redirectUrl,
        customer: {
          email: customerEmail,
          phonenumber: customerPhone,
          name: customerName,
        },
        customizations: {
          title: "SmartCabb",
          description,
        },
      }),
    });

    const flwData = await flwResp.json().catch(() => null);

    if (!flwResp.ok || !flwData || flwData.status !== "success" || !flwData.data?.link) {
      const msg = flwData?.message || `Flutterwave erreur ${flwResp.status}`;
      console.error("❌ [PAYMENTS/INIT] Echec Flutterwave:", msg);
      return c.json({ success: false, error: msg }, 502);
    }

    console.log(`✅ [PAYMENTS/INIT] Lien créé tx_ref=${tx_ref}`);
    return c.json({
      success: true,
      data: {
        id: flwData.data.id,
        link: flwData.data.link,
        tx_ref,
        flw_ref: flwData.data.flw_ref,
      },
    });
  } catch (error) {
    console.error("❌ [PAYMENTS/INIT] Erreur:", error);
    return c.json({ success: false, error: "Erreur serveur paiement" }, 500);
  }
});

// ─── GET /flutterwave/verify/:transactionId — Vérifier un paiement ───────────
app.get("/flutterwave/verify/:transactionId", async (c) => {
  try {
    const secret = getSecret();
    if (!secret) {
      return c.json({ success: false, error: "Passerelle de paiement non configurée" }, 500);
    }

    const transactionId = c.req.param("transactionId");
    if (!transactionId) {
      return c.json({ success: false, error: "Transaction manquante" }, 400);
    }

    // id numérique Flutterwave → /transactions/:id/verify,
    // sinon tx_ref interne (SMARTCABB_...) → /transactions/verify_by_reference
    const isNumeric = /^\d+$/.test(transactionId);
    const url = isNumeric
      ? `${FLW_API}/transactions/${encodeURIComponent(transactionId)}/verify`
      : `${FLW_API}/transactions/verify_by_reference?tx_ref=${encodeURIComponent(transactionId)}`;

    const flwResp = await fetch(url, {
      headers: { "Authorization": `Bearer ${secret}` },
    });
    const flwData = await flwResp.json().catch(() => null);

    if (!flwResp.ok || !flwData || flwData.status !== "success") {
      const msg = flwData?.message || `Flutterwave erreur ${flwResp.status}`;
      // Référence inconnue = paiement pas encore effectué → rester en "pending"
      // pour laisser le frontend continuer à sonder pendant 60s
      if (!isNumeric && /no transaction|not found|introuvable/i.test(msg)) {
        console.log(`⏳ [PAYMENTS/VERIFY] ${transactionId} : pas encore payé (pending)`);
        return c.json({ success: true, status: "pending", tx_ref: transactionId, transactionId });
      }
      console.error("❌ [PAYMENTS/VERIFY] Echec:", msg);
      return c.json({ success: false, error: msg }, 502);
    }

    const tx = flwData.data ?? {};
    // tx.status: 'successful' | 'failed' | 'pending' ...
    return c.json({
      success: true,
      status: tx.status ?? "pending",
      amount: tx.amount,
      currency: tx.currency,
      tx_ref: tx.tx_ref,
      flw_ref: tx.flw_ref,
      transactionId,
    });
  } catch (error) {
    console.error("❌ [PAYMENTS/VERIFY] Erreur:", error);
    return c.json({ success: false, error: "Erreur serveur vérification" }, 500);
  }
});

// ─── POST /flutterwave/refund — Remboursement (manuel) ───────────────────────
app.post("/flutterwave/refund", async (c) => {
  console.log("💸 [PAYMENTS/REFUND] Demande reçue — validation manuelle requise");
  return c.json(
    { success: false, error: "Les remboursements nécessitent une validation manuelle (contactez le support au +243 960 624 008)" },
    501
  );
});

export default app;
