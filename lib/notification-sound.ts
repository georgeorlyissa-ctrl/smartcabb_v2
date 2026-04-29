/**
 * 🔊 SERVICE DE NOTIFICATION SONORE — SmartCabb
 *
 * Latence minimisée + compatibilité cross-browser complète :
 *   ✅ Chrome desktop / Android
 *   ✅ Firefox desktop / Android
 *   ✅ Safari macOS / iOS
 *   ✅ Edge / Samsung Internet / Opera
 *
 * Stratégie anti-latence :
 *   – AudioContext pré-chauffé au démarrage (plus de resume() async au 1er beep)
 *   – Moteur TTS pré-initialisé (utterance silencieuse) → 1er speak() ~30ms au lieu de ~400ms
 *   – Voix française mise en cache une seule fois
 *   – Aucun délai si rien n'était en cours de lecture
 *   – Beep + TTS en parallèle strict, notification navigateur non-bloquante
 */

// ─── Détection navigateur ─────────────────────────────────────────────────────
const _ua     = typeof navigator !== 'undefined' ? navigator.userAgent : '';
const IS_IOS     = /iPad|iPhone|iPod/.test(_ua) && !(window as any).MSStream;
const IS_SAFARI  = /^((?!chrome|android).)*safari/i.test(_ua) || (IS_IOS && /safari/i.test(_ua));
const IS_FIREFOX = /firefox\/\d/i.test(_ua);
const IS_CHROME  = /chrome\/\d/i.test(_ua) && !/edg(e|\/)|opr\//i.test(_ua);
const IS_ANDROID = /android/i.test(_ua);
const IS_SAMSUNG = /samsungbrowser/i.test(_ua);

// ─── AudioContext — singleton pré-chauffé ─────────────────────────────────────
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

/** Pré-chauffe l'AudioContext (élimine le `resume()` asynchrone au 1er beep) */
function warmUpAudioContext(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    // Jouer un silence d'1 ms pour confirmer l'initialisation du pipeline audio
    const buf = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start(0);
  } catch {}
}

// ─── Beep double-ton (880 Hz → 1100 Hz) ──────────────────────────────────────
function playNotificationBeep(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const play = () => {
      const now = ctx.currentTime;

      const o1 = ctx.createOscillator(), g1 = ctx.createGain();
      o1.connect(g1); g1.connect(ctx.destination);
      o1.type = 'sine'; o1.frequency.value = 880;
      g1.gain.setValueAtTime(0, now);
      g1.gain.linearRampToValueAtTime(0.9, now + 0.04);
      g1.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
      o1.start(now); o1.stop(now + 0.42);

      const o2 = ctx.createOscillator(), g2 = ctx.createGain();
      o2.connect(g2); g2.connect(ctx.destination);
      o2.type = 'sine'; o2.frequency.value = 1100;
      g2.gain.setValueAtTime(0, now + 0.46);
      g2.gain.linearRampToValueAtTime(0.9, now + 0.50);
      g2.gain.exponentialRampToValueAtTime(0.001, now + 0.90);
      o2.start(now + 0.46); o2.stop(now + 0.90);
    };

    // AudioContext déjà chauffé → synchrone dans la majorité des cas
    if (ctx.state === 'suspended') {
      ctx.resume().then(play).catch(() => {});
    } else {
      play();
    }
  } catch (e) {
    console.error('Erreur beep:', e);
  }
}

// ─── Cache voix TTS ───────────────────────────────────────────────────────────
let _cachedVoices: SpeechSynthesisVoice[] | null = null;
let _cachedVoice:  SpeechSynthesisVoice  | null = null; // voix française sélectionnée
let _ttsWarmedUp = false;

/**
 * Charge les voix (cross-browser) avec polling accéléré (50 ms).
 * Retourne immédiatement si le cache est chaud.
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

    // Synchrone (Firefox, Safari macOS)
    const sync = window.speechSynthesis.getVoices();
    if (sync.length) { finish(sync); return; }

    // voiceschanged (Chrome, Edge, Samsung)
    const onChanged = () => {
      window.speechSynthesis.removeEventListener('voiceschanged', onChanged);
      finish(window.speechSynthesis.getVoices());
    };
    window.speechSynthesis.addEventListener('voiceschanged', onChanged);

    // Polling 50 ms (Safari iOS, navigateurs sans voiceschanged)
    let t = 0;
    const poll = setInterval(() => {
      const v = window.speechSynthesis.getVoices();
      t += 50;
      if (v.length || t >= 2000) { // 2 s max
        clearInterval(poll);
        window.speechSynthesis.removeEventListener('voiceschanged', onChanged);
        finish(v);
      }
    }, 50);

    // Failsafe absolu
    setTimeout(() => {
      clearInterval(poll);
      window.speechSynthesis.removeEventListener('voiceschanged', onChanged);
      finish(window.speechSynthesis.getVoices());
    }, 2500);
  });
}

function pickBestFrenchVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (!voices.length) return null;
  return (
    voices.find(v => v.lang === 'fr-FR' && /google/i.test(v.name)) ||
    voices.find(v => v.lang === 'fr-FR' && !v.localService)         ||
    voices.find(v => v.lang === 'fr-FR')                            ||
    voices.find(v => /^fr-/i.test(v.lang))                         ||
    voices.find(v => v.lang.startsWith('fr'))                       ||
    null
  );
}

/**
 * Pré-chauffe le moteur TTS avec une utterance silencieuse.
 * Chrome/Android : 1er speak() sans warm-up = ~400 ms de latence.
 *                  Avec warm-up = ~30 ms.
 */
function warmUpTTSEngine(voice: SpeechSynthesisVoice | null): void {
  if (!('speechSynthesis' in window) || _ttsWarmedUp) return;
  _ttsWarmedUp = true;
  try {
    const u = new SpeechSynthesisUtterance('\u200B'); // zero-width space — quasiment inaudible
    u.volume = 0;
    u.rate   = 2;
    u.lang   = 'fr-FR';
    if (voice) u.voice = voice;
    window.speechSynthesis.speak(u);
    // Annuler proprement après 300 ms (fin probable de l'utterance vide)
    setTimeout(() => {
      try { window.speechSynthesis.cancel(); } catch {}
    }, 300);
    console.log('🔥 Moteur TTS pré-chauffé');
  } catch {}
}

// ─── Jouer une utterance — cross-browser ─────────────────────────────────────
function speakUtterance(utt: SpeechSynthesisUtterance, timeoutMs = 14000): Promise<void> {
  return new Promise((resolve) => {
    let resolved = false;
    const done = () => { if (!resolved) { resolved = true; resolve(); } };

    const guard = setTimeout(() => {
      console.warn('⚠️ TTS timeout utterance');
      done();
    }, timeoutMs);

    utt.onend   = () => { clearTimeout(guard); done(); };
    utt.onerror = (e) => {
      clearTimeout(guard);
      if (e.error !== 'interrupted' && e.error !== 'canceled') {
        console.warn('⚠️ TTS error:', e.error);
      }
      done();
    };

    window.speechSynthesis.speak(utt);

    // Fix Chrome / Android / Samsung : pause silencieuse → forcer resume() toutes les 250 ms
    if (!IS_FIREFOX && !IS_SAFARI) {
      let ticks = 0;
      const t = setInterval(() => {
        if (!window.speechSynthesis.speaking || ++ticks > 80) { clearInterval(t); return; }
        if (window.speechSynthesis.paused) {
          console.warn('⚠️ TTS pausé — reprise');
          window.speechSynthesis.resume();
        }
      }, 250);
    }
  });
}

/** Découpe en phrases pour contourner le bug Chrome (utterance > ~15 s tronquée) */
function splitPhrases(text: string): string[] {
  return text.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean);
}

// ─── Synthèse vocale principale ───────────────────────────────────────────────
async function speakMessage(message: string, lang = 'fr-FR'): Promise<void> {
  if (!('speechSynthesis' in window)) return;
  if (IS_IOS) console.warn('⚠️ iOS: TTS nécessite un geste utilisateur récent');

  try {
    const wasSpeaking = window.speechSynthesis.speaking || window.speechSynthesis.pending;

    if (wasSpeaking) {
      window.speechSynthesis.cancel();
      // Attendre uniquement si quelque chose était en cours
      const cancelWait = IS_SAFARI ? 150 : 30;
      await new Promise(r => setTimeout(r, cancelWait));
    }
    // Si rien ne jouait → délai = 0, on parle immédiatement

    // Voix depuis cache (0 ms si preloadVoices() a déjà été appelé)
    const voice = _cachedVoice ?? pickBestFrenchVoice(await loadVoices());

    const browser = IS_SAMSUNG ? 'Samsung'
      : IS_CHROME  ? (IS_ANDROID ? 'Chrome/Android' : 'Chrome')
      : IS_FIREFOX ? 'Firefox'
      : IS_SAFARI  ? (IS_IOS ? 'Safari/iOS' : 'Safari/macOS')
      : 'Autre';
    console.log(`🗣️ TTS [${browser}] voix: ${voice?.name ?? 'défaut'} | "${message.slice(0, 60)}…"`);

    const needsChunks = IS_CHROME || IS_ANDROID || IS_SAMSUNG;
    const phrases     = needsChunks ? splitPhrases(message) : [message];

    for (let i = 0; i < phrases.length; i++) {
      if (!phrases[i]) continue;
      const utt = new SpeechSynthesisUtterance(phrases[i]);
      utt.lang   = lang;
      utt.rate   = IS_IOS ? 1.0 : 0.88;
      utt.pitch  = 1.0;
      utt.volume = 1.0;
      if (voice) utt.voice = voice;
      await speakUtterance(utt);
      if (i < phrases.length - 1) await new Promise(r => setTimeout(r, 50)); // inter-phrase minimal
    }

    console.log('✅ TTS terminé');
  } catch (e) {
    console.error('❌ speakMessage:', e);
  }
}

// ─── Vibration ────────────────────────────────────────────────────────────────
function vibrate(pattern: number[]): void {
  try { if ('vibrate' in navigator) navigator.vibrate(pattern); } catch {}
}

// ─── Notification navigateur (non-bloquante) ──────────────────────────────────
function showBrowserNotification(
  title: string,
  body: string,
  options?: Record<string, any>
): void {
  // Fire-and-forget — ne bloque jamais le son
  (async () => {
    try {
      if (!('Notification' in window)) return;
      if (Notification.permission === 'default') await Notification.requestPermission();
      if (Notification.permission !== 'granted') return;

      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready;
        await reg.showNotification(title, {
          body,
          icon:               '/logo-smartcabb.png',
          badge:              '/badge-smartcabb.png',
          vibrate:            [200, 100, 200],
          requireInteraction: true,
          tag:                options?.tag ?? 'smartcabb-notification',
          renotify:           true,
          data:               options?.data ?? {},
        });
        return;
      }
      new Notification(title, {
        body, icon: '/logo-smartcabb.png',
        tag:               options?.tag ?? 'smartcabb-notification',
        requireInteraction: true,
        ...options,
      });
    } catch (e) {
      console.warn('Notification navigateur:', e);
    }
  })();
}

// ─── API PUBLIQUE ─────────────────────────────────────────────────────────────

/**
 * Déclenche la notification complète : beep × 3 + TTS + vibration.
 * Beep et TTS démarrent en parallèle, zéro latence si tout est pré-chauffé.
 * Retourne une Promise qui se résout quand le TTS est terminé.
 */
export async function playRideNotification(rideDetails?: {
  passengerName?: string;
  pickup?: string;
  destination?: string;
  distance?: number;
  estimatedEarnings?: number;
}): Promise<void> {
  console.log('🚖 playRideNotification');

  // Beeps — 3×, espacés de 700 ms
  playNotificationBeep();
  setTimeout(() => playNotificationBeep(), 700);
  setTimeout(() => playNotificationBeep(), 1400);

  // Vibration
  vibrate([300, 100, 300, 100, 300]);

  // Message vocal (construit avec adresses courtes pour réduire la durée)
  let msg = 'Nouvelle course ! ';
  const pickup = rideDetails?.pickup;
  const dest   = rideDetails?.destination;
  if (pickup && pickup !== 'Point de départ') msg += `Départ : ${pickup}. `;
  if (dest   && dest   !== 'Destination')     msg += `Destination : ${dest}. `;
  msg += 'Confirmez vite.';

  // Notification navigateur — non-bloquante (fire-and-forget)
  const body = pickup && dest ? `${pickup} → ${dest}` : 'Nouvelle course disponible';
  showBrowserNotification('SmartCabb — Nouvelle Course 🚖', body, {
    tag: 'smartcabb-ride', renotify: true, data: rideDetails,
  });

  // TTS — awaité pour que la Promise se résolve quand la voix est terminée
  await speakMessage(msg, 'fr-FR').catch(e => console.error('TTS:', e));
}

/** Arrête tout (son + vibration) */
export function stopAllNotifications(): void {
  try { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); } catch {}
  try { navigator.vibrate(0); } catch {}
}

/** Demande la permission pour les notifications navigateur */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied')  return false;
  return (await Notification.requestPermission()) === 'granted';
}

/**
 * À appeler dès le montage du dashboard (une seule fois).
 * Pré-charge les voix + pré-chauffe AudioContext + pré-initialise le moteur TTS.
 * Réduit la latence du 1er message vocal de ~400 ms → ~30 ms.
 */
export function preloadVoices(): void {
  // 1. Pré-chauffer l'AudioContext
  warmUpAudioContext();

  // 2. Charger les voix et mettre en cache la meilleure voix française
  loadVoices().then(voices => {
    const voice = pickBestFrenchVoice(voices);
    _cachedVoice = voice;
    if (voice) {
      console.log(`✅ Voix pré-chargée : "${voice.name}" | ${voice.lang}`);
    } else {
      console.warn(`⚠️ Aucune voix fr (${voices.length} voix dispo) — voix système par défaut`);
    }

    // 3. Pré-chauffer le moteur TTS (élimine la latence d'init du 1er speak())
    warmUpTTSEngine(voice);
  });
}

/** Test complet */
export async function testNotification(): Promise<void> {
  playRideNotification({
    passengerName:     'Jean Mukendi',
    pickup:            'Avenue Kasavubu, Kinshasa',
    destination:       'Place Lumumba, Kinshasa',
    distance:          3.5,
    estimatedEarnings: 2500,
  });
}

// Alias rétro-compatibilité
export { playRideNotification as playRideNotificationSound };
