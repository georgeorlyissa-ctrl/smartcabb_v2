/**
 * 🚀 SmartCabb - Application de transport à Kinshasa
 * BUILD v517.74 - FIX BUILD VITE + MAIN.TSX
 */

// 🎭 MOTION POLYFILL - DOIT ÊTRE EN PREMIER IMPORT
import './lib/motion-polyfill';

// 🍞 TOAST - Import global pour garantir sa disponibilité
import { toast } from './lib/toast';

// 🌍 Exposer toast globalement pour éviter les erreurs "toast is not defined"
if (typeof window !== 'undefined') {
  (window as any).toast = toast;
}

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/globals.css';
import { logStartupDiagnostics, setupErrorInterceptors } from './utils/diagnostics';

const { createRoot } = ReactDOM;

console.log('🚀 SmartCabb v517.74 - Démarrage...');

// 🎭 VÉRIFICATION CRITIQUE: Motion polyfill chargé
if (typeof window !== 'undefined') {
  // @ts-ignore
  if (window.motion) {
    console.log('✅ Motion polyfill vérifié dans window:', typeof window.motion);
  } else {
    console.error('❌ Motion polyfill NON trouvé dans window');
  }
}

// 🔍 DIAGNOSTICS AU DÉMARRAGE
logStartupDiagnostics();
setupErrorInterceptors();

// ✅ PROTECTION SSR: Vérifier que nous sommes côté client
if (typeof window === 'undefined') {
  throw new Error('❌ main.tsx ne devrait jamais s\'exécuter côté serveur');
}

// ✅ PROTECTION: Vérifier que le DOM est prêt
if (typeof document === 'undefined') {
  throw new Error('❌ Document non disponible');
}

// 🚫 SERVICE WORKER DÉSACTIVÉ TEMPORAIREMENT POUR ÉVITER LES ERREURS
// L'enregistrement du Service Worker est commenté ci-dessus (lignes 30-71)
// pour éliminer l'erreur "Failed to update a ServiceWorker"
// qui apparaissait sur smartcabb.com en production.
// 
// Le PWA peut être réactivé plus tard en décommentant le code du Service Worker
// une fois que la configuration Vercel sera correctement ajustée pour servir /sw.js

// ✅ Initialisation de l'application
const initApp = () => {
  const rootElement = document.getElementById('root');
  
  if (!rootElement) {
    console.error('❌ Element root non trouvé dans le DOM');
    return;
  }

  try {
    createRoot(rootElement).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    console.log('✅ Application React montée avec succès');
  } catch (error) {
    console.error('❌ Erreur lors du montage de l\'application:', error);
    
    // Afficher une erreur à l'utilisateur
    rootElement.innerHTML = `
      <div style="
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        font-family: system-ui, -apple-system, sans-serif;
      ">
        <div style="
          background: white;
          padding: 2rem;
          border-radius: 1rem;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          max-width: 500px;
          text-align: center;
        ">
          <h1 style="color: #dc2626; margin-bottom: 1rem;">Erreur de chargement</h1>
          <p style="color: #666; margin-bottom: 1.5rem;">
            SmartCabb n'a pas pu démarrer correctement.<br>
            Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}
          </p>
          <button 
            onclick="window.location.reload()" 
            style="
              background: #0891b2;
              color: white;
              border: none;
              padding: 0.75rem 2rem;
              border-radius: 0.5rem;
              cursor: pointer;
              font-size: 1rem;
            "
          >
            Réessayer
          </button>
        </div>
      </div>
    `;
  }
};

// Exécuter l'initialisation
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  // DOM déjà chargé
  initApp();
}
