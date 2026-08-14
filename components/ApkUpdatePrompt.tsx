/**
 * 📲 APK UPDATE PROMPT — SMARTCABB
 *
 * Détecte une nouvelle version de l'APK au démarrage (WebView Capacitor)
 * en interrogeant GET /app/version (backend). Si la version distante est
 * différente de la version installée, affiche un prompt de mise à jour.
 *
 * ⚠️ Ne s'active que dans l'APK natif (bridge Capacitor présent) :
 * sur le web classique, ce composant ne fait rien.
 */

import { useEffect, useState } from 'react';
import { App } from '@capacitor/app';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface AppVersionConfig {
  version: string;
  versionCode?: number;
  apkUrl: string;
  message?: string;
  force?: boolean;
  updatedAt?: string;
}

const DISMISS_KEY = 'sc_apk_update_dismissed';

export function ApkUpdatePrompt() {
  const [config, setConfig] = useState<AppVersionConfig | null>(null);
  const [installedVersion, setInstalledVersion] = useState<string | null>(null);

  useEffect(() => {
    // ✅ Uniquement dans l'app native (APK Capacitor)
    const isNative =
      typeof window !== 'undefined' &&
      !!(window as any).Capacitor?.isNativePlatform?.() &&
      ((window as any).Capacitor.isNativePlatform() || (window as any).Capacitor.getPlatform() === 'android');

    if (!isNative) return;

    let cancelled = false;

    const check = async () => {
      try {
        const info = await App.getInfo();
        if (cancelled) return;
        setInstalledVersion(info.versionName || null);

        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/app/version`,
          { headers: { Authorization: `Bearer ${publicAnonKey}` } }
        );
        if (!response.ok) return;
        const data = await response.json();
        if (cancelled || !data?.success || !data?.apkUrl || !data?.version) return;

        // Version locale identique → à jour
        if (info.versionName === data.version) return;

        // Déjà refusé dans cette session (sauf mise à jour forcée)
        if (!data.force) {
          try {
            const dismissed = sessionStorage.getItem(DISMISS_KEY);
            if (dismissed === data.version) return;
          } catch {}
        }

        setConfig(data);
      } catch (error) {
        console.debug('🔇 [APK Update] Vérification impossible:', error);
      }
    };

    check();

    return () => { cancelled = true; };
  }, []);

  if (!config) return null;

  const handleDownload = () => {
    // Ouvre le lien dans le navigateur système (ACTION_VIEW → téléchargement)
    window.open(config.apkUrl, '_system');
  };

  const handleLater = () => {
    try { sessionStorage.setItem(DISMISS_KEY, config.version); } catch {}
    setConfig(null);
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-4">
          <h3 className="text-lg font-bold text-white">📲 Nouvelle version disponible</h3>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-700">
            {config.message || 'Une nouvelle version de SmartCabb est disponible. Téléchargez-la pour profiter des dernières améliorations.'}
          </p>

          <div className="flex items-center justify-between text-xs text-gray-500 bg-gray-50 rounded-xl px-3 py-2">
            <span>
              Installée : <strong className="text-gray-800">{installedVersion || '?'}</strong>
            </span>
            <span>
              Nouvelle : <strong className="text-blue-600">{config.version}</strong>
            </span>
          </div>

          <div className="flex gap-3">
            {!config.force && (
              <button
                onClick={handleLater}
                className="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-700 text-sm font-medium active:scale-95 transition-transform"
              >
                Plus tard
              </button>
            )}
            <button
              onClick={handleDownload}
              className={`flex-1 py-2.5 rounded-xl text-white text-sm font-semibold active:scale-95 transition-transform ${config.force ? 'w-full' : ''}`}
              style={{ background: 'linear-gradient(90deg, #2563eb, #06b6d4)' }}
            >
              Télécharger
            </button>
          </div>
          {config.force && (
            <p className="text-xs text-center text-red-500">
              Cette mise à jour est obligatoire pour continuer à utiliser l'application.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}