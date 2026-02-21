import { Routes, Route, useNavigate, useLocation } from '../lib/simple-router';
import { useAppState } from '../hooks/useAppState';
import { RLSFixModal } from '../components/RLSFixModal';
import { RLSBlockingScreen } from '../components/RLSBlockingScreen';
import { LoadingScreen } from '../components/LoadingScreen';
import { LandingScreen } from '../components/LandingScreen';
import { UserSelectionScreen } from '../components/UserSelectionScreen';
import { WelcomeBackScreen } from '../components/WelcomeBackScreen';
import { ErrorBoundary } from '../components/ErrorBoundary';

// Import direct sans lazy loading pour debug
import { LoginScreen } from '../components/passenger/LoginScreen';
import { RegisterScreen } from '../components/passenger/RegisterScreen';
import { ForgotPasswordScreen } from '../components/ForgotPasswordScreen';
import { ResetPasswordOTPScreen } from '../components/ResetPasswordOTPScreen';
import { MapScreen } from '../components/passenger/MapScreen';
import { MapScreenSimple } from '../components/passenger/MapScreenSimple'; // 🔍 VERSION DIAGNOSTIC
import { EstimateScreen } from '../components/passenger/EstimateScreen';
import { RideScreen } from '../components/passenger/RideScreen';
import { DriverFoundScreen } from '../components/passenger/DriverFoundScreen';
import { LiveTrackingMap } from '../components/passenger/LiveTrackingMap';
import { LiveTrackingScreen } from '../components/passenger/LiveTrackingScreen';
import { RideTrackingScreen } from '../components/passenger/RideTrackingScreen';
import { RideCompletedScreen } from '../components/passenger/RideCompletedScreen';
import { PaymentReceiptScreen } from '../components/passenger/PaymentReceiptScreen';
import { PaymentScreen } from '../components/passenger/PaymentScreen';
import { RatingScreen } from '../components/passenger/RatingScreen';
import { SettingsScreen } from '../components/passenger/SettingsScreen';
import { ProfileScreen } from '../components/passenger/ProfileScreen';
import { RideHistoryScreen } from '../components/passenger/RideHistoryScreen';
import { PromoCodeScreen } from '../components/passenger/PromoCodeScreen';
import { WalletScreen } from '../components/passenger/WalletScreen';
import { PrivacySettingsScreen } from '../components/passenger/PrivacySettingsScreen';
import { PaymentMethodScreen } from '../components/passenger/PaymentMethodScreen';
import { PaymentSettingsScreen } from '../components/passenger/PaymentSettingsScreen';
import { SupportScreen } from '../components/passenger/SupportScreen';
import { RideInProgressScreen } from '../components/passenger/RideInProgressScreen';
import { DriverApproachingScreen } from '../components/passenger/DriverApproachingScreen';
import { useEffect, useMemo } from 'react';

function PassengerAppContent() {
  const { state, setCurrentScreen, setCurrentView } = useAppState();
  const { currentScreen, currentUser: user } = state;
  const navigate = useNavigate();
  const location = useLocation();
  const showRLSModal = false; // Désactivé pour passager
  const showRLSBlockingScreen = false; // Désactivé pour passager
  
  // Pour l'app passager, on ne charge pas les données Supabase
  const dataLoading = false; // Désactivé pour app passager

  // ✅ Initialisation: définir l'écran par défaut
  useEffect(() => {
    console.log('🚀 PassengerApp monté - currentScreen:', currentScreen, 'location:', location.pathname);
    console.log('🚀 PassengerApp - currentView:', state.currentView);
    console.log('🚀 PassengerApp - currentUser:', state.currentUser?.id || 'none');
    console.log('🚀 PassengerApp - pickup:', state.pickup?.address);
    console.log('🚀 PassengerApp - destination:', state.destination?.address);
    
    // ✅ Si on est sur /app/passenger, forcer la vue à 'passenger'
    if (location.pathname.includes('/passenger')) {
      console.log('🔄 Forçage de la vue à passenger');
      setCurrentView('passenger');
    }
    
    // ❌ NE PAS charger PassengerApp si on est sur un écran admin ou driver
    if (currentScreen?.startsWith('admin-') || currentScreen?.startsWith('driver-')) {
      console.log('⚠️ Écran admin/driver détecté, on ne touche pas à la vue');
      return;
    }
    
    // ✅ FIX: Si l'utilisateur est connecté et a un écran passager valide, ne rien changer
    if (state.currentUser && currentScreen && !['landing', 'user-selection', 'login', 'register'].includes(currentScreen)) {
      console.log('✅ Passager connecté avec écran valide, on garde:', currentScreen);
      return; // Important : ne pas continuer pour éviter les redirections
    }
    
    // ✅ FIX: Si l'utilisateur est connecté mais n'a pas d'écran valide (refresh), aller à map
    if (state.currentUser && (!currentScreen || ['landing', 'user-selection', 'login', 'register'].includes(currentScreen))) {
      console.log('🔄 Passager connecté après refresh, redirection vers map');
      setCurrentScreen('map');
      return;
    }
    
    // 🆕 CORRECTION : Ne pas écraser l'écran restauré depuis localStorage
    // Si currentScreen existe déjà (restauré depuis localStorage), le garder
    if (currentScreen && currentScreen !== '') {
      console.log('✅ Écran restauré depuis localStorage:', currentScreen);
      // Ne rien faire, l'écran est déjà correct
      return;
    }
    
    // Si on arrive sur /app sans écran défini ET sans données sauvegardées, initialiser à 'landing'
    if (!currentScreen || currentScreen === '') {
      console.log('🔄 Initialisation vers landing depuis PassengerApp (aucun état sauvegardé)');
      setCurrentView('passenger');
      setCurrentScreen('landing');
    }
    
    // Si on est sur user-selection et qu'on a déjà un utilisateur, aller à map
    if (currentScreen === 'user-selection' && user) {
      console.log('✅ Utilisateur déjà connecté, redirection vers map');
      setCurrentScreen('map');
    }
  }, [location.pathname, currentScreen, state.currentView, state.currentUser, user, setCurrentView, setCurrentScreen]); // Toutes les dépendances

  // ✅ Gérer le cas où currentScreen est vide PENDANT le render
  const screenToShow = useMemo(() => {
    const screen = currentScreen && currentScreen !== '' ? currentScreen : 'landing';
    console.log('📺 PassengerApp - screenToShow calculé:', screen, '| currentUser:', user?.name || 'aucun');
    return screen;
  }, [currentScreen, user]);

  console.log('🎯 PassengerApp render - currentScreen:', currentScreen, '-> screenToShow:', screenToShow);

  // Show RLS blocking screen if there's a critical RLS issue
  if (showRLSBlockingScreen) {
    return <RLSBlockingScreen />;
  }

  // Show loading screen
  if (dataLoading) {
    return <LoadingScreen />;
  }

  // Mémoïser le rendu des écrans
  const screenComponent = useMemo(() => {
    switch(screenToShow) {
      case 'landing':
        return <LandingScreen />;
      case 'user-selection':
        return <UserSelectionScreen />;
      case 'welcome-back':
      case 'welcome-back-passenger':
        return (
          <WelcomeBackScreen 
            userName={user?.name || user?.email?.split('@')[0] || undefined}
            userType="passenger"
            onComplete={() => setCurrentScreen('login')}
          />
        );
      case 'login':
        return (
          <ErrorBoundary>
            <LoginScreen />
          </ErrorBoundary>
        );
      case 'register':
        return (
          <ErrorBoundary>
            <RegisterScreen />
          </ErrorBoundary>
        );
      case 'forgot-password':
        return (
          <ErrorBoundary>
            <ForgotPasswordScreen 
              onBack={() => setCurrentScreen('login')} 
              userType="passenger" 
            />
          </ErrorBoundary>
        );
      case 'reset-password-otp':
        return (
          <ErrorBoundary>
            <ResetPasswordOTPScreen 
              onBack={() => setCurrentScreen('login')} 
              onSuccess={() => setCurrentScreen('login')}
              userType="passenger" 
            />
          </ErrorBoundary>
        );
      case 'map':
        return (
          <ErrorBoundary>
            <MapScreen />
          </ErrorBoundary>
        );
      case 'map-simple':
        return (
          <ErrorBoundary>
            <MapScreenSimple />
          </ErrorBoundary>
        );
      case 'estimate':
        return (
          <ErrorBoundary>
            <EstimateScreen />
          </ErrorBoundary>
        );
      case 'ride':
        return (
          <ErrorBoundary>
            <RideScreen />
          </ErrorBoundary>
        );
      case 'driver-found':
        return (
          <ErrorBoundary>
            <DriverFoundScreen 
              driverData={{
                id: state.currentRide?.driverId || '',
                full_name: state.currentRide?.driverName || 'Conducteur',
                phone: state.currentRide?.driverPhone || '',
                rating: 4.8,
                total_rides: 150,
                vehicle: state.currentRide?.vehicleInfo
              }}
              estimatedArrival={3}
            />
          </ErrorBoundary>
        );
      case 'tracking':
        return (
          <ErrorBoundary>
            <LiveTrackingMap 
              driverId={state.currentRide?.driverId || ''}
              pickup={state.pickup || { lat: -4.3276, lng: 15.3136, address: 'Kinshasa' }}
              destination={state.destination || { lat: -4.3276, lng: 15.3136, address: 'Kinshasa' }}
              driverName={state.currentRide?.driverName || 'Conducteur'}
            />
          </ErrorBoundary>
        );
      case 'ride-tracking':
        return (
          <ErrorBoundary>
            <RideTrackingScreen />
          </ErrorBoundary>
        );
      case 'live-tracking':
        return (
          <ErrorBoundary>
            <LiveTrackingScreen />
          </ErrorBoundary>
        );
      case 'ride-in-progress':
        return (
          <ErrorBoundary>
            <RideInProgressScreen />
          </ErrorBoundary>
        );
      case 'driver-approaching':
        return (
          <ErrorBoundary>
            <DriverApproachingScreen />
          </ErrorBoundary>
        );
      case 'ride-completed':
        return (
          <ErrorBoundary>
            <RideCompletedScreen />
          </ErrorBoundary>
        );
      case 'payment':
        return (
          <ErrorBoundary>
            <PaymentScreen />
          </ErrorBoundary>
        );
      case 'payment-receipt':
        return (
          <ErrorBoundary>
            <PaymentReceiptScreen />
          </ErrorBoundary>
        );
      case 'rating':
        return (
          <ErrorBoundary>
            <RatingScreen />
          </ErrorBoundary>
        );
      case 'settings':
        return (
          <ErrorBoundary>
            <SettingsScreen />
          </ErrorBoundary>
        );
      case 'passenger-settings':
        return (
          <ErrorBoundary>
            <SettingsScreen />
          </ErrorBoundary>
        );
      case 'profile':
        return (
          <ErrorBoundary>
            <ProfileScreen />
          </ErrorBoundary>
        );
      case 'ride-history':
        return (
          <ErrorBoundary>
            <RideHistoryScreen />
          </ErrorBoundary>
        );
      case 'promo-code':
        return (
          <ErrorBoundary>
            <PromoCodeScreen />
          </ErrorBoundary>
        );
      case 'wallet':
        return (
          <ErrorBoundary>
            <WalletScreen />
          </ErrorBoundary>
        );
      case 'privacy-settings':
        return (
          <ErrorBoundary>
            <PrivacySettingsScreen />
          </ErrorBoundary>
        );
      case 'payment-method':
        return (
          <ErrorBoundary>
            <PaymentMethodScreen />
          </ErrorBoundary>
        );
      case 'payment-methods':
        return (
          <ErrorBoundary>
            <PaymentSettingsScreen />
          </ErrorBoundary>
        );
      case 'payment-settings':
        return (
          <ErrorBoundary>
            <PaymentSettingsScreen />
          </ErrorBoundary>
        );
      case 'support':
        return (
          <ErrorBoundary>
            <SupportScreen />
          </ErrorBoundary>
        );
      default:
        return <LandingScreen />;
    }
  }, [screenToShow]);

  return (
    <ErrorBoundary>
      {/* RLS Fix Modal (non-blocking) */}
      {showRLSModal && <RLSFixModal />}

      {/* Main App Screens - Optimisé pour mobile */}
      <div className="h-screen transition-opacity duration-300" style={{ willChange: 'opacity' }}>
        {screenComponent}
      </div>
    </ErrorBoundary>
  );
}

export function PassengerApp() {
  console.log('📱 PassengerApp - Composant principal chargé');
  
  return (
    <Routes>
      <Route path="/*" element={<PassengerAppContent />} />
    </Routes>
  );
}
