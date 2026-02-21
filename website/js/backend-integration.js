/**
 * Intégration Backend Supabase pour le Site Web SmartCabb
 * Gère le formulaire de contact, newsletter, tracking, etc.
 */

// Importer les informations Supabase depuis le projet principal
// Ces valeurs seront automatiquement injectées depuis window.SMARTCABB_CONFIG
let SUPABASE_URL = '';
let SUPABASE_ANON_KEY = '';

// Essayer de charger depuis la config globale injectée par le site
if (window.SMARTCABB_CONFIG) {
    SUPABASE_URL = window.SMARTCABB_CONFIG.SUPABASE_URL || '';
    SUPABASE_ANON_KEY = window.SMARTCABB_CONFIG.SUPABASE_ANON_KEY || '';
    console.log('✅ Configuration Supabase chargée depuis window.SMARTCABB_CONFIG');
} else {
    console.warn('⚠️ window.SMARTCABB_CONFIG non trouvé');
    console.warn('📝 Le backend n\'est pas configuré. Les fonctionnalités backend seront désactivées.');
    
    // Valeurs par défaut (backend désactivé)
    SUPABASE_URL = '';
    SUPABASE_ANON_KEY = '';
}

// Configuration
const config = {
    apiUrl: `${SUPABASE_URL}/functions/v1/make-server-2eb02e52`,
    anonKey: SUPABASE_ANON_KEY,
    enabled: SUPABASE_URL && SUPABASE_ANON_KEY && 
             SUPABASE_URL !== 'https://your-project.supabase.co' && 
             SUPABASE_ANON_KEY !== 'your-anon-key',
};

/**
 * Envoyer un message depuis le formulaire de contact
 */
async function sendContactMessage(formData) {
    if (!config.enabled) {
        console.warn('Backend non configuré, message non envoyé');
        return;
    }

    try {
        const response = await fetch(`${config.apiUrl}/website/contact`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.anonKey}`,
            },
            body: JSON.stringify({
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                subject: formData.subject,
                message: formData.message,
                source: 'website',
                timestamp: new Date().toISOString(),
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Erreur lors de l\'envoi');
        }

        return await response.json();
    } catch (error) {
        console.error('Erreur envoi message:', error);
        throw error;
    }
}

/**
 * Inscription à la newsletter
 */
async function subscribeNewsletter(email) {
    if (!config.enabled) {
        console.warn('Backend non configuré, inscription non effectuée');
        return;
    }

    try {
        const response = await fetch(`${config.apiUrl}/website/newsletter`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.anonKey}`,
            },
            body: JSON.stringify({
                email: email,
                subscribed_at: new Date().toISOString(),
                source: 'website',
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Erreur lors de l\'inscription');
        }

        return await response.json();
    } catch (error) {
        console.error('Erreur inscription newsletter:', error);
        throw error;
    }
}

/**
 * Tracker les visites de page (analytics)
 */
async function trackPageView(pageName) {
    if (!config.enabled) {
        console.warn('Backend non configuré, tracking non effectué');
        return;
    }

    try {
        const response = await fetch(`${config.apiUrl}/website/analytics`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.anonKey}`,
            },
            body: JSON.stringify({
                page: pageName,
                timestamp: new Date().toISOString(),
                user_agent: navigator.userAgent,
                referrer: document.referrer || 'direct',
            }),
        });

        if (!response.ok) {
            console.warn('Erreur tracking page view');
        }
    } catch (error) {
        console.warn('Erreur tracking:', error);
    }
}

/**
 * Tracker les téléchargements app
 */
async function trackDownload(platform) {
    if (!config.enabled) {
        console.warn('Backend non configuré, tracking non effectué');
        return;
    }

    try {
        const response = await fetch(`${config.apiUrl}/website/download`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.anonKey}`,
            },
            body: JSON.stringify({
                platform: platform,
                source: 'website',
                timestamp: new Date().toISOString(),
            }),
        });

        if (response.ok) {
            console.log(`✅ Téléchargement ${platform} tracké`);
        }
    } catch (error) {
        console.warn('Erreur tracking download:', error);
    }
}

/**
 * Envoyer demande de partenariat
 */
async function sendPartnershipRequest(data) {
    if (!config.enabled) {
        console.warn('Backend non configuré, demande non envoyée');
        return;
    }

    try {
        const response = await fetch(`${config.apiUrl}/website/partnership`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.anonKey}`,
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Erreur lors de l\'envoi');
        }

        return await response.json();
    } catch (error) {
        console.error('Erreur demande partenariat:', error);
        throw error;
    }
}

/**
 * Récupérer les statistiques publiques
 */
async function getPublicStats() {
    if (!config.enabled) {
        console.warn('Backend non configuré, stats non récupérées');
        return {
            total_rides: '1000+',
            active_drivers: '500+',
            average_rating: '4.8',
            availability: '24/7',
        };
    }

    try {
        const response = await fetch(`${config.apiUrl}/website/stats`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${config.anonKey}`,
            },
        });

        if (!response.ok) {
            throw new Error('Erreur lors de la récupération des stats');
        }

        return await response.json();
    } catch (error) {
        console.error('Erreur récupération stats:', error);
        return {
            total_rides: '1000+',
            active_drivers: '500+',
            average_rating: '4.8',
            availability: '24/7',
        };
    }
}

/**
 * Initialiser l'intégration backend au chargement de la page
 */
function initBackendIntegration() {
    // Tracker la page vue
    const pageName = window.location.pathname.replace('/website/', '').replace('.html', '') || 'home';
    trackPageView(pageName);

    // Charger les statistiques en temps réel (si disponibles)
    loadRealtimeStats();

    console.log('✅ Backend intégration initialisée');
}

/**
 * Charger les statistiques en temps réel
 */
async function loadRealtimeStats() {
    try {
        const stats = await getPublicStats();
        
        // Mettre à jour les stats dans la page
        updateStatsDisplay(stats);
    } catch (error) {
        console.warn('Impossible de charger les stats temps réel, utilisation des valeurs par défaut');
    }
}

/**
 * Mettre à jour l'affichage des statistiques
 */
function updateStatsDisplay(stats) {
    const statsElements = {
        'total-rides': stats.total_rides || stats.daily_rides || '1000+',
        'active-drivers': stats.active_drivers || '500+',
        'average-rating': stats.average_rating || '4.8',
        'availability': stats.availability || '24/7',
    };

    Object.entries(statsElements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    });
}

// Exporter les fonctions pour utilisation dans les pages
window.SmartCabbBackend = {
    sendContactMessage,
    subscribeNewsletter,
    trackPageView,
    trackDownload,
    sendPartnershipRequest,
    getPublicStats,
    initBackendIntegration,
};

// Auto-initialiser au chargement de la page
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBackendIntegration);
} else {
    initBackendIntegration();
}