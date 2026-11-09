/**
 * 📅 PAGE PUBLIQUE — RÉSERVER VOTRE CHAUFFEUR
 *
 * Page de conversion dédiée au bouton « Réserver votre chauffeur » de la page
 * d'accueil. Elle détaille la réservation à l'avance (date, heure, catégorie,
 * acompte 50 %) puis envoie vers `/app/passenger?screen=scheduled-rides`.
 *
 * @version 1.0.0
 */

import { ChatWidget } from '../components/ChatWidget';
import { ProfessionalFooter } from '../components/ProfessionalFooter';
import { SiteNavigation } from '../components/SiteNavigation';
import { PageHero } from '../components/PageHero';
import { useLanguage } from '../contexts/LanguageContext';
import { Link } from '../lib/simple-router';
import { LandingKitStyles, SITE_BLUE, useInViewCustom } from '../components/public/LandingKit';

const RESERVE_URL = '/app/passenger?screen=scheduled-rides';
const APP_URL = '/app/passenger?screen=map';

export function BookDriverPage() {
  const { language } = useLanguage();
  const fr = language === 'fr';

  const { ref: usesRef, inView: usesIn } = useInViewCustom(0.12);
  const { ref: stepsRef, inView: stepsIn } = useInViewCustom(0.12);
  const { ref: catsRef, inView: catsIn } = useInViewCustom(0.12);
  const { ref: faqRef, inView: faqIn } = useInViewCustom(0.12);

  const useCases = fr
    ? [
        { icon: '✈️', t: 'Aéroport de N’djili', d: 'Prise en charge ou dépôt à l’heure exacte de votre vol, sans stress.' },
        { icon: '💍', t: 'Mariages & cérémonies', d: 'Un véhicule propre et un chauffeur en tenue, à votre disposition.' },
        { icon: '👨‍👩‍👧‍👦', t: 'Sorties en famille', d: 'Véhicules 7 places pour voyager ensemble avec bagages.' },
        { icon: '💼', t: 'Déplacements d’affaires', d: 'Chauffeur privé, ponctualité et discrétion pour vos rendez-vous.' },
        { icon: '🛣️', t: 'Hors de Kinshasa', d: 'Excursions et trajets inter-villes sur devis personnalisé.' },
        { icon: '🎉', t: 'Événements & groupes', d: 'Plusieurs véhicules coordonnés pour vos invités.' },
      ]
    : [
        { icon: '✈️', t: 'N’djili airport', d: 'Pickup or drop-off at your exact flight time, stress-free.' },
        { icon: '💍', t: 'Weddings & ceremonies', d: 'A clean vehicle and a smartly dressed driver at your service.' },
        { icon: '👨‍👩‍👧‍👦', t: 'Family outings', d: '7-seat vehicles to travel together with luggage.' },
        { icon: '💼', t: 'Business travel', d: 'Private driver, punctuality and discretion for your meetings.' },
        { icon: '🛣️', t: 'Outside Kinshasa', d: 'Excursions and intercity trips with a custom quote.' },
        { icon: '🎉', t: 'Events & groups', d: 'Several coordinated vehicles for your guests.' },
      ];

  const steps = fr
    ? [
        { n: '01', t: 'Choisissez date, heure et catégorie', d: 'Indiquez vos adresses et le motif : journée, aéroport ou hors ville.' },
        { n: '02', t: 'Confirmez avec un acompte de 50 %', d: 'Par mobile money, portefeuille SmartCabb ou espèces. La réservation est alors ferme.' },
        { n: '03', t: 'Recevez votre chauffeur', d: 'Nom, photo, véhicule et plaque communiqués avant la prise en charge, avec rappel automatique.' },
      ]
    : [
        { n: '01', t: 'Pick date, time and category', d: 'Enter your addresses and the purpose: daily rental, airport or out of town.' },
        { n: '02', t: 'Confirm with a 50% deposit', d: 'By mobile money, SmartCabb wallet or cash. Your booking then becomes firm.' },
        { n: '03', t: 'Meet your driver', d: 'Name, photo, vehicle and plate shared before pickup, with an automatic reminder.' },
      ];

  const categories = fr
    ? [
        { name: 'Standard', seats: '3 places', price: '60 $ / jour', desc: 'L’essentiel climatisé pour vos rendez-vous et trajets du quotidien.' },
        { name: 'Confort', seats: '3 places', price: '80 $ / jour', desc: 'Climatisation premium et data internet, idéal pour le travail.' },
        { name: 'Familiale', seats: '7 places', price: '100 $ / jour', desc: 'Grand espace et bagages pour les familles et les groupes.' },
        { name: 'Business', seats: '4 places VIP', price: '160 $ / jour', desc: 'Chauffeur privé, rafraîchissements et service premium.' },
      ]
    : [
        { name: 'Standard', seats: '3 seats', price: '$60 / day', desc: 'Air-conditioned essentials for meetings and daily trips.' },
        { name: 'Comfort', seats: '3 seats', price: '$80 / day', desc: 'Premium A/C and free data, ideal for work.' },
        { name: 'Family', seats: '7 seats', price: '$100 / day', desc: 'Extra space and luggage for families and groups.' },
        { name: 'Business', seats: '4 VIP seats', price: '$160 / day', desc: 'Private driver, refreshments and premium service.' },
      ];

  const airport = fr
    ? [
        { name: 'Standard', price: '40 $' },
        { name: 'Confort', price: '50 $' },
        { name: 'Familiale', price: '65 $' },
        { name: 'Business', price: '160 $' },
      ]
    : [
        { name: 'Standard', price: '$40' },
        { name: 'Comfort', price: '$50' },
        { name: 'Family', price: '$65' },
        { name: 'Business', price: '$160' },
      ];

  const included = fr
    ? [
        'Chauffeur professionnel vérifié',
        'Véhicule assuré, propre et climatisé',
        'Suivi GPS et partage du trajet',
        'Rappel automatique avant la prise en charge',
        'Support client 24/7',
        'Bouton SOS pendant toute la prestation',
      ]
    : [
        'Verified professional driver',
        'Insured, clean and air-conditioned vehicle',
        'GPS tracking and trip sharing',
        'Automatic reminder before pickup',
        '24/7 customer support',
        'SOS button throughout the service',
      ];

  const faq = fr
    ? [
        { q: 'Pourquoi un acompte de 50 % ?', a: 'Il bloque le véhicule et le chauffeur pour votre date. Le solde est réglé à la fin de la prestation, selon le mode convenu.' },
        { q: 'Puis-je annuler ou modifier ma réservation ?', a: 'Oui, contactez le support le plus tôt possible. Les conditions d’annulation dépendent du délai restant avant la prise en charge.' },
        { q: 'Le carburant est-il inclus ?', a: 'Pour la location à la journée, le carburant est à votre charge. Pour l’aéroport, le prix affiché est un forfait fixe aller simple.' },
        { q: 'Que se passe-t-il si mon vol est retardé ?', a: 'Prévenez le support : nous adaptons la prise en charge selon la disponibilité du chauffeur.' },
      ]
    : [
        { q: 'Why a 50% deposit?', a: 'It reserves the vehicle and driver for your date. The balance is paid at the end of the service, using the agreed method.' },
        { q: 'Can I cancel or change my booking?', a: 'Yes, contact support as early as possible. Cancellation terms depend on the time left before pickup.' },
        { q: 'Is fuel included?', a: 'For daily rental, fuel is at your charge. For airport transfers, the displayed price is a fixed one-way fare.' },
        { q: 'What if my flight is delayed?', a: 'Let support know: we adapt the pickup according to the driver’s availability.' },
      ];

  return (
    <div style={{ minHeight: '100vh', background: '#F7F9FC' }}>
      <LandingKitStyles />
      <SiteNavigation />

      <PageHero
        image="/hero-driver.jpg"
        fallbackImage="/photo_conducteur_smartcabb2026.jpeg"
        title={
          fr ? (
            <>
              Réservez votre chauffeur,
              <br />
              à l’avance.
            </>
          ) : (
            <>
              Book your driver,
              <br />
              in advance.
            </>
          )
        }
        subtitle={
          fr
            ? 'Aéroport, mariage, famille ou déplacement d’affaires : planifiez votre trajet, choisissez votre catégorie et voyagez l’esprit tranquille.'
            : 'Airport, wedding, family or business trip: plan your ride, choose your category and travel with peace of mind.'
        }
        minHeight="620px"
      >
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '36px' }}>
          <Link to={RESERVE_URL} className="lk-btn lk-glow">
            {fr ? 'Réserver maintenant' : 'Book now'}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
          <a
            href="tel:+243960624008"
            className="lk-btn-outline"
            style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', borderColor: 'rgba(255,255,255,0.55)' }}
          >
            📞 {fr ? 'Parler à un conseiller' : 'Talk to an advisor'}
          </a>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {(fr
            ? ['Chauffeur attitré', 'Acompte 50 %', 'Annulation selon conditions']
            : ['Dedicated driver', '50% deposit', 'Cancellation per terms']
          ).map((tag) => (
            <span key={tag} className="lk-tag" style={{ background: 'rgba(255,255,255,0.12)', borderColor: 'rgba(255,255,255,0.3)', color: '#fff' }}>
              ✓ {tag}
            </span>
          ))}
        </div>
      </PageHero>

      {/* CAS D'USAGE */}
      <section ref={usesRef as any} style={{ padding: '80px 0', background: '#fff', borderBottom: '1px solid #f1f5f9' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div style={{ marginBottom: '44px' }}>
            <div className={`lk-accent lk-reveal lk-d0 ${usesIn ? 'in' : ''}`} />
            <h2 className={`lk-reveal lk-d1 ${usesIn ? 'in' : ''}`} style={{ fontSize: 'clamp(30px,4vw,40px)', fontWeight: 900, color: '#222', marginBottom: '12px' }}>
              {fr ? 'Pour tous vos ' : 'For all your '}
              <span style={{ color: SITE_BLUE }}>{fr ? 'trajets planifiés' : 'planned trips'}</span>
            </h2>
            <p className={`lk-reveal lk-d2 ${usesIn ? 'in' : ''}`} style={{ fontSize: '16px', color: '#6b7280', maxWidth: '560px' }}>
              {fr
                ? 'Réservez à l’avance et ne dépendez plus de la disponibilité du dernier moment.'
                : 'Book ahead and stop depending on last-minute availability.'}
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '16px' }}>
            {useCases.map((item, i) => (
              <div key={item.t} className={`lk-card lk-reveal ${usesIn ? 'in' : ''}`} style={{ padding: '22px', transitionDelay: `${0.05 + i * 0.08}s` }}>
                <div style={{ fontSize: '26px', marginBottom: '10px' }}>{item.icon}</div>
                <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#222', marginBottom: '6px' }}>{item.t}</h3>
                <p style={{ fontSize: '13px', color: '#6b7280', lineHeight: 1.55 }}>{item.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMMENT RÉSERVER */}
      <section ref={stepsRef as any} style={{ padding: '80px 0', background: '#FAFAFA', borderBottom: '1px solid #f1f5f9' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div style={{ marginBottom: '44px' }}>
            <div className={`lk-accent lk-reveal lk-d0 ${stepsIn ? 'in' : ''}`} />
            <h2 className={`lk-reveal lk-d1 ${stepsIn ? 'in' : ''}`} style={{ fontSize: 'clamp(30px,4vw,40px)', fontWeight: 900, color: '#222', marginBottom: '12px' }}>
              {fr ? 'Une réservation en ' : 'A booking in '}
              <span style={{ color: SITE_BLUE }}>{fr ? '3 étapes' : '3 steps'}</span>
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '20px' }}>
            {steps.map((step, i) => (
              <div key={step.n} className={`lk-step lk-reveal ${stepsIn ? 'in' : ''}`} style={{ transitionDelay: `${0.1 + i * 0.12}s` }}>
                <div style={{
                  position: 'absolute', top: '-18px', left: '50%', transform: 'translateX(-50%)',
                  width: '36px', height: '36px', borderRadius: '50%', background: SITE_BLUE, color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 900,
                  boxShadow: '0 4px 12px rgba(0,122,255,0.4)',
                }}>
                  {step.n}
                </div>
                <div style={{ marginTop: '16px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#222', marginBottom: '8px' }}>{step.t}</h3>
                  <p style={{ fontSize: '13px', color: '#9ca3af', lineHeight: 1.6 }}>{step.d}</p>
                </div>
              </div>
            ))}
          </div>

          <div className={`lk-reveal lk-d4 ${stepsIn ? 'in' : ''}`} style={{ textAlign: 'center', marginTop: '44px' }}>
            <Link to={RESERVE_URL} className="lk-btn">{fr ? 'Réserver mon chauffeur' : 'Book my driver'}</Link>
          </div>
        </div>
      </section>

      {/* TARIFS */}
      <section ref={catsRef as any} style={{ padding: '80px 0', background: '#fff', borderBottom: '1px solid #f1f5f9' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div style={{ marginBottom: '40px' }}>
            <div className={`lk-accent lk-reveal lk-d0 ${catsIn ? 'in' : ''}`} />
            <h2 className={`lk-reveal lk-d1 ${catsIn ? 'in' : ''}`} style={{ fontSize: 'clamp(30px,4vw,40px)', fontWeight: 900, color: '#222', marginBottom: '12px' }}>
              {fr ? 'Tarifs ' : 'Pricing '}
              <span style={{ color: SITE_BLUE }}>{fr ? 'de réservation' : 'for bookings'}</span>
            </h2>
            <p className={`lk-reveal lk-d2 ${catsIn ? 'in' : ''}`} style={{ fontSize: '16px', color: '#6b7280', maxWidth: '620px' }}>
              {fr
                ? 'Location à la journée (07h00–21h00, carburant à votre charge) ou transfert aéroport au forfait. Le montant exact est confirmé dans l’application.'
                : 'Daily rental (7am–9pm, fuel at your charge) or fixed airport transfer. The exact amount is confirmed in the app.'}
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px', marginBottom: '32px' }}>
            {categories.map((cat, i) => (
              <div key={cat.name} className={`lk-card lk-reveal ${catsIn ? 'in' : ''}`} style={{ padding: '22px', transitionDelay: `${0.05 + i * 0.08}s` }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px' }}>
                  <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#222' }}>{cat.name}</h3>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#9ca3af' }}>{cat.seats}</span>
                </div>
                <p style={{ fontSize: '20px', fontWeight: 900, color: SITE_BLUE, margin: '8px 0 10px' }}>{cat.price}</p>
                <p style={{ fontSize: '13px', color: '#6b7280', lineHeight: 1.55 }}>{cat.desc}</p>
              </div>
            ))}
          </div>

          <div className={`lk-card lk-reveal ${catsIn ? 'in' : ''}`} style={{ padding: '22px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#222', marginBottom: '12px' }}>
              ✈️ {fr ? 'Transfert aéroport — forfait aller simple' : 'Airport transfer — fixed one-way fare'}
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {airport.map((item) => (
                <span key={item.name} style={{ fontSize: '13px', color: '#334155', background: '#F1F5F9', borderRadius: '10px', padding: '9px 14px' }}>
                  <b>{item.name}</b> · {item.price}
                </span>
              ))}
            </div>
            <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '12px' }}>
              {fr
                ? 'Frais de stationnement à l’aéroport à votre charge. Hors Kinshasa : tarif sur devis.'
                : 'Airport parking fees at your charge. Outside Kinshasa: quote-based fare.'}
            </p>
          </div>
        </div>
      </section>

      {/* INCLUS */}
      <section style={{ padding: '72px 0', background: '#FAFAFA', borderBottom: '1px solid #f1f5f9' }}>
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <div style={{ textAlign: 'center', marginBottom: '36px' }}>
            <div className="lk-accent center" />
            <h2 style={{ fontSize: 'clamp(28px,4vw,36px)', fontWeight: 900, color: '#222' }}>
              {fr ? 'Ce qui est inclus' : 'What is included'}
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '12px' }}>
            {included.map((item) => (
              <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '14px 16px' }}>
                <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#EAF3FF', color: SITE_BLUE, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, flexShrink: 0 }}>✓</span>
                <span style={{ fontSize: '14px', color: '#374151', fontWeight: 600 }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section ref={faqRef as any} style={{ padding: '80px 0', background: '#fff' }}>
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <div style={{ marginBottom: '36px', textAlign: 'center' }}>
            <div className={`lk-accent center lk-reveal lk-d0 ${faqIn ? 'in' : ''}`} />
            <h2 className={`lk-reveal lk-d1 ${faqIn ? 'in' : ''}`} style={{ fontSize: 'clamp(28px,4vw,36px)', fontWeight: 900, color: '#222' }}>
              {fr ? 'Questions fréquentes' : 'Frequently asked questions'}
            </h2>
          </div>

          <div style={{ display: 'grid', gap: '12px' }}>
            {faq.map((item, i) => (
              <details
                key={item.q}
                className={`lk-card lk-faq lk-reveal ${faqIn ? 'in' : ''}`}
                style={{ padding: '18px 22px', transitionDelay: `${0.05 + i * 0.06}s` }}
              >
                <summary style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', fontWeight: 700, color: '#222', fontSize: '15px' }}>
                  {item.q}
                  <svg className="lk-faq-chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={SITE_BLUE} strokeWidth="2.5" style={{ flexShrink: 0, transition: 'transform .2s' }}>
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </summary>
                <p style={{ marginTop: '12px', fontSize: '14px', color: '#6b7280', lineHeight: 1.65 }}>{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section style={{ padding: '80px 0', background: SITE_BLUE }}>
        <div className="max-w-4xl mx-auto px-6" style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(30px,4.5vw,42px)', fontWeight: 900, color: '#fff', marginBottom: '14px', lineHeight: 1.15 }}>
            {fr ? 'Planifions votre prochain trajet' : 'Let’s plan your next trip'}
          </h2>
          <p style={{ fontSize: '17px', color: 'rgba(255,255,255,0.85)', marginBottom: '32px', lineHeight: 1.6 }}>
            {fr
              ? 'Choisissez votre date, votre véhicule et confirmez avec un acompte de 50 %.'
              : 'Choose your date, your vehicle and confirm with a 50% deposit.'}
          </p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <Link to={RESERVE_URL} className="lk-btn-light">
              {fr ? 'Réserver mon chauffeur' : 'Book my driver'}
            </Link>
            <Link to={APP_URL} className="lk-btn-light" style={{ background: 'rgba(255,255,255,0.14)', color: '#fff' }}>
              {fr ? 'Commander une course' : 'Order a ride'}
            </Link>
          </div>
        </div>
      </section>

      <ProfessionalFooter />
      <ChatWidget />
    </div>
  );
}
