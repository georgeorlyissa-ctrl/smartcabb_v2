import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES & LANGUAGE CONTEXT
// ─────────────────────────────────────────────────────────────────────────────

type Lang = "fr" | "en";

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
}

const LangContext = createContext<LangCtx | undefined>(undefined);

function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used inside LangProvider");
  return ctx;
}

// ─────────────────────────────────────────────────────────────────────────────
// TRANSLATIONS
// ─────────────────────────────────────────────────────────────────────────────

const T = {
  fr: {
    // App
    app_name: "SmartCabb",
    tagline: "Transport intelligent",
    // Login
    login_title: "Connexion",
    login_subtitle: "Bienvenue sur SmartCabb",
    phone_or_email: "Téléphone ou Email",
    password: "Mot de passe",
    show_password: "Afficher",
    hide_password: "Masquer",
    login_btn: "Se connecter",
    no_account: "Pas encore de compte ?",
    register_link: "S'inscrire",
    forgot_password: "Mot de passe oublié ?",
    logging_in: "Connexion...",
    // Register
    register_title: "Inscription",
    register_subtitle: "Créez votre compte passager",
    full_name: "Nom complet",
    phone_number: "Numéro de téléphone",
    confirm_password: "Confirmer le mot de passe",
    terms_agree: "J'accepte les",
    terms_link: "conditions d'utilisation",
    register_btn: "Créer un compte",
    already_account: "Déjà un compte ?",
    login_link: "Se connecter",
    // Map / Home
    good_morning: "Bonjour",
    good_afternoon: "Bonne après-midi",
    good_evening: "Bonsoir",
    where_to: "Où allez-vous ?",
    enter_destination: "Entrez votre destination",
    pickup_here: "Prise en charge ici",
    recent: "Récents",
    saved_places: "Lieux enregistrés",
    home: "Domicile",
    work: "Travail",
    book_ride: "Commander une course",
    // Vehicle types
    choose_vehicle: "Choisir un véhicule",
    standard: "Standard",
    standard_desc: "Économique et confortable",
    comfort: "Confort",
    comfort_desc: "Plus d'espace et climatisation",
    business: "Business",
    business_desc: "Premium pour vos RDV pro",
    familia: "Familia",
    familia_desc: "6-7 places pour la famille",
    seats: "places",
    from: "à partir de",
    // Searching
    searching_driver: "Recherche d'un chauffeur...",
    searching_desc: "Nous trouvons le meilleur chauffeur pour vous",
    cancel_search: "Annuler la recherche",
    estimated_wait: "Attente estimée",
    min: "min",
    // Driver found
    driver_found: "Chauffeur trouvé !",
    driver_on_way: "Votre chauffeur arrive",
    arrive_in: "Arrivée dans",
    driver_rating: "Note",
    total_rides: "courses",
    vehicle_details: "Détails du véhicule",
    contact_driver: "Contacter le chauffeur",
    // Payment
    payment_method: "Mode de paiement",
    cash: "Espèces",
    mobile_money: "Mobile Money",
    card: "Carte bancaire",
    trip_summary: "Résumé du trajet",
    distance: "Distance",
    duration: "Durée",
    price: "Prix",
    confirm_payment: "Confirmer le paiement",
    // Ride in progress
    ride_in_progress: "Course en cours",
    destination: "Destination",
    // Rating
    rate_your_ride: "Évaluez votre course",
    how_was_driver: "Comment était votre chauffeur ?",
    add_comment: "Ajouter un commentaire (optionnel)",
    submit_rating: "Soumettre l'évaluation",
    // Settings
    settings: "Paramètres",
    language_settings: "Langue",
    language_desc: "Choisir la langue de l'application",
    notifications: "Notifications",
    notifications_desc: "Gérer les notifications push",
    privacy: "Confidentialité",
    privacy_desc: "Paramètres de confidentialité",
    payment_settings: "Moyens de paiement",
    payment_desc: "Gérer vos cartes et comptes",
    dark_mode: "Apparence",
    dark_mode_on: "Mode sombre activé",
    dark_mode_off: "Mode clair activé",
    my_profile: "Mon profil",
    my_profile_desc: "Informations personnelles",
    help_support: "Aide et support",
    help_desc: "FAQ et contact support",
    logout: "Se déconnecter",
    app_version: "SmartCabb v2.0.0",
    rights: "© 2026 SmartCabb. Tous droits réservés.",
    // Language picker
    lang_fr: "Français",
    lang_en: "English",
    switch_language: "Changer de langue",
    // Wallet
    wallet: "Portefeuille",
    wallet_balance: "Solde",
    recharge: "Recharger",
    // History
    ride_history: "Historique",
    no_rides: "Aucune course pour le moment",
    // Profile
    profile: "Profil",
    save_changes: "Enregistrer",
    // Navigation bottom
    nav_home: "Accueil",
    nav_history: "Historique",
    nav_wallet: "Portefeuille",
    nav_profile: "Profil",
  },
  en: {
    // App
    app_name: "SmartCabb",
    tagline: "Smart transport",
    // Login
    login_title: "Login",
    login_subtitle: "Welcome to SmartCabb",
    phone_or_email: "Phone or Email",
    password: "Password",
    show_password: "Show",
    hide_password: "Hide",
    login_btn: "Sign In",
    no_account: "Don't have an account?",
    register_link: "Sign Up",
    forgot_password: "Forgot password?",
    logging_in: "Signing in...",
    // Register
    register_title: "Sign Up",
    register_subtitle: "Create your passenger account",
    full_name: "Full name",
    phone_number: "Phone number",
    confirm_password: "Confirm password",
    terms_agree: "I agree to the",
    terms_link: "terms of service",
    register_btn: "Create Account",
    already_account: "Already have an account?",
    login_link: "Sign In",
    // Map / Home
    good_morning: "Good morning",
    good_afternoon: "Good afternoon",
    good_evening: "Good evening",
    where_to: "Where are you going?",
    enter_destination: "Enter your destination",
    pickup_here: "Pick up here",
    recent: "Recent",
    saved_places: "Saved places",
    home: "Home",
    work: "Work",
    book_ride: "Book a Ride",
    // Vehicle types
    choose_vehicle: "Choose a vehicle",
    standard: "Standard",
    standard_desc: "Economical and comfortable",
    comfort: "Comfort",
    comfort_desc: "More space and air conditioning",
    business: "Business",
    business_desc: "Premium for your appointments",
    familia: "Familia",
    familia_desc: "6-7 seats for the family",
    seats: "seats",
    from: "from",
    // Searching
    searching_driver: "Searching for a driver...",
    searching_desc: "We're finding the best driver for you",
    cancel_search: "Cancel search",
    estimated_wait: "Estimated wait",
    min: "min",
    // Driver found
    driver_found: "Driver found!",
    driver_on_way: "Your driver is coming",
    arrive_in: "Arriving in",
    driver_rating: "Rating",
    total_rides: "rides",
    vehicle_details: "Vehicle details",
    contact_driver: "Contact driver",
    // Payment
    payment_method: "Payment method",
    cash: "Cash",
    mobile_money: "Mobile Money",
    card: "Credit Card",
    trip_summary: "Trip summary",
    distance: "Distance",
    duration: "Duration",
    price: "Price",
    confirm_payment: "Confirm Payment",
    // Ride in progress
    ride_in_progress: "Ride in progress",
    destination: "Destination",
    // Rating
    rate_your_ride: "Rate your ride",
    how_was_driver: "How was your driver?",
    add_comment: "Add a comment (optional)",
    submit_rating: "Submit Rating",
    // Settings
    settings: "Settings",
    language_settings: "Language",
    language_desc: "Choose the app language",
    notifications: "Notifications",
    notifications_desc: "Manage push notifications",
    privacy: "Privacy",
    privacy_desc: "Privacy settings",
    payment_settings: "Payment methods",
    payment_desc: "Manage your cards and accounts",
    dark_mode: "Appearance",
    dark_mode_on: "Dark mode enabled",
    dark_mode_off: "Light mode enabled",
    my_profile: "My profile",
    my_profile_desc: "Personal information",
    help_support: "Help & support",
    help_desc: "FAQ and support contact",
    logout: "Sign Out",
    app_version: "SmartCabb v2.0.0",
    rights: "© 2026 SmartCabb. All rights reserved.",
    // Language picker
    lang_fr: "Français",
    lang_en: "English",
    switch_language: "Switch language",
    // Wallet
    wallet: "Wallet",
    wallet_balance: "Balance",
    recharge: "Recharge",
    // History
    ride_history: "History",
    no_rides: "No rides yet",
    // Profile
    profile: "Profile",
    save_changes: "Save Changes",
    // Navigation bottom
    nav_home: "Home",
    nav_history: "History",
    nav_wallet: "Wallet",
    nav_profile: "Profile",
  },
};

function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    try {
      const saved = localStorage.getItem("smartcabb_language") as Lang;
      if (saved === "fr" || saved === "en") return saved;
      return navigator.language.toLowerCase().startsWith("fr") ? "fr" : "en";
    } catch {
      return "fr";
    }
  });

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try { localStorage.setItem("smartcabb_language", l); } catch {}
  }, []);

  const t = useCallback((key: string): string => {
    return (T[lang] as Record<string, string>)[key] ?? (T.fr as Record<string, string>)[key] ?? key;
  }, [lang]);

  return <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>;
}

// ─────────────────────────────────────────────────────────────────────────────
// ICONS (inline SVG)
// ─────────────────────────────────────────────────────────────────────────────

const Icons = {
  Globe: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  ),
  Search: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  MapPin: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
    </svg>
  ),
  Home: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  Briefcase: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  ),
  Clock: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  Car: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v9a2 2 0 0 1-2 2h-3" /><circle cx="7.5" cy="17.5" r="2.5" /><circle cx="17.5" cy="17.5" r="2.5" />
    </svg>
  ),
  Settings: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  User: ({ size = 5 }: { size?: number }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={`w-${size} h-${size}`}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  ),
  Eye: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
    </svg>
  ),
  EyeOff: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ),
  ArrowLeft: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
    </svg>
  ),
  ChevronRight: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  ),
  Star: ({ filled = false }: { filled?: boolean }) => (
    <svg viewBox="0 0 24 24" fill={filled ? "#F59E0B" : "none"} stroke="#F59E0B" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  Bell: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  ),
  Shield: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  CreditCard: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  ),
  LogOut: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
  HelpCircle: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  Wallet: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M20 12V22H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h16v4" /><path d="M20 12a2 2 0 0 0-2 2 2 2 0 0 0 2 2h4v-4h-4z" /><circle cx="18" cy="14" r=".5" fill="currentColor" />
    </svg>
  ),
  History: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 .49-4.95" />
    </svg>
  ),
  CheckCircle: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
};

// ─────────────────────────────────────────────────────────────────────────────
// LANGUAGE SELECTOR MODAL
// ─────────────────────────────────────────────────────────────────────────────

function LanguageModal({ onClose }: { onClose: () => void }) {
  const { lang, setLang, t } = useLang();

  const options: { code: Lang; flag: string; nativeName: string; label: string }[] = [
    { code: "fr", flag: "🇫🇷", nativeName: "Français", label: t("lang_fr") },
    { code: "en", flag: "🇬🇧", nativeName: "English", label: t("lang_en") },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-sm bg-white rounded-t-3xl p-6 pb-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "slideUp 0.25s ease-out" }}
      >
        <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-5" />
        <h3 className="text-center mb-6" style={{ fontSize: 18, fontWeight: 700, color: "#111827" }}>
          {t("switch_language")}
        </h3>
        <div className="space-y-3">
          {options.map((opt) => (
            <button
              key={opt.code}
              onClick={() => { setLang(opt.code); onClose(); }}
              className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all"
              style={{
                background: lang === opt.code ? "#EFF6FF" : "#F9FAFB",
                border: lang === opt.code ? "2px solid #3B82F6" : "2px solid transparent",
              }}
            >
              <span style={{ fontSize: 32 }}>{opt.flag}</span>
              <div className="flex-1 text-left">
                <div style={{ fontSize: 16, fontWeight: 600, color: "#111827" }}>{opt.nativeName}</div>
                <div style={{ fontSize: 13, color: "#6B7280" }}>{opt.label}</div>
              </div>
              {lang === opt.code && (
                <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3} className="w-3.5 h-3.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
      <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LANGUAGE FLAG BUTTON (floating)
// ─────────────────────────────────────────────────────────────────────────────

function LangButton({ onClick }: { onClick: () => void }) {
  const { lang } = useLang();
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white shadow-md border border-gray-100 transition-all hover:shadow-lg active:scale-95"
      style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}
    >
      <span style={{ fontSize: 18 }}>{lang === "fr" ? "🇫🇷" : "🇬🇧"}</span>
      <span>{lang.toUpperCase()}</span>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BOTTOM NAVIGATION
// ─────────────────────────────────────────────────────────────────────────────

type Screen = "login" | "register" | "home" | "searching" | "driver_found" | "settings" | "history" | "wallet" | "profile";

function BottomNav({ screen, onNavigate }: { screen: Screen; onNavigate: (s: Screen) => void }) {
  const { t } = useLang();
  const tabs = [
    { id: "home" as Screen, icon: Icons.Car, label: t("nav_home") },
    { id: "history" as Screen, icon: Icons.History, label: t("nav_history") },
    { id: "wallet" as Screen, icon: Icons.Wallet, label: t("nav_wallet") },
    { id: "settings" as Screen, icon: Icons.Settings, label: t("settings") },
  ];
  const active = ["home", "searching", "driver_found"].includes(screen) ? "home" : screen;
  return (
    <div className="fixed bottom-0 left-0 right-0 max-w-sm mx-auto bg-white border-t border-gray-100 flex" style={{ paddingBottom: "env(safe-area-inset-bottom, 8px)" }}>
      {tabs.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          onClick={() => onNavigate(id)}
          className="flex-1 flex flex-col items-center pt-3 pb-2 gap-1 transition-colors"
          style={{ color: active === id ? "#3B82F6" : "#9CA3AF" }}
        >
          <Icon />
          <span style={{ fontSize: 11, fontWeight: active === id ? 700 : 400 }}>{label}</span>
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN: LOGIN
// ─────────────────────────────────────────────────────────────────────────────

function LoginScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const { t } = useLang();
  const [showPwd, setShowPwd] = useState(false);
  const [showLang, setShowLang] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(135deg, #0F172A 0%, #1E3A5F 50%, #0F172A 100%)" }}>
      {showLang && <LanguageModal onClose={() => setShowLang(false)} />}

      {/* Language button top right */}
      <div className="flex justify-end p-4">
        <LangButton onClick={() => setShowLang(true)} />
      </div>

      {/* Logo */}
      <div className="flex flex-col items-center px-6 pt-8 pb-10">
        <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-4 shadow-2xl" style={{ background: "linear-gradient(135deg, #3B82F6, #06B6D4)" }}>
          <span style={{ fontSize: 36 }}>🚖</span>
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "white", letterSpacing: -0.5 }}>{t("app_name")}</h1>
        <p style={{ fontSize: 14, color: "#94A3B8", marginTop: 4 }}>{t("tagline")}</p>
      </div>

      {/* Card */}
      <div className="flex-1 bg-white rounded-t-3xl px-6 pt-8 pb-6">
        <h2 style={{ fontSize: 22, fontWeight: 700, color: "#111827", marginBottom: 4 }}>{t("login_title")}</h2>
        <p style={{ fontSize: 14, color: "#6B7280", marginBottom: 28 }}>{t("login_subtitle")}</p>

        <div className="space-y-4">
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>
              {t("phone_or_email")}
            </label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="+243 XXX XXX XXX"
              className="w-full px-4 py-3 rounded-xl border outline-none transition-all"
              style={{ borderColor: "#E5E7EB", fontSize: 14, background: "#F9FAFB" }}
              onFocus={(e) => (e.target.style.borderColor = "#3B82F6")}
              onBlur={(e) => (e.target.style.borderColor = "#E5E7EB")}
            />
          </div>

          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>
              {t("password")}
            </label>
            <div className="relative">
              <input
                type={showPwd ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 pr-12 rounded-xl border outline-none transition-all"
                style={{ borderColor: "#E5E7EB", fontSize: 14, background: "#F9FAFB" }}
                onFocus={(e) => (e.target.style.borderColor = "#3B82F6")}
                onBlur={(e) => (e.target.style.borderColor = "#E5E7EB")}
              />
              <button
                onClick={() => setShowPwd(!showPwd)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPwd ? <Icons.EyeOff /> : <Icons.Eye />}
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            <button style={{ fontSize: 13, color: "#3B82F6", fontWeight: 500 }}>
              {t("forgot_password")}
            </button>
          </div>

          <button
            onClick={() => onNavigate("home")}
            className="w-full py-4 rounded-2xl text-white transition-all active:scale-95 shadow-lg"
            style={{ background: "linear-gradient(135deg, #3B82F6, #06B6D4)", fontSize: 15, fontWeight: 700 }}
          >
            {t("login_btn")}
          </button>
        </div>

        <div className="flex items-center justify-center gap-1 mt-6">
          <span style={{ fontSize: 14, color: "#6B7280" }}>{t("no_account")}</span>
          <button onClick={() => onNavigate("register")} style={{ fontSize: 14, color: "#3B82F6", fontWeight: 600 }}>
            {t("register_link")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN: REGISTER
// ─────────────────────────────────────────────────────────────────────────────

function RegisterScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const { t } = useLang();
  const [showLang, setShowLang] = useState(false);

  return (
    <div className="min-h-screen bg-white">
      {showLang && <LanguageModal onClose={() => setShowLang(false)} />}
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
        <button onClick={() => onNavigate("login")} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
          <Icons.ArrowLeft />
        </button>
        <h1 style={{ fontSize: 17, fontWeight: 700, color: "#111827" }}>{t("register_title")}</h1>
        <LangButton onClick={() => setShowLang(true)} />
      </div>

      <div className="px-6 pt-6 pb-28">
        <p style={{ fontSize: 14, color: "#6B7280", marginBottom: 24 }}>{t("register_subtitle")}</p>
        <div className="space-y-4">
          {[
            { label: t("full_name"), placeholder: "Jean Mukendi", type: "text" },
            { label: t("phone_number"), placeholder: "+243 XXX XXX XXX", type: "tel" },
            { label: t("password"), placeholder: "••••••••", type: "password" },
            { label: t("confirm_password"), placeholder: "••••••••", type: "password" },
          ].map(({ label, placeholder, type }) => (
            <div key={label}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>{label}</label>
              <input
                type={type}
                placeholder={placeholder}
                className="w-full px-4 py-3 rounded-xl border outline-none transition-all"
                style={{ borderColor: "#E5E7EB", fontSize: 14, background: "#F9FAFB" }}
                onFocus={(e) => (e.target.style.borderColor = "#3B82F6")}
                onBlur={(e) => (e.target.style.borderColor = "#E5E7EB")}
              />
            </div>
          ))}

          <div className="flex items-start gap-3 py-2">
            <input type="checkbox" id="terms" className="mt-1 w-4 h-4 accent-blue-500" />
            <label htmlFor="terms" style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.5 }}>
              {t("terms_agree")}{" "}
              <span style={{ color: "#3B82F6", fontWeight: 600 }}>{t("terms_link")}</span>
            </label>
          </div>

          <button
            onClick={() => onNavigate("home")}
            className="w-full py-4 rounded-2xl text-white transition-all active:scale-95 shadow-lg"
            style={{ background: "linear-gradient(135deg, #3B82F6, #06B6D4)", fontSize: 15, fontWeight: 700 }}
          >
            {t("register_btn")}
          </button>

          <div className="flex items-center justify-center gap-1">
            <span style={{ fontSize: 14, color: "#6B7280" }}>{t("already_account")}</span>
            <button onClick={() => onNavigate("login")} style={{ fontSize: 14, color: "#3B82F6", fontWeight: 600 }}>
              {t("login_link")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN: HOME / MAP
// ─────────────────────────────────────────────────────────────────────────────

function HomeScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const { t } = useLang();
  const [showLang, setShowLang] = useState(false);
  const [destination, setDestination] = useState("");

  const hour = new Date().getHours();
  const greeting = hour < 12 ? t("good_morning") : hour < 18 ? t("good_afternoon") : t("good_evening");

  const vehicles = [
    { id: "standard", icon: "🚗", name: t("standard"), desc: t("standard_desc"), seats: 4, price: "3 000 CDF" },
    { id: "comfort", icon: "🚙", name: t("comfort"), desc: t("comfort_desc"), seats: 4, price: "5 500 CDF" },
    { id: "business", icon: "🏎️", name: t("business"), desc: t("business_desc"), seats: 4, price: "9 000 CDF" },
    { id: "familia", icon: "🚐", name: t("familia"), desc: t("familia_desc"), seats: 7, price: "7 500 CDF" },
  ];

  const [selectedVehicle, setSelectedVehicle] = useState("standard");

  const recent = [
    { icon: <Icons.Home />, place: "Gombe", sub: "Kinshasa" },
    { icon: <Icons.Briefcase />, place: "La Gombe Tower", sub: "Boulevard du 30 juin" },
    { icon: <Icons.Clock />, place: "Aéroport de Ndjili", sub: "Kinshasa Est" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {showLang && <LanguageModal onClose={() => setShowLang(false)} />}

      {/* Map area (mock) */}
      <div className="relative h-56" style={{ background: "linear-gradient(180deg, #BFDBFE 0%, #93C5FD 50%, #60A5FA 100%)", overflow: "hidden" }}>
        {/* Grid lines */}
        <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 300 200">
          {[0, 50, 100, 150, 200].map((y) => <line key={y} x1="0" y1={y} x2="300" y2={y} stroke="white" strokeWidth="1" />)}
          {[0, 60, 120, 180, 240, 300].map((x) => <line key={x} x1={x} y1="0" x2={x} y2="200" stroke="white" strokeWidth="1" />)}
          <path d="M20 180 Q80 120 150 140 Q220 160 280 80" stroke="white" strokeWidth="3" fill="none" />
          <path d="M0 120 Q100 80 200 100 Q250 110 300 70" stroke="white" strokeWidth="2" fill="none" />
        </svg>
        {/* Pin */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
          <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center shadow-lg border-3 border-white" style={{ border: "3px solid white" }}>
            <span style={{ fontSize: 18 }}>📍</span>
          </div>
          <div className="w-3 h-3 rounded-full bg-blue-500 mx-auto mt-0.5 opacity-40" />
        </div>
        {/* Top bar */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
          <div>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.8)" }}>{greeting},</p>
            <p style={{ fontSize: 16, fontWeight: 700, color: "white" }}>Jean Mukendi 👋</p>
          </div>
          <LangButton onClick={() => setShowLang(true)} />
        </div>
      </div>

      {/* Search card */}
      <div className="relative -mt-5 mx-4 bg-white rounded-2xl shadow-xl p-4" style={{ zIndex: 10 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 8 }}>{t("where_to")}</p>
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: "#F3F4F6" }}>
          <div className="text-blue-500"><Icons.Search /></div>
          <input
            type="text"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder={t("enter_destination")}
            className="flex-1 bg-transparent outline-none"
            style={{ fontSize: 14, color: "#111827" }}
          />
        </div>

        {/* Recent places */}
        <div className="mt-3">
          <p style={{ fontSize: 12, fontWeight: 600, color: "#9CA3AF", marginBottom: 6 }}>{t("recent")}</p>
          <div className="space-y-1">
            {recent.map((r, i) => (
              <button key={i} className="w-full flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-left">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 flex-shrink-0">{r.icon}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{r.place}</div>
                  <div style={{ fontSize: 11, color: "#9CA3AF" }}>{r.sub}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Vehicles */}
      <div className="px-4 mt-4">
        <p style={{ fontSize: 15, fontWeight: 700, color: "#111827", marginBottom: 12 }}>{t("choose_vehicle")}</p>
        <div className="space-y-3">
          {vehicles.map((v) => (
            <button
              key={v.id}
              onClick={() => setSelectedVehicle(v.id)}
              className="w-full flex items-center gap-3 p-3 rounded-2xl transition-all"
              style={{
                background: selectedVehicle === v.id ? "#EFF6FF" : "white",
                border: selectedVehicle === v.id ? "2px solid #3B82F6" : "2px solid #F3F4F6",
                boxShadow: selectedVehicle === v.id ? "0 0 0 3px rgba(59,130,246,0.1)" : "none",
              }}
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: selectedVehicle === v.id ? "#DBEAFE" : "#F9FAFB" }}>
                <span style={{ fontSize: 24 }}>{v.icon}</span>
              </div>
              <div className="flex-1 text-left">
                <div style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{v.name}</div>
                <div style={{ fontSize: 12, color: "#6B7280" }}>{v.desc} • {v.seats} {t("seats")}</div>
              </div>
              <div className="text-right">
                <div style={{ fontSize: 13, fontWeight: 700, color: selectedVehicle === v.id ? "#3B82F6" : "#111827" }}>{v.price}</div>
                <div style={{ fontSize: 10, color: "#9CA3AF" }}>{t("from")}</div>
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={() => onNavigate("searching")}
          className="w-full mt-4 py-4 rounded-2xl text-white transition-all active:scale-95 shadow-lg mb-24"
          style={{ background: "linear-gradient(135deg, #3B82F6, #06B6D4)", fontSize: 15, fontWeight: 700 }}
        >
          {t("book_ride")}
        </button>
      </div>

      <BottomNav screen="home" onNavigate={onNavigate} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN: SEARCHING DRIVERS
// ─────────────────────────────────────────────────────────────────────────────

function SearchingScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const { t } = useLang();
  const [dots, setDots] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const iv1 = setInterval(() => setDots((d) => (d + 1) % 4), 500);
    const iv2 = setInterval(() => setProgress((p) => Math.min(p + 2, 90)), 200);
    const timeout = setTimeout(() => onNavigate("driver_found"), 5000);
    return () => { clearInterval(iv1); clearInterval(iv2); clearTimeout(timeout); };
  }, [onNavigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: "linear-gradient(135deg, #0F172A 0%, #1E3A5F 100%)" }}>
      {/* Animated rings */}
      <div className="relative w-48 h-48 flex items-center justify-center mb-8">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="absolute rounded-full border-2 border-blue-400/30"
            style={{
              width: 64 + i * 40,
              height: 64 + i * 40,
              animation: `pulse ${1.2 + i * 0.4}s ease-in-out infinite`,
              animationDelay: `${i * 0.3}s`,
            }}
          />
        ))}
        <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #3B82F6, #06B6D4)" }}>
          <span style={{ fontSize: 36 }}>🚖</span>
        </div>
      </div>

      <h2 style={{ fontSize: 22, fontWeight: 700, color: "white", textAlign: "center", marginBottom: 8 }}>
        {t("searching_driver")}{".".repeat(dots)}
      </h2>
      <p style={{ fontSize: 14, color: "#94A3B8", textAlign: "center", marginBottom: 32 }}>
        {t("searching_desc")}
      </p>

      {/* Progress bar */}
      <div className="w-full max-w-xs mb-6">
        <div className="h-2 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }}>
          <div
            className="h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%`, background: "linear-gradient(90deg, #3B82F6, #06B6D4)" }}
          />
        </div>
      </div>

      <div className="flex items-center gap-2 mb-8 px-4 py-2 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }}>
        <span style={{ fontSize: 14, color: "#94A3B8" }}>{t("estimated_wait")}:</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: "white" }}>2-4 {t("min")}</span>
      </div>

      <button
        onClick={() => onNavigate("home")}
        className="px-8 py-3 rounded-2xl transition-all"
        style={{ border: "2px solid rgba(255,255,255,0.2)", color: "#94A3B8", fontSize: 14, fontWeight: 600 }}
      >
        {t("cancel_search")}
      </button>

      <style>{`@keyframes pulse { 0%, 100% { opacity: 0.3; transform: scale(0.95); } 50% { opacity: 0.7; transform: scale(1.05); } }`}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN: DRIVER FOUND
// ─────────────────────────────────────────────────────────────────────────────

function DriverFoundScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const { t } = useLang();
  const [showLang, setShowLang] = useState(false);
  const [rating, setRating] = useState(0);
  const [showRating, setShowRating] = useState(false);

  if (showRating) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        {showLang && <LanguageModal onClose={() => setShowLang(false)} />}
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-10">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-4">
            <span style={{ fontSize: 40 }}>⭐</span>
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "#111827", marginBottom: 8 }}>{t("rate_your_ride")}</h2>
          <p style={{ fontSize: 14, color: "#6B7280", marginBottom: 24 }}>{t("how_was_driver")}</p>

          <div className="flex gap-2 mb-6">
            {[1, 2, 3, 4, 5].map((s) => (
              <button key={s} onClick={() => setRating(s)}>
                <Icons.Star filled={s <= rating} />
              </button>
            ))}
          </div>

          <textarea
            placeholder={t("add_comment")}
            className="w-full px-4 py-3 rounded-xl border outline-none mb-6"
            style={{ borderColor: "#E5E7EB", fontSize: 14, minHeight: 80, resize: "none" }}
          />

          <button
            onClick={() => onNavigate("home")}
            className="w-full py-4 rounded-2xl text-white"
            style={{ background: "linear-gradient(135deg, #3B82F6, #06B6D4)", fontSize: 15, fontWeight: 700 }}
          >
            {t("submit_rating")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {showLang && <LanguageModal onClose={() => setShowLang(false)} />}

      {/* Map mock */}
      <div className="relative h-72" style={{ background: "linear-gradient(180deg, #BFDBFE, #93C5FD)" }}>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative">
            {/* Route line */}
            <svg width="200" height="120" viewBox="0 0 200 120">
              <path d="M20 100 Q100 20 180 100" stroke="#3B82F6" strokeWidth="3" fill="none" strokeDasharray="6 3" />
              <circle cx="20" cy="100" r="8" fill="#3B82F6" />
              <circle cx="180" cy="100" r="8" fill="#EF4444" />
              <circle cx="85" cy="45" r="12" fill="white" stroke="#3B82F6" strokeWidth="2" />
              <text x="85" y="50" textAnchor="middle" fontSize="12">🚖</text>
            </svg>
          </div>
        </div>
        <div className="absolute top-4 right-4">
          <LangButton onClick={() => setShowLang(true)} />
        </div>
      </div>

      {/* Driver card */}
      <div className="relative -mt-6 mx-4 bg-white rounded-3xl shadow-xl p-5" style={{ zIndex: 10 }}>
        <div className="flex items-center justify-between mb-1">
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#059669" }}>✅ {t("driver_found")}</h2>
          <div className="px-3 py-1 rounded-full" style={{ background: "#ECFDF5", color: "#059669", fontSize: 12, fontWeight: 600 }}>
            {t("arrive_in")} 3 {t("min")}
          </div>
        </div>
        <p style={{ fontSize: 13, color: "#6B7280", marginBottom: 16 }}>{t("driver_on_way")}</p>

        <div className="flex items-center gap-4 p-3 rounded-2xl" style={{ background: "#F9FAFB" }}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #3B82F6, #06B6D4)" }}>
            <span style={{ fontSize: 28 }}>👨</span>
          </div>
          <div className="flex-1">
            <div style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>Jean-Pierre Kabila</div>
            <div className="flex items-center gap-1">
              <span style={{ color: "#F59E0B", fontSize: 14 }}>★</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>4.9</span>
              <span style={{ fontSize: 12, color: "#9CA3AF" }}>• 1,234 {t("total_rides")}</span>
            </div>
            <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>🚗 Toyota Corolla • Noir • KIN-1234</div>
          </div>
        </div>

        {/* Trip info */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          {[
            { label: t("distance"), value: "5.2 km" },
            { label: t("duration"), value: "18 min" },
            { label: t("price"), value: "4 500 CDF" },
          ].map(({ label, value }) => (
            <div key={label} className="text-center p-3 rounded-xl" style={{ background: "#F3F4F6" }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>{value}</div>
              <div style={{ fontSize: 11, color: "#9CA3AF" }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Payment */}
        <div className="flex items-center justify-between mt-4 p-3 rounded-xl" style={{ background: "#F9FAFB", border: "1px solid #E5E7EB" }}>
          <span style={{ fontSize: 13, color: "#6B7280" }}>{t("payment_method")}</span>
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 16 }}>💵</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{t("cash")}</span>
          </div>
        </div>

        <button
          onClick={() => setShowRating(true)}
          className="w-full mt-4 py-4 rounded-2xl text-white"
          style={{ background: "linear-gradient(135deg, #3B82F6, #06B6D4)", fontSize: 15, fontWeight: 700 }}
        >
          {t("ride_in_progress")} →
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN: SETTINGS
// ─────────────────────────────────────────────────────────────────────────────

function SettingsScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const { t, lang, setLang } = useLang();
  const [showLangModal, setShowLangModal] = useState(false);
  const [notif, setNotif] = useState(true);
  const [isDark, setIsDark] = useState(false);

  const sections = [
    {
      title: t("settings"),
      items: [
        {
          icon: Icons.Globe,
          color: "#3B82F6",
          title: t("language_settings"),
          desc: lang === "fr" ? "🇫🇷 Français" : "🇬🇧 English",
          action: () => setShowLangModal(true),
          badge: lang.toUpperCase(),
        },
        {
          icon: Icons.Bell,
          color: "#F59E0B",
          title: t("notifications"),
          desc: t("notifications_desc"),
          toggle: notif,
          onToggle: () => setNotif(!notif),
        },
        {
          icon: () => <span style={{ fontSize: 20 }}>{isDark ? "🌙" : "☀️"}</span>,
          color: "#8B5CF6",
          title: t("dark_mode"),
          desc: isDark ? t("dark_mode_on") : t("dark_mode_off"),
          toggle: isDark,
          onToggle: () => setIsDark(!isDark),
        },
        {
          icon: Icons.Shield,
          color: "#10B981",
          title: t("privacy"),
          desc: t("privacy_desc"),
          action: () => {},
        },
        {
          icon: Icons.CreditCard,
          color: "#EF4444",
          title: t("payment_settings"),
          desc: t("payment_desc"),
          action: () => {},
        },
      ],
    },
    {
      title: "Menu",
      items: [
        {
          icon: Icons.User,
          color: "#06B6D4",
          title: t("my_profile"),
          desc: t("my_profile_desc"),
          action: () => onNavigate("profile"),
        },
        {
          icon: Icons.HelpCircle,
          color: "#F59E0B",
          title: t("help_support"),
          desc: t("help_desc"),
          action: () => {},
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {showLangModal && <LanguageModal onClose={() => setShowLangModal(false)} />}

      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <h1 style={{ fontSize: 18, fontWeight: 700, color: "#111827" }}>{t("settings")}</h1>
          <LangButton onClick={() => setShowLangModal(true)} />
        </div>
      </div>

      <div className="px-4 pt-4 pb-28">
        {/* User card */}
        <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #3B82F6, #06B6D4)" }}>
            <span style={{ fontSize: 28 }}>👨</span>
          </div>
          <div className="flex-1">
            <div style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>Jean Mukendi</div>
            <div style={{ fontSize: 13, color: "#6B7280" }}>jean.mukendi@email.com</div>
            <div style={{ fontSize: 12, color: "#9CA3AF" }}>+243 XXX XXX XXX</div>
          </div>
          <Icons.ChevronRight />
        </div>

        {/* Language highlight card */}
        <button
          onClick={() => setShowLangModal(true)}
          className="w-full bg-white rounded-2xl p-4 mb-4 shadow-sm flex items-center gap-4 transition-all hover:shadow-md active:scale-95"
          style={{ border: "2px solid #3B82F6" }}
        >
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "#EFF6FF" }}>
            <span style={{ fontSize: 28 }}>{lang === "fr" ? "🇫🇷" : "🇬🇧"}</span>
          </div>
          <div className="flex-1 text-left">
            <div style={{ fontSize: 15, fontWeight: 700, color: "#3B82F6" }}>{t("switch_language")}</div>
            <div style={{ fontSize: 13, color: "#6B7280" }}>
              {lang === "fr" ? "Actuellement : Français" : "Currently: English"}
            </div>
          </div>
          <div className="px-3 py-1 rounded-full" style={{ background: "#3B82F6", color: "white", fontSize: 12, fontWeight: 700 }}>
            {lang.toUpperCase()}
          </div>
        </button>

        {sections.map((section) => (
          <div key={section.title} className="mb-4">
            <p style={{ fontSize: 12, fontWeight: 700, color: "#9CA3AF", marginBottom: 8, paddingLeft: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>
              {section.title}
            </p>
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              {section.items.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div key={item.title}>
                    {idx > 0 && <div style={{ height: 1, background: "#F3F4F6", marginLeft: 60 }} />}
                    <button
                      onClick={item.action ?? (() => {})}
                      className="w-full flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-gray-50 text-left"
                    >
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: item.color + "20" }}>
                        <div style={{ color: item.color }}><Icon /></div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>{item.title}</div>
                        <div style={{ fontSize: 12, color: "#6B7280" }}>{item.desc}</div>
                      </div>
                      {"toggle" in item ? (
                        <div
                          onClick={(e) => { e.stopPropagation(); item.onToggle?.(); }}
                          className="w-12 h-6 rounded-full relative flex-shrink-0 transition-all cursor-pointer"
                          style={{ background: item.toggle ? "#3B82F6" : "#D1D5DB" }}
                        >
                          <div
                            className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
                            style={{ left: item.toggle ? "calc(100% - 22px)" : "2px" }}
                          />
                        </div>
                      ) : item.badge ? (
                        <div className="px-2 py-0.5 rounded-full" style={{ background: "#EFF6FF", color: "#3B82F6", fontSize: 11, fontWeight: 700 }}>
                          {item.badge}
                        </div>
                      ) : (
                        <div style={{ color: "#9CA3AF" }}><Icons.ChevronRight /></div>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Logout */}
        <button
          onClick={() => onNavigate("login")}
          className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl transition-colors"
          style={{ background: "#FEF2F2", color: "#EF4444", border: "1px solid #FECACA", fontSize: 14, fontWeight: 600 }}
        >
          <Icons.LogOut />
          {t("logout")}
        </button>

        <div className="text-center mt-6">
          <p style={{ fontSize: 12, color: "#9CA3AF" }}>{t("app_version")}</p>
          <p style={{ fontSize: 11, color: "#D1D5DB" }}>{t("rights")}</p>
        </div>
      </div>

      <BottomNav screen="settings" onNavigate={onNavigate} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN: HISTORY
// ─────────────────────────────────────────────────────────────────────────────

function HistoryScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const { t } = useLang();
  const [showLang, setShowLang] = useState(false);

  const rides = [
    { from: "Gombe", to: "Limete", date: "02 Mai 2026", price: "4 500 CDF", rating: 5 },
    { from: "Matonge", to: "Kintambo", date: "01 Mai 2026", price: "3 200 CDF", rating: 4 },
    { from: "Ndjili", to: "Gombe", date: "30 Avr 2026", price: "6 800 CDF", rating: 5 },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {showLang && <LanguageModal onClose={() => setShowLang(false)} />}
      <div className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <h1 style={{ fontSize: 18, fontWeight: 700, color: "#111827" }}>{t("ride_history")}</h1>
          <LangButton onClick={() => setShowLang(true)} />
        </div>
      </div>
      <div className="px-4 pt-4 pb-28 space-y-3">
        {rides.map((r, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{r.from}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{r.to}</span>
                </div>
              </div>
              <div className="text-right">
                <div style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>{r.price}</div>
                <div className="flex">
                  {[...Array(r.rating)].map((_, j) => (
                    <span key={j} style={{ fontSize: 12, color: "#F59E0B" }}>★</span>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ fontSize: 11, color: "#9CA3AF", borderTop: "1px solid #F3F4F6", paddingTop: 8 }}>
              🗓 {r.date}
            </div>
          </div>
        ))}
      </div>
      <BottomNav screen="history" onNavigate={onNavigate} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN: WALLET
// ─────────────────────────────────────────────────────────────────────────────

function WalletScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const { t } = useLang();
  const [showLang, setShowLang] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      {showLang && <LanguageModal onClose={() => setShowLang(false)} />}
      <div className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <h1 style={{ fontSize: 18, fontWeight: 700, color: "#111827" }}>{t("wallet")}</h1>
          <LangButton onClick={() => setShowLang(true)} />
        </div>
      </div>
      <div className="px-4 pt-4 pb-28">
        <div className="rounded-3xl p-6 mb-6 text-white shadow-xl" style={{ background: "linear-gradient(135deg, #3B82F6, #06B6D4)" }}>
          <p style={{ fontSize: 13, opacity: 0.8, marginBottom: 4 }}>{t("wallet_balance")}</p>
          <p style={{ fontSize: 36, fontWeight: 800 }}>25 000 <span style={{ fontSize: 18 }}>CDF</span></p>
          <div className="flex gap-3 mt-4">
            <button className="flex-1 py-3 rounded-xl text-white" style={{ background: "rgba(255,255,255,0.2)", fontSize: 13, fontWeight: 600 }}>
              {t("recharge")}
            </button>
          </div>
        </div>

        <p style={{ fontSize: 14, fontWeight: 700, color: "#374151", marginBottom: 12 }}>{t("payment_method")}</p>
        <div className="space-y-3">
          {[
            { icon: "💵", name: t("cash"), desc: "Paiement en main propre" },
            { icon: "📱", name: t("mobile_money"), desc: "M-Pesa, Airtel Money, Orange Money" },
            { icon: "💳", name: t("card"), desc: "Visa, Mastercard" },
          ].map((m) => (
            <div key={m.name} className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "#F3F4F6", fontSize: 24 }}>{m.icon}</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>{m.name}</div>
                <div style={{ fontSize: 12, color: "#6B7280" }}>{m.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <BottomNav screen="wallet" onNavigate={onNavigate} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT APP
// ─────────────────────────────────────────────────────────────────────────────

function PassengerApp() {
  const [screen, setScreen] = useState<Screen>("login");

  const navigate = (s: Screen) => setScreen(s);

  const renderScreen = () => {
    switch (screen) {
      case "login": return <LoginScreen onNavigate={navigate} />;
      case "register": return <RegisterScreen onNavigate={navigate} />;
      case "home": return <HomeScreen onNavigate={navigate} />;
      case "searching": return <SearchingScreen onNavigate={navigate} />;
      case "driver_found": return <DriverFoundScreen onNavigate={navigate} />;
      case "settings": return <SettingsScreen onNavigate={navigate} />;
      case "history": return <HistoryScreen onNavigate={navigate} />;
      case "wallet": return <WalletScreen onNavigate={navigate} />;
      default: return <HomeScreen onNavigate={navigate} />;
    }
  };

  return (
    <div className="max-w-sm mx-auto min-h-screen relative overflow-hidden bg-white shadow-2xl">
      {renderScreen()}
    </div>
  );
}

export default function App() {
  return (
    <LangProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-800 to-slate-900 flex flex-col items-center justify-start py-4">
        {/* Top banner */}
        <div className="mb-4 px-4 py-2 rounded-full text-white text-sm font-semibold" style={{ background: "rgba(255,255,255,0.1)" }}>
          🌐 SmartCabb — Interface Passager Bilingue (FR / EN)
        </div>
        <PassengerApp />
      </div>
    </LangProvider>
  );
}
