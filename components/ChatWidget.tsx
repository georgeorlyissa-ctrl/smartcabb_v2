import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send } from '../lib/icons';
import { useLanguage } from '../contexts/LanguageContext';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  quickReplies?: { label: string; value: string }[];
}

interface QuickReply {
  label: string;
  value: string;
}

const QUICK_REPLIES: Record<string, { fr: QuickReply[]; en: QuickReply[] }> = {
  welcome: {
    fr: [
      { label: 'Tarifs', value: 'Quels sont vos tarifs ?' },
      { label: 'Devenir chauffeur', value: 'Comment devenir chauffeur ?' },
      { label: 'Zones', value: 'Où êtes-vous disponible ?' },
      { label: 'Application', value: 'Comment télécharger l\'app ?' },
      { label: 'Paiement', value: 'Comment payer ?' },
      { label: 'Contact', value: 'Contact support' },
    ],
    en: [
      { label: 'Pricing', value: 'What are your prices?' },
      { label: 'Become driver', value: 'How to become a driver?' },
      { label: 'Areas', value: 'Where are you available?' },
      { label: 'App', value: 'How to download the app?' },
      { label: 'Payment', value: 'How to pay?' },
      { label: 'Contact', value: 'Contact support' },
    ],
  },
  prix: {
    fr: [
      { label: 'Standard', value: 'Prix course standard' },
      { label: 'Confort', value: 'Prix confort' },
      { label: 'Plus (7 places)', value: 'Prix SmartCabb Plus' },
      { label: 'Business', value: 'Prix business' },
      { label: 'Tarifs de nuit', value: 'Tarifs de nuit' },
    ],
    en: [
      { label: 'Standard', value: 'Standard price' },
      { label: 'Confort', value: 'Confort price' },
      { label: 'Plus', value: 'SmartCabb Plus price' },
      { label: 'Business', value: 'Business price' },
      { label: 'Night rates', value: 'Night rates' },
    ],
  },
};

const SMARTCABB_KNOWLEDGE = {
  prix: {
    keywords: ['prix', 'tarif', 'coût', 'combien', 'coute', 'payer', 'montant', 'price', 'cost', 'fare', 'facturation', 'minimum', 'smartcabb standard', 'smartcabb confort', 'smartcabb plus', 'smartcabb business', 'course standard', 'course confort', 'course plus', 'course business'],
    fr: `Nos tarifs sont calculés en francs congolais selon la catégorie de véhicule.

Le SmartCabb Standard, économique, revient à 2 500 CDF par kilomètre ou 50 000 CDF de l'heure. Le Confort coûte 5 000 CDF/km ou 100 000 CDF/heure. Pour les familles ou les groupes, le SmartCabb Plus (7 places) est à 7 500 CDF/km ou 150 000 CDF/heure. Et si vous souhaitez plus de confort, le SmartCabb Business est disponible en location à la journée pour 500 000 CDF.

À noter qu'un supplément de 50% s'applique la nuit, entre 22h et 5h, et que la facturation minimum est de 2 km ou 10 minutes.`,
    en: `Our prices are calculated in Congolese francs based on the vehicle category.

SmartCabb Standard, our economy option, is 2,500 CDF per kilometer or 50,000 CDF per hour. Confort is 5,000 CDF/km or 100,000 CDF/hour. For families or groups, SmartCabb Plus (7 seats) is 7,500 CDF/km or 150,000 CDF/hour. And if you'd like something more upscale, SmartCabb Business is available as a daily rental for 500,000 CDF.

Keep in mind that a 50% surcharge applies at night, between 10pm and 5am, and the minimum charge is 2km or 10 minutes.`
  },

  chauffeur: {
    keywords: ['chauffeur', 'conducteur', 'devenir', 'inscription', 'driver', 'become', 'requirements', 'requis', 'postuler', 'candidature', 'recrutement', 'embauche', 'combien de chauffeur', 'combien de chauffeurs', 'combien des chauffeur', 'nombre de chauffeur'],
    fr: `Pour devenir chauffeur chez SmartCabb, il vous faut un permis de conduire valide, un véhicule en bon état, un casier judiciaire vierge et au moins 21 ans.

En échange, on vous propose des revenus flexibles, des horaires que vous choisissez vous-même, une assurance incluse, une formation gratuite et un support disponible à tout moment.

L'inscription se fait en quatre étapes : vous remplissez le formulaire en ligne sur smartcabb.com/chauffeurs, on vérifie vos documents, vous suivez une courte formation à l'application, puis vous pouvez commencer à rouler.

Pour toute question, vous pouvez nous appeler au +243 960 624 008.`,
    en: `To become a SmartCabb driver, you'll need a valid driver's license, a vehicle in good condition, a clean criminal record, and to be at least 21 years old.

In return, we offer flexible income, hours you choose yourself, insurance included, free training, and support available at all times.

Signing up takes four steps: you fill out the online form at smartcabb.com/drivers, we verify your documents, you go through a short app training, and then you can start earning.

For any questions, feel free to call us at +243 960 624 008.`
  },

  zones: {
    keywords: ['zone', 'ville', 'secteur', 'où', 'disponible', 'areas', 'where', 'coverage', 'kinshasa', 'commune', 'quartier', 'localisation', 'endroit'],
    fr: `SmartCabb est actuellement disponible à Kinshasa, en République Démocratique du Congo, et couvre la plupart des communes : Gombe, Ngaliema, Limete, Kalamu, Kintambo, et bien d'autres.

Nous prévoyons d'étendre le service à Lubumbashi, Matadi et Kisangani dans les prochains mois. En attendant, la meilleure façon de vérifier la disponibilité dans votre quartier reste d'utiliser directement l'application.`,
    en: `SmartCabb is currently available in Kinshasa, Democratic Republic of Congo, and covers most communes: Gombe, Ngaliema, Limete, Kalamu, Kintambo, and many others.

We're planning to expand to Lubumbashi, Matadi and Kisangani in the coming months. In the meantime, the best way to check availability in your area is to use the app directly.`
  },

  app: {
    keywords: ['application', 'app', 'télécharger', 'installer', 'download', 'mobile', 'smartphone', 'site', 'web', 'site web'],
    fr: `Vous pouvez utiliser SmartCabb directement depuis votre navigateur, sur smartcabb.com, sans rien installer. Le site fonctionne très bien sur mobile.

Une application native sera bientôt disponible sur le Play Store et l'App Store. En attendant, vous avez déjà accès à la réservation en quelques clics, à l'estimation du prix en temps réel, au suivi GPS du chauffeur, au paiement par mobile money, à votre historique de courses et à notre support intégré.`,
    en: `You can use SmartCabb directly from your browser at smartcabb.com, no installation needed. The site works great on mobile.

A native app will be available soon on the Play Store and App Store. In the meantime, you already have access to booking in a few clicks, real-time price estimates, GPS driver tracking, mobile money payment, your trip history, and our built-in support.`
  },

  paiement: {
    keywords: ['paiement', 'payer', 'payment', 'mobile money', 'airtel money', 'orange money', 'mpesa', 'afrimoney', 'carte', 'card', 'espèces', 'cash', 'monnaie', 'facture', 'reçu', 'recu', 'receipt'],
    fr: `Chez SmartCabb, vous pouvez régler votre course principalement via mobile money : Airtel Money, Orange Money, M-Pesa ou Afrimoney. Le paiement en espèces est aussi accepté, et la carte bancaire arrivera bientôt.

Tous les paiements sont sécurisés et nos prix sont transparents, sans frais cachés. Une fois votre course terminée, le montant exact vous est communiqué, vous payez via votre mobile money, et vous recevez votre reçu par SMS.`,
    en: `At SmartCabb, you can pay for your ride mainly through mobile money: Airtel Money, Orange Money, M-Pesa or Afrimoney. Cash is also accepted, and card payments are coming soon.

All payments are secure and our prices are transparent, with no hidden fees. Once your ride is complete, you'll see the exact amount, pay via mobile money, and receive your receipt by SMS.`
  },

  reservation: {
    keywords: ['réservation', 'reservation', 'commander', 'réserver', 'reserver', 'commande', 'book', 'booking', 'course', 'trajet', 'voyage', 'commander une course'],
    fr: `Réserver une course chez SmartCabb est simple. Rendez-vous sur smartcabb.com, cliquez sur Commander, indiquez votre adresse de départ puis votre destination, choisissez le véhicule qui vous convient et confirmez.

Vous pouvez aussi nous appeler directement au +243 960 624 008. Petit conseil : passez par le site pour avoir une estimation du prix avant même de réserver.`,
    en: `Booking a SmartCabb ride is simple. Go to smartcabb.com, click Book Now, enter your pickup address and your destination, choose the vehicle that suits you, and confirm.

You can also call us directly at +243 960 624 008. A tip: use the website to get a price estimate before you even book.`
  },

  annulation: {
    keywords: ['annulation', 'annuler', 'cancel', 'cancellation', 'remboursement', 'refund', 'rembourser', 'annulé'],
    fr: `Si vous devez annuler une course, sachez que c'est gratuit tant que le chauffeur n'est pas encore arrivé. Une fois sur place, l'annulation entraîne des frais de 2 000 CDF, et si la course a déjà commencé, elle reste due.

En cas de remboursement, le traitement prend généralement entre 24 et 48 heures et l'argent est recrédité sur votre compte mobile money. Pour toute question, contactez-nous au +243 960 624 008.`,
    en: `If you need to cancel a ride, it's free as long as the driver hasn't arrived yet. Once they're on site, cancelling costs a 2,000 CDF fee, and if the ride has already started, it remains payable.

If a refund is involved, it's usually processed within 24 to 48 hours and credited back to your mobile money account. For any questions, reach out to us at +243 960 624 008.`
  },

  securite: {
    keywords: ['sécurité', 'sûr', 'sécurisé', 'security', 'safe', 'protection', 'danger', 'urgence', 'emergency', 'agression', 'accident', 'crime'],
    fr: `Votre sécurité est une priorité chez SmartCabb. Chaque chauffeur passe par une vérification de son casier judiciaire et de son permis, suit une formation obligatoire et est noté par les passagers après chaque course.

Les véhicules sont régulièrement inspectés et assurés, et chaque trajet est suivi par GPS. Vous pouvez aussi partager votre trajet en temps réel avec un proche, et un bouton d'urgence est disponible dans l'application. Notre support reste joignable à tout moment au +243 960 624 008.`,
    en: `Your safety is a priority at SmartCabb. Every driver goes through a criminal record check and license verification, completes mandatory training, and is rated by passengers after each ride.

Vehicles are regularly inspected and insured, and every trip is tracked by GPS. You can also share your trip in real time with someone you trust, and an emergency button is available in the app. Our support team can be reached at any time at +243 960 624 008.`
  },

  contact: {
    keywords: ['contact', 'téléphone', 'email', 'joindre', 'appeler', 'call', 'reach', 'support', 'aide', 'help', 'service client', 'hotline', 'whatsapp'],
    fr: `Vous pouvez nous joindre par téléphone au +243 960 624 008, par email à admin@smartcabb.com, ou directement ici dans ce chat.

Vous nous retrouverez aussi sur Facebook (SmartCabbRDC) et Instagram (smartcabb_cd). Notre siège se trouve à Kinshasa. Pour une réponse rapide, le téléphone ou ce chat restent les options les plus efficaces.`,
    en: `You can reach us by phone at +243 960 624 008, by email at admin@smartcabb.com, or right here in this chat.

You'll also find us on Facebook (SmartCabbRDC) and Instagram (smartcabb_cd). Our headquarters are in Kinshasa. For a fast response, calling or using this chat are your best options.`
  },

  bagages: {
    keywords: ['bagage', 'bagages', 'valise', 'sac', 'luggage', 'baggage', 'colis', 'chargement'],
    fr: `Vos bagages personnels sont transportés gratuitement, quelle que soit la catégorie de véhicule, et le chauffeur vous aide au chargement comme au déchargement.

Pour des bagages plus volumineux, mieux vaut choisir le SmartCabb Plus et prévenir le chauffeur au moment de la réservation. Sachez aussi que vous restez responsable de vos objets de valeur : nous ne pouvons pas être tenus responsables des effets oubliés dans le véhicule.`,
    en: `Your personal luggage travels free of charge regardless of vehicle category, and the driver helps with loading and unloading.

For larger luggage, it's best to choose SmartCabb Plus and let the driver know when booking. Keep in mind you remain responsible for your valuables: we can't be held liable for items left in the vehicle.`
  },

  animaux: {
    keywords: ['animal', 'animaux', 'chien', 'chat', 'pet', 'petit', 'animal domestique'],
    fr: `Les petits animaux voyagent gratuitement avec vous, à condition d'être dans un sac de transport adapté. Les chiens guides pour personnes handicapées sont bien sûr toujours acceptés, sans restriction.

Pour un animal plus grand, le mieux est de nous appeler au +243 960 624 008 afin qu'on organise un véhicule adapté. Pensez simplement à prévenir le chauffeur lors de la réservation.`,
    en: `Small pets can travel with you free of charge, as long as they're in a suitable carrier. Guide dogs for people with disabilities are always welcome, no restrictions.

For larger animals, it's best to call us at +243 960 624 008 so we can arrange a suitable vehicle. Just remember to let the driver know when booking.`
  },

  horaires: {
    keywords: ['horaire', 'heure', 'temps', 'ouvert', 'fermé', '24h', '24/7', 'hours', 'schedule', 'disponibilité', 'disponibilite', 'attente', 'wait', 'temps d\'attente'],
    fr: `SmartCabb fonctionne 24 heures sur 24, 7 jours sur 7, toute l'année, et notre support aussi. Un supplément de 50% s'applique entre 22h et 5h.

Le temps d'attente moyen à Kinshasa tourne autour de 5 à 15 minutes, et peut monter jusqu'à 20 minutes aux heures de pointe. En période de forte demande, l'attente peut être un peu plus longue, merci pour votre compréhension.`,
    en: `SmartCabb operates 24/7, all year round, and so does our support team. A 50% surcharge applies between 10pm and 5am.

The average wait time in Kinshasa is around 5 to 15 minutes, and can go up to 20 minutes during peak hours. During periods of high demand, waiting may take a bit longer, thank you for your understanding.`
  },

  reclamation: {
    keywords: ['réclamation', 'reclamation', 'plainte', 'complain', 'probleme', 'problem', 'problème', 'insatisfait', 'objet perdu', 'perdu', 'lost', 'found'],
    fr: `Pour toute réclamation, écrivez-nous à admin@smartcabb.com ou appelez le +243 960 624 008.

Si vous avez perdu un objet, contactez-nous rapidement en précisant la date et l'heure de votre course, nous nous chargeons de joindre le chauffeur. En général, votre demande sera traitée en 24 à 48 heures et vous recevrez une réponse par SMS ou par email.`,
    en: `For any complaint, write to us at admin@smartcabb.com or call +243 960 624 008.

If you've lost an item, contact us quickly with the date and time of your ride, and we'll reach out to the driver. Your request is usually handled within 24 to 48 hours, and you'll get a response by SMS or email.`
  },

  services: {
    keywords: ['service', 'offre', 'offer', 'proposez', 'options', 'véhicule', 'vehicule', 'voiture', 'categorie', 'catégorie', 'gamme', 'type'],
    fr: `Chez SmartCabb, on propose quatre catégories de véhicules. Le Standard, économique, convient bien aux trajets du quotidien. Le Confort offre plus de climatisation et de confort pour le travail ou les sorties. Le Plus, avec ses 7 places, est pensé pour les familles ou les groupes. Et le Business, en location à la journée, s'adresse à ceux qui veulent un chauffeur privé et un véhicule haut de gamme.

Tous nos services incluent l'assurance, le suivi GPS, la sécurité et le paiement mobile money.`,
    en: `At SmartCabb, we offer four vehicle categories. Standard, our economy option, is great for everyday trips. Confort offers more air conditioning and comfort for work or outings. Plus, with its 7 seats, is designed for families or groups. And Business, available as a daily rental, is for those who want a private driver and an upscale vehicle.

All our services include insurance, GPS tracking, safety features, and mobile money payment.`
  },

  parc: {
    keywords: ['combien', 'vehicule', 'véhicule', 'voiture', 'combien de vehicule', 'combien des vehicule', 'combien de voiture', 'combien des voiture', 'parc', 'flotte', 'fleet', 'nombre de vehicule', 'nombre de voiture', 'nombre de véhicule', 'effectif', 'taille de la flotte'],
    fr: `Notre flotte se compose de berlines économiques pour le Standard, de berlines climatisées pour le Confort, de minibus 7 places pour le Plus, et de véhicules haut de gamme pour le Business.

Elle est entretenue et renouvelée régulièrement, et nous comptons des centaines de chauffeurs partenaires à Kinshasa, avec une capacité qui s'adapte à la demande. Pour plus de détails, vous pouvez nous appeler au +243 960 624 008.`,
    en: `Our fleet includes economy sedans for Standard, air-conditioned sedans for Confort, 7-seat minibuses for Plus, and upscale vehicles for Business.

It's regularly maintained and renewed, and we have hundreds of partner drivers in Kinshasa, with capacity that scales with demand. For more details, feel free to call us at +243 960 624 008.`
  },

  salutation: {
    keywords: ['bonjour', 'salut', 'hello', 'hi', 'hey', 'bonsoir', 'bonne nuit', 'bon matin', 'good morning', 'good evening', 'comment tu vas', 'comment allez vous', 'comment ça va', 'ça va', 'how are you', 'comment vas tu', 'quoi de neuf', 'what\'s up', 'wesh', 'cc', 'salutations'],
    fr: `Bonjour, je vais très bien, merci ! Et vous ?

Je suis l'assistant SmartCabb et je peux vous renseigner sur nos tarifs, sur la manière de devenir chauffeur partenaire, sur nos zones de service, sur l'application ou sur les moyens de paiement. Comment puis-je vous aider ?`,
    en: `Hello, I'm doing great, thank you! And you?

I'm the SmartCabb assistant, and I can help you with pricing, becoming a partner driver, our service areas, the app, or payment methods. How can I help you?`
  },

  merci: {
    keywords: ['merci', 'thank', 'thanks', 'thank you', 'merci beaucoup', 'thanks a lot'],
    fr: `Avec plaisir. N'hésitez pas si vous avez d'autres questions.

Pour réserver, rendez-vous sur smartcabb.com, et pour toute aide, appelez le +243 960 624 008. Bonne journée !`,
    en: `You're welcome. Don't hesitate if you have other questions.

To book, go to smartcabb.com, and for any help, call +243 960 624 008. Have a great day!`
  },

  au_revoir: {
    keywords: ['au revoir', 'bye', 'goodbye', 'à bientôt', 'a bientot', 'ciao', 'adieu', 'bonne journée'],
    fr: `Merci d'avoir contacté SmartCabb, nous restons disponibles 24h/24 si besoin.

Téléphone : +243 960 624 008
Email : admin@smartcabb.com

À bientôt sur smartcabb.com !`,
    en: `Thank you for contacting SmartCabb, we remain available 24/7 if you need us.

Phone: +243 960 624 008
Email: admin@smartcabb.com

See you soon on smartcabb.com!`
  }
};

// Score de pertinence pour chaque catégorie
function scoreMessage(message: string): { category: string; score: number }[] {
  if (typeof message !== 'string' || !message) return [];
  const lower = message.toLowerCase();
  const scores: { category: string; score: number }[] = [];

  for (const [category, data] of Object.entries(SMARTCABB_KNOWLEDGE)) {
    let score = 0;
    const words = lower.split(/\s+/);

    for (const keyword of data.keywords) {
      if (typeof keyword !== 'string') continue;
      const kw = keyword.toLowerCase();
      // Exact match de mot
      if (words.includes(kw)) {
        score += 3;
      }
      // Inclusion partielle
      else if (lower.includes(kw)) {
        score += 2;
      }
      // Correspondance de début de mot
      else if (words.some((w: string) => typeof w === 'string' && (w.startsWith(kw) || kw.startsWith(w)))) {
        score += 1;
      }
    }

    if (score > 0) {
      scores.push({ category, score });
    }
  }

  return scores.sort((a, b) => b.score - a.score);
}

// Trouve la meilleure réponse avec priorisation
function findBestResponse(message: string, language: 'fr' | 'en', lastCategory?: string): { text: string; category?: string } | null {
  const scores = scoreMessage(message);

  if (scores.length > 0) {
    const best = scores[0];
    const data = SMARTCABB_KNOWLEDGE[best.category as keyof typeof SMARTCABB_KNOWLEDGE];
    return { text: data[language], category: best.category };
  }

  // Fallback quand rien n'est reconnu
  return null;
}

export function ChatWidget() {
  const { language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [showBadge, setShowBadge] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [welcomeSent, setWelcomeSent] = useState(false);
  const [lastCategory, setLastCategory] = useState<string | undefined>();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowBadge(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  // Message de bienvenue à l'ouverture du chat
  useEffect(() => {
    if (isOpen && !welcomeSent && messages.length === 0) {
      setWelcomeSent(true);
      const welcome = language === 'fr'
        ? `Bonjour, bienvenue chez SmartCabb !

Je suis l'assistant virtuel et je peux vous renseigner sur nos tarifs, sur la manière de devenir chauffeur partenaire, sur nos zones de service, sur l'application, sur les moyens de paiement ou sur toute autre question.

Comment puis-je vous aider aujourd'hui ?`
        : `Hello, welcome to SmartCabb!

I'm the virtual assistant and I can help you with pricing, becoming a partner driver, our service areas, the app, payment methods, or any other question.

How can I help you today?`;

      const msg: Message = {
        id: 'welcome',
        text: welcome,
        sender: 'bot',
        timestamp: new Date(),
        quickReplies: QUICK_REPLIES.welcome[language],
      };
      setMessages([msg]);
    }
  }, [isOpen, welcomeSent, messages.length, language]);

  const addMessage = (text: string, sender: 'user' | 'bot', quickReplies?: QuickReply[]) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      text,
      sender,
      timestamp: new Date(),
      quickReplies,
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  const handleSend = (forcedMessage?: string) => {
    if (isSending) return;
    const rawMessage = forcedMessage || inputValue.trim();
    if (!rawMessage || typeof rawMessage !== 'string') return;

    const userMessage = String(rawMessage);
    addMessage(userMessage, 'user');
    setInputValue('');

    setIsSending(true);
    setIsTyping(true);

    const lang = language === 'en' ? 'en' : 'fr';
    const category = lastCategory;

    setTimeout(() => {
      try {
        const smartResponse = findBestResponse(userMessage, lang, category);

        if (smartResponse && smartResponse.text) {
          const qr = smartResponse.category === 'prix' ? QUICK_REPLIES.prix[lang] : undefined;
          addMessage(smartResponse.text, 'bot', qr);
          setLastCategory(smartResponse.category);
        } else {
          const lower = userMessage.toLowerCase();
          const isReclamation = lower.includes('perdu') || lower.includes('plainte');
          addMessage(
            isReclamation
              ? (lang === 'fr' ? `Pour cela, contactez directement notre support au +243 960 624 008 ou par email à admin@smartcabb.com.` : `For that, please contact our support directly at +243 960 624 008 or by email at admin@smartcabb.com.`)
              : (lang === 'fr' ? `Je n'ai pas trouvé de réponse précise à votre question. Je peux vous renseigner sur nos tarifs, sur la manière de devenir chauffeur, sur nos zones de service, sur l'application, sur les paiements, ou vous mettre en contact avec notre équipe.` : `I couldn't find a precise answer to your question. I can help with pricing, becoming a driver, our service areas, the app, payments, or put you in touch with our team.`),
            'bot',
            QUICK_REPLIES.welcome[lang]
          );
        }
      } catch (err) {
        console.error('ChatWidget error:', err);
        addMessage('Vous pouvez contacter le +243 960 624 008 pour obtenir de l\'aide.', 'bot');
      }

      setIsTyping(false);
      setIsSending(false);
    }, 300);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleChat = () => {
    setIsOpen(!isOpen);
    if (!isOpen) setShowBadge(false);
  };

  return (
    <div className="fixed bottom-5 right-5 z-[99999]">
      {/* Chat Window */}
      {isOpen && (
        <div className="absolute bottom-20 right-0 w-[360px] max-w-[calc(100vw-40px)] h-[500px] max-h-[calc(100vh-120px)] bg-white rounded-[20px] shadow-[0_10px_40px_rgba(0,0,0,0.15)] flex flex-col overflow-hidden animate-slideUp">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#00BFA5] to-[#00A890] text-white p-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white/15 rounded-full flex items-center justify-center flex-shrink-0">
                <MessageCircle size={18} />
              </div>
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
                <MessageCircle size={44} className="mb-4 opacity-30" />
                <p>Écrivez-nous un message</p>
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <div key={message.id}>
                    <div
                      className={`mb-1 flex ${
                        message.sender === 'user' ? 'justify-end' : 'justify-start'
                      } animate-[fadeIn_0.3s_ease]`}
                    >
                      <div
                        className={`max-w-[80%] p-3 rounded-[18px] text-sm leading-relaxed whitespace-pre-line ${
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
                    {/* Quick replies */}
                    {message.sender === 'bot' && message.quickReplies && message.quickReplies.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-3 ml-1">
                        {message.quickReplies.map((qr, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSend(qr.value)}
                            className="text-xs px-3 py-1.5 rounded-full border border-[#00BFA5] text-[#00BFA5] bg-white hover:bg-[#00BFA5] hover:text-white transition-all cursor-pointer"
                          >
                            {qr.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {/* Indicateur typing */}
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
              onKeyDown={handleKeyDown}
              placeholder="Votre message..."
              disabled={isSending}
              className="flex-1 px-4 py-3 border-2 border-[#E5E7EB] rounded-[25px] text-sm outline-none focus:border-[#00BFA5] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Message"
            />
            <button
              onClick={() => handleSend()}
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
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-[#FF4757] rounded-full border-2 border-white animate-pulse" />
            )}
          </>
        )}
      </button>

      {/* Animations CSS */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes slideUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
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