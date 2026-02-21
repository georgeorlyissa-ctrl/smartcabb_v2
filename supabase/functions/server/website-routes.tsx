import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js@2";

const app = new Hono();

/**
 * Route: Formulaire de contact
 */
app.post("/contact", async (c) => {
  try {
    const body = await c.req.json();
    const { name, email, phone, subject, message, source } = body;

    if (!name || !email || !message) {
      return c.json({ success: false, error: 'Champs requis manquants' }, 400);
    }

    console.log('📧 Nouveau message de contact:', { name, email, subject });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Créer la table si elle n'existe pas
    await supabase.rpc('create_table_if_not_exists', {
      table_name: 'website_contacts_2eb02e52',
      columns: `
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT,
        subject TEXT,
        message TEXT NOT NULL,
        source TEXT DEFAULT 'website',
        status TEXT DEFAULT 'new',
        created_at TIMESTAMPTZ DEFAULT NOW()
      `
    }).catch(() => {
      // Table existe déjà, ignorer l'erreur
    });

    // Enregistrer le message
    const { data, error } = await supabase
      .from('website_contacts_2eb02e52')
      .insert({
        name,
        email,
        phone: phone || null,
        subject: subject || 'Contact général',
        message,
        source: source || 'website',
        status: 'new',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Erreur enregistrement contact:', error);
      return c.json({ success: false, error: 'Erreur serveur' }, 500);
    }

    // Envoyer notification email à l'équipe (optionnel)
    // await sendEmailNotification(data);

    // Envoyer SMS de confirmation au contact (optionnel)
    if (phone) {
      // await sendSMSConfirmation(phone, name);
    }

    console.log('✅ Message de contact enregistré:', data.id);

    return c.json({
      success: true,
      message: 'Message envoyé avec succès',
      id: data.id,
    });
  } catch (error) {
    console.error('❌ Erreur route contact:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur serveur',
    }, 500);
  }
});

/**
 * Route: Inscription newsletter
 */
app.post("/newsletter", async (c) => {
  try {
    const body = await c.req.json();
    const { email, source } = body;

    if (!email || !email.includes('@')) {
      return c.json({ success: false, error: 'Email invalide' }, 400);
    }

    console.log('📨 Nouvelle inscription newsletter:', email);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Vérifier si déjà inscrit
    const { data: existing } = await supabase
      .from('website_newsletter_2eb02e52')
      .select('id')
      .eq('email', email)
      .single();

    if (existing) {
      return c.json({
        success: true,
        message: 'Vous êtes déjà inscrit à notre newsletter',
      });
    }

    // Enregistrer l'inscription
    const { data, error } = await supabase
      .from('website_newsletter_2eb02e52')
      .insert({
        email,
        source: source || 'website',
        subscribed_at: new Date().toISOString(),
        active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Erreur inscription newsletter:', error);
      return c.json({ success: false, error: 'Erreur serveur' }, 500);
    }

    console.log('✅ Inscription newsletter réussie:', data.id);

    return c.json({
      success: true,
      message: 'Inscription réussie ! Vous recevrez nos actualités.',
    });
  } catch (error) {
    console.error('❌ Erreur route newsletter:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur serveur',
    }, 500);
  }
});

/**
 * Route: Analytics (tracking pages vues)
 */
app.post("/analytics", async (c) => {
  try {
    const body = await c.req.json();
    const { page, timestamp, user_agent, referrer } = body;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Enregistrer la page vue
    await supabase
      .from('website_analytics_2eb02e52')
      .insert({
        page: page || 'unknown',
        timestamp: timestamp || new Date().toISOString(),
        user_agent: user_agent || '',
        referrer: referrer || 'direct',
      });

    return c.json({ success: true });
  } catch (error) {
    console.warn('⚠️ Erreur analytics:', error);
    return c.json({ success: false }, 500);
  }
});

/**
 * Route: Demande de partenariat
 */
app.post("/partnership", async (c) => {
  try {
    const body = await c.req.json();
    const { company_name, contact_name, email, phone, message, type } = body;

    if (!company_name || !contact_name || !email || !message) {
      return c.json({ success: false, error: 'Champs requis manquants' }, 400);
    }

    console.log('🤝 Nouvelle demande partenariat:', company_name);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data, error } = await supabase
      .from('website_partnerships_2eb02e52')
      .insert({
        company_name,
        contact_name,
        email,
        phone: phone || null,
        message,
        type: type || 'general',
        status: 'pending',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Erreur enregistrement partenariat:', error);
      return c.json({ success: false, error: 'Erreur serveur' }, 500);
    }

    console.log('✅ Demande partenariat enregistrée:', data.id);

    return c.json({
      success: true,
      message: 'Votre demande a été envoyée. Nous vous contacterons rapidement.',
      id: data.id,
    });
  } catch (error) {
    console.error('❌ Erreur route partenariat:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur serveur',
    }, 500);
  }
});

/**
 * Route: Statistiques publiques
 */
app.get("/stats", async (c) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Compter les courses du jour
    const today = new Date().toISOString().split('T')[0];
    
    const { count: todayRides } = await supabase
      .from('rides_2eb02e52')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today);

    // Compter les conducteurs actifs
    const { count: activeDrivers } = await supabase
      .from('drivers_2eb02e52')
      .select('*', { count: 'exact', head: true })
      .eq('is_available', true)
      .eq('approval_status', 'approved');

    // Calculer note moyenne
    const { data: ratings } = await supabase
      .from('rides_2eb02e52')
      .select('passenger_rating')
      .not('passenger_rating', 'is', null);

    const avgRating = ratings && ratings.length > 0
      ? ((ratings.reduce((acc, r) => acc + (r.passenger_rating || 0), 0) / ratings.length) || 0).toFixed(1)
      : '4.8';

    // Compter total courses
    const { count: totalRides } = await supabase
      .from('rides_2eb02e52')
      .select('*', { count: 'exact', head: true });

    return c.json({
      success: true,
      stats: {
        daily_rides: todayRides || 0,
        total_rides: totalRides ? `${Math.floor(totalRides / 100) * 100}+` : '1000+',
        active_drivers: activeDrivers ? `${activeDrivers}+` : '500+',
        average_rating: avgRating,
        availability: '24/7',
        last_updated: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('❌ Erreur stats:', error);
    
    // Retourner stats par défaut en cas d'erreur
    return c.json({
      success: true,
      stats: {
        daily_rides: 150,
        total_rides: '1000+',
        active_drivers: '500+',
        average_rating: '4.8',
        availability: '24/7',
        last_updated: new Date().toISOString(),
      },
    });
  }
});

/**
 * Route: Téléchargements app (tracking)
 */
app.post("/download", async (c) => {
  try {
    const body = await c.req.json();
    const { platform, source } = body; // platform: 'ios' | 'android', source: 'website' | 'qr'

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Enregistrer le téléchargement
    await supabase
      .from('website_downloads_2eb02e52')
      .insert({
        platform: platform || 'unknown',
        source: source || 'website',
        downloaded_at: new Date().toISOString(),
      });

    console.log('📲 Téléchargement app tracké:', platform);

    return c.json({ success: true });
  } catch (error) {
    console.warn('⚠️ Erreur tracking download:', error);
    return c.json({ success: false }, 500);
  }
});

export default app;
