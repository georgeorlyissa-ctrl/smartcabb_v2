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
      { label: '💰 Tarifs', value: 'Quels sont vos tarifs ?' },
      { label: '🚗 Devenir chauffeur', value: 'Comment devenir chauffeur ?' },
      { label: '📍 Zones', value: 'Où êtes-vous disponible ?' },
      { label: '📱 Application', value: 'Comment télécharger l\'app ?' },
      { label: '💳 Paiement', value: 'Comment payer ?' },
      { label: '📞 Contact', value: 'Contact support' },
    ],
    en: [
      { label: '💰 Pricing', value: 'What are your prices?' },
      { label: '🚗 Become driver', value: 'How to become a driver?' },
      { label: '📍 Areas', value: 'Where are you available?' },
      { label: '📱 App', value: 'How to download the app?' },
      { label: '💳 Payment', value: 'How to pay?' },
      { label: '📞 Contact', value: 'Contact support' },
    ],
  },
  prix: {
    fr: [
      { label: '🚗 Standard', value: 'Prix course standard' },
      { label: '⭐ Confort', value: 'Prix confort' },
      { label: '👨‍👩‍👧‍👧 Plus (7 places)', value: 'Prix SmartCabb Plus' },
      { label: '💼 Business', value: 'Prix business' },
      { label: '🌙 Nuit', value: 'Tarifs de nuit' },
    ],
    en: [
      { label: '🚗 Standard', value: 'Standard price' },
      { label: '⭐ Confort', value: 'Confort price' },
      { label: '👨‍👩‍👧‍👧 Plus', value: 'SmartCabb Plus price' },
      { label: '💼 Business', value: 'Business price' },
      { label: '🌙 Night', value: 'Night rates' },
    ],
  },
};

const SMARTCABB_KNOWLEDGE = {
  prix: {
    keywords: ['prix', 'tarif', 'coût', 'combien', 'coute', 'payer', 'montant', 'price', 'cost', 'fare', 'facturation', 'minimum', 'smartcabb standard', 'smartcabb confort', 'smartcabb plus', 'smartcabb business', 'course standard', 'course confort', 'course plus', 'course business'],
    fr: `Voici nos tarifs SmartCabb en Francs Congolais :

- SmartCabb Standard (economique) : 2 500 CDF/km, ou 50 000 CDF/heure
- SmartCabb Confort (confortable) : 5 000 CDF/km, ou 100 000 CDF/heure
- SmartCabb Plus (familial, 7 places) : 7 500 CDF/km, ou 150 000 CDF/heure
- SmartCabb Business (luxe) : 500 000 CDF/jour

Les tarifs de nuit, de 22h a 5h, sont majores de 50%. La facturation minimale est de 2 km ou 10 minutes.`,
    en: `Here are our SmartCabb prices in CDF :

- SmartCabb Standard (economy) : 2,500 CDF/km, or 50,000 CDF/hour
- SmartCabb Confort (comfort) : 5,000 CDF/km, or 100,000 CDF/hour
- SmartCabb Plus (family, 7 seats) : 7,500 CDF/km, or 150,000 CDF/hour
- SmartCabb Business (luxury) : 500,000 CDF/day

Night rates from 10pm to 5am have a 50% surcharge. Minimum billing is 2km or 10 minutes.`
  },

  chauffeur: {
    keywords: ['chauffeur', 'conducteur', 'devenir', 'inscription', 'driver', 'become', 'requirements', 'requis', 'postuler', 'candidature', 'recrutement', 'embauche', 'combien de chauffeur', 'combien de chauffeurs', 'combien des chauffeur', 'nombre de chauffeur'],
    fr: `Pour devenir chauffeur SmartCabb, voici les conditions requises :

- Permis de conduire valide
- Vehicule en bon etat
- Casier judiciaire vierge
- Age minimum 21 ans

Avantages pour nos chauffeurs :
- Revenus attractifs et flexibles
- Horaires que vous choisissez
- Assurance incluse
- Formation gratuite
- Support disponible 24h/24 et 7j/7

Inscription en 4 etapes :
1. Remplir le formulaire en ligne sur smartcabb.com/chauffeurs
2. Verification des documents
3. Formation gratuite a l'application
4. Commencer a gagner !

Pour plus de renseignements, appelez le +243 990 666 661.`,
    en: `To become a SmartCabb driver, here are the requirements :

- Valid driver's license
- Vehicle in good condition
- Clean criminal record
- Minimum age 21 years

Benefits for our drivers :
- Attractive flexible income
- Choose your own hours
- Insurance included
- Free training
- 24/7 support

Sign up in 4 steps :
1. Fill out the online form at smartcabb.com/drivers
2. Document verification
3. Free app training
4. Start earning !

For more information, call +243 990 666 661.`
  },

  zones: {
    keywords: ['zone', 'ville', 'secteur', 'où', 'disponible', 'areas', 'where', 'coverage', 'kinshasa', 'commune', 'quartier', 'localisation', 'endroit'],
    fr: `SmartCabb est disponible a Kinshasa, en Republique Democratique du Congo.

Communes couvertes :
- Gombe (centre d'affaires)
- Ngaliema
- Limete
- Kalamu
- Kintambo
- Et toutes les autres communes de Kinshasa

Expansion prevue prochainement a Lubumbashi, Matadi et Kisangani.

Utilisez l'application pour verifier la disponibilite dans votre quartier.`,
    en: `SmartCabb is available in Kinshasa, Democratic Republic of Congo.

Covered communes :
- Gombe (business district)
- Ngaliema
- Limete
- Kalamu
- Kintambo
- And all other Kinshasa communes

Expansion planned soon in Lubumbashi, Matadi and Kisangani.

Use the app to check availability in your area.`
  },

  app: {
    keywords: ['application', 'app', 'télécharger', 'installer', 'download', 'mobile', 'smartphone', 'site', 'web', 'site web'],
    fr: `Vous pouvez utiliser SmartCabb directement depuis votre navigateur sur smartcabb.com, sans telechargement necessaire. Le site fonctionne parfaitement sur mobile.

L'application mobile sera bientot disponible sur le Play Store et l'App Store.

Fonctionnalites disponibles :
- Reservation en quelques clics
- Estimation de prix en temps reel
- Suivi GPS du chauffeur
- Paiement mobile money
- Historique des courses
- Support client integre`,
    en: `You can use SmartCabb directly from your browser at smartcabb.com, no download needed. The website works perfectly on mobile.

The mobile app will be available soon on Play Store and App Store.

Available features :
- Book in a few clicks
- Real-time price estimates
- GPS driver tracking
- Mobile money payment
- Trip history
- Integrated support`
  },

  paiement: {
    keywords: ['paiement', 'payer', 'payment', 'mobile money', 'airtel money', 'orange money', 'mpesa', 'afrimoney', 'carte', 'card', 'espèces', 'cash', 'monnaie', 'facture', 'reçu', 'recu', 'receipt'],
    fr: `Nous acceptons plusieurs moyens de paiement chez SmartCabb :

Mobile money (principal) :
- Airtel Money
- Orange Money
- M-Pesa
- Afrimoney

Autres moyens : especes (cash) et carte bancaire (bientot disponible).

Tous les paiements sont 100% sécurises et cryptes. Pas de frais caches, nos prix sont transparents.

Comment ca marche :
1. Terminez votre course
2. Recevez le montant exact
3. Payez via mobile money
4. Recevez votre recu par SMS`,
    en: `We accept several payment methods at SmartCabb :

Mobile money (primary) :
- Airtel Money
- Orange Money
- M-Pesa
- Afrimoney

Other methods : cash, and bank card (coming soon).

All payments are 100% secure and encrypted. No hidden fees, our prices are transparent.

How it works :
1. Complete your ride
2. Receive exact amount
3. Pay via mobile money
4. Receive receipt by SMS`
  },

  reservation: {
    keywords: ['réservation', 'reservation', 'commander', 'réserver', 'reserver', 'commande', 'book', 'booking', 'course', 'trajet', 'voyage', 'commander une course'],
    fr: `Pour reserver une course SmartCabb, c'est simple :

Via le site web smartcabb.com :
1. Allez sur smartcabb.com
2. Cliquez sur "Commander"
3. Entrez votre adresse de depart
4. Entrez votre destination
5. Choisissez votre vehicule
6. Confirmez la reservation

Par telephone : appelez le +243 990 666 661

Conseil : Utilisez le site web pour une estimation du prix avant de reserver.`,
    en: `To book a SmartCabb ride, it's simple :

Via the website smartcabb.com :
1. Go to smartcabb.com
2. Click "Book Now"
3. Enter your pickup address
4. Enter your destination
5. Choose your vehicle
6. Confirm booking

By phone : call +243 990 666 661

Tip : Use the website to get a price estimate before booking.`
  },

  annulation: {
    keywords: ['annulation', 'annuler', 'cancel', 'cancellation', 'remboursement', 'refund', 'rembourser', 'annulé'],
    fr: `Politique d'annulation SmartCabb :

- Annulation avant l'arrivee du chauffeur : gratuite
- Annulation apres l'arrivee du chauffeur : frais de 2 000 CDF
- Annulation en cours de course : la course est due

Remboursement :
- Les remboursements sont traites sous 24 a 48 heures
- Le montant est recredite sur votre compte mobile money

Pour toute reclamation, appelez le +243 990 666 661.`,
    en: `SmartCabb cancellation policy :

- Cancel before driver arrives : free
- Cancel after driver arrives : 2,000 CDF fee
- Cancel during ride : ride is charged

Refund :
- Refunds processed within 24 to 48 hours
- Amount credited back to your mobile money account

For complaints, call +243 990 666 661.`
  },

  securite: {
    keywords: ['sécurité', 'sûr', 'sécurisé', 'security', 'safe', 'protection', 'danger', 'urgence', 'emergency', 'agression', 'accident', 'crime'],
    fr: `Votre securite est notre priorite absolue chez SmartCabb.

Verification des chauffeurs :
- Casier judiciaire verifie
- Permis de conduire valide
- Formation obligatoire
- Evaluations par les passagers

Vehicules controles :
- Inspection technique reguliere
- Assurance valide
- GPS tracking en temps reel

Fonctionnalites de securite :
- Partage de trajet en temps reel
- Bouton d'urgence dans l'application
- Support 24h/24 et 7j/7
- Enregistrement de tous les trajets

Urgence : +243 990 666 661`,
    en: `Your safety is our top priority at SmartCabb.

Driver verification :
- Criminal record checked
- Driver's license validated
- Mandatory training
- Passenger ratings

Vehicle checks :
- Regular technical inspection
- Valid insurance
- Real-time GPS tracking

Safety features :
- Live trip sharing
- Emergency button in the app
- 24/7 support
- All trips recorded

Emergency : +243 990 666 661`
  },

  contact: {
    keywords: ['contact', 'téléphone', 'email', 'joindre', 'appeler', 'call', 'reach', 'support', 'aide', 'help', 'service client', 'hotline', 'whatsapp'],
    fr: `Voici comment nous contacter :

Support client 24h/24 et 7j/7 :
- Telephone : +243 990 666 661
- Email : admin@smartcabb.com
- Chat : directement sur ce chat

Reseaux sociaux :
- Facebook : /SmartCabbRDC
- Instagram : @smartcabb_cd

Siege social : Kinshasa, Republique Democratique du Congo

Pour une reponse immediate, appelez-nous ou utilisez ce chat.`,
    en: `Here is how to reach us :

24/7 Customer Support :
- Phone : +243 990 666 661
- Email : admin@smartcabb.com
- Chat : right here in this chat

Social media :
- Facebook : /SmartCabbRDC
- Instagram : @smartcabb_cd

Headquarters : Kinshasa, Democratic Republic of Congo

For an immediate response, call us or use this chat.`
  },

  bagages: {
    keywords: ['bagage', 'bagages', 'valise', 'sac', 'luggage', 'baggage', 'colis', 'chargement'],
    fr: `Politique bagages SmartCabb :

Bagages personnels : inclus gratuitement pour toutes les categories. Le chauffeur vous aide au chargement et dechargement.

Bagages volumineux : le SmartCabb Plus (7 places) est recommande. Prevenez le chauffeur lors de la reservation.

Objets fragiles : vous etes responsable de vos objets de valeur. SmartCabb decline toute responsabilite pour les objets laisses dans le vehicule.`,
    en: `SmartCabb luggage policy :

Personal luggage : included free for all categories. The driver helps with loading and unloading.

Large luggage : SmartCabb Plus (7 seats) is recommended. Notify the driver when booking.

Fragile items : you are responsible for your valuables. SmartCabb is not responsible for items left in the vehicle.`
  },

  animaux: {
    keywords: ['animal', 'animaux', 'chien', 'chat', 'pet', 'petit', 'animal domestique'],
    fr: `Transport d'animaux avec SmartCabb :

Petits animaux en sac de transport : autorises gratuitement, ils doivent etre dans un sac de transport adapte.

Chiens guides pour personnes handicapees : autorises gratuitement, sans restriction.

Grands animaux : veuillez contacter le support au +243 990 666 661, un vehicule adapte peut etre organise.

Merci d'informer le chauffeur au moment de la reservation.`,
    en: `Pets with SmartCabb :

Small pets in a carrier : allowed free of charge, must be in a suitable carrier.

Guide dogs for disabled persons : allowed free of charge, no restrictions.

Large animals : please contact support at +243 990 666 661, a suitable vehicle can be arranged.

Please inform the driver when booking.`
  },

  horaires: {
    keywords: ['horaire', 'heure', 'temps', 'ouvert', 'fermé', '24h', '24/7', 'hours', 'schedule', 'disponibilité', 'disponibilite', 'attente', 'wait', 'temps d\'attente'],
    fr: `SmartCabb est disponible 24h/24, 7j/7 et 365 jours par an. Notre support client aussi.

Tarifs de nuit (22h a 5h) : majoration de 50% applicable.

Temps d'attente moyen a Kinshasa : 5 a 15 minutes. Aux heures de pointe, comptez 10 a 20 minutes. En periode de forte affluence, l'attente peut etre plus longue. Merci de votre comprehension.`,
    en: `SmartCabb is available 24/7, 365 days a year. Our customer support too.

Night rates (10pm to 5am) : 50% surcharge applies.

Average wait time in Kinshasa : 5 to 15 minutes. During peak hours, 10 to 20 minutes. During high demand, wait times may be longer. Thank you for your understanding.`
  },

  reclamation: {
    keywords: ['réclamation', 'reclamation', 'plainte', 'complain', 'probleme', 'problem', 'problème', 'insatisfait', 'objet perdu', 'perdu', 'lost', 'found'],
    fr: `Pour toute reclamation, contactez-nous :
- Telephone : +243 990 666 661
- Email : admin@smartcabb.com

Objets perdus : contactez rapidement le support en donnant les details de votre course (date et heure). Nous contacterons le chauffeur.

Procedure :
1. Contactez-nous dans les 24 heures
2. Donnez les details de votre course
3. Notre equipe traite votre demande sous 24 a 48 heures
4. Vous recevez une reponse par SMS ou email`,
    en: `For any complaint, contact us :
- Phone : +243 990 666 661
- Email : admin@smartcabb.com

Lost items : contact support quickly with your trip details (date and time). We will contact the driver.

Procedure :
1. Contact us within 24 hours
2. Provide your trip details
3. Our team processes within 24 to 48 hours
4. You receive a response by SMS or email`
  },

  services: {
    keywords: ['service', 'service', 'offre', 'offer', 'proposez', 'options', 'véhicule', 'vehicule', 'voiture', 'categorie', 'catégorie', 'gamme', 'type'],
    fr: `Voici les services que nous proposons chez SmartCabb :

- SmartCabb Standard : vehicules economiques, parfait pour les trajets quotidiens
- SmartCabb Confort : voitures confortables climatisees, ideal pour le travail ou les sorties
- SmartCabb Plus : vehicules 7 places, parfait pour les familles et groupes
- SmartCabb Business : vehicules de luxe avec chauffeur prive, location a la journee

Tous nos services incluent : assurance, GPS, securite, chauffeur professionnel et paiement mobile money.`,
    en: `Here are the services we offer at SmartCabb :

- SmartCabb Standard : economy vehicles, perfect for daily trips
- SmartCabb Confort : comfortable air-conditioned cars, ideal for work or outings
- SmartCabb Plus : 7-seat vehicles, perfect for families and groups
- SmartCabb Business : luxury vehicles with private driver, daily rental

All our services include : insurance, GPS, safety, professional driver and mobile money payment.`
  },

  parc: {
    keywords: ['combien', 'vehicule', 'véhicule', 'voiture', 'combien de vehicule', 'combien des vehicule', 'combien de voiture', 'combien des voiture', 'parc', 'flotte', 'fleet', 'nombre de vehicule', 'nombre de voiture', 'nombre de véhicule', 'effectif', 'taille de la flotte'],
    fr: `Notre parc automobile SmartCabb se compose de plusieurs categories :

- SmartCabb Standard : berlines economiques (4 places)
- SmartCabb Confort : berlines climatisees (4 places)
- SmartCabb Plus : minibus 7 places
- SmartCabb Business : vehicules de luxe

Notre flotte est regulierement renouvelee et entretenue. Nous comptons des centaines de chauffeurs partenaires a Kinshasa, avec une capacite extensible selon la demande.

Pour plus d'informations, appelez le +243 990 666 661.`,
    en: `Our SmartCabb fleet consists of several categories :

- SmartCabb Standard : economy sedans (4 seats)
- SmartCabb Confort : air-conditioned sedans (4 seats)
- SmartCabb Plus : 7-seat minibuses
- SmartCabb Business : luxury vehicles

Our fleet is regularly renewed and maintained. We have hundreds of partner drivers in Kinshasa, with scalable capacity based on demand.

For more information, call +243 990 666 661.`
  },

  salutation: {
    keywords: ['bonjour', 'salut', 'hello', 'hi', 'hey', 'bonsoir', 'bonne nuit', 'bon matin', 'good morning', 'good evening', 'comment tu vas', 'comment allez vous', 'comment ça va', 'ça va', 'how are you', 'comment vas tu', 'quoi de neuf', 'what\'s up', 'wesh', 'cc', 'salutations'],
    fr: `Bonjour ! Je vais tres bien, merci ! Et vous ?

Je suis votre assistant SmartCabb. Je suis la pour vous aider avec :
- Nos tarifs et estimations
- Devenir chauffeur partenaire
- Zones de service
- L'application SmartCabb
- Modes de paiement
- Contact et support

Comment puis-je vous aider ?`,
    en: `Hello ! I'm doing great, thank you ! And you ?

I'm your SmartCabb assistant. I'm here to help you with :
- Pricing and estimates
- Becoming a partner driver
- Service areas
- SmartCabb app
- Payment methods
- Contact and support

How can I help you ?`
  },

  merci: {
    keywords: ['merci', 'thank', 'thanks', 'thank you', 'merci beaucoup', 'thanks a lot'],
    fr: `Avec plaisir ! N'hesitez pas si vous avez d'autres questions.

Pret a commander ? Rendez-vous sur smartcabb.com.
Besoin d'aide ? Appelez le +243 990 666 661.

Bonne journee !`,
    en: `You're welcome ! Don't hesitate if you have other questions.

Ready to book ? Go to smartcabb.com.
Need help ? Call +243 990 666 661.

Have a great day !`
  },

  au_revoir: {
    keywords: ['au revoir', 'bye', 'goodbye', 'à bientôt', 'a bientot', 'ciao', 'adieu', 'bonne journée'],
    fr: `Merci d'avoir contacte SmartCabb ! Nous restons a votre disposition 24h/24.

Telephone : +243 990 666 661
Email : admin@smartcabb.com

A bientot sur smartcabb.com !`,
    en: `Thank you for contacting SmartCabb ! We remain at your service 24/7.

Phone : +243 990 666 661
Email : admin@smartcabb.com

See you soon on smartcabb.com !`
  }
};

// 🧠 Score de pertinence pour chaque catégorie
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

// 🧠 Fonction pour trouver la meilleure réponse avec priorisation
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
        ? `Bonjour ! Bienvenue sur SmartCabb !

Je suis votre assistant virtuel. Je peux vous aider avec :
- Nos tarifs et estimations
- Devenir chauffeur partenaire
- Zones de service
- L'application SmartCabb
- Modes de paiement
- Contact et support

Comment puis-je vous aider aujourd'hui ?`
        : `Hello ! Welcome to SmartCabb !

I'm your virtual assistant. I can help you with :
- Pricing and estimates
- Becoming a partner driver
- Service areas
- SmartCabb app
- Payment methods
- Contact and support

How can I help you today ?`;

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
              ? (lang === 'fr' ? `Contactez notre support :\nTelephone : +243 990 666 661\nEmail : admin@smartcabb.com` : `Contact support :\nPhone : +243 990 666 661\nEmail : admin@smartcabb.com`)
              : (lang === 'fr' ? `Je n'ai pas compris votre demande. Voici ce que je peux vous expliquer :\n- Tarifs\n- Devenir chauffeur\n- Zones de service\n- Application\n- Paiement\n- Contact` : `I didn't understand your request. Here is what I can help with :\n- Pricing\n- Becoming a driver\n- Service areas\n- App\n- Payment\n- Contact`),
            'bot',
            QUICK_REPLIES.welcome[lang]
          );
        }
      } catch (err) {
        console.error('ChatWidget error:', err);
        addMessage('Contactez le +243 990 666 661 pour obtenir de l\'aide.', 'bot');
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
