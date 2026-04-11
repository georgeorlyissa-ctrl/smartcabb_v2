import { motion } from '../lib/motion';
import { ChatWidget } from '../components/ChatWidget';
import { ProfessionalFooter } from '../components/ProfessionalFooter';
import { SiteNavigation } from '../components/SiteNavigation';
import { useLanguage } from '../contexts/LanguageContext';

export function AboutPage() {
  const { t, language } = useLanguage();

  // ============================================================
  // ✅ POUR REMPLACER UNE IMAGE :
  // 1. Mets ta photo dans le dossier public/
  // 2. Remplace l'URL Unsplash par '/nom-de-ton-image.jpg'
  // Exemple : image: '/excellence-smartcabb.jpg'
  // ============================================================
  // ============================================================
  // ✅ POUR REMPLACER UNE IMAGE :
  // 1. Mets ta photo dans le dossier public/
  // 2. Remplace l'URL Unsplash par '/nom-de-ton-image.jpg'
  // Exemple : image: '/excellence-smartcabb.jpg'
  // ============================================================
  const values = [
    {
      image: 'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=400&h=300&fit=crop',
      // ↑ Remplace cette URL par ton image si tu veux
      
      titleFR: 'Excellence',
      titleEN: 'Excellence',
      descFR: "Nous visons l'excellence dans chaque aspect de notre service",
      descEN: 'We aim for excellence in every aspect of our service',
      gradient: 'from-blue-400 to-blue-600',
      shadow: 'shadow-blue-500/50'
    },
    {
      image: '/confiance.png',
      // ↑ Remplace cette URL par ton image si tu veux
      
      titleFR: 'Confiance',
      titleEN: 'Trust',
      descFR: 'La confiance de nos clients est notre priorité absolue',
      descEN: "Our customers' trust is our top priority",
      gradient: 'from-green-400 to-green-600',
      shadow: 'shadow-green-500/50'
    },
    {
      image: 'tech.jpg',
      // ↑ Remplace cette URL par ton image si tu veux
      
      titleFR: 'Innovation',
      titleEN: 'Innovation',
      descFR: 'Nous innovons constamment pour améliorer votre expérience',
      descEN: 'We constantly innovate to improve your experience',
      gradient: 'from-yellow-400 to-orange-500',
      shadow: 'shadow-yellow-500/50'
    },
    
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

        @keyframes float3d {
          0%, 100% { transform: translateY(0px) rotateX(0deg) rotateY(0deg); }
          50% { transform: translateY(-15px) rotateX(10deg) rotateY(10deg); }
        }

        @keyframes pulse3d {
          0%, 100% { transform: scale(1); box-shadow: 0 10px 30px -10px rgba(0,0,0,0.3); }
          50% { transform: scale(1.05); box-shadow: 0 20px 40px -10px rgba(0,0,0,0.4); }
        }

        @keyframes rotate3d {
          0% { transform: perspective(1000px) rotateY(0deg); }
          100% { transform: perspective(1000px) rotateY(360deg); }
        }

        @keyframes floatIcon {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }

        .icon-3d {
          animation: float3d 3s ease-in-out infinite;
          transition: all 0.3s ease;
          transform-style: preserve-3d;
          perspective: 1000px;
        }

        .icon-3d:hover {
          animation: rotate3d 1s ease-in-out;
          transform: scale(1.1) translateY(-5px);
        }

        .icon-float {
          animation: floatIcon 3s ease-in-out infinite;
        }

        .value-card {
          transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .value-card:hover {
          transform: translateY(-12px);
        }

        .value-card:hover .card-image {
          transform: scale(1.08);
        }

        .card-image {
          transition: transform 0.5s ease;
        }

        .value-card:hover .icon-3d {
          animation: pulse3d 1s ease-in-out infinite;
        }
      `}</style>

      <SiteNavigation />

      {/* Hero */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-50 via-white to-blue-50"></div>
        <div className="relative max-w-7xl mx-auto px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-6xl font-black mb-6">
              {language === 'fr' ? 'À propos de SmartCabb' : 'About SmartCabb'}
            </h1>
            
          </motion.div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">

          <div className="grid lg:grid-cols-2 gap-8">

            {/* Mission */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="relative p-10 rounded-3xl overflow-hidden bg-gradient-to-br from-blue-50 via-cyan-50 to-blue-100"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-200/30 rounded-full blur-3xl"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-cyan-200/30 rounded-full blur-3xl"></div>
              <div className="relative">
                <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mb-6">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-4xl font-black mb-6 text-gray-900">
                  {language === 'fr' ? 'Notre mission' : 'Our mission'}
                </h2>
                <p className="text-lg text-gray-700 leading-relaxed">
                  {language === 'fr'
                    ? 'Révolutionner le transport en RD Congo en offrant une solution moderne, sûre et accessible à tous les Congolais, avec des tarifs transparents et un service irréprochable.'
                    : 'Revolutionize transportation in DR Congo by offering a modern, safe and accessible solution to all Congolese, with transparent pricing and impeccable service.'}
                </p>
              </div>
            </motion.div>

            {/* Vision */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
              className="relative p-10 rounded-3xl overflow-hidden bg-gradient-to-br from-purple-50 via-pink-50 to-purple-100"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-purple-200/30 rounded-full blur-3xl"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-pink-200/30 rounded-full blur-3xl"></div>
              <div className="relative">
                <div className="w-14 h-14 bg-purple-600 rounded-2xl flex items-center justify-center mb-6">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
                <h2 className="text-4xl font-black mb-6 text-gray-900">
                  {language === 'fr' ? 'Notre vision' : 'Our vision'}
                </h2>
                <p className="text-lg text-gray-700 leading-relaxed">
                  {language === 'fr'
                    ? "Devenir le leader du transport intelligent en Afrique centrale, en connectant toutes les grandes villes de la RDC et en créant un écosystème de mobilité moderne et durable."
                    : 'Become the leader of smart transportation in Central Africa, connecting all major cities in the DRC and creating a modern and sustainable mobility ecosystem.'}
                </p>
              </div>
            </motion.div>

          </div>

          {/* Image illustrative */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            viewport={{ once: true }}
            className="mt-10 relative rounded-3xl overflow-hidden shadow-2xl h-80"
          >
            <img
              src="/about-smartcabb.png"
              alt="SmartCabb en action"
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.src = 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=1200&h=400&fit=crop';
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-900/60 to-transparent flex items-center px-12">
              <div>
                <h3 className="text-4xl font-black text-white mb-3">
                  {language === 'fr' ? 'SmartCabb en action' : 'SmartCabb in action'}
                </h3>
                <p className="text-cyan-100 text-lg">
                  {language === 'fr'
                    ? 'Le transport intelligent au service des Congolais'
                    : 'Smart transport serving Congolese people'}
                </p>
              </div>
            </div>
          </motion.div>

        </div>
      </section>

      {/* ✨ Nos Valeurs — avec images + icônes 3D */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">

          <div className="text-center mb-16">
            <h2 className="text-5xl font-black mb-4">{t('about.values')}</h2>
            <p className="text-xl text-gray-600">
              {language === 'fr'
                ? 'Les principes qui guident notre action au quotidien'
                : 'The principles that guide our daily actions'}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {values.map((value, index) => (
              <motion.div
                key={index}
                className="value-card bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 text-center group"
                initial={{ opacity: 0, y: 80, scale: 0.8 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                  duration: 0.7,
                  delay: index * 0.25,
                  ease: [0.34, 1.56, 0.64, 1],
                  type: "spring",
                  stiffness: 100
                }}
                viewport={{ once: true, margin: "-50px" }}
              >
                {/* Image en haut */}
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={value.image}
                    alt={value.titleFR}
                    className="card-image w-full h-full object-cover"
                  />
                  {/* Overlay gradient coloré */}
                  <div className={`absolute inset-0 bg-gradient-to-t ${value.gradient} opacity-40`}></div>

                  {/* Icône 3D flottante centrée entre image et contenu */}
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 z-10">
                    <div
                      className={`icon-float w-16 h-16 rounded-2xl bg-gradient-to-br ${value.gradient} ${value.shadow} shadow-2xl flex items-center justify-center text-3xl border-4 border-white`}
                      style={{ animationDelay: `${index * 0.5}s` }}
                    >
                      <div className="absolute inset-0 rounded-2xl bg-white/20 animate-pulse"></div>
                      <span className="relative z-10" style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))' }}>
                        {value.icon}
                      </span>
                      <div className="absolute -inset-1 rounded-2xl border-2 border-white/30 animate-ping opacity-20"></div>
                    </div>
                  </div>
                </div>

                {/* Contenu bas */}
                <div className="pt-12 pb-8 px-6">
                  {/* Ligne colorée centrée */}
                  <div className={`w-12 h-1 mx-auto rounded-full bg-gradient-to-r ${value.gradient} mb-4`}></div>

                  <h3 className="text-2xl font-black text-gray-900 mb-3">
                    {language === 'fr' ? value.titleFR : value.titleEN}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {language === 'fr' ? value.descFR : value.descEN}
                  </p>

                  {/* Ligne animée au hover */}
                  <div className={`mt-6 h-1 w-16 mx-auto rounded-full bg-gradient-to-r ${value.gradient} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500`}></div>
                </div>
              </motion.div>
            ))}
          </div>

          
        </div>
      </section>

      {/* Stats */}
      <section className="py-20 bg-gradient-to-br from-cyan-500 to-cyan-600">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 text-center text-white">
            {[
              { value: '10,000+', labelFR: 'Courses complétées', labelEN: 'Completed rides' },
              { value: '500+', labelFR: 'Chauffeurs actifs', labelEN: 'Active drivers' },
              { value: '5,000+', labelFR: 'Clients satisfaits', labelEN: 'Happy clients' },
              { value: '4.8/5', labelFR: 'Note moyenne', labelEN: 'Average rating' }
            ].map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.5 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <div className="text-5xl font-black mb-2">{stat.value}</div>
                <div className="text-cyan-100 font-semibold">
                  {language === 'fr' ? stat.labelFR : stat.labelEN}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <ProfessionalFooter />
      <ChatWidget />
    </div>
  );
}
