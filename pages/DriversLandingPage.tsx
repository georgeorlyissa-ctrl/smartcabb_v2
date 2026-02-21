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
    'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80',
    'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800&q=80',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800&q=80'
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % driverImages.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const requirements = [
    { icon: '🪪', textFR: 'Permis de conduire valide', textEN: 'Valid driver\'s license' },
    { icon: '🚗', textFR: 'Véhicule en bon état', textEN: 'Vehicle in good condition' },
    { icon: '📋', textFR: 'Casier judiciaire vierge', textEN: 'Clean criminal record' },
    { icon: '🎂', textFR: 'Âge minimum 21 ans', textEN: 'Minimum age 21 years' }
  ];

  const benefits = [
    { icon: '💰', textFR: 'Revenus attractifs', textEN: 'Attractive income' },
    { icon: '⏰', textFR: 'Horaires flexibles', textEN: 'Flexible hours' },
    { icon: '🛡️', textFR: 'Assurance incluse', textEN: 'Insurance included' },
    { icon: '📚', textFR: 'Formation gratuite', textEN: 'Free training' },
    { icon: '📱', textFR: 'App facile à utiliser', textEN: 'Easy-to-use app' },
    { icon: '🤝', textFR: 'Support 24/7', textEN: '24/7 support' }
  ];

  const steps = [
    { 
      num: '1', 
      titleFR: 'Inscrivez-vous', 
      titleEN: 'Sign up',
      descFR: 'Remplissez le formulaire en ligne',
      descEN: 'Fill out the online form'
    },
    { 
      num: '2', 
      titleFR: 'Vérification', 
      titleEN: 'Verification',
      descFR: 'Nous vérifions vos documents',
      descEN: 'We verify your documents'
    },
    { 
      num: '3', 
      titleFR: 'Formation', 
      titleEN: 'Training',
      descFR: 'Formation gratuite à l\'utilisation de l\'app',
      descEN: 'Free training on using the app'
    },
    { 
      num: '4', 
      titleFR: 'Commencez', 
      titleEN: 'Start',
      descFR: 'Commencez à gagner de l\'argent',
      descEN: 'Start earning money'
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
        
        .hover-lift {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .hover-lift:hover {
          transform: translateY(-8px);
          box-shadow: 0 20px 40px rgba(6, 182, 212, 0.2);
        }
      `}</style>

      {/* Navigation */}
      <SiteNavigation />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-50 via-white to-blue-50"></div>
        <div className="absolute top-20 right-0 w-96 h-96 bg-cyan-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        
        <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="inline-block px-4 py-2 bg-cyan-100 rounded-full text-cyan-700 font-semibold text-sm mb-6">
                💰 {language === 'fr' ? 'Gagnez plus avec SmartCabb' : 'Earn more with SmartCabb'}
              </div>
              <h1 className="text-6xl font-black mb-6">
                {t('drivers.title')}
              </h1>
              <p className="text-xl text-gray-600 mb-8">
                {t('drivers.subtitle')}
              </p>
              <Link
                to="/app/driver/signup"
                className="inline-block px-8 py-4 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white font-bold rounded-full hover:shadow-xl hover:scale-105 transition-all text-lg"
              >
                {t('drivers.signup')}
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="relative"
            >
              <div className="relative aspect-square rounded-3xl overflow-hidden shadow-2xl">
                {driverImages.map((img, index) => (
                  <img
                    key={index}
                    src={img}
                    alt="Driver"
                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
                      index === currentImageIndex ? 'opacity-100' : 'opacity-0'
                    }`}
                  />
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Requirements */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-5xl font-black mb-4">
              {t('drivers.requirements')}
            </h2>
            <p className="text-xl text-gray-600">
              {language === 'fr' ? 'Les conditions pour rejoindre notre équipe' : 'The requirements to join our team'}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {requirements.map((req, index) => (
              <motion.div
                key={index}
                className="p-6 bg-gradient-to-br from-cyan-50 to-blue-50 rounded-2xl border-2 border-cyan-100 text-center hover-lift"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <div className="text-5xl mb-4">{req.icon}</div>
                <p className="font-bold text-gray-800">
                  {language === 'fr' ? req.textFR : req.textEN}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 bg-gradient-to-b from-white to-slate-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-5xl font-black mb-4">
              {t('drivers.benefits')}
            </h2>
            <p className="text-xl text-gray-600">
              {language === 'fr' ? 'Pourquoi conduire avec SmartCabb' : 'Why drive with SmartCabb'}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((benefit, index) => (
              <motion.div
                key={index}
                className="p-6 bg-white rounded-2xl shadow-lg hover-lift"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <div className="flex items-center gap-4">
                  <div className="text-4xl">{benefit.icon}</div>
                  <p className="font-bold text-lg text-gray-800">
                    {language === 'fr' ? benefit.textFR : benefit.textEN}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-5xl font-black mb-4">
              {t('drivers.howItWorks')}
            </h2>
            <p className="text-xl text-gray-600">
              {language === 'fr' ? 'Devenez chauffeur en 4 étapes simples' : 'Become a driver in 4 simple steps'}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                className="relative p-6 bg-white rounded-2xl shadow-lg text-center"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-12 h-12 bg-gradient-to-br from-cyan-500 to-cyan-600 text-white rounded-full flex items-center justify-center font-black text-xl shadow-xl">
                  {step.num}
                </div>
                <div className="mt-6">
                  <h3 className="text-xl font-black mb-2">
                    {language === 'fr' ? step.titleFR : step.titleEN}
                  </h3>
                  <p className="text-gray-600">
                    {language === 'fr' ? step.descFR : step.descEN}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link
              to="/app/driver/signup"
              className="inline-block px-8 py-4 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white font-bold rounded-full hover:shadow-xl hover:scale-105 transition-all text-lg"
            >
              {t('drivers.signup')}
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-br from-cyan-500 to-cyan-600">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-5xl font-black text-white mb-6">
              {language === 'fr' ? 'Prêt à commencer ?' : 'Ready to start?'}
            </h2>
            <p className="text-xl text-cyan-50 mb-8">
              {language === 'fr' 
                ? 'Rejoignez des centaines de chauffeurs qui gagnent déjà avec SmartCabb'
                : 'Join hundreds of drivers already earning with SmartCabb'}
            </p>
            <Link
              to="/app/driver/signup"
              className="inline-block px-8 py-4 bg-white text-cyan-600 font-bold rounded-full hover:shadow-2xl hover:scale-105 transition-all text-lg"
            >
              {t('drivers.signup')}
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <ProfessionalFooter />

      <ChatWidget />
    </div>
  );
}
