import { Link } from '../lib/simple-router';
import { useState, useEffect, lazy, Suspense } from 'react';
import { motion } from '../lib/motion';
import { ProfessionalFooter } from '../components/ProfessionalFooter';
import { useLanguage } from '../contexts/LanguageContext';
import { LanguageSelector } from '../components/LanguageSelector';

const ChatWidget = lazy(() => import('../components/ChatWidget').then(module => ({ default: module.ChatWidget })));

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

  // ✅ Point 2 : 5 moyens de paiement avec image cash
  const paymentMethods = [
    { src: '/logos/airtel-money.jpg', label: 'Airtel Money' },
    { src: '/logos/mpesa.png', label: 'M-Pesa' },
    { src: '/logos/orange-money.png', label: 'Orange Money' },
    { src: '/logos/logo-afrimoney.png', label: 'Afrimoney' },
    { src: '/logos/cash.png', label: 'Cash' }, // ← met ton image cash ici, sinon fallback texte
  ];

  useEffect(() => {
    const t1 = setInterval(() => setCurrentBg(p => (p + 1) % backgrounds.length), 4000);
    return () => clearInterval(t1);
  }, []);

  useEffect(() => {
    const t2 = setInterval(() => setHeroImg(p => (p + 1) % heroImages.length), 4500);
    return () => clearInterval(t2);
  }, []);

  useEffect(() => {
    const t3 = setInterval(() => setVehiculeIndex(p => (p + 1) % vehicules.length), 3000);
    return () => clearInterval(t3);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const sections = ['home', 'how', 'why', 'trust', 'testimonials', 'africa', 'cta'];
      const current = sections.find(s => {
        const el = document.getElementById(s);
        if (el) {
          const r = el.getBoundingClientRect();
          return r.top <= 100 && r.bottom >= 100;
        }
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

  const steps = [
    { number: '01', image: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=600&h=400&fit=crop', title: t('how.step1.title'), description: t('how.step1.description'), isCarousel: false },
    { number: '02', image: vehicules[vehiculeIndex], title: t('how.step2.title'), description: t('how.step2.description'), isCarousel: true },
    { number: '03', image: '/fille_smartcabb.png', title: t('how.step3.title'), description: t('how.step3.description'), isCarousel: false },
  ];

  // ✅ Point 3 : pays avec traduction
  const africanCountries = [
    { code: 'cg', nameFR: 'Congo-Brazza', nameEN: 'Congo-Brazza', cityFR: 'Brazzaville', cityEN: 'Brazzaville' },
    { code: 'ao', nameFR: 'Angola', nameEN: 'Angola', cityFR: 'Luanda', cityEN: 'Luanda' },
    { code: 'rw', nameFR: 'Rwanda', nameEN: 'Rwanda', cityFR: 'Kigali', cityEN: 'Kigali' },
    { code: 'ke', nameFR: 'Kenya', nameEN: 'Kenya', cityFR: 'Nairobi', cityEN: 'Nairobi' },
    { code: 'cm', nameFR: 'Cameroun', nameEN: 'Cameroon', cityFR: 'Douala', cityEN: 'Douala' },
    { code: 'sn', nameFR: 'Sénégal', nameEN: 'Senegal', cityFR: 'Dakar', cityEN: 'Dakar' },
    { code: 'ug', nameFR: 'Uganda', nameEN: 'Uganda', cityFR: 'Kampala', cityEN: 'Kampala' },
    { code: 'tz', nameFR: 'Tanzanie', nameEN: 'Tanzania', cityFR: 'Dar es Salaam', cityEN: 'Dar es Salaam' },
  ];

  const africaStats = [
    { val: '54', suf: language === 'fr' ? ' pays' : ' countries', labelFR: 'Pays africains ciblés', labelEN: 'African countries targeted' },
    { val: '1.4', suf: 'Md', labelFR: 'Personnes à connecter', labelEN: 'People to connect' },
    { val: '80', suf: '%', labelFR: 'Marché non couvert', labelEN: 'Uncovered market' },
    { val: '1', suf: language === 'fr' ? 'er' : 'st', labelFR: 'Réseau panafricain', labelEN: 'Pan-African network' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'white' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        * { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif !important; }
        html { scroll-behavior: smooth; }

        .nav-link {
          font-size: 15px; font-weight: 500; color: #374151;
          transition: color 0.2s; text-decoration: none;
        }
        .nav-link:hover, .nav-link.active { color: #0891b2; }

        /* ✅ Point 4 : boutons bien cliquables */
        .btn-primary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 15px 36px;
          background: white;
          color: #0891b2;
          font-weight: 800;
          font-size: 16px;
          border-radius: 8px;
          transition: all 0.2s;
          text-decoration: none;
          cursor: pointer;
          white-space: nowrap;
          border: none;
        }
        .btn-primary:hover {
          background: #f0f9ff;
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.15);
        }

        .btn-secondary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 15px 36px;
          background: transparent;
          color: white;
          font-weight: 800;
          font-size: 16px;
          border-radius: 8px;
          border: 2px solid rgba(255,255,255,0.7);
          transition: all 0.2s;
          text-decoration: none;
          cursor: pointer;
          white-space: nowrap;
        }
        .btn-secondary:hover {
          background: rgba(255,255,255,0.15);
          border-color: white;
          transform: translateY(-2px);
        }

        .btn-hero-primary {
          display: inline-flex;
          align-items: center;
          padding: 14px 32px;
          background: #0891b2;
          color: white;
          font-weight: 700;
          font-size: 15px;
          border-radius: 8px;
          transition: all 0.2s;
          text-decoration: none;
          cursor: pointer;
        }
        .btn-hero-primary:hover { background: #0e7490; transform: translateY(-1px); box-shadow: 0 8px 24px rgba(8,145,178,0.3); }

        .btn-hero-secondary {
          display: inline-flex;
          align-items: center;
          padding: 14px 32px;
          background: white;
          color: #0891b2;
          font-weight: 700;
          font-size: 15px;
          border-radius: 8px;
          border: 2px solid #0891b2;
          transition: all 0.2s;
          text-decoration: none;
          cursor: pointer;
        }
        .btn-hero-secondary:hover { background: #f0f9ff; }

        .section-label {
          font-size: 12px; font-weight: 700; letter-spacing: 0.1em;
          text-transform: uppercase; color: #0891b2; margin-bottom: 12px;
          display: block;
        }

        .card {
          background: white; border: 1px solid #e5e7eb;
          border-radius: 16px; transition: all 0.25s;
        }
        .card:hover {
          border-color: #0891b2;
          box-shadow: 0 8px 32px rgba(8,145,178,0.1);
          transform: translateY(-3px);
        }

        .step-number {
          font-size: 72px; font-weight: 900; color: #f0f9ff;
          position: absolute; top: 16px; right: 20px;
          line-height: 1; user-select: none;
        }

        /* ✅ Point 2 : ticker animé continu */
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .ticker-track {
          animation: ticker 12s linear infinite;
          width: max-content;
          display: flex;
        }
        .ticker-track:hover { animation-play-state: paused; }

        @keyframes ping-dot {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.8); opacity: 0; }
        }
        .ping-dot { animation: ping-dot 2s ease-out infinite; }

        .country-card {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 16px; background: white;
          border: 1px solid #e5e7eb; border-radius: 12px;
          transition: all 0.2s;
        }
        .country-card:hover { border-color: #0891b2; box-shadow: 0 4px 12px rgba(8,145,178,0.1); }

        .stat-box {
          padding: 20px; background: #f0f9ff;
          border: 1px solid #bae6fd; border-radius: 12px;
        }
      `}</style>

      {/* NAV */}
      <nav style={{ position: 'fixed', top: 0, width: '100%', background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #e5e7eb', zIndex: 50 }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '72px' }}>

            {/* ✅ Point 1 : logo aligné, sans "Transport intelligent" */}
            <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', overflow: 'hidden', flexShrink: 0 }}>
                <img src="/logo-smartcabb.jpeg" alt="SmartCabb" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
              <span style={{ fontSize: '20px', fontWeight: '900', color: '#111827', letterSpacing: '-0.02em', lineHeight: '1' }}>
                SMART<span style={{ color: '#0891b2' }}>CABB</span>
              </span>
            </Link>

            <div className="hidden lg:flex items-center" style={{ gap: '32px' }}>
              {[
                { href: '#home', label: t('nav.home'), id: 'home' },
                { href: '#how', label: t('nav.howItWorks'), id: 'how' },
                { href: '#why', label: t('nav.whyUs'), id: 'why' },
                { href: '#testimonials', label: t('nav.testimonials'), id: 'testimonials' },
              ].map(item => (
                <a key={item.id} href={item.href} className={`nav-link ${activeSection === item.id ? 'active' : ''}`}>{item.label}</a>
              ))}
              <Link to="/contact" className="nav-link">{t('nav.contact')}</Link>
              <LanguageSelector />
              <Link to="/app/passenger" className="btn-hero-primary" style={{ padding: '10px 22px', fontSize: '14px' }}>
                {t('nav.login')}
              </Link>
            </div>

            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="lg:hidden" style={{ padding: '8px', background: 'none', border: 'none', cursor: 'pointer' }}>
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#374151" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d={isMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
              </svg>
            </button>
          </div>

          {isMenuOpen && (
            <div style={{ padding: '16px 0', borderTop: '1px solid #e5e7eb' }}>
              {[
                { href: '#home', label: t('nav.home') },
                { href: '#how', label: t('nav.howItWorks') },
                { href: '#why', label: t('nav.whyUs') },
                { href: '#testimonials', label: t('nav.testimonials') },
              ].map((item, i) => (
                <a key={i} href={item.href} className="nav-link" style={{ display: 'block', padding: '10px 0' }}>{item.label}</a>
              ))}
              <Link to="/contact" className="nav-link" style={{ display: 'block', padding: '10px 0' }}>{t('nav.contact')}</Link>
              <div style={{ padding: '10px 0' }}><LanguageSelector /></div>
              <Link to="/app/passenger" className="btn-hero-primary" style={{ display: 'block', textAlign: 'center', marginTop: '8px' }}>{t('nav.login')}</Link>
            </div>
          )}
        </div>
      </nav>

      {/* HERO */}
      <section id="home" style={{ paddingTop: '120px', paddingBottom: '80px', position: 'relative', overflow: 'hidden' }}>
        {backgrounds.map((bg, i) => (
          <div key={i} style={{
            position: 'absolute', inset: 0,
            backgroundImage: `url(${bg})`, backgroundSize: 'cover', backgroundPosition: 'center',
            opacity: currentBg === i ? 1 : 0, transition: 'opacity 1s ease',
          }} />
        ))}
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.88)' }} />

        <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              
              
              <p style={{ fontSize: '18px', color: '#4b5563', lineHeight: '1.7', marginBottom: '32px', maxWidth: '480px' }}>
                {t('hero.description')}
              </p>

              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '48px' }}>
                <Link to="/app/passenger" className="btn-hero-primary">{t('hero.bookRide')}</Link>
                <Link to="/drivers" className="btn-hero-secondary">{t('hero.becomeDriver')}</Link>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '24px' }}>
                {[
                  { target: 150, suffix: '+', label: t('hero.activeDrivers') },
                  { target: 1000, suffix: '+', label: t('hero.happyClients') },
                  { target: 24, suffix: '/7', label: t('hero.available') },
                ].map((s, i) => (
                  <div key={i} style={{ borderLeft: '3px solid #0891b2', paddingLeft: '16px' }}>
                    <div className="stat-number" data-target={s.target} data-suffix={s.suffix}
                      style={{ fontSize: '32px', fontWeight: '900', color: '#0891b2' }}>0</div>
                    <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </motion.div>

            <div className="relative hidden lg:block">
              <motion.div
                style={{ position: 'relative', height: '480px', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.12)' }}
                initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7 }}>
                {heroImages.map((img, i) => (
                  <img key={i} src={img} alt="SmartCabb"
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: heroImg === i ? 1 : 0, transition: 'opacity 1s ease' }}
                    onError={e => { e.currentTarget.src = 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=800&h=600&fit=crop'; }} />
                ))}
                <div style={{ position: 'absolute', bottom: '16px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '8px', zIndex: 10 }}>
                  {heroImages.map((_, i) => (
                    <button key={i} onClick={() => setHeroImg(i)}
                      style={{ height: '6px', borderRadius: '3px', border: 'none', cursor: 'pointer', background: heroImg === i ? 'white' : 'rgba(255,255,255,0.4)', width: heroImg === i ? '24px' : '6px', transition: 'all 0.3s' }} />
                  ))}
                </div>
              </motion.div>

              <motion.div
                style={{ position: 'absolute', top: '-20px', right: '-20px', background: 'white', borderRadius: '14px', padding: '14px 20px', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', display: 'flex', alignItems: 'center', gap: '10px' }}
                animate={{ y: [0, -8, 0] }} transition={{ duration: 3, repeat: Infinity }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#22c55e' }}></div>
                <span style={{ fontWeight: '700', fontSize: '14px', color: '#111827' }}>50+ {language === 'fr' ? 'en ligne' : 'online'}</span>
              </motion.div>

              <motion.div
                style={{ position: 'absolute', bottom: '-20px', left: '-20px', background: '#0891b2', borderRadius: '14px', padding: '14px 20px', boxShadow: '0 8px 32px rgba(8,145,178,0.3)', color: 'white', textAlign: 'center' }}
                animate={{ y: [0, 8, 0] }} transition={{ duration: 3, repeat: Infinity, delay: 1 }}>
                <div style={{ fontSize: '22px', fontWeight: '900' }}>4.9 / 5</div>
                <div style={{ fontSize: '11px', opacity: 0.85 }}>{language === 'fr' ? 'Note moyenne' : 'Average rating'}</div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* COMMENT CA MARCHE */}
      <section id="how" style={{ padding: '96px 0', background: '#fafafa', borderTop: '1px solid #f3f4f6' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div style={{ marginBottom: '64px' }}>
            
            <h2 style={{ fontSize: '42px', fontWeight: '900', color: '#111827', marginBottom: '16px' }}>
              {t('how.title1')} <span style={{ color: '#0891b2' }}>{t('how.title2')}</span>
            </h2>
            <p style={{ fontSize: '18px', color: '#6b7280', maxWidth: '480px' }}>{t('how.subtitle')}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, i) => (
              <motion.div key={i} className="card" style={{ overflow: 'hidden', position: 'relative' }}
                initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.15 }} viewport={{ once: true }}>
                <div style={{ height: '220px', overflow: 'hidden', position: 'relative' }}>
                  <img src={step.image} alt={step.title} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s' }}
                    onMouseOver={e => (e.currentTarget.style.transform = 'scale(1.05)')}
                    onMouseOut={e => (e.currentTarget.style.transform = 'scale(1)')} />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(8,145,178,0.7), transparent)' }} />
                  <div style={{ position: 'absolute', bottom: '16px', left: '20px', color: 'white', fontSize: '13px', fontWeight: '700' }}>
                    {language === 'fr' ? 'Étape' : 'Step'} {step.number}
                  </div>
                  {step.isCarousel && (
                    <div style={{ position: 'absolute', bottom: '16px', right: '16px', display: 'flex', gap: '6px' }}>
                      {vehicules.map((_, j) => (
                        <button key={j} onClick={() => setVehiculeIndex(j)}
                          style={{ height: '6px', border: 'none', cursor: 'pointer', borderRadius: '3px', background: vehiculeIndex === j ? 'white' : 'rgba(255,255,255,0.4)', width: vehiculeIndex === j ? '20px' : '6px', transition: 'all 0.3s' }} />
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ padding: '24px', position: 'relative' }}>
                  <div className="step-number">{step.number}</div>
                  <div style={{ width: '32px', height: '3px', background: '#0891b2', borderRadius: '2px', marginBottom: '14px' }} />
                  <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#111827', marginBottom: '10px' }}>{step.title}</h3>
                  <p style={{ fontSize: '14px', color: '#6b7280', lineHeight: '1.6' }}>{step.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* POURQUOI SMARTCABB */}
      <section id="why" style={{ padding: '96px 0', background: 'white', borderTop: '1px solid #f3f4f6' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            <div>
              
              <h2 style={{ fontSize: '42px', fontWeight: '900', color: '#111827', marginBottom: '16px' }}>
                {t('why.title1')} <span style={{ color: '#0891b2' }}>{t('why.title2')}</span>
              </h2>
              <p style={{ fontSize: '18px', color: '#6b7280', marginBottom: '32px', maxWidth: '480px' }}>{t('why.subtitle')}</p>
              <Link to="/app/passenger" className="btn-hero-primary">{t('hero.bookRide')}</Link>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {[
                { title: t('why.fast'), desc: t('why.fastDesc') },
                { title: t('why.secure'), desc: t('why.secureDesc') },
                { title: t('why.affordable'), desc: t('why.affordableDesc') },
                { title: t('why.simple'), desc: t('why.simpleDesc') },
                { title: t('why.quality'), desc: t('why.qualityDesc') },
                { title: t('why.flexible'), desc: t('why.flexibleDesc') },
                { title: t('why.reliable'), desc: t('why.reliableDesc') },
              ].map((f, i) => (
                <motion.div key={i} className="card" style={{ padding: '20px' }}
                  initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07 }} viewport={{ once: true }}>
                  <div style={{ width: '32px', height: '3px', background: '#0891b2', borderRadius: '2px', marginBottom: '12px' }} />
                  <div style={{ fontSize: '16px', fontWeight: '700', color: '#111827', marginBottom: '6px' }}>{f.title}</div>
                  <div style={{ fontSize: '13px', color: '#6b7280', lineHeight: '1.5' }}>{f.desc}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CONFIANCE */}
      <section id="trust" style={{ padding: '96px 0', background: '#fafafa', borderTop: '1px solid #f3f4f6' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div style={{ marginBottom: '64px' }}>
            
            <h2 style={{ fontSize: '42px', fontWeight: '900', color: '#111827', marginBottom: '16px' }}>
              {language === 'fr' ? 'Pourquoi nous ' : 'Why '}<span style={{ color: '#0891b2' }}>{language === 'fr' ? 'faire confiance ?' : 'trust us?'}</span>
            </h2>
            <p style={{ fontSize: '18px', color: '#6b7280', maxWidth: '480px' }}>
              {language === 'fr' ? 'SmartCabb met la sécurité de chaque trajet au premier plan.' : 'SmartCabb puts the safety of every ride first.'}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                titleFR: 'Chauffeurs vérifiés', titleEN: 'Verified drivers',
                descFR: 'Chaque chauffeur est vérifié, formé et noté. Vous voyez sa photo, son nom et son numéro de plaque avant la course.',
                descEN: 'Each driver is verified, trained and rated. You see their photo, name and plate number before the ride.',
                tagFR: '100% vérifiés', tagEN: '100% verified',
              },
              {
                titleFR: 'Suivi GPS en temps réel', titleEN: 'Real-time GPS tracking',
                descFR: "Partagez votre trajet à un proche d'un seul clic. Votre famille sait où vous êtes à tout moment.",
                descEN: 'Share your ride with a loved one in one click. Your family knows where you are at all times.',
                tagFR: 'Partage instantané', tagEN: 'Instant sharing',
              },
              {
                titleFR: "Bouton SOS d'urgence", titleEN: 'Emergency SOS button',
                descFR: "En cas de problème, notre bouton SOS alerte immédiatement notre équipe et vos contacts d'urgence.",
                descEN: 'In case of a problem, our SOS button immediately alerts our team and your emergency contacts.',
                tagFR: 'Disponible 24/7', tagEN: 'Available 24/7',
              },
            ].map((item, i) => (
              <motion.div key={i} className="card" style={{ padding: '32px' }}
                initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.15 }} viewport={{ once: true }}>
                <div style={{ display: 'inline-block', padding: '4px 12px', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '6px', fontSize: '12px', fontWeight: '700', color: '#0891b2', marginBottom: '20px' }}>
                  {language === 'fr' ? item.tagFR : item.tagEN}
                </div>
                <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#111827', marginBottom: '12px' }}>
                  {language === 'fr' ? item.titleFR : item.titleEN}
                </h3>
                <p style={{ fontSize: '14px', color: '#6b7280', lineHeight: '1.6' }}>
                  {language === 'fr' ? item.descFR : item.descEN}
                </p>
              </motion.div>
            ))}
          </div>

          {/* Prix transparents */}
          <motion.div style={{ marginTop: '48px', padding: '40px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '20px' }}
            initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} viewport={{ once: true }}>

            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: '32px', marginBottom: '32px' }}>
              <div style={{ maxWidth: '480px' }}>
                <h3 style={{ fontSize: '26px', fontWeight: '800', color: '#111827', marginBottom: '10px' }}>
                  {language === 'fr' ? 'Prix transparents en Franc Congolais' : 'Transparent prices in Congolese Franc'}
                </h3>
                <p style={{ fontSize: '15px', color: '#6b7280', lineHeight: '1.6' }}>
                  {language === 'fr'
                    ? <span>Le prix est affiché <strong style={{ color: '#111827' }}>avant</strong> de confirmer votre course. Zéro surprise, zéro négociation.</span>
                    : <span>The price is displayed <strong style={{ color: '#111827' }}>before</strong> confirming your ride. Zero surprise, zero negotiation.</span>}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '16px' }}>
                {[
                  { val: 'FC', sub: language === 'fr' ? 'Franc Congolais' : 'Congolese Franc', color: '#0891b2' },
                  { val: '0', sub: language === 'fr' ? 'Frais cachés' : 'Hidden fees', color: '#16a34a' },
                  { val: '100%', sub: language === 'fr' ? 'Transparent' : 'Transparent', color: '#0891b2' },
                ].map((b, i) => (
                  <div key={i} style={{ textAlign: 'center', padding: '16px 20px', border: '1px solid #e5e7eb', borderRadius: '12px', minWidth: '80px' }}>
                    <div style={{ fontSize: '22px', fontWeight: '900', color: b.color }}>{b.val}</div>
                    <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>{b.sub}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* ✅ Point 2 : ticker 5 images en continu */}
            <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '28px' }}>
              <p style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9ca3af', textAlign: 'center', marginBottom: '20px' }}>
                {language === 'fr' ? 'Moyens de paiement acceptés' : 'Accepted payment methods'}
              </p>
              <div style={{ position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '48px', background: 'linear-gradient(to right, white, transparent)', zIndex: 1 }} />
                <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '48px', background: 'linear-gradient(to left, white, transparent)', zIndex: 1 }} />

                {/* Série dupliquée pour boucle infinie */}
                <div className="ticker-track">
                  {[...paymentMethods, ...paymentMethods].map((p, i) => (
                    <div key={i} style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 24px', border: '1px solid #e5e7eb', borderRadius: '10px', background: '#fafafa', marginRight: '16px' }}>
                      <img src={p.src} alt={p.label}
                        style={{ height: '28px', width: 'auto', objectFit: 'contain' }}
                        onError={e => { e.currentTarget.style.display = 'none'; }} />
                      <span style={{ fontSize: '13px', fontWeight: '700', color: '#374151', whiteSpace: 'nowrap' }}>{p.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* TEMOIGNAGES */}
      <section id="testimonials" style={{ padding: '96px 0', background: 'white', borderTop: '1px solid #f3f4f6' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div style={{ marginBottom: '64px' }}>
            
            <h2 style={{ fontSize: '42px', fontWeight: '900', color: '#111827', marginBottom: '16px' }}>
              {t('testimonials.title1')} <span style={{ color: '#0891b2' }}>{t('testimonials.title2')}</span>
            </h2>
            <p style={{ fontSize: '18px', color: '#6b7280', maxWidth: '480px' }}>{t('testimonials.subtitle')}</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { name: t('testimonials.client1.name'), role: t('testimonials.client1.role'), text: t('testimonials.client1.text') },
              { name: t('testimonials.client2.name'), role: t('testimonials.client2.role'), text: t('testimonials.client2.text') },
              { name: t('testimonials.client3.name'), role: t('testimonials.client3.role'), text: t('testimonials.client3.text') },
              { name: t('testimonials.client4.name'), role: t('testimonials.client4.role'), text: t('testimonials.client4.text') },
            ].map((t2, i) => (
              <motion.div key={i} className="card" style={{ padding: '28px' }}
                initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }} viewport={{ once: true }}>
                <div style={{ fontSize: '48px', lineHeight: '1', color: '#bae6fd', marginBottom: '16px', fontFamily: 'Georgia, serif' }}>"</div>
                <p style={{ fontSize: '14px', color: '#4b5563', lineHeight: '1.7', fontStyle: 'italic', marginBottom: '20px' }}>{t2.text}</p>
                <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '16px' }}>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#111827' }}>{t2.name}</div>
                  <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>{t2.role}</div>
                </div>
              </motion.div>
            ))}
          </div>

          <div style={{ marginTop: '56px', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '48px', padding: '32px', background: '#fafafa', borderRadius: '16px', border: '1px solid #f3f4f6' }}>
            {[
              { val: '1000+', labelFR: t('testimonials.reviews5Stars'), labelEN: t('testimonials.reviews5Stars') },
              { val: '98%', labelFR: t('testimonials.satisfaction'), labelEN: t('testimonials.satisfaction') },
              { val: '4.9/5', labelFR: t('testimonials.avgRating'), labelEN: t('testimonials.avgRating') },
            ].map((s, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '32px', fontWeight: '900', color: '#0891b2' }}>{s.val}</div>
                <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>{language === 'fr' ? s.labelFR : s.labelEN}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ✅ Point 3 : AFRIQUE entièrement traduite */}
      <section id="africa" style={{ padding: '96px 0', background: '#fafafa', borderTop: '1px solid #f3f4f6' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div style={{ marginBottom: '64px' }}>
            
            <h2 style={{ fontSize: '42px', fontWeight: '900', color: '#111827', marginBottom: '16px' }}>
              {language === 'fr' ? 'SmartCabb est présent en ' : 'SmartCabb is present in '}
              <span style={{ color: '#0891b2' }}>{language === 'fr' ? 'Afrique' : 'Africa'}</span>
            </h2>
          </div>

          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div style={{ position: 'relative' }}>
              <img src="/carte-afrique.png" alt="Carte Afrique SmartCabb"
                style={{ width: '100%', height: 'auto', objectFit: 'contain' }}
                onError={e => { e.currentTarget.style.display = 'none'; }} />
              <div style={{ position: 'absolute', top: '52%', left: '55%' }}>
                <div style={{ position: 'relative' }}>
                  <div className="ping-dot" style={{ position: 'absolute', inset: '-10px', borderRadius: '50%', background: 'rgba(8,145,178,0.3)' }} />
                  <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#0891b2', border: '3px solid white', boxShadow: '0 4px 12px rgba(8,145,178,0.5)', position: 'relative', zIndex: 1 }} />
                  <div style={{ position: 'absolute', top: '22px', left: '50%', transform: 'translateX(-50%)', background: '#0891b2', color: 'white', fontSize: '11px', fontWeight: '700', padding: '4px 10px', borderRadius: '6px', whiteSpace: 'nowrap', zIndex: 2 }}>
                    Kinshasa
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 style={{ fontSize: '36px', fontWeight: '900', color: '#111827', marginBottom: '20px', lineHeight: '1.2' }}>
                {language === 'fr' ? '1 pays actif,' : '1 active country,'}
                <br /><span style={{ color: '#0891b2' }}>{language === 'fr' ? '54 pays ciblés' : '54 countries targeted'}</span>
              </h3>
              <p style={{ fontSize: '16px', color: '#6b7280', lineHeight: '1.7', marginBottom: '32px' }}>
                {language === 'fr'
                  ? "Né à Kinshasa, SmartCabb ambitionne de connecter toute l'Afrique avec un transport sûr, abordable et local."
                  : 'Born in Kinshasa, SmartCabb aims to connect all of Africa with safe, affordable and local transport.'}
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '32px' }}>
                {africanCountries.map((p, i) => (
                  <div key={i} className="country-card">
                    <img src={`https://flagcdn.com/w40/${p.code}.png`} alt={p.nameFR}
                      style={{ width: '28px', height: '18px', objectFit: 'cover', borderRadius: '3px' }} />
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: '#111827', lineHeight: '1.2' }}>
                        {language === 'fr' ? p.nameFR : p.nameEN}
                      </div>
                      <div style={{ fontSize: '11px', color: '#9ca3af', lineHeight: '1.2' }}>
                        {language === 'fr' ? p.cityFR : p.cityEN}
                      </div>
                    </div>
                    <div style={{ padding: '2px 8px', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '4px', fontSize: '11px', fontWeight: '700', color: '#92400e' }}>
                      {language === 'fr' ? 'Bientôt' : 'Soon'}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {africaStats.map((s, i) => (
                  <motion.div key={i} className="stat-box"
                    initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }} viewport={{ once: true }}>
                    <div style={{ fontSize: '24px', fontWeight: '900', color: '#0891b2' }}>
                      {s.val}<span style={{ fontSize: '16px' }}>{s.suf}</span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                      {language === 'fr' ? s.labelFR : s.labelEN}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ✅ Point 4 : CTA avec boutons bien visibles et cliquables */}
      <section id="cta" style={{ padding: '96px 0', background: '#0891b2' }}>
        <div className="max-w-4xl mx-auto px-6" style={{ textAlign: 'center' }}>
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 style={{ fontSize: '48px', fontWeight: '900', color: 'white', marginBottom: '20px', lineHeight: '1.15' }}>
              {t('cta.title')}
            </h2>
            <p style={{ fontSize: '18px', color: 'rgba(255,255,255,0.8)', marginBottom: '40px', lineHeight: '1.6' }}>
              {t('cta.subtitle')}
            </p>

            {/* ✅ Boutons bien cliquables */}
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '48px' }}>
              <Link to="/app/passenger" className="btn-primary">
                {t('cta.startNow')}
              </Link>
              <Link to="/drivers" className="btn-secondary">
                {t('cta.becomePartner')}
              </Link>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
              {[
                { label: t('cta.availableOn'), val: t('cta.iosAndroid') },
                { label: t('cta.payment'), val: t('cta.cashMobile') },
              ].map((b, i) => (
                <div key={i} style={{ padding: '14px 24px', border: '1px solid rgba(255,255,255,0.25)', borderRadius: '10px', background: 'rgba(255,255,255,0.1)' }}>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.65)', marginBottom: '4px' }}>{b.label}</div>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: 'white' }}>{b.val}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <ProfessionalFooter />
      <Suspense fallback={null}><ChatWidget /></Suspense>
    </div>
  );
}
