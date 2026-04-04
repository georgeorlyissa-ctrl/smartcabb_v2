import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send } from '../lib/icons';
import { useLanguage } from '../contexts/LanguageContext';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

// 🤖 SYSTÈME DE RÉPONSES INTELLIGENTES - Base de connaissances SmartCabb
const SMARTCABB_KNOWLEDGE = {
  // Questions sur les prix
  prix: {
    keywords: ['prix', 'tarif', 'coût', 'combien', 'coute', 'payer', 'montant', 'price', 'cost', 'fare'],
    fr: `Nos Tarifs SmartCabb (en Franc Congolais):

SmartCabb Standard - Véhicules économiques
• Course simple: 2,500 CDF/km
• Course à l'heure: 50,000 CDF/h

SmartCabb Confort - Voitures confortables
• Course simple: 5,000 CDF/km
• Course à l'heure: 100,000 CDF/h

SmartCabb Plus - Véhicules familiaux (7 places)
• Course simple: 7,500 CDF/km
• Course à l'heure: 150,000 CDF/h

SmartCabb Business - Voitures de luxe avec chauffeur
• Location journée: 500,000 CDF/jour

Tarifs de nuit (22h-5h): +50%
Minimum de facturation: 2km ou 10 minutes`,
    en: `SmartCabb Pricing (in Congolese Francs):

SmartCabb Standard - Economy vehicles
• Per-km: 2,500 CDF/km
• Hourly: 50,000 CDF/h

SmartCabb Confort - Comfortable cars
• Per-km: 5,000 CDF/km
• Hourly: 100,000 CDF/h

SmartCabb Plus - Family vehicles (7 seats)
• Per-km: 7,500 CDF/km
• Hourly: 150,000 CDF/h

SmartCabb Business - Luxury cars with driver
• Daily rental: 500,000 CDF/day

Night rates (10pm-5am): +50%
Minimum charge: 2km or 10 minutes`
  },

  // Questions sur comment devenir chauffeur
  chauffeur: {
    keywords: ['chauffeur', 'conducteur', 'devenir', 'inscription', 'driver', 'become', 'requirements', 'requis'],
    fr: `Devenir Chauffeur SmartCabb:

Conditions requises:
• Permis de conduire valide
• Véhicule en bon état
• Casier judiciaire vierge
• Âge minimum 21 ans

Avantages:
• Revenus attractifs et flexibles
• Horaires que vous choisissez
• Assurance incluse
• Formation gratuite
• Support 24/7

Inscription en 4 étapes:
1. Remplir le formulaire en ligne
2. Vérification de vos documents
3. Formation gratuite à l'app
4. Commencer à gagner!

Inscrivez-vous sur: smartcabb.com/chauffeurs
Appelez le: +243 990 666 661`,
    en: `Become a SmartCabb Driver:

Requirements:
• Valid driver's license
• Vehicle in good condition
• Clean criminal record
• Minimum age 21 years

Benefits:
• Attractive flexible income
• Choose your own hours
• Insurance included
• Free training
• 24/7 support

Sign up in 4 steps:
1. Fill out online form
2. Document verification
3. Free app training
4. Start earning!

Sign up at: smartcabb.com/drivers
Call: +243 990 666 661`
  },

  // Questions sur les zones de service
  zones: {
    keywords: ['zone', 'ville', 'secteur', 'où', 'disponible', 'areas', 'where', 'coverage', 'kinshasa'],
    fr: `Zones de Service SmartCabb:

Nous opérons actuellement à Kinshasa, RDC:

Communes couvertes:
• Gombe (centre d'affaires)
• Ngaliema
• Limete
• Kalamu
• Kintambo
• Et toutes les autres communes de Kinshasa

Expansion prévue:
Nous prévoyons d'étendre nos services à Lubumbashi, Matadi et Kisangani prochainement!

Utilisez l'app pour vérifier la disponibilité dans votre quartier.`,
    en: `SmartCabb Service Areas:

We currently operate in Kinshasa, DRC:

Covered communes:
• Gombe (business district)
• Ngaliema
• Limete
• Kalamu
• Kintambo
• And all other Kinshasa communes

Planned expansion:
We plan to expand to Lubumbashi, Matadi, and Kisangani soon!

Use the app to check availability in your area.`
  },

  // Questions sur l'application
  app: {
    keywords: ['application', 'app', 'télécharger', 'installer', 'download', 'mobile', 'smartphone'],
    fr: `Application SmartCabb:

Version Web:
Accédez directement sur: smartcabb.com
Aucun téléchargement nécessaire!

Application Mobile:
• Bientôt disponible sur Play Store
• Bientôt disponible sur App Store

Fonctionnalités:
• Réservation en quelques clics
• Estimation de prix en temps réel
• Suivi GPS de votre chauffeur
• Paiement mobile money
• Historique de vos courses
• Support client intégré

En attendant, utilisez notre site web qui fonctionne parfaitement sur mobile!`,
    en: `SmartCabb App:

Web Version:
Access directly at: smartcabb.com
No download required!

Mobile App:
• Coming soon on Play Store
• Coming soon on App Store

Features:
• Book in a few clicks
• Real-time price estimates
• GPS tracking of your driver
• Mobile money payment
• Trip history
• Integrated customer support

Meanwhile, use our website which works perfectly on mobile!`
  },

  // Questions sur le paiement
  paiement: {
    keywords: ['paiement', 'payer', 'payment', 'mobile money', 'airtel', 'orange', 'mpesa', 'carte', 'card'],
    fr: `Modes de Paiement SmartCabb:

Mobile Money (principal):
• Airtel Money
• Orange Money
• M-Pesa
• Afrimoney

Autres moyens:
• Espèces (cash)
• Carte bancaire (bientôt)

Sécurité:
Tous les paiements sont 100% sécurisés et cryptés.

Comment ça marche:
1. Terminez votre course
2. Recevez le montant exact
3. Payez via votre mobile money
4. Recevez votre reçu par SMS

Pas de frais cachés, prix transparents!`,
    en: `SmartCabb Payment Methods:

Mobile Money (primary):
• Airtel Money
• Orange Money
• M-Pesa
• Afrimoney

Other methods:
• Cash
• Bank card (coming soon)

Security:
All payments are 100% secure and encrypted.

How it works:
1. Complete your ride
2. Receive exact amount
3. Pay via mobile money
4. Receive receipt by SMS

No hidden fees, transparent pricing!`
  },

  // Questions sur la sécurité
  securite: {
    keywords: ['sécurité', 'sûr', 'sécurisé', 'security', 'safe', 'protection', 'danger'],
    fr: `Votre Sécurité avec SmartCabb:

Vérification des chauffeurs:
• Casier judiciaire vérifié
• Permis de conduire validé
• Formation obligatoire
• Évaluations par les passagers

Véhicules contrôlés:
• Inspection technique régulière
• Assurance valide
• GPS tracking en temps réel

Fonctionnalités de sécurité:
• Partage de trajet en temps réel
• Bouton d'urgence dans l'app
• Support 24/7
• Enregistrement de tous les trajets

Urgence: +243 990 666 661

Votre sécurité est notre priorité absolue!`,
    en: `Your Safety with SmartCabb:

Driver verification:
• Criminal record checked
• Driver's license validated
• Mandatory training
• Passenger ratings

Controlled vehicles:
• Regular technical inspection
• Valid insurance
• Real-time GPS tracking

Safety features:
• Live trip sharing
• Emergency button in app
• 24/7 support
• All trips recorded

Emergency: +243 990 666 661

Your safety is our top priority!`
  },

  // Questions sur le contact
  contact: {
    keywords: ['contact', 'téléphone', 'email', 'joindre', 'appeler', 'call', 'reach', 'support'],
    fr: `Contacter SmartCabb:

Support Client 24/7:
Téléphone: +243 990 666 661
Email: support@smartcabb.cd
Chat: Directement sur ce chat!

Réseaux sociaux:
Facebook: /SmartCabbRDC
Instagram: @smartcabb_cd
Twitter: @SmartCabb

Siège social:
Kinshasa, République Démocratique du Congo

Horaires:
Disponible 24h/24, 7j/7

Pour une réponse immédiate, appelez-nous ou utilisez ce chat!`,
    en: `Contact SmartCabb:

24/7 Customer Support:
Phone: +243 990 666 661
Email: support@smartcabb.cd
Chat: Right here in this chat!

Social Media:
Facebook: /SmartCabbRDC
Instagram: @smartcabb_cd
Twitter: @SmartCabb

Headquarters:
Kinshasa, Democratic Republic of Congo

Hours:
Available 24/7

For immediate response, call us or use this chat!`
  },

  // Salutations
  salutation: {
    keywords: ['bonjour', 'salut', 'hello', 'hi', 'hey', 'bonsoir'],
    fr: `Bonjour! Bienvenue sur SmartCabb!

Je suis votre assistant virtuel. Je peux vous aider avec:

• Informations sur nos services
• Tarifs et estimations
• Devenir chauffeur
• L'application SmartCabb
• Modes de paiement
• Sécurité et garanties
• Contact et support

Comment puis-je vous aider aujourd'hui?`,
    en: `Hello! Welcome to SmartCabb!

I'm your virtual assistant. I can help you with:

• Information about our services
• Pricing and estimates
• Becoming a driver
• SmartCabb app
• Payment methods
• Safety and guarantees
• Contact and support

How can I help you today?`
  },

  // Merci
  merci: {
    keywords: ['merci', 'thank', 'thanks', 'thanks you'],
    fr: `Avec plaisir! N'hésitez pas si vous avez d'autres questions!

Prêt à commander? Rendez-vous sur smartcabb.com
Besoin d'aide? Appelez le +243 990 666 661

Bonne journée!`,
    en: `You're welcome! Don't hesitate if you have other questions!

Ready to book? Go to smartcabb.com
Need help? Call +243 990 666 661

Have a great day!`
  }
};

// 🧠 Fonction pour trouver la meilleure réponse
function findBestResponse(message: string, language: 'fr' | 'en'): string | null {
  const lowerMessage = message.toLowerCase();
  
  // Parcourir toutes les catégories de réponses
  for (const [category, data] of Object.entries(SMARTCABB_KNOWLEDGE)) {
    // Vérifier si un mot-clé correspond
    const hasKeyword = data.keywords.some(keyword => lowerMessage.includes(keyword));
    
    if (hasKeyword) {
      return data[language];
    }
  }
  
  return null;
}

interface ChatWidgetProps {
  // Le language sera détecté automatiquement depuis le contexte
}

export function ChatWidget({}: ChatWidgetProps) {
  const { language } = useLanguage(); // 🌍 Détection automatique de la langue
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
    
    console.log('📤 Message utilisateur:', userMessage);
    
    // Ajouter le message utilisateur à l'UI
    addMessage(userMessage, 'user');
    setInputValue('');
    setIsSending(true);

    // 🧠 RÉPONSE INTELLIGENTE LOCALE (rapide et sans backend)
    setIsTyping(true);
    
    // Délai de 300ms pour simuler la réflexion du bot
    setTimeout(() => {
      const smartResponse = findBestResponse(userMessage, language);
      
      if (smartResponse) {
        // ✅ Réponse intelligente trouvée!
        console.log('🤖 Réponse intelligente générée localement');
        addMessage(smartResponse, 'bot');
      } else {
        // ❓ Aucune réponse trouvée, utiliser le fallback
        console.log('💭 Aucune correspondance, utilisation du fallback');
        const fallbackMessage = language === 'fr' 
          ? `Je suis désolé, je n'ai pas compris votre question. 

Voici ce que je peux vous aider:

• Nos services et tarifs
• Devenir chauffeur
• L'application
• Modes de paiement
• Sécurité
• Contact

Pour une assistance personnalisée:
Téléphone: +243 990 666 661
Email: support@smartcabb.cd`
          : `I'm sorry, I didn't understand your question.

Here's what I can help you with:

• Our services and pricing
• Becoming a driver
• The app
• Payment methods
• Safety
• Contact

For personalized assistance:
Phone: +243 990 666 661
Email: support@smartcabb.cd`;
        
        addMessage(fallbackMessage, 'bot');
      }
      
      setIsTyping(false);
      setIsSending(false);
    }, 300);
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
