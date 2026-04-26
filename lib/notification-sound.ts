/**
 * 🔊 SERVICE DE NOTIFICATION SONORE POUR CHAUFFEURS
 * 
 * Gère les notifications audio avec :
 * - Message vocal synthétisé (Text-to-Speech)
 * - Son de notification
 * - Vibration
 * - Notification navigateur
 */

// 🎵 Son de notification (beep court)
function playNotificationBeep() {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Fréquence agréable et AUDIBLE
    oscillator.frequency.value = 1000; // ⬆️ Augmenté de 800 à 1000 Hz
    oscillator.type = 'sine';

    // Volume AUGMENTÉ pour être bien audible
    gainNode.gain.setValueAtTime(0.8, audioContext.currentTime); // ⬆️ Augmenté de 0.3 à 0.8
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.8);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.8); // ⬆️ Durée augmentée de 0.5s à 0.8s
    
    console.log('🔊 Beep de notification joué à 1000Hz, volume 0.8');
  } catch (error) {
    console.error('Erreur lecture son:', error);
  }
}

// 🗣️ Message vocal synthétisé
function speakMessage(message: string, lang: string = 'fr-FR'): Promise<void> {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) {
      resolve();
      return;
    }

    // ✅ Annuler et relancer pour débloquer sur mobile
    window.speechSynthesis.cancel();

    // Attendre que le cancel soit effectif
    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.lang = lang;
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      utterance.onend = () => resolve();
      utterance.onerror = () => resolve(); // Ne pas bloquer si erreur

      // ✅ Fix Chrome mobile : forcer la voix disponible
      const voices = window.speechSynthesis.getVoices();
      const frVoice = voices.find(v => v.lang.startsWith('fr'));
      if (frVoice) utterance.voice = frVoice;

      window.speechSynthesis.speak(utterance);

      // ✅ Fix Chrome mobile : relancer si bloqué après 500ms
      setTimeout(() => {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      }, 500);
    }, 100);
  });
}

// 📳 Vibration (si supportée)
function vibrate(pattern: number[] = [200, 100, 200, 100, 200]) {
  if ('vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
}

// 🔔 Notification navigateur
async function showBrowserNotification(title: string, body: string, options?: any) {
  if (!('Notification' in window)) return null;

  if (Notification.permission === 'default') {
    await Notification.requestPermission();
  }

  if (Notification.permission !== 'granted') return null;

  // ✅ Mobile : utiliser ServiceWorker (new Notification() interdit sur mobile)
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, {
        body,
        icon: '/logo-smartcabb.png',
        badge: '/badge-smartcabb.png',
        vibrate: [200, 100, 200],
        requireInteraction: true,
        tag: options?.tag || 'smartcabb-notification',
        renotify: true,
        data: options?.data || {}
      });
      return null;
    } catch (error) {
      console.error('Erreur SW notification:', error);
    }
  }

  // Fallback PC uniquement
  try {
    return new Notification(title, {
      body,
      icon: '/logo-smartcabb.png',
      tag: options?.tag || 'smartcabb-notification',
      requireInteraction: true,
      ...options
    });
  } catch (error) {
    console.error('Erreur Notification:', error);
    return null;
  }
}
// 🚖 NOTIFICATION COMPLÈTE DE COURSE
export async function playRideNotification(rideDetails?: {
  passengerName?: string;
  pickup?: string;
  destination?: string;
  distance?: number;
  estimatedEarnings?: number;
}): Promise<void> {
  console.log('🔊 Déclenchement notification de course');

  // Son répété 3 fois
  playNotificationBeep();
  setTimeout(() => playNotificationBeep(), 800);
  setTimeout(() => playNotificationBeep(), 1600);

  // Vibration
  vibrate([300, 100, 300, 100, 300]);

  // Message vocal intelligent avec départ et destination réels
  let message = 'Nouvelle course SmartCabb. ';

  if (rideDetails?.pickup && rideDetails.pickup !== 'Point de départ') {
    message += `Départ : ${rideDetails.pickup}. `;
  }

  if (rideDetails?.destination && rideDetails.destination !== 'Destination') {
    message += `Destination : ${rideDetails.destination}. `;
  }

  message += 'Confirmez rapidement.';

  try {
    await speakMessage(message, 'fr-FR');
  } catch (error) {
    console.error('Erreur message vocal:', error);
  }

  // Notification navigateur
  const notifBody = rideDetails
    ? `${rideDetails.pickup || 'Départ'} → ${rideDetails.destination || 'Destination'}`
    : 'Une nouvelle course est disponible';

  await showBrowserNotification('SmartCabb - Nouvelle Course', notifBody, {
    tag: 'smartcabb-ride',
    renotify: true,
    data: rideDetails
  });
}

// 🔕 Arrêter toutes les notifications audio
export function stopAllNotifications() {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  navigator.vibrate(0);
}

// 🔔 Demander permission pour les notifications
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.warn('Notifications non supportées');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}

// 🧪 Test de notification
export async function testNotification() {
  console.log('🧪 Test de notification');
  
  await playRideNotification({
    passengerName: 'Jean Mukendi',
    pickup: 'Avenue Kasavubu, Kinshasa',
    destination: 'Place Lumumba, Kinshasa',
    distance: 3.5,
    estimatedEarnings: 2500
  });
}

// 🔄 Alias pour compatibilité avec les composants
export { playRideNotification as playRideNotificationSound };
