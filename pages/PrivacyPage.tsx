import { motion } from '../lib/motion';
import { ChatWidget } from '../components/ChatWidget';
import { ProfessionalFooter } from '../components/ProfessionalFooter';
import { SiteNavigation } from '../components/SiteNavigation';
import { useLanguage } from '../contexts/LanguageContext';

export function PrivacyPage() {
  const { t, language } = useLanguage();

  const sections = language === 'fr' ? [
    {
      title: '1. Collecte des données',
      content: 'SmartCabb collecte les données personnelles nécessaires au fonctionnement du service : nom, numéro de téléphone, adresse email, position GPS, historique des courses. Ces données sont essentielles pour assurer la sécurité et la qualité du service.'
    },
    {
      title: '2. Utilisation des données',
      content: 'Vos données sont utilisées pour : faciliter les réservations, améliorer notre service, assurer la sécurité des utilisateurs, traiter les paiements, et communiquer avec vous concernant votre compte et nos services.'
    },
    {
      title: '3. Données de localisation',
      content: 'Nous utilisons votre position GPS uniquement pendant l\'utilisation de l\'application pour : calculer les tarifs, optimiser les trajets, assurer le suivi en temps réel, et garantir votre sécurité. Vous pouvez désactiver la localisation à tout moment.'
    },
    {
      title: '4. Partage des données',
      content: 'Vos données personnelles ne sont jamais vendues à des tiers. Nous partageons uniquement les informations nécessaires avec nos chauffeurs partenaires pour réaliser la course (prénom, numéro de téléphone, position de départ et d\'arrivée).'
    },
    {
      title: '5. Sécurité des données',
      content: 'SmartCabb met en œuvre des mesures de sécurité techniques et organisationnelles pour protéger vos données contre tout accès non autorisé, perte ou altération. Nos serveurs sont sécurisés et les données sensibles sont chiffrées.'
    },
    {
      title: '6. Conservation des données',
      content: 'Nous conservons vos données personnelles aussi longtemps que nécessaire pour fournir nos services et respecter nos obligations légales. Vous pouvez demander la suppression de vos données à tout moment.'
    },
    {
      title: '7. Vos droits',
      content: 'Conformément à la législation en vigueur, vous disposez d\'un droit d\'accès, de rectification, de suppression et d\'opposition au traitement de vos données personnelles. Pour exercer ces droits, contactez privacy@smartcabb.com.'
    },
    {
      title: '8. Cookies',
      content: 'Notre site web et notre application utilisent des cookies pour améliorer votre expérience utilisateur. Vous pouvez gérer vos préférences de cookies dans les paramètres de votre navigateur.'
    },
    {
      title: '9. Modifications de la politique',
      content: 'SmartCabb se réserve le droit de modifier cette politique de confidentialité. Les utilisateurs seront informés de tout changement important par email ou notification dans l\'application.'
    },
    {
      title: '10. Contact',
      content: 'Pour toute question concernant cette politique de confidentialité ou le traitement de vos données, contactez notre délégué à la protection des données : privacy@smartcabb.com'
    }
  ] : [
    {
      title: '1. Data Collection',
      content: 'SmartCabb collects personal data necessary for service operation: name, phone number, email address, GPS location, ride history. This data is essential to ensure service security and quality.'
    },
    {
      title: '2. Data Use',
      content: 'Your data is used to: facilitate bookings, improve our service, ensure user security, process payments, and communicate with you about your account and our services.'
    },
    {
      title: '3. Location Data',
      content: 'We use your GPS location only while using the app to: calculate fares, optimize routes, ensure real-time tracking, and guarantee your safety. You can disable location at any time.'
    },
    {
      title: '4. Data Sharing',
      content: 'Your personal data is never sold to third parties. We only share necessary information with our partner drivers to complete the ride (first name, phone number, pickup and drop-off location).'
    },
    {
      title: '5. Data Security',
      content: 'SmartCabb implements technical and organizational security measures to protect your data from unauthorized access, loss or alteration. Our servers are secure and sensitive data is encrypted.'
    },
    {
      title: '6. Data Retention',
      content: 'We retain your personal data as long as necessary to provide our services and comply with our legal obligations. You can request deletion of your data at any time.'
    },
    {
      title: '7. Your Rights',
      content: 'In accordance with applicable law, you have the right to access, rectify, delete and object to the processing of your personal data. To exercise these rights, contact privacy@smartcabb.com.'
    },
    {
      title: '8. Cookies',
      content: 'Our website and app use cookies to improve your user experience. You can manage your cookie preferences in your browser settings.'
    },
    {
      title: '9. Policy Changes',
      content: 'SmartCabb reserves the right to modify this privacy policy. Users will be informed of any significant changes by email or app notification.'
    },
    {
      title: '10. Contact',
      content: 'For any questions about this privacy policy or the processing of your data, contact our data protection officer: privacy@smartcabb.com'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        * { font-family: 'Inter', sans-serif !important; }
        
        .gradient-text {
          background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
      `}</style>

      {/* Navigation */}
      <SiteNavigation />

      {/* Hero */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-50 via-white to-blue-50"></div>
        
        <div className="relative max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-block px-4 py-2 bg-cyan-100 rounded-full text-cyan-700 font-semibold text-sm mb-6">
              🔒 {t('legal.privacy')}
            </div>
            <h1 className="text-6xl font-black mb-6">
              {t('legal.privacy')}
            </h1>
            <p className="text-lg text-gray-600">
              {t('legal.lastUpdate')} : {language === 'fr' ? '2 février 2026' : 'February 2, 2026'}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Content */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <div className="bg-white rounded-3xl shadow-xl p-8 md:p-12">
            
            {/* Intro */}
            <div className="mb-12 p-6 bg-cyan-50 rounded-xl border-2 border-cyan-100">
              <p className="text-gray-700 leading-relaxed">
                {language === 'fr'
                  ? 'Chez SmartCabb, nous prenons très au sérieux la protection de vos données personnelles. Cette politique de confidentialité explique comment nous collectons, utilisons et protégeons vos informations.'
                  : 'At SmartCabb, we take the protection of your personal data very seriously. This privacy policy explains how we collect, use and protect your information.'}
              </p>
            </div>

            <div className="space-y-8">
              {sections.map((section, index) => (
                <motion.div
                  key={index}
                  className="pb-8 border-b border-gray-200 last:border-0"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.05 }}
                  viewport={{ once: true }}
                >
                  <h2 className="text-2xl font-black mb-4 text-gray-900">
                    {section.title}
                  </h2>
                  <p className="text-gray-600 leading-relaxed">
                    {section.content}
                  </p>
                </motion.div>
              ))}
            </div>

            <div className="mt-12 p-6 bg-green-50 rounded-xl border-2 border-green-200">
              <p className="text-sm text-gray-700">
                <strong className="text-green-600">
                  {language === 'fr' ? 'Vos données sont protégées' : 'Your data is protected'}
                </strong>{' '}
                {language === 'fr' 
                  ? 'SmartCabb s\'engage à respecter la confidentialité de vos données et à les utiliser uniquement pour améliorer votre expérience.'
                  : 'SmartCabb is committed to respecting the confidentiality of your data and using it only to improve your experience.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <ProfessionalFooter />

      <ChatWidget />
    </div>
  );
}
