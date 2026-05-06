import { useAppState } from './useAppState';

const translations = {
  fr: {
    // Navigation
    welcome: 'Bienvenue',
    login: 'Connexion',
    register: 'Inscription',
    profile: 'Profil',
    settings: 'Paramètres',
    logout: 'Déconnexion',
    
    // Ride booking
    'book_ride': 'Commander une course',
    'pickup_location': 'Lieu de prise en charge',
    'destination': 'Destination',
    'estimate_price': 'Prix estimé',
    'passenger_count': 'Nombre de passagers',
    'choose_vehicle': 'Choisir un véhicule',
    'smart_standard': 'SmartCabb Standard',
    'smart_confort': 'SmartCabb Confort',
    'smart_plus': 'SmartCabb Plus',
    'smart_business': 'SmartCabb Business',
    'confirm_booking': 'Confirmer la commande',

    // Home / Map
    'where_to': 'Où allez-vous ?',
    'enter_destination': 'Entrez votre destination',
    'recent_places': 'Lieux récents',
    'saved_places': 'Lieux enregistrés',
    'search_placeholder': 'Rechercher un lieu...',
    'good_morning': 'Bonjour',
    'good_afternoon': 'Bonne après-midi',
    'good_evening': 'Bonsoir',

    // Vehicle details
    'seats': 'places',
    'from_price': 'à partir de',
    'standard_desc': 'Économique et confortable',
    'comfort_desc': "Plus d'espace et climatisation",
    'business_desc': 'Premium pour vos RDV professionnels',
    'familia_desc': '6-7 places pour toute la famille',

    // Payment
    'payment_method': 'Mode de paiement',
    'mobile_money': 'Mobile Money',
    'card': 'Carte bancaire',
    'cash': 'Espèces',
    'payment_successful': 'Paiement réussi',
    'your_payment_of': 'Votre paiement de',
    'to_smartcab_successful': 'à SmartCab a été effectué avec succès',
    'ride_duration': 'Durée du trajet',
    'add_tip': 'Ajouter un pourboire',
    'tip_amount': 'Montant du pourboire',
    'trip_summary': 'Résumé du trajet',
    'distance': 'Distance',
    'price': 'Prix',
    'confirm_payment': 'Confirmer le paiement',

    // Ride tracking
    'ride_in_progress': 'Course en cours',
    'driver_on_way': 'Conducteur en route',
    'arrived': 'Arrivé',
    'waiting_time': "Temps d'attente",
    'billing_started': 'Facturation commencée',
    'show_code': 'Montrer le code',
    'confirmation_code': 'Code de confirmation',
    'searching_driver': "Recherche d'un chauffeur...",
    'searching_desc': 'Nous trouvons le meilleur chauffeur pour vous',
    'cancel_search': 'Annuler la recherche',
    'estimated_wait': 'Attente estimée',
    'driver_found': 'Chauffeur trouvé !',
    'arrive_in': 'Arrivée dans',
    'contact_driver': 'Contacter le chauffeur',

    // Rating
    'rate_driver': 'Évaluer le conducteur',
    'rate_your_ride': 'Évaluez votre course',
    'how_was_driver': 'Comment était votre conducteur ?',
    'leave_comment': 'Laisser un commentaire',
    'add_comment': 'Ajouter un commentaire (optionnel)',
    'submit_rating': "Soumettre l'évaluation",

    // Rating screen — RatingScreen.tsx
    'no_ride_to_rate':    'Aucune course à évaluer',
    'back_home':          "Retour à l'accueil",
    'your_driver':        'Votre chauffeur',
    'ride_completed':     'Course terminée !',
    'rate_experience':    'Évaluez votre expérience',
    'total_amount':       'Montant total',
    'how_was_ride':       "Comment s'est passée votre course ?",
    'tap_star_to_rate':   'Appuyez sur une étoile pour noter',
    'quick_comment_opt':  'Commentaire rapide (optionnel)',
    'free_comment_opt':   'Commentaire libre (optionnel)',
    'share_experience':   'Partagez votre expérience...',
    'sending':            'Envoi en cours...',
    'submit_rating_btn':  'Envoyer mon évaluation',
    'skip_rating':        "Passer pour l'instant",
    'please_select_rating': 'Veuillez choisir une note (1 à 5 étoiles)',
    'rating_thanks':      '⭐ Merci pour votre évaluation !',
    'rating_stars_given': 'Vous avez attribué',
    'rating_stars_to':    'étoile(s) à',
    'rating_save_error':  "Impossible d'enregistrer l'évaluation. Réessayez.",
    // Star labels
    'star_very_bad':   'Très mauvais',
    'star_bad':        'Mauvais',
    'star_average':    'Moyen',
    'star_good':       'Bien',
    'star_excellent':  'Excellent !',
    // Quick comments
    'qc_great_driver':  'Excellent conducteur',
    'qc_clean_car':     'Véhicule propre',
    'qc_safe_driving':  'Conduite sécuritaire',
    'qc_punctual':      'Très ponctuel',
    'qc_friendly':      'Très sympathique',
    'qc_knows_routes':  'Bonne connaissance des routes',

    // Common
    'continue': 'Continuer',
    'cancel': 'Annuler',
    'back': 'Retour',
    'save': 'Enregistrer',
    'edit': 'Modifier',
    'delete': 'Supprimer',
    'loading': 'Chargement...',
    'error': 'Erreur',
    'success': 'Succès',
    'language': 'Langue',
    'french': 'Français',
    'english': 'Anglais',
    'switch_language': 'Changer de langue',
    'min': 'min',

    // Settings
    'language_desc': "Choisir la langue de l'application",
    'notifications': 'Notifications',
    'notifications_desc': 'Gérer les notifications push',
    'privacy': 'Confidentialité',
    'privacy_desc': 'Paramètres de confidentialité',
    'payment_settings': 'Moyens de paiement',
    'payment_desc': 'Gérer vos cartes et comptes',
    'dark_mode': 'Apparence',
    'dark_mode_on': 'Mode sombre activé',
    'dark_mode_off': 'Mode clair activé',
    'my_profile': 'Mon profil',
    'my_profile_desc': 'Informations personnelles',
    'help_support': 'Aide et support',
    'help_desc': 'FAQ et contact support',
    'app_version': 'SmartCabb v2.0.0',
    'rights': '© 2026 SmartCabb. Tous droits réservés.',

    // Wallet
    'wallet': 'Portefeuille',
    'wallet_balance': 'Solde',
    'recharge': 'Recharger',
    'transaction_history': 'Historique des transactions',

    // History
    'ride_history': 'Historique des courses',
    'no_rides': 'Aucune course pour le moment',
    'trip_from': 'De',
    'trip_to': 'À',

    // Register
    'full_name': 'Nom complet',
    'phone_number': 'Numéro de téléphone',
    'confirm_password': 'Confirmer le mot de passe',
    'terms_agree': "J'accepte les",
    'terms_link': "conditions d'utilisation",
    'register_btn': 'Créer un compte',
    'already_account': 'Déjà un compte ?',

    // Admin
    'admin_dashboard': 'Tableau de bord Admin',
    'drivers_management': 'Gestion des conducteurs',
    'passengers_management': 'Gestion des passagers',
    'promo_codes': 'Codes promo',
    'marketing_campaigns': 'Campagnes marketing',
    'create_promo': 'Créer un code promo',
    'create_campaign': 'Créer une campagne',
    'promo_code': 'Code promo',
    'discount': 'Remise',
    'valid_from': 'Valable du',
    'valid_to': "Valable jusqu'au",
    'usage_limit': "Limite d'utilisation",
    'campaign_title': 'Titre de la campagne',
    'campaign_message': 'Message',
    'target_audience': 'Public cible',
    'passengers': 'Passagers',
    'drivers': 'Conducteurs',
    'both': 'Les deux',

    // Driver
    'driver_dashboard': 'Tableau de bord Conducteur',
    'go_online': 'Se connecter',
    'go_offline': 'Se déconnecter',
    'new_ride_request': 'Nouvelle demande de course',
    'accept_ride': 'Accepter la course',
    'decline_ride': 'Refuser la course',
    'start_ride': 'Commencer la course',
    'end_ride': 'Terminer la course',
    'amount_to_pay': 'Montant à payer',
    'distance_traveled': 'Distance parcourue',
    'trip_duration': 'Durée du trajet',

    // Time units
    'minutes': 'minutes',
    'hours': 'heures',
    'km': 'km',
    'cdf': 'CDF'
  },
  en: {
    // Navigation
    welcome: 'Welcome',
    login: 'Login',
    register: 'Register',
    profile: 'Profile',
    settings: 'Settings',
    logout: 'Logout',

    // Ride booking
    'book_ride': 'Book a Ride',
    'pickup_location': 'Pickup location',
    'destination': 'Destination',
    'estimate_price': 'Estimated price',
    'passenger_count': 'Number of passengers',
    'choose_vehicle': 'Choose vehicle',
    'smart_standard': 'SmartCabb Standard',
    'smart_confort': 'SmartCabb Comfort',
    'smart_plus': 'SmartCabb Plus',
    'smart_business': 'SmartCabb Business',
    'confirm_booking': 'Confirm booking',

    // Home / Map
    'where_to': 'Where are you going?',
    'enter_destination': 'Enter your destination',
    'recent_places': 'Recent places',
    'saved_places': 'Saved places',
    'search_placeholder': 'Search for a place...',
    'good_morning': 'Good morning',
    'good_afternoon': 'Good afternoon',
    'good_evening': 'Good evening',

    // Vehicle details
    'seats': 'seats',
    'from_price': 'from',
    'standard_desc': 'Economical and comfortable',
    'comfort_desc': 'More space and air conditioning',
    'business_desc': 'Premium for your professional appointments',
    'familia_desc': '6-7 seats for the whole family',

    // Payment
    'payment_method': 'Payment method',
    'mobile_money': 'Mobile Money',
    'card': 'Credit Card',
    'cash': 'Cash',
    'payment_successful': 'Payment successful',
    'your_payment_of': 'Your payment of',
    'to_smartcab_successful': 'to SmartCab was successful',
    'ride_duration': 'Ride duration',
    'add_tip': 'Add tip',
    'tip_amount': 'Tip amount',
    'trip_summary': 'Trip summary',
    'distance': 'Distance',
    'price': 'Price',
    'confirm_payment': 'Confirm Payment',

    // Ride tracking
    'ride_in_progress': 'Ride in progress',
    'driver_on_way': 'Driver on the way',
    'arrived': 'Arrived',
    'waiting_time': 'Waiting time',
    'billing_started': 'Billing started',
    'show_code': 'Show code',
    'confirmation_code': 'Confirmation code',
    'searching_driver': 'Searching for a driver...',
    'searching_desc': "We're finding the best driver for you",
    'cancel_search': 'Cancel search',
    'estimated_wait': 'Estimated wait',
    'driver_found': 'Driver found!',
    'arrive_in': 'Arriving in',
    'contact_driver': 'Contact driver',

    // Rating
    'rate_driver': 'Rate driver',
    'rate_your_ride': 'Rate your ride',
    'how_was_driver': 'How was your driver?',
    'leave_comment': 'Leave a comment',
    'add_comment': 'Add a comment (optional)',
    'submit_rating': 'Submit Rating',

    // Rating screen — RatingScreen.tsx
    'no_ride_to_rate':    'No ride to rate',
    'back_home':          'Back to home',
    'your_driver':        'Your driver',
    'ride_completed':     'Ride completed!',
    'rate_experience':    'Rate your experience',
    'total_amount':       'Total amount',
    'how_was_ride':       'How was your ride?',
    'tap_star_to_rate':   'Tap a star to rate',
    'quick_comment_opt':  'Quick comment (optional)',
    'free_comment_opt':   'Free comment (optional)',
    'share_experience':   'Share your experience...',
    'sending':            'Sending...',
    'submit_rating_btn':  'Submit my rating',
    'skip_rating':        'Skip for now',
    'please_select_rating': 'Please select a rating (1 to 5 stars)',
    'rating_thanks':      '⭐ Thank you for your rating!',
    'rating_stars_given': 'You gave',
    'rating_stars_to':    'star(s) to',
    'rating_save_error':  'Unable to save rating. Please try again.',
    // Star labels
    'star_very_bad':   'Very bad',
    'star_bad':        'Bad',
    'star_average':    'Average',
    'star_good':       'Good',
    'star_excellent':  'Excellent!',
    // Quick comments
    'qc_great_driver':  'Great driver',
    'qc_clean_car':     'Clean car',
    'qc_safe_driving':  'Safe driving',
    'qc_punctual':      'Very punctual',
    'qc_friendly':      'Very friendly',
    'qc_knows_routes':  'Good knowledge of routes',

    // Common
    'continue': 'Continue',
    'cancel': 'Cancel',
    'back': 'Back',
    'save': 'Save',
    'edit': 'Edit',
    'delete': 'Delete',
    'loading': 'Loading...',
    'error': 'Error',
    'success': 'Success',
    'language': 'Language',
    'french': 'French',
    'english': 'English',
    'switch_language': 'Switch language',
    'min': 'min',

    // Settings
    'language_desc': 'Choose the app language',
    'notifications': 'Notifications',
    'notifications_desc': 'Manage push notifications',
    'privacy': 'Privacy',
    'privacy_desc': 'Privacy settings',
    'payment_settings': 'Payment methods',
    'payment_desc': 'Manage your cards and accounts',
    'dark_mode': 'Appearance',
    'dark_mode_on': 'Dark mode enabled',
    'dark_mode_off': 'Light mode enabled',
    'my_profile': 'My profile',
    'my_profile_desc': 'Personal information',
    'help_support': 'Help & support',
    'help_desc': 'FAQ and support contact',
    'app_version': 'SmartCabb v2.0.0',
    'rights': '© 2026 SmartCabb. All rights reserved.',

    // Wallet
    'wallet': 'Wallet',
    'wallet_balance': 'Balance',
    'recharge': 'Recharge',
    'transaction_history': 'Transaction history',

    // History
    'ride_history': 'Ride History',
    'no_rides': 'No rides yet',
    'trip_from': 'From',
    'trip_to': 'To',

    // Register
    'full_name': 'Full name',
    'phone_number': 'Phone number',
    'confirm_password': 'Confirm password',
    'terms_agree': 'I agree to the',
    'terms_link': 'terms of service',
    'register_btn': 'Create Account',
    'already_account': 'Already have an account?',

    // Admin
    'admin_dashboard': 'Admin Dashboard',
    'drivers_management': 'Drivers Management',
    'passengers_management': 'Passengers Management',
    'promo_codes': 'Promo Codes',
    'marketing_campaigns': 'Marketing Campaigns',
    'create_promo': 'Create Promo Code',
    'create_campaign': 'Create Campaign',
    'promo_code': 'Promo Code',
    'discount': 'Discount',
    'valid_from': 'Valid from',
    'valid_to': 'Valid to',
    'usage_limit': 'Usage limit',
    'campaign_title': 'Campaign title',
    'campaign_message': 'Message',
    'target_audience': 'Target audience',
    'passengers': 'Passengers',
    'drivers': 'Drivers',
    'both': 'Both',

    // Driver
    'driver_dashboard': 'Driver Dashboard',
    'go_online': 'Go online',
    'go_offline': 'Go offline',
    'new_ride_request': 'New ride request',
    'accept_ride': 'Accept ride',
    'decline_ride': 'Decline ride',
    'start_ride': 'Start ride',
    'end_ride': 'End ride',
    'amount_to_pay': 'Amount to pay',
    'distance_traveled': 'Distance traveled',
    'trip_duration': 'Trip duration',

    // Time units
    'minutes': 'minutes',
    'hours': 'hours',
    'km': 'km',
    'cdf': 'CDF'
  }
};

export function useTranslation() {
  const { state } = useAppState();
  const language = (state.language || 'fr') as 'fr' | 'en';

  const t = (key: string): string => {
    const langTranslations = translations[language] as Record<string, string>;
    const fallback = translations.fr as Record<string, string>;
    return langTranslations[key] ?? fallback[key] ?? key;
  };

  return { t, language };
}
