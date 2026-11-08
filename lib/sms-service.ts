/**
 * Service de notifications SMS pour SmartCabb
 * Envoi via EJ SMS (EJSARL) — OAuth 2.0, opérateurs RDC
 */

import { projectId, publicAnonKey } from '../utils/supabase/info';

/**
 * 🔥 SYSTÈME DE DÉDUPLICATION DES SMS
 * Empêche l'envoi en double de SMS identiques
 */
const sentSMSCache = new Map<string, number>();
const SMS_DEDUP_WINDOW = 60000; // 60 secondes

/**
 * Générer une clé unique pour un SMS
 */
function generateSMSKey(to: string, message: string, type: string): string {
  return `${to}:${type}:${message.substring(0, 50)}`;
}

/**
 * Vérifier si un SMS a déjà été envoyé récemment
 */
function isDuplicateSMS(to: string, message: string, type: string): boolean {
  const key = generateSMSKey(to, message, type);
  const lastSent = sentSMSCache.get(key);
  
  if (lastSent && Date.now() - lastSent < SMS_DEDUP_WINDOW) {
    console.warn('⚠️ SMS dupliqué détecté et bloqué:', { to, type, lastSent: new Date(lastSent) });
    return true;
  }
  
  // Enregistrer l'envoi
  sentSMSCache.set(key, Date.now());
  
  // Nettoyer le cache périodiquement (garder seulement les 100 derniers)
  if (sentSMSCache.size > 100) {
    const oldestKey = sentSMSCache.keys().next().value;
    sentSMSCache.delete(oldestKey);
  }
  
  return false;
}

export type SMSProvider = 'ejsms';

export interface SMSConfig {
  provider: SMSProvider;
  enabled: boolean;
}

export interface SMSNotification {
  to: string; // Numéro de téléphone au format international (+243...)
  message: string;
  type: 'ride_confirmed' | 'driver_enroute' | 'driver_arrived' | 'confirmation_code' | 
        'ride_started' | 'ride_completed' | 'payment_received' | 'rating_request' | 
        'account_validated' | 'account_rejected' | 'account_suspended' | 'account_reactivated' |
        'availability_changed' | 'profile_updated' | 'vehicle_updated' | 'warning_sent' |
        'documents_verified' | 'documents_rejected' | 'otp_code' | 'emergency_alert' | 
        'emergency_alert_driver' | 'ride_cancelled';
}

/**
 * Templates de messages SMS en français pour la RDC
 * IMPORTANT : Pas d'accents pour éviter les problèmes d'encodage SMS
 */
export const SMS_TEMPLATES = {
  // Passager + Conducteur
  ride_confirmed_passenger: (driverName: string, vehicleInfo: string, eta: string) => 
    `SmartCabb : Votre course est confirmee ! Conducteur : ${driverName}, Vehicule : ${vehicleInfo}. Arrivee estimee : ${eta} min.`,
  
  ride_confirmed_driver: (passengerName: string, pickup: string, destination: string, category: string) => 
    `SmartCabb : Nouvelle course ! Passager : ${passengerName}, De : ${pickup}, Vers : ${destination}, Categorie : ${category}.`,
  
  // Passager uniquement
  driver_enroute: (driverName: string, eta: string) => 
    `SmartCabb : ${driverName} est en route vers vous. Arrivee estimee : ${eta} min.`,
  
  driver_arrived: (driverName: string, vehicleInfo: string) => 
    `SmartCabb : Votre conducteur ${driverName} est arrive ! Vehicule : ${vehicleInfo}.`,
  
  confirmation_code: (code: string, driverName: string) => 
    `SmartCabb : Presentez ce code au conducteur pour demarrer la course : ${code}. Le chronometre demarre apres 10 minutes d'attente.`,
  
  // Passager + Conducteur
  ride_started_passenger: (driverName: string, destination: string) => 
    `SmartCabb : Votre course vers ${destination} a demarre avec ${driverName}. Bon voyage !`,
  
  ride_started_driver: (passengerName: string, destination: string) => 
    `SmartCabb : Course demarree avec ${passengerName} vers ${destination}. Bonne route !`,
  
  ride_completed_passenger: (amount: string, duration: string) => 
    `SmartCabb : Course terminee ! Montant : ${amount} CDF, Duree : ${duration}. Merci d'avoir voyage avec nous !`,
  
  ride_completed_driver: (amount: string, duration: string) => 
    `SmartCabb : Course terminee ! Vous avez gagne ${amount} CDF. Duree : ${duration}.`,
  
  // Conducteur uniquement
  payment_received: (amount: string, method: string) => 
    `SmartCabb : Paiement recu : ${amount} CDF via ${method}. Montant ajoute a votre portefeuille.`,
  
  // Passager + Conducteur
  rating_request_passenger: (driverName: string) => 
    `SmartCabb : Comment s'est passee votre course avec ${driverName} ? Notez votre experience dans l'application.`,
  
  rating_request_driver: (passengerName: string) => 
    `SmartCabb : Comment s'est passee votre course avec ${passengerName} ? Notez votre experience dans l'application.`,
  
  // Conducteur uniquement
  account_validated: (name: string) => 
    `SmartCabb : Felicitations ${name} ! Votre compte conducteur a ete valide. Vous pouvez desormais accepter des courses.`,
  
  account_rejected: (name: string) => 
    `SmartCabb : Bonjour ${name}, votre demande d'inscription en tant que conducteur n'a pas ete approuvee. Veuillez nous contacter pour plus d'informations.`,
  
  // Actions administratives
  account_suspended: (name: string, reason?: string) => 
    `SmartCabb : ${name}, votre compte conducteur a ete suspendu${reason ? ' pour la raison suivante : ' + reason : '.'}. Veuillez contacter l'administration pour plus d'informations.`,
  
  account_reactivated: (name: string) => 
    `SmartCabb : Bonne nouvelle ${name} ! Votre compte conducteur a ete reactive. Vous pouvez a nouveau accepter des courses.`,
  
  availability_changed_online: (name: string) => 
    `SmartCabb : ${name}, votre statut a ete mis en ligne par l'administration. Vous recevrez desormais des demandes de course.`,
  
  availability_changed_offline: (name: string) => 
    `SmartCabb : ${name}, votre statut a ete mis hors ligne par l'administration. Vous ne recevrez plus de demandes de course temporairement.`,
  
  profile_updated: (name: string) => 
    `SmartCabb : ${name}, votre profil conducteur a ete mis a jour par l'administration. Veuillez verifier les modifications dans l'application.`,
  
  vehicle_updated: (name: string, vehicleInfo: string) => 
    `SmartCabb : ${name}, les informations de votre vehicule ont ete mises a jour : ${vehicleInfo}. Veuillez verifier dans l'application.`,
  
  warning_sent: (name: string, warning: string) => 
    `SmartCabb : AVERTISSEMENT - ${name}, ${warning}. Veuillez respecter les regles de la plateforme.`,
  
  documents_verified: (name: string) => 
    `SmartCabb : ${name}, vos documents ont ete verifies et approuves par l'administration. Felicitations !`,
  
  documents_rejected: (name: string, reason: string) => 
    `SmartCabb : ${name}, certains de vos documents n'ont pas ete approuves. Raison : ${reason}. Veuillez les mettre a jour.`,
  
  // Codes OTP pour sécurité
  otp_code: (code: string, purpose: string) => 
    `SmartCabb : Votre code de verification est ${code}. ${purpose}. Ne partagez jamais ce code avec qui que ce soit.`,
  
  // Alertes d'urgence
  // Annulation de course
  ride_cancelled_passenger: (driverName: string, reason?: string) => 
    `SmartCabb : Votre course avec ${driverName} a ete annulee${reason ? ' pour la raison suivante : ' + reason : '.'}. Vous pouvez reserver une nouvelle course.`,
  
  ride_cancelled_driver: (passengerName: string, reason?: string) => 
    `SmartCabb : La course avec ${passengerName} a ete annulee${reason ? ' pour la raison suivante : ' + reason : '.'}.`,
};

/**
 * Envoie une notification SMS via le serveur
 * 🔥 Avec déduplication automatique pour éviter les envois multiples
 */
export async function sendSMS(notification: SMSNotification): Promise<boolean> {
  try {
    // 🛡️ VÉRIFICATION ANTI-DOUBLON
    if (isDuplicateSMS(notification.to, notification.message, notification.type)) {
      console.warn('🚫 SMS dupliqué bloqué:', {
        to: notification.to,
        type: notification.type,
        message: notification.message.substring(0, 50) + '...'
      });
      return true; // Retourner true pour ne pas bloquer le flux
    }

    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/sms/send`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify(notification),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Erreur réseau' }));
      console.error('❌ Erreur envoi SMS:', error);
      return false;
    }

    const result = await response.json();
    console.log('✅ SMS envoyé avec succès:', result);
    return true;
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi SMS:', error);
    return false;
  }
}

/**
 * Fonctions spécialisées pour chaque type de notification
 */

export async function notifyRideConfirmed(
  passengerPhone: string,
  driverPhone: string,
  driverName: string,
  passengerName: string,
  vehicleInfo: string,
  pickup: string,
  destination: string,
  category: string,
  eta: string
): Promise<void> {
  // Notification au passager
  await sendSMS({
    to: passengerPhone,
    message: SMS_TEMPLATES.ride_confirmed_passenger(driverName, vehicleInfo, eta),
    type: 'ride_confirmed',
  });

  // Notification au conducteur
  await sendSMS({
    to: driverPhone,
    message: SMS_TEMPLATES.ride_confirmed_driver(passengerName, pickup, destination, category),
    type: 'ride_confirmed',
  });
}

export async function notifyDriverEnroute(
  passengerPhone: string,
  driverName: string,
  eta: string
): Promise<void> {
  await sendSMS({
    to: passengerPhone,
    message: SMS_TEMPLATES.driver_enroute(driverName, eta),
    type: 'driver_enroute',
  });
}

export async function notifyDriverArrived(
  passengerPhone: string,
  driverName: string,
  vehicleInfo: string
): Promise<void> {
  await sendSMS({
    to: passengerPhone,
    message: SMS_TEMPLATES.driver_arrived(driverName, vehicleInfo),
    type: 'driver_arrived',
  });
}

export async function notifyConfirmationCode(
  passengerPhone: string,
  code: string,
  driverName: string
): Promise<void> {
  await sendSMS({
    to: passengerPhone,
    message: SMS_TEMPLATES.confirmation_code(code, driverName),
    type: 'confirmation_code',
  });
}

export async function notifyRideStarted(
  passengerPhone: string,
  driverPhone: string,
  passengerName: string,
  driverName: string,
  destination: string
): Promise<void> {
  // Notification au passager
  await sendSMS({
    to: passengerPhone,
    message: SMS_TEMPLATES.ride_started_passenger(driverName, destination),
    type: 'ride_started',
  });

  // Notification au conducteur
  await sendSMS({
    to: driverPhone,
    message: SMS_TEMPLATES.ride_started_driver(passengerName, destination),
    type: 'ride_started',
  });
}

export async function notifyRideCompleted(
  passengerPhone: string,
  driverPhone: string,
  amount: number,
  duration: string
): Promise<void> {
  const formattedAmount = amount.toLocaleString('fr-CD');

  // Notification au passager
  await sendSMS({
    to: passengerPhone,
    message: SMS_TEMPLATES.ride_completed_passenger(formattedAmount, duration),
    type: 'ride_completed',
  });

  // Notification au conducteur
  await sendSMS({
    to: driverPhone,
    message: SMS_TEMPLATES.ride_completed_driver(formattedAmount, duration),
    type: 'ride_completed',
  });
}

export async function notifyPaymentReceived(
  driverPhone: string,
  amount: number,
  method: string
): Promise<void> {
  const formattedAmount = amount.toLocaleString('fr-CD');
  
  await sendSMS({
    to: driverPhone,
    message: SMS_TEMPLATES.payment_received(formattedAmount, method),
    type: 'payment_received',
  });
}

export async function notifyRatingRequest(
  passengerPhone: string,
  driverPhone: string,
  passengerName: string,
  driverName: string
): Promise<void> {
  // Notification au passager
  await sendSMS({
    to: passengerPhone,
    message: SMS_TEMPLATES.rating_request_passenger(driverName),
    type: 'rating_request',
  });

  // Notification au conducteur
  await sendSMS({
    to: driverPhone,
    message: SMS_TEMPLATES.rating_request_driver(passengerName),
    type: 'rating_request',
  });
}

export async function notifyAccountValidated(
  driverPhone: string,
  driverName: string
): Promise<void> {
  await sendSMS({
    to: driverPhone,
    message: SMS_TEMPLATES.account_validated(driverName),
    type: 'account_validated',
  });
}

export async function notifyAccountRejected(
  driverPhone: string,
  driverName: string
): Promise<void> {
  await sendSMS({
    to: driverPhone,
    message: SMS_TEMPLATES.account_rejected(driverName),
    type: 'account_rejected',
  });
}

export async function notifyAccountSuspended(
  driverPhone: string,
  driverName: string,
  reason?: string
): Promise<void> {
  await sendSMS({
    to: driverPhone,
    message: SMS_TEMPLATES.account_suspended(driverName, reason),
    type: 'account_suspended',
  });
}

export async function notifyAccountReactivated(
  driverPhone: string,
  driverName: string
): Promise<void> {
  await sendSMS({
    to: driverPhone,
    message: SMS_TEMPLATES.account_reactivated(driverName),
    type: 'account_reactivated',
  });
}

export async function notifyAvailabilityChanged(
  driverPhone: string,
  driverName: string,
  isOnline: boolean
): Promise<void> {
  await sendSMS({
    to: driverPhone,
    message: isOnline 
      ? SMS_TEMPLATES.availability_changed_online(driverName)
      : SMS_TEMPLATES.availability_changed_offline(driverName),
    type: 'availability_changed',
  });
}

export async function notifyProfileUpdated(
  driverPhone: string,
  driverName: string
): Promise<void> {
  await sendSMS({
    to: driverPhone,
    message: SMS_TEMPLATES.profile_updated(driverName),
    type: 'profile_updated',
  });
}

export async function notifyVehicleUpdated(
  driverPhone: string,
  driverName: string,
  vehicleInfo: string
): Promise<void> {
  await sendSMS({
    to: driverPhone,
    message: SMS_TEMPLATES.vehicle_updated(driverName, vehicleInfo),
    type: 'vehicle_updated',
  });
}

export async function notifyWarning(
  driverPhone: string,
  driverName: string,
  warning: string
): Promise<void> {
  await sendSMS({
    to: driverPhone,
    message: SMS_TEMPLATES.warning_sent(driverName, warning),
    type: 'warning_sent',
  });
}

export async function notifyDocumentsVerified(
  driverPhone: string,
  driverName: string
): Promise<void> {
  await sendSMS({
    to: driverPhone,
    message: SMS_TEMPLATES.documents_verified(driverName),
    type: 'documents_verified',
  });
}

export async function notifyDocumentsRejected(
  driverPhone: string,
  driverName: string,
  reason: string
): Promise<void> {
  await sendSMS({
    to: driverPhone,
    message: SMS_TEMPLATES.documents_rejected(driverName, reason),
    type: 'documents_rejected',
  });
}

/**
 * Envoie un code OTP de sécurité
 */
export async function sendOTPCode(
  phone: string,
  code: string,
  purpose: string = 'Utilisez ce code pour vous authentifier'
): Promise<void> {
  console.log('📤 sendOTPCode appelé:', { phone, code, purpose });
  
  await sendSMS({
    to: phone,
    message: SMS_TEMPLATES.otp_code(code, purpose),
    type: 'otp_code',
  });
  
  console.log('📤 sendOTPCode terminé');
}

/**
 * Notifie l'annulation d'une course
 */
export async function notifyRideCancelled(
  passengerPhone: string,
  driverPhone: string,
  passengerName: string,
  driverName: string,
  reason?: string
): Promise<void> {
  // Notification au passager
  await sendSMS({
    to: passengerPhone,
    message: SMS_TEMPLATES.ride_cancelled_passenger(driverName, reason),
    type: 'ride_cancelled',
  });

  // Notification au conducteur
  await sendSMS({
    to: driverPhone,
    message: SMS_TEMPLATES.ride_cancelled_driver(passengerName, reason),
    type: 'ride_cancelled',
  });
}

/**
 * Récupère la configuration SMS depuis les paramètres admin
 */
export async function getSMSConfig(): Promise<SMSConfig> {
  try {
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/sms/config`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      }
    );

    if (!response.ok) {
      return { provider: 'ejsms', enabled: false };
    }

    return await response.json();
  } catch (error) {
    console.error('Erreur lors de la récupération de la config SMS:', error);
    return { provider: 'ejsms', enabled: false };
  }
}