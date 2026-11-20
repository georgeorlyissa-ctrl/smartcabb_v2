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
import { isNativeApp, nativeSpeak, nativeStopSpeak, nativeTTSWarmup } from './native-tts';

const _ua     = typeof navigator !== 'undefined' ? navigator.userAgent : '';
const IS_IOS     = /iPad|iPhone|iPod/.test(_ua) && !(window as any).MSStream;
const IS_SAFARI  = /^((?!chrome|android).)*safari/i.test(_ua) || (IS_IOS && /safari/i.test(_ua));
const IS_FIREFOX = /firefox\/\d/i.test(_ua);
const IS_CHROME  = /chrome\/\d/i.test(_ua) && !/edg(e|\/)|opr\//i.test(_ua);
const IS_ANDROID = /android/i.test(_ua);
const IS_SAMSUNG = /samsungbrowser/i.test(_ua);

// ─── AudioContext — singleton pré-chauffé ─────────────────────────────────────
let _audioCtx: AudioContext | null = null;
let _soundAllowed = true; // false (après stop) → les beeps en attente sont ignorés

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
  if (!_soundAllowed) return; // stop déjà demandé → beep ignoré
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

// ─── Sonnerie jouée par un FICHIER AUDIO (fiable en WebView) ─────────────────
//
// `AudioContext` peut rester bloqué dans la WebView tant qu'aucune interaction
// n'a eu lieu → sonnerie muette. Un élément <audio> alimenté par un WAV
// embarqué (data URI) est beaucoup plus fiable : Capacitor désactive
// l'exigence de geste utilisateur pour la lecture multimédia
// (`setMediaPlaybackRequiresUserGesture(false)`).
let _ringtoneEl: HTMLAudioElement | null = null;
let _ringtoneUri: string | null = null;
// La sonnerie DOIT-elle retentir ? (elle est ré-armée si l'app revient au
// premier plan ou si le navigateur/la WebView avait bloqué la lecture)
let _ringtoneWanted = false;

function encodeWavBase64(samples: Float32Array, sampleRate: number): string {
  const bytes = new Uint8Array(44 + samples.length * 2);
  const view = new DataView(bytes.buffer);
  const writeStr = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i));
  };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, samples.length * 2, true);

  let o = 44;
  for (let i = 0; i < samples.length; i++, o += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  let bin = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    const slice = bytes.subarray(i, i + CHUNK);
    bin += String.fromCharCode.apply(null, Array.prototype.slice.call(slice));
  }
  return `data:audio/wav;base64,${btoa(bin)}`;
}

/** Génère la sonnerie : 3 groupes « ding-dong » (880 Hz puis 1100 Hz). */
function buildRingtoneUri(): string {
  const sr = 22050;
  const totalSeconds = 3.2;
  const buf = new Float32Array(Math.ceil(sr * totalSeconds));

  const tone = (start: number, freq: number, dur: number, vol = 0.9) => {
    const s0 = Math.floor(start * sr);
    const n = Math.floor(dur * sr);
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      const env = Math.min(1, t / 0.015) * Math.pow(1 - t / dur, 1.6);
      const v = Math.sin(2 * Math.PI * freq * t) * vol * env;
      if (s0 + i < buf.length) buf[s0 + i] += v;
    }
  };

  for (let g = 0; g < 3; g++) {
    const base = g * 0.95;
    tone(base, 880, 0.18);
    tone(base + 0.20, 1100, 0.22);
  }

  return encodeWavBase64(buf, sr);
}

function getRingtoneElement(): HTMLAudioElement | null {
  try {
    if (typeof Audio === 'undefined') return null;
    if (!_ringtoneEl) {
      _ringtoneUri = _ringtoneUri || buildRingtoneUri();
      _ringtoneEl = new Audio(_ringtoneUri);
      _ringtoneEl.preload = 'auto';
      // Sonnerie en boucle : une course doit sonner tant qu'elle n'est pas
      // acceptée/refusée. `stopAllNotifications()` coupe la boucle.
      _ringtoneEl.loop = true;
      _ringtoneEl.volume = 0.8; // laisse la voix audible par-dessus
    }
    return _ringtoneEl;
  } catch {
    return null;
  }
}

// Repli WebAudio : la sonnerie doit aussi se répéter (sinon 1,5 s de son
// seulement, ce qui était perçu comme « pas de son »).
let _beepLoopTimer: ReturnType<typeof setInterval> | null = null;

function scheduleWebAudioBeeps(loop = true): void {
  playNotificationBeep();
  setTimeout(() => playNotificationBeep(), 700);
  setTimeout(() => playNotificationBeep(), 1400);
  if (!loop || _beepLoopTimer) return;
  _beepLoopTimer = setInterval(() => {
    if (!_soundAllowed) { stopBeepLoop(); return; }
    scheduleWebAudioBeeps(false);
  }, 2200);
}

function stopBeepLoop(): void {
  if (_beepLoopTimer) { clearInterval(_beepLoopTimer); _beepLoopTimer = null; }
}

/**
 * Joue la sonnerie de course. Repli WebAudio si la lecture du fichier est
 * refusée, avec nouvelle tentative au premier toucher de l'écran.
 */
export function playRideRingtone(): void {
  if (!_soundAllowed) return;
  _ringtoneWanted = true;

  const el = getRingtoneElement();
  if (!el) { scheduleWebAudioBeeps(); return; }

  try {
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') void ctx.resume().catch(() => {});
  } catch {}

  try {
    el.pause();
    el.currentTime = 0;
    const p = el.play();
    if (p && typeof p.then === 'function') {
      p.catch(() => {
        console.warn('⚠️ Sonnerie refusée par la WebView — repli WebAudio');
        scheduleWebAudioBeeps();
        const retry = () => {
          window.removeEventListener('pointerdown', retry);
          try { el.currentTime = 0; void el.play().catch(() => {}); } catch {}
        };
        window.addEventListener('pointerdown', retry, { once: true } as any);
      });
    }
  } catch {
    scheduleWebAudioBeeps();
  }
}

// ─── Cache voix TTS ───────────────────────────────────────────────────────────
/**
 * Identifiant de l'annonce en cours. Toute nouvelle annonce (ou un arrêt)
 * invalide les précédentes : une annonce lente ne doit ni reparler ni afficher
 * « voix indisponible » après que la course a été acceptée.
 */
let _announcementSeq = 0;

let _cachedVoices: SpeechSynthesisVoice[] | null = null;
let _cachedVoice:  SpeechSynthesisVoice  | null = null; // voix française sélectionnée
let _ttsWarmedUp = false;
/** iOS/Safari : la voix n'est autorisée qu'après un geste utilisateur. */
let _ttsUnlocked = false;
/** Minuterie d'annulation de l'utterance d'amorçage (voir `primeSpeechSynthesis`). */
let _primeTimer: number | null = null;
/** Nombre d'amorces tentées : on insiste sur les 1ers gestes (iOS est capricieux). */
let _primeAttempts = 0;

/**
 * 🔓 Débloque la synthèse vocale pendant un VRAI geste utilisateur.
 * iOS (Safari) refuse `speechSynthesis.speak()` tant qu'aucune utterance n'a
 * été lancée depuis un toucher : on en lance une quasi silencieuse ici.
 * À appeler uniquement depuis un handler `touch/click`.
 */
export function primeSpeechSynthesis(): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false;
  try {
    // Une annonce réelle est peut-être en train de parler : ne jamais l'amorcer
    // (le `cancel()` de l'amorce couperait la course en pleine annonce).
    if (window.speechSynthesis.speaking && !_primeTimer) {
      _ttsUnlocked = true;
      return true;
    }

    if (_primeTimer) { clearTimeout(_primeTimer); _primeTimer = null; }

    _primeAttempts++;
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    u.rate   = 2;
    u.lang   = 'fr-FR';
    window.speechSynthesis.speak(u);
    _ttsUnlocked = true;
    _primeTimer = window.setTimeout(() => {
      _primeTimer = null;
      // `speakMessage()` remet ce timer à zéro avant de parler : s'il tourne
      // encore ici, c'est qu'aucune vraie annonce n'a démarré entre-temps.
      try { window.speechSynthesis.cancel(); } catch {}
    }, 400);
    console.log('🔓 [TTS] synthèse vocale déverrouillée (geste utilisateur)');
    return true;
  } catch {
    return false;
  }
}

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
function speakUtterance(
  utt: SpeechSynthesisUtterance,
  timeoutMs = 14000,
  onStart?: () => void
): Promise<boolean> {
  return new Promise((resolve) => {
    let settled  = false;
    let started  = false;
    const done = () => { if (!settled) { settled = true; resolve(started); } };

    const guard = setTimeout(() => {
      console.warn('⚠️ TTS timeout utterance');
      done();
    }, timeoutMs);

    utt.onstart = () => {
      started = true;
      console.log('🗣️ TTS démarré');
      try { onStart?.(); } catch {}
    };
    utt.onend   = () => { clearTimeout(guard); done(); };
    utt.onerror = (e) => {
      clearTimeout(guard);
      if (e.error !== 'interrupted' && e.error !== 'canceled') {
        console.warn('⚠️ TTS error:', e.error);
      }
      done();
    };

    try { window.speechSynthesis.speak(utt); } catch (e) {
      console.warn('⚠️ TTS speak() a échoué:', e);
      done();
      return;
    }

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

// ─── Rejeu de l'annonce au prochain geste (iOS / navigateur strict) ───────────
let _pendingSpeech: string | null = null;
let _pendingGestureHooked = false;

function retrySpeechOnNextGesture(
  message: string,
  isCurrent?: () => boolean,
): void {
  _pendingSpeech = message;
  if (_pendingGestureHooked) return;
  _pendingGestureHooked = true;

  const handler = () => {
    window.removeEventListener('pointerdown', handler);
    window.removeEventListener('touchend', handler);
    _pendingGestureHooked = false;
    const pending = _pendingSpeech;
    _pendingSpeech = null;
    // `_soundAllowed === false` = course acceptée/refusée → on ne rejoue pas.
    if (!pending || !_soundAllowed) return;
    if (isCurrent && !isCurrent()) return;
    console.warn('🔁 [TTS] rejeu de l’annonce après geste utilisateur');
    primeSpeechSynthesis();
    void speakMessage(pending, 'fr-FR', { isCurrent });
  };

  window.addEventListener('pointerdown', handler, { once: true });
  window.addEventListener('touchend', handler, { once: true, passive: true } as any);
}

/** Découpe en phrases pour contourner le bug Chrome (utterance > ~15 s tronquée) */
function splitPhrases(text: string): string[] {
  return text.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean);
}

/**
 * Prévient l'interface que l'annonce vocale n'est pas disponible sur cet
 * appareil (téléphone sans moteur TTS / sans voix française). Le tableau de
 * bord chauffeur affiche alors une consigne discrète (une seule fois) au lieu
 * de laisser le conducteur croire que la voix est simplement coupée.
 */
function notifyVoiceUnavailable(reason: string) {
  try {
    window.dispatchEvent(new CustomEvent('smartcabb:voice-unavailable', { detail: { reason } }));
  } catch { /* ignore */ }
  console.warn('⚠️ [TTS] Voix indisponible sur cet appareil:', reason);
}

// ─── Synthèse vocale principale ───────────────────────────────────────────────
async function speakMessage(
  message: string,
  lang = 'fr-FR',
  hooks?: {
    onStart?: () => void;
    onEnd?: () => void;
    /** Annonce encore d'actualité ? (course pas acceptée / pas remplacée) */
    isCurrent?: () => boolean;
  }
): Promise<void> {
  // 1️⃣ APK / app native : `speechSynthesis` n'existe pas dans la WebView
  //    Android → on utilise le moteur TTS natif du téléphone.
  if (isNativeApp()) {
    let nativeSpoken = false;
    try {
      nativeSpoken = await nativeSpeak(message, { lang, rate: 0.95 });
      if (nativeSpoken) {
        console.log('✅ TTS natif terminé');
        // `nativeSpeak` résout à la FIN de l'annonce : on prévient l'UI que
        // la voix a bien démarré (le `finally` ci-dessous appellera onEnd).
        try { hooks?.onStart?.(); } catch {}
        return;
      }
    } catch (e) {
      // `nativeSpeak` ne rejette pas, mais on ne veut JAMAIS qu'une erreur de
      // voix fasse remonter une promesse non gérée jusqu'à l'overlay d'erreur.
      console.warn('⚠️ TTS natif indisponible:', e);
    }

    // Annonce annulée (course acceptée/refusée, ou remplacée par une autre) :
    // ce n'est PAS une panne de voix, on ne montre pas la consigne d'install.
    if (hooks?.isCurrent && !hooks.isCurrent()) return;

    // Repli : certaines WebView embarquent une synthèse vocale utilisable
    // (surtout sur iOS). On ne tente le coup que si des voix existent.
    let webVoices = 0;
    try {
      webVoices = ('speechSynthesis' in window) ? window.speechSynthesis.getVoices().length : 0;
    } catch { webVoices = 0; }

    if (webVoices === 0) {
      // Téléphone sans moteur TTS / sans voix : la sonnerie continue, la voix
      // non. On le signale à l'UI (consigne d'installation) et on rend la main
      // sans attendre 14 s (la sonnerie resterait coupée).
      notifyVoiceUnavailable('native_tts_unavailable');
      return;
    }
    console.warn('ℹ️ [TTS] Repli sur la voix de la WebView (TTS natif indisponible)');
  }

  if (!('speechSynthesis' in window)) {
    console.warn("⚠️ Aucune synthèse vocale disponible sur cet appareil");
    return;
  }
  if (!_ttsUnlocked && (IS_IOS || IS_ANDROID)) {
    console.warn('⚠️ TTS mobile non déverrouillé : un geste utilisateur est nécessaire');
  }

  try {
    // 0️⃣ Une amorce en attente ne doit jamais annuler la vraie annonce.
    if (_primeTimer) { clearTimeout(_primeTimer); _primeTimer = null; }

    const wasSpeaking = window.speechSynthesis.speaking || window.speechSynthesis.pending;

    if (wasSpeaking) {
      window.speechSynthesis.cancel();
      // Attendre uniquement si quelque chose était en cours
      const cancelWait = IS_SAFARI ? 150 : 30;
      await new Promise(r => setTimeout(r, cancelWait));
    }
    // Si rien ne jouait → délai = 0, on parle immédiatement

    // Voix depuis le cache uniquement : attendre `loadVoices()` ici retardait
    // l'annonce de plusieurs secondes sur mobile (et la sonnerie était coupée
    // pendant ce temps). `utt.lang` suffit à choisir une voix française.
    const voice = _cachedVoice ?? (_cachedVoices ? pickBestFrenchVoice(_cachedVoices) : null);

    const browser = IS_SAMSUNG ? 'Samsung'
      : IS_CHROME  ? (IS_ANDROID ? 'Chrome/Android' : 'Chrome')
      : IS_FIREFOX ? 'Firefox'
      : IS_SAFARI  ? (IS_IOS ? 'Safari/iOS' : 'Safari/macOS')
      : 'Autre';
    console.log(`🗣️ TTS [${browser}] voix: ${voice?.name ?? 'défaut'} | "${message.slice(0, 60)}…"`);

    const needsChunks = IS_CHROME || IS_ANDROID || IS_SAMSUNG;
    const phrases     = needsChunks ? splitPhrases(message) : [message];
    let   anyStarted  = false;
    let   hooksFired  = false;

    const fireStart = () => {
      if (hooksFired) return;
      hooksFired = true;
      try { hooks?.onStart?.(); } catch {}
    };

    for (let i = 0; i < phrases.length; i++) {
      if (!phrases[i]) continue;
      // Une nouvelle annonce a pris la main : on n'enchaîne pas les phrases.
      if (hooks?.isCurrent && !hooks.isCurrent()) return;
      const utt = new SpeechSynthesisUtterance(phrases[i]);
      utt.lang   = lang;
      utt.rate   = IS_IOS ? 1.0 : 0.88;
      utt.pitch  = 1.0;
      utt.volume = 1.0;
      if (voice) utt.voice = voice;
      const started = await speakUtterance(utt, 14000, fireStart);
      if (started) anyStarted = true;
      if (i < phrases.length - 1) await new Promise(r => setTimeout(r, 50)); // inter-phrase minimal
    }

    if (!anyStarted) {
      if (hooks?.isCurrent && !hooks.isCurrent()) return;
      console.warn('⚠️ TTS: aucune phrase n’a démarré — nouvel essai au prochain toucher');
      if (IS_IOS || IS_ANDROID || isNativeApp()) retrySpeechOnNextGesture(message, hooks?.isCurrent);
      return;
    }

    console.log('✅ TTS terminé');
  } catch (e) {
    console.error('❌ speakMessage:', e);
  } finally {
    try { hooks?.onEnd?.(); } catch {}
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
 * Adresse courte pour l'annonce vocale : une adresse complète de Kinshasa
 * peut durer 10–15 s et faisait dépasser le délai du moteur TTS (l'annonce
 * était alors coupée puis relancée → comportement « des fois ça parle »).
 */
function shortAddress(value?: string): string {
  const clean = (value || '').replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  if (clean.length <= 38) return clean;
  const cut = clean.slice(0, 38);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > 18 ? cut.slice(0, lastSpace) : cut).replace(/[,;:.\-–—]+$/, '').trim();
}

function buildRideAnnouncement(rideDetails?: {
  pickup?: string;
  destination?: string;
}): string {
  const pickup = shortAddress(rideDetails?.pickup);
  const dest = shortAddress(rideDetails?.destination);
  let msg = 'Nouvelle course SmartCabb.';
  if (pickup && pickup !== 'Point de départ') msg += ` Départ : ${pickup}.`;
  if (dest && dest !== 'Destination') msg += ` Destination : ${dest}.`;
  msg += ' Confirmez vite.';
  return msg;
}

/** Petite pause non bloquante. */
function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Déclenche la notification complète : sonnerie + TTS + vibration.
 * Retourne une Promise qui se résout quand la voix est terminée (la sonnerie,
 * elle, continue tant que la course n'est pas acceptée/refusée).
 */
export async function playRideNotification(rideDetails?: {
  passengerName?: string;
  pickup?: string;
  destination?: string;
  distance?: number;
  estimatedEarnings?: number;
}): Promise<void> {
  console.log('🚖 playRideNotification');
  _soundAllowed = true;
  _ringtoneWanted = true;
  // Identifie cette annonce : si elle est remplacée ou si la course est
  // acceptée entre-temps, elle ne doit ni continuer ni signaler une panne.
  const announcementId = ++_announcementSeq;
  const isCurrent = () => announcementId === _announcementSeq && _soundAllowed;

  // Une annonce précédente ne doit jamais se superposer à celle-ci (deux
  // courses rapprochées, ou test lancé pendant une vraie notification).
  // ⚠️ Côté natif, c'est `nativeSpeak()` qui annule la génération précédente :
  // appeler `nativeStopSpeak()` ici risquait de couper la NOUVELLE annonce
  // (l'arrêt natif asynchrone pouvait arriver après le début du speak).
  try { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); } catch {}

  // Sonnerie : fichier audio (3 ding-dong) + vibration
  playRideRingtone();
  vibrate([300, 100, 300, 100, 300]);

  // Message vocal (adresses bornées pour rester sous le délai du moteur TTS)
  const pickup = rideDetails?.pickup;
  const dest   = rideDetails?.destination;
  const msg    = buildRideAnnouncement({ pickup, destination: dest });

  // Notification navigateur — non-bloquante (fire-and-forget)
  const body = pickup && dest ? `${pickup} → ${dest}` : 'Nouvelle course disponible';
  showBrowserNotification('SmartCabb — Nouvelle Course 🚖', body, {
    tag: 'smartcabb-ride', renotify: true, data: rideDetails,
  });

  const isMobile = IS_IOS || IS_ANDROID || isNativeApp();
  if (!isMobile) {
    // TTS — awaité pour que la Promise se résolve quand la voix est terminée
    await speakMessage(msg, 'fr-FR', { isCurrent }).catch(e => console.error('TTS:', e));
    return;
  }

  // 📱 Mobile : sur Android la sonnerie et la voix peuvent se superposer
  // (streams média distincts) → on baisse seulement le volume de la sonnerie.
  // On ne la coupe plus : si le moteur TTS met 5 s à démarrer (ou échoue),
  // le chauffeur entendait auparavant un silence total après 0,8 s.
  // Sur iOS (web), un <audio> actif rend la voix muette → pause temporaire,
  // avec un filet de sécurité qui la rétablit si la voix ne démarre pas.
  const pauseForIOS = IS_IOS && !isNativeApp();
  const RING_VOLUME = 0.8;
  const DUCK_VOLUME = 0.3;
  let ducked = false;

  const duckRingtone = () => {
    if (ducked) return;
    try {
      if (_ringtoneEl && !_ringtoneEl.paused) {
        if (pauseForIOS) {
          _ringtoneEl.pause();
          console.log('🔇 Sonnerie en pause le temps de l’annonce (iOS)');
        } else {
          _ringtoneEl.volume = DUCK_VOLUME;
          console.log('🔉 Sonnerie baissée le temps de l’annonce');
        }
        ducked = true;
      }
    } catch {}
  };

  const restoreRingtone = (volume = RING_VOLUME) => {
    if (!_soundAllowed || !_ringtoneWanted) return;
    try {
      if (!_ringtoneEl) return;
      _ringtoneEl.volume = volume;
      if (_ringtoneEl.paused) void _ringtoneEl.play().catch(() => {});
    } catch {}
  };

  // Laisse entendre la sonnerie un instant avant l'annonce.
  await sleep(pauseForIOS ? 800 : 500);
  if (!_soundAllowed) { restoreRingtone(); return; }

  duckRingtone();

  // Filet de sécurité : si la voix n'a pas démarré au bout de 4 s (moteur TTS
  // lent/absent), on remonte partiellement la sonnerie au lieu de la laisser
  // étouffée ou coupée jusqu'à l'acceptation.
  const watchdog = setTimeout(() => restoreRingtone(0.5), 4_000);

  try {
    await speakMessage(msg, 'fr-FR', {
      isCurrent,
      onStart: () => clearTimeout(watchdog),
      onEnd: () => restoreRingtone(),
    }).catch(e => console.error('TTS:', e));
  } finally {
    clearTimeout(watchdog);
    restoreRingtone();
  }
}

/** Arrête tout (son + vibration) */
export function stopAllNotifications(): void {
  _soundAllowed = false;
  _ringtoneWanted = false;
  _announcementSeq++; // invalide toute annonce encore en cours
  stopBeepLoop();
  try {
    if (_ringtoneEl) {
      _ringtoneEl.pause();
      _ringtoneEl.currentTime = 0;
      _ringtoneEl.volume = 0.8; // la prochaine annonce repart à volume normal
    }
  } catch {}
  // Annule aussi toute annonce native en attente (moteur lent) : sans ça,
  // la voix pouvait repartir APRÈS l'acceptation de la course.
  void nativeStopSpeak();
  try {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  } catch {}
  try { navigator.vibrate(0); } catch {}
  try {
    // Coupe immédiatement les oscillateurs encore en lecture
    if (_audioCtx && _audioCtx.state === 'running') _audioCtx.suspend().catch(() => {});
  } catch {}
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

  // 2. Pré-générer la sonnerie (fichier WAV) pour un déclenchement instantané
  try { getRingtoneElement(); } catch {}

  // 3. App native : la voix est produite par le moteur TTS d'Android.
  //    `nativeTTSWarmup` vérifie qu'une voix existe et supprime la latence
  //    d'initialisation du premier `speak()`.
  if (isNativeApp()) {
    console.log('🔊 [SON] Voix native (TTS Android) + sonnerie fichier');
    void nativeTTSWarmup();
  }

  // 4. Charger les voix du navigateur et mettre en cache la meilleure voix fr
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

/**
 * 🔓 Déverrouillage audio mobile — À appeler au montage de l'app.
 * Sur téléphone, l'AudioContext et le TTS restent bloqués tant qu'aucun
 * geste utilisateur n'a eu lieu : on les (ré)active au premier toucher/clic,
 * sinon les sons d'arrivée restent muets alors qu'ils marchent sur PC.
 */
let _audioUnlockListenerAdded = false;
let _audioVisibilityListenerAdded = false;

export function unlockMobileAudio(): void {
  if (typeof window === 'undefined') return;
  const unlock = (fromGesture: boolean) => {
    try {
      warmUpAudioContext();
      const ctx = getAudioContext();
      if (ctx && ctx.state === 'suspended') {
        void ctx.resume().catch(() => {});
      }
      if ('speechSynthesis' in window) {
        try { window.speechSynthesis.getVoices(); } catch {}
        // iOS/Safari + Chrome Android : la synthèse vocale n'est autorisée
        // qu'après une interaction. On la débloque ici, pendant un vrai geste,
        // sinon la voix de la course reste muette (seul le bip sort).
        if (fromGesture && _primeAttempts < 3 && (IS_IOS || IS_ANDROID)) {
          primeSpeechSynthesis();
        }
      }
      // Amorcer l'élément <audio> pendant un vrai geste : certaines WebView
      // n'autorisent la lecture d'un média que s'il a déjà été lancé une fois
      // par l'utilisateur. On ne le fait pas si la sonnerie est en cours.
      const el = getRingtoneElement();
      if (el && el.paused) {
        const previousVolume = el.volume;
        try {
          el.volume = 0;
          const p = el.play();
          if (p && typeof p.then === 'function') {
            p.then(() => {
              el.pause();
              el.currentTime = 0;
              el.volume = previousVolume;
            }).catch(() => { el.volume = previousVolume; });
          } else {
            el.pause();
            el.currentTime = 0;
            el.volume = previousVolume;
          }
        } catch {
          el.volume = previousVolume;
        }
      }
      // Moteur TTS natif : premier appel = initialisation (long) → on le fait
      // pendant un geste plutôt qu'au moment de la course.
      if (isNativeApp()) void nativeTTSWarmup();
    } catch {}
  };
  try {
    if (!_audioUnlockListenerAdded) {
      _audioUnlockListenerAdded = true;
      const onGesture = () => unlock(true);
      window.addEventListener('touchend', onGesture, { passive: true } as any);
      window.addEventListener('click', onGesture);
    }
    // Retour au premier plan : la WebView a pu suspendre le média quand
    // l'écran s'est éteint. Si une course attend encore, on relance la
    // sonnerie (elle doit sonner jusqu'à l'acceptation).
    if (!_audioVisibilityListenerAdded) {
      _audioVisibilityListenerAdded = true;
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState !== 'visible') return;
        if (_soundAllowed && _ringtoneWanted) {
          try {
            const el = getRingtoneElement();
            if (el) {
              el.volume = 0.8;
              if (el.paused) void el.play().catch(() => {});
            }
          } catch {}
        }
        unlock(false);
      });
    }
    unlock(false); // appel au montage : pas de geste → aucune amorce TTS
  } catch {}
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

// ─── Sons passager (approche / arrivée du chauffeur) ─────────────────────────

function playToneSequence(frequencies: number[], noteDuration: number, gapMs: number, volume: number): void {
  if (!_soundAllowed) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const play = () => {
      const now = ctx.currentTime;
      const gap = gapMs / 1000;
      frequencies.forEach((freq, i) => {
        const start = now + i * (noteDuration + gap);
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(volume, start + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, start + noteDuration);
        osc.start(start); osc.stop(start + noteDuration + 0.02);
      });
    };

    if (ctx.state === 'suspended') {
      ctx.resume().then(play).catch(() => {});
    } else {
      play();
    }
  } catch (e) {
    console.error('Erreur son passager:', e);
  }
}

/** 🔔 Son d'approche passager — 2 notes douces et courtes (le chauffeur est à ~500 m) */
export function playPassengerApproachSound(): void {
  playToneSequence([659.25, 523.25], 0.22, 0.05, 0.35); // Mi → Do (doux)
}

/** 🚗 Son d'arrivée passager — 3 notes montantes distinctes + vibration (le chauffeur est là) */
export function playPassengerArrivedSound(): void {
  playToneSequence([523.25, 659.25, 783.99], 0.24, 0.07, 0.5); // Do → Mi → Sol (joyeux)
  try { navigator.vibrate([180, 90, 300]); } catch {}
}

/** 🗣️ Annonce vocale d'arrivée — sonnerie + voix "Votre conducteur est arrivé" */
export function announcePassengerArrived(): void {
  playPassengerArrivedSound();
  void speakMessage('Votre conducteur est arrivé.').catch(() => {});
}

/** ✅ Accusé de réception d'une réservation — son FORTE + voix + notification navigateur */
export function announceReservationReceived(details?: {
  dateStr?: string;
  timeStr?: string;
  categoryLabel?: string;
}): void {
  // Séquence dédiée plus forte et plus longue (volume 0.9, 4 notes)
  playToneSequence([523.25, 659.25, 783.99, 1046.5], 0.3, 0.08, 0.9);
  try { navigator.vibrate([250, 100, 250, 100, 400]); } catch {}
  const when = details?.dateStr && details?.timeStr
    ? ` pour ${details.dateStr} à ${details.timeStr}`
    : '';
  const cat = details?.categoryLabel ? ` en ${details.categoryLabel}` : '';
  void speakMessage(`SmartCabb a pris en compte votre réservation${cat}${when}. Merci de votre confiance.`).catch(() => {});
  showBrowserNotification(
    'SmartCabb — Réservation reçue ✅',
    `Votre réservation${cat}${when} est bien prise en compte.`,
    { tag: 'smartcabb-reservation', renotify: true, data: details ?? {} }
  );
}

// ─── 🚨 Alerte SOS (administrateurs) ─────────────────────────────────────────

/**
 * Note de sirène dédiée au SOS : onde carrée (plus agressive qu'un sinus) et
 * glissando descendant pour être immédiatement distinguée du bip de course.
 */
function playSosTone(frequency: number, startDelayMs: number, durationMs = 260, volume = 0.9): void {
  if (!_soundAllowed) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const play = () => {
      const start = ctx.currentTime + startDelayMs / 1000;
      const end = start + durationMs / 1000;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'square';
      osc.frequency.setValueAtTime(frequency, start);
      osc.frequency.exponentialRampToValueAtTime(Math.max(180, frequency / 1.6), end);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(volume, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, end);
      osc.start(start);
      osc.stop(end + 0.03);
    };

    if (ctx.state === 'suspended') {
      ctx.resume().then(play).catch(() => {});
    } else {
      play();
    }
  } catch (e) {
    console.error('Erreur son SOS:', e);
  }
}

/**
 * 🚨 Alarme SOS — sirène + vibration longue + notification navigateur + voix.
 * Utilisée par l'écran admin des urgences et le veilleur global.
 */
export function playSosAlarm(details?: {
  type?: string;
  role?: string;
  userName?: string;
  address?: string;
}): void {
  console.log('🚨 playSosAlarm');
  _soundAllowed = true;

  // 3 rafales de sirène (grave → aigu), espacées de 900 ms
  const burst = (offset: number) => {
    playSosTone(520, offset, 260, 0.9);
    playSosTone(780, offset + 300, 260, 0.9);
  };
  burst(0);
  burst(900);
  burst(1800);

  // Vibration insistante (mobile)
  vibrate([500, 120, 500, 120, 900]);

  const TYPE_LABELS: Record<string, string> = {
    medical: 'urgence médicale',
    security: 'problème de sécurité',
    accident: 'accident',
    harassment: 'harcèlement',
  };
  const who = details?.userName?.trim() || (details?.role === 'driver' ? 'un conducteur' : 'un passager');
  const reason = TYPE_LABELS[details?.type || ''] || 'urgence';
  const where = details?.address ? ` à ${details.address}` : '';
  const body = `${who} — ${reason}${where}`;

  // Notification navigateur non-bloquante (persistante : requireInteraction)
  showBrowserNotification('🚨 ALERTE SOS — SmartCabb', body, {
    tag: 'smartcabb-sos',
    renotify: true,
    data: details ?? {},
  });

  // Annonce vocale (ne bloque jamais l'alarme sonore)
  void speakMessage(
    `Alerte SOS. ${who} signale une ${reason}. Ouvrez le tableau de bord des urgences.`,
    'fr-FR',
  ).catch((e) => console.error('TTS SOS:', e));
}

// Alias rétro-compatibilité
export { playRideNotification as playRideNotificationSound };
