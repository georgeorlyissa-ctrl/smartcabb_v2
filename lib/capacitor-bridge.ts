import type { CapacitorConfig } from '@capacitor/cli';

let isNative = false;

export async function detectNative(): Promise<boolean> {
  if (isNative) return true;
  try {
    const { Capacitor } = await import('@capacitor/core');
    isNative = Capacitor.isNativePlatform();
    return isNative;
  } catch {
    isNative = false;
    return false;
  }
}

export function isNativePlatform(): boolean {
  return isNative;
}

export async function getCurrentPosition(options?: { timeout?: number }): Promise<{ lat: number; lng: number; accuracy: number }> {
  if (await detectNative()) {
    const { Geolocation } = await import('@capacitor/geolocation');
    const pos = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: options?.timeout || 10000,
    });
    return {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy: pos.coords.accuracy || 0,
    };
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      }),
      reject,
      { enableHighAccuracy: true, timeout: options?.timeout || 10000, maximumAge: 0 }
    );
  });
}

export async function watchPosition(
  callback: (pos: { lat: number; lng: number; accuracy: number }) => void,
  onError?: (err: any) => void
): Promise<string> {
  if (await detectNative()) {
    const { Geolocation } = await import('@capacitor/geolocation');
    const watchId = await Geolocation.watchPosition(
      { enableHighAccuracy: true, timeout: 5000 },
      (pos, err) => {
        if (err) { onError?.(err); return; }
        if (pos?.coords) {
          callback({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy || 0,
          });
        }
      }
    );
    return String(watchId);
  }

  const watchId = navigator.geolocation.watchPosition(
    (pos) => callback({
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
    }),
    onError,
    { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
  );
  return String(watchId);
}

export async function clearWatch(watchId: string): Promise<void> {
  if (await detectNative()) {
    try {
      const { Geolocation } = await import('@capacitor/geolocation');
      await Geolocation.clearWatch({ id: watchId });
    } catch {}
    return;
  }
  navigator.geolocation.clearWatch(Number(watchId));
}

export async function requestPushPermissions(): Promise<boolean> {
  if (await detectNative()) {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    const perm = await PushNotifications.requestPermissions();
    return perm.receive === 'granted';
  }

  const perm = await Notification.requestPermission();
  return perm === 'granted';
}

export async function registerPushNotifications(): Promise<string | null> {
  if (await detectNative()) {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    await PushNotifications.register();
    return new Promise((resolve) => {
      const handler = async (token: any) => {
        resolve(token.value || null);
        PushNotifications.removeAllListeners();
      };
      PushNotifications.addListener('registration', handler);
      PushNotifications.addListener('registrationError', () => resolve(null));
      setTimeout(() => resolve(null), 15000);
    });
  }

  return null;
}

export async function addPushNotificationListener(
  handler: (data: any) => void
): Promise<void> {
  if (await detectNative()) {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      handler(notification.data || notification);
    });
  }
}

export async function checkPermissions(): Promise<{ location: boolean; notifications: boolean }> {
  const result = { location: false, notifications: false };

  try {
    if (await detectNative()) {
      const { Geolocation } = await import('@capacitor/geolocation');
      const locPerm = await Geolocation.checkPermissions();
      result.location = locPerm.location === 'granted';

      const { PushNotifications } = await import('@capacitor/push-notifications');
      const pushPerm = await PushNotifications.checkPermissions();
      result.notifications = pushPerm.receive === 'granted';
    } else {
      result.location = !!navigator.geolocation;
      result.notifications = Notification.permission === 'granted';
    }
  } catch {}

  return result;
}
