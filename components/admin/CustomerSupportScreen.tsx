import { supabase } from '../../lib/supabase';
import { toast } from '../../lib/toast';

interface Message {
  id: string;
  conversation_id: string;
  sender_type: 'customer' | 'admin' | 'bot';
  message: string;
  created_at: string;
  is_read: boolean;
}

interface Conversation {
  id: string;
  user_id: string;
  subject: string;
  status: 'open' | 'in_progress' | 'closed';
  created_at: string;
  updated_at: string;
  user_name?: string;
  user_phone?: string;
  unread_count?: number;
}

export function CustomerSupportScreen({ onBack }: { onBack: () => void }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'in_progress' | 'closed'>('all');

  useEffect(() => {
    loadConversations();
    subscribeToConversations();
  }, [statusFilter]);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages();
      subscribeToMessages();
      markMessagesAsRead();
    }
  }, [selectedConversation]);

  const loadConversations = async () => {
    try {
      let query = supabase
        .from('support_conversations')
        .select(`
          *,
          profiles:user_id (
            full_name,
            phone
          )
        `)
        .order('updated_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Compter les messages non lus
      const conversationsWithUnread = await Promise.all(
        (data || []).map(async (conv) => {
          const { count } = await supabase
            .from('support_messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .eq('sender_type', 'customer')
            .eq('is_read', false);

          return {
            ...conv,
            user_name: conv.profiles?.full_name || 'Utilisateur',
            user_phone: conv.profiles?.phone || '',
            unread_count: count || 0
          };
        })
      );

      setConversations(conversationsWithUnread);
    } catch (error) {
      console.error('Erreur chargement conversations:', error);
      toast.error('Erreur de chargement des conversations');
    }
  };

  const subscribeToConversations = () => {
    const channel = supabase
      .channel('support-conversations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_conversations'
        },
        () => {
          loadConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const loadMessages = async () => {
    if (!selectedConversation) return;

    try {
      const { data, error } = await supabase
        .from('support_messages')
        .select('*')
        .eq('conversation_id', selectedConversation.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Erreur messages:', error);
    }
  };

  const subscribeToMessages = () => {
    if (!selectedConversation) return;

    const channel = supabase
      .channel(`conversation-${selectedConversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
          filter: `conversation_id=eq.${selectedConversation.id}`
        },
        (payload) => {
          const newMessage = payload.new as Message;
          setMessages((prev) => [...prev, newMessage]);
          
          if (newMessage.sender_type === 'customer') {
            markMessagesAsRead();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const markMessagesAsRead = async () => {
    if (!selectedConversation) return;

    try {
      await supabase
        .from('support_messages')
        .update({ is_read: true })
        .eq('conversation_id', selectedConversation.id)
        .eq('sender_type', 'customer')
        .eq('is_read', false);

      loadConversations();
    } catch (error) {
      console.error('Erreur marquage lu:', error);
    }
  };

  const sendMessage = async () => {
    if (!currentMessage.trim() || !selectedConversation) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('support_messages')
        .insert({
          conversation_id: selectedConversation.id,
          sender_type: 'admin',
          message: currentMessage.trim(),
          is_read: false
        });

      if (error) throw error;

      // Mettre à jour le statut de la conversation
      await supabase
        .from('support_conversations')
        .update({
          status: 'in_progress',
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedConversation.id);

      setCurrentMessage('');
      toast.success('Message envoyé');
    } catch (error) {
      console.error('Erreur envoi:', error);
      toast.error('Erreur d\'envoi du message');
    } finally {
      setLoading(false);
    }
  };

  const closeConversation = async () => {
    if (!selectedConversation) return;

    try {
      await supabase
        .from('support_conversations')
        .update({ status: 'closed' })
        .eq('id', selectedConversation.id);

      toast.success('Conversation fermée');
      setSelectedConversation(null);
      loadConversations();
    } catch (error) {
      console.error('Erreur fermeture:', error);
      toast.error('Erreur de fermeture');
    }
  };

  const reopenConversation = async () => {
    if (!selectedConversation) return;

    try {
      await supabase
        .from('support_conversations')
        .update({ status: 'open' })
        .eq('id', selectedConversation.id);

      toast.success('Conversation réouverte');
      loadConversations();
    } catch (error) {
      console.error('Erreur réouverture:', error);
      toast.error('Erreur de réouverture');
    }
  };

  const filteredConversations = conversations.filter((conv) =>
    conv.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.user_phone?.includes(searchQuery)
  );

  const stats = {
    total: conversations.length,
    open: conversations.filter((c) => c.status === 'open').length,
    inProgress: conversations.filter((c) => c.status === 'in_progress').length,
    closed: conversations.filter((c) => c.status === 'closed').length,
    unread: conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0)
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Support Client</h1>
              <p className="text-sm text-gray-600">
                Gérez toutes les conversations avec les clients
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <MessageCircle className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Ouvertes</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.open}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">En cours</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
                </div>
                <Clock className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Fermées</p>
                  <p className="text-2xl font-bold text-green-600">{stats.closed}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Non lus</p>
                  <p className="text-2xl font-bold text-red-600">{stats.unread}</p>
                </div>
                <Badge className="bg-red-500">{stats.unread}</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-3 gap-6">
          {/* Conversations List */}
          <Card className="col-span-1">
            <CardHeader>
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Rechercher..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <Tabs value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                  <TabsList className="grid grid-cols-4 w-full">
                    <TabsTrigger value="all">Tous</TabsTrigger>
                    <TabsTrigger value="open">Ouvertes</TabsTrigger>
                    <TabsTrigger value="in_progress">En cours</TabsTrigger>
                    <TabsTrigger value="closed">Fermées</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <ScrollArea className="h-[600px]">
                <div className="p-4 space-y-2">
                  {filteredConversations.map((conv) => (
                    <div
                      key={conv.id}
                      onClick={() => setSelectedConversation(conv)}
                      className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                        selectedConversation?.id === conv.id
                          ? 'bg-emerald-50 border-emerald-500'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                            <User className="h-5 w-5 text-gray-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-sm">{conv.user_name}</p>
                            <p className="text-xs text-gray-500">{conv.user_phone}</p>
                          </div>
                        </div>
                        {(conv.unread_count || 0) > 0 && (
                          <Badge className="bg-red-500">{conv.unread_count}</Badge>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <Badge
                          variant={
                            conv.status === 'open'
                              ? 'destructive'
                              : conv.status === 'in_progress'
                              ? 'default'
                              : 'secondary'
                          }
                        >
                          {conv.status === 'open'
                            ? 'Ouverte'
                            : conv.status === 'in_progress'
                            ? 'En cours'
                            : 'Fermée'}
                        </Badge>
                        <span className="text-gray-500">
                          {new Date(conv.updated_at).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                    </div>
                  ))}

                  {filteredConversations.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      Aucune conversation trouvée
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Chat Area */}
          <Card className="col-span-2">
            {selectedConversation ? (
              <>
                <CardHeader className="border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 bg-emerald-100 rounded-full flex items-center justify-center">
                        <User className="h-6 w-6 text-emerald-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{selectedConversation.user_name}</CardTitle>
                        <p className="text-sm text-gray-600 flex items-center gap-2">
                          <Phone className="h-3 w-3" />
                          {selectedConversation.user_phone}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {selectedConversation.status !== 'closed' ? (
                        <Button variant="outline" size="sm" onClick={closeConversation}>
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Fermer
                        </Button>
                      ) : (
                        <Button variant="outline" size="sm" onClick={reopenConversation}>
                          Réouvrir
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-0">
                  <ScrollArea className="h-[500px] p-4">
                    <div className="space-y-4">
                      {messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex ${
                            msg.sender_type === 'admin' ? 'justify-end' : 'justify-start'
                          }`}
                        >
                          <div
                            className={`max-w-[70%] rounded-lg p-3 ${
                              msg.sender_type === 'admin'
                                ? 'bg-blue-500 text-white'
                                : msg.sender_type === 'bot'
                                ? 'bg-gray-100 text-gray-900'
                                : 'bg-emerald-100 text-emerald-900'
                            }`}
                          >
                            <p className="text-sm whitespace-pre-line">{msg.message}</p>
                            <p className="text-xs opacity-70 mt-1">
                              {new Date(msg.created_at).toLocaleTimeString('fr-FR', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>

                  {selectedConversation.status !== 'closed' && (
                    <div className="p-4 border-t">
                      <div className="flex gap-2">
                        <Input
                          value={currentMessage}
                          onChange={(e) => setCurrentMessage(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && !loading && sendMessage()}
                          placeholder="Tapez votre réponse..."
                          disabled={loading}
                        />
                        <Button
                          onClick={sendMessage}
                          disabled={!currentMessage.trim() || loading}
                          className="bg-blue-500 hover:bg-blue-600"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </>
            ) : (
              <CardContent className="h-[600px] flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p>Sélectionnez une conversation pour commencer</p>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}