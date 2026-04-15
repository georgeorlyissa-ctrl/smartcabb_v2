import { useState, useEffect, useRef } from 'react';
import { motion } from '../lib/motion';
import { ChatWidget } from '../components/ChatWidget';
import { ProfessionalFooter } from '../components/ProfessionalFooter';
import { SiteNavigation } from '../components/SiteNavigation';
import { useLanguage } from '../contexts/LanguageContext';
import { Link } from '../lib/simple-router';

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

export function DriversLandingPage() {
  const { t, language } = useLanguage();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const { ref: reqRef, inView: reqInView } = useInViewCustom(0.12);
  const { ref: benefitsRef, inView: benefitsInView } = useInViewCustom(0.12);
  const { ref: stepsRef, inView: stepsInView } = useInViewCustom(0.12);
  const { ref: ctaRef, inView: ctaInView } = useInViewCustom(0.2);

  const driverImages = [
    '/drivers/driver1.png',
    '/drivers/driver2.png',
    '/drivers/driver3.jpeg',
  ];

  useEffect(() => {
    const rafId = requestAnimationFrame(() => {
      const interval = setInterval(() => {
        setCurrentImageIndex(prev => (prev + 1) % driverImages.length);
      }, 4000);
      return () => clearInterval(interval);
    });
    return () => cancelAnimationFrame(rafId);
  }, []);

  const requirements = [
    {
      icon: (
        <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '56px', height: '56px' }}>
          <rect width="64" height="64" rx="16" fill="#f0f9ff"/>
          <rect x="12" y="20" width="40" height="28" rx="4" fill="#0891b2" opacity="0.15"/>
          <rect x="12" y="20" width="40" height="28" rx="4" stroke="#0891b2" strokeWidth="2.5"/>
          <circle cx="24" cy="31" r="5" stroke="#0891b2" strokeWidth="2.5"/>
          <line x1="32" y1="28" x2="44" y2="28" stroke="#0891b2" strokeWidth="2.5" strokeLinecap="round"/>
          <line x1="32" y1="34" x2="44" y2="34" stroke="#0891b2" strokeWidth="2.5" strokeLinecap="round"/>
          <line x1="16" y1="40" x2="48" y2="40" stroke="#0891b2" strokeWidth="2" strokeLinecap="round" opacity="0.5"/>
        </svg>
      ),
      textFR: 'Permis de conduire valide',
      textEN: "Valid driver's license",
    },
    {
      icon: (
        <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '56px', height: '56px' }}>
          <rect width="64" height="64" rx="16" fill="#f0f9ff"/>
          <rect x="8" y="28" width="48" height="20" rx="5" fill="#0891b2" opacity="0.15"/>
          <rect x="8" y="28" width="48" height="20" rx="5" stroke="#0891b2" strokeWidth="2.5"/>
          <path d="M14 28 Q18 18 32 18 Q46 18 50 28" stroke="#0891b2" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
          <circle cx="18" cy="48" r="5" fill="white" stroke="#0891b2" strokeWidth="2.5"/>
          <circle cx="46" cy="48" r="5" fill="white" stroke="#0891b2" strokeWidth="2.5"/>
          <line x1="26" y1="38" x2="38" y2="38" stroke="#0891b2" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      ),
      textFR: 'Vehicule en bon etat',
      textEN: 'Vehicle in good condition',
    },
    {
      icon: (
        <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '56px', height: '56px' }}>
          <rect width="64" height="64" rx="16" fill="#f0f9ff"/>
          <path d="M32 10 L48 17 L48 32 C48 42 40 50 32 54 C24 50 16 42 16 32 L16 17 Z" fill="#0891b2" opacity="0.15" stroke="#0891b2" strokeWidth="2.5" strokeLinejoin="round"/>
          <path d="M24 32 L29 37 L40 26" stroke="#0891b2" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      textFR: 'Casier judiciaire vierge',
      textEN: 'Clean criminal record',
    },
    {
      icon: (
        <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '56px', height: '56px' }}>
          <rect width="64" height="64" rx="16" fill="#f0f9ff"/>
          <circle cx="32" cy="26" r="10" fill="#0891b2" opacity="0.15" stroke="#0891b2" strokeWidth="2.5"/>
          <path d="M16 50 C16 42 23 36 32 36 C41 36 48 42 48 50" stroke="#0891b2" strokeWidth="2.5" strokeLinecap="round"/>
          <path d="M38 14 C40 16 42 20 40 24" stroke="#0891b2" strokeWidth="2" strokeLinecap="round" opacity="0.6"/>
          <text x="28" y="30" fontSize="10" fontWeight="900" fill="#0891b2">21</text>
        </svg>
      ),
      textFR: 'Age minimum 21 ans',
      textEN: 'Minimum age 21 years',
    },
  ];

  const benefits = [
    { titleFR: 'Revenus attractifs', titleEN: 'Attractive income', descFR: 'Gagnez plus selon votre disponibilite', descEN: 'Earn more based on your availability' },
    { titleFR: 'Horaires flexibles', titleEN: 'Flexible hours', descFR: 'Travaillez quand vous le souhaitez', descEN: 'Work whenever you want' },
    { titleFR: 'Assurance incluse', titleEN: 'Insurance included', descFR: 'Couverture complete pendant les courses', descEN: 'Full coverage during rides' },
    { titleFR: 'Formation gratuite', titleEN: 'Free training', descFR: "Formation a l'utilisation de l'application", descEN: 'Training on using the application' },
    { titleFR: 'Application simple', titleEN: 'Simple app', descFR: 'Interface intuitive et facile a utiliser', descEN: 'Intuitive and easy-to-use interface' },
    { titleFR: 'Support 24/7', titleEN: '24/7 support', descFR: 'Notre equipe disponible a tout moment', descEN: 'Our team available at all times' },
  ];

  const steps = [
    { num: '01', titleFR: 'Inscrivez-vous', titleEN: 'Sign up', descFR: 'Remplissez le formulaire en ligne', descEN: 'Fill out the online form' },
    { num: '02', titleFR: 'Verification', titleEN: 'Verification', descFR: 'Nous verifions vos documents', descEN: 'We verify your documents' },
    { num: '03', titleFR: 'Formation', titleEN: 'Training', descFR: "Formation gratuite a l'utilisation de l'app", descEN: 'Free training on using the app' },
    { num: '04', titleFR: 'Commencez', titleEN: 'Start', descFR: "Commencez a gagner de l'argent", descEN: 'Start earning money' },
  ];

  const ease: [number, number, number, number] = [0.22, 1, 0.36, 1];

  return (
    <div style={{ minHeight: '100vh', background: 'white' }}>
      <style>{`
        * { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif !important; }

        .btn-primary {
          display: inline-block; padding: 14px 32px;
          background: #0891b2; color: white; font-weight: 700;
          font-size: 15px; border-radius: 8px;
          transition: all 0.2s; text-decoration: none;
        }
        .btn-primary:hover { background: #0e7490; transform: translateY(-2px); box-shadow: 0 8px 24px rgba(8,145,178,0.3); }

        .drv-card {
          background: white; border: 1px solid #e5e7eb;
          border-radius: 14px; transition: all 0.3s cubic-bezier(0.22,1,0.36,1);
        }
        .drv-card:hover { border-color: #0891b2; box-shadow: 0 12px 40px rgba(8,145,178,0.12); transform: translateY(-5px); }

        .req-card {
          background: white; border: 1px solid #e5e7eb;
          border-radius: 14px; padding: 28px 24px;
          text-align: center; transition: all 0.3s cubic-bezier(0.22,1,0.36,1);
        }
        .req-card:hover { border-color: #0891b2; box-shadow: 0 12px 40px rgba(8,145,178,0.12); transform: translateY(-5px); }

        .step-card {
          background: white; border: 1px solid #e5e7eb;
          border-radius: 14px; padding: 32px 24px;
          position: relative; text-align: center;
          transition: all 0.3s cubic-bezier(0.22,1,0.36,1);
        }
        .step-card:hover { border-color: #0891b2; box-shadow: 0 12px 40px rgba(8,145,178,0.12); }

        .accent-line { height: 4px; background: linear-gradient(90deg,#0891b2,#06b6d4); border-radius: 2px; margin-bottom: 20px; max-width: 64px; }

        .reveal { opacity: 0; transform: translateY(40px); transition: opacity 0.65s cubic-bezier(0.22,1,0.36,1), transform 0.65s cubic-bezier(0.22,1,0.36,1); }
        .reveal.in { opacity: 1; transform: translateY(0); }
        .reveal-left { opacity: 0; transform: translateX(-48px); transition: opacity 0.65s cubic-bezier(0.22,1,0.36,1), transform 0.65s cubic-bezier(0.22,1,0.36,1); }
        .reveal-left.in { opacity: 1; transform: translateX(0); }
        .reveal-right { opacity: 0; transform: translateX(48px); transition: opacity 0.65s cubic-bezier(0.22,1,0.36,1), transform 0.65s cubic-bezier(0.22,1,0.36,1); }
        .reveal-right.in { opacity: 1; transform: translateX(0); }

        .d0 { transition-delay: 0s; } .d1 { transition-delay: 0.07s; } .d2 { transition-delay: 0.14s; }
        .d3 { transition-delay: 0.21s; } .d4 { transition-delay: 0.28s; } .d5 { transition-delay: 0.36s; }
        .d6 { transition-delay: 0.44s; } .d7 { transition-delay: 0.52s; } .d8 { transition-delay: 0.6s; }

        @keyframes pulseGlow { 0%, 100% { box-shadow: 0 0 0 0 rgba(8,145,178,0.4); } 50% { box-shadow: 0 0 0 14px rgba(8,145,178,0); } }
        .btn-glow { animation: pulseGlow 2.5s ease infinite; }
      `}</style>

      <SiteNavigation />

      {/* HERO */}
      <section style={{ paddingTop: '100px', paddingBottom: '72px', background: '#fafafa', borderBottom: '1px solid #f3f4f6' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">

            <motion.div
              initial={{ opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease }}
            >
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1, duration: 0.5 }}
                style={{ height: '4px', background: 'linear-gradient(90deg,#0891b2,#06b6d4)', borderRadius: '2px', maxWidth: '64px', marginBottom: '20px' }}
              />
              <motion.h1
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.7, ease }}
                style={{ fontSize: 'clamp(36px, 5vw, 52px)', fontWeight: '900', color: '#111827', lineHeight: '1.1', marginBottom: '20px', letterSpacing: '-0.02em' }}
              >
                {t('drivers.title')}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, duration: 0.6 }}
                style={{ fontSize: '18px', color: '#6b7280', lineHeight: '1.7', marginBottom: '32px', maxWidth: '480px' }}
              >
                {t('drivers.subtitle')}
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.5 }}
              >
                <Link to="/app/driver/signup" className="btn-primary btn-glow">{t('drivers.signup')}</Link>
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 48, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.25, ease }}
            >
              <div style={{ borderRadius: '20px', overflow: 'hidden', aspectRatio: '1', position: 'relative', boxShadow: '0 24px 64px rgba(0,0,0,0.12)' }}>
                {driverImages.map((img, i) =>
                  currentImageIndex === i || currentImageIndex === (i + 1) % driverImages.length ? (
                    <img
                      key={i}
                      src={img}
                      alt="Driver SmartCabb"
                      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: i === currentImageIndex ? 1 : 0, transition: 'opacity 1s ease' }}
                    />
                  ) : null
                )}
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* CONDITIONS REQUISES */}
      <section ref={reqRef as any} style={{ padding: '80px 0', background: 'white', borderBottom: '1px solid #f3f4f6' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div style={{ marginBottom: '56px' }}>
            <div className={`accent-line reveal d0 ${reqInView ? 'in' : ''}`} />
            <h2 className={`reveal d1 ${reqInView ? 'in' : ''}`} style={{ fontSize: '40px', fontWeight: '900', color: '#111827', marginBottom: '12px' }}>
              {t('drivers.requirements')}
            </h2>
            <p className={`reveal d2 ${reqInView ? 'in' : ''}`} style={{ fontSize: '17px', color: '#6b7280' }}>
              {language === 'fr' ? 'Les conditions pour rejoindre notre equipe' : 'The requirements to join our team'}
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px' }}>
            {requirements.map((req, i) => (
              <div
                key={i}
                className={`req-card reveal ${reqInView ? 'in' : ''}`}
                style={{ transitionDelay: `${0.1 + i * 0.12}s` }}
              >
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                  {req.icon}
                </div>
                <p style={{ fontSize: '14px', fontWeight: '700', color: '#111827', lineHeight: '1.4' }}>
                  {language === 'fr' ? req.textFR : req.textEN}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AVANTAGES */}
      <section ref={benefitsRef as any} style={{ padding: '80px 0', background: '#fafafa', borderBottom: '1px solid #f3f4f6' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-start">

            <div>
              <div className={`accent-line reveal-left d0 ${benefitsInView ? 'in' : ''}`} />
              <h2 className={`reveal-left d1 ${benefitsInView ? 'in' : ''}`} style={{ fontSize: '40px', fontWeight: '900', color: '#111827', marginBottom: '16px', lineHeight: '1.15' }}>
                {t('drivers.benefits')}
              </h2>
              <p className={`reveal-left d2 ${benefitsInView ? 'in' : ''}`} style={{ fontSize: '17px', color: '#6b7280', lineHeight: '1.7', marginBottom: '32px' }}>
                {language === 'fr' ? 'Pourquoi conduire avec SmartCabb' : 'Why drive with SmartCabb'}
              </p>
              <div className={`reveal-left d3 ${benefitsInView ? 'in' : ''}`}>
                <Link to="/app/driver/signup" className="btn-primary">{t('drivers.signup')}</Link>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {benefits.map((b, i) => (
                <div
                  key={i}
                  className={`drv-card reveal ${benefitsInView ? 'in' : ''}`}
                  style={{ padding: '20px', transitionDelay: `${0.05 + i * 0.08}s` }}
                >
                  <div style={{ width: '32px', height: '3px', background: '#0891b2', borderRadius: '2px', marginBottom: '12px' }} />
                  <div style={{ fontSize: '15px', fontWeight: '700', color: '#111827', marginBottom: '6px' }}>
                    {language === 'fr' ? b.titleFR : b.titleEN}
                  </div>
                  <div style={{ fontSize: '13px', color: '#9ca3af', lineHeight: '1.5' }}>
                    {language === 'fr' ? b.descFR : b.descEN}
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>
      </section>

      {/* COMMENT CA MARCHE */}
      <section ref={stepsRef as any} style={{ padding: '80px 0', background: 'white', borderBottom: '1px solid #f3f4f6' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div style={{ marginBottom: '56px' }}>
            <div className={`accent-line reveal d0 ${stepsInView ? 'in' : ''}`} />
            <h2 className={`reveal d1 ${stepsInView ? 'in' : ''}`} style={{ fontSize: '40px', fontWeight: '900', color: '#111827', marginBottom: '12px' }}>
              {t('drivers.howItWorks')}
            </h2>
            <p className={`reveal d2 ${stepsInView ? 'in' : ''}`} style={{ fontSize: '17px', color: '#6b7280' }}>
              {language === 'fr' ? 'Devenez chauffeur en 4 etapes simples' : 'Become a driver in 4 simple steps'}
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
            {steps.map((step, i) => (
              <div
                key={i}
                className={`step-card reveal ${stepsInView ? 'in' : ''}`}
                style={{ transitionDelay: `${0.1 + i * 0.12}s` }}
              >
                <div style={{
                  position: 'absolute', top: '-18px', left: '50%', transform: 'translateX(-50%)',
                  width: '36px', height: '36px', borderRadius: '50%',
                  background: '#0891b2', color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '13px', fontWeight: '900', boxShadow: '0 4px 12px rgba(8,145,178,0.4)',
                }}>
                  {step.num}
                </div>
                <div style={{ marginTop: '16px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#111827', marginBottom: '8px' }}>
                    {language === 'fr' ? step.titleFR : step.titleEN}
                  </h3>
                  <p style={{ fontSize: '13px', color: '#9ca3af', lineHeight: '1.6' }}>
                    {language === 'fr' ? step.descFR : step.descEN}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className={`reveal d5 ${stepsInView ? 'in' : ''}`} style={{ textAlign: 'center', marginTop: '48px' }}>
            <Link to="/app/driver/signup" className="btn-primary">{t('drivers.signup')}</Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '80px 0', background: '#0891b2' }}>
        <div className="max-w-4xl mx-auto px-6" style={{ textAlign: 'center' }}>
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} viewport={{ once: true }}>
            <h2 style={{ fontSize: '42px', fontWeight: '900', color: 'white', marginBottom: '16px', lineHeight: '1.2' }}>
              {language === 'fr' ? 'Prêt à commencer ?' : 'Ready to start?'}
            </h2>
            <p style={{ fontSize: '18px', color: 'rgba(255,255,255,0.8)', marginBottom: '36px', lineHeight: '1.6' }}>
              {language === 'fr'
                ? 'Rejoignez des centaines de chauffeurs qui gagnent déjà avec SmartCabb'
                : 'Join hundreds of drivers already earning with SmartCabb'}
            </p>
            <Link to="/app/driver/signup" className = "inline-block px-8 py-4 bg-white text-cyan-600 font-bold rounded-full hover:shadow-2xl hover:scale-105 transition-all text-lg"style={{
              display: 'inline-flex', padding: '16px 40px',
              background: 'white', color: '#ecf3f5', fontWeight: '800',
              fontSize: '16px', borderRadius: '8px', textDecoration: 'none',
            }}>
              {t('drivers.signup')}
            </Link>
          </motion.div>
        </div>
      </section>

      <ProfessionalFooter />
      <ChatWidget />
    </div>
  );
}

