import { RideInProgressScreen } from '../components/passenger/RideInProgressScreen';
import { DriverApproachingScreen } from '../components/passenger/DriverApproachingScreen';
import { useEffect, useMemo } from 'react';
import { setupFCMForUser } from '../src/utils/firebase';
import { useAppState } from '../hooks/useAppState';
import { useNavigate, useLocation, Routes, Route } from '../lib/simple-router';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { RLSBlockingScreen } from '../components/RLSBlockingScreen';
import { LoadingScreen } from '../components/LoadingScreen';
import { LandingScreen } from '../components/LandingScreen';
import { UserSelectionScreen } from '../components/UserSelectionScreen';
import { WelcomeBackScreen } from '../components/WelcomeBackScreen';
import { LoginScreen } from '../components/passenger/LoginScreen';
import { RegisterScreen } from '../components/passenger/RegisterScreen';
import { MapScreen } from '../components/passenger/MapScreen';
import { PaymentScreen } from '../components/passenger/PaymentScreen';
import { RatingScreen } from '../components/passenger/RatingScreen';
import { RLSFixModal } from '../components/RLSFixModal';
import { ForgotPasswordScreen } from '../components/ForgotPasswordScreen';
import { ResetPasswordOTPScreen } from '../components/ResetPasswordOTPScreen';
import { RideCompletedScreen } from '../components/passenger/RideCompletedScreen';
import { PaymentReceiptScreen } from '../components/passenger/PaymentReceiptScreen';
import { SettingsScreen } from '../components/passenger/SettingsScreen';
import { ProfileScreen } from '../components/passenger/ProfileScreen';
import { RideHistoryScreen } from '../components/passenger/RideHistoryScreen';
import { PromoCodeScreen } from '../components/passenger/PromoCodeScreen';
import { WalletScreen } from '../components/passenger/WalletScreen';
import { PrivacySettingsScreen } from '../components/passenger/PrivacySettingsScreen';
import { PaymentMethodScreen } from '../components/passenger/PaymentMethodScreen';
import { PaymentSettingsScreen } from '../components/passenger/PaymentSettingsScreen';
import { SupportScreen } from '../components/passenger/SupportScreen';
import { MapScreenSimple } from '../components/passenger/MapScreenSimple';
import { EstimateScreen } from '../components/passenger/EstimateScreen';
import { RideScreen } from '../components/passenger/RideScreen';
import { DriverFoundScreen } from '../components/passenger/DriverFoundScreen';
import { LiveTrackingMap } from '../components/passenger/LiveTrackingMap';
import { RideTrackingScreen } from '../components/passenger/RideTrackingScreen';
import { LiveTrackingScreen } from '../components/passenger/LiveTrackingScreen';
import { SearchingDriversScreen } from '../components/passenger/SearchingDriversScreen';

function PassengerAppContent() {
  const { state, setCurrentScreen, setCurrentView } = useAppState();
  const { currentScreen, currentUser: user } = state;
  const navigate = useNavigate();
  const location = useLocation();
  const showRLSModal = false;
  const showRLSBlockingScreen = false;
  const dataLoading = false;

  // ✅ FIX CRITIQUE: screenToShow calculé SANS useMemo pour éviter les violations de règles de hooks
  // Le useMemo était après des return conditionnels → crash sur iOS Safari
  const screenToShow = currentScreen && currentScreen !== '' ? currentScreen : 'landing';

  // ✅ FIX CRITIQUE: useMemo AVANT tous les return conditionnels
  // Sur iOS Safari, les hooks doivent toujours être appelés dans le même ordre
  const screenComponent = useMemo(() => {
    console.log('📺 PassengerApp - screenToShow calculé:', screenToShow, '| currentUser:', user?.name || 'aucun');
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
      case 'searching-drivers':
        return (
          <ErrorBoundary>
            <SearchingDriversScreen />
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
  }, [screenToShow, user?.name, user?.email, state.currentRide, state.pickup, state.destination, setCurrentScreen]);

  // ✅ useEffect APRÈS tous les useMemo — ordre des hooks toujours respecté
  useEffect(() => {
    console.log('🚀 PassengerApp monté - currentScreen:', currentScreen, 'location:', location.pathname);
    console.log('🚀 PassengerApp - currentView:', state.currentView);
    console.log('🚀 PassengerApp - currentUser:', state.currentUser?.id || 'none');

    // ❌ NE PAS charger PassengerApp si on est sur un écran admin ou driver
    if (currentScreen?.startsWith('admin-') || currentScreen?.startsWith('driver-')) {
      console.log('⚠️ Écran admin/driver détecté, on ne touche pas à la vue');
      return;
    }

    let shouldUpdate = false;
    let newView: 'passenger' | 'driver' | 'admin' | null = null;
    let newScreen: string | null = null;

    // ✅ Si on est sur /app/passenger, forcer la vue à 'passenger'
    if (location.pathname.includes('/passenger') && state.currentView !== 'passenger') {
      newView = 'passenger';
      shouldUpdate = true;
    }

    // ✅ Si l'utilisateur est connecté avec un écran valide, ne rien changer
    if (state.currentUser && currentScreen && !['landing', 'user-selection', 'login', 'register'].includes(currentScreen)) {
      console.log('✅ Passager connecté avec écran valide, on garde:', currentScreen);
      if (shouldUpdate && newView) setCurrentView(newView);
      return;
    }

    // ✅ Si connecté mais pas d'écran valide (refresh), aller à map
    if (state.currentUser && (!currentScreen || ['landing', 'user-selection', 'login', 'register'].includes(currentScreen))) {
      console.log('🔄 Passager connecté après refresh, redirection vers map');
      newScreen = 'map';
      shouldUpdate = true;
    } else if (currentScreen && currentScreen !== '') {
      console.log('✅ Écran restauré depuis localStorage:', currentScreen);
      if (shouldUpdate && newView) setCurrentView(newView);
      return;
    } else if (!currentScreen || currentScreen === '') {
      console.log('🔄 Initialisation vers landing depuis PassengerApp');
      newView = 'passenger';
      newScreen = 'landing';
      shouldUpdate = true;
    } else if (currentScreen === 'user-selection' && user) {
      console.log('✅ Utilisateur déjà connecté, redirection vers map');
      newScreen = 'map';
      shouldUpdate = true;
    }

    if (shouldUpdate) {
      if (newView !== null) setCurrentView(newView);
      if (newScreen !== null) setCurrentScreen(newScreen);
    }
  }, [location.pathname, currentScreen, state.currentView, state.currentUser?.id, user?.id]);

  // ✅ FCM : Initialiser les notifications push pour le passager
  useEffect(() => {
    if (!state.currentUser || !state.currentUser.id) return;
    if (state.currentView !== 'passenger') return;

    console.log('🔥 Initialisation FCM pour passager:', state.currentUser.id);

    setupFCMForUser(state.currentUser.id, 'passenger', (payload) => {
      console.log('🔔 Notification passager reçue:', payload);
      
      const { title, body } = payload.notification || {};
      const data = payload.data || {};

      switch (data.type) {
        case 'ride_accepted':
          console.log('✅ Course acceptée !', { title, body });
          break;
        case 'driver_arriving':
          console.log('🚗 Conducteur arrive !', { title, body });
          break;
        case 'ride_started':
          console.log('🚀 Course démarrée !', { title, body });
          break;
        case 'ride_completed':
          console.log('✅ Course terminée !', { title, body });
          break;
        case 'ride_cancelled':
          console.log('❌ Course annulée', { title, body, reason: data.reason });
          break;
        default:
          console.log('🔔 Notification générique:', { title, body, data });
      }
    });
  }, [state.currentUser?.id, state.currentView]);

  console.log('🎯 PassengerApp render - screenToShow:', screenToShow);

  // ✅ Les return conditionnels sont APRÈS tous les hooks
  if (showRLSBlockingScreen) {
    return <RLSBlockingScreen />;
  }

  if (dataLoading) {
    return <LoadingScreen />;
  }

  return (
    <ErrorBoundary>
      {showRLSModal && <RLSFixModal />}

      {/* Main App Screens — contrainte mobile 430px */}
      <div className="min-h-screen bg-gray-100 flex justify-center">
        <div className="w-full max-w-[430px] h-screen relative overflow-hidden bg-white shadow-2xl">
          <div className="h-full overflow-y-auto transition-opacity duration-300" style={{ willChange: 'opacity' }}>
            {screenComponent}
          </div>
        </div>
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
