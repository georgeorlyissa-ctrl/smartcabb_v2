export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  address?: string;
  registeredAt?: Date;
  totalRides?: number;
  favoritePaymentMethod?: 'flutterwave' | 'cash' | 'mixed';
  preferredLanguage?: 'fr' | 'en';
  preferredCurrency?: 'USD' | 'CDF';
  walletBalance?: number; // 💰 Solde du portefeuille en CDF
  walletTransactions?: WalletTransaction[]; // 📜 Historique des transactions
}

// 💰 Transaction de portefeuille
export interface WalletTransaction {
  id: string;
  type: 'recharge' | 'debit' | 'refund'; // Recharge, Débit (paiement course), Remboursement
  amount: number; // Montant en CDF
  method?: 'mobile_money' | 'cash'; // Méthode de recharge
  status?: 'pending' | 'approved' | 'rejected'; // 🆕 Statut de la transaction (pour paiement espèces)
  rideId?: string; // ID de la course si c'est un débit/remboursement
  description: string;
  timestamp: Date;
  balanceAfter: number; // Solde après transaction
  approvedAt?: Date; // 🆕 Date d'approbation par admin
  approvedBy?: string; // 🆕 ID de l'admin qui a approuvé
  rejectionReason?: string; // 🆕 Raison du rejet
  userId?: string; // 🆕 ID de l'utilisateur (pour identification côté admin)
  userName?: string; // 🆕 Nom de l'utilisateur (pour affichage côté admin)
  userPhone?: string; // 🆕 Téléphone de l'utilisateur
}

export interface DriverDocument {
  type: 'license' | 'volet_jaune_carte_rose' | 'insurance' | 'registration';
  name: string;
  url: string;
  uploadedAt: Date;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
}

export interface Driver extends User {
  isOnline: boolean;
  currentLocation: Location;
  rating: number;
  totalRides: number;
  earnings: number;
  vehicleInfo: {
    make: string;
    model: string;
    plate: string;
    color: string;
    type: 'smart_standard' | 'smart_confort' | 'smart_plus' | 'smart_business'; // ✅ 4 catégories officielles 2025
  };
  documentsVerified: boolean;
  documents?: DriverDocument[];
  applicationStatus?: 'pending' | 'approved' | 'rejected';
  photo?: string;
}

export interface Location {
  lat: number;
  lng: number;
  address: string;
}

export interface Ride {
  id: string;
  passengerId: string;
  driverId?: string;
  pickup: Location;
  destination: Location;
  pickupInstructions?: string; // 🆕 Instructions pour trouver le passager
  status: 'pending' | 'accepted' | 'waiting' | 'in_progress' | 'completed' | 'cancelled';
  estimatedPrice: number;
  estimatedDuration: number;
  actualPrice?: number;
  rating?: number;
  comment?: string;
  paymentMethod?: 'flutterwave' | 'cash' | 'mixed' | 'postpaid';
  paymentDetails?: {
    currency: 'USD' | 'CDF';
    cashAmount?: number;
    mobileMoneyAmount?: number;
    exchangeRate?: number;
    interestRate?: number;
  };
  createdAt: Date;
  completedAt?: Date;
  confirmationCode?: string;
  waitingStartTime?: Date;
  billingStartTime?: Date;
  hourlyRate?: number;
  vehicleType?: 'smart_standard' | 'smart_confort' | 'smart_plus' | 'smart_business'; // ✅ 4 catégories officielles 2025
  passengerCount?: number;
  tip?: number;
  distanceKm?: number;
  promoCode?: string;
  promoDiscount?: number;
  timerDisabled?: boolean;
  freeWaitingDisabled?: boolean;
  waitingTime?: number; // in seconds
  duration?: number; // in minutes
  paymentStatus?: 'pending' | 'completed' | 'failed';
  cancellationCompensation?: number; // CDF amount for driver compensation
  compensationApproved?: boolean;
  compensationApprovedAt?: string;
  commission?: number; // Platform commission amount
  netDriverAmount?: number; // Amount driver receives after commission
}

export interface PromoCode {
  id: string;
  code: string;
  discount: number;
  type: 'percentage' | 'fixed';
  isActive: boolean;
  validFrom: Date;
  validTo: Date;
  usageLimit?: number;
  usedCount: number;
  minRideAmount?: number;
  description: string;
}

export interface MarketingCampaign {
  id: string;
  title: string;
  message: string;
  target: 'passengers' | 'drivers' | 'both';
  isActive: boolean;
  createdAt: Date;
  startsAt: Date;
  endsAt: Date;
  imageUrl?: string;
  actionUrl?: string;
}

export interface AppState {
  currentUser: User | null;
  currentDriver: Driver | null;
  currentRide: Ride | null;
  isAdmin: boolean;
  currentView: 'passenger' | 'driver' | 'admin' | null; // ✅ Peut être null au démarrage
  currentScreen: string;
  policyAccepted: boolean;
  language: 'fr' | 'en';
  pickup?: Location | null; // Position de départ saisie par l'utilisateur
  destination?: Location | null; // Destination saisie par l'utilisateur
  pickupInstructions?: string; // 🆕 Instructions de prise en charge
  systemSettings?: {
    exchangeRate: number; // USD to CDF
    postpaidInterestRate: number; // percentage
  };
  adminSettings?: {
    exchangeRate: number;
    postpaidInterestRate: number;
    smartStandardRate: number; // CDF per hour
    smartConfortRate: number; // CDF per hour  
    smartPlusRate: number; // CDF per hour
    freeWaitingTime: number; // seconds (default 600 = 10 minutes)
    commissionEnabled: boolean;
    commissionRate: number; // percentage
    minimumCommission: number; // CDF
    autoDeduction: boolean;
    paymentFrequency: 'immediate' | 'daily' | 'weekly';
  };
}

export interface EmergencyAlert {
  id: string;
  userId: string;
  userType: 'passenger' | 'driver';
  type: 'medical' | 'security' | 'accident' | 'harassment';
  location: Location;
  timestamp: string;
  rideId?: string;
  status: 'active' | 'resolved' | 'false_alarm';
  responseTime?: number; // seconds
  resolvedAt?: string;
}

export interface PaymentOption {
  id: 'flutterwave' | 'cash' | 'mixed' | 'postpaid';
  title: string;
  subtitle: string;
  description: string;
  icon: any;
  color: string;
  borderColor: string;
  bgColor: string;
  features: string[];
  available?: boolean;
}