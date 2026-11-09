/**
 * 🚕 PAGE PUBLIQUE — COMMANDER UNE COURSE
 *
 * Page de conversion dédiée au bouton « Commander une course » de la page
 * d'accueil. Elle présente le service, les catégories et les garanties, puis
 * envoie vers l'application passager (`/app/passenger?screen=map`).
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

const APP_URL = '/app/passenger?screen=map';
const RESERVE_URL = '/reserver';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.smartcabb.app';

export function OrderRidePage() {
  const { language } = useLanguage();
  const fr = language === 'fr';

  const { ref: stepsRef, inView: stepsIn } = useInViewCustom(0.12);
  const { ref: catsRef, inView: catsIn } = useInViewCustom(0.12);
  const { ref: whyRef, inView: whyIn } = useInViewCustom(0.12);
  const { ref: faqRef, inView: faqIn } = useInViewCustom(0.12);

  const steps = fr
    ? [
        { n: '01', t: 'Indiquez votre destination', d: 'Ouvrez l’application, choisissez votre point de départ et votre destination sur la carte.' },
        { n: '02', t: 'Choisissez votre catégorie', d: 'Standard, Confort, Familiale ou Business : le prix s’affiche avant validation.' },
        { n: '03', t: 'Roulez avec un chauffeur vérifié', d: 'Un chauffeur proche accepte, vous suivez son arrivée en direct et payez à la fin.' },
      ]
    : [
        { n: '01', t: 'Enter your destination', d: 'Open the app, pick your pickup point and destination on the map.' },
        { n: '02', t: 'Choose your category', d: 'Standard, Comfort, Family or Business: the fare is shown before you confirm.' },
        { n: '03', t: 'Ride with a verified driver', d: 'A nearby driver accepts, you track their arrival live and pay at the end.' },
      ];

  const categories = [
    {
      icon: '🚗',
      name: 'Standard',
      seats: fr ? '3 places' : '3 seats',
      features: fr ? ['Climatisation', 'GPS', 'Le meilleur prix'] : ['Air conditioning', 'GPS', 'Best price'],
      image: '/vehicles/smartcabb_standard/Standard_1.jpg',
      from: fr ? 'dès 6 $/h' : 'from $6/h',
      badge: fr ? 'Le quotidien' : 'Everyday',
    },
    {
      icon: '✨',
      name: 'Confort',
      seats: fr ? '3 places' : '3 seats',
      features: fr ? ['Climatisation premium', 'Data internet', 'Véhicules récents'] : ['Premium A/C', 'Free data', 'Recent vehicles'],
      image: '/vehicles/smartcabb_confort/Confort_1.jpg',
      from: fr ? 'dès 10 $/h' : 'from $10/h',
      badge: fr ? 'Le plus populaire' : 'Most popular',
    },
    {
      icon: '👨‍👩‍👧‍👦',
      name: fr ? 'Familiale' : 'Family',
      seats: fr ? '7 places' : '7 seats',
      features: fr ? ['Grand espace', 'Data internet', 'Bagages'] : ['Extra space', 'Free data', 'Luggage'],
      image: '/vehicles/smartcabb_familiale/Familiale_1.jpg',
      from: fr ? 'dès 12 $/h' : 'from $12/h',
      badge: fr ? 'En famille' : 'Family',
    },
    {
      icon: '👔',
      name: 'Business',
      seats: fr ? '4 places VIP' : '4 VIP seats',
      features: fr ? ['Chauffeur privé', 'Rafraîchissements', 'Service premium'] : ['Private driver', 'Refreshments', 'Premium service'],
      image: '/vehicles/smartcabb_business/Business_1.jpg',
      from: fr ? 'sur réservation' : 'by reservation',
      badge: fr ? 'Événements' : 'Events',
    },
  ];

  const benefits = fr
    ? [
        { icon: '🛡️', t: 'Chauffeurs vérifiés', d: 'Permis, véhicule et identité contrôlés avant toute mise en ligne.' },
        { icon: '💳', t: 'Paiement mobile money', d: 'M-Pesa, Orange Money, Airtel Money ou espèces, au choix.' },
        { icon: '📍', t: 'Suivi en temps réel', d: 'Position du chauffeur, itinéraire et heure d’arrivée à chaque instant.' },
        { icon: '💰', t: 'Prix affiché à l’avance', d: 'Aucune surprise : le tarif est validé avant le départ.' },
        { icon: '🆘', t: 'Bouton SOS intégré', d: 'Une alerte prioritaire transmise à l’équipe sécurité en un geste.' },
        { icon: '🕒', t: 'Disponible 24/7', d: 'Jour, nuit, week-end et jours fériés, à Kinshasa.' },
      ]
    : [
        { icon: '🛡️', t: 'Verified drivers', d: 'License, vehicle and identity checked before going online.' },
        { icon: '💳', t: 'Mobile money payment', d: 'M-Pesa, Orange Money, Airtel Money or cash — your choice.' },
        { icon: '📍', t: 'Live tracking', d: 'Driver position, route and ETA at every moment.' },
        { icon: '💰', t: 'Fare shown upfront', d: 'No surprises: the price is confirmed before departure.' },
        { icon: '🆘', t: 'Built-in SOS button', d: 'A priority alert sent to the security team in one tap.' },
        { icon: '🕒', t: 'Available 24/7', d: 'Day, night, weekends and public holidays, in Kinshasa.' },
      ];

  const faq = fr
    ? [
        { q: 'Ai-je besoin de créer un compte ?', a: 'Oui, un compte gratuit suffit. Il sécurise vos trajets, vos paiements et vous permet de retrouver votre historique.' },
        { q: 'Comment le prix est-il calculé ?', a: 'Le tarif dépend de la catégorie, de la distance et de l’heure (jour ou nuit). Il est affiché dans l’application avant la confirmation.' },
        { q: 'Puis-je payer en espèces ?', a: 'Oui. Vous pouvez régler en espèces, par portefeuille SmartCabb, M-Pesa, Orange Money ou Airtel Money.' },
        { q: 'Que se passe-t-il en cas de problème pendant la course ?', a: 'Le bouton SOS est disponible à tout moment. L’équipe sécurité reçoit votre position et peut vous appeler immédiatement.' },
      ]
    : [
        { q: 'Do I need an account?', a: 'Yes, a free account is enough. It secures your rides and payments, and keeps your history.' },
        { q: 'How is the fare calculated?', a: 'The fare depends on the category, distance and time (day or night). It is shown in the app before confirmation.' },
        { q: 'Can I pay in cash?', a: 'Yes. You can pay in cash, with the SmartCabb wallet, M-Pesa, Orange Money or Airtel Money.' },
        { q: 'What happens if something goes wrong during the ride?', a: 'The SOS button is always available. The security team receives your location and can call you immediately.' },
      ];

  return (
    <div style={{ minHeight: '100vh', background: '#F7F9FC' }}>
      <LandingKitStyles />
      <SiteNavigation />

      <PageHero
        image="/photo2_smartcabb.jpeg"
        fallbackImage="/fille_smartcabb.jpg"
        title={
          fr ? (
            <>
              Votre course,
              <br />
              en quelques minutes.
            </>
          ) : (
            <>
              Your ride,
              <br />
              in a few minutes.
            </>
          )
        }
        subtitle={
          fr
            ? 'Commandez depuis l’application, suivez votre chauffeur en direct et voyagez en toute sérénité à Kinshasa. Disponible 24/7.'
            : 'Order from the app, track your driver live and travel with peace of mind in Kinshasa. Available 24/7.'
        }
        minHeight="620px"
      >
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '36px' }}>
          <Link to={APP_URL} className="lk-btn lk-glow">
            {fr ? 'Commander maintenant' : 'Order now'}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
          <Link
            to={RESERVE_URL}
            className="lk-btn-outline"
            style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', borderColor: 'rgba(255,255,255,0.55)' }}
          >
            📅 {fr ? 'Réserver à l’avance' : 'Book in advance'}
          </Link>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '28px' }}>
          {(fr
            ? ['Paiement M-Pesa / Orange / Airtel', 'Chauffeurs vérifiés', 'Prix affiché à l’avance']
            : ['M-Pesa / Orange / Airtel payment', 'Verified drivers', 'Fare shown upfront']
          ).map((tag) => (
            <span key={tag} className="lk-tag" style={{ background: 'rgba(255,255,255,0.12)', borderColor: 'rgba(255,255,255,0.3)', color: '#fff' }}>
              ✓ {tag}
            </span>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '20px', maxWidth: '560px', borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: '22px' }}>
          {[
            { v: '150+', l: fr ? 'Chauffeurs actifs' : 'Active drivers' },
            { v: '1000+', l: fr ? 'Clients satisfaits' : 'Happy clients' },
            { v: '4,9/5', l: fr ? 'Note moyenne' : 'Average rating' },
          ].map((s) => (
            <div key={s.l}>
              <div style={{ color: '#fff', fontSize: '24px', fontWeight: 900 }}>{s.v}</div>
              <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: '12px', marginTop: '2px' }}>{s.l}</div>
            </div>
          ))}
        </div>
      </PageHero>

      {/* COMMENT ÇA MARCHE */}
      <section ref={stepsRef as any} style={{ padding: '80px 0', background: '#fff', borderBottom: '1px solid #f1f5f9' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div style={{ marginBottom: '44px' }}>
            <div className={`lk-accent lk-reveal lk-d0 ${stepsIn ? 'in' : ''}`} />
            <h2 className={`lk-reveal lk-d1 ${stepsIn ? 'in' : ''}`} style={{ fontSize: 'clamp(30px,4vw,40px)', fontWeight: 900, color: '#222', marginBottom: '12px' }}>
              {fr ? 'Commander en ' : 'Order in '}
              <span style={{ color: SITE_BLUE }}>{fr ? '3 étapes' : '3 steps'}</span>
            </h2>
            <p className={`lk-reveal lk-d2 ${stepsIn ? 'in' : ''}`} style={{ fontSize: '16px', color: '#6b7280', maxWidth: '560px' }}>
              {fr
                ? 'De l’ouverture de l’application à l’arrivée à destination, tout est pensé pour aller vite.'
                : 'From opening the app to arriving at your destination, everything is designed to be fast.'}
            </p>
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
        </div>
      </section>

      {/* CATÉGORIES */}
      <section ref={catsRef as any} style={{ padding: '80px 0', background: '#FAFAFA', borderBottom: '1px solid #f1f5f9' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div style={{ marginBottom: '44px' }}>
            <div className={`lk-accent lk-reveal lk-d0 ${catsIn ? 'in' : ''}`} />
            <h2 className={`lk-reveal lk-d1 ${catsIn ? 'in' : ''}`} style={{ fontSize: 'clamp(30px,4vw,40px)', fontWeight: 900, color: '#222', marginBottom: '12px' }}>
              {fr ? 'Une catégorie pour ' : 'A category for '}
              <span style={{ color: SITE_BLUE }}>{fr ? 'chaque trajet' : 'every trip'}</span>
            </h2>
            <p className={`lk-reveal lk-d2 ${catsIn ? 'in' : ''}`} style={{ fontSize: '16px', color: '#6b7280', maxWidth: '560px' }}>
              {fr
                ? 'Choisissez le confort qui vous convient. Le tarif exact est confirmé dans l’application avant le départ.'
                : 'Choose the comfort that suits you. The exact fare is confirmed in the app before departure.'}
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '20px' }}>
            {categories.map((cat, i) => (
              <article key={cat.name} className={`lk-card lk-reveal ${catsIn ? 'in' : ''}`} style={{ overflow: 'hidden', transitionDelay: `${0.1 + i * 0.1}s` }}>
                <div style={{ position: 'relative', height: '170px', overflow: 'hidden' }}>
                  <img
                    src={cat.image}
                    alt={cat.name}
                    loading="lazy"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                  <span style={{
                    position: 'absolute', top: '12px', left: '12px', background: 'rgba(255,255,255,0.95)',
                    color: SITE_BLUE, fontSize: '11px', fontWeight: 800, padding: '5px 10px', borderRadius: '999px',
                  }}>
                    {cat.badge}
                  </span>
                </div>
                <div style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#222' }}>
                      {cat.icon} {cat.name}
                    </h3>
                    <span style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 600 }}>{cat.seats}</span>
                  </div>
                  <p style={{ fontSize: '13px', color: SITE_BLUE, fontWeight: 800, margin: '6px 0 12px' }}>{cat.from}</p>
                  <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px', display: 'grid', gap: '6px' }}>
                    {cat.features.map((f) => (
                      <li key={f} style={{ fontSize: '13px', color: '#4b5563', display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span style={{ color: SITE_BLUE, fontWeight: 900 }}>✓</span> {f}
                      </li>
                    ))}
                  </ul>
                  <Link to={APP_URL} className="lk-btn" style={{ width: '100%', padding: '11px 16px', fontSize: '14px' }}>
                    {fr ? 'Commander' : 'Order'}
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* POURQUOI SMARTCABB */}
      <section ref={whyRef as any} style={{ padding: '80px 0', background: '#fff', borderBottom: '1px solid #f1f5f9' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div style={{ marginBottom: '44px' }}>
            <div className={`lk-accent lk-reveal lk-d0 ${whyIn ? 'in' : ''}`} />
            <h2 className={`lk-reveal lk-d1 ${whyIn ? 'in' : ''}`} style={{ fontSize: 'clamp(30px,4vw,40px)', fontWeight: 900, color: '#222', marginBottom: '12px' }}>
              {fr ? 'Pourquoi voyager avec ' : 'Why ride with '}
              <span style={{ color: SITE_BLUE }}>SmartCabb</span>
              {fr ? ' ?' : '?'}
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '16px' }}>
            {benefits.map((b, i) => (
              <div key={b.t} className={`lk-card lk-reveal ${whyIn ? 'in' : ''}`} style={{ padding: '22px', transitionDelay: `${0.05 + i * 0.08}s` }}>
                <div style={{ fontSize: '26px', marginBottom: '10px' }}>{b.icon}</div>
                <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#222', marginBottom: '6px' }}>{b.t}</h3>
                <p style={{ fontSize: '13px', color: '#6b7280', lineHeight: 1.55 }}>{b.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section ref={faqRef as any} style={{ padding: '80px 0', background: '#FAFAFA' }}>
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
            {fr ? 'Prêt à commander ?' : 'Ready to order?'}
          </h2>
          <p style={{ fontSize: '17px', color: 'rgba(255,255,255,0.85)', marginBottom: '32px', lineHeight: 1.6 }}>
            {fr
              ? 'Ouvrez l’application, choisissez votre destination et laissez-nous faire le reste.'
              : 'Open the app, choose your destination and let us do the rest.'}
          </p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <Link to={APP_URL} className="lk-btn-light">
              {fr ? 'Ouvrir l’application' : 'Open the app'}
            </Link>
            <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" className="lk-btn-light" style={{ background: 'rgba(255,255,255,0.14)', color: '#fff' }}>
              {fr ? 'Télécharger sur Google Play' : 'Get it on Google Play'}
            </a>
          </div>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', marginTop: '18px' }}>
            {fr ? 'Vous préférez planifier ? ' : 'Prefer to plan ahead? '}
            <Link to={RESERVE_URL} style={{ color: '#fff', fontWeight: 700, textDecoration: 'underline' }}>
              {fr ? 'Réservez votre chauffeur' : 'Book your driver'}
            </Link>
          </p>
        </div>
      </section>

      <ProfessionalFooter />
      <ChatWidget />
    </div>
  );
}
