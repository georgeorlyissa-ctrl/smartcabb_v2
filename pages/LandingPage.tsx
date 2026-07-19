import { Link } from '../lib/simple-router';
import { useState, useEffect, lazy, Suspense, useRef } from 'react';
import { motion } from '../lib/motion';
import { ProfessionalFooter } from '../components/ProfessionalFooter';
import { useLanguage } from '../contexts/LanguageContext';
import { LanguageSelector } from '../components/LanguageSelector';

const ChatWidget = lazy(() => import('../components/ChatWidget').then(module => ({ default: module.ChatWidget })));

// ─── Google Play Badge SVG inline ────────────────────────────
function PlayStoreBadge({ lang }: { lang: 'fr' | 'en' }) {
  return (
    <a
      href="https://play.google.com/store/apps/details?id=com.smartcabb.app"
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '10px',
        padding: '11px 20px', background: '#222222', color: 'white',
        borderRadius: '10px', textDecoration: 'none', border: '1.5px solid rgba(255,255,255,0.08)',
        transition: 'all 0.22s', cursor: 'pointer', flexShrink: 0,
      }}
      onMouseOver={e => { const el = e.currentTarget as HTMLElement; el.style.background = '#1f2937'; el.style.transform = 'translateY(-2px)'; el.style.boxShadow = '0 8px 24px rgba(0,0,0,0.25)'; }}
      onMouseOut={e => { const el = e.currentTarget as HTMLElement; el.style.background = '#222222'; el.style.transform = 'translateY(0)'; el.style.boxShadow = 'none'; }}
    >
      {/* Google Play logo */}
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M3.18 23.63c.37.2.8.22 1.19.07l12.5-7.22-2.8-2.8-10.89 9.95z" fill="#EA4335"/>
        <path d="M20.52 10.3L17.4 8.5l-3.12 3.12 3.12 3.12 3.14-1.81a1.63 1.63 0 000-2.63z" fill="#FBBC04"/>
        <path d="M3.18.37a1.63 1.63 0 00-.18.74v21.78c0 .26.06.5.18.74l.1.09 12.2-12.2v-.25L3.28.28l-.1.09z" fill="#4285F4"/>
        <path d="M14.37 11.62L3.18 23.63c.37.2.8.22 1.19.07l12.5-7.22-2.5-2.86z" fill="#34A853"/>
      </svg>
      <div style={{ textAlign: 'left' }}>
        <div style={{ fontSize: '9px', opacity: 0.7, letterSpacing: '0.05em', textTransform: 'uppercase', lineHeight: 1 }}>
          {lang === 'fr' ? 'Disponible sur' : 'Get it on'}
        </div>
        <div style={{ fontSize: '14px', fontWeight: '700', lineHeight: 1.3 }}>Google Play</div>
      </div>
    </a>
  );
}

function useInViewCustom(threshold = 0.15) {
  const ref = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

export function LandingPage() {
  const [activeSection, setActiveSection] = useState('home');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentBg, setCurrentBg] = useState(0);
  const [heroImg, setHeroImg] = useState(0);
  const [vehiculeIndex, setVehiculeIndex] = useState(0);
  const { t, language } = useLanguage();

  const backgrounds = ['/photo2_smartcabb.jpeg', '/Images_2.jpeg', '/fille_smartcabb.png'];
  const heroImages = ['/hero-smartcabb.png', '/fille_smartcabb.png'];
  const vehicules = ['/Stadard_5.png', '/TOYOTA NOAH_2.png', '/Confort_4.png'];

  const paymentMethods = [
    { src: '/logos/airtel-money.jpg', label: 'Airtel Money' },
    { src: '/logos/mpesa.png', label: 'M-Pesa' },
    { src: '/logos/orange-money.png', label: 'Orange Money' },
    { src: '/logos/logo-afrimoney.png', label: 'Afrimoney' },
    { src: '/logos/cash.png', label: 'Frais cash' },
  ];

  useEffect(() => {
    const preload = ['/hero-smartcabb.png', '/photo2_smartcabb.jpeg'];
    preload.forEach(src => {
      const link = document.createElement('link');
      link.rel = 'preload'; link.as = 'image'; link.href = src;
      document.head.appendChild(link);
    });
  }, []);

  useEffect(() => {
    const rafId = requestAnimationFrame(() => {
      const t1 = setInterval(() => setCurrentBg(p => (p + 1) % backgrounds.length), 4000);
      const t2 = setInterval(() => setHeroImg(p => (p + 1) % heroImages.length), 4500);
      const t3 = setInterval(() => setVehiculeIndex(p => (p + 1) % vehicules.length), 3000);
      return () => { clearInterval(t1); clearInterval(t2); clearInterval(t3); };
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
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
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
    { number: '03', image: '/fille_smartcabb.png', title: t('how.step3.title'), description: t('how.step3.description'), isCarousel: false },
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
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
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

        /* ── Hero image float badges ── */
        .float-badge {
          position: absolute; background: white;
          border-radius: 14px; box-shadow: 0 8px 32px rgba(0,0,0,0.14);
          display: flex; align-items: center; gap: 10px;
        }
      `}</style>

      {/* ═══════════════════ NAV ═══════════════════ */}
      <motion.nav
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.55, ease }}
        style={{ position: 'fixed', top: 0, width: '100%', background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(16px)', borderBottom: '1px solid #f1f5f9', zIndex: 50 }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '72px' }}>
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
                <a key={i} href={item.href} className="nav-link" style={{ display: 'block', padding: '10px 0' }}>{item.label}</a>
              ))}
              <Link to="/contact" className="nav-link" style={{ display: 'block', padding: '10px 0' }}>{t('nav.contact')}</Link>
              <div style={{ padding: '10px 0' }}><LanguageSelector /></div>
              <Link to="/app/passenger" className="btn-hero-primary" style={{ display: 'block', textAlign: 'center', marginTop: '8px' }}>{t('nav.login')}</Link>
            </div>
          )}
        </div>
      </motion.nav>

      {/* ═══════════════════ HERO ═══════════════════ */}
      <section id="home" style={{ paddingTop: '112px', paddingBottom: '88px', position: 'relative', overflow: 'hidden', background: '#f0f0f0' }}>
        {/* Background photos avec overlay beaucoup plus net */}
        {backgrounds.map((bg, i) =>
          currentBg === i || currentBg === (i + 1) % backgrounds.length ? (
            <div key={i} style={{
              position: 'absolute', inset: 0,
              backgroundImage: `url(${bg})`, backgroundSize: 'cover', backgroundPosition: 'center',
              opacity: currentBg === i ? 1 : 0, transition: 'opacity 1.4s ease'
            }} />
          ) : null
        )}
        {/* Overlay dégradé — plus sombre = photo reste visible mais texte lisible */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(105deg, rgba(255,255,255,0.97) 0%, rgba(255,255,255,0.92) 50%, rgba(240,249,255,0.7) 100%)' }} />

        {/* Particules flottantes */}
        {[{ w: 80, h: 80, top: '12%', left: '7%', d: '5s', dl: '0s' }, { w: 40, h: 40, top: '65%', left: '3%', d: '7s', dl: '1s' }, { w: 56, h: 56, top: '28%', right: '5%', d: '6s', dl: '0.5s' }, { w: 28, h: 28, top: '78%', right: '9%', d: '4s', dl: '2s' }].map((p, i) => (
          <div key={i} className="particle" style={{ width: p.w, height: p.h, top: p.top, left: (p as any).left, right: (p as any).right, animation: `floatP ${p.d} ease-in-out ${p.dl} infinite` }} />
        ))}

        <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              {/* Eyebrow pill */}
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.5 }}>
                <span className="section-eyebrow">
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#22c55e', display: 'inline-block', flexShrink: 0 }} />
                  {language === 'fr' ? 'Disponible à Kinshasa, RDC' : 'Available in Kinshasa, DRC'}
                </span>
              </motion.div>

              <motion.h1 initial={{ opacity: 0, y: 36 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.7, ease }}
                style={{ fontSize: 'clamp(38px, 5vw, 62px)', fontWeight: '900', color: '#222222', lineHeight: '1.08', marginBottom: '24px', letterSpacing: '-0.03em' }}>
                {language === 'fr'
                  ? <><span style={{ color: '#007AFF' }}>Votre trajet,</span><br />votre choix.</>
                  : <><span style={{ color: '#007AFF' }}>Your ride,</span><br />your choice.</>}
              </motion.h1>

              <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.6 }}
                style={{ fontSize: '18px', color: '#475569', lineHeight: '1.75', marginBottom: '36px', maxWidth: '460px' }}>
                {t('hero.description')}
              </motion.p>

              {/* ✅ Boutons CTA — Commander / Devenir chauffeur / Play Store */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.5 }}
                style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '48px', alignItems: 'center' }}>
                <Link to="/app/passenger" className="btn-hero-primary cta-glow">
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                  {t('hero.bookRide')}
                </Link>
                <Link to="/app/driver/signup" className="btn-hero-secondary">
                  {t('hero.becomeDriver')}
                </Link>
                <PlayStoreBadge lang={language} />
              </motion.div>

              {/* Stats */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.65 }}
                style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '20px' }}>
                {[{ target: 150, suffix: '+', label: t('hero.activeDrivers') }, { target: 1000, suffix: '+', label: t('hero.happyClients') }, { target: 24, suffix: '/7', label: t('hero.available') }].map((s, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 + i * 0.1 }}
                    style={{ borderLeft: '3px solid #007AFF', paddingLeft: '16px' }}>
                    <div className="stat-number" data-target={s.target} data-suffix={s.suffix} style={{ fontSize: '30px', fontWeight: '900', color: '#007AFF', lineHeight: 1.1 }}>0</div>
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px', fontWeight: '500' }}>{s.label}</div>
                  </motion.div>
                ))}
              </motion.div>
            </div>

            {/* Hero image — mobile */}
            <div className="relative lg:hidden" style={{ marginBottom: '32px', borderRadius: '20px', overflow: 'hidden', height: '280px', boxShadow: '0 20px 56px rgba(0,0,0,0.14)' }}>
              {heroImages.map((img, i) =>
                heroImg === i || heroImg === (i + 1) % heroImages.length ? (
                  <img key={i} src={img} alt="SmartCabb" width={600} height={280}
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: heroImg === i ? 1 : 0, transition: 'opacity 1s ease' }}
                    onError={e => { e.currentTarget.src = 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=800&h=600&fit=crop'; }}
                  />
                ) : null
              )}
              <div style={{ position: 'absolute', bottom: '12px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '8px', zIndex: 10 }}>
                {heroImages.map((_, i) => (
                  <button key={i} onClick={() => setHeroImg(i)}
                    style={{ height: '6px', borderRadius: '3px', border: 'none', cursor: 'pointer', background: heroImg === i ? 'white' : 'rgba(255,255,255,0.4)', width: heroImg === i ? '24px' : '6px', transition: 'all 0.3s' }} />
                ))}
              </div>
            </div>

            {/* Hero image — desktop */}
            <div className="relative hidden lg:block">
              <motion.div style={{ position: 'relative', height: '500px', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.16)' }}
                initial={{ opacity: 0, scale: 0.92, x: 40 }} animate={{ opacity: 1, scale: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.25, ease }}>
                {heroImages.map((img, i) =>
                  heroImg === i || heroImg === (i + 1) % heroImages.length ? (
                    <img key={i} src={img} alt="SmartCabb" width={800} height={500}
                      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: heroImg === i ? 1 : 0, transition: 'opacity 1s ease' }}
                      onError={e => { e.currentTarget.src = 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=800&h=600&fit=crop'; }} />
                  ) : null
                )}
                {/* Gradient au bas pour fondre l'image */}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '120px', background: 'linear-gradient(to top, rgba(8,145,178,0.15), transparent)', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', bottom: '16px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '8px', zIndex: 10 }}>
                  {heroImages.map((_, i) => (
                    <button key={i} onClick={() => setHeroImg(i)}
                      style={{ height: '6px', borderRadius: '3px', border: 'none', cursor: 'pointer', background: heroImg === i ? 'white' : 'rgba(255,255,255,0.4)', width: heroImg === i ? '24px' : '6px', transition: 'all 0.3s' }} />
                  ))}
                </div>
              </motion.div>

              {/* Badge flottant — chauffeurs en ligne */}
              <motion.div className="float-badge"
                style={{ top: '-16px', right: '-16px', padding: '12px 18px' }}
                initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.9, type: 'spring', stiffness: 220 }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 0 4px rgba(34,197,94,0.2)', flexShrink: 0 }} />
                <span style={{ fontWeight: '700', fontSize: '14px', color: '#222222' }}>50+ {language === 'fr' ? 'en ligne' : 'online'}</span>
              </motion.div>

              {/* Badge flottant — note */}
              <motion.div className="float-badge"
                style={{ bottom: '-16px', left: '-16px', padding: '14px 20px', background: '#007AFF', flexDirection: 'column', gap: '2px' }}
                initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.05, type: 'spring', stiffness: 220 }}>
                <div style={{ fontSize: '22px', fontWeight: '900', color: 'white', lineHeight: 1 }}>4.9 / 5</div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.8)' }}>{language === 'fr' ? 'Note moyenne' : 'Average rating'}</div>
              </motion.div>

              {/* Badge flottant — Play Store */}
              <motion.div className="float-badge"
                style={{ bottom: '60px', right: '-16px', padding: '10px 14px', gap: '8px' }}
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.2, type: 'spring', stiffness: 200 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M3.18 23.63c.37.2.8.22 1.19.07l12.5-7.22-2.8-2.8-10.89 9.95z" fill="#EA4335"/>
                  <path d="M20.52 10.3L17.4 8.5l-3.12 3.12 3.12 3.12 3.14-1.81a1.63 1.63 0 000-2.63z" fill="#FBBC04"/>
                  <path d="M3.18.37a1.63 1.63 0 00-.18.74v21.78c0 .26.06.5.18.74l.1.09 12.2-12.2v-.25L3.28.28l-.1.09z" fill="#4285F4"/>
                  <path d="M14.37 11.62L3.18 23.63c.37.2.8.22 1.19.07l12.5-7.22-2.5-2.86z" fill="#34A853"/>
                </svg>
                <div>
                  <div style={{ fontSize: '9px', color: '#94a3b8', lineHeight: 1 }}>App disponible</div>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: '#222222', lineHeight: 1.2 }}>Google Play</div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
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
                  <PlayStoreBadge lang={language} />
                  {/* iOS coming soon */}
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', padding: '11px 20px', background: 'rgba(255,255,255,0.08)', border: '1.5px solid rgba(255,255,255,0.15)', borderRadius: '10px', cursor: 'default', opacity: 0.7 }}>
                    <svg width="20" height="20" fill="white" viewBox="0 0 24 24">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                    </svg>
                    <div>
                      <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.6)', lineHeight: 1 }}>{language === 'fr' ? 'Bientôt sur' : 'Coming soon'}</div>
                      <div style={{ fontSize: '14px', fontWeight: '700', color: 'white', lineHeight: 1.3 }}>App Store</div>
                    </div>
                  </div>
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
                <Link to="/app/passenger" className="btn-hero-primary">{t('hero.bookRide')}</Link>
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
