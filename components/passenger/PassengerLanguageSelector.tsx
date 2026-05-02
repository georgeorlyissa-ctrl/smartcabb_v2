import { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useAppState } from '../../hooks/useAppState';
import { useTranslation } from '../../hooks/useTranslation';
import { toast } from '../../lib/toast';

/**
 * PassengerLanguageSelector
 * ✅ FIX: Utilise ReactDOM.createPortal pour rendre le modal directement
 * dans document.body — évite les problèmes de z-index causés par les
 * contextes de stacking (motion.div, Card shadcn, transform CSS, etc.)
 */

interface PassengerLanguageSelectorProps {
  compact?: boolean;
  className?: string;
}

export function PassengerLanguageSelector({
  compact = false,
  className = '',
}: PassengerLanguageSelectorProps) {
  const { setLanguage } = useAppState();
  const { t, language } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const languages: { code: 'fr' | 'en'; flag: string; nativeName: string; name: string }[] = [
    { code: 'fr', flag: '🇫🇷', nativeName: 'Français', name: t('french') || 'French' },
    { code: 'en', flag: '🇬🇧', nativeName: 'English', name: t('english') || 'Anglais' },
  ];

  const current = languages.find((l) => l.code === language) ?? languages[0];

  const handleSelect = useCallback((code: 'fr' | 'en') => {
    setLanguage(code);
    try { localStorage.setItem('smartcabb_language', code); } catch {}
    setIsOpen(false);
    toast.success(code === 'fr' ? '🇫🇷 Langue : Français' : '🇬🇧 Language: English');
  }, [setLanguage]);

  const handleOpen = useCallback((e: React.MouseEvent) => {
    // Stopper la propagation pour éviter que le onClick de Card/parent se déclenche
    e.stopPropagation();
    setIsOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  // ✅ Modal rendu via Portal dans document.body
  // Cela contourne tous les contextes de stacking (transform, opacity, z-index parents)
  const modal = isOpen ? createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999, // Au-dessus de tout
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
      onClick={handleClose}
    >
      {/* Backdrop */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(2px)',
        }}
      />

      {/* Sheet */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 420,
          backgroundColor: 'white',
          borderRadius: '24px 24px 0 0',
          padding: '24px 24px 32px',
          boxShadow: '0 -4px 40px rgba(0,0,0,0.15)',
          animation: 'langSheetUp 0.25s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div style={{
          width: 40,
          height: 4,
          backgroundColor: '#d1d5db',
          borderRadius: 999,
          margin: '0 auto 20px',
        }} />

        <h3 style={{
          textAlign: 'center',
          fontSize: 18,
          fontWeight: 700,
          color: '#111827',
          marginBottom: 24,
        }}>
          {t('switch_language') || 'Changer de langue'}
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleSelect(lang.code)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: '16px',
                borderRadius: 16,
                background: language === lang.code ? '#EFF6FF' : '#F9FAFB',
                border: language === lang.code ? '2px solid #0891b2' : '2px solid transparent',
                cursor: 'pointer',
                transition: 'all 150ms',
              }}
            >
              <span style={{ fontSize: 32, lineHeight: 1 }}>{lang.flag}</span>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div style={{ fontSize: 16, fontWeight: 600, color: '#111827' }}>
                  {lang.nativeName}
                </div>
                <div style={{ fontSize: 13, color: '#6B7280' }}>
                  {lang.name}
                </div>
              </div>
              {language === lang.code && (
                <div style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  backgroundColor: '#0891b2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3} style={{ width: 14, height: 14 }}>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Bouton fermer */}
        <button
          onClick={handleClose}
          style={{
            width: '100%',
            marginTop: 16,
            padding: '12px',
            borderRadius: 16,
            background: '#F3F4F6',
            color: '#6B7280',
            fontSize: 14,
            fontWeight: 600,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          {language === 'fr' ? 'Annuler' : 'Cancel'}
        </button>
      </div>

      <style>{`
        @keyframes langSheetUp {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </div>,
    document.body // ✅ Rendu directement dans body, hors de tout contexte de stacking
  ) : null;

  return (
    <>
      {/* Bouton déclencheur */}
      <button
        onClick={handleOpen}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white shadow-md border border-gray-100 transition-all hover:shadow-lg active:scale-95 ${className}`}
        style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}
        aria-label={t('switch_language') || 'Changer la langue'}
      >
        <span style={{ fontSize: 18 }}>{current.flag}</span>
        {!compact && (
          <span className="hidden sm:inline">{current.nativeName}</span>
        )}
        <span className="uppercase">{language}</span>
      </button>

      {/* ✅ Modal via Portal — rendu dans document.body */}
      {modal}
    </>
  );
}
