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
  return new Promise((resolve, reject) => {
    if (!('speechSynthesis' in window)) {
      console.warn('Web Speech API non supportée');
      reject(new Error('Speech API non supportée'));
      return;
    }

    // Annuler toute synthèse en cours
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = lang;
    utterance.rate = 1.0; // Vitesse normale
    utterance.pitch = 1.0; // Ton normal
    utterance.volume = 1.0; // Volume max

    utterance.onend = () => {
      console.log('✅ Message vocal terminé');
      resolve();
    };

    utterance.onerror = (event) => {
      console.error('❌ Erreur synthèse vocale:', event);
      reject(event);
    };

    // Jouer le message
    window.speechSynthesis.speak(utterance);
  });
}

// 📳 Vibration (si supportée)
function vibrate(pattern: number[] = [200, 100, 200, 100, 200]) {
  if ('vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
}

// 🔔 Notification navigateur
async function showBrowserNotification(title: string, body: string, options?: NotificationOptions) {
  if (!('Notification' in window)) {
    console.warn('Notifications non supportées');
    return null;
  }

  // Demander permission si pas encore accordée
  if (Notification.permission === 'default') {
    await Notification.requestPermission();
  }

  if (Notification.permission === 'granted') {
    const notification = new Notification(title, {
      body,
      icon: '/logo.png',
      badge: '/logo.png',
      vibrate: [200, 100, 200],
      requireInteraction: true, // Ne se ferme pas automatiquement
      ...options
    });

    return notification;
  }

  return null;
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

  // 1. Son de notification RÉPÉTÉ 3 fois pour être sûr qu'il soit entendu
  playNotificationBeep();
  setTimeout(() => playNotificationBeep(), 800);
  setTimeout(() => playNotificationBeep(), 1600);

  // 2. Vibration
  vibrate([300, 100, 300, 100, 300]);

  // 3. Message vocal personnalisé et naturel
  let message = '';
  
  if (rideDetails) {
    message = `Bonjour, vous avez une nouvelle course SmartCabb. `;
    
    // Ajouter les adresses si disponibles
    if (rideDetails.pickup && rideDetails.destination) {
      message += `Départ : ${rideDetails.pickup}. `;
      message += `Destination : ${rideDetails.destination}. `;
    } else if (rideDetails.pickup) {
      message += `Départ : ${rideDetails.pickup}. `;
    }
    
    message += `Merci de confirmer rapidement.`;
  } else {
    // Message générique
    message = 'Bonjour, vous avez une nouvelle course en attente. Merci de confirmer.';
  }

  try {
    await speakMessage(message);
  } catch (error) {
    console.error('Erreur message vocal:', error);
    // Continuer même si le vocal échoue
  }

  // 4. Notification navigateur
  const notifBody = rideDetails
    ? `📍 ${rideDetails.pickup || 'Position inconnue'}${rideDetails.destination ? ' → ' + rideDetails.destination : ''}\n💰 ${rideDetails.estimatedEarnings || 0} FC\n📏 ${rideDetails.distance || 0} km`
    : 'Une nouvelle course est disponible';

  await showBrowserNotification('🚖 Nouvelle Course SmartCabb', notifBody, {
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

