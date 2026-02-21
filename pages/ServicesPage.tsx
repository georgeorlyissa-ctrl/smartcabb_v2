import { motion } from '../lib/motion';
import { ChatWidget } from '../components/ChatWidget';
import { ProfessionalFooter } from '../components/ProfessionalFooter';
import { SiteNavigation } from '../components/SiteNavigation';
import { useLanguage } from '../contexts/LanguageContext';
import { Link } from '../lib/simple-router';
import { ImageCarousel } from '../components/ImageCarousel';

export function ServicesPage() {
  const { t, language } = useLanguage();

  // Services avec toutes les images qui défilent
  const services = [
    {
      id: 'standard',
      name: 'SmartCabb Standard',
      badge: 'SMARTCABB STANDARD',
      emoji: '🚗',
      subtitleFR: 'Solution économique et climatisée pour vos déplacements quotidiens. Idéal pour 3 personnes.',
      subtitleEN: 'Economical and air-conditioned solution for your daily trips. Ideal for 3 people.',
      color: 'cyan',
      badgeColor: 'bg-cyan-500',
      borderColor: 'border-cyan-100',
      bgColor: 'bg-cyan-50/50',
      images: [
        '/vehicles/smartcabb_standard/Standard_1.png',
        '/vehicles/smartcabb_standard/Standard_2.png',
        '/vehicles/smartcabb_standard/Standard_3.png',
        '/vehicles/smartcabb_standard/Standard_4.png',

        '/vehicles/smartcabb_standard/Standard_5.png',

        '/vehicles/smartcabb_standard/Stadard_5.png',

        '/vehicles/smartcabb_standard/Standard_6.png',
      ],
      vehicules: 'Toyota IST, Suzuki Swift, Toyota Vitz, Toyota Blade, Toyota Ractis, Toyota Runx',
      featuresFR: [
        { icon: '👥', text: '3 places' },
        { icon: '❄️', text: 'Climatisé' },
        { icon: '🛡️', text: 'Sécurisé' }
      ],
      featuresEN: [
        { icon: '👥', text: '3 seats' },
        { icon: '❄️', text: 'Air-conditioned' },
        { icon: '🛡️', text: 'Secured' }
      ],

      priceFR: 'À partir de 3000 FC',
      priceEN: 'From 3000 FC'

      priceFR: 'À partir de 7 $ (15.400 fc)',
      priceEN: 'From  7 $ (15.400 fc)'

    },
    {
      id: 'confort',
      name: 'SmartCabb Confort',
      badge: 'SMARTCABB CONFORT',
      emoji: '🚙',
      subtitleFR: 'Confort premium avec connexion Data gratuit. Véhicules modernes pour 3 personnes.',
      subtitleEN: 'Premium comfort with free Data connection. Modern vehicles for 3 people.',
      color: 'blue',
      badgeColor: 'bg-cyan-500',
      borderColor: 'border-blue-100',
      bgColor: 'bg-blue-50/50',
      images: [
        '/vehicles/smartcabb_confort/confort 1.png',
        '/vehicles/smartcabb_confort/Confort_2.png',
        '/vehicles/smartcabb_confort/Confort_3.png',
      ],
      vehicules: 'Toyota Mark, Toyota Crown, Mercedes C-Class, Harrier, Toyota Vanguard, Nissan Juke',
      featuresFR: [
        { icon: '👥', text: '3 places' },
        { icon: '❄️', text: 'Climatisé' },
        { icon: '📡', text: 'Data gratuit' },
        { icon: '🛡️', text: 'Sécurisé' }
      ],
      featuresEN: [
        { icon: '👥', text: '3 seats' },
        { icon: '❄️', text: 'Air-conditioned' },
        { icon: '📡', text: 'Free Data' },
        { icon: '🛡️', text: 'Secured' }
      ],

      priceFR: 'À partir de 4500 FC',
      priceEN: 'From 4500 FC'

      priceFR: 'À partir de 15 $ (33.000) FC',
      priceEN: 'From 15 $ (33.000) FC'

    },
    {
      id: 'business',
      name: 'SmartCabb Business',
      badge: 'SMARTCABB BUSINESS',
      emoji: '👑',
      subtitleFR: 'Service VIP 4 places avec rafraîchissement et Data gratuit. Le summum du luxe.',
      subtitleEN: 'VIP 4-seat service with refreshments and free Data. The height of luxury.',
      color: 'orange',
      badgeColor: 'bg-orange-500',
      borderColor: 'border-orange-100',
      bgColor: 'bg-orange-50/50',
      images: [

        '/vehicles/smartcabb_business/Business_1.png',
        '/vehicles/smartcabb_business/Business_2.png',
        '/vehicles/smartcabb_business/Business_3.png',
        '/vehicles/smartcabb_business/Business_4.png',
        '/vehicles/smartcabb_business/Business_5.png',

        '/vehicles/smartcabb_business/Bussiness_1.png',
        '/vehicles/smartcabb_business/Bussiness_2.png',
        '/vehicles/smartcabb_business/Bussiness_3.png',
        '/vehicles/smartcabb_business/Bussiness_4.png',
        '/vehicles/smartcabb_business/Bussiness_5.png',

        '/vehicles/smartcabb_business/Business_6.png',
      ],
      vehicules: 'Prado, Fortuner',
      featuresFR: [
        { icon: '👥', text: '4 places' },
        { icon: '🥤', text: 'Rafraîchissement' },
        { icon: '📡', text: 'Data gratuit' },
        { icon: '🛡️', text: 'Sécurisé' }
      ],
      featuresEN: [
        { icon: '👥', text: '4 seats' },
        { icon: '🥤', text: 'Refreshments' },
        { icon: '📡', text: 'Free Data' },
        { icon: '🛡️', text: 'Secured' }
      ],

      priceFR: 'À partir de 7000 FC',
      priceEN: 'From 7000 FC'

      priceFR: 'À partir de 160 $ ( 352.000) FC',
      priceEN: 'From 160 $ ( 352.000) FC'

    },
    {
      id: 'familia',
      name: 'SmartCabb Familia',
      badge: 'SMARTCABB FAMILIA',
      emoji: '🌟',
      subtitleFR: '7 places avec connexion Data gratuit. Véhicules spacieux pour familles et groupes.',
      subtitleEN: '7 seats with free Data connection. Spacious vehicles for families and groups.',
      color: 'green',
      badgeColor: 'bg-emerald-500',
      borderColor: 'border-emerald-100',
      bgColor: 'bg-emerald-50/50',
      images: [

        '/vehicles/smartcabb_familiale/Familialle_1.png',
        '/vehicles/smartcabb_familiale/Familialle_2.png',
        '/vehicles/smartcabb_familiale/Familialle_3.png',
        '/vehicles/smartcabb_familiale/Familialle_4.png',

        '/vehicles/smartcabb_familiale/Familiale_1.png',
        '/vehicles/smartcabb_familiale/Familiale_2.png',
        '/vehicles/smartcabb_familiale/Familiale_3.png',
        '/vehicles/smartcabb_familiale/Familiale_4.png',

      ],
      vehicules: 'Noah, Alphard, Voxy',
      featuresFR: [
        { icon: '👥', text: '7 places' },
        { icon: '❄️', text: 'Climatisé' },
        { icon: '📡', text: 'Data gratuit' },
        { icon: '🛡️', text: 'Sécurisé' }
      ],
      featuresEN: [
        { icon: '👥', text: '7 seats' },
        { icon: '❄️', text: 'Air-conditioned' },
        { icon: '📡', text: 'Free Data' },
        { icon: '🛡️', text: 'Secured' }
      ],

      priceFR: 'À partir de 10000 FC',
      priceEN: 'From 10000 FC'

      priceFR: 'À partir de 15 $ (33.000 FC)',
      priceEN: 'From 15 $ (33.000 FC)'

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
        
        <div className="relative max-w-7xl mx-auto px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-block px-4 py-2 bg-cyan-100 rounded-full text-cyan-700 font-semibold text-sm mb-6">
              🚗 {t('services.title')}
            </div>
            <h1 className="text-6xl font-black mb-6">
              {t('services.title')} <span className="gradient-text">SmartCabb</span>
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              {t('services.subtitle')}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid gap-12">
            {services.map((service, index) => (
              <motion.div
                key={service.id}
                className={`p-8 bg-white rounded-3xl shadow-2xl border-2 ${service.borderColor} hover-lift`}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <div className="grid lg:grid-cols-2 gap-8 items-center">
                  
                  {/* Left: Images Carousel */}
                  <div className="order-2 lg:order-1">
                    <ImageCarousel images={service.images} serviceName={service.name} />
                  </div>

                  {/* Right: Info */}
                  <div className="order-1 lg:order-2">
                    <div className={`inline-block px-4 py-2 ${service.badgeColor} text-white rounded-full text-xs font-bold mb-4`}>
                      {service.badge}
                    </div>
                    
                    <h2 className="text-4xl font-black mb-4 flex items-center gap-3">
                      <span className="text-5xl">{service.emoji}</span>
                      {service.name}
                    </h2>
                    
                    <p className="text-lg text-gray-600 mb-6">
                      {language === 'fr' ? service.subtitleFR : service.subtitleEN}
                    </p>

                    {/* Features */}
                    <div className="grid grid-cols-2 gap-3 mb-6">
                      {(language === 'fr' ? service.featuresFR : service.featuresEN).map((feature, idx) => (
                        <div key={idx} className={`flex items-center gap-2 p-3 ${service.bgColor} rounded-xl`}>
                          <span className="text-2xl">{feature.icon}</span>
                          <span className="font-semibold text-sm">{feature.text}</span>
                        </div>
                      ))}
                    </div>

                    {/* Vehicles */}
                    <div className="mb-6 p-4 bg-slate-50 rounded-xl">
                      <p className="text-xs font-bold text-gray-500 mb-1">
                        {language === 'fr' ? 'VÉHICULES' : 'VEHICLES'}
                      </p>
                      <p className="text-sm text-gray-700 font-medium">{service.vehicules}</p>
                    </div>

                    {/* Price & CTA */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-2xl font-black text-cyan-600">
                          {language === 'fr' ? service.priceFR : service.priceEN}
                        </p>
                      </div>
                      <Link
                        to="/app/passenger"
                        className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white font-bold rounded-full hover:shadow-xl hover:scale-105 transition-all"
                      >
                        {t('services.bookNow')}
                      </Link>
                    </div>
                  </div>

                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-cyan-500 to-cyan-600">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-5xl font-black text-white mb-6">
              {t('cta.title')}
            </h2>
            <p className="text-xl text-cyan-50 mb-8">
              {t('cta.subtitle')}
            </p>
            <Link
              to="/app/passenger"
              className="inline-block px-8 py-4 bg-white text-cyan-600 font-bold rounded-full hover:shadow-2xl hover:scale-105 transition-all text-lg"
            >
              {t('cta.startNow')}
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