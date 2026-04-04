import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'fr' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    // Récupérer la langue depuis localStorage ou utiliser la langue du navigateur
    const savedLang = localStorage.getItem('smartcabb_language') as Language;
    if (savedLang) return savedLang;
    
    // Détecter la langue du navigateur
    const browserLang = navigator.language.toLowerCase();
    if (browserLang.startsWith('fr')) return 'fr';
    return 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('smartcabb_language', lang);
  };

  const t = (key: string): string => {
    const keys = key.split('.');
    let value: any = translations[language];
    
    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = value[k];
      } else {
        return key; // Retourner la clé si la traduction n'existe pas
      }
    }
    
    return typeof value === 'string' ? value : key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

// Traductions
const translations = {
  fr: {
    nav: {
      home: 'Accueil',
      howItWorks: 'Comment ça marche',
      whyUs: 'Pourquoi nous',
      testimonials: 'Témoignages',
      contact: 'Contact',
      login: 'Connexion',
      services: 'Services',
      about: 'À propos',
      drivers: 'Chauffeurs',
      terms: 'Conditions',
      privacy: 'Confidentialité',
      legal: 'Mentions légales'
    },
    hero: {
      badge: '🚀 Transport moderne en RD Congo',
      title1: 'Votre trajet,',
      title2: 'votre choix',
      description: 'La meilleure façon de se déplacer en République Démocratique du Congo. Rapide, sûr et abordable. Disponible 24/7.',
      bookRide: 'Commander une course',
      becomeDriver: 'Devenir Chauffeur',
      activeDrivers: 'Chauffeurs actifs',
      happyClients: 'Clients satisfaits',
      available: 'Service disponible',
      online: 'en ligne',
      rating: 'Note moyenne'
    },
    how: {
      title1: 'Comment ça',
      title2: 'marche',
      subtitle: 'Réservez votre course en 3 étapes simples',
      step1: {
        title: 'Localisez',
        description: 'Indiquez votre position et votre destination sur la carte interactive'
      },
      step2: {
        title: 'Choisissez',
        description: 'Sélectionnez le type de véhicule qui correspond à vos besoins'
      },
      step3: {
        title: 'Profitez',
        description: 'Montez à bord et profitez de votre trajet en toute sécurité'
      }
    },
    why: {
      title1: 'Pourquoi',
      title2: 'SmartCabb',
      subtitle: 'L\'excellence du transport au service de votre mobilité',
      fast: 'Rapide',
      fastDesc: 'Trouvez un chauffeur en moins de 2 minutes',
      secure: 'Sécurisé',
      secureDesc: 'Chauffeurs vérifiés et traçabilité GPS',
      affordable: 'Abordable',
      affordableDesc: 'Tarifs transparents en Franc Congolais',
      simple: 'Simple',
      simpleDesc: 'Interface intuitive et facile à utiliser',
      quality: 'Qualité',
      qualityDesc: 'Service premium à chaque course',
      local: 'Local',
      localDesc: '100% made in RD Congo',
      flexible: 'Flexible',
      flexibleDesc: 'Paiement cash ou mobile money',
      reliable: 'Fiable',
      reliableDesc: 'Disponible 24h/24, 7j/7'
    },
    testimonials: {
      title1: 'Ce que disent nos',
      title2: 'clients',
      subtitle: 'Des milliers de Congolais nous font confiance chaque jour',
      client1: {
        name: 'Jean Mukendi',
        role: 'Entrepreneur',
        text: 'SmartCabb a révolutionné mes déplacements à Kinshasa. Service impeccable et chauffeurs professionnels !'
      },
      client2: {
        name: 'Marie Tshimanga',
        role: 'Cadre bancaire',
        text: 'Enfin une app congolaise de qualité ! Tarifs transparents et sécurité au rendez-vous.'
      },
      client3: {
        name: 'Patrick Kabamba',
        role: 'Médecin',
        text: 'Je l\'utilise tous les jours pour aller au travail. Rapide, fiable et économique !'
      },
      client4: {
        name: 'Grace Mbuyi',
        role: 'Étudiante',
        text: 'Application très simple à utiliser. Mes parents sont rassurés grâce au suivi GPS en temps réel.'
      },
      reviews5Stars: 'Avis 5 étoiles',
      satisfaction: 'Satisfaction client',
      avgRating: 'Note moyenne'
    },
    cta: {
      title: 'Prêt à transformer vos déplacements ?',
      subtitle: 'Rejoignez des milliers de Congolais qui ont déjà choisi SmartCabb pour leurs trajets quotidiens',
      startNow: 'Commencer maintenant',
      becomePartner: 'Devenir partenaire',
      availableOn: 'Disponible sur',
      iosAndroid: 'iOS & Android',
      payment: 'Paiement',
      cashMobile: 'Cash & Mobile Money'
    },
    footer: {
      tagline: 'Transport intelligent',
      description: 'La solution de transport la plus fiable en République Démocratique du Congo.',
      quickLinks: 'Liens rapides',
      services: 'Services',
      legal: 'Légal',
      followUs: 'Suivez-nous',
      rights: 'Tous droits réservés.',
      madeInCongo: 'Fièrement congolais 🇨🇩'
    },
    services: {
      title: 'Nos Services',
      subtitle: 'Choisissez le véhicule parfait pour vos besoins',
      standard: {
        name: 'Standard',
        description: 'Économique et confortable pour vos trajets quotidiens',
        price: 'à partir de',
        features: ['Économique', 'Confortable', 'Rapide']
      },
      confort: {
        name: 'Confort',
        description: 'Plus d\'espace et de confort pour vos déplacements',
        price: 'à partir de',
        features: ['Spacieux', 'Climatisé', 'Premium']
      },
      business: {
        name: 'Business',
        description: 'L\'excellence pour vos rendez-vous professionnels',
        price: 'à partir de',
        features: ['Luxe', 'Professionnel', 'Haut de gamme']
      },
      familia: {
        name: 'Familia',
        description: 'Parfait pour toute la famille',
        price: 'à partir de',
        features: ['6-7 places', 'Familial', 'Sécurisé']
      },
      bookNow: 'Réserver maintenant',
      seeVehicles: 'Voir les véhicules',
      seats: 'places',
      airConditioned: 'Climatisé',
      freeData: 'Data gratuit',
      refreshments: 'Rafraîchissement',
      secured: 'Sécurisé'
    },
    contact: {
      title: 'Contactez-nous',
      subtitle: 'Nous sommes là pour vous aider',
      name: 'Nom',
      email: 'Email',
      phone: 'Téléphone',
      message: 'Message',
      send: 'Envoyer',
      sending: 'Envoi...',
      success: 'Message envoyé avec succès !',
      error: 'Erreur lors de l\'envoi du message'
    },
    about: {
      title: 'À propos de SmartCabb',
      subtitle: 'Notre mission, notre vision',
      mission: 'Notre Mission',
      vision: 'Notre Vision',
      values: 'Nos Valeurs',
      missionText: 'Révolutionner le transport en RD Congo en offrant une solution moderne, sûre et accessible à tous.',
      visionText: 'Devenir le leader du transport intelligent en Afrique centrale.',
      team: 'Notre Équipe',
      story: 'Notre Histoire'
    },
    drivers: {
      title: 'Devenez Chauffeur SmartCabb',
      subtitle: 'Gagnez de l\'argent en conduisant',
      requirements: 'Conditions requises',
      benefits: 'Avantages',
      signup: 'S\'inscrire maintenant',
      requirement1: 'Permis de conduire valide',
      requirement2: 'Véhicule en bon état',
      requirement3: 'Casier judiciaire vierge',
      requirement4: 'Âge minimum 21 ans',
      benefit1: 'Revenus attractifs',
      benefit2: 'Horaires flexibles',
      benefit3: 'Assurance incluse',
      benefit4: 'Formation gratuite',
      howItWorks: 'Comment ça marche',
      step1: 'Inscrivez-vous',
      step2: 'Vérification',
      step3: 'Formation',
      step4: 'Commencez à conduire'
    },
    legal: {
      terms: 'Conditions d\'utilisation',
      privacy: 'Politique de confidentialité',
      legalNotice: 'Mentions légales',
      lastUpdate: 'Dernière mise à jour',
      accept: 'J\'accepte',
      readMore: 'Lire la suite'
    }
  },
  en: {
    nav: {
      home: 'Home',
      howItWorks: 'How it Works',
      whyUs: 'Why Us',
      testimonials: 'Testimonials',
      contact: 'Contact',
      login: 'Login',
      services: 'Services',
      about: 'About',
      drivers: 'Drivers',
      terms: 'Terms',
      privacy: 'Privacy',
      legal: 'Legal'
    },
    hero: {
      badge: '🚀 Modern transport in DR Congo',
      title1: 'Your ride,',
      title2: 'your choice',
      description: 'The best way to move around the Democratic Republic of Congo. Fast, safe and affordable. Available 24/7.',
      bookRide: 'Book a Ride',
      becomeDriver: 'Become a Driver',
      activeDrivers: 'Active Drivers',
      happyClients: 'Happy Clients',
      available: 'Service available',
      online: 'online',
      rating: 'Average rating'
    },
    how: {
      title1: 'How it',
      title2: 'works',
      subtitle: 'Book your ride in 3 simple steps',
      step1: {
        title: 'Locate',
        description: 'Enter your location and destination on the interactive map'
      },
      step2: {
        title: 'Choose',
        description: 'Select the vehicle type that matches your needs'
      },
      step3: {
        title: 'Enjoy',
        description: 'Get in and enjoy your ride safely'
      }
    },
    why: {
      title1: 'Why',
      title2: 'SmartCabb',
      subtitle: 'Excellence in transport for your mobility',
      fast: 'Fast',
      fastDesc: 'Find a driver in less than 2 minutes',
      secure: 'Secure',
      secureDesc: 'Verified drivers and GPS tracking',
      affordable: 'Affordable',
      affordableDesc: 'Transparent pricing in Congolese Francs',
      simple: 'Simple',
      simpleDesc: 'Intuitive and easy-to-use interface',
      quality: 'Quality',
      qualityDesc: 'Premium service on every ride',
      local: 'Local',
      localDesc: '100% made in DR Congo',
      flexible: 'Flexible',
      flexibleDesc: 'Cash or mobile money payment',
      reliable: 'Reliable',
      reliableDesc: 'Available 24/7'
    },
    testimonials: {
      title1: 'What our',
      title2: 'clients say',
      subtitle: 'Thousands of Congolese trust us every day',
      client1: {
        name: 'Jean Mukendi',
        role: 'Entrepreneur',
        text: 'SmartCabb has revolutionized my commute in Kinshasa. Impeccable service and professional drivers!'
      },
      client2: {
        name: 'Marie Tshimanga',
        role: 'Banking Executive',
        text: 'Finally a quality Congolese app! Transparent pricing and security guaranteed.'
      },
      client3: {
        name: 'Patrick Kabamba',
        role: 'Doctor',
        text: 'I use it every day to go to work. Fast, reliable and economical!'
      },
      client4: {
        name: 'Grace Mbuyi',
        role: 'Student',
        text: 'Very easy to use app. My parents are reassured thanks to real-time GPS tracking.'
      },
      reviews5Stars: '5-star reviews',
      satisfaction: 'Customer satisfaction',
      avgRating: 'Average rating'
    },
    cta: {
      title: 'Ready to transform your commute?',
      subtitle: 'Join thousands of Congolese who have already chosen SmartCabb for their daily trips',
      startNow: 'Start Now',
      becomePartner: 'Become a Partner',
      availableOn: 'Available on',
      iosAndroid: 'iOS & Android',
      payment: 'Payment',
      cashMobile: 'Cash & Mobile Money'
    },
    footer: {
      tagline: 'Smart transport',
      description: 'The most reliable transport solution in the Democratic Republic of Congo.',
      quickLinks: 'Quick Links',
      services: 'Services',
      legal: 'Legal',
      followUs: 'Follow Us',
      rights: 'All rights reserved.',
      madeInCongo: 'Proudly Congolese 🇨🇩'
    },
    services: {
      title: 'Our Services',
      subtitle: 'Choose the perfect vehicle for your needs',
      standard: {
        name: 'Standard',
        description: 'Economical and comfortable for your daily trips',
        price: 'from',
        features: ['Economical', 'Comfortable', 'Fast']
      },
      confort: {
        name: 'Comfort',
        description: 'More space and comfort for your travels',
        price: 'from',
        features: ['Spacious', 'Air-conditioned', 'Premium']
      },
      business: {
        name: 'Business',
        description: 'Excellence for your professional appointments',
        price: 'from',
        features: ['Luxury', 'Professional', 'High-end']
      },
      familia: {
        name: 'Familia',
        description: 'Perfect for the whole family',
        price: 'from',
        features: ['6-7 seats', 'Family-friendly', 'Secure']
      },
      bookNow: 'Book Now',
      seeVehicles: 'See Vehicles',
      seats: 'seats',
      airConditioned: 'Air-conditioned',
      freeData: 'Free Data',
      refreshments: 'Refreshments',
      secured: 'Secured'
    },
    contact: {
      title: 'Contact Us',
      subtitle: 'We are here to help',
      name: 'Name',
      email: 'Email',
      phone: 'Phone',
      message: 'Message',
      send: 'Send',
      sending: 'Sending...',
      success: 'Message sent successfully!',
      error: 'Error sending message'
    },
    about: {
      title: 'About SmartCabb',
      subtitle: 'Our mission, our vision',
      mission: 'Our Mission',
      vision: 'Our Vision',
      values: 'Our Values',
      missionText: 'Revolutionize transportation in DR Congo by offering a modern, safe and accessible solution to all.',
      visionText: 'Become the leader of smart transportation in Central Africa.',
      team: 'Our Team',
      story: 'Our Story'
    },
    drivers: {
      title: 'Become a SmartCabb Driver',
      subtitle: 'Earn money by driving',
      requirements: 'Requirements',
      benefits: 'Benefits',
      signup: 'Sign Up Now',
      requirement1: 'Valid driver\'s license',
      requirement2: 'Vehicle in good condition',
      requirement3: 'Clean criminal record',
      requirement4: 'Minimum age 21 years',
      benefit1: 'Attractive income',
      benefit2: 'Flexible hours',
      benefit3: 'Insurance included',
      benefit4: 'Free training',
      howItWorks: 'How it works',
      step1: 'Sign up',
      step2: 'Verification',
      step3: 'Training',
      step4: 'Start driving'
    },
    legal: {
      terms: 'Terms of Service',
      privacy: 'Privacy Policy',
      legalNotice: 'Legal Notice',
      lastUpdate: 'Last updated',
      accept: 'I accept',
      readMore: 'Read more'
    }
  }
};
