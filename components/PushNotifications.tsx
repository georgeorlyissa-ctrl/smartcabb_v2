import { useState, useEffect } from 'react';
import { Bell, X, Check, AlertCircle } from '../lib/icons';
import { Button } from './ui/button';
import { toast } from '../lib/toast';
import { supabase } from '../lib/supabase';
import { useAppState } from '../hooks/useAppState';
import { motion, AnimatePresence } from '../lib/motion';

interface PushNotificationsProps {
  className?: string;
}

interface Notification {
  id: string;
  title: string;
  body: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: Date;
  is_read: boolean;  // ✅ CHANGÉ: read → is_read
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function PushNotifications({ className = "" }: PushNotificationsProps) {
  const { state } = useAppState();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Vérifier le statut des permissions
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }

    // Charger les notifications non lues
    loadNotifications();

    // S'abonner aux notifications en temps réel via Supabase
    if (state.currentUser?.id) {
      subscribeToNotifications();
    }
  }, [state.currentUser]);

  // Charger les notifications depuis Supabase
  const loadNotifications = async () => {
    if (!state.currentUser?.id) return;

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', state.currentUser.id)
        .eq('is_read', false)  // ✅ CHANGÉ: read → is_read
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      if (data) {
        const formattedNotifications = data.map(notif => ({
          id: notif.id,
          title: notif.title,
          body: notif.message,
          type: notif.type || 'info',
          timestamp: new Date(notif.created_at),
          is_read: notif.is_read  // ✅ CHANGÉ: read → is_read
        }));
        setNotifications(formattedNotifications);
        setUnreadCount(formattedNotifications.length);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des notifications:', error);
    }
  };

  // S'abonner aux notifications en temps réel
  const subscribeToNotifications = () => {
    if (!state.currentUser?.id) return;

    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${state.currentUser.id}`
        },
        (payload) => {
          const newNotification: Notification = {
            id: payload.new.id,
            title: payload.new.title,
            body: payload.new.message,
            type: payload.new.type || 'info',
            timestamp: new Date(payload.new.created_at),
            is_read: false  // ✅ CHANGÉ: read → is_read
          };

          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);

          // Afficher une notification push
          showPushNotification(newNotification);

          // Afficher un toast
          toast(newNotification.title, {
            description: newNotification.body
          });
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  };

  // Demander la permission pour les notifications
  const requestPermission = async () => {
    if (!('Notification' in window)) {
      toast.error('Les notifications ne sont pas supportées par votre navigateur');
      return;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === 'granted') {
        toast.success('Notifications activées');
        
        // Enregistrer le token de notification (pour les push notifications)
        await registerPushSubscription();
      } else if (result === 'denied') {
        toast.error('Notifications refusées');
      }
    } catch (error) {
      console.error('Erreur lors de la demande de permission:', error);
      toast.error('Erreur lors de l\'activation des notifications');
    }
  };

  // Enregistrer la souscription aux push notifications
  const registerPushSubscription = async () => {
    // 🚫 Service Worker désactivé temporairement - Push Notifications nécessitent un SW actif
    console.log('⚠️ Push Notifications: Service Worker désactivé temporairement');
    return;
    
    // Code commenté pour éviter les erreurs de Service Worker
    /*
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Créer une souscription
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          // Vous devrez générer votre propre VAPID key
          'BEl62iUYgUivxIkv69yViEuiBIa-Ib37J8jQOjgqxGQvLbWoOz_hIY7J5jEZuZhq6j4HGX-dVSVCKdYpQCLcBjk'
        )
      });

      // Envoyer la souscription au backend
      if (state.currentUser?.id) {
        await supabase
          .from('push_subscriptions')
          .upsert({
            user_id: state.currentUser.id,
            subscription: JSON.stringify(subscription),
            endpoint: subscription.endpoint
          });
      }
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement de la souscription:', error);
    }
    */
  };

  // Afficher une notification push
  const showPushNotification = (notification: Notification) => {
    if (permission !== 'granted') return;

    try {
      const pushNotification = new Notification(notification.title, {
        body: notification.body,
        icon: '/android-chrome-192x192.png',
        badge: '/android-chrome-192x192.png',
        tag: notification.id,
        requireInteraction: false,
        vibrate: [200, 100, 200]
      });

      pushNotification.onclick = () => {
        window.focus();
        pushNotification.close();
        setShowNotifications(true);
      };
    } catch (error) {
      console.error('Erreur lors de l\'affichage de la notification:', error);
    }
  };

  // Marquer une notification comme lue
  const markAsRead = async (notificationId: string) => {
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })  // ✅ CHANGÉ: read → is_read
        .eq('id', notificationId);

      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, is_read: true }  // ✅ CHANGÉ: read → is_read
            : notif
        ).filter(notif => !notif.is_read)  // ✅ CHANGÉ: read → is_read
      );
      
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Erreur lors du marquage comme lu:', error);
    }
  };

  // Marquer toutes les notifications comme lues
  const markAllAsRead = async () => {
    if (!state.currentUser?.id) return;

    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })  // ✅ CHANGÉ: read → is_read
        .eq('user_id', state.currentUser.id)
        .eq('is_read', false);  // ✅ CHANGÉ: read → is_read

      setNotifications([]);
      setUnreadCount(0);
      toast.success('Toutes les notifications ont été marquées comme lues');
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  // Helper pour convertir VAPID key
  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success': return <Check className="w-5 h-5 text-green-600" />;
      case 'warning': return <AlertCircle className="w-5 h-5 text-orange-600" />;
      case 'error': return <AlertCircle className="w-5 h-5 text-red-600" />;
      default: return <Bell className="w-5 h-5 text-blue-600" />;
    }
  };

  const getNotificationBgColor = (type: string) => {
    switch (type) {
      case 'success': return 'bg-green-50 border-green-200';
      case 'warning': return 'bg-orange-50 border-orange-200';
      case 'error': return 'bg-red-50 border-red-200';
      default: return 'bg-blue-50 border-blue-200';
    }
  };

  return (
    <div className={className}>
      {/* Bouton de notifications */}
      <button
        onClick={() => setShowNotifications(!showNotifications)}
        className="relative p-2 rounded-full hover:bg-gray-100 transition-colors"
      >
        <Bell className="w-6 h-6 text-gray-700" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Panel des notifications */}
      <AnimatePresence>
        {showNotifications && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNotifications(false)}
              className="fixed inset-0 bg-black/20 z-40"
            />

            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, x: 300 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 300 }}
              className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col"
            >
              {/* En-tête */}
              <div className="flex items-center justify-between p-4 border-b">
                <div>
                  <h2 className="text-lg text-gray-900">Notifications</h2>
                  <p className="text-xs text-gray-500">
                    {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
                  </p>
                </div>
                <div className="flex gap-2">
                  {unreadCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={markAllAsRead}
                      className="text-xs"
                    >
                      Tout marquer lu
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowNotifications(false)}
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              {/* Demande de permission si ncessaire */}
              {permission === 'default' && (
                <div className="p-4 bg-blue-50 border-b border-blue-200">
                  <p className="text-sm text-blue-900 mb-2">
                    Activez les notifications pour ne rien manquer !
                  </p>
                  <Button
                    onClick={requestPermission}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Bell className="w-4 h-4 mr-2" />
                    Activer les notifications
                  </Button>
                </div>
              )}

              {/* Liste des notifications */}
              <div className="flex-1 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500">
                    <Bell className="w-16 h-16 mb-4 text-gray-300" />
                    <p className="text-sm">Aucune notification</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {notifications.map((notif) => (
                      <motion.div
                        key={notif.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className={`p-4 hover:bg-gray-50 cursor-pointer ${
                          !notif.is_read ? 'bg-blue-50' : ''  // ✅ CHANGÉ: read → is_read
                        }`}
                        onClick={() => markAsRead(notif.id)}
                      >
                        <div className="flex gap-3">
                          <div className="flex-shrink-0">
                            {getNotificationIcon(notif.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-900 mb-1">
                              {notif.title}
                            </p>
                            <p className="text-xs text-gray-600 mb-2">
                              {notif.body}
                            </p>
                            <p className="text-xs text-gray-400">
                              {formatTimestamp(notif.timestamp)}
                            </p>
                          </div>
                          {!notif.is_read && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2" />
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// Formater le timestamp de manière relative
function formatTimestamp(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'À l\'instant';
  if (diffMins < 60) return `Il y a ${diffMins} min`;
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  if (diffDays < 7) return `Il y a ${diffDays}j`;
  
  return date.toLocaleDateString('fr-FR', { 
    day: 'numeric', 
    month: 'short' 
  });
}