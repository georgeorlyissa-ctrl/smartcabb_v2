import { Link } from '../lib/simple-router';
import { useState, useEffect, lazy, Suspense } from 'react';
import { motion } from '../lib/motion';
import { ProfessionalFooter } from '../components/ProfessionalFooter';
import { useLanguage } from '../contexts/LanguageContext';
import { LanguageSelector } from '../components/LanguageSelector';

// Images de témoignages - Visages africains professionnels
const testimonialImages = [
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80',
  'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=200&q=80'
];

// Lazy load des composants non critiques
const SocialFooter = lazy(() => import('../components/SocialFooter').then(module => ({ default: module.SocialFooter })));
const ChatWidget = lazy(() => import('../components/ChatWidget').then(module => ({ default: module.ChatWidget })));

export function LandingPage() {
  const [activeSection, setActiveSection] = useState('home');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const { t } = useLanguage();

  // Effet parallaxe au scroll
  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
      const sections = ['home', 'how', 'why', 'testimonials', 'cta'];
      const current = sections.find(section => {
        const element = document.getElementById(section);
        if (element) {
          const rect = element.getBoundingClientRect();
          return rect.top <= 100 && rect.bottom >= 100;
        }
        return false;
      });
      if (current) setActiveSection(current);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Animation des statistiques
  useEffect(() => {
    const animateValue = (element: HTMLElement, target: number, suffix: string) => {
      let current = 0;
      const increment = target / 50;
      const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
          element.textContent = target + suffix;
          clearInterval(timer);
        } else {
          element.textContent = Math.floor(current) + suffix;
        }
      }, 30);
    };

    const stats = document.querySelectorAll('.stat-number');
    stats.forEach((stat) => {
      const element = stat as HTMLElement;
      const target = parseInt(element.getAttribute('data-target') || '0');
      const suffix = element.getAttribute('data-suffix') || '';
      animateValue(element, target, suffix);
    });
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Playfair+Display:wght@400;600;700;800&display=swap');
        
        * {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif !important;
        }

        html {
          scroll-behavior: smooth;
        }

        .gradient-text {
          background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .glass-effect {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.3);
        }

        .hover-lift {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .hover-lift:hover {
          transform: translateY(-8px);
          box-shadow: 0 20px 40px rgba(6, 182, 212, 0.2);
        }

        .floating {
          animation: floating 6s ease-in-out infinite;
        }

        @keyframes floating {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }

        .fade-in-up {
          animation: fadeInUp 0.8s ease-out forwards;
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .shimmer {
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
          animation: shimmer 2s infinite;
        }

        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        .pulse-slow {
          animation: pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>

      {/* Navigation Ultra Moderne */}
      <nav className="fixed top-0 w-full glass-effect z-50 border-b border-white/20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo Premium */}
            <Link to="/" className="flex items-center gap-3 group">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-2xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity"></div>
                <div className="relative w-12 h-12">
  <img 
    src="/logo-smartcabb.jpeg"  // ← mets le nom exact de ton fichier logo ici
    alt="SmartCabb Logo"
    className="w-full h-full object-contain"
  />
</div>
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-black tracking-tight">
                  SMART<span className="gradient-text">CABB</span>
                </span>
                <span className="text-xs text-gray-500 -mt-1">Transport intelligent</span>
              </div>
            </Link>

            {/* Desktop Menu */}
            <div className="hidden lg:flex items-center gap-8">
              <a href="#home" className={`font-semibold transition-all ${activeSection === 'home' ? 'text-cyan-600' : 'text-gray-700 hover:text-cyan-600'}`}>
                {t('nav.home')}
              </a>
              <a href="#how" className={`font-semibold transition-all ${activeSection === 'how' ? 'text-cyan-600' : 'text-gray-700 hover:text-cyan-600'}`}>
                {t('nav.howItWorks')}
              </a>
              <a href="#why" className={`font-semibold transition-all ${activeSection === 'why' ? 'text-cyan-600' : 'text-gray-700 hover:text-cyan-600'}`}>
                {t('nav.whyUs')}
              </a>
              <a href="#testimonials" className={`font-semibold transition-all ${activeSection === 'testimonials' ? 'text-cyan-600' : 'text-gray-700 hover:text-cyan-600'}`}>
                {t('nav.testimonials')}
              </a>
              <Link to="/contact" className="font-semibold text-gray-700 hover:text-cyan-600 transition-all">
                {t('nav.contact')}
              </Link>
              
              {/* Language Selector */}
              <LanguageSelector />
              
              <Link 
                to="/app/passenger"
                className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white font-bold rounded-full hover:shadow-xl hover:scale-105 transition-all"
              >
                {t('nav.login')}
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
              </svg>
            </button>
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="lg:hidden py-4 border-t border-white/20">
              <div className="flex flex-col gap-3">
                <a href="#home" className="font-semibold text-gray-700 hover:text-cyan-600 py-2">{t('nav.home')}</a>
                <a href="#how" className="font-semibold text-gray-700 hover:text-cyan-600 py-2">{t('nav.howItWorks')}</a>
                <a href="#why" className="font-semibold text-gray-700 hover:text-cyan-600 py-2">{t('nav.whyUs')}</a>
                <a href="#testimonials" className="font-semibold text-gray-700 hover:text-cyan-600 py-2">{t('nav.testimonials')}</a>
                <Link to="/contact" className="font-semibold text-gray-700 hover:text-cyan-600 py-2">{t('nav.contact')}</Link>
                
                {/* Language Selector Mobile */}
                <div className="py-2">
                  <LanguageSelector />
                </div>
                
                <Link to="/app" className="mt-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white font-bold rounded-full text-center">
                  {t('nav.login')}
                </Link>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section Ultra Moderne */}
      <section id="home" className="relative pt-32 pb-20 overflow-hidden">
        {/* Background avec dégradé cyan professionnel */}
        {/* Carrousel d'arrière-plan automatique */}
{(() => {
  const [currentBg, setCurrentBg] = useState(0);
  const backgrounds = [
    '/photo2_smartcabb.jpeg',
    '/Images_2.jpeg',  // ← ajoute tes autres images ici
    '/fille_smartcabb.png',  // ← même nom que dans ton dossier public
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentBg(prev => (prev + 1) % backgrounds.length);
    }, 4000); // change toutes les 4 secondes
    return () => clearInterval(timer);
  }, []);

  return (
    <>
      {backgrounds.map((bg, index) => (
        <div
          key={index}
          className="absolute inset-0 transition-opacity duration-1000"
          style={{
            backgroundImage: `url(${bg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            opacity: currentBg === index ? 1 : 0,
          }}
        />
      ))}
      {/* Overlay */}
      <div className="absolute inset-0 bg-white/75"></div>
    </>
  );
})()}
        
        {/* Formes décoratives animées */}
        <div className="absolute top-20 right-0 w-96 h-96 bg-cyan-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute bottom-20 left-0 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '1s' }}></div>

        <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Contenu gauche */}
            <div className="fade-in-up">
              {/* 🚫 BADGE SUPPRIMÉ */}
              
              <h1 className="text-6xl lg:text-7xl font-black mb-6 leading-tight">
                {t('hero.title1')}<br/>
                <span className="gradient-text">{t('hero.title2')}</span>
              </h1>
              
              <p style={{ fontFamily: "'Playfair Display', serif", fontWeight: '700' }} 
   className="text-xl text-gray-800 mb-8 leading-relaxed tracking-wide">
  {t('hero.description')}
              </p>
              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 mb-12">
                <Link 
                  to="/app/passenger"
                  className="group relative px-8 py-4 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white font-bold rounded-full hover:shadow-2xl transition-all overflow-hidden"
                >
                  <span className="relative z-10">{t('hero.bookRide')}</span>
                  <div className="absolute inset-0 shimmer"></div>
                </Link>
                
                <Link 
                  to="/drivers"
                  className="px-8 py-4 bg-white text-cyan-600 font-bold rounded-full border-2 border-cyan-500 hover:bg-cyan-50 transition-all"
                >
                  {t('hero.becomeDriver')}
                </Link>
              </div>

              {/* Stats modernes */}
              <div className="grid grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-4xl font-black gradient-text stat-number" data-target="150" data-suffix="+">0</div>
                  <div className="text-sm text-gray-600 mt-1">{t('hero.activeDrivers')}</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-black gradient-text stat-number" data-target="1000" data-suffix="+">0</div>
                  <div className="text-sm text-gray-600 mt-1">{t('hero.happyClients')}</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-black gradient-text stat-number" data-target="24" data-suffix="/7">0</div>
                  <div className="text-sm text-gray-600 mt-1">{t('hero.available')}</div>
                </div>
              </div>
            </div>

            {/* Carrousel d'images droit */}
            <div className="relative hidden lg:block">
              <div className="relative">
                {/* Image principale SmartCabb */}
                <motion.div
                  className="relative h-[600px] rounded-3xl overflow-hidden shadow-2xl"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.8 }}
                >
                  <img 
                    src="/hero-smartcabb.png"
                    alt="SmartCabb App - Carte, téléphone et taxi"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Fallback vers une image Unsplash si l'image locale n'existe pas
                      e.currentTarget.src = 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=800&h=600&fit=crop';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                </motion.div>

                {/* Badges flottants */}
                <motion.div 
                  className="absolute -top-6 -right-6 px-6 py-3 bg-white rounded-2xl shadow-xl"
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 3, repeat: Infinity }}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="font-bold text-gray-900">50+ en ligne</span>
                  </div>
                </motion.div>

                <motion.div 
                  className="absolute -bottom-6 -left-6 px-6 py-3 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white rounded-2xl shadow-xl"
                  animate={{ y: [0, 10, 0] }}
                  transition={{ duration: 3, repeat: Infinity, delay: 1 }}
                >
                  <div className="text-center">
                    <div className="text-2xl font-black">4.9⭐</div>
                    <div className="text-xs">Note moyenne</div>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Comment ça marche - Design épuré */}
      <section id="how" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-black mb-4">{t('how.title1')} <span className="gradient-text">{t('how.title2')}</span></h2>
            <p className="text-xl text-gray-600">{t('how.subtitle')}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {(() => {
  const [vehiculeIndex, setVehiculeIndex] = useState(0);
  const vehicules = [
    '/Stadard_5.png',  // ← ton image véhicule 1
    '/TOYOTA NOAH_2.png',  // ← ton image véhicule 2
    '/Confort_4.png',  // ← ton image véhicule 3
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setVehiculeIndex(prev => (prev + 1) % vehicules.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  const steps = [
    {
      number: '01',
      image: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=600&h=400&fit=crop',
      badge: '📍 GPS Temps réel',
      title: t('how.step1.title'),
      description: t('how.step1.description'),
      color: 'from-cyan-500 to-blue-500',
      isCarousel: false
    },
    {
      number: '02',
      image: vehicules[vehiculeIndex],
      badge: '🚗 Votre choix',
      title: t('how.step2.title'),
      description: t('how.step2.description'),
      color: 'from-blue-500 to-indigo-500',
      isCarousel: true
    },
    {
      number: '03',
      image: '/fille_smartcabb.png',
      badge: '⭐ Expérience Premium',
      title: t('how.step3.title'),
      description: t('how.step3.description'),
      color: 'from-indigo-500 to-cyan-500',
      isCarousel: false
    }
  ];

  return steps.map((step, index) => (
    <motion.div
      key={index}
      className="relative rounded-3xl overflow-hidden shadow-2xl hover-lift group"
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.2 }}
      viewport={{ once: true }}
    >
      {/* Image */}
      <div className="relative h-56 overflow-hidden">
        <img 
          src={step.image}
          alt={step.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-all duration-700"
        />
        {/* Overlay */}
        <div className={`absolute inset-0 bg-gradient-to-t ${step.color} opacity-60`}></div>

        {/* Numéro */}
        <div className="absolute top-4 left-4 text-7xl font-black text-white/20">
          {step.number}
        </div>

        {/* Badge */}
        <div className="absolute bottom-4 left-4 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-white text-sm font-semibold border border-white/30">
          {step.badge}
        </div>

        {/* Points indicateurs carrousel */}
        {step.isCarousel && (
          <div className="absolute bottom-4 right-4 flex gap-2">
            {vehicules.map((_, i) => (
              <button
                key={i}
                onClick={() => setVehiculeIndex(i)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  vehiculeIndex === i ? 'bg-white w-5' : 'bg-white/50'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Contenu */}
      <div className="p-6 bg-white">
        <div className={`w-12 h-1 rounded-full bg-gradient-to-r ${step.color} mb-4`}></div>
        <h3 className="text-2xl font-black text-gray-900 mb-2">{step.title}</h3>
        <p className="text-gray-600 leading-relaxed">{step.description}</p>
        <div className={`mt-4 inline-flex items-center gap-2 text-sm font-bold bg-gradient-to-r ${step.color} bg-clip-text text-transparent`}>
          En savoir plus
          <span className="group-hover:translate-x-2 transition-transform duration-300">→</span>
        </div>
      </div>
    </motion.div>
  ));
})()}
          </div>
        </div>
      </section>

      {/* Pourquoi SmartCabb - Grid moderne */}
      <section id="why" className="py-24 bg-gradient-to-b from-white to-slate-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-black mb-4">{t('why.title1')} <span className="gradient-text">{t('why.title2')}</span></h2>
            <p className="text-xl text-gray-600">{t('why.subtitle')}</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
  icon: '🚀',
  gradient: 'from-orange-400 to-red-500',
  shadow: 'shadow-orange-200',
  title: t('why.fast'),
  description: t('why.fastDesc')
},
{
  icon: '🛡️',
  gradient: 'from-blue-400 to-blue-600',
  shadow: 'shadow-blue-200',
  title: t('why.secure'),
  description: t('why.secureDesc')
},
{
  icon: '💎',
  gradient: 'from-cyan-400 to-cyan-600',
  shadow: 'shadow-cyan-200',
  title: t('why.affordable'),
  description: t('why.affordableDesc')
},
{
  icon: '📲',
  gradient: 'from-purple-400 to-purple-600',
  shadow: 'shadow-purple-200',
  title: t('why.simple'),
  description: t('why.simpleDesc')
},
{
  icon: '🏆',
  gradient: 'from-yellow-400 to-orange-500',
  shadow: 'shadow-yellow-200',
  title: t('why.quality'),
  description: t('why.qualityDesc')
},
{
  icon: '💳',
  gradient: 'from-green-400 to-emerald-600',
  shadow: 'shadow-green-200',
  title: t('why.flexible'),
  description: t('why.flexibleDesc')
},
{
  icon: '🎯',
  gradient: 'from-pink-400 to-rose-600',
  shadow: 'shadow-pink-200',
  title: t('why.reliable'),
  description: t('why.reliableDesc')
}
            ].map((feature, index) => (
              <motion.div
                key={index}
                className="p-6 bg-white rounded-2xl shadow-lg hover-lift border border-gray-100"
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <div className="text-5xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                <p className="text-gray-600 text-sm">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Témoignages avec photos - Section Premium */}
      <section id="testimonials" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-black mb-4">{t('testimonials.title1')} <span className="gradient-text">{t('testimonials.title2')}</span></h2>
            <p className="text-xl text-gray-600">{t('testimonials.subtitle')}</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                name: t('testimonials.client1.name'),
                role: t('testimonials.client1.role'),
                image: testimonialImages[0],
                rating: 5,
                text: t('testimonials.client1.text')
              },
              {
                name: t('testimonials.client2.name'),
                role: t('testimonials.client2.role'),
                image: testimonialImages[1],
                rating: 5,
                text: t('testimonials.client2.text')
              },
              {
                name: t('testimonials.client3.name'),
                role: t('testimonials.client3.role'),
                image: testimonialImages[2],
                rating: 5,
                text: t('testimonials.client3.text')
              },
              {
                name: t('testimonials.client4.name'),
                role: t('testimonials.client4.role'),
                image: testimonialImages[3],
                rating: 5,
                text: t('testimonials.client4.text')
              }
            ].map((testimonial, index) => (
              <motion.div
                key={index}
                className="relative p-8 bg-gradient-to-br from-white to-gray-50 rounded-3xl shadow-xl hover-lift border border-gray-100"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.15 }}
                viewport={{ once: true }}
              >
                {/* Quote icon */}
                <div className="absolute top-6 right-6 text-6xl text-cyan-200 opacity-50">"</div>
                
                {/* 🚫 Photo supprimée - Infos uniquement */}
                <div className="mb-6 relative z-10">
                  <div className="font-bold text-gray-900">{testimonial.name}</div>
                  <div className="text-sm text-gray-600">{testimonial.role}</div>
                </div>

                {/* Rating */}
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <span key={i} className="text-yellow-400 text-xl">⭐</span>
                  ))}
                </div>

                {/* Témoignage */}
                <p className="text-gray-700 leading-relaxed italic">
                  "{testimonial.text}"
                </p>
              </motion.div>
            ))}
          </div>

          {/* Trust badges */}
          <div className="mt-16 flex flex-wrap justify-center items-center gap-8">
            <div className="text-center">
              <div className="text-3xl font-black text-cyan-600">1000+</div>
              <div className="text-sm text-gray-600">{t('testimonials.reviews5Stars')}</div>
            </div>
            <div className="w-px h-12 bg-gray-300"></div>
            <div className="text-center">
              <div className="text-3xl font-black text-cyan-600">98%</div>
              <div className="text-sm text-gray-600">{t('testimonials.satisfaction')}</div>
            </div>
            <div className="w-px h-12 bg-gray-300"></div>
            <div className="text-center">
              <div className="text-3xl font-black text-cyan-600">4.9/5</div>
              <div className="text-sm text-gray-600">{t('testimonials.avgRating')}</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Final - Ultra attractif */}
      <section id="cta" className="py-24 bg-gradient-to-br from-cyan-600 to-cyan-700 relative overflow-hidden">
        {/* Patterns décoratifs */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-1/4 w-72 h-72 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-white rounded-full blur-3xl"></div>
        </div>

        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-5xl lg:text-6xl font-black text-white mb-6">
              {t('cta.title')}
            </h2>
            <p className="text-xl text-cyan-100 mb-10">
              {t('cta.subtitle')}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                to="/app/passenger"
                className="group relative px-10 py-5 bg-white text-cyan-600 font-black text-lg rounded-full hover:shadow-2xl transition-all overflow-hidden"
              >
                <span className="relative z-10">{t('cta.startNow')}</span>
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-yellow-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </Link>
              
              <Link 
                to="/drivers"
                className="px-10 py-5 bg-transparent text-white font-black text-lg rounded-full border-3 border-white hover:bg-white hover:text-cyan-600 transition-all"
              >
                {t('cta.becomePartner')}
              </Link>
            </div>

            {/* App badges */}
            <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center items-center">
              <div className="px-6 py-3 bg-white/10 backdrop-blur-lg rounded-xl border border-white/20">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">📱</span>
                  <div className="text-left">
                    <div className="text-xs text-cyan-200">{t('cta.availableOn')}</div>
                    <div className="font-bold text-white">{t('cta.iosAndroid')}</div>
                  </div>
                </div>
              </div>
              <div className="px-6 py-3 bg-white/10 backdrop-blur-lg rounded-xl border border-white/20">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">💳</span>
                  <div className="text-left">
                    <div className="text-xs text-cyan-200">{t('cta.payment')}</div>
                    <div className="font-bold text-white">{t('cta.cashMobile')}</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer Professionnel */}
      <ProfessionalFooter />

      {/* Chat Widget */}
      <Suspense fallback={null}>
        <ChatWidget />
      </Suspense>
    </div>
  );
}
