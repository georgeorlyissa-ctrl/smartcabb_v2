import { Hono } from "npm:hono";

const app = new Hono();

app.post("/send", async (c) => {
  try {
    const { to, subject, html } = await c.req.json();
    const apiKey = Deno.env.get('SENDGRID_API_KEY');
    if (!apiKey) {
      console.error("❌ SendGrid API key manquante");
      return c.json({ success: false, error: "Configuration email manquante" }, 500);
    }
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: 'noreply@smartcabb.com', name: 'SmartCabb' },
        subject,
        content: [{ type: 'text/html', value: html }]
      })
    });
    if (!response.ok) {
      const error = await response.text();
      console.error("❌ Erreur SendGrid:", error);
      return c.json({ success: false, error: "Erreur envoi email" }, 500);
    }
    return c.json({ success: true });
  } catch (error) {
    console.error("❌ Erreur email:", error);
    return c.json({ success: false, error: "Erreur serveur" }, 500);
  }
});

export default app;
