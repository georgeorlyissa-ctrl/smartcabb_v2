import { motion } from '../lib/motion';
import { ChatWidget } from '../components/ChatWidget';
import { ProfessionalFooter } from '../components/ProfessionalFooter';
import { SiteNavigation } from '../components/SiteNavigation';
import { useLanguage } from '../contexts/LanguageContext';

export function AccountDeletionPage() {
  const { language } = useLanguage();
  const isFr = language === 'fr';

  const steps = [
    {
      emoji: '📧',
      title: isFr ? 'Étape 1 : Envoyez votre demande' : 'Step 1: Send your request',
      detail: isFr
        ? 'Envoyez un email depuis l\'adresse associée à votre compte SmartCabb à privacy@smartcabb.com avec l\'objet "SUPPRESSION COMPTE". Indiquez votre numéro de téléphone et votre nom complet.'
        : 'Send an email from the address linked to your SmartCabb account to privacy@smartcabb.com with subject "ACCOUNT DELETION". Include your phone number and full name.'
    },
    {
      emoji: '✅',
      title: isFr ? 'Étape 2 : Confirmation' : 'Step 2: Confirmation',
      detail: isFr
        ? 'Nous vous enverrons un email de confirmation sous 48 heures. Vous devrez confirmer votre volonté de supprimer définitivement votre compte en répondant à cet email.'
        : 'We will send you a confirmation email within 48 hours. You must confirm your intent to permanently delete your account by replying to this email.'
    },
    {
      emoji: '⏳',
      title: isFr ? 'Étape 3 : Période de grâce de 30 jours' : 'Step 3: 30-day grace period',
      detail: isFr
        ? 'Une période de grâce de 30 jours est observée avant la suppression définitive. Pendant cette période, vous pouvez annuler la demande en nous contactant. Votre compte sera temporairement désactivé.'
        : 'A 30-day grace period is observed before permanent deletion. During this time, you may cancel the request by contacting us. Your account will be temporarily deactivated.'
    },
    {
      emoji: '🗑️',
      title: isFr ? 'Étape 4 : Suppression définitive' : 'Step 4: Permanent deletion',
      detail: isFr
        ? 'Après 30 jours, votre compte et toutes vos données personnelles sont définitivement supprimés de nos serveurs. Une confirmation finale vous sera envoyée par email.'
        : 'After 30 days, your account and all personal data are permanently deleted from our servers. A final confirmation will be sent to you by email.'
    }
  ];

  const deletedData = isFr ? [
    'Profil utilisateur (nom, email, téléphone)',
    'Historique des courses et destinations',
    'Préférences et paramètres de l\'application',
    'Données de localisation et de navigation',
    'Moyens de paiement enregistrés',
    'Messages et communications avec les chauffeurs'
  ] : [
    'User profile (name, email, phone)',
    'Ride history and destinations',
    'App preferences and settings',
    'Location and navigation data',
    'Saved payment methods',
    'Messages and communications with drivers'
  ];

  const retainedData = isFr ? [
    { item: 'Registre des transactions financières', period: '5 ans (obligation légale et fiscale)' },
    { item: 'Journal des courses (anonymisé)', period: '3 ans' },
    { item: 'Données de sécurité et de fraude', period: '2 ans' }
  ] : [
    { item: 'Financial transaction records', period: '5 years (legal and tax obligation)' },
    { item: 'Ride log (anonymized)', period: '3 years' },
    { item: 'Security and fraud data', period: '2 years' }
  ];

  return (
    <div className="min-h-screen bg-[#f0f0f0]">
      <SiteNavigation />

      <main className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="text-center mb-12">
              <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-[#222222] mb-4">
                {isFr ? 'Suppression de compte' : 'Account Deletion'}
              </h1>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                {isFr
                  ? 'Vous pouvez demander la suppression de votre compte SmartCabb et de toutes vos données personnelles à tout moment. Voici la procédure à suivre.'
                  : 'You can request the deletion of your SmartCabb account and all your personal data at any time. Here is the procedure to follow.'}
              </p>
            </div>
          </motion.div>

          <div className="space-y-12">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.5 }}>
              <h2 className="text-2xl font-bold text-[#222222] mb-8 flex items-center gap-3">
                <span className="w-1 h-8 bg-blue-500 rounded-full inline-block"></span>
                {isFr ? 'Procédure de suppression' : 'Deletion Procedure'}
              </h2>
              <div className="space-y-6">
                {steps.map((step, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 + i * 0.1, duration: 0.4 }}
                    className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
                  >
                    <div className="flex gap-4">
                      <span className="text-3xl flex-shrink-0 mt-1">{step.emoji}</span>
                      <div>
                        <h3 className="text-lg font-bold text-[#222222] mb-2">{step.title}</h3>
                        <p className="text-gray-600 leading-relaxed">{step.detail}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100"
            >
              <h2 className="text-2xl font-bold text-[#222222] mb-6 flex items-center gap-3">
                <span className="w-1 h-8 bg-green-500 rounded-full inline-block"></span>
                {isFr ? 'Données supprimées' : 'Deleted Data'}
              </h2>
              <p className="text-gray-600 mb-4">
                {isFr
                  ? 'Les données suivantes seront définitivement supprimées :'
                  : 'The following data will be permanently deleted:'}
              </p>
              <ul className="space-y-3">
                {deletedData.map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100"
            >
              <h2 className="text-2xl font-bold text-[#222222] mb-6 flex items-center gap-3">
                <span className="w-1 h-8 bg-yellow-500 rounded-full inline-block"></span>
                {isFr ? 'Données conservées (obligations légales)' : 'Retained Data (legal obligations)'}
              </h2>
              <p className="text-gray-600 mb-4">
                {isFr
                  ? 'Certaines données peuvent être conservées après la suppression de votre compte pour respecter nos obligations légales :'
                  : 'Some data may be retained after account deletion to comply with our legal obligations:'}
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="py-3 pr-4 font-semibold text-[#222222]">{isFr ? 'Type de donnée' : 'Data type'}</th>
                      <th className="py-3 font-semibold text-[#222222]">{isFr ? 'Durée de conservation' : 'Retention period'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {retainedData.map((row, i) => (
                      <tr key={i} className="border-b border-gray-100">
                        <td className="py-3 pr-4 text-gray-700">{row.item}</td>
                        <td className="py-3 text-gray-500">{row.period}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="bg-blue-50 rounded-2xl p-8 border border-blue-100"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-[#222222] mb-2">
                    {isFr ? 'Comment nous contacter' : 'How to contact us'}
                  </h3>
                  <p className="text-gray-600 mb-2">
                    {isFr
                      ? 'Pour toute question concernant la suppression de vos données, contactez notre équipe :'
                      : 'For any questions regarding data deletion, contact our team:'}
                  </p>
                  <a
                    href="mailto:privacy@smartcabb.com"
                    className="text-blue-600 font-semibold hover:text-blue-700 transition-colors text-lg"
                  >
                    privacy@smartcabb.com
                  </a>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </main>

      <ProfessionalFooter />
      <ChatWidget />
    </div>
  );
}
