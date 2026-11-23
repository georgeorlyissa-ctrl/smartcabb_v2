/**
 * ✅ FICHIER DE TRADUCTIONS COMPLET - SMART CAB
 * 🌍 Toutes les pages du site web (FR + EN)
 * 📅 Dernière mise à jour : 31 Octobre 2025
 */

const translations = {
    // ========================================
    // FRANÇAIS (FR)
    // ========================================
    fr: {
        // === NAVIGATION ===
        'nav.home': 'Accueil',
        'nav.about': 'À Propos',
        'nav.services': 'Services',
        'nav.driver': 'Devenir Chauffeur',
        'nav.contact': 'Contact',
        'nav.faq': 'FAQ',

        // === PAGE INDEX (index.html) ===
        'hero.title': 'Voyagez en toute sécurité en RDC',
        'hero.subtitle': 'Votre trajet, votre choix.',
        'hero.description': 'La meilleure façon de se déplacer dans Kinshasa. Rapide, sûr et abordable.',
        'hero.cta_passenger': 'Téléchargez l\'application',
        'hero.cta_driver': 'Devenez chauffeur',
        
        'how.title': 'Comment ça marche ?',
        'how.step1.title': 'Commandez',
        'how.step1.desc': 'Ouvrez l\'application et entrez votre destination',
        'how.step2.title': 'Choisissez',
        'how.step2.desc': 'Sélectionnez le type de véhicule',
        'how.step3.title': 'Rencontrez',
        'how.step3.desc': 'Un chauffeur certifié arrive en minutes',
        'how.step4.title': 'Profitez',
        'how.step4.desc': 'Détendez-vous et arrivez en sécurité',
        
        'features.title': 'Pourquoi choisir SMART CAB ?',
        'features.subtitle': 'Une expérience de transport repensée',
        'features.security.title': 'Sécurité d\'abord',
        'features.security.desc': 'Tous nos chauffeurs sont rigoureusement vérifiés',
        'features.pricing.title': 'Prix transparents',
        'features.pricing.desc': 'Le tarif est affiché avant confirmation',
        'features.availability.title': 'Disponibilité 24/7',
        'features.availability.desc': 'Nos chauffeurs disponibles jour et nuit',
        'features.comfort.title': 'Confort et fiabilité',
        'features.comfort.desc': 'Des véhicules bien entretenus',
        
        'pricing.title': 'Tarifs Transparents',
        'pricing.subtitle': 'Prix officiels SMART CAB - Kinshasa',
        'pricing.daytime': 'Jour (06h-20h59)',
        'pricing.nighttime': 'Nuit (21h-05h59)',
        'pricing.perkm': 'par km',
        'pricing.permin': 'par min',
        'pricing.base': 'Base',
        
        'download.title': 'Téléchargez SMART CAB',
        'download.subtitle': 'Disponible sur iOS et Android',
        'download.ios': 'Télécharger sur l\'App Store',
        'download.android': 'Télécharger sur Google Play',
        
        'cta.title': 'Prêt à voyager avec SMART CAB ?',
        'cta.subtitle': 'Rejoignez des milliers d\'utilisateurs qui font confiance à SMART CAB',

        // === PAGE CONTACT (contact.html) ===
        'contact.page_title': 'Contactez-nous - SMART CAB',
        'contact.hero.title': 'Contactez-nous',
        'contact.hero.subtitle': 'Nous sommes là pour vous aider',
        'contact.form.title': 'Envoyez-nous un message',
        'contact.form.name': 'Nom complet',
        'contact.form.name_placeholder': 'Jean Dupont',
        'contact.form.email': 'Adresse e-mail',
        'contact.form.email_placeholder': 'jean.dupont@email.com',
        'contact.form.phone': 'Numéro de téléphone',
        'contact.form.phone_placeholder': '+243 XXX XXX XXX',
        'contact.form.subject': 'Sujet',
        'contact.form.subject_general': 'Question générale',
        'contact.form.subject_technical': 'Support technique',
        'contact.form.subject_driver': 'Devenir chauffeur',
        'contact.form.subject_partnership': 'Partenariat',
        'contact.form.subject_other': 'Autre',
        'contact.form.message': 'Votre message',
        'contact.form.message_placeholder': 'Écrivez votre message ici...',
        'contact.form.send': 'Envoyer le message',
        'contact.form.sending': 'Envoi en cours...',
        'contact.form.success': 'Message envoyé avec succès !',
        'contact.form.error': 'Erreur lors de l\'envoi. Veuillez réessayer.',
        'contact.info.title': 'Informations de contact',
        'contact.info.address': 'Adresse',
        'contact.info.phone': 'Téléphone',
        'contact.info.email': 'E-mail',
        'contact.info.hours': 'Horaires',
        'contact.info.hours_value': '24h/24, 7j/7',

        // === PAGE FAQ (faq.html) ===
        'faq.page_title': 'Questions Fréquentes - SMART CAB',
        'faq.hero.title': 'Questions Fréquentes',
        'faq.hero.subtitle': 'Trouvez rapidement des réponses à vos questions',
        'faq.search': 'Rechercher une question...',
        'faq.category.general': 'Général',
        'faq.category.passenger': 'Passagers',
        'faq.category.driver': 'Conducteurs',
        'faq.category.payment': 'Paiement',
        'faq.category.safety': 'Sécurité',

        // === PAGE CGU (cgu.html) ===
        'cgu.page_title': 'Conditions Générales d\'Utilisation - SMART CAB',
        'cgu.hero.title': 'Conditions Générales d\'Utilisation',
        'cgu.hero.subtitle': 'Dernière mise à jour : Octobre 2025',
        'cgu.back': 'Retour à l\'accueil',
        'cgu.section1': 'Acceptation des Conditions',
        'cgu.section2': 'Description du Service',
        'cgu.section3': 'Inscription et Compte Utilisateur',
        'cgu.section4': 'Utilisation du Service',
        'cgu.section5': 'Tarification et Paiement',
        'cgu.section6': 'Annulation et Remboursement',
        'cgu.section7': 'Responsabilités',
        'cgu.section8': 'Propriété Intellectuelle',
        'cgu.section9': 'Modification des Conditions',
        'cgu.section10': 'Résiliation',

        // === PAGE MENTIONS LÉGALES (mentions-legales.html) ===
        'legal.page_title': 'Mentions Légales - SMART CAB',
        'legal.hero.title': 'Mentions Légales',
        'legal.hero.subtitle': 'Informations légales obligatoires',
        'legal.back': 'Retour à l\'accueil',
        'legal.company': 'Informations sur la société',
        'legal.hosting': 'Hébergement',
        'legal.property': 'Propriété intellectuelle',
        'legal.data': 'Données personnelles',
        'legal.liability': 'Limitation de responsabilité',

        // === PAGE POLITIQUE DE CONFIDENTIALITÉ (politique-confidentialite.html) ===
        'privacy.page_title': 'Politique de Confidentialité - SMART CAB',
        'privacy.hero.title': 'Politique de Confidentialité',
        'privacy.hero.subtitle': 'Comment nous protégeons vos données',
        'privacy.back': 'Retour à l\'accueil',
        'privacy.section1': 'Collecte des Données',
        'privacy.section2': 'Utilisation des Données',
        'privacy.section3': 'Partage des Données',
        'privacy.section4': 'Sécurité des Données',
        'privacy.section5': 'Vos Droits',
        'privacy.section6': 'Cookies',
        'privacy.section7': 'Modifications',
        'privacy.section8': 'Contact',

        // === FOOTER ===
        'footer.description': 'La solution de transport intelligent à Kinshasa.',
        'footer.quick_links': 'Liens Rapides',
        'footer.legal': 'Légal',
        'footer.cgu': 'CGU',
        'footer.privacy': 'Confidentialité',
        'footer.legal_notice': 'Mentions Légales',
        'footer.faq': 'FAQ',
        'footer.contact': 'Contact',
        'footer.about': 'À Propos',
        'footer.services': 'Services',
        'footer.driver': 'Devenir Chauffeur',
        'footer.rights': 'Tous droits réservés',
        'footer.address': '63, Avenue Colonel MONDJIBA, C/ Ngaliema, Kinshasa, RDC',

        // === BOUTONS COMMUNS ===
        'button.back_home': 'Retour à l\'accueil',
        'button.download': 'Télécharger',
        'button.send': 'Envoyer',
        'button.learn_more': 'En savoir plus',
        'button.signup': 'S\'inscrire',
    },

    // ========================================
    // ENGLISH (EN)
    // ========================================
    en: {
        // === NAVIGATION ===
        'nav.home': 'Home',
        'nav.about': 'About',
        'nav.services': 'Services',
        'nav.driver': 'Become a Driver',
        'nav.contact': 'Contact',
        'nav.faq': 'FAQ',

        // === INDEX PAGE (index.html) ===
        'hero.title': 'Travel safely in DRC',
        'hero.subtitle': 'Your ride, your choice.',
        'hero.description': 'The best way to move around Kinshasa. Fast, safe and affordable.',
        'hero.cta_passenger': 'Download the app',
        'hero.cta_driver': 'Become a driver',
        
        'how.title': 'How it works?',
        'how.step1.title': 'Order',
        'how.step1.desc': 'Open the app and enter your destination',
        'how.step2.title': 'Choose',
        'how.step2.desc': 'Select your vehicle type',
        'how.step3.title': 'Meet',
        'how.step3.desc': 'A certified driver arrives in minutes',
        'how.step4.title': 'Enjoy',
        'how.step4.desc': 'Relax and arrive safely',
        
        'features.title': 'Why choose SMART CAB?',
        'features.subtitle': 'A reimagined transport experience',
        'features.security.title': 'Safety first',
        'features.security.desc': 'All our drivers are thoroughly vetted',
        'features.pricing.title': 'Transparent pricing',
        'features.pricing.desc': 'Price shown before confirmation',
        'features.availability.title': '24/7 Availability',
        'features.availability.desc': 'Our drivers available day and night',
        'features.comfort.title': 'Comfort and reliability',
        'features.comfort.desc': 'Well-maintained vehicles',
        
        'pricing.title': 'Transparent Pricing',
        'pricing.subtitle': 'Official SMART CAB prices - Kinshasa',
        'pricing.daytime': 'Day (06h-20h59)',
        'pricing.nighttime': 'Night (21h-05h59)',
        'pricing.perkm': 'per km',
        'pricing.permin': 'per min',
        'pricing.base': 'Base',
        
        'download.title': 'Download SMART CAB',
        'download.subtitle': 'Available on iOS and Android',
        'download.ios': 'Download on App Store',
        'download.android': 'Download on Google Play',
        
        'cta.title': 'Ready to ride with SMART CAB?',
        'cta.subtitle': 'Join thousands of users who trust SMART CAB',

        // === CONTACT PAGE (contact.html) ===
        'contact.page_title': 'Contact Us - SMART CAB',
        'contact.hero.title': 'Contact Us',
        'contact.hero.subtitle': 'We\'re here to help',
        'contact.form.title': 'Send us a message',
        'contact.form.name': 'Full name',
        'contact.form.name_placeholder': 'John Doe',
        'contact.form.email': 'Email address',
        'contact.form.email_placeholder': 'john.doe@email.com',
        'contact.form.phone': 'Phone number',
        'contact.form.phone_placeholder': '+243 XXX XXX XXX',
        'contact.form.subject': 'Subject',
        'contact.form.subject_general': 'General question',
        'contact.form.subject_technical': 'Technical support',
        'contact.form.subject_driver': 'Become a driver',
        'contact.form.subject_partnership': 'Partnership',
        'contact.form.subject_other': 'Other',
        'contact.form.message': 'Your message',
        'contact.form.message_placeholder': 'Write your message here...',
        'contact.form.send': 'Send message',
        'contact.form.sending': 'Sending...',
        'contact.form.success': 'Message sent successfully!',
        'contact.form.error': 'Error sending. Please try again.',
        'contact.info.title': 'Contact information',
        'contact.info.address': 'Address',
        'contact.info.phone': 'Phone',
        'contact.info.email': 'Email',
        'contact.info.hours': 'Hours',
        'contact.info.hours_value': '24/7',

        // === FAQ PAGE (faq.html) ===
        'faq.page_title': 'FAQ - SMART CAB',
        'faq.hero.title': 'Frequently Asked Questions',
        'faq.hero.subtitle': 'Find quick answers to your questions',
        'faq.search': 'Search for a question...',
        'faq.category.general': 'General',
        'faq.category.passenger': 'Passengers',
        'faq.category.driver': 'Drivers',
        'faq.category.payment': 'Payment',
        'faq.category.safety': 'Safety',

        // === TERMS PAGE (cgu.html) ===
        'cgu.page_title': 'Terms of Service - SMART CAB',
        'cgu.hero.title': 'Terms of Service',
        'cgu.hero.subtitle': 'Last updated: October 2025',
        'cgu.back': 'Back to home',
        'cgu.section1': 'Acceptance of Terms',
        'cgu.section2': 'Service Description',
        'cgu.section3': 'User Registration and Account',
        'cgu.section4': 'Use of Service',
        'cgu.section5': 'Pricing and Payment',
        'cgu.section6': 'Cancellation and Refund',
        'cgu.section7': 'Responsibilities',
        'cgu.section8': 'Intellectual Property',
        'cgu.section9': 'Terms Modification',
        'cgu.section10': 'Termination',

        // === LEGAL NOTICE PAGE (mentions-legales.html) ===
        'legal.page_title': 'Legal Notice - SMART CAB',
        'legal.hero.title': 'Legal Notice',
        'legal.hero.subtitle': 'Required legal information',
        'legal.back': 'Back to home',
        'legal.company': 'Company Information',
        'legal.hosting': 'Hosting',
        'legal.property': 'Intellectual Property',
        'legal.data': 'Personal Data',
        'legal.liability': 'Limitation of Liability',

        // === PRIVACY POLICY PAGE (politique-confidentialite.html) ===
        'privacy.page_title': 'Privacy Policy - SMART CAB',
        'privacy.hero.title': 'Privacy Policy',
        'privacy.hero.subtitle': 'How we protect your data',
        'privacy.back': 'Back to home',
        'privacy.section1': 'Data Collection',
        'privacy.section2': 'Data Usage',
        'privacy.section3': 'Data Sharing',
        'privacy.section4': 'Data Security',
        'privacy.section5': 'Your Rights',
        'privacy.section6': 'Cookies',
        'privacy.section7': 'Modifications',
        'privacy.section8': 'Contact',

        // === FOOTER ===
        'footer.description': 'Smart transport solution in Kinshasa.',
        'footer.quick_links': 'Quick Links',
        'footer.legal': 'Legal',
        'footer.cgu': 'Terms',
        'footer.privacy': 'Privacy',
        'footer.legal_notice': 'Legal Notice',
        'footer.faq': 'FAQ',
        'footer.contact': 'Contact',
        'footer.about': 'About',
        'footer.services': 'Services',
        'footer.driver': 'Become a Driver',
        'footer.rights': 'All rights reserved',
        'footer.address': '63, Avenue Colonel MONDJIBA, Ngaliema, Kinshasa, DRC',

        // === COMMON BUTTONS ===
        'button.back_home': 'Back to home',
        'button.download': 'Download',
        'button.send': 'Send',
        'button.learn_more': 'Learn more',
        'button.signup': 'Sign up',
    }
};

// Exporter les traductions dans window pour i18n.js
if (typeof window !== 'undefined') {
    window.translations = translations;
}