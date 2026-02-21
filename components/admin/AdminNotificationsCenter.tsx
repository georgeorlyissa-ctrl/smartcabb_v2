import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from '../../lib/toast';
import { useAppState } from '../../hooks/useAppState';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { motion, AnimatePresence } from '../../lib/motion';
import { 
  ArrowLeft, 
  Bell, 
  Settings, 
  Trash2, 
  Eye, 
  Info, 
  CheckCircle 
} from '../../lib/icons';

// Fonction de formatage de date simple
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Admin Notifications Center - Centre de gestion des notifications administrateur
interface AdminNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  is_read: boolean;
  action_url?: string;
  data?: any;
  created_at: string;
}

interface NotificationSettings {
  emergency_alerts: boolean;
  new_driver_registrations: boolean;
  refund_requests: boolean;
  high_value_rides: boolean;
  system_errors: boolean;
  low_driver_availability: boolean;
  daily_summary: boolean;
}

interface AdminNotificationsCenterProps {
  onBack?: () => void;
}

export function AdminNotificationsCenter({ onBack }: AdminNotificationsCenterProps) {
  const { setCurrentScreen } = useAppState();
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'urgent'>('all');
  const [settings, setSettings] = useState<NotificationSettings>({
    emergency_alerts: true,
    new_driver_registrations: true,
    refund_requests: true,
    high_value_rides: false,
    system_errors: true,
    low_driver_availability: true,
    daily_summary: true
  });
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    loadNotifications();
    loadSettings();

    const channel = supabase
      .channel('admin-notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'admin_notifications'
      }, (payload) => {
        const newNotif = payload.new as AdminNotification;
        setNotifications(prev => [newNotif, ...prev]);

        if (newNotif.priority === 'urgent') {
          toast.error(newNotif.title, {
            description: newNotif.message,
            duration: 10000
          });
          playNotificationSound();
        }
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('admin_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        if (error.code === 'PGRST204' || error.code === 'PGRST205' || error.message?.includes('does not exist')) {
          console.log('ℹ️ Table admin_notifications non trouvée - fonctionnalité désactivée');
          setNotifications([]);
          setLoading(false);
          return;
        }
        throw error;
      }
      setNotifications(data || []);
    } catch (error: any) {
      const isNetworkError = error.message?.includes('Failed to fetch') || 
                            error.message?.includes('Network request failed');
      if (!isNetworkError) {
        console.error('Erreur chargement notifications:', error);
        toast.error('Erreur de chargement des notifications');
      } else {
        console.warn('⚠️ Impossible de charger les notifications (mode prévisualisation)');
      }
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user?.id) {
        console.log('ℹ️ Utilisateur non connecté - paramètres par défaut');
        return;
      }
      
      const { data, error } = await supabase
        .from('admin_notification_settings')
        .select('*')
        .eq('admin_id', user.data.user?.id)
        .single();

      if (error) {
        if (error.code === 'PGRST205' || error.message?.includes('does not exist')) {
          console.log('ℹ️ Table admin_notification_settings non trouvée - utilisation des paramètres par défaut');
          return;
        }
        if (error.code !== 'PGRST116') {
          const isNetworkError = error.message?.includes('Failed to fetch') || 
                                error.message?.includes('Network request failed');
          if (!isNetworkError) {
            throw error;
          } else {
            console.warn('⚠️ Impossible de charger les paramètres (mode prévisualisation)');
            return;
          }
        }
      }
      if (data) {
        setSettings(data.settings);
      }
    } catch (error: any) {
      const isNetworkError = error.message?.includes('Failed to fetch') || 
                            error.message?.includes('Network request failed');
      if (!isNetworkError) {
        console.error('Error loading settings:', error);
      }
    }
  };

  const saveSettings = async () => {
    try {
      const user = await supabase.auth.getUser();
      const { error } = await supabase
        .from('admin_notification_settings')
        .upsert({
          admin_id: user.data.user?.id,
          settings: settings
        });

      if (error) {
        if (error.code === 'PGRST205' || error.message?.includes('does not exist')) {
          toast.error('Table admin_notification_settings non trouvée. Veuillez exécuter le script SQL de création.');
          return;
        }
        throw error;
      }
      toast.success('Paramètres enregistrés');
      setShowSettings(false);
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Erreur lors de l\'enregistrement');
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('admin_notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from('admin_notifications')
        .update({ is_read: true })
        .eq('is_read', false);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => ({ ...n, is_read: true }))
      );

      toast.success('Toutes les notifications marquées comme lues');
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('Erreur');
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('admin_notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      toast.success('Notification supprimée');
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const clearAll = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer toutes les notifications ?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('admin_notifications')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (error) throw error;

      setNotifications([]);
      toast.success('Toutes les notifications supprimées');
    } catch (error) {
      console.error('Error clearing all:', error);
      toast.error('Erreur');
    }
  };

  const playNotificationSound = () => {
    try {
      const audio = new Audio('/notification-urgent.mp3');
      audio.play();
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.is_read;
    if (filter === 'urgent') return n.priority === 'urgent';
    return true;
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const urgentCount = notifications.filter(n => n.priority === 'urgent' && !n.is_read).length;

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-5 h-5 text-green-600" />;
      default: return <Info className="w-5 h-5 text-blue-600" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    const colors = {
      low: 'bg-gray-100 text-gray-600',
      normal: 'bg-blue-100 text-blue-600',
      high: 'bg-orange-100 text-orange-600',
      urgent: 'bg-red-100 text-red-600'
    };

    return (
      <Badge className={colors[priority as keyof typeof colors] || colors.normal}>
        {priority === 'urgent' ? '🚨 Urgent' : priority}
      </Badge>
    );
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            onClick={() => onBack ? onBack() : setCurrentScreen('admin-dashboard')} 
            variant="ghost" 
            size="icon"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl flex items-center gap-2">
              <Bell className="w-6 h-6" />
              Centre de notifications
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {unreadCount}
                </Badge>
              )}
            </h1>
            <p className="text-sm text-gray-600">
              Alertes et notifications importantes
              {urgentCount > 0 && (
                <span className="text-red-600 ml-2">
                  • {urgentCount} notification(s) urgente(s)
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={() => setShowSettings(!showSettings)} variant="outline" className="gap-2">
            <Settings className="w-4 h-4" />
            Paramètres
          </Button>
          {unreadCount > 0 && (
            <Button onClick={markAllAsRead} variant="outline">
              Tout marquer comme lu
            </Button>
          )}
          {notifications.length > 0 && (
            <Button onClick={clearAll} variant="outline" className="text-red-600 gap-2">
              <Trash2 className="w-4 h-4" />
              Tout supprimer
            </Button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="p-6">
              <h3 className="font-medium mb-4">Paramètres de notification</h3>
              <div className="space-y-3">
                {Object.entries(settings).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between">
                    <Label className="cursor-pointer">
                      {key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                    </Label>
                    <Switch
                      checked={value}
                      onCheckedChange={(checked) =>
                        setSettings(prev => ({ ...prev, [key]: checked }))
                      }
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-end mt-4">
                <Button onClick={saveSettings}>Enregistrer</Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          onClick={() => setFilter('all')}
          size="sm"
        >
          Toutes ({notifications.length})
        </Button>
        <Button
          variant={filter === 'unread' ? 'default' : 'outline'}
          onClick={() => setFilter('unread')}
          size="sm"
        >
          Non lues ({unreadCount})
        </Button>
        <Button
          variant={filter === 'urgent' ? 'default' : 'outline'}
          onClick={() => setFilter('urgent')}
          size="sm"
          className={urgentCount > 0 ? 'animate-pulse' : ''}
        >
          🚨 Urgentes ({urgentCount})
        </Button>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <Card className="p-12 text-center text-gray-500">
            <Bell className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p>Aucune notification</p>
          </Card>
        ) : (
          <AnimatePresence>
            {filteredNotifications.map((notification) => (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                layout
              >
                <Card
                  className={`p-4 transition-all ${
                    !notification.is_read
                      ? 'border-l-4 border-l-blue-600 bg-blue-50'
                      : 'hover:bg-gray-50'
                  } ${
                    notification.priority === 'urgent'
                      ? 'border-l-4 border-l-red-600 bg-red-50'
                      : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      {getIcon(notification.type)}
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium">{notification.title}</h3>
                          {getPriorityBadge(notification.priority)}
                          {!notification.is_read && (
                            <Badge variant="outline" className="text-blue-600">
                              Nouveau
                            </Badge>
                          )}
                        </div>

                        <p className="text-sm text-gray-700 mb-2">
                          {notification.message}
                        </p>

                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>
                            {formatDate(notification.created_at)}
                          </span>
                          {notification.data && (
                            <details className="cursor-pointer">
                              <summary>Détails</summary>
                              <pre className="mt-2 p-2 bg-gray-100 rounded text-xs">
                                {JSON.stringify(notification.data, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      {!notification.is_read && (
                        <Button
                          onClick={() => markAsRead(notification.id)}
                          variant="ghost"
                          size="sm"
                          className="gap-2"
                        >
                          <Eye className="w-4 h-4" />
                          Marquer lu
                        </Button>
                      )}
                      <Button
                        onClick={() => deleteNotification(notification.id)}
                        variant="ghost"
                        size="sm"
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}