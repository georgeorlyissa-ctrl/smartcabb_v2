import { useState, useEffect, useRef } from 'react';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { supabase } from '../../lib/supabase';
import { MessageSquare, User, CheckCheck, Check, Send } from '../../lib/icons';

interface Message {
  id: string;
  sender_id: string;
  sender_type: 'driver' | 'passenger';
  message: string;
  sent_at: string;
  read: boolean;
}

interface PassengerChatProps {
  rideId: string;
  driverId: string;
  driverName: string;
  passengerId: string;
  passengerName: string;
}

export function PassengerChat({
  rideId,
  driverId,
  driverName,
  passengerId,
  passengerName
}: PassengerChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load messages
  useEffect(() => {
    if (isOpen) {
      loadMessages();
      subscribeToMessages();
    }
  }, [isOpen, rideId]);

  // Auto-scroll to bottom
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Mark as read when opened
  useEffect(() => {
    if (isOpen && unreadCount > 0) {
      markAllAsRead();
    }
  }, [isOpen]);

  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('ride_id', rideId)
        .order('sent_at', { ascending: true });

      if (error) throw error;

      if (data) {
        setMessages(data);
        
        // Count unread messages from passenger
        const unread = data.filter(
          m => m.sender_type === 'passenger' && !m.read
        ).length;
        setUnreadCount(unread);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel(`chat_${rideId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `ride_id=eq.${rideId}`
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages(prev => [...prev, newMsg]);

          // Increment unread count if from passenger and chat is closed
          if (newMsg.sender_type === 'passenger' && !isOpen) {
            setUnreadCount(prev => prev + 1);
            toast('Nouveau message', {
              description: newMsg.message,
              duration: 3000
            });
          }

          // Play notification sound
          playNotificationSound();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_messages',
          filter: `ride_id=eq.${rideId}`
        },
        (payload) => {
          const updated = payload.new as Message;
          setMessages(prev => 
            prev.map(m => m.id === updated.id ? updated : m)
          );
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          ride_id: rideId,
          sender_id: driverId,
          sender_type: 'driver',
          message: newMessage.trim(),
          sent_at: new Date().toISOString(),
          read: false
        })
        .select()
        .single();

      if (error) throw error;

      setNewMessage('');
      
      // Send push notification to passenger
      await supabase.from('notifications').insert({
        user_id: passengerId,
        title: `Message de ${driverName}`,
        message: newMessage.trim(),
        type: 'info',
        data: { ride_id: rideId, from: 'driver' }
      });

      toast.success('Message envoyé');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Erreur lors de l\'envoi');
    } finally {
      setIsSending(false);
    }
  };

  const markAllAsRead = async () => {
    try {
      await supabase
        .from('chat_messages')
        .update({ read: true })
        .eq('ride_id', rideId)
        .eq('sender_type', 'passenger')
        .eq('read', false);

      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const playNotificationSound = () => {
    try {
      const audio = new Audio('/message-notification.mp3');
      audio.play();
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Quick replies
  const quickReplies = [
    "J'arrive dans 5 minutes",
    "Je suis arrivé",
    "Petit retard, désolé",
    "Merci !",
    "Bonne journée !"
  ];

  const sendQuickReply = (text: string) => {
    setNewMessage(text);
    setTimeout(() => sendMessage(), 100);
  };

  return (
    <>
      {/* Chat button with badge */}
      <div className="relative">
        <Button
          onClick={() => setIsOpen(true)}
          variant="outline"
          size="lg"
          className="gap-2 relative"
        >
          <MessageSquare className="w-5 h-5" />
          Chat avec passager
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 w-6 h-6 flex items-center justify-center p-0"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </div>

      {/* Chat dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-lg h-[600px] flex flex-col p-0">
          {/* Header */}
          <DialogHeader className="px-4 pt-4 pb-3 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div>
                  <DialogTitle>{passengerName}</DialogTitle>
                  <DialogDescription className="text-xs text-gray-500">
                    {isTyping ? 'En train d\'écrire...' : 'Passager'}
                  </DialogDescription>
                </div>
              </div>
            </div>
          </DialogHeader>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <MessageSquare className="w-12 h-12 text-gray-300 mb-3" />
                <p className="text-gray-500">Aucun message pour le moment</p>
                <p className="text-sm text-gray-400 mt-1">
                  Commencez la conversation
                </p>
              </div>
            ) : (
              <>
                {messages.map((message) => {
                  const isDriver = message.sender_type === 'driver';
                  
                  return (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${isDriver ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                          isDriver
                            ? 'bg-blue-600 text-white rounded-br-sm'
                            : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                        }`}
                      >
                        <p className="text-sm break-words">{message.message}</p>
                        <div className={`flex items-center gap-1 mt-1 ${
                          isDriver ? 'justify-end' : 'justify-start'
                        }`}>
                          <p className={`text-xs ${
                            isDriver ? 'text-blue-100' : 'text-gray-500'
                          }`}>
                            {new Date(message.sent_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                          {isDriver && (
                            message.read ? (
                              <CheckCheck className="w-3 h-3 text-blue-100" />
                            ) : (
                              <Check className="w-3 h-3 text-blue-100" />
                            )
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Quick replies */}
          {messages.length < 3 && (
            <div className="px-4 py-2 border-t bg-gray-50">
              <p className="text-xs text-gray-500 mb-2">Réponses rapides :</p>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {quickReplies.map((reply) => (
                  <Button
                    key={reply}
                    onClick={() => sendQuickReply(reply)}
                    variant="outline"
                    size="sm"
                    className="whitespace-nowrap text-xs"
                  >
                    {reply}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="px-4 py-3 border-t">
            <div className="flex items-center gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Tapez votre message..."
                className="flex-1"
                disabled={isSending}
              />
              <Button
                onClick={sendMessage}
                disabled={!newMessage.trim() || isSending}
                size="icon"
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}