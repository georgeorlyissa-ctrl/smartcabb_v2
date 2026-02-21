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
    'book_ride': 'Réserver une course',
    'pickup_location': 'Lieu de prise en charge',
    'destination': 'Destination',
    'estimate_price': 'Prix estimé',
    'passenger_count': 'Nombre de passagers',
    'choose_vehicle': 'Choisir un véhicule',
    'smart_standard': 'SmartCabb Standard',
    'smart_confort': 'SmartCabb Confort',
    'smart_plus': 'SmartCabb Plus',
    'smart_business': 'SmartCabb Business',
    'confirm_booking': 'Confirmer la commande', // ✅ FIX #1: Changé de "réservation" à "commande"
    
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
    
    // Ride tracking
    'ride_in_progress': 'Course en cours',
    'driver_on_way': 'Conducteur en route',
    'arrived': 'Arrivé',
    'waiting_time': 'Temps d\'attente',
    'billing_started': 'Facturation commencée',
    'show_code': 'Montrer le code',
    'confirmation_code': 'Code de confirmation',
    
    // Rating
    'rate_driver': 'Évaluer le conducteur',
    'leave_comment': 'Laisser un commentaire',
    'submit_rating': 'Soumettre l\'évaluation',
    
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
    'valid_to': 'Valable jusqu\'au',
    'usage_limit': 'Limite d\'utilisation',
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
    'book_ride': 'Book a ride',
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
    
    // Ride tracking
    'ride_in_progress': 'Ride in progress',
    'driver_on_way': 'Driver on the way',
    'arrived': 'Arrived',
    'waiting_time': 'Waiting time',
    'billing_started': 'Billing started',
    'show_code': 'Show code',
    'confirmation_code': 'Confirmation code',
    
    // Rating
    'rate_driver': 'Rate driver',
    'leave_comment': 'Leave a comment',
    'submit_rating': 'Submit rating',
    
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
  const language = state.language || 'fr';
  
  const t = (key: keyof typeof translations.fr): string => {
    return translations[language][key] || translations.fr[key] || key;
  };
  
  return { t, language };
}