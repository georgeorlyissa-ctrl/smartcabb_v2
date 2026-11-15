import { useState, useRef, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { MessageCircle, X, Send, Bot, User, Phone, Mail, Clock } from '../../lib/icons';

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
}

export function CustomerAssistant({ userId, userName }: { userId: string; userName: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Questions fréquentes
  const quickReplies = [
    { id: 1, text: "Comment réserver une course ?", icon: "🚗" },
    { id: 2, text: "Quels sont les tarifs ?", icon: "💰" },
    { id: 3, text: "Comment payer ?", icon: "💳" },
    { id: 4, text: "Problème avec ma course", icon: "⚠️" },
    { id: 5, text: "Parler à un agent", icon: "👤" }
  ];

  // Réponses automatiques
  const autoResponses: { [key: string]: string } = {
    "comment réserver": "Pour réserver une course :\n1. Entrez votre destination\n2. Choisissez le type de véhicule\n3. Confirmez votre réservation\n4. Attendez qu'un conducteur accepte\n\nBesoin d'aide supplémentaire ? 😊",
    "tarifs": "Nos tarifs varient selon :\n• La distance (7-25 FC/km)\n• Le type de véhicule (5 catégories)\n• L'heure (jour/nuit)\n\nConsultez la section 'Tarifs' pour plus de détails ! 💰",
    "payer": "Modes de paiement acceptés :\n✅ Espèces\n✅ Mobile Money\n✅ Post-paiement (clients approuvés)\n\nChoisissez votre méthode préférée avant la course ! 💳",
    "problème": "Je vous mets en contact avec un agent pour résoudre votre problème rapidement. Un instant s'il vous plaît... 👨‍💼",
    "agent": "Je vous connecte à un agent en direct. Veuillez patienter quelques instants... 👨‍💼"
  };

  useEffect(() => {
    if (isOpen && userId) {
      loadOrCreateConversation();
    }
  }, [isOpen, userId]);

  useEffect(() => {
    if (conversation) {
      loadMessages();
      subscribeToMessages();
    }
  }, [conversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const loadOrCreateConversation = async () => {
    try {
      // Chercher une conversation ouverte
      const { data: existingConv, error: fetchError } = await supabase
        .from('support_conversations')
        .select('*')
        .eq('user_id', userId)
        .in('status', ['open', 'in_progress'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (existingConv) {
        setConversation(existingConv);
      } else {
        // Créer une nouvelle conversation
        const { data: newConv, error: createError } = await supabase
          .from('support_conversations')
          .insert({
            user_id: userId,
            subject: 'Conversation de support',
            status: 'open'
          })
          .select()
          .single();

        if (createError) throw createError;
        setConversation(newConv);

        // Message de bienvenue automatique
        await sendBotMessage(newConv.id, `Bonjour ${userName} ! 👋\n\nJe suis l'assistant SmartCabb. Comment puis-je vous aider aujourd'hui ?`);
      }
    } catch (error) {
      console.error('Erreur conversation:', error);
      toast.error('Erreur de chargement de la conversation');
    }
  };

  const loadMessages = async () => {
    if (!conversation) return;

    try {
      const { data, error } = await supabase
        .from('support_messages')
        .select('*')
        .eq('conversation_id', conversation.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Erreur messages:', error);
    }
  };

  const subscribeToMessages = () => {
    if (!conversation) return;

    const channel = supabase
      .channel(`conversation-${conversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
          filter: `conversation_id=eq.${conversation.id}`
        },
        (payload) => {
          const newMessage = payload.new as Message;
          setMessages((prev) => [...prev, newMessage]);
          
          // Montrer que l'admin écrit
          if (newMessage.sender_type === 'admin') {
            setIsTyping(false);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendBotMessage = async (convId: string, message: string) => {
    try {
      const { error } = await supabase
        .from('support_messages')
        .insert({
          conversation_id: convId,
          sender_type: 'bot',
          message,
          is_read: false
        });

      if (error) throw error;
    } catch (error) {
      console.error('Erreur bot message:', error);
    }
  };

  const sendMessage = async (text?: string) => {
    const messageText = text || currentMessage.trim();
    if (!messageText || !conversation) return;

    setLoading(true);
    try {
      // Envoyer le message du client
      const { error } = await supabase
        .from('support_messages')
        .insert({
          conversation_id: conversation.id,
          sender_type: 'customer',
          message: messageText,
          is_read: false
        });

      if (error) throw error;

      setCurrentMessage('');

      // Vérifier si réponse automatique possible
      const lowerMessage = messageText.toLowerCase();
      let autoResponse = null;

      for (const [key, response] of Object.entries(autoResponses)) {
        if (lowerMessage.includes(key)) {
          autoResponse = response;
          break;
        }
      }

      // Envoyer réponse automatique après un délai
      if (autoResponse) {
        setIsTyping(true);
        setTimeout(async () => {
          await sendBotMessage(conversation.id, autoResponse!);
          setIsTyping(false);
        }, 1500);
      } else if (!lowerMessage.includes('agent')) {
        // Si pas de réponse auto et pas demande d'agent
        setIsTyping(true);
        setTimeout(async () => {
          await sendBotMessage(
            conversation.id,
            "Je n'ai pas bien compris votre demande. Voulez-vous parler à un agent ? 🤔"
          );
          setIsTyping(false);
        }, 1000);
      } else {
        // Notifier l'admin qu'un client demande de l'aide
        await supabase
          .from('support_conversations')
          .update({ status: 'in_progress' })
          .eq('id', conversation.id);
      }
    } catch (error) {
      console.error('Erreur envoi:', error);
      toast.error('Erreur d\'envoi du message');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickReply = (text: string) => {
    setCurrentMessage(text);
    sendMessage(text);
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700"
        size="icon"
      >
        <MessageCircle className="h-6 w-6" />
        <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 rounded-full flex items-center justify-center text-xs animate-pulse">
          ?
        </span>
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-6 right-6 w-96 h-[600px] shadow-2xl z-50 flex flex-col">
      <CardHeader className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 bg-white/20 rounded-full flex items-center justify-center">
              <Bot className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-lg">Assistant SmartCabb</CardTitle>
              <p className="text-xs opacity-90">En ligne • Réponse rapide</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(false)}
            className="text-white hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Info de contact */}
        <div className="mt-3 pt-3 border-t border-white/20 flex gap-4 text-xs">
          <div className="flex items-center gap-1">
            <Phone className="h-3 w-3" />
            <span>+243 123 456 789</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>24/7</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender_type === 'customer' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    msg.sender_type === 'customer'
                      ? 'bg-emerald-500 text-white'
                      : msg.sender_type === 'bot'
                      ? 'bg-gray-100 text-gray-900'
                      : 'bg-blue-100 text-blue-900'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {msg.sender_type !== 'customer' && (
                      <div className="h-6 w-6 rounded-full bg-white/50 flex items-center justify-center flex-shrink-0">
                        {msg.sender_type === 'bot' ? (
                          <Bot className="h-4 w-4" />
                        ) : (
                          <User className="h-4 w-4" />
                        )}
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="text-sm whitespace-pre-line">{msg.message}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {new Date(msg.created_at).toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <Bot className="h-4 w-4 text-emerald-500" />
                    <div className="flex gap-1">
                      <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        {/* Questions rapides */}
        {messages.length <= 2 && (
          <div className="p-3 border-t bg-gray-50">
            <p className="text-xs text-gray-600 mb-2">Questions fréquentes :</p>
            <div className="flex flex-wrap gap-2">
              {quickReplies.map((reply) => (
                <Button
                  key={reply.id}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickReply(reply.text)}
                  className="text-xs h-7"
                >
                  <span className="mr-1">{reply.icon}</span>
                  {reply.text}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !loading && sendMessage()}
              placeholder="Tapez votre message..."
              disabled={loading}
              className="flex-1"
            />
            <Button
              onClick={() => sendMessage()}
              disabled={!currentMessage.trim() || loading}
              size="icon"
              className="bg-emerald-500 hover:bg-emerald-600"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}