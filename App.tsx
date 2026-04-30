import React, { lazy, Suspense, useEffect } from 'react';
import { Router, Routes, Route, Navigate } from './lib/simple-router';
import { useLocation } from './lib/simple-router';
import { Toaster } from './lib/toast';
import { LoadingScreen } from './components/LoadingScreen';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PWAInstallPrompt, OnlineStatusIndicator } from './components/PWAInstallPrompt';
import { ExchangeRateSync } from './components/ExchangeRateSync';
import { PageTransition } from './components/PageTransition';
import { AppProvider } from './hooks/useAppState';
import { BackendSyncProvider } from './components/BackendSyncProvider';
import { LanguageProvider } from './contexts/LanguageContext';

// ─── Routes vitrine : jamais de dark mode ───────────────────────────────────
const VITRINE_ROUTES = ['/', '/services', '/drivers', '/contact', '/about', '/terms', '/privacy', '/legal'];

function DarkModeGuard() {
  const location = useLocation();

  useEffect(() => {
    const isVitrine = VITRINE_ROUTES.some(route =>
      location.pathname === route || location.pathname === route + '/'
    );

    if (isVitrine) {
      document.documentElement.classList.remove('dark');
    } else {
      try {
        const isDark = localStorage.getItem('smartcabb_dark_mode') === 'true';
        if (isDark) document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
      } catch {}
    }
  }, [location.pathname]);

  return null;
}

import { DebugAccountChecker } from './components/debug/DebugAccountChecker';
import { applyBrowserOptimizations, applySafariFixes, isPrivateBrowsing } from './utils/browserDetection';
import './lib/cache-buster';

const BUILD_VERSION = '518.4.1'; // ✅ FIX: Maximum call stack size exceeded (iOS Safari)
const BUILD_TIMESTAMP = new Date().toISOString();

import { startUpdateDetection } from './utils/updateDetector';
import { checkForUpdate } from './utils/cacheManager';
import { initConfigSync } from './lib/config-sync';
import { useMaintenanceMode } from './hooks/useAdminConfig';

console.log('');
console.log('═══════════════════════════════════════════════════════════════');
console.log('🚀 BUILD v518.4.1 - 🐛 FIX iOS SAFARI CALL STACK');
console.log('═══════════════════════════════════════════════════════════════');
console.log('');
console.log('🐛 CORRECTIONS:');
console.log('  ✅ PassengerApp: useMemo déplacé avant les return conditionnels');
console.log('  ✅ App.tsx: Variable neutralScreen (undefined) → isNeutralScreen');
console.log('  ✅ Hooks React: Ordre garanti sur iOS Safari (pas de violation)');
console.log('');

// 🌐 Landing Page
import { LandingPage } from './pages/LandingPage';
import AdminCleanSystem from './src/pages/AdminCleanSystem';

// 🚀 LandingScreen
import { LandingScreen } from './components/LandingScreen';

// 🎯 AppRouter
import { AppRouter } from './components/AppRouter';

// 🌐 Pages secondaires
import { ServicesPage } from './pages/ServicesPage';
import { DriversLandingPage } from './pages/DriversLandingPage';
import { ContactPage } from './pages/ContactPage';
import { AboutPage } from './pages/AboutPage';
import { TermsPage } from './pages/TermsPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { LegalPage } from './pages/LegalPage';

// 📱 Passenger App
import { PassengerApp } from './pages/PassengerApp';

// 🚗 Driver App
import { DriverApp } from './pages/DriverApp';

// 👨‍💼 Admin Panel
import { AdminApp } from './pages/AdminApp';

// 🔐 Reset Password Page
import { ResetPasswordPage } from './components/auth/ResetPasswordPage';
import { ForgotPasswordPage } from './components/auth/ForgotPasswordPage';
import { ResetPasswordByPhonePage } from './components/auth/ResetPasswordByPhonePage';
import { CreateAuthFromProfilePage } from './components/auth/CreateAuthFromProfilePage';

// 🔧 Admin Diagnostic
import { AdminLoginDiagnostic } from './components/admin/AdminLoginDiagnostic';
import { AdminQuickSetup } from './components/admin/AdminQuickSetup';
import { AdminAccountSync } from './components/admin/AdminAccountSync';
import { QuickAdminSignup } from './components/admin/QuickAdminSignup';
import { AdminForgotPasswordScreen } from './components/admin/AdminForgotPasswordScreen';
import { FixEmailsPage } from './components/admin/FixEmailsPage';
import { PurgeUserPage } from './components/admin/PurgeUserPage';

// 🔍 Driver Diagnostic
import { DriverSignupDiagnostic } from './components/driver/DriverSignupDiagnostic';

// 🔧 Loading fallback
const SuspenseFallback = () => {
  console.log('⏳ SuspenseFallback - Chargement en cours...');
  return (
    <div className="h-screen w-screen flex items-center justify-center bg-gradient-to-br from-cyan-50 to-white">
      <LoadingScreen />
    </div>
  );
};

// 🔧 Retry logic pour lazy loading
function lazyWithRetry(componentImport: () => Promise<any>) {
  return lazy(() => {
    return new Promise((resolve, reject) => {
      const hasRefreshed = JSON.parse(
        window.sessionStorage.getItem('retry-lazy-refreshed') || 'false'
      );

      componentImport()
        .then((component) => {
          window.sessionStorage.setItem('retry-lazy-refreshed', 'false');
          resolve(component);
        })
        .catch((error) => {
          if (!hasRefreshed) {
            console.log('⚠️ Échec chargement lazy module, retry...');
            window.sessionStorage.setItem('retry-lazy-refreshed', 'true');
            setTimeout(() => {
              componentImport()
                .then(resolve)
                .catch((retryError) => {
                  console.error('❌ Échec chargement lazy après retry:', retryError);
                  reject(retryError);
                });
            }, 100);
          } else {
            console.error('❌ Échec chargement lazy final:', error);
            reject(error);
          }
        });
    });
  });
}

function MaintenanceBanner() {
  const isMaintenance = useMaintenanceMode();
  if (!isMaintenance) return null;
  return (
    <div className="fixed inset-0 z-[9999] bg-orange-600 flex flex-col items-center justify-center p-6 text-white text-center">
      <div className="text-6xl mb-4">🔧</div>
      <h1 className="text-2xl font-bold mb-2">Maintenance en cours</h1>
      <p className="text-orange-100 max-w-sm">
        SmartCabb est temporairement indisponible pour maintenance. Veuillez réessayer dans quelques instants.
      </p>
    </div>
  );
}

function App() {
  console.log(`🚀 SmartCabb v${BUILD_VERSION} - Build ${BUILD_TIMESTAMP} - Démarrage...`);
  
  useEffect(() => {
    try {
      applyBrowserOptimizations();
      applySafariFixes();

      let lastVh: number | null = null;
      let isUpdating = false;

      const setViewportHeight = () => {
        if (isUpdating) return;
        try {
          isUpdating = true;
          const vh = window.innerHeight * 0.01;
          if (lastVh === null || Math.abs(lastVh - vh) > 0.01) {
            document.documentElement.style.setProperty('--vh', `${vh}px`);
            lastVh = vh;
          }
        } finally {
          isUpdating = false;
        }
      };

      setViewportHeight();

      let resizeTimeout: number | undefined;
      const handleResize = () => {
        if (resizeTimeout !== undefined) clearTimeout(resizeTimeout);
        resizeTimeout = window.setTimeout(() => {
          setViewportHeight();
        }, 150) as unknown as number;
      };

      const handleOrientationChange = () => {
        setTimeout(() => setViewportHeight(), 300);
      };

      window.addEventListener('resize', handleResize, { passive: true });
      window.addEventListener('orientationchange', handleOrientationChange, { passive: true });
      
      isPrivateBrowsing().then(isPrivate => {
        if (isPrivate) {
          console.warn('⚠️ Mode navigation privée détecté - Certaines fonctionnalités peuvent être limitées');
        }
      });
      
      if (checkForUpdate()) {
        console.log('🔄 Nouvelle version détectée - Cache rafraîchi');
      }

      // 🧹 Vérification intégrité données localStorage
      try {
        console.log('🧹 Vérification de l\'intégrité des données...');
        
        const keysToValidate = [
          'smartcab_current_user',
          'smartcab_current_driver',
          'smartcab_current_ride',
          'smartcab_system_settings'
        ];
        
        keysToValidate.forEach(key => {
          try {
            const data = localStorage.getItem(key);
            if (data) {
              const parsed = JSON.parse(data);
              
              if (key === 'smartcab_system_settings' && parsed) {
                if (parsed.exchangeRate !== undefined && (typeof parsed.exchangeRate !== 'number' || isNaN(parsed.exchangeRate))) {
                  console.warn(`⚠️ exchangeRate invalide, suppression de ${key}`);
                  localStorage.removeItem(key);
                }
              }
              
              if (key === 'smartcab_current_driver' && parsed) {
                if (parsed.accountBalance !== undefined && (typeof parsed.accountBalance !== 'number' || isNaN(parsed.accountBalance))) {
                  console.warn(`⚠️ accountBalance invalide, suppression de ${key}`);
                  localStorage.removeItem(key);
                }
              }
            }
          } catch (e) {
            console.warn(`⚠️ Données corrompues détectées pour ${key}, suppression...`);
            localStorage.removeItem(key);
          }
        });
        
        console.log('✅ Vérification terminée');
      } catch (error) {
        console.error('❌ Erreur lors de la vérification:', error);
      }

      // 🧹 Vérification cohérence localStorage
      try {
        const savedView = localStorage.getItem('smartcab_current_view');
        const savedScreen = localStorage.getItem('smartcab_current_screen');
        const currentPath = window.location.pathname;
        
        console.log('🔍 Vérification cohérence:', { savedView, savedScreen, currentPath });
        
        if (currentPath.includes('/driver')) {
          if (savedView !== 'driver') {
            localStorage.setItem('smartcab_current_view', 'driver');
          }
        } else if (currentPath.includes('/admin')) {
          if (savedView !== 'admin') {
            localStorage.setItem('smartcab_current_view', 'admin');
          }
        } else if (currentPath.includes('/passenger') || currentPath.includes('/app')) {
          if (!currentPath.includes('/driver') && !currentPath.includes('/admin') && savedView !== 'passenger') {
            localStorage.setItem('smartcab_current_view', 'passenger');
          }
        }
        
        if (savedView && savedScreen) {
          const neutralScreens = [
            'landing', 
            'user-selection', 
            'welcome-back', 
            'welcome-back-driver', 
            'welcome-back-passenger',
            'forgot-password',
            'reset-password-otp'
          ];
          
          // ✅ FIX CRITIQUE: Utiliser isNeutralScreen partout (neutralScreen était undefined → crash)
          const isNeutralScreen = neutralScreens.includes(savedScreen);
          
          const isViewDriverButScreenAdmin = savedView === 'driver' && savedScreen.startsWith('admin-');
          const isViewDriverButScreenPassenger = savedView === 'driver' && !isNeutralScreen && !savedScreen.startsWith('driver-') && (savedScreen.startsWith('passenger-') || ['map', 'welcome', 'login', 'register', 'booking', 'ride', 'payment', 'rating'].includes(savedScreen));
          
          const isViewPassengerButScreenAdmin = savedView === 'passenger' && savedScreen.startsWith('admin-');
          const isViewPassengerButScreenDriver = savedView === 'passenger' && savedScreen.startsWith('driver-');
          
          const isViewAdminButScreenDriver = savedView === 'admin' && savedScreen.startsWith('driver-');
          // ✅ FIX: Était "!neutralScreen" (undefined) → maintenant "!isNeutralScreen"
          const isViewAdminButScreenPassenger = savedView === 'admin' && !isNeutralScreen && !savedScreen.startsWith('admin-');
          
          if (isViewDriverButScreenAdmin || isViewDriverButScreenPassenger ||
              isViewPassengerButScreenAdmin || isViewPassengerButScreenDriver ||
              isViewAdminButScreenDriver || isViewAdminButScreenPassenger) {
            console.warn('⚠️ Incohérence détectée entre view et screen - Nettoyage...', {
              savedView,
              savedScreen,
            });
            localStorage.removeItem('smartcab_current_view');
            localStorage.removeItem('smartcab_current_screen');
            console.log('✅ localStorage nettoyé');
          }
        }
      } catch (error) {
        console.warn('⚠️ Erreur nettoyage localStorage:', error);
      }

      // 🔧 Détecter tokens de réinitialisation de mot de passe
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const type = hashParams.get('type');
      
      if (accessToken && type === 'recovery') {
        console.log('🔐 Token de réinitialisation détecté dans l\'URL');
        const currentPath = window.location.pathname;
        if (currentPath !== '/auth/reset-password') {
          window.location.href = '/auth/reset-password' + window.location.hash;
        }
      }

      const cleanupOldRides = async () => {
        try {
          console.log('🧹 Nettoyage des anciennes demandes de course...');
          console.log('ℹ️ Nettoyage désactivé - Sera activé après déploiement du backend');
        } catch (error) {
          console.warn('⚠️ Erreur nettoyage demandes:', error);
        }
      };

      setTimeout(cleanupOldRides, 2000);
      
      return () => {
        if (resizeTimeout !== undefined) clearTimeout(resizeTimeout);
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('orientationchange', handleOrientationChange);
      };
    } catch (error) {
      console.error('Erreur lors de l\'application des optimisations:', error);
    }
  }, []);

  useEffect(() => {
    try {
      if (typeof startUpdateDetection === 'function') {
        startUpdateDetection();
        console.log('✅ Détection de mise à jour activée');
      } else {
        console.warn('⚠️ startUpdateDetection non disponible');
      }
    } catch (error) {
      console.error('Erreur startUpdateDetection:', error);
    }
  }, []);

  useEffect(() => {
    try {
      initConfigSync();
      console.log('✅ Synchronisation config activée (polling 60s, BroadcastChannel)');
    } catch (error) {
      console.error('Erreur initConfigSync:', error);
    }
  }, []);

  return (
    <ErrorBoundary>
      <Router>
        <AppProvider>
          <LanguageProvider>
            <DarkModeGuard />
            <div className="app-container">
              <OnlineStatusIndicator />
              <PWAInstallPrompt />
              <Toaster 
                position="top-center"
                toastOptions={{
                  duration: 3000,
                  style: {
                    background: '#fff',
                    color: '#1a1a1a',
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                  },
                }}
              />
              <ExchangeRateSync />
              <MaintenanceBanner />
              <PageTransition />

              <Suspense fallback={<SuspenseFallback />}>
                <Routes>
                  {/* Site Vitrine */}
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/services" element={<ServicesPage />} />
                  <Route path="/drivers" element={<DriversLandingPage />} />
                  <Route path="/contact" element={<ContactPage />} />
                  <Route path="/about" element={<AboutPage />} />
                  <Route path="/terms" element={<TermsPage />} />
                  <Route path="/privacy" element={<PrivacyPage />} />
                  <Route path="/legal" element={<LegalPage />} />
                  
                  {/* Driver App */}
                  <Route path="/driver/*" element={<DriverApp />} />
                  
                  {/* Admin Routes Spécifiques */}
                  <Route path="/admin/diagnostic" element={<AdminLoginDiagnostic />} />
                  <Route path="/admin/setup" element={<AdminQuickSetup />} />
                  <Route path="/admin/sync" element={<AdminAccountSync />} />
                  <Route path="/admin/signup" element={<QuickAdminSignup />} />
                  <Route path="/admin/forgot-password" element={<AdminForgotPasswordScreen />} />
                  <Route path="/admin/clean-system" element={<AdminCleanSystem />} />
                  <Route path="/admin/fix-emails" element={<FixEmailsPage />} />
                  <Route path="/admin/purge-user" element={<PurgeUserPage />} />
                  
                  {/* Driver Diagnostic */}
                  <Route path="/driver/signup-diagnostic" element={<DriverSignupDiagnostic />} />
                  
                  {/* Admin Panel */}
                  <Route path="/admin/*" element={<AdminApp />} />
                  
                  {/* Auth Pages */}
                  <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
                  <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
                  <Route path="/auth/reset-password-by-phone" element={<ResetPasswordByPhonePage />} />
                  <Route path="/auth/create-auth-from-profile" element={<CreateAuthFromProfilePage />} />
                  
                  {/* Redirections */}
                  <Route path="/passenger" element={<Navigate to="/app" replace />} />
                  <Route path="/passager" element={<Navigate to="/app" replace />} />
                  <Route path="/conducteur" element={<Navigate to="/driver" replace />} />
                  
                  {/* Application SmartCabb */}
                  <Route path="/app/*" element={<AppRouter />} />
                  
                  {/* Anciennes pages */}
                  <Route path="/preview_page_v2.html" element={<Navigate to="/" replace />} />
                  <Route path="/index.html" element={<Navigate to="/" replace />} />
                  
                  {/* Catch-all */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </div>
          </LanguageProvider>
        </AppProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
