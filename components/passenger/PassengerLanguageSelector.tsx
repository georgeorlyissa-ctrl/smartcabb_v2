import { useState } from 'react';
import { useAppState } from '../../hooks/useAppState';
import { useTranslation } from '../../hooks/useTranslation';
import { toast } from '../../lib/toast';

/**
 * PassengerLanguageSelector
 * Sélecteur de langue compact (FR/EN) pour l'interface passager.
 * Affiche un bouton avec le drapeau et le code langue, et ouvre une bottom-sheet.
 */

interface PassengerLanguageSelectorProps {
  /** Affiche un bouton compact avec drapeau uniquement */
  compact?: boolean;
  /** Classes CSS additionnelles pour le bouton */
  className?: string;
}

export function PassengerLanguageSelector({
  compact = false,
  className = '',
}: PassengerLanguageSelectorProps) {
  const { setLanguage } = useAppState();
  const { t, language } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const languages: { code: 'fr' | 'en'; flag: string; name: string; nativeName: string }[] = [
    { code: 'fr', flag: '🇫🇷', name: t('french'), nativeName: 'Français' },
    { code: 'en', flag: '🇬🇧', name: t('english'), nativeName: 'English' },
  ];

  const current = languages.find((l) => l.code === language) ?? languages[0];

  const handleSelect = (code: 'fr' | 'en') => {
    setLanguage(code);
    localStorage.setItem('smartcabb_language', code);
    setIsOpen(false);
    toast.success(code === 'fr' ? '🇫🇷 Langue : Français' : '🇬🇧 Language: English');
  };

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white shadow-md border border-gray-100 transition-all hover:shadow-lg active:scale-95 ${className}`}
        style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}
        aria-label={t('switch_language')}
      >
        <span style={{ fontSize: 18 }}>{current.flag}</span>
        {!compact && (
          <span className="hidden sm:inline">{current.nativeName}</span>
        )}
        <span className="uppercase">{language}</span>
      </button>

      {/* Bottom-sheet modal */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          onClick={() => setIsOpen(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

          {/* Sheet */}
          <div
            className="relative w-full max-w-sm bg-white rounded-t-3xl p-6 pb-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: 'langSheetUp 0.25s ease-out' }}
          >
            {/* Handle */}
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-5" />

            <h3
              className="text-center mb-6"
              style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}
            >
              {t('switch_language')}
            </h3>

            <div className="space-y-3">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleSelect(lang.code)}
                  className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all"
                  style={{
                    background: language === lang.code ? '#EFF6FF' : '#F9FAFB',
                    border:
                      language === lang.code
                        ? '2px solid #3B82F6'
                        : '2px solid transparent',
                  }}
                >
                  <span style={{ fontSize: 32 }}>{lang.flag}</span>
                  <div className="flex-1 text-left">
                    <div
                      style={{ fontSize: 16, fontWeight: 600, color: '#111827' }}
                    >
                      {lang.nativeName}
                    </div>
                    <div style={{ fontSize: 13, color: '#6B7280' }}>{lang.name}</div>
                  </div>
                  {language === lang.code && (
                    <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="white"
                        strokeWidth={3}
                        className="w-3.5 h-3.5"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          <style>{`
            @keyframes langSheetUp {
              from { transform: translateY(100%); }
              to   { transform: translateY(0); }
            }
          `}</style>
        </div>
      )}
    </>
  );
}
