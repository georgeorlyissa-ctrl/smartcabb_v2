import { useState, useEffect, useRef } from 'react';
import { motion } from '../lib/motion';
import { ChatWidget } from '../components/ChatWidget';
import { ProfessionalFooter } from '../components/ProfessionalFooter';
import { SiteNavigation } from '../components/SiteNavigation';
import { useLanguage } from '../contexts/LanguageContext';
import { Link } from '../lib/simple-router';
import { ImageCarousel } from '../components/ImageCarousel';

export function ServicesPage() {
  const { t, language } = useLanguage();
  const [currentBg, setCurrentBg] = useState(0);
  const [activeService, setActiveService] = useState(0);
  const [visibleServices, setVisibleServices] = useState<number[]>([]);
  const serviceRefs = useRef<(HTMLDivElement | null)[]>([]);

  const backgrounds = ['/photo2_smartcabb.jpeg', '/Images_2.jpeg', '/driver3.jpeg'];

  useEffect(() => {
    const timer = setInterval(() => setCurrentBg(p => (p + 1) % backgrounds.length), 4000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    serviceRefs.current.forEach((ref, index) => {
      if (!ref) return;
      const observer = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) {
          setVisibleServices(prev => prev.includes(index) ? prev : [...prev, index]);
          setActiveService(index);
        }
      }, { threshold: 0.2 });
      observer.observe(ref);
      observers.push(observer);
    });
    return () => observers.forEach(o => o.disconnect());
  }, []);

  const services = [
    {
      id: 'standard',
      name: 'SmartCabb Standard',
      badge: 'STANDARD',
      tagline: language === 'fr' ? "L'essentiel du confort" : 'Essential comfort',
      subtitleFR: 'Solution économique et climatisée pour vos déplacements quotidiens. Idéal pour 3 personnes.',
      subtitleEN: 'Economical and air-conditioned solution for your daily trips. Ideal for 3 people.',
      accentColor: '#0891b2',
      lightBg: '#f0f9ff',
      lightBorder: '#bae6fd',
      gradientFrom: 'from-cyan-500',
      gradientTo: 'to-blue-500',
      images: [
        '/vehicles/smartcabb_standard/Standard_2.png',
        '/vehicles/smartcabb_standard/Standard_3.png',
        '/vehicles/smartcabb_standard/Stadard_5.png',
        '/vehicles/smartcabb_standard/Standard_6.png',
      ],
      vehicules: 'Toyota IST, Suzuki Swift, Toyota Vitz, Toyota Blade, Toyota Ractis, Toyota Runx',
      featuresFR: [
        { text: '3 places', detail: 'Confortable' },
        { text: 'Climatisé', detail: "Toute l'année" },
        { text: 'Sécurisé', detail: 'GPS inclus' },
        { text: 'Rapide', detail: '< 5 minutes' },
      ],
      featuresEN: [
        { text: '3 seats', detail: 'Comfortable' },
        { text: 'Air-conditioned', detail: 'Year round' },
        { text: 'Secured', detail: 'GPS included' },
        { text: 'Fast', detail: '< 5 minutes' },
      ],
      priceFR: '15 000 FC',
      priceEN: '15,000 FC',
      popular: false,
    },
    {
      id: 'confort',
      name: 'SmartCabb Confort',
      badge: 'CONFORT',
      tagline: language === 'fr' ? 'Premium & connecté' : 'Premium & connected',
      subtitleFR: 'Confort premium avec connexion Data gratuit. Véhicules modernes pour 3 personnes.',
      subtitleEN: 'Premium comfort with free Data connection. Modern vehicles for 3 people.',
      accentColor: '#2563eb',
      lightBg: '#eff6ff',
      lightBorder: '#bfdbfe',
      gradientFrom: 'from-blue-500',
      gradientTo: 'to-indigo-500',
      images: [
        '/vehicles/smartcabb_confort/confort 1.png',
        '/vehicles/smartcabb_confort/Confort_2.png',
        '/vehicles/smartcabb_confort/Confort_3.png',
      ],
      vehicules: 'Toyota Mark, Toyota Crown, Mercedes C-Class, Harrier, Toyota Vanguard, Nissan Juke',
      featuresFR: [
        { text: '3 places', detail: 'Spacieux' },
        { text: 'Climatisé', detail: 'Premium' },
        { text: 'Data gratuit', detail: 'Haut débit' },
        { text: 'Sécurisé', detail: 'Assuré' },
      ],
      featuresEN: [
        { text: '3 seats', detail: 'Spacious' },
        { text: 'Air-conditioned', detail: 'Premium' },
        { text: 'Free Data', detail: 'High speed' },
        { text: 'Secured', detail: 'Insured' },
      ],
      priceFR: '33 000 FC',
      priceEN: '33,000 FC',
      popular: true,
    },
    {
      id: 'business',
      name: 'SmartCabb Business',
      badge: 'BUSINESS',
      tagline: language === 'fr' ? 'Le summum du luxe' : 'The height of luxury',
      subtitleFR: 'Service VIP 4 places avec rafraîchissement et Data gratuit. Le summum du luxe.',
      subtitleEN: 'VIP 4-seat service with refreshments and free Data. The height of luxury.',
      accentColor: '#c2410c',
      lightBg: '#fff7ed',
      lightBorder: '#fed7aa',
      gradientFrom: 'from-orange-500',
      gradientTo: 'to-red-500',
      images: [
        '/vehicles/smartcabb_business/Bussiness_1.png',
        '/vehicles/smartcabb_business/Bussiness_2.png',
        '/vehicles/smartcabb_business/Bussiness_3.jpg',
        '/vehicles/smartcabb_business/Bussiness_4.png',
        '/vehicles/smartcabb_business/Bussiness_5.jpg',
        '/vehicles/smartcabb_business/Business_6.png',
      ],
      vehicules: 'Prado, Fortuner',
      featuresFR: [
        { text: '4 places', detail: 'VIP' },
        { text: 'Rafraîchissement', detail: 'Offert' },
        { text: 'Data gratuit', detail: 'Premium' },
        { text: 'Sécurisé', detail: 'Escorte' },
      ],
      featuresEN: [
        { text: '4 seats', detail: 'VIP' },
        { text: 'Refreshments', detail: 'Included' },
        { text: 'Free Data', detail: 'Premium' },
        { text: 'Secured', detail: 'Escort' },
      ],
      priceFR: '352 000 FC',
      priceEN: '352,000 FC',
      popular: false,
    },
    {
      id: 'familia',
      name: 'SmartCabb Familia',
      badge: 'FAMILIA',
      tagline: language === 'fr' ? 'Pour toute la famille' : 'For the whole family',
      subtitleFR: '7 places avec connexion Data gratuit. Véhicules spacieux pour familles et groupes.',
      subtitleEN: '7 seats with free Data connection. Spacious vehicles for families and groups.',
      accentColor: '#15803d',
      lightBg: '#f0fdf4',
      lightBorder: '#bbf7d0',
      gradientFrom: 'from-emerald-500',
      gradientTo: 'to-green-600',
      images: [
        '/vehicles/smartcabb_familiale/Familiale_1.png',
        '/vehicles/smartcabb_familiale/Familiale_2.png',
        '/vehicles/smartcabb_familiale/Familiale_3.png',
      ],
      vehicules: 'Noah, Alphard, Voxy',
      featuresFR: [
        { text: '7 places', detail: 'Grand espace' },
        { text: 'Climatisé', detail: 'Double zone' },
        { text: 'Data gratuit', detail: 'Partagé' },
        { text: 'Sécurisé', detail: 'Famille' },
      ],
      featuresEN: [
        { text: '7 seats', detail: 'Large space' },
        { text: 'Air-conditioned', detail: 'Dual zone' },
        { text: 'Free Data', detail: 'Shared' },
        { text: 'Secured', detail: 'Family' },
      ],
      priceFR: '33 000 FC',
      priceEN: '33,000 FC',
      popular: false,
    },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'white' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        * { font-family: 'Inter', sans-serif !important; }

        .section-label {
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #0891b2;
          margin-bottom: 12px;
        }

        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-48px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(48px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInUp {
          from { opacity: 0; transform: translateY(32px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .anim-left { animation: slideInLeft 0.6s ease forwards; }
        .anim-right { animation: slideInRight 0.6s ease forwards; }
        .anim-up { animation: slideInUp 0.6s ease forwards; }

        .service-card { transition: box-shadow 0.3s ease; }
        .service-card:hover { box-shadow: 0 8px 40px rgba(0,0,0,0.1); }

        .feature-item {
          padding: 14px 16px;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          transition: all 0.2s;
        }
        .feature-item:hover { border-color: #0891b2; background: #f0f9ff; }

        .card-hidden { opacity: 0; transform: translateY(40px); }
        .card-visible { opacity: 1; transform: translateY(0); transition: all 0.6s ease; }

        .nav-pill {
          padding: 8px 20px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.2s;
          border: 1px solid #e5e7eb;
          color: #374151;
          background: white;
        }
        .nav-pill:hover { border-color: #0891b2; color: #0891b2; }
        .nav-pill.active { background: #0891b2; color: white; border-color: #0891b2; }
      `}</style>

      <SiteNavigation />

      {/* HERO */}
      <section style={{ paddingTop: '100px', paddingBottom: '64px', position: 'relative', overflow: 'hidden' }}>
        {backgrounds.map((bg, i) => (
          <div key={i} style={{
            position: 'absolute', inset: 0,
            backgroundImage: `url(${bg})`, backgroundSize: 'cover', backgroundPosition: 'center',
            opacity: currentBg === i ? 1 : 0, transition: 'opacity 1s ease',
          }} />
        ))}
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.92)' }} />

        <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            
            <h1 style={{ fontSize: '48px', fontWeight: '900', color: '#111827', lineHeight: '1.1', marginBottom: '16px' }}>
  {language === 'fr' ? 'Choisissez votre' : 'Choose your'}<br />
  <span style={{ color: '#0891b2' }}>
    {language === 'fr' ? 'expérience' : 'experience'}
  </span>
</h1>
            <p style={{ fontSize: '18px', color: '#6b7280', lineHeight: '1.7', maxWidth: '520px', marginBottom: '40px' }}>
              {t('services.subtitle')}
            </p>

            {/* Navigation pills — sans emoji */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {services.map((s, i) => (
                <a key={i} href={`#${s.id}`}
                  onClick={() => setActiveService(i)}
                  className={`nav-pill ${activeService === i ? 'active' : ''}`}
                  style={s.popular && activeService !== i ? { borderColor: '#fbbf24' } : {}}>
                  {s.popular && activeService !== i && (
                    <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#f59e0b', marginRight: '6px', verticalAlign: 'middle' }} />
                  )}
                  {s.name}
                </a>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* SERVICES */}
      <section style={{ padding: '64px 0 96px' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
            {services.map((service, index) => {
              const isVisible = visibleServices.includes(index);
              const isEven = index % 2 === 0;
              const features = language === 'fr' ? service.featuresFR : service.featuresEN;

              return (
                <div key={service.id} id={service.id}
                  ref={el => serviceRefs.current[index] = el}
                  className={`card-hidden ${isVisible ? 'card-visible' : ''}`}
                  style={{ transitionDelay: `${index * 0.05}s` }}>

                  <div className="service-card" style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: '20px',
                    overflow: 'hidden',
                    background: 'white',
                    borderTop: `3px solid ${service.accentColor}`,
                  }}>
                    <div style={{ padding: '40px 40px 40px 40px', position: 'relative' }}>

                      {/* Numéro déco */}
                      <div style={{
                        position: 'absolute', bottom: '24px', right: '32px',
                        fontSize: '96px', fontWeight: '900', color: service.lightBg,
                        lineHeight: '1', userSelect: 'none', zIndex: 0,
                      }}>
                        {String(index + 1).padStart(2, '0')}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px', alignItems: 'center', position: 'relative', zIndex: 1 }}
                        className="lg:grid-cols-2">

                        {/* IMAGE */}
                        <div className={isVisible ? (isEven ? 'anim-left' : 'anim-right') : ''} style={{ order: isEven ? 1 : 2 }}>
                          <div style={{ borderRadius: '14px', overflow: 'hidden', border: '1px solid #f3f4f6' }}>
                            <ImageCarousel images={service.images} serviceName={service.name} />
                          </div>
                          {service.popular && (
                            <div style={{ marginTop: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px', background: service.lightBg, border: `1px solid ${service.lightBorder}`, borderRadius: '8px', fontSize: '12px', fontWeight: '700', color: service.accentColor }}>
                              Le plus populaire
                            </div>
                          )}
                        </div>

                        {/* INFOS */}
                        <div className={isVisible ? 'anim-up' : ''} style={{ order: isEven ? 2 : 1 }}>

                          <div style={{ display: 'inline-block', padding: '4px 12px', background: service.lightBg, border: `1px solid ${service.lightBorder}`, borderRadius: '6px', fontSize: '11px', fontWeight: '800', color: service.accentColor, letterSpacing: '0.08em', marginBottom: '16px' }}>
                            {service.badge}
                          </div>

                          <h2 style={{ fontSize: '30px', fontWeight: '900', color: '#111827', marginBottom: '6px' }}>{service.name}</h2>
                          <p style={{ fontSize: '14px', fontWeight: '600', color: service.accentColor, marginBottom: '16px' }}>{service.tagline}</p>
                          <p style={{ fontSize: '15px', color: '#6b7280', lineHeight: '1.7', marginBottom: '28px' }}>
                            {language === 'fr' ? service.subtitleFR : service.subtitleEN}
                          </p>

                          {/* Features */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '24px' }}>
                            {features.map((f, idx) => (
                              <div key={idx} className="feature-item">
                                <div style={{ fontSize: '14px', fontWeight: '700', color: '#111827' }}>{f.text}</div>
                                <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>{f.detail}</div>
                              </div>
                            ))}
                          </div>

                          {/* Véhicules */}
                          <div style={{ padding: '14px 18px', background: '#fafafa', border: '1px solid #f3f4f6', borderRadius: '10px', marginBottom: '24px' }}>
                            <div style={{ fontSize: '11px', fontWeight: '800', color: '#9ca3af', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px' }}>
                              {language === 'fr' ? 'Véhicules' : 'Vehicles'}
                            </div>
                            <div style={{ fontSize: '13px', color: '#4b5563', fontWeight: '500' }}>{service.vehicules}</div>
                          </div>

                          {/* Prix + CTA */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '20px', borderTop: '1px solid #f3f4f6' }}>
                            <div>
                              <div style={{ fontSize: '11px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
                                {language === 'fr' ? 'À partir de' : 'From'}
                              </div>
                              <div style={{ fontSize: '22px', fontWeight: '900', color: service.accentColor, whiteSpace: 'nowrap' }}>
                                {language === 'fr' ? service.priceFR : service.priceEN}
                              </div>
                            </div>
                            <Link to="/app/passenger" style={{
                              display: 'inline-flex', alignItems: 'center', gap: '8px',
                              padding: '12px 24px', background: service.accentColor,
                              color: 'white', fontWeight: '700', fontSize: '14px',
                              borderRadius: '8px', textDecoration: 'none',
                              transition: 'all 0.2s', boxShadow: `0 4px 16px ${service.accentColor}40`,
                            }}>
                              {t('services.bookNow')}
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                            </Link>
                          </div>

                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '80px 0', background: '#0891b2' }}>
        <div className="max-w-4xl mx-auto px-6" style={{ textAlign: 'center' }}>
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} viewport={{ once: true }}>
            <h2 style={{ fontSize: '42px', fontWeight: '900', color: 'white', marginBottom: '16px', lineHeight: '1.2' }}>{t('cta.title')}</h2>
            <p style={{ fontSize: '18px', color: 'rgba(255,255,255,0.8)', marginBottom: '36px' }}>{t('cta.subtitle')}</p>
            <Link
              to="/app/passenger"
              className="inline-block px-8 py-4 bg-white text-cyan-600 font-bold rounded-full hover:shadow-2xl hover:scale-105 transition-all text-lg"
            >
              {t('cta.startNow')}
            </Link>
          </motion.div>
        </div>
      </section>

      <ProfessionalFooter />
      <ChatWidget />
    </div>
  );
}
