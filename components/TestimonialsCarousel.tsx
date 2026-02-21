import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from '../lib/motion';

interface Testimonial {
  id: number;
  name: string;
  role: string;
  location: string;
  rating: number;
  text: string;
  avatar: string;
  highlight?: string; // Partie à mettre en avant
}

interface TestimonialsCarouselProps {
  testimonials: Testimonial[];
  autoPlayInterval?: number; // En millisecondes
  theme?: 'green' | 'blue' | 'purple';
}

export function TestimonialsCarousel({ 
  testimonials, 
  autoPlayInterval = 5000,
  theme = 'green' 
}: TestimonialsCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Auto-play
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setDirection(1);
      setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    }, autoPlayInterval);

    return () => clearInterval(interval);
  }, [currentIndex, testimonials.length, autoPlayInterval, isPaused]);

  const goToSlide = (index: number) => {
    setDirection(index > currentIndex ? 1 : -1);
    setCurrentIndex(index);
  };

  const themeColors = {
    green: {
      primary: 'bg-green-500',
      light: 'bg-green-50',
      text: 'text-green-600',
      border: 'border-green-200'
    },
    blue: {
      primary: 'bg-blue-500',
      light: 'bg-blue-50',
      text: 'text-blue-600',
      border: 'border-blue-200'
    },
    purple: {
      primary: 'bg-purple-500',
      light: 'bg-purple-50',
      text: 'text-purple-600',
      border: 'border-purple-200'
    }
  };

  const colors = themeColors[theme];
  const current = testimonials[currentIndex];

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0,
      scale: 0.8
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
      scale: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 1000 : -1000,
      opacity: 0,
      scale: 0.8
    })
  };

  return (
    <div className="relative">
      {/* Carte de témoignage */}
      <div 
        className="relative overflow-hidden"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.3 },
              scale: { duration: 0.3 }
            }}
          >
            {/* Carte principale */}
            <div className={`bg-white rounded-2xl shadow-lg border ${colors.border} p-8 md:p-12 relative`}>
              {/* Icône de citation */}
              <div className={`absolute top-6 right-6 ${colors.primary} w-12 h-12 rounded-full flex items-center justify-center opacity-10`}>
                {/* Quote icon inline */}
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/>
                  <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/>
                </svg>
              </div>

              <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-6">
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div className={`w-20 h-20 rounded-full ${colors.primary} flex items-center justify-center text-white text-2xl font-bold shadow-lg`}>
                    {current.avatar}
                  </div>
                  {/* Badge vérifié */}
                  <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-md">
                    <div className={`${colors.primary} w-6 h-6 rounded-full flex items-center justify-center`}>
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Info utilisateur */}
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-1">
                    {current.name}
                  </h3>
                  <p className="text-gray-600 mb-2">
                    {current.role}
                  </p>
                  <p className="text-sm text-gray-500 mb-2">
                    📍 {current.location}
                  </p>
                  {/* Étoiles */}
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <svg
                        key={i}
                        className={`w-4 h-4 ${
                          i < current.rating
                            ? `${colors.text} fill-current`
                            : 'text-gray-300'
                        }`}
                        viewBox="0 0 24 24"
                        fill={i < current.rating ? 'currentColor' : 'none'}
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    ))}
                    <span className="ml-2 text-sm text-gray-600">
                      {current.rating}/5
                    </span>
                  </div>
                </div>
              </div>

              {/* Témoignage */}
              <div className="relative">
                <p className="text-gray-700 text-lg leading-relaxed mb-4">
                  "{current.text}"
                </p>
                
                {/* Highlight */}
                {current.highlight && (
                  <div className={`${colors.light} border-l-4 ${colors.primary} pl-4 py-3 rounded-r-lg`}>
                    <p className={`${colors.text} font-medium text-sm`}>
                      💡 {current.highlight}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Indicateurs de pagination */}
      <div className="flex items-center justify-center gap-2 mt-6">
        {testimonials.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`transition-all duration-300 rounded-full ${
              index === currentIndex
                ? `${colors.primary} w-8 h-2`
                : 'bg-gray-300 w-2 h-2 hover:bg-gray-400'
            }`}
            aria-label={`Aller au témoignage ${index + 1}`}
          />
        ))}
      </div>

      {/* Stats en bas (optionnel) */}
      <div className="mt-8 grid grid-cols-3 gap-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={`${colors.light} rounded-xl p-4`}
        >
          <div className={`text-3xl font-bold ${colors.text} mb-1`}>
            {testimonials.length}+
          </div>
          <div className="text-sm text-gray-600">Témoignages</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className={`${colors.light} rounded-xl p-4`}
        >
          <div className={`text-3xl font-bold ${colors.text} mb-1`}>
            4.8
          </div>
          <div className="text-sm text-gray-600">Note moyenne</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className={`${colors.light} rounded-xl p-4`}
        >
          <div className={`text-3xl font-bold ${colors.text} mb-1`}>
            98%
          </div>
          <div className="text-sm text-gray-600">Satisfaits</div>
        </motion.div>
      </div>
    </div>
  );
}