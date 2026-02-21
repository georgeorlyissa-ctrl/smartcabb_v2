import { Routes, Route, useLocation } from '../lib/simple-router';
import { DriverWelcomeScreen } from '../components/driver/DriverWelcomeScreen';
import { DriverLoginScreen } from '../components/driver/DriverLoginScreen';
import { DriverRegistrationScreen } from '../components/driver/DriverRegistrationScreen';
import { DriverDashboard } from '../components/driver/DriverDashboard';
import { NavigationScreen } from '../components/driver/NavigationScreen';
import { EarningsScreen } from '../components/driver/EarningsScreen';
import { DriverSettingsScreen } from '../components/driver/DriverSettingsScreen';
import { DriverProfileScreen } from '../components/driver/DriverProfileScreen';
import { ClientInfoScreen } from '../components/driver/ClientInfoScreen';
import { ConfirmationCodeScreen } from '../components/driver/ConfirmationCodeScreen';
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
import { useEffect } from 'react';

function DriverAppContent() {
  const { state, setCurrentScreen, setCurrentView } = useAppState();
  const { currentScreen, currentUser: user } = state;
  const showRLSModal = false; // Désactivé pour chauffeur
  const showRLSBlockingScreen = false; // Désactivé pour chauffeur

  // Pour l'app conducteur, on ne charge pas les données Supabase en mode démo
  // const { loading: dataLoading } = useSupabaseData();
  const dataLoading = false; // Désactivé pour app conducteur

  // ✅ CORRECTION: Quand on arrive sur /driver, forcer la vue conducteur
  const location = useLocation();
  useEffect(() => {
    console.log('🚗 DriverApp - Démarrage avec currentScreen:', currentScreen);
    console.log('🚗 DriverApp - Location pathname:', location.pathname);
    console.log('🚗 DriverApp - currentView:', state.currentView);
    console.log('🚗 DriverApp - currentDriver:', state.currentDriver?.id || 'none');
    
    // ✅ Si on est sur /driver OU /app/driver, s'assurer qu'on est en mode conducteur
    if (location.pathname.includes('/driver')) {
      // ✅ TOUJOURS forcer la vue à 'driver' dès qu'on est sur /driver
      console.log('🔄 Forçage de la vue à driver');
      setCurrentView('driver');
      
      // ✅ FIX: Si l'utilisateur est connecté et a un écran driver valide, ne rien changer
      if (state.currentDriver && currentScreen && currentScreen.startsWith('driver-') && currentScreen !== 'driver-welcome' && currentScreen !== 'driver-login') {
        console.log('✅ Conducteur connecté avec écran driver valide, on garde:', currentScreen);
        return; // Important : ne pas continuer pour éviter les redirections
      }
      
      // ✅ FIX: Si l'utilisateur est connecté mais n'a pas d'écran driver (refresh), aller au dashboard
      if (state.currentDriver && (!currentScreen || !currentScreen.startsWith('driver-'))) {
        console.log('🔄 Conducteur connecté après refresh, redirection vers dashboard');
        setCurrentScreen('driver-dashboard');
        return;
      }
      
      // Si on a déjà un écran driver valide (mais pas connecté), ne rien changer
      if (currentScreen && currentScreen.startsWith('driver-')) {
        console.log('✅ Écran driver déjà défini, on garde:', currentScreen);
        return; // Important : ne pas continuer
      }
      
      // Si on a un écran non-driver ou pas d'écran, initialiser vers welcome SEULEMENT si pas connecté
      if (!currentScreen || 
          currentScreen === 'landing' || 
          currentScreen === 'user-selection' ||
          currentScreen.startsWith('admin-') ||
          currentScreen.startsWith('passenger-')) {
        console.log('🔄 Initialisation vers driver-welcome');
        setCurrentScreen('driver-welcome');
      }
    }
  }, [location.pathname, currentScreen, state.currentView, state.currentDriver, setCurrentView, setCurrentScreen]); // Toutes les dépendances

  // Show RLS blocking screen if there's a critical RLS issue
  if (showRLSBlockingScreen) {
    return <RLSBlockingScreen />;
  }

  // Show loading screen
  if (dataLoading) {
    return <LoadingScreen />;
  }

  return (
    <>
      {/* RLS Fix Modal (non-blocking) */}
      {showRLSModal && <RLSFixModal />}

      {/* Main Driver App Screens */}
      <div className="h-screen">
        {/* Driver Screens */}
        {currentScreen === 'driver-welcome' && <DriverWelcomeScreen />}
        {currentScreen === 'driver-login' && <DriverLoginScreen />}
        {currentScreen === 'driver-registration' && <DriverRegistrationScreen />}
        {currentScreen === 'driver-dashboard' && <DriverDashboard />}
        {(currentScreen === 'driver-navigation' || currentScreen === 'navigation') && <NavigationScreen />}
        {currentScreen === 'driver-earnings' && <EarningsScreen />}
        {currentScreen === 'driver-settings' && <DriverSettingsScreen />}
        {currentScreen === 'driver-profile' && <DriverProfileScreen />}
        {(currentScreen === 'driver-client-info' || currentScreen === 'client-info') && <ClientInfoScreen />}
        {currentScreen === 'driver-wallet' && <DriverWalletScreen />}
        {(currentScreen === 'driver-confirmation-code' || currentScreen === 'confirmation-code') && <ConfirmationCodeScreen />}
        {(currentScreen === 'driver-active-ride' || currentScreen === 'active-ride') && <ActiveRideNavigationScreen />}
        {(currentScreen === 'driver-payment-confirmation' || currentScreen === 'payment-confirmation') && <PaymentConfirmationScreen />}
        {(currentScreen === 'welcome-back' || currentScreen === 'welcome-back-driver') && (
          <WelcomeBackScreen 
            userName={state.currentDriver?.name || state.currentDriver?.email?.split('@')[0] || undefined}
            userType="driver"
            onComplete={() => setCurrentScreen('driver-dashboard')}
          />
        )}
        
        {/* Forgot Password Flow */}
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
        
        {/* Fallback: Si aucun écran driver n'est affiché, afficher le welcome screen */}
        {!currentScreen && <DriverWelcomeScreen />}
        {currentScreen && !currentScreen.startsWith('driver-') && 
         currentScreen !== 'welcome-back' && 
         currentScreen !== 'welcome-back-driver' &&
         currentScreen !== 'forgot-password-driver' &&
         currentScreen !== 'reset-password-otp-driver' && (
          <DriverWelcomeScreen />
        )}
      </div>
    </>
  );
}

export function DriverApp() {
  return (
    <Routes>
      <Route path="/*" element={<DriverAppContent />} />
    </Routes>
  );
}
