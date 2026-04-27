import { motion } from '../../lib/motion';
import { useNavigate } from '../../lib/simple-router';
import { useState, useEffect, useCallback } from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { useAppState } from '../../hooks/useAppState';
import { useSupabaseData } from '../../hooks/useSupabaseData';
import { LiveStatsPanel } from '../LiveStatsPanel';
import { StatsCharts } from './StatsCharts';
import { ContactMessagesScreen } from './ContactMessagesScreen';
import { DataCleanupPanel } from './DataCleanupPanel';
import { AdminLiveFeed } from './AdminLiveFeed';
import { AutoCleanupBanner } from './AutoCleanupBanner';
import { AdminAnalyticsDashboard } from './AdminAnalyticsDashboard';
import { CancellationsScreen } from './CancellationsScreen';
import { SMSBalanceCard } from './SMSBalanceCard';
import { NotificationTester } from './NotificationTester';
import FCMTestPanel from './FCMTestPanel';
import { SMSInsufficientBalanceBanner } from './SMSInsufficientBalanceBanner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { supabase } from '../../lib/supabase';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { logError, isNetworkError } from '../../lib/error-utils';
import { 
  Users, 
  Car, 
  DollarSign, 
  TrendingUp,
  Star,
  Settings,
  Shield,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  UserPlus,
  Mail,
  Lock,
  User,
  Bell,
  CheckCircle,
  Wallet,
  Database,
  MessageSquare,
  Trash2,
  Wrench,
  MessageCircle,
  Receipt,
  Search,
  XCircle
} from '../../lib/admin-icons';
import { toast } from '../../lib/toast';
import { createAdminUser } from '../../lib/auth-service';

export function AdminDashboard() {
  console.log('🎯 AdminDashboard - RENDU DÉMARRE');
  
  const { state, setCurrentScreen, setCurrentView, setIsAdmin, setCurrentUser } = useAppState();
  const navigate = useNavigate();

  // 🌙 Dark mode — persisté dans localStorage
  const [isDark, setIsDark] = useState<boolean>(() => {
    try { return localStorage.getItem('smartcabb_dark_mode') === 'true'; } catch { return false; }
  });
  const toggleDark = () => {
    setIsDark(prev => {
      const next = !prev;
      try {
        localStorage.setItem('smartcabb_dark_mode', String(next));
        if (next) document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
      } catch {}
      return next;
    });
  };

  // ─── Live backend stats ────────────────────────────────────────────────────
  const [liveStats, setLiveStats] = useState<any>(null);
  const fetchLiveStats = useCallback(async () => {
    try {
      const resp = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/admin/stats`,
        { headers: { 'Authorization': `Bearer ${publicAnonKey}` } }
      );
      if (resp.ok) {
        const data = await resp.json();
        if (data.success) setLiveStats(data.stats);
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    fetchLiveStats();
    const interval = setInterval(fetchLiveStats, 15000);
    return () => clearInterval(interval);
  }, [fetchLiveStats]);

  // ✅ Vérification d'authentification au montage
  useEffect(() => {
    // Petit délai pour laisser l'état se charger depuis localStorage
    const timer = setTimeout(() => {
      console.log('🔐 Vérification authentification admin...', { 
        isAdmin: state.isAdmin, 
        hasUser: !!state.currentUser,
        currentScreen: state.currentScreen 
      });
      
      if (!state.isAdmin || !state.currentUser) {
        console.log('❌ Accès non autorisé - Redirection vers login');
        setCurrentScreen('admin-login');
        toast.error('Veuillez vous connecter pour accéder au dashboard');
      } else {
        console.log('✅ Authentification confirmée');
      }
    }, 100); // Petit délai de 100ms pour laisser l'état se charger
    
    return () => clearTimeout(timer);
  }, [state.isAdmin, state.currentUser, setCurrentScreen]); // ✅ FIX: Dépendances correctes

  const { 
    drivers, // EnrichedDriver[]
    rides,   // EnrichedRide[]
    getPassengers, 
    getStats, 
    loading, 
    error,
    refresh 
  } = useSupabaseData();

  console.log('🎯 AdminDashboard - Hook data:', { 
    driversCount: drivers?.length || 0, 
    ridesCount: rides?.length || 0, 
    loading, 
    error 
  });

  // Extraire le prénom de l'admin connecté
  const adminFirstName = state.currentUser?.full_name?.split(' ')[0] || state.currentUser?.name?.split(' ')[0] || state.currentUser?.email?.split('@')[0] || 'Admin';

  // État pour le modal d'ajout d'admin
  const [showAddAdminModal, setShowAddAdminModal] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [creatingAdmin, setCreatingAdmin] = useState(false);

  // État pour la suppression des comptes
  const [showDeleteAccountsModal, setShowDeleteAccountsModal] = useState(false);
  const [deletingAccounts, setDeletingAccounts] = useState(false);

  // État pour les notifications
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  // Charger les notifications
  useEffect(() => {
    loadNotifications();
    
    // Rafraîchir toutes les 30 secondes
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);
  
  // ✅ POLLING AUTOMATIQUE : Rafraîchir les données toutes les 60 secondes (1 minute)
  useEffect(() => {
    // Rafraîchir toutes les 60 secondes pour voir les nouveaux conducteurs
    const interval = setInterval(() => {
      console.log('🔄 Rafraîchissement automatique des données (1 min)...');
      refresh();
    }, 60000); // 60 secondes = 1 minute
    
    return () => clearInterval(interval);
  }, [refresh]);

  const loadNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        // Si la table n'existe pas, ne pas bloquer l'application
        if (error.code === 'PGRST116' || error.code === '42P01') {
          console.log('ℹ️ Table admin_notifications non trouvée (OK)');
          setNotifications([]);
          setUnreadCount(0);
          return;
        }
        throw error;
      }

      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.read).length || 0);
    } catch (error: any) {
      // Logger seulement les vraies erreurs (utilise error-utils)
      if (!isNetworkError(error)) {
        logError('Erreur chargement notifications', error);
      }
      
      // Ne pas bloquer l'app si les notifications ne chargent pas
      setNotifications([]);
      setUnreadCount(0);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase.rpc('mark_notification_as_read', {
        notification_id: notificationId
      });

      if (error) throw error;

      // Recharger les notifications
      await loadNotifications();
    } catch (error) {
      console.error('❌ Erreur marquage notification:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from('admin_notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('is_read', false);

      if (error) throw error;

      await loadNotifications();
      toast.success('Toutes les notifications sont marquées comme lues');
    } catch (error) {
      console.error('❌ Erreur:', error);
      toast.error('Erreur lors du marquage');
    }
  };

  // Obtenir les statistiques depuis Supabase
  const stats = getStats();
  const passengers = getPassengers();

  // KPI calculations — priorité aux stats live du backend
  // ✅ FIX: Courses actives = 'in_progress' ET 'started' (pour compatibilité)
  const activeRides    = liveStats?.activeRides   ?? rides.filter(r => r.status === 'in_progress' || r.status === 'started').length;
  const completedRides = rides.filter(r => r.status === 'completed');
  const onlineDrivers  = liveStats?.onlineDrivers ?? drivers.filter(d => d.is_available).length;
  const pendingDrivers = drivers.filter(d =>
    (d.status === 'pending' || !d.isApproved || d.isApproved === false)
  );
  const totalRevenue    = liveStats?.totalRevenueCDF ?? stats.totalRevenue;
  const revenueTodayCDF = liveStats?.revenueTodayCDF ?? 0;
  const cancelledToday  = liveStats?.cancelledToday  ?? 0;
  const averageRating   = liveStats?.averageRating   ?? (drivers.length > 0
    ? drivers.reduce((sum, d) => sum + (d.rating || 0), 0) / drivers.length
    : 0);

  // Fonction pour créer un nouvel admin
  const handleCreateAdmin = async () => {
    if (!newAdminEmail || !newAdminPassword || !newAdminName) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    setCreatingAdmin(true);
    
    const result = await createAdminUser({
      email: newAdminEmail,
      password: newAdminPassword,
      fullName: newAdminName
    });

    if (result.success) {
      toast.success(`Administrateur ${newAdminName} créé avec succès !`);
      setShowAddAdminModal(false);
      setNewAdminEmail('');
      setNewAdminPassword('');
      setNewAdminName('');
    } else {
      toast.error(result.error || 'Erreur lors de la création de l\'admin');
    }

    setCreatingAdmin(false);
  };

  // Fonction de diagnostic pour voir ce qu'il y a dans le KV store
  const handleDebugKV = async () => {
    try {
      console.log('🔍 Diagnostic du KV store...');

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/debug-kv`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );

      const result = await response.json();

      if (result.success) {
        console.log('📊 DIAGNOSTIC KV STORE:', result);
        console.table(result.summary);
        console.log('👤 Profils:', result.data.profiles);
        console.log('🚗 Conducteurs:', result.data.drivers);
        console.log('🚕 Courses:', result.data.rides);
        
        toast.success(`KV Store: ${result.summary.total} entrées (voir console F12)`);
      } else {
        toast.error(result.error || 'Erreur diagnostic');
      }
    } catch (error) {
      console.error('❌ Erreur diagnostic:', error);
      toast.error('Erreur lors du diagnostic');
    }
  };

  // 🔍 NOUVELLE FONCTION: Diagnostic détaillé des conducteurs
  const handleDebugDrivers = async () => {
    try {
      console.log('🔍 🚗 Diagnostic détaillé des conducteurs...');

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/debug/drivers`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );

      const result = await response.json();

      if (result.success) {
        console.log('📊 DIAGNOSTIC CONDUCTEURS DÉTAILLÉ:', result);
        console.log('📋 Nombre total:', result.count);
        console.log('📋 Liste des conducteurs:');
        console.table(result.drivers);
        console.log('📋 Données brutes complètes:', result.raw_drivers);
        
        // Compter les statuts
        const pending = result.drivers.filter((d: any) => d.status === 'pending').length;
        const approved = result.drivers.filter((d: any) => d.status === 'approved' || d.is_approved).length;
        const rejected = result.drivers.filter((d: any) => d.status === 'rejected').length;
        
        console.log(`📊 STATUTS: ${pending} pending, ${approved} approved, ${rejected} rejected`);
        
        toast.success(`🚗 ${result.count} conducteur(s) trouvé(s)`, {
          description: `${pending} en attente, ${approved} approuvés (voir console F12)`
        });
      } else {
        toast.error(result.error || 'Erreur diagnostic');
      }
    } catch (error) {
      console.error('❌ Erreur diagnostic conducteurs:', error);
      toast.error('Erreur lors du diagnostic');
    }
  };

  // 🔍 DIAGNOSTIC COMPLET: Auth + KV + Routes
  const handleFullDiagnostic = async () => {
    try {
      console.log('🔍🔍🔍 DIAGNOSTIC COMPLET...');
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/debug/full-diagnostic`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );

      const result = await response.json();

      if (result.success) {
        const d = result.diagnostic;
        console.log('╔══════════════════════════════════════╗');
        console.log('║   🔍 DIAGNOSTIC COMPLET             ║');
        console.log('╠══════════════════════════════════════╣');
        console.log(`║ Auth: ${d.auth.drivers} conducteurs`);
        console.log(`║ KV: ${d.kv.drivers} conducteurs`);
        console.log(`║ ${d.summary}`);
        console.log('╚══════════════════════════════════════╝');
        console.log('\n📋 Conducteurs Auth:');
        console.table(d.driversAuth);
        console.log('\n📦 Conducteurs KV:');
        console.table(d.driversKV);
        
        toast.success('Diagnostic terminé', {
          description: `Auth: ${d.auth.drivers}, KV: ${d.kv.drivers} (voir console F12)`
        });
      } else {
        toast.error(result.error || 'Erreur');
      }
    } catch (error) {
      console.error('❌ Erreur:', error);
      toast.error('Erreur diagnostic');
    }
  };

  // 🔄 NOUVELLE FONCTION: Synchroniser les conducteurs depuis Auth vers KV
  const handleSyncDrivers = async () => {
    try {
      console.log('🔄 Synchronisation conducteurs Auth → KV...');
      toast.info('Synchronisation en cours...');

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/admin/sync-drivers`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );

      const result = await response.json();

      if (result.success) {
        console.log('✅ SYNCHRONISATION TERMINÉE:', result);
        toast.success(`✅ Synchronisation réussie !`, {
          description: `${result.synced} conducteur(s) ajouté(s), ${result.skipped} déjà existant(s)`
        });
        
        // Rafraîchir les données
        refresh();
      } else {
        toast.error(result.error || 'Erreur synchronisation');
      }
    } catch (error) {
      console.error('❌ Erreur synchronisation:', error);
      toast.error('Erreur lors de la synchronisation');
    }
  };

  // 🔍 NOUVELLE FONCTION: Prévisualiser les données de test qui seront supprimées
  const handlePreviewTestData = async () => {
    try {
      console.log('🔍 Prévisualisation des données de test...');

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/cleanup/test-data/preview`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );

      const result = await response.json();

      if (result.success) {
        console.log('📊 PRÉVISUALISATION NETTOYAGE:', result.preview);
        console.log('🗑️ PASSAGERS À SUPPRIMER:', result.preview.passengers.to_delete);
        console.table(result.preview.passengers.list_to_delete);
        console.log('✅ PASSAGERS À CONSERVER:', result.preview.passengers.to_keep);
        console.table(result.preview.passengers.list_to_keep);
        console.log('🗑️ CONDUCTEURS À SUPPRIMER:', result.preview.drivers.to_delete);
        console.table(result.preview.drivers.list_to_delete);
        console.log('✅ CONDUCTEURS À CONSERVER:', result.preview.drivers.to_keep);
        console.table(result.preview.drivers.list_to_keep);
        
        toast.success(`Prévisualisation terminée (voir console F12)`, {
          description: `${result.preview.passengers.to_delete} passagers et ${result.preview.drivers.to_delete} conducteurs seront supprimés`
        });
      } else {
        toast.error(result.error || 'Erreur prévisualisation');
      }
    } catch (error) {
      console.error('❌ Erreur prévisualisation:', error);
      toast.error('Erreur lors de la prévisualisation');
    }
  };

  // 🧹 NOUVELLE FONCTION: Nettoyer toutes les données de test
  const handleCleanTestData = async () => {
    if (!confirm('⚠️ ATTENTION !\n\nCette action va supprimer TOUTES les données de test :\n- Passagers avec "Client N/A", "Non renseigné"\n- Conducteurs "Conducteur inconnu"\n- Courses orphelines\n- Emails @smartcabb.app\n\nCette action est IRRÉVERSIBLE.\n\nContinuer ?')) {
      return;
    }

    try {
      console.log('🧹 Nettoyage des données de test...');
      toast.info('Nettoyage en cours...', { duration: 2000 });

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/cleanup/test-data`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const result = await response.json();

      if (result.success) {
        console.log('✅ NETTOYAGE TERMINÉ:', result);
        console.log('📊 Statistiques:', result.stats);
        
        toast.success(result.message, {
          description: `${result.stats.passengers_deleted} passagers, ${result.stats.drivers_deleted} conducteurs, ${result.stats.rides_deleted} courses supprimés`
        });

        // Rafraîchir les données
        await refresh();
      } else {
        toast.error(result.error || 'Erreur lors du nettoyage');
      }
    } catch (error) {
      console.error('❌ Erreur nettoyage:', error);
      toast.error('Erreur lors du nettoyage des données de test');
    }
  };

  // Fonction pour supprimer tous les passagers et conducteurs
  const handleDeleteAllAccounts = async () => {
    setDeletingAccounts(true);
    
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/admin/delete-all-accounts`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();

      if (data.success) {
        toast.success(data.message || 'Tous les comptes ont été supprimés avec succès');
        setShowDeleteAccountsModal(false);
        refresh(); // Rafraîchir les données
      } else {
        toast.error(data.error || 'Erreur lors de la suppression des comptes');
      }
    } catch (error) {
      console.error('Erreur lors de la suppression des comptes:', error);
      toast.error('Erreur lors de la suppression des comptes');
    } finally {
      setDeletingAccounts(false);
    }
  };

  // 🔧 Fonction pour migrer tous les profils avec le bon préfixe
  const handleMigrateProfiles = async () => {
    try {
      toast.info('🔧 Migration en cours...');
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/migration/fix-prefixes`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();

      if (data.success) {
        toast.success(`✅ Migration réussie ! ${data.migrated} profil(s) migré(s)`);
        console.log('📊 Détails migration:', data);
        refresh(); // Rafraîchir les données
      } else {
        toast.error(data.error || 'Erreur lors de la migration');
      }
    } catch (error) {
      console.error('Erreur lors de la migration:', error);
      toast.error('Erreur lors de la migration des profils');
    }
  };

  // Fonction pour nettoyer les auth users orphelins
  const handleCleanupAuthUsers = async () => {
    if (!confirm('Êtes-vous sûr de vouloir nettoyer tous les utilisateurs auth orphelins (sauf les admins) ?')) {
      return;
    }

    setDeletingAccounts(true);
    
    try {
      console.log('🧹 Nettoyage des auth users orphelins...');

      // Appeler l'API backend
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/cleanup-auth-users`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Erreur lors du nettoyage');
      }

      console.log('✅ Résultat:', result);

      toast.success(result.message, {
        description: `${result.details.deleted} utilisateurs supprimés, ${result.details.kept} admins conservés.`
      });

    } catch (error) {
      console.error('❌ Erreur lors du nettoyage:', error);
      toast.error('Erreur lors du nettoyage des auth users');
    } finally {
      setDeletingAccounts(false);
    }
  };

  // 🔄 NOUVELLE FONCTION : Migrer les conducteurs de Postgres vers KV store
  const handleMigrateDriversToKV = async () => {
    if (!confirm('Voulez-vous synchroniser les conducteurs de Postgres vers le KV store ? Cela ne supprimera aucune donnée.')) {
      return;
    }

    setDeletingAccounts(true); // Réutiliser cet état pour le loading
    
    try {
      console.log('🔄 Migration des conducteurs Postgres → KV store...');

      // Appeler la nouvelle route de migration
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/admin/migrate-drivers-to-kv`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Erreur lors de la migration');
      }

      console.log('✅ Résultat migration:', result);

      // Afficher les stats de migration
      const stats = result.stats;
      toast.success(result.message, {
        description: `${stats.migrated} conducteur(s) migré(s), ${stats.skipped} déjà présent(s). Total KV: ${stats.kv_total_after}`
      });

      // Rafraîchir les données pour afficher les conducteurs
      await refresh();

    } catch (error) {
      console.error('❌ Erreur lors de la migration:', error);
      toast.error('Erreur lors de la migration des conducteurs');
    } finally {
      setDeletingAccounts(false);
    }
  };

  const statCards = [
    {
      id: 'stat-active-rides',
      title: 'Courses actives',
      value: activeRides.toString(),
      icon: TrendingUp,
      color: 'bg-blue-500',
      subtitle: liveStats ? '🟢 temps réel' : undefined,
    },
    {
      id: 'stat-online-drivers',
      title: 'Chauffeurs en ligne',
      value: `${onlineDrivers}/${liveStats?.totalDrivers ?? drivers.length}`,
      icon: Car,
      color: 'bg-green-500',
      subtitle: `${liveStats?.pendingDrivers ?? pendingDrivers.length} en attente`,
    },
    {
      id: 'stat-revenue-today',
      title: "Revenus aujourd'hui",
      value: `${Math.round(revenueTodayCDF).toLocaleString('fr-FR')} FC`,
      icon: DollarSign,
      color: 'bg-emerald-500',
      subtitle: `Total: ${Math.round(totalRevenue).toLocaleString('fr-FR')} FC`,
    },
    {
      id: 'stat-cancelled-today',
      title: "Annulations aujourd'hui",
      value: cancelledToday.toString(),
      icon: XCircle,
      color: cancelledToday > 0 ? 'bg-red-500' : 'bg-gray-400',
      subtitle: `${liveStats?.cancelledRides ?? 0} total`,
    },
    {
      id: 'stat-total-passengers',
      title: 'Passagers inscrits',
      value: (liveStats?.totalPassengers ?? passengers.length).toString(),
      icon: Users,
      color: 'bg-purple-500',
    },
    {
      id: 'stat-total-rides',
      title: 'Courses totales',
      value: (liveStats?.totalRides ?? rides.length).toString(),
      icon: TrendingUp,
      color: 'bg-indigo-500',
      subtitle: `${liveStats?.completedRides ?? 0} terminées`,
    },
    {
      id: 'stat-average-rating',
      title: 'Note moyenne',
      value: (averageRating || 0).toFixed(1),
      icon: Star,
      color: 'bg-yellow-500',
    },
  ];

  const quickActions = [
    {
      id: 'action-pending-drivers',
      title: 'Candidatures en attente',
      description: `${pendingDrivers.length} conducteur(s) à approuver`,
      icon: AlertCircle,
      action: () => setCurrentScreen('drivers-list'),
      count: pendingDrivers.length,
      highlight: pendingDrivers.length > 0,
      urgent: pendingDrivers.length > 0
    },
    {
      id: 'action-drivers',
      title: 'Gestion des chauffeurs',
      description: 'Voir et gérer tous les chauffeurs',
      icon: Car,
      action: () => setCurrentScreen('drivers-list'),
      count: drivers.length
    },
    {
      id: 'action-clients',
      title: 'Gestion des clients',
      description: 'Base de données clients',
      icon: Users,
      action: () => setCurrentScreen('clients-list'),
      count: passengers.length
    },
    {
      id: 'action-users-management',
      title: 'Tous les utilisateurs (avec mots de passe)',
      description: 'Voir tous les comptes avec identifiants',
      icon: Database,
      action: () => setCurrentScreen('admin-users-management'),
      count: null,
      highlight: true,
      color: 'from-purple-500 to-indigo-500'
    },
    {
      id: 'action-contact-messages',
      title: 'Messages de contact',
      description: 'Messages du site web',
      icon: MessageSquare,
      action: () => setCurrentScreen('contact-messages'),
      count: null,
      highlight: true,
      color: 'from-pink-500 to-rose-500'
    },
    {
      id: 'action-chat-messages',
      title: 'Messages du Chat Client',
      description: 'Répondre aux visiteurs en temps réel',
      icon: MessageCircle,
      action: () => setCurrentScreen('admin-chat-messages'),
      count: null,
      highlight: true,
      color: 'from-cyan-500 to-blue-500'
    },
    {
      id: 'action-budget',
      title: 'Budget & Coûts',
      description: 'Domaine, API et analyse des coûts',
      icon: Receipt,
      action: () => setCurrentScreen('admin-budget-dashboard'),
      count: null,
      highlight: true,
      color: 'from-green-500 to-teal-500'
    },
    {
      id: 'action-add-admin',
      title: 'Ajouter un autre admin',
      description: 'Créer un nouveau compte administrateur',
      icon: UserPlus,
      action: () => setShowAddAdminModal(true),
      count: null,
      highlight: false
    },
    {
      id: 'action-postpaid',
      title: 'Demandes de Post-Paiement',
      description: 'Approuver les paiements différés',
      icon: DollarSign,
      action: () => setCurrentScreen('postpaid-requests'),
      count: null,
      color: 'from-orange-500 to-amber-500'
    },
    {
      id: 'action-refunds',
      title: 'Gestion des remboursements',
      description: 'Traiter les demandes de remboursement',
      icon: Wallet,
      action: () => setCurrentScreen('refund-management'),
      count: null,
      color: 'from-red-500 to-pink-500'
    },
    {
      id: 'action-pending-recharges',
      title: 'Recharges espèces en attente',
      description: 'Valider les paiements en espèces',
      icon: Receipt,
      action: () => setCurrentScreen('pending-recharges'),
      count: null,
      color: 'from-orange-500 to-yellow-500'
    },
    {
      id: 'action-analytics',
      title: 'Dashboard analytique',
      description: 'Graphiques et statistiques avancées',
      icon: TrendingUp,
      action: () => setCurrentScreen('analytics-dashboard'),
      count: null,
      color: 'from-blue-500 to-cyan-500'
    },
    {
      id: 'action-cancellations',
      title: '🚫 Historique des annulations',
      description: 'Voir toutes les annulations avec raisons',
      icon: XCircle,
      action: () => setCurrentScreen('cancellations'),
      count: null,
      highlight: true,
      color: 'from-red-500 to-orange-500'
    },
    {
      id: 'action-financial-reports',
      title: 'Rapports financiers',
      description: 'Générer et consulter les rapports',
      icon: DollarSign,
      action: () => setCurrentScreen('financial-reports'),
      count: null,
      color: 'from-green-500 to-emerald-500'
    },
    {
      id: 'action-audit-logs',
      title: 'Logs d\'audit',
      description: 'Traçabilité des actions admin',
      icon: Shield,
      action: () => setCurrentScreen('audit-logs'),
      count: null,
      color: 'from-purple-500 to-violet-500'
    },
    {
      id: 'action-notifications',
      title: 'Centre de notifications',
      description: 'Alertes et notifications importantes',
      icon: Bell,
      action: () => setCurrentScreen('admin-notifications'),
      count: unreadCount,
      highlight: unreadCount > 0,
      urgent: unreadCount > 0,
      color: 'from-yellow-500 to-orange-500'
    },
    {
      id: 'action-settings',
      title: 'Paramètres du système',
      description: 'Configuration et tarifs',
      icon: Settings,
      action: () => setCurrentScreen('admin-settings'),
      count: null
    },
    {
      id: 'action-global-settings',
      title: 'Paramètres Globaux',
      description: 'Taux, tarification, paiements',
      icon: Settings,
      action: () => setCurrentScreen('global-settings'),
      count: null,
      highlight: true,
      color: 'from-indigo-500 to-blue-500'
    },
    {
      id: 'action-email-config',
      title: '📧 Configuration Email',
      description: 'Gérer l\'envoi et réception d\'emails',
      icon: Mail,
      action: () => setCurrentScreen('admin-email-settings'),
      count: null,
      highlight: true,
      color: 'from-green-500 to-emerald-500'
    },
    {
      id: 'action-email-history',
      title: '📨 Historique Emails',
      description: 'Voir les emails envoyés',
      icon: Mail,
      action: () => setCurrentScreen('admin-email-history'),
      count: null,
      color: 'from-green-400 to-cyan-400'
    },
    {
      id: 'action-debug-kv',
      title: '🔍 Diagnostic KV Store',
      description: 'Voir le contenu de la base de données (console F12)',
      icon: Search,
      action: handleDebugKV,
      count: null,
      highlight: true,
      color: 'from-gray-500 to-slate-500'
    },
    {
      id: 'action-debug-drivers',
      title: '🔍 Diagnostic Conducteurs',
      description: 'Voir les détails des conducteurs (console F12)',
      icon: Car,
      action: handleDebugDrivers,
      count: null,
      highlight: true,
      color: 'from-blue-500 to-indigo-500'
    },
    {
      id: 'action-full-diagnostic',
      title: '🔍🔍🔍 DIAGNOSTIC COMPLET',
      description: 'Auth vs KV vs Routes (console F12)',
      icon: Search,
      action: handleFullDiagnostic,
      count: null,
      highlight: true,
      color: 'from-red-500 to-pink-500'
    },
    {
      id: 'action-sms-settings',
      title: 'Paramètres SMS',
      description: 'Configuration Africa\'s Talking SMS',
      icon: MessageSquare,
      action: () => setCurrentScreen('sms-settings'),
      count: null,
      color: 'from-blue-500 to-indigo-500'
    },
    {
      id: 'action-backup',
      title: 'Backup & Recovery',
      description: 'Sauvegarde et récupération des données',
      icon: Database,
      action: () => setCurrentScreen('backup-and-recovery'),
      count: null,
      highlight: true,
      color: 'from-cyan-500 to-teal-500'
    },
    {
      id: 'action-maintenance',
      title: '🔧 Outils de maintenance',
      description: 'Nettoyer auth users & autres tâches',
      icon: Wrench,
      action: () => setCurrentScreen('admin-tools'),
      count: null,
      highlight: true,
      color: 'from-gray-500 to-gray-700'
    },
    {
      id: 'action-data-cleanup',
      title: '🧹 Nettoyage des données',
      description: 'Préparer pour tests avec vraies données',
      icon: Database,
      action: () => setCurrentScreen('data-cleanup'),
      count: null,
      highlight: true,
      color: 'from-orange-500 to-red-500'
    },
    {
      id: 'action-preview-test-data',
      title: '🔍 Prévisualiser les données de test',
      description: 'Voir les données qui seront supprimées',
      icon: Search,
      action: handlePreviewTestData,
      count: null,
      highlight: true,
      color: 'from-gray-500 to-slate-500'
    },
    {
      id: 'action-clean-test-data',
      title: '🧹 Nettoyer les données de test',
      description: 'Supprimer les données de test',
      icon: Trash2,
      action: handleCleanTestData,
      count: null,
      highlight: true,
      color: 'from-red-500 to-pink-500'
    },
    {
      id: 'action-migrate-drivers-to-kv',
      title: '🔄 Migrer conducteurs vers KV',
      description: 'Synchroniser les conducteurs de Postgres vers le KV store',
      icon: Database,
      action: handleMigrateDriversToKV,
      count: null,
      highlight: true,
      color: 'from-blue-500 to-indigo-500'
    },
    {
      id: 'action-sync-drivers-auth-kv',
      title: '🔄 Sync Auth → KV',
      description: 'Synchroniser les conducteurs depuis Auth vers KV',
      icon: RefreshCw,
      action: handleSyncDrivers,
      count: null,
      highlight: true,
      color: 'from-green-500 to-emerald-500'
    },
    {
      id: 'action-migrate-profiles',
      title: '🔧 Migrer profils',
      description: 'Corriger les préfixes des profils',
      icon: Database,
      action: handleMigrateProfiles,
      count: null,
      highlight: true,
      color: 'from-blue-500 to-indigo-500'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <Shield className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl">Bienvenue {adminFirstName} 👋</h1>
                <p className="text-xs sm:text-sm text-gray-600">Administration générale</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-3 w-full sm:w-auto">
              {/* 🌙 Dark mode toggle */}
              <button
                onClick={toggleDark}
                title={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700 flex-shrink-0"
              >
                <span className="text-base leading-none">{isDark ? '☀️' : '🌙'}</span>
                <span className="hidden sm:inline">{isDark ? 'Clair' : 'Sombre'}</span>
              </button>
              <Button
                onClick={refresh}
                variant="outline"
                className="text-blue-600 border-blue-200 hover:bg-blue-50 flex-1 sm:flex-initial text-sm"
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 sm:mr-2 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{loading ? 'Chargement...' : 'Actualiser'}</span>
              </Button>
              <Button
                onClick={async () => {
                  console.log('🚪 Déconnexion de l\'admin');
                  
                  // ✅ Détruire la session Supabase (sécurité)
                  try {
                    await supabase.auth.signOut();
                    console.log('✅ Session Supabase détruite');
                  } catch (error) {
                    console.error('❌ Erreur destruction session:', error);
                  }
                  
                  setCurrentUser(null);
                  setCurrentView(null);
                  setIsAdmin(false);
                  // Rediriger vers la page d'accueil (qui affiche maintenant le LandingScreen)
                  navigate('/');
                  toast.success('Déconnexion réussie');
                }}
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50 flex-1 sm:flex-initial text-sm"
              >
                Déconnexion
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <RefreshCw className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Chargement des données depuis Supabase...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-red-600 mr-3 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-900 mb-1">Erreur de chargement</h3>
                <p className="text-sm text-red-700">{error}</p>
                <Button
                  onClick={refresh}
                  variant="outline"
                  size="sm"
                  className="mt-3 text-red-600 border-red-300 hover:bg-red-100"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Réessayer
                </Button>
              </div>
            </div>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* ⚠️ Bannière d'alerte SMS insuffisant */}
            <SMSInsufficientBalanceBanner />
            
            {/* Panel de notifications */}
            {showNotifications && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6"
              >
                <Card className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold flex items-center">
                      <Bell className="w-5 h-5 mr-2 text-blue-600" />
                      Notifications récentes
                    </h3>
                    {unreadCount > 0 && (
                      <Button
                        onClick={markAllAsRead}
                        variant="ghost"
                        size="sm"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Tout marquer comme lu
                      </Button>
                    )}
                  </div>
                  
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="text-gray-500 text-center py-4">
                        Aucune notification
                      </p>
                    ) : (
                      notifications.map((notif) => (
                        <Card
                          key={notif.id}
                          className={`p-3 cursor-pointer transition-all ${
                            notif.read ? 'bg-gray-50' : 'bg-blue-50 border-blue-200'
                          }`}
                          onClick={() => !notif.read && markAsRead(notif.id)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-3 flex-1">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                notif.type === 'wallet_recharge' ? 'bg-green-100' : 'bg-blue-100'
                              }`}>
                                {notif.type === 'wallet_recharge' ? (
                                  <Wallet className="w-5 h-5 text-green-600" />
                                ) : (
                                  <Bell className="w-5 h-5 text-blue-600" />
                                )}
                              </div>
                              <div className="flex-1">
                                <p className="font-semibold text-sm">{notif.title}</p>
                                <p className="text-sm text-gray-600 mt-1">{notif.message}</p>
                                {notif.amount && (
                                  <p className="text-sm font-semibold text-green-600 mt-1">
                                    💰 {notif.amount.toLocaleString()} CDF
                                  </p>
                                )}
                                <p className="text-xs text-gray-400 mt-2">
                                  {new Date(notif.created_at).toLocaleString('fr-FR')}
                                </p>
                              </div>
                            </div>
                            {!notif.read && (
                              <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                            )}
                          </div>
                        </Card>
                      ))
                    )}
                  </div>
                </Card>
              </motion.div>
            )}

            {/* Statistiques en temps réel */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Statistiques en temps réel</h2>
              <LiveStatsPanel />
            </motion.div>

            {/* Graphiques statistiques */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mb-8"
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Analyse des performances</h2>
              <StatsCharts />
            </motion.div>

            {/* Balance SMS */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mb-8"
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Balance SMS Africa's Talking</h2>
              <SMSBalanceCard />
            </motion.div>

            {/* Stats Grid — Live Backend */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">KPIs en direct</h2>
                {liveStats && (
                  <span className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 border border-green-200 rounded-full px-2.5 py-1">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                    Mise à jour auto (15s)
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3 sm:gap-4">
                {statCards.map((stat, index) => {
                  const Icon = stat.icon;
                  return (
                    <motion.div
                      key={stat.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card className="p-3 sm:p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-500 mb-1 leading-tight">{stat.title}</p>
                            <p className="text-base sm:text-lg font-bold text-gray-900 truncate">{stat.value}</p>
                            {(stat as any).subtitle && (
                              <p className="text-xs text-gray-400 mt-0.5 truncate">{(stat as any).subtitle}</p>
                            )}
                          </div>
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${stat.color}`}>
                            <Icon className="w-4 h-4 text-white" />
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>

            {/* Flux d'activité en temps réel */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="mb-8"
            >
              <Card className="p-4 sm:p-6">
                <AdminLiveFeed limit={25} pollInterval={10000} showHeader />
              </Card>
            </motion.div>

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mb-8"
            >
              <h2 className="text-lg sm:text-xl mb-4 sm:mb-6">Actions rapides</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {quickActions.map((action, index) => {
                  const Icon = action.icon;
                  return (
                    <motion.div
                      key={action.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 + index * 0.1 }}
                    >
                      <Card 
                        className={`p-6 hover:shadow-lg transition-shadow cursor-pointer ${
                          action.highlight ? 'border-2 border-purple-300 bg-purple-50' : ''
                        }`}
                        onClick={action.action}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                            action.highlight ? 'bg-purple-600' : 'bg-gray-100'
                          }`}>
                            <Icon className={`w-6 h-6 ${action.highlight ? 'text-white' : 'text-gray-600'}`} />
                          </div>
                          {action.count !== null && action.count !== undefined && (
                            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                              {action.count}
                            </span>
                          )}
                        </div>
                        <h3 className="font-semibold mb-2">{action.title}</h3>
                        <p className="text-sm text-gray-600 mb-4">{action.description}</p>
                        <div className={`flex items-center text-sm ${
                          action.highlight ? 'text-purple-600' : 'text-blue-600'
                        }`}>
                          <span>Accéder</span>
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </div>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>

            {/* 🔔 Testeur de Notifications Sonores */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="mb-8"
            >
              <h2 className="text-lg sm:text-xl mb-4 sm:mb-6">🔔 Testeur de Notifications</h2>
              <NotificationTester />
            </motion.div>

            {/* Testeur de FCM */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="mb-8"
            >
              <h2 className="text-lg sm:text-xl mb-4 sm:mb-6">🔔 Testeur de FCM</h2>
              <FCMTestPanel />
            </motion.div>

            {/* Recent Activity */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-6"
            >
              {/* Active Rides */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg">Courses en cours</h3>
                  <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                    {activeRides} actives
                  </span>
                </div>
                <div className="space-y-4">
                  {rides.filter(r => r.status === 'started').slice(0, 3).map((ride) => (
                    <div key={ride.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        <div>
                          <p className="text-sm font-medium">Course #{ride.id?.slice(-4) || 'N/A'}</p>
                          <p className="text-xs text-gray-600">{ride.pickup.address}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{ride.estimatedPrice.toLocaleString()} CDF</p>
                        <p className="text-xs text-gray-500">{ride.estimatedDuration} min</p>
                      </div>
                    </div>
                  ))}
                  {activeRides === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">Aucune course active</p>
                  )}
                </div>
              </Card>

              {/* Driver Status */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg">État des chauffeurs</h3>
                  <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                    {onlineDrivers}/{drivers.length} en ligne
                  </span>
                </div>
                <div className="space-y-4">
                  {drivers.slice(0, 3).map((driver) => (
                    <div key={driver.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${driver.is_available ? 'bg-green-500' : 'bg-gray-400'}`} />
                        <div>
                          <p className="text-sm font-medium">{driver.full_name}</p>
                          <p className="text-xs text-gray-600">{driver.vehicle_make} {driver.vehicle_model}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center space-x-1">
                          <Star className="w-3 h-3 text-yellow-500 fill-current" />
                          <span className="text-sm">{(driver.rating || 0).toFixed(1)}</span>
                        </div>
                        <p className="text-xs text-gray-500">{driver.total_rides} courses</p>
                      </div>
                    </div>
                  ))}
                  {drivers.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">Aucun chauffeur enregistré</p>
                  )}
                </div>
              </Card>
            </motion.div>
          </>
        )}

        {/* 🧹 Bannière de nettoyage rapide - DÉPLACÉE EN BAS */}
        {!loading && !error && (
          <div className="mt-8">
            <AutoCleanupBanner onCleanupComplete={refresh} />
          </div>
        )}
      </div>

      {/* Modal pour ajouter un admin */}
      <Dialog open={showAddAdminModal} onOpenChange={setShowAddAdminModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-purple-600" />
              </div>
              <span>Ajouter un nouvel administrateur</span>
            </DialogTitle>
            <DialogDescription>
              Créez un nouveau compte administrateur pour gérer SmartCabb
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="admin-name">Nom complet</Label>
              <div className="relative mt-2">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="admin-name"
                  type="text"
                  placeholder="Jean Kalala"
                  value={newAdminName}
                  onChange={(e) => setNewAdminName(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="admin-email">Email</Label>
              <div className="relative mt-2">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="admin-email"
                  type="email"
                  placeholder="admin@smartcabb.cd"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="admin-password">Mot de passe</Label>
              <div className="relative mt-2">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="admin-password"
                  type="password"
                  placeholder="••••••••"
                  value={newAdminPassword}
                  onChange={(e) => setNewAdminPassword(e.target.value)}
                  className="pl-10"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Minimum 6 caractères</p>
            </div>

            <div className="flex space-x-3 mt-6">
              <Button
                onClick={() => setShowAddAdminModal(false)}
                variant="outline"
                className="flex-1"
                disabled={creatingAdmin}
              >
                Annuler
              </Button>
              <Button
                onClick={handleCreateAdmin}
                className="flex-1 bg-purple-600 hover:bg-purple-700"
                disabled={creatingAdmin}
              >
                {creatingAdmin ? 'Création...' : 'Créer l\'admin'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal pour supprimer tous les comptes passagers/conducteurs */}
      <Dialog open={showDeleteAccountsModal} onOpenChange={setShowDeleteAccountsModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <span>Supprimer tous les comptes</span>
            </DialogTitle>
            <DialogDescription>
              ⚠️ Attention : Cette action est irréversible !
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-semibold text-red-900 mb-2">Cette action va supprimer :</h4>
              <ul className="space-y-1 text-sm text-red-700">
                <li>• {passengers.length} compte(s) passager(s)</li>
                <li>• {drivers.length} compte(s) conducteur(s)</li>
                <li className="font-semibold text-green-700 mt-2">✓ Les comptes administrateurs seront conservés</li>
              </ul>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>Total :</strong> {drivers.length + passengers.length} comptes seront supprimés définitivement.
              </p>
            </div>

            <p className="text-sm text-gray-600">
              Cette action supprimera tous les profils passagers et conducteurs de la base de données. 
              Les courses et autres données associées seront également affectées.
            </p>

            <div className="flex space-x-3 mt-6">
              <Button
                onClick={() => setShowDeleteAccountsModal(false)}
                variant="outline"
                className="flex-1"
                disabled={deletingAccounts}
              >
                Annuler
              </Button>
              <Button
                onClick={handleDeleteAllAccounts}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                disabled={deletingAccounts}
              >
                {deletingAccounts ? (
                  <div className="flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Suppression...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <Trash2 className="w-4 h-4" />
                    <span>Confirmer la suppression</span>
                  </div>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
