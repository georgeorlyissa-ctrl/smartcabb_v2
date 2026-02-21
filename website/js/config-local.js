/**
 * Configuration Locale SmartCabb pour tests en LOCAL
 * Ce fichier permet de tester le site web en local (127.0.0.1:5500) 
 * avec connexion au backend Supabase réel
 */

// ⚠️ ÉDITEZ CES 2 LIGNES AVEC VOS VRAIES CLÉS SUPABASE ⚠️
const PROJECT_ID = 'zaerjqchzqmcxqblkfkg';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InphZXJqcWNoenFtY3hxYmxrZmtnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxNDMyOTgsImV4cCI6MjA3NTcxOTI5OH0.qwFRKsi9Gw4VVYoEGBBCIj0-lAZOxtqlGQ0eT6cPhik';

// ============================================
// NE TOUCHEZ PAS AU CODE EN DESSOUS
// ============================================

// Créer la configuration globale
window.SMARTCABB_CONFIG = {
    SUPABASE_URL: `https://${PROJECT_ID}.supabase.co`,
    SUPABASE_ANON_KEY: ANON_KEY,
    API_URL: `https://${PROJECT_ID}.supabase.co/functions/v1/make-server-2eb02e52`,
    PROJECT_ID: PROJECT_ID,
    BACKEND_ENABLED: PROJECT_ID !== 'YOUR_PROJECT_ID' && ANON_KEY !== 'YOUR_ANON_KEY'
};

// Afficher le statut de la configuration
if (window.SMARTCABB_CONFIG.BACKEND_ENABLED) {
    console.log('✅ Configuration SmartCabb chargée avec succès');
    console.log('🔑 Project ID:', PROJECT_ID);
    console.log('🌐 API URL:', window.SMARTCABB_CONFIG.API_URL);
    console.log('📡 Backend: ACTIVÉ');
} else {
    console.warn('⚠️ Configuration non renseignée');
    console.warn('📝 Éditez /website/js/config-local.js pour ajouter vos clés');
    console.warn('📖 Ouvrez le fichier 🎯-FIX-ERREUR-FORMULAIRE-CONTACT-MAINTENANT.html pour le guide');
}

// Exposer aussi une fonction de test
window.testSupabaseConnection = async function() {
    if (!window.SMARTCABB_CONFIG.BACKEND_ENABLED) {
        console.error('❌ Configuration non renseignée. Éditez config-local.js d\'abord.');
        return;
    }
    
    try {
        const response = await fetch(`${window.SMARTCABB_CONFIG.API_URL.replace('/make-server-2eb02e52', '')}/make-server-2eb02e52/health`);
        const data = await response.json();
        
        if (data.status === 'ok') {
            console.log('✅ Connexion au backend Supabase réussie !');
            console.log('🎉 Votre configuration est correcte !');
            return true;
        } else {
            console.warn('⚠️ Réponse inattendue du serveur:', data);
            return false;
        }
    } catch (error) {
        console.error('❌ Erreur de connexion au backend:', error.message);
        console.warn('Vérifiez que :');
        console.warn('1. Le PROJECT_ID est correct');
        console.warn('2. La fonction Edge make-server-2eb02e52 est déployée');
        console.warn('3. Vous êtes connecté à Internet');
        return false;
    }
};

// Info supplémentaire
console.log('💡 Tapez testSupabaseConnection() dans la console pour tester la connexion');
