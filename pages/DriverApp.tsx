import { Routes, Route, useLocation } from '../lib/simple-router';
import { DriverWelcomeScreen } from '../components/driver/DriverWelcomeScreen';
import { DriverLoginScreen } from '../components/driver/DriverLoginScreen';
import { DriverRegistrationScreen } from '../components/driver/DriverRegistrationScreen';
import { DriverDashboardNew } from '../components/driver/DriverDashboardNew';
import { NavigationScreen } from '../components/driver/NavigationScreen';
import { EarningsScreen } from '../components/driver/EarningsScreen';
import { DriverSettingsScreen } from '../components/driver/DriverSettingsScreen';
import { DriverProfileScreen } from '../components/driver/DriverProfileScreen';
import { ClientInfoScreen } from '../components/driver/ClientInfoScreen';
import { DriverWalletScreen } from '../components/driver/DriverWalletScreen';
import { ActiveRideNavigationScreen } from '../components/driver/ActiveRideNavigationScreen';
import { PaymentConfirmationScreen } from '../components/driver/PaymentConfirmationScreen';
import { useAppState } from '../hooks/useAppState';
import { WelcomeBackScreen } from '../components/WelcomeBackScreen';
import { ForgotPasswordScreen } from '../components/ForgotPasswordScreen';
import { ResetPasswordOTPScreen } from '../components/ResetPasswordOTPScreen';
import { RLSFixModal } from '../components/RLSFixModal';
import { RLSBlockingScreen } from '../components/RLSBlockingScreen';
import { LoadingScreen } from '../components/LoadingScreen';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { DriverDeploymentCheck } from '../components/driver/DriverDeploymentCheck';
import { useEffect } from 'react';

function DriverAppContent() {
  const { state, setCurrentScreen, setCurrentView, setCurrentDriver } = useAppState();
  const { currentScreen, currentUser: user } = state;
  const showRLSModal = false;
  const showRLSBlockingScreen = false;
  const dataLoading = false;

  const location = useLocation();

  // ✅ Gestion de la vue et du screen driver
  useEffect(() => {
    console.log('🚗 DriverApp - Démarrage avec currentScreen:', currentScreen);
    console.log('🚗 DriverApp - Location pathname:', location.pathname);
    console.log('🚗 DriverApp - currentView:', state.currentView);
    console.log('🚗 DriverApp - currentDriver:', state.currentDriver?.id || 'none');

    if (!location.pathname.includes('/driver')) {
      return;
    }

    // ✅ FIX : Détecter /signup dans l'URL → aller directement au formulaire d'inscription
    const isSignupUrl = location.pathname.includes('/signup');
    if (isSignupUrl && currentScreen !== 'driver-registration') {
      console.log('✅ URL /signup détectée → driver-registration');
      setCurrentScreen('driver-registration');
      return;
    }

    // ✅ FIX: Utiliser une garde pour éviter les mises à jour infinies
    let shouldUpdateView = false;
    let shouldUpdateScreen = false;
    let shouldUpdateDriver = false;
    let newScreen: string | null = null;

    try {
      const savedDriverStr = localStorage.getItem('smartcab_current_driver');
      if (savedDriverStr) {
        const savedDriver = JSON.parse(savedDriverStr);
        const driverStatus = savedDriver.status;
        if (driverStatus === 'rejected' || driverStatus === 'suspended') {
          console.warn(`🧹 Nettoyage automatique : conducteur "${driverStatus}" détecté dans localStorage`);
          localStorage.removeItem('smartcab_current_driver');
          localStorage.removeItem('smartcab_current_user');
          if (state.currentDriver?.id === savedDriver.id) {
            shouldUpdateDriver = true;
          }
        }
      }
    } catch (error) {
      console.error('❌ Erreur lors du nettoyage du localStorage:', error);
    }

    if (state.currentView !== 'driver') {
      shouldUpdateView = true;
    }

    if (state.currentDriver) {
      const driverStatus = state.currentDriver.status;
      if (driverStatus === 'rejected' || driverStatus === 'suspended') {
        shouldUpdateDriver = true;
        localStorage.removeItem('smartcab_current_driver');
        if (currentScreen !== 'driver-registration') {
          newScreen = 'driver-login';
          shouldUpdateScreen = true;
        }
      }
    }

    // ✅ Appliquer les changements une seule fois
    if (shouldUpdateDriver) {
      setCurrentDriver(null);
    }
    if (shouldUpdateView) {
      setCurrentView('driver');
    }
    if (shouldUpdateScreen && newScreen) {
      setCurrentScreen(newScreen);
      return;
    }

    // Logique de navigation
    if (state.currentDriver && currentScreen && currentScreen.startsWith('driver-') && currentScreen !== 'driver-welcome' && currentScreen !== 'driver-login') {
      return;
    }

    if (state.currentDriver && (!currentScreen || !currentScreen.startsWith('driver-'))) {
      setCurrentScreen('driver-dashboard');
      return;
    }

    if (currentScreen && currentScreen.startsWith('driver-')) {
      return;
    }

    if (!currentScreen ||
        currentScreen === 'landing' ||
        currentScreen === 'user-selection' ||
        currentScreen.startsWith('admin-') ||
        currentScreen.startsWith('passenger-')) {
      // ✅ FIX : Ne pas écraser si on est en train d'aller vers l'inscription
      if (!isSignupUrl) {
        setCurrentScreen('driver-welcome');
      }
    }
  }, [location.pathname, currentScreen, state.currentView, state.currentDriver?.id, state.currentDriver?.status]); // ✅ Dépendances minimales et stables

  // ✅ FCM géré entièrement par DriverDashboardNew — ne pas appeler setupFCMForUser ici
  // setupFCMForUser court-circuitait le système FCM et empêchait la popup RideNotification
  useEffect(() => {
    if (!state.currentDriver?.id || state.currentView !== 'driver') return;
    console.log('✅ FCM géré par DriverDashboardNew pour driver:', state.currentDriver.id);
  }, [state.currentDriver?.id, state.currentView]);

  if (showRLSBlockingScreen) {
    return <RLSBlockingScreen />;
  }

  if (dataLoading) {
    return <LoadingScreen />;
  }

  return (
    <>
      {showRLSModal && <RLSFixModal />}

      {/* Contrainte mobile 430px */}
      <div className="min-h-screen bg-gray-100 flex justify-center">
        <div className="w-full max-w-[430px] h-screen relative overflow-hidden bg-white shadow-2xl">
          <div className="h-full overflow-y-auto">
            {currentScreen === 'driver-welcome' && <DriverWelcomeScreen />}
            {currentScreen === 'driver-login' && <DriverLoginScreen />}
            {currentScreen === 'driver-registration' && <DriverRegistrationScreen />}
            {currentScreen === 'driver-dashboard' && <DriverDashboardNew />}
            {(currentScreen === 'driver-navigation' || currentScreen === 'navigation') && (
              <NavigationScreen onBack={() => setCurrentScreen('driver-dashboard')} />
            )}
            {currentScreen === 'driver-earnings' && <EarningsScreen />}
            {currentScreen === 'driver-settings' && <DriverSettingsScreen />}
            {currentScreen === 'driver-profile' && <DriverProfileScreen />}
            {(currentScreen === 'driver-client-info' || currentScreen === 'client-info') && <ClientInfoScreen />}
            {currentScreen === 'driver-wallet' && <DriverWalletScreen />}
            {(currentScreen === 'driver-active-ride' || currentScreen === 'active-ride') && <ActiveRideNavigationScreen />}
            {(currentScreen === 'driver-payment-confirmation' || currentScreen === 'payment-confirmation') && <PaymentConfirmationScreen />}
            {(currentScreen === 'welcome-back' || currentScreen === 'welcome-back-driver') && (
              <WelcomeBackScreen
                userName={state.currentDriver?.name || state.currentDriver?.email?.split('@')[0] || undefined}
                userType="driver"
                onComplete={() => setCurrentScreen('driver-dashboard')}
              />
            )}
            {currentScreen === 'forgot-password-driver' && (
              <ForgotPasswordScreen
                onBack={() => setCurrentScreen('driver-login')}
                userType="driver"
              />
            )}
            {currentScreen === 'reset-password-otp-driver' && (
              <ResetPasswordOTPScreen
                onBack={() => setCurrentScreen('driver-login')}
                onSuccess={() => setCurrentScreen('driver-login')}
                userType="driver"
              />
            )}
            {currentScreen === 'driver-deployment-check' && <DriverDeploymentCheck />}
            {!currentScreen && <DriverWelcomeScreen />}
            {currentScreen && !currentScreen.startsWith('driver-') &&
             currentScreen !== 'welcome-back' &&
             currentScreen !== 'welcome-back-driver' &&
             currentScreen !== 'forgot-password-driver' &&
             currentScreen !== 'reset-password-otp-driver' && (
              <DriverWelcomeScreen />
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export function DriverApp() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/*" element={<DriverAppContent />} />
      </Routes>
    </ErrorBoundary>
  );
}
