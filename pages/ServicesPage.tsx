import { useState, useEffect, useRef } from 'react';
import { motion } from '../lib/motion';
import { ChatWidget } from '../components/ChatWidget';
import { ProfessionalFooter } from '../components/ProfessionalFooter';
import { SiteNavigation } from '../components/SiteNavigation';
import { useLanguage } from '../contexts/LanguageContext';
import { Link } from '../lib/simple-router';
import { ImageCarousel } from '../components/ImageCarousel';

export function ServicesPage() {
  const { t, language } = useLanguage();
  const [currentBg, setCurrentBg] = useState(0);
  const [visibleServices, setVisibleServices] = useState<number[]>([]);
  const serviceRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Arrière-plans hero comme LandingPage
  const backgrounds = [
    '/photo2_smartcabb.jpeg',
    '/Images_2.jpeg',
    '/driver3.jpeg',
  ];

  // Carrousel arrière-plan
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentBg(prev => (prev + 1) % backgrounds.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  // IntersectionObserver pour animer chaque service card
  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    serviceRefs.current.forEach((ref, index) => {
      if (!ref) return;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setVisibleServices(prev =>
              prev.includes(index) ? prev : [...prev, index]
            );
          }
        },
        { threshold: 0.15 }
      );
      observer.observe(ref);
      observers.push(observer);
    });

    return () => observers.forEach(o => o.disconnect());
  }, []);

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
      borderColor: 'border-cyan-200',
      bgColor: 'bg-cyan-50/50',
      gradientFrom: 'from-cyan-500',
      gradientTo: 'to-blue-500',
      glowColor: 'rgba(6,182,212,0.3)',
      images: [
        '/vehicles/smartcabb_standard/Standard_2.png',
        '/vehicles/smartcabb_standard/Standard_3.png',
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
      priceFR: 'À partir de 15 000 FC',
      priceEN: 'From 15,000 FC'
    },
    {
      id: 'confort',
      name: 'SmartCabb Confort',
      badge: 'SMARTCABB CONFORT',
      emoji: '✨',
      subtitleFR: 'Confort premium avec connexion Data gratuit. Véhicules modernes pour 3 personnes.',
      subtitleEN: 'Premium comfort with free Data connection. Modern vehicles for 3 people.',
      color: 'blue',
      badgeColor: 'bg-blue-500',
      borderColor: 'border-blue-200',
      bgColor: 'bg-blue-50/50',
      gradientFrom: 'from-blue-500',
      gradientTo: 'to-indigo-500',
      glowColor: 'rgba(59,130,246,0.3)',
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
      priceFR: 'À partir de 33 000 FC',
      priceEN: 'From 33,000 FC'
    },
    {
      id: 'business',
      name: 'SmartCabb Business',
      badge: 'SMARTCABB BUSINESS',
      emoji: '💎',
      subtitleFR: 'Service VIP 4 places avec rafraîchissement et Data gratuit. Le summum du luxe.',
      subtitleEN: 'VIP 4-seat service with refreshments and free Data. The height of luxury.',
      color: 'orange',
      badgeColor: 'bg-orange-500',
      borderColor: 'border-orange-200',
      bgColor: 'bg-orange-50/50',
      gradientFrom: 'from-orange-500',
      gradientTo: 'to-red-500',
      glowColor: 'rgba(249,115,22,0.3)',
      images: [
        '/vehicles/smartcabb_business/Bussiness_1.png',
        '/vehicles/smartcabb_business/Bussiness_2.png',
        '/vehicles/smartcabb_business/Bussiness_3.jpg',
        '/vehicles/smartcabb_business/Bussiness_4.png',
        '/vehicles/smartcabb_business/Bussiness_5.jpg',
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
      priceFR: 'À partir de 352 000 FC',
      priceEN: 'From 352,000 FC'
    },
    {
      id: 'familia',
      name: 'SmartCabb Familia',
      badge: 'SMARTCABB FAMILIA',
      emoji: '👨‍👩‍👧‍👦',
      subtitleFR: '7 places avec connexion Data gratuit. Véhicules spacieux pour familles et groupes.',
      subtitleEN: '7 seats with free Data connection. Spacious vehicles for families and groups.',
      color: 'green',
      badgeColor: 'bg-emerald-500',
      borderColor: 'border-emerald-200',
      bgColor: 'bg-emerald-50/50',
      gradientFrom: 'from-emerald-500',
      gradientTo: 'to-green-600',
      glowColor: 'rgba(16,185,129,0.3)',
      images: [
        '/vehicles/smartcabb_familiale/Familiale_1.png',
        '/vehicles/smartcabb_familiale/Familiale_2.png',
        '/vehicles/smartcabb_familiale/Familiale_3.png',
        //'/vehicles/smartcabb_familiale/Familiale_4.png',
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
      priceFR: 'À partir de 33 000 FC',
      priceEN: 'From 33,000 FC'
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

        .shimmer {
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
          animation: shimmer 2s infinite;
        }

        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-80px); }
          to { opacity: 1; transform: translateX(0); }
        }

        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(80px); }
          to { opacity: 1; transform: translateX(0); }
        }

        @keyframes slideInUp {
          from { opacity: 0; transform: translateY(60px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes fadeScale {
          from { opacity: 0; transform: scale(0.85); }
          to { opacity: 1; transform: scale(1); }
        }

        .animate-slide-left {
          animation: slideInLeft 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        .animate-slide-right {
          animation: slideInRight 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        .animate-slide-up {
          animation: slideInUp 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        .animate-fade-scale {
          animation: fadeScale 0.6s ease-out forwards;
        }

        .service-card {
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .service-card:hover {
          transform: translateY(-6px);
        }

        .feature-chip {
          transition: all 0.3s ease;
        }

        .feature-chip:hover {
          transform: scale(1.05);
        }

        .price-glow {
          text-shadow: 0 0 20px currentColor;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }

        .float-anim {
          animation: float 4s ease-in-out infinite;
        }

        .card-hidden {
          opacity: 0;
          transform: translateY(60px);
        }

        .card-visible {
          opacity: 1;
          transform: translateY(0);
          transition: all 0.8s cubic-bezier(0.34, 1.2, 0.64, 1);
        }
      `}</style>

      <SiteNavigation />

      {/* ✨ HERO avec carrousel arrière-plan */}
      <section className="relative pt-32 pb-24 overflow-hidden">

        {/* Carrousel arrière-plan */}
        {backgrounds.map((bg, index) => (
          <div
            key={index}
            className="absolute inset-0 transition-opacity duration-1000"
            style={{
              backgroundImage: `url(${bg})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              opacity: currentBg === index ? 1 : 0,
            }}
          />
        ))}
        {/* Overlay */}
        <div className="absolute inset-0 bg-white/80"></div>

        {/* Formes décoratives */}
        <div className="absolute top-20 right-0 w-96 h-96 bg-cyan-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>

        <div className="relative max-w-7xl mx-auto px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            {/* Badge animé */}
            <div className="inline-flex items-center gap-2 px-5 py-2 bg-cyan-100 border border-cyan-200 rounded-full text-cyan-700 font-semibold text-sm mb-8 shadow-lg">
              <span className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse"></span>
               {t('services.title')}
            </div>

            <h1 className="text-6xl lg:text-7xl font-black mb-6 leading-tight">
              {t('services.title')}{' '}
              <span className="gradient-text">SmartCabb</span>
            </h1>

            <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-10">
              {t('services.subtitle')}
            </p>

            {/* Pills des catégories */}
            <div className="flex flex-wrap justify-center gap-3">
              {services.map((s, i) => (
                <a
                  key={i}
                  href={`#${s.id}`}
                  className={`px-5 py-2 ${s.badgeColor} text-white rounded-full text-sm font-bold hover:scale-105 hover:shadow-lg transition-all`}
                >
                  {s.emoji} {s.name}
                </a>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/*  SERVICES - Animations ultra wow */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid gap-16">
            {services.map((service, index) => {
              const isVisible = visibleServices.includes(index);
              const isEven = index % 2 === 0;

              return (
                <div
                  key={service.id}
                  id={service.id}
                  ref={el => serviceRefs.current[index] = el}
                  className={`card-hidden ${isVisible ? 'card-visible' : ''}`}
                  style={{ transitionDelay: `${index * 0.1}s` }}
                >
                  <div
                    className="service-card relative p-1 rounded-3xl overflow-hidden shadow-2xl"
                    style={{
                      background: `linear-gradient(135deg, ${service.glowColor}, transparent, ${service.glowColor})`,
                    }}
                  >
                    {/* Carte intérieure */}
                    <div className="bg-white rounded-3xl p-8 relative overflow-hidden">

                      {/* Fond décoratif */}
                      <div
                        className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl opacity-10"
                        style={{ background: `radial-gradient(circle, ${service.glowColor}, transparent)` }}
                      ></div>

                      {/* Numéro décoratif */}
                      <div
                        className="absolute bottom-4 right-8 text-9xl font-black opacity-5"
                        style={{ color: service.glowColor }}
                      >
                        0{index + 1}
                      </div>

                      <div className={`grid lg:grid-cols-2 gap-10 items-center`}>

                        {/* IMAGE — alterne gauche/droite */}
                        <div className={`${isEven ? 'lg:order-1' : 'lg:order-2'} ${isVisible ? (isEven ? 'animate-slide-left' : 'animate-slide-right') : 'opacity-0'}`}>
                          <div className="relative">
                            {/* Glow derrière l'image */}
                            <div
                              className="absolute -inset-4 rounded-3xl blur-2xl opacity-20"
                              style={{ background: `linear-gradient(135deg, ${service.glowColor}, transparent)` }}
                            ></div>
                            <div className="relative">
                              <ImageCarousel images={service.images} serviceName={service.name} />
                            </div>
                          </div>
                        </div>

                        {/* INFOS */}
                        <div className={`${isEven ? 'lg:order-2' : 'lg:order-1'} ${isVisible ? 'animate-slide-up' : 'opacity-0'}`}>

                          {/* Badge */}
                          <div className={`inline-flex items-center gap-2 px-4 py-2 ${service.badgeColor} text-white rounded-full text-xs font-black mb-5 shadow-lg`}>
                            <span>{service.emoji}</span>
                            {service.badge}
                          </div>

                          {/* Titre */}
                          <h2 className="text-4xl font-black mb-4 text-gray-900">
                            {service.name}
                          </h2>

                          {/* Description */}
                          <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                            {language === 'fr' ? service.subtitleFR : service.subtitleEN}
                          </p>

                          {/* Features chips */}
                          <div className="grid grid-cols-2 gap-3 mb-6">
                            {(language === 'fr' ? service.featuresFR : service.featuresEN).map((feature, idx) => (
                              <div
                                key={idx}
                                className={`feature-chip flex items-center gap-3 p-3 ${service.bgColor} border ${service.borderColor} rounded-2xl`}
                                style={{ animationDelay: `${idx * 0.1}s` }}
                              >
                                <span className="text-2xl">{feature.icon}</span>
                                <span className="font-bold text-sm text-gray-800">{feature.text}</span>
                              </div>
                            ))}
                          </div>

                          {/* Véhicules */}
                          <div className="mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <p className="text-xs font-black text-gray-400 mb-2 tracking-widest">
                              {language === 'fr' ? '🚗 VÉHICULES DISPONIBLES' : '🚗 AVAILABLE VEHICLES'}
                            </p>
                            <p className="text-sm text-gray-700 font-semibold">{service.vehicules}</p>
                          </div>

                          {/* Prix + CTA */}
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs text-gray-400 font-semibold mb-1">
                                {language === 'fr' ? 'TARIF' : 'PRICE'}
                              </p>
                              <p
                                className={`text-xl font-black bg-gradient-to-r ${service.gradientFrom} ${service.gradientTo} bg-clip-text text-transparent`}
                              >
                                {language === 'fr' ? service.priceFR : service.priceEN}
                              </p>
                            </div>

                            <Link
                              to="/app/passenger"
                              className={`relative group px-7 py-4 bg-gradient-to-r ${service.gradientFrom} ${service.gradientTo} text-white font-black rounded-full hover:shadow-2xl hover:scale-105 transition-all overflow-hidden`}
                            >
                              <span className="relative z-10">{t('services.bookNow')} →</span>
                              <div className="absolute inset-0 shimmer"></div>
                            </Link>
                          </div>

                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-br from-cyan-600 to-cyan-700 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-1/4 w-72 h-72 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-white rounded-full blur-3xl"></div>
        </div>

        <div className="relative max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-5xl font-black text-white mb-6">{t('cta.title')}</h2>
            <p className="text-xl text-cyan-100 mb-10">{t('cta.subtitle')}</p>
            <Link
              to="/app/passenger"
              className="inline-block px-10 py-5 bg-white text-cyan-600 font-black text-lg rounded-full hover:shadow-2xl hover:scale-105 transition-all"
            >
              {t('cta.startNow')} 
            </Link>
          </motion.div>
        </div>
      </section>

      <ProfessionalFooter />
      <ChatWidget />
    </div>
  );
}
