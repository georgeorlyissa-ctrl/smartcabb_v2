import { useState, useEffect } from 'react';
import { motion } from '../lib/motion';
import { ChatWidget } from '../components/ChatWidget';
import { ProfessionalFooter } from '../components/ProfessionalFooter';
import { SiteNavigation } from '../components/SiteNavigation';
import { useLanguage } from '../contexts/LanguageContext';
import { Link } from '../lib/simple-router';

export function DriversLandingPage() {
  const { t, language } = useLanguage();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const driverImages = [
    '/drivers/driver1.png',
    '/drivers/driver2.png',
    '/drivers/driver3.jpeg',
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex(prev => (prev + 1) % driverImages.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const requirements = [
    {
      image: 'https://cdn-icons-png.flaticon.com/512/2991/2991586.png',
      textFR: 'Permis de conduire valide',
      textEN: "Valid driver's license",
    },
    {
      image: 'https://cdn-icons-png.flaticon.com/512/3774/3774278.png',
      textFR: 'Véhicule en bon état',
      textEN: 'Vehicle in good condition',
    },
    {
      image: 'https://cdn-icons-png.flaticon.com/512/1/1484.png',
      textFR: 'Casier judiciaire vierge',
      textEN: 'Clean criminal record',
    },
    {
      image: 'https://cdn-icons-png.flaticon.com/512/1077/1077012.png',
      textFR: 'Âge minimum 21 ans',
      textEN: 'Minimum age 21 years',
    },
  ];

  const benefits = [
    { titleFR: 'Revenus attractifs', titleEN: 'Attractive income', descFR: 'Gagnez plus selon votre disponibilité', descEN: 'Earn more based on your availability' },
    { titleFR: 'Horaires flexibles', titleEN: 'Flexible hours', descFR: 'Travaillez quand vous le souhaitez', descEN: 'Work whenever you want' },
    { titleFR: 'Assurance incluse', titleEN: 'Insurance included', descFR: 'Couverture complète pendant les courses', descEN: 'Full coverage during rides' },
    { titleFR: 'Formation gratuite', titleEN: 'Free training', descFR: 'Formation à l\'utilisation de l\'application', descEN: 'Training on using the application' },
    { titleFR: 'Application simple', titleEN: 'Simple app', descFR: 'Interface intuitive et facile à utiliser', descEN: 'Intuitive and easy-to-use interface' },
    { titleFR: 'Support 24/7', titleEN: '24/7 support', descFR: 'Notre équipe disponible à tout moment', descEN: 'Our team available at all times' },
  ];

  const steps = [
    { num: '01', titleFR: 'Inscrivez-vous', titleEN: 'Sign up', descFR: 'Remplissez le formulaire en ligne', descEN: 'Fill out the online form' },
    { num: '02', titleFR: 'Vérification', titleEN: 'Verification', descFR: 'Nous vérifions vos documents', descEN: 'We verify your documents' },
    { num: '03', titleFR: 'Formation', titleEN: 'Training', descFR: "Formation gratuite à l'utilisation de l'app", descEN: 'Free training on using the app' },
    { num: '04', titleFR: 'Commencez', titleEN: 'Start', descFR: "Commencez à gagner de l'argent", descEN: 'Start earning money' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'white' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        * { font-family: 'Inter', sans-serif !important; }

        .section-label {
          font-size: 12px; font-weight: 700; letter-spacing: 0.1em;
          text-transform: uppercase; color: #0891b2; margin-bottom: 12px;
        }

        .btn-primary {
          display: inline-block; padding: 14px 32px;
          background: #0891b2; color: white; font-weight: 700;
          font-size: 15px; border-radius: 8px;
          transition: all 0.2s; text-decoration: none;
        }
        .btn-primary:hover { background: #0e7490; transform: translateY(-1px); box-shadow: 0 8px 24px rgba(8,145,178,0.3); }

        .card {
          background: white; border: 1px solid #e5e7eb;
          border-radius: 14px; transition: all 0.25s;
        }
        .card:hover { border-color: #0891b2; box-shadow: 0 8px 24px rgba(8,145,178,0.1); transform: translateY(-3px); }

        .req-card {
          background: white; border: 1px solid #e5e7eb;
          border-radius: 14px; padding: 28px 24px;
          text-align: center; transition: all 0.25s;
        }
        .req-card:hover { border-color: #0891b2; box-shadow: 0 8px 24px rgba(8,145,178,0.1); transform: translateY(-3px); }

        .step-card {
          background: white; border: 1px solid #e5e7eb;
          border-radius: 14px; padding: 32px 24px;
          position: relative; text-align: center;
          transition: all 0.25s;
        }
        .step-card:hover { border-color: #0891b2; box-shadow: 0 8px 24px rgba(8,145,178,0.1); }
      `}</style>

      <SiteNavigation />

      {/* HERO */}
      <section style={{ paddingTop: '100px', paddingBottom: '72px', background: '#fafafa', borderBottom: '1px solid #f3f4f6' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">

            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              
              <h1 style={{ fontSize: '48px', fontWeight: '900', color: '#111827', lineHeight: '1.1', marginBottom: '20px' }}>
                {t('drivers.title')}
              </h1>
              <p style={{ fontSize: '18px', color: '#6b7280', lineHeight: '1.7', marginBottom: '32px', maxWidth: '480px' }}>
                {t('drivers.subtitle')}
              </p>
              <Link to="/app/driver/signup" className="btn-primary">{t('drivers.signup')}</Link>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 32 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.1 }}>
              <div style={{ borderRadius: '16px', overflow: 'hidden', aspectRatio: '1', position: 'relative', boxShadow: '0 24px 64px rgba(0,0,0,0.12)' }}>
                {driverImages.map((img, i) => (
                  <img key={i} src={img} alt="Driver SmartCabb"
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: i === currentImageIndex ? 1 : 0, transition: 'opacity 1s ease' }} />
                ))}
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* CONDITIONS REQUISES */}
      <section style={{ padding: '80px 0', background: 'white', borderBottom: '1px solid #f3f4f6' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div style={{ marginBottom: '56px' }}>
            
            <h2 style={{ fontSize: '40px', fontWeight: '900', color: '#111827', marginBottom: '12px' }}>
              {t('drivers.requirements')}
            </h2>
            <p style={{ fontSize: '17px', color: '#6b7280' }}>
              {language === 'fr' ? 'Les conditions pour rejoindre notre équipe' : 'The requirements to join our team'}
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
            {requirements.map((req, i) => (
              <motion.div key={i} className="req-card"
                initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }} viewport={{ once: true }}>
                <div style={{ width: '64px', height: '64px', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img src={req.image} alt={req.textFR} style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 4px 8px rgba(8,145,178,0.2))' }} />
                </div>
                <p style={{ fontSize: '14px', fontWeight: '700', color: '#111827', lineHeight: '1.4' }}>
                  {language === 'fr' ? req.textFR : req.textEN}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* AVANTAGES */}
      <section style={{ padding: '80px 0', background: '#fafafa', borderBottom: '1px solid #f3f4f6' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-start">

            <div>
              
              <h2 style={{ fontSize: '40px', fontWeight: '900', color: '#111827', marginBottom: '16px', lineHeight: '1.15' }}>
                {t('drivers.benefits')}
              </h2>
              <p style={{ fontSize: '17px', color: '#6b7280', lineHeight: '1.7', marginBottom: '32px' }}>
                {language === 'fr' ? 'Pourquoi conduire avec SmartCabb' : 'Why drive with SmartCabb'}
              </p>
              <Link to="/app/driver/signup" className="btn-primary">{t('drivers.signup')}</Link>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {benefits.map((b, i) => (
                <motion.div key={i} className="card" style={{ padding: '20px' }}
                  initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }} viewport={{ once: true }}>
                  <div style={{ width: '32px', height: '3px', background: '#0891b2', borderRadius: '2px', marginBottom: '12px' }} />
                  <div style={{ fontSize: '15px', fontWeight: '700', color: '#111827', marginBottom: '6px' }}>
                    {language === 'fr' ? b.titleFR : b.titleEN}
                  </div>
                  <div style={{ fontSize: '13px', color: '#9ca3af', lineHeight: '1.5' }}>
                    {language === 'fr' ? b.descFR : b.descEN}
                  </div>
                </motion.div>
              ))}
            </div>

          </div>
        </div>
      </section>

      {/* COMMENT CA MARCHE */}
      <section style={{ padding: '80px 0', background: 'white', borderBottom: '1px solid #f3f4f6' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div style={{ marginBottom: '56px' }}>
            
            <h2 style={{ fontSize: '40px', fontWeight: '900', color: '#111827', marginBottom: '12px' }}>
              {t('drivers.howItWorks')}
            </h2>
            <p style={{ fontSize: '17px', color: '#6b7280' }}>
              {language === 'fr' ? 'Devenez chauffeur en 4 étapes simples' : 'Become a driver in 4 simple steps'}
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
            {steps.map((step, i) => (
              <motion.div key={i} className="step-card"
                initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }} viewport={{ once: true }}>

                {/* Numéro */}
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
              </motion.div>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: '48px' }}>
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
