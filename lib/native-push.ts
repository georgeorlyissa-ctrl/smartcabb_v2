/**
 * 🔔 PUSH NATIF (Capacitor) — SmartCabb
 *
 * Le FCM version Web (firebase/messaging) n'est PAS supporté dans la WebView
 * Capacitor : pas de `PushManager`, donc aucun token et aucune notification
 * quand l'app est en arrière-plan ou fermée. C'est le plugin natif
 * `@capacitor/push-notifications` qui doit prendre le relais.
 *
 * Ce module :
 *  - crée le canal Android `smartcabb_rides` (importance haute + son) utilisé
 *    par le backend (`android.notification.channelId`) ;
 *  - demande la permission (Android 13+ : POST_NOTIFICATIONS) ;
 *  - enregistre l'appareil et envoie le token au backend (même endpoint que
 *    le FCM web : /fcm/register-driver-token ou /fcm/register-passenger-token) ;
 *  - relaie les messages reçus au premier plan vers les événements déjà
 *    écoutés par DriverDashboardNew (`fcm-new-ride-request`, etc.) ;
 *  - mémorise la notification ouverte (app fermée) pour que le tableau de
 *    bord chauffeur affiche la course dès son montage.
 */

import { projectId, publicAnonKey } from '../utils/supabase/info';

export type PushRole = 'driver' | 'passenger';

export const PENDING_PUSH_KEY = 'smartcabb_pending_push';

type CurrentTarget = { role: PushRole; userId: string } | null;

let listenersInstalled = false;
let currentTarget: CurrentTarget = null;
let registering = false;

function apiBase(): string {
  return `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52`;
}

async function isNativePlatform(): Promise<boolean> {
  try {
    const { Capacitor } = await import('@capacitor/core');
    return !!Capacitor?.isNativePlatform?.();
  } catch {
    return false;
  }
}

async function appVersion(): Promise<string | null> {
  try {
    const { App } = await import('@capacitor/app');
    const info = await App.getInfo();
    return info?.version || null;
  } catch {
    return null;
  }
}

async function saveTokenFor(role: PushRole, userId: string, token: string): Promise<boolean> {
  const endpoint = role === 'driver' ? 'register-driver-token' : 'register-passenger-token';
  const version = await appVersion();
  const body = role === 'driver'
    // `platform`/`appVersion` servent au diagnostic : ils prouvent que le token
    // vient du push NATIF (et non du FCM web, qui n'a pas ce champ).
    ? { driverId: userId, fcmToken: token, platform: 'native', appVersion: version }
    : { passengerId: userId, fcmToken: token, platform: 'native', appVersion: version };

  try {
    const res = await fetch(`${apiBase()}/fcm/${endpoint}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) {
      console.warn('⚠️ [NATIVE PUSH] Enregistrement du token refusé:', json?.error || res.status);
      return false;
    }
    console.log('✅ [NATIVE PUSH] Token enregistré pour', role, userId);
    return true;
  } catch (e) {
    console.warn('⚠️ [NATIVE PUSH] Enregistrement du token impossible:', e);
    return false;
  }
}

function rememberPendingRide(data: Record<string, any>) {
  try {
    sessionStorage.setItem(PENDING_PUSH_KEY, JSON.stringify(data));
  } catch {}
}

/**
 * Ouvre l'app sur le tableau de bord chauffeur quand la notification a été
 * touchée alors que l'app était fermée/en arrière-plan.
 */
function openDriverDashboardIfNeeded() {
  const isDriverRoute = typeof window !== 'undefined' && window.location.pathname.includes('/driver');
  if (isDriverRoute) return;
  try {
    window.location.assign('/app/driver');
  } catch {}
}

function handleNotificationData(data: Record<string, any>, fromAction: boolean) {
  const type = data?.type;

  if (type === 'new_ride_request') {
    if (fromAction) {
      rememberPendingRide(data);
      openDriverDashboardIfNeeded();
    }
    window.dispatchEvent(new CustomEvent('fcm-new-ride-request', { detail: data }));
    return;
  }

  if (type === 'ride_taken' || type === 'ride_cancelled' || type === 'ride_cancelled_by_passenger') {
    window.dispatchEvent(new CustomEvent('fcm-ride-dismissed', { detail: data }));
    return;
  }

  if (type === 'reservation_assigned' || type === 'reservation_proposed') {
    window.dispatchEvent(new CustomEvent('fcm-reservation-assigned', { detail: data }));
    return;
  }

  // 🚖 Réservation arrivée à l'heure : la course est déjà attribuée au
  // conducteur. Sans ce cas, la notification s'affichait mais l'app restait sur
  // le tableau de bord (aucune course ouverte, ni sonnerie).
  if (type === 'reservation_started' && data.rideId) {
    // ⚠️ Ne jamais rediriger un PASSAGER vers le tableau de bord chauffeur :
    // son app écoute le même événement et ouvre l'écran de course.
    if (currentTarget?.role === 'driver') {
      rememberPendingRide(data);
      window.dispatchEvent(new CustomEvent('fcm-reservation-started', { detail: data }));
      openDriverDashboardIfNeeded();
    } else {
      window.dispatchEvent(new CustomEvent('fcm-reservation-started', { detail: data }));
    }
    return;
  }

  if (type === 'reservation_driver_enroute' && data.rideId) {
    // Le passager doit voir sa course réservée s'ouvrir (le chauffeur est
    // parti vers le point de départ).
    window.dispatchEvent(new CustomEvent('fcm-reservation-started', { detail: data }));
    return;
  }

  console.log('🔔 [NATIVE PUSH] Notification reçue:', type || '(sans type)');
}

async function installListeners(PushNotifications: any) {
  if (listenersInstalled) return;
  listenersInstalled = true;

  await PushNotifications.addListener('registration', async (token: any) => {
    const value = token?.value;
    if (!value) return;
    console.log('🔔 [NATIVE PUSH] Token FCM natif:', String(value).slice(0, 24) + '...');
    try {
      localStorage.setItem('smartcabb_native_push_token', value);
    } catch {}
    if (currentTarget) {
      await saveTokenFor(currentTarget.role, currentTarget.userId, value);
    }
  });

  await PushNotifications.addListener('registrationError', (err: any) => {
    console.error('❌ [NATIVE PUSH] Échec d\'enregistrement:', err);
  });

  // App au premier plan : le système n'affiche rien, on relaie à l'UI.
  await PushNotifications.addListener('pushNotificationReceived', (notification: any) => {
    handleNotificationData(notification?.data || {}, false);
  });

  // L'utilisateur touche la notification (app en arrière-plan ou fermée).
  await PushNotifications.addListener('pushNotificationActionPerformed', (action: any) => {
    handleNotificationData(action?.notification?.data || {}, true);
  });
}

const CHANNEL_ID = 'smartcabb_rides';
// Version du canal : à incrémenter si l'on doit le recréer chez tout le monde.
const CHANNEL_REPAIR_KEY = 'sc_channel_repair_v2';

async function ensureChannel(PushNotifications: any) {
  // ⚠️ NE JAMAIS passer `sound: 'default'` ici : le plugin natif l'interprète
  // comme un fichier res/raw/default (inexistant) et crée un canal avec un son
  // invalide → notifications muettes. En omettant `sound`, Android utilise le
  // son de notification par défaut du téléphone.
  try {
    // Le canal est IMMUABLE une fois créé : on le supprime une seule fois pour
    // réparer les installations qui ont le canal cassé, puis on le recrée.
    try {
      if (localStorage.getItem(CHANNEL_REPAIR_KEY) !== 'done') {
        await PushNotifications.deleteChannel({ id: CHANNEL_ID });
        localStorage.setItem(CHANNEL_REPAIR_KEY, 'done');
        console.log('🧹 [NATIVE PUSH] Ancien canal supprimé (réparation du son)');
      }
    } catch (e) {
      console.log('ℹ️ [NATIVE PUSH] Suppression du canal impossible:', e);
    }

    await PushNotifications.createChannel({
      id: CHANNEL_ID,
      name: 'Courses SmartCabb',
      description: 'Nouvelles courses, arrivées et mises à jour',
      importance: 5, // IMPORTANCE_HIGH → bandeau + son
      visibility: 1, // VISIBILITY_PUBLIC
      vibration: true,
      lights: true,
    });
    console.log('✅ [NATIVE PUSH] Canal smartcabb_rides prêt');
  } catch (e) {
    // Android < 8 : pas de canaux, sans conséquence.
    console.log('ℹ️ [NATIVE PUSH] Canal non créé (Android < 8 ou web):', e);
  }
}

/**
 * À appeler au montage de l'app connectée (chauffeur ou passager).
 * Idempotent : plusieurs appels ne réenregistrent pas les listeners.
 */
export async function initNativePush(role: PushRole, userId: string): Promise<boolean> {
  if (!userId) return false;
  if (!(await isNativePlatform())) return false;

  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');

    currentTarget = { role, userId };
    await installListeners(PushNotifications);
    await ensureChannel(PushNotifications);

    // Permission Android 13+ / iOS
    let perm = await PushNotifications.checkPermissions();
    if (perm.receive !== 'granted') {
      perm = await PushNotifications.requestPermissions();
    }
    if (perm.receive !== 'granted') {
      console.warn('⚠️ [NATIVE PUSH] Permission refusée par l\'utilisateur');
      return false;
    }

    if (registering) return true;
    registering = true;
    try {
      await PushNotifications.register();
    } finally {
      registering = false;
    }

    console.log('✅ [NATIVE PUSH] Enregistrement demandé pour', role, userId);
    return true;
  } catch (e) {
    console.warn('⚠️ [NATIVE PUSH] Initialisation impossible:', e);
    return false;
  }
}

/** Payload d'une notification ouverte (app fermée), à consommer une seule fois. */
export function consumePendingPushRide(): Record<string, any> | null {
  try {
    const raw = sessionStorage.getItem(PENDING_PUSH_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(PENDING_PUSH_KEY);
    const data = JSON.parse(raw);
    return data?.type === 'new_ride_request' ? data : null;
  } catch {
    return null;
  }
}
