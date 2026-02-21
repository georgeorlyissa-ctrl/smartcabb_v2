/**
 * Configuration SmartCabb pour le Site Web
 * Ce fichier configure automatiquement les clés Supabase pour l'intégration backend
 */

// ⚠️ IMPORTANT: Ces valeurs sont chargées automatiquement depuis votre projet Supabase
// Elles seront injectées au chargement de la page

(function() {
    'use strict';
    
    // Fonction pour charger dynamiquement la configuration depuis l'app React
    async function loadSupabaseConfig() {
        try {
            // Essayer de charger depuis le module TypeScript compilé
            const response = await fetch('/utils/supabase/info.tsx');
            
            if (!response.ok) {
                throw new Error('Fichier info.tsx non accessible');
            }
            
            const content = await response.text();
            
            // Parser le contenu pour extraire projectId et publicAnonKey
            const projectIdMatch = content.match(/projectId\s*:\s*["']([^"']+)["']/);
            const anonKeyMatch = content.match(/publicAnonKey\s*:\s*["']([^"']+)["']/);
            
            if (projectIdMatch && anonKeyMatch) {
                const projectId = projectIdMatch[1];
                const anonKey = anonKeyMatch[1];
                
                // Injecter dans la config globale
                window.SMARTCABB_CONFIG = {
                    SUPABASE_URL: `https://${projectId}.supabase.co`,
                    SUPABASE_ANON_KEY: anonKey,
                    API_URL: `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52`,
                    PROJECT_ID: projectId,
                };
                
                console.log('✅ Configuration Supabase chargée automatiquement');
                console.log('🔑 Project ID:', projectId);
                console.log('🌐 API URL:', window.SMARTCABB_CONFIG.API_URL);
                
                return true;
            } else {
                throw new Error('Impossible de parser les clés Supabase');
            }
        } catch (error) {
            console.warn('⚠️ Impossible de charger automatiquement la configuration Supabase');
            console.warn('Erreur:', error.message);
            
            // Configuration manuelle en cas d'échec
            return loadManualConfig();
        }
    }
    
    // Fonction de configuration manuelle (fallback)
    function loadManualConfig() {
        console.warn('📝 Utilisation de la configuration manuelle');
        console.warn('⚠️ Éditez le fichier /website/js/config.js pour ajouter vos clés');
        
        // ⚠️ REMPLACER CES VALEURS PAR VOS VRAIES CLÉS SUPABASE ⚠️
        const MANUAL_PROJECT_ID = 'your-project-id'; // Exemple: 'abcdefghijklmnop'
        const MANUAL_ANON_KEY = 'your-anon-key'; // Votre clé anon publique
        
        // Si les valeurs sont configurées, les utiliser
        if (MANUAL_PROJECT_ID !== 'your-project-id' && MANUAL_ANON_KEY !== 'your-anon-key') {
            window.SMARTCABB_CONFIG = {
                SUPABASE_URL: `https://${MANUAL_PROJECT_ID}.supabase.co`,
                SUPABASE_ANON_KEY: MANUAL_ANON_KEY,
                API_URL: `https://${MANUAL_PROJECT_ID}.supabase.co/functions/v1/make-server-2eb02e52`,
                PROJECT_ID: MANUAL_PROJECT_ID,
            };
            
            console.log('✅ Configuration manuelle chargée');
            return true;
        }
        
        // Sinon, désactiver le backend
        window.SMARTCABB_CONFIG = {
            SUPABASE_URL: '',
            SUPABASE_ANON_KEY: '',
            API_URL: '',
            PROJECT_ID: '',
            BACKEND_ENABLED: false,
        };
        
        console.warn('❌ Backend désactivé - Clés non configurées');
        console.warn('Le site web fonctionne en mode déconnecté (pas de formulaires, stats fixes)');
        
        return false;
    }
    
    // Charger la configuration au démarrage
    loadSupabaseConfig();
})();
