import { useState, useEffect, useRef } from 'react';
import { motion } from '../lib/motion';
import { ChatWidget } from '../components/ChatWidget';
import { ProfessionalFooter } from '../components/ProfessionalFooter';
import { SiteNavigation } from '../components/SiteNavigation';
import { useLanguage } from '../contexts/LanguageContext';
import { Link } from '../lib/simple-router';
import { ImageCarousel } from '../components/ImageCarousel';

const BOOK_URL = '/app/passenger';
const RESERVE_URL = '/app/passenger?screen=scheduled-rides';

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

  const fr = language === 'fr';

  const services = [
    {
      id: 'standard',
      name: 'SmartCabb Standard',
      badge: 'STANDARD',
      tagline: fr ? "L'essentiel du confort" : 'Essential comfort',
      headline: fr ? 'Le quotidien, simple et économique' : 'Everyday, simple and affordable',
      description: fr
        ? "Solution économique et climatisée pour vos déplacements quotidiens à Kinshasa. Idéal pour 3 personnes, disponible immédiatement."
        : 'Economical air-conditioned solution for your daily trips in Kinshasa. Ideal for 3 people, available immediately.',
      accentColor: '#007AFF',
      lightBg: '#E0E0E0',
      lightBorder: '#bae6fd',
      images: [
        '/vehicles/smartcabb_standard/Standard_1.jpg',
        '/vehicles/smartcabb_standard/Standard_2.jpg',
        '/vehicles/smartcabb_standard/Standard_3.jpg',
        '/vehicles/smartcabb_standard/Standard_4.jpg',
        '/vehicles/smartcabb_standard/Standard_5.jpg',
        '/vehicles/smartcabb_standard/Standard_6.jpg',
      ],
      vehicules: 'Toyota IST, Suzuki Swift, Toyota Vitz, Toyota Blade, Toyota Ractis, Toyota Runx',
      features: [
        { text: '3 places', detail: 'Confortable' },
        { text: 'Climatisé', detail: "Toute l'année" },
        { text: 'Sécurisé', detail: 'GPS inclus' },
        { text: 'Rapide', detail: '< 5 minutes' },
      ],
      ideal: [],
      price: '15 000 FC/h',
      priceNote: fr ? 'Course immédiate' : 'Immediate ride',
      reservationOnly: false,
      popular: false,
    },
    {
      id: 'confort',
      name: 'SmartCabb Confort',
      badge: 'CONFORT',
      tagline: fr ? 'Premium & connecté' : 'Premium & connected',
      headline: fr ? 'Plus d’espace, plus de confort' : 'More space, more comfort',
      description: fr
        ? 'Confort premium avec connexion Data gratuite. Véhicules modernes pour 3 personnes, pour le travail comme pour les sorties.'
        : 'Premium comfort with free Data connection. Modern vehicles for 3 people, for work or outings.',
      accentColor: '#007AFF',
      lightBg: '#eff6ff',
      lightBorder: '#bfdbfe',
      images: [
        '/vehicles/smartcabb_confort/Confort_1.jpg',
        '/vehicles/smartcabb_confort/Confort_2.jpg',
        '/vehicles/smartcabb_confort/Confort_3.jpg',
        '/vehicles/smartcabb_confort/Confort_4.jpg',
        '/vehicles/smartcabb_confort/Confort_5.jpg',
        '/vehicles/smartcabb_confort/Confort_6.jpg',
      ],
      vehicules: 'Toyota Mark, Toyota Crown, Mercedes C-Class, Harrier, Toyota Vanguard, Nissan Juke',
      features: [
        { text: '3 places', detail: 'Spacieux' },
        { text: 'Climatisé', detail: 'Premium' },
        { text: 'Data gratuit', detail: 'Haut débit' },
        { text: 'Sécurisé', detail: 'Assuré' },
      ],
      ideal: [],
      price: '25 000 FC/h',
      priceNote: fr ? 'Course immédiate' : 'Immediate ride',
      reservationOnly: false,
      popular: true,
    },
    {
      id: 'familia',
      name: 'SmartCabb Familia',
      badge: 'FAMILIA',
      tagline: fr ? 'Voyagez ensemble. Voyagez confortablement' : 'Travel together. Travel comfortably',
      headline: fr ? 'Pour toute la famille' : 'For the whole family',
      description: fr
        ? "Vous êtes en famille, entre amis ou en groupe, SmartCabb vous offre l'espace et le confort qu'il vous faut. Notre catégorie Familial, composée de véhicules 7 places et climatisés, est pensée pour vous accompagner dans vos déplacements en toute sérénité."
        : 'Family, friends or group: SmartCabb gives you the space and comfort you need. Our Familial category, with 7-seat air-conditioned vehicles, is designed for worry-free travel.',
      accentColor: '#007AFF',
      lightBg: '#f0fdf4',
      lightBorder: '#bbf7d0',
      images: [
        '/vehicles/smartcabb_familiale/Familiale_1.jpg',
        '/vehicles/smartcabb_familiale/Familiale_2.jpg',
        '/vehicles/smartcabb_familiale/Familiale_3.jpg',
      ],
      vehicules: 'Noah, Alphard, Voxy',
      features: [
        { text: '7 places', detail: 'Grand espace' },
        { text: 'Climatisé', detail: 'Double zone' },
        { text: 'Data gratuit', detail: 'Partagé' },
        { text: 'Sécurisé', detail: 'Famille' },
      ],
      ideal: fr
        ? ['Déplacements en famille', 'Sorties entre amis', 'Transferts aéroport – hôtel – domicile', 'Tourisme et excursions', 'Sorties et événements']
        : ['Family trips', 'Outings with friends', 'Airport–hotel–home transfers', 'Tourism and excursions', 'Outings and events'],
      strengths: fr ? 'Spacieux • Climatisé • Propre • Confortable' : 'Spacious • Air-conditioned • Clean • Comfortable',
      price: '100 $/jour',
      priceNote: fr ? 'Sur réservation' : 'By reservation',
      reservationOnly: true,
      popular: false,
    },
    {
      id: 'business',
      name: 'SmartCabb Business',
      badge: 'BUSINESS',
      tagline: fr ? "L'élégance et le confort, à chaque déplacement" : 'Elegance and comfort, every ride',
      headline: fr ? 'Le summum du standing' : 'The height of standing',
      description: fr
        ? "Pour vos rendez-vous professionnels, vos cérémonies ou vos événements particuliers, choisissez une mobilité à la hauteur de vos exigences. La catégorie Business, avec des véhicules de 3 à 5 places, vous offre une expérience alliant confort, élégance et standing."
        : 'For business meetings, ceremonies or special events, choose mobility that matches your standards. The Business category, with 3 to 5-seat vehicles, blends comfort, elegance and standing.',
      accentColor: '#007AFF',
      lightBg: '#fff7ed',
      lightBorder: '#fed7aa',
      images: [
        '/vehicles/smartcabb_business/Business_1.jpg',
        '/vehicles/smartcabb_business/Business_2.jpg',
      ],
      vehicules: 'Prado, Fortuner',
      features: [
        { text: '4 places', detail: 'VIP' },
        { text: 'Rafraîchissement', detail: 'Offert' },
        { text: 'Data gratuit', detail: 'Premium' },
        { text: 'Sécurisé', detail: 'Chauffeur privé' },
      ],
      ideal: fr
        ? ["Rendez-vous d'affaires", 'Déplacements professionnels', 'Mariages', 'Cérémonies et événements', 'Tourisme et excursions']
        : ['Business meetings', 'Professional travel', 'Weddings', 'Ceremonies and events', 'Tourism and excursions'],
      strengths: fr ? 'Élégant • Confortable • Professionnel • Premium' : 'Elegant • Comfortable • Professional • Premium',
      price: '160 $/jour',
      priceNote: fr ? 'Sur réservation' : 'By reservation',
      reservationOnly: true,
      popular: false,
    },
  ];

  const reservations = [
    {
      icon: '✈️',
      title: fr ? 'Transfert Aéroport' : 'Airport Transfer',
      lines: fr
        ? ['Standard : 40 $', 'Confort : 50 $', 'Familiale : 65 $']
        : ['Standard: $40', 'Confort: $50', 'Familiale: $65'],
      note: fr ? 'Prix fixe aller simple. Frais de stationnement à l’aéroport à votre charge.' : 'Fixed one-way price. Airport parking fees at your charge.',
    },
    {
      icon: '📅',
      title: fr ? 'Location journalière (07h00 – 21h00)' : 'Daily rental (7am – 9pm)',
      lines: fr
        ? ['Standard : 60 $ / jour', 'Confort : 80 $ / jour', 'Familiale : 100 $ / jour', 'Business : 160 $ / jour']
        : ['Standard: $60 / day', 'Confort: $80 / day', 'Familiale: $100 / day', 'Business: $160 / day'],
      note: fr ? 'Heure supplémentaire après 21h00 : 10 $/h. Carburant à votre charge.' : 'Extra hour after 9pm: $10/h. Fuel at your charge.',
    },
    {
      icon: '🛣️',
      title: fr ? 'Hors Kinshasa' : 'Outside Kinshasa',
      lines: fr ? ['Tarif sur devis selon destination'] : ['Quote-based fare by destination'],
      note: fr ? 'À votre charge : carburant, péages, hébergement et restauration du chauffeur si besoin.' : 'At your charge: fuel, tolls, driver accommodation and meals if needed.',
    },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'white' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        * { font-family: 'Inter', sans-serif !important; }
        .section-label { font-size: 12px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #007AFF; margin-bottom: 12px; }
        @keyframes slideInUp { from { opacity: 0; transform: translateY(32px); } to { opacity: 1; transform: translateY(0); } }
        .anim-up { animation: slideInUp 0.6s ease forwards; }
        .service-card { transition: box-shadow 0.3s ease; }
        .service-card:hover { box-shadow: 0 8px 40px rgba(0,0,0,0.1); }
        .feature-item { padding: 14px 16px; border: 1px solid #e5e7eb; border-radius: 10px; transition: all 0.2s; }
        .feature-item:hover { border-color: #007AFF; background: #E0E0E0; }
        .card-hidden { opacity: 0; transform: translateY(40px); }
        .card-visible { opacity: 1; transform: translateY(0); transition: all 0.6s ease; }
        .nav-pill { padding: 8px 20px; border-radius: 6px; font-size: 14px; font-weight: 600; text-decoration: none; transition: all 0.2s; border: 1px solid #e5e7eb; color: #374151; background: white; }
        .nav-pill:hover { border-color: #007AFF; color: #007AFF; }
        .nav-pill.active { background: #007AFF; color: white; border-color: #007AFF; }
        .btn-book { display: inline-flex; align-items: center; gap: 8px; padding: 12px 24px; background: #007AFF; color: white; font-weight: 700; font-size: 14px; border-radius: 8px; text-decoration: none; transition: all 0.2s; box-shadow: 0 4px 16px rgba(0,122,255,0.25); }
        .btn-book:hover { background: #0066d6; }
        .btn-reserve { display: inline-flex; align-items: center; gap: 8px; padding: 12px 24px; background: white; color: #007AFF; font-weight: 700; font-size: 14px; border-radius: 8px; text-decoration: none; transition: all 0.2s; border: 2px solid #007AFF; }
        .btn-reserve:hover { background: #E0E0E0; }
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
            <h1 style={{ fontSize: '48px', fontWeight: '900', color: '#222222', lineHeight: '1.1', marginBottom: '16px' }}>
              {fr ? 'Choisissez votre' : 'Choose your'}<br />
              <span style={{ color: '#007AFF' }}>{fr ? 'expérience' : 'experience'}</span>
            </h1>
            <p style={{ fontSize: '18px', color: '#6b7280', lineHeight: '1.7', maxWidth: '520px', marginBottom: '40px' }}>
              {t('services.subtitle')}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {services.map((s, i) => (
                <a key={i} href={`#${s.id}`} onClick={() => setActiveService(i)}
                  className={`nav-pill ${activeService === i ? 'active' : ''}`}>
                  {s.name}
                </a>
              ))}
              <a href="#reservations" className="nav-pill">{fr ? 'Réservations' : 'Reservations'}</a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* SERVICES */}
      <section style={{ padding: '64px 0 32px' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
            {services.map((service, index) => {
              const isVisible = visibleServices.includes(index);
              const isEven = index % 2 === 0;
              return (
                <div key={service.id} id={service.id}
                  ref={el => serviceRefs.current[index] = el}
                  className={`card-hidden ${isVisible ? 'card-visible' : ''}`}
                  style={{ transitionDelay: `${index * 0.05}s` }}>
                  <div className="service-card" style={{
                    border: '1px solid #e5e7eb', borderRadius: '20px', overflow: 'hidden',
                    background: 'white', borderTop: `3px solid ${service.accentColor}`,
                  }}>
                    <div style={{ padding: '40px', position: 'relative' }}>
                      <div style={{
                        position: 'absolute', bottom: '24px', right: '32px',
                        fontSize: '96px', fontWeight: '900', color: service.lightBg,
                        lineHeight: '1', userSelect: 'none', zIndex: 0,
                      }}>
                        {String(index + 1).padStart(2, '0')}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px', alignItems: 'center', position: 'relative', zIndex: 1 }}
                        className="lg:grid-cols-2">
                        <div className={isVisible ? 'anim-up' : ''} style={{ order: isEven ? 1 : 2 }}>
                          <div style={{ borderRadius: '14px', overflow: 'hidden', border: '1px solid #f3f4f6' }}>
                            <ImageCarousel images={service.images} serviceName={service.name} />
                          </div>
                        </div>
                        <div className={isVisible ? 'anim-up' : ''} style={{ order: isEven ? 2 : 1 }}>
                          <div style={{ display: 'inline-block', padding: '4px 12px', background: service.lightBg, border: `1px solid ${service.lightBorder}`, borderRadius: '6px', fontSize: '11px', fontWeight: '800', color: service.accentColor, letterSpacing: '0.08em', marginBottom: '16px' }}>
                            {service.badge}
                          </div>
                          <h2 style={{ fontSize: '30px', fontWeight: '900', color: '#222222', marginBottom: '6px' }}>{service.name}</h2>
                          <p style={{ fontSize: '14px', fontWeight: '600', color: service.accentColor, marginBottom: '12px' }}>{service.tagline}</p>
                          <p style={{ fontSize: '15px', color: '#4b5563', lineHeight: '1.7', marginBottom: '20px' }}>
                            {service.description}
                          </p>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                            {service.features.map((f, idx) => (
                              <div key={idx} className="feature-item">
                                <div style={{ fontSize: '14px', fontWeight: '700', color: '#222222' }}>{f.text}</div>
                                <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>{f.detail}</div>
                              </div>
                            ))}
                          </div>
                          {service.ideal.length > 0 && (
                            <div style={{ marginBottom: '20px' }}>
                              <div style={{ fontSize: '11px', fontWeight: '800', color: '#9ca3af', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>
                                {fr ? 'Idéal pour' : 'Ideal for'}
                              </div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {service.ideal.map((tag, idx) => (
                                  <span key={idx} style={{ fontSize: '12px', fontWeight: '600', color: '#007AFF', background: '#E0E0E0', borderRadius: '6px', padding: '5px 10px' }}>
                                    {tag}
                                  </span>
                                ))}
                              </div>
                              {(service as any).strengths && (
                                <p style={{ fontSize: '13px', color: '#4b5563', fontWeight: '600', marginTop: '10px' }}>
                                  {(service as any).strengths}
                                </p>
                              )}
                            </div>
                          )}
                          <div style={{ padding: '14px 18px', background: '#fafafa', border: '1px solid #f3f4f6', borderRadius: '10px', marginBottom: '24px' }}>
                            <div style={{ fontSize: '11px', fontWeight: '800', color: '#9ca3af', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px' }}>
                              {fr ? 'Véhicules' : 'Vehicles'}
                            </div>
                            <div style={{ fontSize: '13px', color: '#4b5563', fontWeight: '500' }}>{service.vehicules}</div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '20px', borderTop: '1px solid #f3f4f6', flexWrap: 'wrap', gap: '16px' }}>
                            <div>
                              <div style={{ fontSize: '11px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
                                {fr ? 'À partir de' : 'From'}
                              </div>
                              <div style={{ fontSize: '22px', fontWeight: '900', color: service.accentColor, whiteSpace: 'nowrap' }}>
                                {service.price}
                              </div>
                              <div style={{ fontSize: '12px', color: '#9ca3af' }}>{service.priceNote}</div>
                            </div>
                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                              {!service.reservationOnly && (
                                <Link to={BOOK_URL} className="btn-book">
                                  {fr ? 'Commander maintenant' : 'Book now'}
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                                </Link>
                              )}
                              <a href={RESERVE_URL} className="btn-reserve">
                                📅 {fr ? 'Réserver' : 'Reserve'}
                              </a>
                            </div>
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

      {/* RÉSERVATIONS */}
      <section id="reservations" style={{ padding: '32px 0 96px' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <p className="section-label">{fr ? 'Tarifs officiels' : 'Official rates'}</p>
          <h2 style={{ fontSize: '32px', fontWeight: '900', color: '#222222', marginBottom: '8px' }}>
            {fr ? 'Réservation SmartCabb' : 'SmartCabb Reservation'}
          </h2>
          <p style={{ fontSize: '15px', color: '#6b7280', marginBottom: '28px', maxWidth: '640px', lineHeight: '1.7' }}>
            {fr
              ? 'Aéroport, journée complète ou hors Kinshasa : réservez à l’avance. Acompte de 50 % pour confirmer.'
              : 'Airport, full day or outside Kinshasa: book in advance. 50% deposit to confirm.'}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            {reservations.map((r, i) => (
              <div key={i} className="service-card" style={{ border: '1px solid #e5e7eb', borderRadius: '16px', padding: '28px', background: 'white' }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>{r.icon}</div>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#222222', marginBottom: '12px' }}>{r.title}</h3>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px 0' }}>
                  {r.lines.map((l: string, j: number) => (
                    <li key={j} style={{ fontSize: '14px', fontWeight: '700', color: '#007AFF', padding: '6px 0', borderBottom: j < r.lines.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                      {l}
                    </li>
                  ))}
                </ul>
                <p style={{ fontSize: '13px', color: '#6b7280', lineHeight: '1.6', marginBottom: '20px' }}>{r.note}</p>
                <a href={RESERVE_URL} className="btn-reserve" style={{ width: '100%', justifyContent: 'center' }}>
                  📅 {fr ? 'Réserver une course' : 'Book a ride'}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '80px 0', background: '#007AFF' }}>
        <div className="max-w-4xl mx-auto px-6" style={{ textAlign: 'center' }}>
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} viewport={{ once: true }}>
            <h2 style={{ fontSize: '42px', fontWeight: '900', color: 'white', marginBottom: '16px', lineHeight: '1.2' }}>{t('cta.title')}</h2>
            <p style={{ fontSize: '18px', color: 'rgba(255,255,255,0.8)', marginBottom: '36px' }}>{t('cta.subtitle')}</p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to={BOOK_URL} className="inline-block px-8 py-4 bg-white text-cyan-600 font-bold rounded-full hover:shadow-2xl hover:scale-105 transition-all text-lg">
                {fr ? 'Commander une course' : 'Book a ride'}
              </Link>
              <a href={RESERVE_URL} className="inline-block px-8 py-4 font-bold rounded-full hover:scale-105 transition-all text-lg"
                style={{ border: '2px solid white', color: 'white' }}>
                📅 {fr ? 'Réserver à l’avance' : 'Book in advance'}
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      <ProfessionalFooter />
      <ChatWidget />
    </div>
  );
}
