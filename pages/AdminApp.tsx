import React, { useEffect, useRef } from 'react';
import { useLocation, Routes, Route } from '../lib/simple-router';
import { useAppState } from '../hooks/useAppState';
import { AlertCircle } from '../lib/icons';
import { AdminDiagnostic } from '../components/admin/AdminDiagnostic';
import { UsersManagementScreen } from '../components/UsersManagementScreen';
import { UsersDiagnosticScreen } from '../components/admin/UsersDiagnosticScreen';

// Import lazy des écrans admin pour optimisation
const AdminLoginScreen = React.lazy(() => import('../components/admin/AdminLoginScreen').then(m => ({ default: m.AdminLoginScreen })));
const AdminRegisterScreen = React.lazy(() => import('../components/admin/AdminRegisterScreen').then(m => ({ default: m.AdminRegisterScreen })));
const AdminDashboard = React.lazy(() => import('../components/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const DriversListScreen = React.lazy(() => import('../components/admin/DriversListScreen').then(m => ({ default: m.DriversListScreen })));
const ClientsListScreen = React.lazy(() => import('../components/admin/ClientsListScreen').then(m => ({ default: m.ClientsListScreen })));
const FinancialReportsScreen = React.lazy(() => import('../components/admin/FinancialReportsScreen').then(m => ({ default: m.FinancialReportsScreen })));
const PromoCodesScreen = React.lazy(() => import('../components/admin/PromoCodesScreen').then(m => ({ default: m.PromoCodesScreen })));
const SettingsScreen = React.lazy(() => import('../components/admin/SettingsScreen').then(m => ({ default: m.SettingsScreen })));
const GlobalSettingsScreen = React.lazy(() => import('../components/admin/GlobalSettingsScreen').then(m => ({ default: m.GlobalSettingsScreen })));
const SMSSettingsScreen = React.lazy(() => import('../components/admin/SMSSettingsScreen').then(m => ({ default: m.SMSSettingsScreen })));
const EmailSettingsScreen = React.lazy(() => import('../components/admin/EmailSettingsScreen').then(m => ({ default: m.EmailSettingsScreen })));
const EmailHistoryScreen = React.lazy(() => import('../components/admin/EmailHistoryScreen').then(m => ({ default: m.EmailHistoryScreen })));
const AdminNotificationsCenter = React.lazy(() => import('../components/admin/AdminNotificationsCenter').then(m => ({ default: m.AdminNotificationsCenter })));
const PostpaidRequestsScreen = React.lazy(() => import('../components/admin/PostpaidRequestsScreen').then(m => ({ default: m.PostpaidRequestsScreen })));
const ContactMessagesScreen = React.lazy(() => import('../components/admin/ContactMessagesScreen').then(m => ({ default: m.ContactMessagesScreen })));
const CustomerSupportScreen = React.lazy(() => import('../components/admin/CustomerSupportScreen').then(m => ({ default: m.CustomerSupportScreen })));
const MarketingCampaignsScreen = React.lazy(() => import('../components/admin/MarketingCampaignsScreen').then(m => ({ default: m.MarketingCampaignsScreen })));
const RefundManagementScreen = React.lazy(() => import('../components/admin/RefundManagementScreen').then(m => ({ default: m.RefundManagementScreen })));
const AuditLogsScreen = React.lazy(() => import('../components/admin/AuditLogsScreen').then(m => ({ default: m.AuditLogsScreen })));
const BackupAndRecoveryScreen = React.lazy(() => import('../components/admin/BackupAndRecoveryScreen').then(m => ({ default: m.BackupAndRecoveryScreen })));
const AdvancedAnalyticsDashboard = React.lazy(() => import('../components/admin/AdvancedAnalyticsDashboard').then(m => ({ default: m.AdvancedAnalyticsDashboard })));
const AdminToolsScreen = React.lazy(() => import('../components/admin/AdminToolsScreen').then(m => ({ default: m.AdminToolsScreen })));
const ChatMessagesScreen = React.lazy(() => import('../components/admin/ChatMessagesScreen').then(m => ({ default: m.ChatMessagesScreen })));
const BudgetDashboard = React.lazy(() => import('../components/admin/BudgetDashboard').then(m => ({ default: m.BudgetDashboard })));
const DataCleanupPanel = React.lazy(() => import('../components/admin/DataCleanupPanel').then(m => ({ default: m.DataCleanupPanel })));
const PendingRechargesScreenNew = React.lazy(() => import('../components/admin/PendingRechargesScreenNew').then(m => ({ default: m.PendingRechargesScreenNew })));
const AdminAnalyticsDashboard = React.lazy(() => import('../components/admin/AdminAnalyticsDashboard').then(m => ({ default: m.AdminAnalyticsDashboard })));
const CancellationsScreen = React.lazy(() => import('../components/admin/CancellationsScreen').then(m => ({ default: m.CancellationsScreen })));
const RLSBlockingScreen = React.lazy(() => import('../components/RLSBlockingScreen').then(m => ({ default: m.RLSBlockingScreen })));
const RLSFixModal = React.lazy(() => import('../components/RLSFixModal').then(m => ({ default: m.RLSFixModal })));
const AdminAccountSync = React.lazy(() => import('../components/admin/AdminAccountSync').then(m => ({ default: m.AdminAccountSync })));

function AdminAppContent() {
  const { state, setCurrentScreen, setCurrentView, updateUser } = useAppState();
  const { currentScreen } = state;
  const initialized = useRef(false);
  const location = useLocation();
  
  // Définir l'écran par défaut quand on arrive sur /admin
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    
    console.log('👔 AdminApp - Démarrage avec currentScreen:', state.currentScreen);
    console.log('👔 AdminApp - location.pathname:', location.pathname);
    console.log('👔 AdminApp - isAdmin:', state.isAdmin);
    console.log('👔 AdminApp - currentUser:', state.currentUser?.id || 'none');
    
    // ✅ DÉTECTION DE ROUTE : Vérifier qu'on est bien sur une route admin
    const isAdminRoute = location.pathname.includes('/admin');
    
    if (!isAdminRoute) {
      console.log('⚠️ AdminApp chargé mais pas sur route /admin, on ignore');
      return;
    }
    
    // ❌ NE PAS charger AdminApp si on est sur un écran driver ou passenger
    if (state.currentScreen?.startsWith('driver-') || state.currentScreen?.startsWith('passenger-')) {
      console.log('⚠️ Écran driver/passenger détecté, on ne touche pas à la vue');
      return;
    }
    
    // ✅ SÉCURITÉ : Ne mettre la vue admin que visuellement
    // NE PAS définir setIsAdmin(true) automatiquement !
    // setIsAdmin(true) doit être défini UNIQUEMENT après connexion réussie
    setCurrentView('admin');
    
    // ✅ Si on arrive sur /admin sans écran défini ou avec un écran non-admin, afficher le login
    // Liste des écrans admin valides (avec et sans préfixe 'admin-')
    const validAdminScreens = [
      'admin-login', 'admin-register', 'admin-dashboard', 'admin-drivers', 'admin-clients',
      'admin-financial-reports', 'admin-promo-codes', 'admin-settings', 'admin-global-settings',
      'admin-sms-settings', 'admin-email-settings', 'admin-email-history', 'admin-notifications',
      'admin-postpaid-requests', 'admin-contact-messages', 'admin-customer-support', 'admin-marketing',
      'admin-refunds', 'admin-audit-logs', 'admin-backup', 'admin-analytics', 'admin-tools',
      'admin-chat-messages', 'admin-budget-dashboard', 'admin-pending-recharges',
      // Alias sans préfixe admin-
      'drivers-list', 'clients-list', 'contact-messages', 'postpaid-requests', 'refund-management',
      'analytics-dashboard', 'financial-reports', 'audit-logs', 'backup-and-recovery',
      'sms-settings', 'global-settings', 'admin-diagnostic', 'data-cleanup', 'pending-recharges', 'admin-users-management',
      'admin-sync', 'admin-account-sync', 'cancellations', 'admin-users-diagnostic' // ✅ Ajouté
    ];
    
    // ✅ FIX: Si l'admin est connecté et a un écran admin valide, ne rien changer
    if (state.isAdmin && state.currentScreen && validAdminScreens.includes(state.currentScreen) && state.currentScreen !== 'admin-login') {
      console.log('✅ Admin connecté avec écran valide, on garde:', state.currentScreen);
      return; // Important : ne pas continuer pour éviter les redirections
    }
    
    // ✅ FIX: Si l'admin est connecté mais n'a pas d'écran valide (refresh), aller au dashboard
    if (state.isAdmin && (!state.currentScreen || !validAdminScreens.includes(state.currentScreen) || state.currentScreen === 'admin-login')) {
      console.log('🔄 Admin connecté après refresh, redirection vers dashboard');
      setCurrentScreen('admin-dashboard');
      return;
    }
    
    // 🆕 CORRECTION : Ne pas écraser l'écran restauré depuis localStorage s'il est valide
    if (state.currentScreen && validAdminScreens.includes(state.currentScreen)) {
      console.log('✅ Écran admin restauré depuis localStorage:', state.currentScreen);
      // Ne rien faire, l'écran est déjà correct
    } else if (!state.currentScreen || !validAdminScreens.includes(state.currentScreen)) {
      console.log('👔 AdminApp - Initialisation avec admin-login (aucun écran valide sauvegardé)');
      setCurrentScreen('admin-login');
    }
  }, [location.pathname, state.currentScreen, state.isAdmin, state.currentUser, setCurrentView, setCurrentScreen]);
  
  // État RLS local
  const showRLSModal = false;
  const showRLSBlockingScreen = false;

  // Show RLS blocking screen if there's a critical RLS issue
  if (showRLSBlockingScreen) {
    return <RLSBlockingScreen />;
  }
  
  // ✅ AMÉLIORATION : Liste complète des écrans admin valides
  const validAdminScreens = [
    'admin-login', 'admin-register', 'admin-dashboard', 'admin-drivers', 'admin-clients',
    'admin-financial-reports', 'admin-promo-codes', 'admin-settings', 'admin-global-settings',
    'admin-sms-settings', 'admin-email-settings', 'admin-email-history', 'admin-notifications',
    'admin-postpaid-requests', 'admin-contact-messages', 'admin-customer-support', 'admin-marketing',
    'admin-refunds', 'admin-audit-logs', 'admin-backup', 'admin-analytics', 'admin-tools',
    'admin-chat-messages', 'admin-budget-dashboard', 'admin-pending-recharges',
    // Alias sans préfixe admin-
    'drivers-list', 'clients-list', 'contact-messages', 'postpaid-requests', 'refund-management',
    'analytics-dashboard', 'financial-reports', 'audit-logs', 'backup-and-recovery',
    'sms-settings', 'global-settings', 'admin-diagnostic', 'data-cleanup', 'pending-recharges', 'admin-users-management',
    'admin-sync', 'admin-account-sync', 'cancellations', 'admin-users-diagnostic' // ✅ Ajouté
  ];
  
  // ✅ FALLBACK AMÉLIORÉ : Vérifier si l'écran est dans la liste des écrans admin valides
  const screenToShow = currentScreen && validAdminScreens.includes(currentScreen)
    ? currentScreen 
    : 'admin-login';
  
  console.log('👔 AdminApp - Affichage de l\'écran:', screenToShow);

  return (
    <>
      {/* Diagnostic au chargement */}
      <AdminDiagnostic />
      
      {/* RLS Fix Modal (non-blocking) */}
      {showRLSModal && <RLSFixModal />}

      {/* Main Admin App Screens */}
      <div className="h-screen w-screen overflow-auto">
        {screenToShow === 'admin-login' && <AdminLoginScreen />}
        {screenToShow === 'admin-register' && <AdminRegisterScreen />}
        {screenToShow === 'admin-dashboard' && <AdminDashboard />}
        {screenToShow === 'admin-drivers' && <DriversListScreen onBack={() => setCurrentScreen('admin-dashboard')} />}
        {screenToShow === 'admin-clients' && <ClientsListScreen />}
        {screenToShow === 'admin-financial-reports' && <FinancialReportsScreen />}
        {screenToShow === 'admin-promo-codes' && <PromoCodesScreen />}
        {screenToShow === 'admin-settings' && <SettingsScreen />}
        {screenToShow === 'admin-global-settings' && <GlobalSettingsScreen />}
        {screenToShow === 'admin-sms-settings' && <SMSSettingsScreen onBack={() => setCurrentScreen('admin-dashboard')} />}
        {screenToShow === 'admin-email-settings' && <EmailSettingsScreen onBack={() => setCurrentScreen('admin-dashboard')} />}
        {screenToShow === 'admin-email-history' && <EmailHistoryScreen onBack={() => setCurrentScreen('admin-dashboard')} />}
        {screenToShow === 'admin-notifications' && <AdminNotificationsCenter />}
        {screenToShow === 'admin-postpaid-requests' && <PostpaidRequestsScreen />}
        {screenToShow === 'admin-contact-messages' && <ContactMessagesScreen onBack={() => setCurrentScreen('admin-dashboard')} />}
        {screenToShow === 'admin-customer-support' && <CustomerSupportScreen />}
        {screenToShow === 'admin-marketing' && <MarketingCampaignsScreen />}
        {screenToShow === 'admin-refunds' && <RefundManagementScreen />}
        {screenToShow === 'admin-audit-logs' && <AuditLogsScreen />}
        {screenToShow === 'admin-backup' && <BackupAndRecoveryScreen />}
        {screenToShow === 'admin-analytics' && <AdvancedAnalyticsDashboard />}
        {screenToShow === 'admin-tools' && <AdminToolsScreen />}
        {screenToShow === 'admin-chat-messages' && <ChatMessagesScreen />}
        {screenToShow === 'admin-budget-dashboard' && <BudgetDashboard />}
        {screenToShow === 'data-cleanup' && <DataCleanupPanel />}
        {screenToShow === 'pending-recharges' && <PendingRechargesScreenNew />}
        {screenToShow === 'admin-pending-recharges' && <PendingRechargesScreenNew />}
        
        {/* Drivers list (alias) */}
        {screenToShow === 'drivers-list' && <DriversListScreen onBack={() => setCurrentScreen('admin-dashboard')} />}
        {screenToShow === 'clients-list' && <ClientsListScreen />}
        {screenToShow === 'contact-messages' && <ContactMessagesScreen onBack={() => setCurrentScreen('admin-dashboard')} />}
        {screenToShow === 'postpaid-requests' && <PostpaidRequestsScreen />}
        {screenToShow === 'refund-management' && <RefundManagementScreen />}
        {screenToShow === 'analytics-dashboard' && <AdminAnalyticsDashboard />}
        {screenToShow === 'financial-reports' && <FinancialReportsScreen />}
        {screenToShow === 'audit-logs' && <AuditLogsScreen />}
        {screenToShow === 'backup-and-recovery' && <BackupAndRecoveryScreen />}
        {screenToShow === 'sms-settings' && <SMSSettingsScreen onBack={() => setCurrentScreen('admin-dashboard')} />}
        {screenToShow === 'global-settings' && <GlobalSettingsScreen />}
        {screenToShow === 'admin-diagnostic' && <AdminDiagnostic />}
        {screenToShow === 'admin-users-management' && <UsersManagementScreen onBack={() => setCurrentScreen('admin-dashboard')} />}
        {screenToShow === 'admin-users-diagnostic' && <UsersDiagnosticScreen onBack={() => setCurrentScreen('admin-dashboard')} />}
        {screenToShow === 'admin-account-sync' && <AdminAccountSync />}
        {screenToShow === 'admin-sync' && <AdminAccountSync />}
        {screenToShow === 'cancellations' && <CancellationsScreen />}
      </div>
    </>
  );
}

// Error Boundary spécifique pour AdminApp
class AdminAppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  private mounted = false;

  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  componentDidMount() {
    this.mounted = true;
  }

  componentWillUnmount() {
    this.mounted = false;
  }

  static getDerivedStateFromError(error: Error) {
    console.error('❌ AdminApp - getDerivedStateFromError:', error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('❌ AdminApp Error:', error, errorInfo);
    console.error('❌ Stack:', error.stack);
    console.error('❌ Component Stack:', errorInfo?.componentStack);
    
    // 🔍 Détecter si c'est une erreur de module dynamique (chunk loading)
    const isDynamicImportError = 
      error.message?.includes('Failed to fetch dynamically imported module') ||
      error.message?.includes('error loading dynamically imported module') ||
      error.message?.includes('Loading chunk') ||
      error.message?.includes('ChunkLoadError');
    
    if (isDynamicImportError) {
      console.log('🔄 Erreur de chargement de module détectée - Rechargement automatique dans 500ms...');
      
      // ✅ RECHARGEMENT AUTOMATIQUE après un court délai (pour éviter les loops)
      setTimeout(() => {
        if (this.mounted) {
          window.location.reload();
        }
      }, 500);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
          <div className="max-w-md w-full mx-4 bg-white rounded-2xl shadow-xl p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Erreur Panel Admin</h1>
                <p className="text-sm text-gray-500">Une erreur s'est produite</p>
              </div>
            </div>
            
            <div className="mb-6 p-4 bg-red-50 rounded-lg border border-red-200">
              <p className="text-sm text-red-800 font-mono">
                {this.state.error?.message || 'Erreur inconnue'}
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.href = '/admin';
                }}
                className="w-full h-12 bg-cyan-500 hover:bg-cyan-600 text-white rounded-xl font-medium transition"
              >
                Réessayer
              </button>
              
              <button
                onClick={() => {
                  window.location.href = '/';
                }}
                className="w-full h-12 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition"
              >
                Retour à l'accueil
              </button>
            </div>

            <p className="text-xs text-gray-400 text-center mt-4">
              Si le problème persiste, vérifiez la console du navigateur
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export function AdminApp() {
  // Wrapper de sécurité pour attraper les erreurs au niveau root
  try {
    return (
      <AdminAppErrorBoundary>
        <div className="admin-app-container w-full h-full">
          <Routes>
            <Route path="/*" element={<AdminAppContent />} />
          </Routes>
        </div>
      </AdminAppErrorBoundary>
    );
  } catch (error) {
    console.error('❌ CRITICAL ERROR in AdminApp:', error);
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-md w-full mx-4 bg-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Erreur Critique</h1>
              <p className="text-sm text-gray-500">Une erreur est survenue au démarrage</p>
            </div>
          </div>
          
          <div className="mb-6 p-4 bg-red-50 rounded-lg border border-red-200">
            <p className="text-sm text-red-800 font-mono">
              {error instanceof Error ? error.message : 'Erreur inconnue'}
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => { window.location.href = '/admin'; }}
              className="w-full h-12 bg-cyan-500 hover:bg-cyan-600 text-white rounded-xl font-medium transition"
            >
              Réessayer
            </button>
            
            <button
              onClick={() => { window.location.href = '/'; }}
              className="w-full h-12 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition"
            >
              Retour à l'accueil
            </button>
          </div>
        </div>
      </div>
    );
  }
}
