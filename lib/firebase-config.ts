/**
 * 🔥 CONFIGURATION FIREBASE POUR SMARTCABB
 * 
 * Configuration Firebase côté client pour :
 * - Firebase Cloud Messaging (FCM) - Notifications push
 * - Analytics - Suivi des métriques
 * 
 * ⚠️ CHARGEMENT DYNAMIQUE : Firebase est chargé de manière asynchrone
 * pour éviter les erreurs de build SSR
 * 
 * @version 3.0.0 - Utilisation des packages npm
 * @date 2026-01-27
 */

// 🔑 Configuration Firebase SmartCabb (Production)
const firebaseConfig = {
  apiKey: "AIzaSyATn8o24PvSwg1LHCFeFdteAA_fGte-Tqs",
  authDomain: "smartcabb-bed00.firebaseapp.com",
  projectId: "smartcabb-bed00",
  storageBucket: "smartcabb-bed00.firebasestorage.app",
  messagingSenderId: "855559530237",
  appId: "1:855559530237:web:5ea0fa4232bb08196f4094",
  measurementId: "G-8QY9ZYGC7B"
};

// Types Firebase (définis localement pour éviter import sync)
type FirebaseApp = any;
type Analytics = any;
type Messaging = any;

// 🎯 Singleton Firebase App
let firebaseApp: FirebaseApp | null = null;
let analytics: Analytics | null = null;
let messaging: Messaging | null = null;
let firebaseModules: any = null;

/**
 * 📦 Charge les modules Firebase de manière dynamique
 */
async function loadFirebaseModules() {
  if (firebaseModules) {
    return firebaseModules;
  }

  // ⚠️ Ne pas charger pendant le build SSR
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    console.log('📦 Chargement des modules Firebase...');
    
    // ⚠️ DÉSACTIVÉ COMPLÈTEMENT : Firebase imports causent des erreurs de build
    // Les packages firebase/* ne sont pas disponibles dans l'environnement de build
    console.warn('⚠️ Firebase DÉSACTIVÉ - packages non disponibles dans cet environnement');
    console.warn('⚠️ Les notifications push ne fonctionneront qu\'après configuration Firebase en production');
    
    // Retourner null pour que l'app continue sans Firebase
    return null;
    
    /* 
    // ✅ CODE ORIGINAL FIREBASE (À RÉACTIVER EN PRODUCTION SI BESOIN) :
    
    const [appModule, analyticsModule, messagingModule] = await Promise.all([
      import('firebase/app').catch(() => null),
      import('firebase/analytics').catch(() => null),
      import('firebase/messaging').catch(() => null)
    ]);

    if (!appModule || !analyticsModule || !messagingModule) {
      console.warn('⚠️ Certains modules Firebase ne sont pas disponibles');
      return null;
    }

    firebaseModules = {
      initializeApp: appModule.initializeApp,
      getApps: appModule.getApps,
      getAnalytics: analyticsModule.getAnalytics,
      getMessaging: messagingModule.getMessaging,
      isSupported: messagingModule.isSupported
    };

    console.log('✅ Modules Firebase chargés avec succès');
    return firebaseModules;
    */
  } catch (error) {
    console.error('❌ Erreur chargement Firebase:', error);
    console.warn('⚠️ Firebase non disponible - notifications push désactivées');
    // Retourner null au lieu de throw pour ne pas bloquer l'app
    return null;
  }
}

/**
 * Initialise Firebase (une seule fois)
 */
export async function initializeFirebase(): Promise<FirebaseApp | null> {
  if (typeof window === 'undefined') {
    return null; // Pas côté serveur
  }

  // Éviter la double initialisation
  if (firebaseApp) {
    return firebaseApp;
  }

  try {
    // Charger les modules
    const modules = await loadFirebaseModules();
    if (!modules) {
      return null;
    }

    // Vérifier si Firebase est déjà initialisé
    const apps = modules.getApps();
    if (apps.length > 0) {
      firebaseApp = apps[0];
      console.log('🔥 Firebase déjà initialisé');
      return firebaseApp;
    }

    // Initialiser Firebase
    firebaseApp = modules.initializeApp(firebaseConfig);
    console.log('🔥 Firebase initialisé pour SmartCabb');

    return firebaseApp;
  } catch (error) {
    console.error('❌ Erreur initialisation Firebase:', error);
    return null;
  }
}

/**
 * Récupère l'instance Firebase Analytics
 */
export async function getFirebaseAnalytics(): Promise<Analytics | null> {
  if (typeof window === 'undefined') {
    return null; // Analytics non disponible côté serveur
  }

  if (analytics) {
    return analytics;
  }

  try {
    const modules = await loadFirebaseModules();
    if (!modules) {
      return null;
    }

    const app = await initializeFirebase();
    if (!app) {
      return null;
    }

    analytics = modules.getAnalytics(app);
    console.log('📊 Firebase Analytics initialisé');

    return analytics;
  } catch (error) {
    console.error('❌ Erreur Analytics:', error);
    return null;
  }
}

/**
 * Récupère l'instance Firebase Messaging (FCM)
 */
export async function getFirebaseMessaging(): Promise<Messaging | null> {
  if (typeof window === 'undefined') {
    return null; // Messaging non disponible côté serveur
  }

  if (messaging) {
    return messaging;
  }

  try {
    const modules = await loadFirebaseModules();
    if (!modules) {
      return null;
    }

    // Vérifier si FCM est supporté par le navigateur
    const supported = await modules.isSupported();
    if (!supported) {
      console.warn('⚠️ Firebase Cloud Messaging non supporté par ce navigateur');
      return null;
    }

    const app = await initializeFirebase();
    if (!app) {
      return null;
    }

    messaging = modules.getMessaging(app);
    console.log('🔔 Firebase Cloud Messaging (FCM) initialisé');

    return messaging;
  } catch (error) {
    console.error('❌ Erreur FCM:', error);
    return null;
  }
}

/**
 * Vérifie si Firebase est initialisé
 */
export function isFirebaseInitialized(): boolean {
  return firebaseApp !== null;
}

/**
 * Vérifie si Firebase est disponible (modules chargés)
 */
export async function isFirebaseAvailable(): Promise<boolean> {
  try {
    const modules = await loadFirebaseModules();
    return modules !== null;
  } catch {
    return false;
  }
}

/**
 * Récupère la configuration Firebase (pour debug)
 */
export function getFirebaseConfig() {
  return {
    projectId: firebaseConfig.projectId,
    messagingSenderId: firebaseConfig.messagingSenderId,
    appId: firebaseConfig.appId
  };
}

// Export de la configuration pour usage direct si nécessaire
export { firebaseConfig };