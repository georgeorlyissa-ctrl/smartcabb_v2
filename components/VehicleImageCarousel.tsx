import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from '../lib/icons';

interface VehicleImageCarouselProps {
  images: string[];
  alt: string;
  isSelected: boolean;
  autoPlay?: boolean;
  interval?: number;
}

/**
 * 🎠 CAROUSEL D'IMAGES DE VÉHICULES
 * 
 * Fonctionnalités :
 * - Défilement automatique des images
 * - Boutons de navigation gauche/droite
 * - Indicateurs de pagination (points)
 * - Transition fluide CSS
 * - Animation au survol
 */
export function VehicleImageCarousel({
  images,
  alt,
  isSelected,
  autoPlay = true,
  interval = 3000
}: VehicleImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  // ⏱️ AUTO-PLAY : Défilement automatique
  useEffect(() => {
    if (!autoPlay || isHovered || images.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, interval);

    return () => clearInterval(timer);
  }, [autoPlay, interval, isHovered, images.length]);

  // 🔄 NAVIGATION : Image précédente
  const handlePrevious = (e: React.MouseEvent) => {
    e.stopPropagation(); // Empêcher la sélection du véhicule
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  // ▶️ NAVIGATION : Image suivante
  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation(); // Empêcher la sélection du véhicule
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  // Si une seule image, affichage simple sans carousel
  if (images.length === 1) {
    return (
      <div className="relative h-24 bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
        <img 
          src={images[0]} 
          alt={alt}
          className="w-full h-full object-cover"
        />
        {isSelected && (
          <div className="absolute top-2 right-2 w-6 h-6 bg-secondary rounded-full flex items-center justify-center shadow-lg animate-scale-in">
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="relative h-24 bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 🖼️ IMAGES AVEC TRANSITION CSS */}
      <div className="relative w-full h-full">
        {images.map((image, index) => (
          <img
            key={index}
            src={image}
            alt={`${alt} - Image ${index + 1}`}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
              index === currentIndex ? 'opacity-100' : 'opacity-0'
            }`}
          />
        ))}
      </div>

      {/* ✅ BADGE DE SÉLECTION */}
      {isSelected && (
        <div className="absolute top-2 right-2 w-6 h-6 bg-secondary rounded-full flex items-center justify-center shadow-lg z-10 animate-scale-in">
          <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}

      {/* 🔽 BOUTONS DE NAVIGATION (visibles au survol) */}
      {images.length > 1 && (
        <>
          {/* Bouton Précédent */}
          <button
            onClick={handlePrevious}
            className={`absolute left-1 top-1/2 -translate-y-1/2 w-6 h-6 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md hover:bg-white transition-all duration-200 z-10 ${
              isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'
            }`}
          >
            <ChevronLeft className="w-3.5 h-3.5 text-gray-700" />
          </button>

          {/* Bouton Suivant */}
          <button
            onClick={handleNext}
            className={`absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md hover:bg-white transition-all duration-200 z-10 ${
              isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-2'
            }`}
          >
            <ChevronRight className="w-3.5 h-3.5 text-gray-700" />
          </button>
        </>
      )}

      {/* 🔴 INDICATEURS DE PAGINATION (points) */}
      {images.length > 1 && (
        <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1 z-10">
          {images.map((_, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex(index);
              }}
              className={`rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? 'bg-secondary w-3 h-1.5'
                  : 'bg-white/60 hover:bg-white/80 w-1.5 h-1.5'
              }`}
              aria-label={`Voir image ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* 📊 COMPTEUR D'IMAGES (visible au survol) */}
      {images.length > 1 && (
        <div
          className={`absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-black/60 backdrop-blur-sm rounded text-[9px] text-white font-medium z-10 transition-opacity duration-200 ${
            isHovered ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {currentIndex + 1}/{images.length}
        </div>
      )}
    </div>
  );
}