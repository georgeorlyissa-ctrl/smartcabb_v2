import { useAppState } from './useAppState';

/**
 * Hook pour une navigation sécurisée qui évite les pages blanches
 */
export function useSafeNavigation() {
  const { setCurrentScreen, state } = useAppState();

  /**
   * Navigation sécurisée avec validation et fallback
   */
  const navigateTo = (screen: string, fallback: string = 'role-selection') => {
    console.log(`🧭 Navigation demandée vers: ${screen}`);
    
    // Liste des écrans valides
    const validScreens = [
      // Landing & Selection
      'landing', 'user-selection', 'role-selection',
      
      // Welcome Back
      'welcome-back-passenger', 'welcome-back-driver',
      
      // Passenger Auth
      'welcome', 'login', 'register',
      
      // Passenger Screens
      'map', 'estimate', 'payment-method', 'payment', 'payment-receipt',
      'ride-tracking', 'ride-completed', 'rating', 'ride-history',
      'profile', 'support', 'passenger-settings',
      
      // Driver Screens
      'driver-login', 'driver-registration', 'driver-dashboard',
      'driver-wallet', 'navigation', 'earnings', 'driver-settings',
      'driver-profile', 'client-info',
      
      // Admin Screens
      'admin-login', 'admin-register', 'admin-dashboard',
      'drivers-list', 'clients-list', 'promo-codes',
      'marketing-campaigns', 'postpaid-requests', 'admin-settings',
      'refund-management', 'analytics-dashboard', 'financial-reports',
      'audit-logs', 'admin-notifications', 'backup-and-recovery',
      'global-settings', 'sms-settings'
    ];

    // Vérifier si l'écran est valide
    if (!validScreens.includes(screen)) {
      console.warn(`⚠️ Écran invalide: ${screen}. Redirection vers ${fallback}`);
      setCurrentScreen(fallback);
      return;
    }

    // Navigation sécurisée
    try {
      setCurrentScreen(screen);
      console.log(`✅ Navigation réussie vers: ${screen}`);
    } catch (error) {
      console.error(`❌ Erreur de navigation vers ${screen}:`, error);
      console.log(`🔄 Redirection vers ${fallback}`);
      setCurrentScreen(fallback);
    }
  };

  /**
   * Navigation retour intelligente pour les passagers
   */
  const navigateBack = (currentScreen: string) => {
    console.log(`⬅️ Navigation retour depuis: ${currentScreen}`);
    
    // Définir les routes de retour par écran
    const backRoutes: Record<string, string> = {
      // Passenger flow
      'login': 'welcome',
      'register': 'welcome',
      'estimate': 'map',
      'payment-method': 'estimate',
      'payment': 'payment-method',
      'payment-receipt': 'map',
      'ride-tracking': 'map',
      'ride-completed': 'rating',
      'rating': 'map',
      'ride-history': 'map',
      'profile': 'map',
      'support': 'profile',
      'passenger-settings': 'profile',
      
      // Driver flow
      'driver-registration': 'driver-login',
      'driver-wallet': 'driver-dashboard',
      'navigation': 'driver-dashboard',
      'earnings': 'driver-dashboard',
      'driver-settings': 'driver-dashboard',
      'driver-profile': 'driver-dashboard',
      'client-info': 'navigation',
      
      // Admin flow
      'admin-register': 'admin-login',
      'drivers-list': 'admin-dashboard',
      'clients-list': 'admin-dashboard',
      'promo-codes': 'admin-dashboard',
      'marketing-campaigns': 'admin-dashboard',
      'postpaid-requests': 'admin-dashboard',
      'admin-settings': 'admin-dashboard',
      'refund-management': 'admin-dashboard',
      'analytics-dashboard': 'admin-dashboard',
      'financial-reports': 'admin-dashboard',
      'audit-logs': 'admin-dashboard',
      'admin-notifications': 'admin-dashboard',
      'sms-settings': 'global-settings',
    };

    // Obtenir l'écran de retour
    const backScreen = backRoutes[currentScreen];
    
    if (backScreen) {
      navigateTo(backScreen, 'role-selection');
    } else {
      // Par défaut, retourner à l'écran principal selon le type d'utilisateur
      console.warn(`⚠️ Pas de route de retour définie pour: ${currentScreen}`);
      
      // Détecter le type d'utilisateur depuis l'écran actuel
      if (currentScreen.includes('driver') || currentScreen.includes('navigation')) {
        navigateTo('driver-dashboard', 'driver-login');
      } else if (currentScreen.includes('admin')) {
        navigateTo('admin-dashboard', 'admin-login');
      } else {
        navigateTo('map', 'welcome');
      }
    }
  };

  /**
   * Navigation d'accueil selon le rôle de l'utilisateur
   */
  const navigateHome = () => {
    const userType = state.userType;
    
    console.log(`🏠 Navigation vers l'accueil - Type d'utilisateur: ${userType}`);
    
    switch (userType) {
      case 'driver':
        navigateTo('driver-dashboard', 'driver-login');
        break;
      case 'admin':
        navigateTo('admin-dashboard', 'admin-login');
        break;
      case 'passenger':
      default:
        navigateTo('map', 'welcome');
        break;
    }
  };

  return {
    navigateTo,
    navigateBack,
    navigateHome
  };
}