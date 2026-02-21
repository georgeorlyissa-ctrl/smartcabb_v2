import { motion } from '../lib/motion';
import { ChatWidget } from '../components/ChatWidget';
import { ProfessionalFooter } from '../components/ProfessionalFooter';
import { SiteNavigation } from '../components/SiteNavigation';
import { useLanguage } from '../contexts/LanguageContext';

export function TermsPage() {
  const { t, language } = useLanguage();

  const sections = language === 'fr' ? [
    {
      title: '1. Acceptation des conditions',
      content: 'En utilisant SmartCabb, vous acceptez les présentes conditions d\'utilisation. Si vous n\'acceptez pas ces conditions, veuillez ne pas utiliser notre service.'
    },
    {
      title: '2. Description du service',
      content: 'SmartCabb est une plateforme de mise en relation entre passagers et chauffeurs en République Démocratique du Congo. Nous ne sommes pas un service de transport mais un intermédiaire technologique.'
    },
    {
      title: '3. Inscription et compte',
      content: 'Pour utiliser SmartCabb, vous devez créer un compte avec des informations exactes et à jour. Vous êtes responsable de la confidentialité de vos identifiants de connexion.'
    },
    {
      title: '4. Utilisation du service',
      content: 'Vous vous engagez à utiliser SmartCabb de manière légale et respectueuse. Tout comportement abusif, frauduleux ou contraire aux bonnes mœurs est strictement interdit.'
    },
    {
      title: '5. Tarification et paiement',
      content: 'Les tarifs sont calculés en fonction de la distance et du type de véhicule. Le paiement peut être effectué en espèces ou via mobile money. SmartCabb prélève une commission sur chaque course.'
    },
    {
      title: '6. Annulation et remboursement',
      content: 'Les annulations sont possibles selon nos conditions. Des frais d\'annulation peuvent s\'appliquer si l\'annulation intervient trop tardivement.'
    },
    {
      title: '7. Responsabilité',
      content: 'SmartCabb s\'efforce de fournir un service de qualité mais ne peut être tenu responsable des dommages indirects résultant de l\'utilisation de la plateforme.'
    },
    {
      title: '8. Modifications des conditions',
      content: 'SmartCabb se réserve le droit de modifier ces conditions à tout moment. Les utilisateurs seront informés des changements importants.'
    },
    {
      title: '9. Droit applicable',
      content: 'Ces conditions sont régies par le droit congolais. Tout litige sera soumis aux tribunaux compétents de Kinshasa.'
    }
  ] : [
    {
      title: '1. Acceptance of Terms',
      content: 'By using SmartCabb, you accept these terms of use. If you do not accept these terms, please do not use our service.'
    },
    {
      title: '2. Service Description',
      content: 'SmartCabb is a platform connecting passengers and drivers in the Democratic Republic of Congo. We are not a transportation service but a technological intermediary.'
    },
    {
      title: '3. Registration and Account',
      content: 'To use SmartCabb, you must create an account with accurate and up-to-date information. You are responsible for the confidentiality of your login credentials.'
    },
    {
      title: '4. Service Use',
      content: 'You agree to use SmartCabb legally and respectfully. Any abusive, fraudulent or improper behavior is strictly prohibited.'
    },
    {
      title: '5. Pricing and Payment',
      content: 'Rates are calculated based on distance and vehicle type. Payment can be made in cash or via mobile money. SmartCabb takes a commission on each ride.'
    },
    {
      title: '6. Cancellation and Refund',
      content: 'Cancellations are possible according to our conditions. Cancellation fees may apply if cancellation occurs too late.'
    },
    {
      title: '7. Liability',
      content: 'SmartCabb strives to provide quality service but cannot be held responsible for indirect damages resulting from the use of the platform.'
    },
    {
      title: '8. Terms Modifications',
      content: 'SmartCabb reserves the right to modify these terms at any time. Users will be informed of important changes.'
    },
    {
      title: '9. Applicable Law',
      content: 'These terms are governed by Congolese law. Any dispute will be submitted to the competent courts of Kinshasa.'
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
              📄 {t('legal.terms')}
            </div>
            <h1 className="text-6xl font-black mb-6">
              {t('legal.terms')}
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

            <div className="mt-12 p-6 bg-cyan-50 rounded-xl border-2 border-cyan-100">
              <p className="text-sm text-gray-700">
                <strong className="text-cyan-600">
                  {language === 'fr' ? 'Questions ?' : 'Questions?'}
                </strong>{' '}
                {language === 'fr' 
                  ? 'Contactez-nous à support@smartcabb.com pour toute question concernant ces conditions.'
                  : 'Contact us at support@smartcabb.com for any questions about these terms.'}
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
