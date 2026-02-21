import { motion } from '../lib/motion';
import { ChatWidget } from '../components/ChatWidget';
import { ProfessionalFooter } from '../components/ProfessionalFooter';
import { SiteNavigation } from '../components/SiteNavigation';
import { useLanguage } from '../contexts/LanguageContext';

export function LegalPage() {
  const { t, language } = useLanguage();

  const sections = language === 'fr' ? [
    {
      title: '1. Éditeur du site',
      content: 'Le site smartcabb.com est édité par SmartCabb SARL, société de droit congolais au capital de 10.000.000 FC, immatriculée au Registre du Commerce et du Crédit Mobilier de Kinshasa sous le numéro RCCM CD/KIN/RCCM/XX-X-XXXXX.'
    },
    {
      title: '2. Siège social',
      content: 'SmartCabb SARL\nAvenue de la Libération\nCommune de Gombe\nKinshasa, République Démocratique du Congo\n\nTéléphone : +243 XX XXX XXXX\nEmail : contact@smartcabb.com'
    },
    {
      title: '3. Directeur de publication',
      content: 'Le directeur de la publication est le représentant légal de SmartCabb SARL.'
    },
    {
      title: '4. Hébergement',
      content: 'Le site smartcabb.com est hébergé par :\n\nVercel Inc.\n440 N Barranca Ave #4133\nCovina, CA 91723\nÉtats-Unis\n\nLa base de données est hébergée par Supabase Inc.'
    },
    {
      title: '5. Propriété intellectuelle',
      content: 'L\'ensemble du contenu du site smartcabb.com (textes, images, vidéos, logos, marques) est la propriété exclusive de SmartCabb SARL et est protégé par les lois congolaises et internationales sur la propriété intellectuelle. Toute reproduction, même partielle, est strictement interdite sans autorisation préalable.'
    },
    {
      title: '6. Données personnelles',
      content: 'Les données personnelles collectées sur le site sont traitées conformément à notre Politique de Confidentialité. Pour toute question relative au traitement de vos données, contactez privacy@smartcabb.com.'
    },
    {
      title: '7. Cookies',
      content: 'Le site utilise des cookies pour améliorer l\'expérience utilisateur et analyser le trafic. Vous pouvez paramétrer votre navigateur pour refuser les cookies, mais certaines fonctionnalités du site pourraient ne plus être disponibles.'
    },
    {
      title: '8. Limitation de responsabilité',
      content: 'SmartCabb s\'efforce d\'assurer l\'exactitude des informations diffusées sur le site mais ne peut garantir l\'absence d\'erreurs. SmartCabb ne saurait être tenu responsable des dommages directs ou indirects résultant de l\'utilisation du site.'
    },
    {
      title: '9. Liens hypertextes',
      content: 'Le site peut contenir des liens vers d\'autres sites. SmartCabb n\'exerce aucun contrôle sur ces sites et décline toute responsabilité quant à leur contenu.'
    },
    {
      title: '10. Droit applicable',
      content: 'Les présentes mentions légales sont régies par le droit congolais. Tout litige sera de la compétence exclusive des tribunaux de Kinshasa.'
    }
  ] : [
    {
      title: '1. Site Publisher',
      content: 'The smartcabb.com website is published by SmartCabb SARL, a company under Congolese law with capital of 10,000,000 FC, registered in the Trade and Movable Credit Register of Kinshasa under number RCCM CD/KIN/RCCM/XX-X-XXXXX.'
    },
    {
      title: '2. Registered Office',
      content: 'SmartCabb SARL\nAvenue de la Libération\nCommune de Gombe\nKinshasa, Democratic Republic of Congo\n\nPhone: +243 XX XXX XXXX\nEmail: contact@smartcabb.com'
    },
    {
      title: '3. Publication Director',
      content: 'The publication director is the legal representative of SmartCabb SARL.'
    },
    {
      title: '4. Hosting',
      content: 'The smartcabb.com website is hosted by:\n\nVercel Inc.\n440 N Barranca Ave #4133\nCovina, CA 91723\nUnited States\n\nThe database is hosted by Supabase Inc.'
    },
    {
      title: '5. Intellectual Property',
      content: 'All content on the smartcabb.com website (texts, images, videos, logos, trademarks) is the exclusive property of SmartCabb SARL and is protected by Congolese and international intellectual property laws. Any reproduction, even partial, is strictly prohibited without prior authorization.'
    },
    {
      title: '6. Personal Data',
      content: 'Personal data collected on the site is processed in accordance with our Privacy Policy. For any questions regarding the processing of your data, contact privacy@smartcabb.com.'
    },
    {
      title: '7. Cookies',
      content: 'The site uses cookies to improve user experience and analyze traffic. You can configure your browser to refuse cookies, but some site features may no longer be available.'
    },
    {
      title: '8. Limitation of Liability',
      content: 'SmartCabb strives to ensure the accuracy of information published on the site but cannot guarantee the absence of errors. SmartCabb cannot be held responsible for direct or indirect damages resulting from the use of the site.'
    },
    {
      title: '9. Hyperlinks',
      content: 'The site may contain links to other sites. SmartCabb exercises no control over these sites and disclaims all responsibility for their content.'
    },
    {
      title: '10. Applicable Law',
      content: 'These legal notices are governed by Congolese law. Any dispute will be under the exclusive jurisdiction of the courts of Kinshasa.'
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
              ⚖️ {t('legal.legalNotice')}
            </div>
            <h1 className="text-6xl font-black mb-6">
              {t('legal.legalNotice')}
            </h1>
            <p className="text-lg text-gray-600">
              {language === 'fr' ? 'Informations légales et réglementaires' : 'Legal and regulatory information'}
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
                  <p className="text-gray-600 leading-relaxed whitespace-pre-line">
                    {section.content}
                  </p>
                </motion.div>
              ))}
            </div>

            <div className="mt-12 p-6 bg-cyan-50 rounded-xl border-2 border-cyan-100">
              <p className="text-sm text-gray-700">
                <strong className="text-cyan-600">
                  {language === 'fr' ? 'Contact légal' : 'Legal contact'}
                </strong>{' '}
                {language === 'fr' 
                  ? 'Pour toute question d\'ordre juridique, contactez-nous à legal@smartcabb.com'
                  : 'For any legal questions, contact us at legal@smartcabb.com'}
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
