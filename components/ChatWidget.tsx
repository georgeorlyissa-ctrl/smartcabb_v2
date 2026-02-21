import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send } from '../lib/icons';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

interface ChatWidgetProps {
  language?: 'fr' | 'en';
}

export function ChatWidget({ language = 'fr' }: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [showBadge, setShowBadge] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    // Show pulsing badge after 3 seconds
    const timer = setTimeout(() => {
      setShowBadge(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const addMessage = (text: string, sender: 'user' | 'bot') => {
    const newMessage: Message = {
      id: Date.now().toString(),
      text,
      sender,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  const handleSend = async () => {
    if (!inputValue.trim() || isSending) return;

    const userMessage = inputValue.trim();
    
    console.log('📤 Envoi du message:', userMessage);
    
    // Add user message to UI
    addMessage(userMessage, 'user');
    setInputValue('');
    setIsSending(true);

    // 🔥 ENVOI AU BACKEND SUPABASE
    try {
      const url = `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/chat/send`;
      console.log('🔗 URL backend:', url);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          name: 'Visiteur Web',
          email: 'visiteur@smartcabb.cd',
          message: userMessage,
          page: window.location.pathname,
          source: 'chat_widget',
          language: language,
        }),
      });

      console.log('📡 Réponse HTTP status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Message envoyé au backend avec succès:', data);
        
        // 🤖 Afficher indicateur "typing..." immédiatement
        setIsTyping(true);
        
        // 🤖 Afficher la réponse automatique intelligente RAPIDEMENT
        if (data.autoReply && data.autoReply.message) {
          console.log('🤖 Réponse auto détectée:', data.autoReply.category);
          // Petit délai de 200ms pour simuler que le bot "réfléchit"
          setTimeout(() => {
            setIsTyping(false);
            addMessage(data.autoReply.message, 'bot');
            setIsSending(false);
          }, 200);
        } else {
          console.log('⚠️ Pas de réponse auto, utilisation du fallback');
          // Fallback à l'ancienne réponse
          setTimeout(() => {
            setIsTyping(false);
            addMessage(
              'Merci pour votre message ! Notre équipe SmartCabb vous répondra dans les plus brefs délais. Pour une assistance immédiate, appelez le +243 990 666 661.',
              'bot'
            );
            setIsSending(false);
          }, 200);
        }
      } else {
        const errorText = await response.text();
        console.error('❌ Erreur lors de l\'envoi au backend:', response.status, errorText);
        setIsSending(false);
        setIsTyping(false);
        
        // Afficher un message d'erreur à l'utilisateur
        addMessage(
          'Désolé, une erreur s\'est produite. Notre équipe a été notifiée. Pour une assistance immédiate, appelez le +243 990 666 661.',
          'bot'
        );
      }
    } catch (error) {
      console.error('❌ Erreur réseau lors de l\'envoi du message:', error);
      // On continue même si l'envoi échoue, l'utilisateur voit quand même son message
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        addMessage(
          'Merci pour votre message ! Notre équipe SmartCabb vous répondra dans les plus brefs délais. Pour une assistance immédiate, appelez le +243 990 666 661.',
          'bot'
        );
        setIsSending(false);
      }, 200);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  const toggleChat = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setShowBadge(false);
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-[99999]">
      {/* Chat Window */}
      {isOpen && (
        <div className="absolute bottom-20 right-0 w-[360px] max-w-[calc(100vw-40px)] h-[500px] max-h-[calc(100vh-120px)] bg-white rounded-[20px] shadow-[0_10px_40px_rgba(0,0,0,0.15)] flex flex-col overflow-hidden animate-slideUp">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#00BFA5] to-[#00A890] text-white p-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="text-2xl">💬</div>
              <div>
                <h3 className="m-0 text-lg font-semibold">SmartCabb Support</h3>
                <p className="m-0 text-sm opacity-90">Nous sommes là pour vous</p>
              </div>
            </div>
            <button
              onClick={toggleChat}
              className="bg-white/20 hover:bg-white/30 border-none text-white w-8 h-8 rounded-lg cursor-pointer flex items-center justify-center transition-colors"
              aria-label="Fermer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 bg-[#F8F9FA]">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-[#6B7280] text-center">
                <div className="text-5xl mb-4 opacity-50">💬</div>
                <p>Écrivez-nous un message</p>
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`mb-4 flex ${
                      message.sender === 'user' ? 'justify-end' : 'justify-start'
                    } animate-[fadeIn_0.3s_ease]`}
                  >
                    <div
                      className={`max-w-[75%] p-3 rounded-[18px] text-sm leading-relaxed ${
                        message.sender === 'user'
                          ? 'bg-gradient-to-r from-[#00BFA5] to-[#00A890] text-white rounded-br-sm'
                          : 'bg-white text-[#1a1a1a] rounded-bl-sm shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
                      }`}
                    >
                      {message.text}
                      <div className="text-xs mt-1 opacity-70 text-right">
                        {message.timestamp.toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Indicateur "typing..." */}
                {isTyping && (
                  <div className="mb-4 flex justify-start animate-[fadeIn_0.2s_ease]">
                    <div className="bg-white p-3 rounded-[18px] rounded-bl-sm shadow-[0_2px_8px_rgba(0,0,0,0.08)] flex items-center gap-1">
                      <div className="w-2 h-2 bg-[#00BFA5] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-[#00BFA5] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-[#00BFA5] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input */}
          <div className="p-4 bg-white border-t border-[#E5E7EB] flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Votre message..."
              disabled={isSending}
              className="flex-1 px-4 py-3 border-2 border-[#E5E7EB] rounded-[25px] text-sm outline-none focus:border-[#00BFA5] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Message"
            />
            <button
              onClick={handleSend}
              disabled={isSending || !inputValue.trim()}
              className="w-11 h-11 rounded-full border-none cursor-pointer flex items-center justify-center transition-all bg-gradient-to-r from-[#00BFA5] to-[#00A890] text-white hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              aria-label="Envoyer"
            >
              {isSending ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send size={20} />
              )}
            </button>
          </div>
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={toggleChat}
        className="w-[60px] h-[60px] rounded-full bg-gradient-to-r from-[#00BFA5] to-[#00A890] border-none text-white cursor-pointer shadow-[0_4px_20px_rgba(0,191,165,0.4)] flex items-center justify-center transition-all hover:scale-110 hover:shadow-[0_6px_25px_rgba(0,191,165,0.5)] relative"
        aria-label="Ouvrir le chat"
      >
        {isOpen ? (
          <X size={24} />
        ) : (
          <>
            <MessageCircle size={24} />
            {showBadge && !isOpen && (
              <span className="absolute -top-1 -right-1 bg-[#FF4757] text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 border-white animate-pulse">
                💬
              </span>
            )}
          </>
        )}
      </button>

      {/* Animations CSS */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes slideUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          .animate-slideUp {
            animation: slideUp 0.3s ease;
          }

          @media (max-width: 480px) {
            .chat-window-mobile {
              width: calc(100vw - 20px) !important;
              height: calc(100vh - 100px) !important;
              bottom: 70px !important;
            }
          }
        `
      }} />
    </div>
  );
}
