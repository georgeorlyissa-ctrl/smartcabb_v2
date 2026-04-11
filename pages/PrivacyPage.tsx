import { motion } from '../lib/motion';
import { ChatWidget } from '../components/ChatWidget';
import { ProfessionalFooter } from '../components/ProfessionalFooter';
import { SiteNavigation } from '../components/SiteNavigation';
import { useLanguage } from '../contexts/LanguageContext';

export function PrivacyPage() {
  const { t, language } = useLanguage();

  const sections = language === 'fr' ? [
    { title: '1. Collecte des données', content: 'SmartCabb collecte les données personnelles nécessaires au fonctionnement du service : nom, numéro de téléphone, adresse email, position GPS, historique des courses. Ces données sont essentielles pour assurer la sécurité et la qualité du service.' },
    { title: '2. Utilisation des données', content: 'Vos données sont utilisées pour : faciliter les réservations, améliorer notre service, assurer la sécurité des utilisateurs, traiter les paiements, et communiquer avec vous concernant votre compte et nos services.' },
    { title: '3. Données de localisation', content: "Nous utilisons votre position GPS uniquement pendant l'utilisation de l'application pour : calculer les tarifs, optimiser les trajets, assurer le suivi en temps réel, et garantir votre sécurité. Vous pouvez désactiver la localisation à tout moment." },
    { title: '4. Partage des données', content: "Vos données personnelles ne sont jamais vendues à des tiers. Nous partageons uniquement les informations nécessaires avec nos chauffeurs partenaires pour réaliser la course (prénom, numéro de téléphone, position de départ et d'arrivée)." },
    { title: '5. Sécurité des données', content: "SmartCabb met en œuvre des mesures de sécurité techniques et organisationnelles pour protéger vos données contre tout accès non autorisé, perte ou altération. Nos serveurs sont sécurisés et les données sensibles sont chiffrées." },
    { title: '6. Conservation des données', content: 'Nous conservons vos données personnelles aussi longtemps que nécessaire pour fournir nos services et respecter nos obligations légales. Vous pouvez demander la suppression de vos données à tout moment.' },
    { title: '7. Vos droits', content: "Conformément à la législation en vigueur, vous disposez d'un droit d'accès, de rectification, de suppression et d'opposition au traitement de vos données personnelles. Pour exercer ces droits, contactez privacy@smartcabb.com." },
    { title: '8. Cookies', content: "Notre site web et notre application utilisent des cookies pour améliorer votre expérience utilisateur. Vous pouvez gérer vos préférences de cookies dans les paramètres de votre navigateur." },
    { title: '9. Modifications de la politique', content: "SmartCabb se réserve le droit de modifier cette politique de confidentialité. Les utilisateurs seront informés de tout changement important par email ou notification dans l'application." },
    { title: '10. Contact', content: 'Pour toute question concernant cette politique de confidentialité ou le traitement de vos données, contactez notre délégué à la protection des données : privacy@smartcabb.com' },
  ] : [
    { title: '1. Data Collection', content: 'SmartCabb collects personal data necessary for service operation: name, phone number, email address, GPS location, ride history. This data is essential to ensure service security and quality.' },
    { title: '2. Data Use', content: 'Your data is used to: facilitate bookings, improve our service, ensure user security, process payments, and communicate with you about your account and our services.' },
    { title: '3. Location Data', content: 'We use your GPS location only while using the app to: calculate fares, optimize routes, ensure real-time tracking, and guarantee your safety. You can disable location at any time.' },
    { title: '4. Data Sharing', content: 'Your personal data is never sold to third parties. We only share necessary information with our partner drivers to complete the ride (first name, phone number, pickup and drop-off location).' },
    { title: '5. Data Security', content: 'SmartCabb implements technical and organizational security measures to protect your data from unauthorized access, loss or alteration. Our servers are secure and sensitive data is encrypted.' },
    { title: '6. Data Retention', content: 'We retain your personal data as long as necessary to provide our services and comply with our legal obligations. You can request deletion of your data at any time.' },
    { title: '7. Your Rights', content: 'In accordance with applicable law, you have the right to access, rectify, delete and object to the processing of your personal data. To exercise these rights, contact privacy@smartcabb.com.' },
    { title: '8. Cookies', content: 'Our website and app use cookies to improve your user experience. You can manage your cookie preferences in your browser settings.' },
    { title: '9. Policy Changes', content: 'SmartCabb reserves the right to modify this privacy policy. Users will be informed of any significant changes by email or app notification.' },
    { title: '10. Contact', content: 'For any questions about this privacy policy or the processing of your data, contact our data protection officer: privacy@smartcabb.com' },
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
      `}</style>

      <SiteNavigation />

      {/* HERO */}
      <section style={{ paddingTop: '100px', paddingBottom: '56px', background: '#fafafa', borderBottom: '1px solid #f3f4f6' }}>
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <p className="section-label">{t('legal.privacy')}</p>
            <h1 style={{ fontSize: '44px', fontWeight: '900', color: '#111827', marginBottom: '16px', lineHeight: '1.15' }}>
              {t('legal.privacy')}
            </h1>
            <p style={{ fontSize: '15px', color: '#9ca3af' }}>
              {t('legal.lastUpdate')} : {language === 'fr' ? '2 février 2026' : 'February 2, 2026'}
            </p>
          </motion.div>
        </div>
      </section>

      {/* CONTENU */}
      <section style={{ padding: '64px 0 96px' }}>
        <div className="max-w-4xl mx-auto px-6 lg:px-8">

          {/* Intro */}
          <motion.div
            style={{ padding: '24px 28px', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '12px', marginBottom: '48px' }}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <p style={{ fontSize: '15px', color: '#0369a1', lineHeight: '1.7' }}>
              {language === 'fr'
                ? "Chez SmartCabb, nous prenons très au sérieux la protection de vos données personnelles. Cette politique de confidentialité explique comment nous collectons, utilisons et protégeons vos informations."
                : "At SmartCabb, we take the protection of your personal data very seriously. This privacy policy explains how we collect, use and protect your information."}
            </p>
          </motion.div>

          {/* Sections */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {sections.map((section, index) => (
              <motion.div key={index}
                style={{ padding: '32px 0', borderBottom: index < sections.length - 1 ? '1px solid #f3f4f6' : 'none' }}
                initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.04 }} viewport={{ once: true }}>
                <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#111827', marginBottom: '12px' }}>
                  {section.title}
                </h2>
                <p style={{ fontSize: '15px', color: '#6b7280', lineHeight: '1.75' }}>
                  {section.content}
                </p>
              </motion.div>
            ))}
          </div>

          {/* Footer note */}
          <div style={{ marginTop: '48px', padding: '20px 24px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px' }}>
            <p style={{ fontSize: '14px', color: '#166534', lineHeight: '1.6' }}>
              <strong>{language === 'fr' ? 'Vos données sont protégées. ' : 'Your data is protected. '}</strong>
              {language === 'fr'
                ? "SmartCabb s'engage à respecter la confidentialité de vos données et à les utiliser uniquement pour améliorer votre expérience."
                : "SmartCabb is committed to respecting the confidentiality of your data and using it only to improve your experience."}
            </p>
          </div>
        </div>
      </section>

      <ProfessionalFooter />
      <ChatWidget />
    </div>
  );
}
