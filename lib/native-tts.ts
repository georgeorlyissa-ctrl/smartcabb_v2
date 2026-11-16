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
 */

import { Capacitor } from '@capacitor/core';

export function isNativeApp(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

// Moteur TTS considéré comme inutilisable (aucune langue ne fonctionne) :
// on arrête d'essayer à chaque course pour ne pas ralentir l'alerte.
let _nativeBroken = false;
// Langue qui a effectivement fonctionné (évite de retester à chaque appel).
let _preferredLang: string | null = null;

async function loadPlugin() {
  const mod = await import('@capacitor-community/text-to-speech');
  return mod.TextToSpeech;
}

/**
 * Parle avec le moteur TTS natif.
 *
 * Essaie la langue demandée puis des replis (`fr`, puis langue par défaut du
 * téléphone) : beaucoup d'appareils n'ont pas de voix `fr-FR` installée, et un
 * `speak()` avec une langue non supportée **rejette** — ce qui donnait
 * l'impression que « la sonnerie ne parle pas ».
 *
 * @returns `true` si la voix native a réellement été jouée, `false` s'il faut
 *          retomber sur `speechSynthesis` (web) ou renoncer.
 */
export async function nativeSpeak(
  text: string,
  opts?: { lang?: string; rate?: number; volume?: number }
): Promise<boolean> {
  if (!text || _nativeBroken || !isNativeApp()) return false;

  try {
    const TextToSpeech = await loadPlugin();

    const requested = opts?.lang ?? 'fr-FR';
    const candidates = _preferredLang
      ? [_preferredLang]
      : Array.from(new Set([requested, 'fr', ''])); // '' = langue par défaut

    let lastError: unknown = null;

    for (const lang of candidates) {
      try {
        // Coupe une éventuelle annonce précédente (sinon les phrases se cumulent).
        await TextToSpeech.stop().catch(() => {});

        await TextToSpeech.speak({
          text,
          ...(lang ? { lang } : {}),
          rate: opts?.rate ?? 0.95,
          pitch: 1.0,
          volume: opts?.volume ?? 1.0,
        });

        _preferredLang = lang || null;
        console.log(`✅ [TTS NATIF] annonce jouée (lang=${lang || 'défaut'})`);
        return true;
      } catch (e) {
        lastError = e;
        console.warn(`⚠️ [TTS NATIF] échec avec lang=${lang || 'défaut'}:`, e);
      }
    }

    throw lastError;
  } catch (e) {
    console.warn(
      '⚠️ [TTS NATIF] Aucune voix native disponible (moteur TTS Google absent ?):',
      e
    );
    // Une seule erreur loggée : on n'insiste pas à chaque course.
    _nativeBroken = true;
    return false;
  }
}

/** Interrompt immédiatement l'annonce vocale native. */
export async function nativeStopSpeak(): Promise<void> {
  if (!isNativeApp()) return;
  try {
    const TextToSpeech = await loadPlugin();
    await TextToSpeech.stop();
  } catch {}
}

/**
 * Pré-chauffe le moteur TTS (premier `speak()` beaucoup plus rapide) et vérifie
 * qu'une voix existe. Appelé au démarrage du tableau de bord chauffeur.
 */
export async function nativeTTSWarmup(): Promise<void> {
  if (_nativeBroken || !isNativeApp()) return;
  try {
    const TextToSpeech = await loadPlugin();
    const { languages } = await TextToSpeech.getSupportedLanguages();
    if (!Array.isArray(languages) || languages.length === 0) {
      // Moteur TTS absent : on laisse parler le système si possible.
      console.warn('⚠️ [TTS NATIF] Aucune langue TTS installée sur l’appareil');
      return;
    }
    if (!_preferredLang) {
      const fr = languages.find((l) => /^fr/i.test(l));
      _preferredLang = fr || null;
      console.log(
        `🔊 [TTS NATIF] moteur prêt — ${languages.length} langue(s), voix française: ${fr || 'aucune (repli système)'}`
      );
    }
  } catch (e) {
    console.warn('⚠️ [TTS NATIF] pré-chauffage impossible:', e);
  }
}

/**
 * Vérifie qu'une voix française est disponible sur l'appareil.
 * Sert au diagnostic (et à ouvrir l'installateur de voix si besoin).
 */
export async function nativeTTSCheck(): Promise<{
  available: boolean;
  languages?: string[];
}> {
  if (!isNativeApp()) return { available: false };
  try {
    const TextToSpeech = await loadPlugin();
    const { languages } = await TextToSpeech.getSupportedLanguages();
    return { available: languages.some((l) => /^fr/i.test(l)), languages };
  } catch {
    return { available: false };
  }
}
