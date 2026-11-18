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
 */

import { Capacitor } from '@capacitor/core';

export function isNativeApp(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

// Moteur TTS momentanément inutilisable : on marque une pause plutôt que de
// désactiver la voix pour toute la session (le moteur Android peut échouer
// ponctuellement : initialisation, autre app en train de parler, etc.).
let _nativeBroken = false;
let _nativeFailures = 0;
let _nativeCooldownUntil = 0;
// Langue qui a effectivement fonctionné (évite de retester à chaque appel).
let _preferredLang: string | null = null;
// Cache du test de présence du plugin (null = pas encore testé).
let _pluginChecked: boolean | null = null;

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

/** Vrai si la voix native peut être tentée (app native + plugin embarqué). */
function canUseNativeTTS(): boolean {
  if (_nativeBroken || !isNativeApp() || !ttsPluginAvailable()) return false;
  if (_nativeCooldownUntil && Date.now() < _nativeCooldownUntil) return false;
  return true;
}

/**
 * Parle avec le moteur TTS natif.
 *
 * Essaie la langue demandée puis des replis (`fr`, puis langue par défaut du
 * téléphone) : beaucoup d'appareils n'ont pas de voix `fr-FR` installée, et un
 * `speak()` avec une langue non supportée **rejette** — ce qui donnait
 * l'impression que « la sonnerie ne parle pas ».
 *
 * Ne rejette JAMAIS : retourne `false` s'il faut retomber sur la voix du
 * navigateur (web) ou renoncer.
 */
export async function nativeSpeak(
  text: string,
  opts?: { lang?: string; rate?: number; volume?: number }
): Promise<boolean> {
  if (!text || !canUseNativeTTS()) return false;

  try {
    const TextToSpeech = await loadPlugin();

    const requested = opts?.lang ?? 'fr-FR';
    // On garde la langue qui a marché, mais on retombe sur les autres si elle
    // échoue : un échec ponctuel ne doit pas priver le chauffeur de la voix.
    const candidates = Array.from(
      new Set([...(_preferredLang ? [_preferredLang] : []), requested, 'fr', ''])
    ); // '' = langue par défaut du téléphone

    let lastError: unknown = null;

    for (const lang of candidates) {
      try {
        // Coupe une éventuelle annonce précédente (sinon les phrases se cumulent).
        await TextToSpeech.stop().catch(() => {});
        // Certains moteurs TTS ignorent un `speak()` envoyé dans la même
        // milliseconde qu'un `stop()` : petite respiration = voix garantie.
        await new Promise((r) => setTimeout(r, 60));

        await TextToSpeech.speak({
          text,
          ...(lang ? { lang } : {}),
          rate: opts?.rate ?? 0.95,
          pitch: 1.0,
          volume: opts?.volume ?? 1.0,
        });

        _preferredLang = lang || null;
        _nativeFailures = 0;
        _nativeCooldownUntil = 0;
        console.log(`✅ [TTS NATIF] annonce jouée (lang=${lang || 'défaut'})`);
        return true;
      } catch (e) {
        lastError = e;
        console.warn(`⚠️ [TTS NATIF] échec avec lang=${lang || 'défaut'}:`, e);
        if (_preferredLang === lang) _preferredLang = null;
      }
    }

    throw lastError;
  } catch (e) {
    console.warn(
      '⚠️ [TTS NATIF] Aucune voix native disponible pour l’instant:',
      e
    );
    // Pause de 60 s après 2 échecs consécutifs : on ne désactive pas la voix
    // pour toute la session (l'erreur est souvent transitoire).
    _nativeFailures++;
    if (_nativeFailures >= 2) {
      _nativeFailures = 0;
      _nativeCooldownUntil = Date.now() + 60_000;
    }
    return false;
  }
}

/** Interrompt immédiatement l'annonce vocale native. Ne rejette jamais. */
export async function nativeStopSpeak(): Promise<void> {
  if (!canUseNativeTTS()) return;
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
  if (!canUseNativeTTS()) return;
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
  if (!canUseNativeTTS()) return { available: false };
  try {
    const TextToSpeech = await loadPlugin();
    const { languages } = await TextToSpeech.getSupportedLanguages();
    return { available: languages.some((l) => /^fr/i.test(l)), languages };
  } catch {
    return { available: false };
  }
}
