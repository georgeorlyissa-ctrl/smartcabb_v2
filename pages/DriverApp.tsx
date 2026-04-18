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
// ✅ SUPPRIMÉ : ConfirmationCodeScreen n'existe plus (système de code de confirmation retiré)
// import { ConfirmationCodeScreen } from '../components/driver/ConfirmationCodeScreen';
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
import { setupFCMForUser } from '../src/utils/firebase';

function DriverAppContent() {
  const { state, setCurrentScreen, setCurrentView, setCurrentDriver } = useAppState();
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
    
    // 🧹 NETTOYAGE AUTOMATIQUE : Vérifier et nettoyer les conducteurs non approuvés du localStorage
    if (location.pathname.includes('/driver')) {
      try {
        const savedDriverStr = localStorage.getItem('smartcab_current_driver');
        if (savedDriverStr) {
          const savedDriver = JSON.parse(savedDriverStr);
          const driverStatus = savedDriver.status;
          
          // ✅ FIX CRITIQUE : Ne nettoyer que les conducteurs EXPLICITEMENT rejetés ou suspendus
          // Ne PAS nettoyer les conducteurs 'pending', 'approved', ou sans statut (null/undefined)
          if (driverStatus === 'rejected' || driverStatus === 'suspended') {
            console.warn(`🧹 Nettoyage automatique : conducteur "${driverStatus}" détecté dans localStorage`);
            localStorage.removeItem('smartcab_current_driver');
            localStorage.removeItem('smartcab_current_user');
            
            // Si ce conducteur est chargé dans le state, le nettoyer aussi
            if (state.currentDriver?.id === savedDriver.id) {
              console.warn('🧹 Nettoyage du state currentDriver');
              setCurrentDriver(null);
            }
          }
        }
      } catch (error) {
        console.error('❌ Erreur lors du nettoyage du localStorage:', error);
      }
    }
    
    // ✅ Si on est sur /driver OU /app/driver, s'assurer qu'on est en mode conducteur
    if (location.pathname.includes('/driver')) {
      // ✅ TOUJOURS forcer la vue à 'driver' dès qu'on est sur /driver
      console.log('🔄 Forçage de la vue à driver');
      setCurrentView('driver');
      
      // 🚨 VÉRIFICATION CRITIQUE : Bloquer les conducteurs non approuvés
      if (state.currentDriver) {
        const driverStatus = state.currentDriver.status;
        console.log('🔍 Vérification statut conducteur:', driverStatus);
        
        // ✅ FIX CRITIQUE : Ne bloquer que les conducteurs rejetés ou suspendus
        // Les conducteurs 'pending' et 'approved' peuvent accéder à l'application
        if (driverStatus === 'rejected' || driverStatus === 'suspended') {
          console.warn(`⚠️ Conducteur avec statut "${driverStatus}" détecté, redirection vers login`);
          setCurrentDriver(null); // Nettoyer le state
          localStorage.removeItem('smartcab_current_driver'); // Nettoyer le localStorage
          
          // ✅ FIX: Ne PAS afficher de toast ni rediriger si on est déjà sur l'écran d'inscription
          // Cela évite le toast "Conducteur non trouvé" pendant l'inscription
          if (currentScreen !== 'driver-registration') {
            setCurrentScreen('driver-login');
          }
          return;
        }
      }
      
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
  }, [location.pathname, currentScreen, state.currentView, state.currentDriver, setCurrentView, setCurrentScreen, setCurrentDriver]); // Ajout de setCurrentDriver

  // ✅ FCM : Initialiser les notifications push pour le conducteur
useEffect(() => {
  if (!state.currentDriver?.id || state.currentView !== 'driver') return;

  console.log('🔥 FCM déjà géré par DriverDashboardNew - skip setupFCMForUser');
  
  // ❌ NE PAS appeler setupFCMForUser ici - il court-circuite le système FCM
  // Le listener FCM est géré dans DriverDashboardNew via registerDriverFCMToken + listenToFCMMessages
  // qui dispatche fcm-new-ride-request → setPendingRideRequest → RideNotification

}, [state.currentDriver?.id, state.currentView]);

    // Vérifier que c'est bien un conducteur
    if (state.currentView !== 'driver') {
      console.log('⏭️ FCM : Pas un conducteur, skip');
      return;
    }

    console.log('🔥 Initialisation FCM pour conducteur:', state.currentDriver.id);

    // Configuration FCM complète
    setupFCMForUser(state.currentDriver.id, 'driver', (payload) => {
      console.log('🔔 Notification conducteur reçue:', payload);
      
      const { title, body } = payload.notification || {};
      const data = payload.data || {};

      // Gérer selon le type de notification
      switch (data.type) {
        case 'new_ride_request':
          console.log('🚗 NOUVELLE DEMANDE DE COURSE !', {
            title,
            body,
            rideId: data.rideId,
            pickup: data.pickup,
            destination: data.destination,
            price: data.price,
            distance: data.distance
          });
          
          // TODO : Afficher modal de nouvelle course avec détails
          // TODO : Jouer son d'alerte
          break;

        case 'ride_cancelled':
          console.log('❌ Course annulée par le passager', {
            title,
            body,
            rideId: data.rideId,
            reason: data.reason
          });
          
          // TODO : Fermer l'écran de course active
          // TODO : Retour au dashboard
          break;

        case 'payment_received':
          console.log('💰 Paiement reçu !', {
            title,
            body,
            amount: data.amount,
            rideId: data.rideId
          });
          
          // TODO : Afficher confirmation de paiement
          break;

        case 'sos_alert':
          console.log('⚠️⚠️⚠️ ALERTE SOS !', {
            title,
            body,
            passengerId: data.passengerId,
            passengerName: data.passengerName,
            location: data.location
          });
          
          // TODO : Afficher alerte urgente plein écran
          break;

        default:
          console.log('🔔 Notification générique:', { title, body, data });
      }
    });
  }, [state.currentDriver?.id, state.currentView]);

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
        {currentScreen === 'driver-dashboard' && <DriverDashboardNew />}
        {(currentScreen === 'driver-navigation' || currentScreen === 'navigation') && <NavigationScreen />}
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
        
        {/* Deployment Check */}
        {currentScreen === 'driver-deployment-check' && <DriverDeploymentCheck />}
        
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
    <ErrorBoundary>
      <Routes>
        <Route path="/*" element={<DriverAppContent />} />
      </Routes>
    </ErrorBoundary>
  );
}
