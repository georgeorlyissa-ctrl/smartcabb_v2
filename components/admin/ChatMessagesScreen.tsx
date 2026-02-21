import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from '../../lib/toast';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { useAppState } from '../../hooks/useAppState';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import {
  MessageCircle,
  ArrowLeft,
  Bell,
  BellOff,
  Volume2,
  RefreshCw,
  Clock,
  CheckCircle2,
  Calendar,
  Search,
  User,
  Mail,
  X,
  Send,
} from '../../lib/icons';

interface ChatMessage {
  id: string;
  session_id?: string;
  user_name: string | null;
  user_email: string | null;
  user_phone: string | null;
  message: string;
  reply: string | null;
  status: 'pending' | 'in_progress' | 'replied' | 'closed';
  created_at: string;
  replied_at: string | null;
  page_url: string | null;
  is_read?: boolean;
}

export function ChatMessagesScreen() {
  const { setCurrentScreen } = useAppState();  // Added hook
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<ChatMessage | null>(null);
  const [replyText, setReplyText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [stats, setStats] = useState({
    totalMessages: 0,
    pendingMessages: 0,
    repliedMessages: 0,
    messagesToday: 0,
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialiser le son de notification
  useEffect(() => {
    audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHW7A7+OZURE=');
  }, []);

  // Charger les messages
  useEffect(() => {
    loadMessages();
    loadStats();

    // Actualiser toutes les 10 secondes
    const interval = setInterval(() => {
      loadMessages();
      loadStats();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  // Écouter les nouveaux messages en temps réel avec Supabase Realtime
  useEffect(() => {
    const channel = supabase
      .channel('chat_messages_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
        },
        (payload) => {
          console.log('🔔 Nouveau message reçu:', payload.new);
          
          // Ajouter le nouveau message
          setMessages((prev) => [payload.new as ChatMessage, ...prev]);
          
          // Incrémenter le compteur de non lus
          setUnreadCount((prev) => prev + 1);
          
          // Notification visuelle
          if (notificationsEnabled) {
            toast.success('📩 Nouveau message reçu !', {
              description: `De: ${(payload.new as ChatMessage).user_name || 'Visiteur'}`,
              duration: 5000,
            });
          }
          
          // Son de notification
          if (soundEnabled && audioRef.current) {
            audioRef.current.play().catch(e => console.log('Erreur lecture son:', e));
          }
          
          // Mettre à jour les stats
          loadStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [notificationsEnabled, soundEnabled]);

  // Auto-scroll vers le bas quand nouveau message
  useEffect(() => {
    scrollToBottom();
  }, [selectedMessage]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      setMessages(data || []);
      
      // Compter les non lus
      const unread = (data || []).filter(msg => !msg.is_read).length;
      setUnreadCount(unread);
      
      setLoading(false);
    } catch (error) {
      console.error('Erreur chargement messages:', error);
      toast.error('Erreur lors du chargement des messages');
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      // Compter directement depuis la table
      const { count: totalCount } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true });

      const { count: pendingCount } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      const { count: repliedCount } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'replied');

      const today = new Date().toISOString().split('T')[0];
      const { count: todayCount } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today);

      setStats({
        totalMessages: totalCount || 0,
        pendingMessages: pendingCount || 0,
        repliedMessages: repliedCount || 0,
        messagesToday: todayCount || 0,
      });
    } catch (error) {
      console.error('Erreur chargement stats:', error);
    }
  };

  const handleSelectMessage = async (message: ChatMessage) => {
    setSelectedMessage(message);
    setReplyText('');
    
    // Marquer comme lu
    if (!message.is_read) {
      try {
        await supabase
          .from('chat_messages')
          .update({ is_read: true })
          .eq('id', message.id);
        
        // Mettre à jour localement
        setMessages(prev => 
          prev.map(msg => 
            msg.id === message.id ? { ...msg, is_read: true } : msg
          )
        );
        
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (error) {
        console.error('Erreur marquage lu:', error);
      }
    }
  };

  const handleReply = async () => {
    if (!selectedMessage || !replyText.trim()) {
      toast.error('Veuillez saisir une réponse');
      return;
    }

    setSending(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Non authentifié');

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/chat/reply/${selectedMessage.id}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ reply: replyText }),
        }
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Erreur lors de l\'envoi');
      }

      toast.success('✅ Réponse envoyée avec succès');
      setReplyText('');
      
      // Recharger les messages
      await loadMessages();
      await loadStats();
      
      // Fermer le message sélectionné
      setSelectedMessage(null);

    } catch (error: any) {
      console.error('Erreur envoi réponse:', error);
      toast.error(error.message || 'Erreur lors de l\'envoi de la réponse');
    } finally {
      setSending(false);
    }
  };

  const handleMarkAsResolved = async (messageId: string) => {
    try {
      await supabase
        .from('chat_messages')
        .update({ status: 'closed' })
        .eq('id', messageId);

      toast.success('Message marqué comme résolu');
      await loadMessages();
      await loadStats();
      setSelectedMessage(null);
    } catch (error: any) {
      console.error('Erreur résolution message:', error);
      toast.error('Erreur lors de la résolution');
    }
  };

  const filteredMessages = messages.filter(msg => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      msg.user_name?.toLowerCase().includes(query) ||
      msg.user_email?.toLowerCase().includes(query) ||
      msg.message?.toLowerCase().includes(query)
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-500">En attente</Badge>;
      case 'replied':
        return <Badge className="bg-green-500">Répondu</Badge>;
      case 'closed':
        return <Badge className="bg-gray-500">Résolu</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-cyan-900 to-blue-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <p className="text-white/70">Chargement des messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 min-h-screen bg-gradient-to-br from-gray-900 via-cyan-900 to-blue-900">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            onClick={() => setCurrentScreen('admin-dashboard')}
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-white text-2xl flex items-center gap-2">
              <MessageCircle className="w-6 h-6" />
              Messages du Chat Client
              {unreadCount > 0 && (
                <Badge className="bg-red-500 text-white animate-pulse">
                  {unreadCount} nouveau{unreadCount > 1 ? 'x' : ''}
                </Badge>
              )}
            </h1>
            <p className="text-white/70 mt-2">Répondez aux visiteurs en temps réel</p>
          </div>
        </div>

        {/* Contrôles */}
        <div className="flex gap-2">
          <Button
            onClick={() => setNotificationsEnabled(!notificationsEnabled)}
            variant="outline"
            className="border-white/20 text-white"
            title={notificationsEnabled ? 'Désactiver notifications' : 'Activer notifications'}
          >
            {notificationsEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
          </Button>
          <Button
            onClick={() => setSoundEnabled(!soundEnabled)}
            variant="outline"
            className="border-white/20 text-white"
            title={soundEnabled ? 'Désactiver son' : 'Activer son'}
          >
            <Volume2 className={`w-4 h-4 ${soundEnabled ? '' : 'opacity-50'}`} />
          </Button>
          <Button
            onClick={() => { loadMessages(); loadStats(); }}
            variant="outline"
            className="border-white/20 text-white"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white/5 border-white/10 p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-500/20 rounded-lg">
              <MessageCircle className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <p className="text-white/60 text-sm">Total messages</p>
              <p className="text-white text-2xl">{stats.totalMessages}</p>
            </div>
          </div>
        </Card>

        <Card className="bg-white/5 border-white/10 p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-yellow-500/20 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <p className="text-white/60 text-sm">En attente</p>
              <p className="text-white text-2xl">{stats.pendingMessages}</p>
            </div>
          </div>
        </Card>

        <Card className="bg-white/5 border-white/10 p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-500/20 rounded-lg">
              <CheckCircle2 className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <p className="text-white/60 text-sm">Répondus</p>
              <p className="text-white text-2xl">{stats.repliedMessages}</p>
            </div>
          </div>
        </Card>

        <Card className="bg-white/5 border-white/10 p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-500/20 rounded-lg">
              <Calendar className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <p className="text-white/60 text-sm">Aujourd'hui</p>
              <p className="text-white text-2xl">{stats.messagesToday}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Interface de chat */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Liste des messages */}
        <Card className="bg-white/5 border-white/10 p-4 lg:col-span-1">
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/40" />
              <Input
                type="text"
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/40"
              />
            </div>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {filteredMessages.map((msg) => (
              <div
                key={msg.id}
                onClick={() => handleSelectMessage(msg)}
                className={`p-3 rounded-lg cursor-pointer transition-all relative ${
                  selectedMessage?.id === msg.id
                    ? 'bg-cyan-500/20 border-2 border-cyan-500'
                    : 'bg-white/5 border border-white/10 hover:bg-white/10'
                }`}
              >
                {/* Badge non lu */}
                {!msg.is_read && (
                  <div className="absolute top-2 right-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  </div>
                )}

                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-white/60" />
                    <span className="text-white font-medium">
                      {msg.user_name || 'Visiteur'}
                    </span>
                  </div>
                  {getStatusBadge(msg.status)}
                </div>

                <p className="text-sm text-white/80 line-clamp-2 mb-2">
                  {msg.message}
                </p>

                {msg.user_email && (
                  <div className="flex items-center gap-2 text-xs text-white/60 mb-1">
                    <Mail className="w-3 h-3" />
                    <span className="truncate">{msg.user_email}</span>
                  </div>
                )}

                {msg.page_url && (
                  <div className="text-xs text-white/40 mb-1">
                    📍 {msg.page_url}
                  </div>
                )}

                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-white/40">
                    {new Date(msg.created_at).toLocaleString('fr-FR', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              </div>
            ))}

            {filteredMessages.length === 0 && (
              <div className="text-center py-8 text-white/60">
                <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Aucun message</p>
              </div>
            )}
          </div>
        </Card>

        {/* Détail du message sélectionné */}
        <Card className="bg-white/5 border-white/10 p-6 lg:col-span-2">
          {selectedMessage ? (
            <>
              {/* En-tête */}
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
                <div>
                  <h3 className="text-white font-medium flex items-center gap-2 text-lg">
                    <User className="w-5 h-5" />
                    {selectedMessage.user_name || 'Visiteur anonyme'}
                  </h3>
                  {selectedMessage.user_email && (
                    <p className="text-sm text-white/60 mt-1 flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      {selectedMessage.user_email}
                    </p>
                  )}
                  {selectedMessage.page_url && (
                    <p className="text-xs text-white/40 mt-1">
                      📍 Page : {selectedMessage.page_url}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  {selectedMessage.status !== 'closed' && (
                    <Button
                      onClick={() => handleMarkAsResolved(selectedMessage.id)}
                      className="bg-green-500 hover:bg-green-600"
                      size="sm"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Résoudre
                    </Button>
                  )}
                  <Button
                    onClick={() => setSelectedMessage(null)}
                    variant="outline"
                    className="border-white/20 text-white"
                    size="sm"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Conversation */}
              <div className="space-y-4 mb-6 max-h-[300px] overflow-y-auto">
                {/* Message utilisateur */}
                <div className="flex justify-end">
                  <div className="max-w-[80%]">
                    <div className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-2xl rounded-br-sm p-4 shadow-lg">
                      <p className="text-sm leading-relaxed">{selectedMessage.message}</p>
                      <p className="text-xs opacity-70 mt-2 text-right">
                        {new Date(selectedMessage.created_at).toLocaleString('fr-FR')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Réponse admin si elle existe */}
                {selectedMessage.reply && (
                  <div className="flex justify-start">
                    <div className="max-w-[80%]">
                      <div className="bg-white/10 text-white rounded-2xl rounded-bl-sm p-4 shadow-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className="bg-green-500 text-xs">Vous</Badge>
                          {getStatusBadge(selectedMessage.status)}
                        </div>
                        <p className="text-sm leading-relaxed">{selectedMessage.reply}</p>
                        <p className="text-xs text-white/60 mt-2">
                          {selectedMessage.replied_at && new Date(selectedMessage.replied_at).toLocaleString('fr-FR')}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Formulaire de réponse */}
              {!selectedMessage.reply && selectedMessage.status !== 'closed' && (
                <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-xl p-4">
                  <p className="text-cyan-400 text-sm mb-3 flex items-center gap-2 font-medium">
                    <Send className="w-4 h-4" />
                    Répondre à ce message
                  </p>
                  <Textarea
                    placeholder="Tapez votre réponse ici..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/40 mb-3 min-h-[120px]"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.ctrlKey) {
                        handleReply();
                      }
                    }}
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/40">
                      💡 Astuce : Ctrl+Enter pour envoyer
                    </span>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => setReplyText('')}
                        variant="outline"
                        className="border-white/20 text-white"
                        size="sm"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Annuler
                      </Button>
                      <Button
                        onClick={handleReply}
                        disabled={sending || !replyText.trim()}
                        className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
                      >
                        <Send className="w-4 h-4 mr-2" />
                        {sending ? 'Envoi...' : 'Envoyer la réponse'}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Message déjà répondu */}
              {selectedMessage.reply && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-green-400" />
                  <p className="text-green-400 font-medium">Message déjà répondu</p>
                  <p className="text-white/60 text-sm mt-1">
                    Réponse envoyée le {selectedMessage.replied_at && new Date(selectedMessage.replied_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-white/60">
              <div className="text-center">
                <MessageCircle className="w-20 h-20 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium mb-2">Sélectionnez un message</p>
                <p className="text-sm text-white/40">
                  Cliquez sur un message à gauche pour voir les détails et répondre
                </p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}