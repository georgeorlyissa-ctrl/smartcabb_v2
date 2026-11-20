/**
 * 🗣️ SYNTHÈSE VOCALE NATIVE — SmartCabb
 *
 * Pourquoi ce module ?
 *   La WebView Android **n'implémente pas** l'API `speechSynthesis` du
 *   navigateur : `window.speechSynthesis` est absent (ou renvoie 0 voix et
 *   ne dit rien). Résultat dans l'APK : la sonnerie de course sonnait mais
 *   **ne parlait pas**. La voix doit donc être produite par le moteur TTS
 *   natif d'Android, via le plugin `@capacitor-community/text-to-speech`.
 *
 * Sur le web classique (Chrome/Safari desktop et mobile), on continue
 * d'utiliser `speechSynthesis` : voir `speakMessage()` dans
 * `lib/notification-sound.ts`.
 *
 * ⚠️ Le plugin est NATIF : une app installée avant la version 1.6 ne le
 * contient pas. Tout appel y produirait une promesse rejetée
 * (`"TextToSpeech" plugin is not implemented on android`) qui déclenchait
 * l'overlay « Erreur détectée ». D'où le garde-fou `ttsPluginAvailable()`.
 *
 * 🔁 Fiabilité (« des fois ça marche, des fois non »)
 *   – Une nouvelle annonce **annule** proprement la précédente : un moteur
 *     lent ne peut plus reparler après l'acceptation de la course.
 *   – On ne teste plus 3 langues à la suite (3 × 15 s de silence) : si le
 *     moteur ne répond pas, on s'arrête tout de suite.
 *   – La langue réellement installée est retenue : plus d'essai inutile en
 *     `fr-FR` quand le téléphone n'a qu'une voix `fr-BE` ou anglaise.
 *   – Le pré-chauffage n'est plus relancé à chaque toucher de l'écran
 *     (il saturait le moteur juste au moment où la course arrivait).
 */

import { Capacitor } from '@capacitor/core';

export function isNativeApp(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

// Moteur TTS momentanément inutilisable : on marque une pause courte plutôt
// que de désactiver la voix pour toute la session (le moteur Android peut
// échouer ponctuellement : initialisation, autre app en train de parler, etc.).
let _nativeBroken = false;
let _nativeFailures = 0;
let _nativeCooldownUntil = 0;
// Langue qui a effectivement fonctionné (évite de retester à chaque appel).
let _preferredLang: string | null = null;
// Langues réellement installées sur l'appareil (renseigné au pré-chauffage).
let _supportedLangs: string[] | null = null;
// Cache du test de présence du plugin (null = pas encore testé).
let _pluginChecked: boolean | null = null;
// Jeton d'annulation : incrémenté à chaque nouvelle annonce / arrêt.
let _speechGeneration = 0;
// Pré-chauffage : au plus une fois toutes les 30 s.
let _lastWarmupAt = 0;
let _warmupInFlight: Promise<void> | null = null;

/**
 * Le plugin TTS est-il réellement embarqué dans l'APK ?
 *
 * `isPluginAvailable` lit la liste des plugins natifs déclarés par Capacitor :
 * il ne rejette jamais et ne déclenche aucun appel natif.
 */
function ttsPluginAvailable(): boolean {
  if (_pluginChecked !== null) return _pluginChecked;
  try {
    _pluginChecked = Capacitor.isPluginAvailable('TextToSpeech');
  } catch {
    _pluginChecked = false;
  }
  if (!_pluginChecked) {
    console.warn(
      '⚠️ [TTS NATIF] Plugin absent de cette version de l’app (APK < 1.6) — voix désactivée, sonnerie conservée'
    );
  }
  return _pluginChecked;
}

async function loadPlugin() {
  const mod = await import('@capacitor-community/text-to-speech');
  return mod.TextToSpeech;
}

/**
 * Course contre la montre autour d'un appel natif.
 *
 * ⚠️ Certains téléphones Android n'ont **aucun moteur TTS** : l'appel
 * `speak()`/`getSupportedLanguages()` ne répond alors JAMAIS (ni succès ni
 * erreur). Sans délai maximum, la promesse restait en attente pour toujours :
 * l'écran de diagnostic affichait « vérification… » et l'annonce vocale ne
 * partait pas. On tranche donc au bout de `ms`.
 */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error(`${label} : délai dépassé (${ms} ms) — moteur TTS absent ?`));
    }, ms);
    promise.then(
      (value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

/**
 * Les annonces sont courtes (message borné dans notification-sound.ts), mais
 * un moteur qui ne répond pas doit être abandonné vite : sinon la sonnerie
 * reste baissée et l'écran semble muet. Le texte est lu en ~1 s / 18 caractères.
 */
function speakTimeout(text: string): number {
  return Math.max(12_000, Math.min(20_000, 9_000 + text.length * 40));
}
/** Interrogation du moteur (langues, arrêt) : doit répondre vite. */
const ENGINE_TIMEOUT_MS = 3_000;

/** Vrai si la voix native peut être tentée (app native + plugin embarqué). */
function canUseNativeTTS(): boolean {
  if (_nativeBroken || !isNativeApp() || !ttsPluginAvailable()) return false;
  if (_nativeCooldownUntil && Date.now() < _nativeCooldownUntil) return false;
  return true;
}

/** Langue du téléphone (ex. « fr-FR »), utilisée comme repli. */
function systemLanguage(): string {
  try {
    const nav: any = typeof navigator !== 'undefined' ? navigator : null;
    return String(nav?.language || nav?.languages?.[0] || '').trim();
  } catch {
    return '';
  }
}

/**
 * Ordre des langues à essayer (2 maximum).
 *
 * – Si l'appareil a une voix française, on l'utilise en premier.
 * – S'il n'en a **aucune**, on parle avec la langue du téléphone (ou la 1re
 *   installée) : le texte français sera prononcé avec cet accent, mais au
 *   moins le chauffeur entend quelque chose (avant : silence total).
 * – On ne passe jamais une langue vide : le plugin la remplace par « en-US »
 *   et rejette si l'anglais n'est pas installé.
 */
function orderedLanguages(requested: string): string[] {
  const candidates: string[] = [];
  const push = (lang?: string | null) => {
    const value = (lang || '').trim();
    if (!value) return;
    const key = value.toLowerCase();
    if (!candidates.some((c) => c.toLowerCase() === key)) candidates.push(value);
  };

  if (_preferredLang) push(_preferredLang);

  const languages = _supportedLangs || [];
  if (languages.length > 0) {
    const findSupported = (tag: string) => {
      const key = (tag || '').toLowerCase();
      if (!key) return null;
      const base = key.split('-')[0];
      return (
        languages.find((l) => l.toLowerCase() === key) ||
        languages.find((l) => l.toLowerCase().split('-')[0] === base) ||
        null
      );
    };

    const fr =
      languages.find((l) => /^fr-fr/i.test(l)) ||
      languages.find((l) => /^fr/i.test(l)) ||
      null;

    if (fr) {
      push(fr);
    } else {
      // Aucune voix française installée : inutile de tester fr-FR/fr, elles
      // échoueraient. On parle avec la langue du téléphone (ou la 1re
      // installée) : le texte français sera prononcé avec cet accent, mais
      // le chauffeur entend l'annonce au lieu d'un silence.
      push(findSupported(systemLanguage()));
      push(languages[0]);
      return candidates.slice(0, 1);
    }

    // Repli si la voix française échoue : langue du téléphone, puis 1re
    // langue installée.
    push(findSupported(systemLanguage()));
    push(languages[0]);
    return candidates.slice(0, 2);
  }

  // Moteur pas encore prêt / langues inconnues : on tente la langue demandée
  // puis celle du téléphone. On ne passe jamais une langue vide : le plugin
  // la remplace par « en-US » et rejette si l'anglais n'est pas installé.
  push(requested);
  push(systemLanguage());
  return candidates.slice(0, 2);
}

/**
 * Parle avec le moteur TTS natif.
 *
 * Ne rejette JAMAIS : retourne `false` s'il faut retomber sur la voix du
 * navigateur (web) ou renoncer.
 */
export async function nativeSpeak(
  text: string,
  opts?: { lang?: string; rate?: number; volume?: number }
): Promise<boolean> {
  if (!text || !canUseNativeTTS()) return false;

  // Chaque annonce invalide les précédentes : si `stopAllNotifications()` a
  // été appelé entre-temps (course acceptée/refusée), on ne poursuit pas.
  const generation = ++_speechGeneration;
  const alive = () => generation === _speechGeneration;

  let lastError: unknown = null;
  let countAsFailure = false;
  let tts: any = null;

  try {
    tts = await loadPlugin();
    if (!alive()) return false;

    const requested = opts?.lang ?? 'fr-FR';
    const langs = orderedLanguages(requested);
    const timeout = speakTimeout(text);

    for (const lang of langs) {
      if (!alive()) return false;
      try {
        // ⚠️ Pas de `TextToSpeech.stop()` séparé ici : le plugin exécute déjà
        // `stop()` puis `speak(QUEUE_FLUSH)` dans le même appel natif. Un stop
        // JS supplémentaire pouvait couper l'annonce suivante sur certains
        // moteurs (Samsung notamment) et provoquer un silence intermittent.
        await withTimeout(
          TextToSpeech.speak({
            text,
            // Le plugin remplace une langue vide/absente par « en-US » et
            // rejette si elle n'est pas installée → on passe toujours une
            // langue réellement supportée (voir `orderedLanguages`).
            lang,
            rate: opts?.rate ?? 0.95,
            pitch: 1.0,
            volume: opts?.volume ?? 1.0,
          }),
          timeout,
          'TTS speak',
        );

        if (!alive()) return false;
        _preferredLang = lang || _preferredLang;
        _nativeFailures = 0;
        _nativeCooldownUntil = 0;
        console.log(`✅ [TTS NATIF] annonce jouée (lang=${lang})`);
        return true;
      } catch (e) {
        if (!alive()) return false;
        lastError = e;
        const message = String((e as any)?.message || e);
        const timedOut = /délai dépassé/i.test(message);
        const unsupported = /not supported/i.test(message);
        const notReady = /not yet initialized/i.test(message);

        console.warn(
          `⚠️ [TTS NATIF] échec avec lang=${lang}${timedOut ? ' (moteur muet)' : ''}:`,
          e,
        );
        if (_preferredLang === lang) _preferredLang = null;

        if (timedOut) {
          // Le moteur est bloqué : on le stoppe pour ne pas laisser une
          // annonce fantôme repartir plus tard, et on ne teste pas une 2e
          // langue (elle donnerait le même silence).
          try { await withTimeout(tts.stop(), ENGINE_TIMEOUT_MS, 'TTS stop') } catch {}
          countAsFailure = true;
          break;
        }
        if (unsupported) {
          // Liste de langues obsolète : on la rafraîchira au prochain
          // pré-chauffage. Ce n'est pas une panne du moteur.
          _supportedLangs = null;
          continue;
        }
        if (notReady) {
          // Moteur encore en cours d'initialisation : inutile de le mettre
          // en quarantaine, la prochaine annonce réessaiera.
          break;
        }
        countAsFailure = true;
      }
    }
  } catch (e) {
    lastError = e;
    countAsFailure = true;
  }

  if (!alive()) return false;

  console.warn('⚠️ [TTS NATIF] Aucune voix native disponible pour l’instant:', lastError);
  if (countAsFailure) {
    // Pause courte après 2 échecs consécutifs : l'erreur est souvent
    // transitoire et une pause de 60 s privait le chauffeur de voix sur
    // plusieurs courses d'affilée.
    _nativeFailures++;
    if (_nativeFailures >= 2) {
      _nativeFailures = 0;
      _nativeCooldownUntil = Date.now() + 12_000;
    }
  }
  return false;
}

/**
 * Interrompt immédiatement l'annonce vocale native. Ne rejette jamais.
 *
 * Incrémente le jeton AVANT l'arrêt : même si le moteur met 3 s à répondre,
 * aucune boucle d'annonce en attente ne pourra repartir ensuite.
 */
export async function nativeStopSpeak(): Promise<void> {
  _speechGeneration++;
  if (!isNativeApp() || !ttsPluginAvailable()) return;
  try {
    const TextToSpeech = await loadPlugin();
    await withTimeout(TextToSpeech.stop(), ENGINE_TIMEOUT_MS, 'TTS stop').catch(() => {});
  } catch {}
}

/**
 * Pré-chauffe le moteur TTS (premier `speak()` beaucoup plus rapide) et vérifie
 * qu'une voix existe. Appelé au démarrage du tableau de bord chauffeur.
 *
 * Throttlé : `unlockMobileAudio()` l'appelle à chaque geste ; sans limite, des
 * dizaines d'appels natifs pouvaient saturer le moteur au moment de la course.
 */
export async function nativeTTSWarmup(): Promise<void> {
  if (!canUseNativeTTS()) return;
  if (_warmupInFlight) return _warmupInFlight;
  // Throttle seulement si le pré-chauffage a réussi : tant qu'on ne connaît
  // pas les langues installées, on retente au geste suivant (sans spammer).
  if (_supportedLangs && _lastWarmupAt && Date.now() - _lastWarmupAt < 30_000) return;
  if (!_supportedLangs && _lastWarmupAt && Date.now() - _lastWarmupAt < 5_000) return;

  _lastWarmupAt = Date.now();
  _warmupInFlight = (async () => {
    try {
      const TextToSpeech = await loadPlugin();
      const { languages } = await withTimeout(
        TextToSpeech.getSupportedLanguages(),
        ENGINE_TIMEOUT_MS,
        'TTS langues',
      );
      if (!Array.isArray(languages) || languages.length === 0) {
        // Moteur TTS absent : on laisse parler le système si possible.
        console.warn('⚠️ [TTS NATIF] Aucune langue TTS installée sur l’appareil');
        return;
      }
      _supportedLangs = languages;
      const fr =
        languages.find((l) => /^fr-fr/i.test(l)) ||
        languages.find((l) => /^fr/i.test(l)) ||
        null;
      if (fr) _preferredLang = fr;
      console.log(
        `🔊 [TTS NATIF] moteur prêt — ${languages.length} langue(s), voix française: ${fr || 'aucune (repli système)'}`
      );
    } catch (e) {
      console.warn('⚠️ [TTS NATIF] pré-chauffage impossible:', e);
    } finally {
      _warmupInFlight = null;
    }
  })();

  return _warmupInFlight;
}

/**
 * Vérifie qu'une voix française est disponible sur l'appareil.
 * Sert au diagnostic (et à ouvrir l'installateur de voix si besoin).
 *
 * Ne dépend PAS du cooldown : un diagnostic doit toujours pouvoir répondre.
 */
export async function nativeTTSCheck(): Promise<{
  available: boolean;
  languages?: string[];
  /** `plugin_absent` | `engine_timeout` | `error` — pour guider l'utilisateur. */
  reason?: 'plugin_absent' | 'engine_timeout' | 'error';
}> {
  if (!isNativeApp() || !ttsPluginAvailable()) {
    return { available: false, reason: 'plugin_absent' };
  }
  try {
    const TextToSpeech = await loadPlugin();
    const { languages } = await withTimeout(
      TextToSpeech.getSupportedLanguages(),
      ENGINE_TIMEOUT_MS,
      'TTS langues',
    );
    if (Array.isArray(languages) && languages.length > 0) {
      _supportedLangs = languages;
      const fr = languages.find((l) => /^fr/i.test(l));
      if (fr && !_preferredLang) _preferredLang = fr;
    }
    return { available: languages.some((l) => /^fr/i.test(l)), languages };
  } catch (e: any) {
    const timedOut = /délai dépassé/i.test(String(e?.message || e));
    return { available: false, reason: timedOut ? 'engine_timeout' : 'error' };
  }
}
