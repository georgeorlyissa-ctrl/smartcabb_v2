import { Link } from '../lib/simple-router';
import { useState, useEffect, lazy, Suspense, useRef } from 'react';
import { motion } from '../lib/motion';
import { ProfessionalFooter } from '../components/ProfessionalFooter';
import { useLanguage } from '../contexts/LanguageContext';
import { LanguageSelector } from '../components/LanguageSelector';

const ChatWidget = lazy(() => import('../components/ChatWidget').then(module => ({ default: module.ChatWidget })));

// ─── Google Play Badge SVG inline ────────────────────────────
// `pulse` : conserve l'effet d'attention dans le bandeau de téléchargement ;
// désactivé dans le hero (rendu plus sobre, une seule animation d'entrée).
function PlayStoreBadge({ lang, pulse = false }: { lang: 'fr' | 'en'; pulse?: boolean }) {
  return (
    <a
      href="https://play.google.com/store/apps/details?id=com.smartcabb.app"
      target="_blank"
      rel="noopener noreferrer"
      className={`sc-store-badge${pulse ? ' sc-store-badge--pulse' : ''}`}
    >
      {/* Google Play logo */}
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M3.18 23.63c.37.2.8.22 1.19.07l12.5-7.22-2.8-2.8-10.89 9.95z" fill="#EA4335"/>
        <path d="M20.52 10.3L17.4 8.5l-3.12 3.12 3.12 3.12 3.14-1.81a1.63 1.63 0 000-2.63z" fill="#FBBC04"/>
        <path d="M3.18.37a1.63 1.63 0 00-.18.74v21.78c0 .26.06.5.18.74l.1.09 12.2-12.2v-.25L3.28.28l-.1.09z" fill="#4285F4"/>
        <path d="M14.37 11.62L3.18 23.63c.37.2.8.22 1.19.07l12.5-7.22-2.5-2.86z" fill="#34A853"/>
      </svg>
      <div style={{ textAlign: 'left' }}>
        <small>{lang === 'fr' ? 'Disponible sur' : 'Get it on'}</small>
        <strong>Google Play</strong>
      </div>
    </a>
  );
}

/**
 * AppStoreBadge — iPhone / iOS, pas encore publié.
 * Volontairement non cliquable : « Très bientôt sur l'App Store ».
 */
function AppStoreBadge({ lang }: { lang: 'fr' | 'en' }) {
  return (
    <div
      className="sc-store-badge sc-store-badge--soon"
      role="note"
      aria-label={
        lang === 'fr'
          ? "Application iPhone bientôt disponible sur l'App Store"
          : 'iPhone app coming soon to the App Store'
      }
    >
      <svg width="21" height="21" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M17.05 20.28c-.98.95-2.05.94-3.08.4-1.09-.55-2.08-.57-3.23 0-1.44.72-2.2.51-3.05-.4C3.79 15.25 4.6 7.66 9.05 7.4c1.1.06 1.87.62 2.56.66.93-.19 1.82-.76 2.82-.68 1.2.1 2.1.56 2.7 1.4-2.5 1.5-1.9 4.85.6 5.8-.57 1.5-1.3 2.98-2.68 4.7zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
      </svg>
      <div>
        <small>{lang === 'fr' ? 'Très bientôt' : 'Very soon'}</small>
        <strong>App Store</strong>
      </div>
      <span className="sc-store-soon-tag">iOS</span>
    </div>
  );
}

/**
 * Badge « bientôt disponible » pour le App Store.
 */
// Santé de l'IntersectionObserver : certains navigateurs / WebViews suspendent
// le rendu (frames gelées) et ne rappellent jamais l'observateur. On s'en sert
// comme filet de sécurité pour ne JAMAIS laisser une section invisible.
let ioHealthy = false;

function useInViewCustom(threshold = 0.15) {
  const ref = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const vh = () => window.innerHeight || document.documentElement.clientHeight;
    const visibleNow = () => {
      const r = el.getBoundingClientRect();
      return r.top < vh() * 0.92 && r.bottom > 0;
    };

    // Déjà à l'écran au montage : on affiche immédiatement (le CSS fait le fondu).
    if (visibleNow()) { setInView(true); return; }
    // Pas d'IntersectionObserver : tout est visible, aucune section bloquée.
    if (typeof IntersectionObserver === 'undefined') { setInView(true); return; }

    const obs = new IntersectionObserver(
      ([entry]) => {
        ioHealthy = true;
        if (entry.isIntersecting) { setInView(true); obs.disconnect(); }
      },
      { threshold, rootMargin: '0px 0px -6% 0px' }
    );
    obs.observe(el);

    // Repli si l'observateur reste muet (rendu suspendu) : on vérifie la position
    // réelle au premier défilement, puis on affiche au bout de 2,5 s.
    const onScroll = () => { if (visibleNow()) setInView(true); };
    window.addEventListener('scroll', onScroll, { passive: true, capture: true });
    const safety = window.setTimeout(() => { if (!ioHealthy) setInView(true); }, 2500);

    return () => {
      obs.disconnect();
      window.removeEventListener('scroll', onScroll, true);
      window.clearTimeout(safety);
    };
  }, [threshold]);
  return { ref, inView };
}

export function LandingPage() {
  const [activeSection, setActiveSection] = useState('home');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentBg, setCurrentBg] = useState(0);
  const [vehiculeIndex, setVehiculeIndex] = useState(0);
  const { t, language } = useLanguage();
  const backgrounds = [
    { src: '/hero-driver.jpg', position: 'center 32%' },
    { src: '/photo2_smartcabb.jpeg', position: 'center' },
    { src: '/fille_smartcabb.jpg', position: 'center' },
  ];

  const vehicules = ['/Stadard_5.png', '/TOYOTA NOAH_2.png', '/Confort_4.png'];

  const paymentMethods = [
    { src: '/logos/airtel-money.jpg', label: 'Airtel Money' },
    { src: '/logos/mpesa.png', label: 'M-Pesa' },
    { src: '/logos/orange-money.png', label: 'Orange Money' },
    { src: '/logos/logo-afrimoney.png', label: 'Afrimoney' },
    { src: '/logos/cash.png', label: 'Frais cash' },
  ];

  useEffect(() => {
    const preload = ['/photo_conducteur_smartcabb2026.jpeg', '/photo2_smartcabb.jpeg'];
    preload.forEach(src => {
      const link = document.createElement('link');
      link.rel = 'preload'; link.as = 'image'; link.href = src;
      document.head.appendChild(link);
    });
  }, []);

  useEffect(() => {
    const rafId = requestAnimationFrame(() => {
      const t1 = setInterval(() => setCurrentBg(p => (p + 1) % backgrounds.length), 4000);
      const t3 = setInterval(() => setVehiculeIndex(p => (p + 1) % vehicules.length), 3000);
      return () => { clearInterval(t1); clearInterval(t3); };
    });
    return () => cancelAnimationFrame(rafId);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const sections = ['home', 'how', 'why', 'trust', 'testimonials', 'africa', 'cta'];
      const current = sections.find(s => {
        const el = document.getElementById(s);
        if (el) { const r = el.getBoundingClientRect(); return r.top <= 100 && r.bottom >= 100; }
        return false;
      });
      if (current) setActiveSection(current);
    };
    window.addEventListener('scroll', handleScroll, { passive: true, capture: true });
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, []);

  useEffect(() => {
    const animateValue = (el: HTMLElement, target: number, suffix: string) => {
      let current = 0;
      const inc = target / 60;
      const timer = setInterval(() => {
        current += inc;
        if (current >= target) { el.textContent = target + suffix; clearInterval(timer); }
        else el.textContent = Math.floor(current) + suffix;
      }, 30);
    };
    document.querySelectorAll('.stat-number').forEach(stat => {
      const el = stat as HTMLElement;
      animateValue(el, parseInt(el.getAttribute('data-target') || '0'), el.getAttribute('data-suffix') || '');
    });
  }, []);

  const { ref: howRef, inView: howInView } = useInViewCustom(0.12);
  const { ref: whyRef, inView: whyInView } = useInViewCustom(0.12);
  const { ref: trustRef, inView: trustInView } = useInViewCustom(0.12);
  const { ref: testimonialsRef, inView: testimonialsInView } = useInViewCustom(0.12);
  const { ref: africaRef, inView: africaInView } = useInViewCustom(0.12);
  const { ref: ctaRef, inView: ctaInView } = useInViewCustom(0.2);
  const { ref: appRef, inView: appInView } = useInViewCustom(0.2);

  const steps = [
    { number: '01', image: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=600&h=400&fit=crop', title: t('how.step1.title'), description: t('how.step1.description'), isCarousel: false },
    { number: '02', image: vehicules[vehiculeIndex], title: t('how.step2.title'), description: t('how.step2.description'), isCarousel: true },
    { number: '03', image: '/fille_smartcabb.jpg', title: t('how.step3.title'), description: t('how.step3.description'), isCarousel: false },
  ];

  const africanCountries = [
    { code: 'cg', nameFR: 'Congo-Brazza', nameEN: 'Congo-Brazza', cityFR: 'Brazzaville', cityEN: 'Brazzaville' },
    { code: 'ao', nameFR: 'Angola', nameEN: 'Angola', cityFR: 'Luanda', cityEN: 'Luanda' },
    { code: 'rw', nameFR: 'Rwanda', nameEN: 'Rwanda', cityFR: 'Kigali', cityEN: 'Kigali' },
    { code: 'ke', nameFR: 'Kenya', nameEN: 'Kenya', cityFR: 'Nairobi', cityEN: 'Nairobi' },
    { code: 'cm', nameFR: 'Cameroun', nameEN: 'Cameroon', cityFR: 'Douala', cityEN: 'Douala' },
    { code: 'sn', nameFR: 'Senegal', nameEN: 'Senegal', cityFR: 'Dakar', cityEN: 'Dakar' },
    { code: 'ug', nameFR: 'Uganda', nameEN: 'Uganda', cityFR: 'Kampala', cityEN: 'Kampala' },
    { code: 'tz', nameFR: 'Tanzanie', nameEN: 'Tanzania', cityFR: 'Dar es Salaam', cityEN: 'Dar es Salaam' },
  ];

  const africaStats = [
    { val: '54', suf: language === 'fr' ? ' pays' : ' countries', labelFR: 'Pays africains ciblés', labelEN: 'African countries targeted' },
    { val: '1.4', suf: 'Md', labelFR: 'Personnes à connecter', labelEN: 'People to connect' },
    { val: '80', suf: '%', labelFR: 'Marché non couvert', labelEN: 'Uncovered market' },
    { val: '1', suf: language === 'fr' ? 'er' : 'st', labelFR: 'Réseau panafricain', labelEN: 'Pan-African network' },
  ];

  const ease: [number, number, number, number] = [0.22, 1, 0.36, 1];

  return (
    <div style={{ minHeight: '100vh', background: 'white' }}>
      <style>{`
        * { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif !important; }
        html { scroll-behavior: smooth; }

        .nav-link { font-size: 15px; font-weight: 500; color: #374151; transition: color 0.2s; text-decoration: none; }
        .nav-link:hover, .nav-link.active { color: #007AFF; }

        /* ── CTA section buttons ── */
        .btn-primary {
          display: inline-flex; align-items: center; justify-content: center;
          padding: 16px 36px; background: white; color: #007AFF;
          font-weight: 800; font-size: 16px; border-radius: 10px;
          transition: all 0.25s; text-decoration: none; cursor: pointer;
          white-space: nowrap; border: none;
        }
        .btn-primary:hover { background: #E0E0E0; transform: translateY(-3px); box-shadow: 0 12px 32px rgba(0,0,0,0.18); }

        .btn-secondary {
          display: inline-flex; align-items: center; justify-content: center;
          padding: 16px 36px; background: transparent; color: white;
          font-weight: 800; font-size: 16px; border-radius: 10px;
          border: 2px solid rgba(255,255,255,0.55); transition: all 0.25s;
          text-decoration: none; cursor: pointer; white-space: nowrap;
        }
        .btn-secondary:hover { background: rgba(255,255,255,0.12); border-color: white; transform: translateY(-3px); }

        /* ── Hero buttons ── */
        .btn-hero-primary {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 14px 28px; background: #007AFF; color: white;
          font-weight: 700; font-size: 15px; border-radius: 10px;
          transition: all 0.25s; text-decoration: none; cursor: pointer;
          box-shadow: 0 4px 14px rgba(8,145,178,0.3);
        }
        .btn-hero-primary:hover { background: #0e7490; transform: translateY(-2px); box-shadow: 0 10px 28px rgba(8,145,178,0.4); }

        .btn-hero-secondary {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 13px 28px; background: white; color: #007AFF;
          font-weight: 700; font-size: 15px; border-radius: 10px;
          border: 2px solid #e0f2fe; transition: all 0.25s;
          text-decoration: none; cursor: pointer;
        }
        .btn-hero-secondary:hover { background: #E0E0E0; border-color: #007AFF; transform: translateY(-2px); }

        /* ── Cards ── */
        .card {
          background: white; border: 1px solid #e5e7eb;
          border-radius: 18px; transition: all 0.3s cubic-bezier(0.22,1,0.36,1);
        }
        .card:hover {
          border-color: #bae6fd; box-shadow: 0 20px 56px rgba(8,145,178,0.1);
          transform: translateY(-6px);
        }

        .step-number { font-size: 80px; font-weight: 900; color: #E0E0E0; position: absolute; top: 12px; right: 16px; line-height: 1; user-select: none; }

        /* ── Reveal animations ── */
        .reveal { opacity: 0; transform: translateY(40px); transition: opacity 0.65s cubic-bezier(0.22,1,0.36,1), transform 0.65s cubic-bezier(0.22,1,0.36,1); }
        .reveal.in { opacity: 1; transform: translateY(0); }
        .reveal-left { opacity: 0; transform: translateX(-48px); transition: opacity 0.65s cubic-bezier(0.22,1,0.36,1), transform 0.65s cubic-bezier(0.22,1,0.36,1); }
        .reveal-left.in { opacity: 1; transform: translateX(0); }
        .reveal-right { opacity: 0; transform: translateX(48px); transition: opacity 0.65s cubic-bezier(0.22,1,0.36,1), transform 0.65s cubic-bezier(0.22,1,0.36,1); }
        .reveal-right.in { opacity: 1; transform: translateX(0); }

        .d0 { transition-delay: 0s; } .d1 { transition-delay: 0.07s; } .d2 { transition-delay: 0.14s; }
        .d3 { transition-delay: 0.21s; } .d4 { transition-delay: 0.28s; } .d5 { transition-delay: 0.36s; }
        .d6 { transition-delay: 0.44s; } .d7 { transition-delay: 0.52s; } .d8 { transition-delay: 0.6s; }

        /* ── Ticker paiements ── */
        @keyframes ticker { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .ticker-track { animation: ticker 14s linear infinite; width: max-content; display: flex; }
        .ticker-track:hover { animation-play-state: paused; }

        /* ── Dot animé carte Afrique ── */
        @keyframes ping-dot { 0%, 100% { transform: scale(1); opacity: 0.6; } 50% { transform: scale(1.8); opacity: 0; } }
        .ping-dot { animation: ping-dot 2s ease-out infinite; }

        /* ── Shimmer tag confiance ── */
        @keyframes shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
        .trust-tag {
          background: linear-gradient(90deg, #E0E0E0 25%, #bae6fd 50%, #E0E0E0 75%);
          background-size: 200% auto; animation: shimmer 3s linear infinite;
          display: inline-block; padding: 4px 14px; border: 1px solid #bae6fd;
          border-radius: 20px; font-size: 11px; font-weight: 700; color: #007AFF; margin-bottom: 20px;
          letter-spacing: 0.04em; text-transform: uppercase;
        }

        /* ── Pulse CTA ── */
        @keyframes pulseGlow { 0%, 100% { box-shadow: 0 0 0 0 rgba(255,255,255,0.35); } 50% { box-shadow: 0 0 0 16px rgba(255,255,255,0); } }
        .cta-glow { animation: pulseGlow 2.5s ease infinite; }

        /* ── Attraction CTA (Commander, Réserver, Chauffeur, App) : pulsation douce + halo */
        @keyframes ctaAttention {
          0%, 100% { transform: scale(1); box-shadow: 0 4px 14px rgba(0,122,255,0.35), 0 0 0 0 rgba(0,122,255,0.45); }
          50% { transform: scale(1.045); box-shadow: 0 8px 26px rgba(0,122,255,0.5), 0 0 0 14px rgba(0,122,255,0); }
        }
        .cta-attention { animation: ctaAttention 2.2s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .cta-attention, .cta-glow { animation: none; } }

        /* ── Particules hero ── */
        @keyframes floatP { 0%, 100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-20px) rotate(180deg); } }
        .particle { position: absolute; border-radius: 50%; background: rgba(8,145,178,0.1); pointer-events: none; }

        /* ── Pays Afrique ── */
        .country-card {
          display: flex; align-items: center; gap: 8px; padding: 8px 12px;
          background: white; border: 1px solid #e5e7eb; border-radius: 12px;
          transition: all 0.25s; min-width: 0;
        }
        .country-card:hover { border-color: #007AFF; box-shadow: 0 4px 16px rgba(8,145,178,0.12); transform: translateY(-2px); }

        .stat-box { padding: 20px; background: #E0E0E0; border: 1px solid #bae6fd; border-radius: 14px; transition: all 0.25s; }
        .stat-box:hover { background: #e0f2fe; transform: scale(1.03); box-shadow: 0 6px 20px rgba(8,145,178,0.12); }

        .accent-line { height: 4px; background: linear-gradient(90deg,#007AFF,#007AFF); border-radius: 2px; margin-bottom: 20px; max-width: 56px; }

        /* ── Section label ── */
        .section-eyebrow {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 11px; font-weight: 700; letter-spacing: 0.1em;
          text-transform: uppercase; color: #007AFF;
          background: #E0E0E0; border: 1px solid #bae6fd;
          padding: 5px 12px; border-radius: 20px; margin-bottom: 20px;
        }

        /* ── App download banner ── */
        .app-banner-card {
          background: linear-gradient(135deg, #222222 0%, #1e3a5f 50%, #007AFF 100%);
          border-radius: 24px; padding: 56px; position: relative; overflow: hidden;
        }
        .app-banner-card::before {
          content: ''; position: absolute; top: -60px; right: -60px;
          width: 280px; height: 280px; border-radius: 50%;
          background: rgba(255,255,255,0.04); pointer-events: none;
        }
        .app-banner-card::after {
          content: ''; position: absolute; bottom: -40px; left: 40px;
          width: 180px; height: 180px; border-radius: 50%;
          background: rgba(255,255,255,0.03); pointer-events: none;
        }

        /* ── Scrollbar custom ── */
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #f9fafb; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }

        /* ══════════════════════════════════════════════════════════════════
           EN-TÊTE — barre d'informations + navigation
           ══════════════════════════════════════════════════════════════════ */
        .sc-topbar { background: #0B2239; color: rgba(255,255,255,0.72); }
        .sc-topbar-inner {
          max-width: 1600px; margin: 0 auto; height: 36px; padding: 0 40px;
          display: flex; align-items: center; justify-content: space-between;
          font-size: 12px; letter-spacing: 0.01em;
        }
        .sc-topbar-group { display: flex; align-items: center; gap: 26px; }
        .sc-topbar-item { display: inline-flex; align-items: center; gap: 7px; }
        .sc-topbar a { color: inherit; text-decoration: none; transition: color .2s; }
        .sc-topbar a:hover { color: #fff; }
        .sc-nav-shell {
          background: rgba(255,255,255,0.98);
          -webkit-backdrop-filter: blur(16px); backdrop-filter: blur(16px);
          border-bottom: 1px solid #eef2f7;
          box-shadow: 0 2px 18px rgba(15,23,42,0.06);
        }
        .sc-nav-inner { max-width: 1600px; margin: 0 auto; padding: 0 40px; }

        /* ══════════════════════════════════════════════════════════════════
           HERO plein écran — photo de fond + overlay + titre centré
           ══════════════════════════════════════════════════════════════════ */
        .sc-hero {
          position: relative;
          display: flex; flex-direction: column; justify-content: center;
          min-height: 100dvh;
          padding: 172px 0 60px; /* 36 px barre d'infos + 74 px nav + respiration */
          overflow: hidden;
          background: #08192B;
          isolation: isolate;
        }
        .sc-hero-overlay {
          position: absolute; inset: 0; z-index: 1; pointer-events: none;
          background:
            linear-gradient(180deg, rgba(5,18,31,0.88) 0%, rgba(5,18,31,0.58) 34%, rgba(5,18,31,0.66) 70%, rgba(5,18,31,0.95) 100%),
            linear-gradient(115deg, rgba(0,86,140,0.55) 0%, rgba(4,24,42,0.25) 55%, rgba(0,40,70,0.45) 100%);
        }
        .sc-hero-copy {
          position: relative; z-index: 2;
          width: 100%; max-width: 1600px; margin: 0 auto; padding: 0 40px;
          text-align: center;
        }
        .sc-hero-eyebrow {
          display: inline-flex; align-items: center; gap: 10px;
          padding: 8px 18px; border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.22);
          background: rgba(255,255,255,0.07);
          -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px);
          color: rgba(255,255,255,0.9);
          font-size: 11.5px; font-weight: 600;
          letter-spacing: 0.16em; text-transform: uppercase;
        }
        .sc-hero-eyebrow::before {
          content: ''; width: 7px; height: 7px; border-radius: 50%;
          background: #FFCC00; box-shadow: 0 0 0 4px rgba(255,204,0,0.22);
        }
        .sc-hero-title {
          margin: 0 auto; max-width: 18ch;
          color: #fff; font-weight: 900;
          font-size: clamp(36px, 6vw, 76px);
          line-height: 1.02; letter-spacing: -0.035em;
        }
        .sc-hero-title em { font-style: normal; color: #5FB2FF; }
        .sc-hero-sub {
          margin: 24px auto 0; max-width: 660px;
          color: rgba(255,255,255,0.76);
          font-size: clamp(15px, 1.15vw, 18px);
          line-height: 1.65;
        }
        .sc-hero-actions {
          display: flex; flex-wrap: wrap; align-items: center; justify-content: center;
          gap: 14px; margin-top: 36px;
        }
        .sc-hero-btn {
          display: inline-flex; align-items: center; justify-content: center; gap: 9px;
          height: 52px; padding: 0 30px; border-radius: 10px;
          font-size: 15px; font-weight: 700; letter-spacing: 0;
          text-decoration: none; cursor: pointer;
          border: 1px solid transparent;
          transition: background .2s, border-color .2s, transform .2s, box-shadow .2s;
        }
        .sc-hero-btn-primary {
          background: #007AFF; color: #fff;
          box-shadow: 0 12px 30px rgba(0,122,255,0.35);
        }
        .sc-hero-btn-primary:hover { background: #0062CC; transform: translateY(-2px); box-shadow: 0 16px 34px rgba(0,122,255,0.45); }
        .sc-hero-btn-ghost {
          background: rgba(255,255,255,0.06); color: #fff;
          border-color: rgba(255,255,255,0.34);
          -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px);
        }
        .sc-hero-btn-ghost:hover { background: rgba(255,255,255,0.15); border-color: #fff; transform: translateY(-2px); }
        .sc-hero-btn-soft {
          background: #fff; color: #0B2239;
          box-shadow: 0 10px 26px rgba(0,0,0,0.18);
        }
        .sc-hero-btn-soft:hover { background: #eef4f9; transform: translateY(-2px); }

        /* Badges de téléchargement — Google Play + App Store (bientôt) */
        .sc-hero-stores {
          display: flex; flex-wrap: wrap; align-items: center; justify-content: center;
          gap: 12px; margin-top: 22px;
        }
        .sc-store-badge {
          display: inline-flex; align-items: center; gap: 10px;
          height: 52px; padding: 0 18px; border-radius: 10px;
          background: #222222; color: #fff; text-decoration: none;
          border: 1px solid rgba(255,255,255,0.14);
          transition: background .2s, transform .2s, box-shadow .2s;
        }
        .sc-store-badge:hover { background: #2f2f2f; transform: translateY(-2px); box-shadow: 0 10px 24px rgba(0,0,0,0.28); }
        .sc-store-badge--pulse { animation: ctaAttention 2.2s ease-in-out infinite; }
        .sc-store-badge small {
          display: block; font-size: 9px; line-height: 1.1; opacity: 0.68;
          letter-spacing: 0.06em; text-transform: uppercase;
        }
        .sc-store-badge strong { display: block; font-size: 14px; font-weight: 700; line-height: 1.25; }
        .sc-store-badge--soon {
          background: rgba(255,255,255,0.06);
          border-color: rgba(255,255,255,0.28);
          cursor: default;
        }
        .sc-store-badge--soon:hover { transform: none; box-shadow: none; background: rgba(255,255,255,0.06); }
        .sc-store-badge--soon strong { color: rgba(255,255,255,0.92); }
        .sc-store-soon-tag {
          margin-left: 2px; padding: 2px 7px; border-radius: 999px;
          background: rgba(255,204,0,0.16); color: #FFD84D;
          font-size: 9px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase;
          white-space: nowrap;
        }
        .sc-hero-actions a { min-height: 52px; }

        /* Ancre des sections : le header fixe (barre d'infos + nav) ne doit jamais
           recouvrir le titre de la section ciblée par « Comment ça marche », etc. */
        section[id] { scroll-margin-top: 118px; }
        .sc-hero-trust {
          margin-top: 30px;
          display: flex; flex-wrap: wrap; align-items: center; justify-content: center;
          gap: 10px 24px;
          color: rgba(255,255,255,0.62); font-size: 12.5px;
        }
        .sc-hero-trust b { color: #fff; font-weight: 700; }
        .sc-hero-trust span { display: inline-flex; align-items: center; gap: 7px; }
        .sc-hero-trust span + span::before {
          content: ''; width: 1px; height: 12px; margin-right: 17px;
          background: rgba(255,255,255,0.22);
        }
        .sc-hero-stats {
          position: relative; z-index: 2;
          width: 100%; max-width: 1040px; margin: 56px auto 0; padding: 0 40px;
          display: grid; grid-template-columns: repeat(3, 1fr);
          gap: 1px;
          background: rgba(255,255,255,0.14);
          border: 1px solid rgba(255,255,255,0.14);
          border-radius: 16px; overflow: hidden;
          -webkit-backdrop-filter: blur(14px); backdrop-filter: blur(14px);
        }
        .sc-hero-stat { background: rgba(7,23,40,0.55); padding: 22px 16px; text-align: center; }
        .sc-hero-stat b {
          display: block; color: #fff; font-weight: 900;
          font-size: clamp(22px, 2.4vw, 32px); line-height: 1.05; letter-spacing: -0.02em;
        }
        .sc-hero-stat small {
          display: block; margin-top: 5px;
          color: rgba(255,255,255,0.58);
          font-size: 11px; font-weight: 600;
          letter-spacing: 0.1em; text-transform: uppercase;
        }
        @media (max-width: 900px) {
          .sc-topbar { display: none; }
          .sc-nav-inner { padding: 0 20px; }
          .sc-hero { min-height: 92dvh; padding: 104px 0 44px; }
          .sc-hero-copy { padding: 0 20px; }
          .sc-hero-title { margin-top: 20px; font-size: clamp(32px, 9vw, 44px); max-width: 100%; }
          .sc-hero-sub { margin-top: 18px; font-size: 15px; }
          .sc-hero-actions { margin-top: 28px; gap: 10px; }
          .sc-hero-btn { height: 48px; padding: 0 22px; font-size: 14px; }
          .sc-hero-actions a { min-height: 48px; }
          .sc-hero-stores { margin-top: 18px; gap: 10px; }
          .sc-store-badge { height: 48px; padding: 0 14px; gap: 8px; border-radius: 9px; }
          .sc-store-badge strong { font-size: 13px; }
          .sc-store-badge small { font-size: 8.5px; }
          .sc-store-soon-tag { font-size: 8px; padding: 2px 6px; }
          section[id] { scroll-margin-top: 90px; }
          .sc-hero-trust { margin-top: 24px; font-size: 11.5px; gap: 8px 16px; }
          .sc-hero-trust span + span::before { display: none; }
          .sc-hero-stats { margin-top: 36px; padding: 0 20px; }
          .sc-hero-stat { padding: 16px 8px; }
          .sc-hero-stat small { font-size: 9.5px; letter-spacing: 0.06em; }
        }
      `}</style>

      {/* ═══════════════════ BARRE D'INFOS + NAV ═══════════════════ */}
      <motion.header
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.55, ease }}
        style={{ position: 'fixed', top: 0, width: '100%', zIndex: 50 }}>

        {/* Barre d'informations — desktop uniquement */}
        <div className="sc-topbar">
          <div className="sc-topbar-inner">
            <div className="sc-topbar-group">
              <span className="sc-topbar-item">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                Kinshasa, RDC
              </span>
              <span className="sc-topbar-item">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 2"/></svg>
                24h/24 — 7j/7
              </span>
              <a className="sc-topbar-item" href="tel:+243960624008">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h2.6a1 1 0 01.97.76l1 4a1 1 0 01-.29.96L7.6 10.4a15 15 0 006 6l1.68-1.68a1 1 0 01.96-.29l4 1A1 1 0 0121 16.4V19a2 2 0 01-2 2A17 17 0 013 5z"/></svg>
                +243 960 624 008
              </a>
            </div>
            <div className="sc-topbar-group">
              <span className="sc-topbar-item">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2"/><path strokeLinecap="round" d="M2 10h20"/></svg>
                Paiement Mobile Money &amp; cash
              </span>
              <span className="sc-topbar-item" style={{ color: '#7FD1A0' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path strokeLinecap="round" strokeLinejoin="round" d="M20 6L9 17l-5-5"/></svg>
                Chauffeurs vérifiés
              </span>
            </div>
          </div>
        </div>

        <nav className="sc-nav-shell">
          <div className="sc-nav-inner">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '74px' }}>
            <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', overflow: 'hidden', flexShrink: 0 }}>
                <img src="/logo-smartcabb.jpeg" alt="SmartCabb" width={40} height={40} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
              <span style={{ fontSize: '20px', fontWeight: '900', color: '#222222', letterSpacing: '-0.02em' }}>
                SMART<span style={{ color: '#007AFF' }}>CABB</span>
              </span>
            </Link>
            <div className="hidden lg:flex items-center" style={{ gap: '28px' }}>
              {[{ href: '#home', label: t('nav.home'), id: 'home' }, { href: '#how', label: t('nav.howItWorks'), id: 'how' }, { href: '#why', label: t('nav.whyUs'), id: 'why' }, { href: '#testimonials', label: t('nav.testimonials'), id: 'testimonials' }].map(item => (
                <a key={item.id} href={item.href} className={`nav-link ${activeSection === item.id ? 'active' : ''}`}>{item.label}</a>
              ))}
              <Link to="/contact" className="nav-link">{t('nav.contact')}</Link>
              <LanguageSelector />
              <Link to="/app/passenger" className="btn-hero-primary" style={{ padding: '10px 22px', fontSize: '14px' }}>{t('nav.login')}</Link>
            </div>
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="lg:hidden" style={{ padding: '8px', background: 'none', border: 'none', cursor: 'pointer' }}>
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#374151" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d={isMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
              </svg>
            </button>
          </div>
          {isMenuOpen && (
            <div style={{ padding: '16px 0', borderTop: '1px solid #f1f5f9' }}>
              {[{ href: '#home', label: t('nav.home') }, { href: '#how', label: t('nav.howItWorks') }, { href: '#why', label: t('nav.whyUs') }, { href: '#testimonials', label: t('nav.testimonials') }].map((item, i) => (
                <a key={i} href={item.href} onClick={() => setIsMenuOpen(false)} className="nav-link" style={{ display: 'block', padding: '10px 0' }}>{item.label}</a>
              ))}
              <Link to="/contact" onClick={() => setIsMenuOpen(false)} className="nav-link" style={{ display: 'block', padding: '10px 0' }}>{t('nav.contact')}</Link>
              <div style={{ padding: '10px 0' }}><LanguageSelector /></div>
              <Link to="/app/passenger" className="btn-hero-primary" style={{ display: 'block', textAlign: 'center', marginTop: '8px' }}>{t('nav.login')}</Link>
            </div>
          )}
        </div>
        </nav>
      </motion.header>

      {/* ═══════════════════ HERO PLEIN ÉCRAN ═══════════════════ */}
      <section id="home" className="sc-hero">
        {/* Photos de fond en fondu enchaîné */}
        {backgrounds.map((bg, i) =>
          currentBg === i || currentBg === (i + 1) % backgrounds.length ? (
            <div key={i} style={{
              position: 'absolute', inset: 0, zIndex: 0,
              backgroundImage: `url(${bg.src})`, backgroundSize: 'cover', backgroundPosition: bg.position,
              opacity: currentBg === i ? 1 : 0, transition: 'opacity 1.6s ease'
            }} />
          ) : null
        )}
        {/* Voile sombre — lisibilité du texte, photo toujours perceptible */}
        <div className="sc-hero-overlay" />

        <div className="sc-hero-copy">
          <motion.h1 className="sc-hero-title"
            initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12, duration: 0.7, ease }}>
            {language === 'fr'
              ? <>Votre trajet,<br /><em>votre choix.</em></>
              : <>Your ride,<br /><em>your choice.</em></>}
          </motion.h1>

          <motion.p className="sc-hero-sub"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.26, duration: 0.6 }}>
            {t('hero.description')}
          </motion.p>

          <motion.div className="sc-hero-actions"
            initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38, duration: 0.55 }}>
            <Link to="/commander" className="sc-hero-btn sc-hero-btn-primary">
              <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
              {t('hero.bookRide')}
            </Link>
            <Link
              to="/reserver"
              className="sc-hero-btn sc-hero-btn-soft"
              title={language === 'fr' ? 'Réserver — Familiale & Business' : 'Book — Family & Business'}
            >
              <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.9" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2.5"/><path strokeLinecap="round" d="M8 3v4M16 3v4M3 10h18M8 15h3"/></svg>
              {language === 'fr' ? 'Réserver votre chauffeur' : 'Book your driver'}
            </Link>
            <Link to="/app/driver/signup" className="sc-hero-btn sc-hero-btn-ghost">
              {t('hero.becomeDriver')}
            </Link>
          </motion.div>

          {/* Téléchargement — Google Play disponible, App Store très bientôt */}
          <motion.div className="sc-hero-stores"
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.48, duration: 0.5 }}>
            <PlayStoreBadge lang={language} />
            <AppStoreBadge lang={language} />
          </motion.div>

          <motion.div className="sc-hero-trust"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
            <span><b>4,9/5</b> {language === 'fr' ? 'note moyenne' : 'average rating'}</span>
            <span>{language === 'fr' ? 'Paiement M-Pesa, Orange Money, Airtel' : 'Pay with M-Pesa, Orange Money, Airtel'}</span>
            <span>{language === 'fr' ? 'Chauffeurs vérifiés' : 'Verified drivers'}</span>
          </motion.div>
        </div>

        {/* Bandeau de chiffres clés */}
        <motion.div className="sc-hero-stats"
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.75, duration: 0.6 }}>
          {[{ target: 150, suffix: '+', label: t('hero.activeDrivers') }, { target: 1000, suffix: '+', label: t('hero.happyClients') }, { target: 24, suffix: '/7', label: t('hero.available') }].map((s, i) => (
            <div key={i} className="sc-hero-stat">
              <b className="stat-number" data-target={s.target} data-suffix={s.suffix}>0</b>
              <small>{s.label}</small>
            </div>
          ))}
        </motion.div>
      </section>


      {/* ═══════════════════ COMMENT CA MARCHE ═══════════════════ */}
      <section id="how" ref={howRef as any} style={{ padding: '96px 0', background: 'white', borderTop: '1px solid #f1f5f9' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div style={{ marginBottom: '64px' }}>
            <div className={`accent-line reveal d1 ${howInView ? 'in' : ''}`} />
            <h2 className={`reveal d2 ${howInView ? 'in' : ''}`} style={{ fontSize: '42px', fontWeight: '900', color: '#222222', marginBottom: '16px', letterSpacing: '-0.02em' }}>
              {t('how.title1')} <span style={{ color: '#007AFF' }}>{t('how.title2')}</span>
            </h2>
            <p className={`reveal d3 ${howInView ? 'in' : ''}`} style={{ fontSize: '18px', color: '#64748b', maxWidth: '480px', lineHeight: 1.7 }}>{t('how.subtitle')}</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, i) => (
              <div key={i} className={`card reveal ${howInView ? 'in' : ''}`} style={{ overflow: 'hidden', position: 'relative', transitionDelay: `${0.18 + i * 0.18}s` }}>
                <div style={{ height: '230px', overflow: 'hidden', position: 'relative' }}>
                  <img src={step.image} alt={step.title} loading="lazy" width={600} height={230}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.6s cubic-bezier(0.22,1,0.36,1)', display: 'block' }}
                    onMouseOver={e => (e.currentTarget.style.transform = 'scale(1.07)')}
                    onMouseOut={e => (e.currentTarget.style.transform = 'scale(1)')}
                  />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(8,60,100,0.7) 0%, rgba(8,145,178,0.2) 60%, transparent 100%)' }} />
                  <div style={{ position: 'absolute', bottom: '16px', left: '20px', color: 'white', fontSize: '12px', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.9 }}>
                    {language === 'fr' ? 'Étape' : 'Step'} {step.number}
                  </div>
                  {step.isCarousel && (
                    <div style={{ position: 'absolute', bottom: '16px', right: '16px', display: 'flex', gap: '6px' }}>
                      {vehicules.map((_, j) => (
                        <button key={j} onClick={() => setVehiculeIndex(j)}
                          style={{ height: '5px', border: 'none', cursor: 'pointer', borderRadius: '3px', background: vehiculeIndex === j ? 'white' : 'rgba(255,255,255,0.4)', width: vehiculeIndex === j ? '20px' : '5px', transition: 'all 0.3s' }} />
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ padding: '28px', position: 'relative' }}>
                  <div className="step-number">{step.number}</div>
                  <div style={{ width: '32px', height: '3px', background: 'linear-gradient(90deg,#007AFF,#007AFF)', borderRadius: '2px', marginBottom: '14px' }} />
                  <h3 style={{ fontSize: '19px', fontWeight: '800', color: '#222222', marginBottom: '10px', lineHeight: 1.3 }}>{step.title}</h3>
                  <p style={{ fontSize: '14px', color: '#64748b', lineHeight: '1.65' }}>{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════ TÉLÉCHARGER L'APP — bandeau ═══════════════════ */}
      <section ref={appRef as any} style={{ padding: '80px 0', background: '#f0f0f0' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className={`app-banner-card reveal ${appInView ? 'in' : ''}`}>
            <div className="grid lg:grid-cols-2 gap-12 items-center" style={{ position: 'relative', zIndex: 1 }}>
              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '20px', padding: '5px 14px', marginBottom: '20px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.9)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    {language === 'fr' ? 'Nouvelle application' : 'New app'}
                  </span>
                </div>
                <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: '900', color: 'white', marginBottom: '16px', lineHeight: 1.15, letterSpacing: '-0.02em' }}>
                  {language === 'fr'
                    ? <>SmartCabb dans votre<br /><span style={{ color: '#7dd3fc' }}>poche, partout</span></>
                    : <>SmartCabb in your<br /><span style={{ color: '#7dd3fc' }}>pocket, everywhere</span></>}
                </h2>
                <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.75)', lineHeight: '1.7', marginBottom: '32px', maxWidth: '420px' }}>
                  {language === 'fr'
                    ? "Téléchargez l'application SmartCabb sur Google Play. Réservez un chauffeur en quelques secondes, suivez votre trajet en temps réel et payez via Mobile Money."
                    : "Download the SmartCabb app on Google Play. Book a driver in seconds, track your ride in real time and pay via Mobile Money."}
                </p>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <PlayStoreBadge lang={language} pulse />
                  <AppStoreBadge lang={language} />
                </div>
              </div>

              {/* Features de l'app */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                {[
                  { icon: '📍', titleFR: 'Suivi en direct', titleEN: 'Live tracking', descFR: 'GPS temps réel de votre chauffeur', descEN: 'Real-time GPS tracking' },
                  { icon: '💳', titleFR: 'Mobile Money', titleEN: 'Mobile Money', descFR: 'Airtel, Orange, M-Pesa, Afrimoney', descEN: 'Airtel, Orange, M-Pesa, Afrimoney' },
                  { icon: '🔔', titleFR: 'Notifications', titleEN: 'Notifications', descFR: 'Alertes instantanées sur chaque étape', descEN: 'Instant alerts at every step' },
                  { icon: '⭐', titleFR: 'Avis & notes', titleEN: 'Reviews', descFR: 'Évaluez chaque course facilement', descEN: 'Rate every ride easily' },
                ].map((f, i) => (
                  <div key={i} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '18px 16px', backdropFilter: 'blur(4px)' }}>
                    <div style={{ fontSize: '24px', marginBottom: '10px' }}>{f.icon}</div>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: 'white', marginBottom: '4px' }}>{language === 'fr' ? f.titleFR : f.titleEN}</div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>{language === 'fr' ? f.descFR : f.descEN}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════ POURQUOI ═══════════════════ */}
      <section id="why" ref={whyRef as any} style={{ padding: '96px 0', background: 'white', borderTop: '1px solid #f1f5f9' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            <div>
              <div className={`accent-line reveal-left d1 ${whyInView ? 'in' : ''}`} />
              <h2 className={`reveal-left d2 ${whyInView ? 'in' : ''}`} style={{ fontSize: '42px', fontWeight: '900', color: '#222222', marginBottom: '16px', letterSpacing: '-0.02em' }}>
                {t('why.title1')} <span style={{ color: '#007AFF' }}>{t('why.title2')}</span>
              </h2>
              <p className={`reveal-left d3 ${whyInView ? 'in' : ''}`} style={{ fontSize: '18px', color: '#64748b', marginBottom: '32px', maxWidth: '480px', lineHeight: 1.7 }}>{t('why.subtitle')}</p>
              <div className={`reveal-left d4 ${whyInView ? 'in' : ''}`}>
                <Link to="/commander" className="btn-hero-primary">{t('hero.bookRide')}</Link>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              {[t('why.fast'), t('why.secure'), t('why.affordable'), t('why.simple'), t('why.quality'), t('why.flexible'), t('why.reliable')].map((title, i) => {
                const descs = [t('why.fastDesc'), t('why.secureDesc'), t('why.affordableDesc'), t('why.simpleDesc'), t('why.qualityDesc'), t('why.flexibleDesc'), t('why.reliableDesc')];
                return (
                  <div key={i} className={`card reveal ${whyInView ? 'in' : ''}`} style={{ padding: '22px', transitionDelay: `${0.05 + i * 0.07}s` }}>
                    <div style={{ width: '28px', height: '3px', background: 'linear-gradient(90deg,#007AFF,#007AFF)', borderRadius: '2px', marginBottom: '12px' }} />
                    <div style={{ fontSize: '15px', fontWeight: '700', color: '#222222', marginBottom: '6px' }}>{title}</div>
                    <div style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.55' }}>{descs[i]}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════ CONFIANCE ═══════════════════ */}
      <section id="trust" ref={trustRef as any} style={{ padding: '96px 0', background: '#f0f0f0', borderTop: '1px solid #f1f5f9' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div style={{ marginBottom: '64px' }}>
            <div className={`accent-line reveal d1 ${trustInView ? 'in' : ''}`} />
            <h2 className={`reveal d2 ${trustInView ? 'in' : ''}`} style={{ fontSize: '42px', fontWeight: '900', color: '#222222', marginBottom: '16px', letterSpacing: '-0.02em' }}>
              {language === 'fr' ? 'Pourquoi nous ' : 'Why '}<span style={{ color: '#007AFF' }}>{language === 'fr' ? 'faire confiance ?' : 'trust us?'}</span>
            </h2>
            <p className={`reveal d3 ${trustInView ? 'in' : ''}`} style={{ fontSize: '18px', color: '#64748b', maxWidth: '480px', lineHeight: 1.7 }}>
              {language === 'fr' ? 'SmartCabb met la sécurité de chaque trajet au premier plan.' : 'SmartCabb puts the safety of every ride first.'}
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { titleFR: 'Chauffeurs vérifiés', titleEN: 'Verified drivers', descFR: 'Chaque chauffeur est vérifié, formé et noté. Vous voyez sa photo, son nom et sa plaque avant la course.', descEN: 'Each driver is verified, trained and rated. You see their photo, name and plate before the ride.', tagFR: '100% vérifiés', tagEN: '100% verified' },
              { titleFR: 'Suivi GPS en temps réel', titleEN: 'Real-time GPS tracking', descFR: "Partagez votre trajet à un proche d'un seul clic. Votre famille sait où vous êtes à tout moment.", descEN: 'Share your ride with a loved one in one click. Your family knows where you are at all times.', tagFR: 'Partage instantané', tagEN: 'Instant sharing' },
              { titleFR: "Bouton SOS d'urgence", titleEN: 'Emergency SOS button', descFR: "En cas de problème, notre bouton SOS alerte immédiatement notre équipe et vos contacts d'urgence.", descEN: 'Our SOS button immediately alerts our team and your emergency contacts.', tagFR: 'Disponible 24/7', tagEN: 'Available 24/7' },
            ].map((item, i) => (
              <div key={i} className={`card reveal ${trustInView ? 'in' : ''}`} style={{ padding: '36px', transitionDelay: `${0.1 + i * 0.15}s` }}>
                <div className="trust-tag">{language === 'fr' ? item.tagFR : item.tagEN}</div>
                <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#222222', marginBottom: '12px', lineHeight: 1.3 }}>{language === 'fr' ? item.titleFR : item.titleEN}</h3>
                <p style={{ fontSize: '14px', color: '#64748b', lineHeight: '1.7' }}>{language === 'fr' ? item.descFR : item.descEN}</p>
              </div>
            ))}
          </div>

          {/* Prix transparents + ticker paiements */}
          <div className={`reveal d5 ${trustInView ? 'in' : ''}`}
            style={{ marginTop: '52px', padding: '44px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '24px', boxShadow: '0 4px 24px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: '32px', marginBottom: '32px' }}>
              <div style={{ maxWidth: '480px' }}>
                <h3 style={{ fontSize: '26px', fontWeight: '800', color: '#222222', marginBottom: '10px', letterSpacing: '-0.01em' }}>
                  {language === 'fr' ? 'Prix transparents en Franc Congolais' : 'Transparent prices in Congolese Franc'}
                </h3>
                <p style={{ fontSize: '15px', color: '#64748b', lineHeight: '1.65' }}>
                  {language === 'fr' ? <span>Le prix est affiché <strong style={{ color: '#222222' }}>avant</strong> de confirmer. Zéro surprise.</span> : <span>The price is displayed <strong style={{ color: '#222222' }}>before</strong> confirming. Zero surprise.</span>}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                {[{ val: 'FC', sub: language === 'fr' ? 'Franc Congolais' : 'Congolese Franc', color: '#007AFF' }, { val: '0', sub: language === 'fr' ? 'Frais cachés' : 'Hidden fees', color: '#16a34a' }, { val: '100%', sub: 'Transparent', color: '#007AFF' }].map((b, i) => (
                  <div key={i} style={{ textAlign: 'center', padding: '16px 18px', border: '1px solid #e2e8f0', borderRadius: '14px', minWidth: '80px', transition: 'all 0.2s', cursor: 'default' }}
                    onMouseOver={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = '#007AFF'; el.style.transform = 'scale(1.06)'; el.style.boxShadow = '0 4px 16px rgba(8,145,178,0.12)'; }}
                    onMouseOut={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = '#e2e8f0'; el.style.transform = 'scale(1)'; el.style.boxShadow = 'none'; }}>
                    <div style={{ fontSize: '22px', fontWeight: '900', color: b.color }}>{b.val}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>{b.sub}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '28px' }}>
              <p style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#94a3b8', textAlign: 'center', marginBottom: '20px' }}>
                {language === 'fr' ? 'Modes de paiement acceptés' : 'Accepted payment methods'}
              </p>
              <div style={{ position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '56px', background: 'linear-gradient(to right, white, transparent)', zIndex: 1 }} />
                <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '56px', background: 'linear-gradient(to left, white, transparent)', zIndex: 1 }} />
                <div className="ticker-track">
                  {[...paymentMethods, ...paymentMethods].map((p, i) => (
                    <div key={i} style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 22px', border: '1px solid #f1f5f9', borderRadius: '10px', background: '#f0f0f0', marginRight: '14px' }}>
                      <img src={p.src} alt={p.label} loading="lazy" height={28} style={{ height: '28px', width: 'auto', objectFit: 'contain', display: 'block' }} onError={e => { e.currentTarget.style.display = 'none'; }} />
                      <span style={{ fontSize: '13px', fontWeight: '600', color: '#374151', whiteSpace: 'nowrap' }}>{p.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════ TÉMOIGNAGES ═══════════════════ */}
      <section id="testimonials" ref={testimonialsRef as any} style={{ padding: '96px 0', background: 'white', borderTop: '1px solid #f1f5f9' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div style={{ marginBottom: '64px' }}>
            <div className={`accent-line reveal d1 ${testimonialsInView ? 'in' : ''}`} />
            <h2 className={`reveal d2 ${testimonialsInView ? 'in' : ''}`} style={{ fontSize: '42px', fontWeight: '900', color: '#222222', marginBottom: '16px', letterSpacing: '-0.02em' }}>
              {t('testimonials.title1')} <span style={{ color: '#007AFF' }}>{t('testimonials.title2')}</span>
            </h2>
            <p className={`reveal d3 ${testimonialsInView ? 'in' : ''}`} style={{ fontSize: '18px', color: '#64748b', maxWidth: '480px', lineHeight: 1.7 }}>{t('testimonials.subtitle')}</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { name: t('testimonials.client1.name'), role: t('testimonials.client1.role'), text: t('testimonials.client1.text') },
              { name: t('testimonials.client2.name'), role: t('testimonials.client2.role'), text: t('testimonials.client2.text') },
              { name: t('testimonials.client3.name'), role: t('testimonials.client3.role'), text: t('testimonials.client3.text') },
              { name: t('testimonials.client4.name'), role: t('testimonials.client4.role'), text: t('testimonials.client4.text') },
            ].map((t2, i) => (
              <div key={i} className={`card reveal ${testimonialsInView ? 'in' : ''}`} style={{ padding: '28px', transitionDelay: `${0.08 + i * 0.12}s` }}>
                {/* Étoiles */}
                <div style={{ display: 'flex', gap: '3px', marginBottom: '16px' }}>
                  {[1,2,3,4,5].map(s => (
                    <svg key={s} width="14" height="14" viewBox="0 0 24 24" fill="#f59e0b">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                  ))}
                </div>
                <p style={{ fontSize: '14px', color: '#475569', lineHeight: '1.75', fontStyle: 'italic', marginBottom: '20px' }}>"{t2.text}"</p>
                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {/* Avatar initiale */}
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg,#007AFF,#007AFF)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ color: 'white', fontWeight: '700', fontSize: '13px' }}>{t2.name.charAt(0)}</span>
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#222222' }}>{t2.name}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>{t2.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Stats témoignages */}
          <div className={`reveal d6 ${testimonialsInView ? 'in' : ''}`}
            style={{ marginTop: '56px', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0', background: '#f0f0f0', borderRadius: '20px', border: '1px solid #f1f5f9', overflow: 'hidden' }}>
            {[{ val: '1000+', label: t('testimonials.reviews5Stars') }, { val: '98%', label: t('testimonials.satisfaction') }, { val: '4.9/5', label: t('testimonials.avgRating') }].map((s, i) => (
              <div key={i} style={{ textAlign: 'center', padding: '36px 48px', flex: '1 1 160px', borderRight: i < 2 ? '1px solid #f1f5f9' : 'none', transition: 'background 0.2s', cursor: 'default' }}
                onMouseOver={e => { (e.currentTarget as HTMLElement).style.background = '#E0E0E0'; }}
                onMouseOut={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                <div style={{ fontSize: '36px', fontWeight: '900', color: '#007AFF', letterSpacing: '-0.02em' }}>{s.val}</div>
                <div style={{ fontSize: '13px', color: '#64748b', marginTop: '6px', fontWeight: '500' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════ AFRIQUE ═══════════════════ */}
      <section id="africa" ref={africaRef as any} style={{ padding: '96px 0', background: '#f0f0f0', borderTop: '1px solid #f1f5f9' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div style={{ marginBottom: '64px' }}>
            <div className={`accent-line reveal d1 ${africaInView ? 'in' : ''}`} />
            <h2 className={`reveal d2 ${africaInView ? 'in' : ''}`} style={{ fontSize: '42px', fontWeight: '900', color: '#222222', marginBottom: '16px', letterSpacing: '-0.02em' }}>
              {language === 'fr' ? 'SmartCabb est présent en ' : 'SmartCabb is present in '}
              <span style={{ color: '#007AFF' }}>{language === 'fr' ? 'Afrique' : 'Africa'}</span>
            </h2>
          </div>
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className={`reveal-left ${africaInView ? 'in' : ''}`} style={{ position: 'relative' }}>
              <img src="/carte-afrique.png" alt="Carte Afrique" loading="lazy"
                style={{ width: '100%', height: 'auto', objectFit: 'contain', display: 'block' }}
                onError={e => { e.currentTarget.style.display = 'none'; }}
              />
              <div style={{ position: 'absolute', top: '52%', left: '55%' }}>
                <div style={{ position: 'relative' }}>
                  <div className="ping-dot" style={{ position: 'absolute', inset: '-10px', borderRadius: '50%', background: 'rgba(8,145,178,0.25)' }} />
                  <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#007AFF', border: '3px solid white', boxShadow: '0 4px 16px rgba(8,145,178,0.5)', position: 'relative', zIndex: 1 }} />
                  <div style={{ position: 'absolute', top: '22px', left: '50%', transform: 'translateX(-50%)', background: '#007AFF', color: 'white', fontSize: '11px', fontWeight: '700', padding: '4px 10px', borderRadius: '6px', whiteSpace: 'nowrap', zIndex: 2 }}>Kinshasa</div>
                </div>
              </div>
            </div>
            <div className={`reveal-right ${africaInView ? 'in' : ''}`}>
              <h3 style={{ fontSize: '36px', fontWeight: '900', color: '#222222', marginBottom: '20px', lineHeight: '1.15', letterSpacing: '-0.02em' }}>
                {language === 'fr' ? '1 pays actif,' : '1 active country,'}<br />
                <span style={{ color: '#007AFF' }}>{language === 'fr' ? '54 pays ciblés' : '54 countries targeted'}</span>
              </h3>
              <p style={{ fontSize: '16px', color: '#64748b', lineHeight: '1.75', marginBottom: '32px' }}>
                {language === 'fr' ? "Né à Kinshasa, SmartCabb ambitionne de connecter toute l'Afrique avec un transport sûr, abordable et local." : 'Born in Kinshasa, SmartCabb aims to connect all of Africa with safe, affordable and local transport.'}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px', marginBottom: '32px' }}>
                {africanCountries.map((p, i) => (
                  <div key={i} className="country-card" style={{ opacity: africaInView ? 1 : 0, transform: africaInView ? 'scale(1)' : 'scale(0.8)', transition: `all 0.4s cubic-bezier(0.22,1,0.36,1) ${0.2 + i * 0.05}s` }}>
                    <img src={`/flags/${p.code}.png`} alt={p.nameFR} width={28} height={18}
                      style={{ width: '28px', height: '18px', objectFit: 'cover', borderRadius: '3px', display: 'block', flexShrink: 0 }}
                    />
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: '#222222', lineHeight: '1.2' }}>{language === 'fr' ? p.nameFR : p.nameEN}</div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', lineHeight: '1.2' }}>{language === 'fr' ? p.cityFR : p.cityEN}</div>
                    </div>
                    <div style={{ padding: '2px 8px', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '4px', fontSize: '10px', fontWeight: '700', color: '#92400e' }}>{language === 'fr' ? 'Bientôt' : 'Soon'}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {africaStats.map((s, i) => (
                  <div key={i} className="stat-box" style={{ opacity: africaInView ? 1 : 0, transform: africaInView ? 'translateY(0)' : 'translateY(24px)', transition: `all 0.5s cubic-bezier(0.22,1,0.36,1) ${0.4 + i * 0.1}s` }}>
                    <div style={{ fontSize: '24px', fontWeight: '900', color: '#007AFF' }}>{s.val}<span style={{ fontSize: '16px' }}>{s.suf}</span></div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', fontWeight: '500' }}>{language === 'fr' ? s.labelFR : s.labelEN}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════ CTA FINAL ═══════════════════ */}
      <section id="cta" ref={ctaRef as any} style={{ padding: '96px 0', background: '#007AFF', position: 'relative', overflow: 'hidden' }}>
        {/* Formes décoratives */}
        <div style={{ position: 'absolute', top: '-100px', right: '-100px', width: '400px', height: '400px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-80px', left: '-80px', width: '300px', height: '300px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '40%', left: '40%', width: '200px', height: '200px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)', pointerEvents: 'none' }} />

        <div className="max-w-4xl mx-auto px-6" style={{ textAlign: 'center', position: 'relative' }}>
          <h2 className={`reveal d2 ${ctaInView ? 'in' : ''}`} style={{ fontSize: 'clamp(36px,5vw,52px)', fontWeight: '900', color: 'white', marginBottom: '20px', lineHeight: '1.12', letterSpacing: '-0.02em' }}>{t('cta.title')}</h2>
          <p className={`reveal d3 ${ctaInView ? 'in' : ''}`} style={{ fontSize: '18px', color: 'rgba(255,255,255,0.78)', marginBottom: '44px', lineHeight: '1.7', maxWidth: '520px', margin: '0 auto 44px' }}>{t('cta.subtitle')}</p>

          {/* ✅ Boutons CTA final — avec Play Store */}
          <div className={`reveal d4 ${ctaInView ? 'in' : ''}`} style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '44px' }}>
            <Link to="/app/passenger" className="btn-primary cta-glow">{t('cta.startNow')}</Link>
            <Link to="/app/driver/signup" className="btn-secondary">{t('cta.becomePartner')}</Link>
            {/* Play Store dans CTA */}
            <a
              href="https://play.google.com/store/apps/details?id=com.smartcabb.app"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '10px',
                padding: '15px 24px', background: 'rgba(255,255,255,0.12)',
                color: 'white', borderRadius: '10px', textDecoration: 'none',
                border: '2px solid rgba(255,255,255,0.35)', transition: 'all 0.25s', cursor: 'pointer', flexShrink: 0,
              }}
              onMouseOver={e => { const el = e.currentTarget as HTMLElement; el.style.background = 'rgba(255,255,255,0.2)'; el.style.transform = 'translateY(-2px)'; }}
              onMouseOut={e => { const el = e.currentTarget as HTMLElement; el.style.background = 'rgba(255,255,255,0.12)'; el.style.transform = 'translateY(0)'; }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M3.18 23.63c.37.2.8.22 1.19.07l12.5-7.22-2.8-2.8-10.89 9.95z" fill="white" opacity="0.9"/>
                <path d="M20.52 10.3L17.4 8.5l-3.12 3.12 3.12 3.12 3.14-1.81a1.63 1.63 0 000-2.63z" fill="white" opacity="0.9"/>
                <path d="M3.18.37a1.63 1.63 0 00-.18.74v21.78c0 .26.06.5.18.74l.1.09 12.2-12.2v-.25L3.28.28l-.1.09z" fill="white" opacity="0.9"/>
                <path d="M14.37 11.62L3.18 23.63c.37.2.8.22 1.19.07l12.5-7.22-2.5-2.86z" fill="white" opacity="0.9"/>
              </svg>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '10px', opacity: 0.7, lineHeight: 1 }}>{language === 'fr' ? 'Télécharger sur' : 'Download on'}</div>
                <div style={{ fontSize: '14px', fontWeight: '700', lineHeight: 1.3 }}>Google Play</div>
              </div>
            </a>
          </div>

          <div className={`reveal d5 ${ctaInView ? 'in' : ''}`} style={{ display: 'flex', justifyContent: 'center', gap: '14px', flexWrap: 'wrap' }}>
            {[{ label: t('cta.availableOn'), val: t('cta.iosAndroid') }, { label: t('cta.payment'), val: t('cta.cashMobile') }].map((b, i) => (
              <div key={i} style={{ padding: '14px 24px', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '12px', background: 'rgba(255,255,255,0.08)', transition: 'background 0.2s' }}
                onMouseOver={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.16)'; }}
                onMouseOut={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)'; }}>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginBottom: '4px' }}>{b.label}</div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: 'white' }}>{b.val}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <ProfessionalFooter />
      <Suspense fallback={null}><ChatWidget /></Suspense>
    </div>
  );
}
