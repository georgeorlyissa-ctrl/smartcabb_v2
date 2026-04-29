/**
 * 🔊 SERVICE DE NOTIFICATION SONORE — SmartCabb
 *
 * Compatibilité cross-browser complète :
 *   ✅ Chrome desktop / Android
 *   ✅ Firefox desktop / Android
 *   ✅ Safari macOS / iOS (limitations geste user signalées)
 *   ✅ Edge (Chromium)
 *   ✅ Samsung Internet
 *   ✅ Opera
 */

// ─── Détection navigateur ─────────────────────────────────────────────────────
const _ua  = typeof navigator !== 'undefined' ? navigator.userAgent : '';
const IS_IOS     = /iPad|iPhone|iPod/.test(_ua) && !(window as any).MSStream;
const IS_SAFARI  = /^((?!chrome|android).)*safari/i.test(_ua) || (IS_IOS && /safari/i.test(_ua));
const IS_FIREFOX = /firefox\/\d/i.test(_ua);
const IS_CHROME  = /chrome\/\d/i.test(_ua) && !/edg(e|\/)|opr\//i.test(_ua);
const IS_ANDROID = /android/i.test(_ua);
const IS_SAMSUNG = /samsungbrowser/i.test(_ua);

// ─── AudioContext partagé (évite la limite de 6 instances Chrome) ─────────────
let _audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (!_audioCtx || _audioCtx.state === 'closed') {
      _audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return _audioCtx;
  } catch {
    return null;
  }
}

// ─── Beep de notification (double ton montant) ────────────────────────────────
function playNotificationBeep(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const playTones = () => {
      const now = ctx.currentTime;

      // Ton 1 — 880 Hz
      const o1 = ctx.createOscillator();
      const g1 = ctx.createGain();
      o1.connect(g1); g1.connect(ctx.destination);
      o1.frequency.value = 880;
      o1.type = 'sine';
      g1.gain.setValueAtTime(0, now);
      g1.gain.linearRampToValueAtTime(0.9, now + 0.04);
      g1.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      o1.start(now); o1.stop(now + 0.45);

      // Ton 2 — 1100 Hz (après 0.5s)
      const o2 = ctx.createOscillator();
      const g2 = ctx.createGain();
      o2.connect(g2); g2.connect(ctx.destination);
      o2.frequency.value = 1100;
      o2.type = 'sine';
      g2.gain.setValueAtTime(0, now + 0.50);
      g2.gain.linearRampToValueAtTime(0.9, now + 0.54);
      g2.gain.exponentialRampToValueAtTime(0.001, now + 0.95);
      o2.start(now + 0.50); o2.stop(now + 0.95);

      console.log('🔊 Beep joué (880 Hz → 1100 Hz)');
    };

    if (ctx.state === 'suspended') {
      ctx.resume().then(playTones).catch(e => console.warn('AudioContext resume:', e));
    } else {
      playTones();
    }
  } catch (e) {
    console.error('Erreur playNotificationBeep:', e);
  }
}

// ─── Cache des voix ───────────────────────────────────────────────────────────
let _cachedVoices: SpeechSynthesisVoice[] | null = null;

/**
 * Charge les voix de synthèse vocale de manière cross-browser.
 *
 * Stratégie :
 *  1. Retour synchrone si déjà disponibles (Firefox, Safari macOS)
 *  2. Écoute de `voiceschanged` (Chrome, Edge, Samsung)
 *  3. Polling 100 ms (Safari iOS qui ne lance pas l'événement)
 *  4. Timeout absolu 4 s
 */
function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (!('speechSynthesis' in window)) return Promise.resolve([]);
  if (_cachedVoices && _cachedVoices.length > 0) return Promise.resolve(_cachedVoices);

  return new Promise((resolve) => {
    let done = false;
    const finish = (voices: SpeechSynthesisVoice[]) => {
      if (done) return;
      done = true;
      if (voices.length) _cachedVoices = voices;
      resolve(voices);
    };

    // 1. Tentative synchrone
    const sync = window.speechSynthesis.getVoices();
    if (sync.length > 0) { finish(sync); return; }

    // 2. Événement voiceschanged (Chrome / Edge / Samsung)
    const onChanged = () => {
      window.speechSynthesis.removeEventListener('voiceschanged', onChanged);
      finish(window.speechSynthesis.getVoices());
    };
    window.speechSynthesis.addEventListener('voiceschanged', onChanged);

    // 3. Polling 100 ms (Safari iOS, navigateurs sans voiceschanged)
    let polls = 0;
    const poll = setInterval(() => {
      const v = window.speechSynthesis.getVoices();
      polls++;
      if (v.length > 0 || polls >= 40) { // 4 s max
        clearInterval(poll);
        window.speechSynthesis.removeEventListener('voiceschanged', onChanged);
        finish(v);
      }
    }, 100);

    // 4. Failsafe absolu
    setTimeout(() => {
      clearInterval(poll);
      window.speechSynthesis.removeEventListener('voiceschanged', onChanged);
      finish(window.speechSynthesis.getVoices());
    }, 4500);
  });
}

/**
 * Sélectionne la meilleure voix française disponible sur l'appareil.
 * Ordre de priorité : Google fr-FR > réseau fr-FR > local fr-FR > fr-BE/CA > fr-*
 */
function pickBestFrenchVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (!voices.length) return null;
  return (
    voices.find(v => v.lang === 'fr-FR' && /google/i.test(v.name)) ||   // Google fr-FR (Chrome)
    voices.find(v => v.lang === 'fr-FR' && !v.localService)         ||   // voix réseau fr-FR
    voices.find(v => v.lang === 'fr-FR')                            ||   // voix locale fr-FR
    voices.find(v => /^fr-/i.test(v.lang))                         ||   // fr-BE, fr-CA, fr-CH...
    voices.find(v => v.lang.startsWith('fr'))                       ||   // tout fr
    null
  );
}

// ─── Jouer une seule utterance avec gestion cross-browser ────────────────────
function speakUtterance(
  utt: SpeechSynthesisUtterance,
  timeoutMs = 14000
): Promise<void> {
  return new Promise((resolve) => {
    let resolved = false;
    const done = () => { if (!resolved) { resolved = true; resolve(); } };

    const safeTimeout = setTimeout(() => {
      console.warn('⚠️ TTS: utterance timeout (', timeoutMs, 'ms)');
      done();
    }, timeoutMs);

    utt.onend = () => { clearTimeout(safeTimeout); done(); };
    utt.onerror = (e) => {
      clearTimeout(safeTimeout);
      // 'interrupted' / 'canceled' sont normaux lors d'un cancel() manuel
      if (e.error !== 'interrupted' && e.error !== 'canceled') {
        console.warn('⚠️ TTS utterance error:', e.error);
      }
      done();
    };

    window.speechSynthesis.speak(utt);

    // Fix Chrome / Android / Samsung : la synthèse peut se mettre en pause
    // silencieusement → on force la reprise toutes les 250 ms
    if (!IS_FIREFOX && !IS_SAFARI) {
      let ticks = 0;
      const resumeTimer = setInterval(() => {
        ticks++;
        if (!window.speechSynthesis.speaking || ticks > 60) {
          clearInterval(resumeTimer);
          return;
        }
        if (window.speechSynthesis.paused) {
          console.warn('⚠️ TTS: en pause — reprise forcée');
          window.speechSynthesis.resume();
        }
      }, 250);
    }
  });
}

/**
 * Découpe un texte en phrases courtes.
 * Nécessaire pour Chrome / Android qui tronquent silencieusement les
 * utterances dépassant ~15 secondes (bug connu).
 */
function splitPhrases(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(Boolean);
}

// ─── Synthèse vocale principale ───────────────────────────────────────────────
async function speakMessage(message: string, lang = 'fr-FR'): Promise<void> {
  if (!('speechSynthesis' in window)) {
    console.warn('⚠️ speechSynthesis non supporté sur ce navigateur');
    return;
  }

  // iOS Safari : speechSynthesis ne fonctionne que dans un handler de geste
  // utilisateur. On tente quand même (si l'app est au premier plan ça marche).
  if (IS_IOS) {
    console.warn('⚠️ iOS Safari: TTS peut être bloqué si aucun geste utilisateur récent');
  }

  try {
    // Annuler tout discours en cours
    window.speechSynthesis.cancel();

    // Safari a besoin d'un délai plus long après cancel()
    await new Promise(r => setTimeout(r, IS_SAFARI ? 400 : IS_FIREFOX ? 50 : 150));

    // Charger les voix
    const voices = await loadVoices();
    const voice  = pickBestFrenchVoice(voices);

    const browserName = IS_CHROME
      ? (IS_ANDROID ? 'Chrome Android' : IS_SAMSUNG ? 'Samsung Internet' : 'Chrome')
      : IS_FIREFOX ? 'Firefox'
      : IS_SAFARI  ? (IS_IOS ? 'Safari iOS' : 'Safari macOS')
      : 'Autre';

    if (voice) {
      console.log(`✅ TTS [${browserName}] Voix: "${voice.name}" | ${voice.lang} | local: ${voice.localService}`);
    } else {
      console.warn(`⚠️ TTS [${browserName}] Aucune voix française — voix système par défaut`);
    }

    // Chrome/Android tronquent les utterances longues (bug 15 s)
    // → on découpe en phrases et on les joue en séquence
    const needsChunking = IS_CHROME || IS_ANDROID || IS_SAMSUNG;
    const phrases = needsChunking ? splitPhrases(message) : [message];

    console.log(`🗣️ TTS: ${phrases.length} phrase(s) — "${message.substring(0, 80)}${message.length > 80 ? '…' : ''}"`);

    for (let i = 0; i < phrases.length; i++) {
      const phrase = phrases[i];
      if (!phrase) continue;

      const utt = new SpeechSynthesisUtterance(phrase);
      utt.lang   = lang;
      utt.rate   = IS_IOS ? 0.95 : 0.85;   // iOS parle plus vite nativement
      utt.pitch  = 1.0;
      utt.volume = 1.0;
      if (voice) utt.voice = voice;

      await speakUtterance(utt);

      // Petite pause naturelle entre les phrases (sauf la dernière)
      if (i < phrases.length - 1) {
        await new Promise(r => setTimeout(r, 120));
      }
    }

    console.log('✅ TTS: message vocal terminé');
  } catch (error) {
    console.error('❌ Erreur speakMessage:', error);
  }
}

// ─── Vibration ────────────────────────────────────────────────────────────────
function vibrate(pattern: number[] = [200, 100, 200, 100, 200]): void {
  if ('vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
}

// ─── Notification navigateur ──────────────────────────────────────────────────
async function showBrowserNotification(
  title: string,
  body: string,
  options?: Record<string, any>
): Promise<void> {
  if (!('Notification' in window)) return;

  if (Notification.permission === 'default') {
    await Notification.requestPermission();
  }
  if (Notification.permission !== 'granted') return;

  // Mobile / PWA : passer par le Service Worker
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(title, {
        body,
        icon:              '/logo-smartcabb.png',
        badge:             '/badge-smartcabb.png',
        vibrate:           [200, 100, 200],
        requireInteraction: true,
        tag:               options?.tag || 'smartcabb-notification',
        renotify:          true,
        data:              options?.data || {},
      });
      return;
    } catch (e) {
      console.warn('Notification SW échouée, fallback:', e);
    }
  }

  // Fallback desktop
  try {
    new Notification(title, {
      body,
      icon:              '/logo-smartcabb.png',
      tag:               options?.tag || 'smartcabb-notification',
      requireInteraction: true,
      ...options,
    });
  } catch (e) {
    console.error('Erreur Notification desktop:', e);
  }
}

// ─── API PUBLIQUE ─────────────────────────────────────────────────────────────

/**
 * Déclenche la notification sonore complète :
 * beep × 3 + message vocal TTS + vibration + notification navigateur
 */
export async function playRideNotification(rideDetails?: {
  passengerName?: string;
  pickup?: string;
  destination?: string;
  distance?: number;
  estimatedEarnings?: number;
}): Promise<void> {
  console.log('🚖 playRideNotification déclenché');

  // Beeps (3×, espacés de 900 ms)
  playNotificationBeep();
  setTimeout(() => playNotificationBeep(), 900);
  setTimeout(() => playNotificationBeep(), 1800);

  // Vibration
  vibrate([300, 100, 300, 100, 300]);

  // Message vocal
  let msg = 'Nouvelle course SmartCabb. ';
  if (rideDetails?.pickup && rideDetails.pickup !== 'Point de départ') {
    msg += `Départ : ${rideDetails.pickup}. `;
  }
  if (rideDetails?.destination && rideDetails.destination !== 'Destination') {
    msg += `Destination : ${rideDetails.destination}. `;
  }
  msg += 'Confirmez rapidement.';

  // TTS en parallèle des beeps (ne bloque pas)
  speakMessage(msg, 'fr-FR').catch(e => console.error('TTS error:', e));

  // Notification navigateur
  const notifBody = rideDetails
    ? `${rideDetails.pickup || 'Départ'} → ${rideDetails.destination || 'Destination'}`
    : 'Une nouvelle course est disponible';

  await showBrowserNotification('SmartCabb — Nouvelle Course 🚖', notifBody, {
    tag:      'smartcabb-ride',
    renotify: true,
    data:     rideDetails,
  });
}

/** Arrête toute synthèse vocale et vibration en cours */
export function stopAllNotifications(): void {
  try {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  } catch {}
  try {
    if ('vibrate' in navigator) navigator.vibrate(0);
  } catch {}
}

/** Demande la permission pour les notifications navigateur */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied')  return false;
  const perm = await Notification.requestPermission();
  return perm === 'granted';
}

/**
 * Pré-charge les voix TTS dès le démarrage de l'app (appeler au mount).
 * Améliore la réactivité du premier message vocal.
 */
export function preloadVoices(): void {
  loadVoices().then(voices => {
    const fr = pickBestFrenchVoice(voices);
    if (fr) {
      console.log(`✅ Voix TTS pré-chargée : "${fr.name}" | ${fr.lang}`);
    } else {
      console.warn(`⚠️ Voix pré-chargée : aucune voix française (${voices.length} voix dispo)`);
    }
  });
}

/** Test complet de la notification */
export async function testNotification(): Promise<void> {
  await playRideNotification({
    passengerName:    'Jean Mukendi',
    pickup:           'Avenue Kasavubu, Kinshasa',
    destination:      'Place Lumumba, Kinshasa',
    distance:         3.5,
    estimatedEarnings: 2500,
  });
}

// Alias rétro-compatibilité
export { playRideNotification as playRideNotificationSound };
